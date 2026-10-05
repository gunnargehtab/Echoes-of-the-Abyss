/**
 * The scope's sweep and range rings, cut at the scope's frame — docs/ui-ux.md
 * §5 (#1086).
 *
 * The renderer smoke test holds the shipped scope to its frame over one
 * revolution. This file holds the geometry under it at the anchors that smoke
 * test cannot reach: the middle, a corner, an edge, and a ring that swallows
 * the whole scope.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  arcsInFrame,
  rayToFrame,
  ringLabelsInFrame,
  sectorInFrame,
  SWEEP_TRAIL_RAD,
} from '../src/game/scopeSweep.ts';

const SIZE = 138;
const TAU = Math.PI * 2;
const EPS = 1e-9;

/** Anchors across the scope, edges and corners included. */
const ANCHORS: Array<[number, number]> = [
  [SIZE / 2, SIZE / 2],
  [20.7, 20.7],
  [SIZE - 3, 9],
  [0, SIZE / 3],
  [SIZE, SIZE],
  [41, SIZE - 0.5],
];

function inFrame(x: number, y: number): boolean {
  return x >= -EPS && x <= SIZE + EPS && y >= -EPS && y <= SIZE + EPS;
}

function onEdge(x: number, y: number): boolean {
  return (
    Math.abs(x) < 1e-6 ||
    Math.abs(y) < 1e-6 ||
    Math.abs(x - SIZE) < 1e-6 ||
    Math.abs(y - SIZE) < 1e-6
  );
}

/** A flat polygon's area, by the shoelace. */
function area(points: number[]): number {
  let twice = 0;
  for (let i = 0; i < points.length; i += 2) {
    const j = (i + 2) % points.length;
    twice += points[i]! * points[j + 1]! - points[j]! * points[i + 1]!;
  }
  return Math.abs(twice) / 2;
}

describe('the sweep line ends at the scope’s edge', () => {
  it('meets the edge it points at, from the middle', () => {
    const c = SIZE / 2;
    const cases: Array<[number, number, number]> = [
      [0, SIZE, c],
      [Math.PI / 2, c, SIZE],
      [Math.PI, 0, c],
      [-Math.PI / 2, c, 0],
      [Math.PI / 4, SIZE, SIZE],
    ];
    for (const [angle, x, y] of cases) {
      const end = rayToFrame(c, c, angle, SIZE);
      assert.ok(Math.abs(end.x - x) < 1e-9 && Math.abs(end.y - y) < 1e-9, `at ${angle} rad`);
    }
  });

  it('stays in the frame, on its edge and on its bearing, from anywhere in it', () => {
    for (const [cx, cy] of ANCHORS) {
      for (let step = 0; step < 360; step += 7.5) {
        const angle = (step * Math.PI) / 180;
        const end = rayToFrame(cx, cy, angle, SIZE);
        const at = `anchor (${cx}, ${cy}) at ${step}°`;
        assert.ok(inFrame(end.x, end.y), `${at}: (${end.x}, ${end.y}) is in the frame`);
        assert.ok(onEdge(end.x, end.y), `${at}: and on its edge`);
        // On the ray, not merely on the edge: no sideways component, and
        // nothing behind the anchor.
        const dx = end.x - cx;
        const dy = end.y - cy;
        assert.ok(
          Math.abs(dx * Math.sin(angle) - dy * Math.cos(angle)) < 1e-6,
          `${at}: on the ray`
        );
        assert.ok(dx * Math.cos(angle) + dy * Math.sin(angle) >= -1e-6, `${at}: ahead of it`);
      }
    }
  });
});

describe('the trail is the scope cut into a fan', () => {
  it('turns every corner between its two bearings', () => {
    // From the middle, the quarter facing +x holds the two right-hand corners.
    const c = SIZE / 2;
    const fan = sectorInFrame(c, c, -Math.PI / 4 - 0.1, Math.PI / 2 + 0.2, SIZE);
    const corners = [];
    for (let i = 0; i < fan.length; i += 2) {
      if ((fan[i] === 0 || fan[i] === SIZE) && (fan[i + 1] === 0 || fan[i + 1] === SIZE)) {
        corners.push([fan[i], fan[i + 1]]);
      }
    }
    assert.deepEqual(corners, [
      [SIZE, 0],
      [SIZE, SIZE],
    ]);
  });

  it('tiles the scope exactly over a turn, from any anchor', () => {
    // Fans of the trail's width laid edge to edge cover the square once: no
    // ink past the frame, and no gap a corner could fall through.
    const fans = Math.ceil(TAU / SWEEP_TRAIL_RAD);
    const span = TAU / fans;
    for (const [cx, cy] of ANCHORS) {
      let total = 0;
      for (let i = 0; i < fans; i++) {
        const fan = sectorInFrame(cx, cy, 0.3 + i * span, span, SIZE);
        for (let p = 0; p < fan.length; p += 2) {
          assert.ok(inFrame(fan[p]!, fan[p + 1]!), `anchor (${cx}, ${cy}): a vertex in the frame`);
        }
        total += area(fan);
      }
      assert.ok(
        Math.abs(total - SIZE * SIZE) < 1e-6,
        `anchor (${cx}, ${cy}): the fans cover ${total} px² of ${SIZE * SIZE}`
      );
    }
  });
});

describe('a range ring is cut to the arcs inside the scope', () => {
  it('is whole when it fits, and absent when it swallows the scope', () => {
    assert.deepEqual(arcsInFrame(SIZE / 2, SIZE / 2, 30, SIZE), [[0, TAU]]);
    assert.deepEqual(arcsInFrame(SIZE / 2, SIZE / 2, SIZE, SIZE), []);
    assert.deepEqual(arcsInFrame(SIZE / 2, SIZE / 2, 0, SIZE), []);
  });

  it('keeps exactly the part of the circle that is inside', () => {
    // Radii from the shipped 900 m and 2,400 m on maps from 4 to 12 km, and
    // one that only clips a corner.
    const radii = [10.4, 31, 46.6, 82.8, SIZE * 0.7];
    for (const [cx, cy] of ANCHORS) {
      for (const radius of radii) {
        const arcs = arcsInFrame(cx, cy, radius, SIZE);
        for (const [start, end] of arcs) assert.ok(start < end, 'arcs run clockwise');
        // Sample the circle: a point is kept exactly when it is in the frame.
        for (let step = 0.5; step < 720; step += 1) {
          const angle = (step * Math.PI) / 360;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const kept = arcs.some(
            ([start, end]) =>
              (angle >= start && angle <= end) || (angle + TAU >= start && angle + TAU <= end)
          );
          assert.equal(
            kept,
            inFrame(x, y),
            `anchor (${cx}, ${cy}), radius ${radius}, at ${step / 2}°: (${x.toFixed(2)}, ${y.toFixed(2)})`
          );
        }
      }
    }
  });
});

describe('each range ring carries its number, inside the scope (#1096)', () => {
  // About the boxes '900m' and '2400m' measure at 7.5 px.
  const label = (radius: number, width: number) => ({ radius, width, height: 9 });
  /** The shipped 900 m and 2,400 m rings on 4, 6 and 12 km maps. */
  const PAIRS: Array<[number, number]> = [
    [31, 82.8],
    [20.7, 55.2],
    [10.4, 27.6],
  ];

  it('sits just above the top of a ring the scope shows whole', () => {
    const c = SIZE / 2;
    const [spot] = ringLabelsInFrame(c, c, [label(31, 18)], SIZE);
    assert.deepEqual(spot, { x: c + 3, y: c - 31 - 2 - 9 });
  });

  it('comes in through the frame with a ring whose top is cut', () => {
    // From (20.7, 20.7) the 900 m ring on a 4 km map leaves through the top
    // edge at x = 20.7 + √(31² − 20.7²): the label goes just inside, there.
    const [spot] = ringLabelsInFrame(20.7, 20.7, [label(31, 18)], SIZE);
    assert.ok(spot !== null && spot !== undefined);
    assert.ok(Math.abs(spot.x - (20.7 + Math.sqrt(31 ** 2 - 20.7 ** 2) + 3)) < 1e-9);
    assert.ok(Math.abs(spot.y - 2) < 1e-9);
  });

  it('is absent exactly when its ring is, and never leaves the frame or overlaps', () => {
    for (const [cx, cy] of ANCHORS) {
      for (const [near, far] of PAIRS) {
        const spots = ringLabelsInFrame(cx, cy, [label(near, 18), label(far, 22)], SIZE);
        const boxes: Array<{ x: number; y: number; w: number }> = [];
        for (const [i, radius] of [near, far].entries()) {
          const where = `anchor (${cx}, ${cy}), ring ${radius}`;
          const spot = spots[i];
          const arcs = arcsInFrame(cx, cy, radius, SIZE);
          assert.equal(spot === null, arcs.length === 0, `${where}: a label iff a ring`);
          if (spot === null || spot === undefined) continue;
          const w = i === 0 ? 18 : 22;
          assert.ok(inFrame(spot.x, spot.y) && inFrame(spot.x + w, spot.y + 9), `${where}: framed`);
          // Beside its own ring: the label is set 3 px right and 2 px clear of
          // a visible point on it, so the box is within √13 px of the ring.
          let nearest = Infinity;
          for (const [start, end] of arcs) {
            for (const t of [
              end,
              ...Array.from({ length: 2000 }, (_, n) => start + ((end - start) * n) / 2000),
            ]) {
              const x = cx + Math.cos(t) * radius;
              const y = cy + Math.sin(t) * radius;
              const dx = Math.max(spot.x - x, 0, x - (spot.x + w));
              const dy = Math.max(spot.y - y, 0, y - (spot.y + 9));
              nearest = Math.min(nearest, Math.hypot(dx, dy));
            }
          }
          assert.ok(
            nearest <= Math.hypot(3, 2) + 1e-6,
            `${where}: ${nearest.toFixed(2)} px from its ring`
          );
          boxes.push({ x: spot.x, y: spot.y, w });
        }
        if (boxes.length === 2) {
          const [a, b] = boxes as [(typeof boxes)[0], (typeof boxes)[0]];
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + 9 <= b.y || b.y + 9 <= a.y;
          assert.ok(apart, `anchor (${cx}, ${cy}), rings ${near}/${far}: labels overlap`);
        }
      }
    }
  });
});
