import { DEPTH, requiredPressureRating, type OwnUnit } from '@echoes/shared';
import type { TerrainPayload } from '../net/GameClient.ts';

export interface MovePreview {
  unitIds: number[];
  planeDepthM: number;
  point: { x: number; y: number } | null;
  depthM: number;
  pinned: boolean;
  queued: boolean;
}

export interface MovePreviewReading extends MovePreview {
  reason: string | null;
  ceilingM: number | null;
  floorM: number | null;
  crushCount: number;
  riseSeconds: number;
  diveSeconds: number;
  breaksSilence: boolean;
}

export function readMovePreview(
  preview: MovePreview,
  terrain: TerrainPayload | null,
  units: readonly OwnUnit[]
): MovePreviewReading {
  const hulls = units.filter((unit) => preview.unitIds.includes(unit.id));
  const reading: MovePreviewReading = {
    ...preview,
    reason: null,
    ceilingM: null,
    floorM: null,
    crushCount: 0,
    riseSeconds: 0,
    diveSeconds: 0,
    breaksSilence: false,
  };
  const at = preview.point;
  if (hulls.length === 0) reading.reason = 'NO SELECTED HULLS REMAIN';
  else if (
    terrain === null ||
    at === null ||
    !Number.isFinite(at.x) ||
    !Number.isFinite(at.y) ||
    at.x < 0 ||
    at.y < 0 ||
    at.x >= terrain.cols * terrain.cellM ||
    at.y >= terrain.rows * terrain.cellM
  )
    reading.reason = 'NO WATER TARGET';
  else {
    const cell = Math.floor(at.y / terrain.cellM) * terrain.cols + Math.floor(at.x / terrain.cellM);
    reading.ceilingM = Math.max(DEPTH.MIN_M, terrain.ceiling[cell]!);
    reading.floorM = Math.min(DEPTH.MAX_M, terrain.floor[cell]!);
    if (terrain.ceiling[cell]! >= terrain.floor[cell]!) reading.reason = 'NO WATER COLUMN';
    else if (!Number.isFinite(preview.depthM)) reading.reason = 'ENTER A FINITE DEPTH';
    else if (preview.depthM < reading.ceilingM || preview.depthM > reading.floorM)
      reading.reason = 'DEPTH OUTSIDE WATER INTERVAL';
  }
  if (Number.isFinite(preview.depthM)) {
    for (const hull of hulls) {
      if (requiredPressureRating(preview.depthM) > hull.pressureRating + hull.pressureBonus)
        reading.crushCount++;
      const delta = preview.depthM - hull.depth;
      if (delta > 0 && hull.silentRunning) reading.breaksSilence = true;
      if (Math.abs(delta) <= DEPTH.ARRIVAL_EPSILON_M) continue;
      reading.riseSeconds = Math.max(reading.riseSeconds, -delta / DEPTH.ASCENT_RATE_MPS);
      reading.diveSeconds = Math.max(reading.diveSeconds, delta / DEPTH.DESCENT_RATE_MPS);
    }
  }
  return reading;
}
