/**
 * The manta at the High graphics quality (docs/art-direction.md, "A manta
 * shows its belly"; #1867). What that section promises: High alone stands
 * it, on a template of its own in the world's light; its belly is the
 * brightest of it, at the cladding's register, and its back and its marks
 * darker by the file's own ratio; its skin is one normal a vertex across
 * belly and back, with an edge sharper than the crease left an edge; its
 * wings stroke about the file's pose on the match's clock, the centre body
 * still, and reduced motion holds them. What it looks like is the frames in
 * docs/screenshots/issue-1867.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  BufferGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  ShaderLib,
  Vector3,
  type Group,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { propSpec } from '../src/game/environment.ts';
import { buildTemplate } from '../src/game/environmentModels.ts';
import { takesLifeLight } from '../src/game/lifeLight.ts';
import {
  MANTA_WING_ANCHORS,
  mantaLift,
  mantaUniforms,
  patchMantaWing,
  smoothSkin,
  strokesMantaWing,
} from '../src/game/mantaWing.ts';

const { STROKE, CREASE_DEG } = HIGH_GRAPHICS.LIFE.MANTA;
const SLUG = 'env-rim-manta';

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

const luminance = (m: MeshStandardMaterial): number =>
  0.2126 * m.color.r + 0.7152 * m.color.g + 0.0722 * m.color.b;

describe('the manta at High (#1867)', () => {
  it('is a body of the crater’s life whose wings stroke, and carries no light', () => {
    const spec = propSpec(SLUG)!;
    assert.equal(spec.life, true);
    assert.equal(spec.wing, true);
    assert.equal(spec.glint, undefined);
    assert.equal(spec.worldLight, 'none');
    assert.equal(spec.footprintM, 18);
  });

  it('builds a High template of its own: lit by the world, stroked, its belly the brightest', async () => {
    const spec = propSpec(SLUG)!;
    const scene = await parse(SLUG);
    const low = buildTemplate(scene, spec.footprintM, spec.swayM, 'free-water');
    const high = buildTemplate(scene, spec.footprintM, spec.swayM, 'free-water', 'wing');
    assert.equal(low.manta, undefined);
    assert.ok(high.manta !== undefined);
    assert.equal(high.manta.uniforms.uMantaHalfSpan.value, spec.footprintM / 2);
    assert.equal(high.trianglesPerInstance, spec.triBudget);
    // Two materials: the belly, and everything else.
    const named = (parts: typeof high.parts) =>
      new Map(parts.map((part) => [part.material.name, part.material as MeshStandardMaterial]));
    const lit = named(high.parts);
    assert.deepEqual([...lit.keys()].sort(), ['fish_belly', 'fish_flank']);
    for (const [name, material] of lit) {
      assert.equal(takesLifeLight(material), true, name);
      assert.equal(strokesMantaWing(material), true, name);
      assert.equal(material.emissive.getHex(), 0, `${name} emits`);
    }
    for (const material of named(low.parts).values()) {
      assert.equal(takesLifeLight(material), false);
      assert.equal(strokesMantaWing(material), false);
    }
    // The belly at the cladding's register, the back darker by the file's ratio.
    const belly = luminance(lit.get('fish_belly')!);
    const back = luminance(lit.get('fish_flank')!);
    assert.ok(Math.abs(belly - HIGH_GRAPHICS.LIFE.ALBEDO) < 1e-6);
    assert.ok(back < belly * 0.35, `the back stands at ${(back / belly).toFixed(2)} of the belly`);
  });

  it('smooths the skin across belly and back, and keeps the file’s place for every vertex', async () => {
    const spec = propSpec(SLUG)!;
    const scene = await parse(SLUG);
    const low = buildTemplate(scene, spec.footprintM, spec.swayM, 'free-water');
    const high = buildTemplate(scene, spec.footprintM, spec.swayM, 'free-water', 'wing');
    const part = (template: typeof low, name: string) =>
      template.parts.find((p) => p.material.name === name)!.geometry;
    for (const name of ['fish_belly', 'fish_flank']) {
      assert.deepEqual(
        [...part(high, name).getAttribute('position').array],
        [...part(low, name).getAttribute('position').array],
        `${name}: smoothing moved a vertex`
      );
    }
    // A face of the file has one normal; a smoothed skin has a face whose
    // corners differ, on the belly as on the back.
    const curved = (geometry: BufferGeometry) => {
      const n = geometry.getAttribute('normal');
      let faces = 0;
      for (let i = 0; i + 2 < n.count; i += 3) {
        const a = new Vector3().fromBufferAttribute(n, i);
        if (a.distanceTo(new Vector3().fromBufferAttribute(n, i + 1)) > 1e-3) faces++;
      }
      return faces / (n.count / 3);
    };
    assert.equal(curved(part(low, 'fish_belly')), 0);
    assert.ok(curved(part(high, 'fish_belly')) > 0.8);
    assert.ok(curved(part(high, 'fish_flank')) > 0.5);
    // The belly looks down and the wings are symmetric: no normal of the
    // belly's looks up by more than a thin edge's turn.
    const n = part(high, 'fish_belly').getAttribute('normal');
    for (let i = 0; i < n.count; i++) assert.ok(n.getY(i) < 0.6, `belly normal ${i} looks up`);
  });

  it('shares a normal across two parts at one corner, and leaves a sharp edge sharp', () => {
    // Two parts meeting along x = 0 at 20 degrees, and a third at a right
    // angle to the first along z = 0.
    const tri = (points: number[][]) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new Float32BufferAttribute(points.flat(), 3));
      return geometry;
    };
    const lean = Math.tan((20 * Math.PI) / 180);
    const flat = tri([
      [0, 0, 0],
      [0, 0, 1],
      [1, 0, 0],
    ]);
    const leaning = tri([
      [0, 0, 0],
      [-1, -lean, 0],
      [0, 0, 1],
    ]);
    const wall = tri([
      [0, 0, 0],
      [1, 0, 0],
      [0, -1, 0],
    ]);
    assert.ok(CREASE_DEG > 20 && CREASE_DEG < 90);
    smoothSkin([flat, leaning, wall]);
    const at = (geometry: BufferGeometry, i: number) =>
      new Vector3().fromBufferAttribute(geometry.getAttribute('normal'), i);
    // The shared corner at the origin: the flat part and the leaning one
    // agree, between their two faces, and the wall keeps its own.
    assert.ok(at(flat, 0).distanceTo(at(leaning, 0)) < 1e-6);
    assert.ok(at(flat, 0).x < -0.05 && at(flat, 0).y > 0.9);
    assert.ok(Math.abs(at(wall, 0).z) > 0.999, 'the wall was smoothed into the floor');
    // A corner no other face meets keeps its face's normal.
    assert.ok(at(flat, 2).distanceTo(new Vector3(0, 1, 0)) < 1e-6);
  });

  it('strokes the wings about the file’s pose and holds the centre body still', () => {
    const half = 9;
    const beat = STROKE.PERIOD_S;
    // The body, out to the stroke's root, never moves.
    for (const z of [0, 1, -STROKE.ROOT_M, STROKE.ROOT_M]) {
      for (const t of [0, beat / 4, beat / 2, 5])
        assert.equal(Math.abs(mantaLift(z, half, t, true)), 0);
    }
    // A tip swings LIFT_M either way over a beat, port and starboard together.
    let high = -Infinity;
    let low = Infinity;
    for (let i = 0; i < 700; i++) {
      const t = (i / 700) * beat;
      const lift = mantaLift(half, half, t, true);
      assert.equal(lift, mantaLift(-half, half, t, true));
      high = Math.max(high, lift);
      low = Math.min(low, lift);
    }
    assert.ok(Math.abs(high - STROKE.LIFT_M) < 1e-3 && Math.abs(low + STROKE.LIFT_M) < 1e-3);
    // A wave from the body out: mid-wing crests before the tip does.
    const crest = (z: number) => {
      let best = 0;
      for (let i = 0; i < 700; i++)
        if (
          mantaLift(z, half, (i / 700) * beat, true) > mantaLift(z, half, (best / 700) * beat, true)
        )
          best = i;
      return best;
    };
    assert.ok(crest((half + STROKE.ROOT_M) / 2) < crest(half));
    // The same beat a lap later, and nothing under reduced motion.
    assert.ok(
      Math.abs(mantaLift(half, half, 1.3, true) - mantaLift(half, half, 1.3 + beat, true)) < 1e-9
    );
    for (const t of [0, 1.3, beat / 4]) assert.equal(mantaLift(half, half, t, false), 0);
    // A stroke that reads as a wing's and not a flag's: under a quarter of the reach.
    assert.ok(STROKE.LIFT_M / (half - STROKE.ROOT_M) < 0.3);
  });

  it("finds every anchor it patches in three's own standard program", () => {
    const shader = { vertexShader: ShaderLib.physical.vertexShader };
    for (const anchor of MANTA_WING_ANCHORS)
      assert.ok(shader.vertexShader.includes(anchor), anchor);
    patchMantaWing(shader);
    // The lift is written straight after the anchor, so whatever reads
    // `transformed` after it, the world's light among them, reads the lifted wing.
    assert.match(
      shader.vertexShader,
      /#include <begin_vertex>\s*transformed\.y \+= echoesMantaStroke\( position\.z \)\.x;/
    );
    assert.match(shader.vertexShader, /objectNormal\.z -= echoesMantaStroke\( position\.z \)\.y/);
    // Reduced motion multiplies the stroke away.
    assert.match(shader.vertexShader, /return uMantaMoves \* vec2\( lift, slope \);/);
    for (const value of [STROKE.PERIOD_S, STROKE.LIFT_M, STROKE.ROOT_M, STROKE.POWER, STROKE.LAG]) {
      assert.ok(shader.vertexShader.includes(value.toFixed(6)), `the program lost ${value}`);
    }
    const uniforms = mantaUniforms(9);
    assert.deepEqual(
      [uniforms.uMantaTime.value, uniforms.uMantaMoves.value, uniforms.uMantaHalfSpan.value],
      [0, 1, 9]
    );
  });
});
