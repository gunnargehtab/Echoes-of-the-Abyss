/**
 * The Bower — the Commune's anchor, 105 m (docs/units.md, "The line hulls,
 * and the anchor"; #787, off #540 Phase 4).
 *
 * "The anchor a swarm forms around, 105 m — a Spore Veil with a drive:
 * slow, quiet, no gun, and stationary for 30 s it grows out a cloud at half
 * the Veil's radius, 175 m, that suppresses everything inside it, itself
 * included, and it is a nursery for Spinner magazines within 300 m whether
 * it is moving or not (SIG 10 idle, 16 cruise, 45 grown out and heard at
 * 18; HYD 40, 5 grown out; no weapon; 620 hull; 40 m/s; PR 1; 360 nodules).
 * The Veil Mother's bed with a drive: a broad low grown body, an oval in
 * plan and the broadest hull the Commune has grown as one body, its edge
 * made of overlapping lobes that
 * alternate a side at a time, a blunt grown nose, and a broad short
 * muscle-drive fluke astern. Paired gill organs let into the back along
 * each flank with vent slits, exhaling the haze; slender spore stalks
 * standing off the back in a swaying rank, as the Veil's do; and the
 * nursery under the lobes along each flank — brood pouches showing through
 * the shell as rows of paler nubs, where a Spinner's mine regrows. No gun,
 * no arm, no sac, no bloom-bed: this is the Veil's own bed and not the
 * Sower's leaf, and nothing on it points at anything. The model is the hull
 * grown out — lobes spread, stalks standing, gills open and the haze rising
 * — which is the state it anchors in; under way the lobes fold in over the
 * bed, the stalks lie flat along the back, the gills close, and it is a
 * seed again. Nearly black at rest, navigation marks only; under way a dim
 * breathing line around each gill; grown out, sustained glow — the
 * breathing lines lit around the gills, the stalk tips lit, the brood nubs
 * faint along the flanks — and all of it seen through its own haze, because
 * the 45 is heard as 18 and the cloud is what does that: fog over the
 * light, never less light, and the haze is drawn around the hull and not on
 * it."
 *
 * Built to that block and not ported from a binary, as the Reed beside it
 * and the Blight, the Weaver and the Glider before it: the nose, the lobes,
 * the fluke and the marks are the module's existing vocabulary, the gills
 * and the stalks are the Spore Veil's own builders — `gillOrgan` and
 * `sporeStalk`, which structures/spore-veil-pelagia.mjs composes — and the
 * nursery is one builder added to `factions/pelagia.mjs` for this hull.
 * Three options went on existing builders, each defaulted so that every
 * file already committed is byte-identical: `gillOrgan`'s haze became
 * optional and its names takeable, `sporeStalk`'s names likewise, and
 * `grownBody` gained the frame its buffer is read in. Built in its state,
 * as docs/models-plan.md §3.5 says a stated hull is: the lobes spread, the
 * stalks standing, the gills open. Metre-true at 105 with no root scale —
 * the nose's pole is the bow at x 52.5 and the fluke's bevel the stern at
 * −52.5, and `metreTrue` returns 1. Port is −z (#642); every lobe, organ,
 * stalk and pouch is placed at its own signed z, one at a time, never
 * through `bothSides` (§3.6).
 *
 * What the script decided that the block does not say — the block stands
 * unamended, because none of these departs from it:
 *
 * - **Why the bed is a table and not a lathe.** Every other Commune body in
 *   this module is `loft`ed, which is a circle in section squashed in
 *   height, and a circle cannot be an oval in plan. So the bed is
 *   `grownBody`, the scouts' hand-pushed orb — with its buffer generated
 *   here by formula rather than transcribed, because this hull is built and
 *   has no binary to read (`grownBody`, `frame`). The rule: a superellipse
 *   of exponent 2.4 in plan, blunt at both ends where an ellipse would be
 *   pointed, 48 m of it forward of the crown and 42 aft on 24.5 m of
 *   half-beam, with a grown wobble of ±5 % on the radius and ±6 % on the
 *   height so that no two quarters of the rim are alike; and a section held
 *   nearly full over most of its height (sin θ raised to 0.55) instead of
 *   an ellipsoid's, closing 5.6 m up and 3.5 m down. The bed alone is 90.2
 *   by 48.5 by 9.1 m — 0.087 of its length in height, which is what
 *   "broad low" measures out as.
 * - **How broad this bed is, and against what.** 58.2 m over the lobes,
 *   vertex to vertex — 61.2 m by the box measure the intake takes, which
 *   the rolled lobes' axis-aligned boxes overstate — against the Sower's
 *   `bloom_bed` at 51.2 m, the Harvester at 51.9 and the Commune Cruiser's
 *   body at 42. The block first said "the widest Commune hull" and that is
 *   false as a reader will read it: `cruiser-pelagia.glb` spans 71.1 m, 13
 *   m more than this, and every metre of it past 42 is the two pectoral
 *   fins spread off the hull. The claim that survives measurement is the
 *   one about bodies, so the block now says so (#787 review). In unit space
 *   this bed is 0.55 of the length, where the hand-drawn outline it
 *   replaces drew 0.56.
 * - **Nine lobes, alternating, and none opposite another.** Starboard at
 *   x 36, 21, 5, −12 and −29, port at 29, 13, −4 and −21 — five and four,
 *   because a count that matched a side would be the mirror §3.6 refuses —
 *   and the nearest opposite pair is 7 m apart, where the Lure's rule
 *   (#786) is 1.5. Each its own three radii, its own yaw and its own roll,
 *   no two the same size, every one set from the rim's own beam at its
 *   station so that it stands seven tenths of its width proud of the bed
 *   and three tenths buried in it. Consecutive lobes on one flank overlap
 *   by 0.01 to 2.4 m in x, except the starboard pair at −12 and −29, which
 *   is 1.5 m clear: the block's "overlapping" is the alternating edge, and
 *   the edge alternates, so between those two sits the port lobe at −21
 *   and the bed's own rim carries the line under both — the generated
 *   outline runs 0.247 and 0.209 either side of the station with no notch
 *   (#787 review). They are
 *   chitin and ridge by turns as the Veil's six alternate deep chlorophyll
 *   and a darker teal: the scallops read by value as well as by outline.
 * - **Where the widest point is.** x 0, three metres aft of the bed's own
 *   midpoint. The Sower is the one Commune hull wider at the bow than at
 *   the waist and this is deliberately not it.
 * - **Four gill organs, which is what "paired ... along each flank" is.**
 *   Two a flank at four stations — starboard 22 and −14, port 9 and −25 —
 *   so a flank carries a pair and no organ is opposite another (§3.6). Each
 *   is the Veil's own organ at a hull's size: a mound of 6.2 by 2.1 by 4.4
 *   sunk a metre into the back, standing 1.1 m proud of the skin with its
 *   four vent slits let in 0.4 above it, rolled and yawed its own way. The
 *   slits' rule, their bearings and their breathing lines are the
 *   structure's to the float; only the metres are this hull's, because the
 *   builder's dimensions are absolute in its own frame and the Veil's are
 *   in the unit its export was drawn at.
 * - **No haze on the hull.** `gillOrgan` always added a translucent cone
 *   over each mound; it is optional now, defaulted on so the Veil's file is
 *   unchanged, and this hull passes none. The block and the subsection it
 *   sits in are explicit — "the haze is drawn around the hull and not on
 *   it", "fog over the light, never less light" — and a fog cone welded to
 *   a moving hull is the one thing that would make the 45-heard-as-18 a
 *   property of the mesh rather than of the renderer.
 * - **Six stalks, and why the rank carries a scale.** `sporeStalk`'s rule
 *   is absolute in its own frame — a stem 0.15 across whatever height it is
 *   given — because that is what reproduces the Veil's twenty-four nodes,
 *   so a hull growing them smaller takes the whole stalk down by the
 *   frame's scale and not by `H`. At ×5.0 they stand 7.3 to 11.7 m and are
 *   0.75 m across the foot, 1 in 14, where the Veil's six stand 36 to 74 m
 *   on a 170 m bed. Each its own height and leaned its own way, the rank
 *   weaving across the keel line from x 30 to −29 with no stalk on it.
 *   Their tips are clad in `bio_vein_unlit`: the block lights them grown
 *   out, which is a later band (docs/models-plan.md §3.2 rule 2), and the
 *   pods under them are spore pale and were never lamps.
 * - **What the nursery costs and what it buys.** Twelve pouches, seven to
 *   starboard and five to port, each its own size, half-sunk in the lower
 *   flank at 0.93 of the rim's beam and 1.6 m under the equator
 *   (`broodNubs`). Two of them reach the chart, at the bow where the lobes
 *   are smallest; the other ten are under the lobes, which is where the
 *   block puts them, so the row reads in the conn view's 55° and not in a
 *   straight-down bake — the Tender's lit ports are the precedent
 *   (docs/asset-prompts-3d.md, "Glow encodes loudness"). None carries a
 *   lamp: the block lights them only under way and grown out.
 * - **A blunt nose that is a lathe.** `podBody` with a name, squashed 0.34,
 *   from x 38 inside the bed's own blunt bow out to its pole at 52.5 —
 *   17.2 m across at its root and closing over the last eight metres, so it
 *   stands 6 m proud of a bow that is already 21 m across four metres
 *   behind it. A lathe because its last station is exact in x and that is
 *   what makes the file 105.000 long with no root scale; a squashed orb's
 *   bow is wherever its facets happen to fall.
 * - **The fluke, broad and short and flat.** 26.5 m across and 14.8 long —
 *   wider than long as a fluke is, its notch off the keel line and its port
 *   lobe the shorter — lying flat at y −0.5, where the Reed's stands on
 *   edge. Its aftmost edge is drawn as two points at one x, twice over, so
 *   the bevel's miter carries exactly 0.3 m aft and the stern is −52.500.
 * - **Four marks, where every other quiet Commune hull has two.** The band
 *   table's floor row says "navigation marks only" and the block's plural
 *   leaves the count to the hull, so this is a choice and the header first
 *   argued it as a necessity, wrongly: it claimed two marks would pin the
 *   calibration at its ×64 ceiling and still undershoot. They do not. Built
 *   and baked (#787 review), two marks of this hull's own 1.6 by 1.0 give
 *   raw E 0.653 against E(10) = 0.919 and the calibration reaches it by
 *   lifting ×3.15, which is well inside the window. What four buy is the
 *   direction of the gain — raw E 1.31 and a gain of ×0.703, dimming rather
 *   than lifting, which is the side of §3.2's quiet-end trap a hull wants
 *   to be on — and a plan of 4,402 m², eleven times the Reed's, with a mark
 *   at each end of both axes rather than two on a bed 58 m across. So bow,
 *   both beams and stern, 1.6 by 1.0 each and all at strength 1, none
 *   opposite another (the two beam marks are 18 m apart in x) and none on
 *   the keel line: raw E 1.31, and the gain dims rather than lifts.
 * - **Nothing points at anything.** No gun, no arm, no sac, no bloom-bed,
 *   by the block's own list — so the seeding organ the Sower and the Blight
 *   carry, and the bed of pods the Sower carries, are both absent, and the
 *   only things that leave this hull are spores it does not aim.
 *
 * The light, measured (`lightAudit`, printed on export): nav_bow 1.5 m²,
 * nav_beam_s 1.5, nav_beam_p 1.5, nav_tail 1.5 — 6.0 m² facing up on a
 * 4,402 m² plan, nothing hidden. The bake at E(10) = 0.919 reads raw E 1.31
 * → calibrated 0.92 at a gain of ×0.703: 45× above the ×1/64 floor and 91×
 * under the ×64 ceiling. 88 parts, 3,972 triangles, six materials, bounds
 * x ±52.5, y −4.3..17.6, z −30.3..30.8 by the export's box measure and
 * −28.9..29.3 by its vertices; the 21.9 m of height is the tallest stalk
 * over the fluke, and the bed under them is 9.1 m from keel to crown.
 *
 * The hand-drawn entry in silhouettes.ts stays until the kind is wired
 * (docs/models-plan.md §2). The generated outline is thirty-one vertices —
 * the longest track in the roster and the scallops are why: `outlines.mjs`
 * smooths off anything narrower along the hull than a couple of metres, so
 * the six stalks and the four organs never reach it, but a lobe is 14 to 20
 * m of x and comes through whole. Starboard runs 0.200, 0.207, 0.261,
 * 0.244, 0.276, 0.244, 0.268, 0.247, 0.209 and port −0.172, −0.243, −0.224,
 * −0.269, −0.275, −0.250, −0.272, −0.231, −0.230 — a scalloped oval,
 * widest at ±0.276 and −0.275 where the hand-drawn drew 0.28 and −0.27,
 * closing to +0.009 at the bow and +0.013 at the stern, and the two flanks'
 * scallops fall at different stations because the lobes do.
 */
import { THREE, exportGlb, metreTrue, xLong } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

/** The design length (HULL_LENGTH_M, silhouettes.ts); the file is drawn to it. */
const L = 105;
const BOW = L / 2;
const STERN = -L / 2;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const spore = pelagia.ink.sporePod();
const veinUnlit = pelagia.ink.bioVeinUnlit();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'pelagia_bower';

/* --------------------------------------------------------------------------
 * The bed. An oval in plan rather than a lathe's circle, so `grownBody`'s
 * table is the body — generated here by formula, because this hull is built
 * and has no binary to transcribe.
 *
 * The plan is a superellipse of exponent 2.4: blunt at both ends where an
 * ellipse would be pointed, 48 m of it forward of the crown and 42 aft,
 * 24.5 m of half-beam, and a grown wobble on the radius so no two quarters
 * of the rim are alike. The section is held nearly full over most of the
 * height (`Q`) and closes at the poles, 5.6 m up and 3.5 down: a bed, not
 * an ellipsoid.
 * ------------------------------------------------------------------------ */
const T = 2 / 2.4;
const LF = 48;
const LA = 42;
const HALF_BEAM = 24.5;
const CROWN = 5.6;
const KEEL = 3.5;
const Q = 0.55;
const FACETS = [18, 10];

/** The rim's radius, grown: nothing regular, and the same wobble every build. */
const wobble = (f) => 1 + 0.03 * Math.cos(3 * f + 0.6) + 0.022 * Math.sin(5 * f + 2.1);
/** The crown's own, so the back is not a turned dome either. */
const rise = (f) => 1 + 0.06 * Math.cos(2 * f + 1.2);

/** The rim at bearing `f`: f = 0 is the stern, π/2 starboard, π the bow. */
const rimX = (f) => {
  const c = Math.cos(f);
  return -(c >= 0 ? LA : LF) * Math.sign(c) * Math.abs(c) ** T * wobble(f);
};
const rimZ = (f) => {
  const s = Math.sin(f);
  return HALF_BEAM * Math.sign(s) * Math.abs(s) ** T * wobble(f);
};

const RIM = Array.from({ length: 2880 }, (_, i) => {
  const f = (2 * Math.PI * i) / 2880;
  return [f, rimX(f), rimZ(f)];
});

/** The rim's z at station `x` on `sgn`'s flank — where a lobe or a nub sits. */
const beamAt = (x, sgn) => {
  let best = 0;
  let bd = Infinity;
  for (const [, rx, rz] of RIM) {
    if (Math.sign(rz) !== sgn) continue;
    const d = Math.abs(rx - x);
    if (d < bd) {
      bd = d;
      best = rz;
    }
  }
  return best;
};

/** The back's height over the plan point (x, z): the skin an organ sits in. */
const backAt = (x, z) => {
  const a = Math.atan2(z, x);
  let best = RIM[0];
  let bd = Infinity;
  for (const r of RIM) {
    let d = Math.abs(Math.atan2(r[2], r[1]) - a);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d < bd) {
      bd = d;
      best = r;
    }
  }
  const g = Math.min(1, Math.hypot(x, z) / Math.hypot(best[1], best[2]));
  return CROWN * rise(best[0]) * Math.sqrt(Math.max(0, 1 - g ** (2 / Q)));
};

const [W, H] = FACETS;
const BUFFER = [[0, CROWN, 0]];
for (let iy = 1; iy < H; iy++) {
  const th = (Math.PI * iy) / H;
  const g = Math.sin(th) ** Q;
  const cy = Math.cos(th);
  for (let ix = 0; ix < W; ix++) {
    const f = (2 * Math.PI * ix) / W;
    BUFFER.push([g * rimX(f), (cy >= 0 ? CROWN : KEEL) * cy * rise(f), g * rimZ(f)]);
  }
}
BUFFER.push([0, -KEEL, 0]);

pelagia.grownBody(root, chitin, { name: 'hull', facets: FACETS, buffer: BUFFER, frame: xLong });

// The blunt grown nose: a squashed lathe closing at the bow, its root eight
// metres inside the bed's own blunt bow.
pelagia.podBody(root, ridge, {
  name: 'grown_nose',
  squash: 0.34,
  facets: 12,
  profile: [
    [38, 8.6],
    [42, 8.2],
    [45, 7.2],
    [47.5, 5.8],
    [49.5, 4.2],
    [51.2, 2.4],
    [BOW, 0.02],
  ],
});

// The edge: nine overlapping lobes alternating a side at a time, each its
// own size and set its own way, and no lobe opposite another.
const LOBES = [
  ['s', 36, [7.4, 2.4, 4.9], 0.16, -0.07, chitin],
  ['p', 29, [8.6, 2.7, 5.8], -0.11, 0.05, ridge],
  ['s', 21, [9.2, 2.9, 6.4], 0.08, 0.09, ridge],
  ['p', 13, [9.6, 3.1, 6.8], -0.19, -0.06, chitin],
  ['s', 5, [9.8, 3.2, 6.9], 0.13, -0.1, chitin],
  ['p', -4, [9.4, 3.0, 6.6], -0.06, 0.08, ridge],
  ['s', -12, [9.0, 2.9, 6.2], 0.2, 0.04, ridge],
  ['p', -21, [8.2, 2.6, 5.5], -0.14, -0.09, chitin],
  ['s', -29, [7.0, 2.3, 4.6], 0.05, 0.12, chitin],
];
const lobeCount = { s: 0, p: 0 };
for (const [side, x, scale, yaw, roll, skin] of LOBES) {
  const sgn = side === 's' ? 1 : -1;
  const z = beamAt(x, sgn) - sgn * 0.3 * scale[2];
  pelagia.lobe(root, skin, {
    name: `edge_lobe_${side}_${lobeCount[side]++}`,
    facets: [10, 6],
    at: [x, -0.3, z],
    rot: [roll, yaw, 0],
    scale,
  });
}

// Gill organs let into the back, two a flank, with their vent slits and a
// breathing line beside each — clad, because the block lights them only
// under way. No haze: the cloud is drawn around the hull and never on it.
const ORGANS = [
  ['s0', 22, 0.62, -0.22, 1],
  ['p0', 9, 0.62, 0.18, -1],
  ['s1', -14, 0.6, -0.3, 1],
  ['p1', -25, 0.58, 0.26, -1],
];
for (const [side, x, out, yaw, sgn] of ORGANS) {
  const z = out * beamAt(x, sgn);
  pelagia.gillOrgan(
    root,
    { mound: membrane, slit: chitin, breath: veinUnlit },
    {
      side,
      sep: '_',
      at: [x, backAt(x, z) - 1.0, z],
      yaw,
      mound: { facets: [10, 6], scale: [6.2, 2.1, 4.4], roll: sgn * 0.14 },
      slits: {
        count: 4,
        yaw0: -0.5,
        pitch: 0.34,
        reach: [4.2, 4.5],
        y: [1.25, 1.35],
        lift: 2.6,
        sink: 1.2,
        slit: [0.45, 1.5, 3.2],
        breath: [0.22, 1.6, 2.9],
      },
    }
  );
}

// A swaying rank of spore stalks standing off the back, each its own height
// and leaned its own way. Their tips are clad: a grown-out lamp, not a
// resting one. The stalk's rule is absolute in its own frame, so the rank
// is taken down to a hull's size by the frame's scale rather than by H.
const STALK_SCALE = 5.0;
const STALKS = [
  [1, 2.2, 30, -5, [-0.1, 0, 0.16]],
  [2, 1.68, 17, 6, [0.2, 0, -0.08]],
  [3, 2.34, 4, -8, [0.07, 0, 0.22]],
  [4, 1.46, -6, 7, [-0.18, 0, -0.14]],
  [5, 1.98, -17, -4, [-0.05, 0, 0.09]],
  [6, 2.24, -29, 5, [0.24, 0, 0.11]],
];
for (const [n, h, x, z, lean] of STALKS)
  pelagia.sporeStalk(
    root,
    { lower: ridge, upper: membrane, pod: spore, tip: veinUnlit },
    {
      name: `stalk_${n}`,
      sep: '_',
      H: h,
      ...pelagia.verbatim([x, backAt(x, z) - 0.3, z], lean, [
        STALK_SCALE,
        STALK_SCALE,
        STALK_SCALE,
      ]),
    }
  );

// The nursery: brood pouches showing through the shell as rows of paler
// nubs along each flank, under the lobes. Seven to starboard, five to port.
const nubRow = (sgn, row) => row.map(([x, r]) => [x, -1.6, 0.93 * beamAt(x, sgn), r]);
pelagia.broodNubs(root, spore, {
  rows: [
    {
      side: 's',
      squash: 0.55,
      nubs: nubRow(1, [
        [42, 1.0],
        [33, 1.5],
        [24, 1.7],
        [13, 1.8],
        [1, 1.7],
        [-11, 1.5],
        [-24, 1.2],
      ]),
    },
    {
      side: 'p',
      squash: 0.52,
      nubs: nubRow(-1, [
        [37, 1.3],
        [26, 1.6],
        [9, 1.75],
        [-6, 1.55],
        [-20, 1.25],
      ]),
    },
  ],
});

// The muscle-drive fluke astern: broad and short, one paddle lying flat.
const BEVEL = 0.3;
pelagia.driveFluke(root, membrane, {
  y: -0.5,
  t: 0.7,
  bevel: BEVEL,
  outline: [
    [-38.0, 3.4],
    [-41.2, 7.8],
    [-44.6, 11.4],
    [-48.2, 13.1],
    [-51.2, 12.2],
    [STERN + BEVEL, 9.4],
    [STERN + BEVEL, 4.6],
    [-50.2, 0.8],
    [STERN + BEVEL, -4.2],
    [STERN + BEVEL, -9.2],
    [-50.8, -12.0],
    [-47.6, -12.8],
    [-44.2, -10.6],
    [-41.0, -6.6],
    [-38.2, -2.6],
  ],
});

// "Nearly black at rest, navigation marks only": four marks on a hull this
// broad — bow, both beams and stern — none opposite another.
pelagia.navMarks(root, light, {
  marks: [
    ['nav_bow', 38, backAt(38, 1.6) + 0.2, 1.6],
    ['nav_beam_s', 10, backAt(10, 16.5) + 0.2, 16.5],
    ['nav_beam_p', -8, backAt(-8, -17.2) + 0.2, -17.2],
    ['nav_tail', -46, 0.35, -4.0],
  ],
  w: 1.6,
  h: 0.5,
  d: 1.0,
});

metreTrue(root, L, { drawn: L });
await exportGlb(root, 'bower-pelagia.glb');
