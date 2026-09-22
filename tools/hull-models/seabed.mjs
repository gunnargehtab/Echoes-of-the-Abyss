/**
 * The seabed — the environment's shape language: what a navy's module is to
 * its fleet, this is to the ground (#869, off #540 Phase 5).
 *
 * "Environment props dress the biomes the terrain grid already declares —
 * they are world geometry, not agents, so the STYLE block changes: no
 * faction palette, no running lights, no glow-by-loudness. A prop's light,
 * where it has any at all, comes from the three world-light families"
 * (docs/asset-prompts-3d.md, Block 4). A prop belongs to nobody, so a
 * prop script composes from here rather than from `factions/`: the Block 4
 * materials as the fourteen approved files carry them, the builders more
 * than one prop needs, and the root every prop stands on.
 *
 * Three things about the fourteen files are worth knowing before reading
 * one, and this module is where they are written down:
 *
 * - **Every stone part is a table.** `parts.mjs` prints a crag's peak as
 *   "non-indexed, 48 triangles — an extrusion, a sweep or a table", and the
 *   count is a three constructor's (a six-facet drum on three height rows,
 *   both caps), but the vertices are not: the generator jittered each
 *   vertex by index and kept no formula, tearing the seams and the cap
 *   centres apart as it went. So a peak is three's topology under the
 *   export's own vertices (kit.mjs `tabled`, `drum` below), a trench slab
 *   is a polyhedron stitched by hand (kit.mjs `faceted`, `prism` and
 *   `chunk`), and a script transcribes rather than fits — "a formula that
 *   nearly fits is a different prop". The three parts of the five stone
 *   props that *are* a formula (a crag's three ledges, the boulder's crack)
 *   are written as one.
 * - **Two names carry two finishes.** `coral_stone` is #3A2B24 at roughness
 *   0.95 on the coral growth, the ruin block and the dome shard and #171D19
 *   at 1 on the coral tower; `basalt` is #14171A on the trench pair and
 *   #121517 on the vent pair. A port reproduces its own file's value and
 *   `check.mjs`, the bake and `diff.mjs` all match a material by *name*, so
 *   both are here under names that say which is which, and a script takes
 *   the one its file carries. Nothing was resolved: which value is right is
 *   a finding for the docs, not for a port.
 * - **No stone hex is a doc token.** The three lights are
 *   docs/style-neon-noir.md "World light" to the digit (`vent-ember`
 *   #E06A2B, `flora-biolight` #2E8C74, `crystal-seam` #5B4A8C, at the
 *   strengths the doc's luminance figures were taken from). Every base
 *   colour — the stones, the kelp, the three lamps' near-black bases — is
 *   the Claude Design batch's own and appears in no table in
 *   docs/style-neon-noir.md, docs/environments.md or Block 4; the stone
 *   ramp's `rock-face` #11161C and `rock-shadow` #080C12 are the terrain
 *   bake's and no file uses them. They are cited as the hex the file
 *   carries (kit.mjs `hex`, #630), not given a token they do not have.
 *
 * Every file is X-long or square in plan and every node's transform is an
 * XYZ Euler the generator set (the crag's `peak_fourth` prints as
 * (−π, 1.34, −π), which is a yaw of 1.8), so a prop places its parts with
 * kit.mjs `add` and the file's own numbers, no `drawn`.
 */
import { THREE, clad, lamp, hex, box, flatShaded, tabled } from './kit.mjs';

/**
 * The palette, as the fourteen files carry it: eight stones and three
 * lights. Metalness is 0 on every material in the set — "nothing
 * manufactured" (ENV STYLE) — and roughness the file's own. A lamp is
 * kit.mjs `lamp`: the file's near-black base, its emissive at the doc's
 * world-light token, its `KHR_materials_emissive_strength`.
 */
export const ground = {
  /**
   * Dark stone: the two crags, the coral growth and the ruin block; two-sided
   * on the dome shard, whose file flags it so (a shard is seen from inside).
   */
  stoneDark: ({ twoSided = false } = {}) => {
    const m = clad('stone_dark', hex('#15181B'), 0, 1);
    if (twoSided) m.side = THREE.DoubleSide;
    return m;
  },
  /** Silted stone: the open-water boulder. */
  stoneSilt: () => clad('stone_silt', hex('#17150F'), 0, 1),
  /** Trench basalt, the slab's and the spire's `basalt`. */
  basaltTrench: () => clad('basalt', hex('#14171A'), 0, 0.96),
  /** Vent basalt, the chimney's and the basalt pile's `basalt` — the same name, its own value. */
  basaltVent: () => clad('basalt', hex('#121517'), 0, 0.96),
  /** Coral stone over ruins: the coral growth, the ruin block, the dome shard. */
  coralStoneRuin: () => clad('coral_stone', hex('#3A2B24'), 0, 0.95),
  /** Coral stone, living: the coral tower's `coral_stone` — the same name, its own value. */
  coralStoneLiving: () => clad('coral_stone', hex('#171D19'), 0, 1),
  /** Abyss stone: the resonance crystal's matrix and the resonance pylon. */
  abyssStone: () => clad('abyss_stone', hex('#10161D'), 0, 0.96),
  /** Kelp: two-sided, as the file has it — a frond is seen from both faces. */
  kelp: () => {
    const m = clad('kelp', hex('#2A2916'), 0, 0.96);
    m.side = THREE.DoubleSide;
    return m;
  },
  /** `vent-ember` at 0.7, the chimney's mouth. */
  ember: () => lamp('ember', hex('#E06A2B'), hex('#0B0806'), 1, 0.7),
  /** `flora-biolight` at 0.55, the kelp cluster's tips. */
  biolight: () => lamp('biolight', hex('#2E8C74'), hex('#0B1D19'), 1, 0.55),
  /** `crystal-seam` at 1.2, the resonance crystal's seam. */
  violetSeam: () => lamp('violet_seam', hex('#5B4A8C'), hex('#06050A'), 0.9, 1.2),
};

/* --------------------------------------------------------------------------
 * Tables under a constructor. Each takes the export's vertex table in
 * three's own order (kit.mjs `tabled` says which) and only the segment
 * counts, because the radii and lengths are the table's. A drum's rows run
 * torso row by row from the top, then the top cap's centres and ring, then
 * the bottom's; a lump's face by face, +x −x +y −y +z −z; an orb's from the
 * top pole row down.
 * ------------------------------------------------------------------------ */

/**
 * A drum — three's CylinderGeometry on `facets` × `heights` — under a
 * table. The crags' base and peaks, the boulder's skirt.
 */
export const drum = (table, facets, heights = 1) =>
  tabled(new THREE.CylinderGeometry(1, 1, 1, facets, heights), table);

/**
 * A lump — three's BoxGeometry on `segments` [w, h, d] — under a table.
 * The crag's fin, root, ledges and shoulders.
 */
export const lump = (table, segments = [1, 1, 1]) =>
  tabled(new THREE.BoxGeometry(1, 1, 1, ...segments), table);

/** An orb — three's SphereGeometry, `w` × `h` — under a table. The boulder. */
export const orb = (table, w, h) => tabled(new THREE.SphereGeometry(1, w, h), table);

/**
 * A block: a plain box `w × h × d` as the generator left it, in the files'
 * finish — the crag's three ledges, the parts of the five stone props it
 * never touched.
 */
export const block = (w, h, d) => flatShaded(box(w, h, d));

/**
 * A wedge: a box `w × h × d` whose top face is pinched to `pinch` of its
 * depth — the boulder's crack line, a slab with a knife edge up. The one
 * stone part in the five that is a formula rather than a table, and exact:
 * the file's top corners sit at 0.15 · 0.225 to the float.
 */
export function wedge(w, h, d, pinch) {
  const geo = box(w, h, d);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 0) pos.setZ(i, pos.getZ(i) * pinch);
  return flatShaded(geo);
}

/* --------------------------------------------------------------------------
 * Faces for kit.mjs `faceted`: the stitches the trench generator used,
 * read off its two files and returned as triangle triples.
 * ------------------------------------------------------------------------ */

/**
 * Polygons fanned from their first corner, each `[f0, f1 … fn−1]` cut as
 * (f0, f[j+1], f[j]) for j = 1 … n−2 — the slab's rule, on every one of
 * its 34 faces.
 */
export function fan(faces) {
  const out = [];
  for (const f of faces) for (let j = 1; j + 1 < f.length; j++) out.push([f[0], f[j + 1], f[j]]);
  return out;
}

/**
 * A prism's faces for `fan`: `bottom` and `top` are the corner indices of
 * two n-gons in the same sense round — the bottom face is listed reversed
 * so it faces down, the top as it is, then the walls `[b_k, b_k+1, t_k+1,
 * t_k]` round from k = 0. The slab's hexagonal and pentagonal bodies.
 */
export function prism(bottom, top) {
  const n = bottom.length;
  const faces = [[...bottom].reverse(), [...top]];
  for (let k = 0; k < n; k++)
    faces.push([bottom[k], bottom[(k + 1) % n], top[(k + 1) % n], top[k]]);
  return faces;
}

/**
 * A chunk's faces for `fan`: eight corners as two quads, `b` round the
 * bottom and `t` round the top, faced −z, +z, bottom, top, −x, +x in that
 * order — the three boulders on the slab's shelf.
 */
export const chunk = (b, t) => [
  [b[0], b[1], t[1], t[0]],
  [b[3], t[3], t[2], b[2]],
  [b[0], b[3], b[2], b[1]],
  [t[0], t[1], t[2], t[3]],
  [b[0], t[0], t[3], b[3]],
  [b[1], b[2], t[2], t[1]],
];

/**
 * A column of rings stitched into bands: `rings` is a list of equal-length
 * corner-index rings from the foot up; the foot is capped by `fan`'s rule
 * and each band's quad `[l_i, l_i+1, u_i+1, u_i]` is cut (l_i, l_i+1, u_i+1),
 * (l_i, u_i+1, u_i) — the other diagonal from the slab's. The spire's
 * nine rings, open at the top for its tip.
 */
export function column(rings) {
  const out = fan([rings[0]]);
  for (let b = 0; b + 1 < rings.length; b++) {
    const l = rings[b];
    const u = rings[b + 1];
    for (let i = 0; i < l.length; i++) {
      const j = (i + 1) % l.length;
      out.push([l[i], l[j], u[j]], [l[i], u[j], u[i]]);
    }
  }
  return out;
}

/**
 * Where a prop stands: on the ground, and footprint-true.
 *
 * Grounded first — the root lifted so the lowest vertex sits on y = 0 —
 * because that is what every approved root carries: the crags' 0.14956 and
 * 3.64956 and the boulder's 0.25210 are each the negative of
 * `Box3.setFromObject`'s floor over the parts, to the last digit, and
 * derived here the same way rather than typed. Then held at `footprintM`
 * by the measure intake and the runtime take — three's `Box3.setFromObject`
 * over the whole root, the larger of its X and Z extents, no yaw, since a
 * prop has no bow (hull-intake's page.html, environmentModels.ts) — by
 * multiplying whatever scale the root already carries and its lift with
 * it, so the ground stays at y = 0. The approved trench slab measured
 * 24.47 against its 25 and baked with a rescale warning; a port lands
 * intake's factor on ×1.000, which is kit.mjs `fitFootprint`'s argument
 * for a structure. A root that is already true to a picometre (the
 * boulder's, whose export carried its own fit) is left exactly as it is.
 *
 * `drawn` is the footprint the script's header states the export measured
 * before the fit, checked to `tolerance` so a mistyped row fails here and
 * not in the maps (kit.mjs `metreTrue` makes the same bargain). Returns the
 * measure and the factor, for the record.
 */
export function stand(root, footprintM, { drawn: expected, tolerance = 1e-3 } = {}) {
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(root);
  root.position.y = -bb.min.y;
  const size = bb.getSize(new THREE.Vector3());
  const drawn = Math.max(size.x, size.z);
  if (expected !== undefined && Math.abs(drawn - expected) > tolerance)
    throw new Error(`${root.name}: drawn ${drawn.toFixed(4)} across; the header says ${expected}`);
  const k = footprintM / drawn;
  if (Math.abs(k - 1) > 1e-12) {
    root.scale.multiplyScalar(k);
    root.position.multiplyScalar(k);
  }
  return { drawn, k };
}
