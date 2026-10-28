/**
 * The Sorrowgate transit arch — 570 m of footprint, the one public landmark
 * (docs/asset-prompts-3d.md Block 4b, "LANDMARK — env-ruin-transit-arch";
 * docs/graphics-standards.md gate 1 "Public landmarks", #1637), the arch of
 * docs/sorrowgate-arch-study.md, in the two states §6 there dimensions.
 *
 * "One landmark in two states sharing one origin, the seabed floor at its
 * anchor. X runs east along the span, Y is up, and +Z faces south toward
 * the court", under LANDMARK STYLE: "Built, not grown: dressed stone in
 * deliberate courses, a structural frame showing where the cladding has
 * fallen away, the fittings of a transit line that no longer runs ...
 * Readable from a high 55-degree RTS camera as a few large masses before
 * any detail; low-poly with crisp facets; at most four materials."
 *
 * Four materials, by glTF name (docs/style-neon-noir.md "The props"):
 * `stone_dark` the masonry, `silt_drift` the sediment, `structure_rib` the
 * exposed frame, the transit fittings and the hung fittings, `civic_lamp`
 * the four lamps' glass (seabed.mjs `civicLamp`, at the licence's 0.11).
 * Every buffer is kit.mjs `faceted` — non-indexed, flat, position and
 * normal only — so every mesh under one material carries the same vertex
 * attributes, which intake's env rule requires.
 *
 * THE ROOT AND THE ORIGIN. The root `env_ruin_transit_arch` is an identity
 * with two identity children, `state_intact` and `state_ruined`, and no
 * `stand` fit moves it: the landmark "stands at its anchor's yaw and at
 * scale 1. Its origin, not its box's base, stands at its anchor cell's
 * floor" (Block 4b). So y 0 is the anchor floor in both states, the
 * foundations go to y −30 and the top to +150, and the model is *not*
 * lifted so its box sits on y 0 — seabed.mjs `stand` lifts only when asked
 * (`ground`), and the runtime's origin is the contract. Intake's page.html
 * centres the model on its box for the camera frame alone and holds the
 * larger plan axis to `--footprint-m`; the intact plan is X ±285 exactly,
 * the ruined within it, so its factor is ×1.000 and `stand` here finds
 * nothing to do and only asserts the 570. The maps draw both states on top
 * of each other, since intake reads one file: the ruined heap at Z +115 to
 * +150 lies south of the intact plan's Z ±80, so the top-down maps show
 * the arch with a rubble strip below it. That is expected.
 *
 * PLACEMENTS: NOTHING IS BAKED. Every mesh that stands still is built in
 * world coordinates and added at identity, so there is no `bake` step and
 * nothing for one to double (seabed.mjs `bake` would have folded a kept
 * node's transform into its buffer and left the node carrying it too). The
 * nodes the runtime moves keep a transform on purpose, geometry in their
 * own frame; r169's exporter writes each as a glTF `matrix`, which
 * GLTFLoader decomposes back into position, rotation and scale:
 * - `hang_0` … `hang_5` (intact): a mesh whose origin is its pivot at the
 *   top, the cable and the fitting hanging below in local space, the node
 *   at the pivot's world point — on the loft's own soffit or the shelf's
 *   underside, the cable's top sunk 0.4 m into it so `contacts.mjs` lists
 *   each against what it hangs from. The runtime sways it about that pivot.
 * - `lamp_0` … `lamp_3` (intact): a mesh at its glass's centre, the glass
 *   centred in local space, so a pool centred on the node is centred on
 *   the glass. Its housing (`lamp_N_housing`, structure_rib) is world-built.
 * - `fall_0` … `fall_11` (ruined): a mesh at its rest, its yaw on the node,
 *   its box centred in local space, bottom on y 0. `userData.startAboveRestM`
 *   is how far above its rest the piece starts the collapse; three's
 *   GLTFExporter writes `userData` as glTF node `extras` (its
 *   `serializeUserData` in `processNode`), and `parts.mjs` prints the node.
 *   glb.mjs `readGlb` reads no extras, so check.mjs holds the geometry and
 *   not the figure; the table below is the record.
 * - `sift_0` … `sift_7` and `sift_r0` … `sift_r3`: empty nodes, a position
 *   each, where silt falls from.
 *
 * INTACT (`state_intact`), §6's plan X ±285, Z ±80; levels in the table:
 * - Two piers, `pier_e_*` and `pier_w_*`, 100 m wide (X ±185 to ±285) and
 *   160 m deep at the plinth. Each is a plinth (y 0–12), three stepped
 *   drums (12–45, 45–80, 80–100) each set in 1.5 m from the one below, and
 *   a capital (100–110, Z ±75) the span springs from. A drum is a core
 *   whose south face sits at Z 65 under cladding 8–11 m thick: where the
 *   cladding survives it is its own part (`*_clad_*`, chamfered 6 m at the
 *   corners), and where it has fallen the core shows — the east pier from
 *   y 20 to 100 over X 200–270, the west from 45 to 100 over X −255 to
 *   −205. Foundations in three steps from y −30 to 0, the outer X face
 *   flush with the plan at ±285 and each step 2 m wider toward the opening.
 * - The span, `span`: one loft of fourteen-cornered sections along X,
 *   Z ±72. Its soffit is 110 at the springing over each pier and rises to
 *   130 at the crown (110 + 20 (1 − (x/185)²), a polyline over 23
 *   stations), under 20 m of masonry at the crown; the top is a deck at
 *   150 over Z ±36 with a 3 m step down to ledges at 147, and the course
 *   above 142 is set in 1.5 m. On the south face the section steps back
 *   7 m where the cladding has fallen: X 60–270 up to y 138, and X −160
 *   to −110 up to 134. Anything seated on the soffit uses `loftSoffit`,
 *   the loft's own height between stations, not the curve's.
 * - The frame, `rib_*` and `girt_*` (structure_rib): 19 ribs at 11 m
 *   pitch over X 64–262, 3 by 3.5 m, standing in the recess 1.5 m proud
 *   of its back; the six over the east pier's recess run from y 20 to 138
 *   through the capital, the rest from the soffit to 138. Four more in the
 *   west patch and five in the west pier's recess. Girts behind them.
 * - The transit line at the springing (structure_rib): the rail bed stops
 *   at the springing, so the intrados reads as an arc in elevation —
 *   `rail_w` and `rail_e`, a 5 m shelf at y 123–125.5 and Z 72–77 over
 *   each pier (X ±185 to ±255), the west one torn at the opening's edge
 *   and bent down to y 120.3 (`rail_torn`, over the soffit's 113.1 there);
 *   `bracket_*` under them; six `mast_*` on them. The catenary `wire_e`
 *   still spans the opening from the east masts, 2 m over the crown's
 *   soffit, torn at X −40 with its end hanging to 130.3; `wire_w` is torn
 *   at the west springing and hangs down the face to 113. Only the six
 *   hung fittings hang below the soffit.
 * - Silt (`silt_*`): wedges on the rail shelves, in the angle under the
 *   deck's step on both ledges, on the capitals, the course step, the
 *   recess floors and the plinth ledge, banked against the plinths and on
 *   the footing's −10 ledge, each its own size.
 *
 * RUINED (`state_ruined`): "The rock is the terrain's, not the model's":
 * its face runs from Z 125 at the floor to 117 at y 60, so a heap piece's
 * north face follows z = 125 − 0.1333 y and nothing is north of Z 115.
 * - `heap_*` (stone_dark): eight leaning masses of broken pier and fallen
 *   course between Z 115 and 125, tallest at the piers' X (58 and 55 m),
 *   lowest across the opening. `rib_r0` leans against the face to y 50,
 *   `rib_r1` lies in the skirt.
 * - `skirt_*` and `silt_r*`: fallen courses and drifts south of Z 125 and
 *   north of 150, nowhere higher than 5 m.
 * - `fall_0` … `fall_11`: the debris that comes down the face, resting on
 *   the floor at the heap's foot and in the skirt.
 * No lintel, soffit or framed void, no lamp.
 *
 * The script measures every claim after building and prints them (see
 * `report` at the foot), and throws on: a face wound in on a convex solid,
 * a vertex outside its state's plan or levels, an intact part standing in
 * the opening below the soffit above the floor (hung fittings excepted;
 * the footing steps 2 m toward the opening under y −10 are buried, the
 * relief there bottoming at −13.2), a hang ending
 * under +60, a lamp outside +20..+40 or nearer than 40 m to another, a
 * ruined vertex over +60 or over +5 south of Z 125, a state over the row's
 * 12,000 triangles, or a fifth material.
 */
import { THREE, add, faceted, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 570;
const MAX_TRIS_STATE = 12000;

const stone = seabed.ground.stoneDark();
const silt = seabed.ground.siltDrift();
const rib = seabed.ground.structureRib();
const lampGlass = seabed.ground.civicLamp();

const root = new THREE.Group();
root.name = 'env_ruin_transit_arch';
const intact = new THREE.Group();
intact.name = 'state_intact';
const ruined = new THREE.Group();
ruined.name = 'state_ruined';
root.add(intact, ruined);

const v3 = (p) => new THREE.Vector3(...p);

// ---------------------------------------------------------------------------
// Solids: a loft of equal-length rings, its winding settled by its signed
// volume, degenerate triangles dropped (a step station repeats corners on
// purpose), and a convex solid checked face by face against its centroid.
// Every part here is one or more of these merged into one faceted buffer.
// ---------------------------------------------------------------------------
function loft(rings) {
  const n = rings[0].length;
  const points = rings.flat();
  const at = (r, i) => r * n + i;
  const tris = [];
  for (let j = 1; j + 1 < n; j++) tris.push([at(0, 0), at(0, j + 1), at(0, j)]);
  for (let r = 0; r + 1 < rings.length; r++)
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      tris.push([at(r, i), at(r, j), at(r + 1, j)], [at(r, i), at(r + 1, j), at(r + 1, i)]);
    }
  const last = rings.length - 1;
  for (let j = 1; j + 1 < n; j++) tris.push([at(last, 0), at(last, j), at(last, j + 1)]);
  return { points, tris };
}

function oriented(piece, { convex = true, label = 'piece' } = {}) {
  const P = piece.points.map(v3);
  const normal = ([a, b, c]) => P[b].clone().sub(P[a]).cross(P[c].clone().sub(P[a]));
  let tris = piece.tris.filter((t) => normal(t).length() > 1e-6);
  let vol = 0;
  for (const [a, b, c] of tris) vol += P[a].dot(P[b].clone().cross(P[c])) / 6;
  if (Math.abs(vol) < 1e-3) throw new Error(`env_ruin_transit_arch: ${label} has no volume`);
  if (vol < 0) tris = tris.map(([a, b, c]) => [a, c, b]);
  if (convex) {
    const centre = P.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(P.length);
    for (const t of tris)
      if (normal(t).dot(P[t[0]].clone().sub(centre)) <= 0)
        throw new Error(`env_ruin_transit_arch: ${label} has a face wound in`);
  }
  return { points: piece.points, tris };
}

function merged(pieces) {
  const points = [];
  const tris = [];
  for (const p of pieces) {
    const o = points.length;
    points.push(...p.points);
    tris.push(...p.tris.map((t) => t.map((i) => i + o)));
  }
  return faceted(points, tris);
}

/** A part from pieces, at identity unless placed (`at`, `yaw`, `userData`). */
function solid(parent, name, mat, pieces, { at = [0, 0, 0], yaw = 0, userData } = {}) {
  const list = (Array.isArray(pieces) ? pieces : [pieces]).map((p, i) =>
    p.tris ? p : oriented(p, { label: `${name}[${i}]` })
  );
  const mesh = add(parent, name, merged(list), mat, at, [0, yaw, 0]);
  if (userData) mesh.userData = userData;
  return mesh;
}

/** A prism from a plan ring of `[x, z]` between two heights. */
const prism = (ring, y0, y1) =>
  oriented(loft([ring.map(([x, z]) => [x, y0, z]), ring.map(([x, z]) => [x, y1, z])]));

/** A box by its extents, optionally with each top corner at its own height. */
function slab([x0, x1], [y0, y1], [z0, z1], tops) {
  const ring = [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
  const top = tops ?? [y1, y1, y1, y1];
  return oriented(
    loft([ring.map(([x, z]) => [x, y0, z]), ring.map(([x, z], i) => [x, top[i], z])])
  );
}

/** A beam `w` wide and `t` thick along `a`→`b`, its width horizontal. */
function beam(a, b, w, t) {
  const A = v3(a);
  const B = v3(b);
  const d = B.clone().sub(A).normalize();
  const u = d.clone().cross(new THREE.Vector3(0, 1, 0));
  if (u.length() < 1e-6) u.set(1, 0, 0);
  u.normalize();
  const n = u.clone().cross(d).normalize();
  const ring = (C) =>
    [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ].map(([su, sn]) =>
      C.clone()
        .addScaledVector(u, (su * w) / 2)
        .addScaledVector(n, (sn * t) / 2)
        .toArray()
    );
  return oriented(loft([ring(A), ring(B)]));
}

/** A square tube of half-width `r` along a polyline, one ring a vertex. */
function tube(path, r) {
  const P = path.map(v3);
  const rings = P.map((c, i) => {
    const d = P[Math.min(i + 1, P.length - 1)]
      .clone()
      .sub(P[Math.max(i - 1, 0)])
      .normalize();
    const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
    const u = d.clone().cross(up).normalize();
    const n = u.clone().cross(d).normalize();
    return [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ].map(([su, sn]) =>
      c
        .clone()
        .addScaledVector(u, su * r)
        .addScaledVector(n, sn * r)
        .toArray()
    );
  });
  return oriented(loft(rings), { convex: false });
}

/** A box centred on the origin in its own frame, bottom at −h/2: a node's geometry. */
const localBox = (w, h, d) => slab([-w / 2, w / 2], [-h / 2, h / 2], [-d / 2, d / 2]);

/** An empty node where silt falls from. */
function sift(parent, name, at) {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.set(...at);
  parent.add(o);
  return o;
}

// ---------------------------------------------------------------------------
// INTACT
// ---------------------------------------------------------------------------
const W = 72; // the span's half-depth
const TOP = 150;
const COURSE = 142; // the top course steps in here
const BACK = 65; // the south face where the cladding has fallen, Z
const SOFFIT_PIER = 110;
const CROWN_RISE = 20; // the soffit's rise from the springing to the crown
const soffit = (x) =>
  Math.abs(x) >= 185 ? SOFFIT_PIER : SOFFIT_PIER + CROWN_RISE * (1 - (x / 185) ** 2);

// --- the piers -------------------------------------------------------------
// A pier is built at its east station and mirrored in X for the west by
// `sideX`; the two recesses differ, so each cladding list is its own.
const DRUMS = [
  { y: [12, 45], x: [187, 283], z: 76 },
  { y: [45, 80], x: [188.5, 281.5], z: 74.5 },
  { y: [80, 100], x: [190, 280], z: 73 },
];
const CHAMFER = 10;
const CLAD_CHAMFER = 6;

/** The core's plan: chamfered on the north corners, flat at BACK on the south. */
function coreRing([x0, x1], zn) {
  return [
    [x0 + CHAMFER, -zn],
    [x1 - CHAMFER, -zn],
    [x1, -zn + CHAMFER],
    [x1, BACK],
    [x0, BACK],
    [x0, -zn + CHAMFER],
  ];
}
/** A cladding strip on the south face over X [x0, x1], chamfered at a pier's outer corners. */
function cladRing([x0, x1], zs, { chamferW = false, chamferE = false }) {
  const ring = [
    [x0, BACK],
    [x1, BACK],
  ];
  if (chamferE) ring.push([x1, zs - CLAD_CHAMFER], [x1 - CLAD_CHAMFER, zs]);
  else ring.push([x1, zs]);
  if (chamferW) ring.push([x0 + CLAD_CHAMFER, zs], [x0, zs - CLAD_CHAMFER]);
  else ring.push([x0, zs]);
  return ring;
}

function pier(tag, sideX, recess) {
  const sx = (x) => sideX * x;
  const mirror = (ring) => (sideX < 0 ? ring.map(([x, z]) => [-x, z]).reverse() : ring);
  // Footings: three steps from −30 to 0, flush with the plan's outer X.
  const footing = [
    slab(
      [sx(181), sx(285)].sort((a, b) => a - b),
      [-30, -20],
      [-80, 80]
    ),
    slab(
      [sx(183), sx(285)].sort((a, b) => a - b),
      [-20, -10],
      [-80, 80]
    ),
    slab(
      [sx(185), sx(285)].sort((a, b) => a - b),
      [-10, 0],
      [-80, 80]
    ),
  ];
  solid(intact, `pier_${tag}_footing`, stone, footing);
  // The plinth, 100 m by 158, battered half a metre.
  const plinth = oriented(
    loft([
      mirror([
        [185, -79],
        [285, -79],
        [285, 79],
        [185, 79],
      ]).map(([x, z]) => [x, 0, z]),
      mirror([
        [185, -78.5],
        [285, -78.5],
        [285, 78.5],
        [185, 78.5],
      ]).map(([x, z]) => [x, 12, z]),
    ])
  );
  solid(intact, `pier_${tag}_plinth`, stone, plinth);
  // Three drums, each a core and whatever cladding survives on it.
  DRUMS.forEach((d, i) => {
    solid(
      intact,
      `pier_${tag}_drum_${i}`,
      stone,
      prism(mirror(coreRing(d.x, d.z)), d.y[0], d.y[1])
    );
    const clad = recess(i, d).map(({ x, y, chamferW, chamferE }) =>
      prism(mirror(cladRing(x, d.z, { chamferW, chamferE })), y[0], y[1])
    );
    if (clad.length) solid(intact, `pier_${tag}_clad_${i}`, stone, clad);
  });
  // The capital the span springs from.
  solid(
    intact,
    `pier_${tag}_capital`,
    stone,
    slab(
      [sx(185), sx(285)].sort((a, b) => a - b),
      [100, 110],
      [-75, 75]
    )
  );
}

// East: the cladding has fallen from y 20 to 100 over X 200–270.
pier('e', 1, (i, d) => {
  const [x0, x1] = d.x;
  const strips = [
    { x: [x0, 200], y: d.y, chamferW: true },
    { x: [270, x1], y: d.y, chamferE: true },
  ];
  if (i === 0)
    return [
      { x: [x0, x1], y: [12, 20], chamferW: true, chamferE: true },
      { x: [x0, 200], y: [20, 45], chamferW: true },
      { x: [270, x1], y: [20, 45], chamferE: true },
    ];
  return strips;
});
// West: fallen from y 45 to 100 over X −255 to −205 (mirrored: 205–255 before the flip).
pier('w', -1, (i, d) => {
  const [x0, x1] = d.x;
  if (i === 0) return [{ x: [x0, x1], y: d.y, chamferW: true, chamferE: true }];
  return [
    { x: [x0, 205], y: d.y, chamferW: true },
    { x: [255, x1], y: d.y, chamferE: true },
  ];
});

// --- the span ----------------------------------------------------------------
// Stations (x, recess depth, recess top); a step station is listed twice.
// The soffit is a polyline between them, so anything hung from it is
// seated on `loftSoffit`, the loft's own height, not the curve's.
const STATIONS = [
  [-285, 0, 138],
  [-185, 0, 138],
  [-160, 0, 134],
  [-160, 7, 134],
  [-135, 7, 134],
  [-110, 7, 134],
  [-110, 0, 134],
  [-85, 0, 138],
  [-60, 0, 138],
  [-30, 0, 138],
  [0, 0, 138],
  [30, 0, 138],
  [60, 0, 138],
  [60, 7, 138],
  [85, 7, 138],
  [110, 7, 138],
  [135, 7, 138],
  [160, 7, 138],
  [185, 7, 138],
  [230, 7, 138],
  [270, 7, 138],
  [270, 0, 138],
  [285, 0, 138],
];
function loftSoffit(x) {
  const xs = STATIONS.map(([sx]) => sx);
  let i = 0;
  while (i + 1 < xs.length && xs[i + 1] < x) i++;
  const [x0, x1] = [xs[i], xs[i + 1]];
  const u = x1 === x0 ? 0 : (x - x0) / (x1 - x0);
  return soffit(x0) * (1 - u) + soffit(x1) * u;
}
// The top is two levels: a deck at 150 over Z ±36 and ledges at 147 to the
// course step, which is set in 1.5 m above 142.
const DECK = 36;
const LEDGE = 147;
function spanRing([x, d, t]) {
  const s = soffit(x);
  return [
    [-W, s],
    [W - d, s],
    [W - d, t],
    [W, t],
    [W, COURSE],
    [W - 1.5, COURSE],
    [W - 1.5, LEDGE],
    [DECK, LEDGE],
    [DECK, TOP],
    [-DECK, TOP],
    [-DECK, LEDGE],
    [-W + 1.5, LEDGE],
    [-W + 1.5, COURSE],
    [-W, COURSE],
  ].map(([z, y]) => [x, y, z]);
}
solid(intact, 'span', stone, oriented(loft(STATIONS.map(spanRing)), { convex: false }));

// --- the frame: ribs and girts in the recesses ---------------------------------
const RIB_W = 3.0;
const RIB_D = 3.5;
const RIB_PITCH = 11;
const RIB_Z = [BACK + 1.5, BACK + 1.5 + RIB_D]; // 66.5–70, 1.5 m proud of the back
let ribN = 0;
function ribAt(x, y0, y1) {
  solid(intact, `rib_${ribN++}`, rib, slab([x - RIB_W / 2, x + RIB_W / 2], [y0, y1], RIB_Z));
}
// A rib from the soffit starts at the higher of the loft's two heights
// across its own width, since the soffit rises toward the crown.
const springing = (x) => Math.max(loftSoffit(x - RIB_W / 2), loftSoffit(x + RIB_W / 2));
const RIBS_E = Array.from({ length: 19 }, (_, k) => 64 + RIB_PITCH * k); // 64 … 262
for (const x of RIBS_E) ribAt(x, x >= 200 ? 20 : springing(x), 138);
for (const x of [-152, -141, -130, -119]) ribAt(x, springing(x), 134);
for (const x of [-250, -240, -230, -220, -210]) ribAt(x, 45, 100);
const GIRT_Z = [BACK, BACK + 1.5];
solid(intact, 'girt_0', rib, slab([60, 270], [133, 135.5], GIRT_Z));
solid(intact, 'girt_1', rib, slab([200, 270], [58, 60.5], GIRT_Z));
solid(intact, 'girt_2', rib, slab([-160, -110], [129, 131.5], GIRT_Z));
solid(intact, 'girt_3', rib, slab([-255, -205], [70, 72.5], GIRT_Z));

// --- the transit line at the springing ----------------------------------------
// The rail bed stops at the springing: a shelf over each pier on the span's
// south face, torn at the opening's edge, so the intrados reads as an arc.
const RAIL_Y = [123, 125.5];
const RAIL_Z = [72, 77];
solid(intact, 'rail_w', rib, slab([-255, -185], RAIL_Y, RAIL_Z));
solid(intact, 'rail_e', rib, slab([185, 255], RAIL_Y, RAIL_Z));
// The west shelf's torn end, bent down over the opening from the springing
// to y 120.3, over the soffit (113.1 at X −170): only the six hung fittings
// may hang below it.
solid(
  intact,
  'rail_torn',
  rib,
  oriented(
    loft([
      [
        [-185, 123, 72],
        [-185, 123, 77],
        [-185, 125.5, 77],
        [-185, 125.5, 72],
      ],
      [
        [-170, 120.3, 72.5],
        [-170, 120.3, 77.5],
        [-170, 122.8, 77.5],
        [-170, 122.8, 72.5],
      ],
    ])
  )
);
// Brackets under the shelves; in the east recess they reach back to a rib's face.
const BRACKETS = [
  [-240, 72],
  [-205, 72],
  [218, RIB_Z[1]],
  [251, RIB_Z[1]],
];
BRACKETS.forEach(([x, zb], i) =>
  solid(intact, `bracket_${i}`, rib, slab([x - 1, x + 1], [114, RAIL_Y[0]], [zb, 75.5]))
);
// Catenary masts on the shelves and the wire between them. The east wire
// still spans the opening, torn at X −40 with its end hanging a few metres;
// the west wire's torn end hangs down the face at the springing.
const MAST_X = [-250, -220, -190, 190, 220, 250];
const MAST_TOP = 135.5;
MAST_X.forEach((x, i) =>
  solid(intact, `mast_${i}`, rib, slab([x - 1, x + 1], [RAIL_Y[1], MAST_TOP], [73, 75]))
);
function catenary(from, to, sag = 2.5, n = 4) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push([from + (to - from) * u, MAST_TOP - 0.5 - sag * 4 * u * (1 - u), 74]);
  }
  return pts;
}
const wireW = [
  ...catenary(-250, -220, 1.5),
  ...catenary(-220, -190, 1.5).slice(1),
  [-187, 124, 75],
  [-185.5, 113, 76],
];
const wireE = [
  ...catenary(250, 220, 1.5),
  ...catenary(220, 190, 1.5).slice(1),
  ...catenary(190, -40, 3, 10).slice(1),
  [-42, 131.5, 75],
  [-43, 130.3, 76],
];
solid(intact, 'wire_w', rib, tube(wireW, 0.3));
solid(intact, 'wire_e', rib, tube(wireE, 0.3));

// --- the hung fittings ------------------------------------------------------------
// Each a node at its pivot, geometry hanging below in local space: a cable
// (square, 0.5 m) from 0.4 m above the pivot — sunk into what it hangs
// from, so contacts lists each against it — to −L, then the fitting. A
// soffit pivot sits on `loftSoffit`; a rail pivot on the shelf's
// underside at Z 76.2, clear of the capital's Z 75 below it. Lowest points
// are measured and reported after the build.
const SINK = 0.4;
const HANGS = [
  // [name, pivot, cable length, fitting]
  ['hang_0', [-120, loftSoffit(-120), 45], 48, 'frame'],
  ['hang_1', [-30, loftSoffit(-30), 35], 56, 'rail'],
  ['hang_2', [75, loftSoffit(75), 58], 40, 'standard'],
  ['hang_3', [-230, RAIL_Y[0], 76.2], 48, 'frame'],
  ['hang_4', [40, loftSoffit(40), 25], 58, 'drum'],
  ['hang_5', [230, RAIL_Y[0], 76.2], 54, 'rail'],
];
const FITTINGS = {
  // A signal frame: an upright and a crossbar.
  frame: (L) => [
    slab([-0.4, 0.4], [-L - 5, -L], [-0.4, 0.4]),
    slab([-2.5, 2.5], [-L - 3.2, -L - 2.2], [-0.6, 0.6]),
  ],
  // A length of rail on a hanger.
  rail: (L) => [
    slab([-0.4, 0.4], [-L - 2, -L], [-0.4, 0.4]),
    slab([-5, 5], [-L - 3.2, -L - 2], [-0.8, 0.8]),
  ],
  // A lamp standard: a post with a head.
  standard: (L) => [
    slab([-0.5, 0.5], [-L - 7, -L], [-0.5, 0.5]),
    slab([-1.5, 1.5], [-L - 8.5, -L - 6.5], [-1.5, 1.5]),
  ],
  // A cable drum.
  drum: (L) => [
    slab([-0.4, 0.4], [-L - 1.5, -L], [-0.4, 0.4]),
    prism(
      Array.from({ length: 8 }, (_, i) => [
        2.2 * Math.cos((i * Math.PI) / 4),
        2.2 * Math.sin((i * Math.PI) / 4),
      ]),
      -L - 5.5,
      -L - 1.5
    ),
  ],
};
const hangs = HANGS.map(([name, pivot, L, kind]) =>
  solid(intact, name, rib, [slab([-0.25, 0.25], [-L, SINK], [-0.25, 0.25]), ...FITTINGS[kind](L)], {
    at: pivot,
  })
);

// --- the lamps -----------------------------------------------------------------------
// Two a pier on the south face, on surviving cladding (the first drum's
// face at Z 76), 20–40 m up, clear of the rail bed's Z 76 so the glass top
// shows from above. The housing is a back plate and an arm; the glass sits
// on the arm, its node at its centre.
const LAMPS = [
  [198, 24],
  [274, 36],
  [-272, 28],
  [-212, 38],
];
const FACE = 76;
const GLASS = [1.6, 2.0, 1.4];
const lamps = LAMPS.map(([x, y], i) => {
  solid(intact, `lamp_${i}_housing`, rib, [
    slab([x - 1.5, x + 1.5], [y - 2, y + 2], [FACE, FACE + 1.2]),
    slab([x - 1.2, x + 1.2], [y - 1.5, y - 1], [FACE, FACE + 3]),
  ]);
  return solid(intact, `lamp_${i}`, lampGlass, localBox(...GLASS), {
    at: [x, y, FACE + 1.2 + GLASS[2] / 2],
  });
});

// --- silt ---------------------------------------------------------------------------
// A wedge banked against a wall on its `back` side, `h` tall there and a
// third of a metre at the front, over the given plan, sunk 0.2 m into the
// ledge it lies on; one on the floor (y0 = 0) lies on it.
let siltN = 0;
function drift(parent, x, z, y0, h, back = 'north') {
  const sink = y0 === 0 ? 0 : 0.2;
  const front = 0.3;
  const tops = {
    north: [y0 + h, y0 + h, y0 + front, y0 + front],
    south: [y0 + front, y0 + front, y0 + h, y0 + h],
    east: [y0 + front, y0 + h, y0 + h, y0 + front],
    west: [y0 + h, y0 + front, y0 + front, y0 + h],
  }[back];
  solid(parent, `silt_${siltN++}`, silt, slab(x, [y0 - sink, y0 + h], z, tops));
}
// On the rail shelves' tops.
drift(intact, [-230, -200], [72, 77], RAIL_Y[1], 1.2, 'north');
drift(intact, [190, 230], [72, 77], RAIL_Y[1], 0.7, 'north');
// On the top's ledges, in the angle under the deck's step.
drift(intact, [-240, -170], [DECK, DECK + 7], LEDGE, 1.4, 'north');
drift(intact, [-90, -30], [DECK, DECK + 5], LEDGE, 1.0, 'north');
drift(intact, [40, 130], [DECK, DECK + 8], LEDGE, 1.6, 'north');
drift(intact, [200, 250], [DECK, DECK + 5], LEDGE, 0.9, 'north');
drift(intact, [-200, -120], [-DECK - 6, -DECK], LEDGE, 1.2, 'south');
drift(intact, [20, 60], [-DECK - 4, -DECK], LEDGE, 0.8, 'south');
drift(intact, [150, 230], [-DECK - 7, -DECK], LEDGE, 1.5, 'south');
// On the capitals' ledges outside the span.
drift(intact, [200, 240], [72, 75], 110, 1.5, 'north');
drift(intact, [250, 280], [-75, -72], 110, 1.1, 'south');
drift(intact, [-280, -230], [72, 75], 110, 1.8, 'north');
// On the course step at 142.
drift(intact, [-100, -40], [W - 1.5, W], COURSE, 0.9, 'north');
drift(intact, [140, 200], [W - 1.5, W], COURSE, 0.7, 'north');
drift(intact, [-250, -190], [-W, -W + 1.5], COURSE, 1.0, 'south');
// In the recess floors.
drift(intact, [205, 235], [BACK, 76], 20, 2.5, 'north');
drift(intact, [-250, -225], [BACK, 74.5], 45, 1.6, 'north');
// On the plinth ledge, against the first drum.
drift(intact, [200, 260], [76, 78.5], 12, 1.4, 'north');
drift(intact, [190, 230], [-78.5, -76], 12, 0.9, 'south');
drift(intact, [-260, -195], [76, 78.5], 12, 1.2, 'north');
// Banked against the plinths on the ground, and on the footing steps.
drift(intact, [195, 270], [76, 80], 0, 5, 'north');
drift(intact, [200, 250], [-80, -76], 0, 3.5, 'south');
drift(intact, [-275, -215], [76, 80], 0, 4, 'north');
drift(intact, [-280, -200], [-80, -76], 0, 6, 'south');
drift(intact, [183, 185], [-60, 10], -10, 2.5, 'east');
drift(intact, [-185, -183], [-30, 50], -10, 3, 'west');

// --- where silt falls from --------------------------------------------------------
[
  [-40, COURSE, W],
  [230, RAIL_Y[1], 76],
  [-270, 110, 75],
  [205, 20, 70],
  [-170, 120.3, 75],
  [255, 12, 78.5],
  [-125, 134, W],
  [120, LEDGE, DECK],
].forEach((at, i) => sift(intact, `sift_${i}`, at));

// ---------------------------------------------------------------------------
// RUINED
// ---------------------------------------------------------------------------
const FACE_FOOT = 125; // the rock face's foot, Z
const FACE_SLOPE = 8 / 60; // Z lost per metre up
const faceZ = (y) => FACE_FOOT - FACE_SLOPE * y;
const NORTH_LIMIT = 115;
const SKIRT_Z = 125;
const SKIRT_H = 5;
const SOUTH_LIMIT = 150;
const HEAP_H = 60;

/** A leaning mass against the face: bottom over X `xb` from Z `zn` to 125, top over `xt` at `yt`, `thick` deep. */
function heap(name, xb, xt, yt, zn = 119, thick = 6, mat = stone) {
  const zt = faceZ(yt) + 0.3;
  // The top's south edge never crosses Z 125: south of it nothing is over 5 m.
  const zs = Math.min(zt + thick, FACE_FOOT - 0.5);
  solid(ruined, name, mat, [
    oriented(
      loft([
        [
          [xb[0], 0, zn],
          [xb[1], 0, zn],
          [xb[1], 0, FACE_FOOT],
          [xb[0], 0, FACE_FOOT],
        ],
        [
          [xt[0], yt, zt],
          [xt[1], yt, zt],
          [xt[1], yt, zs],
          [xt[0], yt, zs],
        ],
      ])
    ),
  ]);
}
heap('heap_e0', [200, 285], [215, 275], 58, 119, 5);
heap('heap_e1', [150, 205], [160, 198], 38, 118, 6);
heap('heap_w0', [-285, -195], [-272, -210], 55, 119, 5);
heap('heap_w1', [-200, -140], [-190, -150], 30, 118, 6);
heap('heap_m0', [-140, -60], [-130, -70], 22, 117, 7);
heap('heap_m1', [-65, 30], [-55, 20], 28, 117.5, 6);
heap('heap_m2', [25, 100], [35, 90], 18, 116, 8);
heap('heap_m3', [95, 155], [105, 145], 26, 117, 6);
// A rib leaning against the face, and one lying in the skirt.
solid(ruined, 'rib_r0', rib, beam([62, 1.8, 123], [80, 50, faceZ(50) + 2], RIB_W, RIB_D));
solid(ruined, 'rib_r1', rib, beam([-160, 1.2, 129.5], [-100, 1.2, 131], RIB_W, 2.4));

// The skirt: fallen courses, yawed, bottoms on the floor, no top over 5 m.
const SKIRT = [
  // [x, z, w, d, h, yaw, a top corner dropped]
  [-262, 133, 14, 7, 4.2, 0.3, 1.1],
  [-205, 139, 10, 6, 3.4, -0.5, 0.8],
  [-170, 145, 8, 5, 2.6, 0.9, 0.6],
  [-120, 128, 16, 6, 4.8, 0.15, 1.4],
  [-75, 141, 9, 7, 3.0, -0.8, 0.7],
  [-30, 134, 12, 5, 3.8, 0.4, 1.0],
  [25, 144, 7, 6, 2.4, 1.1, 0.5],
  [70, 130, 15, 7, 4.5, -0.2, 1.2],
  [110, 141, 9, 5, 3.1, 0.7, 0.9],
  [160, 135, 11, 6, 3.6, -0.6, 0.8],
  [205, 128, 13, 6, 4.9, 0.25, 1.5],
  [240, 143, 8, 5, 2.8, -1.0, 0.6],
  [270, 134, 9, 7, 3.3, 0.5, 0.9],
  [-10, 127, 10, 4, 2.2, 0.0, 0.4],
];
// One top corner of each is dropped (the `i`-th round), so no two read alike.
SKIRT.forEach(([x, z, w, d, h, yaw, drop], i) => {
  const tops = [h / 2, h / 2, h / 2, h / 2];
  tops[i % 4] -= drop;
  solid(
    ruined,
    `skirt_${i}`,
    stone,
    slab([-w / 2, w / 2], [-h / 2, h / 2], [-d / 2, d / 2], tops),
    {
      at: [x, h / 2, z],
      yaw,
    }
  );
});

// Drifts banked against the heap's foot and round the skirt.
drift(ruined, [-280, -220], [125, 134], 0, 3.0, 'north');
drift(ruined, [-150, -95], [125, 132], 0, 2.4, 'north');
drift(ruined, [-50, 10], [125, 136], 0, 3.2, 'north');
drift(ruined, [60, 140], [125, 131], 0, 2.0, 'north');
drift(ruined, [180, 270], [125, 135], 0, 3.4, 'north');
drift(ruined, [-200, -180], [140, 149], 0, 1.2, 'north');
drift(ruined, [40, 60], [142, 150], 0, 1.0, 'north');
drift(ruined, [225, 245], [144, 150], 0, 0.9, 'north');

// The debris that comes down the face: at rest here, and each node carries
// how far above its rest it starts.
const FALLS = [
  // [x, z, w, h, d, yaw, start above rest (m), material]
  [-230, 134, 9, 4.5, 6, 0.3, 190, stone],
  [-150, 142, 7, 5, 5, -0.4, 165, stone],
  [-95, 138, 2.4, 3.5, 14, 0.4, 150, rib],
  [-40, 146, 6, 4, 4, 0.8, 140, stone],
  [10, 131, 8, 5, 6, -0.2, 175, stone],
  [55, 144, 5, 3, 4, 1.2, 125, stone],
  [120, 136, 10, 4.8, 7, 0.1, 160, stone],
  [175, 145, 6, 4, 5, -0.7, 110, stone],
  [225, 133, 7, 5, 4, 0.5, 180, stone],
  [265, 141, 4, 3, 3, -0.3, 95, stone],
  [-270, 145, 5, 3.5, 4, 0.6, 100, stone],
  [90, 140, 12, 5, 8, 0.2, 210, stone],
];
const falls = FALLS.map(([x, z, w, h, d, yaw, start, mat], i) =>
  solid(ruined, `fall_${i}`, mat, localBox(w, h, d), {
    at: [x, h / 2, z],
    yaw,
    userData: { startAboveRestM: start },
  })
);

[
  [-240, 55, faceZ(55) + 2],
  [170, 38, faceZ(38) + 3],
  [-20, 28, faceZ(28) + 3],
  [80, 50, faceZ(50) + 3],
].forEach((at, i) => sift(ruined, `sift_r${i}`, at));

// ---------------------------------------------------------------------------
// Measure, check, report, write.
// ---------------------------------------------------------------------------
root.updateMatrixWorld(true);
const worldBox = (o) => new THREE.Box3().setFromObject(o, true);
const eachVertex = (mesh, fn) => {
  const p = mesh.geometry.attributes.position;
  const w = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) fn(w.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
};
const count = (state) => {
  const byMat = new Map();
  let total = 0;
  state.traverse((o) => {
    if (!o.isMesh) return;
    const t = o.geometry.attributes.position.count / 3;
    total += t;
    byMat.set(o.material.name, (byMat.get(o.material.name) ?? 0) + t);
  });
  return { total, byMat };
};
const fail = (msg) => {
  throw new Error(`env_ruin_transit_arch: ${msg}`);
};

// Materials: four, by name, and the lamp glass on the four lamps alone.
const materials = new Set();
root.traverse((o) => o.isMesh && materials.add(o.material.name));
if (materials.size !== 4) fail(`${materials.size} materials, not four`);
root.traverse((o) => {
  if (o.isMesh && o.material === lampGlass && !/^lamp_\d$/.test(o.name))
    fail(`${o.name} carries civic_lamp`);
});
ruined.traverse(
  (o) => o.isMesh && o.material === lampGlass && fail(`${o.name}: a lamp on the ruin`)
);

// Intact: inside the plan and levels; nothing in the opening below the soffit but a hang.
intact.traverse((o) => {
  if (!o.isMesh) return;
  const hung = /^hang_\d$/.test(o.name);
  eachVertex(o, (p) => {
    if (Math.abs(p.x) > 285 + 1e-3 || Math.abs(p.z) > 80 + 1e-3)
      fail(`${o.name} leaves the intact plan at (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
    if (p.y < -30 - 1e-3 || p.y > TOP + 1e-3) fail(`${o.name} leaves the levels at y ${p.y}`);
    if (!hung && p.y >= 0 && Math.abs(p.x) < 185 - 1e-3 && p.y < loftSoffit(p.x) - 1e-3)
      fail(`${o.name} stands in the opening at (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`);
  });
});
const hangLow = hangs.map((h) => +worldBox(h).min.y.toFixed(2));
hangLow.forEach((y, i) => y < 60 && fail(`hang_${i} ends at ${y}, under +60`));
const lampAt = lamps.map((l) => l.position.toArray());
lampAt.forEach(([, y], i) => (y < 20 || y > 40) && fail(`lamp_${i} at ${y}, outside 20–40`));
let lampGap = Infinity;
for (let i = 0; i < lampAt.length; i++)
  for (let j = i + 1; j < lampAt.length; j++)
    lampGap = Math.min(lampGap, v3(lampAt[i]).distanceTo(v3(lampAt[j])));
if (lampGap < 40) fail(`two lamps ${lampGap.toFixed(1)} m apart`);
const soffitMin = Math.min(...STATIONS.map(([x]) => soffit(x)));
const crownThick = TOP - soffit(0);
if (soffitMin < SOFFIT_PIER - 1e-9 || crownThick < 20)
  fail(`crown: soffit ${soffitMin}, ${crownThick} m thick`);

// Ruined: X ±285, Z 115–150, no higher than 60, and 5 south of Z 125.
let heapTop = -Infinity;
let heapZ = [Infinity, -Infinity];
let skirtTop = -Infinity;
ruined.traverse((o) => {
  if (!o.isMesh) return;
  eachVertex(o, (p) => {
    if (Math.abs(p.x) > 285 + 1e-3) fail(`${o.name} leaves X ±285 at ${p.x.toFixed(1)}`);
    if (p.z < NORTH_LIMIT - 1e-3 || p.z > SOUTH_LIMIT + 1e-3)
      fail(`${o.name} leaves Z 115–150 at ${p.z.toFixed(1)}`);
    if (p.y < -1e-3 || p.y > HEAP_H + 1e-3) fail(`${o.name} at y ${p.y.toFixed(1)}`);
    if (p.z > SKIRT_Z + 1e-3) {
      if (p.y > SKIRT_H + 1e-3)
        fail(`${o.name} is ${p.y.toFixed(1)} m high at Z ${p.z.toFixed(1)}, south of 125`);
      skirtTop = Math.max(skirtTop, p.y);
    } else {
      heapTop = Math.max(heapTop, p.y);
      heapZ = [Math.min(heapZ[0], p.z), Math.max(heapZ[1], p.z)];
    }
  });
});

const ci = count(intact);
const cr = count(ruined);
if (ci.total > MAX_TRIS_STATE) fail(`intact ${ci.total} tris over ${MAX_TRIS_STATE}`);
if (cr.total > MAX_TRIS_STATE) fail(`ruined ${cr.total} tris over ${MAX_TRIS_STATE}`);
const box = worldBox(root);
const { drawn, k } = seabed.stand(root, FOOTPRINT, { drawn: FOOTPRINT });
if (Math.abs(k - 1) > 1e-9) fail(`stand found ×${k}; the plan is not ±285`);

const fmt = (m) => [...m].map(([n, t]) => `${n} ${t}`).join(', ');
console.log(
  `env_ruin_transit_arch: drawn ${drawn.toFixed(3)} across, held at ${FOOTPRINT} m (×${k.toFixed(5)}); ` +
    `box x ${box.min.x.toFixed(1)}..${box.max.x.toFixed(1)} y ${box.min.y.toFixed(1)}..${box.max.y.toFixed(1)} ` +
    `z ${box.min.z.toFixed(1)}..${box.max.z.toFixed(1)}\n` +
    `  intact ${ci.total} tris (${fmt(ci.byMat)})\n  ruined ${cr.total} tris (${fmt(cr.byMat)})`
);
if (process.argv.includes('--report')) {
  console.log(
    `  soffit: ${soffitMin.toFixed(1)} at the springing, ${soffit(0).toFixed(1)} at the crown ` +
      `(${crownThick} m of masonry under the top ${TOP}); foundations ${box.min.y.toFixed(1)}`
  );
  lampAt.forEach(([x, y, z], i) =>
    console.log(`  lamp_${i}: x ${x} y ${y} z ${z.toFixed(2)} (glass ${GLASS.join('×')})`)
  );
  console.log(`  lamps: nearest pair ${lampGap.toFixed(1)} m`);
  HANGS.forEach(([name, pivot, L], i) =>
    console.log(
      `  ${name}: pivot (${pivot.map((v) => +v.toFixed(1)).join(', ')}), cable ${L} m, lowest ${hangLow[i]}`
    )
  );
  console.log(
    `  ruined heap: top ${heapTop.toFixed(1)} over Z ${heapZ[0].toFixed(1)}..${heapZ[1].toFixed(1)}; ` +
      `skirt top ${skirtTop.toFixed(2)} south of Z 125`
  );
  falls.forEach((f, i) => {
    const b = worldBox(f);
    console.log(
      `  fall_${i}: rest (${f.position.x}, ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)}, ${f.position.z}), ` +
        `yaw ${f.rotation.y}, starts ${f.userData.startAboveRestM} m above rest`
    );
  });
}
await exportGlb(root, 'env-ruin-transit-arch.glb');
