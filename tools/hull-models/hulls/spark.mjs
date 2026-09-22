/**
 * The Spark — the Gantry's craft, 20 m (docs/units.md, "The craft"; #840,
 * off #838).
 *
 * "The Gantry's craft, 20 m — a cell with a screw and a gun, built on the
 * Gantry's slip and launched out of its stern, crewed by nobody, and over
 * the Klaxon's line under way, so its gun carries the +12% and it is what a
 * torpedo aimed at its carrier hits (SIG 40 idle, 62 cruise; 22 at 350 m on
 * a 2.0 s cycle; 120 hull; 70 m/s; PR 2, and no depth drive — it holds the
 * band it was launched into; 120 s in the water before the cell runs out).
 * The Consortium's two shapes and nothing else: a banded pressure cell
 * lying fore-and-aft, dished at both heads, in a riveted lifting frame — a
 * rail down each side, a skid under each rail that sits the Gantry's ways,
 * a post at each corner with a hazard cap and a lifting eye on its head for
 * the gantry's lifting beam — so the plan is a rectangle round a cylinder,
 * and the rectangle is the berth's; a square wedge of a nose bolted to the
 * frame, a bumper plate across its tip with the hazard band on it; one
 * short thick gun on an open ring on the cell's crown forward, no shield; a
 * riveted drive box aft with the exhaust louvres laid on its roof and an
 * open four-bladed screw behind it, no shroud and no cowl. No dive planes
 * and no ballast, because nothing on it changes depth; no bridge, no hatch,
 * no port, because nobody rides it. Sustained glow from the exhaust
 * louvres, the brightest thing on it, and one mark on the nose; burning
 * bright under way on the same lamps; the muzzle flares for the instant of
 * a shot." (docs/asset-prompts-3d.md, UNIT — Spark)
 *
 * Built to that block and not ported from a binary (docs/models-plan.md
 * §3.1). Metre-true at 20 with no root scale: the bumper band is the bow at
 * x 10 and the screw hub's tip the stern at −10 (`metreTrue` asserts it);
 * port is −z (#642).
 *
 * The plan is `sparkPlan` in factions/bathyarch.mjs, and so is the
 * Gantry's berth: the corner posts at x 5.6 and −8.0 and z ±3.0, the skids
 * from −8.6 to 6.0 at z ±2.8 with their soles at y −3.0, and the rim the
 * berth is painted round. One table, two scripts, so the cradle and the
 * craft it holds cannot drift apart without `check.mjs` moving both. The
 * outline `outlines.mjs` cuts from this file (run read-only) is a bumper
 * at ±0.07, the nose widening to ±0.12 at x 0.31, the frame square at
 * ±0.175 — a 0.35 beam — from x 0.30 to −0.43, and the hub's stub astern:
 * squared, as the Consortium's craft was drawn by hand (silhouettes.ts),
 * and a little wider than that stub's 0.16, because the frame is the plan.
 *
 * What the script decided that the block does not say:
 *
 * - **The cell is the Caisson's plant.** `plantCylinder` at a craft's
 *   scale: a sixteen-facet drum 7.6 m long and 4.2 across on the axis,
 *   three bands, a dished head each end, two saddles across the frame
 *   under it. Hull black under grey bands, as the Caisson's is and for its
 *   reason: from above, a banded dark drum between two grey rails is the
 *   cylinder-in-a-rectangle the block asks for, and a grey drum would be
 *   the rails' colour.
 * - **The frame is low, and the posts carry the lift.** `liftFrame`, new:
 *   the rails run along the cell's lower flanks, 0.8 m by 1.2 from x −8.4
 *   to 6.0, so from above they show outboard of the drum as two grey
 *   lines; the skids hang directly under them; the four posts stand 4.8 m
 *   to a hazard cap each — the four amber squares that mark the craft's
 *   corners on the chart — and the eye stands on the cap. The Gantry's
 *   lifting beam is as long as the posts are apart.
 * - **The nose is the navy's square wedge.** `squareWedge`, the Light
 *   Scout's and the Corvette's nose, squashed to 1.25 across and 0.8 tall,
 *   3.4 m from the fore bar; `bowPlate` is its bumper — a grey plate
 *   across the tip and the hazard band on its face — because a craft built
 *   to close to 350 m of what it shoots at has to be able to take the
 *   knock.
 * - **The gun sits on the crown, forward, and points over the nose.**
 *   `craftGun`, new: the Derrick's `barbette` at a craft's scale, which
 *   that builder cannot reach because its cradle and barrel are the
 *   Derrick's to the metre — a seat plate on the cell, an amber ring, a
 *   drum, a black cradle, a 3.6 m barrel drawn in from 0.32 to 0.26 and a
 *   collar at the muzzle, its mouth at x 7.5, short of the nose lamp at
 *   8.4. Nothing on it is lit.
 * - **"No shroud" is the loud kind.** `craftDrive`, new: the drive box
 *   3.6 m by 4.6 on the frame aft, the kit's `louvres` on its roof, a shaft,
 *   a hub drawn in astern, and two plates through the hub a quarter-turn
 *   apart — four blades, no ring round them — which is the Caisson's "no
 *   baffle, no acoustic shroud, no cowl on anything" on a craft whose
 *   argument is being heard.
 * - **The light is small, because E is a density.** E(40) = 7.83 is glow
 *   energy per 1,000 mask pixels, so it asks for about 0.8 % of the plan
 *   lit at full value — on a 108 m² craft, about a square metre. Two
 *   louvre slats 2 m long and 0.6 wide in the vent, and the nose mark: the
 *   louvres are the "vents" of the 36–60 band and the brightest thing on
 *   the craft by area. Nothing is clad unlit: the under-way clause
 *   brightens the same lamps and names none of its own (docs/models-plan.md
 *   §3.2), and the muzzle flare is a transient.
 * - **Patchwork at a craft's scale.** Older plate on the nose's port side,
 *   newer on the drive box's port flank; seven rivets a rail; the asset
 *   number athwart the nose's starboard side, where `bowStencil`'s name
 *   says it goes.
 *
 * The resting light, as the export's audit counts it from above: the two
 * louvre slats at 1.0 m² each and the nose mark at 0.5 — three lit parts,
 * 2.5 m² facing up on a 108 m² plan, no part hidden. The intake bake at
 * 20 m, 4 px/m, reads raw E 17.16 against the target E(40) = 7.83 and dims
 * by ×0.457 — inside ×1/64 .. ×64 with two orders of magnitude either side,
 * and within a few hundredths of the Gantry's ×0.473, so a Spark in the
 * water and the deck that launched it sit the same distance from their
 * lamps' own intensity in the conn view. Under way `applyLiveGlow` scales
 * them by E(62) / E(40), 4.8.
 *
 * 61 parts, 1,568 triangles, six materials; the file spans x −10 .. 10,
 * z −3.5 .. 3.5 and y −3 .. 4.3, so the bake neither rescales nor rotates,
 * and meta.json carries no warnings.
 *
 * Every part comes from `factions/bathyarch.mjs`; `sparkPlan`, `liftFrame`,
 * `craftDrive` and `craftGun` were written for this craft there, beside the
 * Gantry's berth. Coordinate tables below are laid out as tables on
 * purpose; `tools/**\/*.mjs` is outside the repo's Prettier scope
 * (package.json) precisely so they can be.
 */
import { THREE, exportGlb, metreTrue } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/** The design length (UNIT_STATS.hullLengthM). Drawn at it: the bumper band at +10, the screw hub at −10. */
const L = 20;
const plan = bathyarch.sparkPlan;

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const vent = bathyarch.ink.amberVent();

const root = new THREE.Group();
root.name = 'consortium_spark';

// The cell: a banded pressure cylinder lying fore-and-aft on the axis, the
// Caisson's plant at a craft's scale — the drum, three bands, a dished head
// each end, two saddles under it across the frame.
bathyarch.plantCylinder(root, { black, grey, rust }, {
  at: [0.4, 0, 0], r: 2.1, length: 7.6,
  bands: { x: [-2.4, -0.5, 1.4], r: 2.25, width: 0.5 },
  heads: { length: 1.0, tipR: 1.2 },
  saddles: { x: [-2.4, 1.4], y: -2.0, size: [0.6, 0.6, 5.4] },
});

// The lifting frame round it: the rails low on each side, a bar at each
// end, the skids under the rails, and the four corner posts with a hazard
// cap and a lifting eye on each head.
bathyarch.liftFrame(root, { grey, rust, amber }, {
  craft: plan,
  rail: { from: -8.4, to: 6.0, y: -1.8, w: 0.8, h: 1.2 },
  bar: { t: 0.8 },
  skid: { w: 0.7, h: 0.6 },
  post: { t: 0.8, foot: -2.4, top: 2.4 },
  cap: { size: 1.0, h: 0.3 },
  eye: { R: 0.35, t: 0.1 },
});

// The nose: a square wedge bolted to the fore bar, drawn in to a blunt tip,
// the bumper plate across the tip and the hazard band on its face.
bathyarch.squareWedge(root, grey, { name: 'nose_wedge', radii: [1.3, 2.8], length: 3.4, squash: [1.25, 0.8], at: [7.7, 0, 0] });
bathyarch.bowPlate(root, { grey, amber }, {
  plate: { at: [9.65, 0, 0], size: [0.5, 1.6, 2.6] },
  band: { at: [9.9, 0.2, 0], size: [0.2, 0.6, 2.8] },
});

// The drive aft: the box, its roof, the exhaust louvres on the roof, the
// shaft, the hub and an open four-bladed screw.
bathyarch.craftDrive(root, { black, grey, rust, vent }, {
  box: { size: [3.6, 3.4, 4.6], at: [-6.4, -0.2, 0] },
  roof: { size: [3.8, 0.3, 4.8], at: [-6.4, 1.65, 0] },
  louvres: { x: -6.4, y: 1.95, length: 2.0, count: 2, pitch: 1.1, slat: 0.6, tilt: 0.5, t: 0.12 },
  shaft: { r: 0.3, length: 0.6, at: [-8.5, -0.2, 0] },
  hub: { r: 0.55, rTip: 0.4, length: 1.2, at: [-9.4, -0.2, 0] },
  blades: { count: 2, size: [0.3, 3.2, 0.8], at: [-9.3, -0.2, 0] },
});

// The gun on the cell's crown forward: seat, ring, drum, cradle, barrel
// laid forward over the nose, and the muzzle collar.
bathyarch.craftGun(root, { black, grey, rust, amber }, {
  x: 3.0,
  seat: { size: [2.4, 0.3, 2.4], y: 2.2 },
  ring: { r: 1.0, h: 0.4, y: 2.55 },
  drum: { r: 0.8, rTop: 0.7, h: 0.8, y: 3.15 },
  cradle: { size: [1.6, 0.8, 1.1], dx: 0.2, y: 3.9 },
  barrel: { rBreech: 0.32, rMuzzle: 0.26, length: 3.6, breech: 3.6, y: 3.9 },
  muzzle: { r: 0.36, length: 0.4, sink: 0.1 },
});

// The patchwork, the rivets along the rails, the asset number on the drive
// roof and the one mark on the nose.
bathyarch.repairPatches(root, bathyarch.inFrame, { rust, grey }, {
  patches: [
    ['patch_nose', 'rust', [1.2, 0.1, 1.2], [6.9, 1.42, -0.9]],
    ['patch_drive_p', 'grey', [1.6, 1.1, 0.1], [-6.0, -0.4, -2.35]],
  ],
});
bathyarch.rivetRows(root, grey, { from: -7.6, to: 5.2, count: 7, y: -1.15, z: plan.posts.z, size: [0.3, 0.12, 0.3] });
bathyarch.bowStencil(root, amber, { at: [6.5, 1.5, 1.0], size: [0.4, 0.1, 1.4] });
bathyarch.bowLamp(root, lampM, { at: [8.4, 1.1, 0], size: [0.5, 0.25, 0.8] });

// Metre-true as drawn: 20 from the hub to the bumper band, so the scale this
// returns is 1 and the root carries nothing.
const k = metreTrue(root, L, { drawn: L });
if (Math.abs(k - 1) > 1e-6) throw new Error(`consortium_spark: root scale ${k}, expected 1`);

await exportGlb(root, 'spark-bathyarch.glb');
