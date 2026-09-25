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
 *   nearly fits is a different prop". The four parts of the five stone
 *   props that *are* a formula (crag A's three ledges, the boulder's crack)
 *   are written as one.
 * - **Two names carry two finishes.** `coral_stone` is #3A2B24 at roughness
 *   0.95 on the coral growth, the ruin block and the dome shard and #171D19
 *   at 1 on the coral tower; `basalt` is #14171A on the trench pair and
 *   #121517 on the vent pair. A port reproduces its own file's value and
 *   `check.mjs`, the bake and `diff.mjs` all match a material by *name*, so
 *   both are here under names that say which is which, and a script takes
 *   the one its file carries. #879 kept both values rather than pick one:
 *   the docs give each its own token (`basalt-trench` and `basalt-vent`,
 *   `coral-stone-ruin` and `coral-stone-living`) and the files keep their
 *   material names.
 * - **Every hex is a doc token.** The three lights are
 *   docs/style-neon-noir.md "World light" to the digit (`vent-ember`
 *   #E06A2B, `flora-biolight` #2E8C74, `crystal-seam` #5B4A8C, at the
 *   strengths the doc's luminance figures were taken from). Every base
 *   colour — the stones, the kelp, the three lamps' near-black bases — was
 *   the Claude Design batch's own, and since #879 is a row of that doc's
 *   "The props", which this palette transcribes: each entry below names
 *   its token. The stone ramp's `rock-face` #11161C and `rock-shadow`
 *   #080C12 are the terrain bake's and no file uses them. A script still
 *   cites the hex the file carries (kit.mjs `hex`, #630).
 *
 * A prop is never yawed, so a script places its parts with kit.mjs `add`
 * and the file's own numbers and never `drawn`. Not because the files are
 * X-long — crag B, the spire and the vent chimney are longer on Z by
 * intake's measure — but because the environment branch never turns one:
 * env intake skips the length-on-X yaw (hull-intake's page.html, "props
 * skip the yaw — they have no bow") and the runtime scatters each instance
 * at a random yaw of its own (environmentModels.ts, environment.ts). A
 * port that turned a Z-long prop onto X would bake and draw turned, and
 * `diff.mjs` would not say so: it yaws each Z-long file onto X on its own
 * before comparing, so a before file it turned and an after file the port
 * had already turned read as the same shape. Every node's transform is an
 * XYZ Euler the generator set (the crag's `peak_fourth` prints as
 * (−π, 1.34, −π), which is a yaw of 1.8).
 */
import { THREE, clad, lamp, hex, box, flatShaded, tabled } from './kit.mjs';

/**
 * The palette, as the fourteen files carry it: eight stones and three
 * lights, each named by its docs/style-neon-noir.md "The props" token.
 * Metalness is 0 on every material in the set — "nothing manufactured"
 * (ENV STYLE) — and roughness the file's own. A lamp is kit.mjs `lamp`:
 * the file's near-black base, its emissive at the doc's world-light token,
 * its `KHR_materials_emissive_strength`.
 */
export const ground = {
  /**
   * Dark stone, `stone-dark`: the two crags, the coral growth, the ruin
   * block and the dome shard, one-sided on all five. The shard's file
   * flagged it two-sided until #883, and the flag had a job: 64 of the old
   * shell's 256 triangles were wound against their skins, and `doubleSided`
   * kept the crown closed at runtime until #878 turned them round. The
   * shard authored under #883 checks every face of its shell against the
   * dome it was cut from before it writes, and a flag that hides a
   * wrong-facing triangle at runtime hides it from the screenshot review
   * too; intake's bake is single-sided and never hid one.
   */
  stoneDark: () => clad('stone_dark', hex('#15181B'), 0, 1),
  /** Silted stone, `stone-silt`: the open-water boulder. */
  stoneSilt: () => clad('stone_silt', hex('#17150F'), 0, 1),
  /** Trench basalt, `basalt-trench`: the slab's and the spire's `basalt`. */
  basaltTrench: () => clad('basalt', hex('#14171A'), 0, 0.96),
  /** Vent basalt, `basalt-vent`: the chimney's and the basalt pile's `basalt`, its own value. */
  basaltVent: () => clad('basalt', hex('#121517'), 0, 0.96),
  /** Ruin coral stone, `coral-stone-ruin`: the coral growth, the ruin block, the dome shard. */
  coralStoneRuin: () => clad('coral_stone', hex('#3A2B24'), 0, 0.95),
  /** Coral stone, living, `coral-stone-living`: the coral tower's `coral_stone`, its own value. */
  coralStoneLiving: () => clad('coral_stone', hex('#171D19'), 0, 1),
  /** Abyss stone, `abyss-stone`: the resonance crystal's matrix and the resonance pylon. */
  abyssStone: () => clad('abyss_stone', hex('#10161D'), 0, 0.96),
  /** Kelp, `kelp`: two-sided, as the file has it — a frond is seen from both faces. */
  kelp: () => {
    const m = clad('kelp', hex('#2A2916'), 0, 0.96);
    m.side = THREE.DoubleSide;
    return m;
  },
  /** `vent-ember` at 0.7 over `ember-base`, the chimney's mouth. */
  ember: () => lamp('ember', hex('#E06A2B'), hex('#0B0806'), 1, 0.7),
  /** `flora-biolight` at 0.55 over `biolight-base`, the kelp cluster's tips. */
  biolight: () => lamp('biolight', hex('#2E8C74'), hex('#0B1D19'), 1, 0.55),
  /** `crystal-seam` at 1.2 over `violet-seam-base`, the resonance crystal's seam. */
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
 * depth — the boulder's crack line, a slab with a knife edge up. With crag
 * A's three ledges, one of the four stone parts in the five that is a
 * formula rather than a table, and exact: the file's top corners sit at
 * 0.15 · 0.225 to the float.
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
 * nine rings, open at the top for its tip. The band faces outward only on
 * rings that run from +x toward −z, anticlockwise seen from above, as the
 * spire's do; the vent pair's rings run the other way, and on them this
 * order faced every band inward (#878), so vent-chimney.mjs `tube` and
 * vent-basalt.mjs `mound` swap each triangle's last two corners.
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
 * Where a prop stands: footprint-true, and on the ground where its file
 * puts it there.
 *
 * Held at `footprintM` by the measure intake takes — three's
 * `Box3.setFromObject` over the whole root, each part's local box through
 * its transform, the larger of its X and Z extents, no yaw (hull-intake's
 * page.html) — by multiplying whatever scale the root already carries and
 * its lift with it, so a floor at y = 0 stays there. The approved trench
 * slab measured 24.47 against its 25 and baked with a rescale warning; a
 * port lands intake's factor on ×1.000, which is kit.mjs `fitFootprint`'s
 * argument for a structure. A root that is already true to a picometre
 * (the boulder's, whose export carried its own fit) is left exactly as it
 * is. The runtime takes the same measure before it merges the parts
 * (environmentModels.ts `propFootprint`). Until #876 it measured the
 * merged vertices, which a rotated part's box overhangs, and drew six
 * props larger than intake reviewed them: the boulder by 23 %, the coral
 * tower by 18 %, the crags by 10–16 %, the kelp by 1.3 % and the crystal
 * by 0.4 %.
 *
 * `ground` lifts the root first so the measure's floor sits on y = 0 —
 * `Box3`'s floor over the parts' boxes, not the lowest vertex: the two are
 * the same on an upright box and differ on a leaning one (the coral tower's
 * box floor is −0.67 to its vertices' −0.42). It is opt-in because it is
 * what three of the fourteen approved roots carry and eleven do not: the
 * crags' 0.14956 and 3.64956 and the boulder's 0.25210 are each the
 * negative of that floor to the last digit and are derived here rather
 * than typed, while the coral tower and the kelp cluster sit below y = 0
 * on identity roots and stay there. A lift a file does not carry is a
 * change to what intake bakes, and `diff.mjs` reports one only as a
 * "shift" line it then divides out — so a port passes `ground` when its
 * file's root has a lift and not otherwise.
 *
 * `drawn` is the footprint the script's header states the export measured
 * before the fit, checked to `tolerance` so a mistyped row fails here and
 * not in the maps (kit.mjs `metreTrue` makes the same bargain). Returns the
 * measure and the factor, for the record.
 *
 * This is the one way a prop holds its footprint. On an identity root —
 * the eleven files with no lift — it is kit.mjs `fitFootprint` to the
 * byte: the same factor on the scale, and a translation of zero scaled
 * stays zero.
 */
export function stand(
  root,
  footprintM,
  { ground = false, drawn: expected, tolerance = 1e-3 } = {}
) {
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(root);
  if (ground) root.position.y -= bb.min.y;
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

/* --------------------------------------------------------------------------
 * The kelp cluster, the coral tower and the coral growth (#869, Phase 5):
 * what the three living props are made of that the five stone props were
 * not. Two of the lessons the stone ports recorded above stop at the stone.
 * The kelp's holdfasts, the tower's thirteen dodecahedra (six of them
 * lobes) and the growth's lobes and plates are three's polyhedra
 * *untouched* — no jitter, no torn seam — under a scale triple the
 * generator baked into the buffer. And the tower's five plates and the
 * growth's four branches are three's cylinder and cone kept *indexed and
 * smooth-shaded*, three's own normals still on them — each vertex normal
 * 21–24° off its own face on a plate and 44° on a branch, where the
 * neighbouring facets' normals are 42.5–47.7° and 88.3–88.8° apart — so a
 * port that ran them through `flatShaded` would pass every gate and still
 * be wrong: no tool here compares a normal against the approved export
 * (`diff.mjs` reads none, and `check.mjs` since #911 compares a script only
 * against the file it wrote itself; the bake renders them, hull-intake's
 * page.html `normal` pass, and fails nothing on them).
 * ------------------------------------------------------------------------ */

const triple = (s = 1) => (typeof s === 'number' ? [s, s, s] : s);

/**
 * One of three's polyhedra at radius 1, detail 0, under the file's own
 * scale triple, in the files' flat finish. The files carry the *products*
 * — a lobe 4.2 by 2.94 by 3.99 — and no radius, so that is what a script
 * cites. A scalar is a uniform scale (the biolight's 0.42), and none is
 * the unit solid, the ruins' crusts, whose size is on the node.
 */
const solid = (Geometry, s) => {
  const [x, y, z] = triple(s);
  return flatShaded(new Geometry(1, 0).scale(x, y, z));
};

/** An icosahedron: the kelp's two holdfasts, the coral growth's six lobes. */
export const ico = (s) => solid(THREE.IcosahedronGeometry, s);
/** A dodecahedron: the coral tower's base, lobes, crown and shelves. */
export const dodeca = (s) => solid(THREE.DodecahedronGeometry, s);
/** An octahedron: the coral growth's three plates. Not kit.mjs `octa`, which keeps its UVs. */
export const octa = (s) => solid(THREE.OctahedronGeometry, s);
/** A tetrahedron: the kelp's three biolight tips. */
export const tetra = (s) => solid(THREE.TetrahedronGeometry, s);

/**
 * A primitive as three built it and the generator left it — indexed, with
 * three's own normals, so a cylinder's torso shades round — minus the UVs
 * no Block 4 file carries. The coral tower's plates, the coral growth's
 * masonry boxes and its branches. Not `flatShaded`, on purpose: see the
 * section note.
 */
export function kept(geo) {
  geo.deleteAttribute('uv');
  return geo;
}

/* --------------------------------------------------------------------------
 * The resonance pair — env-resonance-crystal and env-resonance-pylon (#869,
 * off #540 Phase 5).
 *
 * The Resonance Field's two files are tables of a third kind. The stone
 * props' generator jittered by index and tore its seams; this one jittered
 * each *corner* once, so every duplicate three carries — the θ = 2π copy of
 * a ring's first corner, a torus's closing ring, a cap's centre once a
 * segment — is the first corner to the bit, and a cap's ring is the torso's
 * end row again. So a part here is its constructor's topology under a table
 * with no duplicates in it, a ring a row and a centre a point, and the three
 * builders below expand one to three's layout for kit.mjs `tabled` rather
 * than have a script type the copies out.
 *
 * One reading to distrust: parts.mjs prints every 36-triangle buffer as
 * "≈ dodecahedron", and the boulders and the rubble are — twenty corners
 * shared three faces each, exactly as three lays them — but the crystal's
 * `base_mound` and the pylon's `crust_mound` are nine-facet drums, one
 * height row and both caps, which is the same count. Only the sharing
 * pattern tells them apart, and a port checks it before choosing:
 * `parts.mjs --table <part> --as dodecahedron` refuses a drum, and
 * `--as cylinder:9,1` refuses a dodecahedron.
 * ------------------------------------------------------------------------ */

/** A ring closed on itself: the corner three doubles at θ = 2π. */
const closed = (ring) => [...ring, ring[0]];

/**
 * A drum from its rings, seam untorn — three's CylinderGeometry on
 * `rings[0].length` facets and `rings.length − 1` height rows: `rings` from
 * the top row down, each in three's order round from θ = 0; `caps` the top
 * and bottom centres, one point each, or absent for a tube open at both
 * ends. The mounds and the pylon's shaft, closed; the crystal's shard
 * bodies, open.
 */
export function drumOf(rings, caps) {
  const facets = rings[0].length;
  const heights = rings.length - 1;
  const rows = rings.flatMap(closed);
  if (caps) {
    const [top, bottom] = caps;
    rows.push(...Array(facets).fill(top), ...closed(rings[0]));
    rows.push(...Array(facets).fill(bottom), ...closed(rings[heights]));
  }
  return tabled(new THREE.CylinderGeometry(1, 1, 1, facets, heights, !caps), rows);
}

/**
 * A ring of rings — three's TorusGeometry on `rings.length` radial by
 * `rings[0].length` tubular segments — under a table: `rings[j]` is the
 * j-th section round the tube from three's first, each running round the
 * torus from its first corner. The pylon's three ridges.
 */
export function torusOf(rings) {
  const rows = [...rings, rings[0]].flatMap(closed);
  return tabled(new THREE.TorusGeometry(1, 0.3, rings.length, rings[0].length), rows);
}

/**
 * A dodecahedron — three's DodecahedronGeometry at detail 0 — under a table
 * of its twenty corners in the order three's buffer first reaches them, a
 * map read off the constructor here rather than typed. The crystal's four
 * boulders and the pylon's four rubble stones, each pushed corner by corner
 * and still flat-faced because a corner's three copies moved together.
 */
export function dodecahedronOf(corners) {
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const pos = geo.attributes.position;
  const seen = new Map();
  const rows = [];
  for (let i = 0; i < pos.count; i++) {
    const key = [pos.getX(i), pos.getY(i), pos.getZ(i)].map((v) => v.toFixed(5)).join();
    if (!seen.has(key)) seen.set(key, seen.size);
    rows.push(corners[seen.get(key)]);
  }
  if (seen.size !== corners.length)
    throw new Error(`dodecahedronOf: ${corners.length} corners for a solid of ${seen.size}`);
  return tabled(geo, rows);
}

/* --------------------------------------------------------------------------
 * The ruins — env-ruin-block (#869, off #540 Phase 5) and, since #883,
 * env-ruin-dome-shard, authored rather than ported.
 *
 * The ruin block's file is an export of a third kind, and what the header
 * above says of the stone five is not true of it. Every node is an
 * identity — no translation, no rotation, no scale, on the root too — and
 * a part's placement is in its buffer: the generator built its scene with
 * node transforms and baked each mesh's world matrix into its geometry on
 * the way out, which is what `bake` does here. And the boxes are
 * *indexed*: three's 24-vertex BoxGeometry under its own 36-index list and
 * per-face normals, the UVs stripped — not the non-indexed finish the
 * stone five carry, so `flatShaded` and `tabled` are the wrong builders
 * for them, and nothing downstream would say so: neither check.mjs nor
 * diff.mjs reads an index or a normal, and the runtime merges every mesh
 * under one material into one geometry and refuses a bucket whose members
 * disagree on attributes (environmentModels.ts). So a ruin box keeps the
 * index and the normal buffer three built and `kept` above takes only the
 * UVs off. The polyhedra — icosahedra, octahedra and tetrahedra, the coral
 * crusts and the block's shards — are three's own, non-indexed as
 * PolyhedronGeometry writes them at detail 0: `ico`, `octa` and `tetra`
 * above, their size on the node.
 *
 * The dome shard goes out the same way — every placement baked, the root
 * an identity — but nothing in it is a file's: its shell and its stone
 * courses are kit.mjs `faceted` over points the script computes from the
 * dome it is cut from (ruin-dome-shard.mjs `cap`, `bar`), non-indexed and
 * flat like the stone five, and its crusts and shards are the polyhedra
 * above.
 * ------------------------------------------------------------------------ */

/**
 * Bake every mesh's world matrix into its buffer and leave every node an
 * identity, the root's scale included — the one step both ruin files went
 * through on the way out. One `applyMatrix4` per mesh, so each vertex is
 * rounded to float32 once, as the exports were.
 */
export function bake(root) {
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.applyMatrix4(o.matrixWorld);
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
  });
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
}
