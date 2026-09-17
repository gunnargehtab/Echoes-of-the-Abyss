/**
 * The Nodule Refinery, Pelagia Commune — 280 m of footprint (2 × `radiusM`
 * 140, tools/hull-maps/models.mjs), SIG 65 sustained.
 *
 * "A rank of upright silos with conveyor and crusher machinery,
 * seabed-anchored (SIG 65 sustained — the loudest permanent thing a player
 * owns). Burning bright: floodlit working surfaces, visible machinery
 * light" (docs/asset-prompts-3d.md, STRUCTURE — Nodule Refinery). One
 * prompt block, four scripts; the per-navy difference is
 * docs/art-direction.md's.
 *
 * The Commune's is the rank grown: four silos of four sizes, each a drum
 * tapering to its cap, leaned a degree or so its own way, ringed two or
 * three times where it grew, veined with light two thirds of the way up and
 * — two of the four — budded pale on top; the crusher house under a half
 * drum of a roof with a lit maw on its face; two exhaust stacks with pale
 * tips; the conveyor gantry running down to the intake hopper, five nodules
 * riding its belt (one of them pale), algae rails, eight gantry lights and
 * three legs; the hopper with its lit mouth; two transfer pipes with algae
 * flanges; six root anchors; and two flood masts.
 *
 * A port of the approved export (docs/concept-art/models/refinery-
 * pelagia.glb at f7cce0f), part for part in its order, every number the
 * export's own, read off its nodes and its buffers (#652). The crusher, the
 * stacks, the gantry, the hopper, the transfer pipes and the flood masts
 * are the kit's Refinery vocabulary (kit.mjs `crusher`, `exhaustStacks`,
 * `conveyorGantry`, `intakeHopper`, `flangedPipes`, `floodMasts`) — this
 * file carries the Directorate's numbers for all of them but the roof over
 * the crusher and the nodules; the silos and the anchors are
 * `factions/pelagia.mjs`'s Bastion-and-works block. Nothing here is a shape
 * decision; where the export is odd the script is odd with it:
 *
 * - Each silo's rotation is a YXZ Euler of a small lean, its yaw and the
 *   same lean again — exactly, on all four — written in that order through
 *   `eulerXYZ` (`silos`). Its cap is 0.74 of its radius, its vein 0.92 of
 *   it over 0.65π at 0.55 of its height, its bud 0.62 of its radius above
 *   its top; its rings are each their own radius, tube and height.
 * - Silos 2 and 3 have no bud: there is no `silo_bud_2` or `_3` in the
 *   file, and none here. Silo 3 is chitin where the other three are algae.
 * - The crusher's cowl is a half drum, `crusher_roof`, 1.85 by 4.7 on six
 *   facets, laid on its side; the Directorate's is a shell of a sphere.
 * - The nodules are dodecahedra of five radii, tumbled every way, one of
 *   them (`nodule_2`) pale; their rotations are their nodes decomposed, to
 *   nine places.
 * - The gantry's two longer legs stand 0.025 and 0.05 off centred on their
 *   height; the exhaust tips sit 0.13 down-lean of their stacks; the flood
 *   lamps are offset from their heads in the export's frame rather than
 *   the heads'. All the Directorate file's numbers, which this file carries.
 * - Three of the six anchors and the third silo's vein the file writes in
 *   three's (±π, b, c − π) form of the XYZ Euler, written here as the plain
 *   (0, π − b, c) of the same matrix.
 * - The six materials are the Bastion's five (`bastionInk`) with
 *   `biolight_green` at 2.6, and `floodlight_pale`, the spore token on a
 *   #3A3F1E base at 3.2587 (`worksInk`).
 * - The light audit names two lamps hidden from above, `silo_vein_1` and
 *   `silo_vein_3`, under their silos' rings and caps; the maw, edge-on on
 *   the Directorate's file, shows here past the roof's overhang. The
 *   approved binary earns the same two.
 *
 * THE FRAME is the export's own: an X-long file, 22.7246 units long for a
 * 280 m footprint (hull-intake's `rawSize.x` on the approved file, which
 * did not yaw it), ground at y = 0; built here in that frame with no yaw —
 * every placement the file's own translation, rotation and scale through
 * the kit's `xLong` frame — and made metre-true at 280 m along X, centred
 * on its length, the ground kept at y = 0, by `metreTrue`. `DRAWN` is the
 * export's length as intake measures it, three's `Box3` over the parts' own
 * boxes, so that both consumers' own rescale is exactly 1 and the maps stay
 * where the approved export put them; the built file is X-long
 * (280 × 191.2 m), so intake does not yaw it.
 */
import {
  THREE,
  xLong,
  crusher,
  exhaustStacks,
  conveyorGantry,
  intakeHopper,
  flangedPipes,
  floodMasts,
  eulerXYZ,
  metreTrue,
  exportGlb,
} from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 280;
const DRAWN = 22.724610351326202;
const DATUM = 0;

const algae = pelagia.bastionInk.algaeHull();
const chitin = pelagia.bastionInk.deepChlorophyll();
const spore = pelagia.bastionInk.sporePale();
const bio = pelagia.bastionInk.biolightGreen(2.6);
const steel = pelagia.bastionInk.grownSteel();
const flood = pelagia.worksInk.floodlightPale(3.258717662091468);

const root = new THREE.Group();
root.name = 'nodule_refinery';

// "A rank of upright silos": four, each its own foot, radius, height, lean
// and yaw, its rings where they grew, and a bud on the first two only.
pelagia.silos(
  root,
  { skin: algae, cap: algae, ring: chitin, bud: spore, vein: bio },
  {
    silos: [
      {
        n: 0,
        at: [-5.6, -2.6],
        R: 1.75,
        h: 8.6,
        lean: -0.0274654750433,
        yaw: 1.20024851585,
        rings: [
          { y: 2.56363214184, R: 1.683932573, tube: 0.146486491 },
          { y: 4.79132507031, R: 1.557005852, tube: 0.1200238764 },
        ],
        bud: true,
        vein: { yaw: -0.0552587636465 },
      },
      {
        n: 1,
        at: [-1.9, -1.2],
        R: 2,
        h: 10.4,
        lean: 0.0245953418897,
        yaw: 1.78734115183,
        rings: [
          { y: 2.71727233805, R: 1.933685295, tube: 0.119979389 },
          { y: 6.28318456143, R: 1.741674706, tube: 0.1533405334 },
          { y: 8.74072221032, R: 1.609345749, tube: 0.1559746712 },
        ],
        bud: true,
        vein: { yaw: -1.45421398587 },
      },
      {
        n: 2,
        at: [1.9, 0.2],
        R: 1.6,
        h: 7.6,
        lean: 0.0172770040203,
        yaw: 2.68998325866,
        rings: [
          { y: 2.06128180915, R: 1.55849281, tube: 0.1585938632 },
          { y: 4.21222719012, R: 1.431700289, tube: 0.1266850829 },
        ],
        vein: { yaw: 3.43184193495 },
      },
      {
        n: 3,
        at: [-4, 1.9],
        R: 1.45,
        h: 6.2,
        lean: -0.0224110360816,
        yaw: 2.33451456798,
        skin: chitin,
        rings: [
          { y: 1.95306810646, R: 1.402105503, tube: 0.1126045659 },
          { y: 3.72972657205, R: 1.285763025, tube: 0.148888588 },
          { y: 5.24991696079, R: 1.186215073, tube: 0.1522943676 },
        ],
        vein: { yaw: -0.426394027628 },
      },
    ],
  }
);

// The crusher at the kit's defaults but its roof — a half drum laid on its
// side — and the two stacks.
crusher(
  root,
  { house: steel, cowl: chitin, maw: flood },
  {
    cowl: {
      name: 'crusher_roof',
      geo: new THREE.CylinderGeometry(1.85, 1.85, 4.7, 6, 1, false, 0, Math.PI),
      at: [5.2, 3.4, -2.2],
      rot: [0, -0.25, Math.PI / 2],
    },
  }
);
exhaustStacks(root, { steel, glow: flood });

// The conveyor gantry, at the kit's defaults, with this file's five
// nodules: dodecahedra of five radii, tumbled every way, one of them pale.
conveyorGantry(
  root,
  { bed: steel, belt: chitin, rail: algae, light: flood, leg: steel },
  {
    nodules: [
      {
        name: 'nodule_0',
        r: 0.3584019,
        skin: chitin,
        at: [-3.498671344, 0.45, -0.079928465],
        rot: [0.034157933, 0.923907476, 0.880345213],
      },
      {
        name: 'nodule_1',
        r: 0.3775609,
        skin: chitin,
        at: [-1.455893165, 0.45, 0.027824285],
        rot: [-1.845422219, 1.408660255, -3.110364124],
      },
      {
        name: 'nodule_2',
        r: 0.3101697,
        skin: spore,
        at: [0.631565482, 0.45, 0.106131834],
        rot: [1.557829822, 1.476647581, 2.233767736],
      },
      {
        name: 'nodule_3',
        r: 0.3088876,
        skin: chitin,
        at: [2.401232832, 0.45, 0.12894235],
        rot: [0.611409421, 1.366653169, 2.015190001],
      },
      {
        name: 'nodule_4',
        r: 0.3193367,
        skin: chitin,
        at: [4.099271046, 0.45, 0.129571498],
        rot: [2.992183064, 0.505563898, 2.436400929],
      },
    ],
  }
);

// The intake hopper at the kit's defaults.
intakeHopper(root, { hopper: chitin, mouth: flood });

// Two transfer pipes from the silos to the crusher, each yawed to its run
// and tipped over — YXZ, as the file has them — with its flange on the
// pipe's own station, pitched 0.35 under the same yaw.
flangedPipes(
  root,
  { pipe: steel, flange: algae },
  {
    frame: xLong,
    stems: { pipe: 'transfer_pipe', flange: 'transfer_flange' },
    pipe: { radii: [0.17, 0.17], facets: 7 },
    flange: { R: 0.24, tube: 0.06, facets: [5, 10] },
    pipes: [
      {
        n: '0',
        length: 4.970076,
        at: [1.65, 5.4, -1.7],
        rot: eulerXYZ([0, 1.710720997, Math.PI / 2 - 0.14], 'YXZ'),
        flange: { rot: eulerXYZ([0.35, 1.710720997, 0], 'YXZ') },
      },
      {
        n: '1',
        length: 8.607404,
        at: [-0.2, 4.2, -2.4],
        rot: eulerXYZ([0, 1.533776211, Math.PI / 2 - 0.04], 'YXZ'),
        flange: { rot: eulerXYZ([0.35, 1.533776211, 0], 'YXZ') },
      },
    ],
  }
);

// Six root anchors into the seabed, no two alike, algae and chitin by
// turns, laid 0.15 short of flat and yawed each its own way.
pelagia.rootButtresses(root, [algae, chitin], {
  name: 'root_anchor',
  frame: xLong,
  roll: Math.PI / 2 - 0.15,
  facets: [3, 6],
  grips: [
    {
      r: 0.5227002501,
      length: 2.486460209,
      at: [3.684683365, 0.3, 1.0608036163],
      yaw: 1.26263416062,
    },
    {
      r: 0.4606243372,
      length: 1.887086749,
      at: [-0.446194432954, 0.3, 4.34997043289],
      yaw: 0.21670871112,
    },
    {
      r: 0.5726485252,
      length: 1.970771432,
      at: [-5.72165464675, 0.3, 2.71740228322],
      yaw: -0.870282079517,
    },
    {
      r: 0.5280192494,
      length: 2.169366598,
      at: [-6.74523713821, 0.3, -2.16735976785],
      yaw: -1.90722416739,
    },
    {
      r: 0.4424859881,
      length: 2.584592342,
      at: [-1.95888716979, 0.3, -5.66464451678],
      yaw: -3.0771780988,
    },
    {
      r: 0.4521121085,
      length: 2.987094164,
      at: [3.49758136527, 0.3, -2.86326916394],
      yaw: 2.03333987182,
    },
  ],
});

// "Floodlit working surfaces": two flood masts at the kit's defaults.
floodMasts(root, { steel, lamp: flood });

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'refinery-pelagia.glb');
