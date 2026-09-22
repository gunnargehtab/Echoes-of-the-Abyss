import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { KINDS, NAVIES } from '../../hull-renders/shots.mjs';
import * as content from '../lib/content.mjs';
import { parseRoadmap } from '../lib/parse.mjs';
import { findPortraits } from '../lib/portraits.mjs';
import { render } from '../lib/render.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const renders = join(root, 'docs', 'concept-art', 'renders');

test('portraits: every navy on the page has its render in the repository', () => {
  const { found, missing } = findPortraits(renders, content.factions, content.portraitKind);
  assert.deepEqual(missing, []);
  const length = KINDS.find((k) => k.slug === content.portraitKind.slug).lengthM;
  for (const f of content.factions) {
    const p = found[f.navy];
    assert.ok(p, `${f.name} has a portrait`);
    assert.equal(p.href, `renders/${content.portraitKind.slug}-${f.navy}.png`);
    assert.ok(p.width > 0 && p.height > 0, 'its size is read from the file');
    // The caption is the shot table's, so it names the water the frame is in.
    assert.equal(
      p.caption,
      `${content.portraitKind.label} · ${length} m · ${NAVIES[f.navy].biome}`
    );
    assert.ok(f.portrait.length > 40, `${f.name} has alt text for it`);
  }
});

test('portraits: a navy with no render is named, and its card goes without', () => {
  const dir = mkdtempSync(join(tmpdir(), 'roadmap-renders-'));
  try {
    copyFileSync(join(renders, 'cruiser-bathyarch.png'), join(dir, 'cruiser-bathyarch.png'));
    const { found, missing } = findPortraits(dir, content.factions, content.portraitKind);
    assert.deepEqual(Object.keys(found), ['bathyarch']);
    assert.deepEqual(missing, [
      'cruiser-pelagia.png',
      'cruiser-directorate.png',
      'cruiser-hadron.png',
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// content.mjs chose the Cruiser because every navy builds it. units.md marks a
// navy's own hull with the navy's name in its heading; the Cruiser has none.
test('portraits: the hull on every card is one every navy builds', () => {
  const units = readFileSync(join(root, 'docs', 'units.md'), 'utf8');
  assert.match(units, new RegExp(`^${content.portraitKind.label}$`, 'm'));
});

test('render: each navy card leads with its portrait, and none without one', () => {
  const base = {
    roadmap: parseRoadmap(readFileSync(join(root, 'docs', 'ROADMAP.md'), 'utf8')),
    states: new Map(),
    content,
    counts: { missions: 29, maps: 3, factions: 4 },
    repo: 'gunnargehtab/Echoes-of-the-Abyss',
    generatedAt: 'never',
    fontHref: 'fonts/x.woff2',
  };
  assert.doesNotMatch(render(base), /class="portrait"/);

  const { found } = findPortraits(renders, content.factions, content.portraitKind);
  const html = render({ ...base, portraits: found });
  for (const f of content.factions) {
    const card = html.match(
      new RegExp(
        `<article class="card faction"[^>]*>\\s*<figure class="portrait">([\\s\\S]*?)</figure>\\s*<h3>${f.name}</h3>`
      )
    );
    assert.ok(card, `${f.name}'s card opens with its portrait`);
    const p = found[f.navy];
    assert.match(
      card[1],
      new RegExp(`<img src="${p.href}" width="${p.width}" height="${p.height}"`)
    );
    assert.match(card[1], /loading="lazy"/);
    assert.ok(card[1].includes(`alt="${f.portrait}"`), 'with its alt text');
    assert.ok(card[1].includes(`<figcaption>${p.caption}</figcaption>`));
  }
});
