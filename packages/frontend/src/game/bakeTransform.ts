/**
 * Bake a node's transform into a geometry's vertices without turning its faces
 * away from the eye (#1812).
 *
 * A glTF node may carry a reflection: the Pelagia hulls' lower tail fluke and
 * the Hadron drive prisms are written as a scale of -1 beside a rotation. Left
 * on the node, three sees the negative determinant and flips `frontFace` when it
 * draws the mesh. Baked into the vertices, as every merge here does to save
 * draw calls, nothing is left to see: the positions and normals mirror, the
 * index order does not, so each triangle now winds clockwise towards the
 * normals it carries. The materials are single-sided, so the faces towards the
 * eye are the ones culled, and the part draws its far, unlit inside instead.
 * Reversing every triangle's winding restores what the node meant.
 */

import type { BufferAttribute, BufferGeometry, InterleavedBufferAttribute, Matrix4 } from 'three';

export function bakeTransform(geometry: BufferGeometry, matrix: Matrix4): BufferGeometry {
  geometry.applyMatrix4(matrix);
  if (matrix.determinant() < 0) reverseWinding(geometry);
  return geometry;
}

/** Swap each triangle's second and third corner, in place. */
export function reverseWinding(geometry: BufferGeometry): void {
  const index = geometry.index;
  if (index !== null) {
    swapCorners(index);
    return;
  }
  // A flat geometry has no index to reorder, so every per-vertex attribute
  // swaps instead, morph targets with them.
  for (const attribute of Object.values(geometry.attributes)) swapCorners(attribute);
  for (const targets of Object.values(geometry.morphAttributes)) {
    for (const attribute of targets) swapCorners(attribute);
  }
}

function swapCorners(attribute: BufferAttribute | InterleavedBufferAttribute): void {
  const size = attribute.itemSize;
  // Raw array slots, not getComponent/setComponent, which would round a
  // normalised attribute through floats and back.
  const array =
    'isInterleavedBufferAttribute' in attribute ? attribute.data.array : attribute.array;
  const stride = 'isInterleavedBufferAttribute' in attribute ? attribute.data.stride : size;
  const offset = 'isInterleavedBufferAttribute' in attribute ? attribute.offset : 0;
  for (let t = 0; t + 2 < attribute.count; t += 3) {
    const b = (t + 1) * stride + offset;
    const c = (t + 2) * stride + offset;
    for (let k = 0; k < size; k++) {
      const kept = array[b + k]!;
      array[b + k] = array[c + k]!;
      array[c + k] = kept;
    }
  }
  if ('isInterleavedBufferAttribute' in attribute) attribute.data.needsUpdate = true;
  else attribute.needsUpdate = true;
}
