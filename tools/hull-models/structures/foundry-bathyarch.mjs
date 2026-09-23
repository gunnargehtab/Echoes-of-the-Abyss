/**
 * The Foundry, Bathyarch Consortium — 320 m of footprint (2 × `radiusM`
 * 160, packages/shared/src/structures.ts), SIG 25 idle.
 *
 * "Unit production hall with a recessed launch bay and gantry cranes (SIG
 * 25 idle, 55 with the line running). Dim at rest: the forge light across
 * the bay and at its mouth, the bay's guide lights or rim strips, the
 * gantries' lamps, and the navy's own lamps on the halls and the mouth —
 * running lights, photophores, veins, seams, ridges or crystals; the same
 * forge light flooding from the bay when producing"
 * (docs/asset-prompts-3d.md, STRUCTURE — Foundry, as #893 amended it).
 * One prompt block, four scripts; the Klaxon's is
 * from the earlier authoring pass its Sentinel Turret came from and shares
 * nothing with the other three navies' Foundries, so it ports from
 * `factions/bathyarch.mjs` alone, as the turret did (#639) — "boxy,
 * riveted, over-engineered rectangles and cylinders".
 *
 * A port of the approved export
 * (docs/concept-art/models/foundry-bathyarch.glb at f7cce0f), part for part
 * in its order, every number the export's own, read off parts.mjs. A slab
 * on a wider step with a pylon at each corner; the hall on its plinth
 * under its roof and ridge, the gable and the bay lintel, four ribs a
 * flank; two stacks, one banded; two roof vents; six patches; the launch
 * bay — walls, sill, aprons and their stripes, the lit forge floor and
 * back wall, three lit rim strips, two lit roof seams and the gable strip;
 * two gantry cranes on a rail a side; three tanks and two straps; two pipe
 * runs, a down pipe and its elbow; and thirty-two rivets on one box. Its
 * five materials are `ink`'s — the four claddings and `amber_lamp` at the
 * export's 3.5. They were `scoutInk`'s until #888, the Light Scout's
 * authoring pass, whose `amber_lamp` was the token through and through;
 * the base is the navy's near-black now and the 3.5 stays, the emissive
 * unmoved. What moved is the base's value: its ten lamps sit on near-black
 * rather than on the brightest cladding on the hall, so the bay reads "Dim
 * at rest" as the block asks, and the name and base are now the Slipway's,
 * whose gantry work lights carry both (the note on `ink.amberLamp`).
 * Nothing here is a shape decision; where the export is odd the script is
 * odd with it:
 *
 * - Port is the export's +x, which `drawn` lands on −z (#642): every `_p`
 *   — pylons, ribs, patches, bay walls, aprons, rails, legs, tanks, the
 *   pipe run — sits at +x in the file, so every name stays.
 * - The ribs are interleaved port, starboard, port, starboard by station,
 *   not a whole side at a time; the file's order, and kept.
 * - No pair matches its opposite: the patches differ in size, height and
 *   plate; the port tanks are two stacked in black and rust with straps,
 *   the starboard one a single rust drum with a black cap forward; the
 *   pipe runs are port rust at y 12 and z −14, starboard black at 10 and
 *   −18, six units shorter.
 * - The forward crane's trolley is run out 5 to starboard, the after one
 *   6.5 to port; the hazard stripes stand 1.71 forward of their bridges.
 * - The rivets are one box under thirty-two nodes, numbered straight
 *   through four ranks: port low, starboard low, port high, starboard
 *   high, eight a rank at four-unit stations from −32.
 * - LIGHT — ten lamps, every one `amber_lamp` at 3.5 and every one lit,
 *   as the block's resting clause names them since #893 (docs/models-plan.md
 *   §3.2 rule 1). The Foundry block is one text for four navies and names
 *   its lamps in words each navy's model answers in its own: "the forge
 *   light across the bay and at its mouth" is the forge floor, the forge
 *   back wall's top and the gable strip over the bay mouth; "the bay's
 *   guide lights or rim strips" the three rim strips; "the gantries'
 *   lamps" the two crane flood patches; and "the navy's own lamps on the
 *   halls and the mouth — … seams" the two roof seams. Six face up and
 *   never moved; the
 *   other four #893 moved. The approved file had `roof_seam_p/s` inside the
 *   roof slab (x ±19.6 in a slab to ±20, y 20.4 in a slab to 21) and
 *   `crane_fwd/aft_floodpatch` under their bridges (y 15.05 under a bridge
 *   from 15.2), so the audit warned on those four and #890 clad them in
 *   `amber_lamp_unlit` in place. Each is lit again at its size: a seam runs
 *   flush along its eave's outer edge at the slab's own height (x ±20.35,
 *   y 20.2) — it reads as a lit strip along the eave, the seam of light
 *   where the roof meets the hall, kept there rather than let into the
 *   roof's top face because a seam is an edge — and a flood patch lies
 *   along the top of its bridge's chord (y 18.85 on a chord to 18.65), the
 *   gantry's lamp. Both moves stay inside the step's plan.
 *
 * THE FRAME: a Z-long export (the step's 66 along z against 59.5 across
 * x, pipe end to pipe end), so every number goes through kit.mjs `drawn`
 * and `part` — `factions/bathyarch.mjs`'s `alongZ` — and `metreTrue` holds
 * the footprint at 320 m on the export's z extent, `DRAWN` 66 by three's
 * `Box3.setFromObject` (intake's `rawSize.z` on the approved file), the
 * export's own y = 0 kept as the ground (the step sinks a tenth into it).
 * Intake then reports ×1.000 and no rotation on the port's output, and the
 * shipped maps re-bake where the approved bake put them.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 320;
const DRAWN = 66;

const black = bathyarch.ink.hullBlack();
const rust = bathyarch.ink.oxideRust();
const grey = bathyarch.ink.ironGrey();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp(3.5);
const put = bathyarch.alongZ;

const root = new THREE.Group();
root.name = 'consortium_foundry';

// The slab on its step, a pylon at each corner.
bathyarch.foundationSlab(
  root,
  put,
  { black, rust },
  {
    slab: { size: [46, 2.4, 62], at: [0, 1.2, -4] },
    step: { size: [50, 1.2, 66], at: [0, 0.5, -4] },
    pylons: { size: [3.2, 4, 3.2], x: 20, y: 2, fore: 22, aft: -30 },
  }
);

// The hall: body, plinth, roof, ridge, gable, lintel, four ribs a flank.
bathyarch.productionHall(
  root,
  put,
  { grey, black },
  {
    body: { size: [38, 17, 32], at: [0, 10.9, -18] },
    plinth: { size: [40, 3.4, 34], at: [0, 4.1, -18] },
    roof: { size: [40, 1.6, 34], at: [0, 20.2, -18] },
    ridge: { size: [10, 2.6, 30], at: [0, 22.2, -18] },
    gable: { size: [30, 6, 1.6], at: [0, 16.5, -1.4] },
    lintel: { size: [26, 2.6, 2.2], at: [0, 12.2, -1.6] },
    ribs: { size: [2, 15, 2.4], x: 19.9, y: 10.4, stations: [-6, -14, -22, -30] },
  }
);

// Two stacks, two roof vents, and the patchwork: two patches a flank, one
// on the roof, one on the gable, older plate and black.
bathyarch.hallStacks(
  root,
  put,
  { rust, amber, black },
  {
    a: { radii: [1.4, 1.7], h: 8, at: [11, 24, -26] },
    band: { r: 1.55, h: 0.8, at: [11, 26.6, -26] },
    b: { radii: [1.1, 1.4], h: 6.4, at: [14.5, 23.2, -20] },
  }
);
bathyarch.roofVents(
  root,
  put,
  { rust, black },
  {
    a: { size: [4.4, 1.8, 4.4], at: [-12, 21.8, -24] },
    b: { size: [3.4, 1.4, 3.4], at: [-14, 21.4, -12] },
  }
);
bathyarch.repairPatches(
  root,
  put,
  { rust, black },
  {
    patches: [
      ['patch_p1', 'rust', [0.2, 6.4, 9], [19.12, 10, -14]],
      ['patch_p2', 'black', [0.2, 4.2, 5.5], [19.12, 13.5, -27]],
      ['patch_s1', 'rust', [0.2, 7.5, 7], [-19.12, 9, -22]],
      ['patch_s2', 'black', [0.2, 3.6, 4.6], [-19.12, 14.8, -9]],
      ['patch_roof', 'rust', [6.5, 0.2, 8], [8, 21.06, -14]],
      ['patch_gable', 'rust', [7, 4.4, 0.2], [-8.5, 16, -0.5]],
    ],
  }
);

// "A recessed launch bay": the walls, sill and aprons; "the forge light
// across the bay and at its mouth" — the floor, the back wall and the rim
// strips, the forward one across the mouth; and "the navy's own lamps on
// the halls — ... seams" — the roof seams along the eaves and the gable
// strip.
bathyarch.launchBay(
  root,
  put,
  { grey, black, amber, lampM },
  {
    walls: { size: [2.6, 5.6, 27], x: 12.3, y: 4.4, z: 12.5 },
    aft: { size: [22, 5.6, 2.2], at: [0, 4.4, -0.2] },
    sill: { size: [24.6, 1.4, 2.4], at: [0, 2.3, 25.6] },
    aprons: { size: [9, 1.2, 28], x: 17.5, y: 6.6, z: 12 },
    stripes: { size: [0.8, 0.3, 26], x: 13.9, y: 7.25, z: 12 },
    floor: { size: [21.5, 0.8, 24.5], at: [0, 2.2, 12.3] },
    backwall: { size: [21.5, 4.2, 0.8], at: [0, 4.6, 0.9] },
    rim: {
      side: { size: [0.9, 0.5, 27], x: 11.4, y: 7.35, z: 12.5 },
      fwd: { size: [23.7, 0.5, 0.9], at: [0, 7.35, 25.5] },
    },
    seams: { size: [0.7, 0.7, 31], x: 20.35, y: 20.2, z: -18 },
    gableStrip: { size: [26, 0.9, 0.7], at: [0, 13.8, -0.9] },
  }
);

// "Gantry cranes": a rail a side, the forward crane and the after one, each
// with its lamp along the top of its chord.
bathyarch.gantryCranes(
  root,
  put,
  { grey, black, rust, amber, lampM },
  {
    rails: { size: [1.6, 1, 28], x: 13.9, y: 8.2, z: 12 },
    cranes: [
      { tag: 'fwd', z: 20, trolley: -5 },
      { tag: 'aft', z: 6, trolley: 6.5 },
    ],
    legs: { size: [1.8, 7, 2.2], x: 13.9, y: 12.2 },
    bridge: { size: [31, 2.6, 3.2], y: 16.5 },
    chord: { size: [31, 0.9, 1.2], y: 18.2 },
    trolley: { size: [3.6, 2, 4], y: 14.2 },
    hook: { size: [1.1, 3.4, 1.1], y: 11.2 },
    stripe: { size: [31, 0.6, 0.2], y: 16.5, proud: 1.71 },
    flood: { size: [14, 0.4, 1.6], y: 18.85 },
  }
);

// The tanks along the flanks and the hall's pipework.
bathyarch.sideTanks(
  root,
  put,
  { black, rust, grey },
  {
    p1: { r: 2.4, length: 16, at: [23.5, 4.8, -12] },
    p2: { r: 1.9, length: 13, at: [23.5, 9.2, -16] },
    straps: { size: [0.7, 6, 1], x: 23.5, y: 6.4, a: -8, b: -18 },
    s1: { r: 2.7, length: 12, at: [-23.8, 5, -20] },
    sCap: { radii: [1.6, 2.7], length: 2.2, at: [-23.8, 5, -13] },
  }
);
bathyarch.hallPipes(
  root,
  put,
  { rust, black },
  {
    runs: [
      ['pipe_p_run', 'rust', 0.5, 20, [21, 12, -14]],
      ['pipe_s_run', 'black', 0.5, 14, [-21.5, 10, -18]],
    ],
    down: { r: 0.45, h: 9, at: [9, 9.5, -1.2] },
    elbow: { size: [1.1, 1.1, 3], at: [9, 5.2, 0.6] },
  }
);

// Thirty-two rivets on one box, numbered straight through four ranks —
// port low, starboard low, port high, starboard high. `z` is the kit's,
// the −z the export's +x lands on.
const stations = [-32, -28, -24, -20, -16, -12, -8, -4];
bathyarch.flankRivets(root, black, {
  size: 0.28,
  running: true,
  rows: [
    { z: -19.14, y: 6.5, stations },
    { z: 19.14, y: 6.5, stations },
    { z: -19.14, y: 17.5, stations },
    { z: 19.14, y: 17.5, stations },
  ],
});

metreTrue(root, L, { drawn: DRAWN });
await exportGlb(root, 'foundry-bathyarch.glb');
