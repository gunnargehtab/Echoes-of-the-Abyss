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
import { describe, it, mock } from 'node:test';
import { CanvasTextMetrics, Container, Graphics, Text, type GraphicsPath } from 'pixi.js';
import { Faction, MovementHoldReason, SIM, StructureKind } from '@echoes/shared';
import { FOCUS_STEP_M, HOME_PITCH_DEG } from '../src/game/PerspectiveView.ts';
import {
  createHost,
  dispatchWindow,
  drawInstructions,
  carryRasterised,
  fireResizeObservers,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
  setCoarsePointer,
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
} from './support/cannedMatch.ts';
import { EchoRenderer, type RendererCallbacks } from '../src/game/EchoRenderer.ts';
import type { ReadoutBox } from '../src/game/readouts.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { BufferAttribute, FogExp2, Mesh, Points, type Scene } from 'three';

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

/**
 * The probes every test below reads the HUD through, held to the one promise
 * that separates them (#826): a budget counts every label the client pays
 * for, and a contract quotes only the ones on the glass. Hand-built rather
 * than booted, so a failure here is the probe's and not the renderer's.
 */
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
 * The one mesh in the conn scene carrying a vertex-colour attribute: the
 * terrain. Found rather than reached for, because the view owns its own scene
 * graph and a test that indexed into `children` would break on any reorder.
 */
function terrainMesh(scene: Scene | null): Mesh {
  assert.ok(scene !== null, 'the conn rendered at least once');
  let found: Mesh | null = null;
  scene.traverse((object) => {
    if (found !== null || !(object instanceof Mesh)) return;
    if (object.geometry.getAttribute('color') !== undefined) found = object;
  });
  assert.ok(found !== null, 'the ground carries the veil as a vertex colour');
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

  it('lets the ground go cold where nothing of the fleet is listening (#472)', async () => {
    const world = await boot();
    try {
      world.frame(3);
      loneListener(world);

      const ground = terrainMesh(world.gl.lastScene);
      const shades = ground.geometry.getAttribute('color') as BufferAttribute;
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

      // Gate 6: a vertex colour on a mesh that was already there. The veil
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

describe('renderer smoke test: the water', () => {
  /** Every Points cloud in the conn scene, by how it is built: the embers
   * carry a colour attribute the snow has no use for. */
  function clouds(scene: Scene | null): { embers: Points | null; snow: Points | null } {
    assert.ok(scene !== null, 'the conn rendered at least once');
    let embers: Points | null = null;
    let snow: Points | null = null;
    scene.traverse((object) => {
      if (!(object instanceof Points)) return;
      if (object.geometry.getAttribute('snowSize') !== undefined) snow = object;
      else embers = object;
    });
    return { embers, snow };
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
        canvas.dispatch('pointerdown', {
          button: 2,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: onField.x,
          clientY: onField.y,
          shiftKey: false,
          ctrlKey: false,
          metaKey: false,
        });

        // Right-click open water, the same screen offset the plain move-order
        // case below uses to clear this very node.
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
        canvas.dispatch('pointerdown', {
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: at.x + 140,
          clientY: at.y + 60,
          shiftKey: false,
        });
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
   * The held harvester's line named a key on a touchscreen — #722.
   *
   * Every other line in `hintLine` splits on `isTouch`; this one returned
   * before the split, so a touch player read `held — not released yet · V
   * throttle` and had no `V` to press. The comment above that block argues a
   * bar hiding a working key is a silent lie; naming a dead one is the same
   * lie the other way, and §7's "with a reason attached, never silently" is
   * about what the player in front of this screen can actually do.
   *
   * The throttle is not gone on touch — it is the `THR` button on the command
   * bar — so the line points there, as the transport line one branch up
   * already does with `LAND to unload`.
   */
  it('names no keyboard key on a touchscreen, on the one held line that did', async () => {
    setCoarsePointer(true);
    try {
      const world = await boot();
      try {
        const snapshot = cannedSnapshot();
        const harvester = snapshot.units.find((unit) => unit.throttle !== undefined);
        assert.ok(harvester !== undefined, 'the canned match has no harvester to hold');
        world.chart.setMissionHolds([
          { unitId: harvester.id, reason: MovementHoldReason.Unreleased },
        ]);
        world.chart.focusOn(harvester.x, harvester.y);
        world.frame(2);

        const canvas = world.app.canvas;
        const at = world.conn.projectPoint(harvester.x, harvester.y, harvester.depth);
        assert.ok(at.visible, 'the camera is looking at the hull we are about to select');
        for (const type of ['pointerdown', 'pointerup']) {
          canvas.dispatch(type, {
            button: 0,
            pointerId: 1,
            pointerType: 'touch',
            clientX: at.x,
            clientY: at.y,
          });
        }
        world.frame(1);

        const line = textSaying(world.app.stage, 'harvester [');
        assert.ok(line !== null, 'the hint bar never described the held harvester');
        assert.ok(!/\bV throttle\b/.test(line), `a touchscreen was told to press a key: ${line}`);
        // And not silent either: §7 wants the affordance that exists named,
        // which is the command bar's own button.
        assert.match(line, /THR/);
      } finally {
        world.teardown();
      }
    } finally {
      setCoarsePointer(false);
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

  it('gives each readout a control taller than its glyphs, for a touch player', async () => {
    const booted = await boot();
    booted.chart.setStatus('connected');
    booted.frame();
    const boxes = booted.log.calls.filter((call) => call.name === 'onReadouts').at(-1)!
      .args[0] as ReadoutBox[];

    // §2 sets the console's height by §11's 44 px touch floor — "a console row
    // is a touch target" — and the strip's drawn glyphs are 11-13 px tall. The
    // strip holds two rows in 52 px, so 44 apiece cannot be had without the
    // rows overlapping; half the floor is what is reachable, and it is what is
    // asserted. The bar is in CSS pixels, which is what a finger is measured in.
    for (const box of boxes) {
      assert.ok(box.height >= 26, `${box.key} is ${box.height} px tall — not a touch target`);
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

/**
 * #815 — the card is offered more than its twelve cells hold, and what went
 * used to be whatever `buildBarModel` pushed last. For any hull carrying
 * torpedoes — ten of them, the Corvette and the Cruiser among them — that was
 * the depth charge, and on a touchscreen the card is the only route to an
 * order at all (docs/ui-ux.md §2).
 *
 * The two halves of the fix are asserted together because either alone leaves
 * the Corvette one cell over: the torpedo count is a readout and leaves the
 * order grid, and what remains yields in the order §9 writes down.
 */
describe('the command card when it is offered more than it holds', () => {
  /** Click a hull on the conn view, the way the attack-move tests do. */
  const selectHull = (
    world: Booted,
    unit: { x: number; y: number; depth: number },
    add = false
  ): void => {
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
  };

  it('keeps every order a torpedo hull can give, and moves the count to the stat line', async () => {
    const world = await boot();
    try {
      const corvette = cannedSnapshot().units.find((unit) => unit.torpedoes !== undefined);
      assert.ok(corvette !== undefined, 'the canned match has no hull carrying torpedoes');
      selectHull(world, corvette);

      const lines = textContents(world.app.stage);
      // The squad page's twelve orders. CHARGE is the one #815 lost.
      for (const label of [
        'SILENT',
        'DRIVE OFF',
        'PING',
        'DIVE',
        'RISE',
        'FOLLOW',
        'ENGAGE',
        'STOP',
        'HOLD',
        'DECOY',
        'MINE',
        'CHARGE',
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
      world.frame(3);
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
            const groundDepth = world.conn.seabedDepthAt(eye.xM, eye.zM);
            assert.ok(
              eye.depthM <= groundDepth - 24,
              `eye at ${eye.depthM} m under ground at ${groundDepth} m ` +
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
      world.conn.raiseFocusBy(-20_000);
      assert.equal(rig().focus.depthM, Math.round(seabed), 'and on the seabed');
    } finally {
      world.teardown();
    }
  });

  it('turns on a twist without knowing what a pixel of drag is worth', async () => {
    const world = await boot();
    try {
      world.frame(3);
      world.conn.home();
      // The touch dialect has no Shift and no wheel, so the yaw arrives as an
      // angle off two fingers.
      world.conn.yawBy(Math.PI / 2);
      assert.equal(rig().yawDeg, 90, 'a quarter turn is a quarter turn');
      assert.equal(rig().pitchDeg, HOME_PITCH_DEG, 'and a twist is not a tilt');
    } finally {
      world.teardown();
    }
  });
});
