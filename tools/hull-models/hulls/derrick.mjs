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
 * LIGHT — the block's resting clause names every lamp this file lights
 * (docs/asset-prompts-3d.md, UNIT — Derrick; docs/models-plan.md §3.2 rule
 * 1), since #893 rewrote it for a SIG 58 idle that sits in the 36–60
 * "sustained glow" band: the six deck floods, the six work floods along the
 * frame's top beams, the six roof gratings, the louvres of the raked hood
 * down each side of the machinery house, the stack's throat, the four
 * bridge ports in the house's forward face and the cradle lamp; the drums
 * dark. Under way the same lamps burn brighter, because 66 is over the
 * Klaxon's line (the one-glow-factor reading, §3.2).
 * Twenty lamps sat where the top-down bake could not see them (nineteen on
 * the audit's list; `louvre_p4` showed a tenth of a metre past the roof):
 * #890 raised the six deck floods and clad the other fourteen, and #893
 * relit those fourteen and moved them:
 *
 * - `deck_flood_0..5` (#890): the export placed them at `DECK` + 0.4, and
 *   `DECK` is the slab's mid-height, not its top — kit `plate` stands its
 *   slab from half a thickness to one and a half above the origin, so the
 *   six sat inside `hull_slab`, the case `lightAudit` was first written on.
 *   They stand on the slab's top now, at the same six stations.
 * - `louvre_s0..4`, `louvre_p0..4` (#893): five bars flat on each wall of
 *   the house under the roof's eave, the lower two below the deck line, in
 *   `amber_vent` until #890 clad them. `amber_vent` again, and a raked
 *   hood a side now: a well of hull black (`louvre_well_s/p`) leaning from
 *   the deck 2.25 m out from the wall (z ±15.25, y 11) up to the wall 2.7 m
 *   above it (z ±13, y 13.7, under the roof's underside at 14.3), and five
 *   blades stepped down its face, each canted up 35° with its inner edge
 *   in the well and its outer edge half a metre out from the blade above's
 *   — the top one under the eave with its outer edge 0.4 m past it, the
 *   bottom one at the deck. The form is the Caisson's and the Gantry's
 *   `exhaustLouvres`, slats over a well, stood against a wall. From above
 *   each blade shows its half-metre step past the one over it, so the
 *   chart reads one lit band 2.4 m wide down each flank, from the eave at
 *   z 13.5 to the bottom blade's outer edge at 15.91 (`machineryHouse`).
 *   The well is 1.8 m thick because the corner where the deck meets the
 *   wall lies 1.73 m under its face: a metre of well left a hollow of
 *   triangular section under the whole hood, open at both ends. The two
 *   wells are the one part added in this file — two unlit parts the
 *   approved model did not have; the blades and the ports below are moved
 *   and reshaped, and `diff.mjs` lists all sixteen — added in #893's second
 *   round because a blade with nothing under it is a slat screen hanging
 *   in the air, not the louvred side the block names. Only a hidden lamp
 *   licenses a move, and a move may not make the lamp a different fixture
 *   (#890 ruling 6, and the #893 brief's gloss on rulings 1 and 6); the
 *   well is what keeps the moved blades the fixture they were.
 * - `bridge_port_s0..1`, `bridge_port_p0..1` (#893): `amber_lamp` again,
 *   named in no band before #893 and clad by #890. They were 0.4 m panels
 *   on the house's forward face with their sills at the deck line, under
 *   the roof's half-metre eave; they are port boxes now, 1.1 m deep from the
 *   wall so the outer 0.6 m stands past the eave — the Tender's ports under
 *   its deckhouse eaves — a metre and a half up the wall.
 *
 * The cradle lamp, the stack throat, the frame floods and the roof gratings
 * face up and never moved; the block names them since #893.
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
 * The rail itself ran fore-aft under the two cross beams, 0.9 m below
 * them and a metre short of each, unlit and so outside the audit's
 * measure — and 3.5 m from the nearest of the eight cables, which rank
 * athwartships at x 5 and so hung from nothing. Since #907 it runs
 * athwartships under the two side beams, 69.4 m long with its top on
 * both undersides at their midpoints; every cable starts inside it and
 * took up its 0.9 rise, so the drums hang where they hung, and the stay
 * stands on it. The machinery house keeps its floor at `DECK`, the slab
 * burying all but 3.5 m of it (its louvred hoods stand on that exposed
 * wall since #893): lifting it carries the stack over the frame's top,
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
// The cradle rail hangs from the two side beams, athwartships under their
// midpoints, its top on both undersides (frame.top − 0.7): the rank of
// drums hangs from it on their cables and the lamp's stay stands on it.
// The first cut ran it fore-aft under the cross beams, 0.9 m lower and a
// metre short of each — and 3.5 m from the nearest cable (#907).
add(root, 'cradle_rail', box(0.8, 0.8, 2 * frame.z + 1.4), rust, [5, frame.top - 1.1, 0]);
for (let i = 0; i < 8; i++) {
  const z = -28 + i * 8;
  const drop = 6 + (i % 2) * 2;
  // Each cable starts 0.4 inside the rail and ends on its drum's top, where
  // the drum always hung: the rail's 0.9 rise is the cable's.
  const cable = drop + 0.9;
  add(root, `drum_cable_${i}`, cyl(0.15, 0.15, cable, 5), black, [5, frame.top - 1.1 - cable / 2, z]);
  add(root, `hydrophone_drum_${i}`, cyl(1.5, 1.5, 3.2, 10), rust, [5, frame.top - 2 - drop - 1.6, z]);
}
// The cradle lamp rides *above* the rail: a top-down bake sees plan area only.
// Its stay runs from the rail's top (frame.top − 0.7) to the lamp's
// underside (frame.top + 1.2); the first cut's stopped at frame.top, with
// 1.6 m of water under its foot (#894).
add(root, 'cradle_lamp', box(14, 1.0, 5), flood, [5, frame.top + 1.7, 0]);
add(root, 'cradle_lamp_stay', box(0.6, 1.9, 0.6), grey, [5, frame.top + 0.25, 0]);

// The machinery house aft of the frame, and the pile hammer stowed against a leg.
// The house stands 9 m tall from y 5.5, so the slab (top at DEPTH) buries all
// but 3.5 m of it and the roof's underside is at 14.3. The louvred hood a side
// stands on that exposed wall: the top blade's centre on the eave line
// (beam/2 + 0.5) so its outer edge shows past it, each blade below half a
// metre further out, and the well raked from the deck up to the wall under
// them, 1.8 m thick so it reaches the deck/wall corner 1.73 m under its
// face (header).
bathyarch.machineryHouse(root, { black, grey, rust, amber, vent, flood }, {
  x: -24, y: 10, length: 22, height: 9, beam: 26, stack: { x: -30, y: 20, z: 6 },
  louvres: {
    count: 5, y: DEPTH + 0.4, pitch: 0.6, z: 13.5, step: 0.5, tilt: 0.611, blade: [0.15, 0.9],
    deck: DEPTH, well: { t: 1.8 },
  },
});
// "Head down": the head stands on the slab's top and the shaft rises from
// it to where it always reached (header).
add(root, 'hammer_shaft', box(1.2, 10, 1.2), grey, [-6.5, 19, 30]);
add(root, 'hammer_head', box(3.6, 3, 3.6), rust, [-6.5, DEPTH + 1.5, 30]);

// The deck floods: on the slab's top, which is DEPTH and not DECK (header).
bathyarch.deckFloods(root, lampM, {
  deck: DEPTH,
  spots: [[24, 16], [24, -16], [-42, 16], [-42, -16], [48, 14], [48, -14]],
});
// The bridge ports: boxes from the house's forward face (x -13) out past the
// roof's eave (x -12.5) by 0.6, a metre and a half up the exposed wall (header).
bothSides((side, sgn) => {
  for (let i = 0; i < 2; i++)
    add(root, `bridge_port_${side}${i}`, box(1.1, 1.2, 2.2), lampM, [-12.45, 12.6, sgn * (2.5 + i * 5)]);
});

await exportGlb(root, 'derrick-bathyarch.glb');
