/**
 * A launch's travel — docs/world-map.md §7.6 step 2 (#1462).
 *
 * The camera moves from the board to the mission over the world behind this
 * bar (`WorldBackdrop`), and the room is joined only when both the travel and
 * the match's own loading have finished, because a mission starts on join and
 * a flight after it would spend the opening offscreen. This bar is what a
 * player has while that happens: the destination, said as the board's caption
 * says a ground, and two real controls. **Skip** is focused and cuts the
 * travel to its end; **Cancel**, which Esc also presses, goes back to the
 * board with nothing joined.
 *
 * A bar rather than a screen: the world is the thing to look at, so the bar
 * sits at the foot and the rest of the frame is the travel.
 */

import { useEffect } from 'react';
import { missionHeaderById } from '@echoes/shared';
import { groundFor, groundLine } from './riftChart.ts';

export interface TravelScreenProps {
  missionId: string;
  /** Whether the travel has been skipped. */
  skipped: boolean;
  /** Whether the camera has arrived and the region is prepared; only the join's loading is left. */
  settled: boolean;
  onSkip(): void;
  onCancel(): void;
}

export function TravelScreen({ missionId, skipped, settled, onSkip, onCancel }: TravelScreenProps) {
  const mission = missionHeaderById(missionId);
  const ground = mission === undefined ? undefined : groundFor(mission.mapId);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div
      className="travel-screen"
      role="dialog"
      aria-label="Travel"
      aria-describedby="travel-caption"
    >
      <div className="travel-bar">
        {/* The dialog's description, so moving focus onto Skip reads where
            the travel is going; the state line is a live region, so the move
            from travelling to only the loading being left is said when it
            happens. */}
        <p className="travel-caption" id="travel-caption">
          <span className="travel-destination">{mission?.name ?? missionId}</span>
          {ground !== undefined && <span className="travel-ground">{groundLine(ground)}</span>}
          <span className="travel-state" role="status">
            {settled || skipped ? 'Arriving' : 'Descending'}
          </span>
        </p>
        <div className="travel-controls">
          {/* `aria-disabled`, not `disabled`, once skipped: the board's rule,
              so the button keeps the focus it was given rather than dropping
              it to the page while the loading finishes. */}
          <button
            type="button"
            className="menu-commit"
            onClick={() => {
              if (!skipped) onSkip();
            }}
            aria-disabled={skipped ? true : undefined}
            autoFocus
          >
            Skip
          </button>
          <button type="button" className="menu-back" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
