/**
 * The conn view draws an own hull at the bow the server holds (#1840,
 * docs/systems-echo.md §8: "a stopped hull holds the last course it had").
 *
 * The view used to turn a hull to wherever it last moved more than a metre
 * between two snapshots, so separation's few-metre shove swung a resting hull
 * to face it. This boots the real view and reads the yaw it placed.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { Euler } from 'three';
import { Faction } from '@echoes/shared';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { createHost, HeadlessWebGLRenderer, pumpAnimationFrames } from './support/headless.ts';
import { cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';

interface Handle {
  mesh: { visible: boolean; rotation: Euler };
  model: { root: { rotation: Euler } } | null;
}

/** The bow a hull is drawn at: placeHandle writes `-yaw` about +Y. */
function drawnHeading(view: PerspectiveView, id: number): number {
  const handle = (view as unknown as { unitHandles: Map<number, Handle> }).unitHandles.get(id);
  assert.ok(handle !== undefined, `hull ${id} has a handle`);
  const rotation = handle.mesh.visible ? handle.mesh.rotation : handle.model!.root.rotation;
  return -rotation.y;
}

const views: PerspectiveView[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

describe('own hull heading in the conn view (#1840)', () => {
  it('draws the snapshot heading, and a shove does not turn a resting hull', () => {
    const gl = new HeadlessWebGLRenderer();
    const view = new PerspectiveView();
    views.push(view);
    view.mount(
      createHost(1280, 720) as unknown as HTMLElement,
      () => gl.asRenderer(),
      gl.environment
    );
    view.setTerrain(cannedTerrain());
    view.setIdentity(0, Faction.Bathyarch);
    view.setActive(true);

    const first = cannedSnapshot(300);
    const hull = first.units[0]!;
    view.applySnapshot(first);
    pumpAnimationFrames();
    assert.ok(
      Math.abs(drawnHeading(view, hull.id) - hull.heading) < 1e-6,
      'a hull is drawn at its heading from the first snapshot'
    );

    // Separation pushes the resting Corvette 3.6 m north, square to its bow,
    // as #1840 saw in the crater. The server's heading does not change.
    const shoved = cannedSnapshot(301);
    shoved.units[0]!.y += 3.6;
    view.applySnapshot(shoved);
    pumpAnimationFrames();
    assert.ok(
      Math.abs(drawnHeading(view, hull.id) - hull.heading) < 1e-6,
      'the shove does not turn the hull'
    );

    // A new order turns the bow on the server; the drawn hull follows.
    const turned = cannedSnapshot(302);
    turned.units[0]!.heading = -2.1;
    view.applySnapshot(turned);
    pumpAnimationFrames();
    assert.ok(
      Math.abs(drawnHeading(view, hull.id) - -2.1) < 1e-6,
      'the drawn bow follows the server'
    );
  });
});
