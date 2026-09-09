/**
 * The Reciter — the Order's precise one, 100 m (docs/units.md, "The rung, and
 * two hulls a navy").
 *
 * "The Clarion's forward spine drawn out further still into a lance: a
 * four-sided needle running half the length of the hull, railed along its top,
 * crystal amidships, and lit only at the muzzle. Wings further aft than the
 * Clarion's and a keel deeper; no array, no canards. Nothing of the Lance's
 * chevron." (docs/asset-prompts-3d.md, Block 3, the rung's roster.)
 *
 * So the port is a Clarion minus its cone plus one shape the Order did not yet
 * own, and the lance went into `factions/hadron.mjs` rather than here for the
 * reason the prompt block itself gives: the next Knight hull *is* the Lance,
 * and "nothing of the Lance's chevron or the Reciter's needle" is only
 * enforceable if the needle is a thing the module knows how to draw.
 *
 * The Reciter's listed SIG 90 is a cone figure (docs/systems-echo.md §8) and
 * `tools/hull-maps/models.mjs` bakes the glow at the compass average, 40.5 —
 * the loudest figure in the rung, and every metre of it is on the lance: the
 * rail, the two seams flanking it, the muzzle node. The wing lamps and the
 * drive seam are navigation lights and are 3 m and 2 m long for that reason.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, muzzle to drive.
 *
 * The two disagree because the 100 m was measured to the lance's tip rather
 * than past the muzzle node on the end of it, so intake and the runtime have
 * both been squeezing this hull by 0.935 since it landed. The numbers below
 * are the approved model's own and the root carries that one squeeze, which
 * makes the file metre-true (kit.mjs) and leaves the shipped maps exactly
 * where they were.
 */
const L = 100;
const DRAWN = 107;

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const node = hadron.ink.resonanceNode();

const root = new THREE.Group();
root.name = 'hadron_reciter';
root.scale.setScalar(L / DRAWN);

// The body: 80 m of spar carrying 26 m of lance. The same section as the
// Clarion's to within a centimetre — this hull is longer, not fatter.
hadron.bladeBody(root, shadow, { bow: 30, stern: -50, maxR: 5.73, facets: 8, squash: 0.3665 });
// The inlay comes after the lance in the approved model, so the spine defers
// it: part order is what `check.mjs` compares, and the lance is what the two
// halves of the back are separated by.
hadron.spine(
  root,
  { alloy, crystal, seam },
  { from: -44, to: 30, y: 2.0, section: [1.38, 1.98], inlay: 'defer', thread: false }
);

// The lance, and the hull's whole argument: a needle in section, not a barrel,
// running from the waist to 7 m past the bow.
hadron.lance(
  root,
  { alloy, crystal, seam, node },
  {
    from: 24,
    to: 50,
    y: 1.2,
    halfBeam: 1.41,
    squash: 0.8014,
    rail: { from: 15, to: 45, y: 2.4, section: [0.36, 0.9] },
    blade: { from: 26, to: 38, y: 1.6, halfBeam: 1.98, squash: 0.798 },
    seams: { from: 19, to: 41, y: 1.9, z: 1.8, section: [0.3, 0.4] },
    muzzle: { x: 50.5, y: 1.2, r: 0.8, length: 3 },
  }
);
hadron.spineInlay(root, crystal, { from: -26, to: 8, section: [1.28, 2.54], y: 3.0 });

// Beam is wing, further aft than the Clarion's and 4 m narrower, with one
// navigation lamp inboard of each lit edge. Same swept planform, drawn to the
// approved model's own corners.
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
    edge: { x: -38.75, length: 10.5, h: 1.4, w: 3.0, z: 13.5, y: 0.8 },
    // Lifted 0.5 m off the approved export's own y. There the lamp sits
    // *inside* the edge blade — the top-down audit reads it at 0 m2, so it is
    // light gate 3 cannot see, which is the Derrick's deck floods again
    // (kit.mjs, `lightAudit`). The approved bake gets 1.5 m2 out of it because
    // its edge is canted and this one is square, and a lamp that shows is
    // closer to that bake than a lamp that is buried.
    lamp: { x: -37, y: 1.65, z: 12.5, size: [3, 0.3, 0.6] },
  }
);
hadron.finAndKeel(root, alloy, {
  fin: { x: -36, y: 4.95, length: 12, height: 5.5 },
  keel: { x: -18, y: -4.5, length: 24, height: 3 },
  t: 0.8,
});

// The crystal drive, and the one seam abaft it. Everything else on this hull
// that is lit is forward of the waist, which is where the 90 is.
hadron.drive(
  root,
  { shadow, crystal, node },
  {
    x: -52,
    r: 2.2,
    shape: 'crystal',
    length: 6,
    mark: { name: 'drive_seam', mat: seam, size: [2, 0.4, 0.8], x: -46, y: 1.8 },
  }
);

await exportGlb(root, 'reciter-hadron.glb');
