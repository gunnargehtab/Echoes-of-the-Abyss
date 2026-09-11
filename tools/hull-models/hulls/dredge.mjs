/**
 * The Dredge — the Directorate's hull for the floor of the map, 120 m
 * (docs/units.md, "The rung, and two hulls a navy").
 *
 * "The roster's only PR-4 entry (SIG 40 idle, 52 cruise). The Abyssal
 * Submersible's deep body with the Directorate's armour grown over it: five
 * wide overlapping tergites with a spine off each, a scoop bow with mandibles
 * and a glowing gullet, one great folded claw to starboard and the dredge boom
 * to port, a hopper amidships lit around its throat. Sustained glow: rows of
 * photophores along every plate edge."
 *
 * Every part comes from `factions/directorate.mjs`, and six of that module's
 * builders exist for this hull alone — `scoopBow`, `claw`, `dredgeBoom` and
 * `hopper` have no other caller in the roster. They were read off this GLB and
 * written down; this file is the first thing that has ever run them.
 *
 * Two rules of the navy are load-bearing here rather than decorative:
 *
 * - **Nothing mirrors.** The claw is to starboard and the boom to port, and
 *   they are not the same object flipped: one folds and closes, the other is a
 *   spar with teeth stepped along it. The plate lights carry the same rule at
 *   a smaller scale — port three to a plate, starboard two on every other
 *   plate — which is the "asymmetric, yet regimented" line made countable.
 * - **The glow is the loudness.** SIG 40 idle is the third-loudest resting
 *   figure in the roster, and the hull spends it on twenty-one plate-edge
 *   photophores, five dorsal marks, the gullet and the hopper throat. They lie
 *   flat on upward faces, because the maps are top-down and a lamp on a flank
 *   is a lamp gate 3 cannot see — with three exceptions the approved model
 *   made and this script keeps: the last lamp of plate 0's port rank, of its
 *   starboard rank, and of plate 1's port rank sit under the raised ridge of
 *   the plate ahead, and the export warns on each. The approved bake never
 *   saw them either, and a rank re-laid to clear three lamps moves twenty-one
 *   (#630 F1). The gullet is the one lamp moved, and it is declared below.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, mandible tip to telson.
 *
 * The two disagree because the bow was measured off the scoop rather than off
 * the mandibles that reach past it, so intake and the runtime have both been
 * squeezing this hull by 0.903 since it landed. The numbers below are the
 * approved model's own — they are what `directorate.mjs`'s header transcribes
 * — and the root carries that one squeeze, which makes the file metre-true
 * (kit.mjs) and leaves the shipped maps exactly where they were.
 */
const L = 120;
const DRAWN = 132.94;

/**
 * The five tergites, stern first: `[x, half-length, half-height, half-beam]`,
 * the approved model's own stations — the scales its orbs are drawn at, which
 * are not their bounding boxes. An `orb(14, 7)` reaches only 0.975 of its sx
 * and 0.950 of its sz, so a station read off a box comes out 13.649 for 14
 * and 24.713 for 26, and every ridge and lamp fraction hung on it is then
 * wrong by the same few percent (#630, second pass). Passed twice on purpose
 * — the plates are built from them and the plate-edge light is ranked off
 * them — so a plate cannot move out from under its own photophores.
 */
const SEGMENTS = [
  [-38, 14, 6.8, 17],
  [-22, 16, 9.2, 23],
  [-4, 17, 10.4, 26],
  [14, 16, 9.6, 24],
  [30, 14, 8, 20],
];

const violet = directorate.ink.chitinViolet();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const gullet = directorate.ink.gulletGlow();
const crimson = directorate.ink.biolightCrimson();

const root = new THREE.Group();
root.name = 'directorate_dredge';
root.scale.setScalar(L / DRAWN);

// The body: five overlapping plates, alternating violet and red from the
// stern, each with a raised trailing ridge and a spine off it. `ridge` rather
// than the Precentor's `seam` — this is the heavier carapace of the two, and
// the lip stands proud of the plate instead of shading under the one ahead.
// Fourteen meridians and seven stacks, the approved model's grid: `[12, 8]`
// has the same 168 triangles and the same bounding box and is a different
// plate — a pointed lozenge in plan, where this one holds its full beam over
// a 6.7 m shoulder (#630, second pass).
directorate.tergites(root, { violet, red, black }, {
  segments: SEGMENTS,
  lip: 'ridge',
  facets: [14, 7],
  // Port 5 m off the keel on the even plates, starboard 6 m on the odd: two
  // constant offsets on plates from 16 m to 25 m of half-beam, which is the
  // approved model's rule and not a fraction of the beam (#630 F5).
  spines: { offsets: [5, 6] },
});
// The stern is a transom, not a point: the telson's 10 m base ring sits at
// the sternmost station and its apex is buried 14 m forward in the last
// plate, and the two tail spines are the same way round — base aft, point
// forward and inboard, 0.35 rad off the keel, centred 9 m out.
directorate.telson(root, { violet, black }, {
  tip: -63,
  r: 5,
  length: 14,
  facets: 8,
  tailSpines: { x: -50, y: 2, z: 9, r: 1.2, length: 9, splay: 0.35 },
});

// The scoop bow. The plate is drawn rather than lathed because a scoop is a
// plan shape, and both outlines here are the approved model's own vertices in
// its own edge order: a 6-point bevelled shovel 42 m across the mouth, and
// over it a steel rim — a C of three bars, one across the mouth and an arm
// down each side, open toward the hull. The order is the shape: the same
// eight corners walked the other way round close into a plate with two
// notches, 2.4× the rim's area inside the same bounds, which is how the first
// transcription had it (#630, second pass). The gullet is the loud thing on
// the hull, and the reason a Dredge that is working is heard before it is
// seen — so it sits proud of the rim rather than where the approved model
// has it, at y 1.3 under the scoop's top face at y 2, where the top-down
// maps could not see it at all (kit.mjs, the light-faces-up rule).
directorate.scoopBow(root, { red, steel, black, gullet }, {
  y: -2,
  depth: 6,
  bevel: 1,
  outline: [
    [32, -21],
    [50, -15],
    [58, -6],
    [58, 6],
    [50, 15],
    [32, 21],
  ],
  lip: {
    y: 2.2,
    depth: 2,
    outline: [
      [46, 14],
      [48, 16],
      [59, 7],
      [59, -7],
      [48, -16],
      [46, -14],
      [56, -6],
      [56, 6],
    ],
  },
  mandibles: { x: 62, z: 10 },
  gullet: { x: 51, y: 3.5, w: 10, d: 9 },
});

// One great folded claw to starboard and the dredge boom to port. There is no
// pair anywhere here: the claw is 34 m of arm, a 20 m forearm folded a quarter
// radian back in toward the keel, and two tips closing on each other off its
// end — the outboard one turning in, the inboard one turning out, points
// forward — and the boom is 30 m of spar with three teeth stepped along it.
// The forearm and the tips sit where the approved model put them, by centre,
// and both limbs taper toward the tips as it drew them. The arm is the widest
// thing on the hull, 33.4 m off the keel, and the forearm folds inside that
// line: folded the other way it was the widest thing instead, and the beam
// grew a metre (#630 F3).
directorate.claw(root, { steel, black }, {
  side: 's',
  x: -5,
  y: 1,
  z: -31,
  arm: { r: [2.4, 1.8], length: 34 },
  fore: { r: [1.8, 1.4], length: 20, bend: 0.25, at: [36, 2, -29] },
  tips: {
    a: { r: 2, length: 9, close: 0.2, at: [48, 2.5, -29] },
    b: { r: 1.6, length: 7, close: -0.3, at: [46, 2.5, -24] },
  },
});
directorate.dredgeBoom(root, { steel, black }, { side: 'p', x: -8, y: 0.5, z: 29 });

// The hopper amidships, lit around its throat — the second of the two places
// this hull puts a lamp large enough to read as a patch rather than a mark.
directorate.hopper(root, { black, steel, gullet }, { x: -6, y: 8, z: 2 });

// "Rows of photophores along every plate edge": three a plate to port on all
// five, two to starboard on every other one. Twenty-one lights that follow a
// rule and never once answer each other across the keel. The rule is the
// module's own and the approved model's exactly, and it leaves
// photophore_p_02, _s_01 and _p_12 under the ridge of the plate ahead: the
// export warns on those three, and they stay, because the approved bake never
// saw them either and a rank re-laid to clear them is a shape decision
// (#630 F1).
directorate.plateEdgePhotophores(root, crimson, {
  segments: SEGMENTS,
  port: { count: 3, start: -0.5, pitch: 0.45 },
  starboard: { count: 2, start: -0.3, pitch: 0.55, every: 2 },
  y: 0.72,
  z: 0.66,
  size: 1.4,
});

// Five marks down the spine, one a plate, side alternating with the tergite
// spines they sit between. `photophores` refuses a mirrored pair, so this rank
// cannot quietly become symmetrical.
directorate.photophores(root, crimson, {
  spots: [
    ['photophore_dorsal_0', -34, 9.5, -8],
    ['photophore_dorsal_1', -18, 9.5, 9],
    ['photophore_dorsal_2', -2, 12, -8],
    ['photophore_dorsal_3', 14, 9.5, 9],
    ['photophore_dorsal_4', 30, 9.5, -8],
  ],
  size: 1.2,
  depth: 2.4,
});

await exportGlb(root, 'dredge-directorate.glb');
