import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, afterEach, before, describe, it, mock } from 'node:test';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createServer } from 'vite';
import { Biome, Faction, FREE_WATER_HIGH_LIFE, HIGH_GRAPHICS, UnitKind } from '@echoes/shared';

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

// Polls for a delivery, not a deadline: these tests ask whether a completed
// load reaches its consumer at all, and how long the template build takes is
// the runner's business. A shared CI runner, under the shard's other files,
// once took longer than the 2 s this allowed (#1629); a delivery that never
// comes still fails, after 10 s.
async function until(predicate) {
  for (let i = 0; i < 1000; i++) {
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
  it('retains the caller-selected placement batch across a pending load', async () => {
    controlLoads();
    const cells = terrain();
    const placements = placeProps(cells).slice(0, 1);
    assert.equal(placements.length, 1);
    const layer = new EnvironmentLayer();
    try {
      layer.rebuild(cells, () => -200, placements);
      await until(() => pending.length === 1);
      pending[0].resolve(source());
      await until(() => layer.stats().props > 0);
      assert.equal(layer.stats().props, 1, 'a completed load must not restore the full map batch');
    } finally {
      layer.destroy();
    }
  });

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
    const expected = placeProps(changed);
    assert.ok(expected.length > 0);
    // Every slug either map stands is requested, and each request reaches
    // loadAsync only once its own URL module resolves, so the loads arrive
    // apart. Resolving whatever had arrived by the first poll left a later
    // one pending for good, which reads as a delivery that never came (#1745).
    const slugs = new Set([...placeProps(old), ...expected].map((p) => p.slug));
    await until(() => pending.length === slugs.size);
    pending.forEach((p) => p.resolve(source()));
    await until(() => live.stats().props === expected.length);
    assert.equal(pending.length, slugs.size, 'a delivery must not start another load');
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
    assert.deepEqual(live.stats(), {
      props: 0,
      propTris: 0,
      ventPlumes: 0,
      fieldHazes: 0,
      landmarks: 0,
      landmarkTris: 0,
      siftMotes: 0,
      cloudMotes: 0,
      decorativePhotophores: 0,
      lifeGlints: 0,
      photophoreLights: 0,
      jellyLights: 0,
      farLanterns: 0,
      fixtureAssets: {},
    });
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

  it("tells a launch's preparation when each load ends, either way (world-map §7.6)", async () => {
    controlLoads();
    let ready = false;
    void env
      .whenEnvTemplatesReady(
        [
          { slug: 'env-kelp-cluster', footprintM: 30, swayM: 2 },
          { slug: 'env-open-boulder', footprintM: 12, swayM: 0 },
        ],
        'sorrowgate'
      )
      .then(() => (ready = true));
    await until(() => pending.length === 2);
    pending[0].resolve(source());
    await delay(30);
    assert.equal(ready, false, 'one model is still loading');
    mock.method(console, 'warn', () => {});
    pending[1].reject(new Error('controlled decode failure'));
    await until(() => ready);
    // A load a reset forgets is not waited on for good.
    let forgotten = false;
    void env
      .whenEnvTemplatesReady([{ slug: 'env-open-boulder', footprintM: 12, swayM: 0 }], 'standard')
      .then(() => (forgotten = true));
    await until(() => pending.length === 3);
    env.resetEnvironmentModels();
    await until(() => forgotten);
  });
});

describe('seated stones', () => {
  it('sink each loose stone a share of its height, and only where the layer seats them', async () => {
    controlLoads();
    const open = { ...terrain(), biomes: Array(64).fill(Biome.OpenWater) };
    const boulders = placeProps(open).filter((p) => p.slug === 'env-open-boulder');
    assert.ok(boulders.length > 0, 'the open map seats no boulder');
    const seated = new EnvironmentLayer('standard', true);
    const standing = new EnvironmentLayer('standard');
    try {
      seated.rebuild(open, () => -200, boulders);
      standing.rebuild(open, () => -200, boulders);
      await until(() => pending.length === 1);
      pending[0].resolve(source());
      await until(() => seated.stats().props > 0 && standing.stats().props > 0);
      // The source box is 4 m by 2 m tall, held to the boulder's 12 m: 6 m.
      const height = env.envTemplate('env-open-boulder', 12, 0, () => {}).heightM;
      assert.ok(Math.abs(height - 6) < 1e-9, `the template stands ${height} m, not 6`);
      for (const mesh of seated.group.children) {
        boulders.forEach((p, i) => {
          const sunk = -200 - 0.3 * height * p.scale;
          assert.ok(Math.abs(mesh.instanceMatrix.array[i * 16 + 13] - sunk) < 1e-4);
        });
      }
      for (const mesh of standing.group.children) {
        for (let i = 0; i < mesh.count; i++)
          assert.equal(mesh.instanceMatrix.array[i * 16 + 13], -200);
      }
    } finally {
      seated.destroy();
      standing.destroy();
    }
  });
});

describe('vent steam (#1514)', () => {
  it('stands one column on each chimney that stands, at its mouth, and none on basalt', async () => {
    controlLoads();
    const vents = { ...terrain(), biomes: Array(64).fill(Biome.ThermalVein) };
    const all = placeProps(vents);
    const chimneys = all.filter((p) => p.slug === 'env-vent-chimney');
    assert.ok(chimneys.length > 0 && all.some((p) => p.slug === 'env-vent-basalt'));
    const layer = new EnvironmentLayer();
    try {
      layer.rebuild(vents, () => -200, all);
      assert.equal(layer.stats().ventPlumes, 0, 'a chimney still loading breathes nothing');
      assert.ok(!layer.group.children.includes(layer.plume.points));
      await until(() => pending.length === 2);
      pending.forEach((p) => p.resolve(source()));
      await until(() => layer.stats().props === all.length);
      assert.equal(layer.stats().ventPlumes, chimneys.length);
      assert.ok(layer.group.children.includes(layer.plume.points));
      // The source box is 2 m tall on a 4 m footprint, held to the chimney's 12 m: 6 m.
      const height = env.envTemplate('env-vent-chimney', 12, 0, () => {}).heightM;
      const mouth = layer.plume.firstSite;
      assert.equal(mouth.xM, chimneys[0].xM);
      assert.ok(Math.abs(mouth.y - (-200 + height * chimneys[0].scale)) < 1e-9);
      layer.reset();
      assert.equal(layer.stats().ventPlumes, 0);
      assert.equal(layer.group.children.length, 0);
    } finally {
      layer.destroy();
    }
  });
});

describe('a vent at work at High (#1837)', () => {
  // Serve every load as it is asked for, until `done`: High asks for a body's
  // own template after Low's, so the count is not one number.
  const settle = async (done) => {
    let served = 0;
    await until(() => {
      while (served < pending.length) pending[served++].resolve(source());
      return done();
    });
  };

  it('keeps the steam on the canvas at High on a map that is not the crater', async () => {
    controlLoads();
    const vents = { ...terrain(), biomes: Array(64).fill(Biome.ThermalVein) };
    const all = placeProps(vents);
    const chimneys = all.filter((p) => p.slug === 'env-vent-chimney');
    const layer = new EnvironmentLayer();
    try {
      // docs/art-direction.md, "The vents at work": the crater's stand alone
      // breathes smoke; a Thermal Vein has no frame of it yet.
      layer.setWorldPass(true);
      layer.rebuild(vents, () => -200, all);
      await settle(() => layer.stats().props === all.length);
      assert.equal(layer.plume.plumes, chimneys.length);
      assert.equal(layer.smoke.plumes, 0);
      assert.ok(layer.group.children.includes(layer.plume.points));
      assert.ok(!layer.group.children.includes(layer.smoke.points));
    } finally {
      layer.destroy();
    }
  });

  it('breathes lit smoke over the crater’s stand at High, and stands none of it at Low', async () => {
    controlLoads();
    // The outside rim's own cells everywhere: Coral Ruins at 600 m, open.
    const rim = {
      cols: 16,
      rows: 16,
      cellM: 250,
      floor: Array(256).fill(600),
      ceiling: Array(256).fill(0),
      biomes: Array(256).fill(Biome.CoralRuins),
    };
    const stacks = () => layer.stats().fixtureAssets['env-vent-chimney'] ?? 0;
    const chimneyMeshes = () => layer.group.children.filter((c) => c.name === 'env-vent-chimney');
    const layer = new EnvironmentLayer('free-water');
    try {
      layer.rebuild(rim, () => -132);
      await settle(() => layer.stats().fixtureAssets['env-shoal-fry'] !== undefined);
      const low = layer.stats().props;
      assert.equal(stacks(), 0, 'Low stands no vent');
      assert.equal(layer.stats().ventPlumes, 0);

      layer.setWorldPass(true);
      layer.rebuild(rim, () => -132);
      await settle(() => stacks() === 2 && layer.smoke.plumes === 2);
      // One plume a stack, never both.
      assert.equal(layer.plume.plumes, 0);
      assert.ok(layer.group.children.includes(layer.smoke.points));
      assert.ok(!layer.group.children.includes(layer.plume.points));
      assert.ok(chimneyMeshes().length > 0);

      // Back at Low the stand goes whole: its meshes, its columns, its count.
      layer.setWorldPass(false);
      layer.rebuild(rim, () => -132);
      assert.equal(chimneyMeshes().length, 0);
      assert.equal(stacks(), 0);
      assert.equal(layer.smoke.plumes, 0);
      assert.equal(layer.stats().ventPlumes, 0);
      assert.ok(!layer.group.children.includes(layer.smoke.points));
      assert.equal(layer.stats().props, low);
    } finally {
      layer.destroy();
    }
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
    // Lamps are the template's too, and each instance dims them by its own
    // glow, which the batch draws per instance (rosterBatches.ts).
    assert.equal(another.emissives[0].material, tutorial.emissives[0].material);
    roster.applyLiveGlow(tutorial, 12, 6);
    assert.ok(tutorial.glow > 1);
    assert.equal(another.glow, 1);
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

describe('a body’s own light at High (#1837)', () => {
  // A seat is a node its file names, so the two bodies that carry seats are
  // served as their real files and every other load as the stub.
  const SEATED = ['env-deep-fish', 'env-drift-jelly'];
  const real = (slug) => {
    const bytes = readFileSync(
      new URL(`../../../docs/concept-art/models/${slug}.glb`, import.meta.url)
    );
    return new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      ''
    );
  };
  let served = 0;
  const settle = async (done) => {
    await until(() => {
      while (served < pending.length) {
        const load = pending[served++];
        const slug = SEATED.find((seated) => String(load.url).includes(`${seated}.glb`));
        if (slug === undefined) load.resolve(source());
        else real(slug).then(load.resolve, load.reject);
      }
      return done();
    });
  };

  it('lights a fry’s flank and a deep fish’s seats, hangs a jelly’s lantern, and leaves Low the stipple', async () => {
    controlLoads();
    served = 0;
    const { terrainFor } = await import('../../backend/src/sim/maps/index.ts');
    const { FREE_WATER_SLICE } = await import('../../backend/src/sim/maps/freeWaterSlice.ts');
    const cells = terrainFor(FREE_WATER_SLICE).serialize();
    const layer = new EnvironmentLayer('free-water');
    const count = (slug) => layer.stats().fixtureAssets[slug] ?? 0;
    try {
      layer.rebuild(cells, () => -132);
      await settle(() => count('env-shoal-fry') > 0 && layer.stats().decorativePhotophores > 0);
      layer.tick(0, undefined, 1000);
      const low = layer.stats();
      // Low: the deep fish's seats are the stipple's dots, no body is lit and
      // no jelly stands.
      const seats = low.decorativePhotophores / count('env-deep-fish');
      assert.ok(Number.isInteger(seats) && seats >= 1 && seats <= 6, `${seats} seats a deep fish`);
      assert.equal(low.lifeGlints, 0);
      assert.equal(low.photophoreLights, 0);
      assert.equal(low.jellyLights, 0);
      assert.equal(low.farLanterns, 0);
      assert.equal(count('env-drift-jelly'), 0);

      layer.setWorldPass(true);
      layer.rebuild(cells, () => -132);
      // The five by the fleet, and the far bloom's river after them (#1859).
      const fleet = FREE_WATER_HIGH_LIFE.JELLIES.SLOTS.length;
      const jellies = fleet + FREE_WATER_HIGH_LIFE.BLOOM.COUNT;
      await settle(
        () =>
          count('env-drift-jelly') === jellies &&
          count('env-shoal-fry') > low.fixtureAssets['env-shoal-fry'] &&
          layer.stats().lifeGlints > 0 &&
          layer.stats().jellyLights > 0
      );
      layer.tick(0, undefined, 2000);
      const high = layer.stats();
      // docs/art-direction.md, "Life in the world's light": one light a fry
      // and one a seat of a deep fish, in the fry's cloud, and no other body
      // in it.
      assert.equal(high.lifeGlints, count('env-shoal-fry'));
      assert.equal(high.photophoreLights, low.decorativePhotophores);
      assert.equal(layer.glow.count, high.lifeGlints + high.photophoreLights);
      // A seat's light is a kind of its own, at its own level against the
      // cloud's: both kinds are in the cloud, and no other.
      const glow = layer.glow.points.geometry.getAttribute('aGlow');
      const kinds = new Map();
      for (let i = 0; i < layer.glow.count; i++) {
        const key = `${glow.getX(i)} m at ${glow.getY(i)}`;
        kinds.set(key, (kinds.get(key) ?? 0) + 1);
      }
      const { LEVEL, SIZE_M, SEAT } = HIGH_GRAPHICS.LIFE.GLOW;
      const kind = (sizeM, level) => `${Math.fround(sizeM)} m at ${Math.fround(level / LEVEL)}`;
      assert.notEqual(kind(SEAT.SIZE_M, SEAT.LEVEL), kind(SIZE_M, LEVEL));
      assert.deepEqual(
        kinds,
        new Map([
          [kind(SIZE_M, LEVEL), high.lifeGlints],
          [kind(SEAT.SIZE_M, SEAT.LEVEL), high.photophoreLights],
        ])
      );
      // A seat's light carries the way its seat faces, a unit vector turned
      // with its body, and a fry's carries none (#1876). No point of a
      // lantern has a seat to face by.
      const face = layer.glow.points.geometry.getAttribute('aGlowFace');
      let faced = 0;
      for (let i = 0; i < layer.glow.count; i++) {
        const length = Math.hypot(face.getX(i), face.getY(i), face.getZ(i));
        const seat = glow.getY(i) === Math.fround(SEAT.LEVEL / LEVEL);
        assert.ok(Math.abs(length - (seat ? 1 : 0)) < 1e-5, `light ${i} faces by ${length}`);
        if (seat) faced++;
      }
      assert.equal(faced, high.photophoreLights);
      const hung = layer.lantern.points.geometry.getAttribute('aGlowFace');
      assert.ok(hung.array.subarray(0, layer.lantern.count * 3).every((v) => v === 0));
      // "A jelly is a lantern": the glow round its bell, its six seats and
      // its strands' beads, in a cloud of its own token.
      const { COUNT, BEADS } = HIGH_GRAPHICS.LIFE.JELLY.STRANDS;
      assert.equal(high.jellyLights, jellies * (1 + 6 + COUNT * BEADS));
      assert.ok(layer.group.children.includes(layer.lantern.points));
      // "A far bloom of lanterns" (#1859): the river over the bowl is whole
      // lanterns of the same file, so its points are that cloud's and its
      // bells the same draws: no cloud and no body of its own.
      assert.equal(high.farLanterns, FREE_WATER_HIGH_LIFE.BLOOM.COUNT);
      assert.equal(layer.lantern.count, high.jellyLights);
      assert.deepEqual(
        new Set(layer.group.children.filter((c) => c.isPoints && c.userData.worldLayer)),
        new Set([layer.glow.points, layer.lantern.points, layer.smoke.points]),
        'the fry’s cloud, the lantern’s and the vent’s smoke, and no cloud of the river’s own'
      );
      // The five by the fleet take the whole wave of light and every lantern
      // after them the softer one: the membrane's program is told where the
      // river starts in its instances.
      const programs = [];
      for (const bell of layer.group.children.filter((c) => c.name === 'env-drift-jelly')) {
        const shader = { uniforms: {}, vertexShader: '', fragmentShader: '' };
        bell.material.onBeforeCompile(shader);
        programs.push(shader.uniforms.uJellyNear.value);
        assert.equal(bell.count, jellies);
      }
      assert.deepEqual([...new Set(programs)], [fleet]);
      // It drifts on the match's clock, and reduced motion holds it where the
      // match's start stands it: the river's points follow the five's.
      const river = () => {
        const at = layer.lantern.points.geometry.getAttribute('position');
        return Array.from(
          at.array.subarray((high.jellyLights / jellies) * fleet * 3, high.jellyLights * 3)
        );
      };
      const at2s = river();
      layer.tick(0, undefined, 902000);
      const at902s = river();
      assert.notDeepEqual(at902s, at2s);
      layer.setReducedMotion(true);
      layer.tick(0, undefined, 2000);
      const held = river();
      layer.tick(0, undefined, 902000);
      assert.deepEqual(river(), held);
      assert.notDeepEqual(held, at2s);
      layer.setReducedMotion(false);
      layer.tick(0, undefined, 2000);
      assert.deepEqual(river(), at2s);
      // Its file is drawn as a membrane there, and names itself the world pass's.
      const bells = layer.group.children.filter((c) => c.name === 'env-drift-jelly');
      assert.ok(bells.length > 0);
      for (const bell of bells) {
        assert.match(bell.material.name, /^jelly_/);
        assert.equal(bell.userData.worldLayer, true);
      }
      // A seat that is world light is no dot of the stipple channel: not a
      // jelly's, which never was one, and not a deep fish's, which is one at
      // Low alone.
      assert.equal(high.decorativePhotophores, 0);

      layer.setWorldPass(false);
      layer.rebuild(cells, () => -132);
      layer.tick(0, undefined, 3000);
      assert.equal(layer.stats().lifeGlints, 0);
      assert.equal(layer.stats().photophoreLights, 0);
      assert.equal(layer.stats().jellyLights, 0);
      assert.equal(layer.stats().farLanterns, 0);
      assert.equal(layer.lantern.count, 0);
      assert.ok(!layer.group.children.includes(layer.lantern.points));
      assert.equal(count('env-drift-jelly'), 0);
      assert.equal(layer.stats().decorativePhotophores, low.decorativePhotophores);
    } finally {
      layer.destroy();
    }
  });
});
