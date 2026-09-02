#!/usr/bin/env node
/**
 * prep-env-glb.mjs — make a Claude Design GLB export pass the prop gate
 * without touching its geometry.
 *
 *   node prep-env-glb.mjs <in.glb> <out.glb> [--merge <from>:<into>]... [--strip-uv]
 *
 * Two edits, both lossless for an untextured prop:
 *
 * - `--merge from:into` reassigns every primitive on material `from` to
 *   material `into` and drops `from`. Claude Design exports one material per
 *   named part, so a holdfast and its stalks arrive as two flat colours where
 *   the cap (docs/asset-prompts-3d.md Block 4) allows one plus the light.
 * - `--strip-uv` removes TEXCOORD_0 from every primitive. The exporter puts
 *   UVs on some parts and not others; the runtime merges a material's parts
 *   into one geometry (mergeByMaterial) and refuses a bucket whose members
 *   disagree on attributes, so a mixed bucket silently costs a draw call per
 *   part per instance batch. Refused when any material samples a texture,
 *   because then the UVs are not dead data.
 *
 * The binary chunk is copied verbatim: orphaned accessors and buffer views
 * are legal glTF, and the file stays byte-comparable to the export.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const positional = [];
const merges = [];
let stripUv = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--merge') {
    const [from, into] = String(args[++i]).split(':');
    if (!from || !into) fail('--merge wants <from-material>:<into-material>');
    merges.push({ from, into });
  } else if (args[i] === '--strip-uv') stripUv = true;
  else positional.push(args[i]);
}
const [src, dst] = positional;
if (!src || !dst) fail('usage: prep-env-glb.mjs <in.glb> <out.glb> [--merge a:b] [--strip-uv]');

const file = readFileSync(src);
if (file.toString('ascii', 0, 4) !== 'glTF' || file.readUInt32LE(4) !== 2) fail('not a GLB v2');
const jsonLength = file.readUInt32LE(12);
if (file.readUInt32LE(16) !== 0x4e4f534a) fail('first chunk is not JSON');
const json = JSON.parse(file.toString('utf8', 20, 20 + jsonLength));
const binChunks = file.subarray(20 + jsonLength);

const materials = json.materials ?? [];
const primitives = (json.meshes ?? []).flatMap((m) => m.primitives);
const byName = (name) => materials.findIndex((m) => m.name === name);

for (const { from, into } of merges) {
  const fromIndex = byName(from);
  const intoIndex = byName(into);
  if (fromIndex < 0 || intoIndex < 0) fail(`--merge ${from}:${into}: material not found`);
  let moved = 0;
  for (const p of primitives) if (p.material === fromIndex) ((p.material = intoIndex), moved++);
  materials.splice(fromIndex, 1);
  for (const p of primitives) if (p.material > fromIndex) p.material--;
  console.log(`merged ${from} into ${into}: ${moved} primitive(s)`);
}

if (stripUv) {
  const textured = materials.some(
    (m) =>
      m.pbrMetallicRoughness?.baseColorTexture ||
      m.pbrMetallicRoughness?.metallicRoughnessTexture ||
      m.normalTexture ||
      m.occlusionTexture ||
      m.emissiveTexture
  );
  if (textured) fail('--strip-uv refused: a material samples a texture, so the UVs are live');
  let stripped = 0;
  for (const p of primitives) {
    for (const key of Object.keys(p.attributes)) {
      if (key.startsWith('TEXCOORD_')) (delete p.attributes[key], stripped++);
    }
  }
  console.log(`stripped UVs from ${stripped} primitive(s)`);
}

let text = JSON.stringify(json);
while (text.length % 4) text += ' ';
const jsonBuffer = Buffer.from(text, 'utf8');
const header = Buffer.alloc(20);
header.write('glTF', 0, 'ascii');
header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + jsonBuffer.length + binChunks.length, 8);
header.writeUInt32LE(jsonBuffer.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
writeFileSync(dst, Buffer.concat([header, jsonBuffer, binChunks]));
console.log(`materials now: ${materials.map((m) => m.name).join(', ')} → ${dst}`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
