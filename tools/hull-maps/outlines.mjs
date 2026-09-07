/**
 * The plan outline of every modelled hull, generated from its GLB and
 * committed as TypeScript — the second output of the model table, beside
 * the maps.
 *
 * HULL_OUTLINE in packages/frontend/src/game/silhouettes.ts is what a Tier-4
 * enemy TRACK renders under the Asymmetric Fidelity Law, so it has to stay a
 * cheap in-repo array for every kind: the runtime never reads a GLB. It used
 * to be hand-drawn for all thirty-six, which meant a hull whose model had
 * been approved carried its plan shape twice — once in the model, once as
 * fractions typed out by eye — with nothing keeping the two in agreement.
 * This step draws the modelled ones *from* the model, so a hull has one plan
 * shape and the hand-drawn set shrinks to the kinds still waiting for art.
 *
 *   node tools/hull-maps/outlines.mjs   # writes hullOutlines.generated.ts
 *
 * The model is normalised exactly as the bake normalises it (Z-long exports
 * yawed onto X, rescaled to the design length, centred), so the outline sits
 * on the sprite it will be drawn beside. Then the hull is cut athwartships at
 * `STATIONS` planes and each cut's port and starboard extremes become the
 * outline — the widest thing at every station, which is what a sonar return
 * resolves to and why a wing tip counts and a gap under it does not. Each
 * side is then passed through a running median `SMOOTH` stations wide, which
 * drops anything narrower along the hull than a couple of metres — a spine,
 * a folded limb, one hydrophone — while a boom, a wing or a mandible comes
 * through whole: a return is the mass of the hull, not its bristles. The
 * polygon is simplified to `TOLERANCE` of the length so a track stays a
 * couple of dozen vertices.
 *
 * tools/hull-models/check.mjs regenerates this in memory and fails when the
 * committed file disagrees, so a re-approved model cannot leave a stale
 * outline behind.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import prettier from 'prettier';
import { readGlb, boundsOf } from '../hull-models/glb.mjs';
import { UNITS } from './models.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const OUTLINE_FILE = join(repo, 'packages/frontend/src/game/hullOutlines.generated.ts');
const STATIONS = 80;
const SMOOTH = 3;
const TOLERANCE = 0.015;
const NAVIES = ['bathyarch', 'pelagia', 'directorate', 'hadron'];

/** The kind's canonical row: a slug without a navy suffix. */
export const canonicalUnits = () =>
  UNITS.filter((u) => !NAVIES.some((n) => u.slug.endsWith(`-${n}`)));

/** 'abyssal-submersible' → 'AbyssalSubmersible', the UnitKind member. */
export const kindOf = (slug) =>
  slug
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');

/**
 * The plan outline of a model, in unit space: length 1 along +X, bow at
 * +0.5, port at +Y (the bake's world +Z, which it maps to image down — the
 * same convention hullTextures.ts draws the outline into). Bow first, down
 * the port side, back up the starboard.
 */
export function planOutline(parts, lengthM, opts = {}) {
  const { stations = STATIONS, smooth = SMOOTH, tolerance = TOLERANCE } = opts;
  // Normalise as bake.mjs does, in the same order.
  let all = parts.flatMap((p) => Array.from(p.positions));
  let { min, max } = boundsOf([{ positions: all }]);
  if (max[2] - min[2] > max[0] - min[0]) {
    for (let i = 0; i < all.length; i += 3) {
      const x = all[i];
      all[i] = all[i + 2];
      all[i + 2] = -x;
    }
    ({ min, max } = boundsOf([{ positions: all }]));
  }
  const scale = lengthM / (max[0] - min[0]);
  const cx = (min[0] + max[0]) / 2;
  const cz = (min[2] + max[2]) / 2;

  // Cut at every station: each triangle edge that crosses the plane gives a
  // z, and the extremes of those are the hull's beam there.
  const port = new Array(stations + 1).fill(-Infinity);
  const stbd = new Array(stations + 1).fill(Infinity);
  const xAt = (i) => {
    const t = 0.5 - i / stations;
    // The end planes sit a hair inside the extremes, or they cut nothing.
    return cx + (Math.max(-0.499, Math.min(0.499, t)) * lengthM) / scale;
  };
  const xs = Array.from({ length: stations + 1 }, (_, i) => xAt(i));
  for (let t = 0; t < all.length; t += 9) {
    const v = [
      [all[t], all[t + 2]],
      [all[t + 3], all[t + 5]],
      [all[t + 6], all[t + 8]],
    ];
    const lo = Math.min(v[0][0], v[1][0], v[2][0]);
    const hi = Math.max(v[0][0], v[1][0], v[2][0]);
    for (let i = 0; i <= stations; i++) {
      const X = xs[i];
      if (X < lo || X > hi) continue;
      for (let e = 0; e < 3; e++) {
        const [ax, az] = v[e];
        const [bx, bz] = v[(e + 1) % 3];
        if ((ax - X) * (bx - X) > 0) continue;
        const z = ax === bx ? az : az + ((bz - az) * (X - ax)) / (bx - ax);
        if (z > port[i]) port[i] = z;
        if (z < stbd[i]) stbd[i] = z;
        if (ax === bx) {
          if (bz > port[i]) port[i] = bz;
          if (bz < stbd[i]) stbd[i] = bz;
        }
      }
    }
  }

  const unit = (x, z) => [((x - cx) * scale) / lengthM, ((z - cz) * scale) / lengthM];
  const keep = [...port.keys()].filter((i) => Number.isFinite(port[i]));
  const smoothed = (side) => {
    const half = Math.floor(smooth / 2);
    return keep.map((_, k) => {
      const win = keep.slice(Math.max(0, k - half), k + half + 1).map((i) => side[i]);
      win.sort((a, b) => a - b);
      return win[Math.floor(win.length / 2)];
    });
  };
  const sp = smoothed(port);
  const ss = smoothed(stbd);
  const chainP = keep.map((i, k) => unit(xs[i], sp[k]));
  const chainS = keep.map((i, k) => unit(xs[i], ss[k]));
  const bow = [0.5, (chainP[0][1] + chainS[0][1]) / 2];
  const stern = [-0.5, (chainP.at(-1)[1] + chainS.at(-1)[1]) / 2];
  const pts = [
    ...simplify([bow, ...chainP, stern], tolerance),
    ...simplify([stern, ...chainS.reverse(), bow], tolerance).slice(1, -1),
  ];
  return pts.map(([x, y]) => [round(x), round(y)]);
}

const round = (v) => Math.round(v * 1000) / 1000 + 0; // +0 turns -0 into 0

/** Douglas–Peucker on an open chain; the endpoints always survive. */
function simplify(chain, tol) {
  if (chain.length <= 2) return chain;
  const [a, b] = [chain[0], chain.at(-1)];
  let worst = 0;
  let at = 0;
  for (let i = 1; i < chain.length - 1; i++) {
    const d = pointToSegment(chain[i], a, b);
    if (d > worst) {
      worst = d;
      at = i;
    }
  }
  if (worst <= tol) return [a, b];
  return [...simplify(chain.slice(0, at + 1), tol).slice(0, -1), ...simplify(chain.slice(at), tol)];
}

function pointToSegment([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Every canonical modelled kind with its outline, from the committed GLBs. */
export function generatedOutlines() {
  return canonicalUnits().map((u) => ({
    slug: u.slug,
    kind: kindOf(u.slug),
    model: u.model,
    outline: planOutline(readGlb(join(repo, 'docs/concept-art/models', u.model)).parts, u.lengthM),
  }));
}

/** The TypeScript module, formatted as the repo formats it. */
export async function renderSource(entries = generatedOutlines()) {
  const body = entries
    .map(
      (e) =>
        `  // ${e.model}\n  [UnitKind.${e.kind}]: [${e.outline.map(([x, y]) => `[${x}, ${y}]`).join(', ')}],`
    )
    .join('\n');
  const src = `/**
 * GENERATED by tools/hull-maps/outlines.mjs from the approved models in
 * docs/concept-art/models/ — do not edit. Regenerate with
 *
 *   node tools/hull-maps/outlines.mjs
 *
 * The plan outline of every modelled hull, in HULL_OUTLINE's unit space
 * (length 1 along +X, bow at +0.5, port at +Y), for the Tier-4 track and the
 * flat silhouette; silhouettes.ts hand-draws the kinds without a model.
 * tools/hull-models/check.mjs fails the build when this file and the models
 * disagree.
 */
import { UnitKind } from '@echoes/shared';

export const GENERATED_HULL_OUTLINE = {
${body}
} satisfies Partial<Record<UnitKind, number[][]>>;

/** The kinds whose outline is drawn from a model rather than by hand. */
export type ModelledUnitKind = keyof typeof GENERATED_HULL_OUTLINE;
`;
  const options = (await prettier.resolveConfig(OUTLINE_FILE)) ?? {};
  return prettier.format(src, { ...options, filepath: OUTLINE_FILE });
}

/** Write the module; returns true when the file changed. */
export async function writeOutlines() {
  const src = await renderSource();
  let before = null;
  try {
    before = readFileSync(OUTLINE_FILE, 'utf8');
  } catch {
    /* first run */
  }
  writeFileSync(OUTLINE_FILE, src);
  const n = canonicalUnits().length;
  console.log(`${OUTLINE_FILE}: ${n} outlines${before === src ? ' (unchanged)' : ''}`);
  return before !== src;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await writeOutlines();
}
