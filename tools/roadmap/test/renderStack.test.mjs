import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as content from '../lib/content.mjs';
import { parseRoadmap } from '../lib/parse.mjs';
import { render } from '../lib/render.mjs';
import { FRAMES, PAGE, UPGRADES, findFrames, renderStackPage } from '../lib/renderStack.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const REPO = 'gunnargehtab/Echoes-of-the-Abyss';

const page = (states = new Map(), frames = findFrames(root).found) =>
  renderStackPage({
    states,
    repo: REPO,
    generatedAt: 'never',
    fontHref: 'fonts/x.woff2',
    frames,
  });

test('render stack: every frame the audit shows is a file the repository owns', () => {
  const { found, missing } = findFrames(root);
  assert.deepEqual(missing, []);
  for (const f of FRAMES) {
    assert.ok(found[f.key].width > 0 && found[f.key].height > 0, `${f.from} is a PNG`);
  }
  const html = page();
  for (const f of FRAMES) {
    const img = html.match(new RegExp(`<img src="${f.href}" width="(\\d+)" height="(\\d+)"[^>]*>`));
    assert.ok(img, `${f.key} is drawn from ${f.href}`);
    assert.match(img[0], /alt="[^"]{40,}"/, 'with its alt text');
  }
});

test('render stack: a missing frame leaves its figure without a picture', () => {
  const html = page(new Map(), {});
  assert.doesNotMatch(html, /<img /);
  assert.equal(html.match(/<figure>/g).length, FRAMES.length);
});

test('render stack: every ranked upgrade carries the state of the issue that tracks it', () => {
  assert.deepEqual(
    UPGRADES.map((u) => u.rank),
    [1, 2, 3, 4, 5, 6, 7, 8]
  );
  const states = new Map([
    [1001, { state: 'open', url: 'https://example.test/1001' }],
    [1002, { state: 'closed', url: 'https://example.test/1002' }],
  ]);
  const html = page(states);
  const cards = html.match(/<article class="card[^"]*">[\s\S]*?<\/article>/g);
  assert.equal(cards.length, UPGRADES.length, 'one card per ranked upgrade');
  for (const [i, card] of cards.entries()) {
    const { rank, issue } = UPGRADES[i];
    assert.match(card, new RegExp(`<span class="card-num[^"]*">${rank}</span>`));
    assert.match(card, new RegExp(`class="pill state [a-z]+"[^>]*>[A-Z][a-z]+ · #${issue}</a>`));
  }
  assert.match(html, /<a class="pill state open" href="https:\/\/example.test\/1001">Open · #1001/);
  assert.match(
    html,
    /<a class="pill state closed" href="https:\/\/example.test\/1002">Done · #1002/
  );
  // An issue the tracker did not answer for still links, and says it does not know.
  assert.ok(
    html.includes(
      `<a class="pill state unknown" href="https://github.com/${REPO}/issues/1003">Unknown · #1003</a>`
    )
  );
  assert.match(html, /Last read never\./);
});

test('render stack: built without the tracker, the page says every tag is unknown', () => {
  const html = page();
  assert.equal(html.match(/class="pill state unknown"/g).length, UPGRADES.length);
  assert.match(html, /<p class="warn">This copy of the page was built without access/);
});

// The audit as published embedded its frames and loaded Google Fonts. The
// site holds one copy of each file and makes no third-party request.
test('render stack: the page embeds nothing and asks no third party for anything', () => {
  const html = page();
  assert.doesNotMatch(html, /data:image|base64|googleapis|gstatic|<script/);
  const refs = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 0);
  for (const ref of refs) {
    assert.ok(
      !/^[a-z]+:/.test(ref) || ref.startsWith('https://github.com/'),
      `${ref} is on the site or on GitHub`
    );
  }
  assert.match(html, /<a class="back" href="index.html">/);
});

test('render: the roadmap links the render-stack page, and only when it is built', () => {
  const base = {
    roadmap: parseRoadmap(readFileSync(join(root, 'docs', 'ROADMAP.md'), 'utf8')),
    states: new Map(),
    content,
    counts: { missions: 29, maps: 3, factions: 4 },
    repo: REPO,
    generatedAt: 'never',
    fontHref: 'fonts/x.woff2',
  };
  assert.ok(!render(base).includes(PAGE));
  const html = render({ ...base, renderStackHref: PAGE });
  assert.equal(html.split(`href="${PAGE}"`).length - 1, 2, 'under the fleet and in the footer');
  const navies = html.match(/<section id="navies">[\s\S]*?<\/section>/)[0];
  assert.ok(navies.includes(`<a class="ref-line" href="${PAGE}">`));
});
