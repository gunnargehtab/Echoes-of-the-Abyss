/**
 * contacts.mjs lists the pairs of parts that meet, and only those: the
 * sweep #947's reviews wrote by hand, kept (#953). A pair whose boxes
 * overlap and whose shapes do not must not be listed, or the sweep would
 * bury its clips among the corners of every leaning part; a haze meets
 * nothing, as the light audit reads it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { sceneParts, isClosed } from '../glb.mjs';
import { contactsOf, underOf } from '../contacts.mjs';

function scene(parts) {
  const root = new THREE.Group();
  for (const { name, size, at, yaw = 0, material } of parts) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      material ?? new THREE.MeshStandardMaterial()
    );
    mesh.name = name;
    mesh.position.set(...at);
    mesh.rotation.y = yaw;
    root.add(mesh);
  }
  return sceneParts(root).parts;
}

const names = (pairs) => pairs.map((p) => p.slice().sort().join(' · ')).sort();

test('parts that pass through each other are listed once, and parts apart are not', () => {
  const parts = scene([
    { name: 'belt', size: [20, 1, 4], at: [0, 5, 0] },
    { name: 'tooth', size: [1, 6, 1], at: [2, 5, 0] },
    { name: 'lamp', size: [1, 1, 1], at: [0, 12, 0] },
  ]);
  assert.deepEqual(names(contactsOf(parts)), ['belt · tooth']);
});

test('boxes that overlap are not a contact when the shapes do not meet', () => {
  // A plate turned 45° runs along (1, 0, −1), and its box is far wider
  // than itself; a post on the other diagonal is inside the box and 8.5 m
  // clear of the plate.
  const parts = scene([
    { name: 'plate', size: [20, 1, 2], at: [0, 0, 0], yaw: Math.PI / 4 },
    { name: 'post', size: [1, 1, 1], at: [6, 0, 6] },
  ]);
  assert.deepEqual(contactsOf(parts), []);
});

test('--part and --with keep the pairs with a match on each side', () => {
  const parts = scene([
    { name: 'maw_tooth_0', size: [1, 6, 1], at: [0, 5, 0] },
    { name: 'conveyor_belt', size: [20, 1, 4], at: [0, 5, 0] },
    { name: 'crusher_cowl', size: [4, 4, 4], at: [0, 5, 0] },
  ]);
  const pairs = contactsOf(parts, { part: /maw_tooth/, withPart: /conveyor_/ });
  assert.deepEqual(names(pairs), ['conveyor_belt · maw_tooth_0']);
  assert.equal(contactsOf(parts, { part: /maw_tooth/ }).length, 2);
});

test('a haze meets nothing', () => {
  const haze = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.2 });
  const parts = scene([
    { name: 'core', size: [2, 2, 2], at: [0, 0, 0] },
    { name: 'sheath', size: [3, 3, 3], at: [0, 0, 0], material: haze },
  ]);
  assert.deepEqual(contactsOf(parts), []);
});

test('a part under the seabed is named with its depth, a claw point is not', () => {
  const parts = scene([
    { name: 'plate', size: [10, 2, 10], at: [0, 1, 0] },
    { name: 'claw', size: [1, 1, 1], at: [4, 0.47, 4] },
    { name: 'buried', size: [4, 4, 4], at: [0, 0, 0] },
  ]);
  assert.deepEqual(
    underOf(parts).map((u) => [u.name, +u.y.toFixed(2)]),
    [['buried', -2]]
  );
});

test('a part seated a rounding off its plate is listed, and one a centimetre clear is not', () => {
  // kit.mjs `seat` lands a part a float32 rounding above its plate: the
  // light scout's spine patch stands 4.8e-7 m clear and was never listed (#1370).
  const parts = scene([
    { name: 'plate', size: [10, 1, 10], at: [0, 0, 0] },
    { name: 'patch', size: [2, 0.2, 2], at: [0, 0.6 + 5e-7, 0] },
    { name: 'lamp', size: [1, 1, 1], at: [3, 1.01, 3] },
  ]);
  assert.deepEqual(names(contactsOf(parts)), ['patch · plate']);
  assert.deepEqual(contactsOf(parts, { near: 0 }), []);
});

test('every instance of a repeated name is tested, and named by its index', () => {
  // Pairs were keyed by name: the Hadron Slipway's hall was tested against
  // the first `gantry_leg_s`, 0.056 m off, and never the one it stands on (#1374).
  // The first leg leans across the hall's corner: its box overlaps the
  // hall's and it stands 1.7 m clear, so it took the name's one test.
  const parts = scene([
    { name: 'hall', size: [4, 4, 4], at: [0, 0, 0] },
    { name: 'leg', size: [4, 1, 0.2], at: [3.3, 0, 3.3], yaw: Math.PI / 4 },
    { name: 'leg', size: [1, 1, 1], at: [2.4, 0, 0] },
  ]);
  assert.deepEqual(names(contactsOf(parts)), ['hall · leg #2']);
});

function meshes(list) {
  const root = new THREE.Group();
  for (const { name, geometry, at } of list) {
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    mesh.name = name;
    mesh.position.set(...at);
    root.add(mesh);
  }
  return sceneParts(root).parts;
}

test('a part under an open shell is not inside it, whichever side is named', () => {
  // Ray parity is undefined for an open shell: a dome under the Cantor's
  // curved plate read as meeting a plate 0.44 m above it (#1373).
  const parts = meshes([
    { name: 'shell', geometry: new THREE.CylinderGeometry(4, 4, 2, 12, 1, true), at: [0, 3, 0] },
    {
      name: 'cap',
      geometry: new THREE.SphereGeometry(4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      at: [0, 4.4, 0],
    },
    { name: 'core', geometry: new THREE.BoxGeometry(2, 5, 2), at: [0, 3, 0] },
  ]);
  const [shell, cap, core] = parts;
  assert.equal(isClosed(shell), false);
  assert.equal(isClosed(cap), false);
  assert.equal(isClosed(core), true);
  assert.deepEqual(contactsOf(parts, { part: /core/ }), []);
  assert.deepEqual(contactsOf(parts, { part: /shell|cap/, withPart: /core/ }), []);
});

test('a part sunk whole in its partner meets it, whichever side is named', () => {
  // `gapBetween` asks only whether the first part's vertices are inside the
  // second, so a rivet buried in a hull met it one way round only (#1373).
  const parts = scene([
    { name: 'hull', size: [10, 4, 4], at: [0, 0, 0] },
    { name: 'rivet', size: [0.5, 0.5, 0.5], at: [0, 1, 0] },
  ]);
  assert.deepEqual(names(contactsOf(parts, { part: /hull/ })), ['hull · rivet']);
  assert.deepEqual(names(contactsOf(parts, { part: /rivet/ })), ['hull · rivet']);
});

test('a capsule is closed, and a part sunk whole in one meets it', () => {
  // A pole's triangles collapse to a line, and counting their edges read
  // every capsule open, so a box buried in a ballast tank met nothing.
  const parts = meshes([
    { name: 'tank', geometry: new THREE.CapsuleGeometry(2, 6, 8, 16), at: [0, 0, 0] },
    // Off the axis: a ray up the axis runs down the pole's seams, where
    // parity counts two faces at one crossing.
    { name: 'core', geometry: new THREE.BoxGeometry(0.3, 0.3, 0.3), at: [0.37, 0.5, 0.23] },
  ]);
  assert.equal(isClosed(parts[0]), true);
  assert.deepEqual(names(contactsOf(parts, { part: /tank/ })), ['core · tank']);
  assert.deepEqual(names(contactsOf(parts, { part: /core/ })), ['core · tank']);
});
