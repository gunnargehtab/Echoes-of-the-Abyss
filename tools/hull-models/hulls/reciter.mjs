/**
 * The Reciter — the Order's precise one, 100 m (docs/units.md, "Reciter
 * (Slipway)").
 *
 * "The precise one, 100 m — the Clarion's forward spine drawn out further
 * still into a lance (SIG 90 ahead, 9 astern; a 1,000 m gun). A long faceted
 * blade hull with swept guard wings aft, a crystal inlay along the spine and
 * the gun rail running the length of the lance to a muzzle crystal. Lit from
 * the bow back and dark astern: the quarter it is loud in is the quarter it
 * faces, and the rail is the light."
 * (docs/asset-prompts-3d.md, Block 3, the rung's roster.)
 *
 * A port of the approved binary (#586), part for part and in its order: the
 * Clarion's body and spine cut a little longer, the lance in place of the
 * horn, and the inlay drawn *after* the lance because that is where the file
 * writes it. The lance is `lance` in `factions/hadron.mjs` — the needle, its
 * rail, the crystal, a seam each side and the muzzle point — for the reason
 * the Lance's own block gives: "nothing of the Lance's chevron or the
 * Reciter's needle" is only enforceable when the needle is a shape the module
 * draws.
 *
 * The wing lamp sits at y 1.15, where the approved model has it: 0.2 m proud
 * of the plate and inboard of the edge strip, so it shows from above and the
 * export's light audit counts it. #594 lifted it half a metre because its edge
 * was a 3 m box that buried the lamp; the approved edge is a 1 m strip along
 * the tip, and the lamp was never under it.
 *
 * The glow bakes at 40.5 — the compass average of the listed 90
 * (tools/hull-maps/models.mjs), not `sigIdle` — and the light is on the lance:
 * the rail, the two seams and the muzzle. The wing lamps and the drive seam
 * are navigation lights, and are 3 m and 2 m long for that reason.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, drive base to muzzle tip.
 *
 * The two disagree because the export was drawn 107 m long against a design
 * length of 100, so intake and the runtime have both been squeezing this hull
 * by 0.935 since it landed. The numbers below are the approved model's own,
 * and the root carries that one squeeze, which makes the file metre-true
 * (kit.mjs) and leaves the shipped maps exactly where they were.
 */
const L = 100;
const DRAWN = 107;

/** The blade every rung hull is cut to: a four-facet section pressed to 0.55 tall by 1.5 wide. */
const BLADE = [0.55, 1.5];

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const node = hadron.ink.resonanceNode();

const root = new THREE.Group();
root.name = 'hadron_reciter';
root.scale.setScalar(L / DRAWN);

// The body: 80 m of spar carrying 26 m of lance, the Clarion's section to the
// centimetre — this hull is longer, not fatter.
hadron.bladeBody(root, shadow, {
  profile: [
    [-50, 0.2],
    [-42, 2.2],
    [-28, 4.4],
    [-10, 5.4],
    [8, 4.8],
    [24, 3.2],
    [30, 2.2],
  ],
  facets: 4,
  flat: BLADE,
});
// The spine alone; its inlay follows the lance, as it does in the file.
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    profile: [
      [-44, 0.2],
      [-30, 1.4],
      [20, 1.4],
      [30, 0.6],
    ],
    y: 2.0,
    flat: [0.7, 1],
  }
);

// The lance, and the hull's whole argument: a needle in section, not a
// barrel, running from the waist to 7 m past the bow.
hadron.lance(
  root,
  { alloy, crystal, seam, node },
  {
    needle: {
      profile: [
        [24, 2.0],
        [40, 1.4],
        [50, 0.2],
      ],
      y: 1.2,
      flat: [0.8, 1],
    },
    rail: { x: 30, y: 2.4, length: 30, section: [0.35, 0.9] },
    crystal: {
      profile: [
        [26, 2.4],
        [32, 2.8],
        [38, 2.2],
      ],
      y: 1.6,
      flat: [0.8, 1],
    },
    seams: { x: 30, y: 1.9, z: 1.8, length: 22, section: [0.3, 0.4] },
    muzzle: { x: 50.5, y: 1.2, r: 0.8, length: 3 },
  }
);
hadron.spineInlay(root, crystal, {
  profile: [
    [-26, 0.6],
    [-18, 1.8],
    [0, 1.8],
    [8, 0.6],
  ],
  y: 3.0,
  flat: [0.5, 1],
});

// Beam is wing, further aft than the Clarion's and 4 m narrower, the crystal
// edge a strip along the tip and one navigation lamp inboard of it.
hadron.wings(
  root,
  { alloy, crystal, seam },
  {
    outline: [
      [-28, 3],
      [-10, 3],
      [-34, 15],
      [-44, 13],
    ],
    t: 0.9,
    y: 0.65,
    edge: {
      outline: [
        [-44, 13],
        [-34, 15],
        [-33.5, 14],
        [-43, 12],
      ],
      t: 1.4,
      y: 0.8,
    },
    lamp: { size: [3, 0.3, 0.6], x: -37, y: 1.15, z: 12.5 },
  }
);
hadron.finAndKeel(root, alloy, {
  fin: { x: -36, y: 4.95, length: 12, height: 5.5 },
  keel: { x: -18, y: -4.5, length: 24, height: 3 },
  t: 0.8,
});

// The crystal point astern and the one seam abaft it; everything else lit on
// this hull is forward of the waist, which is where the 90 is.
hadron.drive(
  root,
  { shadow, crystal, node },
  {
    x: -52,
    r: 2.2,
    facets: 4,
    taper: 0,
    length: 6,
    mat: crystal,
    ring: false,
    mark: { name: 'drive_seam', mat: seam, size: [2, 0.4, 0.8], x: -46, y: 1.8 },
  }
);

await exportGlb(root, 'reciter-hadron.glb');
