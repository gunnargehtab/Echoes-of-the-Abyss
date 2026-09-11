/**
 * The Precentor — the Directorate's ears on the move, 60 m (docs/units.md,
 * "The rung, and two hulls a navy").
 *
 * "A hull that is only ears (SIG 12 idle; HYD 95, the cap; no weapon). Short
 * segmented body carrying a hydrophone array athwartships, so the plan is a
 * cross and the hull is broader than it is long amidships: ranks of spines
 * along the boom, the port rank one longer, a studded listening dome, folded
 * walking limbs. Nearly black: four photophores in a pattern that repeats on
 * neither side."
 *
 * So it is the navy's segment series cut short — four plates rather than the
 * Dredge's five — with everything else on the hull spent on hearing. Every
 * part comes from `factions/directorate.mjs`; this file is the first consumer
 * that module has ever had, and the second is the Dredge beside it.
 *
 * Two things the prompt calls out are load-bearing rather than decorative, and
 * both are held by the builders rather than by numbers typed here:
 *
 * - **The starboard rank is one longer.** Six hydrophones to starboard against
 *   five to port — the block above says port; the approved model was named
 *   and read with +z as port, #642 settled +z as starboard, and a port keeps
 *   the model while the call is filed off that issue — which is why
 *   `arrayBoom` throws on matched ranks: "asymmetric,
 *   yet regimented" is the navy's whole rule, and a boom that balanced would
 *   read as an Order sensor mast.
 * - **The plan is a cross, and it stays X-long by 20 m rather than 60.** The
 *   boom spans 44 m against a 64 m body, so intake's yaw-the-longer-axis-onto-
 *   +X rule still lands the hull correctly — but lengthening the boom or
 *   shortening the body would turn this hull a quarter turn on every map.
 *
 * Every number below is the approved binary's own, read off its vertices
 * rather than its bounding boxes (#638). The first port fitted several parts
 * to their boxes and matched the boxes while missing the shape: a 7 m limb
 * tapering 0.7 m to 0.5 m read as a straight 6.9 m one at a shallower fold —
 * the same box to the centimetre and a sixth more surface — and the spines
 * gained a facet each. Where the module's rule is not this hull's (the seam,
 * the socket, the spines' cut and rake, the domes' heights) the hull passes
 * its own numbers and the module's defaults stay the Chorister's.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

/**
 * The design length (HULL_LENGTH_M, silhouettes.ts) and the length the
 * approved export was actually drawn at, rostrum tip to telson.
 *
 * The two disagree because the rostrum was measured off the first plate
 * rather than off its point, so intake and the runtime have both been
 * squeezing this hull by 0.938 since it landed. The numbers below are the
 * approved model's own — they are what `directorate.mjs`'s header transcribes
 * — and the root carries that one squeeze, which makes the file metre-true
 * (kit.mjs) and leaves the shipped maps exactly where they were.
 */
const L = 60;
const DRAWN = 64;

/**
 * The four tergites, stern first: `[x, half-length, half-height, half-beam]`,
 * the approved model's own stations — the scales its orbs are drawn at. On
 * this hull those are also the plates' half-extents, because an `orb(12, 6)`
 * carries a vertex on every axis and reaches its full radius on all three,
 * unlike the Dredge's `orb(14, 7)` (#630); the seam fractions below are
 * hung off them and hold either way. Stated rather than generated, because
 * `segmentSeries`'s profile swells aft of amidships and this hull's plates
 * peak at the third — the model is what the port transcribes, not the curve.
 */
const SEGMENTS = [
  [-22, 6, 2.73, 4.2],
  [-11, 7.5, 3.38, 5.2],
  [1, 8, 3.64, 5.6],
  [13, 6.5, 3.12, 4.8],
];

const violet = directorate.ink.chitinViolet();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson();

const root = new THREE.Group();
root.name = 'directorate_precentor';
root.scale.setScalar(L / DRAWN);

// The body: four overlapping plates with a seam each, alternating violet and
// red from the stern. No spines off them — this hull's back carries a dorsal
// rank of its own, and a plate spine as well would crowd the dome. The seam
// is this hull's own rather than the module's: 0.35 of the half-length,
// centred 0.8 forward, and 0.7 of the half-beam tall on plates that are 0.65
// of it — so it stands a little proud of its plate above and below instead
// of sinking under the one ahead.
directorate.tergites(root, { violet, red, black }, {
  segments: SEGMENTS,
  seam: { at: 0.8, size: [0.35, 0.7 / 0.65, 0.9] },
});
directorate.rostrum(root, red, { tip: 30, r: 3.2, length: 12, facets: 8 });
directorate.telson(root, { violet, black }, { tip: -34, r: 2.5, length: 8 });

// The hydrophone array, and the hull's argument: 44 m of boom across a 64 m
// body, six sockets to starboard against five to port. `arrayBoom` refuses
// matched ranks, so the asymmetry cannot be lost to a tidy edit. The spines'
// centres sit 3 m and 3.7 m over the boom's axis — the short one's base on
// the axis, the long one's 5 cm under it — each in a 1.6 m square socket,
// and the sleeve where the boom passes the body is 1.9 in radius exactly,
// not the 1.46 · r the module transcribed it as (2 mm short).
directorate.arrayBoom(root, { steel, black, red }, {
  x: 0,
  y: 2.5,
  halfSpan: 18,
  starboard: 6,
  port: 5,
  z0: 5,
  pitch: 2.6,
  sleeveR: 1.9,
  seat: [3, 3.7],
  socket: 'box',
});

// The listening dome forward of the boom, 5.5 m by 4.2 m, studded with six
// five-sided spines in a ring 3.2 m out and 3.4 m up, and the smaller violet
// dome behind it, 2.6 m by 2.2 m — set off the centreline, because nothing
// on this navy is centred.
directorate.listeningDome(root, { red, violet, black }, {
  x: -3,
  y: 3.2,
  r: 5.5,
  ry: 4.2,
  studs: { facets: 5, radius: 3.2, lift: 3.4 },
  aft: { x: -14, y: 3.6, z: -3.5, r: 2.6, ry: 2.2 },
});

// Four dorsal spines lengthening toward the bow by half a metre a station,
// alternating sides at 11 m — 1.5 m to port, 2 m to starboard — raked 0.35
// forward and cut five-sided. `dorsalSpines` refuses a mirrored pair; this
// rank never offers one.
directorate.dorsalSpines(root, black, {
  spines: [
    [-20, 4.5, -1.5, 4.5],
    [-9, 4.5, 2, 5],
    [2, 4.5, -1.5, 5.5],
    [13, 4.5, 2, 6],
  ],
  rake: -0.35,
  facets: 5,
});

// The walking limbs, folded under the flanks: two matched ranks of three, 7 m
// long, tapering from 0.7 m at the root to 0.5 m at the tip, folded 0.4 rad —
// the one place on the hull where a mirrored pair is the rule rather than the
// error. Matched in rule, not in result: the approved model turns the
// port rank the other way about, roots outboard, and the script keeps it.
directorate.limbs(root, steel, { xs: [-14, -4, 6], y: -1, z: 7.5, r: [0.7, 0.5], length: 7, fold: 0.4 });

// "Nearly black": four photophores, and that is the whole light budget of a
// hull that idles at SIG 12. None of them answers another across the keel.
directorate.photophores(root, crimson, {
  spots: [
    ['photophore_0', 12, 3.8, 3],
    ['photophore_1', -8, 5.2, -4.5],
    ['photophore_2', -20, 3.9, 2],
    ['photophore_3', 4, 4.6, -6],
  ],
});

await exportGlb(root, 'precentor-directorate.glb');
