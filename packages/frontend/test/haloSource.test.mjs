/**
 * The lamp halo's source over real roster models — docs/art-direction.md,
 * "Lamp halo — SPEC", and gate 3 of docs/graphics-standards.md.
 *
 * The committed GLBs, built by the real template code (the lampCore.test.mjs
 * precedent) and placed in front of a perspective camera, are fed to
 * gatherHaloSplats over every live SIG from 0 to 100. What it must hold: no
 * own entity at SIG 0–15 contributes a splat; an entity's energy never falls
 * as its SIG rises; and lit area never changes it, so the SIG-25 Foundry,
 * whose flood bay is the roster's largest lamp, carries exactly what a
 * Caisson does at the same SIG.
 *
 * Plain JS in .mjs, as lampCore.test.mjs is: it reads the GLBs off disk.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Mesh, MeshStandardMaterial, PerspectiveCamera } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Faction, StructureKind, UnitKind } from '@echoes/shared';

import { buildTemplate, slugFor } from '../src/game/rosterModels.ts';
import { gatherHaloSplats } from '../src/game/haloSource.ts';
import { entityHaloEnergy, LAMP_HALO } from '../src/game/lampHalo.ts';

const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);

async function instance(key, xM) {
  const bytes = readFileSync(new URL(`${slugFor(key)}.glb`, MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const raw = (await new GLTFLoader().parseAsync(buffer, '')).scene;
  const template = buildTemplate(raw, key, 'standard');
  // As rosterModelInstance builds one: the template cloned, lamps cloned per entity.
  const root = template.root.clone(true);
  const emissives = [];
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const material = child.material;
    if (material instanceof MeshStandardMaterial && material.emissive.getHex() !== 0) {
      const own = material.clone();
      child.material = own;
      emissives.push({ material: own, restIntensity: own.emissiveIntensity });
    }
  });
  root.position.set(xM, 0, 0);
  root.updateMatrixWorld(true);
  return { root, emissives };
}

function camera(heightM = 600) {
  // Looking straight down, from 600 m wide enough to hold every model whole.
  const eye = new PerspectiveCamera(60, 1440 / 900, 10, 60_000);
  eye.position.set(0, heightM, 0.01);
  eye.lookAt(0, 0, 0);
  eye.updateMatrixWorld(true);
  return eye;
}

const gather = (entities, heightM) =>
  gatherHaloSplats({
    entities,
    camera: camera(heightM),
    bufferWidth: 1440,
    bufferHeight: 900,
    drawScale: 1,
    fogDensity: 0,
    pixelRatio: 1,
  });

const energyOf = (splats, entity) =>
  splats.filter((s) => s.entity === entity).reduce((sum, s) => sum + s.energy, 0);

describe('lamp halo source: over real roster models', () => {
  it('draws no splat for an own entity at live SIG 0–15, and never less energy as SIG rises', async () => {
    const models = await Promise.all([
      instance({ unit: UnitKind.Caisson, faction: Faction.Bathyarch }, -120),
      instance({ structure: StructureKind.Foundry, faction: Faction.Bathyarch }, 0),
      instance({ unit: UnitKind.LightScout, faction: Faction.Bathyarch }, 120),
    ]);
    const last = models.map(() => 0);
    for (let sig = 0; sig <= 100; sig += 0.5) {
      const { splats, dropped } = gather(models.map((model) => ({ sig, model })));
      assert.equal(dropped, 0, 'three models stay under the cap');
      models.forEach((_, entity) => {
        const energy = energyOf(splats, entity);
        if (sig <= 15) assert.equal(energy, 0, `entity ${entity} spreads light at SIG ${sig}`);
        assert.ok(energy >= last[entity] - 1e-9, `entity ${entity} lost energy at SIG ${sig}`);
        last[entity] = energy;
      });
    }
  });

  it('gives a Foundry exactly a Caisson energy at the same SIG, whatever their lamp areas', async () => {
    const caisson = await instance({ unit: UnitKind.Caisson, faction: Faction.Bathyarch }, -120);
    const foundry = await instance(
      { structure: StructureKind.Foundry, faction: Faction.Bathyarch },
      0
    );
    for (const sig of [25, 40, 64, 95]) {
      const { splats } = gather([
        { sig, model: caisson },
        { sig, model: foundry },
      ]);
      const want = entityHaloEnergy(sig, 1);
      for (const entity of [0, 1]) {
        const got = energyOf(splats, entity);
        assert.ok(
          Math.abs(got - want) <= 1e-9 * want,
          `entity ${entity} at SIG ${sig}: ${got} not ${want}`
        );
      }
      assert.ok(
        splats.filter((s) => s.entity === 1).length >
          splats.filter((s) => s.entity === 0).length / 4,
        'the Foundry still spreads it over its own sites'
      );
    }
  });

  it('skips an entity whose light would stay under the toe, and draws it close up', async () => {
    const caisson = await instance({ unit: UnitKind.Caisson, faction: Faction.Bathyarch }, 0);
    // Just over the gate, a Caisson carries 2.5 % of its weight: at 2 km its
    // light gathered at one pixel stays under the toe, at 100 m it does not.
    const far = gather([{ sig: 15.5, model: caisson }], 2000);
    assert.equal(far.splats.length, 0);
    assert.equal(far.dropped, 0, 'a skipped site is not a dropped one');
    const near = gather([{ sig: 15.5, model: caisson }], 100);
    assert.ok(near.splats.length > 0, 'close up the same Caisson draws');
  });

  it("sets each splat at its site's nearest point along the view ray, inside its sphere", async () => {
    const caisson = await instance({ unit: UnitKind.Caisson, faction: Faction.Bathyarch }, 0);
    const { splats } = gather([{ sig: 64, model: caisson }]);
    assert.ok(splats.length > 0);
    for (const s of splats) {
      assert.ok(s.nearOffset > 0, 'a lit site has depth along the ray');
      assert.ok(s.nearOffset <= s.halfDiagonal + 1e-9, 'never past the corner farthest out');
    }
    // A flat lamp seen face-on from above has almost no depth along the ray:
    // half its diagonal would push its splat out past a ridge that hides it.
    assert.ok(
      splats.some((s) => s.nearOffset < 0.5 * s.halfDiagonal),
      'some site lies nearer its centre than half its diagonal'
    );
  });

  it('reads each lamp mesh live after finding it once: hidden, moved and shown again', async () => {
    const caisson = await instance({ unit: UnitKind.Caisson, faction: Faction.Bathyarch }, 0);
    const before = gather([{ sig: 64, model: caisson }]).splats;
    assert.ok(before.length > 0);
    // The second gather reads the meshes the first one found: a lamp mesh
    // hidden since still drops its sites, and a moved model moves its splats.
    const lamp = [];
    caisson.root.traverse((child) => {
      if (child instanceof Mesh && caisson.emissives.some((e) => e.material === child.material)) {
        lamp.push(child);
      }
    });
    lamp[0].visible = false;
    const hidden = gather([{ sig: 64, model: caisson }]).splats;
    assert.ok(hidden.length < before.length, 'the hidden mesh drew no site');
    lamp[0].visible = true;
    caisson.root.position.x += 10;
    caisson.root.updateMatrixWorld(true);
    const moved = gather([{ sig: 64, model: caisson }]).splats;
    assert.equal(moved.length, before.length, 'shown again, every site is back');
    moved.forEach((s, i) =>
      assert.ok(Math.abs(s.x - before[i].x - 10) < 1e-9, 'moved with its model')
    );
  });

  it('reaches the cap and counts the rest', async () => {
    const models = await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        instance({ unit: UnitKind.Caisson, faction: Faction.Bathyarch }, -200 + (i % 8) * 50)
      )
    );
    const { splats, dropped } = gather(models.map((model) => ({ sig: 64, model })));
    // Forty Caissons hold more lit sites than the cap: it is reached, and the
    // rest are counted as dropped rather than drawn.
    assert.equal(splats.length, LAMP_HALO.SITE_CAP);
    assert.ok(dropped > 0, `dropped ${dropped}`);
  });
});
