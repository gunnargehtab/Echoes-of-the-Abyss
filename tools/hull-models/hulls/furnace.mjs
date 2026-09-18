/**
 * The Furnace — the Consortium's siege hull, 115 m (docs/units.md, "The
 * siege hulls"; #786, off #540 Phase 4).
 *
 * "The cutters, 115 m — thermal cutters, the same tool that opens kelp,
 * turned on plate at 320 m, on a hull that must stand still at a wall for
 * half a minute while a Bulwark keeps the line off it (SIG 40 idle, 55
 * cruise, 75 cutting; cutters that do 100 to a structure and 9 to a hull
 * every two seconds at 320 m, so a Corvette out-trades it four to one; 900
 * hull; 32 m/s; 380 nodules). A riveted box hull — the Tender's workshop
 * turned outward — with three cutter ladders run out ahead of the bow from a
 * boxed gantry frame, one on the keel and one either side: each a lattice
 * boom with a hooded burner head at its end and gas lines strapped along it
 * back to the manifold, so the plan is a box with three prongs at the bow
 * and the prongs are the count. Behind the frame the manifold house — the
 * workshop itself, its forward face to the bow with the manifold header
 * lying across it under the ladders' heels and a valve wheel to each — and
 * behind that the gas plant, two ranks of banded gas cylinders in racks on
 * the deck with lamp housings on the rack rails, a pump house and pipe runs
 * between them; a bridge citadel aft; ballast blisters low on the hull; two
 * prop tunnels in a square stern; plate patchworked older-under-newer. The
 * flanks are bare — no casings, no tubes, no turret — because everything
 * this hull does, it does ahead of itself at arm's length, and a burner head
 * is a nozzle under a hood, not a muzzle. The model is the hull with its
 * ladders run out, which is the state it is built for; under way they stow
 * raised against the frame. Sustained amber glow from the gas plant's lamps
 * — the lamp housings on the rack rails and the manifold house's skylight,
 * its ports beside them — then the bridge ports and the stern vents, at
 * rest and under way alike; cutting, burning bright — the three burner
 * heads the brightest thing on the hull, the bow floodlit from the frame,
 * the ladders and the manifold lit along their length, visible machinery
 * light: a siege you can hear being prepared."
 * (docs/asset-prompts-3d.md, UNIT — Furnace)
 *
 * Built to that block and not ported from a binary, like the Broadside
 * before it (docs/models-plan.md §3.1), so every number here is a decision
 * and this header says which ones the block did not make. Built with the
 * ladders run out (§3.5) and lit at the resting band only (§3.2): the
 * block lights the burner heads, the bow floods, the ladders and the
 * manifold only cutting, and the pipeline draws one lighting state and
 * scales it, so those are built as parts and clad in the lamp family's
 * unlit finish, `amber_lamp_unlit`, never lit. (The block first read "run
 * out and lit" and gave the cutters' reach as 200 m; it is amended in
 * this PR to say "run out" and to carry units.md's 320.) Metre-true
 * at 115 with no root scale: the three burner hoods' forward edges are the
 * bow at x 57.5 and the transom's vents and the prop hubs are the stern at
 * −57.5 (`metreTrue` asserts it); port is −z (#642).
 *
 * The body is the Tender's `boxHull` at a siege hull's proportion: a 10 m
 * box 34 m across its parallel flanks — 0.30 of the length, between the
 * Broadside's 0.26 and the Tender's 0.47, because a gas plant in two ranks
 * with a pump house between them needs a deck the Broadside's bare plate
 * did not — with a 4 m chamfer to a 24 m bow face at x 34, a square stern
 * notched twice for the tunnels, and the deck plate a metre and a half
 * inside its rim. The box runs 91.5 m, x 34 to −57.5, and the prongs
 * reach 23.5 m past its bow face: a fifth of the length ahead of the hull,
 * which is what makes the bow the whole argument at RTS distance. The
 * ladders run out at z 0 and ±11, 2.6 m square in section with 5 m hoods
 * at their tips, so their outer edges stand 3.5 m inside the flanks: bow
 * gear, not flank gear, and nothing on the flanks but plate. The plates
 * and the seam lie on the parallel body — the seam's 82 m centred on
 * x −12, so it runs x −53 to 29 and stops a metre short of the chamfer —
 * and nothing on a flank reaches past the bow corner, so the chamfer the
 * outline cuts is the box's own.
 *
 * What the script decided that the block did not say:
 *
 * - **The workshop turned outward is the manifold house.** The block calls
 *   the hull "the Tender's workshop turned outward" and names the manifold
 *   the gas lines run back to, and places neither. Here they are one
 *   thing: the Tender's `workshop` deckhouse stands abaft the gantry frame
 *   with its forward face to the bow, and the manifold header lies across
 *   that face — a 12 × 20 m house whose business is on its outside,
 *   feeding the ladders, where the Tender's faces its own work deck. Its
 *   three ports a side and its skylight are lit as the gas plant's lamps
 *   (the block's phrase covers the plant's house as "the bridge ports"
 *   covers the Broadside's citadel ports), and the ports stand 0.6 m proud
 *   of the house with the roof no wider than the house and the hazard
 *   band 0.1 m proud, so the chart sees them — the Tender trap the kit's
 *   audit exists for.
 * - **The gas plant's lamps are housings on the racks.** "The gas plant's
 *   lamps" names no fixture. Each rank of six cylinders stands in a rack
 *   — a sill, a post at each end, a rail across them — and three lamp
 *   housings sit on each rail in `amber_vent`, the amber banked down, the
 *   navy's machinery light, with their whole 1.8 × 1.4 m tops facing up.
 *   Six of them are the chart's light (§3.2 rule 5), as the Broadside's
 *   hoops are its: the bridge ports and the stern vents the block names
 *   are vertical faces, and a lit rack is what a gas plant looks like
 *   worked at night.
 * - **The ladders are lattice at one height, through the frame.** "One on
 *   the keel and one either side" is read in plan: the keel ladder is the
 *   centreline's, and all three run out level at y 9.8, 4.2 m over the
 *   deck, resting on a guide sill at each of the frame's two stations with
 *   a keeper over each. Each is a 36.5 m boom, x 17 to 53.5, four 0.5 m
 *   chords 2.1 m apart with six bays of zig-zag lacing on each side face
 *   and across the top, and none underneath where nothing looks. The
 *   cantilever past the forward sill is 25.5 m, which a lattice boom is
 *   for. They are drawn one at a time at their own z — starboard, keel,
 *   port — not as a mirrored pair with one between (§3.6).
 * - **The head is a hood over a nozzle.** The block says "a nozzle under a
 *   hood, not a muzzle" and draws neither. The hood is a top plate and two
 *   cheeks, 4 m long, 5 m wide and 4 m tall, open ahead and below, on a
 *   coupling block at the boom's tip; the nozzle, 1.6 m across, lies under
 *   the top plate with its face 0.9 m inside the hood's lip. From above
 *   the hood is the prong's tip; from the beam the nozzle is under it and
 *   nothing on the ladder points the way the Broadside's tubes point.
 * - **The gas lines run outboard of the lower chords.** Two a ladder, one
 *   a side, at the boom's lower half where the conn view sees them, held
 *   by four straps a ladder, and each drops 1.7 m at the boom's aft end to
 *   the header. The header lies on the house's forward face at y 7.6,
 *   under the booms, so the three valve wheels on it face the bow clear of
 *   the lattice above them.
 * - **The bow floods are on the frame.** "The bow floodlit" cutting; two
 *   flood housings on the frame's forward cross beam, at the highest point
 *   forward, in the unlit finish.
 * - **The stern vents stand proud of the transom.** The Broadside's
 *   answer to the Tender trap: two lit boxes 1.2 m proud of the transom
 *   on the centre block between the tunnels, their after faces at −57.5.
 * - **The bridge ports are the citadel's ports.** Three a flank and four
 *   across the bridge face, all boxes proud of their faces in `amber_lamp`,
 *   as the Broadside counts them.
 * - **A bow lamp.** A navigation mark, licensed at every band by the glow
 *   table's floor row, on the foredeck to starboard of the keel ladder —
 *   on the centreline it would lie under the boom where the chart cannot
 *   see it. The Broadside's and the Freighter's reason, and their fixture.
 * - **No stacks.** The block names the stern vents and a low citadel, as
 *   the Broadside's does; the pump house's riser is the only pipe standing
 *   on the plant.
 * - **A crew hatch on the foredeck.** To port of the keel ladder, ahead of
 *   the frame, in the Beacon's `doggedHatch`: the block gives no way into
 *   the hull.
 * - **The tunnels are notched into the stern.** The Tender's idiom as the
 *   Broadside carries it: 8 m notches at z ±9 with a shroud lying in each
 *   and the hub standing to −57.5, so the transom keeps its square corners.
 * - **Three patches and a stencil.** The navy's patchwork (Block 2): older
 *   plate on the bare starboard deck between the house and the plant,
 *   newer on the citadel's starboard flank and on the bare port flank
 *   between the plates; the asset number on the deck inside the frame,
 *   between the keel and starboard ladders where the chart sees it.
 *
 * Where the block, the plan bullet and the visual law disagreed — and the
 * block was amended for each in #786: its pose clause read "run out and
 * lit", which is the cutting state, and docs/models-plan.md §3.2 lights
 * the resting band only, so the model is built in the pose and lit as it
 * rests and the block says "run out", as the Lure's and the Tocsin's leave
 * their light to the lighting clause; it had no word for the manifold
 * house, which is the plan bullet's `workshop`, and now names it (§2);
 * and its resting clause led with the bridge ports, a vertical face, where
 * "Glow encodes loudness" asks a block to name the light the chart reads
 * first, so it now leads with the rack housings and the skylight.
 *
 * The resting light, as the export's audit counts it from above: the six
 * rack lamps at 2.5 m² each, the skylight at 12.0 m², the two vents at 4.4
 * and 4.7 m², the six house ports at 1.0 m², the six citadel ports at
 * 0.5–1.0 m² and the four bridge ports at 1.0–1.1 m² (the starboard citadel
 * ports are a cell narrower than the port ones, a raster alignment and not
 * the model's, as on the Broadside), and the bow lamp at 3.0 m² —
 * twenty-six lit parts, 54.0 m² facing up on a 3,497 m² plan, no part
 * hidden. The intake bake at 115 m reads raw E 12.18 against the target
 * E(40) = 7.84 and dims by ×0.643 — inside the ×1/64 .. ×64 window, between
 * the Freighter's ×0.527 and the Broadside's ×0.876, so the conn view's
 * lamps, which take the model's own intensity and never the bake's gain
 * (rosterModels.ts), sit near the band the chart shows. Cutting is these
 * same lamps at E(75) / E(40) = 12.2 times their resting strength in
 * `applyLiveGlow` (§3.2); the nine parts the block lights only then — the
 * three nozzles, the three ladder strips, the manifold strip and the two
 * bow floods — are `amber_lamp_unlit` and stay dark. 295 parts, 5,456
 * triangles, seven materials; the file spans x −57.5 .. 57.5 and
 * z −18.4 .. 18.4 to the centimetre, so the bake neither rescales nor
 * rotates.
 *
 * Every part comes from `factions/bathyarch.mjs`; `cutterGantry`,
 * `cutterLadders`, `gasManifold` and `gasRacks` were written for this hull
 * there, beside the Broadside's casings, and `gasBottles` took a rank tag
 * and a band for it. Coordinate tables below are laid out as tables on
 * purpose; `tools/**\/*.mjs` is outside the repo's Prettier scope
 * (package.json) precisely so they can be.
 */
import { THREE, bothSides, exportGlb, metreTrue } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts). Drawn at it: burner hoods to +57.5, vents and prop hubs to −57.5. */
const L = 115;
const BOW = L / 2;
const STERN = -L / 2;

/** The box's half-beam, the deck's top, and the transom 1.2 m inside the stern so the vents can stand proud of it. */
const HALF = 17;
const DECK = 5.6;
const TRANSOM = STERN + 1.2;

/** The three ladders in the file's order — starboard, keel, port — each at its own z (§3.6). */
const LADDERS = [
  ['s', 11],
  ['keel', 0],
  ['p', -11],
];
/** Where the ladders run: aft end inside the frame, tip 4 m short of the bow, the hoods to +57.5; the boom axis 4.2 m over the deck. */
const LADDER = { aft: 17, tip: BOW - 4, y: 9.8 };

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const vent = bathyarch.ink.amberVent();
const unlit = bathyarch.ink.amberLampUnlit();

const root = new THREE.Group();
root.name = 'consortium_furnace';

// The box: a plan in absolute metres, bow first down the starboard side and
// back up the port, 10 m deep and centred on the waterline. Flanks parallel
// at ±17 from x 30 to the transom, a 4 m chamfer to the 24 m bow face at
// x 34, and the two tunnel notches cut 4 m into the stern at z ±9 between
// the quarters and the centre block. The deck plate lies on it a metre and
// a half inside the rim, notched with it, and a rubbing strake runs each
// flank along the box's lower edge.
bathyarch.boxHull(root, { black, grey, rust }, {
  hull: {
    outline: [
      [34, 12], [30, HALF], [TRANSOM, HALF], [TRANSOM, 13], [-52.3, 13], [-52.3, 5], [TRANSOM, 5],
      [TRANSOM, -5], [-52.3, -5], [-52.3, -13], [TRANSOM, -13], [TRANSOM, -HALF], [30, -HALF], [34, -12],
    ],
    depth: 10, y: 0,
  },
  deck: {
    outline: [
      [32.4, 11], [29.2, 15.5], [-54.8, 15.5], [-54.8, 12.5], [-51.8, 12.5], [-51.8, 5.5], [-54.8, 5.5],
      [-54.8, -5.5], [-51.8, -5.5], [-51.8, -12.5], [-54.8, -12.5], [-54.8, -15.5], [29.2, -15.5], [32.4, -11],
    ],
    depth: 0.6, y: 5.3,
  },
  strakes: { x: -12.5, y: -4.4, z: HALF, size: [83, 0.6, 1.0] },
});

// The Bulwark's flank plate in the Derrick's gauge, 1.2 m: one plate a side
// under the house and the plant's forward end in newer grey, one aft under
// the citadel in older rust riding higher, and the seam of older plate
// along the flank under the deck edge — centred on x −12, not 0, so its
// 82 m run x −53 .. 29 lies on the parallel flank and stops a metre short
// of the bow chamfer at 30. Centred on the origin it stood 7 m past the
// bow corner with nothing behind it and held the outline at full beam
// past its own bow face (#786 review).
bathyarch.flankPlates(root, { grey, rust }, {
  z: HALF, plateT: 1.2,
  plates: [[8, 26, 2.6, -3.4, false], [-44, 14, 3.2, 0.4, true]],
  seamLength: 82, seam: { x: -12, y: 4.4, h: 0.5, t: 1.0, z: HALF },
});

// Ballast blisters low on both flanks under the plant and the house, capped
// fore and aft.
bathyarch.ballastBlisters(root, { grey, rust }, {
  x: -8, y: -4.8, z: 15.8, r: 2.6, length: 72,
  caps: { length: 3, fore: 29.5, aft: -45.5, tipR: 1.5 },
});

// The two prop tunnels, one lying in each stern notch: the shroud's after
// face a metre proud of the transom and the hub standing to −57.5.
bothSides((side, sgn) =>
  bathyarch.propTunnel(root, { grey, black }, {
    name: side, at: [-56.1, -1.2, sgn * 9], r: 3.4, length: 2.4, hub: { r: 1, length: 2.8 },
  })
);

// The boxed gantry frame on the foredeck, x 19 to 28 with its legs at
// z ±13.5, its top at 15.5 and its guide sills under the booms at 8.5; the
// keepers over each ladder at both stations, a brace a side, and the two
// bow floods on the forward cross beam — clad, lit only cutting.
bathyarch.cutterGantry(root, { grey, rust, unlit }, {
  fwd: 28, aft: 19, z: 13.5, deck: DECK, top: 15.5,
  leg: { t: 1.6 }, foot: { size: 2.4, h: 0.8 }, beam: { t: 1.4 },
  sill: { t: 1.4, y: 7.8 },
  keepers: { at: LADDERS, y: 11.4, size: [1.4, 0.6, 3.4] },
  brace: { t: 0.6 },
  floods: { size: [1.4, 1.2, 2.4], y: 16.8, z: 5.5 },
});

// The three ladders — the header says why one height and why a hood. Each
// 36.5 m from x 17 to 53.5 with the hood to 57.5; chords 2.1 m apart, six
// bays of lacing a face, the strip along the top, the lines at the lower
// chords' outboard faces held by four straps, and the feed drops at the
// aft end to the header at y 7.6.
bathyarch.cutterLadders(root, { grey, rust, unlit }, {
  ladders: LADDERS, aft: LADDER.aft, tip: LADDER.tip, y: LADDER.y,
  half: 1.05, chord: 0.5, bays: 6, lace: 0.35,
  strip: { inset: 2, h: 0.25, w: 0.7 },
  head: {
    length: 4, width: 5, height: 4, plate: 0.5,
    block: { size: [2.4, 2.6, 2.6], dx: 0.2 },
    nozzle: { r: 0.8, length: 2.4, dx: 1.9, dy: -0.3 },
  },
  lines: { r: 0.28, dy: -0.5, dz: 1.58 },
  straps: { x: [22, 31, 40, 49], size: [0.5, 1.4, 3.9], dy: -0.5 },
  feed: { x: 17.2, y: 8.4, h: 2.3 },
});

// The manifold: the header across the house's forward face at x 16.4,
// z ±13, on a post a side beyond the house; a valve under each ladder,
// wheel to the bow; the strip along its top, lit only cutting.
bathyarch.gasManifold(root, { rust, grey, unlit }, {
  header: { at: [16.4, 7.6, 0], r: 0.5, length: 26 },
  posts: { r: 0.3, h: 2.0, x: 16.4, y: 6.6, z: 12 },
  valves: { at: LADDERS, hub: { r: 0.18, length: 1.0, x: 17.4 }, wheel: { R: 0.55, t: 0.1, x: 17.9 } },
  strip: { size: [0.4, 0.25, 24], at: [16.4, 8.22, 0] },
});

// The manifold house — the Tender's workshop turned outward: x 4 to 16,
// 20 m across, its forward face carrying the header. The roof no wider
// than the house and the band a tenth of a metre proud, so the three ports
// a side, 0.6 m proud, show from above; the ridge on the after half of the
// roof and the skylight on the forward half, so neither covers the other.
bathyarch.workshop(root, { black, grey, rust, amber, lampM, vent }, {
  house: { at: [10, 8.35, 0], size: [12, 5.5, 20] },
  roof: { at: [10, 11.6, 0], size: [12, 1, 20] },
  ridge: { at: [7.5, 12.5, 0], size: [5, 0.8, 4] },
  patches: {
    s: { at: [9, 7.0, 10.1], size: [4, 1.4, 0.3], old: true },
    p: { at: [13, 7.1, -10.1], size: [3, 1.2, 0.3] },
  },
  band: { at: [10, 10.6, 0], size: [12, 0.5, 20.2] },
  ports: { count: 3, x: 6.5, pitch: 3.5, y: 9.0, z: 10.3, size: [2.2, 1.4, 0.6] },
  skylight: { at: [13.5, 12.25, 0], size: [3, 0.3, 4] },
});

// The gas plant: two ranks of six banded cylinders at z ±7.5 from x −30.5
// to −14.5, each in its rack with three lamp housings on the rail — the
// chart's light — the pump house on the centreline between them with its
// riser, and a pipe run a side between the pump house and the ranks,
// forward to the house's after face.
bathyarch.gasRacks(root, { grey, rust, amber, lampM: vent }, {
  ranks: [['s', 7.5], ['p', -7.5]],
  bottles: { x: -30.5, y: 8.3, count: 6, pitch: 3.2, r: 1.2, h: 5.2 },
  band: { r: 1.3, h: 0.5, dy: 1.2 },
  sill: { x: -22.5, y: 5.9, size: [21, 0.6, 3.4] },
  posts: { xa: -32.6, xf: -12.4, y: 8.6, size: [0.7, 6.0, 3.0] },
  rail: { x: -22.5, y: 11.85, size: [21.4, 0.5, 0.7] },
  lamps: { x: [-28.5, -22.5, -16.5], y: 12.6, size: [1.8, 0.8, 1.4] },
});
bathyarch.pumpHouse(root, { grey, rust }, {
  house: { at: [-22.5, 7.35, 0], size: [7, 3.5, 5.5] },
  riser: { at: [-22.5, 10.6, 0], r: 0.7, h: 5 },
});
bathyarch.pipeRuns(root, rust, { x: -15.5, y: 6.1, z: 3.6, r: 0.5, length: 39 });

// The low bridge citadel aft, on the deck between the plant and the stern
// notches: the block, the bridge set back on it, the visor across the
// block's forward face, three ports a flank and four across the bridge
// face — the resting light the block names first.
bathyarch.citadel(root, { black, grey, rust, lampM }, {
  block: { at: [-46, 8.1, 0], size: [16, 5, 18] },
  top: { at: [-45, 11.85, 0], size: [10, 2.5, 12] },
  visor: { at: [-37.5, 9.8, 0], size: [1.5, 1.6, 18.4] },
  ports: { count: 3, x: -51.5, pitch: 4.5, y: 8.3, z: 9.2, size: [2.2, 1.4, 0.5] },
  bridgePorts: { x: -39.65, y: 12.1, z: [-4.2, -1.4, 1.4, 4.2], size: [0.5, 1.4, 2.2] },
});

// The stern vents: two lit boxes on the transom's centre block between the
// tunnels, 1.2 m proud of it, their after faces to −57.5.
bathyarch.engineVents(root, vent, { x: -56.9, y: 1, z: [-3.2, 3.2], size: [1.2, 3, 3.6] });

// The crew hatch on the foredeck, to port of the keel ladder.
bathyarch.doggedHatch(root, { hatch: rust, wheel: grey }, {
  name: 'deck_hatch', at: [31, 5.85, -5], r: 1.3, h: 0.5, wheel: { R: 0.55, t: 0.1, dy: 0.35 },
});

// The patchwork: older plate on the bare starboard deck between the house
// and the plant — flush, so still bare deck — newer on the citadel's
// starboard flank under its ports, and on the bare port flank between the
// two plates.
bathyarch.repairPatches(root, bathyarch.inFrame, { rust, grey }, {
  patches: [
    ['patch_deck', 'rust', [5, 0.3, 4], [-4, 5.7, 11]],
    ['patch_citadel_s', 'grey', [4, 1.2, 0.4], [-49, 6.9, 9.1]],
    ['patch_flank_p', 'grey', [3.5, 1.6, 0.4], [-20, -3, -17.2]],
  ],
});

// Rivets: sixteen a side along the deck plate's edge in grey on the rim,
// twelve a side along the strake in black, numbered by their place in the
// file as the Bulwark's and the Tender's are. Then the stencil, inside the
// frame between the keel and starboard ladders, and the bow lamp on the
// foredeck to starboard.
bathyarch.rivetRows(root, grey, { from: -54, to: 28, count: 16, y: 5.15, z: 16.2, size: [0.6, 0.3, 0.6] });
bathyarch.rivetRows(root, black, { from: -53, to: 28, count: 12, y: -4.4, z: 17.6, size: [0.5, 0.5, 0.35] });
bathyarch.bowStencil(root, amber, { at: [23.5, 5.75, 5.5], size: [6, 0.3, 1.3] });
bathyarch.bowLamp(root, lampM, { at: [31, 5.85, 5], size: [1.2, 0.8, 3] });

// Metre-true as drawn: 115 from the prop hubs and the vents to the burner
// hoods' forward edges, so the scale this returns is 1 and the root
// carries nothing.
const k = metreTrue(root, L, { drawn: L });
if (Math.abs(k - 1) > 1e-6) throw new Error(`consortium_furnace: root scale ${k}, expected 1`);

await exportGlb(root, 'furnace-bathyarch.glb');
