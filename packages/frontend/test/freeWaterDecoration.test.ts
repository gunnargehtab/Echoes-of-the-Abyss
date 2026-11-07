import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Matrix4, MeshStandardMaterial, Vector3 } from 'three';
import { terrainFor, KELP_LABYRINTH } from '../../backend/src/sim/maps/index.ts';
import { FREE_WATER_SLICE } from '../../backend/src/sim/maps/freeWaterSlice.ts';
import { decorationPose, freeWaterPlacements } from '../src/game/freeWaterDecoration.ts';
import {
  ENVIRONMENT_PROPS,
  placeProps,
  propSpec,
  type PropPlacement,
} from '../src/game/environment.ts';
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

// A plant's plan outline where the layer draws it: half its length on the
// template's own x and half its width on its z, off the GLB normalised to its
// footprint as the layer builds it, turned by the placement's yaw about +y.
const outlineOf = async (slug: string) => {
  const bytes = readFileSync(
    new URL(`../../../docs/concept-art/models/${slug}.glb`, import.meta.url)
  );
  const parsed = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    ''
  );
  const spec = propSpec(slug)!;
  const box = new Box3();
  for (const { geometry } of buildTemplate(parsed.scene, spec.footprintM, spec.swayM, 'free-water')
    .parts) {
    geometry.computeBoundingBox();
    box.union(geometry.boundingBox!);
  }
  const a = Math.max(-box.min.x, box.max.x);
  const b = Math.max(-box.min.z, box.max.z);
  // The plan point a share of the way out along the outline's length and width.
  const at = (p: PropPlacement, u: number, v: number) => {
    const turned = new Vector3(u * a, 0, v * b).applyMatrix4(new Matrix4().makeRotationY(p.yawRad));
    return [p.xM + turned.x, p.yM + turned.z] as const;
  };
  return {
    at,
    corners: (p: PropPlacement) => [at(p, 1, 1), at(p, 1, -1), at(p, -1, -1), at(p, -1, 1)],
  };
};

// Two convex outlines overlap unless an edge normal of one separates them.
const outlinesOverlap = (
  p: readonly (readonly [number, number])[],
  q: readonly (readonly [number, number])[]
) => {
  for (const shape of [p, q]) {
    for (let k = 0; k < shape.length; k++) {
      const [ax, ay] = shape[k]!;
      const [bx, by] = shape[(k + 1) % shape.length]!;
      const normal = [by - ay, ax - bx] as const;
      const span = (s: typeof p) => s.map(([x, y]) => x * normal[0] + y * normal[1]);
      if (Math.max(...span(p)) <= Math.min(...span(q))) return false;
      if (Math.max(...span(q)) <= Math.min(...span(p))) return false;
    }
  }
  return true;
};

// §5, No rows: how far the middle plant of a triple stands from the line
// through the outer two, when it lies between them, at least a fifth of the
// way in from each, and within 260 m of both; otherwise null.
const offRow = (a: PropPlacement, b: PropPlacement, c: PropPlacement): number | null => {
  if (Math.hypot(b.xM - a.xM, b.yM - a.yM) > 260 || Math.hypot(b.xM - c.xM, b.yM - c.yM) > 260) {
    return null;
  }
  const acx = c.xM - a.xM;
  const acy = c.yM - a.yM;
  const ac2 = acx * acx + acy * acy;
  const t = ((b.xM - a.xM) * acx + (b.yM - a.yM) * acy) / ac2;
  if (t < 0.2 || t > 0.8) return null;
  return Math.abs(acx * (b.yM - a.yM) - acy * (b.xM - a.xM)) / Math.sqrt(ac2);
};

// The share of the tread's 1,750 m an east-west line meets in outlines.
const lineCover = (y: number, outlines: readonly (readonly (readonly [number, number])[])[]) => {
  const spans: [number, number][] = [];
  for (const shape of outlines) {
    const xs: number[] = [];
    for (let k = 0; k < shape.length; k++) {
      const [ax, ay] = shape[k]!;
      const [bx, by] = shape[(k + 1) % shape.length]!;
      if ((ay - y) * (by - y) <= 0 && ay !== by) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
    }
    if (xs.length >= 2) spans.push([Math.min(...xs), Math.max(...xs)]);
  }
  spans.sort((u, v) => u[0] - v[0]);
  let total = 0;
  let open: [number, number] | null = null;
  for (const [a, b] of spans) {
    if (open === null || a > open[1]) {
      if (open !== null) total += open[1] - open[0];
      open = [a, b];
    } else open[1] = Math.max(open[1], b);
  }
  if (open !== null) total += open[1] - open[0];
  return total / 1750;
};

describe('authored public decoration', () => {
  const ground = () => terrainFor(FREE_WATER_SLICE).serialize();
  it('places every commissioned instance without scatter, scale jitter or truncation', async () => {
    const placements = freeWaterPlacements(ground());
    const counts: Record<string, number> = {};
    const plants = placements.filter((p) => p.motion === undefined);
    const outline = {
      'env-kelp-stand': await outlineOf('env-kelp-stand'),
      'env-kelp-cluster': await outlineOf('env-kelp-cluster'),
    } as Record<string, Awaited<ReturnType<typeof outlineOf>>>;
    for (const p of placements) {
      counts[p.slug] = (counts[p.slug] ?? 0) + 1;
      assert.equal(p.scale, 1);
      if (p.motion === undefined) {
        // §5: a plant turns at most 45 degrees from the current, its +x.
        assert.ok(Math.abs(p.yawRad) <= Math.PI / 4 + 1e-9, `${p.slug} turned ${p.yawRad}`);
        // §3: outlines, not origins, stay out of the clearing, swaying tips included.
        const ys = outline[p.slug]!.corners(p).map(([, y]) => y);
        const { swayM } = propSpec(p.slug)!;
        assert.ok(
          Math.max(...ys) + swayM <= 1000 || Math.min(...ys) - swayM >= 1250,
          `${p.slug} at ${p.xM},${p.yM}: clearing stays clear`
        );
      }
    }
    // §5: no two plant outlines overlap.
    for (const a of plants) {
      for (const b of plants) {
        if (a === b) continue;
        assert.ok(
          !outlinesOverlap(outline[a.slug]!.corners(a), outline[b.slug]!.corners(b)),
          `${a.slug} at ${a.xM},${a.yM} overlaps ${b.slug} at ${b.xM},${b.yM}`
        );
      }
    }
    // §5: a stand's whole outline lies where every surrounding cell centre is
    // the garden's 400 m tread, so the view's interpolation never puts a ramp
    // under it; and the rendered floor, eroded, stays within a stand's height
    // of its root across that outline, sampled every eighth of its length and
    // every quarter of its width.
    const terrain = ground();
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    const stands = plants.filter((p) => p.slug === 'env-kelp-stand');
    const standOutline = outline['env-kelp-stand']!;
    for (const p of stands) {
      for (const [x, y] of standOutline.corners(p)) {
        for (const col of [Math.floor(x / 250 - 0.5), Math.ceil(x / 250 - 0.5)]) {
          for (const row of [Math.floor(y / 250 - 0.5), Math.ceil(y / 250 - 0.5)]) {
            const i = row * terrain.cols + col;
            assert.equal(terrain.floor[i], 400, `${p.xM},${p.yM} reaches a ramp`);
            assert.equal(terrain.biomes[i], Biome.KelpForest);
          }
        }
      }
      const root = seabedDepthAtM(terrain, seed, rockTop, p.xM, p.yM, true);
      for (let u = -4; u <= 4; u++) {
        for (let v = -2; v <= 2; v++) {
          const [x, y] = standOutline.at(p, u / 4, v / 2);
          const floor = seabedDepthAtM(terrain, seed, rockTop, x, y, true);
          assert.ok(
            Math.abs(floor - root) <= 40,
            `${p.xM},${p.yM}: floor ${floor} from root ${root}`
          );
        }
      }
    }
    // §5: the north flank's tread holds 42 stands and the south flank's 14.
    assert.equal(stands.filter((p) => p.yM < 1000).length, 42);
    assert.equal(stands.filter((p) => p.yM > 1250).length, 14);
    // §5: the clusters' fringe, where a turned cluster's 9.9 m reach stays on
    // the garden's cells and north of every stand.
    for (const p of plants.filter((q) => q.slug === 'env-kelp-cluster')) {
      assert.ok(p.xM >= 1011 && p.xM <= 2989 && p.yM >= 511 && p.yM <= 614, `${p.xM},${p.yM}`);
    }
    assert.deepEqual(counts, {
      'env-kelp-stand': 56,
      'env-kelp-cluster': 16,
      'env-rim-crab': 32,
      'env-shoal-fry': 144,
      'env-outer-fish': 16,
      'env-deep-fish': 26,
      'env-rim-ray': 1,
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
              'env-rim-ray',
            ].includes(p.slug)
        )
      )
    );
  });

  it('stands no three plants in a row and opens no lane through the forest', async () => {
    // §5, No rows (#1773). Roots stand on one floor, and the camera maps a
    // plane through a homography, which keeps a line a line: three roots in
    // line in plan are in line in the garden-close and survey frames alike.
    const plants = freeWaterPlacements(ground()).filter((p) => p.motion === undefined);
    for (const slug of ['env-kelp-stand', 'env-kelp-cluster']) {
      const kind = plants.filter((p) => p.slug === slug);
      for (const a of kind) {
        for (const b of kind) {
          for (const c of kind) {
            if (a === b || b === c || a === c) continue;
            const off = offRow(a, b, c);
            assert.ok(
              off === null || off >= 10,
              `${slug} at ${b.xM},${b.yM} stands ${off?.toFixed(1)} m off the line from ` +
                `${a.xM},${a.yM} to ${c.xM},${c.yM}`
            );
          }
        }
      }
    }
    // Every east-west line across the north flank meets stands over a
    // quarter of the tread, sampled every 5 m, so no lane runs between them.
    const outline = await outlineOf('env-kelp-stand');
    const north = plants
      .filter((p) => p.slug === 'env-kelp-stand' && p.yM < 1000)
      .map((p) => outline.corners(p));
    for (let y = 650; y <= 970; y += 5) {
      const share = lineCover(y, north);
      assert.ok(share >= 0.25, `the line y=${y} meets stands over ${(share * 100).toFixed(0)}%`);
    }
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

  it('stands the life §5 adds for the opening, garden close and the low pose in those frames all loop long', () => {
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
    const opening = pose(709, 1710, 1200, -34, 15, 300);
    const placements = freeWaterPlacements(terrain);
    // Each patch §5 adds, the frame it is for, and the farthest §5 places it from
    // that frame's eye: 65 to 140 m, 185 to 385 m, 220 to 395 m, about 2 km, and
    // the ray's 810 to 930 m.
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
      ['env-rim-ray', [[735, 2210]], opening, 930],
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
      'env-rim-ray': 4.05,
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
      { slug: 'env-rim-ray', of: () => true, radiusM: 70, band: [200, 300] },
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
    // §5: a slot need not keep its envelope in its own cell, so a change
    // takes every placement whose registry footprint, swept along any loop,
    // reaches the changed cell, from whichever cell its slot stands in, and
    // nothing whose footprint's bounding square stays clear of it.
    const terrain = ground();
    const before = freeWaterPlacements(terrain, true);
    const [row, col] = [3, 6];
    terrain.ceiling[row * 16 + col] = 3000;
    const after = freeWaterPlacements(terrain, true);
    assert.equal(before.length, after.length);
    let removed = 0;
    let fromNeighbours = 0;
    after.forEach((p, i) => {
      const reach = (p.motion?.radiusM ?? 0) + propSpec(p.slug)!.footprintM / 2;
      const dx = Math.max(col * 250 - p.xM, 0, p.xM - (col + 1) * 250);
      const dy = Math.max(row * 250 - p.yM, 0, p.yM - (row + 1) * 250);
      const discReaches = Math.hypot(dx, dy) < reach;
      const squareReaches = dx <= reach && dy <= reach;
      if (p.disabled === true) {
        removed++;
        if (p.cellIndex !== row * 16 + col) fromNeighbours++;
        assert.ok(squareReaches, `${p.slug} at ${p.xM},${p.yM} lies clear of the change`);
      } else {
        assert.ok(!discReaches, `${p.slug} at ${p.xM},${p.yM} reaches the change`);
        assert.deepEqual(p, before[i]);
      }
    });
    assert.ok(removed > 0);
    assert.ok(fromNeighbours > 0, 'a slot in a neighbouring cell whose footprint reaches it goes');
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
      'env-rim-ray',
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
