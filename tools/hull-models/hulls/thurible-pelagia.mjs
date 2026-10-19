/**
 * The Thurible, the Commune's — 105 m (docs/units.md, "The ordnance
 * hulls"; the Thurible block of docs/asset-prompts-3d.md Block 3, which
 * pairs the kind with the Directorate and, on the Chorister's rule, lets
 * each navy field it in its own shape language, read with the Pelagia
 * FACTION block; #1440, as the Acolyte's variants were in #1439).
 *
 * "The censer, 105 m — a PR-3 hull that bombs upward, depth charges fused
 * above itself into water the Listening does not own, and a modest gun so
 * it is not helpless between racks (SIG 16 idle, 28 cruise; 85 at every
 * detonation, and that is the charge's, a band above; a 45-damage gun at
 * 500 m; 620 hull; 42 m/s; 300 nodules and 40 Biomass). A horseshoe crab:
 * a rostrum, then a broad domed carapace forward that steps down sharply
 * at its trailing edge to a narrow jointed abdomen and a telson, so the
 * plan is a shield over a tail; the charge rack let into the shield's back
 * as open-topped cells in two ranks, each a round well with a hinged lid,
 * the lids standing open upward because up is the way this hull fires — a
 * rack, not a tube, and no muzzle faces forward; one small spine-gun off
 * the centreline ahead of the rack, spines off the shield's rim at
 * different stations each side, folded walking limbs, a ribbed pressure
 * keel under all of it. Dim: rows of photophores along the shield's rim
 * and down the abdomen in a pattern that repeats on neither side, the
 * cells dark; nothing on the hull flares when it fires, because the light
 * and the 85 are the charge's, above it." — said the Commune's way: six
 * lobes down the keel, four small ones the tail and two great ones the
 * shield, each a squashed orb of chitin with a growth ring of ridge grown
 * round it — the aft shield's thickened into a flared husk rim at its
 * trailing edge — each leaning its own way off the keel line; a rostrum of
 * ridge drawn to a point and a tail of chitin drawn to one astern; the
 * rack as seven cups grown into the shield's back, each a sphincter of
 * ridge round a dark chitin floor with a leaf of membrane standing open
 * from a knuckle on its aft lip; a thorn of ridge off the rim at four
 * stations, thinning and curling as it goes; eight limbs of knuckle and
 * stem folded under the shield to a claw; a ridge spindle keel under the
 * belly with seven growth rings along it; and fifteen photophore buds
 * along the shield's rim and down the tail, which is the whole resting
 * light of a hull that idles at SIG 16.
 *
 * BUILT, not ported: there is no approved binary, so every number here is a
 * decision (docs/models-plan.md §3.1). Drawn metre-true at 105 m, the
 * rostrum's point at +52.5 and the tail's at −52.5, nothing to rescale, as
 * hulls/thurible.mjs is. The decisions that file took for the kind are
 * kept and translated, not retaken:
 *
 * - **Six lobes at the Directorate's six stations and radii.** The tail at
 *   −40, −32, −23 and −13 (6 to 8 m half-length, 3 to 4.8 tall, 6.5 to 11
 *   across), the aft shield lobe at +2 (15 long, 9 tall, 25 across) and
 *   the fore at +19 (25, 10.5, 27): the same plan, so the shield ends at
 *   −13 and the tail behind it is 11 m of half-beam where the shield was
 *   25 — the step. Where the Directorate draws a lip on each plate this
 *   navy grows a ring: the tail rings about 0.6 of a half-length abaft
 *   each centre (x −43.6, −36, −27.5, −18) and the fore shield's at +36,
 *   ahead of every cell and 2.3 m under the gun's barrel.
 * - **The shield's trailing corners, carried.** The Directorate flares its
 *   aft plate's lip to 23 m of half-beam at x −9 where the plate has drawn
 *   in to 16.5 — "the corners a horseshoe crab's has at its trailing
 *   edge" — and a first cut here drew a 14 m ring there and lost them
 *   (the reviewer's top-down read 16.5/17.3 at x −9 against the
 *   Directorate's 21.9/21.8). So the aft shield lobe grows no ring but a
 *   husk rim in its place (`cohortLobes` `rim`, written for this hull):
 *   `lobe_rim_4`, an orb of ridge 5.4 m long, 14.4 tall and 46 across at
 *   x −9.25, lifted 0.5 m, the Directorate's own lip orb said in ridge —
 *   x −11.95 to −6.55, z ±23 on the lobe's lean, its crown 1.75 m over the
 *   lobe's at its station and its belly 0.75 under. The plan now reads
 *   21.8/22.7 m of half-beam at x −9, 21.3/22.2 at −10, 17.3/18.2 at −11,
 *   where the Directorate's reads 21.9, 21.4 and 17.2, and 11 at −12
 *   behind it: the step.
 * - **Seven cups, two ranks, the Directorate's stations.** Starboard four
 *   at z +6.5 at x 24, 14, 4 and −6; port three at z −7.5 at 19, 9 and −1,
 *   half a pitch aft, so no cup answers another across the keel
 *   (`chargeCups` refuses one that does). Each a 5.6 m well as the kind's
 *   is, its cup standing 2.4 m proud of the ideal crown and sunk 1.73 into
 *   it — one foot for the rank, sunk by what the steepest station needs:
 *   the aftmost starboard cup at −6 drops 1.13 m from its centre to the
 *   downhill side of its foot, plus 0.6 for the facet's sag (a first cut
 *   sank every cup 1.2 and that one's aft foot stood 0.16–0.35 m off its
 *   facet; now every foot is 0.32 to 2.4 m under the facet on every
 *   bearing) — swelling to 6.6 m across 0.9 under the lip; a chitin lens
 *   1.3 m down the bore, its crest 1.37 m above the crown at the cell's
 *   centre (the Directorate's reason: a floor under a dome's crown shows
 *   the dome through it; the s3 bore's wall stands at 8.39 against a crown
 *   of 7.94 uphill); a leaf lid 5.9 m long and 5.3 across hinged on a ridge
 *   knuckle at the aft lip, standing 77° open forward and up, so the
 *   forward cup's lid reaches y 18.3 where the Directorate's reaches 17.9.
 *   From above each is a ring, a dark bore and a sliver of leaf behind it.
 * - **The gun at +31 to +39, 5.5 m to port.** `spine_gun_node`, a knuckle
 *   of ridge 2.4 m across sunk in the shell at (31, 9.2, −5.5), and the
 *   spike from it to the point at +39, horizontal at y 9.2, 3.4 m clear of
 *   the nose slope at the muzzle — the Chorister's spike with the joint it
 *   grew from.
 * - **Four thorns at the four rim stations.** Starboard at +30 (8 m) and
 *   +4 (9), port at +24 (9) and −8 (8), rooted 0.8 m into the flank at
 *   y 1, canted 1.05 outboard and raked 0.25 forward as the kind's spines
 *   are, each a stem that thins from 0.9 m to 0.12 and curls its own way
 *   (`rimThorns`): the s0 tip at (32.6, 4.0, 31.5), the p0 at (27.2, 4.7,
 *   −33.4), which is the hull's beam, 65.1 m to the Directorate's 65.9; the
 *   p1 thorn at −8 roots in the husk rim, the flank there.
 * - **Four limbs a side, folded under the shield** — at y −6, where the
 *   shell is 16.3 m of half-beam at the first station and 21.7 at the
 *   second (`lobeFlank`), four a side as the kind has them; where the two
 *   ranks stand is decided below. Each a hip knuckle half a metre in the
 *   skin, a femur 6 m out and 1 down to a knee knuckle, a tibia folded 5.5
 *   forward, 1 in and 1.2 down, a claw 1.8 m on: the s0 knee stands 0.4 m
 *   past the rim at x 33 and its claw reaches (40.2, −8.6, 21.3); the
 *   p0 knee 0.2 m past the rim and its claw (35.2, −8.7, −23.3). Dark.
 * - **The keel, ribbed.** A ridge spindle from +25 to −39 that follows the
 *   belly (`grownKeel`, the Verger's), 3.2 m across and 5 deep at the
 *   waist, its back 1.2 m inside the shield's skin and 0.8 inside the
 *   tail's, so it hangs 2.2 m under the shield's belly at x 20 and 3.4 m
 *   under the tail's at −20; seven growth rings along it from +20 to −34,
 *   0.3 m proud (`rings`, written for this hull). The hull's lowest point
 *   is the second ring at −13.6, the Directorate's −10.9.
 * - **Fifteen buds at the Directorate's fifteen stations.** Shield:
 *   starboard five from +34 at 8 m, port four from +30 at 9; tail:
 *   starboard four from −14 at 9, port two from −16 at 18; each at 0.84 of
 *   the rim's half-beam on the shield and 0.7 on the tail, dropped from
 *   the ideal crown onto the lobe facet under it, 0.2 m in, and tilted
 *   with it (`rimBuds`, kit.mjs `seat`). Buds 1.9 m across and 1.05 tall
 *   on the shield, 1.6 by 0.88 on the tail — the two scales again. No two
 *   opposite; every rank keeps clear of the rings, the thorns and the cups
 *   (the nearest, the s1 bud at +26 and the s0 thorn at +30, 0.4 m apart
 *   in plan and 4.6 m apart in the water). Nothing else is lit: not the cups (§3.2 rule 4), not the
 *   gun, not the keel, nothing astern.
 *
 * What the block does not say, decided here:
 *
 * - **The port limbs stand half a pitch aft of the starboard.** Starboard
 *   at the Directorate's 33, 23, 13 and 3; port at 28, 18, 8 and −2. The
 *   kind's limbs are a matched rank each side — "the one place the navy
 *   allows a pair", the Directorate's header says — and this navy's
 *   FACTION block is asymmetric by rule: `foldedLimbs` refuses a mirrored
 *   hip as every limb builder in the module does. So the one pair the kind
 *   allowed is the one station set this file moves, by the offset the
 *   port cell rank already carries.
 * - **The shield is two husks, not a leaf.** The Sower spreads its beam as
 *   a leaf; a domed carapace that carries wells on its back is a seed
 *   husk, and the Chorister's and Acolyte's lobe-and-ring series at this
 *   scale is the family resemblance the navy's hulls share. Sixteen facets
 *   round on a 27 m radius is a 10.6 m chord, the rule's ceiling.
 * - **The lids are membrane.** The one teal on the hull: the Directorate's
 *   lids are the gun's steel, machinery let into a shell, and this navy's
 *   lid is grown — the bract a seed left, the Carrier's sheaths. Unlit,
 *   because the cells are dark; the brightest unlit thing on the hull by
 *   value, as the Verger's dome is.
 * - **The lean.** The lobes lean off the keel line 0.4 m to port, 0.5 to
 *   starboard, 0.3 to port, 0.4 to starboard, 0.5 to port, 0.6 to
 *   starboard from the stern, the Chorister's own asymmetry at the kind's
 *   scale; the rostrum and the tail cone each follow their own lobe's
 *   line. A pixel at the chart's 2 px/m.
 * - **No dorsal leaf, no vanes, no dome.** The block names nothing else on
 *   the back and the back is a rack.
 * - **The light burns at 0.3**, the Acolyte's figure: `bio_light` at 1 is
 *   0.62 of white and the Directorate's `biolight_crimson` at 1, which its
 *   marks burn at, is 0.17, so 0.3 — 0.18 of white — is level with a
 *   Directorate mark a pixel at a time in the conn view (rosterModels.ts
 *   `recolor`).
 *
 * THE LIGHT, measured (`lightAudit`, printed by `exportGlb`): fifteen lit
 * parts, 23.5 m² facing up — the shield's nine at 1.69 to 1.88 m² each on
 * their facets, the tail's six at 1.19 to 1.31 — on a plan of 12,679 mask
 * pixels at 2 px/m, some 3,210 m²; the Directorate's fifteen show 23.9 on
 * 3,140. Nothing hidden, nothing floating: every bud's gap is 0. The bake
 * at E(16) = 1.41 reads raw E = 3.70 and dims by ×0.381 (the Directorate's
 * reads 6.26 and ×0.224): twenty-four times clear of the ×1/64 floor the
 * quiet end must not touch (§3.2) and nowhere near the ×64 ceiling.
 * Intake at 105 m: scale ×1.000, length on X, 111 meshes, four materials
 * (`chitin_hull`, `growth_ridge`, `algae_membrane`, `bio_light`), 5,510
 * triangles, no warning.
 *
 * CONTACTS (`contacts.mjs`): 152 pairs meet, every one a mount — each
 * ring on its lobe, the husk rim in lobe_4 and lobe_3; each lobe on the
 * next (and lobe_3 on lobe_5, a metre of overlap inside lobe_4); the
 * rostrum's base in the fore lobe and the tail's in the aft; each thorn's
 * root in its lobe, the p1's in the rim; each hip and the root
 * of each femur in its lobe, each femur in its hip and its knee, each
 * tibia in its knee and its femur's tip, each claw on its tibia; the gun's
 * knuckle in the shell and the spike in it; each cup in its lobe, its
 * floor and its node in the cup, its lid on the node (the s3 cup in the
 * rim as well as lobe_4); the keel in all six lobes and the rim, and
 * through the four tail rings — ridge into ridge: the rings' proud part
 * crosses the keel line at y −3.16, −3.58, −3.97 and −5.19, outside the
 * skin, and the keel's back there, −2.6 to −4.6, cuts it — and its seven
 * rings on it; each bud on its lobe. No bud meets a thorn, a cup, a ring
 * or the rim (the nearest, bud_tail_s0, 1.9 m from the rim). The lowest point is keel_ring_1 at −13.6 (a hull the view does
 * not stand).
 *
 * FACETS (#919; pelagia.mjs `cut`): every round part is asked of the rule
 * and `facets.mjs --parts` names none — the lobes sixteen round by eight
 * down at 6.5–27 m, the husk rim sixteen by eight, the rings sixteen; the rostrum fourteen at 3.4 m,
 * the tail cone ten at 2.4; the cups fourteen a turn at 3.3 m, their floors
 * eight by six, their nodes five by three; the thorns five; the knuckles
 * five by three, the stems and claws five; the keel ten, its rings nine;
 * the buds five by three. PANELS: the median unlit part from above is
 * 2.61 m on a side over sixty-five, inside the navy's 1.5–5 m band for a
 * hull. 111 parts, 5,510 triangles. TRIM: none laid, as the Chorister's,
 * Verger's and Acolyte's Commune variants lay none.
 *
 * `chargeCups`, `rimThorns`, `foldedLimbs`, `spineGun`, `rimBuds`,
 * `lobeCrown`, `cohortLobes`' `rim` and `grownKeel`'s `rings` were
 * written for this hull
 * (factions/pelagia.mjs, the Thurible section) and run here for the first
 * time.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/** The design length (UNIT_STATS hullLengthM, silhouettes.ts); the file is drawn to it. */
const L = 105;
const BOW = L / 2;
const STERN = -L / 2;

/** How the rim buds burn (the header): level with the Directorate's crimson mark. */
const BUD = 0.3;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const light = pelagia.ink.bioLight(BUD);

// The Commune's facet rule, a chord of 1.5 m (docs/asset-prompts-3d.md Block
// 2c; pelagia.mjs `cut`), asked in metres since the file is drawn in them.
const cut = pelagia.cut();

const root = new THREE.Group();
root.name = 'commune_thurible';

/**
 * The lobes, stern first: four small ones make the tail, two large ones the
 * shield, each `{ at, radii }` as `cohortLobes` takes them — the
 * Directorate's six stations and radii (hulls/thurible.mjs ABDOMEN and
 * SHIELD), each leaning its own way off the keel line. `ringDx` is where
 * its growth ring stands from the centre, cresting `ringProud` over the
 * skin there from a shoulder 0.75 below the crest.
 */
const LOBES = [
  { at: [-40, 0, -0.4], radii: [6, 3.0, 6.5], ringDx: -3.6, ringProud: 0.4 },
  { at: [-32, 0, 0.5], radii: [7, 3.6, 8], ringDx: -4, ringProud: 0.45 },
  { at: [-23, 0, -0.3], radii: [7.5, 4.2, 9.5], ringDx: -4.5, ringProud: 0.5 },
  { at: [-13, 0, 0.4], radii: [8, 4.8, 11], ringDx: -5, ringProud: 0.5 },
  {
    at: [2, 0, -0.5],
    radii: [15, 9, 25],
    rim: { dx: -11.25, lift: 0.5, radii: [2.7, 7.2, 23] },
  },
  { at: [19, 0, 0.6], radii: [25, 10.5, 27], ringDx: 17, ringProud: 0.7 },
];
const ringOn = ({ radii: [rx, , rz], ringDx, ringProud }) => {
  const crown = rz * Math.sqrt(1 - (ringDx / rx) ** 2) + ringProud;
  return { dx: ringDx, crown, shoulder: crown - 0.75 };
};
/** The shell: the lobes and the aft shield's husk rim, as `lobeCrown` and `lobeFlank` read them. */
const SHELL = LOBES.flatMap((lobe) =>
  lobe.rim
    ? [
        lobe,
        {
          at: [lobe.at[0] + lobe.rim.dx, lobe.at[1] + lobe.rim.lift, lobe.at[2]],
          radii: lobe.rim.radii,
        },
      ]
    : [lobe]
);
/** Where the shell's crown is at `(x, z)`, lean and all. */
const crown = (x, z) => pelagia.lobeCrown(SHELL, x, z);
/** Where the shell's flank is at `(x, y)` on one side. */
const rim = (x, y, sgn) => pelagia.lobeFlank(SHELL, x, y, sgn);
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

pelagia.cohortLobes(root, ridge, {
  cut,
  ring: { halfWidth: 0.7 },
  lobes: LOBES.map((lobe) => ({
    skin: chitin,
    at: lobe.at,
    radii: lobe.radii,
    ring: lobe.rim ? undefined : ringOn(lobe),
    rim: lobe.rim,
  })),
});

// The rostrum, a cone of ridge drawn to the bow's point, its base 13 m
// inside the fore lobe on that lobe's line; the tail a cone of chitin drawn
// to a point astern, its base 12 m into the aft lobe on its line.
pelagia.nose(root, ridge, { name: 'rostrum', tip: BOW, z: 0.6, r: 3.4, length: 13, cut });
pelagia.nose(root, chitin, {
  name: 'stem_tail',
  tip: STERN,
  z: -0.4,
  r: 2.4,
  length: 12,
  aft: true,
  cut,
});

// Four thorns off the shield's rim at the Directorate's four stations,
// rooted at y = 1 in the flank, canted 1.05 outboard, raked 0.25 forward,
// each curling its own way.
pelagia.rimThorns(root, ridge, {
  rim,
  thorns: [
    { side: 's', x: 30, length: 8, curl: [0.06, 0.12] },
    { side: 'p', x: 24, length: 9, curl: [0.1, 0.08] },
    { side: 's', x: 4, length: 9, curl: [0.04, 0.15] },
    { side: 'p', x: -8, length: 8, curl: [0.08, 0.1] },
  ],
  r: [0.9, 0.12],
  sink: 0.8,
  cant: 1.05,
  rake: -0.25,
  cut,
});

// The walking limbs folded under the shield's flanks: four a side, the
// starboard rank at the Directorate's stations and the port rank half a
// pitch aft of it, as the port cell rank is.
pelagia.foldedLimbs(
  root,
  { knuckle: ridge, stem: chitin, claw: ridge },
  {
    lobes: LOBES,
    hip: { y: -6, sink: 0.5, r: 1.1, squash: 0.85 },
    femur: { r: [0.8, 0.6], reach: 6, drop: 1 },
    knee: { r: 1.15, squash: 0.85 },
    tibia: { r: [0.65, 0.45], fold: 5.5, inboard: 1, drop: 1.2 },
    claw: { r: 0.5, length: 1.8 },
    cut,
    limbs: [
      { side: 's', x: 33 },
      { side: 's', x: 23 },
      { side: 's', x: 13 },
      { side: 's', x: 3 },
      { side: 'p', x: 28 },
      { side: 'p', x: 18 },
      { side: 'p', x: 8 },
      { side: 'p', x: -2 },
    ],
  }
);

// "One small spine-gun off the centreline ahead of the rack": 5.5 m to port
// on the forward slope, the knuckle sunk in the shell at +31 and the point
// at +39.
pelagia.spineGun(
  root,
  { knuckle: ridge, spike: ridge },
  { x: 31, y: crown(31, -5.5) + 0.3, z: -5.5, r: 0.6, length: 8, cut }
);

// The charge rack: seven cups in two ranks on the shield's back, the
// starboard rank of four at +6.5 and the port rank of three at −7.5 a half
// pitch aft of it, each seated on the crown where it is.
pelagia.chargeCups(
  root,
  { cup: ridge, floor: chitin, lid: membrane, node: ridge },
  {
    crown,
    cells: [
      { side: 's', x: 24, z: 6.5 },
      { side: 's', x: 14, z: 6.5 },
      { side: 's', x: 4, z: 6.5 },
      { side: 's', x: -6, z: 6.5 },
      { side: 'p', x: 19, z: 7.5 },
      { side: 'p', x: 9, z: 7.5 },
      { side: 'p', x: -1, z: 7.5 },
    ],
    cut,
  }
);

// The ribbed pressure keel: a ridge spindle under the belly from +25 to
// −39 that follows it, its back 1.2 m inside the shield's skin and 0.8
// inside the tail's, with seven growth rings along it.
const keelAt = (x, hb, hh, sink) => [x, hb, hh, belly(x) - hh + sink];
pelagia.grownKeel(root, ridge, {
  stations: [
    [25, 0, 0, belly(25) + 0.3],
    keelAt(20, 1.0, 1.7, 1.2),
    keelAt(10, 1.4, 2.3, 1.2),
    keelAt(0, 1.6, 2.5, 1.0),
    keelAt(-10, 1.5, 2.4, 0.8),
    keelAt(-20, 1.3, 2.1, 0.8),
    keelAt(-30, 1.0, 1.7, 0.8),
    [-39, 0, 0, belly(-39) + 0.3],
  ],
  rings: { count: 7, proud: 0.3, rise: 0.6, halfWidth: 0.5, inset: 5 },
  cut,
});

// "Rows of photophores along the shield's rim and down the abdomen in a
// pattern that repeats on neither side": two rims, one rule, fifteen buds,
// the Directorate's own stations and pitches, each dropped onto the lobe
// facet under it.
pelagia.rimBuds(root, light, {
  rim,
  crown,
  name: 'bud_rim',
  ranks: {
    s: { from: 34, pitch: 8, count: 5 },
    p: { from: 30, pitch: 9, count: 4 },
  },
  at: 0.84,
  r: 0.95,
  squash: 0.55,
  on: ['lobe_4', 'lobe_5', 'lobe_rim_4', 'lobe_ring_5'],
  cut,
});
pelagia.rimBuds(root, light, {
  rim,
  crown,
  name: 'bud_tail',
  ranks: {
    s: { from: -14, pitch: 9, count: 4 },
    p: { from: -16, pitch: 18, count: 2 },
  },
  at: 0.7,
  r: 0.8,
  squash: 0.55,
  on: [
    'lobe_0',
    'lobe_1',
    'lobe_2',
    'lobe_3',
    'lobe_ring_0',
    'lobe_ring_1',
    'lobe_ring_2',
    'lobe_ring_3',
  ],
  cut,
});

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'thurible-pelagia.glb');
