/**
 * The Herald — the Order's scout, 65 m (docs/units.md, "Herald (Foundry)").
 *
 * "The scout that scouts by leaving, 65 m — the cone with its mouth open
 * (SIG 14 idle; 45 cruise ahead, 15.8 on the beam, 4.5 astern; no weapon;
 * HYD 55; 100 m/s). A short faceted blade hull, bilaterally symmetric,
 * forked at the bow into two crystal-edged tines with an emitter crystal
 * standing in the throat between them — the fork is the horn and the slot
 * is the cone's mouth — widest just abaft the fork and drawn aft to a flat
 * transom with the drive prism in the spine: no guard wings, no canards,
 * nothing astern to hear. Nearly black at rest but for the crystal in the
 * throat and the one mark astern; under way, sustained glow along the
 * tines' inner edges, thrown forward out of the fork, and dark astern but
 * for that mark — the quarter it is loud in is the quarter it faces, and
 * the quarter it shows you is the one it runs in." (docs/asset-prompts-3d.md,
 * Block 3, the scouts, as #784 amended it)
 *
 * Built, not ported (#784, off #540 Phase 4): drawn from the module's
 * vocabulary with no approved binary behind it, so every number here is a
 * decision, and this header says which ones the block did not make.
 * Metre-true at 65 with no root scale: the tines' tips are the bow at x 32.5
 * and the transom face the stern at −32.5. Built in a state (models-plan.md
 * §3.5): the mouth open, which is the only state the fork has.
 *
 * The body is the rung's blade — a four-facet spar laid flat, the Clarion's
 * section of 0.55 by 1.5 — 46 m long from the transom to the throat floor,
 * 8.9 m in beam and 3.3 m tall at its fullest station, x 6, which is 6.5 m
 * abaft the throat: "widest just abaft the fork". Its beam-to-length is
 * 0.137 against the Clarion's 0.121 and the Antiphon's 0.144. It keeps 4.9 m
 * of beam to the stern and ends square (`transom`), where every other Order
 * hull draws to a point buried in its drive: "a flat transom", and the one
 * that says so is the block. The drive prism sits in the transom's upper
 * half, a four-facet crystal point 8 m long lifted 0.6 m off the axis so the
 * spine's after end lies inside its base — "the drive prism in the spine",
 * the Antiphon's idiom — with no ring.
 *
 * The fork (`forkedBow`) is the whole of the hull's argument, and it is the
 * thing the module could not draw until now. Two tines, each one plane
 * 0.8 m thick: rooted along the body's flank from x −3 to the throat at
 * 12.5, the shoulder at x 8 and z ±10 — the hull's beam, 20 m on 65, and
 * the beam is blade as it is on every Order hull; with no wing, the blade
 * is the tine — and each drawn forward to a point at x 32.5, z ±5.2, so
 * the tips are 10.4 m apart. The slot between them is the mouth: 6 m wide
 * at the throat and 10.4 m at the lips, flaring forward as a horn does, and
 * 20 m deep. Abaft the shoulder each tine ends in a barb, the trailing edge
 * running 11 m back into the flank at x −3, and no further: a first cut
 * took it to x −8, and the plate that left aft of the shoulder read from
 * above as a swept guard wing, which the block refuses by name. A tine's
 * mass is ahead of its root. Along each outer edge a crystal strip, the
 * Clarion's wing edge on a blade that points forward; along each inner edge
 * a seam in the lamp family's unlit finish (`ink.crystalSeamUnlit`, new for
 * this hull), because the block lights the inner edges under way and a
 * lamp dark at rest is a lamp this pipeline never shows (§3.2, rule 2). The
 * emitter crystal stands in the throat on the axis, a crystal point 6.5 m
 * long from its base seated in the body's nose at x 13 to its tip at 19.5,
 * and it is the resting light: a lamp, whole, as the Cantus's apex is, not
 * the gun hulls' clad crystal with a lit core (`bowArray`), which the
 * Antiphon's review settled is an idiom for a hull whose block names an
 * array. This block names one crystal and "no weapon".
 *
 * WHAT THE BLOCK, AS FIRST WRITTEN, DID NOT SAY — decided here, and the
 * first written into it in #784:
 *
 * - **The stern mark is a resting lamp.** The block put "dark astern but
 *   for one mark" in its under-way clause only, so read strictly the
 *   resting state was the crystal alone. The band table's floor row is
 *   "navigation marks only", which licenses a mark at every band (the
 *   Antiphon's and the Drifter's headers, #775 on the Responsory's), and a
 *   plan §4 names "the throat crystal and one stern mark" as the resting
 *   lamps. The block now says so in both clauses.
 * - **A spine with an unlit inlay, a dorsal fin and a keel.** The block
 *   names none of them; the Clarion's and Antiphon's blocks name none of
 *   theirs either, and every Order hull but the Light Scout carries the
 *   three. They are what makes a bare spar read as the family from the
 *   conn view, and none is a lamp. The fin stands astern, which "nothing
 *   astern to hear" does not forbid — a fin is not heard.
 * - **The slot flares.** "The slot is the cone's mouth" says what it is and
 *   not its shape; a mouth widens toward its lips, so the inner edges
 *   diverge forward from ±3 at the throat to ±5.2 at the tips while the
 *   outer edges converge, and each tine draws to a point.
 * - **What the track shows.** `outlines.mjs` cuts the widest thing at every
 *   station, so a slot between two tines is not a shape it can write: the
 *   generated outline is the hand-drawn one without its notch — a lip
 *   ±0.082 of the length across at the bow, the shoulders at ±0.151 at
 *   x 0.125, a knee at x −0.05 where the barbs meet the flank, and the
 *   body's taper to ±0.039 at the transom, against the hand-drawn ±0.12,
 *   ±0.2 and ±0.06 with its notch to x 0.16. The fork is the model's and
 *   the conn view's; the track is a clipped dart, and it reads bow-forward
 *   because the lip is twice the transom.
 *
 * Resting light, all of it on the axis, and the kit's audit clean: the
 * emitter crystal, 5.0 m² facing up, and the stern mark on the spine's
 * crown, 0.5 m² — nothing on the flanks, nothing on the tines. 5.5 m² on
 * 612 m² of plan (the bake's 2,449 mask px at 2 px/m). The bake at
 * E(6.3) = 0.71 — the compass average of the idle 14, as every Order row
 * bakes (models-plan.md §3.3) — reads raw E 8.28 and dims by ×0.086 onto
 * 0.70, five and a half times above the ×1/64 floor the quiet end has to
 * stay clear of and nowhere near the ×64 ceiling. 15 parts, 256 triangles,
 * bounds x ±32.5, y −3.8..4.9, z ±10.
 */
import { THREE, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 65;
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
root.name = 'hadron_herald';

// The body: 46 m of spar from the transom at x −32 to the throat floor at
// 14, fullest at x 6 just abaft the throat, keeping its section to the stern
// where the transom closes it and drawn in fast ahead of the throat so the
// nose sits under the emitter's base.
hadron.bladeBody(root, shadow, {
  profile: [
    [-32.0, 2.3],
    [-26, 2.8],
    [-14, 3.5],
    [-2, 4.1],
    [6, 4.2],
    [10, 3.6],
    [12.5, 2.8],
    [14, 0.6],
  ],
  facets: 4,
  flat: BLADE,
});
// The flat transom: the section at the last station, r 2.3 → 0.9 by 2.44,
// with a hand's breadth over, its face the stern at −32.5.
hadron.transom(root, shadow, { x: STERN, t: 0.8, halfHeight: 1.0, halfBeam: 2.55 });

// The spine and its inlay, from inside the drive's base forward to where the
// crown falls away at the throat; the inlay is crystal clad and unlit, as
// the Clarion's is.
hadron.spine(
  root,
  { alloy, crystal, seam },
  {
    profile: [
      [-31, 0.3],
      [-26, 1.2],
      [4, 1.2],
      [9, 0.3],
    ],
    y: 1.3,
    flat: [0.7, 1],
    inlay: {
      profile: [
        [-22, 0.3],
        [-18, 0.8],
        [0, 0.8],
        [5, 0.3],
      ],
      y: 1.85,
      flat: [0.5, 1],
    },
  }
);

// The fork, and the hull's whole argument (the header): two tines rooted
// along the flank, the crystal edge outboard, the unlit seam inboard, and
// the emitter crystal standing in the throat with its base in the nose.
hadron.forkedBow(
  root,
  { alloy, crystal, unlit, node },
  {
    tip: [BOW, 5.2],
    shoulder: [8, 10],
    heel: [-3, 4.2],
    throat: [12.5, 3.0],
    inner: 1.0,
    t: 0.8,
    y: 0.4,
    edge: { width: 0.6, t: 1.2, short: 2.5 },
    seam: { width: 0.5, t: 1.1, short: 3.5 },
    emitter: { x: 16.25, r: 0.8, length: 6.5 },
  }
);

hadron.finAndKeel(root, alloy, {
  fin: { x: -24, y: 3.2, length: 8, height: 3.4 },
  keel: { x: -6, y: -2.6, length: 14, height: 2.4 },
  t: 0.6,
});

// The drive: a crystal point in the spine's line, its base in the transom's
// upper half at the stern; no ring, and the one mark astern on the spine's
// crown — the only light on the hull that is not in the throat.
hadron.drive(
  root,
  { shadow, crystal, node },
  {
    x: STERN + 4,
    y: 0.6,
    r: 2.0,
    facets: 4,
    taper: 0,
    length: 8,
    mat: crystal,
    ring: false,
    mark: { mat: seam, size: [1.0, 0.4, 0.8], x: -27, y: 2.05 },
  }
);

await exportGlb(root, 'herald-hadron.glb');
