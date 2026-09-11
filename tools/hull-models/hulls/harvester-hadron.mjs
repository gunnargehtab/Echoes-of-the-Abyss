/**
 * The Harvester, the Order's — 75 m (docs/units.md; the Harvester block of
 * docs/asset-prompts-3d.md Block 3, read with the Hadron FACTION block).
 *
 * "Industrial nodule-mining vessel (SIG 18 idle; mining follows the
 * throttle, up to 68 at Overdrive). Wide cargo body, external intake dredge
 * gear; dim at rest, with floodlit mining machinery that reads as its loud
 * state" — said the Order's way: "precise bilateral symmetry; blade-like,
 * crystalline silhouettes". A cargo body of shadow indigo, a box 22 wide on
 * 52 long, rimmed in alloy down each flank, decked over and plated under; a
 * bow wedge and a stern wedge, four-sided prisms pressed wide and flat and
 * edged in alloy; two cargo bays let into the deck, each an alloy frame
 * round a cavity with a crystal sill inboard, and an alloy spine between
 * them; the dredge gear — a cutter bar across the bow on a brace each side,
 * nine crystal teeth pitched down off it, and an intake under the bow each
 * side; a control prism in its frame on the deck with a lit seam each side
 * of it, which are the resting light; a dorsal fin and two lateral fins
 * astern; and the drive prism in its square collar.
 *
 * A port of the approved export
 * (docs/concept-art/models/harvester-hadron.glb at 3e15409), part for part
 * in its order, every number the export's own. Every part is
 * `factions/hadron.mjs`'s `prism` — nineteen of them — or a kit box; every
 * pair goes through `flanks`, `_p` first at the export's +x, which is how
 * the file writes them and where -z is port once the file is turned onto
 * its length (#642). Nothing here is a shape decision; where the export is
 * odd the script is odd with it:
 *
 * - The body is a box 22 units in beam on 83 of length, and the beam is
 *   body, not wing: from above it is the slab `factions/hadron.mjs`'s header
 *   says an Order hull must never be. That is the approved model's argument
 *   with the navy's law, not this script's to settle, and it is reproduced.
 * - The stern wedge and its edge are the bow wedge's prism turned about by
 *   a reflection — a scale of -2.3 in x beside a half turn about x and
 *   another about z, which is the z-flip the export applied — and both are
 *   written as the file decomposes them. The drive prism carries the other
 *   reflection every Z-long Order hull has (#588 review, F1).
 * - The nine teeth are one prism at nine stations 2.05 apart, each its own
 *   buffer, as the file has them.
 * - The seams beside the control prism are the only lamps; the "floodlit
 *   mining machinery" of the loud state is not modelled, and the teeth are
 *   unlit crystal.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, hull axis at y = 5.2; built here metre-true
 * at 75 m along +X, centred on its length, the axis at y = 0. `DRAWN` is the
 * length as intake measures it — the parts' boxes: the nine teeth are
 * pitched 0.45 down at the bow, and each one's box overhangs its point by
 * the base's half-width turned, 0.37 units, so the measure is 83.3407 where
 * the vertices span 82.9710 from the drive prism's base to the teeth's
 * points. Every number below is the export's, through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 75;
const DRAWN = 83.3407;
const DATUM = 5.2;

const shadow = hadron.scoutInk.shadowIndigo();
const alloy = hadron.scoutInk.paleAlloy();
const crystal = hadron.scoutInk.resonanceCrystal();
const seam = hadron.scoutInk.crystalSeam();

const root = new THREE.Group();
root.name = 'hadron_harvester';
const bar = (name, mat, size, placement) => part(root, name, box(...size), mat, placement);

// The cargo body: the box, an alloy rim down each flank a little proud of
// it, the deck plate over and the keel plate under.
bar('hull_main', shadow, [22, 6.5, 52], drawn([0, 5.2, -6]));
hadron.flanks((tag, sgn) =>
  bar(`hull_rim_${tag}`, alloy, [1.6, 7.1, 52.6], hadron.flank(sgn, [10.6, 5.2, -6]))
);
bar('deck_plate', alloy, [22.6, 0.7, 52.6], drawn([0, 8.8, -6]));
bar('keel_plate', alloy, [18, 0.9, 46], drawn([0, 1.75, -6]));

// The wedges: a bow wedge pressed 2.3 wide and 0.68 tall, edged, and the
// stern wedge the same prism turned about by the reflection the header
// describes, edged the same.
hadron.prism(root, shadow, {
  name: 'bow_wedge',
  fore: 1.2,
  aft: 5,
  length: 12,
  ...drawn([0, 5.2, 26], [0, 0, 0], [2.3, 0.68, 1]),
});
hadron.prism(root, alloy, {
  name: 'bow_wedge_edge',
  fore: 1.1,
  aft: 5.12,
  length: 12.2,
  ...drawn([0, 5.2, 26], [0, 0, 0], [2.44, 0.15, 1]),
});
hadron.prism(root, shadow, {
  name: 'stern_wedge',
  fore: 3.4,
  aft: 1,
  length: 8,
  ...drawn([0, 5.2, -36], [-Math.PI, 0, -Math.PI], [-2.3, 0.68, 1]),
});
hadron.prism(root, alloy, {
  name: 'stern_wedge_edge',
  fore: 3.5,
  aft: 0.9,
  length: 8.2,
  ...drawn([0, 5.2, -36], [-Math.PI, 0, -Math.PI], [-2.44, 0.15, 1]),
});

// The cargo bays: an alloy frame each side, the cavity let into it a hair
// deeper, and a crystal sill along the inboard edge — the three of a side
// before the other side — and the alloy spine between the two.
hadron.flanks((tag, sgn) => {
  bar(`bay_frame_${tag}`, alloy, [8.4, 1.6, 30], hadron.flank(sgn, [5.1, 9.3, -7]));
  bar(`bay_cavity_${tag}`, shadow, [7, 1.7, 28.4], hadron.flank(sgn, [5.1, 9.15, -7]));
  bar(`bay_sill_${tag}`, crystal, [0.7, 2, 30], hadron.flank(sgn, [1.35, 9.4, -7]));
});
bar('bay_spine', alloy, [1.4, 2.2, 30], drawn([0, 9.5, -7]));

// The dredge gear: the cutter bar across the bow on a brace each side, nine
// crystal teeth off it pitched 0.45 down, 2.05 apart from the starboard end
// (tooth 0 is at the export's -x, the kit's +z), and
// an intake under the bow each side pitched 0.18 up.
bar('cutter_bar', alloy, [19, 2.6, 2.6], drawn([0, 4.4, 32.5]));
hadron.flanks((tag, sgn) =>
  bar(`cutter_brace_${tag}`, alloy, [1.4, 1.8, 6], hadron.flank(sgn, [7.2, 4.6, 29]))
);
for (let i = 0; i < 9; i++)
  hadron.prism(root, crystal, {
    name: `cutter_tooth_${i}`,
    fore: 0.12,
    aft: 0.85,
    length: 4.6,
    ...drawn([(i - 4) * 2.05, 3.6, 35.4], [-0.45, 0, 0]),
  });
hadron.flanks((tag, sgn) =>
  bar(`intake_${tag}`, shadow, [4.4, 2.8, 5], hadron.flank(sgn, [4.6, 3.9, 24], [0.18, 0, 0]))
);

// The control prism on the deck in its frame, and the lit seam each side of
// it — the whole resting light, and both face up.
hadron.prism(root, shadow, {
  name: 'control_prism',
  fore: 0.8,
  aft: 2.2,
  length: 9,
  ...drawn([0, 11.2, 12], [0, 0, 0], [1.7, 0.8, 1]),
});
hadron.prism(root, alloy, {
  name: 'control_frame',
  fore: 0.74,
  aft: 2.3,
  length: 9.2,
  ...drawn([0, 11.2, 12], [0, 0, 0], [1.84, 0.2, 1]),
});
hadron.flanks((tag, sgn) =>
  bar(`seam_${tag}`, seam, [0.22, 0.3, 16], hadron.flank(sgn, [3.2, 9.62, 10]))
);

// The fins astern: a dorsal pitched half a radian, and a lateral pair yawed
// 0.42 and pressed to half height; then the drive in its collar.
hadron.prism(root, alloy, {
  name: 'fin_dorsal',
  fore: 0.1,
  aft: 2.2,
  length: 9,
  ...drawn([0, 10.4, -34], [-0.5, 0, 0]),
});
hadron.flanks((tag, sgn) =>
  hadron.prism(root, shadow, {
    name: `fin_lateral_${tag}`,
    fore: 0.1,
    aft: 2,
    length: 8,
    ...hadron.flank(sgn, [11.8, 5.2, -33], [0, -0.42, 0], [1, 0.5, 1]),
  })
);
hadron.prism(root, crystal, {
  name: 'drive_prism',
  fore: 0.5,
  aft: 1.5,
  length: 6,
  ...drawn([0, 5.2, -42.5], [-Math.PI, 0, (3 * Math.PI) / 4], [-1, 1, 1]),
});
bar('drive_collar', alloy, [4.2, 4.2, 1.8], drawn([0, 5.2, -39.6]));

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'harvester-hadron.glb');
