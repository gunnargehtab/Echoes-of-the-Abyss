import * as THREE from 'three';

// The export's UV-preserving merge, shared by its fauna and the static scene batching.
export function mergeUV(list) {
  const geometries = list.map((geometry) => (geometry.index ? geometry.toNonIndexed() : geometry));
  let count = 0;
  for (const geometry of geometries) {
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    count += geometry.attributes.position.count;
  }
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  let offset = 0;
  for (const geometry of geometries) {
    positions.set(geometry.attributes.position.array, offset * 3);
    normals.set(geometry.attributes.normal.array, offset * 3);
    if (geometry.attributes.uv) uvs.set(geometry.attributes.uv.array, offset * 2);
    offset += geometry.attributes.position.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return merged;
}

export function batchStatic(root, excluded = []) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const groups = new Map();
  const excludedRoots = new Set(excluded);
  let before = 0;
  root.traverseVisible((mesh) => {
    if (!mesh.isMesh || mesh.isInstancedMesh || mesh.children.length) return;
    for (let parent = mesh; parent; parent = parent.parent) {
      if (excludedRoots.has(parent)) return;
    }
    const { material, geometry } = mesh;
    if (!(material.isMeshStandardMaterial || material.isMeshBasicMaterial) || material.transparent)
      return;
    if (
      Object.keys(geometry.attributes).some((name) => !['position', 'normal', 'uv'].includes(name))
    )
      return;
    if (Object.keys(geometry.morphAttributes).length || geometry.drawRange.count !== Infinity)
      return;
    const key = [
      material.id,
      mesh.castShadow,
      mesh.receiveShadow,
      mesh.renderOrder,
      mesh.layers.mask,
      mesh.userData.noVol === true,
    ].join(':');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mesh);
    before++;
  });
  let after = 0,
    triangles = 0;
  for (const meshes of groups.values()) {
    if (meshes.length === 1) {
      after++;
      continue;
    }
    const copies = meshes.map((mesh) =>
      mesh.geometry
        .clone()
        .applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld))
    );
    const merged = mergeUV(copies);
    const expected = copies.reduce(
      (sum, geometry) => sum + (geometry.index?.count ?? geometry.attributes.position.count),
      0
    );
    if (merged.attributes.position.count !== expected)
      throw new Error('Static batch lost triangles');
    triangles += expected / 3;
    copies.forEach((geometry) => geometry.dispose());
    const first = meshes[0];
    const batch = new THREE.Mesh(merged, first.material);
    batch.name = `batch:${first.material.name || first.material.type}`;
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    batch.renderOrder = first.renderOrder;
    batch.layers.mask = first.layers.mask;
    batch.userData.noVol = first.userData.noVol;
    batch.userData.sourceNames = meshes.map((mesh) => mesh.name);
    meshes.forEach((mesh) => mesh.removeFromParent());
    root.add(batch);
    after++;
  }
  return { sourceMeshes: before, batchedMeshes: after, savedDraws: before - after, triangles };
}
