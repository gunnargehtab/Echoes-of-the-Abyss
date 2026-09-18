/**
 * The Lance — the Order's committed shot, 95 m (docs/units.md, "Lance
 * (Slipway)").
 *
 * "The committed shot, 95 m — one torpedo, a magazine of one, and a tube
 * that refuses any bearing outside the hull's own cone, so it can only fire
 * at what it faces, and a hull facing you is at its loudest (SIG 20 idle;
 * 50 cruise ahead, 17.5 on the beam, 5 astern; no gun; 380 hull; 65 m/s;
 * 320 nodules and 40 Resonance Crystal). A lance in plan, bilaterally
 * symmetric: a spike, a crossguard and a grip. The spike is an open faceted
 * rail the length of the forward third with the one torpedo lying in it,
 * its nose standing in a crystal muzzle collar as the bow — the weapon is
 * the point of the ship, and with it fired the hull is a hilt with no
 * blade. The crossguard is two crystal-edged guard blades amidships opened
 * to a right angle, their leading edges at 45° to the keel: the cone's own
 * 90° drawn as the guard, and the tube launches only between them. The grip
 * is a narrow faceted shaft aft to a flat transom with the drive prism in
 * the spine — no canards, no guard wings astern, nothing behind the guard
 * to hear, and nothing of the Reciter's needle. Dim at rest but for the
 * crystal in the collar; under way, sustained glow along the guard's
 * leading edges and up the rail to the collar, thrown forward, faint on the
 * beam and dark astern but for one mark — the quarter it is loud in is the
 * quarter it can fire into." (docs/asset-prompts-3d.md, Block 3, the
 * ordnance hulls)
 *
 * Built, not ported (#785, off #540 Phase 4): drawn from the module's
 * vocabulary with no approved binary behind it, so every number here is a
 * decision, and this header says which ones the block did not make.
 * Metre-true at 95 with no root scale: the collar's lip is the bow at
 * x 47.5 and the transom face the stern at −47.5 (`metreTrue` asserts it).
 * Built in a state (models-plan.md §3.5): loaded, the one torpedo in the
 * rail, because a spent Lance is the same hull with the rail empty and the
 * loaded one is the track an enemy sees.
 *
 * Three things in the block's order, and the plan reads as all three:
 *
 * - **The grip, and the body under all of it,** are one spar — the rung's
 *   blade, a four-facet lathe laid flat to the Clarion's section of 0.55 by
 *   1.5 — 67.5 m long from the transom to where its nose closes inside the
 *   torpedo's tail at x 20.5, fullest at x 0 under the guard, where it is
 *   9.3 m in beam and 3.4 m tall: a beam-to-length of 0.098, the narrowest
 *   body in the navy against the Clarion's 0.121 and the Herald's 0.137,
 *   because the block says "a narrow faceted shaft" and on this hull the
 *   beam is guard. It keeps 5.1 m of beam to the stern and ends square
 *   (`transom`, the Herald's idiom), with the drive prism a four-facet
 *   crystal point 9 m long, its base flush in the transom's upper half and
 *   lifted 0.5 m off the axis so the spine's after end lies inside it —
 *   "the drive prism in the spine". No ring.
 * - **The crossguard** is `wings` under the Cantus's names, re-angled: each
 *   guard blade one plane 0.9 m thick rooted along the flank from x 4.5 to
 *   13, its leading edge running from the root at (13, 3) to the tip at
 *   (−3.5, 19.5) — 16.5 m out for 16.5 m aft, 45° to the keel exactly, so
 *   the two leading edges open to the right angle the block asks for and
 *   the torpedo launches between them — a bevel from the point back to
 *   (−7, 17.5), and the trailing edge home to the flank at 4.5. It is a
 *   bar, 6 m across at the root and drawn to a point: a first cut ran the
 *   root chord 28 m to x −15, and the plate that made read from above as
 *   a delta wing on a fuselage, which is an aircraft and not a crossguard.
 *   The tips are ±19.5 m, 39 m across on 95: ±0.205 of the length, the
 *   Antiphon's ±0.208, and the widest thing on the hull, which is what
 *   "widest at the guard, amidships" needs the track to say. Along each
 *   leading edge a strip 0.7 m wide in the lamp family's unlit finish
 *   (`ink.crystalSeamUnlit`, through `edge.mat`, new for this hull): the
 *   block lights the guard's leading edges under way, and a lamp dark at
 *   rest is a lamp this pipeline never shows (§3.2, rule 2). No canard.
 * - **The spike** (`spike`, new in the module) is where the hull stops
 *   being hull. Two runners — four-facet spars a metre square, 29.8 m long
 *   from inside the body's flank at x 16 to inside the collar's wall at
 *   45.8, at z ±2.0 and 1.1 m below the torpedo's axis — joined under it by
 *   three alloy ribs and by nothing else: the runners are the rail, and
 *   carry the unlit finish for the reason the guard edges do. The torpedo
 *   is a capsule of eight facets, 3 m across and 30 m long from its tail at
 *   x 16.5 to its nose at 46.5, lying between the runners with 1.3 m of its
 *   back above them and a cross of tail fins at x 19; the body's lathe
 *   closes to r 0.7 inside its tail. The collar is a six-facet crystal
 *   ring, bore and all, 2 m long from x 45.5 to the bow, its wall from
 *   r 1.8 inside to 2.5 aft and 2.9 at the lip — wider than the rail it
 *   ends, so the bow reads as a mouth and not a tube — with a vertex on the
 *   crown as the Clarion's lip has; the nose stands 1 m inside it.
 *
 * WHAT THE BLOCK DID NOT SAY — decided here:
 *
 * - **The stern mark is a resting lamp.** The block puts "dark astern but
 *   for one mark" in its under-way clause only, exactly as the Herald's did
 *   before #784 amended it; the band table's floor row is "navigation marks
 *   only", which licenses a mark at every band, and the plan's §4 bullet
 *   names "the collar crystal and one stern mark" as the resting lamps.
 *   The block should say so in both clauses, as the Herald's now does.
 * - **The collar is the lamp, whole.** "The crystal in the collar" is read
 *   as the collar being crystal and lit, as the Herald's throat crystal is
 *   one whole lamp — not the gun hulls' clad crystal with a lit core
 *   (`bowArray`), which the Antiphon's review settled is an idiom for a
 *   hull whose block names an array. This block names a collar and "no
 *   gun".
 * - **The torpedo is alloy and finned.** The block says "the one torpedo"
 *   and no more. It is cut in the hull's `pale_alloy` rather than the
 *   turrets' dark steel so that from above the spike is the bright thing
 *   the guard and spine are, in a dark rail — "the weapon is the point of
 *   the ship" — and it carries a cross of tail fins because a capsule with
 *   no fins is the turrets' ammo pod, and this one has to read as a weapon
 *   lying in a rail and not a tank strapped to a bow.
 * - **The rail is two runners and three ribs.** "An open faceted rail" says
 *   what it is and not how it is built: open means no roof and no side
 *   above the runners, faceted means the runners are the Order's four-facet
 *   cut, and the ribs are what holds the torpedo. Nothing else is under it:
 *   the body ends inside its tail, so from the flank the forward third is a
 *   weapon in a cradle and not a hull with a weapon on it.
 * - **A spine with an unlit inlay, a dorsal fin and a keel.** The block
 *   names none of them; nor does the Herald's, and every Order hull but the
 *   Light Scout carries the three. They are what makes a bare spar read as
 *   the family from the conn view, and none is a lamp. The fin stands at
 *   x −38..−30, which "nothing astern" does not forbid — a fin is not heard
 *   — and the stern mark sits on the spine's crown at x −42.5..−41.5, 3.5 m
 *   clear of the fin's trailing edge, 0.35 m proud of the crown with the
 *   drive prism's ridge 0.5 m under it.
 * - **What the track shows.** `outlines.mjs` cuts the widest thing at
 *   every station, so the generated outline is the hand-drawn one drawn
 *   thinner and with the guard's after edge as a step: the lip ±0.026 of
 *   the length across at the bow, the rail drawn straight to the guard's
 *   root at ±0.034 at x 0.138, the leading edge at 45° to the tip at
 *   ±0.198 at x −0.05, the bevel and then a cliff down to the flank at
 *   ±0.049 at x −0.075 — a bar swept aft has no trailing edge a per-station
 *   cut can see — and the grip's taper to ±0.028 at the transom, against
 *   the hand-drawn ±0.04, ±0.05, ±0.23 at x −0.02, ±0.09 at −0.12 and
 *   ±0.04. Still a spike, a chevron and a shaft, and still widest
 *   amidships.
 *
 * Resting light, all of it on the axis, and the kit's audit clean: the
 * muzzle collar, 9.6 m² facing up, and the stern mark on the spine's crown,
 * 0.8 m² — nothing on the flanks, nothing on the guard, nothing on the
 * rail. 10.4 m² on 891 m² of plan (the bake's 3,565 mask px at 2 px/m).
 * On the shipped emissive at 4 px/m the collar is a patch of about 19 by
 * 8 pixels at the bow and the mark one of 4 by 3 astern. The bake at
 * E(9) = 0.856 — the compass average of the idle 20, as every Order row
 * bakes (models-plan.md §3.3) — reads raw E 11.30 and dims by ×0.076 onto
 * 0.856, nearly five times above the ×1/64 floor the quiet end has to stay
 * clear of (the Herald's ×0.073) and nowhere near the ×64 ceiling. A first
 * cut with a 3.2 m collar and the wide guard read ×0.057; the collar was
 * shortened and the guard narrowed, and the two moved it together. 21
 * parts, 484 triangles, bounds x ±47.5, y −3.9..4.8, z ±19.5.
 */
import { THREE, exportGlb, metreTrue } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 95;
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
root.name = 'hadron_lance';

// The body: 67.5 m of spar from the transom at x −47 to its nose at 20.5,
// fullest at x 0 under the guard, keeping its section to the stern where
// the transom closes it and drawn in fast ahead of the guard so the nose
// closes inside the torpedo's tail (the header).
hadron.bladeBody(root, shadow, {
  profile: [
    [-47, 2.4],
    [-40, 2.9],
    [-28, 3.6],
    [-14, 4.3],
    [0, 4.4],
    [10, 3.6],
    [16, 2.5],
    [19, 1.4],
    [20.5, 0.7],
  ],
  facets: 4,
  flat: BLADE,
});
// The flat transom: the section at the last station, r 2.4 → 0.93 by 2.55,
// with a hand's breadth over, its face the stern at −47.5.
hadron.transom(root, shadow, { x: STERN, t: 0.8, halfHeight: 1.0, halfBeam: 2.7 });

// The spine and its inlay, from inside the drive's base forward to where
// the crown falls away ahead of the guard; the inlay is crystal clad and
// unlit, as the Clarion's is.
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    profile: [
      [-46, 0.3],
      [-40, 1.2],
      [4, 1.2],
      [12, 0.4],
    ],
    y: 1.3,
    flat: [0.7, 1],
    inlay: {
      profile: [
        [-36, 0.3],
        [-32, 0.8],
        [0, 0.8],
        [8, 0.3],
      ],
      y: 1.85,
      flat: [0.5, 1],
    },
  }
);

// The crossguard: the wing builder under the Cantus's names, the leading
// edge from (13, 3) to (−3.5, 19.5) — 45° to the keel exactly — and the
// strip along it 0.7 m wide in the seam's unlit finish, its inner line
// pulled a metre back from the tip so it stays inside the point (the
// header).
hadron.wings(
  root,
  { alloy, crystal },
  {
    name: 'guard_blade',
    edgeName: 'guard_edge',
    outline: [
      [4.5, 3.0],
      [13, 3.0],
      [-3.5, 19.5],
      [-7, 17.5],
    ],
    t: 0.9,
    y: 0.65,
    edge: {
      mat: unlit,
      outline: [
        [13, 3.0],
        [-3.5, 19.5],
        [-3.29, 18.3],
        [12.5, 2.5],
      ],
      t: 1.3,
      y: 0.75,
    },
  }
);

// The spike, and the hull's whole argument (the header): the two runners
// in the unlit finish, three ribs under the torpedo, the torpedo lying on
// them with its tail fins over the body's nose, and the collar it points
// through, whose forward face is the bow at x 47.5.
hadron.spike(
  root,
  { alloy, unlit, node },
  {
    rail: {
      profile: [
        [16, 0.5],
        [18, 0.7],
        [44, 0.7],
        [45.8, 0.35],
      ],
      y: 0.5,
      z: 2.0,
      flat: [1, 1],
    },
    ribs: { at: [24, 32, 40], y: -0.1, size: [0.8, 0.6, 5.0] },
    torpedo: {
      x: 31.5,
      y: 1.6,
      r: 1.5,
      length: 27,
      facets: 8,
      fins: { x: 19, chord: 3, span: 2.0, t: 0.3 },
    },
    collar: {
      profile: [
        [45.5, 1.8],
        [45.5, 2.5],
        [BOW, 2.9],
        [BOW, 1.8],
        [45.5, 1.8],
      ],
      y: 1.6,
      flat: [1, 1],
    },
  }
);

// The fin's trailing edge is at x −38, 3.5 m clear of the stern mark's
// forward face (the header); the keel under the guard.
hadron.finAndKeel(root, alloy, {
  fin: { x: -34, y: 3.0, length: 8, height: 3.6 },
  keel: { x: -4, y: -2.6, length: 18, height: 2.6 },
  t: 0.7,
});

// The drive: a crystal point in the spine's line, its base in the transom's
// upper half at the stern; no ring, and the one mark astern on the spine's
// crown at x −42 — the crown is at y 1.75 there and the prism's ridge
// 0.5 m under it — the only light on the hull that is not in the collar.
hadron.drive(
  root,
  { shadow, crystal, node },
  {
    x: STERN + 4.5,
    y: 0.5,
    r: 2.0,
    facets: 4,
    taper: 0,
    length: 9,
    mat: crystal,
    ring: false,
    mark: { mat: seam, size: [1.0, 0.4, 0.8], x: -42, y: 1.9 },
  }
);

// Metre-true as drawn: 95 from the transom face to the collar's lip, so the
// scale this returns is 1 and the root carries nothing.
metreTrue(root, L, { drawn: L });

await exportGlb(root, 'lance-hadron.glb');
