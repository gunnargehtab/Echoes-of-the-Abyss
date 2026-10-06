/**
 * The Bio-Reactor, Bathyarch Consortium — 180 m of footprint (2 × `radiusM`
 * 90, packages/shared/src/structures.ts), SIG 25 idle — TUNABLE, and
 * `structures.ts`'s own figure — against 50 rendering, which is the SPEC one
 * (docs/systems-flora.md §2 and §7). The bake takes the idle 25.
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
 * WHAT THE BLOCK DOES NOT SAY: the vent stack. The block names the vessel,
 * the slab, the three arms, the outflow and the feet, and it does not name a
 * stack, because it is written for any faction and a stack is one navy's
 * answer to a crown — the Commune grows a bud there, the Directorate a seam,
 * the Order the crystal core. So the block stands unamended and this header
 * carries the departure instead, which is the other half of what
 * docs/models-plan.md §2 asks for. The licence is the procedural silhouette
 * this model replaces: "the vent stack, off-centre: a reactor is not a
 * symmetrical building" (packages/frontend/src/game/silhouettes.ts). That is
 * the one thing the schematic ever said about the kind, it is the Klaxon's
 * to say in plate, and a script that centred it would have lost it. The
 * Order's vessel is deliberately the exception: the Knights are bilaterally
 * symmetrical by doctrine, and giving them an off-centre stack to match this
 * one would be the worse error.
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
 *
 * FACETS (#919). The Klaxon's rule is one facet edge of 2.5 m (docs/asset-prompts-3d.md Block 2c; bathyarch.mjs `cut`;
 * kit.mjs `asked`), asked at this file's scale, and the pass re-cut what
 * was off it, the kit's bed and arms included: the holdfast mat, the
 * footprint slab, the kerb, the vessel, its bands and crown and the three
 * throat drums fourteen at 22–67 m, where the files had eight to sixteen;
 * the hopper chute fourteen and the outflow flanges ten; the vent stack ten
 * and its band ten, its mouth six; the kerb's tube and the rake tines six,
 * where they were five. The feed throats, roof ports and outflow trunk
 * were the rule's eight and ten already. The six run lights are dropped
 * onto the fourteen-sided kerb (kit.mjs `reactorBed` `on`; below). 77 parts
 * and 1,904 triangles become 77 and 2,124.
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
/** Drawn across by the measure the fit takes (header); the facet rule is asked at this scale and the fit is asserted against it. */
const DRAWN = 138.9626;
// The Klaxon's facet rule at this file's scale (bathyarch.mjs `cut`, #919):
// the builders are handed the file's units and the rule is a chord in
// metres. Asserted after the fit, since the fit is what sets the scale.
const cut = bathyarch.cut(L / DRAWN);
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
// Every round part of the bed at the Klaxon's count (#919, kit.mjs `asked`):
// the mat and the slab fourteen-sided at 67 and 44 m, the kerb fourteen on a
// tube of six. A fourteen-gon laid as the kit lays one already has a flat
// facing the bow, which the file's octagon needed an eighth of a turn for.
// The six run lights sit at a sixth of a turn each and a fourteen-gon kerb
// has a chord under four of them, a third of the way along it, so those
// four stood 0.48 m off the kerb; each of the six is dropped onto the
// kerb's top under its own station and kept level (kit.mjs `reactorBed`
// `on`). The four came down 0.67 m and the two over a crest 0.11, since
// the kerb's six-sided tube tops out lower than the file's five-sided one.
reactorBed(
  root,
  { holdfast: rust, slab: black, kerb: grey, lamp: lampM },
  {
    mat: { facets: cut.round },
    pad: { facets: cut.round, phase: 0 },
    rim: { radial: cut.round, facets: cut.round },
    lights: { on: 'slab_kerb' },
  }
);

// Three arms out into the canopy, booms in iron, throats in the unlit finish,
// anchor feet in rust and the rake tines in hazard amber.
radialSeries(ARMS, (a) =>
  reactorIntakeArm(
    root,
    { boom: grey, collar: black, throat: unlit, foot: rust, rake: amber },
    { bearing: a, drum: { facets: cut.round }, mouth: { facets: cut.round }, tines: { facets: cut.round } }
  )
);

// The tank: 30 m drawn of banded plate on the slab, its crown bolted down.
bathyarch.reactorVessel(
  root,
  { black, grey, rust, lampM, unlit },
  {
    tank: { r: [16.5, 18], h: 30, y: 19.4 },
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
    cut,
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
    // Base at y 0, the model's ground plane — where the slab bottoms and
    // every boom leg stands (#788 review, F3).
    hopper: { at: 47, size: [15, 11, 15], y: 5.5 },
    lip: { size: [16.4, 1.2, 16.4], y: 11.6 },
    chute: { at: 47, r: [3.2, 4.4], h: 7.4, y: 15.7 },
    cut,
  }
);

const size = fitFootprint(root, L);
if (Math.abs(size.x - DRAWN) > 1e-3)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(4)} long; the facet rule was asked at ${DRAWN}`
  );
if (size.z > size.x)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(2)} × ${size.z.toFixed(2)}; the arms' phase has to leave x the longer axis`
  );
await exportGlb(root, 'bio-reactor-bathyarch.glb', { trim: bathyarch.TRIM });
