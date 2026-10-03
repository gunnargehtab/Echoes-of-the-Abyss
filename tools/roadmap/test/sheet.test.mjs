import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MANIFEST, SHEET, mapDigests } from '../../hull-maps/sheet.mjs';
import { findContactSheet, pngSize } from '../lib/sheet.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

test('sheet: the repository has one, so the public page has its picture', () => {
  const found = findContactSheet(root);
  assert.ok(found !== null, `a baked sheet at ${SHEET}`);
  const size = pngSize(readFileSync(found.path));
  assert.ok(size.width > 0 && size.height > 0);
  assert.equal(findContactSheet(join(root, 'no-such-dir')), null);
});

test('sheet: the size is read from the PNG header, and a non-PNG has none', () => {
  // A 1×2 PNG header is enough: signature, IHDR length and type, width, height.
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1,
    0, 0, 0, 2,
  ]);
  assert.deepEqual(pngSize(png), { width: 1, height: 2 });
  assert.equal(pngSize(Buffer.from('not a png')), null);
});

// The caption calls the sheet the current roster. Until this test, nothing
// held that: the hand-committed sheet sat at #466 while the maps moved on.
// The manifest records every map the sheet was drawn from, by hash, so a map
// re-baked without the sheet fails here, and says which.
test('sheet: no map has changed since the sheet was baked', () => {
  const baked = JSON.parse(readFileSync(join(root, MANIFEST), 'utf8')).maps;
  const now = mapDigests(root);
  const changed = Object.keys(now).filter((path) => path in baked && baked[path] !== now[path]);
  const added = Object.keys(now).filter((path) => !(path in baked));
  const removed = Object.keys(baked).filter((path) => !(path in now));
  assert.deepEqual(
    { changed, added, removed },
    { changed: [], added: [], removed: [] },
    `${SHEET} predates these maps; node tools/hull-maps/sheet.mjs re-bakes it ` +
      '(build.mjs does at the end of every run)'
  );
});
