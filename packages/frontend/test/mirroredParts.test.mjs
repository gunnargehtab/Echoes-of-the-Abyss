/**
 * A mirrored part keeps its faces towards the eye once its node is baked into
 * the merge (#1812).
 *
 * The property, over every committed model: each triangle faces the same way
 * about the normals it is lit by whether three draws the file's part tree or
 * the mesh `mergeByMaterial` makes of it. In the tree three flips `frontFace`
 * for a part whose node has a negative determinant; in the merge nothing is
 * left to flip, unless the merge kept that part whole. A
 * triangle that turns clockwise towards its normals is culled from the side it
 * is lit on, and on the Pelagia Corvette that drew the keel blade and the lower
 * tail fluke near-black in the conn view.
 *
 * In `.mjs` for the reason rosterScale.test.mjs gives: the parse needs
 * `tools/hull-models/images.mjs`, which has no types.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { stripImages } from '../../../tools/hull-models/images.mjs';
import { bakeTransform } from '../src/game/bakeTransform.ts';
import { mergeByMaterial } from '../src/game/rosterModels.ts';

const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);

/** Every committed GLB the conn view can load: hulls, structures and props. */
const FILES = readdirSync(MODELS)
  .filter((f) => f.endsWith('.glb'))
  .sort();

async function parse(file) {
  const bytes = readFileSync(new URL(file, MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return (await new GLTFLoader().parseAsync(stripImages(buffer), '')).scene;
}

const A = new Vector3();
const B = new Vector3();
const C = new Vector3();
const N = new Vector3();
const TMP = new Vector3();

/**
 * Triangles whose winding agrees with their summed corner normals, and those
 * that disagree. A degenerate triangle, or one whose corners' normals cancel,
 * is neither, so float noise from a bake cannot move it between the two.
 * `flipped` is three's `frontFace` flip for a mesh drawn under a negative
 * determinant, which swaps what counts as front.
 */
function winding(geometry, flipped = false) {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const index = geometry.index;
  const count = index === null ? position.count : index.count;
  let agree = 0;
  let disagree = 0;
  if (normal === undefined) return { agree, disagree };
  for (let t = 0; t + 2 < count; t += 3) {
    const [ia, ib, ic] = [t, t + 1, t + 2].map((i) => (index === null ? i : index.getX(i)));
    A.fromBufferAttribute(position, ia);
    B.fromBufferAttribute(position, ib).sub(A);
    C.fromBufferAttribute(position, ic).sub(A);
    const face = B.cross(C);
    N.fromBufferAttribute(normal, ia)
      .add(TMP.fromBufferAttribute(normal, ib))
      .add(TMP.fromBufferAttribute(normal, ic));
    const area = face.length();
    const length = N.length();
    if (area < 1e-12 || length < 1e-6) continue;
    const cos = face.dot(N) / (area * length);
    if (Math.abs(cos) < 1e-3) continue;
    if (cos > 0 !== flipped) agree++;
    else disagree++;
  }
  return { agree, disagree };
}

function sum(counts) {
  return counts.reduce(
    (s, c) => ({ agree: s.agree + c.agree, disagree: s.disagree + c.disagree }),
    {
      agree: 0,
      disagree: 0,
    }
  );
}

/**
 * The parts as three draws the unmerged tree: each moved by its node with
 * `applyMatrix4`, normals by the normal matrix, and its front flipped wherever
 * the node's determinant is negative. Not the part's own space: a non-uniform
 * scale can carry a triangle whose face and normals stand near square to each
 * other across zero, and the merged mesh is lit in model space too.
 */
function before(scene) {
  scene.updateMatrixWorld(true);
  const counts = [];
  scene.traverse((child) => {
    if (child instanceof Mesh && !Array.isArray(child.material)) {
      const placed = child.geometry.clone().applyMatrix4(child.matrixWorld);
      counts.push(winding(placed, child.matrixWorld.determinant() < 0));
    }
  });
  return sum(counts);
}

/** The merged meshes' winding in model space, as the conn view draws them. */
function after(merged) {
  merged.updateMatrixWorld(true);
  const counts = [];
  merged.traverse((child) => {
    if (child instanceof Mesh && !Array.isArray(child.material)) {
      counts.push(winding(child.geometry, child.matrixWorld.determinant() < 0));
    }
  });
  return sum(counts);
}

/** One triangle in XY, wound counter-clockwise about +Z, its normals +Z. */
function triangle(indexed) {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3)
  );
  geometry.setAttribute(
    'normal',
    new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3)
  );
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1]), 2));
  if (indexed) geometry.setIndex([0, 1, 2]);
  return geometry;
}

describe('bakeTransform', () => {
  for (const indexed of [true, false]) {
    const kind = indexed ? 'indexed' : 'flat';
    it(`keeps a ${kind} triangle facing its normals under a reflection`, () => {
      const geometry = bakeTransform(triangle(indexed), new Matrix4().makeScale(1, 1, -1));
      assert.deepEqual(winding(geometry), { agree: 1, disagree: 0 });
      // The normals mirrored with the positions: the face now looks down -Z.
      assert.equal(geometry.getAttribute('normal').getZ(0), -1);
    });

    it(`leaves a ${kind} triangle's order alone under a rotation`, () => {
      const geometry = bakeTransform(triangle(indexed), new Matrix4().makeRotationY(Math.PI));
      assert.deepEqual(winding(geometry), { agree: 1, disagree: 0 });
      const uv = geometry.getAttribute('uv');
      assert.deepEqual([uv.getX(1), uv.getY(1)], [1, 0]);
    });
  }

  it('moves every attribute of a flat triangle with its corner', () => {
    const geometry = bakeTransform(triangle(false), new Matrix4().makeScale(-1, 1, 1));
    const uv = geometry.getAttribute('uv');
    const position = geometry.getAttribute('position');
    // Corners 1 and 2 swapped: the uv that sat with x = -1 still does.
    assert.deepEqual([position.getX(2), uv.getX(2), uv.getY(2)], [-1, 1, 0]);
  });
});

describe('mergeByMaterial keeps a mirrored part facing out', () => {
  it('on one part under a scale of -1', () => {
    const parent = new Group();
    const part = new Mesh(triangle(true), new MeshStandardMaterial());
    part.scale.set(-1, 1, 1);
    parent.add(part);
    assert.deepEqual(after(mergeByMaterial(parent)), { agree: 1, disagree: 0 });
  });

  for (const file of FILES) {
    it(`on ${file}`, async () => {
      const scene = await parse(file);
      const expected = before(scene);
      assert.deepEqual(after(mergeByMaterial(scene)), expected);
    });
  }
});
