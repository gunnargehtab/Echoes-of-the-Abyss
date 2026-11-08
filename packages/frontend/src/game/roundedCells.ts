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
 * and how far it moved from the cell edges is bounded by `LICENCE_M`, under
 * half a cell. Every cell centre keeps its own kind with `CENTRE_MARGIN_M` to
 * spare: where the rounding would carry an edge nearer, the edge bends round
 * the centre instead, inside `CENTRE_BEND_M` of it (#1774). So the edge
 * follows the authored curve wherever no centre stands close to it.
 *
 * The field holds each kind's rounded signed distance on a grid finer than
 * the heightfield's, and every cell centre is one of its samples, so a reader
 * at a centre reads the margin the bend gave it exactly
 * (`roundedDistances`). Between samples it reads them blended, which keeps
 * the edge the blur's own curve: adding the cells' exact distance to a
 * blended move instead put that distance's ridge back into the edge, a bend
 * on every staircase corner's bisector.
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
   * TUNABLE — the blur's standard deviation, metres. Seven tenths of a cell
   * spreads a one-cell jog over about three cells, which is what an
   * ellipse's staircase needs to read as its curve rather than as a stair
   * with its corners cut (#1774, after a first pass at half a cell left each
   * jog a chamfer). Wider, and a ring two cells thick — the bowl between the
   * rim and the pocket — loses its corners to the kinds either side of it.
   */
  SIGMA_M: 175,
  /**
   * TUNABLE — the most the rounding moves an edge, metres: a soft bound, so
   * a corner cut deeper than the licence eases into it rather than printing
   * the licence's own outline. Under half a cell, the study's clause in
   * docs/map-visuals.md §4. A move under `KNEE_M` passes untouched.
   */
  LICENCE_M: 115,
  KNEE_M: 80,
  /**
   * TUNABLE — how far inside its own rounded edge every cell centre stands,
   * metres, and so how far either side of an edge the drawn ground can ramp
   * (seabed.ts `erodedReachM`) with each centre still reading its own floor.
   */
  CENTRE_MARGIN_M: 40,
  /**
   * TUNABLE — how far round a centre an edge bends to keep that margin,
   * metres: under half the spacing of centres, so no two bends meet.
   */
  CENTRE_BEND_M: 110,
  /**
   * How far the field's distances look for an edge, in cells: past where a
   * kind's move is let go, and past any kind that can weigh at a point. A
   * kind further off reads as this far.
   */
  SEARCH_CELLS: 3,
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
  /** Per kind, per sample: the rounded signed distance itself, the exact one plus its move. */
  readonly rounded: readonly Float32Array[];
  /** Per sample: the largest move over every kind, as a magnitude. */
  readonly most: Float32Array;
  /** Per sample: 0 where a roof holds the cell edges, 1 where nothing does. */
  readonly hold: Float32Array;
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

/**
 * A move held under the licence: unchanged up to the knee, then easing
 * toward the licence and never reaching it. Unchanged, the rounded edge is
 * the blur's own smooth curve; a squeeze on every move, as a tanh from zero
 * puts on it, lets the cells' staircase distance back into the edge, and
 * bends it where each jog's curve meets a straight run.
 */
function withinLicence(move: number): number {
  const { KNEE_M, LICENCE_M } = ROUNDED_CELLS;
  const size = Math.abs(move);
  if (size <= KNEE_M) return move;
  return (
    Math.sign(move) *
    (KNEE_M + (LICENCE_M - KNEE_M) * Math.tanh((size - KNEE_M) / (LICENCE_M - KNEE_M)))
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

/**
 * Bend each edge the rounding carried within `CENTRE_MARGIN_M` of a cell
 * centre back round it: at the centre, raise its own kind's rounded distance
 * to the margin and lower every other kind's below its negative, easing the
 * correction off over `CENTRE_BEND_M`. Centres are samples of the grid
 * (`SAMPLES_PER_CELL` is even), so a reader at a centre reads the corrected
 * value exactly. No two bends meet, so each centre's is its own.
 */
function bendRoundCentres(
  cols: number,
  rows: number,
  per: number,
  nx: number,
  nz: number,
  stepM: number,
  kindOf: Uint16Array,
  exact: readonly Float32Array[],
  moves: Float32Array[]
): void {
  const margin = ROUNDED_CELLS.CENTRE_MARGIN_M;
  const bend = ROUNDED_CELLS.CENTRE_BEND_M / stepM;
  const reach = Math.ceil(bend);
  const need = new Float64Array(moves.length);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = c * per + per / 2;
      const cz = r * per + per / 2;
      const at = cz * nx + cx;
      const own = kindOf[r * cols + c]!;
      let any = false;
      for (let k = 0; k < moves.length; k++) {
        const s = exact[k]![at]! + moves[k]![at]!;
        need[k] = k === own ? Math.max(0, margin - s) : -Math.max(0, s + margin);
        if (need[k] !== 0) any = true;
      }
      if (!any) continue;
      for (let dz = -reach; dz <= reach; dz++) {
        for (let dx = -reach; dx <= reach; dx++) {
          const ix = cx + dx;
          const iz = cz + dz;
          if (ix < 0 || iz < 0 || ix >= nx || iz >= nz) continue;
          const d = Math.hypot(dx, dz) / bend;
          if (d >= 1) continue;
          const b = smooth(1 - d);
          for (let k = 0; k < moves.length; k++) moves[k]![iz * nx + ix] += need[k]! * b;
        }
      }
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
  const from = cellM;
  const to = 1.5 * cellM;
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
      const letGo = 1 - smooth(clamp((Math.abs(s) - from) / (to - from), 0, 1));
      moves[k]![i] = withinLicence(rounded - s) * hold[i]! * letGo;
    }
  }
  bendRoundCentres(cols, rows, per, nx, nz, stepM, kindOf, exact, moves);
  for (let i = 0; i < nx * nz; i++) {
    for (const m of moves) most[i] = Math.max(most[i]!, Math.abs(m[i]!));
  }

  const rounded = exact.map((s, k) => s.map((v, i) => v + moves[k]![i]!));
  return { cols, rows, cellM, kinds, kindOf, nx, nz, stepM, moves, rounded, most, hold };
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
 * positive inside the kind's rounded ground, negative outside, its samples
 * blended. At a cell centre, a sample, it is exact. Returns the largest move
 * at the point.
 */
export function roundedDistances(
  field: RoundedCells,
  x: number,
  z: number,
  out: Float64Array
): number {
  for (let k = 0; k < field.kinds.length; k++) {
    out[k] = sampleGrid(field, field.rounded[k]!, x, z);
  }
  return sampleGrid(field, field.most, x, z);
}
