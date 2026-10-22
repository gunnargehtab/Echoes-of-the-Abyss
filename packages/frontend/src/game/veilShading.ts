/**
 * The acoustic veil inside a mission, applied in display space
 * (docs/ui-ux.md §4.5, #1536): the ground and its roofs, the embers and vent
 * plumes, and the props.
 *
 * `veilShade` (acousticVeil.ts) speaks in display terms, and the exterior's
 * floor is multiplied there already (worldBorder.ts `borderFadeFragment`,
 * #1532). The interior used to convert the shade to linear and multiply the
 * vertex or instance colour by it. The biome fills sit in the sRGB curve's
 * toe, where a linear multiply lands near the linear factor in display: the
 * floor's 0.30 red drew as about 0.07, and unheard ground read as a blackout
 * rather than a drain.
 *
 * So the shade rides in display terms, and the colour it drains is encoded,
 * multiplied and decoded in the shader. On the unlit layers that is inside
 * `<color_fragment>`, where the vertex colour used to land, rather than after
 * `<colorspace_fragment>`, where the exterior's is: the survey ink is laid
 * over the veiled ground at its own alpha (surveyInk.ts), and its ladder tests
 * weigh it over black, which bounds the drained floor (test/ladder.test.ts),
 * so a multiply after the ink would drain the ink too. Those layers are unlit
 * and not tone-mapped, so what is encoded there is what the output transform
 * writes, before the fog, as the old multiply was. On a lit prop it is after
 * the tone curve, on the surface light alone (`installPropVeil`).
 */
import { type Material, ShaderChunk } from 'three';
import { TONED_SURFACE } from './modelLighting.ts';

/** The vertex attribute carrying the veil's display-space shade, rgb. */
export const VEIL_SHADE_ATTRIBUTE = 'veilShade';

const VEIL_SHADING_KEY = ':display-veil-1';

const PROP_VEIL_KEY = ':prop-veil-1';

/**
 * A linear colour drained by a display-space shade: three's sRGB transfer
 * both ways, which r169 ships only the encoding half of, and the multiply
 * between them.
 */
export const DISPLAY_VEIL_GLSL = `vec3 echoesDisplayVeil( vec3 c, vec3 shade ) {
  vec3 e = mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) ) * shade;
  return mix( e / 12.92, pow( ( e + 0.055 ) / 1.055, vec3( 2.4 ) ), step( 0.04045, e ) );
}`;

/** The ground's and the lights' half, right after `<color_fragment>`. */
export const DISPLAY_VEIL_FRAGMENT =
  'diffuseColor.rgb = echoesDisplayVeil( diffuseColor.rgb, vVeilShade );';

/**
 * Drain this unlit material's colour by its geometry's `veilShade` attribute,
 * in display terms: the ground and the roofs, and the embers and the vent
 * plumes, which take a plain drain, one figure in all three channels
 * (PerspectiveView.ts `shadeEmbers`). Chains onto any earlier patch, and lands
 * right after `<color_fragment>`, so a later patch's hook there lands before
 * it: install it after the survey ink and before the ground's surface or
 * detail, so the veil drains the finished ground and the ink goes over it. A
 * geometry drawn with it must carry the attribute, since a missing one reads
 * as black.
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
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vVeilShade;\n${DISPLAY_VEIL_GLSL}`
      )
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

const INSTANCE_COLOR_LINE = 'vColor.xyz *= instanceColor.xyz;';
if (!ShaderChunk.color_vertex.includes(INSTANCE_COLOR_LINE)) {
  throw new Error('three moved the instance colour out of color_vertex: installPropVeil reads it');
}

/**
 * The veil on a prop (environmentLayer.ts): its instance colour carries the
 * shade in display terms, and drains the prop's **surface** light after the
 * tone curve, so a glowing prop's glow is added back at its own strength and
 * hue (`TONED_SURFACE`, modelLighting.ts). A vent is a light, and deafness is
 * not a filter over a light (PerspectiveView.ts `shadeEmbers`). The instance
 * colour no longer tints the diffuse: it reaches the fragment as the shade.
 *
 * Install it last, after the sway (which replaces the hook rather than
 * chaining it) and after `keepGlowOutsideToneMapping`, whose surface term it
 * wraps. A prop drawn without an instance colour reads a shade of white.
 */
export function installPropVeil(material: Material): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vVeilShade;')
      .replace(
        '#include <color_vertex>',
        `${ShaderChunk.color_vertex.replace(INSTANCE_COLOR_LINE, '')}
#ifdef USE_INSTANCING_COLOR
	vVeilShade = instanceColor.rgb;
#else
	vVeilShade = vec3( 1.0 );
#endif`
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>\nvarying vec3 vVeilShade;\n${DISPLAY_VEIL_GLSL}`
    );
    // Glowing: the surface term inside the glow's chunk, and the same split
    // where nothing is tone-mapped, since that chunk is then a no-op. Not:
    // all of it is surface.
    shader.fragmentShader = shader.fragmentShader.includes(TONED_SURFACE)
      ? shader.fragmentShader
          .replace(TONED_SURFACE, `echoesDisplayVeil( ${TONED_SURFACE}, vVeilShade )`)
          .replace(
            '#include <colorspace_fragment>',
            `#if !defined( TONE_MAPPING )
	gl_FragColor.rgb = echoesDisplayVeil( max( gl_FragColor.rgb - totalEmissiveRadiance, 0.0 ), vVeilShade ) + totalEmissiveRadiance;
#endif
	#include <colorspace_fragment>`
          )
      : shader.fragmentShader.replace(
          '#include <tonemapping_fragment>',
          `#include <tonemapping_fragment>
	gl_FragColor.rgb = echoesDisplayVeil( gl_FragColor.rgb, vVeilShade );`
        );
  };
  material.customProgramCacheKey = () => `${key}${PROP_VEIL_KEY}`;
  material.needsUpdate = true;
}

/** Whether `installPropVeil` patched this material, as the key says. */
export function readsPropVeil(material: Material): boolean {
  return material.customProgramCacheKey().includes(PROP_VEIL_KEY);
}
