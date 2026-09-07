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
import { THREE, clad, lamp, add, box, cyl, torus, plan, loft, bothSides } from '../kit.mjs';

/** The Commune's palette, as the Sower's own materials carry it. */
export const ink = {
  chitinHull: () => clad('chitin_hull', [0.0, 0.02, 0.01], 0.08, 0.6),
  growthRidge: () => clad('growth_ridge', [0.01, 0.04, 0.03], 0.1, 0.65),
  algaeMembrane: () => clad('algae_membrane', [0.01, 0.38, 0.19], 0.05, 0.55),
  sporePod: () => clad('spore_pod', [0.81, 0.87, 0.37], 0.05, 0.5),
  bioVein: () => lamp('bio_vein', [0.11, 0.42, 0.05], [0.0, 0.01, 0.0]),
  bioLight: () => lamp('bio_light', [0.27, 0.77, 0.15], [0.0, 0.01, 0.0]),
};

/** A grown orb: few facets, and squashed by the caller — never round in section. */
const orb = (w = 12, h = 6) => new THREE.SphereGeometry(1, w, h);

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
 */
export function podBody(root, mat, opts) {
  const { bow, stern, maxR, waist = 0.5, squash = 0.7, facets = 12, name = 'pod_body' } = opts;
  const L = bow - stern;
  const at = (t) => stern + L * t;
  return add(
    root,
    name,
    loft(
      [
        [at(0), 0],
        [at(0.06), maxR * 0.3],
        [at(0.2), maxR * 0.68],
        [at(waist - 0.14), maxR * 0.94],
        [at(waist), maxR],
        [at(waist + 0.14), maxR * 0.95],
        [at(0.8), maxR * 0.7],
        [at(0.93), maxR * 0.32],
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
 */
export function growthRings(root, mat, opts) {
  const { stations, squash = 0.72, tube = 0.9, wobble = 0, name = 'growth_ring' } = opts;
  stations.forEach(([x, r], i) =>
    add(
      root,
      `${name}_${i}`,
      torus(r, tube, 6, 12),
      mat,
      [x, 0, 0],
      [wobble * Math.sin(1 + i * 2.4), Math.PI / 2 + wobble * Math.cos(2 + i * 1.7), 0],
      [1, squash, 1]
    )
  );
}

/**
 * The bloom bed: a broad flat leaf from a plan outline, `depth` thick and
 * centred on `y`, with a smaller chitin plate under it where the membrane is
 * backed. The Sower's is the one hull in the roster wider at the bow than at
 * the waist, and its whole 54 m beam is this plate — beam as body.
 */
export function bloomBed(root, { membrane, chitin }, { outline, y = 0, depth, underside }) {
  add(root, 'bloom_bed', plan(outline, depth), membrane, [0, y, 0]);
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
 */
export function ribFan(root, { ridge, vein }, opts) {
  const { node, y, midrib, port, r = 0.95, veinFrac = 0.8, lift = 1.15 } = opts;
  const [nx, nz] = node;
  const ribs = [[midrib, 0]];
  for (const [len, yaw] of port) ribs.push([len, -Math.abs(yaw)]);
  for (const [len, yaw] of port) ribs.push([len, Math.abs(yaw)]);
  ribs.forEach(([len, yaw], i) => {
    const cx = nx + (len / 2) * Math.cos(yaw);
    const cz = nz - (len / 2) * Math.sin(yaw);
    add(root, `rib_${i}`, cyl(r, r, len, 6), ridge, [cx, y, cz], [0, yaw, -Math.PI / 2]);
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
 * navy — with growth rings at `rings` = `[dx, r]` offsets along it.
 */
export function bladder(root, { chitin, ridge }, { x, y, r, squash = 0.5, rings = [] }) {
  add(root, 'bladder', orb(16, 8), chitin, [x, y, 0], [0, 0, 0], [r, r * squash, r]);
  rings.forEach(([dx, rr], i) =>
    add(
      root,
      `bladder_ring_${i}`,
      torus(rr, 0.8, 5, 16),
      ridge,
      [x + dx, y, 0],
      [0, Math.PI / 2, 0],
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
 * are exported from one builder below.
 */
function grownPods(root, { skin, cap }, opts) {
  const { pods, names, squash, capR, capLift, capSquash } = opts;
  refuseMirror(names[0], pods, ([, , , r]) => r);
  pods.forEach(([x, y, z, r], i) => {
    add(root, `${names[0]}_${i}`, orb(10, 6), skin, [x, y, z], [0, 0, 0], [r, r * squash, r]);
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
 */
export function stem(root, { chitin, ridge }, opts) {
  const { from, to, r, y = 0, squash = 0.8, rings = [], keel, facets = 8 } = opts;
  const L = to - from;
  const at = (t) => from + L * t;
  add(
    root,
    'stem',
    loft(
      [
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
      torus(r * 0.76, r * 0.19, 5, 12),
      ridge,
      [x, y, 0],
      [0, Math.PI / 2, 0],
      [1, squash, 1]
    )
  );
  if (keel)
    add(root, 'stem_keel', box(keel.to - keel.from, keel.height, 0.8), ridge, [
      (keel.from + keel.to) / 2,
      y + r * squash + keel.height / 2 - 0.3,
      0,
    ]);
}

/**
 * Membrane fins, port and starboard: thin plates in `algae_membrane` lying
 * flat at `y`. Each pair is `[name, [xAft, xFwd], [zInner, zOuter], opts]`
 * with `opts.t` the thickness (0.4–0.5 m on the approved models) and
 * `opts.taper` how far, as a fraction of the chord, each end draws in at the
 * outboard edge — 0 is the Spinner's straight-cut pectoral, 0.35 a leaf.
 * Pectorals, flukes, caudals and paddles are all this.
 */
export function fins(root, membrane, { y = 0, pairs }) {
  pairs.forEach(([name, [x0, x1], [zi, zo], { t = 0.5, taper = 0 } = {}]) =>
    bothSides((side, sgn) => {
      const L = x1 - x0;
      add(
        root,
        `${name}_${side}`,
        plan(
          [
            [x0, sgn * zi],
            [x1, sgn * zi],
            [x1 - taper * L, sgn * zo],
            [x0 + taper * L, sgn * zo],
          ],
          t
        ),
        membrane,
        [0, y, 0]
      );
    })
  );
}

/**
 * The grown point at the bow — the Sower's `leaf_tip`, the Spinner's
 * `spinneret`: a faceted cone whose apex is at `tip`.
 */
export function nose(root, mat, { name = 'leaf_tip', tip, y = 0, r, length, facets = 6 }) {
  add(root, name, cyl(0, r, length, facets), mat, [tip - length / 2, y, 0], [0, 0, -Math.PI / 2]);
}

/** A dorsal blade standing on the back, `height` above `y`. */
export function dorsalBlade(root, mat, { name = 'dorsal_blade', from, to, y, height, t = 1 }) {
  add(root, name, box(to - from, height, t), mat, [(from + to) / 2, y + height / 2, 0]);
}

/** Navigation marks: flat `bio_light` strips, one each at `[name, x, y, z]`. */
export function navMarks(root, light, { marks, w = 1.2, d = 0.9 }) {
  marks.forEach(([name, x, y, z = 0]) => add(root, name, box(w, 0.5, d), light, [x, y, z]));
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

export { THREE };
