/**
 * Ground-lying chart ink ends at the map's rim (#1556).
 *
 * The rim is chart ink and the skirt the water the world ends in
 * (docs/map-visuals.md §5, docs/world-map.md §7.4), so a ring or a fill that
 * kept going past both was drawn over nothing. The booted half holds the real
 * chart to it: every ground point it projects in a frame stands on the map.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { Faction, ResourceKind, SORROWGATE_REGION, type PlanRect } from '@echoes/shared';
import {
  createHost,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
} from './support/headless.ts';
import { cannedMap, cannedNodes, cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';
import { EchoRenderer, type RendererCallbacks } from '../src/game/EchoRenderer.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { clipPolygon, clipSegment } from '../src/game/rimClip.ts';

const MAP: PlanRect = { x: 0, y: 0, widthM: 4000, heightM: 4000 };

describe('clipSegment', () => {
  const span: [number, number] = [0, 0];

  it('keeps a segment inside whole, and refuses one wholly outside', () => {
    assert.equal(clipSegment(MAP, 100, 100, 3900, 3900, span), true);
    assert.deepEqual(span, [0, 1]);
    assert.equal(clipSegment(MAP, -500, 100, -100, 3900, span), false);
    assert.equal(clipSegment(MAP, 4100, -10, 4200, -20, span), false);
  });

  it('cuts at the edge it crosses, either way', () => {
    assert.equal(clipSegment(MAP, -100, 2000, 300, 2000, span), true);
    assert.deepEqual(span, [0.25, 1]);
    assert.equal(clipSegment(MAP, 3900, 2000, 4300, 2000, span), true);
    assert.deepEqual(span, [0, 0.25]);
  });

  it('cuts both ends of a chord across a corner', () => {
    // From (-100, 300) to (300, -100): in across x = 0 at t 0.25, out across
    // y = 0 at t 0.75.
    assert.equal(clipSegment(MAP, -100, 300, 300, -100, span), true);
    assert.deepEqual(span, [0.25, 0.75]);
  });

  it('counts a point on the rim as on the map, and one off it as not', () => {
    assert.equal(clipSegment(MAP, 0, 2000, 0, 2000, span), true);
    assert.equal(clipSegment(MAP, -0.001, 2000, -0.001, 2000, span), false);
  });
});

describe('clipPolygon', () => {
  it('leaves a polygon inside unchanged', () => {
    const square = [100, 100, 200, 100, 200, 200, 100, 200];
    assert.deepEqual(clipPolygon(MAP, square), square);
  });

  it('cuts a polygon across a corner to the part on the map', () => {
    const square = [-100, -100, 100, -100, 100, 100, -100, 100];
    const cut = clipPolygon(MAP, square);
    const xs = cut.filter((_, i) => i % 2 === 0);
    const ys = cut.filter((_, i) => i % 2 === 1);
    assert.equal(Math.min(...xs), 0);
    assert.equal(Math.min(...ys), 0);
    assert.equal(Math.max(...xs), 100);
    assert.equal(Math.max(...ys), 100);
  });

  it('leaves nothing of a polygon wholly off the map', () => {
    assert.deepEqual(clipPolygon(MAP, [-300, 10, -200, 10, -200, 90]), []);
  });
});

const views: PerspectiveView[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

describe('the chart at the rim', () => {
  async function boot(): Promise<{
    conn: PerspectiveView;
    ground: { x: number; y: number }[];
    frame(): void;
    teardown(): void;
  }> {
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
    // The issue's two cases on the canned 4 km map: a corner site whose rim
    // and fill cross two edges, as a resonance storm's does on the Abyssal
    // Rift Corridor, and a resource field that crosses one.
    const map = cannedMap();
    map.hazards = [
      ...(map.hazards ?? []),
      { x: 600, y: 600, radiusM: 900, kind: 'resonance-storm', simulated: false },
    ];
    chart.setMap(map);
    chart.setNodes([
      ...cannedNodes(),
      { id: 9, x: 150, y: 2000, kind: ResourceKind.Nodule, depth: 1400, initialAmount: 5000 },
    ]);
    chart.setIdentity(0, Faction.Bathyarch);
    conn.setIdentity(0, Faction.Bathyarch);
    const snapshot = cannedSnapshot();
    chart.applySnapshot(snapshot);
    conn.applySnapshot(snapshot);

    // Every ground point the chart asks the conn view for, in world metres.
    const ground: { x: number; y: number }[] = [];
    const project = conn.projectPoint.bind(conn);
    mock.method(conn, 'projectPoint', (...args: Parameters<PerspectiveView['projectPoint']>) => {
      if (args[2] === null) ground.push({ x: args[0], y: args[1] });
      return project(...args);
    });
    const frame = (): void => {
      pumpAnimationFrames();
      app.frame();
    };
    return { conn, ground, frame, teardown: () => chart.destroy() };
  }

  const offMap = (points: { x: number; y: number }[]) =>
    points.filter((p) => p.x < -1e-6 || p.y < -1e-6 || p.x > 4000 + 1e-6 || p.y > 4000 + 1e-6);

  it('projects no ground point past the rim, and still reaches it', async () => {
    const { ground, frame, teardown } = await boot();
    try {
      frame();
      frame();
      assert.ok(ground.length > 0, 'the chart drew ground ink');
      assert.deepEqual(offMap(ground), [], 'nothing projected past the rim');
      // The rings end on the rim, not at their last vertex short of it.
      assert.ok(
        ground.some((p) => Math.abs(p.x) < 1e-6),
        'a ring meets the west rim'
      );
      assert.ok(
        ground.some((p) => Math.abs(p.y) < 1e-6),
        'a ring meets the north rim'
      );
    } finally {
      teardown();
    }
  });

  it('draws past the rim without the cut: the control that the test can fail', async () => {
    const { conn, ground, frame, teardown } = await boot();
    try {
      mock.method(conn, 'inkBounds', () => null);
      frame();
      frame();
      assert.ok(offMap(ground).length > 0, 'uncut, the corner site runs off the map');
    } finally {
      teardown();
    }
  });

  it("bounds ink by the mission's rectangle alone, and not a placed mission's", () => {
    const gl = new HeadlessWebGLRenderer();
    const alone = new PerspectiveView();
    const placed = new PerspectiveView('sorrowgate', SORROWGATE_REGION);
    views.push(alone, placed);
    for (const view of [alone, placed]) {
      view.mount(
        createHost(1280, 720) as unknown as HTMLElement,
        () => gl.asRenderer(),
        gl.environment
      );
      view.setTerrain(cannedTerrain());
    }
    assert.deepEqual(alone.inkBounds(), MAP);
    // Its exterior is ground (docs/world-map.md §7.4), so ink lands on it.
    assert.equal(placed.inkBounds(), null);
  });
});
