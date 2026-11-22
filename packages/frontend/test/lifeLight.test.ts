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
  Color,
  CustomBlending,
  Material,
  MeshStandardMaterial,
  OneFactor,
  PointsMaterial,
  ShaderLib,
  ZeroFactor,
  type Group,
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
      /vGlowLevel = aGlow\.y \* glowFacing \* \( glowPx \* glowPx \) \/ \( gl_PointSize \* gl_PointSize \)/
    );
    // A fry's point is its cloud's own level.
    assert.deepEqual([...LIFE_GLOW_KIND.axis], [SIZE_M, 1]);
    assert.ok(shader.vertexShader.includes(`1.0 - ${LIFT_M.toFixed(6)} /`));
    // A light with a seat is lit by the way the seat faces the eye (#1876),
    // between the two cosines the constant names; one without faces
    // everywhere.
    const [dark, whole] = HIGH_GRAPHICS.LIFE.GLOW.SEAT.FACE;
    assert.ok(dark >= 0 && whole > dark && whole <= 1);
    assert.ok(shader.vertexShader.includes('attribute vec3 aGlowFace;'));
    assert.ok(shader.vertexShader.includes('if ( dot( aGlowFace, aGlowFace ) > 0.25 )'));
    assert.ok(
      shader.vertexShader.includes(
        `glowFacing = smoothstep( ${dark.toFixed(6)}, ${whole.toFixed(6)}, dot( glowFaceView, normalize( - mvPosition.xyz ) ) );`
      )
    );
    assert.ok(shader.vertexShader.includes('vGlowLevel = aGlow.y * glowFacing * '));
    assert.match(shader.fragmentShader, /diffuseColor\.rgb \*= glowFall \* glowFall \* vGlowLevel/);
  });

  it('stands as many lights as it is written, and none when cleared', () => {
    const glow = new LifeGlow();
    assert.equal(glow.points.visible, false);
    glow.write(3, (positions, kinds) => {
      positions.set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      kinds.set([...LIFE_GLOW_KIND.axis, 0.55, 0.5, ...LIFE_GLOW_KIND.axis]);
    });
    assert.equal(glow.count, 3);
    assert.equal(glow.points.visible, true);
    assert.equal(glow.points.geometry.drawRange.count, 3);
    assert.equal(glow.points.geometry.getAttribute('position').getY(1), 5);
    // Each light keeps its own width and level, whatever stands beside it.
    const kind = glow.points.geometry.getAttribute('aGlow');
    assert.ok(Math.abs(kind.getX(1) - 0.55) < 1e-6);
    assert.ok(Math.abs(kind.getY(1) - 0.5) < 1e-6);
    assert.ok(Math.abs(kind.getX(0) - HIGH_GRAPHICS.LIFE.GLOW.SIZE_M) < 1e-6);
    // A light faces everywhere until its filler says which way its seat
    // does, and a slot forgets a seat it held the frame before.
    const face = glow.points.geometry.getAttribute('aGlowFace');
    assert.deepEqual([...face.array], new Array(9).fill(0));
    glow.write(3, (_positions, _kinds, faces) => {
      assert.deepEqual([...faces.subarray(0, 9)], new Array(9).fill(0));
      faces.set([0, 0, 1], 3);
    });
    assert.deepEqual([...face.array], [0, 0, 0, 0, 0, 1, 0, 0, 0]);
    glow.write(3, () => {});
    assert.deepEqual([...face.array], new Array(9).fill(0));
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

  it('faces each of a deep fish’s seats off its own flank, so the far flank’s is dark (#1876)', async () => {
    // docs/art-direction.md, "Life in the world's light": a seat's light is
    // whole while its seat faces the eye and gone when it is turned from it.
    // The facings are read off the file's facets. From abeam, the bearing the
    // body is thinnest from, each flank's three face the eye on their own
    // side squarely enough to be whole, and are turned from the one on the
    // other side.
    const spec = propSpec('env-deep-fish')!;
    const template = buildTemplate(
      await parse('env-deep-fish'),
      spec.footprintM,
      spec.swayM,
      'free-water'
    );
    const [dark, whole] = HIGH_GRAPHICS.LIFE.GLOW.SEAT.FACE;
    const seats = template.photophores!;
    const facings = template.photophoreFacings!;
    assert.equal(facings.length, seats.length);
    assert.equal(facings.length, 6);
    for (const [i, facing] of facings.entries()) {
      assert.ok(Math.abs(facing.length() - 1) < 1e-6, `seat ${i + 1} faces by a unit vector`);
      const side = Math.sign(seats[i]!.z);
      // The cosine to an eye abeam on a side is the facing's own z, signed.
      assert.ok(
        side * facing.z >= whole,
        `seat ${i + 1} is whole from its own side: ${(side * facing.z).toFixed(3)} under ${whole}`
      );
      assert.ok(
        -side * facing.z <= dark,
        `seat ${i + 1} is dark from the far side: ${(-side * facing.z).toFixed(3)} over ${dark}`
      );
    }
    // No other body's file marks a seat that a light of this cloud stands on.
    const fry = propSpec('env-shoal-fry')!;
    const school = buildTemplate(
      await parse('env-shoal-fry'),
      fry.footprintM,
      fry.swayM,
      'free-water'
    );
    assert.deepEqual(school.photophoreFacings, []);
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
