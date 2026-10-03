/**
 * A trim sheet rides a model's materials as a base-colour map, and the
 * conn view keeps it through everything it does to a model
 * (docs/art-direction.md "UV layout and trim sheets — SPEC"): the recolour
 * writes the faction's ink into `color` and leaves `map` where the loader
 * put it, the merge buckets a material's parts under the one material that
 * carries it, and Sorrowgate's laminate patch chains onto a mapped material
 * rather than replacing it, so a Commune hull in the tutorial wears both.
 * The loader cannot decode an image here (rosterScale.test.mjs strips
 * them), so the sheet is a DataTexture on a built scene, and what is held
 * is ownership, not pixels.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BoxGeometry, DataTexture, Group, Mesh, MeshStandardMaterial, SRGBColorSpace } from 'three';
import { Faction, UnitKind } from '@echoes/shared';
import { buildTemplate } from '../src/game/rosterModels.ts';
import { ACTIVE_PALETTE } from '../src/game/palette.ts';

function sheet(): DataTexture {
  const texture = new DataTexture(new Uint8Array([200, 200, 200, 255]), 1, 1);
  texture.colorSpace = SRGBColorSpace;
  texture.name = 'trim';
  return texture;
}

/** Two plates and a lamp, the plates on one mapped material as a GLB's are. */
function hull(map: DataTexture): Group {
  const root = new Group();
  const plate = new MeshStandardMaterial({ color: 0x8c8378, map });
  plate.name = 'iron_grey';
  const a = new Mesh(new BoxGeometry(60, 10, 30), plate);
  const b = new Mesh(new BoxGeometry(20, 4, 10), plate);
  b.position.y = 7;
  const lamp = new MeshStandardMaterial({ color: 0x1a1408, emissive: 0xf2b233 });
  lamp.name = 'amber_lamp';
  const c = new Mesh(new BoxGeometry(2, 1, 2), lamp);
  c.position.y = 10;
  root.add(a, b, c);
  return root;
}

const materialsOf = (root: Group): MeshStandardMaterial[] => {
  const out: MeshStandardMaterial[] = [];
  root.traverse((o) => {
    if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) out.push(o.material);
  });
  return out;
};

describe('the trim sheet on a roster model', () => {
  it('survives the recolour and the merge, under the faction ink', () => {
    const map = sheet();
    const template = buildTemplate(hull(map), {
      unit: UnitKind.Bulwark,
      faction: Faction.Bathyarch,
    });
    const materials = materialsOf(template.root);
    // One draw for the two plates, one for the lamp: the merge kept the bucket.
    assert.equal(materials.length, 2);
    const plate = materials.find((m) => m.name === 'iron_grey');
    const lamp = materials.find((m) => m.name === 'amber_lamp');
    assert.ok(plate && lamp);
    assert.equal(plate.map, map, 'the plate lost its sheet');
    assert.equal(lamp.map, null, 'the lamp gained one');
    // Hue is the palette's: the recoloured ink and the primary share a chromaticity.
    const ink = ACTIVE_PALETTE.faction[Faction.Bathyarch].primary;
    const primary = new MeshStandardMaterial({ color: ink }).color;
    const sum = primary.r + primary.g + primary.b;
    const got = plate.color.r + plate.color.g + plate.color.b;
    for (const c of ['r', 'g', 'b'] as const)
      assert.ok(Math.abs(plate.color[c] / got - primary[c] / sum) < 1e-6, `hue ${c}`);
    // The emissive is untouched by the sheet: still the glow ink, not the map.
    assert.ok(lamp.emissiveIntensity > 0);
  });

  it('keeps the sheet under the Sorrowgate laminate on a Commune hull', () => {
    const map = sheet();
    const template = buildTemplate(
      hull(map),
      { unit: UnitKind.Bulwark, faction: Faction.Pelagia },
      'sorrowgate'
    );
    const plate = materialsOf(template.root).find((m) => m.name === 'iron_grey');
    assert.ok(plate);
    assert.equal(plate.map, map);
    assert.match(plate.customProgramCacheKey(), /sorrowgate-laminate-1$/);
  });
});
