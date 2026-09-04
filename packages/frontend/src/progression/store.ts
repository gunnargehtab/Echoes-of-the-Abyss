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

import {
  DRIFT,
  MissionOutcome,
  missionHeaderById,
  type CampaignId,
  type MissionResultPayload,
} from '@echoes/shared';

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
  /**
   * The scenes this player has witnessed — the first of the three sibling keys
   * this record was shaped to receive (docs/campaign.md §1, §11).
   *
   * A set, spelled as a record of `true` because JSON has no set and an array
   * would make the union in `recordMissionResult` a dedup rather than a merge.
   * Keyed by scene and not by mission for `MissionBriefingVariant`'s reason:
   * two missions witness one scene, and *Tend* played to a quiet, unfiled day
   * witnessed nothing at all.
   *
   * Absent in a record written by a build that predates this key, which is
   * what "no migration story in the first version" was promised to mean:
   * `sanitise` fills it with an empty set and nothing else notices.
   */
  scenes: Record<string, true>;
  /**
   * Drift Health per map, as the last mission on that map left it — the second
   * sibling key, and docs/campaign.md §2 rule 5's half of the record (#379).
   *
   * Keyed by **map id**, not mission id, because the rule is about ground:
   * *Tend* and *Convocation* are two missions on one `marr-plateau`, and what
   * the second inherits is what the first did to the plateau, whichever
   * mission did it. Each value is the grid `MissionResultPayload.driftHealth`
   * carried, row-major over `DRIFT.HEALTH_REGIONS`², copied as sent.
   *
   * **The one field in this record that is not "best ever".** A mission's
   * outcome keeps its best reading because replaying is free; a map's grid is
   * *replaced* on every close, because a map that healed is not a better
   * reading, it is a later one — the ground is where the last tide left it,
   * and a record that kept the healthiest grid ever seen would be a record
   * that let a player undo a loud run by remembering a quiet one.
   *
   * The client presents this to the room when it creates the next mission on
   * the map, and the server bounds it (`MatchRoom.onCreate`); nothing here is
   * shown to the player, per rule 5 — the map is the message.
   */
  drift: Record<string, number[]>;
  /**
   * The hulls each campaign has spent — docs/campaign.md §7 row 3, and the
   * second of the three sibling keys this record was shaped to receive.
   *
   * Keyed by campaign id and then by cadre id (`MissionUnit.cadre` on the
   * server, an authored roster name and never an entity id), each inner
   * value a set spelled as a record of `true` for `scenes`' reason. Two
   * levels rather than one flat set because a cadre id is a *campaign's*
   * word: the Order's `first` and whatever a Ledger campaign one day calls
   * its own first hull must not collide, and a record that mixed them would
   * spend one navy's loss on another.
   *
   * **Written only from a `missionOver` that carries `spent`**, which only a
   * mission authoring attrition sends, so every id here is one the player
   * watched die and heard read out at the close — nothing the server withheld.
   * Unioned and never replaced: a spent hull is never un-spent, by a better
   * run, a reconnect's replayed conclusion, or anything else. Absent in a
   * record written by a build that predates this key, and `sanitise` reads
   * that as nothing spent.
   */
  spent: Record<string, Record<string, true>>;
}

/** An empty history — what a first boot, a cleared browser or a bad read gives. */
export function emptyProgression(): Progression {
  return { version: 1, missions: {}, scenes: {}, drift: {}, spent: {} };
}

/**
 * Whether a stored value could be a Drift grid at all: an array of finite
 * numbers on docs/bestiary.md §6's 0–100 scale. Its *length* is deliberately
 * not checked here — the server holds a presented grid to the map's exact
 * region count at seeding, and the region count is the server's to know.
 */
function isDriftGrid(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every(
      (cell) =>
        typeof cell === 'number' && Number.isFinite(cell) && cell >= 0 && cell <= DRIFT.HEALTH_MAX
    )
  );
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

  const storedScenes =
    typeof record.scenes === 'object' && record.scenes !== null
      ? (record.scenes as Record<string, unknown>)
      : {};

  // Entry-by-entry, as `missions` is, and membership is the only fact: any
  // truthy value stored under a scene id reads as witnessed, and anything else
  // drops that one id rather than the set.
  const scenes: Record<string, true> = {};
  for (const [id, seen] of Object.entries(storedScenes)) {
    if (seen === true) scenes[id] = true;
  }

  const storedDrift =
    typeof record.drift === 'object' && record.drift !== null
      ? (record.drift as Record<string, unknown>)
      : {};

  // Map by map, for the same reason: one map's unreadable grid costs that map
  // its carry — it plays fresh, which rule 5 permits — never the record.
  const drift: Record<string, number[]> = {};
  for (const [mapId, grid] of Object.entries(storedDrift)) {
    if (isDriftGrid(grid)) drift[mapId] = grid;
  }

  const storedSpent =
    typeof record.spent === 'object' && record.spent !== null
      ? (record.spent as Record<string, unknown>)
      : {};

  // Campaign by campaign and then id by id, under `scenes`' rule at both
  // levels: a campaign whose entry is not an object drops that campaign and
  // no other, and inside one, anything but `true` drops that one id. A
  // hostile or half-written record can therefore un-spend a hull, which is
  // the one direction a corrupt read can be wrong in without costing the
  // player anything they earned — a fuller roster is a gift, and the room
  // cannot tell the difference anyway (`roster.ts`, `validateSpent`).
  const spent: Record<string, Record<string, true>> = {};
  for (const [campaign, ids] of Object.entries(storedSpent)) {
    if (typeof ids !== 'object' || ids === null) continue;
    const kept: Record<string, true> = {};
    for (const [id, flag] of Object.entries(ids as Record<string, unknown>)) {
      if (flag === true) kept[id] = true;
    }
    spent[campaign] = kept;
  }

  return { ...record, version: 1, missions, scenes, drift, spent } as Progression;
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

  // A set union, so the replayed `missionOver` of the reconnect case adds
  // nothing the first delivery did not, and a scene once witnessed is never
  // un-witnessed by a later run of the same mission that went differently.
  const scenes = { ...current.scenes };
  for (const scene of result.scenes ?? []) scenes[scene] = true;

  // Replaced, not merged, and keyed by the map the mission was played on: see
  // `Progression.drift`. Resolved through the public catalogue because the
  // payload names a mission and the rule is about ground; a payload naming a
  // mission this build does not have has no map to file the grid under, so it
  // stores none — the outcome above is still kept, because the id is the
  // player's history whether or not the map is.
  const drift = { ...current.drift };
  const mapId = missionHeaderById(result.missionId)?.mapId;
  if (mapId !== undefined && isDriftGrid(result.driftHealth)) {
    drift[mapId] = [...result.driftHealth];
  }

  // The same union, one level down, into the campaign the mission belongs to
  // — resolved from the header rather than carried on the payload, so the
  // wire says which hulls and the shell says whose. A payload naming a
  // mission this build cannot place is stored above and spends nothing here:
  // there is no campaign to charge. A payload with no `spent` at all — every
  // mission that does not author attrition — leaves the set untouched, which
  // is the whole of "lose one in a mission with attrition off; it returns".
  const spent = { ...current.spent };
  const campaign = missionHeaderById(result.missionId)?.campaign;
  if (campaign !== undefined && result.spent !== undefined && result.spent.length > 0) {
    const charged = { ...spent[campaign] };
    for (const id of result.spent) charged[id] = true;
    spent[campaign] = charged;
  }

  const next: Progression = {
    ...current,
    missions: {
      ...current.missions,
      [result.missionId]: { ...previous, outcome },
    },
    scenes,
    drift,
    spent,
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

/**
 * The scenes this player has witnessed, as the set `missionBriefing` reads.
 *
 * Built on each call rather than cached: the briefing screen asks once, when
 * it mounts, and a cached set would be the thing that shows a stale briefing
 * to a player who finished *Tend* in this same session.
 */
export function seenScenes(): ReadonlySet<string> {
  return new Set(Object.keys(loadProgression().scenes));
}

/**
 * The Drift Health grid a map was last left in, or `undefined` for a map this
 * player has never closed a mission on — which the room reads as a fresh map.
 *
 * Read by the canvas at the moment it creates a mission room, and by nothing
 * that draws: docs/campaign.md §2 rule 5 says nobody tells the player why the
 * plateau is quieter, and a store that offered the grid to a briefing would be
 * the first step toward telling them.
 */
export function driftHealthFor(mapId: string): readonly number[] | undefined {
  return loadProgression().drift[mapId];
}

/**
 * The cadre ids one campaign has spent, as the set the join presents to a
 * mission room (`GameCanvas`, `ConnectOptions.spent`).
 *
 * Built on each call for `seenScenes`' reason — the canvas asks at connect,
 * and a cached set would seat a hull the player just watched the Rest keep.
 * Empty for a campaign that has spent nobody, which is four of the five.
 */
export function spentCadre(campaign: CampaignId): ReadonlySet<string> {
  return new Set(Object.keys(loadProgression().spent[campaign] ?? {}));
}
