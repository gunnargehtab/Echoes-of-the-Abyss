/**
 * The batched depth cues (#434): one draw for every plumb, one for every
 * shadow, slots recycled in place, and the plumbs taken off as one where the
 * free-water study draws none (#1772). The three.js objects here need no GL —
 * these tests read the buffers the draw would.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DepthCues } from '../src/game/depthCues.ts';

describe('depth cues', () => {
  it('draws every hull with two objects however many there are', () => {
    const cues = new DepthCues(0x00ffff, 4);
    for (let i = 0; i < 12; i++) {
      const slot = cues.allocate();
      cues.setPlumb(slot, i * 10, -100, -500, 0);
      cues.setShadow(slot, i * 10, -499, 0, 12);
    }
    assert.equal(cues.count, 12);
    assert.equal(cues.group.children.length, 2, 'one LineSegments and one InstancedMesh');
    assert.ok(cues.slotCapacity >= 12, 'the buffers grew to hold the fleet');
    assert.deepEqual(cues.plumbAt(11), { x: 110, hullY: -100, groundY: -500, z: 0 });
    assert.deepEqual(cues.shadowAt(11), { x: 110, groundY: -499, z: 0, radius: 12 });
  });

  it('carries live slots across a growth', () => {
    const cues = new DepthCues(0x00ffff, 2);
    const a = cues.allocate();
    cues.setPlumb(a, 1, -2, -3, 4);
    cues.setShadow(a, 1, -3, 4, 5);
    cues.allocate();
    cues.allocate(); // the third slot forces the buffers to double
    assert.deepEqual(cues.plumbAt(a), { x: 1, hullY: -2, groundY: -3, z: 4 });
    assert.deepEqual(cues.shadowAt(a), { x: 1, groundY: -3, z: 4, radius: 5 });
  });

  it('hides a released slot and hands it to the next entity', () => {
    const cues = new DepthCues(0x00ffff, 4);
    const a = cues.allocate();
    const b = cues.allocate();
    cues.setPlumb(a, 10, -20, -30, 40);
    cues.setShadow(a, 10, -30, 40, 6);
    cues.release(a);
    assert.equal(cues.count, 1);
    assert.deepEqual(cues.plumbAt(a), { x: 0, hullY: 0, groundY: 0, z: 0 }, 'a zero-length plumb');
    assert.equal(cues.shadowAt(a).radius, 0, 'a zero-scale disc');
    const c = cues.allocate();
    assert.equal(c, a, 'the freed slot is reused before a fresh one');
    assert.notEqual(c, b);
  });

  it('takes the plumbs off as one and keeps them off across a growth, the shadows drawn', () => {
    const cues = new DepthCues(0x00ffff, 2);
    const a = cues.allocate();
    cues.setPlumb(a, 1, -2, -3, 4);
    cues.setShadow(a, 1, -3, 4, 5);
    cues.plumbsShown = false;
    const [plumbs, shadows] = cues.group.children;
    assert.equal(plumbs!.visible, false, 'the plumb batch draws nothing');
    assert.equal(shadows!.visible, true, 'the shadow batch still draws');
    cues.allocate();
    cues.allocate(); // the third slot forces the buffers to double
    const [grownPlumbs, grownShadows] = cues.group.children;
    assert.ok(grownPlumbs !== plumbs, 'the premise: the growth built the batches again');
    assert.equal(grownPlumbs!.visible, false, 'still off after the growth');
    assert.equal(grownShadows!.visible, true);
    // The slot kept its plumb meanwhile, so turning them on draws it in place.
    cues.plumbsShown = true;
    assert.equal(cues.group.children[0]!.visible, true);
    assert.deepEqual(cues.plumbAt(a), { x: 1, hullY: -2, groundY: -3, z: 4 });
  });
  it('packs every slot’s shadow in plan, a released slot at no radius', () => {
    // The hold a shadow carries at the High graphics quality reads these
    // (shadowHold.ts): plan x, plan z and the drawn radius, a slot a triple.
    const cues = new DepthCues(0x00ffff, 4);
    const a = cues.allocate();
    const b = cues.allocate();
    cues.setShadow(a, 10, -499, 20, 12);
    cues.setShadow(b, 30, -480, 40, 7);
    assert.deepEqual([...cues.packShadows()], [10, 20, 12, 30, 40, 7]);
    cues.release(a);
    assert.deepEqual([...cues.packShadows()], [0, 0, 0, 30, 40, 7]);
    assert.equal(cues.packShadows(), cues.packShadows(), 'one array, reused');
  });
});
