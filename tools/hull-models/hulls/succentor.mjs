/**
 * The Succentor — the Directorate's carrier, 130 m (docs/units.md, "The
 * carriers"; the Succentor block of docs/asset-prompts-3d.md Block 3).
 *
 * "The deep deck. The precentor's deputy, and the Listening's answer to
 * water nobody else can hold: a carrier that sits in the Abyssal and
 * launches its flight into the band it is already in" — SIG 20 idle, 30
 * cruise, +35 at every launch; HYD 60; PR 4, the Dredge's water; 34 m/s;
 * 900 hull; no gun at all; five Trebles, the roster's largest flight.
 *
 * Built rather than ported (docs/models-plan.md §3.1), metre-true at
 * 130 m, the rostrum's point at +65 and the telson's base at −65, nothing
 * to rescale. A carrier reads as a carrier only if the deck it launches
 * from is visible from above, at 1 px/m (#840), so the hull is built round
 * its deck: the Dredge's heavy ridged carapace at the head and the tail,
 * and between them five broad, low, lipless plates — the deck — with a
 * cradle on each.
 *
 * The body is the navy's segment series in three calls that number as one
 * (the Thurible's way), violet and red by turns from the stern: two tail
 * plates with the Dredge's raised ridge and a spine each; five deck plates
 * on a 14 m pitch, 46 to 52 m across and 0.3 as tall as they are wide —
 * flatter than the Dredge's 0.4, because a deck is the flattest back this
 * navy grows, and long enough (32 m each, half again their pitch) that the
 * creases between them are shallow — with no lip between them, so no ridge
 * crosses a berth; and a head plate with the ridge again, carrying the
 * listening dome, its ridge the dark collar between deck and head. The
 * rostrum is the Dredge's eight-sided point; the telson closes a transom
 * with the Dredge's two tail spines.
 *
 * WHAT THE BLOCK DOES NOT SAY — decided here:
 *
 * - **The deck is built empty.** A craft aboard is not an entity, and a
 *   craft in the water is drawn as its own (docs/systems-combat.md §15):
 *   modelled into its cradle it would be drawn twice whenever the flight
 *   is out. So each cradle is cut to the craft that is not in it — the
 *   Treble's own plan grown 0.6 m and closed over its notches (`cradles`,
 *   `bodyPlan`, `trebleBody` in the module): a black floor shaped like a
 *   Treble, a steel coaming round it open at the mouth, the clasps standing
 *   open — and the berth says what fits it. Each cradle is a frame whose
 *   origin is where a Treble's own origin goes when it is aboard; five
 *   Treble files placed at the five frames' transforms sit in their berths
 *   with the floor's margin showing round every one, which is the fit
 *   checked rather than asserted.
 * - **One berth a deck plate, alternating sides.** The Dredge puts a spine
 *   off each plate, alternating sides; this hull puts a cradle there. Five
 *   plates, five cradles, 10.5 m off the keel — starboard at +24, −4 and
 *   −32, port at +10 and −18 — so the five are three and two, the
 *   starboard rank one longer as the Precentor's is (this is its deputy),
 *   and no cradle answers another across the keel. Each is laid with its
 *   bow 30° outboard of dead ahead, so from above the five read as ribs
 *   swept forward off a spine — a herringbone, not a rank of slots — at an
 *   angle no plate joint runs at, which is what keeps five dark berths from
 *   reading as five more joints at 1 px/m.
 * - **Seated on a dome.** Each berth's floor is the least-squares plane of
 *   the shell under it lifted clear of the shell's highest point by a
 *   quarter metre (`cradles`), so no chitin shows through a floor from
 *   above, and floor and coaming run down into the shell past its lowest
 *   point, which on these plates is 1.5 to 1.7 m under the floor: from the
 *   conn view's pitch a berth is a rimmed tray let into the back, never a
 *   plate floating over it.
 * - **The mouths are the Slipway's.** Each cradle is open at the end a
 *   craft leaves by, forward and outboard, with the Slipway's lit launch
 *   sill across it and its two launch mandibles either side, and a pair of
 *   the Slipway's gantry claws at the craft's waist, standing open: the
 *   yard that builds the carrier, at the scale of the craft it launches.
 *   The floor runs on past the sill as a tongue to where the craft's
 *   rostrum lies.
 * - **The flanks alternate mouth and spine.** Rim spines off the deck's
 *   flanks, black, 9 and 10 m, canted outboard, at the stations between
 *   the mouths on each side — starboard at +18 and −10 between mouths at
 *   about +28, 0 and −28; port at +32, +4 and −24 about mouths at +14 and
 *   −14 — so each flank reads mouth, spine, mouth down its length and the
 *   port flank is the starboard's half a pitch on.
 * - **The ears.** A studded listening dome on the head, the Precentor's
 *   own at four fifths of its size, with the violet aft dome off the
 *   centreline to port: HYD 60, "the ears the office implies". Dark, as
 *   the Precentor's is.
 * - **Walking limbs,** four a side folded under the deck, rooted at y = −4
 *   so the forward two pairs' tips just clear the rim — the conn view's,
 *   and a stub each on the chart.
 * - **The light.** The resting band is 16–35, "dim accent-colour running
 *   lights along the hull line", and the model lights two things. A row of
 *   photophores down each flank of the deck, laid on the shell's slope,
 *   starboard eight at a 9 m pitch and port six at 11.5 m, so the rows
 *   never answer. And the five sills, one across each cradle's mouth — the
 *   Slipway's own resting light, which is also how the flight's count
 *   reads on the chart's loudness layer. A launch floods the mouth for the
 *   instant of the +35: a transient, not a lamp (docs/models-plan.md
 *   §3.2, rule 3). The dome, the floors and everything astern carry none.
 *   The fourteen rim marks rest on the facets under them since #907
 *   (`rimPhotophores` `rest`): seated on the ideal crown, four of them
 *   stood 0.21 to 0.47 m over the 12 × 6 orb's chord by #894's resting
 *   measure, and the rank is dropped from its crown stations onto
 *   `tergite_2..6`, 0.15 m in as the rule always meant — every mark
 *   moves, 0.4 to 1.6 m, `photophore_rim_s0` the most where the head
 *   plate's nose sags furthest under its crown, and the stations, the
 *   beams and the two pitches are as they were. `diff.mjs` lists the
 *   fourteen and no other part.
 *
 * The light budget, measured (`lightAudit`, printed by `exportGlb`):
 * nineteen lit parts, 42.8 m² facing up — the five sills 22.6 m² (4.4 to
 * 4.6 each) and the fourteen rim marks 20.2 m², 1.25 to 1.69 each — and
 * nothing hidden. On the crown the marks read 28.7 m² and the hull 51.3:
 * a mark laid on its facet takes the facet's slope, which between the
 * orb's rings and meridians is steeper than the crown's, and shows less
 * of itself from above. The bake at E(20) = 1.88 read raw E = 7.6 at
 * intake's 2 px/m and 7.8 at the maps' 4 on that 51.3 and dimmed by
 * ×0.25 and ×0.24 — a fourfold surplus, fifteen times clear of the ×1/64
 * floor — and loses a sixth of it with the marks, still three times the
 * target.
 *
 * `cradles`, `bodyPlan`, `bodyEnvelope`, `bodyHalfBeam` and `trebleBody`
 * were written for this hull and the Treble and run here for the first
 * time; every other builder is the older hulls' own, at its own defaults.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 130;
const BOW = L / 2;
const STERN = -L / 2;

/**
 * The tail, stern first: `[x, half-length, half-height, half-beam]`. Two
 * plates growing toward the deck, 0.43 to 0.44 as tall as they are wide —
 * a little rounder than the Dredge's 0.4, because a tail is a pressure
 * body — each with the Dredge's ridge and a spine.
 */
const TAIL = [
  [-56, 6.5, 4.2, 9.5],
  [-47, 8, 5.6, 13],
];
/**
 * The deck: five broad lipless plates on a 14 m pitch, one a berth, 0.3
 * as tall as they are wide and widest at the middle one; each 32 m long,
 * so a berth crossing the crease to the next plate crosses a shallow one.
 */
const DECK = [
  [-32, 16, 6.9, 23],
  [-18, 16, 7.5, 25],
  [-4, 16, 7.8, 26],
  [10, 16, 7.7, 25.5],
  [24, 16, 7.2, 24],
];
/** The head: one plate with the ridge, carrying the dome. */
const HEAD = [[43, 11, 6.2, 17]];

/** The Dredge's ridge exactly (`tergites`' default). */
const RIDGE = { at: -0.75, size: [0.25, 1.125, 0.92], lift: 0.5 };

/** Where the shell's crown is at `(x, z)`, every series and lip included. */
const crown = (x, z) =>
  Math.max(
    directorate.tergiteCrown(TAIL, x, z, RIDGE),
    directorate.tergiteCrown(DECK, x, z, null),
    directorate.tergiteCrown(HEAD, x, z, RIDGE)
  );
/** Where the shell's flank is at `(x, y)`, the same way. */
const rim = (x, y) =>
  Math.max(
    directorate.tergiteFlank(TAIL, x, y, RIDGE),
    directorate.tergiteFlank(DECK, x, y, null),
    directorate.tergiteFlank(HEAD, x, y, RIDGE)
  );

const violet = directorate.ink.chitinViolet();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson();

const root = new THREE.Group();
root.name = 'directorate_succentor';

// The body, in three calls that number as one series from the stern: the
// tail with the Dredge's ridge and a spine off each plate, the deck with
// no lip, the head with the ridge again.
directorate.tergites(root, { violet, red, black }, {
  segments: TAIL,
  lip: 'ridge',
  spines: { lengths: [6, 7], r: 1, offsets: [3.5, 4.5] },
});
directorate.tergites(root, { violet, red, black }, { segments: DECK, lip: 'none', first: 2 });
directorate.tergites(root, { violet, red, black }, { segments: HEAD, lip: 'ridge', first: 7 });

// The rostrum's point is the bow at +65, its base 16 m aft inside the head
// plate; the telson's base ring is the stern at −65, its apex buried 11 m
// forward in the last plate, and the Dredge's two tail spines off it.
directorate.rostrum(root, red, { tip: BOW, r: 4.2, length: 16, facets: 8 });
directorate.telson(root, { violet, black }, {
  tip: STERN,
  r: 3.8,
  length: 11,
  facets: 8,
  tailSpines: { x: -57, y: 1.5, z: 6.5, r: 0.9, length: 7, splay: 0.35 },
});

// The ears: the Precentor's studded dome at four fifths of its size on the
// head plate, and the violet aft dome off the centreline to port.
directorate.listeningDome(root, { red, violet, black }, {
  x: 45,
  y: crown(45, 0) - 1.2,
  r: 4.4,
  ry: 3.4,
  studs: { radius: 2.6, lift: 2.8, length: 2.6, r: 0.4 },
  aft: { x: 37.5, y: crown(37.5, -3.5) - 0.8, z: -3.5, r: 2.1, ry: 1.8 },
});

// The deck: five cradles cut to the Treble, one a deck plate, alternating
// sides from the bow — three to starboard and two to port — each laid 30°
// outboard (the header).
directorate.cradles(root, { black, steel, lamp: crimson }, {
  crown,
  craft: directorate.trebleBody,
  cant: Math.PI / 6,
  cradles: [
    { side: 's', x: 24, z: 10.5 },
    { side: 'p', x: 10, z: 10.5 },
    { side: 's', x: -4, z: 10.5 },
    { side: 'p', x: -18, z: 10.5 },
    { side: 's', x: -32, z: 10.5 },
  ],
});

// Spines off the deck's rim between the cradle mouths (the header): rooted
// at y = 1 in the flank, canted 1.05 outboard, raked 0.25 forward.
directorate.rimSpines(root, black, {
  rim,
  spines: [
    { side: 'p', x: 32, length: 9 },
    { side: 's', x: 18, length: 10 },
    { side: 'p', x: 4, length: 10 },
    { side: 's', x: -10, length: 10 },
    { side: 'p', x: -24, length: 9 },
  ],
  r: 1,
  rake: -0.25,
  cant: 1.05,
  sink: 0.8,
});

// The walking limbs, folded under the deck: four a side rooted 0.8 m into
// the flank at y = −4, 8 m long, folded 0.8 — the forward pairs' tips at
// the rim, the after pairs' under it.
directorate.limbs(root, steel, {
  xs: [28, 10, -8, -26],
  y: -4,
  rim,
  sink: 0.8,
  r: [0.8, 0.55],
  length: 8,
  fold: 0.8,
});

// "Dim running lights along the hull line": a row down each flank of the
// deck, laid on the shell's slope, starboard eight at 9 m and port six at
// 11.5 m, so the rows never answer each other across the keel; each mark
// dropped onto the deck plate under it (`rest`, #907; the header).
directorate.rimPhotophores(root, crimson, {
  rim,
  crown,
  name: 'photophore_rim',
  ranks: {
    s: { from: 34, pitch: 9, count: 8 },
    p: { from: 31, pitch: 11.5, count: 6 },
  },
  at: 0.86,
  size: 1.3,
  rest: [2, 3, 4, 5, 6].map((i) => `tergite_${i}`),
});

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'succentor-directorate.glb');
