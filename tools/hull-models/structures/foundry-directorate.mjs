/**
 * The Foundry, Abyssal Directorate — 320 m of footprint (2 × `radiusM` 160,
 * tools/hull-maps/models.mjs), SIG 25 idle, 55 with the line running.
 *
 * "Unit production hall with a recessed launch bay and gantry cranes (SIG
 * 25 idle, 55 with the line running). Dim at rest; interior forge light
 * spilling from the bay when producing" (docs/asset-prompts-3d.md,
 * STRUCTURE — Foundry). One prompt block, four scripts; the per-navy
 * difference is docs/art-direction.md's.
 *
 * The Directorate's is a carapace laid down either side of the bay: four
 * tergites a flank, each with its steel seam and — all but the bow plate —
 * a black spine raked the one way; two outrigger pods off the corners and
 * a spike off the big one; a stern carapace with its seam ring and spike
 * closing the blind end; the bay itself — floor, forge line, the hull in
 * progress, a lip either side with its rank of crimson guides — and two
 * gantry cranes over it; the launch mouth with the forge glow lying in it
 * and a mandible either side; ten flank photophores, seven on one flank and
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
 * Nothing here is a shape decision but #890's light placement, the last
 * bullet; where the export is odd the script is odd with it:
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
 * - The −x lip carries four guides, `bay_guide_1_0`, `_1`, `_3`, `_4`: there
 *   is no `bay_guide_1_2` in the file, and there is none here.
 * - The bow plate on each flank has no spine: three `spine_spike` a flank
 *   over four tergites. All six spines rake along (±0.35, 1, 0.1) and each
 *   stands where the file put it, its node transcribed to nine places.
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
 * - The seven materials are the navy's `ink`: `chitin_red`, `chitin_violet`,
 *   `trench_black`, `weld_steel`, `biolight_crimson` at this file's 2.277,
 *   `forge_light` at its 3.698 on the forge line, and since #890
 *   `biolight_unlit`, the navy's rule-2 finish (asset-prompts-3d.md Block
 *   2b), on the launch glow (below). The export carried the turret's
 *   `weld_steel` (#27313B) and a `biolight_crimson` on a #3A0D16 base, the
 *   settlement pass's own values under the hulls' names; #888 brought both
 *   onto the navy's (#3A3F4A and #1A0810). No value moved with #890: a
 *   clad part takes a name the navy already carries.
 * - #890, light placement. The light audit named fourteen lamps hidden
 *   from above on the approved binary. The block's lighting clause is
 *   "Dim at rest; interior forge light spilling from the bay when
 *   producing": "dim at rest" names no lamp, so the block licenses no
 *   resting lamp here, and the review settled one reading for all four
 *   Foundries — the bay guides and the forge line are carried lit as every
 *   approved Foundry lights them (docs/models-plan.md §3.2, the
 *   one-glow-factor paragraph after the rules), the launch glow is clad,
 *   and the block naming its resting lamps is follow-up #893. Under that:
 *   · `bay_guide_0_0`, `_0_1`, `_0_3`, `_0_4` and `_1_1`, on the lips' tops
 *     under the tergites' rims and the crane beams, stay lit and the whole
 *     rank moves, both lips, to either side of the forge line at x ±0.75 —
 *     the one column the plates, the hull in progress and the Commune's
 *     lobes all leave clear; the floor's own edges at ±1.7 are under the
 *     plates. The port rank overlaps the forge line's edge by 0.9 m, the
 *     line running 0.15 off centre; the starboard rank clears it. And to
 *     z −4.1 at the same 2.5 pitch, off the beams (rule 5). The kit's
 *     `foundryBay` default, so the Commune's file moves with this one.
 *   · `launch_glow`, the drum under the mouth's ring, is the forge light
 *     "spilling from the bay when producing": named in that band and
 *     nowhere at rest, so it is built and clad, never lit (rule 2), in
 *     `biolight_unlit`, the navy's rule-2 finish (asset-prompts-3d.md
 *     Block 2b). The navy records no unlit finish for the forge family, so
 *     the drum wears the photophore family's — a #891 question. The
 *     `forge_line` inside the bay is not hidden and is not touched.
 *   · `flank_photophore_1` to `_6`, `_8` and `_9` the export drew inside
 *     the tergite shells they lie on — up to 1.2 under a plate's surface,
 *     so no view ever saw them, not only the top-down one — and `_0`, not
 *     among the fourteen, sat 0.06 under its plate and showed 3.5 m² of a
 *     dome its siblings show 6 to 8 of. Each keeps its station in plan
 *     and rises to its plate's own surface height there, plus the lift a
 *     guide sat proud of its lip (rule 5). `_7` breaks its plate's surface
 *     on its own and stays.
 *   `diff.mjs` lists nineteen parts and no other: all nine guides, since
 *   the rank moves as one, the launch glow's material, and the nine
 *   photophores.
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
 */
import {
  THREE,
  foundryBay,
  gantryCrane,
  launchMouth,
  ballastTanks,
  flangedPipes,
  drawn,
  metreTrue,
  exportGlb,
} from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 320;
const DRAWN = 17.518382244244393;
const DATUM = 0;

const red = directorate.ink.chitinRed();
const steel = directorate.ink.weldSteel();
const black = directorate.ink.trenchBlack();
const violet = directorate.ink.chitinViolet();
const forge = directorate.ink.forgeLight(3.697972238428193);
const crimson = directorate.ink.biolightCrimson(2.276723666358973);
const unlit = directorate.ink.biolightUnlit();

const root = new THREE.Group();
root.name = 'foundry_directorate';

// The spines' one rake, as the minimal rotation from +Y: (0.35, 1, 0.1) on
// the +x flank, (−0.35, 1, 0.1) on the −x, the file's node decomposed.
const RAKE_P = [0.094119023, -0.015933738, -0.335170772];
const RAKE_S = [0.094119023, 0.015933738, 0.335170772];

// The tergite flanks: the +x rank first, as the file writes it — named port
// here (see the header) — then the −x rank.
directorate.tergiteFlanks(
  root,
  { violet, red, black, steel },
  {
    flanks: [
      {
        name: 'port',
        n: '0',
        plates: [
          {
            at: [3.4, 0.15, -4.5],
            rot: [-0.004298972, 0.12, -0.12],
            scale: [2.52, 2.7, 2.9],
            spike: { at: [3.43499122, 3.155403486, -2.837859651], rot: RAKE_P, length: 1.7862519 },
          },
          {
            at: [3.3, 0.15, -1.4],
            rot: [0.016585802, 0.17, -0.12],
            scale: [2.52, 3.1, 3.3],
            spike: { at: [3.320243272, 3.481266491, 0.477926649], rot: RAKE_P, length: 1.6741475 },
          },
          {
            at: [3.18, 0.15, 1.8],
            rot: [-0.03502016, 0.22, -0.12],
            scale: [2.52, 2.9, 3],
            spike: { at: [3.137728502, 3.118652864, 3.495065286], rot: RAKE_P, length: 1.1989505 },
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
            spike: { at: [-3.471891574, 2.66426164, -2.470173836], rot: RAKE_S, length: 1.4586362 },
          },
          {
            at: [-3.34, 0.15, -1],
            rot: [-0.033392322, -0.17, 0.12],
            scale: [2.112, 2.6, 2.9],
            spike: { at: [-3.341732114, 2.968377468, 0.652637747], rot: RAKE_S, length: 1.5334376 },
          },
          {
            at: [-3.25, 0.15, 1.9],
            rot: [-0.009265448, -0.22, 0.12],
            scale: [2.112, 2.4, 2.6],
            spike: { at: [-3.221987448, 2.699392707, 3.379139271], rot: RAKE_S, length: 1.3073378 },
          },
          { at: [-3.4, 0.15, 4.3], rot: [-0.036309463, -0.27, 0.12], scale: [2.112, 1.8, 2] },
        ],
      },
    ],
  }
);

// The outrigger pods off the corners and the stern carapace at the blind end.
directorate.outriggerPods(
  root,
  { violet, black, red },
  {
    big: { r: 1.8, facets: [8, 5], at: [6.5, 0.7, -2], rot: [0, 0.5, 0], scale: [1.25, 0.7, 0.95] },
    spike: { r: 0.18, length: 1.6, at: [7.6, 1.4, -2.6], rot: [0, 0, -0.7] },
    small: {
      r: 1.2,
      facets: [7, 5],
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
    carapace: { r: 3, facets: [9, 6], at: [0.7, 1, -7.2], scale: [1.15, 0.72, 0.9] },
    seam: {
      R: 2.2,
      tube: 0.09,
      facets: [4, 16],
      at: [0.7, 1.95, -7.2],
      rot: [Math.PI / 2, 0, 0],
      scale: [1.15, 0.9, 1],
    },
    spike: { r: 0.2, length: 2, at: [1.4, 2.6, -8.6], rot: [-0.6, 0, 0] },
  }
);

// The bay, at the kit's defaults — this file's numbers, the guides either
// side of the forge line since #890 — with the −x lip one guide short; and
// the two cranes over it.
foundryBay(
  root,
  { floor: black, forge, hull: violet, guide: crimson },
  {
    sides: [
      { lip: 'port', guides: '0', sgn: 1 },
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
gantryCrane(root, crane, {
  n: 0,
  at: [0, 0, -2.6],
  trolley: { x: 0.230816541, y: 5.3, size: [0.8, 0.5, 0.7] },
});
gantryCrane(root, crane, {
  n: 1,
  at: [0, 0, 2.9],
  trolley: { x: -0.091257522, y: 5.3, size: [0.8, 0.5, 0.7] },
  load: { y: 3.6, size: [0.55, 0.4, 0.5] },
});

// The launch mouth and its glow drum, at the kit's defaults, the drum clad
// in `biolight_unlit`, the navy's rule-2 finish — the block lights the
// glow only "when producing" and nowhere at rest (the header;
// docs/models-plan.md §3.2 rule 2) — and the mandibles.
launchMouth(root, { mouth: black, glow: unlit });
directorate.launchMandibles(root, violet, {
  r: 0.18,
  length: 1.5,
  mandibles: [
    { n: 0, at: [2.2, 1.4, 7], rot: [0.5, 0, -0.6] },
    { n: 1, at: [-2, 1.4, 7], rot: [0.5, 0, 0.6] },
  ],
});

// Ten flank photophores, seven on the +x flank and three on the −x, each
// its own radius, none mirroring another, carried lit as the approved file
// lights them (the header). Nine of them the export drew inside the
// tergite shells — `_0` just under its plate's surface, the rest deep — so
// each of those keeps its station in plan and takes its plate's surface
// height there, read off the built file from above at eight cells a metre
// with the dome itself left out, plus `LIFT`, the 0.07 a guide sat proud
// of its lip (#890).
const LIFT = 0.07;
directorate.photophoreDomes(root, crimson, {
  facets: [5, 4],
  domes: [
    ['flank_photophore_0', 0.0918777, drawn([2.6, 2.476 + LIFT, -3.2])],
    ['flank_photophore_1', 0.0865724, drawn([3.35, 2.943 + LIFT, -2.7])],
    ['flank_photophore_2', 0.0933471, drawn([4.1, 2.979 + LIFT, -2.2])],
    ['flank_photophore_3', 0.0834194, drawn([2.6, 2.887 + LIFT, 1.5])],
    ['flank_photophore_4', 0.0967476, drawn([3.35, 3.0 + LIFT, 2])],
    ['flank_photophore_5', 0.0894588, drawn([4.1, 2.775 + LIFT, 2.5])],
    ['flank_photophore_6', 0.0875567, drawn([4.85, 1.98 + LIFT, 3])],
    ['flank_photophore_7', 0.1091392, drawn([-2.6, 2.528785505, -0.8])],
    ['flank_photophore_8', 0.0965313, drawn([-3.35, 2.638 + LIFT, -0.3])],
    ['flank_photophore_9', 0.0934656, drawn([-4.1, 2.357 + LIFT, 0.2])],
  ],
});

// Two ballast tanks and two graft pipes with their flanges, at the kit's
// defaults — this file's numbers.
ballastTanks(root, steel);
flangedPipes(root, { pipe: steel, flange: red });

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
