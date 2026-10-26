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
 * A second row is about the harvester (#1589). Solo game is a door a player
 * can reach having been taught nothing of harvesting, since the prologue has
 * no economy (docs/campaign.md), and nothing on screen named the one hull
 * that pays for the rest. It reads only the player's own hulls.
 *
 * DOM for the panel's reasons: selectable, and reachable by a screen reader.
 */

import type { OwnUnit } from '@echoes/shared';

/**
 * What the harvester row says, when it says anything.
 *
 * - `opening` — the player's one harvester is working a field. The opening
 *   kit's is sent at spawn (`Match.spawnStartingBase`), so this is the row a
 *   skirmish opens on: it names the hull that is already earning, and how to
 *   get another.
 * - `waiting` — harvesters that have never worked and wait for an order. A
 *   yard launches one with no field (`productionSystem` gives it the rally
 *   point and nothing else), so the second harvester a newcomer buys sits
 *   where it rolled out, or at the rally point.
 */
export type HarvestRow = { kind: 'opening' } | { kind: 'waiting'; count: number } | null;

/**
 * The harvester row for this snapshot.
 *
 * A harvester is counted as waiting only if this client has never seen it
 * work: one the player parked with a move order is a chosen quiet, not a
 * lesson missed, and the row must not nag a commander buying silence. So
 * `worked` remembers every own harvester seen working, and is pruned to the
 * hulls in this snapshot so a recycled id starts over. A stalled harvester
 * (`idle`) is not waiting either: a mined-out map or a lost yard is §5's
 * scope marker, and pointing at a field there would send the player at
 * nothing. A struck dredge has no `throttle` and is not a harvester here.
 */
export function harvestRow(units: readonly OwnUnit[], worked: Set<number>): HarvestRow {
  const present = new Set<number>();
  let harvesters = 0;
  let working = 0;
  let waiting = 0;
  for (const unit of units) {
    present.add(unit.id);
    if (unit.throttle === undefined) continue;
    harvesters++;
    if (unit.harvesting === true) {
      worked.add(unit.id);
      working++;
    } else if (unit.idle === undefined && unit.aboard === undefined && !worked.has(unit.id)) {
      waiting++;
    }
  }
  for (const id of worked) if (!present.has(id)) worked.delete(id);
  if (waiting > 0) return { kind: 'waiting', count: waiting };
  if (harvesters === 1 && working === 1) return { kind: 'opening' };
  return null;
}

/** Whether two rows say the same thing, so the shell re-renders only on a change. */
export function sameHarvestRow(a: HarvestRow, b: HarvestRow): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  return a.kind === 'opening' || a.count === (b as { count: number }).count;
}

export interface SkirmishOrdersProps {
  /** Commanders seated in the match, AI seats included. */
  seated: number;
  /** The harvester row: `harvestRow`. */
  harvest?: HarvestRow;
}

export function SkirmishOrders({ seated, harvest = null }: SkirmishOrdersProps) {
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
        {harvest?.kind === 'opening' && (
          <p className="objectives-row pending">
            <span className="objectives-status">income</span>
            <span className="objectives-text">Your harvester is working a field</span>
            <span className="objectives-gloss">
              The nodules it hauls home buy hulls and structures. Build more at the Bastion.
            </span>
          </p>
        )}
        {harvest?.kind === 'waiting' && (
          <p className="objectives-row pending">
            <span className="objectives-status">idle</span>
            <span className="objectives-text">
              {harvest.count === 1
                ? 'A new harvester is waiting for a field'
                : `${harvest.count} new harvesters are waiting for a field`}
            </span>
            <span className="objectives-gloss">
              {`Select ${harvest.count === 1 ? 'it' : 'them'}, then right-click a nodule field.`}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
