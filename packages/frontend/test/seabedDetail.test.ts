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
  RepeatWrapping,
  RGBAFormat,
  ShaderLib,
  UnsignedByteType,
} from 'three';
import { Biome, SEABED_DETAIL } from '@echoes/shared';
import {
  detailStrengths,
  groundDetailCells,
  groundDetailTexture,
  groundNoisePixels,
  groundNoiseTexture,
  installGroundDetail,
  NOISE_SIZE,
  patchGroundDetailCells,
  seabedDetailEnabled,
  STRENGTH_SCALE,
} from '../src/game/seabedDetail.ts';
import { RELIEF_DEPTH } from '../src/game/palette.ts';
import { ENVIRONMENT_PROPS } from '../src/game/environment.ts';
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
    // sum. The darkest it may leave is still lighter than a full-strength
    // authored face, 1 - RELIEF_DEPTH, in the same encoded units.
    assert.ok(1 - SEABED_DETAIL.MAX_SUM > 1 - RELIEF_DEPTH, 'MAX_SUM reaches a full face');
    for (const row of ROWS) {
      for (const strength of row) {
        assert.ok(strength >= 0, `negative strength in ${row}`);
        assert.ok(strength <= STRENGTH_SCALE, `${strength} is past what a texel can store`);
      }
      assert.ok(
        sum(row) <= SEABED_DETAIL.MAX_SUM + 1e-9,
        `${row} darkens by ${sum(row)}, past ${SEABED_DETAIL.MAX_SUM}`
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

  it('prints every SPEC number the constants hold, and no other', () => {
    // The prose wraps, so read it as one line. A number moved in one place and
    // not the other fails here, which is what makes it SPEC rather than TUNABLE.
    const doc = readFileSync(new URL('../../../docs/art-direction.md', import.meta.url), 'utf8');
    const start = doc.indexOf('#### Silt detail and seated stones');
    const prose = doc
      .slice(start, doc.indexOf('### Reading the Water', start))
      .replace(/\s+/g, ' ');
    const d = SEABED_DETAIL;
    assert.equal(d.PATCH_FLOOR, 0.25, 'the prose says a quarter');
    const phrases = [
      `No row may exceed **${d.MAX_SUM.toFixed(2)}**`,
      `crests ${d.DUNE_M} m apart`,
      `meandering over ${d.MEANDER_M} m`,
      `the south ${d.DUNE_LEE * 100} % of each dune`,
      `the meander's ${d.MEANDER_M} m lattice`,
      'down to a quarter of their strength',
      `lie ${d.RIPPLE_M} m apart`,
      `spans ${d.RIPPLE_PX[1]} pixels and is gone at ${d.RIPPLE_PX[0]}`,
      `on a ${d.SCOUR_M} m field`,
      `${d.SCOUR_STRETCH} times longer north–south`,
      `runs at ${d.GRAIN_M} m and ${d.GRAIN_FINE_M} m`,
      `whole from ${d.GRAIN_PX[1]} pixels and gone at ${d.GRAIN_PX[0]}`,
      `darkens to ${d.STONE_SCOUR_GAIN} at and under the stone`,
      `recovers by ${d.STONE_SCOUR_REACH} radii`,
      `runs ${d.STONE_SCOUR_LEE} times further on the lee`,
      ...ENVIRONMENT_PROPS.filter((spec) => (spec.buryFraction ?? 0) > 0).map(
        (spec) => `\`${spec.slug}\` ${spec.buryFraction} (`
      ),
    ];
    for (const phrase of phrases) {
      assert.ok(prose.includes(phrase), `the SPEC no longer says "${phrase}"`);
    }
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
      assert.ok(sum(stored) <= SEABED_DETAIL.MAX_SUM + 1e-9);
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

describe('the noise lattice', () => {
  it('is four independent channels of the same bytes on every client', () => {
    const a = groundNoisePixels();
    const b = groundNoisePixels();
    assert.deepEqual(a, b);
    assert.equal(a.length, NOISE_SIZE * NOISE_SIZE * 4);
    // Independent channels: no two correlate, and each spans the byte.
    const n = NOISE_SIZE * NOISE_SIZE;
    const mean = [0, 1, 2, 3].map((c) => {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += a[i * 4 + c]!;
      return sum / n;
    });
    for (let c = 0; c < 4; c++) assert.ok(Math.abs(mean[c]! - 127.5) < 4, `channel ${c} is biased`);
    for (let c = 0; c < 4; c++) {
      for (let d = c + 1; d < 4; d++) {
        let cov = 0;
        let vc = 0;
        let vd = 0;
        for (let i = 0; i < n; i++) {
          const x = a[i * 4 + c]! - mean[c]!;
          const y = a[i * 4 + d]! - mean[d]!;
          cov += x * y;
          vc += x * x;
          vd += y * y;
        }
        assert.ok(Math.abs(cov / Math.sqrt(vc * vd)) < 0.05, `channels ${c} and ${d} correlate`);
      }
    }
  });

  it('is one page-lifetime texture: linear, repeating, no mipmaps', () => {
    const texture = groundNoiseTexture();
    assert.equal(groundNoiseTexture(), texture, 'one texture a page, never one a match');
    assert.equal(texture.image.width, NOISE_SIZE);
    assert.equal(texture.wrapS, RepeatWrapping);
    assert.equal(texture.wrapT, RepeatWrapping);
    assert.equal(texture.magFilter, LinearFilter);
    assert.equal(texture.minFilter, LinearFilter);
    assert.equal(texture.generateMipmaps, false);
    assert.equal(texture.colorSpace, NoColorSpace);
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
    assert.equal(material.customProgramCacheKey(), 'survey-ink:seabed-detail-2');
    assert.equal((shader.uniforms.uSurveyCells as { value: unknown }).value, surveyCells);
    assert.equal((shader.uniforms.uGroundDetail as { value: unknown }).value, texture);
    assert.deepEqual((shader.uniforms.uGroundDetailSize as { value: unknown }).value, [1500, 1250]);
    assert.equal((shader.uniforms.uGroundNoise as { value: unknown }).value, groundNoiseTexture());
  });

  it('shades after the bake and the veil, before the ink and the fog', () => {
    const colour = fragment.indexOf('#include <color_fragment>');
    const detail = fragment.indexOf(
      'diffuseColor.rgb = surveyDecode(surveyEncode(diffuseColor.rgb) * gGain)'
    );
    const ink = fragment.indexOf('diffuseColor.rgb = surveyDecode( mix(');
    const fog = fragment.indexOf('#include <fog_fragment>');
    assert.ok(colour > 0 && detail > colour, 'the detail must follow the bake and vertex colour');
    assert.ok(ink > detail, 'the ink must be drawn over the detail');
    assert.ok(fog > ink, 'the fog must still fade both');
  });

  it('darkens only, by one gain on all three channels, and fades with distance', () => {
    // The clamp is the structural half of the bound: no term past 1.
    assert.match(
      fragment,
      /vec4 gTerms = clamp\(vec4\(gDune, gRipple, gScour, gGrain\), 0\.0, 1\.0\);/
    );
    assert.match(fragment, /float gGain = 1\.0 - gFade \* dot\(gStrength, gTerms\);/);
    // Scaled in encoded space, as the bake scales its bytes: RELIEF_DEPTH's units.
    assert.match(fragment, /surveyDecode\(surveyEncode\(diffuseColor\.rgb\) \* gGain\)/);
    const [near, far] = SEABED_DETAIL.FADE_M_PER_PX;
    assert.match(fragment, new RegExp(`smoothstep\\(${near}\\.0, ${far}\\.0, gMpp\\)`));
    for (const term of ['gDune', 'gRipple', 'gScour', 'gGrain']) {
      assert.match(fragment, new RegExp(`float ${term} =`), `${term} is never computed`);
    }
    assert.match(
      fragment,
      /float gDune = 0\.5 \+ 0\.5 \* clamp\(/,
      'the dune term must stay in [0, 1]'
    );
  });

  it('hashes nothing, fetches seven times, and takes derivatives before any branch', () => {
    // The lattice is a texture of propHash bytes. A shader hash either loses
    // bits at map coordinates (a sine) or costs the named GPU a millisecond
    // (integer multiplies, the first cut), so neither may come back.
    const main = fragment.slice(fragment.indexOf('vec2 gp = vSurveyXZ;'));
    assert.doesNotMatch(fragment, /\buint\b|\buvec2\b|43758/);
    assert.doesNotMatch(main.slice(0, main.indexOf('float gGain')), /\bsin\(dot/);
    const detail = main.slice(0, main.indexOf('diffuseColor.rgb = surveyDecode'));
    const fetches = (detail.match(/texture2D\(|groundNoise\(/g) ?? []).length;
    assert.ok(fetches <= 7, `${fetches} fetches a fragment, past seven`);
    const branch = main.search(/\?|\bif\b/);
    for (const derivative of ['dFdx(gp)', 'dFdy(gp)', 'dFdx(gWarp)', 'dFdy(gWarp)']) {
      const at = main.indexOf(derivative);
      assert.ok(
        at > 0 && at < branch,
        `${derivative}: derivatives in non-uniform flow are undefined`
      );
    }
  });

  it('leaves the material unlit and its other hooks in place', () => {
    assert.equal(material.type, 'MeshBasicMaterial');
    assert.match(shader.vertexShader, /vSurveyXZ = /);
    assert.match(shader.vertexShader, /#include <color_vertex>/);
  });
});
