/**
 * The Derrick — the Consortium's mid-tier, 120 m (docs/units.md, "The mid-tier").
 *
 * "A pier under construction, made to swim: a blunt riveted working hull...
 * Standing off both beams amidships and the widest thing on the hull, the
 * derrick itself — an open riveted lattice frame, four legs braced in X, and
 * slung under it in a cradle the listening array: a rank of eight bare
 * hydrophone drums hanging on cables."
 *
 * The frame is the hull's argument and has to read at distance as the biggest
 * thing on it, because this is the gun that aims by ear.
 *
 * Coordinate tables below are laid out as tables on purpose; `tools/**\/*.mjs`
 * is outside the repo's Prettier scope (package.json) precisely so they can be.
 */
import { THREE, add, box, cyl, strut, bothSides, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 120;
const BOW = 60;
const STERN = -60;
const DEPTH = 11;
const DECK = DEPTH / 2;

// Plan outline in hull fractions, bow-first, port side then starboard: a blunt
// working shape with a waist where the derrick's legs land.
const outline = [
  [0.5, 0.1], [0.42, 0.2], [0.2, 0.2], [0.16, 0.31], [-0.06, 0.31], [-0.1, 0.2],
  [-0.44, 0.2], [-0.5, 0.14], [-0.5, -0.14], [-0.44, -0.2], [-0.1, -0.2],
  [-0.06, -0.31], [0.16, -0.31], [0.2, -0.2], [0.42, -0.2], [0.5, -0.1],
];

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const vent = bathyarch.ink.amberVent();
const flood = bathyarch.ink.amberFlood();

const root = new THREE.Group();
root.name = 'consortium_derrick';

bathyarch.hullSlab(root, { black, grey, amber }, {
  outline, lengthM: L, depth: DEPTH, bow: BOW, stern: STERN,
});
bathyarch.flankPlates(root, { grey, rust }, {
  z: 24.6,
  plates: [[36, 28, 5, -1, false], [-24, 18, 4, -2, true], [-46, 14, 3.5, 0, false]],
  seamLength: 112,
  rivets: [['u', 3.6], ['l', -3.2]],
});
bathyarch.propTunnels(root, { grey, rust }, { x: -58, z: 9, r: 4.2 });
bathyarch.ballastAndKeel(root, { black, rust }, {
  z: 21, x: -6, length: 60, r: 3, keel: { x: -4, y: -6.2, length: 100 },
});

// The gun, forward of the frame.
bathyarch.barbette(root, { black, grey, rust, amber }, {
  x: 34, deck: DECK, r: 7, barrel: { x: 44.5, length: 12 },
});

// The derrick: the frame, its X-bracing, and the listening array slung beneath.
const frame = bathyarch.lattice(root, { grey, rust, flood }, {
  fwd: 14, aft: -4, z: 34, deck: DECK, height: 22,
});
const faces = [
  ['brace_s', [frame.aft, frame.deck, 34], [frame.fwd, frame.top, 34], [frame.fwd, frame.deck, 34], [frame.aft, frame.top, 34]],
  ['brace_p', [frame.aft, frame.deck, -34], [frame.fwd, frame.top, -34], [frame.fwd, frame.deck, -34], [frame.aft, frame.top, -34]],
  ['brace_fwd', [14, frame.deck, -34], [14, frame.top, 34], [14, frame.deck, 34], [14, frame.top, -34]],
  ['brace_aft', [-4, frame.deck, -34], [-4, frame.top, 34], [-4, frame.deck, 34], [-4, frame.top, -34]],
];
for (const [nm, a0, a1, b0, b1] of faces) {
  strut(root, `${nm}_0`, a0, a1, grey);
  strut(root, `${nm}_1`, b0, b1, grey);
}
add(root, 'cradle_rail', box(16, 0.8, 0.8), rust, [5, frame.top - 2, 0]);
for (let i = 0; i < 8; i++) {
  const z = -28 + i * 8;
  const drop = 6 + (i % 2) * 2;
  add(root, `drum_cable_${i}`, cyl(0.15, 0.15, drop, 5), black, [5, frame.top - 2 - drop / 2, z]);
  add(root, `hydrophone_drum_${i}`, cyl(1.5, 1.5, 3.2, 10), rust, [5, frame.top - 2 - drop - 1.6, z]);
}
// The cradle lamp rides *above* the rail: a top-down bake sees plan area only.
add(root, 'cradle_lamp', box(14, 1.0, 5), flood, [5, frame.top + 1.7, 0]);
add(root, 'cradle_lamp_stay', box(0.6, 1.8, 0.6), grey, [5, frame.top + 0.9, 0]);

// The machinery house aft of the frame, and the pile hammer stowed against a leg.
bathyarch.machineryHouse(root, { black, grey, rust, amber, vent, flood }, {
  x: -24, y: 10, length: 22, height: 9, beam: 26, stack: { x: -30, y: 20, z: 6 },
});
add(root, 'hammer_shaft', box(1.2, 18, 1.2), grey, [-6.5, 15, 30]);
add(root, 'hammer_head', box(3.6, 3, 3.6), rust, [-6.5, 7.5, 30]);

bathyarch.deckFloods(root, lampM, {
  deck: DECK,
  spots: [[24, 16], [24, -16], [-42, 16], [-42, -16], [48, 14], [48, -14]],
});
bothSides((side, sgn) => {
  for (let i = 0; i < 2; i++)
    add(root, `bridge_port_${side}${i}`, box(0.4, 1.2, 2.2), lampM, [-12.8, 11, sgn * (2.5 + i * 5)]);
});

await exportGlb(root, 'derrick-bathyarch.glb');
