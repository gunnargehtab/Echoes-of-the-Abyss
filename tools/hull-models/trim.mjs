/**
 * A UV layout in metres and the trim sheet it reads, for a model script
 * (#1005): every part's UV0 laid over its navy's plate, and the one grey
 * image that plate is drawn on.
 *
 *   const sheet = drawTrimSheet(navy.TRIM);           // the navy's image
 *   const laid = layoutTrim(root, sheet, navy.TRIM);  // UV0, before the export
 *
 * Until this, UV0 on a part said only that it merges (kit.mjs `uvAlike`):
 * a three constructor carried its own 0..1 parameterisation, an extruded
 * plate its outline's metres, a sweep zeros, and nothing sampled any of
 * them. A trim sheet needs a layout, and the layout is the kit's, written
 * at export the way occlusion.mjs writes `uv1`, so a script opts in with one
 * argument (kit.mjs `exportGlb`'s `trim`) and `check.mjs` rebuilds and
 * compares the layout on every machine.
 *
 * **The sheet is the navy's, and travels apart from the file.** One image
 * serves every model of a navy, so a GLB carries none: it carries the
 * layout on UV0 and, on each solid unlit material, `extras.trim` naming the
 * sheet it is laid out for (three's `userData`, which GLTFExporter writes
 * and GLTFLoader reads back). sheets.mjs draws every navy's sheet once into
 * packages/frontend/src/assets/trim/<name>.png, check.mjs holds that file
 * to the draw, and the conn view attaches it to the tagged materials at
 * load (rosterModels.ts, trimSheets.ts), as the chart's bake does for its
 * albedo pass (hull-intake bake.mjs `--trim`). Embedding it instead cost
 * 31 KB a model that gzip cannot shrink and a re-export of every model on
 * the sheet whenever a number in it moved.
 *
 * **The sheet is luminance only.** It multiplies the material's colour, and
 * the colour is the faction's ink, recoloured from the active palette at
 * load (rosterModels.ts, docs/graphics-standards.md gate 4), so the hue on
 * screen is still the palette's and the sheet says only where a plate ends.
 * It is written in linear light and encoded sRGB, as a base colour is read,
 * and held bright: its mean is reported, and the Consortium's reads
 * about 0.86 of white, so the register rosterModels.ts puts a navy on
 * (`CLADDING_CEILING`) moves by a seventh. Emissive is untouched, since
 * a base-colour map never reaches `emissive` (gate 3), and a lamp material
 * is not tagged at all: the layout lays every part, and the tag goes to the
 * solid, unlit materials (glb.mjs `occludes`). Sorrowgate's triplanar
 * surface (tutorialLook.ts) multiplies `diffuseColor` after three's
 * `map_fragment`, so on a Commune hull in the tutorial both apply, the
 * sheet under the laminate.
 *
 * **The layout is in metres, per part, per face.** Each triangle is
 * projected on the world plane its face normal is most along, with the
 * part's longer in-plane extent as the `along` axis — `u` runs along it at
 * one wrap of the sheet per `wrapM` metres from the part's own edge, so a
 * plate begins where the part does and a port part lays out as its
 * starboard twin — and the shorter as `cross`, spread over one of the
 * sheet's four bands. A band holds 1, 2, 4 or 8 strakes across its height,
 * and the face takes the band whose strakes come nearest `strakeM` over its
 * cross extent: a 60 m deck gets eight strakes of 7.5 m, a 14 m flank two
 * of 7, a rivet one. A round part — a three cylinder, lathe, sphere, torus
 * or capsule, read by its geometry's type — is unrolled instead: the axis
 * is the local axis its vertices stay most evenly round, `u` is the arc at
 * whole plates round the mean girth, so the unroll's seam falls on a plate
 * seam along the even strakes and mid-plate along the staggered ones, and
 * `v` runs the length; its caps are projected flat. Nothing moves: a vertex
 * whose corners want two UVs is split, as occlusion.mjs splits a chart's
 * edge, so an indexed box gains vertices and no triangle.
 *
 * **The sheet is drawn, not painted.** `drawTrimSheet` rasterises the bands
 * from the navy's numbers: `PLATES` plates a wrap, half a plate of stagger
 * on alternate strakes, a seam at `seam` of the plate's light with
 * weathering beside it — in texels of a 512² sheet, or in metres as a lap
 * with a lit lip (#1107; `drawTrimSheet` says why) — each plate at its own
 * tone from an integer hash, ramped along its length, under grime and a
 * grain. Every number is the navy's (factions/bathyarch.mjs `TRIM` is the
 * first, and its `name` is the sheet's file and tag), so the image is
 * reproduced wherever the script runs and compared texel by texel. The
 * Directorate's `tergite` pattern keeps the bands but curves their
 * transverse seams, without the stagger or longitudinal grid: shadow under
 * an overlap and growth along its curve. The Order's `facet` pattern (#1109)
 * keeps the bands and drops the stagger: an aligned grid of panels, each
 * joint a hairline with a lit chamfer on both sides, and the panel tones
 * mirrored about each band's middle, so a flat face laid port and
 * starboard reads the same from either beam once the table's `mirror` has
 * `u` along the beam measured from the centreline out (`layoutMesh`). A
 * faceted round part is not quite that: a joint that falls mid-facet where
 * the facet tapers follows the triangle diagonal and kinks, about a pixel
 * at the conn view's 3 px/m, which #746 takes. Nothing on it weathers, and
 * `untagged` keeps the sheet off a cladding that is not panelling
 * (`layoutTrim`).
 */
import * as THREE from 'three';
import { occludes } from './glb.mjs';
import { encodeGray } from './png.mjs';

/** The sheet's channel: glTF TEXCOORD_0, three's `uv`. */
export const TEXCOORD = 0;

/** Where sheets.mjs writes a navy's sheet, relative to the repository root. */
export const SHEET_DIR = 'packages/frontend/src/assets/trim';

/** Plates a wrap of the sheet: two, so a half-plate stagger tiles. */
export const PLATES = 2;

/**
 * The bands, in order up the sheet: strakes across, and the share of the
 * height each takes. Eight strakes want more texels than one, so the bands
 * grow with their rows.
 */
const BANDS = [
  { rows: 1, share: 1 / 8 },
  { rows: 2, share: 1 / 8 },
  { rows: 4, share: 1 / 4 },
  { rows: 8, share: 1 / 2 },
];

/** Three's round constructors, by `geometry.type`; everything else is projected flat. */
const ROUND = new Set([
  'CylinderGeometry',
  'ConeGeometry',
  'LatheGeometry',
  'SphereGeometry',
  'TorusGeometry',
  'CapsuleGeometry',
]);

/** A side triangle of a round part is one whose face is this far off its axis. */
const SIDE = 0.7;

/** [0, 1) from integers, the same on every machine. */
export function hash(...ints) {
  let h = 2166136261;
  for (const n of ints) {
    h ^= (n + 0x9e3779b9) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  return (h >>> 0) / 4294967296;
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const toSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

/** The bands laid over a `size` sheet: `{ rows, v0, v1 }` each, v up the image. */
export function bandsOf() {
  let v = 0;
  return BANDS.map((b) => {
    const band = { rows: b.rows, v0: v, v1: v + b.share };
    v += b.share;
    return band;
  });
}

/**
 * What `layoutTrim` reads of a sheet — its bands and its wrap — without
 * drawing the pixels, which at sixteen samples a texel take a second and a
 * half that an export never looks at.
 */
export function sheetLayout({ plateM = 12 } = {}) {
  return { bands: bandsOf(), wrapM: PLATES * plateM };
}

/**
 * Smooth noise in [0, 1) on a lattice of `cells` a wrap in u, so it tiles
 * the sheet's wrap as the plates do; `seed` picks the field.
 */
function valueNoise(xm, ym, cellM, cells, seed) {
  const gx = xm / cellM;
  const gy = ym / cellM;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const sx = smoothstep(0, 1, gx - ix);
  const sy = smoothstep(0, 1, gy - iy);
  const at = (i, j) => hash(seed, ((i % cells) + cells) % cells, j);
  const lo = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
  const hi = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
  return lo + (hi - lo) * sy;
}

/**
 * Draw the sheet. `{ size, pixels, png, bands, wrapM, mean }`: `pixels`
 * sRGB bytes, row 0 at v 0; `mean` the linear mean over the whole image.
 *
 * A seam is given one of two ways. `seamPx` and `weatherPx` are texels of a
 * 512 sheet, a seam both sides of the joint — but a texel is 4.7 cm along a
 * plate and 19 cm across a strake of every band but the one-strake band, so
 * a seam in texels is four times wider across those strakes than along them.
 * `seamM` and `weatherM`, when a navy gives them, are metres on both axes
 * (#1107), with the lap: a seam's shadow falls on the plate's far end and
 * the strake's top, and `lip`, when given, is the light the overlapping edge
 * catches on the near side. `ramp`, `grime` and `rivet` are off at 0
 * (`rivetM` is a rivet's radius), so a table that names none of the metre
 * keys draws what it drew before them, texel for texel.
 *
 * The `facet` pattern reads `seamM` as a hairline centred on the joint,
 * half each side, and `chamferM` as a flat band of `chamfer` light beyond
 * it on both sides (#1109): a plane's edge catches the key wherever the
 * plane is, so no side is the shadow side. It reads no lap, lip, weather,
 * ramp, grime, rivet, arch or growth, and its tone is keyed on the
 * strake's distance from the band's middle rather than the strake, so the
 * sheet is the same under v → v0 + v1 − v within every band — which is how
 * `layoutMesh` lays the port face of a keel-centred part against its
 * starboard face, and a port part against its twin — and the table's
 * `mirror` makes `u` along the beam the same on both sides. That is a
 * flat face's mirror; a round part unrolls by angle, and a joint mid-facet
 * on a tapering facet kinks (#746). The plate and tergite patterns do not
 * read the chamfer keys.
 */
export function drawTrimSheet({
  pattern = 'plate',
  size = 512,
  plateM = 12,
  strakeM = 6,
  seamPx = 3,
  weatherPx = 8,
  seamM = 0,
  weatherM = 0,
  light = 0.98,
  seam = 0.35,
  weather = 0.08,
  lip = 0,
  chamferM = 0,
  chamfer = 0,
  tone = 0.08,
  ramp = 0,
  grime = 0,
  grimeM = 8,
  rivet = 0,
  rivetM = 0.07,
  rivetPitchM = 0.6,
  rivetInM = 0.35,
  samples = 1,
  grain = 0.015,
  archPx = 0,
  growth = 0,
  growthRings = 5,
} = {}) {
  const bands = bandsOf();
  const pixels = new Uint8Array(size * size);
  const plateW = size / PLATES;
  const wrapM = PLATES * plateM;
  // The seam and its weathering are given in texels of a 512 sheet, so a
  // sheet drawn smaller keeps the same plate.
  const seamT = (seamPx * size) / 512;
  const weatherT = (weatherPx * size) / 512;
  // A metre seam is never thinner than a texel on either axis, or a band
  // would lose it between two texel centres.
  const texU = wrapM / size;
  const seamU = Math.max(seamM, texU);
  // Grime's two octaves, each a whole number of cells a wrap so it tiles.
  const coarse = Math.max(1, Math.round(wrapM / grimeM));
  const fine = Math.max(1, Math.round((8 * wrapM) / (3 * grimeM)));

  /** The plate's light at (u, v), before the grain. */
  const shade = (u, v) => {
    const bi = bands.findIndex((b) => v < b.v1);
    const band = bands[bi === -1 ? bands.length - 1 : bi];
    const span = (v - band.v0) / (band.v1 - band.v0);
    const s = Math.min(band.rows - 1, Math.floor(span * band.rows));
    const t = span * band.rows - s;
    const strakeH = ((band.v1 - band.v0) * size) / band.rows;
    // A tergite overlaps across the shell, not in staggered rectangular
    // patches. The arch meets its neighbour at both strake edges; only
    // the transverse seam is inked, never a grid around each patch.
    const chitin = pattern === 'tergite';
    // A facet grid is aligned: no stagger, and no arch.
    const facet = pattern === 'facet';
    const arch = chitin ? (archPx / 512) * PLATES * 4 * t * (1 - t) : 0;
    const up = u * PLATES + (facet ? 0 : chitin ? arch : s % 2 ? 0.5 : 0);
    const p = Math.floor(up) % PLATES;
    const a = up - Math.floor(up);
    // A facet's tone is keyed on the strake's distance from the band's
    // middle, so the strake at v and the strake at v0 + v1 − v are one tone:
    // port and starboard land on the sheet as each other's reverse (the
    // function's comment), and the Order mirrors or it is not the Order.
    const row = facet ? Math.min(s, band.rows - 1 - s) : chitin ? 0 : s;
    let L = light * (1 - tone * hash(band.rows, row, p));
    if (facet) {
      // The hairline is centred on the joint, half its width each side, and
      // held to a texel on either axis as the lap is. It is a gap and not a
      // plane, so it takes the sheet's light and not the panel's tone: the
      // two halves of a butt are one value, and the wrap closes to the
      // level. The chamfer runs on from it at its own light, the same on
      // both sides, since a plane's edge catches the key from wherever the
      // plane faces. Nothing ramps, grimes or rivets a polished plane, so
      // the keys below are not read.
      const texV = strakeM / strakeH;
      const seamV = Math.max(seamM, texV);
      const du = Math.min(a, 1 - a) * plateM;
      const dv = Math.min(t, 1 - t) * strakeM;
      if (du < seamU / 2 || dv < seamV / 2) return light * seam;
      if (du < seamU / 2 + chamferM || dv < seamV / 2 + chamferM) return Math.max(L, chamfer);
      return L;
    }
    // A plate is never quite flat: a slow ramp along it, its sign the plate's.
    if (ramp) L *= 1 + ramp * (hash(7, band.rows, s, p) < 0.5 ? -1 : 1) * (2 * a - 1);
    if (grime) {
      const xm = u * wrapM;
      const ym = (s + t) * strakeM;
      const n =
        0.65 * valueNoise(xm, ym, wrapM / coarse, coarse, 11) +
        0.35 * valueNoise(xm, ym, wrapM / fine, fine, 13);
      L *= 1 - grime * smoothstep(0.35, 0.8, n);
    }
    // Texel seams, the plate's or a tergite's; the metre keys below are the
    // plate pattern's alone.
    if (!(seamM > 0)) {
      const du = Math.min(a, 1 - a) * plateW;
      const d = chitin ? du : Math.min(du, Math.min(t, 1 - t) * strakeH);
      if (d < seamT) return L * seam;
      const wear = 1 - smoothstep(seamT, seamT + weatherT, d);
      // Shadow under the overlapping lip, a clean edge above it. Growth
      // follows that same curve and fades at the lip instead of crossing it.
      L *= 1 - weather * wear * (chitin && a > 0.5 ? 0 : 1);
      if (chitin)
        L -= growth * (0.5 + 0.5 * Math.cos(a * growthRings * Math.PI * 2)) * Math.sin(a * Math.PI);
      return L;
    }
    const texV = strakeM / strakeH;
    const seamV = Math.max(seamM, texV);
    const near = Math.min((a * plateM) / seamU, (t * strakeM) / seamV);
    const far = Math.min(((1 - a) * plateM) / seamU, ((1 - t) * strakeM) / seamV);
    if (far < 1 || (!lip && near < 1)) return L * seam;
    if (near < 1) return Math.max(L, lip);
    const past = Math.min(
      Math.min(a, 1 - a) * plateM - seamU,
      Math.min(t, 1 - t) * strakeM - seamV
    );
    L *= 1 - weather * (1 - smoothstep(0, weatherM, past));
    // A row of rivets in from each strake edge, along the strake, stopping
    // short of a butt: a disc of radius `rivetM` in metres, which the
    // samples take at its coverage of the texel rather than grown to fill it.
    if (rivet && Math.min(a, 1 - a) * plateM > rivetInM) {
      const along = (((u * wrapM) % rivetPitchM) + rivetPitchM) % rivetPitchM;
      const rv = Math.min(Math.abs(t * strakeM - rivetInM), Math.abs((1 - t) * strakeM - rivetInM));
      if (Math.hypot(along - rivetPitchM / 2, rv) < rivetM) L *= rivet;
    }
    return L;
  };

  let sum = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // `samples` a side inside the texel, averaged in linear light, so a
      // rivet finer than a texel is drawn at its coverage (a metre seam is
      // held to a texel above, so it never is).
      let L = 0;
      for (let j = 0; j < samples; j++)
        for (let i = 0; i < samples; i++)
          L += shade((x + (i + 0.5) / samples) / size, (y + (j + 0.5) / samples) / size);
      L /= samples * samples;
      L += grain * (hash(x, y) - 0.5);
      L = Math.min(1, Math.max(0, L));
      sum += L;
      pixels[y * size + x] = Math.round(255 * toSrgb(L));
    }
  }
  return {
    size,
    pixels,
    png: encodeGray(size, size, pixels),
    bands,
    wrapM: PLATES * plateM,
    mean: sum / (size * size),
  };
}

/** The band whose strakes over `crossM` come nearest `strakeM`. */
function bandFor(bands, crossM, strakeM) {
  if (!(crossM > 0)) return bands[0];
  let best = bands[0];
  let bestD = Infinity;
  for (const b of bands) {
    const d = Math.abs(Math.log(crossM / (b.rows * strakeM)));
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/**
 * The local axis a round geometry turns about: the one its vertices,
 * projected across it, spread most evenly — a ring is as wide as it is
 * tall, and a tall drum seen along its length is a bar. Read as the ratio
 * of the projection's covariance eigenvalues; between two axes within a
 * fiftieth of each other (a sphere, a cube-like drum) the one whose radial
 * distances vary least decides.
 */
function roundAxis(g) {
  const p = g.attributes.position;
  let best = 1;
  let bestIso = -Infinity;
  let bestCv = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    const a = (axis + 1) % 3;
    const b = (axis + 2) % 3;
    let sa = 0;
    let sb = 0;
    let saa = 0;
    let sbb = 0;
    let sab = 0;
    let sr = 0;
    let srr = 0;
    for (let i = 0; i < p.count; i++) {
      const c = [p.getX(i), p.getY(i), p.getZ(i)];
      sa += c[a];
      sb += c[b];
      saa += c[a] * c[a];
      sbb += c[b] * c[b];
      sab += c[a] * c[b];
      const r = Math.hypot(c[a], c[b]);
      sr += r;
      srr += r * r;
    }
    const n = p.count;
    const vaa = saa / n - (sa / n) ** 2;
    const vbb = sbb / n - (sb / n) ** 2;
    const vab = sab / n - (sa / n) * (sb / n);
    const half = (vaa + vbb) / 2;
    const spread = Math.sqrt(Math.max(0, ((vaa - vbb) / 2) ** 2 + vab * vab));
    const iso = half + spread > 0 ? (half - spread) / (half + spread) : 0;
    const mean = sr / n;
    const cv = mean > 0 ? Math.sqrt(Math.max(0, srr / n - mean * mean)) / mean : Infinity;
    if (iso > bestIso + 0.02 || (Math.abs(iso - bestIso) <= 0.02 && cv < bestCv)) {
      bestIso = Math.max(iso, bestIso);
      bestCv = cv;
      best = axis;
    }
  }
  return best;
}

/** The world axis least along `a`, as occlusion.mjs seeds a chart's basis. */
function least(a) {
  const ax = Math.abs(a.x);
  const ay = Math.abs(a.y);
  const az = Math.abs(a.z);
  return ax <= ay && ax <= az
    ? new THREE.Vector3(1, 0, 0)
    : ay <= az
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);
}

/**
 * Lay every mesh of `root` out on the sheet, writing `uv`, and tag each
 * solid unlit material with the sheet's `name` (`userData.trim`, the file's
 * `extras.trim`) — but for the names in `untagged`, which are laid out and
 * left bare (#1109): a navy's sheet is its panelling, and a solid unlit
 * cladding that is not panelling — the Order's violet crystal — would wear
 * ceramic seams under it otherwise. The layout still lands on those parts,
 * so tagging one later is a table edit and not a re-layout. Returns
 * `{ parts, materials, flat, round, split, bands }`: `materials` the names
 * tagged, `flat` and `round` the triangles laid each way, `split` the
 * vertices added, `bands` how many faces took each band's rows.
 */
export function layoutTrim(root, sheet, { strakeM = 6, name, untagged = [], mirror = false } = {}) {
  if (!name) throw new Error("layoutTrim: the sheet needs a name (the navy's TRIM.name)");
  const bare = new Set(untagged);
  root.updateMatrixWorld(true);
  const { bands, wrapM } = sheet;
  const seen = new Set();
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    // A geometry two meshes share stands in two places, so the second gets
    // its own copy, as occlusion.mjs gives it one.
    if (seen.has(o.geometry)) o.geometry = o.geometry.clone();
    seen.add(o.geometry);
    meshes.push(o);
  });
  if (meshes.length === 0) throw new Error('layoutTrim: no meshes');

  const materials = new Set();
  const used = new Map(bands.map((b) => [b.rows, 0]));
  let flat = 0;
  let round = 0;
  let split = 0;
  for (const mesh of meshes) {
    const stats = layoutMesh(mesh, bands, wrapM, strakeM, mirror);
    flat += stats.flat;
    round += stats.round;
    split += stats.split;
    for (const [rows, n] of stats.bands) used.set(rows, used.get(rows) + n);
    const m = mesh.material;
    const unlit = !m.emissive || m.emissive.getHex() === 0;
    const solid = occludes({
      alpha: m.transparent ? 'BLEND' : m.alphaTest > 0 ? 'MASK' : 'OPAQUE',
      opacity: m.opacity ?? 1,
    });
    if (unlit && solid && !bare.has(m.name)) {
      materials.add(m.name);
      m.userData.trim = name;
    }
  }
  return { parts: meshes.length, materials, flat, round, split, bands: used };
}

function layoutMesh(mesh, bands, wrapM, strakeM, mirror) {
  const g = mesh.geometry;
  const p = g.attributes.position;
  const idx = g.index;
  const count = idx ? idx.count : p.count;
  const m = mesh.matrixWorld;
  const corner = new Uint32Array(count);
  const pos = new Float64Array(count * 3);
  const v = new THREE.Vector3();
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < count; k++) {
    const i = idx ? idx.getX(k) : k;
    corner[k] = i;
    v.fromBufferAttribute(p, i).applyMatrix4(m);
    pos[k * 3] = v.x;
    pos[k * 3 + 1] = v.y;
    pos[k * 3 + 2] = v.z;
    for (let a = 0; a < 3; a++) {
      const c = pos[k * 3 + a];
      if (c < min[a]) min[a] = c;
      if (c > max[a]) max[a] = c;
    }
  }
  const extent = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  // Under `mirror`, a flat face laid along the beam measures `u` from the
  // centreline out instead of from the part's own low edge (#1109, at
  // review): from the inboard edge on a part wholly to one side, so a port
  // part's joints land at its starboard twin's |z| where the low edge was
  // inboard on one and outboard on the other, and from z 0 on a part across
  // the keel, set half a plate out so the centreline is mid-plate — under
  // u → 0.5 − u a plate's index keeps its parity (⌊1 − 2u⌋ ≡ ⌊2u⌋ mod 2),
  // so the tones keyed on it mirror too, where a joint on the centreline
  // would swap them. Along x or y a face's `u` is already the same on both
  // sides, and `v` across the beam is the sheet's own symmetry to keep.
  const beamU = (z) =>
    min[2] >= 0
      ? (z - min[2]) / wrapM
      : max[2] <= 0
        ? (max[2] - z) / wrapM
        : z / wrapM + 0.5 / PLATES;
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const face = new THREE.Vector3();
  const faceOf = (t) => {
    const o = t * 9;
    e1.set(pos[o + 3] - pos[o], pos[o + 4] - pos[o + 1], pos[o + 5] - pos[o + 2]);
    e2.set(pos[o + 6] - pos[o], pos[o + 7] - pos[o + 1], pos[o + 8] - pos[o + 2]);
    face.crossVectors(e1, e2);
    if (face.lengthSq() > 0) face.normalize();
    return face;
  };

  const uv = new Float32Array(count * 2);
  const used = new Map(bands.map((b) => [b.rows, 0]));
  let flat = 0;
  let round = 0;

  // A round part: its axis, centre and basis, and every corner's height
  // and angle about it.
  let axis = null;
  let basis = null;
  let height = null;
  let angle = null;
  let hMin = Infinity;
  let hMax = -Infinity;
  let rMax = 0;
  let plates = 1;
  if (ROUND.has(g.type)) {
    axis = new THREE.Vector3().setFromMatrixColumn(m, roundAxis(g)).normalize();
    const u = new THREE.Vector3().crossVectors(axis, least(axis)).normalize();
    const w = new THREE.Vector3().crossVectors(axis, u);
    basis = [u, w];
    const centre = new THREE.Vector3(
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2
    );
    height = new Float64Array(count);
    angle = new Float64Array(count);
    const d = new THREE.Vector3();
    let rSum = 0;
    for (let k = 0; k < count; k++) {
      d.set(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]).sub(centre);
      const h = d.dot(axis);
      height[k] = h;
      if (h < hMin) hMin = h;
      if (h > hMax) hMax = h;
      d.addScaledVector(axis, -h);
      const r = d.length();
      rSum += r;
      if (r > rMax) rMax = r;
      angle[k] = Math.atan2(d.dot(w), d.dot(u));
    }
    plates = Math.max(1, Math.round((2 * Math.PI * (rSum / count)) / (wrapM / PLATES)));
  }

  for (let t = 0; t < count / 3; t++) {
    const n = faceOf(t);
    if (axis && Math.abs(n.dot(axis)) < SIDE) {
      // Unrolled: whole plates round the girth, strakes along the length.
      round++;
      const band = bandFor(bands, hMax - hMin, strakeM);
      used.set(band.rows, used.get(band.rows) + 1);
      const a0 = angle[t * 3];
      for (let c = 0; c < 3; c++) {
        const k = t * 3 + c;
        let th = angle[k];
        if (th - a0 > Math.PI) th -= 2 * Math.PI;
        else if (th - a0 < -Math.PI) th += 2 * Math.PI;
        uv[k * 2] = (th / (2 * Math.PI)) * (plates / PLATES);
        uv[k * 2 + 1] =
          band.v0 + (hMax > hMin ? (height[k] - hMin) / (hMax - hMin) : 0.5) * (band.v1 - band.v0);
      }
      continue;
    }
    flat++;
    if (axis) {
      // A cap, flat on the plane across the axis.
      const band = bandFor(bands, 2 * rMax, strakeM);
      used.set(band.rows, used.get(band.rows) + 1);
      const d = new THREE.Vector3();
      for (let c = 0; c < 3; c++) {
        const k = t * 3 + c;
        d.set(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
        const s = d.dot(basis[0]);
        const w = d.dot(basis[1]);
        uv[k * 2] = (s + rMax) / wrapM;
        uv[k * 2 + 1] = band.v0 + (rMax > 0 ? (w + rMax) / (2 * rMax) : 0.5) * (band.v1 - band.v0);
      }
      continue;
    }
    const ax = Math.abs(n.x);
    const ay = Math.abs(n.y);
    const az = Math.abs(n.z);
    const dominant = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2;
    const a1 = (dominant + 1) % 3;
    const a2 = (dominant + 2) % 3;
    const along = extent[a1] >= extent[a2] ? a1 : a2;
    const cross = along === a1 ? a2 : a1;
    const band = bandFor(bands, extent[cross], strakeM);
    used.set(band.rows, used.get(band.rows) + 1);
    for (let c = 0; c < 3; c++) {
      const k = t * 3 + c;
      uv[k * 2] =
        mirror && along === 2
          ? beamU(pos[k * 3 + 2])
          : (pos[k * 3 + along] - min[along]) / wrapM;
      uv[k * 2 + 1] =
        band.v0 +
        (extent[cross] > 0 ? (pos[k * 3 + cross] - min[cross]) / extent[cross] : 0.5) *
          (band.v1 - band.v0);
    }
  }

  const split = writeUv(g, uv, corner);
  return { flat, round, split, bands: used };
}

/**
 * Write each corner's `uv` and, on an indexed geometry, split the vertices
 * whose corners disagree, so one index holds one UV. Nothing moves: a
 * split copies a vertex's every attribute as it was. Returns the vertices
 * added.
 */
function writeUv(g, uv, corner) {
  if (!g.index) {
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return 0;
  }
  const vertices = g.attributes.position.count;
  const remap = new Map();
  const newIndex = [];
  const sources = [];
  for (let k = 0; k < corner.length; k++) {
    const key = `${corner[k]}:${uv[k * 2].toFixed(5)}:${uv[k * 2 + 1].toFixed(5)}`;
    let v = remap.get(key);
    if (v === undefined) {
      v = sources.length;
      remap.set(key, v);
      sources.push(k);
    }
    newIndex.push(v);
  }
  for (const [name, attr] of Object.entries(g.attributes)) {
    if (name === 'uv') continue;
    const out = new Float32Array(sources.length * attr.itemSize);
    for (let v = 0; v < sources.length; v++) {
      const i = corner[sources[v]];
      for (let j = 0; j < attr.itemSize; j++)
        out[v * attr.itemSize + j] = attr.array[i * attr.itemSize + j];
    }
    g.setAttribute(name, new THREE.Float32BufferAttribute(out, attr.itemSize, attr.normalized));
  }
  const laid = new Float32Array(sources.length * 2);
  for (let v = 0; v < sources.length; v++) {
    laid[v * 2] = uv[sources[v] * 2];
    laid[v * 2 + 1] = uv[sources[v] * 2 + 1];
  }
  g.setAttribute('uv', new THREE.Float32BufferAttribute(laid, 2));
  g.setIndex(newIndex);
  return sources.length - vertices;
}
