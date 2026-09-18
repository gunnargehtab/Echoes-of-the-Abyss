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
 * make. Metre-true at 110 with no root scale: the bow prism's tip is the bow
 * at x 55 and the drive prism's base the stern at −55.
 *
 * The body is the rung's blade — a four-facet spar laid flat, the Cantus's
 * section of 0.55 by 1.6 — and it is a spar: 96 m long, 15.8 m in beam and
 * 5.4 m tall at its fullest station, a beam-to-length of 0.144 against the
 * Clarion's 0.121 (10.85 m on 90, metre-true). Everything wider than that is
 * a planar surface, which is the module's rule for this navy, and there are
 * two of them:
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
 *   generated outline says it: the deck's hexagon is a flat run at ±0.152
 *   of the length from x 0.04 to −0.15.
 * - The resonator ring (`deckRing`) lies flat around the three wells: an
 *   alloy ring 32 m across the outside of its tube, its crystal inner ring
 *   inside it, both resting on the deck. Outside the alloy ring the apron
 *   is 1 m at the flanks and 2 m at the nose and tail. It is a ring on its
 *   side where the Responsory's are canted shoulders, and it is the one
 *   thing on the hull an enemy's track will show that is not a blade. The
 *   crystal is `resonance_crystal` clad, not a lamp: the block flares it
 *   "when the deck opens", the resting bake is the state the chart shows,
 *   and a lamp dark at rest is a lamp this pipeline never shows
 *   (models-plan.md §3.2; the Responsory's header, twice).
 *
 * The guard wings are the Clarion's wing under the Cantus's name: swept
 * plates 0.9 m thick, 23 m to the tip, the crystal edge a strip along it and
 * no lamp. They run beside the deck rather than behind it — the root from
 * x −4 to −38 with the leading edge coming out from under the apron's flank
 * at its after corner and sweeping to the tip at x −22 — so that the
 * outline widens once, at the deck, and never narrows between the deck and
 * the wing: a first cut with the wings wholly aft of the deck left a waist
 * of 11 m between the two, and a plan that read as two hulls. They sit with
 * their top face against the deck's underside, not on the hull axis, so
 * they frame the deck as the block asks rather than carry the hull as the
 * Clarion's do. The tip is at 23 m and not 21, a shape decision taken at
 * review: at 21 the wings stood 4 m beyond a 34 m deck and the track's
 * beam read as the deck, against the module's own rule that on an Order
 * hull the beam is wing; at 23 the outline's tips are ±0.208 over the
 * deck's ±0.152, and the wing owns it.
 *
 * The bow is the Cantus's: a plain alloy point where the Clarion has its
 * horn, and one navigation mark abaft it. `bowArray` is the Order's gun
 * idiom — its approved callers are the Clarion and the Responsory, both
 * hulls whose blocks name an array — and this hull has "no weapon" in its
 * block, in the transports' preamble and in docs/units.md. A first cut put
 * a smaller horn here on the argument that a cone figure means something
 * projecting forward; review turned that down, correctly, because
 * docs/systems-echo.md §8 makes the cone a property of every Knight hull and
 * not of a bow part, and the Cantus has already settled how an unarmed
 * Order hull ends: "the hull saying it has no array, in the place a Knight
 * would look for one" (hulls/cantus.mjs). So the prism is 10 m of alloy
 * point on the blade's nose, and the mark 3 m abaft its base, flat on the
 * crown.
 *
 * The spine is in two pieces because the deck cuts it: a fore ridge with
 * its crystal inlay from under the deck's nose out to x 31, where the crown
 * is still under it, and an after ridge from under the deck's tail down
 * onto the drive prism, which is a four-facet crystal point 10 m long
 * lifted 0.4 m off the axis so the ridge's end lies inside its base — "the
 * drive in the spine". No ring, no stern mark: the block says dark astern
 * and stops, where the Clarion's says "dark astern but for one mark", and
 * 3.5 is the quietest quarter in the navy.
 *
 * Resting light, all of it forward, and the kit's audit clean: the bow
 * mark, 1.0 m² facing up, and one navigation mark each side on the deck's
 * forward shoulders, 0.75 each — the band table's floor row, "navigation
 * marks only, barely visible", and the family's licence at every band.
 * 2.5 m² on 2,109 m² of plan (the bake's 33,747 mask px at 4 px/m). The
 * bake reads raw E 1.16 and dims by ×0.570 onto 0.66, inside its ×1/64..×64
 * range with room either way. 21 parts, 1,280 triangles, bounds x ±55,
 * y −5.2..5.6, z ±23.
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

// The body: 96 m of spar from x −49 to 47, fullest at x −6 under the deck,
// closed to a small radius at both ends so each open end of the lathe sits
// inside the prism that takes over — the drive astern, the bow point ahead.
hadron.bladeBody(root, shadow, {
  profile: [
    [-49, 1.2],
    [-44, 2.4],
    [-36, 4.6],
    [-24, 6.4],
    [-6, 7.0],
    [12, 6.3],
    [28, 5.0],
    [38, 3.6],
    [44, 1.8],
    [47, 0.8],
  ],
  facets: 4,
  flat: BLADE,
});

// The fore spine and its inlay, from under the deck's nose out along the
// blade to where the crown falls away; the inlay is crystal clad and unlit,
// as the Clarion's is.
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    profile: [
      [10, 0.3],
      [16, 1.6],
      [26, 1.6],
      [31, 0.4],
    ],
    y: 2.2,
    flat: [0.7, 1],
    inlay: {
      profile: [
        [15, 0.4],
        [18, 1.3],
        [24, 1.3],
        [28, 0.4],
      ],
      y: 3.0,
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

// The bow: a plain alloy point where the Clarion has its horn, and one mark
// abaft it — the Cantus's answer for an Order hull with no weapon (the
// header). The point's tip is the bow at x 55.
hadron.bowPrism(root, { alloy, seam }, {
  x: BOW - 5,
  r: 2.2,
  length: 10,
  mark: { size: [1, 0.4, 0.8], x: 42, y: 1.15 },
});

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
      [-22, 23],
      [-30, 22],
    ],
    t: 0.9,
    y: 1.95,
    edge: {
      outline: [
        [-30, 22],
        [-22, 23],
        [-21.6, 21.9],
        [-29.2, 20.9],
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
// ring — with the bow mark, the whole of the resting light.
hadron.navMarkPair(root, seam, { x: 2, y: 3.75, z: 15.2 });

await exportGlb(root, 'antiphon-hadron.glb');
