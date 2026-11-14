/**
 * A mark's plate at the High graphics quality (docs/art-direction.md, "The
 * plate under a mark"; #1801): the level the world is held to under one, why
 * the ladder asks for it, and what the marks hand over. How the frame draws
 * the plates is rendererSmoke.test.ts; how they look is the pair in
 * docs/screenshots/issue-1801.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEPTH, HIGH_GRAPHICS, TERRAIN_LIFT } from '@echoes/shared';
import {
  agentFloorLift,
  encodedLuminance,
  furnitureFloorLift,
  instrumentFloorLift,
  strokeLift,
  unselectedRingLift,
} from '../src/game/ladder.ts';
import {
  MarkPlates,
  PLATE_GROUND,
  PLATE_HOLD_GLSL,
  PLATE_LEVEL,
  PLATE_LEVEL_GLSL,
  PLATE_STRIDE,
  plateLevelAt,
  plateWaterLevelAt,
} from '../src/game/markPlates.ts';
import {
  BIOME_COLOR,
  PALETTE_NAMES,
  PALETTES,
  type Palette,
  type PaletteName,
  scaleRgb,
  WATER_HUE,
} from '../src/game/palette.ts';
import { SURVEY_ALPHA, SURVEY_INK_COLOR } from '../src/game/surveyInk.ts';
import { WATER_RAMP_GLSL, waterColorAt, waterLuminanceAt } from '../src/game/water.ts';
import { waterLightAt } from '../src/game/waterMedium.ts';
import { highDisplayLinear } from './support/highDisplay.ts';

/**
 * The ladder's own comparisons for rungs 4 to 7 over one ground
 * (test/ladder.test.ts): the first that fails, or null where its order
 * holds. The ink reads, under rung 5's floor and under the unselected ring;
 * rung 6's floor clears rung 5's; and rung 7's floor on the chart reads.
 * Rung 7's floor clearing rung 6's is not asked: the ladder records where
 * it does not, over every ground (docs/map-visuals.md §10).
 */
const rungOrderBreak = (palette: Palette, ground: number): string | null => {
  const ink = Object.values(SURVEY_ALPHA).map((alpha) =>
    strokeLift(SURVEY_INK_COLOR, alpha, ground)
  );
  const rung5 = furnitureFloorLift(palette, ground);
  if (Math.min(...ink) <= 0) return 'the ink reads';
  if (Math.max(...ink) >= rung5) return 'the ink under rung 5';
  if (Math.max(...ink) >= unselectedRingLift(palette, ground)) return 'the ink under the ring';
  if (instrumentFloorLift(palette, ground) <= rung5) return 'rung 6 clears rung 5';
  if (agentFloorLift(palette, ground) <= 0) return 'rung 7 reads';
  return null;
};

const grey = (byte: number): number => (byte << 16) | (byte << 8) | byte;

describe('a mark’s plate', () => {
  it('holds the world to the palest ground the ladder weighs, and to nothing chosen', () => {
    // art-direction.md, "The plate under a mark": "the palest biome fill
    // lifted by the terrain cap, 11.6% encoded luminance". The same ground
    // test/ladder.test.ts weighs every rung over (`LIFTED_GROUND`).
    const palest = Object.values(BIOME_COLOR).reduce((a, b) =>
      encodedLuminance(a) >= encodedLuminance(b) ? a : b
    );
    assert.equal(PLATE_GROUND, scaleRgb(palest, 1 + TERRAIN_LIFT.MAX));
    assert.equal(PLATE_LEVEL, encodedLuminance(PLATE_GROUND));
    assert.equal((PLATE_LEVEL * 100).toFixed(1), '11.6');
  });

  it('keeps the ladder’s order over all the ground it leaves under a mark, in all four palettes (limit 6)', () => {
    // art-direction.md limit 6: under a plate "each tactical rung's floor
    // reads over the lit world as it reads at Low, in all four palettes".
    // The hold scales a pixel to the level by luminance, and a lift is linear
    // in the ground's luminance (ladder.ts `strokeLift`), so a grey at each
    // level from black to the plate's stands for every hue it can leave. One
    // byte past the level too: the canvas rounds what the hold hands it.
    // Ground: the water's share of a pixel is held to the ramp, below.
    const most = Math.ceil(PLATE_LEVEL * 255);
    for (const name of PALETTE_NAMES) {
      for (let byte = 0; byte <= most; byte++) {
        assert.equal(rungOrderBreak(PALETTES[name], grey(byte)), null, `${name}, grey ${byte}`);
      }
      assert.equal(rungOrderBreak(PALETTES[name], PLATE_GROUND), null, `${name}, the ground`);
    }
  });

  it('is asked for by the ladder: its rung order breaks over paler ground', () => {
    // art-direction.md, "The plate under a mark": the figures it gives, a
    // palette, for the palest grey ground the ladder's rung order holds over,
    // and what gives first past it. A pool that reads as light stands past
    // the first of them, so it cannot stand under a mark as the marks are.
    const holds = (name: PaletteName) => {
      for (let byte = 1; byte < 256; byte++) {
        const broke = rungOrderBreak(PALETTES[name], grey(byte));
        if (broke !== null)
          return { percent: Number((((byte - 1) / 255) * 100).toFixed(1)), broke };
      }
      return { percent: 100, broke: '' };
    };
    assert.deepEqual(holds('tritanopia'), { percent: 11.8, broke: 'rung 6 clears rung 5' });
    assert.deepEqual(holds('deuteranopia'), { percent: 17.3, broke: 'rung 7 reads' });
    assert.deepEqual(holds('protanopia'), { percent: 17.3, broke: 'rung 7 reads' });
    assert.deepEqual(holds('standard'), { percent: 18.8, broke: 'rung 7 reads' });
    // And the plate's level stands under the first of them.
    assert.ok(PLATE_LEVEL < 0.118);
  });

  it('is a ceiling, never a paint: a pixel under the level is not changed', () => {
    // The hold as the composite runs it (highFrame.ts), on an encoded colour
    // and a plate's coverage, here over ground, where the level is the
    // ladder's at any depth.
    assert.ok(
      PLATE_HOLD_GLSL.includes(
        'min( 1.0, echoesPlateLevel( swim.x, swim.y ) / max( shown, 1e-5 ) )'
      ),
      'scaled to the pixel’s level, and never up'
    );
    assert.ok(
      PLATE_LEVEL_GLSL.includes(`return ${PLATE_LEVEL.toFixed(6)} + share * max( 0.0, water - `),
      'which is the ground’s where the swim gave the water no share'
    );
    assert.ok(PLATE_HOLD_GLSL.includes('mix( 1.0, min('), 'by the plate’s coverage');
    assert.ok(PLATE_HOLD_GLSL.includes('texture2D( tPlates, vUv ).g'));
    const hold = (rgb: number[], plate: number): number[] => {
      const shown = 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
      const k = 1 + (Math.min(1, PLATE_LEVEL / Math.max(shown, 1e-5)) - 1) * plate;
      return rgb.map((c) => c * k);
    };
    const luminance = (rgb: number[]) => 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
    // The flora's glow at its brightest in the frames, a pool's white core,
    // and ground Low could have drawn.
    const glow = [0.1, 0.62, 0.45];
    const held = hold(glow, 1);
    assert.ok(
      Math.abs(luminance(held) - PLATE_LEVEL) < 1e-9,
      'a bright pixel is held at the level'
    );
    assert.ok(Math.abs(held[0]! / held[1]! - glow[0]! / glow[1]!) < 1e-9, 'its hue kept');
    assert.ok(Math.abs(luminance(hold([1, 1, 1], 1)) - PLATE_LEVEL) < 1e-9);
    const dark = [(PLATE_GROUND >> 16) & 0xff, (PLATE_GROUND >> 8) & 0xff, PLATE_GROUND & 0xff].map(
      (c) => c / 255
    );
    hold(dark, 1).forEach((c, k) =>
      assert.ok(Math.abs(c - dark[k]!) < 1e-9, 'the palest ground Low draws is left as it is')
    );
    assert.deepEqual(hold(glow, 0), glow, 'and where no plate stands, nothing is held');
    const edge = luminance(hold(glow, 0.5));
    assert.ok(edge > PLATE_LEVEL && edge < luminance(glow), 'a soft edge holds part of it');
  });

  it('takes what the marks hand over, a group to each layer the chart caches', () => {
    const plates = new MarkPlates();
    // Nothing is taken outside a group: a panel is no mark.
    plates.line(0, 0, 0, 1, 1, 1, 4);
    assert.equal(plates.count, 0);

    plates.begin('force');
    plates.line(10, -20, 30, 40, -50, 60, 4);
    plates.disc(1, 2, 3, 12, 0.5);
    plates.begin('nodes');
    plates.line(0, 0, 0, 5, 0, 5, 4, 1, true);
    plates.close();
    assert.equal(plates.count, 3);
    assert.equal(plates.countOf('force'), 2);
    assert.equal(plates.countOf('nodes'), 1);

    const packed = plates.pack();
    assert.equal(packed.length, 3 * PLATE_STRIDE);
    // From, how far it stands whole, to, how much of a plate, and whether it
    // swims out with the water.
    assert.deepEqual([...packed.slice(0, PLATE_STRIDE)], [10, -20, 30, 4, 40, -50, 60, 1, 0]);
    // A disc is a band with no length.
    assert.deepEqual(
      [...packed.slice(PLATE_STRIDE, 2 * PLATE_STRIDE)],
      [1, 2, 3, 12, 1, 2, 3, 0.5, 0]
    );
    assert.equal(packed[3 * PLATE_STRIDE - 1], 1, 'a line the conn view draws swims out');

    // A layer that redraws empties its own group and no other.
    const before = plates.revision;
    plates.begin('force');
    assert.ok(plates.revision > before, 'the pass is told');
    plates.disc(7, 8, 9, 10);
    assert.equal(plates.countOf('force'), 1);
    assert.equal(plates.countOf('nodes'), 1, 'a cached layer keeps its plates');
    // The rest of a layer two calls draw adds to it.
    plates.begin('contacts');
    plates.resume('force');
    plates.disc(7, 8, 9, 10);
    assert.equal(plates.countOf('force'), 2);
    // A mark that has not arrived carries no plate yet, and none is over-whole.
    plates.disc(0, 0, 0, 10, 0);
    plates.disc(0, 0, 0, 10, 3);
    assert.equal(plates.countOf('force'), 3);
    assert.equal(plates.pack()[plates.pack().length - 2], 1);

    plates.clear();
    assert.equal(plates.count, 0);
    plates.disc(0, 0, 0, 10);
    assert.equal(plates.count, 0, 'and nothing is open after it');
  });

  it('sizes a plate off the mark it stands under, in the UI’s pixels', () => {
    // TUNABLE until a High frame is accepted; what must hold is their order:
    // a plate stands whole past the widest stroke's edge (four pixels wide,
    // an active hazard's rim: EchoRenderer `HAZARD_STYLE`), and ends in a
    // soft edge, never a hard one.
    const { LINE_PX, INK_PX, AGENT_PX, FEATHER_PX } = HIGH_GRAPHICS.PLATE;
    assert.ok(LINE_PX > 2, 'past half the widest stroke');
    assert.ok(INK_PX > 0 && INK_PX <= LINE_PX, 'the ink is thinner, and everywhere');
    assert.ok(AGENT_PX > 0);
    assert.ok(FEATHER_PX >= 1);
  });
});

describe('a mark’s plate over water (#1816)', () => {
  const luminance = (rgb: readonly number[]) =>
    0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
  const decode = (byte: number): number => {
    const c = byte / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const encode = (l: number): number =>
    l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
  const channels = (hex: number): number[] => [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
  /** Low's water at a depth as the canvas holds it: the ramp, encoded. */
  const lowWater = (depthM: number): number[] => {
    const { r, g, b } = waterColorAt(depthM);
    return [r, g, b].map(encode);
  };
  const DEPTHS = Array.from({ length: DEPTH.MAX_M / 25 + 1 }, (_, i) => i * 25);
  const SHARES = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];

  it('holds the water’s share to the depth ramp’s own brightness, and the ground’s to the ladder’s', () => {
    // art-direction.md, "The plate under a mark": "For water it is the depth
    // ramp's own brightness at the pixel's depth, wherever that is the paler:
    // above 355 m, and 15.1% at the surface. A pixel is held to the two by
    // its shares".
    for (const depthM of DEPTHS) {
      const ramp = encode(waterLuminanceAt(depthM));
      assert.ok(Math.abs(plateWaterLevelAt(depthM) - ramp) < 1e-4, `${depthM} m is the ramp’s`);
      assert.equal(plateLevelAt(0, depthM), PLATE_LEVEL, `ground at ${depthM} m keeps its level`);
      assert.equal(plateLevelAt(1, depthM), Math.max(PLATE_LEVEL, plateWaterLevelAt(depthM)));
      let last = PLATE_LEVEL;
      for (const share of SHARES) {
        const level = plateLevelAt(share, depthM);
        assert.ok(level >= last, 'no level falls as the water’s share grows');
        last = level;
      }
    }
    assert.equal((plateWaterLevelAt(0) * 100).toFixed(1), '15.1');
    assert.ok(plateLevelAt(1, 350) > PLATE_LEVEL && plateLevelAt(1, 360) === PLATE_LEVEL);
    // The composite runs the same level from the ramp's own GLSL, and three's
    // encode, whose constants the source's copy carries.
    assert.ok(WATER_RAMP_GLSL.includes('vec3 echoesWaterColor( const in float depthM )'));
    assert.ok(
      PLATE_LEVEL_GLSL.includes(
        'float ramp = dot( echoesWaterColor( depthM ), vec3( 0.2126, 0.7152, 0.0722 ) );'
      )
    );
    assert.ok(PLATE_LEVEL_GLSL.includes('sRGBTransferOETF( vec4( vec3( ramp ), 1.0 ) ).r'));
  });

  it('takes nothing from a pixel Low could draw, at any depth and any share', () => {
    // "Under one, the world layer is drawn no brighter than Low could draw it
    // there." Low's fog mixes the ground with the water it stands in after
    // both are encoded (water.ts `installWaterFog`), so the pixel is that mix
    // of bytes. The palest ground Low draws, and the blackest, under every
    // share of Low's water at every depth, stand at or under the level.
    for (const ground of [channels(PLATE_GROUND).map((c) => c / 255), [0, 0, 0]]) {
      for (const depthM of DEPTHS) {
        const water = lowWater(depthM);
        for (const share of SHARES) {
          const pixel = luminance(ground.map((c, k) => c + (water[k]! - c) * share));
          assert.ok(
            pixel <= plateLevelAt(share, depthM) + 1e-9,
            `${depthM} m, share ${share}: Low draws ${(pixel * 255).toFixed(2)}`
          );
        }
      }
    }
    // The fault: one level for every pixel. Low's own water is paler than
    // the ground's level above about 290 m, so a disc showed over it.
    assert.ok(luminance(lowWater(280)) > PLATE_LEVEL && luminance(lowWater(290)) < PLATE_LEVEL);
    assert.ok(
      (luminance(lowWater(0)) - PLATE_LEVEL) * 255 > 6,
      'by over six points at the surface'
    );
  });

  it('takes nothing from any biome’s water the ramp alone lights', () => {
    // "So a plate changes nothing over ground the Lid alone lights, nor over
    // water the ramp alone lights, whatever its biome's hue". The water as
    // the composite adds it (waterMedium.ts): the biome's hue at unit
    // luminance, times the ramp's light, by the pixel's share; shown through
    // the grade and the curve as the GPU runs them (support/highDisplay.ts).
    for (const token of Object.values(WATER_HUE)) {
      const hue = channels(token).map(decode);
      const unit = luminance(hue);
      for (const depthM of DEPTHS) {
        for (const share of SHARES) {
          const light = hue.map((c) => (c / unit) * waterLightAt(depthM) * share);
          const shown = luminance(highDisplayLinear(light).map(encode));
          assert.ok(
            shown <= plateLevelAt(share, depthM),
            `${token.toString(16)} at ${depthM} m, share ${share}: ${(shown * 255).toFixed(2)} over ${(plateLevelAt(share, depthM) * 255).toFixed(2)}`
          );
        }
      }
    }
    // And the ground's level alone would take it: open water at the surface
    // shows six points over that level.
    const open = channels(WATER_HUE[0 as keyof typeof WATER_HUE]).map(decode);
    const surface = luminance(
      highDisplayLinear(open.map((c) => (c / luminance(open)) * waterLightAt(0))).map(encode)
    );
    assert.ok((surface - PLATE_LEVEL) * 255 > 6, `${(surface * 255).toFixed(1)} of 255`);
  });

  it('leaves a mark over water what Low leaves it: three palettes’ order, and tritanopia’s break', () => {
    // "Low is the standard limit 6 names, and Low's own water is what a mark
    // stands over there. In tritanopia rung 6 does not clear rung 5 over
    // Low's water above 270 m". Over Low's water at every depth the other
    // three palettes keep the ladder's order, and a plate leaves no water
    // paler than they keep it over.
    const packed = (depthM: number): number => {
      const [r, g, b] = lowWater(depthM).map((c) => Math.round(c * 255));
      return (r! << 16) | (g! << 8) | b!;
    };
    for (const name of PALETTE_NAMES) {
      const breaks = DEPTHS.filter((depthM) => rungOrderBreak(PALETTES[name], packed(depthM)));
      if (name !== 'tritanopia') {
        assert.deepEqual(breaks, [], name);
        for (let byte = 0; byte <= Math.ceil(plateWaterLevelAt(0) * 255); byte++) {
          assert.equal(rungOrderBreak(PALETTES[name], grey(byte)), null, `${name}, grey ${byte}`);
        }
        continue;
      }
      assert.ok(breaks.length > 0 && breaks.every((depthM) => depthM < 270), String(breaks));
      assert.equal(Math.max(...breaks), 250);
      for (const depthM of breaks) {
        assert.equal(rungOrderBreak(PALETTES[name], packed(depthM)), 'rung 6 clears rung 5');
      }
    }
  });
});
