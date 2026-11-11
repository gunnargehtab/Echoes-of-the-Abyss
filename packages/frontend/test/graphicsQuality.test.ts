/**
 * The Graphics quality's predicates and status (docs/graphics-standards.md
 * gate 6, "Two graphics qualities"; docs/ui-ux.md §14). The setting's route
 * through the store is settingsStore.test.ts, its control settingsScreen.test.ts,
 * and what the view draws for it rendererSmoke.test.ts.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { HIGH_GRAPHICS } from '@echoes/shared';
import {
  askedGraphicsQuality,
  GRAPHICS_QUALITY_DEFAULT,
  graphicsQualityOf,
  graphicsQualityOffered,
  graphicsQualityStatus,
  graphicsQualityUnavailableReason,
  publishGraphicsQualityStatus,
  subscribeGraphicsQualityStatus,
} from '../src/game/graphicsQuality.ts';

describe('the Graphics quality', () => {
  afterEach(() => publishGraphicsQualityStatus('low'));

  it('defaults to Low, and reads anything it does not know as Low', () => {
    // Gate 6: "The default stays Low until the owner accepts a High frame and
    // says the default moves."
    assert.equal(GRAPHICS_QUALITY_DEFAULT, 'low');
    assert.equal(graphicsQualityOf('high'), 'high');
    assert.equal(graphicsQualityOf('low'), 'low');
    for (const raw of [undefined, null, true, 1, 'ultra', {}]) {
      assert.equal(graphicsQualityOf(raw), 'low');
    }
  });

  it('is hidden by the hosted playtest build, which then draws Low whatever is stored', () => {
    // Gate 6: "The hosted playtest build hides the control until then."
    assert.equal(graphicsQualityOffered(undefined), true);
    assert.equal(
      graphicsQualityOffered(''),
      true,
      'an unset build argument bakes the empty string'
    );
    assert.equal(graphicsQualityOffered('0'), true);
    assert.equal(graphicsQualityOffered('1'), false);
    assert.equal(graphicsQualityOffered(' 1 '), false);
    assert.equal(askedGraphicsQuality('high', true), 'high');
    assert.equal(askedGraphicsQuality('high', false), 'low', 'a stored choice cannot reach it');
    assert.equal(askedGraphicsQuality('low', false), 'low');
  });

  it('publishes what the view draws, and why High was refused', () => {
    const seen: string[] = [];
    const unsubscribe = subscribeGraphicsQualityStatus((state) => seen.push(state));
    assert.equal(graphicsQualityStatus(), 'low', 'low before any view has mounted');
    assert.equal(graphicsQualityUnavailableReason(), null);
    publishGraphicsQualityStatus('high');
    publishGraphicsQualityStatus('high');
    publishGraphicsQualityStatus('unavailable: no EXT_color_buffer_float');
    assert.deepEqual(seen, ['high', 'unavailable: no EXT_color_buffer_float'], 'a change, once');
    assert.equal(graphicsQualityUnavailableReason(), 'no EXT_color_buffer_float');
    unsubscribe();
    publishGraphicsQualityStatus('low');
    assert.equal(seen.length, 2, 'an unsubscribed listener hears nothing more');
  });

  it("holds gate 6's frame time as the constant its table tags", () => {
    // graphics-standards.md gate 6: "At most 8 ms of GPU time over every pass
    // of the frame", TUNABLE until the first frame the owner accepts.
    assert.equal(HIGH_GRAPHICS.FRAME_GPU_MS, 8);
  });
});
