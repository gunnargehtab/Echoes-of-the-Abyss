/**
 * The Bastion, Hadron Knights — 440 m of footprint (2 × `radiusM` 220,
 * packages/shared/src/structures.ts), SIG 35 sustained.
 *
 * "The HQ — a large pressure dome with visible reinforcement ribs, docking
 * collars and external pipework, anchored to the seabed (SIG 35 sustained,
 * the settlement's constant hum). Sustained glow from ports and working
 * lights; the one building that can never run silent"
 * (docs/asset-prompts-3d.md, STRUCTURE — Bastion). The Order's answer is a
 * pressure dome under an apex lantern with `_r`/`_l` everything, and it
 * shares nothing with the other three navies' Bastions, so every builder is
 * `factions/hadron.mjs`'s own.
 *
 * A port of the approved export (docs/concept-art/models/bastion-hadron.glb
 * at f7cce0f), part for part in its order, every number the export's own
 * (#652, off #540 Phase 3). Fifty-eight parts, 3,788 triangles: a sphere of
 * a dome drawn 0.52π down from its pole and pressed to 0.92, a crystal
 * lantern and a lit finial on the pole in four prongs, four mirrored pairs
 * of ribs that are 0.52π of a four-sided ring stood on end and yawed round
 * the dome, an equator band and a plinth band that are full rings, an
 * eight-facet plinth turned an eighth, twelve port lights on one six-by-five
 * orb (the export's counts, here and through this paragraph; FACETS, at the
 * foot, gives the pass's), two docks each a frame of its own — throat, lip, lit mouth, two fins
 * — four five-sided conduits that are 0.9 rad of a ring (re-laid on the
 * dome's facets since: CONDUITS, at the foot), two standpipes with
 * flanges, two capsules of ballast tank, and four mirrored pairs of anchor
 * blades stood off one circle.
 *
 * THE FRAME: an X-long r184 export, 20.90 by 19.34 in plan by the measure
 * the bake takes (intake `rawSize`; three's `Box3.setFromObject`, each
 * part's box through its node — the yawed plinth's overhangs its vertices,
 * and so do the leaned blades'), so nothing goes through `drawn`: every
 * part is placed at the file's own translation, XYZ Euler and scale, and
 * `fitFootprint` holds that 20.90 at 440 m on the root, which is what makes
 * intake report ×1.000, no Z→X rotation, and bake the maps where the
 * approved export's were. The ground is at y = 0, the plinth's foot, as the
 * file has it. `DRAWN` is asserted after the fit, the way `metreTrue`
 * asserts its length, so a mistyped station fails here.
 *
 * One thing about this file's bake is worth knowing before its maps are
 * read. Intake measures the approved export at 20.900000047683715 raw and
 * scales it ×21.052631530915423, and that product lands one ulp over 440
 * (440.00000000000006), which `Math.ceil(size × ppm)` turns into a pixel:
 * the approved intake is 881 px wide at 2 px/m and the shipped structure
 * maps 661 at 1.5, for a model that is 440 m wide. This port carries the
 * same root scale, and intake's own rescale of it lands back on 440 exactly
 * (`scaleApplied` 0.9999999999999999, printed ×1.000), so it bakes 880 and
 * 660 wide, one column narrower. The camera frames the same 440 m either
 * way, so the difference is a sub-pixel horizontal resample of the whole
 * map — 0.4994 m a pixel against 0.5000 — not an empty column: on the
 * emissive map the lit span runs 61..819 of 881 before and 61..818 of 880
 * after, 754 of 880 column sums are identical, and gate 3's raw E reads
 * 11.747 against the approved 11.849 (#652 review). None of it is shape
 * (`diff.mjs` below). A root scale one ulp larger
 * (`root.scale.multiplyScalar(1 + Number.EPSILON)`) lands intake's product
 * on 440.00000000000006 again and re-bakes the approved maps, the way
 * structures/vent-tap-hadron.mjs carries intake's tie on a square plan; it
 * is not done here, because it would write intake's rounding into a
 * script, and the 660 px the port bakes is what `ceil(440 × 1.5)` gives
 * every one of its 27 sibling structure maps. The Sounding Spire's product
 * lands on 140 exactly and its maps re-bake byte for byte.
 *
 * SIDES. Every pair is the export's `_r`/`_l` (`hadron.pair`), and the file
 * mirrors them across two planes. The port lights, the x prongs, the
 * conduits, the anchor blades, the standpipes and the ballast tanks mirror
 * across x, the `_r` at +x — which on an unyawed X-long file is the bow
 * axis and neither beam (the conduits' `fore` and `aft` are each other's
 * z-mirror, `fore` toward −z) — except that `anchorBlades` seeds each pair
 * from a bearing, and blades 2 and 3 sit past π/2, so their `_r` lands at
 * −x (−51.6 and −154.3 m) with the `_l` opposite; the pairs still mirror. The four rib pairs mirror across z: every
 * rib `_r` foots at +z, which is starboard (kit.mjs `bothSides`, #642),
 * every `_l` at −z. The two docks are named `starboard` and `port` and sit at +x
 * and −x — `dock_starboard` at x +7.5 with its throat pointing +x,
 * `dock_port` at x −7.5 pointing −x — on the bow axis, where neither #642's
 * relabel rule (port is −z) nor its exception applies by the letter, so the
 * names are carried as the file has them. Nothing is relabelled and nothing
 * is mirrored.
 *
 * ODDITIES kept, because a port is not where a shape gets decided:
 * - each dock's lip is a ring stood edge-on to its throat (no rotation on
 *   its node), not laid round the mouth (`hadron.dockingCollar`);
 * - the ribs are pressed to 0.92 on their own y, which after the quarter
 *   turn is the world's x-z, so a rib is a quarter-ellipse 5.41 out by 6.05
 *   up against a dome 5.99 out by 5.51 up (`hadron.reinforceRibs`);
 * - the `_l` conduits were the `_r` mirrored with the tube's section turned
 *   over — proper rotations, written as parts.mjs decomposes them, (±π,
 *   yaw, roll − π) — until CONDUITS, below, re-laid all four;
 * - the two lamps burn at 2.000036651280468 and 2.6000523589720967, the
 *   file's floats, not the 2 and 2.6 they plainly started as (#639 review,
 *   N1);
 * - the z prongs are the x prongs' box turned across and drawn twice, where
 *   the x pair shares one buffer; every rib, conduit, blade and dock part is
 *   its own buffer, and the lights, standpipes, flanges and tanks share one
 *   a pair. As the file has them.
 *
 * `diff.mjs bastion-hadron f7cce0f`: unchanged beyond the root scale and
 * shift but for the pair below and the four lamps of LAMPS THAT FLOAT —
 * every other part is where it was.
 *
 * LIGHT (#890). "Sustained glow from ports and working lights" is the
 * block's resting clause, so every port light stays lit; one pair was
 * hidden from above, and rule 5 of models-plan.md §3.2 moves it:
 * - `port_light_0_r` and `port_light_0_l`, the equator pair 5.92 out, sat
 *   half in the dome at y 2.5 with the equator band's upper facets over
 *   them (the band's ridge at 2.72 against their crown at 2.62), showed
 *   nothing from above from #652 to #890, and the audit named both on every
 *   build. Each is lifted 0.35 to y 2.85 at its own x and z — set into the
 *   dome's slope just over the band, as the three pairs up the dome are —
 *   and shows 15.25 m². `diff.mjs` lists the two (7.37 m at 440 m) and
 *   nothing else.
 *
 * LAMPS THAT FLOAT (#907, from #894's measure). Four lit parts rested on
 * nothing by the audit's second measure:
 * - `port_light_0_r` and `port_light_0_l`, the pair #890 lifted, stood
 *   0.31 m off the equator band and 2.6 m off the dome's facet at 440 m —
 *   set into the dome's *sphere*, which its twelve-by-six facets lie
 *   inside of. Each grows from the dome now: seated on it from its own
 *   station, its radius off the facet and sunk half of it (`lightPairs`
 *   `on`, kit.mjs `seat`), 3.7 m in along the facet's normal and a hair
 *   lower, still over the band's ridge and showing from above. `diff.mjs`
 *   lists the two.
 * - `dock_starboard_mouth` and `dock_port_mouth`, each a lit disc 0.21 m
 *   off the end of its throat: the file stood the mouth at 1.4 up a frame
 *   whose throat ends at 1.3, with the disc 0.18 thick. The throat's end
 *   is the station now — half the throat's length and half the disc's
 *   thickness, a rule in `dockingCollar` — so the disc's underside is on
 *   the end face, 0.21 m inboard of where it was. `diff.mjs` lists both.
 *
 * FACETS (#919). The export's counts above are history. The Order's rule
 * is one facet edge of 3 m held between four and twelve
 * (docs/asset-prompts-3d.md Block 2c; hadron.mjs `facets`, `cut`), and at
 * 21 m to the unit nearly every round part here is at its ceiling:
 * - the dome twelve round by three down, where it was twelve by six, and
 *   each rib three along its run, the dome's own three, where it was
 *   eighteen;
 * - the equator band, the plinth and the plinth band twelve round, where
 *   they were twenty-four, eight and twenty-four — the plinth and its band
 *   turned half a facet, a flat to each axis as the octagon's was
 *   (`hadron.plinth`), and the band's tube six where it was five;
 * - each dock's throat, lip and mouth twelve, where they were eight
 *   (`hadron.dockingCollar`);
 * - each conduit two along its 0.9 rad on a tube of six, where it was
 *   fourteen on five (the two along are the two facets it lies on since
 *   CONDUITS, below);
 * - the standpipes the navy's six-sided pipe, where they were eight, their
 *   flanges twelve round on a tube of four, where they were ten on five;
 *   the tanks twelve round, where they were eight;
 * - the port lights an orb of four by three, where it was six by five.
 * The plan is 20.90 by 18.13 now: the plinth's turned box was the 19.34,
 * a twelve-gon's overhangs less, and x is the docks' still, so the scale
 * did not move. Four pairs of port lights are seated on the facets under
 * them (`lightPairs` `on`): the first, which #907 seated on the dome, on
 * the coarser facet there, and the three pairs up the dome, which sat on
 * the round sphere's skin at the file's stations — left where they were
 * the fourth pair stood 1.09 m off the dome. Three of the four move, pairs
 * 0, 3 and 5 by 3.5, 1.5 and 2.4 m, and pair 4 lands where it was. The two
 * pairs on the equator band did not move.
 *
 * THE ANCHOR BLADES moved, and by review (#919, round two). The file stood
 * all four pairs on one circle of 7.3 round an octagon, whose corners at
 * 22.5°, 67.5°, 112.5° and 157.5° lay beside the blades' bearings, and the
 * gaps to the plinth were, pairs 0 to 3: 0.51, 4.89 and 0.47 m, and the
 * fourth a mount. On the same circle round a twelve-gon no turn keeps
 * that mount on both sides:
 *
 *   turn                   pair 0   pair 1   pair 2   pair 3      (m)
 *   none (vertex on axes)   0.36     3.27     2.99     1.86
 *   half a facet (π/12)     2.92     0        0.40     2.02
 *   an eighth, `_r` side    3.10     2.66     3.06     0
 *   an eighth, `_l` side    0.18     0.98     0.05     3.44
 *
 * So the plinth keeps the half facet, the one turn here that mirrors port
 * to starboard, and the blades are stood off the plinth's skin at their
 * own bearings instead of off the circle (`anchorBlades` `foot`): drawn in
 * 4.9, 1.6, 2.4 and 4.0 m, pairs 0 to 3, each pair still a mirror, and all
 * eight foot on the plinth — gap 0, 0, 0, 0. `diff.mjs` reads the same
 * moves as 4.4, 1.5, 2.3 and 3.7 m, a blade's largest axis rather than
 * its draw-in. One crossing is deeper for it: the fourth pair's blade
 * meets the first's across the beam by 0.88 m where the file had 0.08,
 * the two drawn in by different amounts, most of it inside the plinth.
 * 58 parts and 3,788 triangles
 * become 58 and 1,948.
 *
 * CONDUITS (#1011). The file's four conduits, 0.9 rad each of a circle of
 * 5.4 about (0, 1.6, 0) draped across the crown, lay wholly inside the
 * dome: every one of their 18 corners 4.5 to 13.4 m under the facets
 * (72 of 72 inside the sphere), the four crossing one another over the
 * pole and running through the lantern (contacts.mjs listed each against
 * the other three and `apex_lantern`). No view showed "external
 * pipework". Each is now a pipe of the same 2.95 m tube laid on the dome's
 * facets (`hadron.conduits`, kit.mjs `mitredTube`), in the file's units of
 * 21.05 m with metres in brackets: `fore_r` in the vertical plane on the
 * bearing −45°, toward −z, between the ribs at −20° and −60°, from 1.0
 * (21 m) out at the lantern's foot down the cap facet, over the ring-1
 * ridge with a 30.5° mitre, and down the second band to 4.9 (103 m) out,
 * 0.17 (3.6 m) short of ring 2; `aft_r`, `fore_l` and `aft_l` the same
 * buffer yawed to +45°, −135° and +135°, each bearing seated and measured
 * against the first. Centreline (ρ, y) 1.023, 7.242 → 3.050, 6.703 →
 * 4.965, 4.761: runs of 2.097 (44.1 m) and 2.728 (57.4 m), 0.091 (1.92 m)
 * off each facet on a flat sunk 0.030 (0.63 m) into it, so 14 of a
 * conduit's 20 corners stand proud of the facets by up to 0.22 (4.64 m)
 * and the bottom flat's six sit 0.030 (0.63 m) under; the top end's crown
 * is at y 7.36 under the pole's 7.42. The sweep
 * lists each conduit against the dome and nothing else. `diff.mjs
 * bastion-hadron origin/main` lists the four (39.6 m, 24 → 36 triangles
 * each, the twelve being the end caps the open arcs never had) and
 * nothing else; 1,948 triangles become 1,996. The arc's own counts, two
 * along and six round, are the pipe's: the two facets it lies on and the
 * rule's six at 2.95 m. The equator band and the standpipes are unmoved,
 * and the plan is the docks' 20.90 still.
 *
 * HEIGHT (#960). The conn view stands a structure's y 0 at the 600 m working
 * depth, 132 m under the drawn surface (rosterModels.ts `standingY`, #958),
 * and this file stood 219.79 m to the finial, 88 m of it in surface water.
 * The rule across the four Bastions is one proportion: the crown at 0.29 of
 * the plan, 127.6 m over the ground at 440 — a hand under the line, not on
 * it (`CROWN`; kit.mjs `holdCrown`, which asserts the unpressed 219.79 as
 * `TALL`) — and the whole model pressed in y about y 0 to meet it, the plan
 * untouched. Here that is ×0.5806 on the root's y after `fitFootprint`, so
 * every node below keeps the file's numbers and the file carries the press:
 * the dome is 0.92 on its node and 0.53 tall in the file; the lantern 1.6 on
 * its node and 0.93 in the file against its 0.8 across, still taller than
 * wide; the finial 1.8 → 1.05 against 0.55, still a spike; the docks, fins
 * and anchor blades — the Order's bilateral plan — exactly where they were.
 * The facet rule is asked under the press (`hadron.cut(L / DRAWN, { press
 * })`; facets.mjs `pressedOrb`, Block 2c), and one count moved: the twelve
 * port lights, orbs of four by three at the file's 2.53 m, draw their
 * meridians at 2.3 m pressed and the rule asks four a turn there, so each is
 * six by two (16 → 12 triangles; `diff.mjs bastion-hadron origin/main` lists
 * the twelve at 0.68 m, the equator now at the orb's full radius, and
 * nothing else beyond the root scale 1.0000 / 0.5806 / 1.0000), seated on
 * the dome from its station as before. `facets.mjs hadron` names the
 * Turret's two pod caps and nothing here, as on main. 1,996 triangles
 * become 1,948; the flatter orbs show more from above, 967.7 → 1023.5 m²
 * lit and intake's raw E 11.65 → 12.28. Measured vertex-true after:
 * `apex_finial` 127.60 m, `apex_lantern` 121.7, the x prongs 113.9; the
 * ground is y 0 still. `contacts.mjs` lists the same 110 pairs but
 * `reinforce_rib_0_l · port_light_4_l` and `reinforce_rib_3_l ·
 * port_light_4_r`, the old orbs' brush against the ribs beside them, which
 * the re-cut pair clears; the pair rests on the dome. The plan is the
 * file's, so the maps keep their footprint.
 *
 * OCCLUSION (#1002). The first model to carry a baked occlusion map, by the
 * owner's decision on the issue: reviewed on #960 and #1011, pre-built at
 * every opening, and a dome with ribs and conduits lying on it. The bake is
 * kit.mjs `exportGlb`'s `occlusion` at 512², the rest its defaults
 * (occlusion.mjs): 744 charts filling 36 % of the atlas at 0.45 texels a
 * metre, 64 rays to 110 m, 13 s. The file grows from 118,892 to 416,948
 * bytes, 170,426 of them the PNG. Nothing moved: `diff.mjs bastion-hadron
 * origin/main` reads every part where it was, `contacts.mjs` the same
 * pairs, and intake's four maps are byte for byte the bare file's
 * (docs/art-direction.md "Bevels and baked occlusion — SPEC").
 */
import { THREE, fitFootprint, holdCrown, exportGlb } from '../kit.mjs';
import * as hadron from '../factions/hadron.mjs';

const L = 440;
// HEIGHT (#960): the crown held at 0.29 of the plan, 127.6 m over the ground
// at 440 — under the 132 m the drawn surface stands over a structure's y 0,
// not on it (kit.mjs `holdCrown`; the header). `TALL` is the unpressed
// crown, metres vertex-true, asserted by `holdCrown`, so the press is known
// before the build and the facet rule prices each part as the file draws it.
const CROWN = 0.29 * L;
const TALL = 219.7895;
const PRESS = CROWN / TALL;
const DRAWN = 20.9;

// The Order's facet rule at this file's scale (hadron.mjs `cut`, #919): the
// builders are handed the export's units and the rule is a chord in metres.
const cut = hadron.cut(L / DRAWN, { press: PRESS });

const alloy = hadron.ink.alloyWhite();
// The two strengths are the approved export's own floats (#639 review, N1).
// The lit crystal is `resonance_crystal_dim`, the turret's fixture, since
// #888: the approved export lit it under the cladding's name
// `resonance_crystal`, over #2A1650 at metalness 0.1, and a name that is a
// cladding on the hulls and a lamp here is two names. The emissive did not
// move, so the strength is the file's. `shadow_indigo` is at the hulls'
// metalness of 0.35 for the same reason; the export had the turret's 0.25.
const crystal = hadron.ink.resonanceCrystalDim(2.000036651280468);
const glow = hadron.ink.crystalGlow(2.6000523589720967);
const shadow = hadron.ink.shadowIndigo();
const steel = hadron.ink.darkSteel();

const root = new THREE.Group();
root.name = 'bastion_hadron';

// The dome's seat: the dome and the ribs that climb it sit on this node
// height and carry this press; the conduits are seated on the dome's
// facets instead (CONDUITS, at the head).
const dome = { at: [0, 1.9, 0], scale: [1, 0.92, 1] };

// The dome, 0.52π of a sphere, its lantern and finial, and the four prongs.
hadron.pressureDome(
  root,
  { alloy, crystal, glow, shadow },
  {
    dome: { r: 6, theta: Math.PI * 0.52, ...dome },
    lantern: { r: 1.15, at: [0, 8.12, 0], scale: [0.8, 1.6, 0.8] },
    finial: { r: 0.4, at: [0, 9.72, 0], scale: [0.55, 1.8, 0.55] },
    prongs: { size: [0.18, 2.4, 0.32], y: 8.12, reach: 0.85, splay: 0.12 },
    cut,
  }
);

// Four pairs of ribs, 0.52π of a ring each, yawed round the dome.
hadron.reinforceRibs(
  root,
  { alloy, shadow },
  {
    r: 5.88,
    t: 0.17,
    radial: 4,
    angle: Math.PI * 0.52,
    yaws: [0.35, 1.05, 2.09, 2.79],
    ...dome,
    cut,
  }
);

// The equator band — four-sided in its tube, the Order's section — the
// plinth and its band, each the rule's twelve round: the equator band with
// a vertex on each axis, as the dome has, and the plinth and the band on
// its shoulder turned half a facet, a flat to each axis (`hadron.plinth`).
hadron.ring(root, 'equator_band', steel, {
  r: 5.94,
  t: 0.22,
  radial: 4,
  at: [0, 2.5, 0],
  cut,
});
const PLINTH = { r: 7.4, facets: cut.round(7.4), yaw: Math.PI / cut.round(7.4) };
hadron.plinth(root, 'plinth', steel, { rTop: 6.7, h: 1.2, y: 0.6, ...PLINTH });
hadron.ring(root, 'plinth_band', alloy, {
  r: 6.8,
  t: 0.15,
  at: [0, 1.25, 0],
  half: true,
  cut,
});

// Twelve port lights — "sustained glow from ports" — two pairs on the
// equator, one just over its band and grown from the dome (see LIGHT,
// LAMPS THAT FLOAT), and three up the dome.
hadron.lightPairs(root, glow, {
  name: 'port_light',
  r: 0.12,
  cut,
  at: [
    [5.7, 2.85, 1.6, 'pressure_dome'],
    [4.9, 2.5, 3.4],
    [5.95, 2.5, -0.9],
    [3.9, 5.5, 2.2, 'pressure_dome'],
    [4.6, 4.8, -1.8, 'pressure_dome'],
    [2.2, 7, 0.6, 'pressure_dome'],
  ],
});

// The two docks, `starboard` at +x and `port` at −x (see the header), each
// rolled so its throat points outboard; the lit mouth stands on the
// throat's end, the builder's rule (LAMPS THAT FLOAT).
for (const [name, x, roll] of [
  ['starboard', 7.5, -Math.PI / 2],
  ['port', -7.5, Math.PI / 2],
])
  hadron.dockingCollar(
    root,
    { alloy, shadow, crystal },
    {
      name,
      at: [x, 1.8, 0],
      roll,
      throat: { rTop: 1.3, r: 1.7, h: 2.6 },
      lip: { r: 1.38, t: 0.22, y: 1.35 },
      mouth: { r: 1, t: 0.18 },
      fins: { r: 0.18, length: 1.5, y: 0.5, z: 1.85, cant: 0.4 },
      cut,
    }
  );

// Four conduits laid down the dome's facets from the lantern's foot over the
// crown's edge (CONDUITS, at the head): `fore_r` on the bearing −π/4, toward
// −z, the other three its mirrors.
hadron.conduits(root, steel, {
  on: 'pressure_dome',
  t: 0.14,
  azimuth: -Math.PI / 4,
  from: 1.0,
  to: 4.9,
  sink: 0.03,
  cut,
});

// The standpipes with their flanges, and the ballast tanks, abaft.
hadron.standpipes(
  root,
  { steel, shadow },
  {
    at: [5.2, 1.6, -4.2],
    pipe: { rTop: 0.2, r: 0.24, h: 3.2 },
    flange: { r: 0.27, t: 0.06, y: 2.6 },
    cut,
  }
);
hadron.ballastTanks(root, steel, { r: 0.7, waist: 1.9, at: [2.6, 1.15, -6.4], cut });

// Four pairs of anchor blades stood off one circle round the plinth's foot.
hadron.anchorBlades(
  root,
  { shadow, alloy },
  {
    r: 0.3,
    length: 2.1,
    anchor: [7.3, 0.6],
    lift: 0.5,
    seat: 0.8,
    bearings: [0.45, 1.35, 1.9, 2.75],
    // Each pair stood off the plinth's skin at its own bearing, not off one
    // circle (FACETS, at the head).
    foot: PLINTH,
  }
);

const size = fitFootprint(root, L);
if (Math.abs(size.x - DRAWN) > 1e-3 || size.z > size.x)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(4)} × ${size.z.toFixed(4)}; the header says ${DRAWN} X-long`
  );
holdCrown(root, CROWN, { tall: TALL });
// OCCLUSION (#1002): the one model baked first, the header's last paragraph.
await exportGlb(root, 'bastion-hadron.glb', { occlusion: { size: 512 } });
