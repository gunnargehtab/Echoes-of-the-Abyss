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
 * A port of the approved export
 * (docs/concept-art/models/sentinel-turret-bathyarch.glb at 0522b01~1), part
 * for part in its order, every number the export's own (#639 — the first
 * port, #553, moved 30 of 30 parts, and widened the glacis by half again to
 * keep the lamp in the open; that was a decision, this reverts it, and the
 * lamp is in the open regardless). A frustum of a raft with a foot and a bolt
 * on each diagonal; a nine-facet drum under a five-by-twelve ring, six
 * five-by-four rivets from 0.2 rad round, a patch; the housing, glacis and
 * roof patch; the gun; the feed pipe stood between two points; and the lamp,
 * a six-by-four sphere on its bracket, which is the whole resting light of
 * SIG 12.
 *
 * Where the export is odd the script is odd with it. The gun is trained
 * `BEARING` off the export's +Z, and every part of it sits at a round
 * distance out along that bearing — but each tube's node is turned
 * `[π/2 − 0.06, BEARING, 0]`, and three's XYZ order yaws before it lays the
 * tube down, so every tube lies parallel to +Z instead: breech, jacket,
 * barrel and brake march across the line of fire each on its own axis, and
 * the brake stands 17 m off the barrel's at 120 m. The approved model is
 * that, so this is that (#540).
 *
 * THE FRAME is the one every turret here keeps: metre-true at 120 m with the
 * muzzle on +X, which is what the bake and the runtime canonicalise a Z-long
 * export to (see sentinel-turret-hadron.mjs). Drawn along Z, `DRAWN` units
 * long by three's `Box3.setFromObject` — a hair over the 3.8856 of its
 * vertices, from the turned tubes' boxes — the ground at y = 0. Every number
 * below is the export's, through kit.mjs `drawn`.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 120;
const DRAWN = 3.8894;
const BEARING = 0.5;

const black = bathyarch.structureInk.hullBlack();
const grey = bathyarch.structureInk.ironGrey();
const rust = bathyarch.structureInk.oxideRust();
const work = bathyarch.structureInk.workLamp(2.4);

const root = new THREE.Group();
root.name = 'bathyarch_sentinel_turret';

// The raft, its four feet and the bolt outboard of each.
bathyarch.anchoredRaft(
  root,
  { black, rust, grey },
  {
    at: [0, 0.175, 0],
    r: 1.05,
    rTop: 0.9,
    height: 0.35,
    foot: { radius: 1.05, size: [0.34, 0.2, 0.5] },
    bolt: { radius: 1.18, r: 0.05, height: 0.26 },
  }
);

// The drum the housing turns on: ring, a rank of six rivets, one older patch.
bathyarch.mountDrum(
  root,
  { black, grey, rust },
  {
    at: [0, 0.6, 0],
    r: [0.62, 0.7],
    height: 0.5,
    facets: 9,
    ring: { r: 0.64, t: 0.06, y: 0.83, facets: 12 },
    rivets: { count: 6, from: 0.2, radius: 0.67, y: 0.6, r: 0.045, segments: [5, 4] },
    patch: { size: [0.34, 0.3, 0.05], at: [-0.42, 0.58, 0.45], rot: [0, 0.85, 0] },
  }
);

// The housing, its glacis, and the plate riveted over the roof — all trained
// with the gun.
bathyarch.turretHouse(
  root,
  { black, grey, rust },
  {
    bearing: BEARING,
    housing: { size: [0.85, 0.5, 0.95], at: [0, 1.08, 0] },
    glacis: { size: [0.8, 0.34, 0.3], along: 0.52, y: 1.05, pitch: -0.35 },
    roofPatch: { size: [0.4, 0.05, 0.5], at: [-0.15, 1.35, -0.1] },
  }
);

// A short thick gun, and the counterweight that lets it train.
bathyarch.heavyBarrel(
  root,
  { black, grey, rust },
  {
    bearing: BEARING,
    tilt: 0.06,
    breech: { r: [0.17, 0.2], length: 0.55, along: 0.55, y: 1.12 },
    barrel: { r: [0.11, 0.13], length: 2.3, along: 1.9, y: 1.051 },
    jacket: { r: [0.145, 0.155], length: 0.7, along: 1.35, y: 1.09 },
    brake: { r: [0.16, 0.14], length: 0.3, along: 3.05, y: 0.982 },
    recoil: { r: [0.06, 0.06], length: 0.9, along: 0.95, y: 0.93 },
    counterweight: { size: [0.45, 0.4, 0.35], along: -0.6, y: 1.05 },
  }
);

// The feed, from the drum's foot up toward the housing.
bathyarch.feedPipe(root, rust, { from: [0.5, 0.4, -0.45], to: [0.2, 0.95, -0.25], r: 0.05 });

// The whole resting light budget: one work lamp on its bracket, on the raft
// where the top-down bake can see it — the approved turret's emissive map is
// this one lamp and nothing else.
bathyarch.baseLamp(
  root,
  { lampMat: work, black },
  {
    r: 0.06,
    at: [0.55, 0.42, 0.7],
    bracket: { at: [0.5, 0.32, 0.64], size: [0.08, 0.14, 0.06] },
  }
);

metreTrue(root, L, { drawn: DRAWN });
await exportGlb(root, 'sentinel-turret-bathyarch.glb');
