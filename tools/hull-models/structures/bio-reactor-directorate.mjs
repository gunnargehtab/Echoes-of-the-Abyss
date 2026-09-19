/**
 * The Bio-Reactor, Abyssal Directorate — 180 m of footprint (2 × `radiusM`
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
 * at the foot of every arm" (docs/asset-prompts-3d.md, STRUCTURE —
 * Bio-Reactor). One prompt block, four scripts, and the per-navy difference
 * is the vessel and its outflow.
 *
 * The holdfast mat, the slab, its kerb, the six run lights and the three
 * intake arms are the kit's `reactorBed` and `reactorIntakeArm` — the
 * faction-neutral skeleton every navy bolts the same way (#608, #652) — in
 * the Directorate's ink: trench black for the holdfast, chitin violet for
 * the slab, weld steel for the kerb and the booms, crimson for the run
 * lights. What is the Directorate's is the vessel: a carapace mound collared
 * in steel, scuted up the flank, seamed across the crown and spined down one
 * side, with a gullet running out to the Dredge's hopper, from
 * `factions/directorate.mjs`.
 *
 * WHAT IS LIT, AND WHY SO LITTLE. The block's resting band is "the slab's
 * run lights and one mark on the vessel's crown", so those seven parts are
 * the model's only lamps (docs/models-plan.md §3.2 rule 1). The three feed
 * throats, the four vessel ports and the hopper's throat are the parts the
 * block lights *rendering*, so each is built and clad in `biolight_unlit`
 * rather than lit (rule 2) — which is also why the hopper's throat takes the
 * unlit finish where the Dredge's takes the gullet glow.
 *
 * THE SPINES ARE ON ONE SIDE. Four of them, between 175° and 290°, on no
 * regular bearing: this navy's ranks repeat on neither side
 * (docs/models-plan.md §3.6), and a mound spined all round would be a dome.
 * The crown mark sits at 83°, clear of all four, and the four ports at 150°,
 * 210°, 270° and 330° are laid between them.
 *
 * THE FRAME. Drawn 138.96 by 121.90 by the measure the bake takes (kit.mjs
 * `fitFootprint`) and priced at 180 m by the table, as the four Vent Taps
 * are. The three arms sit at −90°, 30° and 150°, the kit's default phase,
 * which is what leaves x the longer axis; the script asserts it after the
 * fit so a moved arm fails here rather than in the maps.
 */
import {
  THREE,
  exportGlb,
  fitFootprint,
  radialSeries,
  reactorBed,
  reactorIntakeArm,
} from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 180;
const ARMS = { count: 3, phase: -Math.PI / 2 };
/** The outflow runs into the gap between the arms at −90° and 30°. */
const OUTFLOW = -Math.PI / 6;
const deg = (d) => (d * Math.PI) / 180;

const violet = directorate.ink.chitinViolet();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const lampM = directorate.ink.biolightCrimson();
const unlit = directorate.ink.biolightUnlit();

const root = new THREE.Group();
root.name = 'bio_reactor_directorate';

// The bed: the holdfast in trench black, the slab in violet, the kerb and
// its six run lights in steel and crimson.
reactorBed(root, { holdfast: black, slab: violet, kerb: steel, lamp: lampM });

// Three arms out into the canopy, booms in steel, throats in the unlit
// finish, anchor feet in red and the rake tines in trench black.
radialSeries(ARMS, (a) =>
  reactorIntakeArm(
    root,
    { boom: steel, collar: black, throat: unlit, foot: red, rake: black },
    { bearing: a }
  )
);

// The mound: 34 m of shell on the slab, collared, scuted, seamed and spined.
directorate.reactorVessel(
  root,
  { violet, red, black, steel, lampM, unlit },
  {
    mound: { y: 18, r: [19, 17, 19] },
    collar: { r: 17.8, t: 1.7, y: 9 },
    scutes: {
      scale: [7, 2.6, 5],
      pitch: -0.5,
      at: [
        [deg(20), 15, 28],
        [deg(80), 15, 28],
        [deg(140), 15, 28],
        [deg(200), 15, 28],
        [deg(260), 15, 28],
        [deg(320), 15, 28],
      ],
    },
    seam: { at: [0, 34.4, 0], yaw: 0.4, r: [12, 2, 6] },
    spines: {
      r: 1.6,
      rake: -0.35,
      at: [
        [deg(175), 11, 31.5, 9],
        [deg(212), 9, 32.6, 11],
        [deg(250), 10, 32.1, 10],
        [deg(288), 12, 30.9, 8],
      ],
    },
    mark: { size: [5, 0.7, 2.2], at: [1, 33.3, 9], yaw: -0.1 },
    ports: {
      scale: [2.4, 1.1, 2.4],
      at: [
        [deg(150), 11.5, 32.4],
        [deg(210), 11.5, 32.4],
        [deg(270), 11.5, 32.4],
        [deg(330), 11.5, 32.4],
      ],
    },
  }
);

// The outflow: a gullet over the gap into the hopper.
directorate.reactorOutflow(
  root,
  { red, black, steel, unlit },
  {
    bearing: OUTFLOW,
    gullet: {
      // Low enough to enter the hopper's throat: the first draft's gullet ran
      // level at 19 and left the whole terminal a floating island (#788
      // review, F3).
      y: 14.8,
      profile: [
        [12, 3.9],
        [24, 3.2],
        [36, 3.4],
        [45, 2.6],
      ],
    },
    ribs: { r: 3.7, t: 0.9, at: [21, 33] },
    hopper: { at: 49, size: [16, 11, 14], y: 5.5 },
    rim: { size: [17, 0.9, 15], y: 11.4 },
    throat: { size: [10.5, 0.5, 8], y: 12.1 },
  }
);

const size = fitFootprint(root, L);
if (size.z > size.x)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(2)} × ${size.z.toFixed(2)}; the arms' phase has to leave x the longer axis`
  );
await exportGlb(root, 'bio-reactor-directorate.glb');
