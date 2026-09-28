import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it } from 'node:test';
import {
  Box3,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  ShaderLib,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Faction, SORROWGATE_LOOK, UnitKind } from '@echoes/shared';
import {
  installGroundSurface,
  installHullSurface,
  lookForMission,
  surfacePixels,
  surfaceTexture,
} from '../src/game/tutorialLook.ts';
import { buildTemplate as hullTemplate } from '../src/game/rosterModels.ts';
import { buildTemplate as propTemplate } from '../src/game/environmentModels.ts';
import { PALETTE_NAMES, setActivePalette } from '../src/game/palette.ts';
import { installSurveyInk, surveyCellClasses, surveyCellTexture } from '../src/game/surveyInk.ts';
import { cannedTerrain } from './support/cannedMatch.ts';

async function parse(slug) {
  const bytes = readFileSync(
    new URL(`../../../docs/concept-art/models/${slug}.glb`, import.meta.url)
  );
  return (
    await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      ''
    )
  ).scene;
}

function compile(material, kind = 'standard') {
  const shader = { ...ShaderLib[kind], uniforms: {} };
  material.onBeforeCompile(shader, {});
  return shader;
}

function meshes(root) {
  const result = [];
  root.traverse((child) => {
    if (child instanceof Mesh) result.push(child);
  });
  return result;
}

afterEach(() => setActivePalette('standard'));

describe('the Sorrowgate surface contract', () => {
  it('selects the mission, never its map or another mission', () => {
    assert.equal(lookForMission('prologue-sorrowgate'), 'sorrowgate');
    for (const id of [undefined, '', 'sorrowgate', 'm1-ultimatum', '?dream-loop=1']) {
      assert.equal(lookForMission(id), 'standard');
    }
  });

  it('owns one deterministic, tileable linear-data texture with a bounded mip chain', () => {
    const a = surfacePixels();
    assert.deepEqual(a, surfacePixels());
    assert.equal(a.byteLength, 65536);
    const size = SORROWGATE_LOOK.TEXTURE_SIZE;
    for (let c = 0; c < 3; c++) {
      const values = a.filter((_, i) => i % 4 === c);
      assert.ok(Math.max(...values) - Math.min(...values) > 100, 'not a flat placeholder');
      for (let i = 0; i < size; i++) {
        assert.ok(Math.abs(a[i * size * 4 + c] - a[(i * size + size - 1) * 4 + c]) < 40);
        assert.ok(Math.abs(a[i * 4 + c] - a[((size - 1) * size + i) * 4 + c]) < 40);
      }
    }
    assert.ok(a.every((v, i) => i % 4 !== 3 || v === 255));
    const texture = surfaceTexture();
    assert.equal(texture, surfaceTexture());
    assert.deepEqual(texture.image.data, a);
    assert.equal(texture.colorSpace, NoColorSpace);
    assert.equal(texture.wrapS, RepeatWrapping);
    assert.equal(texture.wrapT, RepeatWrapping);
    assert.equal(texture.minFilter, LinearMipmapLinearFilter);
    assert.equal(texture.magFilter, LinearFilter);
    assert.equal(texture.generateMipmaps, true);
    assert.equal(texture.anisotropy, 4);
    let bytes = 0;
    for (let edge = size; edge >= 1; edge /= 2) bytes += edge * edge * 4;
    assert.equal(bytes, 87380);
  });

  it('chains existing hooks and keys, fades detail and only darkens diffuse RGB', () => {
    const material = new MeshStandardMaterial();
    let calls = 0;
    material.customProgramCacheKey = () => 'prior';
    material.onBeforeCompile = function (shader) {
      assert.equal(this, material);
      calls++;
      shader.uniforms.prior = { value: 42 };
    };
    installHullSurface(material, Faction.Pelagia, 0.5);
    const shader = compile(material);
    assert.equal(calls, 1);
    assert.equal(material.customProgramCacheKey(), 'prior:sorrowgate-laminate-1');
    assert.equal(shader.uniforms.prior.value, 42);
    assert.equal(shader.uniforms.uSurfaceData.value, surfaceTexture());
    assert.equal(shader.uniforms.uSurfaceMetres.value, 0.5);
    assert.match(shader.vertexShader, /vSurfacePosition = position \* uSurfaceMetres/);
    assert.match(shader.fragmentShader, /smoothstep\(1\.0, 6\.0, surfaceMpp\)/);
    assert.match(shader.fragmentShader, /clamp\([^;]+0\.72, 1\.0\)/);
    assert.match(
      shader.fragmentShader,
      /diffuseColor\.rgb \*= mix\(1\.0, surfaceShade, surfaceFade\)/
    );
    assert.match(shader.fragmentShader, /surfaceGradient \* surfaceFade/);
    assert.match(shader.fragmentShader, /#include <fog_fragment>/);
  });

  it('leaves other factions, sprite fallbacks and lamps unpatched', () => {
    const lamp = new MeshStandardMaterial({ emissive: 0x44aa66, emissiveIntensity: 0.37 });
    for (const [material, faction] of [
      [lamp, Faction.Pelagia],
      [new MeshStandardMaterial(), Faction.Bathyarch],
      [new MeshBasicMaterial(), Faction.Pelagia],
    ]) {
      const hook = material.onBeforeCompile;
      const original = material.toJSON();
      installHullSurface(material, faction, 1);
      assert.equal(material.onBeforeCompile, hook);
      assert.deepEqual(material.toJSON(), original);
    }
  });

  it('shades ground before survey ink without replacing public cell data or fog', () => {
    const terrain = cannedTerrain();
    const material = new MeshBasicMaterial({ vertexColors: true });
    const cells = surveyCellTexture(terrain, surveyCellClasses(terrain));
    installSurveyInk(material, terrain, cells);
    installGroundSurface(material);
    const shader = compile(material, 'basic');
    assert.equal(shader.uniforms.uSurveyCells.value, cells);
    assert.equal(shader.uniforms.uSurfaceData.value, surfaceTexture());
    assert.equal(material.customProgramCacheKey(), 'survey-ink:sorrowgate-ground-1');
    const shade = shader.fragmentShader.indexOf('diffuseColor.rgb *= mix');
    const ink = shader.fragmentShader.indexOf('diffuseColor.rgb = surveyDecode');
    assert.ok(shade > 0 && ink > shade);
    assert.match(shader.fragmentShader, /smoothstep\(3\.0, 18\.0, surfaceMpp\)/);
    assert.match(shader.fragmentShader, /#include <fog_fragment>/);
    assert.match(shader.vertexShader, /#include <color_vertex>/);
    cells.dispose();
    material.dispose();
  });
});

describe('retained source models', () => {
  for (const [slug, unit] of [
    ['light-scout-pelagia', UnitKind.LightScout],
    ['harvester-pelagia', UnitKind.Harvester],
  ]) {
    it(`${slug} keeps geometry, canonical scale, palette and lamp energy in every palette`, async () => {
      const raw = await parse(slug);
      const original = JSON.stringify(raw.toJSON());
      for (const palette of PALETTE_NAMES) {
        setActivePalette(palette);
        const key = { faction: Faction.Pelagia, unit };
        const standard = hullTemplate(raw, key);
        const tutorial = hullTemplate(raw, key, 'sorrowgate');
        for (const field of ['lengthM', 'beamM', 'heightM', 'baseScale', 'groundM']) {
          assert.equal(tutorial[field], standard[field], `${palette}: ${field}`);
        }
        assert.deepEqual(
          new Box3().setFromObject(tutorial.root),
          new Box3().setFromObject(standard.root)
        );
        const a = meshes(standard.root);
        const b = meshes(tutorial.root);
        assert.equal(a.length, b.length);
        let patched = 0;
        let lamps = 0;
        for (let i = 0; i < a.length; i++) {
          for (const attribute of ['position', 'normal']) {
            assert.deepEqual(
              b[i].geometry.getAttribute(attribute).array,
              a[i].geometry.getAttribute(attribute).array
            );
          }
          assert.deepEqual(b[i].geometry.index?.array, a[i].geometry.index?.array);
          const before = a[i].material;
          const after = b[i].material;
          assert.ok(after.color.equals(before.color), `${palette}: hue changed`);
          assert.ok(after.emissive.equals(before.emissive));
          assert.equal(after.emissiveIntensity, before.emissiveIntensity);
          assert.equal(after.roughness, before.roughness);
          if (before.emissive.getHex() !== 0) {
            lamps++;
            assert.equal(after.customProgramCacheKey(), before.customProgramCacheKey());
          } else {
            patched++;
            assert.equal(compile(after).uniforms.uSurfaceMetres.value, tutorial.baseScale);
          }
        }
        assert.ok(patched > 0 && lamps > 0);
      }
      assert.equal(JSON.stringify(raw.toJSON()), original, 'cached source was mutated');
    });
  }

  it('retains prop geometry and licensed light while composing stone with kelp sway', async () => {
    const raw = await parse('env-kelp-cluster');
    const standard = propTemplate(raw, 30, 2);
    const tutorial = propTemplate(raw, 30, 2, 'sorrowgate');
    assert.equal(tutorial.trianglesPerInstance, standard.trianglesPerInstance);
    let patched = 0;
    for (let i = 0; i < tutorial.parts.length; i++) {
      const a = standard.parts[i];
      const b = tutorial.parts[i];
      assert.deepEqual(b.geometry.attributes.position.array, a.geometry.attributes.position.array);
      assert.deepEqual(
        b.geometry.attributes.swayWeight.array,
        a.geometry.attributes.swayWeight.array
      );
      assert.ok(b.material.color.equals(a.material.color));
      assert.ok(b.material.emissive.equals(a.material.emissive));
      assert.equal(b.material.emissiveIntensity, a.material.emissiveIntensity);
      const shader = compile(b.material);
      assert.equal(shader.uniforms.uSwayTime, tutorial.sway.uSwayTime);
      assert.match(shader.vertexShader, /instanceMatrix/);
      if (b.material.emissive.getHex() === 0) {
        patched++;
        assert.equal(shader.uniforms.uSurfaceData.value, surfaceTexture());
        assert.equal(b.material.customProgramCacheKey(), 'env-sway:sorrowgate-stone-1');
      }
    }
    assert.ok(patched > 0);
  });
});
