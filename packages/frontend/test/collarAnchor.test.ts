/**
 * A structure's rings sit about its model as drawn (#1583, docs/ui-ux.md §3.5).
 *
 * The collar used to be a circle about the structure's footing, so at the 55°
 * home frame the model's roof climbed out of it and the collar ran across the
 * roof. This boots the real chart and conn view with the committed Foundry
 * standing where the canned snapshot puts its structure, reads the circles the
 * chart actually drew, and holds them to the model's own vertices projected
 * through the conn view's camera. The control is the same circle about the
 * footing, which the Foundry's roof leaves.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';
import { Graphics } from 'pixi.js';
import { Mesh, Vector3, type BufferGeometry, type Group, type PerspectiveCamera } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Faction, StructureKind, structureStatsFor } from '@echoes/shared';
import {
  createHost,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
} from './support/headless.ts';
import { cannedMap, cannedNodes, cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';
import {
  collarRadius,
  EchoRenderer,
  SELECTION_GAP_M,
  type RendererCallbacks,
} from '../src/game/EchoRenderer.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { buildTemplate, instantiate } from '../src/game/rosterModels.ts';

const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);
const WIDTH = 1280;
const HEIGHT = 720;
const ID = 21;

/**
 * The share of the model's height counted as its footing. The roof is what
 * #1583 names. The footing's near corners still graze the collar, and the
 * anchor cannot help that: the Foundry's plan is a 320 m by 288 m slab, so
 * its corners stand up to 204 m out in plan, past the 193 m collar §3.5 sizes
 * from its 160 m half-length. Those strays sit within 12 m of a 136 m model's
 * base.
 */
const FOOTING_SHARE = 0.1;

const views: PerspectiveView[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

/** A circle on screen, in CSS pixels. */
interface Ring {
  x: number;
  y: number;
  r: number;
}

/** A model vertex: where it lands on screen, and how high it stands in the world. */
interface Vertex {
  x: number;
  y: number;
  worldY: number;
}

async function boot(selected: boolean): Promise<{
  rings: Ring[];
  footing: { x: number; y: number };
  /** The vertices above the footing's share of the model's height. */
  roof: Vertex[];
  teardown(): void;
}> {
  const bytes = readFileSync(new URL('foundry-bathyarch.glb', MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const scene = (await new GLTFLoader().parseAsync(buffer, '')).scene;
  const template = buildTemplate(scene, {
    structure: StructureKind.Foundry,
    faction: Faction.Bathyarch,
  });

  const gl = new HeadlessWebGLRenderer();
  const app = new HeadlessApplication();
  const conn = new PerspectiveView();
  views.push(conn);
  conn.mount(
    createHost(WIDTH, HEIGHT) as unknown as HTMLElement,
    () => gl.asRenderer(),
    gl.environment
  );
  conn.setActive(true);
  const callbacks = new Proxy({} as RendererCallbacks, { get: () => () => undefined });
  const chart = new EchoRenderer(callbacks, app.asApplication());
  await chart.init(createHost(WIDTH, HEIGHT) as unknown as HTMLElement);
  chart.setConn(conn);
  const terrain = cannedTerrain();
  chart.setTerrain(terrain);
  conn.setTerrain(terrain);
  chart.setMap(cannedMap());
  chart.setNodes(cannedNodes());
  chart.setIdentity(0, Faction.Bathyarch);
  conn.setIdentity(0, Faction.Bathyarch);
  // The canned base, rebuilt as a Foundry: the figure #1583 was seen on.
  const snapshot = cannedSnapshot();
  snapshot.structures = snapshot.structures.map((s) =>
    s.id === ID ? { ...s, kind: StructureKind.Foundry, queue: [], queueProgress: 0 } : s
  );
  chart.applySnapshot(snapshot);
  conn.applySnapshot(snapshot);
  // The runner's model manifest is empty, so the model is handed to its
  // handle as the loader would, and the next sync stands it (inkOcclusion.test.ts).
  const handles = (conn as unknown as { structureHandles: Map<number, unknown> }).structureHandles;
  const handle = handles.get(ID) as { model: unknown; modelKey: string };
  handle.model = instantiate(template);
  handle.modelKey = 'test';
  conn.applySnapshot(snapshot);
  if (selected) (chart as unknown as { selected: Set<number> }).selected.add(ID);
  // The home frame over the base.
  conn.focusWorld(650, 650, 1800);
  for (let i = 0; i < 2; i++) {
    pumpAnimationFrames();
    app.frame();
  }

  // The circles the chart drew about the structure, in screen pixels. Read
  // from the pool's own map: `acquire` would clear what was drawn.
  const pool = (chart as unknown as { structureSymbols: { held: Map<number, Graphics> } })
    .structureSymbols;
  const g = pool.held.get(ID)!;
  const rings: Ring[] = [];
  for (const instruction of g.context.instructions) {
    const path = (instruction.data as { path?: { instructions: unknown[] } }).path;
    for (const step of path?.instructions ?? []) {
      const { action, data } = step as { action: string; data: number[] };
      if (action !== 'circle') continue;
      const [x, y, r] = data as [number, number, number];
      rings.push({
        x: g.position.x + x * g.scale.x,
        y: g.position.y + y * g.scale.y,
        r: r * g.scale.x,
      });
    }
  }

  // Every vertex of the model as the conn view stands it, through its camera.
  const camera = (conn as unknown as { camera: PerspectiveCamera }).camera;
  const root = (handle.model as { root: Group }).root;
  root.updateMatrixWorld(true);
  const vertices: Vertex[] = [];
  const v = new Vector3();
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const position = (child.geometry as BufferGeometry).getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(child.matrixWorld);
      const worldY = v.y;
      v.project(camera);
      vertices.push({ x: ((v.x + 1) / 2) * WIDTH, y: ((1 - v.y) / 2) * HEIGHT, worldY });
    }
  });
  const low = Math.min(...vertices.map((p) => p.worldY));
  const high = Math.max(...vertices.map((p) => p.worldY));
  const floor = low + (high - low) * FOOTING_SHARE;
  return {
    rings,
    footing: { x: g.position.x, y: g.position.y },
    roof: vertices.filter((p) => p.worldY > floor),
    teardown: () => chart.destroy(),
  };
}

const outside = (ring: Ring, vertices: Vertex[]) =>
  vertices.filter((p) => Math.hypot(p.x - ring.x, p.y - ring.y) > ring.r);

describe("a structure's collar rings its model as drawn (#1583)", () => {
  it("holds the Foundry's roof inside its collar", async () => {
    const { rings, roof, teardown } = await boot(false);
    try {
      assert.equal(rings.length, 1, 'unselected, the collar is the one circle');
      assert.ok(roof.length > 1000, 'the model stood and was read');
      assert.equal(outside(rings[0]!, roof).length, 0, 'no roof vertex lies past the collar');
    } finally {
      teardown();
    }
  });

  it('crosses the roof about the footing: the control that the test can fail', async () => {
    const { rings, footing, roof, teardown } = await boot(false);
    try {
      const collar = rings[0]!;
      assert.ok(Math.hypot(collar.x - footing.x, collar.y - footing.y) > 1, 'the centre moved');
      const atFooting = { x: footing.x, y: footing.y, r: collar.r };
      assert.ok(
        outside(atFooting, roof).length > 0,
        'the roof climbs out of a ring at the footing'
      );
    } finally {
      teardown();
    }
  });

  it('keeps the selection ring concentric with the collar and inside it', async () => {
    const { rings, teardown } = await boot(true);
    try {
      assert.equal(rings.length, 2, 'the selection ring and the collar');
      const [inner, outer] = [...rings].sort((a, b) => a.r - b.r) as [Ring, Ring];
      assert.ok(Math.hypot(inner.x - outer.x, inner.y - outer.y) < 1e-6, 'one centre');
      // §3.5's clearance, as a share of the selection ring: one scale applies
      // to both, so the share survives the centre's pixels-per-metre.
      const radius = structureStatsFor(StructureKind.Foundry).radiusM;
      const selection = radius + SELECTION_GAP_M.STRUCTURE;
      const want = collarRadius(radius, SELECTION_GAP_M.STRUCTURE) / selection;
      assert.ok(Math.abs(outer.r / inner.r - want) < 1e-9, 'the collar clears it by §3.5');
    } finally {
      teardown();
    }
  });
});
