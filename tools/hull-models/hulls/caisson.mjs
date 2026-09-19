/**
 * The Caisson — the Consortium's line hull, 90 m (docs/units.md, "The line
 * hulls, and the anchor"; #787, off #540 Phase 4).
 *
 * "The line hull that cannot hide and has stopped trying, 90 m — a Corvette
 * with a third more plate, a slower drive, and a plant that runs at one
 * volume whether or not it is moving, four above the Klaxon's line at every
 * posture (SIG 64 idle, 64 cruise, +25 firing; the Corvette's gun, 50 at
 * 550 m; 560 hull; 70 m/s; PR 2; 170 nodules). A pressure box: the
 * skirmisher's wedge made in riveted plate and no longer tapering — a blunt
 * plough bow, a flat plate face with chamfered corners, flanks parallel from
 * the shoulders for two thirds of the length, then a step in to the bare
 * drive hull and a square stern with two prop tunnels. The caisson is the
 * step: a box of heavier plate bolted over the forward two thirds, riveted,
 * patchworked older-under-newer, its after edge standing proud of the drive
 * hull as a shoulder — the third more plate, visible in the plan. On its
 * back the plant: a riveted pressure cylinder lying fore-and-aft along the
 * spine with dished heads, two stacks abreast of it, and a rank of exhaust
 * louvres down each side that have no shutters, because there is nothing
 * aboard to throttle. The Corvette's two torpedo tubes let into the bow face
 * either side of the plough plate, with hinged muzzle doors; a low bridge
 * citadel abaft the plant; ballast blisters low on the hull. No baffle, no
 * shroud, no cowl on anything. Burning bright at rest and under way alike —
 * the louvres the brightest thing on the hull, the stacks lit at the throat,
 * floods along the caisson's edge and the bridge ports — because the loud
 * state is the only state; the muzzle doors flood for the instant of a
 * launch. No dim state is drawn: the one quiet this hull has is Silent
 * Running, and that is the trade stated once — the quiet or the 12%, never
 * both."
 * (docs/asset-prompts-3d.md, UNIT — Caisson)
 *
 * Built to that block and not ported from a binary, like the Broadside and
 * the Furnace before it (docs/models-plan.md §3.1), so every number here is
 * a decision and this header says which ones the block did not make. One
 * lighting band at every posture, so everything the block lights at rest is
 * lit and no part on this hull wears the lamp family's unlit finish (§3.2
 * rules 1 and 2); the muzzle-door flood is a launch transient and is not a
 * lamp (rule 3), so the doors are plain cladding. Metre-true at 90 with no
 * root scale: the plough plate is the bow at x 45 and the two prop hubs are
 * the stern at −45 (`metreTrue` asserts it); port is −z (#642).
 *
 * The plan is two boxes, and the step between them is the hull's argument.
 * The drive hull is the Tender's `boxHull` at 19 m across its parallel
 * flanks — 0.21 of the length — running the whole 90 m with a square stern
 * notched twice for the tunnels. The caisson is a second box of heavier
 * plate bolted over it from the bow to x −15, 58.5 m of the 90 — the
 * forward two thirds within a metre and a half — 26 m across its parallel
 * flanks (0.29, between the Broadside's 0.26 and the Furnace's 0.30) with a
 * 5.5 m chamfer to a 13.6 m bow face, and 3.5 m of half-beam proud of the
 * drive hull on each side. Its own parallel run is 53 m, 0.59 of the
 * length, because the chamfer to the bow face eats 5.5 m of it: the block's
 * two thirds is the caisson, and the flank is parallel from the shoulders
 * for all of the caisson that is not chamfer. That 3.5 m is the step,
 * and everything on a flank is inside it: the blisters reach z 12.7 under
 * the caisson and end at its after edge, under the shoulder, the rivets
 * on the caisson's rim reach 12.2, the bolt heads 13.2 at a 3 m pitch, and
 * aft of the shoulder there is nothing on the drive hull but its strake at
 * 10.0 and eight rivets a side. Nothing bridges the step and nothing
 * reaches past the caisson's ends — the Furnace's seam-on-the-flank fault
 * (#786 review).
 *
 * What the script decided that the block does not say:
 *
 * - **The caisson is a second box, not a tier.** The block says "bolted
 *   over" and "standing proud of the drive hull as a shoulder", and the
 *   Bulwark's `armouredSlab` — the navy's only existing word for plate in
 *   courses — is a hull that carries its beam in tiers on one slab. So
 *   `caissonBox` is new in `factions/bathyarch.mjs`: the drive hull runs
 *   the full length at 19 m and the caisson is bolted over its forward two
 *   thirds at 26 m, its after face a 0.9 m shoulder plate. The step is
 *   therefore in the plan and not only in the elevation, which is what "the
 *   third more plate, visible in the plan" asks for and what the generated
 *   outline has to read.
 * - **The patchwork is two plate courses on the caisson's back.** "Riveted,
 *   patchworked older-under-newer" names no fixture. The courses are it:
 *   an older course in oxide over the whole back, and a newer grey course
 *   over everything abaft x 32, so the older shows round its edges and
 *   forward of it — older under newer, laid where the chart reads it.
 *   Three repair patches and two rivet rows carry the rest.
 * - **The plant's cylinder is its own builder.** The plan bullet starts
 *   from `bandedTank`, which is a structure's tank lying where it was
 *   dropped with one torus round it and flat ends. This one lies
 *   fore-and-aft on the spine, 24 m by 5.2, with three flat bands, a dished
 *   head at each end and two saddles under it: `plantCylinder`, beside the
 *   Broadside's casings.
 * - **The stacks are abreast at z ±4.8, inboard of the louvres.** "Two
 *   stacks abreast of it" gives no station. They stand at x 21 either side
 *   of the cylinder, 5.4 m tall, and the lit throat is a 0.8 m collar at
 *   each mouth a hair wider than the stack under it, so its whole disc
 *   faces up. Inboard of the louvre ranks on purpose: a stack over a louvre
 *   bank takes plan area off the brightest light on the hull, and the audit
 *   counts what nothing covers.
 * - **The louvres are the chart's light, and they are laid on the deck.**
 *   "A rank of exhaust louvres down each side" is drawn with the kit's
 *   `louvres` — four slats a side, 13 m long, at a 1 m pitch across a
 *   3.75 m band at z ±8.75, over a well of hull black the gaps show, the
 *   port rank's tilt the negation of the starboard rank's — because a slat
 *   laid on a deck presents `slat·cos(tilt)` of plan width and a louvre
 *   hung on a wall, as the Derrick's are, presents none. 78.0 m² of the
 *   hull's 162.4, and the block's "brightest thing on the hull" is true by
 *   area as well as by material.
 * - **The slats and the flood housings are sized to the raster.** The maps
 *   bake at 4 px/m and the cell grid is not symmetric about the keel — a
 *   hull 26.4 m in the beam is 105.6 cells wide — so a lamp centred at ±z
 *   is not sampled the same way on the two sides, which is the "a cell
 *   narrower than its opposite" the Broadside's and the Furnace's headers
 *   record of their ports. On this hull that fell on the brightest light
 *   there is, and one cell in three is a third of it: the first cut read
 *   13.0 m² a slat to starboard and 9.75 to port. The cure is arithmetic:
 *   a slat centred on a multiple of 0.25 m lands at the same offset from a
 *   cell centre on both sides, and a slat 0.8 m across and 0.15 thick foots
 *   0.77 m in plan at a half-radian tilt — `slat·cos(tilt) + t·sin(tilt)`,
 *   which is the kit's formula and the thickness the kit's comment leaves
 *   out — which covers three cells with 5 cm of margin either way. So the
 *   slats sit at z 7.25, 8.25, 9.25 and 10.25, and all eight read 9.75 m².
 *   The housings are 1.25 m across at z ±12.25 for the same reason, and
 *   all eight read 1.88 m².
 * - **The floods along the caisson's edge are a strip and four housings a
 *   side.** The Bulwark's `floodStrips` at this hull's scale: a 40 m lit
 *   strip inboard of the caisson's rim on the older course, and four lamp
 *   housings outboard of it on the bare rim, lower, so neither covers the
 *   other.
 * - **The tubes are let in, and the doors are what shows.** The block puts
 *   the two tubes "into the bow face either side of the plough plate, with
 *   hinged muzzle doors" and draws neither the bore nor the hinge.
 *   `bowTubes` is the Broadside's door idiom turned through ninety degrees:
 *   a socket sunk 1.2 m behind the face, a flange on the face, the door
 *   shut on it, and the knuckle standing up the door's outboard edge so it
 *   swings out clear of the hull. Built loaded (§3.5), like the Broadside;
 *   nothing points outboard and no casing shows on a flank.
 * - **The plough plate is the stem, full depth.** "A blunt plough bow, a
 *   flat plate face with chamfered corners" and "the plough plate" either
 *   side of which the tubes sit: the face is the caisson's own, flat and
 *   13.6 m wide between the chamfers, and the plough is a wedge plate
 *   5.2 m across its root and 2.6 at its tip, standing 1.5 m proud of the
 *   face on the centreline through the whole 9 m depth of the caisson,
 *   with the hazard band across the crown behind it. No teeth: the Bulwark
 *   rams and this hull does not.
 * - **No stern vents and no stacks aft.** The block names the plant's
 *   louvres and the two stacks and nothing else that exhausts, and puts
 *   "no cowl on anything". Everything this hull vents, it vents off its
 *   back, where the chart reads it — which is also why it needs none of
 *   the Broadside's transom boxes.
 * - **The bridge ports are the citadel's ports.** Three a flank and four
 *   across the bridge face, all boxes proud of their faces in `amber_lamp`,
 *   as the Broadside and the Furnace count them.
 * - **A bow lamp, a crew hatch and a stencil on the foredeck.** The
 *   navigation mark the glow table's floor row licenses at every band, on
 *   the centreline forward of the plant where nothing occludes it; a dogged
 *   hatch to port of it, because the block gives no way into the hull; the
 *   asset number to starboard.
 * - **The tunnels are notched into the stern.** The Tender's idiom as the
 *   Broadside carries it: 3.3 m notches at z ±5.2 with a ring lying in
 *   each and the hub standing to −45, so the transom keeps its square
 *   corners and the stern reads square from above. `propTunnel` names that
 *   ring `prop_shroud_s/p` on every hull in this navy, and the block's "no
 *   baffle, no shroud, no cowl" is the acoustic kind — the block names the
 *   two prop tunnels itself three sentences earlier. The ring lies in the
 *   notch and stands one metre proud of the transom; nothing on this hull
 *   stands off it to cover anything.
 * - **The blisters are under the caisson and nowhere else.** "Ballast
 *   blisters low on the hull" gives no run. Theirs is x 38 to −15, 47 m
 *   between the caps: under the caisson, where the extra plate's weight
 *   is, and ending under its shoulder rather than past it. Aft of the
 *   step a blister would be the widest thing on the drive hull and would
 *   cut the step the outline has to read from 3.5 m to 1.1.
 * - **The plant cylinder is hull black, not plate grey.** The deck it lies
 *   on is grey, and the first cut's grey cylinder was the one part of the
 *   plant the top-down albedo could not tell from the deck under it. Black
 *   drum, grey bands, oxide heads and saddles: the same three finishes the
 *   citadel and the hull carry, read the way the chart reads them.
 *
 * The resting light, as the export's audit counts it from above — and it is
 * the only light, because this hull has one band: the eight louvre slats at
 * 9.75 m² each, the two flood strips at 20.0 m², the two stack throats at
 * 8.25 and 8.13 m², the eight flood housings at 1.88 m², the six citadel
 * ports and four bridge ports at 1.0 m² and the bow lamp at 3.0 m² —
 * thirty-one lit parts, 162.4 m² facing up on a 2,126 m² plan, no part
 * hidden, and every pair symmetric to the cell but the two round throats.
 * That ratio is the point: §3.2 says the Caisson, at E(64) = 43.51, is the
 * one hull in Phase 4 whose lit upward area has to be large, and 7.6 % of
 * the plan is five times the Broadside's 1.3 %. The intake bake at 90 m
 * reads raw E 75.01 and dims by ×0.581 — inside the ×1/64 .. ×64 window,
 * between the Freighter's ×0.527 and the Furnace's ×0.643, so the conn
 * view's lamps, which take the model's own intensity and never the bake's
 * gain (rosterModels.ts), sit near the band the chart shows. There is no
 * second band to scale to: 64 idle and 64 cruise is one state, and
 * `applyLiveGlow` leaves these lamps where they are.
 *
 * 158 parts, 3,688 triangles, seven materials; the file spans x −45 .. 45
 * and z −13.2 .. 13.2 to the centimetre, so the bake neither rescales nor
 * rotates, and meta.json carries no warnings.
 *
 * Where the block, the plan bullet and the visual law disagreed: nowhere
 * that needed the block changed, which is not true of the four hulls before
 * this one. Its resting clause already leads with the louvres — the light
 * with plan area — where the Furnace's led with its bridge ports and had to
 * be turned round to satisfy "Glow encodes loudness" (#786); its one band
 * at every posture is what §3.2 rule 1 asks a model to draw, with nothing
 * left over to clad unlit; and the only transient it names, the muzzle-door
 * flood, is the example rule 3 is written from. Two of its phrases are read
 * rather than taken at the word, and both are said above: "two thirds" is
 * the caisson and not its parallel run, and "no shroud" is the acoustic
 * kind, on a hull whose own block names two prop tunnels.
 *
 * Every part comes from `factions/bathyarch.mjs`; `caissonBox`, `bowTubes`,
 * `plantCylinder` and `exhaustLouvres` were written for this hull there,
 * beside the Broadside's casings and the Furnace's racks. Coordinate tables
 * below are laid out as tables on purpose; `tools/**\/*.mjs` is outside the
 * repo's Prettier scope (package.json) precisely so they can be.
 */
import { THREE, bothSides, exportGlb, metreTrue } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts). Drawn at it: the plough plate at +45, the prop hubs at −45. */
const L = 90;
const BOW = L / 2;
const STERN = -L / 2;

/** The drive hull's half-beam, the caisson's, and the transom 1.2 m inside the stern so the hubs stand to −45. */
const HALF = 9.5;
const WIDE = 13;
const TRANSOM = STERN + 1.2;

/** The caisson's two ends: the bow face it presents and the after edge that is the step. */
const FACE = 43.5;
const SHOULDER = -15;

/** The three decks: the drive hull's, the caisson's own top, and the plant deck on the newer course. */
const DECK = 4.6;
const CROWN = 7.0;
const PLANT = 7.4;

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const vent = bathyarch.ink.amberVent();
const flood = bathyarch.ink.amberFlood();

const root = new THREE.Group();
root.name = 'consortium_caisson';

// The drive hull: a plan in absolute metres, bow first down the starboard
// side and back up the port, 8 m deep and centred on the waterline. Flanks
// parallel at ±9.5 from x 40 to the transom, a short chamfer to a 15 m bow
// face under the caisson, and the two tunnel notches cut 3.3 m into the
// stern at z ±5.2 between the quarters and the centre block. The deck plate
// lies on it a metre and a half inside the rim, notched with it, and the
// rubbing strake runs only where the hull is bare — from the shoulder aft.
bathyarch.boxHull(root, { black, grey, rust }, {
  hull: {
    outline: [
      [43, 7.5], [40, HALF], [TRANSOM, HALF], [TRANSOM, 8.0], [-40.5, 8.0], [-40.5, 2.4], [TRANSOM, 2.4],
      [TRANSOM, -2.4], [-40.5, -2.4], [-40.5, -8.0], [TRANSOM, -8.0], [TRANSOM, -HALF], [40, -HALF], [43, -7.5],
    ],
    depth: 8, y: 0,
  },
  deck: {
    outline: [
      [41.4, 6.5], [39.0, 8.0], [-42.3, 8.0], [-42.3, 6.6], [-39.5, 6.6], [-39.5, 3.8], [-42.3, 3.8],
      [-42.3, -3.8], [-39.5, -3.8], [-39.5, -6.6], [-42.3, -6.6], [-42.3, -8.0], [39.0, -8.0], [41.4, -6.5],
    ],
    depth: 0.6, y: DECK - 0.3,
  },
  strakes: { x: -29.1, y: -3.4, z: HALF, size: [26.4, 0.6, 1.0] },
});

// The caisson: the box bolted over the forward two thirds, x 43.5 to −15,
// 9 m deep from y −2.5 to 6.5 so it wraps the drive hull's flank and stands
// two metres over its deck. Then the two plate courses on its back — the
// older over the whole of it, the newer over everything abaft x 32, so the
// older shows round and ahead of it — the shoulder plate across the after
// face, the plough standing proud of the bow face with the hazard band
// behind it, and sixteen bolt heads a side down the flank at a 3 m pitch.
bathyarch.caissonBox(root, { black, grey, rust, amber }, {
  slab: {
    outline: [[FACE, 6.8], [38, WIDE], [SHOULDER, WIDE], [SHOULDER, -WIDE], [38, -WIDE], [FACE, -6.8]],
    depth: 9, y: 2,
  },
  courses: [
    { outline: [[42.2, 5.8], [36.8, 11.5], [-13.5, 11.5], [-13.5, -11.5], [36.8, -11.5], [42.2, -5.8]], depth: 0.5, y: 6.75, mat: 'rust' },
    { outline: [[32, 10.8], [-13.5, 10.8], [-13.5, -10.8], [32, -10.8]], depth: 0.4, y: 7.2 },
  ],
  shoulder: { at: [SHOULDER - 0.45, 2, 0], size: [0.9, 9, 26] },
  plough: { outline: [[BOW, 1.3], [43.4, 2.6], [43.4, -2.6], [BOW, -1.3]], depth: 9, y: 2 },
  band: { at: [42.7, 6.75, 0], size: [1.4, 0.5, 13] },
  bolts: { from: -13, to: 36, count: 16, r: 0.35, h: 0.6, y: -0.5, z: 12.9 },
});

// The Corvette's two tubes let into the bow face either side of the plough,
// their axes on the keel line at y 2 and z ±4.5: the socket sunk 1.2 m
// behind the face, the flange on it, the door shut, and the hinge up the
// door's outboard edge.
bathyarch.bowTubes(root, { black, grey, rust }, {
  x: FACE, y: 2, z: 4.5,
  socket: { r: 2.1, depth: 1.2 },
  flange: { r: 2.1, width: 0.35 },
  door: { r: 1.85, h: 0.45 },
  hinge: { r: 0.35, h: 4.4, out: 1.9 },
});

// The plant's pressure cylinder along the spine, x 4 to 28 with its dished
// heads out to 30.2 and 1.8, three bands round it and two saddles under it
// on the plant deck.
bathyarch.plantCylinder(root, { black, grey, rust }, {
  at: [16, 10.3, 0], r: 2.6, length: 24,
  bands: { x: [8, 16, 24], r: 2.8, width: 0.7 },
  heads: { length: 2.2, tipR: 1.4 },
  saddles: { x: [8, 24], y: PLANT + 0.25, size: [2.6, 0.5, 5.8] },
});

// The two stacks abreast of the cylinder at z ±4.8, starboard first: the
// stack, its hazard band, and the lit throat collar at the mouth — a hair
// wider than the stack, so the whole disc faces up.
bothSides((side, sgn) => {
  bathyarch.stack(root, black, { name: `stack_${side}`, at: [21, 10.1, sgn * 4.8], r: 1.9, rTop: 1.6, height: 5.4 });
  bathyarch.stackBand(root, amber, { name: `stack_band_${side}`, at: [21, 11.8, sgn * 4.8], r: 2.0, h: 0.6 });
  bathyarch.stackBand(root, vent, { name: `stack_throat_${side}`, at: [21, 13.2, sgn * 4.8], r: 1.7, h: 0.8 });
});

// The louvre ranks down each side of the plant, x 9.5 to 22.5: four slats a
// side at a metre's pitch across a 3.75 m band at z ±8.75, over a well of
// hull black, no shutters. The brightest light on the hull and the largest;
// the slat's width is the raster's, and the header says why.
bathyarch.exhaustLouvres(root, { black, flood }, {
  x: 16, y: 7.7, z: 8.75, length: 13,
  well: { y: PLANT - 0.25, size: [13.6, 0.5, 4] },
  slats: { count: 4, pitch: 1, slat: 0.8, tilt: 0.5, t: 0.15 },
});

// The floods along the caisson's edge: a 40 m lit strip a side on the older
// course inboard of the rim, and four lamp housings a side outboard of it
// on the bare rim, lower, so neither covers the other.
bathyarch.floodStrips(root, { flood, lampM }, {
  strip: { x: 11, y: 7.15, z: 11, size: [40, 0.3, 0.5] },
  lamps: { count: 4, x: -6, pitch: 12, y: 7, z: 12.25, size: [1.4, 1, 1.25] },
});

// The low bridge citadel abaft the plant, on the caisson's after end: the
// block, the bridge set back on it, the visor across the block's forward
// face, three ports a flank and four across the bridge face.
bathyarch.citadel(root, { black, grey, rust, lampM }, {
  block: { at: [-9, PLANT + 2.25, 0], size: [10, 4.5, 14] },
  top: { at: [-10, 12.8, 0], size: [6.5, 1.8, 9] },
  visor: { at: [-3.4, 11, 0], size: [1.2, 1.4, 14.2] },
  ports: { count: 3, x: -12.5, pitch: 3.5, y: 9.6, z: 7.25, size: [2.2, 1.4, 0.5] },
  bridgePorts: { x: -6.5, y: 12.9, z: [-3, -1, 1, 3], size: [0.5, 1.2, 2] },
});

// Ballast blisters low on both flanks under the caisson, capped fore and
// aft: 47 m between the caps, reaching z 12.7 — inside the caisson's 13 —
// and stopping a metre short of the shoulder, so nothing bridges the step.
bathyarch.ballastBlisters(root, { grey, rust }, {
  x: 11.5, y: -4.5, z: 10.7, r: 2, length: 47,
  caps: { length: 3, fore: 36.5, aft: -13.5, tipR: 1.2 },
});

// The two prop tunnels, one lying in each stern notch: the shroud's after
// face a metre proud of the transom and the hub standing to −45.
bothSides((side, sgn) =>
  bathyarch.propTunnel(root, { grey, black }, {
    name: side, at: [-43.6, -1.2, sgn * 5.2], r: 2.6, length: 2.4, hub: { r: 0.9, length: 2.8 },
  })
);

// The patchwork: older plate flush on the newer course to starboard, abeam
// the cylinder's fore head, where oxide on grey reads and oxide on the older
// course forward of it would not; newer on the citadel's starboard flank
// under its ports — a plate over a lit port is a port the chart loses — and
// newer on the bare port flank of the drive hull abaft the step.
bathyarch.repairPatches(root, bathyarch.inFrame, { rust, grey }, {
  patches: [
    ['patch_deck', 'rust', [5, 0.3, 4], [26, 7.55, 7.5]],
    ['patch_citadel_s', 'grey', [3.5, 1.2, 0.4], [-11, 8.6, 7.1]],
    ['patch_flank_p', 'grey', [3.5, 1.6, 0.4], [-28, -1.5, -9.7]],
  ],
});

// Rivets: fourteen a side along the older course's rim in grey, eight a side
// along the drive hull's strake in black, numbered by their place in the
// file as the Bulwark's and the Tender's are. Then the stencil to starboard
// on the foredeck, the hatch to port of the bow lamp, and the lamp itself on
// the centreline where nothing can occlude it.
bathyarch.rivetRows(root, grey, { from: -12, to: 36, count: 14, y: CROWN - 0.15, z: 11.9, size: [0.6, 0.3, 0.6] });
bathyarch.rivetRows(root, black, { from: -41, to: -17, count: 8, y: -3.4, z: 10, size: [0.5, 0.5, 0.35] });
bathyarch.bowStencil(root, amber, { at: [35, CROWN + 0.15, 5], size: [6, 0.3, 1.3] });
bathyarch.doggedHatch(root, { hatch: rust, wheel: grey }, {
  name: 'deck_hatch', at: [37, CROWN + 0.25, -5], r: 1.3, h: 0.5, wheel: { R: 0.55, t: 0.1, dy: 0.35 },
});
bathyarch.bowLamp(root, lampM, { at: [40, CROWN + 0.15, 0], size: [1.2, 0.8, 3] });

// Metre-true as drawn: 90 from the prop hubs to the plough plate's face, so
// the scale this returns is 1 and the root carries nothing.
const k = metreTrue(root, L, { drawn: L });
if (Math.abs(k - 1) > 1e-6) throw new Error(`consortium_caisson: root scale ${k}, expected 1`);

await exportGlb(root, 'caisson-bathyarch.glb');
