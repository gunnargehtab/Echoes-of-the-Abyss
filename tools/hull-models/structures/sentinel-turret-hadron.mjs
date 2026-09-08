/**
 * The Sentinel Turret, Hadron Knights — 120 m of footprint (2 × `radiusM` 60,
 * packages/shared/src/structures.ts), SIG 12 idle.
 *
 * "Compact static-defence mount and barrel on a reinforced base. Nearly black
 * — an ambush predator, navigation marks only until it fires"
 * (docs/asset-prompts-3d.md, STRUCTURE — Sentinel Turret). The per-navy
 * difference is docs/art-direction.md's, not a fourfold block's: one prompt,
 * four scripts.
 *
 * The Order's is the one that reads as an *instrument* — an exact bilateral
 * emplacement, a crested head, and a straight vaned rail instead of a tube.
 *
 * Two things about the frame, and they are the same for all four turrets:
 *
 * - **Metre-true, and long on X.** The committed exports were neither, so
 *   intake rescaled them (×10.2 here) and yawed them off Z, warning twice
 *   about it. Both the bake and the runtime canonicalise the same way
 *   (`rosterModels.ts` yaws when `raw.z > raw.x`, then scales the long axis to
 *   the design size), so building at 120 m with the muzzle on +X lands the
 *   *same* orientation those warnings were correcting to — and passes
 *   warning-free.
 * - **The origin is the bounding box, not the base.** x runs -60 to +60
 *   because that is the footprint the table prices; the emplacement sits aft
 *   of centre because the rail overhangs forward, which is the shape.
 */
import { exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const BASE_X = -26.2; // the emplacement's centre; the rail reaches +60 from it

const shadow = hadron.ink.shadowIndigo();
const steel = hadron.structureInk.darkSteel();
const dim = hadron.structureInk.alloyDim();
const crystal = hadron.structureInk.crystalDim();
const navLight = hadron.structureInk.navLight();

const root = new hadron.THREE.Group();
root.name = 'hadron_sentinel_turret';

// The emplacement: a faceted frustum, its collar, and three mirrored pairs of
// skirt blades raking off the rim.
hadron.emplacement(
  root,
  { shadow, steel, dim },
  {
    x: BASE_X,
    r: 33.8,
    rTop: 28,
    height: 17.2,
    collar: { r: 18.9, t: 1.95, y: 18.9 },
    blades: [
      [59.2, 34.5, [16, 9, 4.5]],
      [3.6, 34.2, [15, 7.5, 4]],
      [50.7, 34.3, [15, 8.1, 4.2]],
    ],
  }
);

// The head that trains, and the crest that makes the kind readable from above.
hadron.gunHead(
  root,
  { shadow, steel, dim },
  {
    x: BASE_X,
    y: 29.8,
    wedge: [27.5, 16, 29.8],
    visor: [15.9, 9.9, 21.8],
    crest: [11, 24.6, 5],
    struts: { from: [-13.5, 24.5, 3.5], to: [-1.5, 33.5, 11.5], t: 3 },
  }
);

// The rail: one straight run, vaned in crystal, pip on the end.
hadron.railGun(
  root,
  { steel, dim, vane: crystal, pip: navLight },
  { from: [-19.7, 34.6, 0], to: [59, 42.1, 0], r: 2.9 }
);

// Magazines abaft the emplacement, feeding up into the collar.
hadron.magazine(root, steel, {
  pods: { x: -39.9, y: 8, z: 26.1, size: [22, 11.2, 14] },
  pipe: { from: [-36.6, 7, 22], to: [-36.6, 27, 10], t: 3.6 },
});

// The whole resting light budget: four marks, flat, on faces the top-down bake
// can see. Everything else stays dark until it fires.
hadron.navMarks(root, navLight, {
  marks: [
    ['fore', -10.2, 10.3, 29.7],
    ['aft', -51.4, 17.3, 21.7],
  ],
});

await exportGlb(root, 'sentinel-turret-hadron.glb');
