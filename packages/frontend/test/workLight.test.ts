/**
 * The work-light and cutter sparks under own dredging harvesters (#1555).
 * Agent light, read off the same sources as the silt plume; these tests read
 * the pool and the spark ring the render would.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PointLight } from 'three';
import type { PlumeSource } from '../src/game/siltPlume.ts';
import {
  SPARK_LIFE_MS,
  SPARK_POOL,
  SPARKS_PER_HULL,
  WORK_LIGHT_HOLD_MS,
  WORK_LIGHT_INTENSITY,
  WORK_LIGHT_POOL,
  WorkLights,
} from '../src/game/workLight.ts';

const source = (id: number, strength: number): PlumeSource => ({
  id,
  x: 100 * id,
  y: -400,
  z: 50 * id,
  strength,
});

describe('the pool', () => {
  it('is made once, at zero, and never grows: no shader rebuild on a dredge', () => {
    const lights = new WorkLights();
    const inScene = lights.group.children.filter((o) => o instanceof PointLight);
    assert.equal(inScene.length, WORK_LIGHT_POOL);
    assert.equal(lights.lit, 0);
    const many = Array.from({ length: WORK_LIGHT_POOL + 4 }, (_, i) => source(i + 1, 1));
    lights.sync(many, many.length, 1, 0);
    assert.equal(lights.poolSize, WORK_LIGHT_POOL);
    assert.equal(lights.lit, WORK_LIGHT_POOL);
    assert.equal(
      lights.group.children.filter((o) => o instanceof PointLight).length,
      WORK_LIGHT_POOL
    );
  });

  it('lights the loudest dredges first, at the throttle’s share, and none at rest', () => {
    const lights = new WorkLights();
    const sources = [source(1, 0.4), source(2, 0), source(3, 1), source(4, 0.7)];
    lights.sync(sources, sources.length, 1, 0);
    assert.equal(lights.intensityAt(0), WORK_LIGHT_INTENSITY * 1);
    assert.equal(lights.intensityAt(1), WORK_LIGHT_INTENSITY * 0.7);
    assert.equal(lights.intensityAt(2), WORK_LIGHT_INTENSITY * 0.4);
    const first = lights.group.children.find((o) => o instanceof PointLight) as PointLight;
    assert.deepEqual([first.position.x, first.position.z], [300, 150], 'at the loudest keel');
    lights.sync([source(1, 0)], 1, 1, 100);
    assert.equal(lights.lit, 3, 'held past a tick that read no cut');
    lights.sync([source(1, 0)], 1, 1, 100 + WORK_LIGHT_HOLD_MS + 1);
    assert.equal(lights.lit, 0, 'dark once the hold runs out');
  });

  it('holds through a tick whose cut rounded to nothing, so a dredge never blinks', () => {
    const lights = new WorkLights();
    lights.sync([source(1, 1)], 1, 1, 0);
    // The next tick reads no rise; the light keeps its last strength.
    lights.sync([], 0, 1, 200);
    assert.equal(lights.intensityAt(0), WORK_LIGHT_INTENSITY);
    lights.sync([source(1, 0.5)], 1, 1, 400);
    assert.equal(lights.intensityAt(0), WORK_LIGHT_INTENSITY * 0.5, 'a new reading moves it');
  });

  it('takes the navy’s glow', () => {
    const lights = new WorkLights();
    lights.setPalette(0xf2b233);
    const first = lights.group.children.find((o) => o instanceof PointLight) as PointLight;
    assert.equal(first.color.getHex(), 0xf2b233);
  });
});

describe('the sparks', () => {
  it('are struck at the dredge’s rate, live briefly and go', () => {
    const lights = new WorkLights();
    const s = [source(1, 1)];
    lights.sync(s, 1, 1, 0);
    lights.sync(s, 1, 1, SPARK_LIFE_MS);
    assert.ok(lights.sparks > 0, 'a full dredge throws sparks');
    assert.ok(lights.sparks <= SPARKS_PER_HULL, 'never more than a life’s worth');
    lights.sync([source(1, 0)], 1, 1, SPARK_LIFE_MS * 3 + WORK_LIGHT_HOLD_MS);
    assert.equal(lights.sparks, 0, 'every spark died');
    assert.ok(SPARK_POOL >= WORK_LIGHT_POOL * SPARKS_PER_HULL);
  });

  it('keeps the light and draws no sparks under reduced motion', () => {
    const lights = new WorkLights();
    lights.setReducedMotion(true);
    const s = [source(1, 1)];
    lights.sync(s, 1, 1, 0);
    lights.sync(s, 1, 1, SPARK_LIFE_MS);
    assert.equal(lights.lit, 1);
    assert.equal(lights.sparks, 0);
  });

  it('are gone on reset, lights out', () => {
    const lights = new WorkLights();
    const s = [source(1, 1)];
    lights.sync(s, 1, 1, 0);
    lights.sync(s, 1, 1, SPARK_LIFE_MS / 2);
    lights.reset();
    assert.equal(lights.lit, 0);
    assert.equal(lights.sparks, 0);
  });
});
