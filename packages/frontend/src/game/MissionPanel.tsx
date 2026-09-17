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
  type BoundSig,
  type MissionAbility,
  type AbilityLock,
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

/**
 * A SIG figure in §3's form — three digits, zero-padded, "so the digit count
 * never shifts".
 *
 * Formatting and not arithmetic, which is the line this file holds: the value
 * is the server's and is rendered unchanged, the same way `Math.ceil` rounds
 * the debt below without computing it.
 */
const sigDigits = (sig: number) => String(sig).padStart(3, '0');

/**
 * The header's SIG reading, in whichever of §10.5's forms the mission earns.
 *
 * Three, and the differences between them are the whole of #623's criteria 9
 * and 10:
 *
 * - A silence order that the mission has worded — `flight SIG 006 / 020`.
 * - A silence order it has not — `SIG 022 / 025`. The numbers are the same
 *   numbers; what is missing is only the claim about whose they are.
 * - No order at all — `SIG budget 050`, a labelled figure and not a rule.
 *
 * The set-name is the server's word, rendered as sent. What this function
 * composes is the surrounding form, which §10.5 authors and which is the
 * same for every mission — formatting, the way `sigDigits` is, and not the
 * templating of authored prose that the rows below refuse.
 */
const sigReading = (view: MissionView, boundSig: BoundSig | undefined): string => {
  if (boundSig === undefined) return `SIG budget ${sigDigits(view.sigBudget)}`;
  const figure = `SIG ${sigDigits(boundSig.peak)} / ${sigDigits(boundSig.ceiling)}`;
  return boundSig.setName === undefined ? figure : `${boundSig.setName} ${figure}`;
};

/**
 * Locks that share a reason are stated once, naming every ability they cover
 * (docs/ui-ux.md §10.5).
 *
 * §7 asks that a dead affordance carry its reason; it does not ask that the
 * same sentence be printed once per affordance. Sorrowgate strikes four of the
 * player's buttons under two reasons, and printing them separately spent eight
 * lines of a panel that must fit (§2) to say two things — while a player
 * reading `weapons cold` for the fourth time learns nothing they did not have
 * on the first. Order is preserved, and it is the mission's: the first lock to
 * name a reason is where that reason stands.
 */
const groupLocks = (
  locks: readonly AbilityLock[]
): { abilities: MissionAbility[]; reason: string }[] => {
  const groups: { abilities: MissionAbility[]; reason: string }[] = [];
  for (const lock of locks) {
    const existing = groups.find((group) => group.reason === lock.reason);
    if (existing === undefined) groups.push({ abilities: [lock.ability], reason: lock.reason });
    else existing.abilities.push(lock.ability);
  }
  return groups;
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
  /**
   * What a mission's silence order is reading, and the ceiling it is held to —
   * `EchoSnapshot.boundSig`, off the snapshot rather than off the view
   * (#623 criterion 8).
   *
   * A prop and not a field of `view` because the two arrive on different
   * channels for a reason the runtime spells out: the view is edge-gated on a
   * JSON of itself, and a live SIG reading on it would re-send every objective
   * five times a second. Absent is a mission that lends no array, and every
   * skirmish.
   */
  boundSig?: BoundSig;
  /** Recentre the camera. The same callback the contact log focuses with. */
  onFocus(x: number, y: number): void;
  /**
   * Ring the commander's one act — docs/characters.md. Absent in a mission
   * that grants none, and the button is not rendered at all rather than
   * rendered dead: an affordance that could never work is not an affordance
   * with a reason, it is furniture.
   */
  onCommanderAbility?(): void;
}

export function MissionPanel({ view, boundSig, onFocus, onCommanderAbility }: MissionPanelProps) {
  const markerFor = (objective: ObjectiveView) =>
    objective.markerId === undefined
      ? undefined
      : view.markers.find((marker) => marker.id === objective.markerId);

  return (
    <section className="objectives" aria-label="Objectives">
      <header className="objectives-title">
        <span>ORDERS</span>
        {/* Two different numbers can stand here, and which one depends on
            whether the mission is enforcing anything.

            Where a silence order is in force, this is *the order*: the loudest
            hull it binds and the ceiling it is actually held to, both off
            `boundSig` and both computed by the ledger that charges for the
            breach (#623 criterion 8). A ceiling with no reading beside it left
            the player nothing to check the rule against, and the instrument
            nearest to hand — the meter in the top bar — is the peak across
            everything the player owns, which is a set the order does not bind:
            at Sorrowgate the tenders are the loudest thing in the convoy and
            are not party to the rule (docs/mission-sorrowgate.md §4).

            §3's form, `SIG 042 / 100`, and not an inequality. A relation is a
            claim, and at the one moment the chip matters — the breach — the
            claim would be **false**: `flight SIG 26 ≤ 25` says something untrue
            precisely when the player most needs to read it, which is confusion
            rather than dread. A value against its limit is never false. The
            zero-padding is §3's too, and it is load-bearing here rather than
            decorative: this figure moves (the Dome's watch reads 22 on its
            first pass and 5 thereafter) and it sits in a `space-between`
            header, so an unpadded reading would shuffle the row under itself
            every time a digit came or went.

            The set-name in front of the figure is the mission's own word and
            arrives only where one was authored (#623 criterion 9). It is not
            decoration: without it a compliant flight reads as being in breach
            of its own freight. But the ledger's `silenceRole` is not that word
            and is never sent — it is an internal id, so `called SIG 022 / 025`
            would be worse than the bare figure, which at least claims nothing
            it cannot support.

            Where no order is in force, this is the mission's SIG budget, said
            as a budget: design metadata, never a live threshold, and nothing
            fails for crossing it (docs/campaign.md §10). It carried a `≤` until
            #623 criterion 10 — an inequality that stated a rule the game does
            not enforce, across the twenty-four missions that lend no array. The three ledger
            missions whose budget and ceiling differ are why the two cannot be
            the same field — Attendance's budget of 8 is "a description rather
            than a ceiling" in its own §4 while its order is 25, so a reading
            drawn against the budget would read as a breach of a rule nobody is
            enforcing.

            Outside the `role="status"` region below on purpose: this number
            moves on the Echo tick, and a live region that announced it would
            talk over every objective the panel exists to read out. */}
        <span className="objectives-ceiling">{sigReading(view, boundSig)}</span>
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
              {/* The plain line beside the court's own — §10.5's gloss rule,
                  and the decision on #720 that the reading is not rewritten.
                  Authored server-side and printed here unedited, exactly as
                  the line above it is: this file templates neither half.

                  Inside the row rather than after it, which is the whole of
                  what §10.5 and §11 ask for and is one decision rather than
                  two. §10.5 promises this region changes *in place*, so a
                  gloss that were its own row would make the panel grow and
                  shrink under a live region as a mission revealed objectives.
                  §11 asks that it be announced with its row rather than be a
                  second unannounced thing on screen — and a row is either a
                  `p` inside the status region or a `button` whose accessible
                  name is its contents, so being *in* the row satisfies both
                  without the panel having to know which kind it built.

                  Secondary in the visual hierarchy is App.css's half of the
                  same rule; secondary in the reading order is this position,
                  after the authored sentence. A player who wants the fiction
                  reads it first and can stop there. */}
              {objective.gloss !== undefined && (
                <span className="objectives-gloss">{objective.gloss}</span>
              )}
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
            {groupLocks(view.locks).map((group) => (
              // Dead affordances, named with the reason attached (§7). The
              // reason is here as standing state rather than as a response to
              // a refused order, so the player reads it before reaching for
              // the key rather than after. One row per *reason*, naming every
              // ability it covers — see `groupLocks`.
              <li key={group.abilities.join('-')} className="objectives-lock">
                <span className="objectives-lock-name">
                  {group.abilities.map((ability) => ABILITY_LABEL[ability]).join(' · ')}
                </span>
                <span className="objectives-lock-reason">{group.reason}</span>
              </li>
            ))}
          </ul>
        )}

        {view.ability !== undefined && onCommanderAbility !== undefined && (
          // The commander's one act. A button rather than a key, and one that
          // states its own price in the line beneath it: docs/campaign.md §10
          // asks that a mission's system be load-bearing and legible, and an
          // act that can be taken exactly once should be read before it is
          // reached for. Dimmed rather than removed once spent, with the reason
          // attached, per the same rule the locks above follow (docs/ui-ux.md
          // §7) — what the plateau has already done is part of what the panel
          // is for.
          <div className="objectives-act">
            <button
              type="button"
              className={`objectives-act-button${view.ability.available ? '' : ' spent'}`}
              disabled={!view.ability.available}
              onClick={onCommanderAbility}
            >
              {view.ability.label}
            </button>
            <p className="objectives-act-reason">
              {view.ability.reason ?? view.ability.description}
            </p>
            {view.ability.remainingS > 0 && (
              <p className="objectives-act-running">ringing · {view.ability.remainingS}s</p>
            )}
          </div>
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
