/**
 * The Cantus — the Order's early tempo tool, 80 m (docs/units.md, "Cantus
 * (Foundry)").
 *
 * "A resonance node on a hull, 80 m — the Sounding Spire's grant made mobile
 * (SIG 10 moving; 80 singing, in every quarter; no weapon). A faceted lozenge
 * blade, bilaterally symmetric, carrying an octahedral crystal amidships in a
 * four-strut alloy cradle; guard blades aft, a dorsal fin, drive prism astern.
 * Nearly black at rest — the node's four ridges barely marked — because the
 * node is the light when it sings, and dark when it does not."
 * (docs/asset-prompts-3d.md, Block 3, the rung's roster.)
 *
 * A port of the approved binary (#586), part for part and in its order. The
 * body is the Clarion's blade drawn symmetric end to end, the spine has no
 * inlay, and the node that takes the array's place is `resonanceNode` in
 * `factions/hadron.mjs`: two flattened four-facet lozenges, a point at the
 * apex, four legs and their feet, two lit seams on the spine, four lit ridges
 * — strut then foot a leg at a time, seams next, ridges last, which is the
 * order the file was written in. The guard blades are the wing builder under
 * their own names.
 *
 * Three things a reader will want to check are the approved model's, not this
 * script's: the legs taper from 0.7 to 0.9 m and lean 0.45 rad about X and
 * then about Z as Euler angles, so they do not lie on the diagonals; the
 * ridges are turned atan2(12.5, 11) about Y and dipped 0.55 rad; and the aft
 * pair of ridges carries that dip with its sign reversed, rising toward the
 * flank where the forward pair falls. All three reproduce the binary to six
 * decimals. #594 straightened the cradle to bilateral, and that was a shape
 * decision, not a port.
 *
 * SIG 10 in `units.ts` and in the bake table alike, the quietest figure in the
 * navy: the light budget is the apex, the two spine seams, the four ridges and
 * the bow mark — nothing on the flanks and nothing astern.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, drive base to bow prism tip.
 *
 * The two disagree because the export was drawn 91 m long against a design
 * length of 80, so intake and the runtime have both been squeezing this hull
 * by 0.879 since it landed — the widest of the rung's three. The numbers
 * below are the approved model's own, and the root carries that one squeeze,
 * which makes the file metre-true (kit.mjs) and leaves the shipped maps
 * exactly where they were.
 */
const L = 80;
const DRAWN = 91;

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const node = hadron.ink.resonanceNode();

const root = new THREE.Group();
root.name = 'hadron_cantus';
root.scale.setScalar(L / DRAWN);

// The body: 80 m of spar, symmetric about the node, 12.7 m in beam and 4.4 m
// in section — a shade wider than the Clarion's blade, for the node it carries.
hadron.bladeBody(root, shadow, {
  profile: [
    [-40, 0.2],
    [-34, 2.4],
    [-20, 4.6],
    [-8, 5.6],
    [8, 5.6],
    [20, 4.6],
    [34, 2.4],
    [40, 0.2],
  ],
  facets: 4,
  flat: [0.55, 1.6],
});
// No inlay: the back of this hull belongs to the node.
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    profile: [
      [-36, 0.2],
      [-26, 1.2],
      [26, 1.2],
      [36, 0.2],
    ],
    y: 2.2,
    flat: [0.6, 1],
  }
);

// The node, and the hull's whole argument.
hadron.resonanceNode(
  root,
  { shadow, alloy, crystal, seam, node },
  {
    lower: {
      profile: [
        [-13, 0.2],
        [0, 11.5],
        [13, 0.2],
      ],
      y: 2.5,
      flat: [0.55, 1],
    },
    upper: {
      profile: [
        [-12.5, 0.2],
        [0, 11.0],
        [12.5, 0.2],
      ],
      y: 3.2,
      flat: [0.7, 1],
    },
    apex: { r: 1.4, length: 4, y: 10.5 },
    cradle: {
      at: [9, 4, 9],
      r: [0.7, 0.9],
      length: 14,
      lean: 0.45,
      foot: { at: [12.15, 2.8, 12.15], size: [3, 1.5, 3] },
    },
    spineSeams: { x: 26, y: 3.3, length: 14, section: [0.3, 0.5] },
    ridges: { at: [5.8, 6.2, 5.1], size: [0.7, 0.4, 12.6], pitch: 0.55, yaw: Math.atan2(12.5, 11) },
  }
);

// Guard blades in place of wings: the same plane, shorter and swept harder,
// standing off the node rather than carrying the hull.
hadron.wings(
  root,
  { alloy, crystal },
  {
    name: 'guard_blade',
    edgeName: 'guard_edge',
    outline: [
      [-30, 3],
      [-18, 3],
      [-14, 12],
      [-20, 12],
    ],
    t: 0.8,
    y: 0.8,
    edge: {
      outline: [
        [-22, 12],
        [-14, 12],
        [-14.5, 11],
        [-21, 11],
      ],
      t: 1.2,
      y: 0.8,
    },
  }
);
hadron.finAndKeel(root, alloy, { fin: { x: -28, y: 5, length: 12, height: 5 }, t: 0.8 });
// A crystal point with neither ring nor mark: the stern of this hull shows no light at all.
hadron.drive(
  root,
  { shadow, crystal, node },
  { x: -42, r: 2.4, facets: 4, taper: 0, length: 6, mat: crystal, ring: false, mark: null }
);
// The bow: a plain alloy point where the Clarion has its horn, and one mark
// abaft it — the hull saying it has no array, in the place a Knight would look
// for one.
hadron.bowPrism(root, { alloy, seam }, {
  x: 42,
  r: 2.0,
  length: 8,
  mark: { size: [1, 0.4, 0.8], x: 37, y: 1.6 },
});

await exportGlb(root, 'cantus-hadron.glb');
