/**
 * The one image format a model carries, read and written without a canvas.
 *
 * glTF embeds an image as PNG or JPEG bytes, and Node has neither an encoder
 * nor a decoder for either: GLTFExporter encodes a texture through a canvas
 * it does not have (kit.mjs, the header), and GLTFLoader decodes one through
 * an `Image` it does not have. The occlusion map (#1002) is one 8-bit grey
 * channel, which is the simplest PNG there is — a header, one deflated
 * stream of filtered rows, an end marker — so the codec is written here, on
 * `node:zlib`, rather than brought in as a dependency for one channel.
 *
 * `encodeGray` writes colour type 0, bit depth 8, every row filter 0: the
 * bytes are the texels, prefixed by a zero a row, and deflated. `decodeGray`
 * reads that back, and also an 8-bit greyscale, RGB or RGBA file with any
 * of the five row filters, taking the first channel — so a reader can
 * check a map another tool wrote. Interlaced and 16-bit files are refused:
 * nothing here writes them, and a refusal is better than a guess.
 */
import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** A `width` × `height` grey image, one byte a texel, row 0 first. */
export function encodeGray(width, height, pixels) {
  if (pixels.length !== width * height)
    throw new Error(`encodeGray: ${pixels.length} texels for ${width} × ${height}`);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // greyscale
  const rows = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    rows[y * (width + 1)] = 0; // filter: none
    rows.set(pixels.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** `{ width, height, pixels }` from a PNG's bytes, the first channel of each texel. */
export function decodeGray(buf) {
  buf = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('decodeGray: not a PNG');
  let off = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const depth = data[8];
      const colour = data[9];
      channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colour];
      if (depth !== 8 || channels === undefined || data[12] !== 0)
        throw new Error(
          `decodeGray: only 8-bit grey, grey+alpha, RGB or RGBA, not interlaced (depth ${depth}, colour type ${colour}, interlace ${data[12]})`
        );
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!width || !channels) throw new Error('decodeGray: no IHDR');
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = new Uint8Array(width * height);
  const prev = new Uint8Array(stride);
  const cur = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let x = row[i];
      if (filter === 1) x += a;
      else if (filter === 2) x += b;
      else if (filter === 3) x += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a),
          pb = Math.abs(p - b),
          pc = Math.abs(p - c);
        x += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`decodeGray: row ${y} has filter ${filter}`);
      cur[i] = x & 0xff;
    }
    for (let i = 0; i < width; i++) pixels[y * width + i] = cur[i * channels];
    prev.set(cur);
  }
  return { width, height, pixels };
}
