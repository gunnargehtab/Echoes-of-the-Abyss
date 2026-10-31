import { DEPTH } from '@echoes/shared';
import type { MovePreviewReading } from './movePreview.ts';

export function MovePreviewPanel({
  reading,
  navigating,
  onArm,
  onPlan,
  onDepth,
  onPin,
  onQueue,
  onConfirm,
  onCancel,
}: {
  reading: MovePreviewReading | null;
  navigating: boolean;
  onArm(): void;
  onPlan(axis: 'x' | 'y', value: number): void;
  onDepth(value: number): void;
  onPin(pinned: boolean): void;
  onQueue(queued: boolean): void;
  onConfirm(): void;
  onCancel(): void;
}) {
  const number = (value: number | undefined) => (Number.isFinite(value) ? value : '');
  return (
    <section className="move-preview" aria-label="Independent destination">
      {reading === null ? (
        <button type="button" onClick={onArm}>
          MOVE 3D
        </button>
      ) : (
        <>
          <strong>MOVE 3D · {reading.unitIds.length} hulls · FIXED DEPTH</strong>
          <p>{reading.pinned ? 'PINNED' : 'Place in the world or scope; or enter map metres.'}</p>
          {(['x', 'y'] as const).map((axis) => (
            <label key={axis}>
              Map {axis} (m)
              <input
                type="number"
                disabled={reading.pinned}
                value={number(reading.point?.[axis])}
                onChange={(event) => onPlan(axis, event.currentTarget.valueAsNumber)}
              />
            </label>
          ))}
          <button type="button" onClick={() => onPin(!reading.pinned)}>
            {reading.pinned ? 'UNPIN' : 'PIN POSITION'}
          </button>
          <label>
            Destination depth (m)
            <input
              type="number"
              value={number(reading.depthM)}
              onChange={(event) => onDepth(event.currentTarget.valueAsNumber)}
            />
          </label>
          <div>
            <button type="button" onClick={() => onDepth(reading.depthM - DEPTH.CONTROL_STEP_M)}>
              RAISE {DEPTH.CONTROL_STEP_M} m
            </button>
            <button type="button" onClick={() => onDepth(reading.depthM + DEPTH.CONTROL_STEP_M)}>
              LOWER {DEPTH.CONTROL_STEP_M} m
            </button>
          </div>
          <label>
            <input
              type="checkbox"
              checked={reading.queued}
              onChange={(event) => onQueue(event.currentTarget.checked)}
            />
            Queue after current orders
          </label>
          <p>
            WATER {reading.ceilingM ?? '—'}–{reading.floorM ?? '—'} m
          </p>
          <p>
            RISE up to {Math.ceil(reading.riseSeconds)} s · DIVE up to{' '}
            {Math.ceil(reading.diveSeconds)} s
            {reading.diveSeconds > 0 ? ` · ${DEPTH.DESCENT_SIG} SIG` : ''}
            {reading.breaksSilence ? ' · BREAKS SILENCE' : ''}
          </p>
          {reading.crushCount > 0 && <p role="status">CRUSH RISK · {reading.crushCount} hulls</p>}
          <p>ROUTE AT CURRENT DEPTH — CLIMB/DIVE MANUALLY</p>
          {reading.reason !== null && <p role="status">{reading.reason}</p>}
          <button
            type="button"
            disabled={navigating || !reading.pinned || reading.reason !== null}
            onClick={onConfirm}
          >
            CONFIRM
          </button>
          <button type="button" onClick={onCancel}>
            CANCEL
          </button>
        </>
      )}
    </section>
  );
}
