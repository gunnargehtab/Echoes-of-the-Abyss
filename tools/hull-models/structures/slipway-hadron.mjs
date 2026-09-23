/**
 * The Slipway, Hadron Knights — 340 m of footprint (2 × `radiusM` 170,
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
 * A port of the approved export (docs/concept-art/models/slipway-hadron.glb
 * at f7cce0f) — an r169 export, 82 parts, 1,016 triangles — part for part
 * in its order, every number the export's own, read off parts.mjs. The bed,
 * the three gantry frames and the head gate are the kit's `slipwayBed`,
 * `slipwayGantry` and `slipwayHeadGate` — the faction-neutral skeleton all
 * four files share (#652, after the Vent Tap's #608) — in the Order's hull
 * `ink`, which the file's five materials match to the value with no
 * emissive strength written: shadow indigo for the ground, the blocks and
 * the trolleys, pale alloy for the beams, the resonance node for the line
 * and the sill, the crystal seam for the worklights. What is the Order's
 * comes from `factions/hadron.mjs`: a spar of a hull on the blocks (the
 * blade every Order hull is), pyramids for posts — alloy legs with crystal
 * finials, taller alloy pylons under a crystal lintel — and the blade hall:
 * a spar laid on its side with an alloy crest, five crystal spines on lit
 * seams, a lit lip, four alloy buttresses.
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
 *   `gantry_leg_p`, `gantry_finial_p`, `head_pylon_p` and the `hall_p`
 *   frame all sit at +z, which is starboard, and are written `_s`; their
 *   `_s` twins at −z are written `_p`. Every buffer stays where it is and
 *   in the file's order — the +z part of every pair is still written
 *   before the −z one — and only the names turn; nothing is mirrored.
 *   `diff.mjs` matches by name, so it lists those sixteen parts as moved
 *   by the width of the slip; that is the relabel and the whole of it.
 * - The slab is an un-centred extrusion, its lower chamfer at −2 and its
 *   top at +7 about a node at −8 (kit.mjs `slipwayBed`).
 * - The buttresses reach outward from each hall, so the −z hall's four are
 *   drawn with the reach negated — their own buffers, as the file has them.
 * - The trolley sits 6 to starboard on the outer gantries and 8 to port
 *   on the middle one; the worklight hangs a metre beyond the beam's +x
 *   face.
 * - `line_cross_5`, which the light audit named and #645 carried: the
 *   1.6 × 36 m lit cross at x 90 lay under gantry 2's beam and trolley,
 *   so the top-down bake never saw it. The crosses are the resting
 *   clause's "line lights along the slip floor", so they stay lit and the
 *   whole rank slides 8 m aft, to −148 at the same 46, so that no rung
 *   lies under a gantry's beam or trolley (kit.mjs `slipwayBed`, one
 *   decision for all four yards; docs/models-plan.md §3.2 rule 5; #890).
 *   `diff.mjs` lists the seven crosses, moved by that 8 m and nothing
 *   else.
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
import * as hadron from '../factions/hadron.mjs';

const L = 340;

const shadow = hadron.ink.shadowIndigo();
const node = hadron.ink.resonanceNode();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();

const root = new THREE.Group();
root.name = 'slipway_hadron';

// The bed: shadow slab, floor and keel blocks, the line in the node's
// violet, and the Order's alloy spar on the blocks under a shadow deck.
slipwayBed(
  root,
  { slab: shadow, floor: shadow, line: node, keel: shadow },
  { hull: (r) => hadron.slipwayHull(r, { hull: alloy, deck: shadow }) }
);

// Three gantries: pyramid legs with crystal finials, an alloy beam, a
// shadow trolley on a shadow cable, and the worklight as a lit seam.
for (const index of [0, 1, 2])
  slipwayGantry(
    root,
    { beam: alloy, trolley: shadow, cable: shadow, worklight: seam },
    { index, leg: hadron.slipwayLeg(alloy), ornament: hadron.slipwayFinial(crystal) }
  );

// The head gate: two alloy pyramids under a crystal lintel.
slipwayHeadGate(root, crystal, { pylon: hadron.slipwayPylon(alloy) });

// Two halls, the +z one first as the file writes it (starboard, `hall_s`).
bothSides((tag, sgn) =>
  hadron.slipwayHall(group(root, `hall_${tag}`), { shadow, alloy, crystal, seam }, { sgn })
);

fitFootprint(root, L);
await exportGlb(root, 'slipway-hadron.glb');
