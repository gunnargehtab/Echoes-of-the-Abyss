/**
 * The Acolyte, the Order's — 58 m (docs/units.md, "The scouts"; the Acolyte
 * block of docs/asset-prompts-3d.md Block 3, read with the Hadron FACTION
 * block on the Chorister's rule — "a navy rendering for one fields the same
 * plan, the squat shell, the six planted limbs and the sunk dome, composed
 * with its own FACTION block, with the light kept nearly black").
 *
 * "The ears that sit still, 58 m — the Listening made a hull that holds a
 * chokepoint rather than driving past it (SIG 10 idle, 20 cruise; no
 * weapon; HYD 60 under way, 85 stationary). A squat three-tergite carapace,
 * wider in its limbs than in its shell, with six hydrophone limbs walked
 * out and planted — three a side, stout and jointed, the forward pair
 * raked ahead and the aft pair astern — a short rostrum, a telson, and a
 * listening dome sunk low into the middle tergite. The limbs are the array
 * and the model shows them down … Nearly black: a photophore on each
 * limb's knee."
 *
 * Built, not ported (#1439, on models-plan.md §3.4): the Order's variant of
 * a kind whose canonical model is the Directorate's (hulls/acolyte.mjs),
 * drawn from the module's vocabulary with no approved binary behind it, so
 * every number here is a decision, and this header says which ones the
 * block did not make. Built in its state (§3.5): the limbs are down and
 * planted. Metre-true at 58 with no root scale: the bow prism's tip is the
 * bow at x 29 and the drive prism's base ring the stern at −29. The bake's
 * SIG is the kind's 10 (tools/hull-maps/models.mjs), not a cone figure:
 * the Acolyte's row is the Directorate's, and the variant takes the
 * Chorister's rule — the plan kept, the light kept at the kind's band.
 *
 * THE PLAN KEPT. Four decisions hulls/acolyte.mjs took for the kind stand
 * here, in the Order's shapes: the KNEE is the lit joint, the one joint
 * clear of the shell and facing up where the chart's straight-down bake
 * sees it (§3.2, rule 5); the fore pair is raked 0.6 rad ahead and the aft
 * pair 0.6 astern, the reach read along the raked line so the knees come
 * out widest amidships; the feet are hydrophones planted below the keel;
 * and the dome is sunk low in the middle segment and carries no lamp.
 *
 * THE STANCE IS NOT THE KIND'S. The Directorate's Acolyte plants a
 * hexapod's tripod — fore and hind together a side, the middle limb a
 * half-stride the other way — because its block forbids a knee pattern
 * that repeats across the keel, and `directorate.plantedLimbs` refuses a
 * mirrored hip. The Hadron FACTION block makes this navy "the only faction
 * with" precise bilateral symmetry, and both approved variants before this
 * one follow the faction block over the kind's asymmetry: the Chorister's
 * three lamps sit on the centreline where its block asks for photophores
 * repeating on neither side (hulls/chorister-hadron.mjs), and the Verger's
 * four hatches are two mirrored pairs where the Directorate alternates
 * them (hulls/verger-hadron.mjs). So the Order's Acolyte plants its six
 * limbs as THREE MIRRORED PAIRS, each pair at one station — fore at x 12
 * raked ahead, middle at −1 square, aft at −14 raked astern — and its six
 * knee lamps are three mirrored pairs (`hadron.plantedLimbs`, drawn
 * through `bothSides`, which cannot draw it otherwise). "Wider in limbs
 * than in shell" is kept: the shell is 13.1 m across and the feet plant
 * 31.5 m apart.
 *
 * THE SHAPES TRANSLATED. "Three-tergite carapace" is the Directorate's
 * language; the Order says the same plan as the Chorister's blade:
 *
 * - **Three segments on one axis** (`spar`), four-facet spars laid on a
 *   flat and pressed 0.6 tall by 1.4 wide — the Chorister's own section —
 *   each a double-ended wedge about its own middle: the outer two 17 m on
 *   4.8 m of radius (9.5 m in beam, 4.1 tall) at x −17 and 14, the middle
 *   21 m on 6.6 (13.1 in beam, 5.6 tall) at −1, overlapping by 3 and 4 m
 *   so each passes into the next through a waist. Height-to-beam 0.43, the
 *   Chorister's and the Verger's: "squat" is the block's first word for
 *   the shell, and no approved Order body stands over 0.43.
 * - **The spine in two runs** (`spar`, sheared), alloy four-facet ridges
 *   pressed 0.7 on 1 m, their axes 0.15 m under the crown at every station
 *   so they stand 0.34 m proud on the flats and dip with the waists: aft
 *   from x −24.5 to −4.5, the dome's skirt, and fore from 2.5 to 20.5, the
 *   bow prism's base. The family's spine (every Order block's), broken for
 *   the stone set in it; no inlay, since the hull is nearly black.
 * - **The listening dome** (`listeningDome`) is a crystal cut stone sunk
 *   low into the middle segment at x −1: 3.6 m pressed 0.8, drawn past its
 *   equator so its skirt is inside the shell, its pole at y 3.8, a metre
 *   proud of the segment's 2.8 m crown, and 5.4 m across where it breaks
 *   the crown. No boss (`boss: null`): the Verger's crown was the upward
 *   emitter its block lit, and this block lights the knees and nothing
 *   else.
 * - **The cage** (`cage`): four alloy struts over the middle segment at
 *   x −6 and 4, z ±3.5, leaned 0.6 rad in, 8 m long on 0.4 to 0.5 m — the
 *   Chorister's frame round its bladder, here round the stone. Each foot
 *   ring is inside the flank facet, section and not axis: the ring's
 *   outboard vertex at z 6.17, y −1.02, where the flank at x −6 is 6.53
 *   (0.36 m inside); its fore and aft vertices at x −6.5 and −5.5, z 5.76,
 *   y −1.30, where the flank is 6.24 and 6.53 (0.48 m inside at the
 *   narrower, 0.31 m normal to the taper facet); its lowest vertex at
 *   y −1.58, z 5.35, under a keel at
 *   −2.8. A first cut at z ±4 put the outboard vertex 0.14 m outside the
 *   hull, and review measured it. Each strut comes up through the crown
 *   flat at z ±2.95 on its axis (±2.4 to 3.5 across its section) and its
 *   head stands at y 5.3, z ±1.24, 1.5 m above the dome's pole; the
 *   nearest strut surface is 2.4 to 2.7 m from the stone's
 *   (`contacts.mjs --part cage_strut --near` names no dome pair at 2.4
 *   and all four at 2.7) — in x alone 1.1 m, dome ±3.42 against a strut
 *   5 m from its centre with r 0.4–0.5. Nothing touches the dome, and no
 *   alloy shows on
 *   the flank (the inspect sheet's `--view flank:90:8:0.35`).
 * - **The rostrum and the telson** are the Chorister's prisms (`point`):
 *   an alloy bow prism 9 m long on 2.2 m of half-diagonal, its tip the bow
 *   and its base inside the fore segment's nose; a crystal drive prism 6 m
 *   long on 1.8, born apex-up and laid with its point forward into the
 *   stern segment, its base ring the stern. Both dark.
 * - **The limbs** (`plantedLimbs`, written for this hull): hips are alloy
 *   blocks 2.0 by 1.6 by 1.8 on the flank facet 0.8 m under the axis, sunk
 *   0.6; a four-facet alloy femur 0.9 to 0.7 m in radius 5 m out and 3.2
 *   up to an alloy knee block 2.4 by 1.8 by 2.0 with its top level; a
 *   four-facet tibia 0.7 to 0.5 m 4 m out and 6 down to the ankle; and a
 *   crystal point 0.8 by 2.4 m planted point-down from it — the Order's
 *   hydrophone, the stone the Clarion's emitter and the Verger's boss are
 *   cut from. The Directorate's bones and reaches, translated. Knees stand
 *   at (14.8, 2.4, ±8.3), (−1, 2.4, ±10.9) and (−16.8, 2.4, ±8.3); feet
 *   plant at (17.1, ±11.6), (−1, ±14.9) and (−19.1, ±11.6), their tips at
 *   y −6.0, 3.2 m under the middle segment's keel at −2.8: the hull stands
 *   on them, which is what "planted" is.
 *
 * LIGHT. "Nearly black: a photophore on each limb's knee" — six, three
 * mirrored pairs, each a `crystal_seam` box 1.0 by 0.3 by 0.8 (the
 * Verger's bow mark's size) with its underside on its knee's level top, at
 * strength 1, the Chorister's (SIG 16) and the Verger's (SIG 14): the two
 * quietest Order hulls carry the lamp at 1 and this is quieter than both.
 * Every Order hull is lit from the bow back and dark astern; here the SIG
 * is the kind's omnidirectional 10 and not a cone figure, so there is no
 * loud quarter to put the light in, and the block lights every knee. An
 * aft pair clad `crystal_seam_unlit` was considered and refused: it would
 * draw a hull with four ears, and the block says six. What is honoured is
 * the stern: no lamp sits abaft the aft knees at x −16.8, and the after
 * 12 m — the stern segment's tail, the aft spine, the drive prism — is
 * dark, as is everything on the centreline. Figures measured
 * (`lightAudit`, printed by `exportGlb`; the intake bake): six lit parts,
 * 5.1 m² facing up, 0.8–0.9 m² each, every one resting on its knee, none
 * hidden, none floating. 5.1 m² on 570 m² of plan (2,280 mask px at
 * 2 px/m). The bake at E(10) = 0.92 reads raw E 8.35 (8.73 at the maps'
 * 4 px/m) and dims by ×0.105: nearly seven times clear of the ×1/64 floor
 * the quiet end must not touch (§3.2), beside the Directorate's ×0.129 and
 * the Verger's ×0.143. 48 parts, 728 triangles, bounds x ±29, y −6.0..5.6,
 * z ±15.7.
 *
 * FACETS and PANELS (Block 2c; `node tools/hull-models/facets.mjs hadron`):
 * every ring the Order cuts is on the rule — the segments, spines, prisms,
 * struts and bones the diamond, the dome eight round by two down at
 * 3.6 m (`cut`), whose local bounds are the drawn ±3.42 m (parts.mjs).
 * The median unlit
 * part from above is 1.9 m on a side over 38, under the hulls' floor of
 * 2, for the Versicle's reason (hulls/versicle.mjs): thirty of the
 * thirty-eight are limb parts of 1–3 m², and a median at the floor on a
 * shell of 95 m² would need the shell cut into more plates of 4 m² than
 * it has. The shell carries no seams; the waists and the dome divide it.
 *
 * TRIM (#1109): none laid, as the Chorister's and the Verger's Order
 * variants lay none; the Responsory is the navy's one hull on the sheet.
 * A first export laid it, and facets.mjs then read the dome at "8 a turn
 * at r 6.77 m": the sphere's UV seams split by trim.mjs widen the chord
 * the reader takes, a reader fault and not the stone's.
 *
 * Contacts (`node tools/hull-models/contacts.mjs acolyte-hadron`): 63
 * pairs, every one a mount — each segment into the next, each spine run
 * sunk in its segments and into its prism, the dome and the struts in the
 * middle segment, each hip in its flank with its femur, each femur into
 * its knee, each tibia into its knee and foot, each mark on its knee. 33
 * parts reach under y 0, which on a hull is the axis and not the ground:
 * the shell's keel at −2.8, the hips, the struts' feet, and the limbs down
 * to the planted feet at −6.0, which is the stance. No lamp is hidden and
 * none floats (`exportGlb`, no warning).
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 58;
const BOW = L / 2;
const STERN = -L / 2;

/** The shell's section: the Chorister's blade, four facets pressed 0.6 tall by 1.4 wide. */
const SHELL = [0.6, 1.4];
/** A four-facet spar's flat is at cos 45° of its radius (`spar`, "four facets sit on a flat"). */
const FLAT = Math.SQRT1_2;

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();

const root = new THREE.Group();
root.name = 'hadron_acolyte';

/**
 * The three segments, stern first: `[name, x, half-length, radius]`, each a
 * four-facet spar drawn about its own middle as the Chorister's are, a
 * double-ended wedge tapering to 0.3 over the outer half of each end. The
 * middle is the broadest and the longest; the outer two match.
 */
const SEGMENTS = [
  ['segment_2', -17, 8.5, 4.8],
  ['segment_1', -1, 10.5, 6.6],
  ['segment_0', 14, 8.5, 4.8],
];
/** A segment's radius at `x`, 0 off its length. */
const segmentRadius = ([, cx, half, r], x) => {
  const u = Math.abs(x - cx);
  if (u >= half) return 0;
  return u <= half / 2 ? r : r - (r - 0.3) * ((u - half / 2) / (half / 2));
};
/** The shell's radius at `x`: the fullest segment there. */
const radius = (x) => Math.max(...SEGMENTS.map((s) => segmentRadius(s, x)));
/** The crown's height at `x`: the flat top under the press; the keel is its mirror. */
const crown = (x) => radius(x) * FLAT * SHELL[0];
/** The flank's half-beam at `x`: the vertical facet a flat-laid spar has. */
const flank = (x) => radius(x) * FLAT * SHELL[1];

// The shell: three segments, shadow indigo, drawn stern first as the
// Chorister's are, each on its own middle.
for (const [name, x, half, r] of SEGMENTS)
  hadron.spar(root, name, shadow, {
    profile: [
      [-half, 0.3],
      [-half / 2, r],
      [half / 2, r],
      [half, 0.3],
    ],
    x,
    flat: SHELL,
  });

// The spine along the crown in two runs, aft and fore of the dome, each a
// four-facet alloy ridge sheared to the crown's own rise and fall (a
// station's third number), its axis 0.15 m under the crown so it stands
// 0.34 m proud on the flats and dips with the seams between segments.
const SPINE = [0.7, 1];
const spineAxis = (x) => crown(x) - 0.15;
const spineRun = (name, stations) =>
  hadron.spar(root, name, alloy, {
    profile: stations.map(([x, r]) => [x, r, spineAxis(x)]),
    flat: SPINE,
  });
spineRun('spine_aft', [
  [-24.5, 0.3],
  [-21, 1.0],
  [-17, 1.0],
  [-13, 1.0],
  [-10, 1.0],
  [-7, 1.0],
  [-4.5, 0.3],
]);
spineRun('spine_fore', [
  [2.5, 0.3],
  [5, 1.0],
  [8, 1.0],
  [11, 1.0],
  [14, 1.0],
  [18, 1.0],
  [20.5, 0.3],
]);

// The rostrum and the telson: an alloy bow prism, its tip the bow at x 29
// and its base inside the fore segment's nose; a crystal drive prism at the
// stern, born apex-up and laid with its point forward into the shell as the
// Chorister's is, its base ring the stern at −29. Both dark.
hadron.point(root, 'bow_prism', alloy, { x: BOW - 4.5, r: 2.2, length: 9 });
hadron.point(root, 'drive_prism', crystal, { x: STERN + 3, r: 1.8, length: 6, tipUp: true });

// The listening dome sunk low into the middle segment: a crystal stone of
// 3.6 m pressed 0.8, drawn past its equator so its skirt is inside the
// shell, its pole a metre proud of the segment's 2.8 m crown. No boss: the
// kind lights its knees and nothing else.
hadron.listeningDome(root, { crystal, seam }, { x: -1, y: 0.92, r: 3.6, press: 0.8, boss: null });

// The cage: four alloy struts over the middle segment leaned 0.6 rad in,
// framing the dome — the Chorister's frame round its bladder — each foot
// ring inside the shell's flank facet, each strut rising through the crown
// flat beside the dome and its head standing clear above the pole (the
// header has the measured section).
hadron.cage(root, alloy, { r: [0.4, 0.5], length: 8, at: [5, 2.0, 3.5], lean: 0.6, x: -1 });

// The six hydrophone limbs, walked out and planted as three mirrored pairs
// (the header): hips 0.8 m under the axis on the flank facet, a femur 5 m
// out and 3.2 up to the knee, a tibia 4 m out and 6 down to the ankle, and
// a crystal point 2.4 m planted from it. The fore pair raked 0.6 rad ahead,
// the aft pair 0.6 astern, the middle pair square.
const RAKE = 0.6;
hadron.plantedLimbs(
  root,
  { alloy, crystal, light: seam },
  {
    flank,
    pairs: [
      { x: 12, rake: RAKE },
      { x: -1, rake: 0 },
      { x: -14, rake: -RAKE },
    ],
    mark: [1.0, 0.3, 0.8],
  }
);

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'acolyte-hadron.glb');
