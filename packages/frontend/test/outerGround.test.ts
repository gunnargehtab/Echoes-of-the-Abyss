/**
 * The ground past the map's edge (docs/art-direction.md, "The crater from
 * above"; #1891). How it looks is the frames' to judge
 * (docs/screenshots/issue-1891/). What a runner can hold is what the section
 * promises of it: it is the edge's own ground read on, it meets the map's
 * mesh on one line, it falls to the map's floor by its reach, it invents no
 * place, and it spends the triangles and the pixels the doc says.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEPTH, HIGH_GRAPHICS } from '@echoes/shared';
import { FREE_WATER_SLICE } from '../../backend/src/sim/maps/freeWaterSlice.ts';
import { terrainFor } from '../../backend/src/sim/maps/index.ts';
import {
  bakeOuterLit,
  outerDepthAtM,
  outerFrame,
  outerMesh,
  pastEdgeM,
} from '../src/game/outerGround.ts';
import {
  buildHeightGrid,
  DEPTH_VISUAL_M_PER_M,
  depthToWorldY,
  edgeRing,
  rockTopDepthM,
  seabedDepthAtM,
} from '../src/game/perspectiveTerrain.ts';
import { erodedGroundAtM, seabedSeed, type LitBake } from '../src/game/seabed.ts';

const terrain = terrainFor(FREE_WATER_SLICE).serialize();
const seed = seabedSeed(terrain);
const rockTop = rockTopDepthM(terrain);
const grid = buildHeightGrid(terrain, seed, rockTop, true);
const WIDTH_M = terrain.cols * terrain.cellM;
const HEIGHT_M = terrain.rows * terrain.cellM;
const { REACH_M, RELIEF_M, RINGS_M, BAKE_PX } = HIGH_GRAPHICS.CRATER.OUTER;
const depthAt = (xM: number, zM: number) => outerDepthAtM(terrain, seed, rockTop, xM, zM);

describe("the ground past the map's edge (#1891)", () => {
  it('measures how far past the edge a point lies', () => {
    assert.equal(pastEdgeM(terrain, 2000, 2000), 0);
    assert.equal(pastEdgeM(terrain, 0, 4000), 0, 'the edge is the map’s');
    assert.equal(pastEdgeM(terrain, -300, 2000), 300);
    assert.equal(pastEdgeM(terrain, 2000, HEIGHT_M + 450), 450);
    // Round a corner, the distance is to the corner.
    assert.equal(pastEdgeM(terrain, -300, -400), 500);
  });

  it("is the map's own drawn ground on the edge, to the bit", () => {
    // The two meshes share that line, so neither may round it.
    for (let m = 0; m <= WIDTH_M; m += grid.stepM) {
      for (const [x, z] of [
        [m, 0],
        [m, HEIGHT_M],
        [0, m],
        [WIDTH_M, m],
      ] as const) {
        assert.equal(depthAt(x, z), seabedDepthAtM(terrain, seed, rockTop, x, z, true));
      }
    }
  });

  it('runs on from the edge without a step', () => {
    // A metre past the edge the ground has moved by what a metre of the
    // map's own relief moves it, and no more: the fall starts level.
    let worst = 0;
    for (let m = 0; m <= HEIGHT_M; m += grid.stepM) {
      worst = Math.max(worst, Math.abs(depthAt(-1, m) - depthAt(0, m)));
      worst = Math.max(worst, Math.abs(depthAt(m, HEIGHT_M + 1) - depthAt(m, HEIGHT_M)));
    }
    assert.ok(worst < 3, `the ground steps ${worst} m across the edge`);
  });

  it("falls to the map's floor by its reach, and never climbs on the way", () => {
    // From the west rim's 600 m, and from the exit pool's 1,500 m on the
    // south edge (docs/free-water-slice.md §3): both end on one floor.
    for (const [from, out] of [
      [
        [0, 1875],
        [-1, 0],
      ],
      [
        [2125, HEIGHT_M],
        [0, 1],
      ],
      [
        [0, 0],
        [-Math.SQRT1_2, -Math.SQRT1_2],
      ],
    ] as const) {
      const at = (past: number) => depthAt(from[0] + out[0] * past, from[1] + out[1] * past);
      assert.ok(Math.abs(at(REACH_M) - DEPTH.MAX_M) < 1e-6, `${at(REACH_M)} m at the reach`);
      // Past where the relief has eased out, the fall alone is left.
      let previous = at(RELIEF_M[1]);
      for (let past = RELIEF_M[1] + 50; past <= REACH_M; past += 50) {
        assert.ok(at(past) >= previous, `the ground climbs at ${past} m past the edge`);
        previous = at(past);
      }
      // And near the edge it is still the edge's ground, relief and all:
      // within the relief's own swing of the edge's step.
      const edge = erodedGroundAtM(terrain, rockTop, from[0], from[1]).stepM;
      assert.ok(Math.abs(at(RELIEF_M[0] / 2) - edge) < 150, `${at(RELIEF_M[0] / 2)} from ${edge}`);
    }
  });

  it('invents no place: past the edge the cells are the edge’s, held', () => {
    // The exit pool meets the south edge between x 1,000 and 3,000 m and the
    // rim either side of it. Both run straight out: the pool's floor stays
    // 900 m under the rim's at any distance, less what the fall has closed.
    for (const past of [100, 500, 1000]) {
      const pool = depthAt(2125, HEIGHT_M + past);
      const rim = depthAt(375, HEIGHT_M + past);
      assert.ok(pool > rim, `${past} m out the pool reads ${pool} and the rim ${rim}`);
    }
    // The drawn ground it reads there is the edge's own.
    const held = erodedGroundAtM(terrain, rockTop, 2125, HEIGHT_M + 800);
    const edge = erodedGroundAtM(terrain, rockTop, 2125, HEIGHT_M);
    assert.equal(held.stepM, edge.stepM);
    assert.equal(held.rockWeight, edge.rockWeight);
  });

  it("meets the map's mesh on one line and draws nothing inside it", () => {
    const mesh = outerMesh(terrain, grid, seed, rockTop);
    const key = (x: number, z: number) => `${x}:${z}`;
    const heights = new Map<string, number>();
    for (let i = 0; i < mesh.positions.length; i += 3) {
      heights.set(key(mesh.positions[i]!, mesh.positions[i + 2]!), mesh.positions[i + 1]!);
    }
    // Every vertex of the map's own boundary is one of the outer mesh's, at
    // the map grid's own height: no crack, and no T-junction.
    for (const point of edgeRing(grid)) {
      assert.equal(heights.get(key(point.x, point.z)), point.y, `${point.x}, ${point.z}`);
    }
    // No vertex stands strictly inside the map.
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const [x, z] = [mesh.positions[i]!, mesh.positions[i + 2]!];
      assert.ok(!(x > 0 && x < WIDTH_M && z > 0 && z < HEIGHT_M), `${x}, ${z} is the map’s`);
    }
    // And no triangle lies on it: a triangle's centroid is past the edge.
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const [a, b, c] = [mesh.indices[t]!, mesh.indices[t + 1]!, mesh.indices[t + 2]!];
      const x = (mesh.positions[a * 3]! + mesh.positions[b * 3]! + mesh.positions[c * 3]!) / 3;
      const z =
        (mesh.positions[a * 3 + 2]! + mesh.positions[b * 3 + 2]! + mesh.positions[c * 3 + 2]!) / 3;
      assert.ok(pastEdgeM(terrain, x, z) > 0, `a triangle about ${x}, ${z} is on the map`);
    }
  });

  it('spends the triangles its rings say, inside the study’s frame', () => {
    const mesh = outerMesh(terrain, grid, seed, rockTop);
    const rings = RINGS_M.length;
    const along = grid.vertsX - 1 + (grid.vertsZ - 1);
    // A strip a ring along each of the four sides, and a square of rings a corner.
    assert.equal(mesh.triangles, 2 * (2 * along * rings + 4 * rings * rings));
    assert.equal(mesh.triangles, 15_904);
    assert.equal(mesh.indices.length, mesh.triangles * 3);
    // docs/free-water-slice.md §7: High's frame stood at up to 835,327 of
    // its 900,000 before this ground.
    assert.ok(835_327 + mesh.triangles <= 900_000);
    // Its own boundary is the reach, walked once round, where the skirt hangs.
    const side = grid.vertsX + 2 * rings;
    assert.equal(mesh.rim.length, 4 * (side - 1));
    for (const point of mesh.rim) {
      assert.ok(
        point.x === -REACH_M ||
          point.x === WIDTH_M + REACH_M ||
          point.z === -REACH_M ||
          point.z === HEIGHT_M + REACH_M
      );
      assert.ok(Math.abs(point.y - depthToWorldY(DEPTH.MAX_M)) < 1e-3, 'at the map’s floor');
    }
    // Its texture coordinates span the bake's square, edge to edge.
    let [least, most] = [1, 0];
    for (const uv of mesh.uvs) {
      least = Math.min(least, uv);
      most = Math.max(most, uv);
    }
    assert.deepEqual([least, most], [0, 1]);
    assert.deepEqual(outerMesh(terrain, grid, seed, rockTop).positions, mesh.positions);
  });

  it('bakes its lit pixels past the edge, at the map’s own density', () => {
    const frame = outerFrame(terrain);
    assert.deepEqual(frame, { x0M: -REACH_M, z0M: -REACH_M, sideM: WIDTH_M + 2 * REACH_M });
    // 7.8125 m a pixel, the map's bake (seabed.ts `SEABED_PX_PER_CELL`).
    assert.equal(frame.sideM / BAKE_PX, terrain.cellM / 32);
    // A quarter of the side, for the runner: the rule is the same at any size.
    const side = BAKE_PX / 4;
    const lit: LitBake = {
      albedo: new Uint8Array(side * side * 4),
      relief: new Uint8Array(side * side * 4),
      heightPerDepthM: DEPTH_VISUAL_M_PER_M,
    };
    bakeOuterLit(terrain, seed, rockTop, lit, side);
    const pixel = (xM: number, zM: number) =>
      (Math.floor(((zM - frame.z0M) / frame.sideM) * side) * side +
        Math.floor(((xM - frame.x0M) / frame.sideM) * side)) *
      4;
    // Written past the edge, and open to the whole water above: the wall
    // shade is the map's.
    for (const [x, z] of [
      [-1500, 2000],
      [2000, -900],
      [WIDTH_M + 300, HEIGHT_M + 300],
    ] as const) {
      assert.equal(lit.albedo[pixel(x, z) + 3], 255, `${x}, ${z} has no albedo`);
      assert.equal(lit.relief[pixel(x, z) + 3], 255);
      assert.equal(lit.relief[pixel(x, z) + 1], 255, 'no rim or lee darkens it');
    }
    // The middle of the map is the map's bake's, and left unwritten here.
    assert.equal(lit.albedo[pixel(2000, 2000) + 3], 0);
    // Where the relief has eased out the ground is a smooth fall: level
    // across the slope, tipped down it. West of the map that is toward -x.
    const far = pixel(-1500, 2000);
    assert.ok(lit.relief[far]! < 127, 'the ground past the west edge faces west');
    assert.ok(Math.abs(lit.relief[far + 2]! - 127.5) <= 1, 'and neither north nor south');
    // The fill is the edge's: coral off the west rim, the same albedo at
    // 1,500 m out as at 200 m, but for the mottle.
    const near = pixel(-200, 2000);
    for (let k = 0; k < 3; k++) {
      assert.ok(Math.abs(lit.albedo[far + k]! - lit.albedo[near + k]!) <= 12, `channel ${k}`);
    }
  });
});
