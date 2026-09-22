/**
 * The Rootstock — the Commune's carrier, 115 m (docs/units.md, "The
 * carriers"; #840).
 *
 * "The strike nobody hears, 115 m — a stolon with a drive, putting out
 * Runners the way a plant puts out daughter shoots: four craft at SIG 4 and
 * no gun on the hull at all (SIG 8 idle, 16 cruise, +35 at every launch —
 * its one loud moment; no gun; HYD 45; 620 hull; 55 m/s; PR 1; 340 nodules;
 * a flight of four Runners, rebuilt one every 30 s). A long slim grown stem
 * swelling at four nodes, a growth ring girdling each, closing forward to a
 * rounded growing tip with a fifth ring forming behind it, and drawn out
 * astern to a peduncle and a short flat muscle-drive fluke, its port lobe
 * the shorter. At each node, a side at a time — starboard, port,
 * starboard, port — a budding sheath springs from a knuckle on the flank
 * and reaches forward and out: a boat-shaped bract of membrane split open
 * along its top, a broad rounded lip round a deep dark hollow the length
 * and girth of a Runner, pointed at the end the craft's nose lay in, with
 * one pale scar at its root where the daughter was attached. Four sheaths,
 * each its own size and angle, none opposite another, and all four empty:
 * the sheaths are the count, and a craft aboard is not drawn. From
 * straight above the hull is a dark stem carrying four pale rims round four
 * dark slots. No gun, no mast, no dome: nothing on it points at anything.
 * Nearly black at rest, navigation marks only — one on the crown behind
 * the tip, one on the fluke; under way a dim vein along the stem from node
 * to node; a sheath's lips flare for the instant a Runner clears them, and
 * the deck is dark again."
 *
 * Built to that block and not ported from a binary, as every Phase 4
 * Commune hull was: the stem, its rings, the fluke, the vein and the marks
 * are the module's existing vocabulary, and the deck is one builder added
 * to `factions/pelagia.mjs` for it — `buddingSheaths`, with the two
 * sections and the girth it sweeps (kit.mjs `sweep`, imported into the
 * module for it) and a local `uvAlike`. Nothing already in the module
 * moved, and every Commune script round-trips unchanged. Metre-true at 115
 * with no root scale — the stem's last station is the bow at x 57.5 and
 * the fluke's bevel the stern at −57.5, and `metreTrue` returns 1. Port is
 * −z (#642); every site, and everything else with a side, is placed at its
 * own signed z, one at a time, never through `bothSides`
 * (docs/models-plan.md §3.6).
 *
 * What the script decided that the block does not say:
 *
 * - **The deck is built empty.** A craft aboard is not an entity
 *   (docs/systems-combat.md §15, the deck counts it) and a craft in the
 *   water is drawn as its own, so a Runner modelled into a sheath would be
 *   drawn twice whenever the flight was out. The four sheaths therefore
 *   show capacity, never state — which is the same thing a Spinner's four
 *   sacs show — and the flight's state is read off the Runners in the
 *   water, where it is.
 * - **A pale rim round a dark slot, and not the other way.** The first
 *   draft lined each hollow in membrane inside a ridge bract, and from
 *   straight above four teal lozenges on a stem read as leaves — a Reed
 *   with two more. Inverted, the bract is membrane like every Commune leaf,
 *   vane and fluke, and the hollow is the stem's own dark chitin, so an
 *   empty sheath reads as a hole in a frame: at 1 px/m two pixels of rim a
 *   side round four of slot, and the one reading of a carrier's deck that
 *   survives a squint. The lip is 1.8 m of a 4 m half-beam for that
 *   reason; a rim under two pixels is not there at 1 px/m.
 * - **The hollow is deep enough for the height pass to see it.** The
 *   floor lies 2.3 m under the lip crest, so the top-down height map
 *   carries each site as a bright ring round a darker slot — at 10 px/m a
 *   lip reads 205 and the floor 145 of 255 — and the relief lighting reads
 *   it as a cup rather than a patch. The first cut faced the sheath's
 *   triangles into the wall (factions/pelagia.mjs `SHEATH_SECTION`, which
 *   way round is load-bearing), and the albedo never showed it: only a
 *   height probe with the rim reading *under* its floor did.
 * - **Sized to the Runner.** Each hollow opens 15.2–15.9 m long, 4.2–4.4 m
 *   across at the lip and 2.2–2.3 m deep, where the Runner is 14 m long,
 *   2.64 m across the body and 1.9 m tall — so the craft that fits a
 *   sheath is legible from it, its seed leaves folded along it as a bud's
 *   are. The pointed end of each hollow is forward, where a Runner's nose
 *   lies, and the scar is at the root, where its peduncle grew from the
 *   node: a spore-pale fleck 1.5 m across at 0.21 of the length.
 * - **Four sites, alternating, reaching forward.** Nodes at x 24, 6, −12
 *   and −30, 18 m apart, starboard first; each sheath rooted 0.6 m outside
 *   the node's skin and yawed 16–19° off the keel toward its own flank,
 *   forward — a lateral shoot grows toward the tip of the axis that bears
 *   it, and every Commune leaf is swept aft, so the deck reads as shoots
 *   and not as leaves — and rolled 2–3.5° so the mouth tips outboard. No
 *   two the same length (16.4–17.2 m), beam or angle; the nearest opposite
 *   pair is 18 m apart. From above the four take 395 m² of a 1,290 m²
 *   plan: the deck is a third of the hull.
 * - **A thin stolon.** 9.6–9.8 m across the nodes and 7.8 between them, 0.085
 *   of the length — the Reed's stem is 0.071 — because a stolon is a
 *   runner stem and the carrier is the softest capital hull in the game
 *   (§15). The beam is the deck: 24.8 m over the sheaths by the vertices,
 *   29.0 m by the box measure the intake frames.
 * - **A growing tip, not a nose.** The stem's own lathe closes to a
 *   rounded point at the bow, with `node_ring_4` 7.5 m behind it — the next
 *   node forming, where the next site would bud. The cone every other
 *   Commune stem carries forward (`nose`) read as a ram at the conn view's
 *   tilt, on a hull with nothing to ram with.
 * - **The fluke lies flat.** 13.4 m across and 13.5 long, its notch off
 *   the keel line and its port lobe the shorter. Flat because the Reed's
 *   standing fluke is the drive of a 100 m/s hull and this one makes 55;
 *   the Drifter's, the Weaver's and the Bower's lie flat at 40–90.
 * - **No roots.** A stolon roots at its nodes, and the name asks for it;
 *   tufts hung under the nodes read at the conn view's distance as the
 *   Directorate's folded limbs, so the name is carried by the nodes and
 *   the budding instead.
 * - **The vein, dark, node to node.** "Under way a dim vein along the stem
 *   from node to node" is the 16–35 band's running light and the cruise
 *   figure's, so it is built and clad in `bio_vein_unlit`
 *   (docs/models-plan.md §3.2 rule 2): one tube of r 0.16 from the first
 *   node to the last, wandering 0.2–0.75 m to starboard of the crown line
 *   and leaving the crown to the bow mark. The lips' flare is the launch's
 *   +35, a transient, and carries no lamp (§3.2 rule 3).
 * - **Two marks.** The band table's floor row: one on the crown at x 41,
 *   0.4 m to port, between the first sheath's tip and the growing tip;
 *   one on the fluke's starboard lobe. Both at strength 1, the Drifter's
 *   and the Reed's rule for a mark; nothing else on the hull is lit.
 *
 * The light, measured (`lightAudit`, printed on export): nav_bow 0.75 m²,
 * nav_tail 0.75 — 1.5 m² facing up on a 1,290 m² plan, nothing hidden. The
 * bake at E(8) = 0.797 reads raw E 1.43 → calibrated 0.80 at a gain of
 * ×0.557 at the maps' 4 px/m (×0.518 at intake's default 2): 36× above the
 * ×1/64 floor and 115× under the ×64 ceiling. 26 parts, 5,300 triangles,
 * six materials, bounds x ±57.5, y ±3.9, z −14.6..14.4 by the export's box
 * measure and −12.5..12.3 by its vertices.
 *
 * The hand-drawn entry in silhouettes.ts stays until the kind is wired
 * (docs/models-plan.md §2). The generated outline is twenty-seven vertices:
 * a stem at ±0.02–0.047 carrying four lobes that alternate — starboard to
 * +0.107 at x 0.31 and 0.0, port to −0.107 at x 0.15 and −0.175 — each
 * leaning forward from its node, and a fluke of +0.060 and −0.053 astern.
 */
import { THREE, exportGlb, metreTrue } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts); the file is drawn to it. */
const L = 115;
const BOW = L / 2;
const STERN = -L / 2;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const spore = pelagia.ink.sporePod();
const veinUnlit = pelagia.ink.bioVeinUnlit();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'pelagia_rootstock';

const SQUASH = 0.74;
const FACETS = 14;
const FLAT = Math.cos(Math.PI / FACETS);

/** The four nodes, bow to stern, and the flank each one buds on. */
const NODES = [
  { x: 24, sgn: 1 },
  { x: 6, sgn: -1 },
  { x: -12, sgn: 1 },
  { x: -30, sgn: -1 },
];

/**
 * The stolon's stations, [x, r] in metres: 7.8 m across between the nodes
 * and 9.6–9.8 at them, closed to a rounded growing tip at the bow — the
 * last station is the bow, which is what makes the file 115.000 long — and
 * drawn out astern to the peduncle the fluke grows from.
 */
const PROFILE = [
  [-47.5, 0.8],
  [-45, 1.7],
  [-41, 2.7],
  [-36, 3.6],
  [-32, 4.4],
  [-30, 4.8],
  [-27.5, 4.4],
  [-22, 3.9],
  [-15.5, 4.1],
  [-12, 4.9],
  [-9.5, 4.5],
  [-3, 3.9],
  [2.5, 4.1],
  [6, 4.9],
  [8.5, 4.5],
  [15, 3.9],
  [20.5, 4.1],
  [24, 4.8],
  [26.5, 4.4],
  [32, 3.9],
  [38, 3.5],
  [43, 3.1],
  [47.5, 2.7],
  [51, 2.2],
  [54, 1.6],
  [56.2, 0.9],
  [BOW, 0.1],
];

const rAt = (x) => {
  for (let i = 1; i < PROFILE.length; i++) {
    const [x0, r0] = PROFILE[i - 1];
    const [x1, r1] = PROFILE[i];
    if (x <= x1) return r0 + ((r1 - r0) * (x - x0)) / (x1 - x0);
  }
  return PROFILE[PROFILE.length - 1][1];
};
const crownAt = (x) => rAt(x) * SQUASH * FLAT;

// The stem, and a growth ring girdling each node — 0.7 m ridges cresting
// 0.4 m proud of the skin, each leaned its own way — with a fifth behind
// the growing tip, the next node forming.
pelagia.stem(root, { chitin, ridge }, { profile: PROFILE, facets: FACETS, squash: SQUASH });
pelagia.growthRings(root, ridge, {
  name: 'node_ring',
  stations: [...NODES.map(({ x }) => [x, rAt(x) - 0.3]), [50, rAt(50) - 0.25]],
  squash: SQUASH,
  tube: 0.7,
  wobble: 0.06,
  ring: { rise: 0.7, facets: FACETS },
});

/**
 * The four budding sites, one a node, bow to stern, each its own length,
 * girth, yaw forward-outboard and roll: the deck. Each is rooted 0.6 m
 * outside its node's skin with its axis 1.6 m above the stem's, so the
 * hollow clears the stem and the knuckle covers the join.
 */
const SITES = [
  { length: 17.0, halfBeam: 4.0, halfHeight: 2.2, yaw: 0.3, roll: 0.05 },
  { length: 16.6, halfBeam: 3.9, halfHeight: 2.15, yaw: 0.32, roll: 0.06 },
  { length: 17.2, halfBeam: 4.05, halfHeight: 2.22, yaw: 0.28, roll: 0.04 },
  { length: 16.4, halfBeam: 3.85, halfHeight: 2.12, yaw: 0.33, roll: 0.055 },
];
pelagia.buddingSheaths(
  root,
  { sheath: membrane, lining: chitin, scar: spore, knuckle: ridge },
  {
    sites: SITES.map((s, i) => {
      const { x, sgn } = NODES[i];
      return {
        ...s,
        at: [x, 1.6, sgn * (rAt(x) + 0.6)],
        node: { at: [0.6, 0.2, -sgn * 1.2], r: 2.4, squash: 0.75 },
        scar: { at: 0.21, r: 0.75 },
      };
    }),
  }
);

// The muscle-drive fluke astern: one paddle lying flat, its notch off the
// keel line and its port lobe the shorter. Its outline stops a bevel short
// of the stern and meets it on a constant-x edge, so the miter carries
// exactly the bevel aft and the stern is −57.500.
const BEVEL = 0.25;
pelagia.driveFluke(root, membrane, {
  y: 0,
  t: 0.6,
  bevel: BEVEL,
  outline: [
    [-44.0, 1.2],
    [-46.5, 3.6],
    [-50.0, 6.0],
    [-53.5, 7.2],
    [STERN + BEVEL, 6.2],
    [STERN + BEVEL, 4.6],
    [-55.0, 2.6],
    [-53.2, 0.5],
    [-55.2, -2.6],
    [-56.2, -4.8],
    [-54.4, -6.2],
    [-50.6, -5.4],
    [-47.0, -3.3],
    [-44.0, -1.1],
  ],
});

// The vein along the stolon, node to node: under way only, so clad, and
// wandering to starboard of the crown line so the crown is the bow mark's.
pelagia.sweptVein(root, veinUnlit, {
  name: 'stolon_vein',
  through: [24, 15, 6, -3, -12, -21, -30].map((x, i) => [
    x,
    crownAt(x) + 0.08,
    [0.4, 0.7, 0.5, 0.2, 0.45, 0.75, 0.55][i],
  ]),
  steps: 48,
  r: 0.16,
  facets: 5,
});

// "Nearly black at rest, navigation marks only": two, and the only lamps.
pelagia.navMarks(root, light, {
  marks: [
    ['nav_bow', 41, crownAt(41) + 0.15, -0.4],
    ['nav_tail', -52, 0.75, 3.6],
  ],
  w: 1.2,
  h: 0.4,
  d: 0.9,
});

metreTrue(root, L, { drawn: L });
await exportGlb(root, 'rootstock-pelagia.glb');
