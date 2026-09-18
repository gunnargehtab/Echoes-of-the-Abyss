/**
 * The Freighter — the Consortium's transport, 160 m (docs/units.md, "The
 * transports"; #783, off #540 Phase 4).
 *
 * "The armoured hold, 160 m — six berths of hull moved slowly and loudly and
 * very hard to sink (SIG 30 idle, 50 cruise, 68 with a full hold; no weapon;
 * 1,800 hull). A long slab-sided box hull with the Bulwark's riveted plate
 * and a plated weather deck inside its rim, a raised bridge castle aft with
 * two stacks, two great hold doors along each flank hinged at the sill with
 * hinge rails and dogging wheels, crane gantries over a foredeck hatch,
 * ballast blisters low on the hull, and four prop tunnels in a heavy skeg.
 * Lit along the hold-door seams and the bridge ports, and floodlit when the
 * doors open." (docs/asset-prompts-3d.md, UNIT — Freighter, as #783 amended
 * it)
 *
 * A hold with a drive, and the fattest plan in the roster: the hand-drawn
 * outline this model replaces (silhouettes.ts) asks for "near-parallel
 * flanks the whole length, a bluff bow and a heavy squared stern", so the
 * slab is square-edged — no chamfer, the one `armouredSlab` hull without —
 * with its flanks parallel from x −72 to 66 and everything on them (plates,
 * doors, hinge gear) standing under 2.4 m proud, which `outlines.mjs`'s
 * simplifier folds back into one straight line. Every part comes from
 * `factions/bathyarch.mjs`; the Freighter's own words — `bowPlate`,
 * `holdDoors`, `skeg`, `deckGantries`, `cargoHatch` — were written for it
 * there, beside the Bulwark's and the Tender's families.
 *
 * What the script decided that the block, as first written, did not say —
 * the block was amended with the first four in #783:
 *
 * - **The doors are hinged at the bottom.** "Hinge rails and dogging wheels"
 *   places neither; a bottom hinge drops each door as a ramp, which is how
 *   six berths of hull get off, and it puts the three edges that open — top
 *   and both ends — where the seams leak light, and the hinge edge dark. The
 *   top seam lies on the deck edge, which is where the chart's straight-down
 *   bake reads it; each end seam stands the door's depth proud so its top
 *   shows from above. Two doors a side, forward in newer grey and aft in
 *   older rust, thirty metres each.
 * - **The box has a lid.** One armour tier, the deck plate in newer grey a
 *   metre and a half inside the slab's rim, so the plan bakes as a grey deck
 *   with a black line round it — the Tender's deck on its hull, the
 *   Bulwark's first tier on its slab — rather than as a black slab with a
 *   grey castle on it.
 * - **The bridge castle carries two stacks.** The block names none; every
 *   other Consortium hull has at least one and a hold with a drive needs
 *   an exhaust. They stand on the castle's roof abaft the bridge, unlit.
 * - **The foredeck has a hatch.** Gantries lift through something; the
 *   block names the gantries and not the opening. A coaming in older plate
 *   and a cover on it, under the two gantries, with the rails they run on
 *   along the deck edges. The gantries stay inside the hull's beam so the
 *   plan stays the slab's.
 * - **Three patches, a stencil and a bow lamp.** The patchwork and the
 *   asset number are the navy's (Block 2); the bow lamp is a navigation
 *   mark, licensed at every band by the glow table's floor row, and the one
 *   forward light on a hull whose seams are all amidships.
 * - **Nothing else is lit.** The floodlight is the doors-open transient and
 *   is not modelled (docs/models-plan.md §3.2); the cranes, the stacks and
 *   the skeg carry no lamp. The bridge castle's flank ports are lit with
 *   the bridge ports — they are the same castle's ports, and the block's
 *   phrase covers them.
 *
 * The resting light, as the export's audit counts it from above, is the four
 * top seams and eight end seams of the doors, the ten castle ports and five
 * bridge ports proud of their faces, and the bow lamp: 28 lit parts at
 * 86.6 m² facing up, no part hidden. The intake bake at 160 m reads raw
 * E 7.29 against the target E(30) = 3.84 and dims by ×0.527 — inside the
 * ×1/64 .. ×64 window, and near enough unity that the conn view's lamps,
 * which take the model's own intensity and never the bake's gain
 * (rosterModels.ts), sit at the band the chart shows. 210 parts, 4,744
 * triangles; the file spans x −80 .. 80 to the centimetre, so the bake
 * neither rescales nor rotates.
 *
 * The outline `outlines.mjs` cuts from this file is a bluff chamfered bow,
 * flanks at 0.232–0.238 of the length from x 0.41 to −0.44, and a squared
 * stern: 0.48 of beam, against the Bulwark's 0.44. Two things about that
 * cut are the generator's and not the model's: its running median takes an
 * even window at each end of the chain, so the bow and stern points land a
 * few thousandths off the centreline on a hull that is mirror-true part for
 * part, and the one point it keeps at 0.238 a side is the hinge rail, 0.9 m
 * proud of the plates, on whichever door the simplifier reaches first.
 *
 * Coordinate tables below are laid out as tables on purpose; `tools/**\/*.mjs`
 * is outside the repo's Prettier scope (package.json) precisely so they can be.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts). Drawn at it: bow plate at +80, prop hubs at −80. */
const L = 160;
const BOW = L / 2;
const STERN = -L / 2;

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();

const root = new THREE.Group();
root.name = 'consortium_freighter';

// The slab: one plan in absolute metres, bow first down the starboard side
// and back up the port, 18 m deep and centred on the waterline. Bluff bow
// face 50 m across with 14 m of chamfer to the flanks, flanks parallel at
// ±36 for 138 m, squared stern 64 m across with 8 m of chamfer. Square-edged:
// a box, not a casting. The one tier is the deck plate, a metre and a half
// inside the rim, so the box has a lid and the rim a black line round it.
// Everything hung on the flanks below sits inside x −72 .. 66, where the
// flanks are parallel; a fitting past a chamfer floats off the hull.
bathyarch.armouredSlab(root, { black, grey }, {
  slab: {
    outline: [[BOW, 25], [66, 36], [-72, 36], [STERN, 32], [STERN, -32], [-72, -36], [66, -36], [BOW, -25]],
    depth: 18, y: 0,
  },
  tiers: [
    { outline: [[78.5, 23.8], [65.4, 34.5], [-71.6, 34.5], [-78.5, 31], [-78.5, -31], [-71.6, -34.5], [65.4, -34.5], [78.5, -23.8]], depth: 0.6, y: 9.3 },
  ],
});
bathyarch.bowPlate(root, { grey, amber }, {
  plate: { at: [79, 0, 0], size: [2, 14, 44] },
  band: { at: [79.4, 3, 0], size: [1.2, 1.4, 46] },
});

// The Bulwark's flank plate in the Bulwark's gauge, 2.4 m, one plate a side
// forward of the doors in newer grey and one aft under the castle in older
// rust, and the seam of older plate running the whole flank below them.
bathyarch.flankPlates(root, { grey, rust }, {
  z: 36, plateT: 2.4,
  plates: [[50, 28, 9, 1, false], [-57, 26, 8, 1.5, true]],
  seamLength: 132, seam: { y: -4.8, h: 1.2, t: 1.2, z: 36.5 },
});

// Two hold doors a side, 30 m each, forward and aft of amidships, standing
// flush with the plates' faces; the hinge rail along each bottom edge with
// three knuckles, three dogging wheels across the upper face, the hazard
// stripe over them, and the lit seams — top on the deck edge, one up each
// end (the header says why those three).
bathyarch.holdDoors(root, { grey, rust, amber, lampM }, {
  doors: [[7, 30, false], [-27, 30, true]],
  height: 12, y: 3, z: 36, t: 2.4,
  stripe: { inset: 4, h: 0.8, t: 0.2, y: 7.2, z: 37.3 },
  hinge: { r: 0.6, y: -3, z: 37.5, knuckles: [-12, 0, 12], knuckle: { r: 0.85, length: 1.6 } },
  wheels: { at: [-9, 0, 9], r: 0.9, rim: 0.16, y: 4.8, z: 37.4, hub: { r: 0.3, length: 0.8, z: 37.6 } },
  seams: {
    top: { h: 0.3, w: 0.5, y: 9.15, z: 36 },
    jamb: { w: 0.4, h: 12.2, t: 2.4, y: 3.1, z: 36 },
  },
});

// Ballast blisters low on both flanks, capped at both ends, with a keel
// skid a side under the hull.
bathyarch.ballastBlisters(root, { grey, rust }, {
  x: -4, y: -8.5, z: 34, r: 3.5, length: 104,
  caps: { length: 3, fore: 49.5, aft: -57.5, tipR: 2.4 },
  skid: { x: -6, y: -10, z: 16, size: [110, 2, 3] },
});

// The heavy skeg under the stern, and the four prop tunnels through its
// after face — hubs to the stern at −80.
bathyarch.skeg(root, { rust, grey, black }, {
  block: { size: [32, 10, 44], at: [-60, -14, 0] },
  tunnels: { x: -77, y: -14, z: [-16.5, -5.5, 5.5, 16.5], r: 4.5, length: 4.5, hub: { r: 1.3, length: 6 } },
});

// The bridge castle aft, raised 12 m off the deck with the bridge on top of
// it, the visor across its forward face, five ports a flank and five bridge
// ports across the bridge's forward face — the resting light the block
// names beside the seams. Then the two stacks on the castle's roof, port
// first, each with its band.
bathyarch.citadel(root, { black, grey, rust, lampM }, {
  block: { at: [-58, 15, 0], size: [28, 12, 30] },
  top: { at: [-54, 23, 0], size: [18, 4, 20] },
  visor: { at: [-44, 19, 0], size: [2, 3, 30.4] },
  ports: { count: 5, x: -70, pitch: 5, y: 17, z: 15.2, size: [2.5, 1.6, 0.5] },
  bridgePorts: { x: -44.8, y: 23.3, z: [-7, -3.5, 0, 3.5, 7], size: [0.5, 1.6, 2.4] },
});
[-7, 7].forEach((z, i) => {
  bathyarch.stack(root, black, { name: `stack_${i}`, at: [-68, 26, z], r: 2.4, rTop: 2, height: 10 });
  bathyarch.stackBand(root, amber, { name: `stack_band_${i}`, at: [-68, 29.5, z], r: 2.6, h: 1 });
});

// The foredeck: the cargo hatch under two gantries, the trolleys run out
// one to starboard and one to port.
bathyarch.cargoHatch(root, { grey, rust }, {
  coaming: { size: [40, 1.4, 46], at: [47, 9.7, 0] },
  cover: { size: [38, 0.8, 44], at: [47, 10.6, 0] },
});
bathyarch.deckGantries(root, { grey, rust, black }, {
  rails: { size: [50, 1, 1.6], x: 51, y: 9.5, z: 30 },
  gantries: [[40, 12], [62, -10]],
  legs: { size: [3, 14, 3], y: 16, z: 30 },
  beam: { size: [3.6, 3, 64], y: 24.5 },
  trolley: { size: [4, 2.4, 4], y: 21.8 },
  cable: { r: 0.2, length: 6.6, y: 17.3 },
  hook: { size: [1.6, 1.6, 1.6], y: 13.2 },
});

// The patchwork: older plate on the hatch cover, newer on the castle's
// starboard flank, older on the port forward plate.
bathyarch.repairPatches(root, bathyarch.inFrame, { rust, grey }, {
  patches: [
    ['patch_deck', 'rust', [8, 0.3, 6], [40, 11.1, 8]],
    ['patch_citadel_s', 'grey', [6, 4, 0.4], [-62, 13, 15.1]],
    ['patch_flank_p', 'rust', [7, 3, 0.4], [56, 2.5, -37.3]],
  ],
});

// Rivets: twenty-four a side along the deck plate's edge in grey, sixteen
// a side along the flank seam in black, numbered by their place in the
// file as the Bulwark's and the Tender's are. Then the stencil and the bow
// lamp on the foredeck.
bathyarch.rivetRows(root, grey, { from: -70, to: 64, count: 24, y: 9.6, z: 34.6, size: [1, 0.6, 1] });
bathyarch.rivetRows(root, black, { from: -64, to: 64, count: 16, y: -4.8, z: 37.2, size: [0.9, 0.55, 0.9] });
bathyarch.bowStencil(root, amber, { at: [72.5, 9.75, 0], size: [10, 0.3, 2] });
bathyarch.bowLamp(root, lampM, { at: [78.5, 9.8, 0], size: [1.2, 0.8, 3] });

await exportGlb(root, 'freighter-bathyarch.glb');
