/**
 * The Lure, the Order's — 100 m (docs/units.md, "The siege hulls"; the
 * Lure block of docs/asset-prompts-3d.md Block 3, read with the Hadron
 * FACTION block on the Chorister's rule — "the Lure carries no faction lock
 * … a navy rendering for one fields the same plan, the segmented body, the
 * fan spread astern and the raised plectrum, composed with its own FACTION
 * block, with the light kept nearly black at rest").
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
 * Built, not ported (#1441, on models-plan.md §3.4): the Order's variant of
 * a kind whose canonical model is the Directorate's (hulls/lure.mjs), drawn
 * from the module's vocabulary with no approved binary behind it, so every
 * number here is a decision, and this header says which ones the block did
 * not make. Metre-true at 100 with no root scale: the bow prism's tip is
 * the bow at x 50 and the telson's squared end the stern at −50. Built in
 * a state (§3.5): the fan spread, the plectrum raised. The bake's SIG is
 * the kind's 14 (tools/hull-maps/models.mjs `lure`), not a cone figure: the
 * row is the Directorate's, and the variant takes the Chorister's rule —
 * the plan kept, the light kept at the kind's band. Nothing here is an
 * animal (docs/bestiary.md §3): a lobster's tail fan is the plan's shape, a
 * telson and two blades a side, and the body is seven segments.
 *
 * THE PLAN KEPT. What hulls/lure.mjs decided for the kind where the block
 * was silent stands here, in the Order's shapes: the five plates are a
 * telson in the middle and two a side, the telson on the keel line to the
 * stern, the inner pair yawed 24° out and the outer 60°, the three ranks
 * stacked at the root — telson over inner over outer — and the outer pair
 * a metre further forward; each plate carries its rib in the lamp
 * family's unlit finish and no lamp; the file runs down the abdomen's
 * back from x −10 to −22 with twelve teeth leaning aft over a crest that
 * rides the shell and dips with no joint; the plectrum is rooted in the
 * abdomen's biggest segment's flank at x −11, raised to a knee over the
 * back, its tibia across to a wrist over the file and its pick aimed down
 * and aft at the crest, 0.9 m clear of the teeth; the bladder shows on
 * the second abdomen segment, x −26, forward of the fan; three limbs a
 * side fold under the carapace at x 30, 18 and 6; the keel stops with the
 * carapace; the marks sit on the shell's shoulders at 0.7 of the
 * half-beam, three on the carapace and two down the abdomen, and the
 * edge rows on the three carapace segments only.
 *
 * THE COUNTS AND STATIONS ARE NOT THE KIND'S. The Directorate's Lure is
 * asymmetric by its block — one plectrum limb from port crossing to a
 * file a metre to starboard, a dome 1.6 m to starboard, three dorsal
 * spines alternating sides, ten photophores on two pitches, edge rows
 * one mark shorter to port — and its builders refuse a mirrored pair. The
 * Hadron FACTION block makes this navy "the only faction with" precise
 * bilateral symmetry, and every approved Order variant takes the faction
 * block over the kind's asymmetry (hulls/chorister-hadron.mjs, the lamps
 * and the gun on the centreline; hulls/verger-hadron.mjs, the hatches;
 * hulls/acolyte-hadron.mjs, the tripod as three mirrored pairs;
 * hulls/thurible-hadron.mjs, seven cells as eight). So the Order's Lure
 * is bilaterally symmetric, every pair drawn through `bothSides` (port
 * −z, #642):
 *
 * - **The plectrum as a MIRRORED PAIR**, one limb each side, both aimed
 *   at the file on the centreline (`plectrumPair`). The alternative was
 *   one limb on the centreline from a dorsal hinge; the pair wins because
 *   a limb on the centreline would stand over the file it strikes and
 *   read as a spine, and the Order's instruments are played in pairs —
 *   the Tocsin's brace blades, the Lance's guard wings. The kind's one
 *   limb becomes two as the Acolyte's tripod became three pairs and the
 *   Thurible's seven cells eight.
 * - **The file on the centreline** (`fileRail`), where the Directorate's
 *   is a metre to starboard: a toothed rail down the tail's spine, which
 *   is what the spine is between the two runs.
 * - **The bladder on the centreline, as a crystal segment** — the
 *   Chorister's bladder, the middle segment in resonance crystal — rather
 *   than a dome off the keel line, with two alloy hoops round it
 *   (`pressureRibs`, `bladder_rib`): the crystal held in a frame.
 * - **One dorsal fin** on the carapace's spine (`finAndKeel`) for the
 *   kind's three alternating spines: the family's fin, 8 by 3.5 m by 0.8
 *   at x 16–24, its base on the spine's top at y 4.59 over the widest
 *   segment, where the Directorate's middle spine stands.
 * - **Five mark pairs for ten marks** (`rimMarkPairs`), at the kind's
 *   starboard stations on the carapace, x 35, 20 and 5, and at −16.5 and
 *   −20.5 on the abdomen — the kind's −10.5 and −17.5 moved aft of the
 *   plectrum's reach, since a mark under a tibia is a mark the audit reads
 *   at half its area (the Directorate's header, the same trap), and both
 *   on segment_2's flat rather than the crystal segment (LIGHT below).
 * - **Three edge strips a side for three studded rows** (`rimMarkPairs`,
 *   the unlit finish): the Order says a lit edge as a strip, the Lance's
 *   guard edges and the Clarion's wing edges, not as a row of studs; and
 *   twenty studs under a metre each read as twenty panels under the band
 *   (facets.mjs `panels`).
 * - **The fan's pairs through `bothSides`** (`soundingBlades`), where the
 *   Directorate composes its matched pairs one side at a time by §3.6.
 *
 * THE SHAPES TRANSLATED. "Ribbed and domed like the Verger's" is the
 * Directorate's language; the Order has no dome, and says a segment as a
 * blade laid flat:
 *
 * - **The body** is the family's segments on one axis (`spar`, four
 *   facets, the Chorister's and the Thurible's tail), each a double-ended
 *   wedge about its own middle pressed 0.6 tall by 1.4 wide. The section
 *   is a RECTANGLE: `spar` lays four facets on their flats (kit.mjs
 *   `loft` at π/4), so each segment has a flat top at r·cos 45°·0.6, a
 *   flat bottom at the same depth and vertical side faces at
 *   ±r·cos 45°·1.4 for the whole height — the Thurible's tail marks lie
 *   on "the segments' flat tops" for the same reason, and a first cut of
 *   this hull placed its hips by a diamond that was not there (review,
 *   round 1). Stern first:
 *   four abdomen segments growing toward the bow — segment_0 at x −34,
 *   12 m on 4.4 of radius (8.7 in beam, 3.7 tall), the fan's root;
 *   segment_1 at −26, 14 m on 5.2 (10.3 by 4.4), the bladder, in
 *   resonance crystal; segment_2 at −17, 16 m on 6.0 (11.9 by 5.1);
 *   segment_3 at −7, 18 m on 6.8 (13.5 by 5.8) — and three carapace
 *   segments, segment_4 at 4, 22 m on 8.5 (16.8 by 7.2), segment_5 at 18,
 *   24 m on 10 (19.8 by 8.5, the beam of the body), segment_6 at 32, 22 m
 *   on 8.2 (16.2 by 7.0). A body beam of 0.20 of the length on a height
 *   0.43 of the beam, the Chorister's ratios. Each passes into the next
 *   through a waist — the half-beam falls from 9.9 at x 24 to 7.9 at 10.75
 *   and rises again — which is "overlapping" and "jointed" said the
 *   Order's way, and in plan the segments read as a chain of hexagons;
 *   in section each is a box with chamfered ends, a flat deck 8.5 m above
 *   a flat belly at the widest.
 * - **The spine in two runs** (`spar`, sheared), alloy four-facet ridges
 *   pressed 0.7 on 1 m with their axes 0.15 m under the crown at every
 *   station, sampled every two metres so they dip with the waists:
 *   `spine_fore` from x −10 to 42, the bow prism's base, and `spine_aft`
 *   from −40 to −22, over the bladder to the fan's root. No inlay: the hull
 *   is dim.
 * - **The file** (`fileRail`): `file_rail`, a third run of the spine from
 *   −23.5 to −8.5 pressed 0.7 on 1.4 so it reads wider than the runs it
 *   joins, and on its top `file_teeth`, one crystal crest from −10 to −22,
 *   twelve teeth at a metre's pitch 0.9 m tall over the rail's top at
 *   2.89–3.23 with each point 0.3 of the pitch back from its forward foot,
 *   0.6 m thick, its underside sunk 0.2 into the rail. The crest's teeth
 *   stand at y 3.79 on segment_2's flat.
 * - **The plectrum pair** (`plectrumPair`): hips, 1.6 by 1.4 by 1.4 alloy
 *   blocks, on segment_3's vertical side face at (−11, 0.3, ±6.13) —
 *   the face is at ±6.73 there and 2.885 tall, so the block's centre is
 *   0.6 inside it, its outboard face 0.1 proud, its top at 1.0 under the
 *   deck's 2.885; a four-facet alloy femur 0.8 to 0.6 up and out to a
 *   1.4 m knee block at (−13, 6.0, ±9.5), 2.8 m outboard of the face,
 *   its axis passing the deck's edge corner (2.885, ±6.73) at z ±7.66,
 *   0.09 m clear of it at the bone's facet edge; a tibia 0.6 to 0.45 inboard
 *   and aft, 8.1 m nearly level, to a 1.1 m wrist block at
 *   (−16, 6.6, ±2.0); and from the wrist the pick, a crystal four-sided
 *   point 0.9 of half-diagonal and 2.9 m long with its apex at
 *   (−17.6, 4.69, ±0.6) — 0.9 m over the teeth's points at 3.79, 0.3 m
 *   outboard of the crest's flank, aimed down and aft at it. Two arms
 *   out from the flanks and arched back over the deck toward each other,
 *   and the stroke they would make is across the file.
 * - **The rostrum** is the Chorister's prism (`point`): an alloy bow prism
 *   10 m long on 2.2 m of half-diagonal, its tip the bow and its base at
 *   x 40 in segment_6's nose, where the crown is 1.96 and the spine's top
 *   2.30, so the base's crown vertex at 2.2 stands 0.24 m over the ridge
 *   and 0.1 under the spine it sits in.
 * - **The sounding fan** (`soundingBlades`): five alloy blades 0.9 m
 *   thick, each a kite in plan with a squared end — `root` of half-width
 *   at the root, widest at 0.6 of the length, `end` at the full length —
 *   rooted at x −32 in segment_0 (4.4 of radius there), with a 0.4 by 0.6
 *   rib in `crystal_seam_unlit` down each from 0.08 to 0.92 of its
 *   length. The `telson` 18 m on the keel line, 2.0 at the root, 3.4 at
 *   the waist, 1.6 at the end, at y 1.25: its squared end is the stern at
 *   −50. The inner pair 17 m at 24° from z ±2.2 at y 0, 2.2/4.2/2.0: their
 *   widest at (−39.6, ±10.2) and their ends at −46.7 to −48.3. The outer
 *   pair 20 m at 60° from ±3.6, a metre forward and 1.25 lower,
 *   2.4/4.8/2.4: their widest at (−32.8, ±16.4), their squared ends from
 *   (−38.9, ±22.1) to (−43.1, ±19.7). So the plan is 22.1 m of half-beam
 *   at x −39 against the carapace's 9.9 at 12–24: "widest at the stern" by
 *   12 m, and the bake's box reads the yawed frames at ±23.3. The ranks
 *   are flat plates at fixed heights and overlap in plan far past the
 *   root — the telson over the inner pair to x −43.7, the inner over the
 *   outer to z ±10.2 — so they are stepped 1.25 apart, the telson at
 *   y 1.25, the inner at 0, the outer at −1.25: 0.9 of thickness and 0.3
 *   of rib standing proud leaves 0.05 m of water between each rank's rib
 *   and the plate over it, and `contacts.mjs` lists no blade on another
 *   blade or on another blade's rib (a first cut stepped them 0.55 and
 *   every overlap was 0.35 m of solid). All three ranks root inside
 *   segment_0, whose flat top and bottom there are at ±1.87.
 * - **The limbs as three mirrored pairs** at x 30, 18 and 6
 *   (`foldedLimbs`), the Thurible's joints: hips on the vertical side
 *   face at y −1.5, where the face is at ±8.12, 9.90 and 8.41 and runs
 *   from 3.48, 4.24 and 3.61 above the axis to as far below, each a 2.0
 *   by 1.6 by 1.8 alloy block sunk 0.6 — centres at ±7.52, 9.30 and
 *   7.81, 0.3 of block proud; a femur 3.2 m out and 2.6 down to a knee
 *   block at (30, −4.1, ±10.72), (18, −4.1, ±12.50) and (6, −4.1,
 *   ±11.01), 2.6 m past the rim at every station and the block's outboard
 *   face 3.4 past; a tibia folded 5 m forward, 3 m back inboard and 1.2
 *   down to the ankle at ±7.72, 9.50 and 8.01; a crystal point 2.4 m long
 *   lying forward from it, the claws' tips at x 37.4, 25.4 and 13.4 —
 *   0.4 m under the rim's 8.12, 1.8 past the waist's 7.66, 1.9 under the
 *   9.90. From above the rank reads as a row of knees along the edge, as
 *   the Thurible's does; from the side the hips show on the faces.
 * - **The keel** (`spar`, sheared, and `pressureRibs`): a four-facet alloy
 *   spar 40 m from x −4 to 36 on 1.6 m of radius pressed 1.1 tall by 0.45
 *   wide, its axis a metre under the belly at every station — −5.24 at
 *   x 18 — so its top is sunk the whole way and its bottom hangs 2.2 m
 *   under segment_5's flat belly; five alloy hoops round it at x 32, 25,
 *   18, 11 and 4,
 *   each at the keel's axis there, their upper runs inside the belly. Not
 *   under the abdomen: the Directorate's header says why, and the Order's
 *   abdomen is narrower still.
 * - **The bladder's hoops** (`pressureRibs`, `bladder_rib_0..1`): two
 *   alloy hoops round segment_1 at x −28 and −24 on its 5.2 m radius plus
 *   0.1, four-sided on a 0.35 m tube and pressed by the body's own
 *   section, so each hugs the crystal's four facets at one stand-off and
 *   passes through the spine's run over it. At −29 the forward one met the
 *   outer blades' root corners at x −28.9 (`contacts.mjs`, the first cut);
 *   at −28 it clears them by 0.55 m.
 * - **The edge strips** (`rimMarkPairs`, `edge_strip_6..4`): a pair a
 *   carapace segment on its plateau at 0.9 of the half-beam — x 27.5–36.5
 *   at z ±7.31, 13–23 at ±8.91, −0.5–8.5 at ±7.57 — 0.5 wide and 0.3
 *   tall, each lying flat on the segment's flat top, 0.8 to 1.0 m in from
 *   its edge (`seat`, `drop`; rot 0, since the deck is level), in
 *   `crystal_seam_unlit`: built, and never lit (models-plan.md §3.2, rule
 *   2); the block lights them under way.
 *
 * LIGHT. "Nearly black at rest": ten marks in five mirrored pairs, each a
 * `crystal_seam` box at strength 1 — the Thurible's (SIG 16) and the
 * Verger's (14) — dropped onto the segment under its station
 * (`rimMarkPairs`, kit.mjs `seat`). Three pairs on the carapace's
 * shoulders at x 35, 20 and 5, 0.7 of the half-beam out — z ±5.68, 6.93
 * and 5.89 — 1.2 m square and 0.3 tall, each lying flat on its segment's
 * flat top (y 3.48, 4.24 and 3.61) and showing 1.25, 1.25 and 1.0 m² (the
 * third's a rasterisation at 4 px/m, not a shadow); two pairs down the
 * abdomen at x −16.5 and −20.5 on segment_2's flat top, ±4.16, 1.0 m
 * square, 1.0 m² each.
 * The Thurible's two scales, and nothing larger anywhere. Nothing else is
 * lit: not the fan's ribs (the singing band's), not the crystal segment
 * (unlit `resonance_crystal`, a linear luminance of about 0.20 against
 * `shadow_indigo`'s 0.035, so the conn view shows the bladder as a paler
 * segment and the chart as a paler band, which is the Chorister's "paler
 * dome" and no lamp), not the teeth, not the picks, nothing on the
 * centreline and nothing abaft the tail marks at −20.5 — the last 30 m,
 * the bladder, the fan's root and the fan, are dark, as every Order stern
 * is. Figures measured (`lightAudit`, printed by `exportGlb`; the intake
 * bake): ten lit parts, 11.0 m² facing up, every one resting on its
 * deck, none hidden, none floating. 11.0 m² on 1,787 m² of plan (7,148
 * mask px at 2 px/m). The bake at E(14) = 1.22 reads raw E 7.29 and dims
 * by ×0.168: ten times clear of the ×1/64 floor the quiet end must not
 * touch (§3.2), beside the Directorate's ×0.225, the Thurible's ×0.155 and
 * the Verger's ×0.143. 89 parts, 1,960 triangles, bounds x ±50,
 * y −6.8..8.1, z ±23.3.
 *
 * FACETS and PANELS (Block 2c; `node tools/hull-models/facets.mjs hadron`):
 * no ring off the rule. The segments, spines, rail and keel are the
 * four-facet section the Order cuts at any size, laid on a flat; the
 * prism, bones, claws and picks the same count on a vertex; the hoops
 * four round and four on the tube; the blades, fin and crest planes. The
 * median unlit part from above is 2.0 m on a side over 67, inside the
 * hulls' 2–6 m band at its floor as the Thurible's 2.1 is: a first cut
 * with twelve teeth as separate stones and twenty edge studs read 1.1 m
 * over 82, and the crest and the strips are what brought it in. No trim laid,
 * as the Order's other variants lay none.
 *
 * Contacts (`node tools/hull-models/contacts.mjs lure-hadron`): 134 pairs,
 * every one a mount — each segment into the next and its spine run, marks
 * and strips; the bow prism in segment_6 and the fore spine; the fin on
 * the spine; the rail into both runs and segments 1–3, the crest on the
 * rail; the hoops through the keel and the bladder and its spine; each
 * hip and femur in its segment's side face, each femur in its hip and
 * knee, each tibia in its knee and claw or wrist, each pick in its wrist;
 * the fan's blades in segment_0 and over segment_1's tapered tip, which
 * the stacked roots cover, and each rib on its own blade only. No blade
 * meets another blade or another blade's rib (the step, above). The
 * sweep does not see a part wholly inside an open loft, so the hips were
 * checked against the faces by hand: every hip centre is 0.6 inside a
 * face that is there, at a height the face covers. 57 parts reach under
 * y 0, which on a hull is the axis and not the ground: the segments' flat
 * bellies to −4.2, the keel and its hoops to −6.8, the limbs to −5.9.
 * No lamp is hidden and none floats (`exportGlb`, no warning).
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 100;
const BOW = L / 2;
const STERN = -L / 2;

/**
 * The body's section: the Chorister's blade, four facets pressed 0.6 tall by
 * 1.4 wide. `spar` lays four facets on their flats (kit.mjs `loft` at
 * π/4), so the section is a RECTANGLE — a flat top, a flat bottom and
 * vertical side faces — of half-height r·cos 45°·0.6 and half-beam
 * r·cos 45°·1.4, not a diamond.
 */
const BODY = [0.6, 1.4];
/** A four-facet spar's flat is at cos 45° of its radius. */
const FLAT = Math.SQRT1_2;

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const unlit = hadron.ink.crystalSeamUnlit();

const root = new THREE.Group();
root.name = 'hadron_lure';

/**
 * The seven segments, stern first: `[name, x, half-length, radius, material]`,
 * each a four-facet spar about its own middle, a double-ended wedge tapering
 * to 0.3 over the outer half of each end (the Acolyte's, the Thurible's).
 * Four abdomen segments growing toward the bow, segment_1 the bladder in
 * crystal; three carapace segments, the middle one the widest.
 */
const SEGMENTS = [
  ['segment_0', -34, 6, 4.4, shadow],
  ['segment_1', -26, 7, 5.2, crystal],
  ['segment_2', -17, 8, 6.0, shadow],
  ['segment_3', -7, 9, 6.8, shadow],
  ['segment_4', 4, 11, 8.5, shadow],
  ['segment_5', 18, 12, 10, shadow],
  ['segment_6', 32, 11, 8.2, shadow],
];
const segmentRadius = ([, cx, half, r], x) => {
  const u = Math.abs(x - cx);
  if (u >= half) return 0;
  return u <= half / 2 ? r : r - (r - 0.3) * ((u - half / 2) / (half / 2));
};
/** The body's lathe radius at `x`, the largest segment there. */
const bodyRadius = (x) => Math.max(...SEGMENTS.map((s) => segmentRadius(s, x)));
/** The body's flat top, vertical side face and flat bottom at `x`. */
const crown = (x) => bodyRadius(x) * FLAT * BODY[0];
const halfBeam = (x) => bodyRadius(x) * FLAT * BODY[1];
const belly = (x) => -crown(x);

// The body: seven four-facet segments on one axis, stern first, each on
// its own middle; segment_1 the bladder, resonance crystal showing through.
for (const [name, x, half, r, mat] of SEGMENTS)
  hadron.spar(root, name, mat, {
    profile: [
      [-half, 0.3],
      [-half / 2, r],
      [half / 2, r],
      [half, 0.3],
    ],
    x,
    flat: BODY,
  });

// The spine in two runs along the crown, fore and aft of the file, each
// sampled every two metres so it dips with the waists.
const SPINE = [0.7, 1];
const spineAxis = (x) => crown(x) - 0.15;
const spineTop = (x) => spineAxis(x) + SPINE[0] * FLAT;
const spineRun = (name, lo, hi, step = 2) => {
  const stations = [[lo, 0.3, spineAxis(lo)]];
  for (let x = lo + 1.5; x < hi - 1.5 - 1e-6; x += step) stations.push([x, 1.0, spineAxis(x)]);
  stations.push([hi - 1.5, 1.0, spineAxis(hi - 1.5)], [hi, 0.3, spineAxis(hi)]);
  hadron.spar(root, name, alloy, { profile: stations, flat: SPINE });
};
spineRun('spine_fore', -10, 42);
spineRun('spine_aft', -40, -22);

// The rostrum: an alloy bow prism, its tip the bow, its base in segment_6's nose.
hadron.point(root, 'bow_prism', alloy, { x: BOW - 5, r: 2.2, length: 10 });

// The dorsal fin on the carapace's spine, over the middle segment.
hadron.finAndKeel(root, alloy, {
  fin: { x: 20, y: spineTop(20) + 1.75, length: 8, height: 3.5 },
  t: 0.8,
});

// Two alloy hoops round the bladder: the crystal held in a frame.
hadron.pressureRibs(root, alloy, {
  name: 'bladder_rib',
  stations: [-28, -24].map((x) => [x, bodyRadius(x)]),
  tube: 0.35,
  lift: 0.1,
  flat: BODY,
  facets: 4,
});

// The ribbed pressure keel under the carapace only: a four-facet alloy spar
// sheared a metre under the belly, with five alloy hoops.
const KEEL = [1.1, 0.45];
const keelAxis = (x, under = 1) => belly(x) - under;
const KEEL_PROFILE = [
  [-4, 0.3, keelAxis(-4, 0.4)],
  [-1, 1.6, keelAxis(-1)],
  [4, 1.6, keelAxis(4)],
  [11, 1.6, keelAxis(11)],
  [18, 1.6, keelAxis(18)],
  [25, 1.6, keelAxis(25)],
  [33, 1.6, keelAxis(33)],
  [36, 0.3, keelAxis(36, 0.4)],
];
hadron.spar(root, 'keel', alloy, { profile: KEEL_PROFILE, flat: KEEL });
const along = (profile, x) => {
  const k = profile.findIndex(([sx]) => sx >= x);
  const [x0, r0] = profile[k - 1];
  const [x1, r1] = profile[k];
  return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
};
hadron.pressureRibs(root, alloy, {
  stations: [32, 25, 18, 11, 4].map((x) => [
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

// Three mirrored pairs of walking limbs folded under the carapace, hips on
// the vertical side face at y −1.5 (the Thurible's joints), knees past
// the rim.
hadron.foldedLimbs(
  root,
  { alloy, crystal },
  {
    flank: halfBeam,
    pairs: [30, 18, 6].map((x) => ({ x, y: -1.5 })),
    tibia: { r: [0.6, 0.45], fold: 5.0, in: 3.0, drop: 1.2 },
  }
);

// The file: a toothed alloy rail on the centreline between the spine's two
// runs, a crystal crest of twelve teeth from −10 to −22.
const fileTop = hadron.fileRail(
  root,
  { alloy, crystal },
  {
    crown,
    from: -8.5,
    to: -23.5,
    teeth: 12,
    tooth: { t: 0.6, height: 0.9, sink: 0.2, rake: 0.3, from: -10, to: -22 },
  }
);

// The plectrum pair, raised over the file from both side faces: the hip
// on segment_3's vertical face, the femur up and out past the top corner,
// the tibia back inboard over the back to the wrist over the file.
hadron.plectrumPair(
  root,
  { alloy, crystal },
  {
    hip: [-11, 0.3, halfBeam(-11) - 0.6],
    knee: [-13, 6.0, 9.5],
    wrist: [-16, 6.6, 2.0],
    tip: [-17.6, fileTop(-17.6) + 0.9 + 0.9, 0.6],
  }
);

// The sounding fan, spread: the telson on the keel line to the stern at −50,
// the inner pair yawed 24° out and the outer 60°, each an alloy kite with a
// squared end and an unlit crystal rib.
hadron.soundingBlades(
  root,
  { alloy, rib: unlit },
  {
    at: [-32, 0],
    t: 0.9,
    telson: { length: 18, root: 2.0, tip: 3.4, end: 1.6, y: 1.25 },
    pairs: [
      { length: 17, root: 2.2, tip: 4.2, end: 2.0, spread: 0.4189, dz: 2.2, y: 0 },
      { length: 20, root: 2.4, tip: 4.8, end: 2.4, spread: 1.0472, dz: 3.6, dx: 1, y: -1.25 },
    ],
  }
);

// "A dim row along each tergite's edge": a mirrored pair of strips in the
// unlit finish along each carapace segment's rim at 0.9 of the half-beam,
// each the length of its segment's plateau less a metre at each end.
const edgeStrip = (segment, x, length) =>
  hadron.rimMarkPairs(root, unlit, {
    name: `edge_strip_${segment.at(-1)}`,
    on: segment,
    spots: [[x, 0.9 * halfBeam(x)]],
    size: [length, 0.3, 0.5],
  });
edgeStrip('segment_6', 32, 9);
edgeStrip('segment_5', 18, 10);
edgeStrip('segment_4', 4, 9);

// "Nearly black at rest, photophores": five mirrored pairs of crystal_seam
// marks on the shoulders at 0.7 of the half-beam — three on the carapace,
// two down the abdomen — each dropped onto the segment under it.
hadron.rimMarkPairs(root, seam, {
  name: 'photophore',
  on: ['segment_4', 'segment_5', 'segment_6'],
  spots: [35, 20, 5].map((x) => [x, 0.7 * halfBeam(x)]),
  size: [1.2, 0.3, 1.2],
});
hadron.rimMarkPairs(root, seam, {
  name: 'photophore_tail',
  on: 'segment_2',
  spots: [-16.5, -20.5].map((x) => [x, 0.7 * halfBeam(x)]),
  size: [1.0, 0.3, 1.0],
});

metreTrue(root, L, { drawn: L });
await exportGlb(root, 'lure-hadron.glb');
