/**
 * Author the Block 4 environment props as GLBs — docs/asset-prompts-3d.md
 * "Block 4 — ENVIRONMENT", docs/graphics-standards.md "The environment branch".
 *
 * The prompt kit expects these models to come out of a Claude Design batch.
 * Until that batch exists this script is the author of record: every row of
 * the Block 4 table is built here as low-poly, flat-shaded geometry in the
 * row's own footprint and height, with at most two materials and the row's
 * licensed world-light family as its only emissive. The output goes through
 * exactly the same door a Claude Design export would — hull-intake
 * `--category env`, then a registry row — so a generated model can be
 * replaced by an approved export slug for slug with no code change.
 *
 * Deterministic on purpose: the geometry is seeded from the slug, so a rerun
 * writes byte-identical files and a diff on docs/concept-art/models/ means a
 * change here, not noise. Metre-true, base at Y=0, larger footprint axis held
 * to the table's number — intake reports ×1.000 and no rotation warning.
 *
 * Not an npm workspace — run it directly, like tools/hull-maps:
 *   node tools/env-props/build.mjs [--out docs/concept-art/models] [slug ...]
 *
 * Shape language follows the biome briefs in docs/environments.md and the
 * "Environmental Shapes" section of docs/art-direction.md: vent props are
 * basalt and magma glass, kelp is the forty-metre column, trench props are
 * knife-edged, resonance props are faceted, ruins are right angles under
 * coral, crags are the jagged-rock vocabulary for mesa edges. Nothing here is
 * manufactured — no machinery, no faction markings — and every material sits
 * in the dark desaturated register the ENV STYLE block pins.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// --- args ------------------------------------------------------------------
const argv = process.argv.slice(2);
const outFlag = argv.indexOf('--out');
const outDir = resolve(outFlag >= 0 ? argv[outFlag + 1] : join(repo, 'docs/concept-art/models'));
const only = argv.filter((a, i) => !a.startsWith('--') && (outFlag < 0 || i !== outFlag + 1));

// --- deterministic randomness ------------------------------------------------
function seedOf(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- world-light tokens (docs/style-neon-noir.md "World light") -------------
// Linear emissive factors, held well under the ember's own render level so no
// prop outshines the seabed's ember points (rule 2: the ember is the ceiling).
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
const WORLD_LIGHT = {
  vent: hex(0xe06a2b).map((c) => c * 0.45),
  flora: hex(0x2e8c74).map((c) => c * 0.6),
  crystal: hex(0x5b4a8c).map((c) => c * 0.55),
};

// --- geometry ---------------------------------------------------------------
/** A flat-shaded triangle soup for one material. */
class Part {
  constructor() {
    this.tris = [];
  }
  tri(a, b, c) {
    this.tris.push([a, b, c]);
  }
  quad(a, b, c, d) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }
  /** Flip any face whose normal points toward `ref` — the lathes and boxes
   * here are all star-shaped about their reference, so this is exact. */
  faceOutward(refOf) {
    this.tris = this.tris.map(([a, b, c]) => {
      const n = normal(a, b, c);
      const cx = (a[0] + b[0] + c[0]) / 3;
      const cy = (a[1] + b[1] + c[1]) / 3;
      const cz = (a[2] + b[2] + c[2]) / 3;
      const ref = refOf([cx, cy, cz]);
      const dot = n[0] * (cx - ref[0]) + n[1] * (cy - ref[1]) + n[2] * (cz - ref[2]);
      return dot < 0 ? [a, c, b] : [a, b, c];
    });
  }
  map(fn) {
    this.tris = this.tris.map((t) => t.map(fn));
    return this;
  }
  append(other) {
    this.tris.push(...other.tris);
  }
}

function normal(a, b, c) {
  const ux = b[0] - a[0],
    uy = b[1] - a[1],
    uz = b[2] - a[2];
  const vx = c[0] - a[0],
    vy = c[1] - a[1],
    vz = c[2] - a[2];
  const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const l = Math.hypot(...n) || 1;
  return n.map((x) => x / l);
}

const rotX = (a) => (p) => [
  p[0],
  p[1] * Math.cos(a) - p[2] * Math.sin(a),
  p[1] * Math.sin(a) + p[2] * Math.cos(a),
];
const rotY = (a) => (p) => [
  p[0] * Math.cos(a) + p[2] * Math.sin(a),
  p[1],
  -p[0] * Math.sin(a) + p[2] * Math.cos(a),
];
const rotZ = (a) => (p) => [
  p[0] * Math.cos(a) - p[1] * Math.sin(a),
  p[0] * Math.sin(a) + p[1] * Math.cos(a),
  p[2],
];
const move = (x, y, z) => (p) => [p[0] + x, p[1] + y, p[2] + z];

/**
 * A jittered lathe: horizontal rings of `sides` points at the given heights
 * and radii, skinned into quads, capped as asked. `jitter` roughens each
 * ring point's radius, `sx`/`sz` squash the section, `twist` rotates each
 * successive ring. `columns(j)` (optional) says how many rings column j
 * carries, which is how a broken shell gets its ragged edge.
 */
function lathe(rng, opts) {
  const {
    sides,
    rings,
    jitter = 0,
    cap = 'flat',
    bottom = false,
    twist = 0,
    sx = 1,
    sz = 1,
  } = opts;
  const arc = opts.arc ?? [0, Math.PI * 2];
  const closed = opts.arc === undefined;
  const columns = closed ? sides : sides + 1;
  const points = rings.map((ring, ri) =>
    Array.from({ length: columns }, (_, j) => {
      const t = arc[0] + ((arc[1] - arc[0]) * j) / sides + twist * ri;
      const r = ring.r * (1 + jitter * (rng() * 2 - 1));
      const y = ring.y + (ring.jitterY ?? 0) * (rng() * 2 - 1);
      return [Math.cos(t) * r * sx + (ring.x ?? 0), y, Math.sin(t) * r * sz + (ring.z ?? 0)];
    })
  );
  const ringsFor = opts.columns ?? (() => rings.length);
  const part = new Part();
  for (let ri = 0; ri + 1 < rings.length; ri++) {
    for (let j = 0; j < sides; j++) {
      const k = (j + 1) % columns;
      if (ringsFor(j) <= ri + 1 || ringsFor(k) <= ri + 1) continue;
      const lower = points[ri],
        upper = points[ri + 1];
      if (rings[ri + 1].r === 0) part.tri(lower[j], lower[k], upper[j]);
      else part.quad(lower[j], upper[j], upper[k], lower[k]);
    }
  }
  const fan = (ring, index) => {
    const c = [ring.x ?? 0, ring.y, ring.z ?? 0];
    for (let j = 0; j < sides; j++) part.tri(c, points[index][j], points[index][(j + 1) % columns]);
  };
  if (cap === 'flat' && rings[rings.length - 1].r > 0)
    fan(rings[rings.length - 1], rings.length - 1);
  if (bottom) fan(rings[0], 0);
  // Outward is away from the lathe's own axis at that height — the axis
  // wanders for an offset chimney or a leaning strand, so interpolate it.
  const axisAt = (y) => {
    let i = 0;
    while (i + 2 < rings.length && rings[i + 1].y < y) i++;
    const a = rings[i],
      b = rings[i + 1];
    const t = b.y === a.y ? 0 : Math.min(1, Math.max(0, (y - a.y) / (b.y - a.y)));
    return [
      (a.x ?? 0) + ((b.x ?? 0) - (a.x ?? 0)) * t,
      y,
      (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t,
    ];
  };
  const top = rings[rings.length - 1].y,
    base = rings[0].y;
  part.faceOutward(([, y]) => axisAt(Math.min(Math.max(y, base + 0.01), top - 0.01)));
  return part;
}

/** A box with jittered corners, centred on XZ, base at y=0. */
function block(rng, w, h, d, jitter = 0) {
  const j = () => jitter * (rng() * 2 - 1);
  const c = (x, y, z) => [x * w * 0.5 + j(), y * h + j(), z * d * 0.5 + j()];
  const v = [
    c(-1, 0, -1),
    c(1, 0, -1),
    c(1, 0, 1),
    c(-1, 0, 1),
    c(-1, 1, -1),
    c(1, 1, -1),
    c(1, 1, 1),
    c(-1, 1, 1),
  ];
  const part = new Part();
  part.quad(v[0], v[1], v[2], v[3]);
  part.quad(v[4], v[5], v[6], v[7]);
  part.quad(v[0], v[1], v[5], v[4]);
  part.quad(v[1], v[2], v[6], v[5]);
  part.quad(v[2], v[3], v[7], v[6]);
  part.quad(v[3], v[0], v[4], v[7]);
  part.faceOutward(() => [0, h / 2, 0]);
  return part;
}

/** Ring list for a tapering column: `n` rings from base radius to top. */
function taper(height, rBase, rTop, n, ease = 1) {
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return { y: height * t, r: rBase + (rTop - rBase) * Math.pow(t, ease) };
  });
}

/** A kelp strand: a three-sided column following a leaning, bending path. */
function strand(rng, height, lean, phase, radius) {
  const segments = 7;
  const rings = Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const drift = Math.sin(t * Math.PI * 1.3 + phase) * height * 0.035;
    return {
      y: height * t,
      r: i === segments ? 0 : radius * (1 - 0.55 * t),
      x: lean[0] * Math.pow(t, 1.6) * height + drift * Math.cos(phase),
      z: lean[1] * Math.pow(t, 1.6) * height + drift * Math.sin(phase),
    };
  });
  const body = lathe(rng, { sides: 3, rings, cap: 'none', twist: 0.35 });
  const tip = rings[segments];
  return { body, tip: [tip.x, tip.y, tip.z] };
}

/** A tiny emissive point: a four-faced spike, the "tip point" of the docs. */
function point(at, size) {
  const part = new Part();
  const [x, y, z] = at;
  const a = [x - size, y - size, z - size],
    b = [x + size, y - size, z - size],
    c = [x, y - size, z + size],
    d = [x, y + size, z];
  part.tri(a, b, d);
  part.tri(b, c, d);
  part.tri(c, a, d);
  part.tri(a, c, b);
  part.faceOutward(() => [x, y - size * 0.3, z]);
  return part;
}

// --- the props ------------------------------------------------------------------
// One builder per Block 4 row. Each returns { stone: Part, light?: Part } in
// metres, roughly in the table's footprint and height; normalisation below
// holds the footprint exactly.
const STONE = {
  basalt: [0.11, 0.09, 0.085],
  kelp: [0.07, 0.13, 0.1],
  coral: [0.14, 0.12, 0.11],
  trench: [0.06, 0.065, 0.08],
  crystal: [0.13, 0.11, 0.17],
  ruin: [0.11, 0.12, 0.13],
  rock: [0.09, 0.1, 0.11],
};

const PROPS = [
  {
    slug: 'env-vent-chimney',
    footprintM: 12,
    light: 'vent',
    stone: STONE.basalt,
    build(rng) {
      const stone = new Part();
      const light = new Part();
      const chimney = (height, rBase, x, z, sides) => {
        const rings = taper(height, rBase, rBase * 0.28, 6, 0.8).map((r) => ({ ...r, x, z }));
        stone.append(lathe(rng, { sides, rings, jitter: 0.22, cap: 'flat', twist: 0.12 }));
        // The mouth: an ember-lit disc set just inside the lip — tip only.
        const mouth = rings[rings.length - 1];
        light.append(
          lathe(rng, {
            sides,
            rings: [
              { y: mouth.y - 0.6, r: mouth.r * 0.55, x, z },
              { y: mouth.y + 0.15, r: mouth.r * 0.5, x, z },
            ],
            cap: 'flat',
          })
        );
      };
      chimney(32, 3.6, 0, 0, 8);
      chimney(19, 2.4, 4.2, -1.5, 7);
      chimney(10, 1.8, -3.4, 2.8, 6);
      // Basalt skirt: cracked slabs heaped at the base.
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        stone.append(
          lathe(rng, {
            sides: 5,
            rings: [
              { y: 0, r: 2.6 },
              { y: 1.6 + rng(), r: 2.1 },
            ],
            jitter: 0.3,
            cap: 'flat',
          }).map(move(Math.cos(a) * 4.2, 0, Math.sin(a) * 4.2))
        );
      }
      return { stone, light };
    },
  },
  {
    slug: 'env-vent-basalt',
    footprintM: 15,
    stone: STONE.basalt,
    build(rng) {
      const stone = new Part();
      // Heat-cracked slabs, tilted against one another like a broken crust.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = 3.5 + rng() * 1.5;
        const h = 3 + rng() * 5;
        const slab = lathe(rng, {
          sides: 6,
          rings: [
            { y: 0, r: r * 1.05 },
            { y: h, r },
          ],
          jitter: 0.2,
          cap: 'flat',
          bottom: true,
          twist: 0.3,
        });
        stone.append(
          slab
            .map(rotX((rng() - 0.5) * 0.5))
            .map(rotZ((rng() - 0.5) * 0.5))
            .map(rotY(a))
            .map(move(Math.cos(a) * 3.6, -0.6, Math.sin(a) * 3.6))
        );
      }
      return { stone };
    },
  },
  {
    slug: 'env-kelp-cluster',
    footprintM: 18,
    light: 'flora',
    stone: STONE.kelp,
    build(rng) {
      const stone = new Part();
      const light = new Part();
      // The holdfast: a low tangle the strands rise from.
      stone.append(
        lathe(rng, {
          sides: 7,
          rings: [
            { y: 0, r: 4.5 },
            { y: 1.4, r: 3.2 },
            { y: 2.2, r: 0.9 },
          ],
          jitter: 0.3,
          cap: 'flat',
        })
      );
      const strands = 6;
      for (let i = 0; i < strands; i++) {
        const a = (i / strands) * Math.PI * 2 + rng() * 0.6;
        const height = 52 + rng() * 22;
        const leanM = 0.05 + rng() * 0.07;
        const { body, tip } = strand(
          rng,
          height,
          [Math.cos(a) * leanM, Math.sin(a) * leanM],
          rng() * Math.PI * 2,
          0.9 + rng() * 0.4
        );
        const base = move(Math.cos(a) * 2.2, 0.5, Math.sin(a) * 2.2);
        stone.append(body.map(base));
        light.append(point(base(tip), 0.55));
      }
      return { stone, light };
    },
  },
  {
    slug: 'env-coral-tower',
    footprintM: 15,
    stone: STONE.coral,
    build(rng) {
      const stone = new Part();
      // Authored short of the row's height: the branches widen the footprint
      // and normalisation scales the whole tower up to the 15 m footprint.
      const trunk = [
        { y: 0, r: 5.2 },
        { y: 4, r: 3.6 },
        { y: 9, r: 4.2 },
        { y: 14, r: 3.0 },
        { y: 18, r: 3.4 },
        { y: 23, r: 1.4 },
      ];
      stone.append(lathe(rng, { sides: 7, rings: trunk, jitter: 0.18, cap: 'flat', twist: 0.2 }));
      // Branches: living coral reaching out and up from the trunk's waist.
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.7;
        const branch = lathe(rng, {
          sides: 5,
          rings: taper(11, 1.6, 0.6, 4),
          jitter: 0.2,
          cap: 'flat',
        });
        stone.append(
          branch
            .map(rotZ(0.9))
            .map(rotY(-a))
            .map(move(Math.cos(a) * 2.5, 9 + i * 2.5, Math.sin(a) * 2.5))
        );
      }
      return { stone };
    },
  },
  {
    slug: 'env-trench-spire',
    footprintM: 20,
    stone: STONE.trench,
    build(rng) {
      const stone = new Part();
      // Knife-edged: a squashed section, so the spire reads as a blade.
      stone.append(
        lathe(rng, {
          sides: 5,
          rings: taper(50, 9, 0, 7, 1.3),
          jitter: 0.15,
          cap: 'none',
          sz: 0.42,
          twist: 0.08,
        })
      );
      stone.append(
        lathe(rng, {
          sides: 5,
          rings: taper(28, 6, 0, 5, 1.2),
          jitter: 0.2,
          cap: 'none',
          sz: 0.5,
        })
          .map(rotY(0.9))
          .map(move(6.5, 0, -3))
      );
      return { stone };
    },
  },
  {
    slug: 'env-trench-slab',
    footprintM: 25,
    stone: STONE.trench,
    build(rng) {
      const stone = new Part();
      const slab = lathe(rng, {
        sides: 7,
        rings: [
          { y: 0, r: 12 },
          { y: 4.5, r: 11 },
        ],
        jitter: 0.12,
        cap: 'flat',
        bottom: true,
        sz: 0.6,
      });
      stone.append(slab.map(rotX(0.22)).map(move(0, 1.5, 0)));
      const lean = lathe(rng, {
        sides: 6,
        rings: [
          { y: 0, r: 6 },
          { y: 3, r: 5.5 },
        ],
        jitter: 0.15,
        cap: 'flat',
        bottom: true,
        sz: 0.7,
      });
      stone.append(
        lean
          .map(rotZ(0.5))
          .map(rotY(0.6))
          .map(move(-3, 3.2, 5))
      );
      return { stone };
    },
  },
  {
    slug: 'env-resonance-crystal',
    footprintM: 12,
    light: 'crystal',
    stone: STONE.crystal,
    build(rng) {
      const stone = new Part();
      const light = new Part();
      const shard = (height, r, tilt, yaw, x, z) => {
        const rings = [
          { y: 0, r: r * 0.9 },
          { y: height * 0.62, r },
          { y: height, r: 0 },
        ];
        const place = (p) => move(x, -0.8, z)(rotY(yaw)(rotX(tilt)(p)));
        stone.append(lathe(rng, { sides: 6, rings, cap: 'none', bottom: true }).map(place));
        // The seam: a narrow strip up one face, standing a hand's width off
        // the surface — a dull internal line, never a lit crystal.
        const seam = new Part();
        const w = r * 0.12,
          out = r + 0.06;
        seam.quad(
          [out, height * 0.12, -w],
          [out, height * 0.12, w],
          [out * 0.98, height * 0.62, w],
          [out * 0.98, height * 0.62, -w]
        );
        seam.faceOutward(() => [0, height * 0.35, 0]);
        light.append(seam.map(place));
      };
      shard(24, 2.4, 0.08, 0.3, 0, 0);
      shard(15, 1.8, 0.45, 2.1, 3.6, 1.2);
      shard(11, 1.5, -0.5, 4.2, -3.2, 2.2);
      shard(9, 1.3, 0.6, 5.4, 1.8, -3.6);
      shard(7, 1.1, -0.35, 1.2, -2.6, -2.4);
      return { stone, light };
    },
  },
  {
    slug: 'env-resonance-pylon',
    footprintM: 10,
    stone: STONE.crystal,
    build(rng) {
      const stone = new Part();
      // The toppled instrument: a leaning octagonal shaft with a broken top.
      const shaft = lathe(rng, {
        sides: 8,
        rings: [
          { y: 0, r: 2.4 },
          { y: 9, r: 2.1 },
          { y: 18, r: 1.9 },
          { y: 25, r: 1.7, jitterY: 2.2 },
        ],
        jitter: 0.05,
        cap: 'flat',
      });
      stone.append(shaft.map(rotZ(0.12)).map(move(-1.5, 0, 0)));
      stone.append(
        lathe(rng, {
          sides: 8,
          rings: [
            { y: 0, r: 4.4 },
            { y: 1.8, r: 3.6 },
          ],
          jitter: 0.08,
          cap: 'flat',
        }).map(move(-2.4, 0, 0))
      );
      // The broken-off head, fallen beside it.
      stone.append(
        lathe(rng, {
          sides: 8,
          rings: [
            { y: 0, r: 1.7 },
            { y: 5, r: 1.6, jitterY: 1.5 },
          ],
          jitter: 0.06,
          cap: 'flat',
          bottom: true,
        })
          .map(rotX(1.35))
          .map(move(1.5, 1.7, -1))
      );
      return { stone };
    },
  },
  {
    slug: 'env-ruin-block',
    footprintM: 25,
    stone: STONE.ruin,
    build(rng) {
      const stone = new Part();
      // Terraces: right angles stepping back, one course slipped.
      stone.append(block(rng, 24, 7, 18, 0.25));
      stone.append(block(rng, 16, 6, 12, 0.25).map(move(-3, 7, 2)));
      stone.append(
        block(rng, 9, 7, 8, 0.25)
          .map(rotY(0.18))
          .map(move(-4.5, 13, 3))
      );
      stone.append(
        block(rng, 7, 5, 6, 0.3)
          .map(rotY(0.6))
          .map(rotZ(0.25))
          .map(move(8, 6.5, -4))
      );
      // Coral over the stone: low domes on the ledges.
      for (const [x, y, z, r] of [
        [6, 7, 5, 2.6],
        [-8, 13, -3, 2.2],
        [2, 13, 6, 1.8],
      ]) {
        stone.append(
          lathe(rng, {
            sides: 6,
            rings: [
              { y: 0, r },
              { y: r * 0.7, r: r * 0.75 },
              { y: r * 1.1, r: 0 },
            ],
            jitter: 0.2,
            cap: 'none',
          }).map(move(x, y - 0.3, z))
        );
      }
      return { stone };
    },
  },
  {
    slug: 'env-ruin-dome-shard',
    footprintM: 40,
    stone: STONE.ruin,
    doubleSided: true,
    build(rng) {
      const stone = new Part();
      const R = 20;
      const latitudes = 7;
      const rings = Array.from({ length: latitudes + 1 }, (_, i) => {
        const phi = (i / latitudes) * (Math.PI / 2) * 0.92;
        return { y: R * Math.sin(phi), r: R * Math.cos(phi) };
      });
      // A 200° arc of shell whose top edge falls away column by column —
      // the broken dome of a pre-collapse city, coral-crusted.
      const sides = 12;
      const heights = Array.from({ length: sides + 1 }, (_, j) => {
        const edge = Math.min(j, sides - j) / (sides / 2);
        return 3 + Math.round(edge * (latitudes - 2) + rng() * 1.5);
      });
      stone.append(
        lathe(rng, {
          sides,
          rings,
          jitter: 0.03,
          cap: 'none',
          arc: [0, (200 / 180) * Math.PI],
          columns: (j) => heights[j],
        })
      );
      // Fallen courses at the foot of the shell.
      stone.append(
        block(rng, 9, 4, 6, 0.3)
          .map(rotY(0.5))
          .map(move(6, 0, -10))
      );
      stone.append(
        block(rng, 7, 3.5, 5, 0.3)
          .map(rotY(-0.4))
          .map(move(-9, 0, -8))
      );
      return { stone };
    },
  },
  {
    slug: 'env-coral-growth',
    footprintM: 12,
    stone: STONE.coral,
    build(rng) {
      const stone = new Part();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + rng();
        const d = i === 0 ? 0 : 2.6 + rng() * 1.5;
        const r = 1.6 + rng() * 1.4;
        const h = r * (1.6 + rng() * 0.9);
        stone.append(
          lathe(rng, {
            sides: 6,
            rings: [
              { y: 0, r: r * 0.85 },
              { y: h * 0.5, r },
              { y: h * 0.85, r: r * 0.6 },
              { y: h, r: 0 },
            ],
            jitter: 0.2,
            cap: 'none',
          }).map(move(Math.cos(a) * d, -0.2, Math.sin(a) * d))
        );
      }
      // Fingers: thin coral reaching up between the bulbs.
      for (let i = 0; i < 4; i++) {
        const a = rng() * Math.PI * 2;
        stone.append(
          lathe(rng, { sides: 4, rings: taper(4 + rng() * 3, 0.5, 0, 3), cap: 'none' })
            .map(rotX((rng() - 0.5) * 0.6))
            .map(move(Math.cos(a) * 4, 0, Math.sin(a) * 4))
        );
      }
      return { stone };
    },
  },
  {
    slug: 'env-rock-crag-a',
    footprintM: 30,
    stone: STONE.rock,
    build(rng) {
      const stone = new Part();
      const crag = (height, rBase, x, z, yaw) =>
        stone.append(
          lathe(rng, {
            sides: 7,
            rings: taper(height, rBase, rBase * 0.12, 6, 0.9),
            jitter: 0.3,
            cap: 'flat',
            twist: 0.25,
            sz: 0.75,
          })
            .map(rotY(yaw))
            .map(move(x, -0.5, z))
        );
      crag(40, 9, 0, 0, 0.3);
      crag(24, 6.5, 9, 4, 1.4);
      crag(15, 5, -8, -5, 2.6);
      return { stone };
    },
  },
  {
    slug: 'env-rock-crag-b',
    footprintM: 30,
    stone: STONE.rock,
    build(rng) {
      const stone = new Part();
      // Two prongs leaning apart over a shared shoulder — a different
      // silhouette from -a, so a mesa edge never repeats one outline.
      stone.append(
        lathe(rng, {
          sides: 8,
          rings: [
            { y: 0, r: 13 },
            { y: 6, r: 10 },
            { y: 11, r: 6 },
          ],
          jitter: 0.25,
          cap: 'flat',
          sz: 0.8,
        })
      );
      const prong = (height, r, tilt, yaw, x, z) =>
        stone.append(
          lathe(rng, {
            sides: 6,
            rings: taper(height, r, r * 0.1, 5, 1.1),
            jitter: 0.28,
            cap: 'flat',
          })
            .map(rotX(tilt))
            .map(rotY(yaw))
            .map(move(x, 9, z))
        );
      prong(26, 5, 0.2, 0.4, 4, -1);
      prong(19, 4, -0.25, 2.5, -5, 2);
      return { stone };
    },
  },
  {
    slug: 'env-open-boulder',
    footprintM: 12,
    stone: STONE.rock,
    build(rng) {
      const stone = new Part();
      // Half-buried in sediment: the bottom ring sits in the ground.
      stone.append(
        lathe(rng, {
          sides: 8,
          rings: [
            { y: 0, r: 4.6 },
            { y: 2, r: 6 },
            { y: 4.3, r: 4.8 },
            { y: 6, r: 1.6 },
          ],
          jitter: 0.12,
          cap: 'flat',
          sz: 0.85,
        }).map(rotY(0.4))
      );
      stone.append(
        lathe(rng, {
          sides: 6,
          rings: [
            { y: 0, r: 2.2 },
            { y: 1.3, r: 2.6 },
            { y: 2.8, r: 1 },
          ],
          jitter: 0.15,
          cap: 'flat',
        }).map(move(6.2, 0, 3.4))
      );
      return { stone };
    },
  },
];

// --- normalisation: metre-true, footprint held, standing on Y=0 ---------------
function normalise(parts, footprintM) {
  const all = parts.flatMap((p) => p.tris.flat());
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (const v of all)
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], v[a]);
      max[a] = Math.max(max[a], v[a]);
    }
  const footprint = Math.max(max[0] - min[0], max[2] - min[2]);
  const s = footprintM / footprint;
  const cx = (min[0] + max[0]) / 2,
    cz = (min[2] + max[2]) / 2;
  const fix = (p) => [(p[0] - cx) * s, (p[1] - min[1]) * s, (p[2] - cz) * s];
  for (const part of parts) part.map(fix);
  return { heightM: (max[1] - min[1]) * s, scaleApplied: s };
}

// --- GLB ------------------------------------------------------------------------
function writeGlb(path, name, primitives, materials) {
  // Flat shading: three unique vertices per triangle, face normal on each.
  const bins = [];
  const views = [];
  const accessors = [];
  let offset = 0;
  const pushView = (buf, target) => {
    views.push({ buffer: 0, byteOffset: offset, byteLength: buf.length, target });
    bins.push(buf);
    offset += buf.length;
    return views.length - 1;
  };
  const prims = primitives.map(({ part, material }) => {
    const positions = [],
      normals = [],
      indices = [];
    for (const [a, b, c] of part.tris) {
      const n = normal(a, b, c);
      const base = positions.length / 3;
      for (const v of [a, b, c]) {
        positions.push(v[0], v[1], v[2]);
        normals.push(n[0], n[1], n[2]);
      }
      indices.push(base, base + 1, base + 2);
    }
    const round = (x) => Math.round(x * 1000) / 1000;
    const pos = positions.map(round);
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < pos.length; i += 3)
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], pos[i + a]);
        max[a] = Math.max(max[a], pos[i + a]);
      }
    const p = pushView(Buffer.from(new Float32Array(pos).buffer), 34962);
    const nv = pushView(Buffer.from(new Float32Array(normals).buffer), 34962);
    const iv = pushView(Buffer.from(new Uint16Array(indices).buffer), 34963);
    accessors.push(
      { bufferView: p, componentType: 5126, count: pos.length / 3, type: 'VEC3', min, max },
      { bufferView: nv, componentType: 5126, count: pos.length / 3, type: 'VEC3' },
      { bufferView: iv, componentType: 5123, count: indices.length, type: 'SCALAR' }
    );
    const k = accessors.length - 3;
    return { attributes: { POSITION: k, NORMAL: k + 1 }, indices: k + 2, material };
  });
  let bin = Buffer.concat(bins);
  while (bin.length % 4) bin = Buffer.concat([bin, Buffer.from([0])]);

  const gltf = {
    asset: { version: '2.0', generator: 'echoes env-props' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [{ name, primitives: prims }],
    materials,
    accessors,
    bufferViews: views,
    buffers: [{ byteLength: bin.length }],
  };
  let json = Buffer.from(JSON.stringify(gltf));
  while (json.length % 4) json = Buffer.concat([json, Buffer.from(' ')]);
  const header = Buffer.alloc(12);
  header.write('glTF', 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(json.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);
  writeFileSync(path, Buffer.concat([header, jsonHeader, json, binHeader, bin]));
}

// --- main ------------------------------------------------------------------------
mkdirSync(outDir, { recursive: true });
const selected = only.length > 0 ? PROPS.filter((p) => only.includes(p.slug)) : PROPS;
if (selected.length === 0) {
  console.error(`no such prop: ${only.join(', ')}\nknown: ${PROPS.map((p) => p.slug).join(', ')}`);
  process.exit(1);
}
for (const prop of selected) {
  const rng = mulberry32(seedOf(prop.slug));
  const { stone, light } = prop.build(rng);
  const parts = light ? [stone, light] : [stone];
  const { heightM } = normalise(parts, prop.footprintM);
  const materials = [
    {
      name: 'stone',
      pbrMetallicRoughness: {
        baseColorFactor: [...prop.stone, 1],
        metallicFactor: 0,
        roughnessFactor: 0.92,
      },
      ...(prop.doubleSided ? { doubleSided: true } : {}),
    },
  ];
  const primitives = [{ part: stone, material: 0 }];
  if (light) {
    if (!prop.light) throw new Error(`${prop.slug} carries light but licenses no family`);
    materials.push({
      name: `light-${prop.light}`,
      pbrMetallicRoughness: {
        baseColorFactor: [0.02, 0.02, 0.02, 1],
        metallicFactor: 0,
        roughnessFactor: 1,
      },
      emissiveFactor: WORLD_LIGHT[prop.light],
    });
    primitives.push({ part: light, material: 1 });
  }
  const triangles = parts.reduce((n, p) => n + p.tris.length, 0);
  const file = join(outDir, `${prop.slug}.glb`);
  writeGlb(file, prop.slug, primitives, materials);
  console.log(
    `${prop.slug.padEnd(24)} ${String(triangles).padStart(4)} tris  ` +
      `${prop.footprintM} m footprint  ${heightM.toFixed(1)} m tall  ` +
      `${materials.length} material(s)${prop.light ? `  light: ${prop.light}` : ''}`
  );
}
