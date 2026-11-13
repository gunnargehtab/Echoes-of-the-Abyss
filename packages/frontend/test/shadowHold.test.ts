/**
 * The hold a ground shadow carries at the High graphics quality
 * (docs/art-direction.md, "What is built at High": "A ground shadow carries a
 * hold"; #1801). How the frame orders the pass is rendererSmoke.test.ts; how
 * the lit ground reads it is litGround.test.ts; how it looks is the frames in
 * docs/screenshots/issue-1801.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MaxEquation, RedFormat } from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { HOLD_FRAGMENT, HOLD_STRIDE, HOLD_VERTEX, ShadowHold } from '../src/game/shadowHold.ts';
import { HeadlessWebGLRenderer } from './support/headless.ts';

const { FULL, REACH } = HIGH_GRAPHICS.GROUND.SHADOW_HOLD;

describe('the hold a ground shadow carries (#1801)', () => {
  it('stands whole past the shadow’s own edge and is gone inside its reach', () => {
    // In shadow radii: the shadow's disc is 1, so its edge lies on ground the
    // hold has levelled whole, and the relief is all back by the reach.
    assert.ok(FULL > 1, `whole only to ${FULL} radii`);
    assert.ok(REACH > FULL);
    assert.ok(
      HOLD_FRAGMENT.includes(
        `1.0 - smoothstep( ${FULL.toFixed(6)}, ${REACH.toFixed(6)}, length( vRadii ) )`
      )
    );
    // The quad reaches exactly as far as the hold does: its corner varying is
    // the reach, and its plan corner the reach times the shadow's radius.
    assert.ok(HOLD_VERTEX.includes(`vRadii = position.xy * ${REACH.toFixed(6)};`));
    assert.ok(HOLD_VERTEX.includes('vec2 plan = aShadow.xy + vRadii * aShadow.z;'));
  });

  it('is drawn in plan, by the map’s metres alone: no camera turns it', () => {
    // docs/graphics-standards.md gate 8: no effect rotates with the
    // projection. A disc's corner goes straight into the target from its
    // plan metres, x across and z up, which is the lit ground's own uv.
    assert.ok(HOLD_VERTEX.includes('gl_Position = vec4( plan / uMapM * 2.0 - 1.0, 0.0, 1.0 );'));
    assert.doesNotMatch(HOLD_VERTEX, /projectionMatrix|modelViewMatrix|viewMatrix|cameraPosition/);
    assert.doesNotMatch(HOLD_FRAGMENT, /gl_FragCoord|cameraPosition/);
  });

  it('draws one instanced quad for every shadow, into one byte a texel', () => {
    const gl = new HeadlessWebGLRenderer();
    gl.info.autoReset = false;
    gl.info.reset();
    const renderer = gl.asRenderer();
    const hold = new ShadowHold();
    assert.equal(hold.drawn, false, 'no ground, no shadow: no pass');
    assert.equal(hold.bytes, 0);
    hold.setGround(4000, 4000, 512, 512);
    assert.equal(hold.drawn, false, 'a ground and no shadow: no pass');
    // Three slots, the middle one released: a radius of 0 holds nothing.
    hold.setShadows(new Float32Array([625, 1875, 30, 0, 0, 0, 375, 1875, 45]));
    assert.equal(HOLD_STRIDE, 3);
    assert.equal(hold.count, 2);
    assert.equal(hold.drawn, true);

    const texture = hold.render(renderer);
    assert.equal(texture.name, 'high-hold');
    const [target] = gl.frameTargets;
    assert.deepEqual([target!.width, target!.height], [512, 512], 'the ground’s own texels');
    assert.equal(target!.texture.format, RedFormat);
    assert.equal(target!.depthBuffer, false);
    assert.equal(hold.bytes, 512 * 512, 'one byte a texel');
    assert.equal(gl.frameDraws.length, 1);
    const [mesh] = gl.frameDraws[0]!;
    assert.equal(gl.frameDraws[0]!.length, 1, 'one draw, however many shadows');
    const drawn = mesh as unknown as {
      geometry: { instanceCount: number; getAttribute(name: string): { array: Float32Array } };
      material: { blendEquation: number; depthTest: boolean; depthWrite: boolean };
    };
    assert.equal(drawn.geometry.instanceCount, 3, 'a slot an instance');
    assert.deepEqual(
      [...drawn.geometry.getAttribute('aShadow').array.subarray(0, 9)],
      [625, 1875, 30, 0, 0, 0, 375, 1875, 45]
    );
    // The greater of two holds stands where two shadows cross.
    assert.equal(drawn.material.blendEquation, MaxEquation);
    assert.equal(drawn.material.depthTest, false);
    assert.equal(drawn.material.depthWrite, false);

    // More shadows than the buffer held: it grows, and still draws once.
    const fleet = new Float32Array(40 * HOLD_STRIDE).fill(10);
    hold.setShadows(fleet);
    assert.equal(hold.count, 40);
    hold.render(renderer);
    assert.equal(drawn.geometry.instanceCount, 40);

    // Another ground is another target.
    hold.setGround(8000, 8000, 1024, 1024);
    assert.equal(hold.bytes, 0, 'the old target is let go');
    hold.render(renderer);
    assert.equal(hold.bytes, 1024 * 1024);
    hold.release();
    assert.equal(hold.bytes, 0);
    hold.dispose();
  });
});
