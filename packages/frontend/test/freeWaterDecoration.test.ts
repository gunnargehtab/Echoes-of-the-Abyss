import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshStandardMaterial, Vector3 } from 'three';
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
import { CONN_FOV_DEG } from '../src/game/readability.ts';
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
      'env-rim-crab': 32,
      'env-shoal-fry': 144,
      'env-outer-fish': 16,
      'env-deep-fish': 26,
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

  // The drawn floor, eroded as the study draws it, in world units.
  const drawnGround = (terrain: ReturnType<typeof ground>) => {
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    return (x: number, y: number) =>
      -seabedDepthAtM(terrain, seed, rockTop, x, y, true) * DEPTH_VISUAL_M_PER_M;
  };

  it('keeps every swimmer above the drawn floor all loop long', () => {
    // §5 checks paths against public ground. The slot guard reads the literal
    // cell floors, and the drawn floor blends between cell centres, so a patch
    // beside a ramp, as the deep fish along the pocket's north edge stand, is
    // held here against the floor the view draws, nose and tail included.
    const terrain = ground();
    const groundY = drawnGround(terrain);
    for (const p of freeWaterPlacements(terrain)) {
      if (p.motion === undefined || p.motion.depthM === null) continue;
      const half = propSpec(p.slug)!.footprintM / 2;
      for (let step = 0; step < 48; step++) {
        const pose = decorationPose(p, (p.motion.periodS * 1000 * step) / 48, groundY);
        for (const [dx, dz] of [
          [0, 0],
          [half, 0],
          [-half, 0],
          [0, half],
          [0, -half],
        ] as const) {
          assert.ok(
            pose.y > groundY(pose.x + dx, pose.z + dz),
            `${p.slug} of ${p.xM},${p.yM} meets the floor`
          );
        }
      }
    }
  });

  it('stands the life §5 adds for garden close and the low pose in those frames all loop long', () => {
    // §5, Life in the frames: §9's poses through the conn camera's field at
    // 1,440 × 900, the eye where the orbit puts it, a body counted only between
    // the top bar's foot (52 px) and the console's top edge (692 px) and only
    // where no drawn ground or rock stands between it and the eye.
    const terrain = ground();
    const groundY = drawnGround(terrain);
    const focal = 450 / Math.tan((CONN_FOV_DEG / 2) * (Math.PI / 180));
    const pose = (
      x: number,
      z: number,
      dolly: number,
      yawDeg: number,
      pitchDeg: number,
      focusDepthM: number
    ) => {
      const yaw = (yawDeg * Math.PI) / 180;
      const pitch = (pitchDeg * Math.PI) / 180;
      const focus = new Vector3(x, -focusDepthM * DEPTH_VISUAL_M_PER_M, z);
      const eye = new Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
      )
        .multiplyScalar(dolly)
        .add(focus);
      const forward = focus.clone().sub(eye).normalize();
      const right = forward
        .clone()
        .cross(new Vector3(0, 1, 0))
        .normalize();
      const up = right.clone().cross(forward);
      // The body's distance from the eye if the frame shows it, else null.
      return (at: { x: number; y: number; z: number }): number | null => {
        const d = new Vector3(at.x, at.y, at.z).sub(eye);
        const ahead = d.dot(forward);
        if (ahead <= 1) return null;
        const sx = 720 + (d.dot(right) / ahead) * focal;
        const sy = 450 - (d.dot(up) / ahead) * focal;
        if (sx < 0 || sx >= 1440 || sy < 52 || sy >= 692) return null;
        for (let i = 1; i < 100; i++) {
          const q = eye.clone().addScaledVector(d, i / 100);
          if (q.y < groundY(q.x, q.z) && d.length() * (1 - i / 100) > 3) return null;
        }
        return d.length();
      };
    };
    const gardenClose = pose(1875, 1125, 250, 90, 12, 275);
    const low = pose(2000, 2000, 1600, 0, 12, 850);
    const placements = freeWaterPlacements(terrain);
    // Each patch §5 adds, the frame it is for, and the farthest §5 places it from
    // that frame's eye: 65 to 140 m, 185 to 385 m, 220 to 395 m, and about 2 km.
    const rows = [
      [
        'env-shoal-fry',
        [
          [2035, 1120],
          [2010, 1160],
        ],
        gardenClose,
        140,
      ],
      [
        'env-outer-fish',
        [
          [1900, 1150],
          [1780, 1080],
        ],
        gardenClose,
        385,
      ],
      [
        'env-rim-crab',
        [
          [1900, 1060],
          [1880, 1165],
          [1800, 1110],
          [1760, 1200],
        ],
        gardenClose,
        395,
      ],
      [
        'env-deep-fish',
        [
          [1950, 1640],
          [2150, 1630],
          [2350, 1650],
        ],
        low,
        2100,
      ],
    ] as const;
    for (const [slug, centres, frame, reachM] of rows) {
      const bodies = placements.filter(
        (p) => p.slug === slug && centres.some(([x, y]) => p.xM === x && p.yM === y)
      );
      assert.ok(bodies.length >= centres.length, `${slug}: every patch §5 lists stands`);
      for (const p of bodies) {
        for (let step = 0; step < 48; step++) {
          const at = decorationPose(p, (p.motion!.periodS * 1000 * step) / 48, groundY);
          const distance = frame(at);
          assert.ok(distance !== null, `${slug} of ${p.xM},${p.yM} leaves its frame`);
          assert.ok(distance <= reachM, `${slug} of ${p.xM},${p.yM} at ${distance} m`);
        }
      }
    }
  });

  it("holds every patch inside §5's plan radius and depth band, the whole body included", () => {
    // §5's placement table, row by row: how far from its centre a body may
    // stand and the depths it may span. A school's fish hold station off its
    // loop, so a path's own radius no longer says the row's bound holds. The
    // body's extent comes from Block 4's heights and §5's body axes.
    const heightM: Record<string, number> = {
      'env-rim-crab': 0.6,
      'env-shoal-fry': 0.15,
      'env-outer-fish': 1.69,
      'env-deep-fish': 0.84,
    };
    const at = (x: number, y: number) => (p: { xM: number; yM: number }) =>
      p.xM === x && p.yM === y;
    const rows: {
      slug: string;
      of: (p: { xM: number; yM: number }) => boolean;
      radiusM: number;
      band: readonly [number, number] | null;
    }[] = [
      { slug: 'env-rim-crab', of: () => true, radiusM: 25, band: null },
      { slug: 'env-shoal-fry', of: (p) => p.yM === 875, radiusM: 25, band: [250, 300] },
      { slug: 'env-shoal-fry', of: at(2035, 1120), radiusM: 25, band: [105, 160] },
      { slug: 'env-shoal-fry', of: at(2010, 1160), radiusM: 25, band: [120, 170] },
      {
        slug: 'env-outer-fish',
        of: (p) => p.yM === 1750 || p.yM === 2500,
        radiusM: 40,
        band: [700, 1000],
      },
      {
        slug: 'env-outer-fish',
        of: (p) => at(1900, 1150)(p) || at(1780, 1080)(p),
        radiusM: 45,
        band: [200, 300],
      },
      { slug: 'env-deep-fish', of: () => true, radiusM: 25, band: [1900, 2100] },
    ];
    for (const p of freeWaterPlacements(ground())) {
      if (p.motion === undefined) continue;
      const matching = rows.filter((row) => row.slug === p.slug && row.of(p));
      assert.equal(matching.length, 1, `${p.slug} of ${p.xM},${p.yM} has one §5 row`);
      const row = matching[0]!;
      const m = p.motion;
      assert.ok(m.radiusM + propSpec(p.slug)!.footprintM / 2 <= row.radiusM, `${p.slug} plan`);
      if (row.band === null || m.depthM === null) continue;
      const deepest = m.depthM + m.depthSwingM + m.axisM / DEPTH_VISUAL_M_PER_M;
      const shallowest =
        m.depthM - m.depthSwingM - (heightM[p.slug]! - m.axisM) / DEPTH_VISUAL_M_PER_M;
      assert.ok(deepest <= row.band[1], `${p.slug} of ${p.xM},${p.yM} reaches ${deepest} m`);
      assert.ok(shallowest >= row.band[0], `${p.slug} of ${p.xM},${p.yM} rises to ${shallowest} m`);
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
