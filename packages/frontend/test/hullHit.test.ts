/**
 * The hit effect on own hulls and structures (#1510, docs/art-direction.md
 * "UI FX"). The three.js objects here need no GL — these tests read the spray
 * ring's buffers the render would, and one boots the real conn view to hold
 * the path from a server `Damaged` to the effect.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { PerspectiveCamera, Scene } from 'three';
import { Faction, SelfEventKind } from '@echoes/shared';
import {
  HIT_FLASH_MS,
  HIT_FLOOR,
  HIT_FULL_SHARE,
  HIT_LIFE_MS,
  HIT_PARTICLES_MAX,
  HIT_PARTICLES_MIN,
  HIT_POOL,
  HullHits,
  flashedGlow,
  hitStrength,
} from '../src/game/hullHit.ts';
import { GLOW_FACTOR_MAX } from '../src/game/glow.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { createHost, HeadlessWebGLRenderer, pumpAnimationFrames } from './support/headless.ts';
import { cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';

/** Every flash's level this frame, by entity. */
const flashes = (hits: HullHits, nowMs: number): Map<number, number> => {
  const seen = new Map<number, number>();
  hits.eachFlash(nowMs, (id, level) => seen.set(id, level));
  return seen;
};

describe('hitStrength', () => {
  it('scales with the share of hull the blow took, full at HIT_FULL_SHARE', () => {
    assert.ok(hitStrength(10, 200) < hitStrength(30, 200), 'a bigger blow is a bigger hit');
    assert.equal(hitStrength(HIT_FULL_SHARE * 200, 200), 1);
    assert.equal(hitStrength(200, 200), 1, 'clamped');
  });

  it('shows the floor for a scratch, or when no loss can be measured', () => {
    assert.equal(hitStrength(0.1, 200), HIT_FLOOR);
    assert.equal(hitStrength(NaN, 200), HIT_FLOOR, 'the hull’s first snapshot');
    assert.equal(hitStrength(-5, 200), HIT_FLOOR, 'repaired in the same tick');
    assert.equal(hitStrength(5, 0), HIT_FLOOR);
  });
});

describe('flashedGlow', () => {
  it('lifts gate 3’s factor to its ceiling at full and leaves it at rest at zero', () => {
    assert.equal(flashedGlow(0.3, 0), 0.3);
    assert.equal(flashedGlow(0.3, 1), GLOW_FACTOR_MAX);
    assert.ok(flashedGlow(0.3, 0.5) > 0.3 && flashedGlow(0.3, 0.5) < GLOW_FACTOR_MAX);
  });
});

describe('HullHits', () => {
  it('makes one effect of one hit, and it is gone after its lifetime', () => {
    const hits = new HullHits();
    hits.hit(11, 0, -300, 0, 0.5, 1, 0);
    hits.tick(16);
    assert.equal(hits.count, 1);
    assert.ok(hits.particles > 0);
    assert.ok(flashes(hits, 16).get(11)! > 0, 'the lamps flash');
    hits.tick(HIT_LIFE_MS + 1);
    const last = flashes(hits, HIT_LIFE_MS + 1);
    assert.equal(last.get(11), 0, 'visited once at zero, so the lamps go back');
    assert.equal(hits.count, 0);
    assert.equal(hits.particles, 0);
    assert.equal(hits.points.visible, false, 'nothing alive draws nothing');
    assert.equal(flashes(hits, HIT_LIFE_MS + 20).size, 0, 'and then forgotten');
  });

  it('scales the flash and the spray with the hit', () => {
    const small = new HullHits();
    const big = new HullHits();
    small.hit(1, 0, 0, 0, HIT_FLOOR, 1, 0);
    big.hit(1, 0, 0, 0, 1, 1, 0);
    assert.ok(small.thrownCount < big.thrownCount, 'more particles');
    assert.equal(big.thrownCount, HIT_PARTICLES_MAX);
    assert.ok(small.thrownCount >= HIT_PARTICLES_MIN);
    assert.ok(flashes(small, 0).get(1)! < flashes(big, 0).get(1)!, 'a brighter flash');
  });

  it('flashes sharply and has the lamps back at rest after the flash', () => {
    const hits = new HullHits();
    hits.hit(1, 0, 0, 0, 1, 1, 0);
    const early = flashes(hits, HIT_FLASH_MS / 4).get(1)!;
    const late = flashes(hits, (3 * HIT_FLASH_MS) / 4).get(1)!;
    assert.ok(early > late && late > 0);
    assert.equal(flashes(hits, HIT_FLASH_MS).get(1), 0);
  });

  it('keeps one effect an entity, a fresh blow restarting it', () => {
    const hits = new HullHits();
    hits.hit(1, 0, 0, 0, 0.3, 1, 0);
    hits.hit(1, 0, 0, 0, 0.3, 1, HIT_LIFE_MS / 2);
    hits.hit(2, 50, 0, 0, 0.3, 1, HIT_LIFE_MS / 2);
    assert.equal(hits.count, 2);
    flashes(hits, HIT_LIFE_MS + 1);
    assert.equal(hits.count, 2, 'the restarted hit is still alive');
  });

  it('throws bubbles up and debris down, out from the hull', () => {
    const hits = new HullHits();
    hits.hit(1, 0, -300, 0, 1, 1, 0);
    hits.tick(400);
    const y = hits.points.geometry.getAttribute('position');
    let up = 0;
    let down = 0;
    for (let i = 0; i < HIT_PARTICLES_MAX; i++) {
      if (y.getY(i) > -300) up++;
      if (y.getY(i) < -300) down++;
      assert.ok(Math.hypot(y.getX(i), y.getZ(i)) > 0, 'spread out');
    }
    assert.ok(up > down && down > 0);
  });

  it('draws every hit from one fixed ring, and is one draw or none', () => {
    const gl = new HeadlessWebGLRenderer();
    const camera = new PerspectiveCamera();
    const hits = new HullHits();
    const scene = new Scene().add(hits.points);
    for (let i = 0; i < 40; i++) hits.hit(i, i * 10, 0, 0, 1, 1, i);
    hits.tick(50);
    assert.ok(hits.thrownCount > HIT_POOL, 'threw more than the ring holds');
    assert.equal(hits.poolSize, HIT_POOL, 'and the ring never grew');
    gl.render(scene, camera);
    assert.equal(gl.ledger.calls, 1, 'forty hulls hit at once');
    hits.tick(HIT_LIFE_MS + 100);
    gl.render(scene, camera);
    assert.equal(gl.ledger.calls, 0, 'a spent spray costs nothing');
  });

  it('keeps the flash and drops the spray under reduced motion (docs/ui-ux.md §11)', () => {
    const hits = new HullHits();
    hits.setReducedMotion(true);
    hits.hit(1, 0, 0, 0, 1, 1, 0);
    hits.tick(16);
    assert.equal(hits.thrownCount, 0);
    assert.equal(hits.particles, 0);
    assert.equal(hits.count, 1);
    assert.ok(flashes(hits, 16).get(1)! > 0, 'the flash stays');
  });

  it('drops a spray in flight when reduced motion turns on', () => {
    const hits = new HullHits();
    hits.hit(1, 0, 0, 0, 1, 1, 0);
    hits.tick(16);
    hits.setReducedMotion(true);
    hits.tick(32);
    assert.equal(hits.particles, 0);
  });

  it('clears every hit for a new match', () => {
    const hits = new HullHits();
    hits.hit(1, 0, 0, 0, 1, 1, 0);
    hits.reset();
    hits.tick(16);
    assert.equal(hits.count, 0);
    assert.equal(hits.points.visible, false);
  });
});

describe('the conn view on a Damaged', () => {
  const realNow = performance.now;
  const views: PerspectiveView[] = [];
  afterEach(() => {
    performance.now = realNow;
    for (const view of views.splice(0)) view.destroy();
  });

  const probe = () =>
    (
      globalThis as unknown as {
        window: { __perspectiveProbe: () => { hits: number; hitParticles: number } };
      }
    ).window.__perspectiveProbe();

  it('throws one effect for one event, from the server’s own snapshots, and lets it go', () => {
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
    // The canned tick carries a Damaged of its own; this one starts quiet.
    view.applySnapshot({ ...cannedSnapshot(300), selfEvents: [] });
    pumpAnimationFrames();
    assert.equal(probe().hits, 0, 'no event, no effect');

    const struck = cannedSnapshot(301);
    struck.units[0]!.hp -= 40;
    struck.selfEvents = [{ kind: SelfEventKind.Damaged, unitId: struck.units[0]!.id }];
    view.applySnapshot(struck);
    clock += 16;
    pumpAnimationFrames();
    assert.equal(probe().hits, 1);
    assert.ok(probe().hitParticles > HIT_PARTICLES_MIN, 'a blow of 40 HP is more than a scratch');

    // The next tick carries no event: nothing new is thrown.
    view.applySnapshot({ ...cannedSnapshot(302), units: struck.units, selfEvents: [] });
    clock += HIT_LIFE_MS;
    pumpAnimationFrames();
    assert.equal(probe().hits, 0);
    assert.equal(probe().hitParticles, 0);
  });
});
