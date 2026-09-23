/**
 * The Nodule Refinery, Abyssal Directorate — 280 m of footprint (2 ×
 * `radiusM` 140, tools/hull-maps/models.mjs), SIG 65 sustained.
 *
 * "A rank of upright silos with conveyor and crusher machinery,
 * seabed-anchored (SIG 65 sustained — the loudest permanent thing a player
 * owns). Burning bright: floodlit working surfaces, visible machinery
 * light" (docs/asset-prompts-3d.md, STRUCTURE — Nodule Refinery). One
 * prompt block, four scripts; the per-navy difference is
 * docs/art-direction.md's.
 *
 * The Directorate's is the carapace stood on end: four silos of three and
 * four segments, red and violet by turns, each segment twisted a little
 * further round than the one under it, a steel seam between them, a black
 * cap and a crimson tip light on each, and violet spikes off their flanks
 * in ranks with holes in them; the crusher house with a chitin cowl over
 * it and a floodlit apron at the foot of its face — `crusher_maw`, the
 * export's name for the slab it stood on that face — three black teeth
 * hung over the apron's inner end; two
 * exhaust stacks with hot tips; the conveyor gantry running down to the
 * intake hopper, five nodules riding its belt, red rails, eight gantry
 * lights and three legs; the hopper with its lit mouth and five teeth
 * round it; two transfer pipes with red flanges; five anchor claws — the
 * fifth is numbered 5 — two flood masts; and four photophores.
 *
 * A port of the approved export (docs/concept-art/models/refinery-
 * directorate.glb at f7cce0f), part for part in its order, every number
 * the export's own, read off its nodes and its buffers (#652). The
 * crusher, the stacks, the gantry, the hopper, the transfer pipes and the
 * flood masts are the kit's Refinery vocabulary (kit.mjs `crusher`,
 * `exhaustStacks`, `conveyorGantry`, `intakeHopper`, `flangedPipes`,
 * `floodMasts`), whose defaults are this file's numbers; the silos, the
 * teeth, the claws and the photophores are `factions/directorate.mjs`'s
 * works section. Nothing here is a shape decision but the maw's (#890, the
 * last bullet); where the export is odd the script is odd with it:
 *
 * - The silos' spike ranks run 1; 0, 2; 0, 1; 0, 1, 2 — three holes — and
 *   the anchor claws 0, 1, 2, 3, 5: there is no `silo_spike_0_0`,
 *   `silo_spike_1_1` or `anchor_claw_4` in the file, and none here.
 * - The gantry's two longer legs stand 0.025 and 0.05 off centred on
 *   their height; the exhaust tips sit 0.13 down-lean of their stacks
 *   where 1.6 · sin 0.08 is 0.128; the flood lamps are offset from their
 *   heads in the export's frame rather than the heads'. All the file's.
 * - The conveyor gantry, the transfer pipes and their flanges and the
 *   flood heads are YXZ Eulers in the file, written in that order through
 *   `eulerXYZ`; the silos' segments are yawed 0.3 further each, which past
 *   a quarter turn the file decomposes as [π, π − yaw, π], the same
 *   rotation. The nodules', spikes' and claws' rotations are their nodes
 *   decomposed, to nine places.
 * - `conveyor_rail_r` and `_l` are the gantry's own `r`/`l`, the export's
 *   (kit.mjs `bothSides` says the same of the turrets'), inside a frame
 *   yawed 0.72π, and keep their names.
 * - The six materials are the navy's `ink`: `chitin_red`, `chitin_violet`,
 *   `trench_black`, `weld_steel`, `biolight_crimson` at this file's 2.6,
 *   and `floodlight_hot` at its 3.476. The export carried the turret's
 *   `weld_steel` (#27313B) and a `biolight_crimson` on a #3A0D16 base, the
 *   settlement pass's own values under the hulls' names; #888 brought both
 *   onto the navy's (#3A3F4A and #1A0810). Nothing else on the file moved.
 * - `crusher_maw` (#890): the export stood the lit slab on the house's
 *   face, 0.33 into it near its +z end, edge-on to a top-down map and under
 *   the cowl's rim besides, so the audit read 0 m² of it. The block lights
 *   the Refinery in one band — "floodlit working surfaces, visible
 *   machinery light" — so the slab is a resting lamp and stays lit
 *   (docs/models-plan.md §3.2 rule 5). It lies down: the same 1.7 along
 *   the face and 1.3 out from it, 0.3 thick, on the ground at the face's
 *   foot, its inner edge on the face where the export's slab stood and its
 *   outer two thirds past the cowl's plan, the teeth over its inner end
 *   and the belt's high end over the ground beside it. Laid flat it is one
 *   of the block's floodlit working surfaces — the crusher's apron — and
 *   not an aperture: a plate on the outside of a wall wearing a mouth's
 *   name is the failure docs/style-neon-noir.md names ("The Directorate's
 *   one area glow: a maw is not livery"), so this header calls it an apron
 *   and the part keeps the export's name. `diff.mjs` lists `crusher_maw`
 *   and no other part.
 *
 * THE FRAME is the export's own: an X-long file, 23.0715 units long for a
 * 280 m footprint (hull-intake's `rawSize.x` on the approved file, which
 * did not yaw it), ground at y = 0; built here in that frame with no yaw —
 * the Choristers' and the Vent Taps' way, every placement the file's own
 * translation, rotation and scale through the kit's `xLong` frame — and
 * made metre-true at 280 m along X, centred on its length, the ground kept
 * at y = 0, by `metreTrue`. `DRAWN` is the export's length as intake
 * measures it, three's `Box3` over the parts' own boxes, so that both
 * consumers' own rescale is exactly 1 and the maps stay where the approved
 * export put them; the built file is X-long (280 × 188.3 m), so intake
 * does not yaw it.
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
  eulerXYZ,
  metreTrue,
  exportGlb,
} from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 280;
const DRAWN = 23.0714565339591;
const DATUM = 0;

const red = directorate.ink.chitinRed();
const steel = directorate.ink.weldSteel();
const violet = directorate.ink.chitinViolet();
const black = directorate.ink.trenchBlack();
const crimson = directorate.ink.biolightCrimson(2.6);
const flood = directorate.ink.floodlightHot(3.475863563109638);

const root = new THREE.Group();
root.name = 'nodule_refinery_directorate';

// "A rank of upright silos": four, each its own foot, radius, height and
// segment count, starting half a radian further round than the last, with
// its spikes — the holes in the ranks are the file's.
directorate.silos(
  root,
  { red, violet, steel, black, light: crimson },
  {
    silos: [
      {
        n: 0,
        at: [-5.6, -2.6],
        r: 1.75,
        height: 8.6,
        segments: 3,
        yaw: 0,
        spikes: [
          {
            n: 1,
            length: 1.1052217,
            at: [-7.062041637, 5.863883014, -3.679305926],
            rot: [-0.633140594, -0.325701048, 0.929793848],
          },
        ],
      },
      {
        n: 1,
        at: [-1.9, -1.2],
        r: 2,
        height: 10.4,
        segments: 4,
        yaw: 0.5,
        spikes: [
          {
            n: 0,
            length: 0.9268571,
            at: [-0.740402531, 6.200902519, -2.767659321],
            rot: [-0.928935545, 0.325899928, -0.634142747],
          },
          {
            n: 2,
            length: 1.6275442,
            at: [-0.416743215, 5.314577784, -2.844329642],
            rot: [-0.83797146, 0.339539969, -0.734852495],
          },
        ],
      },
      {
        n: 2,
        at: [1.9, 0.2],
        r: 1.6,
        height: 7.6,
        segments: 3,
        yaw: 1,
        spikes: [
          {
            n: 0,
            length: 1.0387396,
            at: [1.866531975, 5.671002623, -1.47183423],
            rot: [-1.233805826, -0.013400576, 0.018893896],
          },
          {
            n: 1,
            length: 1.2915752,
            at: [1.322129279, 3.71873506, 1.870498634],
            rot: [1.147455835, 0.208397228, 0.320866799],
          },
        ],
      },
      {
        n: 3,
        at: [-4, 1.9],
        r: 1.45,
        height: 6.2,
        segments: 4,
        yaw: 1.5,
        spikes: [
          {
            n: 0,
            length: 1.605149,
            at: [-3.322768556, 2.233587886, 0.269000109],
            rot: [-1.113614365, 0.239446599, -0.381788859],
          },
          {
            n: 1,
            length: 1.6389235,
            at: [-5.721511432, 4.698818708, 2.347663005],
            rot: [0.243154733, 0.163838677, 1.183350874],
          },
          {
            n: 2,
            length: 0.8102474,
            at: [-2.828610001, 3.163097312, 2.781316376],
            rot: [0.642650285, -0.327539344, -0.92161186],
          },
        ],
      },
    ],
  }
);

// The crusher at the kit's defaults — this file's numbers — but
// `crusher_maw`, laid down as a floodlit apron at the foot of the house's
// face since #890 (the header), turned with the house; its three teeth
// hung point-down over the apron's inner end, and the two stacks.
crusher(
  root,
  { house: steel, cowl: red, maw: flood },
  { maw: { size: [1.3, 0.3, 1.7], at: [7.85, 0.15, -0.66], rot: [0, -0.25, 0] } }
);
directorate.mawTeeth(root, black, {
  teeth: [
    { n: 0, at: [6.527034019, 2.5, -1.369996146] },
    { n: 1, at: [6.9, 2.5, -0.82] },
    { n: 2, at: [7.272965981, 2.5, -0.430003854] },
  ],
});
exhaustStacks(root, { steel, glow: flood });

// The conveyor gantry, at the kit's defaults, with this file's five
// nodules: dodecahedra of five radii, tumbled every way, one of them red.
conveyorGantry(
  root,
  { bed: steel, belt: black, rail: red, light: flood, leg: steel },
  {
    nodules: [
      {
        name: 'nodule_0',
        r: 0.3231157,
        skin: violet,
        at: [-3.403275798, 0.45, 0.137804258],
        rot: [-1.676951642, 1.522345716, -1.845422219],
      },
      {
        name: 'nodule_1',
        r: 0.3608702,
        skin: violet,
        at: [-1.694795245, 0.45, -0.199151611],
        rot: [-0.252199761, 1.186741937, -1.583762832],
      },
      {
        name: 'nodule_2',
        r: 0.3489102,
        skin: red,
        at: [0.522294623, 0.45, -0.205561826],
        rot: [-0.734195663, 1.088982582, -2.530183232],
      },
      {
        name: 'nodule_3',
        r: 0.3437772,
        skin: violet,
        at: [2.335865, 0.45, -0.153316514],
        rot: [-1.645966375, 1.086286233, -0.14940959],
      },
      {
        name: 'nodule_4',
        r: 0.303593,
        skin: violet,
        at: [4.256066821, 0.45, -0.160716209],
        rot: [-1.854479901, 1.09658812, -2.33991717],
      },
    ],
  }
);

// The intake hopper at the kit's defaults, and its five teeth: 1.45 out
// from its centre, 0.2 rad round and a fifth of a turn apart, leaned 0.5
// outward.
intakeHopper(root, { hopper: violet, mouth: flood });
directorate.intakeTeeth(root, black, {
  at: [13.4, 1.35, 6.9],
  radius: 1.45,
  y: 1.55,
  phase: 0.2,
  lean: 0.5,
});

// Two transfer pipes from the silos to the crusher, each yawed to its run
// and tipped over — YXZ, as the file has them — with its flange on the
// pipe's own station, pitched 0.35 under the same yaw.
flangedPipes(
  root,
  { pipe: steel, flange: red },
  {
    frame: xLong,
    stems: { pipe: 'transfer_pipe', flange: 'transfer_flange' },
    pipe: { radii: [0.17, 0.17], facets: 7 },
    flange: { R: 0.24, tube: 0.06, facets: [5, 10] },
    pipes: [
      {
        n: '0',
        length: 4.970076,
        at: [1.65, 5.4, -1.7],
        rot: eulerXYZ([0, 1.710720997, Math.PI / 2 - 0.14], 'YXZ'),
        flange: { rot: eulerXYZ([0.35, 1.710720997, 0], 'YXZ') },
      },
      {
        n: '1',
        length: 8.607404,
        at: [-0.2, 4.2, -2.4],
        rot: eulerXYZ([0, 1.533776211, Math.PI / 2 - 0.04], 'YXZ'),
        flange: { rot: eulerXYZ([0.35, 1.533776211, 0], 'YXZ') },
      },
    ],
  }
);

// Five anchor claws, numbered 0, 1, 2, 3, 5 — the gap is the file's — red
// and black by their number.
directorate.anchorClaws(root, [red, black], {
  frame: xLong,
  claws: [
    {
      index: 0,
      length: 2.0715227,
      at: [4.153009117, 0.965000295, 0.709207807],
      rot: [0.197467656, -0.115334066, -1.055371761],
    },
    {
      index: 1,
      length: 2.9428217,
      at: [0.11682699, 1.114521559, 5.065821296],
      rot: [1.039251246, -0.144307141, -0.251363376],
    },
    {
      index: 2,
      length: 2.5957055,
      at: [-6.009109593, 1.094618215, 3.373610841],
      rot: [0.658659971, 0.251449447, 0.7084206],
    },
    {
      index: 3,
      length: 1.9304466,
      at: [-6.966692955, 0.996451839, -2.590326741],
      rot: [-0.335345605, -0.16433388, 0.905639853],
    },
    {
      index: 5,
      length: 2.0053163,
      at: [3.392342695, 0.985228596, -3.354525106],
      rot: [-0.481004204, 0.222255318, -0.854002298],
    },
  ],
});

// "Floodlit working surfaces": two flood masts at the kit's defaults, and
// four photophores, each its own buffer, none mirroring another.
floodMasts(root, { steel, lamp: flood });
directorate.photophoreDomes(root, crimson, {
  frame: xLong,
  facets: [6, 5],
  domes: [
    ['photophore_0', 0.09, { at: [-6.9, 3.2, -1.8] }],
    ['photophore_1', 0.09, { at: [-0.4, 6.8, -2.1] }],
    ['photophore_2', 0.09, { at: [2.9, 3.9, 1.1] }],
    ['photophore_3', 0.09, { at: [-3.1, 2.2, 3] }],
  ],
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'refinery-directorate.glb');
