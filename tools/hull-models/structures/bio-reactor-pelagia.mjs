/**
 * The Bio-Reactor, Pelagia Commune — 180 m of footprint (2 × `radiusM` 90,
 * packages/shared/src/structures.ts), SIG 25 idle — TUNABLE, and
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
 * the Commune's ink: chitin for the holdfast and the collars, growth ridge
 * for the slab and the booms, biolight for the run lights, and the rake
 * tines in algae membrane. What is the Commune's is the vessel: a grown
 * bladder ringed three times, held down by five unlike root grips, with a
 * pale bud on its crown and a gut running out to a dispatch sac, from
 * `factions/pelagia.mjs`.
 *
 * WHAT THIS NAVY MAKES OF THE BLOCK. The Commune's technology is "algae
 * reactors" ([factions.md](factions.md)), so of the four this is the only
 * one whose reactor is not an imposition on the bed: it is the Sower's
 * bladder at settlement scale, standing in the crop it renders. The block
 * stands unamended — a bladder is still "a render vessel standing over the
 * holdfast on a low footprint slab", and §2's reading of a Commune reactor
 * on a Commune bed ("the Commune may run one on its own bed", cutting into
 * its own principal) is exactly this model.
 *
 * WHAT IS LIT, AND WHY SO LITTLE. The block's resting band is "the slab's
 * run lights and one mark on the vessel's crown", so those seven parts are
 * the model's only lamps (docs/models-plan.md §3.2 rule 1). The three feed
 * throats, the four crown nubs and the sac's mouth are the parts the block
 * lights *rendering*, so each is built and clad in `bio_vein_unlit` rather
 * than lit (rule 2).
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
import * as pelagia from '../factions/pelagia.mjs';

const L = 180;
const ARMS = { count: 3, phase: -Math.PI / 2 };
/** The outflow runs into the gap between the arms at −90° and 30°. */
const OUTFLOW = -Math.PI / 6;
const deg = (d) => (d * Math.PI) / 180;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const spore = pelagia.ink.sporePod();
const lampM = pelagia.ink.bioLight();
const unlit = pelagia.ink.bioVeinUnlit();

const root = new THREE.Group();
root.name = 'bio_reactor_pelagia';

// The bed: the holdfast in chitin, the slab in growth ridge, the kerb and
// its six run lights in chitin and biolight.
reactorBed(root, { holdfast: chitin, slab: ridge, kerb: chitin, lamp: lampM });

// Three arms out into the canopy, booms in growth ridge, throats in the
// unlit finish, anchor feet in chitin and the rake tines in membrane.
radialSeries(ARMS, (a) =>
  reactorIntakeArm(
    root,
    { boom: ridge, collar: chitin, throat: unlit, foot: chitin, rake: membrane },
    { bearing: a }
  )
);

// The bladder: 31 m of grown vessel on the slab, ringed at three stations.
pelagia.reactorVessel(
  root,
  { chitin, ridge, membrane, spore, lampM, unlit },
  {
    bladder: { y: 19.5, r: [17.5, 15.5, 17.5] },
    rings: [
      { r: 14.2, t: 1.2, y: 10 },
      { r: 17.9, t: 1.3, y: 19.5 },
      { r: 15, t: 1.2, y: 28 },
    ],
    // Five roots, no two alike: the Commune grows each its own size, and a
    // rank that came out regular would read as a machine.
    grips: [
      { bearing: deg(20), at: 20, r: [0.8, 3.2], h: 15, y: 7, lean: 0.45 },
      { bearing: deg(89), at: 19, r: [0.7, 2.8], h: 13, y: 6.5, lean: 0.4 },
      { bearing: deg(155), at: 21, r: [0.9, 3.4], h: 16, y: 7.5, lean: 0.48 },
      { bearing: deg(223), at: 19.5, r: [0.75, 3], h: 14, y: 6.8, lean: 0.42 },
      { bearing: deg(292), at: 20.5, r: [0.85, 3.1], h: 15.5, y: 7.2, lean: 0.46 },
    ],
    bud: { at: [-2, 34.2, 3], r: [5.5, 4.5, 5.5] },
    mark: { size: [5.2, 0.7, 2.4], at: [1, 33, 9.5] },
    nubs: {
      scale: [2.6, 1.3, 2.6],
      at: [
        [deg(150), 11, 31.6],
        [deg(210), 11, 31.6],
        [deg(270), 11, 31.6],
        [deg(330), 11, 31.6],
      ],
    },
  }
);

// The outflow: a gut over the gap, swelling into the dispatch sac.
pelagia.reactorOutflow(
  root,
  { ridge, membrane, unlit },
  {
    bearing: OUTFLOW,
    gut: {
      y: 18,
      profile: [
        [12, 3.8],
        [22, 3.2],
        [32, 3.5],
        [46, 2.8],
      ],
    },
    rings: { r: 3.6, t: 0.8, at: [20, 34] },
    // Base at y 0, the model's ground plane, and the gut carried out to 46 so
    // it plunges into the sac rather than ending short of it (#788 review, F3).
    sac: { at: 50, y: 8, r: [9.5, 8, 9.5], ring: { r: 9.8, t: 1.2, y: 8 } },
    mouth: { r: 3, t: 0.9, y: 16.3 },
  }
);

const size = fitFootprint(root, L);
if (size.z > size.x)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(2)} × ${size.z.toFixed(2)}; the arms' phase has to leave x the longer axis`
  );
await exportGlb(root, 'bio-reactor-pelagia.glb');
