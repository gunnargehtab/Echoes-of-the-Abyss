/**
 * The acoustic veil on the mission's own ground, applied in display space
 * (docs/ui-ux.md §4.5, #1536).
 *
 * `veilShade` (acousticVeil.ts) speaks in display terms, and the exterior's
 * floor is multiplied there already (worldBorder.ts `borderFadeFragment`,
 * #1532). The interior used to convert the shade to linear and multiply the
 * vertex colour by it. The biome fills sit in the sRGB curve's toe, where a
 * linear multiply lands near the linear factor in display: the floor's 0.30
 * red drew as about 0.07, and unheard ground read as a blackout rather than
 * a drain.
 *
 * So the shade rides its own attribute, in display terms, and the fragment's
 * colour is encoded, multiplied and decoded where the vertex colour used to
 * land, inside `<color_fragment>`. Not after `<colorspace_fragment>`, where
 * the exterior's is: the survey ink is laid over the veiled ground at its own
 * alpha (surveyInk.ts), and the ladder weighs it over the fully drained floor
 * (ladder.ts), so a multiply after the ink would drain the ink too. The ground
 * and roofs are unlit and not tone-mapped, so what is encoded here is what the
 * output transform writes, before the fog, as the old multiply was.
 */
import type { Material } from 'three';

/** The vertex attribute carrying the veil's display-space shade, rgb. */
export const VEIL_SHADE_ATTRIBUTE = 'veilShade';

const VEIL_SHADING_KEY = ':display-veil-1';

/**
 * The fragment's half: three's sRGB transfer both ways, which r169 ships
 * only the encoding half of, and the multiply between them.
 */
export const DISPLAY_VEIL_FRAGMENT = `vec3 veilEncoded = mix( diffuseColor.rgb * 12.92, 1.055 * pow( diffuseColor.rgb, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, diffuseColor.rgb ) ) * vVeilShade;
	diffuseColor.rgb = mix( veilEncoded / 12.92, pow( ( veilEncoded + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, veilEncoded ) );`;

/**
 * Drain this unlit material's colour by its geometry's `veilShade` attribute,
 * in display terms. Chains onto any earlier patch, and lands right after
 * `<color_fragment>`, so a later patch's hook there lands before it: install
 * it after the survey ink and before the ground's surface or detail, so the
 * veil drains the finished ground and the ink goes over it. A geometry drawn
 * with it must carry the attribute, since a missing one reads as black.
 */
export function installDisplayVeil(material: Material): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 ${VEIL_SHADE_ATTRIBUTE};
varying vec3 vVeilShade;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvVeilShade = ${VEIL_SHADE_ATTRIBUTE};`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vVeilShade;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n\t${DISPLAY_VEIL_FRAGMENT}`
      );
  };
  material.customProgramCacheKey = () => `${key}${VEIL_SHADING_KEY}`;
  material.needsUpdate = true;
}

/** Whether `installDisplayVeil` patched this material, as the key says. */
export function readsDisplayVeil(material: Material): boolean {
  return material.customProgramCacheKey().includes(VEIL_SHADING_KEY);
}
