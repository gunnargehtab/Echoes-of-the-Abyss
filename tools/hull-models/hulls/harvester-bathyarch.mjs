/**
 * The Harvester, the Klaxon's — 75 m (docs/units.md; the Harvester block of
 * docs/asset-prompts-3d.md Block 3, read with the Bathyarch FACTION block).
 *
 * "Industrial nodule-mining vessel (SIG 18 idle; mining follows the
 * throttle, up to 68 at Overdrive). Wide cargo body, external intake dredge
 * gear; dim at rest, with floodlit mining machinery that reads as its loud
 * state" — said the Klaxon's way: "boxy, riveted, over-engineered
 * rectangles and cylinders". A barge of a hull with a gunwale a side and
 * one across the stern, a deck plate and a skid a side; a square apron of a
 * bow drawn wide; two cargo holds of four walls with a hazard stripe down
 * each side wall and a divider between; a ballast blister a side, capped
 * forward and strapped twice; the dredge — a bucket wheel of eight buckets
 * on two arms and an axle frame ahead of the bow, a conveyor of four ribs
 * on two legs climbing to the crusher house, its roof, chute, patch, two
 * vents and a stencil; the cab aft with its top and visor, a stack and its
 * band, a mast and its lamp; a pipe and a riser a side; five patches; forty
 * rivets in four ranks; and three markers a side, one at the bow and one at
 * the stern, which is the whole resting light of a hull that idles at SIG 18.
 *
 * A port of the approved export
 * (docs/concept-art/models/harvester-bathyarch.glb at 3e15409), part for
 * part in its order, every number the export's own, read off parts.mjs.
 * Every part comes from `factions/bathyarch.mjs` or is a kit box. Nothing
 * here is a shape decision; where the export is odd the script is odd with
 * it:
 *
 * - The `_p` parts sit at the export's +x, which is the kit's -z once the
 *   file is turned onto its length — port (#642); the names and the sides
 *   agree and stay.
 * - The bow apron is the scout's square wedge drawn 2.6 times as wide as it
 *   is tall and 4.96 long — the export's number, not a round one.
 * - The ballast blisters are capped forward only. The port pipe is rust and
 *   the starboard one hull black; the risers are one rust, one black, at
 *   stations 20 apart. The patches alternate rust and hull black a side and
 *   are four different sizes; the deck patch is rust.
 * - The two crusher vents are different radii and heights, one rust and one
 *   black, neither on the centreline. The stack stands to port of the cab
 *   and the mast to starboard.
 * - The rivets are hull black, eleven a rank on the gunwale and nine a rank
 *   on the hull. The eight buckets are eight boxes in the file, not one
 *   shared.
 * - The mast lamp is the one lamp the audit sees whole from above. The six
 *   flank markers sit under the gunwales' plan and the bow marker under the
 *   apron's, and the stern marker is a third of a metre deep on the transom,
 *   under the audit's cell; so the export warns on all eight, as the approved
 *   bake never saw them either.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 69.11 units long — the first bucket's face
 * to the stern marker's after face, with no turned box overhanging either
 * end — the hull axis at y = 4.5, the barge hull's; built here metre-true at
 * 75 m along +X, centred on its length, the axis at y = 0. Every number
 * below is the export's, through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 75;
const DRAWN = 69.11;
const DATUM = 4.5;

const grey = bathyarch.scoutInk.ironGrey();
const black = bathyarch.scoutInk.hullBlack();
const amber = bathyarch.scoutInk.hazardAmber();
const rust = bathyarch.scoutInk.oxideRust();
const lamp = bathyarch.scoutInk.amberLamp();

const root = new THREE.Group();
root.name = 'consortium_harvester';
const bar = (name, mat, size, t, e) => part(root, name, box(...size), mat, drawn(t, e));
const { ALONG_KEEL } = bathyarch;

// The barge: the hull, a gunwale a side and one across the stern, the deck
// plate, a keel skid a side, and the apron of a bow drawn wide.
bar('barge_hull', grey, [22, 7, 52], [0, 4.5, -8]);
bar('gunwale_p', black, [1.2, 1.6, 52], [10.6, 8.6, -8]);
bar('gunwale_s', black, [1.2, 1.6, 52], [-10.6, 8.6, -8]);
bar('gunwale_aft', black, [22, 1.6, 1.2], [0, 8.6, -33.5]);
bar('deck_plate', black, [20, 0.4, 50], [0, 8.1, -8]);
bar('keel_skid_p', black, [1.6, 1.4, 44], [7.5, 0.9, -8]);
bar('keel_skid_s', black, [1.6, 1.4, 44], [-7.5, 0.9, -8]);
bathyarch.squareWedge(root, grey, {
  name: 'bow_apron',
  radii: [1.4, 7.8],
  length: 4.96,
  squash: [2.6, 1],
  ...drawn([0, 4.4, 22]),
});

// "Wide cargo body": two holds and the divider between them.
const HOLD = {
  y: 9.6,
  side: { x: 7.78, size: [0.95, 2.6, 15.5] },
  ends: { reach: 7.28, size: [16.5, 2.6, 0.95] },
  stripe: { x: 8.31, size: [0.12, 1.2, 15.5] },
};
bathyarch.cargoHold(root, { grey, amber }, { tag: 'fwd', z: -1, ...HOLD });
bathyarch.cargoHold(root, { grey, amber }, { tag: 'aft', z: -19, ...HOLD });
bar('hold_divider', grey, [16.5, 2.6, 2.4], [0, 9.6, -10]);

// A ballast blister a side, capped forward only and strapped twice.
bathyarch.ballastPair(
  root,
  { blister: black, cap: rust, strap: grey },
  {
    x: 11.9,
    y: 3.4,
    z: -8,
    r: 1.7,
    length: 34,
    facets: 20,
    cap: { z: 10, length: 2, tipR: 1 },
    straps: { size: [0.5, 4.4, 0.9], y: 5.2, z: [-1, -17] },
  }
);

// "External intake dredge gear": the bucket wheel ahead of the bow on its
// two arms and axle frame, and the conveyor up to the crusher.
bathyarch.bucketWheel(
  root,
  { black, rust, grey },
  {
    at: [0, 3.4, 29.5],
    wheel: { r: 4.2, width: 3.4 },
    hub: { r: 1.1, width: 4.4 },
    buckets: { count: 8, r: 4.6, size: [2.6, 1.5, 1.7] },
  }
);
bar('dredge_arm_p', grey, [1.1, 1.6, 9], [2.2, 5.2, 25], [-0.25, 0, 0]);
bar('dredge_arm_s', grey, [1.1, 1.6, 9], [-2.2, 5.2, 25], [-0.25, 0, 0]);
bar('dredge_axle_frame', rust, [6.2, 1.2, 1.2], [0, 6.4, 29.5]);
bathyarch.conveyor(
  root,
  { black, grey, rust },
  {
    ramp: { size: [5.4, 0.9, 16], at: [0, 8.6, 16], pitch: -0.34 },
    rails: { size: [0.5, 1.4, 16], x: 2.95, y: 8.9, z: 16 },
    ribs: { count: 4, size: [6.4, 0.5, 0.7], y: 7.35, z: 21.7, rise: 1.32, run: -3.8 },
    legs: { size: [0.7, 4.5, 0.7], x: 2.6, y: 5.5, z: 10.5 },
  }
);

// The crusher house: roof, the chute pitched down its face, a patch, two
// vents of their own sizes and plate, and a stencil.
bar('crusher_house', grey, [9, 6.5, 7], [0, 11.5, 6.5]);
bar('crusher_roof', black, [9.8, 0.6, 7.8], [0, 15.1, 6.5]);
bar('crusher_chute', black, [3.2, 3.2, 1.4], [0, 10.4, 10.6], [0.5, 0, 0]);
bar('crusher_patch', rust, [0.16, 3.4, 4.2], [4.58, 11.2, 6.2]);
bathyarch.drum(root, rust, {
  name: 'crusher_vent_a',
  radii: [0.5, 0.5],
  length: 2.6,
  facets: 10,
  ...drawn([2.8, 16.2, 5]),
});
bathyarch.drum(root, black, {
  name: 'crusher_vent_b',
  radii: [0.7, 0.7],
  length: 3.4,
  facets: 10,
  ...drawn([-2.6, 16.4, 7.5]),
});
bar('crusher_stencil', amber, [2.6, 0.9, 0.1], [0, 12.6, 10.02]);

// The cab aft: base, top and visor, the stack and its band to port, the
// mast and its lamp to starboard.
bar('cab_base', grey, [7, 3, 5], [0, 10.6, -29]);
bar('cab_top', black, [5, 2.2, 3.4], [0, 13.2, -29.5]);
bar('cab_visor', grey, [5.4, 0.5, 4], [0, 14.5, -29.5]);
bathyarch.drum(root, rust, {
  name: 'stack',
  radii: [0.9, 1.1],
  length: 5,
  facets: 12,
  ...drawn([2.4, 14, -32.5]),
});
bathyarch.drum(root, amber, {
  name: 'stack_band',
  radii: [1, 1],
  length: 0.6,
  facets: 12,
  ...drawn([2.4, 15.6, -32.5]),
});
bathyarch.whips(root, grey, { whips: [['mast', 0.18, 3.6, drawn([-1.8, 16.5, -30.5])]] });
bar('mast_lamp', lamp, [0.5, 0.5, 0.5], [-1.8, 18.5, -30.5]);

// A pipe a side along the deck edge in its own plate, and a riser off each
// at its own station.
bathyarch.drum(root, rust, {
  name: 'pipe_p',
  radii: [0.4, 0.4],
  length: 40,
  facets: 12,
  ...drawn([9.4, 8.7, -6], ALONG_KEEL),
});
bathyarch.drum(root, black, {
  name: 'pipe_s',
  radii: [0.4, 0.4],
  length: 40,
  facets: 12,
  ...drawn([-9.4, 8.7, -6], ALONG_KEEL),
});
bathyarch.drum(root, rust, {
  name: 'pipe_riser_p',
  radii: [0.35, 0.35],
  length: 3,
  facets: 10,
  ...drawn([9.4, 10, 6]),
});
bathyarch.drum(root, black, {
  name: 'pipe_riser_s',
  radii: [0.35, 0.35],
  length: 3,
  facets: 10,
  ...drawn([-9.4, 10, -14]),
});

// The patchwork: two a side, older and newer plate, and one on the deck.
bar('patch_p1', rust, [0.16, 4.2, 7], [11.08, 4.6, 2]);
bar('patch_p2', black, [0.16, 3, 4.4], [11.08, 5.4, -20]);
bar('patch_s1', rust, [0.16, 5, 6], [-11.08, 4.2, -12]);
bar('patch_s2', black, [0.16, 2.6, 3.6], [-11.08, 3.4, 4]);
bar('patch_deck', rust, [4.6, 0.14, 6], [-6.5, 8.32, 8]);

// Forty rivets numbered straight through: eleven a side along the gunwale,
// then nine a side along the hull, port rank first each time.
const GUNWALE = [-30, -25.6, -21.2, -16.8, -12.4, -8, -3.6, 0.8, 5.2, 9.6, 14];
const HULL_LINE = [-26, -21.6, -17.2, -12.8, -8.4, -4, 0.4, 4.8, 9.2];
bathyarch.flankRivets(root, black, {
  size: 0.24,
  running: true,
  rows: [
    { z: -11.09, y: 7.4, stations: GUNWALE },
    { z: 11.09, y: 7.4, stations: GUNWALE },
    { z: -11.09, y: 1.8, stations: HULL_LINE },
    { z: 11.09, y: 1.8, stations: HULL_LINE },
  ],
});

// "Dim at rest": three markers a side along the gunwale, one at the bow and
// one at the stern.
const MARKS = [-26, -10, 6];
bathyarch.runningLights(root, lamp, {
  name: 'marker',
  size: [0.32, 0.32, 0.7],
  y: 7.6,
  rows: [
    { side: 'p', z: -11.15, stations: MARKS },
    { side: 's', z: 11.15, stations: MARKS },
  ],
});
bar('marker_bow', lamp, [0.7, 0.32, 0.32], [0, 8.5, 24.2]);
bar('marker_stern', lamp, [0.7, 0.32, 0.32], [0, 9.7, -34]);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'harvester-bathyarch.glb');
