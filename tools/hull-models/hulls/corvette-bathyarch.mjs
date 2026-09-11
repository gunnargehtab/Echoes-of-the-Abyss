/**
 * The Corvette, the Klaxon's — 80 m (docs/units.md; the Corvette block of
 * docs/asset-prompts-3d.md Block 3, read with the Bathyarch FACTION block).
 *
 * "Small fast-attack skirmisher (SIG 28 cruise). Compact aggressive
 * silhouette, visible torpedo hardpoints; dim accent running lights along
 * the hull line" — said the Klaxon's way: "boxy, riveted, over-engineered
 * rectangles and cylinders; no curve unless a pressure vessel demanded it.
 * Visibly patchworked repairs". A twenty-eight-sided pressure cylinder
 * capped both ends and boxed over amidships, forward and aft; a square
 * wedge and a boxed ram for a bow; a deck plate and a skid a side; six
 * patches; a tower of three boxes with two masts and a lamp; a ballast
 * blister a side; two deck pipes and two risers; four torpedo racks of three
 * tubes with a collar fore and aft of every tube; a shrouded three-bladed
 * screw and a rudder; thirty-four rivets in four ranks; three hazard
 * stencils; and six running lights a side, a stern light and a bow light,
 * which is the whole resting light of a hull that cruises at SIG 28.
 *
 * A port of the approved export
 * (docs/concept-art/models/corvette-bathyarch.glb at 3e15409), part for
 * part in its order, every number the export's own, read off parts.mjs.
 * Every part comes from `factions/bathyarch.mjs` or is a kit box. Nothing
 * here is a shape decision; where the export is odd the script is odd with
 * it:
 *
 * - The `_p` parts sit at the export's +x, which is the kit's -z once the
 *   file is turned onto its length — port (#642); the names and the sides
 *   agree and stay.
 * - The patchwork is lopsided: two patches to port, three to starboard, one
 *   on the deck, and the two named `patch_iron_*` are hull black, not grey.
 * - The ballast blisters are capped forward only.
 * - The port deck pipe is rust and the starboard one hull black, and they
 *   do not sit at the same station (0 and 2); the two risers are likewise
 *   one rust, one black, at their own heights. The rivets are hull black,
 *   nine a rank on the deck edge and eight a rank on the hull.
 * - The screw's hub tapers forward, narrow end to the bow, as the scout's
 *   does; its three blades are three boxes in the file, not one shared.
 * - The mast lamp, the running lights and the stern and bow lights are the
 *   lamps; the two bow stencils and the tower stencil are paint. Only the
 *   mast lamp reaches the audit's floor from above: the running lights sit
 *   on the flanks and the stern and bow lights are 0.15 m² in plan, so the
 *   export warns on all fourteen, as the approved bake never saw them either.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 78.40 units long — the ram's face to the
 * hub's after face, with no turned box overhanging either end — the hull
 * axis at y = 4.5, the pressure cylinder's; built here metre-true at 80 m
 * along +X, centred on its length, the axis at y = 0. Every number below is
 * the export's, through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 80;
const DRAWN = 78.4;
const DATUM = 4.5;

const black = bathyarch.scoutInk.hullBlack();
const grey = bathyarch.scoutInk.ironGrey();
const rust = bathyarch.scoutInk.oxideRust();
const amber = bathyarch.scoutInk.hazardAmber();
const lamp = bathyarch.scoutInk.amberLamp();

const root = new THREE.Group();
root.name = 'consortium_corvette';
const bar = (name, mat, size, t, e) => part(root, name, box(...size), mat, drawn(t, e));
const { ALONG_KEEL } = bathyarch;

// The pressure vessel: the cylinder, a cap drawn in at each end, and the
// three boxes over it — amidships, forward, aft.
bathyarch.drum(root, black, {
  name: 'pressure_cylinder',
  radii: [3.4, 3.4],
  length: 56,
  facets: 28,
  ...drawn([0, 4.5, -1], ALONG_KEEL),
});
bathyarch.drum(root, black, {
  name: 'pressure_cap_fwd',
  radii: [2.6, 3.4],
  length: 2.4,
  facets: 28,
  ...drawn([0, 4.5, 28.2], ALONG_KEEL),
});
bathyarch.drum(root, black, {
  name: 'pressure_cap_aft',
  radii: [3.4, 2.6],
  length: 2.4,
  facets: 28,
  ...drawn([0, 4.5, -30.2], ALONG_KEEL),
});
bar('hull_mid', grey, [10, 6, 38], [0, 4.5, 1]);
bar('hull_fore', grey, [8.2, 5.2, 14], [0, 4.6, 27]);
bar('hull_aft', grey, [9, 5.6, 10], [0, 4.5, -23]);

// The bow: a square wedge and the ram box on its point; the deck plate and
// a keel skid a side.
bathyarch.squareWedge(root, grey, {
  name: 'bow_wedge',
  radii: [0.9, 4.4],
  length: 11,
  ...drawn([0, 4.6, 39.5]),
});
bar('bow_ram', rust, [1.4, 1.4, 4], [0, 3.6, 44.6]);
bar('deck_plate', black, [10.4, 0.5, 39], [0, 7.7, 1]);
bar('keel_skid_p', black, [1, 1.2, 34], [3.4, 1, 0]);
bar('keel_skid_s', black, [1, 1.2, 34], [-3.4, 1, 0]);

// The patchwork: two to port, three to starboard, one on the deck — the
// "iron" ones in hull black, the export's own.
bar('patch_oxide_p1', rust, [0.16, 5.5, 4.2], [5.08, 5.4, 8]);
bar('patch_oxide_s1', rust, [0.16, 4.6, 5], [-5.08, 4, -6]);
bar('patch_iron_p2', black, [0.16, 3.2, 3], [5.08, 3.4, 14]);
bar('patch_oxide_s2', rust, [0.16, 2.6, 3.4], [-5.08, 5.8, 12]);
bar('patch_iron_s3', black, [0.16, 2.8, 4.4], [-5.08, 3, 2]);
bar('patch_oxide_top', rust, [3.6, 0.16, 5], [1.8, 7.98, -8]);

// The tower: base, cab and cap, two masts of their own heights off the
// centreline each its own way, and the lamp on the taller.
bar('tower_base', grey, [5, 2.6, 8.5], [0, 9.2, 4]);
bar('tower_cab', black, [3.6, 2.2, 5], [0, 11.5, 3.4]);
bar('tower_cap', grey, [4.2, 0.5, 5.6], [0, 12.8, 3.4]);
bathyarch.whips(root, grey, {
  facets: 10,
  whips: [
    ['mast_a', 0.2, 3.4, drawn([0.9, 14.5, 2.2])],
    ['mast_b', 0.15, 2.4, drawn([-1.1, 14, 4.4])],
  ],
});
bar('mast_lamp', lamp, [0.5, 0.5, 0.5], [0.9, 16.3, 2.2]);

// A ballast blister a side, capped forward only.
bathyarch.ballastPair(
  root,
  { blister: grey, cap: rust },
  { x: 5.6, y: 2.6, z: -2, r: 1.15, length: 26, facets: 18, cap: { z: 11.8, length: 1.6, tipR: 0.7 } }
);

// Deck pipes, one a side in its own plate and at its own station, and the
// two risers off them.
bathyarch.drum(root, rust, {
  name: 'pipe_deck_p',
  radii: [0.28, 0.28],
  length: 30,
  facets: 12,
  ...drawn([4.6, 8.1, 0], ALONG_KEEL),
});
bathyarch.drum(root, black, {
  name: 'pipe_deck_s',
  radii: [0.28, 0.28],
  length: 30,
  facets: 12,
  ...drawn([-4.6, 8.1, 2], ALONG_KEEL),
});
bathyarch.drum(root, rust, {
  name: 'pipe_riser_a',
  radii: [0.24, 0.24],
  length: 3.2,
  facets: 10,
  ...drawn([2.4, 9.4, -10]),
});
bathyarch.drum(root, black, {
  name: 'pipe_riser_b',
  radii: [0.24, 0.24],
  length: 2.6,
  facets: 10,
  ...drawn([-2.2, 9.1, -13]),
});

// "Visible torpedo hardpoints": four racks of three tubes, two a side, the
// middle tube of each standing a tenth further out, and a collar fore and
// aft of every tube.
bathyarch.torpedoRacks(
  root,
  { frame: grey, tube: grey, collar: rust },
  {
    racks: [
      { tag: 'p1', side: 1, z: 9 },
      { tag: 'p2', side: 1, z: -7 },
      { tag: 's1', side: -1, z: 9 },
      { tag: 's2', side: -1, z: -7 },
    ],
    frame: { x: 5.6, y: 5.6, size: [0.5, 2.6, 10.5] },
    tubes: [
      [6.3, 4.35],
      [6.4, 5.6],
      [6.3, 6.85],
    ],
    tube: { r: 0.55, length: 9.5, facets: 14 },
    collar: { r: 0.68, length: 0.5, stand: 3.6 },
  }
);

// The screw: the shroud, the hub tapering forward, three blades fanned a
// third of a turn apart — a box each in the file — and the rudder over it.
bathyarch.shroud(root, grey, { R: 2.5, tube: 0.55, facets: [12, 24], ...drawn([0, 4.5, -30.5]) });
bathyarch.drum(root, black, {
  name: 'prop_hub',
  radii: [0.5, 1.1],
  length: 2.6,
  facets: 14,
  ...drawn([0, 4.5, -30.5], ALONG_KEEL),
});
bathyarch.screwBlades(root, black, {
  size: [0.25, 4.2, 0.9],
  at: drawn([0, 4.5, -30.7]).at,
  shared: false,
});
bar('rudder', grey, [0.4, 4.6, 3.4], [0, 7.4, -28.5]);

// Thirty-four rivets numbered straight through: nine a side along the deck
// edge, then eight a side along the hull, port rank first each time.
const DECK_EDGE = [-16, -12, -8, -4, 0, 4, 8, 12, 16];
const HULL_LINE = [-14, -10, -6, -2, 2, 6, 10, 14];
bathyarch.flankRivets(root, black, {
  size: 0.22,
  running: true,
  rows: [
    { z: -5.09, y: 6.9, stations: DECK_EDGE },
    { z: 5.09, y: 6.9, stations: DECK_EDGE },
    { z: -5.09, y: 2.1, stations: HULL_LINE },
    { z: 5.09, y: 2.1, stations: HULL_LINE },
  ],
});

// Hazard stencils: one on each bow flank and one on the tower's face.
bar('stencil_bow_p', amber, [0.1, 1, 2.6], [4.12, 4.6, 30]);
bar('stencil_bow_s', amber, [0.1, 1, 2.6], [-4.12, 4.6, 30]);
bar('stencil_tower', amber, [2.2, 0.6, 0.1], [0, 9.4, 8.3]);

// "Dim accent running lights along the hull line": six a side, a stern light
// and a bow light.
const RUN = [-17, -10, -3, 4, 11, 18];
bathyarch.runningLights(root, lamp, {
  size: [0.28, 0.28, 0.6],
  y: 7.1,
  rows: [
    { side: 'p', z: -5.12, stations: RUN },
    { side: 's', z: 5.12, stations: RUN },
  ],
});
bar('sternlight', lamp, [0.5, 0.3, 0.3], [0, 8.3, -27.9]);
bar('bowlight', lamp, [0.3, 0.3, 0.5], [0, 6.2, 44.2]);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'corvette-bathyarch.glb');
