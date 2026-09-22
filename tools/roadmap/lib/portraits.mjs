/**
 * Which hull portrait each navy's card shows, and what its caption says.
 *
 * The portraits are tools/hull-renders' beauty frames, committed under
 * docs/concept-art/renders/ as `<kind>-<navy>.png`: one hull in the water its
 * navy lives in. The site does not render anything itself. It takes the frame
 * for one kind in every navy, so the four cards compare like with like, and
 * reads the caption's length and biome from the same shot table the renderer
 * used (tools/hull-renders/shots.mjs). A frame and its caption cannot
 * disagree about which water that is.
 *
 * A missing frame is a warning, not a failure: the card simply has no picture,
 * the way the page has no roster sheet when there is none.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { KINDS, NAVIES } from '../../hull-renders/shots.mjs';
import { pngSize } from './sheet.mjs';

/** The portrait for every navy in `factions` that has one, keyed by navy. */
export function findPortraits(rendersDir, factions, kind) {
  const shot = KINDS.find((k) => k.slug === kind.slug);
  const found = {};
  const missing = [];
  for (const faction of factions) {
    const water = NAVIES[faction.navy];
    const file = `${kind.slug}-${faction.navy}.png`;
    const path = join(rendersDir, file);
    const size = existsSync(path) ? pngSize(readFileSync(path)) : null;
    if (shot === undefined || water === undefined || size === null) {
      missing.push(file);
      continue;
    }
    found[faction.navy] = {
      path,
      href: `renders/${file}`,
      ...size,
      caption: `${kind.label} · ${shot.lengthM} m · ${water.biome}`,
    };
  }
  return { found, missing };
}
