/**
 * The free-water study's cells, rounded — docs/free-water-slice.md §9,
 * "Crater walls", and the study's clause in docs/map-visuals.md §4.
 *
 * A map is painted by cell centre, so an authored ellipse arrives as a
 * staircase of 250 m cells, and drawn on the cell edges it reads from the
 * survey dolly as squares (#1774). This rounds the staircase between the
 * centres and nowhere else. Each kind of ground — rock, or one biome at one
 * floor and ceiling — is blurred as a share of the map, the shares summing
 * to one everywhere, and the kind with the largest share holds a point. A
 * one-cell jog spreads into a curve, a corner rounds, and where three kinds
 * meet the junction settles into a Y rather than one kind spiking into the
 * gap the other two leave, which is what blurring each kind's distance on
 * its own did. Each kind's rounded edge is read back as a signed distance,
 * and how far it moved from the cell edges is bounded by `LICENCE_M`, well
 * inside half a cell. A cell centre lies half a cell from every other kind's
 * cells, so it keeps its own kind whatever the rounding does.
 *
 * The field holds only the move: the rounded distance less the exact one, per
 * kind, on a grid finer than the heightfield's. A reader takes the exact
 * distance where it stands and adds the move there (`roundedDistances`), so
 * the promise at a centre never rests on an interpolated distance.
 *
 * Pure data, no three.js, and render-only like everything the bake and the
 * heightfield draw: the cells stay the truth the simulation plays on.
 * Development-only — the study's look is its one caller (seabed.ts,
 * `erodedGroundAtM`).
 */

import type { TerrainPayload } from '../net/GameClient.ts';

export const ROUNDED_CELLS = {
  /** TUNABLE — field samples along a cell's side: one every 31.25 m at 250 m cells. */
  SAMPLES_PER_CELL: 8,
  /**
   * TUNABLE — the blur's standard deviation, metres. Half a cell spreads a
   * one-cell jog over about two cells, which is what an ellipse's staircase
   * needs to read as its curve. Much wider, and a ring two cells thick — the
   * bowl between the rim and the pocket — starts to feel its far side.
   */
  SIGMA_M: 125,
  /**
   * TUNABLE — the most the rounding moves an edge, metres: a soft bound
   * (tanh), so a corner cut deeper than the licence eases into it rather than
   * printing the licence's own outline. Twice it stays under half a cell, so
   * the room it leaves the drawn ground's ramps outruns the move
   * (seabed.ts `erodedBoundM`).
   */
  LICENCE_M: 50,
  /** How far the field's own distances look for an edge, in cells: past the blur's three sigmas. */
  SEARCH_CELLS: 3,
  /** How far a reader's distances look for an edge, in cells: past half a cell and the licence. */
  READ_CELLS: 2,
  /**
   * TUNABLE — within half a cell of a roofed cell nothing rounds, and the hold
   * eases off over the next cell. The roof over a passage stands its curtains
   * on the cell edges (passages.ts), so the ground under them keeps them.
   */
  ROOF_HOLD_CELLS: 0.5,
  ROOF_EASE_CELLS: 1,
} as const;

/** One kind of ground: what the drawn ground can tell apart across an edge. */
export interface GroundKind {
  rock: boolean;
  /** Open water under a ceiling: a roofed passage (passages.ts). */
  roofed: boolean;
  biome: number;
  floorM: number;
  ceilingM: number;
}

export interface RoundedCells {
  readonly cols: number;
  readonly rows: number;
  readonly cellM: number;
  readonly kinds: readonly GroundKind[];
  /** Per cell, the index of its kind. */
  readonly kindOf: Uint16Array;
  /** Samples along x and z: `cols * SAMPLES_PER_CELL + 1`, and the rows'. */
  readonly nx: number;
  readonly nz: number;
  readonly stepM: number;
  /** Per kind, per sample: how far the rounding moves that kind's signed distance, metres. */
  readonly moves: readonly Float32Array[];
  /** Per sample: the largest move over every kind, as a magnitude. */
  readonly most: Float32Array;
  /** Per sample: 0 where a roof holds the cell edges, 1 where nothing does. */
  readonly hold: Float32Array;
  /** Every edge between two kinds: x0, z0, x1, z1, kind, kind — six numbers an edge. */
  readonly edges: Float64Array;
  /** Per cell, the edges within `READ_CELLS` of it, as indices into `edges`. */
  readonly near: readonly Int32Array[];
}

const isRockCell = (terrain: TerrainPayload, i: number) => terrain.ceiling[i]! > terrain.floor[i]!;

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The kinds a map's cells fall into, and each cell's. Rock is one kind whatever its numbers. */
function groundKinds(terrain: TerrainPayload): { kinds: GroundKind[]; kindOf: Uint16Array } {
  const kinds: GroundKind[] = [];
  const index = new Map<string, number>();
  const kindOf = new Uint16Array(terrain.cols * terrain.rows);
  for (let i = 0; i < kindOf.length; i++) {
    const rock = isRockCell(terrain, i);
    const key = rock ? 'rock' : `${terrain.biomes[i]}|${terrain.floor[i]}|${terrain.ceiling[i]}`;
    let k = index.get(key);
    if (k === undefined) {
      k = kinds.length;
      index.set(key, k);
      kinds.push({
        rock,
        roofed: !rock && terrain.ceiling[i]! > 0,
        biome: terrain.biomes[i]!,
        floorM: terrain.floor[i]!,
        ceilingM: terrain.ceiling[i]!,
      });
    }
    kindOf[i] = k;
  }
  return { kinds, kindOf };
}

/** The distance from a point to an axis-aligned segment. */
function segmentDistance(
  x: number,
  z: number,
  x0: number,
  z0: number,
  x1: number,
  z1: number
): number {
  const dx = x < x0 ? x0 - x : x > x1 ? x - x1 : 0;
  const dz = z < z0 ? z0 - z : z > z1 ? z - z1 : 0;
  return Math.hypot(dx, dz);
}

/**
 * Every edge between two cells of different kinds, the east and south edge
 * of each cell once. An edge on the map's own perimeter has no second cell
 * and is the rim's, not a change of ground.
 */
function kindEdges(
  cols: number,
  rows: number,
  cellM: number,
  kindOf: Uint16Array
): { edges: Float64Array; byCell: number[][] } {
  const list: number[] = [];
  const byCell: number[][] = Array.from({ length: cols * rows }, () => []);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = kindOf[r * cols + c]!;
      if (c + 1 < cols) {
        const b = kindOf[r * cols + c + 1]!;
        if (b !== a) {
          byCell[r * cols + c]!.push(list.length / 6);
          list.push((c + 1) * cellM, r * cellM, (c + 1) * cellM, (r + 1) * cellM, a, b);
        }
      }
      if (r + 1 < rows) {
        const b = kindOf[(r + 1) * cols + c]!;
        if (b !== a) {
          byCell[r * cols + c]!.push(list.length / 6);
          list.push(c * cellM, (r + 1) * cellM, (c + 1) * cellM, (r + 1) * cellM, a, b);
        }
      }
    }
  }
  return { edges: Float64Array.from(list), byCell };
}

/** The edges owned by the cells within `reach` of a cell, Chebyshev. */
function edgesNear(
  cols: number,
  rows: number,
  byCell: readonly number[][],
  col: number,
  row: number,
  reach: number
): Int32Array {
  const out: number[] = [];
  for (let r = Math.max(0, row - reach); r <= Math.min(rows - 1, row + reach); r++) {
    for (let c = Math.max(0, col - reach); c <= Math.min(cols - 1, col + reach); c++) {
      for (const e of byCell[r * cols + c]!) out.push(e);
    }
  }
  return Int32Array.from(out);
}

/**
 * The exact signed distance of each kind at a point, metres, capped at `capM`:
 * positive inside the kind's cells, negative outside, the distance being to
 * that kind's nearest edge with another kind. The edges given must be every
 * one within `capM` of the point; past the cap a kind reads `±capM`.
 */
function exactDistances(
  edges: Float64Array,
  near: ArrayLike<number>,
  home: number,
  x: number,
  z: number,
  capM: number,
  out: Float64Array
): void {
  out.fill(capM);
  for (let n = 0; n < near.length; n++) {
    const e = near[n]! * 6;
    const d = segmentDistance(x, z, edges[e]!, edges[e + 1]!, edges[e + 2]!, edges[e + 3]!);
    const a = edges[e + 4]!;
    const b = edges[e + 5]!;
    if (d < out[a]!) out[a] = d;
    if (d < out[b]!) out[b] = d;
  }
  for (let k = 0; k < out.length; k++) if (k !== home) out[k] = -out[k]!;
}

/** One pass of a Gaussian along x or z, edge samples repeated past the grid. */
function blurPass(
  src: Float32Array,
  nx: number,
  nz: number,
  kernel: Float32Array,
  alongX: boolean
): Float32Array {
  const out = new Float32Array(src.length);
  const radius = (kernel.length - 1) / 2;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      let sum = 0;
      for (let t = -radius; t <= radius; t++) {
        const jx = alongX ? clamp(ix + t, 0, nx - 1) : ix;
        const jz = alongX ? iz : clamp(iz + t, 0, nz - 1);
        sum += kernel[t + radius]! * src[jz * nx + jx]!;
      }
      out[iz * nx + ix] = sum;
    }
  }
  return out;
}

/**
 * The standard normal's quantile (Acklam's rational approximation, about
 * nine digits): the distance, in standard deviations, at which a straight
 * edge blurred by a Gaussian leaves a kind this share.
 */
function normalQuantile(p: number): number {
  const a = [
    -39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716,
    2.506628277459239,
  ];
  const b = [
    -54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972,
    -13.28068155288572,
  ];
  const c = [
    -0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const low = 0.02425;
  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
      ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
    );
  }
  if (p > 1 - low) return -normalQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q) /
    (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
  );
}

/** The roofed cells' hold at a point: 0 within half a cell of one, easing to 1 a cell further. */
function roofHold(terrain: TerrainPayload, roofs: readonly number[], x: number, z: number): number {
  if (roofs.length === 0) return 1;
  const { cols, cellM } = terrain;
  let best = Number.POSITIVE_INFINITY;
  for (const i of roofs) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    best = Math.min(
      best,
      segmentDistance(x, z, c * cellM, r * cellM, (c + 1) * cellM, (r + 1) * cellM)
    );
  }
  const { ROOF_HOLD_CELLS, ROOF_EASE_CELLS } = ROUNDED_CELLS;
  return smooth(clamp((best / cellM - ROOF_HOLD_CELLS) / ROOF_EASE_CELLS, 0, 1));
}

/** The share of a sample's own square, one sample across, that each cell kind covers. */
function coverage(
  kindOf: Uint16Array,
  cols: number,
  rows: number,
  cellM: number,
  x: number,
  z: number,
  half: number,
  out: Float64Array
): void {
  out.fill(0);
  const area = 4 * half * half;
  const c0 = clamp(Math.floor((x - half) / cellM), 0, cols - 1);
  const c1 = clamp(Math.floor((x + half) / cellM), 0, cols - 1);
  const r0 = clamp(Math.floor((z - half) / cellM), 0, rows - 1);
  const r1 = clamp(Math.floor((z + half) / cellM), 0, rows - 1);
  for (let r = r0; r <= r1; r++) {
    // Past the map's edge a square reads its edge cell, as every reader does.
    const z0 = r === 0 ? z - half : Math.max(z - half, r * cellM);
    const z1 = r === rows - 1 ? z + half : Math.min(z + half, (r + 1) * cellM);
    for (let c = c0; c <= c1; c++) {
      const x0 = c === 0 ? x - half : Math.max(x - half, c * cellM);
      const x1 = c === cols - 1 ? x + half : Math.min(x + half, (c + 1) * cellM);
      if (x1 <= x0 || z1 <= z0) continue;
      out[kindOf[r * cols + c]!]! += ((x1 - x0) * (z1 - z0)) / area;
    }
  }
}

/** Build the field for a map's cells as they stand. */
export function buildRoundedCells(terrain: TerrainPayload): RoundedCells {
  const { cols, rows, cellM } = terrain;
  const { kinds, kindOf } = groundKinds(terrain);
  const { edges, byCell } = kindEdges(cols, rows, cellM, kindOf);
  const per = ROUNDED_CELLS.SAMPLES_PER_CELL;
  const nx = cols * per + 1;
  const nz = rows * per + 1;
  const stepM = cellM / per;
  const roofs: number[] = [];
  for (let i = 0; i < kindOf.length; i++) if (kinds[kindOf[i]!]!.roofed) roofs.push(i);

  // Per kind on the grid: its exact signed distance, and its share of each
  // sample's square.
  const searchNear = new Map<number, Int32Array>();
  const exact = kinds.map(() => new Float32Array(nx * nz));
  const shares = kinds.map(() => new Float32Array(nx * nz));
  const hold = new Float32Array(nx * nz);
  const at = new Float64Array(kinds.length);
  const searchM = ROUNDED_CELLS.SEARCH_CELLS * cellM;
  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = ix * stepM;
      const z = iz * stepM;
      const i = iz * nx + ix;
      const col = clamp(Math.floor(x / cellM), 0, cols - 1);
      const row = clamp(Math.floor(z / cellM), 0, rows - 1);
      const cell = row * cols + col;
      let near = searchNear.get(cell);
      if (near === undefined) {
        near = edgesNear(cols, rows, byCell, col, row, ROUNDED_CELLS.SEARCH_CELLS);
        searchNear.set(cell, near);
      }
      exactDistances(edges, near, kindOf[cell]!, x, z, searchM, at);
      for (let k = 0; k < kinds.length; k++) exact[k]![i] = at[k]!;
      coverage(kindOf, cols, rows, cellM, x, z, stepM / 2, at);
      for (let k = 0; k < kinds.length; k++) shares[k]![i] = at[k]!;
      hold[i] = roofHold(terrain, roofs, x, z);
    }
  }

  // Blur every kind's share. The shares still sum to one at each sample, so
  // the kind with the most is the one rounded ground, junctions and all.
  const sigma = ROUNDED_CELLS.SIGMA_M / stepM;
  const radius = Math.ceil(3 * sigma);
  const kernel = new Float32Array(2 * radius + 1);
  let total = 0;
  for (let t = -radius; t <= radius; t++) {
    const w = Math.exp(-(t * t) / (2 * sigma * sigma));
    kernel[t + radius] = w;
    total += w;
  }
  for (let t = 0; t < kernel.length; t++) kernel[t] = kernel[t]! / total;
  const blurred = shares.map((s) =>
    blurPass(blurPass(s, nx, nz, kernel, true), nx, nz, kernel, false)
  );

  // Each kind's rounded edge, read back as a signed distance: its share less
  // the strongest other's, through the blurred straight edge's own profile,
  // so a straight edge reads exactly its distance and moves nowhere. The move
  // is that less the exact distance, bounded by the licence, held off the
  // roofs' edges, and let go a cell from the kind, where no reader weighs it.
  const licence = ROUNDED_CELLS.LICENCE_M;
  const from = cellM / 2 + licence;
  const most = new Float32Array(nx * nz);
  const moves = kinds.map(() => new Float32Array(nx * nz));
  for (let i = 0; i < nx * nz; i++) {
    let first = -1;
    let second = -1;
    for (let k = 0; k < kinds.length; k++) {
      const v = blurred[k]![i]!;
      if (v > first) {
        second = first;
        first = v;
      } else if (v > second) second = v;
    }
    for (let k = 0; k < kinds.length; k++) {
      const share = blurred[k]![i]!;
      const margin = share - (share === first ? second : first);
      const rounded =
        ROUNDED_CELLS.SIGMA_M * normalQuantile(clamp((1 + margin) / 2, 1e-6, 1 - 1e-6));
      const s = exact[k]![i]!;
      const letGo = 1 - smooth(clamp((Math.abs(s) - from) / (cellM - from), 0, 1));
      const move = licence * Math.tanh((rounded - s) / licence) * hold[i]! * letGo;
      moves[k]![i] = move;
      most[i] = Math.max(most[i]!, Math.abs(move));
    }
  }

  const near = Array.from({ length: cols * rows }, (_, i) =>
    edgesNear(cols, rows, byCell, i % cols, Math.floor(i / cols), ROUNDED_CELLS.READ_CELLS)
  );
  return { cols, rows, cellM, kinds, kindOf, nx, nz, stepM, moves, most, hold, edges, near };
}

const fields = new WeakMap<TerrainPayload, RoundedCells>();

/**
 * The field for a terrain, built once per terrain object. A terrain changed
 * in place — a ground delta (PerspectiveView `applyGround`) — must be
 * forgotten first, or its readers would round the cells it used to have.
 */
export function roundedCellsOf(terrain: TerrainPayload): RoundedCells {
  let field = fields.get(terrain);
  if (field === undefined) {
    field = buildRoundedCells(terrain);
    fields.set(terrain, field);
  }
  return field;
}

/** Drop a terrain's field, after its cells changed in place. */
export function forgetRoundedCells(terrain: TerrainPayload): void {
  fields.delete(terrain);
}

/** A field's sample grid read bilinearly at a point. */
function sampleGrid(field: RoundedCells, grid: Float32Array, x: number, z: number): number {
  const { nx, nz, stepM } = field;
  const gx = clamp(x / stepM, 0, nx - 1);
  const gz = clamp(z / stepM, 0, nz - 1);
  const ix = Math.min(nx - 2, Math.floor(gx));
  const iz = Math.min(nz - 2, Math.floor(gz));
  const fx = gx - ix;
  const fz = gz - iz;
  const a = grid[iz * nx + ix]!;
  const b = grid[iz * nx + ix + 1]!;
  const c = grid[(iz + 1) * nx + ix]!;
  const d = grid[(iz + 1) * nx + ix + 1]!;
  return a + (b - a) * fx + (c + (d - c) * fx - a - (b - a) * fx) * fz;
}

/**
 * The rounded signed distance of every kind at a point, metres, into `out`:
 * positive inside the kind's rounded ground, negative outside — the exact
 * distance to the kind's cell edges plus the field's move there. Returns the
 * largest move at the point, the margin a reader leaves for the rounding.
 * Kinds further than `READ_CELLS` read as that far.
 */
export function roundedDistances(
  field: RoundedCells,
  x: number,
  z: number,
  out: Float64Array
): number {
  const { cols, rows, cellM } = field;
  const col = clamp(Math.floor(x / cellM), 0, cols - 1);
  const row = clamp(Math.floor(z / cellM), 0, rows - 1);
  const cell = row * cols + col;
  exactDistances(
    field.edges,
    field.near[cell]!,
    field.kindOf[cell]!,
    x,
    z,
    ROUNDED_CELLS.READ_CELLS * cellM,
    out
  );
  for (let k = 0; k < field.kinds.length; k++) {
    out[k] = out[k]! + sampleGrid(field, field.moves[k]!, x, z);
  }
  return sampleGrid(field, field.most, x, z);
}
