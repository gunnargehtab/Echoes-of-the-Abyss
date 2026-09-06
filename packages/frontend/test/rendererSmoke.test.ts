/**
 * The renderer smoke test (#443).
 *
 * `EchoRenderer` and `PerspectiveView` are the two largest files in the client
 * and between them carry the whole of the shipped picture, and until this file
 * neither had a single automated assertion on it — the argument being that
 * both end in a GL context and CI has no GPU. That argument covers *pixels*,
 * which stay the screenshot gates in docs/graphics-standards.md. It never
 * covered the rest: the layer wiring, the HUD build, the snapshot apply, the
 * pooling, the input attach, the teardown. Those are ordinary JavaScript, and
 * this file boots the real classes and holds them to the promises they make.
 *
 * Only the two rasterisers are stand-ins (test/support/headless.ts). Everything
 * else here is the shipped code path, including the vector-art fallback the
 * client runs on before its concept art decodes.
 *
 * Every budget below is asserted on **counted work** — display objects, draw
 * instructions, scene-graph identities — never on a stopwatch, for the reason
 * packages/backend/test/match.test.ts spells out at length: a maximum of a
 * wall-clock sample is the noisiest statistic available on a shared runner,
 * while a count is a property of the algorithm and is the same everywhere.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Container } from 'pixi.js';
import { Faction } from '@echoes/shared';
import {
  createHost,
  dispatchWindow,
  drawInstructions,
  fireResizeObservers,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
  textCount,
  treeIdentities,
  treeSize,
  windowListenerCount,
  type StubElement,
} from './support/headless.ts';
import {
  cannedMap,
  cannedNodes,
  cannedSnapshot,
  cannedTerrain,
  CELL_M,
  COLS,
} from './support/cannedMatch.ts';
import { EchoRenderer, type RendererCallbacks } from '../src/game/EchoRenderer.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';

/** What the shell was told, in the order it was told. */
interface CallbackLog {
  calls: Array<{ name: string; args: unknown[] }>;
  names(): string[];
  first(name: string): unknown[] | undefined;
}

/**
 * A shell that answers every callback and remembers the question. A proxy
 * rather than twenty-five stubs: the interface is a list of notifications with
 * no return values, so there is nothing for a hand-written double to add
 * except a maintenance burden every time one is added.
 */
function recordingShell(): { callbacks: RendererCallbacks; log: CallbackLog } {
  const calls: CallbackLog['calls'] = [];
  const callbacks = new Proxy(
    {},
    {
      get:
        (_target, property) =>
        (...args: unknown[]): void => {
          calls.push({ name: String(property), args });
        },
    }
  ) as RendererCallbacks;
  return {
    callbacks,
    log: {
      calls,
      names: () => calls.map((call) => call.name),
      first: (name) => calls.find((call) => call.name === name)?.args,
    },
  };
}

/**
 * How many pooled symbols each overlay layer is holding, by the layer order
 * the class doc-comment fixes: structures under contacts under own units under
 * ordnance.
 */
function symbolCounts(app: HeadlessApplication): {
  structures: number;
  contacts: number;
  units: number;
  ordnance: number;
} {
  const overlay = app.stage.children[0] as Container;
  const at = (index: number): number => (overlay.children[index] as Container).children.length;
  return { structures: at(3), contacts: at(5), units: at(6), ordnance: at(7) };
}

interface Booted {
  chart: EchoRenderer;
  conn: PerspectiveView;
  app: HeadlessApplication;
  gl: HeadlessWebGLRenderer;
  chartHost: StubElement;
  connHost: StubElement;
  log: CallbackLog;
  /** One browser frame: the conn's rAF loop, then the chart's ticker. */
  frame(count?: number): void;
  teardown(): void;
}

/**
 * Boot both painters in the order `GameCanvas` boots them, and feed them the
 * payloads the room sends in the order it sends them. The sequence is the
 * point: a renderer that only works when told about the map before the terrain
 * is a renderer with a latent bug.
 */
async function boot(options: { webgl?: boolean } = {}): Promise<Booted> {
  const gl = new HeadlessWebGLRenderer();
  const app = new HeadlessApplication();
  const connHost = createHost(1280, 720);
  const chartHost = createHost(1280, 720);
  const { callbacks, log } = recordingShell();

  const conn = new PerspectiveView();
  const mounted = conn.mount(connHost as unknown as HTMLElement, () => {
    if (options.webgl === false) throw new Error('headless: WebGL unavailable');
    return gl.asRenderer();
  });
  assert.equal(mounted, options.webgl !== false, 'mount reports whether it got a context');
  conn.setActive(true);

  const chart = new EchoRenderer(callbacks, app.asApplication());
  await chart.init(chartHost as unknown as HTMLElement);
  chart.setConn(conn);

  const terrain = cannedTerrain();
  chart.setTerrain(terrain);
  conn.setTerrain(terrain);
  chart.setMap(cannedMap());
  chart.setNodes(cannedNodes());
  chart.setIdentity(0, Faction.Bathyarch);
  conn.setIdentity(0, Faction.Bathyarch);

  const snapshot = cannedSnapshot();
  chart.applySnapshot(snapshot);
  conn.applySnapshot(snapshot);

  return {
    chart,
    conn,
    app,
    gl,
    chartHost,
    connHost,
    log,
    frame: (count = 1) => {
      for (let i = 0; i < count; i++) {
        pumpAnimationFrames();
        app.frame();
      }
    },
    teardown: () => {
      chart.destroy();
      conn.destroy();
    },
  };
}

describe('renderer smoke test: the chart', () => {
  it('boots against a canned match and builds the layers it promises', async () => {
    const world = await boot();
    try {
      // The scene graph the class doc-comment describes: overlay, then HUD.
      assert.equal(world.app.stage.children.length, 2, 'stage is overlay + hud, in that order');
      const [overlay, hud] = world.app.stage.children;
      assert.equal(overlay!.children.length, 8, 'the eight overlay layers are wired');
      assert.ok(hud!.children.length >= 6, 'the HUD graphics layers are wired');

      // The HUD's labels are built once, at init, before any snapshot lands.
      assert.ok(
        textCount(world.app.stage) >= 10,
        `expected the HUD's labels to exist, saw ${textCount(world.app.stage)}`
      );
      assert.ok(world.app.renderer !== null, 'the application reports an initialised renderer');
    } finally {
      world.teardown();
    }
  });

  it('draws the canned snapshot: ink on every layer, and no exception', async () => {
    const world = await boot();
    try {
      assert.equal(drawInstructions(world.app.stage), 0, 'nothing is drawn before the first frame');
      world.frame(3);

      const [overlay, hud] = world.app.stage.children;
      assert.ok(
        drawInstructions(overlay as never) > 0,
        'the overlay drew the contacts, rings and ground it was given'
      );
      assert.ok(drawInstructions(hud as never) > 0, 'the HUD drew its panels');
    } finally {
      world.teardown();
    }
  });

  it('pools its marks: a repeated frame reuses every display object', async () => {
    const world = await boot();
    try {
      // Warm up first. The first frames legitimately allocate — the pools are
      // empty and the layer caches are cold — and a pooling test that counted
      // those would be measuring the warm-up rather than the steady state.
      world.frame(5);
      const size = treeSize(world.app.stage);
      const identities = treeIdentities(world.app.stage);

      world.frame(30);

      assert.equal(treeSize(world.app.stage), size, 'the tree neither grew nor shrank');
      // Identity, not just count: a frame that rebuilds its marks from scratch
      // holds its size while replacing every object in it, and that churn is
      // exactly what pooling exists to prevent. There is ordnance in the water
      // in this snapshot, so the force layers are on the frame cadence and
      // genuinely repainting — this is not a test of a renderer asleep.
      assert.deepEqual(
        treeIdentities(world.app.stage),
        identities,
        'thirty frames allocated no new display object'
      );
    } finally {
      world.teardown();
    }
  });

  it('sweeps the force pools the frame after the force goes, and keeps the ghosts', async () => {
    const world = await boot();
    try {
      world.frame(5);
      const before = symbolCounts(world.app);
      assert.deepEqual(
        before,
        { structures: 2, contacts: 7, units: 4, ordnance: 2 },
        'one pooled symbol per entity in the snapshot'
      );
      const size = treeSize(world.app.stage);

      const gone = cannedSnapshot(360);
      gone.units = [];
      gone.structures = [];
      gone.ordnance = [];
      gone.contacts = [];
      world.chart.applySnapshot(gone);
      world.conn.applySnapshot(gone);
      world.frame(5);

      const after = symbolCounts(world.app);
      assert.equal(after.units, 0, 'own hulls that left the snapshot returned their symbols');
      assert.equal(after.structures, 0, 'and so did own structures');
      assert.equal(after.ordnance, 0, 'and own ordnance');
      // Contacts are the exception, and it is a designed one: a contact that
      // stops being reported leaves "a fading trail of last-known positions"
      // for PERSISTENCE.GHOST_MARKER_DECAY_S. A frame count cannot outrun
      // twenty seconds of wall clock, so the ghosts are still here — and a
      // renderer that dropped them the moment the return stopped would be
      // deleting information the player is entitled to.
      assert.equal(after.contacts, 7, 'the contact ghosts outlive the contacts');

      const back = cannedSnapshot(420);
      world.chart.applySnapshot(back);
      world.conn.applySnapshot(back);
      world.frame(5);
      assert.deepEqual(symbolCounts(world.app), before, 'the force came back to the same pools');
      assert.equal(
        treeSize(world.app.stage),
        size,
        'and cost the same objects it cost the first time'
      );
    } finally {
      world.teardown();
    }
  });

  it('survives the awkward snapshots: an empty match, and a match with no ground', async () => {
    const world = await boot();
    try {
      const blank = cannedSnapshot(500);
      blank.units = [];
      blank.structures = [];
      blank.ordnance = [];
      blank.contacts = [];
      blank.marks = [];
      blank.hazards = [];
      blank.shoals = [];
      blank.jellies = [];
      blank.selfEvents = [];
      world.chart.applySnapshot(blank);
      world.conn.applySnapshot(blank);
      world.frame(3);

      // A renderer that has been told nothing at all. `resetForNewMatch` drops
      // the world; the frames after it are the ones between two matches.
      world.chart.resetForNewMatch();
      world.conn.resetForNewMatch();
      world.frame(3);
    } finally {
      world.teardown();
    }
  });

  it('takes a ground delta mid-match and keeps drawing', async () => {
    const world = await boot();
    try {
      world.frame(3);
      // A span of the shelf falls in: the collapse the missions author.
      const cells = [];
      for (let col = 6; col <= 9; col++) {
        cells.push({ index: 4 * COLS + col, floorM: 2900, ceilingM: 0, biome: 3 });
      }
      world.chart.applyGround(cells);
      world.conn.applyGround(cells);
      world.frame(3);

      assert.ok(drawInstructions(world.app.stage) > 0, 'the chart still has ink after the delta');
      assert.ok(world.gl.ledger.calls > 0, 'the conn still has a scene after the delta');
    } finally {
      world.teardown();
    }
  });
});

describe('renderer smoke test: the conn view', () => {
  it('builds a scene whose cost is a counted quantity, not a stopwatch', async () => {
    const world = await boot();
    try {
      world.frame(5);

      assert.ok(world.gl.ledger.frames >= 5, 'the frame loop actually ran');
      assert.ok(world.gl.ledger.calls > 0, 'the scene has drawable objects in it');
      assert.ok(
        world.gl.ledger.triangles > 0,
        'the terrain heightfield made it into the scene as geometry'
      );

      const calls = world.gl.ledger.calls;
      const triangles = world.gl.ledger.triangles;
      world.frame(20);
      assert.equal(world.gl.ledger.calls, calls, 'a still fleet costs the same calls every frame');
      assert.equal(world.gl.ledger.triangles, triangles, 'and the same triangles');
    } finally {
      world.teardown();
    }
  });

  it('reports the force it was given, and nothing about anyone else', async () => {
    const world = await boot();
    try {
      world.frame(3);
      const probe = (
        globalThis as unknown as { window: { __perspectiveProbe?: () => Record<string, unknown> } }
      ).window.__perspectiveProbe;
      assert.ok(probe !== undefined, 'the harness probe is exposed once the view is mounted');

      const report = probe();
      assert.equal(report.units, 4, 'four own hulls, every one of them in the scene');
      assert.equal(report.ordnance, 2, 'two own ordnance in the water');
      // One of the two structures, and the right one. A commissioned building
      // always has something to draw — its approved model, or the baked
      // sprite as the loading fallback — while a construction site with
      // neither a decoded sprite nor a model is `syncEntity`'s documented
      // no-op. This harness never decodes art, so the site is exactly that
      // case, and the conn view correctly puts nothing in the scene for it.
      assert.equal(report.structures, 1, 'the commissioned Bastion, not the building site');
      // Seven contacts are in the snapshot and none of them is in this scene:
      // the conn view draws own-force payloads only, which is what keeps the
      // world canvas from being a maphack.
      assert.equal(
        Object.keys(report).some((key) => key.includes('contact')),
        false,
        'the conn view holds nothing about contacts'
      );
    } finally {
      world.teardown();
    }
  });

  it('prices the composited frame as two halves, per station (#286)', async () => {
    const world = await boot();
    try {
      const probes = (
        globalThis as unknown as {
          window: {
            __perspectiveProbe?: () => Record<string, unknown>;
            __perspectiveStation?: (label?: string) => Record<string, unknown>;
          };
        }
      ).window;
      assert.ok(probes.__perspectiveStation !== undefined, 'the station boundary is exposed');
      const probe = probes.__perspectiveProbe!;
      const station = probes.__perspectiveStation!;

      world.frame(6);
      const closed = station('marquee');
      assert.equal(closed.station, null, 'the boot station was never named');
      // Six overlay ticks in, none after: the pair is what makes the zeroes
      // below a reset rather than a station that never ran.
      assert.equal(closed.overlayFrames, 6, 'and it closes holding the frames it drew');

      const opened = probe();
      assert.equal(opened.station, 'marquee', 'the new station carries its label');
      // The regression this exists for: a worst case that survived a station
      // boundary reported the loading hitch at every station of the drive.
      assert.equal(opened.worstFrameMs, 0, 'and no worst case from the station before it');
      assert.equal(opened.avgFrameMs, 0, 'nor an average');
      assert.equal(opened.stationFrames, 0, 'nor a frame count');
      assert.equal(opened.overlayFrames, 0, 'nor the overlay half of one');

      world.frame(5);
      const held = probe();
      // The overlay's count is exact where the composited interval's cannot
      // be: `recordOverlayCost` is a duration inside a call, so nothing
      // filters it, while a frame *interval* is dropped above 500 ms because
      // a tab-hidden gap is not a frame. So this is the counted assertion and
      // the one below it is the bounded one.
      assert.equal(held.overlayFrames, 5, 'every overlay tick reported into the conn probe');
      assert.ok(
        (held.stationFrames as number) > 0 && (held.stationFrames as number) <= 5,
        `the station counted its own frames, saw ${held.stationFrames}`
      );
      assert.equal(held.station, 'marquee', 'and stayed at the station across them');

      // Two painters, two numbers. Both halves are timed inside a call, so
      // both are present and neither is the other; what is asserted is that
      // the probe reports them separately at all, because a drive that reads
      // one number cannot choose which half to optimise.
      for (const key of ['avgConnMs', 'worstConnMs', 'avgOverlayMs', 'worstOverlayMs', 'fps']) {
        assert.equal(typeof held[key], 'number', `${key} is reported`);
      }
    } finally {
      world.teardown();
    }
  });

  it('takes the probes down with the view', async () => {
    const world = await boot();
    world.frame(2);
    world.teardown();
    const probes = globalThis as unknown as {
      window: { __perspectiveProbe?: unknown; __perspectiveStation?: unknown };
    };
    assert.equal(probes.window.__perspectiveProbe, undefined, 'the reading went with it');
    assert.equal(probes.window.__perspectiveStation, undefined, 'and so did the boundary');
  });

  it('is the only opinion about where the water is: project and resolve round-trip', async () => {
    const world = await boot();
    try {
      world.frame(3);
      // A point on the ground, projected to the screen and read back off it.
      // The two directions are what the chart uses to place every mark and to
      // interpret every click; if they ever disagree the marks drift off the
      // hulls they caption.
      const target = { x: 1800, y: 1700 };
      const depth = world.conn.seabedDepthAt(target.x, target.y);
      const projected = world.conn.projectPoint(target.x, target.y, depth);
      assert.ok(projected.visible, 'a point in the middle of the map is on screen');
      assert.ok(projected.pxPerM > 0, 'and has a positive local scale');

      const resolved = world.conn.resolveGround(projected.x, projected.y);
      assert.ok(
        Math.hypot(resolved.x - target.x, resolved.y - target.y) < CELL_M,
        `round-trip landed within a cell: ${JSON.stringify(resolved)} vs ${JSON.stringify(target)}`
      );
    } finally {
      world.teardown();
    }
  });

  it('follows the viewport when the window changes shape', async () => {
    const world = await boot();
    try {
      world.frame(3);
      const centre = { x: 2000, y: 2000 };
      const before = world.conn.projectPoint(centre.x, centre.y, null);

      // A layout change: the shell hands both canvases a new box, and the
      // conn view learns about it through its ResizeObserver.
      world.connHost.clientWidth = 800;
      world.connHost.clientHeight = 1200;
      world.chartHost.clientWidth = 800;
      world.chartHost.clientHeight = 1200;
      world.app.resize(800, 1200);
      fireResizeObservers();
      world.frame(3);

      const after = world.conn.projectPoint(centre.x, centre.y, null);
      assert.ok(after.visible, 'the point is still on screen in the new shape');
      assert.notDeepEqual(
        { x: Math.round(before.x), y: Math.round(before.y) },
        { x: Math.round(after.x), y: Math.round(after.y) },
        'the projection moved with the viewport rather than staying on the old aspect'
      );
      assert.equal(world.conn.groundQuad().length, 4, 'the ground footprint is still a quad');
      assert.ok(drawInstructions(world.app.stage) > 0, 'and the chart redrew into the new box');
    } finally {
      world.teardown();
    }
  });

  it('degrades to a chart-only client when WebGL is unavailable', async () => {
    // The one path that has always been unreachable in a screenshot review,
    // because a machine that can take the screenshot has a GPU.
    const world = await boot({ webgl: false });
    try {
      world.frame(5);
      assert.equal(world.gl.ledger.frames, 0, 'nothing was rendered — there was nothing to render');
      // The chart still draws, and still asks the conn where things are; the
      // conn answers with its no-context fallbacks rather than throwing.
      assert.ok(drawInstructions(world.app.stage) > 0, 'the HUD is still on screen');
      assert.deepEqual(
        world.conn.resolveGround(640, 360),
        { x: 0, y: 0 },
        'a click resolves to the documented fallback rather than to an exception'
      );
    } finally {
      world.teardown();
    }
  });
});

describe('renderer smoke test: input and teardown', () => {
  it('turns a click and a right-click into a move order', async () => {
    const world = await boot();
    try {
      const snapshot = cannedSnapshot();
      const hull = snapshot.units[0]!;
      world.chart.focusOn(hull.x, hull.y);
      world.frame(2);

      const canvas = world.app.canvas;
      const at = world.conn.projectPoint(hull.x, hull.y, hull.depth);
      assert.ok(at.visible, 'the camera is looking at the hull we are about to click');

      canvas.dispatch('pointerdown', {
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: at.x,
        clientY: at.y,
      });
      canvas.dispatch('pointerup', {
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: at.x,
        clientY: at.y,
      });
      world.frame(1);

      canvas.dispatch('pointerdown', {
        button: 2,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: at.x + 120,
        clientY: at.y + 40,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
      });

      const order = world.log.first('onMoveOrder');
      assert.ok(order !== undefined, `expected a move order, saw ${world.log.names().join(', ')}`);
      assert.deepEqual(
        order[0],
        [hull.id],
        'the hull that was clicked is the hull that was ordered'
      );
    } finally {
      world.teardown();
    }
  });

  it('detaches every listener it attached', async () => {
    const before = windowListenerCount();
    const world = await boot();
    world.frame(2);

    const canvas = world.app.canvas;
    assert.ok(canvas.listenerCount() > 0, 'the canvas is listening while mounted');
    assert.ok(windowListenerCount() > before, 'so is the window');

    world.teardown();

    assert.equal(canvas.listenerCount(), 0, 'the canvas listeners are gone');
    assert.equal(windowListenerCount(), before, 'and so are the window listeners');
    assert.equal(world.app.destroyed, true, 'the application was destroyed');
    assert.equal(world.gl.disposed, true, 'and the GL renderer was disposed');

    // A key pressed after teardown reaches nothing. This is the leak that
    // survives a StrictMode double-mount and drives the next match's camera.
    dispatchWindow('keydown', { code: 'KeyW' });
  });
});
