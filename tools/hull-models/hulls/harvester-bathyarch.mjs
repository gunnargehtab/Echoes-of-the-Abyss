/**
 * The Harvester, the Klaxon's — 75 m (docs/units.md; the Harvester block of
 * docs/asset-prompts-3d.md Block 3, read with the Bathyarch FACTION block).
 *
 * "Industrial nodule-mining vessel (SIG 18 idle; mining follows the
 * throttle, up to 68 at Overdrive). Wide cargo body, external intake dredge
 * gear; dim at rest — running lights or marks along the hull, the dredge
 * gear dark or marked no brighter — floodlit when it mines, the same lamps
 * brighter, which reads as its loud state" (as #893 amended it) — said the
 * Klaxon's way: "boxy, riveted, over-engineered
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
 * - The mast lamp is the one lamp the export showed whole from above. It
 *   hung the six flank markers on the hull just under the gunwales' outer
 *   lip, floated the bow marker over the apron's tip, and stood the stern
 *   marker as a third-of-a-metre dot on the after gunwale, so the audit
 *   warned on all eight; #890 moved them, and they are the one departure
 *   from the file (docs/models-plan.md §3.2 rule 5). All eight are the
 *   resting clause's — "dim at rest", the SIG 18 band's running marks — so
 *   each keeps its name, its material and its station and shows a top face
 *   to the bake:
 *   - `marker_p0..2`, `marker_s0..2`: a pad each on the gunwale's top,
 *     0.8 across, 0.32 tall and 1.2 long, at the file's three stations.
 *   - `marker_bow`: a pad laid on the apron's upper face at its tip,
 *     pitched to the face's 42° slope.
 *   - `marker_stern`: a pad on the after gunwale's top, its after face
 *     where the file's dot had it, 0.06 past the gunwale — that face is
 *     the drawn length's after end (`DRAWN` below), and holding it keeps
 *     the file metre-true at the same 69.11 and the outline's stern where
 *     it was.
 *
 *   The Harvester baked capped at ×64 before this — 1.2 m² of lamp on a
 *   75 m hull could not reach E(18) — and bakes under it now.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 69.11 units long — the first bucket's face
 * to the stern marker's after face, with no turned box overhanging either
 * end — the hull axis at y = 4.5, the barge hull's; built here metre-true at
 * 75 m along +X, centred on its length, the axis at y = 0. Every number
 * below is the export's, through kit.mjs `drawn`.
 *
 * FACETS (#919). The Klaxon's rule is one facet edge of 2.5 m (docs/asset-prompts-3d.md Block 2c; bathyarch.mjs `cut`),
 * asked at this file's scale, and the pass re-cut what was off it: the
 * ballast blisters and caps six at 1.8 m, where the export had twenty; the
 * dredge hub six at 1.2 m, where it had ten; the stack and its band, the
 * pipes, risers, crusher vents and mast six, where they were eight to
 * twelve. The dredge wheel's twelve at 4.6 m was the rule's already and is
 * asked of it now. 122 parts and 2,080 triangles become 122 and 1,672.
 *
 * PANELS (#919). The Klaxon's hull band is a median unlit part of 0.75–2 m
 * on a side from above (Block 2c; bathyarch.mjs `panels`), and this hull
 * read 2.6 m: a barge is a deck plate, two holds of four walls and a
 * gunwale a side, each four to twenty-seven metres on a side, and its
 * fittings were forty rivets too small to count. The pass laid thirty-one
 * fittings, thirty-seven parts, each seated on its plate (bathyarch.mjs `deckPlates`,
 * `plateSeams`, `deckHatches`): twenty-two patch plates of grey, rust and black,
 * 1.1–1.5 m on a side and 0.22 m proud — four along each gunwale top between
 * the markers, two on each hold floor, three on the divider, two on the
 * crusher roof round its vents, four on the foredeck either side of the
 * conveyor, one on the cab's visor beside its mast; three grey seam straps
 * 0.43 m wide across the hold floors and the foredeck; and six dogged
 * hatches, a 0.8 m coaming under a 0.55 m wheel at the rule's six, two down
 * through each hold floor to the barge hull, one on the foredeck and one on
 * the crusher roof. The forward hold's last 3.75 units lie under the crusher
 * house, so nothing on that floor goes past z 2. The median reads 1.5 m.
 * 122 parts and 1,672 triangles become 159 and 2,548.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 75;
const DRAWN = 69.11;
const DATUM = 4.5;
// The Klaxon's facet rule at this file's scale (bathyarch.mjs `cut`, #919):
// the builders are handed the export's units and the rule is a chord in
// metres.
const cut = bathyarch.cut(L / DRAWN);

// `scoutInk` until #888: the same four claddings, and an `amber_lamp` that
// was the token through and through. The base is the navy's near-black now
// and the export's 3.5 stays, the emissive unmoved; the base's value did
// move, and the lamps read dark when SIG dims them (`ink.amberLamp`).
const grey = bathyarch.ink.ironGrey();
const black = bathyarch.ink.hullBlack();
const amber = bathyarch.ink.hazardAmber();
const rust = bathyarch.ink.oxideRust();
const lamp = bathyarch.ink.amberLamp(3.5);

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
    cut,
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
    cut,
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
  cut,
  ...drawn([2.8, 16.2, 5]),
});
bathyarch.drum(root, black, {
  name: 'crusher_vent_b',
  radii: [0.7, 0.7],
  length: 3.4,
  cut,
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
  cut,
  ...drawn([2.4, 14, -32.5]),
});
bathyarch.drum(root, amber, {
  name: 'stack_band',
  radii: [1, 1],
  length: 0.6,
  cut,
  ...drawn([2.4, 15.6, -32.5]),
});
bathyarch.whips(root, grey, { whips: [['mast', 0.18, 3.6, drawn([-1.8, 16.5, -30.5])]], cut });
bar('mast_lamp', lamp, [0.5, 0.5, 0.5], [-1.8, 18.5, -30.5]);

// A pipe a side along the deck edge in its own plate, and a riser off each
// at its own station.
bathyarch.drum(root, rust, {
  name: 'pipe_p',
  radii: [0.4, 0.4],
  length: 40,
  cut,
  ...drawn([9.4, 8.7, -6], ALONG_KEEL),
});
bathyarch.drum(root, black, {
  name: 'pipe_s',
  radii: [0.4, 0.4],
  length: 40,
  cut,
  ...drawn([-9.4, 8.7, -6], ALONG_KEEL),
});
bathyarch.drum(root, rust, {
  name: 'pipe_riser_p',
  radii: [0.35, 0.35],
  length: 3,
  cut,
  ...drawn([9.4, 10, 6]),
});
bathyarch.drum(root, black, {
  name: 'pipe_riser_s',
  radii: [0.35, 0.35],
  length: 3,
  cut,
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
// one at the stern — pads on the gunwale tops, the apron's face and the
// after gunwale since #890 (header). The gunwales' tops are at 9.4 and run
// x 10 to 11.2; the apron's upper face falls 0.912 a unit toward the tip,
// and the bow pad lies on it pitched atan(0.912), its centre half a pad's
// thickness up the face's normal from the surface point at z 24.05.
const MARKS = [-26, -10, 6];
bathyarch.runningLights(root, lamp, {
  name: 'marker',
  size: [0.8, 0.32, 1.2],
  y: 9.56,
  rows: [
    { side: 'p', z: -10.6, stations: MARKS },
    { side: 's', z: 10.6, stations: MARKS },
  ],
});
const APRON_PITCH = Math.atan(0.912);
bar('marker_bow', lamp, [1.6, 0.32, 0.8], [0, 5.9, 24.16], [APRON_PITCH, 0, 0]);
bar('marker_stern', lamp, [1.6, 0.32, 0.8], [0, 9.56, -33.76]);

// PANELS (#919): the deck fittings the panel pass added (header). Every
// station is the export's [x, z] over the plate it rests on, handed on as a
// `drawn` placement so it lands in the kit's frame; a plate's `[w, d]` is in
// that frame, `w` along the keel and `d` across it, and a seam lies athwart.
// A Harvester's open plate is its two hold floors — the deck plate inside the
// walls, which the chart sees whole — the divider between them, the gunwale
// tops between the markers, the crusher roof round its vents, the foredeck
// either side of the conveyor and clear of the deck patch, and the cab's
// visor beside its mast. A plate is the other finish than the one it lies
// on: grey over black is the newer plate, rust the older, and on the grey
// divider and visor rust and the hull's black; the hold floors are dogged
// down to the barge hull.
const at = (x, z) => drawn([x, 0, z]).at;
const HATCH = { r: 0.75, h: 0.25, wheel: { R: 0.5, t: 0.1 }, cut };
const PLATE_T = 0.2;
const SEAM = { w: 0.4, h: 0.22, along: false };
for (const [side, sgn, finishes] of [
  ['p', 1, ['rust', 'grey', 'rust', 'grey']],
  ['s', -1, ['grey', 'rust', 'grey', 'rust']],
])
  bathyarch.deckPlates(root, { grey, rust }, {
    on: `gunwale_${side}`,
    t: PLATE_T,
    plates: [-30, -18, -2, 12].map((z, i) => [`patch_gw_${side}${i + 1}`, finishes[i], [1.3, 1.0], at(sgn * 10.6, z)]),
  });
bathyarch.deckHatches(root, { hatch: grey, wheel: rust }, {
  on: 'deck_plate',
  hatches: [
    ['hatch_hold_f_p', at(3.5, 1.5)],
    ['hatch_hold_f_s', at(-3.5, -4)],
    ['hatch_hold_a_p', at(3.5, -16)],
    ['hatch_hold_a_s', at(-3.5, -22)],
    ['hatch_fwd_s', at(-7.0, 16)],
  ],
  ...HATCH,
});
bathyarch.deckPlates(root, { grey, rust }, {
  on: 'deck_plate',
  t: PLATE_T,
  plates: [
    ['patch_hold_1', 'grey', [1.2, 1.4], at(3.0, -5)],
    // The crusher house stands over the forward hold's last 3.75 units, so
    // nothing on that floor goes past z 2.
    ['patch_hold_2', 'rust', [1.4, 1.2], at(-3.5, 0.5)],
    ['patch_hold_3', 'rust', [1.2, 1.4], at(3.5, -23)],
    ['patch_hold_4', 'grey', [1.4, 1.2], at(-3.0, -14.5)],
    ['patch_fwd_1', 'grey', [1.2, 1.4], at(-6.5, 13.5)],
    ['patch_fwd_2', 'rust', [1.2, 1.2], at(-4.5, 16)],
    ['patch_fwd_3', 'rust', [1.2, 1.4], at(6.5, 12)],
    ['patch_fwd_4', 'grey', [1.2, 1.2], at(4.5, 15.5)],
  ],
});
bathyarch.plateSeams(root, grey, { on: 'deck_plate', name: 'seam_hold', stations: [-1, -19], z: 0, length: 5, ...SEAM });
bathyarch.plateSeams(root, grey, { on: 'deck_plate', name: 'seam_fwd', stations: [14], z: -6.5, length: 4, ...SEAM });
bathyarch.deckPlates(root, { grey, rust }, {
  on: 'hold_divider',
  t: PLATE_T,
  plates: [
    ['patch_div_1', 'rust', [1.2, 1.4], at(-5.5, -10)],
    ['patch_div_2', 'rust', [1.2, 1.4], at(0, -10)],
    ['patch_div_3', 'rust', [1.2, 1.4], at(5.5, -10)],
  ],
});
bathyarch.deckHatches(root, { hatch: grey, wheel: rust }, {
  on: 'crusher_roof',
  hatches: [['hatch_crusher', at(1.5, 8.8)]],
  ...HATCH,
});
bathyarch.deckPlates(root, { grey, rust }, {
  on: 'crusher_roof',
  t: PLATE_T,
  plates: [
    ['patch_roof_1', 'grey', [1.2, 1.4], at(-2.5, 4.0)],
    ['patch_roof_2', 'rust', [1.2, 1.2], at(3.0, 8.5)],
  ],
});
bathyarch.deckPlates(root, { black }, {
  on: 'cab_visor',
  t: PLATE_T,
  plates: [['patch_cab', 'black', [1.2, 1.2], at(0.8, -29)]],
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'harvester-bathyarch.glb');
