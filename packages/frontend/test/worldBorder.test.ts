/**
 * The mission border in the continuous world — docs/world-map.md §7.4 (#1461).
 *
 * Three rules share one rectangle: the focus is clamped to it and the eye is
 * not; only the exterior fades; the exterior takes no orders. These hold the
 * pilot view to each, the apron's data to the seam it promises, and a view
 * drawn alone to everything it did before.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import { Biome, SORROWGATE_REGION, WORLD, exteriorFade } from '@echoes/shared';
import { createHost, HeadlessWebGLRenderer, pumpAnimationFrames } from './support/headless.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { buildHeightGrid } from '../src/game/perspectiveTerrain.ts';
import {
  EXTERIOR_FADE_GLSL,
  apronBaseFor,
  apronFrame,
  apronMesh,
  paddedTerrain,
} from '../src/game/worldBorder.ts';
import type { TerrainPayload } from '../src/net/GameClient.ts';

/** Sorrowgate's size, 20 × 16 cells of 250 m, with a trench along the south. */
function pilotTerrain(): TerrainPayload {
  const cols = 20;
  const rows = 16;
  const biomes = new Array<number>(cols * rows).fill(Biome.CoralRuins);
  const floor = new Array<number>(cols * rows).fill(1600);
  const ceiling = new Array<number>(cols * rows).fill(0);
  for (let col = 0; col < cols; col++) {
    for (let row = 12; row < rows; row++) {
      biomes[row * cols + col] = Biome.AbyssalTrench;
      floor[row * cols + col] = 2400;
    }
    floor[col] = 340;
  }
  return { cols, rows, cellM: 250, biomes, floor, ceiling } as unknown as TerrainPayload;
}

const probe = () =>
  (
    globalThis as unknown as {
      window: {
        __perspectiveProbe: () => {
          focus: { xM: number; zM: number };
          eye: { xM: number; zM: number; depthM: number };
        };
      };
    }
  ).window.__perspectiveProbe();

const views: PerspectiveView[] = [];
function mountView(placed: boolean): { view: PerspectiveView; gl: HeadlessWebGLRenderer } {
  const gl = new HeadlessWebGLRenderer();
  const view = new PerspectiveView('sorrowgate', placed ? SORROWGATE_REGION : null);
  views.push(view);
  const host = createHost(1280, 720) as unknown as HTMLElement;
  assert.equal(view.mount(host, () => gl.asRenderer(), gl.environment), true);
  view.setTerrain(pilotTerrain());
  view.setActive(true);
  pumpAnimationFrames();
  return { view, gl };
}

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

describe('the apron: the exterior until #1457 authors it', () => {
  it("is the map's own base ground, ten cells round Sorrowgate", () => {
    assert.deepEqual(apronBaseFor('sorrowgate'), { biome: Biome.CoralRuins, floorM: 1600 });
    assert.equal(apronBaseFor('ventfront-divide'), null, 'only placed maps have one');
    const { rect, pads } = apronFrame(SORROWGATE_REGION, 250);
    assert.deepEqual(rect, { x: -2_500, y: -2_500, widthM: 10_000, heightM: 9_000 });
    assert.deepEqual(pads, { west: 10, north: 10, east: 10, south: 10 });
  });

  it('pastes the mission into base ground cell for cell', () => {
    const mission = pilotTerrain();
    const pads = { west: 10, north: 10, east: 10, south: 10 };
    const padded = paddedTerrain(mission, pads, { biome: Biome.CoralRuins, floorM: 1600 });
    assert.equal(padded.cols, 40);
    assert.equal(padded.rows, 36);
    for (let row = 0; row < mission.rows; row++) {
      for (let col = 0; col < mission.cols; col++) {
        const to = (row + 10) * 40 + col + 10;
        assert.equal(padded.floor[to], mission.floor[row * mission.cols + col]);
        assert.equal(padded.biomes[to], mission.biomes[row * mission.cols + col]);
      }
    }
    assert.equal(padded.floor[0], 1600);
    assert.equal(padded.biomes[padded.biomes.length - 1], Biome.CoralRuins);
  });

  it('meets the mission mesh on its edge exactly, and draws nothing inside it', () => {
    const mission = pilotTerrain();
    const pads = { west: 10, north: 10, east: 10, south: 10 };
    const padded = paddedTerrain(mission, pads, { biome: Biome.CoralRuins, floorM: 1600 });
    const missionGrid = buildHeightGrid(mission);
    const mesh = apronMesh(buildHeightGrid(padded), missionGrid, pads, 250);
    // 160 × 144 quads in the detail rectangle, less the mission's 80 × 64.
    assert.equal(mesh.triangles, (160 * 144 - 80 * 64) * 2);
    const at = (i: number) => ({
      x: mesh.positions[i * 3]!,
      y: mesh.positions[i * 3 + 1]!,
      z: mesh.positions[i * 3 + 2]!,
    });
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const [a, b, c] = [at(mesh.indices[t]!), at(mesh.indices[t + 1]!), at(mesh.indices[t + 2]!)];
      const cx = (a.x + b.x + c.x) / 3;
      const cz = (a.z + b.z + c.z) / 3;
      assert.ok(cx < 0 || cx > 5_000 || cz < 0 || cz > 4_000, `triangle inside at ${cx}, ${cz}`);
    }
    // Every vertex on the mission's edge carries the mission grid's own height.
    let seam = 0;
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const { x, y, z } = at(i);
      const onEdge = (x === 0 || x === 5_000 || z === 0 || z === 4_000) && x >= 0 && x <= 5_000;
      if (!onEdge || z < 0 || z > 4_000) continue;
      const ix = Math.round(x / missionGrid.stepM);
      const iz = Math.round(z / missionGrid.stepM);
      assert.equal(y, missionGrid.y[iz * missionGrid.vertsX + ix], `seam at ${x}, ${z}`);
      seam++;
    }
    assert.equal(seam, 2 * 81 + 2 * 63, 'the whole perimeter, once per vertex');
  });

  it('states the fade in GLSL at the same W the contract holds', () => {
    assert.match(EXTERIOR_FADE_GLSL, new RegExp(`smoothstep\\(0\\.0, ${WORLD.FADE_M}\\.0, length`));
    // GLSL's smoothstep is 3t² − 2t³, which is the contract's curve.
    const glsl = (d: number) => {
      const t = Math.min(1, Math.max(0, d / WORLD.FADE_M));
      return 1 - t * t * (3 - 2 * t);
    };
    for (const d of [0, 250, 1_000, 1_999, 2_000, 4_000]) assert.equal(glsl(d), exteriorFade(d));
  });
});

describe('the pilot view at its border', () => {
  it('draws the apron with the fade, keeps the rim and drops the skirt', () => {
    const placed = mountView(true).view;
    const alone = mountView(false).view;
    const skirt = (view: PerspectiveView) =>
      (view as unknown as { terrainDressing: { children: unknown[] } }).terrainDressing.children.some(
        (child) =>
          child instanceof Mesh &&
          child.material instanceof MeshBasicMaterial &&
          child.material.side === DoubleSide &&
          child.material.color.getHex() === 0x040a12
      );
    assert.equal(skirt(placed), false, 'the pilot has no wall');
    assert.equal(skirt(alone), true, 'a mission drawn alone keeps its skirt');
    const apron = (view: PerspectiveView) =>
      (view as unknown as { apron: { mesh: Mesh | null } | null }).apron?.mesh ?? null;
    const mesh = apron(placed);
    assert.ok(mesh !== null, 'the exterior is drawn');
    assert.equal(apron(alone), null);
    // The fade's program is the one the cache key names, compiled from the GLSL above.
    assert.equal((mesh.material as MeshBasicMaterial).customProgramCacheKey(), 'echoes-world-border-1');
  });

  it('holds the focus inside the mission under every verb', () => {
    const { view } = mountView(true);
    const inside = () => {
      const { focus } = probe();
      assert.ok(focus.xM >= 0 && focus.xM <= 5_000, `focus x ${focus.xM}`);
      assert.ok(focus.zM >= 0 && focus.zM <= 4_000, `focus z ${focus.zM}`);
    };
    const camera = (
      globalThis as unknown as {
        window: { __perspectiveCamera: (x: number, z: number, d?: number) => void };
      }
    ).window.__perspectiveCamera;
    const verbs: Array<[string, () => void]> = [
      ['focusWorld past the west', () => view.focusWorld(-9_000, 2_000)],
      ['focusWorld past the south-east', () => view.focusWorld(12_000, 15_000, 900)],
      ['drag far east', () => view.panBy(-1e5, 0)],
      ['drag far north', () => view.panBy(0, 1e5)],
      ['zoom about a corner', () => view.zoomAt(0, 0, 0.4)],
      ['orbit', () => view.orbitBy(400, -80)],
      ['raise the focus', () => view.raiseFocusBy(800)],
      ['the probe', () => camera(-5_000, 9_000, 800)],
      ['home', () => view.home()],
      ['fit', () => view.fitToMap()],
    ];
    for (const [, verb] of verbs) {
      verb();
      pumpAnimationFrames();
      inside();
    }
  });

  it('lets the eye orbit out over the apron, clear of its ground', () => {
    const { view } = mountView(true);
    // The focus on the trench floor at the south edge (2,400 m), the eye low and
    // 600 m out over the apron, whose base floor (1,600 m) stands 800 m higher:
    // clearance read off the mission's edge cell would leave the eye in rock.
    const camera = (
      globalThis as unknown as {
        window: {
          __perspectiveCamera: (x: number, z: number, d: number, aim: { pitchDeg: number }) => void;
        };
      }
    ).window.__perspectiveCamera;
    camera(2_500, 3_990, 600, { pitchDeg: 10 });
    pumpAnimationFrames();
    const { eye, focus } = probe();
    assert.ok(focus.zM <= 4_000, 'the focus is on mission ground');
    assert.ok(eye.zM > 4_200, `the eye is out over the apron, at z ${eye.zM}`);
    const ground = view.seabedDepthAt(eye.xM, eye.zM);
    assert.ok(ground < 2_000, `the ground under it is the apron's, ${ground} m`);
    // 25 m of clearance, less the metre the probe's rounding of the eye costs.
    assert.ok(eye.depthM <= ground - 24, `eye at ${eye.depthM} m, apron ground at ${ground} m`);
  });

  it('refuses a click past the edge, and only in the pilot', () => {
    const placed = mountView(true).view;
    placed.home();
    placed.focusWorld(2_500, 3_000, 4_000);
    pumpAnimationFrames();
    const out = placed.projectPoint(2_500, 4_900, null);
    const inn = placed.projectPoint(2_500, 2_000, null);
    assert.ok(out.visible && inn.visible, 'both points are on screen');
    assert.equal(placed.refusesPick(out.x, out.y), true, 'the exterior takes no orders');
    assert.equal(placed.refusesPick(inn.x, inn.y), false, 'the mission does');

    const alone = mountView(false).view;
    alone.home();
    alone.focusWorld(2_500, 3_000, 4_000);
    pumpAnimationFrames();
    const past = alone.projectPoint(2_500, 4_900, null);
    assert.equal(alone.refusesPick(past.x, past.y), false, 'a view drawn alone still clamps');
  });
});
