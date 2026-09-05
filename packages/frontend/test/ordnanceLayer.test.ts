/**
 * The player's own ordnance as instanced geometry (docs/graphics-standards.md
 * gate 6, docs/art-direction.md "Own ordnance is geometry too"). The
 * three.js objects here need no GL — these tests read the instance buffers
 * and the draw range the render would.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OrdnanceKind, ORDNANCE, type OwnOrdnance } from '@echoes/shared';
import { DepthCues } from '../src/game/depthCues.ts';
import {
  LAMP_FLOOR,
  ORDNANCE_KINDS,
  OrdnanceLayer,
  TRAIL_SEGMENTS,
  lampBrightness,
} from '../src/game/ordnanceLayer.ts';

const shot = (id: number, kind: OrdnanceKind, x: number, sig: number): OwnOrdnance => ({
  id,
  kind,
  x,
  y: 100,
  depth: 300,
  heading: 0,
  sig,
  remainingS: 10,
});

const flat = (item: OwnOrdnance) => ({ x: item.x, z: item.y, worldY: -item.depth, groundY: -900 });

describe('ordnance layer', () => {
  it('draws any amount of ordnance with nine objects', () => {
    const cues = new DepthCues(0x00ffff, 4);
    const layer = new OrdnanceLayer(cues, 2);
    const items = [
      shot(1, OrdnanceKind.Torpedo, 0, ORDNANCE.TORPEDO.SIG_RUNNING),
      shot(2, OrdnanceKind.Torpedo, 50, ORDNANCE.TORPEDO.SIG_RUNNING),
      shot(3, OrdnanceKind.Mine, 100, ORDNANCE.MINE.SIG_ARMED),
      shot(4, OrdnanceKind.Noisemaker, 150, ORDNANCE.NOISEMAKER.SIG),
      shot(5, OrdnanceKind.DepthCharge, 200, 20),
    ];
    layer.sync(items, flat, 1);
    assert.equal(layer.group.children.length, ORDNANCE_KINDS.length * 2 + 1);
    assert.equal(layer.count, 5, 'grew past its initial capacity');
    assert.equal(layer.countOf(OrdnanceKind.Torpedo), 2);
    assert.equal(layer.countOf(OrdnanceKind.Mine), 1);
    assert.deepEqual(layer.positionOf(OrdnanceKind.Mine, 0), { x: 100, y: -300, z: 100 });
    assert.equal(layer.trailVertexCount, 2 * TRAIL_SEGMENTS * 2, 'a trail per torpedo');
    assert.equal(cues.count, 5, 'every shot carries a plumb and a shadow');
  });

  it('releases the depth cues of ordnance that has gone', () => {
    const cues = new DepthCues(0x00ffff, 4);
    const layer = new OrdnanceLayer(cues, 4);
    layer.sync([shot(1, OrdnanceKind.Mine, 0, 2), shot(2, OrdnanceKind.Torpedo, 10, 60)], flat, 1);
    layer.sync([shot(1, OrdnanceKind.Mine, 0, 2)], flat, 1);
    assert.equal(layer.count, 1);
    assert.equal(cues.count, 1);
    assert.equal(layer.countOf(OrdnanceKind.Torpedo), 0);
    assert.equal(layer.trailVertexCount, 0, 'no torpedo, no trail');
  });

  it('scales a shot with the readability factor and keeps it off the seabed', () => {
    const cues = new DepthCues(0x00ffff, 4);
    const layer = new OrdnanceLayer(cues, 4);
    layer.sync(
      [shot(1, OrdnanceKind.Torpedo, 0, 60)],
      () => ({ x: 0, z: 0, worldY: -905, groundY: -900 }),
      3
    );
    // Clearance rides the scale: 2 m × 3 above the ground, not below it.
    assert.equal(layer.positionOf(OrdnanceKind.Torpedo, 0).y, -894);
  });

  it('lights a lamp by its live SIG on the gate-3 curve', () => {
    assert.equal(lampBrightness(ORDNANCE.NOISEMAKER.SIG), 1, 'the loudest ordnance burns full');
    const torpedo = lampBrightness(ORDNANCE.TORPEDO.SIG_RUNNING);
    assert.ok(torpedo > 0.45 && torpedo < 0.55, `a running torpedo burns at ${torpedo}`);
    assert.equal(lampBrightness(ORDNANCE.MINE.SIG_ARMED), LAMP_FLOOR, 'an armed mine is a mark');
    assert.equal(lampBrightness(95), 1, 'never past full');
  });
});
