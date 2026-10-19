/**
 * The Thurible, the Order's — 105 m (docs/units.md, "The ordnance hulls";
 * the Thurible block of docs/asset-prompts-3d.md Block 3, read with the
 * Hadron FACTION block on the Chorister's rule — "the Thurible carries no
 * faction lock … a navy rendering for one fields the same plan, the shield
 * over the tail, the open-lidded rack on its back and the one spine-gun,
 * composed with its own FACTION block, with the light kept dim").
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
 * and the 85 are the charge's, above it."
 *
 * Built, not ported (#1440, on models-plan.md §3.4): the Order's variant of
 * a kind whose canonical model is the Directorate's (hulls/thurible.mjs),
 * drawn from the module's vocabulary with no approved binary behind it, so
 * every number here is a decision, and this header says which ones the
 * block did not make. Metre-true at 105 with no root scale: the bow
 * prism's tip is the bow at x 52.5 and the drive prism's base ring the
 * stern at −52.5. The bake's SIG is the kind's 16 (tools/hull-maps/models.mjs
 * `thurible`), not a cone figure: the row is the Directorate's, and the
 * variant takes the Chorister's rule — the plan kept, the light kept at the
 * kind's band. Nothing here is an animal (docs/bestiary.md §3): the
 * horseshoe crab is the plan's shape, a shield, a tail and a spike.
 *
 * THE PLAN KEPT. What hulls/thurible.mjs decided for the kind where the
 * block was silent stands here, in the Order's shapes: the rack is two
 * ranks of round wells on a 10 m pitch at the Directorate's own stations,
 * x 24, 14, 4 and −6; each lid is hinged at its cell's aft edge and stands
 * 1.35 rad open forward and upward; the floor of each well stands a metre
 * ABOVE the crown at the bore's centre, since a floor let into a facet that
 * slopes is a floor the facet shows through on the uphill side; the gun is
 * on the forward slope ahead of the rack with its barrel horizontal, so
 * the muzzle stands clear of the nose that falls away under it; the spines
 * are off the RIM and lie out past it, where they read as spikes in plan;
 * four limbs a side fold under the shield's flanks with their knees past
 * the rim forward and under it aft; a ribbed keel runs under all of it; and
 * the marks sit along the shield's rim at 0.84 of its half-beam and down
 * the tail at 0.7, the cells, the gun, the keel and the stern dark.
 *
 * THE COUNTS AND STATIONS ARE NOT THE KIND'S. The Directorate's Thurible is
 * asymmetric by its block — seven cells in two staggered ranks, the gun
 * 5.5 m to port, spines at four stations none opposite another, fifteen
 * photophores repeating on neither side — and its builders refuse a
 * mirrored pair. The Hadron FACTION block makes this navy "the only
 * faction with" precise bilateral symmetry, and every approved Order
 * variant takes the faction block over the kind's asymmetry: the
 * Chorister's lamps and gun went on the centreline (hulls/chorister-hadron.mjs,
 * the spine-gun as a rail each side of the spine), the Verger's hatches
 * into two mirrored pairs (hulls/verger-hadron.mjs), the Acolyte's tripod
 * into three mirrored pairs (hulls/acolyte-hadron.mjs). So the Order's
 * Thurible is bilaterally symmetric, every pair drawn through `bothSides`
 * (port −z, #642), and a mirrored rack is an even count:
 *
 * - **Eight cells, four a side**, at z ±7.5 on the Directorate's four
 *   stations (`chargeWells`). Eight and not six because the kind's leading
 *   rank is four on a 10 m pitch over 30 m of back, and a rank a side at
 *   that count puts the rack on the same 30 m from x 26.8 to −8.8, so the
 *   rack reads the same size from above as the kind's; three a side would
 *   bare a third of the shield's back, and the stat is a cooldown, not a
 *   magazine. One more than the kind's seven, not two fewer.
 * - **The gun on the centreline**: a mount block on the spine's top at
 *   x 31, a four-facet alloy barrel from 31 to 41 tapering 0.6 to 0.45 m
 *   with its flat up, and a rail each side of the barrel at z ±0.65 from
 *   30.5 to 38.5 rooted in the mount — the Chorister's rail pair with the
 *   barrel between, dark (`spineGun`). The barrel's axis is at y 5.95 over
 *   a spine top of 4.95 at the breech and 2.93 at the muzzle: 3.0 m clear.
 * - **Rim blades as two mirrored pairs** at x 27 and −4 (`rimBlades`):
 *   alloy plans 0.9 m thick at y 0, the flank's middle, each rooted 1.5 m
 *   inside the vertical flank facet on a 5 m chord and reaching 9 m past
 *   the rim to a point 2.2 m ahead of its root's middle — the forward
 *   pair's tips at (29.2, ±22.83), the after pair's at (−1.8, ±26.38),
 *   which is the model's beam. Spikes said as blades, the Clarion's wing
 *   and the Lance's guard.
 * - **Limbs as four mirrored pairs** at x 31, 21, 11 and 1 (`foldedLimbs`):
 *   hips on the flank facet at y −1.5, −1.8, −2.4 and −2.2, each a 2.0 by
 *   1.6 by 1.8 alloy block sunk 0.6; a four-facet femur 3.2 m out and 2.6
 *   down to a 2.0 by 1.6 by 1.6 knee; a tibia folded 5 m forward, 3 m back
 *   inboard and 1.2 down to the ankle; and a crystal point 2.4 m long lying
 *   forward from it. Knees stand at (31, −4.1, ±14.57), (21, −4.4, ±19.21),
 *   (11, −5.0, ±23.17) and (1, −4.8, ±21.05), their outboard faces 3.4 m
 *   past the rim at every station; the claws' bases at x 36, 26, 16 and 6,
 *   their tips at ±11.57, ±16.21, ±20.17 and ±18.05, which on the kite's
 *   narrowing nose is 3.0, 3.0 and 2.4 m past the plan rim at the three
 *   forward stations and 2.0 m under it at the after one — the
 *   Directorate's 3.5, 1.7, −0.6 and −0.1, near enough.
 * - **Marks as mirrored pairs**: five along the shield's rim and three down
 *   the tail (LIGHT below).
 *
 * THE SHAPES TRANSLATED. "A broad domed carapace" is the Directorate's
 * language; the Order has no dome, and says a shield as a blade laid flat:
 *
 * - **The shield** (`spar`, six facets) is one hexagonal-section spar with
 *   a vertex on the crown, a kite in plan on five stations — 0.3 m at
 *   x −13, 15.5 at −10, 20 at 12, 7.5 at 40, 0.3 at 47 — pressed 0.4 tall
 *   by 1.2 wide. At its widest, x 12, the ridge stands 8 m over the axis,
 *   the keel vertex 8 under, and the beam vertices lie at z ±20.78: a beam
 *   of 41.6 m (0.40 of the length, under the Tocsin's 0.457, the navy's
 *   widest by order) on a height of 16 (0.385 of the beam; no approved
 *   Order body stands over 0.43). The section gives the shield a crown
 *   ridge, two top facets falling 0.192 (10.9°) to the beam, a vertical
 *   flank facet 0.4 of the radius tall — 8 m at the widest, the face the
 *   hips and the blades root in — and two lower facets to the keel vertex.
 *   Not the slab the module forbids: a wide body is ordered by the block
 *   ("broad … shield"), and what keeps it off the slab is a kite with a
 *   ridge, faceted crown to keel. "Steps down sharply at its trailing
 *   edge": the plan goes from 16.1 m of half-beam at x −10 to 0.3 at −13,
 *   a cliff three metres long with the tail's first segment emerging
 *   through it; its lower corners are the kite's trailing corners.
 * - **The tail** is the family's three segments on one axis (`spar`, four
 *   facets, the Chorister's and the Acolyte's), shadow indigo, each a
 *   double-ended wedge about its own middle pressed 0.6 tall by 1.4 wide:
 *   segment_2 at x −38, 16 m on 4.4 of radius (8.7 in beam, 3.7 tall);
 *   segment_1 at −25, 18 m on 5.2 (10.3 by 4.4); segment_0 at −11, 19 m on
 *   5.8 (11.5 by 4.9), its forward half inside the shield. Each passes into
 *   the next through a waist, which is "jointed" said the Order's way.
 * - **The spine in two runs** (`spar`, sheared), alloy four-facet ridges
 *   pressed 0.7 on 1 m with their axes 0.15 m under the crown at every
 *   station, so they stand 0.34 m proud: along the shield's ridge from
 *   x −11 to 44, the bow prism's base, and down the tail from −43 to −13,
 *   dipping with the waists. No inlay: the hull is dim.
 * - **The rostrum and the telson** are the Chorister's prisms (`point`):
 *   an alloy bow prism 10 m long on 2.2 m of half-diagonal, its tip the
 *   bow and its base at 42.5 in the shield's nose, where the ridge is 1.97
 *   and the spine's top 2.10, so the base's crown vertex at 2.2 stands
 *   0.23 m over the ridge and 0.1 over the spine it sits in;
 *   a crystal drive prism 8 m long on 2.2, born apex-up and laid point
 *   forward into segment_2, its base ring the stern. Both dark.
 * - **The dorsal fin** (`finAndKeel`), the family's, 8 by 4 m by 0.8 on the
 *   tail's spine from x −31 to −23, its base on the spine's top at 2.55.
 * - **The cells** (`chargeWells`): six-facet crystal collars 2.8 m in
 *   circumradius (4.85 across the flats) on a 2.25 m bore, standing 2.2 m
 *   proud of the top facet at the cell's centre and sunk 1.2 into it,
 *   their flats fore and aft; a dark-steel floor 1.2 m down the bore
 *   (`ink.darkSteel`, the one dark cladding an Order hull carries, on the
 *   Offertory's cradle floors — not the seam's base, since the cells are
 *   never lit); a six-sided alloy lid of the collar's radius hinged along
 *   the aft flat, 2.42 m abaft the centre, standing 1.35 rad open forward
 *   and up; and an alloy pin along the hinge. Collars vertical on the
 *   10.9° facet, as the Directorate's are on its dome. The cells sit on
 *   the facet at y 4.41, 6.20, 5.90 and 5.09 from the forward station aft.
 *   Each floor stands clear ABOVE the facet, mounted flush in its collar
 *   (the collar · well pairs): the facet's highest point under a floor is
 *   its aft-inboard corner, where the nose's slope and the facet's own
 *   rise add to 0.57 m at most, and `gapBetween` reads the floors 0.13 m
 *   over the facet at the forward two cells and 0.26 at the after two —
 *   inside the collar, under the floor, and the chart sees a dark bore.
 *   Crystal collars rather than the Directorate's steel is a judgement:
 *   unlit `resonance_crystal` has a linear luminance of about 0.20 against
 *   `shadow_indigo`'s 0.035, so the conn view shows the eight cells as
 *   mid-tone rings on a dark shield, a rack of cut stones let into a
 *   blade, where alloy rings would read as the lids' pale again and the
 *   bores would lose their edge.
 * - **The keel** (`spar`, sheared, and `pressureRibs`): a four-facet alloy
 *   spar 72 m from x −40 to 32 on 1.6 m of radius pressed 1.1 tall by
 *   0.45 wide (2.5 by 1.0 in section), its axis a metre under the belly
 *   at every station — −9.0 at x 12 under the shield, −3.2 at −25 under
 *   the tail, climbing the cliff between −12 and −15 — so its top is sunk
 *   the whole way and its bottom hangs 2.2 m under the shield; and five
 *   alloy hoops round it at x 24, 12, 0, −24 and −34, four-sided on a
 *   0.35 m tube at the keel's own section, each at the keel's axis there
 *   (the third station number `pressureRibs` takes since this hull),
 *   their upper runs inside the belly. The hoops are the "ribbed"; neither
 *   the chart nor the conn camera sees under the shield, and the inspect
 *   sheet's stern three-quarter shows them under the step.
 *
 * LIGHT. "Dim": sixteen marks in eight mirrored pairs, each a
 * `crystal_seam` box at strength 1 — the Chorister's (SIG 16, the same
 * figure) and the Verger's (14) — dropped onto the facet under its station
 * (`rimMarkPairs`, kit.mjs `seat`). Five pairs along the shield's rim at
 * x 32, 24, 16, 8 and 0, 0.84 of the flank's half-beam out — z ±9.69,
 * 12.81, 15.93, 16.77 and 15.34 — 1.2 m square and 0.3 tall, each lying on
 * the top facet at its 10.9° and showing 1.56, 1.56, 1.56, 1.31 and
 * 1.25–1.31 m²; three pairs down the tail at x −15, −25 and −35, 0.7 of
 * the segment's half-beam out — z ±4.02, 3.60 and 3.05 — 1.0 m square on
 * the segments' flat tops, 1.0 m² each. The two scales again, and nothing
 * larger anywhere. Nothing else is lit: not the cells (models-plan.md
 * §3.2, rule 4), not the gun, not the keel, nothing on the centreline and
 * nothing abaft the tail marks centred at x −35 — the last 17 m, segment_2's
 * tail and the drive prism, are dark, as every Order stern is. Figures measured
 * (`lightAudit`, printed by `exportGlb`; the intake bake): sixteen lit
 * parts, 20.5 m² facing up, every one resting on its facet, none hidden,
 * none floating. 20.5 m² on 2,284 m² of plan (9,134 mask px at 2 px/m).
 * The bake at E(16) = 1.41 reads raw E 9.07 and dims by ×0.155: ten times
 * clear of the ×1/64 floor the quiet end must not touch (§3.2), beside the
 * Directorate's ×0.224 and the Verger's ×0.143. 111 parts, 2,208
 * triangles, bounds x ±52.5, y −10.6..13.3, z ±26.4.
 *
 * FACETS and PANELS (Block 2c; `node tools/hull-models/facets.mjs hadron`):
 * no ring off the rule. The shield is the hexagonal section the Order cuts
 * at any size, and so are the collars, floors, lids and pins; the segments,
 * spines, prisms, barrel, bones, claws and keel the diamond; the hoops four
 * round and four on the tube. The median unlit part from above is 2.1 m on
 * a side over 77, inside the hulls' 2–6 m band at its floor: forty of the
 * seventy-seven are limb and cell parts of 1–4 m², and the shield's five
 * facets, the blades and the segments divide the plan where a seam would.
 * No trim laid, as the Chorister's, the Verger's and the Acolyte's Order
 * variants lay none.
 *
 * Contacts (`node tools/hull-models/contacts.mjs thurible-hadron`): 140
 * pairs, every one a mount — the tail's first segment, both spines, the
 * bow prism, the gun's mount, the collars, the blades, the hips and femurs
 * and the ten rim marks in or on the shield; each segment into the next
 * and its spine, keel, hoop and marks; the drive prism in segment_2; the
 * fin on the aft spine; the barrel and rails in the mount; each well and
 * hinge in its collar, each lid on its hinge; each femur in its hip and
 * knee, each tibia in its knee and claw, the femur and tibia meeting
 * inside the knee block; the hoops through the shield's belly and round
 * the keel. A first cut rooted the forward hips at y −1.2 against blades at
 * x 28, and the sweep named the clip (`limb_0_s_hip · rim_blade_0_s`);
 * the blades are at 27 and the hips at −1.5 now, 0.5 m apart along the
 * hull and 0.25 m apart in height. 56 parts reach under y 0, which on a
 * hull is the axis and not the ground: the shield's keel vertex at −8, the
 * keel and its hoops to −10.6, the hips, the limbs to the claws at −6.8.
 * No lamp is hidden and none floats (`exportGlb`, no warning).
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 105;
const BOW = L / 2;
const STERN = -L / 2;

/** The shield's section: six facets with a vertex on the crown, pressed 0.4 tall by 1.2 wide. */
const SHIELD = [0.4, 1.2];
/** The tail's section: the Chorister's blade, four facets pressed 0.6 tall by 1.4 wide. */
const TAIL = [0.6, 1.4];
/** A four-facet spar's flat is at cos 45° of its radius; a six-facet one's beam vertex at cos 30°. */
const FLAT = Math.SQRT1_2;
const HEX = Math.cos(Math.PI / 6);

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const dark = hadron.ink.darkSteel();

const root = new THREE.Group();
root.name = 'hadron_thurible';

/** The shield's stations, stern first: a kite in plan. */
const SHIELD_PROFILE = [
  [-13, 0.3],
  [-10, 15.5],
  [12, 20],
  [40, 7.5],
  [47, 0.3],
];
/** A polyline's radius at `x`, 0 off its length. */
const along = (profile, x) => {
  if (x < profile[0][0] || x > profile[profile.length - 1][0]) return 0;
  const k = profile.findIndex(([sx]) => sx >= x);
  if (k <= 0) return profile[Math.max(k, 0)][1];
  const [x0, r0] = profile[k - 1];
  const [x1, r1] = profile[k];
  return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
};
const shieldR = (x) => along(SHIELD_PROFILE, x);
/** The shield's crown ridge at `x`. */
const ridge = (x) => shieldR(x) * SHIELD[0];
/** The shield's vertical flank facet's half-beam at `x`. */
const shieldFlank = (x) => shieldR(x) * HEX * SHIELD[1];
/** The shield's top facet at `(x, z)`: from the ridge down to the beam vertex at half the ridge's height. */
const shieldCrown = (x, z) => {
  const b = shieldFlank(x);
  if (b <= 0 || Math.abs(z) > b) return NaN;
  return ridge(x) - (0.5 * ridge(x) * Math.abs(z)) / b;
};
/** The shield's belly (its keel vertex) at `x`. */
const shieldBelly = (x) => -ridge(x);

/**
 * The tail's three segments, stern first: `[name, x, half-length, radius]`,
 * each a four-facet spar about its own middle, a double-ended wedge
 * tapering to 0.3 over the outer half of each end (the Acolyte's).
 */
const SEGMENTS = [
  ['segment_2', -38, 8, 4.4],
  ['segment_1', -25, 9, 5.2],
  ['segment_0', -11, 9.5, 5.8],
];
const segmentRadius = ([, cx, half, r], x) => {
  const u = Math.abs(x - cx);
  if (u >= half) return 0;
  return u <= half / 2 ? r : r - (r - 0.3) * ((u - half / 2) / (half / 2));
};
const tailRadius = (x) => Math.max(...SEGMENTS.map((s) => segmentRadius(s, x)));
const tailCrown = (x) => tailRadius(x) * FLAT * TAIL[0];
const tailBelly = (x) => -tailCrown(x);

// The shield: one six-facet spar, shadow indigo, a kite in plan with a
// ridge on the crown and vertical flank facets (the header has the section).
hadron.spar(root, 'shield', shadow, { profile: SHIELD_PROFILE, facets: 6, flat: SHIELD });

// The tail: three four-facet segments, stern first, each on its own middle.
for (const [name, x, half, r] of SEGMENTS)
  hadron.spar(root, name, shadow, {
    profile: [
      [-half, 0.3],
      [-half / 2, r],
      [half / 2, r],
      [half, 0.3],
    ],
    x,
    flat: TAIL,
  });

// The spine in two runs: along the shield's crown ridge and down the tail.
const SPINE = [0.7, 1];
const spineTop = (axis) => axis + SPINE[0] * FLAT * 1.0;
const spineRun = (name, stations) =>
  hadron.spar(root, name, alloy, { profile: stations, flat: SPINE });
const shieldAxis = (x) => ridge(x) - 0.15;
spineRun('spine_fore', [
  [-11, 0.3, shieldAxis(-11)],
  [-9, 1.0, shieldAxis(-9)],
  [12, 1.0, shieldAxis(12)],
  [40, 1.0, shieldAxis(40)],
  [44, 0.3, shieldAxis(44)],
]);
const tailAxis = (x) => tailCrown(x) - 0.15;
spineRun('spine_aft', [
  [-43, 0.3, tailAxis(-43)],
  [-40, 1.0, tailAxis(-40)],
  [-34, 1.0, tailAxis(-34)],
  [-30, 1.0, tailAxis(-30)],
  [-25, 1.0, tailAxis(-25)],
  [-20, 1.0, tailAxis(-20)],
  [-16, 1.0, tailAxis(-16)],
  [-13, 0.3, tailAxis(-13)],
]);

// The rostrum and the telson: an alloy bow prism, its tip the bow; a
// crystal drive prism at the stern laid point forward into the tail.
hadron.point(root, 'bow_prism', alloy, { x: BOW - 5, r: 2.2, length: 10 });
hadron.point(root, 'drive_prism', crystal, { x: STERN + 4, r: 2.2, length: 8, tipUp: true });

// The dorsal fin on the tail's spine.
hadron.finAndKeel(root, alloy, {
  fin: { x: -27, y: spineTop(tailAxis(-27)) + 2.0, length: 8, height: 4.0 },
  t: 0.8,
});

// The spine-gun on the centreline ahead of the rack: the mount on the
// spine's top at the breech, the barrel horizontal over the nose's fall,
// the rails either side of it (the header says why the centreline).
hadron.spineGun(root, alloy, { x: 31, y: spineTop(shieldAxis(31)) });

// The charge rack: eight cells in two mirrored ranks of four at z ±7.5 on
// the Directorate's four stations, each seated on the top facet where it
// is (the header says why eight).
hadron.chargeWells(
  root,
  { collar: crystal, floor: dark, lid: alloy },
  {
    crown: shieldCrown,
    pairs: [
      { x: 24, z: 7.5 },
      { x: 14, z: 7.5 },
      { x: 4, z: 7.5 },
      { x: -6, z: 7.5 },
    ],
  }
);

// Two mirrored pairs of blades off the rim, forward and at the kite's
// trailing third — the Directorate's four rim spines, paired.
hadron.rimBlades(root, alloy, { flank: shieldFlank, stations: [27, -4] });

// Four mirrored pairs of limbs folded under the shield's rim, hips on the
// vertical flank facet at each station's own height (the header has the
// joints measured). The tibia folds 5 m forward and 3 back inboard, so the
// claws lie under the rim aft and just past it on the narrowing nose.
hadron.foldedLimbs(
  root,
  { alloy, crystal },
  {
    flank: shieldFlank,
    pairs: [
      { x: 31, y: -1.5 },
      { x: 21, y: -1.8 },
      { x: 11, y: -2.4 },
      { x: 1, y: -2.2 },
    ],
    tibia: { r: [0.6, 0.45], fold: 5.0, in: 3.0, drop: 1.2 },
  }
);

// The ribbed pressure keel: a four-facet alloy spar sheared under the belly
// of the shield and the tail, with alloy hoops.
const belly = (x) => (x > -12.5 ? shieldBelly(x) : Math.min(shieldBelly(x), tailBelly(x)));
const KEEL = [1.1, 0.45];
const keelAxis = (x, under = 1) => belly(x) - under;
const KEEL_PROFILE = [
  [-40, 0.3, keelAxis(-40, 0.4)],
  [-36, 1.6, keelAxis(-36)],
  [-25, 1.6, keelAxis(-25)],
  [-15, 1.6, keelAxis(-15)],
  [-12, 1.6, keelAxis(-12)],
  [-10, 1.6, keelAxis(-10)],
  [12, 1.6, keelAxis(12)],
  [28, 1.6, keelAxis(28)],
  [32, 0.3, keelAxis(32, 0.4)],
];
hadron.spar(root, 'keel', alloy, { profile: KEEL_PROFILE, flat: KEEL });
hadron.pressureRibs(root, alloy, {
  stations: [24, 12, 0, -24, -34].map((x) => [
    x,
    1.6,
    along(
      KEEL_PROFILE.map(([x, , y]) => [x, y]),
      x
    ),
  ]),
  tube: 0.35,
  lift: 0.1,
  flat: KEEL,
  facets: 4,
});

// "Rows of photophores along the shield's rim and down the abdomen": eight
// mirrored pairs, five on the shield's top facets at 0.84 of the flank's
// half-beam and three on the segments' flats at 0.7, each dropped onto
// the facet under it (LIGHT in the header).
hadron.rimMarkPairs(root, seam, {
  name: 'rim_mark',
  on: 'shield',
  spots: [32, 24, 16, 8, 0].map((x) => [x, 0.84 * shieldFlank(x)]),
  size: [1.2, 0.3, 1.2],
});
hadron.rimMarkPairs(root, seam, {
  name: 'tail_mark',
  on: ['segment_0', 'segment_1', 'segment_2'],
  spots: [
    [-15, 0.7 * tailRadius(-15) * FLAT * TAIL[1]],
    [-25, 0.7 * tailRadius(-25) * FLAT * TAIL[1]],
    [-35, 0.7 * tailRadius(-35) * FLAT * TAIL[1]],
  ],
  size: [1.0, 0.3, 1.0],
});

metreTrue(root, L, { drawn: L });
await exportGlb(root, 'thurible-hadron.glb');
