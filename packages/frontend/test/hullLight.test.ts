/**
 * A model's cladding in the world pass at the High graphics quality
 * (docs/art-direction.md, "What is built at High" and "The plate under a
 * mark"; #1814). What those sections promise: at High the world pass draws
 * an own model's cladding and the canvas its lamps, each once; the cladding
 * takes the Lid's glow and the pools beside the rig's light, and its ink is
 * what the recolour wrote (gate 4); a lamp is what it was (gate 3); Low's
 * template names nothing for that pass; the plate pass cuts the models from
 * its mask; and a contact's model stays whole on the canvas. What the light
 * looks like is the frames in docs/screenshots/issue-1814.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BoxGeometry,
  CustomBlending,
  DataUtils,
  Group,
  Layers,
  Material,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  ShaderLib,
  ShaderMaterial,
  SrcColorFactor,
  Texture,
  ZeroFactor,
  type DepthTexture,
  type Object3D,
  type WebGLRenderer,
} from 'three';
import { Faction, HIGH_GRAPHICS, UnitKind } from '@echoes/shared';
import type { TerrainPayload } from '../src/net/GameClient.ts';
import { MODEL_LAYER, WORLD_LAYER } from '../src/game/highFrame.ts';
import {
  HULL_LIGHT_ANCHORS,
  hullPools,
  installHullLight,
  patchHullLight,
  setHullPools,
  takesHullLight,
} from '../src/game/hullLight.ts';
import {
  MarkPlates,
  PLATE_HOLD_GLSL,
  PLATE_LEVEL,
  PLATE_MEDIUM_GLSL,
  PLATE_SCENE_LEVEL,
  PlatePass,
  plateSceneLevelAt,
  shownLevel,
} from '../src/game/markPlates.ts';
import { ACTIVE_PALETTE } from '../src/game/palette.ts';
import { RosterBatches } from '../src/game/rosterBatches.ts';
import { buildTemplate, instantiate, type Template } from '../src/game/rosterModels.ts';
import { waterLightAt } from '../src/game/waterMedium.ts';
import { poolTexture, worldLightsOf } from '../src/game/worldLights.ts';
import { HeadlessWebGLRenderer } from './support/headless.ts';
import { highDisplayLinear } from './support/highDisplay.ts';

/** A hull of two clad materials, a lamp, and a blended haze. */
function hull(): Group {
  const root = new Group();
  const part = (name: string, material: MeshStandardMaterial) => {
    material.name = name;
    root.add(new Mesh(new BoxGeometry(20, 4, 6), material));
  };
  part('chitin_hull', new MeshStandardMaterial({ color: 0x0b241e }));
  part('grown_steel', new MeshStandardMaterial({ color: 0x6a7a74, metalness: 0.4 }));
  part('bio_light', new MeshStandardMaterial({ color: 0x0b241e, emissive: 0x7dff6a }));
  part('spore_haze', new MeshStandardMaterial({ color: 0x1fa67a, transparent: true }));
  return root;
}

const KEY = { unit: UnitKind.Corvette, faction: Faction.Pelagia };
const template = (high: boolean): Template =>
  buildTemplate(hull(), KEY, 'standard', ACTIVE_PALETTE, high);

const materialsOf = (root: Object3D): MeshStandardMaterial[] => {
  const out: MeshStandardMaterial[] = [];
  root.traverse((o) => {
    if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) out.push(o.material);
  });
  return out;
};

const named = (built: Template, name: string): MeshStandardMaterial => {
  const material = materialsOf(built.root).find((m) => m.name === name);
  assert.ok(material, name);
  return material;
};

/** What one pass of a frame draws of `batches`, through a camera on `layers`. */
function drawn(batches: RosterBatches, ...layers: number[]): Mesh[] {
  const renderer = new HeadlessWebGLRenderer();
  const scene = new Scene();
  scene.add(batches.group);
  const camera = new PerspectiveCamera();
  camera.layers.disableAll();
  for (const layer of layers) camera.layers.enable(layer);
  renderer.render(scene, camera);
  scene.remove(batches.group);
  return renderer.frameDraws[0] as Mesh[];
}

describe('a model’s cladding in the world pass (#1814)', () => {
  it('names the opaque cladding for the world pass at High, and nothing at Low', () => {
    const low = template(false);
    const high = template(true);
    assert.equal(low.world.size, 0, 'Low’s template is the canvas’s whole');
    assert.deepEqual(
      [...high.world].map((m) => m.name).sort(),
      ['chitin_hull', 'grown_steel'],
      'a lamp and a blended haze stay on the canvas'
    );
    for (const name of ['chitin_hull', 'grown_steel', 'bio_light', 'spore_haze']) {
      const lit = named(high, name);
      const was = named(low, name);
      assert.equal(takesHullLight(lit), high.world.has(lit), name);
      assert.equal(takesHullLight(was), false, `${name} at Low`);
      // Gate 4: the ink and its register are the recolour's. Gate 3: so is
      // every lamp's light.
      assert.deepEqual(lit.color, was.color, `${name} changed its ink`);
      assert.deepEqual(lit.emissive, was.emissive);
      assert.equal(lit.emissiveIntensity, was.emissiveIntensity);
    }
    // Cladding carries no hook at Low; a lamp carries the same ones either way.
    assert.equal(named(low, 'grown_steel').onBeforeCompile, Material.prototype.onBeforeCompile);
    assert.equal(
      named(high, 'bio_light').customProgramCacheKey(),
      named(low, 'bio_light').customProgramCacheKey()
    );
  });

  it('draws the cladding in the world pass and the lamps on the canvas, each once', () => {
    const batches = new RosterBatches();
    batches.attach(instantiate(template(true)));
    const world = drawn(batches, WORLD_LAYER);
    const tactical = drawn(batches, 0);
    const names = (meshes: Mesh[]) => meshes.map((m) => (m.material as Material).name).sort();
    assert.deepEqual(names(world), ['chitin_hull', 'grown_steel']);
    assert.deepEqual(names(tactical), ['bio_light', 'spore_haze']);
    // The plate pass draws the same cladding alone, to cut it from its mask.
    assert.deepEqual(names(drawn(batches, MODEL_LAYER)), names(world));
    for (const mesh of world) assert.ok(!tactical.includes(mesh), 'drawn once');
    // A view that leaves High keeps a model's template until Low's is built,
    // and a frame with no world pass draws it whole on the canvas meanwhile.
    batches.setWorldPass(false);
    assert.equal(drawn(batches, 0).length, 4);
    assert.equal(drawn(batches, WORLD_LAYER).length, 0);
    batches.setWorldPass(true);
    assert.deepEqual(names(drawn(batches, WORLD_LAYER)), names(world));
    batches.dispose();

    // Low's template, and so a contact's at High: the canvas draws it whole.
    // That a track asks for this template is `highVariant`'s `own`
    // (test/navySurface.test.ts); no model decodes on the smoke runner, so
    // the view's own call is not exercised there.
    const low = new RosterBatches();
    low.attach(instantiate(template(false)));
    assert.equal(drawn(low, WORLD_LAYER).length, 0);
    assert.equal(drawn(low, MODEL_LAYER).length, 0);
    assert.equal(drawn(low, 0).length, 4);
    low.dispose();
  });

  it('refuses a lamp, and chains onto the hook a material already carries', () => {
    const lamp = new MeshStandardMaterial({ emissive: 0x7dff6a });
    assert.equal(installHullLight(lamp), false);
    assert.equal(lamp.onBeforeCompile, Material.prototype.onBeforeCompile);

    const skin = new MeshStandardMaterial();
    let earlier = 0;
    skin.onBeforeCompile = () => {
      earlier++;
    };
    skin.customProgramCacheKey = () => 'earlier';
    assert.equal(installHullLight(skin), true);
    assert.equal(skin.customProgramCacheKey(), 'earlier:hull-light-1');
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
    };
    skin.onBeforeCompile(shader as never, null as never);
    assert.equal(earlier, 1, 'the earlier hook did not run');
    // The pools are a view's and a template is the page's: one pair of
    // uniforms, which the view about to draw writes.
    const pools = new Texture();
    setHullPools(pools, 4000, 3000);
    assert.equal(shader.uniforms.uHullPools!.value, pools);
    assert.equal(hullPools(), pools);
    assert.deepEqual((shader.uniforms.uHullPoolMap!.value as { x: number; y: number }).x, 4000);
    setHullPools(null);
    assert.notEqual(shader.uniforms.uHullPools!.value, pools, 'no ground, no pool');
  });

  it("finds every anchor it patches in three's own standard program", () => {
    const shader = {
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
    };
    for (const anchor of HULL_LIGHT_ANCHORS.vertex)
      assert.ok(shader.vertexShader.includes(anchor), `vertex: ${anchor}`);
    for (const anchor of HULL_LIGHT_ANCHORS.fragment)
      assert.ok(shader.fragmentShader.includes(anchor), `fragment: ${anchor}`);
    patchHullLight(shader);
    // Added to the rig's indirect light, and to what a face mirrors.
    assert.match(shader.fragmentShader, /irradiance \+= echoesHullLight\(/);
    assert.match(shader.fragmentShader, /radiance \+= echoesHullLight\(/);
    // The Lid's glow is the ground's own function of it, and the pools are
    // taken by the height over the ground the texture holds beside them.
    assert.match(shader.fragmentShader, /echoesLitIrradiance\( facing, at\.y \)/);
    assert.match(shader.fragmentShader, /at\.y - pool\.a/);
    // An instanced hull is lit where its own instance stands.
    assert.match(shader.vertexShader, /hullAt = instanceMatrix \* hullAt;/);
    // Colour is never written: hue stays the ink's.
    assert.doesNotMatch(shader.fragmentShader, /diffuseColor[^;]*[hH]ull/);
  });

  it('bakes the ground’s height beside its pools, for a hull to hang over', () => {
    const terrain = { cols: 2, rows: 2, cellM: 250 } as TerrainPayload;
    const groundY = (xM: number, yM: number) => -100 - xM / 10 - yM / 100;
    const lights = worldLightsOf([{ family: 'vent', xM: 250, yM: 250 }], groundY);
    const texture = poolTexture(terrain, lights, groundY);
    const data = texture.image.data as Uint16Array;
    const width = texture.image.width;
    const mPerPx = 500 / width;
    for (const [px, py] of [
      [0, 0],
      [width - 1, 3],
      [5, width - 1],
    ] as const) {
      const want = groundY((px + 0.5) * mPerPx, (py + 0.5) * mPerPx);
      const held = DataUtils.fromHalfFloat(data[(py * width + px) * 4 + 3]!);
      // Half a float holds eleven bits: a few centimetres at this depth.
      assert.ok(Math.abs(held - want) < 0.1, `${px},${py}: ${held} for ${want}`);
    }
    // The ground never reads it, and without a ground to read it stays 1.
    const flat = poolTexture(terrain, lights).image.data as Uint16Array;
    assert.equal(DataUtils.fromHalfFloat(flat[3]!), 1);
    assert.ok(HIGH_GRAPHICS.HULL_LIGHT.POOL_REACH_M > 0);
  });

  it('cuts the models from the plates’ mask, and nothing else', () => {
    const batches = new RosterBatches();
    batches.attach(instantiate(template(true)));
    const scene = new Scene();
    const ground = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    ground.layers.set(WORLD_LAYER);
    scene.add(batches.group, ground);
    const marks = new MarkPlates();
    marks.begin('force');
    marks.disc(0, 0, 0, 40);

    const pass = new PlatePass();
    pass.setPlates(marks.pack());
    const renderer = new HeadlessWebGLRenderer();
    // One frame, as the view counts it (PerspectiveView `mount`).
    renderer.info.autoReset = false;
    const camera = new PerspectiveCamera();
    const mask = camera.layers.mask;
    const overrides: (Material | null)[] = [];
    const render = renderer.render.bind(renderer);
    renderer.render = (s, c) => {
      overrides.push(s.overrideMaterial);
      render(s, c);
    };
    pass.render(renderer as unknown as WebGLRenderer, camera, null, {} as DepthTexture, 64, 64, {
      scene,
      layer: MODEL_LAYER,
    });
    const [plates, cut] = renderer.frameDraws as [Object3D[], Object3D[]];
    assert.equal(renderer.frameTargets[0], renderer.frameTargets[1], 'into the one mask');
    assert.equal(plates.length, 1, 'the marks’ plates, as one instanced draw');
    assert.deepEqual(
      cut.map((o) => ((o as Mesh).material as Material).name).sort(),
      ['chitin_hull', 'grown_steel'],
      'then the cladding alone: no ground, no lamp'
    );
    // In a material that takes the mask's green away where the model is what
    // the world pass showed, keeps its red, and writes nothing where the
    // world stands in front.
    const material = overrides[1] as ShaderMaterial;
    assert.ok(material instanceof ShaderMaterial);
    assert.equal(overrides[0], null);
    assert.deepEqual(
      [material.blending, material.blendSrc, material.blendDst],
      [CustomBlending, ZeroFactor, SrcColorFactor],
      'the mask times what the draw writes'
    );
    assert.match(material.fragmentShader, /gl_FragCoord\.z > world[^;]*\) discard;/);
    assert.match(material.fragmentShader, /gl_FragColor = vec4\( 1\.0, 0\.0, 1\.0, 1\.0 \);/);
    assert.equal(scene.overrideMaterial, null, 'the scene is handed back as it came');
    // The caller restores the camera (highFrame.ts); it was left on the models.
    const models = new Layers();
    models.set(MODEL_LAYER);
    assert.equal(camera.layers.mask, models.mask);
    camera.layers.mask = mask;
    pass.dispose();
    batches.dispose();
  });

  it('holds the water in front of a model under a plate, and never the model', () => {
    // The plate's level before the grade and the curve is the level after
    // them, walked back: held to what the GPU runs (support/highDisplay.ts).
    assert.ok(Math.abs(shownLevel(PLATE_SCENE_LEVEL) - PLATE_LEVEL) < 1e-9);
    const sRGB = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
    const [r, g, b] = highDisplayLinear(Array(3).fill(PLATE_SCENE_LEVEL)).map(sRGB);
    assert.ok(Math.abs(0.2126 * r! + 0.7152 * g! + 0.0722 * b! - PLATE_LEVEL) < 1e-5);
    assert.ok(PLATE_SCENE_LEVEL > 0 && PLATE_SCENE_LEVEL < PLATE_LEVEL);
    // The hold after the curve reads the plates less the models, so a
    // model's pixel is not scaled; the water's light is held before the
    // curve where the two differ, and `light` is not in that line.
    assert.ok(PLATE_HOLD_GLSL.includes('texture2D( tPlates, vUv ).g'));
    assert.ok(PLATE_MEDIUM_GLSL.includes('max( 0.0, plates.r - plates.g )'));
    assert.ok(
      PLATE_MEDIUM_GLSL.includes(
        `float held = max( ${PLATE_SCENE_LEVEL.toFixed(6)}, swim.x * echoesWaterLight( swim.y ) );`
      )
    );
    assert.ok(PLATE_MEDIUM_GLSL.includes('min( 1.0, held / max( swum, 1e-6 ) )'));
    assert.doesNotMatch(PLATE_MEDIUM_GLSL, /\blight\b/);
    const hold = (medium: number, over: number, level = PLATE_SCENE_LEVEL) =>
      medium * (1 + (Math.min(1, level / Math.max(medium, 1e-6)) - 1) * over);
    assert.equal(hold(0.5, 0), 0.5, 'no plate under a model, nothing held');
    assert.ok(Math.abs(hold(0.5, 1) - PLATE_SCENE_LEVEL) < 1e-12, 'a glow is held to the level');
    assert.equal(hold(PLATE_SCENE_LEVEL / 2, 1), PLATE_SCENE_LEVEL / 2, 'a ceiling, never a paint');
    // The depth ramp's own light is never taken (art-direction.md, "A model
    // in the world's light"): where a far model stands in shallow water, the
    // water's share of the pixel can carry more than the plate's level, and
    // the level there is the ramp's (#1816).
    assert.equal(plateSceneLevelAt(0, 0), PLATE_SCENE_LEVEL);
    assert.equal(plateSceneLevelAt(0.5, 3000), PLATE_SCENE_LEVEL);
    assert.ok(waterLightAt(0) > PLATE_SCENE_LEVEL, 'the surface’s own light is over the level');
    assert.equal(plateSceneLevelAt(1, 0), waterLightAt(0));
    const ramp = waterLightAt(0);
    assert.equal(hold(ramp, 1, plateSceneLevelAt(1, 0)), ramp, 'the ramp alone is not held');
    assert.ok(
      Math.abs(hold(ramp + 0.5, 1, plateSceneLevelAt(1, 0)) - ramp) < 1e-12,
      'and a glow over it is held to the ramp'
    );
  });
});
