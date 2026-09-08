/**
 * The Abyssal Directorate — the Listening's shape language.
 *
 * "Spiked, insectoid, segmented crustacean forms — asymmetric, yet
 * regimented. Chitinous shell with red photophore biolights in asymmetric
 * deep-sea patterns" (docs/asset-prompts-3d.md, Block 2); "nothing is
 * symmetrical; everything is regimented" (docs/factions.md).
 *
 * The vocabulary is read off the Dredge, the Precentor and the Chorister,
 * whose node names are the parts list:
 *
 *   Dredge     tergite_0..4 · tergite_ridge_0..4 · tergite_spine_0..4 · telson ·
 *              tail_spine_p/s · scoop · scoop_lip · mandible_p/s ·
 *              mandible_root_p/s · gullet · claw_arm · claw_forearm ·
 *              claw_tip_a/b · dredge_boom · dredge_tooth_0..2 · hopper ·
 *              hopper_rim · hopper_throat · photophore_p_ij / s_ij / dorsal_i
 *   Precentor  tergite_0..3 · tergite_seam_0..3 · rostrum · telson · array_boom ·
 *              array_boom_sleeve · hydrophone_p0..5 / s0..4 · boom_tip_p/s ·
 *              dome · dome_spine_0..5 · dome_aft · dorsal_spine_0..3 ·
 *              limb_p0..2 / s0..2 · photophore_0..3
 *   Chorister  tergite_0..2 · tergite_seam_0..2 · bladder_dome · rostrum ·
 *              telson · tail_spine_p/s · dorsal_spine_0..2 · limb_p0..2 / s0..2 ·
 *              spine_gun · spine_gun_mount · photophore_p0..3 / s0
 *
 * Three rules fall out of those, and they are what this module holds rather
 * than any one hull:
 *
 * - **The body is a segment series.** Every Directorate hull is a run of
 *   overlapping tergites — squashed orbs, alternating bruise violet and
 *   abyssal red, each with a dark lip where the next plate overlaps it and a
 *   spine off it — with a rostrum ahead and a telson astern. Nothing here is
 *   lathed: a carapace is plates, and the seams between them are the shape.
 * - **Asymmetric, yet regimented.** The spines rake the same way and alternate
 *   sides; the limbs fold at one angle in two matched ranks; the photophores
 *   run in ranks at a fixed pitch — port three to a plate, starboard two on
 *   every other plate — and the Precentor's port hydrophone rank is one longer
 *   than its starboard. The *rule* is regular and the *result* never mirrors,
 *   so the builders that place light refuse a mirrored pair outright.
 * - **Light is a photophore, and it lies flat.** A photophore is a small flat
 *   box in `biolight_crimson` on an upward face of the carapace, because the
 *   maps are top-down (kit.mjs); the gullet and the hopper throat are the
 *   same thing writ large. The Directorate's listed SIGs are baseline figures,
 *   so its light is spread along the plates, not thrown forward.
 */
import {
  THREE,
  clad,
  lamp,
  add,
  box,
  cyl,
  torus,
  plan,
  cable,
  bothSides,
  segmentSeries as series,
} from '../kit.mjs';

/** The Directorate's palette, as the Dredge's own materials carry it. */
export const ink = {
  chitinViolet: () => clad('chitin_violet', [0.03, 0.01, 0.05], 0.1, 0.62),
  chitinRed: () => clad('chitin_red', [0.19, 0.01, 0.03], 0.14, 0.52),
  trenchBlack: () => clad('trench_black', [0.0, 0.0, 0.01], 0.32, 0.42),
  weldSteel: () => clad('weld_steel', [0.04, 0.05, 0.07], 0.38, 0.44),
  biolightCrimson: () => lamp('biolight_crimson', [0.54, 0.06, 0.11], [0.01, 0.0, 0.01]),
  gulletGlow: () => lamp('gullet_glow', [0.75, 0.08, 0.14], [0.02, 0.0, 0.01]),
};

/** A carapace orb: a low-facet sphere the caller squashes into a plate. */
const orb = (w = 12, h = 6) => new THREE.SphereGeometry(1, w, h);
/** A spine: a faceted cone, apex at +Y until the caller rakes it. */
const spike = (r, length, facets = 6) => cyl(0, r, length, facets);

/** Refuse a mirrored pair: nothing on this navy is symmetrical. */
function refuseMirror(what, spots) {
  for (let i = 0; i < spots.length; i++)
    for (let j = i + 1; j < spots.length; j++) {
      const [, ax, ay, az] = spots[i];
      const [, bx, by, bz] = spots[j];
      if (Math.abs(ax - bx) < 0.5 && Math.abs(ay - by) < 0.5 && Math.abs(az + bz) < 0.5)
        throw new Error(`${what}: ${spots[i][0]} and ${spots[j][0]} mirror — nothing here does`);
    }
}

/**
 * Stations for a run of tergites: the kit's `segmentSeries` with the
 * Directorate's section — plates wider than they are long and far wider
 * than tall, the Dredge's 17 × 10 × 26 — so a hull passes only its length
 * and its count. Stern first, which is the order the Dredge and the
 * Precentor number them in.
 */
export const segmentSeries = (opts) => series({ section: [0.6, 1.5], ...opts });

/**
 * The tergites: a squashed orb per `[x, sx, sy, sz]` station, alternating
 * violet and red from the stern, with a lip and a spine each.
 *
 * `lip` is where the plates overlap. `'seam'` is the Chorister's and the
 * Precentor's: a smaller dark orb sunk at the forward end, reading as the
 * shadow line under the plate ahead. `'ridge'` is the Dredge's: a dark orb at
 * the aft edge standing *proud* of the plate, the raised trailing lip of a
 * heavier carapace. `'none'` for a hull whose plates butt.
 *
 * `spines` puts one spine off each plate — alternating sides from port,
 * alternating between the two `lengths`, all raked forward by `rake` — which
 * is the regimented asymmetry the navy is built on. Omit for a smooth back.
 */
export function tergites(root, { violet, red, black }, opts) {
  const { segments, lip = 'seam', spines, facets = [12, 6] } = opts;
  segments.forEach(([x, sx, sy, sz], i) => {
    add(root, `tergite_${i}`, orb(...facets), i % 2 ? red : violet, [x, 0, 0], [0, 0, 0], [sx, sy, sz]);
    if (lip === 'seam')
      add(root, `tergite_seam_${i}`, orb(10, 6), black, [x + 0.85 * sx, 0, 0], [0, 0, 0], [
        0.3 * sx,
        0.95 * sy,
        0.9 * sz,
      ]);
    else if (lip === 'ridge')
      add(root, `tergite_ridge_${i}`, orb(10, 6), black, [x - 0.75 * sx, 0.5, 0], [0, 0, 0], [
        0.25 * sx,
        1.125 * sy,
        0.92 * sz,
      ]);
    if (spines) {
      const { lengths = [7, 10], r = 1.2, rake = -0.3, z = 0.28 } = spines;
      const sgn = i % 2 ? -1 : 1;
      add(root, `tergite_spine_${i}`, spike(r, lengths[i % lengths.length]), black, [
        x + 2,
        sy + 2,
        sgn * z * sz,
      ], [0, 0, rake]);
    }
  });
}

/** The rostrum: a faceted cone ahead of the first plate, apex at `tip`. */
export function rostrum(root, red, { tip, r, length, facets = 6 }) {
  add(root, 'rostrum', spike(r, length, facets), red, [tip - length / 2, 0, 0], [0, 0, -Math.PI / 2]);
}

/**
 * The telson: a cone astern, apex at `tip`, and the pair of tail spines
 * splayed `splay` radians outward off it.
 */
export function telson(root, { violet, black }, opts) {
  const { tip, r, length, facets = 6, tailSpines } = opts;
  add(root, 'telson', cyl(r, 0, length, facets), violet, [tip + length / 2, 0, 0], [0, 0, -Math.PI / 2]);
  if (tailSpines) {
    const { x, y = 1, z, r: sr, length: sl, splay = 0.4 } = tailSpines;
    bothSides((side, sgn) =>
      add(root, `tail_spine_${side}`, cyl(sr, 0, sl, 5), black, [x, y, sgn * z], [0, sgn * splay, -Math.PI / 2])
    );
  }
}

/**
 * Walking limbs, folded under the flanks: two ranks of `weld_steel` legs at
 * `xs`, athwartships and folded down by `fold` radians. Matched ranks are
 * this navy's regimentation, and the one place a mirrored pair is the rule.
 */
export function limbs(root, steel, { xs, y, z, r = 0.6, length = 6, fold = 0.45 }) {
  bothSides((side, sgn) =>
    xs.forEach((x, i) =>
      add(root, `limb_${side}${i}`, cyl(r, r, length, 6), steel, [x, y, sgn * z], [
        Math.PI / 2,
        0,
        -sgn * fold,
      ])
    )
  );
}

/**
 * Dorsal spines along the back, `[x, y, z, length]` each, all raked forward
 * by `rake`. The hull alternates their sides; the builder holds the rake.
 */
export function dorsalSpines(root, black, { spines, r = 0.7, rake = -0.3 }) {
  refuseMirror('dorsal_spine', spines.map((s, i) => [i, ...s]));
  spines.forEach(([x, y, z, length], i) =>
    add(root, `dorsal_spine_${i}`, spike(r, length), black, [x, y, z], [0, 0, rake])
  );
}

/**
 * Photophores: flat crimson boxes, one each at `[name, x, y, z]`, on an
 * upward face. A mirrored pair is refused — a pattern that repeats on
 * neither side is the Block 2 rule, and the Chorister's four-and-one is it.
 */
export function photophores(root, crimson, { spots, size = 1.1, h = 0.4, depth }) {
  refuseMirror('photophore', spots);
  spots.forEach(([name, x, y, z]) => add(root, name, box(size, h, depth ?? size), crimson, [x, y, z]));
}

/**
 * The Dredge's rule for a lit carapace: a rank of photophores along every
 * plate's edge, each rank starting `start` of the plate's half-length from
 * its centre and running aft-to-forward at `pitch` of it, sitting at `y` of
 * the plate's height and `z` of its beam — on the shell where it faces up.
 * Port carries `port.count` on every plate; starboard `starboard.count` on
 * every `starboard.every`-th plate only. Regimented, and never symmetric.
 */
export function plateEdgePhotophores(root, crimson, opts) {
  const {
    segments,
    port = { count: 3, start: -0.5, pitch: 0.45 },
    starboard = { count: 2, start: -0.3, pitch: 0.55, every: 2 },
    y = 0.72,
    z = 0.66,
    size = 1.4,
  } = opts;
  segments.forEach(([x, sx, sy, sz], i) => {
    const rank = (side, sgn, { count, start, pitch }) => {
      for (let j = 0; j < count; j++)
        add(root, `photophore_${side}_${i}${j}`, box(size, 0.4, size), crimson, [
          x + (start + pitch * j) * sx,
          y * sy,
          sgn * z * sz,
        ]);
    };
    rank('p', 1, port);
    if (i % (starboard.every ?? 1) === 0) rank('s', -1, starboard);
  });
}

/**
 * The bladder dome: the pressure bladder showing through the middle plate as
 * a paler dome — off the centreline, as the Chorister's is, because a grown
 * thing is not centred.
 */
export function bladderDome(root, violet, { x, y, z, r, squash = 0.64, stretch = 1.1 }) {
  add(root, 'bladder_dome', orb(), violet, [x, y, z], [0, 0, 0], [r, r * squash, r * stretch]);
}

/**
 * The listening dome: a studded red orb — `studs.count` spines in a ring at
 * `studs.ring` of its radius, each tilted outward by `studs.tilt` — with a
 * smaller violet dome behind it. The Precentor's ears, and the Cantor's.
 */
export function listeningDome(root, { red, violet, black }, opts) {
  const { x, y, z = 0, r, squash = 0.76, studs = {}, aft } = opts;
  const { count = 6, ring = 0.58, height = 0.81, tilt = 0.5, length = 3.2, r: sr = 0.5, phase = 0.4 } = studs;
  add(root, 'dome', orb(14, 7), red, [x, y, z], [0, 0, 0], [r, r * squash, r]);
  for (let i = 0; i < count; i++) {
    const a = phase + (i * 2 * Math.PI) / count;
    add(root, `dome_spine_${i}`, spike(sr, length), black, [
      x + r * ring * Math.cos(a),
      y + r * squash * height,
      z + r * ring * Math.sin(a),
    ], [tilt * Math.sin(a), 0, -tilt * Math.cos(a)]);
  }
  if (aft)
    add(root, 'dome_aft', orb(10, 6), violet, [aft.x, aft.y, aft.z], [0, 0, 0], [aft.r, aft.r * 0.85, aft.r]);
}

/**
 * The hydrophone array athwartships: a boom across the beam at `[x, y]`
 * with a sleeve where it passes the body, a rank of hydrophone spines each
 * side stepping outward at `pitch` — alternating between the two `lengths`,
 * each in its socket, canted outward — and a tip spike at each end. `port`
 * and `starboard` are the rank sizes and must differ: the Precentor's port
 * rank is one longer, and a hull whose ranks match is not this navy's.
 */
export function arrayBoom(root, { steel, black, red }, opts) {
  const { x, y, halfSpan, r = 1.3, port = 6, starboard = 5, z0 = 5, pitch = 2.6 } = opts;
  const { lengths = [6, 7.5], hr = 0.9, cant = 0.25 } = opts;
  if (port === starboard)
    throw new Error(`array_boom: ${port} hydrophones a side — the ranks never match`);
  add(root, 'array_boom', cyl(r, r, halfSpan * 2, 8), steel, [x, y, 0], [Math.PI / 2, 0, 0]);
  add(root, 'array_boom_sleeve', cyl(r * 1.46, r * 1.46, 6, 8), black, [x, y, 0], [Math.PI / 2, 0, 0]);
  bothSides((side, sgn) => {
    const count = sgn > 0 ? port : starboard;
    for (let j = 0; j < count; j++) {
      const len = lengths[j % lengths.length];
      const z = sgn * (z0 + pitch * j);
      add(root, `hydrophone_${side}${j}`, spike(hr, len), red, [x, y + 0.9 + len / 2, z], [
        sgn * cant,
        0,
        0.15,
      ]);
      add(root, `hydrophone_socket_${side}${j}`, cyl(0.8, 0.8, 1.2, 6), steel, [x, y + 0.9, z]);
    }
    add(root, `boom_tip_${side}`, spike(r, 4), black, [x, y, sgn * halfSpan], [sgn * Math.PI / 2, 0, 0]);
  });
}

/** The spine-gun: one short barrel off the centreline, on its mount. */
export function spineGun(root, { steel, black }, { x, y, z, r = 0.7, length = 9 }) {
  add(root, 'spine_gun', cyl(r, r, length, 6), steel, [x, y, z], [0, 0, -Math.PI / 2]);
  add(root, 'spine_gun_mount', box(2.4, 1.6, 2), black, [x - length / 2, y - 0.2, z]);
}

/**
 * The scoop bow: a plate from a plan outline with a steel lip over it, a
 * mandible each side converging on the tip, and the gullet — a lit patch
 * lying flat in the scoop's mouth, which is the loud thing on the Dredge.
 */
export function scoopBow(root, { red, steel, black, gullet }, opts) {
  const { outline, y, depth, lip, mandibles, gullet: g } = opts;
  add(root, 'scoop', plan(outline, depth), red, [0, y, 0]);
  if (lip) add(root, 'scoop_lip', plan(lip.outline, lip.depth), steel, [0, lip.y, 0]);
  if (mandibles) {
    const { x, y: my = 0.5, z, r = 2.2, length = 16, pinch = 0.12 } = mandibles;
    bothSides((side, sgn) => {
      add(root, `mandible_${side}`, spike(r, length), steel, [x, my, sgn * z], [0, sgn * pinch, -Math.PI / 2]);
      add(root, `mandible_root_${side}`, box(4, 4, 4), black, [x - length / 2, my, sgn * (z + 0.5)]);
    });
  }
  if (g) add(root, 'gullet', box(g.w, 0.5, g.d), gullet, [g.x, g.y, g.z ?? 0]);
}

/**
 * One great folded claw off one beam: an arm along the hull, a forearm bent
 * `bend` radians back in toward the bow, and two tips closing on each other.
 * `side` is 'p' or 's' and there is no pair — the Dredge's is to starboard.
 */
export function claw(root, { steel, black }, opts) {
  const { side = 's', x, y = 1, z, arm = { r: 2.4, length: 34 }, fore = { r: 1.8, length: 20, bend: 0.25 } } = opts;
  const sgn = side === 'p' ? 1 : -1;
  const ax = x + arm.length / 2;
  add(root, 'claw_arm', cyl(arm.r, arm.r, arm.length, 8), steel, [ax, y, z], [0, 0, -Math.PI / 2]);
  const fx = x + arm.length + (fore.length / 2) * Math.cos(fore.bend);
  const fz = z + sgn * (fore.length / 2) * Math.sin(fore.bend) * 0.3;
  add(root, 'claw_forearm', cyl(fore.r, fore.r, fore.length, 8), steel, [fx, y + 1, fz], [0, sgn * fore.bend, -Math.PI / 2]);
  const tx = x + arm.length + fore.length * 0.55;
  add(root, 'claw_tip_a', cyl(fore.r, 0, 9, 5), black, [tx, y + 1.5, fz], [0, sgn * 0.2, -Math.PI / 2]);
  add(root, 'claw_tip_b', cyl(fore.r * 0.8, 0, 7, 5), black, [tx - 2, y + 1.5, fz - sgn * 5], [0, -sgn * 0.3, -Math.PI / 2]);
}

/** The dredge boom off the other beam: a spar along the hull with teeth stepped along it. */
export function dredgeBoom(root, { steel, black }, opts) {
  const { side = 'p', x, y = 0.5, z, r = 1.2, length = 30, teeth = 3 } = opts;
  const sgn = side === 'p' ? 1 : -1;
  add(root, 'dredge_boom', cyl(r, r, length, 8), steel, [x, y, z], [0, 0, -Math.PI / 2]);
  for (let i = 0; i < teeth; i++)
    add(root, `dredge_tooth_${i}`, box(2.2, 2.2, 3), black, [
      x - length / 3 + (length / 3) * i,
      y,
      z + sgn * 2,
    ]);
}

/** The hopper amidships: a bin, its rim, and the throat lit around it — facing up. */
export function hopper(root, { black, steel, gullet }, { x, y, z = 0, w = 18, h = 6, d = 14 }) {
  add(root, 'hopper', box(w, h, d), black, [x, y, z]);
  add(root, 'hopper_rim', box(w + 1, 0.8, d + 1), steel, [x, y + h / 2 + 0.2, z]);
  add(root, 'hopper_throat', box(w * 0.67, 0.3, d * 0.57), gullet, [x, y + h / 2 + 0.7, z]);
}

/* --------------------------------------------------------------------------
 * Structures. A settlement is the same architecture grown four ways, so the
 * base / mount / head / barrel family lives here beside the hull vocabulary
 * rather than in any one structure script (#553, off #540 Phase 3).
 *
 * The Directorate's structures are the carapace laid down: a mound plated in
 * scutes instead of tergites, a browed head, and a segmented stinger for a
 * gun. Asymmetric, yet regimented — the rule that places the scutes is
 * regular and the result never mirrors, so `photophores` refuses a mirrored
 * pair on this navy's turret exactly as it does on its hulls.
 * ------------------------------------------------------------------------ */

/**
 * The structure palette: the one body colour a turret needs that no hull did.
 *
 * A Sentinel Turret is "nearly black — an ambush predator, navigation marks
 * only until it fires" (docs/asset-prompts-3d.md, the Sentinel Turret block),
 * and `chitin_red` at [0.19, 0.01, 0.03] is not that. The structures carry
 * their own names rather than a shared dimming factor applied to `ink` — see
 * `structureInk` in factions/hadron.mjs for the argument. The value is the
 * approved turret's own.
 */
export const structureInk = {
  chitinRedDark: () => clad('chitin_red_dark', [0.076, 0.006, 0.014], 0.14, 0.55),
};

/** A carapace plate: a low-facet orb the caller squashes and lays on the mound. */
const scute = (w = 10, h = 6) => new THREE.SphereGeometry(1, w, h);

/**
 * The mound: a chitinous dome, the skirt where it meets the ground, and the
 * collar the head turns in.
 */
export function carapaceMound(root, { violet, black, steel }, opts) {
  const { x = 0, z = 0, y, r, skirt, collar } = opts;
  add(root, 'base_mound', scute(12, 6), violet, [x, y, z], [0, 0, 0], r);
  // A torus is born in the XY plane; a skirt and a collar lie flat.
  add(root, 'mound_skirt', torus(skirt.r, skirt.t, 4, 20), black, [x, skirt.y, z], [
    Math.PI / 2,
    0,
    0,
  ]);
  add(root, 'base_collar', torus(collar.r, collar.t, 5, 18), steel, [x, collar.y, z], [
    Math.PI / 2,
    0,
    0,
  ]);
}

/**
 * Scutes plated round the mound, each `[degrees, radius, [long, height,
 * wide]]` with `long` running outward, alternating through `skins`. The rank
 * is regular in rule and never regular in result — the sizes are the
 * plates' own.
 */
export function baseScutes(root, skins, { x = 0, z = 0, y, scutes }) {
  scutes.forEach(([deg, rad, size], i) => {
    const a = (deg * Math.PI) / 180;
    add(
      root,
      `base_scute_${i}`,
      scute(10, 6),
      skins[i % skins.length],
      [x + rad * Math.cos(a), y, z + rad * Math.sin(a)],
      [0, -a, 0],
      [size[0] / 2, size[1] / 2, size[2] / 2]
    );
  });
}

/**
 * The head: a pod that trains, the brow shelved over it, the antennae raked
 * off the brow, and the counter-spike that balances the stinger astern.
 */
export function browHead(root, { red, black, violet }, opts) {
  const { x, y, z = 0, podR, brow, antennae, counter } = opts;
  add(root, 'head_pod', scute(10, 6), red, [x, y, z], [0, 0, 0], podR);
  add(root, 'head_brow', scute(10, 6), black, brow.at, [0, 0, brow.tilt ?? 0], brow.r);
  antennae.forEach(([ax, az, length, rake], i) =>
    add(
      root,
      `brow_antenna_${i}`,
      spike(length * 0.09, length, 4),
      violet,
      [ax, brow.at[1] + brow.r[1] * 0.55 + length / 2, az],
      [rake, 0, 0]
    )
  );
  add(root, 'counter_spike', spike(counter.r, counter.length, 4), violet, counter.at, [
    0,
    0,
    counter.rake,
  ]);
}

/**
 * The gun as a stinger: `segments` tapering along the run from `from` to
 * `to`, each barbed on its upper shoulder, closing on the tip and its one
 * lit pip.
 *
 * Segmented rather than lathed, for the reason the tergites are: a carapace
 * is plates, and the seams between them are the shape.
 */
export function stingerBarrel(root, { steel, violet, black, pip }, { from, to, r, segments = 3 }) {
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
  const span = 0.86 / segments;
  for (let i = 0; i < segments; i++) {
    const t0 = i * span;
    const t1 = t0 + span * 1.14;
    const r0 = r * (1 - 0.22 * i);
    const geo = cyl(r0 * 0.86, r0, len * (t1 - t0), 6);
    geo.rotateZ(-Math.PI / 2);
    along(`barrel_seg_${i}`, geo, i % 2 ? violet : steel, (t0 + t1) / 2);
    along(
      `barrel_barb_${i}`,
      scute(8, 4),
      black,
      t0 + span * 0.28
    ).scale.set(r0 * 0.5, r0 * 0.62, r0 * 0.5);
  }
  along('stinger_tip', spike(r * 0.4, len * 0.16, 4), black, 0.92).rotateZ(-Math.PI / 2);
  along('muzzle_pip', new THREE.SphereGeometry(r * 0.2, 8, 6), pip, 1);
}

/**
 * Claw grips on the seabed, each `[index, degrees, radius, [long, height,
 * wide]]`. The index is given rather than counted because the approved
 * turret's rank runs 0, 1, 2, 4, 5 — a gap where a claw was never grown, and
 * "asymmetric, yet regimented" is exactly what a rank with a hole in it is.
 */
export function clawGrips(root, skins, { x = 0, z = 0, y, grips }) {
  grips.forEach(([index, deg, rad, size], i) => {
    const a = (deg * Math.PI) / 180;
    // The cone is born apex-up; laid on its side once, it claws outward.
    const geo = spike(1, 2, 5);
    geo.rotateZ(-Math.PI / 2);
    add(
      root,
      `claw_grip_${index}`,
      geo,
      skins[i % skins.length],
      [x + rad * Math.cos(a), y, z + rad * Math.sin(a)],
      [0, -a, 0],
      [size[0] / 2, size[1] / 2, size[2] / 2]
    );
  });
}

/** The magazine on one flank, its feed, and the flange into the collar. */
export function magazine(root, { steel, red }, { pod, pipe, flangeAt }) {
  add(root, 'ammo_pod', scute(10, 6), steel, pod.at, [0, 0, pod.roll ?? 0], pod.r);
  cable(root, 'feed_pipe', pipe.from, pipe.to, steel, { r: pipe.r, sag: pipe.sag ?? 0, facets: 6 });
  const ring = torus(flangeAt.r, flangeAt.t, 4, 10);
  ring.rotateX(Math.PI / 2);
  add(root, 'feed_flange', ring, red, flangeAt.at);
}

export { THREE };
