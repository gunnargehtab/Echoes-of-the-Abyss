/**
 * The Thurible, the Klaxon's — 105 m (docs/units.md, "The ordnance hulls";
 * the Thurible block of docs/asset-prompts-3d.md Block 3, read with the
 * Bathyarch FACTION block, #1440).
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
 * The Thurible carries no faction lock — the Biomass is the lock, as the
 * Chorister's and the Acolyte's are (the paragraph under the block) — so
 * the Klaxon fields it on the Chorister's rule: the same plan, composed in
 * the navy's shape language, with the light kept dim. Said the Klaxon's
 * way, as hulls/acolyte-bathyarch.mjs says the scout and
 * hulls/verger-bathyarch.mjs the transport: the shield an armoured slab of
 * hull black, 54 m across, bevelled at its rim, with two armour tiers
 * stepped up its back — the lower in newer iron grey, the upper the older
 * black showing through — the Bulwark's own body; the rostrum a bow block
 * with the hazard stripe on it and the six-plate ram to the bow; the
 * abdomen three riveted pressure cans stepping down from the slab's
 * trailing edge, 6, 5 and 4 m in radius, each capped fore and aft in older
 * plate so the caps cross at the seams and five rivets along each crown,
 * which is "jointed"; the telson a stern block with the screw in its
 * shroud; the charge rack seven steel cans let into the upper tier, each a
 * collar standing proud with a dark well down its bore, a dogged lid
 * hinged aft and standing open forward and up with its dogging wheel on
 * its face, and four dog lugs round the collar; the spines four whip
 * aerials off brackets on the slab's flank; the limbs four a side folded
 * under the shield, each a hip bracket hung from the slab's belly, a box
 * girder of a thigh, a knee block, a shin folded on and a tip block; the
 * keel a black pressure drum with seven hoop frames of older plate round
 * it; a box stack on the lower tier; and the tiers dressed with the stripe,
 * four dogged hatches, twelve patches of the other finishes, four seams
 * and rivet rows along each tier's edge.
 *
 * Built metre-true at 105 m, the ram's point at +52.5 and the shroud's and
 * hub's after faces at −52.5, with nothing to rescale (kit.mjs
 * `metreTrue`). Every part comes from `factions/bathyarch.mjs`; `chargeCans`,
 * `rimWhips`, `foldedLimbs`, `ribbedKeel`, `rimLamps` and `planHalfBeam`
 * were written for this hull there, beside the Acolyte's section. The
 * cells, the whips and the lamps are placed one side at a time at signed
 * z, port −z (#642), each builder refusing a mirrored pair; the limbs are
 * the one true pair and go through `bothSides` (§3.6, as the Directorate's
 * `limbs` do).
 *
 * THE KIND'S DECISIONS, kept and translated (hulls/thurible.mjs took them
 * for the Directorate; a variant keeps them, it does not retake them):
 *
 * - **Seven cells in two ranks, no cell opposite another.** Starboard
 *   four at z +6.5, x +24, +14, +4, −6; port three at z −7.5, x +19, +9,
 *   −1: a 10 m pitch, the port rank half a pitch aft. Each is a 5.6 m
 *   collar at the rule's eight plates, let 1.2 m into the upper tier's
 *   plate at y 9.3 and standing 2.2 m proud of it, its top at 11.5; the
 *   well floor 1.8 m down the bore, its top at 9.7, 0.4 m above the deck
 *   it is let into, so the bake sees black down every bore and no plate;
 *   the lid hinged on a pin along the collar's aft edge and standing 77°
 *   open, its centre at (x − 2.19, 14.36) and its forward edge at 17.1,
 *   the hull's highest point; the dogging wheel and hub on its outer face,
 *   which faces aft and up; four lugs at the odd bearings, 0.6 m proud of
 *   the collar, their tops 0.3 under its rim. From above every cell is an
 *   eight-sided ring, a dark bore and a bar behind it, and the seven are
 *   the count. On a deck the seven sit at one height where the
 *   Directorate's step down its dome: a Klaxon deck is flat.
 * - **The gun is where the kind put it.** 5.5 m to port, its mount a 3 m
 *   block on the lower tier from x +29.5 to +32.5 (its top at 8.4), the
 *   barrel 8 m from +31 to the muzzle at +39 with its axis at y 8.6, 0.6
 *   to 0.45 in radius, six plates, horizontal: its flat underside at 8.08
 *   sits 0.32 m into the mount (the sweep lists `gun_mount · gun`), and
 *   the barrel's forward 6.5 m stand clear. Twelve metres ahead of the
 *   port rank's leading cell; the mount's aft face half a metre ahead of
 *   the upper tier's nose at +29; the muzzle's underside 3.9 m over the
 *   slab's nose plate at 4.3, its axis 4.3 m over it.
 * - **The spines are off the rim, not the back.** Four whips at the kind's
 *   stations and lengths — starboard +30 (8 m) and +4 (9 m), port +24
 *   (9 m) and −8 (8 m) — rooted 0.8 m into the slab's flank at y 1, each
 *   off a bracket of older plate 1.6 × 1.8 × 1.4 set 0.5 into the flank,
 *   canted 60° outboard and raked 0.25 forward, 0.55 m at the root to 0.2
 *   at the tip, six plates. The tips: (31.8, 4.5, 27.9), (26.0, 5.0,
 *   −31.7), (6.0, 5.0, 34.7), (−6.2, 4.5, −31.6), which is why the file
 *   spans z −32.1 .. 35.1 on a slab 54 m across: four spikes in plan at
 *   four stations, none opposite another.
 * - **Four limbs a side, folded under the shield, the tips where the
 *   Directorate's are.** Hips at x +33, +23, +13 and +3, hung from the
 *   slab's belly (y −4.3) on brackets sunk 0.3 into it, the limb's line at
 *   y −6; a thigh 4.5 m out swept 0.6 forward, a shin 3.5 m folded on to
 *   1.1, 1.0 × 0.9 in section; so the tips stand at x +38.7, +28.7, +18.7,
 *   +8.7 and z ±15.6, ±24.2, ±26.9, ±27.7 — 3.5 and 1.7 m past the slab's
 *   widest section (12.1 and 22.5 there) on the forward two pairs, 0.6 and
 *   0.1 m inside it (27.5, 27.8) on the after two, the Directorate's four
 *   reaches. The hips are set by those reaches, z 10.3, 18.9, 21.6 and
 *   22.4, so the forward pair's bracket hangs 9.2 m inside the slab's
 *   flank (19.5 at x +33) and the after pair's 5.4 (27.8 at +3).
 * - **The keel and its ribs.** A black drum 64 m from +25 to −39, 3.2 m
 *   forward to 2.4 aft, eight plates, its axis at −6.5: its crown 1 m into
 *   the slab's belly and its bottom at −9.7 forward and −8.9 aft: 2.67 m
 *   in radius at the first can's station, −17.5, so 3.3 m under that can's
 *   flat bottom at −5.85, and 5.1 m under the last can's at −3.8 where the
 *   keel ends at −39; seven hoop frames of older
 *   plate 0.35 thick and 0.25 proud from 3 m inside each end. Nothing on
 *   any map; the conn view sees it under the step.
 * - **The lamps.** Two rims, one rule (`rimLamps`): a rank a side at its
 *   own start and pitch, every mark at 0.84 of the slab's half-beam and
 *   0.55 of the can's radius. The shield: starboard five from +34 at 8 m,
 *   port four from +30 at 9 m, 1.4 m plates lying flat on the slab's top
 *   face at y 4.4 outboard of the lower tier — z 14.6 at +34, 22.7 at +3.
 *   The tail: starboard four from −14 at 9 m, port two from −16 at 18 m,
 *   1.1 m plates on the cans' shoulder facets, tilted 26° on the first
 *   can's fourteen plates and 45° on the second's twelve. Fifteen lamps,
 *   no two opposite. Nothing else is lit: not the cells (§3.2 rule 4), not
 *   the gun, not the keel, no bow lamp, and nothing astern.
 *
 * WHAT THE BLOCK DID NOT SAY — decided here:
 *
 * - **The slab carries the dome.** The Directorate's shield is an
 *   ellipsoid 21 m deep; a Klaxon slab is 7 m deep between its bevels and
 *   the "domed" is two tiers stepped up it, 2.5 m each, the whole 13.6 m
 *   from the belly at −4.3 to the upper tier at 9.3, the plan stepping 54
 *   to 42 to 26 m across. The slab's outline is a chamfered shield, 14 m
 *   across at the nose at +42 and 46 at the trailing edge at −11, where the
 *   first can emerges 12 m across: "steps down sharply", in plate.
 * - **The cans narrow by a metre a seam.** 6, 5, 4 m; the Directorate's
 *   tail is 11 to 6.5 of half-beam. Each can's crown rivets pitch 2.4 on
 *   the first and 1.7 on the other two, so no rivet lands inside the
 *   wider cap behind it.
 * - **The stripe runs between the ranks.** A 16 m hazard stripe down the
 *   upper tier from 0 to +16 at z −0.5, between the two ranks, and the bow
 *   stripe on the bow block: cladding, not lamps.
 * - **The stack is to port aft**, on the lower tier at (−6, −16), 5 m tall.
 *
 * The light budget, measured (`lightAudit`, printed by `exportGlb`):
 * fifteen lit parts, 25.0 m² facing up — the shield's nine at 1.88 to
 * 2.25 m² each as the chart's four cells a metre read a 1.4 m square, the
 * tail's six at 1.0 to 1.25 on their facets — no lamp hidden, none
 * floating, on a plan of 12,671 mask pixels at 2 px/m, some 3,170 m²
 * (the Directorate's 12,563). The intake bake at 105 m reads raw E 7.37
 * against the target E(16) = 1.41 and dims by ×0.191; the calibrated bake
 * (tools/hull-maps/build.mjs, 4 px/m) reads raw 7.60 and ×0.186: the
 * Verger's band (×0.195 at E(14)) and twelve times clear of the ×1/64
 * floor the quiet end must not touch (§3.2). Five materials; 226 parts, 5,404 triangles;
 * the file spans x −52.5 .. 52.5, y −10.1 .. 17.1, z −32.1 .. 35.1.
 *
 * The sweep (contacts.mjs) reads 262 pairs and every one a mount: the
 * tiers on the slab and each other, the first can and its fore cap
 * emerging through the slab's trailing face, the cans and caps crossing
 * at the seams, the crown rivets on their cans, the keel and its four
 * forward hoops in the slab's belly and the rest in the cans, the whips
 * through their brackets into the slab, the hips in the belly and each
 * bone rooted into the block at both ends, the collars in the upper
 * tier with the well, the pin and the lugs in each and the wheel and hub
 * on each lid, the mount on the lower tier and the barrel's breech in the
 * mount, the fittings on their plates.
 * Two tail lamps, `tail_lamp_s1` at −23 and `tail_lamp_p1` at −34, lie on
 * their cans at the kind's stations with an edge 5 cm into the cap face
 * behind them, which the sweep lists; the two patches that first lay under
 * the upper tier's edge moved out to (27.5, −13) and (31, 15.5).
 *
 * FACETS. Every ring asks the Klaxon's rule (bathyarch.mjs `cut`): the
 * cans and their caps fourteen, twelve and ten; the collars, lids and
 * wells eight — the well takes its collar's count, as a cap takes its
 * can's, where the rule read at the bore says six; the keel eight and its
 * hoops ten by six; the ram eight; the shroud, hub, whips, gun, pins,
 * wheels, hubs and hatches six. facets.mjs names the drums laid off Y by
 * their length as a radius, as the Verger's are named, and the counts it
 * reads are the rule's.
 *
 * PANELS. The Klaxon's band for a hull is 0.75–2 m on a side, the median
 * unlit part from above (bathyarch.mjs `panels`): this file reads 1.00 m
 * over 157 parts, the lugs and rivets at 0.6–0.9 and the patches, hatches
 * and seams at 1.2–1.7 either side of it.
 *
 * Coordinate tables below are laid out as tables on purpose; `tools/**\/*.mjs`
 * is outside the repo's Prettier scope (package.json) precisely so they can be.
 */
import { THREE, add, box, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

/** The design length (UNIT_STATS Thurible hullLengthM, silhouettes.ts). Drawn at it. */
const L = 105;
const BOW = L / 2;
const STERN = -L / 2;
// The Klaxon's facet rule for a hull drawn in metres (bathyarch.mjs `cut`, #919).
const cut = bathyarch.cut();

const black = bathyarch.ink.hullBlack();
const grey = bathyarch.ink.ironGrey();
const rust = bathyarch.ink.oxideRust();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();

const root = new THREE.Group();
root.name = 'consortium_thurible';
const bar = (name, mat, size, t, e) => add(root, name, box(...size), mat, t, e);

// The shield: the slab's plan, 54 m across, its nose at +42 and its
// trailing edge at −11, where the tail's first can emerges; two tiers
// stepped up it, the lower in newer grey plate and the upper the older
// black showing through.
const SLAB = [[42, 7], [32, 20], [18, 27], [-4, 27], [-11, 23], [-11, -23], [-4, -27], [18, -27], [32, -20], [42, -7]];
const TIER_1 = [[34, 6], [28, 15], [14, 21], [-4, 21], [-9, 18], [-9, -18], [-4, -21], [14, -21], [28, -15], [34, -6]];
const TIER_2 = [[29, 9], [25, 13], [-6, 13], [-11, 10], [-11, -10], [-6, -13], [25, -13], [29, -9]];
const SLAB_DEPTH = 7;
const BEVEL = 0.8;
const SLAB_TOP = SLAB_DEPTH / 2 + BEVEL; // 4.3
const SLAB_BOTTOM = -SLAB_TOP;
const TIER_DEPTH = 2.5;
const TIER_1_TOP = SLAB_TOP + TIER_DEPTH; // 6.8
const TIER_2_TOP = TIER_1_TOP + TIER_DEPTH; // 9.3
bathyarch.armouredSlab(root, { black, grey }, {
  slab: { outline: SLAB, depth: SLAB_DEPTH, bevel: BEVEL, y: 0 },
  tiers: [
    { outline: TIER_1, depth: TIER_DEPTH, y: SLAB_TOP + TIER_DEPTH / 2 },
    { outline: TIER_2, depth: TIER_DEPTH, y: TIER_1_TOP + TIER_DEPTH / 2, mat: 'black' },
  ],
});
/** The slab's half-beam at a station: its top face's outline, and the straight flank a bevel out. */
const rim = (x) => bathyarch.planHalfBeam(SLAB, x);
const flank = (x) => rim(x) + BEVEL;

// The tail, stern first in the stepping: three cans stepping down from
// the slab's trailing edge, each capped fore and aft in older plate with
// the caps crossing at the seams, five crown rivets each.
const CANS = [
  { mat: black, x: -17.5, r: 6, length: 13, pitch: 2.4 },
  { mat: grey, x: -29.5, r: 5, length: 11, pitch: 1.7 },
  { mat: black, x: -40.5, r: 4, length: 11, pitch: 1.7 },
];
bathyarch.cans(
  root,
  { rust, grey },
  {
    cans: CANS,
    cap: { length: 2, tip: 0.85, proud: 0.5 },
    rivet: { size: [0.8, 0.45, 0.8], proud: 0.2 },
    cut,
  }
);

// The rostrum: a bow block set 0.2 m into the slab's nose, the hazard
// stripe on its top, and the ram to the bow at +52.5. The telson: a stern
// block set into the last can's aft cap and the screw in its shroud, both
// after faces at −52.5, nothing on it lit.
bar('bow_block', black, [4.4, 6, 10], [44, 0, 0]);
bar('hazard_stripe', amber, [3.2, 0.3, 1.2], [44, 3.15, 0]);
bathyarch.ramCone(root, grey, { r: 2.8, length: 6.3, at: [BOW - 3.15, 0, 0], cut });
bar('stern_block', black, [2.6, 5, 5], [-48.3, 0, 0]);
bathyarch.tailScrew(
  root,
  { grey, black },
  { at: [STERN + 1.45, -0.3, 0], shroud: { r: 2.4, length: 2.9 }, hub: { r: 0.8, length: 2.9 }, cut }
);

// The ribbed pressure keel: a drum 64 m under all of it from +25 to −39,
// sunk a metre into the slab's belly, seven hoop frames round it.
bathyarch.ribbedKeel(root, { keel: black, rib: rust }, {
  x: -7,
  y: -6.5,
  radii: [3.2, 2.4],
  length: 64,
  ribs: { count: 7, t: 0.35, proud: 0.25, inset: 3 },
  cut,
});

// Four whip aerials off the slab's rim at the kind's stations, none
// opposite another: rooted in the flank at y 1 on a bracket, canted 60°
// outboard, raked 0.25 forward.
bathyarch.rimWhips(root, { whip: grey, bracket: rust }, {
  rim: (x) => flank(x),
  whips: [
    { side: 's', x: 30, length: 8 },
    { side: 'p', x: 24, length: 9 },
    { side: 's', x: 4, length: 9 },
    { side: 'p', x: -8, length: 8 },
  ],
  y: 1,
  r: [0.55, 0.2],
  rake: -0.25,
  cant: 1.05,
  sink: 0.8,
  bracket: { size: [1.6, 1.8, 1.4], sink: 0.5 },
  cut,
});

// Four limbs a side folded under the shield at the kind's stations, each
// on a hip bracket hung from the slab's belly, the thigh swept 0.6 forward
// and the shin folded on to 1.1; the hips set so the tips land where the
// Directorate's do against the rim — the forward pair's 3.5 m past it,
// the next 1.7, the after two 0.6 and 0.1 inside it.
const THIGH = { length: 4.5, sweep: 0.6, section: [1.0, 0.9], root: 0.3 };
const SHIN = { length: 3.5, sweep: 1.1 };
const LIMB_Y = -6;
const reachZ = THIGH.length * Math.cos(THIGH.sweep) + SHIN.length * Math.cos(SHIN.sweep);
const reachX = THIGH.length * Math.sin(THIGH.sweep) + SHIN.length * Math.sin(SHIN.sweep);
const LIMBS = [
  [33, 3.5],
  [23, 1.7],
  [13, -0.6],
  [3, -0.1],
].map(([x, past]) => ({ x, z: flank(x + reachX) + past - reachZ }));
bathyarch.foldedLimbs(root, { bracket: rust, girder: grey, block: black }, {
  limbs: LIMBS,
  y: LIMB_Y,
  under: SLAB_BOTTOM,
  sink: 0.3,
  hip: { size: [1.6, 1.4] },
  thigh: THIGH,
  knee: { size: [1.4, 1.2, 1.4] },
  shin: SHIN,
  tip: { size: [1.2, 1.0, 1.2] },
});

// "One small spine-gun off the centreline ahead of the rack": 5.5 m to
// port on the lower tier at +31, the muzzle at +39. A six-plate barrel's
// underside is a flat 0.52 m under its axis, so the axis sits 0.2 m over
// the mount's top and the breech's flat 0.32 m into the mount (the
// Chorister's sinks 0.4); at a radius over the top it floated 8 cm.
const MOUNT_TOP = TIER_1_TOP + 1.6;
bathyarch.spineGun(
  root,
  { grey, black },
  {
    mount: { size: [3, 1.6, 3], at: [31, TIER_1_TOP + 0.8, -5.5] },
    gun: { radii: [0.45, 0.6], length: 8, at: [35, MOUNT_TOP + 0.2, -5.5] },
    cut,
  }
);

// The charge rack: seven cells in two ranks on the upper tier, the
// starboard rank of four at +6.5 and the port rank of three at −7.5 a
// half pitch aft of it.
bathyarch.chargeCans(root, { collar: grey, well: black, lid: grey, pin: black, wheel: grey, hub: rust, lug: rust }, {
  on: 'armour_tier_2',
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
});

// The box stack on the lower tier, to port aft.
bar('stack', black, [2.2, 5, 2.2], [-6, TIER_1_TOP + 2.5, -16]);

// The light: rows of amber lamps along the shield's rim on the slab's top
// face outboard of the tiers, and down the tail on the cans' shoulders,
// in a pattern that repeats on neither side.
bathyarch.rimLamps(root, lampM, {
  name: 'rim_lamp',
  rim,
  on: 'hull_slab',
  ranks: {
    s: { from: 34, pitch: 8, count: 5 },
    p: { from: 30, pitch: 9, count: 4 },
  },
  at: 0.84,
  size: 1.4,
  h: 0.4,
  sink: 0.1,
});
bathyarch.rimLamps(root, lampM, {
  name: 'tail_lamp',
  rim: (x) => CANS.find((c) => Math.abs(x - c.x) <= c.length / 2)?.r ?? 0,
  on: ['can_0', 'can_1', 'can_2'],
  ranks: {
    s: { from: -14, pitch: 9, count: 4 },
    p: { from: -16, pitch: 18, count: 2 },
  },
  at: 0.55,
  size: 1.1,
  h: 0.4,
  sink: 0.1,
});

// PANELS: the tiers dressed to the band. The hazard stripe down the
// upper tier between the ranks; dogged hatches; plates of the other
// finishes; seams; rivet rows along each tier's edge.
bar('deck_stripe', amber, [16, 0.3, 1.2], [8, TIER_2_TOP + 0.15, -0.5]);
bathyarch.deckHatches(
  root,
  { hatch: grey, wheel: rust },
  {
    on: 'armour_tier_2',
    r: 0.9,
    h: 0.35,
    wheel: { R: 0.45, t: 0.07 },
    hatches: [
      ['deck_hatch_a', [-4, -0.5]],
      ['deck_hatch_f', [22, -0.5]],
    ],
    cut,
  }
);
bathyarch.deckHatches(
  root,
  { hatch: black, wheel: rust },
  {
    on: 'armour_tier_1',
    r: 0.9,
    h: 0.35,
    wheel: { R: 0.45, t: 0.07 },
    hatches: [
      ['tier_hatch_s', [6, 17]],
      ['tier_hatch_p', [20, -16.5]],
    ],
    cut,
  }
);
const patches = (on, mats, plates) => bathyarch.deckPlates(root, mats, { on, t: 0.25, plates });
patches('armour_tier_1', { black, rust }, [
  ['tier_patch_0', 'black', [2.0, 1.4], [-2, 17]],
  ['tier_patch_1', 'rust', [1.8, 1.2], [12, 17.5]],
  ['tier_patch_2', 'rust', [2.0, 1.2], [27.5, -13]],
  ['tier_patch_3', 'black', [1.6, 1.2], [8, -17.5]],
  ['tier_patch_4', 'rust', [1.6, 1.0], [-5, -18]],
  ['tier_patch_5', 'black', [1.8, 1.2], [20, 16.5]],
]);
patches('armour_tier_2', { grey, rust }, [
  ['deck_patch_0', 'rust', [1.8, 1.2], [-6, -1.5]],
  ['deck_patch_1', 'grey', [1.6, 1.2], [14, 1.2]],
  ['deck_patch_2', 'rust', [1.6, 1.0], [27, 0.5]],
]);
patches('hull_slab', { grey, rust }, [
  ['slab_patch_0', 'grey', [2.0, 1.4], [31, 15.5]],
  ['slab_patch_1', 'rust', [2.0, 1.2], [8, -24.5]],
  ['slab_patch_2', 'rust', [1.8, 1.2], [-8, 21]],
]);
bathyarch.plateSeams(root, rust, {
  on: 'armour_tier_1',
  name: 'tier_seam_s',
  stations: [16, -6],
  z: 17.5,
  length: 5,
  w: 0.4,
  h: 0.25,
});
bathyarch.plateSeams(root, rust, {
  on: 'armour_tier_1',
  name: 'tier_seam_p',
  stations: [2, 14],
  z: -17.5,
  length: 5,
  w: 0.4,
  h: 0.25,
});
const stations = (from, to, pitch) => {
  const out = [];
  for (let x = from; x <= to + 1e-9; x += pitch) out.push(x);
  return out;
};
bathyarch.flankRivets(root, grey, {
  name: 'tier_rivet',
  size: [0.8, 0.5, 0.8],
  running: true,
  rows: [
    { side: 's', z: 20.2, y: TIER_1_TOP, stations: stations(-2, 14, 4) },
    { side: 'p', z: -20.2, y: TIER_1_TOP, stations: stations(0, 12, 4) },
    { side: 's', z: 12.2, y: TIER_2_TOP, stations: stations(-4, 24, 4) },
    { side: 'p', z: -12.2, y: TIER_2_TOP, stations: stations(-2, 22, 4) },
  ],
});

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'thurible-bathyarch.glb', { trim: bathyarch.TRIM });
