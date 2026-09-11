/**
 * The Abyssal Submersible, the Order's — 95 m (docs/units.md; the Abyssal
 * Submersible block of docs/asset-prompts-3d.md Block 3, read with the
 * Hadron FACTION block).
 *
 * "Mid-size deep-raiding hull born to crush depth (Pressure Rating 3, SIG 22
 * idle). Heavy segmented pressure carapace, folded manipulator limbs, dim red
 * photophores" — said the Order's way: "precise bilateral symmetry;
 * blade-like, crystalline silhouettes". A pressure hull of pale alloy in
 * three lengths, eight-faceted — a parallel middle, a spear of a bow drawn
 * to a crystal tip, a cone astern — with four bands of shadow indigo standing
 * proud of it, which is the segmented carapace; a crystal ridge along the
 * back with the one lit seam riding it; two dorsal blades astern of the sail,
 * rolled outboard and pitched, each edged in alloy; the sail and its frame;
 * two pairs of dive planes with alloy leading edges, the fore pair toed one
 * way and the aft pair the other; a keel fin; and the drive prism in its
 * square collar.
 *
 * A port of the approved export
 * (docs/concept-art/models/abyssal-submersible-hadron.glb at 3e15409), part
 * for part in its order, every number the export's own. Every part is
 * `factions/hadron.mjs`'s `prism` — eight of them at eight facets, seven at
 * four — or a kit box; every pair goes through `flanks`, `_p` first at the
 * export's +x, which is how the file writes them and where -z is port once
 * the file is turned onto its length (#642). Nothing here is a shape
 * decision; where the export is odd the script is odd with it:
 *
 * - The dorsal blades are pressed to half their width and their alloy edges
 *   to 0.14 of it — but the edges stand 1.06 tall to the blades' 1, so the
 *   edge is a hair proud all round rather than a rim. Both pairs sit on one
 *   node placement, rolled 0.22 outboard and pitched half a radian.
 * - The seam burns at 1.1, not the scout's 1.6 (`submersibleInk`), and it
 *   is the only lamp: the bow tip is unlit crystal.
 * - The drive prism's node carries a reflection — a scale of -1 in x beside
 *   a half turn and three eighths — and is written as the file decomposes
 *   it, not as the rotation it is equivalent to (#588 review, F1).
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 107.50 units long from the drive prism's
 * base to the bow tip's point, hull axis at y = 6; built here metre-true at
 * 95 m along +X, centred on its length, the axis at y = 0. No part's box
 * overhangs either end — the pitched blades and fin sit well inboard of
 * both — so `DRAWN` is the vertex extent. Every number below is the
 * export's, through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 95;
const DRAWN = 107.5;
const DATUM = 6;

const alloy = hadron.submersibleInk.paleAlloy();
const shadow = hadron.submersibleInk.shadowIndigo();
const crystal = hadron.submersibleInk.resonanceCrystal();
const seam = hadron.submersibleInk.crystalSeam();

const root = new THREE.Group();
root.name = 'hadron_submersible';
const bar = (name, mat, size, placement) => part(root, name, box(...size), mat, placement);
/** The pressure hull's drum: eight facets on the hull's axis, `[fore, aft]` radii by `length`. */
const drum = (name, mat, [fore, aft], length, z) =>
  hadron.prism(root, mat, { name, fore, aft, length, facets: 8, ...drawn([0, DATUM, z]) });

// The pressure hull in three lengths — middle, spear, cone — then the four
// bands proud of it at twelve-unit stations, and the crystal tip on the
// spear's point.
drum('hull_mid', alloy, [4.4, 4.4], 46, -6);
drum('bow_spear', alloy, [0.18, 4.4], 34, 34);
drum('stern_cone', alloy, [4.4, 1.1], 18, -38);
[12, 0, -12, -24].forEach((z, i) => drum(`press_band_${i}`, shadow, [4.62, 4.62], 1.6, z));
drum('bow_tip', crystal, [0.05, 0.5], 4, 52);

// The spine: the lit seam first, then the crystal ridge it rides — the
// file's order — and the seam is the whole resting light, facing up.
bar('core_seam', seam, [0.26, 0.22, 58], drawn([0, 10.68, -3]));
bar('core_ridge', crystal, [0.9, 0.7, 60], drawn([0, 10.25, -4]));

// The dorsal blades: a prism each side on one placement — rolled 0.22
// outboard, pitched half a radian — and its edge on the same.
hadron.flanks((tag, sgn) => {
  hadron.prism(root, shadow, {
    name: `dorsal_blade_${tag}`,
    fore: 0.14,
    aft: 2.6,
    length: 13,
    ...hadron.flank(sgn, [1.7, 12.6, -16], [-0.5, 0, 0.22], [0.5, 1, 1]),
  });
  hadron.prism(root, alloy, {
    name: `dorsal_edge_${tag}`,
    fore: 0.1,
    aft: 2.68,
    length: 13.2,
    ...hadron.flank(sgn, [1.7, 12.6, -16], [-0.5, 0, 0.22], [0.14, 1.06, 1]),
  });
});

// The sail, forward on the hull's back, and its frame.
hadron.prism(root, shadow, {
  name: 'sail',
  fore: 1,
  aft: 2.4,
  length: 10,
  ...drawn([0, 10.6, 14], [0, 0, 0], [1.3, 0.75, 1]),
});
hadron.prism(root, alloy, {
  name: 'sail_frame',
  fore: 0.94,
  aft: 2.5,
  length: 10.2,
  ...drawn([0, 10.6, 14], [0, 0, 0], [1.42, 0.18, 1]),
});

// The dive planes: a fore pair and an aft pair, each a plate with an alloy
// leading edge just ahead of it, each pair yawed and rolled a few hundredths
// its own way — all four of a side before the other side, as the file has
// them.
hadron.flanks((tag, sgn) => {
  bar(
    `plane_fore_${tag}`,
    shadow,
    [7.5, 0.55, 3.4],
    hadron.flank(sgn, [6.8, 6, 24], [0, 0.1, -0.08])
  );
  bar(
    `plane_fore_edge_${tag}`,
    alloy,
    [7.7, 0.16, 1.1],
    hadron.flank(sgn, [6.9, 6, 22.6], [0, 0.1, -0.08])
  );
  bar(`plane_aft_${tag}`, shadow, [6.5, 0.5, 3], hadron.flank(sgn, [5.6, 6, -34], [0, -0.12, 0.1]));
  bar(
    `plane_aft_edge_${tag}`,
    alloy,
    [6.7, 0.15, 1],
    hadron.flank(sgn, [5.7, 6, -35.3], [0, -0.12, 0.1])
  );
});

// The keel fin under the cone, pitched half a radian; then the drive — a
// crystal prism tapering astern, its node the reflection the header
// describes, in a square alloy collar.
hadron.prism(root, alloy, {
  name: 'keel_fin',
  fore: 0.12,
  aft: 1.9,
  length: 8,
  ...drawn([0, 1.4, -30], [0.5, 0, 0]),
});
hadron.prism(root, crystal, {
  name: 'drive_prism',
  fore: 0.5,
  aft: 1.4,
  length: 7,
  ...drawn([0, 6, -50], [-Math.PI, 0, (3 * Math.PI) / 4], [-1, 1, 1]),
});
bar('drive_collar', alloy, [4, 4, 1.8], drawn([0, 6, -46.2]));

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'abyssal-submersible-hadron.glb');
