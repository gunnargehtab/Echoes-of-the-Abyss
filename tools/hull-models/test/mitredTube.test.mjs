/**
 * kit.mjs `mitredTube` draws a pipe along a polyline with the joints cut
 * on the bisecting plane (#1011, the Knights' Bastion conduits). What a
 * reader of its buffer relies on: the triangle count its docstring
 * promises, a closed skin when capped, a winding that faces out, a flat
 * toward `down` at the apothem, and a refusal where a run cannot be drawn
 * rather than a buffer that looks like one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mitredTube } from '../kit.mjs';

// `faceted` writes float32, so a corner reads 0.3999999961 for 0.4: tolerances are 1e-5.
const positions = (geo) => geo.attributes.position.array;
const triangles = (geo) => positions(geo).length / 9;

/** Six times the volume the triangles enclose; positive when they face out. */
function signedVolume(geo) {
  const a = positions(geo);
  let six = 0;
  for (let t = 0; t < a.length; t += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = a.subarray(t, t + 9);
    six += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  return six;
}

/** Every edge's count across the triangles, vertices matched by position. */
function edgeCounts(geo) {
  const a = positions(geo);
  const key = (i) => [a[i], a[i + 1], a[i + 2]].map((v) => v.toFixed(6)).join(',');
  const counts = new Map();
  for (let t = 0; t < a.length; t += 9) {
    const k = [key(t), key(t + 3), key(t + 6)];
    for (let e = 0; e < 3; e++) {
      const edge = [k[e], k[(e + 1) % 3]].sort().join('|');
      counts.set(edge, (counts.get(edge) ?? 0) + 1);
    }
  }
  return counts;
}

const across = { down: [0, 0, -1] }; // the bent run lies in the xy-plane
const bent = [
  [0, 0, 0],
  [4, 0, 0],
  [4, 3, 0],
  [2, 6, 0],
];

test('a run of n points on f facets is 2f(n − 1) triangles, and 2f more capped', () => {
  for (const facets of [4, 6, 8]) {
    const open = mitredTube(bent, 0.3, { facets, caps: false, ...across });
    const capped = mitredTube(bent, 0.3, { facets, ...across });
    assert.equal(triangles(open), 2 * facets * (bent.length - 1));
    assert.equal(triangles(capped), 2 * facets * (bent.length - 1) + 2 * facets);
  }
});

test('a capped run is closed: every edge is shared by two triangles', () => {
  const counts = edgeCounts(mitredTube(bent, 0.3, { facets: 6, ...across }));
  assert.ok(counts.size > 0);
  assert.deepEqual([...new Set(counts.values())], [2]);
});

test('an open run is closed but for its two rims', () => {
  const counts = edgeCounts(mitredTube(bent, 0.3, { facets: 6, caps: false, ...across }));
  const rim = [...counts.values()].filter((n) => n === 1).length;
  assert.equal(rim, 12);
  assert.ok([...counts.values()].every((n) => n <= 2));
});

test('the winding faces out: a straight pipe encloses its prism volume, a bend a positive one', () => {
  const r = 0.5;
  const straight = mitredTube(
    [
      [0, 0, 0],
      [10, 0, 0],
    ],
    r,
    { facets: 6 }
  );
  const prism = 0.5 * 6 * r * r * Math.sin(Math.PI / 3) * 10;
  assert.ok(Math.abs(signedVolume(straight) / 6 - prism) < 1e-5, 'a hexagonal prism of its length');
  assert.ok(signedVolume(mitredTube(bent, 0.3, { facets: 6, ...across })) > 0);
});

test('a flat faces `down` at the apothem, and the pipe keeps its radius', () => {
  const r = 0.5;
  const geo = mitredTube(
    [
      [0, 0, 0],
      [10, 0, 0],
    ],
    r,
    { facets: 6, down: [0, -1, 0] }
  );
  const a = positions(geo);
  let low = Infinity;
  let far = 0;
  for (let i = 0; i < a.length; i += 3) {
    low = Math.min(low, a[i + 1]);
    far = Math.max(far, Math.hypot(a[i + 1], a[i + 2]));
  }
  assert.ok(Math.abs(low + r * Math.cos(Math.PI / 6)) < 1e-5, 'the lowest point is the flat');
  assert.ok(Math.abs(far - r) < 1e-5, 'the corners are on the radius');
});

test('a mitre keeps the section round the corner', () => {
  // A right-angle bend at (5, 0, 0): the joint ring lies on the bisecting
  // plane x + y = 5, and every other corner is r off one run's axis.
  const r = 0.4;
  const geo = mitredTube(
    [
      [0, 0, 0],
      [5, 0, 0],
      [5, 5, 0],
    ],
    r,
    { facets: 6, down: [0, 0, -1] }
  );
  const a = positions(geo);
  let onMitre = 0;
  for (let i = 0; i < a.length; i += 3) {
    const [x, y, z] = [a[i], a[i + 1], a[i + 2]];
    if (Math.abs(x + y - 5) < 1e-5) {
      onMitre++;
      continue;
    }
    const offAxis = Math.min(
      x <= 5 ? Math.hypot(y, z) : Infinity,
      y >= 0 ? Math.hypot(x - 5, z) : Infinity
    );
    // A corner is on the radius; a cap's centre is on the axis.
    assert.ok(Math.abs(offAxis - r) < 1e-5 || offAxis < 1e-5, `a corner ${offAxis} off its axis`);
  }
  assert.ok(onMitre > 0, 'the joint ring is on the mitre plane');
  assert.ok(signedVolume(geo) > 0);
});

test('a run it cannot draw is refused', () => {
  assert.throws(() => mitredTube([[0, 0, 0]], 0.3), /two points/);
  assert.throws(() => mitredTube(bent, 0.3, { down: [[0, -1, 0]] }), /downs for 3 runs/);
  assert.throws(
    () =>
      mitredTube(
        [
          [0, 0, 0],
          [0, 5, 0],
        ],
        0.3,
        { down: [0, -1, 0] }
      ),
    /own down/
  );
});
