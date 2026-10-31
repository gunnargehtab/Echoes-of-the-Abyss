/**
 * Ground ink passes behind a model (#1557, docs/map-visuals.md §5).
 *
 * The mark layer is painted over the conn view, so a ring that crossed a
 * structure ran across its roof. The pure half holds the columns and the ray
 * walk to the rule; the booted half holds the real chart to it with the
 * committed Bastion standing where the canned snapshot puts it: no point a
 * model hides is drawn, and with the test switched off the same points are.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it, mock } from 'node:test';
import { Container, Graphics } from 'pixi.js';
import {
  Box3,
  BoxGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Ray,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Faction, StructureKind } from '@echoes/shared';
import {
  createHost,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
} from './support/headless.ts';
import { cannedMap, cannedNodes, cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';
import { EchoRenderer, type RendererCallbacks } from '../src/game/EchoRenderer.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import {
  columnsFor,
  COLUMNS_LONG,
  InkOcclusion,
  modelColumns,
  rayMeetsColumns,
} from '../src/game/inkOcclusion.ts';
import { buildTemplate, instantiate, type Template } from '../src/game/rosterModels.ts';

const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);

/** The Bathyarch Bastion, which carries no image for the loader to decode. */
async function bastion(): Promise<Template> {
  const bytes = readFileSync(new URL('bastion-bathyarch.glb', MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const scene = (await new GLTFLoader().parseAsync(buffer, '')).scene;
  return buildTemplate(scene, { structure: StructureKind.Bastion, faction: Faction.Bathyarch });
}

/** A root holding one box, `size` metres a side, its base `liftM` above y 0. */
function boxRoot(size: number, liftM = -size / 2, transparent = false): Group {
  const root = new Group();
  const mesh = new Mesh(new BoxGeometry(size, size, size), new MeshBasicMaterial({ transparent }));
  mesh.position.y = liftM + size / 2;
  root.add(mesh);
  return root;
}

describe('modelColumns', () => {
  it('fills every cell of a box from its floor to its roof', () => {
    const columns = modelColumns(boxRoot(10));
    assert.equal(columns.cols, COLUMNS_LONG);
    assert.equal(columns.rows, COLUMNS_LONG);
    for (let k = 0; k < columns.cols * columns.rows; k++) {
      assert.equal(columns.low[k], -5, `cell ${k} floor`);
      assert.equal(columns.high[k], 5, `cell ${k} roof`);
    }
  });

  it('reads nothing from a transparent mesh: a haze hides no ink', () => {
    const columns = modelColumns(boxRoot(10, -5, true));
    assert.ok(columns.low.every((y) => y === Infinity));
  });

  it("is read once per template, in the root's own space", () => {
    const root = boxRoot(10);
    root.scale.setScalar(4);
    const template = { root };
    const columns = columnsFor(template);
    assert.equal(columnsFor(template), columns);
    // The root's own scale is the instance's to apply, not baked in here.
    assert.equal(columns.box.max.x, 5);
  });
});

describe('rayMeetsColumns', () => {
  const columns = modelColumns(boxRoot(10));
  const ray = (from: [number, number, number], to: [number, number, number], tMax = 1) =>
    rayMeetsColumns(columns, new Vector3(...from), new Vector3(...to), tMax);

  it('meets a ray through the solid, and misses one beside it', () => {
    assert.equal(ray([0, 10, 50], [0, -5, -20]), true);
    assert.equal(ray([20, 10, 50], [20, -5, -20]), false);
  });

  it('stops where the ray stops: a point in front of the solid is not behind it', () => {
    assert.equal(ray([0, 10, 50], [0, -5, 20]), false);
    assert.equal(ray([0, 10, 50], [0, -5, -20], 0.5), false);
  });

  it('keeps the water under a raised deck open', () => {
    // A 10 m deck 20 m up; the ground under it seen from low and to the side.
    const deck = modelColumns(boxRoot(10, 20));
    assert.equal(rayMeetsColumns(deck, new Vector3(0, 5, 60), new Vector3(0, 0, 0), 1), false);
    assert.equal(rayMeetsColumns(deck, new Vector3(0, 80, 0), new Vector3(0, 0, 0), 1), true);
  });
});

describe('InkOcclusion', () => {
  function frame(): { ink: InkOcclusion; camera: PerspectiveCamera } {
    const camera = new PerspectiveCamera(40, 1280 / 720, 10, 60_000);
    camera.position.set(0, 400, 400);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    const ink = new InkOcclusion();
    ink.begin(camera, 1280, 720);
    ink.add(modelColumns(boxRoot(40, 0)), new Matrix4());
    ink.end();
    return { ink, camera };
  }
  const pixel = (camera: PerspectiveCamera, x: number, y: number, z: number) => {
    const p = new Vector3(x, y, z).project(camera);
    return [((p.x + 1) / 2) * 1280, ((1 - p.y) / 2) * 720] as const;
  };

  it('hides the ground behind a model and not the ground in front of it', () => {
    const { ink, camera } = frame();
    const [bx, by] = pixel(camera, 0, 0, -30);
    assert.ok(ink.covers(bx, by));
    assert.equal(ink.hides(bx, by, 0, 0, -30), true);
    const [fx, fy] = pixel(camera, 0, 0, 30);
    assert.equal(ink.hides(fx, fy, 0, 0, 30), false);
  });

  it('answers from the screen box alone for a point nowhere near a model', () => {
    const { ink, camera } = frame();
    const [x, y] = pixel(camera, 300, 0, 0);
    assert.equal(ink.covers(x, y), false);
    assert.equal(ink.crosses(x, y, x + 10, y), false);
    const [bx, by] = pixel(camera, 0, 0, -30);
    assert.equal(ink.crosses(x, y, bx, by), true);
  });

  // What a mission marker's name keeps off (#1662): own models in front of
  // the eye, and a track's once its mark has arrived. One hull behind the
  // camera would otherwise leave the name no place at all.
  it('tests a box against own models in front of the eye, and arrived tracks', () => {
    const { ink, camera } = frame();
    ink.begin(camera, 1280, 720);
    ink.add(modelColumns(boxRoot(40, 0)), new Matrix4(), 11);
    ink.add(modelColumns(boxRoot(40, 0)), new Matrix4().makeTranslation(0, 800, 800), 12);
    ink.markOwn();
    ink.add(modelColumns(boxRoot(40, 0)), new Matrix4().makeTranslation(300, 0, 0), 104);
    ink.end();
    const none = new Set<number>();
    const [x, y] = pixel(camera, -300, 0, 0);
    assert.equal(ink.crosses(x, y, x + 10, y), true, 'the model behind the eye is everywhere');
    assert.equal(ink.crossesHulls(x, y, x + 10, y, none), false, 'and left out');
    const [tx, ty] = pixel(camera, 300, 0, 0);
    assert.equal(ink.crosses(tx, ty, tx + 1, ty + 1), true, "the premise: the track's model");
    assert.equal(ink.crossesHulls(tx, ty, tx + 1, ty + 1, none), false, 'left out unarrived');
    assert.equal(
      ink.crossesHulls(tx, ty, tx + 1, ty + 1, new Set([104])),
      true,
      'and tested once its mark has arrived'
    );
    const [bx, by] = pixel(camera, 0, 0, -30);
    assert.equal(
      ink.crossesHulls(bx, by, bx + 1, by + 1, none),
      true,
      'the own one in front is not'
    );
  });

  it('moves its revision only when a model moves', () => {
    const { ink, camera } = frame();
    const first = ink.revision;
    ink.begin(camera, 1280, 720);
    ink.add(modelColumns(boxRoot(40, 0)), new Matrix4());
    assert.equal(ink.end(), first);
    ink.begin(camera, 1280, 720);
    ink.add(modelColumns(boxRoot(40, 0)), new Matrix4().makeTranslation(5, 0, 0));
    assert.equal(ink.end(), first + 1);
  });
});

const views: PerspectiveView[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

/**
 * How far apart on screen two points of one run can stand: a ring's vertices
 * at this frame, where the walk across a model's screen box steps 2 px.
 */
const NEIGHBOUR_PX = 40;

/** One point the chart asked about: plan metres, its height, its pixel, and the answer. */
interface Asked {
  x: number;
  y: number;
  /** The world height the chart projected it at. */
  wy: number;
  sx: number;
  sy: number;
  hidden: boolean;
}

describe('the chart behind a model', () => {
  // `cut` false records what the test answers and draws as if it said no.
  async function boot(cut = true): Promise<{
    app: HeadlessApplication;
    conn: PerspectiveView;
    hidden: Asked[];
    asked: Asked[];
    /** The Bastion's drawn box and the eye, as the conn view holds them. */
    box: Box3;
    eye: Vector3;
    frame(): void;
    teardown(): void;
  }> {
    const template = await bastion();
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
    chart.setMap(cannedMap());
    chart.setNodes(cannedNodes());
    chart.setIdentity(0, Faction.Bathyarch);
    conn.setIdentity(0, Faction.Bathyarch);
    const snapshot = cannedSnapshot();
    chart.applySnapshot(snapshot);
    conn.applySnapshot(snapshot);
    // The runner's model manifest is empty (test/support/viteAssetHooks.mjs),
    // so the committed Bastion is handed to its handle as the loader would,
    // and the next sync stands it where the snapshot puts it.
    const handles = (conn as unknown as { structureHandles: Map<number, unknown> })
      .structureHandles;
    const handle = handles.get(21) as { model: unknown; modelKey: string };
    handle.model = instantiate(template);
    handle.modelKey = 'test';
    conn.applySnapshot(snapshot);
    // The home frame over the Bastion and the field beside it (node 1).
    conn.focusWorld(650, 650, 1800);

    const hidden: Asked[] = [];
    const asked: Asked[] = [];
    const inkHidden = conn.inkHidden.bind(conn);
    mock.method(conn, 'inkHidden', (...args: Parameters<PerspectiveView['inkHidden']>) => {
      const answer = inkHidden(...args);
      const point = {
        x: args[0],
        wy: args[1],
        y: args[2],
        sx: args[3],
        sy: args[4],
        hidden: answer,
      };
      asked.push(point);
      if (answer) hidden.push(point);
      return cut && answer;
    });
    const model = handle.model as { root: Group };
    const box = new Box3().setFromObject(model.root, true);
    const eye = (conn as unknown as { camera: PerspectiveCamera }).camera.position;
    const frame = (): void => {
      pumpAnimationFrames();
      app.frame();
    };
    return { app, conn, hidden, asked, box, eye, frame, teardown: () => chart.destroy() };
  }

  /** Every point a stroked path on the stage moves or draws to. */
  const pathPoints = (app: HeadlessApplication): Set<string> => {
    const points = new Set<string>();
    const walk = (node: Container): void => {
      for (const child of node.children) {
        if (child instanceof Graphics) {
          for (const instruction of child.context.instructions) {
            const path = (instruction.data as { path?: { instructions: unknown[] } }).path;
            for (const step of path?.instructions ?? []) {
              const { action, data } = step as { action: string; data: unknown[] };
              const [x, y] = data;
              if (typeof x !== 'number' || typeof y !== 'number') continue;
              if (action === 'moveTo' || action === 'lineTo') {
                points.add(`${x.toFixed(3)},${y.toFixed(3)}`);
              }
            }
          }
        }
        walk(child as Container);
      }
    };
    walk(app.stage as unknown as Container);
    return points;
  };
  const key = (p: { sx: number; sy: number }) => `${p.sx.toFixed(3)},${p.sy.toFixed(3)}`;

  it('draws no point of ground ink the Bastion stands in front of', async () => {
    const { app, hidden, box, eye, frame, teardown } = await boot();
    try {
      frame();
      frame();
      assert.ok(hidden.length > 0, 'some ground ink runs behind the Bastion');
      const drawn = pathPoints(app);
      assert.deepEqual(
        hidden.filter((p) => drawn.has(key(p))),
        [],
        'no hidden point is drawn'
      );
      // Behind the Bastion, and not merely behind something: the eye's ray to
      // each hidden point passes through the box the model is drawn in, read
      // off the model itself rather than off the columns or their screen box.
      const ray = new Ray();
      const point = new Vector3();
      const met = new Vector3();
      const strays = hidden.filter((p) => {
        point.set(p.x, p.wy, p.y);
        ray.set(eye, point.clone().sub(eye).normalize());
        const at = ray.intersectBox(box, met);
        return at === null || at.distanceTo(eye) > point.distanceTo(eye);
      });
      assert.deepEqual(strays, [], 'every hidden point lies behind the Bastion');
    } finally {
      teardown();
    }
  });

  it('walks a segment past the Bastion without reading the ground (#1692)', async () => {
    const { conn, asked, frame, teardown } = await boot();
    try {
      frame();
      // The ground is read where a ring's vertex is projected; the walk's
      // samples between two vertices take their height from the vertices',
      // so a frame reads it about once a vertex, however many samples the
      // walk tests. Read once a sample, twice in fact, it was most of the
      // overlay's frame at a close dolly (#1692).
      let reads = 0;
      const seabed = conn.seabedDepthAt.bind(conn);
      mock.method(
        conn,
        'seabedDepthAt',
        (...args: Parameters<PerspectiveView['seabedDepthAt']>) => {
          reads++;
          return seabed(...args);
        }
      );
      let vertices = 0;
      const project = conn.projectPoint.bind(conn);
      mock.method(conn, 'projectPoint', (...args: Parameters<PerspectiveView['projectPoint']>) => {
        if (args[2] === null) vertices++;
        return project(...args);
      });
      let walked = 0;
      const projectHeight = conn.projectHeight.bind(conn);
      mock.method(
        conn,
        'projectHeight',
        (...args: Parameters<PerspectiveView['projectHeight']>) => {
          walked++;
          return projectHeight(...args);
        }
      );
      asked.length = 0;
      frame();
      assert.ok(walked > 50, `the walk tests samples past the Bastion (${walked})`);
      assert.ok(reads <= vertices + 8, `${reads} reads of the ground for ${vertices} vertices`);
    } finally {
      teardown();
    }
  });

  it('resumes a run past the Bastion, on the far side of what it hides', async () => {
    const { app, asked, frame, teardown } = await boot();
    try {
      frame();
      frame();
      const drawn = pathPoints(app);
      // In the order the chart traced them: a drawn point, then hidden ones,
      // then a drawn point again, each beside the next on screen so the three
      // belong to one run. Each run is cut, not dropped.
      const near = (p: Asked, q: Asked | null) =>
        q !== null && Math.hypot(p.sx - q.sx, p.sy - q.sy) <= NEIGHBOUR_PX;
      let lastDrawn: Asked | null = null;
      let lastHidden: Asked | null = null;
      let resumed = false;
      for (const p of asked) {
        if (p.hidden) {
          if (lastHidden !== null || near(p, lastDrawn)) lastHidden = p;
          lastDrawn = null;
        } else if (drawn.has(key(p))) {
          if (near(p, lastHidden)) resumed = true;
          lastDrawn = p;
          lastHidden = null;
        } else {
          lastDrawn = null;
          lastHidden = null;
        }
      }
      assert.ok(resumed, 'a traced run is drawn before and after the stretch the Bastion hides');
    } finally {
      teardown();
    }
  });

  it('draws those same points with the test off: the control that the test can fail', async () => {
    const { app, hidden, frame, teardown } = await boot(false);
    try {
      frame();
      frame();
      assert.ok(hidden.length > 0);
      const drawn = pathPoints(app);
      assert.ok(
        hidden.some((p) => drawn.has(key(p))),
        'uncut, the ink runs across the Bastion'
      );
    } finally {
      teardown();
    }
  });
});
