import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MeshStandardMaterial } from 'three';
import { dreamLoopEnabled, installDreamSteel } from '../src/game/dreamLoop.ts';

describe('the isolated dream-loop prototype', () => {
  it('requires both development mode and explicit opt-in', () => {
    assert.equal(dreamLoopEnabled(true, '?dream-loop=1'), true);
    assert.equal(dreamLoopEnabled(false, '?dream-loop=1'), false);
    assert.equal(dreamLoopEnabled(true, ''), false);
    assert.equal(dreamLoopEnabled(true, '?dream-loop=0'), false);
  });

  it('leaves lamp colour and resting energy untouched', () => {
    const lamp = new MeshStandardMaterial({ color: 0x222222, emissive: 0xf2b233 });
    lamp.emissiveIntensity = 0.37;
    const original = lamp.clone();
    installDreamSteel(lamp);
    assert.ok(lamp.color.equals(original.color));
    assert.ok(lamp.emissive.equals(original.emissive));
    assert.equal(lamp.emissiveIntensity, original.emissiveIntensity);
    assert.equal(lamp.roughness, original.roughness);
  });

  it('preserves relative cladding luminance while studying a cool finish', () => {
    const steel = new MeshStandardMaterial({ color: 0x887744 });
    const luminance = () =>
      0.2126 * steel.color.r + 0.7152 * steel.color.g + 0.0722 * steel.color.b;
    const before = luminance();
    installDreamSteel(steel);
    assert.ok(Math.abs(luminance() - before) < 1e-8);
    assert.ok(steel.color.b > steel.color.r);
  });
});
