/**
 * The Pelagia Commune — the Veil's shape language.
 *
 * "Organic, curved, asymmetric — silhouettes read as leaves, seed-pods and
 * swimming things. Grown chitin-and-algae composite hull with growth rings and
 * living bioluminescent veins; nothing is painted" (docs/asset-prompts-3d.md,
 * Block 2).
 *
 * The vocabulary is read off the Sower, the Spinner and the Harvester, whose
 * node names are the parts list:
 *
 *   Sower      bloom_bed · bed_underside · rib_0..6 · rib_vein_0..6 · bladder ·
 *              bladder_ring_0..1 · bud · seed_pod_0..5 · pod_cap_0..5 · stem ·
 *              stem_ring_0..2 · stem_keel · caudal_p/s · leaf_tip ·
 *              edge_light_p0..2/s0..2 · stem_light
 *   Spinner    pod_body · growth_ring_0..2 · mine_sac_0..3 · sac_bud_0..3 ·
 *              pectoral_p/s · fluke_p/s · dorsal_blade · spinneret · nav_bow ·
 *              nav_dorsal · dorsal_vein
 *   Harvester  hull · cargo_lobe_port/starboard · growth_ring_1..5 ·
 *              baleen_plate_1..7 · feed_tendril_* · paddle_* · tail_fluke_*
 *
 * Three rules fall out of those, and they are what this module holds rather
 * than any one hull:
 *
 * - **Beam is body, not wing.** Where the Order carries its width in a planar
 *   wing off a spar, the Commune's width *is* the hull — a pod swollen at the
 *   waist, a leaf spread flat — and every body is squashed, wider than it is
 *   tall (the Spinner's pod is 16.8 m across and 11.8 m tall; the Sower's
 *   bladder 18 m by 9). A round section reads as a machine; a flattened one as
 *   a swimming thing. `squash` is therefore a parameter on every body here.
 * - **Grown, so nothing is quite regular.** Rings and pods differ in size from
 *   one to the next; pods sit where they grew, never in a rank; the
 *   Harvester's growth rings each tilt a few degrees off square. The series
 *   are still loops — they just carry a wobble, and the builders refuse a
 *   mirrored pair where the model shows the navy growing each side its own way.
 * - **Light is a vein, not a lamp.** The Commune has the lowest SIG in the
 *   game, so its lit parts are a thread along a rib, one bud at the node, a
 *   nav mark: flat strips on upward faces, because the maps are top-down
 *   (kit.mjs). The Sower's whole resting light is seven strips and a bud.
 *
 * Pod and ring facet counts are the approved models' own and stay low: the
 * style asks for something grown and faceted, not a smooth render.
 */
import {
  THREE,
  clad,
  lamp,
  hex,
  add,
  box,
  cyl,
  torus,
  plan,
  loft,
  cable,
  bothSides,
  polar,
  part,
} from '../kit.mjs';

/**
 * The Commune's palette, as the Sower's own materials carry it: the four
 * tokens of docs/art-direction.md, and — where the approved model needed a
 * colour the docs do not name — that model's own hex, exactly (kit.mjs `hex`).
 * The vein is the biolight token at half strength, which is the difference
 * between a thread along a rib and a bud.
 */
export const ink = {
  chitinHull: () => clad('chitin_hull', hex('#0B241E'), 0.08, 0.6),
  growthRidge: () => clad('growth_ridge', hex('#14382C'), 0.1, 0.65),
  algaeMembrane: () => clad('algae_membrane', hex('#1FA67A'), 0.05, 0.55),
  sporePod: () => clad('spore_pod', hex('#E8F0A3'), 0.05, 0.5),
  bioVein: () => lamp('bio_vein', hex('#5FAE42'), hex('#061206')),
  bioLight: () => lamp('bio_light', hex('#8FE36B'), hex('#0A1A08')),
};

/** A grown orb: few facets, and squashed by the caller — never round in section. */
const orb = (w = 12, h = 6) => new THREE.SphereGeometry(1, w, h);

/**
 * A growth ring as the approved Sower and Spinner carry every one of theirs:
 * a ridge lathed round the length axis, from `shoulder` up to `crown` and
 * back over ±`halfWidth`, `facets` round — not a torus. A torus of the same
 * crown reads the same from a sprite away and carries twice the triangles
 * and twice the surface; the first port of these hulls drew toruses, and
 * `diff.mjs` against the approved binaries is what caught it (#639). The
 * Vent Tap's `bladderHead` below lathes its rings the same way.
 */
const ridgeRing = ({ crown, shoulder, halfWidth, facets }) =>
  loft(
    [
      [-halfWidth, shoulder],
      [0, crown],
      [halfWidth, shoulder],
    ],
    facets
  );

/**
 * A blade standing on a back — the Spinner's dorsal blade, the Sower's stem
 * keel: a plan rectangle from `from` to `to`, `t` across, raised `height`
 * and centred on y = 0. An extrusion rather than a box because that is what
 * both approved exports are: the same eight vertices, but an extrusion cuts
 * its two caps on one diagonal and its walls from its first corner, where a
 * box cuts opposite faces opposite ways, and `diff.mjs` reads a box in an
 * extrusion's place as ten of twelve triangles re-cut (#639). The corners
 * run from the fore end's starboard side, the start the exports were cut
 * from.
 */
const blade = (from, to, height, t) =>
  plan(
    [
      [to, -t / 2],
      [to, t / 2],
      [from, t / 2],
      [from, -t / 2],
    ],
    height
  );

/** Refuse a mirrored pair: the Commune grows each side its own way. */
function refuseMirror(what, items, key) {
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      if (key(items[i]) === key(items[j]))
        throw new Error(`${what}: ${i} and ${j} are a matched pair — grown things do not mirror`);
}

/**
 * The pod body: a spindle swollen at `waist` (a fraction of the length from
 * the stern, between 0.34 and 0.66), pointed at both ends, and squashed to
 * `squash` of its beam in height. The Spinner's is 55 m on a 16.8 m beam,
 * squashed 0.7. This is the swimming-thing body every Commune hull that is
 * not a leaf starts from.
 *
 * The stations either side of the waist are the approved Spinner's own, and
 * they are symmetric about it: the profile draws in to a point at the same
 * rate forward and aft, and `waist` alone says which end the swelling favours.
 * The first transcription of this builder was fuller amidships and asymmetric
 * by a station, which is the kind of drift a vocabulary with no consumers
 * cannot notice — building the Spinner from it is what noticed.
 *
 * `profile` replaces those stations with the hull's own `[x, r]` list. The
 * fractions above are the Spinner's stations rounded to three places, and
 * rounding moves its ±24 m rings two centimetres and closes its ends to a
 * point where the export leaves them 0.2 m open; a port passes the stations
 * as the binary carries them (#639).
 */
export function podBody(root, mat, opts) {
  const { bow, stern, maxR, waist = 0.5, squash = 0.7, facets = 12, name = 'pod_body' } = opts;
  const { profile } = opts;
  const L = bow - stern;
  const at = (t) => stern + L * t;
  return add(
    root,
    name,
    loft(
      profile ?? [
        [at(0), 0],
        [at(0.064), maxR * 0.19],
        [at(0.209), maxR * 0.536],
        [at(waist - 0.109), maxR * 0.905],
        [at(waist), maxR],
        [at(waist + 0.109), maxR * 0.905],
        [at(0.791), maxR * 0.536],
        [at(0.936), maxR * 0.19],
        [at(1), 0],
      ],
      facets
    ),
    mat,
    [0, 0, 0],
    [0, 0, 0],
    [1, squash, 1]
  );
}

/**
 * Growth rings around a body: a torus at each `[x, r]` station, squashed with
 * the body. `wobble` (radians) tilts each ring a little off square, in a
 * pattern fixed by its index so a rebuild is a rebuild — the Harvester's rings
 * lean up to five degrees, and it is the one thing that makes them read as
 * grown rather than turned.
 *
 * `ring` = `{ rise, facets, halfWidth? }` lathes each ring as a ridge instead
 * (`ridgeRing`): the crown at `r + tube`, the shoulders `rise` below it,
 * `halfWidth` (the tube, unless said) either side. The Spinner's three are
 * 0.7 m ridges on eighteen facets, which is what its approved export holds;
 * without `ring` the ring is a torus, as this builder first drew them.
 */
export function growthRings(root, mat, opts) {
  const { stations, squash = 0.72, tube = 0.9, wobble = 0, name = 'growth_ring', ring } = opts;
  stations.forEach(([x, r], i) =>
    add(
      root,
      `${name}_${i}`,
      ring
        ? ridgeRing({
            crown: r + tube,
            shoulder: r + tube - ring.rise,
            halfWidth: ring.halfWidth ?? tube,
            facets: ring.facets,
          })
        : torus(r, tube, 6, 12),
      mat,
      [x, 0, 0],
      [
        wobble * Math.sin(1 + i * 2.4),
        (ring ? 0 : Math.PI / 2) + wobble * Math.cos(2 + i * 1.7),
        0,
      ],
      [1, squash, 1]
    )
  );
}

/**
 * The bloom bed: a broad flat leaf from a plan outline, `depth` thick and
 * centred on `y`, with a smaller chitin plate under it where the membrane is
 * backed. The Sower's is the one hull in the roster wider at the bow than at
 * the waist, and its whole 54 m beam is this plate — beam as body.
 *
 * `bevel` chamfers the leaf's margin (kit.mjs `plan`), and the Sower's is a
 * metre: the margin is where a leaf reads as grown rather than cut, and it is
 * also the part of this hull a scope sees most of. The backing plate takes no
 * bevel — it is under the membrane and nothing looks at its rim.
 */
export function bloomBed(root, mats, opts) {
  const { membrane, chitin } = mats;
  const { outline, y = 0, depth, bevel = 0, underside } = opts;
  add(root, 'bloom_bed', plan(outline, depth, bevel), membrane, [0, y, 0]);
  if (underside)
    add(root, 'bed_underside', plan(underside.outline, underside.depth), chitin, [
      0,
      underside.y,
      0,
    ]);
}

/**
 * Ribs radiating from a node across a leaf, each with its lit vein riding on
 * top. `midrib` runs straight forward from the node; `port` lists the ribs to
 * one side as `[length, yaw]`, yaw in radians off the midrib, and the other
 * side is mirrored — the Sower's ribs are the one Commune series that is
 * bilateral, because a leaf's venation is. Numbered as the Sower numbers
 * them: the midrib is rib_0, then port, then starboard.
 *
 * `r` is a rib's radius where it springs from the node and `tip` its radius
 * at the far end — the Sower's taper from 1.1 m to 0.5 m, as a leaf's ribs
 * do, and drawn untapered (the default, and the first port's reading) each
 * carries a third again the surface and its centroid three metres further
 * out (#639).
 */
export function ribFan(root, { ridge, vein }, opts) {
  const { node, y, midrib, port, r = 0.95, tip = r, veinFrac = 0.8, lift = 1.15 } = opts;
  const [nx, nz] = node;
  const ribs = [[midrib, 0]];
  for (const [len, yaw] of port) ribs.push([len, -Math.abs(yaw)]);
  for (const [len, yaw] of port) ribs.push([len, Math.abs(yaw)]);
  ribs.forEach(([len, yaw], i) => {
    const cx = nx + (len / 2) * Math.cos(yaw);
    const cz = nz - (len / 2) * Math.sin(yaw);
    add(root, `rib_${i}`, cyl(tip, r, len, 6), ridge, [cx, y, cz], [0, yaw, -Math.PI / 2]);
    add(root, `rib_vein_${i}`, box(len * veinFrac, 0.2, 0.5), vein, [cx, y + lift, cz], [
      0,
      yaw,
      0,
    ]);
  });
}

/**
 * The pressure bladder at a leaf's node, ringed. A squashed orb — `squash`
 * is height over beam, and the Sower's is 0.5, the flattest body in the
 * navy — with growth rings at `rings` = `[dx, r]` offsets along it. `ring`
 * is `growthRings`' option and means the same here: each ring a lathed ridge
 * cresting at `r + 0.8`, its shoulders `rise` below, `halfWidth` 0.8 unless
 * said — the Sower's two are 0.7 m ridges on sixteen facets.
 */
export function bladder(root, { chitin, ridge }, { x, y, r, squash = 0.5, rings = [], ring }) {
  const tube = 0.8;
  add(root, 'bladder', orb(16, 8), chitin, [x, y, 0], [0, 0, 0], [r, r * squash, r]);
  rings.forEach(([dx, rr], i) =>
    add(
      root,
      `bladder_ring_${i}`,
      ring
        ? ridgeRing({
            crown: rr + tube,
            shoulder: rr + tube - ring.rise,
            halfWidth: ring.halfWidth ?? tube,
            facets: ring.facets,
          })
        : torus(rr, tube, 5, 16),
      ridge,
      [x + dx, y, 0],
      ring ? [0, 0, 0] : [0, Math.PI / 2, 0],
      [1, squash, 1]
    )
  );
}

/** The one lit bud at the node: a squashed orb in `bio_light`, facing up. */
export function bud(root, light, { x, y, z = 0, r, squash = 0.54 }) {
  add(root, 'bud', orb(), light, [x, y, z], [0, 0, 0], [r, r * squash, r]);
}

/**
 * Pods grown on a body: a squashed orb with a smaller cap on top, one each at
 * `[x, y, z, r]`. Every pod is its own size and sits where it grew — a
 * matched pair is refused. The Sower's seed pods and the Spinner's mine sacs
 * are the same construction with different proportions and names, so both
 * are exported from one builder below. `facets` is the pod orb's
 * `[widthSegments, heightSegments]`: ten by six on a seed pod, twelve by six
 * on the Spinner's sacs, whose export carries a vertex on both beams of the
 * equator and so a hundred and twenty triangles to a seed pod's hundred.
 */
function grownPods(root, { skin, cap }, opts) {
  const { pods, names, squash, capR, capLift, capSquash, facets = [10, 6] } = opts;
  refuseMirror(names[0], pods, ([, , , r]) => r);
  pods.forEach(([x, y, z, r], i) => {
    add(root, `${names[0]}_${i}`, orb(...facets), skin, [x, y, z], [0, 0, 0], [r, r * squash, r]);
    add(
      root,
      `${names[1]}_${i}`,
      orb(8, 6),
      cap,
      [x, y + capLift * r, z],
      [0, 0, 0],
      [capR * r, capR * r * capSquash, capR * r]
    );
  });
}

/** Seed pods on a bloom bed: pale `spore_pod` skin, a ridge cap. */
export const seedPods = (root, mats, opts) =>
  grownPods(root, mats, {
    names: ['seed_pod', 'pod_cap'],
    squash: 0.7,
    capR: 0.45,
    capLift: 0.6,
    capSquash: 0.67,
    ...opts,
  });

/** Mine sacs at a pod's waist: membrane skin, a ridge bud — fuller than a seed pod. */
export const mineSacs = (root, mats, opts) =>
  grownPods(root, mats, {
    names: ['mine_sac', 'sac_bud'],
    squash: 0.8,
    capR: 0.4,
    capLift: 0.7,
    capSquash: 0.75,
    ...opts,
  });

/**
 * The grown stem aft of a leaf: a squashed loft from a closed point at `from`
 * swelling to `r` at `to`, where it meets the node, ringed at `rings`, and
 * carrying a keel blade on its back if `keel` says so.
 *
 * `profile` replaces that parametric body with the hull's own `[x, r]`
 * stations — the Sower's is open at both ends, 0.3 m at the tail and 4.2 m
 * where it meets the node, on fourteen facets — and `ring` (`{ crown,
 * shoulder, halfWidth, facets }`, absolute metres) lathes each ring as a
 * ridge (`ridgeRing`) in place of the torus the default draws. `from`, `to`
 * and `r` are what the parametric body, the torus rings and the keel's
 * default height are read from; a hull that passes `profile` and `ring`
 * needs none of them.
 */
export function stem(root, { chitin, ridge }, opts) {
  const { from, to, r, y = 0, squash = 0.8, rings = [], keel, facets = 8 } = opts;
  const { profile, ring } = opts;
  const L = to - from;
  const at = (t) => from + L * t;
  add(
    root,
    'stem',
    loft(
      profile ?? [
        [at(0), 0],
        [at(0.03), r * 0.4],
        [at(0.15), r * 0.62],
        [at(0.38), r * 0.82],
        [at(0.62), r * 0.94],
        [at(0.82), r],
        [at(1), r * 0.98],
      ],
      facets
    ),
    chitin,
    [0, y, 0],
    [0, 0, 0],
    [1, squash, 1]
  );
  rings.forEach((x, i) =>
    add(
      root,
      `stem_ring_${i}`,
      ring ? ridgeRing(ring) : torus(r * 0.76, r * 0.19, 5, 12),
      ridge,
      [x, y, 0],
      ring ? [0, 0, 0] : [0, Math.PI / 2, 0],
      [1, squash, 1]
    )
  );
  if (keel) stemKeel(root, ridge, { y: y + r * squash + keel.height / 2 - 0.3, ...keel });
}

/**
 * The keel blade on a stem's back: a `blade` (above) from `from` to `to`,
 * `height` tall and `t` thick, centred at `y`. Its own builder because the
 * approved Sower exports it *after* the caudal pair and `check.mjs` compares
 * in order — the first port drew it in the stem's turn and read as three
 * parts changed (#639). `stem`'s `keel` option still draws it there, for a
 * hull whose export does.
 */
export function stemKeel(root, ridge, { from, to, height, y, t = 0.8 }) {
  add(root, 'stem_keel', blade(from, to, height, t), ridge, [0, y, 0]);
}

/**
 * Membrane fins, port and starboard: thin plates in `algae_membrane` lying
 * flat, mirrored about the keel. Each entry is `[name, corners, opts]`, the
 * corners four `[x, z]` in perimeter order on the **port** side; `opts.t` is
 * the thickness (0.4 m on the Spinner's flukes, 0.5 m on its pectorals and on
 * the Sower's caudals) and `opts.y` the height, defaulting to the call's.
 * Pectorals, flukes, caudals and paddles are all this.
 *
 * Four corners rather than a chord and a taper, because not one approved fin
 * is a symmetric trapezoid: the Sower's caudal trails five metres aft of its
 * root, the Spinner's pectoral rakes forward and its fluke aft. A taper about
 * the chord's centreline can draw a fin that is *pointed* and never one that
 * is *swept*, and a Commune fin that is not swept reads as a wing — the one
 * thing this navy's beam is not.
 *
 * `bySide` exports every port fin before any starboard one — pectoral_p,
 * fluke_p, pectoral_s, fluke_s, which is the order the approved Spinner
 * carries; the default goes pair by pair.
 */
export function fins(root, membrane, { y = 0, pairs, bySide = false }) {
  const fin = ([name, corners, { t = 0.5, y: fy = y } = {}], side, sgn) =>
    add(
      root,
      `${name}_${side}`,
      plan(
        corners.map(([x, z]) => [x, sgn * z]),
        t
      ),
      membrane,
      [0, fy, 0]
    );
  if (bySide) bothSides((side, sgn) => pairs.forEach((pair) => fin(pair, side, sgn)));
  else pairs.forEach((pair) => bothSides((side, sgn) => fin(pair, side, sgn)));
}

/**
 * The grown point at the bow — the Sower's `leaf_tip`, the Spinner's
 * `spinneret`: a faceted cone whose apex is at `tip`.
 */
export function nose(root, mat, { name = 'leaf_tip', tip, y = 0, r, length, facets = 6 }) {
  add(root, name, cyl(0, r, length, facets), mat, [tip - length / 2, y, 0], [0, 0, -Math.PI / 2]);
}

/** A dorsal blade standing on the back, `height` above `y` (`blade` above). */
export function dorsalBlade(root, mat, { name = 'dorsal_blade', from, to, y, height, t = 1 }) {
  add(root, name, blade(from, to, height, t), mat, [0, y + height / 2, 0]);
}

/**
 * Navigation marks: flat `bio_light` strips, one each at `[name, x, y, z]`,
 * `w` by `h` by `d`. The Spinner's bow mark is the default half-metre tall;
 * its dorsal mark and the Sower's stem light are 0.4.
 */
export function navMarks(root, light, { marks, w = 1.2, h = 0.5, d = 0.9 }) {
  marks.forEach(([name, x, y, z = 0]) => add(root, name, box(w, h, d), light, [x, y, z]));
}

/**
 * Edge lights along a leaf's margin, mirrored — the Sower's are the one lit
 * series that is bilateral, for the same reason its ribs are.
 */
export function edgeLights(root, light, { y, spots, w = 1.6, d = 0.8 }) {
  bothSides((side, sgn) =>
    spots.forEach(([x, z], i) =>
      add(root, `edge_light_${side}${i}`, box(w, 0.4, d), light, [x, y, sgn * z])
    )
  );
}

/** A vein: a thread of `bio_vein` along the back, barely there. */
export function vein(root, veinMat, { name = 'dorsal_vein', from, to, y, z = 0, w = 0.34 }) {
  add(root, name, box(to - from, 0.2, w), veinMat, [(from + to) / 2, y, z]);
}

/**
 * Cargo lobes slung under the flanks, `[side, x, y, z, rx, ry, rz, roll]`
 * each — the Harvester's are different sizes and sit at different heights,
 * and a matched pair is refused for it.
 */
export function cargoLobes(root, chitin, { lobes }) {
  refuseMirror('cargo_lobe', lobes, ([, , , , rx, ry, rz]) => `${rx},${ry},${rz}`);
  lobes.forEach(([side, x, y, z, rx, ry, rz, roll = 0]) =>
    add(root, `cargo_lobe_${side}`, orb(10, 6), chitin, [x, y, z], [0, 0, roll], [rx, ry, rz])
  );
}

/**
 * A rank of baleen plates across an intake, athwartships at `x`, each yawed
 * `splay` further than the last and all raked `rake` about the beam.
 */
export function baleen(root, ridge, opts) {
  const { x, y, z = 0, count, pitch, h, d, splay = 0.045, rake = -0.35, t = 0.4 } = opts;
  for (let i = 0; i < count; i++) {
    const k = i - (count - 1) / 2;
    add(root, `baleen_plate_${i}`, box(t, h, d), ridge, [x, y, z + k * pitch], [0, k * splay, rake]);
  }
}

/**
 * Feed tendrils: soft tubes hung from an anchor, sagging by `sag` of their
 * length and trailing aft. `[name, [x, y, z], length, r, sag]` each.
 */
export function tendrils(root, ridge, { tendrils: list }) {
  list.forEach(([name, [x, y, z], length, r, sag = 0.5]) => {
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, y, z),
      new THREE.Vector3(x - length * 0.35, y - length * sag, z),
      new THREE.Vector3(x - length * 0.8, y - length * 0.55, z)
    );
    add(root, `feed_tendril_${name}`, new THREE.TubeGeometry(curve, 6, r, 5, false), ridge);
  });
}

/* --------------------------------------------------------------------------
 * Structures. A settlement is the same architecture grown four ways, so the
 * base / mount / head / barrel family lives here beside the hull vocabulary
 * rather than in any one structure script (#553, off #540 Phase 3).
 *
 * The Commune's structures are grown, not built: a mound holds the ground
 * with roots rather than bolts, the head is a pod under a cowl, and the gun
 * is a limb that thickens at the joint. Nothing here is a matched pair, for
 * the same reason nothing on a Commune hull is.
 * ------------------------------------------------------------------------ */

/**
 * The structure palette: the Commune's ink, grown dark.
 *
 * A Sentinel Turret is "nearly black — an ambush predator, navigation marks
 * only until it fires" (docs/asset-prompts-3d.md, the Sentinel Turret block).
 * The structures carry their own names rather than a shared dimming factor
 * applied to `ink`, because the dimming is not uniform across the four
 * navies — see `structureInk` in factions/hadron.mjs for the argument. Values
 * are the approved turret's own. `biolightGreen` takes the emissive strength
 * a file carries: the approved turret's lamp burns at 0.953
 * (`KHR_materials_emissive_strength`), which the bake multiplies in
 * (hull-intake's page.html) and the conn view shows; the default is the full
 * strength every other lamp here has.
 */
export const structureInk = {
  deepChlorophyll: () => clad('deep_chlorophyll', hex('#0B241E'), 0.1, 0.65),
  grownSteel: () => clad('grown_steel', hex('#22302C'), 0.35, 0.45),
  algaeHull: () => clad('algae_hull', hex('#14664C'), 0.08, 0.62),
  biolightGreen: (intensity = 1) =>
    lamp('biolight_green', hex('#8FE36B'), hex('#123018'), 0.35, intensity),
};

// Two kit primitives the turret's port reaches for and nothing above did —
// imported beside the builders that use them: the head of this file is the
// hull vocabulary's and was being edited in parallel when these were written
// (#639). Folding this line into the import above is a one-line tidy.
import { capsule, group } from '../kit.mjs';

/**
 * A grown shell: an orb of `r` and `facets` [round, down] that may stop
 * short of a full turn (`round`, the fraction of one it goes round) or short
 * of the bottom pole (`down`, the fraction of a half-turn it comes down from
 * the crown). The approved turret's mound is an orb cut off 0.42 of the way
 * down; its cowl a half-shell open 0.525 of a turn. `orb` above is the closed
 * case, and a shell with both at 1 is one.
 */
const shell = (r, [w, h], { round = 1, down = 1 } = {}) =>
  new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2 * round, 0, Math.PI * down);

/**
 * The exchanger on the end of a Vent Tap's draw arm, on `bearing` (#608),
 * grown as a bladder: a squashed orb ringed three times, the pale bud on its
 * crown, the one vein along its back, and three roots leaning out into the
 * ground beyond. The rings are lofts round the arm's own axis, squashed with
 * the bladder — the Sower's `bladder` rings are toruses round a hull's
 * length, and a ring grown round a pipe is a different shape. Distances are
 * metres out along the bearing, as the kit's `ventDrawArm` takes them;
 * `roots.across` are metres to the right of it, looking out.
 */
export function bladderHead(root, { membrane, ridge, spore, vein }, opts) {
  const { bearing: a, at, bladder: body, rings, bud: crown, vein: thread, roots } = opts;
  add(root, 'bladder', orb(12, 6), membrane, polar(a, at, body.y), [0, -a, 0], body.r);
  rings.stations.forEach(([r, shoulder], i) =>
    add(
      root,
      `bladder_ring_${i}`,
      loft(
        [
          [-rings.halfWidth, shoulder],
          [0, r],
          [rings.halfWidth, shoulder],
        ],
        12
      ),
      ridge,
      polar(a, rings.from + rings.pitch * i, body.y),
      [0, -a, 0],
      [1, rings.squash, 1]
    )
  );
  add(root, 'bud', orb(8, 6), spore, polar(a, crown.at, crown.y), [0, 0, 0], crown.r);
  add(root, 'bladder_vein', box(...thread.size), vein, polar(a, at, thread.y), [0, -a, 0]);
  // Each root is laid along the arm as the draw pipe is, then raised
  // `roots.raise` radians toward vertical: the approved file's lean is
  // π/2 − 0.9 to the bit.
  roots.across.forEach((d, i) => {
    const [x, y, z] = polar(a, roots.at, roots.y);
    add(
      root,
      `root_${i}`,
      cyl(roots.r[0], roots.r[1], roots.length, 6),
      ridge,
      [x + d * Math.sin(a), y, z - d * Math.cos(a)],
      [0, -a, roots.raise - Math.PI / 2]
    );
  });
}

/**
 * The mound: a grown dome, the collar the head turns in, and the growth ring
 * where the dome meets the ground.
 *
 * As the approved turret draws it — `mound`, `collar` and `ring`, each with
 * its own numbers and its `drawn` placement, built in the file's order
 * (mound, collar, ring): the mound a `shell` of radius `r` cut `down` of the
 * way to the pole, the collar and the ring toruses of `R` and `tube` with
 * `facets` [radial, tubular]. The first port's form — `x, z, y, r, squash,
 * ringAt, collarAt`: a closed orb and two toruses in the module's default
 * facets, ring before collar — still builds what it built.
 */
export function grownMound(root, { body, ring, collar }, opts) {
  if (opts.mound) {
    const { mound, collar: c, ring: g } = opts;
    part(root, 'base_mound', shell(mound.r, mound.facets, mound), body, mound);
    part(root, 'base_collar', torus(c.R, c.tube, ...c.facets), collar, c);
    part(root, 'mound_ring', torus(g.R, g.tube, ...g.facets), ring, g);
    return;
  }
  const { x = 0, z = 0, y, r, squash, ringAt, collarAt } = opts;
  add(root, 'base_mound', orb(12, 6), body, [x, y, z], [0, 0, 0], [r[0], r[1], r[2]]);
  add(root, 'mound_ring', torus(ringAt.r, ringAt.t, 4, 20), ring, [x, ringAt.y, z], [
    Math.PI / 2,
    0,
    0,
  ]);
  add(root, 'base_collar', torus(collarAt.r, collarAt.t, 5, 18), collar, [x, collarAt.y, z], [
    Math.PI / 2,
    0,
    0,
  ]);
  return { squash };
}

/**
 * Root grips: swollen holdfasts on the seabed round the mound, no two alike —
 * a matched pair is refused, because the Commune grows each root its own size
 * and a turret that came out rotationally regular would read as a machine.
 *
 * As the approved turret draws them: a capsule each (kit.mjs `capsule`,
 * `facets` [cap, radial]), `r` thick and `length` between its caps, placed by
 * its own node — laid over 0.13 rad short of flat and yawed each its own way,
 * which puts every root *across* the mound's radius rather than out along it.
 * That is where the file has them, and a port reproduces the file. Skins
 * alternate from the first grip. The first port's `[degrees, radius, [long,
 * height, wide]]` orbs, radial from `x, z` with `long` running outward, still
 * build what they built.
 */
export function rootGrips(root, skins, opts) {
  const { grips } = opts;
  if (!Array.isArray(grips[0])) {
    const { facets = [3, 6] } = opts;
    refuseMirror('root_grip', grips, ({ r, length }) => `${r},${length}`);
    grips.forEach((g, i) =>
      part(root, `root_grip_${i}`, capsule(g.r, g.length, ...facets), skins[i % skins.length], g)
    );
    return;
  }
  const { x = 0, z = 0, y } = opts;
  refuseMirror('root_grip', grips, ([, , size]) => size.join());
  grips.forEach(([deg, rad, size], i) => {
    const a = (deg * Math.PI) / 180;
    add(
      root,
      `root_grip_${i}`,
      orb(10, 6),
      skins[i % skins.length],
      [x + rad * Math.cos(a), y, z + rad * Math.sin(a)],
      [0, -a, 0],
      [size[0] / 2, size[1] / 2, size[2] / 2]
    );
  });
}

/**
 * The head: a pod that trains, a cowl grown over it, and the quills along the
 * cowl's crown. The cowl sits off-centre because a grown thing is not
 * centred on what it covers.
 *
 * As the approved turret draws it, the head is a frame of its own — the
 * file's `turret_head` node, trained 0.3 rad off the mound's axis — and every
 * part carries its numbers in that frame: `pod` an orb of `r` and `facets`,
 * `cowl` a half-`shell` open `round` of a turn, `quills` cones `r` at the
 * foot and `length` tall, each by its own node. The placement at the top of
 * `opts` is the frame's (kit.mjs `group`), and the frame is returned so the
 * gun can be grown in it, as the file hangs `barrel_group` off `turret_head`.
 * The first port's form — `x, y, z, podR, cowlR, cowlAt`, quills as `[x, z,
 * length, rake]` stood on the cowl — still builds what it built.
 */
export function grownHead(root, { pod, cowl }, opts) {
  if (opts.pod) {
    const head = group(root, 'turret_head', opts);
    const { pod: p, cowl: c, quills } = opts;
    part(head, 'head_pod', shell(p.r, p.facets), pod, p);
    part(head, 'head_cowl', shell(c.r, c.facets, c), cowl, c);
    quills.forEach((q, i) =>
      part(head, `cowl_quill_${i}`, cyl(0, q.r, q.length, q.facets ?? 4), cowl, q)
    );
    return head;
  }
  const { x, y, z = 0, podR, cowlR, cowlAt, quills } = opts;
  add(root, 'head_pod', orb(10, 6), pod, [x, y, z], [0, 0, 0], podR);
  add(root, 'head_cowl', orb(10, 6), cowl, cowlAt, [0, 0, 0], cowlR);
  quills.forEach(([qx, qz, length, rake], i) =>
    add(
      root,
      `cowl_quill_${i}`,
      cyl(0, length * 0.12, length, 4),
      cowl,
      [qx, cowlAt[1] + cowlR[1] * 0.6 + length / 2, qz],
      [rake, 0, 0]
    )
  );
}

/**
 * The gun as a grown limb: root, mid and tip thickening at each joint along
 * the run from `from` to `to`, ribs banding the root, and the iris and its
 * one lit pip at the muzzle.
 *
 * A limb rather than a tube: the Commune's weapons come out of the body the
 * way a claw does, so the joints are where it swells rather than where it
 * steps.
 *
 * As the approved turret draws it, the limb is a frame off the head — the
 * file's `barrel_group`, placed by the top of `opts` — and each part is its
 * own primitive at its own station up the frame's Y: `root`, `mid` and `tip`
 * frusta of `radii` [muzzle end, breech end], `length` and `facets`; `iris`
 * and each of `ribs` a torus of `R`, `tube` and `facets`; `pip` an orb. The
 * ribs are clad in `rib`, which the file has in the cowl's ink and not the
 * steel's. The first port's `{ from, to, r, ribs }` still builds what it
 * built.
 */
export function grownBarrel(root, mats, opts) {
  const { rootMat, mid, tip, iris, pip, rib: ribMat = rootMat } = mats;
  if (opts.from === undefined) {
    const g = group(root, 'barrel_group', opts);
    const seg = (name, s, mat) =>
      part(g, name, cyl(s.radii[0], s.radii[1], s.length, s.facets), mat, s);
    seg('barrel_root', opts.root, rootMat);
    seg('barrel_mid', opts.mid, mid);
    seg('barrel_tip', opts.tip, tip);
    const { iris: ir, pip: pp, ribs } = opts;
    part(g, 'muzzle_iris', torus(ir.R, ir.tube, ...ir.facets), iris, ir);
    part(g, 'muzzle_pip', new THREE.SphereGeometry(pp.r, ...pp.facets), pip, pp);
    ribs.forEach((rb, i) =>
      part(g, `recoil_rib_${i}`, torus(rb.R, rb.tube, ...rb.facets), ribMat, rb)
    );
    return g;
  }
  const { from, to, r, ribs = 3 } = opts;
  const A = new THREE.Vector3(...from);
  const B = new THREE.Vector3(...to);
  const d = B.clone().sub(A);
  const len = d.length();
  const at = (t) => A.clone().addScaledVector(d, t);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(1, 0, 0),
    d.clone().normalize()
  );
  const along = (name, geo, mat, t) => {
    const mesh = add(root, name, geo, mat);
    mesh.position.copy(at(t));
    mesh.quaternion.copy(q);
    return mesh;
  };
  const limb = (name, t0, t1, r0, r1, mat) => {
    const geo = cyl(r1, r0, len * (t1 - t0), 8);
    geo.rotateZ(-Math.PI / 2);
    return along(name, geo, mat, (t0 + t1) / 2);
  };
  limb('barrel_root', 0, 0.42, r, r * 0.86, rootMat);
  limb('barrel_mid', 0.4, 0.74, r * 0.86, r * 0.7, mid);
  limb('barrel_tip', 0.72, 0.94, r * 0.7, r * 0.55, tip);
  const irisGeo = torus(r * 0.55, r * 0.16, 4, 12);
  irisGeo.rotateY(Math.PI / 2);
  along('muzzle_iris', irisGeo, iris, 0.97);
  along('muzzle_pip', new THREE.SphereGeometry(r * 0.22, 8, 6), pip, 1);
  for (let i = 0; i < ribs; i++) {
    const t = 0.1 + (i * 0.26) / Math.max(ribs - 1, 1);
    const rib = torus(r * 1.02, r * 0.2, 4, 12);
    rib.rotateY(Math.PI / 2);
    along(`recoil_rib_${i}`, rib, rootMat, t);
  }
}

/**
 * The magazine: a grown pod on the flank, the feed running up from it, and
 * the flange where it enters the collar. One pod, never a pair — the
 * Commune's turret feeds from the side it grew on.
 *
 * As the approved turret draws it, in the file's order — `pipe`, `pod`,
 * `flange`: the feed a straight frustum of `radii`, `length` and `facets`,
 * leaned by its node; the pod a capsule (kit.mjs `capsule`, `facets` [cap,
 * radial]); the flange a torus. The first port's `{ pod, pipe, flangeAt }` —
 * an orb, a sagging cable and a torus, pod first — still builds what it
 * built.
 */
export function magazine(root, { pipe: pipeMat, pod: podMat, flange }, opts) {
  if (opts.flange) {
    const { pipe: p, pod: d, flange: f } = opts;
    part(root, 'feed_pipe', cyl(p.radii[0], p.radii[1], p.length, p.facets), pipeMat, p);
    part(root, 'ammo_pod', capsule(d.r, d.length, ...d.facets), podMat, d);
    part(root, 'feed_flange', torus(f.R, f.tube, ...f.facets), flange, f);
    return;
  }
  const { pod, pipe, flangeAt } = opts;
  add(root, 'ammo_pod', orb(10, 6), podMat, pod.at, [0, 0, pod.roll ?? 0], pod.r);
  cable(root, 'feed_pipe', pipe.from, pipe.to, pipeMat, { r: pipe.r, sag: pipe.sag ?? 0, facets: 6 });
  const ring = torus(flangeAt.r, flangeAt.t, 4, 10);
  ring.rotateX(Math.PI / 2);
  add(root, 'feed_flange', ring, flange, flangeAt.at);
}

/* --------------------------------------------------------------------------
 * Shared kinds. The Light Scout is the first of the six kinds every navy
 * models (#588, off #540 Phase 3), and the Commune's is a grown pod on a
 * 60 m brief: a displaced orb for a hull, four rings that lean as they grew,
 * a feeler curling forward to its light, five leaf membranes and the five
 * lamps that are its whole resting light. The builders take the approved
 * export's own numbers (kit.mjs `drawn`) and are named for what the export
 * named them; hulls/light-scout-pelagia.mjs is their first consumer and
 * states the scale decision the other shared kinds follow.
 * ------------------------------------------------------------------------ */

/**
 * The Light Scout's palette: an earlier authoring pass than the Sower's,
 * the same four names with their own finish, and a lamp that is the
 * biolight token through and through, burning at 1.6. Values are the
 * approved export's own. `ink` above is the Sower's, and the two are not
 * interchangeable: a part is compared by its material's *name*, but the
 * conn view renders its finish.
 */
export const scoutInk = {
  chitinHull: () => clad('chitin_hull', hex('#0B241E'), 0.05, 0.55),
  growthRidge: () => clad('growth_ridge', hex('#14332A'), 0.03, 0.7),
  algaeMembrane: () => {
    // Two-sided, as the export has it: a membrane is a leaf, and a leaf is
    // seen from both faces.
    const m = clad('algae_membrane', hex('#1FA67A'), 0.04, 0.5);
    m.side = THREE.DoubleSide;
    return m;
  },
  bioLight: () => lamp('bio_light', hex('#8FE36B'), hex('#8FE36B'), 0.35, 1.6),
};

/**
 * A grown body: a low-facet orb whose every vertex the approved export
 * pushed by hand — the one part of the four scouts that is a table rather
 * than a construction. `buffer` is the export's own local buffer, its unique
 * points in row order: the top pole, each ring from the top down, the bottom
 * pole. The orb's squash and station come from its node like any other
 * part's. The displacement is partly formulaic — every station is scaled by
 * 1 − 0.06·cos ψ about the length axis, and the waist by
 * 1.093 + 0.07·cos(ψ + 0.7) + 0.06·sin 3ψ — but not wholly, and a port
 * transcribes rather than guesses: the table is the export's, to five
 * decimals, and a formula that nearly fit it would be a different hull.
 */
export function grownBody(root, mat, opts) {
  const { name = 'hull', facets = [16, 10], buffer, ...placement } = opts;
  const [w, h] = facets;
  if (buffer.length !== (h - 1) * w + 2)
    throw new Error(
      `${name}: ${buffer.length} points for a ${w}×${h} orb, want ${(h - 1) * w + 2}`
    );
  const geo = new THREE.SphereGeometry(1, w, h);
  const pos = geo.attributes.position;
  for (let iy = 0; iy <= h; iy++)
    for (let ix = 0; ix <= w; ix++) {
      const p =
        iy === 0
          ? buffer[0]
          : iy === h
            ? buffer[buffer.length - 1]
            : buffer[1 + (iy - 1) * w + (ix % w)];
      pos.setXYZ(iy * (w + 1) + ix, p[0], p[1], p[2]);
    }
  geo.computeVertexNormals();
  return part(root, name, geo, mat, placement);
}

/**
 * A lobe grown on the body: an orb squashed to its node's three radii and
 * rolled. The scout's ballast lobe hangs under the belly, rolled 0.22 to one
 * side — there is no second.
 */
export function lobe(root, mat, { name = 'ballast_lobe', facets = [9, 6], ...placement }) {
  return part(root, name, orb(...facets), mat, placement);
}

/**
 * Growth rings as the scout grows them: a unit torus each, `tube` thick,
 * squashed to the body's own profile and leaned a few degrees off square by
 * its node — no two alike, which is the whole difference between grown and
 * turned. One-based, as the export numbers them. `growthRings` above is the
 * Spinner's rule, a wobble from the index; this takes each ring's own.
 */
export function grownRings(
  root,
  mat,
  { name = 'growth_ring', first = 1, facets = [5, 20], rings }
) {
  rings.forEach(({ tube, ...placement }, i) =>
    part(root, `${name}_${first + i}`, torus(1, tube, ...facets), mat, placement)
  );
}

/**
 * A feeler: a thin tube along a Catmull-Rom curve `through` points in the
 * kit's frame, out to the light it carries. The tube is laid down in the
 * frame the export laid it in and turned with it (kit.mjs `yawed`), because
 * a TubeGeometry's frames follow which way its tangent leans and an X-long
 * rebuild would twist its facets.
 */
export function feeler(root, mat, opts) {
  const { name = 'sensor_feeler', through, r = 0.03, steps = 16, facets = 5, ...placement } = opts;
  const asDrawn = through.map(([x, y, z]) => new THREE.Vector3(-z, y, x));
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(asDrawn), steps, r, facets, false);
  return part(root, name, tube, mat, placement);
}

/**
 * A leaf membrane's outline: three quadratic curves from the root, over the
 * crown to the tip and back under it, at fixed fractions of a span `L` and
 * a depth `h` — the one leaf every membrane on the scout is cut from, at
 * five sizes.
 */
export function leafOutline(L, h) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.35 * L, h, 0.95 * L, 0.85 * h);
  s.quadraticCurveTo(1.15 * L, 0.45 * h, 0.75 * L, 0.1 * h);
  s.quadraticCurveTo(0.4 * L, -0.05 * h, 0, 0);
  return s;
}

/**
 * Membranes: leaves `thickness` thick, each `[span, depth]` its own size and
 * hung by its own node — the dorsal blade stands, the pectorals rake forward
 * and down, the tail flukes stand above and below the peduncle, the lower
 * one the upper's mirror in its node's scale. None is a matched pair. `fins`
 * above is the Spinner's flat mirrored plan; this is the scout's.
 */
export function membranes(root, mat, { fins, thickness = 0.028, segments = 8 }) {
  fins.forEach(({ name, span, depth, ...placement }) =>
    part(
      root,
      name,
      new THREE.ExtrudeGeometry(leafOutline(span, depth), {
        depth: thickness,
        bevelEnabled: false,
        curveSegments: segments,
      }),
      mat,
      placement
    )
  );
}

/**
 * A stalk: a tapered faceted spar, `radii` [top, bottom] as drawn and laid
 * along the keel by its node — the tail peduncle, seven-sided and leaned
 * 0.08 off the keel line.
 */
export function stalk(root, mat, opts) {
  const { name = 'tail_peduncle', radii, length, facets = 7, ...placement } = opts;
  return part(root, name, cyl(radii[0], radii[1], length, facets), mat, placement);
}

/**
 * Light buds: the scout's lamps, orbs in `bio_light` at `[name, r,
 * placement]` — a feeler tip, two flank marks, a throat and a tail. Five,
 * and that is the resting light of the quietest hull in the roster.
 */
export function lightBuds(root, light, { buds, facets = [8, 6] }) {
  buds.forEach(([name, r, placement]) =>
    part(root, name, new THREE.SphereGeometry(r, ...facets), light, placement)
  );
}

export { THREE };
