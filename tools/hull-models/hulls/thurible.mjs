/**
 * The Thurible — the Directorate's ordnance hull, 105 m (docs/units.md,
 * "The ordnance hulls"; the Thurible block of docs/asset-prompts-3d.md
 * Block 3).
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
 * Built rather than ported (docs/models-plan.md §3.1), the third
 * Directorate hull after the Verger and the Acolyte to be so. Metre-true
 * at 105 m, the rostrum's point at +52.5 and the telson's base at −52.5,
 * nothing to rescale. It carries no faction lock (§3.4): this file is the
 * kind's only model and serves every navy recoloured. The horseshoe crab
 * is the plan's *shape* — a shield, a tail, a spike — and nothing here is
 * an animal (docs/bestiary.md §3): it is six tergites, two of them large.
 *
 * The body is the navy's segment series drawn at two scales. Four small
 * plates make the abdomen, violet and red by turns from the stern, each
 * with the Dredge's raised trailing *ridge* rather than the Foundry hulls'
 * sunk seam — the Slipway's heavier carapace, and on a series whose plates
 * grow toward the bow the ridge is the only lip that shows: each plate's
 * ridge stands out of the smaller plate behind it as a dark band, which is
 * what "jointed" looks like at 4 px/m. Then two large plates make the
 * shield: an aft plate 30 m long and 50 m wide, and over its forward half
 * a fore plate 50 m long and 54 m wide, domed 10.5 m, with no lip between
 * them, so the two read as one carapace with a crease where the aft plate
 * emerges. The aft plate's ridge is the shield's trailing lip, drawn 0.8
 * of the plate's height rather than the Dredge's 1.125 so it stays under
 * the dome behind it; at its own station, x = −9, it is 23 m of half-beam
 * where the plate has drawn in to 16.5, and the abdomen behind it is 11 —
 * that flare and drop, over four metres of length, is the "steps down
 * sharply" of the block, and it gives the shield the corners a horseshoe
 * crab's has at its trailing edge.
 *
 * WHAT THE BLOCK DID NOT SAY — decided here:
 *
 * - **How many cells, and where the two ranks lie.** The block gives the
 *   rack no count — the stat is a cooldown, not a magazine. Seven: four in
 *   a starboard rank at z = +6.5 and three in a port rank at z = −7.5,
 *   both on a 10 m pitch and the port rank half a pitch aft of the
 *   starboard, so no cell answers another across the keel. Each is a 5.6 m
 *   well (`chargeRack`, the module) standing 2.2 m proud of the crown it
 *   is let into, a black floor 1.2 m down the bore — and a metre *above*
 *   the crown, because a floor let into a dome is a floor the dome's own
 *   slope shows through on the uphill side, which the first run drew — and
 *   a steel lid hinged at its aft edge standing 77° open, forward and
 *   upward, so that from above every cell is a ring, a dark bore and a bar
 *   behind it, and the seven of them are the count. The cells step down the dome with it: the
 *   forward ones are let in at y = 10, the aftmost at 7.3.
 * - **Which lip.** The block says "jointed" of the abdomen and "steps down
 *   sharply" of the shield, and the Dredge's ridge does both where the
 *   Precentor's seam does neither on a series that grows toward the bow
 *   (above). The fore shield plate carries no lip: a seam at its nose would
 *   be a collar 24 m wide on a nose 14 m wide, and a ridge across its
 *   after end would be a rib across the shield's back.
 * - **Where the gun is.** "Off the centreline ahead of the rack": 5.5 m to
 *   port at x = +35 on the shield's forward slope, the muzzle at +39 and
 *   the breech seated at +31 — ahead of the port rank's leading cell by
 *   twelve metres, and the fourth thing in the port line where the
 *   starboard has four cells. The barrel is horizontal, the Chorister's
 *   taper, and stands clear of the nose slope by 3 m at the muzzle.
 * - **The spines are off the rim, not the back.** Four, black, 8 and 9 m,
 *   rooted 0.8 m into the shell's flank at y = 1 and canted 60° outboard,
 *   raked 0.25 forward (`rimSpines`): starboard at +30 and +4, port at +24
 *   and −8 — the last off the trailing lip's corner. Canted, because a
 *   spine standing off a crown reads from above as a dot and a spine lying
 *   out past the rim reads as a spike in plan; the outline this generates
 *   carries four spikes at four stations, none opposite another (§3.6). No
 *   dorsal rank: the block puts the spines on the rim and the rack on the
 *   back, and the back has no room for both.
 * - **Four limbs a side, folded under the shield.** The block says "folded
 *   walking limbs" and no count; a shield 54 m across wants more than the
 *   Chorister's three. `limbs` — the Chorister's and the Precentor's
 *   folded steel ranks, laid athwartships and swept forward by the fold,
 *   which the module lets match because they carry no light — centred at
 *   +33, +23, +13 and +3, each rooted 0.8 m into the flank at y = −6
 *   where the shell actually is there (16 m of half-beam at the first
 *   station, 22 at the second, which is why the builder now takes `rim`),
 *   8 m long and folded 0.6, so the tips stand 5.8 m out from the flank
 *   and at the rim's line or a metre past it: under the rim, where the conn
 *   view sees them and the chart barely does. The plan's `walkingLimbs` is
 *   the Submersible's box-and-claw builder in that export's own frame; a
 *   hull in the Chorister's family carries the Chorister's limb.
 * - **The keel and its ribs.** A black seven-sided spar 64 m long from +25
 *   to −39, 3.6 m forward to 2.6 aft, its axis at −6.8 so its bottom runs
 *   just under the shield's belly and 6 m under the tail's; seven steel
 *   hoops along it (`keel`'s `ribs`) are the "ribbed". Nothing on any
 *   map; the conn view sees it under the step.
 * - **The photophores.** Two rims, one rule (`rimPhotophores`): a rank a
 *   side at its own start and pitch, every mark seated on the shell at
 *   0.84 of the rim's half-beam and laid on the shell's own slope — 25° to
 *   30° on the shield, where a flat mark buried its uphill corner. The
 *   shield: starboard five from +34 at 8 m, port four from +30 at 9 m,
 *   1.4 m marks. The abdomen: starboard
 *   four from −14 at 9 m, port two from −16 at 18 m, 1.1 m marks. Fifteen
 *   lamps, no two opposite, the ranks keeping clear of the ridge stations
 *   and of the crease at x ≈ 7 where the aft shield plate's flank passes
 *   outside the fore plate's — a mark on that line bakes half under the
 *   plate that emerges through it, which the first run showed. Nothing
 *   else is lit: not the cells (§3.2 rule 4), not the gun, not the keel,
 *   and nothing astern.
 *
 * The light budget, measured (`lightAudit`, printed by `exportGlb`):
 * fifteen lit parts, the rim marks, 25.9 m² facing up on a plan of
 * 12,563 mask pixels at 2 px/m, some 3,140 m² — and the bake at
 * E(16) = 1.41 reads raw E = 6.26 and dims by ×0.224: in the Verger's
 * band (×0.195 at E(14)) and fourteen times clear of the ×1/64 floor the
 * quiet end must not touch (§3.2). Marks 1.4 m square on the shield and
 * 1.1 on the tail, the two scales again, and nothing larger anywhere,
 * because "dim" is the block's first word for the light.
 *
 * The hand-drawn outline this model retires (silhouettes.ts, "a shield
 * over a tail … stays narrower at the rostrum than at the waist, which
 * keeps the Sower's leaf its own") drew the shield 29 m of half-beam at
 * x = +21 and parallel back to +4, the step at −4 to −8, and the tail
 * 12 m to 8 m. The model's shield is 27 m at +19, 25 at +2, 21.6 at −5.5,
 * 23 at the lip at −9 and 11 at −13; the tail scallops 11 to 6.5 at the
 * ridges; and the rim spines and the rostrum's collar-less
 * nose keep it narrower at the rostrum than at the waist, which is the
 * plan §3.6 says an asymmetric hull generates as drawn.
 *
 * Every part comes from `factions/directorate.mjs`. `chargeRack`,
 * `rimSpines` and `rimPhotophores`, the `ridge` and `first` options on
 * `tergites`, `lift` on the crown and flank, `ribs` on `keel`, `rim` on
 * `limbs` and a spot's own rotation in `photophores` were written for this
 * hull and run here for the first time; every default is the older hulls'
 * own, and `check.mjs` holds them to their files.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 105;
const BOW = L / 2;
const STERN = -L / 2;

/**
 * The abdomen, stern first: `[x, half-length, half-height, half-beam]`,
 * the scales the orbs are drawn at (hulls/precentor.mjs). Four plates
 * growing toward the bow, each overlapping the one ahead by about half a
 * half-length; height 0.44–0.46 of the beam, a little rounder than the
 * Dredge's 0.4, because a tail is a pressure body and not a shovel.
 */
const ABDOMEN = [
  [-40, 6, 3.0, 6.5],
  [-32, 7, 3.6, 8],
  [-23, 7.5, 4.2, 9.5],
  [-13, 8, 4.8, 11],
];

/**
 * The shield, stern first: the aft plate short and wide, the fore plate
 * the dome. Height 0.36–0.39 of the beam — the Dredge's flatness, a
 * shield and not a hold.
 */
const SHIELD = [
  [2, 15, 9, 25],
  [19, 25, 10.5, 27],
];

/** The abdomen's lip: the Dredge's ridge exactly (`tergites`' default). */
const RIDGE = { at: -0.75, size: [0.25, 1.125, 0.92], lift: 0.5 };
/** The shield's trailing lip: the same orb, 0.8 of the plate's height (the header). */
const LIP = { at: -0.75, size: [0.18, 0.8, 0.92], lift: 0.5 };

/** Where the shell's crown is at `(x, z)`, every series and lip included. */
const crown = (x, z) =>
  Math.max(
    directorate.tergiteCrown(ABDOMEN, x, z, RIDGE),
    directorate.tergiteCrown(SHIELD, x, z, null),
    directorate.tergiteCrown([SHIELD[0]], x, z, LIP)
  );
/** Where the shell's flank is at `(x, y)`, the same way. */
const rim = (x, y) =>
  Math.max(
    directorate.tergiteFlank(ABDOMEN, x, y, RIDGE),
    directorate.tergiteFlank(SHIELD, x, y, null),
    directorate.tergiteFlank([SHIELD[0]], x, y, LIP)
  );

const violet = directorate.ink.chitinViolet();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson();

const root = new THREE.Group();
root.name = 'directorate_thurible';

// The body, in three calls that number as one series: the four tail
// plates with the Dredge's ridge, the aft shield plate with the lower lip,
// the fore shield plate with none. Violet, red, violet, red, violet, red
// from the stern.
directorate.tergites(root, { violet, red, black }, { segments: ABDOMEN, lip: 'ridge' });
directorate.tergites(root, { violet, red, black }, {
  segments: [SHIELD[0]],
  lip: 'ridge',
  ridge: LIP,
  first: 4,
});
directorate.tergites(root, { violet, red, black }, { segments: [SHIELD[1]], lip: 'none', first: 5 });

// The rostrum's point is the bow at +52.5; its base is 13 m aft, inside
// the shield's nose, so the last 8.5 m of it show. The telson's base ring
// is the stern at −52.5, its apex buried 10 m forward in the last plate.
directorate.rostrum(root, red, { tip: BOW, r: 3.4, length: 13 });
directorate.telson(root, { violet, black }, { tip: STERN, r: 2.6, length: 10 });

// Four spines off the shield's rim at different stations each side (the
// header): rooted at y = 1 in the flank, canted 1.05 outboard, raked 0.25
// forward. `rimSpines` refuses a mirrored pair; this rank never offers one.
directorate.rimSpines(root, black, {
  rim,
  spines: [
    { side: 's', x: 30, length: 8 },
    { side: 'p', x: 24, length: 9 },
    { side: 's', x: 4, length: 9 },
    { side: 'p', x: -8, length: 8 },
  ],
  r: 0.9,
  rake: -0.25,
  cant: 1.05,
  sink: 0.8,
});

// The walking limbs, folded under the shield's flanks: four a side, each
// rooted 0.8 m into the flank at y = −6 where the shell is (`rim`), 8 m
// long, tapering 0.8 to 0.55, folded 0.6 forward — the tips at the rim
// and under it. The one place the navy allows a pair (`limbs`).
directorate.limbs(root, steel, {
  xs: [33, 23, 13, 3],
  y: -6,
  rim,
  sink: 0.8,
  r: [0.8, 0.55],
  length: 8,
  fold: 0.6,
});

// "One small spine-gun off the centreline ahead of the rack": 5.5 m to
// port on the forward slope, the breech seated on the shell at +31 and the
// muzzle 3 m clear of it at +39, the Chorister's taper.
directorate.spineGun(
  root,
  { steel, black },
  { x: 35, y: crown(31, -5.5) + 0.4, z: -5.5, r: [0.6, 0.45], length: 8, mount: { x: 31 } }
);

// The charge rack: seven cells in two ranks on the shield's back, the
// starboard rank of four at +6.5 and the port rank of three at −7.5 a half
// pitch aft of it, each seated on the crown where it is (the header).
directorate.chargeRack(root, { steel, black }, {
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
});

// The ribbed pressure keel: a black spar 64 m under all of it, 3.6 m
// forward to 2.6 aft and squashed 0.8 across, with seven steel hoops.
directorate.keel(root, black, {
  x: -7,
  y: -6.8,
  radii: [3.6, 2.6],
  length: 64,
  ribs: { count: 7, mat: steel, tube: 0.35, proud: 0.25, inset: 3 },
});

// "Rows of photophores along the shield's rim and down the abdomen in a
// pattern that repeats on neither side": two rims, one rule, fifteen
// marks, each seated on the shell at 0.84 of the rim's half-beam (the
// header). `photophores` under it refuses a mirrored pair.
directorate.rimPhotophores(root, crimson, {
  rim,
  crown,
  name: 'photophore_rim',
  ranks: {
    s: { from: 34, pitch: 8, count: 5 },
    p: { from: 30, pitch: 9, count: 4 },
  },
  at: 0.84,
  size: 1.4,
});
directorate.rimPhotophores(root, crimson, {
  rim,
  crown,
  name: 'photophore_tail',
  ranks: {
    s: { from: -14, pitch: 9, count: 4 },
    p: { from: -16, pitch: 18, count: 2 },
  },
  at: 0.7,
  size: 1.1,
});

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'thurible-directorate.glb');
