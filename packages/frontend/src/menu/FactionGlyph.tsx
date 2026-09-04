/**
 * The four navy glyphs as DOM — docs/ui-ux.md §12.5, docs/factions.md
 * "Visual identity".
 *
 * The same four shapes `drawFactionGlyph` puts on a mark in the world view
 * (game/silhouettes.ts), transcribed to SVG because a column head is chrome and
 * chrome is DOM in this game. Kept geometrically identical to that function on
 * purpose: a player who has learned the blade at Tier 3 should not have to
 * learn a second blade in a menu — the paths below are that function's
 * arithmetic with `size = 10` and the origin at 0,0.
 *
 * Shape, not colour, is what identifies a navy — §11's rule that faction colour
 * is never the only identifier — so the geometry here never varies with the
 * colour-vision palette. `currentColor` carries the ink, which lets the column
 * head set it once alongside its title.
 */

import { Faction } from '@echoes/shared';

export interface FactionGlyphProps {
  faction: Faction;
  size?: number;
}

const PATHS: Record<Faction, string> = {
  // A plate: rectangles and cylinders, visibly assembled.
  [Faction.Bathyarch]: 'M -10 -6 h 20 v 12 h -20 Z',
  // A leaf: two arcs meeting at their points.
  [Faction.Pelagia]: 'M -10 0 Q 0 -9 10 0 Q 0 9 -10 0 Z',
  // Segments: three chevrons, stacked like plates of chitin.
  [Faction.Directorate]: 'M -8 -2.5 L 0 -8 L 8 -2.5 M -8 3 L 0 -2.5 L 8 3 M -8 8.5 L 0 3 L 8 8.5',
  // A blade, point down: an instrument before it is a weapon.
  [Faction.Hadron]: 'M 0 -11 L 4.5 0 L 0 11 L -4.5 0 Z',
};

export function FactionGlyph({ faction, size = 18 }: FactionGlyphProps) {
  return (
    <svg
      className="campaign-glyph"
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      // Decorative: the column head names its campaign in text beside this,
      // and a glyph read out as "path" helps nobody.
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={PATHS[faction]}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}
