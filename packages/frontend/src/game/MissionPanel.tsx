/**
 * The objectives panel — docs/ui-ux.md §10, §11.
 *
 * DOM rather than Pixi, for the reason §10 gives about the contact log: this
 * is the accessible mirror of what a mission is asking of the player, and
 * canvas text is neither selectable nor reachable by a screen reader.
 *
 * It is a `status` region and not a `log`, and the difference is the whole
 * reason it is a separate component from `ContactLog`. The log *appends* — an
 * entry is written once and never rewritten, because a log that improved its
 * own history would leak. This panel *changes in place*: the same handful of
 * objectives, re-stated as their status moves. `aria-live="polite"` on a
 * region that rewrites itself announces the change rather than the backlog.
 *
 * Everything drawn here came off the wire already resolved for this player.
 * The counters are computed server-side from this observer's own snapshot and
 * can only ever count the player's own force, so there is no arithmetic in
 * this file — displaying a number the server did not send would be exactly
 * the leak the panel is careful not to be.
 */

import {
  ObjectiveStatus,
  type MissionAbility,
  type MissionView,
  type ObjectiveView,
} from '@echoes/shared';

/**
 * Status is carried as a word as well as a colour and a weight, per §11: the
 * scale has to survive a colour-vision difference and a screen reader both.
 */
const STATUS_WORD: Record<ObjectiveStatus, string> = {
  [ObjectiveStatus.Pending]: 'open',
  [ObjectiveStatus.Met]: 'met',
  [ObjectiveStatus.Failed]: 'failed',
};

const STATUS_CLASS: Record<ObjectiveStatus, string> = {
  [ObjectiveStatus.Pending]: 'pending',
  [ObjectiveStatus.Met]: 'met',
  [ObjectiveStatus.Failed]: 'failed',
};

/** The player's own buttons, named the way the command bar names them. */
const ABILITY_LABEL: Record<MissionAbility, string> = {
  weapons: 'weapons',
  torpedoes: 'torpedoes',
  mines: 'mines',
  depthCharges: 'depth charges',
  noisemakers: 'noisemakers',
  activeSonar: 'active sonar',
  construction: 'construction',
};

export interface MissionPanelProps {
  view: MissionView;
  /** Recentre the camera. The same callback the contact log focuses with. */
  onFocus(x: number, y: number): void;
}

export function MissionPanel({ view, onFocus }: MissionPanelProps) {
  const markerFor = (objective: ObjectiveView) =>
    objective.markerId === undefined
      ? undefined
      : view.markers.find((marker) => marker.id === objective.markerId);

  return (
    <section className="objectives" aria-label="Objectives">
      <header className="objectives-title">
        <span>ORDERS</span>
        {/* The SIG budget is design metadata shown as a ceiling, never a live
            threshold — nothing fails for crossing it (docs/campaign.md §10).
            Named for what it binds, because the meter in the top bar is the
            peak across everything the player owns and the court's order binds
            only the flight: the tenders are the loudest thing in the convoy
            and are not party to it (docs/mission-sorrowgate.md §4). Without
            the word, a compliant flight reads as being in breach of its own
            freight. */}
        <span className="objectives-ceiling">flight SIG ≤ {view.sigBudget}</span>
      </header>

      <div className="objectives-body" role="status" aria-live="polite">
        {view.objectives.length === 0 && <p className="objectives-empty">no orders</p>}
        {view.objectives.map((objective) => {
          const marker = markerFor(objective);
          const className = `objectives-row ${STATUS_CLASS[objective.status]}`;
          const body = (
            <>
              <span className="objectives-status">{STATUS_WORD[objective.status]}</span>
              {/* Authored, in-register, verbatim. A mission states its goals in
                  the voice of whoever is setting them; the client never
                  templates or rewords one. */}
              <span className="objectives-text">{objective.text}</span>
              {objective.progress !== undefined && (
                <span className="objectives-progress">
                  {objective.progress.done} of {objective.progress.of}
                </span>
              )}
            </>
          );
          // Focus only where the mission named somewhere to send the camera.
          // An objective without a marker has nowhere honest to go — so it is
          // not a button at all, rather than a disabled one. A disabled button
          // is out of the tab order and skipped by some screen readers in
          // browse mode, which would put the *order itself* out of reach; the
          // whole point of this panel being DOM is that the text is readable.
          // The rule the mission is stating does not stop being content
          // because there is nowhere to fly to.
          return marker === undefined ? (
            <p key={objective.id} className={className}>
              {body}
            </p>
          ) : (
            <button
              key={objective.id}
              type="button"
              className={className}
              title={marker.label}
              onClick={() => onFocus(marker.x, marker.y)}
            >
              {body}
            </button>
          );
        })}

        {view.locks.length > 0 && (
          <ul className="objectives-locks" aria-label="Disabled actions">
            {view.locks.map((lock) => (
              // Dead affordances, named with the reason attached (§7). The
              // reason is here as standing state rather than as a response to
              // a refused order, so the player reads it before reaching for
              // the key rather than after.
              <li key={lock.ability} className="objectives-lock">
                <span className="objectives-lock-name">{ABILITY_LABEL[lock.ability]}</span>
                <span className="objectives-lock-reason">{lock.reason}</span>
              </li>
            ))}
          </ul>
        )}

        {view.debtS > 0 && (
          // Silence-debt: seconds owed, repaid by being quiet
          // (docs/mission-sorrowgate.md §4). Shown only while it is owed,
          // because a permanent zero would be a number nobody reads.
          <p className="objectives-debt">silence owed · {Math.ceil(view.debtS)}s</p>
        )}
      </div>
    </section>
  );
}
