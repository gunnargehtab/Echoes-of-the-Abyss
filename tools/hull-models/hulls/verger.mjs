/**
 * The Verger — the Directorate's cohort transport, 100 m (docs/units.md,
 * "The transports"; the Verger block of docs/asset-prompts-3d.md Block 3).
 *
 * "The cohort's way down, 100 m — four berths of hull taken below the Shelf
 * line at PR-3 (SIG 14 idle, 26 cruise, 38 with a full hold; no weapon; 800
 * hull). A deep-pressure hull, ribbed and domed like the Precentor's, with
 * four cohort bays set into its belly behind pressure hatches low on the
 * flanks, a listening dome forward, ballast tanks flanking a heavy keel, and
 * a single ducted drive. Lit low and cold at the hatch rims and at a boss on
 * the dome's crown; the doors behind the rims stay dark until the bays are
 * occupied, when they glow through their hatches." (as #783 amended it)
 *
 * The first Directorate hull built rather than ported (docs/models-plan.md
 * §3.1), so every number here is a design and not a transcription, and the
 * hull is drawn metre-true at 100 m, bow at +50 and stern at −50, with
 * nothing to rescale. It carries no faction lock (§3.4): this file is the
 * kind's only model and serves every navy recoloured.
 *
 * The body is the Precentor's family at twice the beam: six overlapping
 * tergites, violet and red by turns from the stern, each with the
 * Precentor's seam — 0.35 of the half-length at 0.8 forward, standing a
 * little proud above and below (`tallOf: 'beam'`) so the plates read as
 * ribs — a short eight-sided rostrum, four dorsal spines alternating sides,
 * the studded listening dome forward with its smaller violet dome behind it
 * and off the centreline, and four photophores in a pattern that repeats on
 * neither side. No walking limbs: the block names none, and a hull that
 * "does not dive its cohort, it carries it" spends its underside on the
 * keel and the tanks instead.
 *
 * TWO THINGS THE BLOCK, AS FIRST WRITTEN, DID NOT SAY — decided here, and
 * written into it in #783:
 *
 * - **Where the belly is.** The chart bakes straight down and the conn
 *   view looks down at 55°, and a hatch on the underside of a hull is seen
 *   by neither. So the four bays open *low on the flanks*, one a plate on
 *   the four biggest plates, alternating sides from starboard as the
 *   tergite spines alternate — the navy's own rule, and never a mirrored
 *   pair — each seated 2 m below the hull axis where the shell's normal
 *   points outboard and 14–17° down, a 6 m steel collar standing 1.8 m
 *   proud of the shell. The keel and the two ballast tanks
 *   are under the belly proper, the tanks either side of the keel as the
 *   block has them, the starboard tank the longer and further aft. The
 *   hatch *rim* is the lit part, a torus, because a ring has a face at
 *   every angle: its top arc stands outboard of the plate's widest beam
 *   where the bake counts it, and its outboard arc reads from the conn
 *   view on either side. The door behind it is clad in the lamp family's
 *   unlit finish (`ink.biolightUnlit`) and never lit — "the bays glow
 *   through their hatches while they are occupied" is a later band, and a
 *   later band is cladding, not a lamp (models-plan.md §3.2).
 * - **What "the dome" lit means.** The dome is the chart's one upward
 *   emitter (§3.2, rule 5): not the dome itself as a lamp, which at 13 m
 *   across would be the whole light budget of a hull that idles at SIG 14,
 *   but a lit boss on its crown, `dome_crown`, 3.2 m across and facing
 *   straight up. The dome under it is chitin red and dark, as the
 *   Precentor's is.
 *
 * Four photophores are the navigation marks the band table licenses at
 * every band ("nearly black; navigation marks only"). Nothing astern is
 * lit: the block puts no light on the drive.
 *
 * The light budget, measured (`lightAudit`, printed by `exportGlb`): nine
 * lit parts, 25.3 m² facing up — the four rims 14.25 m² (3.5 to 3.75
 * each), the crown 7 m², the four marks 1 m² each — and the bake at
 * E(14) = 1.22 reads raw E = 6.21 and dims by ×0.195: a fivefold surplus,
 * twelve times clear of the ×1/64 floor it must not touch, and nowhere
 * near the ×64 ceiling a light-starved hull runs into. Rims first, the
 * dome second, the marks last — the block's own order.
 *
 * The hand-drawn outline this model retires (silhouettes.ts, "a rounded,
 * ribbed capsule … twice the beam, with the four bays reading as a belly")
 * was drawn blunter at both ends than a plate series with a rostrum and a
 * duct can be: 18 m of half-beam 12 m from the bow where the model has 11,
 * and 14 m at the stern's last 4 m where the duct is 6.5. The middle
 * carries the drawn 22 m at the two amidships plate centres, x = ±8, and
 * scallops between and beyond them — 18.6 m at x = 0, 19 m at the third
 * and fourth plates' centres — which is the plate series' own plan and
 * more this navy's than a parallel side would be; and the hatches add
 * their collars to the outline on alternating sides, which is the plan
 * §3.6 says an asymmetric hull generates as drawn.
 *
 * Every part comes from `factions/directorate.mjs`. The hatches, the keel,
 * the ducted drive, the crown lamp and the crown-height rule were written
 * for this hull and run here for the first time.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 100;
const BOW = L / 2;
const STERN = -L / 2;

/**
 * The six tergites, stern first: `[x, half-length, half-height, half-beam]`,
 * the scales the orbs are drawn at. Height is 0.6 of the beam (the bow
 * plate 0.58) — rounder than the Dredge's 0.4 and a little flatter than
 * the Precentor's 0.65 — because a pressure hull is round in section and
 * a hold is not a shovel. The two amidships plates match, so the plan
 * carries its full 44 m at both, scalloping to 37 m between them, and the
 * four bays read as one belly; the plates overlap by about a half-length,
 * as the Dredge's do, so the seams stand as ribs.
 */
const SEGMENTS = [
  [-34, 11, 9.6, 16],
  [-22, 13, 11.4, 19],
  [-8, 15, 13.2, 22],
  [8, 15, 13.2, 22],
  [23, 13, 11.4, 19],
  [34, 9, 7, 12],
];

/** The Precentor's seam, on the Precentor's rule (hulls/precentor.mjs). */
const SEAM = { at: 0.8, size: [0.35, 0.72, 0.9], tallOf: 'beam' };

/** Where the shell is at `(x, z)`, seams included, for seating a part on it. */
const crown = (x, z) => directorate.tergiteCrown(SEGMENTS, x, z, SEAM);

const violet = directorate.ink.chitinViolet();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson();
const unlit = directorate.ink.biolightUnlit();

const root = new THREE.Group();
root.name = 'directorate_verger';

// The body: six plates, violet and red by turns from the stern, each with
// the Precentor's seam standing proud as a rib. The rostrum's point is the
// bow at +50; its base is buried in the bow plate's nose and its root under
// that plate's seam, so the last six metres of it show, as the Precentor's do.
directorate.tergites(root, { violet, red, black }, { segments: SEGMENTS, seam: SEAM });
directorate.rostrum(root, red, { tip: BOW, r: 5, length: 14, facets: 8 });

// The listening dome forward, on the fifth plate's crown between the ribs
// of the fourth and fifth seams — 13 m across and 11 m tall, studded with
// six five-sided spines 4 m out and 4 m up — with the smaller violet dome
// behind it, off the centreline to port; and on its crown the lit boss that
// is the chart's upward emitter (the header). Seated 5 m into the plate so
// the ribs either side stand no higher than its shoulders.
directorate.listeningDome(root, { red, violet, black, crimson }, {
  x: 27,
  y: 11,
  r: 6.5,
  ry: 5.5,
  studs: { radius: 4, lift: 4 },
  aft: { x: 15, y: crown(15, -5) - 0.4, z: -5, r: 3.2, ry: 2.6 },
  crown: { r: 1.6, ry: 0.6 },
});

// Four dorsal spines on the four aft plates, alternating sides — 3 m to
// port, 4 m to starboard — 6, 7, 8 and 8 m long, numbered from the stern,
// raked 0.35 forward and cut five-sided, each with its base a metre into
// the shell;
// the tallest tops the dome's crown by 3 m, as the Chorister's tops its
// bladder dome.
// `dorsalSpines` refuses a mirrored pair; this rank never offers one.
const spine = (x, z, length) => [x, crown(x, z) + length / 2 - 1, z, length];
directorate.dorsalSpines(root, black, {
  spines: [spine(-38, -3, 6), spine(-22, 4, 7), spine(-6, -3, 8), spine(11, 4, 8)],
  r: 0.85,
  rake: -0.35,
});

// The four cohort bays: one hatch a plate on the four biggest plates,
// alternating sides from starboard, 2 m below the axis (the header says
// why there). Steel collar, dark door, lit rim, two black dogs.
directorate.pressureHatches(root, { collar: steel, door: unlit, rim: crimson, black }, {
  segments: SEGMENTS,
  y: -2,
  r: 3,
  proud: 1.8,
  hatches: [
    { side: 's', plate: 1 },
    { side: 'p', plate: 2 },
    { side: 's', plate: 3 },
    { side: 'p', plate: 4 },
  ],
});

// The heavy keel: a seven-sided spar 76 m long under the belly, 3.4 m
// forward to 3.8 m aft in radius and squashed 0.8 across, its bottom at
// −16.8 where the deepest plate reaches −13.2; and the two ballast tanks
// flanking it, steel capsules 2.8 m in radius 8 m either side of the keel
// at −12, half in the belly amidships and clear of it toward the ends —
// the starboard one 40 m and further aft, the port one 36 m and further
// forward, so the pair never mirrors.
directorate.keel(root, black, { x: -6, y: -13, radii: [3.4, 3.8], length: 76 });
directorate.ballastTanks(root, steel, {
  tanks: [
    { r: 2.8, length: 40, facets: [4, 10], ...directorate.laid([-10, -12, 8.5], [0, 0, Math.PI / 2]) },
    { r: 2.8, length: 36, facets: [4, 10], ...directorate.laid([-3, -12, -8], [0, 0, Math.PI / 2]) },
  ],
});

// The single ducted drive: a 13 m duct running 10 m forward from the stern
// at −50, the last 8 m of it clear of the stern plate's taper; inside it a
// black hub, 7.6 m across at its aft face and its point 10 m forward, and
// three steel vanes at 120°. Dark: the block lights nothing astern.
directorate.ductedDrive(root, { duct: violet, hub: black, vane: steel }, {
  stern: STERN,
  length: 10,
  r: 6.5,
  hub: { tip: STERN + 1, r: 3.8, length: 10 },
  vanes: { count: 3, phase: 0.5 },
});

// "Nearly black; navigation marks only": four photophores on the crowns,
// each seated on the shell (seams included) and none answering another
// across the keel.
const mark = (name, x, z) => [name, x, crown(x, z) - 0.1, z];
directorate.photophores(root, crimson, {
  spots: [
    mark('photophore_0', -40, 4),
    mark('photophore_1', -18, -7),
    mark('photophore_2', -2, 8),
    mark('photophore_3', 38, -5),
  ],
});

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'verger-directorate.glb');
