/**
 * A drifting jelly as a lantern at the High graphics quality
 * (docs/art-direction.md, "A jelly is a lantern"; #1837). What that section
 * promises: at High the jelly's file is drawn as a lit membrane in a token of
 * its own, adding its light and hiding nothing, and Low's template is the
 * object it always was; its seats, the beads of its strands and the glow
 * round its bell are points of the same light, hung from the lip; its stroke,
 * its strands' sway and its wave of light run on the match's clock, and
 * reduced motion holds all three. What it looks like is the frames in
 * docs/screenshots/issue-1837.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  CustomBlending,
  DoubleSide,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OneFactor,
  ShaderLib,
  Vector3,
  ZeroFactor,
  type Group,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FREE_WATER_HIGH_LIFE, HIGH_GRAPHICS } from '@echoes/shared';
import { propSpec } from '../src/game/environment.ts';
import { buildTemplate } from '../src/game/environmentModels.ts';
import {
  JELLY_MEMBRANE_ANCHORS,
  jellyLightCount,
  jellyMembrane,
  jellyPulse,
  jellyShape,
  jellyStroke,
  jellyUniforms,
  patchJellyMembrane,
  tintJellyMembrane,
  writeJellyLights,
} from '../src/game/jellyLight.ts';
import { JELLY_LANTERN, LIFE_GLINT, PALETTES, setActivePalette } from '../src/game/palette.ts';

const { BELL, STRANDS, HALO, SWIM, PULSE, STAGGER_S } = HIGH_GRAPHICS.LIFE.JELLY;
const { LANTERN } = HIGH_GRAPHICS.LIFE.GLOW;

const parse = async (slug: string): Promise<Group> => {
  const bytes = readFileSync(
    new URL(`../../../docs/concept-art/models/${slug}.glb`, import.meta.url)
  );
  const parsed = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    ''
  );
  return parsed.scene;
};

const SHAPE = { lipY: 1, lipR: 3, crownY: 4 };
const SEATS = [0, 1, 2, 3, 4, 5].map(
  (i) => new Vector3(3 * Math.cos((i * Math.PI) / 3), 1, 3 * Math.sin((i * Math.PI) / 3))
);
type Light = { at: Vector3; sizeM: number; level: number };
const lights = (index: number, timeS: number, moves: boolean): Light[] => {
  const out: Light[] = [];
  writeJellyLights(SHAPE, SEATS, new Matrix4(), index, timeS, moves, (at, sizeM, level) =>
    out.push({ at: at.clone(), sizeM, level })
  );
  return out;
};

describe('a jelly is a lantern (#1837)', () => {
  it('wears its palette’s own token, and follows the palette the player changes to', () => {
    // Limit 3: no family's token and not the fry's, in any palette. How far
    // each stands from a navy, a contact and a neon, as its palette's eye
    // sees them, is palette.test.ts's, where the simulation lives.
    for (const palette of Object.values(PALETTES)) {
      assert.ok(!Object.values(palette.worldLight).includes(palette.lantern));
      assert.notEqual(palette.lantern, LIFE_GLINT);
      assert.notEqual(palette.lantern, palette.fauna);
    }
    assert.equal(new Set(Object.values(PALETTES).map((p) => p.lantern)).size, 4);
    // A membrane is built in the active palette's and re-tinted in another's.
    const material = jellyMembrane('bell', jellyUniforms(SHAPE));
    assert.equal(material.color.getHex(), PALETTES.standard.lantern);
    try {
      setActivePalette('tritanopia');
      assert.equal(JELLY_LANTERN, PALETTES.tritanopia.lantern);
      tintJellyMembrane(material, JELLY_LANTERN);
      assert.equal(material.color.getHex(), PALETTES.tritanopia.lantern);
      assert.equal(
        jellyMembrane('core', jellyUniforms(SHAPE)).color.getHex(),
        PALETTES.tritanopia.lantern
      );
    } finally {
      setActivePalette('standard');
    }
    // And only a membrane: a body's stone is never tinted.
    const stone = new MeshStandardMaterial({ color: 0x112233 });
    tintJellyMembrane(stone, JELLY_LANTERN);
    assert.equal(stone.color.getHex(), 0x112233);
  });

  it('draws the file as a membrane at High and leaves Low’s template alone', async () => {
    const spec = propSpec('env-drift-jelly')!;
    assert.equal(spec.glint, 'lantern');
    const scene = await parse('env-drift-jelly');
    const low = buildTemplate(scene, spec.footprintM, spec.swayM, 'free-water');
    const high = buildTemplate(scene, spec.footprintM, spec.swayM, 'free-water', 'lantern');
    // Low's is stone under the rig, as every prop's: no membrane, no lip.
    assert.equal(low.jelly, undefined);
    for (const part of low.parts) assert.ok(part.material instanceof MeshStandardMaterial);
    // High's is every part a membrane: one bell and its lobes.
    assert.ok(high.jelly !== undefined);
    assert.equal(high.parts.length, low.parts.length);
    assert.deepEqual(high.parts.map((part) => part.material.name).sort(), [
      'jelly_bell',
      'jelly_core',
    ]);
    assert.equal(high.trianglesPerInstance, low.trianglesPerInstance);
    for (const [i, part] of high.parts.entries()) {
      const material = part.material as MeshBasicMaterial;
      assert.ok(material instanceof MeshBasicMaterial);
      assert.equal(material.color.getHex(), PALETTES.standard.lantern);
      // Light that adds and hides nothing, both sides, in the world pass.
      assert.equal(material.blending, CustomBlending);
      assert.deepEqual(
        [material.blendSrc, material.blendDst, material.blendSrcAlpha, material.blendDstAlpha],
        [OneFactor, OneFactor, ZeroFactor, OneFactor]
      );
      assert.equal(material.depthWrite, false);
      assert.equal(material.side, DoubleSide);
      assert.equal(material.forceSinglePass, true, 'one draw for both sides');
      assert.equal(material.toneMapped, false);
      assert.equal(material.fog, true, 'the water takes it with distance');
      assert.equal(material.userData.worldLayer, true);
      // A membrane curves where the file's facets meet: one normal a vertex.
      const smooth = part.geometry.getAttribute('position').count;
      const faceted = low.parts[i]!.geometry.getAttribute('position').count;
      assert.ok(smooth < faceted, `${material.name}: ${smooth} vertices against ${faceted}`);
      assert.ok(part.geometry.getAttribute('normal') !== undefined);
    }
    // The lip is the ring the seats stand on, under the crown and inside the footprint.
    const { shape, uniforms } = high.jelly;
    assert.equal(high.photophores?.length, 6);
    assert.ok(shape.lipY > 0 && shape.lipY < shape.crownY);
    assert.equal(shape.crownY, high.heightM);
    assert.ok(shape.lipR > 1 && shape.lipR <= spec.footprintM / 2 + 1e-6);
    assert.deepEqual(uniforms.uJellyShape.value.toArray(), [shape.lipY, shape.crownY, shape.lipR]);
  });

  it('is a body in the world’s light, not a membrane, when a file marks no seat', () => {
    assert.equal(jellyShape({ heightM: 4 }), null);
    assert.equal(jellyShape({ heightM: 4, photophores: [] }), null);
  });

  it("finds every anchor it patches in three's own basic program", () => {
    const shader = {
      vertexShader: ShaderLib.basic.vertexShader,
      fragmentShader: ShaderLib.basic.fragmentShader,
    };
    for (const anchor of JELLY_MEMBRANE_ANCHORS.vertex)
      assert.ok(shader.vertexShader.includes(anchor), `vertex: ${anchor}`);
    for (const anchor of JELLY_MEMBRANE_ANCHORS.fragment)
      assert.ok(shader.fragmentShader.includes(anchor), `fragment: ${anchor}`);
    patchJellyMembrane(shader);
    // The stroke draws the lip in and leaves the crown, and stops with motion.
    assert.match(shader.vertexShader, /transformed\.xz \*= 1\.0 - [\d.]+ \* uJellyMoves/);
    assert.ok(shader.vertexShader.includes(`gl_InstanceID ) * ${STAGGER_S.toFixed(6)}`));
    // A thin skin: brightest edge-on, and the wave multiplies what it passes.
    assert.ok(shader.fragmentShader.includes('abs( dot( normalize( vJellyN )'));
    assert.match(shader.fragmentShader, /jellyWave = uJellyMoves \* /);
    assert.match(shader.fragmentShader, /diffuseColor\.rgb \*= \( uJellySkin\.x /);
  });

  it('gives the bell its edge, canals and lip, and the lobes a plain light', () => {
    const uniforms = jellyUniforms(SHAPE);
    const skin = (part: 'bell' | 'core') => {
      const shader = {
        uniforms: {} as Record<string, { value: unknown }>,
        vertexShader: ShaderLib.basic.vertexShader,
        fragmentShader: ShaderLib.basic.fragmentShader,
      };
      const material = jellyMembrane(part, uniforms);
      material.onBeforeCompile(shader as never, undefined as never);
      // One clock a template: the layer drives the object the program reads.
      assert.equal(shader.uniforms.uJellyTime, uniforms.uJellyTime);
      assert.equal(shader.uniforms.uJellyMoves, uniforms.uJellyMoves);
      return (shader.uniforms.uJellySkin!.value as { toArray(): number[] }).toArray();
    };
    assert.deepEqual(skin('bell'), [BELL.LEVEL, BELL.RIM, BELL.RIB, BELL.MARGIN]);
    assert.deepEqual(skin('core'), [BELL.CORE, 0, 0, 0]);
  });
});

describe('a jelly’s points of light (#1837)', () => {
  it('hangs one glow, a point a seat and every strand’s beads, from the lip down', () => {
    const all = lights(0, 12, true);
    assert.equal(all.length, jellyLightCount(SEATS.length));
    assert.equal(all.length, 1 + 6 + STRANDS.COUNT * STRANDS.BEADS);
    // The glow in the water round the bell, inside it.
    const [halo, ...rest] = all as [Light, ...Light[]];
    assert.deepEqual([halo.sizeM, halo.level], [HALO.SIZE_M, HALO.LEVEL]);
    assert.ok(halo.at.y > SHAPE.lipY && halo.at.y < SHAPE.crownY);
    // The seats, on the lip.
    for (const seat of rest.slice(0, 6)) {
      assert.equal(seat.sizeM, LANTERN.SIZE_M);
      assert.ok(Math.abs(seat.at.y - SHAPE.lipY) < 1e-9);
    }
    // The beads: under the lip, no longer than the longest strand, inside
    // the lip's ring at their root, smaller and dimmer toward the tip.
    const beads = rest.slice(6);
    for (let k = 0; k < STRANDS.COUNT; k++) {
      const strand = beads.slice(k * STRANDS.BEADS, (k + 1) * STRANDS.BEADS);
      const [root, tip] = [strand[0]!, strand.at(-1)!];
      assert.ok(Math.hypot(root.at.x, root.at.z) <= SHAPE.lipR, 'a strand hangs off the lip');
      assert.ok(tip.at.y < root.at.y && root.at.y < SHAPE.lipY);
      assert.ok(SHAPE.lipY - tip.at.y <= STRANDS.LENGTH_M + 1e-9);
      assert.ok(SHAPE.lipY - tip.at.y >= STRANDS.LENGTH_M * STRANDS.SHORTEST - 1e-9);
      assert.ok(tip.sizeM < root.sizeM && root.sizeM <= STRANDS.SIZE_M);
      for (const bead of strand) {
        assert.ok(bead.level >= 0 && bead.level <= STRANDS.LEVEL * (1 + PULSE.GAIN) + 1e-9);
      }
    }
  });

  it('places every light by its jelly’s own matrix', () => {
    const moved: Vector3[] = [];
    const matrix = new Matrix4().makeTranslation(100, -30, 7);
    writeJellyLights(SHAPE, SEATS, matrix, 0, 12, true, (at) => moved.push(at.clone()));
    const still = lights(0, 12, true);
    for (const [i, at] of moved.entries()) {
      assert.ok(at.distanceTo(still[i]!.at.clone().add(new Vector3(100, -30, 7))) < 1e-9);
    }
  });

  it('draws nothing twice: a sine and a cosine a strand, and at most one exponential a bead', () => {
    // Counted work, not a stopwatch (#1859). The far bloom hangs 120
    // lanterns, 324 beads each, every frame. A bead's place on its strand and
    // a strand's own bearing, length and phase never change, so after a
    // jelly's first frame the writer draws a strand's wave once and hands
    // each bead its turn of it. Written a bead at a time it was 720 sines a
    // jelly a frame, and nine milliseconds of a frame for the river
    // (docs/screenshots/issue-1859/beads.mjs).
    lights(3, 12, true);
    const counted = ['sin', 'cos', 'exp', 'pow'] as const;
    const real = Object.fromEntries(counted.map((name) => [name, Math[name]]));
    const calls: Record<string, number> = { sin: 0, cos: 0, exp: 0, pow: 0 };
    try {
      for (const name of counted) {
        (Math as unknown as Record<string, unknown>)[name] = (...args: number[]) => {
          calls[name]!++;
          return (real[name] as (...a: number[]) => number)(...args);
        };
      }
      lights(3, 12.5, true);
    } finally {
      for (const name of counted) (Math as unknown as Record<string, unknown>)[name] = real[name];
    }
    // The bell's stroke takes one cosine and the wave at the lip one exponential.
    assert.equal(calls.sin, STRANDS.COUNT);
    assert.equal(calls.cos, STRANDS.COUNT + 1);
    assert.ok(calls.exp <= STRANDS.COUNT * STRANDS.BEADS + 1, `${calls.exp} exponentials`);
    assert.equal(calls.pow, 0);
  });

  it('moves on the match’s clock, and holds whole under reduced motion', () => {
    // Moving: a later moment is another frame.
    const [a, b] = [lights(0, 3, true), lights(0, 4.3, true)];
    assert.ok(a.some((light, i) => light.at.distanceTo(b[i]!.at) > 1e-3));
    assert.ok(a.some((light, i) => Math.abs(light.level - b[i]!.level) > 1e-3));
    // Held: no moment differs from another, and no wave is frozen mid-body.
    const [c, d] = [lights(0, 3, false), lights(0, 4.3, false)];
    for (const [i, light] of c.entries()) {
      assert.ok(light.at.distanceTo(d[i]!.at) < 1e-12);
      assert.equal(light.level, d[i]!.level);
    }
    for (const seat of c.slice(1, 7)) assert.equal(seat.level, LANTERN.LEVEL);
    // The same clock for every client: the same moment is the same frame.
    assert.deepEqual(lights(2, 7.5, true), lights(2, 7.5, true));
  });

  it('keeps every pair of the crater’s five out of step, in the stroke, the wave and the sway', () => {
    // "No two are in step" is a claim about every pair, not about neighbours:
    // five clocks a stagger apart fold back onto one another inside a period.
    const jellies = FREE_WATER_HIGH_LIFE.JELLIES.SLOTS.length;
    const apart = (periodS: number): number => {
      let least = Infinity;
      for (let i = 0; i < jellies; i++) {
        for (let j = i + 1; j < jellies; j++) {
          const gap = ((((j - i) * STAGGER_S) % periodS) + periodS) % periodS;
          least = Math.min(least, gap, periodS - gap);
        }
      }
      return least;
    };
    // The wave: two never pass together. One takes its width over its speed to pass a point.
    const passS = PULSE.WIDTH_M / PULSE.SPEED_MPS;
    assert.ok(
      apart(PULSE.PERIOD_S) >= 2 * passS,
      `waves ${apart(PULSE.PERIOD_S).toFixed(2)} s apart`
    );
    // The stroke and the sway: no pair nearer than four fifths of an even spread.
    assert.ok(apart(SWIM.PERIOD_S) >= (0.8 * SWIM.PERIOD_S) / jellies);
    assert.ok(apart(STRANDS.SWAY_PERIOD_S) >= (0.8 * STRANDS.SWAY_PERIOD_S) / jellies);
    // And the functions agree with the arithmetic: any two jellies' strokes differ.
    for (let i = 0; i < jellies; i++) {
      for (let j = i + 1; j < jellies; j++) {
        const differs = [0.4, 1.9, 3.3].some(
          (t) => Math.abs(jellyStroke(t, i, true) - jellyStroke(t, j, true)) > 0.02
        );
        assert.ok(differs, `jellies ${i} and ${j} stroke together`);
      }
    }
  });

  it('strokes and flashes each jelly on its own beat, and neither without motion', () => {
    for (let t = 0; t < 30; t += 0.37) {
      const stroke = jellyStroke(t, 1, true);
      assert.ok(stroke >= 0 && stroke <= 1);
      const pulse = jellyPulse(2, t, 1, true);
      assert.ok(pulse >= 0 && pulse <= 1);
      assert.equal(jellyStroke(t, 1, false), 0);
      assert.equal(jellyPulse(2, t, 1, false), 0);
    }
    // A stroke returns after its period.
    assert.ok(
      Math.abs(jellyStroke(1.2, 0, true) - jellyStroke(1.2 + SWIM.PERIOD_S, 0, true)) < 1e-9
    );
    // The wave runs down the body: where it is whole moves away from the crown.
    const head = (t: number) => {
      let best = 0;
      for (let s = 0; s <= 25; s += 0.05)
        if (jellyPulse(s, t, 0, true) > jellyPulse(best, t, 0, true)) best = s;
      return best;
    };
    const lead = (PULSE.LEAD * PULSE.WIDTH_M) / PULSE.SPEED_MPS;
    assert.ok(Math.abs(head(lead + 1) - PULSE.SPEED_MPS) < 0.06);
    assert.ok(head(lead + 2) > head(lead + 1));
    // And it is gone between two waves: most of a period is the jelly's steady light.
    assert.ok(jellyPulse(5, PULSE.PERIOD_S - 0.5, 0, true) < 1e-3);
  });
});
