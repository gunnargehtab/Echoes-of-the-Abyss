/**
 * The arch study's normal-view refinement — docs/sorrowgate-arch-study.md §11,
 * "Permitted changes and their bounds" (#1683).
 *
 * What a GPU-less runner can hold: the landmark's diffuse ceiling, the
 * frame's roughness, the court bounce laid on the landmark's own stone and
 * nowhere else with its direction and its level, and the distance grade's
 * arithmetic and the shader text it lays after the fog, off the survey ink.
 * The flag is off in the runner, so the prologue's props carry no grade, which
 * is production unchanged. How it looks is the run-game evidence in
 * docs/screenshots/issue-1683/.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  Color,
  DataTexture,
  Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderChunk,
  ShaderLib,
  type Material,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_LIGHTING } from '@echoes/shared';
import { PUBLIC_LANDMARK_SPECS } from '../src/game/environment.ts';
import { buildLandmarkTemplate } from '../src/game/landmarkModels.ts';
import {
  BOUNCE_BELOW_DEG,
  LANDMARK_LUMINANCE_CEILING,
  RIB_ROUGHNESS,
} from '../src/game/landmarkLight.ts';
import {
  GRADE_MAX,
  GRADE_REACH_DOLLIES,
  gradeExtra,
  gradeUniforms,
  installDistanceGrade,
  readsDistanceGrade,
  setDistanceGrade,
} from '../src/game/distanceGrade.ts';
import { installWaterFog } from '../src/game/water.ts';
import { installSurveyInk } from '../src/game/surveyInk.ts';

const SPEC = PUBLIC_LANDMARK_SPECS[0]!;
const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);

async function parseArch(): Promise<Group> {
  const bytes = readFileSync(new URL(`${SPEC.slug}.glb`, MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return (await new GLTFLoader().parseAsync(buffer, '')).scene;
}

function luminance(color: Color): number {
  return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
}

/** A material's chained patches over three's own program text for `lib`. */
function compiled(material: Material, lib: 'standard' | 'basic') {
  const shader = {
    uniforms: {} as Record<string, unknown>,
    vertexShader: ShaderLib[lib].vertexShader,
    fragmentShader: ShaderLib[lib].fragmentShader,
  };
  material.onBeforeCompile(shader as never, null as never);
  return {
    vertex: shader.vertexShader,
    fragment: shader.fragmentShader,
    uniforms: shader.uniforms,
  };
}

describe('the landmark’s surface under the study (§11)', () => {
  it('lifts the brightest material to the 0.10 ceiling, keeps the ratios, and gives the frame its sheen', async () => {
    const study = buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate');
    const prop = buildLandmarkTemplate(await parseArch(), SPEC, 'standard');
    const byName = (t: typeof study) =>
      new Map(
        t.states.intact.parts.map(({ material }) => [
          material.name,
          material as MeshStandardMaterial,
        ])
      );
    const lifted = byName(study);
    const kept = byName(prop);
    const brightest = Math.max(...[...lifted.values()].map((m) => luminance(m.color)));
    assert.ok(Math.abs(brightest - LANDMARK_LUMINANCE_CEILING) < 1e-6, `${brightest}`);
    for (const [name, material] of lifted) {
      const before = kept.get(name)!;
      // The same hue and ratio: each channel scaled by the one gain.
      const gain = LANDMARK_LUMINANCE_CEILING / 0.06;
      for (const c of ['r', 'g', 'b'] as const) {
        assert.ok(Math.abs(material.color[c] - before.color[c] * gain) < 1e-6, `${name}.${c}`);
      }
      assert.equal(material.metalness, 0, `${name} metalness`);
      if (name === 'structure_rib') {
        assert.equal(material.roughness, RIB_ROUGHNESS);
        assert.ok(RIB_ROUGHNESS >= 0.55 && RIB_ROUGHNESS <= 0.7);
      } else if (name !== 'civic_lamp') {
        assert.ok(material.roughness >= 0.9 && material.roughness <= 1, `${name} stays matte`);
      }
    }
    // Off the prologue's look the prop ceiling holds.
    const propBrightest = Math.max(...[...kept.values()].map((m) => luminance(m.color)));
    assert.ok(Math.abs(propBrightest - 0.06) < 1e-6);
  });

  it('bounces the ambient off the court onto the stone alone, from the south and 30° below', async () => {
    const study = buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate');
    const ambient = new Color(MODEL_LIGHTING.AMBIENT_COLOR).multiplyScalar(MODEL_LIGHTING.AMBIENT);
    assert.ok(study.uniforms!.uBounce.value.equals(ambient), 'the ambient again, in its colour');
    const below = (BOUNCE_BELOW_DEG * Math.PI) / 180;
    const from = `vec3( 0.0, ${(-Math.sin(below)).toFixed(6)}, ${Math.cos(below).toFixed(6)} )`;
    for (const { material } of study.states.intact.parts) {
      const { fragment, uniforms } = compiled(material, 'standard');
      const bounced = fragment.includes('getAmbientLightIrradiance( uBounce )');
      assert.equal(bounced, material.name !== 'civic_lamp', `${material.name} bounce`);
      if (!bounced) continue;
      assert.ok(fragment.includes(from), `${material.name} from the south, below level`);
      assert.ok(
        fragment.includes('BRDF_Lambert( material.diffuseColor )'),
        'the ambient’s Lambert'
      );
      assert.equal(uniforms.uBounce, study.uniforms!.uBounce);
    }
    // The board's still copy takes none, nor a prop's material.
    const still = buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate', { still: true });
    for (const { material } of still.states.intact.parts) {
      assert.ok(!compiled(material, 'standard').fragment.includes('uBounce'), material.name);
    }
    assert.ok(!compiled(new MeshStandardMaterial(), 'standard').fragment.includes('uBounce'));
  });
});

describe('the distance grade (§11)', () => {
  it('adds up to 0.35 linearly over 0.58 of the dolly past the focus, times the water setting', () => {
    assert.equal(GRADE_MAX, 0.35);
    assert.equal(GRADE_REACH_DOLLIES, 0.58);
    // The opening: a 2,600 m dolly, a reach of 1,508 m.
    assert.equal(gradeExtra(2600, 2600, 1), 0, 'nothing at the focus');
    assert.equal(gradeExtra(1000, 2600, 1), 0, 'nothing nearer');
    assert.ok(Math.abs(gradeExtra(2600 + 754, 2600, 1) - 0.175) < 1e-9, 'half way, half');
    assert.equal(gradeExtra(2600 + 1508, 2600, 1), 0.35);
    assert.equal(gradeExtra(20000, 2600, 1), 0.35, 'clamped');
    assert.equal(gradeExtra(20000, 2600, 0), 0, 'water 0 draws none');
    assert.ok(Math.abs(gradeExtra(20000, 2600, 0.5) - 0.175) < 1e-9);
    setDistanceGrade(650, 1);
    assert.equal(gradeUniforms.uGradeFocusM.value, 650);
    assert.ok(Math.abs(gradeUniforms.uGradeReachM.value - 377) < 1e-9, 'L’s 377 m');
    assert.equal(gradeUniforms.uGradeAmount.value, 0.35);
    setDistanceGrade(650, 0);
    assert.equal(gradeUniforms.uGradeAmount.value, 0);
  });

  it('mixes the rest of the way after the fog, off the survey ink, and on nothing it was not laid on', () => {
    installWaterFog();
    const ground = new MeshBasicMaterial();
    installSurveyInk(
      ground,
      { cols: 2, rows: 2, cellM: 100, floor: [0, 0, 0, 0] } as never,
      new DataTexture()
    );
    installDistanceGrade(ground);
    assert.ok(readsDistanceGrade(ground));
    const { vertex, fragment } = compiled(ground, 'basic');
    assert.ok(vertex.includes('vGradeRange = length( mvPosition.xyz );'));
    const fog = fragment.indexOf('#include <fog_fragment>');
    const grade = fragment.indexOf('min( gradeLeft, gradeExtra ) / gradeLeft');
    assert.ok(fog >= 0 && grade > fog, 'after the fog it extends');
    assert.ok(fragment.includes('gradeInk = ink;'), 'the ink’s weight is kept');
    assert.ok(fragment.includes('( 1.0 - gradeInk )'), 'and the grade takes only the ground');
    assert.ok(ShaderChunk.fog_fragment.includes('waterAtFragment'), 'the water it mixes toward');
    // Nothing else is graded: a hull's material, a lamp's, the landmark's.
    assert.ok(!readsDistanceGrade(new MeshStandardMaterial()));
  });
});
