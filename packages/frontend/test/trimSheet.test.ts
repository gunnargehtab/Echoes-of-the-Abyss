/**
 * A navy's trim sheet is attached at load to the materials a model script
 * tagged for it, and the conn view keeps it through everything it does to
 * a model (docs/art-direction.md "UV layout and trim sheets — SPEC"): the
 * recolour writes the faction's ink into `color` and the sheet into `map`,
 * one shared texture for the navy, never a lamp's; the merge buckets a
 * material's parts under the one material that carries it; and Sorrowgate's
 * laminate patch chains onto a mapped material rather than replacing it, so
 * a Commune hull in the tutorial wears both. The loader cannot decode an
 * image here, so the sheet's texture is made and cached without one, and
 * what is held is ownership, not pixels.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { Faction, TRIM_SHEET, UnitKind } from '@echoes/shared';
import { buildTemplate } from '../src/game/rosterModels.ts';
import { ACTIVE_PALETTE } from '../src/game/palette.ts';
import { TRIM_SHEET_NAMES, trimSheet } from '../src/game/trimSheets.ts';

/** Two plates and a lamp, the plates on one material tagged as a laid-out GLB's is. */
function hull(tag: string): Group {
  const root = new Group();
  const plate = new MeshStandardMaterial({ color: 0x8c8378 });
  plate.name = 'iron_grey';
  plate.userData.trim = tag;
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
  it('filters every sheet at four taps', () => assert.equal(TRIM_SHEET.ANISOTROPY, 4));

  for (const name of ['bathyarch', 'directorate', 'hadron', 'pelagia'])
    it(`ships ${name}, once, as a repeating sRGB texture`, () => {
      assert.ok(TRIM_SHEET_NAMES.includes(name), `sheets: ${TRIM_SHEET_NAMES}`);
      const sheet = trimSheet(name);
      assert.ok(sheet);
      assert.equal(trimSheet(name), sheet, 'a second ask made a second texture');
      assert.equal(sheet.colorSpace, SRGBColorSpace);
      assert.equal(sheet.wrapS, RepeatWrapping);
      // v 0 is the sheet's first row, as the layout and glTF have it.
      assert.equal(sheet.flipY, false);
      // Four taps, so a deck seen edge-on keeps its plates.
      assert.equal(sheet.anisotropy, TRIM_SHEET.ANISOTROPY);
      assert.equal(trimSheet('no-such-navy'), null);
    });

  it('keeps Directorate trim shared across templates and separate from lamps and other navies', () => {
    const key = { unit: UnitKind.LightScout, faction: Faction.Directorate };
    const bare = materialsOf(buildTemplate(hull('no-such-navy'), key).root);
    const first = materialsOf(buildTemplate(hull('directorate'), key).root);
    const second = materialsOf(buildTemplate(hull('directorate'), key).root);
    assert.equal(first.length, bare.length, 'trim added a material bucket');
    first.forEach((m, i) => {
      assert.deepEqual(m.color, bare[i].color, 'trim changed the palette ink');
      assert.deepEqual(m.emissive, bare[i].emissive);
      assert.equal(m.emissiveIntensity, bare[i].emissiveIntensity);
      assert.equal(m.emissiveMap, bare[i].emissiveMap);
      assert.equal(m.map, second[i].map, 'a second template uploaded another sheet');
      assert.equal(m.map, m.name === 'iron_grey' ? trimSheet('directorate') : null);
    });
    assert.notEqual(trimSheet('directorate'), trimSheet('bathyarch'));
    assert.notEqual(trimSheet('hadron'), trimSheet('bathyarch'));
    assert.notEqual(trimSheet('hadron'), trimSheet('directorate'));
    for (const other of ['bathyarch', 'directorate', 'hadron'])
      assert.notEqual(trimSheet('pelagia'), trimSheet(other));
  });

  it('attaches the tagged material to its sheet, under the faction ink, and never a lamp', () => {
    const template = buildTemplate(hull('bathyarch'), {
      unit: UnitKind.Bulwark,
      faction: Faction.Bathyarch,
    });
    const materials = materialsOf(template.root);
    // One draw for the two plates, one for the lamp: the merge kept the bucket.
    assert.equal(materials.length, 2);
    const plate = materials.find((m) => m.name === 'iron_grey');
    const lamp = materials.find((m) => m.name === 'amber_lamp');
    assert.ok(plate && lamp);
    assert.equal(plate.map, trimSheet('bathyarch'), 'the plate did not take the sheet');
    assert.equal(lamp.map, null, 'the lamp took one');
    // Hue is the palette's: the recoloured ink and the primary share a chromaticity.
    const ink = ACTIVE_PALETTE.faction[Faction.Bathyarch].primary;
    const primary = new MeshStandardMaterial({ color: ink }).color;
    const sum = primary.r + primary.g + primary.b;
    const got = plate.color.r + plate.color.g + plate.color.b;
    for (const c of ['r', 'g', 'b'] as const)
      assert.ok(Math.abs(plate.color[c] / got - primary[c] / sum) < 1e-6, `hue ${c}`);
    assert.ok(lamp.emissiveIntensity > 0);
  });

  it('keeps the sheet under the Sorrowgate laminate on a Commune hull', () => {
    const template = buildTemplate(
      hull('pelagia'),
      { unit: UnitKind.Reed, faction: Faction.Pelagia },
      'sorrowgate'
    );
    const plate = materialsOf(template.root).find((m) => m.name === 'iron_grey');
    assert.ok(plate);
    assert.equal(plate.map, trimSheet('pelagia'));
    assert.match(plate.customProgramCacheKey(), /sorrowgate-laminate-1$/);
  });
});
