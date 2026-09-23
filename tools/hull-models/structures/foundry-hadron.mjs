/**
 * The Foundry, Hadron Knights — 320 m of footprint (2 × `radiusM` 160,
 * tools/hull-maps/models.mjs), SIG 25 idle, 55 with the line running.
 *
 * "Unit production hall with a recessed launch bay and gantry cranes (SIG
 * 25 idle, 55 with the line running). Dim at rest; interior forge light
 * spilling from the bay when producing" (docs/asset-prompts-3d.md,
 * STRUCTURE — Foundry). One prompt block, four scripts; the per-navy
 * difference is docs/art-direction.md's.
 *
 * The Order's is two wing halls either side of the bay — a six-facet drum
 * each, pointed at both ends, crested in alloy, ridged in crystal, three
 * port lights on its shoulder — the bay between them with its forge line,
 * an octahedron of a hull in progress, a lip either side and a rank of five
 * crystal guides along the floor inboard of each, two gantry cranes over it
 * with octahedral loads in dark steel, a launch
 * gate of two pylons, a lit threshold, a crossbeam and a gate crystal, two
 * ballast tanks and two standpipes with flanges astern, and three mirrored
 * pairs of anchor blades raked out from the flanks.
 *
 * A port of the approved export (docs/concept-art/models/foundry-hadron.glb
 * at f7cce0f), part for part in its order, every number the export's own
 * (#652 round two). Sixty-six parts, 1,608 triangles. The bay, the cranes,
 * the tanks and the standpipes are the kit's Foundry vocabulary (kit.mjs
 * `foundryBay`, `gantryCrane`, `ballastTanks`, `flangedPipes`) at this
 * file's numbers; the wings, the gate and the blades are
 * `factions/hadron.mjs`'s works section (`hallWings`, `launchGate`,
 * `rakedBlades`). The kit's `launchMouth` does not reach the gate: it draws
 * a torus and a drum under fixed names, and the Order's gate is four other
 * shapes under four other names, so it is the module's. Nothing here is a
 * shape decision; where the export is odd the script is odd with it:
 *
 * - The lips and their guides are `_r` and `_l` (the kit's `sides`, named
 *   as the file names them), the trolleys sit on the centreline, the loads
 *   are octahedra pressed to [0.7, 0.9, 0.7] and hang 1.1 apart, and the
 *   cable keeps the kit's 0.2 above each.
 * - The wings' 0.82 press is on their own z, which after the quarter turn
 *   is the world's height; the six port lights are six buffers where the
 *   pylons, the tanks and the standpipes share one a pair.
 * - The three blade pairs are one rake, (1, 0.55, 0.1), seated 0.65 from
 *   anchors at (7.2, 0.5, 4.2), (8, 0.5, −0.6) and (6.6, 0.5, −6), shadow,
 *   alloy, shadow.
 * - The two lamps burn at 2.118362294686672 and 3.7930280838563952, the
 *   file's floats; `forge_light` is `crystal_glow`'s finish under this
 *   file's name. The lit crystal is `resonance_crystal_dim`, the turret's
 *   fixture, since #888: the file lit it under the cladding's name
 *   `resonance_crystal`, over #2A1650 at metalness 0.1, and a name that is
 *   a cladding on the hulls and a lamp here is two names. `shadow_indigo`
 *   is at the hulls' metalness of 0.35 for the same reason; the file had
 *   the turret's 0.25. Neither emissive moved, so the strengths are the
 *   file's.
 *
 * SIDES. Every pair is the export's `_r`/`_l` (`hadron.pair`), mirrored
 * across the export's x, the `_r` at +x. This is a Z-long export, so the
 * export's +x lands on the kit's −z through `drawn`, which is port (#642):
 * every `_r` — wing, lip, guide, pylon, tank, standpipe, blade — is on the
 * port side of the built file. That is the Sentinel Turret's case (#639),
 * whose `_r`/`_l` are the export's own and were carried, and not #642's
 * relabel case, whose rule names port and starboard; the names are carried
 * as the file has them, nothing relabelled, nothing mirrored. The bow is
 * the gate end, the export's +z, on the kit's +x.
 *
 * THE FRAME is the one the Light Scouts state for the shared kinds and the
 * Directorate's Foundry follows: the export is drawn along Z, 19.30 units
 * long for a 320 m footprint (hull-intake's `rawSize.z` on the approved
 * file, which yawed it onto X — Z-long by a hair, 19.30 against 19.07),
 * ground at y = 0; built here metre-true at 320 m along +X, centred on its
 * length, the ground kept at y = 0. Every placement goes through kit.mjs
 * `drawn` (the kit's `zLong` frame); the two crane frames through `group`;
 * the one scale and shift through `metreTrue`. `DRAWN` is the export's
 * length as intake measures it, so both consumers' own rescale is exactly 1
 * and the maps stay where the approved export put them; the built file is
 * X-long (320 × 316.2 m), so intake does not yaw it again — which the
 * script asserts after the fit, the plan being nearly square.
 *
 * `diff.mjs foundry-hadron f7cce0f`: unchanged beyond the root scale and
 * shift but for the eighteen parts below — every other part is where it
 * was.
 *
 * LIGHT (#890). The block's resting clause is "dim at rest", which names
 * no lamp: the running lights on the halls, the bay guides and the forge
 * line are carried lit as this and every approved Foundry lights them
 * (#890, review rulings, rulings 2 and 3 — one reading for all four), and
 * the block naming its resting lamps is follow-up #893. Eighteen lamps
 * were hidden from above on every build from #652 to #890, and
 * models-plan.md §3.2 decides each:
 * - `wing_portlight_r_0..2` and `_l_0..2`, the running lights — kept lit.
 *   The file set them into each wing's outboard flank at x 5.75, y 2.3,
 *   under the shoulder facet that runs from (5.865, 2.925) up to the crown
 *   at (3.7, 3.95). Each moves onto that facet at x 5.4, y 3.2 — its centre
 *   a twentieth proud of the slope, outboard of the crest (3.33..5.07) —
 *   rule 5, and shows 7.8 m². `diff.mjs` lists the six (14.9 m at 320 m).
 * - `bay_guide_r_0..4` and `_l_0..4` — kept lit in `resonance_crystal_dim`.
 *   The file stood them on the lips at x ±1.65, y 1.62, inside the wing
 *   halls' plan (each hall's inboard face is at 1.535) and under the crane
 *   beams at z ±2.7. Each rank moves onto the bay floor at x ±0.75, y 0.62
 *   (set a fiftieth into the floor's top at 0.55), z −4.1 to 5.9 at the
 *   kit's pitch — the sibling Foundries' own station (kit.mjs `foundryBay`
 *   `guide.x`), inboard of the halls' bulge and clear of the forge line
 *   (±0.5), the hull in progress (±0.6) and both beams — rule 5, and shows
 *   5.1–5.4 m² each. `diff.mjs` lists the ten (16.6 m at 320 m).
 * - `gantry_load_0` and `_1`, the octahedra under the trolleys — clad in
 *   `dark_steel`, the cable's and the trolley's, which is what each hangs
 *   from. The block names no crane load; the Directorate's and the
 *   Commune's loads hang in their own claddings (`weld_steel`,
 *   `grown_steel`), and the Consortium's cranes carry a hook in
 *   `oxide_rust` and no load at all. A part that was never a lamp in the
 *   block's terms takes the cladding it sits on (#890 review), not a lamp
 *   family's unlit finish. `diff.mjs` lists the two materials, and nothing
 *   else.
 * - `gate_threshold` is not this issue's: it stays lit in `forge_light`
 *   (218 m², never hidden). It is the Order's reading of the kit's
 *   `launchMouth`, whose `launch_glow` the Directorate's and the Commune's
 *   Foundries clad under #890 as the light "spilling from the bay when
 *   producing"; whether the Order's threshold is that glow under another
 *   name is a follow-up under #893.
 */
import {
  THREE,
  octa,
  foundryBay,
  gantryCrane,
  ballastTanks,
  flangedPipes,
  metreTrue,
  exportGlb,
} from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 320;
const DRAWN = 19.300000047683717;
const DATUM = 0;

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.alloyWhite();
// The two strengths are the approved export's own floats (#639 review, N1).
const crystal = hadron.ink.resonanceCrystalDim(2.118362294686672);
const forge = hadron.ink.forgeLight(3.7930280838563952);
const steel = hadron.ink.darkSteel();

const root = new THREE.Group();
root.name = 'foundry_hadron';

// The two wing halls, `_r` then `_l`.
hadron.hallWings(
  root,
  { shadow, alloy, crystal, light: forge },
  {
    hull: { r: 2.5, length: 13, x: 3.7, y: 1.9, squash: 0.82 },
    crest: { size: [1.7, 0.35, 11.96], x: 4.2, y: 3.75, roll: -0.28 },
    ridge: { size: [0.2, 0.2, 11.18], x: 2.1, y: 3.45 },
    ends: { r: 2.05, length: 3.2, z: 8.05 },
    lights: { r: 0.11, x: 5.4, y: 3.2, zs: [-3.6, 0, 3.6] },
  }
);

// The bay: floor, forge line, the hull in progress — an octahedron — and a
// lip either side with five lit crystal guides along the floor inboard of it
// (see LIGHT), `_r` then `_l`.
foundryBay(
  root,
  { floor: steel, forge, hull: alloy, guide: crystal },
  {
    floor: { size: [3.2, 0.4, 12], at: [0, 0.35, 0] },
    forge: { size: [1.0, 0.18, 10.6], at: [0, 0.58, 0] },
    hull: { geo: octa(0.85), at: [0, 1.15, 1.6], scale: [0.7, 0.6, 2.2] },
    lip: { size: [0.45, 1.4, 12.2], x: 1.65, y: 0.85 },
    guide: { r: 0.09, facets: [5, 4], x: 0.75, y: 0.62, from: -4.1, pitch: 2.5, count: 5 },
    sides: [
      { lip: 'r', guides: 'r', sgn: 1 },
      { lip: 'l', guides: 'l', sgn: -1 },
    ],
  }
);

// Two cranes over the bay, smaller than the Directorate's in every
// dimension, trolleys on the centreline, dark-steel loads (see LIGHT) 1.1
// apart.
const crane = {
  steel: alloy,
  finial: shadow,
  trolley: steel,
  cable: steel,
  load: steel,
  warnlight: forge,
};
const order = {
  legs: { x: 2.45, y: 2.7, size: [0.32, 5.4, 0.32] },
  beam: { y: 5.6, size: [5.6, 0.42, 0.55] },
  finials: { x: 2.8, y: 6.3, r: 0.11, h: 1.0, facets: 4 },
  trolley: { x: 0, y: 5.15, size: [0.75, 0.48, 0.65] },
  cable: { r: 0.05, facets: 5, hang: 0.2 },
  warnlight: { y: 5.95, r: 0.09, facets: [5, 4] },
};
const load = (y) => ({ y, geo: octa(0.42), scale: [0.7, 0.9, 0.7] });
gantryCrane(root, crane, { ...order, n: 0, at: [0, 0, -2.7], load: load(2.45) });
gantryCrane(root, crane, { ...order, n: 1, at: [0, 0, 2.7], load: load(3.55) });

// The launch gate: pylons, lit threshold, crossbeam, gate crystal.
hadron.launchGate(
  root,
  { alloy, glow: forge, shadow, crystal },
  {
    pylon: { r: 0.35, length: 3.4, at: [2, 2.6, 7.1] },
    threshold: { size: [3.8, 0.22, 0.6], at: [0, 0.5, 7] },
    crossbeam: { size: [4.4, 0.35, 0.4], at: [0, 4.15, 7.1] },
    crystal: { r: 0.45, at: [0, 4.75, 7.1], scale: [0.6, 1.4, 0.6] },
  }
);

// Ballast tanks and standpipes with flanges astern, a pair on one buffer
// each, the pipes before the flanges.
ballastTanks(root, steel, {
  r: 0.65,
  length: 1.7,
  share: true,
  tanks: [
    { n: 'r', at: [5.4, 1, -5.6], rot: [Math.PI / 2, 0, 0] },
    { n: 'l', at: [-5.4, 1, -5.6], rot: [Math.PI / 2, 0, 0] },
  ],
});
flangedPipes(
  root,
  { pipe: steel, flange: alloy },
  {
    stems: { pipe: 'standpipe', flange: 'standpipe_flange' },
    pipe: { radii: [0.15, 0.19], facets: 7 },
    flange: { R: 0.2, tube: 0.05, facets: [5, 10] },
    order: 'kind',
    share: true,
    pipes: [
      {
        n: 'r',
        length: 2.4,
        at: [5.9, 1.4, -3.9],
        rot: [0.08, 0, -0.1],
        flange: { at: [5.9, 2.1, -3.9], rot: [Math.PI / 2, 0, 0] },
      },
      {
        n: 'l',
        length: 2.4,
        at: [-5.9, 1.4, -3.9],
        rot: [0.08, 0, 0.1],
        flange: { at: [-5.9, 2.1, -3.9], rot: [Math.PI / 2, 0, 0] },
      },
    ],
  }
);

// Three pairs of anchor blades on one rake down the flanks.
const RAKE = [1, 0.55, 0.1];
hadron.rakedBlades(
  root,
  { shadow, alloy },
  {
    r: 0.26,
    length: 1.9,
    seat: 0.65,
    blades: [
      { anchor: [7.2, 0.5, 4.2], axis: RAKE },
      { anchor: [8.0, 0.5, -0.6], axis: RAKE },
      { anchor: [6.6, 0.5, -6.0], axis: RAKE },
    ],
  }
);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
{
  root.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  if (size.z >= size.x)
    throw new Error(
      `${root.name}: built ${size.x.toFixed(3)} × ${size.z.toFixed(3)}; intake would yaw it`
    );
}
await exportGlb(root, 'foundry-hadron.glb');
