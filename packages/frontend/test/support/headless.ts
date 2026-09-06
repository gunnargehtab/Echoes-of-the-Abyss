/**
 * A headless browser surface for the renderer smoke test (#443).
 *
 * `EchoRenderer` and `PerspectiveView` carry a third of the client's logic and
 * had no automated verification, because both end in a GL context and CI has
 * no GPU. The way out is not to fake the *renderers* — a faked renderer tests
 * nothing — but to fake only what is genuinely unavailable and run everything
 * else for real:
 *
 *   * The scene graphs are real. PixiJS's `Container`/`Graphics`/`Text` and
 *     three.js's `Scene`/`Mesh`/`BufferGeometry` are plain JavaScript objects
 *     and need no GPU; Pixi only needs telling where to find a canvas, which
 *     is what `DOMAdapter` is for.
 *   * The DOM is a stub, because the parts the renderers touch are small and
 *     mechanical: element trees, listeners, a client rect, a 2D context.
 *   * The two rasterisers — Pixi's `Renderer`, three's `WebGLRenderer` — are
 *     stubs, and they are the only lie in here.
 *
 * What that buys is a boot that runs the real layer wiring, the real HUD text
 * build, the real input attach, the real snapshot apply and the real frame
 * path. What it cannot buy is pixels; those stay the screenshot gates in
 * docs/graphics-standards.md, which is where they belong.
 *
 * The probes follow the counted-work discipline the simulation already uses
 * (see `sim/stepWork.ts`, and the argument in packages/backend/test/match.test.ts):
 * a frame is measured by the objects and draw instructions it produced, never
 * by a stopwatch, so the number is a property of the code rather than of the
 * runner it happened to land on.
 */

import { Container, DOMAdapter, Graphics, Text } from 'pixi.js';
import type { Application } from 'pixi.js';
import type { Scene, WebGLRenderer } from 'three';

// --- DOM ---------------------------------------------------------------

/** The subset of a `DOMRect` anything in the client actually reads. */
interface StubRect {
  x: number;
  y: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

type Listener = (event: unknown) => void;

/** A handler and whether the DOM should detach it after one delivery. */
interface Registered {
  fn: Listener;
  once: boolean;
}

/**
 * One node of the stub tree.
 *
 * Listeners are held rather than swallowed, because "did teardown actually
 * detach?" is one of the questions the smoke test exists to ask — a renderer
 * that leaks a `keydown` handler per mount is a real bug and an invisible one.
 */
export class StubElement {
  readonly tagName: string;
  readonly style: Record<string, string> = {};
  readonly childNodes: StubElement[] = [];
  parentNode: StubElement | null = null;
  clientWidth = 0;
  clientHeight = 0;

  private readonly listeners = new Map<string, Registered[]>();
  private readonly captured = new Set<number>();

  constructor(tagName = 'div') {
    this.tagName = tagName;
  }

  addEventListener(type: string, fn: Listener, options?: { once?: boolean }): void {
    const entry: Registered = { fn, once: options?.once === true };
    const bucket = this.listeners.get(type);
    if (bucket === undefined) this.listeners.set(type, [entry]);
    else bucket.push(entry);
  }

  removeEventListener(type: string, fn: Listener): void {
    const bucket = this.listeners.get(type);
    if (bucket === undefined) return;
    const at = bucket.findIndex((entry) => entry.fn === fn);
    if (at >= 0) bucket.splice(at, 1);
    if (bucket.length === 0) this.listeners.delete(type);
  }

  /** How many handlers are attached in total — the teardown assertion. */
  listenerCount(): number {
    let total = 0;
    for (const bucket of this.listeners.values()) total += bucket.length;
    return total;
  }

  /** Deliver a synthetic event, the way a browser would. */
  dispatch(type: string, event: Record<string, unknown> = {}): void {
    const bucket = this.listeners.get(type);
    if (bucket === undefined) return;
    const payload = { type, preventDefault() {}, stopPropagation() {}, ...event };
    for (const entry of [...bucket]) {
      // `{ once: true }` detaches before the handler runs, exactly as the DOM
      // does — the autoplay unlock in `GameCanvas` is registered that way, and
      // a stub that re-fired it would hide a leak rather than reveal one.
      if (entry.once) this.removeEventListener(type, entry.fn);
      entry.fn(payload);
    }
  }

  appendChild<T extends StubElement>(child: T): T {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  removeChild(child: StubElement): void {
    const at = this.childNodes.indexOf(child);
    if (at >= 0) this.childNodes.splice(at, 1);
    child.parentNode = null;
  }

  remove(): void {
    this.parentNode?.removeChild(this);
  }

  setPointerCapture(pointerId: number): void {
    this.captured.add(pointerId);
  }

  releasePointerCapture(pointerId: number): void {
    this.captured.delete(pointerId);
  }

  hasPointerCapture(pointerId: number): boolean {
    return this.captured.has(pointerId);
  }

  getBoundingClientRect(): StubRect {
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: this.clientWidth,
      bottom: this.clientHeight,
      width: this.clientWidth,
      height: this.clientHeight,
    };
  }
}

/**
 * A 2D context with a real backing store.
 *
 * The pixel calls are honest — `createImageData`, `putImageData` and
 * `getImageData` round-trip through an actual buffer — because the seabed bake
 * writes a shaded rectangle and reads it back, and a context that returned
 * fresh zeros would quietly turn that into a no-op the test could not see.
 * The vector calls are not: nothing here rasterises a path, so a mask read
 * back after `fill()` comes back empty. That is why the art pipeline stays on
 * its vector-fallback path in this harness (see viteAssetHooks.mjs).
 */
class StubContext2D {
  fillStyle: string | object = '#000';
  strokeStyle: string | object = '#000';
  lineWidth = 1;
  lineCap = 'butt';
  lineJoin = 'miter';
  globalAlpha = 1;
  globalCompositeOperation = 'source-over';
  filter = 'none';
  font = '';
  textBaseline = 'alphabetic';
  textAlign = 'start';
  letterSpacing = '0px';
  wordSpacing = '0px';
  fontKerning = 'auto';
  imageSmoothingEnabled = true;

  readonly canvas: StubCanvas;
  private pixels: Uint8ClampedArray;

  constructor(canvas: StubCanvas) {
    this.canvas = canvas;
    this.pixels = new Uint8ClampedArray(Math.max(1, canvas.width * canvas.height * 4));
  }

  private fit(): void {
    const need = Math.max(1, this.canvas.width * this.canvas.height * 4);
    if (this.pixels.length !== need) this.pixels = new Uint8ClampedArray(need);
  }

  createImageData(
    w: number,
    h: number
  ): { width: number; height: number; data: Uint8ClampedArray } {
    return { width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) };
  }

  putImageData(
    image: { width: number; height: number; data: Uint8ClampedArray },
    dx: number,
    dy: number
  ): void {
    this.fit();
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    for (let y = 0; y < image.height; y++) {
      const ty = dy + y;
      if (ty < 0 || ty >= ch) continue;
      for (let x = 0; x < image.width; x++) {
        const tx = dx + x;
        if (tx < 0 || tx >= cw) continue;
        const from = (y * image.width + x) * 4;
        const to = (ty * cw + tx) * 4;
        this.pixels[to] = image.data[from]!;
        this.pixels[to + 1] = image.data[from + 1]!;
        this.pixels[to + 2] = image.data[from + 2]!;
        this.pixels[to + 3] = image.data[from + 3]!;
      }
    }
  }

  getImageData(
    sx: number,
    sy: number,
    w: number,
    h: number
  ): { width: number; height: number; data: Uint8ClampedArray } {
    this.fit();
    const out = new Uint8ClampedArray(Math.max(1, w * h * 4));
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    for (let y = 0; y < h; y++) {
      const fy = sy + y;
      if (fy < 0 || fy >= ch) continue;
      for (let x = 0; x < w; x++) {
        const fx = sx + x;
        if (fx < 0 || fx >= cw) continue;
        const from = (fy * cw + fx) * 4;
        const to = (y * w + x) * 4;
        out[to] = this.pixels[from]!;
        out[to + 1] = this.pixels[from + 1]!;
        out[to + 2] = this.pixels[from + 2]!;
        out[to + 3] = this.pixels[from + 3]!;
      }
    }
    return { width: w, height: h, data: out };
  }

  /**
   * Width from a fixed advance rather than a font table. Pixi lays the HUD out
   * from this, so it has to be plausible and — more importantly — stable:
   * every run must measure the same string the same way or the layout probes
   * would drift for reasons that have nothing to do with the renderer.
   */
  measureText(text: string): Record<string, number> {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 10);
    const width = text.length * size * 0.55;
    return {
      width,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: width,
      actualBoundingBoxAscent: size * 0.8,
      actualBoundingBoxDescent: size * 0.2,
      fontBoundingBoxAscent: size * 0.9,
      fontBoundingBoxDescent: size * 0.25,
    };
  }

  createLinearGradient(): { addColorStop: () => void } {
    return { addColorStop: () => {} };
  }

  createRadialGradient(): { addColorStop: () => void } {
    return { addColorStop: () => {} };
  }

  createPattern(): null {
    return null;
  }

  save(): void {}
  restore(): void {}
  scale(): void {}
  rotate(): void {}
  translate(): void {}
  transform(): void {}
  setTransform(): void {}
  resetTransform(): void {}
  clip(): void {}
  beginPath(): void {}
  closePath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  bezierCurveTo(): void {}
  quadraticCurveTo(): void {}
  arc(): void {}
  arcTo(): void {}
  ellipse(): void {}
  rect(): void {}
  roundRect(): void {}
  fill(): void {}
  stroke(): void {}
  fillText(): void {}
  strokeText(): void {}
  drawImage(): void {}
  clearRect(): void {}
  fillRect(): void {}
  strokeRect(): void {}
  setLineDash(): void {}
  getLineDash(): number[] {
    return [];
  }
}

export class StubCanvas extends StubElement {
  width = 1;
  height = 1;
  private context: StubContext2D | null = null;
  /** Set false to make three.js believe WebGL is unavailable. */
  webgl = true;

  constructor() {
    super('canvas');
  }

  getContext(kind: string): unknown {
    if (kind !== '2d') return this.webgl ? {} : null;
    if (this.context === null) this.context = new StubContext2D(this);
    return this.context;
  }

  toDataURL(): string {
    return 'data:,';
  }
}

/** A `ResizeObserver` that records its target instead of watching it. */
class StubResizeObserver {
  static readonly live = new Set<StubResizeObserver>();
  constructor(private readonly callback: () => void) {}
  observe(): void {
    StubResizeObserver.live.add(this);
  }
  unobserve(): void {
    StubResizeObserver.live.delete(this);
  }
  disconnect(): void {
    StubResizeObserver.live.delete(this);
  }
  fire(): void {
    this.callback();
  }
}

/** Deliver a resize to every live observer, the way a layout change would. */
export function fireResizeObservers(): void {
  for (const observer of StubResizeObserver.live) observer.fire();
}

/**
 * The window's own listener registry.
 *
 * A `StubElement` rather than a bag of functions, so the keyboard bindings the
 * renderer attaches to `window` are counted and dispatchable exactly like the
 * pointer bindings it attaches to the canvas — and so a leaked one is visible.
 */
const windowElement = new StubElement('window');

/** Deliver a synthetic window event (`keydown`, `keyup`). */
export function dispatchWindow(type: string, event: Record<string, unknown> = {}): void {
  windowElement.dispatch(type, event);
}

/** How many handlers are currently attached to `window`. */
export function windowListenerCount(): number {
  return windowElement.listenerCount();
}

/** Frame callbacks parked by `requestAnimationFrame`, run only when asked. */
const pendingFrames = new Map<number, () => void>();
let nextFrameHandle = 1;

let installed = false;

/**
 * Put the stub browser on `globalThis`, once per process.
 *
 * Called at import time rather than from a test body: the renderers read
 * `window.matchMedia` in a field initialiser, and Pixi resolves its adapter
 * the first time anything measures text, so both must be in place before a
 * single instance exists.
 */
export function installHeadlessDom(): void {
  if (installed) return;
  installed = true;

  const documentStub = {
    createElement: (tag: string): StubElement =>
      tag === 'canvas' ? new StubCanvas() : new StubElement(tag),
    createElementNS: (_ns: string, tag: string): StubElement =>
      tag === 'canvas' ? new StubCanvas() : new StubElement(tag),
    // The display face is asked for by name before the HUD builds its labels;
    // resolving is the honest answer here, since the fallback stack is what a
    // headless run would draw either way.
    fonts: { load: (): Promise<unknown[]> => Promise.resolve([]) },
    baseURI: 'http://localhost/',
    body: new StubElement('body'),
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const windowStub = {
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720,
    // Fuller than the client needs, because `colyseus.js` reads
    // `location.protocol` and `location.port` at module scope to derive its
    // default endpoint — a missing field there throws before any test body runs.
    location: {
      hostname: 'localhost',
      href: 'http://localhost/',
      protocol: 'http:',
      port: '',
      host: 'localhost',
      origin: 'http://localhost',
      pathname: '/',
      search: '',
      hash: '',
    },
    matchMedia: (query: string) => ({ matches: false, media: query }),
    addEventListener: (type: string, fn: Listener) => windowElement.addEventListener(type, fn),
    removeEventListener: (type: string, fn: Listener) =>
      windowElement.removeEventListener(type, fn),
    requestAnimationFrame: (fn: () => void) => scheduleFrame(fn),
    cancelAnimationFrame: (handle: number) => pendingFrames.delete(handle),
    document: documentStub,
  };

  const g = globalThis as unknown as Record<string, unknown>;
  g.window = windowStub;
  g.document = documentStub;
  // `navigator` is deliberately left alone: Node defines it read-only, the
  // client never reads it, and Pixi takes its own from the adapter below.
  g.devicePixelRatio = 1;
  g.HTMLElement = StubElement;
  g.HTMLCanvasElement = StubCanvas;
  g.ResizeObserver = StubResizeObserver;
  g.requestAnimationFrame = scheduleFrame;
  g.cancelAnimationFrame = (handle: number) => pendingFrames.delete(handle);
  // An Image that never loads: every `hullSpriteCanvas` ask starts a decode
  // that will not land, so the client stays on the vector shapes it draws
  // before its art arrives.
  g.Image = class {
    src = '';
    naturalWidth = 0;
    naturalHeight = 0;
    decoding = 'async';
    addEventListener(): void {}
    removeEventListener(): void {}
  };

  // Pixi asks the adapter, not the globals, so it gets told separately.
  DOMAdapter.set({
    createCanvas: (width = 1, height = 1) => {
      const canvas = new StubCanvas();
      canvas.width = width;
      canvas.height = height;
      return canvas as unknown as ReturnType<ReturnType<typeof DOMAdapter.get>['createCanvas']>;
    },
    createImage: () => new (g.Image as new () => object)(),
    getCanvasRenderingContext2D: () => StubContext2D,
    getWebGLRenderingContext: () => class {},
    getNavigator: () => ({ userAgent: 'headless-smoke-test', gpu: null }),
    getBaseUrl: () => 'http://localhost/',
    getFontFaceSet: () => null,
    fetch: () => Promise.reject(new Error('headless: no network')),
    parseXML: () => {
      throw new Error('headless: no XML parser');
    },
  } as unknown as Parameters<typeof DOMAdapter.set>[0]);
}

function scheduleFrame(fn: () => void): number {
  const handle = nextFrameHandle++;
  pendingFrames.set(handle, fn);
  return handle;
}

/** Run every parked frame callback once, the way a vsync would. */
export function pumpAnimationFrames(count = 1): void {
  for (let i = 0; i < count; i++) {
    const due = [...pendingFrames.entries()];
    pendingFrames.clear();
    for (const [, fn] of due) fn();
  }
}

/** One in-memory Storage, shaped like the browser's. */
function memoryStorage(backing: Map<string, string>): Record<string, unknown> {
  return {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => void backing.set(key, value),
    removeItem: (key: string) => void backing.delete(key),
    clear: () => backing.clear(),
    key: (index: number) => [...backing.keys()][index] ?? null,
    get length() {
      return backing.size;
    },
  };
}

/**
 * Fresh `localStorage` and `sessionStorage`, and the maps behind them.
 *
 * Both, because the client deliberately uses each for a different lifetime:
 * device preferences and the campaign record survive the tab in
 * `localStorage`, while the reconnection token is a bearer credential for one
 * seat and dies with the tab in `sessionStorage`. A test that installed one
 * would silently exercise the wrong half.
 *
 * On `globalThis` *and* on the stub window, because the stores reach for
 * `globalThis.localStorage` and `GameClient` for `window.sessionStorage`.
 */
export function installStorage(): { local: Map<string, string>; session: Map<string, string> } {
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const g = globalThis as unknown as { window: Record<string, unknown> } & Record<string, unknown>;
  g.localStorage = memoryStorage(local);
  g.sessionStorage = memoryStorage(session);
  g.window.localStorage = g.localStorage;
  g.window.sessionStorage = g.sessionStorage;
  return { local, session };
}

/** Forget the stub storages, so one test's record cannot reach the next. */
export function clearStorage(): void {
  const g = globalThis as unknown as { window: Record<string, unknown> } & Record<string, unknown>;
  delete g.localStorage;
  delete g.sessionStorage;
  delete g.window.localStorage;
  delete g.window.sessionStorage;
}

/**
 * Set the query string the shell reads at boot.
 *
 * `?map=` and `?mission=` are the harness's and a pasted dev URL's door
 * straight into the water (App.tsx), so which screen the shell opens on is a
 * function of this and nothing else.
 */
export function setSearch(search: string): void {
  const g = globalThis as unknown as { window: { location: Record<string, string> } };
  g.window.location.search = search;
  g.window.location.href = `http://localhost/${search}`;
}

/** A host element of a given CSS size, as `GameCanvas` would hand over. */
export function createHost(width = 1280, height = 720): StubElement {
  const host = new StubElement('div');
  host.clientWidth = width;
  host.clientHeight = height;
  return host;
}

// --- The two rasterisers ------------------------------------------------

/**
 * A Pixi `Application` with everything but the GPU.
 *
 * `stage` is a real `Container`, so the whole scene graph the renderer builds
 * is real and inspectable; only `renderer` is absent, and the only thing the
 * client asks of it is whether it exists (teardown guards on it).
 */
export class HeadlessApplication {
  readonly stage = new Container();
  readonly canvas = new StubCanvas();
  readonly screen = { x: 0, y: 0, width: 1, height: 1 };
  renderer: object | null = null;
  destroyed = false;

  private readonly frameCallbacks: Array<() => void> = [];
  readonly ticker = {
    add: (fn: () => void): void => {
      this.frameCallbacks.push(fn);
    },
    remove: (fn: () => void): void => {
      const at = this.frameCallbacks.indexOf(fn);
      if (at >= 0) this.frameCallbacks.splice(at, 1);
    },
  };

  async init(options: { resizeTo?: { clientWidth: number; clientHeight: number } }): Promise<void> {
    const host = options.resizeTo;
    this.resize(host?.clientWidth ?? 1280, host?.clientHeight ?? 720);
    this.renderer = { headless: true };
  }

  resize(width: number, height: number): void {
    this.screen.width = width;
    this.screen.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.clientWidth = width;
    this.canvas.clientHeight = height;
  }

  /** One tick of the Pixi ticker: exactly what a browser frame would run. */
  frame(count = 1): void {
    for (let i = 0; i < count; i++) for (const fn of [...this.frameCallbacks]) fn();
  }

  destroy(): void {
    this.destroyed = true;
    this.renderer = null;
    this.frameCallbacks.length = 0;
    this.stage.destroy({ children: true });
  }

  /** Hand to `new EchoRenderer(callbacks, app)`. */
  asApplication(): Application {
    return this as unknown as Application;
  }
}

/** What the stub three.js renderer counted on its last `render`. */
export interface DrawLedger {
  frames: number;
  calls: number;
  triangles: number;
}

/**
 * A three.js `WebGLRenderer` that walks the scene instead of drawing it.
 *
 * `calls` and `triangles` are counted from the scene graph — one call per
 * visible object that carries geometry, and its index count over three — so
 * they are *the renderer's work as the scene describes it*, not a number GL
 * reported. That is the point: a counted quantity is identical on every
 * machine, which is what makes it safe to assert on (the argument in
 * packages/backend/test/match.test.ts, applied to the frame instead of to the
 * tick).
 */
export class HeadlessWebGLRenderer {
  readonly domElement = new StubCanvas();
  readonly ledger: DrawLedger = { frames: 0, calls: 0, triangles: 0 };
  readonly info = { render: { calls: 0, triangles: 0 }, memory: { geometries: 0, textures: 0 } };
  readonly capabilities = { getMaxAnisotropy: (): number => 1, isWebGL2: true };
  readonly shadowMap = { enabled: false, type: 0 };
  outputColorSpace = '';
  disposed = false;

  setPixelRatio(): void {}
  setClearColor(): void {}
  setAnimationLoop(): void {}

  setSize(width: number, height: number): void {
    this.domElement.width = width;
    this.domElement.height = height;
    this.domElement.clientWidth = width;
    this.domElement.clientHeight = height;
  }

  getSize<T extends { x: number; y: number }>(target: T): T {
    target.x = this.domElement.width;
    target.y = this.domElement.height;
    return target;
  }

  render(scene: Scene): void {
    let calls = 0;
    let triangles = 0;
    scene.traverseVisible((object) => {
      const geometry = (object as { geometry?: { index?: { count: number } | null } }).geometry;
      if (geometry === undefined) return;
      calls++;
      const instances = (object as { count?: number }).count ?? 1;
      triangles += ((geometry.index?.count ?? 0) / 3) * instances;
    });
    this.ledger.frames++;
    this.ledger.calls = calls;
    this.ledger.triangles = triangles;
    this.info.render.calls = calls;
    this.info.render.triangles = triangles;
  }

  dispose(): void {
    this.disposed = true;
  }

  /** Hand to `PerspectiveView.mount(host, () => renderer.asRenderer())`. */
  asRenderer(): WebGLRenderer {
    return this as unknown as WebGLRenderer;
  }
}

// --- Scene-graph probes -------------------------------------------------

/** Every display object under `root`, itself included. */
function* walk(root: Container): Generator<Container> {
  yield root;
  for (const child of root.children) yield* walk(child as Container);
}

/**
 * The identity of every object in the tree.
 *
 * Pixi stamps each display object with a process-unique `uid`, which is what
 * makes this an allocation probe and not merely a size one: a frame that
 * rebuilds its marks from scratch keeps the same *count* while replacing every
 * *identity*, and that churn is exactly the regression pooling exists to stop.
 */
export function treeIdentities(root: Container): Set<number> {
  const ids = new Set<number>();
  for (const node of walk(root)) ids.add(node.uid);
  return ids;
}

/** How many display objects the tree holds. */
export function treeSize(root: Container): number {
  let size = 0;
  for (const _node of walk(root)) size++;
  return size;
}

/**
 * Total draw instructions queued across every `Graphics` in the tree — the
 * closest honest analogue of a draw-call count that a scene graph can offer
 * without a GPU, and a direct measure of how much ink a frame asked for.
 */
export function drawInstructions(root: Container): number {
  let total = 0;
  for (const node of walk(root)) {
    if (node instanceof Graphics) total += node.context.instructions.length;
  }
  return total;
}

/** How many `Text` objects the tree holds — the HUD's label budget. */
export function textCount(root: Container): number {
  let total = 0;
  for (const node of walk(root)) if (node instanceof Text) total++;
  return total;
}

installHeadlessDom();
