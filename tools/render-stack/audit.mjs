// Reproduce #974's source-asset audit; this is not a network transfer measurement.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const directory = 'docs/concept-art/models';
const names = readdirSync(directory).filter((name) => name.endsWith('.glb'));
const result = {
  models: names.length, rawBytes: 0, gzipBytes: 0,
  primitives: 0, primitivesWithUV0: 0, materialsWithAO: 0,
};
for (const name of names) {
  const bytes = readFileSync(join(directory, name));
  result.rawBytes += bytes.length;
  result.gzipBytes += gzipSync(bytes).length;
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      result.primitives++;
      if (primitive.attributes.TEXCOORD_0 !== undefined) result.primitivesWithUV0++;
    }
  }
  result.materialsWithAO += (gltf.materials ?? []).filter((m) => m.occlusionTexture).length;
}
console.log(JSON.stringify(result, null, 2));
