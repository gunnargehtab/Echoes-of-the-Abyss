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
  bothSides,
  polar,
  part,
  drawn,
  capsule,
  group,
  pointLight,
} from '../kit.mjs';

/**
 * The Commune's palette, as the Sower's own materials carry it: the four
 * tokens of docs/art-direction.md, and — where the approved model needed a
 * colour the docs do not name — that model's own hex, exactly (kit.mjs `hex`).
 * The vein's `#5FAE42` is the Sower's own — a hue of its own, not the
 * biolight token dimmed (its linear channels are 0.42, 0.55 and 0.37 of the
 * bud's) — which is the difference between a thread along a rib and a bud.
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
 *
 * Two option shapes in this module end here — `ring`, a rise over the station
 * radius the builder already knows, and `band`, the four radii in metres for
 * a run of rings all one size — and handing it the other one lathed a profile
 * of `NaN`: three writes that out as a part with no vertices and no bounds,
 * and every gate downstream counts it as a part that agrees (#646). So it
 * refuses rather than lathing it.
 */
const ridgeRing = ({ crown, shoulder, halfWidth, facets }) => {
  for (const [k, v] of Object.entries({ crown, shoulder, halfWidth, facets }))
    if (!Number.isFinite(v))
      throw new Error(`ridgeRing: ${k} is ${v} — a ridge is crown, shoulder, halfWidth, facets`);
  return loft(
    [
      [-halfWidth, shoulder],
      [0, crown],
      [halfWidth, shoulder],
    ],
    facets
  );
};

/**
 * A blade standing on a back — the Spinner's dorsal blade, the Sower's stem
 * keel: a plan rectangle from `from` to `to`, `t` across, raised `height`
 * and centred on y = 0. An extrusion rather than a box because that is what
 * both approved exports are: the same eight vertices, but an extrusion cuts
 * its two caps on one diagonal and its walls from its first corner, where a
 * box cuts opposite faces opposite ways, and `diff.mjs` reads a box in an
 * extrusion's place as ten of twelve triangles re-cut (#639). The corners
 * run from the fore end's port side, the start the exports were cut from.
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
 * `ring` = `{ rise, facets, halfWidth? }` says how each one is lathed
 * (`ridgeRing`): the crown at `r + tube`, the shoulders `rise` below it,
 * `halfWidth` (the tube, unless said) either side. The Spinner's three are
 * 0.7 m ridges on eighteen facets, which is what its approved export holds.
 * It is not optional, and the torus this builder first drew is gone with it:
 * every ring on every approved Commune hull is a ridge, so a torus here was
 * a default no model has and only the caller's `ring` kept out of the file.
 */
export function growthRings(root, mat, opts) {
  const { stations, squash = 0.72, tube = 0.9, wobble = 0, name = 'growth_ring', ring } = opts;
  stations.forEach(([x, r], i) =>
    add(
      root,
      `${name}_${i}`,
      ridgeRing({
        crown: r + tube,
        shoulder: r + tube - ring.rise,
        halfWidth: ring.halfWidth ?? tube,
        facets: ring.facets,
      }),
      mat,
      [x, 0, 0],
      [wobble * Math.sin(1 + i * 2.4), wobble * Math.cos(2 + i * 1.7), 0],
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
 * top. `midrib` runs straight forward from the node; `flank` lists the ribs
 * down one flank as `[length, yaw]`, yaw in radians off the midrib, and the
 * other flank is mirrored — the Sower's ribs are the one Commune series that
 * is bilateral, because a leaf's venation is. Numbered as the Sower numbers
 * them: the midrib is rib_0, then the starboard ribs, then the port.
 *
 * `r` is a rib's radius where it springs from the node and `tip` its radius
 * at the far end — the approved Sower's taper from 1.1 m to 0.5 m, as a
 * leaf's ribs do, and the defaults here. Drawn untapered, as the first port
 * read them, each rib carries a third again the surface and its centroid
 * three metres further out (#639).
 */
export function ribFan(root, { ridge, vein }, opts) {
  const { node, y, midrib, flank, r = 1.1, tip = 0.5, veinFrac = 0.8, lift = 1.15 } = opts;
  const [nx, nz] = node;
  const ribs = [[midrib, 0]];
  for (const [len, yaw] of flank) ribs.push([len, -Math.abs(yaw)]);
  for (const [len, yaw] of flank) ribs.push([len, Math.abs(yaw)]);
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
 * is `growthRings`' option and means the same here, torus and all gone the
 * same way: each ring a lathed ridge cresting at `r + 0.8`, its shoulders
 * `rise` below, `halfWidth` 0.8 unless said — the Sower's two are 0.7 m
 * ridges on sixteen facets.
 */
export function bladder(root, { chitin, ridge }, { x, y, r, squash = 0.5, rings = [], ring }) {
  const tube = 0.8;
  add(root, 'bladder', orb(16, 8), chitin, [x, y, 0], [0, 0, 0], [r, r * squash, r]);
  rings.forEach(([dx, rr], i) =>
    add(
      root,
      `bladder_ring_${i}`,
      ridgeRing({
        crown: rr + tube,
        shoulder: rr + tube - ring.rise,
        halfWidth: ring.halfWidth ?? tube,
        facets: ring.facets,
      }),
      ridge,
      [x + dx, y, 0],
      [0, 0, 0],
      [1, squash, 1]
    )
  );
}

/**
 * The one lit bud at the node: a squashed orb in `bio_light`, facing up.
 * `squash` is height over beam, and the default is the approved Sower's bud
 * — 1.4 m tall on 2.6 m across. `name` and `facets` are the Chorister's
 * `bladder_bud` — the bladder showing through the middle segment as a paler
 * dome, a ten-by-six orb in spore pale rather than a lamp
 * (hulls/chorister-pelagia.mjs), and squashed its own way.
 */
export function bud(root, light, opts) {
  const { name = 'bud', facets = [12, 6], x, y, z = 0, r, squash = 1.4 / 2.6 } = opts;
  add(root, name, orb(...facets), light, [x, y, z], [0, 0, 0], [r, r * squash, r]);
}

/**
 * Pods grown on a body: a squashed orb with a smaller cap on top, one each at
 * `[x, y, z, r]`. Every pod is its own size and sits where it grew — a
 * matched pair is refused. The Sower's seed pods and the Spinner's mine sacs
 * are the same construction with different proportions and names, so both
 * are exported from one builder below. Everything that differs between them
 * is a default on the export rather than on this shared body, `facets`
 * included — the pod orb's `[widthSegments, heightSegments]`, ten by six on
 * a seed pod and twelve by six on the Spinner's sacs, whose export carries a
 * vertex on both beams of the equator and so a hundred and twenty triangles
 * to a seed pod's hundred.
 */
function grownPods(root, { skin, cap }, opts) {
  const { pods, names, squash, capR, capLift, capSquash, facets } = opts;
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

/**
 * Seed pods on a bloom bed: pale `spore_pod` skin, a ridge cap. The numbers
 * are the approved Sower's — a cap 0.45 of its pod across and two thirds of
 * that tall, on a ten-by-six orb.
 */
export const seedPods = (root, mats, opts) =>
  grownPods(root, mats, {
    names: ['seed_pod', 'pod_cap'],
    squash: 0.7,
    capR: 0.45,
    capLift: 0.6,
    capSquash: 2 / 3,
    facets: [10, 6],
    ...opts,
  });

/**
 * Mine sacs at a pod's waist: membrane skin, a ridge bud — fuller than a seed
 * pod. The numbers are the approved Spinner's, twelve-facet orbs included.
 */
export const mineSacs = (root, mats, opts) =>
  grownPods(root, mats, {
    names: ['mine_sac', 'sac_bud'],
    squash: 0.8,
    capR: 0.4,
    capLift: 0.7,
    capSquash: 0.75,
    facets: [12, 6],
    ...opts,
  });

/**
 * The grown stem aft of a leaf: a squashed lathe of the hull's own `[x, r]`
 * stations, ringed at `rings`.
 *
 * `profile` is those stations and there is no parametric body behind it. The
 * approved Sower's stem is open at both ends — 0.3 m at the tail, 4.2 m where
 * it meets the node — on fourteen facets, which is the default cut; the body
 * the first port drew instead was closed to a point at both ends on eight,
 * and the numbers it was swelled from (`from`, `to`, `r`) went with it.
 *
 * `band` is the ring, lathed as a ridge (`ridgeRing`) in place of the torus
 * that stood there: `{ crown, shoulder, halfWidth, facets }` in **absolute
 * metres**, because a stem's rings are all one size and it has no per-station
 * radius to hang a fraction on. That is the other option shape in this module
 * and the reason it is not called `ring`: `growthRings` and `bladder` take a
 * `ring` that is a rise over the station radius they already know, and the
 * two were one name until #646.
 */
export function stem(root, { chitin, ridge }, opts) {
  const { profile, facets = 14, y = 0, squash = 0.8, rings = [], band } = opts;
  add(root, 'stem', loft(profile, facets), chitin, [0, y, 0], [0, 0, 0], [1, squash, 1]);
  rings.forEach((x, i) =>
    add(root, `stem_ring_${i}`, ridgeRing(band), ridge, [x, y, 0], [0, 0, 0], [1, squash, 1])
  );
}

/**
 * The keel blade on a stem's back: a `blade` (above) from `from` to `to`,
 * `height` tall and `t` thick, centred at `y`. Its own builder because the
 * approved Sower exports it *after* the caudal pair and `check.mjs` compares
 * in order — the first port drew it in the stem's turn and read as three
 * parts changed (#639).
 */
export function stemKeel(root, ridge, { from, to, height, y, t = 0.8 }) {
  add(root, 'stem_keel', blade(from, to, height, t), ridge, [0, y, 0]);
}

/**
 * Membrane fins, port and starboard: thin plates in `algae_membrane` lying
 * flat, mirrored about the keel. Each entry is `[name, corners, opts]`, the
 * corners four `[x, z]` in perimeter order on the **starboard** side; `opts.t` is
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
 * `bySide` exports every starboard fin before any port one — pectoral_s,
 * fluke_s, pectoral_p, fluke_p, which is the order the approved Spinner
 * carries (+z first; the names turned round with #642); the default goes
 * pair by pair.
 *
 * `stand` is the Chorister's: the early pass extruded its fins and never
 * re-centred them, so each plate stands *on* its node's height, from y = 0
 * up to `t`, rather than straddling it as `plan` lays a slab. The approved
 * export carries them so (hulls/chorister-pelagia.mjs), and a port
 * reproduces the file.
 */
export function fins(root, membrane, { y = 0, pairs, bySide = false, stand = false }) {
  const fin = ([name, corners, { t = 0.5, y: fy = y } = {}], side, sgn) => {
    const geo = plan(
      corners.map(([x, z]) => [x, sgn * z]),
      t
    );
    if (stand) geo.translate(0, t / 2, 0);
    return add(root, `${name}_${side}`, geo, membrane, [0, fy, 0]);
  };
  if (bySide) bothSides((side, sgn) => pairs.forEach((pair) => fin(pair, side, sgn)));
  else pairs.forEach((pair) => bothSides((side, sgn) => fin(pair, side, sgn)));
}

/**
 * The grown point at the bow — the Sower's `leaf_tip`, the Spinner's
 * `spinneret`: a faceted cone whose apex is at `tip`. `z` is off the keel
 * line: the Chorister's `spine_gun` is the same cone, five-sided, two units
 * to port of it (hulls/chorister-pelagia.mjs), and its `stem_tail` is one
 * with the apex *forward*, buried in the last lobe, so that the stern is a
 * transom — the approved export's own, kept.
 */
export function nose(root, mat, { name = 'leaf_tip', tip, y = 0, z = 0, r, length, facets = 6 }) {
  add(root, name, cyl(0, r, length, facets), mat, [tip - length / 2, y, z], [0, 0, -Math.PI / 2]);
}

/**
 * A dorsal blade standing on the back, `height` above `y` (`blade` above).
 * `stand` is `fins`' — the Chorister's `dorsal_leaf` is the same plate with
 * its foot at its node rather than its middle.
 */
export function dorsalBlade(root, mat, opts) {
  const { name = 'dorsal_blade', from, to, y, height, t = 1, stand = false } = opts;
  const geo = blade(from, to, height, t);
  if (stand) geo.translate(0, height / 2, 0);
  add(root, name, geo, mat, [0, stand ? y : y + height / 2, 0]);
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
 *
 * As the approved Harvester draws them (hulls/harvester-pelagia.mjs): an
 * entry is `{ side, ...placement }` through kit.mjs `drawn`, the orb ten by
 * seven rather than the first reading's ten by six — `facets` — and the
 * roll and the three radii in the node, as the file carries them. The array
 * form above still builds what it built.
 */
export function cargoLobes(root, chitin, { lobes, facets = [10, 6] }) {
  if (!Array.isArray(lobes[0])) {
    refuseMirror('cargo_lobe', lobes, (l) => l.scale.join());
    lobes.forEach(({ side, ...placement }) =>
      part(root, `cargo_lobe_${side}`, orb(...facets), chitin, placement)
    );
    return;
  }
  refuseMirror('cargo_lobe', lobes, ([, , , , rx, ry, rz]) => `${rx},${ry},${rz}`);
  lobes.forEach(([side, x, y, z, rx, ry, rz, roll = 0]) =>
    add(root, `cargo_lobe_${side}`, orb(10, 6), chitin, [x, y, z], [0, 0, roll], [rx, ry, rz])
  );
}

/**
 * A rank of baleen plates across an intake, athwartships at `x`, each yawed
 * `splay` further than the last and all raked `rake` about the beam.
 *
 * `rank` is the rank as the approved Harvester draws it, in the export's
 * own frame through kit.mjs `drawn` (hulls/harvester-pelagia.mjs): `count`
 * plates `pitch` apart across the beam about `at`, each `t` thick and `d`
 * deep, `h` tall at the middle and `taper` shorter for every plate out from
 * it, all raked `rake` about the beam and each *rolled* `splay` further than
 * the last about the keel — the file's splay is a roll, where the first
 * reading above yawed the plates — and numbered from `first`. The form
 * above still builds what it built.
 */
export function baleen(root, ridge, opts) {
  if (opts.rank) {
    const { count, pitch, at, t, h, taper, d, rake, splay, first = 1 } = opts.rank;
    const [x, y, z] = at;
    for (let i = 0; i < count; i++) {
      const k = i - (count - 1) / 2;
      part(
        root,
        `baleen_plate_${first + i}`,
        box(t, h - taper * Math.abs(k), d),
        ridge,
        drawn([x + k * pitch, y, z], [rake, 0, k * splay])
      );
    }
    return;
  }
  const { x, y, z = 0, count, pitch, h, d, splay = 0.045, rake = -0.35, t = 0.4 } = opts;
  for (let i = 0; i < count; i++) {
    const k = i - (count - 1) / 2;
    add(root, `baleen_plate_${i}`, box(t, h, d), ridge, [x, y, z + k * pitch], [0, k * splay, rake]);
  }
}

/**
 * Feed tendrils: soft tubes hung from an anchor, sagging by `sag` of their
 * length and trailing aft. `[name, [x, y, z], length, r, sag]` each.
 *
 * As the approved Harvester grows them (hulls/harvester-pelagia.mjs), an
 * entry is `{ name, x, droop, phase, length }` and the tendril is a tube of
 * `steps` along a centripetal Catmull-Rom through `knots` stations forward
 * from `z0` over `length`, in the export's own frame: at the k-th, t =
 * k/(knots − 1), it sits at x + 0.1·sin(3t + phase) across, hangs to
 * −0.45 − droop·t + 0.12·sin(4t + phase), and lies at z0 + length·t — one
 * wobble each way and a phase of its own, which is what makes three
 * tendrils hang three ways. Every constant is the file's, recovered to the
 * float and checked against all sixty-three tube stations (the three
 * curves' 21 each). The array form above still builds what it built.
 */
export function tendrils(root, ridge, opts) {
  const { tendrils: list } = opts;
  if (!Array.isArray(list[0])) {
    const { r = 0.045, steps = 20, facets = 5, z0 = 1.35, knots = 6 } = opts;
    list.forEach(({ name, x, droop, phase, length }) => {
      const through = [];
      for (let k = 0; k < knots; k++) {
        const t = k / (knots - 1);
        through.push([
          x + 0.1 * Math.sin(3 * t + phase),
          -0.45 - droop * t + 0.12 * Math.sin(4 * t + phase),
          z0 + length * t,
        ]);
      }
      feeler(root, ridge, {
        name: `feed_tendril_${name}`,
        through: through.map((p) => drawn(p).at),
        r,
        steps,
        facets,
      });
    });
    return;
  }
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
 * the bladder — the same shoulder–crown–shoulder ridge `ridgeRing` lathes for
 * the Sower's `bladder` rings, turned to the pipe's axis. Distances are
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
 * `facets` [radial, tubular].
 */
export function grownMound(root, { body, ring, collar }, opts) {
  const { mound, collar: c, ring: g } = opts;
  part(root, 'base_mound', shell(mound.r, mound.facets, mound), body, mound);
  part(root, 'base_collar', torus(c.R, c.tube, ...c.facets), collar, c);
  part(root, 'mound_ring', torus(g.R, g.tube, ...g.facets), ring, g);
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
 * alternate from the first grip.
 */
export function rootGrips(root, skins, { grips, facets = [3, 6] }) {
  refuseMirror('root_grip', grips, ({ r, length }) => `${r},${length}`);
  grips.forEach((g, i) =>
    part(root, `root_grip_${i}`, capsule(g.r, g.length, ...facets), skins[i % skins.length], g)
  );
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
 */
export function grownHead(root, { pod, cowl }, opts) {
  const head = group(root, 'turret_head', opts);
  const { pod: p, cowl: c, quills } = opts;
  part(head, 'head_pod', shell(p.r, p.facets), pod, p);
  part(head, 'head_cowl', shell(c.r, c.facets, c), cowl, c);
  quills.forEach((q, i) =>
    part(head, `cowl_quill_${i}`, cyl(0, q.r, q.length, q.facets ?? 4), cowl, q)
  );
  return head;
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
 * steel's.
 */
export function grownBarrel(root, mats, opts) {
  const { rootMat, mid, tip, iris, pip, rib: ribMat = rootMat } = mats;
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

/**
 * The magazine: a grown pod on the flank, the feed running up from it, and
 * the flange where it enters the collar. One pod, never a pair — the
 * Commune's turret feeds from the side it grew on.
 *
 * As the approved turret draws it, in the file's order — `pipe`, `pod`,
 * `flange`: the feed a straight frustum of `radii`, `length` and `facets`,
 * leaned by its node; the pod a capsule (kit.mjs `capsule`, `facets` [cap,
 * radial]); the flange a torus.
 */
export function magazine(root, { pipe: pipeMat, pod: podMat, flange }, { pipe, pod, flange: f }) {
  part(root, 'feed_pipe', cyl(pipe.radii[0], pipe.radii[1], pipe.length, pipe.facets), pipeMat, pipe);
  part(root, 'ammo_pod', capsule(pod.r, pod.length, ...pod.facets), podMat, pod);
  part(root, 'feed_flange', torus(f.R, f.tube, ...f.facets), flange, f);
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
  // The last vertex of each pole row is referenced by no triangle, so
  // `computeVertexNormals` leaves it at zero and the exporter writes it as
  // (1, 0, 0) in whatever frame the geometry is authored in — the export's
  // Z-long frame in the approved files, the yawed one here — which is the one
  // normal on a table-built hull that a world-space comparison finds moved
  // (#649 review). Orphans in both files; nothing renders from them.
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
 *
 * `lit` lights every ring the Cruiser's way (hulls/cruiser-pelagia.mjs): a
 * thinner torus of `lit.tube` on `lit.facets` in `lit.mat` rides each ring
 * at the same station and lean, named `lit.name` with the ring's number and
 * exported straight after it, scaled by the ring's own `vein` — a shade
 * wider than the ridge it lights. "Living bioluminescent veins" as a
 * growth ring.
 */
export function grownRings(
  root,
  mat,
  { name = 'growth_ring', first = 1, facets = [5, 20], rings, lit }
) {
  rings.forEach(({ tube, vein, ...placement }, i) => {
    part(root, `${name}_${first + i}`, torus(1, tube, ...facets), mat, placement);
    if (lit)
      part(
        root,
        `${lit.name ?? 'vein_ring'}_${first + i}`,
        torus(1, lit.tube, ...lit.facets),
        lit.mat,
        { ...placement, scale: vein }
      );
  });
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

/* --------------------------------------------------------------------------
 * The other five shared kinds (#649, off #540 Phase 3): the Corvette, the
 * Harvester and the Cruiser — one authoring pass, three r184, drawn along
 * Z like the scout and built through kit.mjs `drawn` and `part` like it —
 * and the Abyssal Submersible and the Chorister, which the same pass and an
 * earlier one drew along X, so their builders take the export's numbers
 * verbatim and yaw nothing. hulls/corvette-pelagia.mjs, harvester-,
 * cruiser-, abyssal-submersible- and chorister-pelagia.mjs are the
 * consumers, and each states where its export is odd.
 * ------------------------------------------------------------------------ */

/**
 * The Corvette's, the Harvester's and the Cruiser's palette: the scout's
 * four names with a third finish — chitin at 0.2 metal and 0.28 rough, a
 * ridge at 0.12 and 0.45, the membrane two-sided at 0.15 and 0.32 — and a
 * lamp that is the biolight token through and through at 0.35 rough,
 * burning at the strength each file carries: 1.3 on the Corvette, 0.9 on
 * the Harvester, 1.6 on the Cruiser (`KHR_materials_emissive_strength`).
 * The Cruiser adds two of its own, `bio_vein_lit` for the lit rings and the
 * four veins along its flanks and `sensor_frill_lit` for its three
 * hydrophone frills, a lamp two-sided like a membrane. Values are the
 * approved exports' own; `ink` and `scoutInk` above are other passes and
 * not interchangeable with this one.
 */
export const fleetInk = {
  chitinHull: () => clad('chitin_hull', hex('#0B241E'), 0.2, 0.28),
  growthRidge: () => clad('growth_ridge', hex('#14332A'), 0.12, 0.45),
  sporePod: () => clad('spore_pod', hex('#E8F0A3'), 0.05, 0.5),
  algaeMembrane: () => {
    const m = clad('algae_membrane', hex('#1FA67A'), 0.15, 0.32);
    m.side = THREE.DoubleSide;
    return m;
  },
  bioLight: (intensity) => lamp('bio_light', hex('#8FE36B'), hex('#8FE36B'), 0.35, intensity),
  bioVeinLit: () => lamp('bio_vein_lit', hex('#8FE36B'), hex('#2A4A20'), 0.4, 1.5),
  sensorFrillLit: () => {
    const m = lamp('sensor_frill_lit', hex('#8FE36B'), hex('#3F6B2E'), 0.4, 0.9);
    m.side = THREE.DoubleSide;
    return m;
  },
};

/**
 * The Abyssal Submersible's palette, hyphenated as its export names it and
 * matte as a deep hull is — chitin at 0.75 rough, the dark ring at 0.85 —
 * with the one lamp, `biolum-vein`, a near-black base under the biolight
 * token burning at 2.2, the strongest on any Commune hull. Values are the
 * approved export's own (hulls/abyssal-submersible-pelagia.mjs).
 */
export const submersibleInk = {
  chitinHull: () => clad('chitin-hull', hex('#0B241E'), 0.15, 0.75),
  algaeTeal: () => clad('algae-teal', hex('#1FA67A'), 0.1, 0.7),
  growthRingDark: () => clad('growth-ring-dark', hex('#123C2E'), 0.1, 0.85),
  sporePale: () => clad('spore-pale', hex('#E8F0A3'), 0.05, 0.65),
  biolumVein: () => lamp('biolum-vein', hex('#8FE36B'), hex('#14301A'), 0.4, 2.2),
};

/**
 * A point of glow inside the hull: the `KHR_lights_punctual` point light
 * the r184 exports carry beside their lamps — two on the Corvette and the
 * Harvester, three on the Cruiser, two named ones on the Submersible — at
 * the export's own colour, intensity and range. Neither the bake nor the
 * kit's audit ever sees one (hull-intake's page.html renders every pass
 * unlit; `lightAudit` and `check.mjs` read meshes), and the conn view loads
 * it with the file, so a port carries the file's and chooses none. `at` is
 * in the kit's frame, as `drawn` gives it. The light itself is the kit's
 * `pointLight` (#649) — the Consortium's Submersible carries the same two —
 * and this is the Commune's colour on it.
 */
export function glow(root, { name, color = hex('#8FE36B'), intensity, range, at }) {
  return pointLight(root, { name, color, intensity, range, at });
}

/**
 * A seed launcher — "visible torpedo hardpoints", grown: a frame of its own
 * (the export's `launcher_*` group, rolled out from the flank by its node),
 * a sheath of ridge in it, and a row of pale seeds along the sheath's back.
 * Three on the Corvette, three on the Cruiser, each its own `length` and
 * its own count of `seeds`, and the rest is the export's one rule, which
 * reproduces every node matrix in both files to the double: the sheath is
 * a unit orb scaled [0.32, 0.24, 0.68] of the length; the k-th of n seeds
 * is a seven-by-five orb of radius 0.15·length·(1 − 0.125·|2t − 1|),
 * t = k/(n − 1) — fullest amidships — at z = length·(t − ½) along the
 * sheath, y = 0.14·length above it and x = 0.12·length·sin 2.4k across,
 * so the row wobbles as it grew.
 */
export function seedLauncher(root, { sheath, seed }, { name, length, seeds, ...placement }) {
  const frame = group(root, name, placement);
  part(
    frame,
    `${name}_sheath`,
    orb(8, 6),
    sheath,
    drawn([0, 0, 0], [0, 0, 0], [0.32 * length, 0.24 * length, 0.68 * length])
  );
  for (let k = 0; k < seeds; k++) {
    const t = k / (seeds - 1);
    part(
      frame,
      `${name}_seed_${k + 1}`,
      new THREE.SphereGeometry(0.15 * length * (1 - 0.125 * Math.abs(2 * t - 1)), 7, 5),
      seed,
      drawn([0.12 * length * Math.sin(2.4 * k), 0.14 * length, length * (t - 0.5)])
    );
  }
  return frame;
}

/**
 * An intake scoop's outline: a crescent between two quadratic arcs on one
 * chord of ±`w`, the outer sagging to `outer` at its control point and the
 * inner to `inner` — a lip, open toward the chord. The Harvester's is the
 * one the roster has (hulls/harvester-pelagia.mjs).
 */
export function scoopOutline(w, outer, inner) {
  const s = new THREE.Shape();
  s.moveTo(-w, 0);
  s.quadraticCurveTo(0, -outer, w, 0);
  s.quadraticCurveTo(0, -inner, -w, 0);
  return s;
}

/**
 * The intake scoop: `scoopOutline` extruded `depth` forward along the keel
 * — the mouth of the "external intake dredge gear", hung under the jaw by
 * its node. Eight curve segments, as the export sampled its arcs.
 */
export function intakeScoop(root, mat, opts) {
  const { name = 'intake_scoop', halfWidth, outer, inner, depth, segments = 8 } = opts;
  const { at, rot, scale } = opts;
  return part(
    root,
    name,
    new THREE.ExtrudeGeometry(scoopOutline(halfWidth, outer, inner), {
      depth,
      bevelEnabled: false,
      curveSegments: segments,
    }),
    mat,
    { at, rot, scale }
  );
}

/**
 * Veins along a body — the Cruiser's four, "living bioluminescent veins"
 * drawn the length of the hull (hulls/cruiser-pelagia.mjs): each a tube of
 * `steps` along a centripetal Catmull-Rom through `knots` stations at even
 * intervals of the body's half-length from `from` to `to`, every station on
 * the ellipsoid `lift` times the hull's own scale, round the length axis at
 * an angle of base + 0.3·sin(2.6·z' + phase) — one slow wave down the
 * flank, each vein's own base and phase. The rule is the export's, recovered
 * to the float from all eighty-four stations; the constants are the file's
 * and not a choice here.
 */
export function hullVeins(root, mat, opts) {
  const { hull, lift = 1.1, knots = 21, steps = 56, r = 0.03, facets = 5, veins } = opts;
  const [sx, sy, sz] = hull;
  veins.forEach(({ name, from, to, base, phase }) => {
    const through = [];
    for (let k = 0; k < knots; k++) {
      const z = from + ((to - from) * k) / (knots - 1);
      const a = base + 0.3 * Math.sin(2.6 * z + phase);
      const rr = lift * Math.sqrt(1 - z * z);
      through.push([sx * rr * Math.cos(a), sy * rr * Math.sin(a), sz * z]);
    }
    feeler(root, mat, { name, through: through.map((p) => drawn(p).at), r, steps, facets });
  });
}

/**
 * Hydrophone masts — "fixed hydrophone masts", grown: a tube of `steps`
 * along a centripetal Catmull-Rom through `knots` stations from the back at
 * `from` aft to `to`, rising as y + 0.9t − 0.25t² and swaying across as
 * x + 0.25·sin(phase)·t + 0.08·sin(4t + phase), with a lit bud at its tip
 * — the Cruiser's two, exported mast then tip (hulls/cruiser-pelagia.mjs).
 * The rule is the export's, recovered to the float from both masts.
 */
export function hydrophoneMasts(root, { mast, tip }, opts) {
  const { masts, knots = 7, steps = 24, r = 0.035, facets = 5, tipR = 0.05 } = opts;
  masts.forEach(({ name, x, phase, y, from, to }) => {
    const through = [];
    for (let k = 0; k < knots; k++) {
      const t = k / (knots - 1);
      through.push([
        x + 0.25 * Math.sin(phase) * t + 0.08 * Math.sin(4 * t + phase),
        y + 0.9 * t - 0.25 * t * t,
        from + (to - from) * t,
      ]);
    }
    feeler(root, mast, { name, through: through.map((p) => drawn(p).at), r, steps, facets });
    lightBuds(root, tip, { buds: [[`${name}_tip`, tipR, drawn(through[knots - 1])]] });
  });
}

/**
 * The X-long twins of kit.mjs `drawn` and `part`, for the Submersible and
 * the Chorister, whose exports already run along +X: `verbatim` is a node's
 * translation, XYZ Euler and scale as the file prints them, and `placed`
 * puts the primitive there un-yawed. The same builder signatures as the
 * Z-long ones, so a hull reads the same either way. Navy-neutral, like
 * `glow` above.
 */
export const verbatim = (t = [0, 0, 0], e = [0, 0, 0], s = [1, 1, 1]) => ({
  at: t,
  rot: e,
  scale: s,
});
const placed = (root, name, geo, mat, placement = {}) => {
  const { at = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1] } = placement;
  return add(root, name, geo, mat, at, rot, scale);
};

/**
 * Grown orbs, placed verbatim: the Submersible's whole body is these — a
 * `seed-hull` of radius 1.5 on twelve by nine, squashed and rolled by its
 * node; a keel, a bulge, a prow tip, three eye sacs, two aft pods and two
 * fins, each an orb of its own radius and facets. `[name, mat, r, facets,
 * placement]` each (hulls/abyssal-submersible-pelagia.mjs).
 */
export function grownOrbs(root, { orbs }) {
  orbs.forEach(([name, mat, r, facets, placement]) =>
    placed(root, name, new THREE.SphereGeometry(r, ...facets), mat, placement)
  );
}

/**
 * Grown cones, placed verbatim: `radii` [top, bottom] as kit `cyl` takes
 * them, `length` between, `facets` round — the Submersible's prow beak and
 * aft nozzle drawn to a point, its nozzle throat open at both ends, and
 * each tendril's tip (hulls/abyssal-submersible-pelagia.mjs). Which way a
 * cone points is its node's: −π/2 about the keel puts the apex forward,
 * +π/2 aft.
 */
export function grownCones(root, { cones }) {
  cones.forEach(([name, mat, [rTop, rBottom], length, facets, placement]) =>
    placed(root, name, cyl(rTop, rBottom, length, facets), mat, placement)
  );
}

/**
 * Hoops round an X-long body, placed verbatim: a torus each of `R` and
 * `tube` on `facets` [radial, tubular], open over `arc` radians when it is
 * less than a turn — the Submersible's six growth rings, its five vein
 * rings (open 4.6, 5.2, 4.4, 5.0 and 3.8 of the way round, each turned its
 * own way about the keel) and the vein along its port fin, a 3.6 rad arc
 * (hulls/abyssal-submersible-pelagia.mjs). `[name, mat, R, tube, facets,
 * arc, placement]` each.
 */
export function grownHoops(root, { hoops }) {
  hoops.forEach(([name, mat, R, tube, [radial, tubular], arc, placement]) =>
    placed(
      root,
      name,
      new THREE.TorusGeometry(R, tube, radial, tubular, arc ?? Math.PI * 2),
      mat,
      placement
    )
  );
}

/**
 * A vein swept along a centripetal Catmull-Rom `through` points in the
 * export's own frame, un-yawed — `feeler` for an X-long file. The
 * Submersible's `spine-vein` runs bow to stern over five stations
 * (hulls/abyssal-submersible-pelagia.mjs).
 */
export function sweptVein(root, mat, { name, through, steps, r, facets = 4 }) {
  const curve = new THREE.CatmullRomCurve3(through.map((p) => new THREE.Vector3(...p)));
  return add(root, name, new THREE.TubeGeometry(curve, steps, r, facets, false), mat);
}

/**
 * The Submersible's tendrils — "folded manipulator limbs", grown as four
 * feelers trailing aft from under the bow, each tipped with a pale cone
 * (hulls/abyssal-submersible-pelagia.mjs). Each is a tube of `steps` along
 * a centripetal Catmull-Rom through `knots` stations from x = `from` back
 * to its own `xEnd`, hanging as −0.95 − 0.25t − 0.35·sin(2.6t + seed) and
 * swaying as z + 0.28·sin(3.2t + 1.7·seed) — one `seed` a tendril, so no
 * two hang alike — and its tip is a six-sided cone 1.4 times the tube's
 * radius across and 0.45 long, apex aft, 0.2 behind the tube's end. The
 * rule is the export's, recovered to the float from all twenty-eight
 * stations, and the tip nodes carry the end stations to the double.
 * Exported tube then tip, as the file has them.
 */
export function abyssalTendrils(root, { tube, tip }, opts) {
  const { tendrils: list, from = 1.6, knots = 7, steps = 20, facets = 5 } = opts;
  list.forEach(({ name, seed, z, xEnd, r }) => {
    const through = [];
    for (let k = 0; k < knots; k++) {
      const t = k / (knots - 1);
      through.push([
        from + (xEnd - from) * t,
        -0.95 - 0.25 * t - 0.35 * Math.sin(2.6 * t + seed),
        z + 0.28 * Math.sin(3.2 * t + 1.7 * seed),
      ]);
    }
    sweptVein(root, tube, { name, through, steps, r, facets });
    const [ex, ey, ez] = through[knots - 1];
    placed(
      root,
      `${name}-tip`,
      cyl(0, 1.4 * r, 0.45, 6),
      tip,
      verbatim([ex - 0.2, ey, ez], [0, 0, Math.PI / 2])
    );
  });
}

/**
 * The cohort segments — "three overlapping segments with the bladder
 * showing through the middle one": three lobes along the keel, each an orb
 * on `facets` squashed to its own three `radii` by its node, in its own
 * `skin` (the middle one membrane, where the bladder shows), and each with
 * a growth ring lathed round it (`ridgeRing`, the Sower's and Spinner's
 * own), `dx` ahead of its centre, cresting at `crown` from `shoulder` over
 * ±`ring.halfWidth`, squashed with the lobe. The Chorister's `lobe_0..2`
 * and `lobe_ring_0..2`, lobe then ring as the file orders them
 * (hulls/chorister-pelagia.mjs). Its rings crest at 0.9 of the lobe's beam
 * radius from a shoulder at 0.82 of it, two units forward — passed as the
 * numbers, which are the export's.
 */
export function cohortLobes(root, ridge, opts) {
  const { lobes, facets = [14, 7], ring: rf = { halfWidth: 0.6, facets: 14 } } = opts;
  lobes.forEach(({ skin, at: [x, y, z], radii: [rx, ry, rz], ring }, i) => {
    add(root, `lobe_${i}`, orb(...facets), skin, [x, y, z], [0, 0, 0], [rx, ry, rz]);
    add(
      root,
      `lobe_ring_${i}`,
      ridgeRing({
        crown: ring.crown,
        shoulder: ring.shoulder,
        halfWidth: rf.halfWidth,
        facets: rf.facets,
      }),
      ridge,
      [x + ring.dx, y, z],
      [0, 0, 0],
      [1, ry / rz, 1]
    );
  });
}

export { THREE };
