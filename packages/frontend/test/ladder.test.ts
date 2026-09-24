/**
 * The loudness ladder — docs/map-visuals.md §5 — at rungs 5 and 6.
 *
 * surveyInk.test.ts holds rung 4 under both. This file holds what the ladder
 * audit (#866) adds: that rung 5's floor is what `ladder.ts` says it is, that
 * the floor of rung 6's steady outlines is the unselected detection ring, and
 * where rung 6 stands against rung 5. That last does not hold, so it is
 * recorded instead: the test pins exactly where it breaks, and fails when the
 * break moves in either direction — a fix and a new break both have to be
 * written down.
 *
 * Rungs 1 to 3 are the ground every lift is measured over, not strokes on it.
 * Marks that fade to nothing by design are not weighed, on rung 6 or rung 7,
 * so rung 6 against rung 7 is not weighed either: docs/map-visuals.md §10
 * records why, as a question for the owner.
 *
 * Every lift is linear in the ground's luminance, so one stroke against
 * another is settled by the darkest and the palest ground: if it is above at
 * both, it is above at every ground between. A floor is the least of several
 * strokes, which is not a line, so each claim below is made stroke against
 * stroke and never read off a floor at two points alone.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIOME_COLOR, PALETTE_NAMES, PALETTES } from '../src/game/palette.ts';
import type { PaletteName } from '../src/game/palette.ts';
import {
  encodedLuminance,
  FURNITURE_OUTLINES,
  furnitureFloorLift,
  furnitureFloorStrokes,
  INSTRUMENT_OUTLINES,
  instrumentFloorLift,
  loudestLift,
  strokeLift,
  strokesOf,
  type Stroke,
} from '../src/game/ladder.ts';

/** The palest ground the map can draw: fills only ever darken (palette.ts). */
const PALEST_GROUND = Object.values(BIOME_COLOR).reduce((a, b) =>
  encodedLuminance(a) >= encodedLuminance(b) ? a : b
);
/** And the darkest: a fully drained veil over the trench is black. */
const DARKEST_GROUND = 0x000000;
const GROUNDS = [DARKEST_GROUND, PALEST_GROUND];

const lift = (s: Stroke, ground: number) => strokeLift(s.color, s.alpha, ground);
/** `a` lifts every ground at least as much as `b` does. */
const atLeast = (a: Stroke, b: Stroke) => GROUNDS.every((g) => lift(a, g) >= lift(b, g));
/** `a` lifts every ground more than `b` does. */
const above = (a: Stroke, b: Stroke) => GROUNDS.every((g) => lift(a, g) > lift(b, g));

/** Rung 6's steady strokes at their quietest: the ones its floor is the least of. */
const instrumentStrokes = (name: PaletteName) =>
  Object.values(INSTRUMENT_OUTLINES).flatMap((o) => strokesOf(o, PALETTES[name], 'quietest'));

/**
 * The palettes where rung 6's floor lifts some ground no more than rung 5's —
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
    // outline lifts more. Checked by hand at #865; held here, near the eye
    // (ladder.ts, on the fog). An outline at least as loud as any one of the
    // four at both ends is at least as loud as the least of them everywhere.
    for (const name of PALETTE_NAMES) {
      const floor = furnitureFloorStrokes(PALETTES[name]);
      for (const [kind, outline] of Object.entries(FURNITURE_OUTLINES)) {
        for (const stroke of strokesOf(outline, PALETTES[name], 'quietest')) {
          assert.ok(
            floor.some((f) => atLeast(stroke, f)),
            `${name}: ${kind} in ${stroke.color.toString(16)} does not clear any floor stroke ` +
              `over both grounds (floor over black ${furnitureFloorLift(PALETTES[name], 0).toFixed(4)})`
          );
        }
      }
    }
  });
});

describe('the loudness ladder, rung 6', () => {
  it('has the unselected detection ring as the floor of its steady outlines', () => {
    // §5: the ring you have not selected is rung 6's quietest steady outline,
    // and it is the one the survey ink is held under. Every selected-ring
    // stroke is at least as loud as an unselected one at both ends, so
    // everywhere.
    for (const name of PALETTE_NAMES) {
      const unselected = strokesOf(INSTRUMENT_OUTLINES.unselectedRing!, PALETTES[name], 'quietest');
      for (const stroke of strokesOf(
        INSTRUMENT_OUTLINES.selectedRing!,
        PALETTES[name],
        'quietest'
      )) {
        assert.ok(
          unselected.some((u) => atLeast(stroke, u)),
          `${name}: the selected ring in ${stroke.color.toString(16)} is quieter than the unselected`
        );
      }
    }
  });

  it('records where its floor sits under the floor of rung 5', () => {
    // A break is shown by a ground where it happens. A palette holds when
    // every rung-6 stroke is above some one rung-5 floor stroke at both
    // ends, so everywhere; one that is neither is a gap in this test.
    const broken: PaletteName[] = [];
    for (const name of PALETTE_NAMES) {
      const breaks = GROUNDS.some(
        (g) => instrumentFloorLift(PALETTES[name], g) <= furnitureFloorLift(PALETTES[name], g)
      );
      const floor = furnitureFloorStrokes(PALETTES[name]);
      const holds = instrumentStrokes(name).every((s) => floor.some((f) => above(s, f)));
      assert.ok(breaks !== holds, `${name}: neither a break nor a hold is shown`);
      if (breaks) broken.push(name);
    }
    assert.deepEqual(
      broken,
      [...RUNG_6_FLOOR_UNDER_RUNG_5_FLOOR],
      'the break moved: update the record here and in docs/map-visuals.md'
    );
  });

  it('records every rung-5 outline that out-lifts its floor', () => {
    // Exact at two grounds: a stroke under every rung-6 stroke at both ends
    // is under the least of them everywhere, and one that is not is over it
    // at a ground the test names.
    for (const name of PALETTE_NAMES) {
      const found = Object.entries(FURNITURE_OUTLINES)
        .filter(([, outline]) =>
          GROUNDS.some(
            (g) => loudestLift(outline, PALETTES[name], g) >= instrumentFloorLift(PALETTES[name], g)
          )
        )
        .map(([kind]) => kind)
        .sort();
      assert.deepEqual(
        found,
        [...RUNG_5_OVER_RUNG_6_FLOOR],
        `${name}: the break moved: update the record here and in docs/map-visuals.md`
      );
    }
  });
});
