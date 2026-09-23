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
 * - The lobes are partial spheres, not tables: 10 × 7 orbs stopped 0.62 of
 *   the way down, each pitched a fraction of a degree its own way under the
 *   flank's 0.14 roll. Each ring's station and tube are the file's, and its
 *   place and scale follow from them by one rule (`huskFlanks`).
 * - The cranes carry no finials; their trolleys sit at −0.7082 and 0.0013
 *   off the beam's centre; the second crane's load hangs 1.1 higher than
 *   the first's. Every other number of both cranes, of the bay, the launch
 *   mouth, the tanks and the pipes is the Directorate file's.
 * - The four veins are arcs of torus each its own radius (2.23 to 2.35)
 *   and arc (1.057 to 1.366), two a flank, yawed −0.4 and rolled each its
 *   own way; the −x pair the file writes in three's (−π, b, c) form of the
 *   XYZ Euler, written here as the plain (0, π + 0.4, c + π) of the same
 *   matrix. Three of the five anchors are written the same way.
 * - The six materials are the navy's `ink`: the Bastion's five with
 *   `biolight_green` at this file's 3.0999, and `forge_light`, the spore
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
 *     floor's end at z 6.0 rather than in the ring — a flat disc at the
 *     ring's station would run 0.58 past this file's bow extent (`DRAWN`,
 *     a root anchor's box) and rescale the file — on the crown of the
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
 * the one scale and shift through `metreTrue`. `DRAWN` is the export's
 * length as intake measures it, three's `Box3` over the parts' own boxes,
 * so that both consumers' own rescale is exactly 1 and the maps stay where
 * the approved export put them; the built file is X-long (320 × 317.6 m),
 * so intake does not yaw it again.
 */
import {
  THREE,
  zLong,
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
const DRAWN = 17.243808807368453;
const DATUM = 0;

const algae = pelagia.ink.algaeHull();
const chitin = pelagia.ink.deepChlorophyll();
const spore = pelagia.ink.sporePale();
const forge = pelagia.ink.forgeLight(3.8397711422314402);
const steel = pelagia.ink.grownSteel();
const bio = pelagia.ink.biolightGreen(3.0999400442394323);

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
    big: {
      r: 1.9,
      facets: [9, 6],
      at: [6.6, 0.75, -1.6],
      rot: [0, 0.5, 0],
      scale: [1.25, 0.7, 0.95],
    },
    ring: {
      R: 1.55,
      tube: 0.07,
      facets: [4, 16],
      at: [6.6, 1.35, -1.6],
      rot: FLAT,
      scale: [1.25, 0.95, 1],
    },
    small: {
      r: 1.25,
      facets: [8, 5],
      at: [-5.9, 0.6, 3.8],
      rot: [0, -0.4, 0],
      scale: [1.1, 0.65, 1.3],
    },
    bud: { r: 0.4, facets: [6, 4], at: [-6.3, 1.35, 4.3] },
  }
);
pelagia.sternPod(
  root,
  { skin: algae, ring: chitin, bud: spore },
  {
    pod: { r: 3.1, facets: [10, 6], at: [0.7, 1, -7.2], rot: [0, 0, 0], scale: [1.15, 0.75, 0.9] },
    ring: {
      R: 2.35,
      tube: 0.09,
      facets: [4, 18],
      at: [0.7, 2, -7.2],
      rot: FLAT,
      scale: [1.15, 0.9, 1],
    },
    bud: { r: 0.55, facets: [7, 5], at: [1.6, 2.9, -8] },
  }
);

// The bay at the kit's defaults — the Directorate file's numbers, which
// this file carries too, five guides a lip either side of the forge line
// since #890 — and the two cranes over it, each without finials, its
// trolley where the file has it.
foundryBay(root, { floor: chitin, forge, hull: steel, guide: bio });
const crane = { steel, trolley: chitin, cable: steel, load: steel, warnlight: bio };
gantryCrane(root, crane, {
  n: 0,
  at: [0, 0, -2.6],
  finials: null,
  trolley: { x: -0.708194032, y: 5.3, size: [0.8, 0.5, 0.7] },
});
gantryCrane(root, crane, {
  n: 1,
  at: [0, 0, 2.9],
  finials: null,
  trolley: { x: 0.001294153, y: 5.3, size: [0.8, 0.5, 0.7] },
  load: { y: 3.6, size: [0.55, 0.4, 0.5] },
});

// The launch mouth and its glow drum, at the kit's defaults — the drum
// lying flat at the floor's level since #893, lit in `forge_light`, the
// forge line's own: the block's forge light "at its mouth" (the header).
launchMouth(root, { mouth: chitin, glow: forge });

// Four lit veins climbing the flanks, two a side, each its own radius and
// arc, yawed −0.4 and rolled its own way — "the navy's own lamps on the
// halls and the mouth — ... veins" of the block's resting clause since
// #893 (the header).
pelagia.domeArcs(root, bio, {
  name: 'hull_vein',
  frame: zLong,
  tube: 0.06,
  facets: [4, 12],
  arcs: [
    {
      R: 2.344514791,
      arc: 1.05722491759,
      at: [-3.7, 0.3, -3.5],
      rot: [0, Math.PI + 0.4, 0.827962757369],
    },
    { R: 2.305575315, arc: 1.3233022131, at: [3.7, 0.3, -1.2], rot: [0, -0.4, 0.524075461924] },
    {
      R: 2.228130762,
      arc: 1.3655300752,
      at: [-3.7, 0.3, 1.1],
      rot: [0, Math.PI + 0.4, 0.802234526259],
    },
    { R: 2.348291818, arc: 1.0568191599, at: [3.7, 0.3, 3.4], rot: [0, -0.4, 0.599699974991] },
  ],
});

// Two ballast tanks and two graft pipes with their flanges, at the kit's
// defaults — the Directorate file's numbers, which this file carries too.
ballastTanks(root, steel);
flangedPipes(root, { pipe: steel, flange: algae });

// Five root anchors into the seabed, no two alike, algae and chitin by
// turns, laid 0.14 short of flat and yawed each its own way.
pelagia.rootButtresses(root, [algae, chitin], {
  name: 'root_anchor',
  frame: zLong,
  roll: Math.PI / 2 - 0.14,
  facets: [3, 6],
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
