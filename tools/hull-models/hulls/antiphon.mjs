/**
 * The Antiphon — the Order's transport, 110 m (docs/units.md, "Antiphon
 * (Slipway)").
 *
 * "The Order's way of arriving, 110 m — three berths of hull, and what it
 * lands, lands with +1 PR for twenty seconds (SIG 12 idle, 35 cruise ahead,
 * 3.5 astern; 44 ahead with a full hold; no weapon; 700 hull). A faceted
 * blade hull in the Clarion's family with a wide three-bay landing deck let
 * into its back, a crystal resonator ring around the deck that is the grant
 * made visible, swept guard wings, and the drive in the spine. Lit from the
 * bow back like every Order hull and dark astern; the resonator ring flares
 * when the deck opens." (docs/asset-prompts-3d.md, Block 3, the transports.)
 *
 * Built, not ported (#783, off #540 Phase 4): the first Order hull drawn from
 * the module's vocabulary with no approved binary behind it, so every number
 * here is a decision, and this header says which ones the block did not
 * make. Metre-true at 110 with no root scale: the emitter core's tip is the
 * bow at x 55 and the drive prism's base the stern at −55.
 *
 * The body is the rung's blade — a four-facet spar laid flat, the Cantus's
 * section of 0.55 by 1.6 — and it is a spar: 88 m long, 15.8 m in beam and
 * 5.4 m tall at its fullest station, a beam-to-length of 0.14 against the
 * Clarion's 0.13. Everything wider than that is a planar surface, which is
 * the module's rule for this navy, and there are two of them:
 *
 * - The landing deck (`landingDeck`) is one faceted plate, an elongated
 *   hexagon 36 m long and 34 m across, 1.2 m thick, laid over the crown
 *   from x 12 to −24 so the blade's back disappears under it; and the three
 *   bays are wells cut through it, 7.5 by 6.5 m each and 0.8 m deep to a
 *   pale-alloy floor. "Let into its back" is what the wells do; the deck
 *   itself is *on* the back, because a lathe cannot be cut, and the ring's
 *   rim is what makes the deck read as sunk between things taller than it.
 *   The three bays sit one forward on the centreline and two abeam aft
 *   rather than three abreast, because a circle encloses a triangle and not
 *   a row, and "precise bilateral symmetry" (Block 2) keeps one on the
 *   centreline; the beam still opens wide amidships for them, which is what
 *   the hand-drawn outline this model replaces said it must do, and the
 *   generated outline says it: flat at ±0.152 of the length from x 0.04 to
 *   −0.16, the ring's hexagon.
 * - The resonator ring (`deckRing`) lies flat around the three wells: an
 *   alloy ring 30 m across, its crystal inner ring inside it, both resting
 *   on the deck with 1 m of apron outside the ring at the flanks and 4 m at
 *   the nose and tail. It is a ring on its side where the Responsory's are
 *   canted shoulders, and it is the one thing on the hull an enemy's track
 *   will show that is not a blade. The crystal is `resonance_crystal` clad,
 *   not a lamp: the block flares it "when the deck opens", the resting bake
 *   is the state the chart shows, and a lamp dark at rest is a lamp this
 *   pipeline never shows (models-plan.md §3.2; the Responsory's header,
 *   twice).
 *
 * The guard wings are the Clarion's wing under the Cantus's name: swept
 * plates 0.9 m thick, 21 m to the tip, the crystal edge a strip along it and
 * no lamp. They run beside the deck rather than behind it — the root from
 * x −4 to −38 with the leading edge coming out from under the apron's flank
 * at its after corner and sweeping to the tip at x −22 — so that the
 * outline widens once, at the deck, and never narrows between the deck and
 * the wing: a first cut with the wings wholly aft of the deck left a waist
 * of 11 m between the two, and a plan that read as two hulls. They sit with
 * their top face against the deck's underside, not on the hull axis, so
 * they frame the deck as the block asks rather than carry the hull as the
 * Clarion's do.
 *
 * The bow carries the whole of the resting light, and the bow is an array —
 * a smaller horn than the Clarion's, its lip lit, an emitter crystal in its
 * mouth and the core standing 2 m proud of it, exactly the Clarion's idiom
 * at two-thirds the size. The block names no array among the parts and the
 * stat block says "no weapon"; what licenses one is the same stat block's
 * SIG — 35 ahead, 3.5 astern, a cone figure like every Order hull's
 * (docs/systems-echo.md §8) — because a hull that is ten times louder ahead
 * than astern is projecting something forward, and the Order's forward
 * projector is a horn. The Cantus has none because its 80 sings "in every
 * quarter"; the Antiphon's does not. So the horn is the cone made visible,
 * unarmed, and the block should say so (the report proposes the words).
 * There are no horn seams and no spine thread: the bake target is
 * E(5.4) = 0.66, the floor of the band table, "nearly black; navigation
 * marks only, barely visible".
 *
 * The spine is in two pieces because the deck cuts it: a fore ridge with
 * its crystal inlay from under the deck's nose to the horn, and an after
 * ridge from under the deck's tail down onto the drive prism, which is a
 * four-facet crystal point 10 m long lifted 0.4 m off the axis so the
 * ridge's end lies inside its base — "the drive in the spine". No ring, no
 * stern mark: the block says dark astern and stops, where the Clarion's
 * says "dark astern but for one mark", and 3.5 is the quietest quarter in
 * the navy.
 *
 * Resting light, all of it forward of the deck's centre, and the kit's
 * audit clean: the array lip, 9.6 m² facing up; the emitter core, 2.6; and
 * one navigation mark each side on the deck's forward shoulders, 0.75 each
 * — the family's licence at every band. 13.8 m² on 2,013 m² of plan. The
 * bake reads raw E 6.82 and dims by ×0.096 onto 0.66, six and a half times
 * above its ×1/64 floor and nowhere near the ×64 ceiling a light-starved
 * hull runs into. 23 parts, 1,340 triangles, bounds x ±55, y −5.2..5.6,
 * z ±21.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 110;
const BOW = L / 2;
const STERN = -L / 2;

/** The blade the Cantus is cut to: a four-facet section pressed to 0.55 tall by 1.6 wide. */
const BLADE = [0.55, 1.6];

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const node = hadron.ink.resonanceNode();

const root = new THREE.Group();
root.name = 'hadron_antiphon';

// The body: 88 m of spar from x −49 to 39, fullest at x −6 under the deck,
// closed to a small radius at both ends so each open end of the lathe sits
// inside the part that takes over — the drive prism astern, the horn ahead.
hadron.bladeBody(root, shadow, {
  profile: [
    [-49, 1.2],
    [-44, 2.4],
    [-36, 4.6],
    [-24, 6.4],
    [-6, 7.0],
    [12, 6.3],
    [28, 4.6],
    [36, 3.0],
    [39, 1.2],
  ],
  facets: 4,
  flat: BLADE,
});

// The fore spine and its inlay, from under the deck's nose to the horn's
// root; the inlay is crystal clad and unlit, as the Clarion's is.
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    profile: [
      [10, 0.3],
      [16, 1.6],
      [34, 1.6],
      [40, 0.6],
    ],
    y: 2.45,
    flat: [0.7, 1],
    inlay: {
      profile: [
        [16, 0.5],
        [20, 1.4],
        [30, 1.4],
        [34, 0.4],
      ],
      y: 3.3,
      flat: [0.5, 1],
    },
  }
);
// The after spine, from under the deck's tail down onto the drive's back.
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    name: 'blade_spine_aft',
    profile: [
      [-26, 0.5],
      [-31, 2.0],
      [-42, 2.0],
      [-49, 0.6],
    ],
    y: 1.3,
    flat: [0.7, 1],
  }
);

// The bow array: the horn, its lit lip, the emitter crystal and its core —
// the Clarion's at two-thirds the size, no seams, no ridges. The core's tip
// is the bow at x 55.
hadron.bowArray(
  root,
  { alloy, crystal, seam, node },
  {
    y: 0.5,
    horn: {
      profile: [
        [34, 1.4],
        [40, 2.5],
        [46, 3.6],
        [49.5, 4.4],
        [50, 4.1],
      ],
      flat: [0.7, 1],
    },
    lip: {
      mat: seam,
      profile: [
        [49.7, 4.35],
        [50.6, 4.6],
        [51.0, 4.0],
      ],
      flat: [0.7, 1],
    },
    ridges: false,
    emitter: { x: 50, r: 1.8, length: 6, core: { x: BOW - 3, r: 1.0, length: 6 } },
  }
);

// The landing deck: a hexagonal plate over the crown, its top at y 3.6,
// and the three wells through it to floors 0.8 m down. The ring's centre
// is x −6, and the bays sit inside its crystal inner ring with a metre to
// spare at their outboard corners.
const DECK_X = -6;
hadron.landingDeck(
  root,
  { shadow, alloy },
  {
    outline: [
      [12, 0],
      [4, 17],
      [-16, 17],
      [-24, 0],
      [-16, -17],
      [4, -17],
    ],
    y: 3.6,
    t: 1.2,
    bays: [
      { name: 'fwd', x: DECK_X + 5.5, z: 0, size: [7.5, 6.5] },
      { name: 's', x: DECK_X - 4.5, z: 5.0, size: [7.5, 6.5] },
      { name: 'p', x: DECK_X - 4.5, z: -5.0, size: [7.5, 6.5] },
    ],
    floor: { y: 2.6, t: 0.4 },
  }
);
// The resonator ring around the deck, cold (the header).
hadron.deckRing(
  root,
  { alloy, crystal },
  { x: DECK_X, y: 3.6, r: 15, tube: 1.0, inner: { r: 13.2, tube: 0.55 } }
);

// Beam is wing, as on every Order hull: the guards, swept aft of the deck
// and cupping it, the crystal edge a strip along the tip.
hadron.wings(
  root,
  { alloy, crystal },
  {
    name: 'guard_wing',
    edgeName: 'guard_edge',
    outline: [
      [-38, 2.5],
      [-4, 2.5],
      [-22, 21],
      [-30, 20],
    ],
    t: 0.9,
    y: 1.95,
    edge: {
      outline: [
        [-30, 20],
        [-22, 21],
        [-21.6, 19.9],
        [-29.2, 18.9],
      ],
      t: 1.4,
      y: 2.1,
    },
  }
);
hadron.finAndKeel(root, alloy, {
  fin: { x: -39, y: 3.0, length: 12, height: 5 },
  keel: { x: -12, y: -3.7, length: 24, height: 3 },
  t: 0.8,
});

// The drive: a crystal point in the spine's line, its base the stern at
// x −55; no ring and no mark — dark astern.
hadron.drive(
  root,
  { shadow, crystal, node },
  {
    x: STERN + 5,
    y: 0.4,
    r: 3.2,
    facets: 4,
    taper: 0,
    length: 10,
    mat: crystal,
    ring: false,
    mark: null,
  }
);

// Two navigation marks on the deck's forward shoulders, outboard of the
// ring — with the array, the whole of the resting light.
hadron.navMarkPair(root, seam, { x: 2, y: 3.75, z: 15.2 });

await exportGlb(root, 'antiphon-hadron.glb');
