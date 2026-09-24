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
 * The light, against the block's resting clause — "Dim at rest — deck floods
 * only, the drums dark — and burning under way, the louvres bright, the
 * stack lit at the throat, and a hard lamp in the cradle" — as #890 settled
 * the nineteen lamps the audit could not see (docs/models-plan.md §3.2):
 *
 * - `deck_flood_0..5` are the resting clause's own and stay lit. The export
 *   placed them at `DECK` + 0.4, and `DECK` is the slab's mid-height, not
 *   its top: kit `plate` stands its slab from y 0 to `DEPTH`, so the six
 *   sat inside `hull_slab`, the case `lightAudit` was first written on.
 *   They stand on the slab's top now, at the same six stations.
 * - `louvre_s0..4`, `louvre_p0..4` are lit "under way" — rule 2, clad in
 *   `amber_lamp_unlit`. `louvre_p4` was not on the audit's list, its outer
 *   tenth of a metre showing past the roof, but it is the same clause.
 * - `bridge_port_s0..1`, `bridge_port_p0..1` are named in no band — rule 1,
 *   clad the same.
 *
 * The cradle lamp, the stack throat, the frame floods and the roof gratings
 * face up and were not on the list; they are carried as the approved file
 * lights them, and whether the block should name them at rest is #893.
 *
 * THE DECK DATUM buried more than the floods (#894, from #890's review).
 * `DECK` is the slab's mid-height, and the first cut hung the gun off it:
 * `barbette_ring` (y 5.3–7.5), `barbette` (6.0–9.2) and `deck_scuff`
 * (5.55–5.85) sat inside `hull_slab` (0–11), so the block's open barbette
 * and its ring of scuffed plating were on no chart. The barbette stands on
 * the slab's top now, `DEPTH`, and the cradle, barrel and muzzle rise the
 * same 5.5 m with it; the pile hammer's head, buried the same way (6–9),
 * stands on the deck and the shaft rises from it to where it always
 * reached, 10 m of shaft where 5 of the 18 were in the slab. The frame's
 * six work floods hung a quarter of a metre over the beams and are on them
 * (`lattice`); the cradle lamp's stay stopped at the frame's top with
 * 1.6 m of water under its foot and now runs from the rail to the lamp.
 * The rail itself hangs 0.9 m under the two cross beams and stops a metre
 * short of each, unlit and so outside the audit's measure; hanging it is
 * #907's. The machinery house keeps its floor at `DECK`, half its
 * louvres in the slab: lifting it carries the stack over the frame's top,
 * and the frame reading as the biggest thing on the hull is the block's
 * one hard line, so that is a decision #907 puts to the owner and not
 * this fix.
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
const unlit = bathyarch.ink.amberLampUnlit();

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

// The gun, forward of the frame, on the slab's top — DEPTH, not DECK (header).
bathyarch.barbette(root, { black, grey, rust, amber }, {
  x: 34, deck: DEPTH, r: 7, barrel: { x: 44.5, length: 12 },
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
// Its stay runs from the rail's top (frame.top − 1.6) to the lamp's
// underside (frame.top + 1.2); the first cut's stopped at frame.top, with
// 1.6 m of water under its foot (#894).
add(root, 'cradle_lamp', box(14, 1.0, 5), flood, [5, frame.top + 1.7, 0]);
add(root, 'cradle_lamp_stay', box(0.6, 2.8, 0.6), grey, [5, frame.top - 0.2, 0]);

// The machinery house aft of the frame, and the pile hammer stowed against a leg.
// The louvres are clad: the block lights them under way (header).
bathyarch.machineryHouse(root, { black, grey, rust, amber, vent, flood, louvre: unlit }, {
  x: -24, y: 10, length: 22, height: 9, beam: 26, stack: { x: -30, y: 20, z: 6 },
});
// "Head down": the head stands on the slab's top and the shaft rises from
// it to where it always reached (header).
add(root, 'hammer_shaft', box(1.2, 10, 1.2), grey, [-6.5, 19, 30]);
add(root, 'hammer_head', box(3.6, 3, 3.6), rust, [-6.5, DEPTH + 1.5, 30]);

// "Deck floods only": on the slab's top, which is DEPTH and not DECK (header).
bathyarch.deckFloods(root, lampM, {
  deck: DEPTH,
  spots: [[24, 16], [24, -16], [-42, 16], [-42, -16], [48, 14], [48, -14]],
});
// The bridge ports are clad: the block names them in no band (header).
bothSides((side, sgn) => {
  for (let i = 0; i < 2; i++)
    add(root, `bridge_port_${side}${i}`, box(0.4, 1.2, 2.2), unlit, [-12.8, 11, sgn * (2.5 + i * 5)]);
});

await exportGlb(root, 'derrick-bathyarch.glb');
