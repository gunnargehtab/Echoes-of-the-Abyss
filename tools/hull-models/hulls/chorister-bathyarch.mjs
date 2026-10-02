/**
 * The Chorister, the Klaxon's — 50 m (docs/units.md; the Chorister block of
 * docs/asset-prompts-3d.md Block 3, read with the Bathyarch FACTION block).
 *
 * "The cohort hull, 50 m — the shortest and cheapest hull in the roster,
 * grown chitin over a pressure bladder (SIG 16 idle, 24 cruise). Three
 * overlapping segments with the bladder showing through the middle one as a
 * paler dome, a rostrum, a telson, folded walking limbs, one small dorsal
 * spine-gun off the centreline. Dim" — said the Klaxon's way, as the block
 * allows: three riveted pressure cans on a keel, the middle one the fattest
 * and in newer plate, each capped fore and aft in older plate with five
 * rivets along its crown; a deck walk with a hazard stripe and a patch; a
 * pipe run a side, neither where the other is; a bow block with a six-facet
 * ram; a stern block with the screw in its shroud; a fin and a stub wing a
 * side; a spine-gun on its mount off the centreline to port; a box of a
 * stack; and two lit ports on the deck, a bow lamp and a stern vent, which
 * is the whole resting light of a hull that idles at SIG 16.
 *
 * A port of the approved export
 * (docs/concept-art/models/chorister-bathyarch.glb at 3e15409) — an r169
 * export of the early pass, the same pass as the Tender's — part for part
 * in its order, every number the export's own, read off parts.mjs. Every
 * part comes from `factions/bathyarch.mjs`'s Chorister section or is a kit
 * box, in `ink`, which the file's six materials match to the value. Nothing
 * here is a shape decision; where the export is odd the script is odd with
 * it:
 *
 * - RELABELLED, as #642 relabelled the eleven `bothSides` hulls: the file's
 *   `pipe_p`, `fin_p` and `stub_wing_p` sit at +z, which is starboard, and
 *   are written `pipe_s`, `fin_s` and `stub_wing_s`; their `_s` twins at −z
 *   are written `_p`. Every buffer stays where it is and in the file's
 *   order — the +z pipe, fin and wing are still written before the −z ones
 *   — and only the names turn round; nothing is mirrored. `port_a` and
 *   `port_b` are lit ports, openings, not sides, and keep their names.
 * - The rivets are numbered by their place in the file, `rivet_3..7` after
 *   the first can and its two caps, as the Bulwark and the Tender count
 *   theirs; each is a box of its own, and each cap overlaps its can by 0.2.
 * - The middle can is iron grey where the outer two are hull black. The
 *   patch lies on the starboard side of the deck and the gun stands to port
 *   of the centreline; the stack is a box, not a drum.
 * - The stern lamp is `amber_vent`, the bow lamp and the two ports
 *   `amber_lamp`, all four flat on upward faces.
 *
 * THE FILE IS X-LONG, so nothing here is yawed: this export already lies
 * along +X with its bow on +X and its hull axis on y = 0, and every part is
 * placed by kit `add` in the file's own frame — the primitive un-turned,
 * the node's translation, XYZ Euler and scale verbatim; every cylinder is
 * born on Y and laid to the bow by −π/2 about Z on its node. THE SCALE is
 * still the one hulls/light-scout-pelagia.mjs states for all six shared
 * kinds: drawn 64.00 units long — the ram's point to the hub's after face,
 * with no turned box overhanging either end, and a unit off centre — built
 * here metre-true at 50 m, centred on its length, the axis at y = 0
 * (kit.mjs `metreTrue`).
 *
 * FACETS (#919). The Klaxon's rule is one facet edge of 2.5 m (docs/asset-prompts-3d.md Block 2c; bathyarch.mjs `cut`),
 * asked at this file's scale, and the pass re-cut what was off it: the
 * outer cans and their caps eight at 2.8 m and the middle can and its caps
 * ten at 3.6, where the export had twelve, and the prop shroud six at 2 m,
 * where it had ten. The crown rivets come down with the crown — a plate's
 * middle at eight and ten where twelve had a vertex (`cans`, `crownOnX`)
 * — 0.03 and 0.07 units. The ram, the hub, the gun and the keel pipes were
 * six and stay six. 46 parts and 952 triangles become 46 and 816.
 */
import { THREE, add, box, bothSides, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 50;
const DRAWN = 64;
const DATUM = 0;
// The Klaxon's facet rule at this file's scale (bathyarch.mjs `cut`, #919):
// the builders are handed the export's units and the rule is a chord in
// metres.
const cut = bathyarch.cut(L / DRAWN);

const black = bathyarch.ink.hullBlack();
const rust = bathyarch.ink.oxideRust();
const grey = bathyarch.ink.ironGrey();
const amber = bathyarch.ink.hazardAmber();
const lampM = bathyarch.ink.amberLamp();
const vent = bathyarch.ink.amberVent();

const root = new THREE.Group();
root.name = 'consortium_chorister';
const bar = (name, mat, size, t, e) => add(root, name, box(...size), mat, t, e);

// "Three overlapping segments": the cans, each with its caps and rivets in
// turn, bow first.
bathyarch.cans(
  root,
  { rust, grey },
  {
    cans: [
      { mat: black, x: 15, r: 3.6, length: 14, pitch: 2.4 },
      { mat: grey, x: 0, r: 4.6, length: 16, pitch: 2.8 },
      { mat: black, x: -16, r: 3.6, length: 14, pitch: 2.4 },
    ],
    cap: { length: 1.2, tip: 0.85, proud: 0.4 },
    rivet: { size: [0.6, 0.36, 0.6], proud: 0.2 },
    cut,
  }
);

// The keel under them, the deck walk over them, and a pipe run a side —
// the starboard one first, as the file writes it.
bar('keel', rust, [50, 1.4, 2.4], [0, -4.6, 0]);
bar('deck_walk', grey, [30, 0.6, 3], [-2, 4.7, 0]);
bathyarch.keelPipes(root, rust, {
  pipes: [
    ['pipe_s', 0.5, 34, [-1, 2.6, 3.8]],
    ['pipe_p', 0.5, 26, [3, 2.2, -4]],
  ],
  cut,
});

// The bow block and its ram; the stern block and the screw in its shroud.
bar('bow_block', black, [6, 5, 6], [26, 0, 0]);
bathyarch.ramCone(root, grey, { r: 2.4, length: 5, at: [30.5, 0, 0], cut });
bar('stern_block', black, [5, 4.5, 5], [-26, 0, 0]);
bathyarch.tailScrew(
  root,
  { grey, black },
  { at: [-29.5, -0.5, 0], shroud: { r: 2.6, length: 2.5 }, hub: { r: 0.8, length: 3 }, cut }
);

// "One small dorsal spine-gun off the centreline", to port; the hazard
// stripe down the deck walk and the patch beside it.
bathyarch.spineGun(
  root,
  { grey, black },
  { mount: { size: [3, 1.6, 3], at: [16, 5.2, -2] }, gun: { radii: [0.5, 0.6], length: 9, at: [21, 5.6, -2] }, cut }
);
bar('hazard_stripe', amber, [12, 0.3, 1], [-2, 5.05, 0]);
bar('patch', rust, [5, 0.4, 4], [-14, 3.7, 1.5]);

// A fin astern and a stub wing amidships a side: the +z pair first, which
// is starboard, then the −z pair (#642).
bothSides((side, sgn) => {
  bar(`fin_${side}`, grey, [6, 0.6, 5], [-22, 0, sgn * 6]);
  bar(`stub_wing_${side}`, grey, [8, 0.6, 4], [4, -1, sgn * 10.5]);
});

// The stack, and the light: two ports on the deck walk, the bow lamp on the
// bow block, the stern vent on the stern block.
bar('stack', black, [1.6, 4, 1.6], [-8, 6.5, 2.5]);
bar('port_a', lampM, [1.6, 0.5, 1.2], [-4, 5.05, 1.2]);
bar('port_b', lampM, [1.6, 0.5, 1.2], [6, 5.05, 1.2]);
bar('bow_lamp', lampM, [1, 0.5, 2], [28, 2.6, 0]);
bar('stern_lamp', vent, [0.8, 0.5, 1.4], [-27, 2.4, 0]);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'chorister-bathyarch.glb');
