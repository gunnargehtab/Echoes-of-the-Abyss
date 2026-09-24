/**
 * The Nodule Refinery, Hadron Knights — 280 m of footprint (2 × `radiusM`
 * 140, tools/hull-maps/models.mjs), SIG 65 sustained.
 *
 * "A rank of upright silos with conveyor and crusher machinery,
 * seabed-anchored (SIG 65 sustained — the loudest permanent thing a player
 * owns). Burning bright: floodlit working surfaces, visible machinery
 * light" (docs/asset-prompts-3d.md, STRUCTURE — Nodule Refinery). One
 * prompt block, four scripts; the per-navy difference is
 * docs/art-direction.md's.
 *
 * The Order's is five silos in an exact bilateral rank — one on the
 * centreline and two mirrored pairs, six-facet frustums with a crystal
 * seam, a steel collar, an octahedral tip and a tip light each — the
 * crusher house under a half-drum cowl with a lit maw along the cowl's
 * crown and a blade hung either side of its face, two exhaust stacks with
 * lit tips, two conveyor
 * gantries mirrored about the centreline, each with four nodules riding
 * its belt (the second in crystal), two rails, a row of four lights and
 * three legs, running down to an intake hopper each with a lit mouth, two
 * transfer pipes with flanges, two flood masts, and three mirrored pairs of
 * anchor blades.
 *
 * A port of the approved export (docs/concept-art/models/refinery-
 * hadron.glb at f7cce0f), part for part in its order, every number the
 * export's own (#652 round two). Eighty-four parts, 2,412 triangles. The
 * crusher, the stacks, the gantries, the hoppers, the transfer pipes and
 * the flood masts are the kit's Refinery vocabulary (kit.mjs `crusher`,
 * `exhaustStacks`, `conveyorGantry`, `intakeHopper`, `flangedPipes`,
 * `floodMasts`) at this file's numbers; the silos, the maw blades and the
 * anchor blades are `factions/hadron.mjs`'s works section (`silos`,
 * `mawBlades`, `rakedBlades`). Nothing here is a shape decision but the
 * maw's (#890, the foot of this header); where the export is odd the
 * script is odd with it:
 *
 * - Every pair is written kind by kind (`exhaust_stack_r`, `_l`,
 *   `exhaust_tip_r` …) on one buffer a kind (the kit's `order: 'kind'` and
 *   `share`), where the silos' five parts go silo by silo, each its own.
 * - The two gantries are not mirrors: `_l` is `_r` with its yaw negated and
 *   its 0.3 roll kept, so both beds tip the same way, and the four nodules
 *   ride each belt at the same stations and tumbles — the Euler (i, 2i, 3i)
 *   for nodule `i`, which past π the file decomposes as (i − π, π − 2i,
 *   3i − π), the same rotation. The one light row is on the centreline
 *   after the second rail; the rails carry none.
 * - The silos are one ratio set at three sizes (`hadron.silos`); the tips
 *   alternate shadow and alloy against their bodies.
 * - The three blade pairs sit 0.7 out from anchors at (4.51, 0.55, 6.2),
 *   (4.84, 0.55, 0.8) and (4.07, 0.55, −5.2) on axes whose z is 0.4 of
 *   their y and whose x is each one's own, transcribed (`rakedBlades`).
 * - The two lamps burn at 2.996320537090334 and 4.392641074180667, the
 *   file's floats; `floodlight_glow` is `crystal_glow`'s finish under this
 *   file's name. The lit crystal is `resonance_crystal_dim`, the turret's
 *   fixture, since #888: the file lit it under the cladding's name
 *   `resonance_crystal`, over #2A1650 at metalness 0.1, and a name that is
 *   a cladding on the hulls and a lamp here is two names. `shadow_indigo`
 *   is at the hulls' metalness of 0.35 for the same reason; the file had
 *   the turret's 0.25. Neither emissive moved, so the strengths are the
 *   file's.
 *
 * SIDES. Every pair is the export's `_r`/`_l` (`hadron.pair`) and mirrors
 * across the export's x, the `_r` at +x — which on an unyawed X-long file
 * is the bow axis and neither beam, as on the Bastion; the gantries' `_r`
 * and `_l` are frames at +x and −x. Nothing is relabelled and nothing is
 * mirrored that the file does not mirror.
 *
 * THE FRAME is the export's own: an X-long file, 19.80 units long for a
 * 280 m footprint (hull-intake's `rawSize.x` on the approved file, which
 * did not yaw it), ground at y = 0; built here in that frame with no yaw —
 * the Choristers' and the Vent Taps' way, every placement the file's own
 * translation, rotation and scale through the kit's `xLong` frame — and
 * made metre-true at 280 m along X, centred on its length, the ground kept
 * at y = 0, by `metreTrue`. `DRAWN` is the export's length as intake
 * measures it, so both consumers' own rescale is exactly 1 and the maps
 * stay where the approved export put them; the built file is X-long
 * (280 × 249.2 m).
 *
 * `diff.mjs refinery-hadron f7cce0f`: unchanged beyond the root scale and
 * shift but for `crusher_maw` (#890). The export stood the lit slab on
 * the house's +z face, edge-on to a top-down map and roofed by the cowl,
 * which overhangs that face by 1.0; the centre silo's foot stands 0.6 off
 * the same face, so there is no ground at the foot to lay the maw on, as
 * the Directorate's file does. The block lights "visible machinery light"
 * in one band, so the maw is a resting lamp and stays lit
 * (docs/models-plan.md §3.2 rule 5), carried up as a strip set into the
 * cowl's crown — since #894 the drum cowls' one fixture, the Commune's
 * too (kit.mjs `crusher`), and this file's is unchanged by it — the face
 * slab's own 2.2 × 1.2 × 0.3, its 2.2 along the
 * ridge and its 1.2 across it, at y 4.78. The ridge stands at 4.9 and the
 * two crown facets fall from it at 15° to their outer vertices at x ±0.85,
 * so the slab's underside at 4.63 lies 0.27 under the ridge and 0.11 into
 * the facets at its edges (x ±0.6, where they are at 4.739): the crown
 * passes through the slab's lower part, and its top at 4.93 stands 0.03
 * over the ridge, so the whole 1.2 × 2.2 shows from above. It is flush
 * with the cowl's forward end, over the face the blades still flank.
 * `diff.mjs` lists `crusher_maw` and no other part: the same box, its
 * three sides reordered, so the same area.
 *
 * RESIDUAL AUDIT LINES (#894's resting measure): `gantry_light_0_0`,
 * `_0_3`, `_1_0` and `_1_3` rest on nothing, 0.9 and 0.25 m off the
 * nodules under them — the file's own one light row on each gantry's
 * centreline, over the belt rather than on a rail, and a lamp re-hung on
 * a belt is a shape decision this port does not take. They are carried
 * as the file has them and named in #907.
 */
import {
  THREE,
  xLong,
  crusher,
  exhaustStacks,
  conveyorGantry,
  intakeHopper,
  flangedPipes,
  floodMasts,
  metreTrue,
  exportGlb,
} from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 280;
const DRAWN = 19.799999904632568;
const DATUM = 0;

const alloy = hadron.ink.alloyWhite();
// The two strengths are the approved export's own floats (#639 review, N1).
const crystal = hadron.ink.resonanceCrystalDim(2.996320537090334);
const steel = hadron.ink.darkSteel();
const shadow = hadron.ink.shadowIndigo();
const glow = hadron.ink.floodlightGlow(4.392641074180667);

const root = new THREE.Group();
root.name = 'nodule_refinery_hadron';

// Five silos: one on the centreline, two mirrored pairs, smaller outboard.
hadron.silos(
  root,
  { alloy, shadow, crystal, steel, light: glow },
  {
    silos: [
      { n: 0, tags: ['c'], r: 1.9, h: 11, at: [0, -0.6] },
      { n: 1, tags: ['r', 'l'], r: 1.6, h: 8.6, at: [3.6, 0.6] },
      { n: 2, tags: ['r', 'l'], r: 1.3, h: 6.6, at: [6.6, 2] },
    ],
  }
);

// The crusher under a half-drum cowl, the lit maw a strip along the cowl's
// crown since #890 (the header), the blades hung either side of its face,
// and the two stacks, kind by kind.
crusher(
  root,
  { house: steel, cowl: alloy, maw: glow },
  {
    house: { size: [5.2, 3.2, 3.4], at: [0, 1.6, -4.8] },
    cowl: {
      geo: new THREE.CylinderGeometry(1.7, 1.7, 5.4, 6, 1, false, 0, Math.PI),
      at: [0, 3.2, -4.8],
      rot: [Math.PI / 2, Math.PI / 2, 0],
    },
    maw: { size: [1.2, 0.3, 2.2], at: [0, 4.78, -3.2] },
  }
);
hadron.mawBlades(root, shadow, { r: 0.16, length: 1.1, at: [0.75, 2.5, -3] });
exhaustStacks(
  root,
  { steel, glow },
  {
    stack: { radii: [0.28, 0.36], h: 3.4, facets: 7 },
    tip: { radii: [0.32, 0.28], h: 0.24, facets: 7 },
    order: 'kind',
    share: true,
    stacks: [
      { n: 'r', at: [1.7, 4.4, -5.9], tip: { at: [1.7, 6.15, -5.9] } },
      { n: 'l', at: [-1.7, 4.4, -5.9], tip: { at: [-1.7, 6.15, -5.9] } },
    ],
  }
);

// Two conveyor gantries, `_r` at +x and `_l` at −x with the yaw negated and
// the roll kept, each followed by its intake hopper; the nodules ride each
// belt at the same stations, tumbled (i, 2i, 3i), the second in crystal.
const gantryMats = { bed: steel, belt: shadow, rail: alloy, light: glow, leg: steel };
const NODULE_Z = [-0.275, 0.11, -0.055, -0.22];
const gantry = (suffix, row, sgn) =>
  conveyorGantry(root, gantryMats, {
    suffix,
    at: [sgn * 5.8, 2, 6.2],
    rot: [0, sgn * Math.PI * 0.3, 0.3],
    bed: { size: [8.5, 0.32, 1.5], at: [0, 0, 0] },
    belt: { size: [8.16, 0.12, 1.0], at: [0, 0.22, 0] },
    nodules: NODULE_Z.map((z, i) => ({
      name: `nodule_${row}_${i}`,
      r: 0.26,
      skin: i === 1 ? crystal : steel,
      at: [-2.95 + 2 * i, 0.42, z],
      rot: [i, 2 * i, 3 * i],
    })),
    rails: {
      size: [8.5, 0.14, 0.14],
      y: 0.5,
      sides: [
        { name: `conveyor_rail_${row}_0`, z: 0.78 },
        { name: `conveyor_rail_${row}_1`, z: -0.78, lights: { row, z: 0 } },
      ],
    },
    lights: { r: 0.08, facets: [5, 4], y: 0.66, xs: [-2.85, -0.85, 1.15, 3.15] },
    legs: {
      radii: [0.13, 0.17],
      facets: 6,
      stem: `gantry_leg_${row}`,
      legs: [
        { n: '0', x: -2.75, y: -1, h: 2 },
        { n: '1', x: 0.15, y: -1.5, h: 3 },
        { n: '2', x: 3.05, y: -2, h: 4 },
      ],
    },
  });
const hopper = (suffix, sgn) =>
  intakeHopper(
    root,
    { hopper: shadow, mouth: glow },
    {
      suffix,
      hopper: { radii: [1.3, 0.8], h: 1.2, facets: 8, at: [sgn * 8.6, 0.6, 8.6] },
      mouth: { r: 0.95, h: 0.16, facets: 8, at: [sgn * 8.6, 1.25, 8.6] },
    }
  );
gantry('_r', '0', 1);
hopper('_r', 1);
gantry('_l', '1', -1);
hopper('_l', -1);

// Two transfer pipes with their flanges on the pipes' own stations, pipes
// before flanges, a pair on one buffer each.
flangedPipes(
  root,
  { pipe: steel, flange: alloy },
  {
    frame: xLong,
    stems: { pipe: 'transfer_pipe', flange: 'transfer_flange' },
    pipe: { radii: [0.16, 0.16], facets: 7 },
    flange: { R: 0.22, tube: 0.06, facets: [5, 10] },
    order: 'kind',
    share: true,
    pipes: [
      {
        n: 'r',
        length: 4.6,
        at: [2.2, 4.6, -2.2],
        rot: [0.9, 0, -0.5],
        flange: { rot: [Math.PI / 2 + 0.9, 0, -0.5] },
      },
      {
        n: 'l',
        length: 4.6,
        at: [-2.2, 4.6, -2.2],
        rot: [0.9, 0, 0.5],
        flange: { rot: [Math.PI / 2 + 0.9, 0, 0.5] },
      },
    ],
  }
);

// "Floodlit working surfaces": two flood masts, kind by kind.
floodMasts(
  root,
  { steel, lamp: glow },
  {
    mast: { radii: [0.09, 0.13], facets: 6 },
    head: { size: [0.85, 0.28, 0.42] },
    lamp: { size: [0.75, 0.12, 0.34] },
    order: 'kind',
    share: true,
    masts: [
      {
        n: 'r',
        at: [4.2, 3, 4.4],
        h: 6,
        head: { at: [4.2, 6.15, 4.4], rot: [0.5, 0, 0] },
        lamp: { at: [4.2, 6.05, 4.52] },
      },
      {
        n: 'l',
        at: [-4.2, 3, 4.4],
        h: 6,
        head: { at: [-4.2, 6.15, 4.4], rot: [0.5, 0, 0] },
        lamp: { at: [-4.2, 6.05, 4.52] },
      },
    ],
  }
);

// Three pairs of anchor blades, each on its own axis (see the header).
hadron.rakedBlades(
  root,
  { shadow, alloy },
  {
    frame: xLong,
    r: 0.28,
    length: 2,
    seat: 0.7,
    blades: [
      { anchor: [4.51, 0.55, 6.2], axis: [1.755165, 1, 0.4] },
      { anchor: [4.84, 0.55, 0.8], axis: [-0.058399, 1, 0.4] },
      { anchor: [4.07, 0.55, -5.2], axis: [-1.713778, 1, 0.4] },
    ],
  }
);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'refinery-hadron.glb');
