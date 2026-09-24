/**
 * The loudness ladder — docs/map-visuals.md §5 — at rungs 5, 6 and 7.
 *
 * surveyInk.test.ts holds rung 4 under rungs 5 and 6. This file holds the
 * rest, **floor against floor** as the owner ruled on #866: a rung's floor —
 * its quietest outline, at its quietest alpha, in its quietest colour — lifts
 * the ground more than the floor of the rung below, over the darkest and the
 * palest ground, in all four palettes. It holds that rung 5's floor is what
 * `ladder.ts` says it is, residue and the stipple included; that rung 6's
 * floor is above it; and it records where rung 7 is not above rung 6. A
 * record pins exactly where a rung breaks and fails when the break moves in
 * either direction, so a fix and a new break both have to be written down.
 *
 * Rungs 1 to 3 are the ground every lift is measured over, not strokes on it.
 * A fading mark is weighed at its steady peak, and a rimless one by its
 * loudest crisp element, as the owner ruled (#866). Some of rung 7 is not
 * weighed at all:
 *
 * - **Tier 1 and Tier 2 contacts.** Both are the column and nothing else, an
 *   edgeless haze, which §5 does not weigh per pixel against a line (#865).
 * - **Everything rung 7 draws in the conn view.** An own hull or structure is
 *   a lit model, or its baked sprite until the model loads, and own ordnance
 *   is a lit body with a lamp. What lands on a pixel depends on the lights,
 *   the texture and the view, and no number for it can be taken without a GPU.
 *   So rung 7's floor here is the chart's: contacts from Tier 3, and a
 *   construction site's scaffold.
 *
 * Every lift is linear in the ground's luminance — a normal stroke's falls as
 * the ground brightens, and an additive dot's is the same over every ground
 * until a channel clips, which the stipple test below rules out. So one stroke
 * against another is settled by the darkest and the palest ground: if it is
 * above at both, it is above at every ground between. A floor is the least of
 * several strokes, which is not a line, so each claim below is made stroke
 * against stroke and never read off a floor at two points alone.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BIOME_COLOR, PALETTE_NAMES, PALETTES } from '../src/game/palette.ts';
import type { PaletteName } from '../src/game/palette.ts';
import {
  additiveChannels,
  additiveLift,
  AGENT_OUTLINES,
  encodedLuminance,
  FURNITURE_OUTLINES,
  furnitureFloorLift,
  furnitureFloorStrokes,
  INSTRUMENT_OUTLINES,
  instrumentFloorLift,
  liftOf,
  strokesOf,
  type Stroke,
  type WeighedOutline,
} from '../src/game/ladder.ts';

/** The palest ground the map can draw: fills only ever darken (palette.ts). */
const PALEST_GROUND = Object.values(BIOME_COLOR).reduce((a, b) =>
  encodedLuminance(a) >= encodedLuminance(b) ? a : b
);
/** And the darkest: a fully drained veil over the trench is black. */
const DARKEST_GROUND = 0x000000;
const GROUNDS = [DARKEST_GROUND, PALEST_GROUND];

/** `a` lifts every ground at least as much as `b` does. */
const atLeast = (a: Stroke, b: Stroke) => GROUNDS.every((g) => liftOf(a, g) >= liftOf(b, g));
/** `a` lifts every ground more than `b` does. */
const above = (a: Stroke, b: Stroke) => GROUNDS.every((g) => liftOf(a, g) > liftOf(b, g));

/** Every stroke of a rung at its quietest: the ones its floor is the least of. */
const quietStrokes = (table: Readonly<Record<string, WeighedOutline>>, name: PaletteName) =>
  Object.values(table).flatMap((o) => strokesOf(o, PALETTES[name], 'quietest'));

/**
 * Which rung-6 outline is its floor in each palette. The unselected ring,
 * where §3.5's mid-SIG colour is dark; blocked ground's hatch in the two
 * red-green palettes, whose amber ring is the brighter of the two.
 */
const RUNG_6_FLOOR: Record<PaletteName, string> = {
  standard: 'unselectedRing',
  deuteranopia: 'blockedHatch',
  protanopia: 'blockedHatch',
  tritanopia: 'unselectedRing',
};

/**
 * The palettes where rung 6's floor lifts some ground no more than rung 5's.
 * #865 found three; the ring coming up to 0.27 on #866 closed them, and none
 * is left.
 */
const RUNG_6_FLOOR_UNDER_RUNG_5_FLOOR: readonly PaletteName[] = [];

/**
 * The rung-7 outlines that lift some ground no more than rung 6's floor, per
 * palette. Recorded, not tuned (docs/map-visuals.md §10).
 *
 * - A Tier-3 contact's ring and glyph, in every palette. Both wear the
 *   contact's navy, and the darkest faction primaries — the Directorate's
 *   crimson, the Hadron's deep blue and dark teal — sit at 0.17–0.19
 *   luminance: at 0.33 and 0.55 they barely lift the ground.
 * - A Tier-4 contact's glyph, health bar and ordnance disc, in the three
 *   palettes whose Hadron is darkest. In tritanopia they miss the ring by
 *   0.0001 over the palest ground.
 * - A Tier-3 Sounder's halo, in the two red-green palettes, where fauna is a
 *   grey-green and rung 6's floor is the hatch.
 */
const RUNG_7_UNDER_RUNG_6_FLOOR: Record<PaletteName, readonly string[]> = {
  standard: ['countRingTier3', 'glyphTier3'],
  deuteranopia: [
    'countRingTier3',
    'discTier4',
    'glyphTier3',
    'glyphTier4',
    'healthBarTier4',
    'sounderHaloTier3',
  ],
  protanopia: [
    'countRingTier3',
    'discTier4',
    'glyphTier3',
    'glyphTier4',
    'healthBarTier4',
    'sounderHaloTier3',
  ],
  tritanopia: ['countRingTier3', 'discTier4', 'glyphTier3', 'glyphTier4', 'healthBarTier4'],
};

describe('the loudness ladder, rung 5', () => {
  it('lifts no ground less than its floor, in any outline or palette', () => {
    // The claim ladder.ts makes about the four it names: every other rung-5
    // outline lifts more — residue's arc at full intensity, and the bells and
    // shoal clouds by their loudest dot, among them. Held near the eye
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

  it('weighs a stipple dot by what it adds, and no dot clips over any ground', () => {
    // An additive dot adds the same to every ground until a channel reaches
    // white, which is what lets two grounds speak for all of them. The map's
    // grounds only ever darken its fills, so no ground has a channel brighter
    // than the brightest fill's.
    const brightest = [16, 8, 0].map(
      (shift) => Math.max(...Object.values(BIOME_COLOR).map((c) => (c >> shift) & 0xff)) / 255
    );
    let weighed = 0;
    for (const name of PALETTE_NAMES) {
      for (const table of [FURNITURE_OUTLINES, INSTRUMENT_OUTLINES, AGENT_OUTLINES]) {
        for (const [kind, outline] of Object.entries(table)) {
          if (outline.blend !== 'additive') continue;
          for (const stroke of strokesOf(outline, PALETTES[name], 'loudest')) {
            weighed++;
            additiveChannels(stroke.color, stroke.alpha).forEach((add, i) =>
              assert.ok(add + brightest[i]! <= 1, `${name}: ${kind} clips a channel`)
            );
            assert.ok(
              Math.abs(liftOf(stroke, DARKEST_GROUND) - liftOf(stroke, PALEST_GROUND)) < 1e-12,
              `${name}: ${kind} lifts two grounds differently`
            );
          }
        }
      }
    }
    assert.ok(weighed >= 3 * PALETTE_NAMES.length, 'the bells and both shoal clouds are weighed');
    // The model against two answers it must give: white at full gain adds
    // white, and nothing adds nothing.
    assert.ok(Math.abs(additiveLift(0xffffff, 1, DARKEST_GROUND) - 1) < 1e-4);
    assert.equal(additiveLift(0xffffff, 0, DARKEST_GROUND), 0);
  });
});

describe('the loudness ladder, rung 6', () => {
  it('has one floor in each palette, and it is the one recorded', () => {
    // Every rung-6 stroke is at least as loud as a stroke of the named floor
    // at both ends, so everywhere. A new outline under it, or the floor rising
    // over another, fails here.
    for (const name of PALETTE_NAMES) {
      const floor = strokesOf(INSTRUMENT_OUTLINES[RUNG_6_FLOOR[name]]!, PALETTES[name], 'quietest');
      for (const [kind, outline] of Object.entries(INSTRUMENT_OUTLINES)) {
        for (const stroke of strokesOf(outline, PALETTES[name], 'quietest')) {
          assert.ok(
            floor.some((f) => atLeast(stroke, f)),
            `${name}: ${kind} in ${stroke.color.toString(16)} is quieter than ${RUNG_6_FLOOR[name]}`
          );
        }
      }
    }
  });

  it('keeps the selected ring at least as loud as the unselected, in every colour', () => {
    // docs/ui-ux.md §3.5: the unselected ring is drawn at lower alpha than a
    // selected hull's, so selection still reads as selection. The ring came
    // up to 0.27 on #866 and stays under the selected 0.35.
    for (const name of PALETTE_NAMES) {
      const unselected = strokesOf(INSTRUMENT_OUTLINES.unselectedRing!, PALETTES[name], 'quietest');
      const selected = strokesOf(INSTRUMENT_OUTLINES.selectedRing!, PALETTES[name], 'quietest');
      assert.ok(unselected[0]!.alpha < selected[0]!.alpha);
      for (const stroke of selected) {
        assert.ok(
          unselected.some((u) => atLeast(stroke, u)),
          `${name}: the selected ring in ${stroke.color.toString(16)} is quieter than the unselected`
        );
      }
    }
  });

  it('lifts every ground more than the floor of rung 5, in all four palettes', () => {
    // A break is shown by a ground where it happens. A palette holds when
    // every rung-6 stroke is above some one rung-5 floor stroke at both
    // ends, so everywhere; one that is neither is a gap in this test.
    const broken: PaletteName[] = [];
    for (const name of PALETTE_NAMES) {
      const breaks = GROUNDS.some(
        (g) => instrumentFloorLift(PALETTES[name], g) <= furnitureFloorLift(PALETTES[name], g)
      );
      const floor = furnitureFloorStrokes(PALETTES[name]);
      const holds = quietStrokes(INSTRUMENT_OUTLINES, name).every((s) =>
        floor.some((f) => above(s, f))
      );
      assert.ok(breaks !== holds, `${name}: neither a break nor a hold is shown`);
      if (breaks) broken.push(name);
    }
    assert.deepEqual(
      broken,
      [...RUNG_6_FLOOR_UNDER_RUNG_5_FLOOR],
      'the break moved: update the record here and in docs/map-visuals.md'
    );
  });
});

describe('the loudness ladder, rung 7', () => {
  it('records every chart outline that lifts some ground no more than the floor of rung 6', () => {
    // Stroke against stroke, as above: an outline holds when each of its
    // strokes is above some one rung-6 stroke at both ends, and breaks at a
    // ground where it lifts no more than rung 6's floor.
    for (const name of PALETTE_NAMES) {
      const floor = quietStrokes(INSTRUMENT_OUTLINES, name);
      const found: string[] = [];
      for (const [kind, outline] of Object.entries(AGENT_OUTLINES)) {
        const strokes = strokesOf(outline, PALETTES[name], 'quietest');
        const breaks = strokes.some((s) =>
          GROUNDS.some((g) => liftOf(s, g) <= instrumentFloorLift(PALETTES[name], g))
        );
        const holds = strokes.every((s) => floor.some((f) => above(s, f)));
        assert.ok(breaks !== holds, `${name}: ${kind} shows neither a break nor a hold`);
        if (breaks) found.push(kind);
      }
      assert.deepEqual(
        found.sort(),
        [...RUNG_7_UNDER_RUNG_6_FLOOR[name]],
        `${name}: the break moved: update the record here and in docs/map-visuals.md`
      );
    }
  });
});
