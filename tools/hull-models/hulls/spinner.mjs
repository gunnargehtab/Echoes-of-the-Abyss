/**
 * The Spinner — the Commune's mine-layer, 55 m (docs/units.md, "The ordnance
 * hulls").
 *
 * "A seed pod (SIG 8 idle: quieter running than a Light Scout idling; no
 * weapon). A spindle swollen at the waist by the four mine sacs it carries,
 * growth rings, leaf pectorals and tail flukes, a spinneret at the bow.
 * Nearly black: navigation marks only and a dorsal vein that barely shows."
 *
 * So it is the Commune's plainest hull and the one its vocabulary is named
 * after: a pod body, rings, grown sacs, membrane fins, a grown point. Every
 * part here comes from `factions/pelagia.mjs`; nothing is drawn beside it.
 *
 * The sacs are the hull's argument. Four bladders grown on the outside of the
 * waist, each its own size and none opposite another — a mine that leaves the
 * hull is a mine the hull was carrying, and a rank of four matched tubes would
 * be an Order weapon fit rather than a Commune one. `mineSacs` refuses a
 * matched pair for that reason and would throw here if two were sized alike.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, spinneret tip to fluke.
 *
 * The two disagree because the tip was measured off the body rather than the
 * bow, so intake and the runtime have both been squeezing this hull by 0.894
 * since it landed. The numbers below are the approved model's own — they are
 * what `pelagia.mjs`'s header transcribes — and the root carries that one
 * squeeze, which makes the file metre-true (kit.mjs) and leaves the shipped
 * maps exactly where they were.
 */
const L = 55;
const DRAWN = 61.5;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const vein = pelagia.ink.bioVein();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'pelagia_spinner';
root.scale.setScalar(L / DRAWN);

// The body: 16.8 m across the waist and 11.8 m tall, the navy's rule that beam
// is body. Eighteen facets rather than the kit's twelve, because this hull is
// nothing but body and a coarse lathe reads as a nut at sprite size.
pelagia.podBody(root, chitin, { bow: 27.5, stern: -27.5, maxR: 8.4, squash: 0.7, facets: 18 });
pelagia.growthRings(root, ridge, {
  stations: [
    [-7, 5.8],
    [0, 7.0],
    [7, 5.8],
  ],
  squash: 0.71,
});

// The four mine sacs, on the waist where the pod is widest and able to carry
// them. Sizes and stations are the approved model's: no two alike, no two
// opposite, two a side but not a pair.
pelagia.mineSacs(root, { skin: membrane, cap: ridge }, {
  pods: [
    [-4, 3.2, 6.2, 3.4],
    [6, 2.6, 6.6, 3.0],
    [-6, 2.4, -6.8, 3.1],
    [4, 3.4, -5.9, 3.5],
  ],
});

// Leaf pectorals forward and tail flukes aft — swept, and swept opposite ways:
// the pectoral rakes forward off its root and the fluke trails aft off its own.
pelagia.fins(root, membrane, {
  y: 0.45,
  pairs: [
    [
      'pectoral',
      [
        [-2, 6],
        [7, 6],
        [8, 11],
        [3, 12],
      ],
    ],
    [
      'fluke',
      [
        [-19, 2],
        [-24, 1.5],
        [-27, 6],
        [-23, 5.5],
      ],
      { t: 0.4, y: 0.3 },
    ],
  ],
});

pelagia.dorsalBlade(root, ridge, { from: -12, to: -4, y: 4.5, height: 4, t: 1 });
pelagia.nose(root, ridge, { name: 'spinneret', tip: 34, r: 1.2, length: 8, facets: 8 });

// "Nearly black": two nav marks and a vein, and that is the whole light budget
// of a hull quieter at rest than a Light Scout.
pelagia.navMarks(root, light, { marks: [['nav_bow', 25, 1.5]] });
pelagia.navMarks(root, light, { marks: [['nav_dorsal', -8, 8.6]], w: 1.0, d: 0.8 });
pelagia.vein(root, vein, { from: 1, to: 15, y: 5.95 });

await exportGlb(root, 'spinner-pelagia.glb');
