/**
 * The Dredge — the Directorate's hull for the floor of the map, 120 m
 * (docs/units.md, "The rung, and two hulls a navy").
 *
 * "The roster's only PR-4 entry (SIG 40 idle, 52 cruise). The Abyssal
 * Submersible's deep body with the Directorate's armour grown over it: five
 * wide overlapping tergites with a spine off each, a scoop bow with mandibles
 * and a glowing gullet, one great folded claw to port and the dredge boom to
 * starboard, a hopper amidships lit around its throat. Sustained glow: rows
 * of photophores along every plate edge."
 *
 * Every part comes from `factions/directorate.mjs`, and six of that module's
 * builders exist for this hull alone — `scoopBow`, `claw`, `dredgeBoom` and
 * `hopper` have no other caller in the roster. They were read off this GLB and
 * written down; this file is the first thing that has ever run them.
 *
 * Two rules of the navy are load-bearing here rather than decorative:
 *
 * - **Nothing mirrors.** The claw is to port and the boom to starboard — as
 *   the approved model has them, and as the block above has said since #650:
 *   it was written with +z read as port, #642 turned that reading round, and
 *   the prose was amended to the model rather than the model mirrored to the
 *   prose — and they are not the same object flipped: one folds and closes,
 *   the other is a spar with teeth stepped along it. The plate lights carry
 *   the same rule at a smaller scale — starboard three to a plate, port two
 *   on every other plate — which is the "asymmetric, yet regimented" line
 *   made countable.
 * - **The glow is the loudness.** SIG 40 idle is the third-loudest resting
 *   figure in the roster, and the hull spends it on twenty-one plate-edge
 *   photophores, five dorsal marks, the gullet and the hopper throat. They lie
 *   flat on upward faces, because the maps are top-down and a lamp on a flank
 *   is a lamp gate 3 cannot see. The approved model made three exceptions —
 *   the last lamp of plate 0's starboard rank, of its port rank, and of plate
 *   1's starboard rank (`photophore_s_02`, `_p_01`, `_s_12`) sat under the
 *   raised ridge of the plate ahead, the export warned on each, and the
 *   approved bake never saw them — and until #890 this script kept them,
 *   since a rank re-laid to clear three lamps moves twenty-one (#630 F1).
 *   They are the block's resting clause — "rows of photophores along every
 *   plate edge" — so #890 keeps all three lit and moves only them, by a rule
 *   `plateEdgePhotophores` now holds rather than by hand: a lamp whose station
 *   falls under the ridge ahead rides on that ridge's crown at its own beam
 *   (docs/models-plan.md §3.2 rule 5). The three keep their names, size and
 *   material. The gullet is the other lamp moved, and it is declared below.
 *
 *   The other eighteen did not move in #890, and its review found them in
 *   the water: the file laid every one at 0.72 of its plate's height and
 *   0.66 of its beam, which is on the plate's ellipsoid at one station
 *   only: twelve of the eighteen stood 0.17 to 1.71 m over the facet
 *   under them (seven far enough from any skin for the audit to name
 *   them) and six were sunk up to a decimetre into it, since a low-facet
 *   orb falls away from its ellipsoid toward its ends (#894). So does the
 *   rule now rest every lamp on the shell: each is dropped at its own
 *   station onto whichever plate or ridge is on top there, its bottom
 *   face on the facet and tilted with it (kit.mjs `seat`), and the three
 *   ridge riders come out where #890 put them by hand. The five dorsal
 *   marks were laid the same way
 *   (`photophores` `rest`): `photophore_dorsal_2` and `_4` stood 1.2 and
 *   1.7 m over their plates and `_3` 0.4 m; `_0` and `_1` were sunk in
 *   theirs, showing 0.75 and 0.25 m² from above, and come up 0.4 and
 *   1.2 m onto the shell, where each shows 2 m². Twenty-three lamps move,
 *   none by more than two metres, none across the keel; `diff.mjs` lists
 *   them and nothing else, and the audit names no lamp on this hull as
 *   hidden or floating.
 *
 * FACETS (#919). The Listening's rule is one facet edge of 2 m on the odd
 * lattice, five to fifteen (docs/asset-prompts-3d.md Block 2c; directorate.mjs
 * `cut`), asked at the export's scale (×0.903) and settled on each part as
 * pressed, and the pass re-cut what was off it: the five plates fifteen
 * round and seven down at 15–22.9 m, where they were fourteen by seven, and
 * their ridges the same for ten by six; the telson fifteen at 4.5 m for
 * eight; the mandibles seven at 2 m for six; the claw's arm seven and
 * forearm five for eight, the boom five for eight, the five plate spines
 * five for six. The tail spines and claw tips keep their five. 62 parts and
 * 2,068 triangles become 62 and 2,508; the twenty-eight lamps show 196 m²
 * for 198, the throat covered a little more by the plates round it, and the
 * audit names none. The contact sweep's exact-zero test (#746) reads three
 * resting marks as touching nothing at 0.000 m; they lie on their facets as
 * before. No ring is off the rule.
 *
 * PANELS (#919). The Directorate's band for a hull is 1–3 m on a side, the
 * median unlit part from above (facets.mjs `panelsOf`; Block 2c), and this
 * file read 5.6 m over thirty-three: twenty parts over 9 m² against thirteen
 * in the band. Block 2c says the Dredge gains limbs or spines at the pass;
 * it gains twelve spines where eight are the least, since eight would have
 * left the median on the claw's inner tip at 2.9 m: a second, smaller spine
 * on four plates, seeded five units abaft the plate's centre and eight off
 * the keel on the first spine's side and seated on the plate, which drops
 * it about three units and a unit or less inboard and forward: as built 4.5–4.9 m behind
 * the first spine and 6.4–6.9 m off the keel — not the third plate, where
 * the hopper stands — three stepped along the claw's arm as the boom's
 * teeth are stepped along the boom, leaning a little inboard so the plan
 * from above stays the file's own, and five
 * teeth on the scoop's lip raked forward over the mouth, no two the same
 * length (`spineRank`). Black and five-sided, each its base seated on its
 * plate, arm or lip and touching nothing else. They show 1–2 m² each, and
 * the median part is 2.35 m over forty-five, a boom tooth. No lamp's plan
 * changed, no plan grew from above (0.00 m² outside main's at 8 px/m). 62
 * parts and 2,508 triangles become 74 and 2,628.
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
 * are not their bounding boxes. The file's `orb(14, 7)` reached only 0.975
 * of its sx and 0.950 of its sz, and the rule's fifteen by seven 0.975 and
 * 0.970, so a station read off a box comes out a few percent short, and
 * every ridge and lamp fraction hung on it is then wrong by the same few
 * percent (#630, second pass). Passed twice on purpose
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
// The Listening's facet rule, asked at the export's scale (directorate.mjs `cut`, #919).
const cut = directorate.cut(L / DRAWN);

// The body: five overlapping plates, alternating violet and red from the
// stern, each with a raised trailing ridge and a spine off it. `ridge` rather
// than the Precentor's `seam` — this is the heavier carapace of the two, and
// the lip stands proud of the plate instead of shading under the one ahead.
// The approved model's grid was fourteen meridians and seven stacks; the rule
// cuts each plate as pressed (`cut`, #919), fifteen round and seven down.
directorate.tergites(root, { violet, red, black }, {
  segments: SEGMENTS,
  lip: 'ridge',
  cut,
  // Starboard 5 m off the keel on the even plates, port 6 m on the odd: two
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
  cut,
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
  cut,
});

// One great folded claw to port and the dredge boom to starboard. There is no
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
  side: 'p',
  x: -5,
  y: 1,
  z: -31,
  arm: { r: [2.4, 1.8], length: 34 },
  fore: { r: [1.8, 1.4], length: 20, bend: 0.25, at: [36, 2, -29] },
  tips: {
    a: { r: 2, length: 9, close: 0.2, at: [48, 2.5, -29] },
    b: { r: 1.6, length: 7, close: -0.3, at: [46, 2.5, -24] },
  },
  cut,
});
directorate.dredgeBoom(root, { steel, black }, { side: 's', x: -8, y: 0.5, z: 29, cut });

// The hopper amidships, lit around its throat — the second of the two places
// this hull puts a lamp large enough to read as a patch rather than a mark.
directorate.hopper(root, { black, steel, gullet }, { x: -6, y: 8, z: 2 });

// The panel pass's spines (#919; the header): a second, smaller spine behind
// and outboard of the first on each plate, seeded five units abaft the
// plate's centre and eight off the keel on the first spine's side and then
// seated on the plate, which drops it about three units and a unit or less
// inboard and forward — as built, 4.5–4.9 m behind the first spine and 6.4–6.9 m off
// the keel — a rule with a hole in it where the hopper stands on the third
// plate; three spines stepped along the claw's arm as the boom's teeth are
// stepped along the boom, answering it without mirroring it; and
// five teeth on the scoop's lip, cones raked forward over the mouth, no two
// the same length. Black and five-sided like the plate spines, each seated on
// the plate, ridge, arm or lip it grows from (`spineRank`; kit.mjs `seat`).
const RAKE = [Math.sin(0.3), Math.cos(0.3), 0];
directorate.spineRank(root, {
  name: 'tergite_barb',
  on: SEGMENTS.flatMap((_, i) => [`tergite_${i}`, `tergite_ridge_${i}`]),
  spines: [0, 1, 3, 4].map((i) => {
    const [x, , sy] = SEGMENTS[i];
    return [i, black, 0.9, i % 2 ? 7 : 5, [x - 5, sy + 1, (i % 2 ? -1 : 1) * 8], RAKE];
  }),
});
directorate.spineRank(root, {
  name: 'claw_spine',
  on: 'claw_arm',
  spines: [
    [0, black, 0.9, 6, [2, 3.2, -31], [0.2, 1, 0.15]],
    [1, black, 0.9, 7, [12, 3.2, -31], [0.2, 1, 0.15]],
    [2, black, 0.9, 8, [22, 3.2, -31], [0.2, 1, 0.15]],
  ],
});
const BITE = [Math.sin(0.45), Math.cos(0.45), 0];
directorate.spineRank(root, {
  name: 'scoop_tooth',
  on: 'scoop_lip',
  spines: [
    [-6, 4.2],
    [-3.5, 3.9],
    [-0.5, 4.4],
    [2.5, 4.0],
    [5, 4.3],
  ].map(([z, length], i) => [i, black, 0.7, length, [57, 3.4, z], BITE]),
});

// "Rows of photophores along every plate edge": three a plate to starboard on
// all five, two to port on every other one. Twenty-one lights that follow a
// rule and never once answer each other across the keel. The rule is the
// module's own and the approved model's exactly, but for `ridge`: the rank
// as laid left photophore_s_02, _p_01 and _s_12 under the ridge of the plate
// ahead, and with the ridge given the builder seats those three on its crown
// instead, where the maps see them (#890, the header). The other eighteen
// rest on the shell at the file's stations (#894, the header).
directorate.plateEdgePhotophores(root, crimson, {
  segments: SEGMENTS,
  starboard: { count: 3, start: -0.5, pitch: 0.45 },
  port: { count: 2, start: -0.3, pitch: 0.55, every: 2 },
  y: 0.72,
  z: 0.66,
  size: 1.4,
  ridge: directorate.TERGITE_RIDGE,
});

// Five marks down the spine, one a plate, side alternating with the tergite
// spines they sit between, each seated on the plate or ridge under its
// station (#894; the header). `photophores` refuses a mirrored pair, so
// this rank cannot quietly become symmetrical.
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
  rest: SEGMENTS.flatMap((_, i) => [`tergite_${i}`, `tergite_ridge_${i}`]),
});

await exportGlb(root, 'dredge-directorate.glb');
