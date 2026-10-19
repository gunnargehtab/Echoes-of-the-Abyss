/**
 * The Lure, the Klaxon's — 100 m (docs/units.md, "The siege hulls"; the
 * Lure block of docs/asset-prompts-3d.md Block 3, read with the Bathyarch
 * FACTION block, #1441).
 *
 * "The song, 100 m — a PR-3 hull that sings for 60 s and doubles what
 * fauna hear from anything within 500 m of the point it sang at: the
 * Listening does not knock the wall down, it tells the Drift where the
 * wall is (SIG 14 idle, 24 cruise, 55 singing; no weapon; HYD 60; 560
 * hull; 40 m/s; 280 nodules and 50 Biomass). A segmented deep body,
 * ribbed and domed like the Verger's — a rostrum, three overlapping
 * tergites, a jointed abdomen, folded walking limbs, a ribbed pressure
 * keel — with the abdomen's last segment spread into a sounding fan: five
 * chitin plates opened wide astern, two a side about a telson, a file
 * ridge down the abdomen's back with a plectrum limb raised over it, and
 * a resonating bladder in the abdomen forward of the fan, showing through
 * the segment as a paler dome. The fan is an instrument and not a weapon
 * — nothing on it points and nothing on it fires — and the plan is a
 * rostrum forward and a fan astern, widest at the stern, where the sound
 * leaves it. The model is the hull with its fan spread and the plectrum
 * raised, which is the state it sings in; under way the plates fold into
 * a telson and the limb lies flat. Nearly black at rest, photophores in a
 * pattern that repeats on neither side; under way a dim row along each
 * tergite's edge; singing, sustained glow — the bladder's dome lit
 * through the shell and each plate of the fan lit along its rib — because
 * the song is the loudest thing this hull does, and it is still a band
 * short of a cutter."
 *
 * The Lure carries no faction lock — the Biomass is the lock, as the
 * Chorister's, the Acolyte's and the Thurible's are (the paragraph under
 * the block) — so the Klaxon fields it on the Chorister's rule: the same
 * plan, composed in the navy's shape language, with the light kept nearly
 * black. Said the Klaxon's way, as hulls/thurible-bathyarch.mjs says the
 * censer and hulls/verger-bathyarch.mjs the transport: the three tergites
 * three armoured slabs of plate lapped bow over stern — 26, 34 and 30 m
 * across, each 7 m deep between its bevels and stepped 0.8 m down from
 * the one ahead, so the plate behind tucks under the plate ahead — each
 * carrying a tier of the other finish on its back, grey on the black
 * slabs and the older black showing through on the grey; the rostrum a
 * bow block with the hazard stripe on it and the six-plate ram to the
 * bow; the abdomen four riveted pressure cans stepping down from the aft
 * slab's trailing edge, 6.2, 5.4, 4.6 and 3.8 m in radius, black and grey
 * by turns, each capped fore and aft in older plate so the caps cross at
 * the seams and five rivets along each crown but the dome's, which is
 * "jointed"; the sounding fan five hinged steel vanes opened wide astern,
 * two a side about a telson, each a square-ended trapezoid of plate with
 * a rib down it in the lamp family's unlit finish, a rivet row along each
 * edge, and on the four that fold a vertical hinge pin standing through
 * the vane where its axis clears the can, a knuckle of older plate on
 * each face round it; the file a toothed rack a metre to starboard down
 * the tail's back, a rail of newer plate on three pedestals with twelve
 * square teeth of hull black on it; the plectrum one jointed girder arm
 * off a bracket on the port flank of the first can, up and across the
 * keel to a wrist over the rail and a four-sided striker aimed down at
 * the teeth; the bladder a pressure dome of newer plate on a skirt, on
 * the third can, 1.6 m to starboard; three whip aerials standing off the
 * tiers alternating sides; three limbs a side folded under the slabs; the
 * ribbed pressure keel under the slabs alone; a skeg under the last can's
 * aft cap with the screw in its shroud; and the tiers dressed with the
 * stripe, four dogged hatches, patches of the other finishes, seams and
 * rivet rows along each tier's edge.
 *
 * Built metre-true at 100 m, the ram's point at +50 and the telson's
 * squared end at −50, with nothing to rescale (kit.mjs `metreTrue`).
 * Every part comes from `factions/bathyarch.mjs`; `slabSeries`,
 * `deckWhips`, `pressureDome`, `toothedRack`, `pickArm` and
 * `soundingVanes` were written for this hull there, beside the Thurible's
 * section, and `cans`, `ribbedKeel`, `foldedLimbs`, `rimLamps`,
 * `planHalfBeam`, `ramCone`, `tailScrew` and the panel builders are the
 * Thurible's and the Verger's with their defaults untouched. The whips
 * and the lamps are placed one side at a time at signed z, port −z
 * (#642), each builder refusing a mirrored pair; the limbs are the one
 * true pair and go through `bothSides` (§3.6), and the fan's two pairs are
 * the kind's licence, each vane placed on its own side at its own yaw.
 *
 * THE KIND'S DECISIONS, kept and translated (hulls/lure.mjs took them for
 * the Directorate; a variant keeps them, it does not retake them):
 *
 * - **Five vanes, the telson a plate, the pairs matched.** The telson 18
 *   m on the keel line from the fan's root at −32, 4 m wide at the root
 *   and 6.8 at the squared end at −50; the inner pair 17 m at 24° off the
 *   keel from 2.2 m either side of it, 4.4 to 8.4 m wide; the outer pair
 *   20 m at 60° from 3.6 m, a metre further forward, 4.8 to 9.6 m wide —
 *   the kind's lengths, yaws and widths, the kind's `paddle` straightened
 *   to a trapezoid with no chamfer (`vane`), since plate has corners. The
 *   three ranks stack at the root, telson over inner over outer — the
 *   telson at y 0.9, the inner pair at 0, the outer at −1.2, each 0.6 m
 *   thick — so no vane touches another and a rivet head or a knuckle on
 *   one clears the plate over it by 0.1 m: a vane that folds over its
 *   neighbour has clearance to. The outer vanes' aft corners stand 23.3 m
 *   off the keel at x −36.8: 46.6 m across, 11 m wider than the mid
 *   slab's bevelled rim (±17.8), which is "widest at the stern" by a
 *   margin the chart can read.
 *   Grey, black, grey from the telson.
 * - **The ribs are clad, not lit.** Each vane carries its rib — 0.7 m
 *   wide, 0.4 tall, to 0.92 of the vane's length — in `amber_lamp_unlit`,
 *   the lamp family's unlit finish, and no lamp (§3.2 rule 2). On the
 *   telson it runs from 0.08; on the four that fold it runs from just aft
 *   of the hinge knuckle, so the strap lies on plate.
 * - **The file is to starboard, −10 to −22, twelve teeth 0.8 m tall, its
 *   crest sloping with the tail.** A rail at z +1, its top 7.3 at −10 over
 *   the first can's crown at 6.04 and 6.5 at −22 over the second's at
 *   5.27 — the kind's 5.6 to 4.6 lifted onto cans a Klaxon crown stands
 *   higher on — on three pedestals at −11.5, −15.5 and −19.5, all on the
 *   first can, since the first can's aft cap covers the second's crown to
 *   −21.7. The teeth are square, a tooth to a metre, half a metre long:
 *   the kind's leaning teeth are chitin's, a rack's are cut.
 * - **The plectrum from port, crossing the keel, raised.** The hip bracket
 *   rooted 0.6 m into the first can's port flank at x −11, y 1.5 (z −5.42),
 *   the knee at (−13, 12.4, −4.5), the wrist at (−16.5, 11.1, 0) and the
 *   striker's point at (−17.6, 8.5, 1), 0.9 m over the teeth's top at
 *   7.6 there — the kind's stations, lifted 1.6 m with the rack. The
 *   tibia crosses the keel at x −13 to −16.5, ahead of every tail lamp.
 * - **The bladder on the second tail can from the stern, 1.6 m to
 *   starboard, paler.** A dome of iron grey drawn at 2.5 m of radius —
 *   cut six by three at the rule, so its widest ring is 2.5 · sin 60° =
 *   2.17 m and it reads 4.3 m across the keel and 3.75 athwart — on the
 *   black third can at x −31.95, its equator at y 4.0 and its top at 5.6,
 *   1.16 m proud of the crown, on a skirt of hull black of the same cut
 *   down to y 1.2 (the can's skin is at 2.1 under the dome's outboard
 *   rim); iron grey is the
 *   navy's palest cladding, which is what "paler" buys here where the
 *   Directorate's violet could not. Its 4.3 m of plan sits on the 5.1 m of
 *   that can's crown the cap ahead does not cover, which is why the can
 *   is 6.6 m long and the last 4.2; the can under it carries no crown rivets, as
 *   the Verger's turret can does not.
 * - **Three whips alternating sides** at the kind's stations and lengths:
 *   38 (3 m to port, 5 m), 21 (3.5 to starboard, 6.5), 4 (3.5 to port,
 *   5.5), raked 0.3 forward, each off a bracket on its tier.
 * - **Three limbs a side folded under the forward body**, hips at x 30, 18
 *   and 6 on brackets hung from the slabs' bellies — the mid's at −4.3
 *   and the aft's at −5.1, each bracket's top 0.3 m into its plate; the
 *   forward pair's bracket is hung from the fore slab's at −3.5 and sits
 *   in the corner of the lap, its top 1.1 m into the mid slab's nose,
 *   which still runs to x 30.8 at |z| ≤ 8 there — the limb's line at
 *   y −6.5, a thigh 4.5 m out swept 0.6 and a shin 3.5 folded on to 1.1, so
 *   the tips stand at x +35.7, +23.7, +11.7 and z ±10.8, ±19.1, ±18.5: 2
 *   m inside the fore slab's flank (12.8 at +35.7) at the forward pair, 3
 *   m past the mid slab's (16.1 at +23.7) at the second, and 1 m past it
 *   (17.5 at +11.7) at the third — the kind's two and three, less two at
 *   the after pair since its hips hang from a 15 m slab under a 17 m rim
 *   and a 3 m reach would set the bracket on the bevel. The hips are at
 *   z 5.5, 13.8 and 13.2.
 * - **The keel stops with the body.** A black drum 36 m from +31 to −5,
 *   3.2 m forward to 2.6 aft at y −5.7, its crown a metre into the fore
 *   slab's belly at −3.5 and 1.6 into the aft's at −5.1, six hoops of
 *   older plate round it. Not under the cans.
 * - **Ten lamps at the kind's ten stations and two pitches**, no two
 *   opposite: starboard +35, +20, +5 (15 m pitch) and −10.5, −17.5; port
 *   +37, +18.5, 0 (18.5 m) and −19, −27. The body's six are 1.4 m plates
 *   on the slabs' top faces at 0.7 of the half-beam, outboard of the
 *   tiers; the tail's four 1.1 m plates on the cans' shoulder facets at
 *   0.55 of the radius. Nothing else is lit: not the ribs, not the dome,
 *   not the rack, no bow lamp, and nothing astern.
 * - **Three edge rows built unlit.** A rank a side a slab at 0.93 of the
 *   half-beam, 0.9 m studs at 4 m pitch in the unlit finish, the port
 *   rank two metres behind the starboard and a stud shorter on the mid
 *   and aft slabs: fore 38..30 / 36..28, mid 24.5..12.5 / 22.5..14.5,
 *   aft 6..−2 / 4..0 — the kind's stations on the fore slab, a metre
 *   further aft on the aft slab and a metre and a half on the mid, where
 *   the kind's first stud (26 and 7) would lie against the lapped slab
 *   ahead: at 26 the fore slab's body reaches 13.0 of half-beam with its
 *   0.8 bevel where the stud sits at 12.1, and at 25 the stud's inboard
 *   corner at 12.57 met the chamfer's mitred corner at 12.58, a
 *   centimetre the sweep listed; at 24.5 it clears the body's corner by
 *   0.5 m and seats on the mid slab's top face.
 *
 * WHAT THE BLOCK DID NOT SAY — decided here:
 *
 * - **Three slabs, lapped, for three tergites.** The Thurible's one shield
 *   is the censer's "a broad domed carapace"; the Lure's "three
 *   overlapping tergites" is three. Each is a chamfered plan at the
 *   kind's half-beams — 13, 17, 15 — lapped by 5 m (fore 25..43, mid
 *   8..30, aft −10..13) at y +0.8, 0 and −0.8, and "domed" is the tier on
 *   each (the Thurible's reading), 2.5 m deep, the whole 13.4 m from the
 *   aft belly at −5.1 to the fore tier at 7.6. Every tier stops 2 m short
 *   of the lap ahead of it, so no tier runs into the slab above.
 * - **The cans narrow 0.8 m a seam**, 6.2 to 3.8, and lie end to end:
 *   −8.3..−20.5, −20.5..−27.9, −27.9..−34.5, −34.5..−38.7, the caps
 *   crossing at the seams and the last aft cap to −40.2, so 9.8 m of the
 *   telson show. The seams are where the tail lamps put them: a cap
 *   stands 1.5 m past its can's end and covers the next can's crown, so a
 *   lamp at −19 wants the first can to run past −19.55 and one at −27 the
 *   second past −27.55. The first can emerges from the aft slab's
 *   trailing face and top: a 6.2 m can on a slab 3.5 m to its top is
 *   "steps down sharply", in plate.
 * - **The hinges stand where the axis clears the can.** The inner vanes'
 *   pins 7 m down the axis (x −38.4, z ±5.05), the outer's 3 m (x −32.5,
 *   z ±6.2), 0.3 m in radius and standing 0.3 proud of each knuckle;
 *   knuckles 1.4 along the vane, 0.5 tall and 1.6 across, their inboard
 *   corners 0.3 and 0.6 m clear of the can. The outer knuckle's aft
 *   corner lies under the inner plate's edge in plan, which is why the
 *   outer pair sits 1.2 m under the inner and not 0.7: at 0.7 the strap
 *   rose into the plate above it. The telson does not fold — the four
 *   fold into it — and carries no pin.
 * - **A screw.** Every Klaxon hull swims by a screw and the kind's model
 *   names no drive, so one sits in its shroud under the telson's root on
 *   a skeg hung from the last can's aft cap, 1.8 m in radius, its after
 *   face at −43.9: under the fan, not on it, and dark.
 * - **The stripe runs down the mid tier** from +10 to +22 at z −0.5, and
 *   the bow stripe on the bow block.
 *
 * The light budget, measured (`lightAudit`, printed by `exportGlb`): ten
 * lit parts, 17.4 m² facing up — the body's six at 1.88 to 2.25 m² each
 * as the chart's four cells a metre read a 1.4 m square, the tail's four
 * at 1.0 to 1.25 on their facets — no lamp hidden, none floating. The
 * audit's own top-down raster reads 9,761 mask pixels at 2 px/m, some
 * 2,440 m²; the bake's mask, the one E is computed on, reads 10,114
 * (meta.json `maskPx`), some 2,530 m², since the bake draws the plates'
 * bevels and the audit's raster takes a cell by its centre (the
 * Directorate's bake reads 10,198). The intake bake at 100 m reads raw E
 * 6.27 against the target
 * E(14) = 1.22 and dims by ×0.195: the Verger's band (×0.195 at E(14)),
 * the Thurible's (×0.191 at E(16)) and the Directorate Lure's (×0.225),
 * and twelve times clear of the ×1/64 floor the quiet end must not touch
 * (§3.2). The bake is warning-free — no rescale, no rotate, 100.0 × 46.6
 * m. Six materials; 252 parts, 4,744 triangles; the file spans x −50 ..
 * 50, y −9.3 .. 13, z −23.3 .. 23.3.
 *
 * The sweep (contacts.mjs) reads 365 pairs and every one a mount: the
 * tiers on their slabs and each slab on the one it laps, the first can
 * and its fore cap through the aft slab's trailing face and tier, the
 * cans and caps crossing at the seams, the crown rivets on their cans,
 * the keel and its hoops in the three bellies, the whips through their
 * brackets into the tiers, each hip in the belly of the slab over its
 * station (the forward pair in the lap's corner, in both the fore and the
 * mid slab) and each bone rooted into the block at both ends, the rail on its pedestals with the teeth
 * on it, the arm's bracket and femur in the first can and each girder in
 * its block, the dome on its skirt in the third can (and in the wide end
 * of that can's own aft cap, which lies inside the can), the five vanes
 * with their ribs, rivets, pins and knuckles rooted through the third and
 * fourth cans and their caps, the skeg in the last cap with the shroud
 * and hub in it, the fittings on their plates. A first pass stacked the
 * vanes 0.7 m apart and the inner vanes' rivet heads and the outer
 * knuckles rose into the plates over them; the stack is 0.9, 0 and −1.2
 * now. A first pass also put the port tail lamp at −19 under the first
 * can's aft cap, and a knee block the size of the knee's coordinates over
 * it (`pickArm` took the joint for the block), which the audit found
 * hidden; the seams moved and the builder names its blocks.
 *
 * FACETS. Every ring asks the Klaxon's rule (bathyarch.mjs `cut`): the
 * cans and their caps fourteen, fourteen, twelve and ten; the keel eight
 * and its hoops ten by six; the ram eight; the dome six by three on a
 * skirt of six; the shroud, hub, whips, pins and hatch wheels six.
 * facets.mjs names the drums laid off Y by their length as a radius, as
 * the Thurible's are named, and reads the dome and skirt at a radius the
 * trim layout's split vertices give it, as it reads the Verger's turret;
 * the counts it reads are the rule's.
 *
 * PANELS. The Klaxon's band for a hull is 0.75–2 m on a side, the median
 * unlit part from above (bathyarch.mjs `panels`): this file reads 0.90 m
 * over 185 parts, the vane rivets, crown rivets, teeth and knuckles at
 * 0.5–0.9 and the patches, hatches and seams at 1.2–1.7 either side of
 * it.
 *
 * Coordinate tables below are laid out as tables on purpose; `tools/**\/*.mjs`
 * is outside the repo's Prettier scope (package.json) precisely so they can be.
 */
import { THREE, add, box, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/** The design length (UNIT_STATS Lure hullLengthM, silhouettes.ts). Drawn at it. */
const L = 100;
const BOW = L / 2;
// The Klaxon's facet rule for a hull drawn in metres (bathyarch.mjs `cut`, #919).
const cut = bathyarch.cut();

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const unlit = bathyarch.ink.amberLampUnlit();

const root = new THREE.Group();
root.name = 'consortium_lure';
const bar = (name, mat, size, t, e) => add(root, name, box(...size), mat, t, e);

// The body: three slabs lapped bow over stern at the kind's half-beams,
// 13, 17 and 15, each with a tier of the other finish on its back.
const SLAB_DEPTH = 7;
const BEVEL = 0.8;
const TIER_DEPTH = 2.5;
const SLABS = [
  {
    mat: 'black', y: 0.8,
    outline: [[43, 5], [39, 10], [34, 13], [27, 13], [25, 11], [25, -11], [27, -13], [34, -13], [39, -10], [43, -5]],
    tier: { mat: 'grey', outline: [[40, 3], [37, 6.5], [28, 6.5], [26, 4.5], [26, -4.5], [28, -6.5], [37, -6.5], [40, -3]] },
  },
  {
    mat: 'grey', y: 0,
    outline: [[30, 8], [26, 13], [22, 17], [12, 17], [9, 14], [8, 10], [8, -10], [9, -14], [12, -17], [22, -17], [26, -13], [30, -8]],
    tier: { mat: 'black', outline: [[23, 6], [21, 10], [12, 10], [10, 7], [10, -7], [12, -10], [21, -10], [23, -6]] },
  },
  {
    mat: 'black', y: -0.8,
    outline: [[13, 9], [10, 14], [5, 15], [-4, 15], [-8, 12], [-10, 8], [-10, -8], [-8, -12], [-4, -15], [5, -15], [10, -14], [13, -9]],
    tier: { mat: 'grey', outline: [[6, 6], [4, 9], [-4, 9], [-7, 6], [-7, -6], [-4, -9], [4, -9], [6, -6]] },
  },
];
bathyarch.slabSeries(root, { black, grey }, {
  slabs: SLABS.map((s) => ({
    outline: s.outline,
    depth: SLAB_DEPTH,
    bevel: BEVEL,
    y: s.y,
    mat: s.mat,
    tier: { ...s.tier, depth: TIER_DEPTH },
  })),
});
const SLAB_NAMES = SLABS.map((_, i) => `hull_slab_${i}`);
const TIER_NAMES = SLABS.map((_, i) => `armour_tier_${i}`);
const slabTop = (i) => SLABS[i].y + SLAB_DEPTH / 2 + BEVEL;
const tierTop = (i) => slabTop(i) + TIER_DEPTH;
const SLAB_BOTTOM = SLABS[2].y - SLAB_DEPTH / 2 - BEVEL; // −5.1, the lowest belly
/** The body's half-beam at a station: the widest slab's top-face outline there. */
const rim = (x) => Math.max(...SLABS.map((s) => bathyarch.planHalfBeam(s.outline, x)));
const flank = (x) => rim(x) + BEVEL;

// The tail, bow first: four cans stepping down from the aft slab's
// trailing edge, black and grey by turns, each capped fore and aft in
// older plate with the caps crossing at the seams; the third carries the
// dome on its crown and no rivets.
const CANS = [
  { mat: black, x: -14.4, r: 6.2, length: 12.2, pitch: 2.4 },
  { mat: grey, x: -24.2, r: 5.4, length: 7.4, pitch: 1.0 },
  { mat: black, x: -31.2, r: 4.6, length: 6.6, pitch: 1.0, rivets: false },
  { mat: grey, x: -36.6, r: 3.8, length: 4.2, pitch: 0.8 },
];
const CAN_NAMES = CANS.map((_, i) => `can_${i}`);
bathyarch.cans(
  root,
  { rust, grey },
  {
    cans: CANS,
    cap: { length: 2, tip: 0.85, proud: 0.5 },
    rivet: { size: [0.8, 0.45, 0.8], proud: 0.2 },
    cut,
  }
);
const canAt = (x) => CANS.find((c) => Math.abs(x - c.x) <= c.length / 2);
const canCrown = (c) => bathyarch.crownOnX(c.r, cut.round(c.r));

// The rostrum: a bow block set into the fore slab's nose, the hazard
// stripe on its top, and the ram to the bow at +50.
bar('bow_block', black, [4.4, 6, 10], [44, 0, 0]);
bar('hazard_stripe', amber, [3.2, 0.3, 1.2], [44, 3.15, 0]);
bathyarch.ramCone(root, grey, { r: 2.8, length: 6.3, at: [BOW - 3.15, 0, 0], cut });

// The ribbed pressure keel under the slabs alone, +31 to −5, its crown a
// metre into the fore slab's belly, six hoops round it.
bathyarch.ribbedKeel(root, { keel: black, rib: rust }, {
  x: 13,
  y: -5.7,
  radii: [3.2, 2.6],
  length: 36,
  ribs: { count: 6, t: 0.35, proud: 0.25, inset: 3 },
  cut,
});

// Three whip aerials off the tiers at the kind's stations, alternating
// sides, raked 0.3 forward, each on a bracket of older plate.
bathyarch.deckWhips(root, { whip: grey, bracket: rust }, {
  on: TIER_NAMES,
  whips: [
    { side: 'p', x: 38, z: 3, length: 5 },
    { side: 's', x: 21, z: 3.5, length: 6.5 },
    { side: 'p', x: 4, z: 3.5, length: 5.5 },
  ],
  r: [0.5, 0.2],
  rake: -0.3,
  sink: 0.8,
  bracket: { size: [1.4, 1.0, 1.4], sink: 0.3 },
  cut,
});

// Three limbs a side folded under the slabs at the kind's stations, each
// on a hip bracket hung from the belly of the slab over its own station —
// the fore at −3.5 (that bracket sits in the lap's corner, into the mid
// slab's nose; the header), the mid at −4.3, the aft at −5.1 — the thigh swept 0.6 forward and
// the shin folded on to 1.1; the hips set by the tips' reach against the
// rim (the header).
const THIGH = { length: 4.5, sweep: 0.6, section: [1.0, 0.9], root: 0.3 };
const SHIN = { length: 3.5, sweep: 1.1 };
const reachZ = THIGH.length * Math.cos(THIGH.sweep) + SHIN.length * Math.cos(SHIN.sweep);
const reachX = THIGH.length * Math.sin(THIGH.sweep) + SHIN.length * Math.sin(SHIN.sweep);
const slabBottom = (i) => SLABS[i].y - SLAB_DEPTH / 2 - BEVEL;
const LIMBS = [
  [30, -2, 0],
  [18, 3, 1],
  [6, 1, 2],
].map(([x, past, slab]) => ({ x, z: flank(x + reachX) + past - reachZ, under: slabBottom(slab) }));
bathyarch.foldedLimbs(root, { bracket: rust, girder: grey, block: black }, {
  limbs: LIMBS,
  y: -6.5,
  under: SLAB_BOTTOM,
  sink: 0.3,
  hip: { size: [1.6, 1.4] },
  thigh: THIGH,
  knee: { size: [1.4, 1.2, 1.4] },
  shin: SHIN,
  tip: { size: [1.2, 1.0, 1.2] },
});

// The file: a toothed rack a metre to starboard down the tail's back,
// −10 to −22, its top 1.26 m over the first can's crown and 1.24 over the
// second's, twelve square teeth on it, three pedestals under it.
const crest = bathyarch.toothedRack(root, { rail: grey, tooth: black, post: rust }, {
  z: 1,
  from: -10,
  to: -22,
  top: [canCrown(CANS[0]) + 1.26, canCrown(CANS[1]) + 1.24],
  rail: { h: 0.5, w: 0.7 },
  teeth: 12,
  tooth: { l: 0.5, h: 0.8 },
  posts: { stations: [-11.5, -15.5, -19.5], on: ['can_0'], sink: 0.3 },
});

// The plectrum: one girder arm raised over the rack from the port flank of
// the first can, the striker's point 0.9 m over the teeth at −17.6.
const hipZ = -(Math.sqrt(CANS[0].r ** 2 - 1.5 ** 2) - 0.6);
bathyarch.pickArm(root, { bracket: rust, girder: grey, block: black, pick: black }, {
  hip: [-11, 1.5, hipZ],
  knee: [-13, 12.4, -4.5],
  wrist: [-16.5, 11.1, 0],
  tip: [-17.6, crest(-17.6) + 0.9, 1],
  bracket: { size: [1.6, 1.8, 1.4] },
  femur: [1.0, 0.9],
  tibia: [0.9, 0.8],
  pick: { r: 1.2, flat: 0.3 },
});

// The resonating bladder: a pressure dome of newer plate on its skirt, on
// the third can's crown 1.6 m to starboard, 5.6 m across. No lamp.
bathyarch.pressureDome(root, { dome: grey, skirt: black }, {
  at: [-31.95, 4.0, 1.6],
  r: 2.5,
  squash: 0.64,
  skirt: { h: 2.8 },
  cut,
});

// The sounding fan, spread: the telson on the keel line to the stern at
// −50, the inner pair yawed 24° out and the outer 60°, each a square-ended
// vane of plate with its unlit rib, its rivet rows and — on the four that
// fold — its hinge pin and knuckles.
const KNUCKLE = [1.4, 0.5, 1.6];
bathyarch.soundingVanes(root, { skins: [grey, black, grey], rib: unlit, pin: black, knuckle: rust, rivet: rust }, {
  at: [-32, 0],
  t: 0.6,
  rivets: { pitch: 3, size: [0.7, 0.4, 0.7], inset: 0.6, from: 1.5 },
  telson: { length: 18, root: 2.0, tip: 3.4, y: 0.9 },
  pairs: [
    { length: 17, root: 2.2, tip: 4.2, spread: 0.4189, dz: 2.2, y: 0, hinge: { r: 0.3, at: 7, knuckle: KNUCKLE } },
    { length: 20, root: 2.4, tip: 4.8, spread: 1.0472, dz: 3.6, dx: 1, y: -1.2, hinge: { r: 0.3, at: 3, knuckle: KNUCKLE } },
  ],
  cut,
});

// The screw: a skeg hung from the last can's aft cap and the shroud and
// hub under the telson's root, both after faces at −43.9, nothing lit.
bar('skeg', black, [3, 2.6, 2], [-40.4, -3.2, 0]);
bathyarch.tailScrew(
  root,
  { grey, black },
  { at: [-42.6, -4.0, 0], shroud: { r: 1.8, length: 2.6 }, hub: { r: 0.6, length: 2.6 }, cut }
);

// "Nearly black at rest, photophores in a pattern that repeats on neither
// side": the body's six lamps on the slabs' top faces at 0.7 of the
// half-beam, outboard of the tiers, and the tail's four on the cans'
// shoulders at 0.55 of the radius, at the kind's stations and pitches.
bathyarch.rimLamps(root, lampM, {
  name: 'rim_lamp',
  rim,
  on: SLAB_NAMES,
  ranks: {
    s: { from: 35, pitch: 15, count: 3 },
    p: { from: 37, pitch: 18.5, count: 3 },
  },
  at: 0.7,
  size: 1.4,
  h: 0.4,
  sink: 0.1,
});
bathyarch.rimLamps(root, lampM, {
  name: 'tail_lamp',
  rim: (x) => canAt(x)?.r ?? 0,
  on: CAN_NAMES,
  ranks: {
    s: { from: -10.5, pitch: 7, count: 2 },
    p: { from: -19, pitch: 8, count: 2 },
  },
  at: 0.55,
  size: 1.1,
  h: 0.4,
  sink: 0.1,
});

// "Under way a dim row along each tergite's edge": a rank a side a slab at
// 0.93 of the half-beam where that slab is the outermost thing, in the
// lamp family's unlit finish — built, and never lit (§3.2 rule 2).
const edgeRow = (name, s, p) =>
  bathyarch.rimLamps(root, unlit, {
    name,
    rim,
    on: SLAB_NAMES,
    ranks: { s: { from: s[0], pitch: 4, count: s[1] }, p: { from: p[0], pitch: 4, count: p[1] } },
    at: 0.93,
    size: 0.9,
    h: 0.35,
    sink: 0.1,
  });
edgeRow('edge_row_0', [38, 3], [36, 3]);
edgeRow('edge_row_1', [24.5, 4], [22.5, 3]);
edgeRow('edge_row_2', [6, 3], [4, 2]);

// PANELS: the tiers dressed to the band. The hazard stripe down the mid
// tier; dogged hatches; plates of the other finishes; seams; rivet rows
// along each tier's edge.
bar('deck_stripe', amber, [12, 0.3, 1.2], [16, tierTop(1) + 0.15, -0.5]);
const hatches = (on, mats, list) =>
  bathyarch.deckHatches(root, mats, { on, r: 0.9, h: 0.35, wheel: { R: 0.45, t: 0.07 }, hatches: list, cut });
hatches('armour_tier_1', { hatch: grey, wheel: rust }, [
  ['deck_hatch_a', [13, 2]],
  ['deck_hatch_f', [20.5, -3]],
]);
hatches('armour_tier_0', { hatch: black, wheel: rust }, [['bow_hatch', [34, -3]]]);
hatches('armour_tier_2', { hatch: black, wheel: rust }, [['aft_hatch', [0, 3]]]);
const patches = (on, mats, plates) => bathyarch.deckPlates(root, mats, { on, t: 0.25, plates });
patches('armour_tier_0', { black, rust }, [
  ['bow_patch_0', 'black', [1.8, 1.2], [30, 2.5]],
  ['bow_patch_1', 'rust', [1.6, 1.2], [35, 3]],
]);
patches('armour_tier_1', { grey, rust }, [
  ['deck_patch_0', 'rust', [1.8, 1.2], [16, 3]],
  ['deck_patch_1', 'grey', [1.6, 1.2], [12, -3.5]],
  ['deck_patch_2', 'rust', [2.0, 1.2], [17, -4.5]],
]);
patches('armour_tier_2', { black, rust }, [
  ['aft_patch_0', 'rust', [1.8, 1.2], [-3, -3]],
  ['aft_patch_1', 'black', [1.6, 1.0], [1, -1]],
]);
patches('hull_slab_0', { grey, rust }, [
  ['slab_patch_0', 'grey', [2.0, 1.4], [31, -10]],
  ['slab_patch_1', 'rust', [1.8, 1.2], [40.5, 6]],
]);
patches('hull_slab_1', { black, rust }, [
  ['slab_patch_2', 'black', [2.0, 1.4], [14, 13]],
  ['slab_patch_3', 'rust', [1.8, 1.2], [22.5, -10.5]],
]);
patches('hull_slab_2', { grey, rust }, [
  ['slab_patch_4', 'rust', [2.0, 1.2], [-6, 11]],
  ['slab_patch_5', 'grey', [1.6, 1.2], [3, -12]],
]);
bathyarch.plateSeams(root, rust, {
  on: 'armour_tier_1',
  name: 'tier_seam_s',
  stations: [14, 19],
  z: 6,
  length: 5,
  w: 0.4,
  h: 0.25,
});
bathyarch.plateSeams(root, rust, {
  on: 'armour_tier_1',
  name: 'tier_seam_p',
  stations: [12, 17],
  z: -6,
  length: 5,
  w: 0.4,
  h: 0.25,
});
const stations = (from, to, pitch) => {
  const out = [];
  for (let x = from; x <= to + 1e-9; x += pitch) out.push(x);
  return out;
};
bathyarch.flankRivets(root, grey, {
  name: 'tier_rivet',
  size: [0.8, 0.5, 0.8],
  running: true,
  rows: [
    { side: 's', z: 5.7, y: tierTop(0), stations: stations(29, 36, 3.5) },
    { side: 'p', z: -5.7, y: tierTop(0), stations: stations(30.5, 34, 3.5) },
    { side: 's', z: 9.2, y: tierTop(1), stations: stations(12, 20, 4) },
    { side: 'p', z: -9.2, y: tierTop(1), stations: stations(14, 18, 4) },
    { side: 's', z: 8.2, y: tierTop(2), stations: stations(-3, 1, 4) },
    { side: 'p', z: -8.2, y: tierTop(2), stations: stations(-1, 3, 4) },
  ],
});

// Built in metres from the start; this guards the length and centres it.
// The telson's squared end is the one thing at −50, and it is placed
// without a yaw, so the drawn length is 100 to the bit and the scale is 1.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'lure-bathyarch.glb', { trim: bathyarch.TRIM });
