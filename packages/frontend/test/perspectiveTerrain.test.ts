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
  benchedDetailM,
  BIOME_RELIEF,
  detailM,
  ERODED_EDGES,
  erodedGroundAtM,
  erodedReachM,
  reliefAtCell,
  ROCK_RELIEF,
  seabedSeed,
} from '../src/game/seabed.ts';
import {
  buildRoundedCells,
  forgetRoundedCells,
  ROUNDED_CELLS,
  type RoundedCells,
  roundedCellsOf,
  roundedDistances,
} from '../src/game/roundedCells.ts';
import {
  authoredFloorAtM,
  BIOME_FIELDS,
  buildHeightGrid,
  edgeRing,
  patchHeightGrid,
  DEPTH_VISUAL_M_PER_M,
  depthToWorldY,
  ERODED_VERTS_PER_CELL,
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
 * The free-water study's rounded ground (docs/free-water-slice.md §9, "Crater
 * walls"; seabed.ts `erodedGroundAtM`, roundedCells.ts). What the section
 * promises: the drawn floor, rock faces and roof are reshaped between cell
 * centres, the cells' staircase rounded; nothing is added to the authored
 * floor at a centre, and a solid cell stays rock at its centre; the drawn
 * step stays between the cells within a cell of it; within half a cell of the
 * roofed cut nothing rounds, and each jamb keeps its step; a straight run of
 * cells wanders rather than drawing a ruled line; the study's ink traces the
 * rounded ground (docs/map-visuals.md §4, the study's clause); the shipped
 * ground is untouched. The picture is the run-game frames' to review.
 */
describe('the rounded ground (docs/free-water-slice.md §9)', () => {
  const terrain = terrainFor(FREE_WATER_SLICE).serialize();
  const seed = seabedSeed(terrain);
  const rockTop = rockTopDepthM(terrain);
  const plain = buildHeightGrid(terrain, seed, rockTop);
  const eroded = buildHeightGrid(terrain, seed, rockTop, true);
  const { cols, rows, cellM } = terrain;
  const isRock = (i: number) => terrain.ceiling[i]! > terrain.floor[i]!;
  const cellAt = (x: number, y: number) =>
    Math.min(rows - 1, Math.max(0, Math.floor(y / cellM))) * cols +
    Math.min(cols - 1, Math.max(0, Math.floor(x / cellM)));
  /** The distance from a point to the nearest cell whose kind its test says is other. */
  const toOther = (x: number, y: number, other: (i: number) => boolean) => {
    let best = Number.POSITIVE_INFINITY;
    for (let i = 0; i < cols * rows; i++) {
      if (!other(i)) continue;
      const c = i % cols;
      const r = Math.floor(i / cols);
      const dx = Math.max(c * cellM - x, 0, x - (c + 1) * cellM);
      const dy = Math.max(r * cellM - y, 0, y - (r + 1) * cellM);
      best = Math.min(best, Math.hypot(dx, dy));
    }
    return best;
  };
  /** The kind a field's ground holds at a point: the one with the largest rounded distance. */
  const heldBy = (field: RoundedCells, x: number, y: number) => {
    const s = new Float64Array(field.kinds.length);
    roundedDistances(field, x, y, s);
    let best = 0;
    for (let k = 1; k < s.length; k++) if (s[k]! > s[best]!) best = k;
    return best;
  };
  /** The drawn biome at a point: the one whose drawn edge it lies furthest inside. */
  const drawnBiome = (biomeM: readonly number[]) =>
    biomeM.reduce((best, v, b) => (v > biomeM[best]! ? b : best), 0);

  it('is off unless asked: the shipped grid is the bilinear one to the bit', () => {
    assert.deepEqual([...buildHeightGrid(terrain, seed, rockTop, false).y], [...plain.y]);
    assert.deepEqual([...buildHeightGrid(terrain).y], [...plain.y]);
    assert.equal(plain.coast, undefined, 'a shipped grid carries no drawn coast');
    assert.equal(plain.biomes, undefined);
  });

  it('adds nothing to the authored floor at a cell centre, and a solid cell stays rock there', () => {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = (col + 0.5) * cellM;
        const y = (row + 0.5) * cellM;
        const i = row * cols + col;
        const g = erodedGroundAtM(terrain, rockTop, x, y);
        if (isRock(i)) {
          assert.equal(g.rockWeight, 1);
          assert.equal(g.stepM, rockTop);
          assert.ok(g.coastM > 0, `rock centre ${col},${row} is inside the drawn coast`);
          assert.equal(
            seabedDepthAtM(terrain, seed, rockTop, x, y, true),
            rockSurfaceDepthM(seed, rockTop, x, y)
          );
        } else {
          const biome = terrain.biomes[i] as Biome;
          assert.equal(g.rockWeight, 0);
          assert.equal(g.stepM, terrain.floor[i]);
          assert.equal(g.floorM, terrain.floor[i], 'the survey floor is the authored one');
          assert.ok(g.coastM < 0, `open centre ${col},${row} is outside the drawn coast`);
          assert.equal(drawnBiome(g.biomeM), biome, `centre ${col},${row} keeps its biome`);
          // The relief is the study's own: coral's benched, the rest as shipped.
          assert.equal(
            seabedDepthAtM(terrain, seed, rockTop, x, y, true),
            terrain.floor[i]! + benchedDetailM(x, y, seed, BIOME_RELIEF[biome])
          );
        }
      }
    }
  });

  it('reshapes the ground between centres: the positive control', () => {
    // Each shipped vertex against the study's vertex at the same point.
    const k = Math.round(plain.stepM / eroded.stepM);
    let moved = 0;
    for (let iz = 0; iz < plain.vertsZ; iz++) {
      for (let ix = 0; ix < plain.vertsX; ix++) {
        const a = plain.y[iz * plain.vertsX + ix]!;
        const b = eroded.y[iz * k * eroded.vertsX + ix * k]!;
        moved = Math.max(moved, Math.abs(a - b) / DEPTH_VISUAL_M_PER_M);
      }
    }
    assert.ok(moved > 100, `the drawn ground moved at most ${moved} m between centres`);
  });

  it('draws the study on a finer mesh, every shipped vertex among its own', () => {
    // docs/free-water-slice.md §9, "Crater walls": a curved scarp drawn
    // through vertices 62.5 m apart saw-tooths, so the study draws its ground
    // at `ERODED_VERTS_PER_CELL` a cell, and a shipped map keeps its density.
    assert.equal(plain.stepM, cellM / VERTS_PER_CELL);
    assert.equal(eroded.stepM, cellM / ERODED_VERTS_PER_CELL);
    assert.equal(eroded.vertsX, cols * ERODED_VERTS_PER_CELL + 1);
    assert.equal(eroded.vertsZ, rows * ERODED_VERTS_PER_CELL + 1);
    assert.equal(ERODED_VERTS_PER_CELL % VERTS_PER_CELL, 0);
  });

  it('stays between the shallowest and the deepest of the cells within a cell of it', () => {
    // A visual slope never opens a route the grid refuses
    // (docs/three-layer-ocean.md §5): the drawn step is never shallower than
    // every cell within a cell of it, nor deeper than every one. The four
    // centres the bilinear blends are not the bound: a rounded edge may cross
    // the line between two centres of other kinds, as the garden's does into
    // the bowl's cell at the pocket's north-west corner.
    const depthOf = (i: number) => (isRock(i) ? rockTop : terrain.floor[i]!);
    for (let y = 3; y < rows * cellM; y += 13) {
      for (let x = 3; x < cols * cellM; x += 13) {
        let lo = Number.POSITIVE_INFINITY;
        let hi = Number.NEGATIVE_INFINITY;
        for (let i = 0; i < cols * rows; i++) {
          const c = i % cols;
          const r = Math.floor(i / cols);
          const dx = Math.max(c * cellM - x, 0, x - (c + 1) * cellM);
          const dy = Math.max(r * cellM - y, 0, y - (r + 1) * cellM);
          if (Math.hypot(dx, dy) > cellM) continue;
          lo = Math.min(lo, depthOf(i));
          hi = Math.max(hi, depthOf(i));
        }
        const { stepM } = erodedGroundAtM(terrain, rockTop, x, y);
        assert.ok(
          stepM >= lo - 1e-6 && stepM <= hi + 1e-6,
          `${x},${y}: ${stepM} outside ${lo}–${hi}`
        );
      }
    }
  });

  it('tears no seam, a jamb its one step', () => {
    // The ground is continuous everywhere but where the rock meets the stone
    // over the roofed cut, whose curtain stands on the edge: across every
    // other point a centimetre apart the drawn surface moves less than a
    // steep scarp climbs in that width.
    const jamb = (x: number, y: number) =>
      y > 3000 && y < 3500 && (Math.abs(x - 1750) < 0.5 || Math.abs(x - 2250) < 0.5);
    let worst = 0;
    let where = '';
    for (let y = 1.3; y < rows * cellM; y += 17.9) {
      for (let x = 2.1; x < cols * cellM; x += 17.9) {
        if (jamb(x, y)) continue;
        const a = seabedDepthAtM(terrain, seed, rockTop, x, y, true);
        for (const [bx, by] of [
          [x + 0.01, y],
          [x, y + 0.01],
        ] as const) {
          if (jamb(bx, by)) continue;
          const d = Math.abs(a - seabedDepthAtM(terrain, seed, rockTop, bx, by, true));
          if (d > worst) [worst, where] = [d, `${x.toFixed(1)},${y.toFixed(1)}`];
        }
      }
    }
    assert.ok(worst < 1, `the ground jumps ${worst} m at ${where}`);
  });

  it('rounds the staircase, never moving an edge past the licence', () => {
    // docs/map-visuals.md §4, the study's clause: no edge moves as far as half
    // a cell. Wherever the drawn ground is not the kind its cell is, it lies
    // within the licence of a cell of the kind it is drawn as; and somewhere
    // it is not, or nothing was rounded.
    let moved = 0;
    for (let y = 5; y < rows * cellM; y += 7.7) {
      for (let x = 5; x < cols * cellM; x += 7.7) {
        const i = cellAt(x, y);
        const g = erodedGroundAtM(terrain, rockTop, x, y);
        const drawnRock = g.coastM > 0;
        if (drawnRock !== isRock(i)) {
          const d = toOther(x, y, (j) => isRock(j) === drawnRock);
          assert.ok(d <= ROUNDED_CELLS.LICENCE_M, `${x},${y}: drawn ${d} m past its cells`);
          moved = Math.max(moved, d);
        } else if (!drawnRock) {
          const biome = drawnBiome(g.biomeM);
          if (biome !== terrain.biomes[i]) {
            const d = toOther(x, y, (j) => !isRock(j) && terrain.biomes[j] === biome);
            assert.ok(d <= ROUNDED_CELLS.LICENCE_M, `${x},${y}: biome ${d} m past its cells`);
            moved = Math.max(moved, d);
          }
        }
      }
    }
    assert.ok(moved > 25, `the rounding moved an edge at most ${moved} m`);
    assert.ok(ROUNDED_CELLS.LICENCE_M < cellM / 2, 'the licence stays under half a cell');
    assert.ok(ROUNDED_CELLS.CENTRE_BEND_M < cellM / 2, 'no two centres bend the same edge');
    assert.equal(erodedReachM(), ROUNDED_CELLS.CENTRE_MARGIN_M);
  });

  it("draws the bowl's rim near its authored circle, where the cells stair round it", () => {
    // The bowl is authored as an ellipse of 1,250 m radius about 2,250 / 2,250
    // (freeWaterSlice.ts). From that centre, ray by ray across its east and
    // west sides, the radius at which the bowl's kelp gives way to the rim's
    // coral. Read off the cells it stairs more than half a cell off the circle
    // and kinks at every corner of the stair. Rounded, it stays near the
    // circle and turns without a kink; every centre's margin bends it where a
    // centre stands close to the circle, so it does not lie on it. Wandered,
    // as it is drawn, it leaves the circle by the wander besides, which is the
    // wander's purpose, and still turns without a kink. A kink is the second
    // difference over rays half a degree apart.
    const centre = { x: 2250, y: 2250 };
    const radius = 1250;
    const rim = (inCoral: (x: number, y: number) => boolean, deg: number) => {
      const theta = (deg * Math.PI) / 180;
      for (let r = 900; r < 1700; r += 1) {
        if (inCoral(centre.x + r * Math.cos(theta), centre.y + r * Math.sin(theta))) return r;
      }
      return Number.NaN;
    };
    const cells = (x: number, y: number) => terrain.biomes[cellAt(x, y)] === Biome.CoralRuins;
    const held = (field: RoundedCells) => (x: number, y: number) => {
      const kind = field.kinds[heldBy(field, x, y)]!;
      return !kind.rock && kind.biome === Biome.CoralRuins;
    };
    const drawn = (x: number, y: number) => {
      const g = erodedGroundAtM(terrain, rockTop, x, y);
      return g.coastM < 0 && drawnBiome(g.biomeM) === Biome.CoralRuins;
    };
    const readings = [cells, held(buildRoundedCells(terrain, 0)), drawn].map((inCoral) => {
      const reading = { off: 0, kink: 0 };
      // Past 45 degrees south of east the ray meets the wall's rock, and past
      // 150 and 210 degrees the wall's coast and the garden's, where three
      // kinds meet, rather than the bowl's own. Within them, the east lobes
      // at ±45 degrees, where the cells stand furthest off the circle.
      for (const [from, to] of [
        [-45, 45],
        [150, 210],
      ] as const) {
        const radii: number[] = [];
        for (let deg = from; deg <= to; deg += 0.5) radii.push(rim(inCoral, deg));
        for (let i = 0; i < radii.length; i++) {
          reading.off = Math.max(reading.off, Math.abs(radii[i]! - radius));
          if (i === 0 || i === radii.length - 1) continue;
          reading.kink = Math.max(
            reading.kink,
            Math.abs(radii[i - 1]! - 2 * radii[i]! + radii[i + 1]!)
          );
        }
      }
      return reading;
    });
    const [onCells, rounded, wandered] = readings as [
      (typeof readings)[0],
      (typeof readings)[0],
      (typeof readings)[0],
    ];
    const said = JSON.stringify({ onCells, rounded, wandered });
    assert.ok(onCells.off > cellM / 2 - 5, `the premise, the cells' stair: ${said}`);
    assert.ok(rounded.off < 50, `the rounded rim strays from the circle: ${said}`);
    assert.ok(rounded.kink < onCells.kink / 3, `the rounded rim kinks: ${said}`);
    assert.ok(wandered.off <= rounded.off + ROUNDED_CELLS.WANDER_M, `the wander's bound: ${said}`);
    assert.ok(wandered.kink < onCells.kink / 3, `the drawn rim kinks: ${said}`);
  });

  it("wanders the garden's north edge, a ruled line on the cells and rounded alone", () => {
    // The garden is authored as a rectangle, so its north edge is a straight
    // run of eight cells along y = 500, and rounding moves a straight run
    // nowhere: from the survey dolly the garden read as a box with its
    // corners off (#1774). Drawn, the edge between the garden's kelp and the
    // rim's coral, the line the dashed coast inks, bows either side of that
    // line, inside the wander.
    const edgeY = 500;
    const inGarden = (x: number, y: number) => {
      const g = erodedGroundAtM(terrain, rockTop, x, y);
      return drawnBiome(g.biomeM) === Biome.KelpForest;
    };
    const off: number[] = [];
    // Clear of the corners, which the rounding has already cut.
    for (let x = 1375; x <= 2625; x += 12.5) {
      let y = edgeY - cellM / 2;
      while (!inGarden(x, y)) y += 1;
      off.push(y - edgeY);
    }
    const least = Math.min(...off);
    const most = Math.max(...off);
    const said = `from ${least} to ${most} m`;
    assert.ok(most > 10 && least < -10, `the edge keeps to one side of its line: ${said}`);
    assert.ok(
      most <= ROUNDED_CELLS.WANDER_M + 1 && least >= -ROUNDED_CELLS.WANDER_M - 1,
      `the edge strays past the wander: ${said}`
    );
    // And it turns without a kink: no step between rays 12.5 m apart.
    for (let i = 1; i < off.length; i++) {
      assert.ok(Math.abs(off[i]! - off[i - 1]!) <= 12.5, `a kink at x=${1375 + 12.5 * i}`);
    }
  });

  it('leaves no long side ruled: the garden, the pocket and the bowl each bow', () => {
    // Value noise has calm stretches, and a seed can lay one along a whole
    // side: the first field tried left the garden's south side within 12 m
    // of its line. `WANDER_SEED` was picked so that each long straight run of
    // the study's cells bows, and this holds it: along each, the wander alone
    // carries the edge across a span of 40 m or more. The edge is read on the
    // field, since the garden and the bowl are one biome and draw no coast
    // between them, only the scarp.
    const rounded = buildRoundedCells(terrain, 0);
    const wandered = roundedCellsOf(terrain);
    // Each run: the axis it lies along, its ends, its line, and which way is in.
    const runs = [
      ["the garden's north side", 'x', 1300, 2700, 500, 1],
      ["the garden's south side", 'x', 1300, 2700, 1500, -1],
      ["the garden's west side", 'y', 700, 1300, 1000, 1],
      ["the garden's east side", 'y', 700, 1300, 3000, -1],
      ["the pocket's west side", 'y', 1900, 2600, 1500, 1],
      ["the pocket's east side", 'y', 1900, 2600, 3000, -1],
      ["the bowl's west side", 'y', 1900, 2600, 1000, 1],
      ["the bowl's east side", 'y', 1900, 2600, 3500, -1],
    ] as const;
    const half = cellM / 2 - 1;
    for (const [name, axis, from, to, line, inward] of runs) {
      /** How far out of its line the edge stands at `t` along the run, metres, outward positive. */
      const edge = (field: RoundedCells, t: number) => {
        const at = (d: number) =>
          axis === 'x' ? heldBy(field, t, line + inward * d) : heldBy(field, line + inward * d, t);
        const inside = at(half);
        let d = half;
        while (d > -half && at(d) === inside) d -= 1;
        return -d;
      };
      let least = Number.POSITIVE_INFINITY;
      let most = Number.NEGATIVE_INFINITY;
      for (let t = from; t <= to; t += 25) {
        const moved = edge(wandered, t) - edge(rounded, t);
        least = Math.min(least, moved);
        most = Math.max(most, moved);
      }
      assert.ok(most - least >= 40, `${name} is carried from ${least} to ${most} m: still ruled`);
    }
  });

  it('sheds no island: wandered, each kind holds as many pieces as rounded', () => {
    // A warp steeper than one folds the ground over itself, and an edge then
    // cusps or pinches a piece off. The warp's own slope is held on the plan
    // (roundedCells.test.ts); here, with its amplitude rising and falling
    // across the study as the licence allows, every kind's ground is still
    // the pieces the rounding left it in.
    const pieces = (field: RoundedCells) => {
      const stepM = 12.5;
      const nx = Math.round((cols * cellM) / stepM);
      const ny = Math.round((rows * cellM) / stepM);
      const held = new Int16Array(nx * ny);
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          held[j * nx + i] = heldBy(field, (i + 0.5) * stepM, (j + 0.5) * stepM);
        }
      }
      const count = new Array<number>(field.kinds.length).fill(0);
      const seen = new Uint8Array(nx * ny);
      const stack: number[] = [];
      for (let start = 0; start < nx * ny; start++) {
        if (seen[start]) continue;
        const kind = held[start]!;
        count[kind]!++;
        seen[start] = 1;
        stack.push(start);
        while (stack.length > 0) {
          const at = stack.pop()!;
          const i = at % nx;
          const j = Math.floor(at / nx);
          for (const [di, dj] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const [ni, nj] = [i + di, j + dj];
            if (ni < 0 || nj < 0 || ni >= nx || nj >= ny) continue;
            const next = nj * nx + ni;
            if (seen[next] || held[next] !== kind) continue;
            seen[next] = 1;
            stack.push(next);
          }
        }
      }
      return count;
    };
    const rounded = pieces(buildRoundedCells(terrain, 0));
    assert.deepEqual(pieces(roundedCellsOf(terrain)), rounded);
    assert.ok(
      rounded.some((n) => n > 1),
      'the premise: some kind is in pieces, the bowl either side of the pocket'
    );
  });

  it('holds the cell edges within half a cell of the roofed cut', () => {
    // The roof stands its curtains on the cut's cell edges (passages.ts), so
    // nothing rounds there: every kind's move is nothing within the hold.
    const field = roundedCellsOf(terrain);
    let checked = 0;
    for (let iz = 0; iz < field.nz; iz++) {
      for (let ix = 0; ix < field.nx; ix++) {
        const x = ix * field.stepM;
        const y = iz * field.stepM;
        const dx = Math.max(1750 - x, 0, x - 2250);
        const dy = Math.max(3000 - y, 0, y - 3500);
        if (Math.hypot(dx, dy) > ROUNDED_CELLS.ROOF_HOLD_CELLS * cellM) continue;
        for (const moves of field.moves) assert.ok(moves[iz * field.nx + ix] === 0, `${x},${y}`);
        checked++;
      }
    }
    assert.ok(checked > 100);
  });

  it('keeps the step on the edge against the stone over a roofed passage', () => {
    // The cut's west jamb: rock at col 6, the roofed cells at col 7, rows 12
    // and 13. The roof stands a curtain on x = 1,750 (passages.ts), so the
    // face is not set back from it: stone to the edge, the passage floor from
    // it, the whole step in no width. Near the wall's north edge the stone
    // side is still on the north face, which runs into the jamb.
    for (const y of [3062.5, 3125, 3187.5, 3250, 3375]) {
      const stone = erodedGroundAtM(terrain, rockTop, 1749.99, y);
      const passage = erodedGroundAtM(terrain, rockTop, 1750, y);
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

  it('gives a wall a foot in the water and a lip in the stone', () => {
    // The southern wall's north face at x = 1,625 (col 6's centre line): open
    // bowl at row 11, rock at row 12, the edge at y = 3,000, held on it by the
    // cut beside. The rock's share rises from the water side of the edge to
    // the stone side across the reach, and the face climbs from a gentle foot
    // to a steep lip.
    const x = 1625;
    const reach = erodedReachM();
    const at = (y: number) => erodedGroundAtM(terrain, rockTop, x, y);
    const runs: string[] = [];
    let stoneFrom = Infinity;
    for (let y = 2875; y <= 3125; y += 1) {
      const w = at(y).rockWeight;
      const kind = w === 0 ? 'water' : w === 1 ? 'stone' : 'face';
      if (runs.at(-1) !== kind) runs.push(kind);
      if (kind === 'stone') stoneFrom = Math.min(stoneFrom, y);
    }
    assert.deepEqual(runs, ['water', 'face', 'stone']);
    assert.ok(stoneFrom > 3000 && stoneFrom <= 3000 + reach + 1, `stone from y=${stoneFrom}`);
    assert.equal(at(3000 - reach - 1).rockWeight, 0, 'water before the foot');
    // A gentle foot, a steep lip: the step's climb over the face's first
    // quarter is less than over its last.
    const climb = (a: number, b: number) => at(a).stepM - at(b).stepM;
    assert.ok(climb(3000 - reach, 3000 - reach / 2) < climb(3000 + reach / 2, 3000 + reach));
    assert.equal(
      seabedDepthAtM(terrain, seed, rockTop, x, stoneFrom, true),
      rockSurfaceDepthM(seed, rockTop, x, stoneFrom),
      'stone past the lip is the rock surface, crag and all'
    );
  });

  it("carries the ink's fields: the rounded survey floor, the coast and each biome's edge", () => {
    // docs/map-visuals.md §4, the study's clause: the isobaths contour the
    // drawn floor without its relief, and the coastlines run where the drawn
    // ground changes kind, at every vertex the same reading as the ground's.
    const { vertsX, vertsZ, stepM } = eroded;
    for (let iz = 0; iz < vertsZ; iz += 3) {
      for (let ix = 0; ix < vertsX; ix += 3) {
        const i = iz * vertsX + ix;
        const g = erodedGroundAtM(terrain, rockTop, ix * stepM, iz * stepM);
        assert.equal(eroded.floor[i], Math.fround(g.floorM));
        assert.equal(eroded.coast![i], Math.fround(g.coastM));
        for (let b = 0; b < BIOME_FIELDS; b++) {
          assert.equal(eroded.biomes![i * BIOME_FIELDS + b], Math.fround(g.biomeM[b]!));
        }
      }
    }
    // And the shipped grid keeps the authored floor's bilinear.
    for (let i = 0; i < plain.floor.length; i += 97) {
      const x = (i % plain.vertsX) * plain.stepM;
      const y = Math.floor(i / plain.vertsX) * plain.stepM;
      assert.equal(plain.floor[i], Math.fround(authoredFloorAtM(terrain, x, y)));
    }
  });

  it('reads the public cells and nothing else (docs/map-visuals.md §4, rule 2)', () => {
    // The rounding is a function of each cell's floor, ceiling and biome: the
    // same cells in a fresh payload round the same, and one cell changed
    // moves it.
    const copy: TerrainPayload = JSON.parse(JSON.stringify(terrain));
    const a = buildRoundedCells(terrain);
    const b = buildRoundedCells(copy);
    assert.deepEqual(
      a.moves.map((m) => [...m]),
      b.moves.map((m) => [...m])
    );
    copy.floor[7 * cols + 7] = 2600;
    const c = buildRoundedCells(copy);
    assert.notDeepEqual(
      a.moves.map((m) => [...m]),
      c.moves.map((m) => [...m])
    );
  });

  it('patches a ground delta into the grid a full eroded build would make (#434)', () => {
    const grid = buildHeightGrid(terrain, seed, rockTop, true);
    const after = { ...terrain, floor: [...terrain.floor], ceiling: [...terrain.ceiling] };
    after.floor[7 * cols + 7] = 2600; // the bowl's floor drops
    after.ceiling[11 * cols + 5] = 3000; // a bowl cell becomes rock
    after.floor[11 * cols + 5] = 1500;
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
    assert.deepEqual([...grid.floor], [...fresh.floor]);
    assert.deepEqual([...grid.coast!], [...fresh.coast!]);
    assert.deepEqual([...grid.biomes!], [...fresh.biomes!]);
    // The rounding reads cells several away, so the study re-reads it whole.
    assert.deepEqual(span, { first: 0, last: grid.vertsX * grid.vertsZ - 1 });
  });

  it('forgets a terrain changed in place, and reads it afresh', () => {
    // The view changes its cells in place on a ground delta (PerspectiveView
    // `applyGround`) and forgets the rounding first; a reader that kept it
    // would round the cells the map no longer has.
    const local = terrainFor(FREE_WATER_SLICE).serialize();
    const before = erodedGroundAtM(local, rockTop, 1375, 2875).stepM;
    local.ceiling[11 * cols + 5] = 3000;
    assert.equal(erodedGroundAtM(local, rockTop, 1375, 2875).stepM, before, 'held until forgotten');
    forgetRoundedCells(local);
    assert.equal(erodedGroundAtM(local, rockTop, 1375, 2875).stepM, rockTop, 'the new rock');
  });

  it('benches coral within one step of the field it cuts, centred, and nothing else', () => {
    const coral = BIOME_RELIEF[Biome.CoralRuins];
    const raw = (x: number, y: number) => detailM(x, y, seed, coral.amplitudeM, coral.roughness, 0);
    let worst = 0;
    let rawSum = 0;
    let benchSum = 0;
    let n = 0;
    for (let y = 0; y < 4000; y += 13.1) {
      for (let x = 0; x < 4000; x += 13.1) {
        const b = benchedDetailM(x, y, seed, coral);
        worst = Math.max(worst, Math.abs(b - raw(x, y)));
        rawSum += raw(x, y);
        benchSum += b;
        n++;
      }
    }
    assert.ok(worst <= ERODED_EDGES.BENCH_M, `a bench strays ${worst} m from the field`);
    assert.ok(worst > ERODED_EDGES.BENCH_M / 3, 'the positive control: the benches cut');
    assert.ok(Math.abs(benchSum - rawSum) / n < 1, 'the benches average to the field they cut');
    // Every other biome's relief is the shipped field, untouched.
    for (const biome of [Biome.KelpForest, Biome.AbyssalTrench, Biome.OpenWater]) {
      const r = BIOME_RELIEF[biome];
      for (const [x, y] of [
        [100, 200],
        [1234, 2345],
        [3999, 17],
      ] as const) {
        assert.equal(
          benchedDetailM(x, y, seed, r),
          detailM(x, y, seed, r.amplitudeM, r.roughness, r.blockiness)
        );
      }
    }
  });
});
