/**
 * The Light Scout, the Directorate's — 60 m (docs/units.md; the Light Scout
 * block of docs/asset-prompts-3d.md Block 3, read with the Directorate
 * FACTION block).
 *
 * "Tiny, very fast recon vessel, fragile and nearly silent (SIG 6 idle).
 * Sleek darting silhouette built for kelp and thermal-vein cover; nearly
 * black, navigation marks only" — said the Directorate's way: "spiked,
 * insectoid, segmented crustacean forms — asymmetric, yet regimented". Five
 * plates of carapace butted along the keel, alternating bruise violet and
 * trench chitin, each trailing a red lip and each leaned a little its own
 * way; a squared wedge of a rostrum; two eyes of different sizes; two
 * antennae of different lengths raked back off their sockets; two folded
 * limbs; two dorsal ridges; a keel; two tail plates; a telson of four blades
 * fanned about the tail and its spike; and three photophore domes — a head,
 * one flank, the tail — which are the whole resting light of a hull that
 * idles at SIG 6. Nothing on it mirrors.
 *
 * A port of the approved export
 * (docs/concept-art/models/light-scout-directorate.glb at 3a303c9), part for
 * part in its order, every number the export's own. Every part comes from
 * `factions/directorate.mjs` or is a kit box. Nothing here is a shape
 * decision; where the export is odd the script is odd with it: the `_p`
 * parts sit at the export's +x, which is the kit's -z once the file is
 * turned onto its length, and there is no `photophore_dome_s`.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 28.22 units long tip to tip, hull axis at
 * y = 2.6; built here metre-true at 60 m along +X, centred on its length,
 * the axis at y = 0. `DRAWN` is the length as intake measures it — the
 * parts' boxes — which the rostrum's box, yawed 0.04 with its node,
 * overhangs at the bow by 0.04 units over the vertices' 28.2237. Every
 * number below is the export's, through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 60;
const DRAWN = 28.2651;
const DATUM = 2.6;

const violet = directorate.scoutInk.bruiseViolet();
const red = directorate.scoutInk.abyssalRed();
const chitin = directorate.scoutInk.trenchChitin();
const photophore = directorate.scoutInk.redPhotophore();

const root = new THREE.Group();
root.name = 'directorate_light_scout';
const bar = (name, mat, size, t, e) => part(root, name, box(...size), mat, drawn(t, e));

// The carapace: five plates from the bow, the third the largest, each yawed
// and rolled a few hundredths its own way, each trailing a red lip 92 % of
// its width and 82 % of its height, a hair proud of its forward face.
directorate.plateSegments(root, red, {
  lip: { ratio: [0.92, 0.82], thickness: 0.22, inset: 0.05, lift: 0.08 },
  segments: [
    { skin: violet, size: [2.4, 2, 3.6], ...drawn([0, 2.6, 5.5], [0, 0.03, 0.02]) },
    { skin: chitin, size: [2.7, 2.3, 3.8], ...drawn([0.1, 2.7, 2.4], [0, -0.035, -0.025]) },
    { skin: violet, size: [2.8, 2.4, 3.8], ...drawn([-0.08, 2.65, -0.8], [0, 0.03, 0.03]) },
    { skin: chitin, size: [2.5, 2.1, 3.6], ...drawn([0.12, 2.5, -3.9], [0, -0.04, -0.02]) },
    { skin: violet, size: [2, 1.7, 3.4], ...drawn([-0.1, 2.35, -6.8], [0, 0.045, 0.025]) },
  ],
});

// The head: a beak of a rostrum, wider than tall, yawed 0.04 off the keel
// line; two eyes, the port one the larger; two antennae raked back and
// splayed, each off its own boxed socket.
directorate.wedgeRostrum(root, chitin, {
  radii: [0.12, 1.45],
  length: 4.6,
  squash: [1.1, 0.85],
  ...drawn([0.05, 2.7, 9.6], [0, 0.04, 0]),
});
directorate.eyes(root, red, {
  eyes: [
    ['eye_p', 0.5, drawn([1.05, 3.3, 7.6])],
    ['eye_s', 0.4, drawn([-0.95, 3.15, 7.9])],
  ],
});
directorate.spikes(root, violet, {
  spikes: [
    {
      name: 'antenna_p',
      radii: [0.02, 0.12],
      length: 9.5,
      ...drawn([1.3, 3.6, 2.5], [Math.PI / 2 + 0.14, 0, 0.1]),
    },
    {
      name: 'antenna_s',
      radii: [0.02, 0.1],
      length: 7.5,
      ...drawn([-1.2, 3.5, 3.4], [Math.PI / 2 + 0.17, 0, -0.08]),
    },
  ],
});
bar('antenna_root_p', chitin, [0.5, 0.5, 1.2], [1.15, 3.4, 6.9], [0, 0, 0.2]);
bar('antenna_root_s', chitin, [0.45, 0.45, 1.1], [-1.05, 3.3, 7.1], [0, 0, -0.2]);

// Two limbs folded under the flanks, not a pair; two ridges on the back,
// leaned and splayed each its own way; and the keel.
bar('limb_p', chitin, [0.5, 0.9, 3.2], [1.5, 1.5, 3.2], [0.2, 0, 0.3]);
bar('limb_s', chitin, [0.45, 0.8, 2.9], [-1.4, 1.5, 3.8], [0.22, 0, -0.28]);
directorate.spikes(root, red, {
  spikes: [
    {
      name: 'ridge_a',
      radii: [0.02, 0.3],
      length: 1.2,
      facets: 4,
      ...drawn([-0.15, 4.1, 1.5], [0.5, 0, 0.25]),
    },
    {
      name: 'ridge_b',
      radii: [0.02, 0.26],
      length: 1,
      facets: 4,
      ...drawn([0.2, 3.9, -2.4], [0.55, 0, -0.22]),
    },
  ],
});
bar('ventral_keel', chitin, [1, 0.5, 9], [0.05, 1.35, -0.5], [0, 0.01, 0]);

// The tail: two plates, then four blades of one size fanned about one point
// — chitin, violet, chitin, violet — and the spike astern of them.
bar('tail_1', chitin, [1.5, 1.3, 2.8], [0.08, 2.25, -9.6], [0, -0.05, 0]);
bar('tail_2', violet, [1, 0.9, 2.4], [-0.06, 2.15, -11.8], [0, 0.06, 0]);
directorate.telsonFan(root, [chitin, violet], {
  size: [0.16, 1.5, 3.2],
  blades: [
    drawn([0, 2.1, -14.2], [-0.15, 0.12, -0.7]),
    drawn([0, 2.1, -14.2], [-0.15, 0.045, -0.3]),
    drawn([0, 2.1, -14.2], [-0.15, 0, 0.1]),
    drawn([0, 2.1, -14.2], [-0.15, -0.09, 0.5]),
  ],
});
directorate.spikes(root, red, {
  spikes: [
    {
      name: 'telson_spike',
      radii: [0.02, 0.2],
      length: 1.8,
      ...drawn([0, 2.15, -15.4], [Math.PI / 2 + 0.2, 0, 0]),
    },
  ],
});

// "Nearly black, navigation marks only": three photophore domes in a pattern
// that repeats on neither side, and that is the whole resting light of a
// hull that idles at SIG 6.
directorate.photophoreDomes(root, photophore, {
  domes: [
    ['photophore_dome_head', drawn([0.05, 3.65, 6.4])],
    ['photophore_dome_p', drawn([1.45, 2.9, -0.6])],
    ['photophore_dome_tail', drawn([-0.2, 3, -7.2])],
  ],
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'light-scout-directorate.glb');
