/**
 * The Cantus — the Order's support hull, 80 m (docs/units.md, "The rung, and
 * two hulls a navy").
 *
 * "A resonance node on a hull: the blade body cut down to a carrier, and
 * everything above it spent on one tuned crystal standing in a four-legged
 * cradle amidships. Guard blades aft in place of wings, a bow prism, and no
 * array at all — this hull answers a ping rather than sending one."
 * (docs/asset-prompts-3d.md, Block 3, the rung's roster.)
 *
 * So it is a Clarion that has given up its cone. The parts that survive the
 * trade come straight out of `factions/hadron.mjs` — the same spar, the same
 * thin planar blades, the same crystal drive — and the node that replaces the
 * array went into that module beside the Responsory's resonator rings, because
 * both are the Order hearing where a cone cannot and the next hull to listen
 * should pick one rather than draw a third.
 *
 * The Cantus's SIG 10 is the same in `units.ts` and in the bake table, and it
 * is the quietest figure in the navy. That is a light budget of six parts: the
 * apex, the four ridges up the node's shoulders, and the bow mark. Nothing on
 * the flanks, nothing astern.
 */
import { THREE, add, box, octa, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, bow prism to drive.
 *
 * The two disagree because the 80 m was measured off the blade body rather
 * than the prism ahead of it, so intake and the runtime have both been
 * squeezing this hull by 0.879 since it landed — the widest of the rung's
 * three. The numbers below are the approved model's own and the root carries
 * that one squeeze, which makes the file metre-true (kit.mjs) and leaves the
 * shipped maps exactly where they were.
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

// The body: 80 m of spar and 12.7 m in beam, flatter than the Clarion's
// because it has a node to carry rather than an array to point.
hadron.bladeBody(root, shadow, { bow: 40, stern: -40, maxR: 6.34, facets: 8, squash: 0.344 });
// No inlay: the back of this hull belongs to the node, and a crystal run under
// it would be light the maps can never see.
hadron.spine(
  root,
  { alloy, crystal, seam },
  { from: -36, to: 36, y: 2.2, section: [1.02, 1.7], inlay: false, thread: false }
);

// The node, and the hull's whole argument. Two crystal frusta meeting at the
// waist, a lit apex 12.5 m up, and four legs splaying to pads on the flanks.
hadron.resonanceNode(
  root,
  { shadow, alloy, crystal, seam, node },
  {
    lower: { rTop: 1, rBottom: 0.45, height: 8.94, y: 2.5, length: 26, beam: 16.26 },
    upper: { rTop: 0.3, rBottom: 1, height: 10.88, y: 3.2, length: 25, beam: 15.56 },
    apex: { r: 1.4, y: 10.5, height: 4 },
    cradle: {
      foot: [12.15, -1.8, 12.15],
      head: [6.05, 9.7, 6.05],
      t: 1.0,
      pad: { size: [3, 1.5, 3], y: 2.8 },
    },
    ridges: { from: [9.8, 3.1, 8.62], to: [1.8, 9.3, 1.58], t: 0.7 },
  }
);

// Two seams on the spine, fore and aft of the node. They are unlit crystal
// rather than resonance nodes: a hull at SIG 10 does not stripe its back.
add(root, 'seam_fore', box(14, 0.3, 0.5), seam, [26, 3.3, 0]);
add(root, 'seam_aft', box(14, 0.3, 0.5), seam, [-26, 3.3, 0]);

// Guard blades in place of wings — the same plate, shorter and swept harder,
// standing off the node rather than carrying the hull.
hadron.wings(
  root,
  { alloy, crystal },
  {
    name: 'guard_blade',
    edgeName: 'guard_edge',
    outline: [
      [-20, 12],
      [-30, 3],
      [-18, 3],
      [-14, 12],
    ],
    t: 0.8,
    edge: { x: -18, length: 8, h: 1.2, w: 1.0, z: 11.5, y: 0.8 },
  }
);
hadron.finAndKeel(root, alloy, { fin: { x: -28, y: 5, length: 12, height: 5 }, t: 0.8 });
// A crystal drive with neither ring nor mark: the stern of this hull shows no
// light at all.
hadron.drive(root, { shadow, crystal, node }, {
  x: -42,
  r: 2.4,
  shape: 'crystal',
  length: 6,
  mark: null,
});

// The bow: a plain alloy prism where the Clarion has its horn, and one mark
// abaft it. This is the hull saying it has no array, in the place a Knight
// would look for one.
add(root, 'bow_prism', octa(2), alloy, [42, 0, 0], [0, 0, 0], [2, 1, 1]);
add(root, 'nav_bow', box(1, 0.4, 0.8), seam, [37, 1.6, 0]);

await exportGlb(root, 'cantus-hadron.glb');
