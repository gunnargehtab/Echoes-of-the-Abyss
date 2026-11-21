/**
 * The crater's decorative life in the world's light at the High graphics
 * quality (docs/art-direction.md, "Life in the world's light"; #1837). What
 * that section promises: a body draws from a template of its own at High and
 * Low's is the object it always was; the High one stands at the cladding's
 * register and takes the Lid's glow, the pools and an own hull's searchlight,
 * shadowed by the ground and by a hull; a schooling fry carries one light of
 * its own in `life-glint`, drawn in the world pass, never narrower than its
 * floor and cut by the area the floor adds. A drifting jelly is a lantern, in
 * a token of its own: jellyLight.test.ts. What it looks
 * like is the frames in docs/screenshots/issue-1837.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  Box3,
  Color,
  CustomBlending,
  Material,
  MeshStandardMaterial,
  OneFactor,
  PointsMaterial,
  ShaderLib,
  Vector3,
  ZeroFactor,
  type Group,
  type Mesh,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { terrainFor } from '../../backend/src/sim/maps/index.ts';
import { FREE_WATER_SLICE } from '../../backend/src/sim/maps/freeWaterSlice.ts';
import { ENVIRONMENT_PROPS, propSpec } from '../src/game/environment.ts';
import { EnvironmentLayer } from '../src/game/environmentLayer.ts';
import { buildTemplate } from '../src/game/environmentModels.ts';
import {
  LIFE_GLOW_ANCHORS,
  LIFE_GLOW_KIND,
  LifeGlow,
  patchLifeGlow,
} from '../src/game/lifeGlow.ts';
import {
  installLifeLight,
  LIFE_LIGHT_ANCHORS,
  patchLifeLight,
  takesLifeLight,
} from '../src/game/lifeLight.ts';
import { LIFE_GLINT, PALETTES, WORLD_LIGHT } from '../src/game/palette.ts';
import { CLADDING_CEILING } from '../src/game/rosterModels.ts';

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

const LIFE = [
  'env-rim-crab',
  'env-shoal-fry',
  'env-outer-fish',
  'env-deep-fish',
  'env-rim-ray',
  'env-drift-jelly',
  'env-rim-manta',
];

describe('the crater’s life in the world’s light (#1837)', () => {
  it('names the seven decorative bodies as life, and which of them carry a light', () => {
    assert.deepEqual(
      ENVIRONMENT_PROPS.filter((spec) => spec.life === true).map((spec) => spec.slug),
      LIFE
    );
    // A fry carries one point on its axis, a deep fish one on each seat its
    // file marks, and a jelly is a lantern; no other body emits.
    assert.deepEqual(
      ENVIRONMENT_PROPS.filter((spec) => spec.glint !== undefined).map((spec) => [
        spec.slug,
        spec.glint,
      ]),
      [
        ['env-shoal-fry', 'axis'],
        ['env-deep-fish', 'seats'],
        ['env-drift-jelly', 'lantern'],
      ]
    );
  });

  it('builds a body’s High template apart from Low’s, at the cladding’s register', async () => {
    // Every body but the jelly, which is a lantern at High and no lit body
    // (jellyLight.test.ts), and the manta, whose belly has a register of its
    // own (mantaWing.test.ts).
    for (const slug of LIFE.filter(
      (body) => propSpec(body)!.glint !== 'lantern' && propSpec(body)!.wing !== true
    )) {
      const spec = propSpec(slug)!;
      const scene = await parse(slug);
      const low = buildTemplate(scene, spec.footprintM, spec.swayM, 'free-water');
      const high = buildTemplate(scene, spec.footprintM, spec.swayM, 'free-water', true);
      assert.equal(high.trianglesPerInstance, low.trianglesPerInstance);
      assert.equal(high.parts.length, low.parts.length);
      const materials = (parts: typeof low.parts) =>
        parts.map((part) => part.material as MeshStandardMaterial);
      for (const [i, lit] of materials(high.parts).entries()) {
        const was = materials(low.parts)[i]!;
        assert.notEqual(lit, was, `${slug}: the two qualities share a material`);
        assert.equal(takesLifeLight(lit), true, `${slug} at High`);
        assert.equal(takesLifeLight(was), false, `${slug} at Low`);
        // A body's own light is never its skin's: no GLB changed.
        assert.equal(lit.emissive.getHex(), 0);
        assert.equal(was.emissive.getHex(), 0);
        // Another program, so Low's is the one every build before High compiled.
        assert.notEqual(lit.customProgramCacheKey(), was.customProgramCacheKey());
      }
      // Hue and the ratio between a body's materials are the export's; only
      // the register moved, from the props' to the cladding's ceiling.
      const brightest = (parts: typeof low.parts) => Math.max(...materials(parts).map(luminance));
      assert.ok(Math.abs(brightest(low.parts) - 0.06) < 1e-6, `${slug} at Low`);
      assert.ok(
        Math.abs(brightest(high.parts) - HIGH_GRAPHICS.LIFE.ALBEDO) < 1e-6,
        `${slug} at High`
      );
      // No brighter than a vessel's cladding, whatever that ceiling becomes.
      assert.ok(HIGH_GRAPHICS.LIFE.ALBEDO <= CLADDING_CEILING, 'scenery out-reads a vessel');
    }
  });

  it('leaves a standing prop the one template at both qualities', async () => {
    // The layer asks for a High template of a body alone (`PropSpec.life`).
    for (const slug of ['env-kelp-stand', 'env-vent-chimney']) {
      assert.notEqual(propSpec(slug)!.life, true);
    }
  });

  it("finds every anchor it patches in three's own standard program", () => {
    const shader = {
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
    };
    for (const anchor of LIFE_LIGHT_ANCHORS.vertex)
      assert.ok(shader.vertexShader.includes(anchor), `vertex: ${anchor}`);
    for (const anchor of LIFE_LIGHT_ANCHORS.fragment)
      assert.ok(shader.fragmentShader.includes(anchor), `fragment: ${anchor}`);
    patchLifeLight(shader);
    // The Lid's glow and the pools, added to the rig's indirect light and to
    // what a face mirrors, as a hull takes them.
    assert.match(shader.fragmentShader, /irradiance \+= echoesLifeLight\(/);
    assert.match(shader.fragmentShader, /radiance \+= echoesLifeLight\(/);
    assert.match(shader.fragmentShader, /echoesLitIrradiance\( facing, at\.y \)/);
    assert.match(shader.fragmentShader, /at\.y - pool\.a/);
    // A beam, shadowed by the ground and by a hull: a body is outside every
    // hull's capsule, where a hull's own cladding is inside its own.
    assert.match(shader.fragmentShader, /echoesSearchShade\( i, vLifeWorld \)/);
    // An instanced body is lit where its own instance swims.
    assert.match(shader.vertexShader, /lifeAt = instanceMatrix \* lifeAt;/);
    // Colour is never written.
    assert.doesNotMatch(shader.fragmentShader, /diffuseColor[^;]*[lL]ife/);
  });

  it('refuses a material that emits, and chains onto the hook a material already carries', () => {
    const lamp = new MeshStandardMaterial({ emissive: 0x2e8c74 });
    assert.equal(installLifeLight(lamp), false);
    assert.equal(lamp.onBeforeCompile, Material.prototype.onBeforeCompile);

    const skin = new MeshStandardMaterial();
    let earlier = 0;
    skin.onBeforeCompile = () => {
      earlier++;
    };
    skin.customProgramCacheKey = () => 'earlier';
    assert.equal(installLifeLight(skin), true);
    assert.equal(skin.customProgramCacheKey(), 'earlier:life-light-1');
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
    };
    skin.onBeforeCompile(shader as never, null as never);
    assert.equal(earlier, 1, 'the earlier hook did not run');
    // The pools and the beams are a view's: the page's one set of each.
    assert.ok(shader.uniforms.uHullPools);
    assert.ok(shader.uniforms.uSearchCount);
  });
});

describe('a fry’s own light (#1837)', () => {
  it('is a world light in a token of its own, away from every neon', () => {
    const glow = new LifeGlow();
    const material = glow.points.material as PointsMaterial;
    const { LEVEL } = HIGH_GRAPHICS.LIFE.GLOW;
    assert.deepEqual(material.color, new Color(LIFE_GLINT).multiplyScalar(LEVEL));
    // Limit 3: no family's token, and in no palette the fauna colour, a
    // navy's ink or a contact tier's.
    assert.ok(!Object.values(WORLD_LIGHT).includes(LIFE_GLINT));
    for (const palette of Object.values(PALETTES)) {
      assert.notEqual(palette.fauna, LIFE_GLINT);
      for (const navy of Object.values(palette.faction)) {
        assert.ok(![navy.primary, navy.accent, navy.glow].includes(LIFE_GLINT));
      }
      for (const tier of Object.values(palette.tier)) assert.notEqual(tier.color, LIFE_GLINT);
    }
    // The world pass's, and never the canvas's: the view reads this flag.
    assert.equal(glow.points.userData.worldLayer, true);
    // Light adds to light and leaves the target's alpha, which is what the
    // water left of the surface behind.
    assert.equal(material.blending, CustomBlending);
    assert.deepEqual(
      [material.blendSrc, material.blendDst, material.blendSrcAlpha, material.blendDstAlpha],
      [OneFactor, OneFactor, ZeroFactor, OneFactor]
    );
    assert.equal(material.depthWrite, false);
    assert.equal(material.fog, true, 'the water takes it with distance');
    assert.equal(material.sizeAttenuation, false, 'the patch is the whole of its size');
    glow.dispose();
  });

  it("finds every anchor it patches in three's own points program", () => {
    const shader = {
      vertexShader: ShaderLib.points.vertexShader,
      fragmentShader: ShaderLib.points.fragmentShader,
    };
    for (const anchor of LIFE_GLOW_ANCHORS.vertex)
      assert.ok(shader.vertexShader.includes(anchor), `vertex: ${anchor}`);
    for (const anchor of LIFE_GLOW_ANCHORS.fragment)
      assert.ok(shader.fragmentShader.includes(anchor), `fragment: ${anchor}`);
    patchLifeGlow(shader);
    const { SIZE_M, MIN_PX, LIFT_M } = HIGH_GRAPHICS.LIFE.GLOW;
    // A light's own width in metres through the projection, never under the
    // floor, and its own level cut by the area the floor adds.
    assert.ok(shader.vertexShader.includes('float glowPx = aGlow.x * projectionMatrix'));
    assert.ok(shader.vertexShader.includes(`max( glowPx, ${MIN_PX.toFixed(6)} * size )`));
    assert.match(
      shader.vertexShader,
      /vGlowLevel = aGlow\.y \* \( glowPx \* glowPx \) \/ \( gl_PointSize \* gl_PointSize \)/
    );
    // A fry's point is its cloud's own level, and each light is drawn its
    // own lift nearer the eye.
    assert.deepEqual([...LIFE_GLOW_KIND.axis], [SIZE_M, 1, LIFT_M]);
    assert.ok(shader.vertexShader.includes('attribute vec3 aGlow;'));
    assert.ok(shader.vertexShader.includes('1.0 - aGlow.z /'));
    assert.match(shader.fragmentShader, /diffuseColor\.rgb \*= glowFall \* glowFall \* vGlowLevel/);
  });

  it('stands as many lights as it is written, and none when cleared', () => {
    const glow = new LifeGlow();
    assert.equal(glow.points.visible, false);
    glow.write(3, (positions, kinds) => {
      positions.set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      kinds.set([...LIFE_GLOW_KIND.axis, 0.55, 0.5, 0.04, ...LIFE_GLOW_KIND.axis]);
    });
    assert.equal(glow.count, 3);
    assert.equal(glow.points.visible, true);
    assert.equal(glow.points.geometry.drawRange.count, 3);
    assert.equal(glow.points.geometry.getAttribute('position').getY(1), 5);
    // Each light keeps its own width, level and lift, whatever stands
    // beside it.
    const kind = glow.points.geometry.getAttribute('aGlow');
    assert.ok(Math.abs(kind.getX(1) - 0.55) < 1e-6);
    assert.ok(Math.abs(kind.getY(1) - 0.5) < 1e-6);
    assert.ok(Math.abs(kind.getZ(1) - 0.04) < 1e-6);
    assert.ok(Math.abs(kind.getZ(0) - HIGH_GRAPHICS.LIFE.GLOW.LIFT_M) < 1e-6);
    assert.ok(Math.abs(kind.getX(0) - HIGH_GRAPHICS.LIFE.GLOW.SIZE_M) < 1e-6);
    // Fewer bodies keep the buffer and draw fewer.
    const held = glow.points.geometry;
    glow.write(1, (positions) => positions.set([9, 9, 9]));
    assert.equal(glow.points.geometry, held);
    assert.equal(glow.points.geometry.drawRange.count, 1);
    glow.write(0, () => assert.fail('nothing to fill'));
    assert.equal(glow.count, 0);
    assert.equal(glow.points.visible, false);
    glow.dispose();
  });

  it('lifts a deep fish’s seat light clear of its flank and never through its body (#1876)', async () => {
    // docs/art-direction.md, "Life in the world's light": a seat's light is
    // lifted toward the eye by a lift of its own. Read from abeam, off the
    // file: the body's skin on the line through each seat, and its widest
    // point under each seat's disc.
    const scene = await parse('env-deep-fish');
    const spec = propSpec('env-deep-fish')!;
    const template = buildTemplate(scene, spec.footprintM, spec.swayM, 'free-water');
    const [widthM, , liftM] = LIFE_GLOW_KIND.seat;
    scene.updateMatrixWorld(true);
    const body = scene.getObjectByName('body') as Mesh;
    const at = body.geometry.getAttribute('position');
    const index = body.geometry.getIndex();
    const corner = (i: number): Vector3 =>
      new Vector3()
        .fromBufferAttribute(at, index === null ? i : index.getX(i))
        .applyMatrix4(body.matrixWorld);
    const corners = Array.from({ length: index === null ? at.count : index.count }, (_, i) =>
      corner(i)
    );
    // The skin's two crossings of the line abeam through (x, y), port then
    // starboard.
    const skin = (x: number, y: number): [number, number] | null => {
      const zs: number[] = [];
      for (let t = 0; t < corners.length; t += 3) {
        const [a, b, c] = [corners[t]!, corners[t + 1]!, corners[t + 2]!];
        const d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        if (Math.abs(d) < 1e-12) continue;
        const l1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / d;
        const l2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / d;
        const l3 = 1 - l1 - l2;
        if (l1 >= 0 && l2 >= 0 && l3 >= 0) zs.push(l1 * a.z + l2 * b.z + l3 * c.z);
      }
      return zs.length < 2 ? null : [Math.min(...zs), Math.max(...zs)];
    };
    const seats = template.photophores!;
    assert.equal(seats.length, 6);
    // A seat in the template's frame is its facet in the file's, moved: the
    // one move for all six, at the file's own scale.
    const inFile = seats.map((_, i) =>
      new Box3()
        .setFromObject(scene.getObjectByName(`photophore_${String(i + 1).padStart(2, '0')}`)!)
        .getCenter(new Vector3())
    );
    const move = inFile[0]!.clone().sub(seats[0]!);
    inFile.forEach((seat, i) =>
      assert.ok(seat.distanceTo(seats[i]!.clone().add(move)) < 1e-6, `seat ${i + 1} moved alone`)
    );
    for (const [i, seat] of inFile.entries()) {
      const side = Math.sign(seat.z);
      const [port, starboard] = skin(seat.x, seat.y)!;
      // From the far side's eye the light is drawn `liftM` toward it, and is
      // still inside the body there: the body hides the heart of its disc.
      const through = seat.z - side * liftM;
      assert.ok(
        through > port && through < starboard,
        `seat ${i + 1}: lifted ${liftM} m from ${seat.z.toFixed(3)} it stands at ` +
          `${through.toFixed(3)}, outside a body from ${port.toFixed(3)} to ${starboard.toFixed(3)}`
      );
      // From its own side's eye it stands clear of the flank wherever its
      // disc covers the body, so the flank cuts none of it. The skin is read
      // on a grid under the disc: the body's own corners stand too far apart
      // to find its bulge there.
      let bulge = -Infinity;
      let read = 0;
      const STEPS = 8;
      for (let gx = -STEPS; gx <= STEPS; gx++) {
        for (let gy = -STEPS; gy <= STEPS; gy++) {
          const [dx, dy] = [(gx / STEPS) * (widthM / 2), (gy / STEPS) * (widthM / 2)];
          if (Math.hypot(dx, dy) > widthM / 2) continue;
          const under = skin(seat.x + dx, seat.y + dy);
          if (under === null) continue;
          read++;
          bulge = Math.max(bulge, side > 0 ? under[1] : -under[0]);
        }
      }
      assert.ok(read > 100, `seat ${i + 1}: ${read} readings of the skin under its disc`);
      assert.ok(
        side * seat.z + liftM > bulge,
        `seat ${i + 1}: lifted to ${(side * seat.z + liftM).toFixed(3)} m, under a flank at ${bulge.toFixed(3)}`
      );
    }
  });

  it('is in the crater’s layer while the view draws a world pass, and out of it at Low', () => {
    const terrain = terrainFor(FREE_WATER_SLICE).serialize();
    const layer = new EnvironmentLayer('free-water');
    const groundY = () => -132;
    layer.rebuild(terrain, groundY);
    assert.equal(layer.glow.points.parent, null, 'Low draws no light of a body’s');
    layer.setWorldPass(true);
    layer.rebuild(terrain, groundY);
    assert.equal(layer.glow.points.parent, layer.group);
    layer.setWorldPass(false);
    layer.rebuild(terrain, groundY);
    assert.equal(layer.glow.points.parent, null);
    assert.equal(layer.stats().lifeGlints, 0);
    layer.destroy();
  });
});
