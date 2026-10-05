/**
 * Own models drawn instanced — docs/graphics-standards.md gate 6, "The berth
 * ceiling" (#1079), over committed roster models.
 *
 * What it must hold: forty hulls of one kind cost one call a material, where
 * drawn one by one they cost forty; every slot lands exactly where its root's
 * meshes say it is, which is where the lamp halo and the lamp reading look;
 * each hull's lamps keep their own gate-3 factor; a batch's range stays dense
 * as hulls leave and its bounds follow them; and one hull's lamps can be
 * marked in the stencil without its siblings'.
 *
 * Counted work, never a stopwatch: calls and triangles are the headless
 * renderer's count of what the scene describes (test/support/headless.ts).
 * Plain JS in .mjs, as lampCore.test.mjs is: it reads the GLBs off disk.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Frustum, Matrix4, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Faction, StructureKind, UnitKind } from '@echoes/shared';

import { applyLiveGlow, buildTemplate, instantiate, slugFor } from '../src/game/rosterModels.ts';
import { RosterBatches } from '../src/game/rosterBatches.ts';
import { glowFactor } from '../src/game/glow.ts';
import { keepsGlowOutsideToneMapping, readsInstanceGlow } from '../src/game/modelLighting.ts';
import { HeadlessWebGLRenderer } from './support/headless.ts';

const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);

async function template(key) {
  const bytes = readFileSync(new URL(`${slugFor(key)}.glb`, MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const raw = (await new GLTFLoader().parseAsync(buffer, '')).scene;
  return buildTemplate(raw, key, 'standard');
}

const BEACON = { unit: UnitKind.Beacon, faction: Faction.Bathyarch };

/** `count` instances in a row along x, attached and placed as the view does. */
function fleet(batches, built, count) {
  return Array.from({ length: count }, (_, i) => {
    const model = instantiate(built);
    model.root.position.set(i * 150, -400, 300);
    model.root.rotation.y = i * 0.3;
    batches.attach(model);
    return model;
  });
}

/** Each model's meshes, in the order the batch builds its parts. */
function meshesOf(model) {
  const meshes = [];
  model.root.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child);
  });
  return meshes;
}

function calls(...objects) {
  const renderer = new HeadlessWebGLRenderer();
  const scene = new Scene();
  scene.add(...objects);
  renderer.render(scene, new PerspectiveCamera());
  return renderer.ledger;
}

/** Every slot of every part is its model's mesh, where the halo reads it. */
function assertSlots(parts, models) {
  const slot = new Matrix4();
  for (const model of models) {
    model.root.updateMatrixWorld(true);
    const meshes = meshesOf(model);
    assert.equal(parts.length, meshes.length, 'one part a mesh');
    const index = findSlot(parts[0], meshes[0]);
    assert.ok(index >= 0, 'every model holds a slot');
    parts.forEach((part, p) => {
      part.getMatrixAt(index, slot);
      const want = meshes[p].matrixWorld.elements;
      // The instance matrix is single precision: a millimetre at 400 m.
      slot.elements.forEach((v, i) => assert.ok(Math.abs(v - want[i]) < 1e-3, 'slot off'));
    });
  }
}

function findSlot(part, mesh) {
  const slot = new Matrix4();
  for (let i = 0; i < part.count; i++) {
    part.getMatrixAt(i, slot);
    const a = new Vector3().setFromMatrixPosition(slot);
    const b = new Vector3().setFromMatrixPosition(mesh.matrixWorld);
    if (a.distanceTo(b) < 1e-3) return i;
  }
  return -1;
}

describe('own models drawn instanced (#1079)', () => {
  it('draws forty Beacons in one call a material, where one by one they took forty', async () => {
    const built = await template(BEACON);
    const batches = new RosterBatches();
    const models = fleet(batches, built, 40);
    const materials = meshesOf(models[0]).length;
    assert.equal(materials, 6, 'the Beacon is six materials (docs/screenshots/issue-1027)');

    // The control: the same forty roots in a scene, as the view drew them.
    const before = calls(...models.map((m) => m.root.clone(true)));
    const after = calls(batches.group);
    assert.equal(before.calls, 240);
    assert.equal(after.calls, materials);
    assert.equal(after.triangles, before.triangles, 'every triangle is still drawn');
    assert.equal(batches.stats().meshes, materials);
    assert.equal(batches.stats().instances, 40);
    assertSlots(batches.group.children, models);
    batches.dispose();
  });

  it('gives each hull its own gate-3 glow on lamps every hull of the kind shares', async () => {
    const built = await template(BEACON);
    const batches = new RosterBatches();
    const [quiet, loud, resting] = fleet(batches, built, 3);
    const restSig = 6;
    applyLiveGlow(quiet, 0, restSig);
    applyLiveGlow(loud, 60, restSig);
    batches.place(quiet);
    batches.place(loud);
    assert.ok(built.emissives.length > 0);
    assert.equal(quiet.emissives, loud.emissives, 'one set of lamps for the kind');

    const lamps = batches.group.children.filter((part) =>
      part.geometry.hasAttribute('instanceGlow')
    );
    assert.ok(lamps.length > 0, 'a lamp part carries the attribute');
    for (const part of lamps) {
      const glow = part.geometry.getAttribute('instanceGlow');
      const slotOf = (model) =>
        findSlot(part, meshesOf(model)[batches.group.children.indexOf(part)]);
      assert.equal(glow.getX(slotOf(quiet)), Math.fround(glowFactor(0, restSig)));
      assert.equal(glow.getX(slotOf(loud)), Math.fround(glowFactor(60, restSig)));
      assert.equal(glow.getX(slotOf(resting)), 1);
      const material = part.material;
      assert.ok(readsInstanceGlow(material), 'the lamp shader reads it');
      assert.ok(keepsGlowOutsideToneMapping(material), 'and still adds its glow after the curve');
    }
    const cladding = batches.group.children.filter(
      (part) => !part.geometry.hasAttribute('instanceGlow')
    );
    assert.ok(cladding.length > 0);
    for (const part of cladding) {
      assert.equal(part.geometry, meshesOf(quiet)[batches.group.children.indexOf(part)].geometry);
    }
    batches.dispose();
  });

  it('keeps the drawn range dense as hulls leave, and lets an empty kind go', async () => {
    const built = await template(BEACON);
    const batches = new RosterBatches();
    const models = fleet(batches, built, 9);
    batches.detach(models[2]);
    batches.detach(models[0]);
    const left = models.filter((_, i) => i !== 0 && i !== 2);
    for (const part of batches.group.children) assert.equal(part.count, left.length);
    assertSlots(batches.group.children, left);
    batches.detach(models[2]);
    assert.equal(batches.stats().instances, left.length, 'a second detach is nothing');
    for (const model of left) batches.detach(model);
    assert.equal(batches.group.children.length, 0, 'no meshes for a kind with nothing left');
    batches.dispose();
  });

  it('culls a kind whole by bounds that follow its hulls', async () => {
    const built = await template(BEACON);
    const batches = new RosterBatches();
    const models = fleet(batches, built, 4);
    const camera = new PerspectiveCamera(60, 1.6, 10, 20_000);
    camera.position.set(200, 2000, 300);
    camera.lookAt(200, -400, 300);
    camera.updateMatrixWorld(true);
    const frustum = new Frustum().setFromProjectionMatrix(
      new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    );
    const seen = () => batches.group.children.some((part) => frustum.intersectsObject(part));
    assert.ok(seen(), 'on screen');
    for (const model of models) {
      model.root.position.x += 50_000;
      batches.place(model);
    }
    assert.ok(!seen(), 'moved off screen, the bounds went with it');
    models[1].root.position.x = 200;
    batches.place(models[1]);
    assert.ok(seen(), 'one hull back is the kind back');
    batches.dispose();
  });

  it("marks one hull's lamps in the stencil, from a batch of its own, and never its siblings'", async () => {
    const built = await template(BEACON);
    const batches = new RosterBatches();
    const models = fleet(batches, built, 3);
    const shared = built.emissives.map((e) => e.material);
    const parts = batches.group.children.length;

    batches.markLamps('all');
    assert.ok(shared.every((m) => m.stencilWrite));

    batches.markLamps(models[1]);
    assert.ok(
      shared.every((m) => !m.stencilWrite),
      "the siblings' lamps are not marked"
    );
    const solo = batches.group.children.slice(parts);
    assert.equal(solo.length, parts, 'the one hull draws from a batch of its own');
    assert.ok(solo.every((part) => part.count === 1));
    assert.ok(batches.group.children.slice(0, parts).every((part) => part.count === 2));
    const soloLamps = solo.filter((p) => p.geometry.hasAttribute('instanceGlow'));
    for (const part of soloLamps) {
      assert.ok(part.material.stencilWrite, 'its own lamps are');
      assert.ok(!shared.includes(part.material));
      assert.ok(keepsGlowOutsideToneMapping(part.material), 'with the shader hooks kept');
      assert.ok(readsInstanceGlow(part.material));
    }
    assertSlots(batches.group.children.slice(0, parts), [models[0], models[2]]);
    assertSlots(solo, [models[1]]);

    batches.markLamps('all');
    assert.equal(batches.group.children.length, parts, 'back in the shared batch');
    assert.ok(batches.group.children.every((part) => part.count === 3));
    assert.ok(shared.every((m) => m.stencilWrite));
    assertSlots(batches.group.children, models);

    batches.markLamps(models[0]);
    batches.detach(models[0]);
    assert.equal(batches.group.children.length, parts, 'a solo hull that goes takes its batch');
    batches.markLamps('none');
    assert.ok(shared.every((m) => !m.stencilWrite));
    batches.dispose();
  });

  it('batches by template, so two kinds and a structure never share a draw', async () => {
    const batches = new RosterBatches();
    const beacons = fleet(batches, await template(BEACON), 2);
    const scouts = fleet(
      batches,
      await template({ unit: UnitKind.LightScout, faction: Faction.Bathyarch }),
      3
    );
    const foundry = fleet(
      batches,
      await template({ structure: StructureKind.Foundry, faction: Faction.Bathyarch }),
      1
    );
    const meshes = [beacons, scouts, foundry].reduce((n, [m]) => n + meshesOf(m).length, 0);
    assert.equal(calls(batches.group).calls, meshes);
    const counts = batches.group.children.map((part) => part.count);
    assert.deepEqual(
      counts,
      [beacons, scouts, foundry].flatMap((kind) => meshesOf(kind[0]).map(() => kind.length))
    );
    batches.dispose();
  });
});
