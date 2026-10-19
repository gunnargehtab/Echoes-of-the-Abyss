/**
 * The Acolyte, the Commune's — 58 m (docs/units.md, "The scouts"; the
 * Acolyte block of docs/asset-prompts-3d.md Block 3, which pairs the kind
 * with the Directorate and, on the Chorister's rule, lets each navy field
 * it in its own shape language, read with the Pelagia FACTION block; #1439,
 * as the Verger's variants were in #1438).
 *
 * "The ears that sit still, 58 m — the Listening made a hull that holds a
 * chokepoint rather than driving past it (SIG 10 idle, 20 cruise; no
 * weapon; HYD 60 under way, 85 stationary; PR 2, 3 under the Directorate's
 * baseline; 40 m/s; 90 nodules and 15 Biomass). A squat three-tergite
 * carapace, wider in its limbs than in its shell, with six hydrophone
 * limbs walked out and planted — three a side, stout and jointed, the
 * forward pair raked ahead and the aft pair astern — a short rostrum, a
 * telson, and a listening dome sunk low into the middle tergite. The limbs
 * are the array and the model shows them down, planted in a hexapod's
 * tripod stance — fore and hind together a side, the middle limb a
 * half-stride the other way — which is the posture it hears at 85 in;
 * under way they fold flat under the shell. Nearly black: a photophore on
 * each limb's knee, in a pattern the stance keeps from repeating on either
 * side." — said the Commune's way: three lobes down the keel, the middle
 * the largest and the lowest for its beam, each a squashed orb of chitin
 * with a growth ring of ridge grown round it; a rostrum of ridge drawn to
 * a point and a tail of chitin drawn to one astern; a listening organ of
 * membrane sunk low into the middle lobe's back with its own ring and no
 * lamp; and six limbs grown out of the lobes' flanks and planted — a
 * knuckle of ridge at the hip, a stem of chitin to a knuckle at the knee,
 * a stem down to the ankle and a membrane hydrophone planted point-down
 * from it — with one photophore bud on each knee, which is the whole
 * resting light of a hull that idles at SIG 10.
 *
 * BUILT, not ported: there is no approved binary, so every number here is a
 * decision (docs/models-plan.md §3.1), and built in a state (§3.5): the
 * limbs are down. Drawn metre-true at 58 m, the rostrum's point at +29 and
 * the tail's at −29, nothing to rescale, as hulls/acolyte.mjs is. The
 * decisions that file took for the kind are kept and translated, not
 * retaken:
 *
 * - **The tripod stance, at the same stations.** Starboard hips at +13, −2
 *   and −13, port at +10, +1 and −16: fore and hind a side planted
 *   together, the middle one a half-stride the other way, the two sides a
 *   half-stride apart, so no knee answers another across the keel and the
 *   light on them inherits the rule (`grownLimbs` refuses a mirrored pair
 *   as the Directorate's builder does). The fore pair raked 0.6 rad ahead,
 *   the aft pair 0.6 astern, the middle pair square; the reach read along
 *   the raked line, so the knees come out widest amidships — a crab's.
 * - **The knee is the lit joint** — the one that stands clear of the shell,
 *   on top, where the chart's straight-down bake can see it (§3.2) — and
 *   the light is a bud, the navy's lamp at a node (the Sower's `bud`, the
 *   Cruiser's hydrophone tips), not a flat square: `limb_*_bud`, a
 *   `bio_light` orb 1.5 m across and 0.83 tall, 0.68 of it clear of the
 *   knuckle, on each knee knuckle's pole,
 *   six in all, in the stance's pattern — the knees at +15.8, −2 and −15.8
 *   to starboard and +12.8, +1 and −18.8 to port, the Directorate's own
 *   stations, 2.4 m above the axis.
 * - **The feet are hydrophones, planted below the keel.** A listening organ
 *   on this navy is membrane — the Verger's dome, the Chorister's middle
 *   lobe where the bladder shows — so each limb ends in a cone of
 *   `algae_membrane`, 1.6 m across and 2.4 long, point-down from the ankle,
 *   where the Directorate plants a red six-sided spike. The tips reach
 *   y −5.7, 1.4 m below the middle lobe's belly at −4.3: the hull stands
 *   on them.
 * - **The dome is sunk low and carries no lamp.** `listening_dome` is the
 *   Verger's sensory lobe (`sensoryDome`) in membrane, 7.6 m across, its
 *   crown at 5.1, 0.82 m proud of the lobe's 4.28 under it where the
 *   Directorate's is a metre,
 *   ringed aft of its centre, and without the Verger's `dome_boss`: the
 *   block lights the knees and nothing else, so the dome is dark as the
 *   Directorate's is. Off the keel line 0.9 m to starboard, as the Verger's
 *   is: the navy grows nothing on the line. In membrane it is the hull's
 *   brightest unlit surface, about twenty times the chitin shell in
 *   luminance — the Verger-pelagia's dome is the same, and the precedent.
 *
 * What the block does not say, decided here:
 *
 * - **Where the hips root, and why one side's are nearer the keel.** The
 *   hips are seated on the lobes' own skin (`lobeFlank`), half a metre
 *   inside it at 0.8 m under the axis. The lobes lean off the keel line
 *   alternately, 0.4 m to port, 0.5 to starboard, 0.3 to port from the
 *   stern — the Chorister's own asymmetry — and the aft starboard hip at
 *   −13 sits where the aft lobe has drawn in to a 5.1 m half-beam, so that
 *   limb stands 1.5 m nearer the keel than its port neighbour at −16. The
 *   lean is a pixel at the chart's 2 px/m and does not show on the sheet;
 *   the stance is the asymmetry that reads.
 * - **Knuckles, not orbs.** Every joint is a ridge knuckle squashed to 0.85
 *   (`tailKnuckle`'s proportion), the hips 2.5 m across and the knees 2.6,
 *   each wider than the stem that leaves it — femur 2.0 to 1.6 m, tibia 1.7
 *   to 1.2 — so a limb reads as grown segments swollen at the nodes rather
 *   than bones pinned between balls.
 * - **No dorsal spines, no vanes.** The Directorate's three spines are that
 *   navy's tell and would read as its hull in green. The Commune's tell is
 *   the lobe-and-ring series with the membrane organ sunk in it, and the
 *   block names nothing else on the back; a trim vane here would be a part
 *   the block does not have on a hull whose shape is its six limbs.
 * - **Rings clear of the hips.** Each lobe's ring stands 0.5 m proud of the
 *   skin on the beam and a quarter-metre on the back, since `cohortLobes`
 *   presses the ring to the lobe's own ry/rz, and is placed where no hip
 *   knuckle meets it: the aft ring 2 m
 *   abaft its lobe's centre (x −19), the middle 5 m ahead (x 4), the fore
 *   2.5 ahead (x 16.5).
 * - **The light burns at 0.3.** The conn view keeps each lamp's own
 *   luminance (rosterModels.ts `recolor`): `bio_light` at 1 is 0.62 of
 *   white, and the Directorate's `biolight_crimson` at 1, which its
 *   Acolyte's knees burn at, is 0.17. So the buds burn at 0.3 — 0.18 of
 *   white, level with the Directorate's knee a pixel at a time, so the two
 *   navies' Acolytes read one loudness side by side — under the
 *   Verger-pelagia's marks at 0.22 of white, and above only the Glider's
 *   wing vein at 0.07 (`bio_vein` at 0.2) among the navy's resting lamps. "Nearly black" is the band's
 *   first row (Block 3, the glow table), and six buds at 0.18 is that.
 *
 * THE LIGHT, measured (`lightAudit`, printed by `exportGlb`): six lit parts,
 * the six knee buds, 5.9 m² facing up together — about 1 m² each, a
 * five-sided bud 1.5 m across read at 4 px/m — on a plan the limbs make
 * 35.2 m broad, nothing hidden and nothing floating; the Directorate's six
 * squares show 6.5. The bake at E(10) = 0.92 reads raw E = 4.31 and dims by
 * ×0.216 (the Directorate's reads 7.22 and ×0.129): fourteen times clear of
 * the ×1/64 floor the quiet end must not touch (§3.2) and nowhere near the
 * ×64 ceiling. Intake's own pass at 2 px/m reads 4.03 and no warning.
 *
 * CONTACTS (`contacts.mjs`): 58 pairs meet, every one a mount — each ring
 * on its lobe; each lobe on the next; the dome and its ring in the middle
 * lobe and the ring on the dome; the rostrum's base in the fore lobe and
 * the tail's in the aft; each hip and the root of each femur in its lobe,
 * each femur in its hip and its knee, each bud on its knee, each tibia in
 * its knee and its femur's tip and its foot. The feet reach y −5.7, the
 * lowest point, 1.4 m under the middle lobe's belly at −4.3: the planted
 * feet, the tibiae, the hips and the lobes' bellies are the parts under
 * y 0, which is what planted means on a hull the view does not stand.
 *
 * FACETS (#919; pelagia.mjs `cut`): every round part is asked of the rule
 * — the lobes sixteen round at 6.4–8.6 m, the rostrum nine at 2.2 m and the
 * tail eight at 2, the knuckles five by six, the stems and feet five, the
 * buds five by three. PANELS: the navy's 18 hulls' median edge is 2.8 m,
 * 0 outside the 1.5–5 m band. 46 parts, 1,842 triangles.
 *
 * TRIM (#1109): none laid, as the Chorister's and the Verger's Commune
 * variants lay none; the Reed is the navy's one hull on the sheet. A first
 * export laid it, and `facets.mjs --parts` then named 45 of this model's
 * rings at radii that are not the geometry's (the rostrum at "14.97 m"):
 * the reader indexes a primitive's rows by its constructor's layout, and
 * the trim layout re-lays the vertices in place before the reader walks
 * the exported scene — a reader fault on every trim-laid model (the Reed's
 * ten are the same artefact), not the shape's.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/** The design length (UNIT_STATS hullLengthM, silhouettes.ts); the file is drawn to it. */
const L = 58;
const BOW = L / 2;
const STERN = -L / 2;

/** How the knee buds burn (the header): level with the Directorate's crimson knee. */
const KNEE = 0.3;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const knee = pelagia.ink.bioLight(KNEE);

// The Commune's facet rule, a chord of 1.5 m (docs/asset-prompts-3d.md Block
// 2c; pelagia.mjs `cut`), asked in metres since the file is drawn in them.
const cut = pelagia.cut();

const root = new THREE.Group();
root.name = 'commune_acolyte';

/**
 * The three lobes, stern first: each `{ at, radii }` as `cohortLobes` takes
 * them — the Directorate's three stations, the middle the widest and the
 * lowest for its beam (4.3 m tall on 8.6 across, "squat"), and each leaning
 * its own way off the keel line. `ring` is where its growth ring stands,
 * `dx` from the centre, cresting 0.5 m proud of the lobe's skin there from
 * a shoulder 0.75 below the crest.
 */
const LOBES = [
  { at: [-17, 0, -0.4], radii: [8.6, 3.3, 6.4], ringDx: -2 },
  { at: [-1, 0, 0.5], radii: [11.2, 4.3, 8.6], ringDx: 5 },
  { at: [14, 0, -0.3], radii: [8.8, 3.5, 6.9], ringDx: 2.5 },
];
const ringOn = ({ radii: [rx, , rz], ringDx }) => {
  const crown = rz * Math.sqrt(1 - (ringDx / rx) ** 2) + 0.5;
  return { dx: ringDx, crown, shoulder: crown - 0.75 };
};
pelagia.cohortLobes(root, ridge, {
  cut,
  lobes: LOBES.map((lobe) => ({
    skin: chitin,
    at: lobe.at,
    radii: lobe.radii,
    ring: ringOn(lobe),
  })),
});

// The rostrum, a cone of ridge drawn to the bow's point, its base 10 m
// inside the fore lobe; the tail a cone of chitin drawn to a point astern,
// its base 6 m into the aft lobe. Each on its own lobe's line, off the keel's.
pelagia.nose(root, ridge, { name: 'rostrum', tip: BOW, z: -0.3, r: 2.2, length: 10, cut });
pelagia.nose(root, chitin, {
  name: 'stem_tail',
  tip: STERN,
  z: -0.4,
  r: 2,
  length: 6,
  aft: true,
  cut,
});

// The listening organ sunk low into the middle lobe: a lobe of membrane
// 7.6 m long, 6.4 tall and 7.2 across, centred 1.9 m up and 0.9 m to
// starboard of its lobe's line so its crown stands 0.86 m proud of the
// shell's 4.24 there; a growth ring 1.6 m aft of its centre; no boss.
const DOME = { at: [-1, 1.9, 1.4], radii: [3.8, 3.2, 3.6] };
const domeRing = (() => {
  const [rx, , rz] = DOME.radii;
  const dx = -1.6;
  const crown = rz * Math.sqrt(1 - (dx / rx) ** 2) + 0.4;
  return { dx, crown, shoulder: crown - 0.6, halfWidth: 0.5 };
})();
pelagia.sensoryDome(root, { skin: membrane, ridge }, { ...DOME, ring: domeRing, cut });

// The six hydrophone limbs, walked out and planted in the tripod stance
// (the header): hips 0.8 m under the axis and half a metre into the flank,
// a femur 5 m out and 3.2 up to the knee, a tibia 4 m out and 6 down to the
// ankle, and a membrane hydrophone 2.4 m planted from it. The fore pair
// raked 0.6 rad ahead, the aft pair 0.6 astern, the middle pair square.
const RAKE = 0.6;
pelagia.grownLimbs(
  root,
  { knuckle: ridge, stem: chitin, foot: membrane, light: knee },
  {
    lobes: LOBES,
    hip: { y: -0.8, sink: 0.5, r: 1.25, squash: 0.85 },
    femur: { r: [1.0, 0.8], reach: 5, rise: 3.2 },
    knee: { r: 1.3, squash: 0.85 },
    bud: { r: 0.75, squash: 0.55, sink: 0.15 },
    tibia: { r: [0.85, 0.6], reach: 4, drop: 6 },
    foot: { r: 0.8, length: 2.4, sink: 0.3 },
    cut,
    limbs: [
      { side: 's', x: 13, rake: RAKE },
      { side: 's', x: -2, rake: 0 },
      { side: 's', x: -13, rake: -RAKE },
      { side: 'p', x: 10, rake: RAKE },
      { side: 'p', x: 1, rake: 0 },
      { side: 'p', x: -16, rake: -RAKE },
    ],
  }
);

// Built in metres from the start; this guards the length and centres it.
metreTrue(root, L, { drawn: L });
await exportGlb(root, 'acolyte-pelagia.glb');
