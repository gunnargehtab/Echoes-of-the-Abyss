/**
 * The comb jelly — 3.5 m of footprint, the one deep body of the free-water
 * crater: a solitary comb jelly hanging upright in the open water under
 * 400 m, which the owner commissioned in session on 27 November 2026 for
 * the High graphics quality (#1858): "a comb jelly, an upright egg with
 * eight lit comb rows and no strands". Public decoration under the eighth
 * clause of Block 4's public-microfauna variant of ENV STYLE, not an animal
 * of the bestiary: no SIG, no entity, no collision, and nothing lit in the
 * file.
 *
 * "Crater rim, suspended under 400 m, High alone | env-comb-jelly | 3.5 m |
 * 5.00 m | ≤ 700 | none" (docs/asset-prompts-3d.md, Block 4). Two
 * materials, `fish_flank` on the skin and `stone_dark` on the eight comb
 * rows and the mouth; 674 triangles; 5.00 m tall (5.0037) at its 3.5 m by
 * intake's measure (`sizeM`), which takes `--footprint-m 3.5 --max-tris 700`
 * for this row and no `--world-light`: the file carries no emissive, the
 * row's Light is `none`, and the rows below are the runtime's to light.
 *
 * Authored as a formula rather than ported: there is no export, as the
 * seven bodies before it have none (#1711, #1777, #1837, #1867). Every
 * drawn number comes from one seeded stream (seabed.mjs `seeded`, seed
 * 1858) in the order the parts are built — the skin ring by ring from the
 * mouth up, sixteen corners a ring, a push and a lift each; then the rows
 * from `comb_01` round, each row's plates from its head down, a width and
 * a length each; the mouth draws nothing — so the file is the same on
 * every machine and `npm run check:models` holds the script to it. The
 * girdle's corners are lifted and not pushed, so the plan's box is the
 * girdle's own, 3.5 m square to the last digit: `settle` centres it on the
 * axis and fits it ×1.00000, and `stand` finds ×1.000. The tables below
 * are nominal figures over the mouth's flat; the prose gives the file's,
 * over the origin, 2 cm higher, which the script prints.
 *
 * What it is made of. It is the microfauna's grammar (seabed.mjs, "The
 * microfauna") stood on end, as the drift jelly is: the skin is one
 * `shaft`, wound by its rings' order (`wound`) because its last fan turns
 * down into a dimple, and held to a closed skin facing out
 * (`closedOutward`). The rows are the one noun the grammar did not have,
 * so it is the module's and not this script's: `comb`, a run of low
 * pyramids on rectangles down one line of a skin, open underneath as the
 * fish's `lens` is. The mouth is the deep fish's `seat`.
 *
 * What it must not be. Not the lantern (`env-drift-jelly`): that is a
 * bell 0.45 as tall as it is wide over a flared margin, a stalk and five
 * lobes; this is an egg 1.42 times as tall as it is wide with one girdle,
 * so no bell, no margin, no lip, nothing under it but the 2 cm its mouth
 * lies proud, and nothing that trails. Not the Tetherjelly or its stipple
 * figure, a dome over a rim with tentacles (docs/map-visuals.md §8), and
 * not the Hollow's open crescent: the skin is closed everywhere, its one
 * concavity a dimple 6 cm deep and 0.68 m across, so no view of it is a
 * bell's crescent. The script asserts each of those lines (below).
 *
 * A comb jelly has no bow: the pose is the hang, and a slow turn about the
 * axis reads as drift. Sixteen gores repeat every 45°, a rowed one and a
 * plain one, and only the mouth's slot, the pushes and the plates' drawn
 * sizes tell one eighth of a turn from the next.
 *
 * - `body`, in `fish_flank`: the skin, a shaft of nine sixteen-cornered
 *   rings, the corners 22.5° apart from 11.25° round from +x toward +z, so
 *   it is sixteen flat gores with the middle of one on every 22.5°. An egg
 *   of two half-ellipsoids on one girdle, the blunt half up: in the file,
 *   a flat under it at y 0.02 and 0.40 m from the axis to its corners, the
 *   mouth's, fanned from its own middle on the axis in sixteen equal
 *   triangles, so the runtime's one normal a vertex comes out alike on
 *   every corner of its rim; rings at y 0.36–0.37 and 0.92 m, y 0.97–0.98 and 1.35–1.36 m,
 *   y 1.70–1.71 and 1.63–1.64 m; the girdle at y 2.86–2.88 and 1.78 m, the
 *   widest ring, 0.57 of the way up, 1.75 m to a gore's middle; then
 *   y 3.64–3.65 and 1.66–1.67 m, y 4.34–4.35 and 1.31–1.32 m, y 4.86–4.87
 *   and 0.71 m, and the dimple's rim at y 5.00 and 0.34 m, the top of the
 *   file, fanned in to the dimple's point on the axis at y 4.94. By the
 *   triangles the file carries, the four bands under the girdle look
 *   55–57°, 35–36°, 20–22° and 7° below the level and the four over it
 *   8–9°, 26–28°, 48–49° and 68–70° above it, the flat straight down and
 *   the dimple's fan 79–80° above the level, turned toward the axis: one
 *   girdle, and nothing that flares (asserted). Every corner but the
 *   girdle's is pushed in or out by up to 0.4 % of its radius, 7 mm at the
 *   most, and every corner but the mouth's rim is lifted or dropped by up
 *   to 4–8 mm, so the skin is drawn and not turned, and no more: the
 *   runtime merges these facets' corners and draws the skin with one
 *   normal a vertex, and a corner pushed further would smooth into a
 *   lump. Every band quad is cut on the same diagonal: a body with no port
 *   and starboard has no plane for `splitAC` to mirror about. 4.984 m tall
 *   on 3.500, 32.0 m³; its mid-height, half way from its lowest vertex to
 *   its highest, is y 2.512. 288 triangles.
 * - `comb_01..08`, in `stone_dark`: the eight comb rows, each a ladder of
 *   twelve plates down the middle of every other gore, on bearings 202.5°,
 *   247.5°, 292.5°, 337.5°, 22.5°, 67.5°, 112.5° and 157.5° from +x toward
 *   +z, 45° apart to the hundredth of a degree: `_01` to `_04` round the
 *   port side (−z), `_05` to `_08` on round the starboard, one continuous
 *   round. A row runs from y 4.953–4.957, 5 cm under the top of the file,
 *   down to y 1.067–1.075, 0.79 of the way down the skin, and stops: the
 *   last fifth of the egg is bare. A plate is a low pyramid on a rectangle
 *   lying across its gore, the rectangle sunk under the skin and the apex
 *   proud of it: at the girdle the rectangle is 0.64 m across and 0.20 m
 *   down the row, sunk 2.5 cm, the apex 4.5 cm proud, so what shows is a
 *   rung 0.41 m across and 0.13 m long (0.643 of the rectangle). A plate
 *   is as wide as its gore's width allows and the rest of it shrinks
 *   toward the pole, where the rows close on each other; the last three
 *   of a row are 0.86, 0.72 and 0.58 of their gore's share, so a row dies
 *   away toward the mouth; and each is drawn ±6 % across and along. In the
 *   file the rectangles are 0.18–0.66 m across and 0.12–0.21 m along and
 *   the apexes 2.6–4.7 cm proud of the skin by its own triangles
 *   (`skinGap`). The plates stand 0.387–0.395 m apart along the row, 1, 2,
 *   2, 2, 3 and 2 of them on the six bands from the dimple's rim down:
 *   the rings were placed for it (`SKIN`), so no plate lies across a ring
 *   and each stands on one flat of the skin. A row's crest runs from
 *   0.53 m out at y 4.96 through 1.77 m at y 2.66–3.06 to 1.44 m at
 *   y 1.14. Neighbouring rows come no nearer than 0.165 m, at their heads.
 *   Every plate is its own mirror about its row's meridian plane, so the
 *   centroid of a row's vertices at every height lies in that plane to
 *   under a hundredth of a millimetre (asserted to a millimetre), which
 *   is where the runtime reads the row's line; a plate is twelve vertices,
 *   and the plates are written from the row's head down. 48 triangles a
 *   row, 384 in all.
 * - `mouth`, in `stone_dark`: a lozenge 0.56 m along x and 0.15 m across,
 *   two triangles facing down, lying 2 cm proud of the flat under the egg:
 *   a slot, a band and no opening. It is the lowest part, on y = 0, and
 *   its ends point down two plain gores, with a row 22.5° either side.
 *
 * Port is −z. The eight rows root in the skin — the sweep lists those
 * eight pairs and nothing else, no row against a row — and the mouth
 * against nothing, 2 cm off the flat, which it means to. The root is
 * `env_comb_jelly`, an identity, the plan's box centred on the origin:
 * 3.500 m along x and 3.500 across z, which is the skin's own box. The
 * axis stands on the origin, under a micrometre off it, and no vertex
 * stands more than 1.784 m from it, so turned to any heading the body
 * keeps inside a circle 3.57 m across. No `photophore_NN` node, no
 * emissive, and nothing in the file says where in the column it belongs.
 */
import { THREE, add, exportGlb } from '../kit.mjs';
import * as seabed from '../seabed.mjs';

const FOOTPRINT = 3.5;
const MAX_TRIS = 700;
const SEED = 1858;

const flank = seabed.ground.fishFlank();
const dark = seabed.ground.stoneDark();

const jelly = new THREE.Group();
jelly.name = 'env_comb_jelly';

const draw = seabed.seeded(SEED);
const rad = (deg) => (deg * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const V = (p) => new THREE.Vector3(...p);

// --- the skin --------------------------------------------------------------------
// Sixteen corners a ring, 22.5° apart from 11.25° round from +x toward +z,
// so the skin is sixteen flat gores from pole to pole with the middle of
// one on every 22.5°: a comb row every 45° lies down the middle of every
// other gore, on a flat of the skin, and the gores between are plain.
const CORNERS = 16;
const FIRST_CORNER = 180 / CORNERS;
// An egg is two half-ellipsoids on one girdle, a short blunt half over it
// and a long tapering half under it. A ring is a latitude of whichever half
// it is on, `at` degrees from the girdle. The girdle's corners stand 1.784 m
// from the axis, so its box, corner to corner across x and across z, is the
// 3.5 m of the footprint.
const GIRDLE_R = FOOTPRINT / 2 / Math.cos(rad(FIRST_CORNER));
const GIRDLE_Y = 2.85;
const MOUTH_AT = -77;
const UNDER = GIRDLE_Y / Math.sin(rad(-MOUTH_AT));
const OVER = 2.17;
// Rings from the mouth's flat up to the dimple's rim: the latitude, how far
// a corner may be pushed (of its radius) and lifted (metres). The mouth's
// rim is not lifted, so its flat is one plane; the girdle is not pushed, so
// the plan's box is the girdle's own and the axis stands on its middle.
// The six rings from the dimple's rim down to −40.42° stand 1, 2, 2, 2, 3
// and 2 times 0.391 m apart down a gore's middle, which is the comb rows'
// pitch: every band carries that many plates and no plate lies across a
// ring (`ROW`, below).
const GIRDLE = 4;
const SKIN = [
  { at: MOUTH_AT, push: 0.004, lift: 0 },
  { at: -59, push: 0.004, lift: 0.008 },
  { at: -40.42, push: 0.004, lift: 0.008 },
  { at: -23.45, push: 0.004, lift: 0.008 },
  { at: 0, push: 0, lift: 0.008 },
  { at: 20.88, push: 0.004, lift: 0.008 },
  { at: 42.74, push: 0.004, lift: 0.008 },
  { at: 66.47, push: 0.004, lift: 0.006 },
  { at: 79, push: 0.004, lift: 0.004 },
];
const nominal = ({ at }) => ({
  r: GIRDLE_R * Math.cos(rad(at)),
  y: GIRDLE_Y + (at < 0 ? UNDER : OVER) * Math.sin(rad(at)),
});
const TOP = nominal(SKIN.at(-1));
// The apical dimple: the skin fans in from its last ring to a point under it.
const DIMPLE_DEPTH = 0.06;
const DIMPLE = [0, TOP.y - DIMPLE_DEPTH, 0];
const skinRings = SKIN.map((row) => {
  const { r, y } = nominal(row);
  return Array.from({ length: CORNERS }, (_, j) => {
    const t = rad(FIRST_CORNER + (360 / CORNERS) * j);
    const p = r * (1 + draw.between(-row.push, row.push));
    return [p * Math.cos(t), y + draw.between(-row.lift, row.lift), p * Math.sin(t)];
  });
});
// Fanned in to the middle of the flat under the mouth's rim, and in to the
// dimple over the last ring. The flat is a fan from its middle on the axis
// and not `shaft`'s cap, which is a fan from one corner: the runtime draws
// this skin with one normal a vertex (jellyLight.ts `smoothMembrane`), and
// the corner that carried all fourteen triangles of a cap took a normal 24°
// off its neighbours' (the reviewer's finding on #1858). Every band quad is cut the same way round, as the drift jelly's are:
// a body with no port and starboard has no plane for `splitAC` to mirror
// about. Wound by its rings' order (seabed.mjs `shaft` `wound`): the dimple's
// fan faces up and toward the axis, which a point taken for inside under the
// last ring's middle would turn over.
const FLAT = [0, nominal(SKIN[0]).y, 0];
const skin = seabed.shaft(skinRings, {
  start: FLAT,
  end: DIMPLE,
  split: () => true,
  wound: true,
});
add(jelly, 'body', skin, flank);

// --- the comb rows -----------------------------------------------------------------
// Eight, one down the middle of every other gore, each a ladder of plates
// from under the dimple's rim to the ring four fifths of the way down. A
// row's line is its gore's middle in its meridian's own plane: the middle of
// each ring's edge, with what a push left of it across that plane taken
// out, under 2 mm. `ROW` is how many plates each band carries, from the
// dimple's rim down, set evenly along the band's own stretch of the line,
// half a step in from each ring: the rings were placed for it, so the pitch
// is one figure down the whole row and every plate lies on one flat of the
// skin (seabed.mjs `comb`).
const ROWS = 8;
const ROW = [1, 2, 2, 2, 3, 2];
const PLATES = ROW.reduce((a, b) => a + b, 0);
const FIRST_DEG = 202.5;
// A plate at the girdle: the rectangle it stands on, `w` across its gore and
// `h` down it, sunk `sink` under the skin, and its apex `proud` of it. It is
// `w` wide by its gore's width, so it keeps inside its gore at every
// latitude, and the rest of it shrinks toward the pole, where the rows close
// on each other, by its radius over `FULL_R` and to no less than `SMALLEST`.
const PLATE = { h: 0.2, w: 0.64, proud: 0.045, sink: 0.025 };
const FULL_R = 1.15;
const SMALLEST = 0.6;
// A row dies away toward the mouth: its last three plates are this much of
// their gore's share across. And no two plates are alike: each is drawn
// ±`VARY` across and along, about its own middle, so it is still its own
// mirror about its meridian's plane.
const FADE = [0.86, 0.72, 0.58];
const VARY = 0.06;

/** The middle of the gore from corner `j` on, in the plane of `theta`: a point a ring, from the dimple's rim down. */
function goreLine(j, theta) {
  const er = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
  return skinRings
    .map((ring) => {
      const m = V(ring[j]).lerp(V(ring[(j + 1) % CORNERS]), 0.5);
      return er.clone().multiplyScalar(m.dot(er)).setY(m.y);
    })
    .reverse();
}

const rows = [];
for (let n = 0; n < ROWS; n++) {
  const bearing = (FIRST_DEG + (360 / ROWS) * n) % 360;
  const j = Math.round((bearing - 2 * FIRST_CORNER) / (360 / CORNERS));
  const theta = rad(bearing);
  const line = goreLine(j, theta);
  let placed = 0;
  const plates = ROW.flatMap((count, b) => {
    const [top, bottom] = [line[b], line[b + 1]];
    const step = top.distanceTo(bottom) / count;
    return Array.from({ length: count }, (_, k) => {
      const at = (d) => top.clone().lerp(bottom, ((k + 0.5) * step + d) / (count * step));
      const on = at(0);
      const r = Math.hypot(on.x, on.z);
      const size = Math.min(1, Math.max(SMALLEST, r / FULL_R));
      const fade = FADE[FADE.length - (PLATES - placed++)] ?? 1;
      const w = ((PLATE.w * r) / (FOOTPRINT / 2)) * fade * (1 + draw.between(-VARY, VARY));
      const h = PLATE.h * size * (1 + draw.between(-VARY, VARY));
      return {
        from: at(-h / 2).toArray(),
        to: at(h / 2).toArray(),
        on: on.toArray(),
        across: [-Math.sin(theta), 0, Math.cos(theta)],
        out: [Math.cos(theta), 0, Math.sin(theta)],
        w,
        h,
        proud: PLATE.proud * size,
        sink: PLATE.sink * size,
        step,
        size,
      };
    });
  });
  const made = seabed.comb(plates);
  const name = `comb_${String(n + 1).padStart(2, '0')}`;
  const mesh = add(jelly, name, made.geo, dark);
  rows.push({ name, mesh, bearing, theta, plates, made });
}

// --- the mouth ---------------------------------------------------------------------
// A slot across the flat under the egg, along x: a dark lozenge lying 2 cm
// proud of the flat and facing down, a band and no opening (seabed.mjs
// `seat`, on the flat's middle where a fish's stands on a band quad). Its
// ends point down two plain gores: the rows stand 22.5° either side of its
// line and none on it.
const MOUTH = [0.56, 0.15];
const PROUD = 0.02;
const mouth = seabed.seat(
  { mid: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(0, -1, 0) },
  null,
  MOUTH,
  PROUD,
  { along: [1, 0, 0] }
);
const mouthMesh = add(jelly, 'mouth', mouth.geo, dark);

// --- the skins, the seats, the fit, the checks, then out ------------------------------
// The skin is one closed surface facing out (seabed.mjs `closedOutward`),
// dimple and flat included. Every plate's rim is under it and its apex over
// it, in the nominal frame before the fit (`insideBody`, `skinGap`).
const volume = seabed.closedOutward(skin, 'body');
const prouds = [];
for (const { name, made, plates } of rows)
  made.plates.forEach(({ apex, base }, k) => {
    base.forEach((p, c) => {
      if (!seabed.insideBody(skin, p.toArray()))
        throw new Error(`env_comb_jelly: ${name} plate ${k + 1} rim corner ${c} is outside the skin`);
    });
    const { gap, outside } = seabed.skinGap(skin, apex.toArray());
    if (!outside || gap < 0.02)
      throw new Error(
        `env_comb_jelly: ${name} plate ${k + 1} stands ${gap.toFixed(4)} m ${outside ? 'off' : 'inside'} the skin, under 2 cm proud`
      );
    if (Math.abs(gap - plates[k].proud) > 0.01)
      throw new Error(
        `env_comb_jelly: ${name} plate ${k + 1} stands ${gap.toFixed(4)} m off the skin, not ${plates[k].proud.toFixed(4)}`
      );
    prouds.push(gap);
  });

const fit = seabed.settle(jelly, FOOTPRINT);
const { drawn, k: held } = seabed.stand(jelly, FOOTPRINT, { drawn: FOOTPRINT });
const t = seabed.tally(jelly);
const size = new THREE.Box3().setFromObject(jelly).getSize(new THREE.Vector3());
if (t.tris > MAX_TRIS) throw new Error(`env_comb_jelly: ${t.tris} triangles over ${MAX_TRIS}`);
if (t.materials.size !== 2 || !t.materials.has('fish_flank') || !t.materials.has('stone_dark'))
  throw new Error(`env_comb_jelly: materials [${[...t.materials]}], not fish_flank and stone_dark`);
if (Math.abs(t.lowest) > 1e-6)
  throw new Error(`env_comb_jelly: lowest vertex at ${t.lowest}, not on the ground`);
if (t.onFloor.length !== 1 || t.onFloor[0] !== 'mouth')
  throw new Error(`env_comb_jelly: on the ground [${t.onFloor}], not the mouth alone`);
if (t.reach.x > FOOTPRINT / 2 + 1e-3 || t.reach.z > FOOTPRINT / 2 + 1e-3)
  throw new Error(
    `env_comb_jelly: reaches ${t.reach.x} by ${t.reach.z} from the origin, past ${FOOTPRINT / 2}`
  );
// The parts, by name: one skin in the flank, eight rows and a mouth in the
// dark, and nothing else. No seat for a light, and no light.
const names = [];
jelly.traverse((o) => {
  if (!o.isMesh) return;
  names.push(o.name);
  if (o.material.emissive.getHex() !== 0)
    throw new Error(`env_comb_jelly: ${o.name} carries an emissive`);
  const want = o.name === 'body' ? 'fish_flank' : 'stone_dark';
  if (o.material.name !== want)
    throw new Error(`env_comb_jelly: ${o.name} is in ${o.material.name}, not ${want}`);
});
const wanted = ['body', ...rows.map((r) => r.name), 'mouth'];
if (names.join() !== wanted.join())
  throw new Error(`env_comb_jelly: parts [${names}], not [${wanted}]`);
if (names.some((n) => /^photophore/.test(n)))
  throw new Error('env_comb_jelly: a photophore seat, which this file must not carry');

// What the file measures.
const part = (name) => jelly.getObjectByName(name);
const boxOf = (name) => new THREE.Box3().setFromObject(part(name));
const span = (values) => [Math.min(...values), Math.max(...values)];
const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;
const vertices = (name) => {
  const p = part(name).geometry.attributes.position;
  return Array.from({ length: p.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(p, i));
};
const skinBox = boxOf('body');
const skinVerts = vertices('body');
// The axis: the dimple's point, which the script put on it.
const apex = skinVerts.reduce((best, v) =>
  v.y > skinBox.max.y / 2 && Math.hypot(v.x, v.z) < Math.hypot(best.x, best.z) ? v : best
);
if (Math.hypot(apex.x, apex.z) > 1e-3)
  throw new Error(
    `env_comb_jelly: the axis stands ${Math.hypot(apex.x, apex.z).toFixed(4)} m off the origin`
  );
const lift = skinBox.min.y;
const inFile = (p) => V(p).multiplyScalar(fit).add(new THREE.Vector3(apex.x, lift, apex.z));
const ringsInFile = skinRings.map((ring) => {
  const at = ring.map(inFile);
  return {
    y: span(at.map((p) => p.y)),
    r: span(at.map((p) => Math.hypot(p.x - apex.x, p.z - apex.z))),
    meanY: mean(at.map((p) => p.y)),
    meanR: mean(at.map((p) => Math.hypot(p.x - apex.x, p.z - apex.z))),
  };
});
const tall = skinBox.max.y - skinBox.min.y;
const wide = Math.max(skinBox.max.x - skinBox.min.x, skinBox.max.z - skinBox.min.z);
const midHeight = (skinBox.max.y + skinBox.min.y) / 2;

// An egg and no bell. One girdle: the rings widen from the mouth's rim to it
// and narrow from it to the dimple's, so there is no waist, no margin and no
// lip. Taller than it is wide by a third and more. Every facet under the
// girdle looks below the level and every facet over it above, by the
// triangles the file carries, so nothing flares. The dimple is a dimple:
// its point no more than a tenth of a metre under its rim.
ringsInFile.forEach((g, b) => {
  if (b === 0) return;
  const grew = g.meanR > ringsInFile[b - 1].meanR;
  if (grew !== b <= GIRDLE)
    throw new Error(`env_comb_jelly: ring ${b} ${grew ? 'widens' : 'narrows'}; one girdle, at ring ${GIRDLE}`);
});
if (tall / wide < 1.35)
  throw new Error(`env_comb_jelly: ${tall.toFixed(3)} m tall on ${wide.toFixed(3)}, no upright egg`);
const BANDS = skinRings.length - 1;
const looksOf = (firstTri, count) => {
  const nrm = part('body').geometry.attributes.normal;
  return span(
    Array.from({ length: count }, (_, k) => deg(Math.asin(nrm.getY(3 * (firstTri + k)))))
  );
};
// `shaft` writes the bands from the mouth up, then the flat, then the dimple.
const bandLooks = Array.from({ length: BANDS }, (_, b) => looksOf(2 * CORNERS * b, 2 * CORNERS));
const flatLooks = looksOf(2 * CORNERS * BANDS, CORNERS);
const dimpleLooks = looksOf(2 * CORNERS * BANDS + CORNERS, CORNERS);
// The flat is flat: all sixteen triangles of its fan look straight down.
if (flatLooks[1] > -89.9)
  throw new Error(`env_comb_jelly: the flat looks ${flatLooks[1].toFixed(2)}°, not straight down`);
bandLooks.forEach(([lo, hi], b) => {
  if (b < GIRDLE ? hi >= 0 : lo <= 0)
    throw new Error(`env_comb_jelly: band ${b} looks ${lo.toFixed(1)}° to ${hi.toFixed(1)}°, across the level`);
});
const dimple = ringsInFile.at(-1).meanY - apex.y;
if (!(dimple > 0 && dimple <= 0.1))
  throw new Error(`env_comb_jelly: the dimple is ${dimple.toFixed(3)} m deep`);

// Nothing trails and nothing stands past the skin: every row's box is inside
// the skin's, and the mouth is the one part under it, by the 2 cm it lies
// proud of the flat.
for (const { name } of rows)
  if (!skinBox.containsBox(boxOf(name)))
    throw new Error(`env_comb_jelly: ${name} stands past the skin's box`);
const mouthBox = boxOf('mouth');
const { gap: mouthGap, outside: mouthOut } = seabed.skinGap(
  part('body').geometry,
  mouthBox.getCenter(new THREE.Vector3()).toArray()
);
if (!mouthOut || Math.abs(mouthGap - PROUD * fit) > 0.001)
  throw new Error(`env_comb_jelly: the mouth stands ${mouthGap.toFixed(4)} m off the flat`);
if (mouthMesh.geometry.attributes.position.count !== 6)
  throw new Error('env_comb_jelly: the mouth is not two triangles');
if (Math.abs(size.y - tall - PROUD * fit) > 0.001)
  throw new Error(`env_comb_jelly: ${(size.y - tall).toFixed(4)} m hangs under the skin`);

// The eight rows, as the runtime reads them: each row's line is the centroid
// of its node's vertices at each height. So every height's centroid lies in
// its meridian's plane to a millimetre; the bearings are 45° apart within a
// degree, in one continuous round from 202.5°, four on port (−z) and four
// on starboard; each row runs from near the upper pole to four fifths of
// the way down the skin.
const where = rows.map(({ name, mesh, bearing, theta }, i) => {
  const at = vertices(name);
  if (at.length !== 12 * PLATES)
    throw new Error(`env_comb_jelly: ${name} is ${at.length / 3} triangles, not ${4 * PLATES}`);
  const c = at.reduce((m, v) => m.addScaledVector(v, 1 / at.length), new THREE.Vector3());
  const az = (deg(Math.atan2(c.z - apex.z, c.x - apex.x)) + 360) % 360;
  if (Math.abs(((az - bearing + 540) % 360) - 180) > 1)
    throw new Error(`env_comb_jelly: ${name} bears ${az.toFixed(2)}°, not ${bearing}°`);
  if (Math.sign(c.z) !== (i < ROWS / 2 ? -1 : 1))
    throw new Error(`env_comb_jelly: ${name} is on the wrong side of the axis`);
  // Off the meridian's plane: a vertex's distance across it.
  const off = (v) => -(v.x - apex.x) * Math.sin(theta) + (v.z - apex.z) * Math.cos(theta);
  const heights = new Map();
  for (const v of at) {
    const key = Math.round(v.y * 1e4);
    heights.set(key, [...(heights.get(key) ?? []), off(v)]);
  }
  const stray = Math.max(...[...heights.values()].map((offs) => Math.abs(mean(offs))));
  if (stray > 1e-3)
    throw new Error(`env_comb_jelly: ${name}'s line strays ${stray.toFixed(4)} m off its meridian`);
  const y = span(at.map((v) => v.y));
  const fromTop = skinBox.max.y - y[1];
  const wayDown = (skinBox.max.y - y[0]) / tall;
  if (fromTop > 0.3) throw new Error(`env_comb_jelly: ${name} starts ${fromTop.toFixed(3)} m down`);
  if (wayDown < 0.77 || wayDown > 0.83)
    throw new Error(`env_comb_jelly: ${name} ends ${wayDown.toFixed(3)} of the way down`);
  return {
    name,
    az,
    y,
    wayDown,
    stray,
    halfWidth: Math.max(...at.map((v) => Math.abs(off(v)))),
    reach: Math.max(...at.map((v) => Math.hypot(v.x - apex.x, v.z - apex.z))),
    heights: heights.size,
    mesh,
  };
});
const row0 = rows[0];
// Round the axis in one continuous round, and no row touching the next: the
// least distance between two neighbours' vertices, which is at their heads.
const apart = where.map((w, i) => {
  const next = where[(i + 1) % ROWS];
  const gap = (next.az - w.az + 360) % 360;
  if (Math.abs(gap - 360 / ROWS) > 1)
    throw new Error(`env_comb_jelly: ${w.name} to ${next.name} is ${gap.toFixed(2)}°, not 45°`);
  const [mine, theirs] = [vertices(w.name), vertices(next.name)];
  const least = Math.min(...mine.flatMap((a) => theirs.map((b) => a.distanceTo(b))));
  if (least < 0.05)
    throw new Error(`env_comb_jelly: ${w.name} stands ${least.toFixed(3)} m from ${next.name}`);
  return least;
});
// Where the apexes of one row stand, head to foot: the row's crest.
const crest = row0.made.plates.map(({ apex: a }) => inFile(a.toArray()));
const SHOWS = PLATE.proud / (PLATE.proud + PLATE.sink);

const f = (v, d = 3) => v.toFixed(d);
const swept = Math.max(
  ...names.flatMap((n) => vertices(n).map((v) => Math.hypot(v.x, v.z)))
);
console.log(
  `env_comb_jelly: ${t.tris} triangles, fit ×${f(fit, 5)}, drawn ${f(drawn, 4)} across, held at ${FOOTPRINT} m (×${f(held, 5)}), ` +
    `${f(size.x, 3)} by ${f(size.z, 3)} by ${f(size.y, 4)} m tall, materials ${[...t.materials].join(' + ')}, on the ground: ${t.onFloor.join(', ')}\n` +
    `  skin: y ${f(skinBox.min.y)}–${f(skinBox.max.y)}, ${f(tall)} m tall on ${f(wide)}, ${f(tall / wide, 2)} as tall as wide; mid-height y ${f(midHeight)}; ` +
    `axis ${f(Math.hypot(apex.x, apex.z) * 1e6, 3)} µm off the origin; dimple point y ${f(apex.y)}, ${f(dimple)} under its rim; girdle y ${f(ringsInFile[GIRDLE].meanY)}, ${f((ringsInFile[GIRDLE].meanY - skinBox.min.y) / tall, 2)} of the way up; volume ${f(volume * fit ** 3, 1)} m³; ${part('body').geometry.attributes.position.count / 3} triangles\n` +
    `  rings, mouth's rim up: ${ringsInFile.map((g) => `y ${f(g.y[0], 2)}–${f(g.y[1], 2)} r ${f(g.r[0], 2)}–${f(g.r[1], 2)}`).join('; ')}\n` +
    `  facets look, degrees above the level: flat ${f(flatLooks[0], 1)} to ${f(flatLooks[1], 1)}; bands ${bandLooks.map(([lo, hi]) => `${f(lo, 1)} to ${f(hi, 1)}`).join(', ')}; dimple ${f(dimpleLooks[0], 1)} to ${f(dimpleLooks[1], 1)}\n` +
    `  rows: ${PLATES} plates each, ${4 * PLATES} triangles; pitch ${f(Math.min(...rows.flatMap((r) => r.plates.map((p) => p.step))) * fit)}–${f(Math.max(...rows.flatMap((r) => r.plates.map((p) => p.step))) * fit)} m; apex ${f(Math.min(...prouds) * fit, 4)}–${f(Math.max(...prouds) * fit, 4)} m proud of the skin; ` +
    `plate size ×${row0.plates.map((p) => f(p.size, 2)).join(' ')};`+
    ` rectangles across ${span(rows.flatMap((r) => r.plates.map((p) => p.w * fit))).map((v) => f(v, 2)).join('–')} m and along ${span(rows.flatMap((r) => r.plates.map((p) => p.h * fit))).map((v) => f(v, 2)).join('–')} m;` +
    ` ${rows[0].name} across ${row0.plates.map((p) => f(p.w, 2)).join(' ')}, along ${row0.plates.map((p) => f(p.h, 2)).join(' ')};`+` neighbours ${f(Math.min(...apart))}–${f(Math.max(...apart))} m apart at the least; ${f(SHOWS, 3)} of a rectangle shows over a flat skin; ` +
    `${row0.name} crest, from the axis and y: ${crest.map((a) => `${f(Math.hypot(a.x, a.z), 2)} ${f(a.y, 2)}`).join(', ')}; any part ${f(swept)} from the origin; mouth ${f(mouthGap, 4)} off the flat, x ±${f(mouthBox.max.x)} z ±${f(mouthBox.max.z)}\n  ` +
    where
      .map(
        (w) =>
          `${w.name} bearing ${f(w.az, 2)}°, y ${f(w.y[0])}–${f(w.y[1])} (${f(w.wayDown, 3)} of the way down), ${w.heights} heights, strays ${f(w.stray * 1000, 3)} mm, half-width ${f(w.halfWidth)}, reaches ${f(w.reach)}`
      )
      .join('\n  ')
);
await exportGlb(jelly, 'env-comb-jelly.glb');
