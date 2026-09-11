/**
 * The Corvette, the Order's — 80 m (docs/units.md; the Corvette block of
 * docs/asset-prompts-3d.md Block 3, read with the Hadron FACTION block).
 *
 * "Small fast-attack skirmisher (SIG 28 cruise). Compact aggressive
 * silhouette, visible torpedo hardpoints; dim accent running lights along
 * the hull line" — said the Order's way: "precise bilateral symmetry;
 * blade-like, crystalline silhouettes". The Light Scout's blades grown to a
 * warship: a fore blade and an aft blade of shadow indigo, four-sided prisms
 * drawn to a point each way and edged in a wider, flatter prism of pale
 * alloy; a spine ridge of alloy along the back with a lit seam fore and aft
 * of the canopy, which are the accent lights and the whole resting light; a
 * canopy of the same cut in an alloy frame; a guard wing each side swept
 * out and aft to a point, edged; the hardpoints — a lance prong each side of
 * the bow drawn to a point, a crystal core along it, on a pylon off the
 * blade and a root block; a dorsal, a ventral and two lateral fins astern;
 * the drive prism in its square collar; and a keel blade under the spine.
 *
 * A port of the approved export (docs/concept-art/models/corvette-hadron.glb
 * at 3e15409), part for part in its order, every number the export's own.
 * Every part is `factions/hadron.mjs`'s `prism` — nineteen of them — or a
 * kit box; every pair goes through `flanks`, `_p` first at the export's +x,
 * which is how the file writes them and where -z is port once the file is
 * turned onto its length (#642). Nothing here is a shape decision; where the
 * export is odd the script is odd with it:
 *
 * - The guard wings and their edges are struts between two points in the
 *   export's frame — the wing from (2.2, 5, 6) at the blade to (13.5, 5.9,
 *   -1.5) at its tip, the edge from (6.5, 5.35, 3.2) to (14.2, 6, -2.1) —
 *   so each is a prism born standing on y (`upright`), its length the
 *   distance between the two, its thick end at the hull and its point
 *   outboard and aft, and its node the file's matrix decomposed to a
 *   three-axis Euler. Those four angles are written to seven places: at
 *   6.8 units from the node, parts.mjs's fifth place is a tenth of a
 *   millimetre at the tip.
 * - The drive prism's node carries a reflection — a scale of -1 in x beside
 *   a half turn and three eighths — and is written as the file decomposes
 *   it, not as the rotation it is equivalent to: the two cut the four side
 *   quads along different diagonals (#588 review, F1).
 * - The hardpoints' prongs are edged alloy and their cores crystal; the
 *   blades are the other way about. That is the file's.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 88.10 units long from the drive prism's base
 * to the fore edge's point, hull axis at y = 5; built here metre-true at
 * 80 m along +X, centred on its length, the axis at y = 0. No part's box
 * overhangs either end — the wings sit amidships — so `DRAWN` is the vertex
 * extent. Every number below is the export's, through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 80;
const DRAWN = 88.1;
const DATUM = 5;

const shadow = hadron.scoutInk.shadowIndigo();
const alloy = hadron.scoutInk.paleAlloy();
const crystal = hadron.scoutInk.resonanceCrystal();
const seam = hadron.scoutInk.crystalSeam();

const root = new THREE.Group();
root.name = 'hadron_corvette';
const bar = (name, mat, size, placement) => part(root, name, box(...size), mat, placement);

// The blades: a fore blade drawn to a point at the bow and an aft one drawn
// nearly to a point at the stern, each pressed to under three quarters of
// its height and twice its width, and each edged in a wider, flatter prism
// of alloy a fifth of a unit longer than itself.
hadron.prism(root, shadow, {
  name: 'blade_fore',
  fore: 0.12,
  aft: 4.2,
  length: 46,
  ...drawn([0, 5, 19], [0, 0, 0], [2, 0.72, 1]),
});
hadron.prism(root, alloy, {
  name: 'blade_fore_edge',
  fore: 0.1,
  aft: 4.32,
  length: 46.2,
  ...drawn([0, 5, 19], [0, 0, 0], [2.18, 0.16, 1]),
});
hadron.prism(root, shadow, {
  name: 'blade_aft',
  fore: 4.2,
  aft: 0.9,
  length: 36,
  ...drawn([0, 5, -22], [0, 0, 0], [2, 0.72, 1]),
});
hadron.prism(root, alloy, {
  name: 'blade_aft_edge',
  fore: 4.32,
  aft: 0.8,
  length: 36.2,
  ...drawn([0, 5, -22], [0, 0, 0], [2.18, 0.16, 1]),
});

// The spine: an alloy ridge along the back, and the two lit seams riding on
// top of it fore and aft of the canopy — "dim accent running lights along
// the hull line", and they face up.
bar('spine_ridge', alloy, [0.42, 2.4, 46], drawn([0, 6.4, -4]));
bar('seam_fore', seam, [0.2, 0.3, 7], drawn([0, 7.72, 3.5]));
bar('seam_aft', seam, [0.2, 0.3, 9], drawn([0, 7.72, -16]));

// The canopy, forward on the fore blade, and its frame.
hadron.prism(root, shadow, {
  name: 'canopy',
  fore: 0.5,
  aft: 1.7,
  length: 8,
  ...drawn([0, 7.6, 12], [0, 0, 0], [1.5, 0.8, 1]),
});
hadron.prism(root, alloy, {
  name: 'canopy_frame',
  fore: 0.46,
  aft: 1.78,
  length: 8.1,
  ...drawn([0, 7.6, 12], [0, 0, 0], [1.62, 0.2, 1]),
});

// Guard wings: a prism each side born standing on y and carried to its tip
// by the node — struts, as the header says — edged in alloy.
hadron.flanks((tag, sgn) => {
  hadron.prism(root, shadow, {
    name: `guard_wing_${tag}`,
    fore: 0.14,
    aft: 1.5,
    length: Math.hypot(11.3, 0.9, 7.5),
    upright: true,
    ...hadron.flank(sgn, [7.85, 5.45, 2.25], [-0.6576386, 0.4447587, -1.17051]),
  });
  hadron.prism(root, alloy, {
    name: `guard_edge_${tag}`,
    fore: 0.1,
    aft: 0.5,
    length: Math.hypot(7.7, 0.65, 5.3),
    upright: true,
    ...hadron.flank(sgn, [10.35, 5.675, 0.55], [-0.6790352, 0.4496416, -1.1492057]),
  });
});

// The hardpoints: a lance prong each side, an alloy prism drawn to a point
// and pressed to 0.62 of its height, a crystal core along it a little above
// and ahead, on a pylon off the blade and an alloy root block.
hadron.flanks((tag, sgn) => {
  hadron.prism(root, alloy, {
    name: `lance_prong_${tag}`,
    fore: 0.06,
    aft: 1.05,
    length: 27,
    ...hadron.flank(sgn, [5.4, 5, 21.5], [0, 0, 0], [1, 0.62, 1]),
  });
  hadron.prism(root, crystal, {
    name: `lance_core_${tag}`,
    fore: 0.05,
    aft: 0.55,
    length: 21,
    ...hadron.flank(sgn, [5.4, 5.62, 22.5], [0, 0, 0], [0.7, 0.7, 1]),
  });
  bar(`lance_pylon_${tag}`, shadow, [2.6, 0.9, 3.6], hadron.flank(sgn, [3.6, 5, 9.5]));
  bar(`lance_root_${tag}`, alloy, [1.3, 1.7, 4.4], hadron.flank(sgn, [5.4, 5, 7.5]));
});

// The fins at the stern: dorsal and ventral pitched half a radian apart, and
// a lateral pair yawed 0.45 and pressed to half height.
hadron.prism(root, alloy, {
  name: 'fin_dorsal',
  fore: 0.1,
  aft: 2.6,
  length: 12,
  ...drawn([0, 8.2, -35], [-0.5, 0, 0]),
});
hadron.prism(root, alloy, {
  name: 'fin_ventral',
  fore: 0.1,
  aft: 2.2,
  length: 10,
  ...drawn([0, 2.2, -34.5], [0.5, 0, 0]),
});
hadron.flanks((tag, sgn) =>
  hadron.prism(root, shadow, {
    name: `fin_lateral_${tag}`,
    fore: 0.1,
    aft: 2.4,
    length: 11,
    ...hadron.flank(sgn, [6.2, 5, -34.5], [0, -0.45, 0], [1, 0.5, 1]),
  })
);

// The drive: a crystal prism tapering astern, its node the reflection the
// header describes, in a square alloy collar; and the keel blade under the
// spine.
hadron.prism(root, crystal, {
  name: 'drive_prism',
  fore: 0.4,
  aft: 1.3,
  length: 7,
  ...drawn([0, 5, -42.5], [-Math.PI, 0, (3 * Math.PI) / 4], [-1, 1, 1]),
});
bar('drive_collar', alloy, [3.2, 3.2, 1.6], drawn([0, 5, -39.2]));
bar('keel_blade', alloy, [0.42, 1.8, 34], drawn([0, 3.4, -8]));

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'corvette-hadron.glb');
