/**
 * The Clarion — the Order's line hull, 90 m (docs/units.md, "The rung, and two
 * hulls a navy").
 *
 * "The cone: a long forward spine carrying a bow array, thin planar wings well
 * aft, a pair of canards forward of the waist, and a drive that is a single
 * resonance crystal. Polished pale alloy over shadow indigo; the light is all
 * in front of the waist, because the SIG is."
 * (docs/asset-prompts-3d.md, Block 3, the rung's roster.)
 *
 * This is the model `factions/hadron.mjs` was read off, so the port is the
 * shortest one in the navy: every part comes from the module, and the two
 * things the module did not yet have — the ring of seams round the horn, and
 * a drive that is a crystal rather than a prism — went back into it rather
 * than being inlined here, because the Cantus and the Reciter want both.
 *
 * The one number that is *this* hull's rather than the navy's is where its
 * light sits. The Clarion's listed SIG 62 is a cone figure (docs/systems-echo.md
 * §8) and `tools/hull-maps/models.mjs` bakes the glow at the compass average,
 * 27.9 — so the emissive budget is small and every metre of it is forward of
 * the waist: the horn's six seams, the array lip, the emitter core, the spine
 * inlay, and one mark astern that is a navigation light rather than an
 * argument.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, emitter core to drive.
 *
 * The two disagree because the 90 m was measured to the array lip rather than
 * past the emitter, so intake and the runtime have both been squeezing this
 * hull by 0.914 since it landed. The numbers below are the approved model's
 * own — they are what `hadron.mjs`'s header transcribes — and the root carries
 * that one squeeze, which makes the file metre-true (kit.mjs) and leaves the
 * shipped maps exactly where they were. Do not "fix" the drawn extent:
 * `tools/hull-maps/build.mjs` normalises with the units table's `lengthM` and
 * `outlines.mjs` rescales to the same number, so both consumers already ignore
 * it.
 */
const L = 90;
const DRAWN = 98.5;

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const node = hadron.ink.resonanceNode();

const root = new THREE.Group();
root.name = 'hadron_clarion';
root.scale.setScalar(L / DRAWN);

// The body: 75 m of spar, 11.9 m in beam and 4.4 m in section. A blade laid
// flat — the beam on this hull is wing, and the body must never read as one.
hadron.bladeBody(root, shadow, { bow: 30, stern: -45, maxR: 5.94, facets: 8, squash: 0.367 });
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    from: -40,
    to: 28,
    y: 2.0,
    section: [1.38, 1.98],
    // The inlay is its own run rather than a fraction of the spine: it starts
    // abaft the canards and stops short of the array, so the lit thread reads
    // as feeding the horn instead of striping the whole back.
    inlay: { from: -24, to: 12, section: [1.2, 2.4], y: 3.0 },
    thread: false,
  }
);

// The bow array, and with it the whole of a cone hull's resting light.
hadron.bowArray(
  root,
  { alloy, crystal, seam, node },
  {
    from: 28,
    to: 45,
    r: 5.54,
    y: 0.6,
    facets: 8,
    squash: 0.809,
    lip: { mat: seam, r: 5.72, t: 1.4, x: 44.9 },
    ridges: false,
    emitter: {
      x: 44,
      r: 2.2,
      scale: [1.59, 1, 1],
      core: { x: 46, r: 1.0, scale: [2.5, 1, 1] },
    },
  }
);
// Six seams ringing the horn, starting off the port shoulder. They are the
// brightest thing on the hull from above, which is the whole of the argument
// for a cone SIG being drawn forward.
hadron.hornSeams(root, seam, {
  x: 38,
  length: 13.84,
  y: 0.6,
  halfHeight: 2.52,
  halfBeam: 3.6,
  count: 6,
  section: [0.46, 2.66],
  phase: 60,
});

// Beam is wing, as it is on every Order hull: 34 m of it, 0.9 m thick. The
// planform is the approved model's own — a swept quadrilateral whose tip sits
// 14 m abaft its root and rakes from z 15 to 17, not the delta a chord-and-span
// form would draw.
hadron.wings(
  root,
  { alloy, crystal },
  {
    outline: [
      [-22, 3],
      [-6, 3],
      [-28, 17],
      [-36, 15],
    ],
    t: 0.9,
    y: 0.65,
    edge: { x: -31.75, length: 8.5, h: 1.4, w: 3.0, z: 15.5, y: 0.8 },
  }
);
hadron.canards(root, alloy, {
  outline: [
    [12, 2.5],
    [18, 2.5],
    [10, 8],
    [6, 7.5],
  ],
  t: 0.7,
  y: 0.65,
});
hadron.finAndKeel(root, alloy, {
  fin: { x: -32, y: 4.7, length: 12, height: 5 },
  keel: { x: -17, y: -4, length: 22, height: 3 },
  t: 0.8,
});

// The drive is a single resonance crystal — no cowling, no ring. The mark
// abaft the spine is the only light on the hull that is not forward of the
// waist, and it is 1.2 m long for that reason.
hadron.drive(
  root,
  { shadow, crystal, node },
  {
    x: -47,
    r: 2.4,
    shape: 'crystal',
    length: 6,
    mark: { mat: seam, size: [1.2, 0.4, 0.8], x: -40, y: 1.6 },
  }
);

await exportGlb(root, 'clarion-hadron.glb');
