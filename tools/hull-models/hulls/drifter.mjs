/**
 * The Drifter — the Commune's transport, 62 m (docs/units.md, "The
 * transports"; #783, off #540 Phase 4).
 *
 * "The quiet way in, 62 m — two berths of hull at 90 m/s and SIG 10 (4 idle;
 * 10 cruise; 16 with a full hold; no weapon; 300 hull). A slim seed-pod hull
 * of grown shell, the two berths as a pair of swelling bays amidships under
 * a membrane that opens like a bivalve, a single muscle-drive fluke astern
 * and trim vanes rather than planes. Almost dark: a faint bioluminescent
 * seam along each bay, brightening only as it opens, and one navigation mark
 * at the bow." (as #783 amended it)
 *
 * Built to that block and not ported from a binary, which no Commune hull
 * has been since the Sower and the Spinner were re-run: the pod body, the
 * rings and the bays are the module's existing vocabulary, and the valves,
 * the seams, the vanes and the fluke are four builders added to
 * `factions/pelagia.mjs` for it (#783). Built in its resting state, as
 * docs/models-plan.md §3.5 says a stated hull is: the membranes shut, the
 * seam where the valves meet.
 *
 * What the script decided that the block, as first written, did not say —
 * the block was amended with the first two in #783:
 *
 * - **The fin is a fluke.** "A single muscle-drive fin astern" is one
 *   horizontal paddle spanning the keel, the tail every other Commune block
 *   calls a fluke (the Weaver's, the Reed's, the Blight's, the Bower's) and
 *   not a fish's vertical caudal. The plan outline is why: the hand-drawn
 *   outline this model replaces says the track reads as "a slim lens with
 *   the two bays as a swelling amidships and a single fin astern", and
 *   `outlines.mjs` cuts the widest thing at each station, so a fin that is
 *   to be read in plan has to have plan area. A vertical fin would leave
 *   the stern a bare taper and the fin a word.
 * - **A bow mark.** The block names no light but the two seams; the band
 *   table's floor row is "navigation marks only", which licenses a mark at
 *   every band (docs/asset-prompts-3d.md, "Glow encodes loudness"; #775 on
 *   the Responsory's marks), and a symmetric pair of seams says nothing
 *   about which way the hull is facing. One, smaller than the Spinner's
 *   two, on a bow 3.4 m across. It burns at strength 1, as the Spinner's
 *   two and the Chorister's do (spinner.mjs, chorister-pelagia.mjs), where
 *   the seams burn at a fifth (`SEAM` below): a mark is the one light the
 *   floor row licenses whole, and a mark dimmed with the seams would read
 *   as a third seam. In the conn view that is 0.618 luminance against a
 *   seam's 0.066 — the brightest thing on the quietest hull, and half a
 *   square metre of it.
 * - **Three vanes, none a pair.** "Trim vanes rather than planes" is two
 *   leaves forward where a submarine carries its bow planes, each its own
 *   size and rake, and one dorsal on the peduncle. The module refuses a
 *   matched pair, and the block's plural is what the third one answers to.
 * - **The bays are not quite a pair either.** The port bay is the longer
 *   and sits a metre and a half further aft; the starboard the fuller. The
 *   navy's rule that pods sit where they grew (`cargoLobes` refuses a
 *   matched pair) — a metre's difference at sprite scale, a grown thing at
 *   the conn view's.
 *
 * The valves are the one thing here that is a state made into geometry
 * (§3.5): two quarter-shells a bay, hinged at its waterline and meeting on
 * its crown, so that what parts when the bay opens is the seam, and the
 * seam is where the light is. The membrane's *opening* is a later band and
 * is not modelled (§3.2 rule 2): the valves are clad in the membrane
 * finish, unlit, and only the seam carries a lamp.
 *
 * The light: two `bay_seam_*` beads of `bio_vein` on the valves' crowns,
 * burning at a fifth of the Spinner's vein (`SEAM` below says why), and one
 * `nav_bow` of `bio_light`, every one on an upward face where the top-down
 * maps see it. The audit reads bay_seam_p 3.56 m², bay_seam_s 3.31 m²,
 * nav_bow 0.50 m² — 7.4 m² facing up on a 572 m² plan, nothing hidden. The
 * bake at E(4) = 0.60 reads raw E 5.75 → calibrated 0.61 at a gain of
 * ×0.105: the quietest hull in the roster, and the gain sits 6.7× above the
 * ×1/64 floor docs/models-plan.md §3.2 warns the quiet end about, and
 * under the SIG-8 Spinner's raw 7.56 by about the E(4)/E(8) the curve asks.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts); the file is drawn to it. */
const L = 62;
const BOW = L / 2;
const STERN = -L / 2;

/**
 * How faintly the seams burn: a fifth of the Spinner's vein. The bake dims
 * a map onto E(4) whatever the file says; the conn view does not — its
 * `recolor` keeps the file's `emissiveIntensity` and `applyLiveGlow` writes
 * that times the SIG factor (rosterModels.ts) — so there the fifth is a
 * fifth, linear: at strength 1 these two seams would burn as the Spinner's
 * vein does on a hull half as loud. The chart does not scale the same way.
 * page.html's emissive pass multiplies the colour by min(strength, 1) and
 * renders sRGB-encoded, so a fifth of the strength is 0.46 of the mapped
 * energy: at 1 the model measured raw E 11.32, half again the SIG-8
 * Spinner's 7.56; at this, 5.75, the seams alone 4.99 — still 1.6× the
 * SIG-6 Light Scout's 3.16 — and the calibration dims either onto 0.60.
 * "Faint" is the conn view's number, and the conn view is where it holds.
 */
const SEAM = 0.2;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const vein = pelagia.ink.bioVein(SEAM);
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'pelagia_drifter';

/**
 * The body's stations, [x, r] in metres: a seed pod, fullest a little
 * forward of amidships and drawn out long astern to the peduncle the fluke
 * grows from, closed to a point at the bow. 11.2 m across the waist and
 * 8.1 m tall — the navy's rule that beam is body, on a hull the block
 * calls slim: the Spinner's body is 15 m across on 55 m and its beam 21.5
 * over the sacs and fins, and the bays, not the body, are what make this
 * one wide.
 */
const SQUASH = 0.72;
const PROFILE = [
  [-25, 0.5],
  [-22, 1.5],
  [-18, 2.7],
  [-13, 4.0],
  [-7, 5.1],
  [-1, 5.55],
  [4, 5.6],
  [10, 5.3],
  [16, 4.5],
  [22, 3.2],
  [27, 1.7],
  [30, 0.6],
  [BOW, 0.12],
];

/** The body's radius at `x`, off the profile — where a ring or a mark sits on it. */
const rAt = (x) => {
  for (let i = 1; i < PROFILE.length; i++) {
    const [x0, r0] = PROFILE[i - 1];
    const [x1, r1] = PROFILE[i];
    if (x <= x1) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return PROFILE[PROFILE.length - 1][1];
};
/** The crown's height at `x`: the squashed radius, on the flat a fourteen-facet loft turns up. */
const crownAt = (x) => rAt(x) * SQUASH * Math.cos(Math.PI / 14);

pelagia.podBody(root, chitin, { squash: SQUASH, facets: 14, profile: PROFILE });

// Four growth rings, two either side of the bays, each a 0.7 m ridge on
// fourteen facets cresting 0.45 m proud of the skin — the Spinner's are
// lathed to crest inside its body, an oddity its port keeps, and these are
// not — and each leaned its own way off square.
pelagia.growthRings(root, ridge, {
  stations: [13.5, 22.5, -11.5, -20].map((x) => [x, rAt(x) - 0.25]),
  squash: SQUASH,
  tube: 0.7,
  wobble: 0.07,
  ring: { rise: 0.7, facets: 14 },
});

// The two bays: a pair of swelling bays amidships, each an orb of chitin
// grown out of the flank, 18 and 16.8 m long and 7.8 and 7.6 across,
// reaching 8.1 and 7.9 m off the keel where the body reaches 5.6 — the
// widest thing on the hull, which is what the plan outline is cut from.
const BAYS = [
  { side: 'p', at: [1.0, -0.3, -4.2], radii: [9.0, 3.8, 3.9] },
  { side: 's', at: [2.5, -0.2, 4.1], radii: [8.4, 3.7, 3.8] },
];
pelagia.cargoLobes(root, chitin, {
  facets: [12, 6],
  lobes: BAYS.map(({ side, at, radii }) => [side, ...at, ...radii]),
});
// The membrane over each, shut: two valves meeting on the crown.
pelagia.bayValves(root, membrane, { bays: BAYS });

// Trim vanes rather than planes: two leaves forward off the flanks, the
// port one the larger, dipped 17° and 23°, and one standing on the
// peduncle. Each rooted a hand's breadth inside the skin, and each drawn
// round on seven corners — five read as a flap in the conn view's tilt.
pelagia.trimVanes(root, membrane, {
  vanes: [
    {
      side: 'p',
      root: [18.5, -0.4, -3.9],
      corners: [
        [1.4, 0],
        [2.3, 1.2],
        [1.7, 2.6],
        [0.2, 3.2],
        [-1.4, 2.8],
        [-2.1, 1.4],
        [-2.1, 0],
      ],
      roll: 0.3,
    },
    {
      side: 's',
      root: [17.0, -0.3, 4.0],
      corners: [
        [1.1, 0],
        [1.8, 1.0],
        [1.3, 2.0],
        [0.1, 2.5],
        [-1.1, 2.2],
        [-1.7, 1.1],
        [-1.7, 0],
      ],
      roll: 0.4,
    },
    {
      side: 'dorsal',
      root: [-15.5, crownAt(-15.5) - 0.3, 0],
      corners: [
        [1.9, 0],
        [2.0, 1.1],
        [1.2, 2.2],
        [-0.3, 2.7],
        [-1.8, 2.3],
        [-2.6, 1.2],
        [-2.6, 0],
      ],
      roll: -Math.PI / 2,
    },
  ],
});

// The single muscle-drive fluke: one paddle off the peduncle, 9.5 m across
// at its widest and drawn to the stern, its port lobe the shorter. 0.4 m
// between its faces with a 0.2 m bevel, so its waist stands 0.8 m thick and
// a bevel proud of the outline — which is why the outline stops 0.2 m short
// of the stern and the paddle lands on it.
const BEVEL = 0.2;
pelagia.driveFluke(root, membrane, {
  y: 0.2,
  t: 0.4,
  bevel: BEVEL,
  outline: [
    [-22.5, 0.9],
    [-25.0, 4.3],
    [-28.4, 4.8],
    [STERN + BEVEL, 1.8],
    [STERN + BEVEL, -1.2],
    [-28.0, -4.3],
    [-24.6, -3.9],
    [-22.5, -0.9],
  ],
});

// "Almost dark": a faint seam of vein along each bay's crown where the
// valves meet, and one bow mark. That is the whole resting light of the
// quietest hull in the roster.
pelagia.baySeams(root, vein, { bays: BAYS });
pelagia.navMarks(root, light, {
  marks: [['nav_bow', 27, crownAt(27) + 0.15]],
  w: 0.8,
  h: 0.4,
  d: 0.6,
});

await exportGlb(root, 'drifter-pelagia.glb');
