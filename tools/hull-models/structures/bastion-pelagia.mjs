/**
 * The Bastion, Pelagia Commune — 440 m of footprint (2 × `radiusM` 220,
 * packages/shared/src/structures.ts), SIG 35 sustained.
 *
 * "The HQ — a large pressure dome with visible reinforcement ribs, docking
 * collars and external pipework, anchored to the seabed (SIG 35 sustained,
 * the settlement's constant hum). Sustained glow from ports and working
 * lights; the one building that can never run silent"
 * (docs/asset-prompts-3d.md, STRUCTURE — Bastion). One prompt block, four
 * navies, and the Commune's shares nothing with the other three (#652): a
 * grown dome with root buttresses.
 *
 * The Commune's is grown rather than built: a pressure dome squashed low and
 * wide and rolled a little off level, four growth rings where it grew, five
 * reinforce ribs over its crown, a crown pod with a pale bud on a stalk, eight
 * lit ports round its waist, three lit veins climbing its flank, seven root
 * buttresses of two skins holding it to the seabed, no two alike; and the
 * fitted things — two docking collars with lit mouths, two hull pipes, three
 * standpipes with flanges, two ballast tanks — in grown steel.
 *
 * A port of the approved export (docs/concept-art/models/bastion-pelagia.glb
 * at f7cce0f), part for part in its order, every number the export's own,
 * read off its nodes and its buffers with tools/hull-models/parts.mjs. Every
 * part comes from `factions/pelagia.mjs`. Nothing here is a shape decision;
 * where the export is odd the script is odd with it:
 *
 * - The dome and the crown pod are partial spheres, not tables: the counts
 *   `parts.mjs` could not name are a sphere's stopped short of its pole.
 * - The roots and the tanks are r184 capsules (kit.mjs `capsule`); the roots
 *   lie 0.18 short of flat and roughly along the dome's radius.
 * - The ribs, veins and pipes lie at the dome's centre with a squash of
 *   0.9 tall on their nodes where the dome's is 0.88.
 * - The veins' arcs are 0.899998, 0.976363 and 0.979610, read off the last
 *   column of each buffer; the first is 0.9 to six places and not to seven.
 * - Twelve rotations — five ribs, one vein, both pipes, three roots and the
 *   small collar's lip — the file writes in three's (±π, b, c − π) form of
 *   the XYZ Euler; they are written in the (0, π − b, c) form of the same
 *   matrix, which is the form the file gives the rest in and which shows
 *   the pipes' yaws to be 3.9 and 4.5 and every roll to be π/2 less a round
 *   number.
 * - The port lights and the root buttresses sit on no rule the port could
 *   find; their places are the file's, to twelve places.
 *
 * THE FRAME is the export's own: drawn along X, 16.70 across by the measure
 * the bake takes — three's `Box3` over the parts' own boxes, which the
 * leaned roots' and yawed pipes' boxes overhang — priced at 440 m by the
 * table, so the root carries that one scale through kit.mjs `fitFootprint`,
 * as the Vent Taps do, and no yaw. The light audit names both docking
 * mouths as showing under a cell from above — each faces out along its
 * collar, so a top-down map sees only its rim; the approved binary earns
 * the same.
 */
import { THREE, exportGlb, fitFootprint } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 440;

const algae = pelagia.bastionInk.algaeHull();
const chitin = pelagia.bastionInk.deepChlorophyll();
const spore = pelagia.bastionInk.sporePale();
const bio = pelagia.bastionInk.biolightGreen(2.944720997756152);
const steel = pelagia.bastionInk.grownSteel();

const root = new THREE.Group();
root.name = 'bastion_pelagia';

/** The dome's centre; every ring, rib, vein and pipe is placed there. */
const DOME = [0.3, 1.6, -0.2];
/** The squash the ribs, veins and pipes carry on their nodes — not the dome's 0.88. */
const ARC_SCALE = [1, 0.9, 1.12];

// The pressure dome: an 18 × 10 orb of 6.2 stopped 0.56 of the way down,
// 0.88 tall and 1.12 across, rolled 0.06 about the keel.
pelagia.grownDome(root, algae, {
  name: 'pressure_dome',
  r: 6.2,
  facets: [18, 10],
  down: 0.56,
  ...pelagia.verbatim(DOME, [0, 0, 0.06], [1, 0.88, 1.12]),
});

// Four growth rings where the dome grew, each at its polar angle from the
// crown, 0.1 proud of the dome's surface and thinner as they go down.
pelagia.domeRings(root, chitin, {
  centre: DOME,
  R: 6.2,
  squash: 0.88,
  lift: 0.1,
  scale: [1, 1.12, 1],
  rings: [
    { t: 0.32, tube: 0.3 },
    { t: 0.62, tube: 0.24 },
    { t: 0.88, tube: 0.2 },
    { t: 1.12, tube: 0.16 },
  ],
});

// Five reinforce ribs over the crown: a quarter turn of torus each, stood on
// edge and yawed each its own way round the dome.
pelagia.domeArcs(root, chitin, {
  name: 'reinforce_rib',
  centre: DOME,
  scale: ARC_SCALE,
  R: 6.076,
  tube: 0.18,
  facets: [4, 22],
  arc: Math.PI / 2,
  roll: Math.PI / 2,
  arcs: [
    { yaw: 2.35074537457 },
    { yaw: 2.850545016956 },
    { yaw: -2.960987340879 },
    { yaw: -2.495037473539 },
    { yaw: -2.09382058057 },
  ],
});

// The crown: a pod stopped 0.6 of the way down, the pale bud above it, and
// the stalk between, leaned 0.12.
pelagia.grownDome(root, algae, {
  name: 'crown_pod',
  r: 2.3,
  facets: [12, 7],
  down: 0.6,
  ...pelagia.verbatim([2.1, 6.2, -1.3], [0, 0, 0], [1, 0.85, 1.05]),
});
pelagia.grownOrbs(root, {
  orbs: [['crown_bud', spore, 0.85, [8, 5], pelagia.verbatim([2.4, 8.2, -1.5])]],
});
pelagia.grownCones(root, {
  cones: [
    [
      'crown_stalk',
      chitin,
      [0.28, 0.5],
      2.2,
      7,
      pelagia.verbatim([2.35, 7.5, -1.45], [0, 0, -0.12]),
    ],
  ],
});

// Eight lit ports round the waist — "sustained glow from ports".
pelagia.portLights(root, bio, {
  r: 0.22,
  facets: [6, 5],
  at: [
    [4.99449141236415, 4.46855601815711, 2.669318764605],
    [2.7435749289379, 4.41313356162392, 5.17145772972358],
    [-0.411353213574325, 4.20375305048753, 5.92549803170619],
    [-4.46636731952868, 4.13442774443913, 3.00811524046761],
    [-4.95395276522038, 4.5098168027938, -1.13901502207446],
    [-1.38328278057245, 4.27486375989644, -6.03123466182229],
    [2.40217929144374, 4.13572680479148, -5.96082470091036],
    [4.85966559068978, 4.29780639927124, -3.56555483988218],
  ],
});

// Three lit veins climbing the flank, each its own arc, rolled 0.35, 0.47
// and 0.59 short of upright.
pelagia.domeArcs(root, bio, {
  name: 'bio_vein',
  centre: DOME,
  scale: ARC_SCALE,
  R: 6.231,
  tube: 0.07,
  facets: [4, 18],
  arcs: [
    { yaw: 0.752858169191, arc: 0.899998428848, roll: Math.PI / 2 - 0.35 },
    { yaw: 1.32905395231, arc: 0.976362795731, roll: Math.PI / 2 - 0.47 },
    { yaw: 1.83787652042, arc: 0.979609581185, roll: Math.PI / 2 - 0.59 },
  ],
});

// Seven root buttresses on the seabed, no two alike, skinned algae and
// chitin by turns, laid 0.18 short of flat and yawed each its own way.
pelagia.rootButtresses(root, [algae, chitin], {
  roll: Math.PI / 2 - 0.18,
  facets: [3, 7],
  grips: [
    {
      r: 0.6226683855,
      length: 2.63160181,
      at: [5.57867023070561, 0.35, 1.487391462751],
      yaw: 1.29109004116,
    },
    {
      r: 0.7724055052,
      length: 3.629889011,
      at: [1.92300927705757, 0.35, 5.97566497390953],
      yaw: 0.28303622452,
    },
    {
      r: 0.6074466109,
      length: 4.080936432,
      at: [-1.90893482523634, 0.35, 5.90690704373363],
      yaw: -0.379958365058,
    },
    {
      r: 0.5848103762,
      length: 3.102535725,
      at: [-5.33579068776903, 0.35, 0.112315694128779],
      yaw: -1.52090734512,
    },
    {
      r: 0.5605458021,
      length: 4.695875168,
      at: [-4.77307743459964, 0.35, -4.0320928850579],
      yaw: -2.172219278988,
    },
    {
      r: 0.6917777658,
      length: 3.743331671,
      at: [-0.226635245119002, 0.35, -6.64158528617087],
      yaw: -3.05141451232,
    },
    {
      r: 0.5919919014,
      length: 4.243413925,
      at: [5.12615964593481, 0.35, -4.14737521119551],
      yaw: 2.208771603491,
    },
  ],
});

// Two docking collars with lit mouths: the main one off the +x flank, the
// small one aft and to starboard.
pelagia.dockingCollar(
  root,
  { collar: algae, lip: chitin, mouth: bio },
  {
    tag: 'main',
    yaw: -0.4,
    collar: { radii: [1.5, 1.9], length: 2.6, facets: 9, at: [7.2, 1.5, 1.8] },
    lip: { R: 1.6, tube: 0.28, facets: [5, 12], at: [8.35, 1.5, 2.3] },
    mouth: { r: 1.15, t: 0.2, at: [8.3, 1.5, 2.28] },
  }
);
pelagia.dockingCollar(
  root,
  { collar: algae, lip: chitin, mouth: bio },
  {
    tag: 'small',
    yaw: 0.75,
    collar: { radii: [0.95, 1.25], length: 2, facets: 8, at: [-5.6, 1.2, 4.9] },
    lip: { R: 1.02, tube: 0.2, facets: [5, 11], at: [-6.4, 1.2, 5.6] },
    mouth: { r: 0.72, t: 0.16, at: [-6.35, 1.2, 5.56] },
  }
);

// Two hull pipes over the dome in grown steel — "external pipework".
pelagia.domeArcs(root, steel, {
  name: 'hull_pipe',
  centre: DOME,
  scale: ARC_SCALE,
  R: 6.324,
  facets: [5, 16],
  arcs: [
    { yaw: 3.9, arc: 0.9, tube: 0.16, roll: Math.PI / 2 - 0.55 },
    { yaw: 4.5, arc: 1.15, tube: 0.13, roll: Math.PI / 2 - 0.8 },
  ],
});

// Three standpipes with flanges, each leaned a degree or three its own way.
pelagia.standpipes(
  root,
  { pipe: steel, flange: chitin },
  {
    pipes: [
      { at: [-4.2, -3.6], h: 3.2, lean: -0.0210595568642 },
      { at: [-5.2, -2.2], h: 3.6, lean: 0.0517818810884 },
      { at: [3.4, -5.3], h: 2.6, lean: -0.0409674101137 },
    ],
  }
);

// Two ballast tanks laid flat on the -z side, turned 0.5 and 0.8.
pelagia.ballastTanks(root, steel, {
  r: 0.75,
  length: 2,
  facets: [3, 9],
  tanks: [
    { at: [-2, 1.05, -5.9], turn: 0.5 },
    { at: [-0.2, 1.05, -6.4], turn: 0.8 },
  ],
});

fitFootprint(root, L);
await exportGlb(root, 'bastion-pelagia.glb');
