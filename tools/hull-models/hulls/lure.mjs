/**
 * The Lure — the Directorate's siege hull, 100 m (docs/units.md, "The
 * siege hulls"; the Lure block of docs/asset-prompts-3d.md Block 3).
 *
 * "The song, 100 m — a PR-3 hull that sings for 60 s and doubles what
 * fauna hear from anything within 500 m of the point it sang at: the
 * Listening does not knock the wall down, it tells the Drift where the
 * wall is (SIG 14 idle, 24 cruise, 55 singing; no weapon; HYD 60; 560
 * hull; 40 m/s; 280 nodules and 50 Biomass). A segmented deep body,
 * ribbed and domed like the Verger's — a rostrum, three overlapping
 * tergites, a jointed abdomen, folded walking limbs, a ribbed pressure
 * keel — with the abdomen's last segment spread into a sounding fan: five
 * chitin plates opened wide astern, two a side about a telson, a file
 * ridge down the abdomen's back with a plectrum limb raised over it, and
 * a resonating bladder in the abdomen forward of the fan, showing through
 * the segment as a paler dome. The fan is an instrument and not a weapon
 * — nothing on it points and nothing on it fires — and the plan is a
 * rostrum forward and a fan astern, widest at the stern, where the sound
 * leaves it. The model is the hull with its fan spread and the plectrum
 * raised, which is the state it sings in; under way the plates fold into
 * a telson and the limb lies flat. Nearly black at rest, photophores in a
 * pattern that repeats on neither side; under way a dim row along each
 * tergite's edge; singing, sustained glow — the bladder's dome lit
 * through the shell and each plate of the fan lit along its rib — because
 * the song is the loudest thing this hull does, and it is still a band
 * short of a cutter."
 *
 * Built rather than ported (docs/models-plan.md §3.1), the fourth
 * Directorate hull after the Verger, the Acolyte and the Thurible to be
 * so, and built in a state (§3.5): the fan is spread and the plectrum is
 * raised. Metre-true at 100 m, the rostrum's point at +50 and the
 * telson's squared end at −50, nothing to rescale. It carries no faction
 * lock (§3.4): this file is the kind's only model and serves every navy
 * recoloured. A lobster's tail fan is the plan's *shape* — a telson and
 * two uropods a side — and nothing here is an animal (docs/bestiary.md
 * §3): it is seven tergites and five plates.
 *
 * The body is the navy's segment series drawn at two scales with two
 * lips. Three large plates make the carapace, 34 m across at the middle
 * one and 0.6 of the beam tall, each with the Verger's seam — the
 * Precentor's rule, 0.72 of the *half-beam* tall (`tallOf: 'beam'`), so
 * the seam stands proud of its plate above and below as a rib — which is
 * what "ribbed and domed like the Verger's" is, and the same rule the
 * Verger's approved plates carry. Four small plates make the abdomen,
 * violet and red by turns from the stern, growing toward the bow with
 * the Dredge's raised trailing *ridge*: on a series whose plates grow
 * toward the bow the ridge is the only lip that shows (hulls/thurible.mjs
 * says why), and each plate's ridge standing out of the smaller plate
 * behind it as a dark band is what "jointed" looks like at 4 px/m. The
 * carapace's aft plate tucks into the abdomen's first over four metres,
 * 15 m of half-beam to 10, and the fan's root is the abdomen's last
 * plate, 11 m across.
 *
 * WHAT THE BLOCK DID NOT SAY — decided here:
 *
 * - **What the five plates are, and how wide.** "Five chitin plates
 *   opened wide astern, two a side about a telson" is a lobster's tail
 *   fan: the telson the middle plate, two uropods a side. So the telson
 *   is a plate here and not `telson`'s cone — the block says the plates
 *   fold "into a telson" under way, and a telson that is the fan's middle
 *   plate is what they fold into. Each is a broad paddle with a squared
 *   end (`soundingFan`, the module; the outline note's own phrase), 0.7 m
 *   of chitin with a 0.35 m chamfer all round: the telson 17.65 m on the
 *   keel line, 4 m wide at the root and 6.8 at the end; the inner pair
 *   17 m at 24° off the keel from 2.2 m either side of it; the outer pair
 *   20 m at 60° from 3.6 m, a metre further forward and half a metre
 *   lower, so the three ranks stack at the root — telson over inner over
 *   outer, as a fan's leaves do — and clear each other beyond it. Red,
 *   violet, red from the telson. The outer plates' squared corners stand
 *   23.8 m off the keel at x = −37: 47.6 m across, 14 m wider than the
 *   carapace, which is "widest at the stern" by a margin the chart can
 *   read. The pairs are matched, and matched on purpose: "two a side
 *   about a telson" is the block's own count, and an instrument is tuned
 *   symmetric. They are one of the hull's two licensed pairs, the folded
 *   `limbs` the other (below), each with its own warrant. §3.6 governs
 *   *how* an asymmetry is composed — one part at a time at its own
 *   signed z, never through `bothSides` — and the fan is composed that
 *   way: each plate placed on its own side at its own yaw, a matched
 *   result and not a mirrored call.
 * - **The ribs are clad, not lit.** "Each plate of the fan lit along its
 *   rib" is the singing band and this pipeline draws the resting one
 *   (§3.2, rule 2), so each plate carries its rib — 0.7 m wide, 0.4 tall,
 *   0.08 to 0.92 of the plate's length — in the lamp family's unlit
 *   finish, `biolight_unlit`, as the Verger's bay doors do, and no lamp.
 * - **Where the file is, and what it rides over.** "A file ridge down the
 *   abdomen's back": one black fin (`fileRidge`, the module) a metre to
 *   *starboard* of the keel line from x = −10 to −22, twelve teeth 0.8 m
 *   tall on a crest sloping from 5.6 to 4.6 with the abdomen, each tooth's
 *   point 0.3 of the pitch back from its forward foot so the rank leans
 *   as the navy's spines do. Its underside follows the shell and its
 *   crest does not: it is rooted in every plate and both joints it
 *   crosses and rides over them, 0.3 m clear at the closest. That is why
 *   the abdomen's ridge is drawn at 1.0 of the plate's height rather than
 *   the Dredge's 1.125 — the joint shows as a half-metre step and the file
 *   clears it; at 1.125 the crest would have to stand a metre higher for
 *   the whole run. Off the keel line because nothing here is centred,
 *   and to starboard so the limb has to reach across for it.
 * - **The plectrum limb, and which way it is raised.** One limb
 *   (`plectrumLimb`, the module), rooted 0.6 m into the *port* flank of
 *   the abdomen's biggest plate at x = −11, y = 1.5, where `rim` finds
 *   the shell at 9.1 m; a steel femur 10 m up and inboard to a knee at
 *   (−13, 10.6, −4.5), level with the carapace's crown; a tibia 6 m aft
 *   and across the keel line to a wrist at (−16.5, 9.3, 0); and from the
 *   wrist the pick, a black four-sided cone 3 m long pressed to 0.3 of
 *   its width across the beam, aimed down and aft at the file's crest
 *   with its point 0.9 m clear of the teeth at (−17.6, 6.7, 1). Bones
 *   `plantedLimbs`' idiom, black orbs at the joints. Raised is the
 *   built state (§3.5); the limb crossing the keel from the side the file
 *   is not on is the hull's asymmetry made into a gesture.
 * - **Where the bladder shows, and in what.** "Forward of the fan": on the
 *   second abdomen plate, the red one, as a violet dome 8.4 m across
 *   standing 2.2 m proud of the plate's crown, 1.6 m to starboard of the
 *   keel — `bladderDome`, the Chorister's, violet on red. It carries no
 *   lamp (§3.2, rule 4: "lit through the shell" is the singing band and
 *   the dome is not a lamp at rest), and it is *not* clad in the unlit
 *   finish either, though #786's brief expected that: the block says
 *   "a paler dome" and `biolight_unlit` is near-black, so a dome in it
 *   would read as a hole in the shell where the block asks for a bulge
 *   that is lighter than its plate. Nor does the finish chosen meet the
 *   word: `chitin_violet` (#2D1B3D, luminance 0.017) is three times
 *   darker than the `chitin_red` plate (0.051) it sits on, and the
 *   recolour takes the albedo's luminance. The navy has no paler cladding
 *   token, and the Chorister's approved dome — the same violet on the same
 *   red — settled the call for the series; what the dome buys is value
 *   separation from its plate and 2.2 m of relief, not paleness.
 * - **What "a row along each tergite's edge" is.** The 16–35 band's own
 *   language is "dim running lights along the hull line", and a plate's
 *   edge on this series is its outboard rim. So: three rows a side, one a
 *   carapace plate (`edge_row_4..6`, through `rimPhotophores` with the
 *   unlit finish), each along the stretch of rim where that plate is the
 *   outermost thing — the fore plate's from +38 to +28, the middle's from
 *   +26 to +14, the aft's from +7 to −1 — seated on the shell at 0.93 of
 *   the half-beam and laid on its slope, 0.9 m marks at 4 m pitch, the
 *   port rank two metres behind the starboard on every plate and one
 *   mark shorter on the middle and aft plates. Eighteen dark studs,
 *   built and never lit (§3.2, rule 2); the block lights them under way.
 *   On the three carapace plates only: the block distinguishes "three
 *   overlapping tergites" from "a jointed abdomen", so "each tergite's
 *   edge" is the three, and the abdomen's four plates carry no row.
 * - **Three dorsal spines.** The block names none. The Chorister's, the
 *   Precentor's, the Verger's and the Acolyte's blocks name none either
 *   and all four carry a rank alternating sides — it is the navy's tell
 *   on the back, and hulls/acolyte.mjs says what a plate series without
 *   one reads as. Short: 5, 6.5 and 5.5 m from the bow, one a carapace
 *   plate, 3 m to port, 3.5 to starboard, 3.5 to port.
 * - **Three limbs a side, folded under the carapace.** The block says
 *   "folded walking limbs" and no count. `limbs` — the Chorister's and
 *   the Thurible's folded steel ranks, the hull's other licensed pair
 *   beside the fan's (above): the module lets these match because they
 *   carry no light, as the fan's plates carry none — centred at +30, +18
 *   and +6, each
 *   rooted 0.8 m into the flank at y = −5 where the shell is there (`rim`,
 *   as the Thurible seats its), 8 m long and folded 0.6, so the forward
 *   pair's tips stand 2 m inside the fore plate's rim and the other two
 *   pairs' 3 m past theirs, where the chart sees them as the Thurible's
 *   are seen. Under the carapace and not the abdomen: on a body with a
 *   tail fan the walking limbs are the carapace's.
 * - **The keel stops with the carapace.** A black seven-sided spar 36 m
 *   long from +31 to −5, 3.2 m forward to 2.6 aft, its axis at −9.4 so its
 *   bottom runs 2.5 m under the middle plate's belly; six steel hoops
 *   (`keel`'s `ribs`) are the "ribbed". Not under the abdomen: a straight
 *   spar under a tail that tapers from 4.4 m of half-height to 2.6 either
 *   floats free of it or is buried in the fan's root, and the Thurible's
 *   already hangs 6 m under its tail. Nothing on any map; the conn view
 *   sees it under the shell.
 * - **The photophores.** Ten, on the shell's *shoulders* rather than its
 *   rim — `rimPhotophores` at 0.7 of the half-beam, where a carapace round
 *   in section (0.6) slopes 30° as the Thurible's flatter shield does at
 *   0.84, and 0.84 here would be 45° — laid on the slope, 1.4 m marks on
 *   the carapace and 1.2 on the abdomen: starboard at +35, +20, +5 and
 *   −10.5, −17.5, on a 15 m pitch; port at +37, +18.5, 0 and −19, −27,
 *   on 18.5 — a different pitch, so the port rank is not the starboard
 *   one moved. No mark within 1.5 m of opposite another (the Thurible's
 *   tightest is 1 m; a first draft's port rank at +36.5, +19.5, +2.5 had
 *   one at half a metre, two pixels at 4 px/m), and the stations chosen
 *   to miss four things: the seam
 *   ribs, the ridge lips, the bladder's dome — which `crown` does not
 *   know, so a mark seated on the plate under it would sit *inside* it,
 *   which is why the starboard abdomen rank stops at −17.5 — and the
 *   plectrum limb's shadow: the first run seated a port mark at −13 under
 *   the femur, and the audit read it at 0.44 m² where its neighbours were
 *   1.25. Nothing else is lit: not the ribs, not the dome, not the file,
 *   and nothing on the fan.
 *
 * The light budget, measured (`lightAudit`, printed by `exportGlb`): ten
 * lit parts, the marks, 18.3 m² facing up — the carapace's six at 1.88 to
 * 2.25 m² each, the abdomen's four at 1.25 to 1.5 — on a plan of 10,198
 * mask pixels at 2 px/m, some 2,550 m². The bake at E(14) = 1.22 reads
 * raw E = 5.44 and dims by ×0.225: the Thurible's band (×0.224 at E(16))
 * and the Verger's (×0.195 at E(14)), and fourteen times clear of the
 * ×1/64 floor the quiet end must not touch (§3.2). The bake is
 * warning-free — no rescale, no rotate, 100.0 × 47.6 m.
 *
 * The hand-drawn outline this model retires (silhouettes.ts, "a rostrum
 * forward and a fan astern … widest at the very stern, where nothing else
 * in the roster is") drew the carapace 17 m of half-beam at x = +10 and
 * the fan's outer paddle out to 25 m at −30, its inner to 17 at −47 and
 * the telson 2 at −50. The model's carapace is 17 m at +18 and 15 at +2,
 * scalloping to 13 at the fore plate and 10 at the abdomen's first; its
 * fan reaches 23.8 m at −37 on the outer plates' corners, 13 on the inner
 * plates at −45 and 3.75 on the telson at −50 — the same plan, drawn
 * seven metres further aft, which is where a fan rooted in the last
 * segment lands.
 *
 * Every part comes from `factions/directorate.mjs`. `soundingFan`,
 * `fileRidge` and `plectrumLimb` were written for this hull and run here
 * for the first time; the `ridge` option on `tergites`, `ribs` on `keel`,
 * `rim` on `limbs` and the slope-laid marks of `rimPhotophores` are the
 * Thurible's, and every default is the older hulls' own, which
 * `check.mjs` holds to their files.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 100;
const BOW = L / 2;

/**
 * The abdomen, stern first: `[x, half-length, half-height, half-beam]`,
 * the scales the orbs are drawn at (hulls/precentor.mjs). Four plates
 * growing toward the bow, each overlapping the one ahead by about half a
 * half-length; height 0.44–0.47 of the beam, the Thurible's tail, because
 * an abdomen is a pressure body and not a shovel. Plate 0 is the fan's
 * root — the last segment, which the fan spreads from.
 */
const ABDOMEN = [
  [-33, 5, 2.6, 5.5],
  [-26, 6, 3.2, 7],
  [-18, 7, 3.8, 8.5],
  [-9, 8, 4.4, 10],
];

/**
 * The carapace, stern first: three plates, the middle one the widest and
 * the deepest. Height 0.6 of the beam, the Verger's — "ribbed and domed
 * like the Verger's" — so the plates are round in section and the seam
 * ribs stand proud of them on the Verger's rule.
 */
const CARAPACE = [
  [2, 12, 9, 15],
  [18, 13, 10.2, 17],
  [33, 11, 7.8, 13],
];

/** The Verger's seam, on the Precentor's rule (hulls/verger.mjs). */
const SEAM = { at: 0.8, size: [0.35, 0.72, 0.9], tallOf: 'beam' };
/**
 * The abdomen's lip: the Dredge's ridge drawn to the plate's own height
 * rather than 1.125 of it — the joint shows as a half-metre step, and the
 * file has to ride over two of them (the header).
 */
const RIDGE = { at: -0.75, size: [0.25, 1.0, 0.92], lift: 0.5 };

/** Where the shell's crown is at `(x, z)`, both series and their lips included. */
const crown = (x, z) =>
  Math.max(
    directorate.tergiteCrown(ABDOMEN, x, z, RIDGE),
    directorate.tergiteCrown(CARAPACE, x, z, SEAM)
  );
/** Where the shell's flank is at `(x, y)`, the same way. */
const rim = (x, y) =>
  Math.max(
    directorate.tergiteFlank(ABDOMEN, x, y, RIDGE),
    directorate.tergiteFlank(CARAPACE, x, y, SEAM)
  );

const violet = directorate.ink.chitinViolet();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson();
const unlit = directorate.ink.biolightUnlit();

const root = new THREE.Group();
root.name = 'directorate_lure';

// The body, in two calls that number as one series: the four abdomen
// plates with the ridge, then the three carapace plates with the Verger's
// seam standing proud as a rib. Violet, red, violet, red, violet, red,
// violet from the stern.
directorate.tergites(root, { violet, red, black }, {
  segments: ABDOMEN,
  lip: 'ridge',
  ridge: RIDGE,
});
directorate.tergites(root, { violet, red, black }, { segments: CARAPACE, seam: SEAM, first: 4 });

// The rostrum's point is the bow at +50; its base is 14 m aft, inside the
// fore plate's nose, so the last 6 m of it show. Eight-sided, the Verger's.
directorate.rostrum(root, red, { tip: BOW, r: 4.5, length: 14, facets: 8 });

// The resonating bladder, showing through the second abdomen plate as a
// paler dome: violet on red, the Chorister's, 8.4 m across and 2.2 m proud
// of the plate's crown, 1.6 m to starboard of the keel. No lamp (the header).
directorate.bladderDome(root, violet, { x: -27, y: 2.6, z: 1.6, r: 4.2 });

// Three dorsal spines on the carapace, alternating sides — 3 m to port,
// 3.5 to starboard, 3.5 to port — 5, 6.5 and 5.5 m long from the bow,
// raked 0.3 forward and cut five-sided, each with its base 0.8 m into the
// shell. `dorsalSpines` refuses a mirrored pair; this rank never offers one.
const spine = (x, z, length) => [x, crown(x, z) + length / 2 - 0.8, z, length];
directorate.dorsalSpines(root, black, {
  spines: [spine(38, -3, 5), spine(21, 3.5, 6.5), spine(4, -3.5, 5.5)],
  r: 0.75,
  rake: -0.3,
});

// The walking limbs, folded under the carapace's flanks: three a side,
// each rooted 0.8 m into the flank at y = −5 where the shell is (`rim`),
// 8 m long, tapering 0.8 to 0.55, folded 0.6 forward. The one place the
// navy allows a pair (`limbs`).
directorate.limbs(root, steel, {
  xs: [30, 18, 6],
  y: -5,
  rim,
  sink: 0.8,
  r: [0.8, 0.55],
  length: 8,
  fold: 0.6,
});

// The ribbed pressure keel: a black spar 36 m under the carapace, 3.2 m
// forward to 2.6 aft and squashed 0.8 across, with six steel hoops.
directorate.keel(root, black, {
  x: 13,
  y: -9.4,
  radii: [3.2, 2.6],
  length: 36,
  ribs: { count: 6, mat: steel, tube: 0.35, proud: 0.25, inset: 3 },
});

// The file ridge down the abdomen's back, a metre to starboard of the
// keel line: twelve teeth from −10 to −22 on a crest sloping 5.6 to 4.6
// with the abdomen, riding over the two joints it crosses.
directorate.fileRidge(root, black, {
  crown,
  z: 1,
  from: -10,
  to: -22,
  teeth: 12,
  top: [5.6, 4.6],
  tooth: 0.8,
  rake: 0.3,
  sink: 0.8,
  t: 0.7,
});

// The plectrum limb, raised over the file from the port flank: hip rooted
// 0.6 m into the fourth abdomen plate's flank at x = −11, knee 10.6 m up
// and 4.5 to port of the keel, wrist over the file, and the pick aimed
// down at the file's crest with its point 0.9 m clear of the teeth.
directorate.plectrumLimb(root, { steel, black }, {
  hip: [-11, 1.5, -(rim(-11, 1.5) - 0.6)],
  knee: [-13, 10.6, -4.5],
  wrist: [-16.5, 9.3, 0],
  tip: [-17.6, 6.7, 1],
  joints: { hip: 1.3, knee: 1.15, wrist: 0.85 },
  femur: [1.0, 0.85],
  tibia: [0.85, 0.65],
  pick: { r: 1.2, flat: 0.3 },
});

// The sounding fan, spread: the telson on the keel line to the stern at
// −50, the inner pair yawed 24° out and the outer pair 60°, each plate a
// broad paddle with a squared end, and a rib in the unlit finish down each
// — the fan's light, which is the singing band's and never this model's.
directorate.soundingFan(root, { skins: [red, violet, red], rib: unlit }, {
  at: [-32, 0],
  t: 0.7,
  bevel: 0.35,
  telson: { length: 17.65, root: 2.0, tip: 3.4, chamfer: 1.2, shoulder: 0.75, y: 0.5 },
  pairs: [
    { length: 17, root: 2.2, tip: 4.2, chamfer: 1.3, shoulder: 0.7, spread: 0.4189, dz: 2.2, y: 0 },
    {
      length: 20,
      root: 2.4,
      tip: 4.8,
      chamfer: 1.4,
      shoulder: 0.7,
      spread: 1.0472,
      dz: 3.6,
      dx: 1,
      y: -0.5,
    },
  ],
});

// "Under way a dim row along each tergite's edge": a row a carapace plate
// along its rim on each side, at 0.93 of the half-beam where that plate is
// the outermost thing, in the lamp family's unlit finish — built, and never
// lit (models-plan.md §3.2 rule 2). Starboard one longer than port on the
// middle and aft plates.
directorate.rimPhotophores(root, unlit, {
  rim,
  crown,
  name: 'edge_row_6',
  ranks: { s: { from: 38, pitch: 4, count: 3 }, p: { from: 36, pitch: 4, count: 3 } },
  at: 0.93,
  size: 0.9,
  h: 0.35,
});
directorate.rimPhotophores(root, unlit, {
  rim,
  crown,
  name: 'edge_row_5',
  ranks: { s: { from: 26, pitch: 4, count: 4 }, p: { from: 24, pitch: 4, count: 3 } },
  at: 0.93,
  size: 0.9,
  h: 0.35,
});
directorate.rimPhotophores(root, unlit, {
  rim,
  crown,
  name: 'edge_row_4',
  ranks: { s: { from: 7, pitch: 4, count: 3 }, p: { from: 5, pitch: 4, count: 2 } },
  at: 0.93,
  size: 0.9,
  h: 0.35,
});

// "Nearly black at rest, photophores in a pattern that repeats on neither
// side": ten marks on the shell's shoulders at 0.7 of the half-beam, laid
// on the slope — six on the carapace and four down the abdomen, the ranks
// keeping clear of the seam ribs, the ridge lips, the bladder's dome and
// the plectrum limb's shadow (the header).
directorate.rimPhotophores(root, crimson, {
  rim,
  crown,
  name: 'photophore',
  ranks: { s: { from: 35, pitch: 15, count: 3 }, p: { from: 37, pitch: 18.5, count: 3 } },
  at: 0.7,
  size: 1.4,
});
directorate.rimPhotophores(root, crimson, {
  rim,
  crown,
  name: 'photophore_tail',
  ranks: { s: { from: -10.5, pitch: 7, count: 2 }, p: { from: -19, pitch: 8, count: 2 } },
  at: 0.7,
  size: 1.2,
});

// Built in metres from the start; this guards the length and centres it.
// The telson's squared end is the one thing at −50, and it is placed
// without a yaw, so the drawn length is 100 to the bit and the scale is 1.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'lure-directorate.glb');
