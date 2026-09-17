/**
 * The Bastion, Abyssal Directorate — 440 m of footprint (2 × `radiusM` 220,
 * tools/hull-maps/models.mjs), SIG 35 sustained.
 *
 * "The HQ — a large pressure dome with visible reinforcement ribs, docking
 * collars and external pipework, anchored to the seabed (SIG 35 sustained,
 * the settlement's constant hum). Sustained glow from ports and working
 * lights; the one building that can never run silent"
 * (docs/asset-prompts-3d.md, STRUCTURE — Bastion). One prompt block, four
 * navies; this is the Directorate's, and it shares nothing with the other
 * three: the dome is four carapace tiers stepping in under a crown, each
 * turned 0.22 rad further than the one below and welded to it with a seam
 * ring; six ribs of three plates and a spike stand on the back of it; seven
 * crown spines ring the apex boss and its light; two docking collars — a
 * main and a small — stand out from the flank with lit mouths and
 * mandibles; two pipes arc up the hull, three standpipes and two ballast
 * tanks sit on the far side; eight anchor claws grip the seabed; sixteen
 * photophores climb the tiers in three runs; and a worklight hangs over the
 * main dock. Nothing on it mirrors.
 *
 * A port of the approved export (docs/concept-art/models/bastion-
 * directorate.glb at f7cce0f), part for part in its order, every number the
 * export's own, read off its nodes and its buffers (#652). Every part comes
 * from `factions/directorate.mjs`. Nothing here is a shape decision; where
 * the export is odd the script is odd with it:
 *
 * - The ribs cluster on the back, bearings 2.16 to 4.11 rad, a third of a
 *   turn on the side away from the main dock; their plates roll about their
 *   own radial, tilting sideways along the flank; ribs 3–5 were written
 *   under a flipped Euler that is the same rotation as ribs 0–2's form.
 * - `crown_spine_4` was never grown (seven stations of 2π/7 from 0.5 rad;
 *   the rank runs 0, 1, 2, 3, 5, 6), nor were `anchor_claw_2` and `_6`
 *   (eight stations, jittered, the rank 0, 1, 3, 4, 5, 7) — the turret's
 *   claw rank 0, 1, 2, 4, 5 is the precedent, "a regular rule with a hole
 *   in its result". The claws are skinned red, black, red, black, black,
 *   black along the list, by no rule.
 * - Each docking collar's lip ring lies in a plane containing the throat's
 *   axis rather than round it, and its mouth and mandibles sit at the
 *   throat's inboard end, on the tier's flank; the small dock's frame is
 *   written (π, −0.6, −π/2), which is the same rotation as (0, 0.6 − π,
 *   π/2) and is written so here.
 * - The standpipes lean a hundredth or two off vertical and their flanges
 *   lie dead flat; the hull pipes are arcs of a torus, not tubes along a
 *   path.
 * - Every spine and claw leans out along its own bearing by the minimal
 *   rotation from +Y (`leaning`), the crown spines by `atan(0.8)` and the
 *   rib spikes by `atan(1 / 1.35)` — the file's numbers, recovered exactly.
 * - The lamp is `biolight_crimson` on a third base, #3A0D16, burning at
 *   3.3230551162025397; the steel is the turret's #27313B; the reds, violets
 *   and blacks are the hull inks.
 * - Not one buffer is shared: the eighteen rib plates, the four mandibles
 *   and the sixteen photophores are a buffer each in the file and are a
 *   geometry each here.
 * - The two dock mouths are discs standing on edge (the throat lies along
 *   the flank); at 0.18 units they are 4.4 m thick, so the top-down maps
 *   still see a bar of each and the light audit names nothing on this file.
 *
 * THE FRAME is the export's own. It is X-long — 17.8096 by 16.9464 by the
 * measure intake takes, three's `Box3` over the parts' own boxes — and the
 * approved bake did not yaw it (`rotatedZtoX` false, scale ×24.7058 to
 * 440 m), so it builds bow-on-X with no yaw, every part placed by `laid`
 * with the file's translation, XYZ Euler and scale, and the root scaled to
 * 440 m on that measure by kit.mjs `fitFootprint` (the Vent Taps' way),
 * which is what makes intake's own rescale exactly 1 and leaves the maps
 * where the approved bake put them. Ground is y = 0, the base tier's foot.
 *
 * `node tools/hull-models/diff.mjs bastion-directorate f7cce0f` reads
 * "unchanged beyond the root scale and shift".
 */
import { THREE, exportGlb, fitFootprint } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const { laid, leaning } = directorate;

const L = 440;

// A torus is born in the XY plane; every seam ring and flange here lies flat.
const FLAT = [Math.PI / 2, 0, 0];

const red = directorate.ink.chitinRed();
const violet = directorate.ink.chitinViolet();
const black = directorate.ink.trenchBlack();
const steel = directorate.structureInk.weldSteel();
const crimson = directorate.settlementInk.biolightCrimson(3.3230551162025397);

const root = new THREE.Group();
root.name = 'bastion_directorate';

// Four tiers stepping in, red and violet turn about, each narrowing to 0.86
// of its foot and turned 0.22 rad further than the one below, with a steel
// seam ring on its top edge at 0.88 of the foot.
const tier = (i, name, skin, foot, length, y) => ({
  name,
  skin,
  radii: [0.86 * foot, foot],
  length,
  facets: 10,
  ...laid([0, y, 0], [0, 0.22 * i, 0]),
  ring: {
    name: `seam_ring_${i}`,
    skin: steel,
    R: 0.88 * foot,
    tube: 0.14,
    facets: [5, 20],
    ...laid([0, y + length / 2, 0], FLAT),
  },
});
directorate.carapaceTiers(root, {
  tiers: [
    tier(0, 'carapace_tier_0', red, 6.4, 2, 1),
    tier(1, 'carapace_tier_1', violet, 5.7, 1.8, 2.85),
    tier(2, 'carapace_tier_2', red, 4.8, 1.6, 4.5),
    tier(3, 'carapace_tier_3', violet, 3.7, 1.4, 5.95),
  ],
});

// The crown: a half-orb on the top tier, squashed to 0.8 in height.
directorate.domeShell(
  root,
  { shell: red },
  { name: 'carapace_crown', r: 3.25, facets: [10, 5], ...laid([0, 6.65, 0], [0, 0, 0], [1, 0.8, 1]) }
);

// The apex boss, a black drum off the crown's centre, and its light.
directorate.apexBoss(
  root,
  { boss: black, light: crimson },
  {
    boss: { radii: [0.9, 1.25], length: 1.1, facets: 8, ...laid([0.4, 9.45, -0.3]) },
    light: { r: 0.22, facets: [6, 5], ...laid([0.4, 10.1, -0.3]) },
  }
);

// Six ribs on the back of the dome, each its own bearing and its own spike.
directorate.reinforceRibs(
  root,
  { black, red, violet },
  {
    frame: laid,
    ribs: [
      { bearing: 2.1605963, spike: 1.804360151 },
      { bearing: 2.597758373, spike: 2.105182648 },
      { bearing: 2.951491781, spike: 1.627439618 },
      { bearing: -2.952630647, spike: 1.995940208 },
      { bearing: -2.534127162, spike: 1.568927765 },
      { bearing: -2.173374466, spike: 2.088814497 },
    ],
  }
);

// Seven crown spines at 2π/7 from a phase of 0.5, the fifth never grown,
// each its own height on the crown and its own length, all leaning out
// atan(0.8) along their bearing.
const CROWN_TILT = Math.atan(0.8);
directorate.shellSpines(root, {
  name: 'crown_spine',
  spines: [
    { n: 0, length: 1.055529118, bearing: 0.5, rho: 2.463753527, y: 8.029691908 },
    { n: 1, length: 1.263879418, bearing: 1.397597901, rho: 2.515815685, y: 8.094769606 },
    { n: 2, length: 1.27273798, bearing: 2.295195802, rho: 2.518029233, y: 8.097536541 },
    { n: 3, length: 1.718825102, bearing: -3.090391604, rho: 2.629496622, y: 8.236870777 },
    { n: 5, length: 2.160648823, bearing: -1.295195802, rho: 2.739898643, y: 8.374873304 },
    { n: 6, length: 2.067546606, bearing: -0.397597901, rho: 2.716634434, y: 8.345793043 },
  ].map(({ n, length, bearing, rho, y }) => ({
    n,
    skin: black,
    r: 0.11,
    length,
    ...laid(...leaning(bearing, rho, y, CROWN_TILT)),
  })),
});

// Two docking collars on the flank: the main one on +x, rolled a quarter
// turn and yawed 0.26; the small one on -x +z, the same the other way.
directorate.dockingCollar(
  root,
  { violet, steel, crimson, black },
  { name: 'dock_main', r: 1.4, frame: laid, ...laid([7.5, 1.7, 2], [0, -0.26, Math.PI / 2]) }
);
directorate.dockingCollar(
  root,
  { violet, steel, crimson, black },
  { name: 'dock_small', r: 0.9, frame: laid, ...laid([-6.4, 1.3, 4.3], [0, 0.6 - Math.PI, Math.PI / 2]) }
);

// Two pipes arcing up the hull at 0.92 of the base tier's foot.
directorate.hullPipes(root, steel, {
  pipes: [
    { R: 5.888, tube: 0.16, facets: [5, 16], arc: 1.1, ...laid([0, 2.2, 0], [0, 0.6, Math.PI / 2 - 0.5]) },
    { R: 5.888, tube: 0.13, facets: [5, 16], arc: 1.1, ...laid([0, 2.2, 0], [0, 1.05, Math.PI / 2 - 0.85]) },
  ],
});

// Three standpipes on the far side, each leaning a hair, each with a flat
// flange 0.22 of its length above its centre.
const standpipe = (x, y, z, length, lean) => ({
  radii: [0.22, 0.26],
  length,
  facets: 8,
  ...laid([x, y, z], [0, 0, lean]),
  flange: { R: 0.3, tube: 0.07, facets: [5, 10], ...laid([x, y + 0.22 * length, z], FLAT) },
});
directorate.standpipes(
  root,
  { steel, black },
  {
    pipes: [
      standpipe(-4.6, 1.7, -3.8, 3.4, -0.03777644408),
      standpipe(-5.6, 1.4, -2.2, 2.8, 0.02077835745),
      standpipe(4, 1.2, -5.5, 2.4, -0.0324256127),
    ],
  }
);

// Two ballast tanks laid on their sides on the -z flank.
directorate.ballastTanks(root, steel, {
  tanks: [
    { r: 0.75, length: 2, facets: [3, 9], ...laid([-2.2, 1.05, -6.2], [Math.PI / 2, 0, 0.5]) },
    { r: 0.75, length: 2, facets: [3, 9], ...laid([-0.3, 1.05, -6.8], [Math.PI / 2, 0, 0.8]) },
  ],
});

// Eight anchor claws round the foot, 2 and 6 never grown, each its own
// bearing, reach, height, lean and length, skinned by no rule.
directorate.clawGrips(root, [red, black], {
  name: 'anchor_claw',
  grips: [
    { index: 0, skin: red, length: 2.074110508, ...laid(...leaning(0.4492733126, 7.624624744, 1.110029462, 1.166515623)) },
    { index: 1, skin: black, length: 2.943204641, ...laid(...leaning(1.070480831, 7.935385412, 1.22288933, 1.183038215)) },
    { index: 3, skin: red, length: 2.423635483, ...laid(...leaning(2.629008713, 7.719305127, 1.220649467, 1.096468681)) },
    { index: 4, skin: black, length: 2.696407557, ...laid(...leaning(-2.785177571, 7.840070245, 1.207608371, 1.161669461)) },
    { index: 5, skin: black, length: 2.917818785, ...laid(...leaning(-2.041293752, 7.917957057, 1.239473422, 1.163246747)) },
    { index: 7, skin: black, length: 1.935090065, ...laid(...leaning(-0.4219618175, 7.554994465, 1.134213502, 1.098979261)) },
  ].map((c) => ({ r: 0.3, ...c })),
});

// Sixteen photophores climbing the tiers in three runs — seven up the +z
// flank, five up the -x, four along the -z foot — an orb each of its own
// radius. "Sustained glow from ports and working lights": SIG 35.
directorate.photophoreDomes(root, crimson, {
  facets: [6, 5],
  domes: [
    ['photophore_0', 0.1469616145, laid([5.580291581, 1.421189459, 2.073583992])],
    ['photophore_1', 0.1434205025, laid([4.884848655, 1.843210097, 3.08199889])],
    ['photophore_2', 0.102385737, laid([3.878459379, 2.46997304, 3.9174528])],
    ['photophore_3', 0.1021963134, laid([2.459903688, 3.158942005, 4.607727799])],
    ['photophore_4', 0.1277387589, laid([1.840131535, 3.631424866, 4.675740221])],
    ['photophore_5', 0.1476596892, laid([0.7185694396, 4.464471434, 4.619367234])],
    ['photophore_6', 0.1411419511, laid([-0.6710058168, 5.009296906, 4.395169463])],
    ['photophore_7', 0.09141562134, laid([-5.563735404, 2.309025739, -0.4284658226])],
    ['photophore_8', 0.1488719881, laid([-5.088318711, 3.272992157, -0.945087779])],
    ['photophore_9', 0.1191934049, laid([-4.39122562, 4.104702698, -2.001912477])],
    ['photophore_10', 0.1251562387, laid([-3.511139819, 4.737823037, -2.909731917])],
    ['photophore_11', 0.1451682299, laid([-2.543776346, 5.618331569, -3.329838164])],
    ['photophore_12', 0.1259391606, laid([0.1301090398, 1.056657064, -6.104817715])],
    ['photophore_13', 0.0983306095, laid([2.028866691, 1.589346455, -5.521522078])],
    ['photophore_14', 0.143074587, laid([3.21955778, 2.171257775, -4.628423121])],
    ['photophore_15', 0.115572989, laid([4.420805579, 2.717578857, -3.116025447])],
  ],
});

// The worklight over the main dock, a flat bar yawed with it.
directorate.photophoreMarks(root, crimson, {
  size: [1.6, 0.14, 0.3],
  marks: [['dock_worklight', laid([6.2, 3.4, 1.7], [0, -0.26, 0])]],
});

fitFootprint(root, L);
await exportGlb(root, 'bastion-directorate.glb');
