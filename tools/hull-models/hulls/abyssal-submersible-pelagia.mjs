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
 * - The part names are hyphenated throughout, as the file has them; the
 *   material names took the navy's with #891 (below).
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
 *
 * LIGHT PLACEMENT (#890, the light axis of #540). The light audit named
 * `vein-ring-e` as showing under a cell from above: at 1.1 it lies inside
 * the seed's skin, which stands 1.29 tall at its station where the other
 * four rings crest the skin. The block's resting band is its "dim
 * photophores", which in green are these rings, so it stays lit at its
 * name, material, tube, arc and turn and grows to 1.32, standing
 * off the crown as its four fellows do — between growth rings 5 and 6,
 * whose 1.42 and 1.1 it now sits between. Nothing here reaches the
 * length.
 *
 * `eye-sac-3` (#907, from #894's resting measure): the file hung the third
 * sac 0.55 m off its neighbour and 1.25 off the hull. It grows from the
 * seed hull now, seated on the nearest skin from its own station and half
 * its radius in (`grownOrbs` `on`, kit.mjs `seat`), still clustered with
 * the other two on the starboard bow. `diff.mjs` lists it and nothing else.
 *
 * FACETS (#919). The Commune's rule is one facet edge of 1.5 m
 * (docs/asset-prompts-3d.md Block 2c; pelagia.mjs `cut`), asked at this
 * file's scale for each part as its node presses it, and the pass re-cut
 * what was off it: the seed hull, keel, bulge, fins and aft pods sixteen
 * round and sixteen a turn down at 3.5–35 m of radius, where the export had
 * eight to twelve round and ten to eighteen down; the prow beak, nozzle and
 * throat sixteen at 6.7–10 m, where they were eight and nine; the six
 * growth rings sixteen round on tubes of eleven to sixteen at 2.7–5.1 m,
 * where they were fourteen on five; the five vein rings and the fin vein
 * sixteen a turn on five-sided tubes, where they ran thirty-four to
 * forty-six a turn on four; the spine vein and the tendrils five and six,
 * their tips six to nine; the eye sacs five to nine and the prow tip twelve.
 * 35 parts and 4,230 triangles become 35 and 6,516. With round tubes where
 * they had pentagons, growth rings 2 and 5 now touch the vein rings a and d
 * between them on the side each leans to, and ring 1 touches ring 2 and
 * the port fin; the third eye sac, grown from the hull, no longer touches
 * the first.
 *
 * PANELS (#919). The Commune's hull band is a median part from above of
 * 1.5–5 m on a side (Block 2c; pelagia.mjs `panels`), and this hull read
 * 7.8 m over twenty parts: a seed is its hull, six rings, two fins and a
 * nozzle, each tens of square metres from above, and only its tendril tips
 * and prow tip under the band's 25 m². The pass knots the carapace where it
 * grew: eighteen dark knots on the six growth rings, three a ring, 1.2–2 m
 * of radius at bearings of their own off the crown, and six nubs on the
 * bow collar forward of the last ring, 1.15–1.75 m, where the eye sacs
 * leave the port side and both beams bare — each seated on its ring or the
 * hull half its radius in (pelagia.mjs `grownNubs`), no two alike, none
 * over a lit part, and none between the rings, where the hoops leave 1.3 m
 * of skin. They show 2.3–11.4 m² each, and the median part is 2.9 m over
 * forty-four. 35 parts and 6,516 triangles become 59 and 7,318; no part
 * moved, no lamp's plan changed.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 95;
const DRAWN = 7.05;
const DATUM = 0;
// The Commune's facet rule at this file's scale (pelagia.mjs `cut`, #919):
// the builders are handed the export's units and the rule is a chord in
// metres.
const cut = pelagia.cut(L / DRAWN);

// The navy's ink, under the hull names since #891: the export's
// `chitin-hull`, `algae-teal`, `spore-pale` and `biolum-vein` shared their
// hexes with `chitin_hull`, `algae_membrane`, `spore_pod` and `bio_light`
// at finishes of their own (0.15/0.75, 0.1/0.7, 0.05/0.65, a #14301A base;
// `ink` kept them under the hyphens until then) and are those names at
// the hulls' value; the dark rings' hex is this hull's alone and keeps its
// value, hyphen gone. The vein's strength is this file's own, 2.2.
const chitin = pelagia.ink.chitinHull();
const teal = pelagia.ink.algaeMembrane();
const dark = pelagia.ink.growthRingDark();
const pale = pelagia.ink.sporePod();
const vein = pelagia.ink.bioLight(2.2);
const { verbatim } = pelagia;

const root = new THREE.Group();
root.name = 'pelagia-abyssal-submersible';

// The seed: an orb of radius 1.5 drawn out along the keel and rolled 0.08,
// the keel of algae on its back leaned and rolled with it, the dark bulge
// under its belly, and the beak of a prow — a cone, apex forward, squashed
// 0.8 across — with the pale tip on it.
pelagia.grownOrbs(root, {
  cut,
  orbs: [
    ['seed-hull', chitin, 1.5, verbatim([0, 0, 0], [0, 0, 0.08], [1.75, 1, 1.15])],
    ['dorsal-keel', teal, 1, verbatim([-0.5, 1.15, 0.25], [0.18, 0, 0.5], [1.5, 0.85, 0.22])],
    ['ventral-bulge', dark, 0.85, verbatim([0.3, -0.85, -0.45], [0, 0, 0], [1.5, 0.75, 1])],
  ],
});
pelagia.grownCones(root, {
  cut,
  cones: [
    ['prow-beak', teal, [0, 0.75], 1.5, verbatim([2.5, 0.1, 0], [0, 0, -Math.PI / 2], [1, 1, 0.8])],
  ],
});
pelagia.grownOrbs(root, { cut, orbs: [['prow-tip', pale, 0.22, verbatim([3.28, 0.1, 0])]] });

// "Heavy segmented pressure carapace": six growth rings standing across the
// keel, dark and teal by turns, each 1.12 wider than it is tall and each a
// few hundredths off square its own way — and five lit vein rings between
// them, open arcs each turned its own way about the keel, 1.1 wide.
const ACROSS = (lean) => [0, Math.PI / 2 + lean, 0];
/** The six growth rings: station, R, tube, finish and the file's own rotation. */
const GROWTH_RINGS = [
  [-1.9, 1.05, 0.34, dark, [-Math.PI, 1.4708, -Math.PI]],
  [-1.15, 1.38, 0.3, teal, ACROSS(-0.06)],
  [-0.35, 1.52, 0.26, dark, [-Math.PI, 1.4908, -Math.PI]],
  [0.45, 1.46, 0.24, teal, ACROSS(-0.04)],
  [1.2, 1.22, 0.2, dark, [-Math.PI, 1.4708, -Math.PI]],
  [1.85, 0.92, 0.18, teal, ACROSS(0)],
];
pelagia.grownHoops(root, {
  cut,
  hoops: [
    ...GROWTH_RINGS.map(([x, R, tube, mat, rot], i) => [
      `growth-ring-${i + 1}`,
      mat,
      R,
      tube,
      undefined,
      verbatim([x, 0, 0], rot, [1.12, 1, 1]),
    ]),
    [
      'vein-ring-a',
      vein,
      1.28,
      0.045,
      4.6,
      verbatim([-1.55, 0, 0], [0.4, Math.PI / 2, 0], [1.1, 1, 1]),
    ],
    [
      'vein-ring-b',
      vein,
      1.52,
      0.045,
      5.2,
      verbatim([-0.75, 0, 0], [-0.2, Math.PI / 2, 0], [1.1, 1, 1]),
    ],
    [
      'vein-ring-c',
      vein,
      1.55,
      0.045,
      4.4,
      verbatim([0.05, 0, 0], [0.9, Math.PI / 2, 0], [1.1, 1, 1]),
    ],
    [
      'vein-ring-d',
      vein,
      1.38,
      0.045,
      5.0,
      verbatim([0.85, 0, 0], [-0.5, Math.PI / 2, 0], [1.1, 1, 1]),
    ],
    [
      // 1.1 in the file, inside the skin; grown to stand off it (#890).
      'vein-ring-e',
      vein,
      1.32,
      0.045,
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
  cut,
});
pelagia.grownOrbs(root, {
  cut,
  orbs: [
    ['eye-sac-1', vein, 0.16, verbatim([2.35, 0.55, 0.45])],
    ['eye-sac-2', vein, 0.11, verbatim([2.1, 0.72, 0.6])],
    ['eye-sac-3', vein, 0.09, { ...verbatim([2.5, 0.38, 0.62]), on: 'seed-hull' }],
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
    cut,
  }
);

// The stern: a nozzle drawn to a point aft, squashed 0.85
// across, the lit throat inside it — a drum narrowing aft, its after face
// at the nozzle's apex — and two pods beside it, one high to starboard and
// one low to port.
pelagia.grownCones(root, {
  cut,
  cones: [
    [
      'aft-nozzle',
      dark,
      [0, 0.85],
      1.4,
      verbatim([-2.85, 0.05, 0], [0, 0, Math.PI / 2], [1, 1, 0.85]),
    ],
    ['nozzle-throat', vein, [0.35, 0.5], 0.5, verbatim([-3.3, 0.05, 0], [0, 0, Math.PI / 2])],
  ],
});
pelagia.grownOrbs(root, {
  cut,
  orbs: [
    ['aft-pod-a', teal, 0.34, verbatim([-2.6, 0.7, 0.5])],
    ['aft-pod-b', teal, 0.26, verbatim([-2.75, -0.5, -0.55])],
  ],
});

// Two fins, orbs squashed flat, the port one the larger and raked its own
// way, and the lit vein along the port fin's leading edge — an arc of 3.6
// rad, leaned to lie along it.
pelagia.grownOrbs(root, {
  cut,
  orbs: [
    ['fin-port', teal, 0.9, verbatim([-0.4, -0.1, -1.55], [-0.35, 0.25, 0.1], [1.6, 0.14, 0.8])],
    ['fin-stb', teal, 0.75, verbatim([0.1, 0.05, 1.5], [0.3, -0.15, -0.05], [1.4, 0.13, 0.7])],
  ],
});
pelagia.grownHoops(root, {
  cut,
  hoops: [
    [
      'fin-vein',
      vein,
      0.95,
      0.035,
      3.6,
      verbatim([-0.4, -0.08, -1.6], [1.2208, 0.25, 0.6], [1.45, 0.75, 1]),
    ],
  ],
});

// PANELS (#919): the carapace knotted where it grew. Eighteen dark knots on
// the six growth rings, three a ring at bearings of their own off the crown
// — the upper quarters and the beams where no fin or lit vein lies under
// them — and six nubs on the bow collar forward of the last ring, where the
// eye sacs leave the port side and both beams bare. Each is seated on the
// ring or the hull it grew from, half its radius in (pelagia.mjs
// `grownNubs`), no two alike. A seed sits a tenth outside the hoop at its
// bearing, `deg` from the crown, port negative; the hoops are 1.12 wider
// than tall.
const onRing = (n, deg) => {
  const [x, R, tube] = GROWTH_RINGS[n - 1];
  const a = (deg * Math.PI) / 180;
  const k = 1.12 * (R + tube);
  return [x, k * Math.cos(a), 1.12 * k * Math.sin(a)];
};
pelagia.grownNubs(root, dark, {
  name: 'carapace-knot',
  sep: '-',
  first: 1,
  on: GROWTH_RINGS.map((_, i) => `growth-ring-${i + 1}`),
  cut,
  nubs: [
    [0.112, onRing(1, -62)],
    [0.131, onRing(1, 47)],
    [0.094, onRing(1, 78)],
    [0.146, onRing(2, -63)],
    [0.098, onRing(2, -31)],
    [0.123, onRing(2, 72)],
    [0.139, onRing(3, -58)],
    [0.106, onRing(3, 42)],
    [0.116, onRing(3, 66)],
    [0.133, onRing(4, -66)],
    [0.149, onRing(4, -40)],
    [0.11, onRing(4, 62)],
    [0.126, onRing(5, -58)],
    [0.143, onRing(5, -36)],
    [0.09, onRing(5, 44)],
    [0.103, onRing(6, -52)],
    [0.12, onRing(6, -75)],
    [0.136, onRing(6, 60)],
  ],
});
// The seed hull's section at station x: r 1.5 under its node's [1.75, 1, 1.15].
const onBow = (x, deg) => {
  const f = Math.sqrt(1 - (x / 2.625) ** 2);
  const a = (deg * Math.PI) / 180;
  return [x, 1.1 * 1.5 * f * Math.cos(a), 1.1 * 1.725 * f * Math.sin(a)];
};
pelagia.grownNubs(root, dark, {
  name: 'bow-nub',
  sep: '-',
  first: 1,
  on: 'seed-hull',
  cut,
  nubs: [
    [0.13, onBow(2.4, -90)],
    [0.119, onBow(2.4, -52)],
    [0.085, onBow(2.4, -28)],
    [0.105, onBow(2.4, 90)],
    [0.092, onBow(2.25, -70)],
    [0.1, onBow(2.25, 70)],
  ],
});

// The export's two named point lights, one over the back and one at the prow.
pelagia.glow(root, { name: 'glow-dorsal', intensity: 3.5, range: 4, at: [0, 1.2, 0.4] });
pelagia.glow(root, { name: 'glow-prow', intensity: 2.5, range: 3.5, at: [2.4, 0.5, 0.5] });

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'abyssal-submersible-pelagia.glb');
