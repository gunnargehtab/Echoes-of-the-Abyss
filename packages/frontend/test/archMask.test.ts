/**
 * The arch study's per-material mask and windows — docs/sorrowgate-arch-study.md
 * §11, "Acceptance at the opening" (#1683): "The probe changes nothing in the
 * scene, so the before set is captured with it over the base commit's scene."
 *
 * The runner has no WebGL, so the renderer is the one thing modelled: it
 * records which material each mesh carried and what was visible at the
 * moment it drew, and writes into the counts the mask must hand back. The
 * layer, the arch and its template are the real ones. What the mask's pixels
 * read is the capture's evidence (docs/screenshots/issue-1683/).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  Vector2,
  type Material,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PUBLIC_LANDMARKS, paintGround, SORROWGATE_GROUND } from '@echoes/shared';
import { PUBLIC_LANDMARK_SPECS } from '../src/game/environment.ts';
import {
  buildLandmarkTemplate,
  primeLandmarkTemplate,
  resetLandmarkModels,
} from '../src/game/landmarkModels.ts';
import { EnvironmentLayer } from '../src/game/environmentLayer.ts';
import { depthToWorldY } from '../src/game/perspectiveTerrain.ts';
import { MASK_CODE, maskTarget, readMaterialMask } from '../src/game/archMask.ts';

const ARCH = PUBLIC_LANDMARKS['sorrowgate']![0]!;
const SPEC = PUBLIC_LANDMARK_SPECS[0]!;
const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);

async function standArch(): Promise<EnvironmentLayer> {
  const bytes = readFileSync(new URL(`${SPEC.slug}.glb`, MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const scene = (await new GLTFLoader().parseAsync(buffer, '')).scene;
  primeLandmarkTemplate(buildLandmarkTemplate(scene, SPEC, 'sorrowgate'), 'sorrowgate');
  const cells = paintGround(SORROWGATE_GROUND);
  const layer = new EnvironmentLayer('sorrowgate');
  layer.setLandmarks([ARCH]);
  layer.rebuild(
    {
      cols: cells.cols,
      rows: cells.rows,
      cellM: cells.cellM,
      biomes: Array.from(cells.biomes),
      floor: Array.from(cells.floor),
      ceiling: Array.from(cells.ceiling),
    },
    () => -999
  );
  return layer;
}

/** What one draw saw: each mesh's material and each object's visibility. */
interface Drawn {
  materials: Map<Object3D, Material | Material[]>;
  visible: Map<Object3D, boolean>;
  target: unknown;
  background: unknown;
}

/** A renderer that records the draw instead of rasterising it. */
function recordingRenderer() {
  const draws: Drawn[] = [];
  let target: unknown = null;
  let clear = new Color(0x123456);
  let clearAlpha = 0.5;
  const info = { render: { calls: 7, triangles: 70, points: 1, lines: 2, frame: 3 } };
  const renderer = {
    info,
    autoClear: false,
    getDrawingBufferSize: (v: Vector2) => v.set(4, 3),
    getClearColor: (c: Color) => c.copy(clear),
    getClearAlpha: () => clearAlpha,
    setClearColor: (c: Color | number, a: number) => {
      clear = new Color(c);
      clearAlpha = a;
    },
    getRenderTarget: () => target,
    setRenderTarget: (t: unknown) => {
      target = t;
    },
    render: (scene: Scene) => {
      const drawn: Drawn = {
        materials: new Map(),
        visible: new Map(),
        target,
        background: scene.background,
      };
      scene.traverse((child) => {
        drawn.visible.set(child, child.visible);
        if (child instanceof Mesh) drawn.materials.set(child, child.material);
      });
      draws.push(drawn);
      // The draw counts, as three's would: the mask must hand them back.
      info.render.calls += 5;
      info.render.triangles += 500;
      info.render.frame += 1;
    },
    readRenderTargetPixels: (
      _t: unknown,
      _x: number,
      _y: number,
      w: number,
      h: number,
      out: Uint8Array
    ) => {
      assert.equal(out.length, w * h * 4);
    },
  };
  return { renderer: renderer as unknown as WebGLRenderer, draws, info };
}

/** The red code a mask material writes, read off its compiled fragment. */
function codeOf(material: Material): number {
  const shader = {
    uniforms: {} as Record<string, unknown>,
    vertexShader: '#include <common>\n#include <begin_vertex>',
    fragmentShader: '#include <common>\n#include <dithering_fragment>',
  };
  material.onBeforeCompile(shader as never, null as never);
  const match = /gl_FragColor = vec4\( ([0-9.]+),/.exec(shader.fragmentShader);
  assert.ok(match, 'the mask material writes a code');
  return Math.round(Number(match[1]) * 255);
}

describe('the arch study’s per-material mask (§11)', () => {
  it('codes each landmark material and each own hull, hides what lies over a pixel, and puts everything back', async () => {
    const layer = await standArch();
    try {
      const scene = new Scene();
      scene.background = new Color(0x010203);
      scene.add(layer.group);
      const hulls = new Group();
      const laminate = new MeshStandardMaterial({ color: 0x334455, side: DoubleSide });
      const lamp = new MeshStandardMaterial({ emissive: 0x88ff66 });
      const hull = new Mesh(new BoxGeometry(), laminate);
      const hullLamp = new Mesh(new BoxGeometry(), lamp);
      hulls.add(hull, hullLamp);
      scene.add(hulls);
      const ground = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
      const water = new Mesh(
        new BoxGeometry(),
        new MeshBasicMaterial({ transparent: true, opacity: 0.4 })
      );
      const motes = new Points(undefined, new PointsMaterial());
      scene.add(ground, water, motes);

      const before = new Map<Object3D, Material | Material[]>();
      scene.traverse((child) => {
        if (child instanceof Mesh || child instanceof Points) before.set(child, child.material);
      });
      const parts = layer.maskParts();
      assert.ok(parts.length > 0 && parts.length <= SPEC.calls, `${parts.length} parts`);

      const { renderer, draws, info } = recordingRenderer();
      const counts = { ...info.render };
      const target = maskTarget();
      const mask = readMaterialMask(
        renderer,
        scene,
        new PerspectiveCamera(),
        { landmarkParts: parts, hulls },
        target as WebGLRenderTarget
      );
      assert.equal(draws.length, 1, 'one extra draw, into the mask’s own target');
      const [drawn] = draws as [Drawn];
      assert.equal(drawn.target, target);
      assert.equal(drawn.background, null, 'no background in the mask');
      assert.deepEqual([mask.width, mask.height, mask.pixels.length], [4, 3, 48]);

      // Each landmark part draws its material's code, with the pools' test.
      for (const part of parts) {
        const code = MASK_CODE[part.material as keyof typeof MASK_CODE];
        assert.ok(code !== undefined, `${part.material} has a code`);
        assert.equal(codeOf(drawn.materials.get(part.mesh) as Material), code, part.material);
      }
      // The own hulls: laminate, and the lamp glass apart; the side follows.
      const hullMask = drawn.materials.get(hull) as Material;
      assert.equal(codeOf(hullMask), MASK_CODE.laminate);
      assert.equal(hullMask.side, DoubleSide, 'faces as the material it stands in for');
      assert.equal(codeOf(drawn.materials.get(hullLamp) as Material), MASK_CODE.hullLamp);
      // Any other opaque surface keeps its depth as code 0; what lies over a
      // pixel is not drawn at all.
      assert.equal(codeOf(drawn.materials.get(ground) as Material), 0);
      assert.equal(drawn.visible.get(water), false, 'the transparent water is hidden');
      assert.equal(drawn.visible.get(motes), false, 'the motes are hidden');

      // And the scene, the renderer and the frame's counts are as they were.
      scene.traverse((child) => {
        if (child instanceof Mesh || child instanceof Points) {
          assert.equal(child.material, before.get(child), child.name || child.type);
        }
        assert.equal(child.visible, true);
      });
      assert.equal((scene.background as Color).getHex(), 0x010203);
      assert.equal(renderer.getRenderTarget(), null);
      assert.equal(renderer.autoClear, false);
      assert.equal(renderer.getClearColor(new Color()).getHex(), 0x123456);
      assert.equal(renderer.getClearAlpha(), 0.5);
      assert.deepEqual(info.render, counts, 'the frame’s counts are untouched');
    } finally {
      resetLandmarkModels();
    }
  });

  it('places §11’s model-space points as the arch stands: at the anchor, the literal’s floor, the anchor’s yaw', async () => {
    const layer = await standArch();
    try {
      const [anchor, pier] = layer.landmarkPoints([
        [0, 0, 0],
        [-235, 100, 76],
      ])!;
      const floor = depthToWorldY(ARCH.originFloorM);
      assert.deepEqual([anchor!.x, anchor!.y, anchor!.z], [ARCH.anchorXM, floor, ARCH.anchorYM]);
      const cos = Math.cos(ARCH.yawRad);
      const sin = Math.sin(ARCH.yawRad);
      assert.ok(Math.abs(pier!.x - (ARCH.anchorXM + -235 * cos + 76 * sin)) < 1e-9);
      assert.ok(Math.abs(pier!.z - (ARCH.anchorYM + 235 * sin + 76 * cos)) < 1e-9);
      assert.equal(pier!.y, floor + 100);
      assert.equal(new EnvironmentLayer('sorrowgate').landmarkPoints([[0, 0, 0]]), null);
    } finally {
      resetLandmarkModels();
    }
  });
});
