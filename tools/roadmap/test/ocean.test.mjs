import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import * as content from '../lib/content.mjs';
import {
  DIVE,
  depthAt,
  gaugeMarkup,
  ocean,
  oceanScript,
  placeAt,
  yAtDepth,
} from '../lib/ocean.mjs';
import { parseRoadmap } from '../lib/parse.mjs';
import { render } from '../lib/render.mjs';

const docs = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'docs');
const doc = (name) => readFileSync(join(docs, name), 'utf8');
const metres = (text) => Number(text.replace(/,/g, ''));

/** The first capture of `re` in `text`, as a number; fails if the doc lost it. */
function read(text, re, what) {
  const m = text.match(re);
  assert.ok(m, `${what}: the doc no longer says it the way this test reads it (${re})`);
  return metres(m[1]);
}

/** A bestiary stat block's column, read from the table under the species' name. */
function stat(bestiary, species, column) {
  const at = bestiary.indexOf(`**${species}**`);
  assert.ok(at >= 0, `${species} is in the bestiary`);
  const rows = bestiary.slice(at).match(/^\|.*\|$/gm);
  const head = rows[0].split('|').map((c) => c.trim());
  const row = rows[2].split('|').map((c) => c.trim());
  return row[head.indexOf(column)];
}

test('ocean: depth is piecewise-linear down the page, and clamped at both ends', () => {
  const points = [
    { y: 0, depth: 0 },
    { y: 1000, depth: 400 },
    { y: 3000, depth: 1200 },
    { y: 4000, depth: 4410 },
  ];
  assert.equal(depthAt(points, -50), 0);
  assert.equal(depthAt(points, 500), 200);
  assert.equal(depthAt(points, 2000), 800);
  assert.equal(depthAt(points, 9999), 4410);
  for (const d of [0, 150, 400, 900, 1200, 2000, 4410])
    assert.ok(Math.abs(depthAt(points, yAtDepth(points, d)) - d) < 1e-9, `${d} m round-trips`);
});

test('ocean: the gauge names the band and the water it is in', () => {
  assert.equal(placeAt(DIVE, 0), 'Shelf · the Lid');
  assert.equal(placeAt(DIVE, 250), 'Shelf');
  assert.equal(placeAt(DIVE, 900), 'Mid-water');
  assert.equal(placeAt(DIVE, 1200), 'Mid-water · thermocline');
  assert.equal(placeAt(DIVE, 2000), 'Abyssal');
  assert.equal(placeAt(DIVE, 3500), 'Abyssal · over the Mouth');
  assert.equal(placeAt(DIVE, 4410), 'Abyssal · the Mouth');
});

// Every number the dive shows a visitor is read back out of the doc it was
// transcribed from. A doc edit that moves one fails here, not on a public page.
test('ocean: the dive says what the design bible says', () => {
  const depth = doc('systems-depth.md');
  const shelf = read(depth, /\*\*Shelf\*\* \| 0–([\d,]+) m/, 'Shelf floor');
  const abyssal = read(depth, /\*\*Abyssal\*\* \| ([\d,]+) m\+/, 'Abyssal top');
  const thermocline = read(depth, /temperature boundary at ([\d,]+) m/, 'thermocline');
  const lid = read(depth, /sour top ~([\d,]+) m/, 'the Lid');
  const glossary = doc('glossary.md');
  const floor = read(glossary, /depression at \*\*([\d,]+) m\*\*/, 'the Mouth');
  const lip = read(glossary, /\*\*Lip\*\*[^.]*stands at \*\*([\d,]+) m\*\*/, 'the Lip');

  assert.deepEqual(
    DIVE.bands.map((b) => b.from),
    [0, shelf, abyssal]
  );
  const anchor = (sel) => DIVE.anchors.find((a) => a.selector === sel).depth;
  assert.equal(anchor('#game'), shelf);
  assert.equal(anchor('#play'), thermocline);
  assert.equal(anchor('#next'), abyssal);
  assert.equal(anchor('#past'), lip);
  assert.equal(DIVE.lip, lip);
  assert.equal(DIVE.floor, floor);
  assert.equal(DIVE.marks[0].to, lid);
  assert.ok(DIVE.marks.some((m) => m.from < thermocline && m.to > thermocline));
  assert.deepEqual(
    DIVE.ticks.map((t) => t.depth),
    [shelf, thermocline, abyssal, lip, floor]
  );

  const echo = doc('systems-echo.md');
  assert.equal(DIVE.ping.reveal, read(echo, /in a ([\d,]+) m radius, for \d+ seconds/, 'reveal'));
  assert.equal(DIVE.ping.holds, read(echo, /m radius, for (\d+) seconds/, 'hold'));
  assert.equal(DIVE.ping.sig, read(echo, /emits \*\*SIG (\d+)/, 'ping SIG'));
  assert.equal(DIVE.ping.self, read(echo, /enemy listener in a \*\*([\d,]+) m\*\* radius/, 'self'));
});

test('ocean: the Drift lives where the bestiary says, and behaves as it says', () => {
  const b = doc('bestiary.md');
  const f = DIVE.fauna;
  for (const [name, key] of [
    ['Lampfry', 'lampfry'],
    ['Draymaw', 'draymaw'],
    ['Tetherjelly', 'tetherjelly'],
    ['Hollow', 'hollow'],
    ['Sounder', 'sounder'],
  ]) {
    const row = new RegExp(`^\\| \\*\\*${name}\\*\\* \\| ([\\d,]+) m`, 'm');
    assert.equal(f[key].depth, read(b, row, `${name} working depth`), `${name} depth`);
  }
  assert.equal(f.lampfry.seeded, read(b, /\*\*Lampfry\*\* \| [\d,]+ m \| ±(\d+) m/, 'seeded'));
  assert.equal(f.tetherjelly.seeded, read(b, /\*\*Tetherjelly\*\* \|[^|]*\| ±(\d+) m/, 'seeded'));
  assert.equal(
    f.lampfry.scatter,
    read(b, /\*\*scatter\*\* from any entity within ([\d,]+) m/, 'scatter')
  );
  assert.equal(f.lampfry.reform, read(b, /shoals reform (\d+) s after/, 'reform'));

  const pack = b.match(/\*\*Draymaw\*\* — pack predator, (\d+)–(\d+) individuals/);
  assert.ok(pack && f.draymaw.pack >= +pack[1] && f.draymaw.pack <= +pack[2], 'a pack is 4–6');
  assert.equal(f.draymaw.interest, metres(stat(b, 'Draymaw', 'Interest')));
  assert.equal(f.draymaw.closes, read(b, /closes to ~([\d,]+) m/, 'Interested stage'));

  assert.equal(f.hollow.commit, metres(stat(b, 'Hollow', 'Commit')));
  assert.equal(f.hollow.trigger, read(b, /something loud passes within ([\d,]+) m/, 'trigger'));

  const reach = b.match(/\*\*Sounder\*\* \|(?:[^|]*\|){3} ([\d,]+)–([\d,]+) m/);
  assert.ok(reach, 'the Sounder reaches row');
  assert.deepEqual(f.sounder.reach, [metres(reach[1]), metres(reach[2])]);
  assert.match(b, /hold that course for two minutes/);
  assert.equal(f.sounder.holds, 120);
});

test('ocean: the browser half closes over nothing and carries no </script', () => {
  const src = ocean.toString();
  for (const name of ['DIVE', 'fmt', 'gaugeMarkup', 'oceanStyle', 'oceanScript'])
    assert.doesNotMatch(src, new RegExp(`\\b${name}\\b`), `ocean() must not reach ${name}`);
  assert.doesNotMatch(oceanScript(), /<\/script/i);
  assert.doesNotThrow(() => new vm.Script(oceanScript()), 'the inlined script parses');
  assert.match(src, /prefers-reduced-motion/);
});

test('ocean: the page carries the water, the gauge, and a script that parses', () => {
  const html = render({
    roadmap: parseRoadmap(readFileSync(join(docs, 'ROADMAP.md'), 'utf8')),
    states: new Map(),
    content,
    counts: { missions: 29, maps: 3, factions: 4 },
    repo: 'gunnargehtab/Echoes-of-the-Abyss',
    generatedAt: 'now',
    fontHref: 'fonts/x.woff2',
  });
  assert.match(html, /<canvas class="ocean" aria-hidden="true"><\/canvas>/);
  assert.match(html, /<canvas class="ocean-hud" aria-hidden="true"><\/canvas>/);
  // Hidden until the script runs, so a page without JS has no dead instrument.
  assert.match(html, /<aside class="gauge" hidden aria-label="Depth gauge">/);
  assert.ok(html.includes(gaugeMarkup(DIVE)));
  for (const a of DIVE.anchors) assert.match(html, new RegExp(`id="${a.selector.slice(1)}"`));
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(scripts.length, 2);
  for (const s of scripts) assert.doesNotThrow(() => new vm.Script(s));
});

/**
 * A DOM just deep enough for the script to run: every element answers every
 * query, every canvas call is a no-op, and frames are stepped by hand. It
 * cannot say the water looks right — a browser has to — but it does say the
 * script runs a few hundred frames, a click and a ping without throwing.
 */
function fakePage({ reduce = false } = {}) {
  const listeners = { window: {}, document: {} };
  const on = (bag) => (type, fn) => (bag[type] ??= []).push(fn);
  const noop = () => {};
  const ctx = new Proxy(
    {},
    {
      get: (_, key) =>
        key === 'createLinearGradient' || key === 'createRadialGradient'
          ? () => ({ addColorStop: noop })
          : noop,
      set: () => true,
    }
  );
  const tops = { '#game': 1000, '#play': 2600, '#next': 3600, '#past': 6200 };
  const element = (sel = '') => {
    const bag = {};
    const kids = new Map();
    return {
      hidden: true,
      textContent: '',
      style: { setProperty: noop },
      classList: { add: noop, toggle: noop },
      listeners: bag,
      addEventListener: on(bag),
      getAttribute: () => 'false',
      setAttribute: noop,
      querySelector: (s) => (kids.has(s) ? kids.get(s) : kids.set(s, element(s)).get(s)),
      getContext: () => ctx,
      getBoundingClientRect: () => ({
        top: tops[sel] ?? 0,
        bottom: 20,
        left: 0,
        width: 10,
        height: 10,
      }),
      closest: () => null,
      matches: () => false,
    };
  };
  const els = new Map();
  const frames = [];
  const doc = {
    documentElement: { ...element(), scrollHeight: 8000 },
    body: element(),
    hidden: false,
    addEventListener: on(listeners.document),
    createElement: () => element(),
    querySelector: (s) => (els.has(s) ? els.get(s) : els.set(s, element(s)).get(s)),
  };
  const context = {
    document: doc,
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 2,
    scrollY: 0,
    matchMedia: () => ({ matches: reduce, addEventListener: noop }),
    requestAnimationFrame: (fn) => frames.push(fn),
    addEventListener: on(listeners.window),
    performance: { now: () => 0 },
    getSelection: () => '',
    setTimeout: (fn) => fn(),
    Math,
    Number,
    String,
  };
  context.window = context;
  vm.createContext(context);
  return { context, listeners, frames, doc };
}

test('ocean: the script runs frames, takes a click and a ping, and never throws', () => {
  const page = fakePage();
  vm.runInContext(oceanScript(), page.context);
  let now = 0;
  const run = (n) => {
    for (let i = 0; i < n; i++) {
      const fn = page.frames.shift();
      assert.ok(fn, 'the loop keeps asking for frames');
      fn((now += 16));
    }
  };
  run(60);
  const click = page.listeners.document.click[0];
  // Open water at every depth the page has, including over the Mouth.
  for (const y of [300, 2000, 4200, 7900]) {
    page.context.scrollY = Math.max(0, y - 450);
    click({ button: 0, clientX: 80, clientY: 450, target: { closest: () => null } });
    run(40);
  }
  // The gauge's two buttons: a ping from mid-screen, and sound in a page
  // with no audio at all.
  const gauge = page.doc.querySelector('.gauge');
  gauge.querySelector('.g-ping').listeners.click[0]();
  gauge.querySelector('.g-sound').listeners.click[0]();
  // A pointer thrown across the water is loud enough to spring a Hollow.
  const move = page.listeners.window.pointermove[0];
  move({ clientX: 10, clientY: 10 });
  move({ clientX: 900, clientY: 400 });
  run(200);
});

test('ocean: under reduced motion nothing loops and nothing pings', () => {
  const page = fakePage({ reduce: true });
  vm.runInContext(oceanScript(), page.context);
  // One still frame queued, drawn, and no request after it.
  assert.equal(page.frames.length, 1);
  page.frames.shift()(16);
  assert.equal(page.frames.length, 0);
  page.listeners.document.click[0]({
    button: 0,
    clientX: 80,
    clientY: 450,
    target: { closest: () => null },
  });
  assert.equal(page.frames.length, 0, 'a click under reduced motion starts nothing');
});
