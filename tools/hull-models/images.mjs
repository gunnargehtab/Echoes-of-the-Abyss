/**
 * The images a model carries, into and out of the binary GLTFExporter
 * wrote: the occlusion map (#1002) and the trim sheet (#1005).
 *
 *   const glb = embedImages(exported, [occlusionImage(ao), trimImage(sheet, names)]);
 *   const bare = stripImages(glb);
 *
 * GLTFExporter cannot write an image in Node (kit.mjs, the header), so a
 * script bakes with the materials bare, lets the exporter write the
 * geometry and its UV sets, and `embedImages` opens the binary, appends
 * each PNG to the buffer as one more buffer view, and names it on the
 * materials its image lists, in the slot the image says: `occlusionTexture`
 * on the material, `baseColorTexture` under `pbrMetallicRoughness`. One
 * image a slot; a file that already carries an image is refused, since a
 * second writer is a drift the reader (glb.mjs) would have to guess at.
 *
 * `stripImages` is the other door, for a reader that parses a committed
 * file in Node through GLTFLoader — the frontend's roster tests — which
 * decodes an image through `ImageBitmap` or an `<img>` and has neither
 * there, and measures nothing a map changes: scale, seating, a lamp's rest.
 */

const MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const pad4 = (n) => (n + 3) & ~3;

function chunksOf(glb, who) {
  const buf = Buffer.isBuffer(glb) ? glb : Buffer.from(glb);
  if (buf.readUInt32LE(0) !== MAGIC || buf.readUInt32LE(4) !== 2)
    throw new Error(`${who}: not a glTF 2 binary`);
  let off = 12;
  let json = null;
  let bin = Buffer.alloc(0);
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const body = buf.subarray(off + 8, off + 8 + len);
    if (type === CHUNK_JSON) json = JSON.parse(body.toString('utf8'));
    else if (type === CHUNK_BIN) bin = body;
    off += 8 + len;
  }
  if (!json) throw new Error(`${who}: no JSON chunk`);
  return { buf, json, bin };
}

function assemble(json, bin) {
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonLength = pad4(jsonBytes.length);
  const binLength = pad4(bin.length);
  const total = 12 + 8 + jsonLength + 8 + binLength;
  const out = Buffer.alloc(total, 0);
  out.writeUInt32LE(MAGIC, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(total, 8);
  out.writeUInt32LE(jsonLength, 12);
  out.writeUInt32LE(CHUNK_JSON, 16);
  jsonBytes.copy(out, 20);
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonLength);
  out.writeUInt32LE(binLength, 20 + jsonLength);
  out.writeUInt32LE(CHUNK_BIN, 24 + jsonLength);
  bin.copy(out, 28 + jsonLength);
  return out;
}

/** Where a slot's reference sits on a glTF material, read or written. */
export const SLOTS = {
  occlusionTexture: {
    get: (m) => m.occlusionTexture,
    set: (m, ref) => (m.occlusionTexture = ref),
    clear: (m) => delete m.occlusionTexture,
  },
  baseColorTexture: {
    get: (m) => m.pbrMetallicRoughness?.baseColorTexture,
    set: (m, ref) => ((m.pbrMetallicRoughness ??= {}).baseColorTexture = ref),
    clear: (m) => m.pbrMetallicRoughness && delete m.pbrMetallicRoughness.baseColorTexture,
  },
};

/**
 * The GLB with `images` in it: `glb` as GLTFExporter gave it (an ArrayBuffer
 * or Buffer); each image `{ name, png, slot, texCoord, materials, sampler,
 * strength? }`, `materials` a Set of names, `sampler` glTF's own fields. A
 * material no image names is left as it was. Returns a Buffer.
 */
export function embedImages(glb, images) {
  const { json, bin } = chunksOf(glb, 'embedImages');
  if (json.images?.length || json.textures?.length)
    throw new Error('embedImages: the file already carries an image');
  const slots = new Set();
  for (const img of images) {
    if (!SLOTS[img.slot]) throw new Error(`embedImages: no slot ${img.slot}`);
    if (slots.has(img.slot)) throw new Error(`embedImages: two images for ${img.slot}`);
    slots.add(img.slot);
  }

  let length = pad4(bin.length);
  const offsets = images.map((img) => {
    const at = length;
    length += pad4(img.png.length);
    return at;
  });
  const out = Buffer.alloc(length);
  bin.copy(out, 0);
  images.forEach((img, i) => img.png.copy(out, offsets[i]));
  json.buffers = json.buffers ?? [{}];
  json.buffers[0].byteLength = out.length;
  json.bufferViews = json.bufferViews ?? [];
  json.images = [];
  json.samplers = [];
  json.textures = [];
  images.forEach((img, i) => {
    const view =
      json.bufferViews.push({ buffer: 0, byteOffset: offsets[i], byteLength: img.png.length }) - 1;
    const image = json.images.push({ bufferView: view, mimeType: 'image/png', name: img.name }) - 1;
    const sampler = json.samplers.push({ ...img.sampler }) - 1;
    const texture = json.textures.push({ sampler, source: image, name: img.name }) - 1;
    let given = 0;
    for (const m of json.materials ?? []) {
      if (!img.materials.has(m.name)) continue;
      const ref = { index: texture, texCoord: img.texCoord };
      if (img.strength !== undefined) ref.strength = img.strength;
      SLOTS[img.slot].set(m, ref);
      given++;
    }
    if (given === 0)
      throw new Error(`embedImages: no material named for ${img.name} is in the file`);
  });
  return assemble(json, out);
}

/**
 * The same GLB without its images: every slot cleared, the image, texture
 * and sampler tables gone, the geometry and its UV sets as they were. A file
 * carrying no image is returned as it came. Takes an ArrayBuffer or a Buffer
 * and returns an ArrayBuffer, which is what `parseAsync` takes.
 */
export function stripImages(glb) {
  const { buf, json, bin } = chunksOf(glb, 'stripImages');
  const carrying = (json.materials ?? []).some((m) =>
    Object.values(SLOTS).some((slot) => slot.get(m))
  );
  if (!carrying && !json.images?.length)
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  for (const m of json.materials ?? []) for (const slot of Object.values(SLOTS)) slot.clear(m);
  delete json.images;
  delete json.textures;
  delete json.samplers;
  // The PNGs' buffer views stay, unreferenced: the binary is left as it is,
  // and a view nothing names costs a loader nothing.
  const out = assemble(json, bin);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}
