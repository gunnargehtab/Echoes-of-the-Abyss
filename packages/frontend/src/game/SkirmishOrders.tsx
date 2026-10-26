/**
 * The skirmish's one order — docs/ui-ux.md §10.5, #1588.
 *
 * A skirmish has no objectives, and for a long while it drew nothing in their
 * corner: the rule that wins it lived only in docs/game-identity.md
 * ("Destroy"), and a newcomer met a match with nothing on screen saying what
 * it was for. So the objectives panel's corner carries one row here, in the
 * panel's own dress, stating the rule.
 *
 * The row says what the rules say and nothing the server did not send. Its
 * status word never moves and it has no marker, because nothing about any
 * other Bastion — where it is, whether it still stands — reaches this client,
 * and a row that went `met` or flew the camera somewhere would be claiming
 * that it had. The one number it reads is the roster, which is public.
 *
 * DOM for the panel's reasons: selectable, and reachable by a screen reader.
 */

export interface SkirmishOrdersProps {
  /** Commanders seated in the match, AI seats included. */
  seated: number;
}

export function SkirmishOrders({ seated }: SkirmishOrdersProps) {
  // With one seat there is nothing to win: the victory check needs two
  // rosters (`Match.resolveVictory`), and scuttling reads only two or more.
  // Saying so is §1.5's rule — a player waiting for an ending nothing will
  // bring is paying a cost they were never shown.
  const alone = seated < 2;
  return (
    <section className="objectives" aria-label="Orders">
      <header className="objectives-title">
        <span>ORDERS</span>
      </header>
      {/* A status region for the panel's reason (§10.5): the row changes in
          place, from every enemy Bastion to the enemy Bastion, when a third
          commander walks out. */}
      <div className="objectives-body" role="status" aria-live="polite">
        <p className="objectives-row pending">
          <span className="objectives-status">{alone ? 'none' : 'win'}</span>
          <span className="objectives-text">
            {alone
              ? 'No enemy is seated'
              : seated === 2
                ? 'Destroy the enemy Bastion'
                : 'Destroy every enemy Bastion'}
          </span>
          <span className="objectives-gloss">
            {alone ? 'Nothing ends this match but leaving it.' : 'Lose yours and you are out.'}
          </span>
        </p>
      </div>
    </section>
  );
}
