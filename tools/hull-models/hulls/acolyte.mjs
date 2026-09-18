/**
 * The Acolyte — the Directorate's scout, 58 m (docs/units.md, "The
 * scouts"; the Acolyte block of docs/asset-prompts-3d.md Block 3).
 *
 * "The ears that sit still, 58 m — the Listening made a hull that holds a
 * chokepoint rather than driving past it (SIG 10 idle, 20 cruise; no
 * weapon; HYD 60 under way, 85 stationary; PR 2, 3 under the Directorate's
 * baseline; 40 m/s; 90 nodules and 15 Biomass). A squat three-tergite
 * carapace, wider in its limbs than in its shell, with six hydrophone
 * limbs walked out and planted — three a side, stout and jointed, the
 * forward pair raked ahead and the aft pair astern — a short rostrum, a
 * telson, and a listening dome sunk low into the middle tergite. The limbs
 * are the array and the model shows them down, planted in a hexapod's
 * tripod stance — fore and hind together a side, the middle limb a
 * half-stride the other way — which is the posture it hears at 85 in;
 * under way they fold flat under the shell. Nearly black: a photophore on
 * each limb's knee, in a pattern the stance keeps from repeating on either
 * side." (as #784 amended it)
 *
 * Built rather than ported (docs/models-plan.md §3.1), the second
 * Directorate hull after the Verger to be so, and built in a state
 * (§3.5): the limbs are down. Metre-true at 58 m, the rostrum's point at
 * +29 and the telson's base at −29, nothing to rescale. It carries no
 * faction lock (§3.4): this file is the kind's only model and serves every
 * navy recoloured.
 *
 * The body is the Chorister's family at a scout's length: three
 * overlapping tergites, violet, red, violet from the stern, each with the
 * Chorister's seam sunk under the plate ahead; a six-sided rostrum and a
 * six-sided telson; three dorsal spines alternating sides; and the
 * Precentor's studded listening dome, sunk low into the middle plate. The
 * plates are the Chorister's proportion drawn a little wider and lower —
 * height 0.52 of the beam against the Chorister's 0.62 — because "squat"
 * is the block's first word for the shell.
 *
 * WHAT THE BLOCK, AS FIRST WRITTEN, DID NOT SAY — decided here, and the
 * first written into it in #784:
 *
 * - **Which joint, and why the stance is not a mirror.** A planted limb
 *   has three joints — hip, knee, ankle — and "a photophore at each limb's
 *   joint" is the knee: the only one that stands clear of the shell, on
 *   top, where the chart's straight-down bake can see it (§3.2, rule 5).
 *   Six knees are the hull's whole light. But six knees on a mirrored
 *   stance are three mirrored pairs, which `photophores` refuses and the
 *   block forbids ("a pattern that repeats on neither side"), and a rank
 *   shifted whole along one side is the same pattern moved. So the stance
 *   is a hexapod's *tripod*: on each side the fore and hind limbs stand
 *   together and the middle one a half-stride the other way, and the two
 *   sides are a half-stride apart — starboard hips at +13, −2 and −13,
 *   port at +10, +1 and −16, 3 m of stride, so the knees stand at +15.8,
 *   −2 and −15.8 to starboard and +12.8, +1 and −18.8 to port. One rule
 *   places all six, no knee answers another across the keel, and the
 *   light that sits on them inherits the rule. The block now says so.
 * - **The reach is along the rake.** Every limb is one set of bones, 5 m
 *   of femur out and 3.2 up, 4 m of tibia out and 6 down, and the fore
 *   and hind pairs are raked 0.6 rad ahead and astern. The reach is read
 *   along the raked line, so the raked pairs plant their feet 12.5 to
 *   13.7 m off the keel where the square middle pair plants at 16.8, and
 *   a tripod of knees comes out widest amidships — a crab's, and the
 *   shape the hand-drawn outline this model retires drew as three spikes
 *   a side standing out past the shell.
 * - **The feet are hydrophones.** A hydrophone on this navy is a red
 *   six-sided spike (the Precentor's `arrayBoom`), and the block says the
 *   limbs are the array, so each limb ends in one, planted point-down
 *   from the ankle. The tips reach 1.6 m below the keel: the hull stands
 *   on them, which is what "planted" is.
 * - **Three dorsal spines.** The block names none. The Chorister's, the
 *   Precentor's and the Verger's blocks name none either and all three
 *   carry a rank, alternating sides; it is the navy's tell on the back,
 *   and a Directorate plate series without one reads as a Commune pod.
 *   Short — 3.5, 4 and 3.5 m — and the middle one abaft the dome, which
 *   it tops by under a metre.
 * - **One dome, on the keel line, and no boss.** "A listening dome" is
 *   the Precentor's studded dome without its aft companion; sunk low is a
 *   metre proud of the plate's crown where the Precentor's is nearly four.
 *   It carries no `dome_crown` lamp: the Verger's crown was the upward
 *   emitter its block's "the dome" lit, and this block lights the knees
 *   and nothing else.
 *
 * The light budget, measured (`lightAudit`, printed by `exportGlb`): six
 * lit parts, the six knee marks, 1.1 m square each on a knee 1.3 m in
 * radius standing 3.2 m above its hip and 2 to 4 m outboard of the flank
 * — 6.5 m² facing up on a plan the limbs make 35 m broad — and the bake at
 * E(10) = 0.92 reads raw E = 7.22 and dims by ×0.129: eight times clear
 * of the ×1/64 floor the quiet end must not touch (§3.2), between the
 * Drifter's ×0.105 at E(4) and the Verger's ×0.195 at E(14).
 *
 * The hand-drawn outline this model retires (silhouettes.ts, "a squat
 * carapace with six limbs planted … spiky where the Chorister's is
 * scalloped") drew the shell 16 m across and parallel-sided from x = ±17
 * with the six limb tips at 0.27 to 0.28 of the length either side, in
 * mirror. The model's shell is three orbs and scallops as the Chorister's
 * does — 17 m at the middle plate, 12 m at the seams — and its tips stand
 * at 0.22 to 0.30 in a tripod rather than a mirror, which is the plan §3.6
 * says an asymmetric hull generates as drawn.
 *
 * Every part comes from `factions/directorate.mjs`. `tergiteFlank` and
 * `plantedLimbs` were written for this hull and run here for the first
 * time.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 58;
const BOW = L / 2;
const STERN = -L / 2;

/**
 * The three tergites, stern first: `[x, half-length, half-height,
 * half-beam]`, the scales the orbs are drawn at — and their extents, since
 * an `orb(12, 6)` reaches its radius on every axis (hulls/precentor.mjs).
 * The middle plate is the widest and the lowest for its beam; the plates
 * overlap by a third to a half of a half-length, the Chorister's, so the
 * seams show as dark collars where each plate's forward end passes into
 * the one ahead.
 */
const SEGMENTS = [
  [-17, 8.5, 3.4, 6.6],
  [-1, 11, 4.4, 8.5],
  [14, 9, 3.6, 7.0],
];

/** Where the shell's crown is at `(x, z)`, seams included, for seating a part on it. */
const crown = (x, z) => directorate.tergiteCrown(SEGMENTS, x, z);

const violet = directorate.ink.chitinViolet();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson();

const root = new THREE.Group();
root.name = 'directorate_acolyte';

// The body: three overlapping plates with the Chorister's seam each,
// violet, red, violet from the stern. The rostrum's point is the bow at
// +29, its base 4 m inside the bow plate; the telson's base ring is the
// stern at −29, its point buried 2 m into the stern plate.
directorate.tergites(root, { violet, red, black }, { segments: SEGMENTS });
directorate.rostrum(root, red, { tip: BOW, r: 2.2, length: 9 });
directorate.telson(root, { violet, black }, { tip: STERN, r: 2, length: 6 });

// The listening dome sunk low into the middle plate: 7.6 m across and 6.4 m
// tall, centred 2.2 m up on the keel line so its crown stands a metre proud
// of the plate's 4.4, studded with six five-sided spines in a ring 2.6 m
// out and 2.3 m up — on the dome's own shoulder, as the Precentor's are.
directorate.listeningDome(
  root,
  { red, violet, black },
  {
    x: -1,
    y: 2.2,
    r: 3.8,
    ry: 3.2,
    studs: { radius: 2.6, lift: 2.3, length: 2.6, r: 0.45 },
  }
);

// Three dorsal spines, one a plate, alternating sides — 2 m to port, 2.5 m
// to starboard, 2 m to port — 3.5, 4 and 3.5 m long from the stern, raked
// 0.3 forward and cut five-sided, each with its base 0.8 m into the shell;
// the middle one abaft the dome. `dorsalSpines` refuses a mirrored pair;
// this rank never offers one.
const spine = (x, z, length) => [x, crown(x, z) + length / 2 - 0.8, z, length];
directorate.dorsalSpines(root, black, {
  spines: [spine(-19, -2, 3.5), spine(-8, 2.5, 4), spine(16, -2, 3.5)],
  r: 0.6,
  rake: -0.3,
});

// The six hydrophone limbs, walked out and planted in a tripod stance (the
// header): hips 0.8 m under the axis and half a metre into the flank, a
// femur 5 m out and 3.2 up to the knee, a tibia 4 m out and 6 down to the
// ankle, and a red hydrophone spike 2.4 m planted from it. The fore pair
// raked 0.6 rad ahead, the aft pair 0.6 astern, the middle pair square.
const RAKE = 0.6;
const joints = directorate.plantedLimbs(
  root,
  { steel, black, red },
  {
    segments: SEGMENTS,
    hip: { y: -0.8, sink: 0.5, r: 1.1 },
    femur: { r: [1.1, 0.9], reach: 5, rise: 3.2 },
    knee: { r: 1.3 },
    tibia: { r: [0.9, 0.7], reach: 4, drop: 6 },
    foot: { r: 0.8, length: 2.4 },
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

// "Nearly black: a photophore at each limb's knee": six, each a flat
// crimson square seated on its knee's crown, and the whole light of a hull
// that idles at SIG 10. The stance never mirrors, so neither do they.
directorate.photophores(root, crimson, {
  spots: joints.map(({ side, i, knee: [x, y, z] }) => [
    `photophore_${side}${i}`,
    x,
    y + 1.3 - 0.15,
    z,
  ]),
});

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'acolyte-directorate.glb');
