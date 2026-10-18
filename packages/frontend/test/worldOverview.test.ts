/**
 * The Rift at overview detail round the pilot — docs/world-map.md §7.3 (#1459).
 *
 * The data half first, under node (worldOverview.ts): the grid, the cut the
 * detail makes in it, the depth a ray meets on it, and the seam band where
 * the detail eases into it. Then the real view: the overview is drawn only
 * while the fade lets it be seen, cut where the detail stands, refuses a
 * click, answers a projection, and is left alone by a ground delta.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { BufferAttribute, Mesh, MeshBasicMaterial, Raycaster, Vector2, type Camera } from 'three';
import {
  SORROWGATE_GROUND,
  SORROWGATE_REGION,
  WORLD,
  detailGround,
  detailRect,
  paintGround,
  type WorldRegion,
} from '@echoes/shared';
import { createHost, HeadlessWebGLRenderer, pumpAnimationFrames } from './support/headless.ts';
import { cannedSnapshot } from './support/cannedMatch.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { buildHeightGrid, depthToWorldY, rockTopDepthM } from '../src/game/perspectiveTerrain.ts';
import {
  bakeSeabed,
  bakeSeabedInSlices,
  seabedRange,
  seabedSeed,
  shadeSeabed,
  SLICED_BAKE_BUDGET_MS,
} from '../src/game/seabed.ts';
import { apronFrame, apronMesh, paddedTerrain } from '../src/game/worldBorder.ts';
import {
  OVERVIEW_PX_PER_CELL,
  SEAM_BAND_M,
  SEAM_WEIGHT_GLSL,
  overviewDepthAtM,
  overviewGrid,
  overviewIndices,
  overviewSkin,
  overviewTerrain,
  seamHeightFor,
  seamWeight,
} from '../src/game/worldOverview.ts';
import type { TerrainPayload } from '../src/net/GameClient.ts';

/** Sorrowgate's own ground, painted from the literal the server plays on. */
function sorrowgate(): TerrainPayload {
  const cells = paintGround(SORROWGATE_GROUND);
  return {
    cols: cells.cols,
    rows: cells.rows,
    cellM: cells.cellM,
    biomes: Array.from(cells.biomes),
    floor: Array.from(cells.floor),
    ceiling: Array.from(cells.ceiling),
  };
}

const HOLE = detailRect(SORROWGATE_REGION);

describe('the overview grid (§7.3)', () => {
  it('covers the atlas at two vertices a 1,000 m cell, on the authored floor alone', () => {
    const grid = overviewGrid();
    const terrain = overviewTerrain();
    assert.deepEqual(
      [grid.vertsX, grid.vertsZ, grid.stepM, grid.widthM, grid.heightM],
      [81, 181, 500, WORLD.ATLAS_WIDTH_M, WORLD.ATLAS_HEIGHT_M]
    );
    for (let row = 0; row < terrain.rows; row++) {
      for (let col = 0; col < terrain.cols; col++) {
        const centre = (2 * row + 1) * grid.vertsX + 2 * col + 1;
        assert.equal(grid.floor[centre], terrain.floor[row * terrain.cols + col]);
      }
    }
    // No detail field: a vertex on a cell boundary is the two cells' mean.
    const [west, east] = [terrain.floor[20 * 40 + 9]!, terrain.floor[20 * 40 + 10]!];
    assert.equal(grid.floor[(2 * 20 + 1) * grid.vertsX + 20], Math.fround((west + east) / 2));
  });

  it('draws 28,800 triangles whole, and leaves out exactly the detail it is cut for', () => {
    const grid = overviewGrid();
    assert.equal(overviewIndices(grid, []) / 3, 28_800);
    const out = new Uint32Array(28_800 * 3);
    const kept = overviewIndices(grid, [HOLE], out);
    // The detail rectangle is 10 × 9 km: 20 × 18 quads of 500 m.
    assert.equal(kept / 3, 28_800 - 20 * 18 * 2);
    for (let t = 0; t < kept; t += 3) {
      const [a, b, c] = [out[t]!, out[t + 1]!, out[t + 2]!];
      const x = (((a % 81) + (b % 81) + (c % 81)) * 500) / 3;
      const z = ((Math.floor(a / 81) + Math.floor(b / 81) + Math.floor(c / 81)) * 500) / 3;
      const inside =
        x > HOLE.x && x < HOLE.x + HOLE.widthM && z > HOLE.y && z < HOLE.y + HOLE.heightM;
      assert.ok(!inside, `a triangle inside the detail at ${x}, ${z}`);
    }
  });

  it('reads the depth a ray meets: the triangle under the point, as the mesh draws it', () => {
    const grid = overviewGrid();
    const indices = new Uint32Array(28_800 * 3);
    const count = overviewIndices(grid, [], indices);
    const vertex = (i: number) => ({
      x: (i % grid.vertsX) * grid.stepM,
      z: Math.floor(i / grid.vertsX) * grid.stepM,
      d: grid.floor[i]!,
    });
    // A point's triangle found by search over every triangle, not by the
    // arithmetic the function uses, then interpolated barycentrically.
    for (let k = 0; k < 48; k++) {
      const x = 137 + ((k * 7919) % 39_700);
      const z = 211 + ((k * 104_729) % 89_600);
      let found: number | null = null;
      for (let t = 0; t < count && found === null; t += 3) {
        const [p, q, r] = [vertex(indices[t]!), vertex(indices[t + 1]!), vertex(indices[t + 2]!)];
        const det = (q.z - r.z) * (p.x - r.x) + (r.x - q.x) * (p.z - r.z);
        const u = ((q.z - r.z) * (x - r.x) + (r.x - q.x) * (z - r.z)) / det;
        const v = ((r.z - p.z) * (x - r.x) + (p.x - r.x) * (z - r.z)) / det;
        if (u < -1e-9 || v < -1e-9 || u + v > 1 + 1e-9) continue;
        found = u * p.d + v * q.d + (1 - u - v) * r.d;
      }
      assert.ok(found !== null, `no triangle under ${x}, ${z}`);
      assert.ok(Math.abs(overviewDepthAtM(grid, x, z) - found) < 1e-3, `depth at ${x}, ${z}`);
    }
  });

  it('bakes its skin at 16 px a cell with no detail field, so no seed moves it', async () => {
    const skin = await overviewSkin();
    assert.deepEqual([skin.width, skin.height], [40 * OVERVIEW_PX_PER_CELL, 90 * 16]);
    const terrain = overviewTerrain();
    // Taken a slice at a time, it is the bake taken whole.
    const whole = bakeSeabed(terrain, seabedSeed(terrain), seabedRange(terrain), [], {
      pxPerCell: OVERVIEW_PX_PER_CELL,
      detail: false,
    });
    const pixels = (canvas: HTMLCanvasElement) =>
      canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    // By the first byte that differs: assert's diff of 3.7M bytes takes five
    // minutes to print, so a slice gone wrong would stall the shard, not fail it.
    const [sliced, taken] = [pixels(skin), pixels(whole)];
    assert.equal(sliced.length, taken.length);
    const differs = sliced.findIndex((v, i) => v !== taken[i]);
    assert.equal(differs, -1, `the sliced skin differs from the whole at byte ${differs}`);
    assert.equal(await overviewSkin(), skin, 'once a page');
    const rect = { col0: 14, row0: 37, col1: 16, row1: 39 };
    const flat = { pxPerCell: OVERVIEW_PX_PER_CELL, detail: false };
    const shade = (seed: number, options: typeof flat | { pxPerCell: number }) =>
      shadeSeabed(terrain, seed, seabedRange(terrain), rect, [], options).data;
    assert.deepEqual(shade(1, flat), shade(2, flat), 'two seeds, one skin');
    assert.notDeepEqual(
      shade(1, { pxPerCell: 16 }),
      shade(2, { pxPerCell: 16 }),
      'the field is what a seed moves'
    );
  });

  it('yields once its bake budget is spent, not after every slice', async () => {
    // Sorrowgate's 20 × 16 cells at 4 px a cell: 2 slices a row, 32 in all.
    const terrain = sorrowgate();
    const options = { pxPerCell: 4 };
    const [seed, range] = [seabedSeed(terrain), seabedRange(terrain)];
    const bake = async (msPerRead: number) => {
      let t = 0;
      let yields = 0;
      const canvas = await bakeSeabedInSlices(
        terrain,
        seed,
        range,
        options,
        10,
        async () => void yields++,
        { now: () => (t += msPerRead) }
      );
      return { canvas, yields };
    };
    const frozen = await bake(0);
    assert.equal(frozen.yields, 0, 'no time spent, no yield');
    assert.equal((await bake(SLICED_BAKE_BUDGET_MS)).yields, 32, 'every slice over budget');
    // Three reads of 3 ms reach the 8 ms budget: a yield every third slice.
    assert.equal((await bake(3)).yields, 10);
    const pixels = (canvas: HTMLCanvasElement) =>
      canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    const whole = pixels(bakeSeabed(terrain, seed, range, [], options));
    const sliced = pixels(frozen.canvas);
    assert.equal(sliced.length, whole.length);
    assert.equal(
      sliced.findIndex((v, i) => v !== whole[i]),
      -1,
      'the slices are the whole bake'
    );
  });

  it('stops at its next yield once its signal aborts, a region let go (§7.5)', async () => {
    const terrain = sorrowgate();
    const controller = new AbortController();
    let yields = 0;
    let t = 0;
    await assert.rejects(
      bakeSeabedInSlices(
        terrain,
        seabedSeed(terrain),
        seabedRange(terrain),
        { pxPerCell: 4 },
        10,
        async () => {
          if (++yields === 2) controller.abort(new Error('let go'));
        },
        { now: () => (t += SLICED_BAKE_BUDGET_MS), signal: controller.signal }
      ),
      /let go/
    );
    assert.equal(yields, 2, 'it shades no slice past the yield it was let go in');
  });
});

describe('the seam (§7.3)', () => {
  it('eases over the band and nothing past it: 1 on the edge, 0 at 500 m in', () => {
    assert.equal(SEAM_BAND_M, WORLD.DETAIL_SURROUND_M - WORLD.FADE_M);
    assert.equal(SEAM_BAND_M, 500);
    const rect = { x: 0, y: 0, widthM: 10_000, heightM: 9_000 };
    assert.equal(seamWeight(rect, 0, 4_500), 1);
    assert.equal(seamWeight(rect, -300, 4_500), 1, 'past the edge is the overview');
    assert.equal(seamWeight(rect, 250, 4_500), 0.5);
    assert.equal(seamWeight(rect, 500, 4_500), 0);
    assert.equal(seamWeight(rect, 5_000, 4_500), 0);
    let last = 1;
    for (let d = 0; d <= 500; d += 25) {
      const w = seamWeight(rect, 5_000, 9_000 - d);
      assert.ok(w <= last, `falls monotonically, at ${d} m in`);
      last = w;
    }
    assert.match(SEAM_WEIGHT_GLSL, /return 1\.0 - smoothstep\(0\.0, 500\.0, inside\);/);
  });

  it("meets the overview on the detail's edge with neither a crack nor a ledge", () => {
    const mission = sorrowgate();
    const { rect, pads } = apronFrame(SORROWGATE_REGION, mission.cellM);
    const padded = paddedTerrain(mission, pads, detailGround(SORROWGATE_REGION)!)!;
    const seed = seabedSeed(mission);
    const rockTop = rockTopDepthM(mission);
    const paddedGrid = buildHeightGrid(padded, seed, rockTop);
    const missionGrid = buildHeightGrid(mission, seed, rockTop);
    const seamed = apronMesh(
      paddedGrid,
      missionGrid,
      pads,
      mission.cellM,
      seamHeightFor(SORROWGATE_REGION, rect)
    );
    const raw = apronMesh(paddedGrid, missionGrid, pads, mission.cellM);
    const grid = overviewGrid();
    const { vertsX, vertsZ } = paddedGrid;
    let edge = 0;
    let firstRing = 0;
    for (let iz = 0; iz < vertsZ; iz++) {
      for (let ix = 0; ix < vertsX; ix++) {
        const i = iz * vertsX + ix;
        const ring = Math.min(ix, iz, vertsX - 1 - ix, vertsZ - 1 - iz);
        const y = seamed.positions[i * 3 + 1]!;
        // The overview's own edge line, from its two vertices either side:
        // the drawn segment the apron's edge vertex has to lie on.
        const ax = SORROWGATE_REGION.x + seamed.positions[i * 3]!;
        const az = SORROWGATE_REGION.y + seamed.positions[i * 3 + 2]!;
        const gx = ax / grid.stepM;
        const gz = az / grid.stepM;
        const [x0, z0] = [Math.floor(gx), Math.floor(gz)];
        const along = (u: number, v: number) => grid.y[v * grid.vertsX + u]!;
        const line =
          gx === x0
            ? along(x0, z0) + (along(x0, z0 + 1) - along(x0, z0)) * (gz - z0)
            : along(x0, z0) + (along(x0 + 1, z0) - along(x0, z0)) * (gx - x0);
        if (ring === 0) {
          assert.ok(Math.abs(y - line) < 1e-3, `crack at ${ax}, ${az}: ${y} against ${line}`);
          edge++;
        } else if (ring === 1) {
          // 62.5 m in, the vertex is all but the overview's already: pinning
          // only the edge would leave the whole step here as a ledge.
          const overviewY = -0.22 * overviewDepthAtM(grid, ax, az);
          const own = raw.positions[i * 3 + 1]!;
          assert.ok(
            Math.abs(y - overviewY) <= 0.05 * Math.abs(own - overviewY) + 1e-3,
            `ledge at ${ax}, ${az}`
          );
          firstRing++;
        } else if (ring >= SEAM_BAND_M / paddedGrid.stepM) {
          assert.equal(y, raw.positions[i * 3 + 1], 'past the band the apron is its own');
        }
      }
    }
    assert.equal(edge, 2 * vertsX + 2 * (vertsZ - 2), 'the whole outer edge, once a vertex');
    assert.ok(firstRing > 0);
  });
});

const views: PerspectiveView[] = [];
async function mountPilot(
  withGround = true
): Promise<{ view: PerspectiveView; gl: HeadlessWebGLRenderer }> {
  const gl = new HeadlessWebGLRenderer();
  const view = new PerspectiveView('sorrowgate', SORROWGATE_REGION);
  views.push(view);
  assert.equal(
    view.mount(
      createHost(1280, 720) as unknown as HTMLElement,
      () => gl.asRenderer(),
      gl.environment
    ),
    true
  );
  if (withGround) view.setTerrain(sorrowgate());
  view.setActive(true);
  // The skin bakes between frames; the overview is drawn once it lands.
  await overviewSkin();
  pumpAnimationFrames();
  return { view, gl };
}

type Internals = {
  overview: { mesh: Mesh } | null;
  apron: { mesh: Mesh } | null;
  terrainMesh: Mesh | null;
  camera: Camera;
};
const internals = (view: PerspectiveView) => view as unknown as Internals;
/** The view's camera hook (`window.__perspectiveCamera`), as a drive aims it. */
const aimCamera = (x: number, z: number, d: number, aim: { yawDeg: number; pitchDeg: number }) =>
  (
    globalThis as unknown as {
      window: { __perspectiveCamera: (x: number, z: number, d: number, aim: object) => void };
    }
  ).window.__perspectiveCamera(x, z, d, aim);

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

describe('the overview in the pilot view (#1459)', () => {
  it("stands in atlas metres under the region's transform, and only in a placed view", async () => {
    const { view } = await mountPilot();
    const mesh = internals(view).overview!.mesh;
    assert.deepEqual(mesh.position.toArray(), [-SORROWGATE_REGION.x, 0, -SORROWGATE_REGION.y]);
    const positions = mesh.geometry.getAttribute('position') as BufferAttribute;
    assert.deepEqual([positions.getX(80), positions.getZ(181 * 81 - 1)], [40_000, 90_000]);
    assert.equal(
      (mesh.material as MeshBasicMaterial).customProgramCacheKey(),
      'echoes-world-overview-1'
    );
    const alone = new PerspectiveView('sorrowgate', null);
    views.push(alone);
    const gl = new HeadlessWebGLRenderer();
    alone.mount(
      createHost(1280, 720) as unknown as HTMLElement,
      () => gl.asRenderer(),
      gl.environment
    );
    alone.setTerrain(sorrowgate());
    assert.equal(internals(alone).overview, null, 'a mission drawn alone draws no world');
  });

  it('is drawn until the fade is full, and the frame pays for it only then', async () => {
    const { view, gl } = await mountPilot();
    const mesh = internals(view).overview!.mesh;
    assert.equal(mesh.visible, true, 'no state yet: the world is unfaded');
    // The first state, a frame into the ramp, then the ramp cut to full: two
    // frames of the same force that differ by the fade alone.
    view.setReducedMotion(false);
    pumpAnimationFrames();
    view.applySnapshot(cannedSnapshot());
    pumpAnimationFrames();
    assert.equal(mesh.visible, true, 'part-way in, the world still shows');
    const drawn = { ...gl.ledger };
    view.setReducedMotion(true);
    pumpAnimationFrames();
    assert.equal(mesh.visible, false, 'at full strength all of it is backdrop');
    assert.equal(drawn.calls - gl.ledger.calls, 1, 'one draw call');
    assert.equal(drawn.triangles - gl.ledger.triangles, 28_080, 'its triangles, cut');
    assert.ok(drawn.calls <= 150 && drawn.triangles <= 400_000, 'inside gate 6 with it drawn');
    view.resetForNewMatch();
    pumpAnimationFrames(2);
    assert.equal(mesh.visible, true, 'and drawn again as the fade goes out');
  });

  it('is cut where the detail stands, in the one buffer it was built with', async () => {
    const { view } = await mountPilot(false);
    const geometry = internals(view).overview!.mesh.geometry;
    const index = geometry.getIndex();
    assert.equal(geometry.drawRange.count, 28_800 * 3, 'nothing drawn there yet: the whole atlas');
    view.setTerrain(sorrowgate());
    assert.equal(geometry.drawRange.count, 28_080 * 3);
    assert.equal(geometry.getIndex(), index, 'cut in place, no new buffer');
    assert.equal(internals(view).overview!.mesh.geometry, geometry);
  });

  it('answers a projection on its own ground, and refuses a click there', async () => {
    const { view } = await mountPilot();
    aimCamera(2_500, 3_990, 4_000, { yawDeg: 180, pitchDeg: 25 });
    pumpAnimationFrames();
    // 2.5 km south of the detail's south edge, in the mission's metres.
    const at = { x: 2_500, y: 9_000 };
    const atlas = { x: at.x + SORROWGATE_REGION.x, y: at.y + SORROWGATE_REGION.y };
    assert.equal(
      view.seabedDepthAt(at.x, at.y),
      overviewDepthAtM(overviewGrid(), atlas.x, atlas.y)
    );
    const screen = view.projectPoint(at.x, at.y, null);
    assert.ok(screen.visible, 'on screen');
    const ray = new Raycaster();
    ray.setFromCamera(
      new Vector2((screen.x / 1280) * 2 - 1, -((screen.y / 720) * 2 - 1)),
      internals(view).camera
    );
    const hit = ray.intersectObject(internals(view).overview!.mesh, false)[0];
    assert.ok(hit !== undefined, 'the ray meets the overview');
    assert.ok(
      Math.hypot(hit.point.x - at.x, hit.point.z - at.y) < 2,
      `back where it was projected from: ${hit.point.x}, ${hit.point.z}`
    );
    assert.equal(view.refusesPick(screen.x, screen.y), true, 'the exterior takes no orders');
  });

  it('refuses a click over the overview only while it is drawn', async () => {
    const { view } = await mountPilot();
    // The first state, the ramp cut straight to full: the overview is hidden.
    view.setReducedMotion(true);
    view.applySnapshot(cannedSnapshot());
    pumpAnimationFrames();
    // An orbited-out eye far south of the detail, low, on the mission's middle.
    aimCamera(2_500, 2_000, 12_000, { yawDeg: 0, pitchDeg: 12 });
    pumpAnimationFrames();
    const { camera, terrainMesh, overview } = internals(view);
    const screen = view.projectPoint(2_500, 2_000, null);
    const ray = new Raycaster();
    ray.setFromCamera(new Vector2((screen.x / 1280) * 2 - 1, -((screen.y / 720) * 2 - 1)), camera);
    const ground = ray.intersectObject(terrainMesh!, false)[0]!.point;
    const eye = camera.position;
    assert.ok(eye.z > 10_000, `the eye stands past the detail: z ${eye.z}`);
    // Flatten the overview into a sheet the ray crosses at z 10,000 m, past the
    // detail's south edge (6,500 m), so it stands between the eye and the mission.
    const s = (10_000 - ground.z) / (eye.z - ground.z);
    // Not 0: the raycaster inverts the world matrix, and a singular one meets nothing.
    overview!.mesh.scale.y = 1e-3;
    overview!.mesh.position.y = ground.y + s * (eye.y - ground.y);
    overview!.mesh.updateMatrixWorld();
    assert.equal(overview!.mesh.visible, false, 'hidden at full strength');
    assert.equal(view.refusesPick(screen.x, screen.y), false, 'a hidden sheet refuses nothing');
    overview!.mesh.visible = true;
    assert.equal(view.refusesPick(screen.x, screen.y), true, 'a drawn one stands in front');
  });

  it("leaves the overview alone under a ground delta, and patches the apron's edge in place", async () => {
    const { view } = await mountPilot();
    const { overview, apron, terrainMesh } = internals(view);
    const overviewPositions = overview!.mesh.geometry.getAttribute('position') as BufferAttribute;
    const overviewVersion = overviewPositions.version;
    const indexVersion = overview!.mesh.geometry.getIndex()!.version;
    const apronGeometry = apron!.mesh.geometry;
    const apronPositions = apronGeometry.getAttribute('position') as BufferAttribute;
    const mission = sorrowgate();
    // A central cell first: nothing it moves reaches the apron.
    const central = 8 * mission.cols + 10;
    const before = apronPositions.version;
    view.applyGround([
      {
        index: central,
        floorM: mission.floor[central]! + 200,
        ceilingM: 0,
        biome: mission.biomes[central]!,
      },
    ]);
    assert.equal(apronPositions.version, before, 'a delta away from the edge leaves the apron');
    // Then a cell on the west edge, deepened 300 m.
    const edge = 8 * mission.cols;
    view.applyGround([
      {
        index: edge,
        floorM: mission.floor[edge]! + 300,
        ceilingM: 0,
        biome: mission.biomes[edge]!,
      },
    ]);
    assert.ok(apronPositions.version > before, 'the apron is patched');
    assert.equal(internals(view).apron!.mesh.geometry, apronGeometry, 'in place, not rebuilt');
    const missionPositions = terrainMesh!.geometry.getAttribute('position') as BufferAttribute;
    // Every apron vertex on the mission's west edge carries the mission's height.
    const { pads } = apronFrame(SORROWGATE_REGION, 250);
    const perCell = 4;
    const missionVertsX = mission.cols * perCell + 1;
    const apronVertsX = (mission.cols + pads.west + pads.east) * perCell + 1;
    for (let mz = 0; mz <= mission.rows * perCell; mz++) {
      const a = (mz + pads.north * perCell) * apronVertsX + pads.west * perCell;
      assert.equal(apronPositions.getY(a), missionPositions.getY(mz * missionVertsX), `row ${mz}`);
    }
    // And the whole apron is what a rebuild on the join's terms would draw.
    const seed = seabedSeed(mission);
    const rockTop = rockTopDepthM(mission);
    const patched = sorrowgate();
    patched.floor[central]! += 200;
    patched.floor[edge]! += 300;
    const rebuilt = apronMesh(
      buildHeightGrid(
        paddedTerrain(patched, pads, detailGround(SORROWGATE_REGION)!)!,
        seed,
        rockTop
      ),
      buildHeightGrid(patched, seed, rockTop),
      pads,
      250,
      seamHeightFor(SORROWGATE_REGION, apronFrame(SORROWGATE_REGION, 250).rect)
    );
    assert.deepEqual(Array.from(apronPositions.array), Array.from(rebuilt.positions));
    assert.equal(overviewPositions.version, overviewVersion, 'the overview never moves');
    assert.equal(overview!.mesh.geometry.getIndex()!.version, indexVersion);
  });
});

describe("another region's detail, where no session holds it (§7.5)", () => {
  type Residency = {
    residency: {
      counts: { requests: number; admitted: number; released: number; cancelled: number };
      drawn: () => string[];
      residentIds: () => ReadonlySet<string>;
      get: (id: string) => { mesh: Mesh } | undefined;
      pending: number;
    };
  };
  const residency = (view: PerspectiveView) => (view as unknown as Residency).residency;
  const camera = (x: number, z: number, d: number, aim: { pitchDeg: number }) =>
    aimCamera(x, z, d, { yawDeg: 0, ...aim });
  /** Frames until `done`, with the event loop let through between them. */
  async function until(done: () => boolean, what: string): Promise<void> {
    for (let i = 0; i < 2_000 && !done(); i++) {
      await new Promise((resolve) => setTimeout(resolve, 2));
      pumpAnimationFrames();
    }
    assert.ok(done(), `never ${what}`);
  }

  it('loads it once it projects large and in view, draws it cut into the overview, and lets it go', async () => {
    // No session: the view the board will hold (#1462), Sorrowgate's region
    // a region like any other.
    const { view, gl } = await mountPilot(false);
    const held = residency(view);
    camera(2_500, 2_000, 6_000, { pitchDeg: 60 });
    await until(() => held.drawn().includes(SORROWGATE_REGION.id), 'drawn');
    const mesh = held.get(SORROWGATE_REGION.id)!.mesh;
    assert.equal(mesh.visible, true);
    assert.deepEqual(mesh.position.toArray(), [
      HOLE.x - SORROWGATE_REGION.x,
      0,
      HOLE.y - SORROWGATE_REGION.y,
    ]);
    const overview = internals(view).overview!.mesh.geometry;
    assert.equal(overview.drawRange.count, 28_080 * 3, 'the overview is cut where it stands');
    // 160 × 144 quads of the whole detail, two triangles each, on the frame,
    // and the frame inside gate 6 with it.
    assert.ok(gl.ledger.triangles >= 28_080 + 160 * 144 * 2);
    assert.ok(gl.ledger.calls <= 150 && gl.ledger.triangles <= 400_000, 'inside gate 6');
    // Its edge on the overview's surface (§7.3, "Seam"): no crack, no ledge.
    const grid = overviewGrid();
    const positions = mesh.geometry.getAttribute('position') as BufferAttribute;
    let edges = 0;
    for (let i = 0; i < positions.count; i++) {
      const [x, z] = [positions.getX(i), positions.getZ(i)];
      if (x > 0 && z > 0 && x < HOLE.widthM && z < HOLE.heightM) continue;
      const y = depthToWorldY(overviewDepthAtM(grid, HOLE.x + x, HOLE.y + z));
      assert.ok(Math.abs(positions.getY(i) - y) < 1e-3, `edge vertex at ${x}, ${z}`);
      edges++;
    }
    assert.equal(edges, 2 * (161 + 145) - 4, 'every edge vertex');
    assert.equal(held.counts.requests, 1, 'asked for once, not every frame');
    // Looking away, it is let go: hidden, kept as the one left, the overview whole again.
    camera(-15_000, 40_000, 2_000, { pitchDeg: 88 });
    await until(() => held.drawn().length === 0, 'let go');
    assert.equal(mesh.visible, false);
    assert.equal(overview.drawRange.count, 28_800 * 3);
    assert.deepEqual([...held.residentIds()], [SORROWGATE_REGION.id], 'kept until a third arrives');
    view.destroy();
    views.splice(views.indexOf(view), 1);
    assert.equal(held.counts.released, 1, 'released with the view');
  });

  it('asks for nothing at full strength, where the overview it is cut into is hidden', async () => {
    const { view } = await mountPilot();
    // A second placed region east of the pilot's detail, which the atlas does
    // not have yet: its request fails for want of ground, so only the asking
    // is counted.
    const east: WorldRegion = {
      id: 'east',
      mapId: 'east',
      x: 27_500,
      y: 40_500,
      widthM: 5_000,
      heightM: 4_000,
    };
    (view as unknown as { detailRegions: WorldRegion[] }).detailRegions = [SORROWGATE_REGION, east];
    const held = residency(view);
    // A first state, the ramp cut straight to full, then the camera on it.
    view.setReducedMotion(true);
    view.applySnapshot(cannedSnapshot());
    camera(12_500, 2_000, 6_000, { pitchDeg: 60 });
    pumpAnimationFrames();
    assert.equal(internals(view).overview!.mesh.visible, false, 'full strength');
    assert.equal(held.counts.requests, 0, 'nothing asked for');
    // The session's state gone, the fade goes out and the overview is drawn.
    view.resetForNewMatch();
    pumpAnimationFrames();
    assert.equal(internals(view).overview!.mesh.visible, true, 'the fade gone out');
    assert.equal(held.counts.requests, 1, 'asked for once the overview is drawn');
  });

  it("lets go of its own region's copy once a session takes the region", async () => {
    const { view } = await mountPilot(false);
    const held = residency(view);
    camera(2_500, 2_000, 6_000, { pitchDeg: 60 });
    await until(() => held.drawn().includes(SORROWGATE_REGION.id), 'drawn');
    // The room's ground arrives after the copy was built: the session holds it now.
    view.setTerrain(sorrowgate());
    pumpAnimationFrames();
    assert.deepEqual([...held.residentIds()], [], 'no second copy held');
    assert.equal(held.counts.released, 1);
    assert.ok(internals(view).terrainMesh !== null, "the session's own drawn instead");
  });

  it('builds a detail under the veil, before it is ever resident', async () => {
    // A session's veil listens; a sessionless view's does not.
    const { view } = await mountPilot();
    view.setVeilIntensity(1);
    view.applySnapshot(cannedSnapshot());
    pumpAnimationFrames();
    const overview = (internals(view).overview!.mesh.material as MeshBasicMaterial).color;
    assert.notEqual(overview.getHex(), 0xffffff, 'someone listens: the floor shade');
    const build = view as unknown as {
      loadRegionDetail: (id: string, signal: AbortSignal) => Promise<{ mesh: Mesh }>;
      releaseRegionDetail: (detail: { mesh: Mesh }) => void;
    };
    // Built as the residency's request builds it, before anything admits it.
    const signal = new AbortController().signal;
    const detail = await build.loadRegionDetail(SORROWGATE_REGION.id, signal);
    const color = (detail.mesh.material as MeshBasicMaterial).color;
    assert.equal(color.getHex(), overview.getHex(), 'the same shade as the overview');
    build.releaseRegionDetail(detail);
  });

  it('cancels a request its region no longer needs, and leaves nothing behind', async () => {
    const { view } = await mountPilot(false);
    const held = residency(view);
    const before = internals(view).overview!.mesh.parent!.children.length;
    camera(2_500, 2_000, 6_000, { pitchDeg: 60 });
    pumpAnimationFrames();
    assert.equal(held.pending, 1, 'asked for');
    camera(-15_000, 40_000, 2_000, { pitchDeg: 88 });
    pumpAnimationFrames();
    assert.equal(held.counts.cancelled, 1, 'and cancelled');
    await new Promise((resolve) => setTimeout(resolve, 50));
    pumpAnimationFrames();
    assert.equal(held.pending, 0);
    assert.equal(held.residentIds().size, 0, 'nothing held');
    assert.equal(internals(view).overview!.mesh.parent!.children.length, before, 'nothing added');
  });

  it('is never asked for while a session holds the region', async () => {
    const { view } = await mountPilot();
    camera(2_500, 2_000, 6_000, { pitchDeg: 60 });
    pumpAnimationFrames(3);
    assert.equal(residency(view).counts.requests, 0);
  });
});
