/**
 * The High graphics quality's chain: ambient occlusion, bloom and the grade
 * (docs/art-direction.md, "Two layers, two laws": the world layer may "spend
 * full-screen passes: bloom, grading, ambient occlusion"; #1801). How the
 * frame orders them is rendererSmoke.test.ts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DepthTexture, PerspectiveCamera } from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { BIOME_COLOR, LID_GLOW } from '../src/game/palette.ts';
import { BLOOM_LEVELS, BLOOM_THRESHOLD_GLSL, LightChain } from '../src/game/highChain.ts';
import { LIT_ALBEDO_GAIN } from '../src/game/seabed.ts';
import { HeadlessWebGLRenderer } from './support/headless.ts';

const decode = (byte: number): number => {
  const c = byte / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const linear = (hex: number): number[] => [
  decode((hex >> 16) & 0xff),
  decode((hex >> 8) & 0xff),
  decode(hex & 0xff),
];

describe('the High chain (#1801)', () => {
  it('blooms a source and never the Lid’s glow alone', () => {
    // HIGH_GRAPHICS.BLOOM: light under the threshold less its knee spreads
    // nothing. The brightest ground the Lid lights, a fill lifted to its
    // albedo, level and unshadowed at the Lid, stands under that in every
    // channel, so the whole lit ground is not a glow: only a source is.
    const { THRESHOLD, KNEE } = HIGH_GRAPHICS.BLOOM;
    assert.ok(THRESHOLD - KNEE > 0);
    const lid = linear(LID_GLOW).map((c) => c * HIGH_GRAPHICS.LID.IRRADIANCE);
    for (const fill of Object.values(BIOME_COLOR)) {
      // The albedo's chroma is eased toward its grey, which only lowers its
      // peak channel, so the unhued lift bounds it.
      const peak = Math.max(
        ...linear(fill).map((c, k) => (c * LIT_ALBEDO_GAIN * lid[k]!) / Math.PI)
      );
      assert.ok(peak < THRESHOLD - KNEE, `a fill the Lid lights reaches ${peak.toFixed(4)}`);
    }
    assert.ok(BLOOM_THRESHOLD_GLSL.includes(THRESHOLD.toFixed(6)));
    assert.ok(BLOOM_THRESHOLD_GLSL.includes(KNEE.toFixed(6)));
  });

  it('occludes at half the frame’s size and spreads the bloom over four levels', () => {
    const gl = new HeadlessWebGLRenderer();
    // As the view runs it: the frame's passes are summed, not one a render.
    gl.info.autoReset = false;
    gl.info.reset();
    const renderer = gl.asRenderer();
    const chain = new LightChain();
    const camera = new PerspectiveCamera(40, 16 / 9, 10, 60_000);
    assert.equal(chain.bytes, 0, 'nothing held before a frame');
    const occlusion = chain.occlude(renderer, camera, new DepthTexture(1280, 720), 1280, 720);
    assert.equal(occlusion.name, 'high-occlusion');
    assert.deepEqual(
      gl.frameTargets.map((t) => [t!.width, t!.height]),
      [[640, 360]]
    );
    const source = chain.bloomSource(1280, 720);
    assert.deepEqual([source.width, source.height], [640, 360], 'the prefilter’s level');
    gl.info.reset();
    const bloom = chain.bloom(renderer);
    assert.equal(bloom, source.texture, 'the first level, with the others added back');
    // Down three levels, then up three: each level added to the one above.
    assert.deepEqual(
      gl.frameTargets.map((t) => t!.width),
      [320, 160, 80, 160, 320, 640]
    );
    assert.equal(BLOOM_LEVELS, 4);
    assert.equal(chain.bytes, 640 * 360 * 4 + (640 * 360 + 320 * 180 + 160 * 90 + 80 * 45) * 8);
    chain.release();
    assert.equal(chain.bytes, 0, 'released, it holds nothing');
    chain.dispose();
  });

  it('grades before the curve, by numbers the chain owns', () => {
    const { SLOPE, OFFSET, POWER, SATURATION } = HIGH_GRAPHICS.GRADE;
    for (const row of [SLOPE, OFFSET, POWER]) assert.equal(row.length, 3);
    // Weight into the darks and nothing lifted: no power under 1, no offset
    // over 0, so the grade never brightens the ground the ladder is held over.
    assert.ok(POWER.every((p) => p >= 1));
    assert.ok(OFFSET.every((o) => o <= 0));
    assert.ok(SLOPE.every((s) => s <= 1));
    assert.ok(SATURATION > 0);
  });
});
