/**
 * The Bulwark — the Consortium's heavy, 150 m (docs/units.md, "The rung, and
 * two hulls a navy").
 *
 * "The loudest hull in the game (SIG 70 idle, 75 cruise) and the widest beam
 * in the roster. A slab: blunt ram bow with a plough plate and teeth, blunt
 * stern, three stepped armour tiers, flank plates patchworked
 * older-under-newer, one enormous forward twin turret (an 800 m gun), a
 * bridge citadel aft, four stacks and three prop shrouds. Burning bright:
 * floodlit deck surfaces and rows of floods along both deck edges — the loud
 * state is the resting state."
 *
 * This is the hull #540 opened with — `hull_slab` + `armour_tier_1..3` +
 * `flank_plate_p0..3`, "those repeating series are loops" — and the port
 * that finally runs the loops. Every part comes from `factions/bathyarch.mjs`
 * and every number below is the approved GLB's own, read back part for part
 * (#587): a port transcribes, and a shape decision in it is a bug.
 *
 * Three things the file does that the prompt does not say, kept because the
 * approved model does them:
 *
 * - **The order is the file's.** Port group then starboard group for every
 *   paired family, the sixty-four rivets after the rudder and before the two
 *   bow marks, and the stencil ahead of the lamp — the Tender writes those
 *   two the other way round. `check.mjs` compares in order.
 * - **The rivets are numbered by their place in the file.** `rivet_96` is
 *   the 97th part, because the approved export named each rivet by the
 *   running part count; `rivetRows` does the same, so the run lands at
 *   96 … 159 without a constant.
 * - **The light is where it can be counted.** SIG 70 goes on three flat
 *   flood patches on the tiers and a lit strip with eight lamps along each
 *   deck edge, all facing up. The six engine vents in the transom and the
 *   bow lamp under the plough sit where the top-down bake cannot see them,
 *   as they did in the approved bake; the export's light audit says so, and
 *   moving them would be a redesign.
 *
 * Coordinate tables below are laid out as tables on purpose; `tools/**\/*.mjs`
 * is outside the repo's Prettier scope (package.json) precisely so they can be.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, ram tooth to rudder.
 *
 * The two disagree because the model was drawn with the slab 152 m between
 * its caps and the ram and the rudder reaching past it, so intake and the
 * runtime have both been squeezing this hull by 0.935 since it landed. The
 * numbers below are the approved model's own and the root carries that one
 * squeeze, which makes the file metre-true (kit.mjs) and leaves the shipped
 * maps exactly where they were — the Sower's answer (hulls/sower.mjs).
 */
const L = 150;
const DRAWN = 160.5;

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const vent = bathyarch.ink.amberVent();
const flood = bathyarch.ink.amberFlood();

const root = new THREE.Group();
root.name = 'consortium_bulwark';
root.scale.setScalar(L / DRAWN);

// The slab and the three tiers stepped up it, each a plan in absolute metres,
// bow first down the port side and back up the starboard. The slab is 14 m
// thick with a metre of chamfer at the rim; the tiers are square-edged and
// alternate grey plate, hull black, grey plate — the middle one is the older
// armour showing through under the newer.
bathyarch.armouredSlab(root, { black, grey }, {
  slab: {
    outline: [[75, 18], [54, 30], [-54, 30], [-75, 18], [-75, -18], [-54, -30], [54, -30], [75, -18]],
    depth: 14, bevel: 1, y: -1,
  },
  tiers: [
    { outline: [[66, 16], [50, 27], [-52, 27], [-68, 16], [-68, -16], [-52, -27], [50, -27], [66, -16]], depth: 3, y: 7.5 },
    { outline: [[52, 12], [40, 21], [-46, 21], [-58, 12], [-58, -12], [-46, -21], [40, -21], [52, -12]], depth: 3, y: 10.5, mat: 'black' },
    { outline: [[-6, 14], [-40, 14], [-40, -14], [-6, -14]], depth: 2.5, y: 13.25 },
  ],
});

// Four plates a side at a 26 m pitch, the newer (grey, 9 m deep) and the
// older (rust, 7 m, riding half a metre higher) alternating; the seam runs
// above them, a metre and a half inboard of the plate faces.
bathyarch.flankPlates(root, { grey, rust }, {
  z: 30.8, plateT: 2.4,
  plates: [[-44, 22, 9, -1, false], [-18, 22, 7, 0.5, true], [8, 22, 9, -1, false], [34, 22, 7, 0.5, true]],
  seamLength: 100, seam: { y: 6.2, h: 1.2, t: 1.2, z: 29.4 },
});

// The ram: the plough is a 5 m plan with a 0.8 m chamfer, so its waist reaches
// x 77.8 and the teeth stand just short of it.
bathyarch.ramBow(root, { grey, rust, amber }, {
  plough: { outline: [[77, 12], [56, 22], [56, -22], [77, -12]], depth: 5, bevel: 0.8, y: 0.5 },
  teeth: { x: 76, y: 0, z: [-12, -6, 0, 6, 12], size: [5, 4, 2.5] },
  band: { at: [70, 3.5, 0], size: [4, 1, 26] },
});

// The twin turret forward: a 26 m ring, the drum drawn in from 12 m to 11 m,
// and two 40 m barrels 9 m apart tapering to the muzzle.
bathyarch.twinTurret(root, { black, grey, rust, amber }, {
  x: 26,
  ring: { r: 13, h: 2, y: 12.5 },
  drum: { r: 12, rTop: 11, h: 7, y: 17 },
  face: { at: [34, 17, 0], size: [8, 6, 20] },
  hatch: { at: [24, 20.8, 0], size: [4, 0.6, 5] },
  barrel: { x: 54, y: 18, z: 4.5, length: 40, r: 1.8, rMuzzle: 1.4, muzzle: { x: 72, length: 4, r: 1.9 } },
});

bathyarch.citadel(root, { black, grey, rust, lampM }, {
  block: { at: [-22, 19, 0], size: [26, 9, 24] },
  top: { at: [-24, 25.5, 0], size: [18, 4, 16] },
  visor: { at: [-9, 20, 0], size: [2, 3, 24.4] },
  ports: { count: 5, x: -32, pitch: 5, y: 19.5, z: 12.2, size: [2.5, 1.6, 0.5] },
  bridgePorts: { x: -14.8, y: 26, z: [-6, -2, 2, 6], size: [0.5, 1.6, 2.4] },
});

// Four stacks in two pairs abaft the citadel, starboard pair first, each
// with its band written directly after it.
[[-46, -12], [-54, -12], [-46, 12], [-54, 12]].forEach(([x, z], i) => {
  bathyarch.stack(root, black, { name: `stack_${i}`, at: [x, 20, z], r: 2.8, rTop: 2.4, height: 12 });
  bathyarch.stackBand(root, amber, { name: `stack_band_${i}`, at: [x, 24, z], r: 3, h: 1 });
});
bathyarch.engineVents(root, vent, {
  x: -73.5, y: 0, z: [-17.5, -10.5, -3.5, 3.5, 10.5, 17.5], size: [2.2, 5, 4],
});

// The resting light: three flat flood patches, one a tier, and the strip and
// eight lamps along each deck edge.
bathyarch.floodDecks(root, flood, {
  patches: [
    ['fwd', [46, 9.2, 0], [12, 0.3, 30]],
    ['mid', [8, 12.2, 0], [8, 0.3, 34]],
    ['aft', [-22, 14.7, 0], [14, 0.3, 26]],
  ],
});
bathyarch.floodStrips(root, { flood, lampM }, {
  strip: { x: 0, y: 9.2, z: 24.5, size: [96, 0.3, 3] },
  lamps: { count: 8, x: -48, pitch: 14, y: 10, z: 26.5, size: [2, 1.5, 2] },
});

// Ballast, keel skid and pipe run a side, then the two risers off the pipes.
bathyarch.ballastBlisters(root, { grey, rust }, {
  x: -4, y: -6, z: 31, r: 4.5, length: 90,
  skid: { x: 0, y: -14, z: 18, size: [100, 2, 3] },
  pipe: { x: -10, y: 9.6, z: 20, r: 0.8, length: 80 },
});
bathyarch.riser(root, rust, { name: 'pipe_riser_a', at: [-40, 14, 8], r: 0.9, h: 10 });
bathyarch.riser(root, rust, { name: 'pipe_riser_b', at: [-40, 14, -8], r: 0.9, h: 10 });

// Three prop shrouds across the transom, starboard to port, and the rudder.
[-17, 0, 17].forEach((z, i) =>
  bathyarch.propTunnel(root, { grey, black }, {
    name: `${i}`, at: [-76, -3, z], r: 5.5, length: 6, hub: { r: 1.5, length: 7 },
  })
);
bathyarch.rudder(root, grey, { at: [-78, -8, 0], size: [8, 10, 1.5] });

// Sixty-four rivets: twenty a side along the first tier's edge, then twelve a
// side along the second's, numbered from 96 by their place in the file.
bathyarch.rivetRows(root, grey, { from: -50, to: 50, count: 20, y: 9.1, z: 27.2, size: [1, 0.6, 1] });
bathyarch.rivetRows(root, black, { from: -44, to: 38, count: 12, y: 12.1, z: 20.5, size: [0.9, 0.54, 0.9] });
bathyarch.bowStencil(root, amber, { at: [58, 9.2, 0], size: [10, 0.3, 2] });
bathyarch.bowLamp(root, lampM, { at: [74.5, 3, 0], size: [1.5, 1, 4] });

await exportGlb(root, 'bulwark-bathyarch.glb');
