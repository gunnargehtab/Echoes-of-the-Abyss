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
 *              array_boom_sleeve · hydrophone_s0..5 / p0..4 · boom_tip_p/s ·
 *              dome · dome_spine_0..5 · dome_aft · dorsal_spine_0..3 ·
 *              limb_p0..2 / s0..2 · photophore_0..3
 *   Chorister  tergite_0..2 · tergite_seam_0..2 · bladder_dome · rostrum ·
 *              telson · tail_spine_p/s · dorsal_spine_0..2 · limb_p0..2 / s0..2 ·
 *              spine_gun · spine_gun_mount · photophore_s0..3 / p0 (the export
 *              wrote its row `_p`; its port turned the names round, #642 / #649)
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
 *   run in ranks at a fixed pitch — starboard three to a plate, port two on
 *   every other plate — and the Precentor's starboard hydrophone rank is one
 *   longer than its port. (Both blocks say port. The approved models were
 *   named and read with +z as port, and #642 settled +z as starboard, so the
 *   models and their blocks now disagree; a port keeps the model, and the
 *   call is filed off #642.) The *rule* is regular and the *result* never
 *   mirrors,
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
  hex,
  add,
  box,
  cyl,
  torus,
  plan,
  bothSides,
  polar,
  part,
  drawn,
  segmentSeries as series,
  capsule,
  group,
} from '../kit.mjs';

/**
 * The Directorate's palette, as the Dredge's own materials carry it: the four
 * tokens of docs/art-direction.md, and — where the approved model needed a
 * colour the docs do not name — that model's own hex, exactly (kit.mjs `hex`).
 *
 * Exactly, because the first transcription rounded each linear channel to two
 * decimals and trench black came out `[0, 0, 0.01]`: red and green zeroed,
 * blue doubled, a 3.4× drop in the luminance the bake ships (#630, F2). It
 * clads the ridges, the spines, the mandible roots and the hopper.
 */
export const ink = {
  chitinViolet: () => clad('chitin_violet', hex('#2D1B3D'), 0.1, 0.62),
  chitinRed: () => clad('chitin_red', hex('#7A1B2E'), 0.14, 0.52),
  trenchBlack: () => clad('trench_black', hex('#0A0710'), 0.32, 0.42),
  weldSteel: () => clad('weld_steel', hex('#3A3F4A'), 0.38, 0.44),
  biolightCrimson: () => lamp('biolight_crimson', hex('#C2465E'), hex('#1A0810')),
  gulletGlow: () => lamp('gullet_glow', hex('#E0506A'), hex('#2A0C14')),
};

/** A carapace orb: a low-facet sphere the caller squashes into a plate. */
const orb = (w = 12, h = 6) => new THREE.SphereGeometry(1, w, h);
/** A spine: a faceted cone, apex at +Y until the caller rakes it. */
const spike = (r, length, facets = 6) => cyl(0, r, length, facets);

/**
 * Refuse a mirrored pair: nothing on this navy is symmetrical. `tol` is
 * half a metre in the frame the spots are given in — the kit's metres for
 * a hull built in them, and a hull's own units for a shared-kind export
 * built in *its* frame, where the Submersible draws 95 m in 4.53 units and
 * half a unit is ten metres (#649).
 */
function refuseMirror(what, spots, tol = 0.5) {
  for (let i = 0; i < spots.length; i++)
    for (let j = i + 1; j < spots.length; j++) {
      const [, ax, ay, az] = spots[i];
      const [, bx, by, bz] = spots[j];
      if (Math.abs(ax - bx) < tol && Math.abs(ay - by) < tol && Math.abs(az + bz) < tol)
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
 * `spines` puts one spine off each plate — alternating sides from starboard,
 * alternating between the two `lengths`, all raked forward by `rake`, each
 * `offsets[0]` metres off the keel on the even plates and `offsets[1]` on the
 * odd — which is the regimented asymmetry the navy is built on. Two constant
 * offsets rather than a fraction of each plate's beam: the Dredge's stand 5 m
 * and 6 m out on plates that run from 17 m to 26 m of half-beam, so a spine
 * is not further out on a wider plate (#630 F5). Omit for a smooth back.
 *
 * `seam` shapes the `'seam'` lip: its centre `at` of the half-length forward
 * of the plate's, and its `size` as fractions of the plate's `[sx, sy, sz]`.
 * The defaults are the Chorister's seam as its approved binary carries it.
 * The Precentor's approved plates carry a heavier one — 0.35 long at 0.8,
 * and 0.7 of the *half-beam* tall, which on plates drawn 0.65 of their
 * half-beam tall is 14/13 of the plate's height: a lip that stands a little
 * proud of its plate above and below rather than shading under the plate
 * ahead — and the hull passes it (#638).
 *
 * A station is the orb's *scale*, not its bounding box. A low-facet sphere
 * never reaches its radius on every axis — an `orb(14, 7)` stops at 0.975 of
 * sx and 0.950 of sz — so a station read off a box is a few percent short,
 * and every fraction hung on it then comes out a few percent long (#630,
 * the second pass).
 */
export function tergites(root, { violet, red, black }, opts) {
  const { segments, lip = 'seam', seam = {}, spines, facets = [12, 6] } = opts;
  const { at: seamAt = 0.85, size: seamSize = [0.3, 0.95, 0.9] } = seam;
  segments.forEach(([x, sx, sy, sz], i) => {
    add(root, `tergite_${i}`, orb(...facets), i % 2 ? red : violet, [x, 0, 0], [0, 0, 0], [sx, sy, sz]);
    if (lip === 'seam')
      add(root, `tergite_seam_${i}`, orb(10, 6), black, [x + seamAt * sx, 0, 0], [0, 0, 0], [
        seamSize[0] * sx,
        seamSize[1] * sy,
        seamSize[2] * sz,
      ]);
    else if (lip === 'ridge')
      add(root, `tergite_ridge_${i}`, orb(10, 6), black, [x - 0.75 * sx, 0.5, 0], [0, 0, 0], [
        0.25 * sx,
        1.125 * sy,
        0.92 * sz,
      ]);
    if (spines) {
      const { lengths = [7, 10], r = 1.2, rake = -0.3, offsets = [5, 6] } = spines;
      const sgn = i % 2 ? -1 : 1;
      add(root, `tergite_spine_${i}`, spike(r, lengths[i % lengths.length]), black, [
        x + 2,
        sy + 2,
        sgn * offsets[i % offsets.length],
      ], [0, 0, rake]);
    }
  });
}

/** The rostrum: a faceted cone ahead of the first plate, apex at `tip`. */
export function rostrum(root, red, { tip, r, length, facets = 6 }) {
  add(root, 'rostrum', spike(r, length, facets), red, [tip - length / 2, 0, 0], [0, 0, -Math.PI / 2]);
}

/**
 * The telson: a cone astern with its base ring at `tip` — the sternmost
 * point of the hull — and its apex `length` forward, buried in the last
 * plate, so the stern is a blunt transom `2r` across; and the pair of tail
 * spines off it, each centred at `[x, y, ±z]` with its base aft and outboard
 * and its point forward and inboard, `splay` radians off the keel.
 *
 * Both cones go base-aft, point-forward: `cyl(0, r, …)` puts the apex at +X
 * after the −π/2 roll, as `rostrum` does. The first transcription had both
 * the other way round — the point at the stern — and every gate passed,
 * because a cone's bounding box is the same end for end; the approved Dredge
 * and Precentor both draw them this way (#630, beyond F1–F5).
 */
export function telson(root, { violet, black }, opts) {
  const { tip, r, length, facets = 6, tailSpines } = opts;
  add(root, 'telson', cyl(0, r, length, facets), violet, [tip + length / 2, 0, 0], [0, 0, -Math.PI / 2]);
  if (tailSpines) {
    const { x, y = 1, z, r: sr, length: sl, splay = 0.4 } = tailSpines;
    bothSides((side, sgn) =>
      add(root, `tail_spine_${side}`, cyl(0, sr, sl, 5), black, [x, y, sgn * z], [0, sgn * splay, -Math.PI / 2])
    );
  }
}

/**
 * Walking limbs, folded under the flanks: two ranks of `weld_steel` legs at
 * `xs`, athwartships and folded down by `fold` radians. Matched ranks are
 * this navy's regimentation, and the one place a mirrored pair is the rule.
 *
 * `r` is one radius or `[root, tip]`: the Precentor's approved limbs taper
 * from 0.7 m at the flank to 0.5 m at the tip over 7 m (#638) — a taper a
 * bounding box cannot show, as `claw` says of the Dredge's; the first port
 * matched their boxes to the centimetre with a straight 6.9 m leg at a
 * shallower fold and a sixth more surface. The tip is the cylinder's +Y end,
 * and the same Euler folds it forward and outboard to starboard but aft and
 * *inboard* to port, so the approved model's port roots stand outboard; a
 * port reproduces that.
 */
export function limbs(root, steel, { xs, y, z, r = 0.6, length = 6, fold = 0.45 }) {
  const [rootR, tipR] = Array.isArray(r) ? r : [r, r];
  bothSides((side, sgn) =>
    xs.forEach((x, i) =>
      add(root, `limb_${side}${i}`, cyl(tipR, rootR, length, 6), steel, [x, y, sgn * z], [
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
 * `facets` is the cone's cut: both approved hulls with a dorsal rank, the
 * Precentor and the Chorister, cut theirs five-sided, and the Precentor
 * passes 5 with its own rake of 0.35 (#638).
 */
export function dorsalSpines(root, black, { spines, r = 0.7, rake = -0.3, facets = 6 }) {
  refuseMirror('dorsal_spine', spines.map((s, i) => [i, ...s]));
  spines.forEach(([x, y, z, length], i) =>
    add(root, `dorsal_spine_${i}`, spike(r, length, facets), black, [x, y, z], [0, 0, rake])
  );
}

/**
 * Photophores: flat crimson boxes, one each at `[name, x, y, z]`, on an
 * upward face. A mirrored pair is refused — a pattern that repeats on
 * neither side is the Block 2 rule, and the Chorister's four-and-one is it.
 */
export function photophores(root, crimson, { spots, size = 1.1, h = 0.4, depth, yaw = 0 }) {
  refuseMirror('photophore', spots);
  spots.forEach(([name, x, y, z]) =>
    add(root, name, box(size, h, depth ?? size), crimson, [x, y, z], [0, yaw, 0])
  );
}

/**
 * The Dredge's rule for a lit carapace: a rank of photophores along every
 * plate's edge, each rank starting `start` of the plate's half-length from
 * its centre and running aft-to-forward at `pitch` of it, sitting at `y` of
 * the plate's height and `z` of its beam — on the shell where it faces up.
 * Starboard carries `starboard.count` on every plate; port `port.count` on
 * every `port.every`-th plate only. Regimented, and never symmetric.
 */
export function plateEdgePhotophores(root, crimson, opts) {
  const {
    segments,
    starboard = { count: 3, start: -0.5, pitch: 0.45 },
    port = { count: 2, start: -0.3, pitch: 0.55, every: 2 },
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
    rank('s', 1, starboard);
    if (i % (port.every ?? 1) === 0) rank('p', -1, port);
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
 *
 * `ry` is the dome's half-height in metres in place of `r · squash`, and
 * `aft.ry` the aft dome's; `studs.radius` and `studs.lift` place the ring
 * in metres — out from the dome's centre and up from it — in place of the
 * fractions, and `studs.facets` is the spines' cut. The Precentor's
 * approved dome is 5.5 m by 4.2 m with six five-sided spines 3.2 m out and
 * 3.4 m up, and its aft dome 2.6 m by 2.2 m: typed numbers, not fractions
 * of anything, and the hull passes them (#638).
 */
export function listeningDome(root, { red, violet, black }, opts) {
  const { x, y, z = 0, r, squash = 0.76, ry = r * squash, studs = {}, aft } = opts;
  const { count = 6, ring = 0.58, height = 0.81, tilt = 0.5, length = 3.2, r: sr = 0.5, phase = 0.4 } = studs;
  const { facets = 6, radius = r * ring, lift = ry * height } = studs;
  add(root, 'dome', orb(14, 7), red, [x, y, z], [0, 0, 0], [r, ry, r]);
  for (let i = 0; i < count; i++) {
    const a = phase + (i * 2 * Math.PI) / count;
    add(root, `dome_spine_${i}`, spike(sr, length, facets), black, [
      x + radius * Math.cos(a),
      y + lift,
      z + radius * Math.sin(a),
    ], [tilt * Math.sin(a), 0, -tilt * Math.cos(a)]);
  }
  if (aft)
    add(root, 'dome_aft', orb(10, 6), violet, [aft.x, aft.y, aft.z], [0, 0, 0], [
      aft.r,
      aft.ry ?? aft.r * 0.85,
      aft.r,
    ]);
}

/**
 * The hydrophone array athwartships: a boom across the beam at `[x, y]`
 * with a sleeve where it passes the body, a rank of hydrophone spines each
 * side stepping outward at `pitch` — alternating between the two `lengths`,
 * each in its socket, canted outward — and a tip spike at each end. `port`
 * and `starboard` are the rank sizes and must differ: the Precentor's
 * starboard rank is one longer (its block says port; #642), and a hull whose
 * ranks match is not this navy's.
 *
 * The tip spike stands *beyond* `halfSpan` rather than straddling it, so the
 * array's span is the boom plus both tips: the Precentor's 36 m boom and its
 * two 4 m spikes are the 44 m the prompt block calls for, and seating the
 * spikes on the boom's end instead would cost the hull 4 m of beam — enough
 * to move a plan outline, on a hull whose plan is a cross.
 *
 * `seat` lifts the hydrophones' centres above the boom's axis, in metres,
 * alternating as `lengths` do, in place of the socket's height plus half
 * the spine; `socket` is `'drum'` or `'box'`; `sleeveR` is the sleeve's
 * radius in place of `r · 1.46`. The Precentor's approved rank sits at 3 m
 * and 3.7 m — the short spine's base on the boom's axis, the long one's
 * 5 cm under it — in 1.6 m square boxes 1.2 m tall, round a sleeve of
 * exactly 1.9, which 1.46 transcribed 2 mm short; the hull passes all three
 * (#638).
 */
export function arrayBoom(root, { steel, black, red }, opts) {
  const { x, y, halfSpan, r = 1.3, starboard = 6, port = 5, z0 = 5, pitch = 2.6 } = opts;
  const { lengths = [6, 7.5], hr = 0.9, cant = 0.25, tip = 4, seat, socket = 'drum' } = opts;
  const { sleeveR = r * 1.46 } = opts;
  if (port === starboard)
    throw new Error(`array_boom: ${port} hydrophones a side — the ranks never match`);
  add(root, 'array_boom', cyl(r, r, halfSpan * 2, 8), steel, [x, y, 0], [Math.PI / 2, 0, 0]);
  add(root, 'array_boom_sleeve', cyl(sleeveR, sleeveR, 6, 8), black, [x, y, 0], [Math.PI / 2, 0, 0]);
  bothSides((side, sgn) => {
    const count = sgn > 0 ? starboard : port;
    for (let j = 0; j < count; j++) {
      const len = lengths[j % lengths.length];
      const z = sgn * (z0 + pitch * j);
      const lift = seat ? y + seat[j % seat.length] : y + 0.9 + len / 2;
      add(root, `hydrophone_${side}${j}`, spike(hr, len), red, [x, lift, z], [
        sgn * cant,
        0,
        0.15,
      ]);
      add(
        root,
        `hydrophone_socket_${side}${j}`,
        socket === 'box' ? box(1.6, 1.2, 1.6) : cyl(0.8, 0.8, 1.2, 6),
        steel,
        [x, y + 0.9, z]
      );
    }
    add(root, `boom_tip_${side}`, spike(r, tip), black, [x, y, sgn * (halfSpan + tip / 2)], [
      sgn * Math.PI / 2,
      0,
      0,
    ]);
  });
}

/**
 * The spine-gun: one short barrel off the centreline, on its mount.
 *
 * `r` is one radius or `[breech, muzzle]`: the approved Chorister's barrel
 * tapers from 0.7 m at the breech to 0.5 m at the muzzle over 9 m, as its
 * limbs taper (`limbs` above), and a straight barrel matches its box and
 * not its shape. `mount` places the mount block by its own `x`, `y`, `z`
 * where given, in place of the rule — half the barrel aft of the barrel's
 * centre, 0.2 m under it — which the Chorister's approved file does not
 * follow: its mount sits at x = 15 under a barrel centred at 20, 0.5 m
 * further aft than the rule puts it (#649).
 */
export function spineGun(root, { steel, black }, { x, y, z, r = 0.7, length = 9, mount = {} }) {
  const [breech, muzzle] = Array.isArray(r) ? r : [r, r];
  add(root, 'spine_gun', cyl(muzzle, breech, length, 6), steel, [x, y, z], [0, 0, -Math.PI / 2]);
  const { x: mx = x - length / 2, y: my = y - 0.2, z: mz = z } = mount;
  add(root, 'spine_gun_mount', box(2.4, 1.6, 2), black, [mx, my, mz]);
}

/**
 * The scoop bow: a plate from a plan outline with a steel lip over it, a
 * mandible each side converging on the tip, and the gullet — a lit patch
 * lying flat in the scoop's mouth, which is the loud thing on the Dredge.
 *
 * `bevel` chamfers the scoop's rim (kit.mjs `plan`), which the Dredge's has and
 * its lip does not: a mouth that eats the seabed is rounded where it meets it,
 * and the lip over it is sheet steel with an edge.
 */
export function scoopBow(root, { red, steel, black, gullet }, opts) {
  const { outline, y, depth, bevel = 0, lip, mandibles, gullet: g } = opts;
  add(root, 'scoop', plan(outline, depth, bevel), red, [0, y, 0]);
  if (lip) add(root, 'scoop_lip', plan(lip.outline, lip.depth, lip.bevel ?? 0), steel, [0, lip.y, 0]);
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
 * One great folded claw off one beam: an arm along the hull from `x`, a
 * forearm folded `fore.bend` radians *inboard* — back in toward the keel —
 * off its end, and two tips off the forearm's end closing on each other:
 * `tips.a` on the outboard side turning in by `close`, `tips.b` on the
 * inboard side turning out (a negative `close`), each a cone with its point
 * forward. `side` is 'p' or 's' and there is no pair — the Dredge's is to
 * port (its block says starboard; #642).
 *
 * The arm is placed from `x`; the forearm and both tips are placed by their
 * centres, `at`, because that is how the approved model placed them: no rule
 * off the arm's length and the bend lands the forearm on (36, 2, −29), and
 * the one the first transcription derived did not (#630 F3). That one also
 * folded the forearm *outboard* by the same 0.25 rad — its comment said
 * inboard; the sign said otherwise — which made the forearm the widest thing
 * on the hull and grew the beam by a metre, and it pointed both tips aft.
 * The fold's direction and the tips' are what this builder holds; every
 * number is the hull's.
 *
 * `arm.r` and `fore.r` are `[root, end]`: both limbs *taper* toward the tips
 * — the Dredge's arm from 2.4 m to 1.8 m, its forearm from 1.8 m to 1.4 m —
 * which a bounding box cannot show, since only the fat end reaches it, and
 * which the first transcription did not carry. A scalar is a straight limb.
 */
export function claw(root, { steel, black }, opts) {
  const { side = 'p', x, y = 1, z, arm, fore, tips } = opts;
  const sgn = side === 'p' ? -1 : 1;
  // A cylinder is born along Y with `rTop` at +Y; rolled onto X, +Y is the
  // far end, and a yaw about Y turns that end toward −Z. Inboard is +Z to
  // port and −Z to starboard, so `inboard` radians toward the keel is a yaw
  // of `sgn · inboard`.
  const turn = (inboard) => [0, sgn * inboard, -Math.PI / 2];
  const limb = (r, length) => {
    const [root, end] = Array.isArray(r) ? r : [r, r];
    return cyl(end, root, length, 8);
  };
  add(root, 'claw_arm', limb(arm.r, arm.length), steel, [x + arm.length / 2, y, z], turn(0));
  add(root, 'claw_forearm', limb(fore.r, fore.length), steel, fore.at, turn(fore.bend));
  add(root, 'claw_tip_a', spike(tips.a.r, tips.a.length, 5), black, tips.a.at, turn(tips.a.close));
  add(root, 'claw_tip_b', spike(tips.b.r, tips.b.length, 5), black, tips.b.at, turn(tips.b.close));
}

/** The dredge boom off the other beam: a spar along the hull with teeth stepped along it. */
export function dredgeBoom(root, { steel, black }, opts) {
  const { side = 's', x, y = 0.5, z, r = 1.2, length = 30, teeth = 3 } = opts;
  const sgn = side === 'p' ? -1 : 1;
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
 * The structure palette: what a turret needs that no hull did.
 *
 * A Sentinel Turret is "nearly black — an ambush predator, navigation marks
 * only until it fires" (docs/asset-prompts-3d.md, the Sentinel Turret block),
 * and `chitin_red` at #7A1B2E is not that. The structures carry
 * their own names rather than a shared dimming factor applied to `ink` — see
 * `structureInk` in factions/hadron.mjs for the argument. The values are the
 * approved turret's own — including two that share a *name* with the hull
 * palette's and not its value: the turret's `weld_steel` is #27313B where the
 * Dredge's is #3A3F4A, and its `biolight_crimson` sits on a #2C0A12 base
 * where the Dredge's is #1A0810. A part is compared by its material's name,
 * but the conn view renders its finish, so the turret cites its own file.
 * `biolightCrimson` takes the emissive strength a file carries: the approved
 * turret's lamp burns at 0.905 (`KHR_materials_emissive_strength`), which the
 * bake multiplies in (hull-intake's page.html); the default is full strength.
 */
export const structureInk = {
  chitinRedDark: () => clad('chitin_red_dark', hex('#4E1220'), 0.14, 0.55),
  weldSteel: () => clad('weld_steel', hex('#27313B'), 0.38, 0.44),
  biolightCrimson: (intensity = 1) =>
    lamp('biolight_crimson', hex('#C2465E'), hex('#2C0A12'), 0.4, intensity),
};

/**
 * The exchanger on the end of a Vent Tap's draw arm, on `bearing` (#608),
 * grown as a carapace: a squashed orb in `skin`, the dark seam orb where it
 * meets the pipe, three spines raked off its back, four photophores lying on
 * it, and the claw that grips the ground beyond. The script passes `skin`
 * violet on the even arms and red on the odd, as the tergites alternate
 * along a hull. Distances are metres out along the bearing, as the kit's
 * `ventDrawArm` takes them.
 *
 * Three things are the approved file's and are carried across rather than
 * corrected (#540): the spines rake toward *global* +x on every arm, not out
 * along their own; the spines and the photophores stagger either side of
 * their rank in global z; and three of the four photophores lie under the
 * shell of the carapace or its seam, where the top-down bake has never seen
 * them. `exportGlb`'s light audit names them on every arm. The photophores
 * are `photophores` below, yawed with the arm, so the no-mirrored-pair rule
 * holds on the tap as it does on a hull.
 */
export function carapaceHead(root, { skin, black, steel, crimson }, opts) {
  const { bearing: a, at, carapace, seam, spines, photophores: rank, claw } = opts;
  add(root, 'carapace', scute(12, 6), skin, polar(a, at, carapace.y), [0, -a, 0], carapace.r);
  add(root, 'carapace_seam', scute(8, 6), black, polar(a, seam.at, seam.y), [0, -a, 0], seam.r);
  spines.lengths.forEach((length, i) => {
    const [x, y, z] = polar(a, at + (spines.from + spines.pitch * i), spines.y);
    add(root, `spine_${i}`, spike(spines.r, length, 5), black, [x, y, z + spines.stagger[i]], [
      0,
      0,
      spines.rake,
    ]);
  });
  photophores(root, crimson, {
    size: rank.size,
    h: rank.h,
    yaw: -a,
    spots: rank.ys.map((y, i) => {
      const [x, , z] = polar(a, at + (rank.from + rank.pitch * i), y);
      return [`photophore_${i}`, x, y, z + (i % 2 ? rank.stagger : -rank.stagger)];
    }),
  });
  // Laid along the arm as the draw pipe is, then raised `claw.raise` radians
  // toward vertical: the approved file's lean is π/2 − 0.8 to the bit.
  add(root, 'anchor_claw', spike(claw.r, claw.length, 5), steel, polar(a, claw.at, claw.y), [
    0,
    -a,
    claw.raise - Math.PI / 2,
  ]);
}

/** A carapace plate: a low-facet orb the caller squashes and lays on the mound. */
const scute = (w = 10, h = 6) => new THREE.SphereGeometry(1, w, h);

/**
 * A carapace shell: an orb of `r` and `facets` [round, down] that may stop
 * short of a full turn (`round`, the fraction of one it goes round) or short
 * of the bottom pole (`down`, the fraction of a half-turn it comes down from
 * the crown). The approved turret's mound is an orb cut off 0.42 of the way
 * down; its brow a shell open 0.55 of a turn and 0.48 deep. `scute` above is
 * the closed unit case.
 */
const shell = (r, [w, h], { round = 1, down = 1 } = {}) =>
  new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2 * round, 0, Math.PI * down);

/**
 * The mound: a chitinous dome, the collar the head turns in, and the skirt
 * where the dome meets the ground.
 *
 * As the approved turret draws it — `mound`, `collar` and `skirt`, each with
 * its own numbers and its `drawn` placement, built in the file's order
 * (mound, collar, skirt): the mound a `shell` of radius `r` cut `down` of the
 * way to the pole, the collar and the skirt toruses of `R` and `tube` with
 * `facets` [radial, tubular].
 */
export function carapaceMound(root, { violet, black, steel }, { mound, collar, skirt }) {
  part(root, 'base_mound', shell(mound.r, mound.facets, mound), violet, mound);
  part(root, 'base_collar', torus(collar.R, collar.tube, ...collar.facets), steel, collar);
  part(root, 'mound_skirt', torus(skirt.R, skirt.tube, ...skirt.facets), black, skirt);
}

/**
 * Scutes plated round the mound, alternating through `skins`. The rank is
 * regular in rule and never regular in result — the sizes are the plates'
 * own.
 *
 * As the approved turret draws them: an orb each of its own `r` and the
 * shared `facets`, squashed to a plate and laid on the flank by its own node
 * (`drawn`, with the plate's scale) — yawed near its bearing, pitched down the
 * slope and rolled a little, each its own way.
 */
export function baseScutes(root, skins, { scutes, facets = [7, 5] }) {
  scutes.forEach((s, i) =>
    part(root, `base_scute_${i}`, shell(s.r, facets), skins[i % skins.length], s)
  );
}

/**
 * The head: a pod that trains, the brow shelved over it, the antennae raked
 * off the brow, and the counter-spike that balances the stinger astern.
 *
 * As the approved turret draws it, the head is a frame of its own — the
 * file's `turret_head` node, trained 0.3 rad off the mound's axis — and every
 * part carries its numbers in that frame: `pod` an orb of `r` and `facets`,
 * `brow` a `shell` open `round` of a turn and `down` deep, `antennae` cones
 * `r` at the foot and `length` tall, each by its own node. The placement at
 * the top of `opts` is the frame's (kit.mjs `group`), and the frame is
 * returned so the stinger can be grown in it, as the file hangs
 * `barrel_group` off `turret_head`; the counter-spike is `counterSpike`
 * below, because the file grows it *after* the stinger and the order is part
 * of what the model is (check.mjs compares in order).
 */
export function browHead(root, { red, black, violet }, opts) {
  const head = group(root, 'turret_head', opts);
  const { pod, brow, antennae } = opts;
  part(head, 'head_pod', shell(pod.r, pod.facets), red, pod);
  part(head, 'head_brow', shell(brow.r, brow.facets, brow), black, brow);
  antennae.forEach((a, i) =>
    part(head, `brow_antenna_${i}`, spike(a.r, a.length, a.facets ?? 4), violet, a)
  );
  return head;
}

/**
 * The counter-spike on the head's frame, as the approved turret draws it: a
 * cone `r` at the foot and `length` tall with `facets` sides, laid by its own
 * node — pitched back 1.9 rad and yawed 0.5 in the file. Its own builder
 * rather than a line of `browHead`, because the file grows it after the
 * stinger.
 */
export function counterSpike(head, violet, opts) {
  part(head, 'counter_spike', spike(opts.r, opts.length, opts.facets ?? 5), violet, opts);
}

/**
 * The gun as a stinger: `segments` tapering along the run from `from` to
 * `to`, each barbed on its upper shoulder, closing on the tip and its one
 * lit pip.
 *
 * Segmented rather than lathed, for the reason the tergites are: a carapace
 * is plates, and the seams between them are the shape.
 *
 * As the approved turret draws it, the stinger is a frame off the head — the
 * file's `barrel_group`, placed by the top of `opts` — and `segments` is the
 * list of them: each a frustum of `radii` [tip end, root end], `length` and
 * `facets` at its own station up the frame's Y, alternating steel and violet
 * from the root, with its `barb` — a torus of `R`, `tube` and `facets` — at
 * its foot; then `tip`, a cone, and `pip`, an orb.
 */
export function stingerBarrel(root, { steel, violet, black, pip }, opts) {
  const g = group(root, 'barrel_group', opts);
  opts.segments.forEach(({ barb, ...s }, i) => {
    const skin = i % 2 ? violet : steel;
    part(g, `barrel_seg_${i}`, cyl(s.radii[0], s.radii[1], s.length, s.facets), skin, s);
    part(g, `barrel_barb_${i}`, torus(barb.R, barb.tube, ...barb.facets), black, barb);
  });
  const { tip, pip: pp } = opts;
  part(g, 'stinger_tip', spike(tip.r, tip.length, tip.facets), black, tip);
  part(g, 'muzzle_pip', new THREE.SphereGeometry(pp.r, ...pp.facets), pip, pp);
  return g;
}

/**
 * Claw grips on the seabed. The `index` is given rather than counted because
 * the approved turret's rank runs 0, 1, 2, 4, 5 — a gap where a claw was never
 * grown, and "asymmetric, yet regimented" is exactly what a rank with a hole
 * in it is.
 *
 * As the approved turret draws them: a cone each, `r` at the foot and
 * `length` tall with `facets` sides, laid by its own node so that its point
 * rises out and up from a base near the mound. Skins alternate by the claw's
 * *number*, so the gap leaves 4 red beside 5 black — the file's rule, which a
 * count along the list gets the other way round.
 */
export function clawGrips(root, skins, { grips, facets = 5 }) {
  grips.forEach((c) =>
    part(root, `claw_grip_${c.index}`, spike(c.r, c.length, facets), skins[c.index % skins.length], c)
  );
}

/**
 * The magazine on one flank, its feed, and the flange into the collar.
 *
 * As the approved turret draws it, in the file's order — `pipe`, `pod`,
 * `flange`: the feed a straight frustum of `radii`, `length` and `facets`,
 * leaned by its node; the pod a capsule (kit.mjs `capsule`, `facets` [cap,
 * radial]); the flange a torus.
 */
export function magazine(root, { steel, red }, { pipe, pod, flange }) {
  part(root, 'feed_pipe', cyl(pipe.radii[0], pipe.radii[1], pipe.length, pipe.facets), steel, pipe);
  part(root, 'ammo_pod', capsule(pod.r, pod.length, ...pod.facets), steel, pod);
  part(root, 'feed_flange', torus(flange.R, flange.tube, ...flange.facets), red, flange);
}

/* --------------------------------------------------------------------------
 * Shared kinds. The Light Scout is the first of the six kinds every navy
 * models (#588, off #540 Phase 3), and the Directorate's is a carapace of
 * boxes rather than orbs: five butted plates each with a red trailing lip, a
 * squared wedge for a rostrum, two eyes of different sizes, two antennae
 * raked back off their sockets, two folded limbs, two dorsal ridges, a keel,
 * two tail plates, a four-bladed telson and its spike, and three photophore
 * domes that are its whole resting light — nothing on it mirrored. The
 * builders take the approved export's own numbers (kit.mjs `drawn`);
 * hulls/light-scout-pelagia.mjs states the scale decision the shared kinds
 * follow.
 * ------------------------------------------------------------------------ */

/**
 * The Light Scout's palette: an earlier authoring pass than the Dredge's,
 * naming the tokens as docs/art-direction.md names them — bruise violet,
 * abyssal red, trench chitin — with its own finish, and a photophore that is
 * the crimson token through and through, burning at 2.6. Values are the
 * approved export's own; the names are what the model *is* and stay.
 *
 * The Corvette, the Harvester and the Cruiser carry the same four names
 * and finishes, and only the photophore's strength differs — 2.6, 2.4 and
 * 6 (`KHR_materials_emissive_strength`; the bake caps it at 1, so it moves
 * nothing on a map): `redPhotophore` takes the figure a file carries, as
 * `structureInk.biolightCrimson` does, and the scout's 2.6 stays the
 * default (#649).
 */
export const scoutInk = {
  bruiseViolet: () => clad('bruise_violet', hex('#2D1B3D'), 0.15, 0.5),
  abyssalRed: () => clad('abyssal_red', hex('#7A1B2E'), 0.12, 0.48),
  trenchChitin: () => clad('trench_chitin', hex('#0A0710'), 0.18, 0.42),
  redPhotophore: (intensity = 2.6) =>
    lamp('red_photophore', hex('#C2465E'), hex('#C2465E'), 0.4, intensity),
};

/**
 * Plate segments: the scout's carapace, boxes butted along the keel, each
 * in its own `skin` and each trailed by a red lip — a thin box `lip.ratio`
 * of the plate's width and height, `lip.thickness` thick, set `lip.inset`
 * inside the plate's forward face and `lip.lift` above its axis, leaned
 * with the plate it belongs to. One-based and interleaved, seg_1,
 * seg_1_edge, seg_2 …, as the export numbers them; `tergites` above is the
 * Dredge's orb series and this is not it.
 *
 * The same series is every plated back on the shared kinds (#649), under
 * the export's own names: `name` is the plate's stem (the Corvette's
 * `carapace_1..5` and `tail_1..4`, the Cruiser's `plate_rank_0..7`), and
 * `first` its numbering. The lip is `${name}_${n}_edge` unless `lip.name`
 * gives it a stem of its own — the Harvester's `carapace_rim_0..4`, the
 * Cruiser's `plate_rim_0..7`. Those two carry the rim the other way: not a
 * fraction of the plate's height but a fixed `lip.height` (1 and 1.1),
 * seated `lip.seat` above the plate's *bottom* face rather than `lip.lift`
 * above its axis — a rim along the plate's lower edge where the scout's and
 * the Corvette's lip is a trailing face. Both rules are the files' own.
 */
export function plateSegments(root, lipMat, { name = 'seg', first = 1, lip, segments }) {
  segments.forEach(({ skin, size, ...placement }, i) => {
    const n = first + i;
    part(root, `${name}_${n}`, box(...size), skin, placement);
    const [x, y, z] = placement.at;
    const height = lip.height ?? size[1] * lip.ratio[1];
    const lift = lip.seat !== undefined ? lip.seat - size[1] / 2 : lip.lift;
    part(
      root,
      lip.name ? `${lip.name}_${n}` : `${name}_${n}_edge`,
      box(size[0] * lip.ratio[0], height, lip.thickness),
      lipMat,
      {
        ...placement,
        at: [x + size[2] / 2 - lip.inset, y + lift, z],
      }
    );
  });
}

/**
 * A wedge rostrum: a four-sided frustum stood on its corners, `radii` [tip,
 * base] along `length`, and squashed `squash` [x, y] in the geometry itself,
 * as the export has it — wider than it is tall, a beak rather than a spike.
 */
export function wedgeRostrum(root, mat, opts) {
  const { name = 'rostrum', radii, length, squash = [1, 1], ...placement } = opts;
  const geo = cyl(radii[0], radii[1], length, 4, Math.PI / 4).rotateX(Math.PI / 2);
  geo.scale(squash[0], squash[1], 1);
  return part(root, name, geo, mat, placement);
}

/** Eyes: low-facet orbs, `[name, r, placement]` each — two, of different sizes at different heights. */
export function eyes(root, mat, { eyes: list, facets = [6, 4] }) {
  list.forEach(([name, r, placement]) =>
    part(root, name, new THREE.SphereGeometry(r, ...facets), mat, placement)
  );
}

/**
 * Spikes: tapered cones, `radii` [tip, base] along `length` with `facets`
 * sides, each placed by its own node — the antennae (five-sided, raked back
 * off the head), the dorsal ridges (four-sided, leaned) and the telson's
 * spike. Drawn as the export drew them, tip up, and laid over by the node.
 */
export function spikes(root, mat, { spikes: list }) {
  list.forEach(({ name, radii, length, facets = 5, ...placement }) =>
    part(root, name, cyl(radii[0], radii[1], length, facets), mat, placement)
  );
}

/**
 * The telson fan: plates of one `size` at one point, each rolled its own way
 * about the tail so they fan rather than cross, alternating through `skins`
 * from `telson_0`. The spike astern of them is a `spikes` entry.
 */
export function telsonFan(root, skins, { name = 'telson', size, blades }) {
  const plate = box(...size);
  blades.forEach((placement, i) =>
    part(root, `${name}_${i}`, plate, skins[i % skins.length], placement)
  );
}

/**
 * Photophore domes: lit orbs of one radius, `[name, placement]` each, one
 * geometry shared — a head, one flank and the tail, three in a pattern that
 * repeats on neither side. A mirrored pair is refused, as `photophores`
 * refuses one.
 *
 * A dome given as `[name, r, placement]` is an orb of its own radius and
 * its own buffer, which is how the Submersible's ten photophores and the
 * Cruiser's seven light domes are drawn — the Cruiser's as unit orbs
 * squashed by their nodes, no two alike (#649). `tolerance` is
 * `refuseMirror`'s, in the frame the placements are in.
 */
export function photophoreDomes(root, light, { r = 0.32, facets = [8, 6], domes, tolerance }) {
  refuseMirror(
    'photophore_dome',
    domes.map((d) => [d[0], ...d[d.length - 1].at]),
    tolerance
  );
  const dome = new THREE.SphereGeometry(r, ...facets);
  domes.forEach((d) =>
    d.length === 3
      ? part(root, d[0], new THREE.SphereGeometry(d[1], ...facets), light, d[2])
      : part(root, d[0], dome, light, d[1])
  );
}

/* --------------------------------------------------------------------------
 * The other shared kinds (#649, off #540 Phase 3). The Corvette, the
 * Harvester, the Cruiser and the Abyssal Submersible are Z-long exports of
 * the same authoring pass as the Light Scout, drawn at four more arbitrary
 * scales (94.4, 81.0 and 146.3 units, and the Submersible's 4.55 for 95 m);
 * the Chorister is an X-long r169 export of the Dredge's pass and builds
 * from the hull vocabulary at the top of this module, with `spineGun` and
 * `bladderDome` — written for it and never before run — as its first
 * consumer. What the four add to the vocabulary is read off their node
 * names, as the scout's was:
 *
 *   Corvette     carapace_1..5 / _edge · ridge_0..4 · rostrum · rostrum_blade ·
 *                eye_p/s · antenna_p/s · limb_p/s_{shoulder,upper,forearm,claw} ·
 *                dart_p0..5 / s0..3 (+ _socket) · ventral_keel · keel_spur_a/b ·
 *                tail_1..4 / _edge · telson_0..4 · telson_spike ·
 *                photophore_p0..4 / s0..2 / tail
 *   Harvester    cargo_gut · gut_band_a..c · carapace_0..4 / carapace_rim_0..4 ·
 *                dorsal_dome · nub_0..3 · skirt_p0..3 / s0..2 (+ skirt_tip) ·
 *                mill_housing · mill_mouth · mill_tooth_0..5 ·
 *                claw_p/s_{shoulder,arm,hand,finger_up,finger_lo,tip,knuckle} ·
 *                tail_1 / _edge · tail_2..3 · paddle_0..3 · seam_strip_bow/mid/aft ·
 *                flank_strip_p/s · maw_bar · maw_ring · dome_bow/flank_p/tail
 *   Cruiser      body_core · plate_rank_0..7 / plate_rim_0..7 · dspike_p0..7 / s0..7 ·
 *                head_shield · head_crest · eye_p/s · antenna_fore/aft_p/s (+ _tip) ·
 *                whisker_fwd_p0..3 / aft_s0..4 (+ _tip) · dart_p0..6 / s0..4 ·
 *                ventral_keel · light_organ_strip · keel_spur_a/b · tail_1..3 / _edge ·
 *                telson_0..5 · telson_spike · light_band_p/s · band_rib_p/s0..2 ·
 *                dome_p0..3 / s0..2 · gill_p/s0..1 · photophore_head/tail
 *   Submersible  keel · carapace_1..5 / plate_rim_1..5 · head · rostrum ·
 *                mandible_port/starboard · spike_dorsal_1..4 · spike_flank_p1..3 /
 *                s1..2 · limb_port_1..4 / starboard_1..3 (_femur, _claw) ·
 *                tail_seg_1..4 / tail_joint_1..4 · telson_mid/port/starboard ·
 *                photophore_port_1..5 / starboard_1..3 / jaw / tail
 *
 * Every builder below takes the export's own numbers through kit.mjs
 * `drawn` and places the primitive as the file's node does; the rules they
 * hold — a limb's sizes scaled by side, a rim cut from its plate's radius,
 * a spike aimed at its lamp, a tooth's station round the mill — are the
 * files' own, read off them and checked by `diff.mjs` against them.
 * ------------------------------------------------------------------------ */

/**
 * The Abyssal Submersible's palette: its own four names, from the same
 * authoring pass as the scout's and finished its own way — a harder,
 * glossier chitin for the one PR-3 hull of the shared kinds (0.25 / 0.38
 * and 0.22 / 0.32 against the scout's 0.18 / 0.42 and 0.15 / 0.5), a
 * photophore polished to 0.35 and burning at 2.2, and `edge_red`, which is
 * a *lit cladding*: abyssal red with metalness 0.15 and its own colour as
 * emissive at 0.12 — the plate rims, the tail joints, the rostrum and the
 * limb claws all glow faintly. Values are the approved export's own; the
 * names are what the model is and stay (#649).
 */
export const submersibleInk = {
  chitinTrench: () => clad('chitin_trench', hex('#0A0710'), 0.25, 0.38),
  plateViolet: () => clad('plate_violet', hex('#2D1B3D'), 0.22, 0.32),
  edgeRed: () => {
    // `lamp` sets metalness 0; this one is a metal that glows.
    const m = clad('edge_red', hex('#7A1B2E'), 0.15, 0.42);
    m.emissive = new THREE.Color(...hex('#7A1B2E'));
    m.emissiveIntensity = 0.12;
    return m;
  },
  photophore: () => lamp('photophore', hex('#C2465E'), hex('#C2465E'), 0.35, 2.2),
};

/**
 * A jointed limb: the boxes and the one cone of a folded manipulator, each
 * placed by its own node under `prefix` — the Corvette's `limb_p` and
 * `limb_s` (shoulder, upper, forearm, claw) and the Harvester's `claw_p` and
 * `claw_s` (shoulder, arm, hand, finger_up, finger_lo, tip, knuckle), in
 * the file's order, cone wherever it falls. `scale` is the side's: both
 * hulls draw the two limbs from one set of base sizes, the port one larger
 * (the Corvette's 1.15 against 0.9, the Harvester's 1.2 against 0.95) —
 * asymmetric, yet regimented. A joint is `{ name, skin, size }` for a box
 * or `{ name, skin, r, length, facets }` for a cone; every dimension is
 * scaled but the cone's 0.02 point, which both files leave at 0.02 on both
 * sides. The placements are the file's own, not mirrored from one side.
 */
export function jointedLimb(root, { prefix, scale = 1, point = 0.02, joints }) {
  joints.forEach(({ name, skin, size, r, length, facets = 4, ...placement }) => {
    const geo = size
      ? box(...size.map((d) => d * scale))
      : cyl(point, r * scale, length * scale, facets);
    part(root, `${prefix}_${name}`, geo, skin, placement);
  });
}

/**
 * Darts: the torpedo hardpoints, "visible torpedo hardpoints" (the Corvette
 * block) — one tapered spar, `radii` [nose, tail] over `length` with
 * `facets` sides, shared by every dart and laid on its rank by its own
 * node, raked forward and canted outboard; with, where the hull mounts
 * them, a `socket` box under each, placed by its node in the file's
 * interleaved order (dart_p0, dart_p0_socket, dart_p1 …). Both hulls that
 * carry them rank more to port than to starboard: the Corvette six to four,
 * the Cruiser seven to five.
 */
export function darts(root, { dart: dartMat, socket: socketMat }, opts) {
  const { radii, length, facets = 6, socket, darts: list } = opts;
  const geo = cyl(radii[0], radii[1], length, facets);
  list.forEach(({ name, socket: socketAt, ...placement }) => {
    part(root, name, geo, dartMat, placement);
    if (socketAt) part(root, `${name}_socket`, box(...socket.size), socketMat, socketAt);
  });
}

/**
 * Photophore marks: the shared kinds' running lights as boxes rather than
 * domes — one box of `size` shared by every mark, `[name, placement]`
 * each, in a rank that repeats on neither side (the Corvette's five to
 * port against three to starboard). A mirrored pair is refused, as
 * `photophores` refuses one; `tolerance` is `refuseMirror`'s.
 */
export function photophoreMarks(root, light, { size, marks, tolerance }) {
  refuseMirror(
    'photophore',
    marks.map(([name, { at }]) => [name, ...at]),
    tolerance
  );
  const mark = box(...size);
  marks.forEach(([name, placement]) => part(root, name, mark, light, placement));
}

/**
 * Carapace orbs: plates that are orbs rather than boxes, each an orb of its
 * own `r` and the shared `facets`, squashed and leaned by its own node —
 * the Submersible's `carapace_1..5` (seven meridians, four stacks, scaled
 * 1.3 × 0.62 × 1.02) and its `tail_seg_1..4`, and the Harvester's
 * `cargo_gut`, one unit orb of ten by seven drawn 23 × 8.4 × 44 by its node.
 * `n` numbers the plate; a plate without one takes `name` alone.
 *
 * `rim` cuts a rim under each plate as the Submersible does: an *open*
 * frustum — no caps — `rim.h` tall with `rim.facets` sides, its radii
 * `rim.ratio` [forward, aft] of the plate's own radius, laid across the
 * keel by its node and named `${rim.name}_${n}`. The plate rims are 1.06
 * and 1.12 of their plate, nine-sided and 0.07 tall; the tail joints 0.92
 * and 0.98, eight-sided and 0.05 tall. `parts.mjs` reads them as an open
 * cylinder first and offers a 3 × 4 displaced orb second; the buffer has
 * two rows at ±h/2, the top at the smaller radius, and is the cylinder.
 */
export function carapaceOrbs(root, { skin, rim: rimMat }, opts) {
  const { name = 'carapace', facets = [7, 4], rim, plates } = opts;
  plates.forEach(({ n, r, rim: rimAt, ...placement }) => {
    part(
      root,
      n === undefined ? name : `${name}_${n}`,
      new THREE.SphereGeometry(r, ...facets),
      skin,
      placement
    );
    if (rim)
      part(
        root,
        `${rim.name}_${n}`,
        new THREE.CylinderGeometry(r * rim.ratio[0], r * rim.ratio[1], rim.h, rim.facets, 1, true),
        rimMat,
        rimAt
      );
  });
}

/**
 * Skirt plates: the Harvester's "external intake dredge gear" — a rank of
 * plates hung off each flank, each a box of one `size` in its own `skin`
 * (alternating violet and chitin down the rank), leaned outboard and down
 * by its node, with a four-sided `tip` spike off its outer edge, placed by
 * its own node; `skirt_${name}` and `skirt_tip_${name}`, interleaved as
 * the file has them. Four to port, three to starboard.
 */
export function skirtPlates(root, { tip: tipMat }, { size, tip, plates }) {
  plates.forEach(({ name, skin, tip: tipAt, ...placement }) => {
    part(root, `skirt_${name}`, box(...size), skin, placement);
    part(
      root,
      `skirt_tip_${name}`,
      cyl(tip.radii[0], tip.radii[1], tip.length, tip.facets ?? 4),
      tipMat,
      tipAt
    );
  });
}

/**
 * The mill: the Harvester's mining mouth at the bow — `housing`, a box;
 * `mouth`, a drum of `r` and `h` with `facets` sides stood on the housing's
 * face by its node; and `teeth`, `count` four-sided cones in a ring of
 * radius `r` about `at` in the export's bow plane, each at its station
 * `k · 2π / count` anticlockwise from +x, leaned back by `tilt` and rolled
 * to its station (an XYZ Euler of `[tilt, 0, −a]`) — which is the rule the
 * file's six teeth follow to the seventh decimal (mill_tooth_1 at
 * y = 5.2 + 1.7 · sin 60°). The maw's light is the hull's, laid over it.
 */
export function millMouth(root, mats, { housing, mouth, teeth }) {
  part(root, 'mill_housing', box(...housing.size), mats.housing, housing);
  part(root, 'mill_mouth', cyl(mouth.r, mouth.r, mouth.h, mouth.facets ?? 8), mats.mouth, mouth);
  const { count, r, at, tilt, radii, length, facets = 4 } = teeth;
  for (let k = 0; k < count; k++) {
    const a = (k * 2 * Math.PI) / count;
    part(
      root,
      `mill_tooth_${k}`,
      cyl(radii[0], radii[1], length, facets),
      mats.teeth,
      drawn([at[0] + r * Math.cos(a), at[1] + r * Math.sin(a), at[2]], [tilt, 0, -a])
    );
  }
}

/**
 * Drums: frusta that are not spikes — `radii` [top, bottom] over `length`
 * with `facets` sides, each placed by its own node. The Submersible's keel
 * (seven-sided, 0.26 to 0.2, squashed to 0.75 across by its node) and the
 * Harvester's `maw_ring`, the lit collar round the mill's mouth. `spikes`
 * above builds the same primitive; this is the name for one that is a
 * body rather than a point.
 */
export function drums(root, mat, { drums: list }) {
  list.forEach(({ name, radii, length, facets, ...placement }) =>
    part(root, name, cyl(radii[0], radii[1], length, facets), mat, placement)
  );
}

/**
 * Aimed spikes: the Cruiser's four antennae and nine whiskers — "prominent
 * sensor arrays and fixed hydrophone masts" — each a five-sided spike
 * `radii` [tip, root] run `from` a root on the carapace `to` the lamp at
 * its tip, and each carrying that lamp: `tip.name`, a cube of `tip.size` in
 * the light, at `to`.
 *
 * The file draws each one *aimed*: its node sits at the midpoint of root
 * and tip, its length is their distance (the antennae's 20.4424 and the
 * whiskers' 5.8386 are nothing anyone typed), and its rotation is the
 * minimal one taking +Y onto that direction — three's
 * `Quaternion.setFromUnitVectors`, which reproduces every one of the
 * thirteen Eulers the file carries to 6 × 10⁻⁸ rad (#649), where a look-at
 * does not. The roots are round numbers (antenna_fore_p from (5.2, 9.5,
 * 50)); a script holds root and tip, and the builder holds the rule. A
 * lamp given `buffer` shares the box of the named earlier lamp in the same
 * call, as `antenna_tip_as` shares `antenna_tip_fp`'s in the file; a spike
 * given its own `skin` wears it in place of the call's — the aft antennae
 * are chitin where the fore are violet, and the four are one call because
 * of that shared lamp.
 */
export function aimedSpikes(root, { spike: spikeMat, tip: tipMat }, { spikes: list }) {
  const tips = new Map();
  const up = new THREE.Vector3(0, 1, 0);
  list.forEach(({ name, skin = spikeMat, radii, facets = 5, from, to, tip }) => {
    const A = new THREE.Vector3(...from);
    const B = new THREE.Vector3(...to);
    const d = B.clone().sub(A);
    const q = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());
    const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
    const mid = A.clone().add(B).multiplyScalar(0.5).toArray();
    const placement = drawn(mid, [e.x, e.y, e.z]);
    part(root, name, cyl(radii[0], radii[1], d.length(), facets), skin, placement);
    if (tip) {
      const geo = tip.buffer ? tips.get(tip.buffer) : box(tip.size, tip.size, tip.size);
      tips.set(tip.name, geo);
      part(root, tip.name, geo, tipMat, drawn(to));
    }
  });
}

/**
 * Walking limbs: the Submersible's "folded manipulator limbs" — seven,
 * four to port and three to starboard, `limb_${side}_${n}`, each a femur
 * box and a claw box in `edge_red` so the claws glow faintly. One rule
 * places all seven, read off the file: the femur is `femur` [wide, thick]
 * by the limb's own `length`, at `at` in the export's frame, folded
 * `fold.femur` (pitched 0.35, rolled 1.15 outboard); the claw is `claw`
 * [wide, thick] by `clawRatio` of that length, `offset` outboard, down and
 * forward of the femur, folded `fold.claw` (pitched back 2.1, yawed 0.25
 * and rolled 0.35 outboard). Outboard is +x to port on this export, so a
 * starboard limb's roll, yaw and outboard offset change sign. The lengths
 * and the femur stations are each limb's own.
 */
export function walkingLimbs(root, { chitin, red }, opts) {
  const {
    femur = [0.07, 0.06],
    claw = [0.045, 0.04],
    clawRatio = 0.6,
    offset = [0.16, -0.08, 0.14],
    fold = { femur: [0.35, 1.15], claw: [-2.1, 0.25, 0.35] },
    limbs: list,
  } = opts;
  list.forEach(({ side, n, length, at: [x, y, z] }) => {
    const sgn = side === 'port' ? 1 : -1;
    part(
      root,
      `limb_${side}_${n}_femur`,
      box(femur[0], length, femur[1]),
      chitin,
      drawn([x, y, z], [fold.femur[0], 0, sgn * fold.femur[1]])
    );
    part(
      root,
      `limb_${side}_${n}_claw`,
      box(claw[0], length * clawRatio, claw[1]),
      red,
      drawn(
        [x + sgn * offset[0], y + offset[1], z + offset[2]],
        [fold.claw[0], sgn * fold.claw[1], sgn * fold.claw[2]]
      )
    );
  });
}

export { THREE };
