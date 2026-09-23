/**
 * The Corvette, the Directorate's — 80 m (docs/units.md; the Corvette block
 * of docs/asset-prompts-3d.md Block 3, read with the Directorate FACTION
 * block).
 *
 * "Small fast-attack skirmisher (SIG 28 cruise). Compact aggressive
 * silhouette, visible torpedo hardpoints; dim accent running lights along
 * the hull line" — said the Directorate's way: "spiked, insectoid,
 * segmented crustacean forms — asymmetric, yet regimented". Five plates of
 * carapace butted along the keel, violet and chitin turn about, each
 * trailing a red lip and each leaned a little its own way, with a
 * four-sided red ridge off each; a squared wedge of a rostrum with a red
 * blade standing on it; two eyes of different sizes; two antennae of
 * different lengths raked back; a jointed limb folded under each bow
 * flank, the port one a fifth larger than the starboard; the torpedo
 * hardpoints — ten darts in their sockets, six to port and four to
 * starboard, raked forward and canted out; a keel with two spurs; four tail
 * plates with their lips, narrowing to a telson of five blades fanned
 * about one point and its spike; and nine photophore marks — five along
 * the port hull line, three along the starboard, one on the tail — which
 * are the running lights of a hull that cruises at SIG 28. Nothing on it
 * mirrors.
 *
 * A port of the approved export
 * (docs/concept-art/models/corvette-directorate.glb at 3e15409), part for
 * part in its order, every number the export's own. Every part comes from
 * `factions/directorate.mjs` or is a kit box. Nothing here is a shape
 * decision; where the export is odd the script is odd with it: the `_p`
 * parts sit at the export's +x, which is the kit's -z once the file is
 * turned onto its length, and -z is port (#642), so the names are right;
 * the telson's blades are one buffer each in the file and share one
 * geometry here, and the darts' sockets, the ridges and the tail lips are
 * a buffer each.
 *
 * THE LIGHT the top-down maps could not see. The export stood its eight
 * hull-line marks on the flanks, a quarter-unit oblong each at 7.6 and
 * 6.2, and its tail mark on the last plate's aft end under the telson
 * blades' pitched tops: all nine under a quarter of a square metre from
 * above, which the light audit named and the approved bake never saw.
 * They are the block's whole resting light — "dim accent running lights
 * along the hull line" — so #890 keeps every one lit and re-seats it on an
 * upward face (docs/models-plan.md §3.2 rule 5), name, material and count
 * unchanged: the eight hull-line marks are pads 0.9 across and 1.6 along,
 * each on the top face of its own plate at that plate's edge — the deck
 * edge rather than the flank, still along the hull line, five to port and
 * three to starboard at the stations the file gave them — and the tail
 * mark is a pad 1.2 square on the last tail plate's top at its centre, 2.3
 * forward of where the cube was and clear of the blades.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 94.31 units long tip to tip, hull axis at
 * y = 5.5 (the third and largest plate's); built here metre-true at 80 m
 * along +X, centred on its length, the axis at y = 0. `DRAWN` is the
 * length as intake measures it — the parts' boxes — which the rostrum's
 * box, yawed 0.03 with its node, overhangs at the bow, and the telson
 * blades' boxes, each rolled and pitched with its node, overhang at the
 * stern: 94.4009 over the vertices' 94.31. Every number below is the
 * export's, through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 80;
const DRAWN = 94.4009;
const DATUM = 5.5;

const violet = directorate.ink.bruiseViolet();
const red = directorate.ink.abyssalRed();
const chitin = directorate.ink.trenchChitin();
// The file's own strength, the scout's 2.6.
const photophore = directorate.ink.redPhotophore(2.6);

const root = new THREE.Group();
root.name = 'directorate_corvette';
const bar = (name, mat, size, t, e) => part(root, name, box(...size), mat, drawn(t, e));
// The export's spikes stand on y and each node lays its own.
const RAKED = (off) => [Math.PI / 2 + off, 0, 0];

// The carapace: five plates from the bow, the third the largest, each
// yawed and rolled a few hundredths its own way, each trailing a red lip
// 94 % of its width and 86 % of its height, a tenth inside its forward
// face and a quarter above its axis.
directorate.plateSegments(root, red, {
  name: 'carapace',
  lip: { ratio: [0.94, 0.86], thickness: 0.5, inset: 0.1, lift: 0.25 },
  segments: [
    { skin: violet, size: [9, 6, 12], ...drawn([0, 5.4, 20], [0, 0.02, 0.015]) },
    { skin: chitin, size: [9.8, 6.6, 12], ...drawn([0.3, 5.6, 10], [0, -0.025, -0.02]) },
    { skin: violet, size: [10.2, 6.8, 12], ...drawn([-0.2, 5.5, 0], [0, 0.02, 0.025]) },
    { skin: chitin, size: [9.4, 6.2, 12], ...drawn([0.35, 5.2, -10], [0, -0.03, -0.015]) },
    { skin: violet, size: [8.2, 5.4, 11], ...drawn([-0.3, 4.9, -19], [0, 0.035, 0.02]) },
  ],
});

// A ridge off each plate: four-sided, leaned half a radian aft and each
// rolled its own way, alternating sides down the back.
const ridge = (name, t, e) => ({
  name,
  radii: [0.02, 1.1],
  length: 3.6,
  facets: 4,
  ...drawn(t, e),
});
directorate.spikes(root, red, {
  spikes: [
    ridge('ridge_0', [-0.4, 10.1, 24], [0.5, 0, 0.28]),
    ridge('ridge_1', [0.5, 10.6, 15], [0.5, 0, -0.22]),
    ridge('ridge_2', [-0.4, 10.8, 5], [0.5, 0, 0.3]),
    ridge('ridge_3', [0.5, 10.4, -4], [0.5, 0, -0.26]),
    ridge('ridge_4', [-0.4, 9.8, -14], [0.5, 0, 0.24]),
  ],
});

// The head: a beak of a rostrum, wider than tall, yawed 0.03 off the keel
// line, with a red blade standing on it and pitched back; two eyes, the
// port one the larger; two antennae raked back and splayed.
directorate.wedgeRostrum(root, chitin, {
  radii: [0.25, 4.1],
  length: 13,
  squash: [1.15, 0.88],
  ...drawn([0.2, 5.8, 31.5], [0, 0.03, 0]),
});
bar('rostrum_blade', red, [0.7, 2.6, 9], [0.2, 7.2, 30], [-0.12, 0.03, 0]);
directorate.eyes(root, red, {
  eyes: [
    ['eye_p', 1.05, drawn([3.1, 7.4, 26.5])],
    ['eye_s', 0.85, drawn([-2.7, 7, 27.5])],
  ],
});
directorate.spikes(root, violet, {
  spikes: [
    {
      name: 'antenna_p',
      radii: [0.02, 0.22],
      length: 7,
      ...drawn([3.4, 9.5, 28.5], [0.9, 0, 0.5]),
    },
    { name: 'antenna_s', radii: [0.02, 0.18], length: 5, ...drawn([-2.9, 9, 29], [1, 0, -0.35]) },
  ],
});

// Two jointed limbs folded under the bow flanks — a shoulder, an upper, a
// forearm and a six-sided claw — drawn from one set of sizes, the port
// limb at 1.15 and the starboard at 0.9, the starboard set 1.6 further
// aft; each joint placed by its own node.
const limb = (prefix, scale, [shoulder, upper, forearm, claw]) =>
  directorate.jointedLimb(root, {
    prefix,
    scale,
    joints: [
      { name: 'shoulder', skin: violet, size: [1.6, 3.4, 4.4], ...shoulder },
      { name: 'upper', skin: chitin, size: [1.3, 1.7, 8.5], ...upper },
      { name: 'forearm', skin: violet, size: [1.1, 1.5, 10], ...forearm },
      { name: 'claw', skin: red, r: 0.75, length: 6.5, facets: 6, ...claw },
    ],
  });
limb('limb_p', 1.15, [
  drawn([4.7, 4.2, 20], [0, 0, 0.18]),
  drawn([5.3, 2.6, 17], [-0.35, 0.06, 0]),
  drawn([5.6, 1.7, 23], [0.12, 0.04, 0]),
  drawn([5.7, 1.8, 30.5], RAKED(-0.08)),
]);
limb('limb_s', 0.9, [
  drawn([-4.7, 4.2, 18.4], [0, 0, -0.18]),
  drawn([-5.3, 2.6, 15.4], [-0.35, -0.06, 0]),
  drawn([-5.6, 1.7, 21.4], [0.12, -0.04, 0]),
  drawn([-5.7, 1.8, 28.9], RAKED(-0.08)),
]);

// "Visible torpedo hardpoints": ten darts at a 4.6 pitch, six to port and
// four to starboard, the starboard rank 0.4 lower and set back 5, each
// raked forward 0.18 off vertical and canted 0.34 outboard, each on a
// socket 2.2 aft of it, 0.4 inboard and 0.5 under.
const dart = (side, sgn, y, z) => ({
  name: `dart_${side}`,
  ...drawn([sgn * 5.35, y, z], [Math.PI / 2 - 0.18, 0, -sgn * 0.34]),
  socket: drawn([sgn * 4.95, y - 0.5, z - 2.2]),
});
directorate.darts(
  root,
  { dart: violet, socket: red },
  {
    radii: [0.34, 0.8],
    length: 7.2,
    facets: 6,
    socket: { size: [1.1, 1.1, 1.4] },
    darts: [
      ...[14, 9.4, 4.8, 0.2, -4.4, -9].map((z, k) => dart(`p${k}`, 1, 6.5, z)),
      ...[9, 4.4, -0.2, -4.8].map((z, k) => dart(`s${k}`, -1, 6.1, z)),
    ],
  }
);

// The keel, and two spurs off it leaned aft, neither where the other is.
bar('ventral_keel', chitin, [3.4, 1.6, 34], [0.15, 1.6, 2], [0, 0.01, 0]);
directorate.spikes(root, violet, {
  spikes: [
    { name: 'keel_spur_a', radii: [0.02, 0.6], length: 3.4, ...drawn([1.1, 0.9, 12], [2.6, 0, 0]) },
    {
      name: 'keel_spur_b',
      radii: [0.02, 0.5],
      length: 2.8,
      ...drawn([-0.8, 0.9, -6], [2.8, 0, 0]),
    },
  ],
});

// The tail: four plates narrowing astern, violet and chitin turn about,
// each yawed its own way and each trailing a lip 90 % of its width and
// 80 % of its height; then five blades of one size fanned about one point
// — chitin, violet, chitin, violet, chitin — and the spike astern of them.
directorate.plateSegments(root, red, {
  name: 'tail',
  lip: { ratio: [0.9, 0.8], thickness: 0.4, inset: 0.08, lift: 0.2 },
  segments: [
    { skin: violet, size: [6.6, 4.4, 8], ...drawn([-0.2, 4.6, -28], [0, -0.04, 0]) },
    { skin: chitin, size: [5.2, 3.4, 7], ...drawn([0.3, 4.3, -34.5], [0, 0.05, 0]) },
    { skin: violet, size: [3.9, 2.5, 6], ...drawn([-0.25, 4, -40.5], [0, -0.06, 0]) },
    { skin: chitin, size: [2.7, 1.7, 5], ...drawn([0.2, 3.8, -45.5], [0, 0.07, 0]) },
  ],
});
directorate.telsonFan(root, [chitin, violet], {
  size: [0.35, 3.2, 7.5],
  blades: [
    drawn([0.1, 3.8, -51.5], [-0.18, 0.1925, -0.9]),
    drawn([0.1, 3.8, -51.5], [-0.18, 0.105, -0.45]),
    drawn([0.1, 3.8, -51.5], [-0.18, 0, 0.05]),
    drawn([0.1, 3.8, -51.5], [-0.18, -0.1225, 0.4]),
    drawn([0.1, 3.8, -51.5], [-0.18, -0.217, 0.75]),
  ],
});
directorate.spikes(root, red, {
  spikes: [
    {
      name: 'telson_spike',
      radii: [0.02, 0.5],
      length: 4.5,
      ...drawn([0.1, 3.9, -54], RAKED(0.25)),
    },
  ],
});

// "Dim accent running lights along the hull line": five marks along the
// port deck edge, three along the starboard, each a pad seated on the top
// face of its own plate at the edge — the plate's top at that edge, with
// its roll (#890, the header) — and one on the tail plate's top, ahead of
// the telson blades; a pattern that repeats on neither side.
directorate.photophoreMarks(root, photophore, {
  size: [0.9, 0.25, 1.6],
  marks: [
    ['photophore_p0', drawn([4, 8.6, 22])],
    ['photophore_p1', drawn([4.6, 8.95, 12])],
    ['photophore_p2', drawn([4.3, 9.15, 3])],
    ['photophore_p3', drawn([4.5, 8.37, -9])],
    ['photophore_p4', drawn([3.2, 7.8, -20])],
    ['photophore_s0', drawn([-4, 8.47, 17])],
    ['photophore_s1', drawn([-4.7, 8.9, 1])],
    ['photophore_s2', drawn([-3.7, 8.49, -15])],
  ],
});
directorate.photophoreMarks(root, photophore, {
  size: [1.2, 0.25, 1.2],
  marks: [['photophore_tail', drawn([0.35, 4.78, -45.5])]],
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'corvette-directorate.glb');
