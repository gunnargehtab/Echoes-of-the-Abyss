/**
 * The Gantry — the Consortium's carrier, 140 m (docs/units.md, "The
 * carriers"; #840, off #838).
 *
 * "The loud deck, 140 m — a yard's gantry crane with a drive under it, the
 * Slipway's line carried to sea, and no gun at all: its deck builds two
 * Sparks and launches them out of its stern, louder than anything else in
 * the water and meant to be (SIG 52 idle, 66 cruise, +35 at every launch;
 * no weapon; HYD 45; a flight of two Sparks, rebuilt one every 45 s; 1,500
 * hull; 38 m/s; PR 2). A riveted box hull, the drive, with a yard deck laid
 * across its after three quarters and carried out 5 m past both flanks on
 * knees, so the plan is a narrow chamfered bow and a broad square back.
 * Down the middle of the deck runs the slip, open at the stern: two long
 * riveted shops flank it — the Slipway's halls afloat, pilastered, ridged,
 * a hazard stripe along each inner eave, one banded stack and a rank of
 * louvres over each engine room aft — and a bridge house spans its head,
 * with a stores hatch and a dogged crew hatch on the foredeck ahead of it.
 * The two berths lie on the slip in tandem, both bow-aft to the mouth: each
 * a rim of hazard paint cut to a Spark's plan, the craft's two ways and
 * four corner chocks inside it, a stop across its stern end, and nothing on
 * it, because a Spark aboard is counted and not drawn; the after berth's
 * ways run on to a lit launch sill and a gate across the mouth hinged at
 * its foot. Over the slip, parked between the berths and the tallest thing
 * on the hull, the gantry: an A-frame leg a side on a bogie riding a rail
 * along each deck edge, a box girder across the whole beam, the trolley
 * under it with its fall and a lifting beam as long as a Spark's corner
 * posts are apart, the operator's cab slung off its starboard end. Twin
 * prop tunnels notched into the stern either side of the mouth, ballast
 * blisters under the deck's overhang, plate patchworked older-under-newer.
 * No turret, no tube, no mount, no hydrophone: nothing on this hull points
 * at anything, and the deck is what it fires. Sustained glow at rest — the
 * line lights down both edges of the slip, the girder's worklight, the
 * launch sill and the engine-room louvres, the light the chart reads — with
 * the stack throats, the bridge ports and the cab's ports for the eye that
 * gets closer; burning bright under way on the same lamps, because 66 is
 * over the Klaxon's line; the gate drops and the slip floods for the
 * instant of a launch, and the deck is back to its glow after."
 * (docs/asset-prompts-3d.md, UNIT — Gantry)
 *
 * Built to that block and not ported from a binary (docs/models-plan.md
 * §3.1), so every number here is a decision and this header says which ones
 * the block did not make. Built with the deck empty: both berths bare, the
 * gate shut, the gantry parked between the berths. Metre-true at 140 with
 * no root scale: the bow plate is the bow at x 70 and the prop hubs are the
 * stern at −70 (`metreTrue` asserts it); port is −z (#642).
 *
 * The plan is two boxes, one on the other, and the step between them is the
 * hull's argument in outline. The drive is the Tender's `boxHull` at 28 m
 * across its parallel flanks — 0.20 of the length — 12 m deep, with a 12 m
 * chamfer to a 14 m bow face and a square stern notched twice for the
 * tunnels. The yard is a 2 m deck slab laid on it from x 36 to the transom,
 * 38 m across (0.27), 5 m proud of the drive a side with a 3 m chamfer at
 * its forward corners, standing on eight knees a side. So the generated
 * outline (tools/hull-maps/outlines.mjs, run read-only against this file)
 * is a chamfered bow at ±0.104 stepping out at x 0.26 to ±0.136 and square
 * to the stern: a narrow nose and a broad flat back, the read a carrier
 * deck has at a glance. Nothing hangs past the yard's edge; the girder is
 * cut flush with it.
 *
 * What the script decided that the block does not say:
 *
 * - **The yard is the Slipway, by construction.** The slip floor, its two
 *   line lights and the launch sill are kit.mjs `slipwayBed`, the gantry is
 *   kit.mjs `slipwayGantry`, and the two shops are `slipwayHall` — the
 *   Slipway's own builders at a hull's numbers, so the family is in the
 *   code and not only in the likeness. `slipwayBed` draws its floor and
 *   lines centred on its frame and `slipwayHall` its body the same way, so
 *   both sit in frames at the slip's station, x −21 (`yard`, `hall_s`,
 *   `hall_p`); the slab is `foundation_slab` because that is the builder's
 *   word for the thing a slip is cut into. The Slipway's crosses, keel
 *   blocks, apron floods and wall tanks are passed as none: the crosses and
 *   floods would double the deck's light, the blocks are the berths' job,
 *   and tanks on the shops' outer walls would stand on the gantry's rail.
 * - **The deck is built empty.** A craft aboard is not an entity — the deck
 *   counts it (docs/systems-combat.md §15) — and a craft in the water is
 *   drawn as its own, so a Spark modelled into a berth would be drawn twice
 *   whenever the flight is out. What the berth shows instead is the craft's
 *   plan: `craftBerth`, new, cuts each berth to `sparkPlan` — the rim of
 *   hazard paint round the Spark's own outline with a metre's margin, its
 *   chamfered nose and square stern, the two ways at its skids' beam, the
 *   four chocks outboard of its corner posts, the stop at its stern — so
 *   the craft that fits is legible from the cradle, and hulls/spark.mjs
 *   builds to the same numbers (a Spark set on the ways sits its skids on
 *   them with its axis at y 12, under the shops' roofs).
 * - **Both berths face aft.** The mouth is the way out, and a berth whose
 *   chamfered end points at the gate says which way the craft leaves; the
 *   after berth's ways run 19.6 m on past its bow end to the sill, so the
 *   launch berth reads as the one on the track and the head berth as the
 *   one a Spark is rebuilt in.
 * - **The gantry is parked between the berths.** At x −12, in the 30 m of
 *   bare slip between them, so from straight above the girder covers
 *   neither: the chart sees both berths whole. The leg is an A-frame
 *   (`craneLeg`, new) where the Slipway stands one square column — two
 *   posts from the ends of a 12 m bogie (`craneBogie`, new) riding a rail
 *   along each deck edge (`craneRails`, new), meeting under the girder,
 *   tied at mid-height — because a crane on a hull has to read as a crane
 *   from the beam. The girder is 3.6 m by 3.4 on 38 m, its top at 28.7,
 *   12 m over the shops' roofs; the worklight is `slipwayGantry`'s own, a
 *   strip along the girder's forward face just above its top.
 * - **The lifting beam is the Spark's.** `liftingBeam`, new: a bar along the
 *   keel with a cross-head at each end, the two 13.6 m apart because the
 *   Spark's corner posts are, each as wide as the posts' beam, and a hook
 *   under each corner, hung at y 13 inside the slip. From above it is a
 *   thin H in the gap between the berths, 0.6 m members, faint at 1 px/m
 *   by design.
 * - **The cab is slung aft of the girder's starboard end** (`craneCab`,
 *   new), so it shows from above as a black box beside the girder rather
 *   than under it; its two ports stand 0.5 m proud of its inboard face so
 *   their tops count, which is how the Freighter counts its castle ports.
 * - **The bridge house is the head gate.** The Slipway closes the head of
 *   its slip with two pylons and a lintel; a lintel over this slip would be
 *   a second bar across the deck, and at 1 px/m two bars read as two
 *   cranes. So the citadel — 9 m by 30 across the shops' forward ends, the
 *   bridge on it, ports a flank and across the bridge face — is the wall
 *   the slip starts at.
 * - **The louvres are in the vent, and the line lights in the flood.** The
 *   Slipway lights its line in the flood and so does this; the Caisson's
 *   louvres are the flood because they are that hull's brightest thing, and
 *   here the line is, so the engine rooms' louvres (`exhaustLouvres`, three
 *   slats a side, 8 m long, over a black well) are banked down to the vent.
 *   The shops' ridges are 48 m, not the hall's full run, so the engine-room
 *   roofs aft are clear for them; one stack a shop, aft, its throat the
 *   Caisson's collar in the vent (`stackBand`).
 * - **The deck's marks are sized to 1 px/m.** The rim is 0.8 m of paint and
 *   each way 0.9 m of grey on the rust floor, so each berth still registers
 *   as a chevron-ended outline in a 140 px sprite; the line lights are
 *   0.6 m. At 1 px/m the squint bake reads a dark trench with lit edges
 *   between two light roofs, two outlined berths pointing aft, the girder
 *   as the brightest bar in the height map, the bridge house across the
 *   head and the narrow bow ahead of it.
 * - **The tunnels are notched into the stern under the shops.** The
 *   Tender's idiom as the Caisson carries it: 3 m notches at z ±9 with a
 *   ring lying in each and the hub standing to −70, either side of the
 *   mouth, so the drive is under the yard and the mouth is between the
 *   screws. The rings stand 1.8 m proud of the transom; the yard covers the
 *   notches from above and the rings' after halves show.
 * - **A stores hatch forward.** The block's "stores hatch" is the Freighter's
 *   `cargoHatch` at 9 m, the stock a rebuild draws on coming aboard; the
 *   crew hatch is the Beacon's `doggedHatch`; the stencil and the bow lamp
 *   are the navy's, the lamp the navigation mark the glow table's floor row
 *   licenses at every band.
 * - **No hydrophone and no stern vents.** "HYD 45 — plate and a crane, not
 *   sensors" (docs/units.md): nothing on the hull listens. The engines vent
 *   through the louvres and the stacks, off the roof, where the chart
 *   reads them.
 *
 * The resting light, as the export's audit counts it from above — and it is
 * all the light, because the block's under-way clause brightens these same
 * lamps and names none of its own, so nothing is clad in `amber_lamp_unlit`
 * (docs/models-plan.md §3.2 rules 1–2), and the gate's flood is a launch
 * transient and not a lamp (rule 3): the two line lights at 62.3 m² each,
 * the girder's worklight at 25.5, the launch sill at 13.8, six louvre slats
 * at 8.0, the two stack throats at 4.4, the bow lamp at 3.0, six citadel
 * ports and five bridge ports at 0.75 and two cab ports at 0.5 — 26 lit
 * parts, 232.9 m² facing up on a 4,841 m² plan, no part hidden, every pair
 * symmetric to the cell. By fixture, 138.4 m² of flood, 56.8 of vent and
 * 37.8 of lamp. The intake bake at 140 m, 4 px/m, reads raw E 38.94 against
 * the target E(52) = 18.46 and dims by ×0.473 — inside ×1/64 .. ×64 with
 * two orders of magnitude either side, between the Beacon's ×0.335 and the
 * Freighter's ×0.527, so the conn view's lamps, which take the model's own
 * intensity and never the bake's gain (rosterModels.ts), sit near the band
 * the chart shows. Under way `applyLiveGlow` scales them by E(66) / E(52),
 * e: the same lamps at nearly three times.
 *
 * 274 parts, 4,292 triangles, seven materials; the file spans x −70 .. 70
 * and z −19 .. 19 to the centimetre, y −6 .. 29.1, so the bake neither
 * rescales nor rotates, and meta.json carries no warnings.
 *
 * Every part comes from `factions/bathyarch.mjs` or kit.mjs; `sparkPlan`,
 * `deckKnees`, `craneRails`, `craneLeg`, `craneBogie`, `liftingBeam`,
 * `craneCab`, `craftBerth` and `launchGate` were written for this hull
 * there, beside the Spark's own. Coordinate tables below are laid out as
 * tables on purpose; `tools/**\/*.mjs` is outside the repo's Prettier scope
 * (package.json) precisely so they can be.
 */
import { THREE, bothSides, group, slipwayBed, slipwayGantry, exportGlb, metreTrue } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/** The design length (UNIT_STATS.hullLengthM). Drawn at it: the bow plate at +70, the prop hubs at −70. */
const L = 140;

/** The drive hull's half-beam, the yard deck's, and the transom, 2 m inside the stern so the hubs stand to −70. */
const HALF = 14;
const YARD = 19;
const TRANSOM = -68;

/** The drive hull's deck, the yard deck laid on it, and the slip floor laid on the yard. */
const HULL_TOP = 6;
const DECK = 8;
const FLOOR = 8.5;

/** The slip's and the shops' station — both centred here — and the gantry's, parked between the berths. */
const XO = -21;
const CX = -12;

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const vent = bathyarch.ink.amberVent();
const flood = bathyarch.ink.amberFlood();

const root = new THREE.Group();
root.name = 'consortium_gantry';

// The drive: a box hull 28 m across its parallel flanks and 12 deep, a
// chamfer to a 14 m bow face, and a square stern notched twice for the
// tunnels. Its deck plate shows only forward of the yard, so it is drawn
// only there; the rubbing strake runs along the bare forward flank.
bathyarch.boxHull(root, { black, grey, rust }, {
  hull: {
    outline: [
      [69, 7], [57, HALF], [TRANSOM, HALF], [TRANSOM, 11.8], [TRANSOM + 3, 11.8], [TRANSOM + 3, 6.2], [TRANSOM, 6.2],
      [TRANSOM, -6.2], [TRANSOM + 3, -6.2], [TRANSOM + 3, -11.8], [TRANSOM, -11.8], [TRANSOM, -HALF], [57, -HALF], [69, -7],
    ],
    depth: 12, y: 0,
  },
  deck: {
    outline: [[67.6, 6], [56.4, 12.6], [34, 12.6], [34, -12.6], [56.4, -12.6], [67.6, -6]],
    depth: 0.6, y: HULL_TOP + 0.3,
  },
  strakes: { x: 45.5, y: -1.5, z: HALF, size: [23, 0.8, 1.0] },
});
bathyarch.bowPlate(root, { grey, amber }, {
  plate: { at: [69.3, 0, 0], size: [1.4, 9.6, 14] },
  band: { at: [69.6, 3.2, 0], size: [0.8, 1.2, 14.6] },
});

// The knees the yard deck stands on where it overhangs the drive hull, a
// rank a side from the hull's flank up and out to the deck's edge.
bathyarch.deckKnees(root, rust, {
  x: [30, 18, 6, -6, -18, -30, -42, -54],
  foot: { y: -1, z: HALF }, head: { y: HULL_TOP - 0.4, z: YARD - 0.8 }, t: 0.9,
});

// The yard: the Slipway's bed at a hull's numbers, in a frame at the slip's
// station. The deck slab laid on the drive and 5 m proud of it a side, the
// rust slip floor down its middle from the bridge house to the stern, the
// two line lights along the floor's edges, the two berths — empty, cut to
// the Spark, both bow-aft to the mouth, the after one's ways run on to the
// sill — and the lit launch sill inboard of the gate.
const yard = group(root, 'yard', { at: [XO, 0, 0] });
slipwayBed(yard, { slab: black, floor: rust, line: flood, keel: black }, {
  foundation: {
    outline: [[57, 16], [54, YARD], [TRANSOM - XO, YARD], [TRANSOM - XO, -YARD], [54, -YARD], [57, -16]],
    t: DECK - HULL_TOP, bevel: 0, y: HULL_TOP,
  },
  slip: { size: [94, FLOOR - DECK, 12], y: (DECK + FLOOR) / 2 },
  lines: { size: [88, 0.3, 0.6], y: FLOOR + 0.15, z: 5.4 },
  crosses: { count: 0 },
  blocks: { count: 0 },
  hull: (g) => {
    for (const [tag, x, runOut] of [['h', 35, 0], ['l', -17, 19.6]])
      bathyarch.craftBerth(g, { amber, grey, rust, black }, {
        tag, x, y: FLOOR, facing: -1, craft: bathyarch.sparkPlan, runOut,
        rim: { w: 0.8, h: 0.08 },
        ways: { w: 0.9, h: 0.5, over: 0.4 },
        chocks: { size: [1.0, 1.1, 0.8], out: 0.85 },
        stop: { x: -10.3, size: [0.8, 0.9, 6.0] },
      });
  },
  sill: { size: [1.2, 0.4, 11], at: [-43.6, FLOOR + 0.2, 0] },
});

// The two shops flanking the slip, starboard first: the Slipway's hall at
// a hull's numbers, and the lit throat on each hall's one stack.
bothSides((tag, sgn) => {
  const hall = group(root, `hall_${tag}`, { at: [XO, 0, 0] });
  bathyarch.slipwayHall(hall, { black, grey, rust, amber, flood }, {
    sgn, z: 10.75,
    body: { size: [94, 8, 8.5], y: 12 },
    roof: { size: [94.6, 0.8, 9.3], y: 16.4 },
    ridge: { size: [48, 0.8, 1.6], y: 17.2 },
    pilasters: { count: 8, from: -42, pitch: 12, size: [1.2, 8.6, 9.3], y: 12.3 },
    vents: { size: [0.9, 0.6, 0.9], y: 17.1, z: 14.1 },
    stacks: { xs: [-41.5], y: 20.3, z: 12.4, r: 1.3, rTop: 1.1, height: 7 },
    bands: { y: 21.6, r: 1.4, h: 0.6 },
    patches: [
      { size: [7, 0.25, 3], at: [22, 16.925, 12.8], mat: rust },
      { size: [5, 0.25, 2.2], at: [-6, 16.925, 8.2], mat: grey },
    ],
    stripe: { size: [92, 0.2, 0.6], y: 16.9, z: 6.8 },
    apron: { size: [94, 0.5, 0.5], y: DECK + 0.25, z: 6.25 },
    floods: { count: 0 },
    tanks: { xs: [] },
    rivets: { from: -45, to: 45, count: 16, y: 16.95, z: 14.95, size: [0.5, 0.3, 0.5] },
  });
  bathyarch.stackBand(hall, vent, { name: 'stack_throat_0', at: [-41.5, 23.8, sgn * 12.4], r: 1.2, h: 0.4 });
});

// The engine-room louvres on each shop's roof aft, over a well of hull
// black: the Caisson's pair, in the vent rather than the flood.
bathyarch.exhaustLouvres(root, { black, flood: vent }, {
  x: -51, y: 17.25, z: 10.75, length: 8,
  well: { y: 16.95, size: [8.6, 0.3, 3.4] },
  slats: { count: 3, pitch: 1, slat: 0.8, tilt: 0.5, t: 0.15 },
});

// The rails the gantry walks on, along both deck edges from the bridge
// house to the stern.
bathyarch.craneRails(root, rust, { x: XO, y: DECK + 0.4, z: 17.5, size: [90, 0.8, 1.2] });

// The gantry: the Slipway's frame at a hull's numbers, parked between the
// berths — an A-frame leg a side on a bogie riding the rail, the girder
// across the whole beam, the trolley under it and its fall, the worklight
// along the girder — then the lifting beam on the fall and the cab slung
// off the girder's starboard end.
const gantry = slipwayGantry(root, { beam: grey, trolley: amber, cable: black, worklight: lampM }, {
  index: 0, x: CX,
  leg: bathyarch.craneLeg({
    mat: grey, spread: 17.5, t: 1.5,
    foot: { dx: 5.5, y: DECK + 2.2 }, head: { dx: 1.4, y: 25.3 }, tie: { y: 17, h: 0.9 },
  }),
  ornament: bathyarch.craneBogie({ mat: rust, size: [12, 1.4, 2.4], y: DECK + 1.5, spread: 17.5 }),
  beam: { size: [3.6, 3.4, 2 * YARD], y: 27 },
  trolley: { size: [4.8, 2, 4.8], y: 24.3, z: 0 },
  cable: { r: 0.25, h: 9.9, y: 18.35 },
  worklight: { size: [0.9, 0.4, 34], y: 28.9, clear: 0.3 },
});
bathyarch.liftingBeam(gantry, { grey, rust }, {
  x: CX, y: 13, craft: bathyarch.sparkPlan, bar: { t: 0.6 }, hook: { size: [0.6, 0.9, 0.6] },
});
bathyarch.craneCab(gantry, { black, grey, lampM }, {
  at: [CX - 3.3, 23.8, 13.5], size: [3.0, 2.6, 3.4], roof: { over: 0.2, h: 0.3 },
  ports: { x: [-0.7, 0.7], y: 23.9, z: 11.55, size: [1.0, 0.9, 0.5] },
});

// The bridge house across the head of the slip: the block spanning the
// shops' forward ends, the bridge on it, the visor across its forward
// face, three ports a flank and five across the bridge's forward face.
bathyarch.citadel(root, { black, grey, rust, lampM }, {
  block: { at: [30.5, 12.5, 0], size: [9, 9, 30] },
  top: { at: [31, 18.6, 0], size: [6, 3.2, 16] },
  visor: { at: [35.3, 15.2, 0], size: [0.8, 1.6, 30.4] },
  ports: { count: 3, x: 27.8, pitch: 2.7, y: 13.5, z: 15.2, size: [1.6, 1.2, 0.5] },
  bridgePorts: { x: 34.2, y: 18.8, z: [-5, -2.5, 0, 2.5, 5], size: [0.5, 1.2, 1.6] },
});

// The gate across the mouth, shut, hinged at its foot on the outboard face.
bathyarch.launchGate(root, { grey, rust, amber }, {
  x: -66.8, y: FLOOR, size: [0.8, 6, 11.4],
  stripe: { over: 0.2, h: 0.25 },
  hinge: { r: 0.4, knuckles: [-4, 0, 4], knuckle: { r: 0.55, length: 1.2 } },
  wheels: { z: [-2.8, 2.8], R: 0.6, rim: 0.12, y: 12, stand: 0.45, hub: { r: 0.2, length: 0.5 } },
});

// The two prop tunnels, one lying in each stern notch under a shop, either
// side of the mouth; the hubs stand to −70.
bothSides((side, sgn) =>
  bathyarch.propTunnel(root, { grey, black }, {
    name: side, at: [-68.6, -1.5, sgn * 9], r: 2.6, length: 2.4, hub: { r: 0.9, length: 2.8 },
  })
);

// Ballast blisters low on the drive hull under the yard's overhang.
bathyarch.ballastBlisters(root, { grey, rust }, {
  x: -12, y: -4, z: 15, r: 2, length: 78,
  caps: { length: 3, fore: 28.5, aft: -52.5, tipR: 1.2 },
});

// The patchwork, rivets along the yard's edge and the bow's flanks, and the
// foredeck: a dogged hatch, the asset number and the bow lamp.
bathyarch.repairPatches(root, bathyarch.inFrame, { rust, grey }, {
  patches: [
    ['patch_walk_s', 'rust', [6, 0.25, 1.6], [8, DECK + 0.125, 15.9]],
    ['patch_citadel_p', 'grey', [3, 2.2, 0.4], [29, 11, -15.2]],
    ['patch_hull_s', 'rust', [8, 2.6, 0.4], [46, 2.8, 14.2]],
    ['patch_deck', 'rust', [4, 0.2, 3], [38.8, HULL_TOP + 0.7, 7.5]],
  ],
});
bathyarch.rivetRows(root, grey, { from: -66, to: 32, count: 22, y: DECK + 0.1, z: 18.6, size: [0.6, 0.2, 0.6] });
bathyarch.rivetRows(root, black, { from: 34, to: 56, count: 6, y: 3.5, z: 14.25, size: [0.5, 0.5, 0.5] });
bathyarch.cargoHatch(root, { grey, rust }, {
  coaming: { size: [9, 0.8, 9], at: [46, HULL_TOP + 1, 0] },
  cover: { size: [8, 0.5, 8], at: [46, HULL_TOP + 1.6, 0] },
});
bathyarch.doggedHatch(root, { hatch: rust, wheel: grey }, {
  name: 'deck_hatch', at: [56, HULL_TOP + 0.85, -5], r: 1.3, h: 0.5, wheel: { R: 0.55, t: 0.1, dy: 0.35 },
});
bathyarch.bowStencil(root, amber, { at: [60, HULL_TOP + 0.75, 3.5], size: [7, 0.3, 1.4] });
bathyarch.bowLamp(root, lampM, { at: [65, HULL_TOP + 0.8, 0], size: [1.2, 0.8, 3] });

// Metre-true as drawn: 140 from the prop hubs to the bow plate, so the
// scale this returns is 1 and the root carries nothing.
const k = metreTrue(root, L, { drawn: L });
if (Math.abs(k - 1) > 1e-6) throw new Error(`consortium_gantry: root scale ${k}, expected 1`);

await exportGlb(root, 'gantry-bathyarch.glb');
