/**
 * The sediment haze over a resource field (#1555). Matter the game never
 * reads, under the rules the vent steam keeps: these tests read the buffers
 * and the shader patch the render would, and count its work under gate 6 —
 * one draw, no buffer rewritten by a frame.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ShaderLib, type BufferAttribute, type Material } from 'three';
import { ResourceKind, type ResourceNodeInfo } from '@echoes/shared';
import { fieldRadiusM } from '../src/game/environment.ts';
import {
  FIELD_HAZE_LEVEL,
  FIELD_HAZE_MOTES,
  FIELD_HAZE_SPREAD,
  FieldHaze,
  HAZE_LUMINANCE_CAP,
  hazeSites,
  type HazeSite,
} from '../src/game/fieldHaze.ts';
import { SILT_COLOR } from '../src/game/siltPlume.ts';
import { VENT_PLUME_LEVEL } from '../src/game/ventPlume.ts';
import { readsDisplayVeil, VEIL_SHADE_ATTRIBUTE } from '../src/game/veilShading.ts';

const terrain = { cols: 8, rows: 8, cellM: 250 };
const ground = (xM: number, yM: number) => -500 + xM / 100 + yM / 200;
const fields: ResourceNodeInfo[] = [
  { id: 1, x: 900, y: 900, kind: ResourceKind.Nodule, depth: 600, initialAmount: 3000 },
  { id: 2, x: 1500, y: 1700, kind: ResourceKind.ResonanceCrystal, depth: 2400, initialAmount: 900 },
];
const site = (field: ResourceNodeInfo): HazeSite => ({
  id: field.id,
  xM: field.x,
  yM: field.y,
  radiusM: fieldRadiusM(field),
  groundY: ground,
});

describe('one haze per field on the map', () => {
  it('raises one over every field and none over a field off the grid', () => {
    const sites = hazeSites(fields, terrain, ground);
    assert.deepEqual(
      sites.map((s) => [s.id, s.xM, s.yM, s.radiusM]),
      fields.map((f) => [f.id, f.x, f.y, fieldRadiusM(f)])
    );
    const off = { ...fields[0]!, id: 3, x: -300, y: 400 };
    assert.deepEqual(hazeSites([off], terrain, ground), []);
  });
});

describe('the haze', () => {
  it('rises from the silt inside the field, the same every build', () => {
    const haze = new FieldHaze();
    haze.build(fields.map(site));
    const position = haze.points.geometry.getAttribute('position') as BufferAttribute;
    assert.equal(position.count, fields.length * FIELD_HAZE_MOTES);
    for (let i = 0; i < position.count; i++) {
      const field = fields[Math.floor(i / FIELD_HAZE_MOTES)]!;
      const x = position.getX(i);
      const z = position.getZ(i);
      assert.ok(
        Math.hypot(x - field.x, z - field.y) <= fieldRadiusM(field) * FIELD_HAZE_SPREAD + 1e-6,
        'a mote rose outside its field'
      );
      // Float32 in the buffer, float64 in the ground function: a millimetre apart.
      assert.ok(
        Math.abs(position.getY(i) - ground(x, z)) < 1e-3,
        'every mote starts on the ground'
      );
    }
    const again = new FieldHaze();
    again.build(fields.map(site));
    assert.deepEqual(
      Array.from((again.points.geometry.getAttribute('position') as BufferAttribute).array),
      Array.from(position.array)
    );
    assert.equal(haze.fields, 2);
  });

  it('lifts a mote up its own line and nowhere else (map-visuals §8)', () => {
    const patched = patch(new FieldHaze());
    assert.match(patched.vertexShader, /transformed\.y \+= hazeArc \* aHaze\.y;/);
    assert.doesNotMatch(patched.vertexShader, /transformed\.[xz]/, 'no lateral term');
    for (const hook of ['attribute vec2 aHaze', 'exp( -hazeSwim', 'vColor.rgb *=']) {
      assert.ok(patched.vertexShader.includes(hook), hook);
    }
    assert.ok(patched.fragmentShader.includes('discard'), 'a soft disc, not a square');
  });

  it('is silt, dimmer than a vent puff and of no family or faction', () => {
    const haze = new FieldHaze();
    haze.build([site(fields[0]!)]);
    const color = haze.points.geometry.getAttribute('color') as BufferAttribute;
    assert.ok(FIELD_HAZE_LEVEL < VENT_PLUME_LEVEL, 'quieter than steam');
    // "Suspended matter is not light": capped under the dimmest family,
    // ore-trace at 0.08 (docs/style-neon-noir.md "World light").
    const luminance = 0.2126 * SILT_COLOR.r + 0.7152 * SILT_COLOR.g + 0.0722 * SILT_COLOR.b;
    assert.ok(FIELD_HAZE_LEVEL * luminance < HAZE_LUMINANCE_CAP, 'a haze mote out-shone the ore');
    // Warm grey: red over blue, nothing saturated.
    assert.ok(color.getX(0) > color.getZ(0) && color.getX(0) < 1.5 * color.getZ(0));
    assert.ok(Math.abs(color.getX(0) - SILT_COLOR.r * FIELD_HAZE_LEVEL) < 1e-6);
  });

  it('goes as cold as its ground under the veil, in display terms', () => {
    const haze = new FieldHaze();
    haze.build([site(fields[0]!)]);
    const color = haze.points.geometry.getAttribute('color') as BufferAttribute;
    const veil = haze.points.geometry.getAttribute(VEIL_SHADE_ATTRIBUTE) as BufferAttribute;
    const full = color.getX(0);
    haze.setShade((_x, _y, out) => out.setRGB(0.3, 0.38, 0.62));
    assert.ok(Math.abs(veil.getX(0) - 0.4333333) < 1e-6);
    assert.equal(color.getX(0), full);
    assert.ok(readsDisplayVeil(haze.points.material as Material));
    haze.setShade(null);
    assert.equal(veil.getX(0), 1);
  });
});

describe('the clock', () => {
  it('steps on the 200 ms sonar bucket', () => {
    const haze = new FieldHaze();
    haze.tick(1000);
    assert.equal(haze.clockS, 1);
    haze.tick(1199);
    assert.equal(haze.clockS, 1, 'held within a bucket');
    haze.tick(1200);
    assert.ok(Math.abs(haze.clockS - 1.2) < 1e-9, 'steps at its edge');
  });

  it('holds still under reduced motion', () => {
    const haze = new FieldHaze();
    haze.setReducedMotion(true);
    haze.tick(1000);
    const held = haze.clockS;
    haze.tick(9000);
    assert.equal(haze.clockS, held);
  });
});

function patch(haze: FieldHaze): { vertexShader: string; fragmentShader: string } {
  const shader = {
    uniforms: {},
    vertexShader: ShaderLib.points.vertexShader,
    fragmentShader: ShaderLib.points.fragmentShader,
  };
  const material = haze.points.material as { onBeforeCompile: (s: never, r: never) => void };
  material.onBeforeCompile(shader as never, null as never);
  return shader;
}
