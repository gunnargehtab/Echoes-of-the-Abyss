/**
 * The Treble — the Directorate's craft, 16 m (docs/units.md, "The craft";
 * the Treble block of docs/asset-prompts-3d.md Block 3, "The carriers").
 *
 * "Very many, cheap and slow" — five to a Succentor's deck, 90 HP, 45 m/s,
 * 12 damage at 320 m, PR 4 like the hull that built them, and SIG 8 idle,
 * 14 cruise: nearly black, navigation marks only. Nobody builds one and
 * nobody crews one: a deck builds them, a carrier launches them, and they
 * fight what the carrier is fighting (docs/systems-combat.md §15).
 *
 * Built rather than ported (docs/models-plan.md §3.1), metre-true at 16 m,
 * the rostrum's point at +8 and the telson's base at −8. The body is
 * `trebleBody` in `factions/directorate.mjs` and not a table here, because
 * the Succentor's five cradles are cut to it (`cradles`, `bodyPlan`): the
 * craft and its berth are one set of numbers, and re-proportioning one
 * moves the other.
 *
 * What it is, at 64 px on the chart and 16 at 1 px/m: the Chorister's
 * cohort plan cut down to a craft — three overlapping tergites, violet,
 * red and violet from the stern, the middle one the widest; a six-sided
 * rostrum; a six-sided telson closing a blunt transom — and what a hull
 * nobody crews does without. No bladder dome, because there is no cohort
 * aboard to keep at pressure; no walking limbs, because it is launched and
 * never walks; no dome and no hatch. The plates carry the Dredge's raised
 * ridge rather than the Chorister's sunk seam: the craft is PR-4 like its
 * carrier and wears the carrier's deep armour, and at this scale a ridge
 * is the only lip that reads — each a dark band across the back.
 *
 * WHAT THE BLOCK DOES NOT SAY — decided here:
 *
 * - **The gun is the Chorister's, off the centreline.** A spine-gun 4.4 m
 *   long on the fore plate, 0.8 m to port, tapering 0.3 to 0.22 toward a
 *   muzzle 1.9 m short of the rostrum's point, on a black mount a craft's
 *   size (`craftGun` — `spineGun`'s own mount is a third of this beam).
 *   From above it is a steel line beside the rostrum on one side only,
 *   which is the asymmetry the plan keeps at this size.
 * - **Two dorsal spines, alternating.** Black, five-sided, raked 0.3
 *   forward: to port on the stern plate, to starboard on the middle one,
 *   with the gun to port ahead of them — the navy's alternation, three
 *   stations long.
 * - **The clasp lugs.** A steel block either side of the waist on the
 *   hull axis, 0.4 m out of the flank: where the cradle's clasps close on
 *   a Treble that is aboard. The one part that says this hull is carried,
 *   and a matched pair because it is machinery and unlit (`claspLugs`).
 * - **The light.** Two photophores and nothing else, 0.6 m square, laid
 *   on the shell's slope at 0.55 of the half-beam: one to starboard on the
 *   stern plate's shoulder at −4.4 and one to port on the middle plate's
 *   at +0.4, each clear of the ridges either side of it, so the pair
 *   repeats on neither side. "Nearly black; navigation marks only" is the
 *   0–15 band's whole sentence.
 *
 * The light budget, measured (`lightAudit`, printed by `exportGlb`): two
 * lit parts, 1.1 m² facing up, nothing hidden. A 16 m craft has the least
 * plan any hull has had for its light to be a fraction of, so the marks
 * are as small as the maps' 4 px/m will still draw as a patch — 2.4 px —
 * and the bake at E(8) = 0.80 reads raw E = 8.5 at intake's 2 px/m and 8.7
 * at the maps' 4, and dims by ×0.092 at both: six times clear of the
 * ×1/64 floor the quiet end must not touch (docs/models-plan.md §3.2).
 * At 0.8 m the same pair sat under four times clear, which is why they
 * are not.
 *
 * Every part comes from `factions/directorate.mjs`; `trebleBody`,
 * `craftGun` and `claspLugs` were written for this hull and run here for
 * the first time.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 16;
const BODY = directorate.trebleBody;
const { segments: SEGMENTS, ridge: RIDGE } = BODY;

/** Where the shell's crown is at `(x, z)`, ridges included. */
const crown = (x, z) => directorate.tergiteCrown(SEGMENTS, x, z, RIDGE);
/** Where the shell's flank is at `(x, y)`, the same way. */
const rim = (x, y) => directorate.tergiteFlank(SEGMENTS, x, y, RIDGE);

const violet = directorate.ink.chitinViolet();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson();

const root = new THREE.Group();
root.name = 'directorate_treble';

// The body: three plates, violet, red, violet from the stern, each with
// the Dredge's ridge at a craft's lift.
directorate.tergites(root, { violet, red, black }, {
  segments: SEGMENTS,
  lip: 'ridge',
  ridge: RIDGE,
});

// The rostrum's point is the bow at +8, its base buried 5 m aft in the
// fore plate; the telson's base ring is the stern at −8, its apex buried
// 3 m forward in the stern plate, so the transom is 2.2 m across.
directorate.rostrum(root, red, BODY.rostrum);
directorate.telson(root, { violet, black }, BODY.telson);

// The gun, off the centreline to port on the fore plate (the header).
const { gun } = BODY;
directorate.craftGun(root, { steel, black }, {
  x: gun.x,
  y: crown(gun.x - gun.length / 2, gun.z) + 0.25,
  z: gun.z,
  r: gun.r,
  length: gun.length,
  mount: {
    size: [1.2, 0.6, 0.8],
    at: [gun.x - gun.length / 2 + 0.3, crown(gun.x - gun.length / 2, gun.z) - 0.05, gun.z],
  },
});

// Two dorsal spines, port on the stern plate and starboard on the middle,
// each with its base a hand into the shell. `dorsalSpines` refuses a
// mirrored pair; this rank never offers one.
const spine = (x, z, length) => [x, crown(x, z) + length / 2 - 0.3, z, length];
directorate.dorsalSpines(root, black, {
  spines: [spine(-3.4, -0.8, 1.8), spine(-0.6, 0.9, 2.2)],
  r: 0.32,
  rake: -0.3,
});

// The clasp lugs at the waist, where a cradle's clasps close.
directorate.claspLugs(root, steel, BODY.lugs);

// "Nearly black; navigation marks only": two marks, one aft to starboard
// and one forward to port, never answering across the keel — each laid on
// the shell's own slope at 0.55 of the half-beam, because a flat mark on a
// plate this small buries its uphill corner (`rimPhotophores`, #785).
directorate.rimPhotophores(root, crimson, {
  rim,
  crown,
  ranks: {
    s: { from: -4.4, pitch: 1, count: 1 },
    p: { from: 0.4, pitch: 1, count: 1 },
  },
  at: 0.55,
  size: 0.6,
  h: 0.3,
  sink: 0.1,
});

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'treble-directorate.glb');
