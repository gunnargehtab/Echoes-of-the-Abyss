/**
 * The Cantor, Abyssal Directorate — 160 m of footprint (2 × `radiusM` 80,
 * tools/hull-maps/models.mjs), SIG 35 idle.
 *
 * "Listening dome — a grown, chitinous hemispherical shell studded with
 * hydrophone spines (SIG 35 idle). Dim red photophore constellation across
 * the dome, and a lamp at the tip of the quill off its apex"
 * (docs/asset-prompts-3d.md, STRUCTURE — Cantor, as #893 amended it). The
 * Directorate's own, no other navy's: two carapace tiers turned 0.16 and
 * 0.42 rad under a weld collar; a red half-orb of a dome with three violet
 * shell plates grown over it a millimetre proud; forty-two hydrophone
 * spines in four rings down the dome, each leaning out along its own
 * bearing; the primary quill — three segments and a lit tip — off the apex
 * boss; nineteen photophores in three runs across the dome and three round
 * the foot; ten stations of skirt claws, two never grown; and two ballast
 * pipes with flanges on the -x side. Nothing on it mirrors.
 *
 * A port of the approved export (docs/concept-art/models/cantor-
 * directorate.glb at f7cce0f), part for part in its order, every number the
 * export's own, read off its nodes and its buffers (#652). Every part comes
 * from `factions/directorate.mjs`. Nothing here is a shape decision; where
 * the export is odd the script is odd with it:
 *
 * - The three shell plates are open patches of a sphere that the export
 *   drew two-sided, and wear `chitin_violet_open`, the navy's two-sided
 *   violet (`ink.chitinVioletOpen`), kept so that the approved render
 *   holds rather than deciding a finish here: they span 30–49° from the
 *   zenith, so at the conn view's 55° pitch every face points at the
 *   camera, and the back face shows only at grazing angles below about
 *   49° of pitch. The export had made its one violet two-sided for the
 *   base tier and twenty-seven spines as well — closed parts with no
 *   second face to show — and #888 put those back on `chitin_violet` so
 *   the name carries one value across the navy (docs/asset-prompts-3d.md
 *   Block 2b, rule 3).
 * - The three plates are patches of three spheres, 5.53, 5.531 and 5.532,
 *   a millimetre apart, at the dome's own centre; each fills its own window
 *   of the sphere.
 * - `skirt_claw_3` and `_7` were never grown (ten stations of 2π/10 from
 *   0.3 rad; the rank runs 0, 1, 2, 4, 5, 6, 8, 9) — the turret's claw rank
 *   0, 1, 2, 4, 5 is the precedent. The claws are skinned red, black,
 *   black, black, black, red, black, red along the list, and the spines
 *   violet or black, by no rule a count recovers.
 * - Every spine and claw leans out along its own bearing by the minimal
 *   rotation from +Y (`leaning`); the four rings of spines — seven, ten,
 *   eleven and fourteen — stand at no even pitch, and each spine's reach,
 *   height, lean and length are its own.
 * - The ballast pipes lean 0.12 fore and 0.28 / 0.42 across, and their
 *   flanges lean with them (a pitch of π/2 + 0.12 and the same roll), where
 *   the Bastion's flanges lie flat.
 * - The lamp is `biolight_crimson` burning at 3.6, the file's own strength;
 *   the red and black are the hull inks. The export's lamp base (#3A0D16)
 *   and steel (#27313B) were the settlement pass's own values under the
 *   hulls' names, and #888 brought both onto the navy's ink (#1A0810 and
 *   #3A3F4A). Nothing else on the file moved.
 * - Not one buffer is shared: the twenty-two photophores, including the
 *   three identical base ones, are a buffer each in the file and a geometry
 *   each here.
 *
 * THE LIGHT, grown (#890). The light audit named no lamp on this file, but
 * gate 3 capped its bake: 35.7 m² of lit plan on a 160 m footprint reached
 * E 4.50 against a target of 5.48 at the ×64 ceiling, and past the ceiling
 * the only lever is lit area, never strength (docs/graphics-standards.md
 * §3; docs/models-plan.md §3.2). The block's resting clause is "dim red
 * photophore constellation across the dome", so the constellation is what
 * grows: every one of the twenty-two studs keeps its centre, its name and
 * its material and has its radius scaled by `GROWN`, the same factor on
 * each, so the pattern is the file's own at a larger stud. The quill's tip
 * light — the brightest lamp on the file, and its own fixture rather than
 * one of the constellation — is carried at the file's radius: "a lamp at
 * the tip of the quill off its apex", the block's resting clause since
 * #893 (#890 carried it unread as the approved model's resting set,
 * ruling 2, and asked; #893 settled it by naming it).
 *
 * THE FRAME is the one every Z-long export here shares (hulls/light-scout-
 * pelagia.mjs, structures/sentinel-turret-directorate.mjs): the export is
 * drawn along Z, 18.0617 by 17.8315 by the measure intake takes — three's
 * `Box3` over the parts' own boxes — with the ground at y = 0, the base
 * tier's foot; intake yawed it onto X and scaled it ×8.8585 to 160 m. It is
 * built here metre-true at 160 m along +X, centred on its length, the
 * ground kept at y = 0. Every placement goes through kit.mjs `drawn`; the
 * quill's frame through `group`; the one scale and shift through
 * `metreTrue`, whose `DRAWN` is intake's `rawSize.z`. The plan is nearly
 * square (18.06 to 17.83), and the yawed build comes out X-long by the same
 * margin, so intake's own rescale is exactly 1 with no rotation warning and
 * the maps stay where the approved bake put them.
 *
 * `node tools/hull-models/diff.mjs cantor-directorate f7cce0f` reads the
 * twenty-two photophores grown, and nothing else beyond the root scale and
 * shift.
 */
import { THREE, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const { leaning } = directorate;

const L = 160;
const DRAWN = 18.0617;
const DATUM = 0;
// `refuseMirror`'s half a metre, in this export's units: two studs a unit
// apart in one run down the dome (photophore_5 and _6) straddle the export's
// x = 0 by less than half a *unit*, which is 4.4 m here and not a pair.
const HALF_METRE = (0.5 * DRAWN) / L;

// A torus is born in the XY plane; the collar lies flat.
const FLAT = [Math.PI / 2, 0, 0];

const violet = directorate.ink.chitinViolet();
// The shell plates alone: open patches, in the two-sided violet the export drew.
const plate = directorate.ink.chitinVioletOpen();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson(3.6);

const root = new THREE.Group();
root.name = 'cantor_listening_dome';

// Two tiers, violet under red, turned 0.16 and 0.42, and the weld collar
// on the upper one's top edge.
directorate.carapaceTiers(root, {
  tiers: [
    { name: 'base_tier_low', skin: violet, radii: [6.6, 7.5], length: 1.3, facets: 12, ...drawn([0, 0.65, 0], [0, 0.16, 0]) },
    {
      name: 'base_tier_high',
      skin: red,
      radii: [5.9, 6.75],
      length: 1.05,
      facets: 12,
      ...drawn([0, 1.78, 0], [0, 0.42, 0]),
      ring: { name: 'weld_collar', skin: steel, R: 5.95, tube: 0.17, facets: [6, 28], ...drawn([0, 2.32, 0], FLAT) },
    },
  ],
});

// The dome and its three shell plates, all centred 2.25 up.
directorate.domeShell(
  root,
  { shell: red, plate },
  {
    r: 5.4,
    facets: [16, 9],
    ...drawn([0, 2.25, 0]),
    plates: [
      { r: 5.53, facets: [16, 3], phi: [0.35, 2.3], theta: [0.52, 0.34], ...drawn([0, 2.25, 0]) },
      { r: 5.531, facets: [16, 3], phi: [2.75, 2.7], theta: [0.92, 0.3], ...drawn([0, 2.25, 0]) },
      { r: 5.532, facets: [16, 3], phi: [5.15, 1.9], theta: [1.22, 0.26], ...drawn([0, 2.25, 0]) },
    ],
  }
);

// Forty-two hydrophone spines in four rings down the dome — seven, ten,
// eleven and fourteen — each its own bearing, reach, height, lean, length
// and skin.
directorate.shellSpines(root, {
  name: 'hydrophone_spine',
  spines: [
    { n: 0, skin: black, r: 0.115, length: 1.52859199, ...drawn(...leaning(0.7362795344, 2.439054547, 7.777827883, 0.4155385764)) },
    { n: 1, skin: violet, r: 0.115, length: 1.358878493, ...drawn(...leaning(1.432586083, 2.41905109, 7.708735787, 0.4171447699)) },
    { n: 2, skin: black, r: 0.115, length: 1.636360288, ...drawn(...leaning(2.049022529, 2.403018126, 7.842886215, 0.4058078541)) },
    { n: 3, skin: black, r: 0.115, length: 1.719589472, ...drawn(...leaning(2.821818977, 2.276030757, 7.933428066, 0.3809097127)) },
    { n: 4, skin: black, r: 0.115, length: 1.989848614, ...drawn(...leaning(-2.795713664, 2.614816286, 7.911019717, 0.4327045136)) },
    { n: 5, skin: black, r: 0.115, length: 1.374935627, ...drawn(...leaning(-2.044758446, 2.223189003, 7.798658712, 0.3810850593)) },
    { n: 6, skin: violet, r: 0.115, length: 1.645817518, ...drawn(...leaning(-0.7367245895, 2.191056988, 7.933530124, 0.3679528212)) },
    { n: 7, skin: violet, r: 0.1, length: 1.133642673, ...drawn(...leaning(0.4167967626, 3.862645757, 6.678190438, 0.717290443)) },
    { n: 8, skin: black, r: 0.1, length: 1.310854673, ...drawn(...leaning(1.42177086, 3.708632402, 6.903514566, 0.672880253)) },
    { n: 9, skin: black, r: 0.1, length: 1.541046143, ...drawn(...leaning(1.864089675, 3.742461097, 7.000061987, 0.6673045783)) },
    { n: 10, skin: black, r: 0.1, length: 1.015419722, ...drawn(...leaning(-2.962926433, 3.816411787, 6.652593184, 0.7141984822)) },
    { n: 11, skin: violet, r: 0.1, length: 1.591916203, ...drawn(...leaning(-2.494502371, 4.067221948, 6.753961585, 0.734487779)) },
    { n: 12, skin: black, r: 0.1, length: 1.348566771, ...drawn(...leaning(-1.996934487, 3.955036419, 6.717168298, 0.7246656016)) },
    { n: 13, skin: black, r: 0.1, length: 1.511286497, ...drawn(...leaning(-1.4351678, 3.72431615, 6.998427102, 0.6651104575)) },
    { n: 14, skin: violet, r: 0.1, length: 1.321874738, ...drawn(...leaning(-0.9775666623, 3.769955101, 6.859956141, 0.6854920419)) },
    { n: 15, skin: violet, r: 0.1, length: 0.9417517185, ...drawn(...leaning(-0.5310915386, 3.862114711, 6.571146169, 0.7293629326)) },
    { n: 16, skin: violet, r: 0.1, length: 1.43101871, ...drawn(...leaning(-0.06943760057, 3.861371446, 6.84370718, 0.6989988992)) },
    { n: 17, skin: violet, r: 0.09, length: 0.9554433823, ...drawn(...leaning(0.9461390681, 4.965760007, 5.24935817, 1.027435067)) },
    { n: 18, skin: violet, r: 0.09, length: 0.7558450103, ...drawn(...leaning(1.710099973, 4.766073132, 5.408138279, 0.9855942418)) },
    { n: 19, skin: violet, r: 0.09, length: 0.873060286, ...drawn(...leaning(2.092350115, 4.87379734, 5.332330149, 1.006872729)) },
    { n: 20, skin: violet, r: 0.09, length: 1.265956521, ...drawn(...leaning(2.451845222, 5.094283361, 5.288644859, 1.032968109)) },
    { n: 21, skin: violet, r: 0.09, length: 0.7521303892, ...drawn(...leaning(2.825102724, 4.852830652, 5.270180041, 1.014101797)) },
    { n: 22, skin: violet, r: 0.09, length: 1.164365411, ...drawn(...leaning(-2.284659149, 5.000069049, 5.361273857, 1.014179739)) },
    { n: 23, skin: violet, r: 0.09, length: 1.11186707, ...drawn(...leaning(-1.054136364, 4.950962508, 5.397931618, 1.004452616)) },
    { n: 24, skin: violet, r: 0.09, length: 0.9885112047, ...drawn(...leaning(-0.6861141724, 4.932646607, 5.329814002, 1.012647629)) },
    { n: 25, skin: violet, r: 0.09, length: 0.8392397165, ...drawn(...leaning(-0.2885270687, 4.783600269, 5.445027789, 0.9819315204)) },
    { n: 26, skin: violet, r: 0.09, length: 1.11347723, ...drawn(...leaning(0.08710636177, 4.850265712, 5.552175311, 0.9730567079)) },
    { n: 27, skin: violet, r: 0.09, length: 1.021699071, ...drawn(...leaning(0.5150511572, 4.960252433, 5.311774157, 1.017780949)) },
    { n: 28, skin: violet, r: 0.08, length: 0.8350280523, ...drawn(...leaning(1.326046362, 5.466049136, 4.036894785, 1.254839743)) },
    { n: 29, skin: black, r: 0.08, length: 0.5675499439, ...drawn(...leaning(1.689010038, 5.451928655, 3.687950375, 1.312918217)) },
    { n: 30, skin: black, r: 0.08, length: 0.9117411375, ...drawn(...leaning(2.035992539, 5.535798576, 3.922491625, 1.27739304)) },
    { n: 31, skin: violet, r: 0.08, length: 0.8247467875, ...drawn(...leaning(2.759366544, 5.535212531, 3.793522677, 1.298849532)) },
    { n: 32, skin: violet, r: 0.08, length: 0.7314472795, ...drawn(...leaning(-2.878077734, 5.489992872, 3.809551186, 1.294016014)) },
    { n: 33, skin: violet, r: 0.08, length: 0.9304842353, ...drawn(...leaning(-2.137984419, 5.527955452, 3.974851343, 1.268345734)) },
    { n: 34, skin: black, r: 0.08, length: 0.869738102, ...drawn(...leaning(-1.760482617, 5.462585289, 4.09356466, 1.245309983)) },
    { n: 35, skin: violet, r: 0.08, length: 0.7974901199, ...drawn(...leaning(-1.408224512, 5.451687464, 4.030086407, 1.25519002)) },
    { n: 36, skin: black, r: 0.08, length: 0.588784039, ...drawn(...leaning(-0.7448860959, 5.424169475, 3.821706701, 1.288760411)) },
    { n: 37, skin: violet, r: 0.08, length: 0.9584099054, ...drawn(...leaning(-0.3674854853, 5.524106157, 4.025846458, 1.25975852)) },
    { n: 38, skin: violet, r: 0.08, length: 0.7369894385, ...drawn(...leaning(-0.08328742281, 5.451453043, 3.947190657, 1.26897943)) },
    { n: 39, skin: black, r: 0.08, length: 0.6862730384, ...drawn(...leaning(0.3500171364, 5.465853751, 3.824946468, 1.29025287)) },
    { n: 40, skin: violet, r: 0.08, length: 0.5765076876, ...drawn(...leaning(0.6339462324, 5.352783745, 4.033640538, 1.24915014)) },
    { n: 41, skin: violet, r: 0.08, length: 0.7862606049, ...drawn(...leaning(1.013123175, 5.522519498, 3.778825692, 1.3007251)) },
  ],
});

// The primary quill off the apex, pitched -0.1 and rolled 0.17: three
// segments, black, red, black, and the lit tip.
directorate.primaryQuill(
  root,
  { skins: [black, red], light: crimson },
  {
    ...drawn([0.55, 7.4, -0.35], [-0.1, 0, 0.17]),
    segments: [
      { radii: [0.208, 0.34], length: 1.7, facets: 6, ...drawn([0, 0.85, 0]) },
      { radii: [0.136, 0.26], length: 1.5, facets: 6, ...drawn([0, 2.314, 0]) },
      { radii: [0.04, 0.17], length: 1.7, facets: 6, ...drawn([0, 3.794, 0]) },
    ],
    tip: { r: 0.17, facets: [8, 6], ...drawn([0, 5.058, 0]) },
  }
);

// The apex boss, a black half-orb off the crown's centre.
directorate.apexBoss(
  root,
  { boss: black },
  { boss: { r: 1.05, facets: [8, 5], ...drawn([0.45, 7.15, -0.3]) } }
);

// "Dim red photophore constellation across the dome": nineteen in three
// runs down the dome and three round the foot, an orb each of its own
// radius, every radius grown by the one factor so gate 3 reaches its target
// under the cap (#890, the header). SIG 35, and the quill's tip is the
// brightest of them.
const GROWN = 1.5;
const stud = (name, r, at) => [name, r * GROWN, drawn(at)];
directorate.photophoreDomes(root, crimson, {
  facets: [6, 5],
  tolerance: HALF_METRE,
  domes: [
    stud('photophore_0', 0.09078078717, [2.001284611, 6.985964502, 1.837688805]),
    stud('photophore_1', 0.08538412303, [1.914786467, 6.692183827, 2.532231356]),
    stud('photophore_2', 0.08118531108, [1.625590504, 6.451906005, 3.084321877]),
    stud('photophore_3', 0.08169715852, [1.599583013, 6.006233881, 3.625416006]),
    stud('photophore_4', 0.07280962169, [0.9472713914, 5.669727916, 4.149667203]),
    stud('photophore_5', 0.09718167037, [0.248562712, 5.244272103, 4.558963824]),
    stud('photophore_6', 0.1082593203, [-0.5297866068, 4.920685586, 4.732691058]),
    stud('photophore_7', 0.07086584717, [-1.510153764, 4.545578134, 4.718194214]),
    stud('photophore_8', 0.1116483137, [-4.107400971, 5.708303903, -0.9904500883]),
    stud('photophore_9', 0.09248419851, [-4.254564679, 5.222079226, -1.696179372]),
    stud('photophore_10', 0.08923465014, [-3.738495442, 4.961820269, -2.912264181]),
    stud('photophore_11', 0.0928516835, [-3.698069757, 4.253378239, -3.48171735]),
    stud('photophore_12', 0.09674041718, [-2.974549956, 3.9315604, -4.258639123]),
    stud('photophore_13', 0.09870610386, [-1.914142805, 3.370215204, -4.989266]),
    stud('photophore_14', 0.1136349589, [0.5334387293, 7.215821276, -2.206277901]),
    stud('photophore_15', 0.0729990676, [1.03470971, 6.879713621, -2.70309593]),
    stud('photophore_16', 0.07442957163, [1.670438087, 6.75908503, -2.586385275]),
    stud('photophore_17', 0.1023402661, [2.490058274, 6.429079775, -2.479213995]),
    stud('photophore_18', 0.1013723612, [3.441314567, 5.941913658, -2.082961256]),
    stud('photophore_base_0', 0.09, [6.7, 1, 1.9]),
    stud('photophore_base_1', 0.09, [-5.9, 1.75, 3.4]),
    stud('photophore_base_2', 0.09, [2.2, 0.7, -6.9]),
  ],
});

// Ten stations of skirt claws at 2π/10 from a phase of 0.3, the fourth and
// eighth never grown, each its own reach, height, lean and length, skinned
// by no rule.
directorate.clawGrips(root, [red, black], {
  name: 'skirt_claw',
  grips: [
    { index: 0, skin: red, length: 2.09855032, ...drawn(...leaning(0.3, 7.676284658, 1.272568478, 1.012313382)) },
    { index: 1, skin: black, length: 2.465983152, ...drawn(...leaning(0.9283185307, 7.750925645, 1.410551111, 0.9295517116)) },
    { index: 2, skin: black, length: 2.789819717, ...drawn(...leaning(1.556637061, 7.857913815, 1.472786198, 0.9428781896)) },
    { index: 4, skin: black, length: 1.930678844, ...drawn(...leaning(2.813274123, 7.636628087, 1.214634968, 1.050647256)) },
    { index: 5, skin: black, length: 1.86334753, ...drawn(...leaning(-2.841592654, 7.586077021, 1.247340877, 0.9750111668)) },
    { index: 6, skin: red, length: 2.144952536, ...drawn(...leaning(-2.213274123, 7.679953921, 1.299467704, 0.9867084777)) },
    { index: 8, skin: black, length: 2.288256407, ...drawn(...leaning(-0.9566370614, 7.726380785, 1.327981485, 0.9887957195)) },
    { index: 9, skin: red, length: 2.39065361, ...drawn(...leaning(-0.3283185307, 7.737774799, 1.380063083, 0.9477869879)) },
  ].map((c) => ({ r: 0.27, ...c })),
});

// Two ballast pipes on the -x side, leaning 0.12 fore and 0.28 / 0.42
// across, each with a flange that leans with it.
directorate.standpipes(
  root,
  { steel, black },
  {
    name: 'ballast_pipe',
    flange: 'pipe_flange',
    pipes: [
      {
        radii: [0.22, 0.26],
        length: 2.9,
        facets: 8,
        ...drawn([-4.6, 3.4, -2.9], [0.12, 0, -0.28]),
        flange: { R: 0.3, tube: 0.07, facets: [6, 12], ...drawn([-4.6, 4.5, -2.9], [Math.PI / 2 + 0.12, 0, -0.28]) },
      },
      {
        radii: [0.22, 0.26],
        length: 2.4,
        facets: 8,
        ...drawn([-5.4, 3.7, -1.6], [0.12, 0, -0.42]),
        flange: { R: 0.3, tube: 0.07, facets: [6, 12], ...drawn([-5.4, 4.6, -1.6], [Math.PI / 2 + 0.12, 0, -0.42]) },
      },
    ],
  }
);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'cantor-directorate.glb');
