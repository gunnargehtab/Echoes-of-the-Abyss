/**
 * The Chorister, the Order's — 50 m (docs/units.md; the Chorister block of
 * docs/asset-prompts-3d.md Block 3, read with the Hadron FACTION block —
 * "the Chorister carries no faction lock, so a navy rendering for one fields
 * it in its own shape language").
 *
 * "The cohort hull, 50 m — the shortest and cheapest hull in the roster,
 * grown chitin over a pressure bladder (SIG 16 idle, 24 cruise). Three
 * overlapping segments with the bladder showing through the middle one as a
 * paler dome, a rostrum, a telson, folded walking limbs, one small dorsal
 * spine-gun off the centreline. Dim" — said the Order's way: "precise
 * bilateral symmetry; blade-like, crystalline silhouettes". Three segments
 * on one axis, four-facet spars laid flat and pressed wide, the outer two
 * of shadow indigo and the middle one of resonance crystal, which is the
 * bladder showing through; a spine of alloy the length of the hull over
 * them; a cage of four alloy struts leaned in over the segments; a bow
 * prism for a rostrum and a drive prism for a telson, four-sided points
 * both; a guard plate and a canard each side, thin alloy plans, for the
 * limbs; a dorsal fin; and the spine-gun — a rail each side of the spine
 * with the lit seam between them — with a navigation mark at the bow and
 * a stern mark, three dim lamps in all.
 *
 * A port of the approved export (docs/concept-art/models/chorister-hadron.glb
 * at 3e15409), part for part in its order, every number the export's own,
 * read off its nodes and its buffers. Every part is `factions/hadron.mjs`'s
 * — `spar`, `cage`, `point`, `wings`, `finAndKeel` — or a kit box. Nothing
 * here is a shape decision; where the export is odd the script is odd with
 * it, and the Chorister is odd in more ways than its four Z-long siblings:
 *
 * - IT IS X-LONG. This is an r169 export of the early pass — the same pass
 *   as the eleven hulls `bothSides` names — drawn bow on +X at 61 units for
 *   50 m, hull axis at y = 0 and nearly centred (x from -30 to 31). So
 *   nothing here is yawed: every part is placed with the kit's `add` in the
 *   export's own frame, with the node's numbers verbatim, and only
 *   `metreTrue` is applied, which scales it to 50 m and moves it half a
 *   unit to centre the length — the same three things the bake and the
 *   runtime do to every file, and nothing either can see.
 * - ITS SIDES ARE RELABELLED (#642). The early pass named its +z parts `_p`,
 *   as the eleven did, and +z is starboard. The part the file writes as
 *   `guard_p` at +z is written here as `guard_s`, and the one at -z as
 *   `guard_p`; the canards and the rails the same. Every buffer stays in
 *   the file's order and on the file's side; only the names turn round.
 *   `wings` draws +z first, as the file does.
 * - The five plates are `plan` extrusions seated on y = 0 with the node
 *   carrying the height (`wings` and `finAndKeel`, `seated`); the mirrored
 *   contour of each pair comes out exactly as the file has it for the
 *   reason `plane` gives. The dorsal fin is an 8 × 0.8 plan raised 4, not a
 *   box.
 * - The bow and drive prisms are born apex-up and laid forward by -π/2
 *   (`point`, `tipUp`): the drive's point faces forward into the hull.
 * - The seam is `ink.crystalSeam`, the Clarion's near-black-based lamp at
 *   strength 1 — not the scout's token-through-and-through seam at 1.6 —
 *   and all three lamps sit on the centreline. The Chorister block asks for
 *   photophores "in a pattern that repeats on neither side"; the FACTION
 *   block says the Order is "the only faction with" exact bilateral
 *   symmetry, and the approved model follows the faction. The spine-gun is
 *   on the centreline for the same reason.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds, applied to a file that already lies along X: 61 units long
 * from the drive prism's base to the bow prism's point, hull axis at y = 0;
 * built here metre-true at 50 m along +X, centred on its length. No part's
 * box overhangs either end, so `DRAWN` is the vertex extent.
 */
import { THREE, add, box, bothSides, metreTrue, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 50;
const DRAWN = 61;
const DATUM = 0;

const shadow = hadron.ink.shadowIndigo();
const crystal = hadron.ink.resonanceCrystal();
const alloy = hadron.ink.paleAlloy();
const seam = hadron.ink.crystalSeam();

const root = new THREE.Group();
root.name = 'hadron_chorister';

// The segments: one spar at three stations, the outer two 16 long on a
// radius of 4.5 and the middle 19 long on 6, each drawn about its own
// middle and pressed to 0.6 tall by 1.4 wide; and the spine over them, 52
// long on 1.2, pressed to 0.6 tall.
const OUTER = [
  [-8, 0.3],
  [-4, 4.5],
  [4, 4.5],
  [8, 0.3],
];
hadron.spar(root, 'segment_0', shadow, { profile: OUTER, x: 15, flat: [0.6, 1.4] });
hadron.spar(root, 'segment_1', crystal, {
  profile: [
    [-9.5, 0.3],
    [-4.75, 6],
    [4.75, 6],
    [9.5, 0.3],
  ],
  flat: [0.6, 1.4],
});
hadron.spar(root, 'segment_2', shadow, { profile: OUTER, x: -16, flat: [0.6, 1.4] });
hadron.spar(root, 'spine', alloy, {
  profile: [
    [-26, 0.2],
    [-20, 1.2],
    [20, 1.2],
    [26, 0.2],
  ],
  y: 2.6,
  flat: [0.6, 1],
});

// The cage: four struts over the middle segment, leaned half a radian in.
hadron.cage(root, alloy, { r: [0.4, 0.5], length: 8, at: [5, 2, 4], lean: 0.5 });

// The rostrum and the telson: an alloy point at the bow and a crystal one
// at the stern, both born apex-up.
hadron.point(root, 'bow_prism', alloy, { x: 27, r: 2.2, length: 8, tipUp: true });
hadron.point(root, 'drive_prism', crystal, { x: -27, r: 1.8, length: 6, tipUp: true });

// The limbs: a guard plate aft and a canard forward each side, seated on
// y = 0.2 — starboard first, as the file writes its +z pair first — and the
// dorsal fin, a plan raised four units from y = 2.
hadron.wings(
  root,
  { alloy },
  {
    name: 'guard',
    outline: [
      [-18, 3],
      [-10, 3],
      [-8, 10],
      [-12, 10],
    ],
    t: 0.7,
    y: 0.2,
    seated: true,
    canard: {
      outline: [
        [14, 3],
        [10, 7],
        [7, 6.5],
        [10, 3],
      ],
      t: 0.6,
      y: 0.2,
    },
  }
);
hadron.finAndKeel(root, alloy, {
  fin: {
    outline: [
      [-22, 0.4],
      [-22, -0.4],
      [-14, -0.4],
      [-14, 0.4],
    ],
    height: 4,
    y: 2,
  },
});

// The spine-gun: a rail each side of the spine forward — starboard first,
// as above — and the lit seam between them; then the marks at bow and
// stern. "Dim": three lamps, and that is the whole resting light.
bothSides((side, sgn) => add(root, `rail_${side}`, box(12, 0.5, 0.5), alloy, [18, 2.8, sgn * 1.6]));
add(root, 'rail_seam', box(8, 0.3, 0.4), seam, [18, 3.15, 0]);
add(root, 'nav_bow', box(0.9, 0.4, 0.8), seam, [24, 1.4, 0]);
add(root, 'stern_mark', box(0.9, 0.4, 0.8), seam, [-24, 1.4, 0]);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'chorister-hadron.glb');
