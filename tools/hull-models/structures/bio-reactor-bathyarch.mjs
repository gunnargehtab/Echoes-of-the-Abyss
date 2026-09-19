/**
 * The Bio-Reactor, Bathyarch Consortium — 180 m of footprint (2 × `radiusM`
 * 90, packages/shared/src/structures.ts), SIG 25 idle and 50 rendering
 * (docs/systems-flora.md §2 and §7).
 *
 * "The bed's income — the Vent Tap's argument on living ground, bolted into
 * a kelp holdfast instead of a vent, and it eats the cover it stands in ... A
 * render vessel standing over the holdfast on a low footprint slab, three
 * intake arms reaching out into the canopy on booms, each ending in a cutter
 * rake and a feed throat that carries the crop back in; the Biomass outflow
 * off the vessel to a dispatch hopper; anchor feet driven into the holdfast
 * at the foot of every arm. Dim at rest: the slab's run lights and one mark
 * on the vessel's crown" (docs/asset-prompts-3d.md, STRUCTURE — Bio-Reactor).
 * One prompt block, four scripts, and the per-navy difference is the vessel
 * and its outflow.
 *
 * The holdfast mat, the slab, its kerb, the six run lights and the three
 * intake arms are the kit's `reactorBed` and `reactorIntakeArm` — the
 * faction-neutral skeleton every navy bolts the same way (#608, #652) — in
 * the Klaxon's ink: rust for the holdfast, black for the slab, iron for the
 * kerb and the booms, amber for the run lights. What is the Klaxon's is the
 * vessel: a riveted digester tank, banded, crowned and bolted, with the vent
 * stack off-centre on its roof and a square hopper on the end of the
 * outflow, from `factions/bathyarch.mjs`.
 *
 * WHAT IS LIT, AND WHY SO LITTLE. The block's resting band is "the slab's run
 * lights and one mark on the vessel's crown", so those seven parts are the
 * model's only lamps (docs/models-plan.md §3.2 rule 1). The three feed
 * throats, the four roof ports, the stack mouth and the hopper chute are the
 * parts the block lights *rendering*, so each is built and clad in
 * `amber_lamp_unlit` rather than lit (rule 2). The bake calibrates onto
 * E(25) = 2.68 from the `STRUCTURES` row's idle 25, and the conn view scales
 * the same lamps by E(live)/E(rest) — which at SIG 50 is 5.9× the resting
 * light, and is what "lit rendering" is on this pipeline.
 *
 * THE FRAME. Drawn 138.96 by 121.90 by the measure the bake takes (kit.mjs
 * `fitFootprint`) and priced at 180 m by the table, so the root carries that
 * one scale, as the four Vent Taps do. The three arms sit at −90°, 30° and
 * 150°, which is the kit's default phase and is load-bearing: three arms on
 * an even phase come out Z-long and intake would yaw the file a quarter turn.
 * The script asserts x ≥ z after the fit so a moved arm fails here rather
 * than in the maps.
 */
import {
  THREE,
  exportGlb,
  fitFootprint,
  radialSeries,
  reactorBed,
  reactorIntakeArm,
} from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 180;
const ARMS = { count: 3, phase: -Math.PI / 2 };
/** The outflow runs into the gap between the arms at −90° and 30°. */
const OUTFLOW = -Math.PI / 6;

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const unlit = bathyarch.ink.amberLampUnlit();

const root = new THREE.Group();
root.name = 'bio_reactor_bathyarch';

// The bed: the holdfast in rust, the slab in black, the kerb and its six run
// lights in iron and amber.
reactorBed(root, { holdfast: rust, slab: black, kerb: grey, lamp: lampM });

// Three arms out into the canopy, booms in iron, throats in the unlit finish,
// anchor feet in rust and the rake tines in hazard amber.
radialSeries(ARMS, (a) =>
  reactorIntakeArm(
    root,
    { boom: grey, collar: black, throat: unlit, foot: rust, rake: amber },
    { bearing: a }
  )
);

// The tank: 30 m of banded plate on the slab, its crown bolted down.
bathyarch.reactorVessel(
  root,
  { black, grey, rust, lampM, unlit },
  {
    tank: { r: [16.5, 18], h: 30, y: 19.4, facets: 12 },
    bands: { r: 18.4, h: 1.6, ys: [9.8, 19.4, 29] },
    crown: { r: [16.4, 17.4], h: 3.2, y: 36 },
    rivets: { count: 12, r: 14.8, y: 37.9, size: [1.3, 0.7, 1.3] },
    hatch: { size: [8, 1.3, 7], at: [-6, 37.9, -7], yaw: 0.3 },
    mark: { size: [5, 0.7, 2.2], at: [2, 37.95, 11.5] },
    ports: {
      r: 2.2,
      t: 0.7,
      y: 37.95,
      at: [
        [(105 * Math.PI) / 180, 13.5],
        [(165 * Math.PI) / 180, 13.5],
        [(255 * Math.PI) / 180, 13.5],
        [(315 * Math.PI) / 180, 13.5],
      ],
    },
    stack: {
      at: [9, 44.4, 3],
      r: [2.4, 2.9],
      h: 13.6,
      band: { r: 3.2, h: 1.2, y: 49 },
      mouth: { r: 2.1, t: 0.8, y: 51.4 },
    },
  }
);

// The outflow: a trunk over the gap to a hopper standing on the holdfast.
bathyarch.reactorOutflow(
  root,
  { black, grey, rust, unlit },
  {
    bearing: OUTFLOW,
    trunk: { from: 15, to: 47, r: 2.6, y: 20 },
    flanges: { r: 3.3, t: 1.2, at: [22, 34] },
    hopper: { at: 47, size: [15, 11, 15], y: 6 },
    lip: { size: [16.4, 1.2, 16.4], y: 12.1 },
    chute: { at: 47, r: [3.2, 4.4], h: 7.4, y: 16.2 },
  }
);

const size = fitFootprint(root, L);
if (size.z > size.x)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(2)} × ${size.z.toFixed(2)}; the arms' phase has to leave x the longer axis`
  );
await exportGlb(root, 'bio-reactor-bathyarch.glb');
