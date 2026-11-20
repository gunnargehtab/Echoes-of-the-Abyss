/**
 * seabed.mjs's two checks on a skin and the `wound` shaft they hold (#1837).
 * The drift jelly's bell turns back in under its own lip, so `shaft` cannot
 * guess its inside, and its script trusts `closedOutward` and `skinGap` to
 * say the result is sound. Until now both ran only inside that script, under
 * check:models: a check nothing has seen fail is a check on trust. Here each
 * is shown a skin it must refuse, and a point whose distance is known.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { closedOutward, shaft, skinGap } from '../seabed.mjs';

/** A flat-shaded skin from corner triples, as the kit's `faceted` lays one out. */
function skin(tris) {
  const position = [];
  const normal = [];
  for (const [a, b, c] of tris) {
    const [u, v, w] = [a, b, c].map((p) => new THREE.Vector3(...p));
    const n = v.clone().sub(u).cross(w.clone().sub(u)).normalize();
    for (const p of [u, v, w]) {
      position.push(...p.toArray());
      normal.push(...n.toArray());
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  return geo;
}

// The unit corner tetrahedron, wound outward: a sixth of a cube.
const [A, B, C, D] = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const TETRA = [
  [A, C, B],
  [A, B, D],
  [A, D, C],
  [B, C, D],
];

test('closedOutward passes a closed skin wound outward, and returns its volume', () => {
  assert.ok(Math.abs(closedOutward(skin(TETRA)) - 1 / 6) < 1e-9);
});

test('closedOutward refuses a skin wound inside out', () => {
  const inside = TETRA.map(([a, b, c]) => [a, c, b]);
  assert.throws(() => closedOutward(skin(inside), 'bell'), /bell: wound inside out/);
});

test('closedOutward refuses a torn skin, and one facet turned inward', () => {
  assert.throws(() => closedOutward(skin(TETRA.slice(1)), 'bell'), /bell: the edge .* torn/);
  const [first, ...rest] = TETRA;
  const turned = [[first[0], first[2], first[1]], ...rest];
  assert.throws(() => closedOutward(skin(turned), 'lobe'), /lobe: the edge .* torn/);
});

test('skinGap measures to the triangle itself, not to its plane', () => {
  const geo = skin(TETRA);
  // Under the middle of the z = 0 face: the plane's distance, on its outward side.
  const under = skinGap(geo, [0.2, 0.2, -0.5]);
  assert.ok(Math.abs(under.gap - 0.5) < 1e-9);
  assert.equal(under.outside, true);
  assert.deepEqual(under.normal.toArray(), [0, 0, -1]);
  // Past the corner B along x: in the z = 0 plane, yet a metre from the skin.
  const past = skinGap(geo, [2, 0, 0]);
  assert.ok(Math.abs(past.gap - 1) < 1e-9);
  // Inside the body, a tenth off the nearest face, and not on its outward side.
  const within = skinGap(geo, [0.1, 0.1, 0.1]);
  assert.ok(Math.abs(within.gap - 0.1) < 1e-9);
  assert.equal(within.outside, false);
});

test('a wound shaft is closed and outward whichever way its rings run', () => {
  const ring = (y, r, back) => {
    const corners = [0, 1, 2, 3, 4, 5].map((i) => {
      const a = ((back ? -i : i) * Math.PI) / 3;
      return [r * Math.cos(a), y, r * Math.sin(a)];
    });
    return corners;
  };
  for (const back of [false, true]) {
    const geo = shaft([ring(0, 1, back), ring(1, 1.4, back), ring(2, 0.8, back)], { wound: true });
    assert.ok(closedOutward(geo, back ? 'run back' : 'run forward') > 0);
  }
});
