/**
 * Survey ink — docs/map-visuals.md §4 — and the rung §5 holds it on.
 *
 * The shader itself needs a GL context and is reviewed by screenshot, per the
 * graphics-standards checklist. What these hold is everything the shader is
 * handed: which depths get a major line, what a coastline compares, and the
 * ladder — that every ink stroke lifts the ground less than rung 5's quiet
 * rims and the unselected detection ring do, over the darkest and the palest
 * ground and in every palette.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Biome, DEPTH, DEPTH_BANDS } from '@echoes/shared';
import { BIOME_COLOR, PALETTE_NAMES, PALETTES, ROCK_FACE } from '../src/game/palette.ts';
import {
  encodedLuminance,
  furnitureFloorLift,
  strokeLift,
  unselectedRingLift,
} from '../src/game/ladder.ts';
import {
  MAJOR_ISOBATHS_M,
  MINOR_ISOBATH_M,
  patchSurveyCellClasses,
  ROCK_CLASS,
  SURVEY_ALPHA,
  SURVEY_INK_COLOR,
  surveyCellClasses,
} from '../src/game/surveyInk.ts';
import type { TerrainPayload } from '../src/net/GameClient.ts';

const channels = (c: number) => [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff] as const;

/** HSV saturation: how far the brightest channel stands from the dimmest. */
const saturation = (c: number) => {
  const [r, g, b] = channels(c);
  const max = Math.max(r, g, b);
  return max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
};

/**
 * The palest biome fill, where the owner measured the ring's 0.266. A paler
 * fogged ground exists and is recorded in docs/map-visuals.md §10, not reached.
 */
const PALEST_GROUND = Object.values(BIOME_COLOR).reduce((a, b) =>
  encodedLuminance(a) >= encodedLuminance(b) ? a : b
);
/** And the darkest: a fully drained veil over the trench is black. */
const DARKEST_GROUND = 0x000000;

describe('survey ink levels', () => {
  it('draws a major isobath at each depth-band boundary, read from the ruleset', () => {
    // SPEC: §4 names 400 m and 1,800 m, and says they are DEPTH_BANDS'. Both
    // halves are held: the numbers the doc quotes, and that they are derived.
    assert.deepEqual([...MAJOR_ISOBATHS_M], [400, 1800]);
    const boundaries = Object.values(DEPTH_BANDS)
      .map((band) => band.min)
      .filter((depth) => depth > 0 && depth < DEPTH.MAX_M);
    assert.deepEqual(
      [...MAJOR_ISOBATHS_M],
      boundaries.sort((a, b) => a - b)
    );
  });

  it('draws a minor isobath every 100 m, and every major falls on one', () => {
    assert.equal(MINOR_ISOBATH_M, 100);
    for (const major of MAJOR_ISOBATHS_M) assert.equal(major % MINOR_ISOBATH_M, 0);
  });
});

describe('survey ink colour', () => {
  it('is hue-neutral: no more tinted than the stone ramp, and cool like it', () => {
    // Rule 3. Hue belongs to the biome, and a tinted line would be read as
    // one. The stone ramp is the doc's own example of "near-grey with the
    // canvas's blue memory", so it is the bar, channel order included.
    assert.ok(
      saturation(SURVEY_INK_COLOR) <= saturation(ROCK_FACE),
      `ink saturation ${saturation(SURVEY_INK_COLOR).toFixed(2)} over the stone's`
    );
    const [r, g, b] = channels(SURVEY_INK_COLOR);
    assert.ok(b >= g && g >= r, 'ink leans warm, not toward the canvas blue');
  });
});

describe('the loudness ladder, rung 4 under rung 5', () => {
  it('lifts every ground less than the quietest furniture outline, in every palette', () => {
    // §5. Both lifts are linear in the ground's luminance, so the darkest
    // and the palest ground bound every ground between. The quietest outline
    // is the least of rung 5's four rims. Residue's arc at a faint mark's own
    // peak is quieter than the ink, and ladder.test.ts records it rather than
    // taking the ink down to follow it (§10).
    for (const name of PALETTE_NAMES) {
      for (const ground of [DARKEST_GROUND, PALEST_GROUND]) {
        const ceiling = furnitureFloorLift(PALETTES[name], ground);
        for (const [kind, alpha] of Object.entries(SURVEY_ALPHA)) {
          const lift = strokeLift(SURVEY_INK_COLOR, alpha, ground);
          assert.ok(
            lift < ceiling,
            `${name}: ${kind} ink lifts ${ground.toString(16)} by ${lift.toFixed(4)}, ` +
              `furniture only by ${ceiling.toFixed(4)}`
          );
        }
      }
    }
  });

  it('still reads over the palest ground', () => {
    // A line quieter than the fill it lies on is not a line. Positive over
    // the palest fill means positive over every fill.
    for (const [kind, alpha] of Object.entries(SURVEY_ALPHA)) {
      assert.ok(strokeLift(SURVEY_INK_COLOR, alpha, PALEST_GROUND) > 0, `${kind} vanishes`);
    }
  });

  it('lifts every ground less than an unselected detection ring, in both its colours', () => {
    // §5. The ring is the player's own exposure (ui-ux.md §3.5), and a line
    // of seabed ink that out-shouted it would bury the one reading a quiet
    // navy lives by. The owner chose the ink coming down over the ring going
    // up (#865); the ring came up later, to clear rung 5's floor (#866), and
    // the ink stayed where it was.
    for (const name of PALETTE_NAMES) {
      for (const ground of [DARKEST_GROUND, PALEST_GROUND]) {
        const ceiling = unselectedRingLift(PALETTES[name], ground);
        for (const [kind, alpha] of Object.entries(SURVEY_ALPHA)) {
          const lift = strokeLift(SURVEY_INK_COLOR, alpha, ground);
          assert.ok(
            lift < ceiling,
            `${name}: ${kind} ink lifts ${ground.toString(16)} by ${lift.toFixed(4)}, ` +
              `the unselected ring only by ${ceiling.toFixed(4)}`
          );
        }
      }
    }
  });

  it('ranks the ink within its rung: minor, then the band lines and borders, then rock', () => {
    assert.ok(SURVEY_ALPHA.minor < SURVEY_ALPHA.major);
    assert.ok(SURVEY_ALPHA.major <= SURVEY_ALPHA.coast);
    assert.ok(SURVEY_ALPHA.border <= SURVEY_ALPHA.coast);
  });
});

describe('coastline cell classes', () => {
  function terrain(): TerrainPayload {
    const cols = 3;
    const rows = 2;
    return {
      cols,
      rows,
      cellM: 250,
      biomes: [
        Biome.KelpForest,
        Biome.ThermalVein,
        Biome.OpenWater,
        Biome.KelpForest,
        Biome.KelpForest,
        Biome.AbyssalTrench,
      ],
      floor: [700, 700, 2600, 700, 700, 2800],
      ceiling: [0, 0, 0, 0, 3000, 0],
    };
  }

  it('labels each cell with its biome, and rock as rock whatever biome it carries', () => {
    // A coastline is drawn where the label changes, so the label must be the
    // propagation factor's own key — the biome — and rock, which has none.
    assert.deepEqual(
      [...surveyCellClasses(terrain())],
      [
        Biome.KelpForest,
        Biome.ThermalVein,
        Biome.OpenWater,
        Biome.KelpForest,
        ROCK_CLASS,
        Biome.AbyssalTrench,
      ]
    );
  });

  it('patches the cells a ground delta touched, and only those', () => {
    const before = terrain();
    const classes = surveyCellClasses(before);
    const after = terrain();
    after.ceiling[4] = 0; // the rock collapses to kelp
    after.biomes[2] = Biome.CoralRuins; // outside the touched rectangle
    patchSurveyCellClasses(classes, after, { col0: 0, row0: 1, col1: 1, row1: 1 });
    assert.equal(classes[4], Biome.KelpForest);
    assert.equal(classes[2], Biome.OpenWater, 'a cell outside the delta was rewritten');
  });
});
