/**
 * The Verger, the Klaxon's — 100 m (docs/units.md, "The transports"; the
 * Verger block of docs/asset-prompts-3d.md Block 3, read with the Bathyarch
 * FACTION block, #1438).
 *
 * "The cohort's way down, 100 m — four berths of hull taken below the Shelf
 * line at PR-3 (SIG 14 idle, 26 cruise, 38 with a full hold; no weapon; 800
 * hull). A deep-pressure hull, ribbed and domed like the Precentor's, with
 * four cohort bays set into its belly behind pressure hatches low on the
 * flanks, a listening dome forward, ballast tanks flanking a heavy keel, and
 * a single ducted drive. Lit low and cold at the hatch rims and at a boss on
 * the dome's crown; the doors behind the rims stay dark until the bays are
 * occupied, when they glow through their hatches."
 *
 * The Verger carries no faction lock (docs/models-plan.md §3.4), so the
 * Klaxon fields it on the Chorister's rule: the same plan, composed in the
 * navy's shape language, with only the light kept at the Directorate's
 * band. Said the Klaxon's way, as hulls/chorister-bathyarch.mjs says the
 * cohort hull: four riveted pressure cans on a heavy keel — a bow can and a
 * stern can in hull black, two hold cans between them in newer iron grey at
 * half again the radius, each capped fore and aft in older plate so the
 * seams stand as the Chorister's do, the two hold caps crossing amidships
 * as a V-groove; a hoop frame of older plate arched over each hold can,
 * which is the one rib a pressure vessel demands; the four cohort bays as
 * four pressure hatches low on the hold cans' flanks, alternating sides
 * from starboard — a collar of newer plate standing proud, a lit rim round
 * its face, a dark door with a dogging wheel on it and four dog lugs round
 * the collar; the listening dome forward as a riveted turret on the bow
 * can's crown, a drum skirt of newer plate under a black dome pressed low,
 * four ribs of older plate over it and the lit boss on its crown; two
 * ballast tanks under the hold cans' chines, the starboard the longer and
 * further aft; a deck walk on the hoops with a hazard stripe, the asset
 * stencil, two dogged hatches, eight plates of the other finishes, three
 * seams and two lit ports; a pipe run a side, neither where the other is;
 * a box stack beside the walk; patches on every can; a bluff bow block
 * with its plate and band and the one bow lamp; a fin a side astern; and
 * the drive in a duct, dark.
 *
 * Built metre-true at 100 m, bow plate at +50 and the duct's after face
 * and hub tip at −50, with nothing to rescale (kit.mjs `metreTrue` guards
 * it). Every part comes from `factions/bathyarch.mjs`; the hoops, the flank
 * hatches, the turret, the unequal tanks and the ducted drive were written
 * for this hull there, beside the Chorister's and the Freighter's families.
 * Three decisions hulls/verger.mjs took for the kind are kept, translated:
 * the bays open low on the FLANKS, not the underside, because the chart
 * bakes straight down and the conn view looks down at 55°, and a hatch
 * under the belly is seen by neither; the hatch RIM is the lit part,
 * because a ring has a face at every angle; and the dome's light is a boss
 * on its crown, not the dome, which at 8.4 m across would be the whole
 * light budget of a hull that idles at SIG 14. The doors are clad in the
 * lamp family's unlit finish (`ink.amberLampUnlit`) and never lit — "glow
 * through their hatches while the bays are occupied" is a later band, and
 * a later band is cladding (docs/models-plan.md §3.2 rule 2).
 *
 * WHAT THE BLOCK DID NOT SAY — decided here:
 *
 * - **Four cans, not three.** The Chorister's three cans carry one cohort
 *   hull; the Verger carries four, so the hold is two cans of 26 m at
 *   radius 9.5 against the end cans' 6.5, two hatches a can, and the whole
 *   belly reads as one grey mass between two black ends. The hoops are the
 *   block's "ribbed", the Klaxon's way.
 * - **Where the hatches sit.** 1.2 m below the axis on the hold cans at
 *   x 20 (starboard), 6 (port), −6 (starboard), −20 (port): the normal
 *   there points outboard and 7° down, each collar sunk 1.2 m into its
 *   can and standing 1.8 m proud, so a rim's edge at x 16.7 clears the
 *   hoop's outer face at 13.35 by 3.4 m, and the rims clear each other
 *   by 10.
 * - **The deck walk rides the hoops.** A hoop stands 0.35 m proud of the
 *   crown, so the walk is seated on the hoops and floats that much over
 *   the crown plate between them — a deck on its frames — and the pipes
 *   stand off the shoulder plates by the same and rest on both hoops.
 * - **Nothing astern is lit, and the marks are three.** The bow lamp on
 *   the bow block and two ports on the walk are the navigation marks the
 *   band table licenses at every band; the Chorister's stern vent is not
 *   carried, since the block puts no light on the drive.
 * - **The turret sits on the bow can, not the bow.** On its crown at the
 *   can's centre, x 34, where the Directorate's dome sits on the fifth
 *   plate; the bow block ahead of it carries the plate, the band and the
 *   lamp, the Freighter's bow.
 *
 * The light budget, measured (`lightAudit`, printed by `exportGlb`): eight
 * lit parts, 21.9 m² facing up — the four rims 13.8 m² (3.4 to 3.5 each),
 * the crown boss 5.1 m², the bow lamp 1.5 and the two ports 0.75 each —
 * no lamp hidden, none floating. Rims first, the dome second, the marks
 * last: the block's own order. The intake bake at 100 m reads raw E 11.20
 * against the target E(14) = 1.22 and dims by ×0.110 — inside the ×1/64 ..
 * ×64 window and seven times clear of the floor; the hull's plan is 24 m
 * across where the Directorate's is 44, and E is per pixel of plan, so the
 * same lit area reads nearly twice as bright here. 146 parts, 3,894
 * triangles; the file spans x −50 .. 50, y −11.8 .. 13.5, z −12 .. 12.
 *
 * The sweep (contacts.mjs) reads 200 pairs and every one a mount: each
 * fitting on its plate, the hatch parts on their collars, the collars and
 * the tanks set into the hold cans and the caps they cross at x 0, the end
 * cans into the hold caps as the Chorister's are, the walk and both pipes
 * on both hoops, the ribs meeting at the crown and the boss standing on
 * their crossing, the vanes between hub and duct, the duct and hub set
 * 0.3 m into the stern cap, the bow block the same into the bow cap. A
 * first pass put the hatches 2.5 m below the axis and the tanks' seeds at
 * −7.5, and the tanks passed through three hatches' collars; the hatches
 * went up to −1.2 and the seeds down to −8.2. The review found three of
 * the four dome ribs' feet off the skirt's rim — the ring was pushed out
 * by the dome's sag, 0.15 m, and the rib along the keel ended 0.06 m
 * outboard of the skirt's apothem — so the ring is drawn at the dome's own
 * radius now and the tube at 0.4 (`listeningTurret`): every rib meets the
 * skirt, the dome, its neighbours and the boss on their crossing.
 *
 * FACETS. Every ring asks the Klaxon's rule (bathyarch.mjs `cut`): the
 * hold cans, hoops, duct and dome ribs fourteen and twelve, the bow and
 * stern cans fourteen, the skirt and dome ten, the collars and tanks
 * eight, the doors, rims, wheels, pipes, hub and boss six. facets.mjs's
 * advisory list names the drums laid along X by their length as a radius
 * — the Chorister's three cans and both pipes read the same way there —
 * and the counts it reads are the rule's.
 *
 * PANELS. The Klaxon's band for a hull is 0.75–2 m on a side, the median
 * unlit part from above (bathyarch.mjs `panels`): this file reads 1.37 m
 * over 96 parts, with the twenty-four walk rivets and eight lugs at
 * 0.75 m, the walk's plates, hatches and seams at 1.2–1.6 and the patches
 * at 1.6–2.3 either side of the median.
 *
 * Coordinate tables below are laid out as tables on purpose; `tools/**\/*.mjs`
 * is outside the repo's Prettier scope (package.json) precisely so they can be.
 */
import { THREE, add, box, bothSides, seat, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/** The design length (UNIT_STATS Verger hullLengthM, silhouettes.ts). Drawn at it. */
const L = 100;
const BOW = L / 2;
const STERN = -L / 2;
// The Klaxon's facet rule for a hull drawn in metres (bathyarch.mjs `cut`, #919).
const cut = bathyarch.cut();

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const unlit = bathyarch.ink.amberLampUnlit();

const root = new THREE.Group();
root.name = 'consortium_verger';
const bar = (name, mat, size, t, e) => add(root, name, box(...size), mat, t, e);

/**
 * The four cans, bow first: `{ x, r, length }` the scales the drums are
 * drawn at. The hold cans meet at x 0 where their caps cross; the end cans'
 * inner caps are buried in the hold caps, as the Chorister's outer cans'
 * are in its middle can's.
 */
const CANS = [
  { mat: black, x: 34, r: 6.5, length: 16, pitch: 2.8, rivets: false },
  { mat: grey, x: 13, r: 9.5, length: 26, pitch: 4, rivets: false },
  { mat: grey, x: -13, r: 9.5, length: 26, pitch: 4, rivets: false },
  { mat: black, x: -34, r: 6.5, length: 16, pitch: 2.8 },
];
const HOLD_R = 9.5;

// "Overlapping segments": the cans, each with its caps, bow first. Only the
// stern can keeps the Chorister's five crown rivets: the bow can's crown
// carries the turret and the hold cans' the walk (the header).
bathyarch.cans(
  root,
  { rust, grey },
  {
    cans: CANS,
    cap: { length: 2.4, tip: 0.85, proud: 0.6 },
    rivet: { size: [0.9, 0.5, 0.9], proud: 0.2 },
    cut,
  }
);

// The hoop frames, one over each hold can's middle.
bathyarch.canHoops(root, rust, {
  hoops: [
    ['hoop_0', 13, HOLD_R],
    ['hoop_1', -13, HOLD_R],
  ],
  t: 0.35,
  cut,
});

// The heavy keel under the hold cans, sunk half a metre into their bottom
// plates, and the two ballast tanks under the chines either side of it —
// the starboard one 40 m and further aft, the port one 34 m and further
// forward, so the pair never mirrors.
const keelY = -bathyarch.crownOnX(HOLD_R, cut.round(HOLD_R));
bar('keel', rust, [56, 3, 4], [0, keelY - 1.5 + 0.5, 0]);
bathyarch.keelTanks(root, { grey, rust }, {
  on: 'can_2',
  r: 2.8,
  sink: 0.7,
  cap: { length: 2.4, tip: 0.6, sink: 0.3 },
  tanks: [
    ['s', -8, 40, [-8.2, 8]],
    ['p', -2, 34, [-8.2, -8]],
  ],
  cut,
});

// The four cohort bays: a pressure hatch a station on the hold cans,
// alternating sides from starboard, 1.2 m below the axis (the header says
// why there). Grey collar, dark door, lit rim, grey wheel on a rust hub,
// four rust lugs.
bathyarch.canHatches(root, { collar: grey, door: unlit, rim: lampM, grey, rust }, {
  cans: CANS,
  hatches: [
    { side: 's', x: 20, can: 1 },
    { side: 'p', x: 6, can: 1 },
    { side: 's', x: -6, can: 2 },
    { side: 'p', x: -20, can: 2 },
  ],
  y: -1.2,
  r: 3,
  proud: 1.8,
  sink: 1.2,
  tube: 0.3,
  wheel: { R: 1, t: 0.12 },
  hub: { r: 0.3, h: 0.5 },
  cut,
});

// The listening turret on the bow can's crown.
bathyarch.listeningTurret(root, { grey, black, rust, lampM }, {
  on: 'can_0',
  x: 34,
  r: 4.2,
  skirt: { h: 4, sink: 1.5 },
  squash: 0.65,
  ribs: { count: 4, t: 0.4 },
  rivets: { size: [0.6, 0.4, 0.6], below: 0.5, sink: 0.1 },
  crown: { r: 1.4, h: 0.4, sink: -0.15 },
  cut,
});

// The deck walk, seated on the hoops (the header), the hazard stripe and
// the asset stencil on it, and the two lit ports — the walk's marks.
const walkY = seat(root, 'hoop_0', [13, 0, 0], { drop: true, stand: 0.3 }).at[1];
bar('deck_walk', grey, [52, 0.6, 4.2], [0, walkY, 0]);
bar('hazard_stripe', amber, [16, 0.3, 1], [-4, walkY + 0.45, 0]);
bathyarch.bowStencil(root, amber, { at: [20.5, walkY + 0.45, 0], size: [5, 0.3, 1.2] });
bar('port_a', lampM, [1.2, 0.5, 0.8], [-9, walkY + 0.55, 1.3]);
bar('port_b', lampM, [1.2, 0.5, 0.8], [14, walkY + 0.55, -1.2]);

// A pipe run a side on the hold cans' shoulder plates, standing off them
// by the hoops' depth so each rests on both frames: the starboard one
// 44 m at the third plate, the port one 36 m at the same plate, further
// aft.
const shoulder = (z, r, x) => seat(root, 'can_1', [Math.max(x, 1), 6.2, z], { stand: r + 0.2 }).at;
const pipeS = shoulder(7.2, 0.6, 1);
const pipeP = shoulder(-7.2, 0.5, 1);
bathyarch.keelPipes(root, rust, {
  pipes: [
    ['pipe_s', 0.6, 44, [0, pipeS[1], pipeS[2]]],
    ['pipe_p', 0.5, 36, [-4, pipeP[1], pipeP[2]]],
  ],
  cut,
});

// The bow: a block of hull black set 0.3 m into the bow can's fore cap,
// the bow plate and its hazard band on its face, the lamp on its top. The
// stern: the drive in its duct, set 0.3 m into the stern can's aft cap,
// the hub's after face at −50.
bar('bow_block', black, [6.3, 10, 10], [46.65, 0, 0]);
bathyarch.bowPlate(root, { grey, amber }, {
  plate: { at: [BOW - 0.2, 0, 0], size: [0.4, 9, 9] },
  band: { at: [BOW - 0.25, 2.8, 0], size: [0.5, 1.2, 9.4] },
});
bathyarch.bowLamp(root, lampM, { at: [46.4, 5.2, 0], size: [1, 0.5, 1.6] });
bathyarch.ductedDrive(root, { grey, black, rust }, {
  stern: STERN,
  length: 6.2,
  r: 5.6,
  wall: 0.8,
  sink: 0.3,
  hub: { r: 1.5, length: 7.5 },
  vanes: { count: 3, phase: 0.5, chord: 1.6, t: 0.4, x: -46.2 },
  blades: { count: 3, pitch: Math.PI / 3, size: [0.3, 9, 1.1], x: -48.6 },
  cut,
});

// A fin a side astern, sunk half a metre into the stern can at the beam:
// the +z pair first, which is starboard, then −z (#642).
bothSides((side, sgn) => bar(`fin_${side}`, grey, [8, 0.6, 6], [-35, -0.5, sgn * 9]));

// The box stack beside the walk on the aft hold can, to starboard.
const stackAt = seat(root, 'can_2', [-18, 0, 3.6], { drop: true, stand: 3 - 0.8 }).at;
bar('stack', black, [2.2, 6, 2.2], [-18, stackAt[1], 3.6]);

// PANELS: the walk and the cans dressed to the band (bathyarch.mjs
// `deckHatches`, `deckPlates`, `plateSeams`; kit.mjs `seat`). Two dogged
// hatches on the walk; eight plates of the other two finishes laid on the
// grey walk clear of the stripe, the stencil, the ports and each other;
// three seams across the walk; a patch on each can's shoulder plates,
// none mirroring another; and a rivet row along each edge of the walk on
// the hold cans' second plates, the starboard row on a pitch of four
// from −24 and the port from −22, none at the hoops or the V-groove.
const WALK = 'deck_walk';
bathyarch.deckHatches(
  root,
  { hatch: black, wheel: rust },
  {
    on: WALK,
    r: 1,
    h: 0.4,
    wheel: { R: 0.5, t: 0.08 },
    hatches: [
      ['walk_hatch_a', [-15, 0.3]],
      ['walk_hatch_f', [10, 0.6]],
    ],
    cut,
  }
);
bathyarch.deckPlates(root, { black, rust }, {
  on: WALK,
  t: 0.25,
  plates: [
    ['walk_plate_0', 'black', [1.8, 1.2], [-2, 1.4]],
    ['walk_plate_1', 'rust', [1.6, 1.1], [-10, -1.4]],
    ['walk_plate_2', 'black', [2.2, 0.9], [4, -1.5]],
    ['walk_plate_3', 'rust', [1.6, 1.3], [15.5, 1.1]],
    ['walk_plate_4', 'rust', [2.4, 0.8], [-19, 1.4]],
    ['walk_plate_5', 'black', [1.8, 1.5], [-23, -0.9]],
    ['walk_plate_6', 'black', [1.2, 1.2], [24.6, 0.9]],
    ['walk_plate_7', 'rust', [1.6, 1.0], [-16.5, -1.4]],
  ],
});
bathyarch.plateSeams(root, rust, {
  on: WALK,
  name: 'walk_seam',
  stations: [-21.5, 7.5, 17.5],
  length: 4.2,
  w: 0.5,
  h: 0.25,
});
const canPatch = (on, plates) => bathyarch.deckPlates(root, { black, rust }, { on, t: 0.25, plates });
canPatch('can_1', [
  ['can_patch_0', 'rust', [3, 2], [19, -4.3]],
  ['can_patch_1', 'black', [2.4, 1.6], [4, 4.6]],
]);
canPatch('can_2', [
  ['can_patch_2', 'rust', [3.2, 1.8], [-9, 4.2]],
  ['can_patch_3', 'black', [2, 1.4], [-22, -4.8]],
]);
canPatch('can_3', [['can_patch_4', 'rust', [2.2, 1.4], [-31, 3]]]);
canPatch('can_0', [['can_patch_5', 'black', [2, 1.2], [29, -2.8]]]);
const stations = (from, to, pitch) => {
  const out = [];
  for (let x = from; x <= to + 1e-9; x += pitch) out.push(x);
  return out;
};
const row = (side, z, xs, on) => ({ side, z, y: 8.9, stations: xs, on });
bathyarch.flankRivets(root, grey, {
  name: 'walk_rivet',
  size: [0.9, 0.5, 0.9],
  running: true,
  rows: [
    row('s', 2.6, stations(4, 24, 4), 'can_1'),
    row('s', 2.6, stations(-24, -4, 4), 'can_2'),
    row('p', -2.6, stations(2, 22, 4), 'can_1'),
    row('p', -2.6, stations(-22, -2, 4), 'can_2'),
  ],
});

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'verger-bathyarch.glb', { trim: bathyarch.TRIM });
