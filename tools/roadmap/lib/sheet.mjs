/**
 * Which roster contact sheet the site shows, and how big it is.
 *
 * The sheet is not generated here — it is baked by the art PRs, one per
 * roster change, and committed under `docs/screenshots/issue-<N>/` as
 * `rung-roster-sprites.png` beside the PR's other review screenshots (#461,
 * #466, and every roster PR since). That directory name is the PR's own
 * record and nobody should have to remember to copy a file out of it, so the
 * site takes the newest sheet by issue number: the highest `issue-<N>` that
 * carries one wins. A re-bake in a later PR replaces the picture on the page
 * without anyone touching this tool.
 *
 * Highest issue number, not newest mtime: a checkout gives every file the
 * same mtime, and a shallow clone gives every path the same commit.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const SHEET_FILE = 'rung-roster-sprites.png';

/** `{ issue, path }` for the newest sheet under `screenshotsDir`, or null. */
export function findContactSheet(screenshotsDir) {
  if (!existsSync(screenshotsDir)) return null;
  const candidates = readdirSync(screenshotsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => /^issue-(\d+)$/.exec(entry.name))
    .filter((match) => match !== null)
    .map((match) => ({ issue: Number(match[1]), path: join(screenshotsDir, match[0], SHEET_FILE) }))
    .filter((candidate) => existsSync(candidate.path))
    .sort((a, b) => b.issue - a.issue);
  return candidates[0] ?? null;
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
