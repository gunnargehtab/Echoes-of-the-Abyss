/**
 * The loudness ladder — docs/map-visuals.md §5 — at rungs 5 and 6.
 *
 * surveyInk.test.ts holds rung 4 under both. This file holds what the ladder
 * audit (#866) adds: that rung 5's floor is what `ladder.ts` says it is, that
 * rung 6's is the unselected detection ring, and where rung 6 stands against
 * rung 5. That last does not hold, so it is recorded instead: the test pins
 * exactly where it breaks, and fails when the break moves in either direction
 * — a fix and a new break both have to be written down.
 *
 * The ladder stops at rung 6 here. Rungs 1 to 3 are the ground every lift is
 * measured over, not strokes on it. Rung 7 is models the GPU draws and
 * contacts whose low tiers are hazes §5 does not weigh per pixel; it answers
 * to gate 3's glow curve (docs/graphics-standards.md) instead.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIOME_COLOR, PALETTE_NAMES, PALETTES } from '../src/game/palette.ts';
import type { PaletteName } from '../src/game/palette.ts';
import {
  encodedLuminance,
  FURNITURE_OUTLINES,
  furnitureFloorLift,
  instrumentFloorLift,
  loudestLift,
  quietestLift,
  unselectedRingLift,
} from '../src/game/ladder.ts';

/** The palest ground the map can draw: fills only ever darken (palette.ts). */
const PALEST_GROUND = Object.values(BIOME_COLOR).reduce((a, b) =>
  encodedLuminance(a) >= encodedLuminance(b) ? a : b
);
/** And the darkest: a fully drained veil over the trench is black. */
const DARKEST_GROUND = 0x000000;
const GROUNDS = [DARKEST_GROUND, PALEST_GROUND];

/**
 * The palettes where rung 6's floor lifts the ground no more than rung 5's —
 * the break #865 found. Deuteranopia holds. Recorded, not tuned: which of the
 * ring or the furniture moves is the owner's call (docs/map-visuals.md §10).
 */
const RUNG_6_FLOOR_UNDER_RUNG_5_FLOOR: readonly PaletteName[] = [
  'standard',
  'protanopia',
  'tritanopia',
];

/**
 * The rung-5 outlines that, at their loudest and in their loudest colour, lift
 * some ground at least as much as rung 6's floor does. It is every one of
 * them, in every palette: §5 asks each rung to be quieter than every rung
 * above it, and a live hazard's rim, a resource field's and the map's are
 * all louder than the unselected ring. Recorded with the break above.
 */
const RUNG_5_OVER_RUNG_6_FLOOR: readonly string[] = [
  'crystalDepthRing',
  'hazardCountdown',
  'hazardRimActive',
  'hazardRimDecay',
  'hazardRimDormant',
  'hazardRimWarning',
  'inertSiteRim',
  'jellyRim',
  'kelpRimGripping',
  'kelpRimIdle',
  'mapRim',
  'resourceRim',
  'shoalScatterRing',
  'tunnelRoute',
];

describe('the loudness ladder, rung 5', () => {
  it('lifts no ground less than its floor, in any outline or palette', () => {
    // The claim ladder.ts makes about the four it names: every other rung-5
    // outline lifts more. Checked by hand at #865; held here. Both lifts are
    // linear in the ground's luminance, so two grounds bound every ground.
    for (const name of PALETTE_NAMES) {
      for (const ground of GROUNDS) {
        const floor = furnitureFloorLift(PALETTES[name], ground);
        for (const [kind, outline] of Object.entries(FURNITURE_OUTLINES)) {
          const lift = quietestLift(outline, PALETTES[name], ground);
          assert.ok(
            lift >= floor,
            `${name}: ${kind} lifts ${ground.toString(16)} by ${lift.toFixed(4)}, ` +
              `under the floor's ${floor.toFixed(4)}`
          );
        }
      }
    }
  });
});

describe('the loudness ladder, rung 6', () => {
  it('has the unselected detection ring as its floor, in every palette', () => {
    // §5: the ring you have not selected is rung 6's quietest outline, and
    // it is the one the survey ink is held under.
    for (const name of PALETTE_NAMES) {
      for (const ground of GROUNDS) {
        assert.equal(
          instrumentFloorLift(PALETTES[name], ground),
          unselectedRingLift(PALETTES[name], ground),
          `${name}: the selected ring lifts ${ground.toString(16)} less than the unselected`
        );
      }
    }
  });

  it('records where its floor sits under the floor of rung 5', () => {
    const found = PALETTE_NAMES.filter((name) =>
      GROUNDS.some(
        (ground) =>
          instrumentFloorLift(PALETTES[name], ground) <= furnitureFloorLift(PALETTES[name], ground)
      )
    );
    assert.deepEqual(
      found,
      [...RUNG_6_FLOOR_UNDER_RUNG_5_FLOOR],
      'the break moved: update the record here and in docs/map-visuals.md §5'
    );
  });

  it('records every rung-5 outline that out-lifts its floor', () => {
    for (const name of PALETTE_NAMES) {
      const found = Object.entries(FURNITURE_OUTLINES)
        .filter(([, outline]) =>
          GROUNDS.some(
            (ground) =>
              loudestLift(outline, PALETTES[name], ground) >=
              instrumentFloorLift(PALETTES[name], ground)
          )
        )
        .map(([kind]) => kind)
        .sort();
      assert.deepEqual(
        found,
        [...RUNG_5_OVER_RUNG_6_FLOOR],
        `${name}: the break moved: update the record here and in docs/map-visuals.md §5`
      );
    }
  });
});
