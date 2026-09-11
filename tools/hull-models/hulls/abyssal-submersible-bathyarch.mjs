/**
 * The Abyssal Submersible, the Klaxon's — 95 m (docs/units.md; the Abyssal
 * Submersible block of docs/asset-prompts-3d.md Block 3, read with the
 * Bathyarch FACTION block).
 *
 * "Mid-size deep-raiding hull born to crush depth (Pressure Rating 3, SIG 22
 * idle). Heavy segmented pressure carapace, folded manipulator limbs, dim
 * red photophores" — said the Klaxon's way: "boxy, riveted, over-engineered
 * rectangles and cylinders; no curve unless a pressure vessel demanded it.
 * Visibly patchworked repairs". A fourteen-sided pressure drum under five
 * reinforcement bands, capped at each end with a cored end plate and a ring
 * of twelve bolts; a nose housing with its viewport; a conning tower of
 * three boxes with a dome light, a periscope and a snorkel; a ballast tank
 * a side, capped and strapped; pipework over the hull; four riveted patches;
 * a manipulator arm a side folded under the bow; a shrouded four-bladed
 * screw; four dive planes and a rudder; a landing skid a side; and four
 * running lights a side, a strip on the tower, an aft beacon, and two point
 * lights either beam, which is the whole light of a hull that idles at SIG
 * 22 — amber, in this navy, not red.
 *
 * A port of the approved export
 * (docs/concept-art/models/abyssal-submersible-bathyarch.glb at 3e15409),
 * part for part in its order, every number the export's own, read off
 * parts.mjs. Every part comes from `factions/bathyarch.mjs`'s Submersible
 * section — its own finishes, `submersibleInk`, hyphenated as the file
 * names them — or is a kit box. Nothing here is a shape decision; where the
 * export is odd the script is odd with it:
 *
 * - The sides are already nautical: `-port` at −z and `-stb` at +z (#642),
 *   so every name stays. The ballast tanks, dive planes, skids and running
 *   lights are written port first; the two manipulators starboard first.
 * - The four patches stand on edge. Each plate's roll is its bearing round
 *   the hull plus a quarter turn, so its depth lies radial and its thin face
 *   tangential; and its four rivets sit 0.07 in from the port edge and 0.13
 *   from the starboard, on every patch (`rivetedPatch` says how that was
 *   read off the file).
 * - The port arm is the starboard arm's numbers hung at −z, not its
 *   reflection: the claws open the same way on both. Each arm's parts sit
 *   directly in its `manipulator-*` frame, and `shoulder-*` is a mesh at
 *   the frame's origin with no transform of its own — not a frame.
 * - `glow-port` and `glow-stb` are two `KHR_lights_punctual` point lights,
 *   #F2B233 at intensity 4 and range 3.5, with no mesh; the port writes them
 *   back as the file has them.
 * - Every part is a buffer of its own — the twenty-four bolts, the eight
 *   running lights, the four blades — as the export carries them.
 * - Of the lamps, the fourth starboard running light lies under `patch-1`'s
 *   plan, the tower strip under the tower cap's and the aft beacon under
 *   the after end cap's, so the export warns on those three, as the approved
 *   bake never saw them either; the viewport, the dome and the other seven
 *   running lights face up.
 *
 * THE FILE IS X-LONG, so nothing here is yawed: unlike the Corvette, the
 * Harvester and the Cruiser, this export already lies along +X with its bow
 * on +X and its hull axis on y = 0, and every part is placed by kit `add`
 * in the file's own frame — the primitive un-turned, the node's translation,
 * XYZ Euler and scale verbatim. THE SCALE is still the one
 * hulls/light-scout-pelagia.mjs states for all six shared kinds: drawn 7.19
 * units long — the hub's after face to the viewport's — with no turned box
 * overhanging either end; built here metre-true at 95 m, centred on its
 * length, the axis at y = 0 (kit.mjs `metreTrue`).
 */
import { THREE, add, box, hex, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 95;
const DRAWN = 7.19;
const DATUM = 0;

const black = bathyarch.submersibleInk.hullBlack();
const grey = bathyarch.submersibleInk.ironGrey();
const brown = bathyarch.submersibleInk.oxideBrown();
const lampM = bathyarch.submersibleInk.runningLight();

const root = new THREE.Group();
root.name = 'bathyarch-abyssal-submersible';
const bar = (name, mat, size, t, e) => add(root, name, box(...size), mat, t, e);

// "Heavy segmented pressure carapace": the drum, its five bands, and at each
// end the cap, its core and the ring of twelve bolts.
bathyarch.bandedHull(
  root,
  { black, grey, brown },
  {
    hull: { r: 1, length: 5.6, facets: 14 },
    bands: { r: 1.13, width: 0.32, x: [-2.2, -1.1, 0, 1.1, 2.2] },
    caps: { x: 2.85, r: 1.18, width: 0.34, core: { x: 3.15, r: 0.72, width: 0.3, facets: 12 } },
    bolts: { x: 3.05, radius: 0.97, count: 12, r: 0.075, h: 0.14 },
  }
);

// The nose housing and its viewport, lit, on the bow face.
bar('nose-housing', brown, [0.55, 0.9, 1.3], [3.25, 0.1, 0]);
bar('nose-viewport', lampM, [0.1, 0.18, 0.8], [3.54, 0.18, 0]);

// The conning tower, its dome light, the periscope and the snorkel.
bathyarch.conningTower(
  root,
  { black, grey, brown, lampM },
  {
    base: { size: [1.7, 0.5, 1.5], at: [0.7, 1, 0] },
    tower: { size: [1.35, 0.9, 1.05], at: [0.7, 1.65, 0] },
    cap: { size: [1.5, 0.22, 1.2], at: [0.7, 2.2, 0] },
    dome: { rTop: 0.16, r: 0.2, h: 0.14, at: [0.7, 2.38, 0] },
    periscope: { r: 0.07, h: 0.8, at: [0.35, 2.6, -0.25], head: { size: [0.3, 0.14, 0.14], at: [0.42, 3, -0.25] } },
    snorkel: { r: 0.1, h: 0.55, at: [1, 2.5, 0.25] },
  }
);

// A ballast tank a side, capped fore and aft and strapped twice.
bathyarch.ballastTanks(
  root,
  { brown, grey, black },
  {
    z: 1.18,
    y: -0.5,
    tank: { x: -0.2, r: 0.42, length: 3.4 },
    caps: { r: 0.46, width: 0.2, fore: 1.5, aft: -1.9 },
    straps: { r: 0.47, width: 0.16, aft: -1.2, fore: 0.8 },
  }
);

// The pipework over the hull: two runs, two elbows, and the drop leaning
// an eighth of a turn.
bathyarch.deckPipework(
  root,
  { grey, brown },
  {
    main: { r: 0.09, length: 2.1, at: [-1.1, 1.12, 0.32] },
    elbowA: { size: [0.2, 0.2, 0.2], at: [-0.05, 1.12, 0.32] },
    drop: { r: 0.09, length: 0.5, at: [-2.2, 0.95, 0.32], lean: Math.PI / 4 },
    main2: { r: 0.07, length: 1.6, at: [-0.9, 1.12, -0.38] },
    elbowB: { size: [0.17, 0.17, 0.17], at: [-1.75, 1.12, -0.38] },
  }
);

// "Visibly patchworked repairs": four riveted patches round the hull, two
// in older plate and two in newer, each its own size, at its own bearing.
const RIVET = { r: 0.045, h: 0.08, inset: { x: 0.09, p: 0.07, s: 0.13 } };
for (const [name, plate, size, at, roll] of [
  ['patch-1', brown, [1.1, 0.07, 0.9], [1.6, 0.54761, 0.86053], 2.57486],
  ['patch-2', grey, [0.8, 0.07, 0.7], [-1.6, -0.59286, 0.83001], -2.52134],
  ['patch-3', grey, [0.9, 0.07, 0.6], [0.3, 0.78359, -0.65299], 0.87606],
  ['patch-4', brown, [0.6, 0.07, 0.5], [-0.7, 0.22127, -0.99571], 0.21867],
])
  bathyarch.rivetedPatch(root, { plate, rivet: black }, { name, size, at, roll, rivet: RIVET });

// "Folded manipulator limbs": the same arm hung at either beam under the
// bow, starboard first as the file writes them.
const ARM = {
  shoulder: { size: [0.5, 0.5, 0.45] },
  pin: { r: 0.12, length: 0.55, at: [0, -0.1, 0] },
  upperArm: { size: [1.3, 0.24, 0.22], at: [-0.62, -0.32, 0], roll: 0.18 },
  elbow: { r: 0.14, length: 0.3, at: [-1.25, -0.44, 0] },
  forearm: { size: [1.15, 0.18, 0.18], at: [-0.68, -0.58, 0], roll: -0.12 },
  wrist: { size: [0.22, 0.22, 0.26], at: [-0.1, -0.64, 0] },
  claws: { size: [0.42, 0.09, 0.1], a: [0.18, -0.6, 0.09], b: [0.18, -0.6, -0.09], yaw: 0.25 },
};
bathyarch.manipulator(root, { grey, brown, black }, { side: 'stb', at: [2.1, -0.65, 0.62], ...ARM });
bathyarch.manipulator(root, { grey, brown, black }, { side: 'port', at: [2.1, -0.65, -0.62], ...ARM });

// The screw: shroud, hub drawn in astern, four blades pitched half a radian.
bathyarch.submersibleScrew(
  root,
  { grey, brown, black },
  {
    at: [-3.35, 0, 0],
    shroud: { R: 0.62, tube: 0.14 },
    hub: { radii: [0.16, 0.22], length: 0.5 },
    blades: { count: 4, size: [0.06, 0.85, 0.26], pitch: 0.5 },
  }
);

// Dive planes aft and fore, the rudder, and a landing skid a side.
bathyarch.divePlanes(
  root,
  { grey, brown },
  {
    aft: { size: [0.7, 0.1, 1.1], x: -2.3, y: 0.15, z: 1.45 },
    fore: { size: [0.55, 0.08, 0.8], x: 2.3, y: -0.15, z: 1.25 },
  }
);
bar('rudder', grey, [0.7, 1.3, 0.1], [-2.55, 0.75, 0]);
bathyarch.skids(
  root,
  { brown, black },
  {
    z: 0.55,
    skid: { size: [3.2, 0.12, 0.18], x: 0.2, y: -1.35 },
    legs: { size: [0.14, 0.4, 0.14], y: -1.1, fore: 1.4, aft: -1 },
  }
);

// "Dim photophores", amber here: four running lights a side, the strip on
// the tower, the aft beacon — and the two point lights either beam that the
// export carries beside its meshes.
bathyarch.hullLights(root, lampM, {
  running: { size: [0.5, 0.09, 0.07], stations: [-1.9, -0.75, 0.4, 1.55], y: 0.28, z: 1.02 },
  strip: { size: [0.9, 0.08, 0.06], at: [0.7, 1.75, 0.56] },
  beacon: { rTop: 0.12, r: 0.14, h: 0.12, at: [-3.08, 0.6, 0] },
});
bathyarch.glowLamps(root, {
  color: hex('#F2B233'),
  intensity: 4,
  range: 3.5,
  lamps: [
    ['glow-port', [0, 0.3, -1.3]],
    ['glow-stb', [0, 0.3, 1.3]],
  ],
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'abyssal-submersible-bathyarch.glb');
