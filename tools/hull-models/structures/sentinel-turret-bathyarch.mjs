/**
 * The Sentinel Turret, Bathyarch Consortium — 120 m of footprint (2 ×
 * `radiusM` 60, packages/shared/src/structures.ts), SIG 12 idle.
 *
 * "Compact static-defence mount and barrel on a reinforced base. Nearly black
 * — an ambush predator, navigation marks only until it fires"
 * (docs/asset-prompts-3d.md, STRUCTURE — Sentinel Turret). One prompt block,
 * four scripts; the per-navy difference is docs/art-direction.md's.
 *
 * This is the one of the four that does not share the others' skeleton. The
 * Commune, the Directorate and the Order all grow the same mound, collar,
 * head and barrel; the Klaxon's approved turret is from an earlier authoring
 * pass and is a bolted raft under a riveted drum under a housing, with a
 * short thick gun on it. That is not a defect to be reconciled — it is the
 * navy's own language, "boxy, riveted, over-engineered rectangles and
 * cylinders" — so the port keeps it and the vocabulary stays its own.
 *
 * The frame is the one every turret here shares: metre-true at 120 m with the
 * muzzle on +X, because that is what both the bake and the runtime
 * canonicalise to (see sentinel-turret-hadron.mjs for why). x runs -60 to +60
 * across the footprint the table prices; the raft sits aft because the gun
 * overhangs forward.
 */
import { exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const work = bathyarch.structureInk.workLamp();

const root = new bathyarch.THREE.Group();
root.name = 'bathyarch_sentinel_turret';

// The raft, its four feet and the bolt through each.
bathyarch.anchoredRaft(
  root,
  { black, rust, grey },
  {
    at: [-27.55, 5.4, 8.75],
    r: 32.45,
    height: 10.8,
    foot: { inset: [22.9, 22.95], size: [12.9, 6.2, 12.9], yaw: Math.PI / 4 },
    bolt: { r: 1.5, height: 8, offset: [2.85, 2.85] },
  }
);

// The drum the housing turns on: ring, a rank of six rivets, one older patch,
// and the feed standing beside it.
bathyarch.mountDrum(
  root,
  { black, grey, rust },
  {
    at: [-26.95, 18.55, 8.7],
    r: 21,
    height: 15.5,
    ring: { r: 21.6, t: 1.75, y: 25.65 },
    rivets: { count: 6, from: -80, radius: 20.8, y: 18.5, r: 1.4 },
    patch: { at: [-13.65, 17.9, 21.75], size: [8.9, 9.2, 8.1] },
    feed: { at: [-38.35, 20.85, -2.05], r: 4.5, height: 18.7 },
  }
);

// The housing, its glacis, and the plate riveted over the roof.
bathyarch.turretHouse(
  root,
  { black, grey, rust },
  {
    housing: { at: [-27.55, 33.35, 8.75], size: [38.3, 15.5, 37.1] },
    glacis: { at: [-13.5, 32.45, 4.3], size: [22.4, 16.7, 19.6] },
    roofPatch: { at: [-30.65, 41.7, 13.35], size: [19.5, 1.6, 18.3] },
  }
);

// A short thick gun, and the counterweight that lets it train.
bathyarch.heavyBarrel(
  root,
  { black, grey, rust },
  {
    breech: { at: [-12.7, 34.15, 0.6], size: [17.6, 11.9, 11.8] },
    barrel: { from: -11.8, to: 59.6, y: 32.15, z: -19.35, r: 4.7 },
    jacket: { from: -2, to: 20.1, r: 5.1 },
    brake: { at: [55.1, 30.6, -36.45], r: 4.8, length: 9.8 },
    recoil: { from: -15.8, to: 12.1, y: 28.75, z: -5.35, r: 1.85 },
    counterweight: { at: [-43.85, 32.45, 17.6], size: [16.1, 12.3, 17.4] },
  }
);

// The whole resting light budget: one work lamp on its bracket, on the raft
// where the top-down bake can see it — the approved turret's emissive map is
// this one lamp and nothing else, so it has to stay in the open. (The glacis
// above is why its beam is 19.6 m rather than the 26.1 m an axis-aligned read
// of the approved file gives: that box is yawed in plan, and its true shadow
// does not reach the lamp. A square 26.1 m one does, and buries it.)
bathyarch.baseLamp(
  root,
  { lampMat: work, black },
  {
    at: [-5.95, 12.95, -8.25],
    size: [3.3, 3.7, 3.7],
    bracket: { at: [-7.8, 9.85, -6.7], size: [1.8, 4.3, 2.4] },
  }
);

await exportGlb(root, 'sentinel-turret-bathyarch.glb');
