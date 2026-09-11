/**
 * The Clarion — the Order's line hull, 90 m (docs/units.md, "Clarion (Knights)").
 *
 * "The line hull, 90 m — the cone made a ship, a longer hull built around a
 * bow array (SIG 62 ahead, 6 astern; an energy weapon). A faceted blade hull,
 * widest aft, bilaterally symmetric, flaring at the bow into a six-facet horn
 * with an emitter crystal standing in its mouth; canards at the bow, swept
 * guard wings with crystal edges aft, a crystal inlay along the spine. Lit at
 * the horn's lip and along its ridge seams, dark astern but for one mark —
 * louder than a Corvette in front, quieter behind."
 * (docs/asset-prompts-3d.md, Block 3.)
 *
 * The approved model is the one `factions/hadron.mjs` was read off, and this
 * is its port (#586): the committed binary transcribed part for part, in its
 * own export order, every number below the approved file's own. What the
 * module could not yet say — a body, a spine and a horn that are open lathes
 * of four and six facets laid flat rather than a round loft and a cylinder, a
 * lit lip, six seams ringing the horn, a wing and a canard that are their own
 * swept plans, and a drive and an emitter that are four-sided crystal points —
 * went into the module as options and builders rather than being drawn here,
 * because the Cantus and the Reciter are cut the same way.
 *
 * Two things a reader will want to check are the approved model's, not this
 * script's:
 *
 * - The horn's seams are 14 m boxes rolled onto the horn's six edges and then
 *   turned 0.17 rad about their own radial axis, so the ring spirals a little
 *   and dives into the horn toward the lip. Three of the six sit under the
 *   horn, and the export's light audit says so; they are left where they are.
 * - The canard is drawn inside each wing's group, because the approved file
 *   writes `wing_p wing_edge_p canard_p` before the starboard three and
 *   `check.mjs` compares in order.
 *
 * The glow bakes at 27.9 — the compass average of the listed 62
 * (tools/hull-maps/models.mjs), not `sigIdle` — and every lit part but the
 * stern mark is forward of the waist: the lip, the emitter's core and the six
 * horn seams.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, drive base to emitter core tip.
 *
 * The two disagree because the export was drawn 98.5 m long against a design
 * length of 90, so intake and the runtime have both been squeezing this hull
 * by 0.914 since it landed. The numbers below are the approved model's own,
 * and the root carries that one squeeze, which makes the file metre-true
 * (kit.mjs) and leaves the shipped maps exactly where they were. Do not "fix"
 * the drawn extent: `tools/hull-maps/build.mjs` normalises with the units
 * table's `lengthM` and `outlines.mjs` rescales to the same number, so both
 * consumers already ignore it.
 */
const L = 90;
const DRAWN = 98.5;

/** The blade every rung hull is cut to: a four-facet section pressed to 0.55 tall by 1.5 wide. */
const BLADE = [0.55, 1.5];

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const node = hadron.ink.resonanceNode();

const root = new THREE.Group();
root.name = 'hadron_clarion';
root.scale.setScalar(L / DRAWN);

// The body: 75 m of spar from x −45 to 30, 11.9 m in beam and 4.4 m in
// section, widest at x −16 — a blade laid flat, and the beam is still wing.
hadron.bladeBody(root, shadow, {
  profile: [
    [-45, 0.2],
    [-38, 2.6],
    [-16, 5.6],
    [4, 4.8],
    [20, 3.4],
    [30, 2.6],
  ],
  facets: 4,
  flat: BLADE,
});
// The spine and its inlay, each a smaller four-facet ridge on its own stations.
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    profile: [
      [-40, 0.2],
      [-28, 1.4],
      [16, 1.4],
      [28, 0.8],
    ],
    y: 2.0,
    flat: [0.7, 1],
    inlay: {
      profile: [
        [-24, 0.5],
        [-14, 1.7],
        [4, 1.7],
        [12, 0.5],
      ],
      y: 3.0,
      flat: [0.5, 1],
    },
  }
);

// The bow array, and with it the whole of a cone hull's resting light: the
// horn and its lit lip (six facets, a vertex on the crown, pressed to 0.7),
// the emitter crystal and its core as points, then the six seams ringing the
// horn, numbered from the port shoulder round the way the approved file does.
hadron.bowArray(
  root,
  { alloy, crystal, seam, node },
  {
    y: 0.6,
    horn: {
      profile: [
        [28, 2.2],
        [34, 3.2],
        [40, 5.0],
        [44.5, 6.4],
        [45, 6.0],
      ],
      flat: [0.7, 1],
    },
    lip: {
      mat: seam,
      profile: [
        [44.2, 6.3],
        [45.2, 6.6],
        [45.6, 5.8],
      ],
      flat: [0.7, 1],
    },
    ridges: false,
    emitter: { x: 44, r: 2.2, length: 7, core: { x: 46, r: 1.0, length: 5 } },
  }
);
hadron.hornSeams(root, seam, {
  x: 38,
  y: 0.6,
  length: 14,
  section: [0.45, 0.3],
  halfHeight: 2.52,
  halfBeam: 3.6,
  count: 6,
  phase: Math.PI / 3,
  skew: -0.17,
});

// Beam is wing, as it is on every Order hull: 34 m of it, 0.9 m thick, the
// crystal edge a strip along the tip, and the canard in each side's group.
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
    edge: {
      outline: [
        [-36, 15],
        [-28, 17],
        [-27.5, 16],
        [-35, 14],
      ],
      t: 1.4,
      y: 0.8,
    },
    canard: {
      outline: [
        [12, 2.5],
        [18, 2.5],
        [10, 8],
        [6, 7.5],
      ],
      t: 0.7,
      y: 0.65,
    },
  }
);
hadron.finAndKeel(root, alloy, {
  fin: { x: -32, y: 4.7, length: 12, height: 5 },
  keel: { x: -17, y: -4, length: 22, height: 3 },
  t: 0.8,
});

// The drive is a single crystal point, no ring; the mark abaft the spine is
// the only light on the hull that is not forward of the waist.
hadron.drive(
  root,
  { shadow, crystal, node },
  {
    x: -47,
    r: 2.4,
    facets: 4,
    taper: 0,
    length: 6,
    mat: crystal,
    ring: false,
    mark: { mat: seam, size: [1.2, 0.4, 0.8], x: -40, y: 1.6 },
  }
);

await exportGlb(root, 'clarion-hadron.glb');
