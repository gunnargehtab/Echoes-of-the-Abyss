/**
 * The Spore Veil, Pelagia Commune — 170 m of footprint (2 × `radiusM` 85,
 * packages/shared/src/structures.ts), SIG 20 idle.
 *
 * "The Veil Mother — a low, breathing spore bed grown into the seabed: broad
 * overlapping lobes, paired gill organs with vent slits exhaling a faint
 * haze, slender spore stalks swaying above (SIG 20 idle — the cloud itself
 * is silent). Nearly dark; faint bioluminescent breathing lines around the
 * gills and dim lit tips on the stalks only" (docs/asset-prompts-3d.md,
 * STRUCTURE — Spore Veil). The Commune's own signature structure.
 *
 * Six lobes — a core and five grown against it, west, east, north, south
 * and a runt — each its own size and set its own way, in two skins; three
 * growth rings round the crown; two gill organs, port and starboard, each a
 * mound with four vent slits and a lit breathing line beside each, under a
 * cone of haze; four vein rings of lit segments, one bright round the crown
 * and three dim; six spore stalks of six heights, each leaned its own way,
 * with a pale pod and a dim lit tip; seven root flares round the bed's edge;
 * and two points of glow inside, one in the core and one among the stalks.
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
 *   1.8 and 2.6 and the flares' leans to be one number and π/3 more.
 * - The export carries two `KHR_lights_punctual` point lights as its last two
 *   nodes, named `glow-core` and `glow-stalks`; they are kept (`glow`) at
 *   the file's colour, intensity and range. No map can see them.
 *
 * THE FRAME is the export's own: drawn along X, 7.13 across by the measure
 * the bake takes — three's `Box3` over the parts' own boxes, which the
 * leaned stalks' boxes overhang — priced at 170 m by the table, so the root
 * carries that one scale through kit.mjs `fitFootprint`, as the Vent Taps
 * do, and no yaw. The light audit names thirty of the thirty-one vein-ring
 * segments (all but `vein-ring-core-2-seg-5`) and seven of the eight
 * breathing lines as showing under a cell from above
 * — a segment is 0.045 tall on 0.06 wide and a breathing line stands on
 * edge under the haze cone — so the resting glow gate 3 sees is the pod
 * tips and the haze; the approved binary earns the same.
 */
import { THREE, exportGlb, fitFootprint } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 170;

// The navy's ink (#888), under the file's own hyphenated names. The export
// carried `algae-teal` at 0.05 metal and 0.75 rough and `spore-pale` at no
// metal, a step from the Abyssal Submersible's 0.1 / 0.7 and 0.05 / 0.65
// under the same names; the hull's value is canonical, so both moved. The
// strengths are this file's own: 2.2 on the crown vein, 0.9 on the dim
// rings and stalk tips, 0.35 on the haze.
const chitin = pelagia.ink['deep-chlorophyll']();
const tealDark = pelagia.ink['algae-teal-dark']();
const teal = pelagia.ink['algae-teal']();
const vein = pelagia.ink['bio-vein'](2.2);
const haze = pelagia.ink['spore-haze'](0.35);
const dim = pelagia.ink['bio-vein-dim'](0.9);
const spore = pelagia.ink['spore-pale']();

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

// Two gill organs, port and starboard, each a mound with four slits and
// their breathing lines under a cone of haze, rolled its own way.
for (const [side, at, yaw, sgn] of [
  ['port', [-0.95, 0.55, -0.35], -0.5, -1],
  ['stb', [0.95, 0.55, 0.35], 0.5, 1],
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
      haze: { radii: [0.55, 0.2], h: 1.1, facets: 7, y: 0.95, roll: sgn * 0.15 },
    }
  );

// Four vein rings: one bright round the crown, a second dim and wider on the
// far side, and one dim round each of the west and east lobes.
pelagia.veinRing(root, vein, {
  name: 'vein-ring-core',
  at: [0, 0.42, 0],
  r: 1.35,
  centre: 1.5,
  span: 2.2,
  count: 9,
});
pelagia.veinRing(root, dim, {
  name: 'vein-ring-core-2',
  at: [0, 0.18, 0],
  r: 1.75,
  centre: 4.3,
  span: 2,
  count: 8,
});
pelagia.veinRing(root, dim, {
  name: 'vein-ring-west',
  at: [-1.7, 0.3, -0.5],
  r: 0.95,
  centre: 2.3,
  span: 2.2,
  count: 7,
});
pelagia.veinRing(root, dim, {
  name: 'vein-ring-east',
  at: [1.6, 0.32, 0.4],
  r: 0.9,
  centre: -0.75,
  span: 2.1,
  count: 7,
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
