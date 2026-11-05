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
import {
  DEPTH_VISUAL_M_PER_M,
  rockTopDepthM,
  seabedDepthAtM,
} from '../src/game/perspectiveTerrain.ts';
import { seabedSeed } from '../src/game/seabed.ts';
import { Biome, Faction, FaunaSpecies, ResolutionTier, UnitKind } from '@echoes/shared';
import { Match } from '../../backend/src/sim/match.ts';
import { spawnFauna, spawnUnit } from '../../backend/src/sim/world.ts';

describe('authored public decoration', () => {
  const ground = () => terrainFor(FREE_WATER_SLICE).serialize();
  it('places every commissioned instance without scatter, scale jitter or truncation', () => {
    const placements = freeWaterPlacements(ground());
    const counts: Record<string, number> = {};
    const plants = placements.filter((p) => p.motion === undefined);
    for (const p of placements) {
      counts[p.slug] = (counts[p.slug] ?? 0) + 1;
      assert.equal(p.scale, 1);
      if (p.motion === undefined) {
        // §3: bounds, not origins, stay out of the clearing, swaying tips included.
        const { footprintM, swayM } = propSpec(p.slug)!;
        const reach = footprintM / 2 + swayM;
        assert.ok(p.yM + reach <= 1000 || p.yM - reach >= 1250, 'clearing stays clear');
        // §5: each slot leaves the plan envelope wholly inside its 250 m cell.
        const cellX = Math.floor(p.xM / 250) * 250;
        const cellY = Math.floor(p.yM / 250) * 250;
        assert.ok(p.xM - footprintM / 2 >= cellX && p.xM + footprintM / 2 <= cellX + 250);
        assert.ok(p.yM - footprintM / 2 >= cellY && p.yM + footprintM / 2 <= cellY + 250);
      }
    }
    // §5: a longer list buys clearance, so no two plan envelopes overlap.
    for (const a of plants) {
      for (const b of plants) {
        if (a === b) continue;
        const apart = (propSpec(a.slug)!.footprintM + propSpec(b.slug)!.footprintM) / 2;
        assert.ok(Math.hypot(a.xM - b.xM, a.yM - b.yM) >= apart - 1e-8, `${a.slug} overlaps`);
      }
    }
    // §5: a stand's whole envelope lies where every surrounding cell centre is
    // the garden's 400 m tread, so the view's interpolation never puts a ramp
    // under it; and the rendered floor, eroded, stays within a stand's height
    // of its root across the envelope.
    const terrain = ground();
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    const stands = plants.filter((p) => p.slug === 'env-kelp-stand');
    for (const p of stands) {
      const half = propSpec(p.slug)!.footprintM / 2;
      for (const x of [p.xM - half, p.xM + half]) {
        for (const y of [p.yM - half, p.yM + half]) {
          for (const col of [Math.floor(x / 250 - 0.5), Math.ceil(x / 250 - 0.5)]) {
            for (const row of [Math.floor(y / 250 - 0.5), Math.ceil(y / 250 - 0.5)]) {
              const i = row * terrain.cols + col;
              assert.equal(terrain.floor[i], 400, `${p.xM},${p.yM} reaches a ramp`);
              assert.equal(terrain.biomes[i], Biome.KelpForest);
            }
          }
        }
      }
      const root = seabedDepthAtM(terrain, seed, rockTop, p.xM, p.yM, true);
      for (let a = 0; a < 32; a++) {
        for (const f of [0.5, 1]) {
          const x = p.xM + Math.cos((a * Math.PI) / 16) * half * f;
          const y = p.yM + Math.sin((a * Math.PI) / 16) * half * f;
          const floor = seabedDepthAtM(terrain, seed, rockTop, x, y, true);
          assert.ok(
            Math.abs(floor - root) <= 40,
            `${p.xM},${p.yM}: floor ${floor} from root ${root}`
          );
        }
      }
    }
    // §9: three rows north of the clearing and one south, each 14 stands.
    const rows = [...new Set(stands.map((p) => p.yM))].sort((a, b) => a - b);
    assert.deepEqual(rows, [687.5, 812.5, 935, 1315]);
    assert.deepEqual(
      rows.map((y) => stands.filter((p) => p.yM === y).length),
      [14, 14, 14, 14]
    );
    assert.deepEqual(counts, {
      'env-kelp-stand': 56,
      'env-kelp-cluster': 16,
      'env-rim-crab': 16,
      'env-shoal-fry': 96,
      'env-outer-fish': 8,
      'env-deep-fish': 8,
    });
    assert.ok(placements.reduce((n, p) => n + propSpec(p.slug)!.triBudget, 0) <= 600000);
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
    terrain.ceiling[3 * 16 + 6] = 3000;
    const after = freeWaterPlacements(terrain, true);
    assert.equal(before.length, after.length);
    let removed = 0;
    after.forEach((p, i) => {
      if (p.disabled === true) {
        removed++;
        assert.equal(p.cellIndex, 3 * 16 + 6);
      } else assert.deepEqual(p, before[i]);
    });
    assert.equal(removed, 4);
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
