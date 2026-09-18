/**
 * The Glider — the Commune's scout, 55 m (docs/units.md, "The scouts";
 * #784, off #540 Phase 4).
 *
 * "The quiet way out, 55 m — a hull that cuts its drive and coasts, still
 * under way at 35 of its 105 m/s (SIG 8 idle, 16 cruise, 1.8 gliding; no
 * weapon; HYD 45). A winged seed, and a plan not mirrored across its keel:
 * a slim grown seed body on the centreline, one broad wing swept aft off
 * the starboard flank with growth rings across its blade and a stiffening
 * vein along its leading edge, a short trim vane to port, and the
 * muscle-drive tail folded flat along the stem — the model is the hull with
 * its drive cut, which is the state it was grown for. Nearly black:
 * navigation marks only, the wing vein barely showing, and the tail's veins
 * unlit, because they light only while the drive turns."
 *
 * Built to that block and not ported from a binary, as the Drifter was
 * (#783): the stem, its rings, the vane and the marks are the module's
 * existing vocabulary, and the wing and the folded tail are two builders
 * added to `factions/pelagia.mjs` for it, with the vein family's unlit
 * finish beside them. Built in its state, as docs/models-plan.md §3.5
 * says a stated hull is: the drive cut, the wing spread, the tail folded.
 * Metre-true at 55 with no root scale — the stem's point is the bow at
 * x 27.5 and the knuckle the tail hinges on is the stern at −27.5. The
 * plan is the first in the roster not mirrored across its keel (§3.6):
 * the wing lies to starboard, +z in the kit's frame (#642), the vane to
 * port, and each is placed one side at a time by the sign of its root's
 * z — the module's way of taking a side since the Drifter's vanes — never
 * through `bothSides`, which mirrors. The kit's `flank` is the Z-long
 * shared kinds' pair placement through `drawn`, a port's tool, and an
 * X-long built hull has no use for it.
 *
 * What the script decided that the block does not say — the block stands
 * unamended, because none of these departs from it:
 *
 * - **Which way the leaf lies.** `leafOutline` is one leaf and it has a
 *   handedness: in plan its crown always swells 90° round from its span
 *   the same way, so a wing whose leading edge is the convex margin has to
 *   lie with its stalk forward — span aft along the keel, crown outboard —
 *   and that is the samara the block's "winged seed" names, the seed on
 *   the keel and one wing off it. The margin from the stalk out and round
 *   to the tip is the leading edge, the quick rise at the stalk is what
 *   sweeps it, and the tip's curl is the trailing edge, coming back forward
 *   to the flank at x −8.75. The stalk sits 1.6 m inside the skin at x 16,
 *   so the blade leaves the flank at x 13.6 already carrying chord. Span
 *   33, depth 16.5: the widest point is 0.757 of the span aft of the stalk,
 *   at x −9, 16.3 m off the keel — 0.29 of the length, where the hand-drawn
 *   outline this model replaces put it at 0.3 and x −0.14 — and the tip is
 *   at x −17.7. The same leaf on the port flank would lie stalk aft, which
 *   is why there is no pair to refuse.
 * - **What a growth ring across a blade is.** A ring around a body that is
 *   a membrane: a ridge lathed round the span (`ridgeRing`, every approved
 *   Commune ring's cut) wrapping the chord the blade has at that station,
 *   pressed flat so its crest rides 0.26–0.36 m proud of the top face at
 *   mid-chord and its shoulders sink into the blade — a rib across the
 *   blade from above, a ridge in the conn view. Three, at 0.3, 0.52 and
 *   0.74 of the span, each its own width and crest and each yawed its own
 *   few degrees off square, as the Harvester's lean.
 * - **The vein is a bead inside the margin.** One tube, r 0.14, swept 0.35
 *   m inside the leading edge from the stalk round to the tip and sunk
 *   0.05 into the top face, in `bio_vein` at the Drifter's fifth (`VEIN`
 *   below; hulls/drifter.mjs `SEAM` says why a fifth is the conn view's
 *   number and not the chart's). The first two metres of it are inside the
 *   body and count for nothing.
 * - **Where the tail lies.** Over the stem's back, hinged on a knuckle at
 *   the stern: a squashed orb of ridge whose aftmost vertex is x −27.5, and
 *   the paddle laid forward from it 14 m to x −12.3, pitched 0.095 rad nose
 *   up so that a flat blade lies along a crown that falls away astern and
 *   clears it by 0.25 m at x −20. It is wider than the stem it lies on —
 *   5.3 m across where the stem is 3.7 — because a fluke is wider than its
 *   peduncle, and its outline is not quite symmetric. Its three veins are
 *   built, none straight, and clad in `bio_vein_unlit`: the block lights
 *   them only while the drive turns, and the drive is cut (§3.2, rule 2).
 * - **Two marks.** The band table's floor row is "navigation marks only",
 *   and the block's plural: one on the crown at x 22, between the two stem
 *   rings rather than on one, and one on the wing's tip lobe at x −15.5,
 *   the outermost part of the plan and the one the bow mark says nothing
 *   about. Both burn at 1, as the Spinner's two and the Drifter's one do.
 * - **The vane.** One leaf, 6.2 m of chord and 5.4 m out, rooted at x −4 a
 *   hand's breadth inside the port skin, swept aft and rolled 0.25 to dip
 *   its tip: a third of the wing's reach, which is what "short" buys.
 * - **Two stem rings, both forward.** At x 24 and 19.5, clear of the wing's
 *   root and each leaned its own way. None aft: the tail lies along the
 *   after third, and a flat blade cannot lie over a ridge and a falling
 *   crown both.
 *
 * The light, measured (`lightAudit`, printed on export): wing_vein_s 9.7
 * m², nav_bow 0.8, nav_wing 0.8 — 11.2 m² facing up on a 607 m² plan,
 * nothing hidden. The bake at E(8) = 0.80 reads raw E 4.34 → calibrated
 * 0.82 at a gain of ×0.183: under the SIG-8 Spinner's raw 7.56, and 11.7×
 * above the ×1/64 floor docs/models-plan.md §3.2 warns the quiet end
 * about. 16 parts, 1,828 triangles, bounds x ±27.5, y −2.6..3.0,
 * z −8.4..16.3.
 *
 * The generated outline reads the wing at +Y, starboard, 0.22 out at x
 * −0.16, and the vane at −0.22 at x −0.125 — the two extremes equal because
 * `outlines.mjs` centres on the bounding box as the bake does, which puts
 * the keel at −0.072; off the flank the wing stands 12.5 m and the vane
 * 5.1. The hand-drawn entry in silhouettes.ts stays until the kind is
 * wired (docs/models-plan.md §2).
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts); the file is drawn to it. */
const L = 55;
const BOW = L / 2;
const STERN = -L / 2;

/**
 * How faintly the wing vein burns: the Drifter's fifth (hulls/drifter.mjs
 * `SEAM`). The conn view keeps the file's strength, so there a fifth is a
 * fifth; the chart dims the map onto E(8) whatever the file says.
 */
const VEIN = 0.2;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const vein = pelagia.ink.bioVein(VEIN);
const veinUnlit = pelagia.ink.bioVeinUnlit();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'pelagia_glider';

/**
 * The stem's stations, [x, r] in metres: a seed, fullest a little forward
 * of amidships and drawn out long astern to the knuckle the tail hinges
 * on, closed to a point at the bow. 7 m across the waist and 5.25 m tall —
 * slim, as the block says, at 0.13 of the length where the Drifter's body
 * is 0.18 and the Spinner's 0.3. The last station sits inside the knuckle.
 */
const SQUASH = 0.75;
const PROFILE = [
  [STERN + 0.3, 0.3],
  [-25, 0.9],
  [-21, 1.7],
  [-16, 2.4],
  [-10, 3.0],
  [-3, 3.4],
  [4, 3.5],
  [10, 3.35],
  [16, 2.85],
  [21, 2.1],
  [25, 1.1],
  [BOW, 0.12],
];

/** The stem's radius at `x`, off the profile — where a ring or a mark sits on it. */
const rAt = (x) => {
  for (let i = 1; i < PROFILE.length; i++) {
    const [x0, r0] = PROFILE[i - 1];
    const [x1, r1] = PROFILE[i];
    if (x <= x1) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return PROFILE[PROFILE.length - 1][1];
};
/** The crown's height at `x`: the squashed radius, on the flat a fourteen-facet loft turns up. */
const crownAt = (x) => rAt(x) * SQUASH * Math.cos(Math.PI / 14);

// The stem, on fourteen facets like the Sower's, and two growth rings grown
// on its own profile forward of the wing's root — each a 0.6 m ridge
// cresting 0.4 m proud of the skin and leaned its own way off square.
pelagia.stem(root, { chitin, ridge }, { profile: PROFILE, facets: 14, squash: SQUASH });
pelagia.growthRings(root, ridge, {
  name: 'stem_ring',
  stations: [24, 19.5].map((x) => [x, rAt(x) - 0.2]),
  squash: SQUASH,
  tube: 0.6,
  wobble: 0.06,
  ring: { rise: 0.6, facets: 14 },
});

// The wing, to starboard: one leaf, stalk forward, its rings across the
// blade and its vein along the leading edge — the header says which way
// it lies and why.
const WING = { side: 's', root: [16, 0, 1.6], span: 33, depth: 16.5, t: 0.4, bevel: 0.15 };
pelagia.leafWing(
  root,
  { membrane, ridge, vein },
  {
    ...WING,
    rings: [
      { at: 0.3, halfWidth: 0.6, proud: 0.3, lean: 0.06 },
      { at: 0.52, halfWidth: 0.7, proud: 0.36, lean: -0.04 },
      { at: 0.74, halfWidth: 0.55, proud: 0.26, lean: 0.09 },
    ],
    vein: { r: 0.14, inset: 0.35, sink: 0.05, steps: 36 },
  }
);

// The trim vane, to port: one short leaf, swept aft and dipped, drawn
// round on eight corners from its root aft and back.
pelagia.trimVanes(root, membrane, {
  vanes: [
    {
      side: 'p',
      root: [-4, -0.1, -3.1],
      corners: [
        [1.8, 0],
        [2.2, 1.6],
        [1.2, 3.4],
        [-0.6, 4.8],
        [-2.8, 5.4],
        [-4.0, 4.4],
        [-3.6, 2.4],
        [-2.4, 0],
      ],
      roll: 0.25,
    },
  ],
});

// The tail, folded flat along the stem: the knuckle at the stern, the
// paddle forward over the back, its three dark veins on it.
pelagia.foldedTail(
  root,
  { membrane, ridge, vein: veinUnlit },
  {
    knuckle: { at: [STERN + 1.0, 0.35, 0], r: 1.0, squash: 0.85 },
    hinge: [-26.3, 1.35, 0],
    pitch: 0.095,
    outline: [
      [0.3, 0.6],
      [2.5, 1.6],
      [6, 2.6],
      [10, 2.7],
      [13, 1.9],
      [14, 0.4],
      [13.6, -1.2],
      [10.5, -2.5],
      [6, -2.4],
      [2.5, -1.4],
      [0.3, -0.5],
    ],
    veins: [
      [
        [0.6, 0.05],
        [5, 0.2],
        [9, 0.1],
        [12.8, 0.3],
      ],
      [
        [1.2, -0.3],
        [5, -1.0],
        [8.5, -1.5],
        [11.5, -1.7],
      ],
      [
        [1.2, 0.5],
        [5.5, 1.2],
        [9, 1.6],
        [12.2, 1.4],
      ],
    ],
  }
);

// "Nearly black": two navigation marks and the wing vein, and that is the
// whole resting light of a hull quieter under way than anything else.
pelagia.navMarks(root, light, {
  marks: [
    ['nav_bow', 22, crownAt(22) + 0.15],
    ['nav_wing', -15.5, WING.t / 2 + WING.bevel + 0.2, 9.2],
  ],
  w: 0.8,
  h: 0.4,
  d: 0.6,
});

await exportGlb(root, 'glider-pelagia.glb');
