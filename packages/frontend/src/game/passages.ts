/**
 * Roofed passages in the conn view — docs/three-layer-ocean.md §5 and
 * docs/art-direction.md "Reading the Sea Floor" (#1105).
 *
 * A roofed cell is water between a ceiling and a floor, and the column above
 * the ceiling is no water at all (docs/systems-depth.md §1). The heightfield
 * draws the floor, which is the inside of the passage; this module stands the
 * roof up over it as stone, risen to the same rock top a mesa has, and says
 * where the route runs.
 *
 * Pure data, like perspectiveTerrain.ts: no three.js, so the shapes are
 * testable under node and the view stays a dumb consumer. Render-only by the
 * same rule: the simulation never reads any of it, and the server's cells
 * stay the only truth about where a hull fits.
 *
 * Everything here is public map data. The roof says a passage exists; who is
 * in it is not this module's to know, and the view opens a roof only for its
 * own hulls.
 */

import type { TerrainPayload } from '../net/GameClient.ts';
import { reliefTextureGain, ROCK_FACE, ROCK_SHADOW } from './palette.ts';
import {
  depthToWorldY,
  type HeightGrid,
  rockSurfaceDepthM,
  ROCK_RISE_ABOVE_SHALLOWEST_M,
  VERTS_PER_CELL,
} from './perspectiveTerrain.ts';
import { ROCK_EDGE_GAIN } from './seabed.ts';

type Terrain = Pick<TerrainPayload, 'cols' | 'rows' | 'cellM' | 'floor' | 'ceiling'>;

/**
 * TUNABLE — a roof's opacity while one of your own hulls is under it
 * (docs/art-direction.md, "Reading the Sea Floor"). Low enough that the hull,
 * its plumb and its shadow read through it at the home dolly; high enough
 * that the ridge still reads as a ridge, so the passage does not seem to
 * vanish the moment you enter it.
 */
export const ROOF_OPEN_OPACITY = 0.3;

/** Ground that admits nothing at any depth: a ceiling below the floor. */
function isRock(terrain: Terrain, index: number): boolean {
  return terrain.ceiling[index]! > terrain.floor[index]!;
}

/** Water with something over it: a ceiling deeper than 0 that is not rock. */
export function isRoofed(terrain: Terrain, index: number): boolean {
  return terrain.ceiling[index]! > 0 && !isRock(terrain, index);
}

/** A point on a route, in world metres on the map plane. */
export interface RoutePoint {
  xM: number;
  yM: number;
}

export interface Passage {
  /** Its roofed cells, ascending. */
  cells: number[];
  /**
   * The line the map marks it with, mouth to mouth along its longer axis.
   * One point per slice across that axis, at the mean of the slice's cell
   * centres, so a passage that bends is followed rather than chorded; the
   * two ends sit on the passage's outer edges, where the mouths are.
   */
  route: RoutePoint[];
}

export interface Passages {
  list: Passage[];
  /** Per cell, the index into `list` of its passage, or -1. */
  of: Int32Array;
}

/**
 * Every roofed passage on the map: the roofed cells grouped by edge-sharing
 * neighbours. Edges and not corners, because a hull crosses between cells
 * through an edge, and two tunnels that only touch at a corner are two routes.
 */
export function roofedPassages(terrain: Terrain): Passages {
  const { cols, rows } = terrain;
  const of = new Int32Array(cols * rows).fill(-1);
  const list: Passage[] = [];
  for (let start = 0; start < cols * rows; start++) {
    if (of[start] !== -1 || !isRoofed(terrain, start)) continue;
    const id = list.length;
    const cells: number[] = [];
    const stack = [start];
    of[start] = id;
    while (stack.length > 0) {
      const index = stack.pop()!;
      cells.push(index);
      const row = Math.floor(index / cols);
      const col = index % cols;
      const neighbours = [
        row > 0 ? index - cols : -1,
        row < rows - 1 ? index + cols : -1,
        col > 0 ? index - 1 : -1,
        col < cols - 1 ? index + 1 : -1,
      ];
      for (const n of neighbours) {
        if (n === -1 || of[n] !== -1 || !isRoofed(terrain, n)) continue;
        of[n] = id;
        stack.push(n);
      }
    }
    cells.sort((a, b) => a - b);
    list.push({ cells, route: routeOf(terrain, cells) });
  }
  return { list, of };
}

/**
 * The route through one passage. The longer side of its bounding box is the
 * way through: a tunnel is longer than it is wide, which is what makes it a
 * tunnel. A square one runs east to west, since it has no better answer.
 */
function routeOf(terrain: Terrain, cells: readonly number[]): RoutePoint[] {
  const { cols, cellM } = terrain;
  let col0 = Infinity;
  let col1 = -Infinity;
  let row0 = Infinity;
  let row1 = -Infinity;
  for (const index of cells) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    col0 = Math.min(col0, col);
    col1 = Math.max(col1, col);
    row0 = Math.min(row0, row);
    row1 = Math.max(row1, row);
  }
  const alongX = col1 - col0 >= row1 - row0;

  // Slice by slice along the axis: the mean of the cross-axis cell centres.
  const slices = new Map<number, { sum: number; n: number }>();
  for (const index of cells) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const key = alongX ? col : row;
    const cross = (alongX ? row : col) + 0.5;
    const slice = slices.get(key);
    if (slice === undefined) slices.set(key, { sum: cross, n: 1 });
    else {
      slice.sum += cross;
      slice.n++;
    }
  }
  const keys = [...slices.keys()].sort((a, b) => a - b);
  const point = (along: number, cross: number): RoutePoint =>
    alongX ? { xM: along * cellM, yM: cross * cellM } : { xM: cross * cellM, yM: along * cellM };
  const crossAt = (key: number) => slices.get(key)!.sum / slices.get(key)!.n;

  const route = [point(keys[0]!, crossAt(keys[0]!))];
  for (const key of keys) route.push(point(key + 0.5, crossAt(key)));
  route.push(point(keys[keys.length - 1]! + 1, crossAt(keys[keys.length - 1]!)));
  return route;
}

/**
 * The depth a passage's roof tops out at, before the crag: the map's rock
 * top, or `ROCK_RISE_ABOVE_SHALLOWEST_M` above the passage's shallowest
 * ceiling, whichever is shallower.
 *
 * The rock top alone is not enough. It is measured from the shallowest
 * *open floor*, and a map whose every floor lies deeper than a roof — the
 * Kelp Labyrinth's are all 1,800 m or more over a 700 m ceiling — puts it
 * below the ceiling, which drew the roof upside down on the passage floor.
 * A roof is the water's lid, so it stands above the water it lids by the
 * same rise a mesa stands above the floors.
 */
export function roofTopDepthM(terrain: Terrain, passage: Passage, rockTopM: number): number {
  let ceiling = Infinity;
  for (const index of passage.cells) ceiling = Math.min(ceiling, terrain.ceiling[index]!);
  return Math.max(0, Math.min(rockTopM, ceiling - ROCK_RISE_ABOVE_SHALLOWEST_M));
}

/** The roof's skin, in display (sRGB) terms; the view converts it to linear. */
export interface RoofGeometry {
  positions: Float32Array;
  /** Per vertex, sRGB 0–1: the stone before the veil touches it. */
  colors: Float32Array;
  indices: Uint32Array;
}

const rgb = (hex: number): [number, number, number] => [
  ((hex >> 16) & 0xff) / 255,
  ((hex >> 8) & 0xff) / 255,
  (hex & 0xff) / 255,
];

/**
 * The stone over one passage, as one indexed triangle list.
 *
 * - **The top** is the rock surface at `roofTopDepthM`, at the heightfield's
 *   own vertex step: a roof is rock (docs/style-neon-noir.md "The stone"),
 *   and on most maps it tops out exactly where a mesa does. Shaded by the
 *   crag the way the bake shades a mesa, and darkened at its rim.
 * - **The sides**, one per cell edge the passage shares with open water. Over
 *   water deeper than the cell's ceiling the side is a **lintel**: it stops at
 *   the ceiling depth, and the mouth is the hole beneath it. Over shallower
 *   ground, rock, or past the map edge, it is a **curtain** that falls to the
 *   heightfield, so the passage is closed where a hull could not enter it. A
 *   curtain never rises above the roof: against a mesa as high as the roof it
 *   has no height at all.
 * - **The underside** at the ceiling depth, which a camera looking into a
 *   mouth sees as the passage's roof.
 *
 * `grid` must be the heightfield built with the same `seed` and `rockTopM`,
 * since a curtain ends on its vertices.
 */
export function buildRoofGeometry(
  terrain: Terrain,
  passage: Passage,
  grid: HeightGrid,
  seed: number,
  rockTopM: number
): RoofGeometry {
  const { cols, rows, cellM } = terrain;
  const n = VERTS_PER_CELL;
  const step = cellM / n;
  const face = rgb(ROCK_FACE);
  const shadow = rgb(ROCK_SHADOW);
  const member = new Set(passage.cells);

  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const vertex = (x: number, y: number, z: number, c: readonly number[], gain: number) => {
    positions.push(x, y, z);
    colors.push(c[0]! * gain, c[1]! * gain, c[2]! * gain);
    return positions.length / 3 - 1;
  };
  // a–b along one row, c–d the row after: two triangles.
  const quad = (a: number, b: number, c: number, d: number) => indices.push(a, c, b, b, c, d);
  const roofTop = roofTopDepthM(terrain, passage, rockTopM);
  const top = (x: number, z: number) => rockSurfaceDepthM(seed, roofTop, x, z);
  // The crag's light, as the bake reads it for a mesa: the rock detail's
  // drop across the step, scaled to metres per cell.
  const crag = (x: number, z: number) => {
    const scale = cellM / (2 * step);
    return reliefTextureGain(
      0,
      0,
      (top(x + step, z) - top(x - step, z)) * scale,
      (top(x, z + step) - top(x, z - step)) * scale
    );
  };

  for (const index of passage.cells) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const x0 = col * cellM;
    const z0 = row * cellM;
    const ceilingY = depthToWorldY(terrain.ceiling[index]!);

    // What lies across each edge: 'none' (more of this roof), 'lintel'
    // (water deeper than this ceiling), or 'curtain'.
    const across = (r: number, c: number): 'none' | 'lintel' | 'curtain' => {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return 'curtain';
      const other = r * cols + c;
      if (member.has(other)) return 'none';
      if (isRock(terrain, other)) return 'curtain';
      return terrain.floor[other]! > terrain.ceiling[index]! ? 'lintel' : 'curtain';
    };
    const north = across(row - 1, col);
    const south = across(row + 1, col);
    const west = across(row, col - 1);
    const east = across(row, col + 1);

    // The top, with the rim darkened where the stone ends over open ground.
    const base = positions.length / 3;
    for (let iz = 0; iz <= n; iz++) {
      for (let ix = 0; ix <= n; ix++) {
        const x = x0 + ix * step;
        const z = z0 + iz * step;
        const rim =
          (iz === 0 && north !== 'none') ||
          (iz === n && south !== 'none') ||
          (ix === 0 && west !== 'none') ||
          (ix === n && east !== 'none');
        vertex(x, depthToWorldY(top(x, z)), z, face, crag(x, z) * (rim ? ROCK_EDGE_GAIN : 1));
      }
    }
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const a = base + iz * (n + 1) + ix;
        quad(a, a + 1, a + n + 1, a + n + 2);
      }
    }

    // The underside: one quad, the ceiling a hull bumps against.
    const u = [
      vertex(x0, ceilingY, z0, shadow, 1),
      vertex(x0 + cellM, ceilingY, z0, shadow, 1),
      vertex(x0, ceilingY, z0 + cellM, shadow, 1),
      vertex(x0 + cellM, ceilingY, z0 + cellM, shadow, 1),
    ];
    quad(u[0]!, u[1]!, u[2]!, u[3]!);

    // The sides. Each walks its edge's n + 1 grid vertices.
    const side = (
      kind: 'none' | 'lintel' | 'curtain',
      ix0: number,
      iz0: number,
      dx: number,
      dz: number
    ) => {
      if (kind === 'none') return;
      let prevTop = -1;
      let prevBottom = -1;
      for (let k = 0; k <= n; k++) {
        const ix = ix0 + dx * k;
        const iz = iz0 + dz * k;
        const x = ix * step;
        const z = iz * step;
        const topY = depthToWorldY(top(x, z));
        const bottomY = Math.min(
          topY,
          kind === 'lintel' ? ceilingY : grid.y[iz * grid.vertsX + ix]!
        );
        const t = vertex(x, topY, z, face, ROCK_EDGE_GAIN);
        const b = vertex(x, bottomY, z, shadow, 1);
        if (k > 0) quad(prevTop, t, prevBottom, b);
        prevTop = t;
        prevBottom = b;
      }
    };
    side(north, col * n, row * n, 1, 0);
    side(south, col * n, (row + 1) * n, 1, 0);
    side(west, col * n, row * n, 0, 1);
    side(east, (col + 1) * n, row * n, 0, 1);
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
  };
}

/**
 * The passage whose roof is over a point at a depth — inside one of its cells
 * and at or below that cell's ceiling — or -1. The view asks it of its own
 * hulls, and of nothing else.
 */
export function roofOver(
  terrain: Terrain,
  passages: Passages,
  xM: number,
  yM: number,
  depthM: number
): number {
  const { cols, rows, cellM } = terrain;
  const col = Math.floor(xM / cellM);
  const row = Math.floor(yM / cellM);
  if (col < 0 || col >= cols || row < 0 || row >= rows) return -1;
  const index = row * cols + col;
  return depthM >= terrain.ceiling[index]! ? passages.of[index]! : -1;
}
