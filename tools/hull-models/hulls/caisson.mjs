/**
 * The Caisson — the Consortium's line hull, 90 m (docs/units.md, "The line
 * hulls, and the anchor"; #787, off #540 Phase 4; rebuilt to the same block
 * in #1956).
 *
 * "The line hull that cannot hide and has stopped trying, 90 m — a Corvette
 * with a third more plate, a slower drive, and a plant that runs at one
 * volume whether or not it is moving, four above the Klaxon's line at every
 * posture (SIG 64 idle, 64 cruise, +25 firing; the Corvette's gun, 50 at
 * 550 m; 560 hull; 70 m/s; PR 2; 170 nodules). A pressure box: the
 * skirmisher's wedge made in riveted plate and no longer tapering — a blunt
 * plough bow, a flat plate face with chamfered corners, flanks parallel from
 * the shoulders aft to the step at two thirds of the length, then a step in
 * to the bare drive hull and a square stern with two prop tunnels. The drive
 * hull is bare of plate, not of drive: its ring frames stand unclad at the
 * pitch the caisson is bolted to, and the drive lies along its back in the
 * open, a banded pressure drum a side from the shoulder aft to a drive leg
 * down into its prop tunnel. The caisson is the
 * step: a box of heavier plate bolted over the forward two thirds, riveted,
 * patchworked older-under-newer, its after edge standing proud of the drive
 * hull as a shoulder — the third more plate, visible in the plan. On its
 * back the plant: a riveted pressure cylinder lying fore-and-aft along the
 * spine with dished heads, two stacks abreast of it, and a rank of exhaust
 * louvres down each side that have no shutters, because there is nothing
 * aboard to throttle. The Corvette's two torpedo tubes let into the bow face
 * either side of the plough plate, with hinged muzzle doors; a low bridge
 * citadel abaft the plant; ballast blisters low on the hull. Nothing aboard
 * is there to quiet it: no baffle, no acoustic shroud, no cowl on anything.
 * Burning bright at rest and under way alike —
 * the louvres the brightest thing on the hull, the stacks lit at the throat,
 * floods along the caisson's edge and the bridge ports — because the loud
 * state is the only state; the muzzle doors flood for the instant of a
 * launch. No dim state is drawn: the one quiet this hull has is Silent
 * Running, and that is the trade stated once — the quiet or the 12%, never
 * both."
 * (docs/asset-prompts-3d.md, UNIT — Caisson)
 *
 * Built to that block and not ported from a binary, like the Broadside and
 * the Furnace (docs/models-plan.md §3.1), and built twice. The first cut
 * (#787) followed the block's plan and read, on a lit table, as a flat raft
 * bolted to a box: abaft the step a 19 m grey deck with nothing on it and
 * nothing joining it to the caisson, the caisson's flank a sheer black wall,
 * its shoulder one flat face, its louvres slats 0.15 m thick over a well
 * flush with the deck, and its blisters inside the box's overhang. #1956
 * rebuilt the script to the same block; the one sentence the block gained is
 * the one about the drive hull, and the foot of this header says why.
 *
 * One lighting band at every posture, so everything the block lights at rest
 * is lit and no part on this hull wears the lamp family's unlit finish (§3.2
 * rules 1 and 2); the muzzle-door flood is a launch transient and is not a
 * lamp (rule 3), so the doors are plain cladding. Metre-true at 90 with no
 * root scale: the plough plate is the bow at x 45 and the two prop hubs are
 * the stern at −45 (`metreTrue` asserts it); port is −z (#642).
 *
 * THE PLAN, as the file measures. The drive hull is the Tender's `boxHull`,
 * 19 m across its parallel flanks — 0.21 of the length — and 8 m deep,
 * running from x 43 under the caisson's bow to a square transom at −43.8
 * notched twice for the tunnels. The caisson is a second box bolted over it
 * from the bow face at x 43.5 to the after face of its flange at −15, which
 * is the two-thirds station of a hull spanning ±45: 58.5 m of the 90, 26 m
 * across its flanks and 7.5 m deep, from a skirt at y −1 to a crown at 6.5,
 * its rim chamfered 0.6 m. Its flank is parallel from x 38 to the flange,
 * 53 m, which is 0.59 of the length rather than two thirds because the
 * chamfer to the bow face takes 5.5 m of it; the block's fraction is the
 * step's station. The box stands 3.5 m of half-beam proud of the drive hull
 * on each side, and that is the step. The file's beam is 26.5 m, 0.294 of
 * its length, set by the flange at z ±13.25; the flank's bolt heads and the
 * strake's rivets reach ±13.2. The flange's after face is at x −15 and the
 * sixteen bolt heads on it stand 0.4 m abaft that, to x −15.4 and out to
 * z ±12.65; abaft those nothing reaches past the drive hull's strake at
 * ±10.0. So the step is 3.25 m a side in the file, flange to strake, and
 * 3.15 m as `outlines.mjs` cuts it: 0.146 of the length at x −0.162 to
 * 0.111 at −0.175 (hullOutlines.generated.ts).
 *
 * WHAT MAKES IT ONE HULL. Four things cross the step or repeat either side
 * of it, and each is a part of the machine rather than a tie drawn on:
 *
 * - **The drive.** The drive is on the drive hull and in the open: a
 *   pressure drum a side over its tunnel, z ±5.2, the drive's own vessel as
 *   the cylinder on the caisson's back is the plant's. Nothing covers it
 *   and it covers nothing, which is the block's "no baffle, no acoustic
 *   shroud, no cowl on anything" kept. A six-plate drum of 2.3 m radius,
 *   its axis at y 4.3, 0.6 m under the deck plate's top, from the flange at
 *   x −15 to −37 and a dished head on to −39.2; out of the shoulder through
 *   a flange in the older plate, with three grey bands, the plant
 *   cylinder's vocabulary at a lesser radius. The head runs 0.3 m into a
 *   drive leg, a box 2.6 m across in the older plate from x −38.9 to −41.7,
 *   which stands 0.9 m over the deck at the notch's forward wall and goes
 *   down the notch to y −2.3, 0.3 m under the hub; the hub, on the shaft
 *   line at y −1.2, runs from the stern at −45 forward through its shroud
 *   to −41.5, 0.2 m into the leg. Flange, drum, head, leg, hub, shroud:
 *   `contacts.mjs --near 0` lists each pair, so each stage meets the next
 *   and the block's "from the shoulder aft to a drive leg down into its
 *   prop tunnel" is the file. What joins the drums to the plant is under
 *   the caisson's plate and is not drawn.
 * - **The shoulder still stands proud, from the beam as from above.** The
 *   drum's crown is at y 6.29, its bands at 6.47 and its flange ring at
 *   6.55; the caisson's crown is at 6.5 and the shoulder flange's at 6.75.
 *   So the drive's back runs 0.2 to 0.5 m under the flange's edge all the
 *   way aft: near enough level that the hull has one back, and under the
 *   flange, so the step is a step in elevation too. The second cut's drums
 *   stood to 6.89, over the caisson's crown, and closed it (#1956 review).
 * - **The frames.** Eight ring frames stand bare on the drive hull at x −18
 *   to −39, a 3 m pitch, 0.4 m proud of the flank and 0.3 of the deck
 *   plate, in the older plate — unclad, and never replated. The caisson's
 *   seventeen bolt heads a side run x −12 to 36 at the same pitch, so the
 *   rank that is bolts forward is frames aft, one station each side of the
 *   flange. The drums' bands sit on the frames at −21, −27 and −33. They
 *   were grey for a round and read as a rank of white posts from the stern
 *   quarter, the loudest thing abaft the step (#1956 review).
 * - **The stays.** Four raking stays, at z ±1.7 and ±8.65, run from y 6.3
 *   in the flange down to y 5.0 in the first frame, whose top is at 5.2.
 * - **The lit edge.** The flood strips run the caisson's two flanks and a
 *   third lies across the flange's crown, so the caisson's after edge is
 *   drawn in light on the chart and in the conn view both.
 *
 * What the script decided that the block does not say:
 *
 * - **The caisson is a second box, not a tier, and it ends in a flange.**
 *   The block says "bolted over" and "standing proud of the drive hull as a
 *   shoulder"; `caissonBox` (`factions/bathyarch.mjs`) is the box, and its
 *   after face is a flange 1.2 m thick in the older plate, 0.25 m proud of
 *   the box all round, with eight bolt heads on each wing and the two drive
 *   drums' own flange rings against its after face. The first cut's shoulder
 *   was one plate 26 m by 9.
 * - **The skirt is at y −1, and the blisters hang under it.** "Ballast
 *   blisters low on the hull" gives no run. The first cut's box came down
 *   to −2.5 with the blisters inside its overhang. This one stops 3 m above
 *   the keel, and each blister — a six-plate drum of 2 m radius, 47 m
 *   between its caps, x −15 to 38 — hangs with its crown plate against the
 *   skirt and its outboard vertex at z 12.9, a tenth of a metre inside the
 *   box's flank, so nothing stands outboard of it and the conn camera sees
 *   the drum. Eight straps in the older plate ring each one at a 6 m pitch,
 *   every second bolt station, and reach 13.05. They end under the flange,
 *   as before: aft of the step a blister would be the widest thing on the
 *   drive hull.
 * - **The patchwork is a belt and two courses.** "Riveted, patchworked
 *   older-under-newer" names no fixture. On each flank, `flankPlates` in a
 *   0.8 m gauge: two newer grey plates forward, 13 and 16 m long and not
 *   the same height, an older one in oxide abaft them, 19 m and riding
 *   higher, a metre of the box showing between each, over a strake of older plate
 *   50.4 m long with sixteen rivets on it. On the back, an older course in
 *   oxide over the whole crown and a newer grey course over everything
 *   abaft x 32, with sixteen rivets a side on the bare rim outboard of
 *   them, set between the bolt stations and between the flood housings.
 *   Three repair patches carry the rest, none mirrored and each a newer
 *   grey plate on what is older or bare: one on the older course to port
 *   of the foredeck, one on the citadel's starboard flank, one on the
 *   drive hull's port flank. Nothing older lies on anything newer. The
 *   foredeck patch was an oxide plate on the newer course from #787 until
 *   #1956's review — older over newer, the block's phrase turned round.
 *   The belt is read the same way: its three plates and its strake hang
 *   side by side at one gauge on the box, none over another, so the older
 *   plate there is beside the newer and not on it.
 * - **The plant is one machine.** The block gives the cylinder, "two stacks
 *   abreast of it, and a rank of exhaust louvres down each side", and no
 *   stations. A side: a plenum of hull black 20 m by 5.7, standing 1.6 m
 *   off the plant deck abreast of the cylinder from x 6 to 26; two ducts
 *   into it from under the cylinder at x 12 and 20, each a trunk 1.3 m
 *   tall on the plant deck from z 1.0 to 5.2 — its top at y 8.7 is 0.65 m
 *   through the drum's keel plate at 8.05, inside the drum from z 1.0 to
 *   1.68, and its outboard end 0.3 m inside the plenum's wall
 *   (`contacts.mjs --near 0` lists duct and cylinder, duct and plenum; the
 *   second cut's trunks stopped at z 2.0, where the drum's flank is at
 *   y 9.26, and met nothing but the plenum, #1956 review); the louvre rank on
 *   its roof, 13 m of blade hung between two cheeks from x 6 to 20; and the
 *   stack on its fore end at x 23, z ±7.75, abreast of the cylinder's
 *   forward band.
 *   The first cut stood the stacks on the deck inboard of the louvres with
 *   nothing joining any of the three.
 * - **The louvres are blades, and the chart's light.** Four a side, each a
 *   metre across and 0.3 thick at 0.6 rad, on a 1.5 m pitch, the port
 *   rank's tilt the negation of the starboard's: 0.8 m tall on the plenum's
 *   roof, a metre of plan each (`slat·cos(tilt) + t·sin(tilt)` is 0.99) and
 *   half a metre of plenum showing between them. 104.0 m² of the hull's
 *   202.3, so "the brightest thing on the hull" is true by area as well as
 *   by material.
 * - **Lamps are sized to the raster, and the flange makes the raster
 *   symmetric.** The maps bake at 4 px/m from the file's own bounds. The
 *   first cut's beam was 26.4 m, 105.6 cells, so a mirrored pair was not
 *   sampled alike and its slats had to be placed to the cell. This beam is
 *   26.5 m to the bit — set by the flange alone, one box about the keel,
 *   with the bolt heads and the strake's rivets 5 cm inside it at ±13.2 —
 *   under a root scale of exactly 1, which the foot of this script holds.
 *   So the bake is 360 by 106 px with cell edges on every quarter metre
 *   either side of the keel, and a lamp whose edges are on quarter metres
 *   reads the same to port and to starboard: the slats, the three strips
 *   and the housings are cut that way, and every mirrored pair in the
 *   audit below reads the same area. In the shipped emissive map the two
 *   halves sum to the same figure and 40 px differ from their mirror, all
 *   on the sloped edges of the two six-plate stack throats, where the
 *   bake's multisampling is not mirror-symmetric. The second cut claimed
 *   106 cells and baked 107: its hubs ended at a station a float rounds,
 *   the root took a scale of 1 + 5e-10, and 614 px differed (#1956 review).
 * - **The floods are three strips and eight housings.** The Bulwark's
 *   `floodStrips` at this hull's scale: a 44.5 m strip a side on the older
 *   course inboard of the rim, four housings a side outboard of it standing
 *   over the chamfer, and the third strip across the flange's crown.
 * - **The tubes are let in, and the doors are what shows.** `bowTubes` is
 *   the Broadside's door idiom turned through ninety degrees: a socket sunk
 *   1.2 m behind the face, a flange on the face, the door shut on it, and
 *   the knuckle standing up the door's outboard edge. Built loaded (§3.5);
 *   nothing points outboard and no tube shows on a flank.
 * - **The plough plate is the stem, through both hulls.** A wedge plate
 *   4.6 m across its root and 2.6 at its tip, standing 1.5 m proud of the
 *   face on the centreline from y −4 to 6.5 — the drive hull's keel to the
 *   caisson's crown, 10.5 m — with the hazard band across the crown behind
 *   it. No teeth: the Bulwark rams and this hull does not.
 * - **The drive hull's deck plate is laid only where the hull is bare**,
 *   x −43.2 to −14.2 and ±9.1, 0.9 m thick on the hull's top at y 4.0 and
 *   notched to the hull's own notches. The first cut ran it the full length
 *   under the caisson, where nothing reads it; the second and third laid
 *   it 0.3 m clear of the hull, with notches narrower and shorter than the
 *   hull's (#1956 review).
 * - **No stern vents and no stacks aft.** The block names the plant's
 *   louvres and the two stacks and nothing else that exhausts, and puts "no
 *   cowl on anything". The drive drums are pressure vessels and vent
 *   nothing.
 * - **The bridge ports are the citadel's ports.** Three a flank and four
 *   across the bridge face, all boxes proud of their faces in `amber_lamp`,
 *   as the Broadside and the Furnace count them; the bridge ports 1.4 m
 *   across on a 2 m pitch, so they bake as four (#787 review).
 * - **A bow lamp, a stencil and two hatches.** The navigation mark the glow
 *   table's floor row licenses at every band, on the centreline forward of
 *   the plant; the asset number to starboard of it; a dogged hatch to port,
 *   because the block gives no way into the hull, and a second on the drive
 *   hull's deck between the drums. Both are `deckHatches`, which lays the
 *   wheel on the coaming; the first cut's stood 13 mm over it.
 * - **The tunnels are notched into the stern, and hold their shrouds.** The
 *   Tender's idiom as the Broadside carries it: 3.3 m notches at z ±5.2
 *   with a ring lying in each and the hub standing to −45, so the transom
 *   keeps its square corners, and the drive leg in the forward 1.2 m of
 *   each, 0.7 m clear of the ring. The notches are 5.1 m wide and the
 *   six-plate shroud 5.2 across its vertices, so the ring bears on both
 *   walls; the first cut's notch was 5.6 and its ring met nothing but its
 *   own hub.
 *   `propTunnel` names that ring `prop_shroud_s/p` on every hull in this
 *   navy, and the block's "no baffle, no shroud, no cowl" is the acoustic
 *   kind — the block names the two prop tunnels itself.
 * - **The plant cylinder is hull black, not plate grey**, and so are the
 *   drive drums: black drum, grey bands, oxide heads, flanges and legs, on
 *   a grey deck that could not otherwise tell a grey drum from itself.
 *
 * The resting light, as the audit counts it from above — and it is the only
 * light, because this hull has one band: the eight louvre blades at 13.0 m²
 * each, the two flank strips at 22.25 m² and the after strip at 11.25, the
 * two stack throats at 7.75, the eight flood housings at 1.88, the six
 * citadel ports at 1.0, the four bridge ports at 0.75 and the bow lamp at
 * 3.0 — thirty-two lit parts, 202.3 m² facing up on a 2,083 m² plan, no part
 * hidden, none floating, and each pair the same area. That is 9.7 % of the
 * plan, where §3.2 says the Caisson, at E(64) = 43.51, is the one hull in
 * Phase 4 whose lit upward area has to be large. The bake at 90 m and
 * 4 px/m reads raw E 92.78 and dims by ×0.469 — inside the ×1/64 .. ×64
 * window with thirty-fold headroom to its floor, under the first cut's
 * ×0.581 because the blades and the third strip added 42 m². The conn
 * view's lamps take the model's own intensity and never the bake's gain
 * (rosterModels.ts), so they rest 2.13 times over what the chart shows,
 * where the first cut's rested 1.72 times over. There is no second band to scale to: 64 idle and 64 cruise is
 * one state, so `applyLiveGlow` leaves these lamps where they are at rest
 * and under way alike. The +25 of a launch still scales them.
 *
 * 257 parts, 4,660 triangles, seven materials, where the first cut carried
 * 158, 2,832 and the same seven; the file spans x −45 .. 45 and z −13.25 ..
 * 13.25 exactly, so the bake neither rescales nor rotates, and meta.json
 * carries no warnings.
 *
 * Where the block, the plan bullet and the visual law disagreed. The block
 * said "the bare drive hull" and named nothing on it, and the first cut
 * took that at the word: nothing abaft the shoulder but a strake, eight
 * rivets a side and one patch. The art direction's silhouette rule wants a hull that reads
 * at a glance, and a third of this one read as a raft. So the block gained a
 * sentence, quoted above: bare is bare of *plate*, the frames the caisson is
 * bolted to stand unclad, and the drive is on the drive hull, in the open.
 * That sentence was reworded once in review: it first called the drums
 * "casings", and a casing is an enclosure over machinery — the thing the
 * block's next lines forbid on this hull. They are the drive's pressure
 * vessels, and one word names them here, in the block and in the file:
 * drum. Nothing else in the block moved. Two of its phrases are still read rather than taken at the
 * word: "two thirds" is the caisson and not its parallel run, and "no
 * shroud" is the acoustic kind.
 *
 * Every part comes from `factions/bathyarch.mjs`. `caissonBox`, `bowTubes`,
 * `plantCylinder` and `exhaustLouvres` were written for this hull there in
 * #787; #1956 added `plantDucts`, `ringFrames`, `driveDrums` and
 * `shoulderStays`, a chamfer and shoulder bolts to `caissonBox`, a plenum's
 * `well.x` and `cheeks` to `exhaustLouvres`, `straps` to `ballastBlisters`,
 * `after` to `floodStrips` and `hub.x` to `propTunnel` — each an option
 * another hull's call leaves unset, so no other file moved. Coordinate tables below are laid out as
 * tables on purpose; `tools/**\/*.mjs` is outside the repo's Prettier scope
 * (package.json) precisely so they can be.
 *
 * FACETS AND PANELS (#919). The Klaxon's rule is one facet edge of 2.5 m
 * (docs/asset-prompts-3d.md Block 2c; bathyarch.mjs `cut`), and every round
 * part here asks it: the bow tubes, their flanges and doors, the plant
 * cylinder and its heads, the stacks, the blisters, their caps and straps,
 * the drive drums, their flanges, bands and heads, the shrouds, hubs,
 * bolts and hatches six plates, the plant's 2.8 m bands eight. The blisters
 * and the drums are laid with a plate on the crown, so a blister's crown
 * is an apothem, 1.73 m, over its axis and its axis is 1.7 m under the
 * skirt. The median unlit part reads 1.50 m on a side from above, inside
 * the hull band of 0.75–2 m; the first cut read 0.94.
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

/** The caisson's two ends: the bow face it presents, and the after face of the flange it ends in, which is the step. */
const FACE = 43.5;
const SHOULDER = -15;

/** The caisson's chamfer, and its skirt: the underside of the box, where the blisters' crowns meet it. */
const RIM = 0.6;
const SKIRT = -1;

/** The decks, each its top face: the drive hull's deck plate, the caisson's crown, the older course on it, and the plant deck on the newer. */
const DECK = 4.9;
const CROWN = 6.5;
const OLDER = 7.0;
const PLANT = 7.4;

/** The pitch the caisson is bolted at, and the drive hull's frames stand at: one number, because the bolts are into the frames. */
const PITCH = 3;

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
// stern at z ±5.2, 5.1 m wide, between the quarters and the centre block.
// Its deck plate is laid only where the hull is bare, x −14.2 to −43.2:
// 0.9 m thick on the hull's top, y 4.0 to 4.9, 0.4 m inside each flank and
// 0.6 inside the transom, its two notches the hull's own to the wall. The
// rubbing strake runs the bare flank too, x −15 to the transom.
bathyarch.boxHull(root, { black, grey, rust }, {
  hull: {
    outline: [
      [43, 7.5], [40, HALF], [TRANSOM, HALF], [TRANSOM, 7.75], [-40.5, 7.75], [-40.5, 2.65], [TRANSOM, 2.65],
      [TRANSOM, -2.65], [-40.5, -2.65], [-40.5, -7.75], [TRANSOM, -7.75], [TRANSOM, -HALF], [40, -HALF], [43, -7.5],
    ],
    depth: 8, y: 0,
  },
  deck: {
    outline: [
      [-14.2, 9.1], [-43.2, 9.1], [-43.2, 7.75], [-40.5, 7.75], [-40.5, 2.65], [-43.2, 2.65],
      [-43.2, -2.65], [-40.5, -2.65], [-40.5, -7.75], [-43.2, -7.75], [-43.2, -9.1], [-14.2, -9.1],
    ],
    // On the hull's top and up to DECK: the second and third cuts laid a
    // 0.6 m plate centred 0.3 m under DECK, which is 0.3 m of water between
    // the plate and the hull the length of it (#1956 review).
    depth: DECK - 4, y: (DECK + 4) / 2,
  },
  strakes: { x: -29.4, y: -3.4, z: HALF, size: [28.8, 0.6, 1.0] },
});

// The caisson: the box bolted over the forward two thirds, x 43.5 to −15,
// 7.5 m deep from its skirt at y −1 to its crown at 6.5, its rim chamfered
// 0.6 m so the outline here is its top face and its flank stands at ±13.
// Then the two plate courses on its back — the older over the whole of it,
// the newer over everything abaft x 32, so the older shows round and ahead
// of it — the flange it ends in, a quarter of a metre proud of the box all
// round, with eight bolt heads on each wing of its after face; the plough
// through the whole depth of the bow with the hazard band behind it; and
// seventeen bolt heads a side down the flank at the frames' pitch.
bathyarch.caissonBox(root, { black, grey, rust, amber }, {
  slab: {
    outline: [
      [FACE - RIM, 6.5], [37.75, WIDE - RIM], [SHOULDER + RIM, WIDE - RIM],
      [SHOULDER + RIM, -(WIDE - RIM)], [37.75, -(WIDE - RIM)], [FACE - RIM, -6.5],
    ],
    depth: CROWN - SKIRT - 2 * RIM, bevel: RIM, y: (CROWN + SKIRT) / 2,
  },
  courses: [
    { outline: [[41.4, 6.0], [36.6, 11.6], [-13.8, 11.6], [-13.8, -11.6], [36.6, -11.6], [41.4, -6.0]], depth: OLDER - CROWN, y: (OLDER + CROWN) / 2, mat: 'rust' },
    { outline: [[32, 10.7], [-13.2, 10.7], [-13.2, -10.7], [32, -10.7]], depth: PLANT - OLDER, y: (PLANT + OLDER) / 2 },
  ],
  shoulder: {
    at: [SHOULDER + 0.6, 2.75, 0], size: [1.2, 8, 26.5],
    bolts: {
      r: 0.35, h: 0.5, x: SHOULDER - 0.15,
      at: [[5.6, 10.7], [5.6, 12.3], [3.6, 10.7], [3.6, 12.3], [1.6, 10.7], [1.6, 12.3], [-0.4, 10.7], [-0.4, 12.3]],
    },
  },
  plough: { outline: [[BOW, 1.3], [42.8, 2.3], [42.8, -2.3], [BOW, -1.3]], depth: CROWN + 4, y: (CROWN - 4) / 2 },
  band: { at: [42.2, CROWN + 0.25, 0], size: [1.4, 0.5, 12.6] },
  bolts: { from: -13.5, to: 37.5, count: 17, r: 0.35, h: 0.6, y: 5.45, z: 12.9 },
});

// The belt: the caisson's flank in plate, older under newer. Two newer grey
// plates forward and an older one in oxide abaft them riding higher, a
// metre of the box showing between each, over a strake of older plate
// 50.4 m long; sixteen rivets a side along the strake. The plates
// stand 0.1 m proud of the box and the rivets and the bolt heads to 13.2,
// 5 cm inside the flange, which alone sets the file's beam: the flange is
// one box about the keel, 13.25 to the bit, where a head at 12.9 + 0.3 is
// 13.2 and a float's rounding over (the header's raster bullet).
bathyarch.flankPlates(root, { grey, rust }, {
  z: 12.7, plateT: 0.8,
  plates: [[30, 13, 4, 3, false], [14.5, 16, 3.4, 2.7, false], [-4, 19, 3, 3.5, true]],
  seamLength: 50.4, seam: { x: 11.5, y: 0.1, h: 1.0, t: 0.8, z: 12.7 },
});
bathyarch.rivetRows(root, grey, { from: -13.5, to: 36.5, count: 16, y: 0.1, z: 13.1, size: [0.5, 0.5, 0.2] });
// Sixteen more a side on the caisson's bare rim at z ±12, x −10.5 to 34.5
// at the bolts' pitch and half a pitch off their stations, which is also
// clear of the four flood housings.
bathyarch.rivetRows(root, grey, { from: -12, to: 36, count: 16, y: CROWN + 0.15, z: 12, size: [0.6, 0.3, 0.6] });

// The Corvette's two tubes let into the bow face either side of the plough,
// their axes at y 2 and z ±4.5: the socket sunk 1.2 m
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

// What the plant exhausts through, a side: a plenum 20 m long standing
// 1.6 m off the plant deck abreast of the cylinder, two ducts into it from
// under the cylinder — each carried in to z 1, where its top is 0.65 m
// through the drum's keel plate — the louvre rank on its roof over 13 m —
// four blades a metre across at a 1.5 m pitch, hung between two cheeks, no
// shutters — and the stack standing on its fore end.
const PLENUM = PLANT + 1.6;
const BANK = 7.75;
bathyarch.plantDucts(root, rust, { x: [12, 20], y: PLANT + 0.65, z: 3.1, size: [2.2, 1.3, 4.2] });
bathyarch.exhaustLouvres(root, { black, flood, rust }, {
  x: 13, y: PLENUM + 0.36, z: BANK, length: 13,
  well: { x: 16, y: PLANT + 0.8, size: [20, 1.6, 5.7] },
  slats: { count: 4, pitch: 1.5, slat: 1.0, tilt: 0.6, t: 0.3 },
  cheeks: { y: PLENUM + 0.45, size: [0.5, 0.9, 5.7] },
});

// The two stacks, starboard first, each on its plenum's fore end abreast of
// the cylinder: the stack, its hazard band, and the lit throat collar at
// the mouth — a hair wider than the stack, so the whole disc faces up.
bothSides((side, sgn) => {
  bathyarch.stack(root, black, { name: `stack_${side}`, at: [23, PLENUM + 2.2, sgn * BANK], r: 1.9, rTop: 1.6, height: 4.4 });
  bathyarch.stackBand(root, amber, { name: `stack_band_${side}`, at: [23, PLENUM + 3.2, sgn * BANK], r: 2.0, h: 0.6 });
  bathyarch.stackBand(root, vent, { name: `stack_throat_${side}`, at: [23, PLENUM + 4.8, sgn * BANK], r: 1.7, h: 0.8 });
});

// The floods along the caisson's edge, all three sides of it: a lit strip a
// side on the older course inboard of the rim, x −13.75 to 30.75; four lamp
// housings a side outboard of it, let 0.1 m into the crown and standing
// 0.35 m out over the chamfer; and a third strip across the flange's crown,
// z ±11.25 — half a metre abaft the other two's after ends and a quarter of
// a metre under them, so the three do not touch. The step, lit.
bathyarch.floodStrips(root, { flood, lampM }, {
  strip: { x: 8.5, y: OLDER + 0.15, z: 11.0, size: [44.5, 0.3, 0.5] },
  lamps: { count: 4, x: -6, pitch: 12, y: CROWN + 0.4, z: 12.125, size: [1.5, 1, 1.25] },
  after: { at: [SHOULDER + 0.5, 6.9, 0], size: [0.5, 0.3, 22.5] },
});

// The low bridge citadel abaft the plant, on the caisson's after end: the
// block, the bridge set back on it, the visor across the block's forward
// face, three ports a flank and four across the bridge face.
bathyarch.citadel(root, { black, grey, rust, lampM }, {
  block: { at: [-8.5, PLANT + 2.25, 0], size: [9, 4.5, 14] },
  top: { at: [-9.75, 12.8, 0], size: [6, 1.8, 9] },
  visor: { at: [-3.4, 11, 0], size: [1.2, 1.4, 14.2] },
  ports: { count: 3, x: -11.5, pitch: 3, y: 9.6, z: 7.25, size: [2.2, 1.4, 0.5] },
  bridgePorts: { x: -6.5, y: 12.9, z: [-3, -1, 1, 3], size: [0.5, 1.2, 1.4] },
});

// Ballast blisters low on both flanks, hung under the caisson's skirt: a
// six-plate drum 47 m between its caps with a plate on its crown against
// the skirt and a vertex outboard at z 12.9, a tenth of a metre inside the
// box's flank, strapped in older plate at every second bolt station, and
// stopping under the flange, so nothing bridges the step.
bathyarch.ballastBlisters(root, { grey, rust }, {
  x: 11.5, y: SKIRT - 1.7, z: 10.9, r: 2, length: 47,
  caps: { length: 3, fore: 36.5, aft: -13.5, tipR: 1.2 },
  straps: { x: [-9, -3, 3, 9, 15, 21, 27, 33], r: 2.15, width: 0.6 },
});

// The bare drive hull: eight ring frames in the older plate at the bolts'
// pitch from x −18 to −39, standing 0.4 m proud of the flank and 0.3 of the
// deck plate; four stays raking from the flange down to the first frame;
// and the drive — a pressure drum a side over each tunnel, its axis 0.6 m
// under the deck plate's top, from its flange on the shoulder to its head,
// banded at three of the seven frames it crosses, and the head into a drive
// leg that stands through the deck at the notch's forward wall and goes
// down the notch to 1.1 m under the shaft line.
const FRAMES = Array.from({ length: 8 }, (_, i) => -18 - i * PITCH);
const SHAFT = -1.2;
bathyarch.ringFrames(root, rust, { x: FRAMES, y: 0.5, size: [0.5, 9.4, 19.8] });
bathyarch.shoulderStays(root, rust, {
  z: [8.65, 1.7, -1.7, -8.65], head: { x: SHOULDER + 0.2, y: 6.3 }, foot: { x: -18.1, y: 5.0 }, t: 0.8,
});
bathyarch.driveDrums(root, { black, grey, rust }, {
  x: -26, y: DECK - 0.6, z: 5.2, r: 2.3, length: 22,
  flange: { x: SHOULDER - 0.3, r: 2.6, width: 0.6 },
  bands: { x: [-21, -27, -33], r: 2.5, width: 0.7 },
  head: { length: 2.2, tipR: 1.2 },
  leg: { x: [-41.7, -38.9], y: [SHAFT - 1.1, DECK + 0.9], w: 2.6 },
});

// The two prop tunnels, one lying in each stern notch: the shroud's after
// face a metre proud of the transom, and the hub through it from the stern
// at −45 forward to x −41.5, 0.2 m into the drive leg. The hub is 3.5 m
// about −43.25, numbers a float holds exactly, so the stern is −45 to the
// bit and `metreTrue` below returns exactly 1.
bothSides((side, sgn) =>
  bathyarch.propTunnel(root, { grey, black }, {
    name: side, at: [-43.6, SHAFT, sgn * 5.2], r: 2.6, length: 2.4, hub: { r: 0.9, length: 3.5, x: -43.25 },
  })
);

// The patchwork, three newer plates and nothing older laid on newer: one on
// the older course to port of the foredeck, x 32.25 to 36.75, a quarter of
// a metre ahead of the newer course's fore edge and outboard of the hatch;
// one on the citadel's starboard flank under its ports — a plate over a
// lit port is a port the chart loses — and one on the bare port flank of
// the drive hull, between two frames.
bathyarch.repairPatches(root, bathyarch.inFrame, { rust, grey }, {
  patches: [
    ['patch_deck', 'grey', [4.5, 0.3, 3], [34.5, OLDER + 0.15, -8.5]],
    ['patch_citadel_s', 'grey', [3.5, 1.2, 0.4], [-10, 8.15, 7.1]],
    ['patch_flank_p', 'grey', [2.2, 1.8, 0.4], [-28.5, -0.6, -9.6]],
  ],
});

// The stencil to starboard on the foredeck, the hatch to port of the bow
// lamp, the lamp itself on the centreline where nothing can occlude it,
// and a second hatch on the drive hull's deck between the drums.
bathyarch.bowStencil(root, amber, { at: [35, OLDER + 0.15, 5], size: [6, 0.3, 1.3] });
bathyarch.bowLamp(root, lampM, { at: [39.5, OLDER + 0.15, 0], size: [1.2, 0.8, 3] });
const HATCH = { r: 1.3, h: 0.5, wheel: { R: 0.55, t: 0.1 } };
bathyarch.deckHatches(root, { hatch: rust, wheel: grey }, { on: 'caisson_course_0', ...HATCH, hatches: [['deck_hatch', [37, -5]]] });
bathyarch.deckHatches(root, { hatch: rust, wheel: grey }, { on: 'deck', ...HATCH, hatches: [['drive_hatch', [-28.5, 0]]] });

// Metre-true as drawn: 90 from the prop hubs to the plough plate's face, so
// the scale this returns is 1 and the root carries nothing. Exactly 1, and
// held to it: the first two cuts' hubs ended at a station a float rounds
// (−43.6 − 1.4), the root took a scale of 1 + 5e-10 to make up the length,
// and that carried the beam 7 nm a side past 26.5 m — one more row in the
// bake than the header counts, 107 for 106 (#1956 review).
const k = metreTrue(root, L, { drawn: L });
if (k !== 1) throw new Error(`consortium_caisson: root scale ${k}, expected exactly 1`);

await exportGlb(root, 'caisson-bathyarch.glb', { trim: bathyarch.TRIM });
