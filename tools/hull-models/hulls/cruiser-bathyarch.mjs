/**
 * The Cruiser, the Klaxon's — 130 m (docs/units.md; the Cruiser block of
 * docs/asset-prompts-3d.md Block 3, read with the Bathyarch FACTION block).
 *
 * "Heavy fleet anchor and command vessel (SIG 55 sustained with systems
 * live). Large layered hull, prominent sensor arrays and fixed hydrophone
 * masts; sustained glow from vents, sensor arrays and lit ports — this is a
 * loud ship and it looks it" — said the Klaxon's way: "boxy, riveted,
 * over-engineered rectangles and cylinders". Two twenty-eight-sided pressure
 * cylinders side by side, capped forward, under three tiers of box hull each
 * with its deck plate, and a keel skid a side; a square wedge drawn wide, a
 * boxed ram and a rank of teeth for a bow; eight armour plates; a ballast
 * blister a side; two pipes a side and two risers; the citadel, its top and
 * visor, and the lit band round it; two lattice sensor towers with a
 * floodlight flat on each, the dish on its boom over the forward one and
 * three hydrophones in a frame over the after one; a torpedo rack of three
 * a side; two shrouded three-bladed screws in a stern block with four engine
 * vents and a rudder; three lit lines a side and one across the stern;
 * twenty rivets; three stencils; and the mast lamp.
 *
 * A port of the approved export
 * (docs/concept-art/models/cruiser-bathyarch.glb at 3e15409), part for
 * part in its order, every number the export's own, read off parts.mjs.
 * Every part comes from `factions/bathyarch.mjs` or is a kit box. Nothing
 * here is a shape decision; where the export is odd the script is odd with
 * it:
 *
 * - The `_p` parts sit at the export's +x, which is the kit's -z once the
 *   file is turned onto its length — port (#642); the names and the sides
 *   agree and stay.
 * - The bow wedge is the scout's square wedge drawn 1.9 times as wide as it
 *   is tall. The pressure caps are rust, and there are none aft; the ballast
 *   blisters are capped forward only.
 * - No armour plate matches its opposite in size, station or plate: three a
 *   side on the lower hull in grey, black and rust, and one a side on the
 *   middle tier, port rust and starboard black. The low pipes are port rust
 *   and starboard black, the mid pipes the other way round, and the risers
 *   one rust to port at −30 and one black to starboard at 14.
 * - The twenty rivets are four ranks that agree in nothing: six to port at
 *   y 5.4 from 12 to 30, six to starboard at 4.6 from 0 to 18, four to port
 *   aft at 6.2, four to starboard at 5.8.
 * - The four engine vents sit two a side in the quarter, not in a rank
 *   across the transom; they are the one part in `cruiserInk.amberVent`,
 *   the export's own vent at 2.2, which is not `ink.amberVent`.
 * - The dish is pitched 2.2 rad on its boom, so its face looks forward and
 *   down. Both hubs taper forward, narrow end to the bow; each screw's three
 *   blades are three boxes in the file, not one shared.
 * - Of the lamps, the two tower floodlights, the stern line and the mast
 *   lamp face up; the bridge band is under the citadel top, the four engine
 *   vents are on the quarters' vertical faces and the six flank light lines
 *   under their deck plates, so the export warns on those eleven, as the
 *   approved bake never saw them either.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 107.50 units long — the ram's face to the
 * after ends of the two pressure cylinders, which reach a tenth past the
 * hubs, with no turned box overhanging either end — the hull axis at y = 5,
 * the pressure cylinders'; built here metre-true at 130 m along +X, centred
 * on its length, the axis at y = 0. Every number below is the export's,
 * through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 130;
const DRAWN = 107.5;
const DATUM = 5;

const black = bathyarch.scoutInk.hullBlack();
const rust = bathyarch.scoutInk.oxideRust();
const grey = bathyarch.scoutInk.ironGrey();
const amber = bathyarch.scoutInk.hazardAmber();
const lamp = bathyarch.scoutInk.amberLamp();
const vent = bathyarch.cruiserInk.amberVent();

const root = new THREE.Group();
root.name = 'consortium_cruiser';
const bar = (name, mat, size, t, e) => part(root, name, box(...size), mat, drawn(t, e));
const { ALONG_KEEL } = bathyarch;

// The pressure vessels: two cylinders side by side, each capped forward in
// older plate; then the three tiers of hull, a deck plate on each, and a
// keel skid a side.
bathyarch.drum(root, black, {
  name: 'pressure_cyl_p',
  radii: [3.6, 3.6],
  length: 92,
  facets: 28,
  ...drawn([4.4, 5, -6], ALONG_KEEL),
});
bathyarch.drum(root, black, {
  name: 'pressure_cyl_s',
  radii: [3.6, 3.6],
  length: 92,
  facets: 28,
  ...drawn([-4.4, 5, -6], ALONG_KEEL),
});
bathyarch.drum(root, rust, {
  name: 'pressure_cap_pf',
  radii: [2.6, 3.6],
  length: 3,
  facets: 28,
  ...drawn([4.4, 5, 41.5], ALONG_KEEL),
});
bathyarch.drum(root, rust, {
  name: 'pressure_cap_sf',
  radii: [2.6, 3.6],
  length: 3,
  facets: 28,
  ...drawn([-4.4, 5, 41.5], ALONG_KEEL),
});
bar('hull_lower', grey, [17, 7, 84], [0, 5, -6]);
bar('hull_mid', grey, [14, 5, 62], [0, 10.9, -8]);
bar('hull_upper', grey, [10.5, 4.2, 38], [0, 15.4, -10]);
bar('deck_lower', black, [17.4, 0.5, 85], [0, 8.6, -6]);
bar('deck_mid', black, [14.4, 0.5, 63], [0, 13.5, -8]);
bar('deck_upper', black, [10.9, 0.5, 39], [0, 17.6, -10]);
bar('keel_skid_p', black, [1.6, 1.6, 70], [5.5, 0.9, -6]);
bar('keel_skid_s', black, [1.6, 1.6, 70], [-5.5, 0.9, -6]);

// The bow: the wedge drawn wide, the ram box on its point, the teeth across
// its root.
bathyarch.squareWedge(root, grey, {
  name: 'bow_wedge',
  radii: [1.4, 6.4],
  length: 16,
  squash: [1.9, 1],
  ...drawn([0, 5.2, 44]),
});
bar('bow_ram', rust, [2.2, 2.2, 5], [0, 3.8, 53]);
bar('bow_teeth', black, [9, 1.4, 1.4], [0, 7.6, 38.5]);

// The armour: three plates a side on the lower hull and one a side on the
// middle tier, older under newer, none the size of its opposite.
bar('armor_p1', grey, [0.36, 4.6, 22], [8.68, 5.4, 18]);
bar('armor_p2', black, [0.36, 3.6, 16], [8.72, 4.2, -6]);
bar('armor_p3', rust, [0.36, 4.2, 14], [8.68, 6.2, -28]);
bar('armor_s1', grey, [0.36, 4.6, 26], [-8.68, 4.6, 8]);
bar('armor_s2', rust, [0.36, 3.8, 12], [-8.72, 5.8, -18]);
bar('armor_s3', black, [0.36, 3, 10], [-8.68, 3.4, -34]);
bar('armor_m_p', rust, [0.36, 3, 14], [7.18, 11.4, 4]);
bar('armor_m_s', black, [0.36, 3.2, 18], [-7.18, 10.4, -16]);

// A ballast blister a side, capped forward only.
bathyarch.ballastPair(
  root,
  { blister: grey, cap: rust },
  { x: 9.6, y: 3.2, z: -10, r: 1.5, length: 40, facets: 18, cap: { z: 10.9, length: 1.8, tipR: 0.9 } }
);

// Pipes: a low run and a mid run a side, each pair in opposite plate, and a
// riser a side at its own station.
bathyarch.drum(root, rust, {
  name: 'pipe_low_p',
  radii: [0.35, 0.35],
  length: 60,
  facets: 12,
  ...drawn([7.8, 8.9, -4], ALONG_KEEL),
});
bathyarch.drum(root, black, {
  name: 'pipe_low_s',
  radii: [0.35, 0.35],
  length: 60,
  facets: 12,
  ...drawn([-7.8, 8.9, -4], ALONG_KEEL),
});
bathyarch.drum(root, black, {
  name: 'pipe_mid_p',
  radii: [0.3, 0.3],
  length: 40,
  facets: 12,
  ...drawn([6.4, 13.8, -8], ALONG_KEEL),
});
bathyarch.drum(root, rust, {
  name: 'pipe_mid_s',
  radii: [0.3, 0.3],
  length: 40,
  facets: 12,
  ...drawn([-6.4, 13.8, -8], ALONG_KEEL),
});
bathyarch.drum(root, rust, {
  name: 'pipe_riser_a',
  radii: [0.3, 0.3],
  length: 4.6,
  facets: 10,
  ...drawn([7.8, 11.2, -30]),
});
bathyarch.drum(root, black, {
  name: 'pipe_riser_b',
  radii: [0.3, 0.3],
  length: 4.6,
  facets: 10,
  ...drawn([-7.8, 11.2, 14]),
});

// The citadel on the upper tier: the block, its top and visor, and the lit
// band round it — "lit ports", the Klaxon's way.
bar('citadel', grey, [7.5, 4, 12], [0, 19.8, -4]);
bar('citadel_top', black, [5.5, 2.6, 8], [0, 23.1, -5]);
bar('citadel_visor', grey, [6.1, 0.6, 9], [0, 24.7, -5]);
bar('bridge_band', lamp, [7.54, 0.9, 10], [0, 20.6, -4]);

// "Prominent sensor arrays and fixed hydrophone masts": a lattice tower
// forward with the dish on its boom, and one aft with three hydrophones in
// a frame; a floodlight flat on each platform.
bathyarch.sensorTower(
  root,
  { grey, rust, lampM: lamp },
  {
    tag: 'fwd',
    z: 8,
    legs: { x: 1.6, y: 22.1, reach: 1.6, size: [0.42, 9, 0.42] },
    braces: { lo: { y: 20.75, size: [3.9, 0.5, 3.9] }, hi: { y: 23.9, size: [3.6, 0.5, 3.6] } },
    platform: { y: 26.6, size: [5, 0.7, 5] },
    flood: { y: 27.08, size: [4.2, 0.25, 4.2] },
  }
);
bathyarch.sensorTower(
  root,
  { grey, rust, lampM: lamp },
  {
    tag: 'aft',
    z: -34,
    legs: { x: 1.6, y: 19.5, reach: 1.6, size: [0.42, 12, 0.42] },
    braces: { lo: { y: 17.7, size: [3.9, 0.5, 3.9] }, hi: { y: 21.9, size: [3.6, 0.5, 3.6] } },
    platform: { y: 25.5, size: [5, 0.7, 5] },
    flood: { y: 25.98, size: [4.2, 0.25, 4.2] },
  }
);
bathyarch.drum(root, grey, {
  name: 'dish',
  radii: [2.6, 0.6],
  length: 1.1,
  facets: 16,
  ...drawn([0, 28.6, 9.6], [2.2, 0, 0]),
});
bar('dish_boom', black, [0.5, 0.5, 3], [0, 27.6, 8.6]);
bathyarch.whips(root, black, {
  facets: 10,
  whips: [
    ['hydrophone_0', 0.45, 3.2, drawn([-1.2, 24.6, -34])],
    ['hydrophone_1', 0.45, 3.2, drawn([0, 24.6, -34])],
    ['hydrophone_2', 0.45, 3.2, drawn([1.2, 24.6, -34])],
  ],
});
bar('hydro_frame', rust, [4.4, 0.5, 1.2], [0, 26.4, -34]);

// A torpedo rack of three a side, no collars.
bathyarch.torpedoRacks(
  root,
  { frame: black, tube: black },
  {
    racks: [
      { tag: 'p', side: 1, z: 24 },
      { tag: 's', side: -1, z: 24 },
    ],
    frame: { x: 8.75, y: 5.2, size: [0.5, 2.8, 12.5] },
    tubes: [
      [9.35, 4],
      [9.35, 5.3],
      [9.35, 6.6],
    ],
    tube: { r: 0.6, length: 11, facets: 14 },
    tubeName: (tag, i) => `torp_${tag}${i}`,
  }
);

// Two screws, port then starboard: the shroud, the hub tapering forward,
// three blades a box each; then the stern block, the four engine vents in
// the quarters, and the rudder.
for (const [side, x] of [
  ['p', 4.4],
  ['s', -4.4],
]) {
  bathyarch.shroud(root, grey, {
    name: `prop_shroud_${side}`,
    R: 2.7,
    tube: 0.6,
    facets: [12, 24],
    ...drawn([x, 5, -50.5]),
  });
  bathyarch.drum(root, black, {
    name: `prop_hub_${side}`,
    radii: [0.55, 1.2],
    length: 2.8,
    facets: 14,
    ...drawn([x, 5, -50.5], ALONG_KEEL),
  });
  bathyarch.screwBlades(root, black, {
    side,
    size: [0.28, 4.4, 1],
    at: drawn([x, 5, -50.7]).at,
    shared: false,
  });
}
bar('stern_block', black, [13, 5.5, 6], [0, 5.4, -46]);
bathyarch.engineVents(root, vent, {
  size: [0.5, 2.8, 3.2],
  at: [
    [8.55, 6.2, -36],
    [8.55, 6.2, -42],
    [-8.55, 6.2, -36],
    [-8.55, 6.2, -42],
  ],
});
bar('rudder', grey, [0.5, 5.5, 4.4], [0, 9.5, -49]);

// "This is a loud ship and it looks it": a lit line along each tier a side
// and one across the stern.
bathyarch.lightLines(root, lamp, {
  lines: [
    { tag: 'low', x: 8.53, y: 7.3, z: -6, size: [0.18, 0.5, 76] },
    { tag: 'mid', x: 7.03, y: 12.4, z: -8, size: [0.18, 0.5, 54] },
    { tag: 'up', x: 5.28, y: 16.6, z: -10, size: [0.18, 0.5, 32] },
  ],
  stern: { size: [11, 0.5, 0.18], at: [0, 7.3, -48.95] },
});

// Twenty rivets numbered straight through, four ranks that agree in nothing.
bathyarch.flankRivets(root, black, {
  size: 0.26,
  running: true,
  rows: [
    { z: -8.87, y: 5.4, stations: [12, 15.6, 19.2, 22.8, 26.4, 30] },
    { z: 8.87, y: 4.6, stations: [0, 3.6, 7.2, 10.8, 14.4, 18] },
    { z: -8.87, y: 6.2, stations: [-33, -29.6, -26.2, -22.8] },
    { z: 8.87, y: 5.8, stations: [-22, -18.6, -15.2, -11.8] },
  ],
});

// Hazard stencils on the bow flanks and the transom, and the mast lamp over
// the dish.
bar('stencil_bow_p', amber, [0.1, 1.4, 3.4], [6.55, 5.6, 34]);
bar('stencil_bow_s', amber, [0.1, 1.4, 3.4], [-6.55, 5.6, 34]);
bar('stencil_stern', amber, [3.4, 1.2, 0.1], [0, 4.4, -49.05]);
bar('mast_lamp', lamp, [0.6, 0.6, 0.6], [0, 30.2, 9.6]);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'cruiser-bathyarch.glb');
