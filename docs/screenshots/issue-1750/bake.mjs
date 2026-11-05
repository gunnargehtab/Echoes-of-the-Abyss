// The crater's seabed skin, baked plain and eroded (docs/free-water-slice.md
// §9, "Crater walls"), as two PNGs beside a hillshade of each heightfield:
// the pure functions the view draws from, with no browser between. The bake
// is the ground's colour and its hillshade; the heightfield is its shape.
//
//   node --import tsx docs/screenshots/issue-1750/bake.mjs
//
// Writes bake/plain.png and bake/eroded.png beside this file, 512 px across
// the 4,000 m map, with a `-lifted` copy of each at four times the luminance
// and a `-relief` hillshade of each drawn surface: both review aids.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { terrainFor } from '../../../packages/backend/src/sim/maps/index.ts';
import { FREE_WATER_SLICE } from '../../../packages/backend/src/sim/maps/freeWaterSlice.ts';
import {
  seabedRange,
  seabedSeed,
  shadeSeabed,
  SEABED_PX_PER_CELL,
} from '../../../packages/frontend/src/game/seabed.ts';
import {
  rockTopDepthM,
  seabedDepthAtM,
} from '../../../packages/frontend/src/game/perspectiveTerrain.ts';

const crc32 = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return (bytes) => {
    let c = 0xffffffff;
    for (const b of bytes) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

/** A minimal RGBA PNG encoder: one IDAT, no filter on any row. */
function png(width, height, rgba) {
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * The drawn surface sampled at the bake's own pixel step and lit from the
 * upper left, grey, so its shape reads on its own: a review aid, not what the
 * game draws. The mesh itself has a vertex every 62.5 m (`VERTS_PER_CELL`);
 * this samples the same function between them.
 */
function relief(eroded) {
  const w = terrain.cols * SEABED_PX_PER_CELL;
  const h = terrain.rows * SEABED_PX_PER_CELL;
  const mPerPx = terrain.cellM / SEABED_PX_PER_CELL;
  const depth = new Float32Array(w * h);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      depth[py * w + px] = seabedDepthAtM(terrain, seed, rockTopM, px * mPerPx, py * mPerPx, eroded);
    }
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const at = (x, y) => depth[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
      const dx = (at(px + 1, py) - at(px - 1, py)) / (2 * mPerPx);
      const dy = (at(px, py + 1) - at(px, py - 1)) / (2 * mPerPx);
      // Depth is positive down, so a slope facing the upper-left light has dx > 0, dy > 0.
      const lit = (0.5 * dx + 0.5 * dy + 1) / Math.hypot(dx, dy, 1);
      const shade = Math.round(255 * Math.min(1, Math.max(0, 0.2 + 0.6 * lit)));
      const j = (py * w + px) * 4;
      out[j] = out[j + 1] = out[j + 2] = shade;
      out[j + 3] = 255;
    }
  }
  return { w, h, data: out };
}

/** The skin with its luminance lifted four times: a review aid, not what the game draws. */
function lifted(skin) {
  const data = new Uint8ClampedArray(skin.data.length);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = skin.data[i] * 4;
    data[i + 1] = skin.data[i + 1] * 4;
    data[i + 2] = skin.data[i + 2] * 4;
    data[i + 3] = 255;
  }
  return { w: skin.w, h: skin.h, data };
}

const terrain = terrainFor(FREE_WATER_SLICE).serialize();
const seed = seabedSeed(terrain);
const range = seabedRange(terrain);
const rockTopM = rockTopDepthM(terrain);
const whole = { col0: 0, row0: 0, col1: terrain.cols - 1, row1: terrain.rows - 1 };
const dir = join(dirname(fileURLToPath(import.meta.url)), 'bake');
mkdirSync(dir, { recursive: true });
for (const [name, options, eroded] of [
  ['plain', {}, false],
  ['eroded', { eroded: { rockTopM } }, true],
]) {
  const skin = shadeSeabed(terrain, seed, range, whole, [], options);
  writeFileSync(join(dir, `${name}.png`), png(skin.w, skin.h, skin.data));
  const lift = lifted(skin);
  writeFileSync(join(dir, `${name}-lifted.png`), png(lift.w, lift.h, lift.data));
  const shape = relief(eroded);
  writeFileSync(join(dir, `${name}-relief.png`), png(shape.w, shape.h, shape.data));
  console.log(name, `${skin.w}×${skin.h} skin at ${SEABED_PX_PER_CELL} px a cell, and its relief`);
}
