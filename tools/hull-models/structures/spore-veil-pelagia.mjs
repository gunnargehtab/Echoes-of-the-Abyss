/**
 * The Spore Veil, Pelagia Commune — 170 m of footprint (2 × `radiusM` 85,
 * packages/shared/src/structures.ts), SIG 20 idle.
 *
 * "The Veil Mother — a low, breathing spore bed grown into the seabed: broad
 * overlapping lobes, paired gill organs with vent slits exhaling a faint
 * haze, slender spore stalks swaying above (SIG 20 idle — the cloud itself
 * is silent). Nearly dark; faint bioluminescent breathing lines around the
 * gills, a faint glow in the haze they exhale, faint vein rings round the
 * lobes and dim lit tips on the stalks only" (docs/asset-prompts-3d.md,
 * STRUCTURE — Spore Veil). The Commune's own signature structure.
 *
 * Six lobes — a core and five grown against it, west, east, north, south
 * and a runt — each its own size and set its own way, in two skins; three
 * growth rings round the crown; two gill organs, port and starboard, each a
 * mound with four vent slits under a cone of haze and four lit breathing
 * lines standing round its outboard shoulder; four lit vein rings of
 * segments laid on the bed's skin round the crown and the west and east
 * lobes; six spore stalks of six heights, each leaned its own way, with a
 * pale pod and a dim lit tip; seven root flares round the bed's edge; and
 * two points of glow inside, one in the core and one among the stalks.
 *
 * A port of the approved export (docs/concept-art/models/spore-veil-
 * pelagia.glb at f7cce0f), part for part in its order, every number the
 * export's own, read off its nodes and its buffers with
 * tools/hull-models/parts.mjs. Every part comes from `factions/pelagia.mjs`:
 * the lobes and mounds are `grownOrbs`, the rings `grownHoops`, and the
 * Veil's own vocabulary — `gillOrgan`, `veinRing`, `sporeStalk`,
 * `rootFlares` — is one rule each, recovered from the file to the double.
 * Nothing here is a shape decision; where the export is odd the script is
 * odd with it:
 *
 * - Port is −z (#642): `gill-organ-port` sits at z −0.35 and `-stb` at
 *   +0.35, so the names are right and stay. The two organs are not a
 *   mirrored pair (see `gillOrgan`): the slits and breathing lines are
 *   identical on both, and the mound and the haze carry negated rolls.
 * - The root flares all lean toward +z: their lean is applied before their
 *   yaw in the file's XYZ Euler, so the yaw only spins each cone on its own
 *   axis (see `rootFlares`). Kept.
 * - The stalks' sway across is one constant of their height, 0.0298876…,
 *   which reduces to no expression the port could find; it is carried as
 *   the file's number (`sporeStalk`).
 * - Twenty-one rotations — the north and south lobes, sixteen vein-ring
 *   segments, three root flares — the file writes in three's (±π, b, ±π)
 *   or (a − π, b, ±π) form of the XYZ Euler; each is written here as the
 *   plain rotation of the same matrix, which shows the lobes' yaws to be
 *   1.8 and 2.6 and the flares' leans to be one number and π/3 more. (The
 *   segments have since taken a roll and a pitch each, to the skin they
 *   lie on — #893, below — so their nodes are no longer the file's.)
 * - The export carries two `KHR_lights_punctual` point lights as its last two
 *   nodes, named `glow-core` and `glow-stalks`; they are kept (`glow`) at
 *   the file's colour, intensity and range. No map can see them.
 *
 * THE FRAME is the export's own: drawn along X, 7.13 across by the measure
 * the bake takes — three's `Box3` over the parts' own boxes, which the
 * leaned stalks' boxes overhang — priced at 170 m by the table, so the root
 * carries that one scale through kit.mjs `fitFootprint`, as the Vent Taps
 * do, and no yaw.
 *
 * LIGHT PLACEMENT (#890 and #893, the light axis of #540). The light
 * audit on the approved file named thirty of the thirty-one vein-ring
 * segments and seven of the eight breathing lines as showing under a
 * cell from above: every segment lay inside the lobe it rings, and every
 * slit and line sat below its mound's skin under the haze cone, on the
 * file's own numbers. The block's lighting clause names four lamps at
 * rest — the breathing lines, the glow in the haze, the vein rings and
 * the stalk tips, "only" — since #893 settled the two it had not named
 * (the haze, and the rings #890 had clad as a lamp no band named) on the
 * side of more lights, not fewer. One decision a series:
 *
 * - `gill-breath-line-port-1..4`, `-stb-1..4` (#890): the clause names
 *   them, so they stay lit in `bio_light` (`bio-vein` until #891) and
 *   move onto an upward face — each organ's four stand round its mound's outboard shoulder at 0.64
 *   and 0.66 from the crown, past the haze cone's 0.55 top radius, laid
 *   tangent, sunk 0.02 and leaned 0.5 outward (`gillOrgan` `lines`), on
 *   bearings that are the organ's own and not the other's turned round.
 *   The slits stay where the file has them.
 * - `vein-ring-core` (9, `bio_light` at 2.2), `-core-2`, `-west`, `-east`
 *   (8, 7 and 7, `bio_light` at 0.9; `bio-vein` and `bio-vein-dim` until
 *   #891) (#893): lit again in the light and at the strengths the approved
 *   file gave them — #890 had clad all 31
 *   in `bio_vein_unlit` — and lifted out of the lobes onto the bed's
 *   skin, "faint vein rings round the lobes": each segment at the file's
 *   own plan station, laid on the skin of the lobes and growth rings
 *   beneath it as a plank on rough ground, by two clauses read under its
 *   own faces — its mid-plane 0.01 under the skin's high spot, so that
 *   its top stands 0.0125 proud of it; its bottom nowhere clear of the
 *   skin by more than 0.01 — in the pose in which the two disagree least
 *   (`veinRing` `on`, `sink`). The file laid each ring flat at one height
 *   on its lobe's waist: the core ring at 0.42, where the crown's skin is
 *   0.62–0.68, so it rides the crown now, rolled 23–25° to the crown's
 *   fall; core-2 at 0.18, where the bed under its 1.75 radius is the west
 *   lobe's crown at 0.59–0.46, then the cleft between the west and north
 *   lobes, where the core's shoulder shows and the segments follow it
 *   down to 0.34 and 0.26 rolled 55° and 34° onto its flank, the fifth
 *   across `growth-ring-3`'s tube where that pokes out, then the north
 *   lobe's crown at 0.38–0.44; the west ring at 0.3 and the east at 0.32,
 *   each of whose first two segments come down the core's flank at 0.60
 *   and 0.47 (0.58 and 0.46), pitched 21–28°, onto their own lobe's crown
 *   at 0.38–0.43 (0.41–0.45). Probed on 81 × 13 and again on 97 × 17 of
 *   each face, straight down and along the skin's normal: twenty-seven
 *   of the thirty-one are seated, bottom in the skin and never clear of
 *   it, top 0.0123–0.0126 proud of the high spot. Four cross from one
 *   lobe to another, and there the second clause binds, the bottom clear
 *   by 0.0100–0.0103 (0.0080–0.0095 along the normal) at the tightest
 *   read: `vein-ring-core-2-seg-5` (the cleft's floor onto the north
 *   lobe), `vein-ring-west-seg-2` and `vein-ring-east-seg-2` (each the
 *   core's flank onto its own lobe's crown) sit within both clauses even
 *   so, their tops 0.0009, 0.0009 and 0.0028 proud at the tightest point;
 *   `vein-ring-core-2-seg-4` (off the west lobe's edge onto the core's
 *   shoulder, a hump with a twist that no rigid bar lies flat on) alone
 *   has skin over its top — 0.0024 (0.06 m) of the core's shoulder at one
 *   spot, the least any pose of it leaves. (The first cut set each bar by
 *   three readings along its centre line and stood seg-4's end 0.048 off
 *   the bed; the second, by the plane 9 × 3 readings strayed least from,
 *   held the bottom at its readings and let it stand 0.018 clear between
 *   them, and left 0.021 of the north lobe over seg-5's corner for want
 *   of the vertical room a rolled section has; review, rounds 1 and 2.)
 *   Names, count, section and the 8 % overlap are the file's; nothing
 *   here moves the footprint, since no segment's plan station moved.
 * - `gill-haze-port`, `-stb` (#893): the clause now names the glow in the
 *   haze; as the approved file lights them, unmoved, 0.35 on the
 *   translucent ink.
 *
 * The audit reads one residual line, `vein-ring-core-seg-1`, and it is
 * meant: the crown ring's first station, bearing 0.52 at (1.17, 0.67), is
 * 0.39 from the starboard gill's crown, inside the mound's 0.85 × 0.65
 * plan and under the haze cone's 0.55 top disc — the organ grew over the
 * ring — so on the crown's skin the segment is a lamp sealed inside
 * another part (#890 review rulings, ruling 1), lit in the file's ink and
 * keeping its plan station, lifted 0.24 (5.6 m) with its ring. Clearing it
 * would shorten or turn the ring's arc, a shape decision this change does
 * not make. The second segment shows its outer end past the mound, 4.7
 * m²; and on the port side `vein-ring-core-2-seg-1` and `-seg-2` run
 * half into `gill-mound-port` the same way — 18 and 13 of their 36
 * vertices inside it — showing 5.9 and 8.9 m² past it. The other thirty
 * show 2.0–16.9 m² each, two of them (`west` 1 and 5) shaded by stalk-4's
 * pod and stalk-6's stem, which lean over the west ring where the file
 * grew them.
 */
import { THREE, exportGlb, fitFootprint } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 170;

// The navy's ink, under the navy's names since #891. The export's
// `deep-chlorophyll`, `algae-teal` and `spore-pale` are the structures'
// `deep_chlorophyll` and `algae_hull` and the hulls' `spore_pod`; its
// `bio-vein` and `bio-vein-dim` — the token on a #0F2A12 base at 0.45 and
// 0.5 rough, one light under two names — are `bio_light`, the token's one
// lamp; `algae_teal_dark` is the Veil's own hex and `spore_haze` a fixture
// of its own, both at their values, hyphens gone. (#888 had already
// brought `algae-teal` and `spore-pale` from the export's 0.05 / 0.75 and
// 0 / 0.65 onto the Submersible's 0.1 / 0.7 and 0.05 / 0.65; `algae_hull`
// sits at 0.08 / 0.6 and `spore_pod` at 0.05 / 0.5.) The strengths are
// this file's own: 2.2 on the breathing lines and the crown's vein ring,
// 0.9 on the stalk tips and the other three rings, 0.35 on the haze — the
// rings back in the light the file gave them (#893; see the header).
const chitin = pelagia.ink.deepChlorophyll();
const tealDark = pelagia.ink.algaeTealDark();
const teal = pelagia.ink.algaeHull();
const vein = pelagia.ink.bioLight(2.2);
const haze = pelagia.ink.sporeHaze(0.35);
const dim = pelagia.ink.bioLight(0.9);
const spore = pelagia.ink.sporePod();

const root = new THREE.Group();
root.name = 'pelagia-spore-veil';

// A torus is born in the XY plane; the growth rings lie flat.
const FLAT = [Math.PI / 2, 0, 0];
const { verbatim } = pelagia;

// Six lobes, "broad overlapping": a 10 × 6 orb each, squashed to its own
// three radii and yawed its own way, chitin and dark teal by turns.
pelagia.grownOrbs(root, {
  orbs: [
    ['lobe-core', chitin, 1, [10, 6], verbatim([0, 0.1, 0], [0, 0.2, 0], [2.1, 0.85, 1.9])],
    ['lobe-west', tealDark, 1, [10, 6], verbatim([-1.7, 0, -0.5], [0, 0.9, 0], [1.5, 0.6, 1.35])],
    [
      'lobe-east',
      tealDark,
      1,
      [10, 6],
      verbatim([1.6, 0.02, 0.4], [0, -0.6, 0], [1.45, 0.62, 1.3]),
    ],
    ['lobe-north', chitin, 1, [10, 6], verbatim([0.5, -0.02, -1.5], [0, 1.8, 0], [1.25, 0.5, 1.1])],
    ['lobe-south', tealDark, 1, [10, 6], verbatim([-0.6, 0, 1.45], [0, 2.6, 0], [1.3, 0.52, 1.15])],
    ['lobe-runt', chitin, 1, [10, 6], verbatim([2.4, -0.05, -0.9], [0, 0.4, 0], [0.8, 0.38, 0.7])],
  ],
});

// Three growth rings round the crown, wider and thinner as they go down,
// each squashed 0.92 in its tube by its node.
pelagia.grownHoops(root, {
  hoops: [
    [
      'growth-ring-1',
      teal,
      0.85,
      0.075,
      [5, 14],
      undefined,
      verbatim([0, 0.62, 0], FLAT, [1, 1, 0.92]),
    ],
    [
      'growth-ring-2',
      teal,
      1.3,
      0.063,
      [5, 14],
      undefined,
      verbatim([0, 0.42, 0], FLAT, [1, 1, 0.92]),
    ],
    [
      'growth-ring-3',
      teal,
      1.75,
      0.051,
      [5, 14],
      undefined,
      verbatim([0, 0.22, 0], FLAT, [1, 1, 0.92]),
    ],
  ],
});

// Two gill organs, port and starboard, each a mound with four slits under
// a cone of haze, rolled its own way, and its four breathing lines standing
// round the shoulder that faces away from the bed — the starboard organ's
// +x and +z quadrant, the port's −x and −z, which in each frame is the
// side its roll lifts and the side its haze leans away from (#890).
for (const [side, at, yaw, sgn, lines] of [
  [
    'port',
    [-0.95, 0.55, -0.35],
    -0.5,
    -1,
    { bearings: [Math.PI + 0.75, Math.PI + 1.05, Math.PI + 1.35, Math.PI + 1.65], reach: 0.64 },
  ],
  ['stb', [0.95, 0.55, 0.35], 0.5, 1, { bearings: [0.7, 1.0, 1.3, 1.6], reach: 0.66 }],
])
  pelagia.gillOrgan(
    root,
    { mound: teal, slit: chitin, breath: vein, haze },
    {
      side,
      at,
      yaw,
      mound: { facets: [9, 6], scale: [0.85, 0.55, 0.65], roll: sgn * 0.25 },
      slits: {
        count: 4,
        yaw0: -0.5,
        pitch: 0.34,
        slit: [0.09, 0.3, 0.62],
        breath: [0.035, 0.26, 0.56],
      },
      lines: { ...lines, sink: 0.02, lean: 0.5 },
      haze: { radii: [0.55, 0.2], h: 1.1, facets: 7, y: 0.95, roll: sgn * 0.15 },
    }
  );

// "Faint vein rings round the lobes": four, lit — one round the crown, a
// second wider on the far side, and one round each of the west and east
// lobes — each segment at the file's own plan station, laid on the bed's
// skin beneath it (#893; see the header). The bed is the six lobes and the
// three growth rings, as they stand: a segment lies on whichever is
// highest under it, and never on an organ, a stalk or the haze.
const bed = root.children.filter((c) => /^(lobe|growth-ring)-/.test(c.name));
pelagia.veinRing(root, vein, {
  name: 'vein-ring-core',
  at: [0, 0],
  r: 1.35,
  centre: 1.5,
  span: 2.2,
  count: 9,
  on: bed,
});
pelagia.veinRing(root, dim, {
  name: 'vein-ring-core-2',
  at: [0, 0],
  r: 1.75,
  centre: 4.3,
  span: 2,
  count: 8,
  on: bed,
});
pelagia.veinRing(root, dim, {
  name: 'vein-ring-west',
  at: [-1.7, -0.5],
  r: 0.95,
  centre: 2.3,
  span: 2.2,
  count: 7,
  on: bed,
});
pelagia.veinRing(root, dim, {
  name: 'vein-ring-east',
  at: [1.6, 0.4],
  r: 0.9,
  centre: -0.75,
  span: 2.1,
  count: 7,
  on: bed,
});

// Six spore stalks, each its own height and leaned its own way off the bed.
for (const [n, H, at, lean] of [
  [1, 2.3, [-0.4, 0.3, 0.2], [-0.12, 0, 0.14]],
  [2, 2.7, [0.9, 0.3, -0.7], [0.18, 0, -0.1]],
  [3, 2, [1.9, 0.3, 1], [0.1, 0, 0.2]],
  [4, 1.8, [-1.9, 0.3, 0.8], [-0.2, 0, -0.18]],
  [5, 3.1, [0.2, 0.3, 1.3], [-0.06, 0, 0.06]],
  [6, 1.5, [-2.5, 0.3, -0.3], [0.22, 0, 0.12]],
])
  pelagia.sporeStalk(
    root,
    { lower: tealDark, upper: teal, pod: spore, tip: dim },
    { name: `stalk-${n}`, H, ...verbatim(at, lean) }
  );

// Seven root flares round the bed's edge, sunk into the seabed.
pelagia.rootFlares(root, chitin, {
  radii: [0.05, 0.22],
  length: 0.9,
  facets: 6,
  y: -0.12,
  lean: 0.684706091167,
  yaw0: -0.5,
  at: [
    [1.8868025080643, 0.876150171799181],
    [0.422217805216989, 2.05134290411963],
    [-1.82238603440757, 1.75054794416014],
    [-2.14718245207993, -0.0935290402993911],
    [-1.42751607380012, -1.6924816699622],
    [0.748343332281658, -2.24928731617459],
    [1.98228657799648, -0.707616664690097],
  ],
});

// Two points of glow inside, in the core and among the stalks — the file's.
pelagia.glow(root, { name: 'glow-core', intensity: 3, range: 3.5, at: [0, 0.9, 0] });
pelagia.glow(root, { name: 'glow-stalks', intensity: 2, range: 3, at: [0.3, 2.2, 1.1] });

fitFootprint(root, L);
await exportGlb(root, 'spore-veil-pelagia.glb');
