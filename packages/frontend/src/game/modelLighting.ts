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
 * at its own hue and strength, unmapped: exposure does not scale it and nothing
 * compresses it, so a channel past 1 clips, as it did before #974.
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
#endif`;

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
  material.customProgramCacheKey = () => `${key}:glow-after-tone-1`;
}
