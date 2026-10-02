/**
 * The Foundry, Pelagia Commune — 320 m of footprint (2 × `radiusM` 160,
 * tools/hull-maps/models.mjs), SIG 25 idle, 55 with the line running.
 *
 * "Unit production hall with a recessed launch bay and gantry cranes (SIG
 * 25 idle, 55 with the line running). Dim at rest: the forge light across
 * the bay and at its mouth, the bay's guide lights or rim strips, the
 * gantries' lamps, and the navy's own lamps on the halls and the mouth —
 * running lights, photophores, veins, seams, ridges or crystals; the same
 * forge light flooding from the bay when producing"
 * (docs/asset-prompts-3d.md, STRUCTURE — Foundry, as #893 amended it).
 * One prompt block, four scripts; the per-navy difference is
 * docs/art-direction.md's.
 *
 * The Commune's is a husk grown either side of the bay: four lobes a flank,
 * each ringed where it grew — two or three growth rings, no two alike —
 * with three knuckles a flank where they meet; two outrigger lobes off the
 * corners, the big one ringed and the small one budded; a stern pod with
 * its ring and bud closing the blind end; the bay itself — floor, forge
 * line, the hull in progress, a lip either side and a rank of five
 * biolight guides either side of the forge line — and two gantry cranes
 * over it, without finials; the launch mouth with the glow drum lying
 * flat in it, lit; four lit veins climbing the
 * flanks; two ballast tanks and two graft pipes with their flanges along
 * the −x flank; and five root anchors into the seabed.
 *
 * A port of the approved export (docs/concept-art/models/foundry-
 * pelagia.glb at f7cce0f), part for part in its order, every number the
 * export's own, read off its nodes and its buffers (#652). The bay, the
 * cranes, the launch mouth, the ballast tanks and the graft pipes are the
 * kit's Foundry vocabulary (kit.mjs `foundryBay`, `gantryCrane`,
 * `launchMouth`, `ballastTanks`, `flangedPipes`) — this file carries the
 * Directorate's numbers for all of them but the cranes' trolleys, the
 * second crane's load and the missing finials; the rest is
 * `factions/pelagia.mjs`'s Bastion-and-works block. Nothing here is a
 * shape decision but #890's and #893's light placement, the last bullet;
 * where the export is odd the script is odd with it:
 *
 * - RELABELLED, as #642 relabelled the eleven `bothSides` hulls and the
 *   Directorate's Foundry was: the export is Z-long, its +x lands on the
 *   kit's −z through `drawn`, and −z is port — so the flank the file calls
 *   `husk_lobe_starboard_0..3` and the lip it calls `bay_lip_starboard`,
 *   both at +x, are written `husk_lobe_port_0..3` and `bay_lip_port`, and
 *   their −x twins `_starboard`. Every buffer stays where it is and in the
 *   file's order — the +x flank and lip are still written first — and only
 *   the ten names turn; the rings, knuckles and guides keep their `0` (+x)
 *   and `1` (−x), which are indices, not sides. `diff.mjs` matches by name
 *   and so lists those ten as moved, each `_starboard_i` to where its
 *   `_port_i` was and back, which is the relabel and nothing else; a
 *   scratch build under the file's own names diffs clean.
 * - The lobes are partial spheres, not tables: orbs stopped 0.62 of the way
 *   down (10 × 7 in the file; the rule's counts since the facet pass,
 *   below), each pitched a fraction of a degree its own way under the
 *   flank's 0.14 roll. Each ring's station and tube are the file's, and its
 *   place and scale follow from them by one rule (`huskFlanks`).
 * - The cranes carry no finials; their trolleys sit at −0.7082 and 0.0013
 *   off the beam's centre; the second crane's load hangs 1.1 higher than
 *   the first's. Every other number of both cranes, of the bay, the launch
 *   mouth, the tanks and the pipes is the Directorate file's.
 * - The four veins are arcs of torus each its own radius (2.10 to 2.35)
 *   and arc (1.057 to 1.366), two a flank, yawed −0.4 and rolled each its
 *   own way; the −x pair the file writes in three's (−π, b, c) form of the
 *   XYZ Euler, written here as the plain (0, π + 0.4, c + π) of the same
 *   matrix. Three of the five anchors are written the same way.
 *   `hull_vein_0` is R 2.10, not the file's 2.3445 (#907, from #894's
 *   resting measure): the −x flank's first lobe is that flank's smallest,
 *   2.2 tall against the 2.5 of the lobe `hull_vein_2` lies on, and the
 *   file gave the vein over it the larger radius, so the arc stood 3.8 m
 *   off the skin while its three siblings lie on theirs. Every other
 *   number of the vein is the file's; the radius was swept rather than
 *   guessed — 2.15 leaves 0.26 m, 2.12 meets, 2.10 lies on — and at 2.10
 *   it rests as they do. `diff.mjs` lists it beyond the relabel.
 * - The six materials are the navy's `ink`: the Bastion's five with
 *   `bio_light` at this file's 3.0999 (`biolight_green` until #891, and
 *   `spore_pale` is `spore_pod` since then), and `forge_light`, the spore
 *   token on a #2E3A16 base at 3.8398, on the forge line and the launch
 *   glow, as the export had them. #890 clad the launch glow in
 *   `bio_vein_unlit`, the navy's rule-2 finish (asset-prompts-3d.md Block
 *   2b), and #893 gave it `forge_light` back; no value moved with either.
 * - #890 and #893, light placement. The light audit named six lamps
 *   hidden from above on the approved binary. When #890 moved them the
 *   block's lighting clause was "Dim at rest; interior forge light
 *   spilling from the bay when producing", which named no resting lamp,
 *   and the review settled one reading for all four Foundries (#890,
 *   review rulings, ruling 3): the bay guides and the forge line carried
 *   lit as every approved Foundry lights them (docs/models-plan.md §3.2,
 *   the one-glow-factor paragraph after the rules; ruling 2), the launch
 *   glow clad, and the block naming its resting lamps left to #893, which
 *   settled it the other way — more lights, not fewer. The clause now
 *   names them (quoted at the head of this file): the forge line is "the
 *   forge light across the bay", the launch glow that light "at its
 *   mouth", the ten guides "the bay's guide lights", the two warning
 *   lights "the gantries' lamps" and the four hull veins "the navy's own
 *   lamps on the halls" — all lit, and the working band is the same lamps
 *   brighter. Under that:
 *   · `bay_guide_0_0` to `_0_3` and `_1_1`, on the lips' tops under the
 *     lobes' skirts and the crane beams, stay lit and the whole rank
 *     moves, both lips, to either side of the forge line at x ±0.75 — the
 *     one column the lobes and the Directorate's plates leave clear; the
 *     floor's own edges at ±1.7 are under the lobes. The hull in progress,
 *     whose plan reaches x 0.69, still covers 37 % of `bay_guide_0_2` at
 *     z 0.9, which shows 5.25 m² where its siblings show 7.1 to 8.2. The
 *     port rank overlaps the forge line's edge by 0.9 m, the
 *     line running 0.15 off centre; the starboard rank clears it. And to
 *     z −4.1 at the same 2.5 pitch, off the beams and off the second
 *     lobe's skirt at z 2 and the fourth's at 5 (rule 5). The kit's
 *     `foundryBay` default, so the Directorate's file moves with this one.
 *   · `launch_glow`, the drum the export stood on edge inside the mouth's
 *     ring (a disc facing the bow, 0 m² from above), is the forge light
 *     "at its mouth": lit at rest in `forge_light`, the forge
 *     line's own and the material the export gave it, which #890 had
 *     swapped for `bio_vein_unlit` on the block as it then read (rule 2).
 *     Since #893 it lies flat, its face up at y 0.5, centred on the
 *     floor's end at z 6.0 rather than in the ring — a flat disc where
 *     the export stood it, at z 6.62, would reach 7.97, 0.58 past this
 *     file's bow extent (`DRAWN`: `root_anchor_1`'s box at 7.39) and
 *     rescale the file — on the crown of the
 *     ring's bottom tube, a twentieth proud of the floor, under the forge
 *     line's top, the fifth guide each side standing proud of it (rule 5;
 *     the numbers in kit.mjs `launchMouth`, whose default this is, so the
 *     Directorate's file moves with this one). It shows 850 m² where the
 *     export's disc showed none; the ring's top tube, the forge line's
 *     end and the fourth port lobe's skirt cover the rest. The
 *     `forge_line` inside the bay is not hidden and is not touched.
 *   Beyond the relabel above, `diff.mjs` lists all ten guides, since the
 *   rank moves as one, the launch glow (moved, and back on the export's
 *   material), and no other part.
 *
 * THE FRAME is the one the Light Scouts state for the shared kinds
 * (hulls/light-scout-pelagia.mjs) and the turrets follow: the export is
 * drawn along Z, 17.2438 units long for a 320 m footprint (hull-intake's
 * `rawSize.z` on the approved file, which yawed it onto X), ground at
 * y = 0; it is built here metre-true at 320 m along +X, centred on its
 * length, the ground kept at y = 0 — which is where the bake and the
 * runtime put a Z-long file anyway. Every placement goes through kit.mjs
 * `drawn` (the kit's `zLong` frame); the two crane frames through `group`;
 * the one scale and shift through `metreTrue`. `DRAWN` is the built file's
 * length as intake measures it, three's `Box3` over the parts' own boxes,
 * so that both consumers' own rescale is exactly 1 and the maps stay where
 * the file put them — 17.4354 since the facet pass re-cut the root anchors
 * whose boxes set it, the export's 17.2438 before, so every part stands
 * 1.1 % smaller in metres than it did; the built file is X-long, so intake
 * does not yaw it again.
 *
 * FACETS (#919). The Commune's rule is one facet edge of 1.5 m, five to
 * sixteen (docs/asset-prompts-3d.md Block 2c; pelagia.mjs `cut`), asked at
 * this file's scale for each part as its node presses it, and the pass
 * re-cut every round part: the eight husk lobes sixteen round and five
 * rows over their 0.62 of a half turn at 41–64 m of radius, where the
 * export had 10 × 7; their twenty rings sixteen round at 16–53 m on tubes
 * of five to twelve at 0.9–2.8 m, where they had 20 on 4; the knuckles,
 * the outrigger lobes, the stern pod and the three buds sixteen by eight
 * at 7–65 m, where they had 7 × 5 to 10 × 6; the outrigger and stern
 * rings sixteen on tubes of seven and eight at 1.6–1.9 m, where they had
 * 16 and 18 on 4; the four veins three segments over 1.06–1.37 rad,
 * fourteen to eighteen a turn, on a tube of five at 1.1 m, where they had
 * 12 on 4; and the kit's parts at its numbers — the hull in progress and
 * the two tanks capsules of sixteen round with eight-segment caps at 12–13
 * m, where they had 7 and 8 on 3; the ten guides eight by four at 1.8 m
 * and the two warning lights seven by four at 1.65 m, where they had 5 × 4;
 * the cables five at 0.9 m, as they were; the launch mouth sixteen on a
 * tube of sixteen at 42 and 6.3 m, where it had 10 on 5, and its glow drum
 * sixteen at 25 m, where it had nine; the graft pipes fifteen at 3.7 m and
 * their flanges sixteen on a tube of five, where they had 7 and 10 on 5 —
 * and the five root anchors sixteen round with eight-segment caps at
 * 7.5–8.8 m, where they had 6 on 3. `facets.mjs pelagia` names one ring:
 * `lobe_ring_1_3_2`'s tube, nine at 2.02 m where the rule says eight —
 * pressed 1.74 by 1.55 on its node, it reads a step over at eight and a
 * step under at nine, and no count reads back on the rule, so the last is
 * built and the measure names it (pelagia.mjs `cut`). `hull_vein_1` is
 * swept out to R 2.34 from the file's 2.306: inside the sixteen-round lobe
 * it showed nothing from above (7.4 m² before the pass), and at 2.34 it
 * shows 13 and still rests on the lobe; `hull_vein_2` is swept in to 2.17
 * from 2.228, where it stood 0.67 m off its lobe, and lies on it. 87 parts
 * and 7,280 triangles become 87 and 12,660.
 */
import {
  THREE,
  zLong,
  drawn,
  capsule,
  foundryBay,
  gantryCrane,
  launchMouth,
  ballastTanks,
  flangedPipes,
  metreTrue,
  exportGlb,
} from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 320;
const DRAWN = 17.4354;
const DATUM = 0;
// The Commune's facet rule at this file's scale (pelagia.mjs `cut`, #919;
// kit.mjs `asked` for the kit's bay, cranes, tanks and pipes): the builders
// are handed the export's units and the rule is a chord in metres.
const cut = pelagia.cut(L / DRAWN);

const algae = pelagia.ink.algaeHull();
const chitin = pelagia.ink.deepChlorophyll();
const spore = pelagia.ink.sporePod();
const forge = pelagia.ink.forgeLight(3.8397711422314402);
const steel = pelagia.ink.grownSteel();
const bio = pelagia.ink.bioLight(3.0999400442394323);

const root = new THREE.Group();
root.name = 'foundry_pelagia';

// A torus is born in the XY plane; every ring here lies flat.
const FLAT = [Math.PI / 2, 0, 0];

// The husk flanks: the +x rank first, as the file writes it — named port
// here (see the header) — then the −x rank. Each lobe pitched its own way
// under the flank's roll, each ring at its own station with its own tube.
pelagia.huskFlanks(
  root,
  { skin: algae, ring: chitin },
  {
    cut,
    flanks: [
      {
        name: 'port',
        n: '0',
        lobes: [
          {
            at: [3.54, 0.15, -4.4],
            rot: [-0.00537371491082, 0, 0.14],
            scale: [2.65, 2.5, 3],
            rings: [
              { f: 0.923503453144, tube: 0.06268306077 },
              { f: 0.797622842169, tube: 0.04655620083 },
            ],
          },
          {
            at: [3.4, 0.15, -1.2],
            rot: [-0.0278943900252, 0, 0.14],
            scale: [2.65, 2.9, 3.5],
            rings: [
              { f: 0.930449292363, tube: 0.05332974344 },
              { f: 0.804787005228, tube: 0.0470649004 },
              { f: 0.621895510409, tube: 0.05460454896 },
            ],
          },
          {
            at: [3.3, 0.15, 2],
            rot: [-0.0158513547154, 0, 0.14],
            scale: [2.65, 2.7, 3.2],
            rings: [
              { f: 0.9385792914, tube: 0.06110650674 },
              { f: 0.806760042647, tube: 0.05242353305 },
            ],
          },
          {
            at: [3.2, 0.15, 4.9],
            rot: [-0.0421015485888, 0, 0.14],
            scale: [2.65, 2.1, 2.5],
            rings: [
              { f: 0.936523965125, tube: 0.04844691604 },
              { f: 0.809976731514, tube: 0.06628300995 },
              { f: 0.641553688585, tube: 0.0659352541 },
            ],
          },
        ],
      },
      {
        name: 'starboard',
        n: '1',
        lobes: [
          {
            at: [-3.6, 0.15, -3.8],
            rot: [-0.00813110829331, 0, -0.14],
            scale: [2.25, 2.2, 2.6],
            rings: [
              { f: 0.927062912044, tube: 0.05091174692 },
              { f: 0.81644898569, tube: 0.04972294345 },
            ],
          },
          {
            at: [-3.45, 0.15, -0.8],
            rot: [-0.0475758947898, 0, -0.14],
            scale: [2.25, 2.5, 3],
            rings: [
              { f: 0.92626271866, tube: 0.06109818816 },
              { f: 0.807636073716, tube: 0.04577264562 },
              { f: 0.631870629727, tube: 0.06845856458 },
            ],
          },
          {
            at: [-3.34, 0.15, 2.2],
            rot: [0.0167933647521, 0, -0.14],
            scale: [2.25, 2.3, 2.7],
            rings: [
              { f: 0.935866083746, tube: 0.06298650801 },
              { f: 0.802420146744, tube: 0.05458852276 },
            ],
          },
          {
            at: [-3.52, 0.15, 4.4],
            rot: [0.0496415369213, 0, -0.14],
            scale: [2.25, 1.7, 2],
            rings: [
              { f: 0.931314778475, tube: 0.06065826863 },
              { f: 0.793340475337, tube: 0.05699840188 },
              { f: 0.633753335239, tube: 0.06394460052 },
            ],
          },
        ],
      },
    ],
  }
);

// Six knuckles where the lobes meet, three a flank, each its own size.
pelagia.huskKnuckles(root, chitin, {
  cut,
  knuckles: [
    [0.5476813912, [3.47713672267, 2.47026535487, -2.9]],
    [0.5620514154, [3.09033972956, 2.30498886763, 0.5]],
    [0.599318862, [3.49254595339, 2.32628089716, 3.6]],
    [0.5944314599, [-2.94843709073, 2.13203105193, -2.4]],
    [0.6619743109, [-3.3078205849, 2.3281997283, 0.8]],
    [0.5933355689, [-2.98272820595, 2.28332924962, 3.4]],
  ],
});

// The outrigger lobes off the corners, the big one ringed and the small one
// budded; and the stern pod with its ring and bud at the blind end.
pelagia.outriggerLobes(
  root,
  { skin: algae, ring: chitin, bud: spore },
  {
    cut,
    big: { r: 1.9, at: [6.6, 0.75, -1.6], rot: [0, 0.5, 0], scale: [1.25, 0.7, 0.95] },
    ring: { R: 1.55, tube: 0.07, at: [6.6, 1.35, -1.6], rot: FLAT, scale: [1.25, 0.95, 1] },
    small: { r: 1.25, at: [-5.9, 0.6, 3.8], rot: [0, -0.4, 0], scale: [1.1, 0.65, 1.3] },
    bud: { r: 0.4, at: [-6.3, 1.35, 4.3] },
  }
);
pelagia.sternPod(
  root,
  { skin: algae, ring: chitin, bud: spore },
  {
    cut,
    pod: { r: 3.1, at: [0.7, 1, -7.2], rot: [0, 0, 0], scale: [1.15, 0.75, 0.9] },
    ring: { R: 2.35, tube: 0.09, at: [0.7, 2, -7.2], rot: FLAT, scale: [1.15, 0.9, 1] },
    bud: { r: 0.55, at: [1.6, 2.9, -8] },
  }
);

// The bay at the kit's defaults — the Directorate file's numbers, which
// this file carries too, five guides a lip either side of the forge line
// since #890 — restated where a count rides them so the rule can take it
// (#919): the hull in progress is the kit's capsule at the rule's two
// counts, the guides orbs at the rule's; and the two cranes over it, each
// without finials, its trolley where the file has it, the cable and the
// warning light at the kit's numbers on the rule's counts.
foundryBay(
  root,
  { floor: chitin, forge, hull: steel, guide: bio },
  {
    hull: {
      geo: capsule(0.65, 2.2, ...cut.capsule(0.65)),
      at: [0.1, 1.15, 2.1],
      rot: [Math.PI / 2, 0, 0.06],
    },
    guide: { r: 0.1, facets: cut.orb, x: 0.75, y: 0.62, from: -4.1, pitch: 2.5, count: 5 },
  }
);
const crane = { steel, trolley: chitin, cable: steel, load: steel, warnlight: bio };
const rigging = {
  cable: { r: 0.05, facets: cut.round, hang: 0.2 },
  warnlight: { y: 6.08, r: 0.09, facets: cut.orb },
};
gantryCrane(root, crane, {
  n: 0,
  at: [0, 0, -2.6],
  finials: null,
  trolley: { x: -0.708194032, y: 5.3, size: [0.8, 0.5, 0.7] },
  ...rigging,
});
gantryCrane(root, crane, {
  n: 1,
  at: [0, 0, 2.9],
  finials: null,
  trolley: { x: 0.001294153, y: 5.3, size: [0.8, 0.5, 0.7] },
  load: { y: 3.6, size: [0.55, 0.4, 0.5] },
  ...rigging,
});

// The launch mouth and its glow drum, at the kit's defaults — the drum
// lying flat at the floor's level since #893, lit in `forge_light`, the
// forge line's own: the block's forge light "at its mouth" (the header) —
// restated with the rule's counts (#919; the kit takes these two as
// numbers): the ring as its node presses it, the drum at its radius.
const MOUTH = { R: 1.7, tube: 0.3, at: [0.1, 1.5, 6.7], scale: [1.15, 0.8, 1] };
const GLOW = { r: 1.35, h: 0.2, at: [0.1, 0.5, 6.0], rot: [0, 0, 0] };
launchMouth(
  root,
  { mouth: chitin, glow: forge },
  {
    mouth: {
      ...MOUTH,
      facets: cut.torus(MOUTH.R, MOUTH.tube, {
        ...drawn(MOUTH.at, [0, 0, 0], MOUTH.scale),
        yaw: true,
      }),
    },
    glow: { ...GLOW, facets: cut.cyl(GLOW.r, GLOW.r, GLOW.h, { yaw: true }) },
  }
);

// Four lit veins climbing the flanks, two a side, each its own radius and
// arc, yawed −0.4 and rolled its own way — "the navy's own lamps on the
// halls and the mouth — ... veins" of the block's resting clause since
// #893 (the header).
// Each vein set out by its own chord's sag (`domeArcs` `sag`, #919): three
// segments over 1.06–1.37 rad sag 0.016–0.026 of the radius, and at the
// file's radius `hull_vein_1` lay inside the lobe it climbs, its plan from
// above gone from 7.4 m² to none.
pelagia.domeArcs(root, bio, {
  name: 'hull_vein',
  cut,
  sag: true,
  frame: zLong,
  tube: 0.06,
  arcs: [
    // R 2.10, not the file's 2.344514791 — the veins bullet in the header.
    {
      R: 2.1,
      arc: 1.05722491759,
      at: [-3.7, 0.3, -3.5],
      rot: [0, Math.PI + 0.4, 0.827962757369],
    },
    // R 2.34, not the file's 2.305575315 (#919): on the sixteen-round lobe the
    // file's arc lay inside the skin and showed nothing from above where it
    // had shown 7.4 m²; swept outward as `hull_vein_0` was swept in — 2.32
    // shows 2.6 m², 2.34 13 — and at 2.34 it still rests on `husk_lobe_port_1`.
    { R: 2.34, arc: 1.3233022131, at: [3.7, 0.3, -1.2], rot: [0, -0.4, 0.524075461924] },
    // R 2.17, not the file's 2.228130762 (#919): on the sixteen-round lobe the
    // file's arc stood 0.67 m off `husk_lobe_starboard_1`; swept in as
    // `hull_vein_0` was — 2.21 leaves 0.39 m, 2.19 0.07, 2.17 lies on.
    {
      R: 2.17,
      arc: 1.3655300752,
      at: [-3.7, 0.3, 1.1],
      rot: [0, Math.PI + 0.4, 0.802234526259],
    },
    { R: 2.348291818, arc: 1.0568191599, at: [3.7, 0.3, 3.4], rot: [0, -0.4, 0.599699974991] },
  ],
});

// Two ballast tanks and two graft pipes with their flanges, at the kit's
// defaults — the Directorate file's numbers, which this file carries too —
// on the rule's counts (#919; the pipe's and flange's radii restated, since
// the kit takes the count beside them).
ballastTanks(root, steel, { facets: cut.capsule });
flangedPipes(
  root,
  { pipe: steel, flange: algae },
  {
    pipe: { radii: [0.16, 0.2], facets: cut.round },
    flange: { R: 0.22, tube: 0.06, facets: [cut.round, cut.round] },
  }
);

// Five root anchors into the seabed, no two alike, algae and chitin by
// turns, laid 0.14 short of flat and yawed each its own way.
pelagia.rootButtresses(root, [algae, chitin], {
  name: 'root_anchor',
  cut,
  frame: zLong,
  roll: Math.PI / 2 - 0.14,
  grips: [
    {
      r: 0.4327703416,
      length: 2.21055603,
      at: [4.97655946045, 0.28, 3.92049148095],
      yaw: 0.962784761996,
    },
    {
      r: 0.4065885246,
      length: 2.889360189,
      at: [-3.07875914352, 0.28, 6.1552007837],
      yaw: -0.513559023651,
    },
    {
      r: 0.4141236842,
      length: 2.869332075,
      at: [-6.09763628444, 0.28, -1.60146378395],
      yaw: -1.7995979505,
    },
    {
      r: 0.4309765995,
      length: 1.650811195,
      at: [-0.887704598822, 0.28, -6.61890321696],
      yaw: -2.99043791368,
    },
    {
      r: 0.4773933291,
      length: 2.647448063,
      at: [5.55948709658, 0.28, -3.08418682995],
      yaw: 2.02746579546,
    },
  ],
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'foundry-pelagia.glb');
