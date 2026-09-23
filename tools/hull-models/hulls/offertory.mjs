/**
 * The Offertory — the Order's carrier, 120 m (docs/units.md, "Offertory
 * (Slipway)").
 *
 * "UNIT — Offertory (pair with Hadron Knights): the carrier, 120 m — the two
 * that are brought up" (docs/asset-prompts-3d.md, Block 3, the carriers —
 * the block is written from this script, #840). Figures: SIG 18 idle, 48
 * cruise as cone figures, +35 at every launch; no gun at all; 520 hull;
 * 58 m/s; PR 2; 420 nodules and 40 Resonance Crystal; a flight of two
 * Versicles, launched only into the hull's own forward cone.
 *
 * Built, not ported (#840): no approved binary behind it, so every number
 * here is a decision. Metre-true at 120 with no root scale: the bow prism's
 * point is the bow at x 60 and the drive prism's base the stern at −60
 * (`metreTrue` asserts it).
 *
 * The argument is the Lance's cone spent on craft, and the plan says it in
 * three things, forward to aft: a deck the craft leave from, a guard that
 * draws the cone they may leave into, and a grip with the drive.
 *
 * - **The flight deck** (`cradleDeck`, new) is one faceted plate 1.2 m
 *   thick laid over the fore half of the crown from x 8 to 53 — 45 m of the
 *   120 and 32 across, the Antiphon's deck moved forward, because a
 *   Versicle leaves over the bow or not at all (§15, "Launching"). Its prow
 *   is chamfered at 45° either side of a flat nose 10 m across, so the deck
 *   comes to the bow as a wedge. Let into it side by side, their centres at
 *   x 28 and 7.6 m either side of the keel, are the two cradles: each a
 *   well cut to the Versicle's own plan (`hadron.VERSICLE_PLAN`) grown by
 *   0.8 m, point forward, 0.9 m deep to a floor in the Order's dark steel,
 *   and round it a pale-alloy coaming 0.8 m wide and 0.4 m tall. **The
 *   cradles are built empty** (#840; models-plan.md §3.5's states stop
 *   short of the carriers): a craft aboard is not an entity and a craft in
 *   the water is drawn as its own, so a Versicle modelled here would be
 *   drawn twice whenever the flight is out. What the
 *   cradle carries is the craft's outline instead — a dark dagger-shaped
 *   void in a pale frame — which from straight above is the one thing on
 *   the hull that says what it launches. The floor is darker than the deck
 *   and the craft both, so an empty cradle reads as empty by value and not
 *   as a craft sitting in it (Block 2b, rule 2).
 * - **The guard** is `wings` under the Lance's names: each blade's leading
 *   edge at exactly 45° to the keel, running out from under the deck's
 *   after corner at (8, ±16) to the tip at (2, ±22) — so the outline widens
 *   once at the deck and again at the guard and never narrows between them,
 *   the Antiphon's lesson — and the two, extended forward, cross on the keel
 *   at x 24, under the cradles: the wedge ahead of that apex is the cone,
 *   and it holds both cradles' mouths and the whole prow. The launch is
 *   refused outside it; the guard is where the plan says so. 44 m across,
 *   0.367 of the length, the widest thing on the hull, because on an Order
 *   hull the beam is wing. The strip along each leading edge is in the
 *   seam's unlit finish (`ink.crystalSeamUnlit`, `edge.mat`): the block
 *   lights it under way.
 * - **The grip** is the rung's blade — a four-facet spar pressed to 0.55 by
 *   1.6, the Antiphon's and the Cantus's section — fullest at 15 m in beam
 *   under the cradles and drawn to 2.7 m at x −53, where it closes inside
 *   the drive prism: a crystal point 10 m long with its base the stern,
 *   lifted 0.4 m so the after spine's end lies in it, "the drive in the
 *   spine".
 *
 * WHAT THE BLOCK DOES NOT SAY — decided here:
 *
 * - **The bow is the Cantus's.** A plain alloy point 14 m long ahead of the
 *   deck's nose, not an array: this hull has no gun at all, and the
 *   Antiphon's review settled that an unarmed Order hull ends in
 *   `bowPrism` — "the hull saying it has no array, in the place a Knight
 *   would look for one". Its navigation mark is on the deck's nose, on the
 *   centreline between the two sills.
 * - **The launch sills are the resting light.** The block's rest clause is
 *   the 16–35 band's; the Slipway, the yard this hull comes out of, lights
 *   its own launch sill at rest, and a carrier's sill is the same edge. So a
 *   crystal-seam strip 7.1 m long and 0.5 m wide lies along each prow
 *   chamfer ahead of its cradle — where the craft crosses the deck's edge,
 *   and forward, where the cone is loud (models-plan.md §3.3) — with the
 *   bow mark between them and one mark astern on the spine's crown: the
 *   band table's floor row licenses a mark at every band, and the Lance,
 *   whose gate this is, carries the same one.
 * - **What lights under way is built and clad.** The guard's leading edges
 *   and the crystal inlay on the fore spine — the ridge that runs forward
 *   between the two cradles to the prow — carry the seam's unlit finish
 *   (models-plan.md §3.2, rule 2). The launch is +35 on the hull, a
 *   transient, and nothing is modelled for it (rule 3).
 * - **The spine is in two pieces**, as the Antiphon's is, because the deck
 *   cuts it: the fore ridge stands on the deck between the coamings with
 *   its inlay; the after ridge comes out from under the deck's after edge
 *   and runs down the grip onto the drive, uninlaid.
 *
 * Resting light, all of it forward but for the one mark astern, and the
 * kit's audit clean: the two sills, 2.5 m² each facing up, the bow mark and
 * the stern mark, 1.0 each — 7.0 m² on 2,138 m² of plan (the bake's 34,201
 * mask px at 4 px/m). The bake at E(8.1) = 0.80 — the compass average of
 * the idle 18 (models-plan.md §3.3) — reads raw E 4.28 at the shipped
 * 4 px/m and dims by ×0.186 onto it (3.61 and ×0.223 at intake's 2 px/m),
 * with room either way. At 1 px/m, the squint the carriers are judged at,
 * the deck is 45 px of the 120 and each cradle a dark dart 24 px long in a
 * pale frame. 21 parts, 1,076 triangles, bounds x ±60, y −5.1..5.3, z ±22.
 */
import { THREE, exportGlb, metreTrue } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 120;
const BOW = L / 2;
const STERN = -L / 2;

/** The blade the Cantus and the Antiphon are cut to: a four-facet section pressed to 0.55 tall by 1.6 wide. */
const BLADE = [0.55, 1.6];

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const unlit = hadron.ink.crystalSeamUnlit();
const node = hadron.ink.resonanceNode();
// The cradle floor: the navy's dark steel (Block 2b's registry, the
// structures' `dark_steel` to the value), darker than the shadow-indigo deck
// so an empty cradle reads as a void from straight above.
const floor = hadron.ink.darkSteel();

const root = new THREE.Group();
root.name = 'hadron_offertory';

// The grip, and the body under all of it: 104 m of spar from inside the
// drive at x −53 to inside the bow prism at 51, fullest from x 16 to 32
// under the cradles, where its flat crown is 2.57 m up and the deck sits
// on it.
hadron.bladeBody(root, shadow, {
  profile: [
    [-53, 1.2],
    [-46, 2.6],
    [-34, 4.0],
    [-18, 5.2],
    [0, 6.0],
    [16, 6.6],
    [32, 6.6],
    [44, 5.4],
    [49, 3.2],
    [51, 1.4],
  ],
  facets: 4,
  flat: BLADE,
});

// The flight deck and its two cradles, empty, cut to the Versicle's plan;
// the sills along the prow chamfers ahead of them (the header).
const DECK_TOP = 3.8;
hadron.cradleDeck(
  root,
  { shadow, alloy, floor, seam },
  {
    outline: [
      [53, 5],
      [42, 16],
      [8, 16],
      [8, -16],
      [42, -16],
      [53, -5],
    ],
    y: DECK_TOP,
    t: 1.2,
    plan: hadron.VERSICLE_PLAN,
    cradle: { x: 28, z: 7.6 },
    clearance: 0.8,
    depth: 0.9,
    floor: { t: 0.4 },
    rim: { width: 0.8, t: 0.4 },
    sill: { a: [52.6, 5.4], b: [47.6, 10.4], width: 0.5, t: 0.3 },
  }
);

// The fore spine on the deck, between the coamings, with its inlay in the
// unlit finish — it lights under way, up the ridge to the prow.
hadron.spine(
  root,
  { alloy, crystal: unlit, seam },
  {
    profile: [
      [9, 0.3],
      [13, 1.1],
      [45, 1.1],
      [50, 0.3],
    ],
    y: 4.1,
    flat: [0.7, 1],
    inlay: {
      profile: [
        [15, 0.3],
        [18, 0.75],
        [41, 0.75],
        [44, 0.3],
      ],
      y: 4.6,
      flat: [0.5, 1],
    },
  }
);
// The after spine, from under the deck's after edge down the grip onto the
// drive's back.
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    name: 'blade_spine_aft',
    profile: [
      [-53, 0.3],
      [-50, 0.8],
      [-36, 1.8],
      [5, 2.0],
      [9, 0.4],
    ],
    y: 1.5,
    flat: [0.7, 1],
  }
);

// The bow: a plain alloy point, the Cantus's answer for an Order hull with
// no weapon, its tip the bow at x 60; the mark on the deck's nose.
hadron.bowPrism(
  root,
  { alloy, seam },
  {
    x: BOW - 7,
    r: 2.4,
    length: 14,
    mark: { size: [1, 0.4, 0.8], x: 51.6, y: DECK_TOP + 0.15 },
  }
);

// The guard: the leading edge at 45° from under the deck's after corner to
// the tip, the two lines crossing on the keel at x 24 under the cradles
// (the header); the strip along it in the unlit finish.
hadron.wings(
  root,
  { alloy, crystal },
  {
    name: 'guard_wing',
    edgeName: 'guard_edge',
    outline: [
      [8, 6],
      [18, 6],
      [2, 22],
      [-2, 20],
    ],
    t: 0.9,
    y: 1.9,
    edge: {
      mat: unlit,
      outline: [
        [8.5, 15.5],
        [2, 22],
        [1.248, 21.623],
        [7.934, 14.934],
      ],
      t: 1.3,
      y: 2.0,
    },
  }
);

hadron.finAndKeel(root, alloy, {
  fin: { x: -40, y: 3.0, length: 10, height: 4.5 },
  keel: { x: 10, y: -3.6, length: 30, height: 3 },
  t: 0.8,
});

// The drive: a crystal point in the spine's line, its base the stern at
// x −60; no ring, and the one mark astern on the after spine's crown.
hadron.drive(
  root,
  { shadow, crystal, node },
  {
    x: STERN + 5,
    y: 0.4,
    r: 3.0,
    facets: 4,
    taper: 0,
    length: 10,
    mat: crystal,
    ring: false,
    mark: { mat: seam, size: [1.0, 0.4, 0.8], x: -48.5, y: 2.05 },
  }
);

// Metre-true as drawn: 120 from the drive's base to the bow prism's point.
metreTrue(root, L, { drawn: L });

await exportGlb(root, 'offertory-hadron.glb');
