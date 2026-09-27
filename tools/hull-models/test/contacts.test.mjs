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
import { sceneParts } from '../glb.mjs';
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
