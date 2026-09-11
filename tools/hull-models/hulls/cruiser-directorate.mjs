/**
 * The Cruiser, the Directorate's — 130 m (docs/units.md; the Cruiser block
 * of docs/asset-prompts-3d.md Block 3, read with the Directorate FACTION
 * block).
 *
 * "Heavy fleet anchor and command vessel (SIG 55 sustained with systems
 * live). Large layered hull, prominent sensor arrays and fixed hydrophone
 * masts; sustained glow from vents, sensor arrays and lit ports — this is
 * a loud ship and it looks it" — said the Directorate's way: "spiked,
 * insectoid, segmented crustacean forms — asymmetric, yet regimented". A
 * body core, a chitin box 84 units long; eight ranks of plates laid over
 * it, violet and chitin turn about, each with a red rim along its lower
 * edge; sixteen four-sided spikes in two ranks either side of the spine,
 * port and starboard turn about, each its own height; a head shield — a
 * squared wedge twice as wide as it is tall — with a red crest standing on
 * it; two eyes of different sizes; four antennae, two forward and two aft,
 * each aimed at the lamp at its tip; nine whiskers, four forward to port
 * and five aft to starboard, each with its lamp; twelve darts, seven to
 * port and five to starboard; a keel with a light organ along its
 * underside and two spurs; three tail plates with their lips, a telson of
 * six blades fanned about one point and its spike; and the sustained glow
 * — a light band down each flank ribbed three times, seven light domes
 * along the back, four to port and three to starboard, four gills on the
 * flanks, a head mark and a tail mark: SIG 55, and it looks it. Nothing on
 * it mirrors.
 *
 * A port of the approved export
 * (docs/concept-art/models/cruiser-directorate.glb at 3e15409), part for
 * part in its order, every number the export's own. Every part comes from
 * `factions/directorate.mjs` or is a kit box. Nothing here is a shape
 * decision; where the export is odd the script is odd with it: the `_p`
 * parts sit at the export's +x, which is the kit's -z once the file is
 * turned onto its length, and -z is port (#642), so the names are right;
 * the antennae and whiskers are *aimed* — each from a round-numbered root
 * on the carapace at the lamp on its tip, by the minimal rotation from +Y,
 * which is how the file carries every one of its thirteen (the builder,
 * `aimedSpikes`, says how that was checked) — and the fore-port and
 * aft-starboard antenna lamps are one buffer in the file where the other
 * two are one each; the twelve darts share one buffer, the seven light
 * domes are one each, and the six telson blades and the four gills are a
 * buffer each in the file but share one geometry here; and the antenna and
 * whisker lamps are cubes a third of a unit across at the spikes' tips,
 * the light organ strip lies under the keel and the head and tail marks
 * are cubes on the shield and the last plate, where the top-down maps see
 * under a quarter of a square metre of each — the light audit names those
 * fifteen (the fore-port, fore-starboard and aft-starboard antenna lamps,
 * the nine whisker lamps, the strip, the head and the tail), and the
 * approved bake never saw them either.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 146.28 units long tip to tip, hull axis at
 * y = 6.2 (the body core's); built here metre-true at 130 m along +X,
 * centred on its length, the axis at y = 0. `DRAWN` is the length as
 * intake measures it — the parts' boxes — which the aft-starboard
 * antenna's box, aimed with its node, overhangs at the stern: 146.2887
 * over the vertices' 146.28. Every number below is the export's, through
 * kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 130;
const DRAWN = 146.2887;
const DATUM = 6.2;

const violet = directorate.scoutInk.bruiseViolet();
const red = directorate.scoutInk.abyssalRed();
const chitin = directorate.scoutInk.trenchChitin();
const photophore = directorate.scoutInk.redPhotophore(6);

const root = new THREE.Group();
root.name = 'directorate_cruiser';
const bar = (name, mat, size, t, e) => part(root, name, box(...size), mat, drawn(t, e));

// The body core, and eight ranks of plates over it from the bow, the
// fourth the largest, each yawed and rolled a few hundredths its own way,
// each with a red rim 96 % of its width and 1.1 tall seated 0.7 above its
// lower face, 0.12 inside its forward face.
bar('body_core', chitin, [15, 9, 84], [0, 6.2, -4], [0, 0.008, 0]);
directorate.plateSegments(root, red, {
  name: 'plate_rank',
  first: 0,
  lip: { name: 'plate_rim', ratio: [0.96], height: 1.1, thickness: 0.6, inset: 0.12, seat: 0.7 },
  segments: [
    { skin: violet, size: [17.5, 7.5, 11], ...drawn([-0.35, 8.2, 34], [0, 0.02, 0.02]) },
    { skin: chitin, size: [19.5, 8.5, 11.5], ...drawn([0.45, 8.5, 24], [0, -0.03, -0.025]) },
    { skin: violet, size: [21, 9, 11.5], ...drawn([-0.35, 8.65, 14], [0, 0.025, 0.03]) },
    { skin: chitin, size: [21.5, 9.2, 11.5], ...drawn([0.45, 8.71, 4], [0, -0.02, -0.02]) },
    { skin: violet, size: [21, 9, 11.5], ...drawn([-0.35, 8.65, -6], [0, 0.03, 0.025]) },
    { skin: chitin, size: [19.5, 8.4, 11.5], ...drawn([0.45, 8.47, -16], [0, -0.035, -0.03]) },
    { skin: violet, size: [17.5, 7.6, 11], ...drawn([-0.35, 8.23, -26], [0, 0.025, 0.02]) },
    { skin: chitin, size: [15, 6.6, 10], ...drawn([0.45, 7.93, -35.5], [0, -0.03, -0.025]) },
  ],
});

// Sixteen dorsal spikes in two ranks at a 9.6 pitch, port and starboard
// turn about, the port rank 2.6 off the spine at a 1.15 foot and leaned
// 0.42 aft, the starboard 2.4 off at a 1 foot and leaned 0.46; the heights
// cycle by threes, and never the same three on both sides.
const dspike = (side, k, length, y, z) =>
  side === 'p'
    ? {
        name: `dspike_p${k}`,
        radii: [0.02, 1.15],
        length,
        facets: 4,
        ...drawn([2.6, y, z], [0.42, 0, 0.3]),
      }
    : {
        name: `dspike_s${k}`,
        radii: [0.02, 1],
        length,
        facets: 4,
        ...drawn([-2.4, y, z], [0.46, 0, -0.26]),
      };
directorate.spikes(root, red, {
  spikes: [
    dspike('p', 0, 4.6, 15.1, 33),
    dspike('s', 0, 5.2, 15.2, 31.2),
    dspike('p', 1, 5.9, 15.75, 23.4),
    dspike('s', 1, 6.6, 15.9, 21.6),
    dspike('p', 2, 7.2, 16.4, 13.8),
    dspike('s', 2, 3.8, 14.5, 12),
    dspike('p', 3, 4.6, 15.1, 4.2),
    dspike('s', 3, 5.2, 15.2, 2.4),
    dspike('p', 4, 5.9, 15.75, -5.4),
    dspike('s', 4, 6.6, 15.9, -7.2),
    dspike('p', 5, 7.2, 16.4, -15),
    dspike('s', 5, 3.8, 14.5, -16.8),
    dspike('p', 6, 4.6, 15.1, -24.6),
    dspike('s', 6, 5.2, 15.2, -26.4),
    dspike('p', 7, 5.9, 15.75, -34.2),
    dspike('s', 7, 6.6, 15.9, -36),
  ],
});

// The head: a shield of a wedge, twice as wide as tall, yawed 0.025 off
// the keel line, with a red crest standing on it pitched back; two eyes,
// the port one the larger.
directorate.wedgeRostrum(root, violet, {
  name: 'head_shield',
  radii: [2.2, 8.6],
  length: 15,
  squash: [1.5, 0.72],
  ...drawn([0.3, 7.4, 46], [0, 0.025, 0]),
});
bar('head_crest', red, [1.1, 3.2, 10], [0.3, 11.2, 44], [-0.14, 0.025, 0]);
directorate.eyes(root, red, {
  eyes: [
    ['eye_p', 1.5, drawn([4.6, 9.4, 42.5])],
    ['eye_s', 1.2, drawn([-4.1, 9, 43.5])],
  ],
});

// "Prominent sensor arrays and fixed hydrophone masts": four antennae,
// the fore pair in violet and the aft in chitin, each run from a root on
// the carapace to the lamp at its tip — the port ones the longer at each
// end — and nine whiskers off the back, four forward to port at a 1.3
// pitch and five aft to starboard at the same, each to its own lamp.
directorate.aimedSpikes(
  root,
  { spike: violet, tip: photophore },
  {
    spikes: [
      {
        name: 'antenna_fore_p',
        radii: [0.09, 0.32],
        from: [5.2, 9.5, 50],
        to: [13.5, 14.5, 68],
        tip: { name: 'antenna_tip_fp', size: 0.4 },
      },
      {
        name: 'antenna_fore_s',
        radii: [0.09, 0.3],
        from: [-4.6, 9.2, 51],
        to: [-10.5, 13, 66],
        tip: { name: 'antenna_tip_fs', size: 0.34 },
      },
      {
        name: 'antenna_aft_p',
        skin: chitin,
        radii: [0.08, 0.28],
        from: [4.2, 8.8, -48],
        to: [9.5, 12.5, -66],
        tip: { name: 'antenna_tip_ap', size: 0.34 },
      },
      {
        name: 'antenna_aft_s',
        skin: chitin,
        radii: [0.09, 0.3],
        from: [-3.6, 8.6, -49],
        to: [-12, 13.5, -69],
        tip: { name: 'antenna_tip_as', buffer: 'antenna_tip_fp' },
      },
    ],
  }
);
const whisker = (name, from, to) => ({
  name: `whisker_${name}`,
  radii: [0.06, 0.22],
  from,
  to,
  tip: { name: `whisker_tip_${name}`, size: 0.3 },
});
directorate.aimedSpikes(
  root,
  { spike: violet, tip: photophore },
  {
    spikes: [
      whisker('fwd_p0', [3.2, 12.8, 18], [5.4, 17.9, 16.2]),
      whisker('fwd_p1', [3.2, 12.8, 19.3], [6.5, 19.94, 21.5]),
      whisker('fwd_p2', [3.2, 12.8, 20.6], [7.6, 21.98, 18.8]),
      whisker('fwd_p3', [3.2, 12.8, 21.9], [8.7, 17.9, 24.1]),
      whisker('aft_s0', [-2.8, 12.4, -20], [-5, 17.5, -21.8]),
      whisker('aft_s1', [-2.8, 12.4, -18.7], [-6.1, 19.54, -16.5]),
      whisker('aft_s2', [-2.8, 12.4, -17.4], [-7.2, 21.58, -19.2]),
      whisker('aft_s3', [-2.8, 12.4, -16.1], [-8.3, 17.5, -13.9]),
      whisker('aft_s4', [-2.8, 12.4, -14.8], [-9.4, 19.54, -16.6]),
    ],
  }
);

// "Visible torpedo hardpoints", the Corvette's rule at the Cruiser's size:
// twelve darts at an 8.2 pitch, seven to port and five to starboard, the
// starboard rank 0.4 lower and set back 6, each raked forward 0.16 off
// vertical and canted 0.3 outboard, and no sockets.
const dart = (side, sgn, y, z) => ({
  name: `dart_${side}`,
  ...drawn([sgn * 8.6, y, z], [Math.PI / 2 - 0.16, 0, -sgn * 0.3]),
});
directorate.darts(
  root,
  { dart: chitin },
  {
    radii: [0.4, 0.95],
    length: 8.5,
    facets: 6,
    darts: [
      ...[28, 19.8, 11.6, 3.4, -4.8, -13, -21.2].map((z, k) => dart(`p${k}`, 1, 4.6, z)),
      ...[22, 13.8, 5.6, -2.6, -10.8].map((z, k) => dart(`s${k}`, -1, 4.2, z)),
    ],
  }
);

// The keel, the light organ strip along its underside — "lit ports" — and
// two spurs off it leaned aft, neither where the other is.
bar('ventral_keel', violet, [5.5, 2.4, 62], [0.2, 1.9, -2], [0, 0.01, 0]);
bar('light_organ_strip', photophore, [2.4, 0.6, 56], [0.2, 0.72, -2], [0, 0.01, 0]);
directorate.spikes(root, red, {
  spikes: [
    { name: 'keel_spur_a', radii: [0.02, 0.8], length: 4.4, ...drawn([1.6, 1.4, 20], [2.6, 0, 0]) },
    {
      name: 'keel_spur_b',
      radii: [0.02, 0.7],
      length: 3.8,
      ...drawn([-1.2, 1.4, -18], [2.75, 0, 0]),
    },
  ],
});

// The tail: three plates narrowing astern, violet and chitin turn about,
// each yawed its own way and each trailing a lip 90 % of its width and
// 80 % of its height; then six blades of one size fanned about one point
// — chitin, violet, turn about — and the spike astern of them.
directorate.plateSegments(root, red, {
  name: 'tail',
  lip: { ratio: [0.9, 0.8], thickness: 0.45, inset: 0.1, lift: 0.25 },
  segments: [
    { skin: violet, size: [11, 6.4, 9], ...drawn([-0.3, 5.8, -50], [0, -0.04, 0]) },
    { skin: chitin, size: [8.6, 5.2, 8], ...drawn([0.4, 5.4, -57.5], [0, 0.05, 0]) },
    { skin: violet, size: [6.4, 4, 7], ...drawn([-0.3, 5, -64], [0, -0.06, 0]) },
  ],
});
directorate.telsonFan(root, [chitin, violet], {
  size: [0.45, 4.6, 10.5],
  blades: [
    drawn([0.1, 4.8, -71], [-0.2, 0.15, -1]),
    drawn([0.1, 4.8, -71], [-0.2, 0.084, -0.5]),
    drawn([0.1, 4.8, -71], [-0.2, 0, 0]),
    drawn([0.1, 4.8, -71], [-0.2, -0.09, 0.45]),
    drawn([0.1, 4.8, -71], [-0.2, -0.165, 0.9]),
    drawn([0.1, 4.8, -71], [-0.2, -0.24, 1.25]),
  ],
});
directorate.spikes(root, red, {
  spikes: [
    {
      name: 'telson_spike',
      radii: [0.02, 0.7],
      length: 6,
      ...drawn([0.1, 5, -75], [Math.PI / 2 + 0.22, 0, 0]),
    },
  ],
});

// "Sustained glow from vents, sensor arrays and lit ports": a light band
// 78 long down each flank, the starboard one 0.2 lower and set back 1,
// each ribbed three times in chitin; seven light domes along the back,
// each a unit orb squashed its own way by its node, four to port and three
// to starboard at a 20 pitch, offset by 10; four gills on the flanks, two
// a side, each leaned its own way; and a mark on the head and one on the
// tail.
bar('light_band_p', photophore, [0.7, 1.6, 78], [10.3, 8.3, 0], [0, 0.012, 0]);
bar('light_band_s', photophore, [0.7, 1.6, 78], [-10.3, 8.1, -1], [0, -0.01, 0]);
bar('band_rib_p0', chitin, [2.6, 0.9, 1.1], [9.2, 8.3, 32]);
bar('band_rib_s0', chitin, [2.6, 0.9, 1.1], [-9.2, 8.1, 30]);
bar('band_rib_p1', chitin, [2.6, 0.9, 1.1], [9.2, 8.3, -14]);
bar('band_rib_s1', chitin, [2.6, 0.9, 1.1], [-9.2, 8.1, -16]);
bar('band_rib_p2', chitin, [2.6, 0.9, 1.1], [9.2, 8.3, -34]);
bar('band_rib_s2', chitin, [2.6, 0.9, 1.1], [-9.2, 8.1, -36]);
directorate.photophoreDomes(root, photophore, {
  facets: [10, 6],
  domes: [
    ['dome_p0', 1, drawn([4.6, 12, 30], [0, 0, 0], [2.4, 1, 3])],
    ['dome_p1', 1, drawn([4.9, 13.15, 10], [0, 0, 0], [2.6, 1, 3.2])],
    ['dome_p2', 1, drawn([4.5, 13, -10], [0, 0, 0], [2.5, 1, 3.1])],
    ['dome_p3', 1, drawn([4.7, 11.9, -30], [0, 0, 0], [2.2, 1, 2.8])],
    ['dome_s0', 1, drawn([-4.3, 12.9, 20], [0, 0, 0], [2.5, 1, 3.1])],
    ['dome_s1', 1, drawn([-4, 13.2, 0], [0, 0, 0], [2.6, 1, 3.2])],
    ['dome_s2', 1, drawn([-4.4, 12.5, -20], [0, 0, 0], [2.3, 1, 2.9])],
  ],
});
directorate.photophoreMarks(root, photophore, {
  size: [0.4, 5.4, 4.6],
  marks: [
    ['gill_p0', drawn([10.45, 8.6, 19], [0.3, 0, 0.1])],
    ['gill_p1', drawn([10.5, 8.4, -11], [-0.35, 0, 0.1])],
    ['gill_s0', drawn([-11.15, 8.5, 9], [-0.3, 0, -0.1])],
    ['gill_s1', drawn([-9.65, 8.2, -21], [0.35, 0, -0.1])],
  ],
});
bar('photophore_head', photophore, [0.6, 0.6, 0.6], [0.3, 12.9, 47.5]);
bar('photophore_tail', photophore, [0.5, 0.5, 0.5], [0.1, 7.6, -67.5]);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'cruiser-directorate.glb');
