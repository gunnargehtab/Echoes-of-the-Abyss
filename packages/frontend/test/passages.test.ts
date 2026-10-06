/**
 * Roofed passages in the conn view (#1105): docs/three-layer-ocean.md §5 and
 * docs/art-direction.md "Reading the Sea Floor".
 *
 * What these hold is the shape the two sections promise, not how it looks:
 * a passage is one route mouth to mouth along its own axis, its roof is stone
 * at the rock top, a mouth is a lintel stopping at the ceiling with the hole
 * beneath it, a side against shallower ground is closed down to the
 * heightfield, and only a hull under the ceiling opens a roof. The picture is
 * the run-game screenshot's to review.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Biome } from '@echoes/shared';
import {
  buildRoofGeometry,
  isRoofed,
  roofedPassages,
  roofOver,
  ROOF_OPEN_OPACITY,
} from '../src/game/passages.ts';
import {
  buildHeightGrid,
  depthToWorldY,
  rockSurfaceDepthM,
  rockTopDepthM,
  VERTS_PER_CELL,
} from '../src/game/perspectiveTerrain.ts';
import { seabedSeed } from '../src/game/seabed.ts';
import type { TerrainPayload } from '../src/net/GameClient.ts';

const CELL = 250;

/**
 * An 8×6 map shaped like the Ventfront's flanking slot: a shallow divider
 * (cols 3–5, floor 380) with an east–west tunnel bored through it (rows 2–3,
 * ceiling 520, floor 1400), open water at 1,800 m either side, and one rock
 * cell north of the divider.
 */
function slotTerrain(): TerrainPayload {
  const cols = 8;
  const rows = 6;
  const biomes = new Array(cols * rows).fill(Biome.OpenWater);
  const floor = new Array(cols * rows).fill(1800);
  const ceiling = new Array(cols * rows).fill(0);
  for (let row = 0; row < rows; row++) {
    for (let col = 3; col <= 5; col++) {
      const i = row * cols + col;
      biomes[i] = Biome.CoralRuins;
      floor[i] = 380;
      if (row === 2 || row === 3) {
        ceiling[i] = 520;
        floor[i] = 1400;
      }
    }
  }
  floor[0 * cols + 4] = 2000;
  ceiling[0 * cols + 4] = 3000; // rock
  return { cols, rows, cellM: CELL, biomes, floor, ceiling };
}

/** A north–south passage three cells wide and six long, like the Kelp Labyrinth's. */
function wallTerrain(): TerrainPayload {
  const cols = 6;
  const rows = 10;
  const biomes = new Array(cols * rows).fill(Biome.OpenWater);
  const floor = new Array(cols * rows).fill(2000);
  const ceiling = new Array(cols * rows).fill(0);
  for (let row = 2; row <= 7; row++) {
    for (let col = 1; col <= 3; col++) {
      ceiling[row * cols + col] = 700;
      floor[row * cols + col] = 1800;
    }
  }
  return { cols, rows, cellM: CELL, biomes, floor, ceiling };
}

describe('roofed passages', () => {
  it('groups roofed cells by shared edges, never rock or open water', () => {
    const terrain = slotTerrain();
    const { list, of } = roofedPassages(terrain);
    assert.equal(list.length, 1, 'the slot is one passage');
    assert.deepEqual(list[0]!.cells, [19, 20, 21, 27, 28, 29]);
    assert.equal(of[4], -1, 'rock is not a passage');
    assert.equal(of[0], -1, 'open water is not a passage');
    assert.ok(!isRoofed(terrain, 4) && !isRoofed(terrain, 0) && isRoofed(terrain, 19));
  });

  it('splits two passages that only touch at a corner', () => {
    const terrain = slotTerrain();
    const ceiling = [...terrain.ceiling];
    const floor = [...terrain.floor];
    // A one-cell pocket diagonal to the slot's north-east corner.
    ceiling[1 * 8 + 6] = 600;
    floor[1 * 8 + 6] = 1800;
    const { list } = roofedPassages({ ...terrain, ceiling, floor });
    assert.equal(list.length, 2, 'a hull cannot cross a corner, so neither can a route');
  });

  it('runs the route mouth to mouth along the passage, whichever way it lies', () => {
    const slot = roofedPassages(slotTerrain()).list[0]!.route;
    assert.deepEqual(slot[0], { xM: 3 * CELL, yM: 3 * CELL }, 'west mouth, mid-slot');
    assert.deepEqual(slot.at(-1), { xM: 6 * CELL, yM: 3 * CELL }, 'east mouth, mid-slot');
    assert.ok(
      slot.every((p) => p.yM === 3 * CELL),
      'an east-west slot runs east-west'
    );

    // The defect #1105 names: the old line ran east-west over every roofed
    // cell, so a north-south passage read as hatching across itself.
    const wall = roofedPassages(wallTerrain()).list[0]!.route;
    assert.deepEqual(wall[0], { xM: 2.5 * CELL, yM: 2 * CELL }, 'north mouth');
    assert.deepEqual(wall.at(-1), { xM: 2.5 * CELL, yM: 8 * CELL }, 'south mouth');
    assert.ok(
      wall.every((p) => p.xM === 2.5 * CELL),
      'a north-south passage runs north-south'
    );
  });

  it('follows a passage that bends rather than chording it', () => {
    const terrain = wallTerrain();
    const ceiling = [...terrain.ceiling];
    const floor = [...terrain.floor];
    // Shift the southern half one column east.
    for (let row = 5; row <= 7; row++) {
      ceiling[row * 6 + 1] = 0;
      floor[row * 6 + 1] = 2000;
      ceiling[row * 6 + 4] = 700;
      floor[row * 6 + 4] = 1800;
    }
    const route = roofedPassages({ ...terrain, ceiling, floor }).list[0]!.route;
    assert.equal(route[0]!.xM, 2.5 * CELL, 'starts on the northern half');
    assert.equal(route.at(-1)!.xM, 3.5 * CELL, 'ends on the southern half');
  });
});

describe('the roof over a passage', () => {
  const terrain = slotTerrain();
  const seed = seabedSeed(terrain);
  const rockTop = rockTopDepthM(terrain);
  const grid = buildHeightGrid(terrain, seed, rockTop);
  const passage = roofedPassages(terrain).list[0]!;
  const roof = buildRoofGeometry(terrain, passage, grid, seed, rockTop);
  const vertices = Array.from({ length: roof.positions.length / 3 }, (_, i) => ({
    x: roof.positions[i * 3]!,
    y: roof.positions[i * 3 + 1]!,
    z: roof.positions[i * 3 + 2]!,
  }));
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-3;

  it('stands its top on the rock surface, where a mesa beside it would', () => {
    // Every vertex of the top grid of the slot's first cell.
    const x0 = 3 * CELL;
    const z0 = 2 * CELL;
    const step = CELL / VERTS_PER_CELL;
    for (let iz = 0; iz <= VERTS_PER_CELL; iz++) {
      for (let ix = 0; ix <= VERTS_PER_CELL; ix++) {
        const x = x0 + ix * step;
        const z = z0 + iz * step;
        const want = depthToWorldY(rockSurfaceDepthM(seed, rockTop, x, z));
        assert.ok(
          vertices.some((v) => close(v.x, x) && close(v.z, z) && close(v.y, want)),
          `a top vertex at (${x}, ${z}) on the rock surface`
        );
      }
    }
    assert.ok(rockTop < 380, 'and the rock top is above the divider the slot is bored through');
  });

  it('opens a mouth under a lintel that stops at the ceiling', () => {
    // The west mouth: x = 750, the slot's two rows. Its lowest vertex is the
    // ceiling, and nothing of the roof reaches below it there.
    const mouth = vertices.filter((v) => close(v.x, 3 * CELL) && v.z > 2 * CELL && v.z < 4 * CELL);
    const lowest = Math.min(...mouth.map((v) => v.y));
    assert.ok(close(lowest, depthToWorldY(520)), 'the lintel ends at the ceiling depth');
    // The floor under it is deeper still: that gap is the hole.
    const floorY = grid.y[3 * VERTS_PER_CELL * grid.vertsX + 3 * VERTS_PER_CELL]!;
    assert.ok(floorY < lowest - 50, 'the heightfield under the lintel is well below it');
  });

  it('closes a side against ground shallower than its ceiling, down to the heightfield', () => {
    // The north side at z = 500 meets the divider at 380 m: a curtain whose
    // foot is the heightfield's own vertex, so no slit opens under it.
    const iz = 2 * VERTS_PER_CELL;
    for (let ix = 3 * VERTS_PER_CELL; ix <= 6 * VERTS_PER_CELL; ix++) {
      const x = ix * grid.stepM;
      const z = iz * grid.stepM;
      const footY = grid.y[iz * grid.vertsX + ix]!;
      assert.ok(
        vertices.some((v) => close(v.x, x) && close(v.z, z) && close(v.y, footY)),
        `the curtain reaches the ground at (${x}, ${z})`
      );
    }
  });

  it('draws nothing against rock, whose mesa is already the wall', () => {
    const terrain2 = slotTerrain();
    const ceiling = [...terrain2.ceiling];
    const floor = [...terrain2.floor];
    for (const col of [3, 4, 5]) {
      ceiling[1 * 8 + col] = 3000;
      floor[1 * 8 + col] = 2000;
    }
    const rocky = { ...terrain2, ceiling, floor };
    const rockyGrid = buildHeightGrid(rocky, seed, rockTop);
    const rockyRoof = buildRoofGeometry(
      rocky,
      roofedPassages(rocky).list[0]!,
      rockyGrid,
      seed,
      rockTop
    );
    assert.ok(
      rockyRoof.indices.length < roof.indices.length,
      'the north curtain is gone once rock stands there'
    );
  });

  it('spends a few hundred triangles a cell, not thousands', () => {
    const triangles = roof.indices.length / 3;
    const cells = passage.cells.length;
    // Top 32, underside 2, and at most 8 per side over four sides.
    assert.ok(triangles <= cells * (32 + 2 + 4 * 8), `${triangles} triangles over ${cells} cells`);
    assert.equal(roof.colors.length, roof.positions.length, 'one colour per vertex');
  });

  it('is stone: the rock ramp, darker than any biome fill', () => {
    for (let i = 0; i < roof.colors.length; i += 3) {
      const [r, g, b] = [roof.colors[i]!, roof.colors[i + 1]!, roof.colors[i + 2]!];
      assert.ok(Math.max(r, g, b) < 0.12, `stone stays below the palest fill (${r}, ${g}, ${b})`);
    }
  });
});

describe('opening a roof', () => {
  const terrain = slotTerrain();
  const passages = roofedPassages(terrain);

  it('answers for a hull inside the passage at or below its ceiling', () => {
    assert.equal(roofOver(terrain, passages, 4.5 * CELL, 2.5 * CELL, 900), 0);
    assert.equal(roofOver(terrain, passages, 4.5 * CELL, 2.5 * CELL, 520), 0, 'at the ceiling');
  });

  it('answers -1 above the ceiling, beside the passage and off the map', () => {
    assert.equal(roofOver(terrain, passages, 4.5 * CELL, 2.5 * CELL, 300), -1);
    assert.equal(roofOver(terrain, passages, 1.5 * CELL, 2.5 * CELL, 900), -1);
    assert.equal(roofOver(terrain, passages, -10, 2.5 * CELL, 900), -1);
  });

  it('turns a roof to glass rather than removing it', () => {
    assert.ok(ROOF_OPEN_OPACITY > 0 && ROOF_OPEN_OPACITY < 1);
  });
});
