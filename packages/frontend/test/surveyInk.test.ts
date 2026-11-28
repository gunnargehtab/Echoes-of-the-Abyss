/**
 * Survey ink — docs/map-visuals.md §4 — and the rung §5 holds it on.
 *
 * The shader itself needs a GL context and is reviewed by screenshot, per the
 * graphics-standards checklist. What these hold is everything the shader is
 * handed: that no line contours the floor, what a coastline compares, and the
 * ladder — that every ink stroke lifts the ground less than rung 5's quiet
 * rims and the unselected detection ring do, over the darkest and the palest
 * ground and in every palette.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MeshBasicMaterial, ShaderLib } from 'three';
import { Biome, TERRAIN_LIFT } from '@echoes/shared';
import { BIOME_COLOR, PALETTE_NAMES, PALETTES, ROCK_FACE, scaleRgb } from '../src/game/palette.ts';
import {
  encodedLuminance,
  furnitureFloorLift,
  strokeLift,
  unselectedRingLift,
} from '../src/game/ladder.ts';
import {
  installSurveyInk,
  patchSurveyCellClasses,
  ROCK_CLASS,
  SURVEY_ALPHA,
  SURVEY_INK_COLOR,
  SURVEY_WIDTH_PX,
  surveyCellClasses,
  surveyCellTexture,
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
/**
 * The palest pixel the ground draws: the palest fill, lifted by the whole
 * terrain cap (docs/art-direction.md "Reading the Sea Floor", #1103). Texture
 * averages to the fill, but a lit face may pass it, and a stroke lifts paler
 * ground less. The ladder's tightest pair sets the cap: tritanopia's
 * unselected ring falls under rung 5's floor once the fill is lifted by 0.19.
 */
const LIFTED_GROUND = scaleRgb(PALEST_GROUND, 1 + TERRAIN_LIFT.MAX);
/** And the darkest: a fully drained veil over the trench is black. */
const DARKEST_GROUND = 0x000000;

describe('survey ink lines', () => {
  const oneCell: TerrainPayload = {
    cols: 1,
    rows: 1,
    cellM: 250,
    biomes: [Biome.OpenWater],
    floor: [1000],
    ceiling: [0],
  };

  it('draws two kinds of line, both on the edges where the ground changes kind', () => {
    // §4 since #1988: coastlines and biome borders, and nothing between.
    assert.deepEqual(Object.keys(SURVEY_ALPHA).sort(), ['border', 'coast']);
    assert.deepEqual(Object.keys(SURVEY_WIDTH_PX).sort(), ['border', 'coast']);
  });

  it("draws no isobath: the ground's shader reads no floor (#1988)", () => {
    // The owner's call: no grey line contours the terrain's depth. Each
    // isobath was a distance to a depth level, taken off a floor the shader
    // read, so a shader that reads no floor can draw none, in any mode.
    for (const drawn of [false, true]) {
      for (const mode of ['ground', 'overlay', 'carrier'] as const) {
        const material = new MeshBasicMaterial();
        const cells = surveyCellTexture(oneCell, surveyCellClasses(oneCell));
        installSurveyInk(material, oneCell, cells, drawn, mode);
        const shader = { ...ShaderLib.basic, uniforms: {} as Record<string, unknown> };
        material.onBeforeCompile(shader as never, {} as never);
        const label = `${drawn ? 'drawn' : 'cells'} ${mode}`;
        assert.doesNotMatch(shader.vertexShader, /surveyFloor/i, label);
        assert.doesNotMatch(shader.fragmentShader, /surveyFloor|isobath|thermocline/i, label);
        assert.ok(!('uSurveyFloor' in shader.uniforms), label);
      }
    }
  });
});

describe('survey ink shader', () => {
  /**
   * The High graphics quality splits the ink from its ground
   * (docs/art-direction.md, "Two layers, two laws"): the tactical layer's
   * strokes are drawn over ground the lit world pass drew, and the lit ground
   * carries none. The Low quality's patch is the one every build drew.
   */
  describe('the modes (#1801)', () => {
    const terrain: TerrainPayload = {
      cols: 1,
      rows: 1,
      cellM: 250,
      biomes: [Biome.OpenWater],
      floor: [1000],
      ceiling: [0],
    };
    const compile = (mode?: 'ground' | 'overlay' | 'carrier') => {
      const material = new MeshBasicMaterial();
      const cells = surveyCellTexture(terrain, surveyCellClasses(terrain));
      if (mode === undefined) installSurveyInk(material, terrain, cells);
      else installSurveyInk(material, terrain, cells, false, mode);
      const shader = { ...ShaderLib.basic, uniforms: {} as Record<string, unknown> };
      material.onBeforeCompile(shader as never, {} as never);
      return { material, shader };
    };
    const MIX = 'surveyDecode( mix( surveyEncode( diffuseColor.rgb ), uSurveyInk, ink ) )';
    const STROKE = 'float ink = max( border';

    it('mixes the strokes into its own ground by default, as Low always has', () => {
      const byDefault = compile();
      const ground = compile('ground');
      assert.equal(byDefault.shader.fragmentShader, ground.shader.fragmentShader);
      assert.equal(byDefault.material.customProgramCacheKey(), 'survey-ink');
      assert.ok(ground.shader.fragmentShader.includes(MIX));
      assert.ok(!ground.shader.fragmentShader.includes('discard'));
      assert.ok(
        ground.shader.fragmentShader.includes('#include <fog_fragment>'),
        'fogged as ground'
      );
    });

    it('draws the same strokes alone as an overlay, swimming out by coverage', () => {
      const ground = compile('ground');
      const overlay = compile('overlay');
      assert.equal(overlay.material.customProgramCacheKey(), 'survey-ink-overlay');
      // The stroke's coverage is the ground mode's, to the character.
      const stroke = (source: string) =>
        source.slice(source.indexOf(STROKE), source.indexOf(';', source.indexOf(STROKE)) + 1);
      assert.ok(stroke(ground.shader.fragmentShader).includes('coast *'));
      assert.equal(stroke(overlay.shader.fragmentShader), stroke(ground.shader.fragmentShader));
      assert.ok(!overlay.shader.fragmentShader.includes(MIX), 'it has no ground to mix into');
      assert.ok(overlay.shader.fragmentShader.includes('if ( ink <= 0.0 ) discard;'));
      // The ink's own colour at the stroke's coverage: the canvas blends
      // encoded, which is the ground mode's mix.
      assert.ok(
        overlay.shader.fragmentShader.includes(
          'diffuseColor = vec4( surveyDecode( uSurveyInk ), ink );'
        )
      );
      // Mixed toward the water's colour, a far stroke would paint Low's water
      // over the lit world's: it fades by alpha instead.
      assert.ok(!overlay.shader.fragmentShader.includes('#include <fog_fragment>'));
      assert.ok(
        overlay.shader.fragmentShader.includes(
          'gl_FragColor.a *= exp( - fogDensity * fogDensity * vFogDepth * vFogDepth'
        )
      );
    });

    it('fades an overlay stroke by the water over the ground it lies on (#1891)', () => {
      // docs/map-visuals.md §4, rule 6: ink fades into the water like the
      // ground it lies on. At High the ground takes the column over it
      // (water.ts `waterColumnDensity`), so the overlay takes the same one,
      // off the fog chunk's own depth: the owner's call on 22 November 2026.
      const overlay = compile('overlay');
      const source = overlay.shader.fragmentShader;
      assert.ok(source.includes('uniform float uSurveyColumn;'));
      assert.ok(
        source.includes(
          'float surveyColumn = uSurveyColumn * max( 0.0, echoesWaterDepthM( vWaterWorldY ) );'
        )
      );
      assert.ok(source.includes('- surveyColumn * surveyColumn );'));
      // It only ever takes ink away, so the ladder's rung 4 stays under rung
      // 5 wherever it held: the exponent has no positive term.
      const fade = source.slice(source.indexOf('gl_FragColor.a *= exp('));
      assert.match(fade, /^gl_FragColor\.a \*= exp\( - [^+]*\);/);
      // 0 until a view writes one, which is every shipped map: no fade.
      const uniforms = overlay.shader.uniforms as { uSurveyColumn?: { value: number } };
      assert.equal(uniforms.uSurveyColumn?.value, 0);
      // Low's ink, and the lit ground's carrier, read none.
      for (const mode of ['ground', 'carrier'] as const) {
        assert.ok(!compile(mode).shader.fragmentShader.includes('uSurveyColumn'), mode);
      }
    });

    it('carries the varyings and the encode pair for a lit ground, and draws no stroke', () => {
      const carrier = compile('carrier');
      assert.equal(carrier.material.customProgramCacheKey(), 'survey-ink-carrier');
      assert.ok(!carrier.shader.fragmentShader.includes(STROKE));
      assert.ok(carrier.shader.fragmentShader.includes('vec3 surveyEncode( vec3 c )'));
      assert.ok(carrier.shader.vertexShader.includes('vSurveyXZ = ( modelMatrix'));
    });
  });

  /**
   * The free-water study's pass (docs/map-visuals.md §4, the study's clause):
   * coastlines on the zeros of the fields its heightfield carries, and every
   * other ground's pass unchanged.
   */
  describe("the study's pass", () => {
    const terrain: TerrainPayload = {
      cols: 2,
      rows: 1,
      cellM: 250,
      biomes: [Biome.KelpForest, Biome.CoralRuins],
      floor: [1000, 600],
      ceiling: [0, 0],
    };
    const compile = (drawn: boolean) => {
      const material = new MeshBasicMaterial();
      const cells = surveyCellTexture(terrain, surveyCellClasses(terrain));
      installSurveyInk(material, terrain, cells, drawn);
      const shader = { ...ShaderLib.basic, uniforms: {} as Record<string, unknown> };
      material.onBeforeCompile(shader as never, {} as never);
      return { material, shader };
    };

    it('draws its coasts on the fields its vertices carry, not the cell edges', () => {
      const { shader, material } = compile(true);
      for (const attribute of ['surveyCoast', 'surveyBiomeA', 'surveyBiomeB']) {
        assert.match(shader.vertexShader, new RegExp(`attribute \\w+ ${attribute};`));
      }
      assert.match(shader.fragmentShader, /surveyFieldPx\( vSurveyCoast/);
      // A triangle whose vertices all lie on a coast reads no line, not a
      // triangle of ink (the cut's held corners).
      assert.match(shader.fragmentShader, /coastSound \? surveyLine/);
      assert.match(shader.fragmentShader, /water && surveyFieldSound\( borderGrad/);
      assert.doesNotMatch(shader.fragmentShader, /surveyEdge\( here/);
      assert.equal(material.customProgramCacheKey(), 'survey-ink-drawn');
    });

    it('leaves every other ground drawing its coasts on the cell edges', () => {
      const { shader, material } = compile(false);
      assert.match(shader.fragmentShader, /surveyEdge\( here/);
      assert.doesNotMatch(shader.fragmentShader, /vSurveyCoast/);
      assert.doesNotMatch(shader.vertexShader, /surveyCoast/);
      assert.equal(material.customProgramCacheKey(), 'survey-ink');
    });
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
      for (const ground of [DARKEST_GROUND, PALEST_GROUND, LIFTED_GROUND]) {
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
      for (const ground of [DARKEST_GROUND, PALEST_GROUND, LIFTED_GROUND]) {
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

  it('ranks the ink within its rung: borders, then rock', () => {
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

describe('survey ink over lifted ground (#1103)', () => {
  it('lifts the palest pixel the ground draws more than a lit face lifted it', () => {
    // docs/art-direction.md "Reading the Sea Floor": texture sits under the
    // quietest line of ink, so a coastline still reads across a lit dune.
    const faceLift = encodedLuminance(LIFTED_GROUND) - encodedLuminance(PALEST_GROUND);
    for (const [kind, alpha] of Object.entries(SURVEY_ALPHA)) {
      const inkLift = strokeLift(SURVEY_INK_COLOR, alpha, LIFTED_GROUND);
      assert.ok(faceLift < inkLift, `${kind}: a lit face lifts ${faceLift}, the ink ${inkLift}`);
    }
  });
});
