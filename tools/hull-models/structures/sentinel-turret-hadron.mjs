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
 * A port of the approved export
 * (docs/concept-art/models/sentinel-turret-hadron.glb at 0522b01~1), part for
 * part in its order, every number the export's own (#639 — the first port,
 * #553, reproportioned it: 27 of 27 parts moved and the scale came out 7 %
 * apart across the axes). An eight-facet frustum turned an eighth on its
 * node, under a nine-facet collar; six skirt blades that are four-sided
 * pyramids stood off one anchor circle; two five-facet recoil struts; a
 * `turret_head` node at 2.6 carrying a six-facet frustum of a wedge squeezed
 * to 0.8 across, a visor box and a pyramid crest, and inside it a
 * `barrel_group` pitched 0.12 with the rail's two bars, a crystal vane each
 * side, a pyramid tip and a five-by-four sphere of a pip; four such spheres
 * for marks; two six-facet feed pipes and two capsules for magazines. Where
 * the export is odd the script is odd with it: the third pair of blades has
 * its `_r` at the export's -x, and the pods are a later three's
 * `CapsuleGeometry`, degenerate pole fans and all (kit.mjs `capsule`).
 *
 * THE FRAME is the one every turret here keeps: metre-true at 120 m with the
 * muzzle on +X, which is what the bake and the runtime both canonicalise a
 * Z-long export to (rosterModels.ts yaws when the raw Z extent exceeds X,
 * then scales the long axis to the design size). Drawn along Z, `DRAWN`
 * units long by the measure those two take — three's `Box3.setFromObject`,
 * each part's box through its node, and the turned frustum's box overhangs
 * its vertices by a third, which is why the approved bake reported ×10.242
 * against a vertex length of 10.482 — the ground at y = 0. Every number below
 * is the export's, through kit.mjs `drawn`; `metreTrue` measures the same
 * way, so intake reports ×1.000 and the maps land where the approved
 * export's did.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 120;
const DRAWN = 11.7165;

const shadow = hadron.structureInk.shadowIndigo();
const steel = hadron.structureInk.darkSteel();
const dim = hadron.structureInk.alloyDim();
const crystal = hadron.structureInk.crystalDim(0.8);
const navLight = hadron.structureInk.navLight(0.9);

const root = new THREE.Group();
root.name = 'sentinel_turret_hadron';

// The emplacement: the frustum, its collar, and three mirrored pairs of skirt
// blades at 0.55, 1.5 and 2.45 rad round the anchor circle.
hadron.emplacement(
  root,
  { shadow, steel, dim },
  {
    at: [0, 0.75, 0],
    yaw: Math.PI / 8,
    r: 3.2,
    rTop: 2.2,
    height: 1.5,
    collar: { r: 1.5, t: 0.18, y: 1.65, facets: 9 },
    blades: {
      r: 0.2,
      anchor: [2.9, 0.55],
      lift: 0.55,
      seat: 0.35,
      each: [
        [0.55, 1.3],
        [1.5, 1.0],
        [2.45, 1.2],
      ],
    },
  }
);

// The recoil struts, then the head that trains: wedge, visor and the crest
// that makes the kind readable from above.
const head = hadron.gunHead(
  root,
  { shadow, steel, dim },
  {
    at: [0, 2.6, 0],
    struts: { r: [0.08, 0.1], length: 1.5, at: [0.65, 2.55, 1.65], rot: [0.9, 0, 0.5] },
    wedge: { r: [1.15, 1.5], height: 1.4, scale: [1, 1, 0.8] },
    visor: { size: [1.9, 0.5, 1.3], at: [0, 0.55, 0.75], rot: [0.3, 0, 0] },
    crest: { r: 0.22, length: 2.2, at: [0, 1.5, -0.5], rot: [-0.35, 0, 0] },
  }
);

// The rail, hung off the head: one straight run, vaned in crystal, pip on
// the end.
hadron.railGun(
  head,
  { steel, dim, vane: crystal, pip: navLight },
  {
    at: [0, 0.25, 0.6],
    pitch: -0.12,
    root: { size: [0.5, 0.6, 3], z: 1.5 },
    mid: { size: [0.32, 0.42, 2.8], z: 4.2 },
    vanes: { size: [0.1, 0.28, 2.2], x: 0.28, z: 4.1 },
    tip: { r: 0.24, length: 1.3, z: 6.2 },
    pip: { r: 0.08, z: 6.9 },
  }
);

// The whole resting light budget: four marks on the emplacement. Everything
// else stays dark until it fires.
hadron.navMarks(root, navLight, {
  r: 0.08,
  marks: [
    ['fore', 2.6, 0.9, 1.4],
    ['aft', 1.9, 1.5, -2.2],
  ],
});

// Magazines abaft the emplacement, feeding up into the collar.
hadron.magazine(root, steel, {
  pipe: { r: [0.12, 0.15], length: 2.1, at: [1.4, 1.5, -0.9], rot: [0.2, 0, 0.5] },
  pods: { r: 0.5, waist: 1, at: [2.3, 0.7, -1.2], rot: [Math.PI / 2, 0, 0.3] },
});

metreTrue(root, L, { drawn: DRAWN });
await exportGlb(root, 'sentinel-turret-hadron.glb');
