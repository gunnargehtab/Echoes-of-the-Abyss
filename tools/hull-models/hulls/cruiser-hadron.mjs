/**
 * The Cruiser, the Order's — 130 m (docs/units.md; the Cruiser block of
 * docs/asset-prompts-3d.md Block 3, read with the Hadron FACTION block).
 *
 * "Heavy fleet anchor and command vessel (SIG 55 sustained with systems
 * live). Large layered hull, prominent sensor arrays and fixed hydrophone
 * masts; sustained glow from vents, sensor arrays and lit ports — this is a
 * loud ship and it looks it" — said the Order's way: "precise bilateral
 * symmetry; blade-like, crystalline silhouettes". The Corvette's blades at
 * 130 m: a fore blade and an aft blade of shadow indigo, four-sided prisms
 * drawn to a point each way, edged in pale alloy, the bow's point capped in
 * alloy; a lit crystal spine the length of the back and a second under the
 * keel; five pairs of armour plates along the shoulders, rolled outboard,
 * and four ribs across the spine between them, which are the layers; eight
 * lit facet panels down the flanks, four a side, which are the lit ports;
 * two hydrophone masts, a pylon each side of the spine carrying a fork of
 * two arms with a lit crystal standing in each and a bridge between; the
 * citadel forward in its frame; a guard wing each side swept out and aft to
 * a point, edged, with a lateral fin astern of it; a dorsal and a ventral
 * fin; and the drive prism, lit, in its square collar.
 *
 * A port of the approved export (docs/concept-art/models/cruiser-hadron.glb
 * at 3e15409), part for part in its order, every number the export's own.
 * Every part is `factions/hadron.mjs`'s `prism` — sixteen of them — or a
 * kit box; every pair goes through `flanks`, `_p` first at the export's +x,
 * which is how the file writes them and where -z is port once the file is
 * turned onto its length (#642): the armour and the panels a pair at a
 * time, the masts a whole side at a time, and each guard wing with its edge
 * and its lateral fin. Nothing here is a shape decision; where the export
 * is odd the script is odd with it:
 *
 * - The lamps are the Cruiser's own (`cruiserInk`): a core glow at 4.5 on
 *   the two spines, the four fork crystals and the drive, and a panel glow
 *   at 3.2 on the eight facet panels. The drive prism is a lamp — the one
 *   Z-long Order drive that is — and the ventral spine lies under the hull,
 *   where the top-down bake has never seen it; `exportGlb`'s light audit
 *   says so, and it stays.
 * - The guard wings and their edges are struts between two points in the
 *   export's frame — the wing from (3.5, 8, -44) at the blade to (19, 9.4,
 *   -54) at its tip, the edge from (9, 8.6, -47.5) to (20, 9.5, -55) — so
 *   each is a prism born standing on y (`upright`), its length the distance
 *   between the two, its thick end at the hull and its point outboard and
 *   aft, its node the file's matrix decomposed to a three-axis Euler and
 *   written to seven places (at 9.2 units from the node, parts.mjs's fifth
 *   place is a tenth of a millimetre at the tip).
 * - The drive prism's node carries a reflection — a scale of -1 in x beside
 *   a half turn and three eighths — and is written as the file decomposes
 *   it, not as the rotation it is equivalent to (#588 review, F1).
 * - The three stern fins are pitched and yawed each its own amount — the
 *   dorsal 0.42, the ventral 0.46, the laterals 0.4 — where the Corvette's
 *   are all 0.45 and 0.5. The file's.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 140.00 units long from the drive prism's
 * base to the bow cap's point, hull axis at y = 8; built here metre-true at
 * 130 m along +X, centred on its length, the axis at y = 0. No part's box
 * overhangs either end — the pitched fins stop 8 units short of the drive —
 * so `DRAWN` is the vertex extent. Every number below is the export's,
 * through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 130;
const DRAWN = 140;
const DATUM = 8;

const shadow = hadron.cruiserInk.shadowIndigo();
const alloy = hadron.cruiserInk.paleAlloy();
const core = hadron.cruiserInk.crystalCoreGlow();
const panel = hadron.cruiserInk.crystalPanelGlow();

const root = new THREE.Group();
root.name = 'hadron_cruiser';
const bar = (name, mat, size, placement) => part(root, name, box(...size), mat, placement);

// The blades: a fore blade drawn to a point at the bow and an aft one drawn
// nearly to a point at the stern, each pressed to 0.78 of its height and
// 2.1 times its width, and each edged in a wider, flatter prism of alloy
// three tenths of a unit longer than itself.
hadron.prism(root, shadow, {
  name: 'hull_fore',
  fore: 0.15,
  aft: 7.2,
  length: 62,
  ...drawn([0, 8, 35], [0, 0, 0], [2.1, 0.78, 1]),
});
hadron.prism(root, alloy, {
  name: 'hull_fore_edge',
  fore: 0.12,
  aft: 7.35,
  length: 62.3,
  ...drawn([0, 8, 35], [0, 0, 0], [2.28, 0.17, 1]),
});
hadron.prism(root, shadow, {
  name: 'hull_aft',
  fore: 7.2,
  aft: 1.6,
  length: 68,
  ...drawn([0, 8, -30], [0, 0, 0], [2.1, 0.78, 1]),
});
hadron.prism(root, alloy, {
  name: 'hull_aft_edge',
  fore: 7.35,
  aft: 1.45,
  length: 68.3,
  ...drawn([0, 8, -30], [0, 0, 0], [2.28, 0.17, 1]),
});

// The spines: a lit crystal run the length of the back, and a second under
// the keel, where nothing from above can see it.
bar('crystal_spine', core, [1.6, 1.4, 124], drawn([0, 12.15, 1]));
bar('crystal_spine_ventral', core, [1.3, 1, 96], drawn([0, 3.6, -6]));

// The layers: five pairs of armour plates along the shoulders, each its own
// size and station, rolled 0.14 outboard, `_p` then `_s` a pair at a time;
// then four ribs across the spine between them.
[
  [3.9, 22, [5.2, 1.6, 14]],
  [4.3, 6, [6, 1.6, 12]],
  [4.3, -10, [6, 1.6, 12]],
  [3.9, -26, [5.2, 1.6, 12]],
  [3.4, -40, [4.2, 1.6, 10]],
].forEach(([x, z, size], i) =>
  hadron.flanks((tag, sgn) =>
    bar(`armor_${i}_${tag}`, alloy, size, hadron.flank(sgn, [x, 12, z], [0, 0, 0.14]))
  )
);
[14.5, -2, -18, -33.5].forEach((z, i) =>
  bar(`rib_${i}`, shadow, [7.5, 0.9, 2.2], drawn([0, 12.7, z]))
);

// The lit ports: four facet panels down each flank, the middle two the
// larger, each rolled 0.42 outboard and yawed 0.06 to lie along the blade's
// taper, `_p` then `_s` a pair at a time.
[
  [9.17, 26, [0.5, 3.4, 7]],
  [10.16, 8, [0.5, 4.2, 9]],
  [9.94, -12, [0.5, 4.2, 9]],
  [8.84, -32, [0.5, 3.4, 7]],
].forEach(([x, z, size], i) =>
  hadron.flanks((tag, sgn) =>
    bar(`facet_panel_${i}_${tag}`, panel, size, hadron.flank(sgn, [x, 7.6, z], [0, -0.06, 0.42]))
  )
);

// The hydrophone masts: a pylon each side of the spine — base and stem — a
// fork of two arms fore and aft, a lit crystal standing in each, and the
// bridge between the arms; the seven of a side before the other side.
hadron.flanks((tag, sgn) => {
  bar(`pylon_base_${tag}`, alloy, [2.4, 3.4, 4.6], hadron.flank(sgn, [5.6, 13.6, 2]));
  bar(`pylon_stem_${tag}`, shadow, [1.4, 4.2, 2.2], hadron.flank(sgn, [5.6, 17.2, 2]));
  bar(`fork_arm_f_${tag}`, alloy, [1, 7.5, 1], hadron.flank(sgn, [5.6, 22.6, 3.6]));
  bar(`fork_arm_a_${tag}`, alloy, [1, 7.5, 1], hadron.flank(sgn, [5.6, 22.6, 0.4]));
  bar(`fork_crystal_f_${tag}`, core, [0.55, 6, 0.55], hadron.flank(sgn, [5.6, 23.2, 2.75]));
  bar(`fork_crystal_a_${tag}`, core, [0.55, 6, 0.55], hadron.flank(sgn, [5.6, 23.2, 1.25]));
  bar(`fork_bridge_${tag}`, alloy, [1.2, 1.2, 4.4], hadron.flank(sgn, [5.6, 19.4, 2]));
});

// The citadel, forward on the back, and its frame.
hadron.prism(root, shadow, {
  name: 'citadel',
  fore: 0.9,
  aft: 2.6,
  length: 12,
  ...drawn([0, 13.4, 18], [0, 0, 0], [1.6, 0.85, 1]),
});
hadron.prism(root, alloy, {
  name: 'citadel_frame',
  fore: 0.84,
  aft: 2.7,
  length: 12.2,
  ...drawn([0, 13.4, 18], [0, 0, 0], [1.74, 0.22, 1]),
});

// Guard wings: a prism each side born standing on y and carried to its tip
// by the node — struts, as the header says — edged in alloy, and the
// lateral fin astern of each, yawed 0.4 and pressed to half height, in the
// same side's group.
hadron.flanks((tag, sgn) => {
  hadron.prism(root, shadow, {
    name: `guard_wing_${tag}`,
    fore: 0.2,
    aft: 2.2,
    length: Math.hypot(15.5, 1.4, 10),
    upright: true,
    ...hadron.flank(sgn, [11.25, 8.7, -49], [-0.6384882, 0.4346264, -1.1778171]),
  });
  hadron.prism(root, alloy, {
    name: `guard_edge_${tag}`,
    fore: 0.14,
    aft: 0.8,
    length: Math.hypot(11, 0.9, 7.5),
    upright: true,
    ...hadron.flank(sgn, [14.5, 9.05, -51.25], [-0.6737091, 0.4489854, -1.1556]),
  });
  hadron.prism(root, shadow, {
    name: `fin_lateral_${tag}`,
    fore: 0.12,
    aft: 3.2,
    length: 14,
    ...hadron.flank(sgn, [8.4, 8, -56], [0, -0.4, 0], [1, 0.5, 1]),
  });
});

// The dorsal and ventral fins astern, pitched 0.42 and 0.46.
hadron.prism(root, alloy, {
  name: 'fin_dorsal',
  fore: 0.12,
  aft: 3.6,
  length: 16,
  ...drawn([0, 13.4, -56], [-0.42, 0, 0]),
});
hadron.prism(root, alloy, {
  name: 'fin_ventral',
  fore: 0.12,
  aft: 3,
  length: 13,
  ...drawn([0, 3, -55.5], [0.46, 0, 0]),
});

// The drive: a lit crystal prism tapering astern, its node the reflection
// the header describes, in a square alloy collar; and last, the alloy cap
// on the bow's point.
hadron.prism(root, core, {
  name: 'drive_prism',
  fore: 0.6,
  aft: 2,
  length: 10,
  ...drawn([0, 8, -68], [-Math.PI, 0, (3 * Math.PI) / 4], [-1, 1, 1]),
});
bar('drive_collar', alloy, [5.2, 5.2, 2.2], drawn([0, 8, -63.4]));
hadron.prism(root, alloy, {
  name: 'bow_edge_cap',
  fore: 0.08,
  aft: 1.4,
  length: 10,
  ...drawn([0, 8, 62]),
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'cruiser-hadron.glb');
