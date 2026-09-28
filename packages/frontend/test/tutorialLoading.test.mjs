import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it, mock } from 'node:test';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createServer } from 'vite';
import { Biome, Faction, UnitKind } from '@echoes/shared';

// The Node asset shim intentionally has no URLs. Vite expands the real manifest;
// only network/decode completion is controlled, not the cache or its consumers.
let vite;
let env;
let roster;
let palette;
let EnvironmentLayer;
let placeProps;
let surfaceTexture;
let pending;

async function until(predicate) {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await delay(10);
  }
  assert.fail('asset completion did not reach its consumer');
}

function source() {
  const scene = new Group();
  scene.add(new Mesh(new BoxGeometry(4, 2, 3), new MeshStandardMaterial({ color: 0x667766 })));
  scene.add(
    new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshStandardMaterial({
        color: 0x223322,
        emissive: 0x22bb66,
        emissiveIntensity: 0.4,
      })
    )
  );
  return { scene };
}

function terrain() {
  return {
    cols: 8,
    rows: 8,
    cellM: 250,
    floor: Array(64).fill(700),
    ceiling: Array(64).fill(0),
    biomes: Array(64).fill(Biome.KelpForest),
  };
}

function cladding(instance) {
  let result;
  instance.root.traverse((child) => {
    if (child instanceof Mesh && child.material.emissive.getHex() === 0) result = child;
  });
  assert.ok(result);
  return result;
}

before(async () => {
  vite = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  env = await vite.ssrLoadModule('/src/game/environmentModels.ts');
  roster = await vite.ssrLoadModule('/src/game/rosterModels.ts');
  palette = await vite.ssrLoadModule('/src/game/palette.ts');
  ({ EnvironmentLayer } = await vite.ssrLoadModule('/src/game/environmentLayer.ts'));
  ({ placeProps } = await vite.ssrLoadModule('/src/game/environment.ts'));
  ({ surfaceTexture } = await vite.ssrLoadModule('/src/game/tutorialLook.ts'));
});

after(async () => {
  await vite?.close();
});
afterEach(() => {
  mock.restoreAll();
  env.resetEnvironmentModels();
  roster.resetRosterModels();
  palette.setActivePalette('standard');
});

function controlLoads() {
  pending = [];
  mock.method(
    GLTFLoader.prototype,
    'loadAsync',
    (url) =>
      new Promise((resolve, reject) => {
        pending.push({ url, resolve, reject });
      })
  );
}

describe('pending prop delivery', () => {
  it('notifies every waiting caller once and separates both look templates', async () => {
    controlLoads();
    const ready = [0, 0, 0];
    const a = () => ready[0]++;
    const b = () => ready[1]++;
    assert.equal(env.envTemplate('env-kelp-cluster', 30, 2, a, 'sorrowgate'), null);
    env.envTemplate('env-kelp-cluster', 30, 2, b, 'sorrowgate');
    env.envTemplate('env-kelp-cluster', 30, 2, b, 'sorrowgate');
    env.envTemplate('env-kelp-cluster', 30, 2, () => ready[2]++, 'standard');
    await until(() => pending.length === 2);
    pending.forEach((p) => p.resolve(source()));
    await until(() => ready.every((n) => n === 1));
    const tutorial = env.envTemplate('env-kelp-cluster', 30, 2, a, 'sorrowgate');
    const standard = env.envTemplate('env-kelp-cluster', 30, 2, a);
    assert.notEqual(tutorial, standard);
    assert.match(tutorial.parts[0].material.customProgramCacheKey(), /sorrowgate/);
    assert.doesNotMatch(standard.parts[0].material.customProgramCacheKey(), /sorrowgate/);
    assert.deepEqual(ready, [1, 1, 1], 'warm reads must not notify again');
  });

  it('delivers into the latest terrain rebuild, holds sway and never resurrects a destroyed layer', async () => {
    controlLoads();
    const old = terrain();
    const changed = terrain();
    changed.ceiling[27] = 3000;
    const live = new EnvironmentLayer('sorrowgate');
    const dead = new EnvironmentLayer('sorrowgate');
    live.rebuild(old, () => -100);
    live.rebuild(changed, () => -200);
    dead.rebuild(old, () => -100);
    dead.destroy();
    await until(() => pending.length > 0);
    pending.forEach((p) => p.resolve(source()));
    const expected = placeProps(changed);
    assert.ok(expected.length > 0);
    await until(() => live.stats().props === expected.length);
    assert.equal(dead.group.children.length, 0);
    assert.equal(dead.stats().props, 0);
    for (const mesh of live.group.children) {
      for (let i = 0; i < mesh.count; i++)
        assert.equal(mesh.instanceMatrix.array[i * 16 + 13], -200);
    }
    // Near-rock exclusions inspect adjacent cells; only that local ring changes.
    const unaffected = (list) =>
      list.filter(
        (p) => Math.abs((p.cellIndex % 8) - 3) > 1 || Math.abs(Math.floor(p.cellIndex / 8) - 3) > 1
      );
    assert.deepEqual(unaffected(expected), unaffected(placeProps(old)));
    const kelp = env.envTemplate('env-kelp-cluster', 30, 2, () => {}, 'sorrowgate');
    assert.ok(kelp?.sway);
    live.tick(1000);
    assert.equal(kelp.sway.uSwayTime.value, 1);
    live.setReducedMotion(true);
    live.tick(2000);
    const held = kelp.sway.uSwayTime.value;
    live.tick(9000);
    assert.equal(kelp.sway.uSwayTime.value, held);
    live.setReducedMotion(false);
    live.tick(10000);
    assert.equal(kelp.sway.uSwayTime.value, 10);
    let disposed = 0;
    const texture = surfaceTexture();
    texture.addEventListener('dispose', () => disposed++);
    live.destroy();
    assert.equal(live.group.children.length, 0);
    assert.deepEqual(live.stats(), { props: 0, propTris: 0 });
    assert.equal(disposed, 0, 'a match must not dispose the page-owned surface texture');
  });

  it('ignores a reset load and reports failed decoding without a retry loop', async () => {
    controlLoads();
    let stale = 0;
    env.envTemplate('env-kelp-cluster', 30, 2, () => stale++, 'sorrowgate');
    await until(() => pending.length === 1);
    env.resetEnvironmentModels();
    let ready = 0;
    env.envTemplate('env-kelp-cluster', 30, 2, () => ready++, 'sorrowgate');
    await until(() => pending.length === 2);
    pending[0].resolve(source());
    pending[1].resolve(source());
    await until(() => ready === 1);
    assert.equal(stale, 0);
    env.envTemplate('env-open-boulder', 12, 0, () => assert.fail('failed load notified'));
    await until(() => pending.length === 3);
    const warning = mock.method(console, 'warn', () => {});
    pending[2].reject(new Error('controlled decode failure'));
    await until(() => warning.mock.callCount() === 1);
    assert.match(warning.mock.calls[0].arguments[0], /env-open-boulder.*fallback/);
    assert.equal(
      env.envTemplate('env-open-boulder', 12, 0, () => {}),
      null
    );
    assert.equal(pending.length, 3);
  });
});

describe('roster look and palette cache isolation', () => {
  it('holds the requested palette across a pending load and shares only matching templates', async () => {
    controlLoads();
    const key = { faction: Faction.Pelagia, unit: UnitKind.LightScout };
    palette.setActivePalette('standard');
    assert.equal(roster.rosterModelInstance(key, 'sorrowgate'), null);
    await until(() => pending.length === 1);
    palette.setActivePalette('deuteranopia');
    assert.equal(roster.rosterModelInstance(key, 'sorrowgate'), null);
    pending[0].resolve(source());
    await until(() => roster.rosterModelInstance(key, 'sorrowgate') !== null);
    const alternate = roster.rosterModelInstance(key, 'sorrowgate');
    palette.setActivePalette('standard');
    const tutorial = roster.rosterModelInstance(key, 'sorrowgate');
    assert.ok(tutorial);
    assert.ok(!cladding(tutorial).material.color.equals(cladding(alternate).material.color));
    const another = roster.rosterModelInstance(key, 'sorrowgate');
    assert.equal(cladding(another).material, cladding(tutorial).material);
    assert.equal(cladding(another).geometry, cladding(tutorial).geometry);
    assert.notEqual(another.emissives[0].material, tutorial.emissives[0].material);
    roster.applyLiveGlow(tutorial, 12, 6);
    assert.equal(
      another.emissives[0].material.emissiveIntensity,
      another.emissives[0].restIntensity
    );
    assert.equal(roster.rosterModelInstance(key), null);
    await until(() => roster.rosterModelInstance(key) !== null);
    const standard = roster.rosterModelInstance(key);
    assert.ok(cladding(standard).material.color.equals(cladding(tutorial).material.color));
    assert.doesNotMatch(cladding(standard).material.customProgramCacheKey(), /sorrowgate/);
    assert.match(cladding(tutorial).material.customProgramCacheKey(), /sorrowgate/);
    assert.equal(pending.length, 1, 'both looks and palettes reuse the parsed source');
  });
});
