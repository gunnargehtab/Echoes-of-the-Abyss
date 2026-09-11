/**
 * The Abyssal Submersible, the Commune's — 95 m (docs/units.md; the Abyssal
 * Submersible block of docs/asset-prompts-3d.md Block 3, which pairs the
 * kind with the Directorate, read with the Pelagia FACTION block).
 *
 * "Mid-size deep-raiding hull born to crush depth (Pressure Rating 3, SIG 22
 * idle). Heavy segmented pressure carapace, folded manipulator limbs, dim
 * red photophores" — said the Commune's way, and in green: a seed. A seed
 * of a hull, an orb drawn out to 1.75 of its height along the keel and
 * rolled 0.08; a keel of algae on its back and a dark bulge under its belly;
 * a beak of a prow with a pale tip; six growth rings standing across the
 * keel, dark and teal by turns, each a hundredth or so off square; five
 * lit vein rings between them, none a full turn — open 4.6, 5.2, 4.4, 5.0
 * and 3.8 rad round and each turned its own way about the keel; a lit vein
 * the length of the spine, off to starboard; three lit eye sacs clustered on
 * the starboard bow; four tendrils trailing aft from under the bow to pale
 * tips, no two hanging alike — the "folded manipulator limbs"; a nozzle
 * drawn to a point astern with a lit throat inside it and two pods beside
 * it; two fins of different sizes, the port one carrying a lit vein along
 * its leading edge; and two named points of glow, dorsal and prow.
 *
 * A port of the approved export
 * (docs/concept-art/models/abyssal-submersible-pelagia.glb at 3e15409),
 * part for part in its order, every number the export's own, read off its
 * nodes and its buffers with tools/hull-models/parts.mjs. Every part comes
 * from `factions/pelagia.mjs`: the orbs, cones and hoops through its
 * verbatim builders, the spine vein through `sweptVein`, and the tendrils
 * through one rule that reproduces all twenty-eight stations to the float
 * and every tip node to the double (`abyssalTendrils`). Nothing here is a
 * shape decision; where the export is odd the script is odd with it:
 *
 * - THE FILE IS X-LONG. The same pass that drew the Corvette, Harvester and
 *   Cruiser along Z drew this one along +X, bow forward, so nothing here is
 *   yawed: every node's translation, XYZ Euler and scale goes in verbatim
 *   (`verbatim`, the X-long twin of kit.mjs `drawn`) and every primitive
 *   un-turned. `metreTrue` still scales and centres it as it does the
 *   others.
 * - Its sides are already nautical: `fin-port` at z −1.55, `tendril-port-*`
 *   at −z, `fin-stb` and `tendril-stb-*` at +z, and −z is port (#642).
 *   The names stay.
 * - The names are hyphenated throughout, as the file has them.
 * - Four of the six growth rings carry their yaw as (−π, θ, −π) in XYZ,
 *   which is the same quarter-turn-and-a-bit about Y written the long way;
 *   they are given as the file prints them.
 * - The export carries two named `KHR_lights_punctual` point lights,
 *   `glow-dorsal` and `glow-prow`, as its last two nodes; they are kept
 *   (`glow`). No map can see them.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds, applied to a file that needs no yaw: drawn 7.05 units long
 * — the prow tip's crown at x 3.5 to the nozzle throat's after face at
 * −3.55 — with the hull axis at y = 0; built here metre-true at 95 m along
 * +X, centred on its length. `DRAWN` is that 7.05 as intake measures it,
 * three's `Box3` over the parts' own boxes, which nothing overhangs at
 * either end: the throat is a drum turned a quarter and its box is exact.
 * `DATUM` is 0.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 95;
const DRAWN = 7.05;
const DATUM = 0;

const chitin = pelagia.submersibleInk.chitinHull();
const teal = pelagia.submersibleInk.algaeTeal();
const dark = pelagia.submersibleInk.growthRingDark();
const pale = pelagia.submersibleInk.sporePale();
const vein = pelagia.submersibleInk.biolumVein();
const { verbatim } = pelagia;

const root = new THREE.Group();
root.name = 'pelagia-abyssal-submersible';

// The seed: an orb of radius 1.5 drawn out along the keel and rolled 0.08,
// the keel of algae on its back leaned and rolled with it, the dark bulge
// under its belly, and the beak of a prow — an eight-sided cone, apex
// forward, squashed 0.8 across — with the pale tip on it.
pelagia.grownOrbs(root, {
  orbs: [
    ['seed-hull', chitin, 1.5, [12, 9], verbatim([0, 0, 0], [0, 0, 0.08], [1.75, 1, 1.15])],
    [
      'dorsal-keel',
      teal,
      1,
      [8, 6],
      verbatim([-0.5, 1.15, 0.25], [0.18, 0, 0.5], [1.5, 0.85, 0.22]),
    ],
    [
      'ventral-bulge',
      dark,
      0.85,
      [10, 7],
      verbatim([0.3, -0.85, -0.45], [0, 0, 0], [1.5, 0.75, 1]),
    ],
  ],
});
pelagia.grownCones(root, {
  cones: [
    [
      'prow-beak',
      teal,
      [0, 0.75],
      1.5,
      8,
      verbatim([2.5, 0.1, 0], [0, 0, -Math.PI / 2], [1, 1, 0.8]),
    ],
  ],
});
pelagia.grownOrbs(root, { orbs: [['prow-tip', pale, 0.22, [8, 6], verbatim([3.28, 0.1, 0])]] });

// "Heavy segmented pressure carapace": six growth rings standing across the
// keel, dark and teal by turns, each 1.12 wider than it is tall and each a
// few hundredths off square its own way — and five lit vein rings between
// them, open arcs each turned its own way about the keel, 1.1 wide.
const ACROSS = (lean) => [0, Math.PI / 2 + lean, 0];
pelagia.grownHoops(root, {
  hoops: [
    [
      'growth-ring-1',
      dark,
      1.05,
      0.34,
      [5, 14],
      undefined,
      verbatim([-1.9, 0, 0], [-Math.PI, 1.4708, -Math.PI], [1.12, 1, 1]),
    ],
    [
      'growth-ring-2',
      teal,
      1.38,
      0.3,
      [5, 14],
      undefined,
      verbatim([-1.15, 0, 0], ACROSS(-0.06), [1.12, 1, 1]),
    ],
    [
      'growth-ring-3',
      dark,
      1.52,
      0.26,
      [5, 14],
      undefined,
      verbatim([-0.35, 0, 0], [-Math.PI, 1.4908, -Math.PI], [1.12, 1, 1]),
    ],
    [
      'growth-ring-4',
      teal,
      1.46,
      0.24,
      [5, 14],
      undefined,
      verbatim([0.45, 0, 0], ACROSS(-0.04), [1.12, 1, 1]),
    ],
    [
      'growth-ring-5',
      dark,
      1.22,
      0.2,
      [5, 14],
      undefined,
      verbatim([1.2, 0, 0], [-Math.PI, 1.4708, -Math.PI], [1.12, 1, 1]),
    ],
    [
      'growth-ring-6',
      teal,
      0.92,
      0.18,
      [5, 14],
      undefined,
      verbatim([1.85, 0, 0], ACROSS(0), [1.12, 1, 1]),
    ],
    [
      'vein-ring-a',
      vein,
      1.28,
      0.045,
      [4, 28],
      4.6,
      verbatim([-1.55, 0, 0], [0.4, Math.PI / 2, 0], [1.1, 1, 1]),
    ],
    [
      'vein-ring-b',
      vein,
      1.52,
      0.045,
      [4, 28],
      5.2,
      verbatim([-0.75, 0, 0], [-0.2, Math.PI / 2, 0], [1.1, 1, 1]),
    ],
    [
      'vein-ring-c',
      vein,
      1.55,
      0.045,
      [4, 28],
      4.4,
      verbatim([0.05, 0, 0], [0.9, Math.PI / 2, 0], [1.1, 1, 1]),
    ],
    [
      'vein-ring-d',
      vein,
      1.38,
      0.045,
      [4, 28],
      5.0,
      verbatim([0.85, 0, 0], [-0.5, Math.PI / 2, 0], [1.1, 1, 1]),
    ],
    [
      'vein-ring-e',
      vein,
      1.1,
      0.045,
      [4, 28],
      3.8,
      verbatim([1.55, 0, 0], [0.3, Math.PI / 2, 0], [1.1, 1, 1]),
    ],
  ],
});

// The vein along the spine, bow to stern over five stations, off to
// starboard of the keel line; and three lit eye sacs clustered on the
// starboard bow, each its own size.
pelagia.sweptVein(root, vein, {
  name: 'spine-vein',
  through: [
    [2.9, 0.35, 0.15],
    [1.6, 0.95, 0.45],
    [0, 1.35, 0.55],
    [-1.5, 1.15, 0.5],
    [-2.6, 0.45, 0.3],
  ],
  steps: 24,
  r: 0.05,
});
pelagia.grownOrbs(root, {
  orbs: [
    ['eye-sac-1', vein, 0.16, [8, 6], verbatim([2.35, 0.55, 0.45])],
    ['eye-sac-2', vein, 0.11, [8, 6], verbatim([2.1, 0.72, 0.6])],
    ['eye-sac-3', vein, 0.09, [8, 6], verbatim([2.5, 0.38, 0.62])],
  ],
});

// "Folded manipulator limbs": four tendrils trailing aft from x = 1.6 under
// the bow, two a side, each to its own end and each hanging by its own seed
// of the one rule, tipped with a pale cone — exported tube then tip.
pelagia.abyssalTendrils(
  root,
  { tube: teal, tip: pale },
  {
    tendrils: [
      { name: 'tendril-port-1', seed: 0, z: -0.55, xEnd: -3, r: 0.11 },
      { name: 'tendril-port-2', seed: 1.4, z: -0.85, xEnd: -2.3, r: 0.085 },
      { name: 'tendril-stb-1', seed: 2.2, z: 0.6, xEnd: -2.7, r: 0.1 },
      { name: 'tendril-stb-2', seed: 3.5, z: 0.9, xEnd: -2, r: 0.08 },
    ],
  }
);

// The stern: a nine-sided nozzle drawn to a point aft, squashed 0.85
// across, the lit throat inside it — a drum narrowing aft, its after face
// at the nozzle's apex — and two pods beside it, one high to starboard and
// one low to port.
pelagia.grownCones(root, {
  cones: [
    [
      'aft-nozzle',
      dark,
      [0, 0.85],
      1.4,
      9,
      verbatim([-2.85, 0.05, 0], [0, 0, Math.PI / 2], [1, 1, 0.85]),
    ],
    ['nozzle-throat', vein, [0.35, 0.5], 0.5, 9, verbatim([-3.3, 0.05, 0], [0, 0, Math.PI / 2])],
  ],
});
pelagia.grownOrbs(root, {
  orbs: [
    ['aft-pod-a', teal, 0.34, [8, 6], verbatim([-2.6, 0.7, 0.5])],
    ['aft-pod-b', teal, 0.26, [8, 6], verbatim([-2.75, -0.5, -0.55])],
  ],
});

// Two fins, orbs squashed flat, the port one the larger and raked its own
// way, and the lit vein along the port fin's leading edge — an arc of 3.6
// rad on twenty segments, leaned to lie along it.
pelagia.grownOrbs(root, {
  orbs: [
    [
      'fin-port',
      teal,
      0.9,
      [8, 5],
      verbatim([-0.4, -0.1, -1.55], [-0.35, 0.25, 0.1], [1.6, 0.14, 0.8]),
    ],
    [
      'fin-stb',
      teal,
      0.75,
      [8, 5],
      verbatim([0.1, 0.05, 1.5], [0.3, -0.15, -0.05], [1.4, 0.13, 0.7]),
    ],
  ],
});
pelagia.grownHoops(root, {
  hoops: [
    [
      'fin-vein',
      vein,
      0.95,
      0.035,
      [4, 20],
      3.6,
      verbatim([-0.4, -0.08, -1.6], [1.2208, 0.25, 0.6], [1.45, 0.75, 1]),
    ],
  ],
});

// The export's two named point lights, one over the back and one at the prow.
pelagia.glow(root, { name: 'glow-dorsal', intensity: 3.5, range: 4, at: [0, 1.2, 0.4] });
pelagia.glow(root, { name: 'glow-prow', intensity: 2.5, range: 3.5, at: [2.4, 0.5, 0.5] });

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'abyssal-submersible-pelagia.glb');
