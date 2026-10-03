/**
 * The Foundry, Abyssal Directorate — 320 m of footprint (2 × `radiusM` 160,
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
 * The Directorate's is a carapace laid down either side of the bay: four
 * tergites a flank, each with its steel seam and — all but the bow plate —
 * a black spine raked the one way; two outrigger pods off the corners and
 * a spike off the big one; a stern carapace with its seam ring and spike
 * closing the blind end; the bay itself — floor, forge line, the hull in
 * progress, a lip either side and a rank of crimson guides either side of
 * the forge line — and two gantry cranes over it; the launch mouth with
 * the glow drum lying flat in it, lit, and a mandible either side; ten
 * flank photophores, seven on one flank and
 * three on the other; two ballast tanks and two graft pipes with their
 * flanges along the other flank; and five anchor claws into the seabed.
 *
 * A port of the approved export (docs/concept-art/models/foundry-
 * directorate.glb at f7cce0f), part for part in its order, every number
 * the export's own, read off its nodes and its buffers (#652). The bay, the
 * cranes, the launch mouth, the ballast tanks and the graft pipes are the
 * kit's Foundry vocabulary (kit.mjs `foundryBay`, `gantryCrane`,
 * `launchMouth`, `ballastTanks`, `flangedPipes`), whose defaults are this
 * file's numbers; the rest is `factions/directorate.mjs`'s works section.
 * Nothing here is a shape decision but #890's and #893's light placement,
 * the last bullet; where the export is odd the script is odd with it:
 *
 * - RELABELLED, as #642 relabelled the eleven `bothSides` hulls and #649
 *   the Commune Harvester's tendrils: the export is Z-long, its +x lands on
 *   the kit's −z through `drawn`, and −z is port — so the flank the file
 *   calls `tergite_starboard_0..3` and the lip it calls `bay_lip_starboard`,
 *   both at +x, are written `tergite_port_0..3` and `bay_lip_port`, and
 *   their −x twins `_starboard`. Every buffer stays where it is and in the
 *   file's order — the +x flank and lip are still written first — and only
 *   the ten names turn; the seams, spines and guides keep their `0` (+x) and
 *   `1` (−x), which are indices, not sides. `diff.mjs` matches by name and
 *   so lists those ten as moved: each `_starboard_i` to where its `_port_i`
 *   was and back, to the millimetre, which is the relabel and nothing else.
 * - The −x rank carries four guides, `bay_guide_1_0`, `_1`, `_3`, `_4`:
 *   there is no `bay_guide_1_2` in the file, and there is none here.
 * - The bow plate on each flank has no spine: three `spine_spike` a flank
 *   over four tergites. All six spines rake along (±0.35, 1, 0.1), the
 *   file's node transcribed to nine places as the seed; each foot is seated
 *   on its own plate (SPINES, below; #1050).
 * - Each tergite's rotation is a YXZ Euler with a pitch of its own —
 *   −0.0043, 0.0166, −0.0350, 0.0003 down one flank — under a regular yaw
 *   and roll; its seam takes the yaw and roll and not the pitch.
 * - The cranes' trolleys sit at 0.2308 and −0.0913 off the beam's centre,
 *   the second crane's load hangs 1.1 higher than the first's, and the
 *   Commune's file shares every other number of both cranes with this one.
 * - The mandibles are at x 2.2 and −2, not mirrored; the ten flank
 *   photophores are each their own radius (0.083 to 0.109) and height, and
 *   `photophoreDomes` refuses a mirrored pair among them as it does on a
 *   hull.
 * - The six materials are the navy's `ink`: `chitin_red`, `chitin_violet`,
 *   `trench_black`, `weld_steel`, `biolight_crimson` at this file's 2.277,
 *   and `forge_light` at its 3.698 on the forge line and the launch glow,
 *   as the export had them. The export carried the turret's `weld_steel`
 *   (#27313B) and a `biolight_crimson` on a #3A0D16 base, the settlement
 *   pass's own values under the hulls' names; #888 brought both onto the
 *   navy's (#3A3F4A and #1A0810). #890 clad the launch glow in
 *   `biolight_unlit`, the navy's rule-2 finish (asset-prompts-3d.md Block
 *   2b), and #893 gave it `forge_light` back; no value moved with either.
 * - #890 and #893, light placement. The light audit named fourteen lamps
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
 *   mouth", the nine guides "the bay's guide lights", the two warning
 *   lights "the gantries' lamps" and the ten flank photophores "the
 *   navy's own lamps on the halls" — all lit, and the working band is the
 *   same lamps brighter. Under that:
 *   · `bay_guide_0_0`, `_0_1`, `_0_3`, `_0_4` and `_1_1`, on the lips' tops
 *     under the tergites' rims and the crane beams, stay lit and the whole
 *     rank moves, both lips, to either side of the forge line at x ±0.75 —
 *     the one column the plates and the Commune's lobes leave clear; the
 *     floor's own edges at ±1.7 are under the plates. The hull in
 *     progress, whose plan reached x 0.69, covered 38 % of
 *     `bay_guide_0_2` at z 0.9, which showed 4.94 m² where its siblings
 *     showed 6.8 to 8.1 (6.0–6.2 since the pass cut them 5 × 3) — and 74 %
 *     once the rule cut it fifteen-sided
 *     (#919), so that guide steps 0.7 aft to z 0.2 (`foundryBay`
 *     `shift`) and shows 6.1 m². The port rank overlaps the forge line's edge by
 *     0.9 m, the line running 0.15 off centre; the starboard rank clears
 *     it. And to
 *     z −4.1 at the same 2.5 pitch, off the beams (rule 5). The kit's
 *     `foundryBay` default, so the Commune's file moves with this one.
 *   · `launch_glow`, the drum the export stood on edge inside the mouth's
 *     ring (a disc facing the bow, 0 m² from above), is the forge light
 *     "at its mouth": lit at rest in `forge_light`, the forge
 *     line's own and the material the export gave it, which #890 had
 *     swapped for `biolight_unlit` on the block as it then read (rule 2).
 *     Since #893 it lies flat, its face up at y 0.5, centred on the
 *     floor's end at z 6.0 rather than in the ring — a flat disc where
 *     the export stood it, at z 6.62, would reach 7.97, past this file's
 *     bow extent (`DRAWN`: `tergite_port_3`'s box at 7.66) and rescale
 *     the file — on the crown of the ring's bottom tube, a twentieth
 *     proud of the floor, under the forge line's top, the fifth guide
 *     each side standing proud of it (rule 5; the numbers in kit.mjs
 *     `launchMouth`, whose default this is, so the Commune's file moves
 *     with this one). It shows 841 m² where the export's disc showed
 *     none; the ring's top tube, the forge line's end and the fourth port
 *     tergite cover the rest. The `forge_line` inside the bay is not
 *     hidden and is not touched.
 *   · `flank_photophore_1` to `_6`, `_8` and `_9` the export drew inside
 *     the tergite shells they lie on — up to 1.51 under a plate's surface,
 *     `_2` at 1.470 under a plate at 2.979 and `_5` 1.45 under its — so no
 *     view ever saw them, not only the top-down one — and `_0`, not
 *     among the fourteen, sat 0.06 under its plate and showed 3.5 m² of a
 *     dome its siblings show 6 to 8 of. Each keeps its station in plan
 *     and rises to its plate's own surface height there, plus the lift a
 *     guide sat proud of its lip (rule 5). `_7` breaks its plate's surface
 *     on its own and stays.
 *   `diff.mjs` lists nineteen parts and no other: all nine guides, since
 *   the rank moves as one, the launch glow (moved, and back on the
 *   export's material), and the nine photophores.
 *
 * THE FRAME is the one the Light Scouts state for the shared kinds
 * (hulls/light-scout-pelagia.mjs) and the turrets follow: the export is
 * drawn along Z, 17.5184 units long for a 320 m footprint (hull-intake's
 * `rawSize.z` on the approved file, which yawed it onto X), ground at
 * y = 0; it is built here metre-true at 320 m along +X, centred on its
 * length, the ground kept at y = 0 — which is where the bake and the
 * runtime put a Z-long file anyway. Every placement goes through kit.mjs
 * `drawn` (the kit's `zLong` frame); the two crane frames through `group`;
 * the one scale and shift through `metreTrue`. `DRAWN` is the export's
 * length as intake measures it, three's `Box3` over the parts' own boxes,
 * so that both consumers' own rescale is exactly 1 and the maps stay where
 * the approved export put them; the built file is X-long (320 × 306.7 m),
 * so intake does not yaw it again.
 *
 * FACETS (#919). The navy's rule is one facet of 2 m, odd counts five to
 * fifteen, five and a named four the sections (docs/asset-prompts-3d.md
 * Block 2c; directorate.mjs `cut`), asked at this file's scale and settled on
 * each part as its node places it; the kit's bay, cranes, mouth, tanks and
 * pipes take it through `asked`. The export's counts went: the eight tergites
 * 9 × 6 → 15 × 4 over 0.58 of a half-turn, their seams 4 × 16 → 7, 9 or 11 by
 * 7 over their half turn (tube by ring, the tubes pressed with their
 * plates), the outrigger pods 8 × 5 and 7 × 5 → 15 × 7, the stern carapace
 * 9 × 6 → 15 × 7 with its seam 4 × 16 → 5 × 15, the hull in progress
 * 3 × 7 → 4 × 15, the bay guides and warning lights 5 × 4 → 5 × 3, the
 * finials 4 → 7, the cables 5 → 5, the launch mouth 5 × 10 → 5 × 15 (its
 * tube's five a section kept) with its
 * drum 9 → 15, the ballast tanks 3 × 8 → 4 × 15, the graft pipes 7 → 11 with
 * flanges 5 × 10 → 5 × 15, and the ten flank photophores 5 × 4 → 5 × 3 (one
 * 7 × 4); the spine spikes, the two mandibles and the five claws keep their
 * sections. `facets.mjs` names three of its 118 rings: the hull in progress
 * and the two ballast tanks, capsules whose half-turn share of fifteen is
 * seven, odd, so the capsule takes the segment over: eight a half turn,
 * sixteen a turn (Block 2c, the capsule reading). Triangles
 * 3,884 → 4,714; `DRAWN` 17.4421, where the file measured 17.5184. The ten
 * flank photophores are grown from their plates now (`on`, below).
 *
 * PANELS (#919). The band for a structure is 2.5–8 m on a side, the median
 * unlit part from above (facets.mjs `panelsOf`; Block 2c), and this file
 * read 11.0 m over fifty-one, thirty-two parts over 64 m² against nineteen
 * in the band. The pass adds fifteen spines where fourteen are the least: a
 * second, smaller spike a unit abaft each spine spike, raked the one way
 * and seated on the plate under it, on five of the six — not the second
 * starboard plate, where `flank_photophore_8` stands — and none on the bow plates, which carry no
 * spine in the file (`spineRank`); a ring of seven round the stern spike on
 * the stern carapace's crown and a ring of five round the outrigger's spike
 * on the big pod, its first and third stations never grown, where that
 * spike stands and where the pod meets the second port plate (`spineRing`).
 * Each its own length, black, its base seated on its plate, carapace or
 * pod, touching nothing else. They show 10–15 m² each, and the median part
 * is 7.1 m over sixty-six, the two graft flanges. No lamp's plan changed, no
 * plan grew from above. 85 parts and 4,714 triangles become 100 and 4,864;
 * `DRAWN` holds at 17.4421.
 *
 * SPINES (#1050). The file's six spine stations stood on the export's 9 × 6
 * plates. On the rule's 15 × 4 (#919) `spine_spike_0_2`'s mesh stood 0.77 m
 * off `tergite_port_2` with no contact at all, its base centre 2.39 m off;
 * `spine_spike_0_1` met `tergite_port_2` and not `tergite_port_1`, its base
 * 2.47 m off its own plate; the other four stood 0.21–1.38 m off theirs,
 * meeting them by their rims. Each is seated on its own plate now
 * (`tergiteFlanks` `footed`; directorate.mjs `footed`), as the barbs,
 * rings and photophores are: the base moves to the plate's nearest point
 * and 0.14 (`spike.r`, 2.57 m) in along its normal; rake, length and the
 * station as the seed are the file's. The plates face up, out and a little
 * forward where the spikes stand, so every spike moved down, aft and
 * outboard along that normal: `0_0` 3.3 m (2.7 down, 1.8 aft, 0.6 out),
 * `0_1` 5.0 (4.0, 2.9, 1.0), `0_2` 5.0 (4.1, 2.7, 0.8), `1_0` 2.8 (2.3,
 * 1.6, 0.2), `1_1` 4.0 (3.2, 1.8, 1.4), `1_2` 3.8 (3.1, 1.9, 1.1).
 * `contacts.mjs` pairs every spike with its own plate (`0_0`, `0_1` and
 * `1_0` with the plate abaft as well, where the plates overlap) and with
 * nothing else; the barbs keep their seeds off the file's stations and do
 * not move. `diff.mjs` lists the six spikes and no other part, its figure
 * the drop; `DRAWN` holds at 17.4421.
 */
import {
  THREE,
  foundryBay,
  gantryCrane,
  launchMouth,
  ballastTanks,
  flangedPipes,
  capsule,
  drawn,
  metreTrue,
  exportGlb,
} from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 320;
const DRAWN = 17.4421;
const DATUM = 0;
// The navy's facet rule at this file's scale (directorate.mjs `cut`, #919).
const cut = directorate.cut(L / DRAWN);

const red = directorate.ink.chitinRed();
const steel = directorate.ink.weldSteel();
const black = directorate.ink.trenchBlack();
const violet = directorate.ink.chitinViolet();
const forge = directorate.ink.forgeLight(3.697972238428193);
const crimson = directorate.ink.biolightCrimson(2.276723666358973);

const root = new THREE.Group();
root.name = 'foundry_directorate';

// The spines' one rake, as the minimal rotation from +Y: (0.35, 1, 0.1) on
// the +x flank, (−0.35, 1, 0.1) on the −x, the file's node decomposed.
const RAKE_P = [0.094119023, -0.015933738, -0.335170772];
const RAKE_S = [0.094119023, 0.015933738, 0.335170772];
// The six spine spikes' stations, the file's nodes to nine places: the seed
// each spike is seated from (`footed`; the header, SPINES) and the station
// the second rank's barbs are seeded off (#919), so a station that moves
// takes its barb with it.
const SPIKES = {
  p0: [3.43499122, 3.155403486, -2.837859651],
  p1: [3.320243272, 3.481266491, 0.477926649],
  p2: [3.137728502, 3.118652864, 3.495065286],
  s0: [-3.471891574, 2.66426164, -2.470173836],
  s1: [-3.341732114, 2.968377468, 0.652637747],
  s2: [-3.221987448, 2.699392707, 3.379139271],
};

// The tergite flanks: the +x rank first, as the file writes it — named port
// here (see the header) — then the −x rank.
directorate.tergiteFlanks(
  root,
  { violet, red, black, steel },
  {
    cut,
    footed: true,
    flanks: [
      {
        name: 'port',
        n: '0',
        plates: [
          {
            at: [3.4, 0.15, -4.5],
            rot: [-0.004298972, 0.12, -0.12],
            scale: [2.52, 2.7, 2.9],
            spike: { at: SPIKES.p0, rot: RAKE_P, length: 1.7862519 },
          },
          {
            at: [3.3, 0.15, -1.4],
            rot: [0.016585802, 0.17, -0.12],
            scale: [2.52, 3.1, 3.3],
            spike: { at: SPIKES.p1, rot: RAKE_P, length: 1.6741475 },
          },
          {
            at: [3.18, 0.15, 1.8],
            rot: [-0.03502016, 0.22, -0.12],
            scale: [2.52, 2.9, 3],
            spike: { at: SPIKES.p2, rot: RAKE_P, length: 1.1989505 },
          },
          { at: [3.08, 0.15, 4.7], rot: [0.000254751, 0.27, -0.12], scale: [2.52, 2.3, 2.4] },
        ],
      },
      {
        name: 'starboard',
        n: '1',
        plates: [
          {
            at: [-3.48, 0.15, -3.9],
            rot: [-0.013344816, -0.12, 0.12],
            scale: [2.112, 2.3, 2.5],
            spike: { at: SPIKES.s0, rot: RAKE_S, length: 1.4586362 },
          },
          {
            at: [-3.34, 0.15, -1],
            rot: [-0.033392322, -0.17, 0.12],
            scale: [2.112, 2.6, 2.9],
            spike: { at: SPIKES.s1, rot: RAKE_S, length: 1.5334376 },
          },
          {
            at: [-3.25, 0.15, 1.9],
            rot: [-0.009265448, -0.22, 0.12],
            scale: [2.112, 2.4, 2.6],
            spike: { at: SPIKES.s2, rot: RAKE_S, length: 1.3073378 },
          },
          { at: [-3.4, 0.15, 4.3], rot: [-0.036309463, -0.27, 0.12], scale: [2.112, 1.8, 2] },
        ],
      },
    ],
  }
);

// A second, smaller spike a unit abaft each spine spike (#919, the panel
// pass; the header), raked the one way the spikes rake, seated on the plate
// under it (`spineRank`; kit.mjs `seat`) — the spike's own plate on all
// five since the spikes were seated on theirs (#1050). Five, since `flank_photophore_8` stands where
// the second starboard plate's would grow, and none on the bow
// plates, which carry no spine in the file.
const barb = (n, [x, y, z], rake, length) => [n, black, 0.09, length, [x, y - 0.3, z - 1], rake];
directorate.spineRank(root, {
  name: 'spine_barb',
  frame: drawn,
  on: [0, 1, 2, 3].flatMap((i) => [`tergite_port_${i}`, `tergite_starboard_${i}`]),
  spines: [
    barb('0_0', SPIKES.p0, [0.35, 1, 0.1], 0.95),
    barb('0_1', SPIKES.p1, [0.35, 1, 0.1], 0.88),
    barb('0_2', SPIKES.p2, [0.35, 1, 0.1], 0.82),
    barb('1_0', SPIKES.s0, [-0.35, 1, 0.1], 0.9),
    barb('1_2', SPIKES.s2, [-0.35, 1, 0.1], 0.86),
  ],
});

// The outrigger pods off the corners and the stern carapace at the blind end.
directorate.outriggerPods(
  root,
  { violet, black, red },
  {
    cut,
    big: { r: 1.8, at: [6.5, 0.7, -2], rot: [0, 0.5, 0], scale: [1.25, 0.7, 0.95] },
    spike: { r: 0.18, length: 1.6, at: [7.6, 1.4, -2.6], rot: [0, 0, -0.7] },
    small: {
      r: 1.2,
      at: [-5.8, 0.55, 3.9],
      rot: [0, -0.4, 0],
      scale: [1.1, 0.7, 1.3],
    },
  }
);
directorate.sternCarapace(
  root,
  { red, steel, black },
  {
    cut,
    carapace: { r: 3, at: [0.7, 1, -7.2], scale: [1.15, 0.72, 0.9] },
    seam: {
      R: 2.2,
      tube: 0.09,
      at: [0.7, 1.95, -7.2],
      rot: [Math.PI / 2, 0, 0],
      scale: [1.15, 0.9, 1],
    },
    spike: { r: 0.2, length: 2, at: [1.4, 2.6, -8.6], rot: [-0.6, 0, 0] },
  }
);

// Rings round the file's two barbs (#919, the panel pass; the header): seven
// stations round the stern spike on the stern carapace's crown; five round
// the outrigger's spike on the big pod's crown, the first and the third never
// grown, where that spike itself stands and where the pod meets the second
// port plate. Each spine its own length, leaning out along its own bearing,
// black, seated on its shell (`spineRing`; kit.mjs `seat`).
directorate.spineRing(root, black, {
  name: 'stern_spine',
  frame: drawn,
  on: 'stern_carapace',
  about: [0.7, -7.2],
  stations: 7,
  phase: 0.3,
  rho: 2.07,
  y: 2.73,
  tilt: 0.7,
  r: 0.09,
  holes: [],
  lengths: [0.8, 0.9, 0.78, 0.71, 0.85, 0.88, 0.73],
});
directorate.spineRing(root, black, {
  name: 'pod_spine',
  frame: drawn,
  on: 'outrigger_pod_big',
  about: [6.5, -2],
  stations: 5,
  phase: 0.2,
  rho: 1.1,
  y: 1.75,
  tilt: 0.75,
  r: 0.08,
  holes: [0, 2],
  lengths: [0.77, 0.74, 0.62, 0.68, 0.78],
});

// The bay, at the kit's defaults — this file's numbers, the guides either
// side of the forge line since #890 — with the −x lip one guide short; and
// the two cranes over it. The hull in progress, the guides, the finials, the
// cables and the warning lights take the navy's rule through the kit's
// `asked` (#919); their stations and sizes are the kit's defaults.
foundryBay(
  root,
  { floor: black, forge, hull: violet, guide: crimson },
  {
    hull: {
      geo: capsule(0.65, 2.2, ...cut.capsule(0.65)),
      at: [0.1, 1.15, 2.1],
      rot: [Math.PI / 2, 0, 0.06],
    },
    guide: { r: 0.1, facets: cut.orb, x: 0.75, y: 0.62, from: -4.1, pitch: 2.5, count: 5 },
    sides: [
      // `_0_2` steps 0.7 aft off its station, out from under the rule's
      // fifteen-sided hull in progress, which covered it to 1.6 m² of 6 from
      // above (hull-reviewer, the first round; kit.mjs `foundryBay` `shift`).
      { lip: 'port', guides: '0', sgn: 1, shift: { 2: [0, 0, -0.7] } },
      { lip: 'starboard', guides: '1', sgn: -1, only: [0, 1, 3, 4] },
    ],
  }
);
const crane = {
  steel,
  finial: black,
  trolley: black,
  cable: steel,
  load: steel,
  warnlight: crimson,
};
const ruled = {
  finials: { x: 3, y: 6.4, r: 0.12, h: 0.9, facets: cut.round },
  cable: { r: 0.05, facets: cut.round, hang: 0.2 },
  warnlight: { y: 6.08, r: 0.09, facets: cut.orb },
};
gantryCrane(root, crane, {
  n: 0,
  at: [0, 0, -2.6],
  trolley: { x: 0.230816541, y: 5.3, size: [0.8, 0.5, 0.7] },
  ...ruled,
});
gantryCrane(root, crane, {
  n: 1,
  at: [0, 0, 2.9],
  trolley: { x: -0.091257522, y: 5.3, size: [0.8, 0.5, 0.7] },
  load: { y: 3.6, size: [0.55, 0.4, 0.5] },
  ...ruled,
});

// The launch mouth and its glow drum, at the kit's defaults — the drum
// lying flat at the floor's level since #893, lit in `forge_light`, the
// forge line's own: the block's forge light "at its mouth" (the header) —
// and the mandibles.
launchMouth(root, { mouth: black, glow: forge }, {
  // The mouth's tube keeps the file's five (a section, Block 2c's pentagons); the ring is the rule's.
  mouth: { R: 1.7, tube: 0.3, facets: [5, cut.round], at: [0.1, 1.5, 6.7], scale: [1.15, 0.8, 1] },
  glow: { r: 1.35, h: 0.2, facets: cut.round, at: [0.1, 0.5, 6.0], rot: [0, 0, 0] },
});
directorate.launchMandibles(root, violet, {
  r: 0.18,
  length: 1.5,
  mandibles: [
    { n: 0, at: [2.2, 1.4, 7], rot: [0.5, 0, -0.6] },
    { n: 1, at: [-2, 1.4, 7], rot: [0.5, 0, 0.6] },
  ],
});

// Ten flank photophores, seven on the +x flank and three on the −x, each
// its own radius, none mirroring another — "the navy's own lamps on the
// halls and the mouth — ... photophores" of the block's resting clause
// since #893 (the header), lit as the approved file lights them. Nine of
// them the export drew inside the tergite shells — `_0` just under its
// plate's surface, the rest deep — so each of those keeps its station in
// plan and took its plate's surface height there, read off the built
// file from above at eight cells a metre with the dome itself left out,
// plus `LIFT`, the 0.07 a guide sat proud of its lip (#890). Those
// heights were read off the file's 9 × 6 plates; the rule's are 15 × 4
// and their facets lie elsewhere, so since #919 every lamp is seeded at
// that station and grown from whichever plate is nearest (`on`, kit.mjs
// `seat`): three had come to stand 0.05–0.25 m off their plates.
const LIFT = 0.07;
const PLATES = [0, 1, 2, 3].flatMap((i) => [`tergite_port_${i}`, `tergite_starboard_${i}`]);
const seeded = (at) => ({ ...drawn(at), on: PLATES });
directorate.photophoreDomes(root, crimson, {
  cut,
  domes: [
    ['flank_photophore_0', 0.0918777, seeded([2.6, 2.476 + LIFT, -3.2])],
    ['flank_photophore_1', 0.0865724, seeded([3.35, 2.943 + LIFT, -2.7])],
    ['flank_photophore_2', 0.0933471, seeded([4.1, 2.979 + LIFT, -2.2])],
    ['flank_photophore_3', 0.0834194, seeded([2.6, 2.887 + LIFT, 1.5])],
    ['flank_photophore_4', 0.0967476, seeded([3.35, 3.0 + LIFT, 2])],
    ['flank_photophore_5', 0.0894588, seeded([4.1, 2.775 + LIFT, 2.5])],
    ['flank_photophore_6', 0.0875567, seeded([4.85, 1.98 + LIFT, 3])],
    ['flank_photophore_7', 0.1091392, seeded([-2.6, 2.528785505, -0.8])],
    ['flank_photophore_8', 0.0965313, seeded([-3.35, 2.638 + LIFT, -0.3])],
    ['flank_photophore_9', 0.0934656, seeded([-4.1, 2.357 + LIFT, 0.2])],
  ],
});

// Two ballast tanks and two graft pipes with their flanges, at the kit's
// defaults — this file's numbers — cut by the navy's rule (#919).
ballastTanks(root, steel, { facets: cut.capsule });
flangedPipes(root, { pipe: steel, flange: red }, {
  pipe: { radii: [0.16, 0.2], facets: cut.round },
  flange: { R: 0.22, tube: 0.06, facets: [cut.round, cut.round] },
});

// Five anchor claws into the seabed, red and black by their number.
directorate.anchorClaws(root, [red, black], {
  claws: [
    {
      index: 0,
      length: 1.7622685,
      at: [4.454790388, 0.869960447, 4.781177111],
      rot: [0.683655621, -0.263985055, -0.714293697],
    },
    {
      index: 1,
      length: 1.9986032,
      at: [-2.557615327, 0.940400225, 6.34304708],
      rot: [0.920489993, 0.182425896, 0.364897118],
    },
    {
      index: 2,
      length: 2.31423,
      at: [-6.352075654, 0.990119417, -0.381142983],
      rot: [-0.046763786, -0.026926406, 1.044759354],
    },
    {
      index: 3,
      length: 1.8744135,
      at: [-1.54280291, 0.894004921, -6.707593958],
      rot: [-1.025406422, -0.124489538, 0.220540122],
    },
    {
      index: 4,
      length: 2.750463,
      at: [5.065655652, 1.052356677, -4.539651004],
      rot: [-0.606913758, 0.256780524, -0.782116969],
    },
  ],
});

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'foundry-directorate.glb');
