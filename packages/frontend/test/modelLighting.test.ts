import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  FloatType,
  LinearSRGBColorSpace,
  Mesh,
  Line,
  Points,
  MeshStandardMaterial,
  SRGBColorSpace,
  ShaderLib,
  ShaderMaterial,
} from 'three';
import { DEPTH, MODEL_LIGHTING } from '@echoes/shared';
import { createHost, HeadlessWebGLRenderer, pumpAnimationFrames } from './support/headless.ts';
import { cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import {
  GLOW_AFTER_TONE_MAPPING,
  INSTANCE_GLOW_VERTEX,
  installInstanceGlow,
  keepGlowOutsideToneMapping,
  keepsGlowOutsideToneMapping,
  readsInstanceGlow,
  waterEnvironmentSource,
} from '../src/game/modelLighting.ts';
import { waterColorAt } from '../src/game/water.ts';
import type { WorldLook } from '../src/game/tutorialLook.ts';

describe('shared model lighting: art-direction and gates 3/6/8', () => {
  it('builds a bounded linear, faction-neutral environment with overhead brighter than below', () => {
    const texture = waterEnvironmentSource();
    assert.equal(texture.image.width, 128);
    assert.equal(texture.image.height, 64);
    assert.equal(texture.type, FloatType);
    assert.equal(texture.colorSpace, LinearSRGBColorSpace);
    assert.equal(texture.mapping, EquirectangularReflectionMapping);
    const pixels = texture.image.data;
    const top = new Color(MODEL_LIGHTING.AMBIENT_COLOR);
    const low = waterColorAt(DEPTH.MAX_M);
    for (let y = 0; y < 64; y++) {
      const row = y * 128 * 4;
      for (let x = 0; x < 128; x++) {
        const i = row + x * 4;
        for (let c = 0; c < 3; c++) {
          assert.equal(pixels[i + c], pixels[row + c], 'no directional or faction marks');
          assert.ok(pixels[i + c]! >= 0 && pixels[i + c]! <= 1);
          if (y > 0) assert.ok(pixels[i + c]! >= pixels[i + c - 128 * 4]!);
        }
        assert.equal(pixels[i + 3], 1);
      }
    }
    for (const [channel, bottom, upper] of [
      [0, low.r, top.r],
      [1, low.g, top.g],
      [2, low.b, top.b],
    ]) {
      assert.ok(Math.abs(pixels[channel!]! - bottom!) < 1e-6);
      assert.ok(Math.abs(pixels[63 * 128 * 4 + channel!]! - upper!) < 1e-6);
    }
    texture.dispose();
  });

  for (const look of ['standard', 'sorrowgate'] satisfies WorldLook[]) {
    it(`${look}: shares the tutorial rig, owns one environment, preserves unlit ink and camera`, () => {
      const gl = new HeadlessWebGLRenderer();
      const view = new PerspectiveView(look);
      const host = createHost(1280, 720) as unknown as HTMLElement;
      assert.equal(
        view.mount(host, () => gl.asRenderer(), gl.environment),
        true
      );
      assert.equal(
        view.mount(host, () => gl.asRenderer(), gl.environment),
        true
      );
      assert.equal(gl.environmentBuilds, 1, 'repeat mount must not bake twice');
      assert.equal(gl.toneMapping, ACESFilmicToneMapping);
      assert.equal(gl.toneMappingExposure, 1);
      assert.equal(gl.outputColorSpace, SRGBColorSpace);
      view.setTerrain(cannedTerrain());
      view.applySnapshot(cannedSnapshot());
      view.setActive(true);
      pumpAnimationFrames();
      const scene = gl.lastScene!;
      assert.ok(scene.environment);
      assert.notEqual(scene.background, scene.environment, 'keep the authored water backdrop');
      assert.equal(scene.environmentIntensity, 0.35);
      const lights = scene.children.filter(
        (node) => node instanceof AmbientLight || node instanceof DirectionalLight
      );
      assert.deepEqual(
        lights.map((light) => light.intensity),
        [0.75, 1.8, 1.6]
      );
      let unlit = 0;
      let shaders = 0;
      scene.traverse((node) => {
        if (!(node instanceof Mesh || node instanceof Line || node instanceof Points)) return;
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
          if (material instanceof MeshStandardMaterial) continue;
          // A shader layer is held by its flag too, not by its source: a true
          // flag hands it three's `toneMapping()`, which it could call without
          // the chunk, and a false one leaves nothing to call (#1026).
          if (material instanceof ShaderMaterial) shaders++;
          else unlit++;
          assert.equal(
            material.toneMapped,
            false,
            `${material.type} must keep its authored register`
          );
        }
      });
      assert.ok(unlit > 5, 'positive control: ground, marks, sprites and ordnance are present');
      assert.ok(shaders >= 4, 'positive control: backdrop, snow and both stipple clouds present');
      const calls = gl.info.render.calls;
      const triangles = gl.info.render.triangles;
      pumpAnimationFrames(20);
      assert.equal(gl.environmentBuilds, 1, 'no PMREM bake in the frame loop');
      assert.equal(gl.info.render.calls, calls);
      assert.equal(gl.info.render.triangles, triangles);
      view.destroy();
      assert.equal(scene.environment, null);
      assert.equal(gl.environmentDisposed, true);
      assert.equal(gl.disposed, true);
    });
  }

  it('reports environment failure and releases the renderer instead of showing a partial world', () => {
    const gl = new HeadlessWebGLRenderer();
    const view = new PerspectiveView();
    const log = mock.method(console, 'error', () => {});
    try {
      assert.equal(
        view.mount(
          createHost(100, 100) as unknown as HTMLElement,
          () => gl.asRenderer(),
          () => {
            throw new Error('PMREM unavailable');
          }
        ),
        false
      );
      assert.equal(gl.disposed, true);
      assert.equal(log.mock.callCount(), 1);
      assert.match(String(log.mock.calls[0]!.arguments[0]), /environment lighting/);
    } finally {
      log.mock.restore();
      view.destroy();
    }
  });
});

describe('glow stays outside tone mapping: gates 3 and 4', () => {
  const shaderWith = () => ({
    uniforms: {},
    vertexShader: '',
    fragmentShader: 'void main() {\n#include <opaque_fragment>\n#include <tonemapping_fragment>\n}',
  });

  it('tone-maps surface light and adds the emission back unmapped', () => {
    const material = new MeshStandardMaterial({ emissive: 0xffb000 });
    const keyBefore = material.customProgramCacheKey();
    keepGlowOutsideToneMapping(material);
    const shader = shaderWith();
    material.onBeforeCompile(shader as never, null as never);
    assert.ok(!shader.fragmentShader.includes('#include <tonemapping_fragment>'));
    assert.ok(shader.fragmentShader.includes(GLOW_AFTER_TONE_MAPPING));
    assert.match(
      GLOW_AFTER_TONE_MAPPING,
      /toneMapping\( max\( gl_FragColor\.rgb - totalEmissiveRadiance, 0\.0 \) \) \+ totalEmissiveRadiance/
    );
    assert.ok(GLOW_AFTER_TONE_MAPPING.startsWith('#if defined( TONE_MAPPING )'));
    // Gate 3's lamp core, the pixel half: past white the sum is scaled along
    // its hue, after the emission is added and before the chunk ends.
    const added = GLOW_AFTER_TONE_MAPPING.indexOf('+ totalEmissiveRadiance;');
    const scaled = GLOW_AFTER_TONE_MAPPING.indexOf(
      'gl_FragColor.rgb /= max( 1.0, max( gl_FragColor.r, max( gl_FragColor.g, gl_FragColor.b ) ) );'
    );
    assert.ok(added >= 0 && scaled > added, 'scaled along its hue once the emission is in');
    assert.ok(scaled < GLOW_AFTER_TONE_MAPPING.indexOf('#endif'));
    assert.notEqual(material.customProgramCacheKey(), keyBefore, 'a distinct program');
  });

  it('chains onto an earlier patch instead of replacing it', () => {
    const material = new MeshStandardMaterial({ emissive: 0xc2465e });
    const earlier = mock.fn();
    material.onBeforeCompile = earlier;
    keepGlowOutsideToneMapping(material);
    const shader = shaderWith();
    material.onBeforeCompile(shader as never, null as never);
    assert.equal(earlier.mock.callCount(), 1);
    assert.ok(shader.fragmentShader.includes(GLOW_AFTER_TONE_MAPPING));
  });

  it('can say whether a lamp carries the patch, which the lamp reading reports', () => {
    const material = new MeshStandardMaterial({ emissive: 0xffb000 });
    assert.equal(keepsGlowOutsideToneMapping(material), false, 'before the patch');
    keepGlowOutsideToneMapping(material);
    assert.equal(keepsGlowOutsideToneMapping(material), true, 'after it');
    // clone() drops the hooks, so a lamp cloned after patching lost its patch.
    assert.equal(keepsGlowOutsideToneMapping(material.clone()), false, 'a clone of it');
  });

  it("three's standard shader still offers the chunk, after the emission is declared", () => {
    const fragment = ShaderLib.standard.fragmentShader;
    const declared = fragment.indexOf('vec3 totalEmissiveRadiance');
    const mapped = fragment.indexOf('#include <tonemapping_fragment>');
    assert.ok(declared >= 0 && mapped > declared, 'a renamed chunk would make the patch a no-op');
  });
});

describe("each instance's own glow on a shared lamp: gate 3 (#1079)", () => {
  // Three's own standard shader, so a renamed chunk fails here rather than
  // silently leaving every instanced lamp at its resting strength.
  const standard = () => ({
    uniforms: {},
    vertexShader: ShaderLib.standard.vertexShader,
    fragmentShader: ShaderLib.standard.fragmentShader,
  });

  it('scales the emission by the instance factor before the curve keeps off it', () => {
    const material = new MeshStandardMaterial({ emissive: 0xffb000 });
    const earlier = mock.fn();
    material.onBeforeCompile = earlier;
    const keyBefore = material.customProgramCacheKey();
    installInstanceGlow(material);
    keepGlowOutsideToneMapping(material);
    const shader = standard();
    material.onBeforeCompile(shader as never, null as never);
    assert.equal(earlier.mock.callCount(), 1, 'chained onto the earlier patch');
    const { vertexShader: vertex, fragmentShader: fragment } = shader;
    assert.ok(vertex.includes(INSTANCE_GLOW_VERTEX), 'the vertex stage hands the factor on');
    assert.match(vertex, /#ifdef USE_INSTANCING\nattribute float instanceGlow;\n#endif/);
    assert.ok(vertex.indexOf('varying float vInstanceGlow') < vertex.indexOf(INSTANCE_GLOW_VERTEX));
    // Not instanced, a lamp draws at the strength its material holds.
    assert.match(INSTANCE_GLOW_VERTEX, /#else\n\tvInstanceGlow = 1\.0;/);
    const declared = fragment.indexOf('varying float vInstanceGlow');
    const mapped = fragment.indexOf('#include <emissivemap_fragment>');
    const scaled = fragment.indexOf('totalEmissiveRadiance *= vInstanceGlow;');
    const summed = fragment.indexOf('vec3 outgoingLight = totalDiffuse');
    const curve = fragment.indexOf(GLOW_AFTER_TONE_MAPPING);
    assert.ok(declared >= 0 && mapped > declared, 'declared before main');
    assert.ok(scaled > mapped, 'after the emissive map');
    assert.ok(summed > scaled, 'before the emission joins the light');
    assert.ok(curve > summed, 'and so before the curve adds it back');
    assert.ok(readsInstanceGlow(material) && keepsGlowOutsideToneMapping(material));
    assert.notEqual(material.customProgramCacheKey(), keyBefore, 'a distinct program');
  });

  it('can say whether a lamp carries the patch, which a solo batch must keep', () => {
    const material = new MeshStandardMaterial({ emissive: 0xffb000 });
    assert.equal(readsInstanceGlow(material), false, 'before the patch');
    installInstanceGlow(material);
    assert.equal(readsInstanceGlow(material), true, 'after it');
    assert.equal(readsInstanceGlow(material.clone()), false, 'a clone of it');
  });
});
