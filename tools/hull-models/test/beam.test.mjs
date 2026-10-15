/**
 * glb.mjs `beamAt` and kit.mjs `seat({ beam })`: a flank fixture takes the
 * outermost face on its own side of the beam line, keeps its station, and
 * is left out with nothing behind it (#1369).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sceneParts, beamAt } from '../glb.mjs';
import { seat } from '../kit.mjs';

function root() {
  const r = new THREE.Group();
  r.name = 'root';
  const add = (name, size, at) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial());
    m.name = name;
    m.position.set(...at);
    r.add(m);
  };
  add('slab', [20, 10, 8], [0, 5, 0]); // flank at z ±4
  add('waist', [6, 10, 12], [0, 5, 0]); // flank at z ±6 over x ±3
  add('port_plate', [10, 4, 1], [-5, 2, -5]); // port only, z -5.5..-4.5
  r.updateMatrixWorld(true);
  return r;
}

test('beamAt takes the outermost face on its side, at the station', () => {
  const { parts } = sceneParts(root());
  assert.deepEqual(beamAt(parts, -8, 5, 1).point, [-8, 5, 4]);
  assert.deepEqual(beamAt(parts, 0, 5, 1).point, [0, 5, 6]);
  assert.deepEqual(beamAt(parts, -5, 2, -1).point, [-5, 2, -5.5]);
  assert.equal(beamAt(parts, -8, 12, 1), null);
});

test('beamAt never seats on a part from across the centreline', () => {
  const { parts } = sceneParts(root());
  const plate = parts.filter((p) => p.name === 'port_plate');
  assert.equal(beamAt(plate, -5, 2, 1), null);
});

test('seat({ beam }) keeps station and height; optional leaves out a bare station', () => {
  const r = root();
  const hit = seat(r, ['slab', 'waist'], [-8, 5, 3], { beam: 1 });
  assert.deepEqual(hit.at.map((v) => +v.toFixed(6)), [-8, 5, 4]);
  assert.equal(seat(r, ['slab'], [-8, 12, 3], { beam: 1, optional: true }), null);
  assert.throws(() => seat(r, ['slab'], [-8, 12, 3], { beam: 1 }));
  assert.throws(() => seat(r, ['nope'], [-8, 5, 3], { beam: 1, optional: true }));
});
