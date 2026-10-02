/**
 * The Nodule Refinery, Pelagia Commune — 280 m of footprint (2 × `radiusM`
 * 140, tools/hull-maps/models.mjs), SIG 65 sustained.
 *
 * "A rank of upright silos with conveyor and crusher machinery,
 * seabed-anchored (SIG 65 sustained — the loudest permanent thing a player
 * owns). Burning bright: floodlit working surfaces, visible machinery
 * light" (docs/asset-prompts-3d.md, STRUCTURE — Nodule Refinery). One
 * prompt block, four scripts; the per-navy difference is
 * docs/art-direction.md's.
 *
 * The Commune's is the rank grown: four silos of four sizes, each a drum
 * tapering to its cap, leaned a degree or so its own way, ringed two or
 * three times where it grew, veined with light two thirds of the way up and
 * — two of the four — budded pale on top; the crusher house under a half
 * drum of a roof with a lit maw on its face; two exhaust stacks with pale
 * tips; the conveyor gantry running down to the intake hopper, five nodules
 * riding its belt (one of them pale), algae rails, eight gantry lights and
 * three legs; the hopper with its lit mouth; two transfer pipes with algae
 * flanges; six root anchors; and two flood masts.
 *
 * A port of the approved export (docs/concept-art/models/refinery-
 * pelagia.glb at f7cce0f), part for part in its order, every number the
 * export's own, read off its nodes and its buffers (#652). The crusher, the
 * stacks, the gantry, the hopper, the transfer pipes and the flood masts
 * are the kit's Refinery vocabulary (kit.mjs `crusher`, `exhaustStacks`,
 * `conveyorGantry`, `intakeHopper`, `flangedPipes`, `floodMasts`) — this
 * file carries the Directorate's numbers for all of them but the roof over
 * the crusher and the nodules; the silos and the anchors are
 * `factions/pelagia.mjs`'s Bastion-and-works block. Nothing here is a shape
 * decision; where the export is odd the script is odd with it:
 *
 * - Each silo's rotation is a YXZ Euler of a small lean, its yaw and the
 *   same lean again — exactly, on all four — written in that order through
 *   `eulerXYZ` (`silos`). Its cap is 0.74 of its radius, its vein 0.92 of
 *   it over 0.65π at 0.55 of its height, its bud 0.62 of its radius above
 *   its top; its rings are each their own radius, tube and height.
 * - Silos 2 and 3 have no bud: there is no `silo_bud_2` or `_3` in the
 *   file, and none here. Silo 3 is chitin where the other three are algae.
 * - The crusher's cowl is a half drum, `crusher_roof`, 1.85 by 4.7 on six
 *   facets, laid on its side; the Directorate's is a shell of a sphere.
 * - The nodules are dodecahedra of five radii, tumbled every way, one of
 *   them (`nodule_2`) pale; their rotations are their nodes decomposed, to
 *   nine places.
 * - The gantry's two longer legs stand 0.025 and 0.05 off centred on their
 *   height; the exhaust tips sit 0.13 down-lean of their stacks; the flood
 *   lamps are offset from their heads in the export's frame rather than
 *   the heads'. All the Directorate file's numbers, which this file carries.
 * - Three of the six anchors and the third silo's vein the file writes in
 *   three's (±π, b, c − π) form of the XYZ Euler, written here as the plain
 *   (0, π − b, c) of the same matrix.
 * - The six materials are the navy's `ink`: the Bastion's five with
 *   `bio_light` at 2.6 (`biolight_green` until #891; `spore_pale` is
 *   `spore_pod` since then, the same value), and `floodlight_pale`, the
 *   spore token on a #3A3F1E base at 3.2587.
 * - `crusher_maw` (#894): the export stood the lit slab on the house's
 *   face, and it showed 0.63 m² past the roof's overhang — a dot on the
 *   chart for the block's "visible machinery light", and the third
 *   fixture under the one name across the three files. It is the drum
 *   cowls' one fixture kit.mjs `crusher` now describes (the Directorate's
 *   dome kept its apron until #907 cut its maw into it; the kit says
 *   why), the Order's construction
 *   turned to this roof: the same 1.7 × 1.3 × 0.3 slab, level along the
 *   ridge and flush with the roof's forward end over the face, its
 *   underside 0.27 under the ridge — the ridge stands at 5.25 and the two
 *   crown facets fall from it at 15°, so at the slab's edges (0.65 out)
 *   they are at 5.075 and the underside at 4.98 is 0.095 into them — and
 *   its top at 5.28, 0.03 proud, so the whole slab shows from above.
 *   `diff.mjs` lists `crusher_maw` and no other part.
 *
 * LIGHT PLACEMENT (#890, the light axis of #540). The light audit named
 * `silo_vein_1` and `silo_vein_3` as showing under a cell from above. The
 * file's vein is an upright arc through the silo's axis at 0.55 of its
 * height: all but its last few degrees run inside the drum, and the nub
 * that emerges sits under the next ring up — on silos 1 and 3 squarely,
 * on 0 and 2 a few square metres clear. The block's one band lights
 * "visible machinery light", and a vein on a silo is that, so all four
 * stay lit in `bio_light` and move onto an upward face together
 * (`silos` `vein.lay: 'flat'`): each a hoop round its own silo in the
 * band above its highest ring and under its cap, seated in the wall —
 * its ring at the wall's corner radius there (`hug` 1.0), so the 0.06 tube
 * straddles the drum's corners and flats alike — tilted 0.18 off level
 * with its arc rising and yawed the silo's own way as before. The wall is
 * sixteen-sided since the facet pass (below), its flats at 0.981 of the
 * corner radius, and the hoop itself is five segments over its 0.65π, a
 * fifteen-gon whose chords sag 0.022 of its radius between vertices: at
 * 1.0 the tube's core sits on the corners at its vertices and 0.003 R
 * inside the flats between them, half out all round. The 0.97 the hoop
 * carried on the nine-sided wall, whose flats lie at 0.94, put the core
 * 0.05 R inside the sixteen-gon's flats at mid-chord and buried the four
 * veins to 1.7–7 m² from above (16–26 before the pass); at 1.0 they show
 * 10–22 m² and meet their drums. Silos 0 and 2, whose rings stop at 0.57
 * of their height, carry it at 0.8, where the wall stands 0.036 R past the
 * cap's rim; silos 1 and 3, whose rings climb to 0.87, carry it at 0.9,
 * where the wall and the rim are within 0.01 R and the band shows past
 * the rim's flats. The first cut put every ring at 0.92 and 1.09 of the
 * wall, which left the tube 0.37 to 0.94 m off the drum touching nothing
 * (review, F1). Same names, tube and arc; the four move as one series.
 * Nothing here reaches the footprint.
 *
 * THE FRAME is the export's own: an X-long file, 22.7246 units long for a
 * 280 m footprint (hull-intake's `rawSize.x` on the approved file, which
 * did not yaw it), ground at y = 0; built here in that frame with no yaw —
 * every placement the file's own translation, rotation and scale through
 * the kit's `xLong` frame — and made metre-true at 280 m along X, centred
 * on its length, the ground kept at y = 0, by `metreTrue`. `DRAWN` is the
 * built file's length as intake measures it, three's `Box3` over the parts'
 * own boxes, so that both consumers' own rescale is exactly 1 and the maps
 * stay where the file put them — 22.8326 since the facet pass re-cut the
 * hopper and the anchors whose boxes set it, the export's 22.7246 before,
 * so every part stands 0.5 % smaller in metres than it did; the built file
 * is X-long, so intake does not yaw it.
 *
 * FACETS (#919). The Commune's rule is one facet edge of 1.5 m, five to
 * sixteen (docs/asset-prompts-3d.md Block 2c; pelagia.mjs `cut`), asked at
 * this file's scale for each part as its node presses it, and the pass
 * re-cut every round part: the four silos sixteen at 18–25 m of radius,
 * where the export had nine; their caps sixteen round and four rows over
 * their quarter turn at 13–18 m, where they had 9 × 5; their ten rings
 * sixteen on tubes of six to eight at 1.4–1.9 m, where they had 18 on 4;
 * the two buds sixteen by eight at 6.1 m, where they had 7 × 5; the four
 * veins five segments over their 0.65π, fifteen a turn, on a tube of five
 * at 0.74 m, where they had 14 on 4, and their `hug` 1.0 for the
 * sixteen-sided wall (LIGHT PLACEMENT, above); the crusher's roof eight
 * over its half turn at 22.7 m, where it had six; the stacks and their
 * tips sixteen at 4.2–4.7 m, where they had seven; the hopper and its
 * mouth sixteen at 18 and 13.5 m, where they had eight; the eight gantry
 * lights five round and three rows at 1.0–1.1 m, where they had 5 × 4; the
 * gantry legs nine at 2.2 m, where they had six; the transfer pipes nine
 * at 2.1 m and their flanges fifteen on a tube of five, where they had 7
 * and 10 on 5; the flood masts seven at 1.7 m, where they had six; and the
 * six root anchors capsules of sixteen round with eight-segment caps at
 * 5.4–7 m, where they had 6 on 3. `facets.mjs pelagia` names none of them.
 * 69 parts and 4,088 triangles become 69 and 6,828.
 *
 * PANELS (#919). The Commune's structure band is a median part from above
 * of 4–13.5 m on a side (Block 2c; pelagia.mjs `panels`), and this one read
 * 14.0 m over forty-five parts, the silos, caps, rings, anchors, belt and
 * roof 190–2,150 m² each. The pass rings and knots the works where they
 * grew: two half rings of chitin over the crusher's roof and an algae ring
 * round each stack above it (`drumRings`, which reads each drum off the
 * part), and two knots of chitin on the second and fourth silos' lowest
 * rings, 2.7–3.2 m of radius, seated on the ring half its radius in
 * (`grownNubs`). Two over the roof and not more: the maw takes its forward
 * end, the stacks' own rings reach half a unit either side of each stack,
 * and past 1.7 of its 2.35 half-length a ring's inboard foot stands on
 * `silo_2`'s wall. A first cut knotted the stacks' feet, and the stack
 * rings covered both knots from above; a second ringed each stack twice
 * and knotted all four silos, ten fittings where four parts in the band are
 * the least, and the knot on `silo_0`'s ring reached past the file's
 * westmost vertex and moved the chart's raster. They show 17–113 m² each,
 * and the median part is 12.7 m over fifty-one; the knots and rings stand
 * 49 m² proud of the silos' and the roof's plan, inside the raster's
 * bounds, which are main's. 69 parts and 6,828 triangles become 75 and
 * 7,552; no part moved, no lamp's plan changed, and the fit is the same
 * 22.8326 long.
 */
import {
  THREE,
  xLong,
  crusher,
  exhaustStacks,
  conveyorGantry,
  intakeHopper,
  flangedPipes,
  floodMasts,
  eulerXYZ,
  metreTrue,
  exportGlb,
} from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 280;
const DRAWN = 22.8326;
const DATUM = 0;
// The Commune's facet rule at this file's scale (pelagia.mjs `cut`, #919;
// kit.mjs `asked` for the kit's stacks, gantry, hopper and pipes): the
// builders are handed the export's units and the rule is a chord in metres.
const cut = pelagia.cut(L / DRAWN);

const algae = pelagia.ink.algaeHull();
const chitin = pelagia.ink.deepChlorophyll();
const spore = pelagia.ink.sporePod();
const bio = pelagia.ink.bioLight(2.6);
const steel = pelagia.ink.grownSteel();
const flood = pelagia.ink.floodlightPale(3.258717662091468);

const root = new THREE.Group();
root.name = 'nodule_refinery';

// "A rank of upright silos": four, each its own foot, radius, height, lean
// and yaw, its rings where they grew, a bud on the first two only, and a
// lit hoop of a vein just under each cap (#890; see the header).
pelagia.silos(
  root,
  { skin: algae, cap: algae, ring: chitin, bud: spore, vein: bio },
  {
    cut,
    vein: {
      lay: 'flat',
      hug: 1.0,
      tube: 0.06,
      arc: Math.PI * 0.65,
      at: 0.9,
      tilt: 0.18,
    },
    silos: [
      {
        n: 0,
        at: [-5.6, -2.6],
        R: 1.75,
        h: 8.6,
        lean: -0.0274654750433,
        yaw: 1.20024851585,
        rings: [
          { y: 2.56363214184, R: 1.683932573, tube: 0.146486491 },
          { y: 4.79132507031, R: 1.557005852, tube: 0.1200238764 },
        ],
        bud: true,
        vein: { yaw: -0.0552587636465, at: 0.8 },
      },
      {
        n: 1,
        at: [-1.9, -1.2],
        R: 2,
        h: 10.4,
        lean: 0.0245953418897,
        yaw: 1.78734115183,
        rings: [
          { y: 2.71727233805, R: 1.933685295, tube: 0.119979389 },
          { y: 6.28318456143, R: 1.741674706, tube: 0.1533405334 },
          { y: 8.74072221032, R: 1.609345749, tube: 0.1559746712 },
        ],
        bud: true,
        vein: { yaw: -1.45421398587, at: 0.9 },
      },
      {
        n: 2,
        at: [1.9, 0.2],
        R: 1.6,
        h: 7.6,
        lean: 0.0172770040203,
        yaw: 2.68998325866,
        rings: [
          { y: 2.06128180915, R: 1.55849281, tube: 0.1585938632 },
          { y: 4.21222719012, R: 1.431700289, tube: 0.1266850829 },
        ],
        vein: { yaw: 3.43184193495, at: 0.8 },
      },
      {
        n: 3,
        at: [-4, 1.9],
        R: 1.45,
        h: 6.2,
        lean: -0.0224110360816,
        yaw: 2.33451456798,
        skin: chitin,
        rings: [
          { y: 1.95306810646, R: 1.402105503, tube: 0.1126045659 },
          { y: 3.72972657205, R: 1.285763025, tube: 0.148888588 },
          { y: 5.24991696079, R: 1.186215073, tube: 0.1522943676 },
        ],
        vein: { yaw: -0.426394027628, at: 0.9 },
      },
    ],
  }
);

// The crusher at the kit's defaults — the maw's are this file's, the slab
// set into the roof's ridge at its forward end since #894 (the header) —
// but its roof, a half drum laid on its side on the rule's share of a half
// turn (#919; the file's was six); and the two stacks, at the kit's radii
// on the rule's counts.
crusher(
  root,
  { house: steel, cowl: chitin, maw: flood },
  {
    cowl: {
      name: 'crusher_roof',
      geo: new THREE.CylinderGeometry(
        1.85,
        1.85,
        4.7,
        cut.round(1.85, Math.PI),
        1,
        false,
        0,
        Math.PI
      ),
      at: [5.2, 3.4, -2.2],
      rot: [0, -0.25, Math.PI / 2],
    },
  }
);
exhaustStacks(
  root,
  { steel, glow: flood },
  {
    stack: { radii: [0.3, 0.38], h: 3.2, facets: cut.round },
    tip: { radii: [0.34, 0.3], h: 0.25, facets: cut.round },
  }
);

// PANELS (#919): the crusher's roof and stacks ringed and knotted where they
// grew. Two half rings of chitin over the roof's half drum, cresting half a
// tube beyond it (pelagia.mjs `drumRings`, which reads the drum off the
// part), at the two stations the roof leaves: the maw takes its forward
// end, the two stacks pierce it a third and two thirds of the way along
// and their own rings reach a half unit either side of each, and past 1.7
// of its 2.35 half-length a ring's inboard foot stands on `silo_2`'s wall.
// An algae ring round each stack above where it leaves the roof — the
// Foundry's graft pipes carry algae flanges the same way — fat enough to
// show past the tip from the chart's height. And two knots of chitin on
// the second and fourth silos' lowest rings, each at a bearing of its own,
// seated on the ring half its radius in (`grownNubs`) — the rings knotted
// where they grew, as the Bastion's are — on the sides the transfer pipes,
// the crusher house and the root anchors leave clear. Six fittings where
// four parts in the band are the least, since more would spend gate 6 (the
// header).
pelagia.drumRings(root, chitin, {
  name: 'roof_ring',
  on: 'crusher_roof',
  cut,
  stations: [
    { s: 0.35, tube: 0.1 },
    { s: 1.62, tube: 0.1 },
  ],
});
pelagia.drumRings(root, algae, {
  name: 'stack_ring_0',
  on: 'exhaust_stack_0',
  cut,
  stations: [{ s: 1.05, tube: 0.1 }],
});
pelagia.drumRings(root, algae, {
  name: 'stack_ring_1',
  on: 'exhaust_stack_1',
  cut,
  stations: [{ s: 0.7, tube: 0.1 }],
});
// A seed a tenth outside the silo's lowest ring at `deg` round its axis from
// +x toward +z; the silos' stations, radii and ring heights are `silos`'
// above. A first cut knotted all four silos and ringed each stack twice.
const onRing = ([x, z], R, y, deg) => {
  const a = (deg * Math.PI) / 180;
  return [x + 1.1 * R * Math.cos(a), y, z + 1.1 * R * Math.sin(a)];
};
pelagia.grownNubs(root, chitin, {
  name: 'ring_knot',
  on: ['silo_ring_1_0', 'silo_ring_3_0'],
  cut,
  nubs: [
    [0.26, onRing([-1.9, -1.2], 1.933685295, 2.71727233805, -90)],
    [0.22, onRing([-4, 1.9], 1.402105503, 1.95306810646, 60)],
  ],
});

// The conveyor gantry, at the kit's defaults, with this file's five
// nodules: dodecahedra of five radii, tumbled every way, one of them pale;
// the lights and the legs at the kit's numbers on the rule's counts (#919;
// the kit takes a leg's count as a number).
conveyorGantry(
  root,
  { bed: steel, belt: chitin, rail: algae, light: flood, leg: steel },
  {
    lights: { r: 0.09, facets: cut.orb, y: 0.72, xs: [-3.25, -0.95, 1.35, 3.65] },
    legs: {
      radii: [0.14, 0.18],
      facets: cut.round(0.18),
      stem: 'gantry_leg',
      legs: [
        { n: '0', x: -3.15, y: -1.1, h: 2.2 },
        { n: '1', x: -0.05, y: -1.65, h: 3.35 },
        { n: '2', x: 3.05, y: -2.2, h: 4.5 },
      ],
    },
    nodules: [
      {
        name: 'nodule_0',
        r: 0.3584019,
        skin: chitin,
        at: [-3.498671344, 0.45, -0.079928465],
        rot: [0.034157933, 0.923907476, 0.880345213],
      },
      {
        name: 'nodule_1',
        r: 0.3775609,
        skin: chitin,
        at: [-1.455893165, 0.45, 0.027824285],
        rot: [-1.845422219, 1.408660255, -3.110364124],
      },
      {
        name: 'nodule_2',
        r: 0.3101697,
        skin: spore,
        at: [0.631565482, 0.45, 0.106131834],
        rot: [1.557829822, 1.476647581, 2.233767736],
      },
      {
        name: 'nodule_3',
        r: 0.3088876,
        skin: chitin,
        at: [2.401232832, 0.45, 0.12894235],
        rot: [0.611409421, 1.366653169, 2.015190001],
      },
      {
        name: 'nodule_4',
        r: 0.3193367,
        skin: chitin,
        at: [4.099271046, 0.45, 0.129571498],
        rot: [2.992183064, 0.505563898, 2.436400929],
      },
    ],
  }
);

// The intake hopper at the kit's defaults, on the rule's counts.
intakeHopper(
  root,
  { hopper: chitin, mouth: flood },
  {
    hopper: { radii: [1.5, 0.9], h: 1.3, facets: cut.round, at: [13.4, 0.65, 6.9] },
    mouth: { r: 1.1, h: 0.18, facets: cut.round, at: [13.4, 1.35, 6.9] },
  }
);

// Two transfer pipes from the silos to the crusher, each yawed to its run
// and tipped over — YXZ, as the file has them — with its flange on the
// pipe's own station, pitched 0.35 under the same yaw.
flangedPipes(
  root,
  { pipe: steel, flange: algae },
  {
    frame: xLong,
    stems: { pipe: 'transfer_pipe', flange: 'transfer_flange' },
    pipe: { radii: [0.17, 0.17], facets: cut.round },
    flange: { R: 0.24, tube: 0.06, facets: [cut.round, cut.round] },
    pipes: [
      {
        n: '0',
        length: 4.970076,
        at: [1.65, 5.4, -1.7],
        rot: eulerXYZ([0, 1.710720997, Math.PI / 2 - 0.14], 'YXZ'),
        flange: { rot: eulerXYZ([0.35, 1.710720997, 0], 'YXZ') },
      },
      {
        n: '1',
        length: 8.607404,
        at: [-0.2, 4.2, -2.4],
        rot: eulerXYZ([0, 1.533776211, Math.PI / 2 - 0.04], 'YXZ'),
        flange: { rot: eulerXYZ([0.35, 1.533776211, 0], 'YXZ') },
      },
    ],
  }
);

// Six root anchors into the seabed, no two alike, algae and chitin by
// turns, laid 0.15 short of flat and yawed each its own way.
pelagia.rootButtresses(root, [algae, chitin], {
  name: 'root_anchor',
  cut,
  frame: xLong,
  roll: Math.PI / 2 - 0.15,
  grips: [
    {
      r: 0.5227002501,
      length: 2.486460209,
      at: [3.684683365, 0.3, 1.0608036163],
      yaw: 1.26263416062,
    },
    {
      r: 0.4606243372,
      length: 1.887086749,
      at: [-0.446194432954, 0.3, 4.34997043289],
      yaw: 0.21670871112,
    },
    {
      r: 0.5726485252,
      length: 1.970771432,
      at: [-5.72165464675, 0.3, 2.71740228322],
      yaw: -0.870282079517,
    },
    {
      r: 0.5280192494,
      length: 2.169366598,
      at: [-6.74523713821, 0.3, -2.16735976785],
      yaw: -1.90722416739,
    },
    {
      r: 0.4424859881,
      length: 2.584592342,
      at: [-1.95888716979, 0.3, -5.66464451678],
      yaw: -3.0771780988,
    },
    {
      r: 0.4521121085,
      length: 2.987094164,
      at: [3.49758136527, 0.3, -2.86326916394],
      yaw: 2.03333987182,
    },
  ],
});

// "Floodlit working surfaces": two flood masts at the kit's defaults, the
// mast on the rule's count (the kit takes it as a number).
floodMasts(root, { steel, lamp: flood }, { mast: { radii: [0.1, 0.14], facets: cut.round(0.14) } });

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'refinery-pelagia.glb');
