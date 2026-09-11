/**
 * The Harvester, the Directorate's — 75 m (docs/units.md; the Harvester
 * block of docs/asset-prompts-3d.md Block 3, read with the Directorate
 * FACTION block).
 *
 * "Industrial nodule-mining vessel (SIG 18 idle; mining follows the
 * throttle, up to 68 at Overdrive). Wide cargo body, external intake
 * dredge gear; dim at rest, with floodlit mining machinery that reads as
 * its loud state" — said the Directorate's way: "spiked, insectoid,
 * segmented crustacean forms — asymmetric, yet regimented". A cargo gut —
 * one wide orb of a belly, 44 units long and 23 across, banded three times
 * in violet; five plates of carapace laid over it, violet and chitin turn
 * about, each with a red rim along its lower edge; a dorsal dome with four
 * four-sided nubs alternating sides; seven skirt plates hung off the
 * flanks, four to port and three to starboard, each with a spike off its
 * outer edge; at the bow the mill — a housing, an eight-sided mouth and
 * six teeth in a ring — with a jointed claw either side of it, the port a
 * fifth larger than the starboard; three tail plates, the first with its
 * lip, and four paddles fanned about the stern; and the light — three seam
 * strips along the belly's bands, a strip down each flank (the port the
 * longer), a bar over the maw and a ring round it, and three domes at the
 * bow, the port flank and the tail — the floodlit mining machinery of a
 * hull that idles at SIG 18. Nothing on it mirrors.
 *
 * A port of the approved export
 * (docs/concept-art/models/harvester-directorate.glb at 3e15409), part for
 * part in its order, every number the export's own. Every part comes from
 * `factions/directorate.mjs` or is a kit box. Nothing here is a shape
 * decision; where the export is odd the script is odd with it: the `_p`
 * parts sit at the export's +x, which is the kit's -z once the file is
 * turned onto its length, and -z is port (#642), so the names are right;
 * the first tail plate's lip is 3 tall on a 3.8 plate — not the 0.8 the
 * Corvette's and the Cruiser's follow — and is a box of its own here, and
 * the second and third tail plates carry none; the three light domes are
 * one buffer in the file and share one geometry here, the skirts, their
 * tips and the teeth are a buffer each, and the four paddles are a buffer
 * each in the file but share one geometry here; and the three seam
 * strips lie *under* the carapace on the belly's bands, where the top-down
 * maps see nothing of them — the light audit names those three, and the
 * approved bake never saw them either.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 80.81 units long tip to tip, hull axis at
 * y = 3.6 (the cargo gut's); built here metre-true at 75 m along +X,
 * centred on its length, the axis at y = 0. `DRAWN` is the length as
 * intake measures it — the parts' boxes — which the port claw's tip, laid
 * across the bow and yawed 0.15 with its node, overhangs at the bow, and
 * the paddles' boxes, each rolled and pitched with its node, overhang at
 * the stern: 81.0323 over the vertices' 80.81. Every number below is the
 * export's, through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 75;
const DRAWN = 81.0323;
const DATUM = 3.6;

const violet = directorate.scoutInk.bruiseViolet();
const red = directorate.scoutInk.abyssalRed();
const chitin = directorate.scoutInk.trenchChitin();
const photophore = directorate.scoutInk.redPhotophore(2.4);

const root = new THREE.Group();
root.name = 'directorate_harvester';
const bar = (name, mat, size, t, e) => part(root, name, box(...size), mat, drawn(t, e));

// The cargo gut: one unit orb of ten meridians and seven stacks, drawn
// 23 × 8.4 × 44 by its node and yawed 0.02, and three violet bands round
// it, each leaned its own way.
directorate.carapaceOrbs(
  root,
  { skin: chitin },
  {
    name: 'cargo_gut',
    facets: [10, 7],
    plates: [{ r: 1, ...drawn([0.2, 3.6, -4], [0, 0.02, 0], [11.5, 4.2, 22]) }],
  }
);
bar('gut_band_a', violet, [21.5, 1.1, 2.6], [0.2, 3.2, 4], [0, 0.02, 0]);
bar('gut_band_b', violet, [22.5, 1.1, 2.6], [0.2, 3.1, -8], [0, -0.015, 0]);
bar('gut_band_c', violet, [19.5, 1.1, 2.4], [0.2, 3.3, -18], [0, 0.02, 0]);

// The carapace over it: five plates from the bow, the third the widest,
// each yawed and rolled a few hundredths its own way, each with a red rim
// 96 % of its width and 1 tall seated 0.6 above its lower face, a tenth
// inside its forward face.
directorate.plateSegments(root, red, {
  name: 'carapace',
  first: 0,
  lip: { name: 'carapace_rim', ratio: [0.96], height: 1, thickness: 0.55, inset: 0.1, seat: 0.6 },
  segments: [
    { skin: violet, size: [20, 4.6, 10], ...drawn([-0.4, 8, 16], [0, 0.025, 0.02]) },
    { skin: chitin, size: [24, 5.2, 10.5], ...drawn([0.5, 8, 7], [0, -0.03, -0.025]) },
    { skin: violet, size: [25.5, 5.4, 10.5], ...drawn([-0.4, 8.5, -3], [0, 0.02, 0.03]) },
    { skin: chitin, size: [23.5, 5, 10.5], ...drawn([0.5, 8, -13], [0, -0.035, -0.02]) },
    { skin: violet, size: [19.5, 4.4, 9.5], ...drawn([-0.4, 8, -22.5], [0, 0.03, 0.025]) },
  ],
});

// The dorsal dome along the back, and four nubs off it, each its own
// height, leaned 0.35 aft and alternating sides.
bar('dorsal_dome', chitin, [10, 2.2, 26], [0.1, 11.3, -3], [0, 0.015, 0]);
const nub = (name, length, t, e) => ({
  name,
  radii: [0.02, 0.85],
  length,
  facets: 4,
  ...drawn(t, e),
});
directorate.spikes(root, red, {
  spikes: [
    nub('nub_0', 2.2, [1, 13.3, 12], [0.35, 0, 0.25]),
    nub('nub_1', 2.6, [-0.8, 13.5, 2], [0.35, 0, -0.25]),
    nub('nub_2', 2, [1.2, 13.2, -9], [0.35, 0, 0.25]),
    nub('nub_3', 2.4, [-0.6, 13.4, -19], [0.35, 0, -0.25]),
  ],
});

// "External intake dredge gear": seven skirt plates of one size hung off
// the flanks, four to port at a 10 pitch and three to starboard set 4
// forward of them, violet and chitin turn about, each leaned half a radian
// down and yawed 0.12, each with a spike 3.1 outboard of it leaned 1.15
// out and 0.2 aft.
const skirt = (name, skin, sgn, x, z) => ({
  name,
  skin,
  ...drawn([sgn * x, 5.6, z], [0, sgn * 0.12, -sgn * 0.5]),
  tip: drawn([sgn * (x + 3.1), 3.6, z], [0.2, 0, -sgn * 1.15]),
});
directorate.skirtPlates(
  root,
  { tip: red },
  {
    size: [6.5, 1.6, 5.5],
    tip: { radii: [0.02, 0.7], length: 3.2, facets: 4 },
    plates: [
      skirt('p0', violet, 1, 11.5, 12),
      skirt('p1', chitin, 1, 12.5, 2),
      skirt('p2', violet, 1, 11.5, -8),
      skirt('p3', chitin, 1, 12.5, -18),
      skirt('s0', violet, -1, 11.5, 8),
      skirt('s1', chitin, -1, 12.5, -2),
      skirt('s2', violet, -1, 11.5, -12),
    ],
  }
);

// The mill at the bow: the housing, the eight-sided mouth stood on its
// face, and six four-sided teeth in a ring 1.7 out from the mouth's axis,
// leaned 0.3 back.
directorate.millMouth(
  root,
  { housing: violet, mouth: chitin, teeth: red },
  {
    housing: { size: [9, 6.5, 5], ...drawn([0.2, 5.6, 23], [0, 0.02, 0]) },
    mouth: { r: 2.6, h: 2.2, facets: 8, ...drawn([0.2, 5.2, 25.6], [Math.PI / 2, 0, 0]) },
    teeth: {
      count: 6,
      r: 1.7,
      at: [0.2, 5.2, 26.2],
      tilt: Math.PI / 2 + 0.3,
      radii: [0.02, 0.55],
      length: 1.8,
      facets: 4,
    },
  }
);

// Two jointed claws either side of the mouth — a shoulder, an arm, a hand,
// two fingers, a four-sided tip and a knuckle — drawn from one set of
// sizes, the port claw at 1.2 and the starboard at 0.95, the starboard set
// 1.2 further aft; each joint placed by its own node.
const claw = (prefix, scale, [shoulder, arm, hand, fingerUp, fingerLo, tip, knuckle]) =>
  directorate.jointedLimb(root, {
    prefix,
    scale,
    joints: [
      { name: 'shoulder', skin: violet, size: [3.2, 4.2, 5], ...shoulder },
      { name: 'arm', skin: chitin, size: [2.6, 3, 9], ...arm },
      { name: 'hand', skin: violet, size: [3.6, 4.4, 8.5], ...hand },
      { name: 'finger_up', skin: chitin, size: [2.2, 1.9, 7], ...fingerUp },
      { name: 'finger_lo', skin: chitin, size: [2, 1.7, 6.4], ...fingerLo },
      { name: 'tip', skin: red, r: 0.9, length: 4.2, facets: 4, ...tip },
      { name: 'knuckle', skin: red, size: [0.7, 2.6, 0.7], ...knuckle },
    ],
  });
claw('claw_p', 1.2, [
  drawn([8.2, 6.2, 16], [0, 0, 0.2]),
  drawn([9.4, 5.2, 21], [-0.06, -0.25, 0]),
  drawn([6.8, 5.4, 27.5], [0, -0.5, 0.06]),
  drawn([3.4, 6.6, 32], [-0.12, -0.72, 0]),
  drawn([3.5, 4.2, 31.5], [0.1, -0.72, 0]),
  drawn([1.5, 5.3, 34.5], [Math.PI / 2 - 0.06, 0, 0.15]),
  drawn([8.9, 7.6, 24.5], [0, 0, 0.3]),
]);
claw('claw_s', 0.95, [
  drawn([-8.2, 6.2, 14.8], [0, 0, -0.2]),
  drawn([-9.4, 5.2, 19.8], [-0.06, 0.25, 0]),
  drawn([-6.8, 5.4, 26.3], [0, 0.5, -0.06]),
  drawn([-3.4, 6.6, 30.8], [-0.12, 0.72, 0]),
  drawn([-3.5, 4.2, 30.3], [0.1, 0.72, 0]),
  drawn([-1.5, 5.3, 33.3], [Math.PI / 2 - 0.06, 0, -0.15]),
  drawn([-8.9, 7.6, 23.3], [0, 0, -0.3]),
]);

// The tail: three plates narrowing astern, the first with a lip of its
// own and the other two pitched up; then four paddles of one size fanned
// about one point — chitin, violet, chitin, violet.
bar('tail_1', violet, [13, 3.8, 6], [-0.2, 5.2, -30], [0, -0.04, 0]);
bar('tail_1_edge', red, [11.7, 3, 0.4], [-0.2, 5.4, -27.1], [0, -0.04, 0]);
bar('tail_2', chitin, [9.5, 2.8, 5], [0.3, 4.6, -34.5], [0.18, 0.05, 0]);
bar('tail_3', violet, [6.5, 2, 4], [-0.2, 3.8, -38], [0.34, -0.05, 0]);
directorate.telsonFan(root, [chitin, violet], {
  name: 'paddle',
  size: [0.4, 2.6, 5],
  blades: [
    drawn([0, 3.2, -41], [0.5, 0.09, -0.7]),
    drawn([0, 3.2, -41], [0.5, 0.03, -0.25]),
    drawn([0, 3.2, -41], [0.5, -0.045, 0.2]),
    drawn([0, 3.2, -41], [0.5, -0.12, 0.6]),
  ],
});

// "Floodlit mining machinery that reads as its loud state": a seam strip
// along each of the gut's three bands, a strip down each flank — 22 to
// port, 15 to starboard, neither where the other is — a bar over the maw
// and a ring round its mouth, and three domes: bow, port flank, tail.
bar('seam_strip_bow', photophore, [20.8, 0.45, 0.5], [0.2, 3.85, 4], [0, 0.02, 0]);
bar('seam_strip_mid', photophore, [21.8, 0.45, 0.5], [0.2, 3.75, -8], [0, -0.015, 0]);
bar('seam_strip_aft', photophore, [18.8, 0.45, 0.5], [0.2, 3.95, -18], [0, 0.02, 0]);
bar('flank_strip_p', photophore, [0.5, 0.5, 22], [12.6, 7.9, -2], [0, 0.03, 0]);
bar('flank_strip_s', photophore, [0.5, 0.5, 15], [-12.7, 7.6, -9], [0, -0.03, 0]);
bar('maw_bar', photophore, [8.2, 1.1, 0.6], [0.2, 8.6, 25.6], [0, 0.02, 0]);
directorate.drums(root, photophore, {
  drums: [
    {
      name: 'maw_ring',
      radii: [2.75, 2.75],
      length: 0.7,
      facets: 8,
      ...drawn([0.2, 5.2, 26.5], [Math.PI / 2, 0, 0]),
    },
  ],
});
directorate.photophoreDomes(root, photophore, {
  r: 0.8,
  facets: [8, 6],
  domes: [
    ['dome_bow', drawn([0.2, 12.5, 16])],
    ['dome_flank_p', drawn([13.2, 7.2, 8])],
    ['dome_tail', drawn([0.3, 6.4, -33.2])],
  ],
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'harvester-directorate.glb');
