/**
 * The Bastion, Bathyarch Consortium — 440 m of footprint (2 × `radiusM`
 * 220, packages/shared/src/structures.ts), SIG 35 sustained.
 *
 * "The HQ — a large pressure dome with visible reinforcement ribs, docking
 * collars and external pipework, anchored to the seabed (SIG 35 sustained,
 * the settlement's constant hum). Sustained glow from ports and working
 * lights; the one building that can never run silent"
 * (docs/asset-prompts-3d.md, STRUCTURE — Bastion). One prompt block, four
 * scripts; the Klaxon's shares nothing with the other three navies'
 * Bastions — each navy's module holds its own — and is from the earlier
 * authoring pass its Sentinel Turret came from, so it ports from
 * `factions/bathyarch.mjs` alone, as the turret did (#639): "no curve
 * unless a pressure vessel demanded it", and this is the one that did.
 *
 * A port of the approved export
 * (docs/concept-art/models/bastion-bathyarch.glb at f7cce0f), part for
 * part in its order, every number the export's own, read off parts.mjs.
 * The ten-facet foundation and skirt, the dome — a hemisphere squashed
 * 0.92 in height and yawed 0.26 — six ribs over it, the cap and the
 * beacon; ten portholes round the skirt; three docking collars, each with
 * its ring and its lamp; three modules with two patches and four windows;
 * the jib crane; two ballast tanks, one banded; four pipes; and eight
 * perimeter posts with a lamp each. Its materials are `ink`'s: the three
 * claddings and `amber_lamp` at two loudnesses, 2.4 on the work lamps and
 * 1.1 on the ports, as the Refinery carries it. The claddings were the
 * turret's `structureInk` until #888 — the same hexes at 0.3/0.45,
 * 0.3/0.52 and 0.1/0.75 — and are the hulls' finish now; the lamps were
 * `work_lamp` and `port_glow`, the token through and through, until #891
 * put them on the navy's near-black base, where they are one fixture (the
 * module's `amberLamp` says what that moved). One value a name. Nothing
 * here is a shape decision; where
 * the export is odd the script is odd with it:
 *
 * - The portholes are placed round the skirt at 2.74 from 0.31 radians,
 *   a tenth of a turn apart, and each is turned `[π/2, 0, π/2 − a]` in
 *   XYZ order, which stands its disc's axis on (−cos a, 0, sin a) — the
 *   radial mirrored across z, 2a off it folded into a right angle — so
 *   the two ports nearest ±z face out and the other eight face 0.62 to
 *   1.27 radians off their bearings. The three docking collars carry the
 *   same Euler and the same mirrored axis at 3.4 on bearings 0.4, 2.3 and
 *   4.4 — spaced in nothing — and lie 0.80, 1.46 and 0.62 radians off the
 *   rings they feed, which face radially 0.408 further out; each lamp is
 *   0.34 out and up at 1.35.
 * - The six ribs are half tori centred 0.02 above the dome's foot, yawed
 *   a sixth of a half turn apart, squashed with the dome; parts.mjs prints
 *   the fifth and sixth as the wrapped triple.
 * - The modules are yawed 0.5, −0.35 and 0.2, each patch with its module;
 *   the four windows are not yawed with theirs.
 * - The second ballast tank lies at `[π/2, 0.4, 0]`, pitched over and then
 *   yawed, with no band.
 * - Every pipe stands between two round points by the turret's `feed_pipe`
 *   rule: the refinery pipe from (2.4, 1.6, −1.9) to (1.4, 2.1, −0.9), the
 *   quarters pipe from (−2.5, 1, 1.2) to (−1.6, 1.5, 0.7), the ballast pipe
 *   from (−2.2, 1, −1.6) to (−1.2, 1.4, −0.8), the ring pipe from (3, 0.9,
 *   0.9) to (2.2, 1.3, 1.8).
 * - Of the twenty-seven lamps, the beacon, the dock and crane lamps, the
 *   windows and most of the portholes and perimeter lamps show a face or
 *   an edge from above. The export buried the fifth porthole and the
 *   fourth perimeter post and lamp inside the quarters module and the
 *   eighth post and lamp inside the refinery module — each module is
 *   docked into the skirt and stands out past the foundation's edge — so
 *   the audit warned on those three; #890 moved them, the one departure
 *   from the file, since all three are the resting clause's "ports and
 *   working lights" (docs/models-plan.md §3.2 rule 5):
 *   - `porthole_5`: re-cut on the skirt at bearing π, between the quarters
 *     module's after face (2.9 rad at the skirt) and the sixth port
 *     (3.45), at the file's radius and height; its turn follows the
 *     bearing by the file's rule, `π/2 − a`, which at π is −π/2 and stands
 *     the disc's axis on (1, 0, 0) — so the port faces square out along
 *     its radial, as ports 3 and 8 do; the other seven face 0.62 to 1.27
 *     off theirs, and all nine keep their tenth-of-a-turn stations.
 *   - Five portholes and the crane lamp (#907, from #894's resting
 *     measure): `porthole_1`, `_3`, `_5`, `_6` and `_8` stood off the
 *     skirt — 0.55, 0.9, 6.87, 0.55 and 0.9 m — where the file's turn
 *     happened not to meet it, the fifth furthest for facing square out.
 *     Each is seated on the skirt from its own station, the disc laid
 *     flat on the frustum's face (`portholes` `on`, kit.mjs `seat`); the
 *     other five keep the file's turn, touching the skirt edge-on.
 *     `crane_lamp` hung 2.3 m under the jib's end and is dropped onto the
 *     jib's top at the file's station, half in (`jibCrane` `on`).
 *     `diff.mjs` lists the six and nothing else.
 *   - `perimeter_post_4` and `_8`: each post made taller on its own foot,
 *     0.52 and 0.82, so it stands up through its module's roof (1.5 and
 *     1.8) and the lamp sits on the stub above it; the ring of eight stays
 *     evenly spaced.
 *
 * THE FRAME: a Z-long export by the measure the bake takes — 8.7012 along
 * z, the third dock ring's yawed box to the jib's tip, against 7.7194
 * across x — so every number goes through kit.mjs `drawn` and `part`
 * (`factions/bathyarch.mjs`'s `alongZ`) and `metreTrue` holds the
 * footprint at 440 m on that extent, `DRAWN` 8.7012 by three's
 * `Box3.setFromObject` (intake's `rawSize.z` on the approved file, wider
 * than the vertices by the ring's turned box, #647), the export's own
 * y = 0 kept as the ground, which is the foundation's underside. Intake
 * then reports ×1.000 and no rotation on the port's output, and the
 * shipped maps re-bake where the approved bake put them.
 *
 * FACETS (#919). The Klaxon's rule is one facet edge of 2.5 m (docs/asset-prompts-3d.md Block 2c; bathyarch.mjs `cut`),
 * asked at this file's scale, and at 440 m the rule is its ceiling almost
 * through: the foundation, the skirt, the dome's round, the cap, the three
 * docking collars and their rings, the ten portholes, both ballast tanks
 * and its band, and the refinery and quarters pipes are fourteen, where the
 * export had six to sixteen; the dome four rows deep over its quarter and
 * each rib seven over its half, where it had seven and eighteen, the ribs
 * set out by the sag of a seven-segment chord, flush with the dome at the
 * chords and up to 2.8 m clear of its facets at the vertices, where the
 * file's sat 1.15 m into it (`ribbedDome`); the beacon, the dock and perimeter
 * lamps and the crane lamp orbs — the beacon fourteen by seven, the dock
 * lamps ten by five, the perimeter and crane lamps eight by four; the
 * ballast and ring pipes eight; the eight perimeter posts six, where they
 * were five. The crane's cable keeps its four, the navy's one section. All
 * ten portholes are seated on the fourteen-sided skirt and the seventh is
 * re-cut round it clear of `ballast_a` (below). 68 parts and 3,080
 * triangles become 68 and 4,486.
 *
 * PANELS (#919). The structure band is 2–5.5 m a panel (Block 2c;
 * bathyarch.mjs `panels`), and this model read 42.2 m over 30 unlit parts:
 * a dome, a skirt and a 170 m foundation own the plan, and the file dressed
 * the slab with nothing but the modules and the tanks. The pass divides the
 * foundation's bare annulus between the skirt's foot and its own rim — the
 * four arcs the file leaves clear: between the crane and the second collar,
 * between the quarters module and `ballast_a`, between the store and the
 * refinery module, and between the refinery module and `ballast_b` — with
 * fourteen radial seam straps, 18.2 × 0.8 m, at an irregular pitch; four
 * runs of three and four plates of grey and rust, 4.3 × 4.05 m each, laid
 * along the ring between them; and three dogged hatches, 4.6 m across
 * under a 3 m wheel: 31 fittings, 34 parts, since a hatch is two. Every one
 * is dropped onto `foundation` from its station (`deckPlates`,
 * `deckHatches`; kit.mjs `seat`) and reads 2.2–4.2 m on a side from above, the wheels the least;
 * nothing stands over a lamp, and each meets the slab alone. The median
 * edge goes 42.2 m → 4.2 m over 64 panels. 68 parts and 4,486 triangles
 * become 102 and 5,110.
 */
import { THREE, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 440;
const DRAWN = 8.7012;
// The Klaxon's facet rule at this file's scale (bathyarch.mjs `cut`, #919):
// the builders are handed the export's units and the rule is a chord in
// metres.
const cut = bathyarch.cut(L / DRAWN);

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const lampM = bathyarch.ink.amberLamp(2.4);
const glow = bathyarch.ink.amberLamp(1.1);
const put = bathyarch.alongZ;

const root = new THREE.Group();
root.name = 'bathyarch_bastion';

// "A large pressure dome with visible reinforcement ribs": foundation,
// skirt, the dome, six ribs, the cap and the beacon.
bathyarch.ribbedDome(
  root,
  put,
  { black, grey, rust, lampM },
  {
    foundation: { radii: [3.4, 3.8], h: 0.5, y: 0.25 },
    skirt: { radii: [2.5, 2.9], h: 0.9, y: 0.95 },
    dome: { r: 2.4, y: 1.4, yaw: 0.26, squash: 0.92 },
    ribs: { count: 6, R: 2.42, t: 0.09, y: 1.42 },
    cap: { radii: [0.5, 0.66], h: 0.5, y: 3.7 },
    beacon: { r: 0.16, y: 4.05 },
    cut,
  }
);

// "Sustained glow from ports": ten round the skirt, the fifth re-cut clear
// of the quarters module (header, #890). All ten are seated on the skirt
// since #919: #907 seated the five the file's turn left standing off it,
// and of the other five four touched a ten-sided skirt edge-on where their
// turn happened to meet it and the tenth stood 0.19 m off; the skirt is
// fourteen-sided now and its skin sits up to 0.07 units — 3.5 m — from
// where the ten-gon's did, so those five stood off it too, four by 1.5 m
// and the tenth by a metre. Each is laid flat on the
// frustum's face from its own station (kit.mjs `seat`), as the first five
// were. One moves: the seventh's station, 4.08 rad, is where `ballast_a`
// lies against the skirt (its drum reaches z −2.55 from x −3.4 to −1.0),
// so seated there the disc stood 5 m into the tank's end, and the file's
// turn had it edge-on 1.4 m clear. It is re-cut round the skirt to 4.5 rad,
// past the tank's end and 12° short of the eighth port, the way #890
// re-cut the fifth clear of the quarters module; same radius, height and
// material.
bathyarch.portholes(root, put, glow, {
  count: 10,
  phase: 0.31,
  r: 2.74,
  y: 1.15,
  disc: { r: 0.14, h: 0.1 },
  bearings: { 5: Math.PI, 7: 4.5 },
  on: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [i + 1, 'dome_skirt'])),
  cut,
});

// "Docking collars": three, each with its ring and its lamp.
bathyarch.dockingCollars(
  root,
  put,
  { grey, rust, lampM },
  {
    bearings: [0.4, 2.3, 4.4],
    r: 3.4,
    y: 0.85,
    collar: { radii: [0.55, 0.62], h: 0.7 },
    ring: { out: 0.408, R: 0.58, t: 0.08 },
    lamp: { out: 0.34, y: 1.35, r: 0.08 },
    cut,
  }
);

// The modules round the dome, their patches, and their windows.
bathyarch.bastionModules(
  root,
  put,
  { black, grey, rust, glow },
  {
    modules: [
      {
        name: 'refinery',
        plate: 'black',
        size: [1.7, 1.3, 1.2],
        at: [2.7, 1.15, -2.2],
        yaw: 0.5,
        patch: { size: [0.9, 0.7, 0.06], at: [2.35, 1.2, -1.55] },
      },
      {
        name: 'quarters',
        plate: 'grey',
        size: [1.3, 1, 1.6],
        at: [-3, 1, 1.4],
        yaw: -0.35,
        patch: { size: [0.06, 0.6, 0.8], at: [-2.35, 1.1, 1.15] },
      },
      { name: 'store', plate: 'rust', size: [1, 0.8, 1], at: [-1.6, 0.9, -3], yaw: 0.2 },
    ],
    windows: {
      size: [0.16, 0.12, 0.05],
      at: [
        ['refinery_1', [3.1, 1.5, -1.75]],
        ['refinery_2', [2.6, 1.5, -1.5]],
        ['quarters_1', [-2.6, 1.25, 2.1]],
        ['quarters_2', [-2.9, 1.25, 2.25]],
      ],
    },
  }
);

// The jib crane on the +z flank.
bathyarch.jibCrane(
  root,
  put,
  { grey, rust, black, lampM },
  {
    mast: { size: [0.22, 3.4, 0.22], at: [1.9, 2.2, 2.6] },
    jib: { size: [0.16, 0.16, 2.6], at: [1.9, 3.75, 3.5], pitch: 0.08 },
    counter: { size: [0.4, 0.3, 0.6], at: [1.9, 3.6, 1.9] },
    cable: { r: 0.02, h: 1.7, at: [1.9, 2.9, 4.55] },
    hook: { size: [0.3, 0.24, 0.3], at: [1.9, 2, 4.55] },
    lamp: { r: 0.07, at: [1.9, 3.85, 4.7], on: 'crane_jib' },
    cut,
  }
);

// Two ballast tanks, the first banded and laid along x, the second
// pitched over and yawed 0.4; then "external pipework", four pipes each
// stood between two round points.
bathyarch.bandedTank(
  root,
  put,
  { tank: grey, band: rust },
  {
    name: 'ballast_a',
    at: [-2.2, 1, -1.6],
    r: 0.5,
    length: 2.4,
    rot: [0, 0, Math.PI / 2],
    band: { R: 0.52, t: 0.05 },
    cut,
  }
);
bathyarch.bandedTank(
  root,
  put,
  { tank: rust },
  { name: 'ballast_b', at: [3.2, 0.9, 0.9], r: 0.4, length: 1.8, rot: [Math.PI / 2, 0.4, 0], cut }
);
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_refinery',
  from: [2.4, 1.6, -1.9],
  to: [1.4, 2.1, -0.9],
  r: 0.09,
  cut,
});
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_quarters',
  from: [-2.5, 1, 1.2],
  to: [-1.6, 1.5, 0.7],
  r: 0.09,
  cut,
});
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_ballast',
  from: [-2.2, 1, -1.6],
  to: [-1.2, 1.4, -0.8],
  r: 0.07,
  cut,
});
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_ring',
  from: [3, 0.9, 0.9],
  to: [2.2, 1.3, 1.8],
  r: 0.07,
  cut,
});

// "Working lights": eight posts round the foundation's edge, a lamp each;
// the fourth and eighth stand up through the modules built over them
// (header, #890).
bathyarch.perimeterPosts(
  root,
  put,
  { black, lampM },
  {
    count: 8,
    phase: 0.15,
    r: 3.65,
    post: { radii: [0.04, 0.05], h: 0.55, y: 0.78 },
    lamp: { r: 0.07, y: 1.1 },
    lift: { 4: 0.52, 8: 0.82 },
    cut,
  }
);

// Panels (#919): the foundation's top is a bare annulus from the skirt's foot
// (r 2.9) to its own rim (r 3.4, apothem 3.315 on the fourteen-gon), 25 m
// of slab round a settlement. Four arcs of it carry nothing — the rest is
// under the modules, the tanks, the collars, the ring pipe and the jib —
// and the slab is divided there the way a Klaxon slab is: radial seam
// straps right across it, r 2.94 to 3.30, at a pitch no two alike, and
// between some of them a run of plates of the other two finishes laid
// almost edge to edge along the ring — a 12 cm gap, so each is its own
// part to the sweep — and a dogged hatch. The first cut sprinkled 41 small
// fittings in two rows and the reviewer read sparkle, not division; this
// lays 14 seams, 14 plates in four runs and 3 hatches. Bearings are the
// export's, as the portholes' and the posts' are, through `drawn`. Sizes
// are the export's units, 50.57 m a unit: a seam is 0.36 × 0.016, 18.2 ×
// 0.8 m; a plate 0.085 × 0.08, 4.3 × 4.05 m; a hatch coaming r 0.045, 4.6 m
// across, its wheel R 0.03, 3 m across; each reads 2.4–4.3 m on a side from
// above. A seam is a `deckPlates` plate yawed radial.
const onSlab = (a, r) => drawn([r * Math.cos(a), 0, r * Math.sin(a)]).at;
const RING = 3.12;
const SEAMS = [1.08, 1.3, 1.46, 1.72, 1.86, 2.05, 3.13, 3.42, 4.68, 4.84, 5.07, 5.24, 5.96, 6.19];
const RUNS = [
  [1.19, 4],
  [1.59, 4],
  [1.955, 3],
  [4.955, 3],
];
const HATCHES = [1.38, 3.275, 6.075];
// 0.028 rad at r 3.12 is 0.0874 units between centres for a plate 0.085
// along the ring: a 0.0024 gap at mid-depth, 0.0013 at the inner edge.
const PITCH = 0.028;
bathyarch.deckPlates(root, { rust }, {
  on: 'foundation',
  t: 0.012,
  plates: SEAMS.map((a, i) => [`slab_seam_${i + 1}`, 'rust', [0.36, 0.016], onSlab(a, RING), Math.PI / 2 - a]),
});
// A plate's long side lies along the ring (yaw π − a in the root's frame,
// where a bearing a is a − π/2); grey and rust alternate along a run and
// the runs start on opposite finishes, so the patchwork reads as repairs.
let plateN = 0;
bathyarch.deckPlates(root, { grey, rust }, {
  on: 'foundation',
  t: 0.01,
  plates: RUNS.flatMap(([centre, n], run) =>
    Array.from({ length: n }, (_, i) => {
      const a = centre + (i - (n - 1) / 2) * PITCH;
      return [`slab_plate_${++plateN}`, (i + run) % 2 ? 'rust' : 'grey', [0.085, 0.08], onSlab(a, RING), Math.PI - a];
    })
  ),
});
bathyarch.deckHatches(root, { hatch: grey, wheel: rust }, {
  on: 'foundation',
  r: 0.045,
  h: 0.012,
  wheel: { R: 0.03, t: 0.006 },
  hatches: HATCHES.map((a, i) => [`slab_hatch_${i + 1}`, onSlab(a, RING)]),
  cut,
});

metreTrue(root, L, { drawn: DRAWN });
await exportGlb(root, 'bastion-bathyarch.glb');
