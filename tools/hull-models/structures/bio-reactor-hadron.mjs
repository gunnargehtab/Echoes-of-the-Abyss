/**
 * The Bio-Reactor, Hadron Knights — 180 m of footprint (2 × `radiusM` 90,
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
 * the Order's ink: shadow indigo for the holdfast, the kerb and the collars,
 * pale alloy for the slab and the booms, crystal seam for the run lights,
 * and the rake tines in resonance crystal, which is the one navy whose
 * cutters are not metal. What is the Order's is the vessel: a plinth, a dome,
 * three alloy arches across it, two collars and the crystal core standing
 * out of its crown, with a faceted conduit running out to a six-sided
 * cistern, from `factions/hadron.mjs`.
 *
 * WHAT IS LIT, AND WHY SO LITTLE. The block's resting band is "the slab's
 * run lights and one mark on the vessel's crown", so those seven parts are
 * the model's only lamps (docs/models-plan.md §3.2 rule 1). The three feed
 * throats, the four dome seams, the crystal core and the cistern's mouth are
 * the parts the block lights *rendering*, so each is built and clad rather
 * than lit (rule 2). The core is the sharpest case: on the Sounding Spire
 * the same crystal is a lamp because that block's resting clause lights it,
 * and here the block's does not — "burning while crop is coming in" is a
 * later band, and a lamp this pipeline would never show dark is a
 * contradiction of the rest clause for nothing.
 *
 * THE FRAME. Drawn 138.96 by 121.90 by the measure the bake takes (kit.mjs
 * `fitFootprint`) and priced at 180 m by the table, as the four Vent Taps
 * are. The three arms sit at −90°, 30° and 150°, the kit's default phase,
 * which is what leaves x the longer axis; the script asserts it after the
 * fit so a moved arm fails here rather than in the maps — the trap the
 * Order's own Vent Tap fell into from the other side, where a plan square to
 * an ulp was yawed a quarter turn by intake
 * (structures/vent-tap-hadron.mjs).
 *
 * FACETS (#919). The Order's rule (docs/asset-prompts-3d.md Block 2c;
 * hadron.mjs `cut`) re-cut every round part, the kit's and the navy's. On
 * the bed: the mat twelve, where it was sixteen; the slab and its kerb the
 * Order's hexagon, where they were an octagon and sixteen; the throat
 * drums and their mouths the hexagon too, where they were ten; the tines
 * four-sided, where they were five — the comments at each call give the
 * reasons. On the vessel: the plinth twelve, where it was eight; the dome
 * twelve by three, where it was fourteen by eight; each arch six along its
 * half turn, where it was sixteen; every collar twelve round on a tube of
 * four, where the dome's two were sixteen on five. 65 parts and 2,686
 * triangles become 65 and 1,724.
 */
import {
  THREE,
  exportGlb,
  fitFootprint,
  radialSeries,
  reactorBed,
  reactorIntakeArm,
} from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 180;
/** The plan's long side as built: the after arms' rake beams, tip to tip. */
const DRAWN = 138.9626;
// The Order's facet rule at this file's scale (hadron.mjs `cut`, #919): the
// model is drawn 138.96 long and priced at 180 m, and the rule is a chord
// in metres. Asserted after the fit, since the fit is what sets the scale.
const cut = hadron.cut(L / DRAWN);
const ARMS = { count: 3, phase: -Math.PI / 2 };
/** The outflow runs into the gap between the arms at −90° and 30°. */
const OUTFLOW = -Math.PI / 6;
const deg = (d) => (d * Math.PI) / 180;

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const lampM = hadron.ink.crystalSeam();
const unlit = hadron.ink.crystalSeamUnlit();

const root = new THREE.Group();
root.name = 'bio_reactor_hadron';

// The bed: the holdfast and the kerb in shadow indigo, the slab in pale
// alloy, the six run lights in crystal seam.
//
// The mat is ground and round, the rule's twelve at 67 m where the kit has
// sixteen. The slab is a plate, and the kit's is an octagon — a count the
// Order has no shape for. It is cut as the navy's hexagon (#919) rather
// than rounded to twelve, because the bed is six-fold already: six run
// lights on the sixths and three arms between them. Turned a twelfth
// (`phase`), the hexagon has a corner under every light and a flat under
// every arm and under the outflow, and the kerb is the same hexagon inside
// it, a vertex under each light, on a tube of the rule's four.
reactorBed(
  root,
  { holdfast: shadow, slab: alloy, kerb: shadow, lamp: lampM },
  {
    mat: { facets: cut.round },
    pad: { facets: 6, phase: Math.PI / 6 },
    rim: { radial: cut.round, facets: 6 },
  }
);

// Three arms out into the canopy, booms in alloy, throats in the unlit
// finish, anchor feet in shadow and the rake tines in crystal.
//
// The throat drum and the mouth in it are six-sided, where the kit has ten:
// the Order's drum is the hexagonal prism its own cistern and that
// cistern's mouth are on this file (`reactorOutflow`), and a ten-sided
// collar beside a six-sided one is the skeleton's default, not a shape of
// this navy's. On three arms a third of a turn apart, each drum has a
// vertex on its own arm's line. The tines are crystal blades and take the
// rule's count, which at 1.2 m is the diamond; the kit's are five-sided.
radialSeries(ARMS, (a) =>
  reactorIntakeArm(
    root,
    { boom: alloy, collar: shadow, throat: unlit, foot: shadow, rake: crystal },
    { bearing: a, drum: { facets: 6 }, mouth: { facets: 6 }, tines: { facets: cut.round } }
  )
);

// The dome: a plinth on the slab, 24 m of shell over it, three arches across
// and the core standing out of the crown.
hadron.reactorVessel(
  root,
  { shadow, alloy, crystal, lampM, unlit },
  {
    plinth: { rTop: 19, r: 22, h: 4.4, y: 6.6 },
    dome: { y: 8.8, r: [18, 24, 18] },
    arches: {
      r: 18,
      t: 0.9,
      scale: [1, 24 / 18, 1],
      at: [0, deg(60), deg(120)],
    },
    // Each collar's centreline a quarter-metre proud of the dome's skin at
    // its height, as drawn.
    collars: {
      t: 0.7,
      at: [
        [0.25, 16],
        [0.25, 24],
      ],
    },
    core: {
      r: 5,
      y: 36,
      yaw: Math.PI / 8,
      scale: [1, 2.6, 1],
      collar: { r: 6, t: 0.8, y: 32.4 },
    },
    mark: { size: [5, 0.6, 2.2], at: [0, 29.2, 10] },
    seams: {
      size: [4.4, 0.5, 1.6],
      at: [
        [deg(30), 8.5, 30],
        [deg(150), 8.5, 30],
        [deg(210), 8.5, 30],
        [deg(330), 8.5, 30],
      ],
    },
    cut,
  }
);

// The outflow: a faceted conduit over the gap into the cistern.
hadron.reactorOutflow(
  root,
  { shadow, alloy, unlit },
  {
    bearing: OUTFLOW,
    conduit: {
      // Low enough to land on the cistern's cap: the first draft's conduit ran
      // level at 19 and left the whole terminal a floating island (#788
      // review, F3).
      y: 16.3,
      profile: [
        [12, 3.4],
        [26, 2.9],
        [40, 3.1],
        [48, 2.3],
      ],
    },
    collars: { r: 3.5, t: 0.8, at: [22, 35] },
    cistern: { at: 50, r: [9, 11], h: 12, y: 6 },
    cap: { r: [7.5, 9.2], h: 2.2, y: 13.1 },
    mouth: { r: 3.2, t: 0.9, y: 14.6 },
    cut,
  }
);

const size = fitFootprint(root, L);
if (size.z > size.x)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(2)} × ${size.z.toFixed(2)}; the arms' phase has to leave x the longer axis`
  );
if (Math.abs(size.x - DRAWN) > 1e-3)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(4)} long; the facet rule was asked at ${DRAWN}`
  );
await exportGlb(root, 'bio-reactor-hadron.glb');
