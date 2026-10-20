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
  BUBBLES_PER_BURST,
  BUBBLE_LIFE_MS,
  BUBBLE_POOL,
  OrdnanceLayer,
  TRAIL_SEGMENTS,
  isLaunch,
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

/** A torpedo on its first Echo tick, with its whole run ahead of it. */
const launched = (id: number, x: number): OwnOrdnance => ({
  ...shot(id, OrdnanceKind.Torpedo, x, ORDNANCE.TORPEDO.SIG_RUNNING),
  remainingS: ORDNANCE.TORPEDO.RUN_TIME_S,
});

const flat = (item: OwnOrdnance) => ({ x: item.x, z: item.y, worldY: -item.depth, groundY: -900 });

describe('ordnance layer', () => {
  it('draws any amount of ordnance with ten objects', () => {
    const cues = new DepthCues(0x00ffff, 4);
    const layer = new OrdnanceLayer(cues, 2);
    const items = [
      shot(1, OrdnanceKind.Torpedo, 0, ORDNANCE.TORPEDO.SIG_RUNNING),
      shot(2, OrdnanceKind.Torpedo, 50, ORDNANCE.TORPEDO.SIG_RUNNING),
      shot(3, OrdnanceKind.Mine, 100, ORDNANCE.MINE.SIG_ARMED),
      shot(4, OrdnanceKind.Noisemaker, 150, ORDNANCE.NOISEMAKER.SIG),
      shot(5, OrdnanceKind.DepthCharge, 200, 20),
    ];
    layer.sync(items, flat, 1, 0);
    assert.equal(layer.group.children.length, ORDNANCE_KINDS.length * 2 + 2);
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
    layer.sync(
      [shot(1, OrdnanceKind.Mine, 0, 2), shot(2, OrdnanceKind.Torpedo, 10, 60)],
      flat,
      1,
      0
    );
    layer.sync([shot(1, OrdnanceKind.Mine, 0, 2)], flat, 1, 0);
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
      3,
      0
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

  it('bursts bubbles once per launch, from a pool that never grows', () => {
    const cues = new DepthCues(0x00ffff, 8);
    const layer = new OrdnanceLayer(cues, 4);
    assert.equal(layer.bubblePoolSize, BUBBLE_POOL);
    layer.sync([launched(1, 0)], flat, 1, 0);
    assert.equal(layer.burstCount, 1, 'a new torpedo id is a launch');
    layer.sync([launched(1, 30)], flat, 1, 200);
    assert.equal(layer.burstCount, 1, 'a known id spawns nothing');
    layer.sync([shot(2, OrdnanceKind.Mine, 0, 2)], flat, 1, 300);
    assert.equal(layer.burstCount, 1, 'a mine is not a launch');
    // A pool's worth of launches fills every slot; the next one lands on the
    // oldest, which is slot 0, the first launch's.
    const launches = BUBBLE_POOL / BUBBLES_PER_BURST;
    for (let id = 10; id < 10 + launches; id++) {
      layer.sync([launched(id, id * 1000)], flat, 1, 400 + id);
    }
    assert.equal(layer.burstCount, 1 + launches);
    assert.equal(layer.bubblePoolSize, BUBBLE_POOL, 'the pool is fixed');
    const newest = 10 + launches - 1;
    assert.ok(
      Math.abs(layer.bubbleAt(0).x - newest * 1000) < 10,
      `slot 0 holds the newest burst, at x ${layer.bubbleAt(0).x}`
    );
  });

  it('lifts bubbles straight up and lets them go after their life', () => {
    const cues = new DepthCues(0x00ffff, 4);
    const layer = new OrdnanceLayer(cues, 4);
    layer.sync([launched(1, 0)], flat, 1, 1000);
    const born = Array.from({ length: BUBBLES_PER_BURST }, (_, i) => layer.bubbleAt(i));
    layer.tick(1000 + BUBBLE_LIFE_MS / 2);
    for (let i = 0; i < BUBBLES_PER_BURST; i++) {
      const at = layer.bubbleAt(i);
      // Sideways drift states a current (docs/map-visuals.md §8).
      assert.equal(at.x, born[i]!.x, `bubble ${i} kept its x`);
      assert.equal(at.z, born[i]!.z, `bubble ${i} kept its z`);
      assert.ok(at.y > born[i]!.y, `bubble ${i} rose`);
    }
    // The burst outlives a torpedo that hits inside its life.
    layer.sync([], flat, 1, 1000 + BUBBLE_LIFE_MS * 0.9);
    assert.ok(layer.bubbling);
    layer.tick(1000 + BUBBLE_LIFE_MS);
    assert.ok(!layer.bubbling, 'spent');
  });

  it('skips the burst under reduced motion (docs/ui-ux.md §11)', () => {
    const cues = new DepthCues(0x00ffff, 4);
    const layer = new OrdnanceLayer(cues, 4);
    layer.setReducedMotion(true);
    layer.sync([launched(1, 0)], flat, 1, 0);
    assert.equal(layer.burstCount, 0);
    assert.ok(!layer.bubbling);
    // Turning it off mid-run does not burst a torpedo already running.
    layer.setReducedMotion(false);
    layer.sync([launched(1, 30)], flat, 1, 200);
    assert.equal(layer.burstCount, 0);
  });

  it('does not burst a torpedo first seen mid-run, as a reconnect sees it', () => {
    const cues = new DepthCues(0x00ffff, 4);
    const layer = new OrdnanceLayer(cues, 4);
    const running = { ...launched(1, 0), remainingS: ORDNANCE.TORPEDO.RUN_TIME_S - 5 };
    layer.sync([running], flat, 1, 0);
    assert.equal(layer.burstCount, 0, 'a shot already running was not seen launching');
    assert.ok(!isLaunch(running));
    assert.ok(isLaunch(launched(2, 0)));
  });

  it('forgets the last match on reset', () => {
    const cues = new DepthCues(0x00ffff, 4);
    const layer = new OrdnanceLayer(cues, 4);
    layer.sync([launched(1, 0)], flat, 1, 0);
    assert.ok(layer.bubbling);
    layer.reset();
    assert.ok(!layer.bubbling, 'the old match leaves no bubbles');
    layer.sync([launched(1, 0)], flat, 1, 100);
    assert.equal(layer.burstCount, 2, 'an id the new match reuses is a new launch');
  });
});
