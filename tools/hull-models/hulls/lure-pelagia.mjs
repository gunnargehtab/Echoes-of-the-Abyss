/**
 * The Lure, the Commune's — 100 m (docs/units.md, "The siege hulls"; the
 * Lure block of docs/asset-prompts-3d.md Block 3, which pairs the kind with
 * the Directorate and, on the Chorister's rule, lets each navy field it in
 * its own shape language, read with the Pelagia FACTION block; #1441, as the
 * Thurible's variants were in #1440).
 *
 * "The song, 100 m — a PR-3 hull that sings for 60 s and doubles what fauna
 * hear from anything within 500 m of the point it sang at (SIG 14 idle, 24
 * cruise, 55 singing; no weapon; HYD 60; 560 hull; 40 m/s; 280 nodules and
 * 50 Biomass). A segmented deep body, ribbed and domed like the Verger's —
 * a rostrum, three overlapping tergites, a jointed abdomen, folded walking
 * limbs, a ribbed pressure keel — with the abdomen's last segment spread
 * into a sounding fan: five chitin plates opened wide astern, two a side
 * about a telson, a file ridge down the abdomen's back with a plectrum limb
 * raised over it, and a resonating bladder in the abdomen forward of the
 * fan, showing through the segment as a paler dome. The fan is an
 * instrument and not a weapon, and the plan is a rostrum forward and a fan
 * astern, widest at the stern, where the sound leaves it. The model is the
 * hull with its fan spread and the plectrum raised. Nearly black at rest,
 * photophores in a pattern that repeats on neither side; under way a dim
 * row along each tergite's edge; singing, sustained glow — the bladder's
 * dome lit through the shell and each plate of the fan lit along its rib."
 * — said the Commune's way: seven lobes down the keel, four small ones the
 * tail and three great ones the carapace, each a squashed orb of chitin
 * with a growth ring of ridge grown round it, each leaning its own way off
 * the keel line; a rostrum of ridge drawn to a point; the fan five leaf
 * paddles of membrane on ridge spars, a dark vein down each, spread wide
 * astern about a telson; a file of twelve ridge teeth on a bead down the
 * tail's back; one jointed stem of knuckle and stem raised from the port
 * flank across the keel with a claw aimed down at the file; a spore-pale
 * sac showing through the second tail lobe; three thorns on the carapace's
 * back; six limbs of knuckle and stem folded under the carapace to a claw;
 * a ridge spindle keel under the carapace with six growth rings; and ten
 * photophore buds on the shell's shoulders, which is the whole resting
 * light of a hull that idles at SIG 14.
 *
 * BUILT, not ported: there is no approved binary, so every number here is a
 * decision (docs/models-plan.md §3.1), and built in a state (§3.5): the fan
 * spread, the stem raised. Drawn metre-true at 100 m, the rostrum's point at
 * +50 and the telson's end at −50, nothing to rescale, as hulls/lure.mjs is.
 * The decisions that file took for the kind where the block was silent are
 * kept and translated, not retaken:
 *
 * - **Seven lobes at the Directorate's seven stations and radii.** The tail
 *   at −33, −26, −18 and −9 (5 to 8 m half-length, 2.6 to 4.4 tall, 5.5 to
 *   10 across), the carapace at +2 (12, 9, 15), +18 (13, 10.2, 17) and +33
 *   (11, 7.8, 13): the same plan, the carapace's aft lobe tucking into the
 *   tail's first over four metres, 15 m of half-beam to 10. Where the
 *   Directorate draws a seam rib on each carapace plate and a ridge lip on
 *   each tail plate this navy grows a ring: the tail rings 0.6 of a
 *   half-length abaft each centre (x −36, −30, −21.9 and −13.8, cresting
 *   0.35 to 0.5 m proud), the carapace's where each ring clears the rows and
 *   buds on that lobe's rim — lobe 4's at −3, lobe 5's at +12 and lobe 6's
 *   at +41.5, 0.6 to 0.7 proud (a first cut put lobe 4's and lobe 5's
 *   forward, at +7 and +27, and each stood under an edge-row bud).
 * - **Five paddles, the Directorate's five, on its stations and yaws.** The
 *   fan roots at x −32: the telson on the keel line 17.8 m long to the stern
 *   (17.65 and a 0.35 bevel there; 17.8 and a 0.2 bevel here, the same −50),
 *   2 m of half-width at the root and 3.4 at the widest; the inner pair
 *   17 m at 24° off the keel from 2.2 m either side of it; the outer pair
 *   20 m at 60° from 3.6 m, a metre further forward and half a metre lower,
 *   so the three ranks stack at the root — telson over inner over outer —
 *   and clear each other beyond it. Each a leaf rather than a squared
 *   chitin plate (pelagia.mjs `leafPaddle`): widest at 0.62 of its length,
 *   its outboard margin 0.12 fuller than its inboard (the telson's 0.1, to
 *   starboard), ending in a flat 0.3 of its width so the bevel lands the
 *   stern to the millimetre; 0.4 m of membrane with a 0.2 m bevel; a ridge
 *   spar down its midline from a metre inside the body to 0.88 of its
 *   length, 0.55 m to 0.12 across, standing through both faces; and a vein
 *   on its top face from 0.08 to 0.9 of its length, leaving the midline
 *   over the spar and drifting outboard (`soundingFan`). The outer paddles'
 *   margins reach 21.94 m off the keel at x −39.6 (the vertex; the box the
 *   bake measures reads 23.9, and the Directorate's 23.8 is a box figure
 *   too): 43.9 m across. The widest thing forward of the fan is not the
 *   carapace (17.6 m of half-beam at x +18) but the s1 limb's knee, 19.86
 *   on the starboard side and the p2 knee 17.17 on the port, so the fan
 *   stands 2.08 m past everything else on its narrower side — four bake
 *   pixels, which is "widest at the stern" by a margin the chart can read.
 *   The reviewer's first read had the s1 knee at 21.86, 0.08 m short of the
 *   fan: a 6 m femur on a lobe leaning 0.6 to starboard closed the kind's
 *   2.4 m gap from one end and the leaf's flat tip closed it from the
 *   other, and the femur was shortened (below).
 * - **The veins are clad, not lit.** "Each plate of the fan lit along its
 *   rib" is the singing band and this pipeline draws the resting one
 *   (§3.2, rule 2), so each vein is a 0.16 m tube in the vein family's
 *   unlit finish, `bio_vein_unlit`, as the Glider's tail veins are, and
 *   no lamp.
 * - **The file a metre to starboard, from −10 to −22, twelve teeth.** One
 *   part, `file_ridge` (pelagia.mjs `fileRidge`, one buffer as
 *   directorate.mjs `limbRun` runs a limb): twelve cones of ridge 0.7 m
 *   across and 0.9 tall at 1.09 m of pitch, each seated on the lobe or ring
 *   under it (kit.mjs `seat`), sunk 0.3 and leaning 0.35 rad aft of its
 *   facet's normal, on a bead 0.6 m across swept through the same seats.
 *   Where the Directorate's fin rides over the joints on a straight crest,
 *   this row follows the lobes: its points stand at y 4.82 at −10.3, 3.84
 *   at −14.8 past lobe 3's ring, 4.24 at −17.8 on lobe 2 and 3.61 at −22.4
 *   on lobe 2's ring. To starboard, so the stem reaches across for it.
 * - **The plectrum stem from the port flank, raised.** Hip knuckle 0.6 m
 *   into lobe 3's flank at (−11, 1.5, −8.06), where `lobeFlank` finds the
 *   shell at 8.66 m; a femur 10 m up and inboard to a knee at (−13, 10.6,
 *   −4.5), level with the carapace's crown; a tibia aft and across the keel
 *   to a wrist at (−16.5, 9.3, 0); and from the wrist the claw, a cone of
 *   ridge 1.5 m across drawn to a point at (−17.83, 5.14, 1.05) — 0.9 m
 *   straight over the eighth tooth's point at (−17.83, 4.24, 1.05), which
 *   `fileRidge` returns and the script aims at (`plectrumStem`). The one
 *   limb that stands up, and the hull's asymmetry made into a gesture.
 * - **The sac on the second tail lobe, 1.6 m to starboard.** `bladder_bud`,
 *   the Chorister's: a spore-pale bud 8.4 m across at (−27, 2.62, 1.6),
 *   0.64 as tall as wide, standing 2.2 m proud of the lobe's crown there
 *   (3.11) and reaching y 5.31 — the Directorate's dome's own station,
 *   size and relief in the navy's own pale. No lamp (§3.2 rule 4). Lobe 2's
 *   ring stands at −21.9 rather than −22.2 so its aft shoulder clears the
 *   sac's margin by 0.2 m.
 * - **Three thorns on the back, alternating sides.** At (38, −3), (21,
 *   3.5) and (4, −3.5), 5, 6.5 and 5.5 m long, rooted 0.8 m in the crown,
 *   raked 0.3 forward and each curling its own way (`backThorns`): the
 *   middle one's tip is the hull's highest point, y 16.0. The kind's
 *   dorsal rank, said as a stem that thins and bends.
 * - **Three limbs a side, folded under the carapace** — at y −5, where the
 *   shell is 9.3 m of half-beam at x 30 and 12.6 at 24 (`lobeFlank`), the
 *   Thurible's limb with a shorter femur: a hip knuckle half a metre in
 *   the skin, a femur 4 m out and 1 down to a knee (the Thurible's reaches
 *   6; at 6 the s1 knee stood at 21.86 against the fan's 21.94, and the
 *   fan must be the widest thing by a margin the chart can read, above),
 *   a tibia folded 5.5 forward, 1 in and 1.2 down, a claw 1.8 m on. The s0
 *   knee stands at z 13.4 at x 30 and its claw reaches (37.2, −7.6, 11.1);
 *   the s1 knee at z 19.86 at x 18, 2.3 m past the hull's widest rim,
 *   where the chart sees it, and 2.08 m inside the fan's margin; the p2
 *   knee at −17.17. Dark.
 * - **The keel stops with the carapace.** A ridge spindle from +31 to −5
 *   that follows the belly (`grownKeel`), 2.8 m across and 4 deep at the
 *   waist, its back a metre inside the skin, so it hangs 3 m under the
 *   middle lobe's belly at x 18 and the hull's lowest point is y −13.2
 *   there (the Directorate's −12.6); six growth rings from +27 to −1.
 * - **Ten buds at the Directorate's ten stations and two pitches.**
 *   Starboard at +35, +20, +5 and −10.5, −17.5; port at +37, +18.5, 0 and
 *   −19, −27; each at 0.7 of the rim's half-beam — the shoulders, where a
 *   lobe round in section slopes 30° — dropped from the ideal crown onto the
 *   lobe or ring under it, 0.2 m in, and tilted with it (`rimBuds`). Buds
 *   1.4 m across and 0.77 tall on the carapace, 1.2 by 0.66 on the tail,
 *   the kind's two mark sizes. No two opposite; every bud clears the rings,
 *   the thorns, the rows, the sac and the stem (the port tail bud at −19
 *   stands 6 m from the femur). Nothing else is lit: not the sac, not the
 *   veins, not the file, nothing on the fan.
 * - **Three edge rows a side, built unlit.** "Under way a dim row along
 *   each tergite's edge": on the three carapace lobes only, each along the
 *   stretch of rim where that lobe is the outermost thing — lobe 6's from
 *   +38 to +30, lobe 5's from +26 to +14, lobe 4's from +7 to −1 — at 0.93
 *   of the half-beam, buds 0.9 m across and 0.54 tall at 4 m of pitch, the
 *   port rank two metres behind the starboard on every lobe and one bud
 *   shorter on the middle and aft lobes: eighteen buds in `bio_vein_unlit`,
 *   never lit (§3.2 rule 2).
 *
 * What the block and the kind do not say, decided here:
 *
 * - **The fan's pairs match; the limbs' do not.** The kind's fan is two
 *   matched pairs — "two a side about a telson … an instrument is tuned
 *   symmetric", hulls/lure.mjs — and this navy's FACTION block is
 *   asymmetric by rule. Two ways were open: (a) keep the matched pairs as
 *   the kind's licensed instrument pair, each plate placed on its own side
 *   at its own yaw and never through `bothSides`, and carry the Commune's
 *   asymmetry on each plate's own lean, curl and vein; (b) offset the port
 *   pair's yaws or lengths by a small amount, as the Thurible's port limbs
 *   stand half a pitch aft. Taken: (a). The block's own count and "tuned
 *   symmetric" are the kind's warrant, both earlier Commune variants kept
 *   the kind's licensed pairs where the block itself names them, and an
 *   instrument with one side shorter is detuned. So `soundingFan` refuses
 *   no mirror, the only builder in the module that does not, and the plan
 *   matches: the s1 and p1 margins both reach 21.94 m. What differs is
 *   grown, not tuned — the roll of each paddle about its spar (s0 0.1,
 *   p0 0.16, s1 0.14, p1 0.1, the telson 0.06 rad), which dips its
 *   outboard margin, and the drift of each vein (s0 0.5, p0 0.36, s1 0.34,
 *   p1 0.52, the telson 0.42 of the local half-width), so no two paddles
 *   carry the same line; and the telson's fuller margin is to starboard.
 *   The limbs follow the Thurible: `foldedLimbs` refuses a mirrored hip, so
 *   the starboard rank stands at the Directorate's 30, 18 and 6 and the
 *   port rank half a pitch aft at 24, 12 and 0.
 * - **The paddles are membrane.** The one teal on the hull: every paddle
 *   this navy swims with is membrane — the Chorister's pectorals and
 *   flukes, the Drifter's fluke, the Glider's wing — and a sounding fan is
 *   the hull's one swimming surface. The brightest unlit thing on the hull
 *   by value, as the Thurible's lids are.
 * - **The lean.** The lobes lean off the keel line 0.3 m to port, 0.4 to
 *   starboard, 0.3 to port, 0.4 to starboard, 0.5 to port, 0.6 to
 *   starboard, 0.4 to port from the stern, the Chorister's own asymmetry at
 *   the kind's scale; the rostrum follows the fore lobe's line and the fan
 *   sits about the keel.
 * - **No dorsal leaf, no vanes.** The block names a fan, a file, a stem, a
 *   dome and limbs, and the back carries the file and the thorns.
 * - **The light burns at 0.3**, the Acolyte's and Thurible's figure:
 *   `bio_light` at 1 is 0.62 of white and the Directorate's
 *   `biolight_crimson` at 1, which its marks burn at, is 0.17, so 0.3 —
 *   0.18 of white — is level with a Directorate mark a pixel at a time in
 *   the conn view (rosterModels.ts `recolor`).
 *
 * THE LIGHT, measured (`lightAudit`, printed by `exportGlb`): ten lit
 * parts, 8.4 m² facing up by its own per-part figures — the carapace's
 * s0, s1 and s2 at 0.88 m² each, p0 at 0.81, p1 and p2 at 0.94; the tail's
 * s0, p0 and p1 at 0.75 and s1 at 0.81 — on a plan of 9,792 mask pixels at
 * 2 px/m, some 2,450 m²; the Directorate's ten show 18.0 on
 * 2,550, its marks being flat squares and these buds on a slope. Nothing
 * hidden, nothing floating: every bud's gap is 0. The bake at E(14) = 1.22
 * reads raw E = 1.67 and dims by ×0.733 (the Directorate's reads 5.44 and
 * ×0.225): forty-seven times clear of the ×1/64 floor the quiet end must
 * not touch (§3.2) and nowhere near the ×64 ceiling. Intake at 100 m:
 * length on X, no rescale, no rotate, 106 meshes, six materials
 * (`chitin_hull`, `growth_ridge`, `algae_membrane`, `spore_pod`,
 * `bio_vein_unlit`, and `bio_light`), 5,842 triangles, 100.0 × 47.8 m, no
 * warning.
 *
 * CONTACTS (`contacts.mjs`): 186 pairs meet, every one a mount — each ring
 * on its lobe; each lobe on the next; the rostrum's base in the fore lobe;
 * the sac in lobes 0, 1 and 2 and on lobe 1's ring, its skirt (lobe 2's
 * nose is buried in lobe 1 where the sac's foot meets it); each thorn's
 * root in its lobe; each hip and femur root in its lobe (the p1 hip in
 * lobe 5's ring as well), each femur in its hip and knee, each tibia in
 * its knee and femur's tip, each claw on its tibia; the keel in lobes 4, 5
 * and 6 and through lobe 4's and 5's rings, its six rings on it, and lobe
 * 4 and 5 on four of them; the file in lobes 2 and 3 and on their rings;
 * the stem's hip and femur root in lobe 3, each knuckle on its stems, the
 * claw on the wrist and the tibia's tip; each paddle's spar and vein in
 * its blade, the five roots in lobe 0 (and the inner and outer pairs'
 * roots in lobe 1, the outer in lobe 1's ring), and the ranks stacked at
 * the root — the telson on the inner pair, each inner blade on its outer,
 * and the outer paddles' veins passing into the inner blade above them
 * where the ranks overlap, as the Directorate's outer ribs run inside its
 * inner plates; each bud on its lobe. No bud meets a ring, a thorn, a row,
 * the sac or the stem; the claw meets no tooth (0.9 m). The lowest point
 * is the keel at −13.2 (a hull the view does not stand).
 *
 * FACETS (#919; pelagia.mjs `cut`): every round part is asked of the rule
 * and `facets.mjs --parts` names none — the lobes sixteen round by sixteen
 * down at 5.5–17 m, their rings sixteen; the rostrum fifteen at 3.6 m; the
 * sac sixteen by sixteen; the knuckles five by six, the stems, claws and
 * spars five; the keel's rings six to ten; the veins five; the buds five
 * by six. The file, the thorns and the keel are swept or merged and read
 * as no ring. PANELS: the median unlit part from above is 1.77 m on a side
 * over seventy-three, inside the navy's 1.5–5 m band for a hull — low in
 * it, since the eighteen row buds and the stacked fan are small from above.
 * 106 parts, 5,842 triangles. TRIM: none laid, as the Thurible's Commune
 * variant lays none.
 *
 * `soundingFan`, `fileRidge`, `plectrumStem` and `backThorns` were written
 * for this hull (factions/pelagia.mjs, the Lure section) and run here for
 * the first time; `cohortLobes`, `nose`, `bud`, `foldedLimbs`, `grownKeel`
 * and `rimBuds` are the Chorister's and the Thurible's.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/** The design length (UNIT_STATS hullLengthM, silhouettes.ts); the file is drawn to it. */
const L = 100;
const BOW = L / 2;
const STERN = -L / 2;

/** How the photophore buds burn: the Acolyte's and Thurible's 0.3, level with a Directorate mark. */
const BUD = 0.3;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const spore = pelagia.ink.sporePod();
const unlit = pelagia.ink.bioVeinUnlit();
const light = pelagia.ink.bioLight(BUD);

// The Commune's facet rule, a chord of 1.5 m (docs/asset-prompts-3d.md Block
// 2c; pelagia.mjs `cut`), asked in metres since the file is drawn in them.
const cut = pelagia.cut();

const root = new THREE.Group();
root.name = 'commune_lure';

/**
 * The lobes, stern first: four small ones make the tail, three great ones
 * the carapace, each `{ at, radii }` as `cohortLobes` takes them — the
 * Directorate's seven stations and radii (hulls/lure.mjs ABDOMEN and
 * CARAPACE), each leaning its own way off the keel line. `ringDx` is where
 * its growth ring stands from the centre, cresting `ringProud` over the skin
 * there from a shoulder 0.75 below the crest.
 */
const LOBES = [
  { at: [-33, 0, -0.3], radii: [5, 2.6, 5.5], ringDx: -3, ringProud: 0.35 },
  { at: [-26, 0, 0.4], radii: [6, 3.2, 7], ringDx: -4, ringProud: 0.4 },
  { at: [-18, 0, -0.3], radii: [7, 3.8, 8.5], ringDx: -3.9, ringProud: 0.45 },
  { at: [-9, 0, 0.4], radii: [8, 4.4, 10], ringDx: -4.8, ringProud: 0.5 },
  { at: [2, 0, -0.5], radii: [12, 9, 15], ringDx: -5, ringProud: 0.6 },
  { at: [18, 0, 0.6], radii: [13, 10.2, 17], ringDx: -6, ringProud: 0.7 },
  { at: [33, 0, -0.4], radii: [11, 7.8, 13], ringDx: 8.5, ringProud: 0.6 },
];
const ringOn = ({ radii: [rx, , rz], ringDx, ringProud }) => {
  const crown = rz * Math.sqrt(1 - (ringDx / rx) ** 2) + ringProud;
  return { dx: ringDx, crown, shoulder: crown - 0.75 };
};
/** Where the shell's crown is at `(x, z)`, lean and all. */
const crown = (x, z) => pelagia.lobeCrown(LOBES, x, z);
/** Where the shell's flank is at `(x, y)` on one side. */
const rim = (x, y, sgn) => pelagia.lobeFlank(LOBES, x, y, sgn);
/** The belly's depth at `x` on the keel line, the ideal section's. */
const belly = (x) => {
  let y = Infinity;
  LOBES.forEach(({ at: [lx, ly, lz], radii: [rx, ry, rz] }) => {
    const u = (x - lx) / rx;
    const w = lz / rz;
    const d = 1 - u * u - w * w;
    if (d > 0) y = Math.min(y, ly - ry * Math.sqrt(d));
  });
  return y;
};
const TAIL = ['lobe_0', 'lobe_1', 'lobe_2', 'lobe_3'];
const TAIL_RINGS = ['lobe_ring_0', 'lobe_ring_1', 'lobe_ring_2', 'lobe_ring_3'];
const SHIELD = ['lobe_4', 'lobe_5', 'lobe_6', 'lobe_ring_4', 'lobe_ring_5', 'lobe_ring_6'];

pelagia.cohortLobes(root, ridge, {
  cut,
  ring: { halfWidth: 0.7 },
  lobes: LOBES.map((lobe) => ({
    skin: chitin,
    at: lobe.at,
    radii: lobe.radii,
    ring: ringOn(lobe),
  })),
});

// The rostrum, a cone of ridge drawn to the bow's point on the fore lobe's
// line, its base 14 m aft inside that lobe's nose so the last 6 m show.
pelagia.nose(root, ridge, { name: 'rostrum', tip: BOW, z: -0.4, r: 3.6, length: 14, cut });

// The resonating bladder showing through the second tail lobe as a paler
// sac: a spore-pale bud 8.4 m across standing 2.2 m proud of the lobe's
// crown, 1.6 m to starboard of the keel — the Chorister's `bladder_bud`.
// No lamp (docs/models-plan.md §3.2 rule 4).
pelagia.bud(root, spore, {
  name: 'bladder_bud',
  x: -27,
  y: 2.62,
  z: 1.6,
  r: 4.2,
  squash: 0.64,
  cut,
});

// Three thorns on the carapace's back, alternating sides — 3 m to port, 3.5
// to starboard, 3.5 to port — 5, 6.5 and 5.5 m long from the bow, raked 0.3
// forward, rooted 0.8 m in the shell, each curling its own way.
pelagia.backThorns(root, ridge, {
  crown,
  thorns: [
    { x: 38, z: -3, length: 5, curl: [0.05, 0.08] },
    { x: 21, z: 3.5, length: 6.5, curl: [0.08, 0.05] },
    { x: 4, z: -3.5, length: 5.5, curl: [0.04, 0.1] },
  ],
  r: [0.75, 0.1],
  sink: 0.8,
  rake: -0.3,
  cut,
});

// The walking limbs folded under the carapace's flanks: three a side, the
// starboard rank at the Directorate's stations and the port rank half a
// pitch aft of it (the header).
pelagia.foldedLimbs(
  root,
  { knuckle: ridge, stem: chitin, claw: ridge },
  {
    lobes: LOBES,
    hip: { y: -5, sink: 0.5, r: 1.1, squash: 0.85 },
    femur: { r: [0.8, 0.6], reach: 4.0, drop: 1 },
    knee: { r: 1.15, squash: 0.85 },
    tibia: { r: [0.65, 0.45], fold: 5.5, inboard: 1, drop: 1.2 },
    claw: { r: 0.5, length: 1.8 },
    cut,
    limbs: [
      { side: 's', x: 30 },
      { side: 's', x: 18 },
      { side: 's', x: 6 },
      { side: 'p', x: 24 },
      { side: 'p', x: 12 },
      { side: 'p', x: 0 },
    ],
  }
);

// The ribbed pressure keel, under the carapace only: a ridge spindle from
// +31 to −5 that follows the belly, its back a metre inside the skin, with
// six growth rings along it.
const keelAt = (x, hb, hh, sink) => [x, hb, hh, belly(x) - hh + sink];
pelagia.grownKeel(root, ridge, {
  stations: [
    [31, 0, 0, belly(31) + 0.3],
    keelAt(26, 1.0, 1.5, 1.0),
    keelAt(18, 1.4, 2.0, 1.0),
    keelAt(10, 1.4, 2.0, 1.0),
    keelAt(2, 1.3, 1.9, 1.0),
    [-5, 0, 0, belly(-5) + 0.3],
  ],
  rings: { count: 6, proud: 0.3, rise: 0.6, halfWidth: 0.5, inset: 4 },
  cut,
});

// The file down the tail's back, a metre to starboard of the keel line:
// twelve teeth from −10 to −22 on a bead, each seated on the lobe or ring
// under it.
const teeth = pelagia.fileRidge(root, ridge, {
  on: [...TAIL, ...TAIL_RINGS],
  z: 1,
  from: -10,
  to: -22,
  teeth: 12,
  r: 0.35,
  tooth: 0.9,
  rake: 0.35,
  sink: 0.3,
  bead: { r: 0.3, sink: 0.12 },
  cut,
});

// The plectrum stem, raised over the file from the port flank: hip rooted
// 0.6 m into the biggest tail lobe's flank at x = −11, knee 10.6 m up and
// 4.5 to port, wrist over the file, and the claw aimed down at the file
// with its point 0.9 m above the eighth tooth's.
const struck = teeth[7];
pelagia.plectrumStem(
  root,
  { knuckle: ridge, stem: chitin, claw: ridge },
  {
    hip: [-11, 1.5, -(rim(-11, 1.5, -1) - 0.6)],
    knee: [-13, 10.6, -4.5],
    wrist: [-16.5, 9.3, 0],
    tip: [struck[0], struck[1] + 0.9, struck[2]],
    joints: { hip: 1.3, knee: 1.15, wrist: 0.85 },
    femur: [1.0, 0.8],
    tibia: [0.8, 0.6],
    claw: { r: 0.75 },
    cut,
  }
);

// The sounding fan, spread: the telson on the keel line to the stern at
// −50, the inner pair yawed 24° out and the outer pair 60°, each a leaf
// paddle of membrane on a ridge spar with a vein in the unlit finish down
// it — the fan's light, which is the singing band's and never this model's.
pelagia.soundingFan(
  root,
  { blade: membrane, spar: ridge, vein: unlit },
  {
    at: [-32, 0],
    t: 0.4,
    bevel: 0.2,
    telson: { length: 17.8, root: 2.0, tip: 3.4, bias: 0.1, y: 0.5, roll: 0.06, curl: 0.42 },
    pairs: [
      {
        length: 17,
        root: 2.2,
        tip: 4.2,
        bias: 0.12,
        spread: 0.4189,
        dz: 2.2,
        y: 0,
        s: { roll: 0.1, curl: 0.5 },
        p: { roll: 0.16, curl: 0.36 },
      },
      {
        length: 20,
        root: 2.4,
        tip: 4.8,
        bias: 0.12,
        spread: 1.0472,
        dz: 3.6,
        dx: 1,
        y: -0.5,
        s: { roll: 0.14, curl: 0.34 },
        p: { roll: 0.1, curl: 0.52 },
      },
    ],
    cut,
  }
);

// "Under way a dim row along each tergite's edge": a row a carapace lobe
// along its rim on each side, at 0.93 of the half-beam where that lobe is
// the outermost thing, buds in the vein family's unlit finish — built, and
// never lit (models-plan.md §3.2 rule 2). Starboard one longer than port on
// the middle and aft lobes.
for (const [name, ranks] of [
  ['edge_row_6', { s: { from: 38, pitch: 4, count: 3 }, p: { from: 36, pitch: 4, count: 3 } }],
  ['edge_row_5', { s: { from: 26, pitch: 4, count: 4 }, p: { from: 24, pitch: 4, count: 3 } }],
  ['edge_row_4', { s: { from: 7, pitch: 4, count: 3 }, p: { from: 5, pitch: 4, count: 2 } }],
])
  pelagia.rimBuds(root, unlit, {
    rim,
    crown,
    name,
    ranks,
    at: 0.93,
    r: 0.45,
    squash: 0.6,
    on: SHIELD,
    cut,
  });

// "Nearly black at rest, photophores in a pattern that repeats on neither
// side": ten buds on the shell's shoulders at 0.7 of the half-beam — six on
// the carapace and four down the tail, the Directorate's own stations and
// pitches, each dropped onto the facet under it.
pelagia.rimBuds(root, light, {
  rim,
  crown,
  name: 'photophore',
  ranks: { s: { from: 35, pitch: 15, count: 3 }, p: { from: 37, pitch: 18.5, count: 3 } },
  at: 0.7,
  r: 0.7,
  squash: 0.55,
  on: SHIELD,
  cut,
});
pelagia.rimBuds(root, light, {
  rim,
  crown,
  name: 'photophore_tail',
  ranks: { s: { from: -10.5, pitch: 7, count: 2 }, p: { from: -19, pitch: 8, count: 2 } },
  at: 0.7,
  r: 0.6,
  squash: 0.55,
  on: [...TAIL, ...TAIL_RINGS],
  cut,
});

// Built in metres from the start; this guards the length and centres it.
// The telson's flat end is the one thing at −50, placed without a yaw, so
// the drawn length is 100 to the bit and the scale is 1.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'lure-pelagia.glb');
