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
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { CanvasTextMetrics, Container, Graphics, Text, type GraphicsPath } from 'pixi.js';
import {
  ACTIVE_SONAR,
  DEPTH,
  DRIFT_ROSTER,
  Faction,
  FOLLOW_FLOOR,
  FaunaSpecies,
  LID,
  MOVEMENT,
  MovementHoldReason,
  onTheGround,
  priceOf,
  ResolutionTier,
  SIM,
  SelfEventKind,
  StructureKind,
  structureStatsFor,
  type Contact,
  UnitKind,
  type MissionView,
  ObjectiveStatus,
  type OwnUnit,
} from '@echoes/shared';
import { FOCUS_DRAG_M_PER_PX, FOCUS_STEP_M, HOME_PITCH_DEG } from '../src/game/PerspectiveView.ts';
import { swayAt } from '../src/game/cameraSway.ts';
import type { MovePreviewReading } from '../src/game/movePreview.ts';
import { readsDisplayVeil, VEIL_SHADE_ATTRIBUTE } from '../src/game/veilShading.ts';
import { VEIL_FLOOR_RGB } from '../src/game/acousticVeil.ts';
import { HIT_PARTICLES_MIN } from '../src/game/hullHit.ts';
import { LIVE_TRACK_MS } from '../src/game/trackFidelity.ts';
import { priceTag, priceWords } from '../src/game/price.ts';
import {
  createHost,
  dispatchWindow,
  drawInstructions,
  carryRasterised,
  fireResizeObservers,
  HeadlessApplication,
  HeadlessGL,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
  textContents,
  textCount,
  textRasterisations,
  textSaying,
  textStyleKeys,
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
  ROWS,
} from './support/cannedMatch.ts';
import {
  collarRadius,
  EchoRenderer,
  SELECTION_GAP_M,
  YIELD,
  yieldToCells,
  type RendererCallbacks,
} from '../src/game/EchoRenderer.ts';
import type { ReadoutBox } from '../src/game/readouts.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { panFor } from '../src/audio/contactVoice.ts';
import type { ContactAudioFrame } from '../src/audio/contactMixer.ts';
import type { SelfAudioFrame } from '../src/audio/selfMixer.ts';
import { LampHaloPass } from '../src/game/lampHaloPass.ts';
import { ROOF_OPEN_OPACITY } from '../src/game/passages.ts';
import { FURNITURE_OUTLINE_ALPHA } from '../src/game/ladder.ts';
import { ONE_HANDED_BINDINGS } from '../src/input/bindings.ts';
import { NO_DECOY_TEXT } from '../src/game/dredge.ts';
import {
  CHROME_UNITS,
  CONSOLE_HEIGHT,
  HINT_LINE_HEIGHT,
  PANEL_CAP_UNITS,
  RIBBON_LABEL_GAP,
  RIBBON_LABEL_ROOM,
  RIBBON_UNITS,
  RIBBON_WIDTH,
  RIBBON_X,
  TOP_BAR_HEIGHT,
} from '../src/game/uiScale.ts';
import { clipSegment } from '../src/game/rimClip.ts';
import { HULL_LENGTH_M } from '../src/game/silhouettes.ts';
import { buildTemplate, instantiate } from '../src/game/rosterModels.ts';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { lampHaloStatus } from '../src/game/lampHaloStatus.ts';
import { AGENT_STIPPLE_LABEL } from '../src/game/faunaAgentStipple.ts';
import { FACTION_PALETTE, FAUNA_COLOR, TIER_STYLE, UI } from '../src/game/palette.ts';
import { RING_FAR_ALPHA, RING_NEAR_ALPHA } from '../src/game/scopeSweep.ts';
import {
  BufferAttribute,
  FogExp2,
  Mesh,
  MeshBasicMaterial,
  Points,
  ShaderMaterial,
  type Scene,
} from 'three';

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

/**
 * Every visible `Text` the strip drew, in the CSS pixels the readout boxes are
 * reported in.
 *
 * The renderer lays the HUD out in unscaled units and `this.hud` carries §11's
 * scale, so a glyph's on-screen box is its global position and its local extent
 * times that scale. Invisible subtrees are skipped rather than measured: a
 * readout the strip dropped for want of room is not on screen, and a control
 * may sit wherever it was.
 */
function stripGlyphs(
  app: HeadlessApplication,
  scale: number
): Array<{ text: string; x: number; y: number; width: number; height: number }> {
  const found: Array<{ text: string; x: number; y: number; width: number; height: number }> = [];
  const walk = (node: Container): void => {
    for (const child of node.children) {
      if (!child.visible) continue;
      if (child instanceof Text) {
        const at = child.getGlobalPosition();
        if (at.y < TOP_BAR_HEIGHT_PX * scale && child.text.length > 0) {
          found.push({
            text: child.text,
            x: at.x,
            y: at.y,
            width: child.width * scale,
            height: child.height * scale,
          });
        }
      } else {
        walk(child as Container);
      }
    }
  };
  walk(app.stage as unknown as Container);
  return found;
}

/**
 * Where a command-card label is drawn, in the client pixels a press is made
 * in. `paintCommandBar` anchors each label at its cell's centre, so this is
 * the point `pressBarButton` resolves to that cell.
 */
function barLabel(app: HeadlessApplication, label: string): { x: number; y: number } {
  const found: Array<{ x: number; y: number }> = [];
  const walk = (node: Container): void => {
    for (const child of node.children) {
      if (!child.visible) continue;
      if (child instanceof Text) {
        if (child.text === label) found.push(child.getGlobalPosition());
      } else {
        walk(child as Container);
      }
    }
  };
  walk(app.stage as unknown as Container);
  assert.equal(found.length, 1, `${label} is not on the command card exactly once`);
  return found[0]!;
}

/** Is a command-card cell drawn grey, as a cell that is not enabled is? */
function barGrey(app: HeadlessApplication, label: string): boolean {
  const found: Text[] = [];
  const walk = (node: Container): void => {
    for (const child of node.children) {
      if (!child.visible) continue;
      if (child instanceof Text) {
        if (child.text === label) found.push(child);
      } else {
        walk(child as Container);
      }
    }
  };
  walk(app.stage as unknown as Container);
  assert.equal(found.length, 1, `${label} is not on the command card exactly once`);
  return found[0]!.style.fill === UI.textDim;
}

/** `TOP_BAR_HEIGHT` in EchoRenderer, restated so a change to it fails here. */
const TOP_BAR_HEIGHT_PX = 52;

/**
 * The draw meter's segments, in the CSS pixels the readout boxes are reported
 * in (#757).
 *
 * The one part of the strip that is ink rather than a number: `drawHud` draws
 * the bar as `Graphics` rects, so no walk over `Text` can see it and the test
 * above — box against drawn glyph — is green while the bar prints through a
 * readout. Read off the queued draw instructions, which is this file's own
 * unit of evidence, rather than recomputed from the layout.
 *
 * Found by shape: `SEG` is the bar's own size in HUD units, and nothing else
 * on the strip is drawn at it. A rect of the same size is asserted to be one
 * of a run immediately right of the `DRAW` label before anything is concluded
 * from it, so a stray match cannot pass for the bar.
 */
const SEG = { width: 4, height: 9 };

function drawSegments(
  app: HeadlessApplication,
  scale: number
): Array<{ x: number; y: number; width: number; height: number }> {
  const found: Array<{ x: number; y: number; width: number; height: number }> = [];
  const walk = (node: Container): void => {
    for (const child of node.children) {
      if (!child.visible) continue;
      if (child instanceof Graphics) {
        const at = child.getGlobalPosition();
        for (const instruction of child.context.instructions) {
          if (instruction.action !== 'fill') continue;
          const path = (instruction.data as { path?: GraphicsPath }).path;
          for (const step of path?.instructions ?? []) {
            if (step.action !== 'rect') continue;
            const [x, y, width, height] = step.data as number[];
            if (width !== SEG.width || height !== SEG.height) continue;
            // Scoped by where the rect *is*, the way `stripGlyphs` scopes its
            // glyphs. A local y is a number inside whatever container drew it,
            // so ink far down the HUD has one under 52 as readily as the strip
            // does, and the shape filter above is then the only thing keeping
            // a stray rect out of the collision premise below.
            if (at.y + y! * scale >= TOP_BAR_HEIGHT_PX * scale) continue;
            found.push({
              x: at.x + x! * scale,
              y: at.y + y! * scale,
              width: width * scale,
              height: height * scale,
            });
          }
        }
      }
      walk(child as Container);
    }
  };
  walk(app.stage as unknown as Container);
  return found.sort((a, b) => a.x - b.x);
}

/**
 * The strip's **first** row, as drawn (#743).
 *
 * §2 names the readouts the strip carries and §13 gives it 52 px holding two
 * rows; the y that split happens at is `drawHud`'s own — the stockpile cluster
 * and the right-hand `map · T+ · n` at y = 10, the SIG band and `TRACKED` at
 * y = 30. §2's own diagram draws all of them on one line, `band` included, so
 * it is not the authority for the split.
 *
 * Which row a glyph is on is the whole subject of the two tests below, so it
 * is read off the glyph's own y rather than assumed — and the SIG instrument's
 * two lines, which sit lower still, fall out on the same test.
 */
function firstRowGlyphs(
  app: HeadlessApplication,
  scale: number
): Array<{ text: string; x: number; y: number; width: number; height: number }> {
  return stripGlyphs(app, scale).filter((glyph) => glyph.y < 14 * scale);
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
async function boot(
  options: {
    webgl?: boolean;
    controlsStudy?: boolean;
    gpu?: Partial<Pick<HeadlessGL, 'timer' | 'rendererName'>>;
  } = {}
): Promise<Booted> {
  const gl = new HeadlessWebGLRenderer();
  Object.assign(gl.context, options.gpu);
  const app = new HeadlessApplication();
  const connHost = createHost(1280, 720);
  const chartHost = createHost(1280, 720);
  const { callbacks, log } = recordingShell();

  const conn = new PerspectiveView();
  const mounted = conn.mount(
    connHost as unknown as HTMLElement,
    () => {
      if (options.webgl === false) throw new Error('headless: WebGL unavailable');
      return gl.asRenderer();
    },
    gl.environment
  );
  assert.equal(mounted, options.webgl !== false, 'mount reports whether it got a context');
  conn.setActive(true);

  const chart = new EchoRenderer(callbacks, app.asApplication(), options.controlsStudy ?? false);
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

/**
 * The probes every test below reads the HUD through, held to the one promise
 * that separates them (#826): a budget counts every label the client pays
 * for, and a contract quotes only the ones on the glass. Hand-built rather
 * than booted, so a failure here is the probe's and not the renderer's.
 */
describe('free-water camera integration', () => {
  it('never turns a stored Enter NAV binding into preview confirmation', async () => {
    const world = await boot({ controlsStudy: true });
    const nav = () =>
      (
        world.log.calls.filter((call) => call.name === 'onFlight').at(-1)?.args[0] as {
          navigating: boolean;
        }
      ).navigating;
    try {
      dispatchWindow('keydown', { code: 'Digit0' });
      world.chart.setBindings({ ...ONE_HANDED_BINDINGS, toggleNav: 'Enter' });
      world.chart.armDestination();
      world.chart.setDestinationPlan('x', 2000);
      world.chart.setDestinationPlan('y', 2000);
      world.chart.setDestinationDepth(900);
      world.chart.pinDestination(true);
      dispatchWindow('keydown', { code: 'Enter' });
      assert.equal(nav(), true);
      assert.equal(world.log.names().includes('onMoveOrder'), false);
      dispatchWindow('keydown', { code: 'Enter' });
      assert.equal(nav(), false);
      assert.equal(world.log.names().includes('onMoveOrder'), false);
      dispatchWindow('keydown', {
        code: 'Enter',
        target: { closest: (selector: string) => (selector.includes('input') ? {} : null) },
      });
      assert.equal(
        world.log.calls.filter((call) => call.name === 'onMoveOrder').length,
        1,
        'a focused depth field still owns explicit confirmation'
      );
    } finally {
      world.teardown();
    }
  });
  it('uses the north-up scope without moving the camera and keeps queueing separate from Shift-wheel', async () => {
    const world = await boot({ controlsStudy: true });
    const reading = () =>
      world.log.calls.filter((call) => call.name === 'onDestination').at(-1)
        ?.args[0] as MovePreviewReading | null;
    try {
      dispatchWindow('keydown', { code: 'Digit0' });
      world.frame();
      world.chart.armDestination();
      const before = world.conn.frame;
      const scope = (
        world.chart as unknown as {
          minimapRect(): { x: number; y: number; size: number };
        }
      ).minimapRect();
      const press = {
        button: 0,
        buttons: 1,
        pointerId: 1,
        clientX: scope.x + scope.size / 2,
        clientY: scope.y + scope.size / 2,
      };
      world.app.canvas.dispatch('pointerdown', press);
      world.app.canvas.dispatch('pointerup', { ...press, buttons: 0 });
      assert.ok(Math.abs(reading()!.point!.x - 2000) < 1e-6);
      assert.ok(Math.abs(reading()!.point!.y - 2000) < 1e-6);
      assert.equal(reading()!.pinned, true);
      const depth = reading()!.depthM;
      world.app.canvas.dispatch('wheel', { deltaY: 0, deltaX: -1, shiftKey: true });
      assert.equal(reading()!.depthM, depth - DEPTH.CONTROL_STEP_M);
      assert.equal(reading()!.queued, false);
      assert.deepEqual(world.conn.frame, before);
      const engage = barLabel(world.app, 'ENGAGE');
      world.app.canvas.dispatch('pointerdown', { ...press, clientX: engage.x, clientY: engage.y });
      assert.equal(reading(), null, 'a command-card mode replaces the preview too');
      assert.equal(world.log.names().includes('onMoveOrder'), false);
    } finally {
      world.teardown();
    }
  });

  it('pins an independent destination, keeps it through camera motion, and confirms one fixed move', async () => {
    const world = await boot({ controlsStudy: true });
    const reading = () =>
      world.log.calls.filter((call) => call.name === 'onDestination').at(-1)
        ?.args[0] as MovePreviewReading | null;
    try {
      dispatchWindow('keydown', { code: 'Digit0' });
      world.chart.armDestination();
      assert.ok(reading());
      world.chart.setDestinationPlan('x', 2000);
      world.chart.setDestinationPlan('y', 2000);
      world.chart.pinDestination(true);
      world.chart.setDestinationDepth(900);
      world.chart.queueDestination(true);
      const pinned = structuredClone(reading());
      world.chart.toggleNavigation();
      world.chart.stepFlight('rollLeft');
      world.chart.stepFlight('flyRight');
      world.chart.confirmDestination();
      assert.equal(world.log.names().includes('onMoveOrder'), false, 'NAV cannot confirm');
      dispatchWindow('keydown', { code: 'Escape' });
      assert.deepEqual(reading(), pinned, 'leaving NAV preserves preview and depth');
      world.app.canvas.dispatch('wheel', { deltaY: 1, shiftKey: true });
      assert.equal(reading()!.depthM, 1050);
      assert.equal(reading()!.queued, true);
      dispatchWindow('keydown', { code: 'Enter', target: { closest: () => null } });
      world.chart.confirmDestination();
      const commands = world.log.calls.filter((call) => call.name === 'onMoveOrder');
      assert.equal(commands.length, 1);
      assert.deepEqual(commands[0]!.args, [pinned!.unitIds, 2000, 2000, true, 1050, true]);
      assert.equal(reading(), null);
    } finally {
      world.teardown();
    }
  });

  it('uses canonical flight scale and carries snow with the eye, not the recovery focus', async () => {
    const world = await boot({ controlsStudy: true });
    try {
      world.conn.setReducedMotion(true);
      let first: typeof world.conn.eyePosition | undefined;
      for (const distance of [1000, 18000]) {
        world.chart.homeCamera();
        world.conn.focusWorld(2000, 2000, distance);
        world.conn.raiseFocusBy(world.conn.focusDepth() - 300);
        world.frame();
        world.chart.toggleFlight();
        world.frame();
        if (first === undefined) first = world.conn.eyePosition;
        else assert.deepEqual(world.conn.eyePosition, first);
        assert.equal(
          world.conn.hullDrawScale(),
          1,
          'saved survey dolly must not enlarge flight hulls'
        );
      }
      world.conn.flyLocal(600, 0, 0);
      world.frame();
      const { snow } = world.conn as unknown as { snow: import('../src/game/water.ts').MarineSnow };
      assert.ok(snow.points.material instanceof ShaderMaterial);
      const anchor = snow.points.material.uniforms.uFocus!.value;
      assert.equal(anchor.x, world.conn.eyePosition.x);
      assert.equal(anchor.y, world.conn.eyePosition.y);
    } finally {
      world.teardown();
    }
  });

  it('refuses invalid preview rays, solids and depths without issuing or clamping an order', async () => {
    const world = await boot({ controlsStudy: true });
    const reading = () =>
      world.log.calls.filter((call) => call.name === 'onDestination').at(-1)
        ?.args[0] as MovePreviewReading | null;
    try {
      dispatchWindow('keydown', { code: 'Digit0' });
      world.chart.armDestination();
      world.chart.setDestinationPlan('x', 2000);
      world.chart.setDestinationPlan('y', 2000);
      world.chart.pinDestination(true);
      world.chart.setDestinationDepth(3100);
      world.chart.confirmDestination();
      assert.equal(reading()!.depthM, 3100);
      assert.equal(reading()!.reason, 'DEPTH OUTSIDE WATER INTERVAL');
      const terrain = cannedTerrain();
      terrain.ceiling.fill(500);
      terrain.floor.fill(500);
      world.chart.setTerrain(terrain);
      world.chart.setDestinationDepth(500);
      world.chart.confirmDestination();
      assert.equal(reading()!.reason, 'NO WATER COLUMN');
      world.chart.setTerrain(cannedTerrain());
      world.chart.pinDestination(false);
      world.conn.setReducedMotion(true);
      world.conn.focusWorld(2000, 2000, 1000);
      world.conn.raiseFocusBy(world.conn.focusDepth() - 300);
      world.chart.toggleFlight();
      world.conn.turnFlight(0, Math.PI, 0);
      world.app.canvas.dispatch('pointermove', { clientX: 640, clientY: 360, buttons: 0 });
      assert.equal(reading()!.reason, 'NO WATER TARGET');
      world.chart.confirmDestination();
      assert.equal(world.log.names().includes('onMoveOrder'), false);
      dispatchWindow('keydown', { code: 'Escape', target: { closest: () => ({}) } });
      assert.equal(reading(), null, 'Escape owns preview even from an input');
      assert.equal(world.log.names().includes('onOpenMenu'), false);
    } finally {
      world.teardown();
    }
  });

  it('keeps MENU clickable in NAV and releases held camera movement immediately', async () => {
    const world = await boot({ controlsStudy: true });
    let now = 1000;
    const clock = mock.method(performance, 'now', () => now);
    try {
      world.conn.setReducedMotion(true);
      world.conn.focusWorld(2000, 2000, 1000);
      world.conn.raiseFocusBy(world.conn.focusDepth() - 300);
      world.frame();
      world.chart.toggleNavigation();
      dispatchWindow('keydown', { code: 'KeyA' });
      now += 100;
      world.frame();
      const { barButtons } = world.chart as unknown as {
        barButtons: { label: string; x: number; y: number; w: number; h: number }[];
      };
      const menu = barButtons.find((button) => button.label === 'MENU');
      assert.ok(menu);
      world.app.canvas.dispatch('pointerdown', {
        button: 0,
        clientX: menu.x + menu.w / 2,
        clientY: menu.y + menu.h / 2,
        pointerId: 1,
      });
      assert.ok(world.log.names().includes('onOpenMenu'));
      const eye = world.conn.eyePosition;
      now += 100;
      world.frame();
      assert.deepEqual(world.conn.eyePosition, eye);
    } finally {
      clock.mock.restore();
      world.teardown();
    }
  });

  it('flies all local axes, crosses poles, rolls, picks through the shared camera and recovers Home', async () => {
    const world = await boot({ controlsStudy: true });
    try {
      world.conn.setReducedMotion(true);
      world.conn.focusWorld(2000, 2000, 1000);
      world.conn.raiseFocusBy(world.conn.focusDepth() - 300);
      const saved = world.conn.frame;
      world.chart.toggleFlight();
      assert.equal(world.conn.flying, true);
      const camera = (world.conn as unknown as { camera: import('three').PerspectiveCamera })
        .camera;
      const initialQ = camera.quaternion.clone();
      for (const [x, y, z] of [
        [10, 0, 0],
        [0, 10, 0],
        [0, 0, 10],
      ]) {
        const before = camera.position.clone();
        const expected = new (await import('three')).Vector3(x, y, -z).applyQuaternion(
          camera.quaternion
        );
        world.conn.flyLocal(x!, y!, z!);
        assert.ok(camera.position.clone().sub(before).distanceTo(expected) < 1e-6);
      }
      world.conn.turnFlight(0, 0, Math.PI);
      assert.equal(world.conn.flightReading().inverted, true);
      const eye = world.conn.eyePosition;
      const target = camera.position
        .clone()
        .add(new (await import('three')).Vector3(0, 0, -100).applyQuaternion(camera.quaternion));
      const p = world.conn.projectPoint(target.x, target.z, -target.y / 0.22);
      assert.ok(p.visible && Math.abs(p.x - 640) < 1e-5 && Math.abs(p.y - 360) < 1e-5);
      const picked = world.conn.pickPlane(p.x, p.y, -target.y / 0.22);
      assert.ok(picked !== null && Math.hypot(picked.x - target.x, picked.y - target.z) < 1e-5);
      const behind = camera.position.clone().sub(target.clone().sub(camera.position));
      assert.equal(world.conn.projectPoint(behind.x, behind.z, -behind.y / 0.22).visible, false);
      // Move from the initial downward gaze through both vertical poles.
      for (let i = 0; i < 360; i++) {
        world.conn.turnFlight(0, Math.PI / 180, 0);
        assert.ok(camera.quaternion.toArray().every(Number.isFinite));
        assert.deepEqual(world.conn.eyePosition, eye, 'rotation does not translate');
        for (const corner of world.conn.groundQuad()) {
          assert.ok(Number.isFinite(corner.x) && Number.isFinite(corner.y));
          assert.ok(corner.x >= -1e-6 && corner.x <= 4000 + 1e-6);
        }
      }
      world.conn.turnFlight(0, 0, Math.PI);
      assert.ok(camera.quaternion.angleTo(initialQ) < 1e-6, 'full roll restores orientation');
      world.conn.turnFlight(0, (55 * Math.PI) / 180 + Math.PI / 2, 0);
      assert.equal(
        world.conn.flightReading().bearingDeg,
        null,
        'vertical is not a fabricated north'
      );
      assert.deepEqual(world.conn.groundQuad(), [], 'upward gaze has no ground footprint');
      assert.equal(world.conn.pickPlane(640, 360, 2500), null, 'behind-plane pick refused');
      world.chart.homeCamera();
      assert.equal(world.conn.flying, false);
      assert.equal(world.conn.frame.yawDeg, 0);
      assert.equal(world.conn.frame.pitchDeg, HOME_PITCH_DEG);
      assert.equal(world.conn.frame.distanceM, saved.distanceM);
      assert.equal(world.conn.frame.xM, saved.xM);
    } finally {
      world.teardown();
    }
  });

  it('owns NAV keys and gestures, clears holds on blur/menu, and preserves fleet shortcuts outside NAV', async () => {
    const world = await boot({ controlsStudy: true });
    let now = 1000;
    const clock = mock.method(performance, 'now', () => now);
    try {
      world.conn.setReducedMotion(true);
      world.conn.focusWorld(2000, 2000, 1000);
      world.conn.raiseFocusBy(world.conn.focusDepth() - 300);
      dispatchWindow('keydown', { code: 'Digit0' });
      world.frame();
      world.log.calls.length = 0;
      dispatchWindow('keydown', { code: 'F9' });
      dispatchWindow('keydown', { code: 'KeyW' });
      const before = world.conn.eyePosition;
      now += 100;
      world.frame();
      assert.notDeepEqual(world.conn.eyePosition, before);
      world.app.canvas.dispatch('pointerdown', {
        button: 2,
        buttons: 2,
        clientX: 640,
        clientY: 360,
        pointerId: 1,
      });
      dispatchWindow('keydown', { code: 'Escape' });
      world.app.canvas.dispatch('pointerup', {
        button: 2,
        buttons: 0,
        clientX: 640,
        clientY: 360,
        pointerId: 1,
      });
      assert.ok(!world.log.names().some((name) => /Order$|onDepthOffset|onOpenMenu/.test(name)));
      const left = world.conn.eyePosition;
      now += 100;
      world.frame();
      assert.deepEqual(world.conn.eyePosition, left, 'release does not resume a held key');
      dispatchWindow('keydown', { code: 'KeyS' });
      assert.ok(world.log.names().includes('onDepthOffset'), 'S is fleet Rise outside NAV');
      dispatchWindow('keydown', { code: 'F9' });
      dispatchWindow('keydown', { code: 'KeyA' });
      dispatchWindow('blur', {});
      const blurred = world.conn.eyePosition;
      now += 100;
      world.frame();
      assert.deepEqual(world.conn.eyePosition, blurred);
      dispatchWindow('keydown', { code: 'KeyA' });
      world.chart.setMenuOpen(true);
      world.chart.setMenuOpen(false);
      now += 100;
      world.frame();
      assert.deepEqual(world.conn.eyePosition, blurred, 'menu never resumes motion');
      world.chart.toggleNavigation();
      const focusedButton = { closest: () => ({}) };
      dispatchWindow('keydown', { code: 'Escape', target: focusedButton });
      dispatchWindow('keydown', { code: 'Home', target: focusedButton });
      assert.equal(world.conn.flying, false);
    } finally {
      clock.mock.restore();
      world.teardown();
    }
  });

  it('selects and queues orders through a rolled view, refusing a sky pick', async () => {
    const world = await boot({ controlsStudy: true });
    try {
      const hull = cannedSnapshot().units[0]!;
      world.conn.setReducedMotion(true);
      world.conn.focusWorld(hull.x, hull.y, 100);
      world.conn.raiseFocusBy(world.conn.focusDepth() - hull.depth);
      world.chart.toggleFlight();
      world.conn.turnFlight(0, 0, Math.PI);
      world.frame();
      const at = world.conn.projectPoint(hull.x, hull.y, hull.depth);
      assert.ok(at.visible);
      const click = (button: number, x: number, y: number, shiftKey = false) => {
        for (const type of ['pointerdown', 'pointerup']) {
          world.app.canvas.dispatch(type, {
            button,
            clientX: x,
            clientY: y,
            shiftKey,
            pointerId: 1,
            pointerType: 'mouse',
          });
        }
      };
      click(0, at.x, at.y);
      click(2, at.x + 120, at.y + 40, true);
      const order = world.log.first('onMoveOrder');
      assert.ok(order, `rolled order missing: ${world.log.names()}`);
      assert.deepEqual(order[0], [hull.id]);
      assert.equal(order[3], true, 'queue survives the rolled projection');
      world.log.calls.length = 0;
      world.conn.turnFlight(0, -Math.PI, 0);
      click(2, 640, 360);
      world.frame();
      assert.equal(world.log.first('onMoveOrder'), undefined);
      assert.ok(textContents(world.app.stage).some((text) => text.includes('NO WATER TARGET')));
    } finally {
      world.teardown();
    }
  });
});

describe('renderer smoke test: the scene-graph probes', () => {
  it('quotes the labels that are drawn, and counts the ones that are not', () => {
    const stage = new Container();
    const drawn = new Text({ text: 'DRAWN' });
    // A pooled label the strip has retired: `drawCommandBar` leaves the last
    // string on it, which is what made it answer for a live one.
    const retired = new Text({ text: 'RETIRED' });
    retired.visible = false;
    // And a label that is visible itself, inside a panel that is not. Pixi's
    // render pass stops at the panel, so the walk has to as well.
    const closedPanel = new Container();
    closedPanel.visible = false;
    closedPanel.addChild(new Text({ text: 'INSIDE A CLOSED PANEL' }));
    stage.addChild(drawn, retired, closedPanel);

    assert.deepEqual(textContents(stage), ['DRAWN']);
    assert.equal(textSaying(stage, 'RETIRED'), null, 'a retired label answered for a live one');
    assert.equal(
      textSaying(stage, 'INSIDE A CLOSED PANEL'),
      null,
      'a label in a closed panel answered — the walk did not stop at the panel'
    );

    // The counters deliberately disagree with the quote above. A retired
    // label still holds its texture whether or not the strip draws it, so a
    // budget that stopped counting it would be understating what is spent.
    assert.equal(textCount(stage), 3, 'the label budget stopped counting what it still pays for');
    assert.equal(treeSize(stage), 5, 'the tree probe stopped seeing a node that is still there');
  });

  it('bills a repaint only while the label is on the glass, and once when it returns', () => {
    // The clock was the live instance of this (#846): `EchoRenderer.drawHud`
    // stamped `clockLabel.text` every frame and then hid the clock when the
    // top strip was too narrow for it. Since #857 a dropped clock keeps its
    // last stamp unless the stamp changes length, but the property is Pixi's
    // and holds for any label.
    // Hand-built rather than booted so the sequence is the one under test
    // rather than whatever width the canned host happens to be.
    const stage = new Container();
    const onGlass = new Text({ text: 'T+00:00' });
    const clock = new Text({ text: 'T+00:00' });
    stage.addChild(onGlass, clock);

    let carried = textStyleKeys(stage);
    const frame = (): number => {
      const sample = textStyleKeys(stage);
      const rasters = textRasterisations(carried, sample);
      carried = carryRasterised(carried, sample);
      return rasters;
    };

    // The control, so a probe that counts nothing at all cannot pass this.
    onGlass.text = 'T+00:01';
    assert.equal(frame(), 1, 'a drawn label that changed was not counted');

    // Under the width threshold, still stamping. Pixi regenerates no glyph
    // canvas for any of these: `collectRenderables` returns on
    // `globalDisplayStatus < 7` (`collectRenderablesMixin.mjs:4`), so
    // `CanvasTextPipe.addRenderable` never runs for the node and the texture
    // is never rebuilt.
    clock.visible = false;
    for (let second = 1; second <= 10; second++) {
      clock.text = `T+00:${String(second).padStart(2, '0')}`;
      assert.equal(frame(), 0, 'a hidden label billed for a canvas Pixi never regenerated');
    }

    // And back. One repaint for all ten changes, at the frame it reappears:
    // showing the label sets `structureDidChange`, so that frame rebuilds and
    // does reach `addRenderable`, which compares against
    // `batchableText.currentKey` — not against the last value the label held
    // while nobody was looking at it.
    clock.visible = true;
    assert.equal(frame(), 1, 'the label returned repainted and nothing counted it');
    assert.equal(frame(), 0, 'and it was billed again while nothing had changed');

    // A label that returns saying exactly what it last said is free, because
    // the key Pixi holds for it still matches.
    clock.visible = false;
    clock.text = 'T+00:99';
    assert.equal(frame(), 0, 'hidden churn was billed');
    clock.text = 'T+00:10';
    clock.visible = true;
    assert.equal(frame(), 0, 'a label that came back unchanged was billed for a repaint');
  });
});

describe('renderer smoke test: the chart', () => {
  it('boots against a canned match and builds the layers it promises', async () => {
    const world = await boot();
    try {
      // The scene graph the class doc-comment describes: overlay, then HUD.
      assert.equal(world.app.stage.children.length, 2, 'stage is overlay + hud, in that order');
      const [overlay, hud] = world.app.stage.children;
      assert.equal(overlay!.children.length, 9, 'the nine overlay layers are wired');
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

  it('re-rasterises a HUD label when its value moves, and never once a frame', async () => {
    const world = await boot();
    try {
      // Warm up: the first frames legitimately build every label.
      world.frame(5);

      // A match that is not moving. `drawHud` runs on the frame cadence by
      // design (#432 — contact freshness and the scope sweep have to keep
      // moving) and re-assigns almost every label unchanged as it goes. That
      // costs nothing, because pixi.js 8.19 guards both setters: `set text`
      // returns on an equal string (`AbstractText`), `set fill` on an equal
      // value (`TextStyle`).
      //
      // Frame by frame with the same fold as the moving loop below, rather
      // than one sample either end of the window. A label that hides and
      // returns inside the window has no entry in a drawn-only `before`, so a
      // two-sample compare would read the repaint as a first build and this
      // assertion — which asserts zero — could only be loosened by it.
      let keys = textStyleKeys(world.app.stage);
      let still = 0;
      for (let frame = 0; frame < 60; frame++) {
        world.frame();
        const next = textStyleKeys(world.app.stage);
        still += textRasterisations(keys, next);
        keys = carryRasterised(keys, next);
      }
      assert.equal(still, 0, 'a second of frames over a still match rasterised no text at all');

      // And a match that is moving: sixty frames a second with a fresh Echo
      // pass every twelfth, which is the 5 Hz the room resolves at, and the
      // two readouts that move on every pass actually moving.
      // Drawn labels, not every label the tree holds. The premise below is
      // what a HUD *pays*, and Pixi pays nothing for a hidden one (#846) — so
      // a whole-tree `textCount` here would divide a drawn numerator by a
      // retired-inclusive denominator and loosen the budget by the difference.
      const labels = textContents(world.app.stage).length;
      let rasters = 0;
      // `keys` carries over from the still window rather than being re-sampled.
      // A fresh sample is drawn-only, so a label that hid during that window
      // would lose the key it was last painted with, and its repaint here
      // would read as a first build and go uncounted — the same blind spot the
      // fold above exists to close, one seam along.
      for (let frame = 0; frame < 600; frame++) {
        if (frame % 12 === 0) {
          const snapshot = cannedSnapshot(600 + frame);
          snapshot.peakSig = 30 + (frame % 60);
          snapshot.nodules = 120 + frame;
          world.chart.applySnapshot(snapshot);
          world.conn.applySnapshot(snapshot);
        }
        world.frame();
        const next = textStyleKeys(world.app.stage);
        rasters += textRasterisations(keys, next);
        // Carried, not replaced: a label that hides keeps the key it was last
        // painted with, so the repaint when it comes back is still counted.
        keys = carryRasterised(keys, next);
      }

      // Each of those is one glyph canvas re-rendered and one texture
      // uploaded — `styleKey` carries the string, so `CanvasTextPipe`
      // regenerates on any change — and it is the cost
      // `.claude/skills/pixijs-performance` argues `BitmapText` exists to
      // avoid. The budget is that argument's own premise: a HUD updating its
      // labels per frame would pay `labels x frames`. This one pays under a
      // fiftieth of it, because it pays per *change* instead, which is what
      // the same skill asks of canvas `Text` where `BitmapText` is not used.
      //
      // The number is a budget rather than a fact about today's draw loop: it
      // is here to fail if a label is ever stamped with the clock, a counter
      // or anything else that genuinely differs every frame, because that is
      // the point at which the `BitmapText` argument would start to apply to
      // this HUD. See `.claude/VENDORED-SKILLS.md`.
      const perFrame = labels * 600;
      assert.ok(
        rasters < perFrame / 50,
        `expected far under the per-frame cost of ${perFrame}, saw ${rasters}`
      );
      assert.ok(rasters > 0, 'and the probe can still see a rasterisation when one happens');
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

  it('keeps the sweep and the range rings inside the scope, all the way round (#1086)', async () => {
    const world = await boot();
    const chart = world.chart as unknown as {
      minimapOverlayG: Graphics;
      minimapRect(): { size: number };
    };
    let nowMs = 0;
    const clock = mock.method(performance, 'now', () => nowMs);
    try {
      // The canned Bastion stands 600 m into a 4 km map, so the 2,400 m ring
      // reaches 1,800 m past two of the scope's edges, and a sweep as long as
      // the scope is wide leaves it for most of a turn. Every canned return and
      // hull sits well inside the frame, so anything the scope holds past it
      // is one of those two.
      for (const reduced of [false, true]) {
        world.chart.setReducedMotion(reduced);
        // Sixteen bearings, a quarter-second apart: one 4 s revolution.
        for (let step = 0; step < 16; step++) {
          nowMs = 100_000 + step * 250;
          world.frame(1);
          const { size } = chart.minimapRect();
          // The geometry handed to Pixi, not its stroke-padded bounds: a miter
          // on the camera box's corner pads further than any ink reaches.
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (const instruction of chart.minimapOverlayG.context.instructions) {
            if (instruction.action !== 'fill' && instruction.action !== 'stroke') continue;
            const extent = (instruction.data as { path: GraphicsPath }).path.bounds;
            minX = Math.min(minX, extent.minX);
            minY = Math.min(minY, extent.minY);
            maxX = Math.max(maxX, extent.maxX);
            maxY = Math.max(maxY, extent.maxY);
          }
          const where = `${reduced ? 'reduced motion' : `sweep at ${step * 22.5}°`}: ink spans `;
          const span = `x ${minX.toFixed(1)}–${maxX.toFixed(1)}, y ${minY.toFixed(1)}–${maxY.toFixed(1)}`;
          assert.ok(
            minX >= -1e-6 && minY >= -1e-6 && maxX <= size + 1e-6 && maxY <= size + 1e-6,
            `${where}${span} on a ${size} px scope`
          );
        }
      }
    } finally {
      clock.mock.restore();
      world.teardown();
    }
  });

  it('labels both range rings inside the scope, and inks the far one threat-red (#1096)', async () => {
    const world = await boot();
    const chart = world.chart as unknown as {
      minimapOverlayG: Graphics;
      scopeRingLabels: Text[];
      minimapRect(): { x: number; y: number; size: number };
    };
    try {
      world.frame(1);
      // The canned Bastion stands 600 m from two edges, which cuts the top of
      // both rings: both labels are ones that have to come in through the frame.
      const { x, y, size } = chart.minimapRect();
      assert.deepEqual(
        chart.scopeRingLabels.map((label) => label.text),
        ['900m', '2400m']
      );
      for (const label of chart.scopeRingLabels) {
        assert.ok(label.visible, `${label.text} is drawn`);
        const inside =
          label.x >= x &&
          label.y >= y &&
          label.x + label.width <= x + size + 1e-6 &&
          label.y + label.height <= y + size + 1e-6;
        assert.ok(inside, `${label.text} at (${label.x}, ${label.y}) on the scope at (${x}, ${y})`);
      }
      const strokes = chart.minimapOverlayG.context.instructions
        .filter((instruction) => instruction.action === 'stroke')
        .map(
          (instruction) => (instruction.data as { style: { color: number; alpha: number } }).style
        );
      const ink = (color: number, alpha: number): boolean =>
        strokes.some((style) => style.color === color && Math.abs(style.alpha - alpha) < 1e-9);
      assert.ok(ink(UI.accent, RING_NEAR_ALPHA), 'the 900 m ring is the interface cyan');
      assert.ok(ink(UI.threat, RING_FAR_ALPHA), 'the 2,400 m ring is threat-red');
    } finally {
      world.teardown();
    }
  });
});

/**
 * Cut the canned force down to one hull in the north-west corner.
 *
 * The canned fleet is six listeners spread over a 4 km map and genuinely
 * *holds* all of it — which is the veil working, and useless to assert on.
 * A lone Corvette at a baseline rating leaves the far corner well outside
 * anything it could hear, so the gradient is there to read.
 */
function loneListener(world: Booted): void {
  const snapshot = cannedSnapshot(360);
  world.conn.applySnapshot({
    ...snapshot,
    units: snapshot.units.slice(0, 1),
    structures: [],
  });
  // Draw once on the reduced force, so a later ledger reading is about the
  // veil rather than about the five entities this just took out of the scene.
  world.frame(1);
}

/**
 * The one mesh in the conn scene carrying the survey's floor attribute: the
 * terrain. Found rather than reached for, because the view owns its own scene
 * graph and a test that indexed into `children` would break on any reorder.
 * By `surveyFloor` and not by its veil attribute, since the roofs over a
 * passage carry the veil too (#1105).
 */
function terrainMesh(scene: Scene | null): Mesh {
  assert.ok(scene !== null, 'the conn rendered at least once');
  let found: Mesh | null = null;
  scene.traverse((object) => {
    if (found !== null || !(object instanceof Mesh)) return;
    if (object.geometry.getAttribute('surveyFloor') !== undefined) found = object;
  });
  assert.ok(found !== null, 'the ground is in the scene');
  return found;
}

/**
 * The veil's brightness at a world point: the mean channel of the vertex
 * nearest it, which is what a reviewer would read off the picture.
 */
function shadeAt(mesh: Mesh, shades: BufferAttribute, xM: number, zM: number): number {
  const positions = mesh.geometry.getAttribute('position') as BufferAttribute;
  let best = Infinity;
  let index = 0;
  for (let i = 0; i < positions.count; i++) {
    const dx = positions.getX(i) - xM;
    const dz = positions.getZ(i) - zM;
    const distance = dx * dx + dz * dz;
    if (distance < best) {
      best = distance;
      index = i;
    }
  }
  return (shades.getX(index) + shades.getY(index) + shades.getZ(index)) / 3;
}

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

  it('reports the force it was given, and of the enemy only its live tracks', async () => {
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
      // Seven contacts are in the snapshot and one of them is in this scene:
      // the live Tier-4 Corvette track, as its model (#1531). The Tier-4
      // torpedo is ordnance, not a hull or a structure, and nothing below
      // Track is handed over — the classified Sentinel Turret included —
      // which is what keeps the world canvas from being a maphack.
      assert.equal(report.tracks, 1, 'the one live track, and no other contact');
      assert.equal(
        Object.keys(report).some((key) => key.includes('contact')),
        false,
        'the conn view holds nothing else about contacts'
      );
    } finally {
      world.teardown();
    }
  });

  it('sails a hull track as a model only while it is a live Track (#1531)', async () => {
    const world = await boot();
    let nowMs = 100_000;
    const clock = mock.method(performance, 'now', () => nowMs);
    try {
      const probe = () =>
        (
          globalThis as unknown as { window: { __perspectiveProbe: () => { tracks: number } } }
        ).window.__perspectiveProbe();
      const snapshot = cannedSnapshot(2000);
      world.chart.applySnapshot(snapshot);
      world.frame(1);
      assert.equal(probe().tracks, 1, 'a live Tier-4 hull track sails as its model');

      // No new return: past the live window the track is a ghost, a
      // last-known position, and a model sitting on one would claim a
      // present tense the Echo Layer never granted.
      nowMs += LIVE_TRACK_MS + 1;
      world.frame(1);
      assert.equal(probe().tracks, 0, 'a ghosted track leaves the conn view');

      // Resolved again, but only to Classification: no heading, no model.
      nowMs += 1;
      world.chart.applySnapshot({
        ...cannedSnapshot(2001),
        contacts: snapshot.contacts.map((c) =>
          c.tier === ResolutionTier.Track && c.kind !== undefined
            ? { ...c, tier: ResolutionTier.Classification, hp: undefined, heading: undefined }
            : c
        ),
      });
      world.frame(1);
      assert.equal(probe().tracks, 0, 'a classified hull is never a model');
    } finally {
      clock.mock.restore();
      world.teardown();
    }
  });

  it('stands a structure track as a model only while it is a live Track (#1539)', async () => {
    const world = await boot();
    let nowMs = 100_000;
    const clock = mock.method(performance, 'now', () => nowMs);
    try {
      const probe = () =>
        (
          globalThis as unknown as { window: { __perspectiveProbe: () => { tracks: number } } }
        ).window.__perspectiveProbe();
      // The canned Sentinel Turret, resolved to Track rather than classified.
      const tracked = (tick: number) => {
        const snapshot = cannedSnapshot(tick);
        return {
          ...snapshot,
          contacts: snapshot.contacts.map((c) =>
            c.structure !== undefined ? { ...c, tier: ResolutionTier.Track } : c
          ),
        };
      };
      world.chart.applySnapshot(tracked(3000));
      world.frame(1);
      assert.equal(probe().tracks, 2, 'the Corvette and the turret, each as its model');

      nowMs += LIVE_TRACK_MS + 1;
      world.frame(1);
      assert.equal(probe().tracks, 0, 'a ghosted structure track leaves the conn view');
    } finally {
      clock.mock.restore();
      world.teardown();
    }
  });

  it('lets the ground go cold where nothing of the fleet is listening (#472)', async () => {
    const world = await boot();
    try {
      world.frame(3);
      loneListener(world);

      const ground = terrainMesh(world.gl.lastScene);
      const shades = ground.geometry.getAttribute(VEIL_SHADE_ATTRIBUTE) as BufferAttribute;
      assert.equal(
        shades.count,
        (ground.geometry.getAttribute('position') as BufferAttribute).count,
        'the veil rides the ground it is drawn on, one shade per vertex'
      );

      // §4.5's claim is that the water reads as held where an ear reaches and
      // cold where none does — so the corner the one hull has nothing in must
      // be darker than the water it is standing in, and neither may be black.
      const held = shadeAt(ground, shades, 800, 900);
      const cold = shadeAt(ground, shades, COLS * CELL_M - 200, COLS * CELL_M - 200);
      assert.ok(held > cold, `held water ${held} is brighter than cold water ${cold}`);
      assert.ok(cold > 0, 'the chart is drained, never unexplored black (§5)');

      // In display terms (#1536): every vertex is `veilShade` at some amount,
      // the floor's own proportions between the channels and never past it.
      // A linear shade breaks both, its red near 0.07 at the floor.
      let deepest = 0;
      for (let i = 0; i < shades.count; i++) {
        const k = (1 - shades.getX(i)) / (1 - VEIL_FLOOR_RGB.r);
        assert.ok(Math.abs((1 - shades.getY(i)) / (1 - VEIL_FLOOR_RGB.g) - k) < 1e-6);
        assert.ok(Math.abs((1 - shades.getZ(i)) / (1 - VEIL_FLOOR_RGB.b) - k) < 1e-6);
        assert.ok(k <= 1 + 1e-6, `vertex ${i} drains past the floor`);
        deepest = Math.max(deepest, k);
      }
      assert.ok(deepest > 0.25, `the cold corner is in the veil (${deepest})`);
      assert.ok(readsDisplayVeil(ground.material as MeshBasicMaterial));

      // The embers take a plain drain, the ground's mean in all three
      // channels, drained in display terms too: never below the floor's mean.
      let embers: Points | null = null;
      world.gl.lastScene?.traverse((object) => {
        if (object instanceof Points && object.geometry.getAttribute(VEIL_SHADE_ATTRIBUTE)) {
          if (object.geometry.getAttribute('aPlume') === undefined) embers = object;
        }
      });
      assert.ok(embers !== null, 'the embers carry the veil');
      const lit = embers as Points;
      assert.ok(readsDisplayVeil(lit.material as MeshBasicMaterial));
      const emberVeil = lit.geometry.getAttribute(VEIL_SHADE_ATTRIBUTE) as BufferAttribute;
      const floorMean = (VEIL_FLOOR_RGB.r + VEIL_FLOOR_RGB.g + VEIL_FLOOR_RGB.b) / 3;
      for (let i = 0; i < emberVeil.count; i++) {
        assert.equal(emberVeil.getX(i), emberVeil.getZ(i), 'a drain, not a tint');
        assert.ok(emberVeil.getX(i) >= floorMean - 1e-6 && emberVeil.getX(i) <= 1);
      }

      // Gate 6: a vertex attribute on a mesh that was already there. The veil
      // spends no draw call and no triangle, which is why it can be a
      // full-map effect at all.
      const calls = world.gl.ledger.calls;
      const triangles = world.gl.ledger.triangles;
      world.conn.setVeilIntensity(0);
      world.frame(2);
      assert.equal(world.gl.ledger.calls, calls, 'the veil costs the frame no draw call');
      assert.equal(world.gl.ledger.triangles, triangles, 'and no triangle');

      // And off is off: a player who turned it down gets the chart back
      // whole, because it never held anything back from them.
      assert.equal(shadeAt(ground, shades, COLS * CELL_M - 200, COLS * CELL_M - 200), 1);
      assert.equal(shadeAt(ground, shades, 800, 900), 1);
    } finally {
      world.teardown();
    }
  });

  it("turns a passage's roof to glass over an own hull, and only then (#1105)", async () => {
    const world = await boot();
    try {
      world.frame(2);
      // The canned passage: rows 5–6, columns 12–13, ceiling 1,600 m.
      const roofs = (): Mesh[] => {
        const found: Mesh[] = [];
        world.gl.lastScene?.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          const geometry = object.geometry;
          if (geometry.getAttribute('color') === undefined) return;
          if (geometry.getAttribute('surveyFloor') !== undefined) return;
          found.push(object);
        });
        return found;
      };
      const material = () => roofs()[0]!.material as MeshBasicMaterial;
      const opacity = () => material().opacity;
      assert.equal(roofs().length, 1, 'one passage, one roof');
      // Stone as its vertex colour, the veil beside it in display terms (#1536).
      assert.ok(roofs()[0]!.geometry.getAttribute(VEIL_SHADE_ATTRIBUTE) !== undefined);
      assert.ok(readsDisplayVeil(material()), 'the roof takes the veil after the output transform');
      assert.equal(opacity(), 1, 'closed while no own hull is under it');

      // The same passage is on the scope, as a route stroked in rung 5's ink.
      const scope = (world.chart as unknown as { minimapTerrainG: Graphics }).minimapTerrainG;
      const routed = scope.context.instructions.some((instruction) => {
        if (instruction.action !== 'stroke') return false;
        const style = (instruction.data as { style: { color: number; alpha: number } }).style;
        return style.color === UI.accent && style.alpha === FURNITURE_OUTLINE_ALPHA.tunnelRoute;
      });
      assert.ok(routed, 'the scope strokes the passage route');

      const snapshot = cannedSnapshot(400);
      const [lead, ...rest] = snapshot.units;
      const at = (x: number, y: number, depth: number) => {
        world.conn.applySnapshot({ ...snapshot, units: [{ ...lead!, x, y, depth }, ...rest] });
        world.frame(1);
      };
      at(3250, 1500, 2000);
      assert.equal(opacity(), ROOF_OPEN_OPACITY, 'glass with a hull inside');
      assert.equal(material().depthWrite, false, 'and glass writes no depth');
      at(2250, 1500, 2000);
      assert.equal(opacity(), 1, 'stone again once it leaves');
      assert.equal(material().depthWrite, true, 'and stone writes it again');
    } finally {
      world.teardown();
    }
  });

  it('never dims a thing the player earned (#472)', async () => {
    const world = await boot();
    try {
      world.frame(3);
      loneListener(world);

      // The own force is drawn at full fidelity whatever the water around it
      // is doing (docs/graphics-standards.md gate 5): the veil is a statement
      // about listening, and a hull of the player's own is not in question.
      const scene = world.gl.lastScene;
      assert.ok(scene !== null, 'the conn rendered at least once');
      const opaque: number[] = [];
      scene.traverse((object) => {
        const material = (object as { material?: { opacity?: number; vertexColors?: boolean } })
          .material;
        if (material?.opacity === undefined) return;
        if (object === terrainMesh(scene)) return;
        opaque.push(material.opacity);
      });
      assert.ok(opaque.length > 0, 'the fleet and the dressing are in the scene');

      // The chart painter is the one that draws every mark the player earned,
      // and it has no idea the veil exists. Wiring it in later would be the
      // regression this holds against: a contact resolved by the server is
      // drawn at full strength through any amount of veil.
      const before = drawInstructions(world.app.stage);
      world.conn.setVeilIntensity(0);
      world.frame(2);
      assert.equal(
        drawInstructions(world.app.stage),
        before,
        'no mark, ring or reading changes with the veil'
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
      // Both counts are exact. An interval is dropped only when the page went
      // hidden across it, never for its size, so a slow runner cannot lose one.
      assert.equal(held.overlayFrames, 5, 'every overlay tick reported into the conn probe');
      assert.equal(held.stationFrames, 5, 'and the station counted every one of its own frames');
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

  it('counts a frame whole, every pass summed, and only that frame (gate 6, #1001)', async () => {
    const world = await boot();
    try {
      const probe = (
        globalThis as unknown as { window: { __perspectiveProbe: () => Record<string, unknown> } }
      ).window.__perspectiveProbe;
      const split = (
        globalThis as unknown as { window: { __perspectiveSplit: (on: boolean) => string } }
      ).window.__perspectiveSplit;
      // With the chromatic split off, the frame is the canvas pass alone.
      assert.equal(split(false), 'off');
      world.frame(3);
      const one = probe();
      assert.deepEqual(one.passes, ['canvas']);
      assert.equal(
        one.drawCalls,
        world.gl.ledger.calls,
        "a one-pass frame reads that pass's calls"
      );
      assert.equal(one.triangles, world.gl.ledger.triangles);
      world.frame(5);
      // The view resets once a frame, so frames never pile up into the reading.
      assert.equal(probe().drawCalls, one.drawCalls, 'five more frames read one frame');
      // On, the split is a second render inside the frame: one full-screen
      // triangle after the canvas pass, by the same renderer.
      assert.equal(split(true), 'on');
      world.frame(2);
      const two = probe();
      assert.deepEqual(two.passes, ['canvas', 'split-copy', 'split']);
      assert.equal(two.drawCalls, (one.drawCalls as number) + 1, 'both passes are counted');
      assert.equal(two.triangles, (one.triangles as number) + 1);
      world.frame(5);
      assert.equal(probe().drawCalls, two.drawCalls, 'and five more frames still read one');
    } finally {
      world.teardown();
    }
  });

  it('turns the lamp halo on and off, says why when the view cannot draw it, and checks again after a context restore (#1001)', async () => {
    type Probes = {
      __perspectiveProbe: () => Record<string, unknown>;
      __perspectiveHalo?: (on: boolean) => string;
    };
    const world = await boot();
    try {
      const probes = (globalThis as unknown as { window: Probes }).window;
      assert.ok(probes.__perspectiveHalo, 'outside a production build the switch is there');
      world.frame(2);
      const off = probes.__perspectiveProbe();
      assert.equal(off.halo, 'off');
      assert.equal(off.haloBytes, 0, 'off holds nothing');
      assert.equal(off.canvasStencilBits, 8, 'the canvas carries its stencil either way');
      assert.equal(probes.__perspectiveHalo!(true), 'idle');
      world.frame(2);
      const on = probes.__perspectiveProbe();
      // The canned match draws sprites, not models, so no lamp feeds a splat:
      // the halo holds its targets and runs no pass.
      assert.equal(on.halo, 'idle');
      assert.deepEqual(on.passes, ['canvas', 'split-copy', 'split'], 'the split alone follows');
      assert.equal(on.haloCalls, 0);
      assert.equal(on.drawCalls, off.drawCalls, 'an idle halo adds no call');
      // 17.25 bytes a drawing-buffer pixel and the instance buffer (gate 6).
      const w = 1280;
      const h = 720;
      const levels = [2, 4, 8].reduce(
        (sum, d) => sum + 2 * Math.ceil(w / d) * Math.ceil(h / d) * 8,
        0
      );
      assert.equal(on.haloBytes, w * h * 12 + levels + 65_536);

      // A lost context takes the targets; a restore re-runs the check, and
      // a restored context without its stencil keeps the halo off.
      const canvas = world.gl.domElement;
      canvas.dispatchEvent({ type: 'webglcontextlost' });
      assert.equal(probes.__perspectiveProbe().halo, 'off');
      assert.equal(probes.__perspectiveProbe().haloBytes, 0);
      world.gl.context.stencilBits = 0;
      canvas.dispatchEvent({ type: 'webglcontextrestored' });
      assert.equal(probes.__perspectiveProbe().halo, 'unavailable: no canvas stencil');
      assert.equal(probes.__perspectiveProbe().canvasStencilBits, 0);
      world.gl.context.stencilBits = 8;
      canvas.dispatchEvent({ type: 'webglcontextlost' });
      canvas.dispatchEvent({ type: 'webglcontextrestored' });
      assert.equal(probes.__perspectiveProbe().halo, 'idle', 'back on once it can draw');
      assert.equal(probes.__perspectiveHalo!(false), 'off');
      canvas.dispatchEvent({ type: 'webglcontextlost' });
      canvas.dispatchEvent({ type: 'webglcontextrestored' });
      assert.equal(probes.__perspectiveProbe().halo, 'off', 'a halo asked off stays off');
      assert.equal(probes.__perspectiveProbe().haloBytes, 0);
    } finally {
      world.teardown();
    }
    const probes = (globalThis as unknown as { window: Partial<Probes> }).window;
    assert.equal(probes.__perspectiveHalo, undefined, 'the switch goes with the view');

    // A view without the float colour target draws no halo pass,
    // and Settings learns it: the view publishes the pass's state, keeps
    // the choice, and asks the display again only on a context restore —
    // the settings subscription re-applies the whole store on every write,
    // so a repeated ask must not allocate and read back the targets again.
    const blind = await boot();
    const checks = mock.method(LampHaloPass.prototype, 'enable');
    try {
      blind.gl.extensionNames.delete('EXT_color_buffer_float');
      const window = (globalThis as unknown as { window: Probes }).window;
      assert.equal(window.__perspectiveHalo!(true), 'unavailable: no EXT_color_buffer_float');
      assert.equal(lampHaloStatus(), 'unavailable: no EXT_color_buffer_float');
      assert.equal(checks.mock.callCount(), 1);
      window.__perspectiveHalo!(true);
      window.__perspectiveHalo!(true);
      assert.equal(checks.mock.callCount(), 1, 'a refused display is not asked on every write');
      blind.gl.domElement.dispatchEvent({ type: 'webglcontextlost' });
      blind.gl.domElement.dispatchEvent({ type: 'webglcontextrestored' });
      assert.equal(checks.mock.callCount(), 2, 'but it is asked again after a restore');
      blind.frame(2);
      const reading = window.__perspectiveProbe();
      assert.equal(reading.haloBytes, 0);
      // No halo pass; the split, which needs no float target, still runs.
      assert.deepEqual(reading.passes, ['canvas', 'split-copy', 'split']);
      assert.equal(window.__perspectiveHalo!(false), 'off');
      assert.equal(lampHaloStatus(), 'off', 'turning a refused halo off clears the note');
      assert.equal(window.__perspectiveHalo!(true), 'unavailable: no EXT_color_buffer_float');
    } finally {
      checks.mock.restore();
      blind.teardown();
    }
    assert.equal(lampHaloStatus(), 'off', 'a view that is gone has refused nothing');
  });

  it('draws the chromatic split on every frame, and checks again after a context restore (#1003)', async () => {
    type Probes = {
      __perspectiveProbe: () => Record<string, unknown>;
      __perspectiveSplit?: (on: boolean) => string;
    };
    const world = await boot();
    try {
      const probes = (globalThis as unknown as { window: Probes }).window;
      world.frame(2);
      const on = probes.__perspectiveProbe();
      // On from mount, with no setting: the copy is 4 bytes a drawing-buffer
      // pixel (gate 6), and the frame ends on it.
      assert.equal(on.split, 'on');
      assert.equal(on.splitBytes, 1280 * 720 * 4);
      assert.deepEqual((on.passes as string[]).slice(-2), ['split-copy', 'split']);
      const blits = world.gl.context.blits;
      world.frame(3);
      assert.equal(world.gl.context.blits - blits, 3, 'one colour copy a frame');

      // A lost context takes the copy; a restore re-runs the check, and a
      // restored context whose copy fails draws the frame without it.
      const canvas = world.gl.domElement;
      canvas.dispatchEvent({ type: 'webglcontextlost' });
      assert.equal(probes.__perspectiveProbe().split, 'off');
      assert.equal(probes.__perspectiveProbe().splitBytes, 0);
      world.gl.context.blitError = world.gl.context.INVALID_OPERATION;
      canvas.dispatchEvent({ type: 'webglcontextrestored' });
      assert.equal(probes.__perspectiveProbe().split, 'unavailable: the colour copy failed');
      world.frame(2);
      assert.deepEqual(probes.__perspectiveProbe().passes, ['canvas']);
      world.gl.context.blitError = 0;
      canvas.dispatchEvent({ type: 'webglcontextlost' });
      canvas.dispatchEvent({ type: 'webglcontextrestored' });
      assert.equal(probes.__perspectiveProbe().split, 'on', 'back on once it can draw');

      // The development switch is the only way off, and a restore keeps it.
      assert.equal(probes.__perspectiveSplit!(false), 'off');
      canvas.dispatchEvent({ type: 'webglcontextlost' });
      canvas.dispatchEvent({ type: 'webglcontextrestored' });
      assert.equal(probes.__perspectiveProbe().split, 'off', 'a split switched off stays off');
      world.frame(2);
      assert.deepEqual(probes.__perspectiveProbe().passes, ['canvas']);
    } finally {
      world.teardown();
    }
    const probes = (globalThis as unknown as { window: Partial<Probes> }).window;
    assert.equal(probes.__perspectiveSplit, undefined, 'the switch goes with the view');
  });

  it('times the frame on the GPU, every pass inside the bracket (gate 6, #1001)', async () => {
    const world = await boot({ gpu: { timer: { ns: 3_200_000, latency: 2 } } });
    try {
      const { __perspectiveProbe: probe, __perspectiveStation: station } = (
        globalThis as unknown as {
          window: {
            __perspectiveProbe: () => Record<string, unknown>;
            __perspectiveStation: (label?: string) => Record<string, unknown>;
          };
        }
      ).window;
      world.frame(4);
      station('home');
      world.frame(6);
      const held = probe();
      assert.equal(held.gpuTimer, 'timing');
      // Six frames into the station, a result two frames late: the first
      // three have landed, and each read exactly what the frame cost.
      assert.equal(held.gpuFrames, 3);
      assert.equal(held.avgGpuMs, 3.2);
      assert.equal(held.worstGpuMs, 3.2);
      assert.equal(held.gpuDropped, 0);
      assert.equal(world.gl.timedPasses, world.gl.passes, 'no pass was drawn outside the timer');
      assert.ok(world.gl.passes >= 10, 'and the frames above were drawn');
      // A fresh station starts from nothing rather than from the last reading.
      station('close');
      const opened = probe();
      assert.equal(opened.gpuFrames, 0);
      assert.equal(opened.avgGpuMs, null, 'no reading is null, never a zero');
      // What was shaded: the stub window's ratio of 1, on a 1280 × 720 host.
      assert.equal(held.pixelRatio, 1);
      assert.deepEqual(held.drawingBuffer, { width: 1280, height: 720 });
    } finally {
      world.teardown();
    }
    assert.equal(world.gl.context.live, 0, 'every query went with the view');
  });

  it('says why there is no GPU reading, and shades at the capped pixel ratio', async () => {
    for (const [gpu, state] of [
      [{}, 'unavailable'],
      [{ timer: { ns: 700, latency: 0 }, rendererName: 'SwiftShader driver' }, 'software'],
    ] as const) {
      const world = await boot({ gpu });
      try {
        world.frame(4);
        const reading = (
          globalThis as unknown as { window: { __perspectiveProbe: () => Record<string, unknown> } }
        ).window.__perspectiveProbe();
        assert.equal(reading.gpuTimer, state);
        assert.equal(reading.avgGpuMs, null);
        assert.equal(reading.gpuFrames, 0);
        assert.equal(world.gl.context.live, 0, `${state}: no query was made`);
      } finally {
        world.teardown();
      }
    }
    // A 2× display is held to gate 6's 1.5, and the drawing buffer follows.
    const stub = globalThis as unknown as { window: { devicePixelRatio: number } };
    stub.window.devicePixelRatio = 2;
    try {
      const world = await boot();
      try {
        const reading = (
          globalThis as unknown as { window: { __perspectiveProbe: () => Record<string, unknown> } }
        ).window.__perspectiveProbe();
        assert.equal(reading.pixelRatio, 1.5);
        assert.deepEqual(reading.drawingBuffer, { width: 1920, height: 1080 });
      } finally {
        world.teardown();
      }
    } finally {
      stub.window.devicePixelRatio = 1;
    }
  });

  it('prices a stall the page stayed visible through, and drops only a hidden gap (#286)', async () => {
    const world = await boot();
    // Skewed rather than stopped: the real clock still advances underneath, so
    // every interval stays positive and only the jump is the test's.
    const real = performance.now.bind(performance);
    let skew = 0;
    const clock = mock.method(performance, 'now', () => real() + skew);
    const doc = globalThis as unknown as { document: { hidden?: boolean } };
    try {
      const station = (
        globalThis as unknown as {
          window: { __perspectiveStation: (label?: string) => Record<string, number> };
        }
      ).window.__perspectiveStation;

      world.frame(2);
      station('stall');
      world.frame(2);
      skew += 3000;
      world.frame(2);
      const stalled = station('hidden');
      // The regression: a guard on the interval's *size* dropped this frame,
      // and on the first real-GPU drive a three-second freeze in plain view
      // read back as a station whose worst frame was 17.7 ms.
      assert.equal(stalled.stationFrames, 4, 'the stalled frame is still a frame');
      assert.ok(
        stalled.worstFrameMs! >= 3000,
        `and it is the station's worst, saw ${stalled.worstFrameMs}`
      );

      world.frame(1);
      doc.document.hidden = true;
      skew += 3000;
      world.frame(1);
      doc.document.hidden = false;
      world.frame(1);
      const hidden = station();
      assert.equal(hidden.stationFrames, 2, 'a gap the page spent hidden is not a frame');
      assert.ok(hidden.worstFrameMs! < 3000, `and is never the worst, saw ${hidden.worstFrameMs}`);
    } finally {
      clock.mock.restore();
      delete doc.document.hidden;
      world.teardown();
    }
  });

  it('takes the probes down with the view', async () => {
    const world = await boot();
    world.frame(2);
    const probes = globalThis as unknown as {
      window: {
        __perspectiveProbe?: unknown;
        __perspectiveStation?: unknown;
        __perspectiveLamps?: () => { units: unknown[]; structures: unknown[] };
      };
    };
    // Outside a production build gate 3's lamp reading comes up with the rest.
    const lamps = probes.window.__perspectiveLamps?.();
    assert.ok(lamps && Array.isArray(lamps.units) && Array.isArray(lamps.structures));
    world.teardown();
    assert.equal(probes.window.__perspectiveProbe, undefined, 'the reading went with it');
    assert.equal(probes.window.__perspectiveStation, undefined, 'and so did the boundary');
    assert.equal(probes.window.__perspectiveLamps, undefined, 'and the lamp reading');
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

describe('renderer smoke test: the water', () => {
  /** Every Points cloud in the conn scene, by how it is built: the snow sizes
   * its motes, the fauna stipple offsets its dots from an anchor, and the
   * embers carry neither. */
  function clouds(scene: Scene | null): {
    embers: Points | null;
    snow: Points | null;
    stipple: Points[];
  } {
    assert.ok(scene !== null, 'the conn rendered at least once');
    let embers: Points | null = null;
    let snow: Points | null = null;
    const stipple: Points[] = [];
    scene.traverse((object) => {
      if (!(object instanceof Points)) return;
      if (object.geometry.getAttribute('snowSize') !== undefined) snow = object;
      else if (object.geometry.getAttribute('aDot') !== undefined) stipple.push(object);
      else embers = object;
    });
    return { embers, snow, stipple };
  }

  it('draws the medium where there is no geometry, on two draw calls', async () => {
    const world = await boot();
    try {
      world.frame(3);
      const scene = world.gl.lastScene;
      const { embers, snow } = clouds(scene);
      assert.ok(snow !== null, 'marine snow is in the scene');

      // The backdrop is the term that removes the horizon, and it has to draw
      // before everything and write no depth or it would be an occluder.
      assert.ok(scene !== null);
      const backdrop = scene.children.find(
        (child) => child instanceof Mesh && child.renderOrder === -1
      ) as Mesh | undefined;
      assert.ok(backdrop !== undefined, 'the backdrop is in the scene');
      const material = backdrop.material as { depthTest: boolean; depthWrite: boolean };
      assert.equal(material.depthTest, false, 'the backdrop never occludes');
      assert.equal(material.depthWrite, false);
      assert.equal(backdrop.frustumCulled, false, 'a clip-space quad has no world bounds');

      // The embers are the one thing in the scene the fog chunk must not
      // touch: they are additive, and mixing an additive fragment toward the
      // water colour makes a distant vent brighter the murkier the water is.
      assert.ok(embers !== null, 'the vent embers are in the scene');
      assert.equal(
        (embers as unknown as { material: { fog: boolean } }).material.fog,
        false,
        'an emitter loses light to the swim and gains none'
      );
    } finally {
      world.teardown();
    }
  });

  it('draws public life as stipple in the water, on one draw per kind (#867)', async () => {
    const world = await boot();
    try {
      world.frame(3);
      const { stipple } = clouds(world.gl.lastScene);
      // docs/map-visuals.md §8: the canned match's two fields and two shoals
      // reach the conn view from the public layers, and cost two draws.
      assert.equal(stipple.length, 2, 'one Points per kind');
      for (const cloud of stipple) {
        assert.ok(cloud.visible && cloud.geometry.drawRange.count > 0, 'each kind has dots');
      }
      const withLife = world.gl.ledger.calls;

      // A sea with no public life in it draws neither, and the frame is two
      // calls lighter for it — the cost is the stipple's and nothing else's.
      const blank = cannedSnapshot(500);
      blank.shoals = [];
      blank.jellies = [];
      world.chart.applySnapshot(blank);
      world.conn.applySnapshot(blank);
      world.frame(3);
      assert.equal(world.gl.ledger.calls, withLife - 2);
      assert.ok(clouds(world.gl.lastScene).stipple.every((cloud) => !cloud.visible));

      // Between matches the colony goes with the rest of the world.
      world.conn.applySnapshot(cannedSnapshot(600));
      world.conn.resetForNewMatch();
      world.frame(1);
      assert.ok(clouds(world.gl.lastScene).stipple.every((cloud) => !cloud.visible));
    } finally {
      world.teardown();
    }
  });

  it('fogs exponentially, and reaches further the further the camera pulls back', async () => {
    const world = await boot();
    try {
      world.frame(2);
      const scene = world.gl.lastScene;
      assert.ok(scene !== null);
      const fog = scene.fog as FogExp2 | null;
      assert.ok(fog instanceof FogExp2, 'the water is an exponential medium, not a linear one');

      const close = fog.density;
      world.conn.focusWorld(CELL_M * COLS * 0.5, CELL_M * COLS * 0.5, 9000);
      world.frame(2);
      assert.ok(fog.density < close, 'a longer dolly sees further into the water');

      world.conn.focusWorld(CELL_M * COLS * 0.5, CELL_M * COLS * 0.5, 600);
      world.frame(2);
      assert.ok(fog.density > close, 'a shorter one sees less');
    } finally {
      world.teardown();
    }
  });

  it('hides nothing the player earned, at any density (#836)', async () => {
    const world = await boot();
    try {
      world.frame(3);

      // The same promise §11 makes of the acoustic veil, and it is a stronger
      // one here: the water hides only *distance*, and the only things
      // distance hides are the player's own hulls and the ground they stand
      // on. Turning it down reveals; it can never withhold. The chart painter
      // — which draws every mark the player earned — has no idea the water
      // exists, and this is what holds that true.
      const before = drawInstructions(world.app.stage);
      world.conn.setWaterDensity(0);
      world.frame(2);
      assert.equal(
        drawInstructions(world.app.stage),
        before,
        'no mark, ring or reading changes with the water'
      );

      const scene = world.gl.lastScene;
      const fog = scene?.fog as FogExp2;
      assert.equal(fog.density, 0, 'at zero there is no distance term at all');
      const { snow } = clouds(scene);
      assert.equal(snow?.visible, false, 'and no cloud to draw');

      world.conn.setWaterDensity(1);
      world.frame(2);
      assert.ok(fog.density > 0, 'and it comes back');
    } finally {
      world.teardown();
    }
  });
});

/**
 * The overlay's contact symbols, in the order they were first drawn: the
 * canned match's seven first, then whatever a test forges, in its order.
 */
function contactSymbols(app: HeadlessApplication): Graphics[] {
  const overlay = app.stage.children[0] as Container;
  return (overlay.children[5] as Container).children as Graphics[];
}

/** A symbol's stipple body, if it has one, and whether it is on the glass. */
function stippleOf(symbol: Graphics): Graphics | null {
  const found = symbol.children.find((child) => child.label === AGENT_STIPPLE_LABEL);
  return (found as Graphics | undefined) ?? null;
}

const showsStipple = (symbol: Graphics): boolean => stippleOf(symbol)?.visible === true;

/**
 * Everything a symbol puts on screen, as one string: where it stands, the
 * ink it queued, and which children it shows. Two contacts that draw the same
 * thing give the same string, whatever their ids.
 */
function inkOf(symbol: Graphics): string {
  return JSON.stringify({
    visible: symbol.visible,
    at: [symbol.position.x, symbol.position.y, symbol.scale.x],
    ink: symbol.context.instructions.map((instruction) => {
      const style = instruction.data.style as { color: number; alpha: number };
      const path = (instruction.data as { path?: GraphicsPath }).path;
      return {
        action: instruction.action,
        color: style.color,
        alpha: style.alpha,
        shapes: path?.shapePath.shapePrimitives.map(({ shape }) => shape),
      };
    }),
    shows: symbol.children.filter((child) => child.visible).map((child) => child.label),
  });
}

/** How many of public life's stipple clouds the conn scene holds. */
function publicStippleClouds(scene: Scene | null): number {
  assert.ok(scene !== null, 'the conn rendered at least once');
  let found = 0;
  scene.traverse((object) => {
    if (object instanceof Points && object.geometry.getAttribute('aDot') !== undefined) found++;
  });
  return found;
}

describe('renderer smoke test: classified fauna (#868)', () => {
  // docs/map-visuals.md §8: at Tier 3 a fauna contact is its species' shape in
  // dots and at Tier 4 the same shape denser, drawn in the overlay's contact
  // symbols (rung 7). The pure half — the shapes, the counts, the look — is
  // faunaAgentStipple.test.ts. This half is the renderer's: the gate below
  // Tier 3, the conn scene left alone, and a frame that allocates nothing.

  it('draws a sub-Tier-3 fauna contact exactly as it draws a hull', async () => {
    // The server never attaches `fauna` below Tier 3, so a real snapshot
    // proves nothing about this gate. The payload is forged: an animal at
    // Tier 1 and Tier 2, each beside a hull at the same tier and the same
    // place, which it must be indistinguishable from (docs/bestiary.md §3).
    const world = await boot();
    try {
      world.frame(3);
      const forged = cannedSnapshot(360);
      const tick = forged.tick;
      forged.contacts = [
        {
          id: 901,
          tier: ResolutionTier.Contact,
          x: 1400,
          y: 1300,
          fauna: FaunaSpecies.Ashgrazer,
          tick,
        },
        { id: 902, tier: ResolutionTier.Contact, x: 1400, y: 1300, tick },
        {
          id: 903,
          tier: ResolutionTier.Bearing,
          x: 2200,
          y: 2000,
          depth: 1500,
          fauna: FaunaSpecies.Sounder,
          tick,
        },
        { id: 904, tier: ResolutionTier.Bearing, x: 2200, y: 2000, depth: 1500, tick },
      ];
      world.chart.applySnapshot(forged);
      world.conn.applySnapshot(forged);
      world.frame(2);

      const [faunaT1, hullT1, faunaT2, hullT2] = contactSymbols(world.app).slice(-4);
      assert.ok(faunaT1 && hullT1 && faunaT2 && hullT2, 'four forged symbols drawn');
      assert.ok(faunaT1.context.instructions.length > 0, 'the Tier-1 animal is its column');
      assert.equal(inkOf(faunaT1), inkOf(hullT1), 'a Tier-1 animal draws what a Tier-1 hull does');
      assert.ok(faunaT2.context.instructions.length > 0, 'the Tier-2 animal is its blob');
      assert.equal(inkOf(faunaT2), inkOf(hullT2), 'a Tier-2 animal draws what a Tier-2 hull does');
      for (const symbol of [faunaT1, faunaT2]) {
        assert.ok(stippleOf(symbol) === null, 'no dots were ever made for it');
      }

      // The positive control: the canned match's Tier-3 Draymaw, a ghost now,
      // is its shape in dots, so the probe above can see a stipple at all.
      const draymaw = contactSymbols(world.app)[5]!;
      assert.ok(showsStipple(draymaw), 'a Tier-3 animal is drawn as stipple');
    } finally {
      world.teardown();
    }
  });

  it('hides a creature’s dots the frame it is demoted below Tier 3', async () => {
    const world = await boot();
    const real = performance.now.bind(performance);
    let skew = 0;
    const clock = mock.method(performance, 'now', () => real() + skew);
    try {
      world.frame(3);
      const at = (tier: ResolutionTier, tick: number) => {
        const snapshot = cannedSnapshot(tick);
        const hollow: Contact = { id: 905, tier, x: 2000, y: 2000, depth: 1800, tick };
        if (tier >= ResolutionTier.Classification) hollow.fauna = FaunaSpecies.Hollow;
        snapshot.contacts = [hollow];
        world.chart.applySnapshot(snapshot);
        world.conn.applySnapshot(snapshot);
      };

      at(ResolutionTier.Classification, 360);
      // A second past its arrival, so the mark is faded in and a twentieth
      // of the way to a ghost.
      skew += 1000;
      world.frame(1);
      const hollow = contactSymbols(world.app).at(-1)!;
      const dots = stippleOf(hollow);
      assert.ok(dots !== null && dots.visible, 'classified: the shape in dots');
      assert.equal(dots.tint, FAUNA_COLOR, 'in the palette’s fauna colour');
      const alpha = TIER_STYLE[ResolutionTier.Classification].alpha;
      assert.ok(
        Math.abs(dots.alpha - alpha * 0.95) < 0.01,
        `at the contact's own alpha, saw ${dots.alpha}`
      );

      // The server now resolves it only to a bearing, and drops `fauna`.
      at(ResolutionTier.Bearing, 365);
      world.frame(1);
      assert.equal(showsStipple(hollow), false, 'demoted: the dots go the same frame');

      at(ResolutionTier.Classification, 370);
      world.frame(1);
      // Identity as a boolean: a failed `equal` on two Pixi objects has the
      // reporter inspect both whole scene graphs, which never finishes.
      assert.ok(stippleOf(hollow) === dots, 'and the same body comes back when it is earned');
      assert.ok(dots.visible);
    } finally {
      clock.mock.restore();
      world.teardown();
    }
  });

  it('draws a whole roster at Tier 4 without touching the conn scene', async () => {
    const world = await boot();
    try {
      // The whole map in shot, so every creature below is on the glass.
      world.conn.focusWorld(CELL_M * COLS * 0.5, CELL_M * COLS * 0.5, 9000);
      const bare = cannedSnapshot(360);
      bare.contacts = bare.contacts.filter((contact) => contact.fauna === undefined);
      world.chart.applySnapshot(bare);
      world.conn.applySnapshot(bare);
      world.frame(5);
      const calls = world.gl.ledger.calls;
      const triangles = world.gl.ledger.triangles;
      assert.equal(publicStippleClouds(world.gl.lastScene), 2);

      // Every creature a full map seeds, of the roster's mix, all tracked.
      const species = DRIFT_ROSTER.flatMap((row) =>
        new Array<FaunaSpecies>(row.count).fill(row.species)
      );
      assert.equal(species.length, 48);
      const teeming = cannedSnapshot(365);
      teeming.contacts = [
        ...bare.contacts,
        ...species.map((fauna, i): Contact => ({
          id: 2000 + i,
          tier: ResolutionTier.Track,
          x: 500 + (i % 8) * 430,
          y: 500 + Math.floor(i / 8) * 520,
          depth: 900,
          hp: 40,
          maxHp: 100,
          fauna,
          tick: 365,
        })),
      ];
      world.chart.applySnapshot(teeming);
      world.conn.applySnapshot(teeming);
      world.frame(5);

      const creatures = contactSymbols(world.app).slice(-48);
      assert.equal(creatures.filter(showsStipple).length, 48, 'every creature is its dots');
      // Gate 6's counted half, and gate 5's conn half: the animals are overlay
      // ink, so the conn scene draws exactly what it drew without them. The
      // public clouds are still the two, and no probe key names a contact.
      assert.equal(world.gl.ledger.calls, calls, 'no draw call for any creature');
      assert.equal(world.gl.ledger.triangles, triangles, 'and no triangle');
      assert.equal(publicStippleClouds(world.gl.lastScene), 2, 'public life is still two draws');
      const probe = (
        globalThis as unknown as { window: { __perspectiveProbe: () => Record<string, unknown> } }
      ).window.__perspectiveProbe();
      assert.equal(
        Object.keys(probe).some((key) => key.includes('contact')),
        false
      );

      // A held camera: thirty frames build nothing and swap no pattern. A
      // frame picks a shared pattern and writes a tint and an alpha.
      const identities = treeIdentities(world.app.stage);
      const patterns = creatures.map((symbol) => stippleOf(symbol)!.context);
      world.frame(30);
      assert.deepEqual(treeIdentities(world.app.stage), identities, 'no display object allocated');
      assert.ok(
        creatures.every((symbol, i) => stippleOf(symbol)!.context === patterns[i]),
        'every body kept its pattern'
      );
    } finally {
      world.teardown();
    }
  });

  it('recycles a swept creature’s body rather than destroying it', async () => {
    // A body draws a shared pattern and Pixi's destroy leaves it subscribed to
    // it, so the pool keeps swept bodies for the next creature instead.
    const world = await boot();
    try {
      world.frame(3);
      const draymaw = contactSymbols(world.app)[5]!;
      const body = stippleOf(draymaw)!;
      assert.ok(body.visible);

      // The contact ghosts out: twenty seconds of wall clock, forged.
      const real = performance.now.bind(performance);
      const clock = mock.method(performance, 'now', () => real() + 21_000);
      try {
        const gone = cannedSnapshot(360);
        gone.contacts = [];
        world.chart.applySnapshot(gone);
        world.frame(2);
        assert.equal(body.destroyed, false, 'the body outlives its symbol');
        assert.ok(body.parent === null, 'but leaves the tree with it');

        const back = cannedSnapshot(420);
        world.chart.applySnapshot(back);
        world.frame(2);
      } finally {
        clock.mock.restore();
      }
      const returned = contactSymbols(world.app).find((symbol) => stippleOf(symbol) !== null);
      assert.ok(
        returned !== undefined && stippleOf(returned) === body,
        'the next creature wears it'
      );
    } finally {
      world.teardown();
    }
  });
});

describe('a held key acts once (#1348)', () => {
  it('takes no second toggle from a held key', async () => {
    // docs/ui-ux.md §9. Auto-repeat ran the action again on every repeat, and
    // the toggles read the selection off the last snapshot: a held Space flipped
    // Silent Running at the snapshot rate and ended wherever the release landed.
    const world = await boot();
    try {
      world.frame(2);
      dispatchWindow('keydown', { code: 'Digit0' });
      const toggles = () => world.log.calls.filter((call) => call.name === 'onToggleSilent').length;
      dispatchWindow('keydown', { code: 'Space', repeat: false });
      assert.equal(toggles(), 1, 'the premise: a press toggles');
      for (let i = 0; i < 3; i++) dispatchWindow('keydown', { code: 'Space', repeat: true });
      assert.equal(toggles(), 1, 'the key, held, toggled again');
    } finally {
      world.teardown();
    }
  });

  it('takes no second recall from a held digit, nor a second menu from a held Esc', async () => {
    // A repeat lands inside the double tap's window, so a held digit centred
    // the camera; and a held Esc opened the menu on every repeat.
    const world = await boot();
    try {
      const conn = world.conn as unknown as { target: { x: number; z: number } };
      world.frame(2);
      dispatchWindow('keydown', { code: 'Digit0' });
      dispatchWindow('keydown', { code: 'Digit1', ctrlKey: true });
      world.chart.focusOn(500, 500);
      dispatchWindow('keydown', { code: 'Digit1' });
      const at = { x: conn.target.x, z: conn.target.z };
      for (let i = 0; i < 3; i++) dispatchWindow('keydown', { code: 'Digit1', repeat: true });
      assert.deepEqual({ x: conn.target.x, z: conn.target.z }, at, 'a held digit centred');

      const menus = () => world.log.calls.filter((call) => call.name === 'onOpenMenu').length;
      dispatchWindow('keydown', { code: 'Escape' });
      for (let i = 0; i < 3; i++) dispatchWindow('keydown', { code: 'Escape', repeat: true });
      assert.equal(menus(), 1, 'a held Esc opened the menu again');
    } finally {
      world.teardown();
    }
  });
});

describe('renderer smoke test: input and teardown', () => {
  /**
   * The mission hold, through the input path rather than through the predicate.
   *
   * `movementHolds.test.ts` holds `heldWholly` and `movableIn`, which is the
   * rule; this is the wiring, and the wiring is what #708 got wrong twice. The
   * harvest branch of the context order handed its harvesters straight to the
   * server without ever consulting the hold, so the one gesture that reaches a
   * held hull was the one nobody filtered — and because a harvest order
   * republishes `MoveOrder` at 60 Hz against a 5 Hz clamp, the hull did not
   * twitch, it left. Asserted on the callbacks because those are what crosses
   * the wire: an order not sent is an order the server never has to refuse.
   */
  it('sends no order at all for a hull the mission is holding', async () => {
    /**
     * Both gestures, in one drive, with the hold on or off.
     *
     * The second right-click is the one #722's own review found missing. With
     * only a harvester selected and the click on a node, `handleContextOrder`
     * takes the harvest branch and `rest` — everything in the selection that is
     * *not* a harvester — is empty either way, so the `onMoveOrder` assertion
     * below used to hold whether the guard was there or not. The open-water
     * click reaches `movable` on the move branch instead, which is the path
     * that can actually fail.
     *
     * And the free leg is what proves the water click is open water: if the
     * offset happened to land on a node, the harvest branch would swallow it
     * again and the held leg would pass for the old reason. Ordered and named
     * rather than asserted only as an absence.
     */
    const drive = async (held: boolean): Promise<string[]> => {
      const world = await boot();
      try {
        const snapshot = cannedSnapshot();
        const harvester = snapshot.units.find((unit) => unit.throttle !== undefined);
        assert.ok(harvester !== undefined, 'the canned match has no harvester to hold');
        if (held) {
          world.chart.setMissionHolds([
            { unitId: harvester.id, reason: MovementHoldReason.Unreleased },
          ]);
        }
        world.chart.focusOn(harvester.x, harvester.y);
        world.frame(2);

        const canvas = world.app.canvas;
        const at = world.conn.projectPoint(harvester.x, harvester.y, harvester.depth);
        assert.ok(at.visible, 'the camera is looking at the hull we are about to click');
        for (const type of ['pointerdown', 'pointerup']) {
          canvas.dispatch(type, {
            button: 0,
            pointerId: 1,
            pointerType: 'mouse',
            clientX: at.x,
            clientY: at.y,
          });
        }
        world.frame(1);

        // Right-click the field. This is the branch that used to bypass the
        // hold; a harvest order is a movement order and the shell may not send
        // one for a hull that is going nowhere.
        const node = cannedNodes()[0]!;
        const onField = world.conn.projectPoint(node.x, node.y, node.depth);
        // A right click is a press and a release: the order is given on release
        // (docs/ui-ux.md §9), so the press can still become the left + right drag.
        for (const type of ['pointerdown', 'pointerup']) {
          canvas.dispatch(type, {
            button: 2,
            pointerId: 1,
            pointerType: 'mouse',
            clientX: onField.x,
            clientY: onField.y,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
          });
        }

        // Right-click open water, the same screen offset the plain move-order
        // case below uses to clear this very node.
        for (const type of ['pointerdown', 'pointerup']) {
          canvas.dispatch(type, {
            button: 2,
            pointerId: 1,
            pointerType: 'mouse',
            clientX: at.x + 120,
            clientY: at.y + 40,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
          });
        }

        return world.log.names();
      } finally {
        world.teardown();
      }
    };

    // The control, and it is load-bearing twice over: it proves both branches
    // are reachable in this arrangement, and it proves the water click is not
    // quietly landing on the field.
    const free = await drive(false);
    assert.ok(free.includes('onHarvestOrder'), `no harvest order at all, saw ${free.join(', ')}`);
    assert.ok(free.includes('onMoveOrder'), `no move order at all, saw ${free.join(', ')}`);

    const sent = await drive(true);
    assert.ok(!sent.includes('onHarvestOrder'), 'a held hull was sent to a field');
    assert.ok(!sent.includes('onMoveOrder'), 'a held hull was sent anywhere');
  });

  /**
   * The `W` key, which armed attack-move over a held selection — #722.
   *
   * ENGAGE, the *button* for the same action, has carried the hold as its
   * refusal since #708; the key never asked. §10.5 is about the action rather
   * than the affordance — the player "learns the rule before pressing, because
   * a refusal delivered afterwards teaches nothing" — so an armed mode whose
   * click the server throws away is that refusal deferred, whichever hand
   * reached it.
   *
   * It was worse on the key than on the button and #719 is why: the held hint
   * line replaced the movement bindings, and `ATTACK-MOVE armed` is one of
   * them, so the mode was armed with nothing on screen saying so or saying
   * that ESC cancels it.
   *
   * Hence the shape — arm, then *lift* the hold, then act. Asserting while the
   * hold is up would pass with the bug in, because the hold owns both the bar
   * and the order path either way.
   *
   * **What is asserted is the order, not the bar.** The refusal this fix adds
   * occupies the hint line for `REFUSAL_MS` (`hintLine`'s first branch), so a
   * bar that fails to say `ATTACK-MOVE armed` proves only that something else
   * is written there — a later change that armed the mode *and* refused would
   * read as a pass. The armed mode's one real effect is what a left click on
   * the water becomes, so that is the assertion; the bar is checked second,
   * for the half of the defect that is about what the player can see.
   */
  it('arms no attack-move on a selection the mission is holding whole', async () => {
    const armed = async (
      held: boolean
    ): Promise<{ ordered: boolean; bar: string | null; reason: string | null }> => {
      const world = await boot();
      try {
        const snapshot = cannedSnapshot();
        // A hull with no throttle: `hintLine` answers for a harvester before
        // it ever reaches the armed branch, so a harvester cannot see this.
        const fighter = snapshot.units.find((unit) => unit.throttle === undefined);
        assert.ok(fighter !== undefined, 'the canned match has no fighter to arm');
        if (held) {
          world.chart.setMissionHolds([
            { unitId: fighter.id, reason: MovementHoldReason.Unreleased },
          ]);
        }
        world.chart.focusOn(fighter.x, fighter.y);
        world.frame(2);

        const canvas = world.app.canvas;
        const at = world.conn.projectPoint(fighter.x, fighter.y, fighter.depth);
        assert.ok(at.visible, 'the camera is looking at the hull we are about to select');
        for (const type of ['pointerdown', 'pointerup']) {
          canvas.dispatch(type, {
            button: 0,
            pointerId: 1,
            pointerType: 'mouse',
            clientX: at.x,
            clientY: at.y,
          });
        }
        world.frame(1);

        dispatchWindow('keydown', { code: 'KeyW' });
        // The hold comes off, so nothing downstream can refuse on its own
        // account and what happens next is the mode's doing alone. Nothing
        // re-presses the key.
        world.chart.setMissionHolds([]);
        world.frame(1);
        const bar = textSaying(world.app.stage, 'ATTACK-MOVE armed');
        // `movementHolds.ts`'s own `HOLD_TEXT` for `Unreleased`, which is
        // §10.5's wording rather than this component's markup. Read after the
        // hold is lifted on purpose: `refuse` parks its reason on the bar for
        // `REFUSAL_MS`, so what is on screen here is the press answering for
        // itself rather than the steady-state held line.
        const reason = textSaying(world.app.stage, 'held — not released yet');

        // The water, left button: the one thing an armed mode does.
        // Press and release: an armed click is given on release, as a right
        // click is, so the press can still become the left + right drag (§9).
        for (const type of ['pointerdown', 'pointerup']) {
          canvas.dispatch(type, {
            button: 0,
            pointerId: 1,
            pointerType: 'mouse',
            clientX: at.x + 140,
            clientY: at.y + 60,
            shiftKey: false,
          });
        }
        return { ordered: world.log.first('onAttackMoveOrder') !== undefined, bar, reason };
      } finally {
        world.teardown();
      }
    };

    // The control first, because it is what makes the case below mean
    // anything: the key does arm, the click does become an attack-move, and
    // this test can see both when they happen.
    const free = await armed(false);
    assert.ok(free.ordered, 'the control never armed at all, so the case below proves nothing');
    assert.ok(free.bar !== null, 'the control armed without the bar ever saying so');
    assert.equal(free.reason, null, 'nothing was refused, so nothing should be giving a reason');

    const held = await armed(true);
    assert.equal(
      held.ordered,
      false,
      'the W key armed an attack-move over a selection the mission is holding'
    );
    assert.equal(held.bar, null, 'and the bar announced a mode that should not have armed');
    // The other half of the fix, and the half an absence cannot hold: §7 wants
    // the refusal *stated*, and ENGAGE's mirror is its `refusal`, not merely
    // its greying. Without this, deleting `this.refuse(held)` and keeping the
    // bare `return` leaves the whole suite green — the press would fail
    // silently, which is the half of #722 item 3 that made the key worse than
    // the button rather than merely different.
    assert.equal(held.reason, 'held — not released yet', 'the refused press never said why');
  });

  /**
   * Both routes to attack-move under a weapons lock — #989.
   *
   * ENGAGE greyed under the lock with no `refusal`, so a press said nothing,
   * and `W` armed anyway: the click painted an attack-move for what
   * `orderAttackMove` turns into a plain move. §7 wants the grey-out "with a
   * reason attached", never silently, and the mission's reason is the one.
   *
   * The #722 test's shape, for its reason: arm, *lift* the lock, then click,
   * so the order is the press's doing alone. The button is pressed where its
   * label is drawn — `paintCommandBar` centres the label on the cell, and
   * `pressBarButton` hit-tests the same cell.
   */
  it('arms no attack-move under a weapons lock, from the key or ENGAGE', async () => {
    const reason = 'weapons cold — the hardpoints are on the table';
    const armed = async (
      route: 'key' | 'button',
      locked: boolean
    ): Promise<{ ordered: boolean; bar: string | null; reason: string | null }> => {
      const world = await boot();
      try {
        const fighter = cannedSnapshot().units.find((unit) => unit.throttle === undefined);
        assert.ok(fighter !== undefined, 'the canned match has no fighter to arm');
        if (locked) world.chart.setMissionLocks([{ ability: 'weapons', reason }]);
        world.chart.focusOn(fighter.x, fighter.y);
        world.frame(2);

        const canvas = world.app.canvas;
        const at = world.conn.projectPoint(fighter.x, fighter.y, fighter.depth);
        assert.ok(at.visible, 'the camera is looking at the hull we are about to select');
        for (const type of ['pointerdown', 'pointerup']) {
          canvas.dispatch(type, {
            button: 0,
            pointerId: 1,
            pointerType: 'mouse',
            clientX: at.x,
            clientY: at.y,
          });
        }
        world.frame(1);

        if (route === 'key') {
          dispatchWindow('keydown', { code: 'KeyW' });
        } else {
          const engage = barLabel(world.app, 'ENGAGE');
          canvas.dispatch('pointerdown', {
            button: 0,
            pointerId: 1,
            pointerType: 'mouse',
            clientX: engage.x,
            clientY: engage.y,
          });
        }
        world.chart.setMissionLocks([]);
        world.frame(1);
        const bar = textSaying(world.app.stage, 'ATTACK-MOVE armed');
        const said = textSaying(world.app.stage, reason);

        // Press and release: an armed click is given on release, as a right
        // click is, so the press can still become the left + right drag (§9).
        for (const type of ['pointerdown', 'pointerup']) {
          canvas.dispatch(type, {
            button: 0,
            pointerId: 1,
            pointerType: 'mouse',
            clientX: at.x + 140,
            clientY: at.y + 60,
            shiftKey: false,
          });
        }
        return {
          ordered: world.log.first('onAttackMoveOrder') !== undefined,
          bar,
          reason: said,
        };
      } finally {
        world.teardown();
      }
    };

    for (const route of ['key', 'button'] as const) {
      // The control: unlocked, this route arms and the click is an attack-move.
      const free = await armed(route, false);
      assert.ok(
        free.ordered,
        `${route}: the control never armed, so the case below proves nothing`
      );
      assert.ok(free.bar !== null, `${route}: the control armed without the bar saying so`);
      assert.equal(free.reason, null, `${route}: nothing was refused, yet a reason is showing`);

      const locked = await armed(route, true);
      assert.equal(locked.ordered, false, `${route}: armed an attack-move under a weapons lock`);
      assert.equal(locked.bar, null, `${route}: the bar announced a mode that should not arm`);
      assert.equal(locked.reason, reason, `${route}: the refused press never said why`);
    }
  });

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

      // A right click is a press and a release: the order is given on release
      // (docs/ui-ux.md §9), so the press can still become the left + right drag.
      for (const type of ['pointerdown', 'pointerup']) {
        canvas.dispatch(type, {
          button: 2,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x + 120,
          clientY: at.y + 40,
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        });
      }

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

  /**
   * A right click is given on release — docs/ui-ux.md §9, "A click is a point
   * in the water" (#1132). On release, so the press can still become the left
   * + right drag; from where it was pressed, with the press's modifiers, so a
   * hand that drifts or lets go of Shift before letting go of the button does
   * not move the order.
   */
  it('gives a right click on release, from the press, at the depth it landed on', async () => {
    const world = await boot();
    try {
      const hull = cannedSnapshot().units[0]!;
      world.chart.focusOn(hull.x, hull.y);
      world.frame(2);
      const canvas = world.app.canvas;
      const at = world.conn.projectPoint(hull.x, hull.y, hull.depth);
      assert.ok(at.visible, 'the camera is looking at the hull we are about to click');
      for (const type of ['pointerdown', 'pointerup']) {
        canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x,
          clientY: at.y,
        });
      }
      world.frame(1);

      const press = { x: at.x + 120, y: at.y + 40 };
      canvas.dispatch('pointerdown', {
        button: 2,
        buttons: 2,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: press.x,
        clientY: press.y,
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
      });
      assert.equal(world.log.first('onMoveOrder'), undefined, 'nothing is ordered on the press');

      canvas.dispatch('pointerup', {
        button: 2,
        buttons: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: press.x + 30,
        clientY: press.y - 20,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
      });
      const order = world.log.first('onMoveOrder');
      assert.ok(order !== undefined, `expected a move order, saw ${world.log.names().join(', ')}`);
      const water = world.conn.resolveWater(press.x, press.y);
      assert.deepEqual(
        order,
        [[hull.id], water.x, water.y, true, water.depthM],
        'the press’s point, its depth and its Shift — not the release’s'
      );
    } finally {
      world.teardown();
    }
  });

  /**
   * The left + right drag is the camera, and the chord is not timing-critical
   * (docs/ui-ux.md §9, §11): either button may land first. A browser reports
   * the second button as a move whose `buttons` mask holds both, which is how
   * this drives it. Neither click the presses were about to make is given.
   */
  it('turns a left + right press into the camera, in either order, and gives no click', async () => {
    const rig = (): { focus: { xM: number; zM: number; depthM: number | null } } =>
      (
        globalThis as unknown as {
          window: { __perspectiveProbe: () => Record<string, unknown> };
        }
      ).window.__perspectiveProbe() as never;

    for (const first of [0, 2] as const) {
      const world = await boot();
      try {
        const hull = cannedSnapshot().units[0]!;
        world.chart.focusOn(hull.x, hull.y);
        world.frame(2);
        const canvas = world.app.canvas;
        const at = world.conn.projectPoint(hull.x, hull.y, hull.depth);
        for (const type of ['pointerdown', 'pointerup']) {
          canvas.dispatch(type, {
            button: 0,
            pointerId: 1,
            pointerType: 'mouse',
            clientX: at.x,
            clientY: at.y,
          });
        }
        world.frame(1);
        world.log.calls.length = 0;
        const before = rig().focus;
        assert.equal(before.depthM, null, 'the premise: the focus starts on the seabed');

        const x = at.x + 120;
        const y = at.y + 40;
        const press = (type: string, button: number, buttons: number, dx = 0, dy = 0) =>
          canvas.dispatch(type, {
            button,
            buttons,
            pointerId: 1,
            pointerType: 'mouse',
            clientX: x + dx,
            clientY: y + dy,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
          });
        press('pointerdown', first, first === 0 ? 1 : 2);
        press('pointermove', first === 0 ? 2 : 0, 3); // the other button joins
        press('pointermove', -1, 3, 40, 60); // across 40 px, and 60 px down
        press('pointermove', first, first === 0 ? 2 : 1, 40, 60); // one lets go
        press('pointerup', first === 0 ? 2 : 0, 0, 40, 60); // then the other

        world.frame(1);
        const after = rig().focus;
        assert.ok(after.xM < before.xM, `first ${first}: the drag across did not pan sideways`);
        assert.ok(after.depthM !== null, `first ${first}: the drag down did not raise the focus`);
        // Off the seabed under where the pan left the focus, which is where the
        // rise was measured from.
        const seabed = world.conn.seabedDepthAt(after.xM, after.zM);
        assert.ok(
          Math.abs(after.depthM - (seabed - 60 * FOCUS_DRAG_M_PER_PX)) <= 1,
          `first ${first}: 60 px down is ${60 * FOCUS_DRAG_M_PER_PX} m up, not ` +
            `${(seabed - after.depthM).toFixed(0)}`
        );
        for (const name of ['onMoveOrder', 'onAttackOrder', 'onHarvestOrder', 'onRallyOrder']) {
          assert.equal(world.log.first(name), undefined, `first ${first}: a click gave ${name}`);
        }
        assert.ok(
          textSaying(world.app.stage, '1 selected') !== null,
          `first ${first}: the left press resolved as a marquee and changed the selection`
        );
      } finally {
        world.teardown();
      }
    }
  });

  /**
   * docs/ui-ux.md §2 puts the orders panel top-left, "clear of the depth
   * ribbon". The panel's `left` is `RIBBON_UNITS`, so the ribbon's labels have
   * to end inside that claim, or `SHELF` is drawn under the panel as it was at
   * x = 40 (#1650). Measured from the labels the ribbon actually drew.
   */
  it("keeps the ribbon's labels inside the edge the orders panel stands clear of (#1650)", async () => {
    const world = await boot();
    try {
      const corvette = cannedSnapshot().units.find((unit) => unit.id === 11)!;
      world.chart.focusOn(corvette.x, corvette.y);
      world.frame(2);
      const at = world.conn.projectPoint(corvette.x, corvette.y, corvette.depth);
      for (const type of ['pointerdown', 'pointerup']) {
        world.app.canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x,
          clientY: at.y,
        });
      }
      world.frame(1);

      const labels: Text[] = [];
      const walk = (node: Container): void => {
        if (!node.visible) return;
        if (node instanceof Text && ['SHELF', 'MID', 'ABYSS', 'DUCT'].includes(node.text)) {
          labels.push(node);
        }
        for (const child of node.children) walk(child as Container);
      };
      walk(world.app.stage);
      assert.deepEqual(
        labels.map((label) => label.text).sort(),
        ['ABYSS', 'DUCT', 'MID', 'SHELF'],
        'the premise: a selection draws the ribbon and all four of its labels'
      );

      const column = RIBBON_X + RIBBON_WIDTH + RIBBON_LABEL_GAP;
      for (const label of labels) {
        assert.equal(label.x, column, `${label.text} left the label column`);
        assert.ok(
          label.x + label.width <= column + RIBBON_LABEL_ROOM,
          `${label.text} ends at ${label.x + label.width}, past the ${column + RIBBON_LABEL_ROOM} the panel clears`
        );
      }
      assert.ok(RIBBON_UNITS > column + RIBBON_LABEL_ROOM, 'the panel stands on the labels');
    } finally {
      world.teardown();
    }
  });

  /**
   * The same promise at the panel's foot. `.objectives` stands 60 units down
   * and is capped at the screen less `PANEL_CAP_UNITS`, so at its cap its foot
   * has to stay above the ribbon's depth readout, whose previews run under the
   * panel's left edge. Capped off the hint line alone, the foot covered the
   * readout's top 8 units (#1668). Measured from the readout the ribbon drew.
   */
  it("keeps the orders panel's cap clear of the ribbon's depth readout (#1668)", async () => {
    const world = await boot();
    try {
      const corvette = cannedSnapshot().units.find((unit) => unit.id === 11)!;
      world.chart.focusOn(corvette.x, corvette.y);
      world.frame(2);
      const at = world.conn.projectPoint(corvette.x, corvette.y, corvette.depth);
      for (const type of ['pointerdown', 'pointerup']) {
        world.app.canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x,
          clientY: at.y,
        });
      }
      world.frame(1);

      const readouts: Text[] = [];
      const walk = (node: Container): void => {
        if (!node.visible) return;
        // The ribbon's own column: the scope's range rings read in metres too.
        if (node instanceof Text && /^\d+m/.test(node.text) && node.x < RIBBON_UNITS) {
          readouts.push(node);
        }
        for (const child of node.children) walk(child as Container);
      };
      walk(world.app.stage);
      assert.equal(readouts.length, 1, 'the premise: a selection draws the depth readout');
      const readout = readouts[0]!;

      // App.css's `top: 60px`, the strip and its gap, and the 1 px border top
      // and bottom outside the content-box max-height; the scale is 100%.
      const footAt = (capUnits: number) => 60 + (world.app.screen.height - capUnits) + 2;
      assert.ok(
        footAt(PANEL_CAP_UNITS) < readout.y,
        `the panel's foot at ${footAt(PANEL_CAP_UNITS)} covers the readout at ${readout.y}`
      );
      assert.ok(
        footAt(CHROME_UNITS) > readout.y,
        "the control: a cap off the hint line alone reaches past the readout's top"
      );
    } finally {
      world.teardown();
    }
  });

  /**
   * Holding `Alt` previews the click under the cursor (docs/ui-ux.md §8): a
   * climb into open water says how long it takes, and a click on ground below a
   * selected hull's rating says the hull will stop short of it — following
   * stops where the ground falls past the rating, and never crushes
   * (docs/systems-depth.md §2).
   */
  it('previews the click under Alt, and says where following stops short of the floor', async () => {
    const world = await boot();
    try {
      // The Corvette, PR-2 through the Consortium's baseline, at 1,200 m.
      const corvette = cannedSnapshot().units.find((unit) => unit.id === 11)!;
      world.chart.focusOn(corvette.x, corvette.y);
      world.frame(2);
      const canvas = world.app.canvas;
      const at = world.conn.projectPoint(corvette.x, corvette.y, corvette.depth);
      for (const type of ['pointerdown', 'pointerup']) {
        canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x,
          clientY: at.y,
        });
      }
      world.frame(1);
      dispatchWindow('keydown', { code: 'AltLeft' });
      const hover = (x: number, y: number) => {
        canvas.dispatch('pointermove', {
          button: -1,
          buttons: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: x,
          clientY: y,
        });
        world.frame(1);
      };

      // Home, over the trench: 3,200 m ground the Corvette is not rated for.
      world.conn.home();
      world.conn.focusWorld(3500, 3500);
      const trench = world.conn.projectPoint(3500, 3500, null);
      hover(trench.x, trench.y);
      const dive = textSaying(world.app.stage, 'DIVE');
      assert.ok(dive !== null, 'no dive preview over the trench');
      assert.match(dive, /FLOOR · PR EDGE/, `the preview read ${dive}`);
      assert.doesNotMatch(dive, /CRUSH/, 'following stops at the rating; it never crushes');

      // Raised into open water above the Corvette: a climb, and its seconds.
      world.conn.focusWorld(2000, 2000);
      world.conn.raiseFocusBy(1500);
      const centre = world.conn.projectPoint(2000, 2000, world.conn.focusDepth());
      hover(centre.x, centre.y);
      const rise = textSaying(world.app.stage, 'RISE');
      assert.ok(rise !== null, 'no climb preview in open water');
      assert.match(rise, /^RISE \d+s$/, `the preview read ${rise}`);

      // A metre above the Corvette's own depth: a climb inside the arrival
      // epsilon, which the depth system snaps to at once, so the move has no
      // vertical part to price, and the readout says so rather than `RISE 0s`.
      world.conn.raiseFocusBy(world.conn.focusDepth() - (corvette.depth - 1));
      const own = world.conn.projectPoint(2000, 2000, world.conn.focusDepth());
      hover(own.x, own.y);
      const level = textSaying(world.app.stage, 'LEVEL');
      assert.equal(level, 'LEVEL', `the preview at the hull's own depth read ${level}`);

      // A metre below it snaps too, so it is never charged the descent's SIG,
      // and a hull that is not silent pays nothing for it (#1246).
      world.conn.raiseFocusBy(-2);
      const below = world.conn.projectPoint(2000, 2000, world.conn.focusDepth());
      hover(below.x, below.y);
      const shallow = textSaying(world.app.stage, 'LEVEL');
      assert.equal(shallow, 'LEVEL', `a metre below a hull that is not silent read ${shallow}`);

      // Silent, the same metre costs the silence a deeper depth order breaks,
      // and the readout names that rather than a SIG it will not pay.
      const silent = cannedSnapshot();
      silent.units.find((unit) => unit.id === 11)!.silentRunning = true;
      world.chart.applySnapshot(silent);
      world.conn.applySnapshot(silent);
      world.frame(1);
      hover(below.x, below.y);
      const breaks = textSaying(world.app.stage, 'DIVE');
      assert.equal(breaks, 'DIVE · BREAKS SILENCE', `a metre below a silent hull read ${breaks}`);

      // A metre above it keeps the silence: only a deeper order breaks it.
      world.conn.raiseFocusBy(2);
      const above = world.conn.projectPoint(2000, 2000, world.conn.focusDepth());
      hover(above.x, above.y);
      const kept = textSaying(world.app.stage, 'LEVEL');
      assert.equal(kept, 'LEVEL', `a metre above a silent hull read ${kept}`);

      // Past the snap it is a dive, charged as one.
      world.conn.raiseFocusBy(-12);
      const past = world.conn.projectPoint(2000, 2000, world.conn.focusDepth());
      hover(past.x, past.y);
      const deeper = textSaying(world.app.stage, 'DIVE');
      assert.match(deeper ?? '', /^DIVE \d+ SIG$/, `eleven metres below the hull read ${deeper}`);

      // On the ground, a follow mark inside the snap breaks nothing, silent or
      // not: the follow mode holds its station without a depth order
      // (`depth.ts`). The silent Corvette a metre above the trench's follow
      // depth, which is the deepest a hull may be ordered.
      const deep = cannedSnapshot();
      const sunk = deep.units.find((unit) => unit.id === 11)!;
      sunk.silentRunning = true;
      sunk.depth = DEPTH.MAX_M - 1;
      world.chart.applySnapshot(deep);
      world.conn.applySnapshot(deep);
      world.frame(1);
      world.conn.home();
      world.conn.focusWorld(3500, 3500);
      const ground = world.conn.projectPoint(3500, 3500, null);
      hover(ground.x, ground.y);
      const held = textSaying(world.app.stage, 'LEVEL');
      assert.equal(held, 'LEVEL · FLOOR · PR EDGE', `a follow mark a metre down read ${held}`);

      // And a climb that ends below the rating still says so (§8): `CRUSH`
      // follows every first word, as the threat colour does.
      world.conn.raiseFocusBy(world.conn.focusDepth() - 2500);
      const climb = world.conn.projectPoint(3500, 3500, world.conn.focusDepth());
      hover(climb.x, climb.y);
      const crushed = textSaying(world.app.stage, 'RISE');
      assert.match(crushed ?? '', /^RISE \d+s · CRUSH$/, `a climb to 2,500 m read ${crushed}`);
    } finally {
      world.teardown();
    }
  });

  /**
   * The PR badge and the crush warning read the band the server says the hull
   * owns (docs/ui-ux.md §8). A bought refit is that band
   * (docs/systems-progression.md §2), and the roster alone read a refitted
   * hull one band low, with `PR EDGE` over ground its rating holds (#1245).
   */
  it("reads a refitted hull's own band, and rents nothing it owns (#1245)", async () => {
    const world = await boot();
    try {
      // The Corvette is PR-2 on the roster, at 1,200 m; refitted, it owns PR-3.
      const refitted = cannedSnapshot();
      const corvette = refitted.units.find((unit) => unit.id === 11)!;
      corvette.pressureRating = 3;
      world.chart.applySnapshot(refitted);
      world.conn.applySnapshot(refitted);
      world.chart.focusOn(corvette.x, corvette.y);
      world.frame(2);
      const canvas = world.app.canvas;
      const at = world.conn.projectPoint(corvette.x, corvette.y, corvette.depth);
      for (const type of ['pointerdown', 'pointerup']) {
        canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x,
          clientY: at.y,
        });
      }
      world.frame(1);
      const badge = () => textContents(world.app.stage).filter((line) => /^PR\d/.test(line));
      assert.deepEqual(badge(), ['PR3'], 'owned, so it reads in the base and not as PR2+1');

      // Over the trench's 3,200 m ground the PR-2 Corvette stops short; the
      // refitted one follows the floor all the way down.
      dispatchWindow('keydown', { code: 'AltLeft' });
      world.conn.home();
      world.conn.focusWorld(3500, 3500);
      const trench = world.conn.projectPoint(3500, 3500, null);
      canvas.dispatch('pointermove', {
        button: -1,
        buttons: 0,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: trench.x,
        clientY: trench.y,
      });
      world.frame(1);
      const dive = textSaying(world.app.stage, 'DIVE');
      assert.ok(dive !== null, 'no dive preview over the trench');
      assert.match(dive, /· FLOOR$/, `the refitted Corvette's preview read ${dive}`);

      // A Spire's grant on top is still rented, and still reads as rented.
      corvette.pressureBonus = 1;
      world.chart.applySnapshot(refitted);
      world.conn.applySnapshot(refitted);
      world.frame(1);
      assert.deepEqual(badge(), ['PR3+1'], 'the owned band, then the rented one');
    } finally {
      world.teardown();
    }
  });

  /**
   * The digits are the game's (docs/ui-ux.md §9): `1`–`9` recall a group,
   * `Ctrl` + digit assigns one, and `0` selects the army. The browser binds
   * the same chords to switching tabs and resetting the zoom, so a digit the
   * renderer handled must cancel the browser's default (#1220).
   */
  it('cancels the browser default on every digit it handles', async () => {
    const world = await boot();
    try {
      world.frame(2);
      let prevented = 0;
      const cancels = (code: string, held: Record<string, boolean> = {}): boolean => {
        const before = prevented;
        const preventDefault = (): void => {
          prevented += 1;
        };
        dispatchWindow('keydown', { code, ...held, preventDefault });
        dispatchWindow('keyup', { code, ...held });
        return prevented > before;
      };
      assert.ok(cancels('Digit2', { ctrlKey: true }), 'Ctrl + 2 assigns, and keeps the tab');
      assert.ok(cancels('Digit2', { metaKey: true }), 'so does Cmd + 2 on a Mac');
      assert.ok(cancels('Digit2'), 'a recall is the game’s too');
      assert.ok(cancels('Digit0', { ctrlKey: true }), 'Ctrl + 0 selects the army, not the zoom');
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

describe('one click is armed at a time (#1335)', () => {
  it('gives the click to a build armed over an armed attack-move', async () => {
    // docs/ui-ux.md §9: the last one armed. `W` already dropped a pending
    // build, but a build key left an armed attack-move standing, and the click
    // the hint bar promised the Refinery went out as an attack-move.
    const world = await boot();
    try {
      world.frame(2);
      dispatchWindow('keydown', { code: 'Digit0' });
      dispatchWindow('keydown', { code: 'KeyW' });
      world.frame(1);
      assert.ok(textSaying(world.app.stage, 'ATTACK-MOVE armed') !== null, 'the premise: armed');
      dispatchWindow('keydown', { code: 'KeyR' });
      world.frame(1);
      assert.ok(textSaying(world.app.stage, 'placing ') !== null, 'the premise: a build armed');

      // The water, pressed and released: an armed click is given on release.
      for (const type of ['pointerdown', 'pointerup']) {
        world.app.canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 700,
          clientY: 400,
        });
      }
      assert.equal(world.log.first('onAttackMoveOrder'), undefined, 'the click attack-moved');
      assert.equal(world.log.first('onBuild')?.[0], StructureKind.Refinery, 'and placed nothing');
    } finally {
      world.teardown();
    }
  });
});

/**
 * docs/audio-direction.md §12, "Three interface cues" (#1600): the renderer
 * says which of the three a click was, where the thing it says is drawn.
 * Whether it sounds is the engine's setting, asserted in audioEngine.test.ts.
 */
describe('the interface cues the renderer reports (#1600)', () => {
  const cues = (world: Booted): unknown[] =>
    world.log.calls.filter((call) => call.name === 'onInterfaceCue').map((call) => call.args[0]);

  it('reports an order where its marker paints, and nothing for a selection', async () => {
    const world = await boot();
    try {
      const hull = cannedSnapshot().units[0]!;
      world.chart.focusOn(hull.x, hull.y);
      world.frame(2);
      const at = world.conn.projectPoint(hull.x, hull.y, hull.depth);
      for (const type of ['pointerdown', 'pointerup']) {
        world.app.canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x,
          clientY: at.y,
        });
      }
      world.frame(1);
      assert.deepEqual(cues(world), [], 'selecting a hull is not an order');

      for (const type of ['pointerdown', 'pointerup']) {
        world.app.canvas.dispatch(type, {
          button: 2,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x + 120,
          clientY: at.y + 40,
        });
      }
      assert.ok(world.log.first('onMoveOrder') !== undefined, 'the premise: a move was sent');
      assert.deepEqual(cues(world), ['order'], 'one move, one order cue');
    } finally {
      world.teardown();
    }
  });

  it('reports a placement when the armed build is sent', async () => {
    const world = await boot();
    try {
      world.frame(2);
      dispatchWindow('keydown', { code: 'KeyR' });
      world.frame(1);
      assert.deepEqual(cues(world), [], 'arming is not placing');
      for (const type of ['pointerdown', 'pointerup']) {
        world.app.canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 700,
          clientY: 400,
        });
      }
      assert.equal(world.log.first('onBuild')?.[0], StructureKind.Refinery, 'the premise: placed');
      assert.deepEqual(cues(world), ['placed']);
    } finally {
      world.teardown();
    }
  });

  it('reports a refusal when the hint bar is handed its reason', async () => {
    const world = await boot();
    try {
      const broke = cannedSnapshot();
      broke.nodules = 0;
      world.chart.applySnapshot(broke);
      world.frame(2);
      dispatchWindow('keydown', { code: 'KeyR' });
      world.frame(1);
      const stats = structureStatsFor(StructureKind.Refinery);
      const refusal = `${stats.name}: ${priceOf(stats).nodules} nodules short`;
      assert.ok(textSaying(world.app.stage, refusal) !== null, 'the premise: the bar says why');
      assert.deepEqual(cues(world), ['refused'], 'the refusal the bar names, and only it');
    } finally {
      world.teardown();
    }
  });
});

/**
 * The top strip's explanations (#724) — docs/ui-ux.md §2, §7.
 *
 * The strip is Pixi text and its explanation is DOM, so the renderer's half of
 * the arrangement is reporting *where each readout is and what it says*. Two
 * properties matter and neither is visible from the component's side: that the
 * value a screen reader will speak is the string the strip actually drew, and
 * that reporting it does not cost a frame.
 *
 * The second is a counted assertion in this file's sense — calls made over a
 * known number of frames, never a stopwatch. A hover surface that republished
 * every frame would re-render the React shell at 60 Hz, which is the one thing
 * `GameCanvas`'s own header says it must never do.
 */
describe('renderer smoke test: the strip explains itself', () => {
  it('reports every readout the strip drew, with the strip’s own text', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    booted.frame();

    const published = booted.log.calls.filter((call) => call.name === 'onReadouts');
    assert.ok(published.length > 0, 'the strip is reported at all');
    const boxes = published.at(-1)!.args[0] as ReadoutBox[];
    const keys = boxes.map((box) => box.key);

    // Every account the canned snapshot carries, plus the two instruments and
    // the three right-hand readouts. Crystal and biomass are here because the
    // fixture has some of each; they are the two the strip hides at zero.
    for (const key of [
      'sig',
      'band',
      'tracked',
      'nodules',
      'crystal',
      'biomass',
      'berths',
      'draw',
      'contacts',
    ]) {
      assert.ok(keys.includes(key as ReadoutBox['key']), `${key} is explained`);
    }

    // The name a screen reader speaks is the string on the glass, not a second
    // composition of the same numbers — so the two cannot drift apart.
    const nodules = boxes.find((box) => box.key === 'nodules')!;
    assert.equal(
      nodules.value,
      textSaying(booted.app.stage as unknown as Container, 'NODULES'),
      'the reported value is the Text the player is looking at'
    );
    assert.ok(nodules.width > 0 && nodules.height > 0, 'and it has a box to be hovered in');

    booted.teardown();
  });

  it('reports nothing further while the strip is unchanged', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    booted.frame();
    const settled = booted.log.calls.filter((call) => call.name === 'onReadouts').length;

    booted.frame(60);
    const after = booted.log.calls.filter((call) => call.name === 'onReadouts').length;
    // One second of frames at the rate the ticker runs, and not one republish:
    // the scratch is compared in place, so an unmoved strip costs no allocation
    // and no React render.
    assert.equal(after, settled, 'a strip that did not move is not reported again');

    booted.teardown();
  });

  it('never lays a control over a number that is not its own', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    // §11's ceiling, which is where the strip collides with itself. At 200% on
    // a 1280-wide viewport the first row overruns `map · T+ · n`: the rule that
    // drops those measures the *second* row's right edge, and the row that
    // collides is the stockpile row. That is the strip's own defect and this
    // change does not fix it — what is held here is that the explanation
    // surface refuses to point at the wreckage.
    const scale = 2;
    booted.chart.setUiScale(scale);
    booted.frame(3);

    const boxes = booted.log.calls.filter((call) => call.name === 'onReadouts').at(-1)!
      .args[0] as ReadoutBox[];
    assert.ok(boxes.length > 0, 'the strip is still explained at the scale ceiling');

    // Against the glyphs the renderer actually drew, and deliberately not
    // against the other published boxes. A readout refused a control — for
    // running off the canvas, say — is still *drawn*, so a later control can
    // sit on top of it, and a boxes-against-boxes test is green in exactly that
    // case. It was: `BERTHS 6/24` was refused for overrunning the edge by two
    // pixels and the contact count's control was laid straight over it.
    const glyphs = stripGlyphs(booted.app, scale);
    assert.ok(glyphs.length > boxes.length, 'the strip drew more than it explained');

    for (const box of boxes) {
      for (const glyph of glyphs) {
        // A readout's own number, and the SIG instrument's second line, which
        // §3 makes part of the same instrument rather than a readout of its own.
        if (glyph.text === box.value) continue;
        if (box.key === 'sig' && / unit/.test(glyph.text)) continue;
        const hits =
          box.x < glyph.x + glyph.width &&
          glyph.x < box.x + box.width &&
          box.y < glyph.y + glyph.height &&
          glyph.y < box.y + box.height;
        assert.ok(!hits, `the ${box.key} control covers "${glyph.text}", which is not its number`);
      }
    }

    booted.teardown();
  });

  it('refuses a control to a readout the draw meter’s bar prints through', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');

    // The blind spot #757 was filed for. `recordStrip` reads the `Text`
    // objects the strip laid out, so the draw meter's bar — `Graphics`, and
    // the last thing on the first row — was in no box at all, and a refusal
    // that compares readouts against readouts can refuse nothing for ink that
    // nothing recorded. The control was published over glyphs the bar prints
    // through, which is the surface wrong about a number rather than silent
    // about it: the one thing ui-ux.md §13 promises it will not be.
    //
    // 150%, because the scale this bites at is a fact about the fixture rather
    // than about the product — §13 records it at 200% on the 1,440 px canvas
    // the browser drive opens, and this strip is 1,280 px wide with a
    // twelve-segment `DRAW 40/34`. The premise is asserted below rather than
    // taken from either number.
    const scale = 1.5;
    booted.chart.setUiScale(scale);
    booted.frame(3);

    const bar = drawSegments(booted.app, scale);
    assert.ok(bar.length > 0, 'the draw meter drew its bar');
    // The rects are the bar and not some other ink of the same size: they are
    // a run that starts just right of the `DRAW` label, checked before
    // anything is concluded from them.
    const label = firstRowGlyphs(booted.app, scale).find((glyph) => glyph.text.startsWith('DRAW'))!;
    assert.ok(label !== undefined, 'the DRAW label is on the strip');
    assert.ok(
      bar[0]!.x > label.x + label.width && bar[0]!.x - (label.x + label.width) < 10 * scale,
      'the bar starts just right of the DRAW label'
    );

    const count = firstRowGlyphs(booted.app, scale).find((glyph) =>
      / contacts?$/.test(glyph.text)
    )!;
    assert.ok(count !== undefined, 'the contact count is on the strip');
    // The premise, asserted rather than assumed. Without it every assertion
    // below is green on a strip where nothing collides at all — which is how
    // this defect survived the sweep that found the rest of them.
    assert.ok(
      bar.some((seg) => seg.x < count.x + count.width && count.x < seg.x + seg.width),
      `the draw meter’s bar clears the contact count at ${scale * 100}%`
    );

    const collided = booted.log.calls.filter((call) => call.name === 'onReadouts').at(-1)!
      .args[0] as ReadoutBox[];
    // Both of them, and that is the existing rule rather than a new one: the
    // bar is the draw meter's own half of one instrument, so a strip that has
    // laid the two over each other has no control to offer for either. On
    // `main` the count kept one — box x 1154 w 117 over a bar ending at 1203.
    assert.ok(
      !collided.some((box) => box.key === 'contacts'),
      'the contact count is refused a control where the bar prints through it'
    );
    assert.ok(
      !collided.some((box) => box.key === 'draw'),
      'and so is the instrument printing through it'
    );
    assert.ok(collided.length > 0, 'while the rest of the strip is still explained');

    // The positive control, twice over. At 135% the bar clears the count, and
    // §13's sweep says every readout on the strip is explained there — so a
    // fix that went quiet earlier than it had to would fail here rather than
    // read as caution.
    booted.chart.setUiScale(1.35);
    booted.frame(3);
    const clear = drawSegments(booted.app, 1.35);
    const clearCount = firstRowGlyphs(booted.app, 1.35).find((glyph) =>
      / contacts?$/.test(glyph.text)
    )!;
    assert.ok(
      !clear.some(
        (seg) => seg.x < clearCount.x + clearCount.width && clearCount.x < seg.x + seg.width
      ),
      'the bar is clear of the contact count at 135%'
    );
    const quiet = booted.log.calls.filter((call) => call.name === 'onReadouts').at(-1)!
      .args[0] as ReadoutBox[];
    for (const key of ['draw', 'contacts']) {
      assert.ok(
        quiet.some((box) => box.key === key),
        `${key} keeps its control at 135%`
      );
    }

    // And the other half of the fix, at a scale with room to see it: the draw
    // meter's control covers its bar rather than stopping at the label,
    // because economy.md §2's rate and the segments that say how much of it is
    // covered are one instrument — the rule §3's meter and its two lines are
    // already under.
    booted.chart.setUiScale(1);
    booted.frame(3);
    const plain = booted.log.calls.filter((call) => call.name === 'onReadouts').at(-1)!
      .args[0] as ReadoutBox[];
    const draw = plain.find((box) => box.key === 'draw')!;
    assert.ok(draw !== undefined, 'the draw meter keeps its control');
    const barEnd = drawSegments(booted.app, 1).at(-1)!;
    assert.ok(
      draw.x + draw.width >= barEnd.x + barEnd.width,
      'and its control covers the bar, not just the label'
    );

    booted.teardown();
  });

  it('quotes the same loud count as the label the line sits under', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    booted.frame();
    const boxes = booted.log.calls.filter((call) => call.name === 'onReadouts').at(-1)!
      .args[0] as ReadoutBox[];

    // `drawSigMeter` counts the hulls over SIG_BANDS.LOUD for §3's second line,
    // and the explanation quotes that count rather than filtering the set a
    // second time. The two sit one above the other on screen, so a second
    // filter is the "written twice" rule broken where it would be hardest to
    // notice — and nothing catches it unless the two are compared.
    const second = textSaying(booted.app.stage as unknown as Container, ' loud');
    assert.ok(second !== null, '§3’s second line is on the strip');
    const [, drawnLoud] = /(\d+) loud/.exec(second)!;
    const [, drawnUnits] = /(\d+) unit/.exec(second)!;
    const detail = boxes.find((box) => box.key === 'sig')!.detail;
    assert.match(
      detail,
      new RegExp(`\\b${drawnLoud} of ${drawnUnits} over `),
      `the line says "${detail}" while the label above it says "${second}"`
    );

    booted.teardown();
  });

  it('drops the economy a mission with nothing to build cannot move (#1586)', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    const keys = (): string[] =>
      (
        booted.log.calls.filter((call) => call.name === 'onReadouts').at(-1)!
          .args[0] as ReadoutBox[]
      ).map((box) => box.key);

    // Sorrowgate as the newcomer's walk met it: construction locked, no field
    // anywhere, six hulls against no grant and no draw either way. docs/ui-ux.md
    // §2 drops all three; the red `BERTHS 6/0` read as an error.
    booted.chart.setMissionLocks([
      { ability: 'construction', reason: "the court's water is not yours to build in" },
    ]);
    booted.chart.setNodes([]);
    const prologue = {
      ...cannedSnapshot(),
      nodules: 0,
      crystal: 0,
      biomass: 0,
      berths: { used: 6, granted: 0 },
      draw: { capacity: 0, demand: 0, satisfaction: 1 },
    };
    booted.chart.applySnapshot(prologue);
    booted.frame(2);
    for (const key of ['nodules', 'berths', 'draw']) {
      assert.ok(!keys().includes(key), `${key} stands on a strip with no economy`);
    }
    const stage = booted.app.stage as unknown as Container;
    for (const word of ['NODULES', 'BERTHS', 'DRAW']) {
      assert.equal(textSaying(stage, word), null, `${word} is still drawn`);
    }
    assert.ok(keys().includes('sig'), 'the permanent element stays');

    // Each comes back on its own cue under the same lock — a seen field (Shift
    // Change's quota is in Nodules), a grant, any draw made or asked for.
    booted.chart.setNodes(cannedNodes());
    booted.chart.applySnapshot({
      ...prologue,
      berths: { used: 2, granted: 6 },
      draw: { capacity: 4, demand: 0, satisfaction: 1 },
    });
    booted.frame(2);
    for (const key of ['nodules', 'berths', 'draw']) {
      assert.ok(keys().includes(key), `${key} stays dropped once it has something to say`);
    }

    // And with no lock the strip is the skirmish's, zeros and all.
    booted.chart.setMissionLocks([]);
    booted.chart.setNodes([]);
    booted.chart.applySnapshot(prologue);
    booted.frame(2);
    for (const key of ['nodules', 'berths', 'draw']) {
      assert.ok(keys().includes(key), `${key} is dropped from a strip with an economy`);
    }

    booted.teardown();
  });

  it('holds the economy back until a mission room’s first view lands (#1693)', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    const stage = booted.app.stage as unknown as Container;
    const shown = (): string[] => textContents(stage).map((line) => line.trim());

    // A resumed Sorrowgate: the room's own state lands, the mission's view has
    // not, so nobody has said yet whether there is an economy. For 2.1 s that
    // read `NODULES 0 BERTHS 0/0 DRAW 0/0` and three build tabs over empty
    // water, then the court's lock arrived and took them all away.
    booted.chart.awaitMissionView();
    booted.chart.setNodes([]);
    booted.chart.applySnapshot({
      ...cannedSnapshot(),
      nodules: 0,
      crystal: 0,
      biomass: 0,
      berths: { used: 0, granted: 0 },
      draw: { capacity: 0, demand: 0, satisfaction: 1 },
    });
    booted.frame(2);
    for (const word of ['NODULES', 'BERTHS', 'DRAW']) {
      assert.equal(textSaying(stage, word), null, `${word} is drawn before the view says`);
    }
    for (const tab of ['BUILD', 'FOUNDRY', 'SLIPWAY']) {
      assert.ok(!shown().includes(tab), `${tab} is on the tab strip before the view says`);
    }
    // The hint bar names no build key it would not honour (§7), pending or locked.
    const hinted = (): boolean => shown().some((line) => line.includes(' build  ·  '));
    assert.ok(!hinted(), 'the hint bar offers build keys before the view says');

    // A view that leaves construction open hands the strip and the tabs back:
    // unknown was the only bar.
    booted.chart.setMissionLocks([]);
    booted.frame(2);
    for (const word of ['NODULES', 'BERTHS', 'DRAW']) {
      assert.notEqual(textSaying(stage, word), null, `${word} stays hidden once the view says`);
    }
    for (const tab of ['BUILD', 'FOUNDRY', 'SLIPWAY']) {
      assert.ok(shown().includes(tab), `${tab} stays off the strip once the view says`);
    }
    assert.ok(hinted(), 'the hint bar keeps the build keys back once the view says');

    booted.teardown();
  });

  it('draws no clock and no unit count before the first snapshot (#1697)', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    const stage = booted.app.stage as unknown as Container;
    const clock = (): string | null => textSaying(stage, 'T+');
    const count = (): string | null => textSaying(stage, ' loud');

    // The positive control: the boot's snapshot is in, so both are drawn.
    booted.frame(2);
    assert.notEqual(clock(), null, 'the clock is missing with a snapshot in hand');
    assert.notEqual(count(), null, 'the unit count is missing with a snapshot in hand');

    // Back to a room that has heard nothing, as a rematch or a fresh join is.
    // `lastTick` reads 0 and `units` is empty, so the two would say `T+00:00`
    // and `0 units · 0 loud`: a resumed mission at 10:44 read both for 2 s.
    booted.chart.resetForNewMatch();
    booted.frame(2);
    assert.equal(clock(), null, `the clock reads ${clock()} before any snapshot`);
    assert.equal(count(), null, `the strip reads ${count()} before any snapshot`);

    // The first snapshot hands both back, at the time it says.
    booted.chart.applySnapshot({ ...cannedSnapshot(), tick: 644 * SIM.TICK_HZ });
    booted.frame(2);
    assert.notEqual(count(), null, 'the unit count stays hidden after a snapshot');
    assert.ok(clock()?.includes('T+10:44'), `the clock reads ${clock()}, not T+10:44`);

    booted.teardown();
  });

  it('says the meter counts every hull while an order is in force (#1586)', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    booted.frame();
    const stage = booted.app.stage as unknown as Container;
    const sigBox = (): ReadoutBox =>
      (
        booted.log.calls.filter((call) => call.name === 'onReadouts').at(-1)!
          .args[0] as ReadoutBox[]
      ).find((box) => box.key === 'sig')!;

    assert.doesNotMatch(textSaying(stage, ' loud')!, /^all /, 'no order, no second reading');
    assert.doesNotMatch(sigBox().detail, /orders panel/);

    // The orders panel's header reads `flight SIG 006 / 020` off this; the
    // meter goes on reading the peak over all six, tenders included (§3).
    booted.chart.applySnapshot({
      ...cannedSnapshot(),
      boundSig: { peak: 6, ceiling: 20, setName: 'flight' },
    });
    booted.frame(2);
    const second = textSaying(stage, ' loud')!;
    assert.match(second, /^all \d+ units · \d+ loud$/, `§3's second line reads "${second}"`);
    assert.match(sigBox().detail, /the orders panel's figure reads only the flight$/);

    booted.teardown();
  });

  it('gives each readout a control taller than its glyphs, for a touch player', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    booted.frame();
    const boxes = booted.log.calls.filter((call) => call.name === 'onReadouts').at(-1)!
      .args[0] as ReadoutBox[];

    // §2 sets the console's height by §11's 44 px target floor — "a console row
    // is a pointer target" — and the strip's drawn glyphs are 11-13 px tall. The
    // strip holds two rows in 52 px, so 44 apiece cannot be had without the
    // rows overlapping; half the floor is what is reachable, and it is what is
    // asserted. The bar is in CSS pixels, which is what a pointer target is measured in.
    for (const box of boxes) {
      assert.ok(box.height >= 26, `${box.key} is ${box.height} px tall — not a pointer target`);
    }

    booted.teardown();
  });

  it('keeps the permanent element at every scale, and every box on the canvas', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    const latest = () =>
      booted.log.calls.filter((call) => call.name === 'onReadouts').at(-1)!.args[0] as ReadoutBox[];

    // §11's range, ends and middle. §3 makes the SIG meter the one permanent
    // element, so it is the readout that may never lose its control — and it
    // is the one most likely to, being the only readout taller than a line of
    // text. Its box runs a pixel or two past the strip's own bevel, so a bound
    // taken on TOP_BAR_HEIGHT rather than on the canvas drops it.
    //
    // This is the half of that a headless runner can hold. The half it cannot
    // is the trigger: the box clears 52 px here and does not in Chromium,
    // because the fonts are not the same ones. A browser drive is what found
    // it (docs/screenshots/issue-724), and nothing in this file would have.
    for (const scale of [0.75, 1, 2]) {
      booted.chart.setUiScale(scale);
      booted.frame(2);
      const boxes = latest();
      assert.ok(
        boxes.some((box) => box.key === 'sig'),
        `the permanent element has no control at ${scale * 100}%`
      );
      for (const box of boxes) {
        assert.ok(box.x >= 0 && box.y >= 0, `${box.key} starts off the canvas at ${scale * 100}%`);
        assert.ok(
          box.x + box.width <= 1280 && box.y + box.height <= 720,
          `${box.key} runs off the canvas at ${scale * 100}% — a tab stop nobody can see`
        );
      }
    }

    booted.teardown();
  });

  it('republishes when §3’s second line moves under a held peak', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    booted.frame();

    const sigDetail = (): string =>
      (
        booted.log.calls.filter((call) => call.name === 'onReadouts').at(-1)!
          .args[0] as ReadoutBox[]
      ).find((box) => box.key === 'sig')!.detail;
    const secondLine = (): string =>
      textSaying(booted.app.stage as unknown as Container, ' loud') ?? '';
    const before = secondLine();

    // One more hull, quieter than the loudest: `n units · m loud` moves and the
    // rounded peak does not. The instrument is drawn as two lines and its box
    // is named by the first, so watching only that string calls this frame
    // unchanged — and the explanation underneath goes on quoting the old count,
    // indefinitely. Two ordinary ways in: a hull launched while the loudest
    // holds, and a hull crossing 60 under a louder one.
    const snapshot = cannedSnapshot();
    booted.chart.applySnapshot({
      ...snapshot,
      units: [...snapshot.units, { ...snapshot.units[1]!, id: 99, sig: 3 }],
    });
    booted.frame(2);

    assert.notEqual(secondLine(), before, 'the strip’s own second line moved');
    const [, loud] = /(\d+) loud/.exec(secondLine())!;
    const [, units] = /(\d+) unit/.exec(secondLine())!;
    assert.match(
      sigDetail(),
      new RegExp(`\\b${loud} of ${units} over `),
      `the line says "${sigDetail()}" while the label above it says "${secondLine()}"`
    );

    booted.teardown();
  });

  it('drops the clock on the row it is on, not the row below it', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');

    // 135%, inside §11's range, and the scale #724 measured the strip starting
    // to go quiet at. The rows disagree here and that disagreement is the bug:
    // the stockpile row is full while the second row — the band label and
    // `TRACKED ×2` — ends hundreds of pixels left of where the clock would
    // sit. The drop rule used to measure that second row, so it concluded
    // there was room on the strength of a row the clock cannot collide with.
    booted.chart.setUiScale(1.35);
    booted.frame(3);
    const full = firstRowGlyphs(booted.app, 1.35).map((glyph) => glyph.text);
    assert.ok(
      !full.some((text) => text.startsWith('T+')),
      `the clock was printed onto a full first row: ${full.join(' | ')}`
    );
    // The authored yield order, which this change does not touch. It lives in
    // `EchoRenderer.drawHud`'s own comment rather than in §2, which states a
    // drop order for the console's *blocks* and none for the strip: the map
    // name is the first thing to give way and is gone before the clock is.
    assert.ok(
      !full.includes('SMOKE BASIN'),
      `the map name was printed onto a full first row: ${full.join(' | ')}`
    );

    // The same scale and the same second row, with a first row that fits:
    // `DRAW 4/3` is a shorter label and three segments rather than twelve.
    // Nothing the old rule measured has moved, so a rule reading the second
    // row cannot tell these two frames apart — and the clock coming back is
    // what says the first row is what decides.
    booted.chart.applySnapshot({
      ...cannedSnapshot(),
      draw: { capacity: 4, demand: 3, satisfaction: 1 },
    });
    booted.frame(3);
    const light = firstRowGlyphs(booted.app, 1.35).map((glyph) => glyph.text);
    assert.ok(
      light.some((text) => text.startsWith('T+')),
      `the clock stayed dropped on a row with room for it: ${light.join(' | ')}`
    );
    // The map name does *not* come back here, and that is the yield order
    // rather than a second fault: it is the first to go and the last to
    // return, and this row has found room for one of the two.

    booted.teardown();
  });

  it('stops measuring the clock while the strip has dropped it (#857)', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    // Counted at the call a label's size costs: `Text.updateBounds` asks
    // `CanvasTextMetrics.measureText` once for every changed string, and the
    // clock is the only label on the canvas whose text starts `T+`.
    const measure = mock.method(CanvasTextMetrics, 'measureText');
    const clockMeasures = (): number =>
      measure.mock.calls.filter((call) => String(call.arguments[0]).startsWith('T+')).length;
    const at = (second: number, snapshot = cannedSnapshot(second * SIM.TICK_HZ)): void => {
      booted.chart.applySnapshot(snapshot);
      booted.frame();
    };

    try {
      // The control, at 100% where the row has room: a drawn clock is measured
      // as it moves, so a probe that counts nothing cannot pass the rest.
      booted.frame(3);
      let before = clockMeasures();
      for (let second = 10; second < 20; second++) at(second);
      assert.ok(clockMeasures() - before >= 10, 'a drawn clock moved ten times unmeasured');
      assert.equal(textSaying(booted.app.stage, 'T+'), 'T+00:19', 'the drawn clock stopped');

      // Dropped, as the test above drops it: 135% on a full first row. A
      // minute of match time on, nothing has been measured for it.
      booted.chart.setUiScale(1.35);
      booted.frame(3);
      assert.equal(textSaying(booted.app.stage, 'T+'), null, 'the clock was not dropped');
      before = clockMeasures();
      for (let second = 20; second < 80; second++) at(second);
      assert.equal(clockMeasures() - before, 0, 'a clock nothing draws went on measuring itself');

      // Its width is its length's, so a stamp that grows a digit is the one
      // change a dropped clock still pays for — once, and not every second.
      before = clockMeasures();
      for (let second = 5995; second < 6005; second++) at(second);
      assert.equal(clockMeasures() - before, 1, 'a hundredth minute was not measured once');

      // And back, when the row it is on has room again: it returns saying the
      // current second rather than the last one it was stamped with — on the
      // frame it returns, since the frame after would re-stamp it regardless.
      const light = { capacity: 4, demand: 3, satisfaction: 1 };
      at(6010, { ...cannedSnapshot(6010 * SIM.TICK_HZ), draw: light });
      assert.equal(
        textSaying(booted.app.stage, 'T+'),
        'T+100:10',
        'the clock came back with a stale stamp'
      );
    } finally {
      measure.mock.restore();
      booted.teardown();
    }
  });

  it('never prints the two droppable readouts over another number, across §11’s range', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');

    // §11's ends and middle, plus the two scales §13 records the strip going
    // quiet at. The property is the one the authored yield order promises
    // (`EchoRenderer.drawHud`, not §2): the map name and the clock give way
    // rather than being printed over the stockpile row. Every glyph here is on
    // one row by construction, so an overlap in x is a collision and the y
    // test would be noise.
    //
    // What this pass can see is glyph against glyph. The draw meter's segments
    // are Graphics rather than Text and are not in the walk, so the 135% case
    // — where the map name lands on the segments rather than on `DRAW` itself
    // — is not the one that fails here. 150% is, where it lands on the label.
    for (const scale of [0.75, 1, 1.35, 1.5, 2]) {
      booted.chart.setUiScale(scale);
      booted.frame(3);
      const row = firstRowGlyphs(booted.app, scale);
      const droppable = row.filter(
        (glyph) => glyph.text.startsWith('T+') || glyph.text === 'SMOKE BASIN'
      );
      for (const one of droppable) {
        for (const other of row) {
          if (other === one) continue;
          assert.ok(
            !(one.x < other.x + other.width && other.x < one.x + one.width),
            `at ${scale * 100}% "${one.text}" is printed over "${other.text}"`
          );
        }
      }
    }

    booted.teardown();
  });

  it('reports once more when a number actually moves', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    booted.frame(10);
    const before = booted.log.calls.filter((call) => call.name === 'onReadouts').length;

    booted.chart.applySnapshot({ ...cannedSnapshot(), nodules: 1751 });
    booted.frame(10);
    const published = booted.log.calls.filter((call) => call.name === 'onReadouts');
    assert.equal(published.length, before + 1, 'exactly one republish for one change');
    const boxes = published.at(-1)!.args[0] as ReadoutBox[];
    assert.match(
      boxes.find((box) => box.key === 'nodules')!.value,
      /1751/,
      'and it carries the new figure'
    );

    booted.teardown();
  });
});

describe('a control group keeps its hulls through a hold (#1337)', () => {
  it('keeps a hull aboard a transport in its group, and has it in hand when it lands', async () => {
    // docs/ui-ux.md §9. The recall pruned every member missing from the map's
    // hulls as dead, and a hull aboard is not on the map: a group recalled
    // while its hulls were aboard was deleted, and gone when they landed.
    const world = await boot();
    try {
      type Chart = { selected: Set<number>; controlGroups: Map<number, number[]> };
      const chart = world.chart as unknown as Chart;
      const conn = world.conn as unknown as { target: { x: number; z: number } };
      const units = cannedSnapshot().units;
      const army = units.filter((unit) => unit.throttle === undefined).map((unit) => unit.id);
      const carrier = units.find((unit) => unit.throttle !== undefined)!;
      assert.ok(army.length > 0 && carrier !== undefined, 'the premise: hulls and a carrier');
      world.frame(2);
      dispatchWindow('keydown', { code: 'Digit0' });
      dispatchWindow('keydown', { code: 'Digit1', ctrlKey: true });

      // Aboard: the carrier holds them, and each hull is reported at its
      // carrier, as the server reports it.
      world.chart.applySnapshot({
        ...cannedSnapshot(1012),
        units: units.map((unit) =>
          unit.id === carrier.id
            ? { ...unit, hold: { berths: 6, used: army.length } }
            : army.includes(unit.id)
              ? { ...unit, aboard: carrier.id, x: carrier.x, y: carrier.y, depth: carrier.depth }
              : unit
        ),
      });
      dispatchWindow('keydown', { code: 'Digit1' });
      assert.deepEqual(
        [...(chart.controlGroups.get(1) ?? [])].sort(),
        [...army].sort(),
        'the group lost the hulls in the hold'
      );
      // Recalled twice, a group wholly aboard centres on its carrier.
      world.chart.focusOn(carrier.x + 1500, carrier.y + 1500);
      dispatchWindow('keydown', { code: 'Digit1' });
      dispatchWindow('keydown', { code: 'Digit1' });
      assert.deepEqual(
        { x: conn.target.x, y: conn.target.z },
        { x: carrier.x, y: carrier.y },
        'recalled twice, the group centred nowhere'
      );

      // Landed, and recalled again over another selection: the carrier alone.
      world.chart.applySnapshot(cannedSnapshot(1024));
      world.chart.focusOn(carrier.x, carrier.y);
      world.frame(2);
      const at = world.conn.projectPoint(carrier.x, carrier.y, carrier.depth);
      for (const type of ['pointerdown', 'pointerup']) {
        world.app.canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x,
          clientY: at.y,
        });
      }
      world.frame(1);
      assert.deepEqual([...chart.selected], [carrier.id], 'the premise: another selection');
      dispatchWindow('keydown', { code: 'Digit1' });
      assert.deepEqual([...chart.selected].sort(), [...army].sort(), 'the group came back short');
    } finally {
      world.teardown();
    }
  });
});

/**
 * The console's drop order — docs/ui-ux.md §2 (#957).
 *
 * A block is dropped rather than squeezed, and §2 names the order: the fleet
 * block first, then production, then selection, while the scope and the
 * command card never go. Held as two properties over a sweep of widths rather
 * than as the thresholds, which are arithmetic on `BLOCK_W` and would only
 * restate it: a block is on the glass only while every block §2 drops after it
 * is too, and widening the window never takes a block away. The layout this
 * replaced broke both — selection went before production, and the fleet came
 * back once selection had gone.
 */
describe('the console drops its blocks in §2’s order', () => {
  /** §2's order, first to go first. */
  const DROP_ORDER = ['FLEET', 'PRODUCTION', 'SELECTION'] as const;
  const TITLES = new Set<string>(['SCOPE', 'COMMANDS', ...DROP_ORDER]);

  it('drops the fleet, then production, then selection, and never scope or commands', async () => {
    const world = await boot();
    try {
      const states = new Set<string>();
      let narrower: Set<string> | undefined;
      // 640 is a 1280 px window at §11's 200%; 1700 clears every block.
      for (let width = 640; width <= 1700; width += 2) {
        world.app.resize(width, 720);
        world.frame(1);
        const shown = new Set(textContents(world.app.stage).filter((line) => TITLES.has(line)));

        for (const kept of ['SCOPE', 'COMMANDS']) {
          assert.ok(shown.has(kept), `at ${width} px the console dropped ${kept}`);
        }
        DROP_ORDER.forEach((title, at) => {
          if (!shown.has(title)) return;
          for (const later of DROP_ORDER.slice(at + 1)) {
            assert.ok(
              shown.has(later),
              `at ${width} px ${title} is on the glass and ${later} is not`
            );
          }
        });
        for (const title of narrower ?? []) {
          assert.ok(shown.has(title), `widening to ${width} px took ${title} away`);
        }
        narrower = shown;
        states.add(DROP_ORDER.filter((title) => shown.has(title)).join(' '));
      }

      // Every state the order allows turned up, so neither check above passed
      // on a sweep that never dropped anything.
      assert.deepEqual(
        [...states].sort(),
        ['', 'FLEET PRODUCTION SELECTION', 'PRODUCTION SELECTION', 'SELECTION'],
        'the sweep did not pass through every step of the drop order'
      );
    } finally {
      world.teardown();
    }
  });
});

function selectHull(
  world: Booted,
  unit: { x: number; y: number; depth: number },
  add = false
): void {
  world.chart.focusOn(unit.x, unit.y);
  world.frame(2);
  const at = world.conn.projectPoint(unit.x, unit.y, unit.depth);
  assert.ok(at.visible, 'the camera is looking at the hull we are about to select');
  for (const type of ['pointerdown', 'pointerup']) {
    world.app.canvas.dispatch(type, {
      button: 0,
      pointerId: 1,
      pointerType: 'mouse',
      clientX: at.x,
      clientY: at.y,
      shiftKey: add,
    });
  }
  world.frame(1);
}

describe('independent unit depth (#1694)', () => {
  it('explains a depth limit and respects a mission movement hold', async () => {
    const world = await boot();
    try {
      const snapshot = cannedSnapshot();
      const hull = snapshot.units[0]!;
      hull.depthOrder = DEPTH.MIN_M;
      world.chart.applySnapshot(snapshot);
      world.conn.applySnapshot(snapshot);
      world.frame(1);
      selectHull(world, hull);
      dispatchWindow('keydown', { code: 'KeyS' });
      world.frame(1);
      assert.equal(world.log.first('onDepthOffset'), undefined);
      assert.ok(textSaying(world.app.stage, 'already at the surface target') !== null);
      world.chart.setMissionHolds([{ unitId: hull.id, reason: MovementHoldReason.Unreleased }]);
      dispatchWindow('keydown', { code: 'KeyD' });
      assert.equal(world.log.first('onDepthOffset'), undefined);
      world.chart.setMissionHolds([]);
      dispatchWindow('keydown', { code: 'KeyD' });
      assert.deepEqual(world.log.first('onDepthOffset'), [[hull.id], DEPTH.CONTROL_STEP_M]);
    } finally {
      world.teardown();
    }
  });

  it('routes rise and dive without a move or camera change, including a rebind', async () => {
    const world = await boot();
    try {
      world.frame(2);
      dispatchWindow('keydown', { code: 'Digit0' });
      const focus = world.conn.focusDepth();
      dispatchWindow('keydown', { code: 'KeyS' });
      dispatchWindow('keydown', { code: 'KeyD' });
      const ids = world.log.first('onDepthOffset')?.[0];
      assert.ok(Array.isArray(ids) && ids.length > 0, 'rise commands the selected fleet');
      assert.deepEqual(
        world.log.calls.filter((call) => call.name === 'onDepthOffset').map((call) => call.args[1]),
        [-DEPTH.CONTROL_STEP_M, DEPTH.CONTROL_STEP_M]
      );
      assert.equal(world.log.first('onMoveOrder'), undefined);
      assert.equal(world.conn.focusDepth(), focus);
      world.chart.setBindings({ ...ONE_HANDED_BINDINGS, rise: 'KeyK' });
      dispatchWindow('keydown', { code: 'KeyK' });
      dispatchWindow('keydown', { code: 'KeyK', repeat: true });
      assert.equal(world.log.calls.filter((call) => call.name === 'onDepthOffset').length, 3);
      world.frame(1);
      assert.ok(textSaying(world.app.stage, 'RISE') !== null);
      assert.ok(textSaying(world.app.stage, 'DIVE') !== null);
    } finally {
      world.teardown();
    }
  });
});

describe('the hint bar names the keys the player has (#1340)', () => {
  it('names the bound keys, not the defaults, after a layout change', async () => {
    // docs/ui-ux.md §9: "Every key in that table is a default, not a fact."
    // The bar named the defaults whatever the bindings, and on the one-handed
    // layout told the player `X stop` where `X` lays a mine.
    const world = await boot();
    try {
      world.frame(2);
      dispatchWindow('keydown', { code: 'Digit0' });
      world.frame(1);
      assert.ok(textSaying(world.app.stage, 'X stop') !== null, 'the premise: the defaults');

      world.chart.setBindings(ONE_HANDED_BINDINGS);
      world.frame(1);
      const army = '`' + ' stop  ·  TAB hold  ·  CTRL+RMB torpedo  ·  SPACE silent  ·  Q ping';
      assert.ok(textSaying(world.app.stage, army) !== null, 'the army line named the defaults');
      assert.equal(textSaying(world.app.stage, 'X stop'), null, 'and still offered X as stop');
      // The one-handed layout leaves `W` and `Space` where they are, so those
      // two names are read off a rebind of their own.
      world.chart.setBindings({
        ...ONE_HANDED_BINDINGS,
        attackMove: 'KeyK',
        silentRunning: 'KeyL',
      });
      world.frame(1);
      assert.ok(textSaying(world.app.stage, 'K attack-move') !== null, 'attack-move named W');
      assert.ok(textSaying(world.app.stage, 'L silent') !== null, 'silent named SPACE');
      assert.equal(textSaying(world.app.stage, 'W attack-move'), null, 'and still offered W');

      // A harvester's line names its throttle key too.
      const harvester = cannedSnapshot().units.find((unit) => unit.throttle !== undefined)!;
      world.chart.focusOn(harvester.x, harvester.y);
      world.frame(2);
      const at = world.conn.projectPoint(harvester.x, harvester.y, harvester.depth);
      for (const type of ['pointerdown', 'pointerup']) {
        world.app.canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x,
          clientY: at.y,
        });
      }
      world.frame(1);
      assert.ok(textSaying(world.app.stage, 'E throttle') !== null, 'the throttle named V');
    } finally {
      world.teardown();
    }
  });
});

/**
 * #1589 — a cell reads `REF 300`, and a newcomer had nothing saying what it
 * builds or what a `c` suffix is. docs/ui-ux.md §9: with the pointer on a
 * priced cell, the hint line reads the whole name and the price in words.
 */
describe('a priced cell names what it makes under the pointer (#1589)', () => {
  it('puts the name and the price in words on the hint line, and only while hovered', async () => {
    const world = await boot();
    try {
      world.frame(2);
      const stats = structureStatsFor(StructureKind.Refinery);
      const price = priceOf(stats);
      const line = `${stats.name} — ${priceWords(price)}`;
      assert.equal(textSaying(world.app.stage, line), null, 'the premise: not said unhovered');

      const cell = barLabel(world.app, `REF ${priceTag(price)}`);
      const move = (clientX: number, clientY: number): void =>
        world.app.canvas.dispatch('pointermove', {
          pointerId: 1,
          pointerType: 'mouse',
          clientX,
          clientY,
        });
      move(cell.x, cell.y);
      world.frame(1);
      assert.ok(textSaying(world.app.stage, line) !== null, `the bar never said "${line}"`);

      // Off the card, into the water: the line is the steady one again.
      move(cell.x, 200);
      world.frame(1);
      assert.equal(textSaying(world.app.stage, line), null, 'the line outlived the hover');
    } finally {
      world.teardown();
    }
  });

  it('gives a refusal the line first, with the pointer still on the cell', async () => {
    const world = await boot();
    try {
      // Nothing banked, so every priced cell is greyed and a press is refused.
      const broke = cannedSnapshot();
      broke.nodules = 0;
      world.chart.applySnapshot(broke);
      world.frame(2);
      const stats = structureStatsFor(StructureKind.Refinery);
      const price = priceOf(stats);
      const line = `${stats.name} — ${priceWords(price)}`;
      const cell = barLabel(world.app, `REF ${priceTag(price)}`);
      assert.ok(barGrey(world.app, `REF ${priceTag(price)}`), 'the premise: the cell is greyed');
      const at = { pointerId: 1, pointerType: 'mouse', clientX: cell.x, clientY: cell.y };
      world.app.canvas.dispatch('pointermove', at);
      world.frame(1);
      assert.ok(textSaying(world.app.stage, line) !== null, 'the control: hovered, it is named');

      world.app.canvas.dispatch('pointerdown', { ...at, button: 0 });
      world.frame(1);
      // §7's wording for a price, built by `shortfallLine`.
      const refusal = `${stats.name}: ${price.nodules} nodules short`;
      assert.ok(textSaying(world.app.stage, refusal) !== null, `no "${refusal}" on the bar`);
      assert.equal(textSaying(world.app.stage, line), null, 'the hover line covered the refusal');
    } finally {
      world.teardown();
    }
  });
});

/**
 * #815 — the card is offered more than its twelve cells hold, and what went
 * used to be whatever `buildBarModel` pushed last. For any hull carrying
 * torpedoes — ten of them, the Corvette and the Cruiser among them — that was
 * the depth charge, and the card is the mouse's route to every order
 * (docs/ui-ux.md §2).
 *
 * The two halves of the fix are asserted together because either alone leaves
 * the Corvette one cell over: the torpedo count is a readout and leaves the
 * order grid, and what remains yields in the order §9 writes down.
 */
describe('the command card when it is offered more than it holds', () => {
  /** Click a hull on the conn view, the way the attack-move tests do. */
  it('keeps every order a torpedo hull can give, and moves the count to the stat line', async () => {
    const world = await boot();
    try {
      const corvette = cannedSnapshot().units.find((unit) => unit.torpedoes !== undefined);
      assert.ok(corvette !== undefined, 'the canned match has no hull carrying torpedoes');
      selectHull(world, corvette);

      const lines = textContents(world.app.stage);
      // Eleven orders and the deselect fill the squad page. CHARGE is the
      // order #815 lost; direct rise and dive use the two spare cells.
      for (const label of [
        'SILENT',
        'DRIVE OFF',
        'PING',
        'RISE',
        'DIVE',
        'ENGAGE',
        'STOP',
        'HOLD',
        'DECOY',
        'MINE',
        'CHARGE',
        '✕',
      ]) {
        assert.ok(
          lines.some((line) => line.includes(label)),
          `${label} is not on the card — the yield order dropped an order`
        );
      }

      // The count is still readable, on the block that already carries this
      // hull's numbers rather than on one of twelve order cells.
      assert.ok(
        lines.some((line) => /HULL .*SIG .*TORP 2/.test(line)),
        'the torpedo count is not on the selection block’s stat line'
      );
      assert.ok(
        !lines.some((line) => line.trim().startsWith('TORP ')),
        'TORP is still holding a command cell'
      );
    } finally {
      world.teardown();
    }
  });

  /**
   * #1260. CHARGE drops into the band below the hull's own depth — the test
   * `Match.orderDepthCharge` makes — not one rung down from where the hull is
   * headed. A Mid-Water hull's charge went to the duct's 1,200 m, inside its
   * own band, and the server refused it; mid-dive, the rung came off the
   * ordered depth.
   */
  it('sets a charge to the station of the band under the hull, wherever it is headed', async () => {
    const world = await boot();
    try {
      const snapshot = cannedSnapshot();
      const corvette = snapshot.units.find((unit) => unit.torpedoes !== undefined)!;
      // Refitted to PR-3, so the rating carries every charge below and this
      // test asks only where the charge is set; #1268's case is the next one.
      corvette.pressureRating = 3;
      const charge = (depth: number, depthOrder?: number): unknown => {
        corvette.depth = depth;
        corvette.depthOrder = depthOrder;
        world.chart.applySnapshot(snapshot);
        world.conn.applySnapshot(snapshot);
        world.frame(1);
        selectHull(world, corvette);
        world.log.calls.length = 0;
        dispatchWindow('keydown', { code: 'KeyC' });
        dispatchWindow('keyup', { code: 'KeyC' });
        return world.log.first('onDepthCharge')?.[1];
      };
      assert.equal(charge(900), 2400, "a Mid-Water hull's charge is set to 2,400 m, not the duct");
      assert.equal(charge(300), 1000, "a Shelf hull's charge is set to Mid-Water's 1,000 m");
      assert.equal(charge(900, 2400), 2400, 'mid-dive, from the band the hull is in');
      assert.equal(charge(2400), undefined, 'and from the Abyssal there is no band below');

      // The button greys on the same test: lit mid-dive, where a press fires,
      // and grey from the Abyssal, where a press does nothing.
      const pressed = (depth: number, depthOrder?: number): { grey: boolean; set: unknown } => {
        corvette.depth = depth;
        corvette.depthOrder = depthOrder;
        world.chart.applySnapshot(snapshot);
        world.conn.applySnapshot(snapshot);
        world.frame(1);
        selectHull(world, corvette);
        world.log.calls.length = 0;
        const grey = barGrey(world.app, 'CHARGE');
        const cell = barLabel(world.app, 'CHARGE');
        world.app.canvas.dispatch('pointerdown', {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: cell.x,
          clientY: cell.y,
        });
        world.frame(1);
        return { grey, set: world.log.first('onDepthCharge')?.[1] };
      };
      assert.deepEqual(
        pressed(900, 2400),
        { grey: false, set: 2400 },
        'the button is lit and fires mid-dive, from the band the hull is in'
      );
      assert.deepEqual(
        pressed(2400),
        { grey: true, set: undefined },
        'and is grey from the Abyssal, where a press does nothing'
      );
    } finally {
      world.teardown();
    }
  });

  /**
   * #1268. A charge carries its dropper's rating, and the server refuses one
   * set past it, so CHARGE greys on the same shared test (`depthChargeCarries`)
   * and says why. The rating is the server's, refits counted: the same hull
   * refitted to PR-3 drops.
   */
  it("greys CHARGE where the hull's rating cannot carry the charge, and says why", async () => {
    const world = await boot();
    try {
      const snapshot = cannedSnapshot();
      const corvette = snapshot.units.find((unit) => unit.torpedoes !== undefined)!;
      assert.equal(corvette.pressureRating, 2, 'the canned Corvette is PR-2');
      const pressed = (depth: number, rating: number): { grey: boolean; set: unknown } => {
        corvette.depth = depth;
        corvette.pressureRating = rating;
        world.chart.applySnapshot(snapshot);
        world.conn.applySnapshot(snapshot);
        world.frame(1);
        selectHull(world, corvette);
        world.log.calls.length = 0;
        const grey = barGrey(world.app, 'CHARGE');
        dispatchWindow('keydown', { code: 'KeyC' });
        dispatchWindow('keyup', { code: 'KeyC' });
        world.frame(1);
        return { grey, set: world.log.first('onDepthCharge')?.[1] };
      };

      assert.deepEqual(
        pressed(900, 2),
        { grey: true, set: undefined },
        "a PR-2 hull's charge into the Abyssal is greyed, and the key sends nothing"
      );
      assert.ok(
        textContents(world.app.stage).some((line) =>
          line.includes('CHARGE: a PR-2 charge implodes before 2,400 m')
        ),
        'the refusal names the rating and the depth'
      );
      assert.deepEqual(
        pressed(300, 2),
        { grey: false, set: 1000 },
        'the same hull on the Shelf still drops into Mid-Water, which it is rated for'
      );
      assert.deepEqual(
        pressed(900, 3),
        { grey: false, set: 2400 },
        'and refitted to PR-3 it drops into the Abyssal'
      );
    } finally {
      world.teardown();
    }
  });

  /**
   * #1363. Only a hull with a gun carries the noisemaker suite (`spawnUnit`'s
   * `attackDamage > 0`), and a missing `decoyCooldownS` read as "ready" for a
   * hull without one, so DECOY lit for a Harvester or a Weaver and the press
   * sent what the server drops without a word. §7 wants it greyed with a
   * reason; the Corvette is the control, and a mixed selection sends only the
   * hull that has the suite.
   */
  it('greys DECOY with a reason when no selected hull carries the suite', async () => {
    const world = await boot();
    try {
      const snapshot = cannedSnapshot();
      const [corvette, weaver, harvester] = [11, 12, 13].map((id) =>
        snapshot.units.find((unit) => unit.id === id)!
      );
      weaver!.kind = UnitKind.Weaver;
      weaver!.silentRunning = false;
      world.chart.applySnapshot(snapshot);
      world.conn.applySnapshot(snapshot);
      world.frame(1);

      const pressed = (
        hulls: Array<{ x: number; y: number; depth: number }>
      ): { grey: boolean; sent: unknown; said: boolean } => {
        hulls.forEach((hull, i) => selectHull(world, hull, i > 0));
        world.log.calls.length = 0;
        const grey = barGrey(world.app, 'DECOY');
        const cell = barLabel(world.app, 'DECOY');
        world.app.canvas.dispatch('pointerdown', {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: cell.x,
          clientY: cell.y,
        });
        world.frame(1);
        const said = textSaying(world.app.stage, NO_DECOY_TEXT) !== null;
        const sent = world.log.first('onDeployNoisemaker')?.[0];
        return { grey, sent, said };
      };

      for (const [name, hull] of [
        ['a Harvester', harvester!],
        ['a Weaver', weaver!],
      ] as const) {
        assert.deepEqual(
          pressed([hull]),
          { grey: true, sent: undefined, said: true },
          `DECOY is live for ${name}, or its press said nothing`
        );
        // The key is the same refusal, not a second route around it.
        world.log.calls.length = 0;
        dispatchWindow('keydown', { code: 'KeyN' });
        dispatchWindow('keyup', { code: 'KeyN' });
        assert.equal(world.log.first('onDeployNoisemaker'), undefined, `N sent ${name}'s decoy`);
      }
      // The hint bar holds a refusal for a few seconds of wall clock, so the
      // lit presses below are read by what they send, not by what it says.
      assert.deepEqual(
        { ...pressed([corvette!]), said: undefined },
        { grey: false, sent: [11], said: undefined },
        "the Corvette's suite is ready, and the press drops it"
      );
      assert.deepEqual(
        { ...pressed([harvester!, corvette!]), said: undefined },
        { grey: false, sent: [11], said: undefined },
        'a mixed selection lights DECOY and sends only the hull with the suite'
      );
    } finally {
      world.teardown();
    }
  });

  /**
   * The selection §9 names, offering more than the card holds: a screen hull,
   * a transport and a harvester make fifteen entries, so three have to yield —
   * and it is the deselect, the one entry whose loss costs nothing (a click on
   * empty water does the same), while `SCREEN` and `LAND`, which nothing but
   * the card reaches, both stay. Since Dive, Rise and Follow left the page
   * (#1132) a torpedo hull alone fits with room, so this is the case that
   * still makes the yield order decide anything. The restored depth shortcuts
   * yield before these existing mouse routes.
   */
  it('yields deselect and depth shortcuts before existing mixed-selection orders', async () => {
    const world = await boot();
    try {
      const snapshot = cannedSnapshot();
      const [screen, transport, harvester] = [11, 12, 13].map((id) =>
        snapshot.units.find((unit) => unit.id === id)!
      );
      // The Corvette carries a magazine of decoys, the scout a hold: the two
      // only-route entries, on the canned match's own hulls.
      screen!.decoys = 3;
      transport!.hold = { used: 0, berths: 4 };
      transport!.holding = false;
      world.chart.applySnapshot(snapshot);
      world.conn.applySnapshot(snapshot);
      world.frame(1);
      selectHull(world, screen!);
      selectHull(world, transport!, true);
      selectHull(world, harvester!, true);

      const lines = textContents(world.app.stage);
      for (const label of ['SCREEN 3', 'LAND 0/4', 'THR', 'DECOY', 'MINE', 'CHARGE']) {
        assert.ok(
          lines.some((line) => line.includes(label)),
          `${label} is not on the card — the yield order dropped the wrong entry`
        );
      }
      assert.ok(
        !lines.some((line) => line.trim() === '✕'),
        'the deselect is still on a card that was offered fifteen'
      );
    } finally {
      world.teardown();
    }
  });

  /**
   * The mixed-selection page now has a push order that disagrees with its
   * ranks. Keep the property pinned independently of that page: fourteen
   * offers with the two only-route entries pushed last, so keeping whatever
   * was pushed first would drop both.
   */
  it('yields lowest rank first, and the later of two equals, whatever the push order', () => {
    const entry = (label: string, yieldRank?: number) => ({ label, yieldRank });
    const model = [
      entry('situational, first', YIELD.SITUATIONAL),
      ...Array.from({ length: 9 }, (_, i) => entry(`core ${i}`)),
      entry('deselect', YIELD.DESELECT),
      entry('situational, second', YIELD.SITUATIONAL),
      entry('screen', YIELD.ONLY_ROUTE),
      entry('land', YIELD.ONLY_ROUTE),
    ];
    assert.deepEqual(
      yieldToCells(model, 12).map((kept) => kept.label),
      model
        .map((offered) => offered.label)
        .filter((label) => label !== 'deselect' && label !== 'situational, second'),
      'the deselect goes first, then the later situational entry, and the rest keep their order'
    );
    assert.equal(
      yieldToCells(model.slice(0, 12), 12).length,
      12,
      'a card that fits yields nothing'
    );
  });

  /**
   * The other half of the same argument, and the half #776 and #820 report:
   * a navy's roster is nineteen offers against twelve cells, so yielding by
   * rank is not enough — three of the four navies lost every Slipway hull.
   * §9's answer is the page, and the strip is where a page is reached.
   */
  it('gives each yard a tab, and the Harvester the Bastion’s page', async () => {
    const world = await boot();
    try {
      // Trimmed, because the assertions below match a tab exactly. Retired
      // tabs are already out: `textContents` walks visibility since #826,
      // which is the rule this test copied by hand before it did.
      const strip = (): string[] => textContents(world.app.stage).map((line) => line.trim());
      world.frame(2);

      // FOUNDRY and SLIPWAY are the tabs, in place of the one UNITS tab,
      // because they are the two yards a commander may not have.
      for (const tab of ['BUILD', 'FOUNDRY', 'SLIPWAY']) {
        assert.ok(strip().includes(tab), `${tab} is not on the tab strip`);
      }
      assert.ok(!strip().includes('UNITS'), 'the single UNITS tab is still there');

      // The canned base is a Bastion and a half-built Refinery, so no yard
      // stands: the Bastion's page is the one with anything live on it, and
      // reaching it is what selecting the Bastion does (§9, "A page opens by
      // selection").
      const bastion = cannedSnapshot().structures.find(
        (structure) => structure.kind === StructureKind.Bastion
      );
      assert.ok(bastion !== undefined, 'the canned match has no Bastion to select');
      selectHull(world, bastion);

      assert.ok(
        strip().some((line) => line.startsWith('HRV ')),
        'selecting the Bastion did not open the page its Harvester sits on'
      );
      assert.ok(
        strip().includes('BASTION'),
        'the open page has no tab lit for it — the strip is lying about what the card shows'
      );

      // The page really is one line's rather than the flat roster. The shared
      // suite pins §9's figures against `productionPageFor`; this pins the
      // card against the renderer's own `pageRoster`, so the two cannot drift
      // apart in silence.
      // Foundry hulls that survived the old flat roster's yield, which is what
      // makes them the ones worth asserting: a regression to flat puts them
      // back on this card. A Slipway hull or the Derrick would be absent under
      // that regression too, so they would prove nothing here.
      for (const elsewhere of ['SCT ', 'CRV ']) {
        assert.ok(
          !strip().some((line) => line.startsWith(elsewhere)),
          `${elsewhere.trim()} is on the Bastion's page — the card is not paging`
        );
      }
    } finally {
      world.teardown();
    }
  });

  it('opens the page of the production structure selected last', async () => {
    const world = await boot();
    try {
      const strip = (): string[] => textContents(world.app.stage).map((line) => line.trim());
      const snapshot = cannedSnapshot();
      const bastion = snapshot.structures.find(
        (structure) => structure.kind === StructureKind.Bastion
      );
      assert.ok(bastion !== undefined, 'the canned match has no Bastion to select');
      const foundry = {
        ...bastion,
        id: 999_001,
        kind: StructureKind.Foundry,
        x: bastion.x + 100,
      };
      const withFoundry = { ...snapshot, structures: [...snapshot.structures, foundry] };
      world.chart.applySnapshot(withFoundry);
      world.conn.applySnapshot(withFoundry);
      world.frame(2);

      selectHull(world, bastion);
      selectHull(world, foundry, true);

      assert.ok(
        strip().some((line) => line.startsWith('SCT ')),
        'shift-selecting a Foundry after a Bastion did not open the Foundry page'
      );
      assert.ok(
        !strip().some((line) => line.startsWith('HRV ')),
        'the Bastion page stayed open after a later production structure was selected'
      );
    } finally {
      world.teardown();
    }
  });

  /**
   * The strip grew from three tabs to as many as five, and `MENU` is anchored
   * to the right edge with nothing between them. §2 drops a console *block*
   * when the width runs out, but the strip has no such guard, so the question
   * is whether the widest strip can reach `MENU` at any width the console
   * itself survives — §11's 200% is where a HUD unit is most expensive.
   *
   * Five is the real worst case and it takes a mixed selection to reach: the
   * structure branch of the auto-open wins, so a Bastion *and* a hull gives
   * BUILD, both yards, the Bastion's own tab, and SQUAD.
   */
  it('keeps the widest tab strip clear of MENU at 200%', async () => {
    const world = await boot();
    try {
      // Select at 100%, where the projection the click relies on is the one
      // the other tests use, then scale — the strip is laid out per frame, so
      // the scale is what is under test rather than the click.
      const bastion = cannedSnapshot().structures.find(
        (structure) => structure.kind === StructureKind.Bastion
      );
      assert.ok(bastion !== undefined, 'the canned match has no Bastion to select');
      const hull = cannedSnapshot().units.find((unit) => unit.torpedoes !== undefined);
      assert.ok(hull !== undefined, 'the canned match has no hull to add to the selection');
      selectHull(world, bastion);
      selectHull(world, hull, true);
      world.chart.setUiScale(2);
      world.frame(2);

      // Bar labels are the only ones anchored at their centre, and every name
      // read below is one of them.
      const spans = new Map<string, { left: number; right: number }>();
      // Not `textContents`: this one wants each label's span, not its string.
      // It prunes for the same reason (#826) — a hidden panel's labels are not
      // on the bar, and checking only `node.visible` would walk into one.
      const walk = (node: Container): void => {
        if (!node.visible) return;
        if (node instanceof Text) {
          spans.set(node.text, { left: node.x - node.width / 2, right: node.x + node.width / 2 });
        }
        for (const child of node.children) walk(child as Container);
      };
      walk(world.app.stage as unknown as Container);

      const menu = spans.get('MENU');
      assert.ok(menu !== undefined, 'the MENU door is not on the bar');
      const tabs = ['BUILD', 'FOUNDRY', 'SLIPWAY', 'BASTION', 'SQUAD'].map((name) => {
        const span = spans.get(name);
        assert.ok(span !== undefined, `${name} is not on the tab strip`);
        return { name, span };
      });
      for (const { name, span } of tabs) {
        assert.ok(
          span.right < menu.left,
          `${name} runs into MENU at 200% — the strip has outgrown the bar`
        );
      }
    } finally {
      world.teardown();
    }
  });
});

describe('a live track flashes and sprays when its hp falls (#1517)', () => {
  type Hits = { trackHits: { fired: number; count: number } };
  /** Two snapshots of one Tier-4 track, the second with less hp; the frames' draw count after each. */
  const strike = async (reduced: boolean) => {
    const world = await boot();
    try {
      world.chart.setReducedMotion(reduced);
      const hits = (world.chart as unknown as Hits).trackHits;
      const template = cannedSnapshot().contacts.find((c) => c.tier === ResolutionTier.Track)!;
      const at = (tick: number, hp: number) => ({
        ...cannedSnapshot(tick),
        contacts: [{ ...template, id: 7777, hp, tick }],
      });
      world.chart.applySnapshot(at(1000, 120));
      world.frame(1);
      const before = drawInstructions(world.app.stage);
      world.chart.applySnapshot(at(1001, 120));
      assert.equal(hits.fired, 0, 'an unchanged track is not hit');
      world.chart.applySnapshot(at(1002, 80));
      world.frame(1);
      const after = drawInstructions(world.app.stage);
      // Another snapshot at the new hp: the blow is not thrown twice.
      world.chart.applySnapshot(at(1003, 80));
      return { fired: hits.fired, count: hits.count, added: after - before };
    } finally {
      world.teardown();
    }
  };

  it('fires once on the drop and draws its spray on the chart', async () => {
    const { fired, count, added } = await strike(false);
    assert.equal(fired, 1);
    assert.equal(count, 1);
    assert.ok(added > HIT_PARTICLES_MIN, `the spray is drawn (${added} more draws)`);
  });

  it('keeps the flash and drops the spray under reduced motion', async () => {
    const { fired, added } = await strike(true);
    assert.equal(fired, 1);
    assert.equal(added, 1, 'the flash alone');
  });
});

describe('the ear turns with the camera (#1324)', () => {
  it('pans a contact where it is drawn, so east sounds left with the camera turned round', async () => {
    // docs/audio-direction.md §3 matches spatialisation to the rendered
    // position. Turned round, a contact east of the ear is drawn on the left of
    // the screen, and it used to sound on the right.
    type Camera = {
      __perspectiveCamera: (
        x: number,
        z: number,
        distance: number,
        aim: { yawDeg?: number; pitchDeg?: number }
      ) => void;
    };
    const world = await boot();
    try {
      const probes = (globalThis as unknown as { window: Camera }).window;
      const template = cannedSnapshot().contacts.find((c) => c.tier === ResolutionTier.Track)!;
      let tick = 1000;
      const panAt = (yawDeg: number, at = { x: 2600, y: 2000 }): number => {
        probes.__perspectiveCamera(2000, 2000, 1500, { yawDeg, pitchDeg: HOME_PITCH_DEG });
        world.frame(2);
        world.log.calls.length = 0;
        tick += 12;
        world.chart.applySnapshot({
          ...cannedSnapshot(tick),
          contacts: [{ ...template, id: 7777, x: at.x, y: at.y }],
        });
        const sent = world.log.calls.filter((call) => call.name === 'onContactAudio').at(-1);
        assert.ok(sent !== undefined, 'the snapshot reached the mix');
        const entry = (sent.args[0] as ContactAudioFrame).entries.find((e) => e.id === 7777);
        assert.ok(entry !== undefined && entry.bearing !== undefined, 'the contact has a bearing');
        return panFor(ResolutionTier.Track, entry.bearing);
      };
      assert.ok(panAt(0) > 0.8, 'facing the top of the map, east is right');
      assert.ok(panAt(180) < -0.8, 'turned round, east is drawn left and sounds left');
      // A quarter turn is the case that pins which way the yaw runs: a turned
      // and an unturned sign agree at 0 and 180 for a contact due east.
      assert.ok(panAt(90, { x: 2000, y: 2600 }) < -0.8, 'a quarter turn: south is drawn left');
    } finally {
      world.teardown();
    }
  });

  it('pans a ping return where its contact is drawn, turned with the camera', async () => {
    // §5's returns are ranged from the hull that pinged, and panned like every
    // other sound in the mix: on the screen's axis, not world east's.
    type Camera = {
      __perspectiveCamera: (
        x: number,
        z: number,
        distance: number,
        aim: { yawDeg?: number; pitchDeg?: number }
      ) => void;
    };
    const world = await boot();
    try {
      const probes = (globalThis as unknown as { window: Camera }).window;
      const template = cannedSnapshot().contacts.find((c) => c.tier === ResolutionTier.Track)!;
      const own = cannedSnapshot().units[0]!;
      let tick = 1000;
      const returnPan = (yawDeg: number, dx: number, dy: number): number => {
        probes.__perspectiveCamera(2000, 2000, 1500, { yawDeg, pitchDeg: HOME_PITCH_DEG });
        world.frame(2);
        world.log.calls.length = 0;
        tick += 12;
        world.chart.applySnapshot({
          ...cannedSnapshot(tick),
          contacts: [{ ...template, id: 7777, x: own.x + dx, y: own.y + dy }],
          selfEvents: [{ kind: SelfEventKind.Ping, unitId: own.id }],
        });
        const sent = world.log.calls.filter((call) => call.name === 'onSelfAudio').at(-1);
        assert.ok(sent !== undefined, 'the snapshot reached the mix');
        // Picked out by its range: a ghost from an earlier snapshot is still
        // tracked, and returns as well.
        const echo = (sent.args[0] as SelfAudioFrame).returns.find(
          (r) => Math.abs(r.rangeM - Math.hypot(dx, dy)) < 1e-6
        );
        assert.ok(echo !== undefined, 'the ping returned off the contact');
        return echo.pan;
      };
      assert.ok(returnPan(0, 600, 0) > 0.8, 'facing the top of the map, east returns right');
      assert.ok(returnPan(180, 600, 0) < -0.8, 'turned round, east returns left');
      assert.ok(returnPan(90, 0, 650) < -0.8, 'a quarter turn: south returns left');
    } finally {
      world.teardown();
    }
  });

  it('flashes a strike on the edge it is heard from, turned with the camera', async () => {
    // §11: the strike "also renders as a screen-edge flash on the bearing of
    // the pinging emitter". Its pan turns with the camera, so the flash must:
    // turned round, a strike from due east flashes on the left edge.
    type Camera = {
      __perspectiveCamera: (
        x: number,
        z: number,
        distance: number,
        aim: { yawDeg?: number; pitchDeg?: number }
      ) => void;
    };
    const probes = (globalThis as unknown as { window: Camera }).window;
    const flashAt = async (yawDeg: number): Promise<{ x: number; y: number }> => {
      const world = await boot();
      try {
        probes.__perspectiveCamera(2000, 2000, 1500, { yawDeg, pitchDeg: HOME_PITCH_DEG });
        world.frame(2);
        const own = cannedSnapshot().units[0]!;
        world.chart.applySnapshot({
          ...cannedSnapshot(1012),
          selfEvents: [{ kind: SelfEventKind.Exposed, unitId: own.id, bearing: 0 }],
        });
        world.frame(1);
        // The flash is the largest disc the HUD draws, at the edge it points to.
        const hud = (world.chart as unknown as { hudGraphics: Graphics }).hudGraphics;
        let widest = { x: Number.NaN, y: Number.NaN, r: -1 };
        for (const instruction of hud.context.instructions) {
          if (instruction.action !== 'fill') continue;
          const path = (instruction.data as { path?: GraphicsPath }).path;
          for (const step of path?.instructions ?? []) {
            if (step.action !== 'circle') continue;
            const [x, y, r] = step.data as number[];
            if (r! > widest.r) widest = { x: x!, y: y!, r: r! };
          }
        }
        assert.ok(widest.r > 0, 'the premise: a flash was drawn');
        return { x: widest.x, y: widest.y };
      } finally {
        world.teardown();
      }
    };
    const facingTop = (await flashAt(0)).x;
    const turnedRound = (await flashAt(180)).x;
    assert.ok(
      turnedRound < facingTop / 4,
      `turned round, east flashes on the left edge (${turnedRound} against ${facingTop})`
    );
    // A half turn cannot tell which way the yaw runs, and reads one axis. With
    // the camera a quarter turn round, facing west, east is the screen's foot.
    const quarter = await flashAt(90);
    assert.ok(
      quarter.y > 720 * 0.75 && Math.abs(quarter.x - 640) < 160,
      `a quarter turn: east flashes on the bottom edge, not at (${quarter.x}, ${quarter.y})`
    );
  });
});

/**
 * The free camera — docs/free-camera.md.
 *
 * The rig is the one piece of this renderer with no pixels in it: a focus, a
 * yaw, a pitch and a dolly, resolved into a camera position by arithmetic.
 * That makes it the part of the revision a headless test can hold whole, and
 * the part it most needs to — the retired no-rotation rule was protecting real
 * things, and what replaced each one is a property rather than a look.
 */
describe('renderer smoke test: the free camera', () => {
  /** The rig's own state, off the harness probe. */
  const rig = (): {
    yawDeg: number;
    pitchDeg: number;
    distance: number;
    focus: { xM: number; zM: number; depthM: number | null };
    eye: { xM: number; zM: number; depthM: number };
    sway: 'on' | 'held';
  } =>
    (
      globalThis as unknown as {
        window: { __perspectiveProbe: () => Record<string, unknown> };
      }
    ).window.__perspectiveProbe() as never;

  it('opens on the frame the yaw lock used to make permanent, and homes back to it', async () => {
    const world = await boot();
    try {
      world.frame(3);
      const opening = rig();
      assert.equal(opening.yawDeg, 0, 'every match still opens looking north');
      assert.equal(opening.pitchDeg, HOME_PITCH_DEG, 'at the pitch the screenshots settled');
      assert.equal(opening.focus.depthM, null, 'with the focus on the seabed');

      world.conn.orbitBy(300, -120);
      world.conn.raiseFocusBy(600);
      const turned = rig();
      assert.notEqual(turned.yawDeg, 0, 'the camera turned');
      assert.ok(turned.pitchDeg < HOME_PITCH_DEG, 'and tilted toward the horizontal');
      assert.notEqual(turned.focus.depthM, null, 'and the focus left the seabed');

      world.conn.home();
      const homed = rig();
      assert.equal(homed.yawDeg, 0, 'Home is north');
      assert.equal(homed.pitchDeg, HOME_PITCH_DEG, 'Home is 55°');
      assert.equal(homed.focus.depthM, null, 'Home is the seabed');
      // The dolly and the plan position are deliberately not Home's business:
      // a player who presses it is lost in angle, and throwing away the zoom
      // and the place they navigated to would answer a question they did not
      // ask (docs/free-camera.md §4).
      assert.equal(homed.distance, turned.distance, 'and Home keeps the zoom');
      assert.deepEqual(
        { x: homed.focus.xM, z: homed.focus.zM },
        { x: turned.focus.xM, z: turned.focus.zM },
        'and keeps the place'
      );
    } finally {
      world.teardown();
    }
  });

  it('holds the pitch inside the spec band however hard it is pushed', async () => {
    const world = await boot();
    try {
      world.frame(3);
      world.conn.orbitBy(0, -5000);
      assert.equal(rig().pitchDeg, 10, 'the floor of the band, and not past it');
      world.conn.orbitBy(0, 5000);
      assert.equal(rig().pitchDeg, 88, 'the ceiling, two degrees short of the gimbal');

      // Yaw has no ends, so it wraps rather than clamping: a heading is a
      // direction, and there is no such thing as turning too far.
      world.conn.home();
      world.conn.orbitBy(640 * 3, 0);
      assert.ok(rig().yawDeg >= 0 && rig().yawDeg < 360, 'three full turns is a heading');
    } finally {
      world.teardown();
    }
  });

  it('keeps the ground under the hand at every heading', async () => {
    const world = await boot();
    try {
      world.frame(3);
      world.conn.home();
      world.conn.focusWorld(2000, 2000);

      // At the home yaw, dragging right walks the focus west: the water
      // follows the hand, which is the rule the locked rig implemented by
      // subtracting from world X.
      const start = rig().focus;
      world.conn.panBy(120, 0);
      const west = rig().focus;
      assert.ok(west.xM < start.xM - 100, `the focus went west: ${start.xM} -> ${west.xM}`);
      assert.ok(Math.abs(west.zM - start.zM) <= 1, 'and nowhere north or south');

      // A quarter turn later the same drag walks it along the other axis,
      // because "right" belongs to the camera rather than to the map. This is
      // the whole of what freeing the yaw cost the pan, and the reason the
      // locked rig's simpler expression could not survive it.
      world.conn.home();
      world.conn.focusWorld(2000, 2000);
      world.conn.orbitBy(160, 0);
      assert.equal(rig().yawDeg, 90, 'a quarter turn, in pixels of orbit drag');
      const before = rig().focus;
      world.conn.panBy(120, 0);
      const after = rig().focus;
      assert.ok(after.zM > before.zM + 100, `the focus went south: ${before.zM} -> ${after.zM}`);
      assert.ok(Math.abs(after.xM - before.xM) <= 1, 'and nowhere east or west');
    } finally {
      world.teardown();
    }
  });

  it('never puts the eye inside the seabed, at any angle', async () => {
    const world = await boot();
    try {
      // At the bottom of the sway's heave (cameraSway.ts, 8.25 s into an 11 s
      // period), so every clamped aim below also tests the sway's own lift:
      // a heave that would dip a clamped eye under its clearance lifts it.
      const clock = mock.method(performance, 'now', () => 8_250);
      world.frame(3);
      clock.mock.restore();
      // Read off the camera itself rather than the probe's whole metres: one
      // cell from an 840 m wall, half a metre of rounding is metres of ground,
      // and the sway (#1003) puts the eye wherever that rounding is unkind.
      const camera = world.gl.lastCamera;
      assert.ok(camera !== null, 'the frame was drawn through a camera');
      let clamped = 0;
      // The invariant over the whole rig, rather than at one flattering
      // configuration: the eye keeps its clearance wherever it is aimed.
      for (const yawPx of [0, 80, 160, 240, 320, 400, 480, 560]) {
        for (const pitchPx of [-5000, -120, 0, 120, 5000]) {
          for (const distance of [250, 900, 3000]) {
            world.conn.home();
            world.conn.focusWorld(2700, 2600, distance);
            world.conn.orbitBy(yawPx, pitchPx);
            const { eye, focus, pitchDeg } = rig();
            const at = camera.position;
            const eyeDepth = -at.y / 0.22;
            const groundDepth = world.conn.seabedDepthAt(at.x, at.z);
            assert.ok(
              eyeDepth <= groundDepth - 24,
              `eye at ${eyeDepth.toFixed(1)} m under ground at ${groundDepth.toFixed(1)} m ` +
                `(yaw ${yawPx}px, pitch ${pitchDeg}°, dolly ${distance} m)`
            );
            const focusDepth = focus.depthM ?? world.conn.seabedDepthAt(focus.xM, focus.zM);
            const unclamped = focusDepth - (Math.sin((pitchDeg * Math.PI) / 180) * distance) / 0.22;
            if (eye.depthM < unclamped - 1) clamped += 1;
          }
        }
      }
      // And the clamp is load-bearing rather than decorative: the focus above
      // sits in the canned trench, one cell from an 840 m wall of rock, so
      // some of those aims put the eye through it.
      assert.ok(clamped > 0, 'at least one aim was saved from the inside of the terrain shell');
    } finally {
      world.teardown();
    }
  });

  it('still answers with a footprint when the camera looks past the horizon', async () => {
    const world = await boot();
    try {
      world.frame(3);
      world.conn.home();
      world.conn.orbitBy(0, -5000);

      const quad = world.conn.groundQuad();
      assert.equal(quad.length, 4, 'the scope still gets its four corners');
      // At the bottom of the pitch band the top screen corners are above the
      // horizon and meet the ground plane behind the eye. Answering with the
      // eye's own position — which is what `Math.max(1, t)` did — collapsed
      // the scope's camera box to a dot at exactly the pitch where a player
      // most needs to know which way they are facing.
      const spreadX = Math.max(...quad.map((c) => c.x)) - Math.min(...quad.map((c) => c.x));
      const spreadY = Math.max(...quad.map((c) => c.y)) - Math.min(...quad.map((c) => c.y));
      assert.ok(spreadX > CELL_M, `the box has width: ${spreadX.toFixed(0)} m`);
      assert.ok(spreadY > CELL_M, `and depth: ${spreadY.toFixed(0)} m`);
      for (const corner of quad) {
        assert.ok(
          Number.isFinite(corner.x) && Number.isFinite(corner.y),
          'and no corner ran off to infinity'
        );
      }
    } finally {
      world.teardown();
    }
  });

  /**
   * A click is a point in the water — docs/ui-ux.md §9 (#1132): the first of
   * the ground and the plane at the focus depth, along the cursor's ray, at a
   * depth held to the cell's water. Measured on the canned ground, whose floor
   * falls from a 1,100 m shelf in the north-west to a 3,200 m trench in the
   * south-east.
   */
  it('lands a click on the first thing its ray meets: the ground, or the focus plane', async () => {
    const world = await boot();
    try {
      world.frame(3);
      world.conn.home();
      const terrain = cannedTerrain();
      const floorAt = (x: number, y: number): number =>
        terrain.floor[
          Math.min(ROWS - 1, Math.floor(y / CELL_M)) * COLS +
            Math.min(COLS - 1, Math.floor(x / CELL_M))
        ]!;

      // Over the trench, with the focus lifted 400 m into the water above it.
      world.conn.focusWorld(3500, 3500);
      world.conn.raiseFocusBy(400);
      const plane = world.conn.focusDepth();
      assert.ok(plane > 2450 && plane < DEPTH.MAX_M, `the premise: a plane at ${plane} m`);

      // Ground deeper than the plane is behind it: the click hangs at the focus
      // depth, in open water, rather than falling to the trench floor.
      const trench = world.conn.projectPoint(3500, 3500, null);
      assert.ok(trench.visible, 'the trench floor is on screen');
      const overTrench = world.conn.resolveWater(trench.x, trench.y);
      assert.ok(
        Math.abs(overTrench.depthM - plane) < 1,
        `a click over the trench ordered ${overTrench.depthM} m, not the plane's ${plane}`
      );
      assert.equal(
        onTheGround(floorAt(overTrench.x, overTrench.y), overTrench.depthM),
        false,
        'and that is open water, so the move holds it'
      );

      // Ground shallower than the plane is in front of it: a click on the
      // 2,450 m ground north of the trench is on that ground, at its floor.
      const rise = world.conn.projectPoint(3125, 2375, null);
      assert.ok(rise.visible, 'the ground north of the trench is on screen');
      const onRise = world.conn.resolveWater(rise.x, rise.y);
      // On it, not behind it: the plane alone would carry the click on past
      // the ground to where the ray crosses the focus depth, and clamp it back
      // to a floor tens of metres further north.
      assert.ok(
        Math.hypot(onRise.x - 3125, onRise.y - 2375) < 20,
        `the click landed ${Math.hypot(onRise.x - 3125, onRise.y - 2375).toFixed(0)} m from the ground it was on`
      );
      assert.equal(onRise.depthM, floorAt(onRise.x, onRise.y), 'the floor of the cell it hit');
      assert.ok(onRise.depthM < plane, 'which the plane is below');
      assert.ok(onTheGround(floorAt(onRise.x, onRise.y), onRise.depthM), 'so the move follows it');

      // Home puts the focus back on the seabed: a click there is on the ground,
      // and over ground deeper than an order may name it orders DEPTH.MAX_M.
      world.conn.home();
      const centre = world.conn.projectPoint(3500, 3500, null);
      const atHome = world.conn.resolveWater(centre.x, centre.y);
      assert.equal(atHome.depthM, DEPTH.MAX_M, 'the trench floor, held to the column');
      assert.ok(onTheGround(floorAt(atHome.x, atHome.y), atHome.depthM));

      // On the seabed there is no plane: a click at home on ground 270 m below
      // the seabed under the focus is on that ground, where a plane at the
      // focus's depth would have caught it short of the cursor and hung it in
      // open water.
      world.conn.focusWorld(2000, 1500);
      const southward = world.conn.projectPoint(2000, 2400, null);
      assert.ok(southward.visible, 'the deeper ground south of the focus is on screen');
      const deeper = world.conn.resolveWater(southward.x, southward.y);
      assert.ok(
        Math.hypot(deeper.x - 2000, deeper.y - 2400) < 20,
        `the click landed ${Math.hypot(deeper.x - 2000, deeper.y - 2400).toFixed(0)} m short`
      );
      assert.ok(
        deeper.depthM > world.conn.focusDepth() + FOLLOW_FLOOR.ENGAGE_WITHIN_M,
        `the premise: ground well below the focus's ${world.conn.focusDepth()} m`
      );
      assert.ok(onTheGround(floorAt(deeper.x, deeper.y), deeper.depthM), 'and the move follows it');

      // A closed roof stops the ray, and the move holds the water just under it:
      // the canned passage's 1,600 m ceiling over a 2,600 m floor, too tall a
      // passage for that water to count as the floor's.
      world.conn.focusWorld(3250, 1500);
      const lid = world.conn.projectPoint(3250, 1500, 1500);
      assert.ok(lid.visible, 'the passage is on screen');
      const onRoof = world.conn.resolveWater(lid.x, lid.y);
      assert.equal(onRoof.depthM, 1600, 'the water just under the roof');
      assert.equal(
        onTheGround(floorAt(onRoof.x, onRoof.y), onRoof.depthM),
        false,
        'which is open water, a thousand metres over the passage floor'
      );
    } finally {
      world.teardown();
    }
  });

  /**
   * A roof's sides stand on cell edges, so a click on one lands on the edge
   * itself, and the cell grid's floor puts some of those clicks in the water
   * across it, whose ceiling is the surface. Whichever side the arithmetic
   * falls, the click is on the roof and means the water under it (§9): the
   * depth, and the point too, which the server's follow test reads the floor
   * under. The point is drawn deeper into the roof's cell than a hull's arrival
   * tolerance, because a hull that stops short of it from the open side is the
   * one whose station reads the cell it stopped in (#1227).
   */
  it('reads a click on a roof wall as the water under that roof', async () => {
    const world = await boot();
    try {
      world.frame(3);
      world.conn.home();
      const inset = 2 * MOVEMENT.ARRIVAL_EPSILON_M;
      // The canned passage covers rows 5–6 and columns 12–13 under a 1,600 m
      // ceiling. Its south wall stands on y 1,750 m over water deeper than
      // that ceiling, so it is a lintel, and it faces the home camera.
      world.conn.focusWorld(3250, 2250);
      for (const x of [3030, 3100, 3170, 3240, 3310, 3380, 3450]) {
        const face = world.conn.projectPoint(x, 1750, 1560);
        assert.ok(face.visible, `the lintel at x ${x} is on screen`);
        const click = world.conn.resolveWater(face.x, face.y);
        const inside = 1750 - click.y;
        assert.ok(
          inside >= 0 && inside <= inset + 1,
          `the premise: the click at x ${x} hit the wall, not y ${click.y.toFixed(1)}`
        );
        assert.equal(
          click.depthM,
          1600,
          `a click on the lintel at x ${x} ordered ${click.depthM} m`
        );
        assert.equal(
          Math.floor(click.y / CELL_M),
          6,
          `and the point at x ${x} lies in the roof's own row, not y ${click.y}`
        );
        assert.ok(
          inside > MOVEMENT.ARRIVAL_EPSILON_M,
          `far enough in that a hull arriving short of it is under the roof: ${inside} m`
        );
      }

      // The east wall, on x 3,500 m over the same deeper water, seen with the
      // camera turned to face west at it.
      const aim = (
        globalThis as unknown as {
          window: {
            __perspectiveCamera: (
              x: number,
              z: number,
              d?: number,
              a?: { yawDeg?: number }
            ) => void;
          };
        }
      ).window.__perspectiveCamera;
      aim(4250, 1500, undefined, { yawDeg: 90 });
      for (const z of [1300, 1400, 1500, 1600, 1700]) {
        const face = world.conn.projectPoint(3500, z, 1560);
        assert.ok(face.visible, `the east lintel at y ${z} is on screen`);
        const click = world.conn.resolveWater(face.x, face.y);
        const inside = 3500 - click.x;
        assert.ok(
          inside >= 0 && inside <= inset + 1,
          `the premise: the click at y ${z} hit the east wall, not x ${click.x.toFixed(1)}`
        );
        assert.equal(click.depthM, 1600, `a click on the east lintel ordered ${click.depthM} m`);
        assert.equal(
          Math.floor(click.x / CELL_M),
          13,
          `and the point at y ${z} lies in the roof's own column, not x ${click.x}`
        );
      }
    } finally {
      world.teardown();
    }
  });

  it('lets the focus leave the seabed, and keeps it in water', async () => {
    const world = await boot();
    try {
      world.frame(3);
      world.conn.home();
      world.conn.focusWorld(2000, 2000);
      const seabed = world.conn.seabedDepthAt(2000, 2000);

      world.conn.raiseFocusBy(FOCUS_STEP_M * 4);
      assert.ok(
        Math.abs((rig().focus.depthM ?? 0) - (seabed - FOCUS_STEP_M * 4)) <= 1,
        'four notches up is four notches off the seabed'
      );

      // The column has two ends and the focus honours both. Nothing here is a
      // cost — the Lid and the crush depth are a hull's problem, never the
      // camera's (docs/free-camera.md §4) — it is only that water is where
      // looking makes sense.
      world.conn.raiseFocusBy(10_000);
      assert.equal(rig().focus.depthM, 0, 'the focus stops at the surface');
      // Sunk to the seabed it lands there, back to following the ground the
      // way it does from Home (#1132) — `null`, not a number that happens to
      // equal the seabed here and stops equalling it the moment the camera pans.
      world.conn.raiseFocusBy(-20_000);
      assert.equal(rig().focus.depthM, null, 'and lands on the seabed');
    } finally {
      world.teardown();
    }
  });

  /**
   * A raised focus a pan has pushed onto shallower ground stays raised at that
   * depth and keeps its plane (docs/ui-ux.md §9). The pan leaves it exactly on
   * the seabed there. The left + right drag used to send a step of nothing on
   * every sideways move; it now moves the focus only when the pointer moved
   * up or down, and a zero step reading as no landing is the backstop behind
   * that check.
   */
  it('keeps a raised focus that a pan pushed onto shallower ground', async () => {
    const world = await boot();
    try {
      world.frame(3);
      world.conn.home();
      world.conn.focusWorld(3500, 3500);
      world.conn.raiseFocusBy(400);
      const raised = rig().focus.depthM;
      assert.ok(raised !== null && raised > 2500, `the premise: a focus raised to ${raised} m`);

      // North-west onto the shelf, whose ground stands above that depth. The
      // probe rounds the focus to the metre, so it is held to the metre, as
      // the test above holds its notches.
      world.conn.focusWorld(500, 500);
      const shelf = world.conn.seabedDepthAt(500, 500);
      assert.ok(shelf < raised, `the premise: the shelf's ${shelf} m is above the focus`);
      const pushed = rig().focus.depthM;
      assert.ok(
        pushed !== null && Math.abs(pushed - shelf) <= 1,
        `the ground raises the focus to its own depth, not ${pushed}`
      );

      world.conn.raiseFocusBy(0);
      const after = rig().focus.depthM;
      assert.ok(
        after !== null && Math.abs(after - shelf) <= 1,
        `a step of nothing leaves it there, not ${after}`
      );
    } finally {
      world.teardown();
    }
  });

  it('sways by translation alone, and holds still under reduced motion (#1003)', async () => {
    const world = await boot();
    // The frame reads the clock once and applies the camera at it, so a held
    // clock makes the sway's phase the test's to name.
    let nowMs = 0;
    const clock = mock.method(performance, 'now', () => nowMs);
    try {
      world.conn.home();
      world.conn.focusWorld(2000, 2000, 3000);
      world.frame(1);
      const camera = world.gl.lastCamera;
      assert.ok(camera !== null, 'the frame was drawn through a camera');
      const aim = camera.quaternion.clone();
      const sway = { right: 0, up: 0 };
      let furthest = 0;
      for (const at of [2_000, 6_500, 13_250]) {
        nowMs = at;
        world.frame(1);
        // Gate 8: an effect may not turn the camera. The aim is the player's.
        assert.deepEqual(
          camera.quaternion.toArray(),
          aim.toArray(),
          `the sway turned the camera at ${at} ms`
        );
        // A translation in the camera's own plane carries the focus off the
        // centre of the 1280x720 frame by exactly the sway, in shares of the
        // frame's height: the overlay projects through this camera, so a ring
        // drawn there moves with the water rather than over it.
        swayAt(at, sway);
        const focus = world.conn.projectPoint(2000, 2000, null);
        assert.ok(Math.abs(focus.x - (640 - sway.right * 720)) < 1e-4, `across at ${at} ms`);
        assert.ok(Math.abs(focus.y - (360 + sway.up * 720)) < 1e-4, `up and down at ${at} ms`);
        furthest = Math.max(furthest, Math.hypot(focus.x - 640, focus.y - 360));
      }
      assert.ok(furthest > 1, `the camera does sway: ${furthest.toFixed(2)} px at most`);
      assert.ok(furthest < 4, `and only slightly: ${furthest.toFixed(2)} px at most`);

      // Reduced motion holds it at rest at once, not on the next frame, and
      // keeps it there however long the clock runs.
      world.conn.setReducedMotion(true);
      const settled = world.conn.projectPoint(2000, 2000, null);
      assert.ok(Math.hypot(settled.x - 640, settled.y - 360) < 1e-4, 'held before any frame');
      for (const at of [13_250, 21_000]) {
        nowMs = at;
        world.frame(1);
        const focus = world.conn.projectPoint(2000, 2000, null);
        assert.ok(Math.hypot(focus.x - 640, focus.y - 360) < 1e-4, `held at ${at} ms`);
        assert.deepEqual(camera.quaternion.toArray(), aim.toArray(), 'and aimed where it was');
      }
      assert.equal(rig().sway, 'held', 'and the probe says so');
    } finally {
      clock.mock.restore();
      world.teardown();
    }
  });

  it('leaves the chart’s ground and nodes alone while the camera holds still (#1032)', async () => {
    const world = await boot();
    // The sway reads the frame's clock, so a held clock names its phase.
    let nowMs = 1_000;
    const clock = mock.method(performance, 'now', () => nowMs);
    // Two of the three layers keyed on the view revision, counted where they
    // repaint. The third, the force layer, also keys on ordnance in the water,
    // which this snapshot has, so it stays on the frame cadence regardless.
    const chart = world.chart as unknown as { drawBlockedGround(): void; drawNodes(): void };
    const ground = mock.method(chart, 'drawBlockedGround');
    const nodes = mock.method(chart, 'drawNodes');
    const repaints = (): { ground: number; nodes: number } => ({
      ground: ground.mock.callCount(),
      nodes: nodes.mock.callCount(),
    });
    const settle = (): void => {
      ground.mock.resetCalls();
      nodes.mock.resetCalls();
    };
    const frames = (times: readonly number[]): void => {
      for (const at of times) {
        nowMs = at;
        world.frame(1);
      }
    };
    try {
      world.frame(2);

      // The control: a swaying camera moves every frame, and the layers that
      // are projected through it move with it.
      settle();
      frames([2_000, 6_500, 13_250]);
      assert.deepEqual(repaints(), { ground: 3, nodes: 3 }, 'the sway repaints every frame');

      // Reduced motion holds the sway (docs/ui-ux.md §11), and GameCanvas
      // tells both painters. The eye comes to rest once, and then holds.
      world.chart.setReducedMotion(true);
      world.conn.setReducedMotion(true);
      world.frame(1);
      const revision = world.conn.viewRevision;
      settle();
      frames([13_250, 21_000, 34_500, 34_500]);
      assert.equal(world.conn.viewRevision, revision, 'a still camera keeps its revision');
      assert.deepEqual(repaints(), { ground: 0, nodes: 0 }, 'and the chart keeps both layers');

      // A skip, not a freeze: one pan is one revision and one repaint.
      world.conn.panBy(40, 0);
      frames([40_000]);
      assert.equal(world.conn.viewRevision, revision + 1, 'a pan is a change');
      assert.deepEqual(repaints(), { ground: 1, nodes: 1 }, 'and repaints both once');
      frames([41_000, 52_000]);
      assert.deepEqual(repaints(), { ground: 1, nodes: 1 }, 'and only once');

      // The viewport is a change too, even at the same aspect: the projection
      // matrix holds, and only the CSS size `projectPoint` scales by moves.
      for (const host of [world.connHost, world.chartHost]) {
        host.clientWidth = 640;
        host.clientHeight = 360;
      }
      world.app.resize(640, 360);
      fireResizeObservers();
      frames([60_000, 61_000, 72_000]);
      assert.equal(world.conn.viewRevision, revision + 2, 'a resize is a change');
      assert.deepEqual(repaints(), { ground: 2, nodes: 2 }, 'and repaints both once');
    } finally {
      clock.mock.restore();
      world.teardown();
    }
  });
});

describe('the wheel reads the axis it turned on (#1338)', () => {
  it('moves the focus with Shift + wheel sent sideways, and zooms on no sideways scroll', async () => {
    // docs/ui-ux.md §9: Shift + wheel raises and sinks the focus, the wheel
    // zooms. macOS sends Shift + wheel on `deltaX` with `deltaY` at 0, which
    // read as down whichever way the wheel turned; a sideways swipe zoomed out.
    const world = await boot();
    try {
      world.frame(2);
      const canvas = world.app.canvas;
      const conn = world.conn as unknown as { distance: number };
      const wheel = (init: Record<string, unknown>) =>
        canvas.dispatch('wheel', { clientX: 640, clientY: 360, deltaX: 0, deltaY: 0, ...init });
      const seabed = world.conn.focusDepth();

      wheel({ shiftKey: true, deltaX: -100 });
      assert.equal(world.conn.focusDepth(), seabed - FOCUS_STEP_M, 'a notch up raises the focus');
      wheel({ shiftKey: true, deltaX: 100 });
      assert.equal(world.conn.focusDepth(), seabed, 'and a notch down sinks it back');
      // And the same gesture sent on its own axis, as everywhere but macOS.
      wheel({ shiftKey: true, deltaY: -100 });
      assert.equal(world.conn.focusDepth(), seabed - FOCUS_STEP_M, 'a vertical notch up raises it');
      wheel({ shiftKey: true, deltaY: 100 });
      assert.equal(world.conn.focusDepth(), seabed, 'and a vertical notch down sinks it back');

      const distance = conn.distance;
      wheel({ deltaX: 100 });
      assert.equal(conn.distance, distance, 'a sideways scroll zoomed');
      wheel({ deltaY: -100 });
      assert.ok(conn.distance < distance, 'the premise: the wheel itself still zooms');
    } finally {
      world.teardown();
    }
  });
});

describe('renderer smoke test: the queued GPU reading (gate 6, #1001)', () => {
  it('draws its load outside the frame: no call, triangle or pass of the frame is its', async () => {
    type Probes = {
      __perspectiveProbe: () => Record<string, unknown>;
      __perspectiveGpuQueue?: (steps: number) => number;
      __perspectiveGpuSplit?: (on: boolean) => boolean;
    };
    const world = await boot();
    try {
      const probes = (globalThis as unknown as { window: Probes }).window;
      assert.ok(probes.__perspectiveGpuQueue, 'outside a production build the switch is there');
      /** Renders the stand-in made over one frame, the load's included. */
      const rendersInAFrame = (): number => {
        const at = world.gl.passes;
        world.frame(1);
        return world.gl.passes - at;
      };
      world.frame(2);
      const before = probes.__perspectiveProbe();
      assert.equal(before.gpuQueue, null, 'no load until a capture asks for one');
      const unloaded = rendersInAFrame();
      assert.deepEqual(world.gl.frameTargets, [null, null], 'the canvas pass, then the split');
      assert.equal(probes.__perspectiveGpuQueue!(12000), 12000);
      world.frame(1);
      assert.equal(rendersInAFrame(), unloaded + 1, 'the load is one render the renderer made');
      const queued = probes.__perspectiveProbe();
      assert.equal(queued.drawCalls, before.drawCalls, 'and none of the frame it precedes');
      assert.equal(queued.triangles, before.triangles);
      assert.deepEqual(queued.passes, before.passes);
      assert.deepEqual(world.gl.frameTargets, [null, null], 'the frame still opens on the world');
      assert.deepEqual(queued.gpuQueue, { steps: 12000, avgMs: 0, frames: 0, dropped: 0 });
      assert.equal(probes.__perspectiveGpuQueue!(0), 0);
      assert.equal(rendersInAFrame(), unloaded, 'taken away, it draws nothing');
      assert.equal(probes.__perspectiveProbe().gpuQueue, null);
      assert.equal(probes.__perspectiveGpuSplit!(true), false, 'no timer here to split');
    } finally {
      world.teardown();
    }
    const probes = (globalThis as unknown as { window: Partial<Probes> }).window;
    assert.equal(probes.__perspectiveGpuQueue, undefined, 'the switch goes with the view');
    assert.equal(probes.__perspectiveGpuSplit, undefined);
  });
});

describe('renderer smoke test: the halo frame reading (#1001, development only)', () => {
  it('hands back the next frame around the halo while it is on, and nothing while it is off', async () => {
    type Frame = {
      width: number;
      height: number;
      state: string;
      before: Uint8Array;
      after: Uint8Array;
      mask: Uint8Array;
    };
    type Probes = {
      __perspectiveHalo?: (on: boolean) => string;
      __perspectiveHaloFrame?: () => Promise<Frame | null>;
      __perspectiveHaloOnly?: (key: string | null) => void;
    };
    const world = await boot();
    try {
      const probes = (globalThis as unknown as { window: Probes }).window;
      assert.ok(probes.__perspectiveHaloFrame && probes.__perspectiveHaloOnly);
      const off = probes.__perspectiveHaloFrame!();
      world.frame(1);
      assert.equal(await off, null, 'the halo is off: no frame');
      probes.__perspectiveHalo!(true);
      const on = probes.__perspectiveHaloFrame!();
      world.frame(1);
      const frame = await on;
      assert.ok(frame);
      assert.equal(frame.state, 'idle', 'the canned match draws sprites, so no splat');
      for (const layer of [frame.before, frame.after, frame.mask]) {
        assert.equal(
          layer.length,
          frame.width * frame.height * 4,
          'RGBA, the whole drawing buffer'
        );
      }
      probes.__perspectiveHaloOnly!('unit:1');
      probes.__perspectiveHaloOnly!(null);
    } finally {
      world.teardown();
    }
    const probes = (globalThis as unknown as { window: Probes }).window;
    assert.equal(probes.__perspectiveHaloFrame, undefined, 'the switches go with the view');
    assert.equal(probes.__perspectiveHaloOnly, undefined);
  });

  it('reads the seabed the view draws for the ridge case, and goes with the view', async () => {
    type Probes = { __perspectiveSeabedM?: (x: number, z: number) => number };
    const world = await boot();
    try {
      const probes = (globalThis as unknown as { window: Probes }).window;
      assert.ok(probes.__perspectiveSeabedM);
      for (const [x, z] of [
        [2000, 2000],
        [500, 3500],
      ] as const) {
        // The ground the overlay already asks for, not a second heightfield.
        assert.equal(probes.__perspectiveSeabedM!(x, z), world.conn.seabedDepthAt(x, z));
      }
    } finally {
      world.teardown();
    }
    const probes = (globalThis as unknown as { window: Probes }).window;
    assert.equal(probes.__perspectiveSeabedM, undefined);
  });
});

describe('the ping preview rings the hull that pings (#1330)', () => {
  it('rings the hull P pings from and no other, however many are selected', async () => {
    // docs/ui-ux.md §6: "two rings on the terrain at the emitting unit", and P
    // sends one ping. The preview used to ring every selected hull, so five
    // self-reveals promised a cost the ping did not pay, or not where shown.
    const world = await boot();
    try {
      type Chart = {
        selected: Set<number>;
        units: OwnUnit[];
        drawnPosition(unit: OwnUnit): { x: number; y: number };
        drawRings(): void;
        traceCircle(
          g: Graphics,
          cx: number,
          cy: number,
          radiusM: number,
          ...rest: unknown[]
        ): boolean;
      };
      const chart = world.chart as unknown as Chart;
      // Every circle the latest ring pass traced, by centre and radius, and
      // only that pass's: hazards and fauna trace circles of their own in the
      // same frame. The real pass runs; this only reads what it asked for.
      const traced: Array<{ x: number; y: number; radiusM: number }> = [];
      let inRingPass = false;
      const drawRings = chart.drawRings.bind(chart);
      const traceCircle = chart.traceCircle.bind(chart);
      chart.drawRings = () => {
        traced.length = 0;
        inRingPass = true;
        try {
          drawRings();
        } finally {
          inRingPass = false;
        }
      };
      chart.traceCircle = (g, cx, cy, radiusM, ...rest) => {
        if (inRingPass) traced.push({ x: cx, y: cy, radiusM });
        return traceCircle(g, cx, cy, radiusM, ...rest);
      };

      world.frame(2);
      dispatchWindow('keydown', { code: 'Digit0' });
      world.frame(1);
      assert.ok(chart.selected.size >= 2, 'the premise: several hulls selected');
      dispatchWindow('keydown', { code: 'AltLeft' });
      world.frame(2);
      const ringsOf = (radiusM: number) => traced.filter((circle) => circle.radiusM === radiusM);
      const rings = {
        reveal: ringsOf(ACTIVE_SONAR.REVEAL_RADIUS_M),
        'self-reveal': ringsOf(ACTIVE_SONAR.SELF_REVEAL_RADIUS_M),
      };
      dispatchWindow('keyup', { code: 'AltLeft' });

      // The hull the ping actually goes out from.
      dispatchWindow('keydown', { code: 'KeyP' });
      const pinger = chart.units.find((unit) => unit.id === world.log.first('onPing')?.[0]);
      assert.ok(pinger !== undefined, 'the premise: P pinged a selected hull');
      const at = chart.drawnPosition(pinger);
      for (const [name, drawn] of Object.entries(rings)) {
        assert.equal(drawn.length, 1, `one hull pings, so one ${name} ring is drawn`);
        assert.deepEqual(
          { x: drawn[0]!.x, y: drawn[0]!.y },
          { x: at.x, y: at.y },
          `the ${name} ring is round the hull P pings from`
        );
      }
    } finally {
      dispatchWindow('keyup', { code: 'AltLeft' });
      world.teardown();
    }
  });
});

/**
 * A mission's named places on the chart — docs/ui-ux.md §10.5 (#1611). A
 * newcomer told to hold *at the arch* held under it for ten minutes without
 * knowing it was there. Driven through the real draw pass on the canned match,
 * with the marker laid round its first hull so the ring and its name are on
 * screen.
 */
describe("a mission's named markers on the chart (#1611)", () => {
  type Chart = {
    units: OwnUnit[];
    markNames: Container;
    drawMissionMarks(): void;
    traceCircle(g: Graphics, cx: number, cy: number, radiusM: number, ...rest: unknown[]): boolean;
  };

  /** The canned match with a mission view, and every circle the marker pass traced. */
  async function charted(view: (at: { x: number; y: number }) => MissionView) {
    const world = await boot();
    const chart = world.chart as unknown as Chart;
    const traced: Array<{ x: number; y: number; radiusM: number }> = [];
    let inPass = false;
    const pass = chart.drawMissionMarks.bind(chart);
    const traceCircle = chart.traceCircle.bind(chart);
    chart.drawMissionMarks = () => {
      traced.length = 0;
      inPass = true;
      try {
        pass();
      } finally {
        inPass = false;
      }
    };
    chart.traceCircle = (g, cx, cy, radiusM, ...rest) => {
      if (inPass) traced.push({ x: cx, y: cy, radiusM });
      return traceCircle(g, cx, cy, radiusM, ...rest);
    };
    world.frame(2);
    const hull = chart.units[0]!;
    world.chart.setMissionMarkers(view({ x: hull.x, y: hull.y }));
    world.frame(2);
    const names = (chart.markNames.children as Text[])
      .filter((name) => name.visible)
      .map((name) => name.text);
    return { world, traced, names };
  }

  const ARCH = (at: { x: number; y: number }, name: string | null = 'The arch') => ({
    id: 'arch',
    label: "The arch. The flight's water is under its south face.",
    ...(name === null ? {} : { name }),
    x: at.x,
    y: at.y,
    radiusM: 350,
  });
  const view = (over: Partial<MissionView>): MissionView => ({
    missionId: 'sorrowgate',
    tick: 0,
    objectives: [],
    markers: [],
    locks: [],
    held: [],
    sigBudget: 20,
    debtS: 0,
    ...over,
  });
  const station = (status: ObjectiveStatus) => ({
    id: 'station',
    text: 'The flight holds at the arch.',
    status,
    markerId: 'arch',
  });

  it('rings and names a marker an open row names', async () => {
    const { world, traced, names } = await charted((at) =>
      view({ objectives: [station(ObjectiveStatus.Pending)], markers: [ARCH(at)] })
    );
    try {
      assert.equal(traced.length, 1, 'one ring, round the marker');
      assert.equal(traced[0]!.radiusM, 350, 'at the marker radius, in true metres');
      assert.deepEqual(names, ['The arch'], 'and its name above it');
    } finally {
      world.teardown();
    }
  });

  it('takes it off the chart once the row is met', async () => {
    const { world, traced, names } = await charted((at) =>
      view({ objectives: [station(ObjectiveStatus.Met)], markers: [ARCH(at)] })
    );
    try {
      assert.equal(traced.length, 0, 'a met row sends the player nowhere');
      assert.deepEqual(names, []);
    } finally {
      world.teardown();
    }
  });

  it('draws nothing for a marker the mission did not name', async () => {
    const { world, traced, names } = await charted((at) =>
      view({ objectives: [station(ObjectiveStatus.Pending)], markers: [ARCH(at, null)] })
    );
    try {
      assert.equal(traced.length, 0, 'an unnamed marker stays a camera jump');
      assert.deepEqual(names, []);
    } finally {
      world.teardown();
    }
  });

  // #1594: a tender row names the service lock as the place on its way to
  // the Concourse, and the chart draws both while the row is open.
  const LOCK = (at: { x: number; y: number }) => ({
    id: 'service-lock',
    label: 'The service lock. The only way north since the arch fell.',
    name: 'The service lock',
    x: at.x,
    y: at.y,
    radiusM: 250,
  });
  const tender = (status: ObjectiveStatus) => ({
    id: 'tender-one',
    text: 'Tender One is loaded.',
    status,
    markerId: 'arch',
    viaMarkerId: 'service-lock',
  });

  it('draws the place on a row’s way beside the row’s own', async () => {
    const { world, traced, names } = await charted((at) =>
      view({ objectives: [tender(ObjectiveStatus.Pending)], markers: [ARCH(at), LOCK(at)] })
    );
    try {
      assert.deepEqual(
        traced.map((ring) => ring.radiusM).sort(),
        [250, 350],
        'a ring for the destination and one for the way'
      );
      assert.deepEqual(names.sort(), ['The arch', 'The service lock']);
    } finally {
      world.teardown();
    }
  });

  // #1594: a loaded tender wears its escort radius, cyan while an escort is
  // inside it and magenta while the hold keeps it for want of one.
  async function eared(held: boolean) {
    // Only the strokes the ears pass makes: the ring layer carries every
    // other instrument too, and their cyan would answer for a missing ring.
    const strokes: number[] = [];
    const { world, traced } = await charted(() => view({}));
    const chart = world.chart as unknown as Chart & {
      ringLayer: Graphics;
      drawTenderEars(g: Graphics): void;
      drawnPosition(unit: OwnUnit): { x: number; y: number };
    };
    const hull = chart.units[0]!;
    const ears = chart.drawTenderEars.bind(chart);
    chart.drawTenderEars = (g) => {
      const stroke = g.stroke.bind(g);
      g.stroke = ((style: { color: number }) => {
        strokes.push(style.color);
        return stroke(style);
      }) as typeof g.stroke;
      try {
        ears(g);
      } finally {
        g.stroke = stroke;
      }
    };
    world.chart.setMissionMarkers(
      view({
        ears: { radiusM: 400, unitIds: [hull.id] },
        held: held ? [{ unitId: hull.id, reason: MovementHoldReason.Unescorted }] : [],
      })
    );
    world.frame(2);
    const rings = traced.filter((ring) => ring.radiusM === 400);
    return { world, rings, strokes, hull: chart.drawnPosition(hull) };
  }

  it('rings a tender with its ears, round where the hull is drawn', async () => {
    const { world, rings, strokes, hull } = await eared(false);
    try {
      assert.equal(rings.length > 0, true, 'a loaded tender wears its escort radius');
      assert.deepEqual({ x: rings[0]!.x, y: rings[0]!.y }, { x: hull.x, y: hull.y });
      assert.ok(strokes.includes(UI.accent), 'in cyan while an escort answers it');
      assert.ok(!strokes.includes(UI.glassStroke), 'and not in the asking magenta');
    } finally {
      world.teardown();
    }
  });

  it('turns the ears magenta while the tender is held for want of an escort', async () => {
    const { world, rings, strokes } = await eared(true);
    try {
      assert.ok(rings.length > 0, 'a held tender still wears its ears');
      assert.ok(strokes.includes(UI.glassStroke), 'in the magenta that asks');
    } finally {
      world.teardown();
    }
  });

  it('takes the way off with the row', async () => {
    const { world, traced, names } = await charted((at) =>
      view({ objectives: [tender(ObjectiveStatus.Met)], markers: [ARCH(at), LOCK(at)] })
    );
    try {
      assert.equal(traced.length, 0, 'a met row has no way left to show');
      assert.deepEqual(names, []);
    } finally {
      world.teardown();
    }
  });
});

/**
 * Where a marker's name stands — docs/ui-ux.md §10.5's placement rule (#1662).
 * Each case is one the rule was written for, driven through the real draw
 * pass on the canned match at 1280 × 720, and checked against the ring as this
 * file projects it rather than as the renderer recorded it.
 */
describe("where a marker's name stands (#1662)", () => {
  // One instant per test. The rule reads the clock three ways — the camera's
  // sway, how long a name holds its place, and when a track's mark has
  // arrived — and the cases here are drawn frame by frame at the runner's pace,
  // so a slow runner moved the answer: a name held, or a mark arrived, that a
  // fast one never saw. Pinned, every case draws one instant; the two arrival
  // cases still age their marks against it.
  let clock: ReturnType<typeof mock.method> | undefined;
  beforeEach(() => {
    const now = performance.now();
    clock = mock.method(performance, 'now', () => now);
  });
  afterEach(() => clock?.mock.restore());
  type Chart = {
    units: OwnUnit[];
    markNames: Container;
    markBoxesTried: number;
    markHolds: Map<string, { mode: number; at: number }>;
    tracked: Map<number, { firstSeenMs: number }>;
    drawnPosition(unit: OwnUnit): { x: number; y: number; depth: number };
    hullDrawScale(): number;
  };
  type Box = { x0: number; y0: number; x1: number; y1: number };
  type Mark = { id: string; name: string; x: number; y: number; radiusM: number };
  type Segment = [number, number, number, number];
  type World = Booted;

  /** The water at UI scale `s`: right of the ribbon's column, between the strip and the hint line. */
  const waterAt = (s = 1): Box => ({
    x0: RIBBON_UNITS * s,
    y0: TOP_BAR_HEIGHT * s,
    x1: 1280,
    y1: 720 - (CONSOLE_HEIGHT + HINT_LINE_HEIGHT) * s,
  });
  const WATER = waterAt();
  /** How far outside its ring a name stands. */
  const GAP = 4;
  /** The head-of-water placement's index (`MARK_HEAD`), as `markHolds` records it. */
  const HEAD = 1;

  const missionOf = (marks: Mark[]): MissionView => ({
    missionId: 'sorrowgate',
    tick: 0,
    objectives: marks.map((mark) => ({
      id: `row-${mark.id}`,
      text: 'Hold there.',
      status: ObjectiveStatus.Pending,
      markerId: mark.id,
    })),
    markers: marks.map((mark) => ({ ...mark, label: `${mark.name}.` })),
    locks: [],
    held: [],
    sigBudget: 20,
    debtS: 0,
  });

  /** The canned match with these markers' rows open, the camera framed, then drawn. */
  async function placed(
    marks: Mark[],
    frame: (world: World) => void,
    before?: (world: World) => void
  ): Promise<World> {
    const world = await boot();
    before?.(world);
    world.frame(2);
    world.chart.setMissionMarkers(missionOf(marks));
    frame(world);
    world.frame(2);
    return world;
  }

  const chartOf = (world: World) => world.chart as unknown as Chart;

  /** Every name on the chart, as the box it is drawn in: anchored at the foot's centre. */
  const nameBoxes = (world: World): Array<Box & { text: string }> =>
    (chartOf(world).markNames.children as Text[])
      .filter((name) => name.visible)
      .map((name) => ({
        text: name.text,
        x0: name.x - name.width / 2,
        y0: name.y - name.height,
        x1: name.x + name.width / 2,
        y1: name.y,
      }));

  /**
   * A ring as the chart draws it: 48 segments on the seabed, cut at the rim,
   * each kept where both ends are in front of the eye.
   */
  function ringOf(world: World, mark: Mark): Segment[] {
    const bounds = world.conn.inkBounds();
    const span: [number, number] = [0, 0];
    const segments: Segment[] = [];
    for (let i = 1; i <= 48; i++) {
      const a = ((i - 1) / 48) * Math.PI * 2;
      const b = (i / 48) * Math.PI * 2;
      let ax = mark.x + Math.cos(a) * mark.radiusM;
      let ay = mark.y + Math.sin(a) * mark.radiusM;
      let bx = mark.x + Math.cos(b) * mark.radiusM;
      let by = mark.y + Math.sin(b) * mark.radiusM;
      if (bounds !== null) {
        if (!clipSegment(bounds, ax, ay, bx, by, span)) continue;
        [ax, ay, bx, by] = [
          ax + (bx - ax) * span[0],
          ay + (by - ay) * span[0],
          ax + (bx - ax) * span[1],
          ay + (by - ay) * span[1],
        ];
      }
      const p = world.conn.projectPoint(ax, ay, null);
      const q = world.conn.projectPoint(bx, by, null);
      if (p.visible && q.visible) segments.push([p.x, p.y, q.x, q.y]);
    }
    return segments;
  }

  /** The highest point of a drawn ring on the screen. */
  const highest = (ring: Segment[]): { x: number; y: number } =>
    ring
      .flatMap(([ax, ay, bx, by]) => [
        { x: ax, y: ay },
        { x: bx, y: by },
      ])
      .reduce((top, p) => (p.y < top.y ? p : top));

  /**
   * Whether a box is centred over a point. Within 3 px: a name over a vertex
   * stands off the segment that ends there, and the terrain tilts it.
   */
  const centredOver = (box: Box, p: { x: number; y: number }): boolean =>
    Math.abs((box.x0 + box.x1) / 2 - p.x) <= 3;
  /** Whether any of a drawn ring is on the canvas. */
  const onCanvas = (ring: Segment[]): boolean =>
    ring.some(([ax, ay, bx, by]) =>
      clipSegment({ x: 0, y: 0, widthM: 1280, heightM: 720 }, ax, ay, bx, by, [0, 0])
    );
  const crosses = (box: Box, ring: Segment[]): boolean => {
    const rect = { x: box.x0, y: box.y0, widthM: box.x1 - box.x0, heightM: box.y1 - box.y0 };
    return ring.some(([ax, ay, bx, by]) => clipSegment(rect, ax, ay, bx, by, [0, 0]));
  };

  /** Whether a screen point lies inside the ring's whole outline; null when some of it is behind the eye. */
  function insideRing(world: World, mark: Mark, px: number, py: number): boolean | null {
    const outline: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const p = world.conn.projectPoint(
        mark.x + Math.cos(a) * mark.radiusM,
        mark.y + Math.sin(a) * mark.radiusM,
        null
      );
      if (!p.visible) return null;
      outline.push({ x: p.x, y: p.y });
    }
    let inside = false;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const a = outline[i]!;
      const b = outline[j]!;
      if (a.y > py !== b.y > py && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) {
        inside = !inside;
      }
    }
    return inside;
  }

  /** Within the water, give or take the pixel the name's position is rounded by. */
  const inWater = (box: Box, water = WATER): boolean =>
    box.x0 >= water.x0 - 1 &&
    box.y0 >= water.y0 - 1 &&
    box.x1 <= water.x1 + 1 &&
    box.y1 <= water.y1 + 1;
  const meets = (a: Box, b: Box): boolean =>
    a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1;
  /** The box the rule before #1662 drew a name in: centred, 4 px over a point. */
  const over = (p: { x: number; y: number }, like: Box): Box => {
    const w = like.x1 - like.x0;
    const h = like.y1 - like.y0;
    return { x0: p.x - w / 2, y0: p.y - GAP - h, x1: p.x + w / 2, y1: p.y - GAP };
  };

  /** The rule's three promises for every name drawn: on the water, off its own line, out of its ring. */
  function holdsTheRule(world: World, mark: Mark, box: Box, water = WATER): void {
    const where = `${mark.id} at ${JSON.stringify(world.conn.frame)}`;
    assert.ok(inWater(box, water), `${where}: the name left the water, ${JSON.stringify(box)}`);
    assert.ok(!crosses(box, ringOf(world, mark)), `${where}: the name crosses its own ring`);
    if (chartOf(world).markHolds.get(mark.id)?.mode === HEAD) return;
    const inside = insideRing(world, mark, (box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2);
    assert.notEqual(inside, true, `${where}: the name stands inside its ring`);
  }

  const QUIET: Mark = { id: 'arch', name: 'The arch', x: 1000, y: 3000, radiusM: 350 };

  /**
   * A committed model, parsed as the loader would. The runner's manifest is
   * empty, so a test hands one to its handle itself (inkOcclusion.test.ts).
   * These two carry no image for the loader to decode.
   */
  async function parsedModel(slug: string) {
    const bytes = readFileSync(
      new URL(`../../../docs/concept-art/models/${slug}.glb`, import.meta.url)
    );
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return (await new GLTFLoader().parseAsync(buffer, '')).scene;
  }

  it('stands straight over the top of a ring with nothing on it, at the first box tried', async () => {
    const world = await placed([QUIET], (w) => w.chart.focusOn(QUIET.x, QUIET.y));
    try {
      const [box] = nameBoxes(world);
      assert.ok(box !== undefined, 'the name is drawn');
      const top = highest(ringOf(world, QUIET));
      assert.ok(centredOver(box, top), 'centred over the top');
      assert.ok(Math.abs(box.y1 - (top.y - GAP)) <= 1, `${GAP} px over it`);
      assert.equal(chartOf(world).markBoxesTried, 1, 'and nothing was in the way');
      holdsTheRule(world, QUIET, box);
    } finally {
      world.teardown();
    }
  });

  it('steps along the ring off an own hull standing on its top, collar and all', async () => {
    // The Corvette at (800, 900) stands on this ring's top.
    const mark: Mark = { ...QUIET, x: 800, y: 1250 };
    const world = await placed([mark], (w) => w.chart.focusOn(mark.x, mark.y));
    try {
      const chart = chartOf(world);
      const hull = chart.units.find((unit) => unit.id === 11)!;
      const at = chart.drawnPosition(hull);
      const p = world.conn.projectPoint(at.x, at.y, at.depth);
      const collar =
        collarRadius((HULL_LENGTH_M[hull.kind] / 2) * chart.hullDrawScale(), SELECTION_GAP_M.HULL) *
        p.pxPerM;
      const onCollar = (box: Box): boolean =>
        Math.hypot(
          Math.max(box.x0 - p.x, 0, p.x - box.x1),
          Math.max(box.y0 - p.y, 0, p.y - box.y1)
        ) < collar;
      const [box] = nameBoxes(world);
      assert.ok(box !== undefined, 'the name is drawn');
      assert.ok(onCollar(over(highest(ringOf(world, mark)), box)), 'the premise: the top is taken');
      assert.ok(!onCollar(box), 'the name sits on the hull it is drawn round');
      holdsTheRule(world, mark, box);
    } finally {
      world.teardown();
    }
  });

  it("keeps off a structure's model", async () => {
    const template = buildTemplate(await parsedModel('bastion-bathyarch'), {
      structure: StructureKind.Bastion,
      faction: Faction.Bathyarch,
    });
    // The Bastion at (600, 600) stands over this ring's top: the frame
    // `chord-standing-wave.jpg` caught, where it swallowed "The Fifth".
    const mark: Mark = { ...QUIET, x: 600, y: 950 };
    const world = await placed(
      [mark],
      (w) => w.chart.focusOn(mark.x, mark.y),
      (w) => {
        // The runner's model manifest is empty, so the model is handed to its
        // handle as the loader would, as inkOcclusion.test.ts does.
        const handles = (w.conn as unknown as { structureHandles: Map<number, unknown> })
          .structureHandles;
        const handle = handles.get(21) as { model: unknown; modelKey: string };
        handle.model = instantiate(template);
        handle.modelKey = 'test';
        w.conn.applySnapshot(cannedSnapshot());
      }
    );
    try {
      const [box] = nameBoxes(world);
      assert.ok(box !== undefined, 'the name is drawn');
      const old = over(highest(ringOf(world, mark)), box);
      assert.ok(
        world.conn.inkCrossesHulls(old.x0, old.y0, old.x1, old.y1, new Set()),
        'the premise'
      );
      assert.ok(
        !world.conn.inkCrossesHulls(box.x0, box.y0, box.x1, box.y1, new Set()),
        'on the model'
      );
      holdsTheRule(world, mark, box);
    } finally {
      world.teardown();
    }
  });

  const WIDE: Mark = { id: 'rest', name: 'The Rest', x: 2000, y: 2000, radiusM: 1900 };

  it('names a ring wider than the view beside where it comes in', async () => {
    const world = await placed([WIDE], (w) => w.conn.focusWorld(2000, 1200, 2600));
    try {
      const [box] = nameBoxes(world);
      assert.ok(box !== undefined, 'a ring on the water went unnamed');
      const top = over(highest(ringOf(world, WIDE)), box);
      assert.ok(!inWater(top), 'the premise: there is no room over its top');
      holdsTheRule(world, WIDE, box);
    } finally {
      world.teardown();
    }
  });

  it('keeps out from under the floating panels', async () => {
    const world = await placed([WIDE], (w) => w.conn.focusWorld(2000, 2000, 2600));
    try {
      // The orders panel and the contact log at 1280 wide (App.css).
      const panels = [
        { x: 67, y: 60, width: 340, height: 300 },
        { x: 930, y: 60, width: 340, height: 216 },
      ];
      const under = (box: Box): boolean =>
        panels.some((r) => meets(box, { x0: r.x, y0: r.y, x1: r.x + r.width, y1: r.y + r.height }));
      const [bare] = nameBoxes(world);
      assert.ok(bare !== undefined && under(bare), 'the premise: the ring comes in under a panel');
      world.chart.setPanelRects(panels);
      world.frame(2);
      const [box] = nameBoxes(world);
      assert.ok(box !== undefined, 'the name went with the panels');
      assert.ok(!under(box), 'the name is under a panel');
      holdsTheRule(world, WIDE, box);
    } finally {
      world.teardown();
    }
  });

  it('names the ring a view stands inside at the head of the water', async () => {
    const world = await placed([WIDE], (w) => w.conn.focusWorld(2000, 2000, 250));
    try {
      assert.ok(!onCanvas(ringOf(world, WIDE)), 'the premise: none of the ring is in view');
      const [box] = nameBoxes(world);
      assert.ok(box !== undefined, 'the name is drawn');
      assert.ok(Math.abs(box.y0 - (WATER.y0 + GAP)) <= 1, 'at the head of the water');
      assert.ok(
        Math.abs((box.x0 + box.x1) / 2 - (WATER.x0 + WATER.x1) / 2) <= 1,
        'and centred on it'
      );
      holdsTheRule(world, WIDE, box);
    } finally {
      world.teardown();
    }
  });

  it('draws no name for a ring off the water with the view outside it', async () => {
    const far: Mark = { ...QUIET, x: 3500, y: 3500, radiusM: 200 };
    const world = await placed([far], (w) => w.conn.focusWorld(500, 500, 1500));
    try {
      // In front of the eye, so the compass rule drew its name off the canvas.
      const ring = ringOf(world, far);
      assert.ok(ring.length > 0, 'the premise: the ring is in front of the eye');
      assert.ok(!onCanvas(ring), 'the premise: and off the canvas');
      assert.deepEqual(nameBoxes(world), []);
    } finally {
      world.teardown();
    }
  });

  it('names a ring seen from outside on the outside of its near side', async () => {
    const lane: Mark = { id: 'lane', name: 'The shelf lane', x: 2000, y: 1500, radiusM: 1000 };
    const world = await placed([lane], (w) => w.conn.focusWorld(2000, 3200, 2600));
    try {
      assert.ok(highest(ringOf(world, lane)).y < WATER.y0, 'the premise: its top is off the water');
      const [box] = nameBoxes(world);
      assert.ok(box !== undefined, 'a ring on the water went unnamed');
      holdsTheRule(world, lane, box);
    } finally {
      world.teardown();
    }
  });

  it('names a ring the rim cuts over the line where it meets the rim', async () => {
    const rim: Mark = { ...QUIET, x: 2000, y: 250, radiusM: 500 };
    const world = await placed([rim], (w) => w.chart.focusOn(rim.x, rim.y));
    try {
      const ring = ringOf(world, rim);
      const [box] = nameBoxes(world);
      assert.ok(box !== undefined, 'the name is drawn');
      // Its north point is past the rim, so the compass rule stood the name
      // on the west point, astride the line.
      const west = world.conn.projectPoint(rim.x - rim.radiusM, rim.y, null);
      assert.ok(crosses(over(west, box), ring), 'the premise');
      // The ring meets the rim at 210° and 330°; the name stands over one.
      const cuts = [210, 330].map((deg) =>
        world.conn.projectPoint(rim.x + Math.cos((deg * Math.PI) / 180) * rim.radiusM, 0, null)
      );
      // Off the line by the gap along its normal, which on a shoulder leaves
      // the box's foot up to a name's height above the cut.
      const near = cuts.some(
        (p) =>
          box.y1 <= p.y &&
          Math.hypot(Math.max(box.x0 - p.x, 0, p.x - box.x1), p.y - box.y1) <=
            GAP + (box.y1 - box.y0) + 2
      );
      assert.ok(near, `the name is not over the rim cut, ${JSON.stringify(box)}`);
      holdsTheRule(world, rim, box);
    } finally {
      world.teardown();
    }
  });

  it("keeps a later marker's name off an earlier one's, and off both rings", async () => {
    const chord: Mark = { id: 'chord', name: 'The Chord', x: 2000, y: 2000, radiusM: 500 };
    const mouth: Mark = { id: 'mouth', name: 'The mouth', x: 2000, y: 2100, radiusM: 600 };
    const world = await placed([chord, mouth], (w) => w.chart.focusOn(2000, 2000));
    try {
      const boxes = nameBoxes(world);
      assert.deepEqual(
        boxes.map((box) => box.text),
        ['The Chord', 'The mouth']
      );
      const a = boxes[0]!;
      const b = boxes[1]!;
      const grown = {
        x0: a.x0 - GAP + 1,
        y0: a.y0 - GAP + 1,
        x1: a.x1 + GAP - 1,
        y1: a.y1 + GAP - 1,
      };
      assert.ok(!meets(grown, b), 'the names touch');
      for (const box of [a, b]) {
        assert.ok(!crosses(box, ringOf(world, chord)) && !crosses(box, ringOf(world, mouth)));
      }
      holdsTheRule(world, chord, a);
      holdsTheRule(world, mouth, b);
    } finally {
      world.teardown();
    }
  });

  it('holds its point while two stand level, as the camera sways', async () => {
    const at = (deg: number) => ({
      xM: QUIET.x,
      yM: QUIET.y,
      distanceM: 2600,
      yawDeg: deg,
      pitchDeg: 55,
    });
    /** Which of the ring's 48 vertices stands highest on the screen. */
    const topVertex = (world: World): number => {
      let best = 0;
      let bestY = Infinity;
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const p = world.conn.projectPoint(
          QUIET.x + Math.cos(a) * QUIET.radiusM,
          QUIET.y + Math.sin(a) * QUIET.radiusM,
          null
        );
        if (p.y < bestY) [best, bestY] = [i, p.y];
      }
      return best;
    };
    const world = await placed([QUIET], (w) => w.conn.setFrame(at(0)));
    try {
      // Turn until the top passes to the next vertex: there the two stand
      // level, and a tenth of a degree either way swaps which is higher.
      let deg = 0;
      const first = topVertex(world);
      while (deg < 15) {
        world.conn.setFrame(at(deg + 0.1));
        world.frame(1);
        if (topVertex(world) !== first) break;
        deg += 0.1;
      }
      assert.ok(deg < 15, 'the premise: the top passes to another vertex');
      const seen: number[] = [];
      const tops: number[] = [];
      for (const turn of [deg, deg + 0.1, deg, deg + 0.1]) {
        world.conn.setFrame(at(turn));
        world.frame(2);
        const [box] = nameBoxes(world);
        assert.ok(box !== undefined);
        seen.push((box.x0 + box.x1) / 2);
        tops.push(highest(ringOf(world, QUIET)).x);
      }
      assert.ok(
        Math.max(...tops) - Math.min(...tops) > 10,
        'the premise: the highest point swaps ends'
      );
      assert.ok(
        Math.max(...seen) - Math.min(...seen) <= 3,
        `the name hopped along its ring: ${seen.map((x) => x.toFixed(1)).join(', ')}`
      );
    } finally {
      world.teardown();
    }
  });

  // A track's model shows the instant it resolves, so the name waits for the
  // mark; once arrived, the model counts as well as the mark, because a
  // structure stands far above its mark — a Sounding Spire is 265 m tall. A
  // track whose model has not loaded is its mark alone, and so is a ghost.
  for (const track of [
    { as: 'a hull', slug: 'corvette-hadron', inside: 0 },
    { as: 'a tall structure', slug: 'sounding-spire-hadron', inside: 120 },
    { as: 'a mark with no model', slug: null, inside: 0 },
  ]) {
    it(`steps aside for ${track.as} only once its mark has arrived`, async () => {
      const template =
        track.slug === null
          ? null
          : buildTemplate(
              await parsedModel(track.slug),
              track.slug === 'corvette-hadron'
                ? { unit: UnitKind.Corvette, faction: Faction.Hadron }
                : { structure: StructureKind.SoundingSpire, faction: Faction.Hadron }
            );
      // The Tier-4 track laid on the seabed under this ring's top, or `inside`
      // metres in from it: there a structure's mark sits clear below the name
      // and only its model reaches up through it.
      const mark: Mark = { ...QUIET, x: 2800, y: 2950 - track.inside };
      const contactsOn = (world: World) => {
        const snapshot = cannedSnapshot();
        const seabed = world.conn.seabedDepthAt(2800, 2600);
        return {
          ...snapshot,
          contacts: snapshot.contacts.map((c) => {
            if (c.id !== 104) return c;
            if (track.slug !== 'sounding-spire-hadron') return { ...c, depth: seabed };
            const { kind: _kind, heading: _heading, ...rest } = c;
            return { ...rest, structure: StructureKind.SoundingSpire, depth: seabed };
          }),
        };
      };
      const world = await placed(
        [mark],
        (w) => w.chart.focusOn(mark.x, mark.y),
        (w) => {
          w.chart.applySnapshot(contactsOn(w));
          // Not yet arrived, whatever the runner's clock does meanwhile.
          chartOf(w).tracked.get(104)!.firstSeenMs = performance.now() + 60_000;
        }
      );
      try {
        // The model handed to the track's handle as the loader would.
        if (template !== null) {
          const conn = world.conn as unknown as {
            trackHandles: Map<number, { model: unknown; modelKey: string }>;
            syncTracks(): void;
          };
          const handle = conn.trackHandles.get(104);
          assert.ok(handle !== undefined, 'the premise: the track is drawn as a model');
          handle.model = instantiate(template);
          handle.modelKey = 'test';
          conn.syncTracks();
          world.chart.applySnapshot(contactsOn(world));
          world.frame(2);
        }
        // The mark's core: its figure and the bar and glyph above it.
        const p = world.conn.projectPoint(2800, 2600, world.conn.seabedDepthAt(2800, 2600));
        const core = { x0: p.x - 8, y0: p.y - 30, x1: p.x + 8, y1: p.y };
        const [before] = nameBoxes(world);
        assert.ok(before !== undefined, 'the name is drawn');
        assert.ok(
          template === null
            ? meets(before, core)
            : world.conn.inkCrosses(before.x0, before.y0, before.x1, before.y1),
          'the premise: the track stands under the name'
        );
        assert.ok(centredOver(before, highest(ringOf(world, mark))), 'it waits for the mark');
        chartOf(world).tracked.get(104)!.firstSeenMs = performance.now() - 60_000;
        world.chart.applySnapshot(contactsOn(world));
        world.frame(2);
        const [after] = nameBoxes(world);
        assert.ok(after !== undefined, 'the name is drawn');
        assert.ok(
          !world.conn.inkCrosses(after.x0, after.y0, after.x1, after.y1),
          "the name sits on the arrived track's model"
        );
        if (track.inside === 0) assert.ok(!meets(after, core), 'the name sits on the arrived mark');
        holdsTheRule(world, mark, after);
      } finally {
        world.teardown();
      }
    });
  }

  it('holds the rule at every yaw, pitch, dolly and UI scale, in bounded work', async () => {
    const marks: Mark[] = [
      { id: 'mid', name: 'The arch', x: 2000, y: 2000, radiusM: 350 },
      { id: 'rim', name: 'The service lock', x: 2000, y: 250, radiusM: 500 },
      WIDE,
    ];
    for (const mark of marks) {
      const world = await placed([mark], () => {});
      try {
        for (const scale of [1, 1.5]) {
          world.chart.setUiScale(scale);
          for (const yawDeg of [0, 90, 180, 270]) {
            for (const pitchDeg of [10, 55, 88]) {
              for (const distanceM of [250, 2600, 9000]) {
                world.conn.setFrame({ xM: mark.x, yM: mark.y, distanceM, yawDeg, pitchDeg });
                world.frame(2);
                // Every view stands at the ring's centre, inside it, so its
                // name is on the ring or at the head of the water: never gone.
                const boxes = nameBoxes(world);
                assert.equal(
                  boxes.length,
                  1,
                  `${mark.id} unnamed at ${JSON.stringify(world.conn.frame)}`
                );
                holdsTheRule(world, mark, boxes[0]!, waterAt(scale));
                // Two sides' points at most, plus the head's slots.
                assert.ok(chartOf(world).markBoxesTried <= 400, 'unbounded work');
              }
            }
          }
        }
      } finally {
        world.teardown();
      }
    }
  });

  it('is tested on the pixels it is drawn on, at any phase of the sway (#1681)', async () => {
    // The frame CI failed on once. The sway moved the line by a fraction of a
    // pixel, and at these instants a corner of the box tested stood under a
    // pixel off the line beside its point, so rounding the foot to the pixel
    // drew the name across it. The suite pins the runner's own instant, and
    // 24 of 4,000 frames swept (2,000 instants at two UI scales) put the sway
    // there: about one run in 170.
    clock?.mock.restore();
    let at = 0;
    clock = mock.method(performance, 'now', () => at);
    const world = await placed([WIDE], () => {});
    try {
      for (const now of [1874, 1967.7, 4872.4, 5809.4, 6746.4, 6840.1]) {
        at = now;
        world.conn.setFrame({ xM: WIDE.x, yM: WIDE.y, distanceM: 9000, yawDeg: 270, pitchDeg: 10 });
        world.frame(2);
        const [box] = nameBoxes(world);
        assert.ok(box !== undefined, `named at ${now} ms`);
        // The premise: placed along the line, where the sway moves it, not
        // at the head of the water, which is fixed to the screen.
        const hold = chartOf(world).markHolds.get(WIDE.id);
        assert.ok(hold !== undefined && hold.mode !== HEAD, `on the far side at ${now} ms`);
        holdsTheRule(world, WIDE, box);
      }
    } finally {
      world.teardown();
    }
  });
});

/**
 * A Harvester hull with its dredge struck — *Shift Change*'s crew barges
 * (docs/mission-shift-change.md §3, #1283). The server seats them without the
 * harvest loop, so they arrive with no throttle, and the shell used to read
 * "no throttle" as "a hull that fights": `0` gathered the crew into the army.
 * Driven through the real renderer, on the canned match with its one
 * harvester's dredge struck, against the same gestures a player makes.
 */
describe('a hull with its dredge struck (#1283)', () => {
  it('says so before the press, takes a field click as a move, and is no part of `0`', async () => {
    const world = await boot();
    try {
      const snapshot = cannedSnapshot();
      const harvesters = snapshot.units.filter((unit) => unit.kind === UnitKind.Harvester);
      assert.equal(harvesters.length, 1, 'the premise: the canned match fields one harvester');
      const { throttle: _t, cargo: _c, cargoKind: _k, ...barge } = harvesters[0]!;
      const struck = {
        ...snapshot,
        units: snapshot.units.map((unit) => (unit.id === barge.id ? barge : unit)),
      };
      world.chart.applySnapshot(struck);
      world.conn.applySnapshot(struck);
      world.chart.focusOn(barge.x, barge.y);
      world.frame(2);

      const canvas = world.app.canvas;
      const at = world.conn.projectPoint(barge.x, barge.y, barge.depth);
      assert.ok(at.visible, 'the camera is looking at the hull we are about to select');
      for (const type of ['pointerdown', 'pointerup']) {
        canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x,
          clientY: at.y,
        });
      }
      world.frame(1);
      const bar = textSaying(world.app.stage, 'dredge struck');
      assert.ok(bar !== null, 'nothing on screen says the dredge is struck');
      assert.ok(!bar.includes('RMB node'), `the bar still offers the field: ${bar}`);
      assert.ok(!bar.includes('torpedo'), `the bar offers a gunless hull a torpedo: ${bar}`);

      // A right click on the field is a move for it, never a harvest order.
      const node = cannedNodes()[0]!;
      const onField = world.conn.projectPoint(node.x, node.y, node.depth);
      for (const type of ['pointerdown', 'pointerup']) {
        canvas.dispatch(type, {
          button: 2,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: onField.x,
          clientY: onField.y,
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        });
      }
      const sent = world.log.names();
      assert.ok(!sent.includes('onHarvestOrder'), 'a struck dredge was sent to work a field');
      assert.ok(
        sent.includes('onMoveOrder'),
        `the field click went nowhere, saw ${sent.join(', ')}`
      );

      // `0`: every hull that fights, which is every hull here but the barge.
      dispatchWindow('keydown', { code: 'Digit0' });
      world.frame(1);
      const army = `${struck.units.length - 1} selected`;
      assert.ok(
        textSaying(world.app.stage, army) !== null,
        `\`0\` took the barge into the army, or left a fighter out: wanted ${army}`
      );
    } finally {
      world.teardown();
    }
  });
});

/**
 * Doctrine marks — docs/ui-ux.md §12.5. The navy's glyph, in its console
 * accent, beside a number its doctrine bends, while the bend is live; the
 * selection and command cards' rules take the same ink as the legend.
 *
 * Read off the draw instructions: a mark is a stroke in the accent on the
 * selection card, and a rule is a 1 px fill in the accent across a block.
 */
describe('doctrine marks (docs/ui-ux.md §12.5)', () => {
  type Chart = { selected: Set<number>; infoGraphics: Graphics; hudGraphics: Graphics };
  const chartOf = (world: Booted) => world.chart as unknown as Chart;
  const accentOf = (faction: Faction) => FACTION_PALETTE[faction].consoleAccent;

  /** Every stroke on the selection card in `color`, by the rect or path it bounds. */
  const marksIn = (world: Booted, color: number) =>
    chartOf(world).infoGraphics.context.instructions.filter(
      (instruction) =>
        instruction.action === 'stroke' &&
        (instruction.data.style as { color: number }).color === color
    );

  /** The 1 px block rules filled in `color`. */
  const rulesIn = (world: Booted, color: number) =>
    chartOf(world)
      .hudGraphics.context.instructions.filter(
        (instruction) =>
          instruction.action === 'fill' &&
          (instruction.data.style as { color: number }).color === color
      )
      .flatMap((instruction) =>
        ((instruction.data as { path?: GraphicsPath }).path?.instructions ?? []).filter(
          (step) => step.action === 'rect' && (step.data as number[])[3] === 1
        )
      );

  /** The canned match with the Corvette selected, as `faction`, with `patch` on it. */
  async function selected(faction: Faction, patch: Partial<OwnUnit>): Promise<Booted> {
    const world = await boot();
    world.chart.setIdentity(0, faction);
    const base = cannedSnapshot(301);
    world.chart.applySnapshot({
      ...base,
      units: base.units.map((unit) => (unit.id === 11 ? { ...unit, ...patch } : unit)),
    });
    chartOf(world).selected.add(11);
    world.frame(2);
    return world;
  }

  it('inks the selection and command rules, and only those two', async () => {
    const world = await selected(Faction.Bathyarch, {});
    try {
      assert.equal(rulesIn(world, accentOf(Faction.Bathyarch)).length, 2);
      assert.ok(rulesIn(world, UI.accent).length > 0, 'the other blocks keep the cyan rule');
    } finally {
      world.teardown();
    }
  });

  it('lights the Klaxon beside SIG only while the SIG is over 60', async () => {
    const ink = accentOf(Faction.Bathyarch);
    for (const [sig, lit] of [
      [48, false],
      [60, false],
      [61, true],
    ] as const) {
      const world = await selected(Faction.Bathyarch, { sig });
      try {
        assert.equal(marksIn(world, ink).length > 0, lit, `SIG ${sig}`);
      } finally {
        world.teardown();
      }
    }
  });

  it('stands the Klaxon mark between the SIG it marks and the next word', async () => {
    const world = await selected(Faction.Bathyarch, { sig: 72 });
    try {
      const line = (world.chart as unknown as { infoLine1: Text }).infoLine1;
      const cell = line.width / line.text.length;
      const sigEnd = line.x + cell * (line.text.indexOf('SIG 72') + 'SIG 72'.length);
      const torp = line.x + cell * line.text.indexOf('TORP');
      // The mark's own strokes, not the card's bounds: the hull bar alone
      // spans most of the card and would pass any test of the whole.
      const marks = marksIn(world, accentOf(Faction.Bathyarch));
      assert.ok(marks.length > 0, 'the premise: a mark');
      for (const mark of marks) {
        const box = (mark.data as { path: GraphicsPath }).path.bounds;
        assert.ok(box.minX >= sigEnd, `the mark starts past SIG 72 (${box.minX} < ${sigEnd})`);
        assert.ok(box.maxX <= torp, `the mark ends before TORP (${box.maxX} > ${torp})`);
        assert.ok(
          box.maxY >= line.y && box.minY <= line.y + line.height,
          'the mark shares the line it marks'
        );
      }
    } finally {
      world.teardown();
    }
  });

  it("prints Silent Running's speed penalty, and marks the Commune's alone", async () => {
    // docs/ui-ux.md §7: the live penalty as a number on a line of its own, the
    // Commune's the same number with its mark. SIG 8 keeps the Klaxon out.
    type Card = { infoLine1: Text; infoLine3: Text };
    const card = (world: Booted) => world.chart as unknown as Card;
    const commune = await selected(Faction.Pelagia, { silentRunning: true, sig: 8 });
    try {
      const line = card(commune).infoLine3;
      assert.ok(line.visible && line.text === 'SPEED −20%', `the Commune pays −20%: ${line.text}`);
      assert.ok(!card(commune).infoLine1.text.includes('SPEED'), 'the first line keeps its room');
      const end = line.x + line.width;
      const marks = marksIn(commune, accentOf(Faction.Pelagia));
      assert.ok(marks.length > 0, 'the Commune penalty wears its mark');
      for (const mark of marks) {
        const box = (mark.data as { path: GraphicsPath }).path.bounds;
        assert.ok(box.minX >= end, `the mark stands past the penalty (${box.minX} < ${end})`);
        assert.ok(box.maxY >= line.y && box.minY <= line.y + line.height, 'on the line it marks');
      }
    } finally {
      commune.teardown();
    }
    const consortium = await selected(Faction.Bathyarch, { silentRunning: true, sig: 8 });
    try {
      assert.equal(card(consortium).infoLine3.text, 'SPEED −45%', 'everybody else pays −45%');
      assert.equal(marksIn(consortium, accentOf(Faction.Bathyarch)).length, 0, 'unbent: no mark');
    } finally {
      consortium.teardown();
    }
    const loud = await selected(Faction.Pelagia, { silentRunning: false, sig: 30 });
    try {
      assert.equal(card(loud).infoLine3.visible, false, 'no penalty while not silent');
      assert.equal(marksIn(loud, accentOf(Faction.Pelagia)).length, 0);
    } finally {
      loud.teardown();
    }
  });

  it('prints no speed penalty for a hull with its engine off', async () => {
    const world = await selected(Faction.Pelagia, { silentRunning: true, engineOff: true, sig: 4 });
    try {
      const line = (world.chart as unknown as { infoLine3: Text }).infoLine3;
      assert.equal(line.visible, false, `an engine-off hull is not moving: ${line.text}`);
      assert.equal(marksIn(world, accentOf(Faction.Pelagia)).length, 0);
    } finally {
      world.teardown();
    }
  });

  /**
   * The canned match as `faction`, with `ids` clicked on the conn view the way
   * a player selects them, shift adding — the click is what opens the SQUAD
   * page the ENGAGE cell lives on, and a bare `selected.add` never does.
   */
  async function selecting(faction: Faction, ids: number[]): Promise<Booted> {
    const world = await boot();
    world.chart.setIdentity(0, faction);
    world.frame(2);
    ids.forEach((id, i) => {
      const unit = cannedSnapshot().units.find((u) => u.id === id)!;
      world.chart.focusOn(unit.x, unit.y);
      world.frame(2);
      const at = world.conn.projectPoint(unit.x, unit.y, unit.depth);
      assert.ok(at.visible, `the camera is looking at hull ${id}`);
      for (const type of ['pointerdown', 'pointerup']) {
        world.app.canvas.dispatch(type, {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x,
          clientY: at.y,
          shiftKey: i > 0,
        });
      }
      world.frame(1);
    });
    assert.deepEqual([...chartOf(world).selected].sort(), [...ids].sort(), 'the premise');
    world.frame(2);
    return world;
  }

  type Bar = {
    barButtons: Array<{ label: string; price?: string; x: number; w: number }>;
    barGraphics: Graphics;
    barPriceTexts: Text[];
  };
  const barOf = (world: Booted) => world.chart as unknown as Bar;
  const engage = (world: Booted) => barOf(world).barButtons.find((b) => b.label === 'ENGAGE');

  it('prices ENGAGE in loudness: the loudest shot in the selection (§9)', async () => {
    for (const [ids, price] of [
      [[11], '+25 SIG'],
      [[12], '+15 SIG'],
      [[11, 12], '+25 SIG'],
      [[13], undefined],
    ] as const) {
      const world = await selecting(Faction.Bathyarch, [...ids]);
      try {
        assert.equal(engage(world)?.price, price, `selection ${ids.join(', ')}`);
        const shown = barOf(world)
          .barPriceTexts.filter((t) => t.visible)
          .map((t) => t.text);
        assert.deepEqual(shown, price === undefined ? [] : [price], 'only ENGAGE prints one');
      } finally {
        world.teardown();
      }
    }
  });

  it("marks the Knights' +10 beside the price, inside its cell, and no one else's", async () => {
    const strokesIn = (world: Booted, color: number) =>
      barOf(world).barGraphics.context.instructions.filter(
        (instruction) =>
          instruction.action === 'stroke' &&
          (instruction.data.style as { color: number }).color === color
      );
    const knights = await selecting(Faction.Hadron, [11]);
    try {
      const cell = engage(knights)!;
      assert.equal(cell.price, '+10 SIG', 'the energy shot');
      const price = barOf(knights).barPriceTexts.find((t) => t.visible)!;
      const priceEnd = price.x + price.width / 2;
      const marks = strokesIn(knights, accentOf(Faction.Hadron));
      assert.ok(marks.length > 0, "the Knights' price wears its mark");
      for (const mark of marks) {
        const box = (mark.data as { path: GraphicsPath }).path.bounds;
        assert.ok(box.minX >= priceEnd, `past the price (${box.minX} < ${priceEnd})`);
        assert.ok(box.maxX <= cell.x + cell.w, 'inside the cell');
      }
    } finally {
      knights.teardown();
    }
    const consortium = await selecting(Faction.Bathyarch, [11]);
    try {
      assert.equal(
        strokesIn(consortium, accentOf(Faction.Bathyarch)).length,
        0,
        'kinetic: no mark'
      );
    } finally {
      consortium.teardown();
    }
  });

  it('never lights the Klaxon on a loud hull with no gun', async () => {
    // The canned Harvester runs at SIG 62: over the line, and no gun to pay.
    const world = await boot();
    try {
      world.chart.setIdentity(0, Faction.Bathyarch);
      chartOf(world).selected.add(13);
      world.frame(2);
      const line = (world.chart as unknown as { infoLine1: Text }).infoLine1;
      assert.ok(line.text.includes('SIG 62'), `the premise: the card reads ${line.text}`);
      assert.equal(marksIn(world, accentOf(Faction.Bathyarch)).length, 0);
    } finally {
      world.teardown();
    }
  });

  it('lights the Klaxon on a loud turret, and never on a structure with no gun', async () => {
    const structureAt = async (kind: StructureKind): Promise<Booted> => {
      const world = await boot();
      world.chart.setIdentity(0, Faction.Bathyarch);
      const base = cannedSnapshot(301);
      world.chart.applySnapshot({
        ...base,
        structures: base.structures.map((s) => (s.id === 22 ? { ...s, kind, sig: 70 } : s)),
      });
      chartOf(world).selected.add(22);
      world.frame(2);
      return world;
    };
    const ink = accentOf(Faction.Bathyarch);
    for (const [kind, lit] of [
      [StructureKind.SentinelTurret, true],
      [StructureKind.Refinery, false],
    ] as const) {
      const world = await structureAt(kind);
      try {
        const line = (world.chart as unknown as { infoLine1: Text }).infoLine1;
        assert.ok(line.text.includes('SIG 70'), `the premise: the card reads ${line.text}`);
        assert.equal(marksIn(world, ink).length > 0, lit, `${kind} at SIG 70`);
      } finally {
        world.teardown();
      }
    }
  });

  it("waits on the SOUR line, rather than marking the Lid's depth or the separator", async () => {
    // `SOUR — BLEEDING at 50m · dive below 150m`: the hull's `50m` has a `·`
    // a cell after it, so there is no room, and the `50m` at the tail of the
    // Lid's `150m` is not the hull's depth.
    const world = await selected(Faction.Directorate, {
      depth: 50,
      sourS: LID.GRACE_S + 5,
      pressureRating: 3,
    });
    try {
      const line = (world.chart as unknown as { infoLine2: Text }).infoLine2;
      assert.ok(line.text.startsWith('SOUR'), `the premise: the SOUR line, not ${line.text}`);
      assert.equal(marksIn(world, accentOf(Faction.Directorate)).length, 0);
    } finally {
      world.teardown();
    }
  });

  it('marks a Directorate depth above 400 m, and not below it', async () => {
    const ink = accentOf(Faction.Directorate);
    for (const [depth, lit] of [
      [300, true],
      [1200, false],
    ] as const) {
      const world = await selected(Faction.Directorate, { depth, pressureRating: 3 });
      try {
        assert.equal(marksIn(world, ink).length > 0, lit, `${depth} m`);
      } finally {
        world.teardown();
      }
    }
  });

  it('marks no depth the card does not print as where the hull is', async () => {
    // Diving from the shallows prints where the hull is going, not where it
    // is, so there is no depth on the card for the mark to stand beside. A
    // target of 1,300 m carries the current `300m` inside its own text, which
    // is the case a search for the token alone would mark.
    const world = await selected(Faction.Directorate, {
      depth: 300,
      depthOrder: 1300,
      pressureRating: 3,
    });
    try {
      assert.equal(marksIn(world, accentOf(Faction.Directorate)).length, 0);
    } finally {
      world.teardown();
    }
  });

  it("marks only the player's own navy's doctrine", async () => {
    // A Consortium hull in the shallows is not poisoned by them, so it wears
    // no Directorate mark, nor a Consortium one at a quiet SIG.
    const world = await selected(Faction.Bathyarch, { depth: 300, sig: 20 });
    try {
      assert.equal(marksIn(world, accentOf(Faction.Directorate)).length, 0);
      assert.equal(marksIn(world, accentOf(Faction.Bathyarch)).length, 0);
    } finally {
      world.teardown();
    }
  });
});
