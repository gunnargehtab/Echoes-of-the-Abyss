/**
 * The scope's camera box stops at the frame and keeps its shape (#1558).
 *
 * The box is the navigator and the compass (docs/free-camera.md §5,
 * docs/ui-ux.md §5). Clamped corner by corner, a camera looking past the
 * map's edge drew it as a triangle or a slash; cut as a polygon, its edges run
 * where the view truly runs and end at the frame. The booted half reads the
 * real chart's scope strokes off a real conn camera.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { Graphics, GraphicsPath } from 'pixi.js';
import type { PlanRect } from '@echoes/shared';
import {
  createHost,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
} from './support/headless.ts';
import { cannedTerrain } from './support/cannedMatch.ts';
import { EchoRenderer, type RendererCallbacks } from '../src/game/EchoRenderer.ts';
import { UI } from '../src/game/palette.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { scopeBox } from '../src/game/scopeBox.ts';

const MAP: PlanRect = { x: 0, y: 0, widthM: 4000, heightM: 4000 };

/** A ground footprint, far edge first, as `groundQuad` returns it. */
const quad = (...xy: number[]) => [0, 1, 2, 3].map((i) => ({ x: xy[i * 2]!, y: xy[i * 2 + 1]! }));

/** Twice the signed area of a flat polygon; its size is all the tests need. */
const area = (points: readonly number[]): number => {
  let sum = 0;
  const n = points.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    sum += points[i * 2]! * points[j * 2 + 1]! - points[j * 2]! * points[i * 2 + 1]!;
  }
  return Math.abs(sum) / 2;
};

const inside = (points: readonly number[], rect: PlanRect): boolean =>
  points.every((v, i) =>
    i % 2 === 0
      ? v >= rect.x - 1e-6 && v <= rect.x + rect.widthM + 1e-6
      : v >= rect.y - 1e-6 && v <= rect.y + rect.heightM + 1e-6
  );

describe('scopeBox', () => {
  it('leaves a footprint on the map as it is', () => {
    const box = scopeBox(quad(1000, 1000, 3000, 1000, 2500, 2500, 1500, 2500), MAP);
    assert.deepEqual(box.outline, [1000, 1000, 3000, 1000, 2500, 2500, 1500, 2500]);
    assert.deepEqual(box.far, [1000, 1000, 3000, 1000]);
  });

  it("cuts a footprint past the north edge at the edge, keeping its sides' slope", () => {
    // Facing north from the middle of the map: the far edge is 2 km past the
    // rim. Clamped one by one, the two far corners would land on y = 0 at
    // x = -1000 → 0 and 5000 → 4000, and the sides would bend to meet them.
    const box = scopeBox(quad(-1000, -2000, 5000, -2000, 2500, 3000, 1500, 3000), MAP);
    assert.ok(inside(box.outline, MAP), 'nothing past the frame');
    // The left side runs from (1500, 3000) to (-1000, -2000): x falls 0.5 m
    // per metre north, so it meets the west edge at y = 0, the corner.
    // The right, mirrored, meets the east edge at y = 0 too.
    assert.ok(Math.abs(area(box.outline) - (4000 * 3000 - (2 * (1500 * 3000)) / 2)) < 1e-6);
    // The far edge is off the map, so the heavy edge is the cut on the north
    // rim: still the side the camera faces.
    assert.deepEqual(box.far, [0, 0, 4000, 0]);
  });

  it('keeps the part of the far edge that is on the map', () => {
    const box = scopeBox(quad(-1000, 500, 2000, 500, 1800, 2000, 800, 2000), MAP);
    assert.deepEqual(box.far, [0, 500, 2000, 500]);
  });

  it('turns with the camera: facing east past the east edge, the heavy edge is the east rim', () => {
    const box = scopeBox(quad(6000, -500, 6000, 4500, 2500, 2400, 2500, 1600), MAP);
    assert.ok(inside(box.outline, MAP));
    const [x0, , x1] = box.far!;
    assert.equal(x0, 4000);
    assert.equal(x1, 4000);
  });

  it('marks the rim the view leaves by, not the nearest sliver of frame', () => {
    // Pitched low and turned north-north-west near the north-east corner: the
    // top corners are near the horizon. The view's centre line leaves by the
    // north rim, though the box also clips a 616 m sliver of the west one.
    const box = scopeBox(quad(-873215, -477581, 26647, -997117, 4094, 1591, 2968, 2241), MAP);
    assert.deepEqual(box.far, [0, 0, 4000, 0]);
  });

  it('draws nothing for a view wholly off the map, or no footprint at all', () => {
    assert.deepEqual(scopeBox(quad(5000, 0, 6000, 0, 6000, 1000, 5000, 1000), MAP), {
      outline: [],
      far: null,
    });
    assert.deepEqual(scopeBox([], MAP), { outline: [], far: null });
  });
});

const views: PerspectiveView[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

describe('the camera box on the scope', () => {
  async function boot() {
    const gl = new HeadlessWebGLRenderer();
    const app = new HeadlessApplication();
    const conn = new PerspectiveView();
    views.push(conn);
    conn.mount(
      createHost(1280, 720) as unknown as HTMLElement,
      () => gl.asRenderer(),
      gl.environment
    );
    conn.setActive(true);
    const callbacks = new Proxy({} as RendererCallbacks, { get: () => () => undefined });
    const chart = new EchoRenderer(callbacks, app.asApplication());
    await chart.init(createHost(1280, 720) as unknown as HTMLElement);
    chart.setConn(conn);
    const terrain = cannedTerrain();
    chart.setTerrain(terrain);
    conn.setTerrain(terrain);
    const frame = (): void => {
      pumpAnimationFrames();
      app.frame();
    };
    return { chart, conn, frame, teardown: () => chart.destroy() };
  }

  /** The box's two strokes on the scope: the outline, and the heavy far edge. */
  function boxStrokes(chart: EchoRenderer): { outline: number[]; far: number[]; size: number } {
    const g = (chart as unknown as { minimapOverlayG: Graphics }).minimapOverlayG;
    let outline: number[] = [];
    const far: number[] = [];
    for (const instruction of g.context.instructions) {
      if (instruction.action !== 'stroke') continue;
      const data = instruction.data as {
        style?: { color?: number; alpha?: number; width?: number };
        path?: GraphicsPath;
      };
      if (data.style?.color !== UI.text) continue;
      for (const step of (data.path?.instructions ?? []) as Array<{
        action: string;
        data: unknown[];
      }>) {
        if (data.style.alpha === 0.6 && step.action === 'poly') {
          outline = [...(step.data[0] as number[])];
        } else if (data.style.alpha === 0.85) {
          far.push(...(step.data as number[]).slice(0, 2));
        }
      }
    }
    const { size } = (chart as unknown as { minimapRect(): { size: number } }).minimapRect();
    return { outline, far, size };
  }

  /** Whether (x, y) is inside a convex polygon of flat x, y pairs, either winding. */
  const withinConvex = (points: readonly number[], x: number, y: number): boolean => {
    let sign = 0;
    const n = points.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const ax = points[i * 2]!;
      const ay = points[i * 2 + 1]!;
      const cross = (points[j * 2]! - ax) * (y - ay) - (points[j * 2 + 1]! - ay) * (x - ax);
      if (cross === 0) continue;
      if (sign !== 0 && Math.sign(cross) !== sign) return false;
      sign = Math.sign(cross);
    }
    return true;
  };

  it('covers exactly the ground the camera sees when it looks past the rim', async () => {
    const { chart, conn, frame, teardown } = await boot();
    try {
      // From near the north-west corner, turned 45° and pitched low: the view
      // runs past the north, east and west rims, which clamped corner by
      // corner drew a box over a third smaller than the ground in view.
      conn.setFrame({ xM: 900, yM: 900, distanceM: 2500, yawDeg: -45, pitchDeg: 35 });
      frame();
      const corners = conn.groundQuad().flatMap((p) => [p.x, p.y]);
      assert.ok(
        corners.some((v, i) => (i % 2 === 0 ? v < 0 || v > 4000 : v < 0)),
        `the view runs past the rim: ${corners.map(Math.round)}`
      );

      const { outline, far, size } = boxStrokes(chart);
      assert.ok(outline.length >= 6, 'the box is drawn as a polygon');
      assert.ok(inside(outline, { x: 0, y: 0, widthM: size, heightM: size }), 'inside the frame');
      // Sampled across the map: a point is in the drawn box exactly when the
      // camera's true footprint holds it. Read off the quad itself, not
      // through `scopeBox`, so the test does not grade the cut by the cut.
      const k = size / 4000;
      const scaled = outline.map((v) => v / k);
      const wrong: string[] = [];
      for (let row = 0; row < 50; row++) {
        for (let col = 0; col < 50; col++) {
          const x = (col + 0.5) * 80;
          const y = (row + 0.5) * 80;
          if (withinConvex(corners, x, y) !== withinConvex(scaled, x, y))
            wrong.push(`(${x}, ${y})`);
        }
      }
      assert.deepEqual(wrong, [], 'the box holds the footprint, no more and no less');
      // The heavy edge: the view's centre line leaves by the north rim, so the
      // box's side on it, with length — a compass needle, not a point.
      assert.equal(far.length, 4, 'one heavy edge');
      assert.ok(Math.abs(far[1]!) < 1e-6 && Math.abs(far[3]!) < 1e-6, `on the north rim: ${far}`);
      assert.ok(Math.abs(far[2]! - far[0]!) > 0.1 * size, 'with length');
    } finally {
      teardown();
    }
  });

  it('draws the true far edge where it is on the map', async () => {
    const { chart, conn, frame, teardown } = await boot();
    try {
      conn.setFrame({ xM: 2000, yM: 2400, distanceM: 1500, yawDeg: 0, pitchDeg: 55 });
      frame();
      const corners = conn.groundQuad().map((p) => ({ ...p }));
      assert.ok(inside([corners[0]!.x, corners[0]!.y, corners[1]!.x, corners[1]!.y], MAP));
      const { far, size } = boxStrokes(chart);
      const k = size / 4000;
      assert.deepEqual(
        far.map((v) => Number(v.toFixed(6))),
        [corners[0]!.x * k, corners[0]!.y * k, corners[1]!.x * k, corners[1]!.y * k].map((v) =>
          Number(v.toFixed(6))
        )
      );
    } finally {
      teardown();
    }
  });
});
