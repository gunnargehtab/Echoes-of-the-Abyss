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
 *
 * FACETS (#919). The Directorate's rule is one facet edge of 2 m on the odd
 * lattice, five to fifteen (docs/asset-prompts-3d.md Block 2c;
 * directorate.mjs `cut`), asked at the fitted footprint's scale (`DRAWN`,
 * 1.295 m a unit) and settled on each part as pressed. The pass re-cut
 * what was off it, 40 of this file's 66 rings: the vessel to fifteen round
 * and seven down (the file's 12 × 8), its collar 16 × 6 → 15 × 7, the six
 * scutes and the crown seam to 15 × 7 (8 × 6 and 10 × 6), the four ports
 * 8 × 5 → 9 × 5, the gullet eight to fifteen and its two ribs 12 × 5 →
 * 15 × 5; on the kit's bed and arms the holdfast mat sixteen to fifteen,
 * the slab eight to fifteen, the kerb 16 × 5 → 15 × 5, the throat drums
 * ten to fifteen, the feed throats ten to eleven and the boom legs six to
 * seven. The four mound spines and fifteen rake tines keep their five, the
 * navy's section. Triangles 2,692 → 3,646; the fit, the after arms' rake
 * beams, is unchanged at 138.9627. `facets.mjs` names no ring here, and no
 * contact pair was lost or gained.
 *
 * PANELS (#919). The band for a structure is 2.5–8 m on a side, the median
 * unlit part from above (facets.mjs `panelsOf`; Block 2c), and this file
 * read 8.1 m over forty-six, the rake beams the median. The pass adds three
 * mound spines where three are the least, a size down from the file's four
 * (1.3 of radius for 1.6) and higher on the mound, on the same side — 231°,
 * 258° and 278°, between the ports and the scutes, the stations the seam
 * across the crown and the ports leave on that side — each leaning out 0.35
 * as the four do, its base seated on the vessel (`spineRank`), touching
 * nothing else. They show 7–8 m² each, and the median part is 6.7 m over
 * forty-nine, a throat drum. No lamp's plan changed, no plan grew from
 * above; the fit is the same 138.9627. 69 parts and 3,646 triangles become
 * 72 and 3,676.
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
/** The plan's long side as built: the after arms' rake beams, tip to tip (kit.mjs `fitFootprint`). */
const DRAWN = 138.9627;
// The Directorate's facet rule at this file's scale (directorate.mjs `cut`,
// #919): the model is drawn 138.96 across and priced at 180 m, and the rule
// is a chord in metres. Asserted after the fit, since the fit is what sets
// the scale.
const cut = directorate.cut(L / DRAWN);
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
// Every round part on the rule's count at its own radius (kit.mjs `asked`,
// #919); the pad keeps the kit's turn of an eighth, a flat to the bow.
reactorBed(
  root,
  { holdfast: black, slab: violet, kerb: steel, lamp: lampM },
  {
    mat: { facets: cut.round },
    pad: { facets: cut.round },
    rim: { radial: cut.round, facets: cut.round },
  }
);

// Three arms out into the canopy, booms in steel, throats in the unlit
// finish, anchor feet in red and the rake tines in trench black.
radialSeries(ARMS, (a) =>
  reactorIntakeArm(
    root,
    { boom: steel, collar: black, throat: unlit, foot: red, rake: black },
    {
      bearing: a,
      drum: { facets: cut.round },
      mouth: { facets: cut.round },
      tines: { facets: cut.round },
      // The kit's own legs, asked for the rule's count (kit.mjs `reactorIntakeArm`, #919).
      legs: { at: 48, spread: 5.2, r: [1.1, 1.5], h: 12.4, facets: cut.round },
    }
  )
);

// The mound: 34 m of shell on the slab, collared, scuted, seamed and spined.
directorate.reactorVessel(
  root,
  { violet, red, black, steel, lampM, unlit },
  {
    cut,
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

// Three more mound spines (#919, the panel pass; the header), a size down
// from the file's four and higher on the mound, on the same side — 231°,
// 258° and 278°, between the ports and the scutes — each leaning out 0.35
// along its own bearing as the four do, seated on the vessel (`spineRank`;
// kit.mjs `seat`). The station is on the mound's skin: 17 up its 19.
directorate.spineRank(root, {
  name: 'mound_spine',
  on: 'reactor_vessel',
  spines: [
    [4, 231, 9.5, 10],
    [5, 258, 8.5, 9],
    [6, 278, 8.8, 9.5],
  ].map(([n, a, rho, length]) => {
    const b = deg(a);
    const y = 18 + 17 * Math.sqrt(1 - (rho / 19) ** 2);
    const lean = [Math.sin(0.35) * Math.cos(b), Math.cos(0.35), Math.sin(0.35) * Math.sin(b)];
    return [n, black, 1.3, length, [rho * Math.cos(b), y, rho * Math.sin(b)], lean];
  }),
});

// The outflow: a gullet over the gap into the hopper.
directorate.reactorOutflow(
  root,
  { red, black, steel, unlit },
  {
    cut,
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
if (Math.abs(Math.max(size.x, size.z) - DRAWN) > 1e-3)
  throw new Error(`${root.name}: drawn ${Math.max(size.x, size.z)}, DRAWN says ${DRAWN}`);
if (size.z > size.x)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(2)} × ${size.z.toFixed(2)}; the arms' phase has to leave x the longer axis`
  );
await exportGlb(root, 'bio-reactor-directorate.glb');
