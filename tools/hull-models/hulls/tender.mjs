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
 * - **The light is where it can be counted.** The two welding bays, the
 *   skylight, the derrick floods and the bow lamp face up. The ten workshop
 *   ports sit under the roof's eaves and the two engine vents under the deck,
 *   where the top-down bake cannot see them, as in the approved bake; the
 *   export's light audit says so, and moving them would be a redesign.
 *
 * Coordinate tables below are laid out as tables on purpose; `tools/**\/*.mjs`
 * is outside the repo's Prettier scope (package.json) precisely so they can be.
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
  ports: { count: 5, x: -16, pitch: 5, y: 8.4, z: 10.3, size: [2.2, 1.4, 0.4] },
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
});

// Deck stores aft of the workshop: the plate rack to starboard, the bottles to
// port, a pipe run down each side, and the pump house.
bathyarch.spareRack(root, { grey, rust }, {
  x: -26, z: 9,
  plates: [[4.6, [9, 0.9, 6], false], [5.5, [9, 0.9, 5], true], [6.4, [9, 0.9, 4], false]],
});
bathyarch.gasBottles(root, amber, { x: -24, y: 6.3, z: -10, count: 4, pitch: 2.4, r: 0.9, h: 4.5 });
bathyarch.pipeRuns(root, rust, { x: -5, y: 4.7, z: 16.5, r: 0.6, length: 50 });
bathyarch.pumpHouse(root, { grey, rust }, {
  house: { at: [-28, 5.9, -3], size: [6, 3.5, 6] },
  riser: { at: [-28, 9.5, -3], r: 0.8, h: 7 },
});

// Two stacks side by side, then their two bands — the file's order.
bathyarch.stack(root, black, { name: 'stack_a', at: [-20, 15, 3], r: 1.8, rTop: 1.5, height: 8 });
bathyarch.stack(root, black, { name: 'stack_b', at: [-20, 15, -3], r: 1.8, rTop: 1.5, height: 8 });
bathyarch.stackBand(root, amber, { name: 'stack_a_band', at: [-20, 17, 3], r: 1.9, h: 0.8 });
bathyarch.stackBand(root, amber, { name: 'stack_b_band', at: [-20, 17, -3], r: 1.9, h: 0.8 });

// A prop tunnel a side, notched into the stern, each with its three blades
// showing and its engine vent beside it.
bothSides((side, sgn) =>
  bathyarch.propTunnel(root, { grey, black, vent }, {
    name: side, at: [-40, -2, sgn * 10], r: 4.2, length: 5, hub: { r: 1.2, length: 5.5 },
    blades: { count: 3, dx: -0.5, size: [1, 3.4, 0.6] },
    vent: { at: [-35.5, 1.5, sgn * 12], size: [1.5, 2.2, 6] },
  })
);

// The bow marks, lamp first, and the twenty-eight rivets along the deck edge,
// numbered from 72 by their place in the file.
bathyarch.bowLamp(root, lampM, { at: [41, 4.6, 0], size: [1.2, 0.8, 3] });
bathyarch.bowStencil(root, amber, { at: [34, 4.3, 0], size: [6, 0.3, 1.2] });
bathyarch.rivetRows(root, grey, { from: -30, to: 24, count: 14, y: 4.3, z: 17.2, size: [0.7, 0.42, 0.7] });

await exportGlb(root, 'tender-bathyarch.glb');
