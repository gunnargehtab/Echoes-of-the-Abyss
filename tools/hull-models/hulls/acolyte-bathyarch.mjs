/**
 * The Acolyte, the Klaxon's — 58 m (docs/units.md, "The scouts"; the
 * Acolyte block of docs/asset-prompts-3d.md Block 3, read with the Bathyarch
 * FACTION block, #1439).
 *
 * "The ears that sit still, 58 m — the Listening made a hull that holds a
 * chokepoint rather than driving past it (SIG 10 idle, 20 cruise; no
 * weapon; HYD 60 under way, 85 stationary). A squat three-tergite
 * carapace, wider in its limbs than in its shell, with six hydrophone
 * limbs walked out and planted — three a side, stout and jointed, the
 * forward pair raked ahead and the aft pair astern — a short rostrum, a
 * telson, and a listening dome sunk low into the middle tergite. The limbs
 * are the array and the model shows them down, planted in a hexapod's
 * tripod stance … Nearly black: a photophore on each limb's knee, in a
 * pattern the stance keeps from repeating on either side."
 *
 * The Acolyte carries no faction lock (docs/models-plan.md §3.4), so the
 * Klaxon fields it on the Chorister's rule: the same plan, composed in the
 * navy's shape language, with the light kept at the Directorate's band.
 * Said the Klaxon's way, as hulls/chorister-bathyarch.mjs says the cohort
 * hull and hulls/verger-bathyarch.mjs the transport: three riveted
 * pressure cans on a keel — a bow can and a stern can in hull black at
 * 3.5 m of radius, the middle can in newer iron grey at 4.6, each capped
 * fore and aft in older plate so the caps cross at the seams as the
 * Verger's hold caps do, the outer cans' five crown rivets each; an
 * outrigger girder of older plate along each flank at hip height, 33 m
 * long and 3 wide, lapped through the middle can and sunk into the outer
 * two, the starboard centred on the keel's middle and the port 3 m aft of
 * it; six planted legs bolted to the girders' outboard faces, each a
 * riveted hip bracket, a box girder of a femur, a hull-black knee block
 * with the one amber lamp on its upward face, a hydraulic drum of a tibia,
 * an ankle collar and a transducer pad for a foot; the listening dome as
 * the Verger's riveted turret with its skirt all but buried in the middle
 * can's crown, the dome pressed to 0.4 and no boss; a pipe run a side on
 * the middle can's shoulders, neither where the other is; a bow block
 * with the hazard stripe on it and the ram — the rostrum — to the bow; a
 * stern block with the screw in its shroud — the telson — and nothing lit
 * on it; a box stack on the stern can; and the cans dressed with two
 * dogged hatches, seven patches, two seams and rivet rows.
 *
 * Built metre-true at 58 m, the ram's point at +29 and the shroud's and
 * hub's after faces at −29, with nothing to rescale (kit.mjs `metreTrue`),
 * and built in a state (§3.5): the legs are down. Every part comes from
 * `factions/bathyarch.mjs`; `plantedLegs` was written for this hull there,
 * beside the Verger's section, and `listeningTurret` learnt `crown: null`.
 * The legs are placed one side at a time at signed z, port −z (#642), and
 * never through `bothSides` (§3.6).
 *
 * THE KIND'S DECISIONS, kept and translated (hulls/acolyte.mjs took them
 * for the Directorate; a variant keeps them, it does not retake them):
 *
 * - **The tripod stance, not a mirror.** Starboard hips at x +13, −2 and
 *   −13, port at +10, +1 and −16, 3 m of stride, all six at y −0.8 and
 *   z ±5.4 on the girders' faces; the fore pair raked 0.6 rad ahead and
 *   the aft pair 0.6 astern, the middle pair square, and the reach read
 *   along the raked line. The knees stand at (+16.1, 9.9), (−2, 10.9) and
 *   (−16.1, 9.9) to starboard and (+13.1, −9.9), (+1, −10.9) and
 *   (−19.1, −9.9) to port, 2.4 m above the axis; the feet at (+18.4,
 *   13.2), (−2, 14.9), (−18.4, 13.2) and (+15.4, −13.2), (+1, −14.9),
 *   (−21.4, −13.2). The middle pair reaches furthest, so the plan is
 *   widest amidships, as the Directorate's is. `plantedLegs` refuses a
 *   mirrored pair, as the Directorate's `plantedLimbs` does.
 * - **The knee is the lit joint.** The one joint clear of the shell and
 *   facing up: a 0.9 m square plate of `amber_lamp` on each knee block's
 *   top, six in all, and the hull's whole light. The hips sit under the
 *   girders' tops and the ankles under the shell's keel line, where the
 *   chart's straight-down bake sees neither.
 * - **The feet are hydrophones, planted below the keel.** A hydrophone on
 *   this navy is a drum (`transducerDrum`), so each leg ends in a
 *   transducer pad 1.3 m in radius on a stem, face down, its underside at
 *   y −7.45 where the keel's is −5.4: the hull stands on them, 2 m clear,
 *   which is what "planted" is. Every foot and stem reads under y 0 in
 *   contacts.mjs's sweep, as does the keel: this is a hull, whose y 0 is
 *   its axis, and the feet are meant to be there.
 * - **The dome is sunk low in the middle segment and carries no lamp.**
 *   The turret's skirt sits 2.1 m of its 2.4 into the middle can's crown
 *   and the dome crowns at y 6.2 on a can whose crown is 4.6; `crown:
 *   null` leaves the boss off, because this block lights the knees and
 *   nothing else — the Verger's boss was its block's "the dome" lit.
 *
 * WHAT THE BLOCK DID NOT SAY — decided here:
 *
 * - **The outrigger girders are the "squat".** A Klaxon shell is a can,
 *   and a can is as tall as it is wide; the Directorate's middle plate is
 *   17 m across and 8.8 tall. The girders carry the shell out to 11.8 m
 *   across at 9.2 tall without a curve — "boxy, riveted, over-engineered
 *   rectangles" — and are the plate the hips bolt to, a crawler's carbody
 *   rather than a crab's. They are of unequal station so the pair never
 *   mirrors.
 * - **No dorsal spines, and no deck walk.** The spines are the
 *   Directorate's tell; the Klaxon's is the stack, the hazard stripe and
 *   the rivets. The middle can's crown carries the dome, so it has no walk
 *   and no crown rivets and rivets its shoulders instead (`flankRivets`).
 * - **Nothing else is lit.** No bow lamp, no ports, no vent: the block
 *   licenses the knees alone and the band table says nearly black. The
 *   hazard stripe is `hazard_amber` cladding, not a lamp.
 *
 * The light budget, measured (`lightAudit`, printed by `exportGlb`): six
 * lit parts, the six knee lamps, 0.75 to 1.0 m² each as the chart's four
 * cells a metre read a 0.9 m square turned to its rake — 5.0 m² facing up
 * on a plan the legs make 32.4 m broad — no lamp hidden, none floating.
 * The calibrated bake (tools/hull-maps/build.mjs, 4 px/m) reads raw E
 * 6.79 against the target E(10) = 0.92 and dims by ×0.135, nine times
 * clear of the ×1/64 floor; the intake bake at 2 px/m reads raw 6.49.
 * The Directorate's reads 7.22 and ×0.129 on 6.5 m², the Verger's ×0.110.
 * 136 parts, 2,444 triangles; the file spans x −29 .. 29, y −7.4 .. 6.3,
 * z −16.2 .. 16.2.
 *
 * The sweep (contacts.mjs) reads 196 pairs and every one a mount: the
 * caps on their cans and crossing each other at the seams, the keel and
 * the girders set into the cans, the hips and the femurs' roots in the
 * girders, every bone rooted 0.3 m into the block at each end so femur
 * meets tibia inside the knee and tibia meets stem inside the ankle, the
 * skirt in the crown with the dome, ribs and rivets on it, the pipes ending
 * on the caps' roots, the fittings on their plates, the ram and stripe on
 * the bow block, the shroud and hub on the stern block. A first pass drew
 * the bow can 3 m into the middle can and the port fore hip on both; the
 * cans were re-spanned to meet at crossing caps.
 *
 * FACETS. Every ring asks the Klaxon's rule (bathyarch.mjs `cut`): the
 * middle can and its caps twelve, the outer cans and theirs eight, the
 * skirt eight, the dome eight by four, the rib rings eight and their tubes
 * six, the tibias, stems, pads, pipes, ram, shroud and hub six. facets.mjs
 * names the drums laid off Y by their length as a radius — the cans, the
 * pipes, the tibias, as the Verger's are named — and the counts it reads
 * are the rule's.
 *
 * PANELS. The Klaxon's band for a hull is 0.75–2 m on a side, the median
 * unlit part from above (bathyarch.mjs `panels`): this file reads 1.15 m
 * over 114 parts.
 *
 * Coordinate tables below are laid out as tables on purpose; `tools/**\/*.mjs`
 * is outside the repo's Prettier scope (package.json) precisely so they can be.
 */
import { THREE, add, box, seat, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/** The design length (UNIT_STATS Acolyte hullLengthM, silhouettes.ts). Drawn at it. */
const L = 58;
const BOW = L / 2;
const STERN = -L / 2;
// The Klaxon's facet rule for a hull drawn in metres (bathyarch.mjs `cut`, #919).
const cut = bathyarch.cut();

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();

const root = new THREE.Group();
root.name = 'consortium_acolyte';
const bar = (name, mat, size, t, e) => add(root, name, box(...size), mat, t, e);

/**
 * The three cans, bow first: `{ x, r, length }` the scales the drums are
 * drawn at. The middle can is the fattest and in newer plate; the outer
 * cans' inner caps are buried in its caps, as the Chorister's are.
 */
const CANS = [
  { mat: black, x: 15, r: 3.5, length: 14, pitch: 2.4 },
  { mat: grey, x: -1, r: 4.6, length: 16, pitch: 3.2, rivets: false },
  { mat: black, x: -17.5, r: 3.5, length: 15, pitch: 2.4 },
];
const MID_R = 4.6;

// "Three overlapping segments": the cans, each with its caps, bow first.
// The middle can's crown carries the dome, so it rivets its shoulders
// instead (`flankRivets`, below); the outer two keep their five.
bathyarch.cans(
  root,
  { rust, grey },
  {
    cans: CANS,
    cap: { length: 1.5, tip: 0.85, proud: 0.5 },
    rivet: { size: [0.7, 0.4, 0.7], proud: 0.2 },
    cut,
  }
);

// The keel under the middle can, sunk 0.4 m into its bottom plate.
const keelY = -bathyarch.crownOnX(MID_R, cut.round(MID_R));
bar('keel', rust, [18, 1.2, 2.2], [-1, keelY - 0.6 + 0.4, 0]);

// The listening dome sunk low into the middle can: the Verger's riveted
// turret with its skirt all but buried and the dome pressed to 0.4, and no
// boss on its crown — this block lights the knees and nothing else.
bathyarch.listeningTurret(root, { grey, black, rust, lampM }, {
  on: 'can_1',
  x: -1,
  r: 3.2,
  skirt: { h: 2.4, sink: 2.1 },
  squash: 0.4,
  ribs: { count: 4, t: 0.3 },
  rivets: { size: [0.5, 0.35, 0.5], below: 0.15, sink: 0.1 },
  crown: null,
  cut,
});

// The outrigger girders: a box of older plate along each flank at hip
// height, its inboard face 0.6 m inside the outer cans' skin and lapped
// through the middle can's, which is the shell carried out square — the
// "squat" of the block, said in a rectangle — and the plate the hips bolt
// to. 33 m each, the starboard centred on the keel's middle and the port
// 3 m further aft, so the pair never mirrors.
const GIRDER = { y: -0.8, z: 4.4, h: 1.8, w: 3.0 };
const GIRDER_FACE = GIRDER.z + GIRDER.w / 2;
bar('girder_s', rust, [33, GIRDER.h, GIRDER.w], [0, GIRDER.y, GIRDER.z]);
bar('girder_p', rust, [33, GIRDER.h, GIRDER.w], [-3, GIRDER.y, -GIRDER.z]);

// The six hydrophone legs, walked out and planted in the tripod stance
// (the header): hips 0.8 m under the axis and half a metre into the
// girders' outboard faces, a femur 5.5 m out and 3.2 up to the knee, a
// tibia 4 m out and 7 down to the ankle, and the transducer pad planted
// 2.4 m under it. The fore pair raked 0.6 rad ahead, the aft pair 0.6
// astern, the middle pair square.
const RAKE = 0.6;
const joints = bathyarch.plantedLegs(
  root,
  { bracket: rust, bone: grey, block: black, pad: black, lampM },
  {
    cans: CANS,
    hip: {
      y: GIRDER.y,
      sink: 0.5,
      on: { s: GIRDER_FACE, p: GIRDER_FACE },
      size: [2.6, 2.4, 2.0],
      rivet: { size: [0.5, 0.3, 0.5], pitch: 0.85, sink: 0.05 },
    },
    femur: { reach: 5.5, rise: 3.2, section: [1.6, 1.4], root: 0.3 },
    knee: { size: [2.4, 2.0, 2.2] },
    lamp: { size: 0.9, h: 0.3, sink: 0.05 },
    tibia: { reach: 4, drop: 7, r: 0.75, root: 0.3 },
    ankle: { size: [1.6, 1.0, 1.6] },
    foot: { r: 1.3, h: 0.8, stem: { r: 0.5, h: 1.6, root: 0.3 } },
    cut,
    limbs: [
      { side: 's', x: 13, rake: RAKE },
      { side: 's', x: -2, rake: 0 },
      { side: 's', x: -13, rake: -RAKE },
      { side: 'p', x: 10, rake: RAKE },
      { side: 'p', x: 1, rake: 0 },
      { side: 'p', x: -16, rake: -RAKE },
    ],
  }
);

// A pipe run a side on the middle can's shoulder plates, half-sunk as the
// Chorister's are: the starboard one the can's whole length, the port one
// 14 m and further forward, so the pair never mirrors.
bathyarch.keelPipes(root, rust, {
  pipes: [
    ['pipe_s', 0.5, 16, [-1, 2.1, 4.1]],
    ['pipe_p', 0.5, 11, [1.5, 2.1, -4.1]],
  ],
  cut,
});

// The bow: a block of hull black set 0.45 m into the bow can's fore cap, the
// hazard stripe on its top and the short ram — the rostrum — to the bow at
// +29. The stern: the stern block the same into the aft cap, and the screw
// in its shroud with both after faces at −29.
bar('bow_block', black, [4.4, 4.6, 4.6], [25, 0, 0]);
bar('hazard_stripe', amber, [3, 0.3, 1], [25, 2.45, 0]);
bathyarch.ramCone(root, grey, { r: 2.0, length: 3, at: [27.5, 0, 0], cut });
bar('stern_block', black, [3, 4, 4], [-27.2, 0, 0]);
bathyarch.tailScrew(
  root,
  { grey, black },
  { at: [-27.8, -0.4, 0], shroud: { r: 1.9, length: 2.4 }, hub: { r: 0.7, length: 2.4 }, cut }
);

// The box stack on the stern can, to starboard of its rivets.
const stackAt = seat(root, 'can_2', [-14, 0, 1.6], { drop: true, stand: 1.6 - 0.5 }).at;
bar('stack', black, [1.6, 3.2, 1.6], [-14, stackAt[1], 1.6]);

// PANELS: the cans dressed to the band (bathyarch.mjs `deckHatches`,
// `deckPlates`, `plateSeams`, `flankRivets`). A dogged hatch on the middle
// can's crown ahead of the dome and one on the bow can's; patches of the
// other finishes on every can's shoulder plates, none mirroring another;
// two seams along the middle can's shoulders; and a rivet row along each
// shoulder of the middle can, clear of the dome's skirt, the starboard on
// a pitch of three from −10 and the port from −8.5.
bathyarch.deckHatches(
  root,
  { hatch: black, wheel: rust },
  {
    on: 'can_1',
    r: 0.9,
    h: 0.35,
    wheel: { R: 0.45, t: 0.07 },
    hatches: [['can_hatch_m', [5.2, 0.6]]],
    cut,
  }
);
bathyarch.deckHatches(
  root,
  { hatch: grey, wheel: rust },
  {
    on: 'can_0',
    r: 0.8,
    h: 0.35,
    wheel: { R: 0.4, t: 0.07 },
    hatches: [['can_hatch_f', [10.6, -1.3]]],
    cut,
  }
);
const canPatch = (on, plates) => bathyarch.deckPlates(root, { black, rust, grey }, { on, t: 0.25, plates });
canPatch('can_1', [
  ['can_patch_0', 'rust', [2.0, 1.4], [5.6, -2.3]],
  ['can_patch_1', 'black', [1.8, 1.2], [-4.6, 2.3]],
  ['can_patch_2', 'rust', [1.8, 1.2], [-6.6, -2.3]],
]);
canPatch('can_0', [
  ['can_patch_3', 'grey', [2, 1], [18.6, 1.3]],
  ['can_patch_4', 'rust', [1.6, 1], [13.8, 1.3]],
]);
canPatch('can_2', [
  ['can_patch_5', 'grey', [2.2, 1], [-21.1, -1.3]],
  ['can_patch_6', 'rust', [1.6, 1], [-12, 1.3]],
]);
const seam = (name, x, z) =>
  bathyarch.plateSeams(root, rust, { on: 'can_1', name, stations: [x], z, along: true, length: 2.4, w: 0.4, h: 0.25 });
seam('can_seam_s', 2.8, 2.3);
seam('can_seam_p', 2.5, -2.3);
bathyarch.flankRivets(root, grey, {
  name: 'girder_rivet',
  size: [0.5, 0.3, 0.5],
  running: true,
  rows: [
    { side: 's', z: GIRDER.z + 0.9, y: GIRDER.y + GIRDER.h / 2, stations: [-15, -9, -6, 4, 7, 15], on: 'girder_s' },
    { side: 'p', z: -(GIRDER.z + 0.9), y: GIRDER.y + GIRDER.h / 2, stations: [-18, -12, -5, 5, 12], on: 'girder_p' },
  ],
});
bathyarch.flankRivets(root, grey, {
  name: 'can_rivet',
  size: [0.6, 0.35, 0.6],
  running: true,
  rows: [
    { side: 's', z: 2.3, y: 4.2, stations: [-8.2, -6.6, 5.0, 6.3], on: 'can_1' },
    { side: 'p', z: -2.3, y: 4.2, stations: [-8.4, -4.6, 4.3], on: 'can_1' },
  ],
});

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'acolyte-bathyarch.glb', { trim: bathyarch.TRIM });
