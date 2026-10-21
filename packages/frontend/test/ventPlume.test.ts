/**
 * Steam from the vent chimneys (#1514, from #1467's "vent smoke"). The plume
 * is world light (docs/style-neon-noir.md "World light"): these tests read the
 * buffers and the shader patch the render would, and count its work under
 * gate 6 — one draw, and no buffer rewritten by a frame.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Color, PerspectiveCamera, Scene, ShaderLib, type BufferAttribute } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mapProps, propSpec, type PropPlacement } from '../src/game/environment.ts';
import { buildTemplate } from '../src/game/environmentModels.ts';
import { VENT_EMBER } from '../src/game/palette.ts';
import {
  VENT_PLUME_LEVEL,
  VENT_PLUME_PUFFS,
  VentPlume,
  plumeSites,
  type PlumeSite,
} from '../src/game/ventPlume.ts';
import { HeadlessWebGLRenderer } from './support/headless.ts';

const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);

/** The chimney's height at canonical scale, from the committed model. */
async function chimneyHeightM(): Promise<number> {
  const bytes = readFileSync(new URL('env-vent-chimney.glb', MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const scene = (await new GLTFLoader().parseAsync(buffer, '')).scene;
  const spec = propSpec('env-vent-chimney')!;
  return buildTemplate(scene, spec.footprintM, spec.swayM).heightM;
}

/** The one placed ground with a vent field: three chimneys and four basalt boulders. */
const placements = mapProps('sorrowgate');
const chimneys = placements.filter((p) => p.slug === 'env-vent-chimney');
const basalt = placements.filter((p) => p.slug === 'env-vent-basalt');

const site = (x: number, z: number): PlumeSite => ({ x, y: 40, z, scale: 1, xM: x, yM: z });

describe('one plume per standing chimney', () => {
  it('stands a column on every chimney and none on basalt', async () => {
    assert.ok(chimneys.length > 0 && basalt.length > 0, 'the fixture has both vent props');
    const heightM = await chimneyHeightM();
    const ground = (p: PropPlacement) => -800 + p.xM / 1000;
    const sites = plumeSites(placements, (p) => ground(p) + heightM * p.scale);
    assert.equal(sites.length, chimneys.length);
    for (const chimney of chimneys) {
      const at = sites.find((s) => s.xM === chimney.xM && s.yM === chimney.yM);
      assert.ok(at !== undefined, 'every chimney breathes');
      // At its mouth, not its foot: the stack's own height at its own scale.
      assert.equal(at.y, ground(chimney) + heightM * chimney.scale);
      assert.equal(at.scale, chimney.scale);
    }
    for (const stone of basalt) {
      assert.ok(!sites.some((s) => s.xM === stone.xM && s.yM === stone.yM), 'basalt has no mouth');
    }
  });

  it('breathes nothing from a chimney whose model stands nothing', () => {
    assert.deepEqual(
      plumeSites(placements, () => null),
      []
    );
  });

  it('marks only the chimney in the registry', () => {
    assert.equal(propSpec('env-vent-chimney')!.plume, true);
    assert.equal(propSpec('env-vent-basalt')!.plume, undefined);
  });

  // The prop layer's own delivery of it, with real template loads, is in
  // tutorialLoading.test.mjs "vent steam": that file holds the load seam.
});

describe('the column', () => {
  it('stands its puffs on fixed vertical lines about the mouth', () => {
    const plume = new VentPlume();
    plume.build([site(1000, 2000), site(5000, 3000)]);
    const position = plume.points.geometry.getAttribute('position') as BufferAttribute;
    assert.equal(position.count, 2 * VENT_PLUME_PUFFS);
    for (let i = 0; i < position.count; i++) {
      const mouth = i < VENT_PLUME_PUFFS ? site(1000, 2000) : site(5000, 3000);
      assert.equal(position.getY(i), mouth.y, 'every puff leaves from the mouth');
      assert.ok(Math.hypot(position.getX(i) - mouth.x, position.getZ(i) - mouth.z) <= 3.0001);
    }
  });

  it('moves a puff up its line and nowhere else (map-visuals §8)', () => {
    const patched = patch(new VentPlume());
    assert.match(patched.vertexShader, /transformed\.y \+= plumeT \* aPlume\.y;/);
    assert.doesNotMatch(patched.vertexShader, /transformed\.[xz]/, 'no lateral term');
    // Every hook landed: a replace that misses is silent.
    for (const hook of ['attribute vec2 aPlume', 'exp( -plumeSwim', 'vColor.rgb *=']) {
      assert.ok(patched.vertexShader.includes(hook), hook);
    }
    assert.ok(patched.fragmentShader.includes('discard'), 'a soft disc, not a square');
  });

  it('is lit in the vent family, each puff under the ember peak (rule 2)', () => {
    const plume = new VentPlume();
    plume.build([site(0, 0)]);
    const color = plume.points.geometry.getAttribute('color') as BufferAttribute;
    const ember = new Color(VENT_EMBER);
    assert.ok(VENT_PLUME_LEVEL < 0.55, 'dimmer than the ember at its peak');
    assert.ok(Math.abs(color.getX(0) / color.getZ(0) - ember.r / ember.b) < 1e-5, 'ember hue');
    assert.ok(Math.abs(color.getX(0) - ember.r * VENT_PLUME_LEVEL) < 1e-6);
  });

  it('goes as cold as its ground under the veil', () => {
    const plume = new VentPlume();
    plume.build([site(0, 0)]);
    const color = plume.points.geometry.getAttribute('color') as BufferAttribute;
    const full = color.getX(0);
    plume.setShade((_x, _y, out) => out.setRGB(0.25, 0.25, 0.25));
    assert.ok(Math.abs(color.getX(0) - full * 0.25) < 1e-6);
    plume.setShade(null);
    assert.ok(Math.abs(color.getX(0) - full) < 1e-6);
  });
});

describe('the clock', () => {
  it('steps on the 200 ms sonar bucket (rule 3)', () => {
    const plume = new VentPlume();
    plume.tick(1000);
    assert.equal(plume.clockS, 1);
    plume.tick(1199);
    assert.equal(plume.clockS, 1, 'held within a bucket');
    plume.tick(1200);
    assert.ok(Math.abs(plume.clockS - 1.2) < 1e-9, 'steps at its edge');
  });

  it('holds still under reduced motion', () => {
    const plume = new VentPlume();
    plume.setReducedMotion(true);
    plume.tick(1000);
    const held = plume.clockS;
    plume.tick(987_654);
    assert.equal(plume.clockS, held);
  });
});

describe('counted work (gate 6)', () => {
  it('draws every column in one call, and a frame rewrites no buffer', () => {
    const gl = new HeadlessWebGLRenderer();
    const camera = new PerspectiveCamera();
    for (const n of [1, 40]) {
      const plume = new VentPlume();
      plume.build(Array.from({ length: n }, (_, i) => site(i * 500, 0)));
      const scene = new Scene().add(plume.points);
      const geometry = plume.points.geometry;
      const versions = () =>
        Object.values(geometry.attributes).map((a) => (a as BufferAttribute).version);
      const before = versions();
      for (let frame = 0; frame < 120; frame++) {
        plume.tick(frame * 16.7, 3000);
        gl.render(scene, camera);
        assert.equal(gl.ledger.calls, 1, `${n} chimneys, frame ${frame}`);
      }
      assert.deepEqual(versions(), before, 'nothing uploaded by a frame');
      assert.equal(geometry.attributes.position!.count, n * VENT_PLUME_PUFFS);
    }
  });
});

/** Run the material's patch on three's own points program, as compile would. */
function patch(plume: VentPlume): { vertexShader: string; fragmentShader: string } {
  const shader = {
    uniforms: {},
    vertexShader: ShaderLib.points.vertexShader,
    fragmentShader: ShaderLib.points.fragmentShader,
  };
  const material = plume.points.material as { onBeforeCompile: (s: never, r: never) => void };
  material.onBeforeCompile(shader as never, null as never);
  return shader;
}
