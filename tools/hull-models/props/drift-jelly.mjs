/**
 * The drift jelly — 6 m of footprint, the one drifting body of the
 * free-water crater: a solitary medusa hanging in the open water, which
 * the owner commissioned in session on 20 November 2026 for the High
 * graphics quality's third look step (#1837). Public decoration under the
 * sixth clause of Block 4's public-microfauna variant of ENV STYLE, not an
 * animal of the bestiary: no SIG, no entity, no collision, and nothing lit
 * in the file.
 *
 * "Crater open water, suspended | env-drift-jelly | 6 m | 10.97 m | ≤ 700 |
 * none" (docs/asset-prompts-3d.md, Block 4). Two materials, `fish_flank` on
 * the bell and its photophore seats and `stone_dark` on the lappets, the
 * manubrium and the arms; 682 triangles; 10.97 m tall (10.9725) at its 6 m
 * by intake's measure (`sizeM`), which takes `--footprint-m 6 --max-tris
 * 700` for this row and no `--world-light`: the file carries no emissive,
 * the row's Light is `none`, and the six seats below are the runtime's to
 * light.
 *
 * Authored as a formula rather than ported: there is no export, as the
 * five microfauna before it have none (#1711, #1777). Every number below is
 * drawn from one seeded stream (seabed.mjs `seeded`, seed 1837) in the
 * order the parts are built — the bell ring by ring, each ring's six panels
 * and then its twelve corners; the twelve lappets round the hem; the
 * manubrium; the five arms, each arm's figures (six for the middle arm,
 * which takes no splay, seven for the rest) and then its rings; the seats
 * draw nothing — so the file is the same on every machine and
 * `npm run check:models` holds the script to it. The whole is built at its
 * own size, centred on its plan, lowered to the ground and held at the
 * footprint before the bake (seabed.mjs `settle`), ×0.9993, so the root is
 * an identity and seabed.mjs `stand` finds ×1.000. The tables below are the
 * nominal figures the stream draws from, heights over the hem; the prose
 * gives the file's, over the origin, which the script prints.
 *
 * What it is made of, and why this shape. It is the microfauna's grammar
 * (seabed.mjs, "The microfauna") stood on end: the bell is one `shaft` as
 * the crab's shell is, its lappets `blade`s rooted through the skin as a
 * fin is, its manubrium and arms the same shaft again, its seats the deep
 * fish's `seat`. What it must not be decided the rest. The Tetherjelly is
 * a colony of the bestiary and a mark of the tactical layer: a stipple
 * bell 44 m across and 16 high, a dome 0.36 as tall as it is wide, with a
 * rim and six tentacles 44 m long evenly round it (faunaStipple.ts
 * `bellOffsets`), and at Tier 3 "a bell over three tethers"
 * (faunaAgentStipple.ts). The Hollow's classified figure is "an open
 * crescent", a gape. So this is one animal under a seventh of a stipple
 * bell across, and:
 *
 * - its bell is a helmet's and not a dome's, 4.56 m from hem to apex on
 *   5.69 by 5.93 m, 0.77–0.80 as tall as it is wide;
 * - it is closed underneath, a shallow cone and no hollow, because an open
 *   bell seen from the side is a crescent;
 * - its margin is scalloped, twelve lappets in the second material, where
 *   the stipple's rim is a plain ring;
 * - it trails five thick arms from one boss in its middle — not six round
 *   the rim, not three, and no fringe: no ring of any arm is under 0.25 m
 *   through, which the script holds — of five lengths, on uneven bearings,
 *   so that no view lines them up as two pairs and reads as legs (four
 *   arms spaced near 90° do, seen along a diagonal), and the middle one
 *   always fills the gap;
 * - nothing coils and nothing is jawed: each arm hangs in one slow bend
 *   and ends blunt, its last ring 0.43–0.45 m across.
 *
 * A medusa has no bow, so nothing here swims: the pose is the hang, the
 * bell turns into itself six times about its axis, and a slow turn about
 * that axis reads as drift.
 *
 * - `bell`, in `fish_flank`: a shaft of six twelve-cornered rings stood on
 *   end, fanned up to an apex point and down to an underside point 0.36 m
 *   under the hem. Six panels of 40° with six rib strips of 20° between
 *   them — corners 20° either side of 0°, 60°, … 300° from +x toward +z —
 *   so the bell is a lantern of six gores. From the hem up, in the file:
 *   the hem at y 6.39–6.43, 2.87–2.93 m from the axis; the collar's head,
 *   the widest ring, at y 7.23–7.35 and 2.95–3.04 m, so the hem tucks in
 *   under it; a crease at y 7.47–7.64 where the wall steps in to
 *   2.72–2.84 m; then the dome through y 8.63–8.77 at 2.55–2.68 m, y
 *   9.74–9.86 at 2.01–2.16 m and y 10.55–10.63 at 1.06–1.11 m to the apex
 *   at y 10.97. Every corner is pushed in or out by 1–3 % of its radius
 *   and lifted or dropped by 1.5–3 cm, and every panel once more as a
 *   whole (`lobe`, up to 4 % and 9 cm), both its corners together, so the
 *   collar is lobed rather than turned. Every band quad is cut on the same
 *   diagonal: a body with no port and starboard has no plane for
 *   `splitAC` to mirror about. 144 triangles.
 * - `lappet_1..6`, in `stone_dark`: the broad lappets, one under each
 *   panel's hem, six-cornered blades 10 cm thick, 1.90 m across at their
 *   widest and 0.87 m across their ends, which hang at y 5.28–5.40, a
 *   metre under the hem. `lappet_1_small..6_small` the small ones, one
 *   under each rib strip, four-cornered, 0.73 m across narrowing to 0.56,
 *   ending at y 5.67–5.78. Each is drawn ±8 % in length. Each lies along
 *   its facet's hem edge, 9 cm inboard of it, and hangs 14° out of the
 *   vertical where the collar over it tucks in, so the fringe flares from
 *   under the hem; its root is 16 cm up its own plane inside the bell, and
 *   the script asserts the four buried corners of every one are inside
 *   the closed bell (seabed.mjs `insideBody`). 20 and 12 triangles each,
 *   192 in all.
 * - `manubrium`, in `stone_dark`: the boss the arms hang from, a shaft of
 *   three eight-cornered rings capped flat at both ends, y 5.40–6.90 in
 *   the file — its top ring half a metre over the hem inside the bell
 *   (asserted, corner by corner), its cap a metre under the hem behind the
 *   fringe — 1.79 m in radius at its top ring, 1.76 half a metre under the
 *   hem and 1.35 at the cap, each corner drawn ±4 %. 44 triangles.
 * - `arm_1..5`, in `stone_dark`: the oral arms, each a shaft of five
 *   six-cornered rings from a root ring inside the manubrium (asserted) at
 *   y 6.01 down to a point 4 % of its length under its last ring. A
 *   flattened section, in the file 0.62–0.64 m across at the root,
 *   0.87–0.96 at 12 and 40 % of the way down, 0.72–0.75 at 72 % and
 *   0.43–0.45 at 96 %, and 0.37, 0.41–0.43, 0.38–0.40, 0.30–0.32 and
 *   0.27–0.28 m through at the same five rings (the least width across
 *   the section's flats, which is 1.73 and not 2 times the table's
 *   half-thickness), the wide way radial at the root and turned 110–170°
 *   by the end, odd arms one way and even the other, so each is a ribbon
 *   turning on itself; an outer arm's axis splays 0.15–0.4 m outward by
 *   its end, and every arm's sways along and across its bearing in one
 *   slow bend, up to 0.3–0.5 m at the end of the longest and less in
 *   proportion on a shorter one, so none takes an elbow. `arm_1` hangs
 *   from the axis, 6.01 m long, and its end is the lowest point, on
 *   y = 0; `arm_2..5` hang 1.14 m out on bearings 16.6°, 81.7°, 156.6° and
 *   263.4° (20°, 80°, 155° and 265° drawn ±5°; gaps of 65°, 75°, 107° and
 *   113°), 4.92, 3.50, 5.32 and 4.09 m long. None reaches further than
 *   1.82 m from the axis, inside the fringe at 3.04; the script holds
 *   every arm to three quarters of the bell's reach. 58 each, 290 in all.
 * - `photophore_01..06`, in `fish_flank`, the bell's own material: six
 *   lozenges of 30 by 16 cm, two triangles each, each lying 2 cm proud of
 *   the collar facet it sits on and facing its way: the seats of the
 *   runtime's lights, dark in the file. One at the foot of each rib strip,
 *   over its small lappet and between two broad ones, where a medusa
 *   carries its marginal sense organs; on the middle of the facet's cut
 *   diagonal, half way up the collar at y 6.83–6.88 and 2.92–2.95 m from
 *   the axis, its long way round the rim (seabed.mjs `seat`, `along`). On
 *   bearings 210.18°, 270.11°, 330.18°, 30.23°, 90.21° and 150.22° from +x
 *   toward +z, 60° apart within 0.1°: `_01` to `_03` round the port side
 *   (−z), `_04` to `_06` on round the starboard, one continuous round.
 *   Each faces 3–11° below the level, the collar tucking in under its
 *   head. 12 triangles. The script asserts all six are there, in
 *   `fish_flank`, 2 cm off their facet by the triangles the file carries,
 *   with no emissive, within a degree of their bearings and three a side;
 *   it measures each where the runtime reads it, the middle of the node's
 *   box (environmentModels.ts `buildTemplate`).
 *
 * Port is −z. Every lappet roots in the bell, the manubrium in the bell
 * and every arm in the manubrium — the sweep lists those eighteen pairs
 * and nothing else, no arm against an arm or a lappet — and the seats
 * against nothing, 2 cm off the skin, so nothing floats but the seats,
 * which mean to. The root is `env_drift_jelly`, an identity, the plan's box
 * centred on the origin: 5.89 m along x and 6.00 across z, the bell alone
 * 5.69 by 5.93. The bell's axis stands 2 cm off the origin (x 0.002, z
 * 0.020), and no vertex stands more than 3.06 m from the origin, so turned
 * to any heading the body keeps inside a circle 6.11 m across. The runtime
 * hangs it at an authored depth, and nothing here says where in the column
 * it belongs.
 */
import { THREE, add, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 6;
const MAX_TRIS = 700;
const SEED = 1837;

const flank = seabed.ground.fishFlank();
const dark = seabed.ground.stoneDark();

const jelly = new THREE.Group();
jelly.name = 'env_drift_jelly';

const draw = seabed.seeded(SEED);
const rad = (deg) => (deg * Math.PI) / 180;
const middle = (ring) => ring.reduce((m, p) => m.map((v, i) => v + p[i] / ring.length), [0, 0, 0]);

// --- the bell ------------------------------------------------------------------
// Six panels and six rib strips: twelve corners a ring, a panel 40° of the
// round and a strip 20°, so corners 2k and 2k + 1 stand 20° either side of
// panel k's bearing, 60° k from +x toward +z.
const SECTORS = 6;
const CORNERS = 2 * SECTORS;
const PANEL = rad(20);
const bearing = (k) => (2 * Math.PI * k) / SECTORS;
const cornerAt = (j) => bearing(Math.floor(j / 2)) + (j % 2 ? PANEL : -PANEL);
// Rings from the hem up: radius, height over the hem, how far a corner may
// be pushed (of its radius) and lifted (metres), and `lobe`, the same pair
// drawn once a panel and given to both its corners, so a panel swells or
// sinks whole and the strips slant between neighbours.
const BELL = [
  { r: 2.9, y: 0.0, push: 0.01, lift: 0.015, lobe: [0.01, 0.02] },
  { r: 3.0, y: 0.88, push: 0.012, lift: 0.02, lobe: [0.015, 0.05] },
  { r: 2.8, y: 1.16, push: 0.015, lift: 0.02, lobe: [0.025, 0.09] },
  { r: 2.68, y: 2.28, push: 0.02, lift: 0.03, lobe: [0.035, 0.08] },
  { r: 2.08, y: 3.43, push: 0.025, lift: 0.03, lobe: [0.04, 0.07] },
  { r: 1.1, y: 4.2, push: 0.03, lift: 0.025, lobe: [0.04, 0.04] },
];
const APEX = [0, 4.57, 0];
const UNDER = [0, -0.36, 0];
const bellRings = BELL.map(({ r, y, push, lift, lobe }) => {
  const lobes = Array.from({ length: SECTORS }, () => ({
    push: draw.between(-lobe[0], lobe[0]),
    lift: draw.between(-lobe[1], lobe[1]),
  }));
  return Array.from({ length: CORNERS }, (_, j) => {
    const t = cornerAt(j);
    const own = lobes[Math.floor(j / 2)];
    const p = r * (1 + own.push + draw.between(-push, push));
    return [p * Math.cos(t), y + own.lift + draw.between(-lift, lift), p * Math.sin(t)];
  });
});
// Every band quad cut the same way round, so the skin turns into itself six
// times about the axis: a body with no port and starboard has no mirror
// plane for `splitAC` to cut about.
const bell = seabed.shaft(bellRings, { start: UNDER, end: APEX, split: () => true });
add(jelly, 'bell', bell, flank);

/** Facet i of the collar, the band between the hem and the ring over it. */
const collar = (i) => {
  const lo = middle(bellRings[0]);
  const hi = middle(bellRings[1]);
  return seabed.bandFacet(
    bellRings,
    0,
    i,
    true,
    lo.map((v, c) => (v + hi[c]) / 2)
  );
};

// --- the lappets -----------------------------------------------------------------
// One under every facet of the hem, a broad one under a panel and a small
// one under a rib strip: a blade along its facet's hem edge, hung FLARE out
// of the vertical where the collar over it tucks in, and SINK inboard of
// the edge, so it roots through the skin over the hem and comes out of the
// underside just inside it.
const LAPPET_T = 0.1;
const SINK = LAPPET_T / 2 + 0.04;
const LAPPET_ROOT = 0.16;
const FLARE = rad(14);
const lappets = [];
for (let i = 0; i < CORNERS; i++) {
  const broad = i % 2 === 0;
  const [A, B] = collar(i).corners;
  const along = new THREE.Vector3().subVectors(B, A);
  const W = along.length();
  along.normalize();
  // Outward and level, square to the hem edge.
  const radial = new THREE.Vector3(along.z, 0, -along.x).normalize();
  if (radial.dot(new THREE.Vector3(A.x + B.x, 0, A.z + B.z)) < 0) radial.negate();
  const down = new THREE.Vector3(0, -Math.cos(FLARE), 0).addScaledVector(radial, Math.sin(FLARE));
  down.addScaledVector(along, -down.dot(along)).normalize();
  const out = new THREE.Vector3().crossVectors(along, down);
  if (out.dot(radial) < 0) out.negate();
  const root = A.clone().addScaledVector(radial, -SINK);
  const len = (broad ? 1.09 : 0.7) * draw.between(0.92, 1.08);
  const outline = broad
    ? [
        [0.15 * W, -LAPPET_ROOT],
        [0.85 * W, -LAPPET_ROOT],
        [0.98 * W, 0.42 * len],
        [0.72 * W, len],
        [0.28 * W, len],
        [0.02 * W, 0.42 * len],
      ]
    : [
        [0.14 * W, -LAPPET_ROOT],
        [0.86 * W, -LAPPET_ROOT],
        [0.78 * W, len],
        [0.22 * W, len],
      ];
  const name = `lappet_${Math.floor(i / 2) + 1}${broad ? '' : '_small'}`;
  add(
    jelly,
    name,
    seabed.fin({
      root: root.toArray(),
      along: along.toArray(),
      span: down.toArray(),
      outline,
      thickness: LAPPET_T,
    }),
    dark
  );
  // The two buried corners, on both faces of the blade.
  const buried = [];
  for (const [a, b] of outline.slice(0, 2))
    for (const s of [-1, 1])
      buried.push(
        root
          .clone()
          .addScaledVector(along, a)
          .addScaledVector(down, b)
          .addScaledVector(out, (s * LAPPET_T) / 2)
      );
  lappets.push({ name, buried });
}

// --- the manubrium ----------------------------------------------------------------
// The boss under the bell the arms hang from: eight corners a ring, from a
// ring inside the bell down to a flat cap under it.
const BOSS = [
  { r: 1.79, y: 0.47 },
  { r: 1.76, y: -0.47 },
  { r: 1.35, y: -0.99 },
];
const bossRings = BOSS.map(({ r, y }) =>
  Array.from({ length: 8 }, (_, j) => {
    const t = rad(45 * j + 20);
    const p = r * (1 + draw.between(-0.04, 0.04));
    return [p * Math.cos(t), y + draw.between(-0.03, 0.03), p * Math.sin(t)];
  })
);
const boss = seabed.shaft(bossRings);
add(jelly, 'manubrium', boss, dark);

// --- the arms ---------------------------------------------------------------------
/**
 * One oral arm: a shaft of five six-cornered rings, flattened, hung from a
 * root ring inside the manubrium down to a blunt end. Its axis leaves
 * `rootR` from the bell's on `az`, falls `length`, splays `splay` further
 * out by its end and sways along and across its bearing, more the further
 * down; its section at station i reaches `ARM_W[i]` to each side the wide
 * way and `ARM_FLAT[i]` of that the other, a hexagon whose flats are
 * therefore 1.73 times that apart, the wide way radial at the root and
 * turned `twist` by the end, so each hangs as a ribbon turning on itself.
 * Every corner's radius is drawn ±6 %. The last ring is the stoutest for
 * its width, so no arm thins to a tentacle before it ends.
 */
const ARM_T = [0, 0.12, 0.4, 0.72, 0.96];
const ARM_W = [0.32, 0.46, 0.46, 0.36, 0.22];
const ARM_FLAT = [0.66, 0.52, 0.48, 0.5, 0.72];
const ARM_ROOT_Y = -0.4;
function arm({ az, rootR, length, splay, twist, swayR, swayT, phase }) {
  const er = [Math.cos(az), 0, Math.sin(az)];
  const et = [-Math.sin(az), 0, Math.cos(az)];
  const axis = (t) => {
    const r = rootR + splay * t + swayR * t * Math.sin(2 * Math.PI * (0.55 * t) + phase);
    const s = swayT * t * Math.sin(2 * Math.PI * (0.45 * t) + 1.7 * phase);
    return [er[0] * r + et[0] * s, ARM_ROOT_Y - length * t, er[2] * r + et[2] * s];
  };
  const rings = ARM_T.map((t, i) => {
    const [cx, cy, cz] = axis(t);
    const turn = az + twist * t;
    const major = [Math.cos(turn), Math.sin(turn)];
    const minor = [-Math.sin(turn), Math.cos(turn)];
    return Array.from({ length: 6 }, (_, j) => {
      const a = (2 * Math.PI * j) / 6;
      const push = 1 + draw.between(-0.06, 0.06);
      const p = ARM_W[i] * push * Math.cos(a);
      const q = ARM_W[i] * ARM_FLAT[i] * push * Math.sin(a);
      return [cx + major[0] * p + minor[0] * q, cy, cz + major[1] * p + minor[1] * q];
    });
  });
  return { geo: seabed.shaft(rings, { end: axis(1) }), rings };
}
// The middle arm first, the longest, then four round it on uneven gaps
// (60°, 75°, 110° and 115°), so no bearing lines them up as two pairs.
const LONGEST = 6.2;
const ARMS = [
  { deg: 0, rootR: 0, length: LONGEST, splay: 0 },
  { deg: 20, rootR: 1.14, length: 4.9 },
  { deg: 80, rootR: 1.14, length: 3.4 },
  { deg: 155, rootR: 1.14, length: 5.4 },
  { deg: 265, rootR: 1.14, length: 4.15 },
];
// A sway is drawn for the longest arm and scaled to each arm's own length,
// so a short arm bends as gently as a long one and none takes an elbow.
const arms = ARMS.map(({ deg, rootR, length, splay }, i) => {
  const made = arm({
    az: rad(deg + draw.between(-5, 5)),
    rootR,
    length: length * draw.between(0.96, 1.04),
    splay: splay ?? draw.between(0.15, 0.4),
    twist: (i % 2 ? -1 : 1) * rad(draw.between(110, 170)),
    swayR: (draw.between(0.3, 0.5) * length) / LONGEST,
    swayT: (draw.between(0.3, 0.5) * length) / LONGEST,
    phase: draw.between(0, 2 * Math.PI),
  });
  const name = `arm_${i + 1}`;
  add(jelly, name, made.geo, dark);
  return { name, ...made };
});

// --- the photophore seats ----------------------------------------------------------
// One at the foot of each rib strip, on the collar, on the middle of the
// strip's cut diagonal, its long way round the rim: `_01` to `_03` round
// the port side from 210°, `_04` to `_06` on round the starboard side.
const PROUD = 0.02;
const SEAT = [0.3, 0.16];
const seats = [];
for (let n = 0; n < SECTORS; n++) {
  const k = (n + 3) % SECTORS;
  const theta = bearing(k) + Math.PI / SECTORS;
  const { geo } = seabed.seat(collar(2 * k + 1), null, SEAT, PROUD, {
    along: [-Math.sin(theta), 0, Math.cos(theta)],
  });
  seats.push(add(jelly, `photophore_${String(n + 1).padStart(2, '0')}`, geo, flank));
}

// --- the roots, the fit, the checks, then out ---------------------------------------
// Everything that roots, roots inside what it hangs from, in the nominal
// frame before the fit (seabed.mjs `insideBody`).
for (const { name, buried } of lappets)
  buried.forEach((p, i) => {
    if (!seabed.insideBody(bell, p.toArray()))
      throw new Error(`env_drift_jelly: ${name} root corner ${i} is outside the bell`);
  });
bossRings[0].forEach((p, i) => {
  if (!seabed.insideBody(bell, p))
    throw new Error(`env_drift_jelly: manubrium root corner ${i} is outside the bell`);
});
for (const { name, rings } of arms)
  rings[0].forEach((p, i) => {
    if (!seabed.insideBody(boss, p))
      throw new Error(`env_drift_jelly: ${name} root corner ${i} is outside the manubrium`);
  });

const fit = seabed.settle(jelly, FOOTPRINT);
const { drawn, k: held } = seabed.stand(jelly, FOOTPRINT, { drawn: FOOTPRINT });
const t = seabed.tally(jelly);
const size = new THREE.Box3().setFromObject(jelly).getSize(new THREE.Vector3());
if (t.tris > MAX_TRIS) throw new Error(`env_drift_jelly: ${t.tris} triangles over ${MAX_TRIS}`);
if (t.materials.size !== 2 || !t.materials.has('fish_flank') || !t.materials.has('stone_dark'))
  throw new Error(`env_drift_jelly: materials [${[...t.materials]}], not fish_flank and stone_dark`);
if (Math.abs(t.lowest) > 1e-6)
  throw new Error(`env_drift_jelly: lowest vertex at ${t.lowest}, not on the ground`);
if (t.onFloor.length !== 1 || t.onFloor[0] !== 'arm_1')
  throw new Error(`env_drift_jelly: on the ground [${t.onFloor}], not the middle arm alone`);
if (t.reach.x > FOOTPRINT / 2 + 1e-3 || t.reach.z > FOOTPRINT / 2 + 1e-3)
  throw new Error(
    `env_drift_jelly: reaches ${t.reach.x} by ${t.reach.z} from the origin, past ${FOOTPRINT / 2}`
  );
jelly.traverse((o) => {
  if (o.isMesh && o.material.emissive.getHex() !== 0)
    throw new Error(`env_drift_jelly: ${o.name} carries an emissive`);
});

// What the file measures. The bell's axis is its apex, which the script
// put on it, and `inFile` carries a nominal point through the fit the same
// way; a part's reach is its furthest vertex from that axis.
const part = (name) => jelly.getObjectByName(name);
const boxOf = (name) => new THREE.Box3().setFromObject(part(name));
const bellPos = part('bell').geometry.attributes.position;
let apex = new THREE.Vector3(0, -Infinity, 0);
for (let i = 0; i < bellPos.count; i++)
  if (bellPos.getY(i) > apex.y) apex = new THREE.Vector3().fromBufferAttribute(bellPos, i);
const inFile = (p) =>
  new THREE.Vector3(...p).sub(new THREE.Vector3(...APEX)).multiplyScalar(fit).add(apex);
const reachOf = (name, from = apex) => {
  const p = part(name).geometry.attributes.position;
  let far = 0;
  for (let i = 0; i < p.count; i++)
    far = Math.max(far, Math.hypot(p.getX(i) - from.x, p.getZ(i) - from.z));
  return far;
};
const span = (values) => [Math.min(...values), Math.max(...values)];
const ringsInFile = bellRings.map((ring) => {
  const at = ring.map(inFile);
  return {
    y: span(at.map((p) => p.y)),
    r: span(at.map((p) => Math.hypot(p.x - apex.x, p.z - apex.z))),
  };
});
const hem = ringsInFile[0];
const lappetNames = lappets.map((l) => l.name);
const armNames = arms.map((a) => a.name);
const most = (names, fn) => Math.max(...names.map((n) => fn(n)));
const ORIGIN = new THREE.Vector3();
const swept = most(['bell', ...lappetNames, ...armNames], (n) => reachOf(n, ORIGIN));
// The arms hang inside the fringe: none reaches three quarters as far from
// the axis as the bell does, so the footprint is the bell's and never an
// arm's.
const armReach = most(armNames, reachOf);
if (armReach > 0.75 * reachOf('bell'))
  throw new Error(`env_drift_jelly: an arm reaches ${armReach.toFixed(3)} m from the axis`);
// How thin the thinnest arm ring is: the least width of each ring's
// six-cornered section, across whichever of its edges it is narrowest. An
// arm is an arm and not a tentacle while this holds.
const through = (ring) => {
  let least = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const [ax, , az] = ring[i];
    const [bx, , bz] = ring[(i + 1) % ring.length];
    const len = Math.hypot(bx - ax, bz - az);
    const far = Math.max(
      ...ring.map(([x, , z]) => Math.abs((bx - ax) * (z - az) - (bz - az) * (x - ax)) / len)
    );
    least = Math.min(least, far);
  }
  return least * fit;
};
const across = (ring) =>
  Math.max(...ring.flatMap(([x, , z]) => ring.map(([u, , w]) => Math.hypot(x - u, z - w)))) * fit;
const throughAt = ARM_T.map((_, i) => span(arms.map(({ rings }) => through(rings[i]))));
const acrossAt = ARM_T.map((_, i) => span(arms.map(({ rings }) => across(rings[i]))));
const thinnest = Math.min(...throughAt.map(([least]) => least));
if (thinnest < 0.25)
  throw new Error(`env_drift_jelly: an arm ring is ${thinnest.toFixed(3)} m through, under 0.25`);
// Where each arm leaves the manubrium and where it ends, from the axis.
const armsInFile = arms.map(({ name, rings }) => {
  const root = inFile(middle(rings[0]));
  const end = boxOf(name).min.y;
  const p = part(name).geometry.attributes.position;
  let tip = null;
  for (let i = 0; i < p.count; i++)
    if (p.getY(i) < end + 1e-6) tip = new THREE.Vector3().fromBufferAttribute(p, i);
  return {
    name,
    rootR: Math.hypot(root.x - apex.x, root.z - apex.z),
    rootAz: ((Math.atan2(root.z - apex.z, root.x - apex.x) * 180) / Math.PI + 360) % 360,
    rootY: root.y,
    length: root.y - end,
    endR: Math.hypot(tip.x - apex.x, tip.z - apex.z),
  };
});

// The six seats: present, in the bell's material, two triangles each, PROUD
// off the skin by the triangles the file carries (the whole was scaled by
// `fit` since, so the measure is scaled with it), 60° apart round the axis
// to a degree, and three on each side of it.
if (seats.length !== 6) throw new Error(`env_drift_jelly: ${seats.length} photophore seats, not 6`);
const where = seats.map((mesh, i) => {
  const name = `photophore_${String(i + 1).padStart(2, '0')}`;
  if (mesh.name !== name || mesh.material.name !== 'fish_flank' || mesh.material.emissive.getHex())
    throw new Error(`env_drift_jelly: ${mesh.name} is not a dark ${name} in fish_flank`);
  const p = mesh.geometry.attributes.position;
  if (p.count !== 6) throw new Error(`env_drift_jelly: ${name} is ${p.count / 3} triangles, not 2`);
  // The centre the runtime reads: the middle of the node's box
  // (environmentModels.ts `buildTemplate`).
  const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  const facet = seabed.nearestFacet(part('bell').geometry, c.toArray());
  const normal = facet.normal.clone().normalize();
  const off = c.clone().sub(facet.centroid).dot(normal);
  if (Math.abs(off - PROUD * fit) > 0.001)
    throw new Error(
      `env_drift_jelly: ${name} stands ${off.toFixed(4)} m off its facet, not ${PROUD * fit}`
    );
  const az = ((Math.atan2(c.z - apex.z, c.x - apex.x) * 180) / Math.PI + 360) % 360;
  const want = (210 + 60 * i) % 360;
  if (Math.abs(((az - want + 540) % 360) - 180) > 1)
    throw new Error(`env_drift_jelly: ${name} bears ${az.toFixed(2)}°, not ${want}°`);
  if (Math.sign(c.z) !== (i < 3 ? -1 : 1))
    throw new Error(`env_drift_jelly: ${name} is on the wrong side of the axis`);
  return { name, c, off, az, r: Math.hypot(c.x - apex.x, c.z - apex.z), tilt: normal.y };
});
const seatY = where.map((w) => w.c.y);

const f = (v, d = 3) => v.toFixed(d);
const bellSize = boxOf('bell').getSize(new THREE.Vector3());
const under = boxOf('bell').min.y;
console.log(
  `env_drift_jelly: ${t.tris} triangles, fit ×${f(fit, 4)}, drawn ${f(drawn, 4)} across, held at ${FOOTPRINT} m (×${f(held, 5)}), ` +
    `${f(size.x, 2)} by ${f(size.z, 2)} by ${f(size.y, 4)} m tall, materials ${[...t.materials].join(' + ')}, on the ground: ${t.onFloor.join(', ')}\n` +
    `  bell: apex y ${f(apex.y)} on the axis at x ${f(apex.x)} z ${f(apex.z)}, hem y ${f(hem.y[0])}–${f(hem.y[1])}, underside y ${f(under)}; ${f(bellSize.x, 2)} by ${f(bellSize.z, 2)} m\n` +
    `  rings, hem up: ${ringsInFile.map((g) => `y ${f(g.y[0], 2)}–${f(g.y[1], 2)} r ${f(g.r[0], 2)}–${f(g.r[1], 2)}`).join('; ')}\n` +
    `  reach from the axis: bell ${f(reachOf('bell'))}, lappets ${f(most(lappetNames, reachOf))}, manubrium ${f(reachOf('manubrium'))}, arms ${armNames.map((n) => f(reachOf(n))).join(' ')}; from the origin, any part ${f(swept)}\n` +
    `  manubrium y ${f(boxOf('manubrium').min.y)}–${f(boxOf('manubrium').max.y)}\n` +
    `  arm rings, root to end: across ${acrossAt.map(([lo, hi]) => `${f(lo, 2)}–${f(hi, 2)}`).join(', ')} m; through ${throughAt.map(([lo, hi]) => `${f(lo, 2)}–${f(hi, 2)}`).join(', ')} m\n` +
    `  arms: ${armsInFile.map((m) => `${m.name} from ${f(m.rootR, 2)} out on ${f(m.rootAz, 1)}° at y ${f(m.rootY, 2)}, ${f(m.length, 2)} long, ends ${f(m.endR, 2)} out`).join('; ')}\n` +
    `  lappet ends y ${lappetNames.map((n) => f(boxOf(n).min.y)).join(' ')}\n` +
    `  seats y ${f(Math.min(...seatY))}–${f(Math.max(...seatY))}\n  ` +
    where
      .map(
        (w) =>
          `${w.name} x ${f(w.c.x)} y ${f(w.c.y)} z ${f(w.c.z)} (bearing ${f(w.az, 2)}°, ${f(w.r)} from the axis, ${f(w.off, 4)} off, facing ${f((Math.asin(w.tilt) * 180) / Math.PI, 1)}° up)`
      )
      .join('\n  ')
);
await exportGlb(jelly, 'env-drift-jelly.glb');
