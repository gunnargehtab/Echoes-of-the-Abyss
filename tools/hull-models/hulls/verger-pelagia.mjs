/**
 * The Verger, the Commune's — 100 m (docs/units.md, "The transports"; the
 * Verger block of docs/asset-prompts-3d.md Block 3, which pairs the kind
 * with the Directorate and, on the Chorister's rule, lets each navy field
 * it in its own shape language, read with the Pelagia FACTION block; #1438).
 *
 * "The cohort's way down, 100 m — four berths of hull taken below the Shelf
 * line at PR-3 (SIG 14 idle, 26 cruise, 38 with a full hold; no weapon; 800
 * hull). A deep-pressure hull, ribbed and domed like the Precentor's, with
 * four cohort bays set into its belly behind pressure hatches low on the
 * flanks, a listening dome forward, ballast tanks flanking a heavy keel,
 * and a single ducted drive. Lit low and cold at the hatch rims and at a
 * boss on the dome's crown; the doors behind the rims stay dark until the
 * bays are occupied, when they glow through their hatches." — said the
 * Commune's way: a seed-pod pressure hull ribbed with five growth rings,
 * the four bays as swelling lobes low on the flanks (the Drifter's bays at
 * a transport's scale), each with its hatch grown as a sphincter — a muscle
 * ring of ridge, a lit rim, a dark membrane valve; a sensory lobe forward
 * with its own ring and a lit bud on its crown for the dome; two bladders
 * either side of a ridge-spindle keel under the belly; a siphon astern for
 * the duct, with a shut membrane nozzle in its bore; three trim vanes, none
 * a pair; and two navigation marks.
 *
 * BUILT, not ported: there is no approved binary, so every number here is a
 * decision (docs/models-plan.md §3.1). Drawn metre-true at 100 m, bow at
 * +50 and the siphon's lip at −50, nothing to rescale — as hulls/verger.mjs
 * and hulls/drifter.mjs are. The decisions hulls/verger.mjs took for the
 * kind are kept and translated, not retaken: the bays open low on the
 * FLANKS and not the underside, because the chart bakes straight down and
 * the conn view looks down at 55°; the hatch RIM is the lit part, a ring
 * having a face at every angle; the dome's light is a boss on its crown and
 * never the dome. The sides alternate from starboard aft, s p s p, as the
 * Directorate's do.
 *
 * What the block does not say, decided here:
 *
 * - **"Ducted drive" is a siphon.** The Commune's drive is a muscle (the
 *   Drifter's fluke, the Weaver's); a duct the navy would grow is the jet
 *   a swimming thing drives with — a hollow lathe of chitin 12 m long with
 *   a muscle ring of ridge round its mouth and a shut membrane nozzle in
 *   its bore. One, on the keel line, as the block has it. Dark: nothing
 *   astern is lit.
 * - **The dome is a membrane lobe with a lit bud.** The Chorister's
 *   translation shows its bladder through the middle lobe as membrane
 *   (hulls/chorister-pelagia.mjs), and a listening organ that shows through
 *   the shell is the same thing: `listening_dome` in `algae_membrane`, 12 m
 *   across and sunk into the crown, with a growth ring and `dome_boss`, a
 *   `bio_light` bud 2.6 m across on its pole — the chart's one upward
 *   emitter, as the Directorate's crown boss is. Off the keel line 0.9 m to
 *   starboard: the navy grows nothing on the line.
 * - **The hatch door is a lens of `bio_vein_unlit`.** The rim is the vein
 *   family (`bio_vein`), so the door behind it wears that family's unlit
 *   finish, as the Directorate's doors wear `biolight_unlit` (models-plan.md
 *   §3.2 rule 2). It bulges 0.45 m through the rim, a valve shut.
 * - **The rims burn at 0.4, the boss and the marks at 1.** The Drifter's
 *   header says why a mark burns whole on a hull whose other lamps are
 *   faint (drifter.mjs `SEAM`): the conn view keeps the file's strength,
 *   and "low and cold" is the conn view's number. 0.4 is twice the
 *   Drifter's seams on a hull three and a half times as loud, and under the
 *   Sower's 1.
 * - **Two marks, bow and dorsal**, which the band table's floor row
 *   licenses at every band; the dorsal one at x −14, well forward of the
 *   drive the block keeps dark.
 * - **The keel is a spindle that follows the belly**, a sweep rather than a
 *   spar, so it hugs the skin where the Directorate's cylinder hangs under
 *   the plates' rise; and the bladders are chitin orbs, the starboard one
 *   the longer and further aft.
 *
 * THE LIGHT, measured (`lightAudit`, printed by `exportGlb`): seven lit
 * parts, 21.3 m² facing up — the four rims 3.94 to 4.44 m² (16.8 together),
 * the boss 3.13, the two marks 0.69 and 0.75 — nothing hidden and nothing
 * floating. Rims first, the dome second, the marks last: the block's own
 * order, and it was not so at the first cut. With the rim a torus in the
 * mouth behind a muscle ring that swelled wider than it, and the hatch
 * 1.2 m under the lobe's centre at 17° of cant, the four rims read 0.5 to
 * 0.94 m² from above: the ring's crown and the lobe's own overhang stood
 * over the rim's top arc. So the rim rides the crown's own station, where
 * it is the widest thing at the mouth (pelagia.mjs `bayHatches`), and the
 * hatches sit 1.7 to 1.9 m under their lobes' centres, canted about 25°
 * down. The bake at E(14) = 1.22 reads raw E = 6.17 and dims by ×0.197 —
 * the Directorate's Verger reads 6.21 and ×0.195 — a fivefold surplus,
 * twelve times clear of the ×1/64 floor and nowhere near the ×64 ceiling.
 *
 * CONTACTS (`contacts.mjs`): 46 pairs meet, every one a mount — each
 * ring, lobe, vane, mark, the dome, the keel, the bladders, the duct and
 * the nozzle on the body; the three hatch parts on each other and the ring
 * on its lobe; the amidships ring through the two lobes, the keel and both
 * bladders it girdles; the bow ring under the bow mark; the dome's ring
 * and boss on the dome. The port bladder sat 0.3 m into the port bay's
 * underside at the first cut and was dropped 0.6 m; the valves at the first
 * cut hung inside their bores a few centimetres clear of the ring, which
 * is a crack, and were widened to 5.9 m and seated so the lip passes
 * through the lens.
 *
 * FACETS (#919; pelagia.mjs `cut`): every round part is cut on the rule
 * and `facets.mjs --parts` names none. The body is sixteen round at 11.6 m,
 * the lobes sixteen by eight, the dome sixteen by eight, the hatch rings
 * fifteen a turn at 3.5 m with rims sixteen by five, the valves twelve by
 * six, the siphon duct sixteen and its nozzle thirteen, the boss five by
 * three. PANELS: the median unlit part from above is 3.95 m on a side over
 * twenty-one, a hatch ring (15.6 m²), inside the navy's 1.5–5 m band for a
 * hull. 36 parts, 4,208 triangles.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/** The design length (UNIT_STATS hullLengthM, silhouettes.ts); the file is drawn to it. */
const L = 100;
const BOW = L / 2;
const STERN = -L / 2;

/** How the rims burn against the marks (the header). */
const RIM = 0.4;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const vein = pelagia.ink.bioVein(RIM);
const unlit = pelagia.ink.bioVeinUnlit();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'pelagia_verger';

/**
 * The body's stations, [x, r] in metres: a seed pod fullest a little aft of
 * amidships — a pressure hull is round, and a hold is where the weight is —
 * drawn to a point at the bow and closed inside the siphon's bore astern.
 * 23.2 m across the waist and 18.6 m tall at a squash of 0.8, rounder than
 * the Drifter's 0.72: the navy's rule that beam is body, and a deep-pressure
 * hull's that a section is round.
 */
const SQUASH = 0.8;
const PROFILE = [
  [-43, 0.1],
  [-41, 2.2],
  [-39, 3.3],
  [-36, 4.6],
  [-30, 6.8],
  [-22, 9.0],
  [-12, 10.8],
  [-2, 11.6],
  [8, 11.5],
  [18, 10.4],
  [28, 8.2],
  [36, 5.6],
  [42, 3.2],
  [47, 1.2],
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
// The Commune's facet rule, a chord of 1.5 m (docs/asset-prompts-3d.md Block
// 2c; pelagia.mjs `cut`), asked in metres since the file is drawn in them.
const cut = pelagia.cut();
/** The body's count under the rule, as squashed: what the crown's flat is cut on. */
const FACETS = cut.lathe(PROFILE, { scale: [1, SQUASH, 1] });
/** The crown's height at `x`: the squashed radius, on the flat the loft turns up. */
const crownAt = (x) => rAt(x) * SQUASH * Math.cos(Math.PI / FACETS);
/** The belly's depth at `x`, the ideal section's. */
const bellyAt = (x) => -rAt(x) * SQUASH;

pelagia.podBody(root, chitin, { squash: SQUASH, profile: PROFILE, cut });

// Five growth rings, the ribs: two on the peduncle, one amidships under the
// bays, two on the bow, each a 0.8 m ridge cresting 0.55 m proud of the
// skin and leaned its own way off square.
pelagia.growthRings(root, ridge, {
  stations: [-35, -26, 4, 37.5, 44.5].map((x) => [x, rAt(x) - 0.25]),
  squash: SQUASH,
  tube: 0.8,
  wobble: 0.06,
  ring: { rise: 0.8 },
  cut,
});

// The four cohort bays: swelling lobes low on the flanks, 2.5 m below the
// axis, alternating sides from starboard aft, no two the same size — each
// an orb of chitin 19–21 m long reaching 12.4–13.6 m off the keel where the
// body reaches 11.6: the widest things on the hull, which the plan outline
// is cut from, on alternating sides as docs/models-plan.md §3.6 has it.
const BAYS = [
  { side: 's0', at: [-20, -2.5, 8.0], radii: [10.0, 4.6, 5.2] },
  { side: 'p1', at: [-6, -2.4, -8.4], radii: [10.5, 4.8, 5.4] },
  { side: 's2', at: [8, -2.6, 8.2], radii: [10.2, 4.7, 5.3] },
  { side: 'p3', at: [22, -2.5, -7.4], radii: [9.6, 4.4, 5.0] },
];
pelagia.cargoLobes(root, chitin, {
  lobes: BAYS.map(({ side, at, radii }) => [side, ...at, ...radii]),
  cut,
});

// The hatches: a sphincter on each lobe's outboard face, 1.2 m below the
// lobe's centre where the skin's normal points outboard and about 17° down,
// each its own distance along the lobe so no pair answers across the keel.
// Muscle ring 6.8 m across at its crown, lit rim 5.2 m across, membrane
// valve 5.1 m across bulging through it.
pelagia.bayHatches(
  root,
  { ring: ridge, rim: vein, door: unlit },
  {
    bays: BAYS,
    hatches: [
      { bay: 0, dx: 1.0, dy: -1.8 },
      { bay: 1, dx: -1.5, dy: -1.8 },
      { bay: 2, dx: 0.5, dy: -1.9 },
      { bay: 3, dx: -1.0, dy: -1.7 },
    ],
    proud: 2.0,
    sink: 1.6,
    throat: 0.4,
    crown: 3.5,
    lip: 2.75,
    rim: { r: 3.5, tube: 0.28 },
    door: { r: 2.95, squash: 0.3, sink: 0.15 },
    cut,
  }
);

// The listening dome forward: a sensory lobe of membrane on the crown at
// x 28, 12 m long, 8.4 tall and 10.8 across, sunk 1.8 m into the body, a
// growth ring 1.5 m forward of its centre, and on its pole the lit boss.
const DOME_X = 28;
pelagia.sensoryDome(
  root,
  { skin: membrane, ridge, light },
  {
    at: [DOME_X, crownAt(DOME_X) - 1.8, 0.9],
    radii: [6.0, 4.2, 5.4],
    ring: { dx: 1.5, crown: 5.6, shoulder: 5.0, halfWidth: 0.6 },
    boss: { r: 1.3, squash: 0.6, sink: 0.3 },
    cut,
  }
);

// The heavy keel: a ridge spindle under the belly from x −33 to 31, 3 m
// wide and 4.4 m deep at the waist, its back 0.8 m inside the skin the
// whole way, pointed at both ends.
pelagia.grownKeel(root, ridge, {
  stations: [
    [-33, 0, 0, bellyAt(-33) + 0.3],
    [-28, 0.6, 1.2, bellyAt(-28) - 1.2 + 0.8],
    [-20, 1.1, 1.9, bellyAt(-20) - 1.9 + 0.8],
    [-10, 1.4, 2.2, bellyAt(-10) - 2.2 + 0.8],
    [2, 1.5, 2.2, bellyAt(2) - 2.2 + 0.8],
    [14, 1.3, 2.0, bellyAt(14) - 2.0 + 0.8],
    [24, 0.9, 1.4, bellyAt(24) - 1.4 + 0.8],
    [31, 0, 0, bellyAt(31) + 0.3],
  ],
  cut,
});

// The ballast tanks: two bladders of chitin slung either side of the keel
// at −7.4 and −7.8, half in the belly and clear of the lobes above them,
// the starboard one 26 m long and further aft, the port 23 m and further
// forward.
pelagia.ballastBladders(root, chitin, {
  bladders: [
    { side: 's', at: [-7, -7.4, 4.2], radii: [13.0, 2.5, 2.3] },
    { side: 'p', at: [1, -7.8, -4.0], radii: [11.5, 2.3, 2.2] },
  ],
  cut,
});

// The single ducted drive, a siphon: a 12 m duct from the stern at −50,
// 9.8 m across at its lip and 8.8 at its root in the pod's tail, 1.3 m of
// wall; a muscle ring round the mouth at −48; and inside, the shut nozzle,
// a membrane frustum 6.4 m across forward and 3 m aft. Dark.
pelagia.siphonDrive(
  root,
  { duct: chitin, ring: ridge, funnel: membrane },
  {
    stern: STERN,
    length: 12,
    r: 4.9,
    wall: 1.3,
    root: { r: 4.4 },
    ring: { x: -48, crown: 5.5, shoulder: 4.7, halfWidth: 1.2 },
    funnel: { x: -39, r: 3.2, throat: 1.5, length: 7 },
    cut,
  }
);

// Trim vanes rather than planes: two leaves forward off the flanks, the
// port one aft of the starboard and the larger, dipped 17° and 23°, and
// one standing on the peduncle. Each rooted a hand's breadth inside the
// skin, each its own seven corners.
const vaneRoot = (x, sgn, dy = -0.4) => {
  const r = rAt(x);
  const z = r * Math.sqrt(1 - (dy / (r * SQUASH)) ** 2) - 0.3;
  return [x, dy, sgn * z];
};
pelagia.trimVanes(root, membrane, {
  vanes: [
    {
      side: 'p',
      root: vaneRoot(35, -1),
      corners: [
        [1.6, 0],
        [2.6, 1.4],
        [1.9, 3.0],
        [0.2, 3.7],
        [-1.6, 3.2],
        [-2.4, 1.6],
        [-2.4, 0],
      ],
      roll: 0.3,
    },
    {
      side: 's',
      root: vaneRoot(41, 1),
      corners: [
        [1.2, 0],
        [2.0, 1.1],
        [1.4, 2.3],
        [0.1, 2.8],
        [-1.2, 2.5],
        [-1.8, 1.2],
        [-1.8, 0],
      ],
      roll: 0.4,
    },
    {
      side: 'dorsal',
      root: [-31, crownAt(-31) - 0.3, 0],
      corners: [
        [2.0, 0],
        [2.2, 1.3],
        [1.3, 2.6],
        [-0.4, 3.2],
        [-2.0, 2.7],
        [-2.8, 1.4],
        [-2.8, 0],
      ],
      roll: -Math.PI / 2,
    },
  ],
});

// "Nearly black; navigation marks only": a bow mark on the crown forward
// and a dorsal one aft of the bays, a little to port, each dropped onto the
// body's own facet (`on`).
pelagia.navMarks(root, light, {
  marks: [
    ['nav_bow', 44, crownAt(44) + 0.5, 0],
    ['nav_dorsal', -14, crownAt(-14) + 0.5, -1.2],
  ],
  w: 0.9,
  h: 0.4,
  d: 0.7,
  on: 'pod_body',
});

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'verger-pelagia.glb');
