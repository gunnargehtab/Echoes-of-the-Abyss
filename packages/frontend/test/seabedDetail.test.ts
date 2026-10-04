/**
 * Silt detail — docs/art-direction.md "Silt detail and seated stones — SPEC" (#1083).
 *
 * What a GPU-less runner can hold: the opt-in, the table's bound against the
 * hillshade, the doc's table against the constants, the per-cell texture and
 * its ground-delta locality, and the shader text's order and hash. Whether it
 * compiles and how it looks are the run-game frames in
 * docs/screenshots/issue-1083/.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  LinearFilter,
  MeshBasicMaterial,
  NoColorSpace,
  RGBAFormat,
  ShaderLib,
  UnsignedByteType,
} from 'three';
import { Biome, SEABED_DETAIL } from '@echoes/shared';
import {
  detailStrengths,
  groundDetailCells,
  groundDetailTexture,
  installGroundDetail,
  patchGroundDetailCells,
  seabedDetailEnabled,
  STRENGTH_SCALE,
} from '../src/game/seabedDetail.ts';
import { RELIEF_DEPTH } from '../src/game/palette.ts';
import { installSurveyInk, surveyCellClasses, surveyCellTexture } from '../src/game/surveyInk.ts';
import type { TerrainPayload } from '../src/net/GameClient.ts';

const ROWS = [...Object.values(SEABED_DETAIL.STRENGTH), SEABED_DETAIL.ROCK_STRENGTH];
const sum = (row: readonly number[]) => row.reduce((a, b) => a + b, 0);

/** A 6×5 map with every biome, and rock. */
function demoTerrain(): TerrainPayload {
  const cols = 6;
  const rows = 5;
  const biomes = Array.from({ length: cols * rows }, (_, i) => i % 6) as Biome[];
  const floor = new Array(cols * rows).fill(1800);
  const ceiling = new Array(cols * rows).fill(0);
  ceiling[15] = 3000; // rock
  return { cols, rows, cellM: 250, biomes, floor, ceiling };
}

function compile(material: MeshBasicMaterial) {
  const shader = { ...ShaderLib.basic, uniforms: {} as Record<string, unknown> };
  material.onBeforeCompile(shader as never, {} as never);
  return shader;
}

describe('the silt detail opt-in', () => {
  it('runs only in a development build, behind its own flag or the dream loop', () => {
    assert.equal(seabedDetailEnabled(true, '?seabed-detail=1'), true);
    assert.equal(seabedDetailEnabled(true, '?dream-loop=1'), true);
    assert.equal(seabedDetailEnabled(true, '?seabed-detail=0'), false);
    assert.equal(seabedDetailEnabled(true, ''), false);
    assert.equal(seabedDetailEnabled(false, '?seabed-detail=1'), false);
    assert.equal(seabedDetailEnabled(false, '?dream-loop=1'), false);
  });
});

describe('the strength table', () => {
  it('never lets the detail out-shade an authored step', () => {
    // Every term is a fraction in [0, 1], so a pixel loses at most its row's
    // sum. Half the hillshade's darkest shadow is the most it may lose.
    for (const row of ROWS) {
      for (const strength of row) assert.ok(strength >= 0, `negative strength in ${row}`);
      assert.ok(
        sum(row) <= RELIEF_DEPTH / 2 + 1e-9,
        `${row} darkens by ${sum(row)}, past half the hillshade's ${RELIEF_DEPTH}`
      );
    }
  });

  it('reads the water: silt drifts where the current runs, not on vents, rock or in the trench', () => {
    const s = SEABED_DETAIL.STRENGTH;
    for (const row of ROWS)
      assert.ok(s[Biome.OpenWater][0] >= row[0], 'open water carries the most dunes');
    assert.deepEqual(s[Biome.ThermalVein].slice(0, 2), [0, 0], 'basalt has no silt to drift');
    assert.deepEqual(SEABED_DETAIL.ROCK_STRENGTH.slice(0, 2), [0, 0], 'rock admits no water');
    assert.equal(s[Biome.AbyssalTrench][1], 0, 'the trench is still water: no ripples');
    assert.ok(s[Biome.KelpForest][0] < s[Biome.OpenWater][0], 'kelp baffles the current');
  });

  it('is the table the SPEC section prints', () => {
    const doc = readFileSync(new URL('../../../docs/art-direction.md', import.meta.url), 'utf8');
    const section = doc.slice(doc.indexOf('#### Silt detail and seated stones'));
    const names: Record<string, readonly number[]> = {
      'Open Water': SEABED_DETAIL.STRENGTH[Biome.OpenWater],
      'Kelp Forest': SEABED_DETAIL.STRENGTH[Biome.KelpForest],
      'Thermal Vein': SEABED_DETAIL.STRENGTH[Biome.ThermalVein],
      'Abyssal Trench': SEABED_DETAIL.STRENGTH[Biome.AbyssalTrench],
      'Resonance Field': SEABED_DETAIL.STRENGTH[Biome.ResonanceField],
      'Coral Ruins': SEABED_DETAIL.STRENGTH[Biome.CoralRuins],
      Rock: SEABED_DETAIL.ROCK_STRENGTH,
    };
    for (const [name, row] of Object.entries(names)) {
      const line = section.split('\n').find((l) => l.startsWith(`| ${name} |`));
      assert.ok(line !== undefined, `the SPEC table has no ${name} row`);
      const cells = line
        .split('|')
        .slice(2, 7)
        .map((c) => Number(c.trim()));
      assert.deepEqual(cells.slice(0, 4), [...row], `${name}: doc and constants disagree`);
      assert.ok(Math.abs(cells[4]! - sum(row)) < 1e-9, `${name}: the doc's sum is wrong`);
    }
    assert.match(section, new RegExp(`whole through ${SEABED_DETAIL.FADE_M_PER_PX[0]} m a pixel`));
    assert.match(section, new RegExp(`gone by ${SEABED_DETAIL.FADE_M_PER_PX[1]}`));
  });
});

describe('the per-cell strengths', () => {
  it('stores each cell its own row, rock as rock, never above the table', () => {
    const terrain = demoTerrain();
    const cells = groundDetailCells(terrain);
    assert.equal(cells.length, terrain.cols * terrain.rows * 4);
    for (let i = 0; i < terrain.cols * terrain.rows; i++) {
      const row = detailStrengths(terrain, i);
      assert.deepEqual(
        row,
        i === 15 ? SEABED_DETAIL.ROCK_STRENGTH : SEABED_DETAIL.STRENGTH[terrain.biomes[i] as Biome]
      );
      const stored = [0, 1, 2, 3].map((k) => (cells[i * 4 + k]! / 255) * STRENGTH_SCALE);
      for (let k = 0; k < 4; k++) {
        assert.ok(stored[k]! <= row[k]! + 1e-12, `cell ${i} stores more than its strength`);
        assert.ok(row[k]! - stored[k]! < STRENGTH_SCALE / 255, `cell ${i} lost a step`);
      }
      assert.ok(sum(stored) <= RELIEF_DEPTH / 2 + 1e-9);
    }
  });

  it('patches a ground delta exactly as a rebuild would, and touches nothing else', () => {
    const terrain = demoTerrain();
    const cells = groundDetailCells(terrain);
    const before = cells.slice();
    const changed = demoTerrain();
    changed.ceiling[8] = 3000; // a span collapses into rock
    changed.biomes[9] = Biome.ThermalVein;
    patchGroundDetailCells(cells, changed, { col0: 2, row0: 1, col1: 3, row1: 1 });
    assert.deepEqual(cells, groundDetailCells(changed));
    for (let i = 0; i < terrain.cols * terrain.rows; i++) {
      if (i === 8 || i === 9) continue;
      assert.deepEqual(cells.subarray(i * 4, i * 4 + 4), before.subarray(i * 4, i * 4 + 4));
    }
  });

  it('is linear data the GPU blends between cell centres, with no mipmaps', () => {
    const terrain = demoTerrain();
    const texture = groundDetailTexture(terrain, groundDetailCells(terrain));
    assert.equal(texture.image.width, terrain.cols);
    assert.equal(texture.image.height, terrain.rows);
    assert.equal(texture.format, RGBAFormat);
    assert.equal(texture.type, UnsignedByteType);
    assert.equal(texture.magFilter, LinearFilter);
    assert.equal(texture.minFilter, LinearFilter);
    assert.equal(texture.generateMipmaps, false);
    assert.equal(texture.colorSpace, NoColorSpace);
    assert.equal(texture.flipY, false);
    texture.dispose();
  });
});

describe('the silt detail shader', () => {
  const terrain = demoTerrain();
  const material = new MeshBasicMaterial({ vertexColors: true });
  const surveyCells = surveyCellTexture(terrain, surveyCellClasses(terrain));
  installSurveyInk(material, terrain, surveyCells);
  const texture = groundDetailTexture(terrain, groundDetailCells(terrain));
  installGroundDetail(material, terrain, texture);
  const shader = compile(material);
  const fragment = shader.fragmentShader;

  it('chains the survey ink, keeps its cells, and keys itself apart', () => {
    assert.equal(material.customProgramCacheKey(), 'survey-ink:seabed-detail-1');
    assert.equal((shader.uniforms.uSurveyCells as { value: unknown }).value, surveyCells);
    assert.equal((shader.uniforms.uGroundDetail as { value: unknown }).value, texture);
    assert.deepEqual((shader.uniforms.uGroundDetailSize as { value: unknown }).value, [1500, 1250]);
  });

  it('shades after the bake and the veil, before the ink and the fog', () => {
    const colour = fragment.indexOf('#include <color_fragment>');
    const detail = fragment.indexOf('diffuseColor.rgb *= 1.0 - gFade');
    const ink = fragment.indexOf('diffuseColor.rgb = surveyDecode');
    const fog = fragment.indexOf('#include <fog_fragment>');
    assert.ok(colour > 0 && detail > colour, 'the detail must follow the bake and vertex colour');
    assert.ok(ink > detail, 'the ink must be drawn over the detail');
    assert.ok(fog > ink, 'the fog must still fade both');
  });

  it('darkens only, by one gain on all three channels, and fades with distance', () => {
    assert.match(fragment, /diffuseColor\.rgb \*= 1\.0 - gFade \* dot\(gStrength, vec4\(/);
    const [near, far] = SEABED_DETAIL.FADE_M_PER_PX;
    assert.match(fragment, new RegExp(`smoothstep\\(${near}\\.0, ${far}\\.0, gMpp\\)`));
    for (const term of ['gDune', 'gRipple', 'gScour', 'gGrain']) {
      assert.match(fragment, new RegExp(`float ${term} =`), `${term} is never computed`);
    }
    assert.match(fragment, /float gDune = clamp\(/, 'the dune term must stay in [0, 1]');
  });

  it('hashes with integers, never a sine, and takes derivatives before any branch', () => {
    const main = fragment.slice(fragment.indexOf('vec2 gp = vSurveyXZ;'));
    assert.doesNotMatch(
      main.slice(0, main.indexOf('diffuseColor.rgb *= 1.0 - gFade')),
      /\bsin\(dot/
    );
    assert.match(fragment, /uint groundHash\(uvec2 v\)/);
    assert.doesNotMatch(fragment, /fract\(sin\(dot\(p/);
    const derivative = main.indexOf('dFdx(gp)');
    const branch = main.search(/\?|\bif\b/);
    assert.ok(
      derivative > 0 && derivative < branch,
      'derivatives in non-uniform flow are undefined'
    );
  });

  it('leaves the material unlit and its other hooks in place', () => {
    assert.equal(material.type, 'MeshBasicMaterial');
    assert.match(shader.vertexShader, /vSurveyXZ = /);
    assert.match(shader.vertexShader, /#include <color_vertex>/);
  });
});
