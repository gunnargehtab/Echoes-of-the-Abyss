/**
 * The Slipway, Pelagia Commune — 340 m of footprint (2 × `radiusM` 170,
 * packages/shared/src/structures.ts; tools/hull-maps/models.mjs), SIG 30 idle.
 *
 * "The second yard, the rung — a longer hall than the Foundry (340 m to its
 * 320) with the slip cut through its whole length and open at both ends, so
 * a hull is laid at the head gate, walked down the line under three
 * gantries, and launched out of the mouth ... Two halls flank the slip, each
 * grown in the navy's own architecture; a keel on blocks two thirds down
 * the slip. Dim at rest: the line lights along the slip floor, the gantry
 * working lights and the launch sill" (docs/asset-prompts-3d.md, STRUCTURE
 * — Slipway). One prompt block, four scripts, and the per-navy difference
 * is the hull on the blocks, the posts and the two halls.
 *
 * A port of the approved export (docs/concept-art/models/slipway-pelagia.glb
 * at f7cce0f) — an r169 export, 134 parts, 7,824 triangles — part for part
 * in its order, every number the export's own, read off parts.mjs. The bed,
 * the three gantry frames and the head gate are the kit's `slipwayBed`,
 * `slipwayGantry` and `slipwayHeadGate` — the faction-neutral skeleton all
 * four files share (#652, after the Vent Tap's #608) — in the Commune's
 * hull `ink`, which the file's six materials match to the value with no
 * emissive strength written: chitin for the slab, the blocks and the
 * trolleys, growth ridge for the floor and the 7 m beams (the one skeleton
 * number this file has to itself), the vein for the line and the sill,
 * biolight for the worklights. What is the Commune's comes from
 * `factions/pelagia.mjs`: a membrane orb of a hull on the blocks, grown
 * posts — leaning ridge stalks with chitin knuckles, tall chitin orbs for
 * pylons under a chitin lintel — and the husk hall: six lobes along the
 * slip, no two the same size, each ringed twice in membrane with a spore
 * bud on its crown, five knuckles between them, a ridge lip with five
 * veins, six roots and three ballast bladders.
 *
 * THE FILE IS X-LONG, so nothing here is yawed: the export lies along +X
 * with the mouth at −x and the head gate at +x, and every part is placed by
 * kit `add` in the file's own frame. THE SCALE is the footprint's: drawn
 * 344 across by the measure the bake takes (the slab's chamfer, corner to
 * corner; kit.mjs `fitFootprint`) and priced at 340 m by the table, so the
 * root carries that one scale, as the Vent Taps do, and intake reports
 * ×1.000 where the approved bake reported ×0.988.
 *
 * Nothing here is a shape decision but the crosses' station (#890, the last
 * bullet); where the export is odd the script is odd with it:
 *
 * - RELABELLED, as #642 relabelled the eleven `bothSides` hulls and the
 *   Choristers' ports relabelled them again: the file's `line_light_p`,
 *   `gantry_leg_p`, `gantry_knuckle_p`, `head_pylon_p` and the `hall_p`
 *   frame all sit at +z, which is starboard, and are written `_s`; their
 *   `_s` twins at −z are written `_p`. Every buffer stays where it is and
 *   in the file's order — the +z part of every pair is still written
 *   before the −z one — and only the names turn; nothing is mirrored.
 *   `diff.mjs` matches by name, so it lists those sixteen parts as moved
 *   by the width of the slip; that is the relabel and the whole of it.
 * - The root anchors are NOT a mirrored pair of ranks: each is turned
 *   π/2 + sgn · 1.2 about X, which dives the +z hall's six into the ground
 *   and stands the −z hall's six up, leaning toward the slip
 *   (factions/pelagia.mjs `slipwayHall`). The file adds the raise where a
 *   mirror would negate the angle; carried across (#540).
 * - The slab is an un-centred extrusion, its lower chamfer at −2 and its
 *   top at +7 about a node at −8 (kit.mjs `slipwayBed`).
 * - The trolley sits 6 to starboard on the outer gantries and 8 to port
 *   on the middle one; the worklight hangs a metre beyond the beam's +x
 *   face — 4.5 here, on the wider beam.
 * - `line_cross_5` and `line_cross_3`, which the light audit named and
 *   #645 carried: the crosses at x 90 and x −2 lay under gantry 2's and
 *   gantry 1's 7 m beams, so the top-down bake never saw them. The
 *   crosses are the resting clause's "line lights along the slip floor",
 *   so they stay lit and the whole rank slides 8 m aft, to −148 at the
 *   same 46, so that no rung lies under a gantry's beam or trolley
 *   (kit.mjs `slipwayBed`, one decision for all four yards;
 *   docs/models-plan.md §3.2 rule 5; #890). `diff.mjs` lists the seven
 *   crosses, moved by that 8 m and nothing else.
 */
import {
  THREE,
  group,
  bothSides,
  slipwayBed,
  slipwayGantry,
  slipwayHeadGate,
  fitFootprint,
  exportGlb,
} from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 340;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const vein = pelagia.ink.bioVein();
const membrane = pelagia.ink.algaeMembrane();
const light = pelagia.ink.bioLight();
const spore = pelagia.ink.sporePod();

const root = new THREE.Group();
root.name = 'slipway_pelagia';

// The bed: chitin slab and keel blocks, a ridge floor, the line as a vein,
// and the Commune's membrane orb on the blocks under a chitin deck.
slipwayBed(
  root,
  { slab: chitin, floor: ridge, line: vein, keel: chitin },
  { hull: (r) => pelagia.slipwayHull(r, { hull: membrane, deck: chitin }) }
);

// Three gantries: leaning ridge stalks with chitin knuckles, a ridge beam
// 7 m wide, a chitin trolley on a chitin cable, and the worklight in
// biolight.
for (const index of [0, 1, 2])
  slipwayGantry(
    root,
    { beam: ridge, trolley: chitin, cable: chitin, worklight: light },
    {
      index,
      leg: pelagia.slipwayLeg(ridge),
      ornament: pelagia.slipwayKnuckle(chitin),
      beam: { size: [7, 4, 70], y: 44 },
    }
  );

// The head gate: two tall chitin orbs under a chitin lintel.
slipwayHeadGate(root, chitin, { pylon: pelagia.slipwayPylon(chitin) });

// Two halls, the +z one first as the file writes it (starboard, `hall_s`).
bothSides((tag, sgn) =>
  pelagia.slipwayHall(group(root, `hall_${tag}`), { chitin, ridge, membrane, spore, vein }, { sgn })
);

fitFootprint(root, L);
await exportGlb(root, 'slipway-pelagia.glb');
