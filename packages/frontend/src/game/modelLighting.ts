import {
  Color,
  DataTexture,
  EquirectangularReflectionMapping,
  FloatType,
  LinearSRGBColorSpace,
  type MeshStandardMaterial,
  PMREMGenerator,
  RGBAFormat,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { DEPTH, MODEL_LIGHTING } from '@echoes/shared';
import { waterColorAt } from './water.ts';

/** Static public water, never a capture of the match or its hidden entities. */
export function waterEnvironmentSource(): DataTexture {
  const width = MODEL_LIGHTING.ENVIRONMENT_WIDTH;
  const height = MODEL_LIGHTING.ENVIRONMENT_HEIGHT;
  const top = new Color(MODEL_LIGHTING.AMBIENT_COLOR);
  const deep = waterColorAt(DEPTH.MAX_M);
  const bottom = new Color().setRGB(deep.r, deep.g, deep.b);
  const color = new Color();
  const pixels = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    // Equirectangular UV v=1 is +Y; DataTexture's first row is v=0.
    color.copy(bottom).lerp(top, y / (height - 1));
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      pixels[i] = color.r;
      pixels[i + 1] = color.g;
      pixels[i + 2] = color.b;
      pixels[i + 3] = 1;
    }
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat, FloatType);
  texture.name = 'public-water-environment-source';
  texture.colorSpace = LinearSRGBColorSpace;
  texture.mapping = EquirectangularReflectionMapping;
  texture.needsUpdate = true;
  return texture;
}

export function createWaterEnvironment(renderer: WebGLRenderer): WebGLRenderTarget {
  const source = waterEnvironmentSource();
  const generator = new PMREMGenerator(renderer);
  try {
    const target = generator.fromEquirectangular(source);
    target.texture.name = 'public-water-environment';
    return target;
  } finally {
    source.dispose();
    generator.dispose();
  }
}

/**
 * The tone-mapping curve applies to surface light only. ACES on the summed
 * colour fades a saturated lamp toward white, so a faction's glow would stop
 * reading as its faction (gate 4) and a loud hull's colour would lie about its
 * SIG (gate 3). Map everything but the emission, then add the emission back
 * at its own hue and strength, unmapped: exposure does not scale it.
 * The canvas holds eight bits, so a pixel the sum drives past white is scaled
 * down along its hue rather than clipped channel by channel, which drew an
 * amber lamp yellow and a loud one white until #1021. That is the pixel half
 * of gate 3's lamp core: `lampCoreRest` (glow.ts) holds the rest at white, so
 * what reaches this is a flare past the rest, or lit surface added to emission,
 * on a lamp or on a glowing prop.
 * A no-op wherever three defines no TONE_MAPPING: a renderer without tone
 * mapping, or a draw into a render target, which r169 never tone-maps per
 * material (WebGLPrograms). So behind a RenderPass that feeds later passes the
 * glow is summed unmapped, and OutputPass tone-maps it, and every
 * `toneMapped: false` layer, with everything else.
 * Exact for MeshStandardMaterial, where emission sits unattenuated in the sum;
 * a physical material's clearcoat or sheen would attenuate it first.
 */
export const GLOW_AFTER_TONE_MAPPING = `#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( max( gl_FragColor.rgb - totalEmissiveRadiance, 0.0 ) ) + totalEmissiveRadiance;
	gl_FragColor.rgb /= max( 1.0, max( gl_FragColor.r, max( gl_FragColor.g, gl_FragColor.b ) ) );
#endif`;

const GLOW_AFTER_TONE_KEY = ':glow-after-tone-2';

/** Chains onto any earlier patch, as tutorialLook.ts does. */
export function keepGlowOutsideToneMapping(material: MeshStandardMaterial): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <tonemapping_fragment>',
      GLOW_AFTER_TONE_MAPPING
    );
  };
  material.customProgramCacheKey = () => `${key}${GLOW_AFTER_TONE_KEY}`;
}

/** Whether `keepGlowOutsideToneMapping` patched this material, read off the
 * key it leaves, for a reading that has to show the patch is there. */
export function keepsGlowOutsideToneMapping(material: MeshStandardMaterial): boolean {
  return material.customProgramCacheKey().endsWith(GLOW_AFTER_TONE_KEY);
}

/**
 * Gate 3's live half on an instanced draw. One lamp material serves every
 * hull of a kind (rosterBatches.ts), so `emissiveIntensity` can only hold the
 * resting strength they share; each hull's own factor along the curve
 * (`glowFactor`, glow.ts) arrives as the `instanceGlow` attribute and scales
 * the emission here, before anything reads it. That makes rest × factor what
 * `keepGlowOutsideToneMapping` adds after the curve, exactly the strength one
 * material per hull used to carry. A mesh drawn without instancing reads 1,
 * since only the vertex stage knows USE_INSTANCING: the varying is declared in
 * both stages either way, or the program would not link.
 */
export const INSTANCE_GLOW_VERTEX = `#ifdef USE_INSTANCING
	vInstanceGlow = instanceGlow;
#else
	vInstanceGlow = 1.0;
#endif`;

const INSTANCE_GLOW_KEY = ':instance-glow-1';

/** Chains onto any earlier patch; install it before `keepGlowOutsideToneMapping`. */
export function installInstanceGlow(material: MeshStandardMaterial): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
#ifdef USE_INSTANCING
attribute float instanceGlow;
#endif
varying float vInstanceGlow;`
      )
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${INSTANCE_GLOW_VERTEX}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vInstanceGlow;')
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= vInstanceGlow;'
      );
  };
  material.customProgramCacheKey = () => `${key}${INSTANCE_GLOW_KEY}`;
}

/** Whether `installInstanceGlow` patched this material, as the key says. */
export function readsInstanceGlow(material: MeshStandardMaterial): boolean {
  return material.customProgramCacheKey().includes(INSTANCE_GLOW_KEY);
}
