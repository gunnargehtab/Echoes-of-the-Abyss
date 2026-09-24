/**
 * The Sounding Spire, Hadron Knights — 140 m of footprint (2 × `radiusM`
 * 70, packages/shared/src/structures.ts), SIG 30 idle; the Order's
 * signature structure.
 *
 * "Tall crystalline resonance spire, bilaterally symmetrical, pale alloy
 * frame around a violet crystal core (SIG 80 when active, directional).
 * Dim at rest: the crystal glowing low from core to apex, the horn tips
 * with it, and running lights up the frame; burning bright along the
 * crystal when active; heat-shimmer distortion" (docs/asset-prompts-3d.md,
 * STRUCTURE — Sounding Spire, as #893 amended it).
 *
 * A port of the approved export
 * (docs/concept-art/models/sounding-spire-hadron.glb at f7cce0f), part for
 * part in its order, every number the export's own (#652, off #540 Phase
 * 3). Forty-six parts, 1,684 triangles: an eight-facet plinth and cap turned
 * an eighth; four anchor legs on the diagonals with a claw on each; a
 * crystal core, throat and apex that are three octahedra drawn tall; two
 * frame blades that are one bevelled extrusion, the `_l` a reflection of
 * the `_r`; three resonance collars, four-sided rings with a vane each
 * side; two tuning horns with lit tips and the brace between; two ballast
 * pipes with flanges and two capsules of tank; ten running lights on one
 * six-by-five orb; and the heat-shimmer sheath, a subdivided octahedron in
 * the one translucent material on any Order model.
 *
 * THE FRAME, and the trap in it. An X-long r184 export that is square to
 * the digit: 9.66856606468874 by 9.66856606468874 in plan by the measure
 * the bake takes (intake `rawSize`) — the plinth's eight-facet frustum,
 * turned an eighth, sets both extents from the same cos π/8 + sin π/8 of
 * its radius. Intake's yaw rule is strict `raw.z > raw.x`, so the approved
 * file was *not* yawed (`rotatedZtoX: false`), which is the opposite tie to
 * the Knights' Vent Tap, whose square plan fell an ulp the other way and
 * was (structures/vent-tap-hadron.mjs). So this file builds in the export's
 * own frame with no yaw at all: every part at the file's translation, Euler
 * and scale, `fitFootprint` holding 9.6686 at 140 m on the root. A port
 * whose z came out one ulp over its x would be yawed a quarter and bake its
 * maps turned; the script asserts x ≥ z after the fit so that fails here
 * rather than in the maps. `diff.mjs` reads this as a square plan and says
 * which yaw agrees.
 *
 * SIDES. Every pair is the export's `_r`/`_l` (`hadron.pair`) and every one
 * mirrors across the export's x, the `_r` at +x — which on an unyawed
 * X-long file is the bow axis and neither beam (the vanes, horns, tips,
 * pipes, flanges, tanks and lights). The blades' `_l` is a reflection of
 * the `_r` (node scale [−1, 1, 1]), written as the file decomposes it. The
 * legs and claws are numbered, not sided, in the order (+x,+z), (+x,−z),
 * (−x,+z), (−x,−z). Nothing is relabelled and nothing is mirrored.
 *
 * ODDITIES kept, because a port is not where a shape gets decided:
 * - the four legs are pitched 0.14 about the *world's* x (an XYZ Euler, the
 *   x turn outermost), so the two at +z rise outboard and the two at −z
 *   dip — an asymmetry across the beam on a "bilaterally symmetrical" spire,
 *   the file's; the claws use the other order (YXZ) and are symmetric
 *   (`hadron.anchorLegs`);
 * - each flange is spun 0.1 about the vertical rather than leaned with its
 *   pipe, because its roll and its laying were written in the order that
 *   spins it (`hadron.ballastPipes`);
 * - the throat stands a millimetre off the axis in z (a z-fight nudge);
 * - the sheath's node scale is three floats nobody chose — 0.9787191366860281,
 *   4.89772495462554, 1.0028839332603607 — carried to the digit
 *   (`hadron.shimmerSheath`);
 * - the two lamps burn at 2.1000000006830546 and 3.000000001062529, the
 *   file's floats (#639 review, N1);
 * - the blades, each vane pair, the horns, the tips, the tanks and all ten
 *   lights share a buffer; every leg, claw, collar, pipe and flange is its
 *   own. As the file has them.
 *
 * `diff.mjs sounding-spire-hadron f7cce0f`: unchanged beyond the root scale
 * and shift — every part is where it was (a square plan, compared as it
 * stands). #890 moved two running lights; #894 put them back, below.
 *
 * LIGHT (#890, #893, #894). The block names every lamp on the file. Its
 * resting clause since #893: "the crystal glowing low from core to apex"
 * is the core, the throat and the apex, "the horn tips with it" the two
 * tips, and "running lights up the frame" the ten; and its "heat-shimmer
 * distortion" is `heat_shimmer_sheath`, translucent and emissive at 0.55.
 * "Burning bright along the crystal when active" is the same lamps
 * scaled, the one-glow-factor reading (models-plan.md §3.2, the paragraph
 * after the rules), as the approved model and #652 have it. When #890
 * placed them the clause named only the active band, and the resting set
 * was carried as the approved file lights it (#890, review rulings,
 * ruling 2); #893 settled it by naming the set. Four lamps read as hidden
 * from above until #894; one still does, as the residual audit line the
 * audit names on every build:
 * - `crystal_core` stays, and the audit sees it since #894. Its only
 *   occluder from above is `heat_shimmer_sheath`, alpha-blended at six
 *   percent; until #894 glb.mjs `topDown` — what kit.mjs `lightAudit`
 *   calls — and the bake's material swap both treated the sheath as solid,
 *   so the core, the Spire's largest light in the conn view, read as
 *   hidden and baked dark under a solid sheath, and the sheath itself
 *   counted as a lamp of 974 m² over everything it wraps. A part blended
 *   at under half opacity occludes nothing now and is no lamp to the
 *   audit (glb.mjs `occludes`), and the bake blends it at its own
 *   opacity, so the core is on the chart and the sheath is the
 *   six-percent haze over it the block asks for. No part moved.
 * - `crystal_throat` stays. It is sealed inside the core — the file's
 *   z-fight nudge is the millimetre between them — and no upward face can
 *   carry it. Residual.
 * - Eight of the ten running lights (all but the `running_light_1` pair)
 *   and both horn tips stand off the frame by the audit's second measure
 *   (#894): the file hung the lights 0.4 to 6.5 m from the blades they run
 *   beside, the tips 1.4 m over their horns. The issue names none
 *   of them, and a light re-hung on a blade is a shape decision this port
 *   does not take; they are carried as the file has them and named in
 *   #907.
 * - `running_light_3_r` and `running_light_3_l`, the pair 11.8 up the
 *   frame, sit at x ±0.9 where the export put them, under the sheath's
 *   bulge (its middle facet at 12.4 over a crown at 11.9). #890 moved them
 *   outboard to x ±1.15 because the audit read 0.06 m² of each under a
 *   sheath it took for solid; with the sheath read as the six-percent
 *   haze it is (#894) the export's station shows 5.1 m² from above, the
 *   move has no reason left, and the pair is back where the file has it.
 *   `diff.mjs sounding-spire-hadron f7cce0f` lists no part.
 */
import { THREE, fitFootprint, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 140;
const DRAWN = 9.66856606468874;

const steel = hadron.ink.darkSteel();
// At the hulls' metalness of 0.35 since #888; the export had the turret's 0.25.
const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.alloyWhite();
// The two strengths are the approved export's own floats (#639 review, N1).
// The lit crystal is `resonance_crystal_dim`, the turret's fixture, since
// #888: the approved export lit it under the cladding's name
// `resonance_crystal`, over #2A1650 at metalness 0.1, and a name that is a
// cladding on the hulls and a lamp here is two names. The emissive did not
// move, so the strength is the file's.
const crystal = hadron.ink.resonanceCrystalDim(2.1000000006830546);
const glow = hadron.ink.crystalGlow(3.000000001062529);
// The sheath's base is the seam's near-black since #891; the export had the
// crystal-glow token under its six percent (the module's `heatShimmer`).
const shimmer = hadron.ink.heatShimmer(0.55);

const root = new THREE.Group();
root.name = 'sounding_spire';

// The plinth and its cap, each turned an eighth.
hadron.plinth(root, 'plinth', steel, { rTop: 3.1, r: 3.7, h: 1, y: 0.5 });
hadron.plinth(root, 'plinth_cap', shadow, { rTop: 2.5, r: 3.15, h: 0.7, y: 1.35 });

// Four legs on the diagonals, a claw on the end of each.
hadron.anchorLegs(
  root,
  { alloy, steel },
  {
    leg: { size: [0.55, 0.5, 3.4], reach: 2.4, y: 0.45, pitch: -0.14 },
    claw: { r: 0.32, length: 1.5, reach: 3.9, y: 0.5, dip: 0.12 },
  }
);

// The core, its throat and its apex — the crystal that burns (see LIGHT).
hadron.crystalCore(
  root,
  { crystal, glow },
  {
    core: { r: 1.5, at: [0, 9.2, 0], scale: [0.85, 4.6, 0.85] },
    throat: { r: 1, at: [0, 9.2, 0.001], scale: [0.55, 3, 0.55] },
    apex: { r: 0.55, at: [0, 16.6, 0], scale: [0.6, 2.6, 0.6] },
  }
);

// The frame: one blade, base to tip and back, drawn on +x and reflected to −x.
hadron.frameBlades(root, alloy, {
  outline: [
    [0.5, 0],
    [2.3, 1.1],
    [2.7, 6.4],
    [1.5, 12.5],
    [0.7, 15],
    [0.45, 12.3],
    [1.25, 6.3],
    [1, 1.5],
    [0.5, 0.6],
  ],
  depth: 0.5,
  bevel: [0.12, 0.1],
  at: [0, 1.7, 0],
});

// Three collars up the core, narrowing, a vane each side.
hadron.resonanceCollars(
  root,
  { alloy, shadow },
  {
    rings: [
      [3.6, 1.15, 1.7],
      [7.4, 0.95, 1.5],
      [11.6, 0.7, 1.25],
    ],
    t: 0.16,
    vane: { r: 0.14, length: 1.5 },
  }
);

// The tuning horns, their lit tips, and the brace.
hadron.tuningHorns(
  root,
  { alloy, glow, steel },
  {
    horn: { size: [0.3, 6.2, 0.62], reach: 1.55, y: 13.4, lean: 0.045 },
    tip: { r: 0.28, length: 1.8, reach: 1.83, y: 17.3, yaw: Math.PI / 4 },
    brace: { size: [3.3, 0.3, 0.4], y: 12 },
  }
);

// The ballast pipes, a side at a time, and the tanks.
hadron.ballastPipes(
  root,
  { steel, alloy },
  {
    pipe: { rTop: 0.18, r: 0.22, h: 3.6, at: [0.95, 3.4, -0.85], lean: 0.1 },
    flange: { r: 0.26, t: 0.06, at: [0.88, 4.3, -0.85] },
  }
);
hadron.ballastTanks(root, shadow, { r: 0.62, waist: 1.6, at: [2.3, 1.35, -1.5] });

// Ten running lights, two pairs at the foot and three up the frame — the
// third of those under the sheath where the export has them (see LIGHT).
hadron.lightPairs(root, glow, {
  name: 'running_light',
  r: 0.1,
  at: [
    [2.6, 1.85, 1.4],
    [2.6, 1.85, -1.4],
    [1.35, 6.4, 0.9],
    [0.9, 11.8, 0.55],
    [1.7, 16.2, 0],
  ],
});

// The heat shimmer, last: the sheath over the core.
hadron.shimmerSheath(root, shimmer, {
  r: 1.5,
  at: [0, 9.2, 0],
  scale: [0.9787191366860281, 4.89772495462554, 1.0028839332603607],
});

const size = fitFootprint(root, L);
if (Math.abs(size.x - DRAWN) > 1e-6 || size.z > size.x)
  throw new Error(
    `${root.name}: drawn ${size.x} × ${size.z}; the header says ${DRAWN} square, x first`
  );
await exportGlb(root, 'sounding-spire-hadron.glb');
