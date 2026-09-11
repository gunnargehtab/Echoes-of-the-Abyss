/**
 * The Light Scout, the Order's — 60 m (docs/units.md; the Light Scout block
 * of docs/asset-prompts-3d.md Block 3, read with the Hadron FACTION block).
 *
 * "Tiny, very fast recon vessel, fragile and nearly silent (SIG 6 idle).
 * Sleek darting silhouette built for kelp and thermal-vein cover; nearly
 * black, navigation marks only" — said the Order's way: "precise bilateral
 * symmetry; blade-like, crystalline silhouettes". A fore blade and an aft
 * blade, four-sided crystal prisms drawn to a point each way and edged in
 * pale alloy; a canopy of the same cut; a guard wing each side; a dorsal, a
 * ventral and two lateral fins; a drive prism in its collar and a keel blade
 * — and one lit seam along the spine, which is the whole resting light of a
 * hull that idles at SIG 6.
 *
 * A port of the approved export (docs/concept-art/models/light-scout-hadron.glb
 * at 3a303c9), part for part in its order, every number the export's own.
 * Every part comes from `factions/hadron.mjs` — `prism` fourteen times — or
 * is a kit box. Nothing here is a shape decision; where the export is odd
 * the script is odd with it: the `_p` parts sit at the export's +x, which is
 * the kit's -z once the file is turned onto its length.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 23.95 units long, hull axis at y = 2.6; built
 * here metre-true at 60 m along +X, centred on its length, the axis at
 * y = 0. Every number below is the export's, through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 60;
const DRAWN = 23.95;
const DATUM = 2.6;

const shadow = hadron.scoutInk.shadowIndigo();
const alloy = hadron.scoutInk.paleAlloy();
const crystal = hadron.scoutInk.resonanceCrystal();
const seam = hadron.scoutInk.crystalSeam();

const root = new THREE.Group();
root.name = 'hadron_light_scout';
const bar = (name, mat, size, t, e) => part(root, name, box(...size), mat, drawn(t, e));

// The blades: a fore blade drawn to a point at the bow and an aft one drawn
// to a point at the stern, each squashed to little more than a third of its
// width, and each edged in a wider, flatter prism of alloy a hair longer
// than itself.
hadron.prism(root, shadow, {
  name: 'blade_fore',
  fore: 0.05,
  aft: 1.15,
  length: 12,
  ...drawn([0, 2.6, 4], [0, 0, 0], [1.9, 0.68, 1]),
});
hadron.prism(root, alloy, {
  name: 'blade_fore_edge',
  fore: 0.04,
  aft: 1.19,
  length: 12.1,
  ...drawn([0, 2.6, 4], [0, 0, 0], [2.08, 0.14, 1]),
});
hadron.prism(root, shadow, {
  name: 'blade_aft',
  fore: 1.15,
  aft: 0.28,
  length: 10,
  ...drawn([0, 2.6, -7], [0, 0, 0], [1.9, 0.68, 1]),
});
hadron.prism(root, alloy, {
  name: 'blade_aft_edge',
  fore: 1.19,
  aft: 0.24,
  length: 10.1,
  ...drawn([0, 2.6, -7], [0, 0, 0], [2.08, 0.14, 1]),
});

// The spine: a ridge along the back, the crystal let into it, and the lit
// seam riding on top — the whole resting light, and it faces up.
bar('spine_ridge', shadow, [0.16, 0.7, 11], [0, 3.15, -1.5]);
bar('crystal_inlay', crystal, [0.22, 0.16, 4.6], [0, 3.56, -1]);
bar('crystal_seam_lit', seam, [0.1, 0.1, 4.2], [0, 3.66, -1]);

// The canopy, forward on the fore blade.
hadron.prism(root, shadow, {
  name: 'canopy',
  fore: 0.14,
  aft: 0.5,
  length: 2.6,
  ...drawn([0, 3.3, 3.6], [0, 0, 0], [1.4, 0.7, 1]),
});

// Guard wings: a prism each side yawed 0.6 outboard, edged like the blades.
// The port group comes before the starboard one, as the export orders them.
hadron.prism(root, shadow, {
  name: 'guard_wing_p',
  fore: 0.05,
  aft: 0.6,
  length: 5.5,
  ...drawn([3, 2.6, -1.5], [0, -0.6, 0], [1, 0.4, 1]),
});
hadron.prism(root, alloy, {
  name: 'guard_edge_p',
  fore: 0.04,
  aft: 0.62,
  length: 5.6,
  ...drawn([3, 2.6, -1.5], [0, -0.6, 0], [1.1, 0.1, 1]),
});
hadron.prism(root, shadow, {
  name: 'guard_wing_s',
  fore: 0.05,
  aft: 0.6,
  length: 5.5,
  ...drawn([-3, 2.6, -1.5], [0, 0.6, 0], [1, 0.4, 1]),
});
hadron.prism(root, alloy, {
  name: 'guard_edge_s',
  fore: 0.04,
  aft: 0.62,
  length: 5.6,
  ...drawn([-3, 2.6, -1.5], [0, 0.6, 0], [1.1, 0.1, 1]),
});

// The fins at the stern: dorsal and ventral pitched half a radian apart, and
// a lateral pair yawed 0.45 and squashed flat.
hadron.prism(root, alloy, {
  name: 'fin_dorsal',
  fore: 0.04,
  aft: 0.8,
  length: 3.4,
  ...drawn([0, 3.7, -10.6], [-0.5, 0, 0]),
});
hadron.prism(root, alloy, {
  name: 'fin_ventral',
  fore: 0.04,
  aft: 0.7,
  length: 3,
  ...drawn([0, 1.6, -10.4], [0.5, 0, 0]),
});
hadron.prism(root, shadow, {
  name: 'fin_lateral_p',
  fore: 0.04,
  aft: 0.75,
  length: 3.2,
  ...drawn([1.9, 2.6, -10.5], [0, -0.45, 0], [1, 0.45, 1]),
});
hadron.prism(root, shadow, {
  name: 'fin_lateral_s',
  fore: 0.04,
  aft: 0.75,
  length: 3.2,
  ...drawn([-1.9, 2.6, -10.5], [0, 0.45, 0], [1, 0.45, 1]),
});

// The drive: a crystal prism tapering astern, turned an eighth so it reads
// as a square nozzle, in a square alloy collar; and the keel blade under the
// spine. The export's node carries the prism with a reflection in it — a
// scale of -1 beside the eighth turn — and the reflection is written as the
// export has it. A four-sided prism has the same vertices under a rotation,
// but not the same triangles: the rotation cuts the four side quads along the
// other diagonal and winds them the other way, which moves the normal map on
// every facet (#588 review, F1). `drawn` carries a mirrored scale as
// `tail_fluke_lower` on the Commune's scout already does.
hadron.prism(root, crystal, {
  name: 'drive_prism',
  fore: 0.14,
  aft: 0.42,
  length: 2.2,
  ...drawn([0, 2.6, -12.8], [0, 0, Math.PI / 4], [1, 1, -1]),
});
bar('drive_collar', alloy, [1.1, 1.1, 0.6], [0, 2.6, -11.7]);
bar('keel_blade', alloy, [0.16, 0.6, 9], [0, 2.05, -2]);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'light-scout-hadron.glb');
