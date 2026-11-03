import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshStandardMaterial } from 'three';
import { terrainFor, KELP_LABYRINTH } from '../../backend/src/sim/maps/index.ts';
import { FREE_WATER_SLICE } from '../../backend/src/sim/maps/freeWaterSlice.ts';
import { decorationPose, freeWaterPlacements } from '../src/game/freeWaterDecoration.ts';
import { ENVIRONMENT_PROPS, placeProps, propSpec } from '../src/game/environment.ts';
import { buildTemplate } from '../src/game/environmentModels.ts';
import { DEPTH_VISUAL_M_PER_M } from '../src/game/perspectiveTerrain.ts';
import { Faction, FaunaSpecies, ResolutionTier, UnitKind } from '@echoes/shared';
import { Match } from '../../backend/src/sim/match.ts';
import { spawnFauna, spawnUnit } from '../../backend/src/sim/world.ts';

describe('authored public decoration', () => {
  const ground = () => terrainFor(FREE_WATER_SLICE).serialize();
  it('places every commissioned instance without scatter, scale jitter or truncation', () => {
    const placements = freeWaterPlacements(ground());
    const counts: Record<string, number> = {};
    for (const p of placements) {
      counts[p.slug] = (counts[p.slug] ?? 0) + 1;
      assert.equal(p.scale, 1);
      if (p.motion === undefined) {
        const radius = propSpec(p.slug)!.footprintM / 2;
        assert.ok(p.yM + radius <= 1000 || p.yM - radius >= 1250, 'clearing stays clear');
      }
    }
    assert.deepEqual(counts, {
      'env-kelp-stand': 40,
      'env-kelp-cluster': 16,
      'env-rim-crab': 16,
      'env-shoal-fry': 96,
      'env-outer-fish': 8,
      'env-deep-fish': 8,
    });
    assert.ok(placements.reduce((n, p) => n + propSpec(p.slug)!.triBudget, 0) <= 400000);
    const control = terrainFor(KELP_LABYRINTH).serialize();
    assert.deepEqual(
      placeProps(control),
      placeProps(
        control,
        ENVIRONMENT_PROPS.filter(
          (p) =>
            ![
              'env-kelp-stand',
              'env-rim-crab',
              'env-shoal-fry',
              'env-outer-fish',
              'env-deep-fish',
            ].includes(p.slug)
        )
      )
    );
  });

  it('holds whole loops inside their authored patches and places the body axis at depth', () => {
    for (const p of freeWaterPlacements(ground())) {
      if (p.motion === undefined) continue;
      const m = p.motion;
      const start = decorationPose(p, 0, () => -88);
      const end = decorationPose(p, m.periodS * 1000, () => -88);
      assert.deepEqual(end, start);
      for (let step = 0; step < 100; step++) {
        const pose = decorationPose(p, m.periodS * 10 * step, () => -88);
        assert.ok(Math.hypot(pose.x - p.xM, pose.z - p.yM) <= m.radiusM + 1e-8);
        if (m.depthM !== null) {
          const bodyDepth = -(pose.y + m.axisM) / DEPTH_VISUAL_M_PER_M;
          assert.ok(Math.abs(bodyDepth - m.depthM) <= m.depthSwingM + 1e-8);
        } else assert.equal(pose.y, -88);
      }
    }
  });

  it('a public delta invalidates only placements whose envelopes touch its cells', () => {
    const terrain = ground();
    const before = freeWaterPlacements(terrain, true);
    terrain.ceiling[2 * 16 + 4] = 3000;
    const after = freeWaterPlacements(terrain, true);
    assert.equal(before.length, after.length);
    let removed = 0;
    after.forEach((p, i) => {
      if (p.disabled === true) {
        removed++;
        assert.equal(p.cellIndex, 2 * 16 + 4);
      } else assert.deepEqual(p, before[i]);
    });
    assert.equal(removed, 2);
  });

  it('is byte-identical with hidden opposition and a server-only Hollow', () => {
    const baseline = new Match(FREE_WATER_SLICE, { fauna: false, seed: 1713 });
    const variant = new Match(FREE_WATER_SLICE, { fauna: false, seed: 1713 });
    try {
      baseline.addPlayer(0, Faction.Pelagia);
      variant.addPlayer(0, Faction.Pelagia);
      variant.addPlayer(1, Faction.Directorate);
      spawnUnit(variant.world, {
        kind: UnitKind.LightScout,
        slot: 1,
        faction: Faction.Directorate,
        x: 2375,
        y: 2375,
        depth: 2000,
      });
      spawnFauna(variant.world, { species: FaunaSpecies.Hollow, x: 2375, y: 2125, depth: 2000 });
      for (let i = 0; i < 120; i++) {
        baseline.update(1000 / 60);
        const snapshots = variant.update(1000 / 60);
        if (snapshots !== null) {
          assert.equal(snapshots.get(0)!.units.length, 3);
          for (const contact of snapshots.get(0)!.contacts) {
            assert.ok(contact.tier < ResolutionTier.Classification);
            assert.equal(contact.fauna, undefined);
            assert.equal(contact.kind, undefined);
          }
          assert.equal(snapshots.get(1)!.units.length, 1, 'only the deep observer is seated');
        }
      }
      const read = (match: Match) =>
        freeWaterPlacements(match.world.terrain.serialize()).map((p) => ({
          ...p,
          pose: decorationPose(p, 2000, () => -88),
        }));
      assert.equal(JSON.stringify(read(baseline)), JSON.stringify(read(variant)));
    } finally {
      baseline.dispose();
      variant.dispose();
    }
  });

  it('loads the approved bodies without emission and preserves six named photophore seats', async () => {
    for (const slug of [
      'env-kelp-stand',
      'env-rim-crab',
      'env-shoal-fry',
      'env-outer-fish',
      'env-deep-fish',
    ]) {
      const bytes = readFileSync(
        new URL(`../../../docs/concept-art/models/${slug}.glb`, import.meta.url)
      );
      const parsed = await new GLTFLoader().parseAsync(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        ''
      );
      const spec = propSpec(slug)!;
      const template = buildTemplate(parsed.scene, spec.footprintM, spec.swayM, 'free-water');
      assert.equal(template.trianglesPerInstance, spec.triBudget);
      for (const { material } of template.parts) {
        assert.ok(material instanceof MeshStandardMaterial);
        if (spec.worldLight === 'none') assert.equal(material.emissive.getHex(), 0);
      }
      assert.equal(template.photophores!.length, slug === 'env-deep-fish' ? 6 : 0);
      if (slug === 'env-deep-fish') {
        assert.equal(new Set(template.photophores!.map((p) => p.toArray().join(','))).size, 6);
        assert.equal(template.photophores!.filter((p) => p.z > 0).length, 3);
        assert.equal(template.photophores!.filter((p) => p.z < 0).length, 3);
      }
    }
  });
});
