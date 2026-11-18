/**
 * What the High world pass leaves in a pixel where one blended draw covers an
 * opaque one, as GL would blend it: three's factors for the draw's blending
 * (`WebGLState.setBlending`), applied to the colour weight and the alpha.
 *
 * A model rather than a stub: the headless GL records no pixel, and the
 * property is arithmetic on the factors the material hands GL. The composite
 * gives the water `1 - alpha` of the pixel (highFrame.ts `echoesHighLight`),
 * so `water` is that share.
 */
import {
  ConstantAlphaFactor,
  CustomBlending,
  NormalBlending,
  OneFactor,
  OneMinusConstantAlphaFactor,
  OneMinusSrcAlphaFactor,
  SrcAlphaFactor,
  ZeroFactor,
  type BlendingDstFactor,
  type BlendingSrcFactor,
  type Material,
} from 'three';

export interface WorldBlend {
  /** How much of the pixel's colour the blended draw's own colour takes. */
  cover: number;
  /** The share of the pixel the composite gives to the water. */
  water: number;
}

/**
 * @param srcAlpha the blended fragment's alpha, as its shader leaves it
 * @param behindAlpha the opaque fragment's under it: what of it survived the swim
 */
export function blendOverOpaque(
  material: Material,
  srcAlpha: number,
  behindAlpha: number
): WorldBlend {
  const factor = (f: BlendingSrcFactor | BlendingDstFactor): number => {
    switch (f) {
      case ZeroFactor:
        return 0;
      case OneFactor:
        return 1;
      case SrcAlphaFactor:
        return srcAlpha;
      case OneMinusSrcAlphaFactor:
        return 1 - srcAlpha;
      case ConstantAlphaFactor:
        return material.blendAlpha;
      case OneMinusConstantAlphaFactor:
        return 1 - material.blendAlpha;
      default:
        throw new Error(`no model for blend factor ${f}`);
    }
  };
  let cover: number;
  let alpha: number;
  if (material.blending === NormalBlending && !material.premultipliedAlpha) {
    // gl.blendFuncSeparate( SRC_ALPHA, ONE_MINUS_SRC_ALPHA, ONE, ONE_MINUS_SRC_ALPHA )
    cover = srcAlpha;
    alpha = srcAlpha + behindAlpha * (1 - srcAlpha);
  } else if (material.blending === CustomBlending) {
    cover = factor(material.blendSrc);
    alpha =
      srcAlpha * factor(material.blendSrcAlpha ?? material.blendSrc) +
      behindAlpha * factor(material.blendDstAlpha ?? material.blendDst);
  } else {
    throw new Error(`no model for blending ${material.blending}`);
  }
  return { cover, water: 1 - alpha };
}
