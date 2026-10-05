/**
 * Silt detail — docs/art-direction.md "Silt detail and seated stones — SPEC" (#1083).
 *
 * What a GPU-less runner can hold: the switch, the table's bound against the
 * hillshade, the doc's table against the constants, each term's centre against
 * the mean it promises (#1103), the per-cell texture and its ground-delta
 * locality, and the shader text's order, cap and hash. Whether it
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
import { Biome, SEABED_DETAIL, TERRAIN_LIFT } from '@echoes/shared';
import {
  DETAIL_LIFT,
  detailStrengths,
  DUNE_LIT_SCALE,
  GRAIN_MEAN,
  groundDetailCells,
  groundDetailTexture,
  groundNoisePixels,
  groundNoiseTexture,
  installGroundDetail,
  NOISE_SIZE,
  patchGroundDetailCells,
  RIPPLE_MEAN,
  SCOUR_MEAN,
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

describe('the silt detail switch', () => {
  it('draws in every match, and only a development build can take it out', () => {
    assert.equal(seabedDetailEnabled(false, ''), true);
    assert.equal(seabedDetailEnabled(true, ''), true);
    assert.equal(seabedDetailEnabled(true, '?seabed-detail=1'), true);
    assert.equal(seabedDetailEnabled(true, '?dream-loop=1'), true);
    assert.equal(seabedDetailEnabled(true, '?map=ventfront-divide&seabed-detail=0'), false);
    // No shipped build can turn it off.
    assert.equal(seabedDetailEnabled(false, '?seabed-detail=0'), true);
  });
});

describe('the strength table', () => {
  it('never lets the detail out-shade an authored step', () => {
    // Every term is signed in [-1, 1], so a pixel loses at most its row's
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

  it('prints every SPEC number the constants hold', () => {
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
      `a ${d.NOISE_SIZE} × ${d.NOISE_SIZE} lattice`,
      ...ENVIRONMENT_PROPS.filter((spec) => (spec.buryFraction ?? 0) > 0).map(
        (spec) => `\`${spec.slug}\` ${spec.buryFraction} (`
      ),
    ];
    for (const phrase of phrases) {
      assert.ok(prose.includes(phrase), `the SPEC no longer says "${phrase}"`);
    }
  });
});

/** The shader's dune slope over one cycle, `gSlope`, at t in [0, 1). */
function duneSlope(t: number): number {
  const lee = SEABED_DETAIL.DUNE_LEE;
  const stoss = 1 - lee;
  if (t >= stoss) {
    const fall = (t - stoss) / lee;
    return (-6 * fall * (1 - fall)) / lee;
  }
  const rise = t / stoss;
  return (6 * rise * (1 - rise)) / stoss;
}

/** One lattice channel read as the shader's `groundNoise` reads it. */
function latticeNoise(pixels: Uint8Array, channel: number) {
  const at = (x: number, y: number) => {
    const ix = ((x % NOISE_SIZE) + NOISE_SIZE) % NOISE_SIZE;
    const iy = ((y % NOISE_SIZE) + NOISE_SIZE) % NOISE_SIZE;
    return pixels[(iy * NOISE_SIZE + ix) * 4 + channel]! / 255;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const tx = smooth(x - ix);
    const ty = smooth(y - iy);
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx;
    const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}

describe('the centred terms (#1103)', () => {
  const d = SEABED_DETAIL;
  const pixels = groundNoisePixels();

  it('leaves the bake and the detail together inside the terrain cap', () => {
    assert.ok((1 + TERRAIN_LIFT.BAKE) * (1 + DETAIL_LIFT) <= 1 + TERRAIN_LIFT.MAX + 1e-12);
    assert.ok(DETAIL_LIFT > 0 && TERRAIN_LIFT.BAKE > 0, 'each pass keeps a share of the lift');
  });

  it('keeps every dune cycle at or under the fill, at every heading the meander gives it', () => {
    // The term is DUNE_CONTRAST * patch * slope * (cycle gradient . light) *
    // leeNorm. The meander's gradient is clamped at 3 / MEANDER_FINE_M, so the
    // heading and patch fold into one scale a in [-A, A].
    const leeNorm = (d.DUNE_M * d.DUNE_LEE) / 1.5;
    const A = d.DUNE_CONTRAST * (1 / d.DUNE_M + 3 / d.MEANDER_FINE_M) * leeNorm;
    const n = 512;
    const cycleMean = (a: number, k: number) => {
      let total = 0;
      for (let i = 0; i < n; i++) {
        const x = Math.max(-1, Math.min(1, a * duneSlope((i + 0.5) / n)));
        total += x < 0 ? k * x : x;
      }
      return total / n;
    };
    const worst = (k: number) => {
      let least = Infinity;
      for (let j = 0; j <= 400; j++) least = Math.min(least, cycleMean(-A + (2 * A * j) / 400, k));
      return least;
    };
    assert.ok(worst(DUNE_LIT_SCALE) >= 0, `a dune cycle averages bright: ${worst(DUNE_LIT_SCALE)}`);
    // And no darker than it has to be: the scale is the most the bound allows.
    assert.ok(worst(DUNE_LIT_SCALE + 0.01) < 0, 'DUNE_LIT_SCALE leaves lift on the table');
  });

  it('centres a ripple over its own cycle', () => {
    const lee = d.RIPPLE_LEE;
    const n = 100000;
    let total = 0;
    for (let i = 0; i < n; i++) {
      const r = (i + 0.5) / n;
      total += (r >= 1 - lee ? Math.sin((Math.PI * (r - (1 - lee))) / lee) : 0) - RIPPLE_MEAN;
    }
    assert.ok(Math.abs(total / n) < 1e-6, `a ripple averages ${total / n}`);
  });

  it('centres the scours on the lattice share of hollow, rounded toward dark', () => {
    const red = latticeNoise(pixels, 0);
    const green = latticeNoise(pixels, 1);
    const smoothstep = (x: number) => {
      const t = Math.max(0, Math.min(1, (x - 0.52) / (0.78 - 0.52)));
      return t * t * (3 - 2 * t);
    };
    const m = 512;
    let total = 0;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        const u = ((i + 0.37) * NOISE_SIZE) / m;
        const v = ((j + 0.61) * NOISE_SIZE) / m;
        total += smoothstep(0.65 * red(u, v) + 0.35 * green(u * 2.3 + 11, v * 2.3 + 11));
      }
    }
    const mean = total / (m * m);
    assert.ok(mean >= SCOUR_MEAN, `SCOUR_MEAN ${SCOUR_MEAN} is past the mean ${mean}`);
    assert.ok(mean - SCOUR_MEAN < 0.005, `SCOUR_MEAN ${SCOUR_MEAN} is far under ${mean}`);
  });

  it("centres the grain on the lattice's mean byte, rounded toward dark", () => {
    // Value noise over a whole lattice period averages its lattice points.
    for (const [k, channel] of [
      [0, 2],
      [1, 3],
    ] as const) {
      let total = 0;
      for (let i = 0; i < NOISE_SIZE * NOISE_SIZE; i++) total += pixels[i * 4 + channel]! / 255;
      const mean = total / (NOISE_SIZE * NOISE_SIZE);
      assert.ok(mean >= GRAIN_MEAN[k], `GRAIN_MEAN[${k}] is past the mean ${mean}`);
      assert.ok(mean - GRAIN_MEAN[k] < 0.002, `GRAIN_MEAN[${k}] is far under ${mean}`);
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
    assert.equal(material.customProgramCacheKey(), 'survey-ink:seabed-detail-3');
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

  it('moves all three channels by one gain, capped, and fades with distance', () => {
    // The clamp is the structural half of the dark bound: no term past 1 either
    // way. The min is the lift's cap.
    assert.match(
      fragment,
      /vec4 gTerms = clamp\(vec4\(gDune, gRipple, gScour, gGrain\), -1\.0, 1\.0\);/
    );
    const cap = fragment.match(
      /float gGain = min\(1\.0 - gFade \* dot\(gStrength, gTerms\), ([0-9.]+)\);/
    );
    assert.ok(cap !== null, 'the gain has lost its cap');
    assert.ok(Math.abs(Number(cap[1]) - (1 + DETAIL_LIFT)) < 1e-12, `the cap is ${cap[1]}`);
    // Scaled in encoded space, as the bake scales its bytes: RELIEF_DEPTH's units.
    assert.match(fragment, /surveyDecode\(surveyEncode\(diffuseColor\.rgb\) \* gGain\)/);
    const [near, far] = SEABED_DETAIL.FADE_M_PER_PX;
    assert.match(fragment, new RegExp(`smoothstep\\(${near}\\.0, ${far}\\.0, gMpp\\)`));
    for (const term of ['gDune', 'gRipple', 'gScour', 'gGrain']) {
      assert.match(fragment, new RegExp(`float ${term} =`), `${term} is never computed`);
    }
    assert.match(fragment, /float gDune = clamp\(/, 'the dune term must stay in [-1, 1]');
    assert.ok(
      fragment.includes(`gDune = gDune < 0.0 ? ${DUNE_LIT_SCALE} * gDune : gDune;`),
      "the dune's lit side has lost its scale"
    );
    const flat = fragment.replace(/\s+/g, ' ');
    for (const centre of [RIPPLE_MEAN, SCOUR_MEAN, ...GRAIN_MEAN]) {
      assert.ok(flat.includes(`- ${centre}`), `the centre ${centre} is not subtracted`);
    }
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
