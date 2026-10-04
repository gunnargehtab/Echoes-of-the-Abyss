// The pixel readings in this directory's README (#1083), from two run-game
// frame sets that shoot.mjs took, off and on.
//
//   node docs/screenshots/issue-1083/contrast.mjs diff <off-dir> <on-dir>
//   node docs/screenshots/issue-1083/contrast.mjs patch <png> [x0 y0 x1 y1]
//   node docs/screenshots/issue-1083/contrast.mjs crop <png> <out> x y w h scale gain
//
// `diff` reads each station's mean encoded luma off and on, and the share of
// pixels whose luma moved by a code value or more. `patch` reads a ground
// patch's mean, spread and fine spread (each pixel against a 33 px box round
// it); the default patch is the home frame's open plateau, bottom left, the
// same pixels in target.png. `crop` scales a crop up and multiplies it by
// `gain`: a viewing aid for near-black ground, never a reading of brightness.
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { decode } from '../../../tools/render-stack/lamps.mjs';

const luma = ({ w, bpp, px }, x, y) => {
  const i = (y * w + x) * bpp;
  return 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
};
const read = (file) => decode(readFileSync(file));

function diff(offDir, onDir) {
  for (const name of ['02-home', '03-silt', '04-trench', '05-low', '06-survey']) {
    const off = read(`${offDir}/${name}.png`);
    const on = read(`${onDir}/${name}.png`);
    let moved = 0;
    let sumOff = 0;
    let sumOn = 0;
    for (let y = 0; y < off.h; y++) {
      for (let x = 0; x < off.w; x++) {
        const a = luma(off, x, y);
        const b = luma(on, x, y);
        sumOff += a;
        sumOn += b;
        if (Math.abs(a - b) >= 1) moved++;
      }
    }
    const n = off.w * off.h;
    console.log(
      `${name}: mean ${(sumOff / n).toFixed(2)} off, ${(sumOn / n).toFixed(2)} on; ` +
        `${((100 * moved) / n).toFixed(1)}% of pixels moved a code value or more`
    );
  }
}

function patch(file, x0 = 150, y0 = 650, x1 = 550, y1 = 1000) {
  const img = read(file);
  const values = [];
  let fine = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const v = luma(img, x, y);
      values.push(v);
      let sum = 0;
      let count = 0;
      for (let dy = -16; dy <= 16; dy += 4) {
        for (let dx = -16; dx <= 16; dx += 4) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= img.w || yy >= img.h) continue;
          sum += luma(img, xx, yy);
          count++;
        }
      }
      fine += (v - sum / count) ** 2;
    }
  }
  values.sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  const at = (q) => values[Math.floor(values.length * q)].toFixed(1);
  console.log(
    `${file}: mean ${mean.toFixed(1)}, std ${std.toFixed(2)}, p5 ${at(0.05)}, ` +
      `p95 ${at(0.95)}, fine std ${Math.sqrt(fine / values.length).toFixed(2)}`
  );
}

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (bytes) => {
  let r = 0xffffffff;
  for (const v of bytes) r = table[(r ^ v) & 255] ^ (r >>> 8);
  return (r ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([length, body, sum]);
};

function crop(file, out, x0, y0, w, h, scale, gain) {
  const img = read(file);
  const ow = w * scale;
  const oh = h * scale;
  const raw = Buffer.alloc(oh * (ow * 3 + 1));
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const i = ((y0 + Math.floor(y / scale)) * img.w + x0 + Math.floor(x / scale)) * img.bpp;
      for (let c = 0; c < 3; c++) {
        raw[y * (ow * 3 + 1) + 1 + x * 3 + c] = Math.min(255, img.px[i + c] * gain);
      }
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(ow, 0);
  header.writeUInt32BE(oh, 4);
  header[8] = 8;
  header[9] = 2;
  writeFileSync(
    out,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', Buffer.alloc(0)),
    ])
  );
}

const [command, ...args] = process.argv.slice(2);
if (command === 'diff') diff(args[0], args[1]);
else if (command === 'patch') patch(args[0], ...args.slice(1).map(Number));
else if (command === 'crop') crop(args[0], args[1], ...args.slice(2).map(Number));
else throw new Error('contrast.mjs diff | patch | crop');
