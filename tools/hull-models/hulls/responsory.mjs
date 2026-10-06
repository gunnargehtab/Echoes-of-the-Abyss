/**
 * The Responsory — the Order's mid-tier, 95 m (docs/units.md, "The mid-tier").
 *
 * "A Clarion interrupted: the same long forward spine and the same fall away
 * astern, the faction's shape and not this hull's — broken amidships by a pair
 * of resonator shoulders, one each side, tuned rings standing proud of the
 * spine in a shallow cradle and canted outward, listening across the beam where
 * the cone hears nothing."
 *
 * So it is a Clarion in every part except the one it argues with, and it is
 * built from the Order's vocabulary rather than beside it: a narrow faceted
 * spar, thin planar wings for the beam, the bow array carrying the light, and
 * the rings where a Clarion has canards.
 *
 * Two things changed in #645 (off #540 Phase 6), and both are lights the
 * built model of #531 carried sealed inside opaque parts — the emitter core
 * seen by neither renderer, the ring cores by nothing but a tangent sliver
 * on the chart — and named on every build by the kit's light audit:
 *
 * - The emitter core stands 1.5 m further forward, its tip 0.2 m proud of
 *   the crystal's and on the bow at x 47.5, and because the two octahedra
 *   are the same shape its forward faces stand proud of the crystal's by
 *   that 0.2 m along their whole slope: the emitter's forward faces are the
 *   lit thing, as the Clarion's core is the lit point of its crystal
 *   (`bowArray`'s `coreLead`). The lead is the largest that keeps the tip
 *   inside the design half-length of 47.5 — 0.25 pushes the bow out — and
 *   at that lead the core owns 40 cells of the 4 px/m raster, 2.5 m²
 *   facing up where none did, twice the Clarion's core, so it reads. The
 *   hull is drawn 95.01 m to it (the drive prism reaches −47.51, a
 *   centimetre past `STERN`, as it always has), so the bake's rescale is
 *   0.9999 where the crystal's tip at 47.3 had left it 1.002.
 * - The two ring cores are gone. "The rings cold" is the block's own word
 *   for the resting state, which is the state the chart bakes, so a lamp
 *   inside each ring could never be lifted into view without contradicting
 *   it — and sealed in crystal it was 560 triangles that put nothing on
 *   the chart but a tangent sliver, seven pixels a ring of the very glow
 *   the block refuses (`resonatorRing`). 45 parts and 2,816 triangles
 *   become 43 and 2,256.
 *
 * `node tools/hull-models/diff.mjs responsory-hadron 2059d57` lists the core's
 * move and the two removals, and nothing else. The generated outline's bow
 * loses one vertex of its port side with the tip's move: the model is
 * mirror-true part for part, and the asymmetry is `outlines.mjs`'s
 * simplifier, run once round a closed polygon, which was already leaving
 * eight unmatched points on this hull before the pass.
 *
 * A third light went in #775, and it was never sealed: it was the one lit part
 * the block names and puts under way, so a lamp on it at rest contradicted the
 * block rather than going unmentioned by it. `spine_thread` — a `crystal_seam`
 * lamp 43 m long on the inlay's top, 13.25 m² of plan area and 30 % of the
 * hull's resting lit area — was here because `hadron.spine` drew one unless
 * told not to. The block puts the thread under way — "the array brightens
 * along its whole length and a thread runs the spine to the rings" — and the
 * subsection's own gloss says what rest is: "the cone lit and the flanks not".
 * The three marks the block is silent on stay: the Clarion's block licenses
 * its stern mark ("dark astern but for one mark"), this hull's inherits it
 * ("the same fall away astern, the faction's shape and not this hull's"), and
 * the band table's floor row is "navigation marks only", so a mark is licensed
 * at every band. A lamp dark at rest is a lamp this pipeline never shows: the
 * chart bakes the resting state, and the conn view swings every lamp from its
 * resting strength by one factor (`applyLiveGlow`), so nothing dark at rest
 * lights under way. That is the rule the ring cores went on, and the thread
 * goes on it too — removed rather than clad, because the block names no thread
 * among the hull's parts, only among its lights. The bow array, the two nav
 * marks and the drive's stern mark carry the whole of E(27) now: 31.6 m²
 * facing up where 44.9 did, raw E 22.1 where 28.7, and the bake still dimming,
 * at ×0.139 where it was ×0.108: a sevenfold surplus of raw energy, 8.9× above
 * the ×1/64 floor, and nowhere near the ×64 ceiling a light-starved hull runs
 * into. 43 parts and 2,256 triangles become 42 and 2,244; `diff.mjs
 * responsory-hadron 7fbb9ba` lists the one removal and no movement, and the
 * outline does not change.
 *
 * LAMPS THAT FLOAT (#907, from #894's measure). The three marks rested on
 * nothing: `stern_mark` hung 1.28 m over the drive prism's top flat, and
 * `nav_mark_s` and `nav_mark_p` 1.72 m over the hull's shoulder at
 * (−16, 4.9, ±3.4). The stern mark lies on the prism now, dropped from its
 * own station with its underside on the top flat and pitched with the
 * prism's taper (`drive` `mark.on`, kit.mjs `seat`). Each nav mark is
 * seated on the hull's skin nearest its own station, stood half its
 * thickness off (kit.mjs `seat`), and the nearest is the shoulder — the
 * second facet of the ten-facet body, from the top flat's edge at z 1.28
 * down to z 3.36 — so each lies on it at z ±2.3, rolled 36° outboard with
 * the facet and showing from above. Not dropped from its station: straight
 * under z 3.4 is the third facet, 72° from level, where a box would stand
 * nearly on edge and show under a cell. Same names, sizes and material;
 * `diff.mjs responsory-hadron` lists the three and no other part.
 *
 * FACETS (#919). The Order's rule is one facet edge of 3 m
 * (docs/asset-prompts-3d.md Block 2c; hadron.mjs `facets`, `cut`), and five
 * parts here were off it. Each resonator ring is twelve round on a tube of
 * four, where it was twenty-eight on eight; the crystal ring inside it ten
 * round, where it was twenty-eight, on the hexagonal tube it had; and the
 * emitter barrel four-sided at a metre of radius, a diamond with its ridge
 * on the crown, where it was ten. The body's ten at 4.6 m was the rule's
 * already and is asked of it now. 42 parts and 2,244 triangles become 42
 * and 1,084; `diff.mjs responsory-hadron fc217cb` lists the five re-cut
 * parts and no movement.
 *
 * PANELS (#919). "Fine ceramic panelling over the whole hull, seams tight"
 * is this hull's own block, and its median unlit part from above read
 * 6.04 m on a side over twenty-two, a resonator ring, against the hulls'
 * band of 2–6 (docs/asset-prompts-3d.md Block 2c; hadron.mjs
 * `ceramicSeams`, "Panels"): the wings, 289 m² each, were the barest
 * plates in the navy. Six seams of shadow across them, three a wing in
 * mirrored pairs, each 0.5 m wide standing 0.2 proud and laid on the wing
 * under it, athwart at x −38, −30 and −22 from clear of the body's
 * shoulder to short of the edge strip or the leading edge — half a metre
 * short of the strip at −38, and 0.3–0.6 short of the swept edge at −30
 * and −22, corner to corner. They show
 * 2.6–6.6 m² each, so the median lands between the array lip and the
 * drive prism at 4.12 m over twenty-eight; no part moved, no lamp's plan
 * changed, and the outline is what it was. 42 parts and 1,084 triangles
 * become 48 and 1,156.
 *
 * TRIM (#1109). The first Order hull laid out on the navy's trim sheet:
 * `exportGlb`'s `trim` takes the Order's panelling (factions/hadron.mjs
 * `TRIM`, the `facet` pattern) and trim.mjs lays every part's UV0 in
 * metres at export — 584 faces flat, 572 unrolled, 856 on the one-strake
 * band, 120 on two, 40 on four, 140 on eight, 138 vertices split, no
 * triangle moved — and tags `shadow_indigo` and `pale_alloy` for it.
 * `resonance_crystal` is laid out and left bare (the table's `untagged`):
 * the lip, the ring crystals, the drive ring, the inlay, the edge strips
 * and the emitter are violet stone, not panelling, and the five lamps are
 * never tagged. The table's `mirror` has every flat face laid along the
 * beam measure its plates from the centreline out, so the wing seams, the
 * panel seams, the cradle lips and the canards carry their joints at one
 * |z| on both sides, where the first layout, measuring from each part's
 * own low edge, put the port twin's elsewhere (the review of #1109); the
 * flat skin differs from its mirror by under 3 sRGB levels through a
 * 16-texel blur (docs/screenshots/issue-1109/mirror.mjs). The blade
 * unrolls at four plates round its 19.4 m girth, the horn at four, the
 * drive at two, so every butt on one beam has its twin on the other; the
 * emitter barrel, 4.8 m round, is one plate with its joint on the crown
 * ridge and mirrors within 3.7 levels. Two things do not mirror, both
 * the unroll's: a joint that falls mid-facet on a tapering facet follows
 * the triangle diagonal and kinks, 0.38 m on the drive prism's top flat,
 * about a pixel at the conn view's 3 px/m, on the blade, the horn, the
 * drive and the rings; and the ring stays, one plate round and laid as a
 * pair, unroll from a basis the mirror turns over, so one carries its
 * butt inboard and the other outboard. 4.2 % of the tagged area differs
 * from its mirror by more than 8 levels, all of it there, and #746 takes
 * both. `diff.mjs responsory-hadron 39cc1e41` reads the shape
 * as unchanged; the outline, the height and emissive maps and gate 3 are
 * untouched, and the file goes from 104,480 to 110,156 bytes (zlib 13,098
 * to 15,676), the split vertices and the JSON naming the layout and the
 * tags.
 */
import { THREE, bothSides, add, box, seat, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 95;
const BOW = L / 2;
const STERN = -L / 2;

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const node = hadron.ink.resonanceNode();

const root = new THREE.Group();
root.name = 'hadron_responsory';

// The body: a spar 9 m in section on 95 m, not a slab. The Clarion's rule.
hadron.bladeBody(root, shadow, { bow: 30, stern: STERN, maxR: 4.6 });
// The spine and its inlay, and no thread: the block lights one under way, and
// a lamp dark at rest is a lamp this pipeline never shows (the header).
hadron.spine(root, { alloy, crystal, seam }, { from: -34, to: 28, y: 4.4 });

// The bow array, and the hull's whole resting light budget with it. The
// crystal's tip is at 47.3; the core's leads it by 0.2 m, onto the bow at
// 47.5 (the header says why that number).
hadron.bowArray(
  root,
  { alloy, crystal, seam, node },
  { from: 29, to: BOW - 5.4, r: 5.2, coreLead: 0.2 }
);
// The emitter runs aft from the array along the spine as a slim faired
// barrel — the rule's four at a metre of radius (hadron.mjs `cut`, #919), a
// diamond with its ridge on the crown, where the first build had ten.
const barrel = new THREE.CylinderGeometry(0.85, 1.0, 22, hadron.cut().round(1.0));
add(root, 'emitter_barrel', barrel, alloy, [10, 5.9, 0], [0, 0, Math.PI / 2]);

// The resonator shoulders — the one thing a Clarion does not have. Cold at
// rest, as the block has them (the header).
hadron.resonatorRing(
  root,
  { shadow, alloy, crystal },
  { x: 1, y: 5.2, z: 13.5, r: 5.8, cant: 0.42 }
);

// Beam is wing, as it is on every Order hull.
hadron.wings(root, { alloy, crystal }, { aft: -42, fwd: -8, inner: 1.2, outer: 17, tipChord: 9 });
hadron.canards(root, alloy, { from: 12, to: 24, inner: 1.2, outer: 8 });
hadron.finAndKeel(root, alloy, {
  fin: { x: -33, y: 6.4, length: 11, height: 5.4 },
  keel: { x: -20, y: -4.6, length: 20, height: 3.2 },
});
// The drive, and its mark on the prism's top flat (the header).
hadron.drive(root, { shadow, crystal, node }, { x: -43.6, r: 2.3, mark: { on: 'drive_prism' } });
hadron.panelSeams(root, alloy, { from: -26, to: 22, count: 4, halfBeam: 4.2 });

// Two navigation marks abaft the rings — with the drive's stern mark, the
// only light that is not forward — each on the hull's shoulder facet,
// seated from the file's station at z ±3.4 (the header).
bothSides((side, sgn) => {
  const laid = seat(root, 'blade_hull', [-16, 4.9, sgn * 3.4], { stand: 0.15 });
  add(root, `nav_mark_${side}`, box(1.6, 0.3, 0.5), seam, laid.at, laid.rot);
});

// Seams across the wings — the block's "fine ceramic panelling ... seams
// tight" where the hull was barest (PANELS, the header): three a wing,
// athwart, from clear of the body's shoulder to short of the edge strip.
hadron.ceramicSeams(root, shadow, {
  name: 'wing_seam',
  on: ['wing_s', 'wing_p'],
  w: 0.5,
  h: 0.2,
  pairs: [
    ['0', [-38, 2.5], [-38, 15.7]],
    ['1', [-30, 3.5], [-30, 14.6]],
    ['2', [-22, 4.2], [-22, 9.5]],
  ],
});

await exportGlb(root, 'responsory-hadron.glb', { trim: hadron.TRIM });
