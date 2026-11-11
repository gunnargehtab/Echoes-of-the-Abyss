/**
 * The High graphics quality's lit ground (docs/art-direction.md, "Two layers,
 * two laws"; #1801): what the bake hands a light, and the patch that lights
 * it. How the frame draws it is rendererSmoke.test.ts; how it looks is the
 * frames in docs/screenshots/issue-1801.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MeshBasicMaterial, ShaderLib } from 'three';
import { Biome, HIGH_GRAPHICS, MODEL_LIGHTING } from '@echoes/shared';
import type { TerrainPayload } from '../src/net/GameClient.ts';
import { BIOME_COLOR, LID_GLOW, ROCK_FACE } from '../src/game/palette.ts';
import { encodedLuminance } from '../src/game/ladder.ts';
import {
  installLitGround,
  installLitRoof,
  LIT_GROUND_GLSL,
  LIT_IRRADIANCE_GLSL,
  litGroundBytes,
  litGroundSurface,
} from '../src/game/litGround.ts';
import { PLATE_LEVEL } from '../src/game/markPlates.ts';
import {
  BIOME_RELIEF,
  LIT_ALBEDO_GAIN,
  ROCK_RELIEF,
  SEABED_PX_PER_CELL,
  seabedRange,
  seabedSeed,
  shadeSeabed,
} from '../src/game/seabed.ts';
import { DEPTH_VISUAL_M_PER_M } from '../src/game/perspectiveTerrain.ts';
import { installSurveyInk, surveyCellClasses, surveyCellTexture } from '../src/game/surveyInk.ts';
import { installDisplayVeil } from '../src/game/veilShading.ts';

const decode = (byte: number): number => {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const luminance = (r: number, g: number, b: number): number =>
  0.2126 * decode(r) + 0.7152 * decode(g) + 0.0722 * decode(b);
const hexLuminance = (hex: number): number =>
  luminance((hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff);

/** One biome a cell, level, with a rock cell last: nothing slopes but the detail. */
const BIOMES = [
  Biome.OpenWater,
  Biome.ThermalVein,
  Biome.KelpForest,
  Biome.AbyssalTrench,
  Biome.ResonanceField,
  Biome.CoralRuins,
];
function flatTerrain(): TerrainPayload {
  const cols = BIOMES.length + 1;
  return {
    cols,
    rows: 1,
    cellM: 250,
    biomes: [...BIOMES, Biome.OpenWater],
    floor: [...BIOMES.map(() => 900), 200],
    ceiling: [...BIOMES.map(() => 0), 3000],
  };
}

/** Bake a terrain's lit pixels, with no detail field: the fills and the step alone. */
function bakeLit(terrain: TerrainPayload, detail = false) {
  const surface = litGroundSurface(terrain, 1);
  shadeSeabed(
    terrain,
    seabedSeed(terrain),
    seabedRange(terrain),
    { col0: 0, row0: 0, col1: terrain.cols - 1, row1: terrain.rows - 1 },
    [],
    { detail, lit: surface.bake }
  );
  const width = terrain.cols * SEABED_PX_PER_CELL;
  const at = (col: number, row = 0) =>
    ((row * SEABED_PX_PER_CELL + SEABED_PX_PER_CELL / 2) * width +
      col * SEABED_PX_PER_CELL +
      SEABED_PX_PER_CELL / 2) *
    4;
  return { surface, at, width };
}

describe('the lit ground’s bake (#1801)', () => {
  it('lifts every fill and the stone by one gain, so their order holds', () => {
    // HIGH_GRAPHICS.GROUND: the palest fill reaches ALBEDO_LUMINANCE, and the
    // rest follow by the same gain, so the trench is still the darkest ground
    // and stone still sits under the palest fill (palette.ts `ROCK_FACE`).
    const palest = Math.max(...BIOMES.map((b) => hexLuminance(BIOME_COLOR[b])));
    assert.ok(Math.abs(palest * LIT_ALBEDO_GAIN - HIGH_GRAPHICS.GROUND.ALBEDO_LUMINANCE) < 1e-9);
    const { surface, at } = bakeLit(flatTerrain());
    const lit = (col: number) => {
      const i = at(col);
      return luminance(
        surface.bake.albedo[i]!,
        surface.bake.albedo[i + 1]!,
        surface.bake.albedo[i + 2]!
      );
    };
    BIOMES.forEach((biome, col) => {
      const want = hexLuminance(BIOME_COLOR[biome]) * LIT_ALBEDO_GAIN;
      assert.ok(
        Math.abs(lit(col) - want) < 0.012,
        `${Biome[biome]}: ${lit(col).toFixed(3)} for ${want.toFixed(3)}`
      );
    });
    const stone = lit(BIOMES.length);
    assert.ok(Math.abs(stone - hexLuminance(ROCK_FACE) * LIT_ALBEDO_GAIN) < 0.012);
    assert.ok(stone < Math.max(...BIOMES.map((_, col) => lit(col))), 'stone under the palest fill');
    assert.equal(
      Math.min(...BIOMES.map((_, col) => lit(col))),
      lit(BIOMES.indexOf(Biome.AbyssalTrench)),
      'the trench is the darkest ground'
    );
  });

  it('keeps each fill’s hue, with its chroma eased', () => {
    // Eased toward its own grey: the channels keep their order, which is the
    // hue, and stand nearer one another than the fill's own.
    const { surface, at } = bakeLit(flatTerrain());
    BIOMES.forEach((biome, col) => {
      const fill = BIOME_COLOR[biome];
      const from = [(fill >> 16) & 0xff, (fill >> 8) & 0xff, fill & 0xff].map(decode);
      const i = at(col);
      const to = [0, 1, 2].map((k) => decode(surface.bake.albedo[i + k]!));
      const order = (c: number[]) => [0, 1, 2].sort((a, b) => c[a]! - c[b]!).join('');
      assert.equal(order(to), order(from), `${Biome[biome]}: the channels keep their order`);
      const spread = (c: number[]) => (Math.max(...c) - Math.min(...c)) / Math.max(...c);
      assert.ok(spread(to) < spread(from), `${Biome[biome]}: its chroma is eased`);
    });
  });

  it('reads level ground as facing up, unshadowed', () => {
    const terrain: TerrainPayload = {
      cols: 3,
      rows: 3,
      cellM: 250,
      biomes: new Array(9).fill(Biome.OpenWater),
      floor: new Array(9).fill(900),
      ceiling: new Array(9).fill(0),
    };
    const { surface, at } = bakeLit(terrain);
    const i = at(1, 1);
    // 127.5 is level: either byte beside it.
    assert.ok(Math.abs(surface.bake.relief[i]! - 127.5) <= 0.5, 'no slope east');
    assert.ok(Math.abs(surface.bake.relief[i + 2]! - 127.5) <= 0.5, 'no slope south');
    assert.equal(surface.bake.relief[i + 1], 255, 'nothing stands over it');
  });

  it('turns ground that deepens eastward to face east, by the drawn slope', () => {
    // A ramp of 100 m a cell. World height is minus the depth at the drawn
    // scale, so the normal leans the way the ground falls, by
    // RELIEF_GAIN times the drawn slope.
    const cols = 5;
    const terrain: TerrainPayload = {
      cols,
      rows: 3,
      cellM: 250,
      biomes: new Array(cols * 3).fill(Biome.OpenWater),
      floor: Array.from({ length: cols * 3 }, (_, i) => 600 + 100 * (i % cols)),
      ceiling: new Array(cols * 3).fill(0),
    };
    const { surface, at } = bakeLit(terrain);
    const i = at(2, 1);
    const nx = (surface.bake.relief[i]! - 127.5) / 127.5;
    const nz = (surface.bake.relief[i + 2]! - 127.5) / 127.5;
    const slope = (HIGH_GRAPHICS.GROUND.RELIEF_GAIN * DEPTH_VISUAL_M_PER_M * 100) / 250;
    assert.ok(Math.abs(nx - slope / Math.hypot(slope, 1)) < 0.02, `east by ${nx.toFixed(3)}`);
    assert.ok(Math.abs(nz) < 0.02, 'and not north or south');
  });

  it('writes the same lit pixels whether a cell is baked whole or rebaked alone', () => {
    // The ground delta's promise (seabed.ts `shadeSeabed`), held for the lit
    // pixels too: a rebake of one cell leaves every byte a full bake wrote.
    const terrain = flatTerrain();
    const whole = bakeLit(terrain, true);
    const again = {
      albedo: whole.surface.bake.albedo.slice(),
      relief: whole.surface.bake.relief.slice(),
    };
    shadeSeabed(
      terrain,
      seabedSeed(terrain),
      seabedRange(terrain),
      { col0: 2, row0: 0, col1: 2, row1: 0 },
      [],
      { lit: whole.surface.bake }
    );
    assert.deepEqual(whole.surface.bake.albedo, again.albedo);
    assert.deepEqual(whole.surface.bake.relief, again.relief);
  });

  it('holds eight bytes a bake pixel, and a third more for its mips', () => {
    const terrain = flatTerrain();
    const { surface, width } = bakeLit(terrain);
    assert.equal(surface.bake.albedo.length, width * SEABED_PX_PER_CELL * 4);
    assert.equal(litGroundBytes(surface), Math.round((width * SEABED_PX_PER_CELL * 8 * 4) / 3));
    assert.equal(surface.albedo.flipY, false, 'row 0 is the north edge, as the skin’s is');
    assert.equal(surface.bake.heightPerDepthM, DEPTH_VISUAL_M_PER_M);
  });
});

describe('the lit ground’s material (#1801)', () => {
  const terrain = flatTerrain();
  const compile = (material: MeshBasicMaterial) => {
    const shader = { ...ShaderLib.basic, uniforms: {} as Record<string, unknown> };
    material.onBeforeCompile(shader as never, {} as never);
    return shader;
  };

  it('lights the albedo last, after the carrier and the veil it chains', () => {
    const surface = litGroundSurface(terrain, 1);
    const material = new MeshBasicMaterial({ map: surface.albedo });
    const cells = surveyCellTexture(terrain, surveyCellClasses(terrain));
    installSurveyInk(material, terrain, cells, null, 'carrier');
    installDisplayVeil(material);
    const pools = { value: surface.relief };
    installLitGround(material, surface.relief, pools);
    const shader = compile(material);
    assert.equal(shader.uniforms.uLitRelief !== undefined, true, 'the relief is bound');
    assert.equal(shader.uniforms.uLitPools, pools, 'and the pools, by the caller’s own uniform');
    assert.ok(shader.fragmentShader.includes(LIT_GROUND_GLSL));
    assert.ok(
      shader.fragmentShader.includes(
        'vec3 outgoingLight = echoesLitGround( diffuseColor.rgb, vMapUv, vLitWorldY );'
      ),
      'the unlit sum is replaced'
    );
    assert.equal(
      shader.fragmentShader.includes('vec3 outgoingLight = reflectedLight.indirectDiffuse;'),
      false
    );
    // The veil still drains the albedo, before the light reads it.
    assert.ok(
      shader.fragmentShader.indexOf('echoesDisplayVeil( diffuseColor.rgb') <
        shader.fragmentShader.indexOf('echoesLitGround( diffuseColor.rgb')
    );
    assert.ok(shader.vertexShader.includes('vLitWorldY = ( modelMatrix'));
    const key = material.customProgramCacheKey();
    assert.ok(key.startsWith('survey-ink-carrier'), key);
    assert.ok(key.endsWith(':lit-ground-4'), key);
  });

  it('lights the ground from the Lid’s glow: from above, from no quarter, dimmed by depth', () => {
    // art-direction.md limit 1: "No sun below the Lid ... Light from above is
    // the Lid's glow, from everywhere and nowhere in particular." So the
    // light reads the normal's height alone, and no direction is in it.
    assert.ok(LIT_IRRADIANCE_GLSL.includes('max( 0.0, normal.y )'));
    assert.ok(!LIT_IRRADIANCE_GLSL.includes('dot('), 'no light stands in a quarter');
    assert.ok(LIT_IRRADIANCE_GLSL.includes(`/ ${HIGH_GRAPHICS.LID.FALLOFF_M.toFixed(6)}`));
    assert.ok(LIT_IRRADIANCE_GLSL.includes(`/ ${DEPTH_VISUAL_M_PER_M.toFixed(6)}`));
    // The token is the colour of the rig's cold ambient, so the ground under
    // the Lid and the hulls in it stand in one colour of light
    // (style-neon-noir.md, `lid-glow`); its level is the ground's own.
    assert.equal(LID_GLOW, MODEL_LIGHTING.AMBIENT_COLOR);
    assert.ok(LIT_GROUND_GLSL.includes(LIT_IRRADIANCE_GLSL));
    // And what the world's own sources pool on the ground is added to it,
    // under the same occlusion: light from beside, which depth does not take.
    assert.ok(
      LIT_GROUND_GLSL.includes(
        'echoesLitIrradiance( normal, worldY ) + texture2D( uLitPools, uv ).rgb'
      )
    );
  });

  /**
   * What the composite shows of scene-referred light: its grade, three's
   * ACESFilmicToneMapping (two matrices and a fit), then sRGB, as bytes.
   */
  const shown = (light: number[]): number => {
    const { SLOPE, OFFSET, POWER, SATURATION } = HIGH_GRAPHICS.GRADE;
    const cdl = light.map((c, k) => Math.pow(Math.max(0, c * SLOPE[k]! + OFFSET[k]!), POWER[k]!));
    const luma = 0.2126 * cdl[0]! + 0.7152 * cdl[1]! + 0.0722 * cdl[2]!;
    const k = (HIGH_GRAPHICS.EXPOSURE * MODEL_LIGHTING.EXPOSURE) / 0.6;
    const [x, y, z] = cdl.map((c) => Math.max(0, luma + (c - luma) * SATURATION) * k);
    const fit = (v: number) =>
      (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
    const a = [
      fit(0.59719 * x! + 0.35458 * y! + 0.04823 * z!),
      fit(0.076 * x! + 0.90834 * y! + 0.01566 * z!),
      fit(0.0284 * x! + 0.13383 * y! + 0.83777 * z!),
    ];
    const srgb = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
    const [r, g, b] = [
      1.60475 * a[0]! - 0.53108 * a[1]! - 0.07367 * a[2]!,
      -0.10208 * a[0]! + 1.10813 * a[1]! - 0.00605 * a[2]!,
      -0.00327 * a[0]! - 0.07276 * a[1]! + 1.07602 * a[2]!,
    ].map((c) => Math.round(255 * srgb(Math.min(1, Math.max(0, c)))));
    return (r! << 16) | (g! << 8) | b!;
  };
  /** Every albedo the bake writes, at its mottle's top: the six fills and the stone. */
  const albedos = (): number[][] => {
    const { surface, at } = bakeLit(flatTerrain());
    return [...BIOMES.map((b) => BIOME_RELIEF[b].mottle), ROCK_RELIEF.mottle].map((mottle, col) =>
      [0, 1, 2].map((k) => decode(surface.bake.albedo[at(col) + k]!) * (1 + mottle / 2))
    );
  };
  /**
   * The brightest ground the Lid alone lights: every albedo, level and
   * unshadowed, at the Lid itself, where no water has taken any of its glow.
   */
  const brightestUnderLid = (): number[] => {
    const rgb = [(LID_GLOW >> 16) & 0xff, (LID_GLOW >> 8) & 0xff, LID_GLOW & 0xff].map(decode);
    return albedos().map((albedo) =>
      shown(albedo.map((a, k) => (a * rgb[k]! * HIGH_GRAPHICS.LID.IRRADIANCE) / Math.PI))
    );
  };

  it('adds a source’s pool to the Lid’s glow, with nothing holding the sum down', () => {
    // art-direction.md, "What is built at High": "A pool lifts the ground as
    // far as its light reaches: the ceiling that first held the lit ground
    // under the marks is gone, and the plates hold limit 6 instead"
    // (test/markPlates.test.ts).
    const sum = LIT_GROUND_GLSL.indexOf(
      'vec3 irradiance = echoesLitIrradiance( normal, worldY ) + texture2D( uLitPools, uv ).rgb;'
    );
    const out = LIT_GROUND_GLSL.indexOf('return albedo * irradiance * relief.g');
    assert.ok(sum > 0 && out > sum);
    assert.equal(
      LIT_GROUND_GLSL.slice(sum, out)
        .split('\n')
        .filter((line) => line.includes('irradiance')).length,
      1,
      'the sum is what the albedo takes'
    );
  });

  it('lights no ground a plate would change with the Lid’s glow alone', () => {
    // A mark's plate holds the world to the palest ground the ladder weighs
    // (markPlates.ts `PLATE_LEVEL`). The Lid's level is set so its brightest
    // ground is no paler than that, so a plate bites only where a source of
    // the world's stands, and a mark over open ground looks as it does at
    // Low. Not held needlessly dark either: within a quarter of it.
    const brightest = Math.max(...brightestUnderLid().map(encodedLuminance));
    assert.ok(
      brightest <= PLATE_LEVEL,
      `${(brightest * 100).toFixed(1)}% past ${(PLATE_LEVEL * 100).toFixed(1)}%`
    );
    assert.ok(brightest > 0.75 * PLATE_LEVEL, `only ${(brightest * 100).toFixed(1)}%`);
  });

  it('lights a roof from its own face, by the ground’s gain', () => {
    const material = new MeshBasicMaterial({ vertexColors: true });
    installDisplayVeil(material);
    installLitRoof(material, LIT_ALBEDO_GAIN);
    const shader = compile(material);
    assert.ok(shader.fragmentShader.includes('cross( dFdx( vLitWorld ), dFdy( vLitWorld ) )'));
    assert.ok(shader.fragmentShader.includes(LIT_ALBEDO_GAIN.toFixed(6)));
    assert.ok(material.customProgramCacheKey().endsWith(':lit-roof-1'));
  });

  it('fails loudly if three moves the unlit sum it replaces', () => {
    const material = new MeshBasicMaterial();
    const relief = litGroundSurface(terrain, 1).relief;
    installLitGround(material, relief, { value: relief });
    const shader = { ...ShaderLib.basic, uniforms: {}, fragmentShader: 'void main() {}' };
    assert.throws(() => material.onBeforeCompile(shader as never, {} as never), /unlit sum/);
  });
});
