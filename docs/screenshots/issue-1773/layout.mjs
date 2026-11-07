// The kelp list docs/free-water-slice.md §5 carries since #1773, drawn once
// and committed: `KELP_STANDS` and `KELP_CLUSTERS` in
// packages/frontend/src/game/freeWaterDecoration.ts. Nothing runs this at
// play time. It starts from #1751's rows, four of fourteen stands at one
// 125 m pitch and the sixteen clusters' straight fringe, every plant facing
// down-current, and anneals them under §5's rules: each outline whole on the
// garden's tread, clear of the clearing by its sway, overlapping no other,
// and turned at most 45 degrees from the current. What it lowers is §5's
// two readings of a planted forest, aiming past the test's bars: no plant
// within 15 m of the line through two neighbours it stands between (the
// test asks 10), and every east-west line across the north flank meeting
// stands over 30% of the tread (the test asks a quarter). Neighbouring
// stands are also turned apart, and a last max-min pass lifts the one
// worst triple a summed cost can leave behind.
//
//   node docs/screenshots/issue-1773/layout.mjs [--seed=1773] [--sweeps=16000]
//
// It prints the two lists in the module's own form, and draws the plan
// before and after into plan.svg beside it. The outlines are read off the
// committed GLBs the way the decoration test reads them, so a re-authored
// stand is re-checked here as it is there. A seed draws the same list on one
// engine; another engine may round a cosine differently and anneal
// elsewhere, so the list, not the seed, is the record.
import { readFileSync, writeFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';

const arg = (name, fallback) =>
  Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const SEED = arg('seed', 1773);
const SWEEPS = arg('sweeps', 16000);

// §5: the tread's cell centres, the clearing's row, the sway it keeps out.
const TREAD = { x0: 1125, x1: 2875, y0: 625, y1: 1375 };
const CLEARING = { y0: 1000, y1: 1250 };
const SWAY_M = 4;
const MAX_YAW = Math.PI / 4;
// The clusters' fringe: north of every stand, on the ramp's garden cells,
// with room for a turned cluster's 9.9 m reach inside them.
const FRINGE = { x0: 1011, x1: 2989, y0: 511, y1: 614 };
// Margins the anneal keeps so rounding the list cannot breach a rule.
const GAP_M = 1;
const EDGE_M = 0.5;
// The readings it lowers, stricter than the test's.
const ALIGN_M = 15;
const LANE_SHARE = 0.3;
const TURN_APART = Math.PI / 12;
const TURN_WEIGHT = 0.5;
const LANES = [];
for (let y = 650; y <= 970; y += 5) LANES.push(y);

const outline = async (slug, footprintM) => {
  const bytes = readFileSync(new URL(`../../concept-art/models/${slug}.glb`, import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    ''
  );
  const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
  const scale = footprintM / Math.max(size.x, size.z);
  return { a: (size.x * scale) / 2, b: (size.z * scale) / 2 };
};
const DIMS = {
  stand: await outline('env-kelp-stand', 120),
  cluster: await outline('env-kelp-cluster', 18),
};

const degree = (d) => (d * Math.PI) / 180;
let state = SEED >>> 0;
const rand = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// three.js turns +x toward −z for a positive yaw about +y, and plan y is
// world z: a plant's outline where its instance matrix puts it.
const shape = (p) => {
  const { a, b } = DIMS[p.kind];
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  const corners = [
    [1, 1],
    [1, -1],
    [-1, -1],
    [-1, 1],
  ].map(([u, v]) => [p.x + u * a * c + v * b * s, p.y - u * a * s + v * b * c]);
  const xs = corners.map((q) => q[0]);
  const ys = corners.map((q) => q[1]);
  return {
    corners,
    // Edge normals: the outline's own x and z in plan.
    axes: [
      [c, -s],
      [s, c],
    ],
    x0: Math.min(...xs),
    x1: Math.max(...xs),
    y0: Math.min(...ys),
    y1: Math.max(...ys),
  };
};
// Separating axes: two rectangles overlap, a gap's width grown onto both,
// unless one of their four edge normals separates them.
const overlap = (sp, sq) => {
  if (sp.x1 + GAP_M <= sq.x0 || sq.x1 + GAP_M <= sp.x0) return false;
  if (sp.y1 + GAP_M <= sq.y0 || sq.y1 + GAP_M <= sp.y0) return false;
  for (const [ax, ay] of [...sp.axes, ...sq.axes]) {
    let a0 = Infinity;
    let a1 = -Infinity;
    let b0 = Infinity;
    let b1 = -Infinity;
    for (const [x, y] of sp.corners) {
      const d = x * ax + y * ay;
      a0 = Math.min(a0, d);
      a1 = Math.max(a1, d);
    }
    for (const [x, y] of sq.corners) {
      const d = x * ax + y * ay;
      b0 = Math.min(b0, d);
      b1 = Math.max(b1, d);
    }
    if (a1 + GAP_M <= b0 || b1 + GAP_M <= a0) return false;
  }
  return true;
};
const fits = (p, sp) => {
  if (Math.abs(p.yaw) > MAX_YAW) return false;
  if (p.kind === 'cluster') {
    return p.x >= FRINGE.x0 && p.x <= FRINGE.x1 && p.y >= FRINGE.y0 && p.y <= FRINGE.y1;
  }
  if (sp.x0 < TREAD.x0 + EDGE_M || sp.x1 > TREAD.x1 - EDGE_M) return false;
  if (sp.y0 < TREAD.y0 + EDGE_M || sp.y1 > TREAD.y1 - EDGE_M) return false;
  if (p.north) return sp.y1 + SWAY_M <= CLEARING.y0 - EDGE_M;
  return sp.y0 - SWAY_M >= CLEARING.y1 + EDGE_M;
};

// #1751's rows and fringe, the start.
const plants = [];
for (const y of [687.5, 812.5, 935, 1315]) {
  for (let x = 1187.5; x <= 2812.5; x += 125) {
    plants.push({ kind: 'stand', x, y, yaw: 0, north: y < CLEARING.y0 });
  }
}
for (let x = 1062.5; x <= 2937.5; x += 125) {
  plants.push({ kind: 'cluster', x, y: 562.5, yaw: 0, north: true });
}
const before = plants.map((p) => ({ ...p }));
const shapes = plants.map(shape);
const valid = (i, p, sp) =>
  fits(p, sp) && shapes.every((sq, j) => j === i || !overlap(sp, sq));
plants.forEach((p, i) => {
  if (!valid(i, p, shapes[i])) throw new Error(`#1751's ${p.kind} at ${p.x},${p.y} breaks a rule`);
});

// The readings. A triple counts when its middle plant projects between the
// outer two, a fifth of the way in from each, and stands within 260 m of
// both, about two stand lengths: a row is read off neighbours.
const deviation = (a, b, c) => {
  if (Math.hypot(b.x - a.x, b.y - a.y) > 260 || Math.hypot(b.x - c.x, b.y - c.y) > 260) return null;
  const acx = c.x - a.x;
  const acy = c.y - a.y;
  const ac2 = acx * acx + acy * acy;
  const t = ((b.x - a.x) * acx + (b.y - a.y) * acy) / ac2;
  if (t < 0.2 || t > 0.8) return null;
  return Math.abs(acx * (b.y - a.y) - acy * (b.x - a.x)) / Math.sqrt(ac2);
};
const alignCost = (i, p) => {
  const near = plants.filter(
    (q, j) => j !== i && q.kind === p.kind && Math.hypot(q.x - p.x, q.y - p.y) <= 520
  );
  let cost = 0;
  const add = (d) => {
    if (d !== null && d < ALIGN_M) cost += (ALIGN_M - d) / ALIGN_M;
  };
  for (let u = 0; u < near.length; u++) {
    for (let v = u + 1; v < near.length; v++) {
      add(deviation(near[u], p, near[v]));
      add(deviation(p, near[u], near[v]));
      add(deviation(p, near[v], near[u]));
    }
  }
  // Nothing above asks a stand to turn, and the rows start facing one way,
  // so the anneal left most within 10 degrees of the current: a stand facing
  // the way of a neighbour within 150 m costs until they are 15 degrees apart.
  for (const q of near) {
    if (p.kind !== 'stand' || Math.hypot(q.x - p.x, q.y - p.y) > 150) continue;
    cost += TURN_WEIGHT * Math.max(0, 1 - Math.abs(p.yaw - q.yaw) / TURN_APART);
  }
  return cost;
};
// The share of the tread's width an east-west line meets in stand outlines.
const covered = (y, list) => {
  const spans = [];
  for (const sp of list) {
    if (sp === null || sp.y0 > y || sp.y1 < y) continue;
    const xs = [];
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = sp.corners[k];
      const [bx, by] = sp.corners[(k + 1) % 4];
      if ((ay - y) * (by - y) <= 0 && ay !== by) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
    }
    if (xs.length >= 2) spans.push([Math.min(...xs), Math.max(...xs)]);
  }
  spans.sort((u, v) => u[0] - v[0]);
  let total = 0;
  let open = null;
  for (const [a, b] of spans) {
    if (open === null || a > open[1]) {
      if (open !== null) total += open[1] - open[0];
      open = [a, b];
    } else open[1] = Math.max(open[1], b);
  }
  if (open !== null) total += open[1] - open[0];
  return total / (TREAD.x1 - TREAD.x0);
};
const standShapes = () => shapes.map((sp, j) => (plants[j].kind === 'stand' ? sp : null));
const laneCost = (share) => Math.max(0, LANE_SHARE - share) / LANE_SHARE;
const shares = LANES.map((y) => covered(y, standShapes()));

// The temperature falls to nothing at 85% of the steps; the rest quench.
const steps = SWEEPS * plants.length;
for (let k = 0; k < steps; k++) {
  const temperature = Math.max(0, 0.5 * (1 - k / (steps * 0.85))) + 1e-4;
  const i = Math.floor(rand() * plants.length);
  const p = plants[i];
  const far = rand() < 0.1;
  // Moves land on the list's own precision, a tenth of a metre and a whole
  // degree, so what is printed is what was checked.
  const q = {
    ...p,
    x: Math.round((p.x + (rand() * 2 - 1) * (far ? 40 : 12)) * 10) / 10,
    y: Math.round((p.y + (rand() * 2 - 1) * (far ? 40 : 12)) * 10) / 10,
    yaw: degree(Math.round(((p.yaw + (rand() * 2 - 1) * (far ? 0.6 : 0.2)) * 180) / Math.PI)),
  };
  const sq = shape(q);
  if (!valid(i, q, sq)) continue;
  // Only the lines the old or new outline crosses can change.
  const touched = [];
  const after = [];
  if (p.kind === 'stand') {
    const list = standShapes();
    list[i] = sq;
    const y0 = Math.min(shapes[i].y0, sq.y0);
    const y1 = Math.max(shapes[i].y1, sq.y1);
    LANES.forEach((y, n) => {
      if (y < y0 || y > y1) return;
      touched.push(n);
      after.push(covered(y, list));
    });
  }
  let delta = alignCost(i, q) - alignCost(i, p);
  touched.forEach((n, m) => (delta += laneCost(after[m]) - laneCost(shares[n])));
  if (delta <= 0 || rand() < Math.exp(-delta / temperature)) {
    plants[i] = q;
    shapes[i] = sq;
    touched.forEach((n, m) => (shares[n] = after[m]));
  }
}

// A last pass, max-min: the sum the anneal lowered can hide one worst
// triple. A plant of the worst moves only when every triple through it ends
// further from a row than that worst was, and no line falls under the lanes'
// share, so the worst can only rise.
const worstThrough = (i, p) => {
  const near = plants.filter(
    (q, j) => j !== i && q.kind === p.kind && Math.hypot(q.x - p.x, q.y - p.y) <= 520
  );
  let worst = Infinity;
  for (let u = 0; u < near.length; u++) {
    for (let v = u + 1; v < near.length; v++) {
      for (const d of [
        deviation(near[u], p, near[v]),
        deviation(p, near[u], near[v]),
        deviation(p, near[v], near[u]),
      ]) {
        if (d !== null && d < worst) worst = d;
      }
    }
  }
  return worst;
};
const worstTriple = () => {
  let worst = { d: Infinity, at: [] };
  for (const kind of ['stand', 'cluster']) {
    const of = plants.flatMap((p, i) => (p.kind === kind ? [i] : []));
    for (const a of of) {
      for (const b of of) {
        for (const c of of) {
          if (a === b || b === c || a >= c) continue;
          const d = deviation(plants[a], plants[b], plants[c]);
          if (d !== null && d < worst.d) worst = { d, at: [a, b, c] };
        }
      }
    }
  }
  return worst;
};
for (let worst = worstTriple(); worst.d < ALIGN_M; worst = worstTriple()) {
  const floor = Math.min(LANE_SHARE, ...LANES.map((y) => covered(y, standShapes())));
  let moved = false;
  for (let k = 0; k < 600 && !moved; k++) {
    const i = worst.at[Math.floor(rand() * 3)];
    const p = plants[i];
    const q = {
      ...p,
      x: Math.round((p.x + (rand() * 2 - 1) * 10) * 10) / 10,
      y: Math.round((p.y + (rand() * 2 - 1) * 10) * 10) / 10,
      yaw: degree(Math.round(((p.yaw + (rand() * 2 - 1) * 0.2) * 180) / Math.PI)),
    };
    const sq = shape(q);
    if (!valid(i, q, sq) || worstThrough(i, q) <= worst.d + 0.05) continue;
    if (p.kind === 'stand') {
      const list = standShapes();
      list[i] = sq;
      if (LANES.some((y) => covered(y, list) < floor)) continue;
    }
    plants[i] = q;
    shapes[i] = sq;
    moved = true;
  }
  if (!moved) break;
}

// Hold the rules once more on what is printed.
plants.forEach((p, i) => {
  if (!valid(i, p, shape(p))) throw new Error(`the ${p.kind} at ${p.x},${p.y} breaks a rule`);
});
const nearest = worstTriple().d;
const thinnest = Math.min(...LANES.map((y) => covered(y, standShapes())));

const print = (kind) =>
  plants
    .filter((p) => p.kind === kind)
    .sort((u, v) => u.y - v.y || u.x - v.x)
    .map((p) => `  [${p.x}, ${p.y}, ${Math.round((p.yaw * 180) / Math.PI)}],`)
    .join('\n');
console.log(`// seed ${SEED}, ${SWEEPS} sweeps: nearest to a row ${nearest.toFixed(1)} m,`);
const turned = plants.filter((p) => p.kind === 'stand').map((p) => Math.abs(p.yaw));
console.log(
  `// thinnest north-flank line ${(thinnest * 100).toFixed(0)}% of the tread; stands turned ` +
    `${((turned.reduce((a, b) => a + b, 0) / turned.length) * (180 / Math.PI)).toFixed(1)} degrees ` +
    `on average, ${turned.filter((t) => t < Math.PI / 18).length} within 10`
);
console.log(`const KELP_STANDS = [\n${print('stand')}\n] as const;`);
console.log(`const KELP_CLUSTERS = [\n${print('cluster')}\n] as const;`);

// The plan, before and after, north up.
const panel = (list, dy, title) => {
  const X = (x) => ((x - 950) * 0.4).toFixed(1);
  const Y = (y) => ((y - 440) * 0.4 + dy).toFixed(1);
  const drawn = list
    .map((p) => {
      const points = shape(p)
        .corners.map(([x, y]) => `${X(x)},${Y(y)}`)
        .join(' ');
      const fill = p.kind === 'stand' ? '#2f7d58' : '#5fae7e';
      const plant = `<polygon points="${points}" fill="${fill}" stroke="#9fd8b4" stroke-width="0.6"/>`;
      if (p.kind !== 'stand') return plant;
      const tip = [p.x + 30 * Math.cos(p.yaw), p.y - 30 * Math.sin(p.yaw)];
      return `${plant}<line x1="${X(p.x)}" y1="${Y(p.y)}" x2="${X(tip[0])}" y2="${Y(tip[1])}" stroke="#e8c45a" stroke-width="0.8"/>`;
    })
    .join('');
  return [
    `<rect x="${X(1000)}" y="${Y(1000)}" width="800" height="100" fill="#1b2a30"/>`,
    `<rect x="${X(1000)}" y="${Y(500)}" width="800" height="400" fill="none" stroke="#35505c" stroke-width="0.8"/>`,
    `<rect x="${X(1125)}" y="${Y(625)}" width="700" height="300" fill="none" stroke="#3f6b4c" stroke-dasharray="4 3" stroke-width="0.8"/>`,
    `<text x="${X(1960)}" y="${Y(1135)}" fill="#8a8a6a" font-size="11" font-family="monospace">clearing</text>`,
    drawn,
    `<text x="8" y="${(dy + 14).toFixed(1)}" fill="#dde4e8" font-size="12" font-family="monospace">${title}</text>`,
  ].join('');
};
writeFileSync(
  new URL('plan.svg', import.meta.url),
  [
    '<svg xmlns="http://www.w3.org/2000/svg" width="840" height="900" viewBox="0 0 840 900">',
    '<rect width="840" height="900" fill="#0c161e"/>',
    panel(before, 0, "Before: #1751's rows, each stand facing down-current (yellow, +x)"),
    panel(plants, 450, `After: #1773's list, seed ${SEED}`),
    '</svg>\n',
  ].join('')
);
