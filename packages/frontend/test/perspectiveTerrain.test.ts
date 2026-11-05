/**
 * The perspective viewport's heightfield (docs/three-layer-ocean.md §5).
 *
 * The mesh is render-only by rule, so what these tests hold is not gameplay —
 * it is the promises that make a heightfield safe to stand a view on: it is
 * deterministic, it tracks the authored floors within the detail field's own
 * amplitude, rock rises above the water around it, and the vertical axis is a
 * single presentation-only scale. The three.js geometry that consumes this
 * grid needs a GL context and is reviewed by screenshot, per the
 * graphics-standards checklist.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Biome } from '@echoes/shared';
import {
  BIOME_RELIEF,
  detailM,
  ERODED_EDGES,
  erodedGroundAtM,
  reliefAtCell,
  ROCK_RELIEF,
  seabedSeed,
} from '../src/game/seabed.ts';
import {
  authoredFloorAtM,
  buildHeightGrid,
  edgeRing,
  patchHeightGrid,
  DEPTH_VISUAL_M_PER_M,
  depthToWorldY,
  rockSurfaceDepthM,
  rockTopDepthM,
  ROCK_RISE_ABOVE_SHALLOWEST_M,
  seabedDepthAtM,
  VERTS_PER_CELL,
} from '../src/game/perspectiveTerrain.ts';
import type { TerrainPayload } from '../src/net/GameClient.ts';
import { terrainFor } from '../../backend/src/sim/maps/index.ts';
import { FREE_WATER_SLICE } from '../../backend/src/sim/maps/freeWaterSlice.ts';

/** A 4×4 map: a shallow plateau, deep water, and one rock cell. */
function demoTerrain(): TerrainPayload {
  const cols = 4;
  const rows = 4;
  const biomes = new Array(cols * rows).fill(Biome.OpenWater);
  const floor = new Array(cols * rows).fill(2000);
  const ceiling = new Array(cols * rows).fill(0);
  floor[0] = 400; // plateau corner
  floor[5] = 2600; // trench cell
  ceiling[10] = 3000; // rock: ceiling below floor
  floor[10] = 2000;
  return { cols, rows, cellM: 250, biomes, floor, ceiling };
}

describe('perspective heightfield', () => {
  it('is deterministic: same terrain, same grid', () => {
    const a = buildHeightGrid(demoTerrain());
    const b = buildHeightGrid(demoTerrain());
    assert.deepEqual([...a.y], [...b.y]);
    assert.equal(a.vertsX, 4 * VERTS_PER_CELL + 1);
    assert.equal(a.vertsZ, 4 * VERTS_PER_CELL + 1);
  });

  it('tracks the authored floor within the detail amplitude', () => {
    const terrain = demoTerrain();
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    const amplitude = BIOME_RELIEF[Biome.OpenWater].amplitudeM;
    // Cell centres far from the rock cell and from cell boundaries: the
    // bilinear floor there is the authored floor, so only the detail field
    // separates the sample from the authoring.
    const depth = seabedDepthAtM(terrain, seed, rockTop, 3.5 * 250, 3.5 * 250);
    assert.ok(Math.abs(depth - 2000) <= amplitude + 1e-9);
  });

  it('raises rock above every open floor around it, crag included', () => {
    const terrain = demoTerrain();
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    // Rock cell 10 is at col 2, row 2 — its centre sits at the rock top plus
    // the rock detail crag, which is bounded by the rock amplitude. Because
    // that amplitude is smaller than the rise, even the crag's lowest notch
    // stays shallower (smaller depth) than the shallowest open water.
    const depth = seabedDepthAtM(terrain, seed, rockTop, 2.5 * 250, 2.5 * 250);
    assert.ok(Math.abs(depth - rockTop) <= ROCK_RELIEF.amplitudeM + 1e-9);
    assert.equal(rockTop, Math.max(0, 400 - ROCK_RISE_ABOVE_SHALLOWEST_M));
    assert.ok(ROCK_RELIEF.amplitudeM < ROCK_RISE_ABOVE_SHALLOWEST_M, 'crag taller than the rise');
    assert.ok(depth < 400, 'rock dipped back under the shallowest open floor');
    assert.ok(depth >= 0, 'a spire pierced the surface');
  });

  it('maps depth to world Y through one presentation scale, downward', () => {
    // `===`, not strict-deep-equal: the surface is 0 whether IEEE calls it -0.
    assert.ok(depthToWorldY(0) === 0);
    assert.equal(depthToWorldY(1000), -1000 * DEPTH_VISUAL_M_PER_M);
    // Deeper is lower, monotonically — a view that folded the axis would be
    // drawing depth as something other than depth.
    assert.ok(depthToWorldY(2600) < depthToWorldY(400));
  });

  it('keeps the grid aligned with the map extent', () => {
    const grid = buildHeightGrid(demoTerrain());
    assert.equal(grid.widthM, 1000);
    assert.equal(grid.heightM, 1000);
    assert.equal(grid.stepM * (grid.vertsX - 1), grid.widthM);
    assert.equal(grid.y.length, grid.vertsX * grid.vertsZ);
  });

  it('climbs between cell centres instead of terracing at each one (#1532)', () => {
    // A ramp of four open cells, each 100 m deeper than the last. A quarter
    // of the way from one centre to the next the floor is a quarter of the
    // step on: no flat tread at the centre, so a ramp reads as one.
    const terrain: TerrainPayload = {
      cols: 4,
      rows: 1,
      cellM: 250,
      biomes: new Array(4).fill(Biome.OpenWater),
      floor: [1000, 1100, 1200, 1300],
      ceiling: new Array(4).fill(0),
    };
    for (const t of [0.25, 0.5, 0.75]) {
      const x = (1 + 0.5 + t) * 250;
      assert.ok(Math.abs(authoredFloorAtM(terrain, x, 125) - (1100 + 100 * t)) < 1e-9);
    }
  });

  it('tears no wall where two biomes with different fields meet (#1532)', () => {
    // Coral Ruins' blocky field beside a Thermal Vein's, on one flat floor:
    // the only height either side is the detail field. Taken from the nearest
    // cell, the mesh switched from one field to the other at the boundary, a
    // jump with no width; blended as the bake blends it, the ground is one
    // continuous surface, so a centimetre across the line moves it a hair.
    const cols = 6;
    const terrain: TerrainPayload = {
      cols,
      rows: 6,
      cellM: 250,
      biomes: Array.from({ length: 36 }, (_, i) =>
        i % cols < 3 ? Biome.CoralRuins : Biome.ThermalVein
      ),
      floor: new Array(36).fill(1600),
      ceiling: new Array(36).fill(0),
    };
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    const line = 3 * 250;
    let worst = 0;
    for (let y = 10; y < 1500; y += 37) {
      const west = seabedDepthAtM(terrain, seed, rockTop, line - 0.01, y);
      const east = seabedDepthAtM(terrain, seed, rockTop, line + 0.01, y);
      worst = Math.max(worst, Math.abs(east - west));
    }
    assert.ok(worst < 0.5, `the boundary moves the ground ${worst} m in 2 cm`);
  });

  it('patches a ground delta into the grid a full build would make (#434)', () => {
    const before = demoTerrain();
    const seed = seabedSeed(before);
    const rockTop = rockTopDepthM(before);
    const grid = buildHeightGrid(before, seed, rockTop);

    const after = demoTerrain();
    after.floor[6] = 2500; // (row 1, col 2) drops
    after.ceiling[9] = 3000; // (row 2, col 1) becomes rock
    const span = patchHeightGrid(grid, after, seed, rockTop, {
      col0: 1,
      row0: 1,
      col1: 2,
      row1: 2,
    });
    const fresh = buildHeightGrid(after, seed, rockTop);
    assert.deepEqual([...grid.y], [...fresh.y]);
    assert.deepEqual([...grid.floor], [...fresh.floor]);
    assert.ok(span.first < span.last, 'the changed span is a real range of vertices');

    // The ring is enough: with the same seed and rock top, nothing outside it
    // moved between the two full builds either.
    const untouched = buildHeightGrid(before, seed, rockTop);
    const ix0 = 0 * VERTS_PER_CELL;
    const ix1 = 3 * VERTS_PER_CELL + VERTS_PER_CELL;
    for (let iz = 0; iz < fresh.vertsZ; iz++) {
      for (let ix = 0; ix < fresh.vertsX; ix++) {
        const inRing = ix >= ix0 && ix <= ix1 && iz >= 0 && iz <= 4 * VERTS_PER_CELL;
        if (inRing) continue;
        assert.equal(fresh.y[iz * fresh.vertsX + ix], untouched.y[iz * fresh.vertsX + ix]);
      }
    }
  });
});

/**
 * The walk the map rim and the skirt hang from (#1041). Each draws straight
 * lines between its points, so it follows the drawn floor only if its points
 * are the mesh's own boundary vertices, adjacent ones in turn.
 */
describe('the edge ring', () => {
  it('walks every boundary vertex once, at the grid’s own spacing and heights', () => {
    const grid = buildHeightGrid(demoTerrain());
    const ring = edgeRing(grid);
    assert.equal(ring.length, 2 * (grid.vertsX + grid.vertsZ) - 4);
    assert.equal(new Set(ring.map((p) => `${p.x},${p.z}`)).size, ring.length);
    ring.forEach((p, i) => {
      const ix = p.x / grid.stepM;
      const iz = p.z / grid.stepM;
      assert.ok(ix === 0 || ix === grid.vertsX - 1 || iz === 0 || iz === grid.vertsZ - 1);
      assert.equal(p.y, grid.y[iz * grid.vertsX + ix]);
      // One mesh edge to the next point, closing the loop: a longer step is
      // a chord across whatever the floor does between.
      const next = ring[(i + 1) % ring.length]!;
      assert.equal(Math.abs(next.x - p.x) + Math.abs(next.z - p.z), grid.stepM);
    });
  });

  it('stays on a trench floor where a cell-spaced walk ran up the ramp beyond it', () => {
    // Ventfront's west edge in small: a 2,900 m trench four rows deep, then
    // 700 m plateau. The smoothed floor is flat to the last trench row's
    // centre, z 875, and climbs to 1,800 m at the boundary, z 1,000.
    const cols = 2;
    const rows = 6;
    const floor = new Array(cols * rows).fill(2900);
    for (let i = 4 * cols; i < rows * cols; i++) floor[i] = 700;
    const terrain: TerrainPayload = {
      cols,
      rows,
      cellM: 250,
      biomes: new Array(cols * rows).fill(Biome.OpenWater),
      floor,
      ceiling: new Array(cols * rows).fill(0),
    };
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    const amplitude = BIOME_RELIEF[Biome.OpenWater].amplitudeM;
    const at = edgeRing(buildHeightGrid(terrain, seed, rockTop)).find(
      (p) => p.x === 0 && p.z === 875
    )!;
    assert.ok(-at.y / DEPTH_VISUAL_M_PER_M >= 2900 - amplitude, 'the ring left the trench floor');
    // The walk this replaced, one sample a cell, drew a chord from z 750 to
    // z 1,000 and stood more than 400 m of depth above the floor here.
    const chord =
      (seabedDepthAtM(terrain, seed, rockTop, 0, 750) +
        seabedDepthAtM(terrain, seed, rockTop, 0, 1000)) /
      2;
    assert.ok(2900 - amplitude - chord > 400, 'the case no longer separates the two walks');
  });
});

/**
 * The surface the survey ink contours (docs/map-visuals.md §4). Rule 1 is the
 * one that matters: an isobath is a measurement, so it may read the floor the
 * author wrote and never the render-only detail field over it.
 */
describe('authored floor for the survey ink', () => {
  it('is the heightfield without the detail field, wherever the ground is open', () => {
    const terrain = demoTerrain();
    const seed = seabedSeed(terrain);
    const rockTop = rockTopDepthM(terrain);
    // Every open-homed vertex of the demo map: the mesh depth minus the
    // detail field at the same point is the authored floor, exactly.
    const grid = buildHeightGrid(terrain, seed, rockTop);
    let checked = 0;
    for (let iz = 0; iz < grid.vertsZ; iz++) {
      for (let ix = 0; ix < grid.vertsX; ix++) {
        const x = ix * grid.stepM;
        const y = iz * grid.stepM;
        const col = Math.min(3, Math.max(0, Math.round(x / 250 - 0.5)));
        const row = Math.min(3, Math.max(0, Math.round(y / 250 - 0.5)));
        if (terrain.ceiling[row * 4 + col]! > terrain.floor[row * 4 + col]!) continue;
        const relief = reliefAtCell(terrain, x / 250 - 0.5, y / 250 - 0.5);
        const detail = detailM(x, y, seed, relief.amplitudeM, relief.roughness, relief.blockiness);
        const mesh = seabedDepthAtM(terrain, seed, rockTop, x, y);
        assert.ok(Math.abs(mesh - detail - grid.floor[iz * grid.vertsX + ix]!) < 1e-6);
        checked++;
      }
    }
    assert.ok(checked > 200, 'the comparison walked the open ground');
  });

  it('reads the authored floor at every open cell centre', () => {
    const terrain = demoTerrain();
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const i = row * 4 + col;
        if (terrain.ceiling[i]! > terrain.floor[i]!) continue;
        assert.equal(
          authoredFloorAtM(terrain, (col + 0.5) * 250, (row + 0.5) * 250),
          terrain.floor[i]
        );
      }
    }
  });

  it('carries the open floor, not a false scarp, onto the edge of a mesa', () => {
    // A strip of rock down column 1 of an otherwise flat 1,500 m plain. The
    // vertices on the rock's west edge are rock-homed, and they feed the
    // open triangles beside it: if they carried anything but 1,500 m, every
    // isobath between that number and the plain's would crowd into the foot
    // of the wall.
    const cols = 4;
    const rows = 4;
    const floor = new Array(cols * rows).fill(1500);
    const ceiling = new Array(cols * rows).fill(0);
    for (let row = 0; row < rows; row++) {
      ceiling[row * cols + 1] = 3000;
      floor[row * cols + 1] = 100; // rock's own number, which must not leak
    }
    const terrain: TerrainPayload = {
      cols,
      rows,
      cellM: 250,
      biomes: new Array(cols * rows).fill(Biome.OpenWater),
      floor,
      ceiling,
    };
    for (const y of [0, 125, 250, 400, 625, 1000]) {
      assert.equal(authoredFloorAtM(terrain, 250, y), 1500, `west edge at y=${y}`);
      assert.equal(authoredFloorAtM(terrain, 500, y), 1500, `east edge at y=${y}`);
    }
  });
});

/**
 * The free-water study's eroded cell edges (docs/free-water-slice.md §9,
 * "Crater walls"; seabed.ts `erodedGroundAtM`). What the section promises:
 * the drawn floor, rock faces and roof are reshaped between cell centres;
 * nothing is added at a centre, and a solid cell stays rock at its centre;
 * the survey ink keeps tracing the authored floor; the shipped ground is
 * untouched. The picture is the run-game frames' to review.
 */
describe('eroded cell edges (docs/free-water-slice.md §9)', () => {
  const terrain = terrainFor(FREE_WATER_SLICE).serialize();
  const seed = seabedSeed(terrain);
  const rockTop = rockTopDepthM(terrain);
  const plain = buildHeightGrid(terrain, seed, rockTop);
  const eroded = buildHeightGrid(terrain, seed, rockTop, true);
  const isRock = (i: number) => terrain.ceiling[i]! > terrain.floor[i]!;

  it('is off unless asked: the shipped grid is the bilinear one to the bit', () => {
    assert.deepEqual([...buildHeightGrid(terrain, seed, rockTop, false).y], [...plain.y]);
    assert.deepEqual([...buildHeightGrid(terrain).y], [...plain.y]);
  });

  it('adds nothing at a cell centre, and a solid cell stays rock at its centre', () => {
    for (let row = 0; row < terrain.rows; row++) {
      for (let col = 0; col < terrain.cols; col++) {
        const x = (col + 0.5) * terrain.cellM;
        const y = (row + 0.5) * terrain.cellM;
        const want = seabedDepthAtM(terrain, seed, rockTop, x, y);
        assert.equal(seabedDepthAtM(terrain, seed, rockTop, x, y, true), want);
        const { stepM, rockWeight } = erodedGroundAtM(terrain, seed, rockTop, x, y);
        if (isRock(row * terrain.cols + col)) {
          assert.equal(rockWeight, 1);
          assert.equal(stepM, rockTop);
          assert.equal(want, rockSurfaceDepthM(seed, rockTop, x, y));
        } else {
          assert.equal(rockWeight, 0);
          assert.equal(stepM, terrain.floor[row * terrain.cols + col]);
        }
      }
    }
  });

  it('reshapes the ground between centres: the positive control', () => {
    let moved = 0;
    for (let i = 0; i < plain.y.length; i++) {
      moved = Math.max(moved, Math.abs(plain.y[i]! - eroded.y[i]!) / DEPTH_VISUAL_M_PER_M);
    }
    assert.ok(moved > 100, `the drawn ground moved at most ${moved} m between centres`);
  });

  it('stays between the four centres it blends, like the bilinear it replaces', () => {
    // A visual slope never opens a route the grid refuses
    // (docs/three-layer-ocean.md §5): the drawn step is never shallower than
    // the shallowest of its patch's centres, nor deeper than the deepest.
    const { cols, rows, cellM } = terrain;
    for (let y = 3; y < rows * cellM; y += 23) {
      for (let x = 3; x < cols * cellM; x += 23) {
        const c0 = Math.floor(x / cellM - 0.5);
        const r0 = Math.floor(y / cellM - 0.5);
        const corners = [
          [r0, c0],
          [r0, c0 + 1],
          [r0 + 1, c0],
          [r0 + 1, c0 + 1],
        ].map(([r, c]) => {
          const i =
            Math.min(rows - 1, Math.max(0, r!)) * cols + Math.min(cols - 1, Math.max(0, c!));
          return isRock(i) ? rockTop : terrain.floor[i]!;
        });
        const { stepM } = erodedGroundAtM(terrain, seed, rockTop, x, y);
        assert.ok(stepM >= Math.min(...corners) - 1e-6 && stepM <= Math.max(...corners) + 1e-6);
      }
    }
  });

  it('tears no seam where one patch of four centres hands over to the next', () => {
    // A centre line is where the blend changes its four corners. The face
    // and the scarp are steep, so the bound is a slope's, not a tear's: the
    // narrowest face climbs 1,250 m over 40 m with a lip twice as steep,
    // 0.6 m a centimetre, and a seam in the blend would jump tens of metres.
    const { cols, rows, cellM } = terrain;
    let worst = 0;
    for (let k = 1; k < cols; k++) {
      const line = (k + 0.5) * cellM;
      for (let s = 7; s < rows * cellM; s += 31) {
        for (const [ax, ay, bx, by] of [
          [line - 0.005, s, line + 0.005, s],
          [s, line - 0.005, s, line + 0.005],
        ] as const) {
          const a = seabedDepthAtM(terrain, seed, rockTop, ax, ay, true);
          const b = seabedDepthAtM(terrain, seed, rockTop, bx, by, true);
          worst = Math.max(worst, Math.abs(a - b));
        }
      }
    }
    assert.ok(worst < 3, `the ground jumps ${worst} m across a centre line`);
  });

  it('gives a wall a foot in the water and a lip set back into the stone', () => {
    // The southern wall's north face at x = 1,625 (col 6's centre line): open
    // bowl at row 11, rock at row 12, the edge at y = 3,000. Drawn plain, the
    // face is the vertical drop on the edge; eroded, the rock's share rises
    // from the water side of the edge to the stone side, and reaches 1 well
    // before the rock's centre.
    const x = 1625;
    const at = (y: number) => erodedGroundAtM(terrain, seed, rockTop, x, y).rockWeight;
    assert.equal(at(2875), 0, 'the bowl centre');
    assert.equal(at(3125), 1, 'the rock centre');
    const foot = ERODED_EDGES.FOOT_M;
    const setback = ERODED_EDGES.SETBACK_M + ERODED_EDGES.WANDER_M;
    assert.equal(at(3000 - foot - ERODED_EDGES.WANDER_M - 1), 0, 'open water before the foot');
    assert.equal(at(3000 + setback + 1), 1, 'stone past the setback');
    let rises = 0;
    for (let y = 2875; y < 3125; y += 5) if (at(y) > 0 && at(y) < 1) rises++;
    assert.ok(rises > 0, 'and a face between the two');
    const y = 3000 + setback + 1;
    assert.equal(
      seabedDepthAtM(terrain, seed, rockTop, x, y, true),
      rockSurfaceDepthM(seed, rockTop, x, y),
      'stone past the setback is the rock surface, crag and all'
    );
  });

  it('keeps the step on the edge against the stone over a roofed passage', () => {
    // The cut's west jamb: rock at col 6, the roofed cells at col 7, rows 12
    // and 13. The roof stands a curtain on x = 1,750 (passages.ts), so the
    // face is not set back from it: stone to the edge, the passage floor from
    // it, the whole step in no width. Near the wall's north edge the stone
    // side is still on the north face, which runs into the jamb.
    for (const y of [3062.5, 3125, 3187.5, 3250, 3375]) {
      const stone = erodedGroundAtM(terrain, seed, rockTop, 1749.99, y);
      const passage = erodedGroundAtM(terrain, seed, rockTop, 1750, y);
      assert.ok(stone.rockWeight > 0.5 && stone.stepM < 1500, `stone at y=${y}`);
      assert.equal(passage.rockWeight, 0, `no stone in the passage at y=${y}`);
      if (y >= 3125) {
        assert.equal(stone.stepM, rockTop, `the rock top at y=${y}`);
        assert.equal(passage.stepM, 1500, `the passage floor at y=${y}`);
      } else {
        // The mouth's row: the floor still ramps from the pocket's 2,400 m
        // down to the cut's 1,500 m, as the authored centres have it.
        assert.ok(passage.stepM >= 1500 && passage.stepM <= 2400, `the mouth's ramp at y=${y}`);
      }
    }
  });

  it('leaves the survey floor the authored one', () => {
    assert.deepEqual([...eroded.floor], [...plain.floor]);
  });

  it('patches a ground delta into the grid a full eroded build would make (#434)', () => {
    const grid = buildHeightGrid(terrain, seed, rockTop, true);
    const after = { ...terrain, floor: [...terrain.floor], ceiling: [...terrain.ceiling] };
    after.floor[7 * terrain.cols + 7] = 2600; // the bowl's floor drops
    after.ceiling[11 * terrain.cols + 5] = 3000; // a bowl cell becomes rock
    after.floor[11 * terrain.cols + 5] = 1500;
    const span = patchHeightGrid(
      grid,
      after,
      seed,
      rockTop,
      { col0: 5, row0: 7, col1: 7, row1: 11 },
      true
    );
    const fresh = buildHeightGrid(after, seed, rockTop, true);
    assert.deepEqual([...grid.y], [...fresh.y]);
    assert.ok(span.first < span.last);
    // And nothing outside the ring moved between the two full builds.
    const ring = {
      ix0: 4 * VERTS_PER_CELL,
      ix1: 9 * VERTS_PER_CELL,
      iz0: 6 * VERTS_PER_CELL,
      iz1: 13 * VERTS_PER_CELL,
    };
    for (let iz = 0; iz < fresh.vertsZ; iz++) {
      for (let ix = 0; ix < fresh.vertsX; ix++) {
        if (ix >= ring.ix0 && ix <= ring.ix1 && iz >= ring.iz0 && iz <= ring.iz1) continue;
        assert.equal(fresh.y[iz * fresh.vertsX + ix], eroded.y[iz * fresh.vertsX + ix]);
      }
    }
  });
});
