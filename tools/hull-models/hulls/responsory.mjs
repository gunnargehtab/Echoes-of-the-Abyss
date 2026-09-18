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
 * `node tools/hull-models/diff.mjs responsory-hadron HEAD` lists the core's
 * move and the two removals, and nothing else. The generated outline's bow
 * loses one vertex of its port side with the tip's move: the model is
 * mirror-true part for part, and the asymmetry is `outlines.mjs`'s
 * simplifier, run once round a closed polygon, which was already leaving
 * eight unmatched points on this hull before the pass.
 */
import { THREE, bothSides, add, box, exportGlb } from '../kit.mjs';
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
hadron.spine(root, { alloy, crystal, seam }, { from: -34, to: 28, y: 4.4, thread: true });

// The bow array, and the hull's whole resting light budget with it. The
// crystal's tip is at 47.3; the core's leads it by 0.2 m, onto the bow at
// 47.5 (the header says why that number).
hadron.bowArray(
  root,
  { alloy, crystal, seam, node },
  { from: 29, to: BOW - 5.4, r: 5.2, coreLead: 0.2 }
);
// The emitter runs aft from the array along the spine as a slim faired barrel.
const barrel = new THREE.CylinderGeometry(0.85, 1.0, 22, 10);
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
hadron.drive(root, { shadow, crystal, node }, { x: -43.6, r: 2.3 });
hadron.panelSeams(root, alloy, { from: -26, to: 22, count: 4, halfBeam: 4.2 });

// Two navigation marks abaft the rings, the only light that is not forward.
bothSides((side, sgn) =>
  add(root, `nav_mark_${side}`, box(1.6, 0.3, 0.5), seam, [-16, 4.9, sgn * 3.4]));

await exportGlb(root, 'responsory-hadron.glb');
