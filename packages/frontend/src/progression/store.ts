/**
 * The progression record — what this player has finished (docs/campaign.md §1,
 * §11; docs/ui-ux.md §14, "What the board reads, and what it must not decide").
 *
 * A third `localStorage` key beside `echoes.settings`, and deliberately not a
 * field inside it. Settings are *device preferences* — which volumes suit
 * these speakers, whether this player needs marks before sound — and this is
 * not one. It is the player's history, the only thing the port knows that is a
 * fact about them rather than about the machine. Two consequences decide the
 * split: a settings record that fails its version check loads as defaults, and
 * folding progression into it would make a mixer change that bumped that
 * version erase a campaign; and a "reset settings" control, whenever one
 * arrives, must not be the button that forgets thirteen missions. Separate
 * key, separate version, separate blast radius. The reconnection token stays
 * per-tab in `sessionStorage` for its own reason (see `GameClient.ts`) and is
 * a third kind again — a seat is neither a preference nor a memory.
 *
 * **This is the client's memory of resolved results, never a channel.** Every
 * field here is copied from a `missionOver` payload the server had already
 * sent and the result screen had already shown. Nothing is derived from world
 * state, and nothing the mission did not show the player can be learned by
 * reading it back — which is the server-authoritative rule (CLAUDE.md) applied
 * to persistence rather than to the wire.
 *
 * Storage throws in some privacy modes and lies in others, so every touch of
 * it is defensive, exactly as the settings store is: a missing, corrupt or
 * foreign-versioned record reads as "nothing played", never as an error.
 * Losing progression is a shrug; a shell that cannot boot because JSON.parse
 * threw is a bug.
 */

import { MissionOutcome, missionHeaderById, type MissionResultPayload } from '@echoes/shared';

/** The prologue's id. §1: the order is free *after* this one. */
export const PROLOGUE_MISSION_ID = 'prologue-sorrowgate';

const STORAGE_KEY = 'echoes.progression';

/**
 * What is remembered about one mission.
 *
 * An object rather than a bare `MissionOutcome` so the three systems queued
 * behind this record — "already seen" briefing variants, cross-mission Drift
 * Health, permanent roster attrition — can add mission-scoped fields without a
 * migration: an optional field missing from an older record reads as its
 * default, the same way `missions` itself reads as empty when absent.
 */
export interface MissionRecord {
  /**
   * The best reading this mission has ever returned, not the most recent.
   *
   * `MissionOutcome` is ordered best-first (Complete 0, Partial 1, Lost 2), so
   * "best" is the lower ordinal. The rule follows from the board: a played
   * mission stays playable (docs/ui-ux.md §14), so replaying one has to be
   * free. A player who completed *Attendance* and then went back to hear the
   * return again has not un-completed it, and a record that said otherwise
   * would charge them for curiosity.
   */
  outcome: MissionOutcome;
}

/**
 * The record as a whole.
 *
 * Deliberately a container of collections rather than a flat map, so the three
 * dependants arrive as *sibling keys* — a seen-scene set, per-map Drift
 * Health, a spent roster — beside `missions` rather than inside it. A key that
 * does not exist yet reads as empty, which is what "no migration story in the
 * first version" means in practice.
 */
export interface Progression {
  version: 1;
  /** Keyed by `MissionHeader.id`. Absent means never finished. */
  missions: Record<string, MissionRecord>;
}

/** An empty history — what a first boot, a cleared browser or a bad read gives. */
export function emptyProgression(): Progression {
  return { version: 1, missions: {} };
}

function isOutcome(value: unknown): value is MissionOutcome {
  return (
    value === MissionOutcome.Complete ||
    value === MissionOutcome.Partial ||
    value === MissionOutcome.Lost
  );
}

/**
 * Coerce whatever storage held into a valid `Progression`.
 *
 * Mission-by-mission rather than shape-validated whole, for the settings
 * store's reason: one unreadable entry should cost that mission's tick, not
 * the whole history. Unknown top-level keys are *carried through* rather than
 * dropped, which is the one place this store is stricter with itself than the
 * settings store — a build that has not yet learned about Drift Health must
 * not be the build that deletes it on the next mission it writes.
 */
function sanitise(raw: unknown): Progression {
  if (typeof raw !== 'object' || raw === null) return emptyProgression();
  const record = raw as Record<string, unknown>;
  if (record.version !== 1) return emptyProgression();

  const storedMissions =
    typeof record.missions === 'object' && record.missions !== null
      ? (record.missions as Record<string, unknown>)
      : {};

  const missions: Record<string, MissionRecord> = {};
  for (const [id, entry] of Object.entries(storedMissions)) {
    if (typeof entry !== 'object' || entry === null) continue;
    const outcome = (entry as Record<string, unknown>).outcome;
    if (!isOutcome(outcome)) continue;
    missions[id] = { ...(entry as object), outcome } as MissionRecord;
  }

  return { ...record, version: 1, missions } as Progression;
}

export function loadProgression(): Progression {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored === null || stored === undefined) return emptyProgression();
    return sanitise(JSON.parse(stored));
  } catch {
    return emptyProgression();
  }
}

/**
 * Write one concluded mission into the record, and return the record after it.
 *
 * **Idempotent by construction, because it has to be.** `MatchRoom` re-sends
 * `missionOver` to a client that reconnects into an already-ended room, so a
 * reload on the result screen delivers the same conclusion a second time.
 * Merging the better of the two outcomes makes that replay a no-op rather than
 * something a counter would have to be guarded against — which is why nothing
 * here counts attempts.
 *
 * A payload naming a mission this build does not have is still stored: the id
 * is the player's history, and a mission removed from the registry between
 * builds should not silently drop from it.
 */
export function recordMissionResult(result: MissionResultPayload): Progression {
  const current = loadProgression();
  const previous = current.missions[result.missionId];
  // Lower ordinal is the better reading; see MissionRecord.outcome. Compared
  // rather than `Math.min`ed so the result stays a `MissionOutcome` instead of
  // widening to `number` on its way into the record.
  const outcome: MissionOutcome =
    previous === undefined || result.outcome < previous.outcome ? result.outcome : previous.outcome;

  const next: Progression = {
    ...current,
    missions: {
      ...current.missions,
      [result.missionId]: { ...previous, outcome },
    },
  };

  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage refused — the result still stands on screen for this session.
  }
  return next;
}

/** What is remembered about one mission, or `undefined` if it is unplayed. */
export function missionRecord(missionId: string): MissionRecord | undefined {
  return loadProgression().missions[missionId];
}

/**
 * Whether this mission has ever been finished — the board's `played` state
 * (docs/ui-ux.md §14). Any of the three readings counts: the ladder says what
 * happened, and all three of them happened.
 */
export function hasPlayed(missionId: string): boolean {
  return missionRecord(missionId) !== undefined;
}

/**
 * Whether a slot may be opened.
 *
 * docs/campaign.md §1: **the prologue first, and then the order is free.** So
 * this gate has exactly one rung — no slot in a faction campaign asks for the
 * slot before it, because §1 refuses to have an ordering there and mission ids
 * are namespaced by campaign precisely so nothing implies a mission 2. §10's
 * withholding of active sonar until each campaign's third mission is a
 * property of those missions' own lock lists, not of this record: it shapes
 * what a mission gives you, never which door opens.
 *
 * An unknown id is unlocked once the prologue is done. This function answers
 * "has the player earned this", and a door that does not exist is refused by
 * not being on the board (§14's `unbuilt` state), not by being locked.
 */
export function isMissionUnlocked(missionId: string): boolean {
  // By campaign rather than by id: `prologue` is a campaign in §1's table, and
  // if it ever holds a second mission that one is not gated behind itself.
  if (missionHeaderById(missionId)?.campaign === 'prologue') return true;
  return hasPlayed(PROLOGUE_MISSION_ID);
}
