/**
 * The Runner — the Commune's craft, 14 m (docs/units.md, "The craft"; #840).
 *
 * "The daughter shoot, 14 m — the craft a Rootstock puts out, the smallest
 * hull the renderer draws and the quietest thing in the water: nobody
 * builds it, nobody orders it and nobody crews it (SIG 4 idle, 9 cruise,
 * +10 firing; a gun, 14 at 300 m on a 2.0 s cycle; HYD 20; 70 hull;
 * 95 m/s; PR 1 and no depth drive; 120 s in the water). A seedling that
 * swims: a small grown seed body, fullest a little forward and closing to
 * a point at the bow, one growth ring at the node its two seed leaves
 * spring from — a pair of small membrane leaves swept aft, opposite and
 * unequal, the starboard the larger — and a narrow deep muscle-drive fluke
 * on edge astern, the drive of a 95 m/s hull. Its gun is one hollow lipped
 * node grown under the chin to starboard with a pale seed in it. No cabin,
 * no hatch, no dome, no mast: nothing on it is for a crew. Aboard it lies
 * in its carrier's sheath with its leaves folded along its body — the
 * sheath is its length and girth — and the model is the craft in the
 * water, leaves spread, the one state in which it is drawn. Nearly black
 * at rest and under way alike: one navigation mark on the crown and
 * nothing else lit; the node's lip flares for the instant it fires and is
 * dark again."
 *
 * Built to that block from the module's existing vocabulary alone — no
 * builder was added for it: `podBody` on its own profile, `growthRings`,
 * the Glider's `leafWing` twice as `seed_leaf` (the Reed's precedent for a
 * leaf that is not a wing), the Reed's `seedNodes` with one node and its
 * `standingFluke`, and `navMarks`. Metre-true at 14 with no root scale —
 * the body's last station is the bow at x 7 and the fluke's bevel the
 * stern at −7, and `metreTrue` returns 1. Port is −z (#642); the two
 * leaves and the node are each placed at their own signed z, never through
 * `bothSides` (docs/models-plan.md §3.6).
 *
 * What the script decided that the block does not say:
 *
 * - **A seedling, which is what a daughter shoot is.** Two seed leaves off
 *   one node, as a seedling's cotyledons are — opposite, where the Reed's
 *   two leaves alternate between two nodes — and unequal: starboard span
 *   4.6 by 1.8 of chord, port 4.0 by 1.6 and rooted 0.3 m further aft, so
 *   the pair is not a mirror. Neither carries a ring or a vein. They make
 *   the plan 4.8 m across, 0.34 of the length, which is what keeps a 14 m
 *   hull from reading as a torpedo at a sprite's distance.
 * - **Sized to the sheath it came from.** The body is 2.64 m across and
 *   1.9 m tall on 14 m, 0.19 of the length; the Rootstock's hollows open
 *   15.2–15.9 m long, 4.2–4.4 m across and 2.2–2.3 m deep
 *   (hulls/rootstock.mjs), so a Runner with its leaves folded lies in one
 *   below the lip with 0.6–0.95 m to spare at each end. Its point is forward,
 *   where each hollow's is.
 * - **One gun, one node, off the keel.** The Reed's hollow lipped node at
 *   0.46 of its size — 0.92 m across the mouth, a lip of 0.09 — grown under
 *   the chin to starboard where the body has drawn in to 0.5 m, so the node
 *   stands clear of the skin rather than inside it, with a pale seed 0.3 m
 *   proud of the lip. One because the craft carries one gun; to starboard
 *   because a grown thing is not centred on what it grew from. At 4 px/m
 *   the seed is under the lip and the node is a knot at the bow; the conn
 *   view's tilt is where it reads, as the Reed's do.
 * - **The fluke on edge.** The Reed's `standingFluke`, because the block's
 *   95 m/s is the Reed's argument for a narrow deep tail: 3.4 m deep and
 *   0.46 m across, its upper lobe the longer, rooted on the peduncle so the
 *   blade grows out of the muscle. The track keeps a thin stern where a
 *   flat fluke would give a second width.
 * - **One mark.** The band table's floor row at both figures, and the
 *   fewest lamps there can be: 0.6 by 0.5 on the crown at x 1.4, 0.2 m to
 *   port, at strength 1 — the Drifter's rule for a mark at the same idle
 *   figure. The lip's flare is the firing transient and carries no lamp
 *   (docs/models-plan.md §3.2 rule 3); the seed is cladding.
 *
 * The light, measured (`lightAudit`, printed on export): nav_crown 0.38 m²
 * facing up on a 31 m² plan, nothing hidden. The bake at E(4) = 0.599
 * reads raw E 7.88 → calibrated 0.60 at a gain of ×0.077 at the maps'
 * 4 px/m (×0.079 at intake's default 2): 4.9× above the ×1/64 floor and
 * 830× under the ceiling. That margin is the quiet end's trap in its
 * sharpest form (docs/models-plan.md §3.2): a single mark a little over
 * the audit's own 0.25 m² is still 1.2 % of a 31 m² plan, and the only
 * other lever, its strength, is the one the conn view keeps. 9 parts,
 * 1,308 triangles, five materials, bounds x ±7, y −1.5..2.0, z −2.3..2.5.
 *
 * The hand-drawn entry in silhouettes.ts stays until the kind is wired
 * (docs/models-plan.md §2). The generated outline is seventeen vertices: a
 * body at ±0.08 forward of the leaves, the two leaves at +0.172 and −0.172
 * just aft of amidships, and a stern of ±0.024 — the fluke on edge.
 */
import { THREE, exportGlb, metreTrue } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts); the file is drawn to it. */
const L = 14;
const BOW = L / 2;
const STERN = -L / 2;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const spore = pelagia.ink.sporePod();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'pelagia_runner';

const SQUASH = 0.72;
const FACETS = 12;
const FLAT = Math.cos(Math.PI / FACETS);

/**
 * The body's stations, [x, r] in metres: a seed, fullest a little forward
 * of amidships, closed to a point at the bow and drawn out astern to the
 * peduncle the fluke stands on.
 */
const PROFILE = [
  [-4.6, 0.3],
  [-3.8, 0.58],
  [-2.6, 0.9],
  [-1.0, 1.16],
  [0.8, 1.3],
  [2.4, 1.32],
  [3.8, 1.2],
  [5.0, 0.96],
  [6.0, 0.64],
  [6.6, 0.34],
  [BOW, 0.04],
];
const rAt = (x) => {
  for (let i = 1; i < PROFILE.length; i++) {
    const [x0, r0] = PROFILE[i - 1];
    const [x1, r1] = PROFILE[i];
    if (x <= x1) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return PROFILE[PROFILE.length - 1][1];
};
const crownAt = (x) => rAt(x) * SQUASH * FLAT;

/** The node the two seed leaves spring from, and the one ring on the hull. */
const NODE = 3.2;

pelagia.podBody(root, chitin, { squash: SQUASH, facets: FACETS, profile: PROFILE });
pelagia.growthRings(root, ridge, {
  stations: [[NODE, rAt(NODE) - 0.08]],
  squash: SQUASH,
  tube: 0.22,
  wobble: 0.07,
  ring: { rise: 0.22, facets: FACETS },
});

// The two seed leaves, off the one node, swept aft: opposite and unequal.
pelagia.leafWing(
  root,
  { membrane, ridge },
  {
    name: 'seed_leaf',
    side: 's',
    root: [NODE, 0.05, 0.9],
    span: 4.6,
    depth: 1.8,
    t: 0.16,
    bevel: 0.05,
  }
);
pelagia.leafWing(
  root,
  { membrane, ridge },
  {
    name: 'seed_leaf',
    side: 'p',
    root: [NODE - 0.3, 0.0, -0.86],
    span: 4.0,
    depth: 1.6,
    t: 0.15,
    bevel: 0.05,
  }
);

// The gun: one hollow lipped node grown under the chin, to starboard.
pelagia.seedNodes(
  root,
  { chitin, ridge, seed: spore },
  {
    facets: 10,
    nodes: [
      {
        side: 's',
        at: [6.35, -0.3, 0.42],
        squash: 0.85,
        profile: [
          [-2.484, 0.138],
          [-1.886, 0.276],
          [-1.15, 0.391],
          [-0.506, 0.437],
          [0.0, 0.46],
          [0.0, 0.333],
          [-0.414, 0.322],
          [-1.104, 0.276],
          [-1.794, 0.196],
          [-2.254, 0.081],
        ],
        lip: { tube: 0.09, rise: 0.09, halfWidth: 0.12 },
        seed: {
          proud: 0.3,
          squash: 0.9,
          profile: [
            [-0.72, 0.02],
            [-0.56, 0.11],
            [-0.34, 0.18],
            [-0.08, 0.22],
            [0.18, 0.21],
            [0.4, 0.16],
            [0.6, 0.08],
            [0.72, 0.01],
          ],
        },
      },
    ],
  }
);

// The drive: one paddle on edge, narrow and deep, its upper lobe the longer.
const BEVEL = 0.08;
pelagia.standingFluke(root, membrane, {
  t: 0.3,
  bevel: BEVEL,
  outline: [
    [-3.8, 0.35],
    [-4.6, 1.0],
    [-5.6, 1.6],
    [-6.5, 1.95],
    [STERN + BEVEL, 1.7],
    [STERN + BEVEL, 1.25],
    [-6.3, 0.6],
    [-6.0, 0.0],
    [-6.4, -0.6],
    [-6.7, -1.2],
    [-6.2, -1.45],
    [-5.2, -1.1],
    [-4.4, -0.6],
    [-3.8, -0.3],
  ],
});

// "Nearly black": one navigation mark, and nothing else lit.
pelagia.navMarks(root, light, {
  marks: [['nav_crown', 1.4, crownAt(1.4) + 0.08, -0.2]],
  w: 0.6,
  h: 0.2,
  d: 0.5,
});

metreTrue(root, L, { drawn: L });
await exportGlb(root, 'runner-pelagia.glb');
