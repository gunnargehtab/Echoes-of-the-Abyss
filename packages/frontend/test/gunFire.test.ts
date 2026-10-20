/**
 * The muzzle effect on own guns (#1511, docs/art-direction.md "Animation
 * Style" and "FX Language"). The three.js objects here need no GL — these
 * tests read the ring's buffers the render would, and one boots the real conn
 * view to hold the path from a server `Fired` to the effect.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { Faction, SelfEventKind, UnitKind } from '@echoes/shared';
import {
  FIRE_POOL,
  FLASH_LIFE_MS,
  FLASH_PARTICLES,
  GunFire,
  RECOIL_KICK_MS,
  RECOIL_SETTLE_MS,
  RECOIL_SHARE,
  RING_LIFE_MS,
  RING_PARTICLES,
  isSiegeHull,
  recoilLevel,
} from '../src/game/gunFire.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { createHost, HeadlessWebGLRenderer, pumpAnimationFrames } from './support/headless.ts';
import { cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';

/** Every recoil's offset this frame, by hull. */
const recoils = (fire: GunFire, nowMs: number): Map<number, [number, number]> => {
  const seen = new Map<number, [number, number]>();
  fire.eachRecoil(nowMs, (id, dx, dz) => seen.set(id, [dx, dz]));
  return seen;
};

describe('recoilLevel', () => {
  it('kicks to full, then settles back to nothing', () => {
    assert.equal(recoilLevel(-1), 0);
    assert.equal(recoilLevel(0), 0);
    assert.equal(recoilLevel(RECOIL_KICK_MS), 1);
    const mid = recoilLevel(RECOIL_KICK_MS + RECOIL_SETTLE_MS / 2);
    assert.ok(mid > 0 && mid < 1);
    assert.equal(recoilLevel(RECOIL_KICK_MS + RECOIL_SETTLE_MS), 0);
  });
});

describe('isSiegeHull', () => {
  it('names the siege row and nothing else', () => {
    assert.ok(isSiegeHull(UnitKind.Furnace));
    assert.ok(isSiegeHull(UnitKind.Tocsin));
    assert.ok(!isSiegeHull(UnitKind.Corvette));
  });
});

describe('GunFire', () => {
  it('throws a flash and a ring for one shot, gone after their lifetimes', () => {
    const fire = new GunFire();
    fire.fire(11, 0, -300, 0, 0, 10, 0);
    fire.tick(16);
    assert.equal(fire.shotCount, 1);
    assert.equal(fire.particles, FLASH_PARTICLES + RING_PARTICLES);
    fire.tick(FLASH_LIFE_MS + 1);
    assert.equal(fire.particles, RING_PARTICLES, 'the flash goes first');
    fire.tick(RING_LIFE_MS + 1);
    assert.equal(fire.particles, 0);
    assert.equal(fire.points.visible, false, 'nothing alive draws nothing');
  });

  it('sends the flash down the bearing and spreads the ring flat around the muzzle', () => {
    const fire = new GunFire();
    // A quarter turn: the server's +y, which the view draws as +z.
    fire.fire(1, 0, -300, 0, Math.PI / 2, 10, 0);
    fire.tick(200);
    const at = fire.points.geometry.getAttribute('position');
    for (let i = 0; i < FLASH_PARTICLES; i++) {
      assert.ok(at.getZ(i) > 10 * 0.5, 'ahead of the muzzle, toward the target');
      assert.ok(Math.abs(at.getX(i)) < at.getZ(i), 'inside the cone');
    }
    let east = 0;
    let west = 0;
    for (let i = FLASH_PARTICLES; i < FLASH_PARTICLES + RING_PARTICLES; i++) {
      assert.equal(at.getY(i), -300, 'flat');
      if (at.getX(i) > 1) east++;
      if (at.getX(i) < -1) west++;
    }
    assert.equal(east, west, 'evenly round');
  });

  it('kicks a siege hull astern of the bearing and puts it back', () => {
    const fire = new GunFire();
    fire.fire(1, 0, 0, 0, 0, 10, 0, true);
    fire.fire(2, 0, 0, 0, 0, 10, 0);
    assert.equal(fire.recoiling, 1, 'only the siege hull');
    const [dx, dz] = recoils(fire, RECOIL_KICK_MS).get(1)!;
    assert.ok(Math.abs(dx + RECOIL_SHARE * 10) < 1e-9, 'full kick, astern of +x');
    assert.ok(Math.abs(dz) < 1e-9);
    const end = recoils(fire, RECOIL_KICK_MS + RECOIL_SETTLE_MS).get(1)!;
    assert.deepEqual(
      end.map((v) => Math.abs(v)),
      [0, 0],
      'visited once at zero, so the hull lands'
    );
    assert.equal(fire.recoiling, 0, 'and then forgotten');
  });

  it('draws every shot from one fixed ring, and is one draw or none', () => {
    const gl = new HeadlessWebGLRenderer();
    const camera = new PerspectiveCamera();
    const fire = new GunFire();
    const scene = new Scene().add(fire.points);
    for (let i = 0; i < 40; i++) fire.fire(i, i * 10, 0, 0, 0, 10, i);
    fire.tick(50);
    assert.equal(fire.poolSize, FIRE_POOL, 'the ring never grew');
    assert.equal(fire.particles, FIRE_POOL, 'a broadside fills it and no more');
    gl.render(scene, camera);
    assert.equal(gl.ledger.calls, 1, 'forty guns at once');
    fire.tick(RING_LIFE_MS + 100);
    gl.render(scene, camera);
    assert.equal(gl.ledger.calls, 0, 'a spent shot costs nothing');
  });

  it('keeps the flash and drops the ring and the recoil under reduced motion', () => {
    const fire = new GunFire();
    fire.setReducedMotion(true);
    fire.fire(1, 0, 0, 0, 0, 10, 0, true);
    fire.tick(16);
    assert.equal(fire.particles, FLASH_PARTICLES, 'the flash stays');
    assert.equal(fire.recoiling, 0);
  });

  it('drops a ring and a recoil in flight when reduced motion turns on', () => {
    const fire = new GunFire();
    fire.fire(1, 0, 0, 0, 0, 10, 0, true);
    fire.setReducedMotion(true);
    fire.tick(16);
    assert.equal(fire.particles, FLASH_PARTICLES);
    assert.deepEqual(
      recoils(fire, 16)
        .get(1)!
        .map((v) => Math.abs(v)),
      [0, 0],
      'the hull is put back'
    );
    assert.equal(fire.recoiling, 0);
  });

  it('clears every shot for a new match', () => {
    const fire = new GunFire();
    fire.fire(1, 0, 0, 0, 0, 10, 0, true);
    fire.reset();
    fire.tick(16);
    assert.equal(fire.particles, 0);
    assert.equal(fire.recoiling, 0);
  });
});

describe('the conn view on a Fired', () => {
  const realNow = performance.now;
  const views: PerspectiveView[] = [];
  afterEach(() => {
    performance.now = realNow;
    for (const view of views.splice(0)) view.destroy();
  });

  const probe = () =>
    (
      globalThis as unknown as {
        window: {
          __perspectiveProbe: () => { shots: number; shotParticles: number; recoiling: number };
        };
      }
    ).window.__perspectiveProbe();

  it('fires one effect for one event, kicks a siege hull, and lets both go', () => {
    let clock = 1000;
    performance.now = () => clock;
    const gl = new HeadlessWebGLRenderer();
    const view = new PerspectiveView();
    views.push(view);
    view.mount(
      createHost(1280, 720) as unknown as HTMLElement,
      () => gl.asRenderer(),
      gl.environment
    );
    view.setTerrain(cannedTerrain());
    view.setIdentity(0, Faction.Bathyarch);
    view.setActive(true);
    view.applySnapshot({ ...cannedSnapshot(300), selfEvents: [] });
    pumpAnimationFrames();
    assert.equal(probe().shots, 0, 'no event, no effect');

    const shot = cannedSnapshot(301);
    const gun = shot.units[0]!;
    shot.selfEvents = [{ kind: SelfEventKind.Fired, unitId: gun.id, bearing: 0 }];
    view.applySnapshot(shot);
    clock += 16;
    pumpAnimationFrames();
    assert.equal(probe().shots, 1);
    assert.ok(probe().shotParticles > 0);
    assert.equal(probe().recoiling, 0, 'a Corvette is no siege hull');

    // The same hull as a Tocsin: the bell kicks it.
    const bell = cannedSnapshot(302);
    bell.units[0]!.kind = UnitKind.Tocsin;
    bell.selfEvents = [{ kind: SelfEventKind.Fired, unitId: gun.id, bearing: 0 }];
    view.applySnapshot(bell);
    clock += 16;
    pumpAnimationFrames();
    assert.equal(probe().shots, 2);
    assert.equal(probe().recoiling, 1);

    view.applySnapshot({ ...cannedSnapshot(303), units: bell.units, selfEvents: [] });
    clock += RING_LIFE_MS + RECOIL_KICK_MS + RECOIL_SETTLE_MS;
    pumpAnimationFrames();
    assert.equal(probe().shots, 2, 'nothing new is fired');
    assert.equal(probe().shotParticles, 0);
    assert.equal(probe().recoiling, 0);
  });
});
