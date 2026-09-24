/**
 * Classified animals as stipple — docs/map-visuals.md §8, Phase 4 of §10 (#868).
 *
 * How the dots look is the screenshot gate's, and the review frames are in
 * `docs/screenshots/issue-868/`. What node:test can hold is what §8 and §5
 * promise: one shape per species, Tier 4 the same shape denser, nothing below
 * Tier 3, a bounded cost, and a look that never reads as rung 5's public
 * stipple. The renderer's half — that a forged sub-Tier-3 payload draws what a
 * hull draws, and that the conn scene gains nothing — is in
 * rendererSmoke.test.ts.
 *
 * **The ladder, under the owner's rulings on #866.** A rung is weighed floor
 * against floor: its quietest steady mark lifts more than the floor of the
 * rung below. A fading mark is weighed at its steady peak, a fresh and fully
 * arrived contact. A rimless mark is weighed by its loudest crisp element as
 * if it were an outline, here a dot at its peak. So rung 7's stipple is
 * weighed by one Tier-3 dot, fresh, at `TIER_STYLE`'s 0.55 in `FAUNA_COLOR`,
 * blended source-over in encoded space the way the overlay composites over
 * the GL canvas. It clears rung 5's floor and rung 6's floor over both grounds
 * in all four palettes, with the unselected ring at 0.18 as merged and at the
 * 0.27 #866 moves it to.
 *
 * **Recorded, not held: a furniture dot can out-lift an agent dot.** A formed
 * Lampfry shoal's brightest dot is additive at up to `SHOAL_FORMED_GAIN` in
 * linear light, so what it adds to the canvas is roughly the sRGB encoding of
 * 0.9 x linear `FAUNA_COLOR`: 0x5aa083 for the standard 0x5fa88a, near the
 * colour itself. Over black it lifts 0.561 in the standard palette against a
 * Tier-4 agent dot's 0.531 and a Tier-3 dot's 0.324; over the palest ground,
 * 0.561 against 0.441 and 0.270, because an added light lifts every ground
 * alike and a blended dot lifts a pale one less. The other three palettes
 * keep the order (the table in the last test). Floor against floor allows it:
 * rung 5's floor is its quiet rims, not its loudest dot. Both are `FAUNA_COLOR` in all four palettes, so what keeps the two
 * apart is form, and the block before the ladder holds that: size, edge,
 * blend, motion and scale.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { AdditiveBlending, Color, ShaderMaterial, Vector3 } from 'three';
import { Polygon, Texture, type GraphicsContext } from 'pixi.js';
import { DRIFT_ROSTER, FaunaSpecies, faunaStatsFor, ResolutionTier } from '@echoes/shared';
import {
  AGENT_DOT_DIAMETER_PX,
  AGENT_ZOOM_BUCKET_MAX,
  AGENT_ZOOM_BUCKET_MIN,
  AGENT_ZOOM_BUCKETS_PER_OCTAVE,
  agentDotRadiusM,
  agentStippleContext,
  agentStippleContextCount,
  agentStippleCount,
  agentStippleDots,
  agentStippleGraphics,
  agentZoomBucket,
  buildAgentStippleDots,
  paintAgentStipple,
} from '../src/game/faunaAgentStipple.ts';
import {
  BELL_RADIUS_M,
  DOT_MAX_PX,
  FaunaStipple,
  SHOAL_FORMED_GAIN,
  SHOAL_FORMED_RADIUS_M,
} from '../src/game/faunaStipple.ts';
import {
  encodedLuminance,
  furnitureFloorLift,
  INSTRUMENT_OUTLINES,
  instrumentFloorLift,
  quietestLift,
  strokeLift,
} from '../src/game/ladder.ts';
import { BIOME_COLOR, PALETTE_NAMES, PALETTES, setActivePalette } from '../src/game/palette.ts';
import type { Palette, PaletteName } from '../src/game/palette.ts';

const SPECIES = Object.values(FaunaSpecies).filter(
  (value): value is FaunaSpecies => typeof value === 'number'
);

/** How far each silhouette reached, in half-lengths: the Sounder's halo at
 * 1.4 and the Rasp's ring at 1.1 were drawn past the body. The dots replace
 * those silhouettes and stay inside them. */
const SILHOUETTE_REACH: Record<FaunaSpecies, number> = {
  [FaunaSpecies.Ashgrazer]: 1,
  [FaunaSpecies.Draymaw]: 1,
  [FaunaSpecies.Sounder]: 1.4,
  [FaunaSpecies.Rasp]: 1.1,
  [FaunaSpecies.Lampfry]: 1,
  [FaunaSpecies.Tetherjelly]: 1,
  [FaunaSpecies.Hollow]: 1,
};

/** The palest ground the map can draw, and the darkest (ladder.test.ts). */
const PALEST_GROUND = Object.values(BIOME_COLOR).reduce((a, b) =>
  encodedLuminance(a) >= encodedLuminance(b) ? a : b
);
const DARKEST_GROUND = 0x000000;
const GROUNDS = [DARKEST_GROUND, PALEST_GROUND];

/** The unselected detection ring as #866 moves it. The owner ruled the move;
 * until that branch lands, a claim here holds at both values. */
const UNSELECTED_RING_ON_866 = 0.27;

/** Where each dot of a pattern is: the centre of each hexagon it filled. */
function centres(context: GraphicsContext): Array<[number, number]> {
  assert.equal(context.instructions.length, 1, 'every dot in one fill');
  const fill = context.instructions[0]!;
  assert.ok(fill.action === 'fill', 'a fill, not a texture or a stroke');
  return fill.data.path.shapePath.shapePrimitives.map(({ shape }) => {
    assert.ok(shape instanceof Polygon, 'a dot is a polygon, not a soft sprite');
    const points = shape.points;
    let x = 0;
    let y = 0;
    for (let i = 0; i < points.length; i += 2) {
      x += points[i]!;
      y += points[i + 1]!;
    }
    const n = points.length / 2;
    return [x / n, y / n];
  });
}

function extent(dots: ArrayLike<number>, count: number): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (let i = 0; i < count; i++) {
    x = Math.max(x, Math.abs(dots[i * 2]!));
    y = Math.max(y, Math.abs(dots[i * 2 + 1]!));
  }
  return { x, y };
}

function widest(dots: Float32Array): number {
  let reach = 0;
  for (let i = 0; i < dots.length; i += 2)
    reach = Math.max(reach, Math.hypot(dots[i]!, dots[i + 1]!));
  return reach;
}

afterEach(() => {
  setActivePalette('standard');
});

describe('fauna agent stipple: the shapes (§8)', () => {
  it('has one template per species, and Tier 3 is the prefix of Tier 4', () => {
    assert.equal(SPECIES.length, 7, 'the bestiary classifies seven; the Attendants never');
    for (const species of SPECIES) {
      const dots = agentStippleDots(species);
      const classified = agentStippleCount(species, ResolutionTier.Classification);
      const track = agentStippleCount(species, ResolutionTier.Track);
      assert.ok(classified > 0, `${species} has a shape`);
      assert.ok(track > classified, 'more dots means more knowledge');
      assert.equal(track, classified * 2, 'Tier 4 is the same shape at twice the dots');
      assert.equal(dots.length, track * 2);

      // Held on what is drawn, not only on the template: the Tier-3 pattern's
      // dots are the Tier-4 pattern's first dots, exactly.
      const sparse = centres(agentStippleContext(species, ResolutionTier.Classification, 1)!);
      const dense = centres(agentStippleContext(species, ResolutionTier.Track, 1)!);
      assert.equal(sparse.length, classified);
      assert.equal(dense.length, track);
      sparse.forEach(([x, y], i) => {
        assert.ok(Math.abs(x - dense[i]![0]) < 1e-9 && Math.abs(y - dense[i]![1]) < 1e-9);
        assert.ok(Math.abs(x - dots[i * 2]!) < 1e-4 && Math.abs(y - dots[i * 2 + 1]!) < 1e-4);
      });
    }
  });

  it('draws the whole shape at Tier 3, sparse, never half of it', () => {
    // Every part's Tier-3 dots come first, so the prefix spans the figure.
    for (const species of SPECIES) {
      const dots = agentStippleDots(species);
      const classified = agentStippleCount(species, ResolutionTier.Classification);
      const sparse = extent(dots, classified);
      const dense = extent(dots, classified * 2);
      assert.ok(sparse.x >= dense.x * 0.75, `${species}: Tier 3 spans the shape's width`);
      assert.ok(sparse.y >= dense.y * 0.75, `${species}: and its height`);
    }
  });

  it('is the same figure every time, for every creature of a kind', () => {
    for (const species of SPECIES) {
      assert.deepEqual(buildAgentStippleDots(species), buildAgentStippleDots(species));
      assert.deepEqual(agentStippleDots(species), buildAgentStippleDots(species));
    }
  });

  it('keeps every dot inside the silhouette it replaces', () => {
    for (const species of SPECIES) {
      const bound = (faunaStatsFor(species).lengthM / 2) * SILHOUETTE_REACH[species] + 1e-6;
      const dots = agentStippleDots(species);
      const reach = extent(dots, dots.length / 2);
      assert.ok(reach.x <= bound && reach.y <= bound, `${species} reaches past its silhouette`);
    }
  });

  it('draws nothing below Tier 3, for any species', () => {
    // docs/bestiary.md §3: no marker distinguishes fauna from an army at
    // Tier 1 or 2. The renderer's own gate is in rendererSmoke.test.ts.
    for (const species of SPECIES) {
      for (const tier of [ResolutionTier.Silent, ResolutionTier.Contact, ResolutionTier.Bearing]) {
        assert.equal(agentStippleCount(species, tier), 0);
        assert.equal(agentStippleContext(species, tier, 1), null);
      }
    }
  });
});

describe('fauna agent stipple: the budget (gate 6)', () => {
  it('bounds the dots the whole roster can put on the chart', () => {
    // Every creature a full map seeds, tracked at once. Mission beats can
    // spawn past the roster, so the per-creature cap is the real bound; this
    // is the number docs/map-visuals.md §10 records for the ordinary map.
    const total = (tier: ResolutionTier): number =>
      DRIFT_ROSTER.reduce((sum, row) => sum + row.count * agentStippleCount(row.species, tier), 0);
    assert.equal(
      DRIFT_ROSTER.reduce((n, row) => n + row.count, 0),
      48
    );
    assert.equal(total(ResolutionTier.Track), 1536);
    assert.equal(total(ResolutionTier.Classification), 768);
    for (const species of SPECIES) {
      assert.ok(agentStippleCount(species, ResolutionTier.Track) <= 72, 'no creature past 72 dots');
    }
  });

  it('builds a pattern once per species, density and zoom bucket, and no more', () => {
    const cap = SPECIES.length * 2 * (AGENT_ZOOM_BUCKET_MAX - AGENT_ZOOM_BUCKET_MIN + 1);
    // A dolly from a nine-order-of-magnitude pull-back to the lens.
    for (let step = -20 * 16; step <= 20 * 16; step++) {
      const pxPerM = 2 ** (step / 16);
      for (const species of SPECIES) {
        for (const tier of [ResolutionTier.Classification, ResolutionTier.Track]) {
          const context = agentStippleContext(species, tier, pxPerM)!;
          // Identity as a boolean: a failed `equal` on two contexts has the
          // reporter inspect both, which never finishes.
          assert.ok(
            context === agentStippleContext(species, tier, pxPerM),
            'asked twice, built once'
          );
          assert.equal(context.batchMode, 'batch', 'a creature joins the overlay batch');
        }
      }
    }
    assert.ok(agentStippleContextCount() <= cap, `${agentStippleContextCount()} patterns > ${cap}`);
  });

  it('keeps a dot about three CSS pixels wide at every zoom it is built for', () => {
    const lo = 2 ** (AGENT_ZOOM_BUCKET_MIN / AGENT_ZOOM_BUCKETS_PER_OCTAVE);
    const hi = 2 ** (AGENT_ZOOM_BUCKET_MAX / AGENT_ZOOM_BUCKETS_PER_OCTAVE);
    const wobble = 2 ** (0.5 / AGENT_ZOOM_BUCKETS_PER_OCTAVE) + 1e-9;
    for (let pxPerM = lo; pxPerM <= hi; pxPerM *= 1.07) {
      const px = agentDotRadiusM(agentZoomBucket(pxPerM)) * 2 * pxPerM;
      assert.ok(px <= AGENT_DOT_DIAMETER_PX * wobble && px >= AGENT_DOT_DIAMETER_PX / wobble);
    }
  });
});

describe('fauna agent stipple: never furniture’s look (§5)', () => {
  // docs/map-visuals.md §5: a public field is rung 5 and a classified animal
  // rung 7, and "they must never share a look, or a Tetherjelly field would
  // read as a contact". Both are FAUNA_COLOR by §8, so hue cannot do it; the
  // last test here holds that they share it. Reduced motion stills the
  // furniture's pulse, so every axis but motion survives it.

  it('is a bigger dot than any furniture dot', () => {
    assert.ok(AGENT_DOT_DIAMETER_PX > DOT_MAX_PX, 'diameter against diameter, both CSS px');
  });

  it('has a hard edge where furniture is soft', () => {
    const context = agentStippleContext(FaunaSpecies.Tetherjelly, ResolutionTier.Track, 1)!;
    const fill = context.instructions[0]!;
    assert.equal(fill.action, 'fill');
    const style = fill.data.style as { color: number; alpha: number; texture: Texture };
    assert.equal(style.color, 0xffffff, 'solid, and tinted per frame');
    assert.equal(style.alpha, 1);
    assert.equal(style.texture, Texture.WHITE, 'no sprite, no falloff');
    centres(context); // every shape a polygon

    const stipple = new FaunaStipple();
    try {
      const shader = (stipple.jellies.points.material as ShaderMaterial).fragmentShader;
      assert.match(shader, /smoothstep\(/, 'the furniture dot is soft at its rim');
    } finally {
      stipple.dispose();
    }
  });

  it('blends normally where furniture adds light', () => {
    const context = agentStippleContext(FaunaSpecies.Lampfry, ResolutionTier.Track, 1)!;
    const dots = agentStippleGraphics(context);
    const stipple = new FaunaStipple();
    try {
      assert.equal(dots.blendMode, 'normal');
      for (const cloud of [stipple.jellies, stipple.shoals]) {
        assert.equal((cloud.points.material as ShaderMaterial).blending, AdditiveBlending);
      }
    } finally {
      dots.destroy();
      stipple.dispose();
    }
  });

  it('holds still where furniture pulses', () => {
    // The agent's pattern takes no clock: the same inputs give the same
    // object, frame after frame. The furniture's clock advances.
    const context = agentStippleContext(FaunaSpecies.Tetherjelly, ResolutionTier.Track, 0.8);
    assert.ok(agentStippleContext(FaunaSpecies.Tetherjelly, ResolutionTier.Track, 0.8) === context);
    const stipple = new FaunaStipple();
    try {
      const frame = (now: number) => ({
        now,
        eye: new Vector3(0, 2000, 0),
        reachM: 12_000,
        waterDensity: 1,
        projectionScalePx: 990,
        pixelRatio: 1,
      });
      stipple.update(frame(0));
      stipple.update(frame(200));
      const t = stipple.jellies.uniforms.uTime.value;
      stipple.update(frame(400));
      assert.ok(stipple.jellies.uniforms.uTime.value > t, 'a bell breathes');
    } finally {
      stipple.dispose();
    }
  });

  it('is small beside a field’s bells and a shoal’s cloud', () => {
    assert.ok(widest(agentStippleDots(FaunaSpecies.Tetherjelly)) < BELL_RADIUS_M);
    assert.ok(widest(agentStippleDots(FaunaSpecies.Lampfry)) < SHOAL_FORMED_RADIUS_M);
  });

  it('is drawn in FAUNA_COLOR in all four palettes, read at draw time', () => {
    const context = agentStippleContext(FaunaSpecies.Draymaw, ResolutionTier.Classification, 1)!;
    const dots = agentStippleGraphics(context);
    try {
      for (const name of PALETTE_NAMES) {
        setActivePalette(name);
        paintAgentStipple(dots, 0.4);
        assert.equal(dots.tint, PALETTES[name].fauna, `${name}`);
        assert.equal(dots.alpha, 0.4, 'the contact’s own alpha');
      }
    } finally {
      dots.destroy();
    }
  });
});

/** Rung 6's floor with the unselected ring at `ring` instead of as merged. */
function instrumentFloorWithRing(palette: Palette, ground: number, ring: number): number {
  return Math.min(
    ...Object.entries(INSTRUMENT_OUTLINES).map(([kind, outline]) =>
      quietestLift(
        kind === 'unselectedRing' ? { ...outline, quietest: ring, loudest: ring } : outline,
        palette,
        ground
      )
    )
  );
}

/** One agent dot's lift at `alpha`: source-over, in encoded space. */
const agentLift = (palette: Palette, alpha: number, ground: number): number =>
  strokeLift(palette.fauna, alpha, ground);

/** A furniture dot's lift at `alpha` in linear light, added to `ground` the
 * way three.js writes it: the colour encoded after the multiply. */
function furnitureLift(palette: Palette, alpha: number, ground: number): number {
  const added = new Color(palette.fauna).multiplyScalar(alpha).getHex();
  let sum = 0;
  for (const shift of [16, 8, 0]) {
    sum |= Math.min(255, ((ground >> shift) & 0xff) + ((added >> shift) & 0xff)) << shift;
  }
  return encodedLuminance(sum) - encodedLuminance(ground);
}

describe('fauna agent stipple: the ladder (§5, rulings on #866)', () => {
  it('lifts every ground more than rung 5’s floor and rung 6’s, at its quietest', () => {
    for (const name of PALETTE_NAMES) {
      const palette = PALETTES[name];
      // The quietest steady moment: Tier 3, fresh and fully arrived. Tier 4
      // is the same dot at 0.9.
      const alpha = palette.tier[ResolutionTier.Classification].alpha;
      for (const ground of GROUNDS) {
        const dot = agentLift(palette, alpha, ground);
        const at = `${name} over ${ground.toString(16)}`;
        assert.ok(dot > furnitureFloorLift(palette, ground), `${at}: under rung 5's floor`);
        assert.ok(dot > instrumentFloorLift(palette, ground), `${at}: under rung 6's floor`);
        assert.ok(
          dot > instrumentFloorWithRing(palette, ground, UNSELECTED_RING_ON_866),
          `${at}: under rung 6's floor with the ring at 0.27`
        );
      }
    }
  });

  it('records how a formed shoal’s brightest dot compares with an agent dot', () => {
    // Not a hold. Floor against floor allows a furniture dot to out-lift an
    // agent dot, and this pins by how much so a change to either is written
    // down: the header and docs/map-visuals.md §10 carry the same figures.
    const RECORDED: Record<
      PaletteName,
      { furniture: number; track: number; classified: number }[]
    > = {
      standard: [
        { furniture: 0.561, track: 0.531, classified: 0.324 },
        { furniture: 0.561, track: 0.441, classified: 0.27 },
      ],
      deuteranopia: [
        { furniture: 0.496, track: 0.47, classified: 0.287 },
        { furniture: 0.496, track: 0.38, classified: 0.232 },
      ],
      protanopia: [
        { furniture: 0.496, track: 0.47, classified: 0.287 },
        { furniture: 0.496, track: 0.38, classified: 0.232 },
      ],
      tritanopia: [
        { furniture: 0.459, track: 0.434, classified: 0.265 },
        { furniture: 0.459, track: 0.345, classified: 0.211 },
      ],
    };
    for (const name of PALETTE_NAMES) {
      const palette = PALETTES[name];
      GROUNDS.forEach((ground, i) => {
        const measured = {
          furniture: furnitureLift(palette, SHOAL_FORMED_GAIN, ground),
          track: agentLift(palette, palette.tier[ResolutionTier.Track].alpha, ground),
          classified: agentLift(palette, palette.tier[ResolutionTier.Classification].alpha, ground),
        };
        const want = RECORDED[name][i]!;
        for (const key of ['furniture', 'track', 'classified'] as const) {
          assert.ok(
            Math.abs(measured[key] - want[key]) < 0.002,
            `${name} over ${ground.toString(16)}: ${key} lifts ${measured[key].toFixed(3)}, ` +
              `recorded ${want[key]} — update the record here and in docs/map-visuals.md`
          );
        }
      });
    }
  });
});
