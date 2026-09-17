/**
 * The Slipway, Bathyarch Consortium — 340 m of footprint (2 × `radiusM` 170,
 * packages/shared/src/structures.ts; tools/hull-maps/models.mjs), SIG 30 idle.
 *
 * "The second yard, the rung — a longer hall than the Foundry (340 m to its
 * 320) with the slip cut through its whole length and open at both ends, so
 * a hull is laid at the head gate, walked down the line under three
 * gantries, and launched out of the mouth (SIG 30 idle, 70 while the line
 * runs — the loudest line in the base). Two halls flank the slip, each
 * grown in the navy's own architecture; a keel on blocks two thirds down
 * the slip. Dim at rest: the line lights along the slip floor, the gantry
 * working lights and the launch sill; floodlit when a hull is on the line"
 * (docs/asset-prompts-3d.md, STRUCTURE — Slipway). One prompt block, four
 * scripts, and the per-navy difference is the hull on the blocks, the posts
 * and the two halls.
 *
 * A port of the approved export (docs/concept-art/models/slipway-bathyarch.glb
 * at f7cce0f) — an r169 export, 172 parts, 2,684 triangles — part for part
 * in its order, every number the export's own, read off parts.mjs. The bed,
 * the three gantry frames and the head gate are the kit's `slipwayBed`,
 * `slipwayGantry` and `slipwayHeadGate` — the faction-neutral skeleton all
 * four files share (#652, after the Vent Tap's #608) — in the Klaxon's hull
 * `ink`, which the file's six materials match to the value with no
 * emissive strength written. What is the Klaxon's comes from
 * `factions/bathyarch.mjs`: an iron box of a hull on the blocks under a
 * rust deck, square iron legs with rust brace collars, black square pylons,
 * and the riveted shed of a hall — body, roof, ridge, eight pilasters with
 * their roof vents, three banded stacks, two patches, a hazard stripe, the
 * slip apron with six floods, four tanks and a rank of twenty-four rivets.
 *
 * THE FILE IS X-LONG, so nothing here is yawed: the export lies along +X
 * with the mouth at −x and the head gate at +x, and every part is placed by
 * kit `add` in the file's own frame. THE SCALE is the footprint's: drawn
 * 344 across by the measure the bake takes (the slab's chamfer, corner to
 * corner; kit.mjs `fitFootprint`) and priced at 340 m by the table, so the
 * root carries that one scale, as the Vent Taps do, and intake reports
 * ×1.000 where the approved bake reported ×0.988.
 *
 * Nothing here is a shape decision; where the export is odd the script is
 * odd with it:
 *
 * - RELABELLED, as #642 relabelled the eleven `bothSides` hulls and the
 *   Choristers' ports relabelled them again: the file's `line_light_p`,
 *   `gantry_leg_p`, `gantry_leg_brace_p`, `head_pylon_p` and the `hall_p`
 *   frame all sit at +z, which is starboard, and are written `_s`; their
 *   `_s` twins at −z are written `_p`. Every buffer stays where it is and
 *   in the file's order — the +z part of every pair is still written
 *   before the −z one — and only the names turn; nothing is mirrored.
 *   `diff.mjs` matches by name, so it lists those sixteen parts as moved
 *   by the width of the slip; that is the relabel and the whole of it.
 * - The slab is an un-centred extrusion, its lower chamfer at −2 and its
 *   top at +7 about a node at −8 (kit.mjs `slipwayBed`).
 * - Each hall's rivets are numbered from the hall's own child count, 39,
 *   so both halls run `rivet_39..62` (factions/bathyarch.mjs `rivetRow`).
 * - The trolley sits 6 to starboard on the outer gantries and 8 to port
 *   on the middle one; the worklight hangs a metre beyond the beam's +x
 *   face.
 * - The light audit has nothing to say: every lit part faces up.
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
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 340;

const black = bathyarch.ink.hullBlack();
const rust = bathyarch.ink.oxideRust();
const flood = bathyarch.ink.amberFlood();
const grey = bathyarch.ink.ironGrey();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();

const root = new THREE.Group();
root.name = 'slipway_bathyarch';

// The bed: black slab, rust floor, the line in amber flood, black keel
// blocks, and the Klaxon's iron hull on them under its rust deck.
slipwayBed(
  root,
  { slab: black, floor: rust, line: flood, keel: black },
  { hull: (r) => bathyarch.slipwayHull(r, { hull: grey, deck: rust }) }
);

// Three gantries: iron legs with rust collars, an iron beam, an amber
// trolley on a black cable, and the worklight along the beam.
for (const index of [0, 1, 2])
  slipwayGantry(
    root,
    { beam: grey, trolley: amber, cable: black, worklight: lampM },
    { index, leg: bathyarch.slipwayLeg(grey), ornament: bathyarch.slipwayBrace(rust) }
  );

// The head gate: two black pylons under a rust lintel.
slipwayHeadGate(root, rust, { pylon: bathyarch.slipwayPylon(black) });

// Two halls, the +z one first as the file writes it (starboard, `hall_s`).
bothSides((tag, sgn) =>
  bathyarch.slipwayHall(group(root, `hall_${tag}`), { black, grey, rust, amber, flood }, { sgn })
);

fitFootprint(root, L);
await exportGlb(root, 'slipway-bathyarch.glb');
