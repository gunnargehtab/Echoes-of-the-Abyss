/**
 * The Bastion, Abyssal Directorate — 440 m of footprint (2 × `radiusM` 220,
 * tools/hull-maps/models.mjs), SIG 35 sustained.
 *
 * "The HQ — a large pressure dome with visible reinforcement ribs, docking
 * collars and external pipework, anchored to the seabed (SIG 35 sustained,
 * the settlement's constant hum). Sustained glow from ports and working
 * lights; the one building that can never run silent"
 * (docs/asset-prompts-3d.md, STRUCTURE — Bastion). One prompt block, four
 * navies; this is the Directorate's, and it shares nothing with the other
 * three: the dome is four carapace tiers stepping in under a crown, each
 * turned 0.22 rad further than the one below and welded to it with a seam
 * ring; six ribs of three plates and a spike stand on the back of it; seven
 * crown spines ring the apex boss and its light; two docking collars — a
 * main and a small — stand out from the flank with lit mouths and
 * mandibles; two pipes arc up the hull, three standpipes and two ballast
 * tanks sit on the far side; six anchor claws of eight stations, two never
 * grown, grip the seabed; sixteen photophores climb the tiers in three runs;
 * and a worklight hangs over the main dock. Nothing on it mirrors.
 *
 * A port of the approved export (docs/concept-art/models/bastion-
 * directorate.glb at f7cce0f), part for part in its order, every number the
 * export's own, read off its nodes and its buffers (#652). Every part comes
 * from `factions/directorate.mjs`. Nothing here is a shape decision; where
 * the export is odd the script is odd with it:
 *
 * - The ribs cluster on the back, bearings 2.16 to 4.11 rad, a third of a
 *   turn on the side away from the main dock; their plates roll about their
 *   own radial, tilting sideways along the flank; ribs 3–5 were written
 *   under a flipped Euler that is the same rotation as ribs 0–2's form.
 * - `crown_spine_4` was never grown (seven stations of 2π/7 from 0.5 rad;
 *   the rank runs 0, 1, 2, 3, 5, 6), nor were `anchor_claw_2` and `_6`
 *   (eight stations, jittered, the rank 0, 1, 3, 4, 5, 7) — the turret's
 *   claw rank 0, 1, 2, 4, 5 is the precedent, "a regular rule with a hole
 *   in its result". The claws are skinned red, black, red, black, black,
 *   black along the list, by no rule.
 * - Each docking collar's lip ring lies in a plane containing the throat's
 *   axis rather than round it, and its mouth and mandibles sit at the
 *   throat's inboard end, on the tier's flank; the small dock's frame is
 *   written (π, −0.6, −π/2), which is the same rotation as (0, 0.6 − π,
 *   π/2) and is written so here.
 * - The standpipes lean a hundredth or two off vertical and their flanges
 *   lie dead flat; the hull pipes are arcs of a torus, not tubes along a
 *   path.
 * - Every spine leans out along its own bearing by the minimal rotation
 *   from +Y (`leaning`), the crown spines by `atan(0.8)` and the rib spikes
 *   by `atan(1 / 1.35)` — the file's numbers, recovered exactly; the claws
 *   did too, until #1061 ran each between its two ends (`spanning`).
 * - The lamp is `biolight_crimson` burning at 3.3230551162025397, the
 *   file's own strength; the reds, violets and blacks are the hull inks.
 *   The export's lamp base (#3A0D16) and steel (#27313B) were a settlement
 *   pass's own values under the hulls' names, and #888 brought both onto
 *   the navy's ink (#1A0810 and #3A3F4A; docs/asset-prompts-3d.md Block 2b,
 *   rule 3). Nothing else on the file moved.
 * - Not one buffer is shared: the eighteen rib plates, the four mandibles
 *   and the sixteen photophores are a buffer each in the file and are a
 *   geometry each here.
 * - The two dock mouths are discs standing on edge (the throat lies along
 *   the flank); at 0.18 units they are 4.4 m thick, so the top-down maps
 *   still see a bar of each. Each sat a hundredth past its throat's end —
 *   0.25 m of water on the main collar by #894's resting measure; the
 *   small one rested on `rib_plate_1_0` through the same gap — and both
 *   rest on the throat's end since #907 (`dockingCollar`).
 *
 * THE LAMPS THAT FLOATED (#907, from #894's resting measure). Nine of the
 * sixteen photophores stood off the tiers they climb — `photophore_0`
 * 2.4 m, `_2` 0.8, `_3` 4.5, `_5` 6.1, `_6` 2.1, `_9` 3.7, `_10` 5.6,
 * `_13` 6.6, `_15` 0.9 — stations read off ideal cones where the tiers
 * are ten-sided frusta. Seven grow from the nearest of the four tiers and
 * the crown from their own stations, half their radius in
 * (`photophoreDomes` `on`, kit.mjs `seat`). Two would not: `_3` and `_13`
 * seated from their own stations came to rest on a wall under the seam
 * ring above it — a ring stands at 0.88 of the foot plus its 0.14 tube
 * over a wall that has narrowed to 0.86 of the foot, and overhangs it by
 * up to 0.3 units — and the audit read both hidden, the issue's own case
 * of a lamp whose seat would hide it. Each takes a station first. `_3`
 * comes down its own tier's wall at the file's bearing and radius, from
 * y 3.16 to 2.8 (`lower`), out from under `seam_ring_1`: it shows
 * 12.1 m² there (15.2 in the file) and stays between `_2` and `_4` in
 * its climb. `_13` has no such station — on `carapace_tier_0` a bud
 * seeded above y 1.2 shows under 0.25 m² under `seam_ring_0`, and the
 * stations that do show (0.4 to 4.9 m², from y 1.2 down to 1.06) seat
 * level with `_12`, not above it in the run — so it is seeded in
 * the weld's corner instead (`corner`), on `carapace_tier_1`'s wall at
 * the file's bearing a radius above the ring, resting on both, the
 * Cruiser's answer for its tail light (#894): 13 m² from above, level
 * with `_14` (53.9 against 53.6 m up) rather than 14 m under it, so the
 * -z foot's run ends in a pair. `diff.mjs` lists the nine, `_13` at
 * 14.6 m and `_3` at 9.8 the largest and the seven others 1.6 to 7.1,
 * with the two mouths at 0.2 m; the seven other lamps rested where the
 * file had them and stayed until the facet pass (#919), when the rule's
 * fifteen-gon tiers and the first cut's eleven-by-fifteen seam rings
 * covered two more from above: `_6` fell to 7.3 m² of 32.7 under
 * `seam_ring_2` and `_8` to 2.7 of 36.2 under `seam_ring_1` and
 * `reinforce_rib_3` (hull-reviewer). `_6` comes down tier 2's wall to y 4.6
 * (`lower`, 28.6 m²); `_8` swings 0.12 rad toward `_7` off the rib's
 * bearing (`swung`, 25.2 m²), since under the rib it showed 1.2 m² at y 2.9
 * and none at 2.5. `_1` and `_7` grow from their tiers (`on`), 0.73 and
 * 1.61 m off on the file's stations.
 *
 * THE FRAME is the export's own. It is X-long — 17.8096 by 16.9464 by the
 * measure intake takes, three's `Box3` over the parts' own boxes — and the
 * approved bake did not yaw it (`rotatedZtoX` false, scale ×24.7058 to
 * 440 m), so it builds bow-on-X with no yaw, every part placed by `laid`
 * with the file's translation, XYZ Euler and scale, and the root scaled to
 * 440 m on that measure by kit.mjs `fitFootprint` (the Vent Taps' way),
 * which is what makes intake's own rescale exactly 1 and leaves the maps
 * where the approved bake put them. Ground is y = 0, the base tier's foot.
 *
 * At the port (#652), `node tools/hull-models/diff.mjs bastion-directorate
 * f7cce0f` read the nine lamps and the two mouths above, and nothing else
 * beyond the root scale and shift; the passes below each record their own
 * reading against the file before them.
 *
 * FACETS (#919). The navy's rule is one facet of 2 m, odd counts five to
 * fifteen, five and a named four the sections (docs/asset-prompts-3d.md
 * Block 2c; directorate.mjs `cut`), asked at this file's scale — `DRAWN`,
 * the fit `fitFootprint` measures, held and asserted at the foot — and
 * settled on each part as its node places it. The export's counts went: the
 * four tiers 10 → 15, the seam rings 5 × 20 → 5 × 15 (tube by ring: the
 * tube's five is a section Block 2c keeps as a pentagon, `torusOf`), the
 * crown 10 × 5 → 15 × 4, the boss 8 → 15 with its light 6 × 5 → 15 × 7, the
 * dock throats and mouths 8 → 15 with lips 5 × 10 → 5 × 15, the hull pipes
 * 5 × 16 → 5 × 3 over their 1.1 rad, the standpipes 8 → 15 with
 * flanges 5 × 10 → 5 × 15, the ballast tanks 3 × 9 → 4 × 15, and the sixteen
 * photophores 6 × 5 → 7, 9 or 11 round by their radii over 4 or 5 down; the
 * crown spines, the rib spikes, the claws and the four mandibles keep their
 * sections. `facets.mjs` names two of its 96 rings, the two ballast tanks'
 * meridians — capsules whose half-turn share of fifteen is seven, odd, so
 * the capsule takes the segment over: eight a half turn, sixteen a turn
 * (Block 2c, the capsule reading). Triangles 3,634 → 4,539;
 * the fit 17.7998, where the ten-sided tiers measured 17.8096. The rounder
 * tiers reach further out at the ribs' bearings: six rib plates that stood
 * 0.8–4.4 m off their tiers meet them now and sink 0.5–2.1 m in, and
 * `dock_small_mandible_1`'s point runs 1 m into the base tier. Two more
 * lamps are grown from their tiers (`on`): `_1` and `_7`, which rested on
 * the ten-gons and stood 0.7 and 1.6 m off the fifteen-gons.
 *
 * PANELS (#919). The Directorate's band for a structure is 2.5–8 m on a
 * side, the median unlit part from above (facets.mjs `panelsOf`; Block 2c),
 * and this file read 14.5 m over sixty-one: fifty-four parts over the band's
 * 64 m² and seven in it, the crown spines and a mandible. The pass rings each
 * tier with spines on its wall (directorate.mjs `spineRing`): twenty-one,
 * seventeen, thirteen and nine stations of a turn from phases of 0.12, 0.25,
 * 0.3 and 0.45 rad, ten never grown — the lowest tier's 7th, 8th, 12th, 14th
 * and 15th, where rib plates, the small dock's lip and the ballast tanks
 * stand; the second's 0th, 5th, 8th and 13th, where the worklight and a rib
 * plate stand and where `photophore_7` and `_13` would be hidden from above;
 * the third's 3rd, over `photophore_6` — each leaning out along its own
 * bearing, 0.75 rad out of vertical on the lowest tier to 0.9 on the top,
 * each its own length (0.66–0.95 units, 16–23 m) at 0.075–0.09 of radius,
 * black like the crown's, its base seated on its tier. Fifty where
 * forty-eight parts in the band are the least. Every tip stays inside the
 * foot of the tier below it, so the plan from above is the file's own
 * (0.00 m² outside it at 8 px/m); no lamp's plan changed; each spine meets
 * its tier and nothing else (contacts.mjs). They show 14–30 m² each, and the
 * median part is 5.9 m over 111. 84 parts and 4,539 triangles become 134
 * and 5,039; the fit is the same 17.7998 across.
 *
 * HEIGHT (#960). The conn view stands a structure's y 0 at the 600 m working
 * depth, 132 m under the drawn surface (rosterModels.ts `standingY`, #958),
 * and this file stood 255.10 m to the apex light, 123 m of it in surface
 * water. The rule across the four Bastions is one proportion: the crown at
 * 0.29 of the plan, 127.6 m over the ground at 440 — a hand under the line,
 * not on it (`CROWN`; kit.mjs `holdCrown`, which asserts the unpressed
 * 255.10 as `TALL`) — and the whole model pressed in y about y 0 to meet it,
 * the plan untouched. Here that is ×0.5002 on the root's y after
 * `fitFootprint`, so every node below keeps the file's numbers and the file
 * carries the press: the four tiers are 2, 1.8, 1.6 and 1.4 on their nodes
 * and 1.00, 0.90, 0.80 and 0.70 in the file, the crown 0.8 on its node and
 * 0.40 — carapace plates stepping in under a boss, the spines and claws
 * leaning further out of vertical (the crown spines' atan 0.8 reads as 58°
 * in the file). The lowest point was `dock_main_mandible_1`'s, 3.28 m →
 * 1.64 under the ground, a burial this pass recorded and left and #1084
 * lifted (MAIN COLLAR); the anchor claws ended 4.8–5.7 m above y 0 there,
 * as they had 9.6–11.4 m before, a gap this pass left and #1061 closed
 * (ANCHOR CLAWS). The facet rule is asked under the press (`directorate.cut(L /
 * DRAWN, { press })`, Block 2c) and every count held: `facets.mjs
 * directorate` names the same two ballast meridians it did. Measured
 * vertex-true after: `apex_light` 127.60 m, `apex_boss` 123.6,
 * `carapace_crown` 114.4, `crown_spine_5` 114.0. Three's loose node-box
 * measure reads the ground at −3.5, the mandible's box, a leaned cone's box
 * overhanging its point. A press is affine, so no seat, sink or contact
 * moved: `diff.mjs bastion-directorate origin/main` reads the root scale
 * 1.0000 / 0.5002 / 1.0000 and every part where it was; the light audit
 * reads the same 20 lit parts at 993.1 m² and intake's raw E the same 8.32;
 * `contacts.mjs` lists the same 150 pairs. The plan is the file's, so the
 * maps keep their footprint.
 *
 * ANCHOR CLAWS (#1061). "Anchored to the seabed" (the block), and the file
 * hung all six in the water: a cone each whose base stood 0.66–0.70 up on
 * its node, 0.47–0.60 out from the base tier's wall, point rising out and
 * up, its lowest vertex 4.8–5.7 m over y 0 under the press, touching two
 * docks and a tank and nothing of the dome (contacts.mjs). Each runs from
 * the wall to the seabed now, the way the Slipway's anchor claws go into
 * the ground (directorate.mjs `slipwayHall`): the base seeded on the tier's
 * ideal wall at the file's bearing and base height (`wall`) and seated on
 * `carapace_tier_0`, its centre `r` in (`anchored`; kit.mjs `seat`), the
 * point at the file's point in plan and `SUNK` 0.01 under y 0 — 0.12 m into
 * the sand, past the 0.05 m contacts.mjs allows a claw's point, so it lists
 * each one under the seabed — and the cone the span between (`spanning`).
 * The bearings, the points' stations in plan, the skins and the 0.3 base
 * are the file's but for the three turns below; the lean and the length
 * are the span's, 2.74–3.84 on the nodes where the file wrote 1.94–2.94,
 * the bases at y 0.51–0.55 (6.3–6.8 m up). Rooted on the wall, three ran
 * into what the file's hanging claws had stood clear of (hull-reviewer,
 * the first round): `_4` through the
 * foot of `standpipe_1`, 1° off its bearing; `_5` through the belly of
 * `ballast_tank_0`, deeper than the file's 42 %; `_3` 2.4 m into the floor
 * of `dock_small_throat` mid-span. A turn moves the root alone along the
 * wall (`foot`), the point held at the file's station as the rest are:
 * `_4` −0.12 rad and `_5` −0.22, both clips at the root. `_4`'s point is
 * also the plan's −x extreme, which the fit `fitFootprint` measures goes
 * with — swung whole by 0.10–0.15 rad either way, the fit moved 1.0–1.6 %
 * and the dome's scale with it. `_3`'s graze is mid-span, where a root
 * turn moves the claw half as far as at the wall, so it swings 0.2 rad
 * about the dome's axis with both ends (`swing`; as `swung` turns
 * `photophore_8`), out from under the throat. contacts.mjs lists each claw on
 * `carapace_tier_0` and nothing else, under the seabed to y −0.124, and
 * 152 pairs where #960 read 150: six tier mounts gained, the file's four
 * dock and tank clips gone. The fit moved 17.7998 → 17.8132 (`DRAWN`), a
 * leaned cone's box overhanging its point, 0.08 % narrower at 440 m on that
 * measure; the unpressed crown 255.1044 → 254.9125 (`TALL`), the press
 * 0.5002 → 0.5006, the crown held at 127.6: `diff.mjs bastion-directorate
 * origin/main` reads the root scale 0.9992, uniform, the six claws
 * 16.0–37.6 m moved, and nothing else. Every facet count held (`facets.mjs
 * directorate` names the same two ballast meridians); the light audit
 * reads the same 20 lit parts at 991.5 m², the map bake raw E 8.28 → 5.50
 * at ×0.662 with no warning, the outlines unchanged, the three maps and
 * the roster sheet rebaked.
 *
 * MAIN COLLAR (#1084). A structure stands on its y 0, and only an anchor,
 * a root or a slab goes under it (#955; contacts.mjs). The file wrote the
 * main collar's frame at y 1.7, and under its quarter-turn roll the
 * collar's local x is the world's y: the lower mandible's point hangs
 * 1.15 r + 0.65 sin 0.35 = 1.833 under the frame's centre and the throat's
 * root 1.740 (its fifteen-gon's reach at 1.25 r), so the mandible stood
 * 1.64 m into the sand and the throat 0.50 — the burial HEIGHT recorded and
 * left — where the small collar (r 0.9 at y 1.3) clears the ground by
 * 0.5 m. Three ways were weighed. Turning the mandible pair about the
 * throat's axis keeps the frame but puts the fangs beside the mouth rather
 * than over and under it, a new silhouette for one collar. Writing the
 * burial into the header leaves a docking collar in the seabed, which the
 * rule names no case for. The frame rises to y 1.85 instead (`DOCK_MAIN_Y`;
 * `LIFT` 0.15, 1.86 m under the press), the whole collar with it, and the
 * worklight too, since it rests on the lip ring's top — 0.04 into the tube
 * on the file's y 3.4 — and the lift alone would have sunk it in the tube.
 * Measured after: the mandible's point at y 0.21 m and the throat's
 * underside at 1.36; contacts.mjs lists neither under the seabed, and 153
 * pairs where #1061 read 152 — the lip on tiers 0 and 1 and the worklight
 * on the lip and `dock_main_mandible_0` as before, and one gained, the
 * lower mandible's point on `carapace_tier_0`, 3.3 m behind its wall and
 * 0.21 m over its floor, as the small collar's sits 2.9 m behind and 0.52
 * over (FACETS' 1 m, before the press): each lower fang's point meets the
 * base tier it hangs beside, its tip vertex alone inside. `diff.mjs
 * bastion-directorate origin/main` reads the collar's five parts and the
 * worklight 1.855 m moved and nothing else, the root scale 1.0000. A lift
 * along y leaves the plan, so the fit held at `DRAWN`, the unpressed crown
 * at `TALL` and the press at 0.5006; every facet count held (`facets.mjs
 * directorate` names the same two ballast meridians); the light audit reads
 * the same 20 lit parts at 991.5 m², intake's raw E 8.30 with no warning,
 * the map bake 8.28 → 5.50 at ×0.662, the outlines unchanged; the albedo
 * and height maps and the roster sheet rebaked, the emissive map the same
 * bytes. The three standpipes sink 0.06–0.11 m, a burial this pass did not
 * touch.
 */
import { THREE, exportGlb, fitFootprint, holdCrown, polar, seat } from '../kit.mjs';
import * as directorate from '../factions/directorate.mjs';

const { laid, leaning, spanning } = directorate;

const L = 440;
// HEIGHT (#960): the crown held at 0.29 of the plan, 127.6 m over the ground
// at 440 — under the 132 m the drawn surface stands over a structure's y 0,
// not on it (kit.mjs `holdCrown`; the header). `TALL` is the unpressed
// crown, metres vertex-true, asserted by `holdCrown`, so the press is known
// before the build and the facet rule prices each part as the file draws it.
const CROWN = 0.29 * L;
const TALL = 254.9125;
const PRESS = CROWN / TALL;
// The export's extent as `fitFootprint` measures it, three's `Box3` over the
// parts' own boxes, which the facet rule is asked at: a `fitFootprint` file
// learns its scale after it is built, so the fit is held here and asserted
// at the foot (directorate.mjs `cut`, #919).
const DRAWN = 17.8132;
const cut = directorate.cut(L / DRAWN, { press: PRESS });

// A torus is born in the XY plane; every seam ring and flange here lies flat.
const FLAT = [Math.PI / 2, 0, 0];

const red = directorate.ink.chitinRed();
const violet = directorate.ink.chitinViolet();
const black = directorate.ink.trenchBlack();
const steel = directorate.ink.weldSteel();
const crimson = directorate.ink.biolightCrimson(3.3230551162025397);

const root = new THREE.Group();
root.name = 'bastion_directorate';

// Four tiers stepping in, red and violet turn about, each narrowing to 0.86
// of its foot and turned 0.22 rad further than the one below, with a steel
// seam ring on its top edge at 0.88 of the foot.
const RING_TUBE = 0.14;
const TIERS = [
  { name: 'carapace_tier_0', skin: red, foot: 6.4, length: 2, y: 1 },
  { name: 'carapace_tier_1', skin: violet, foot: 5.7, length: 1.8, y: 2.85 },
  { name: 'carapace_tier_2', skin: red, foot: 4.8, length: 1.6, y: 4.5 },
  { name: 'carapace_tier_3', skin: violet, foot: 3.7, length: 1.4, y: 5.95 },
];
const tier = ({ name, skin, foot, length, y }, i) => ({
  name,
  skin,
  radii: [0.86 * foot, foot],
  length,
  ...laid([0, y, 0], [0, 0.22 * i, 0]),
  ring: {
    name: `seam_ring_${i}`,
    skin: steel,
    R: 0.88 * foot,
    tube: RING_TUBE,
    // The tube keeps the file's five, a section Block 2c keeps as a pentagon;
    // the ring goes to the rule (`torusOf`).
    facets: 5,
    ...laid([0, y + length / 2, 0], FLAT),
  },
});
directorate.carapaceTiers(root, { cut, tiers: TIERS.map(tier) });

// The crown: a half-orb on the top tier, squashed to 0.8 in height.
directorate.domeShell(
  root,
  { shell: red },
  { cut, name: 'carapace_crown', r: 3.25, ...laid([0, 6.65, 0], [0, 0, 0], [1, 0.8, 1]) }
);

// The apex boss, a black drum off the crown's centre, and its light.
directorate.apexBoss(
  root,
  { boss: black, light: crimson },
  {
    cut,
    boss: { radii: [0.9, 1.25], length: 1.1, ...laid([0.4, 9.45, -0.3]) },
    light: { r: 0.22, ...laid([0.4, 10.1, -0.3]) },
  }
);

// Six ribs on the back of the dome, each its own bearing and its own spike.
directorate.reinforceRibs(
  root,
  { black, red, violet },
  {
    frame: laid,
    ribs: [
      { bearing: 2.1605963, spike: 1.804360151 },
      { bearing: 2.597758373, spike: 2.105182648 },
      { bearing: 2.951491781, spike: 1.627439618 },
      { bearing: -2.952630647, spike: 1.995940208 },
      { bearing: -2.534127162, spike: 1.568927765 },
      { bearing: -2.173374466, spike: 2.088814497 },
    ],
  }
);

// Seven crown spines at 2π/7 from a phase of 0.5, the fifth never grown,
// each its own height on the crown and its own length, all leaning out
// atan(0.8) along their bearing.
const CROWN_TILT = Math.atan(0.8);
directorate.shellSpines(root, {
  name: 'crown_spine',
  spines: [
    { n: 0, length: 1.055529118, bearing: 0.5, rho: 2.463753527, y: 8.029691908 },
    { n: 1, length: 1.263879418, bearing: 1.397597901, rho: 2.515815685, y: 8.094769606 },
    { n: 2, length: 1.27273798, bearing: 2.295195802, rho: 2.518029233, y: 8.097536541 },
    { n: 3, length: 1.718825102, bearing: -3.090391604, rho: 2.629496622, y: 8.236870777 },
    { n: 5, length: 2.160648823, bearing: -1.295195802, rho: 2.739898643, y: 8.374873304 },
    { n: 6, length: 2.067546606, bearing: -0.397597901, rho: 2.716634434, y: 8.345793043 },
  ].map(({ n, length, bearing, rho, y }) => ({
    n,
    skin: black,
    r: 0.11,
    length,
    ...laid(...leaning(bearing, rho, y, CROWN_TILT)),
  })),
});

// Four rings of tier spines down the dome, one a tier on its wall (#919, the
// panel pass; the header): twenty-one, seventeen, thirteen and nine stations
// of a turn from a phase of their own, ten never grown — where a rib plate,
// the small dock's lip, a ballast tank or the worklight stands, or where a
// spine would hide a photophore from above — each leaning out along its own
// bearing, a little further out of vertical each tier up, each its own
// length, black like the crown's, seated on its tier (`spineRing`; kit.mjs
// `seat`). Every tip stays inside the foot of the tier below it, so the
// plan from above is the file's own.
const wall = ({ foot, length, y: yc }, y) => foot - 0.14 * foot * ((y - (yc - length / 2)) / length);
const TIER_RINGS = [
  { tier: 0, stations: 21, phase: 0.12, y: 1.25, tilt: 0.75, r: 0.09, holes: [7, 8, 12, 14, 15], lengths: [0.75, 0.84, 0.73, 0.67, 0.79, 0.82, 0.69, 0.69, 0.83, 0.79, 0.66, 0.74, 0.84, 0.74, 0.66, 0.78, 0.83, 0.7, 0.68, 0.82, 0.8] },
  { tier: 1, stations: 17, phase: 0.25, y: 3.0, tilt: 0.8, r: 0.085, holes: [0, 5, 8, 13], lengths: [0.93, 0.9, 0.76, 0.82, 0.95, 0.85, 0.75, 0.87, 0.95, 0.8, 0.77, 0.92, 0.92, 0.76, 0.81, 0.95, 0.87] },
  { tier: 2, stations: 13, phase: 0.3, y: 4.6, tilt: 0.85, r: 0.08, holes: [3], lengths: [0.95, 0.81, 0.76, 0.91, 0.92, 0.77, 0.8, 0.94, 0.88, 0.75, 0.84, 0.95, 0.83] },
  { tier: 3, stations: 9, phase: 0.45, y: 6.1, tilt: 0.9, r: 0.075, holes: [], lengths: [0.84, 0.71, 0.78, 0.9, 0.79, 0.71, 0.83, 0.89, 0.75] },
];
TIER_RINGS.forEach(({ tier, y, ...ring }) =>
  directorate.spineRing(root, black, {
    name: `tier_spine_${tier}`,
    frame: laid,
    on: TIERS[tier].name,
    rho: wall(TIERS[tier], y),
    y,
    ...ring,
  })
);

// Two docking collars on the flank: the main one on +x, rolled a quarter
// turn and yawed 0.26; the small one on -x +z, the same the other way.
// The main collar's frame stands at y 1.85 where the file wrote 1.7 (the
// header, MAIN COLLAR; #1084): under the quarter-turn roll the collar's
// local x is the world's y, so the lower mandible's point hangs
// 1.15 r + 0.65 sin 0.35 = 1.833 under the frame's centre and the throat's
// root 1.740 (its fifteen-gon's reach at 1.25 r), and the file's 1.7 put
// both in the sand. 1.85 stands the point 0.017 over y 0 and the throat
// 0.11; the worklight, which rests on the lip, rises the same `LIFT`.
const DOCK_MAIN_Y = 1.85;
const LIFT = DOCK_MAIN_Y - 1.7;
directorate.dockingCollar(
  root,
  { violet, steel, crimson, black },
  {
    cut,
    name: 'dock_main',
    r: 1.4,
    frame: laid,
    ...laid([7.5, DOCK_MAIN_Y, 2], [0, -0.26, Math.PI / 2]),
  }
);
directorate.dockingCollar(
  root,
  { violet, steel, crimson, black },
  { cut, name: 'dock_small', r: 0.9, frame: laid, ...laid([-6.4, 1.3, 4.3], [0, 0.6 - Math.PI, Math.PI / 2]) }
);

// Two pipes arcing up the hull at 0.92 of the base tier's foot.
directorate.hullPipes(root, steel, {
  cut,
  pipes: [
    // `facets` is the tube's five, kept as a pentagon; the arc's count is the rule's.
    { R: 5.888, tube: 0.16, arc: 1.1, facets: 5, ...laid([0, 2.2, 0], [0, 0.6, Math.PI / 2 - 0.5]) },
    { R: 5.888, tube: 0.13, arc: 1.1, facets: 5, ...laid([0, 2.2, 0], [0, 1.05, Math.PI / 2 - 0.85]) },
  ],
});

// Three standpipes on the far side, each leaning a hair, each with a flat
// flange 0.22 of its length above its centre.
const standpipe = (x, y, z, length, lean) => ({
  radii: [0.22, 0.26],
  length,
  ...laid([x, y, z], [0, 0, lean]),
  flange: { R: 0.3, tube: 0.07, facets: 5, ...laid([x, y + 0.22 * length, z], FLAT) },
});
directorate.standpipes(
  root,
  { steel, black },
  {
    cut,
    pipes: [
      standpipe(-4.6, 1.7, -3.8, 3.4, -0.03777644408),
      standpipe(-5.6, 1.4, -2.2, 2.8, 0.02077835745),
      standpipe(4, 1.2, -5.5, 2.4, -0.0324256127),
    ],
  }
);

// Two ballast tanks laid on their sides on the -z flank.
directorate.ballastTanks(root, steel, {
  cut,
  tanks: [
    { r: 0.75, length: 2, ...laid([-2.2, 1.05, -6.2], [Math.PI / 2, 0, 0.5]) },
    { r: 0.75, length: 2, ...laid([-0.3, 1.05, -6.8], [Math.PI / 2, 0, 0.8]) },
  ],
});

// Eight anchor claws round the foot, 2 and 6 never grown, each its own
// bearing, reach, height, lean and length, skinned by no rule. The file
// hung each in the water, point up (the header, ANCHOR CLAWS; #1061): the
// numbers here are the file's, read as where a claw's two ends were, and
// `anchored` runs the claw from the base tier's wall to the seabed —
// its base seeded on the tier's ideal wall at the file's bearing and base
// height (`wall`, as the tier spines are) and seated on `carapace_tier_0`
// with its centre `r` in (kit.mjs `seat`, nearest, as `footed` seats a
// spine; seeded from the file's own base, 0.5–0.6 off the wall, the
// nearest facet lay downhill and the roots came to rest at y 0.32 rather
// than 0.5), its point at the file's point in plan and `SUNK` under y 0 — so
// the lean and the length are the span's own (`spanning`). Where the
// wall-rooted run met what the file's hanging claw had stood clear of
// (the header), a claw turns about the dome's axis: `swing` both ends, as
// `swung` turns `photophore_8` off its rib — `_3` 0.2 rad off the small
// dock's throat; `foot` the root alone along the wall, the point held at
// the file's station, since the plan's −x extreme is `_4`'s point and the
// fit with it — `_4` −0.12 off `standpipe_1`, `_5` −0.22 off
// `ballast_tank_0`.
const SUNK = 0.01;
const anchored = (r, bearing, rho, y, tilt, length, { swing = 0, foot = 0 } = {}) => {
  const [at, rot] = leaning(bearing + swing, rho, y, tilt);
  const axis = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(...rot));
  const centre = new THREE.Vector3(...at);
  const base = centre.clone().addScaledVector(axis, -length / 2);
  const tip = centre.clone().addScaledVector(axis, length / 2);
  const seed = polar(bearing + swing + foot, wall(TIERS[0], base.y), base.y);
  const seated = seat(root, 'carapace_tier_0', seed, { sink: r }).at;
  const [mid, lean, span] = spanning(seated, [tip.x, -SUNK, tip.z]);
  return { r, length: span, ...laid(mid, lean) };
};
directorate.clawGrips(root, [red, black], {
  name: 'anchor_claw',
  grips: [
    { index: 0, skin: red, ...anchored(0.3, 0.4492733126, 7.624624744, 1.110029462, 1.166515623, 2.074110508) },
    { index: 1, skin: black, ...anchored(0.3, 1.070480831, 7.935385412, 1.22288933, 1.183038215, 2.943204641) },
    { index: 3, skin: red, ...anchored(0.3, 2.629008713, 7.719305127, 1.220649467, 1.096468681, 2.423635483, { swing: 0.2 }) },
    { index: 4, skin: black, ...anchored(0.3, -2.785177571, 7.840070245, 1.207608371, 1.161669461, 2.696407557, { foot: -0.12 }) },
    { index: 5, skin: black, ...anchored(0.3, -2.041293752, 7.917957057, 1.239473422, 1.163246747, 2.917818785, { foot: -0.22 }) },
    { index: 7, skin: black, ...anchored(0.3, -0.4219618175, 7.554994465, 1.134213502, 1.098979261, 1.935090065) },
  ],
});

// Sixteen photophores climbing the tiers in three runs — seven up the +z
// flank, five up the -x, four along the -z foot — an orb each of its own
// radius, nine of them grown from the tier they climb (`on`, #907; the
// header) and two more since #919 — `_1` and `_7`, which rested on the
// ten-sided tiers and stood 0.73 and 1.61 m off the fifteen-sided ones.
// "Sustained glow from ports and working lights": SIG 35.
const DOME = TIERS.map((t) => t.name).concat('carapace_crown');
const on = (at) => ({ ...laid(at), on: DOME });
// Two lamps seeded off their own stations (the header, THE LAMPS THAT
// FLOATED): `lower` keeps the file's bearing and radius and brings the
// seed down its tier's wall to `y`, under the seam ring's overhang;
// `corner` seeds on tier `i`'s wall at the file's bearing, a radius above
// the seam ring under it, where no lower station on the tier shows.
const lower = ([x, , z], y) => on([x, y, z]);
// `swung` turns a seed `da` radians about the dome's axis at its own radius
// and height, then seats it (`on`): `_8` sits dead under `reinforce_rib_3`
// (bearing −2.95 against the lamp's −2.96) and showed 8 m² of 36 past the
// rib's plates in the file; on the fifteen-gon tiers, seated on its wall, it
// showed 1.2 m² at y 2.9 and none at 2.5, so it swings 0.12 rad toward `_7`,
// still between `_7` and `_9` in the climb (hull-reviewer, the first round).
const swung = ([x, y, z], da) => {
  const a = Math.atan2(z, x) + da;
  const rho = Math.hypot(x, z);
  return on([rho * Math.cos(a), y, rho * Math.sin(a)]);
};
const corner = ([x, , z], i, r) => {
  const a = Math.atan2(z, x);
  const { foot } = TIERS[i];
  const below = TIERS[i - 1];
  const y = below.y + below.length / 2 + RING_TUBE + r;
  return on([foot * Math.cos(a), y, foot * Math.sin(a)]);
};
directorate.photophoreDomes(root, crimson, {
  cut,
  domes: [
    ['photophore_0', 0.1469616145, on([5.580291581, 1.421189459, 2.073583992])],
    ['photophore_1', 0.1434205025, on([4.884848655, 1.843210097, 3.08199889])],
    ['photophore_2', 0.102385737, on([3.878459379, 2.46997304, 3.9174528])],
    ['photophore_3', 0.1021963134, lower([2.459903688, 3.158942005, 4.607727799], 2.8)],
    ['photophore_4', 0.1277387589, laid([1.840131535, 3.631424866, 4.675740221])],
    ['photophore_5', 0.1476596892, on([0.7185694396, 4.464471434, 4.619367234])],
    ['photophore_6', 0.1411419511, lower([-0.6710058168, 5.009296906, 4.395169463], 4.6)],
    ['photophore_7', 0.09141562134, on([-5.563735404, 2.309025739, -0.4284658226])],
    ['photophore_8', 0.1488719881, swung([-5.088318711, 3.272992157, -0.945087779], -0.12)],
    ['photophore_9', 0.1191934049, on([-4.39122562, 4.104702698, -2.001912477])],
    ['photophore_10', 0.1251562387, on([-3.511139819, 4.737823037, -2.909731917])],
    ['photophore_11', 0.1451682299, laid([-2.543776346, 5.618331569, -3.329838164])],
    ['photophore_12', 0.1259391606, laid([0.1301090398, 1.056657064, -6.104817715])],
    ['photophore_13', 0.0983306095, corner([2.028866691, 1.589346455, -5.521522078], 1, 0.0983306095)],
    ['photophore_14', 0.143074587, laid([3.21955778, 2.171257775, -4.628423121])],
    ['photophore_15', 0.115572989, on([4.420805579, 2.717578857, -3.116025447])],
  ],
});

// The worklight over the main dock, a flat bar yawed with it, resting on the
// top of the lip ring; it rises with the collar (`LIFT`, #1084).
directorate.photophoreMarks(root, crimson, {
  size: [1.6, 0.14, 0.3],
  marks: [['dock_worklight', laid([6.2, 3.4 + LIFT, 1.7], [0, -0.26, 0])]],
});

const size = fitFootprint(root, L);
if (Math.abs(Math.max(size.x, size.z) - DRAWN) > 1e-3)
  throw new Error(
    `${root.name}: drawn ${Math.max(size.x, size.z).toFixed(4)} across; the facet rule was asked at ${DRAWN}`
  );
holdCrown(root, CROWN, { tall: TALL });
await exportGlb(root, 'bastion-directorate.glb');
