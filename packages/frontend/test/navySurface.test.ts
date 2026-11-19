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
 *
 * And what the section says of a flank and a fin (#1844): a face that looks
 * abeam reads the second image of a pattern that drew one, and a blade reads
 * in a frame of its own, found from its shape on the High template alone.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  BoxGeometry,
  BufferGeometry,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  Quaternion,
  ShaderLib,
  Texture,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Faction, HIGH_GRAPHICS, UnitKind } from '@echoes/shared';
import { buildTemplate, highVariant, slugFor } from '../src/game/rosterModels.ts';
import { ACTIVE_PALETTE } from '../src/game/palette.ts';
import {
  NAVY_BLADE_ATTRIBUTE,
  NAVY_SURFACE_ANCHORS,
  bladeFrame,
  bladeFrames,
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
const build = (high: boolean, raw = hull()) =>
  materialsOf(buildTemplate(raw, KEY, 'standard', ACTIVE_PALETTE, high).root);

/** The Commune's rule for a blade of its membrane, as the draw wrote it. */
const BLADE = NAVY_SURFACE_SCALES.pelagia!.algae_membrane!.blade!;

/** The distinct frames a template's geometry of one material carries, as "x y z w". */
function framesOf(root: Group, material: string): Set<string> | null {
  let frames: Set<string> | null = null;
  root.traverse((o) => {
    if (!(o instanceof Mesh) || (o.material as Material).name !== material) return;
    const attribute = (o.geometry as BufferGeometry).getAttribute(NAVY_BLADE_ATTRIBUTE);
    if (attribute === undefined) return;
    frames ??= new Set();
    for (let i = 0; i < attribute.count; i++)
      frames.add(
        [attribute.getX(i), attribute.getY(i), attribute.getZ(i), attribute.getW(i)]
          .map((n) => n.toFixed(4))
          .join(' ')
      );
  });
  return frames;
}

const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);
async function committed(unit: UnitKind): Promise<Group> {
  const bytes = readFileSync(new URL(`${slugFor({ unit, faction: Faction.Pelagia })}.glb`, MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return (await new GLTFLoader().parseAsync(buffer, '')).scene;
}

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
      // Only the veined skin draws along v 0, so only it has a second image
      // for a face that looks abeam, read as the first is (#1844).
      const second = material === 'chitin_hull';
      assert.equal(NAVY_SURFACE_NAMES.includes(`pelagia-${material}-abeam`), second, material);
      assert.equal(surface.abeam !== null, second, material);
      assert.equal(surface.scale.abeamMean !== undefined, second, material);
      if (surface.abeam !== null) {
        assert.notEqual(surface.abeam, surface.texture);
        assert.equal(surface.abeam.colorSpace, NoColorSpace);
        assert.equal(surface.abeam.wrapT, RepeatWrapping);
        assert.equal(surface.abeam.flipY, false);
      }
    }
    assert.equal(navySurface('pelagia', 'grown_steel'), null);
    assert.equal(navySurface('bathyarch', 'hull_black'), null);
    assert.ok(hasNavySurface('pelagia'));
    assert.ok(!hasNavySurface('bathyarch'));
  });

  it('asks for a template of its own wherever High draws, whatever the navy', () => {
    // Since #1814 the High template is also what the world pass lights, so a
    // navy with no surface drawn takes one too (test/hullLight.test.ts).
    assert.equal(highVariant('standard', true, true), true);
    assert.equal(highVariant('free-water', true, true), true);
    assert.equal(highVariant('standard', false, true), false);
    // Sorrowgate keeps its laminate, and High does not reach it.
    assert.equal(highVariant('sorrowgate', true, true), false);
    // A contact's model keeps Low's template at High: it casts no shadow
    // and no light (art-direction.md, limit 2; #1814).
    assert.equal(highVariant('standard', true, false), false);
    assert.equal(highVariant('free-water', true, false), false);
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
      assert.equal(
        material.customProgramCacheKey().includes(':navy-surface-2'),
        worn,
        material.name
      );
      // Only the membrane has blades, so only its program reads a part's frame.
      assert.equal(
        material.customProgramCacheKey().includes(':navy-surface-2-blades'),
        material.name === 'algae_membrane',
        material.name
      );
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
    assert.equal(skin.customProgramCacheKey(), 'earlier:navy-surface-2');
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
    // The skin's flank reads its second image, about that image's own mean.
    assert.equal(shader.uniforms.uNavyAbeam!.value, surface.abeam);
    assert.equal(shader.uniforms.uNavyAbeamMean!.value, surface.scale.abeamMean);
    assert.doesNotMatch(shader.vertexShader, /navyBlade/);

    // A surface with one image reads it on all three planes, about one mean.
    const ridge = navySurface('pelagia', 'growth_ridge')!;
    const ring = new MeshStandardMaterial();
    installNavySurface(ring, ridge, 1);
    const ringed = {
      uniforms: {} as Record<string, { value: unknown }>,
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
    };
    ring.onBeforeCompile(ringed as never, null as never);
    assert.equal(ringed.uniforms.uNavyAbeam!.value, ridge.texture);
    assert.equal(ringed.uniforms.uNavyAbeamMean!.value, ridge.scale.mean);
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
    // Each plane's v is what puts the image's v 0 where the section says:
    // the beam from above and from ahead, the height from the side.
    assert.match(shader.fragmentShader, /navyAcross = texture2D\( uNavySurface, navyAt\.yz \)/);
    assert.match(shader.fragmentShader, /navyAbove = texture2D\( uNavySurface, navyAt\.xz \)/);
    // The plane seen from the side is the one whose v 0 is a flank's axis,
    // so it alone reads the image drawn without what runs along v 0 (#1844).
    assert.match(shader.fragmentShader, /navyAbeam = texture2D\( uNavyAbeam, navyAt\.xy \)/);
    assert.equal(shader.fragmentShader.match(/texture2D\( uNavy/g)?.length, 3, 'a fourth tap');
    // No part's frame is read unless the material has blades.
    assert.doesNotMatch(shader.vertexShader, /navyBlade/);
    const bladed = {
      vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader,
    };
    patchNavySurface(bladed, true);
    assert.match(bladed.vertexShader, /attribute vec4 navyBlade;/);
    assert.match(bladed.vertexShader, /vNavyAt = navyTurn\( navyBlade, vNavyAt \);/);
    // A blade costs the fragment stage nothing: the turn is the vertex stage's.
    assert.equal(bladed.fragmentShader, shader.fragmentShader);
    // Colour is never written: hue stays the ink's.
    assert.doesNotMatch(shader.fragmentShader, /diffuseColor[^;]*navy/);
  });

  it('finds a blade by its shape, and gives it a frame along its own length', () => {
    // A fin 20 long, 4 deep and 0.4 through, standing on the back and raked
    // 0.6 rad aft: the model's frame would rule it square to the keel.
    const rake = 0.6;
    const fin = new BoxGeometry(20, 4, 0.4).rotateZ(rake);
    const frame = bladeFrame(fin, BLADE);
    assert.ok(frame);
    const turn = new Quaternion(...frame);
    assert.ok(Math.abs(turn.length() - 1) < 1e-9);
    // Its length lands on the frame's z, its normal on y and its depth on x:
    // the plane seen from above reads it, u across the blade and v along it.
    const along = new Vector3(Math.cos(rake), Math.sin(rake), 0).applyQuaternion(turn);
    const through = new Vector3(0, 0, 1).applyQuaternion(turn);
    const across = new Vector3(-Math.sin(rake), Math.cos(rake), 0).applyQuaternion(turn);
    assert.ok(Math.abs(Math.abs(along.z) - 1) < 1e-6, `along ${along.toArray()}`);
    assert.ok(Math.abs(Math.abs(through.y) - 1) < 1e-6, `through ${through.toArray()}`);
    assert.ok(Math.abs(Math.abs(across.x) - 1) < 1e-6, `across ${across.toArray()}`);
    // One blade has one frame, however its triangles are held or ordered.
    const flat = fin.toNonIndexed();
    assert.deepEqual(bladeFrame(flat, BLADE), frame);
    const frames = bladeFrames(fin, BLADE);
    assert.equal(frames.length, fin.getAttribute('position').count * 4);
    for (let i = 0; i < frames.length; i += 4)
      assert.deepEqual([...frames.subarray(i, i + 4)], [...new Float32Array(frame)]);

    // What is no blade keeps the model's frame, where a ray square to the
    // keel is already root to tip: a vane rooted along its length, a fluke
    // as wide as it is long, a tendril, a pod.
    for (const [name, squat] of [
      ['a trim vane', new BoxGeometry(4.5, 3.3, 0.4)],
      ['a round fluke', new BoxGeometry(10, 10, 0.8)],
      ['a tendril', new BoxGeometry(60, 8, 3.2)],
      ['a pod', new BoxGeometry(9, 9, 9)],
    ] as const) {
      assert.equal(bladeFrame(squat.rotateZ(rake), BLADE), null, name);
      const none = bladeFrames(squat, BLADE);
      assert.deepEqual([...none.subarray(0, 4)], [0, 0, 0, 1], name);
    }
    assert.equal(bladeFrame(new BufferGeometry().setFromPoints([]), BLADE), null);
  });

  it('marks blades on the High template alone, and on the membrane alone', () => {
    const raw = hull();
    const fin = new Mesh(new BoxGeometry(20, 4, 0.4).rotateZ(0.6), materialsOf(raw)[3]!);
    assert.equal((fin.material as Material).name, 'algae_membrane');
    raw.add(fin);
    const low = buildTemplate(raw, KEY, 'standard', ACTIVE_PALETTE, false).root;
    const high = buildTemplate(raw, KEY, 'standard', ACTIVE_PALETTE, true).root;
    // Low's geometry is what it always was: no part of it carries a frame.
    for (const name of [...COMMUNE, 'grown_steel', 'bio_light'])
      assert.equal(framesOf(low, name), null, `Low's ${name}`);
    // At High every part of the membrane carries one, so they still merge
    // into one draw: the fin its own, the squat part the turn that changes
    // nothing. No other material has blades, and none carries a frame.
    const frames = framesOf(high, 'algae_membrane');
    assert.ok(frames);
    assert.equal(frames.size, 2);
    assert.ok(frames.has('0.0000 0.0000 0.0000 1.0000'));
    for (const name of ['chitin_hull', 'growth_ridge', 'spore_pod', 'grown_steel', 'bio_light'])
      assert.equal(framesOf(high, name), null, `High's ${name}`);
    const count = (root: Group) => materialsOf(root).length;
    assert.equal(count(high), count(low), 'a frame split a material into two draws');
  });

  it("finds the Corvette's six fins and none of the Drifter's vanes", async () => {
    // The Corvette's membranes are all leaves, 3.5 to 4.6 depths long: the
    // dorsal blade #1844 names, two pectorals, the keel blade, two flukes.
    const corvette = buildTemplate(
      await committed(UnitKind.Corvette),
      KEY,
      'standard',
      ACTIVE_PALETTE,
      true
    ).root;
    const fins = framesOf(corvette, 'algae_membrane');
    assert.ok(fins);
    assert.equal(fins.size, 6);
    assert.ok(!fins.has('0.0000 0.0000 0.0000 1.0000'));
    // The Drifter's are trim vanes rooted along their length, a round drive
    // fluke and four bay valves: square to the keel is right for each.
    const drifter = buildTemplate(
      await committed(UnitKind.Drifter),
      { unit: UnitKind.Drifter, faction: Faction.Pelagia },
      'standard',
      ACTIVE_PALETTE,
      true
    ).root;
    assert.deepEqual([...framesOf(drifter, 'algae_membrane')!], ['0.0000 0.0000 0.0000 1.0000']);
    // The rule's two neighbours, so a table that moves it says what moved:
    // the Chorister's flukes are 2.49 depths long and blades, the Spinner's
    // 2.24 and not. Each hull's other membranes are squatter still.
    const blades = async (unit: UnitKind) => {
      const key = { unit, faction: Faction.Pelagia };
      const root = buildTemplate(await committed(unit), key, 'standard', ACTIVE_PALETTE, true).root;
      const frames = framesOf(root, 'algae_membrane')!;
      frames.delete('0.0000 0.0000 0.0000 1.0000');
      return frames.size;
    };
    assert.equal(await blades(UnitKind.Chorister), 2);
    assert.equal(await blades(UnitKind.Spinner), 0);
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
