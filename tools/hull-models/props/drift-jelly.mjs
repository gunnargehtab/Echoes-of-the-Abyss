/**
 * The drift jelly — 6 m of footprint, the one drifting body of the
 * free-water crater: a solitary medusa hanging in the open water, which
 * the owner commissioned in session on 20 November 2026 for the High
 * graphics quality's third look step (#1837). Public decoration under the
 * sixth clause of Block 4's public-microfauna variant of ENV STYLE, not an
 * animal of the bestiary: no SIG, no entity, no collision, and nothing lit
 * in the file.
 *
 * "Crater open water, suspended | env-drift-jelly | 6 m | 4.11 m | ≤ 700 |
 * none" (docs/asset-prompts-3d.md, Block 4). Two materials, `fish_flank` on
 * the bell and `stone_dark` on the manubrium, the oral lobes and the
 * photophore seats; 594 triangles; 4.11 m tall (4.1075) at its 6 m by
 * intake's measure (`sizeM`), which takes `--footprint-m 6 --max-tris 700`
 * for this row and no `--world-light`: the file carries no emissive, the
 * row's Light is `none`, and the six seats below are the runtime's to
 * light.
 *
 * This is the second shape under the slug. The first (5b57852a) was a
 * helmet's bell, 4.56 m tall on its 6, over twelve lappets and five arms
 * up to 6 m long, 10.97 m in all, and in the crater it read as a pewter
 * helmet over long dark arms. The owner named the target the same day,
 * the jellies of the High slice's target frame
 * (docs/screenshots/issue-1799/target.png): a shallow, wide bell about
 * twice as wide as it is tall with a soft thin margin, no solid arm under
 * it, a textured middle under the dome, and tentacles that are strands of
 * beads of light. The strands are the runtime's, hung from the margin as
 * world light, and no geometry: nothing in this file trails. So the bell
 * is the silhouette, the lappets and the arms are gone, and what hangs
 * under the bell is a short tuft a quarter as far out as the margin.
 *
 * Authored as a formula rather than ported: there is no export, as the
 * five microfauna before it have none (#1711, #1777). Every number below is
 * drawn from one seeded stream (seabed.mjs `seeded`, seed 1837) in the
 * order the parts are built — the bell ring by ring, eighteen corners a
 * ring, a push and a lift each; the manubrium's three rings; the five
 * lobes, each lobe's three figures and then its rings, a half-width and
 * four throws a ring; the seats draw nothing — so the file is the same on
 * every machine and `npm run check:models` holds the script to it. The
 * whole is built at its own size, centred on its plan, lowered to the
 * ground and held at the footprint before the bake (seabed.mjs `settle`),
 * ×1.0010, so the root is an identity and seabed.mjs `stand` finds ×1.000.
 * The tables below are the nominal figures the stream draws from, heights
 * over the margin's edge; the prose gives the file's, over the origin,
 * which the script prints.
 *
 * What it is made of. It is the microfauna's grammar (seabed.mjs, "The
 * microfauna") stood on end: the bell is one `shaft` as the crab's shell
 * is, its manubrium the shaft again, each oral lobe the shaft once more
 * with a folded leaf's section where a body has a girth, and its seats the
 * deep fish's `seat`. Two of those turn the shaft's wind over (seabed.mjs
 * `shaft` `wound`): the bell's skin runs on round its margin and back in
 * under its lip, and a lobe's ring is not convex, so both are stitched by
 * their rings' order, and the script holds every part to a closed skin
 * facing out (`closedOutward`).
 *
 * What it must not be, and how near the target brings it. The Tetherjelly
 * is a colony of the bestiary and a mark of the tactical layer: a stipple
 * bell 44 m across and 16 high, a dome 0.36 as tall as it is wide, with a
 * rim and six tentacles 44 m long hung evenly round it at 0.55 of its
 * radius (faunaStipple.ts `bellOffsets`), and at Tier 3 "a bell over three
 * tethers" (faunaAgentStipple.ts). The Hollow's classified figure is "an
 * open crescent", a gape. The first shape was drawn away from the stipple
 * bell in every line; the owner's target is a dome over a margin, which is
 * that figure's own two nouns, so this one is nearer it and says so:
 *
 * - its bell is 0.45 as tall as it is wide, 2.70 m on 6.00, where the
 *   first was 0.77–0.80 and the stipple's dome is 0.36;
 * - it is one animal under a seventh of a stipple bell across, a body in
 *   the world layer at High alone and never a stipple;
 * - it is closed underneath, as the first was: a dish 0.50 m deep at its
 *   middle and 2.20 m of body over that, no hollow and no shell, so no
 *   view of it is an open bell's crescent;
 * - it carries a manubrium and five folded lobes under its middle, which
 *   neither figure has, and no arm, tether or tentacle of any length: five
 *   lobes of five lengths on uneven bearings, each a leaf 0.43 m or more
 *   across under its root, and none ending on a spike or a barb;
 * - its six seats stand evenly round its margin, which is where the
 *   stipple bell's six tentacles do not (they hang at 0.55 of the radius),
 *   but six round a rim is that figure's count. What the runtime hangs
 *   from this margin, and how many, is what decides whether the whole
 *   reads as the stipple bell at a seventh of its size, and that is
 *   docs/free-water-slice.md §5's and the owner's to say, not this file's.
 *
 * A medusa has no bow, so nothing here swims: the pose is the hang, and a
 * slow turn about the bell's axis reads as drift.
 *
 * - `bell`, in `fish_flank`: a shaft of six eighteen-cornered rings, the
 *   corners 20° apart from +x toward +z, fanned up to an apex point and,
 *   under the lip, in to the middle of the underside. In the order the
 *   skin runs, in the file: the ring under the lip at y 1.56–1.57, 2.54–2.58
 *   m from the axis; the margin's edge, the widest ring and the lowest of
 *   the bell, at y 1.40–1.41 and 2.99–3.02 m; the waist at y 1.66–1.69 and
 *   2.77–2.81 m, so the lip between them flares 0.21 m outward over its
 *   0.27 m of height and is a wedge that thins to the edge, about 0.19 m
 *   through under the waist; then the dome through y 2.61–2.64 at
 *   2.46–2.52 m, y 3.41–3.44 at 1.88–1.93 m and y 3.93–3.95 at 1.01–1.03 m
 *   to the apex at y 4.11. By the triangles the file carries, the dome's
 *   four bands look 15–19°, 34–38°, 58–61° and 80–81° above the level and
 *   the lip's 36–43°: the wall over the lip is the steepest thing on the
 *   bell, and no facet from the margin's edge up looks below the level
 *   (asserted), so nothing overhangs. Under the edge the skin looks 68–73°
 *   below the level as far as the ring under the lip and 82° below it from
 *   there to the underside's middle at y 1.91, 0.50 m over the margin's
 *   edge. Every corner is pushed in or out by up to 0.5 % of its radius
 *   at the margin's edge and 1.6 % at the dome's last ring, and lifted or
 *   dropped by up to 1–1.5 cm, so the skin is drawn and not turned, and no
 *   more: the target's bell is round, and the runtime smooths these
 *   facets' normals where it draws the bell as a membrane. Every band quad
 *   is cut on the same diagonal: a body with no port and starboard has no
 *   plane for `splitAC` to mirror about. 216 triangles.
 * - `manubrium`, in `stone_dark`: the stalk the lobes hang round, a shaft
 *   of three eight-cornered rings capped flat inside the bell and fanned
 *   to the mouth, y 0.90–2.14 in the file — its top ring 0.70–0.74 m over
 *   the margin's edge inside the bell (asserted, corner by corner), its
 *   mouth 0.50 m under the edge — and no more than 0.37 m from the axis,
 *   each corner drawn ±4 %. It comes out of the underside's dish, and the lobes
 *   hang round it. 46 triangles.
 * - `oral_lobe_1..5`, in `stone_dark`: the oral lobes, each a pleated leaf
 *   8 cm thick hung from the manubrium with its broad face outward. A
 *   shaft of four rings, each a zigzag strip of eight corners, the leaf's
 *   section at 0, 30, 66 and 94 % of the way down: 0.17–0.18 m across at
 *   the root, 0.43–0.45, 0.59–0.64 and 0.43–0.48 m at the three under it,
 *   folded three times along its length, the folds thrown 0, 5, 9 and 7 cm
 *   to either face, and fanned from its last ring to its end 6 % of its
 *   length further down, a fan 135–153° wide, which the script holds over
 *   120°: a leaf's end. The root ring lies inside the manubrium
 *   (asserted) at y 1.52, 0.22 m from the axis; the midrib flares to
 *   0.58–0.61 m out by its end. On bearings 6.8°, 74.7°, 147.2°, 221.0° and
 *   292.3° from +x toward +z (6°, 76°, 150°, 221° and 294° drawn ±3°; gaps
 *   of 68° to 75°, no two alike) and 1.52, 1.05, 1.27, 0.94 and 1.16 m
 *   long, so their ends hang 1.41, 0.94, 1.15, 0.83 and 1.04 m under the
 *   margin's edge and `oral_lobe_1`'s end is the lowest point, on y = 0.
 *   None reaches further than 0.75 m from the axis, a quarter of the
 *   bell's 3.02; the script holds the core to 0.45 of the bell's reach and
 *   to 2.5 m under the margin. 64 each, 320 in all.
 * - `photophore_01..06`, in `stone_dark`: six lozenges of 30 by 16 cm, two
 *   triangles each, each lying 2 cm proud of the lip facet it sits on and
 *   facing its way: the seats of the runtime's lights, dark in the file.
 *   They were the bell's own material on the first shape and are the
 *   core's now, so the bell's material is the membrane and nothing else.
 *   One on every third facet of the lip, on the middle of the facet's cut
 *   diagonal, its long way round the rim (seabed.mjs `seat`, `along`),
 *   where a medusa carries its marginal sense organs: at y 1.544–1.560
 *   (1.550 in the mean, 0.14 m over the margin's edge) and 2.85–2.89 m
 *   from the axis and from the origin alike (2.87 in the mean). On
 *   bearings 209.64°, 269.62°, 329.65°, 29.61°, 89.62° and 149.62° from +x
 *   toward +z, 60° apart within 0.05°: `_01` to `_03` round the port side
 *   (−z), `_04` to `_06` on round the starboard, one continuous round.
 *   Each faces 37–42° above the level, the lip's own way. A far eye 55°
 *   over the level, the conn camera's pitch, has four or five of the six
 *   centres in its sight on every bearing, a level one three or four, and
 *   one 10° to 35° under the level, where the Close camera stands, two or
 *   three: the bell's own wall is in front of the rest. 12 triangles. The
 *   script asserts all six are there, in `stone_dark`, 2 cm off the
 *   bell's skin by the triangles the file carries (seabed.mjs `skinGap`),
 *   with no emissive, within a degree of 210°, 270°, 330°, 30°, 90° and
 *   150° and three a side; it measures each where the runtime reads it,
 *   the middle of the node's box (environmentModels.ts `buildTemplate`).
 *
 * Port is −z. The manubrium roots in the bell and every lobe in the
 * manubrium — the sweep lists those six pairs and nothing else, no lobe
 * against a lobe or against the bell — and the seats against nothing, 2 cm
 * off the skin, so nothing floats but the seats, which mean to. The root
 * is `env_drift_jelly`, an identity, the plan's box centred on the origin:
 * 6.00 m along x and 5.92 across z, which is the bell's own box. The
 * bell's axis stands 1 mm off the origin, and no vertex stands more than
 * 3.02 m from the origin, so turned to any heading the body keeps inside a
 * circle 6.04 m across. The bell's mid-height, half way from the margin's
 * edge to the apex, is y 2.76. The runtime hangs it at an authored depth,
 * and nothing here says where in the column it belongs.
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
// Eighteen corners a ring, 20° apart from +x toward +z, so a seat every 60°
// lies on the middle of every third facet and all six sit alike.
const CORNERS = 18;
const cornerAt = (j) => (2 * Math.PI * j) / CORNERS;
// Rings in the order the skin runs: from under the lip out to the margin's
// edge, back in over the lip to the waist and up the dome. Radius, height
// over the margin's edge, and how far a corner may be pushed (of its radius)
// and lifted (metres). Over the waist the four bands' facets look 18°, 36°,
// 60° and 81° above the level, so the dome closes in even steps; the lip's
// look 38° above it, 20° further up than the wall over them, which is the
// flare. Under the lip the skin climbs 20° to the first ring and 8° from
// there to the middle of the underside.
const MARGIN = 1;
const BELL = [
  { r: 2.56, y: 0.16, push: 0.008, lift: 0.01 },
  { r: 3.0, y: 0.0, push: 0.005, lift: 0.01 },
  { r: 2.79, y: 0.27, push: 0.008, lift: 0.012 },
  { r: 2.49, y: 1.22, push: 0.012, lift: 0.015 },
  { r: 1.9, y: 2.02, push: 0.014, lift: 0.015 },
  { r: 1.02, y: 2.53, push: 0.016, lift: 0.012 },
];
const APEX = [0, 2.7, 0];
// The middle of the underside, over the margin's edge: a dish and no dome.
const UNDER = [0, 0.5, 0];
// A point in the thick of the bell, on its axis between the underside and
// the apex, which every facet of the lip faces away from (`bandFacet`).
const CORE = [0, 1.6, 0];
const bellRings = BELL.map(({ r, y, push, lift }) =>
  Array.from({ length: CORNERS }, (_, j) => {
    const t = cornerAt(j);
    const p = r * (1 + draw.between(-push, push));
    return [p * Math.cos(t), y + draw.between(-lift, lift), p * Math.sin(t)];
  })
);
// Every band quad cut the same way round: a body with no port and starboard
// has no mirror plane for `splitAC` to cut about. Wound by its rings' order
// (seabed.mjs `shaft` `wound`), since the skin turns back in under the lip.
const bell = seabed.shaft(bellRings, { start: UNDER, end: APEX, split: () => true, wound: true });
add(jelly, 'bell', bell, flank);

/** Facet i of the lip, the band between the margin's edge and the waist. */
const lip = (i) => seabed.bandFacet(bellRings, MARGIN, i, true, CORE);

// --- the manubrium ----------------------------------------------------------------
// The stalk under the bell's middle that the lobes hang round: eight corners
// a ring, from a ring inside the bell down to its foot, fanned to the mouth.
const BOSS = [
  { r: 0.3, y: 0.72 },
  { r: 0.36, y: 0.2 },
  { r: 0.3, y: -0.25 },
];
const MOUTH = [0, -0.5, 0];
const bossRings = BOSS.map(({ r, y }) =>
  Array.from({ length: 8 }, (_, j) => {
    const t = rad(45 * j + 22.5);
    const p = r * (1 + draw.between(-0.04, 0.04));
    return [p * Math.cos(t), y + draw.between(-0.02, 0.02), p * Math.sin(t)];
  })
);
const boss = seabed.shaft(bossRings, { end: MOUTH });
add(jelly, 'manubrium', boss, dark);

// --- the oral lobes -----------------------------------------------------------------
/**
 * One oral lobe: a pleated leaf hung from the manubrium on `az`, its broad
 * face outward. Its midrib leaves `ROOT_R` from the axis at `ROOT_Y`,
 * flares `flare` outward, most of it in its upper half, and falls `drop`.
 * A shaft of four rings, each the leaf's section across its midrib at
 * `LOBE_U` of the way down: four stations across its width, `LOBE_W` to
 * each side, thrown `LOBE_AMP` to one face and the other in turn, and a
 * corner `LOBE_T` / 2 either side of each, so a ring is a zigzag strip of
 * eight corners and the leaf is folded along its length, three folds,
 * which is the frill. Its root ring lies inside the manubrium, fanned to a
 * point over it; its last ring is fanned to the midrib's end, a rounded
 * end and no spike. `side` is which face the first fold is thrown to.
 * Every half-width is drawn ±6 % and every throw ±15 %.
 */
const LOBE_T = 0.08;
const ROOT_R = 0.22;
const ROOT_Y = 0.12;
const ROOT_TIP = 0.1;
const LOBE_U = [0, 0.3, 0.66, 0.94];
const LOBE_W = [0.08, 0.2, 0.28, 0.2];
const LOBE_AMP = [0, 0.05, 0.09, 0.07];
const ACROSS = [-1, -1 / 3, 1 / 3, 1];
const FOLD = [1, -1, 1, -1];
function lobe({ az, flare, drop, side }) {
  const er = new THREE.Vector3(Math.cos(az), 0, Math.sin(az));
  const et = new THREE.Vector3(-Math.sin(az), 0, Math.cos(az));
  const up = new THREE.Vector3(0, 1, 0);
  const rib = (u) =>
    er
      .clone()
      .multiplyScalar(ROOT_R + flare * (1 - (1 - u) ** 2))
      .addScaledVector(up, ROOT_Y - drop * u);
  // The leaf's own outward face at u: square to the midrib and to its width.
  const face = (u) => {
    const along = er
      .clone()
      .multiplyScalar(2 * flare * (1 - u))
      .addScaledVector(up, -drop);
    return new THREE.Vector3().crossVectors(et, along).normalize();
  };
  const rings = LOBE_U.map((u, i) => {
    const c = rib(u);
    const n = face(u);
    const w = LOBE_W[i] * (1 + draw.between(-0.06, 0.06));
    const spine = ACROSS.map((v, k) => ({
      v: v * w,
      h: side * FOLD[k] * LOBE_AMP[i] * (1 + draw.between(-0.15, 0.15)),
    }));
    const at = (v, h) => c.clone().addScaledVector(et, v).addScaledVector(n, h).toArray();
    return [
      ...spine.map(({ v, h }) => at(v, h + LOBE_T / 2)),
      ...spine.reverse().map(({ v, h }) => at(v, h - LOBE_T / 2)),
    ];
  });
  const root = rib(0);
  const start = [root.x, root.y + ROOT_TIP, root.z];
  return {
    geo: seabed.shaft(rings, { start, end: rib(1).toArray(), wound: true }),
    rings,
    start,
  };
}
// Five round the stalk, on gaps of 70° to 74° drawn ±3°, and of five
// lengths, the first the longest: one skirt with a ragged hem.
const LOBES = [
  { deg: 6, drop: 1.5 },
  { deg: 76, drop: 1.05 },
  { deg: 150, drop: 1.3 },
  { deg: 221, drop: 0.95 },
  { deg: 294, drop: 1.15 },
];
const lobes = LOBES.map(({ deg, drop }, i) => {
  const made = lobe({
    az: rad(deg + draw.between(-3, 3)),
    flare: draw.between(0.34, 0.42),
    drop: drop * draw.between(0.96, 1.04),
    side: i % 2 ? -1 : 1,
  });
  const name = `oral_lobe_${i + 1}`;
  add(jelly, name, made.geo, dark);
  return { name, ...made };
});

// --- the photophore seats ----------------------------------------------------------
// One on every third facet of the lip, on the middle of its cut diagonal, its
// long way round the rim: `_01` to `_03` round the port side from 210°,
// `_04` to `_06` on round the starboard side.
const PROUD = 0.02;
const SEAT = [0.3, 0.16];
const SEATS = 6;
const seats = [];
for (let n = 0; n < SEATS; n++) {
  const deg = (210 + 60 * n) % 360;
  const theta = rad(deg);
  const facet = Math.floor((deg / 360) * CORNERS);
  const { geo } = seabed.seat(lip(facet), null, SEAT, PROUD, {
    along: [-Math.sin(theta), 0, Math.cos(theta)],
  });
  seats.push(add(jelly, `photophore_${String(n + 1).padStart(2, '0')}`, geo, dark));
}

// --- the roots, the skins, the fit, the checks, then out -----------------------------
// Everything that roots, roots inside what it hangs from, in the nominal
// frame before the fit (seabed.mjs `insideBody`).
bossRings[0].forEach((p, i) => {
  if (!seabed.insideBody(bell, p))
    throw new Error(`env_drift_jelly: manubrium root corner ${i} is outside the bell`);
});
for (const { name, rings, start } of lobes)
  [...rings[0], start].forEach((p, i) => {
    if (!seabed.insideBody(boss, p))
      throw new Error(`env_drift_jelly: ${name} root corner ${i} is outside the manubrium`);
  });
// The bell's skin turns back in under its lip and a lobe's ring is a folded
// strip and no girth, so both are wound by their rings' order, and every
// part is held to a closed skin facing out (seabed.mjs `closedOutward`).
const bellVolume = seabed.closedOutward(bell, 'bell');
seabed.closedOutward(boss, 'manubrium');
for (const { name, geo } of lobes) seabed.closedOutward(geo, name);

const fit = seabed.settle(jelly, FOOTPRINT);
const { drawn, k: held } = seabed.stand(jelly, FOOTPRINT, { drawn: FOOTPRINT });
const t = seabed.tally(jelly);
const size = new THREE.Box3().setFromObject(jelly).getSize(new THREE.Vector3());
if (t.tris > MAX_TRIS) throw new Error(`env_drift_jelly: ${t.tris} triangles over ${MAX_TRIS}`);
if (t.materials.size !== 2 || !t.materials.has('fish_flank') || !t.materials.has('stone_dark'))
  throw new Error(
    `env_drift_jelly: materials [${[...t.materials]}], not fish_flank and stone_dark`
  );
if (Math.abs(t.lowest) > 1e-6)
  throw new Error(`env_drift_jelly: lowest vertex at ${t.lowest}, not on the ground`);
if (t.onFloor.length !== 1 || t.onFloor[0] !== 'oral_lobe_1')
  throw new Error(`env_drift_jelly: on the ground [${t.onFloor}], not the longest lobe alone`);
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
  new THREE.Vector3(...p)
    .sub(new THREE.Vector3(...APEX))
    .multiplyScalar(fit)
    .add(apex);
const reachOf = (name, from = apex) => {
  const p = part(name).geometry.attributes.position;
  let far = 0;
  for (let i = 0; i < p.count; i++)
    far = Math.max(far, Math.hypot(p.getX(i) - from.x, p.getZ(i) - from.z));
  return far;
};
const span = (values) => [Math.min(...values), Math.max(...values)];
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const ringsInFile = bellRings.map((ring) => {
  const at = ring.map(inFile);
  return {
    y: span(at.map((p) => p.y)),
    r: span(at.map((p) => Math.hypot(p.x - apex.x, p.z - apex.z))),
    meanY: mean(at.map((p) => p.y)),
    fromOrigin: mean(at.map((p) => Math.hypot(p.x, p.z))),
  };
});
const margin = ringsInFile[MARGIN];
const lobeNames = lobes.map((l) => l.name);
const most = (names, fn) => Math.max(...names.map((n) => fn(n)));
const ORIGIN = new THREE.Vector3();
const swept = most(['bell', 'manubrium', ...lobeNames], (n) => reachOf(n, ORIGIN));

// The bell is the oblate dome the owner's target shows: from the margin's
// edge to the apex, 0.43 to 0.5 of the 6 m it is across.
const bellTall = apex.y - margin.meanY;
if (bellTall < 2.6 || bellTall > 3.0)
  throw new Error(`env_drift_jelly: the bell stands ${bellTall.toFixed(3)} m over its margin`);
// The core is short and narrow, so the bell is the silhouette: nothing under
// the bell reaches 0.45 as far from the axis as the bell does, and nothing
// hangs more than 2.5 m under the margin's edge.
const coreReach = most(['manubrium', ...lobeNames], reachOf);
if (coreReach > 0.45 * reachOf('bell'))
  throw new Error(`env_drift_jelly: the core reaches ${coreReach.toFixed(3)} m from the axis`);
if (margin.y[1] > 2.5)
  throw new Error(`env_drift_jelly: the core hangs ${margin.y[1].toFixed(3)} m under the margin`);
const across = (ring) =>
  Math.max(...ring.flatMap(([x, , z]) => ring.map(([u, , w]) => Math.hypot(x - u, z - w)))) * fit;
// Where each lobe leaves the manubrium and where it ends, from the axis.
const lobesInFile = lobes.map(({ name, rings }) => {
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
    endY: end,
    endR: Math.hypot(tip.x - apex.x, tip.z - apex.z),
    reach: reachOf(name),
    // How wide the end's fan opens, seen square to the leaf: the last
    // ring's half-width over how far under its middle the end stands.
    endAngle:
      (2 *
        Math.atan2(across(rings.at(-1)) / 2, inFile(middle(rings.at(-1))).distanceTo(tip)) *
        180) /
      Math.PI,
  };
});
const acrossAt = LOBE_U.map((_, i) => span(lobes.map(({ rings }) => across(rings[i]))));
// A lobe ends rounded: its end's fan opens wider than 120°, which is a
// leaf's end and no spike or barb.
const sharpest = Math.min(...lobesInFile.map((m) => m.endAngle));
if (sharpest < 120)
  throw new Error(`env_drift_jelly: a lobe's end opens ${sharpest.toFixed(1)}°, under 120°`);

// The bell's facets by band, in the order `shaft` writes them: how far
// above the level each looks, from the triangles the file carries. A facet
// that looked below it on the dome's side of the margin would overhang.
const BANDS = bellRings.length - 1;
const looksOf = (firstTri, count) => {
  const nrm = part('bell').geometry.attributes.normal;
  return span(
    Array.from(
      { length: count },
      (_, k) => (Math.asin(nrm.getY(3 * (firstTri + k))) * 180) / Math.PI
    )
  );
};
// The bands from under the lip up, then the underside's fan, then the apex's.
const [underLipLooks, lipLooks, ...domeLooks] = Array.from({ length: BANDS }, (_, b) =>
  looksOf(2 * CORNERS * b, 2 * CORNERS)
);
const underFanLooks = looksOf(2 * CORNERS * BANDS, CORNERS);
const apexLooks = looksOf(2 * CORNERS * BANDS + CORNERS, CORNERS);
if (Math.min(lipLooks[0], ...domeLooks.map(([lo]) => lo), apexLooks[0]) <= 0)
  throw new Error('env_drift_jelly: a facet of the dome looks below the level');
// How thick the lip is under the waist: the waist's height over the
// underside's at the waist's radius.
const ringR = (g) => (g.r[0] + g.r[1]) / 2;
const [underLip, , waist] = ringsInFile;
const lipThick =
  waist.meanY -
  (margin.meanY +
    ((underLip.meanY - margin.meanY) * (ringR(margin) - ringR(waist))) /
      (ringR(margin) - ringR(underLip)));

// The six seats: present, in the dark material, two triangles each, PROUD
// off the bell's skin by the triangles the file carries (the whole was
// scaled by `fit` since, so the measure is scaled with it), 60° apart round
// the axis to a degree, and three on each side of it.
if (seats.length !== SEATS)
  throw new Error(`env_drift_jelly: ${seats.length} photophore seats, not ${SEATS}`);
const where = seats.map((mesh, i) => {
  const name = `photophore_${String(i + 1).padStart(2, '0')}`;
  if (mesh.name !== name || mesh.material.name !== 'stone_dark' || mesh.material.emissive.getHex())
    throw new Error(`env_drift_jelly: ${mesh.name} is not a dark ${name} in stone_dark`);
  const p = mesh.geometry.attributes.position;
  if (p.count !== 6) throw new Error(`env_drift_jelly: ${name} is ${p.count / 3} triangles, not 2`);
  // The centre the runtime reads: the middle of the node's box
  // (environmentModels.ts `buildTemplate`).
  const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  const { gap: off, normal, outside } = seabed.skinGap(part('bell').geometry, c.toArray());
  if (!outside || Math.abs(off - PROUD * fit) > 0.001)
    throw new Error(
      `env_drift_jelly: ${name} stands ${off.toFixed(4)} m ${outside ? 'off' : 'inside'} the bell's skin, not ${PROUD * fit} off it`
    );
  const az = ((Math.atan2(c.z - apex.z, c.x - apex.x) * 180) / Math.PI + 360) % 360;
  const want = (210 + 60 * i) % 360;
  if (Math.abs(((az - want + 540) % 360) - 180) > 1)
    throw new Error(`env_drift_jelly: ${name} bears ${az.toFixed(2)}°, not ${want}°`);
  if (Math.sign(c.z) !== (i < 3 ? -1 : 1))
    throw new Error(`env_drift_jelly: ${name} is on the wrong side of the axis`);
  return {
    name,
    c,
    off,
    az,
    r: Math.hypot(c.x - apex.x, c.z - apex.z),
    fromOrigin: Math.hypot(c.x, c.z),
    tilt: normal.y,
  };
});
const seatY = where.map((w) => w.c.y);
const seatR = where.map((w) => w.r);
const seatO = where.map((w) => w.fromOrigin);

const f = (v, d = 3) => v.toFixed(d);
const bellSize = boxOf('bell').getSize(new THREE.Vector3());
const under = inFile(UNDER);
console.log(
  `env_drift_jelly: ${t.tris} triangles, fit ×${f(fit, 4)}, drawn ${f(drawn, 4)} across, held at ${FOOTPRINT} m (×${f(held, 5)}), ` +
    `${f(size.x, 2)} by ${f(size.z, 2)} by ${f(size.y, 4)} m tall, materials ${[...t.materials].join(' + ')}, on the ground: ${t.onFloor.join(', ')}\n` +
    `  bell: apex y ${f(apex.y)} on the axis at x ${f(apex.x)} z ${f(apex.z)}, margin y ${f(margin.y[0])}–${f(margin.y[1])} (mean ${f(margin.meanY)}, ${f(margin.fromOrigin)} from the origin), ` +
    `${f(bellTall)} m from margin to apex, ${f(bellTall / Math.max(bellSize.x, bellSize.z))} of its width; underside middle y ${f(under.y)}, ${f(under.y - margin.meanY)} over the margin and ${f(apex.y - under.y)} under the apex; ` +
    `${f(bellSize.x, 2)} by ${f(bellSize.z, 2)} m; mid-height y ${f((apex.y + margin.meanY) / 2)}; volume ${f(bellVolume * fit ** 3, 1)} m³\n` +
    `  rings, underlip, margin, waist, then up: ${ringsInFile.map((g) => `y ${f(g.y[0], 2)}–${f(g.y[1], 2)} r ${f(g.r[0], 2)}–${f(g.r[1], 2)}`).join('; ')}\n` +
    `  facets look, degrees above the level: under the lip ${f(underLipLooks[0], 1)} to ${f(underLipLooks[1], 1)}, underside ${f(underFanLooks[0], 1)} to ${f(underFanLooks[1], 1)}, ` +
    `lip ${f(lipLooks[0], 1)} to ${f(lipLooks[1], 1)}, dome ${domeLooks.map(([lo, hi]) => `${f(lo, 1)} to ${f(hi, 1)}`).join(', ')}, apex ${f(apexLooks[0], 1)} to ${f(apexLooks[1], 1)}; the lip is ${f(lipThick)} m through under the waist\n` +
    `  reach from the axis: bell ${f(reachOf('bell'))}, manubrium ${f(reachOf('manubrium'))}, lobes ${lobeNames.map((n) => f(reachOf(n))).join(' ')}; core ${f(coreReach)} (${f(coreReach / reachOf('bell'), 2)} of the bell's); from the origin, any part ${f(swept)}\n` +
    `  manubrium y ${f(boxOf('manubrium').min.y)}–${f(boxOf('manubrium').max.y)}\n` +
    `  lobe rings, root to end: across ${acrossAt.map(([lo, hi]) => `${f(lo, 2)}–${f(hi, 2)}`).join(', ')} m\n` +
    `  lobes: ${lobesInFile.map((m) => `${m.name} from ${f(m.rootR, 2)} out on ${f(m.rootAz, 1)}° at y ${f(m.rootY, 2)}, ${f(m.length, 2)} long to y ${f(m.endY, 2)}, ${f(margin.meanY - m.endY, 2)} under the margin, ends ${f(m.endR, 2)} out on a fan ${f(m.endAngle, 0)}° wide, reaches ${f(m.reach, 2)}`).join('; ')}\n` +
    `  seats y ${f(Math.min(...seatY))}–${f(Math.max(...seatY))} (mean ${f(mean(seatY))}), ${f(Math.min(...seatR))}–${f(Math.max(...seatR))} from the axis, ` +
    `${f(Math.min(...seatO))}–${f(Math.max(...seatO))} from the origin (mean ${f(mean(seatO))})\n  ` +
    where
      .map(
        (w) =>
          `${w.name} x ${f(w.c.x)} y ${f(w.c.y)} z ${f(w.c.z)} (bearing ${f(w.az, 2)}°, ${f(w.r)} from the axis, ${f(w.off, 4)} off, facing ${f((Math.asin(w.tilt) * 180) / Math.PI, 1)}° up)`
      )
      .join('\n  ')
);
await exportGlb(jelly, 'env-drift-jelly.glb');
