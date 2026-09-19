/**
 * The Reed — the Commune's line hull, 70 m (docs/units.md, "The line hulls,
 * and the anchor"; #787, off #540 Phase 4).
 *
 * "The line hull that wins the fight it chose, 70 m — faster, thinner and
 * quieter than the Corvette it replaces, with the Corvette's gun 130 m
 * shorter, and the fight it loses is any other (SIG 12 idle, 20 cruise at
 * 100 m/s, +25 firing; 50 at 420 m; 340 hull; PR 1, a reed grows in the
 * shallows; 105 nodules). A reed: a slim grown stem, the thinnest gun hull
 * in the roster, with a fine nose, growth rings at two nodes where the stem
 * swells, and a narrow leaf blade off each node swept aft — one to
 * starboard at the forward node, one to port at the after node, alternate
 * as a reed's leaves are, so the plan is not mirrored across its keel and
 * is still balanced. The Corvette's two hardpoints grown into the stem
 * below the nose as a pair of hollow nodes with lips, one a side, the seed
 * torpedoes inside them; a narrow deep muscle-drive fluke astern, the drive
 * of a 100 m/s hull. No wing, no bulbs, no sac, no bloom: a reed is hollow,
 * and this stem is tubes and drive and nothing else. Nearly black at rest,
 * navigation marks only; under way a dim vein along the stem from node to
 * node, the leaves unlit; the two lips flare for the instant of a launch
 * and the stem is dark again."
 *
 * Built to that block and not ported from a binary, as the Blight, the
 * Weaver and the Glider were (#786, #785, #784): the nose, the stem and its
 * rings, the leaf, the vein and the marks are the module's existing
 * vocabulary, and the two hardpoints and the fluke on edge are two builders
 * added to `factions/pelagia.mjs` for it, with `leafWing` given a `name` so
 * a hull whose block says it has no wing does not carry a part called one
 * (the Glider round-trips unchanged). Metre-true at 70 with no root scale —
 * the nose's apex is the bow at x 35 and the fluke's bevel the stern at
 * −35, and `metreTrue` returns 1. Port is −z (#642); every part that has a
 * side is placed at its own signed z, one at a time, never through
 * `bothSides` (docs/models-plan.md §3.6). The plan bullet routes the two
 * leaves "through `flank`"; §3.6 is the rule that governs and `flank` is
 * the Z-long ports' pair placement, which an X-long built hull has no use
 * for, so each leaf is placed by the sign of its root's z as the Glider's
 * wing and vane are.
 *
 * What the script decided that the block does not say — the block stands
 * unamended, because none of these departs from it:
 *
 * - **How thin a reed is.** 4.96 m across the forward node, 4.60 across the
 *   after one and 2.62 along the bare stem between them — 0.071 and 0.037
 *   of the length, where the Weaver's thread is 0.07 at its fullest, the
 *   Glider's stem 0.13 and the Blight's pod 0.17. That is the block's
 *   "thinnest gun hull in the roster" measured, and it is measured on the
 *   stem: the 18.4 m of beam the intake reports is the two leaves, which
 *   are membrane. The nodes stand 24 m apart at x 13 and −11, 0.19 and
 *   −0.16 of the length, which is what puts one leaf's root forward of
 *   amidships and the other's aft without either being at an end.
 * - **Two rings, at the nodes and nowhere else.** `stem_ring_0` and `_1`,
 *   the name the Glider's and the Weaver's stems carry, each a 0.5 m ridge
 *   cresting 0.32 m proud of the node's skin and leaned its own few degrees
 *   off square. None between them and none aft: a ring on the bare stem
 *   would be a third swelling, and the block counts two.
 * - **Which leaf is which, and why they cannot be a pair.** The Glider's
 *   `leafWing`, stalk forward and crown outboard, at `leaf_blade` rather
 *   than `wing` because the block's own "No wing" would otherwise be
 *   contradicted by a part name. Starboard off the forward node, span 21.5
 *   by 9.2 of chord; port off the after node, 16.5 by 7.6 — 0.43 and 0.46
 *   of chord to span, against the Glider's wing at 0.50, which is what
 *   "narrow" buys. Neither carries a ring across the blade or a vein along
 *   its edge: the rings are the Glider's stiffening for a hull that coasts
 *   on its wing, and the vein is a lamp the block does not give this hull
 *   ("the leaves unlit"). The starboard tip reaches x −8.98 and z 9.96, the
 *   port x −27.88 and z −8.45 — one leaf further out, the other further
 *   aft, so the two sides balance and neither is the other's mirror.
 * - **What a hollow lipped node is.** `seedNodes`: one lathe a side whose
 *   profile is a closed *wall* rather than a skin — up the outside from a
 *   throat buried in the stem to the mouth, across the rim at one station,
 *   and back aft down the bore — so the node has an inside and the mouth is
 *   a hole. The outside is drawn first because a lathe's faces wind from
 *   its profile's direction and the other order comes out nine tenths
 *   back-facing, which single-sided chitin renders as a gap in a top-down
 *   bake. A ridge lip round each mouth is the block's "with lips"; it
 *   flares for the instant of a launch and therefore carries no lamp
 *   (docs/models-plan.md §3.2 rule 3). Not `seedLauncher`, the Corvette
 *   port's sheath with a row of seeds in it, and not a tube: the block's
 *   closing "tubes and drive" is these two nodes named again, and its own
 *   earlier sentence says what they are.
 * - **Where the hardpoints sit, and how far they stand out.** Under the
 *   nose, whose root is x 28: the starboard mouth at 27.4 and the port at
 *   25.2, 2.2 m apart so the two lips never meet, each axis 0.6 m below the
 *   stem's at z 1.22 and −1.14 and each its own size (2.0 and 1.8 m across
 *   the mouth). The lips crest at z 2.42 and −2.24, inside the forward
 *   node's 2.48, so the bow carries no swelling wider than the stem's own;
 *   inboard each lip's arc is inside the stem's half-beam of 1.03 at that
 *   station, which is what "grown into the stem" is. The seeds are lathes
 *   of `spore_pod` lying in the bores with 0.8 and 0.65 m of nose proud of
 *   the lips: at 4 px/m that is a pale fleck a side and no more, because a
 *   bore that opens forward shows the chart nothing and the conn view's 55°
 *   is where a loaded hardpoint reads.
 * - **The fluke on edge.** "Narrow deep" is a tail no other hull in this
 *   navy has: the Drifter's, the Weaver's, the Blight's and the Bower's
 *   flukes lie flat and are broad, and a hull 0.07 of its length across
 *   cannot carry a broad one and stay a reed. So `standingFluke`, the same
 *   membrane paddle turned a quarter about the keel — 10.9 m deep and 1.2 m
 *   across, its upper lobe 1.8 m longer than its lower, rooted at x −23.75
 *   on a peduncle 1.86 m wide so the blade grows out of the muscle rather
 *   than being bolted to it. The generated track keeps a thin stern where
 *   every other Commune tail widens it, which is the drive of a 100 m/s
 *   hull made visible at a sprite's distance.
 * - **The vein, dark, node to node.** "Under way a dim vein along the stem
 *   from node to node" is a later band, so it is built and clad in
 *   `bio_vein_unlit` (docs/models-plan.md §3.2 rule 2; the Weaver's and the
 *   Blight's stem veins are the precedent): one tube of r 0.13 swept from
 *   the forward ring's crest at x 13 to the after ring's at −11, lying
 *   0.15–0.56 m to port of the crown line — the navy's asymmetry in the
 *   dressing, and it leaves the crown line to the bow mark. It stops at the
 *   rings because the block does: node to node is the whole of it.
 * - **Two marks.** The band table's floor row and the block's plural: one
 *   on the crown at x 21, between the forward ring and the nose's root,
 *   0.25 m to starboard; one on the fluke's crest at x −33.3, 0.25 m to
 *   port and the highest point on the hull, so the tail says which way the
 *   hull is facing. 54 m apart and on opposite sides of the keel, which is
 *   the Lure's rule (#786) with room to spare. Both at strength 1, as the
 *   Weaver's, the Glider's and the Blight's — and nothing else on the hull
 *   is lit: the leaves are membrane, the lips are a transient, the seeds
 *   are cladding, the vein is clad.
 * - **The nose.** 7 m of six-sided cone at r 1.0 where the stem's lathe
 *   ends, skin to skin — a shade finer than the Weaver's r 1.1, on a hull
 *   of the same length.
 *
 * The light, measured (`lightAudit`, printed on export): nav_bow 0.75 m²,
 * nav_tail 0.75 — 1.5 m² facing up on a 390 m² plan, nothing hidden, which
 * is the Weaver's own figure on five sixths of its plan — 389.6 m² against
 * 462.9. The bake at
 * E(12) = 1.06 reads raw E 2.84 → calibrated 1.06 at a gain of ×0.373: 24×
 * above the ×1/64 floor docs/models-plan.md §3.2 warns the quiet end about
 * and 172× under the ×64 ceiling, with no lamp but the two marks — the
 * Weaver's raw 1.89 at the same E is the same two marks on a fuller hull.
 * 16 parts, 2,448 triangles, six materials, bounds x ±35, y −4.6..6.6,
 * z −8.4..10.0; the 18.4 m of beam is the two leaves and the 11.2 m of
 * height is the fluke's two lobes.
 *
 * The hand-drawn entry in silhouettes.ts stays until the kind is wired
 * (docs/models-plan.md §2). The generated outline is fifteen vertices and
 * reads the starboard leaf at +0.131 at x −0.05 and the port at −0.131 at
 * −0.35 — the two extremes equal because `outlines.mjs` centres on the
 * bounding box as the bake does, which puts the keel at −0.011, as the
 * Glider's does — the bare stem at 0.02–0.04, the hardpoints as a bump at
 * x 0.36–0.39, and a stern that closes to ∓0.01 where the hand-drawn
 * flared it to ±0.08, because this fluke stands on edge.
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
const spore = pelagia.ink.sporePod();
const veinUnlit = pelagia.ink.bioVeinUnlit();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'pelagia_reed';

const SQUASH = 0.78;
const FACETS = 12;
const FLAT = Math.cos(Math.PI / FACETS);

/**
 * The stem's stations, [x, r] in metres: a reed. 2.6 m across between the
 * nodes and 4.96 at the forward one — 0.071 of the length at its fullest,
 * where the Weaver's thread is 0.07, the Glider's stem 0.13 and the
 * Blight's pod 0.17. Open at the nose root, where the cone covers it, and
 * drawn out to the peduncle the fluke stands on.
 */
const PROFILE = [
  [-32.5, 0.3],
  [-30, 0.5],
  [-27, 0.72],
  [-23, 1.0],
  [-19, 1.22],
  [-16.5, 1.4],
  [-14, 1.72],
  [-12, 2.14],
  [-11, 2.3],
  [-10, 2.18],
  [-8, 1.7],
  [-5, 1.42],
  [-1, 1.31],
  [3, 1.33],
  [7, 1.52],
  [10, 1.92],
  [12, 2.34],
  [13, 2.48],
  [14, 2.36],
  [16, 1.96],
  [19, 1.62],
  [22, 1.34],
  [25, 1.16],
  [28, 1.0],
];

const rAt = (x) => {
  for (let i = 1; i < PROFILE.length; i++) {
    const [x0, r0] = PROFILE[i - 1];
    const [x1, r1] = PROFILE[i];
    if (x <= x1) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return PROFILE[PROFILE.length - 1][1];
};
/** The crown's height at `x`: the squashed radius, on the flat a twelve-facet loft turns up. */
const crownAt = (x) => rAt(x) * SQUASH * FLAT;

/** The two nodes: where the stem swells, where a leaf springs, where the vein ends. */
const FORE_NODE = 13;
const AFT_NODE = -11;
const RING_TUBE = 0.5;
const RING_SINK = 0.18;
const ringCrestAt = (x) => (rAt(x) - RING_SINK + RING_TUBE) * SQUASH * FLAT;

pelagia.nose(root, ridge, { tip: BOW, r: 1.0, length: 7, facets: 6 });
pelagia.stem(root, { chitin, ridge }, { profile: PROFILE, facets: FACETS, squash: SQUASH });
pelagia.growthRings(root, ridge, {
  name: 'stem_ring',
  stations: [FORE_NODE, AFT_NODE].map((x) => [x, rAt(x) - RING_SINK]),
  squash: SQUASH,
  tube: RING_TUBE,
  wobble: 0.06,
  ring: { rise: 0.5, facets: FACETS },
});

// The two hardpoints, grown into the stem below the nose: a hollow lipped
// node a side with a seed torpedo in it, each its own size.
pelagia.seedNodes(
  root,
  { chitin, ridge, seed: spore },
  {
    facets: 10,
    nodes: [
      {
        side: 's',
        at: [27.4, -0.6, 1.22],
        squash: 0.85,
        profile: [
          [-5.4, 0.3],
          [-4.1, 0.6],
          [-2.5, 0.86],
          [-1.1, 0.95],
          [0, 1.0],
          [0, 0.72],
          [-0.9, 0.7],
          [-2.4, 0.61],
          [-3.9, 0.42],
          [-4.9, 0.18],
        ],
        lip: { tube: 0.2, rise: 0.2, halfWidth: 0.28 },
        seed: {
          proud: 0.8,
          squash: 0.9,
          profile: [
            [-1.8, 0.04],
            [-1.4, 0.27],
            [-0.85, 0.46],
            [-0.2, 0.55],
            [0.45, 0.53],
            [1.0, 0.39],
            [1.5, 0.19],
            [1.8, 0.02],
          ],
        },
      },
      {
        side: 'p',
        at: [25.2, -0.56, -1.14],
        squash: 0.82,
        profile: [
          [-5.0, 0.28],
          [-3.8, 0.55],
          [-2.3, 0.78],
          [-1.0, 0.86],
          [0, 0.9],
          [0, 0.65],
          [-0.85, 0.63],
          [-2.2, 0.55],
          [-3.6, 0.38],
          [-4.6, 0.16],
        ],
        lip: { tube: 0.2, rise: 0.2, halfWidth: 0.26 },
        seed: {
          proud: 0.65,
          squash: 0.88,
          profile: [
            [-1.6, 0.04],
            [-1.25, 0.24],
            [-0.75, 0.41],
            [-0.2, 0.48],
            [0.4, 0.46],
            [0.9, 0.34],
            [1.3, 0.17],
            [1.6, 0.02],
          ],
        },
      },
    ],
  }
);

// One leaf blade off each node, swept aft and alternate: starboard at the
// forward node, port at the after one. Neither carries a ring or a vein —
// "the leaves unlit" — and the two are not a pair.
pelagia.leafWing(
  root,
  { membrane, ridge },
  {
    name: 'leaf_blade',
    side: 's',
    root: [FORE_NODE, -0.35, 1.85],
    span: 21.5,
    depth: 9.2,
    t: 0.34,
    bevel: 0.12,
  }
);
pelagia.leafWing(
  root,
  { membrane, ridge },
  {
    name: 'leaf_blade',
    side: 'p',
    root: [AFT_NODE, -0.2, -1.75],
    span: 16.5,
    depth: 7.6,
    t: 0.3,
    bevel: 0.1,
  }
);

// The muscle-drive fluke, narrow and deep: one paddle on edge off the
// peduncle, its upper lobe the longer.
const BEVEL = 0.25;
pelagia.standingFluke(root, membrane, {
  t: 0.7,
  bevel: BEVEL,
  outline: [
    [-24.0, 0.8],
    [-26.3, 2.6],
    [-28.6, 4.3],
    [-31.0, 5.6],
    [-33.3, 6.1],
    [STERN + BEVEL, 5.4],
    [STERN + BEVEL, 4.1],
    [-33.9, 2.6],
    [-33.2, 0.9],
    [-32.6, -0.4],
    [-33.5, -2.0],
    [-34.3, -3.4],
    [-33.9, -4.3],
    [-31.4, -4.2],
    [-28.8, -3.0],
    [-26.4, -1.7],
    [-24.0, -0.75],
  ],
});

// The node-to-node vein, dark: under way only, so clad in the vein's unlit
// finish. It runs crest to crest and leaves the crown line to the bow mark.
const VEIN_R = 0.13;
const VEIN_SINK = 0.05;
const veinY = (x) =>
  (x === FORE_NODE || x === AFT_NODE ? ringCrestAt(x) : crownAt(x)) + VEIN_R - VEIN_SINK;
pelagia.sweptVein(root, veinUnlit, {
  name: 'stem_vein',
  through: [
    [FORE_NODE, -0.3],
    [11, -0.38],
    [8, -0.45],
    [4, -0.42],
    [0, -0.34],
    [-4, -0.28],
    [-7.5, -0.34],
    [-9.5, -0.4],
    [AFT_NODE, -0.45],
  ].map(([x, z]) => [x, veinY(x), z]),
  steps: 40,
  r: VEIN_R,
  facets: 5,
});

// "Nearly black at rest, navigation marks only": two marks.
pelagia.navMarks(root, light, {
  marks: [
    ['nav_bow', 21, crownAt(21) + 0.15, 0.25],
    ['nav_tail', -33.3, 6.35, -0.25],
  ],
  w: 0.9,
  h: 0.4,
  d: 0.7,
});

metreTrue(root, L, { drawn: L });
await exportGlb(root, 'reed-pelagia.glb');
