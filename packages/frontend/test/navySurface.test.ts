/**
 * A navy material's surface is worn by a hull's cladding at the High
 * graphics quality and nowhere else (docs/art-direction.md, "What is built
 * at High"; #1811). What that section promises: the Low quality's template
 * is built, patched and keyed as it always was; at High each cladding
 * material its navy has a surface drawn for wears it, by the material's own
 * name; a lamp never does, and its light is what it was (gate 3); the ink is
 * what the recolour wrote (gate 4); and a navy's surface is one texture for
 * the page, read as data. The loader cannot decode an image here, so what is
 * held is ownership, not pixels; a frame through run-game holds the program.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BoxGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  ShaderLib,
  Texture,
} from 'three';
import { Faction, HIGH_GRAPHICS, UnitKind } from '@echoes/shared';
import { buildTemplate, surfaceVariant } from '../src/game/rosterModels.ts';
import { ACTIVE_PALETTE } from '../src/game/palette.ts';
import {
  NAVY_SURFACE_ANCHORS,
  installNavySurface,
  navySurfaceUniform,
  patchNavySurface,
} from '../src/game/navySurface.ts';
import { NAVY_SURFACE_NAMES, hasNavySurface, navySurface } from '../src/game/navySurfaces.ts';
import { NAVY_SURFACE_SCALES } from '../src/game/navySurfaces.generated.ts';

const COMMUNE = ['chitin_hull', 'growth_ridge', 'spore_pod', 'algae_membrane'];

/** A hull in the Commune's four clad materials, a fitting of steel and a lamp. */
function hull(): Group {
  const root = new Group();
  const part = (name: string, color: number, emissive = 0x000000) => {
    const material = new MeshStandardMaterial({ color, emissive });
    material.name = name;
    root.add(new Mesh(new BoxGeometry(20, 4, 6), material));
    return material;
  };
  part('chitin_hull', 0x0b241e);
  part('growth_ridge', 0x14382c);
  part('spore_pod', 0xe8f0a3);
  part('algae_membrane', 0x1fa67a);
  part('grown_steel', 0x6a7a74);
  part('bio_light', 0x0b241e, 0x7dff6a);
  return root;
}

const materialsOf = (root: Group): MeshStandardMaterial[] => {
  const out: MeshStandardMaterial[] = [];
  root.traverse((o) => {
    if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) out.push(o.material);
  });
  return out;
};

const KEY = { unit: UnitKind.Corvette, faction: Faction.Pelagia };
const build = (surfaced: boolean, raw = hull()) =>
  materialsOf(buildTemplate(raw, KEY, 'standard', ACTIVE_PALETTE, surfaced).root);

describe("a navy's surface on a roster model", () => {
  it('ships the Commune four, each once, as repeating data', () => {
    assert.deepEqual(Object.keys(NAVY_SURFACE_SCALES.pelagia!).sort(), [...COMMUNE].sort());
    for (const material of COMMUNE) {
      assert.ok(NAVY_SURFACE_NAMES.includes(`pelagia-${material}`), `${NAVY_SURFACE_NAMES}`);
      const surface = navySurface('pelagia', material);
      assert.ok(surface);
      assert.equal(navySurface('pelagia', material), surface, 'a second ask made a second');
      // Slopes and a height, never decoded as colour.
      assert.equal(surface.texture.colorSpace, NoColorSpace);
      assert.equal(surface.texture.wrapS, RepeatWrapping);
      assert.equal(surface.texture.wrapT, RepeatWrapping);
      // v 0 is the image's first row, as the draw has it.
      assert.equal(surface.texture.flipY, false);
      assert.equal(surface.texture.anisotropy, HIGH_GRAPHICS.HULL_SURFACE.ANISOTROPY);
    }
    assert.equal(navySurface('pelagia', 'grown_steel'), null);
    assert.equal(navySurface('bathyarch', 'hull_black'), null);
    assert.ok(hasNavySurface('pelagia'));
    assert.ok(!hasNavySurface('bathyarch'));
  });

  it('asks for a template of its own only where High draws a navy that has one', () => {
    assert.equal(surfaceVariant(KEY, 'standard', true), true);
    assert.equal(surfaceVariant(KEY, 'free-water', true), true);
    assert.equal(surfaceVariant(KEY, 'standard', false), false);
    // Sorrowgate keeps its laminate, and High does not reach it.
    assert.equal(surfaceVariant(KEY, 'sorrowgate', true), false);
    const klaxon = { unit: UnitKind.Corvette, faction: Faction.Bathyarch };
    assert.equal(surfaceVariant(klaxon, 'standard', true), false);
  });

  it("leaves the Low quality's template as it was built before any surface", () => {
    // What every caller before #1811 built: no fifth argument.
    const before = materialsOf(buildTemplate(hull(), KEY, 'standard', ACTIVE_PALETTE).root);
    build(false).forEach((material, i) => {
      // Cladding carries no hook at all on the standard surface; a lamp
      // carries gate 3's, and the same ones either way.
      if (material.emissive.getHex() === 0)
        assert.equal(material.onBeforeCompile, Material.prototype.onBeforeCompile, material.name);
      assert.equal(material.customProgramCacheKey(), before[i]!.customProgramCacheKey());
      assert.doesNotMatch(material.customProgramCacheKey(), /navy-surface/);
      assert.equal(material.userData.navySurface, undefined);
    });
  });

  it('puts each surface on its own cladding at High, and never on a lamp', () => {
    const low = build(false);
    const high = build(true);
    assert.equal(high.length, low.length, 'the surface added a material bucket');
    high.forEach((material, i) => {
      const worn = COMMUNE.includes(material.name);
      assert.equal(
        material.userData.navySurface,
        worn ? `pelagia-${material.name}` : undefined,
        material.name
      );
      assert.equal(/:navy-surface-1$/.test(material.customProgramCacheKey()), worn, material.name);
      // Gate 4: the ink is the recolour's. Gate 3: so is the light.
      assert.deepEqual(material.color, low[i]!.color, `${material.name} changed its ink`);
      assert.deepEqual(material.emissive, low[i]!.emissive);
      assert.equal(material.emissiveIntensity, low[i]!.emissiveIntensity);
      assert.equal(material.map, low[i]!.map);
      assert.equal(material.normalMap, null);
    });
    const lamp = high.find((m) => m.name === 'bio_light');
    const lowLamp = low.find((m) => m.name === 'bio_light');
    assert.ok(lamp && lowLamp && lamp.emissive.getHex() !== 0);
    assert.equal(lamp.customProgramCacheKey(), lowLamp.customProgramCacheKey());
  });

  it('leaves a material that brings a normal map of its own with that one', () => {
    const raw = hull();
    const baked = new Texture();
    for (const material of materialsOf(raw))
      if (material.name === 'chitin_hull') material.normalMap = baked;
    const skin = build(true, raw).find((m) => m.name === 'chitin_hull');
    assert.ok(skin);
    assert.equal(skin.normalMap, baked);
    assert.equal(skin.userData.navySurface, undefined);
  });

  it('refuses a lamp, and chains onto the hook a material already carries', () => {
    const surface = navySurface('pelagia', 'chitin_hull')!;
    const lamp = new MeshStandardMaterial({ emissive: 0x7dff6a });
    assert.equal(installNavySurface(lamp, surface, 1), false);
    assert.equal(lamp.onBeforeCompile, Material.prototype.onBeforeCompile);

    const skin = new MeshStandardMaterial();
    let earlier = 0;
    skin.onBeforeCompile = () => {
      earlier++;
    };
    skin.customProgramCacheKey = () => 'earlier';
    assert.equal(installNavySurface(skin, surface, 2), true);
    assert.equal(skin.customProgramCacheKey(), 'earlier:navy-surface-1');
    const shader = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
    };
    skin.onBeforeCompile(shader as never, null as never);
    assert.equal(earlier, 1, 'the earlier hook did not run');
    assert.equal(shader.uniforms.uNavySurface!.value, surface.texture);
    assert.equal(shader.uniforms.uNavyMetres!.value, 2);
    assert.deepEqual(shader.uniforms.uNavyScale!.value, navySurfaceUniform(surface.scale));
  });

  it("finds every anchor it patches in three's own standard program", () => {
    const shader = {
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
    };
    for (const anchor of NAVY_SURFACE_ANCHORS.vertex)
      assert.ok(shader.vertexShader.includes(anchor), `vertex: ${anchor}`);
    for (const anchor of NAVY_SURFACE_ANCHORS.fragment)
      assert.ok(shader.fragmentShader.includes(anchor), `fragment: ${anchor}`);
    // The normal is leaned after three has settled it, and the indirect
    // light is shaded after three has summed it.
    const settled = shader.fragmentShader.indexOf('#include <normal_fragment_maps>');
    const summed = shader.fragmentShader.indexOf('#include <aomap_fragment>');
    assert.ok(settled < summed);
    patchNavySurface(shader);
    assert.match(shader.vertexShader, /vNavyAt = position \* uNavyMetres;/);
    assert.match(shader.fragmentShader, /normal = normalize\( normal - faceDirection \*/);
    assert.match(shader.fragmentShader, /reflectedLight\.indirectDiffuse \*= navyShade;/);
    // Colour is never written: hue stays the ink's.
    assert.doesNotMatch(shader.fragmentShader, /diffuseColor[^;]*navy/);
  });

  it('reads an image by the scale its draw wrote', () => {
    const scale = { tileM: 16, slope: 1.2, reliefM: 0.14, mean: 0.16 };
    const [tiles, reach, cavity, mean] = navySurfaceUniform(scale);
    assert.equal(tiles, 1 / 16);
    // A channel's full reach, 127 levels of 255, stands for the table's slope.
    assert.ok(Math.abs(reach * (127 / 255) - 1.2 * HIGH_GRAPHICS.HULL_SURFACE.RELIEF) < 1e-12);
    assert.equal(cavity, HIGH_GRAPHICS.HULL_SURFACE.CAVITY);
    assert.equal(mean, 0.16);
  });
});
