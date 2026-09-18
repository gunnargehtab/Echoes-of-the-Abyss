/**
 * The Blight — the Commune's siege hull, 80 m (docs/units.md, "The siege
 * hulls"; #786, off #540 Phase 4).
 *
 * "The spore, 80 m — a hull that seeds a Deepbloom strain on a structure
 * at 350 m and leaves, and the strain eats 1% of the wall's maximum hull a
 * second for 60 s, 60% of it and never the last, while the wall's own SIG
 * never moves (SIG 10 idle, 20 cruise, and no working figure; no weapon;
 * 340 hull; 60 m/s; 300 nodules and 60 Resonance Crystal). A split seed: a
 * slim grown pod with growth rings, widest a little forward of amidships
 * and never wider at the bow than at the waist, its husk parted at the
 * bow into two rounded lobes that curl outward, and standing in the cleft
 * between them the seeding arm — a short jointed stem folded back on
 * itself with the spore head at its tip, a pale sac under a membrane,
 * reaching no further than the husk's own lips; one spore sac sunk into
 * the back amidships, showing through the shell as a paler dome; leaf
 * trim vanes forward; a muscle-drive fluke astern. The arm does not reach
 * and is not a boom: this hull seeds by coming close and touching, and
 * the plan is a pod with a cleft nose, curved everywhere, not a fork. The
 * model is the hull with its husk open and the arm presented, which is
 * the state it seeds in; under way the lobes close over it and it is a
 * seed again. Nearly black at rest, navigation marks only, the sac's dome
 * unlit; under way a dim vein along the stem. Nothing on it brightens
 * when it seeds — no flare at the arm, no light in the sac, no change on
 * the wall — because the silence is the weapon: every other way of taking
 * a wall down announces itself, and this one is a Refinery whose hull is
 * falling with nothing to hear."
 *
 * Built to that block and not ported from a binary, as the Weaver, the
 * Glider and the Drifter were (#785, #784, #783): the pod, its rings, the
 * sac, the vanes, the fluke, the vein and the marks are the module's
 * existing vocabulary, and the parted husk and the seeding arm are two
 * builders added to `factions/pelagia.mjs` for it, with `bladder` given a
 * `name` and a `z` so the sac can be the Sower's orb in another finish
 * off the keel line. Built in its state, as docs/models-plan.md §3.5 says
 * a stated hull is: the husk open, the arm presented. Metre-true at 80
 * with no root scale — the starboard lobe's tip is the bow at x 40 and
 * the fluke's bevel the stern at −40, and `metreTrue` returns 1. Port is
 * −z (#642); every part that has a side is placed at its own signed z,
 * one at a time, never through `bothSides` (§3.6) — the two lobes are a
 * pair only because the block counts two, and each is its own lathe at
 * its own z, curl and roll, as the Weaver's beads are each leaned their
 * own way.
 *
 * What the script decided that the block does not say — the block stands
 * unamended, because none of these departs from it:
 *
 * - **How a husk parts.** A lathe cannot be split, so the lobes are two
 *   lathes laid beside a nose that closes blunt between them
 *   (`huskLobes`): the body's own profile draws in from 5.1 m at x 20 to
 *   4.0 at 27 and shuts at 30.8, inside the cleft, and each lobe is lathed
 *   on twelve facets with its aft station at x 21 buried in the body
 *   (r 1.1 against the body's 4.85 there), emerging from the flank at
 *   about 25.5, fullest at x 30 — 4.8 m across and 4.1 tall to starboard,
 *   4.6 by 3.9 to port, squashed 0.85 — and closing to a blunt tip at 40
 *   and 39.4. Their axes lie at z ±2.75 and −2.7, and from x 27 each is
 *   curled outboard in the geometry, on a quadratic, by 1.3 and 1.1 m at
 *   the tip (`curlOutboard`): bent, not yawed, because a lathe yawed off
 *   the keel is a splayed tine and a tine is what a fork has. The first
 *   cut was that — r 2.35 lathes over 16 m of cleft, drawn to points —
 *   and the 8 px/m maps read two tines on a pod. The second swelled the
 *   lobes to r 2.6 at ±2.9 while the body drew in to 4.0 under them, and
 *   the nose read as a bulb on a neck. This one holds the outer envelope
 *   on the body's own taper — 5.2 at x 30, 5.46 at 35.5, 4.05 at the
 *   tips, against a 6.8 waist — so the bow is 10.9 m across at its
 *   fullest, 0.8 of the waist, and never wider than it.
 * - **How deep the cleft is.** The lobes' inner faces part where the nose
 *   shuts, at x 31, a metre's slit, and open to 2.4 m at 35.5, 3.9 at 37.5
 *   and 7.9 m between the tips: 9 m deep, 0.11 of the length, where the
 *   hand-drawn outline this model replaces drew 0.18 and the Herald's
 *   mouth is 20 m on 65. `outlines.mjs` closes every bow at the mean of
 *   the first station's extremes, as it does the Herald's, so the track a
 *   scope resolves is a blunt bow at ±0.056 and the cleft is the maps'
 *   and the conn view's to show.
 * - **Where the arm stands, and how it folds.** The root is a knuckle of
 *   ridge r 1.0 at (28.4, 1.9, 0.3), half-sunk in the nose's crown where
 *   the lobes' inner faces are 4 m apart at that height; the first stem,
 *   seven-sided and r 0.55 to 0.42, rises 7.3 m forward to an elbow orb of
 *   r 0.85 at (35.2, 4.4, −0.15); the second, r 0.42 to 0.32, folds 3.3 m
 *   back to a wrist at (32.6, 6.3, 0.4), and the head sits there: a sac
 *   of r 1.7 in the spore-pale finish, 3.4 m across, under a membrane hood
 *   of r 1.94 covering its crown and its back through 198° and open
 *   forward and below, pitched 0.3 rad nose-up so the sac presents forward
 *   and up (`seedingArm`). The elbow's front at x 36.05 is the arm's
 *   foremost point, 4 m inside the lips at 40; the head lies in the
 *   cleft's after half, over the slit. "Presented" is why it stands: the
 *   hood's crown at 8.5 m is the hull's highest point, 3.7 above the
 *   body's 4.8, and in plan the head is a pale dot between the lobes'
 *   shoulders with the elbow's dark orb ahead of it.
 * - **What a sunk sac is.** The Sower's `bladder` orb in `spore_pod`
 *   rather than chitin, r 3.9 and squashed 0.6 — 7.8 m across, 4.7 tall —
 *   centred at (−2, 3.4, 0.6) so its crown at 5.74 rides 1.1 m proud of
 *   the body's at 4.6: it shows through the top flat within a 6.7 m cap
 *   and further down the shoulders, which the maps read as a 7 by 7.5 m
 *   pale oval. Six tenths to starboard, as the Chorister's is off its
 *   centreline. No ring — a ridge lathed round a dome this deep in the
 *   body would crest above the dome — and no lamp (§3.2 rule 4).
 * - **The vein, dark, from the arm to the sac.** "Under way a dim vein
 *   along the stem" is a later band, so it is built and clad in
 *   `bio_vein_unlit` (§3.2 rule 2; the Weaver's stem vein and the
 *   Glider's tail veins are the precedent): one tube of r 0.16 swept along
 *   the crown from the root knuckle's aft edge at x 27.4 to the dome's
 *   forward rim at 3.4, humping over the rings at 20 and 13, and lying
 *   0.25–0.75 m to port of the crown line — the seeding organ's one
 *   vascular line, root to sac. It stops at the dome, where it would be
 *   inside it, and it leaves the crown line to the bow mark.
 * - **Two marks.** The band table's floor row and the block's plural: one
 *   on the crown at x 17.5, between the two forward rings, 0.3 m to
 *   starboard; one on the fluke's top face at x −35, 0.6 to port, so the
 *   tail says which way the hull is facing. Both at strength 1, as the
 *   Weaver's, the Glider's and the Drifter's — and nothing else on the
 *   hull is lit: the sac, the head and the hood carry no lamp, the vein
 *   is clad.
 * - **Two vanes, not a pair, and under the waist.** "Leaf trim vanes
 *   forward" read as the Drifter's and the Weaver's: one a side, each its
 *   own size and rake, the starboard the larger this time — 4.9 m of chord
 *   and 2.6 out, rooted at (17, −1.7, 4.5) and dipped 0.5 rad; the port
 *   3.9 by 2.2 at (16, −1.6, −5.0), dipped 0.6. Their tips reach z ±6.8,
 *   the waist's own half-beam and not over it: the first cut reached 7.1,
 *   and a vane proud of the waist forward of it is a second swelling on a
 *   pod the hand-drawn outline says is swollen once.
 * - **Four rings, none over the sac.** At x 20, 13, −9 and −17, each a
 *   0.75 m ridge cresting 0.5 m proud of the skin and leaned its own way:
 *   the forward pair either side of the bow mark and clear of the lobes'
 *   buried roots at 21 and the vanes' chords, the after pair on the long
 *   taper astern. None between 5 and −8, where a ring would run through
 *   the dome.
 * - **The fluke, off the peduncle.** One paddle at y 0, from x −30 inside
 *   the body's tail (r 0.8 at −31) to the stern, 10.3 m across at −36 and
 *   10 long, its port lobe the shorter and both drawn round on fourteen
 *   corners. It roots on the body as the Drifter's does; there is no
 *   knuckle, because nothing leaves this hull astern.
 * - **How slim the pod is.** 13.6 m across at x 6 and 9.8 tall — 0.17 of
 *   the length, beside the Drifter's 0.18 and the Spinner's 0.3 — and
 *   drawn out 37 m astern of the waist against 25 forward of it, so the
 *   swelling favours the bow as the block says without the bow being it.
 *
 * The light, measured (`lightAudit`, printed on export): nav_bow 0.5 m²,
 * nav_tail 0.75 — 1.3 m² facing up on an 842 m² plan, nothing hidden. The
 * bake at E(10) = 0.92 reads raw E 1.00 → calibrated 0.92 at a gain of
 * ×0.921: 59× above the ×1/64 floor docs/models-plan.md §3.2 warns the
 * quiet end about and 69× under the ×64 ceiling, with no lamp but the two
 * marks — the Weaver's raw 1.65 on a 507 m² plan is the same two marks
 * on a smaller hull. 20 parts, 2,468 triangles, bounds x ±40, y −4.9..8.6,
 * z ±6.9; the 13.6 m beam is the waist and the 13.5 m of height is the
 * hood over the head against the keel under the waist (the intake's box
 * reads 13.8 across, three's bounding box overstating the rolled vanes).
 *
 * The hand-drawn entry in silhouettes.ts stays until the kind is wired
 * (docs/models-plan.md §2); the generated outline will read the waist at
 * ±0.085, the bow at ±0.056 and the fluke at ±0.07.
 */
import { THREE, exportGlb, metreTrue } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts); the file is drawn to it. */
const L = 80;
const BOW = L / 2;
const STERN = -L / 2;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const spore = pelagia.ink.sporePod();
const veinUnlit = pelagia.ink.bioVeinUnlit();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'pelagia_blight';

const SQUASH = 0.72;
const FACETS = 14;
const FLAT = Math.cos(Math.PI / FACETS);

/**
 * The pod's stations, [x, r] in metres: a seed, widest at x 6 — a little
 * forward of amidships — at 13.6 m across and 9.8 m tall, drawn out long
 * astern to the peduncle the fluke grows from, and closed blunt at x 30.8
 * inside the cleft, where the husk's two lobes have already taken over
 * the skin.
 */
const PROFILE = [
  [-31, 0.8],
  [-28, 1.7],
  [-24, 2.9],
  [-18, 4.3],
  [-11, 5.6],
  [-4, 6.4],
  [2, 6.75],
  [6, 6.8],
  [11, 6.55],
  [16, 5.9],
  [20, 5.1],
  [24, 4.8],
  [27, 4.0],
  [29, 2.7],
  [30.3, 1.3],
  [30.8, 0.12],
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

/** Where the rings sit, and how far proud of the skin their crests ride. */
const RING_X = [20, 13, -9, -17];
const RING_TUBE = 0.75;
const RING_SINK = 0.25;
const ringCrestAt = (x) => (rAt(x) - RING_SINK + RING_TUBE) * SQUASH * FLAT;

pelagia.podBody(root, chitin, { squash: SQUASH, facets: FACETS, profile: PROFILE });
pelagia.growthRings(root, ridge, {
  stations: RING_X.map((x) => [x, rAt(x) - RING_SINK]),
  squash: SQUASH,
  tube: RING_TUBE,
  wobble: 0.06,
  ring: { rise: 0.75, facets: FACETS },
});

// The husk, parted: two lobes, one a side, each its own size and curl.
pelagia.huskLobes(root, chitin, {
  lobes: [
    {
      side: 's',
      z: 2.75,
      profile: [
        [21, 1.1],
        [24, 1.95],
        [27, 2.3],
        [30, 2.4],
        [33, 2.35],
        [35.5, 2.15],
        [37.5, 1.75],
        [39.1, 1.2],
        [39.7, 0.7],
        [BOW, 0.001],
      ],
      from: 27,
      curl: 1.3,
      roll: 0.07,
    },
    {
      side: 'p',
      z: -2.7,
      profile: [
        [21, 1.05],
        [24, 1.85],
        [27, 2.2],
        [30, 2.3],
        [32.5, 2.25],
        [35, 2.05],
        [37, 1.65],
        [38.6, 1.1],
        [39.2, 0.65],
        [39.4, 0.001],
      ],
      from: 27,
      curl: 1.1,
      roll: -0.09,
    },
  ],
});

// The spore sac, sunk into the back amidships: a paler dome, no ring, no lamp.
pelagia.bladder(
  root,
  { chitin: spore, ridge },
  {
    name: 'spore_sac',
    x: -2,
    y: 3.4,
    z: 0.6,
    r: 3.9,
    squash: 0.6,
  }
);

// Leaf trim vanes forward, one a side and not a pair: the starboard the larger.
pelagia.trimVanes(root, membrane, {
  vanes: [
    {
      side: 's',
      root: [17, -1.7, 4.5],
      corners: [
        [1.9, 0],
        [2.5, 1.0],
        [1.9, 2.1],
        [0.3, 2.6],
        [-1.3, 2.3],
        [-2.3, 1.2],
        [-2.4, 0],
      ],
      roll: 0.5,
    },
    {
      side: 'p',
      root: [16, -1.6, -5.0],
      corners: [
        [1.5, 0],
        [2.0, 0.85],
        [1.5, 1.75],
        [0.2, 2.2],
        [-1.1, 1.95],
        [-1.8, 0.95],
        [-1.9, 0],
      ],
      roll: 0.6,
    },
  ],
});

// The muscle-drive fluke, one paddle off the peduncle, its port lobe the shorter.
const BEVEL = 0.2;
pelagia.driveFluke(root, membrane, {
  y: 0,
  t: 0.4,
  bevel: BEVEL,
  outline: [
    [-30, 1.2],
    [-31.6, 2.6],
    [-33.4, 4.3],
    [-35.5, 5.4],
    [-37.6, 5.4],
    [-39.1, 3.8],
    [STERN + BEVEL, 1.8],
    [STERN + BEVEL, -1.4],
    [-39.0, -3.3],
    [-37.2, -4.8],
    [-35.2, -4.9],
    [-33.4, -4.0],
    [-31.6, -2.4],
    [-30, -1.0],
  ],
});

// The seeding arm, standing in the cleft and presented.
pelagia.seedingArm(
  root,
  { ridge, chitin, sac: spore, membrane },
  {
    joints: [
      [28.4, 1.9, 0.3],
      [35.2, 4.4, -0.15],
      [32.6, 6.3, 0.4],
    ],
    knuckles: [
      { r: 1.0, squash: 0.85 },
      { r: 0.85, squash: 0.9 },
    ],
    stems: [{ r: [0.55, 0.42] }, { r: [0.42, 0.32] }],
    head: { at: [32.0, 6.7, 0.5], r: 1.7, squash: 0.85 },
    hood: { at: [31.85, 6.8, 0.5], grow: 1.14, pitch: 0.3, roll: 0.08 },
  }
);

// The stem vein, dark: under way only, so clad in the vein's unlit finish.
const VEIN_R = 0.16;
const VEIN_SINK = 0.05;
const veinY = (x) => (RING_X.includes(x) ? ringCrestAt(x) : crownAt(x)) + VEIN_R - VEIN_SINK;
pelagia.sweptVein(root, veinUnlit, {
  name: 'stem_vein',
  through: [
    [27.4, -0.25],
    [25.5, -0.3],
    [23, -0.35],
    [21, -0.4],
    [20, -0.45],
    [19, -0.5],
    [17.5, -0.65],
    [15.5, -0.75],
    [14, -0.72],
    [13, -0.7],
    [12, -0.66],
    [10, -0.6],
    [7, -0.55],
    [5, -0.6],
    [3.4, -0.7],
  ].map(([x, z]) => [x, veinY(x), z]),
  steps: 48,
  r: VEIN_R,
  facets: 5,
});

// "Nearly black at rest, navigation marks only": two marks.
pelagia.navMarks(root, light, {
  marks: [
    ['nav_bow', 17.5, crownAt(17.5) + 0.15, 0.3],
    ['nav_tail', -35, 0.2 + BEVEL + 0.2, -0.6],
  ],
  w: 0.8,
  h: 0.4,
  d: 0.6,
});

metreTrue(root, L, { drawn: L });
await exportGlb(root, 'blight-pelagia.glb');
