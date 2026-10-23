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
import { Container, Graphics } from 'pixi.js';
import {
  Faction,
  HazardPhase,
  ResourceKind,
  SORROWGATE_REGION,
  type PlanRect,
} from '@echoes/shared';
import {
  createHost,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
} from './support/headless.ts';
import { cannedMap, cannedNodes, cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';
import { EchoRenderer, hearsWholeMap, type RendererCallbacks } from '../src/game/EchoRenderer.ts';
import { UI } from '../src/game/palette.ts';
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

describe('hearsWholeMap', () => {
  it('is true when one reach holds every corner', () => {
    assert.equal(hearsWholeMap([{ x: 2000, y: 2000, radiusM: 3000 }], MAP), true);
  });

  it('is true when two reaches hold the map between them and neither alone does', () => {
    const pair = [
      { x: 1000, y: 2000, radiusM: 2600 },
      { x: 3000, y: 2000, radiusM: 2600 },
    ];
    assert.equal(hearsWholeMap([pair[0]!], MAP), false);
    assert.equal(hearsWholeMap(pair, MAP), true);
  });

  it('is false while any arc of the envelope lies on the map', () => {
    assert.equal(hearsWholeMap([{ x: 2000, y: 2000, radiusM: 1500 }], MAP), false);
    assert.equal(hearsWholeMap([{ x: 0, y: 0, radiusM: 3000 }], MAP), false);
  });

  it('is false for a reach wholly off the map, and for none', () => {
    assert.equal(hearsWholeMap([{ x: -5000, y: 2000, radiusM: 1000 }], MAP), false);
    assert.equal(hearsWholeMap([], MAP), false);
  });
});

const views: PerspectiveView[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

describe('the chart at the rim', () => {
  async function boot(): Promise<{
    app: HeadlessApplication;
    chart: EchoRenderer;
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
    // A live current against the east rim, flowing east: its streak at
    // y 3,600 runs from x 3,919 to 4,021, so `traceLine` has a course to cut.
    const snapshot = cannedSnapshot();
    snapshot.hazards = [
      ...(snapshot.hazards ?? []),
      {
        id: 99,
        kind: 'cold-shock',
        x: 3970,
        y: 3700,
        radiusM: 300,
        phase: HazardPhase.Active,
        progress: 0.2,
        remainingS: 20,
        flowRad: 0,
      },
    ];
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
    return { app, chart, conn, ground, frame, teardown: () => chart.destroy() };
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

  it("cuts a current's streak on the rim", async () => {
    const { ground, frame, teardown } = await boot();
    try {
      frame();
      frame();
      // The streak's cut end; the rim stroke steps every 250 m, so no other
      // ink lands on the east rim at y 3,600.
      assert.ok(
        ground.some((p) => Math.abs(p.x - 4000) < 1e-6 && Math.abs(p.y - 3600) < 1e-6),
        'the streak ends on the east rim'
      );
    } finally {
      teardown();
    }
  });

  // Every stroke on the stage in the reach ink at a reach ring's alpha.
  const reachStrokes = (app: HeadlessApplication): Array<{ color: number; alpha: number }> => {
    const ink = new Set<number>([UI.sigMid, UI.sigHigh]);
    const found: Array<{ color: number; alpha: number }> = [];
    const walk = (node: Container): void => {
      for (const child of node.children) {
        if (child instanceof Graphics) {
          for (const instruction of child.context.instructions) {
            if (instruction.action !== 'stroke') continue;
            const style = (instruction.data as { style?: { color?: number; alpha?: number } })
              .style;
            const color = style?.color;
            const alpha = style?.alpha ?? 1;
            if (color !== undefined && ink.has(color) && (alpha === 0.27 || alpha === 0.35)) {
              found.push({ color, alpha });
            }
          }
        }
        walk(child as Container);
      }
    };
    walk(app.stage as unknown as Container);
    return found;
  };

  it('strokes the rim in the reach ink when the fleet hears the whole map', async () => {
    const { app, ground, frame, teardown } = await boot();
    try {
      frame();
      frame();
      // The canned fleet hears all of the 4 km map: hull 13 at SIG 62 holds
      // the north-west, hull 14 in the trench the south-east. No arc of the
      // envelope is left on the map, so systems-echo.md §9's reach is the rim.
      for (const [x, y] of [
        [0, 0],
        [4000, 0],
        [4000, 4000],
        [0, 4000],
      ] as const) {
        assert.ok(
          ground.some((p) => p.x === x && p.y === y),
          `the rim stroke reaches the corner (${x}, ${y})`
        );
      }
      // Both loud hulls are amber (SIG 62 and 30), and nothing is selected.
      assert.deepEqual(reachStrokes(app), [{ color: UI.sigMid, alpha: 0.27 }]);
    } finally {
      teardown();
    }
  });

  it("takes the loudest ringed hull's ink, and the selected alpha", async () => {
    const { app, chart, conn, frame, teardown } = await boot();
    try {
      // Hull 13 over §3's red stop: its reach only grows, so the map is still
      // heard whole, and the rim takes its ink rather than hull 14's amber.
      const base = cannedSnapshot(2);
      const red = {
        ...base,
        units: base.units.map((unit) => (unit.id === 13 ? { ...unit, sig: 70 } : unit)),
      };
      chart.applySnapshot(red);
      conn.applySnapshot(red);
      frame();
      frame();
      assert.deepEqual(reachStrokes(app), [{ color: UI.sigHigh, alpha: 0.27 }]);
      // Selecting a ringed hull lifts the rim to the selected ring's alpha.
      // Set directly: a click picks the nearest own entity, and a structure
      // stands beside hull 13.
      (chart as unknown as { selected: Set<number> }).selected.add(14);
      frame();
      frame();
      assert.deepEqual(reachStrokes(app), [{ color: UI.sigHigh, alpha: 0.35 }]);
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
