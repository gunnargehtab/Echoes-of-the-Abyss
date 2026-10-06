/**
 * The Nodule Refinery, Bathyarch Consortium — 280 m of footprint (2 ×
 * `radiusM` 140, packages/shared/src/structures.ts), SIG 65 sustained.
 *
 * "A rank of upright silos with conveyor and crusher machinery,
 * seabed-anchored (SIG 65 sustained — the loudest permanent thing a player
 * owns). Burning bright: floodlit working surfaces, visible machinery
 * light" (docs/asset-prompts-3d.md, STRUCTURE — Nodule Refinery). One
 * prompt block, four scripts; the Klaxon's is from the earlier authoring
 * pass its Sentinel Turret came from and shares nothing with the other
 * three navies' Refineries, so it ports from `factions/bathyarch.mjs`
 * alone, as the turret did (#639).
 *
 * A port of the approved export
 * (docs/concept-art/models/refinery-bathyarch.glb at f7cce0f), part for
 * part in its order, every number the export's own, read off parts.mjs.
 * The platform on its skirt with the working apron, two lit stripes and a
 * pad; four silos in a rank, each capped, banded and lamped, and a patch on
 * the second; the crusher hall with its roof, lit intake, two ranks of
 * teeth, a leaning stack and its lamp; two conveyors with a lit line down
 * each, on three legs; four flood masts; a banded ballast tank; three
 * pipes; and five apron lamps. Its materials are `ink`'s: the three
 * claddings and `amber_lamp` at two loudnesses, 2.4 on the work lamps and
 * 1.1 on the intake and the belt lines, as the Bastion carries it. The
 * claddings were the turret's `structureInk` until #888 — the same hexes
 * at 0.3/0.45, 0.3/0.52 and 0.1/0.75 — and are the hulls' finish now; the
 * lamps were `work_lamp` and `port_glow`, the token through and through,
 * until #891 put them on the navy's near-black base, where they are one
 * fixture (the module's `amberLamp` says what that moved). One value a
 * name. Nothing here is a shape decision; where the export is odd the
 * script is odd with it:
 *
 * - The silos alternate short, tall, short, tall (2.6, 2.9, 2.6, 2.9) on
 *   one base; each cap is centred 0.22 above its silo's top, so its base
 *   sits 0.005 into it; each band is 0.55 of the height up, each lamp 0.5
 *   above the top.
 * - The crusher stack leans 0.12 radians to port and its lamp stands 0.07
 *   off the stack's axis, not on it.
 * - The conveyors are placed by three's `lookAt` up the belt — not by
 *   `setFromUnitVectors` like the pipes — with the belt's width kept level;
 *   each lit line is 0.96 of its belt's length, 0.4 of its width and 0.09
 *   straight up, and each belt's midpoint is the mean of its round ends,
 *   which is where the file's 0.14999999999999997 comes from.
 * - The silo flood mast writes its bank before its post, alone of the four;
 *   two banks are yawed past a right angle (−2.2 and 2.2), which parts.mjs
 *   prints as the wrapped triple.
 * - Every pipe stands between two round points by the turret's `feed_pipe`
 *   rule: the ballast pipe from (2.6, 0.9, −1.5) to (0.4, 1, −0.6), the
 *   crusher pipe from (−1, 1.9, 0.9) to (0, 2.2, −1.4), the silo pipe from
 *   (−2.6, 2.4, −1.2) to (−2.6, 1.1, 0.6).
 * - Of the nineteen lamps, the two apron stripes, the four silo lamps, the
 *   stack lamp, the two belt lines, the four flood banks and the five
 *   apron lamps face up. The crusher intake was a 0.1-deep panel on the
 *   hall's front face between the two ranks of teeth, so the audit warned
 *   on it, and with it the Refinery baked capped at ×64 — E 41.46 against
 *   E(65) 46.73. #890 made it a throat: the same 1.1 × 0.8 face carried 0.4
 *   out from the wall as a lit block, the upper teeth biting its root and
 *   its top face showing past them — "visible machinery light", the
 *   resting clause's (docs/models-plan.md §3.2 rule 5). That is the one
 *   departure from the file, and it is what brings the bake under the cap.
 *   The five apron lamps are the other (#907): the file stood each 0.03 of
 *   a unit — 1.1 m at this scale — over the apron, which #894's resting
 *   measure found; each is dropped onto the apron at its station now,
 *   half its radius in (`lampRow` `on`, kit.mjs `seat`). `diff.mjs` lists
 *   the five and nothing else.
 *
 * THE FRAME: an X-long export (7.35 along x, the skirt's edge to the
 * ballast tank's end, against 6.9 across z), so nothing is yawed: every
 * part is placed by kit `add` in the file's own frame —
 * `factions/bathyarch.mjs`'s `inFrame` — the primitive un-turned, the
 * node's translation and XYZ Euler verbatim. The footprint is held at 280
 * m the Vent Taps' way (#608): `fitFootprint` measures the plan by three's
 * `Box3.setFromObject`, `DRAWN` 7.35 on x (intake's `rawSize.x` on the
 * approved file), and scales the root to it, so intake reports ×1.000 and
 * no rotation on the port's output and the shipped maps re-bake where the
 * approved bake put them.
 *
 * FACETS (#919). The Klaxon's rule is one facet edge of 2.5 m (docs/asset-prompts-3d.md Block 2c; bathyarch.mjs `cut`),
 * asked at this file's scale, and the pass re-cut what was off it: the four
 * silos and their caps fourteen at 22–23 m and the ballast tank fourteen
 * at 16, where the export had nine; the silo bands and the ballast band
 * fourteen on a tube of six, where they were ten on five; the crusher
 * stack fourteen at 8.4 m, where it was seven; the four flood masts six,
 * where they were five; the ballast pipe eight; the ten work lamps orbs of
 * six by three, where they were six by four. 55 parts and 1,568 triangles
 * become 55 and 1,980.
 *
 * PANELS (#919). The structure band is 2–5.5 m a panel (Block 2c;
 * bathyarch.mjs `panels`), and this model read 20.6 m over 25 unlit parts:
 * the platform, the aprons, the silo caps and the crusher roof own the
 * plan, and the yard east of the crusher hall — 95 × 90 m of platform
 * between the silos, the apron conveyor and the ballast tank — carried
 * nothing but the yard flood mast. The pass dresses it as working hardware
 * in five groups at stations no two alike: three dogged hatches, 4.6 m
 * across under a 3 m wheel, each with one or two kerb posts 4 m across
 * beside it; a run of four and a run of three plates of grey and rust, 4 ×
 * 3.2 m, laid almost edge to edge along the yard's north side with a 5 × 1 m
 * seam closing each run; a run of three down its east side between two
 * seams; and two plates on the apron and two on its pad: 26 fittings, 29
 * parts, since a hatch is two. Each is dropped onto `platform`, `apron` or
 * `apron_pad` from its station (`deckPosts`, `deckHatches`, `deckPlates`;
 * kit.mjs `seat`), 2.2–4 m on a side from above, clear of the ballast pipe
 * over the yard's south edge, the apron belt, the yard mast's bank, the
 * lit stripes and the apron lamps; nothing stands over a lamp, and each
 * meets its slab alone. The median edge goes 20.6 m → 3.6 m over 54
 * panels. 55 parts and 1,980 triangles become 84 and 2,604.
 */
import { THREE, fitFootprint, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 280;
const DRAWN = 7.35;
// The Klaxon's facet rule at this file's scale (bathyarch.mjs `cut`, #919):
// the builders are handed the export's units and the rule is a chord in
// metres. Asserted after the fit, since the fit is what sets the scale.
const cut = bathyarch.cut(L / DRAWN);

const black = bathyarch.ink.hullBlack();
const rust = bathyarch.ink.oxideRust();
const grey = bathyarch.ink.ironGrey();
const lampM = bathyarch.ink.amberLamp(2.4);
const glow = bathyarch.ink.amberLamp(1.1);
const put = bathyarch.inFrame;

const root = new THREE.Group();
root.name = 'bathyarch_nodule_refinery';

// The platform, its skirt, the working apron with its two lit stripes and
// the pad between them.
bathyarch.refineryPlatform(
  root,
  put,
  { black, rust, grey, lampM },
  {
    platform: { size: [6.4, 0.5, 4.8], at: [-0.4, 0.25, -0.4] },
    skirt: { size: [6.8, 0.22, 5.2], at: [-0.4, 0.11, -0.4] },
    apron: { size: [3, 0.36, 2.6], at: [1.6, 0.18, 2.6] },
    stripes: { size: [0.14, 0.03, 2.5], x: [0.5, 2.7], y: 0.38, z: 2.6 },
    pad: { size: [1.7, 0.05, 2.2], at: [1.6, 0.38, 2.6] },
  }
);

// "A rank of upright silos": four on the platform top, short and tall by
// turns, and the patch on the second.
bathyarch.siloRank(
  root,
  put,
  { grey, black, rust, lampM },
  {
    silos: [
      { x: -2.6, h: 2.6 },
      { x: -1.3, h: 2.9 },
      { x: 0, h: 2.6 },
      { x: 1.3, h: 2.9 },
    ],
    z: -1.6,
    base: 0.5,
    radii: [0.55, 0.6],
    cap: { r: 0.58, h: 0.45, lift: 0.22 },
    band: { R: 0.58, t: 0.05, at: 0.55 },
    lamp: { r: 0.07, above: 0.5 },
    patch: { size: [0.7, 0.9, 0.06], at: [-1.3, 1.6, -1.02] },
    cut,
  }
);

// "Crusher machinery": the hall, its lit intake between two ranks of
// teeth — a throat standing 0.4 out from the hall's front face (z 1.8),
// where the file had a 0.1 panel on it (header, #890) — the leaning stack
// and its lamp.
bathyarch.crusherHall(
  root,
  put,
  { black, rust, glow, grey, lampM },
  {
    hall: { size: [2.2, 1.7, 1.8], at: [-1.6, 1.35, 0.9] },
    roof: { size: [2.4, 0.18, 2], at: [-1.6, 2.3, 0.9] },
    intake: { size: [1.1, 0.8, 0.4], at: [-1.6, 1.15, 2] },
    teeth: { size: [1.2, 0.14, 0.14], x: -1.6, top: 1.62, bot: 0.68, z: 1.84 },
    stack: { radii: [0.18, 0.22], h: 1.2, at: [-2.3, 2.9, 0.5], lean: 0.12 },
    lamp: { r: 0.06, at: [-2.37, 3.55, 0.5] },
    cut,
  }
);

// Two conveyors, the apron's up to the crusher and the crusher's up to
// the silos, a lit line down each, on three legs.
bathyarch.conveyorRun(
  root,
  put,
  { belt: black, line: glow },
  { name: 'apron', from: [1.2, 0.55, 2.4], to: [-0.9, 1.15, 1.3], width: 0.5 }
);
bathyarch.conveyorRun(
  root,
  put,
  { belt: black, line: glow },
  { name: 'silos', from: [-2.1, 1.5, 0.3], to: [-2, 2.1, -1.2], width: 0.42 }
);
bathyarch.conveyorLegs(root, put, grey, {
  width: 0.12,
  legs: [
    [[0.2, 0.95, 1.9], 0.9],
    [[-0.6, 1.175, 1.5], 1.35],
    [[-2.05, 1.4, -0.5], 1.8],
  ],
});

// "Floodlit working surfaces": four flood masts — two over the apron, one
// over the yard, one over the silos, whose bank the file writes first.
const mast = { radii: [0.05, 0.06], h: 1.6, y: 1.3 };
const bank = { size: [0.55, 0.22, 0.12], y: 2.15 };
bathyarch.floodMast(
  root,
  put,
  { black, lampM },
  { tag: 'apron_a', at: [3, 0, 3.6], mast, bank: { ...bank, rot: [0.5, -0.7, 0] }, cut }
);
bathyarch.floodMast(
  root,
  put,
  { black, lampM },
  { tag: 'apron_b', at: [0.2, 0, 3.5], mast, bank: { ...bank, rot: [0.5, 0.6, 0] }, cut }
);
bathyarch.floodMast(
  root,
  put,
  { black, lampM },
  { tag: 'yard', at: [2.4, 0, -0.9], mast, bank: { ...bank, rot: [0.5, -2.2, 0] }, cut }
);
bathyarch.floodMast(
  root,
  put,
  { black, lampM },
  {
    tag: 'silo',
    at: [-3.4, 0, -0.4],
    mast: { radii: [0.05, 0.07], h: 2, y: 1.5 },
    bank: { size: [0.8, 0.2, 0.12], y: 2.5, rot: [0.4, 2.2, 0] },
    bankFirst: true,
    cut,
  }
);

// The ballast tank, banded, laid along x; then the three pipes, each
// stood between two round points.
bathyarch.bandedTank(
  root,
  put,
  { tank: rust, band: grey },
  {
    name: 'ballast',
    at: [2.6, 0.92, -1.9],
    r: 0.42,
    length: 1.9,
    rot: [0, 0, Math.PI / 2],
    band: { R: 0.44, t: 0.05 },
    cut,
  }
);
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_ballast',
  from: [2.6, 0.9, -1.5],
  to: [0.4, 1, -0.6],
  r: 0.08,
  cut,
});
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_crusher',
  from: [-1, 1.9, 0.9],
  to: [0, 2.2, -1.4],
  r: 0.07,
  cut,
});
bathyarch.pipeBetween(root, put, rust, {
  name: 'pipe_silo',
  from: [-2.6, 2.4, -1.2],
  to: [-2.6, 1.1, 0.6],
  r: 0.07,
  cut,
});

// Five work lamps along the apron's outer edge.
bathyarch.lampRow(root, put, lampM, {
  name: 'apron_lamp',
  r: 0.06,
  from: 0.35,
  pitch: 0.62,
  count: 5,
  y: 0.45,
  z: 3.82,
  on: 'apron',
  cut,
});

// Panels (#919): the yard, the platform's top east of the crusher hall —
// x 0.4 to 2.8, z −1.3 to 2.0, at y 0.5 — carries the yard flood mast and
// nothing else, and the ballast pipe crosses its south edge a unit up, from
// (2.6, −1.5) to (0.4, −0.6). It is dressed as a working yard, in groups
// and not on a grid (the first cut's 23 fittings on a 0.4 lattice read as
// a dot matrix to the reviewer): a dogged hatch with a kerb post or two
// beside it, three times — by the apron belt's foot, mid-yard, and by the
// pipe's end — and runs of plates of the other two finishes laid almost
// edge to edge (a 19 cm gap, so each is its own part to the sweep) with a
// seam closing each run: four and three along the north side, three down
// the east side between two seams. Four more plates lie on the apron east
// of its lit stripe and on its pad. Sizes are the export's units, 38.1 m a
// unit: a post r 0.053, 4 m across; a hatch coaming r 0.06, 4.6 m across,
// its wheel R 0.04, 3 m across; a plate 0.105 × 0.085, 4 × 3.2 m; a seam
// 0.13 × 0.026, 5 × 1 m; each reads 2.2–4 m on a side from above.
const PLATE = [0.105, 0.085]; // long side along x
const PLATE_NS = [0.085, 0.105]; // long side along z
bathyarch.deckHatches(root, { hatch: grey, wheel: rust }, {
  on: 'platform',
  r: 0.06,
  h: 0.016,
  wheel: { R: 0.04, t: 0.008 },
  hatches: [
    ['yard_hatch_1', [0.75, 1.55]],
    ['yard_hatch_2', [1.6, 0.9]],
    ['yard_hatch_3', [1.0, -0.2]],
  ],
  cut,
});
bathyarch.deckPosts(root, grey, {
  on: 'platform',
  r: 0.053,
  h: 0.065,
  posts: [
    ['kerb_post_1', [0.58, 1.3]],
    ['kerb_post_2', [0.95, 1.3]],
    ['kerb_post_3', [1.42, 0.7]],
    ['kerb_post_4', [1.78, 0.7]],
    ['kerb_post_5', [0.78, -0.42]],
  ],
  cut,
});
// The runs: a 0.11 pitch for a 0.105 plate along the north side, the seam
// 0.12 past the last plate; the east run the same on z.
bathyarch.deckPlates(root, { grey, rust }, {
  on: 'platform',
  t: 0.013,
  plates: [
    ['yard_plate_1', 'grey', PLATE, [1.35, 1.65]],
    ['yard_plate_2', 'rust', PLATE, [1.46, 1.65]],
    ['yard_plate_3', 'grey', PLATE, [1.57, 1.65]],
    ['yard_plate_4', 'rust', PLATE, [1.68, 1.65]],
    ['yard_plate_5', 'rust', PLATE, [1.92, 1.65]],
    ['yard_plate_6', 'grey', PLATE, [2.03, 1.65]],
    ['yard_plate_7', 'rust', PLATE, [2.14, 1.65]],
    ['yard_plate_8', 'grey', PLATE_NS, [2.5, 0.05]],
    ['yard_plate_9', 'rust', PLATE_NS, [2.5, 0.16]],
    ['yard_plate_10', 'grey', PLATE_NS, [2.5, 0.27]],
  ],
});
bathyarch.deckPlates(root, { rust }, {
  on: 'platform',
  t: 0.01,
  plates: [
    ['yard_seam_1', 'rust', [0.026, 0.13], [1.8, 1.65]],
    ['yard_seam_2', 'rust', [0.026, 0.13], [2.26, 1.65]],
    ['yard_seam_3', 'rust', [0.13, 0.026], [2.5, -0.08]],
    ['yard_seam_4', 'rust', [0.13, 0.026], [2.5, 0.4]],
  ],
});
// The apron is grey and its pad black, so the plates on each are the other
// two finishes; the apron's two stand east of the second lit stripe.
bathyarch.deckPlates(root, { rust, black }, {
  on: 'apron',
  t: 0.013,
  plates: [
    ['apron_plate_1', 'rust', PLATE_NS, [2.95, 2.45]],
    ['apron_plate_2', 'black', PLATE_NS, [2.95, 2.95]],
  ],
});
bathyarch.deckPlates(root, { grey, rust }, {
  on: 'apron_pad',
  t: 0.013,
  plates: [
    ['apron_plate_3', 'grey', PLATE, [1.75, 3.25]],
    ['apron_plate_4', 'rust', PLATE, [2.15, 2.1]],
  ],
});

const size = fitFootprint(root, L);
if (Math.abs(size.x - DRAWN) > 1e-3)
  throw new Error(
    `${root.name}: drawn ${size.x.toFixed(4)} units across; the header says ${DRAWN}`
  );
await exportGlb(root, 'refinery-bathyarch.glb', { trim: bathyarch.TRIM });
