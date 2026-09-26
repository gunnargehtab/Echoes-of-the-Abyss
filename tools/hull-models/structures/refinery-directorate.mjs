/**
 * The Nodule Refinery, Abyssal Directorate — 280 m of footprint (2 ×
 * `radiusM` 140, tools/hull-maps/models.mjs), SIG 65 sustained.
 *
 * "A rank of upright silos with conveyor and crusher machinery,
 * seabed-anchored (SIG 65 sustained — the loudest permanent thing a player
 * owns). Burning bright: floodlit working surfaces, visible machinery
 * light" (docs/asset-prompts-3d.md, STRUCTURE — Nodule Refinery), grown in
 * the navy's grammar: "spiked, insectoid, segmented crustacean forms —
 * asymmetric, yet regimented" (Block 2, the Directorate).
 *
 * REBUILT, NOT PORTED (#947). This file was a port of the approved export
 * (#652), fixed an audit line at a time by #890, #894 and #907. Lit on a
 * table (tools/hull-renders/inspect.mjs), the whole still failed the
 * checklist's first question — with the lights off it was the Commune's
 * Refinery in red: a grey steel box with half a dome sunk in its corner, a
 * plank belt that met the house's wall under the maw it was meant to feed
 * and crossed the hopper's lit mouth at its foot, eight-sided silos on a
 * navy whose lattice is odd, and nothing tying the parts together across
 * the footprint. So it is one animal now, lying on the seabed tail to head
 * along X (factions/directorate.mjs, "The Nodule Refinery as one animal"):
 *
 * - The body: five tergites, violet and red by turns from the tail, each a
 *   dome with a black ridge standing proud at its aft edge, so the chart
 *   reads five plates and not one mound; a telson of three blades fanned
 *   flat on the seabed off the tail; and an anchor leg a side off every
 *   plate, knee up and claw on the seabed — the port legs shorter and set
 *   aft, never a mirror, and none to starboard off the last plate, where
 *   the gallery passes.
 * - The silo rank: one silo stood up off each plate's crown — the same
 *   spacing, heights 80 to 132 m and never two alike — each three to five
 *   lathed shells whose foot lips overhang the shoulder under them, turned
 *   half a facet a segment, a black five-sided crown and a crimson tip.
 *   One colour a silo, the opposite of its plate's, so the alternation runs
 *   along the rank instead of striping up each tower.
 * - The head: the crusher, a red carapace dome whose maw is cut into its
 *   front shoulder, facing the hopper and the conn view's home camera —
 *   three of the dome's rings by two of its quads, forward of the neck
 *   ridge so the belt clears it; the lit floor on `gullet_glow` a fifth of
 *   the dome's radius in, the throat in the dome's chitin, five fangs hung
 *   from the upper lip over the belt that runs in across the lower one —
 *   between two black mandibles that reach out along the mouth's axis and
 *   hook in toward it without crossing it, port the larger. The rostrum
 *   runs on from the brow, three stacks with hot throats stand on the
 *   head's back, and two clusters of points, three and two, are its eyes,
 *   on the crown above the mouth.
 * - The feed: the hopper raised on three legs with its mouth sunk inside
 *   the rim (`intakeMaw`, #907's), a chute from its foot onto the belt, and
 *   the gallery climbing from under it straight into the maw — a black
 *   arched rib every 15 m, crimson points on alternate crowns, five
 *   nodules riding between the ribs, three lures hung over the belt, and
 *   a pair of jointed legs at every other rib where the bed stands high
 *   enough to want them.
 * - The light: the two mouths are the one area glow (docs/style-neon-
 *   noir.md, "a maw is not livery": both apertures, both on the throat
 *   token, the belt feeding the second from the first). "Floodlit working
 *   surfaces" are three lures — hot lamps on black stalks off the
 *   gallery's rails, hanging over the belt's axis — and the stack throats
 *   are the machinery light.
 *   Livery is points: an eye-line of one bud a segment up every silo, the
 *   ridge lights and the gallery's crowns.
 *
 * The two mouths keep their names (`crusher_maw`, `intake_mouth`), and the
 * seven materials are the navy's `ink` at this file's strengths, so the
 * glow curve and finishes.mjs read the file as before. `exportGlb` prints
 * the audit; no lamp is hidden or floating.
 *
 * THE FRAME: X-long, metres, ground at y 0 and nothing under it — the
 * runtime centres a structure on its box (rosterModels.ts `normalise`), so
 * a part below the seabed would lift the rest. `DRAWN` is the length the
 * parts span as intake measures it, three's `Box3` over the parts' own
 * boxes; `metreTrue` scales that to 280 so both consumers' rescale is 1.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const L = 280;
const DRAWN = 280.0713;

const red = directorate.ink.chitinRed();
const steel = directorate.ink.weldSteel();
const violet = directorate.ink.chitinViolet();
const black = directorate.ink.trenchBlack();
const crimson = directorate.ink.biolightCrimson(2.6);
const flood = directorate.ink.floodlightHot(3.475863563109638);
const gullet = directorate.ink.gulletGlow();

const root = new THREE.Group();
root.name = 'nodule_refinery_directorate';

// The body's axis, and its five plates, tail first.
const Z = -26;
const PLATES = [
  { x: -104, s: [23, 17, 32] },
  { x: -68, s: [25, 20, 36] },
  { x: -31, s: [26, 22, 39] },
  { x: 6, s: [26, 22, 39] },
  { x: 42, s: [24, 20, 35] },
];
directorate.refineryBody(root, { violet, red, black }, { z: Z, plates: PLATES });
directorate.telsonBlades(root, [violet, black], {
  at: [-118, Z],
  blades: [
    [-0.5, 18, 0],
    [0.08, 24, 1],
    [0.55, 16, 0],
  ],
});

// The head, and the maw on the shoulder that faces the hopper.
const head = directorate.refineryHead(
  root,
  { red, black, gullet, light: crimson },
  {
    at: [92, 0, Z],
    scale: [36, 38, 42],
    hole: { rings: [1, 4], quads: [2, 4] },
    recess: 0.2,
    teeth: { count: 5, r: 1.9, length: 7, lean: 0.3, lip: 'upper' },
    mandibles: [
      { name: 'mandible_p', side: 0, k: 1.15 },
      { name: 'mandible_s', side: 1, k: 0.9 },
    ],
    rostrum: { from: [1.1, Math.PI, 0.92], tip: [138, 16, Z + 3], r: 6 },
    eyes: [
      ['eye_0', 1.3, 0.1, 0.95],
      ['eye_1', 1.1, 0.14, 1.07],
      ['eye_2', 0.9, 0.18, 1.17],
      ['eye_3', 1.2, 0.12, 1.5],
      ['eye_4', 0.9, 0.17, 1.6],
    ],
  }
);
directorate.refineryStacks(root, { steel, glow: flood }, {
  stacks: [
    [72, -50, 70, 3.6],
    [82, -60, 84, 4.2],
    [95, -56, 62, 3.2],
  ],
});

// The silo rank, one off each plate.
directorate.siloRank(root, { red, violet, black, light: crimson }, {
  z: Z,
  plates: PLATES,
  silos: [
    { plate: 0, r: 10.5, height: 80, segments: 3 },
    { plate: 1, r: 12, height: 104, segments: 4 },
    { plate: 2, r: 13.5, height: 120, segments: 4 },
    { plate: 3, r: 14, height: 132, segments: 5 },
    { plate: 4, r: 12, height: 96, segments: 3 },
  ],
});

// The hopper, raised over the gallery's tail, and the gallery into the maw.
const HOPPER = [-22, 84];
directorate.refineryHopper(root, { violet, gullet, black, steel }, {
  at: HOPPER,
  top: 23,
  bottom: 10,
  radii: [15, 7],
  mouth: { r: 11.5, recess: 2.6, thick: 0.6 },
  teeth: { r: 1.4, length: 7, radius: 13.4, lift: 2, phase: 0.3, lean: -0.45 },
  legs: [0.9, 3, 4.9],
  chute: [4, 3.7],
});
const into = head.lip.clone().lerp(head.floor, 0.35);
const toward = into.clone().setY(0).sub(new THREE.Vector3(HOPPER[0], 0, HOPPER[1])).normalize();
directorate.feedGallery(
  root,
  { steel, black, red, light: crimson, lamp: flood, skins: [violet, red] },
  {
    from: new THREE.Vector3(HOPPER[0], 3.2, HOPPER[1]).addScaledVector(toward, -9).toArray(),
    to: into.toArray(),
    ribs: { first: 26, pitch: 15, last: 10, tube: 0.75 },
    legs: { every: 2, minHip: 7, reach: [8, 17], rise: 7 },
    nodules: [
      [0, 3.1, 0],
      [1, 3.5, 1],
      [3, 2.8, 0],
      [4, 3.3, 0],
      [6, 3, 1],
    ],
    lures: [
      { gap: 1, side: 'p', h: 20, r: 3 },
      { gap: 3, side: 's', h: 17, r: 2.6 },
      { gap: 5, side: 'p', h: 22, r: 2.8 },
    ],
    clear: [...HOPPER, 17],
  }
);

// Seabed-anchored: a leg a side off every plate, port shorter and aft —
// but none to starboard off the last plate, where the gallery climbs past
// its flank on legs of its own.
directorate.anchorLegs(root, black, {
  z: Z,
  plates: PLATES,
  legs: PLATES.flatMap((_, plate) => [
    ...(plate < 4 ? [{ plate, side: 's', dx: 7, k: 1 }] : []),
    { plate, side: 'p', dx: -5, k: 0.86 },
  ]),
});

// Livery: rows of points along the ridges.
directorate.ridgeLights(root, crimson, {
  z: Z,
  plates: PLATES,
  lights: [
    [0, 8],
    [0, 18],
    [1, 4],
    [1, 14],
    [1, 26],
    [2, -6],
    [2, 10],
    [3, 14],
    [3, 28],
    [4, 2],
    [4, 18],
  ],
});

metreTrue(root, L, { drawn: DRAWN, datum: 0 });
await exportGlb(root, 'refinery-directorate.glb');
