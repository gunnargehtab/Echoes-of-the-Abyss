/**
 * The arch study's distance grade — docs/sorrowgate-arch-study.md §11,
 * "Permitted changes and their bounds"; docs/art-direction.md "Reading the
 * Water", the study's exception; docs/graphics-standards.md gate 6 (#1683).
 *
 * At L the arch's south face and the Descent's wall 447 m behind it face the
 * same way under the same ambient, with no grade between, so the wall reads
 * as the arch's own back. The owner licensed one study-only answer: public
 * ground beyond the focus fades further into the water it stands in.
 *
 * The measure is a fragment's range from the camera less the camera's
 * distance to its focus. The fog factor is production's plus `GRADE_MAX` ×
 * that excess over the reach, clamped to 0–`GRADE_MAX` extra and to 1 in all,
 * linear between, and the extra is multiplied by `waterDensity`, so 0 draws
 * none. The reach is `GRADE_REACH_DOLLIES` of the dolly, so it breathes with
 * the dolly as the falloff does. It mixes toward the same water the fog
 * already chose, the colour at the fragment's own depth, so it carries no
 * hue and the ramp does not move.
 *
 * Terrain and props alone take it: the mission's ground, its apron, and the
 * prop templates of the prologue's look, behind the study's flag. The
 * landmark, every hull, contact, glow, lamp, survey ink and the HUD do not,
 * since nothing installs it on them, so it still hides nothing but ground.
 */
import type { Material } from 'three';

/** SPEC — the most the grade adds to the fog factor (§11). */
export const GRADE_MAX = 0.35;
/** SPEC — the excess at which the grade is whole, in dollies: 1,500 m at the opening's 2,600 m (§11). */
export const GRADE_REACH_DOLLIES = 0.58;

/** The grade's uniforms, one set the view writes each frame and every graded material reads. */
export const gradeUniforms = {
  /** The camera's distance to its focus, world metres. */
  uGradeFocusM: { value: 0 },
  /** The excess past the focus at which the grade is whole, world metres. */
  uGradeReachM: { value: 1 },
  /** `GRADE_MAX` × the player's `waterDensity`; 0 draws none. */
  uGradeAmount: { value: 0 },
};

/** Settle the grade for this frame's dolly and water setting. */
export function setDistanceGrade(dollyM: number, waterDensity: number): void {
  gradeUniforms.uGradeFocusM.value = dollyM;
  gradeUniforms.uGradeReachM.value = Math.max(1, dollyM * GRADE_REACH_DOLLIES);
  gradeUniforms.uGradeAmount.value = GRADE_MAX * Math.min(1, Math.max(0, waterDensity));
}

/**
 * The extra a fragment at `rangeM` from the camera takes, before the clamp to
 * 1 in all: the shader's arithmetic, for the test that holds it to §11.
 */
export function gradeExtra(rangeM: number, dollyM: number, waterDensity: number): number {
  const reach = Math.max(1, dollyM * GRADE_REACH_DOLLIES);
  const over = Math.min(1, Math.max(0, (rangeM - dollyM) / reach));
  return GRADE_MAX * Math.min(1, Math.max(0, waterDensity)) * over;
}

const KEY = 'arch-distance-grade-1';
/** The line surveyInk.ts mixes its ink on, with `ink` its weight at the pixel. */
const SURVEY_INK_LINE = '  if ( ink > 0.0 ) {';

/**
 * Chain the grade onto a material that fogs. It lands after the fog chunk
 * (water.ts `installWaterFog`) has mixed toward the water by `fogFactor`, so
 * it mixes the rest of the way: by g, where f + g (1 − f) is f plus the
 * extra, clamped to 1, which is exactly production's mix at the summed factor.
 */
export function installDistanceGrade(material: Material): void {
  const before = material.onBeforeCompile;
  const previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.uniforms.uGradeFocusM = gradeUniforms.uGradeFocusM;
    shader.uniforms.uGradeReachM = gradeUniforms.uGradeReachM;
    shader.uniforms.uGradeAmount = gradeUniforms.uGradeAmount;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vGradeRange;')
      .replace(
        '#include <fog_vertex>',
        '#include <fog_vertex>\nvGradeRange = length( mvPosition.xyz );'
      );
    // Survey ink is drawn inside the ground's own fragment (surveyInk.ts),
    // before the fog, and the grade never reaches it: the ink's weight at
    // the pixel is kept, and the grade takes only the ground under it.
    const inked = shader.fragmentShader.includes(SURVEY_INK_LINE);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'void main() {\n\tfloat gradeInk = 0.0;')
      .replace(SURVEY_INK_LINE, `gradeInk = ink;\n${SURVEY_INK_LINE}`)
      .replace(
        '#include <common>',
        `#include <common>
uniform float uGradeFocusM;
uniform float uGradeReachM;
uniform float uGradeAmount;
varying float vGradeRange;`
      )
      .replace(
        '#include <fog_fragment>',
        `#include <fog_fragment>
#ifdef USE_FOG
{
	float gradeExtra = uGradeAmount * ( 1.0 - gradeInk ) * clamp( ( vGradeRange - uGradeFocusM ) / uGradeReachM, 0.0, 1.0 );
	float gradeLeft = 1.0 - fogFactor;
	if ( gradeLeft > 0.0 ) {
		gl_FragColor.rgb = mix( gl_FragColor.rgb, waterAtFragment, min( gradeLeft, gradeExtra ) / gradeLeft );
	}
}
#endif`
      );
    if (!inked && shader.fragmentShader.includes('uSurveyInk')) {
      throw new Error(
        'surveyInk.ts moved its ink line: the distance grade keeps off the ink by it'
      );
    }
  };
  material.customProgramCacheKey = () => `${previousKey}:${KEY}`;
  material.needsUpdate = true;
}

/** Whether `installDistanceGrade` patched this material, as the key says. */
export function readsDistanceGrade(material: Material): boolean {
  return material.customProgramCacheKey().includes(KEY);
}
