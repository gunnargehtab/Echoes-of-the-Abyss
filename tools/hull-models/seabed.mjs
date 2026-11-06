/**
 * The seabed — the environment's shape language: what a navy's module is to
 * its fleet, this is to the ground (#869, off #540 Phase 5).
 *
 * "Environment props dress the biomes the terrain grid already declares —
 * they are world geometry, not agents, so the STYLE block changes: no
 * faction palette, no running lights, no glow-by-loudness. A prop's light,
 * where it has any at all, comes from the four world-light families a prop
 * may carry" (docs/asset-prompts-3d.md, Block 4). A prop belongs to nobody,
 * so a prop script composes from here rather than from `factions/`: the
 * Block 4 materials as the fourteen approved files carry them (and the
 * fifteenth, the nodule bed, takes one of the same tokens, `stone_dark`,
 * and two of its own, `silt_drift` and `ore_trace` — #1555; the sixteenth,
 * the kelp stand, the cluster's two — #1712; the four microfauna that make
 * twenty, `stone_dark` again under two skins of their own, `carapace` and
 * `fish_flank` — #1711; and the rim ray that makes twenty-one, the same
 * two — #1777), the builders more than one prop needs, and the root every
 * prop stands on.
 *
 * Three things about the fourteen batch files are worth knowing before
 * reading one, and this module is where they are written down:
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
import { THREE, clad, lamp, hex, box, flatShaded, tabled, faceted } from './kit.mjs';

/**
 * The palette, as the twenty Block 4 files and the arch carry it: ten
 * stones, sediments and growths, two living skins and five lights, each
 * named by its docs/style-neon-noir.md "The props" token.
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
  /**
   * Drifted silt, `silt-drift`: the nodule bed's drift, under its
   * `stone_dark` lumps. Paler than `stone-silt` by 1.73× in linear
   * luminance (0.01306 against 0.00753) with the same warm cast, because
   * the runtime's ceiling scales a prop's brightest material to 0.06 and
   * the rest by their ratio to it (environmentModels.ts
   * `ENV_LUMINANCE_CEILING`): on `stone-silt` the lumps came out 18 %
   * brighter than the drift and read as pale boulders. No existing token
   * could stand under them: no stone is paler than `stone-dark` (the
   * nearest, `basalt-trench`, sits 6 % under it), and the paler tokens are
   * growth — both corals and the kelp — whose cast belongs to their own
   * ground. So the drift took a sediment of its own, which puts the lumps
   * at 0.68 of it.
   */
  siltDrift: () => clad('silt_drift', hex('#211E15'), 0, 1),
  /**
   * Structural rib, `structure-rib`: the transit arch's exposed frame and
   * its hung fittings (#1637). "A rib is neither stone nor growth" — the
   * built substrate the fallen cladding exposes, warm with two centuries of
   * water, at 0.61 of `stone-dark`'s linear luminance so the ribs read
   * darker than the masonry they carry. Roughness 0.9, the doc's own.
   */
  structureRib: () => clad('structure_rib', hex('#160F0C'), 0, 0.9),
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
  /**
   * Carapace, `carapace`: the rim crab's shell, claws and eyestalks (#1711),
   * the first of the two skins the public-microfauna variant of ENV STYLE
   * adds (docs/asset-prompts-3d.md Block 4). A dark russet — sRGB hue 9°,
   * 40 % saturated — redder than `coral-stone-ruin` (hue 19°) and at
   * 0.0167 linear luminance 1.9× `stone-dark`, which its legs carry, so
   * under the runtime's ceiling the shell reads warm on dark stilts and the
   * legs sit at 0.53 of it. Roughness 0.9: chitin under silt, a shade less
   * matte than stone.
   */
  carapace: () => clad('carapace', hex('#2F1F1C'), 0, 0.9),
  /**
   * Fish flank, `fish-flank`: the one skin all three swimmers share (#1711),
   * the fry, the outer fish and the deep fish, their photophore seats
   * included. A cold pewter — sRGB hue 186°, 23 % saturated — between the
   * stones' blue (204–212°) and the living coral's green, so a fish reads
   * as a body and not as a chip of the rock it passes; 0.0215 linear
   * luminance, 2.4× `stone-dark`, which the fins and eyes carry at 0.41
   * of it: a pale flank under darker fins. Roughness 0.8, a wet scale.
   */
  fishFlank: () => clad('fish_flank', hex('#212A2B'), 0, 0.8),
  /** `vent-ember` at 0.7 over `ember-base`, the chimney's mouth. */
  ember: () => lamp('ember', hex('#E06A2B'), hex('#0B0806'), 1, 0.7),
  /** `flora-biolight` at 0.55 over `biolight-base`, the kelp cluster's and the kelp stand's tips. */
  biolight: () => lamp('biolight', hex('#2E8C74'), hex('#0B1D19'), 1, 0.55),
  /** `crystal-seam` at 1.2 over `violet-seam-base`, the resonance crystal's seam. */
  violetSeam: () => lamp('violet_seam', hex('#5B4A8C'), hex('#06050A'), 0.9, 1.2),
  /**
   * `ore-trace` at 1.268 over `ore-trace-base`, the nodule bed's glint
   * facets (#1555). The strength puts the family at the doc's 0.14
   * effective emissive luminance: #7A5634 is 0.1104 linear, times 1.268 is
   * 0.1400, between the seam's 0.11 and the ember's 0.18 and still under
   * the ember (rule 2). It shipped at 0.725 for 0.08, the dimmest of the
   * four, and the owner asked for a brighter glint.
   */
  oreTrace: () => lamp('ore_trace', hex('#7A5634'), hex('#0B0805'), 1, 1.268),
  /**
   * `civic-lamp` at 0.389 over `civic-lamp-base`, the transit arch's four
   * lamps (#1637): docs/style-neon-noir.md "The arch study's licence",
   * "lamp glass over `civic-lamp-base`, at an effective emissive luminance
   * of at most 0.11", the biolight's and the seam's level under the ember's
   * 0.18. #B8875A is 0.2826 linear (0.2126 · 0.4793 + 0.7152 · 0.2423 +
   * 0.0722 · 0.1022), times 0.389 is 0.1099, the nearest three-figure
   * strength under the cap (0.390 reads 0.1102). Roughness 1, the base's
   * token row. The intact state's `lamp_0` … `lamp_3` alone carry it.
   */
  civicLamp: () => lamp('civic_lamp', hex('#B8875A'), hex('#0D0907'), 1, 0.389),
};

/**
 * A seeded stream of numbers in [0, 1): mulberry32 on a 32-bit seed, every
 * step integer arithmetic under `Math.imul` and `>>>`, so the stream is the
 * same on every machine and `npm run check:models` reproduces a prop that
 * scatters by it byte for byte. For a prop authored as a formula whose
 * parts are scattered rather than placed by hand — the nodule bed's lumps
 * (#1555) — where a port would carry a table of the export's own numbers
 * and a hand-drawn scatter would be a table typed from nothing. A script
 * takes one stream and draws from it in a fixed order; adding a draw
 * anywhere moves every draw after it, which is the same bargain a table
 * row makes and the reason a scatter's order is written down where it is
 * drawn. `between(lo, hi)` is one draw spread over a range.
 */
export function seeded(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.between = (lo, hi) => lo + (hi - lo) * next();
  return next;
}

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
 * diff.mjs reads an index; diff.mjs reads no normal, and check.mjs (since
 * #911) compares a script's normals only against the file it wrote; and
 * the runtime merges every mesh under one material into one geometry and
 * refuses a bucket whose members disagree on attributes
 * (environmentModels.ts). So a ruin box keeps the
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

/* --------------------------------------------------------------------------
 * The microfauna — env-rim-crab, env-shoal-fry, env-outer-fish and
 * env-deep-fish (#1711), the four public decorative bodies
 * docs/free-water-slice.md §5 commissions under Block 4's public-microfauna
 * variant of ENV STYLE, and env-rim-ray (#1777), the one large body the
 * variant's fifth clause admits. Five files, one grammar: a body is a
 * `shaft`, a closed run of corner rings whose facets are crisp because
 * every corner is drawn with a little jitter from a seeded stream;
 * everything flat on it — a fin, a claw's hand — is a `blade`, a thin
 * closed slab on a convex outline. The three fish differ in proportion and
 * fin plan and in nothing else: the same shaft from nose to tail, the same
 * blades rooted through the skin, the same two materials. The crab's legs
 * and claw arms are the same shaft along a bent axis, its shell the same
 * shaft stood on end. The ray is the same shaft laid across the span, its
 * rings chord sections rather than girths (`wingBody`), and its lobes and
 * tail the same shaft again. Both builders wind every triangle against a
 * point inside the part it belongs to, so no script here checks a facet's
 * facing after the fact as the nodule bed and the kelp stand do: the wind
 * is the construction.
 * ------------------------------------------------------------------------ */

/**
 * A triangle over `points` wound to face away from `inside`: `tri` as given
 * if its normal already points from `inside` toward it, else with its last
 * two corners swapped. A degenerate triangle, or one whose plane passes
 * through `inside`, throws rather than guess.
 */
export function facing(points, tri, inside) {
  const [a, b, c] = tri.map((k) => new THREE.Vector3(...points[k]));
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
  const centroid = a.add(b).add(c).divideScalar(3);
  const d = n.dot(centroid.sub(new THREE.Vector3(...inside)));
  if (!(Math.abs(d) > 1e-12)) throw new Error(`facing: triangle ${tri} is edge-on to its inside`);
  return d > 0 ? tri : [tri[0], tri[2], tri[1]];
}

/** The mean of a ring's corners. */
const middle = (ring) =>
  ring.reduce((m, p) => m.map((v, i) => v + p[i] / ring.length), [0, 0, 0]);

/**
 * A shaft: a closed body over a run of corner rings, `rings` from one end
 * to the other, each the same number of `[x, y, z]` corners in the same
 * sense round. Each end is `start` and `end`: a point, fanned to from the
 * end ring (a nose, a leg's tip, a whip tail's end), or absent, which caps
 * the end flat (a peduncle a tail fin roots on, a hip under a shell). Every
 * band is wound against the midpoint of its two rings' middles and every
 * end against its ring's middle pulled a little back along the shaft, so
 * the axis may bend as it likes — a crab's leg climbs and descends — and
 * the skin still faces out. Flat and non-indexed (kit.mjs `faceted`).
 *
 * Each band quad is cut on one diagonal, and which one is `splitAC`'s
 * rule: facets in the first half of the ring on one diagonal and the
 * second half on the other, so facet i and facet n − 1 − i are cut as
 * mirror images. On a fish whose corners mirror about its vertical plane
 * (`fishBody`) the whole skin is then mirror-symmetric, triangles
 * included, and a point on a starboard facet's diagonal has its mirror on
 * the port facet's diagonal — the reviewer's finding A on #1711: cut on
 * one diagonal throughout, a mirrored target fell on a different half of
 * the quad, or the next facet, and no two eyes sat alike. `split(b, i)`
 * overrides the rule band by band for a shaft whose mirror plane cuts
 * across its rings rather than along them (`wingBody`: ring b's mirror is
 * another ring, so a facet's mirror is on another band, cut on the other
 * diagonal).
 */
/** Whether band facet `i` of `n` is cut on the (b,i)–(b+1,i+1) diagonal, or on (b,i+1)–(b+1,i). */
export const splitAC = (n, i) => i < n / 2;

export function shaft(rings, { start = null, end = null, split = null } = {}) {
  const n = rings[0].length;
  const cut = split ?? ((b, i) => splitAC(n, i));
  const points = rings.flat();
  const tris = [];
  const at = (b, i) => b * n + (i % n);
  for (let b = 0; b + 1 < rings.length; b++) {
    const lo = middle(rings[b]);
    const hi = middle(rings[b + 1]);
    const inside = lo.map((v, i) => (v + hi[i]) / 2);
    for (let i = 0; i < n; i++) {
      const [A, B, C, D] = [at(b, i), at(b, i + 1), at(b + 1, i + 1), at(b + 1, i)];
      const pair = cut(b, i)
        ? [
            [A, B, C],
            [A, C, D],
          ]
        : [
            [A, B, D],
            [B, C, D],
          ];
      tris.push(facing(points, pair[0], inside), facing(points, pair[1], inside));
    }
  }
  const cap = (b, tip, towards) => {
    const m = middle(rings[b]);
    const back = middle(rings[towards]);
    const inside = m.map((v, i) => v + 0.1 * (back[i] - v));
    if (tip) {
      points.push(tip);
      const t = points.length - 1;
      for (let i = 0; i < n; i++) tris.push(facing(points, [at(b, i), at(b, i + 1), t], inside));
    } else {
      for (let i = 1; i + 1 < n; i++)
        tris.push(facing(points, [at(b, 0), at(b, i), at(b, i + 1)], inside));
    }
  };
  cap(0, start, 1);
  cap(rings.length - 1, end, rings.length - 2);
  return faceted(points, tris);
}

/** Twice the signed area of a planar polygon about `n`, for `blade`'s sense. */
function signedArea(o, n) {
  const sum = new THREE.Vector3();
  for (let i = 0; i < o.length; i++)
    sum.add(new THREE.Vector3().crossVectors(o[i], o[(i + 1) % o.length]));
  return sum.dot(n);
}

/**
 * A blade: a thin closed slab on a planar outline — `outline` as `[x, y,
 * z]` points in order round, convex, `normal` the plane's, `thickness`
 * across it — fanned on both faces and walled round, wound against its own
 * centre. The fins and tail lobes of the fish, the crab's claw hands and
 * fingers. A fin roots inside the body it belongs to, as the kelp stand's
 * fronds root inside their stalk, so the sweep lists each against its body
 * and nothing floats. A concave outline throws: the wind against one centre
 * is only sound on a convex one, so a forked tail is two blades.
 */
export function blade(outline, normal, thickness) {
  const m = outline.length;
  const n = new THREE.Vector3(...normal).normalize();
  const o = outline.map((p) => new THREE.Vector3(...p));
  const sense = Math.sign(signedArea(o, n));
  for (let i = 0; i < m; i++) {
    const a = o[i];
    const b = o[(i + 1) % m];
    const c = o[(i + 2) % m];
    const turn = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, b));
    if (Math.sign(turn.dot(n)) !== sense)
      throw new Error(`blade: outline is not convex at corner ${i + 1}`);
  }
  const lift = n.clone().multiplyScalar(thickness / 2);
  const points = [
    ...o.map((p) => p.clone().add(lift).toArray()),
    ...o.map((p) => p.clone().sub(lift).toArray()),
  ];
  const inside = middle(points);
  const tris = [];
  for (let i = 1; i + 1 < m; i++)
    tris.push(facing(points, [0, i, i + 1], inside), facing(points, [m, m + i, m + i + 1], inside));
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    tris.push(facing(points, [i, j, m + j], inside), facing(points, [i, m + j, m + i], inside));
  }
  return faceted(points, tris);
}

/**
 * The facet of a flat-shaded part nearest a point: its centroid and its
 * normal, in the part's own frame. The measure a script asserts a seat's
 * stand-off by, against the triangles the file carries; not what places
 * one (`fishBody` `facetAt` does, on the band quad), since a nearest
 * triangle's mirror is the other half of the mirrored quad.
 */
export function nearestFacet(geo, target) {
  const p = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const t = new THREE.Vector3(...target);
  let best = null;
  for (let f = 0; f < p.count / 3; f++) {
    const c = new THREE.Vector3();
    for (let k = 0; k < 3; k++) c.add(new THREE.Vector3().fromBufferAttribute(p, 3 * f + k));
    c.divideScalar(3);
    const d = c.distanceTo(t);
    if (!best || d < best.d)
      best = { d, centroid: c, normal: new THREE.Vector3().fromBufferAttribute(nrm, 3 * f) };
  }
  return best;
}

/**
 * A fish's body: a `shaft` from a nose point at u = 0 along −x through
 * `stations` — `{ u, ry, rz }`, the fraction of `length` back from the nose
 * and the half-height and half-width there, nose to tail — to the last
 * station, capped flat for a tail fin to root on (`tail: 'cap'`) or fanned
 * to a point at u = 1 (`tail: 'point'`, a whip). The axis cambers by
 * `camber(u)` in y and bends by `bend(u)` in z, the one still swimming
 * pose; `sides` corners a ring (even), the first at the top so the back
 * is a ridge and the belly a keel, each pushed in or out by up to `jitter`
 * of its radius and slipped along the axis by as much, drawn from `draw`
 * ring by ring for the corners from the ridge round to the keel on the
 * starboard side and reused for their port mirrors, so the skin is
 * mirror-symmetric about the axis's vertical plane and still no two
 * facets alike. Returns the geometry; the analytic skin, `point(u, phi)` —
 * phi 0 on the starboard beam (+z), π/2 on the back, −π/2 under the keel
 * — and `half(u)` for where a fin roots; and `facetAt(u, phi)`, the band
 * quad of the skin as built that the point falls on: its four corners,
 * the diagonal `shaft` cut it on (front ring to back ring), `at(u)` for
 * the point on that diagonal at u — on the surface exactly, on both
 * triangles — `mid` for its middle (at `midU`), `axisAt(u)` for the
 * band's own axis there, the plane its corners mirror about, `normal` for
 * the quad's (the mean of its two triangles') and `size` for its shortest
 * edge. An eye or a seat
 * sits on a quad by `facetAt`, never on the ellipse (which the facets lie
 * inside by up to r(1 − cos π/n)) and never on a nearest triangle (whose
 * mirror is the other half of the mirrored quad).
 */
export function fishBody(
  draw,
  { length, sides, stations, tail = 'cap', camber = () => 0, bend = () => 0, jitter = 0.04 }
) {
  const x = (u) => length / 2 - u * length;
  const axis = (u) => [x(u), camber(u), bend(u)];
  const half = (u) => {
    const run = [{ u: 0, ry: 0, rz: 0 }, ...stations];
    if (tail === 'point') run.push({ u: 1, ry: 0, rz: 0 });
    for (let i = 0; i + 1 < run.length; i++) {
      const a = run[i];
      const b = run[i + 1];
      if (u >= a.u && u <= b.u) {
        const f = (u - a.u) / (b.u - a.u);
        return { ry: a.ry + (b.ry - a.ry) * f, rz: a.rz + (b.rz - a.rz) * f };
      }
    }
    throw new Error(`fishBody: u ${u} is off the body`);
  };
  const point = (u, phi) => {
    const [ax, ay, az] = axis(u);
    const { ry, rz } = half(u);
    return [ax, ay + ry * Math.sin(phi), az + rz * Math.cos(phi)];
  };
  if (sides % 2) throw new Error(`fishBody: ${sides} sides; the ring must mirror, so even`);
  const rings = stations.map(({ u, ry, rz }) => {
    const [ax, ay, az] = axis(u);
    // One draw a corner from the ridge (k = 0) round to the keel (k =
    // sides / 2); corner k past the keel is the mirror of corner sides − k.
    const drawn = Array.from({ length: sides / 2 + 1 }, () => ({
      push: 1 + draw.between(-jitter, jitter),
      slip: draw.between(-jitter, jitter) * ry,
    }));
    return Array.from({ length: sides }, (_, k) => {
      const phi = Math.PI / 2 - (2 * Math.PI * k) / sides;
      const { push, slip } = drawn[Math.min(k, sides - k)];
      return [ax + slip, ay + ry * push * Math.sin(phi), az + rz * push * Math.cos(phi)];
    });
  });
  const geo = shaft(rings, { start: axis(0), end: tail === 'point' ? axis(1) : null });
  const facetAt = (u, phi) => {
    const b = stations.findIndex(
      (st, i) => i + 1 < stations.length && u >= st.u && u <= stations[i + 1].u
    );
    if (b < 0) throw new Error(`fishBody: u ${u} is on no band`);
    const step = (2 * Math.PI) / sides;
    const i = ((Math.floor((Math.PI / 2 - phi) / step) % sides) + sides) % sides;
    const V = (p) => new THREE.Vector3(...p);
    const quad = bandFacet(
      rings,
      b,
      i,
      splitAC(sides, i),
      axis((stations[b].u + stations[b + 1].u) / 2)
    );
    const [P, Q] = quad.diagonal;
    const u0 = stations[b].u;
    const u1 = stations[b + 1].u;
    const at = (uu) => P.clone().lerp(Q, (uu - u0) / (u1 - u0));
    // The band's own axis: straight between its two ring centres, which is
    // the plane the band's corners mirror about (the bend is sampled at
    // the stations, and a corner's slip moves it along x off that curve).
    const axisAt = (uu) => V(axis(u0)).lerp(V(axis(u1)), (uu - u0) / (u1 - u0));
    return { ...quad, at, axisAt, midU: (u0 + u1) / 2 };
  };
  return { geo, rings, axis, half, point, facetAt, length };
}

/**
 * One band quad of a `shaft` as built, for a lens or a seat to sit on:
 * the quad between rings `b` and `b + 1` at corner `i`, its four
 * corners, the diagonal it was cut on (`ac` true for (b,i)–(b+1,i+1),
 * the rule `shaft` cut it by, front ring to back), `mid` for that
 * diagonal's middle — on the surface exactly, on both triangles —
 * `normal` for the quad's (the mean of its two triangles', each turned
 * away from `inside`) and `size` for its shortest edge. `fishBody`
 * `facetAt` wraps it with the fish's u; `wingBody` `facetAt` with the
 * span's station.
 */
export function bandFacet(rings, b, i, ac, inside) {
  const n = rings[0].length;
  const j = (i + 1) % n;
  const V = (p) => new THREE.Vector3(...p);
  const [A, B, C, D] = [V(rings[b][i]), V(rings[b][j]), V(rings[b + 1][j]), V(rings[b + 1][i])];
  const pair = ac
    ? [
        [A, B, C],
        [A, C, D],
      ]
    : [
        [A, B, D],
        [B, C, D],
      ];
  const [P, Q] = ac ? [A, C] : [B, D];
  const centreOf = V(inside);
  const normal = new THREE.Vector3();
  for (const [a, c, d] of pair) {
    const nn = new THREE.Vector3().subVectors(c, a).cross(new THREE.Vector3().subVectors(d, a));
    const centre = a.clone().add(c).add(d).divideScalar(3);
    if (nn.dot(centre.sub(centreOf)) < 0) nn.negate();
    normal.add(nn.normalize());
  }
  normal.normalize();
  const size = Math.min(A.distanceTo(B), B.distanceTo(C), C.distanceTo(D), D.distanceTo(A));
  return {
    corners: [A, B, C, D],
    diagonal: [P, Q],
    mid: P.clone().lerp(Q, 0.5),
    normal,
    size,
    band: b,
    facet: i,
  };
}

/**
 * A winged body: a `shaft` laid across the span rather than down the
 * length — the ray (#1777). Its rings are chord sections in the x–y
 * plane, one per station across z, from the port tip through the
 * centreline to the starboard tip, each fanned to a tip point at
 * ±`halfSpan`. `stations` is the starboard half from z = 0 outward —
 * `{ z, le, te, t, y }`: the leading and trailing edges' x, the section's
 * whole thickness and the chord line's height — and the port half is its
 * mirror; `tip` is `{ x, y }` of the tip point. A section is `profile`:
 * `s` the corners' positions along the chord, 0 at the leading edge and
 * 1 at the trailing, round the top from the leading edge and back along
 * the bottom, and `f` each corner's share of the thickness there (0 at
 * both edges), the top taking `topShare` of it and the bottom the rest —
 * a lens, thickest forward, flatter underneath. Each station's corners
 * are drawn once from `draw` — pushed up or down by up to `jitter` of
 * their height off the chord, slipped along the chord by as much of the
 * thickness and along the span by as much, the centre ring not at all
 * along the span — and the port ring reuses the draw, so the skin is
 * mirror-symmetric about z = 0, triangles included: a band on one side is
 * cut on the other diagonal from its mirror on the other (`shaft`
 * `split`), which is what puts a starboard facet's diagonal middle
 * exactly where the port one's mirrors to. Returns the geometry, the
 * rings, `facetAt(k, i, side)` for the band quad between starboard
 * stations k and k + 1 at corner i, or its port mirror (side −1), and
 * `section(k)` for the nominal station.
 */
export function wingBody(
  draw,
  { halfSpan, stations, tip, profile, topShare = 0.6, jitter = 0.04 }
) {
  if (stations[0].z !== 0) throw new Error('wingBody: the first station is the centreline');
  const n = profile.s.length;
  if (n !== profile.f.length) throw new Error('wingBody: profile s and f differ in length');
  const K = stations.length;
  const corner = (st, k, j) => {
    const chord = st.le - st.te;
    const top = j <= profile.s.indexOf(1);
    const share = top ? topShare : -(1 - topShare);
    return [st.le - profile.s[j] * chord, st.y + share * st.t * profile.f[j], st.z];
  };
  const drawn = stations.map((st, k) =>
    Array.from({ length: n }, (_, j) => {
      const [x, y] = corner(st, k, j);
      const h = y - st.y;
      return [
        x + draw.between(-jitter, jitter) * st.t,
        st.y + h * (1 + draw.between(-jitter, jitter)),
        k === 0 ? 0 : st.z + draw.between(-jitter, jitter) * st.t,
      ];
    })
  );
  const mirror = ([x, y, z]) => [x, y, -z];
  const rings = [
    ...drawn
      .slice(1)
      .reverse()
      .map((ring) => ring.map(mirror)),
    ...drawn,
  ];
  // Bands 0..K−2 are port, K−1..2K−3 starboard; band b mirrors band 2K−3−b.
  const split = (b, i) => b >= K - 1 === splitAC(n, i);
  const geo = shaft(rings, {
    start: [tip.x, tip.y, -halfSpan],
    end: [tip.x, tip.y, halfSpan],
    split,
  });
  const facetAt = (k, i, side = 1) => {
    if (k < 0 || k + 1 >= K) throw new Error(`wingBody: station ${k} is on no band`);
    const b = side > 0 ? K - 1 + k : K - 2 - k;
    const inside = middle(rings[b]).map((v, c) => (v + middle(rings[b + 1])[c]) / 2);
    return bandFacet(rings, b, i, split(b, i), inside);
  };
  return { geo, rings, facetAt, section: (k) => stations[k], halfSpan };
}

/**
 * A fin: a `blade` on an outline drawn in its own plane — `outline` as
 * `[a, b]` pairs in metres, `a` along `along` from `root` and `b` along
 * `span` (made perpendicular to `along` here) — so a dorsal fin is drawn
 * with `along` down the back and `span` up, a pectoral with `along` swept
 * aft and `span` out from the flank, a tail lobe with `along` the
 * peduncle's tangent. The crab's claw hands and fingers are the same with
 * `along` forward out of the wrist.
 */
export function fin({ root, along, span, outline, thickness }) {
  const a = new THREE.Vector3(...along).normalize();
  const b = new THREE.Vector3(...span);
  b.addScaledVector(a, -b.dot(a)).normalize();
  const n = new THREE.Vector3().crossVectors(a, b);
  const o = new THREE.Vector3(...root);
  return blade(
    outline.map(([p, q]) => o.clone().addScaledVector(a, p).addScaledVector(b, q).toArray()),
    n.toArray(),
    thickness
  );
}

/**
 * A tangent basis `[t1, t2]` across a normal: `t1` along the body (x
 * with the normal's share taken out), `t2` across it. Built from x rather
 * than from a cross product with up, so a port normal gives the mirror of
 * a starboard basis and a lozenge or a lens ring mirrors with its seat.
 */
function tangents(n) {
  const x = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const t1 = x.addScaledVector(n, -x.dot(n)).normalize();
  const t2 = new THREE.Vector3().crossVectors(n, t1).normalize();
  return [t1, t2];
}

/**
 * An eye: a six-sided pyramid on a band quad of the skin (`fishBody`
 * `facetAt`), centred on the quad's middle, the middle of the diagonal it
 * is cut on; its base ring in the quad's plane sunk `sink` under it and
 * its apex `proud` of it, open at the base, which the body hides. The
 * radius is capped at 0.45 of the quad's shortest edge so the base stays
 * on its facet — the fry's first lens stood past its head like a horn — and
 * the radius used is returned with the geometry. A dark lens in the skin
 * and no light: the variant's "no eye that glows".
 */
export function lens(facet, radius, { sink = 0.1, proud = 0.25 } = {}) {
  const r = Math.min(radius, 0.45 * facet.size);
  const n = facet.normal;
  const [t1, t2] = tangents(n);
  const base = facet.mid.clone().addScaledVector(n, -sink * r);
  const points = Array.from({ length: 6 }, (_, k) => {
    const a = (2 * Math.PI * k) / 6;
    return base
      .clone()
      .addScaledVector(t1, r * Math.cos(a))
      .addScaledVector(t2, r * Math.sin(a))
      .toArray();
  });
  points.push(
    facet.mid
      .clone()
      .addScaledVector(n, proud * r)
      .toArray()
  );
  const tris = Array.from({ length: 6 }, (_, k) =>
    facing(points, [k, (k + 1) % 6, 6], base.toArray())
  );
  return { geo: faceted(points, tris), centre: facet.mid.clone(), normal: n, radius: r, facet };
}

/**
 * A seat: a lozenge of two triangles, `w` along the body and `h` across,
 * lying `proud` of a band quad of the skin (`fishBody` `facetAt`) at the
 * point of its cut diagonal at `u`, in the quad's plane and facing its way
 * — the deep fish's photophore seats, dark facets in the body's own
 * material that the runtime lights and the file does not. Returns the
 * geometry and the skin point it stands off.
 */
export function seat(facet, u, [w, h], proud) {
  const on = facet.at(u);
  const n = facet.normal;
  const [t1, t2] = tangents(n);
  const c = on.clone().addScaledVector(n, proud);
  const points = [
    c
      .clone()
      .addScaledVector(t1, w / 2)
      .toArray(),
    c
      .clone()
      .addScaledVector(t2, h / 2)
      .toArray(),
    c
      .clone()
      .addScaledVector(t1, -w / 2)
      .toArray(),
    c
      .clone()
      .addScaledVector(t2, -h / 2)
      .toArray(),
  ];
  const inside = on.toArray();
  return {
    geo: faceted(points, [facing(points, [0, 1, 2], inside), facing(points, [0, 2, 3], inside)]),
    on,
    normal: n,
    facet,
  };
}

/**
 * Whether a point is inside a closed flat-shaded body: the parity of the
 * crossings of one ray from it through the body's triangles
 * (Möller–Trumbore), the ray on a fixed odd bearing so it meets no edge
 * square on. The reviewer's probe on #1711, kept here as the test a fin's
 * root is held to.
 */
export function insideBody(geo, point) {
  const p = geo.attributes.position;
  const o = new THREE.Vector3(...point);
  const d = new THREE.Vector3(0.3127, 0.9411, 0.1287);
  let hits = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const pv = new THREE.Vector3();
  const sv = new THREE.Vector3();
  const qv = new THREE.Vector3();
  for (let t = 0; t < p.count; t += 3) {
    a.fromBufferAttribute(p, t);
    b.fromBufferAttribute(p, t + 1);
    c.fromBufferAttribute(p, t + 2);
    e1.subVectors(b, a);
    e2.subVectors(c, a);
    pv.crossVectors(d, e2);
    const det = e1.dot(pv);
    if (Math.abs(det) < 1e-12) continue;
    sv.subVectors(o, a);
    const u = sv.dot(pv) / det;
    if (u < 0 || u > 1) continue;
    qv.crossVectors(sv, e1);
    const v = d.dot(qv) / det;
    if (v < 0 || u + v > 1) continue;
    if (e2.dot(qv) / det > 0) hits++;
  }
  return hits % 2 === 1;
}

/**
 * A median fin — a dorsal, an anal, a blade of a ribbon — on a `fishBody`:
 * a `blade` whose root chord runs from `inset(u0)` under the ridge (`sign`
 * 1) or keel (−1) at u0 to the same under it at u1, and whose plane is
 * yawed to that chord, so it follows a body that bends and tapers under
 * it rather than standing in the plane of its front root (the round-2
 * finding on #1711: a dorsal drawn at the front root's z ran straight
 * while the back curved away under it, and its rear root stood 5 cm
 * outside the skin). `tops` is the free edge, `[u, h]` from the rear
 * forward, each h metres out of the ridge or keel at that u, projected
 * into the plane. `inset` is a function of u or a number, the number
 * capped at four tenths of the half-height where the body is thinner
 * than it (a whip). The root chord is then sampled at `samples` points
 * and every one must be inside the closed body (`insideBody`), or this
 * throws naming the first that is not: a straight chord through a bend is
 * off the axis's curve by its sagitta, and a fin long enough for that to
 * reach the skin is split, or set deeper, by its script. Returns the
 * geometry and the root chord's ends.
 */
export function median(body, { u0, u1, sign = 1, inset, tops, thickness, samples = 21 }) {
  const under = typeof inset === 'function' ? inset : (u) => Math.min(inset, 0.4 * body.half(u).ry);
  const edge = (u, off) => {
    const [x, y, z] = body.axis(u);
    return new THREE.Vector3(x, y + sign * (body.half(u).ry + off), z);
  };
  const r0 = edge(u0, -under(u0));
  const r1 = edge(u1, -under(u1));
  const along = new THREE.Vector3().subVectors(r1, r0);
  const a = along.clone().normalize();
  const b = new THREE.Vector3(0, sign, 0);
  b.addScaledVector(a, -b.dot(a)).normalize();
  const local = (pt) => {
    const d = new THREE.Vector3().subVectors(pt, r0);
    return [d.dot(a), d.dot(b)];
  };
  const outline = [[0, 0], [along.length(), 0], ...tops.map(([u, h]) => local(edge(u, h)))];
  for (let k = 0; k < samples; k++) {
    const pt = r0.clone().lerp(r1, k / (samples - 1));
    if (!insideBody(body.geo, pt.toArray()))
      throw new Error(
        `median: root sample ${k} of ${samples} at (${pt.toArray().map((v) => v.toFixed(4))}) is outside the body`
      );
  }
  return {
    geo: fin({ root: r0.toArray(), along: a.toArray(), span: b.toArray(), outline, thickness }),
    root: [r0, r1],
  };
}

/**
 * Where a body built at a nominal size comes to rest: its plan's box
 * centred on the origin, its lowest vertex on y = 0, held at `footprintM`
 * by intake's measure (the larger of its x and z extents) and baked, so
 * the root is an identity and `stand` finds ×1.000. The crab is built with
 * its tips on the floor and the swimmers with nothing under them, and both
 * go out the same way: every prop's lowest vertex is on y = 0 and the
 * runtime hangs a swimmer at its depth (Block 4, the variant's paragraph).
 * Returns the fit.
 */
export function settle(root, footprintM) {
  root.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(root, true);
  const size = bb.getSize(new THREE.Vector3());
  const c = bb.getCenter(new THREE.Vector3());
  const fit = footprintM / Math.max(size.x, size.z);
  root.scale.setScalar(fit);
  root.position.set(-c.x * fit, -bb.min.y * fit, -c.z * fit);
  bake(root);
  return fit;
}

/**
 * What a baked body is, for a script to assert its header by: triangles,
 * the material names it carries, the lowest vertex, how far any vertex
 * stands from the origin on x and on z, and which parts reach the floor
 * (a vertex within a tenth of a millimetre of y = 0).
 */
export function tally(root) {
  let tris = 0;
  let lowest = Infinity;
  const reach = { x: 0, z: 0 };
  const materials = new Set();
  const onFloor = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    tris += p.count / 3;
    materials.add(o.material.name);
    let low = Infinity;
    for (let i = 0; i < p.count; i++) {
      low = Math.min(low, p.getY(i));
      reach.x = Math.max(reach.x, Math.abs(p.getX(i)));
      reach.z = Math.max(reach.z, Math.abs(p.getZ(i)));
    }
    lowest = Math.min(lowest, low);
    if (low < 1e-4) onFloor.push(o.name);
  });
  return { tris, lowest, reach, materials, onFloor };
}
