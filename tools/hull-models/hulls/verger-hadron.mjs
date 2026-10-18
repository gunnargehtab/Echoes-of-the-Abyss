/**
 * The Verger, the Order's — 100 m (docs/units.md, "The transports"; the
 * Verger block of docs/asset-prompts-3d.md Block 3, read with the Hadron
 * FACTION block on the Chorister's rule — "a navy rendering for one fields
 * it in its own shape language: the same cohort plan … with only the light
 * kept dim").
 *
 * "The cohort's way down, 100 m — four berths of hull taken below the Shelf
 * line at PR-3 (SIG 14 idle, 26 cruise, 38 with a full hold; no weapon; 800
 * hull). A deep-pressure hull, ribbed and domed like the Precentor's, with
 * four cohort bays set into its belly behind pressure hatches low on the
 * flanks, a listening dome forward, ballast tanks flanking a heavy keel, and
 * a single ducted drive. Lit low and cold at the hatch rims and at a boss on
 * the dome's crown; the doors behind the rims stay dark until the bays are
 * occupied, when they glow through their hatches."
 *
 * Built, not ported (#1438, on models-plan.md §3.4): the Order's variant of
 * a kind whose canonical model is the Directorate's (hulls/verger.mjs), drawn
 * from the module's vocabulary with no approved binary behind it, so every
 * number here is a decision, and this header says which ones the block did
 * not make. Metre-true at 100 with no root scale: the bow prism's tip is the
 * bow at x 50 and the duct's after face the stern at −50. The bake's SIG is
 * the kind's 14 (tools/hull-maps/models.mjs), not a cone figure: the
 * Verger's row is the Directorate's, and the variant takes the Chorister's
 * rule — the plan kept, the light kept at the Directorate's band.
 *
 * THE PLAN KEPT. Three decisions hulls/verger.mjs took for the kind stand
 * here, in the Order's shapes: the bays open low on the FLANKS, not under
 * the belly, because the chart bakes straight down and the conn view looks
 * down at 55°; the hatch RIM is the lit part, because a ring has a face at
 * every angle; and the dome's light is a boss on its crown, not the dome.
 *
 * THE SHAPES TRANSLATED. "Ribbed and domed like the Precentor's" is the
 * Directorate's language; the Order has none of it, and says the same plan
 * as a crystal held in a frame, which is how hulls/chorister-hadron.mjs
 * says its bladder:
 *
 * - **The body is a six-facet spar** (`bladeBody`, the hexagon the Order
 *   cuts at any size, Block 2c), 88 m from x −45 to 43, pressed 1.05 tall
 *   by 1.3 wide on 6.2 m of radius at its fullest, x −4: 14.0 m in beam and
 *   13.0 m tall. Not the rung's four-facet blade at 0.55 by 1.5: four
 *   berths need volume, the module's own rule is that beam is wing and a
 *   wide body is the slab this navy must never have, so the volume is in
 *   the section's depth — a beam-to-length of 0.140 against the Antiphon's
 *   0.144 and the Clarion's 0.121, and a hull as tall as it is wide. A
 *   hexagon with a vertex on the crown gives the hull a vertical flank
 *   facet, 6.5 m tall at the fullest station, which is where a hatch goes.
 * - **Four hatches, two mirrored pairs** (`pressureHatches`), on that flank
 *   facet at x 2 and 16, 0.4 m under the axis: six-facet alloy collars
 *   2.6 m in radius standing 1.6 m proud and sunk 0.8, each with a dark
 *   door and a lit rim. The Directorate's Verger alternates its four
 *   hatches from starboard, the Listening's rule; the FACTION block makes
 *   this navy "the only faction with" precise bilateral symmetry, and the
 *   approved Chorister follows its faction block over the kind's asymmetric
 *   photophores (hulls/chorister-hadron.mjs). So here the Verger's four are
 *   two pairs, as that header's reasoning says they must be. Both pairs sit
 *   forward of amidships, in the full section, because an Order hull is lit
 *   from the bow back and dark astern (every Order block): the rims are the
 *   hull's flank light and they are its forward half's.
 * - **Three pressure ribs** (`pressureRibs`): alloy hoops hugging the hex
 *   at x −6, 9 and 23 — one abaft the after pair, one between the pairs,
 *   one ahead of the forward pair — so the bays read as held between
 *   frames. Each passes through the spine's base at the crown and is
 *   hidden in it; nothing else crosses a hoop.
 * - **The listening dome** (`listeningDome`) is a crystal cut stone on the
 *   crown at x 30: a dome of 3.4 m pressed 0.9, six facets round and two
 *   down, drawn past its equator so its skirt tucks into the upper facets,
 *   and on its pole the lit boss, a four-sided point 1.2 m in half-diagonal
 *   and 1.0 m tall with its base sunk 0.45 under the pole.
 * - **Ballast tanks flanking a heavy keel**: two four-facet alloy pods
 *   (`ballastPods`) 21 m long on 1.8 m of radius low on the flanks under
 *   the wing roots, x −30 to −9 at z ±6.9 and y −2.6, their inboard flats
 *   against the vertical flank facet — alloy, not the body's indigo, since
 *   a first cut in indigo vanished against the flank in the conn view and
 *   the Directorate's tanks are steel against chitin for the same reason;
 *   and the keel a four-facet alloy spar
 *   (`spar`, sheared) 54 m long under the belly, pressed 1.1 tall by 0.45
 *   wide on 1.6 m, its axis a metre under the keel line at every station,
 *   so its top is sunk in the hull the whole way and its bottom hangs 2.8 m
 *   under it amidships. The pods are not under the belly, where the
 *   Directorate's are, because a pod under a hexagon's lower facets is
 *   seen by neither the chart nor the conn camera: the facet faces away
 *   from both.
 * - **The ducted drive** (`ductedDrive`): a six-facet shadow-indigo duct
 *   9 m long on the stern, 3.8 m outside and 3.1 inside, with a crystal
 *   point for a hub, its base the stern and its tip inside the body's
 *   tail, and two alloy vanes at the beam. The body closes to a point at
 *   x −45 inside the hub, and the duct's forward face meets the body's
 *   flanks at x −41, where the body stands 0.1 m into the wall at the beam.
 *   Dark: the block lights nothing astern.
 *
 * And the family's parts the block does not name, which every Order hull
 * carries (the Herald's header, same reasoning): a spine with a crystal
 * inlay along the crown, sheared to follow it (`spar`, the Antiphon's after
 * ridge) from x −40 to 38, standing 0.5 m proud and 2 m wide; swept guard
 * wings with crystal edge strips aft, 0.9 m thick at y 1.2, 21 m to the
 * tip — the hull's beam, 42 m, is wing; a dorsal fin on the spine at x
 * −31..−23; and the Cantus's answer to an unarmed Order bow, a plain alloy
 * point with one mark abaft it (hulls/antiphon.mjs: no array, "no weapon").
 *
 * Resting light: the four rims, the dome boss and the bow mark — the
 * block's "lit low and cold at the hatch rims and at a boss on the dome's
 * crown", and the band table's licence for a mark at every band. Nothing
 * astern, nothing on the wings, the doors clad in the lamp's unlit finish.
 * Figures measured (`lightAudit`, printed by `exportGlb`; the intake bake):
 * six lit parts, 17.8 m² facing up — the four rims 3.5 m² each, the
 * boss 2.5, the mark 1.25 — every one resting on what is under it, none
 * hidden. 17.8 m² on 1,590 m² of plan (the bake's 6,359 mask px at 2 px/m).
 * The bake at E(14) = 1.22 reads raw E 10.09 and dims by ×0.121: eight times
 * clear of the ×1/64 floor the quiet end must not touch, and nowhere near
 * the ×64 ceiling a light-starved hull runs into. Rims first, the boss
 * second, the mark last — the block's own order. 34 parts, 1,022 triangles,
 * bounds x ±50, y −8.8..9.7, z ±21.
 *
 * FACETS and PANELS (Block 2c; `node tools/hull-models/facets.mjs hadron`):
 * no ring off the rule. The body is the
 * hexagon (read at 7.7 m, its pressed beam), the spine, inlay, keel, pods,
 * bow prism, hub and boss the diamond; the dome six round and two down; the
 * ribs, collars, doors, duct and rims six, the rim and rib tubes four. The
 * median unlit part from above is 3.0 m on a side over twenty, inside the
 * hulls' 2–6 m band, so the hull carries no seams: a rib, a collar and a
 * pod each divide the plan where a seam would.
 *
 * Contacts (`node tools/hull-models/contacts.mjs verger-hadron`): 48 pairs,
 * every one a mount — each part on the body it is seated in or rooted
 * under; the ribs through the spine's base, the inlay inside it and the
 * keel's top, all hidden in the part they cross; the hub, the vanes and
 * the duct's forward face on the body's tail; the boss on the dome's pole.
 * No lamp is hidden and none floats (`exportGlb`, no warning).
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 100;
const BOW = L / 2;
const STERN = -L / 2;

/** The deep hull's section: a hexagon pressed 1.05 tall by 1.3 wide (the header). */
const HOLD = [1.05, 1.3];

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const unlit = hadron.ink.crystalSeamUnlit();
const cut = hadron.cut();

const root = new THREE.Group();
root.name = 'hadron_verger';

/**
 * The body's stations, stern first: fullest at x −4, closed to a point at
 * −45 inside the drive's hub and drawn in fast ahead of x 34 so the nose
 * sits inside the bow prism's base at 40.
 */
const BODY = [
  [-45, 0.3],
  [-40, 2.6],
  [-32, 4.6],
  [-20, 5.9],
  [-4, 6.2],
  [12, 6.1],
  [24, 5.3],
  [34, 3.7],
  [40, 1.2],
  [43, 0.5],
];
/** The body's radius at `x`, between its stations. */
const radius = (x) => {
  const k = BODY.findIndex(([sx]) => sx >= x);
  if (k <= 0) return BODY[Math.max(k, 0)][1];
  const [x0, r0] = BODY[k - 1];
  const [x1, r1] = BODY[k];
  return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
};
/** The crown's height at `x`: the hexagon's top vertex under the press. */
const crown = (x) => radius(x) * HOLD[0];

hadron.bladeBody(root, shadow, { profile: BODY, facets: 6, flat: HOLD });

// The spine and its inlay along the crown, each a four-facet ridge sheared
// to the crown's own rise and fall (a station's third number): the spine's
// axis 0.2 m under the crown at every body station, so it stands 0.5 m
// proud from the drive to the dome and on to the bow; the inlay's axis a
// tenth under the spine's flat top.
const SPINE_X = [-40, -32, -20, -4, 12, 24, 34];
const spineAxis = (x) => crown(x) - 0.2;
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    profile: [
      [-41, 0.3, spineAxis(-41)],
      ...SPINE_X.map((x) => [x, 1.4, spineAxis(x)]),
      [38, 0.3, spineAxis(38)],
    ],
    flat: [0.7, 1],
    inlay: {
      profile: [
        [-38, 0.3, spineAxis(-38) + 0.59],
        ...SPINE_X.slice(1, -1).map((x) => [x, 0.9, spineAxis(x) + 0.59]),
        [33, 0.3, spineAxis(33) + 0.59],
      ],
      flat: [0.5, 1],
    },
  }
);

// The bow: a plain alloy point, its tip the bow at x 50, and one mark on
// the spine's flat top abaft the dome — the Cantus's answer for an Order
// hull with no weapon (the header).
hadron.bowPrism(
  root,
  { alloy, seam },
  {
    x: BOW - 5,
    r: 2.2,
    length: 10,
    mark: { size: [1.0, 0.4, 0.8], x: 36, y: crown(36) + 1, on: 'blade_spine' },
  }
);

// The listening dome on the crown at x 30, sunk 0.6 into the body so its
// skirt, drawn past the equator, tucks into the upper facets; the lit boss
// on its pole (the header).
hadron.listeningDome(
  root,
  { crystal, seam },
  {
    x: 30,
    y: crown(30) - 0.6,
    r: 3.4,
    press: 0.9,
    boss: { r: 1.2, h: 1.0, sink: 0.45 },
  }
);

// Three pressure ribs hugging the hex (the header).
hadron.pressureRibs(root, alloy, {
  stations: [-6, 9, 23].map((x) => [x, radius(x)]),
  tube: 0.35,
  lift: 0.1,
  flat: HOLD,
});

// The four cohort bays: two mirrored pairs of hatches on the vertical flank
// facet, half a metre under the axis (the header says why pairs, and why
// forward). Alloy collar, dark door, lit rim.
hadron.pressureHatches(
  root,
  { collar: alloy, door: unlit, rim: seam },
  {
    on: 'blade_hull',
    hatches: [
      [2, -0.4],
      [16, -0.4],
    ],
    r: 2.6,
    proud: 1.6,
    sink: 0.8,
    tube: 0.35,
    cut,
  }
);

// Beam is wing, as on every Order hull: the guards, swept aft, their roots
// inside the body from x −38 to −12, the crystal edge a strip along the tip.
hadron.wings(
  root,
  { alloy, crystal },
  {
    name: 'guard_wing',
    edgeName: 'guard_edge',
    outline: [
      [-38, 2],
      [-12, 2],
      [-24, 21],
      [-33, 20],
    ],
    t: 0.9,
    y: 1.2,
    edge: {
      outline: [
        [-33, 20],
        [-24, 21],
        [-23.6, 19.9],
        [-32.2, 18.9],
      ],
      t: 1.4,
      y: 1.35,
    },
  }
);

// The ballast pods low on the flanks under the wing roots, their inboard
// flats against the flank facet (the header).
hadron.ballastPods(root, alloy, {
  profile: [
    [-30, 0.3],
    [-27, 1.8],
    [-12, 1.8],
    [-9, 0.3],
  ],
  y: -2.6,
  z: 6.9,
});

// The heavy keel: a four-facet alloy spar under the belly, its axis a metre
// under the keel line at every station it crosses, so it is sunk the whole
// way and hangs 2.8 m under the hull amidships (the header).
const keelAxis = (x, sunk) => -crown(x) - sunk;
hadron.spar(root, 'keel', alloy, {
  profile: [
    [-34, 0.3, keelAxis(-34, 0.4)],
    [-30, 1.6, keelAxis(-30, 1)],
    [-20, 1.6, keelAxis(-20, 1)],
    [-4, 1.6, keelAxis(-4, 1)],
    [12, 1.6, keelAxis(12, 1)],
    [20, 0.3, keelAxis(20, 0.4)],
  ],
  flat: [1.1, 0.45],
});

// The dorsal fin on the spine's flat top, abaft the wing roots: its base at
// the spine's top at x −31 and sunk into the climb of it forward.
hadron.finAndKeel(root, alloy, {
  fin: { x: -27, y: spineAxis(-31) + 0.49 + 2.25, length: 8, height: 4.5 },
  t: 0.8,
});

// The ducted drive on the stern, dark (the header).
hadron.ductedDrive(
  root,
  { duct: shadow, crystal, alloy },
  {
    x: STERN,
    length: 9,
    r: 3.8,
    wall: 0.7,
    hub: { r: 1.8, length: 9 },
    vanes: { x: -45.5, z: 1.75, chord: 2.4, t: 0.3, span: 2.3 },
  }
);

await exportGlb(root, 'verger-hadron.glb');
