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
 * - **The body is the family's blade** (`bladeBody`): a four-facet spar
 *   88 m from x −45 to 43, pressed 0.6 tall by 1.4 wide on 6.4 m of radius
 *   at its fullest, x −4 — 12.7 m in beam and 5.4 m tall, the Chorister's
 *   own section (its segments are `[0.6, 1.4]`) and a height-to-beam of
 *   0.43 beside the Clarion's 0.37 and the Antiphon's 0.34. A first cut
 *   put four berths' volume into a hexagon as tall as it was wide, 13 m
 *   on 14, and review read it as a barrel with a cone on it (B1): neither
 *   view rewards depth, and no approved Order body stands over 0.43. So
 *   the hold is the Chorister's framed segment at the Verger's length, and
 *   the four facets laid on a flat give the hull a vertical flank facet,
 *   5.4 m tall at the fullest station, which is where a hatch goes.
 * - **Four hatches, two mirrored pairs** (`pressureHatches`), on that flank
 *   facet at x 2 and 16, half a metre under the axis: six-facet alloy
 *   collars 1.9 m in radius standing 1.4 m proud and sunk 0.7, each with a
 *   dark door and a lit rim, the rim's ring a hexagon like the collar's.
 *   The Directorate's Verger alternates its four hatches from starboard,
 *   the Listening's rule; the FACTION block makes this navy "the only
 *   faction with" precise bilateral symmetry, and the approved Chorister
 *   follows its faction block over the kind's asymmetric photophores
 *   (hulls/chorister-hadron.mjs). So here the Verger's four are two pairs,
 *   as that header's reasoning says they must be. Both pairs sit forward
 *   of amidships, in the full section, because an Order hull is lit from
 *   the bow back and dark astern (every Order block): the rims are the
 *   hull's flank light and they are its forward half's. "Low on the
 *   flanks": the collar's centre is 0.5 m under the axis on a flank 5.2 m
 *   tall there, its foot 0.2 m over the chine — the Directorate's is 2 m
 *   under on a hull 26 m tall, the same two fifths up from the keel.
 * - **Three pressure ribs** (`pressureRibs`): square alloy hoops hugging
 *   the blade at x −6, 9 and 23 — one abaft the after pair, one between
 *   the pairs, one ahead of the forward pair — so the bays read as held
 *   between frames. Each passes through the spine's base at the crown,
 *   hidden in it, and the two amidships land on the keel under the belly:
 *   the keel runs x −34 to 20, both hoops' lower runs cross its sunk top
 *   inside its width, and 0.19 m of each shows on the keel's flank where
 *   the belly falls away. Nothing else crosses a hoop (the pods end 0.65 m
 *   short of the after one).
 * - **The listening dome** (`listeningDome`) is a crystal cut stone on the
 *   crown's flat at x 30: a dome of 3.4 m pressed 0.9, six facets round
 *   and two down, sunk 0.6 and drawn past its equator so its skirt is
 *   inside the hull, and on its pole the lit boss, a four-sided point
 *   1.2 m in half-diagonal and 1.0 m tall with its base sunk 0.45 under
 *   the pole.
 * - **Ballast tanks flanking a heavy keel**: the block's literal tanks,
 *   two four-facet alloy pods (`ballastPods`) 22 m long on 1.3 m of radius
 *   under the belly either side of the keel, x −32 to −7 at z ±2.8, their
 *   axes sheared to the belly line 0.6 m under it so their tops are sunk
 *   0.3 m the whole way; and the keel a four-facet alloy spar (`spar`,
 *   sheared) 54 m long between them, pressed 1.1 tall by 0.45 wide on
 *   1.6 m, its axis a metre under the belly at every station, so its top
 *   is sunk and its bottom hangs 2.8 m under the hull amidships. Neither
 *   the chart nor the conn camera sees under a flat belly, so the tanks
 *   and the keel show in no game view, as the Directorate's do not
 *   (hulls/verger.mjs, "a keel is a side-elevation feature and shows on no
 *   map"); they are here because the block names them, and the inspect
 *   sheet's bow and stern three-quarters show them under the chine. A
 *   first cut hung alloy pods on the flanks under the wing roots and
 *   claimed the conn view saw them; review measured 7 m² of a 53 m²
 *   footprint clear of the wing and a 6 m sliver in the conn view, 7 m
 *   from the keel they were said to flank (B2). The block's placement is
 *   the honest one.
 * - **The ducted drive** (`ductedDrive`): a six-facet shadow-indigo duct
 *   9 m long on the stern, 3.0 m outside and 2.3 inside, with a crystal
 *   point for a hub, its base the stern and its tip inside the body's
 *   tail, and two alloy vanes at the beam. The body closes to a point at
 *   x −45 inside the hub, and the duct's forward face meets the body's
 *   flanks at x −41, where the body stands 0.1 m into the wall at the
 *   beam. Dark: the block lights nothing astern.
 *
 * And the family's parts the block does not name, which every Order hull
 * carries (the Herald's header, same reasoning): a spine with a crystal
 * inlay along the crown, sheared to follow it (`spar`, the Antiphon's after
 * ridge) from x −41 to 38, standing 0.5 m proud and 2 m wide; swept guard
 * wings with crystal edge strips aft, 0.9 m thick at y 0.4, 21 m to the
 * tip — the hull's beam, 42 m, is wing; a dorsal fin on the spine at x
 * −31..−23; and the Cantus's answer to an unarmed Order bow, a plain alloy
 * point with one mark 6 m ahead of the dome, between it and the prism
 * (hulls/antiphon.mjs: no array, "no weapon").
 *
 * Resting light: the four rims, the dome boss and the bow mark — the
 * block's "lit low and cold at the hatch rims and at a boss on the dome's
 * crown", and the band table's licence for a mark at every band. Nothing
 * astern, nothing on the wings, the doors clad in the lamp's unlit finish.
 * Figures measured (`lightAudit`, printed by `exportGlb`; the intake bake):
 * six lit parts, 14.1 m² facing up — the four rims 2.6 to 2.7 m² each,
 * the boss 2.5, the mark 1.0 — every one resting on what is under it, none
 * hidden. 14.1 m² on 1,496 m² of plan (the bake's 5,982 mask px at 2 px/m).
 * The bake at E(14) = 1.22 reads raw E 8.54 and dims by ×0.143: nine times
 * clear of the ×1/64 floor the quiet end must not touch, and nowhere near
 * the ×64 ceiling a light-starved hull runs into. Rims first, the boss
 * second, the mark last — the block's own order. 34 parts, 954 triangles,
 * bounds x ±50, y −5.0..6.8, z ±21.
 *
 * FACETS and PANELS (Block 2c; `node tools/hull-models/facets.mjs hadron`):
 * no ring off the rule. The body, the
 * ribs' rings, the spine, inlay, keel, pods, bow prism, hub and boss are
 * the diamond (the body read at 9.0 m, its pressed beam); the dome six
 * round and two down; the collars, doors, duct and rims six; the rim and
 * rib tubes four. The median unlit part from above is 3.2 m on a side over
 * eighteen, inside the hulls' 2–6 m band, so the hull carries no seams: a
 * rib, a collar and the dome each divide the plan where a seam would.
 *
 * Contacts (`node tools/hull-models/contacts.mjs verger-hadron`): 53 pairs,
 * every one a mount — each part on the body it is seated in or rooted
 * under; the ribs through the spine's base and the inlay inside it, hidden
 * in the part they cross, and landing on the keel's sunk top; each door's edge
 * inside its rim's tube; the hub, the vanes and the duct's forward face on
 * the body's tail; the boss on the dome's pole. No lamp is hidden and none
 * floats (`exportGlb`, no warning).
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 100;
const BOW = L / 2;
const STERN = -L / 2;

/** The hold's section: the Chorister's blade, four facets pressed 0.6 tall by 1.4 wide. */
const HOLD = [0.6, 1.4];
/** A four-facet spar's flat is at cos 45° of its radius (`spar`, "four facets sit on a flat"). */
const FLAT = Math.SQRT1_2;

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
  [-32, 4.7],
  [-20, 6.0],
  [-4, 6.4],
  [12, 6.3],
  [24, 5.5],
  [34, 3.8],
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
/** The crown's height at `x`: the blade's top flat under the press; the belly is its mirror. */
const crown = (x) => radius(x) * FLAT * HOLD[0];

hadron.bladeBody(root, shadow, { profile: BODY, facets: 4, flat: HOLD });

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
// the spine's flat top ahead of the dome, between it and the prism — the
// Cantus's answer for an Order hull with no weapon (the header).
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

// The listening dome on the crown's flat at x 30, sunk 0.6 into the body
// so its skirt, drawn past the equator, is inside the hull; the lit boss
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

// Three pressure ribs hugging the blade (the header).
hadron.pressureRibs(root, alloy, {
  stations: [-6, 9, 23].map((x) => [x, radius(x)]),
  tube: 0.35,
  lift: 0.1,
  flat: HOLD,
  facets: 4,
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
      [2, -0.5],
      [16, -0.5],
    ],
    r: 1.9,
    proud: 1.4,
    sink: 0.7,
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
    y: 0.4,
    edge: {
      outline: [
        [-33, 20],
        [-24, 21],
        [-23.6, 19.9],
        [-32.2, 18.9],
      ],
      t: 1.4,
      y: 0.55,
    },
  }
);

// The ballast pods under the belly either side of the keel, each sheared
// to the belly line so its top is sunk 0.3 m the whole way (the header).
const belly = (x, sunk) => -crown(x) - sunk;
hadron.ballastPods(root, alloy, {
  profile: [
    [-32, 0.3, belly(-32, 0.4)],
    [-29, 1.3, belly(-29, 0.6)],
    [-20, 1.3, belly(-20, 0.6)],
    [-10, 1.3, belly(-10, 0.6)],
    [-7, 0.3, belly(-7, 0.4)],
  ],
  y: 0,
  z: 2.8,
});

// The heavy keel: a four-facet alloy spar under the belly, its axis a metre
// under the belly line at every station it crosses, so it is sunk the whole
// way and hangs 2.8 m under the hull amidships (the header).
hadron.spar(root, 'keel', alloy, {
  profile: [
    [-34, 0.3, belly(-34, 0.4)],
    [-30, 1.6, belly(-30, 1)],
    [-20, 1.6, belly(-20, 1)],
    [-4, 1.6, belly(-4, 1)],
    [12, 1.6, belly(12, 1)],
    [20, 0.3, belly(20, 0.4)],
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
    r: 3.0,
    wall: 0.7,
    hub: { r: 1.8, length: 9 },
    vanes: { x: -45.5, z: 1.55, chord: 2.4, t: 0.3, span: 1.9 },
  }
);

await exportGlb(root, 'verger-hadron.glb');
