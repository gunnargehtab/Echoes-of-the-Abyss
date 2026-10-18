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
 * hull and hulls/verger-bathyarch.mjs the transport: a riveted carbody of
 * older plate the hull's length in three decks, one a segment, stepped at
 * the seams — 17 m across amidships, 13.2 at the bow and 14 at the stern,
 * 5 m deep amidships and 4.2 at the ends — with three pressure cans
 * standing up through it, a bow can and a stern can in hull black at
 * 3.5 m of radius and the middle can in newer iron grey at 4.5, each
 * capped fore and aft in older plate so the caps cross at the seams as the
 * Verger's hold caps do, the outer cans' five crown rivets each; six
 * planted legs bolted to the decks' outboard faces, each a riveted hip
 * bracket, a box girder of a femur, a hull-black knee block with the one
 * amber lamp on its upward face, a hydraulic drum of a tibia, an ankle
 * collar and a transducer pad for a foot; the listening dome as the
 * Verger's riveted turret with its skirt buried at the middle can's crown
 * ridge and showing on the beams, the dome pressed to 0.3 and no boss; a
 * pipe run a side on
 * the middle deck beside the can, neither where the other is; a short bow
 * block with the hazard stripe on it and the ram — the rostrum — to the
 * bow; a short stern block with the screw in its shroud — the telson —
 * and nothing lit on it; a box stack on the stern deck; and the decks
 * dressed with two dogged hatches, seven patches, two seams and rivet
 * rows.
 *
 * Built metre-true at 58 m, the ram's point at +29 and the shroud's and
 * hub's after faces at −29, with nothing to rescale (kit.mjs `metreTrue`),
 * and built in a state (§3.5): the legs are down. Every part comes from
 * `factions/bathyarch.mjs`; `carbody` and `plantedLegs` were written for
 * this hull there, beside the Verger's section, and `listeningTurret`
 * learnt `crown: null` and `plumb`. The legs are placed one side at a time
 * at signed z, port −z (#642), and never through `bothSides` (§3.6).
 *
 * THE KIND'S DECISIONS, kept and translated (hulls/acolyte.mjs took them
 * for the Directorate; a variant keeps them, it does not retake them):
 *
 * - **The tripod stance, not a mirror.** Starboard hips at x +13, −2 and
 *   −13, port at +10, +1 and −16, 3 m of stride, all six at y −0.3 and
 *   half a metre inside the deck face under each — z ±6.1 on the bow
 *   deck, ±8.0 amidships, ±6.5 on the stern deck; the fore pair raked
 *   0.6 rad ahead and the aft pair 0.6 astern, the middle pair square,
 *   and the reach read along the raked line, so a raked pair on a
 *   narrower deck plants nearer the keel than the square pair on the
 *   widest, as the Directorate's does. The knees stand at (+15.8, 10.2),
 *   (−2, 13.0) and (−15.8, 10.6) to starboard and (+12.8, −10.2),
 *   (+1, −13.0) and (−18.8, −10.6) to port, 2.9 m above the axis — the
 *   Directorate's are at the same six x, 9.2 to 12.8 out; the feet at
 *   (+17.9, 13.2), (−2, 16.6), (−17.9, 13.6) and (+14.9, −13.2),
 *   (+1, −16.6), (−20.9, −13.6), their pads reaching ±17.9: the plan is
 *   35.8 m broad against the Directorate's 35. `plantedLegs` refuses a
 *   mirrored pair, as the Directorate's `plantedLimbs` does.
 * - **The knee is the lit joint.** The one joint that stands clear of the
 *   shell with a face up: a 0.9 m square plate of `amber_lamp` on each
 *   knee block's top, 4 m above the axis, six in all, and the hull's whole
 *   light. The hip brackets are inside the decks' depth — their tops at
 *   y 0.5 under deck plates at 1.2 and 1.5 — and only their outboard
 *   end stands out of the deck's face: half a metre on the square middle
 *   pair, and on the four raked end hips a wedge from nothing to 1.06 m,
 *   its face's centre 0.33 m out; each one's two rivet heads sit on the
 *   deck plate over it, the bracket's bolts through, every corner of
 *   each head inside the deck's edge (the outer head of each raked hip
 *   0.04 m in), unlit; the ankles are under the keel line, where the chart's
 *   straight-down bake sees nothing.
 * - **The feet are hydrophones, planted below the keel.** A hydrophone on
 *   this navy is a drum (`transducerDrum`), so each leg ends in a
 *   transducer pad 1.3 m in radius on a stem, face down, its underside at
 *   y −6.75 where the keel line — the middle can's bottom — is −4.5 and
 *   the decks' −3.5 amidships and −3 at the ends: the hull stands on
 *   them, 2.25 m clear, which is what
 *   "planted" is. Every foot and stem reads under y 0 in contacts.mjs's
 *   sweep, as do the decks and the cans: this is a hull, whose y 0 is its
 *   axis, and the feet are meant to be there.
 * - **The dome is sunk low in the middle segment and carries no lamp.**
 *   The turret's skirt sits 2.2 m of its 2.4 into the middle can at the
 *   crown's ridge, 1.75 m of it showing on each beam where the can's
 *   skin at z ±3.2 is down at y 2.95, and the dome crowns at y 5.7 on a
 *   can whose crown is 4.5, seated
 *   plumb on the keel line (`plumb`: the twelve-gon's crown is a ridge,
 *   and seating along its facet put an earlier skirt 0.23 m to
 *   starboard); `crown: null` leaves the boss off, because this block
 *   lights the knees and nothing else — the Verger's boss was its block's
 *   "the dome" lit.
 *
 * WHAT THE BLOCK DID NOT SAY — decided here:
 *
 * - **The carbody carries the section; that is the "squat".** A Klaxon
 *   pressure can is round, as tall as it is wide, and the Directorate's
 *   tergites are flattened ellipsoids: 17 × 8.8 m amidships, 13.2 × 6.8
 *   at the bow and 14 × 7.2 at the stern, each 1.9 wide to tall, 9.8 from
 *   keel to dome crown. Two earlier passes put cans on a plank and read
 *   as a tube with legs (the reviews). So the box carries the section,
 *   as the Verger's V-grooved hold and the Freighter's box hull carry
 *   theirs: head-on, each station measures 17 × 10.2 amidships from the
 *   middle can's keel line to the dome's crown (1.67; 17 × 9 without the
 *   dome, 1.9), 13.2 × 7 at the bow (1.9) and 14 × 7 at the stern (2.0),
 *   wider than tall at every station; and of each station's area the
 *   deck holds 79 % at full beam amidships (85 of 107.5 m²), 82 % at the
 *   bow (55 of 68) and 83 % at the stern (59 of 71), the rest the drum's
 *   crown standing 3 m above the deck amidships and 2.3 at the ends and
 *   its bilge a metre under it amidships and half a metre at the ends.
 *   There is no waist: each deck holds its beam its whole length and the
 *   three step at the seams, 13.2 to 17 to 14, and each smaller can's
 *   pinch to 0.85 of its radius is inside the larger can's cap (the fore
 *   seam's outline runs 3.5 to 3.8 to 4.5); the two end caps taper to
 *   2.98 beyond the deck ends, 0.2 to 0.3 m proud of the bow block and
 *   0.5 to 0.6 m proud of the stern block over their last quarter-metre
 *   (the blocks are 5.6 and 5 m square), an end taper and no waist. The
 *   segments read by the steps and by the colour, grey between black,
 *   where the Directorate's pinch at their seams. Keel to dome crown
 *   is 10.2 m against the Directorate's 9.8. The bow and stern blocks are
 *   short square blocks, 3 and 2.4 m, so the carbody reads as capped
 *   drums and not a tube.
 * - **No dorsal spines, and no deck walk.** The spines are the
 *   Directorate's tell; the Klaxon's is the stack, the hazard stripe and
 *   the rivets. The middle can's crown carries the dome, so it has no
 *   crown rivets; the decks carry the fittings.
 * - **Nothing else is lit.** No bow lamp, no ports, no vent: the block
 *   licenses the knees alone and the band table says nearly black. The
 *   hazard stripe is `hazard_amber` cladding, not a lamp.
 *
 * The light budget, measured (`lightAudit`, printed by `exportGlb`): six
 * lit parts, the six knee lamps, 0.75 to 0.81 m² each as the chart's four
 * cells a metre read a 0.9 m square turned to its rake — 4.7 m² facing up
 * on a plan the legs make 35.8 m broad — no lamp hidden, none floating.
 * The calibrated bake (tools/hull-maps/build.mjs, 4 px/m) reads raw E
 * 5.11 against the target E(10) = 0.92 and dims by ×0.180, eleven times
 * clear of the ×1/64 floor; the intake bake at 2 px/m reads raw 4.59.
 * The Directorate's reads 7.22 and ×0.129 on 6.5 m², the Verger's ×0.110.
 * 133 parts, 2,408 triangles; the file spans x −29 .. 29, y −6.8 .. 5.7,
 * z −17.9 .. 17.9.
 *
 * The sweep (contacts.mjs) reads 186 pairs and every one a mount: the
 * decks butted at the seams with the caps crossing inside them, the cans
 * and their caps through the decks, the hips and the femurs' roots in
 * the deck faces, each hip's two rivet heads on the deck plate over it,
 * every bone rooted into the block at
 * each end so femur meets tibia inside the knee and tibia meets stem
 * inside the ankle, the skirt in the crown with the dome, ribs and rivets
 * on it, the pipes on the deck plate on a flat of their six-gon — the
 * starboard one seam to seam, the port one from the fore seam to its
 * flange — the fittings on their decks, the ram and stripe on the bow
 * block, the shroud and hub on the stern block.
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
 * over 110 parts.
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
 * drawn at. The middle can is the fattest and in newer plate; the cans
 * meet at crossing caps at x 7.5 and −9.5, the seams the carbody steps at.
 */
const CANS = [
  { mat: black, x: 15, r: 3.5, length: 14, pitch: 2.4 },
  { mat: grey, x: -1, r: 4.5, length: 16, pitch: 3.2, rivets: false },
  { mat: black, x: -17.5, r: 3.5, length: 15, pitch: 2.4 },
];

// The carbody first, so the cans and everything after seat on it: three
// decks of older plate, one a segment, stepped at the seams — 17 m across
// amidships, 13.2 at the bow and 14 at the stern, the Directorate's three
// tergites' beams — 5 m deep amidships and 4.2 at the ends, the keel line
// at y −3.5 and −3 and the deck at 1.5 and 1.2. The cans stand up through
// the decks; the hips bolt to the decks' faces.
const DECKS = [
  ['deck_f', 15, 15, 6.6, -3.0, 1.2],
  ['deck_m', -1, 17, 8.5, -3.5, 1.5],
  ['deck_a', -17.5, 16, 7.0, -3.0, 1.2],
];
const beamAt = bathyarch.carbody(root, rust, { decks: DECKS });

// "Three overlapping segments": the cans, each with its caps, bow first.
// The middle can's crown carries the dome, so it has no crown rivets; the
// outer two keep their five.
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

// The listening dome sunk low into the middle can: the Verger's riveted
// turret with its skirt all but buried and the dome pressed to 0.3, and no
// boss on its crown — this block lights the knees and nothing else.
// Seated plumb: the can's twelve-gon has a ridge on its crown.
bathyarch.listeningTurret(root, { grey, black, rust, lampM }, {
  on: 'can_1',
  x: -1,
  r: 3.2,
  skirt: { h: 2.4, sink: 2.2 },
  squash: 0.3,
  plumb: true,
  ribs: { count: 4, t: 0.3 },
  rivets: { size: [0.5, 0.35, 0.5], below: 0.15, sink: 0.1 },
  crown: null,
  cut,
});

// The six hydrophone legs, walked out and planted in the tripod stance
// (the header): hips 0.3 m under the axis and half a metre into the deck
// face under each station, a femur 5 m out and 3.2 up to the knee, a tibia
// 3.6 m out and 6.8 down to the ankle, and the transducer pad planted
// 2.4 m under it. The fore pair raked 0.6 rad ahead, the aft pair 0.6
// astern, the middle pair square.
const RAKE = 0.6;
const HIP_Y = -0.3;
const joints = bathyarch.plantedLegs(
  root,
  { bracket: rust, bone: grey, block: black, pad: black, lampM },
  {
    cans: CANS,
    hip: {
      y: HIP_Y,
      sink: 0.5,
      on: (x) => beamAt(x),
      size: [2.6, 1.6, 2.0],
      rivet: { size: [0.5, 0.3, 0.5], pitch: 1.0, out: -0.55, top: (x) => beamAt.top(x), sink: 0.05 },
    },
    femur: { reach: 5, rise: 3.2, section: [1.6, 1.4], root: 0.2 },
    knee: { size: [2.4, 2.0, 2.2] },
    lamp: { size: 0.9, h: 0.3, sink: 0.05 },
    tibia: { reach: 3.6, drop: 6.8, r: 0.75, root: 0.3 },
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

// A pipe run a side on the middle deck beside the can, lying on the deck
// plate on a flat of its six-gon (an apothem up, not a radius): the
// starboard one the deck's whole length, seam to seam; the port one 11 m
// from the fore seam to a blank flange mid-deck, so the pair never
// mirrors.
const DECK_M = 1.5;
const PIPE_R = 0.5;
const pipeY = DECK_M + PIPE_R * Math.cos(Math.PI / cut.round(PIPE_R));
bathyarch.keelPipes(root, rust, {
  pipes: [
    ['pipe_s', PIPE_R, 17, [-1, pipeY, 5.2]],
    ['pipe_p', PIPE_R, 11, [2, pipeY, -5.2]],
  ],
  cut,
});
bar('pipe_p_flange', grey, [0.4, 1.4, 1.4], [-3.5, DECK_M + 0.7, -5.2]);

// The bow: a short block of hull black set 0.25 m into the bow can's fore
// cap, the hazard stripe on its top and the short ram — the rostrum — to
// the bow at +29. The stern: the stern block the same into the aft cap,
// and the screw in its shroud with both after faces at −29.
bar('bow_block', black, [3, 5.6, 5.6], [24.5, 0, 0]);
bar('hazard_stripe', amber, [2.4, 0.3, 1], [24.5, 2.95, 0]);
bathyarch.ramCone(root, grey, { r: 2.4, length: 3.5, at: [27.25, 0, 0], cut });
bar('stern_block', black, [2.4, 5, 5], [-27.2, 0, 0]);
bathyarch.tailScrew(
  root,
  { grey, black },
  { at: [-27.8, -0.4, 0], shroud: { r: 2.2, length: 2.4 }, hub: { r: 0.8, length: 2.4 }, cut }
);

// The box stack on the stern deck, to port.
bar('stack', black, [1.6, 3.2, 1.6], [-22.5, 1.2 + 1.6, -5]);

// PANELS: the decks dressed to the band (bathyarch.mjs `deckHatches`,
// `deckPlates`, `plateSeams`, `flankRivets`). A dogged hatch on the middle
// deck and one on the bow deck; patches of the other finishes on every
// deck, none mirroring another; two seams along the middle deck; and a
// rivet row along each deck's outboard edge, clear of the hip brackets.
bathyarch.deckHatches(
  root,
  { hatch: black, wheel: rust },
  {
    on: 'deck_m',
    r: 0.9,
    h: 0.35,
    wheel: { R: 0.45, t: 0.07 },
    hatches: [['deck_hatch_m', [-6, 6.9]]],
    cut,
  }
);
bathyarch.deckHatches(
  root,
  { hatch: grey, wheel: rust },
  {
    on: 'deck_f',
    r: 0.8,
    h: 0.35,
    wheel: { R: 0.4, t: 0.07 },
    hatches: [['deck_hatch_f', [16, -4.6]]],
    cut,
  }
);
const patches = (on, plates) => bathyarch.deckPlates(root, { black, grey }, { on, t: 0.25, plates });
patches('deck_m', [
  ['deck_patch_0', 'black', [2.0, 1.4], [4.5, 6.8]],
  ['deck_patch_1', 'grey', [1.8, 1.2], [-6.5, -6.8]],
  ['deck_patch_2', 'black', [1.8, 1.2], [-1.5, -7.0]],
]);
patches('deck_f', [
  ['deck_patch_3', 'grey', [2, 1], [19, 4.8]],
  ['deck_patch_4', 'black', [1.6, 1], [20.5, -4.8]],
]);
patches('deck_a', [
  ['deck_patch_5', 'grey', [2.2, 1], [-22, 4.8]],
  ['deck_patch_6', 'black', [1.6, 1], [-12.5, -4.8]],
]);
const seam = (name, x, z) =>
  bathyarch.plateSeams(root, grey, { on: 'deck_m', name, stations: [x], z, along: true, length: 2.4, w: 0.4, h: 0.25 });
seam('deck_seam_s', 1.5, 6.8);
seam('deck_seam_p', 4, -6.8);
const edge = (side, on, half, stations) => ({ side, z: (side === 'p' ? -1 : 1) * (half - 0.6), y: 2, stations, on });
bathyarch.flankRivets(root, grey, {
  name: 'deck_rivet',
  size: [0.5, 0.3, 0.5],
  running: true,
  rows: [
    edge('s', 'deck_f', 6.6, [17, 20.5]),
    edge('s', 'deck_m', 8.5, [-8.5, -4.5, 6.5]),
    edge('s', 'deck_a', 7.0, [-19, -23]),
    edge('p', 'deck_f', 6.6, [14, 19.5]),
    edge('p', 'deck_m', 8.5, [-8.5, -5, 5.5]),
    edge('p', 'deck_a', 7.0, [-19.5, -24.5]),
  ],
});

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'acolyte-bathyarch.glb', { trim: bathyarch.TRIM });
