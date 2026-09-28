import {
  Color,
  DataTexture,
  EquirectangularReflectionMapping,
  FloatType,
  LinearSRGBColorSpace,
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
