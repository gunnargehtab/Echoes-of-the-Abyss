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
 *   photophores, five dorsal marks, the gullet and the hopper throat. All of
 *   them lie flat on an upward face, because the maps are top-down and a lamp
 *   on a flank is a lamp gate 3 cannot see.
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
 * the approved model's own stations. Passed twice on purpose — the plates are
 * built from them and the plate-edge light is ranked off them — so a plate
 * cannot move out from under its own photophores.
 */
const SEGMENTS = [
  [-38, 13.65, 6.8, 16.16],
  [-22, 15.6, 9.2, 21.86],
  [-4, 16.57, 10.4, 24.71],
  [14, 15.6, 9.6, 22.81],
  [30, 13.65, 8, 19.01],
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
// Fourteen latitudes rather than the kit's ten, because a 33 m plate reads as
// a faceted nut at the default.
directorate.tergites(root, { violet, red, black }, {
  segments: SEGMENTS,
  lip: 'ridge',
  facets: [12, 8],
  spines: {},
});
directorate.telson(root, { violet, black }, {
  tip: -63,
  r: 5,
  length: 14,
  facets: 8,
  tailSpines: { x: -50, y: 2, z: 10, r: 1.2, length: 9 },
});

// The scoop bow. The plate is drawn rather than lathed because a scoop is a
// plan shape, and both outlines here are the approved model's own vertices
// rather than a redrawing: a 6-point bevelled shovel 42 m across the mouth,
// and over it a steel lip notched where the mouth opens. The gullet is the
// loud thing on the hull, and the reason a Dredge that is working is heard
// before it is seen — so it sits proud of the lip rather than under it, where
// the top-down maps could not see it at all (kit.mjs, the light-faces-up rule).
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
      [46, -14],
      [48, -16],
      [56, -6],
      [59, -7],
      [59, 7],
      [56, 6],
      [48, 16],
      [46, 14],
    ],
  },
  mandibles: { x: 62, z: 10 },
  gullet: { x: 51, y: 3.5, w: 10, d: 9 },
});

// One great folded claw to starboard and the dredge boom to port. There is no
// pair anywhere here: the claw is 34 m of arm with a forearm bent back toward
// the bow and two tips closing on each other, the boom is 30 m of spar with
// three teeth stepped along it, and the hull is 6 m wider to starboard for it.
directorate.claw(root, { steel, black }, { side: 's', x: -5, y: 1, z: -31 });
directorate.dredgeBoom(root, { steel, black }, { side: 'p', x: -8, y: 0.5, z: 29 });

// The hopper amidships, lit around its throat — the second of the two places
// this hull puts a lamp large enough to read as a patch rather than a mark.
directorate.hopper(root, { black, steel, gullet }, { x: -6, y: 8, z: 2 });

// "Rows of photophores along every plate edge": three a plate to port on all
// five, two to starboard on every other one. Twenty-one lights that follow a
// rule and never once answer each other across the keel.
directorate.plateEdgePhotophores(root, crimson, {
  segments: SEGMENTS,
  port: { count: 3, start: -0.6, pitch: 0.3 },
  starboard: { count: 2, start: -0.45, pitch: 0.42, every: 2 },
  y: 0.72,
  z: 0.75,
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
