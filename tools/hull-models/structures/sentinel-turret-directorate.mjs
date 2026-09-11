/**
 * The Sentinel Turret, Abyssal Directorate — 120 m of footprint (2 × `radiusM`
 * 60, packages/shared/src/structures.ts), SIG 12 idle.
 *
 * "Compact static-defence mount and barrel on a reinforced base. Nearly black
 * — an ambush predator, navigation marks only until it fires"
 * (docs/asset-prompts-3d.md, STRUCTURE — Sentinel Turret). One prompt block,
 * four scripts; the per-navy difference is docs/art-direction.md's.
 *
 * The Directorate's is the carapace laid down: a mound cut off short of the
 * ground and plated in five scutes, a browed head with three antennae and a
 * counter-spike, a stinger of three barbed segments for a gun, and five claws
 * on the seabed. The claw rank runs 0, 1, 2, 4, 5 — the gap is the approved
 * turret's and it stays, because "asymmetric, yet regimented" is what a
 * regular rule with a hole in its result looks like — and its skins alternate
 * by the claw's number, so the gap leaves 4 red beside 5 black.
 *
 * A port of the approved export (docs/concept-art/models/sentinel-turret-
 * directorate.glb at 0522b01~1), part for part in its order, every number the
 * export's own, read off its nodes and its buffers (#639). Every part comes
 * from `factions/directorate.mjs`. Nothing here is a shape decision; where
 * the export is odd the script is odd with it: the counter-spike is grown
 * after the stinger, the claws' points rise out and up from bases near the
 * mound, two of the three nav marks sit low on the flank rather than on the
 * crown, the turret's steel and lamp carry the hull palette's names at their
 * own values, and the lamp burns at 0.905 of full strength.
 *
 * THE FRAME is the one every turret here shares, and the one the Light Scouts
 * state for the shared kinds (hulls/light-scout-pelagia.mjs): the export is
 * drawn along Z, 7.83 units long for a 120 m footprint, ground at y = 0; it
 * is built here metre-true at 120 m along +X, centred on its length, the
 * ground kept at y = 0 — which is where the bake and the runtime put a Z-long
 * file anyway. Every placement goes through kit.mjs `drawn`; the export's two
 * frames — `turret_head`, trained 0.3 rad off the mound, and `barrel_group`,
 * yawed 0.35 and pitched 0.9 off the head — through kit.mjs `group`; the one
 * scale and shift through `metreTrue`. `DRAWN` is the export's length as
 * intake measures it, three's `Box3` over the parts' own boxes, which the
 * leaned claws' and scutes' boxes overhang, so that both consumers' own
 * rescale is exactly 1 and the maps stay where the approved export put them.
 * Where a node's rotation is round in another Euler order than XYZ it is
 * written in that order through `eulerXYZ`; the scutes' and claws' rotations
 * are the file's node matrices decomposed, to nine places.
 *
 * What the first port (#553) had decided, and this puts back: the scutes and
 * claws placed radially by bearing; the nav marks lifted onto the crown as
 * flat photophores; the stinger drawn from a from–to line, its barbs as orbs;
 * the counter-spike ahead of the stinger; the pipe as a sagging cable; the
 * pod as an orb; the mound and the brow as closed orbs; every facet count;
 * the collar behind the skirt and the pod ahead of the pipe in the order; the
 * claws skinned along the list; and the steel and the lamp at the Dredge's
 * values.
 */
import { THREE, drawn, eulerXYZ, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 120;
const DRAWN = 7.9822;
const DATUM = 0;

// A torus is born in the XY plane; every ring on this turret lies flat.
const FLAT = [Math.PI / 2, 0, 0];
// Every scute is the same plate — 1.2 long, 0.5 deep, 0.9 wide of its orb.
const PLATE = [1.2, 0.5, 0.9];

const violet = directorate.ink.chitinViolet();
const black = directorate.ink.trenchBlack();
const steel = directorate.structureInk.weldSteel();
const red = directorate.structureInk.chitinRedDark();
const crimson = directorate.structureInk.biolightCrimson(0.9050991089119129);

const root = new THREE.Group();
root.name = 'sentinel_turret_directorate';

// The mound — an orb cut off 0.42 of the way down, wider than it is deep —
// the collar the head turns in, and the skirt at its foot.
directorate.carapaceMound(
  root,
  { violet, black, steel },
  {
    mound: {
      r: 3,
      facets: [10, 6],
      down: 0.42,
      ...drawn([0.15, 0, -0.1], [0, 0, 0], [1.15, 0.85, 1]),
    },
    collar: { R: 1.55, tube: 0.22, facets: [5, 9], ...drawn([0.1, 2.05, 0], FLAT) },
    skirt: { R: 2.6, tube: 0.13, facets: [4, 14], ...drawn([0.15, 0.9, -0.1], FLAT, [1.12, 1, 1]) },
  }
);

// Five scutes plated round the mound, each its own size, each laid on the
// flank its own way — a regular rule, never a regular result.
directorate.baseScutes(root, [black, red], {
  facets: [7, 5],
  scutes: [
    {
      r: 1.130267,
      ...drawn(
        [2.1322617399766814, 1.3240483199479058, 0.5272541397364595],
        [0.122343431, -0.334114102, -0.290077035],
        PLATE
      ),
    },
    {
      r: 1.1611086,
      ...drawn(
        [-0.08389846464440487, 1.1541063424199818, 1.7881779447888897],
        [1.868848018, -1.20619977, 1.927459469],
        PLATE
      ),
    },
    {
      r: 1.3560522,
      ...drawn(
        [-1.7980137353895596, 1.3164427689742295, 0.6096716651805754],
        [3.00079354, -0.379358094, -2.869364215],
        PLATE
      ),
    },
    {
      r: 1.1121759,
      ...drawn(
        [-1.343880940563713, 1.4284214558079837, -1.4353500262904157],
        [-2.802302989, 0.750028354, -3.128709075],
        PLATE
      ),
    },
    {
      r: 1.3061131,
      ...drawn(
        [0.6400797566967992, 1.3749162353109567, -1.9475366214919336],
        [-0.988100963, 1.15952702, 0.865765122],
        PLATE
      ),
    },
  ],
});

// The head, trained 0.3 rad off the mound's axis: a pod; the brow shelved
// over it, a shell open 0.55 of a turn and 0.48 deep, laid on its side and
// rolled 0.14; and three antennae raked off the brow, each its own length.
const head = directorate.browHead(
  root,
  { red, black, violet },
  {
    ...drawn([0.1, 2.75, 0], [0, 0.3, 0]),
    pod: { r: 1.5, facets: [9, 6], ...drawn([0, 0, 0], [0, 0, 0], [1.3, 0.8, 1.05]) },
    brow: {
      r: 1.66,
      facets: [9, 5],
      round: 0.55,
      down: 0.48,
      ...drawn([0, 0, 0], eulerXYZ([0, -Math.PI * 0.52, -0.14], 'YXZ'), [1.3, 0.95, 1.05]),
    },
    antennae: [
      { r: 0.08, length: 1.7, ...drawn([-0.4, 1.56, -0.45], [-0.36, 0, -0.5]) },
      { r: 0.08, length: 2.4, ...drawn([0.25, 1.77, -0.15], [-0.22, 0, -0.1]) },
      { r: 0.08, length: 1.3, ...drawn([0.85, 1.44, 0.15], [-0.12, 0, 0.3]) },
    ],
  }
);

// The gun as a stinger, in a frame of its own off the head — yawed 0.35 and
// pitched 0.9 — three barbed segments closing on the tip and its one lit pip.
directorate.stingerBarrel(
  head,
  { steel, violet, black, pip: crimson },
  {
    ...drawn([0.55, 0.15, 0.45], eulerXYZ([0.9, 0.35, 0], 'YXZ')),
    segments: [
      {
        radii: [0.288, 0.44],
        length: 1.9,
        facets: 6,
        ...drawn([0, 0.95, 0]),
        barb: { R: 0.418, tube: 0.06, facets: [4, 8], ...drawn([0, 0.1, 0], FLAT) },
      },
      {
        radii: [0.18, 0.32],
        length: 1.8,
        facets: 6,
        ...drawn([0, 2.686, 0]),
        barb: { R: 0.304, tube: 0.06, facets: [4, 8], ...drawn([0, 1.886, 0], FLAT) },
      },
      {
        radii: [0.1, 0.2],
        length: 1.7,
        facets: 6,
        ...drawn([0, 4.328, 0]),
        barb: { R: 0.19, tube: 0.06, facets: [4, 8], ...drawn([0, 3.578, 0], FLAT) },
      },
    ],
    tip: { r: 0.14, length: 1, facets: 5, ...drawn([0, 5.576, 0]) },
    pip: { r: 0.08, facets: [5, 4], ...drawn([0, 6.126, 0]) },
  }
);

// The counter-spike that balances the stinger — grown after it, as the file
// has it — pitched back 1.9 rad and yawed 0.5 on the head.
directorate.counterSpike(head, violet, {
  r: 0.22,
  length: 1.8,
  facets: 5,
  ...drawn([-1.3, 0.5, -0.9], eulerXYZ([-1.9, 0.5, 0], 'ZYX')),
});

// "Navigation marks only": three photophore domes — two low on the flank, one
// on the brow — which with the pip at the muzzle are the whole resting light.
// `photophoreDomes` refuses a mirrored pair, as every light builder here does.
directorate.photophoreDomes(root, crimson, {
  r: 0.08,
  facets: [5, 4],
  domes: [
    ['nav_mark_0', drawn([2.9, 0.75, 1.1])],
    ['nav_mark_1', drawn([-2.3, 1.15, -1.6])],
    ['nav_mark_2', drawn([0.4, 3.45, -1.35])],
  ],
});

// The claw rank on the seabed, gap and all: cones whose points rise out and
// up from bases near the mound, each laid its own way.
directorate.clawGrips(root, [red, black], {
  facets: 5,
  grips: [
    {
      index: 0,
      r: 0.22,
      length: 1.47823108,
      ...drawn(
        [3.0477466457520466, 0.7743167048262733, 1.5558684369460376],
        [0.483736648, -0.228994441, -0.872418975]
      ),
    },
    {
      index: 1,
      r: 0.22,
      length: 1.21687066,
      ...drawn(
        [-0.2660360781862065, 0.693582714552127, 2.9953457072670915],
        [1.127533539, 0.072341794, 0.114352119]
      ),
    },
    {
      index: 2,
      r: 0.22,
      length: 1.34896422,
      ...drawn(
        [-2.9055644117741544, 0.723978235648015, 1.216833400875255],
        [0.393612877, 0.214886377, 0.991736544]
      ),
    },
    {
      index: 4,
      r: 0.22,
      length: 1.11873806,
      ...drawn(
        [-0.18759807089482872, 0.6839578340653525, -3.1669156709844466],
        [-1.115801834, -0.058053553, 0.092989257]
      ),
    },
    {
      index: 5,
      r: 0.22,
      length: 1.24494218,
      ...drawn(
        [2.7372728279620127, 0.6975041135958276, -2.0703089644280332],
        [-0.639464829, 0.288925204, -0.827977721]
      ),
    },
  ],
});

// One magazine, on the flank: the feed leaning up into the collar, the pod —
// a capsule laid on its side and rolled 0.4 — and the flange.
directorate.magazine(
  root,
  { steel, red },
  {
    pipe: { radii: [0.13, 0.16], length: 2.3, facets: 6, ...drawn([-1.5, 1.6, 0.9], [0.25, 0, 0.55]) },
    pod: { r: 0.55, length: 1.1, facets: [3, 7], ...drawn([-2.4, 0.75, 1.3], [Math.PI / 2, 0, 0.4]) },
    flange: {
      R: 0.18,
      tube: 0.05,
      facets: [4, 9],
      ...drawn([-1.15, 2.25, 0.75], [Math.PI / 2 + 0.25, 0, 0.55]),
    },
  }
);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'sentinel-turret-directorate.glb');
