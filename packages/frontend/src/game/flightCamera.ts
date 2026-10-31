import { DEPTH, FLIGHT_CAMERA } from '@echoes/shared';
import { Quaternion, Vector3 } from 'three';
import type { TerrainPayload } from '../net/GameClient.ts';
import { DEPTH_VISUAL_M_PER_M, type HeightGrid } from './perspectiveTerrain.ts';

export interface FlightReading {
  flying: boolean;
  navigating: boolean;
  depthM: number;
  bearingDeg: number | null;
  upX: number;
  upY: number;
  inverted: boolean;
  blocked: boolean;
}

/** The actual two triangles per rendered ground square, not a second noise sample. */
function floorY(grid: HeightGrid, x: number, z: number): number {
  const gx = x / grid.stepM;
  const gz = z / grid.stepM;
  const ix = Math.min(grid.vertsX - 2, Math.floor(gx));
  const iz = Math.min(grid.vertsZ - 2, Math.floor(gz));
  const u = gx - ix;
  const v = gz - iz;
  const a = iz * grid.vertsX + ix;
  const ya = grid.y[a]!;
  const yb = grid.y[a + 1]!;
  const yc = grid.y[a + grid.vertsX]!;
  const yd = grid.y[a + grid.vertsX + 1]!;
  return u + v <= 1
    ? ya + (yb - ya) * u + (yc - ya) * v
    : yd + (yc - yd) * (1 - u) + (yb - yd) * (1 - v);
}

export function flightInterval(
  terrain: TerrainPayload,
  grid: HeightGrid,
  x: number,
  z: number
): { minY: number; maxY: number } | null {
  if (x < 0 || z < 0 || x >= grid.widthM || z >= grid.heightM) return null;
  const cell = Math.floor(z / terrain.cellM) * terrain.cols + Math.floor(x / terrain.cellM);
  const ceiling = terrain.ceiling[cell]!;
  if (ceiling >= terrain.floor[cell]!) return null;
  const clearance = FLIGHT_CAMERA.CLEARANCE_M * DEPTH_VISUAL_M_PER_M;
  const minY = Math.max(floorY(grid, x, z), -DEPTH.MAX_M * DEPTH_VISUAL_M_PER_M) + clearance;
  const maxY = -Math.max(0, ceiling) * DEPTH_VISUAL_M_PER_M - clearance;
  return minY <= maxY ? { minY, maxY } : null;
}

/**
 * Split at every triangle and cell boundary. Inside each span the floor and
 * the moving eye are linear and the ceiling constant: testing both ends
 * cannot skip a thin rock corner, even for a long wheel or delayed frame.
 */
export function sweepFlight(
  eye: Vector3,
  delta: Vector3,
  terrain: TerrainPayload,
  grid: HeightGrid
): boolean {
  const start = eye.clone();
  const cuts = [0, 1];
  for (const [a, d] of [
    [start.x, delta.x],
    [start.z, delta.z],
    [start.x + start.z, delta.x + delta.z],
  ] as const) {
    if (d === 0) continue;
    const lo = Math.min(a, a + d);
    const hi = Math.max(a, a + d);
    for (let k = Math.floor(lo / grid.stepM) + 1; k * grid.stepM < hi; k++) {
      cuts.push((k * grid.stepM - a) / d);
    }
  }
  cuts.sort((a, b) => a - b);
  const legal = (t: number): boolean => {
    const x = start.x + delta.x * t;
    const z = start.z + delta.z * t;
    const interval = flightInterval(terrain, grid, x, z);
    const y = start.y + delta.y * t;
    return interval !== null && y >= interval.minY && y <= interval.maxY;
  };
  if (!legal(0)) return false;
  let safe = 0;
  for (let i = 1; i < cuts.length; i++) {
    const from = cuts[i - 1]!;
    const to = cuts[i]!;
    if (to <= from) continue;
    // Both sides of a discontinuous authored roof/rock boundary count.
    for (const t of [from + (to - from) * 1e-8, to - (to - from) * 1e-8, to]) {
      if (legal(t)) {
        safe = t;
        continue;
      }
      let blocked = t;
      for (let n = 0; n < 36; n++) {
        const mid = (safe + blocked) / 2;
        if (legal(mid)) safe = mid;
        else blocked = mid;
      }
      eye.copy(start).addScaledVector(delta, Math.max(0, safe - 1e-10));
      return false;
    }
  }
  eye.copy(start).add(delta);
  return true;
}

/** Local rotations compose on the quaternion, never through Euler poles. */
export function rotateFlight(q: Quaternion, yaw: number, pitch: number, roll: number): void {
  const axis = new Vector3(pitch, yaw, roll);
  const angle = axis.length();
  if (angle === 0) return;
  q.multiply(new Quaternion().setFromAxisAngle(axis.divideScalar(angle), angle)).normalize();
}
