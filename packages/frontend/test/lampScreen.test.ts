/**
 * A lamp's size on screen, for #1001's halo readings (`lampScreen.ts`).
 *
 * Geometry with a known answer: a 2 × 2 quad 10 units in front of a 90° camera
 * on a 1000 px viewport spans 100 × 100 px, since the view's half-height at
 * that distance is 10 units over 500 px.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Mesh, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { lampScreen } from '../src/game/lampScreen.ts';
import { lampSites } from '../src/game/dreamLightHalos.ts';

const RECT = { width: 1000, height: 1000 };

function camera(): PerspectiveCamera {
  const eye = new PerspectiveCamera(90, 1, 0.1, 100);
  eye.position.set(0, 0, 10);
  eye.lookAt(0, 0, 0);
  return eye;
}

describe('lamp screen: a lamp in pixels', () => {
  it('measures a facing quad at its projected area, and its site at its radius', () => {
    const geometry = new PlaneGeometry(2, 2);
    const mesh = new Mesh(geometry, new MeshStandardMaterial());
    const { sitesPx, areaPx } = lampScreen(mesh, camera(), RECT);
    assert.ok(Math.abs(areaPx - 100 * 100) < 1e-6, `area ${areaPx}`);
    const [site] = lampSites(geometry);
    assert.equal(sitesPx.length, 1);
    assert.ok(Math.abs(sitesPx[0]! - site!.radius * 50) < 1e-6, `radius ${sitesPx[0]}`);
  });

  it('counts no area for a lamp turned away, and scales with the mesh', () => {
    const away = new Mesh(new PlaneGeometry(2, 2), new MeshStandardMaterial());
    away.rotation.y = Math.PI;
    assert.equal(lampScreen(away, camera(), RECT).areaPx, 0);
    const doubled = new Mesh(new PlaneGeometry(2, 2), new MeshStandardMaterial());
    doubled.scale.setScalar(2);
    assert.ok(Math.abs(lampScreen(doubled, camera(), RECT).areaPx - 200 * 200) < 1e-6);
  });

  it('reads a merged lamp mesh as the separate lights it holds', () => {
    const left = new PlaneGeometry(1, 1).translate(-3, 0, 0);
    const right = new PlaneGeometry(1, 1).translate(3, 0, 0);
    const mesh = new Mesh(mergeGeometries([left, right])!, new MeshStandardMaterial());
    const { sitesPx, areaPx } = lampScreen(mesh, camera(), RECT);
    assert.equal(sitesPx.length, 2);
    assert.ok(Math.abs(areaPx - 2 * 50 * 50) < 1e-6, `area ${areaPx}`);
  });
});
