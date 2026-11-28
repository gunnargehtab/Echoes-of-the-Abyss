/**
 * A comb jelly as eight seams of light at the High graphics quality
 * (docs/art-direction.md, "A comb jelly is eight seams of light"; #1858).
 * What that section promises: at High the comb jelly's file is drawn as a
 * faint membrane in a token of its own, the second hue of the crater's life;
 * the eight comb rows its file marks are the light, as a brighter membrane
 * and as points hung along each row; waves of light run down the rows on the
 * match's clock, and reduced motion holds them. What it looks like is the
 * frames in docs/screenshots/issue-1858.
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
  COMB_MEMBRANE_ANCHORS,
  combLightCount,
  combMembrane,
  combRowLine,
  combUniforms,
  combWave,
  patchCombMembrane,
  writeCombLights,
} from '../src/game/combLight.ts';
import { tintJellyMembrane } from '../src/game/jellyLight.ts';
import { COMB_LIGHT, LIFE_GLINT, PALETTES, setActivePalette } from '../src/game/palette.ts';

const { SKIN, ROWS, HALO, WAVE, STAGGER_S } = HIGH_GRAPHICS.LIFE.COMB;
const { JELLY } = HIGH_GRAPHICS.LIFE;

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

/** A body 5 m tall with eight rows on a 1.5 m circle, each a line from 4.5 m down to 1 m. */
const TOP_M = 5;
const ROW_LINES = Array.from({ length: 8 }, (_, k) => {
  const [x, z] = [1.5 * Math.cos((k * Math.PI) / 4), 1.5 * Math.sin((k * Math.PI) / 4)];
  return combRowLine(
    Array.from({ length: 30 }, (_unused, i) => new Vector3(x, 4.5 - (3.5 * i) / 29, z))
  );
});
type Light = { at: Vector3; sizeM: number; level: number };
const lights = (index: number, timeS: number, moves: boolean): Light[] => {
  const out: Light[] = [];
  writeCombLights(ROW_LINES, TOP_M, new Matrix4(), index, timeS, moves, (at, sizeM, level) =>
    out.push({ at: at.clone(), sizeM, level })
  );
  return out;
};

describe('a comb jelly is eight seams of light (#1858)', () => {
  it('wears its palette’s own token, no lantern’s, and follows the palette the player changes to', () => {
    // Limit 3: no family's token, not the fry's and not the lantern's, in
    // any palette. How far each stands from a navy, a contact, a neon and
    // its own palette's lantern is palette.test.ts's, where the eye lives.
    for (const palette of Object.values(PALETTES)) {
      assert.ok(!Object.values(palette.worldLight).includes(palette.comb));
      assert.notEqual(palette.comb, LIFE_GLINT);
      assert.notEqual(palette.comb, palette.fauna);
      assert.notEqual(palette.comb, palette.lantern);
    }
    const material = combMembrane('skin', combUniforms(TOP_M));
    assert.equal(material.color.getHex(), PALETTES.standard.comb);
    try {
      setActivePalette('tritanopia');
      assert.equal(COMB_LIGHT, PALETTES.tritanopia.comb);
      tintJellyMembrane(material, COMB_LIGHT);
      assert.equal(material.color.getHex(), PALETTES.tritanopia.comb);
      assert.equal(
        combMembrane('rows', combUniforms(TOP_M)).color.getHex(),
        PALETTES.tritanopia.comb
      );
    } finally {
      setActivePalette('standard');
    }
  });

  it('draws the file as a membrane at High, reads its eight rows, and leaves the plain template alone', async () => {
    const spec = propSpec('env-comb-jelly')!;
    assert.equal(spec.glint, 'comb');
    assert.equal(spec.life, true);
    const scene = await parse('env-comb-jelly');
    const plain = buildTemplate(scene, spec.footprintM, spec.swayM, 'free-water');
    const high = buildTemplate(scene, spec.footprintM, spec.swayM, 'free-water', 'comb');
    // The plain template is stone under the rig, as every prop's: no membrane.
    assert.equal(plain.comb, undefined);
    for (const part of plain.parts) assert.ok(part.material instanceof MeshStandardMaterial);
    // High's is every part a membrane: one skin, and the rows' ridges.
    assert.ok(high.comb !== undefined);
    assert.deepEqual(high.parts.map((part) => part.material.name).sort(), [
      'comb_rows',
      'comb_skin',
    ]);
    // Its mouth is a dark band in the rows' material, two triangles: light
    // cannot draw dark, so High leaves it undrawn and uncounted.
    assert.equal(plain.trianglesPerInstance, spec.triBudget);
    assert.equal(high.trianglesPerInstance, plain.trianglesPerInstance - 2);
    for (const part of high.parts) {
      const material = part.material as MeshBasicMaterial;
      assert.ok(material instanceof MeshBasicMaterial);
      assert.equal(material.color.getHex(), PALETTES.standard.comb);
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
      assert.ok(part.geometry.getAttribute('normal') !== undefined);
    }
    // The skin curves where the file's facets meet: one normal a vertex.
    const skin = (t: typeof high) => t.parts.find((p) => /skin|fish_flank/.test(p.material.name))!;
    assert.ok(
      skin(high).geometry.getAttribute('position').count <
        skin(plain).geometry.getAttribute('position').count
    );
    // Eight rows, each `BEADS` points from near the upper pole down, on its
    // own meridian 45 degrees from the next, inside the footprint. No seat.
    assert.equal(high.photophores?.length, 0);
    const rows = high.combRows!;
    assert.equal(rows.length, 8);
    assert.equal(high.comb.uniforms.uCombTop.value, high.heightM);
    assert.ok(high.heightM > spec.footprintM, 'taller than it is wide');
    const bearings: number[] = [];
    for (const row of rows) {
      assert.equal(row.length, ROWS.BEADS);
      for (const [j, bead] of row.entries()) {
        assert.ok(bead.y > 0 && bead.y < high.heightM);
        assert.ok(Math.hypot(bead.x, bead.z) <= spec.footprintM / 2 + 1e-6);
        if (j > 0) assert.ok(bead.y < row[j - 1]!.y, 'a row runs down from the upper pole');
      }
      // A row spans most of the body: its light is a seam and not a patch.
      assert.ok(row[0]!.y - row.at(-1)!.y > high.heightM / 2);
      const mid = row[Math.floor(row.length / 2)]!;
      bearings.push((Math.atan2(mid.z, mid.x) * 180) / Math.PI);
      // And hugs its meridian: every bead within 3 degrees of the row's own bearing.
      for (const bead of row.slice(1, -1)) {
        const off = (Math.atan2(bead.z, bead.x) * 180) / Math.PI - bearings.at(-1)!;
        assert.ok(Math.abs(((off + 540) % 360) - 180) < 3, `a bead ${off} degrees off its row`);
      }
    }
    const round = bearings.map((b) => (b + 360) % 360).sort((a, b) => a - b);
    for (let k = 0; k < 8; k++) {
      const gap = (round[(k + 1) % 8]! - round[k]! + 360) % 360;
      assert.ok(Math.abs(gap - 45) < 1.5, `rows ${gap} degrees apart`);
    }
    // The plain template reads the rows too, and lights none.
    assert.equal(plain.combRows!.length, 8);
  });

  it('is a body in the world’s light, not a membrane, when a file marks no row', async () => {
    // The drift jelly marks seats and no comb row: asked for a comb's
    // template it is a lit body, never a membrane with no seam.
    const jelly = propSpec('env-drift-jelly')!;
    const template = buildTemplate(
      await parse('env-drift-jelly'),
      jelly.footprintM,
      jelly.swayM,
      'free-water',
      'comb'
    );
    assert.equal(template.comb, undefined);
    assert.equal(template.combRows!.length, 0);
    for (const part of template.parts) assert.ok(part.material instanceof MeshStandardMaterial);
  });

  it("finds every anchor it patches in three's own basic program", () => {
    const shader = {
      vertexShader: ShaderLib.basic.vertexShader,
      fragmentShader: ShaderLib.basic.fragmentShader,
    };
    for (const anchor of COMB_MEMBRANE_ANCHORS.vertex)
      assert.ok(shader.vertexShader.includes(anchor), `vertex: ${anchor}`);
    for (const anchor of COMB_MEMBRANE_ANCHORS.fragment)
      assert.ok(shader.fragmentShader.includes(anchor), `fragment: ${anchor}`);
    patchCombMembrane(shader);
    assert.ok(shader.vertexShader.includes(`gl_InstanceID ) * ${STAGGER_S.toFixed(6)}`));
    assert.ok(shader.vertexShader.includes('vCombAlong = uCombTop - position.y;'));
    // A thin skin: brightest edge-on, and a crest multiplies what it passes
    // and stops with motion.
    assert.ok(shader.fragmentShader.includes('abs( dot( normalize( vCombN )'));
    assert.match(shader.fragmentShader, /combCrest = uCombMoves \* pow\(/);
    assert.match(shader.fragmentShader, /diffuseColor\.rgb \*= \( uCombSkin\.x /);
  });

  it('gives the skin a faint edge that keeps still, and the rows the light and the waves', () => {
    const uniforms = combUniforms(TOP_M);
    const read = (part: 'skin' | 'rows') => {
      const shader = {
        uniforms: {} as Record<string, { value: unknown }>,
        vertexShader: ShaderLib.basic.vertexShader,
        fragmentShader: ShaderLib.basic.fragmentShader,
      };
      combMembrane(part, uniforms).onBeforeCompile(shader as never, undefined as never);
      // One clock a template: the layer drives the object the program reads.
      assert.equal(shader.uniforms.uCombTime, uniforms.uCombTime);
      assert.equal(shader.uniforms.uCombMoves, uniforms.uCombMoves);
      assert.equal(shader.uniforms.uCombTop, uniforms.uCombTop);
      return [
        ...(shader.uniforms.uCombSkin!.value as { toArray(): number[] }).toArray(),
        shader.uniforms.uCombGain!.value,
      ];
    };
    assert.deepEqual(read('skin'), [SKIN.LEVEL, SKIN.RIM, 0]);
    assert.deepEqual(read('rows'), [ROWS.LEVEL, 0, WAVE.GAIN]);
    // A dimmer body than a lantern: the skin's level and edge under half the
    // bell's, a bead under a strand's, the glow under the bell's own.
    assert.ok(SKIN.LEVEL <= JELLY.BELL.LEVEL / 2 && SKIN.RIM <= JELLY.BELL.RIM / 2);
    assert.ok(ROWS.BEAD < JELLY.STRANDS.LEVEL && ROWS.SIZE_M < JELLY.STRANDS.SIZE_M);
    assert.ok(HALO.LEVEL < JELLY.HALO.LEVEL && HALO.SIZE_M < JELLY.HALO.SIZE_M);
  });
});

describe('a comb jelly’s points of light (#1858)', () => {
  it('reads a row’s line off its ridge: even beads, upper pole first, half a step in from each end', () => {
    // A ridge drawn as loose plates, unevenly: the line is read by height.
    const ridge = [4.2, 4.5, 3.1, 3.9, 2.2, 1.0, 1.6, 2.9].flatMap((y) => [
      new Vector3(1.48, y, 0.02),
      new Vector3(1.52, y, -0.02),
    ]);
    const line = combRowLine(ridge);
    assert.equal(line.length, ROWS.BEADS);
    const step = 3.5 / ROWS.BEADS;
    for (const [j, bead] of line.entries()) {
      assert.ok(Math.abs(bead.x - 1.5) < 1e-9 && Math.abs(bead.z) < 1e-9);
      assert.ok(Math.abs(bead.y - (4.5 - (j + 0.5) * step)) < 1e-9, `bead ${j} at ${bead.y}`);
    }
    // No ridge, or one with no length, has no line and takes no bead.
    assert.deepEqual(combRowLine([]), []);
    assert.deepEqual(combRowLine([new Vector3(1, 2, 0), new Vector3(1.1, 2, 0)]), []);
  });

  it('hangs one glow and every row’s beads', () => {
    const all = lights(0, 12, true);
    assert.equal(all.length, combLightCount(ROW_LINES));
    assert.equal(all.length, 1 + 8 * ROWS.BEADS);
    // The glow in the water round the body, at its mid-height.
    const [halo, ...beads] = all as [Light, ...Light[]];
    assert.deepEqual([halo.sizeM, halo.level], [HALO.SIZE_M, HALO.LEVEL]);
    assert.deepEqual(halo.at.toArray(), [0, TOP_M / 2, 0]);
    for (const bead of beads) {
      assert.equal(bead.sizeM, ROWS.SIZE_M);
      assert.ok(
        bead.level >= ROWS.BEAD - 1e-12 && bead.level <= ROWS.BEAD * (1 + WAVE.GAIN) + 1e-9
      );
      assert.ok(
        Math.abs(Math.hypot(bead.at.x, bead.at.z) - 1.5) < 1e-9,
        'a bead stands on its row'
      );
    }
  });

  it('places every light by its body’s own matrix', () => {
    const moved: Vector3[] = [];
    const matrix = new Matrix4().makeTranslation(100, -110, 7);
    writeCombLights(ROW_LINES, TOP_M, matrix, 0, 12, true, (at) => moved.push(at.clone()));
    const still = lights(0, 12, true);
    for (const [i, at] of moved.entries()) {
      assert.ok(at.distanceTo(still[i]!.at.clone().add(new Vector3(100, -110, 7))) < 1e-9);
    }
  });

  it('runs its waves down the rows on the match’s clock, and holds them under reduced motion', () => {
    // A crest is whole once a period at any point, and between crests the
    // row is at its resting level.
    for (let t = 0; t < 20; t += 0.31) {
      const crest = combWave(2, t, 1, true);
      assert.ok(crest >= 0 && crest <= 1);
      assert.equal(combWave(2, t, 1, false), 0);
    }
    assert.ok(
      Math.abs(combWave(1.3, 2, 0, true) - combWave(1.3, 2 + WAVE.PERIOD_S, 0, true)) < 1e-9
    );
    assert.ok(
      Math.abs(combWave(1.3, 2, 0, true) - combWave(1.3 + WAVE.LENGTH_M, 2, 0, true)) < 1e-9
    );
    // Down: where a crest stands moves away from the upper pole.
    const crestAt = (t: number) => {
      let best = 0;
      for (let s = 0; s < WAVE.LENGTH_M; s += 0.01)
        if (combWave(s, t, 0, true) > combWave(best, t, 0, true)) best = s;
      return best;
    };
    const speed = WAVE.LENGTH_M / WAVE.PERIOD_S;
    assert.ok(Math.abs(crestAt(1) - speed) < 0.02);
    assert.ok(Math.abs(crestAt(2) - 2 * speed) < 0.02);
    // The beads follow: a later moment is another frame of levels, on beads
    // that stand where they stood.
    const [a, b] = [lights(0, 3, true), lights(0, 4.3, true)];
    assert.ok(a.some((light, i) => Math.abs(light.level - b[i]!.level) > 1e-3));
    for (const [i, light] of a.entries()) assert.ok(light.at.distanceTo(b[i]!.at) < 1e-12);
    // Held: no moment differs from another, and every bead at its resting level.
    const [c, d] = [lights(0, 3, false), lights(0, 4.3, false)];
    assert.deepEqual(c, d);
    for (const bead of c.slice(1)) assert.equal(bead.level, ROWS.BEAD);
    // The same clock for every client: the same moment is the same frame.
    assert.deepEqual(lights(2, 7.5, true), lights(2, 7.5, true));
  });

  it('keeps every pair of the crater’s comb jellies out of step in the wave', () => {
    const bodies = FREE_WATER_HIGH_LIFE.COMBS.SLOTS.length;
    let least = Infinity;
    for (let i = 0; i < bodies; i++) {
      for (let j = i + 1; j < bodies; j++) {
        const gap = ((((j - i) * STAGGER_S) % WAVE.PERIOD_S) + WAVE.PERIOD_S) % WAVE.PERIOD_S;
        least = Math.min(least, gap, WAVE.PERIOD_S - gap);
      }
    }
    // No pair nearer than four fifths of an even spread.
    assert.ok(least >= (0.8 * WAVE.PERIOD_S) / bodies, `waves ${least.toFixed(2)} s apart`);
  });
});
