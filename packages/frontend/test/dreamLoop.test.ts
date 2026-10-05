import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Biome } from '@echoes/shared';
import {
  dreamLoopEnabled,
  dreamSnowNear,
  installDreamLamp,
  installDreamSteel,
} from '../src/game/dreamLoop.ts';
import { DreamGroundCover } from '../src/game/dreamGroundCover.ts';
import { DreamLightHalos } from '../src/game/dreamLightHalos.ts';
import { lampSites } from '../src/game/lampSites.ts';
import {
  PROP_INSTANCE_CAP,
  PROP_TRI_RESERVATION,
  propSpec,
  type TerrainGrid,
} from '../src/game/environment.ts';

describe('the isolated dream-loop prototype', () => {
  it('requires both development mode and explicit opt-in', () => {
    assert.equal(dreamLoopEnabled(true, '?dream-loop=1'), true);
    assert.equal(dreamLoopEnabled(false, '?dream-loop=1'), false);
    assert.equal(dreamLoopEnabled(true, ''), false);
    assert.equal(dreamLoopEnabled(true, '?dream-loop=0'), false);
  });

  it('leaves lamp colour and resting energy untouched', () => {
    const lamp = new MeshStandardMaterial({ color: 0x222222, emissive: 0xf2b233 });
    lamp.emissiveIntensity = 0.37;
    const original = lamp.clone();
    installDreamSteel(lamp);
    assert.ok(lamp.color.equals(original.color));
    assert.ok(lamp.emissive.equals(original.emissive));
    assert.equal(lamp.emissiveIntensity, original.emissiveIntensity);
    assert.equal(lamp.roughness, original.roughness);
  });

  it('preserves relative cladding luminance while studying a cool finish', () => {
    const steel = new MeshStandardMaterial({ color: 0x887744 });
    const luminance = () =>
      0.2126 * steel.color.r + 0.7152 * steel.color.g + 0.0722 * steel.color.b;
    const before = luminance();
    installDreamSteel(steel);
    assert.ok(Math.abs(luminance() - before) < 1e-8);
    assert.ok(steel.color.b > steel.color.r);
  });

  it('changes the lamp display response without editing its approved inputs', () => {
    const lamp = new MeshStandardMaterial({
      color: 0x222222,
      emissive: 0xf2b233,
      emissiveIntensity: 7,
    });
    const original = lamp.clone();
    installDreamLamp(lamp);
    assert.ok(lamp.color.equals(original.color));
    assert.ok(lamp.emissive.equals(original.emissive));
    assert.equal(lamp.emissiveIntensity, original.emissiveIntensity);
    assert.equal(lamp.roughness, original.roughness);
    assert.equal(lamp.metalness, original.metalness);
    assert.notEqual(lamp.customProgramCacheKey(), original.customProgramCacheKey());
  });

  it('keeps sparse snow at the locked dolly and fades it out toward survey distance', () => {
    assert.ok(dreamSnowNear(4868) > 0.1);
    assert.equal(dreamSnowNear(10000), 0);
    let previous = 1;
    for (let height = 0; height <= 20000; height += 100) {
      const strength = dreamSnowNear(height);
      assert.ok(strength >= 0 && strength <= 0.7);
      assert.ok(strength <= previous);
      previous = strength;
    }
  });
});

function ground(): TerrainGrid {
  return {
    cols: 24,
    rows: 24,
    cellM: 80,
    biomes: Array<number>(24 * 24).fill(Biome.KelpForest),
    floor: Array<number>(24 * 24).fill(700),
    ceiling: Array<number>(24 * 24).fill(0),
  };
}

function cameraAt(pitchDeg = 55, x = 960): PerspectiveCamera {
  const camera = new PerspectiveCamera(40, 1920 / 1080, 1, 30000);
  const pitch = (pitchDeg * Math.PI) / 180;
  camera.position.set(x, 1500 * Math.sin(pitch), 960 + 1500 * Math.cos(pitch));
  camera.lookAt(x, 0, 960);
  camera.updateMatrixWorld();
  return camera;
}

describe('the view-bounded ground-cover study', () => {
  it('dresses the visible ground densely within both reservations at every review angle', () => {
    const cover = new DreamGroundCover();
    cover.setTerrain(ground(), () => 0);
    for (const pitch of [10, 55, 88]) {
      const placements = cover.update(cameraAt(pitch));
      assert.ok(placements);
      assert.ok(placements.length > 100, `only ${placements.length} props at ${pitch} degrees`);
      assert.ok(placements.length <= PROP_INSTANCE_CAP);
      const triangles = placements.reduce((sum, p) => sum + propSpec(p.slug)!.triBudget, 0);
      assert.ok(triangles <= PROP_TRI_RESERVATION, `${triangles} triangles at ${pitch} degrees`);
      const headings = placements.map((p) => p.yawRad);
      assert.ok(Math.max(...headings) - Math.min(...headings) > 5, 'the cap biased prop yaw');
    }
  });

  describe('model-derived lamp halos', () => {
    it('finds disconnected lamps inside one merged indexed or flat mesh', () => {
      const a = new BoxGeometry(2, 2, 2).translate(-10, 0, 0);
      const b = new BoxGeometry(2, 2, 2).translate(10, 0, 0);
      const merged = mergeGeometries([a, b]);
      assert.ok(merged);
      for (const geometry of [merged, merged.toNonIndexed()]) {
        const sites = lampSites(geometry);
        assert.equal(sites.length, 2);
        assert.deepEqual(
          sites.map((s) => s.center.x).sort((a, b) => a - b),
          [-10, 10]
        );
        assert.equal(lampSites(geometry), sites, 'lamp topology was rebuilt');
      }
    });

    it('follows live lamp energy and transforms without turning a floodlit deck into a point', () => {
      const material = new MeshStandardMaterial({ emissive: 0xf2b233, emissiveIntensity: 1 });
      const root = new Group();
      root.add(new Mesh(new BoxGeometry(2, 2, 2), material));
      root.add(new Mesh(new BoxGeometry(50, 1, 50), material));
      // The material rests, shared by every hull of a kind; the hull's own
      // gate-3 factor is the model's (rosterBatches.ts).
      const model = { root, glow: 1 };
      const models = [model];
      const camera = cameraAt();
      const halos = new DreamLightHalos();
      const update = () => halos.update(models, camera, 4800, 1, 1400, 1, 1);
      update();
      assert.equal(halos.points.geometry.drawRange.count, 1);
      const positions = halos.points.geometry.getAttribute('position');
      const strength = halos.points.geometry.getAttribute('lampStrength');
      const first = strength.getX(0);
      const lights = halos.group.children.filter(
        (child): child is PointLight => child instanceof PointLight
      );
      assert.equal(lights.length, 8);
      assert.equal(lights.filter((light) => light.intensity > 0).length, 1);
      const firstPower = lights.reduce((sum, light) => sum + light.intensity, 0);
      root.position.x = 30;
      model.glow = 2;
      update();
      assert.equal(positions.getX(0), 30);
      assert.ok(strength.getX(0) > first);
      assert.ok(lights.reduce((sum, light) => sum + light.intensity, 0) > firstPower);
      assert.equal(lights.find((light) => light.intensity > 0)!.position.x, 30);
      assert.equal(halos.points.geometry.getAttribute('position'), positions);
      model.glow = 0;
      update();
      assert.equal(halos.points.geometry.drawRange.count, 0);
      assert.equal(halos.points.visible, false);
      assert.ok(lights.every((light) => light.intensity === 0));
      model.glow = 1;
      update();
      assert.equal(halos.points.geometry.drawRange.count, 1);
      models.pop();
      update();
      assert.equal(halos.points.visible, false);
      assert.equal(halos.points.material.depthTest, true);
      assert.equal(halos.points.material.depthWrite, false);
      halos.dispose();
    });

    it('caps the one point buffer and ignores non-emissive and hidden models', () => {
      const geometry = new BoxGeometry(2, 2, 2);
      const dark = new Mesh(geometry, new MeshStandardMaterial());
      const lamp = new MeshStandardMaterial({ emissive: 0xf2b233 });
      const hidden = new Mesh(geometry, lamp);
      hidden.visible = false;
      const models = [dark, hidden].map((root) => ({ root, glow: 1 }));
      const halos = new DreamLightHalos();
      const update = () => halos.update(models, cameraAt(), 4800, 1, 1400, 1, 1);
      update();
      assert.equal(halos.points.geometry.drawRange.count, 0);
      for (let i = 0; i < 300; i++) models.push({ root: new Mesh(geometry, lamp), glow: 1 });
      update();
      const positions = halos.points.geometry.getAttribute('position');
      assert.equal(halos.points.geometry.drawRange.count, positions.count);
      assert.equal(positions.count, 256);
      halos.dispose();
    });
  });

  it('is deterministic and does no placement work for an unchanged camera', () => {
    const a = new DreamGroundCover();
    const b = new DreamGroundCover();
    a.setTerrain(ground(), () => 0);
    b.setTerrain(ground(), () => 0);
    const camera = cameraAt();
    const first = a.update(camera);
    assert.deepEqual(first, b.update(camera));
    assert.equal(a.update(camera), null);
    assert.equal(b.update(camera), null);
    a.setTerrain(ground(), () => 0);
    assert.deepEqual(a.update(camera), first);
  });

  it('selects a new view without moving any surviving prop', () => {
    const cover = new DreamGroundCover();
    cover.setTerrain(ground(), () => 0);
    const before = cover.update(cameraAt());
    const after = cover.update(cameraAt(55, 1110));
    assert.ok(before && after);
    const identity = (p: (typeof before)[number]) => `${p.slug}:${p.cellIndex}:${p.yawRad}`;
    const previous = new Map(before.map((p) => [identity(p), p]));
    let common = 0;
    for (const p of after) {
      const old = previous.get(identity(p));
      if (old !== undefined) {
        assert.deepEqual(p, old);
        common++;
      }
    }
    assert.ok(common > 100, 'a small pan replaced the whole ground cover');
  });

  it('retains the registry biome, rock, and roof eligibility', () => {
    const terrain = ground();
    const biomes = [...terrain.biomes];
    const ceiling = [...terrain.ceiling];
    for (let i = 0; i < biomes.length; i++) {
      if (i % 5 === 0) biomes[i] = Biome.OpenWater;
      if (i % 17 === 0) ceiling[i] = 900;
      else if (i % 13 === 0) ceiling[i] = 400;
    }
    const cover = new DreamGroundCover();
    cover.setTerrain({ ...terrain, biomes, ceiling }, () => 0);
    const placements = cover.update(cameraAt());
    assert.ok(placements && placements.length > 0);
    for (const p of placements) {
      const spec = propSpec(p.slug);
      assert.ok(spec);
      const rock = ceiling[p.cellIndex]! > terrain.floor[p.cellIndex]!;
      if (spec.stands === 'rock') assert.ok(rock);
      else {
        assert.ok(!rock);
        assert.ok(spec.stands.includes(biomes[p.cellIndex]! as Biome));
      }
      if (spec.excludeRoofed) assert.notEqual(ceiling[p.cellIndex], 400);
    }
  });
});
