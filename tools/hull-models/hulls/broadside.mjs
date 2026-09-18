/**
 * The Broadside — the Consortium's ordnance hull, 120 m (docs/units.md, "The
 * ordnance hulls"; #785, off #540 Phase 4).
 *
 * "The alpha strike, 120 m — four tubes and a magazine of four, and no gun at
 * all: twelve seconds of ordnance, then ninety of sailing home empty (SIG 42
 * idle, 58 cruise, +25 at each of the four launches; no gun; 700 hull;
 * 40 m/s). A long riveted box hull, narrower than the Freighter's slab,
 * carrying its four tubes outside the hull as four casings, two a side in
 * tandem along each flank: each a banded pressure cylinder toed a few
 * degrees outboard so the aft tube fires clear of the forward casing's tail,
 * a hinged muzzle door on its forward face, a dogged breech door at its
 * tail, so the plan is a box with two teeth a side and the teeth are the
 * count. A chamfered ram bow, a square stern with two prop tunnels, a low
 * bridge citadel aft, ballast blisters under the casings, plate patchworked
 * older-under-newer. Between the casings the deck is bare plate — no turret,
 * no crane, no mount: the hull is a box four tubes are bolted to, and once
 * the four doors have opened there is nothing on it that points at anything.
 * Sustained amber glow from the bridge ports, the hoop lamps at each breech
 * door and the stern vents; each muzzle door floods for the instant of a
 * launch, four times in twelve seconds, and is dark again after."
 * (docs/asset-prompts-3d.md, UNIT — Broadside)
 *
 * Built to that block and not ported from a binary, like the Freighter and
 * the Beacon before it (docs/models-plan.md §3.1), so every number here is a
 * decision and this header says which ones the block did not make. Built
 * loaded (§3.5): every door shut, every breech dogged. Metre-true at 120
 * with no root scale: the ram teeth are the bow at x 60 and the transom's
 * vents and the prop hubs are the stern at −60; port is −z (#642).
 *
 * The body is the Tender's `boxHull` at a warship's proportion: a 10 m box
 * 31.2 m across its parallel flanks — 0.26 of the length, against the
 * Freighter's 0.45 — with a 7 m chamfer to a 15 m bow face, a square stern
 * notched twice for the tunnels, and the deck plate a metre and a half
 * inside its rim. Square-edged, as the Freighter and the Beacon are: a box,
 * not a casting. The ram is the Bulwark's `ramBow` at this scale — a
 * chamfered plough plate at mid-depth whose bevelled rim runs just proud of
 * the box's bow chamfer, five teeth across its tip and the hazard band on
 * its back — so the bow is one casting and the teeth are its point.
 *
 * The casings are the count, and `tubeCasings` was written for this hull in
 * `factions/bathyarch.mjs`: four 34 m drums 6 m across, three bands each,
 * doored both ends, two a side with the forward pair's breeches at x 12 and
 * the after pair's at −30, so 8 m of bare flank lie between a muzzle door
 * and the breech ahead of it. The toe is 7°, and it is arithmetic rather
 * than taste: the aft tube's path runs parallel to the forward casing's
 * axis 5.1 m outboard of it (42 m · sin 7°); the widest thing at that
 * casing's tail is its hoop lamp at r 3.45, so the aft torpedo, 0.8 m
 * across, passes it with 1.3 m to spare — a few degrees, and the fewest
 * that clear. Each casing's
 * inboard face lies 0.5 m off the flank at its breech and 4.6 m off at its
 * muzzle, its axis 1 m above the waterline and its crown a metre under the
 * deck; the muzzle flanges reach z ±26.4, a 0.44 beam, on a 0.26 box.
 *
 * What the script decided that the block did not say:
 *
 * - **The hoop lamps are the chart's light, and they are wide.** The block
 *   lights three things at rest and two of them — the bridge ports and the
 *   stern vents — are vertical faces. The chart bakes straight down
 *   (docs/models-plan.md §3.2 rule 5), so the one named light with plan area
 *   is the hoop at each breech door, and it is built as the Beacon's
 *   `hoop_lamp`: a raised band round the casing just ahead of the tail
 *   flange, 1.6 m wide and 0.45 m proud, in `amber_vent` — the amber banked
 *   down, the navy's machinery light — so its whole 6.9 m width faces up.
 *   Four of them are 42 m² and two thirds of the resting light; a 0.6 m
 *   hoop like the Beacon's is a pixel wide at the maps' 2 px/m and loses a
 *   third of itself to coverage.
 * - **The stern vents stand proud of the transom.** "The stern vents" on the
 *   Tender and the Bulwark sit under the deck edge, where the bake cannot
 *   see them and the kit's audit warns. Here the two vents are lit
 *   boxes 1.2 m proud of the transom on the centre block between the
 *   tunnels, so the conn view reads their after faces and the chart their
 *   tops — the Freighter's "ports proud of their faces" applied to a vent.
 * - **The bridge ports are the citadel's ports.** Three a flank and four
 *   across the bridge face, as the Freighter counts its castle ports under
 *   "the bridge ports": the same citadel's ports, and the block's phrase
 *   covers them. All eleven are boxes proud of their faces in `amber_lamp`,
 *   the navigation fixture, so their tops show from above.
 * - **A bow lamp.** A navigation mark, licensed at every band by the glow
 *   table's floor row, and the one forward light on a hull whose lamps
 *   otherwise all sit aft of amidships — the Freighter's reason exactly.
 * - **No stacks.** The Freighter gave its castle two because the block
 *   named an exhaust nowhere; this block names the stern vents, and a low
 *   citadel with a stack on it is not low.
 * - **A crew hatch on the foredeck.** The block gives no way into the hull;
 *   a dogged hatch ahead of the casings, to port of the stencil, in the
 *   Beacon's `doggedHatch`. Forward of the muzzle doors, so the deck between
 *   the casings stays bare plate as the block insists.
 * - **The tunnels are notched into the stern.** The Tender's idiom, one
 *   notch a tunnel: 8 m notches in the box's stern at z ±9 with a shroud
 *   lying in each and the hub standing to −60, so the tunnels are *in* the
 *   square stern rather than under it, and the transom's quarters keep the
 *   outline's square corners.
 * - **The doors.** The block hinges the muzzle door and dogs the breech
 *   door and places neither hinge nor dog: the muzzle door's knuckle stands
 *   up its outboard edge, so the door swings out and clear of the hull; the
 *   breech door carries one dogging wheel on a hub, facing aft. Both doors
 *   are cladding — the muzzle flood is the launch transient (§3.2 rule 3)
 *   and nothing on this hull is a lamp only in a later band, so no part
 *   wears an unlit lamp finish.
 * - **The blisters run the casings' length.** One a side, 78 m between its
 *   caps, low on the flank under the box's lower edge with its outboard
 *   face 1.4 m proud of the flank: under both casings, and under nothing
 *   else.
 * - **Three patches and a stencil.** The navy's patchwork (Block 2): older
 *   plate on the deck to starboard abeam the forward casings — a flush
 *   patch is still bare plate, and nothing on it points at anything — and
 *   newer on the citadel's starboard flank and on the bare port flank
 *   between the casings; the asset number on the foredeck.
 *
 * The resting light, as the export's audit counts it from above: the four
 * hoop lamps at 10.5–10.6 m² each, the two vents at 4.4 and 4.7 m², the six
 * citadel ports at 0.5–1.0 m² and four bridge ports at 1.0–1.1 m² (the
 * starboard ports are a cell narrower than the port ones, a raster
 * alignment and not the model's), and the bow lamp at 3.0 m² — seventeen
 * lit parts, 63.2 m² facing up on a 4,689 m² plan, no part hidden. The
 * intake bake at 120 m reads raw E 10.32 against the target E(42) = 9.04
 * and dims by ×0.876 — inside the ×1/64 .. ×64 window and nearer unity than
 * the Freighter's ×0.527 or the Beacon's ×0.335, so the conn view's lamps,
 * which take the model's own intensity and never the bake's gain
 * (rosterModels.ts), sit at the band the chart shows. 177 parts, 5,260
 * triangles, six materials; the file spans x −60 .. 60 and z −26.4 .. 26.4
 * to the centimetre, so the bake neither rescales nor rotates.
 *
 * Every part comes from `factions/bathyarch.mjs`; `tubeCasings` was written
 * for this hull there, beside the Beacon's `transducerDrum`. Coordinate
 * tables below are laid out as tables on purpose; `tools/**\/*.mjs` is
 * outside the repo's Prettier scope (package.json) precisely so they can be.
 */
import { THREE, bothSides, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts). Drawn at it: ram teeth at +60, vents and prop hubs at −60. */
const L = 120;
const BOW = L / 2;
const STERN = -L / 2;

/** The box's half-beam, and the transom 1.2 m inside the stern so the vents can stand proud of it to −60. */
const HALF = 15.6;
const TRANSOM = STERN + 1.2;

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const vent = bathyarch.ink.amberVent();

const root = new THREE.Group();
root.name = 'consortium_broadside';

// The box: a plan in absolute metres, bow first down the starboard side and
// back up the port, 10 m deep and centred on the waterline. Flanks parallel
// at ±15.6 from x 49 to the transom, a 7 m chamfer to the 15 m bow face,
// and the two tunnel notches cut 4 m into the stern at z ±9 between the
// quarters and the centre block. The deck plate lies on it a metre and a
// half inside the rim, notched with it, and a rubbing strake runs each
// flank along the box's lower edge.
bathyarch.boxHull(root, { black, grey, rust }, {
  hull: {
    outline: [
      [56, 7.5], [49, HALF], [TRANSOM, HALF], [TRANSOM, 13], [-54.8, 13], [-54.8, 5], [TRANSOM, 5],
      [TRANSOM, -5], [-54.8, -5], [-54.8, -13], [TRANSOM, -13], [TRANSOM, -HALF], [49, -HALF], [56, -7.5],
    ],
    depth: 10, y: 0,
  },
  deck: {
    outline: [
      [54.6, 6.4], [48.2, 14.1], [-57.3, 14.1], [-57.3, 12.5], [-54.3, 12.5], [-54.3, 5.5], [-57.3, 5.5],
      [-57.3, -5.5], [-54.3, -5.5], [-54.3, -12.5], [-57.3, -12.5], [-57.3, -14.1], [48.2, -14.1], [54.6, -6.4],
    ],
    depth: 0.6, y: 5.3,
  },
  strakes: { x: -5, y: -4.4, z: HALF, size: [104, 0.6, 1.0] },
});

// The Bulwark's flank plate in the Derrick's gauge, 1.2 m: one plate a side
// under the forward casing in newer grey, one aft under the citadel in older
// rust riding higher, and the seam of older plate along the flank under the
// deck edge, inboard of the casings' crowns.
bathyarch.flankPlates(root, { grey, rust }, {
  z: HALF, plateT: 1.2,
  plates: [[29, 28, 2.6, -3.4, false], [-45, 12, 3.2, 0.4, true]],
  seamLength: 96, seam: { y: 4.4, h: 0.5, t: 1.0, z: HALF },
});

// Ballast blisters low on both flanks under the casings, capped fore and aft.
bathyarch.ballastBlisters(root, { grey, rust }, {
  x: 0, y: -4.8, z: 14.4, r: 2.6, length: 78,
  caps: { length: 3, fore: 40.5, aft: -40.5, tipR: 1.5 },
});

// The two prop tunnels, one lying in each stern notch: the shroud's after
// face a metre proud of the transom and the hub standing to −60.
bothSides((side, sgn) =>
  bathyarch.propTunnel(root, { grey, black }, {
    name: side, at: [-58.6, -1.2, sgn * 9], r: 3.4, length: 2.4, hub: { r: 1, length: 2.8 },
  })
);

// The ram: the plough is a 9 m wedge plan with a 0.8 m chamfer at mid-depth,
// its bevelled rim just proud of the box's bow chamfer and its waist at
// 59.8; the five teeth stand across its tip to x 60 and the band lies on
// its back ahead of the bow face.
bathyarch.ramBow(root, { grey, rust, amber }, {
  plough: { outline: [[59, 5], [50, 14], [50, -14], [59, -5]], depth: 4, bevel: 0.8, y: -0.5 },
  teeth: { x: 58.25, y: -0.5, z: [-4.4, -2.2, 0, 2.2, 4.4], size: [3.5, 3, 1.6] },
  band: { at: [57.3, 2.6, 0], size: [1.8, 0.8, 11] },
});

// The four casings — the header says why 7° and why the hoops are wide.
// Forward pair breech at x 12, after pair at −30, 34 m each; axis 1 m over
// the waterline, 0.5 m off the flank at the breech.
bathyarch.tubeCasings(root, { black, grey, rust, lampM: vent }, {
  r: 3, y: 1, flank: HALF, gap: 0.5, toe: (7 * Math.PI) / 180,
  casings: [{ tag: '0', breech: 12, length: 34 }, { tag: '1', breech: -30, length: 34 }],
  bands: { t: [9, 17.5, 26], r: 3.25, width: 1.2 },
  tail: {
    flange: { r: 3.2, width: 0.8 },
    door: { r: 2.75, h: 0.5 },
    hub: { r: 0.25, length: 0.9, sink: 0.2 },
    wheel: { R: 0.9, t: 0.14, stand: 0.6 },
  },
  hoopLamp: { t: 1.6, r: 3.45, width: 1.6 },
  muzzle: {
    flange: { r: 3.2, width: 0.8 },
    door: { r: 2.75, h: 0.5 },
    hinge: { r: 0.35, h: 4.2, inset: 2.5 },
  },
  saddles: { t: [6, 27], size: [3, 3.4], dy: 0 },
});

// The low bridge citadel aft, on the deck between the after casings' tails
// and the stern notches: the block, the bridge set back on it, the visor
// across the block's forward face, three ports a flank and four across the
// bridge face — the resting light the block names first.
bathyarch.citadel(root, { black, grey, rust, lampM }, {
  block: { at: [-44, 8.1, 0], size: [16, 5, 18] },
  top: { at: [-43, 11.85, 0], size: [10, 2.5, 12] },
  visor: { at: [-35.5, 9.8, 0], size: [1.5, 1.6, 18.4] },
  ports: { count: 3, x: -49.5, pitch: 4.5, y: 8.3, z: 9.2, size: [2.2, 1.4, 0.5] },
  bridgePorts: { x: -37.65, y: 12.1, z: [-4.2, -1.4, 1.4, 4.2], size: [0.5, 1.4, 2.2] },
});

// The stern vents: two lit boxes on the transom's centre block
// between the tunnels, 1.2 m proud of it, their after faces to −60.
bathyarch.engineVents(root, vent, { x: -59.4, y: 1, z: [-3.2, 3.2], size: [1.2, 3, 3.6] });

// The crew hatch on the foredeck, to port of the stencil.
bathyarch.doggedHatch(root, { hatch: rust, wheel: grey }, {
  name: 'deck_hatch', at: [51.5, 5.85, -5], r: 1.3, h: 0.5, wheel: { R: 0.55, t: 0.1, dy: 0.35 },
});

// The patchwork: older plate on the deck abeam the forward casings to
// starboard — flush, so still bare plate — newer on the
// citadel's starboard flank under its ports — a plate over a lit port is a
// port the chart loses — and on the bare port flank between the casings.
bathyarch.repairPatches(root, bathyarch.inFrame, { rust, grey }, {
  patches: [
    ['patch_deck', 'rust', [5, 0.3, 4], [30, 5.7, 5]],
    ['patch_citadel_s', 'grey', [4, 1.2, 0.4], [-47, 6.9, 9.1]],
    ['patch_flank_p', 'grey', [3.5, 1.6, 0.4], [8, -3, -15.8]],
  ],
});

// Rivets: twenty a side along the deck plate's edge in grey on the rim,
// sixteen a side along the strake in black, numbered by their place in the
// file as the Bulwark's and the Tender's are. Then the stencil and the bow
// lamp on the foredeck.
bathyarch.rivetRows(root, grey, { from: -56, to: 47, count: 20, y: 5.15, z: 14.6, size: [0.6, 0.3, 0.6] });
bathyarch.rivetRows(root, black, { from: -56, to: 46, count: 16, y: -4.4, z: 16.2, size: [0.5, 0.5, 0.35] });
bathyarch.bowStencil(root, amber, { at: [47, 5.75, 0], size: [6, 0.3, 1.3] });
bathyarch.bowLamp(root, lampM, { at: [54, 5.85, 0], size: [1.2, 0.8, 3] });

await exportGlb(root, 'broadside-bathyarch.glb');
