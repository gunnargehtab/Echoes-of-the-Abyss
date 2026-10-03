/**
 * #974's source-asset audit: what the committed model library carries, read
 * as a set. docs/art-direction.md's ranked audit quotes these counts.
 *
 *   node tools/render-stack/audit.mjs
 *
 * Bytes are summed over docs/concept-art/models/*.glb, raw and gzipped at
 * zlib's default level: the source library's size, not a download (Vite
 * hashes the files and the client loads them by need; delivery is #1004's).
 * UV0 on a primitive is not a layout, so uvAlike's zero-filled placeholders
 * (kit.mjs) are counted apart, and so are the materials tagged for a navy's
 * trim sheet, whose parts' UV0 a script laid out (trim.mjs, #1005). Not a
 * gate.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const models = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/concept-art/models');
const names = readdirSync(models).filter((name) => name.endsWith('.glb'));
const result = {
  models: names.length, rawBytes: 0, gzipBytes: 0,
  primitives: 0, primitivesWithUV0: 0, materialsWithAO: 0, primitivesWithZeroUV0: 0,
  materialsWithTrim: 0,
};
for (const name of names) {
  const bytes = readFileSync(join(models, name));
  result.rawBytes += bytes.length;
  result.gzipBytes += gzipSync(bytes).length;
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  for (const mesh of gltf.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      result.primitives++;
      const uv = primitive.attributes.TEXCOORD_0;
      if (uv === undefined) continue;
      result.primitivesWithUV0++;
      // GLTFExporter writes min and max on every accessor; uvAlike's are all 0.
      const { min, max } = gltf.accessors[uv];
      if (min?.every((v) => v === 0) && max?.every((v) => v === 0)) result.primitivesWithZeroUV0++;
    }
  }
  result.materialsWithAO += (gltf.materials ?? []).filter((m) => m.occlusionTexture).length;
  result.materialsWithTrim += (gltf.materials ?? []).filter((m) => m.extras?.trim).length;
}
console.log(JSON.stringify(result, null, 2));
