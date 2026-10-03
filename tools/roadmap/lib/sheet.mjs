/**
 * Which roster contact sheet the site shows, and how big it is.
 *
 * The sheet is baked, not hand-committed. tools/hull-maps/sheet.mjs draws
 * every navy's hulls and structures with the game's own sprite code, and
 * tools/hull-maps/build.mjs runs it after every map bake, so the picture moves
 * when the art does. test/sheet.test.mjs holds that: it fails when a map has
 * changed since the sheet was baked.
 *
 * Until then each art PR was to commit a `rung-roster-sprites.png` by hand
 * under docs/screenshots/issue-<N>/, and the site took the highest N. None did
 * after #466, so the page showed five hulls a navy where the game has up to
 * twenty, under a caption calling it current. Those screenshots stay where
 * they are, as their PRs' review record.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { SHEET } from '../../hull-maps/sheet.mjs';

/** `{ path }` for the baked sheet under `repoRoot`, or null if there is none. */
export function findContactSheet(repoRoot) {
  const path = join(repoRoot, ...SHEET.split('/'));
  return existsSync(path) ? { path } : null;
}

/**
 * Width and height from a PNG's IHDR chunk, so the page can reserve the
 * picture's box before the bytes arrive instead of shoving the roadmap down
 * when they do. The IHDR is mandatory and always first, at byte 16.
 */
export function pngSize(bytes) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((b, i) => bytes[i] !== b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
