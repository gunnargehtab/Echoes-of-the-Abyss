/**
 * The Clarion — the Order's line hull, 90 m (docs/units.md, "Clarion (Knights)").
 *
 * "The line hull, 90 m — the cone made a ship, a longer hull built around a
 * bow array (SIG 62 ahead, 6 astern; an energy weapon). A faceted blade hull,
 * widest aft, bilaterally symmetric, flaring at the bow into a six-facet horn
 * with an emitter crystal standing in its mouth; canards at the bow, swept
 * guard wings with crystal edges aft, a crystal inlay along the spine. Lit at
 * the horn's lip and along six seams over its back and shoulders, dark
 * astern but for one mark — louder than a Corvette in front, quieter behind."
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
 * Three things a reader will want to check; the second is the approved
 * model's, the first and the third this script's own since #890 and #640:
 *
 * - The horn's seams are 14 m boxes at the radius the horn has at x 35.3, so
 *   the flare buries the forward two-thirds of each in the horn and the run
 *   reads as diving toward the lip. The approved file rolled them onto the
 *   horn's six edges as a ring, three of them under the horn, and the light
 *   audit named those three on every build from #586 to #890 — see LIGHT.
 * - The canard is drawn inside each wing's group, because the approved file
 *   writes the +z three (`wing_s wing_edge_s canard_s`, since #642) before the
 *   port three and
 *   `check.mjs` compares in order.
 * - The seams run straight along their edges. The approved model turned each
 *   a further 0.17 rad about its own radial axis, the same way round, so the
 *   ring spiralled: each seam's ends drifted across its facet — 2.37 m on
 *   the pre-port export, 2.16 m in the file this script replaced, one root
 *   scale apart — and no seam had a mirror partner, against Block 2's
 *   "precise bilateral symmetry (the only faction with it)". The port carried that, correctly — a port
 *   decides nothing — and #640 decided for the prose, which is canonical
 *   (docs/graphics-standards.md, "Where the GLB comes from"). Now the seam at
 *   a bearing is the seam at its mirror bearing rolled the other way, the
 *   crown's and the keel's are their own mirrors, and nothing else on the
 *   hull moves.
 *
 * LIGHT (#890). The block's resting clause lights the lip and the six seams,
 * so every seam stays lit, and rule 5 of models-plan.md §3.2 puts each on an
 * upward face:
 * - `horn_seam_3`, `horn_seam_4` and `horn_seam_5` rode the ridges at −120°,
 *   180° and 120°, under the horn, and showed nothing from above. The ring
 *   is now three mirrored pairs over the horn's upper half (`hornSeams`
 *   `bearings`): seams 0 and 2 on the shoulder ridges at ±60° where they
 *   were, 1 and 4 flanking the crown at ±20°, 3 and 5 at ∓40° between.
 *   `diff.mjs` lists 1, 3, 4 and 5 and nothing else; every seam shows
 *   1.6–3.1 m², and the block reads "six seams over its back and shoulders"
 *   since the same change, where it read "its ridge seams".
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
// the emitter crystal and its core as points, then the six seams over the
// horn's back and shoulders, numbered as the approved file numbered its ring
// (see LIGHT).
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
  bearings: [60, 20, -60, -40, -20, 40].map((deg) => (deg * Math.PI) / 180),
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
