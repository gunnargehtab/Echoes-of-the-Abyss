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
import { DoubleSide, Mesh, MeshBasicMaterial, ShaderLib } from 'three';
import {
  Biome,
  Faction,
  SORROWGATE_REGION,
  WORLD,
  detailGround,
  exteriorFade,
} from '@echoes/shared';
import {
  createHost,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
} from './support/headless.ts';
import { cannedMap, cannedSnapshot } from './support/cannedMatch.ts';
import { EchoRenderer, type RendererCallbacks } from '../src/game/EchoRenderer.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { buildHeightGrid } from '../src/game/perspectiveTerrain.ts';
import {
  EXTERIOR_FADE_GLSL,
  stepBorderStrength,
  apronFrame,
  apronMesh,
  paddedTerrain,
} from '../src/game/worldBorder.ts';
import { overviewSkin } from '../src/game/worldOverview.ts';
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
  assert.equal(
    view.mount(host, () => gl.asRenderer(), gl.environment),
    true
  );
  view.setTerrain(pilotTerrain());
  view.setActive(true);
  pumpAnimationFrames();
  return { view, gl };
}

afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

describe("the apron: the region's authored surround (#1457)", () => {
  it("is §7.3's detail rectangle, ten cells round Sorrowgate", () => {
    const { rect, pads } = apronFrame(SORROWGATE_REGION, 250);
    assert.deepEqual(rect, { x: -2_500, y: -2_500, widthM: 10_000, heightM: 9_000 });
    assert.deepEqual(pads, { west: 10, north: 10, east: 10, south: 10 });
    const surround = detailGround(SORROWGATE_REGION)!;
    assert.equal(surround.cols, 40);
    assert.equal(surround.rows, 36);
  });

  it('pastes the live mission into the surround, and never writes the surround', () => {
    const mission = pilotTerrain();
    const pads = { west: 10, north: 10, east: 10, south: 10 };
    const surround = detailGround(SORROWGATE_REGION)!;
    const baseline = Array.from(surround.floor);
    const padded = paddedTerrain(mission, pads, surround)!;
    assert.equal(padded.cols, 40);
    assert.equal(padded.rows, 36);
    for (let row = 0; row < padded.rows; row++) {
      for (let col = 0; col < padded.cols; col++) {
        const to = row * 40 + col;
        const inside = row >= 10 && row < 26 && col >= 10 && col < 30;
        const from = (row - 10) * mission.cols + col - 10;
        assert.equal(padded.floor[to], inside ? mission.floor[from] : surround.floor[to]);
        assert.equal(padded.biomes[to], inside ? mission.biomes[from] : surround.biomes[to]);
        assert.equal(padded.ceiling[to], inside ? mission.ceiling[from] : surround.ceiling[to]);
      }
    }
    assert.deepEqual(Array.from(surround.floor), baseline, 'the baseline is as it was');
    assert.equal(
      paddedTerrain(mission, { ...pads, west: 9 }, surround),
      null,
      'a grid that does not fit is refused, not cropped'
    );
  });

  it('meets the mission mesh on its edge exactly, and draws nothing inside it', () => {
    const mission = pilotTerrain();
    const pads = { west: 10, north: 10, east: 10, south: 10 };
    const padded = paddedTerrain(mission, pads, detailGround(SORROWGATE_REGION)!)!;
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
    assert.match(
      EXTERIOR_FADE_GLSL,
      new RegExp(`smoothstep\\(0\\.0, ${WORLD.FADE_M}\\.0, echoesExteriorDistance\\(p\\)\\)`)
    );
    assert.match(
      EXTERIOR_FADE_GLSL,
      /return length\(max\(max\(lo - p, p - hi\), vec2\(0\.0\)\)\);/
    );
    // GLSL's smoothstep is 3t² − 2t³, which is the contract's curve.
    const glsl = (d: number) => {
      const t = Math.min(1, Math.max(0, d / WORLD.FADE_M));
      return 1 - t * t * (3 - 2 * t);
    };
    for (const d of [0, 250, 1_000, 1_999, 2_000, 4_000]) assert.equal(glsl(d), exteriorFade(d));
  });
});

describe('the ramp: §7.4 fades the border in over 0.8 s', () => {
  it('comes in and goes out linearly, and at once under reduced motion', () => {
    assert.equal(WORLD.FADE_RAMP_S, 0.8);
    assert.equal(stepBorderStrength(0, 1, 400, false), 0.5);
    assert.equal(stepBorderStrength(0.5, 1, 400, false), 1);
    assert.equal(stepBorderStrength(1, 1, 5_000, false), 1, 'and holds');
    assert.equal(stepBorderStrength(1, 0, 200, false), 0.75);
    assert.equal(stepBorderStrength(0.1, 0, 800, false), 0);
    assert.equal(stepBorderStrength(0, 1, 16, true), 1, 'a cut under reduced motion');
    assert.equal(stepBorderStrength(1, 0, 16, true), 0);
  });
});

describe('the pilot view at its border', () => {
  it('draws the apron with the fade, keeps the rim and drops the skirt', () => {
    const placed = mountView(true).view;
    const alone = mountView(false).view;
    const skirt = (view: PerspectiveView) =>
      (
        view as unknown as { terrainDressing: { children: unknown[] } }
      ).terrainDressing.children.some(
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
    // The fade's program, with the tutorial's ground surface chained after it.
    assert.equal(
      (mesh.material as MeshBasicMaterial).customProgramCacheKey(),
      'echoes-world-border-5:sorrowgate-ground-1'
    );
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
    // 600 m out over the surround's districts (1,600 m), west of the Commit's
    // basin, 800 m higher: clearance read off the mission's edge cell would
    // leave the eye in rock.
    const camera = (
      globalThis as unknown as {
        window: {
          __perspectiveCamera: (x: number, z: number, d: number, aim: { pitchDeg: number }) => void;
        };
      }
    ).window.__perspectiveCamera;
    camera(750, 3_990, 600, { pitchDeg: 10 });
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

  it('gives no order for a right click past the edge, and one inside it', async () => {
    const { view } = mountView(true);
    const orders: string[] = [];
    const callbacks = new Proxy(
      {},
      {
        get: (_target, name) => (): void => {
          if (String(name).endsWith('Order')) orders.push(String(name));
        },
      }
    ) as RendererCallbacks;
    const app = new HeadlessApplication();
    const chart = new EchoRenderer(callbacks, app.asApplication());
    await chart.init(createHost(1280, 720) as unknown as HTMLElement);
    try {
      chart.setConn(view);
      chart.setTerrain(pilotTerrain());
      chart.setMap(cannedMap());
      chart.setIdentity(0, Faction.Bathyarch);
      view.setIdentity(0, Faction.Bathyarch);
      const snapshot = cannedSnapshot();
      chart.applySnapshot(snapshot);
      view.applySnapshot(snapshot);
      const frame = () => {
        pumpAnimationFrames();
        app.frame();
      };
      const canvas = app.canvas;
      const click = (button: 0 | 2, at: { x: number; y: number }) => {
        for (const type of ['pointerdown', 'pointerup']) {
          canvas.dispatch(type, {
            button,
            buttons: type === 'pointerdown' ? (button === 2 ? 2 : 1) : 0,
            pointerId: 1,
            pointerType: 'mouse',
            clientX: at.x,
            clientY: at.y,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
          });
        }
        frame();
      };
      const hull = snapshot.units[0]!;
      chart.focusOn(hull.x, hull.y);
      frame();
      click(0, view.projectPoint(hull.x, hull.y, hull.depth));
      // Look at the south edge, with ground on both sides of it on screen.
      view.focusWorld(2_500, 3_000, 4_000);
      frame();
      click(2, view.projectPoint(2_500, 4_900, null));
      assert.deepEqual(orders, [], 'the exterior takes no orders');
      click(2, view.projectPoint(2_500, 2_500, null));
      assert.ok(orders.length > 0, 'and the mission still does');
    } finally {
      chart.destroy();
    }
  });

  it("fades to the backdrop along each ray, from the backdrop's own anchor", async () => {
    const { view } = mountView(true);
    const internals = view as unknown as {
      apron: { mesh: Mesh };
      overview: { mesh: Mesh };
      backdrop: { focusDepthUniform: { value: number } };
    };
    const compile = (material: MeshBasicMaterial) => {
      const shader = {
        uniforms: {} as Record<string, unknown>,
        vertexShader: ShaderLib.basic.vertexShader,
        fragmentShader: ShaderLib.basic.fragmentShader,
      };
      material.onBeforeCompile(shader as never, undefined as never);
      return shader;
    };
    const shader = compile(internals.apron.mesh.material as MeshBasicMaterial);
    const seamOn = shader.uniforms.uSeamOn as { value: number };
    // The skin lands a task after the view mounts, never inside it.
    assert.equal(seamOn.value, 0, 'before the skin has landed');
    await overviewSkin();
    assert.equal(
      shader.uniforms.uFocusDepthM,
      internals.backdrop.focusDepthUniform,
      'the same uniform object the backdrop draws with, not a copy'
    );
    assert.match(shader.fragmentShader, /uFocusDepthM - borderRay\.y \* 2200\.0/);
    assert.match(shader.fragmentShader, /linearToOutputTexel\( vec4\( borderDark/);
    const fog = shader.fragmentShader.indexOf('#include <fog_fragment>');
    assert.ok(fog > 0 && shader.fragmentShader.indexOf('borderFade', fog) > fog, 'after the fog');
    // The surface hook asks the apron's own cell reader, offset into the padded grid.
    assert.match(shader.fragmentShader, /surveyCellAt\(vSurveyXZ\)/);
    assert.match(shader.fragmentShader, /\+ ivec2\( uApronPad \)/);
    // Until the overview's skin lands nothing is drawn past the apron, so its
    // last 500 m go to the backdrop whatever the ramp is doing (#1461); the
    // skin's landing takes the feather off, and the overview never has one.
    assert.match(shader.fragmentShader, /smoothstep\( 2000\.0, 2500\.0, echoesExteriorDistance/);
    assert.match(shader.fragmentShader, /borderFade \*= mix\( borderFeather, 1\.0, uSeamOn \);/);
    const overviewShader = compile(internals.overview.mesh.material as MeshBasicMaterial);
    assert.doesNotMatch(overviewShader.fragmentShader, /borderFeather/);
    assert.match(
      shader.fragmentShader,
      /vec3 seamOverview = texture2D\( uOverviewMap, seamUV \)\.rgb \* diffuse;\s*outgoingLight = mix\( outgoingLight, seamOverview, echoesSeamWeight\( vBorderWorld\.xz \) \* uSeamOn \);\s*#include <opaque_fragment>/
    );
    assert.equal(
      (shader.uniforms.uOverviewMap as { value: unknown }).value,
      (internals.overview.mesh.material as MeshBasicMaterial).map,
      "the overview's own skin, so the two are one colour on the seam"
    );
    assert.equal(seamOn.value, 1, 'once it has landed');
  });

  it('ramps in over real frames, and lands at detach', () => {
    const { view } = mountView(true);
    const strength = () =>
      (view as unknown as { border: { uBorderStrength: { value: number } } }).border.uBorderStrength
        .value;
    view.setReducedMotion(false);
    view.applySnapshot(cannedSnapshot());
    pumpAnimationFrames();
    const start = Date.now();
    while (Date.now() - start < 120) pumpAnimationFrames();
    const part = strength();
    assert.ok(part > 0 && part < 1, `part-way in after a moment, not cut: ${part}`);
    view.detach();
    assert.equal(
      (view as unknown as { borderStrength: number }).borderStrength,
      1,
      'detached, the ramp lands on its target: nothing was drawn to ramp'
    );
  });

  it('ramps the fade in on the first state, for the apron and the snow alike', () => {
    const { view } = mountView(true);
    type Internals = {
      border: { uBorderStrength: { value: number } } | null;
      snow: { points: { material: { uniforms: { uBorderStrength: { value: number } } } } };
    };
    const internals = view as unknown as Internals;
    const snow = (v: Internals) => v.snow.points.material.uniforms.uBorderStrength.value;
    pumpAnimationFrames(3);
    assert.equal(internals.border!.uBorderStrength.value, 0, 'no state yet, no border');
    assert.equal(snow(internals), 0);
    view.setReducedMotion(true);
    view.applySnapshot(cannedSnapshot());
    pumpAnimationFrames();
    assert.equal(internals.border!.uBorderStrength.value, 1, 'cut in under reduced motion');
    assert.equal(snow(internals), 1);
    view.resetForNewMatch();
    pumpAnimationFrames();
    assert.equal(internals.border!.uBorderStrength.value, 0, 'and out with the mission state');

    const alone = mountView(false).view;
    alone.applySnapshot(cannedSnapshot());
    pumpAnimationFrames(3);
    assert.equal(snow(alone as unknown as Internals), 0, 'no border on a view drawn alone');
  });

  it('shades the apron at the veil floor while anyone listens, and clear while nobody does', () => {
    const { view } = mountView(true);
    const color = () =>
      ((view as unknown as { apron: { mesh: Mesh } }).apron.mesh.material as MeshBasicMaterial)
        .color;
    const overview = () =>
      (
        (view as unknown as { overview: { mesh: Mesh } }).overview.mesh
          .material as MeshBasicMaterial
      ).color;
    view.setVeilIntensity(1);
    view.applySnapshot(cannedSnapshot());
    pumpAnimationFrames();
    const heard = color().clone();
    assert.ok(heard.r < 0.5 && heard.b < 1, `the floor shade, not white: ${heard.getHexString()}`);
    assert.equal(overview().getHex(), heard.getHex(), 'the overview under the same veil');
    view.resetForNewMatch();
    pumpAnimationFrames();
    assert.equal(color().getHex(), 0xffffff, 'nobody listening: the field is clear and so is it');
    view.applySnapshot(cannedSnapshot());
    view.setVeilIntensity(0);
    pumpAnimationFrames();
    assert.equal(color().getHex(), 0xffffff, 'the veil turned off');
  });
});
