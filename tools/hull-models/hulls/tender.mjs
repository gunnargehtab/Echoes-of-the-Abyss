/**
 * The Tender — the Consortium's repair hull, 85 m (docs/units.md, "The rung,
 * and two hulls a navy").
 *
 * "A floating workshop, not a warship (SIG 48 idle, +12 while welding; no
 * weapon). Box hull with an open work deck forward under two derricks, a
 * riveted workshop deckhouse amidships, spare-plate racks, gas bottles, pump
 * houses and pipe runs, twin prop tunnels notched into the stern. Sustained
 * glow from the welding bay, the workshop's lit ports and the stern vents;
 * floodlit when it works."
 *
 * Every part comes from `factions/bathyarch.mjs` and every number below is
 * the approved GLB's own, read back part for part (#587); `derrickRig` and
 * `workshop` were written against this file and have no other caller yet.
 *
 * Three things the file does that the prompt does not say, kept because the
 * approved model does them:
 *
 * - **The order is the file's.** Starboard group then port group for every
 *   paired family — the ballast with its fore and aft caps, the prop tunnel
 *   with its blades and vent — and the tail runs bow lamp, stencil, then the
 *   twenty-eight rivets; the Bulwark's tail runs the other way round.
 * - **The rivets are numbered by their place in the file.** `rivet_72` is
 *   the 73rd part, the approved export's own convention; `rivetRows` does
 *   the same, so the run lands at 72 … 99 without a constant.
 * - **The light is where it can be counted — since #890, all of it.** The
 *   two welding bays, the skylight, the derrick floods and the bow lamp
 *   faced up in the approved file. Its ten workshop ports were 0.4 m panels
 *   under the roof's eave and the hazard band's, and its two engine vents
 *   sat inside the hull box beside the prop tunnels, so the audit warned on
 *   twelve; the block names both at rest ("lit ports … and vents"), so
 *   #890 moved them rather than clad them (docs/models-plan.md §3.2 rule
 *   5), and they are the one departure from the file:
 *   - `port_s0..4`, `port_p0..4`: the same rank of five a side, each port a
 *     box 1.2 m deep from the wall, standing 0.6 m proud of the band's
 *     eave so its top face reaches the bake.
 *   - `engine_vent_s`, `engine_vent_p`: gratings let into the stern deck
 *     over the prop tunnels, one a quarter, where the file had them at
 *     y 1.5 inside the hull.
 *   The block's lighting clause was amended with them.
 *
 * Coordinate tables below are laid out as tables on purpose; `tools/**\/*.mjs`
 * is outside the repo's Prettier scope (package.json) precisely so they can be.
 *
 * FACETS (#919). The Klaxon's rule is one facet edge of 2.5 m (docs/asset-prompts-3d.md Block 2c; bathyarch.mjs `cut`),
 * asked at this file's scale, and the pass re-cut what was off it: the
 * ballast blisters and caps eight at 3 m, where the export had twelve; the
 * prop shrouds ten at 4.1 m, where they were twelve; the two stacks and
 * their bands six at 1.8–1.9 m, where they were ten; the derrick masts and
 * booms, the gas bottles, the pipe runs, the pump riser and the prop hubs
 * six, where they were eight. 100 parts and 1,960 triangles become 100 and
 * 1,680.
 *
 * PANELS (#919). The Klaxon's hull band is a median unlit part of 0.75–2 m
 * from above (Block 2c; bathyarch.mjs `panels`), and this hull read 3.0 m:
 * its median part was a spare plate, since a workshop's deck is one plate
 * of 1,640 m² and its stores are few. The pass laid twenty-nine fittings on
 * the deck and the workshop roof through bathyarch.mjs `deckPlates`,
 * `plateSeams` and `deckHatches` (kit.mjs `seat`): fifteen plates of older
 * rust and newer black, 1.8–2 m by 1.3–1.4 and 0.25 proud — four on the
 * work deck, four on the strips outboard of the workshop, three on the
 * foredeck, two on the quarters, two on the roof; six seams 0.35 m wide and
 * 5–6 m long; and eight dogged hatches 1.6 m across. The work deck's own
 * plate lies 0.2 under the deck's top, so the deck is what a fitting there
 * stands on. The median reads 1.6 m. 100 parts and 1,680 triangles become
 * 133 and 2,508.
 */
import { THREE, bothSides, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, bow to stern notch.
 *
 * The two disagree by a metre and a half — the hull plan's chamfer reaches
 * 0.6 m past the outline at both ends — so intake and the runtime have both
 * been squeezing this hull by 0.984 since it landed. The numbers below are
 * the approved model's own and the root carries that one squeeze, which makes
 * the file metre-true (kit.mjs) and leaves the shipped maps exactly where
 * they were — the Sower's answer (hulls/sower.mjs).
 */
const L = 85;
const DRAWN = 86.41;

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const vent = bathyarch.ink.amberVent();
const flood = bathyarch.ink.amberFlood();

const root = new THREE.Group();
root.name = 'consortium_tender';
root.scale.setScalar(L / DRAWN);
// The Klaxon's facet rule at this file's scale (bathyarch.mjs `cut`, #919):
// the numbers below are the export's and the rule is a chord in metres.
const cut = bathyarch.cut(L / DRAWN);

// The box hull: a 9 m plan with a 0.6 m chamfer, notched at the stern between
// the prop tunnels, and the deck plate a metre or two inside its rim.
bathyarch.boxHull(root, { black, grey, rust }, {
  hull: {
    outline: [[42.5, 12], [26, 20], [-34, 20], [-42.5, 10], [-33, 0], [-42.5, -10], [-34, -20], [26, -20], [42.5, -12]],
    depth: 9, bevel: 0.6, y: -1,
  },
  deck: {
    outline: [[40.5, 11], [25, 18.5], [-33, 18.5], [-41, 9.5], [-32.5, 0], [-41, -9.5], [-33, -18.5], [25, -18.5], [40.5, -11]],
    depth: 1.2, y: 4.1,
  },
  strakes: { x: -4, y: 0.5, z: 20.4, size: [60, 2.2, 1.4] },
});
bathyarch.ballastBlisters(root, { grey, rust }, {
  x: -6, y: -3, z: 17.5, r: 3, length: 46, caps: { length: 2, fore: 18, aft: -30, tipR: 2.4 },
  cut,
});

// The workshop deckhouse amidships and its fittings.
bathyarch.workshop(root, { black, grey, rust, amber, lampM, vent }, {
  house: { at: [-6, 7.9, 0], size: [26, 6.5, 20] },
  roof: { at: [-6, 11.6, 0], size: [27, 1, 21] },
  ridge: { at: [-6, 12.4, 0], size: [27.5, 0.8, 4] },
  patches: {
    s: { at: [-12, 7.5, 10.2], size: [7, 4, 0.5], old: true },
    p: { at: [0, 8.5, -10.2], size: [5, 3, 0.5] },
  },
  band: { at: [-6, 11, 0], size: [27, 0.6, 21.2] },
  // Each port runs from the wall (z 10) out past the band's eave (10.6) to
  // 11.2; the file's were 10.1..10.5, under it (header, #890).
  ports: { count: 5, x: -16, pitch: 5, y: 8.4, z: 10.6, size: [2.2, 1.4, 1.2] },
  skylight: { at: [-6, 12.2, 0], size: [10, 0.3, 8] },
});

// The work deck forward under the two derricks.
bathyarch.workDeck(root, { black, flood, rust }, {
  deck: { at: [20, 4.3, 0], size: [22, 0.4, 24] },
  bays: { x: 22, y: 4.6, z: 6, size: [8, 0.3, 7] },
  job: { at: [18, 5, 0], size: [12, 1.2, 5] },
});
bathyarch.derrickRig(root, { grey, amber, black, lampM }, {
  mast: { x: 8, y: 11, z: 13, r: 1.4, rTop: 1.1, height: 14 },
  head: { y: 18.5, size: [2.6, 2.6, 2.6] },
  boom: { x: 19, y: 15.5, z: 9.5, length: 24, r: 0.9, rTip: 0.7, pitch: 0.25, yaw: 0.3 },
  fall: { x: 29, y: 9.5, z: 6, r: 0.2, length: 9 },
  hook: { y: 5.5, size: [1.6, 1.6, 1.6] },
  lamp: { x: 10.2, y: 18.2, z: 13, size: [1.8, 1.2, 1.8] },
  cut,
});

// Deck stores aft of the workshop: the plate rack to starboard, the bottles to
// port, a pipe run down each side, and the pump house.
bathyarch.spareRack(root, { grey, rust }, {
  x: -26, z: 9,
  plates: [[4.6, [9, 0.9, 6], false], [5.5, [9, 0.9, 5], true], [6.4, [9, 0.9, 4], false]],
});
bathyarch.gasBottles(root, amber, { x: -24, y: 6.3, z: -10, count: 4, pitch: 2.4, r: 0.9, h: 4.5, cut });
bathyarch.pipeRuns(root, rust, { x: -5, y: 4.7, z: 16.5, r: 0.6, length: 50, cut });
bathyarch.pumpHouse(root, { grey, rust }, {
  house: { at: [-28, 5.9, -3], size: [6, 3.5, 6] },
  riser: { at: [-28, 9.5, -3], r: 0.8, h: 7 },
  cut,
});

// Two stacks side by side, then their two bands — the file's order.
bathyarch.stack(root, black, { name: 'stack_a', at: [-20, 15, 3], r: 1.8, rTop: 1.5, height: 8, cut });
bathyarch.stack(root, black, { name: 'stack_b', at: [-20, 15, -3], r: 1.8, rTop: 1.5, height: 8, cut });
bathyarch.stackBand(root, amber, { name: 'stack_a_band', at: [-20, 17, 3], r: 1.9, h: 0.8, cut });
bathyarch.stackBand(root, amber, { name: 'stack_b_band', at: [-20, 17, -3], r: 1.9, h: 0.8, cut });

// A prop tunnel a side, notched into the stern, each with its three blades
// showing and its engine vent over it: a grating on the deck (top 4.7) at
// the quarter, inside the deck's outline there (z 3.4..15.7 at x −35.5),
// where the file's [−35.5, 1.5, ±12] sat inside the hull (header, #890).
bothSides((side, sgn) =>
  bathyarch.propTunnel(root, { grey, black, vent }, {
    name: side, at: [-40, -2, sgn * 10], r: 4.2, length: 5, hub: { r: 1.2, length: 5.5 },
    blades: { count: 3, dx: -0.5, size: [1, 3.4, 0.6] },
    vent: { at: [-35.5, 4.85, sgn * 11.5], size: [1.5, 0.3, 6] },
    cut,
  })
);

// The bow marks, lamp first, and the twenty-eight rivets along the deck edge,
// numbered from 72 by their place in the file.
bathyarch.bowLamp(root, lampM, { at: [41, 4.6, 0], size: [1.2, 0.8, 3] });
bathyarch.bowStencil(root, amber, { at: [34, 4.3, 0], size: [6, 0.3, 1.2] });
bathyarch.rivetRows(root, grey, { from: -30, to: 24, count: 14, y: 4.3, z: 17.2, size: [0.7, 0.42, 0.7] });

// PANELS (#919, header): the deck's own division, seated on it. Every
// fitting below is dropped onto `deck` by kit.mjs `seat` — the work deck's
// own plate lies 0.2 under the deck's top, so the deck is what a fitting
// there stands on — or onto `workshop_roof`. Plates of older and newer
// plate 1.8–2 m by 1.3–1.4, 0.25 proud; seams 0.35 wide and 0.25 high, 5–6 m
// across the work deck and the foredeck and 6 along the strips outboard of
// the workshop; dogged hatches 1.6 m across under a 0.5 m wheel, which the
// measure drops. Each sits where the deck is bare: clear of the welding
// bays, the plate in repair, the derricks' falls and hooks, the stencil,
// the stores aft, the pipe runs and the rim's rivets.
const PLATE_T = 0.25;
const HATCH = { r: 0.8, h: 0.3, wheel: { R: 0.25, t: 0.05 }, cut };
bathyarch.deckPlates(root, { black, rust }, {
  on: 'deck', t: PLATE_T,
  plates: [
    // The work deck, forward of the bays and abaft the hooks.
    ['work_plate_0', 'rust', [2.0, 1.4], [12, 8]],
    ['work_plate_1', 'black', [1.8, 1.3], [12, -8.5]],
    ['work_plate_2', 'black', [2.0, 1.4], [15, 5]],
    ['work_plate_3', 'rust', [1.8, 1.3], [15, -5.5]],
    // The strips outboard of the workshop, inside the pipe runs.
    ['deck_plate_0', 'rust', [2.0, 1.4], [-10, 13.2]],
    ['deck_plate_1', 'black', [2.0, 1.4], [-8, -13.2]],
    ['deck_plate_2', 'black', [1.8, 1.3], [-2, 13.2]],
    ['deck_plate_3', 'rust', [2.0, 1.4], [2, -13.2]],
    // The foredeck either side of the stencil.
    ['fore_plate_0', 'rust', [2.0, 1.4], [34, 5]],
    ['fore_plate_1', 'black', [2.0, 1.4], [34, -5]],
    ['fore_plate_2', 'black', [1.8, 1.3], [37.5, -2.5]],
    // The quarters, abaft the plate rack and the pump house.
    ['aft_plate_0', 'rust', [1.8, 1.3], [-33, 5.5]],
    ['aft_plate_1', 'black', [1.8, 1.3], [-33.5, -4]],
  ],
});
// A 0.35 m strip spans two of the maps' 0.25 m cells, so a seam reads half
// a metre wide from above and six metres is the length that keeps it a
// panel under the band's two metres.
bathyarch.plateSeams(root, rust, { on: 'deck', name: 'work_seam', stations: [10, 27.5], length: 6, w: 0.35, h: 0.25 });
bathyarch.plateSeams(root, rust, { on: 'deck', name: 'deck_seam_s', stations: [-17], z: 13.5, length: 6, w: 0.35, h: 0.25, along: true });
bathyarch.plateSeams(root, rust, { on: 'deck', name: 'deck_seam_p', stations: [-17], z: -13.5, length: 6, w: 0.35, h: 0.25, along: true });
bathyarch.plateSeams(root, rust, { on: 'deck', name: 'fore_seam_s', stations: [32], z: 5, length: 5, w: 0.35, h: 0.25 });
bathyarch.plateSeams(root, rust, { on: 'deck', name: 'fore_seam_p', stations: [32], z: -5, length: 5, w: 0.35, h: 0.25 });
bathyarch.deckHatches(root, { hatch: grey, wheel: rust }, {
  on: 'deck', ...HATCH,
  hatches: [
    ['work_hatch', [29, 0]],
    ['work_hatch_s', [28.5, 9.5]],
    ['work_hatch_p', [28.5, -9.5]],
    ['fore_hatch', [37.5, 4]],
    ['aft_hatch', [-36, 6.2]],
  ],
});
// The workshop roof, between the skylight and the eaves.
bathyarch.deckPlates(root, { black, rust }, {
  on: 'workshop_roof', t: PLATE_T,
  plates: [['roof_plate_s', 'rust', [2.0, 1.4], [-14, 7]], ['roof_plate_p', 'black', [2.0, 1.4], [0, -7]]],
});
bathyarch.deckHatches(root, { hatch: grey, wheel: rust }, { on: 'workshop_roof', ...HATCH, hatches: [['roof_hatch', [4, 6.5]]] });

await exportGlb(root, 'tender-bathyarch.glb');
