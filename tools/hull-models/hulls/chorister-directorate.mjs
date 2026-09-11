/**
 * The Chorister, the Directorate's own — 50 m (docs/units.md; the Chorister
 * block of docs/asset-prompts-3d.md Block 3, which pairs the kind with the
 * Directorate and calls this "the Directorate's own plan"; the other three
 * navies field the same plan in their own shape language, and this model
 * is the kind's canonical one).
 *
 * "The cohort hull, 50 m — the shortest and cheapest hull in the roster,
 * grown chitin over a pressure bladder (SIG 16 idle, 24 cruise). Three
 * overlapping segments with the bladder showing through the middle one as
 * a paler dome, a rostrum, a telson, folded walking limbs, one small
 * dorsal spine-gun off the centreline. Dim: a short row of photophores
 * along one flank and one on the other, in a pattern that repeats on
 * neither side." Three tergites, violet, red and violet, each with its
 * dark seam sunk under the plate ahead; the bladder dome off the
 * centreline on the middle one; a six-sided rostrum and a six-sided
 * telson, two tail spines splayed off it; three dorsal spines alternating
 * sides; six walking limbs in two matched ranks, tapered and folded 0.45;
 * the spine-gun and its mount, to port; and five photophores — four along
 * the starboard flank and one to port — which are the whole resting light
 * of a hull that idles at SIG 16.
 *
 * A port of the approved export
 * (docs/concept-art/models/chorister-directorate.glb at 3e15409), part for
 * part in its order, every number the export's own. Every part comes from
 * the hull vocabulary at the top of `factions/directorate.mjs` — the
 * Dredge's and the Precentor's builders, with `bladderDome` and `spineGun`,
 * written for this hull and run here for the first time (`spineGun` needed
 * the file's taper and its mount's own station; `bladderDome` reproduces
 * the file as written). Its five materials are the Dredge-era `ink` names
 * at the Dredge's values exactly, so nothing is added.
 *
 * THE FILE IS X-LONG: an r169 export of the early pass that drew the
 * Dredge and the Precentor, bow on +x with the hull axis at y = 0, 59 units
 * long for a 50 m hull. So nothing here is yawed — every part is placed
 * with kit `add`, through the builders, in the export's own frame, as
 * hulls/dredge.mjs is — and `metreTrue` does what it does for the Z-long
 * kinds (hulls/light-scout-pelagia.mjs): scales the root to 50 m and
 * centres the length, which on this file runs from the telson's base at
 * −29 to the rostrum's point at 30, half a unit off centre. `DRAWN` is
 * that 59 as intake measures it, the parts' boxes; nothing overhangs
 * either end. `DATUM` is 0.
 *
 * THE SIDES (#642): the file names its sides the way the Dredge's and the
 * Precentor's exports did, with +z as port, and +z is starboard. So the
 * names are turned round here exactly as #642 turned the eleven
 * `bothSides` hulls' — every buffer stays in the file's order and only
 * the names change: the tail spine, the three limbs and the four
 * photophores the file has at +z as `_p` are written `_s`, and the one
 * tail spine, three limbs and one photophore at −z as `_p`. Nothing is
 * mirrored to make a name true; `diff.mjs` lists exactly those pairs as
 * moved, swapping z, and nothing else. Under the settled convention the
 * hull reads with its four-lamp row to starboard and its spine-gun to
 * port — its block names neither side, so it does not read against it.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 50;
const DRAWN = 59;
const DATUM = 0;

/**
 * The three tergites, bow first as the export numbers them:
 * `[x, half-length, half-height, half-beam]`, the scales its orbs are drawn
 * at — and their extents too, since an `orb(12, 6)` reaches its radius on
 * every axis (hulls/precentor.mjs). The seam under each is the module's
 * default, which was read off this file.
 */
const SEGMENTS = [
  [15, 8.5, 4.2, 7.5],
  [0, 9.5, 5.6, 9],
  [-16, 8.5, 4.2, 7.5],
];

const violet = directorate.ink.chitinViolet();
const red = directorate.ink.chitinRed();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson();

const root = new THREE.Group();
root.name = 'directorate_chorister';

// The body: three overlapping plates with a seam each, violet, red, violet
// from the bow, and the bladder showing through the middle one as a paler
// dome set 1 aft and 0.8 to starboard of the centreline.
directorate.tergites(root, { violet, red, black }, { segments: SEGMENTS });
directorate.bladderDome(root, violet, { x: -1, y: 3.4, z: 0.8, r: 5 });

// The rostrum, its point at 30; the telson, its base ring at −29 and its
// point buried forward in the last plate; and the two tail spines off it,
// base aft and point forward, splayed 0.4 off the keel 3.5 out.
directorate.rostrum(root, red, { tip: 30, r: 2.6, length: 8 });
directorate.telson(
  root,
  { violet, black },
  {
    tip: -29,
    r: 2.2,
    length: 6,
    tailSpines: { x: -23, y: 1, z: 3.5, r: 0.6, length: 5, splay: 0.4 },
  }
);

// Three dorsal spines, the middle one the tallest, alternating sides —
// 2 to port, 2.5 to starboard, 2 to port — raked 0.3 forward and cut
// five-sided.
directorate.dorsalSpines(root, black, {
  spines: [
    [13, 5.7, -2, 4],
    [-2, 7.1, 2.5, 5],
    [-18, 5.7, -2, 4],
  ],
  r: 0.7,
  rake: -0.3,
  facets: 5,
});

// The walking limbs: two matched ranks of three at 8 off the keel, 6 long,
// tapering 0.6 to 0.45, folded 0.45 — the one place the navy allows a pair.
directorate.limbs(root, steel, {
  xs: [-12, 0, 12],
  y: -1.2,
  z: 8,
  r: [0.6, 0.45],
  length: 6,
  fold: 0.45,
});

// "One small dorsal spine-gun off the centreline": 2.2 to port, tapering
// 0.7 to 0.5 toward the muzzle, on a mount at 15 — half a unit further aft
// than the module's rule, which is where the file has it.
directorate.spineGun(
  root,
  { steel, black },
  { x: 20, y: 3.6, z: -2.2, r: [0.7, 0.5], length: 9, mount: { x: 15 } }
);

// "A short row of photophores along one flank and one on the other": four
// down the starboard flank at 5.5 and 6.3 turn about, and one to port at
// 6.2 — in the file's order, the row first. `photophores` refuses a
// mirrored pair; this four-to-one is not one.
directorate.photophores(root, crimson, {
  spots: [
    ['photophore_s0', -14, 3, 5.5],
    ['photophore_s1', -5, 4, 6.3],
    ['photophore_s2', 4, 4, 5.5],
    ['photophore_s3', 13, 3, 6.3],
    ['photophore_p0', 6, 3.6, -6.2],
  ],
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'chorister-directorate.glb');
