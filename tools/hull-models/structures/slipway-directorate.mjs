/**
 * The Slipway, Abyssal Directorate — 340 m of footprint (2 × `radiusM` 170,
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
 * A port of the approved export
 * (docs/concept-art/models/slipway-directorate.glb at f7cce0f) — an r169
 * export, 124 parts, 5,156 triangles — part for part in its order, every
 * number the export's own, read off parts.mjs. The bed, the three gantry
 * frames and the head gate are the kit's `slipwayBed`, `slipwayGantry` and
 * `slipwayHeadGate` — the faction-neutral skeleton all four files share
 * (#652, after the Vent Tap's #608) — in the Directorate's hull `ink`,
 * which the file's six materials match to the value with no emissive
 * strength written: chitin violet for the slab, the blocks and the
 * trolleys, trench black for the floor, weld steel for the beams, the
 * gullet glow for the line and the sill, biolight crimson for the
 * worklights. What is the Directorate's comes from
 * `factions/directorate.mjs`: a red carapace orb of a hull on the blocks,
 * posts that lean — steel cone legs with black claws hooked over the
 * beam, red cone pylons leaning in under a violet lintel — and the tergite
 * hall: seven plates laid along the slip with their seams, spines and
 * photophores, a black lip lit six times, six anchor claws and a mandible
 * at the mouth.
 *
 * THE FILE IS X-LONG, so nothing here is yawed: the export lies along +X
 * with the mouth at −x and the head gate at +x, and every part is placed by
 * kit `add` in the file's own frame. THE SCALE is the footprint's: drawn
 * 362.59 across by the measure the bake takes — the two mandibles at the
 * mouth are laid along the slip and yawed, and a yawed cone's box overhangs
 * its vertices (kit.mjs `fitFootprint`) — and priced at 340 m by the
 * table, so the root carries that one scale, as the Vent Taps do, and
 * intake reports ×1.000 where the approved bake reported ×0.938.
 *
 * Nothing here is a shape decision but the crosses' station (#890, the last
 * bullet); where the export is odd the script is odd with it:
 *
 * - RELABELLED, as #642 relabelled the eleven `bothSides` hulls and the
 *   Choristers' ports relabelled them again: the file's `line_light_p`,
 *   `gantry_leg_p`, `gantry_claw_p`, `head_pylon_p` and the `hall_p` frame
 *   all sit at +z, which is starboard, and are written `_s`; their `_s`
 *   twins at −z are written `_p`. Every buffer stays where it is and in
 *   the file's order — the +z part of every pair is still written before
 *   the −z one — and only the names turn; nothing is mirrored. `diff.mjs`
 *   matches by name, so it lists those sixteen parts as moved by the width
 *   of the slip; that is the relabel and the whole of it.
 * - The anchor claws are NOT a mirrored pair of ranks: each is turned
 *   π/2 + sgn · 1.35 about X, which hangs the +z hall's six point-down
 *   into the ground and stands the −z hall's six point-up, leaning toward
 *   the slip (factions/directorate.mjs `slipwayHall`). The file adds the
 *   raise where a mirror would negate the angle; carried across (#540).
 * - The slab is an un-centred extrusion, its lower chamfer at −2 and its
 *   top at +7 about a node at −8 (kit.mjs `slipwayBed`).
 * - The trolley sits 6 to starboard on the outer gantries and 8 to port
 *   on the middle one; the worklight hangs a metre beyond the beam's +x
 *   face.
 * - `line_cross_5`, which the light audit named and #645 carried: the lit
 *   cross 1.6 × 36 drawn units at x 90 lay under gantry 2's beam and
 *   trolley, so the top-down bake never saw it. The crosses are the
 *   resting clause's "line lights along the slip floor", so they stay lit
 *   and the whole rank slides 8 drawn units aft — 7.5 m at this file's
 *   ×0.938 root scale — to −148 at the same 46, so that no rung lies under
 *   a gantry's beam or trolley (kit.mjs `slipwayBed`, one decision for all
 *   four yards; docs/models-plan.md §3.2 rule 5; #890). `diff.mjs` lists
 *   the seven crosses, moved by that 7.5 m.
 * - The eight plate photophores, four a hall, hung 0.47 m over the
 *   tergites they mark by #894's resting measure: the station's crown was
 *   read off the ideal orb, and the plate is a 14 × 7 one. Each is dropped
 *   onto its tergite from its station since #907, its underside on the
 *   facet and tilted with it (`slipwayHall`, kit.mjs `seat`). `diff.mjs`
 *   lists the eight at 0.7 m, and beyond them, the crosses and the
 *   relabel, nothing.
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
import * as directorate from '../factions/directorate.mjs';

const L = 340;

const violet = directorate.ink.chitinViolet();
const black = directorate.ink.trenchBlack();
const gullet = directorate.ink.gulletGlow();
const red = directorate.ink.chitinRed();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson();

const root = new THREE.Group();
root.name = 'slipway_directorate';

// The bed: violet slab and keel blocks, a black floor, the line in gullet
// glow, and the Directorate's red carapace on the blocks under a violet deck.
slipwayBed(
  root,
  { slab: violet, floor: black, line: gullet, keel: violet },
  { hull: (r) => directorate.slipwayHull(r, { hull: red, deck: violet }) }
);

// Three gantries: leaning steel legs with black claws, a steel beam, a
// violet trolley on a violet cable, and the worklight in crimson.
for (const index of [0, 1, 2])
  slipwayGantry(
    root,
    { beam: steel, trolley: violet, cable: violet, worklight: crimson },
    { index, leg: directorate.slipwayLeg(steel), ornament: directorate.slipwayClaw(black) }
  );

// The head gate: two red cones leaning in under a violet lintel.
slipwayHeadGate(root, violet, { pylon: directorate.slipwayPylon(red) });

// Two halls, the +z one first as the file writes it (starboard, `hall_s`).
bothSides((tag, sgn) =>
  directorate.slipwayHall(
    group(root, `hall_${tag}`),
    { violet, red, black, steel, crimson },
    { sgn }
  )
);

fitFootprint(root, L);
await exportGlb(root, 'slipway-directorate.glb');
