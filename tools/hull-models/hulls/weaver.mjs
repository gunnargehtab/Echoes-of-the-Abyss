/**
 * The Weaver — the Commune's decoy-layer, 70 m (docs/units.md, "The
 * ordnance hulls"; #785, off #540 Phase 4).
 *
 * "The lie, 70 m — three noisemakers in a magazine, laid on the move ahead
 * of an approach, and no weapon on the hull itself (SIG 12 idle, 22
 * cruise; each laid decoy 45 for 25 s, astern of it; no weapon; 320 hull;
 * 75 m/s). A grown stem with three decoy pods strung along it like seeds on
 * a stalk: a fine nose, a slim seed body with growth rings, then three
 * bulbs in a row down the aft two thirds, each a smooth bladder the same
 * size as the one before it, so the plan is a beaded thread and the beads
 * are the count; the aftmost sits at an open lay port in the tail, a
 * muscle-drive fluke behind it, a pair of leaf trim vanes forward. The
 * pods are not the Spinner's sacs and not tubes: each is a whole bladder
 * that leaves the hull, and the stem is what stays. Nearly black at rest,
 * navigation marks only; under way a dim vein along the stem, and the pods
 * dark, because a decoy is dark until it is laid and loud after — the
 * light this hull makes is behind it in the water, never on it."
 *
 * Built to that block and not ported from a binary, as the Drifter and
 * the Glider were (#783, #784): the nose, the stem and its rings, the
 * vanes, the fluke, the vein and the marks are the module's existing
 * vocabulary, and the beads and the lay port are two builders added to
 * `factions/pelagia.mjs` for it, with the Glider's tail knuckle lifted
 * out of `foldedTail` into a builder of its own so the fluke here can
 * hinge on the same orb. Metre-true at 70 with no root scale — the nose's
 * apex is the bow at x 35 and the fluke's bevel the stern at −35, and
 * `metreTrue` returns 1. Port is −z (#642); every part that has a side is
 * placed at its own signed z, one at a time, never through `bothSides`
 * (docs/models-plan.md §3.6).
 *
 * What the script decided that the block does not say — the block stands
 * unamended, because none of these departs from it:
 *
 * - **The beads are on the thread, not beside it.** "Strung along it like
 *   seeds on a stalk", "a beaded thread": each pod is centred on the
 *   stem's axis so the stem runs through it, and a bead leaves the way a
 *   bead leaves a thread, off its open end astern. That is the difference
 *   from `mineSacs`, which grow on a flank and stay there. Three of one
 *   size — r 5.4, 10.8 m across and 7.8 tall, 0.154 of the length — at x
 *   6.5, −8 and −22, so the run begins at 0.17 L, the block's aft two
 *   thirds, and the waist of bare stem between beads is 3.1–3.7 m: at the
 *   chart's 4 px/m that is 13 px of thread between 43 px beads. One size
 *   is the block's own rule, and `decoyPods` says why the navy's refusal
 *   of a matched pair is set aside for a magazine; what stays grown is
 *   that each is rolled and pitched its own three degrees off square.
 * - **What an open lay port is.** The stem's own skin flared open astern
 *   (`layPort`): a cup of chitin from the throat at x −16.5, where the
 *   stem's lathe ends at 4.4 m across, out to a mouth 11.9 m across at
 *   −24.5, a ridge lip round the mouth, and the membrane that sheathed the
 *   last bead peeled back off the rim in three sepals — at 50°, 145° and
 *   265° round from starboard, 3.4, 2.7 and 3.1 m long, none a pair and
 *   none at the crown. The third bead sits in the cup with its equator
 *   2.5 m inside the mouth and a quarter of it proud in the water, the cup's wall 0.3 m
 *   clear of it at every station, because both are polygons of fourteen
 *   and sixteen facets and a vertex of one would show through a flat of
 *   the other at less. In plan the cup and the cap it holds are 10.9 m
 *   long by 11.9 wide — bead-sized — which is what keeps the count three.
 * - **Where the fluke hangs.** The block puts the fluke behind the port; a
 *   bead leaves aft, so the water astern of the mouth has to stay clear,
 *   and the drive cannot root on the body as the Drifter's does. It hinges
 *   on a knuckle under the lip (`tailKnuckle`, the Glider's) and its
 *   paddle lies 5.4 m under the axis: a neck 3 m wide running aft past the
 *   third bead's pole at −27.4, then a blade 8.3 m across and 5 m long,
 *   wider than long as a fluke is, its port lobe the shorter. The neck is
 *   the point: the first draft put the blade's leading edge at the bead's
 *   pole, and from throat to stern the tail read as one 18 m mass, four
 *   beads or three and a half. With a waist between the third bead and
 *   the blade, the outline is thread, bead, bead, bead, tail.
 * - **The vein, dark and off the crown line.** "Under way a dim vein along
 *   the stem" is a later band, so it is built and clad in `bio_vein_unlit`
 *   (docs/models-plan.md §3.2 rule 2; the Glider's tail veins are the
 *   precedent): one tube of r 0.14 swept along the seed body's crown from
 *   x 27.4 to 12.2, humping over each of the three rings, and lying
 *   0.15–0.42 m to starboard of the crown line — the navy's asymmetry in
 *   the dressing, and it leaves the crown line to the bow mark. It stops
 *   at the first bead: along the run it would be inside the beads.
 * - **Two marks.** The band table's floor row and the block's plural: one
 *   on the crown at x 23.5, between the first and second rings, a fifth
 *   of a metre to port; one on the lip's crest at the mouth, half a metre
 *   to starboard, so the tail says which way the hull is facing. Both at
 *   strength 1, as the Spinner's two, the Drifter's one and the Glider's
 *   two are — and nothing else on the hull is lit: the pods carry no lamp
 *   (§3.2 rule 4), the sepals are membrane, the vein is clad.
 * - **Two vanes, not a pair.** "A pair of leaf trim vanes forward" read as
 *   the Drifter's block reads it: one a side, each its own size and rake.
 *   The port one is the larger, rooted at x 19.5 and dipped 17°; the
 *   starboard at 16.5, dipped 24°. `trimVanes` would refuse them matched.
 *   The port vane's tip reaches z −5.59, 0.19 m outboard of a bead's ±5.4,
 *   and stays: the two vanes are 3 m apart in x, so they make no symmetric
 *   lobe, and the generated outline reads them at ±0.078 and ±0.066 against
 *   the beads' ±0.075..0.085.
 * - **Three rings, all forward.** At x 26, 21 and 14, on the seed body
 *   where the block puts them, each a 0.6 m ridge cresting 0.4 m proud of
 *   the skin and leaned its own way. None on the bead run: a ring in a
 *   3 m waist would fill it, and the waists are what make the beads count.
 * - **How slim the thread is.** 5 m across at its fullest (x 17), 4.2–4.4
 *   along the run — 0.07 of the length, where the Glider's stem is 0.13
 *   and the Drifter's body 0.18. The beads are the hull's volume; the
 *   thread is what is left when they are gone, and the block says so.
 *
 * The light, measured (`lightAudit`, printed on export): nav_bow 0.75 m²,
 * nav_tail 0.75 — 1.5 m² facing up on a 507 m² plan, nothing hidden. The
 * bake at E(12) = 1.06 reads raw E 1.65 → calibrated 1.06 at a gain of
 * ×0.640: 41× above the ×1/64 floor docs/models-plan.md §3.2 warns the
 * quiet end about and a hundredfold under the ×64 ceiling, with no lamp
 * but the two marks — the Glider's raw 4.34 at E(8) and the Drifter's
 * 5.75 at E(4) both carry a vein or a seam this hull does not light.
 * 20 parts, 2,104 triangles, bounds x ±35, y −6.0..5.3, z ±6.3; the
 * 12.7 m beam is the lip, and the 11.3 m of height is the fluke under the
 * cup against the tail mark on the lip's crest over it (the intake's box
 * reads 11.7, three's bounding box overstating the rotated sepals).
 *
 * The hand-drawn entry in silhouettes.ts stays until the kind is wired
 * (docs/models-plan.md §2); the generated outline will read the beads at
 * ±0.077 and the thread at ±0.03 of the length.
 */
import { THREE, exportGlb, metreTrue } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts); the file is drawn to it. */
const L = 70;
const BOW = L / 2;
const STERN = -L / 2;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const veinUnlit = pelagia.ink.bioVeinUnlit();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'pelagia_weaver';

const SQUASH = 0.8;
const FACETS = 14;
const FLAT = Math.cos(Math.PI / FACETS);

/**
 * The stem's stations, [x, r] in metres: the thread. Open at the nose root
 * where the cone covers it, swelling to 5 m across at x 17 — the seed body
 * the rings and vanes sit on — then held at 4.2–4.4 m down the bead run
 * and open again at the throat where the lay port's cup takes over.
 */
const PROFILE = [
  [-16.5, 2.2],
  [-8, 2.1],
  [0, 2.15],
  [6, 2.2],
  [12, 2.35],
  [17, 2.5],
  [21, 2.3],
  [25, 1.7],
  [28.2, 1.0],
];

const rAt = (x) => {
  for (let i = 1; i < PROFILE.length; i++) {
    const [x0, r0] = PROFILE[i - 1];
    const [x1, r1] = PROFILE[i];
    if (x <= x1) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return PROFILE[PROFILE.length - 1][1];
};
/** The crown's height at `x`: the squashed radius, on the flat a fourteen-facet loft turns up. */
const crownAt = (x) => rAt(x) * SQUASH * FLAT;

/** Where the stem's rings sit, and how far proud of the skin their crests ride. */
const RING_X = [26, 21, 14];
const RING_TUBE = 0.6;
const RING_SINK = 0.2;
const ringCrestAt = (x) => (rAt(x) - RING_SINK + RING_TUBE) * SQUASH * FLAT;

/** The beads: three, one size, centred on the stem's axis. */
const POD_R = 5.4;
const POD_SQUASH = 0.72;
const POD_X = [6.5, -8, -22];

/** The lay port's cup, throat to mouth, and its lip. */
const CUP = [
  [-24.5, 5.95],
  [-23, 5.9],
  [-22, 5.8],
  [-21, 5.65],
  [-20, 5.35],
  [-19, 4.85],
  [-18, 4.0],
  [-17.2, 2.9],
  [-16.5, 2.2],
];
const LIP = { tube: 0.4, rise: 0.4, halfWidth: 0.6 };
const [MOUTH_X, MOUTH_R] = CUP[0];
const lipCrest = (MOUTH_R + LIP.tube) * SQUASH * FLAT;

pelagia.nose(root, ridge, { tip: BOW, r: 1.1, length: 7, facets: 6 });
pelagia.stem(root, { chitin, ridge }, { profile: PROFILE, facets: FACETS, squash: SQUASH });
pelagia.growthRings(root, ridge, {
  name: 'stem_ring',
  stations: RING_X.map((x) => [x, rAt(x) - RING_SINK]),
  squash: SQUASH,
  tube: RING_TUBE,
  wobble: 0.06,
  ring: { rise: 0.6, facets: FACETS },
});

pelagia.decoyPods(root, chitin, {
  stations: POD_X,
  r: POD_R,
  squash: POD_SQUASH,
  lean: 0.05,
});

pelagia.layPort(
  root,
  { chitin, ridge, membrane },
  {
    profile: CUP,
    squash: SQUASH,
    facets: FACETS,
    lip: LIP,
    sepals: [
      { angle: 0.87, length: 3.4, width: 2.8, curl: 0.4 },
      { angle: 2.53, length: 2.7, width: 2.3, curl: 0.28 },
      { angle: 4.63, length: 3.1, width: 2.5, curl: 0.34 },
    ],
  }
);

// Trim vanes forward, one a side and not a pair: the port one the larger.
pelagia.trimVanes(root, membrane, {
  vanes: [
    {
      side: 'p',
      root: [19.5, -0.3, -2.0],
      corners: [
        [1.6, 0],
        [2.6, 1.4],
        [1.9, 3.0],
        [0.2, 3.7],
        [-1.6, 3.2],
        [-2.4, 1.6],
        [-2.4, 0],
      ],
      roll: 0.3,
    },
    {
      side: 's',
      root: [16.5, -0.2, 2.1],
      corners: [
        [1.2, 0],
        [2.0, 1.1],
        [1.4, 2.3],
        [0.1, 2.9],
        [-1.2, 2.5],
        [-1.9, 1.2],
        [-1.9, 0],
      ],
      roll: 0.42,
    },
  ],
});

// The muscle-drive fluke, hinged on a knuckle under the lip.
const FLUKE_Y = -5.4;
const BEVEL = 0.2;
pelagia.tailKnuckle(root, ridge, { at: [-23.5, -4.95, 0], r: 1.4, squash: 0.75 });
pelagia.driveFluke(root, membrane, {
  y: FLUKE_Y,
  t: 0.4,
  bevel: BEVEL,
  outline: [
    [-22.5, 1.0],
    [-27, 1.5],
    [-29.6, 2.0],
    [-31.4, 3.9],
    [-33.4, 4.3],
    [STERN + BEVEL, 2.2],
    [STERN + BEVEL, -1.5],
    [-33.0, -4.0],
    [-30.8, -3.5],
    [-29.4, -1.7],
    [-27, -1.3],
    [-22.5, -0.9],
  ],
});

// The stem vein, dark: under way only, so clad in the vein's unlit finish.
const VEIN_R = 0.14;
const VEIN_SINK = 0.05;
const veinY = (x) => (RING_X.includes(x) ? ringCrestAt(x) : crownAt(x)) + VEIN_R - VEIN_SINK;
pelagia.sweptVein(root, veinUnlit, {
  name: 'stem_vein',
  through: [
    [27.4, 0.15],
    [26, 0.2],
    [24, 0.3],
    [21, 0.38],
    [18, 0.42],
    [14, 0.36],
    [12.2, 0.3],
  ].map(([x, z]) => [x, veinY(x), z]),
  steps: 40,
  r: VEIN_R,
  facets: 5,
});

// "Nearly black at rest, navigation marks only": two marks.
pelagia.navMarks(root, light, {
  marks: [
    ['nav_bow', 23.5, crownAt(23.5) + 0.15, -0.2],
    ['nav_tail', MOUTH_X, lipCrest + 0.15, 0.5],
  ],
  w: 0.8,
  h: 0.4,
  d: 0.6,
});

metreTrue(root, L, { drawn: L });
await exportGlb(root, 'weaver-pelagia.glb');
