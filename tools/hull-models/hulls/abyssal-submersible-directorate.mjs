/**
 * The Abyssal Submersible, the Directorate's — 95 m (docs/units.md; the
 * Abyssal Submersible block of docs/asset-prompts-3d.md Block 3, which
 * pairs the kind with the Directorate, read with its FACTION block).
 *
 * "Mid-size deep-raiding hull born to crush depth (Pressure Rating 3, SIG
 * 22 idle). Heavy segmented pressure carapace, folded manipulator limbs,
 * dim red photophores, and a fainter red along the plate rims, the tail
 * joints, the rostrum and the claws" (as #893 amended it) — and it is the
 * navy's whole grammar in one hull:
 * "spiked, insectoid, segmented crustacean forms — asymmetric, yet
 * regimented". A keel, a seven-sided spar under the belly; five plates of
 * pressure carapace, orbs of seven meridians and four stacks squashed to
 * 1.3 across and 0.62 tall by their nodes, each leaned its own way, each
 * with an open rim of faintly lit red under its forward edge; a six-sided
 * cone of a head with a four-sided rostrum and two mandibles of different
 * lengths; four dorsal spikes alternating sides and five flank spikes,
 * three to port and two to starboard; seven walking limbs, four to port
 * and three to starboard, each a femur and a glowing claw; four tail
 * segments, each with its lit joint; a telson of three plates; and ten
 * photophores — five to port, three to starboard, one under the jaw, one
 * on the tail — the dim red resting light of a hull that idles at SIG 22.
 * Nothing on it mirrors.
 *
 * A port of the approved export
 * (docs/concept-art/models/abyssal-submersible-directorate.glb at 3e15409),
 * part for part in its order, every number the export's own. Every part
 * comes from `factions/directorate.mjs` or is a kit box, and the model
 * carries three materials of its own name in the navy's one `ink` (#888),
 * at the export's values, and `biolight_crimson` since #891 (below).
 * Nothing here is a shape decision but the lamps
 * #890 re-seated, below; where the export is odd the script is odd with
 * it: the
 * `port` parts sit at the export's +x, which is the kit's -z once the file
 * is turned onto its length, and -z is port (#642), so the names are
 * right; `edge_red` is a cladding that glows — metalness 0.15 with its own
 * red as emissive at 0.12 — so the light audit reads the five rims, the
 * four joints, the rostrum and the seven claws as lamps;
 * the rims and the joints are *open* frusta, two rows at ±h/2 with the
 * smaller radius on top (`parts.mjs` reads them so first, and offers a
 * displaced 3 × 4 orb second, which the buffer is not); the head is a
 * cone squashed 1.25 × 0.62 by its node; and the hull is drawn at 4.53
 * units for 95 m — twenty-one metres to the unit — so the navy's
 * half-metre against a mirrored pair is passed to `photophoreDomes` in
 * units.
 *
 * THE LIGHT the top-down maps could not see. The light audit named nine
 * lamps under a quarter of a square metre from above — six of the seven
 * claws (all but the first starboard one) and three of the ten photophores
 * — and the approved bake never saw them. #890 decided each against the
 * block's resting clause as it then read, "dim red photophores"
 * (docs/models-plan.md §3.2); #893 amended the clause to name the rest of
 * the resting set, and nothing here moved with it:
 *
 * - The seven claws (`limb_*_claw`) glow in the export's `edge_red` — "a
 *   fainter red along ... the claws", the block's since #893 (#890 carried
 *   them unread as the approved model's resting set, ruling 2). They lie
 *   folded under the belly, where no chart sees them, and a claw lifted
 *   clear of the belly to face a map is a different fixture (ruling 6), so
 *   they stay folded. Each hangs from its femur's end since #907: the file
 *   set every claw's centre at one offset from its femur's, which left
 *   each claw's root 0.86 to 1.15 m clear of the femur by #894's resting
 *   measure — a manipulator in two pieces — and `walkingLimbs` computes
 *   the knee from the femur's centre, length and fold and stands the
 *   claw's root on it, the claw's own fold kept (the module says how).
 *   Each moves 1.5 to 1.8 m and reads 0 m from its femur. RESIDUAL AUDIT
 *   LINES: all seven claws show nothing from above — `limb_port_1_claw`
 *   to `_4`, `limb_starboard_1_claw` to `_3` — and the export warns on
 *   each. Six were hidden before; `limb_starboard_1_claw` showed 0.5 m²
 *   where the file's offset had carried it past the second plate's rim,
 *   and rooted on its femur it lies under the plates with the rest
 *   (0.06 m²). That is the rule's consequence and not a choice: the fold
 *   is the file's, and only the joint moved.
 * - `photophore_port_5` and `photophore_starboard_3` are the clause's and
 *   stay lit. Each sat on the fifth plate's flank at its widest line,
 *   under the plate's own upper surface; each is lifted 0.04 inboard and
 *   0.17 / 0.205 up, the same bud at the same station, and what it rests
 *   on there is the crest of `plate_rim_4` — the fourth plate's open rim,
 *   which stands proud of the fifth plate's shell at those stations — not
 *   the shell of `carapace_5`.
 * - `photophore_jaw` is the clause's and stays lit. It sat under the jaw
 *   directly beneath the rostrum's base; #890 moved it 0.2 across the keel
 *   to the starboard side of the rostrum, between it and the starboard
 *   mandible, where nothing stands over it — and 1.29 m from anything, the
 *   review found (#894). It is seated on the nearer of the head and the
 *   starboard mandible from that station, half its radius in
 *   (`photophoreDomes` `on`, kit.mjs `seat`), and the mandible is the
 *   nearer: it grows from the mandible's lower inboard face near its tip,
 *   0.4 m from centre to skin, where it reaches inboard past the mandible
 *   — still under the jaw to starboard of the rostrum, and clear from
 *   above (1.6 m²).
 * - Five more of the file's flank buds stood off the shell the same way,
 *   0.4 to 1.0 m — `photophore_port_1`, `_2`, `_4`, `photophore_starboard_1`
 *   and `_2` — the review's measure finding them once it had a lamp to
 *   measure (#894). Each is seated on the nearest of the five plates and
 *   their rims from its own station, half in; `photophore_port_3`, `_5`,
 *   `photophore_starboard_3` and `photophore_tail` already rested and stay.
 *   `diff.mjs` lists the six, the jaw's 1.6 m the largest, and no other
 *   part.
 * - The five rims, the four tail joints, the rostrum and the seven claws
 *   glow in `edge_red` at the file's faint 0.12 — "a fainter red along
 *   the plate rims, the tail joints, the rostrum and the claws", the
 *   block's resting clause since #893 (#890 carried them unread as the
 *   approved model's resting set, ruling 2, and asked; #893 settled it by
 *   naming them). They stay lit as the file has them. One moved: the
 *   rostrum stood 1.96 m off the head by #894's resting measure, and the
 *   gap is sideways, not ahead — the file's node runs it 10° across the
 *   head's axis from 3 m to port and 1.7 m above the apex, its base
 *   0.75 m ahead of the apex's station and already at the closest its
 *   own axis comes to the apex, so no move along that axis meets the head
 *   short of its port cheek, 6.6 m from the point. It hangs from the apex
 *   since #907 (`spikes` `rootOn`): its base centre on the head's point,
 *   its rotation the file's, 3.5 m from where the node had it, and it
 *   reads 0 m from the head. Its tip stands 0.036 units less far forward,
 *   which is THE SCALE below. `diff.mjs` lists the rostrum at 3.0 m and
 *   the seven claws at 1.5 to 1.8, and no other part.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, hull axis at y = 0.8 (the head's, the
 * rims' and the plates', which sit 0.03 over it); built here metre-true
 * at 95 m along +X, centred on its length, the axis at y = 0. `DRAWN` is
 * the length as intake measures it — the parts' boxes — which the
 * rostrum's box, rolled 0.3 with its node, overhangs at the bow: 4.5145
 * over the vertices' 4.50 since #907 hung the rostrum from the head's
 * apex. The file measured 4.5501 over 4.53, its rostrum 0.036 units
 * further forward, so the hull is 0.8 % larger on the chart than the
 * approved bake drew it. Every number below is the export's, through
 * kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 95;
const DRAWN = 4.5145;
const DATUM = 0.8;
// `refuseMirror`'s half a metre, in this export's units.
const HALF_METRE = (0.5 * DRAWN) / L;

const chitin = directorate.ink.chitinTrench();
const violet = directorate.ink.plateViolet();
// The file's own strengths: the rims' faint 0.12, the photophores' 2.2.
// The photophores are `biolight_crimson` since #891: the file's
// `photophore` was the token in `color` too, and anchored the register
// (the module's `biolightCrimson`).
const edge = directorate.ink.edgeRed(0.12);
const photophore = directorate.ink.biolightCrimson(2.2);

const root = new THREE.Group();
root.name = 'abyssal_raider';
const bar = (name, mat, size, t, e) => part(root, name, box(...size), mat, drawn(t, e));
// The export's spikes and drums stand on y and each node lays its own.
const ALONG_KEEL = (roll) => [Math.PI / 2, 0, roll];

// The keel: a seven-sided spar tapering aft, laid along the keel, rolled
// 0.06 and squashed to 0.75 across by its node.
directorate.drums(root, chitin, {
  drums: [
    {
      name: 'keel',
      radii: [0.26, 0.2],
      length: 2.9,
      facets: 7,
      ...drawn([0.02, 0.56, -0.05], ALONG_KEEL(0.06), [1, 1, 0.75]),
    },
  ],
});

// The pressure carapace: five plates from the bow, the third the largest,
// every one a 7 × 4 orb of its own radius squashed 1.3 × 0.62 × 1.02 by its
// node, pitched 0.1 down and yawed and rolled a few hundredths its own
// way; under each forward edge an open rim 1.06 to 1.12 of its radius,
// nine-sided, 0.07 tall, laid across the keel and yawed with its plate,
// squashed 1.28 × 1 × 0.58.
const PLATE = [1.3, 0.62, 1.02];
const RIM = [1.28, 1, 0.58];
directorate.carapaceOrbs(
  root,
  { skin: violet, rim: edge },
  {
    name: 'carapace',
    facets: [7, 4],
    rim: { name: 'plate_rim', ratio: [1.06, 1.12], h: 0.07, facets: 9 },
    plates: [
      {
        n: 1,
        r: 0.47,
        ...drawn([0.03, 0.83, 1.02], [-0.1, 0.05, 0.07], PLATE),
        rim: drawn([0.03, 0.8, 0.7286], ALONG_KEEL(0.05), RIM),
      },
      {
        n: 2,
        r: 0.52,
        ...drawn([-0.02, 0.83, 0.62], [-0.1, -0.04, -0.056], PLATE),
        rim: drawn([-0.02, 0.8, 0.2976], ALONG_KEEL(-0.04), RIM),
      },
      {
        n: 3,
        r: 0.54,
        ...drawn([0.03, 0.83, 0.22], [-0.1, 0.06, 0.084], PLATE),
        rim: drawn([0.03, 0.8, -0.1148], ALONG_KEEL(0.06), RIM),
      },
      {
        n: 4,
        r: 0.5,
        ...drawn([-0.02, 0.83, -0.18], [-0.1, -0.03, -0.042], PLATE),
        rim: drawn([-0.02, 0.8, -0.49], ALONG_KEEL(-0.03), RIM),
      },
      {
        n: 5,
        r: 0.44,
        ...drawn([0.03, 0.83, -0.56], [-0.1, 0.05, 0.07], PLATE),
        rim: drawn([0.03, 0.8, -0.8328], ALONG_KEEL(0.05), RIM),
      },
    ],
  }
);

// The head: a six-sided cone to a point, squashed 1.25 × 0.62 by its node
// and rolled 0.12; the rostrum, four-sided and lit, rolled 0.3 and hung
// from the head's apex (`rootOn`, #907; the header); and two mandibles
// under it, the port one the longer, each leaned down its own way.
directorate.spikes(root, violet, {
  spikes: [
    {
      name: 'head',
      radii: [0, 0.42],
      length: 0.85,
      facets: 6,
      ...drawn([0.02, 0.8, 1.62], ALONG_KEEL(0.12), [1.25, 0.62, 1]),
    },
  ],
});
directorate.spikes(root, edge, {
  spikes: [
    {
      name: 'rostrum',
      radii: [0, 0.06],
      length: 0.55,
      facets: 4,
      rootOn: 'head',
      ...drawn([0.05, 0.88, 2.18], ALONG_KEEL(0.3)),
    },
  ],
});
directorate.spikes(root, chitin, {
  spikes: [
    {
      name: 'mandible_port',
      radii: [0, 0.06],
      length: 0.5,
      facets: 4,
      ...drawn([0.24, 0.64, 1.95], [Math.PI / 2 + 0.32, 0, 0.2]),
    },
    {
      name: 'mandible_starboard',
      radii: [0, 0.06],
      length: 0.36,
      facets: 4,
      ...drawn([-0.2, 0.64, 1.9], [Math.PI / 2 + 0.3, 0, -0.15]),
    },
  ],
});

// The spikes: four down the back, each its own size, leaned aft and
// alternating sides; three off the port flank and two off the starboard,
// each rolled out its own way.
const spike = (name, r, length, t, e) => ({
  name,
  radii: [0, r],
  length,
  facets: 4,
  ...drawn(t, e),
});
directorate.spikes(root, chitin, {
  spikes: [
    spike('spike_dorsal_1', 0.1, 0.52, [0.1, 1.2, 0.95], [-0.18, 0, 0.1]),
    spike('spike_dorsal_2', 0.12, 0.6, [-0.06, 1.24, 0.5], [-0.12, 0, -0.14]),
    spike('spike_dorsal_3', 0.1, 0.44, [0.12, 1.22, 0.08], [-0.1, 0, 0.18]),
    spike('spike_dorsal_4', 0.08, 0.34, [-0.04, 1.18, -0.32], [-0.08, 0, -0.1]),
    spike('spike_flank_p1', 0.07, 0.4, [0.62, 0.88, 0.72], [0, 0, 1.25]),
    spike('spike_flank_p2', 0.07, 0.34, [0.66, 0.84, 0.18], [0, 0, 1.3]),
    spike('spike_flank_p3', 0.06, 0.3, [0.6, 0.82, -0.34], [0, 0, 1.2]),
    spike('spike_flank_s1', 0.07, 0.36, [-0.64, 0.86, 0.45], [0, 0, -1.28]),
    spike('spike_flank_s2', 0.06, 0.28, [-0.58, 0.82, -0.1], [0, 0, -1.22]),
  ],
});

// "Folded manipulator limbs": seven, four to port at a 0.4 pitch and three
// to starboard at 0.44, each its own length, every one folded by the one
// rule `walkingLimbs` holds, each claw hung from its femur's end (#907);
// the seven claws are residual audit lines (the header).
directorate.walkingLimbs(
  root,
  { chitin, red: edge },
  {
    limbs: [
      { side: 'port', n: 1, length: 0.34, at: [0.34, 0.42, 0.85] },
      { side: 'port', n: 2, length: 0.36, at: [0.34, 0.42, 0.45] },
      { side: 'port', n: 3, length: 0.34, at: [0.34, 0.42, 0.05] },
      { side: 'port', n: 4, length: 0.3, at: [0.34, 0.42, -0.35] },
      { side: 'starboard', n: 1, length: 0.32, at: [-0.34, 0.42, 0.68] },
      { side: 'starboard', n: 2, length: 0.34, at: [-0.34, 0.42, 0.24] },
      { side: 'starboard', n: 3, length: 0.3, at: [-0.34, 0.42, -0.2] },
    ],
  }
);

// The tail: four segments shrinking astern, 6 × 4 orbs squashed 1.15 × 0.7
// by their nodes and rolled 0.08 turn about, each with a lit joint behind
// it — an open eight-sided ring 0.92 to 0.98 of its radius, 0.05 tall,
// squashed 1.12 × 1 × 0.66; then the telson, three thin plates, the middle
// one pitched up and the outer two splayed each its own way.
const SEG = [1.15, 0.7, 1];
const JOINT = [1.12, 1, 0.66];
directorate.carapaceOrbs(
  root,
  { skin: violet, rim: edge },
  {
    name: 'tail_seg',
    facets: [6, 4],
    rim: { name: 'tail_joint', ratio: [0.92, 0.98], h: 0.05, facets: 8 },
    plates: [
      {
        n: 1,
        r: 0.3,
        ...drawn([-0.02, 0.76, -0.92], [0, 0, -0.08], SEG),
        rim: drawn([0, 0.74, -1.07], ALONG_KEEL(0), JOINT),
      },
      {
        n: 2,
        r: 0.25,
        ...drawn([0.03, 0.73, -1.2], [0, 0, 0.08], SEG),
        rim: drawn([0, 0.71, -1.325], ALONG_KEEL(0), JOINT),
      },
      {
        n: 3,
        r: 0.2,
        ...drawn([-0.02, 0.7, -1.45], [0, 0, -0.08], SEG),
        rim: drawn([0, 0.68, -1.55], ALONG_KEEL(0), JOINT),
      },
      {
        n: 4,
        r: 0.15,
        ...drawn([0.03, 0.67, -1.66], [0, 0, 0.08], SEG),
        rim: drawn([0, 0.65, -1.735], ALONG_KEEL(0), JOINT),
      },
    ],
  }
);
bar('telson_mid', violet, [0.34, 0.02, 0.42], [0, 0.66, -1.88], [0.12, 0, 0]);
bar('telson_port', violet, [0.3, 0.02, 0.36], [0.2, 0.68, -1.84], [0.1, 0.5, 0.15]);
bar('telson_starboard', violet, [0.26, 0.02, 0.32], [-0.18, 0.68, -1.84], [0.1, -0.45, -0.12]);

// "Dim red photophores": ten buds, each its own size, five down the port
// flank and three down the starboard, one under the jaw and one on the
// tail — a pattern that repeats on neither side. The last of each flank
// rank sits on the fifth plate's upper surface and the jaw bud to
// starboard of the rostrum, where the maps see them (#890, the header).
// Six of them grow from the shell the file hung them beside (`on`, #894;
// the header): the plates and their rims for the flank buds, the head and
// the starboard mandible for the jaw's.
const SHELL = [1, 2, 3, 4, 5].flatMap((n) => [`carapace_${n}`, `plate_rim_${n}`]);
directorate.photophoreDomes(root, photophore, {
  facets: [6, 4],
  tolerance: HALF_METRE,
  domes: [
    ['photophore_port_1', 0.035, { ...drawn([0.6, 0.94, 1.1]), on: SHELL }],
    ['photophore_port_2', 0.03, { ...drawn([0.66, 0.8, 0.62]), on: SHELL }],
    ['photophore_port_3', 0.035, drawn([0.68, 0.9, 0.3])],
    ['photophore_port_4', 0.028, { ...drawn([0.62, 0.76, -0.14]), on: SHELL }],
    ['photophore_port_5', 0.03, drawn([0.46, 1.03, -0.52])],
    ['photophore_starboard_1', 0.03, { ...drawn([-0.64, 0.86, 0.8]), on: SHELL }],
    ['photophore_starboard_2', 0.028, { ...drawn([-0.66, 0.76, 0.1]), on: SHELL }],
    ['photophore_starboard_3', 0.03, drawn([-0.48, 1.045, -0.48])],
    ['photophore_jaw', 0.04, { ...drawn([-0.08, 0.58, 2]), on: ['head', 'mandible_starboard'] }],
    ['photophore_tail', 0.032, drawn([0.02, 0.68, -2.06])],
  ],
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'abyssal-submersible-directorate.glb');
