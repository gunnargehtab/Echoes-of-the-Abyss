/**
 * The Versicle — the Order's craft, 22 m (docs/units.md, "The craft"), the
 * one the Offertory's deck builds and launches.
 *
 * "UNIT — Versicle (pair with Hadron Knights): the craft, 22 m — the
 * Offertory's, and the hardest craft in the roster: built by a deck,
 * ordered by nobody, crewed by nobody, and launched only at what its
 * carrier faces" (docs/asset-prompts-3d.md, Block 3, the carriers — the
 * block is written from this script, #840). Figures: SIG 20 idle, 50 cruise as cone
 * figures; 45 on the energy class at 500 m every 2.6 s; 150 hull; 80 m/s;
 * PR 2; no price, no yard, no crew.
 *
 * Built, not ported (#840): no approved binary behind it, so every number
 * here is a decision. Metre-true at 22 with no root scale: the emitter's
 * point is the bow at x 11 and the drive prism's base the stern at −11
 * (`metreTrue` asserts it), and its plan is `hadron.VERSICLE_PLAN` — the
 * Offertory's cradles are cut to that outline, so the build asserts its own
 * bounds against it and fails rather than outgrow its cradle.
 *
 * A dagger, and the Lance's cone at 22 m: a point, a blade, a guard and a
 * grip, bow to stern, and the plan reads as all four.
 *
 * - **The blade** is the rung's four-facet spar pressed to 0.55 by 1.5, as
 *   the Lance and the Herald are, 19.4 m from inside the drive at x −10.2 to
 *   its nose inside the emitter at 9.2: fullest at x −1.5 where the guard
 *   leaves it, 3.8 m in beam and 1.4 m tall, and drawn from there to the
 *   point along a straight flank, so ahead of the guard the plan is a
 *   blade's long triangle and not a fish's lens. On a hull of 90 m that
 *   beam-to-length of 0.17 would be a slab; on one of 22 it is the least a
 *   hull can be and still carry an emitter and a drive, and the beam is
 *   still guard.
 * - **The point** is the emitter crystal, one whole lamp in the node's
 *   violet — the Herald's throat crystal and the Lance's collar, not the gun
 *   hulls' clad crystal with a lit core (`bowArray`): at this scale a core
 *   standing proud of its crystal is a sliver under the light audit's floor,
 *   and a horn round it is a part the chart cannot see. A four-sided
 *   pyramid 2.1 m long on a base 0.9 m across, its base over the blade's
 *   nose. It is the craft's gun and its resting light.
 * - **The guard** is `wings` under the Lance's names at the Lance's angle:
 *   each blade rooted along the flank, its leading edge at exactly 45° to
 *   the keel from (−1.0, 1.5) to the tip at (−3.7, 4.2) — so the two open to
 *   the right angle the Lance's crossguard draws, the cone's own 90° — a
 *   bevel back to (−4.7, 3.9) and the trailing edge swept forward home to
 *   the flank at (−3.4, 1.3), so each is a bar drawn to a point and not a
 *   fin: a first cut with a 6 m root chord and the trailing edge swept aft
 *   made two diamonds on a lens, which from above was a fish. 8.4 m across,
 *   0.38 of the length, the widest thing on the craft. Along each leading
 *   edge a strip 0.4 m wide in the seam's unlit finish
 *   (`ink.crystalSeamUnlit`, through `edge.mat`), because the block lights
 *   the guard's leading edges under way and a lamp dark at rest is a lamp
 *   this pipeline never shows (models-plan.md §3.2, rule 2).
 * - **The grip** is the same spar drawn in behind the guard to 2.5 m of
 *   beam, and the drive prism at its end is the pommel: a crystal point
 *   2.2 m long, its base the flat stern and a hand wider than the grip.
 *
 * WHAT THE BLOCK DOES NOT SAY — decided here:
 *
 * - **Nothing aboard that a crew would need.** No canopy (the Order's Light
 *   Scout has one), no hatch, no ports, no navigation marks, no stern mark:
 *   "a hull nobody crews" is drawn as what is missing. The craft has no
 *   depth drive either (§15, "The band"), which a plan cannot show and a
 *   keel blade does not deny.
 * - **A spine with a cold inlay, a dorsal fin and a keel**, the three every
 *   Order hull but the Light Scout carries, at craft scale — the blade's
 *   ridge and its fuller, the fin 1.1 m high over the grip, the keel 0.9 m
 *   under the guard, none of them a lamp. They are what makes a 22 m sliver
 *   read as the family from the conn view.
 * - **Dark astern with no mark.** The block's astern is 2 at rest and 5
 *   under way; the Antiphon, at 3.5, carries none, and a craft that is
 *   never ordered and never navigates has less use for one.
 *
 * Resting light: the emitter crystal alone, 0.88 m² facing up — nothing on
 * the flanks, nothing on the guard — and the kit's audit clean. The bake at
 * E(9) = 0.856 — the compass average of the idle 20 (models-plan.md §3.3) —
 * reads raw E 14.90 at the shipped 4 px/m and dims by ×0.057 onto it
 * (13.32 and ×0.065 at intake's 2 px/m): 3.6 times the ×1/64 floor, where
 * the Lance and the Herald sit at five, because a craft's plan is small and
 * any lamp a chart can see is a large share of it. 11 parts, 200
 * triangles, bounds x ±11, y −1.4..1.6, z ±4.2. 22 m is 22 px on the chart
 * at 1 px/m and 88 at the shipped 4.
 */
import { THREE, exportGlb, metreTrue, bounds } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 22;
const BOW = L / 2;
const STERN = -L / 2;

/** The blade every rung hull is cut to: a four-facet section pressed to 0.55 tall by 1.5 wide. */
const BLADE = [0.55, 1.5];

const shadow = hadron.ink.shadowIndigo();
const alloy = hadron.ink.paleAlloy();
const crystal = hadron.ink.resonanceCrystal();
const seam = hadron.ink.crystalSeam();
const unlit = hadron.ink.crystalSeamUnlit();
const node = hadron.ink.resonanceNode();

const root = new THREE.Group();
root.name = 'hadron_versicle';

// The blade: a straight taper from the guard to the nose inside the
// emitter's base, fullest at x −1.5 where the guard leaves it, and the grip
// drawn in behind the guard to the drive's point at x −10.2.
hadron.bladeBody(root, shadow, {
  profile: [
    [-10.2, 0.75],
    [-8.5, 1.0],
    [-5.5, 1.2],
    [-3.5, 1.75],
    [-1.5, 1.8],
    [3, 1.3],
    [7, 0.75],
    [9.2, 0.3],
  ],
  facets: 4,
  flat: BLADE,
});

// The spine and its inlay — the blade's ridge and its fuller — from over
// the drive forward to where the blade falls away toward the point; the
// inlay is crystal clad and cold, as the Clarion's is.
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    profile: [
      [-9.5, 0.15],
      [-8.5, 0.5],
      [-2, 0.45],
      [3, 0.5],
      [6, 0.15],
    ],
    y: 0.62,
    flat: [0.7, 1],
    inlay: {
      profile: [
        [-7, 0.1],
        [-6, 0.24],
        [1, 0.24],
        [2.5, 0.1],
      ],
      y: 0.84,
      flat: [0.5, 1],
    },
  }
);

// The guard: the Lance's crossguard at 22 m, the leading edge at 45° to the
// keel and the strip along it in the seam's unlit finish (the header).
hadron.wings(
  root,
  { alloy, crystal },
  {
    name: 'guard_blade',
    edgeName: 'guard_edge',
    outline: [
      [-3.4, 1.3],
      [-1.0, 1.5],
      [-3.7, 4.2],
      [-4.7, 3.9],
    ],
    t: 0.35,
    y: 0.05,
    edge: {
      mat: unlit,
      outline: [
        [-1.0, 1.5],
        [-3.7, 4.2],
        [-4.135, 4.069],
        [-1.55, 1.49],
      ],
      t: 0.5,
      y: 0.1,
    },
  }
);

// The point: the emitter crystal, a lamp whole, its base over the blade's
// nose and its point the bow at x 11.
hadron.point(root, 'emitter_crystal', node, { x: BOW - 1.05, y: 0.05, r: 0.45, length: 2.1 });

// The fin over the grip, the keel under the guard.
hadron.finAndKeel(root, alloy, {
  fin: { x: -7.4, y: 1.05, length: 2.4, height: 1.1 },
  keel: { x: -2.5, y: -0.95, length: 5, height: 0.9 },
  t: 0.25,
});

// The drive: a crystal point in the spine's line, its base the flat stern
// at x −11 and a hand wider than the grip — the pommel; no ring and no
// mark — dark astern.
hadron.drive(
  root,
  { shadow, crystal, node },
  {
    x: STERN + 1.1,
    y: 0.1,
    r: 1.1,
    facets: 4,
    taper: 0,
    length: 2.2,
    mat: crystal,
    ring: false,
    mark: null,
  }
);

// Metre-true as drawn: 22 from the drive's base to the emitter's point.
metreTrue(root, L, { drawn: L });

// The cradle is cut to VERSICLE_PLAN (factions/hadron.mjs): the craft may
// not be wider than the plan says, or longer, or it no longer fits its deck.
{
  const b = bounds(root);
  const plan = hadron.VERSICLE_PLAN;
  const halfBeam = Math.max(...plan.map(([, z]) => z));
  const [bow, stern] = [plan[0][0], plan[plan.length - 1][0]];
  const off = (a, e) => Math.abs(a - e) > 0.051;
  if (off(b.z[1], halfBeam) || off(-b.z[0], halfBeam) || off(b.x[1], bow) || off(b.x[0], stern))
    throw new Error(
      `versicle: built x ${b.x.join('..')} z ${b.z.join('..')}, but VERSICLE_PLAN is ` +
        `x ${stern}..${bow} z ±${halfBeam} — the Offertory's cradles are cut to the plan`
    );
}

await exportGlb(root, 'versicle-hadron.glb');
