/**
 * check.mjs `diffNodes` holds what `diffParts` cannot: an empty node, a
 * node's place, and the extras a script writes on it. The arch's `sift_*`
 * nodes carry no mesh, its `fall_*` nodes carry a start height in their
 * extras, and its `hang_*` pivots are a node's own position under a part
 * built in local space (asset-prompts-3d.md Block 4b, #1637). None of
 * those is a part's shape, so without this list a script could move every
 * one of them and the round-trip check would still read "parts agree".
 * `readGlb` is read through a real export so the node list is the file's
 * order, mesh and empty alike, with the extras the exporter copied in.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as THREE from 'three';
import { readGlb, diffNodes } from '../glb.mjs';

const node = (name, at, extras = null) => ({ name, at, extras });

test('nodes that agree in name, place and extras drift nowhere', () => {
  const a = [
    node('root', [0, 0, 0]),
    node('sift_0', [1, 2, 3]),
    node('fall_0', [4, 5, 6], { startAboveRestM: 95 }),
  ];
  const b = a.map((n) => ({ ...n, at: n.at.slice(), extras: n.extras && { ...n.extras } }));
  assert.deepEqual(diffNodes(a, b), []);
});

test('an empty node that moved, a renamed node, a changed extra and a missing node each get a line', () => {
  const committed = [
    node('root', [0, 0, 0]),
    node('sift_0', [1, 2, 3]),
    node('fall_0', [4, 5, 6], { startAboveRestM: 95 }),
    node('hang_0', [7, 8, 9]),
  ];
  const built = [
    node('root', [0, 0, 0]),
    node('sift_0', [1, 2.5, 3]),
    node('fall_0', [4, 5, 6], { startAboveRestM: 120 }),
  ];
  const lines = diffNodes(built, committed);
  assert.equal(lines[0], '4 nodes committed, 3 built');
  assert.match(lines[1], /`sift_0`: stands at \[1,2,3\] → \[1,2.5,3\]/);
  assert.match(lines[2], /`fall_0`: extras .*95.* → .*120/);
  assert.match(lines[3], /node 3: `hang_0` missing from build/);
  assert.match(
    diffNodes(
      [node('r', [0, 0, 0]), node('x', [0, 0, 0])],
      [node('r', [0, 0, 0]), node('y', [0, 0, 0])]
    )[0],
    /`y` is now `x`/
  );
});

test('readGlb lists every node in file order, empties and extras included', async () => {
  const root = new THREE.Group();
  root.name = 'yard';
  const sift = new THREE.Object3D();
  sift.name = 'sift_0';
  sift.position.set(1, 2, 3);
  root.add(sift);
  const fall = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
  fall.name = 'fall_0';
  fall.position.set(4, 5, 6);
  fall.userData.startAboveRestM = 95;
  root.add(fall);
  const dir = mkdtempSync(join(tmpdir(), 'nodes-'));
  process.env.HULL_MODELS_OUT = dir;
  try {
    // kit.mjs shims FileReader for the exporter at import, as share.test.mjs says.
    const { exportGlb } = await import('../kit.mjs');
    await exportGlb(root, 'yard.glb');
    const { nodes } = readGlb(join(dir, 'yard.glb'));
    assert.deepEqual(
      nodes.map((n) => [n.name, n.at, n.extras]),
      // The exporter writes a node's children before the node, so the root
      // is last: file order, which is the order check.mjs compares in.
      [
        ['sift_0', [1, 2, 3], null],
        ['fall_0', [4, 5, 6], { startAboveRestM: 95 }],
        ['yard', [0, 0, 0], null],
      ]
    );
  } finally {
    delete process.env.HULL_MODELS_OUT;
    rmSync(dir, { recursive: true, force: true });
  }
});
