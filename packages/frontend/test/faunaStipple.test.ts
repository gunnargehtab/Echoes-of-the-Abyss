/**
 * Public life as stipple — docs/map-visuals.md §8, Phase 3 of §10 (#867).
 *
 * How the stipple looks is the screenshot gate's, and the review frames are in
 * `docs/screenshots/issue-867/`. What node:test can hold is what §8 promises
 * about it: a field stays inside its true 250 m at its public working depth, it
 * pulses in place and never travels, it is drawn in `FAUNA_COLOR` in all four
 * palettes, and it costs gate 6 one `Points` draw per kind, a fixed dot count
 * per field, and nothing per frame but uniforms.
 */

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { BufferAttribute, Color, ShaderMaterial, Vector3 } from 'three';
import { DRIFT } from '@echoes/shared';
import type { JellyCluster, ShoalTell } from '@echoes/shared';
import {
  BELL_AXIS_REACH_M,
  FaunaStipple,
  JELLY_BELLS_PER_FIELD,
  JELLY_DOTS_PER_FIELD,
  JELLY_PULSE_S,
  PULSE_WRAP_S,
  SHOAL_DOTS,
  SHOAL_FORMED_GAIN,
  SHOAL_FORMED_RADIUS_M,
  SHOAL_PULSE_S,
  SHOAL_SCATTERED_GAIN,
  SHOAL_SCATTERED_RADIUS_M,
  SHOAL_TWINKLE_S,
  type StippleFrame,
} from '../src/game/faunaStipple.ts';
import { PALETTE_NAMES, PALETTES, setActivePalette } from '../src/game/palette.ts';
import { DEPTH_VISUAL_M_PER_M } from '../src/game/perspectiveTerrain.ts';

const JELLIES: JellyCluster[] = [
  { id: 71, x: 1800, y: 2400, depth: 1200 },
  { id: 72, x: 2000, y: 2500, depth: 1250 },
  { id: 73, x: 5200, y: 900, depth: 260 },
];
const SHOALS: ShoalTell[] = [
  { id: 61, x: 2500, y: 3400, depth: 250, scattered: false },
  { id: 62, x: 3300, y: 1400, depth: 300, scattered: true },
];

function frame(now: number, overrides: Partial<StippleFrame> = {}): StippleFrame {
  return {
    now,
    eye: new Vector3(2000, 2000, 6000),
    reachM: 12_000,
    waterDensity: 1,
    projectionScalePx: 990,
    pixelRatio: 1,
    ...overrides,
  };
}

/** A cloud's live dots, read back off its buffers. */
function dots(cloud: FaunaStipple['jellies']): Array<{
  anchor: [number, number, number];
  offset: [number, number, number, number];
  seed: [number, number];
}> {
  const geometry = cloud.points.geometry;
  const anchor = geometry.getAttribute('position') as BufferAttribute;
  const offset = geometry.getAttribute('aDot') as BufferAttribute;
  const seed = geometry.getAttribute('aSeed') as BufferAttribute;
  const out = [];
  for (let i = 0; i < geometry.drawRange.count; i++) {
    out.push({
      anchor: [anchor.getX(i), anchor.getY(i), anchor.getZ(i)] as [number, number, number],
      offset: [offset.getX(i), offset.getY(i), offset.getZ(i), offset.getW(i)] as [
        number,
        number,
        number,
        number,
      ],
      seed: [seed.getX(i), seed.getY(i)] as [number, number],
    });
  }
  return out;
}

function versions(cloud: FaunaStipple['jellies']): number[] {
  const geometry = cloud.points.geometry;
  return ['position', 'aDot', 'aSeed'].map(
    (name) => (geometry.getAttribute(name) as BufferAttribute).version
  );
}

afterEach(() => {
  setActivePalette('standard');
});

describe('fauna stipple: the budget (gate 6)', () => {
  it('draws each kind on one Points, with a fixed dot count per field', () => {
    const stipple = new FaunaStipple();
    try {
      assert.equal(stipple.group.children.length, 2, 'one Points per kind, and no more');
      assert.equal(stipple.jellies.points.visible, false, 'no life, no draw');
      assert.equal(stipple.shoals.points.visible, false);

      stipple.setLife(JELLIES, SHOALS);
      assert.equal(stipple.jellies.dotCount, JELLIES.length * JELLY_DOTS_PER_FIELD);
      assert.equal(stipple.shoals.dotCount, SHOALS.length * SHOAL_DOTS);
      assert.equal(stipple.group.children.length, 2, 'more fields are more dots, not more draws');

      // A colony far larger than any map seeds still lands in the same two.
      const many = Array.from({ length: 40 }, (_, i) => ({
        id: 100 + i,
        x: 400 + i * 150,
        y: 400,
        depth: 1200,
      }));
      stipple.setLife(many, SHOALS);
      assert.equal(stipple.jellies.dotCount, many.length * JELLY_DOTS_PER_FIELD);
      assert.equal(stipple.group.children.length, 2);

      stipple.setLife([], []);
      assert.equal(stipple.jellies.points.visible, false, 'a sea with nothing in it draws nothing');
      assert.equal(stipple.shoals.points.visible, false);
    } finally {
      stipple.dispose();
    }
  });

  it('pulses on the GPU: a frame writes uniforms and never a buffer', () => {
    const stipple = new FaunaStipple();
    try {
      stipple.setLife(JELLIES, SHOALS);
      const jellies = versions(stipple.jellies);
      const shoals = versions(stipple.shoals);
      for (let t = 0; t < 120; t++) stipple.update(frame(t * 16.7));
      assert.deepEqual(versions(stipple.jellies), jellies, 'no field buffer written by a frame');
      assert.deepEqual(versions(stipple.shoals), shoals, 'no shoal buffer written by a frame');
      assert.ok(stipple.jellies.uniforms.uTime.value > 1.5, 'the pulse clock ran');
    } finally {
      stipple.dispose();
    }
  });

  it('rewrites a kind only when its public layer changed', () => {
    const stipple = new FaunaStipple();
    try {
      stipple.setLife(JELLIES, SHOALS);
      const jellies = versions(stipple.jellies);
      const shoals = versions(stipple.shoals);

      // The 5 Hz snapshot hands over fresh arrays every tick; the same sea in
      // them is not a change.
      stipple.setLife(
        JELLIES.map((j) => ({ ...j })),
        SHOALS.map((s) => ({ ...s }))
      );
      assert.deepEqual(versions(stipple.jellies), jellies);
      assert.deepEqual(versions(stipple.shoals), shoals);

      // A shoal scattering rewrites the shoals and leaves the fields alone.
      stipple.setLife(
        JELLIES,
        SHOALS.map((s) => ({ ...s, scattered: true }))
      );
      assert.deepEqual(versions(stipple.jellies), jellies, 'the fields did not change');
      assert.notDeepEqual(versions(stipple.shoals), shoals, 'the scatter is redrawn');

      // A field burned out of the water leaves with its dots.
      stipple.setLife(JELLIES.slice(1), SHOALS);
      assert.equal(stipple.jellies.dotCount, (JELLIES.length - 1) * JELLY_DOTS_PER_FIELD);
    } finally {
      stipple.dispose();
    }
  });
});

describe('fauna stipple: what a field says (§8)', () => {
  it('keeps every dot inside the true 250 m, and the pulse only ever draws in', () => {
    const stipple = new FaunaStipple();
    try {
      stipple.setLife(JELLIES, []);
      const all = dots(stipple.jellies);
      for (let f = 0; f < JELLIES.length; f++) {
        const jelly = JELLIES[f]!;
        for (const dot of all.slice(f * JELLY_DOTS_PER_FIELD, (f + 1) * JELLY_DOTS_PER_FIELD)) {
          const axis = Math.hypot(dot.anchor[0] - jelly.x, dot.anchor[2] - jelly.y);
          assert.ok(axis <= BELL_AXIS_REACH_M + 1e-3, `a bell's axis stands ${axis} m out`);
          const x = dot.anchor[0] + dot.offset[0] - jelly.x;
          const z = dot.anchor[2] + dot.offset[2] - jelly.y;
          assert.ok(
            Math.hypot(x, z) < DRIFT.JELLY_RADIUS_M,
            `field ${jelly.id} puts a dot ${Math.hypot(x, z).toFixed(1)} m out`
          );
        }
      }
      // At rest is the widest a dot ever stands: every term of the pulse on
      // the plan is `1 - squeeze × beat`, a scale about the axis that never
      // exceeds one. The shader is the one place that could break this.
      const shader = (stipple.jellies.points.material as ShaderMaterial).vertexShader;
      assert.match(shader, /float squeeze = mix\( 1\.0 - [\d.]+ \* trail, 1\.0 - [\d.]+ \* beat/);
      assert.match(shader, /aDot\.x \* squeeze, aDot\.y \* stretch, aDot\.z \* squeeze/);
    } finally {
      stipple.dispose();
    }
  });

  it('spreads its bells across the field rather than bunching them', () => {
    const stipple = new FaunaStipple();
    try {
      stipple.setLife([JELLIES[0]!], []);
      const anchors = new Map<string, [number, number]>();
      for (const dot of dots(stipple.jellies)) {
        anchors.set(`${dot.anchor[0]},${dot.anchor[2]}`, [dot.anchor[0], dot.anchor[2]]);
      }
      assert.equal(anchors.size, JELLY_BELLS_PER_FIELD, 'one axis per bell');
      const reach = Math.max(
        ...[...anchors.values()].map(([x, z]) => Math.hypot(x - JELLIES[0]!.x, z - JELLIES[0]!.y))
      );
      assert.ok(reach > BELL_AXIS_REACH_M * 0.8, 'the colony reaches out toward its rim');
    } finally {
      stipple.dispose();
    }
  });

  it('pulses in place: every bell and every shoal averages to an anchor that never moves', () => {
    const stipple = new FaunaStipple();
    try {
      stipple.setLife(JELLIES, SHOALS);
      // Every motion in the shader is a scale about the anchor, one scale per
      // `w` (the body, and each step down a tentacle). Each such group whose
      // offsets average to zero on the plan keeps its centre on the anchor at
      // every phase, so the whole bell does too: it contracts, and goes nowhere.
      for (const cloud of [stipple.jellies, stipple.shoals]) {
        const groups = new Map<string, { x: number; z: number; n: number }>();
        for (const dot of dots(cloud)) {
          const key = `${dot.anchor.join(',')} w=${dot.offset[3]}`;
          const g = groups.get(key) ?? { x: 0, z: 0, n: 0 };
          g.x += dot.offset[0];
          g.z += dot.offset[2];
          g.n++;
          groups.set(key, g);
        }
        for (const [key, g] of groups) {
          assert.ok(
            Math.abs(g.x / g.n) < 1e-3,
            `${cloud.kind} at ${key} leans ${g.x / g.n} m east`
          );
          assert.ok(
            Math.abs(g.z / g.n) < 1e-3,
            `${cloud.kind} at ${key} leans ${g.z / g.n} m north`
          );
        }
      }
      // And nothing in the shader moves a dot but that scale. `world` is
      // written once, as the anchor plus the scaled offset, and it is what
      // reaches `gl_Position`; the clock reaches the three pulse terms and
      // nothing else.
      for (const cloud of [stipple.jellies, stipple.shoals]) {
        const shader = (cloud.points.material as ShaderMaterial).vertexShader;
        assert.match(shader, /vec3 world = position \+ vec3\( aDot\.x \* squeeze/);
        assert.equal(shader.match(/\bworld(\.[xyzw]+)?\s*[-+*/]?=(?!=)/g)?.length, 1);
        assert.equal(shader.match(/\bmvPosition(\.[xyzw]+)?\s*[-+*/]?=(?!=)/g)?.length, 1);
        assert.equal(shader.match(/\bgl_Position(\.[xyzw]+)?\s*[-+*/]?=(?!=)/g)?.length, 1);
        assert.match(shader, /^\s*vec4 mvPosition = modelViewMatrix \* vec4\( world, 1\.0 \);$/m);
        assert.match(shader, /^\s*gl_Position = projectionMatrix \* mvPosition;$/m);
        const clocked = shader.split('\n').filter((line) => line.includes('uTime'));
        const allowed = /^\s*(uniform float uTime;|float (beat|trail|twinkle) = )/;
        for (const line of clocked) {
          assert.match(line, allowed, `the clock reaches more than the pulse: ${line.trim()}`);
        }
      }
    } finally {
      stipple.dispose();
    }
  });

  it('sits at the public working depth', () => {
    const stipple = new FaunaStipple();
    try {
      stipple.setLife(JELLIES, SHOALS);
      const fields = dots(stipple.jellies);
      for (let f = 0; f < JELLIES.length; f++) {
        for (const dot of fields.slice(f * JELLY_DOTS_PER_FIELD, (f + 1) * JELLY_DOTS_PER_FIELD)) {
          const depthM = -dot.anchor[1] / DEPTH_VISUAL_M_PER_M;
          // The published depth, give or take the render-only ±40 m body the
          // bells are drawn with: a thickness in the column, not a band.
          assert.ok(
            Math.abs(depthM - JELLIES[f]!.depth) <= 40 + 1e-6,
            `a bell of field ${JELLIES[f]!.id} hangs at ${depthM.toFixed(0)} m`
          );
        }
      }
      const shoals = dots(stipple.shoals);
      for (let s = 0; s < SHOALS.length; s++) {
        for (const dot of shoals.slice(s * SHOAL_DOTS, (s + 1) * SHOAL_DOTS)) {
          assert.ok(
            Math.abs(-dot.anchor[1] / DEPTH_VISUAL_M_PER_M - SHOALS[s]!.depth) < 1e-3,
            'a shoal is anchored at the depth the server published'
          );
        }
      }
    } finally {
      stipple.dispose();
    }
  });

  it('draws the same colony on every client', () => {
    const a = new FaunaStipple();
    const b = new FaunaStipple();
    try {
      a.setLife(JELLIES, SHOALS);
      b.setLife(JELLIES, SHOALS);
      assert.deepEqual(dots(a.jellies), dots(b.jellies));
      assert.deepEqual(dots(a.shoals), dots(b.shoals));
    } finally {
      a.dispose();
      b.dispose();
    }
  });
});

describe('fauna stipple: what a shoal says (§8)', () => {
  it('flings a scattered shoal wide and dims it; a formed one is one tight glow', () => {
    const stipple = new FaunaStipple();
    try {
      const formed: ShoalTell = { id: 61, x: 2500, y: 3400, depth: 250, scattered: false };
      stipple.setLife([], [formed]);
      const tight = dots(stipple.shoals);
      stipple.setLife([], [{ ...formed, scattered: true }]);
      const wide = dots(stipple.shoals);

      const reach = (cloud: typeof tight): number =>
        Math.max(...cloud.map((d) => Math.hypot(d.offset[0], d.offset[2])));
      const glow = (cloud: typeof tight): number =>
        cloud.reduce((sum, d) => sum + d.seed[1], 0) / cloud.length;

      assert.ok(reach(tight) <= SHOAL_FORMED_RADIUS_M * 1.1, 'a formed shoal holds its water');
      assert.ok(reach(wide) > SHOAL_FORMED_RADIUS_M * 2, 'a scattered one is flung wide');
      assert.ok(reach(wide) <= SHOAL_SCATTERED_RADIUS_M * 1.1);
      assert.ok(
        reach(wide) < DRIFT.LAMPFRY_SCATTER_RADIUS_M,
        'the cloud stays inside the 300 m ring the chart draws'
      );
      assert.ok(glow(wide) < glow(tight), 'and dimmer');
      assert.ok(SHOAL_SCATTERED_GAIN < SHOAL_FORMED_GAIN);
      assert.equal(wide.length, tight.length, 'the same dot cap, formed or scattered');
    } finally {
      stipple.dispose();
    }
  });
});

describe('fauna stipple: colour and motion', () => {
  it('draws in FAUNA_COLOR in all four palettes, read at draw time', () => {
    const stipple = new FaunaStipple();
    try {
      stipple.setLife(JELLIES, SHOALS);
      for (const name of PALETTE_NAMES) {
        setActivePalette(name);
        stipple.update(frame(0));
        const want = new Color(PALETTES[name].fauna);
        for (const cloud of [stipple.jellies, stipple.shoals]) {
          assert.ok(
            cloud.uniforms.uColor.value.equals(want),
            `${cloud.kind} is not the ${name} palette's fauna colour`
          );
        }
      }
    } finally {
      stipple.dispose();
    }
  });

  it('holds the pulse under reduced motion, and keeps the dots', () => {
    const stipple = new FaunaStipple();
    try {
      stipple.setLife(JELLIES, SHOALS);
      stipple.update(frame(0));
      stipple.update(frame(100));
      stipple.setReducedMotion(true);
      const held = stipple.jellies.uniforms.uTime.value;
      for (let t = 2; t < 60; t++) stipple.update(frame(t * 50));
      assert.equal(stipple.jellies.uniforms.uTime.value, held, 'the bells stop breathing');
      assert.equal(stipple.shoals.uniforms.uTime.value, held);
      assert.ok(stipple.jellies.points.visible, 'and the field is still on the chart');

      stipple.setReducedMotion(false);
      stipple.update(frame(3100));
      assert.ok(stipple.jellies.uniforms.uTime.value > held, 'and they resume');
    } finally {
      stipple.dispose();
    }
  });

  it('wraps its clock on a whole number of every period, so nothing skips', () => {
    for (const period of [JELLY_PULSE_S, SHOAL_PULSE_S, SHOAL_TWINKLE_S]) {
      const beats = PULSE_WRAP_S / period;
      assert.ok(
        Math.abs(beats - Math.round(beats)) < 1e-9,
        `${PULSE_WRAP_S} s is ${beats} beats of ${period} s`
      );
    }
  });

  it('only ever reveals as the water is turned down', () => {
    const stipple = new FaunaStipple();
    try {
      stipple.update(frame(0, { waterDensity: 1 }));
      const murky = stipple.jellies.uniforms.uClearness.value;
      stipple.update(frame(16, { waterDensity: 0 }));
      assert.ok(stipple.jellies.uniforms.uClearness.value < murky);
      assert.equal(stipple.jellies.uniforms.uClearness.value, 0, 'no water, no fade');
    } finally {
      stipple.dispose();
    }
  });
});
