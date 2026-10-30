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
 * INTACT (`state_intact`), §6's plan X ±285, Z ±80; levels in the table.
 * #1683 reshaped it inside §11's "Permitted changes and their bounds" —
 * proud piers, drum setbacks, deeper ribs, fewer drifts — and the figures
 * here are the ones the script measures after the build:
 * - Two piers, `pier_e_*` and `pier_w_*`, 100 m wide (X ±185 to ±285) and
 *   160 m deep at the plinth. Each is a plinth (y 0–12), three drums
 *   (12–45, 45–80, 80–100) and a capital (100–110, Z ±75) the span springs
 *   from. A drum's north and X faces step in 1.5 m from the one below; its
 *   south face steps back 5.5 m: drum 0 at Z 76, where the lamps are, drum
 *   1 at 70.5, drum 2 at 65, and the capital stands 10 m proud of drum 2 at
 *   75. A drum is a core whose south face is at Z 65, 60 and 55 under
 *   cladding 11, 10.5 and 10 m thick: where the cladding survives it is its
 *   own part (`*_clad_*`, chamfered 6 m at the corners), and where it has
 *   fallen the core shows — the east pier from y 20 to 100 over X 200–270,
 *   the west from 45 to 100 over X −255 to −205. Foundations in three
 *   steps from y −30 to 0, the outer X face flush with the plan at ±285
 *   and each step 2 m wider toward the opening.
 * - The span, `span`: one loft of fourteen-cornered sections along X, Z
 *   −72 to +45, so the piers' south faces stand 30 m proud of it and the
 *   capitals carry a 30 m ledge in front of it. Its soffit is 110 at the
 *   springing over each pier and rises to 130 at the crown (110 + 20 (1 −
 *   (x/185)²), a polyline over 23 stations), under 20 m of masonry at the
 *   crown; the top is a deck at 150, 72 m wide and centred on the span
 *   (Z −49.5 to 22.5), with a 3 m step down to 21 m ledges at 147, and the
 *   course above 142 is set in 1.5 m. On the south face the section steps
 *   back 12 m where the cladding has fallen, to Z 33: X 60–270 up to y
 *   138, and X −160 to −110 up to 134. Anything seated on the soffit uses
 *   `loftSoffit`, the loft's own height between stations, not the curve's.
 * - The frame, `rib_*` and `girt_*` (structure_rib): ribs 3 wide and 8 m
 *   deep, standing 1.5 m proud of their recess's back, so 9.5 m in a 12 m
 *   recess on the span and in the drums' 11, 10.5 and 10: no rib is proud
 *   of the face around it (the script checks every rib vertex against that
 *   face). 19 at 11 m pitch over X 64–262: the six over the east pier's
 *   recess are stepped columns, one segment a drum at that drum's back
 *   from y 20 to 100 and one from the capital's top (110) to 138 at the
 *   span's back, so a pier rib stands on the drum below each segment and
 *   the capital reads as the course between the two frames; the rest run
 *   from the soffit to 138. Four more in the west patch and five stepped
 *   ones in the west pier's recess (45–100). Girts behind them at each
 *   recess's back.
 * - The transit line at the springing (structure_rib): the rail bed stops
 *   at the springing and sits on the capitals, so the intrados reads as an
 *   arc in elevation — `rail_w` and `rail_e`, a 6 m shelf at y 110–112.5
 *   and Z 70.5–76.5 along each capital's proud edge, overhanging its face
 *   at 75 by 1.5 m, over X ±185 to ±255; the west one's last 8 m wrenched
 *   over the capital's edge (`rail_torn`, its south edge dropped to 107.7
 *   at X −185, in front of the capital's face). It cannot droop over the
 *   opening as it did from y 123: the soffit rises from 110 at the
 *   springing. `bracket_*` are knees on the capitals' faces under the
 *   overhang; six `mast_*` stand on the shelves to 122.5. The catenary
 *   `wire_w` and `wire_e` run mast to mast over each pier and are torn at
 *   the springing: the west end hangs down in front of the capital's face
 *   to 104, south of the torn shelf, the east a stub past the opening's
 *   edge to 112.5 (1.6 m over the loft's soffit at X 182), each from its
 *   own weight; nothing crosses the opening unsupported. Only the six hung
 *   fittings hang below the soffit: four from it, inside Z −72..45, and
 *   two from the shelves' overhang at Z 75.75, each ending over +60.
 * - Silt (`silt_*`): wedges on the rail shelves, on the capitals (the
 *   east one in the span's recess among the ribs' feet), the course step,
 *   the recess floors and the plinth ledge, banked against the plinths and
 *   on the footing's −10 ledge, each its own size; and six crested drifts
 *   on the deck's ledges against the step (`crest`: a lens in plan rising
 *   to an off-centre ridge), no two alike and at no regular spacing.
 *
 * RUINED (`state_ruined`): "The rock is the terrain's, not the model's":
 * its face runs from Z 125 at the floor to 117 at y 60, so a heap's wall
 * lies on z = 125 − 0.1333 y and nothing is north of Z 115.
 * - `heap_*` (stone_dark): eight fallen masses, each an apron spreading
 *   from the floor (Z 116–119 south to 130–141, widest at the piers' X,
 *   its X taper asymmetric) up to a shoulder at y 15 on Z 125. The four at
 *   the piers' X carry two or three tumbled blocks each, leaning their own
 *   ways to 58 and 55 m at the highest corner, one block each leaning out
 *   past the shoulder where it stays under 15 m; the four across the
 *   opening carry a low wall whose four top corners are at their own
 *   heights (at least a quarter of the tallest apart). South of Z 125
 *   nothing is over 15 m (§6 as amended), and the aprons taper to the
 *   floor inside Z 150. `rib_r0` leans against the face to y 50, its foot
 *   in a heap; `rib_r1` lies on the floor in the skirt.
 * - `skirt_*` and `silt_r*`: fallen courses on the floor south of the
 *   aprons' feet, 2–7.5 m tall, and drifts banked 3 m up the aprons and
 *   round the courses, north of 150.
 * - `fall_0` … `fall_11`: the debris that comes down the face, resting on
 *   the floor south of the aprons' feet. No course or fall piece has a
 *   corner inside a heap; the script tests each against the aprons and
 *   walls, which are convex.
 * No lintel, soffit or framed void, no lamp.
 *
 * The script measures every claim after building and prints them (see
 * `report` at the foot), and throws on: a face wound in on a convex solid,
 * a vertex outside its state's plan or levels, an intact part standing in
 * the opening below the soffit above the floor (hung fittings excepted;
 * the footing steps 2 m toward the opening under y −10 are buried, the
 * relief there bottoming at −13.2), a hang ending
 * under +60, a lamp outside +20..+40 or nearer than 40 m to another, a
 * ruined vertex over +60 or over +15 south of Z 125, a state over the row's
 * 12,000 triangles, or a fifth material; and on §11's bounds read off the
 * built parts: the span's face south of +45, drum 0 off Z 76, a drum
 * stepped back other than 5–6 m from the one below or clad other than
 * 8–11 m, a rib vertex proud of the face around its recess, or other than
 * five or six drifts on the deck's ledges.
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
function loft(rings, { adapt = false } = {}) {
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
  if (!adapt) return { points, tris };
  // A tumbled block's quads are not planar: each is cut along whichever
  // diagonal leaves both triangles facing away from the centroid, so a
  // convex eight-corner solid passes `oriented`'s check however its corners
  // lean. The sense of the rings is read off the naive stitch's volume.
  const P = points.map(v3);
  const c = P.reduce((a, q) => a.add(q), new THREE.Vector3()).divideScalar(P.length);
  const normal = ([a, b, d]) => P[b].clone().sub(P[a]).cross(P[d].clone().sub(P[a]));
  let vol = 0;
  for (const [a, b, d] of tris) vol += P[a].dot(P[b].clone().cross(P[d])) / 6;
  const sgn = vol < 0 ? -1 : 1;
  const out = (t) => sgn * normal(t).dot(P[t[0]].clone().sub(c)) > 0;
  const quad = (a, b, d, e) => {
    const A = [
      [a, b, d],
      [a, d, e],
    ];
    const B = [
      [a, b, e],
      [b, d, e],
    ];
    return A.every(out) ? A : B.every(out) ? B : A;
  };
  const cut = [];
  if (n === 4) cut.push(...quad(at(0, 0), at(0, 3), at(0, 2), at(0, 1)));
  else for (let j = 1; j + 1 < n; j++) cut.push([at(0, 0), at(0, j + 1), at(0, j)]);
  for (let r = 0; r + 1 < rings.length; r++)
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      cut.push(...quad(at(r, i), at(r, j), at(r + 1, j), at(r + 1, i)));
    }
  if (n === 4) cut.push(...quad(at(last, 0), at(last, 1), at(last, 2), at(last, 3)));
  else for (let j = 1; j + 1 < n; j++) cut.push([at(last, 0), at(last, j), at(last, j + 1)]);
  return { points, tris: cut };
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
// The span's north face stays at Z −72; its south face is set back to +45
// (§11 "Proud piers": no further north than +45), so the piers' south
// faces, drum 0 at +76 and the capital at +75, stand 30 m proud of it.
const SPAN_N = -72;
const SPAN_S = 45;
const TOP = 150;
const COURSE = 142; // the top course steps in here
// The recess where the span's cladding has fallen: 12 m deep (§11 "Ribs":
// at most 12), its back at Z 33. A rib stands RIB_OFF proud of a recess's
// back and RIB_D deep, 9.5 together, so no rib is proud of the face around
// its recess (the span's 12, the drums' 11, 10.5 and 10).
const RECESS = 12;
const SPAN_BACK = SPAN_S - RECESS;
const RIB_D = 8;
const RIB_OFF = 1.5;
const SOFFIT_PIER = 110;
const CROWN_RISE = 20; // the soffit's rise from the springing to the crown
const soffit = (x) =>
  Math.abs(x) >= 185 ? SOFFIT_PIER : SOFFIT_PIER + CROWN_RISE * (1 - (x / 185) ** 2);

// --- the piers -------------------------------------------------------------
// A pier is built at its east station and mirrored in X for the west by
// `sideX`; the two recesses differ, so each cladding list is its own.
// `zn` is a drum's north face, `zs` its south face and `back` its core's
// south face, the cladding between them. The north and the X faces step
// in 1.5 m a drum as before; the south faces step back 5.5 m a drum (§11
// "Drum setbacks": 5–6 m, drum 0 held at +76 so the lamps on it stay) and
// each core steps back with its face, so the cladding is 11, 10.5 and 10 m.
const DRUMS = [
  { y: [12, 45], x: [187, 283], zn: 76, zs: 76, back: 65 },
  { y: [45, 80], x: [188.5, 281.5], zn: 74.5, zs: 70.5, back: 60 },
  { y: [80, 100], x: [190, 280], zn: 73, zs: 65, back: 55 },
];
const CHAMFER = 10;
const CLAD_CHAMFER = 6;

/** The core's plan: chamfered on the north corners, flat at `back` on the south. */
function coreRing([x0, x1], zn, back) {
  return [
    [x0 + CHAMFER, -zn],
    [x1 - CHAMFER, -zn],
    [x1, -zn + CHAMFER],
    [x1, back],
    [x0, back],
    [x0, -zn + CHAMFER],
  ];
}
/** A cladding strip on the south face over X [x0, x1], chamfered at a pier's outer corners. */
function cladRing([x0, x1], zs, back, { chamferW = false, chamferE = false }) {
  const ring = [
    [x0, back],
    [x1, back],
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
      prism(mirror(coreRing(d.x, d.zn, d.back)), d.y[0], d.y[1])
    );
    const clad = recess(i, d).map(({ x, y, chamferW, chamferE }) =>
      prism(mirror(cladRing(x, d.zs, d.back, { chamferW, chamferE })), y[0], y[1])
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
  [-160, RECESS, 134],
  [-135, RECESS, 134],
  [-110, RECESS, 134],
  [-110, 0, 134],
  [-85, 0, 138],
  [-60, 0, 138],
  [-30, 0, 138],
  [0, 0, 138],
  [30, 0, 138],
  [60, 0, 138],
  [60, RECESS, 138],
  [85, RECESS, 138],
  [110, RECESS, 138],
  [135, RECESS, 138],
  [160, RECESS, 138],
  [185, RECESS, 138],
  [230, RECESS, 138],
  [270, RECESS, 138],
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
// The top is two levels: a deck at 150, 72 m wide and centred on the span
// (Z −49.5 to +22.5), and ledges at 147, 21 m wide each side, to the
// course step, which is set in 1.5 m above 142.
const DECK_N = (SPAN_N + SPAN_S) / 2 - 36;
const DECK_S = (SPAN_N + SPAN_S) / 2 + 36;
const LEDGE = 147;
function spanRing([x, d, t]) {
  const s = soffit(x);
  return [
    [SPAN_N, s],
    [SPAN_S - d, s],
    [SPAN_S - d, t],
    [SPAN_S, t],
    [SPAN_S, COURSE],
    [SPAN_S - 1.5, COURSE],
    [SPAN_S - 1.5, LEDGE],
    [DECK_S, LEDGE],
    [DECK_S, TOP],
    [DECK_N, TOP],
    [DECK_N, LEDGE],
    [SPAN_N + 1.5, LEDGE],
    [SPAN_N + 1.5, COURSE],
    [SPAN_N, COURSE],
  ].map(([z, y]) => [x, y, z]);
}
solid(intact, 'span', stone, oriented(loft(STATIONS.map(spanRing)), { convex: false }));

// --- the frame: ribs and girts in the recesses ---------------------------------
// A rib follows the core it stands in: one segment a drum at that drum's
// back, stopping under the capital (100), and one from the capital's top
// (110) to the recess top at the span's back, so a pier rib is a stepped
// column and the capital reads as the course between the two frames.
const RIB_W = 3.0;
const RIB_PITCH = 11;
const ribZ = (back) => [back + RIB_OFF, back + RIB_OFF + RIB_D];
let ribN = 0;
/** A rib from segments of `[y0, y1, back]`, one part. */
function ribAt(x, segments) {
  solid(
    intact,
    `rib_${ribN++}`,
    rib,
    segments.map(([y0, y1, back]) => slab([x - RIB_W / 2, x + RIB_W / 2], [y0, y1], ribZ(back)))
  );
}
/** The drum segments of a pier rib from `y0` up to the capital. */
const drumSegments = (y0) =>
  DRUMS.filter((d) => d.y[1] > y0).map((d) => [Math.max(y0, d.y[0]), d.y[1], d.back]);
// A rib from the soffit starts at the higher of the loft's two heights
// across its own width, since the soffit rises toward the crown.
const springing = (x) => Math.max(loftSoffit(x - RIB_W / 2), loftSoffit(x + RIB_W / 2));
const RIBS_E = Array.from({ length: 19 }, (_, k) => 64 + RIB_PITCH * k); // 64 … 262
for (const x of RIBS_E)
  ribAt(
    x,
    x >= 200 ? [...drumSegments(20), [110, 138, SPAN_BACK]] : [[springing(x), 138, SPAN_BACK]]
  );
for (const x of [-152, -141, -130, -119]) ribAt(x, [[springing(x), 134, SPAN_BACK]]);
for (const x of [-250, -240, -230, -220, -210]) ribAt(x, drumSegments(45));
const girtZ = (back) => [back, back + RIB_OFF];
solid(intact, 'girt_0', rib, slab([60, 270], [133, 135.5], girtZ(SPAN_BACK)));
solid(intact, 'girt_1', rib, slab([200, 270], [58, 60.5], girtZ(DRUMS[1].back)));
solid(intact, 'girt_2', rib, slab([-160, -110], [129, 131.5], girtZ(SPAN_BACK)));
solid(intact, 'girt_3', rib, slab([-255, -205], [70, 72.5], girtZ(DRUMS[1].back)));

// --- the transit line at the springing ----------------------------------------
// The rail bed stops at the springing and sits on the capitals (§11 "Proud
// piers": "the rail bed, brackets and catenary move with the face or onto
// the capitals"): a 6 m shelf at y 110–112.5 along each capital's proud
// south edge, Z 70.5–76.5, overhanging the capital's face at 75 by 1.5 m,
// so two hung fittings have an underside to hang from. It runs over each
// pier (X ±185 to ±255) and stops at the opening's edge, so the intrados
// reads as an arc.
const RAIL_Y = [110, 112.5];
const RAIL_Z = [70.5, 76.5];
const CAPITAL_FACE = 75;
solid(intact, 'rail_w', rib, slab([-255, -193], RAIL_Y, RAIL_Z));
solid(intact, 'rail_e', rib, slab([185, 255], RAIL_Y, RAIL_Z));
// The west shelf's torn end: its last 8 m wrenched over the capital's edge,
// the south edge dropped to 107.7 in front of the capital's face. It cannot
// droop over the opening as it did at y 120: the loft's soffit rises from
// 110 at the springing, and only the six hung fittings hang below it.
solid(
  intact,
  'rail_torn',
  rib,
  oriented(
    loft([
      [
        [-193, 110, 70.5],
        [-193, 110, 76.5],
        [-193, 112.5, 76.5],
        [-193, 112.5, 70.5],
      ],
      [
        [-185, 110, 70.5],
        [-185, 107.7, 77.2],
        [-185, 110.1, 78.1],
        [-185, 112.4, 71.3],
      ],
    ])
  )
);
// Brackets: knees on the capital's face under the shelf's overhang.
const BRACKETS = [-240, -205, 218, 251];
BRACKETS.forEach((x, i) =>
  solid(
    intact,
    `bracket_${i}`,
    rib,
    slab([x - 1, x + 1], [105, RAIL_Y[0]], [CAPITAL_FACE, RAIL_Z[1]])
  )
);
// Catenary masts on the shelves and the wire between them, torn at the
// springing on both sides: the west wire's end hangs down in front of the
// capital's face, the east a stub past the opening's edge.
const MAST_X = [-250, -220, -196, 190, 220, 250];
const MAST_TOP = 122.5;
const WIRE_Z = 73.5;
MAST_X.forEach((x, i) =>
  solid(intact, `mast_${i}`, rib, slab([x - 1, x + 1], [RAIL_Y[1], MAST_TOP], [72.5, 74.5]))
);
function catenary(from, to, sag = 2.5, n = 4) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push([from + (to - from) * u, MAST_TOP - 0.5 - sag * 4 * u * (1 - u), WIRE_Z]);
  }
  return pts;
}
// The west wire's torn end hangs down past the torn shelf, south of it
// (the shelf's twisted end reaches Z 78.1), to 104 in front of the
// capital's face.
const wireW = [
  ...catenary(-250, -220, 1.5),
  ...catenary(-220, -196, 1.5).slice(1),
  [-190, 118.5, 75],
  [-187, 114, 78.6],
  [-185.5, 104, 79],
];
// The east wire is torn at its springing too: from the last mast a stub
// hangs past the opening's edge from its own weight, 1.6 m over the loft's
// soffit (110.6 at X 182), and nothing crosses the opening unsupported.
const wireE = [
  ...catenary(250, 220, 1.5),
  ...catenary(220, 190, 1.5).slice(1),
  [184, 118, 75],
  [182, 112.5, 76],
];
solid(intact, 'wire_w', rib, tube(wireW, 0.3));
solid(intact, 'wire_e', rib, tube(wireE, 0.3));

// --- the hung fittings ------------------------------------------------------------
// Each a node at its pivot, geometry hanging below in local space: a cable
// (square, 0.5 m) from 0.4 m above the pivot — sunk into what it hangs
// from, so contacts lists each against it — to −L, then the fitting. A
// soffit pivot sits on `loftSoffit`, inside the span's Z −72..45; a rail
// pivot on the shelf's overhanging underside at Z 75.75, clear of the
// capital's face at 75 and of every drum's face below it. The two rail
// hangs are shorter than they were from y 123, so each still ends over
// +60. Lowest points are measured and reported after the build.
const SINK = 0.4;
const RAIL_HANG_Z = (CAPITAL_FACE + RAIL_Z[1]) / 2;
const HANGS = [
  // [name, pivot, cable length, fitting]
  ['hang_0', [-120, loftSoffit(-120), 25], 48, 'frame'],
  ['hang_1', [-30, loftSoffit(-30), 5], 56, 'rail'],
  ['hang_2', [75, loftSoffit(75), 28], 40, 'standard'],
  ['hang_3', [-230, RAIL_Y[0], RAIL_HANG_Z], 43, 'frame'],
  ['hang_4', [40, loftSoffit(40), 18], 58, 'drum'],
  ['hang_5', [230, RAIL_Y[0], RAIL_HANG_Z], 45, 'rail'],
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
// face at Z 76), 20–40 m up, past the capital's Z 75 and the rail bed's
// overhang at 76.5 so the glass top shows from above. The housing is a
// back plate and an arm; the glass sits on the arm, its node at its
// centre. Unchanged by §11: drum 0 holds at Z 76 so these do not move.
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
// A crested drift on a ledge (§11 "Drifts": "on ridged plans"): a lens in
// plan, a six-cornered base `len` long and `wid` across its middle, bearing
// `yaw` from X, rising to a ridge `h` tall that runs off-centre along it
// (`skew` across, as a bank is steeper on its sheltered side). Every
// triangle is a face of the convex hull of the base and the ridge, so
// `oriented` checks it as it checks a block.
function crest(parent, [cx, cz], len, wid, h, yaw, y0, skew = 0.2) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const P = (u, v) => [cx + u * c - v * s, cz + u * s + v * c];
  const base = [
    P(-len / 2, 0),
    P(-len / 4, -wid / 2),
    P(len / 4, -wid / 2),
    P(len / 2, 0),
    P(len / 4, wid / 2),
    P(-len / 4, wid / 2),
  ];
  const r0 = P(-len * 0.3, wid * skew);
  const r1 = P(len * 0.25, wid * skew);
  const ridge = [r0, r0, r1, r1, r1, r0];
  const name = `silt_${siltN++}`;
  solid(
    parent,
    name,
    silt,
    oriented(
      loft([base.map(([x, z]) => [x, y0 - 0.2, z]), ridge.map(([x, z]) => [x, y0 + h, z])], {
        adapt: true,
      }),
      { label: name }
    )
  );
}
// On the rail shelves' tops.
drift(intact, [-240, -204], [71, 76], RAIL_Y[1], 1.2, 'north');
drift(intact, [196, 214], [71, 76], RAIL_Y[1], 0.7, 'north');
// On the top's ledges, against the deck's step: six crested drifts (§11:
// five or six, from twelve), no two the same length, width, height or
// bearing, at no regular spacing, so they cannot read as markings along
// the deck. The ledges are 21 m wide; each lies inside its own.
const DECK_DRIFTS = [
  // [x, ledge, length, width, height, yaw]
  [-226, 's', 38, 9, 1.6, 0.12],
  [-62, 's', 26, 7, 1.1, -0.18],
  [118, 's', 32, 8, 1.4, 0.08],
  [-158, 'n', 22, 6, 0.9, -0.1],
  [34, 'n', 40, 9, 1.8, 0.14],
  [214, 'n', 28, 7, 1.2, -0.2],
];
for (const [x, side, len, wid, h, yaw] of DECK_DRIFTS)
  crest(
    intact,
    [x, side === 's' ? DECK_S + wid / 2 + 1 : DECK_N - wid / 2 - 1],
    len,
    wid,
    h,
    yaw,
    LEDGE,
    side === 's' ? -0.2 : 0.2
  );
// On the capitals' ledges: the east banked against the span's recess back
// among the ribs' feet (the recess runs over X 60–270, so the face there
// is at 33), the west against the span's face on the proud south ledge,
// and one on the 3 m north ledge.
drift(intact, [200, 240], [SPAN_BACK, SPAN_BACK + 7], 110, 1.5, 'north');
drift(intact, [250, 280], [-75, -72], 110, 1.1, 'south');
drift(intact, [-280, -230], [SPAN_S, SPAN_S + 6], 110, 1.8, 'north');
// On the course step at 142.
drift(intact, [-100, -40], [SPAN_S - 1.5, SPAN_S], COURSE, 0.9, 'north');
drift(intact, [140, 200], [SPAN_S - 1.5, SPAN_S], COURSE, 0.7, 'north');
drift(intact, [-250, -190], [SPAN_N, SPAN_N + 1.5], COURSE, 1.0, 'south');
// In the recess floors: the east on drum 0's lower cladding at y 20, the
// west on drum 0's top at 45, banked against drum 1's core.
drift(intact, [205, 235], [DRUMS[0].back, 76], 20, 2.5, 'north');
drift(intact, [-250, -225], [DRUMS[1].back, 72], 45, 1.6, 'north');
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
  [-40, COURSE, SPAN_S],
  [230, RAIL_Y[1], 74],
  [-270, 110, 75],
  [205, 20, 70],
  [-186, 110, 77],
  [255, 12, 78.5],
  [-125, 134, SPAN_S],
  [120, LEDGE, DECK_S],
].forEach((at, i) => sift(intact, `sift_${i}`, at));

// ---------------------------------------------------------------------------
// RUINED
// ---------------------------------------------------------------------------
const FACE_FOOT = 125; // the rock face's foot, Z
const FACE_SLOPE = 8 / 60; // Z lost per metre up
const faceZ = (y) => FACE_FOOT - FACE_SLOPE * y;
const NORTH_LIMIT = 115;
const SKIRT_Z = 125;
const SKIRT_H = 15;
const SOUTH_LIMIT = 150;
const HEAP_H = 60;

/**
 * A fallen mass against the face. Every heap is an apron, a convex frustum
 * from its base on the floor (Z `zn` south to `zb` over X `xb`) up to a
 * shoulder at y 15 on Z 125 over X `xm` — south of which nothing is over
 * 15 m — and what it carries above the shoulder is one of two things. A
 * low heap carries a wall: a frustum from the shoulder to a top over `xt`
 * whose four corners are at their own heights `yts` (north-west,
 * north-east, south-east, south-west), lying against the rock
 * (z = 125 − 0.1333 y) and `thick` deep. A tall heap carries `blocks`:
 * tumbled eight-corner solids, each leaning its own way, resting in the
 * apron. The aprons' X tapers are asymmetric and no two heaps share a
 * profile, so the row reads as courses that came down rather than a run
 * of plinths. Every piece is convex (`loft`'s adaptive cut), so
 * `insideHeap` can test the skirt and the fall pieces against it.
 */
const heaps = [];
const SHOULDER_N = 119; // the shoulder ring's north edge, 4 m inside the rock's face at y 15
function apronOf(xb, xm, zn, zb) {
  const ring = (x, y, z0, z1) => [
    [x[0], y, z0],
    [x[1], y, z0],
    [x[1], y, z1],
    [x[0], y, z1],
  ];
  return { shoulder: ring(xm, SKIRT_H, SHOULDER_N, FACE_FOOT), base: ring(xb, 0, zn, zb) };
}
function heap(name, xb, xm, xt, yts, zn, zb, thick = 6, mat = stone) {
  const { base, shoulder } = apronOf(xb, xm, zn, zb);
  const top = [
    [xt[0], yts[0], faceZ(yts[0]) + 0.3],
    [xt[1], yts[1], faceZ(yts[1]) + 0.3],
    [xt[1], yts[2], Math.min(faceZ(yts[2]) + 0.3 + thick, FACE_FOOT - 0.5)],
    [xt[0], yts[3], Math.min(faceZ(yts[3]) + 0.3 + thick, FACE_FOOT - 0.5)],
  ];
  const apron = oriented(loft([base, shoulder], { adapt: true }), { label: `${name} apron` });
  const wall = oriented(loft([shoulder, top], { adapt: true }), { label: `${name} wall` });
  heaps.push(apron, wall);
  solid(ruined, name, mat, [apron, wall]);
}
function heapTall(name, xb, xm, zn, zb, blocks, mat = stone) {
  const { base, shoulder } = apronOf(xb, xm, zn, zb);
  const apron = oriented(loft([base, shoulder], { adapt: true }), { label: `${name} apron` });
  const pieces = [apron];
  blocks.forEach(([bottom, top], i) =>
    pieces.push(oriented(loft([bottom, top], { adapt: true }), { label: `${name} block ${i}` }))
  );
  heaps.push(...pieces);
  solid(ruined, name, mat, pieces);
}
/** Whether a world point lies inside one of the heaps (all convex, wound out). */
function insideHeap(p) {
  return heaps.some(({ points, tris }) =>
    tris.every(([i, j, k]) => {
      const A = v3(points[i]);
      const n = v3(points[j]).sub(A).cross(v3(points[k]).sub(A));
      return n.dot(p.clone().sub(A)) < -1e-6;
    })
  );
}
// The piers' broken mass: aprons to Z 141 carrying two or three tumbled
// blocks each, 58 and 55 m at the tallest corner, one block of each
// leaning out past the shoulder where it stays under 15 m.
heapTall('heap_e0', [195, 285], [202, 282], 119, 141, [
  [
    [
      [206, 9, 118],
      [250, 9, 118],
      [250, 10, 129],
      [206, 8, 129],
    ],
    [
      [212, 58, 117.5],
      [246, 52, 118.2],
      [244, 55, 122.5],
      [214, 46, 123.5],
    ],
  ],
  [
    [
      [246, 5, 119],
      [285, 6, 119],
      [285, 8, 131],
      [248, 4, 131],
    ],
    [
      [252, 40, 119.5],
      [281, 34, 120],
      [280, 44, 124],
      [250, 30, 123],
    ],
  ],
  [
    [
      [197, 1, 120],
      [224, 2, 120],
      [222, 2, 135],
      [199, 1, 134],
    ],
    [
      [200, 24, 121],
      [221, 20, 122],
      [219, 15, 128],
      [201, 12, 130],
    ],
  ],
]);
heapTall('heap_e1', [148, 200], [152, 196], 118, 137, [
  [
    [
      [150, 4, 118],
      [180, 5, 118],
      [178, 6, 130],
      [152, 3, 130],
    ],
    [
      [154, 38, 120.2],
      [176, 30, 121],
      [175, 34, 124.5],
      [156, 26, 124],
    ],
  ],
  [
    [
      [174, 2, 119],
      [200, 3, 119],
      [199, 4, 133],
      [176, 2, 133],
    ],
    [
      [178, 18, 122],
      [197, 22, 122.5],
      [196, 15, 127],
      [180, 13, 129],
    ],
  ],
]);
heapTall('heap_w0', [-285, -192], [-283, -198], 119, 141, [
  [
    [
      [-280, 6, 118],
      [-236, 7, 118],
      [-238, 9, 130],
      [-282, 5, 129],
    ],
    [
      [-274, 47, 119],
      [-242, 55, 117.8],
      [-244, 50, 123],
      [-272, 40, 123.8],
    ],
  ],
  [
    [
      [-240, 3, 119],
      [-200, 4, 119],
      [-198, 5, 132],
      [-242, 2, 132],
    ],
    [
      [-234, 36, 120.5],
      [-206, 28, 121.5],
      [-204, 31, 124.5],
      [-232, 22, 124],
    ],
  ],
  [
    [
      [-262, 1, 121],
      [-230, 2, 121],
      [-228, 1, 136],
      [-264, 1, 135],
    ],
    [
      [-258, 21, 121.5],
      [-233, 17, 122],
      [-231, 15, 126.5],
      [-259, 10, 131],
    ],
  ],
]);
heapTall('heap_w1', [-198, -140], [-196, -146], 118, 137, [
  [
    [
      [-196, 3, 118],
      [-160, 4, 118],
      [-162, 5, 131],
      [-198, 3, 130],
    ],
    [
      [-192, 30, 121.5],
      [-166, 24, 122],
      [-168, 27, 124.5],
      [-190, 19, 124.5],
    ],
  ],
  [
    [
      [-170, 1, 119],
      [-140, 2, 119],
      [-141, 3, 134],
      [-172, 1, 133],
    ],
    [
      [-167, 16, 122.5],
      [-143, 20, 122],
      [-144, 14, 128],
      [-168, 10, 130],
    ],
  ],
]);
// The fallen courses across the opening: low walls with broken tops, each
// corner at its own height (all above the shoulder's 15, or the frustum
// would fold), each taper its own.
heap('heap_m0', [-136, -62], [-134, -68], [-131, -80], [22, 17, 20, 16], 117, 132, 7);
heap('heap_m1', [-58, 28], [-56, 24], [-44, 18], [20, 28, 24, 17], 117.5, 134, 6);
heap('heap_m2', [32, 98], [34, 94], [36, 78], [23, 17, 18, 16], 116, 130, 8);
heap('heap_m3', [102, 146], [106, 145], [116, 143], [19, 26, 22, 17], 117, 133, 6);
// A rib leaning on the heap against the face, its foot in the heap, and
// one lying on the floor in the skirt. The fallen rib keeps the 3.5 m
// depth the frame had when it fell (#1683 deepened the standing ribs to 8
// and left the ruined state as it was).
solid(ruined, 'rib_r0', rib, beam([62, 1.8, 123], [80, 50, faceZ(50) + 2], RIB_W, 3.5));
solid(ruined, 'rib_r1', rib, beam([-140, 1.2, 146], [-102, 1.2, 147.5], RIB_W, 2.4));

// The skirt: fallen courses on the floor south of the heaps' feet, yawed,
// no top over 15 m and none inside a heap (checked below).
const SKIRT = [
  // [x, z, w, d, h, yaw, a top corner dropped]
  [-262, 146, 8, 5, 4.2, 0.3, 1.1],
  [-205, 145, 10, 4, 3.4, -0.2, 0.8],
  [-170, 144, 8, 5, 2.6, 0.9, 0.6],
  [-120, 140, 16, 6, 4.8, 0.15, 1.4],
  [-75, 141, 9, 7, 3.0, -0.8, 0.7],
  [-30, 141, 12, 5, 6.5, 0.4, 1.6],
  [25, 145, 7, 6, 2.4, 1.1, 0.5],
  [70, 138, 15, 7, 7.5, -0.2, 2.0],
  [106, 143, 9, 5, 3.1, 0.7, 0.9],
  [160, 144, 11, 6, 3.6, -0.6, 0.8],
  [205, 146, 10, 5, 4.9, 0.25, 1.5],
  [240, 146, 8, 4, 2.8, -0.4, 0.6],
  [270, 146, 9, 5, 3.3, 0.2, 0.9],
  [-10, 142, 10, 4, 2.2, 0.0, 0.4],
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

// Drifts banked into the heaps' feet, their backs 3 m up the slope, and
// round the skirt. They keep the names they had before #1683 took six
// deck drifts out of the intact count ahead of them, so the ruined state
// is the committed one part for part, names included.
siltN = 31;
drift(ruined, [-280, -220], [138, 146], 0, 3.0, 'north');
drift(ruined, [-190, -160], [134, 141], 0, 2.4, 'north');
drift(ruined, [-130, -100], [129, 136], 0, 2.0, 'north');
drift(ruined, [-22, 2], [131, 140], 0, 3.2, 'north');
drift(ruined, [40, 60], [127, 134], 0, 2.0, 'north');
drift(ruined, [126, 144], [130, 137], 0, 2.2, 'north');
drift(ruined, [180, 194], [134, 141], 0, 2.5, 'north');
drift(ruined, [246, 262], [138, 144], 0, 2.0, 'north');
drift(ruined, [-200, -180], [145, 150], 0, 1.2, 'north');
drift(ruined, [30, 48], [142, 150], 0, 1.0, 'north');
drift(ruined, [212, 219], [145, 150], 0, 0.9, 'north');

// The debris that comes down the face: at rest on the floor south of the
// heaps' feet, and each node carries how far above its rest it starts.
const FALLS = [
  // [x, z, w, h, d, yaw, start above rest (m), material]
  [-230, 146, 9, 4.5, 5, 0.3, 190, stone],
  [-150, 146, 7, 5, 5, -0.4, 165, stone],
  [-95, 141, 2.4, 3.5, 14, 0.4, 150, rib],
  [-44, 146, 6, 4, 4, 0.8, 140, stone],
  [10, 140, 8, 5, 6, -0.2, 175, stone],
  [55, 146, 5, 3, 4, 1.2, 125, stone],
  [120, 139, 10, 4.8, 7, 0.1, 160, stone],
  [175, 145, 6, 4, 5, -0.7, 110, stone],
  [225, 146, 7, 5, 4, 0.5, 180, stone],
  [258, 146, 4, 3, 3, -0.3, 95, stone],
  [-270, 146, 5, 3.5, 4, 0.6, 100, stone],
  [90, 141, 12, 5, 8, 0.2, 210, stone],
];
const falls = FALLS.map(([x, z, w, h, d, yaw, start, mat], i) =>
  solid(ruined, `fall_${i}`, mat, localBox(w, h, d), {
    at: [x, h / 2, z],
    yaw,
    userData: { startAboveRestM: start },
  })
);
// No course or fall piece has a corner inside a heap.
ruined.updateMatrixWorld(true);
ruined.traverse((o) => {
  if (!o.isMesh || !/^(skirt|fall)_/.test(o.name)) return;
  const pos = o.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const w = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
    if (insideHeap(w)) throw new Error(`env_ruin_transit_arch: ${o.name} is buried in a heap`);
  }
});

[
  [-240, 55, faceZ(55) + 2],
  [160, 36, 122],
  [10, 26, 123.5],
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

// §11's bounds, read off the built parts rather than the constants: the
// span's south face no further south than +45; drum 0's face at 76, each
// drum above it 5–6 m back from the one below, cladding 8–11 m; no rib
// vertex south of the face around its recess; five or six deck drifts.
const southFace = (name) => {
  let z = -Infinity;
  eachVertex(intact.getObjectByName(name), (p) => (z = Math.max(z, p.z)));
  return +z.toFixed(2);
};
const spanFace = southFace('span');
if (spanFace > 45 + 1e-6) fail(`span face at Z ${spanFace}, south of +45`);
const drumFaces = { e: [], w: [] };
for (const tag of ['e', 'w'])
  DRUMS.forEach((d, i) => {
    const face = southFace(`pier_${tag}_clad_${i}`);
    drumFaces[tag].push(face);
    if (Math.abs(face - d.zs) > 1e-6) fail(`pier_${tag}_clad_${i} face at ${face}, not ${d.zs}`);
    if (d.zs - d.back < 8 || d.zs - d.back > 11) fail(`drum ${i} cladding ${d.zs - d.back} m`);
    if (i === 0 && d.zs !== 76) fail(`drum 0 face at ${d.zs}, not 76`);
    if (i > 0) {
      const step = DRUMS[i - 1].zs - d.zs;
      if (step < 5 || step > 6) fail(`drum ${i} steps back ${step} m, not 5–6`);
    }
  });
const capitalFace = southFace('pier_e_capital');
const recessDepths = [RECESS, ...DRUMS.map((d) => d.zs - d.back)];
if (RIB_D > 8 || Math.min(...recessDepths) < RIB_OFF + RIB_D)
  fail(
    `ribs ${RIB_D} m deep, ${RIB_OFF} m off the back, in a ${Math.min(...recessDepths)} m recess`
  );
const faceAround = (y) =>
  y >= 110 - 1e-6 ? SPAN_S : DRUMS.find((d) => y >= d.y[0] - 1e-6 && y <= d.y[1] + 1e-6).zs;
intact.traverse((o) => {
  if (!o.isMesh || !/^rib_\d+$/.test(o.name)) return;
  eachVertex(o, (p) => {
    if (p.z > faceAround(p.y) + 1e-6)
      fail(`${o.name} is proud of the face at (${p.x}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})`);
  });
});
const deckDrifts = [];
intact.traverse((o) => {
  if (o.isMesh && o.material === silt && worldBox(o).min.y >= LEDGE - 0.3) deckDrifts.push(o.name);
});
if (deckDrifts.length < 5 || deckDrifts.length > 6)
  fail(`${deckDrifts.length} drifts on the deck's ledges, not five or six`);

// Ruined: X ±285, Z 115–150, no higher than 60, and 5 south of Z 125.
let heapTop = -Infinity;
let heapZ = [Infinity, -Infinity];
let skirtTop = -Infinity;
const apronFoot = Math.max(...heaps.flatMap(({ points }) => points.map(([, , z]) => z)));
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
  console.log(
    `  span face Z ${spanFace}; drum faces e ${drumFaces.e.join('/')} w ${drumFaces.w.join('/')}, ` +
      `capital ${capitalFace}; ribs ${RIB_D} m deep, ${RIB_OFF} m off the back, ` +
      `recesses ${recessDepths.join('/')} m (span, drums 0–2); ` +
      `deck drifts ${deckDrifts.length} (${deckDrifts.join(', ')})`
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
      `aprons' feet to Z ${apronFoot.toFixed(1)}; skirt top ${skirtTop.toFixed(2)} south of Z 125 (cap ${SKIRT_H})`
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
