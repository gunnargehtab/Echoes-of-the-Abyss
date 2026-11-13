/**
 * A navy's surface: one tiling relief a material, drawn not painted (#1811).
 *
 * #1802 baked a surface onto one hull in Blender, a map a hull at 2 MB. Its
 * control showed the surface carried most of what that hull gained on the lit
 * table, and the owner declined the roster rebuilt that way. This is the
 * cheap route its README names: the relief is the navy material's, drawn once
 * and tiled, so no GLB carries it, as none carries a trim sheet (trim.mjs).
 *
 * A trim sheet is laid on UV0 in strake bands, which tile along a part and
 * not across it. A relief has to tile both ways, and a grown hull has no
 * layout that would not seam it, so nothing is laid at all: the client
 * samples the image by a fragment's place on the model in metres, on the
 * three planes of the model's own frame, weighted by its normal
 * (packages/frontend/src/game/navySurface.ts). `u` is the keel's axis on the
 * two planes that hold it, so a line drawn at constant `u` here is a ring
 * square to the keel on a hull's back and on its flank alike, and `v` 0 is
 * the model's own centreline from above and its axis from the side. A pattern
 * may lean on both: the veined skin's midrib runs down `v` 0.
 *
 * The image is three bytes a texel. Red and green are the relief's slope
 * along `u` and `v`, in units of the table's `slope`, 128 for level ground;
 * blue is its height between its lowest and highest point. A slope averages
 * correctly down a mip chain, which a normal does not, so the relief fades to
 * level at range rather than to noise. Every field is periodic in the tile
 * and comes from an integer hash, so the draw is the same
 * wherever it runs and check.mjs holds the committed PNG to it.
 *
 * Heights are metres and the tile is metres, so a table reads as the thing
 * it describes: a vein 8 cm proud and 60 cm across, every 5.3 m.
 */
import { encodeRgb } from './png.mjs';

/** Where surfaces.mjs writes a navy's surfaces, relative to the repository root. */
export const SURFACE_DIR = 'packages/frontend/src/assets/surface';

/** The byte level ground takes in the two slope channels. */
export const LEVEL = 128;

const TAU = 2 * Math.PI;

/**
 * [0, 1) from integers, the same on every machine. Each integer is mixed
 * through before the next is taken: trim.mjs `hash` multiplies its last one
 * in once, so two lattice points a step apart on that axis come out a
 * hundredth apart, and a noise built on it runs in streaks.
 */
export function hash(...ints) {
  let h = 0x9e3779b9;
  for (const n of ints) {
    h = Math.imul(h ^ n, 0x85ebca6b);
    h ^= h >>> 15;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 13;
  }
  return (h >>> 0) / 4294967296;
}
const wrap = (i, n) => ((i % n) + n) % n;
/** A fade whose slope and curvature are both zero at each end, so a lattice shows no crease. */
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/**
 * Smooth noise in [-1, 1) on a lattice of `cu` by `cv` cells a tile, wrapping
 * on both axes. Unequal counts stretch it: a fibre is many cells one way and
 * few the other.
 */
function noise(u, v, tileM, cu, cv, seed) {
  const gu = (u / tileM) * cu;
  const gv = (v / tileM) * cv;
  const iu = Math.floor(gu);
  const iv = Math.floor(gv);
  const su = fade(gu - iu);
  const sv = fade(gv - iv);
  const at = (i, j) => hash(seed, wrap(i, cu), wrap(j, cv));
  const lo = at(iu, iv) + (at(iu + 1, iv) - at(iu, iv)) * su;
  const hi = at(iu, iv + 1) + (at(iu + 1, iv + 1) - at(iu, iv + 1)) * su;
  return (lo + (hi - lo) * sv) * 2 - 1;
}

/** A rounded ridge: 1 on its line, 0 from `half` out, level at both. */
const ridge = (d, half) => (d >= half ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * d) / half));

/**
 * A field of `nu` by `nv` cells a tile, one point each, wrapping. `at(u, v)`
 * answers `{ centre, edge }` in metres: how far the nearest point is, and how
 * far the nearest wall between two cells.
 */
function cells(tileM, nu, nv, jitter, seed) {
  const points = new Float64Array(nu * nv * 2);
  for (let j = 0; j < nv; j++)
    for (let i = 0; i < nu; i++) {
      points[(j * nu + i) * 2] = ((i + 0.5 + jitter * (hash(seed, i, j, 0) - 0.5)) / nu) * tileM;
      points[(j * nu + i) * 2 + 1] =
        ((j + 0.5 + jitter * (hash(seed, i, j, 1) - 0.5)) / nv) * tileM;
    }
  // A point's place as seen from cell (ci, cj), which may be a tile away.
  const offset = (ci, cj, out) => {
    const k = (wrap(cj, nv) * nu + wrap(ci, nu)) * 2;
    out[0] = points[k] + Math.floor(ci / nu) * tileM;
    out[1] = points[k + 1] + Math.floor(cj / nv) * tileM;
  };
  const p = [0, 0];
  return (u, v) => {
    const ci = Math.floor((u / tileM) * nu);
    const cj = Math.floor((v / tileM) * nv);
    let best = Infinity;
    let bu = 0;
    let bv = 0;
    let bi = 0;
    let bj = 0;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        offset(ci + di, cj + dj, p);
        const d = (p[0] - u) ** 2 + (p[1] - v) ** 2;
        if (d < best) {
          best = d;
          bu = p[0];
          bv = p[1];
          bi = ci + di;
          bj = cj + dj;
        }
      }
    // The wall between the nearest point and each neighbour is their
    // bisector, so the distance to it is exact and a wall is one width along
    // its whole length. Half the gap between the two nearest is not.
    let edge = Infinity;
    for (let dj = -2; dj <= 2; dj++)
      for (let di = -2; di <= 2; di++) {
        if (di === 0 && dj === 0) continue;
        offset(bi + di, bj + dj, p);
        const nx = p[0] - bu;
        const ny = p[1] - bv;
        const len = Math.hypot(nx, ny);
        if (len === 0) continue;
        const d = (((bu + p[0]) / 2 - u) * nx + ((bv + p[1]) / 2 - v) * ny) / len;
        if (d < edge) edge = d;
      }
    return { centre: Math.sqrt(best), edge };
  };
}

/**
 * The patterns, each a height in metres at a place on the tile in metres.
 * A pattern reads only its own keys, so a table that names another's draws
 * nothing for them.
 */
const PATTERNS = {
  /**
   * A leaf's venation over growth lines. A midrib runs along `u` at `v` 0;
   * `laterals` veins a tile leave it and trail aft by `rake` metres a metre
   * out, thinning by `taper` towards the tile's edge, each wandering
   * `wanderM` off its line. Between them a net of veinlets on `net` cells,
   * growth lines square to the keel, `growthLines` a tile, drifting
   * `driftRad` out of phase, and pits.
   */
  veined(t) {
    const net = cells(t.tileM, t.net[0], t.net[1], t.netJitter, 11);
    const pitch = t.tileM / t.laterals;
    const across = Math.sqrt(1 + t.rake * t.rake);
    return (u, v) => {
      const out = Math.abs(v - t.tileM * Math.round(v / t.tileM));
      const wander = t.wanderM * noise(u, v, t.tileM, t.wanderCells, t.wanderCells, 12);
      const station = (u + t.rake * out + wander) / pitch;
      const off = (Math.abs(station - Math.round(station)) * pitch) / across;
      const thin = 1 - t.taper * (out / (t.tileM / 2));
      const lateral = t.lateralM * thin * ridge(off, t.lateralHalfM * thin);
      const midrib = t.midribM * ridge(out, t.midribHalfM);
      const veinlet = t.netM * ridge(net(u, v).edge, t.netHalfM);
      const drift = t.driftRad * noise(u, v, t.tileM, t.driftCells, t.driftCells, 13);
      const growth = t.growthM * Math.sin((TAU * t.growthLines * u) / t.tileM + drift);
      const pits = t.pitM * noise(u, v, t.tileM, t.pitCells, t.pitCells, 14);
      return Math.max(lateral, midrib) + veinlet + growth + pits;
    };
  },

  /**
   * A grain round the hull: `bands` rings a tile square to the keel,
   * drifting `driftRad` out of phase, and a fibre running along each ring,
   * `fibre[0]` cells along the keel to `fibre[1]` round it.
   */
  banded(t) {
    return (u, v) => {
      const drift = t.driftRad * noise(u, v, t.tileM, t.driftCells, t.driftCells, 21);
      const band = t.bandM * Math.sin((TAU * t.bands * u) / t.tileM + drift);
      const fibre = t.fibreM * noise(u, v, t.tileM, t.fibre[0], t.fibre[1], 22);
      return band + fibre;
    };
  },

  /**
   * A pod's skin: a mottle of `mottleCells` cells a tile, and a pore sunk
   * `poreM` at each of `pores` points, `poreHalfM` in radius.
   */
  pored(t) {
    const pore = cells(t.tileM, t.pores[0], t.pores[1], t.poreJitter, 31);
    return (u, v) => {
      const mottle = t.mottleM * noise(u, v, t.tileM, t.mottleCells, t.mottleCells, 32);
      return mottle - t.poreM * ridge(pore(u, v).centre, t.poreHalfM);
    };
  },

  /**
   * A fin's rays and the web between them. `rays` a tile at constant `u`,
   * which is root to tip on a fin that stands off the keel, each wandering
   * `wanderM`; the web is `webs` fine lines a tile crossing them.
   */
  rayed(t) {
    const pitch = t.tileM / t.rays;
    return (u, v) => {
      const wander = t.wanderM * noise(u, v, t.tileM, t.wanderCells[0], t.wanderCells[1], 41);
      const station = (u + wander) / pitch;
      const off = Math.abs(station - Math.round(station)) * pitch;
      const web = t.webM * Math.sin((TAU * t.webs * v) / t.tileM);
      return t.rayM * ridge(off, t.rayHalfM) + web;
    };
  },
};

/** A table's relief as a function: metres high at a place on the tile, in metres. */
export function surfaceHeight(table) {
  const height = PATTERNS[table.pattern]?.(table);
  if (height === undefined) throw new Error(`no surface pattern named ${table.pattern}`);
  return height;
}

/**
 * Draw one material's surface from its table. `{ size, tileM, slope, pixels,
 * png, reliefM, mean, clipped }`: `pixels` RGB bytes, row 0 at `v` 0;
 * `reliefM` the height blue's whole range spans; `mean` blue's mean, 0 to 1,
 * which the client shades about so a surface darkens a hollow and lifts a
 * crest without moving the material's own brightness; `clipped` how many
 * slopes passed the table's `slope` and were held to it.
 */
export function drawSurface(table) {
  const { size, tileM, slope } = table;
  const height = surfaceHeight(table);
  const texelM = tileM / size;
  const h = new Float64Array(size * size);
  let lo = Infinity;
  let hi = -Infinity;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const at = height((x + 0.5) * texelM, (y + 0.5) * texelM);
      h[y * size + x] = at;
      if (at < lo) lo = at;
      if (at > hi) hi = at;
    }
  const reliefM = hi - lo;
  const pixels = new Uint8Array(size * size * 3);
  let clipped = 0;
  let sum = 0;
  const slopeByte = (rise) => {
    const s = rise / (2 * texelM) / slope;
    if (Math.abs(s) > 1) clipped++;
    return LEVEL + Math.round(127 * Math.min(1, Math.max(-1, s)));
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 3;
      pixels[i] = slopeByte(h[y * size + wrap(x + 1, size)] - h[y * size + wrap(x - 1, size)]);
      pixels[i + 1] = slopeByte(h[wrap(y + 1, size) * size + x] - h[wrap(y - 1, size) * size + x]);
      pixels[i + 2] = reliefM > 0 ? Math.round((255 * (h[y * size + x] - lo)) / reliefM) : 0;
      sum += pixels[i + 2];
    }
  return {
    size,
    tileM,
    slope,
    pixels,
    png: encodeRgb(size, size, pixels),
    reliefM,
    mean: sum / (size * size * 255),
    clipped,
  };
}
