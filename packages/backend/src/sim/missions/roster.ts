/**
 * The spent roster, at the door — docs/campaign.md §7 row 3, and the row
 * docs/mission-nineteen.md §13 carries.
 *
 * Two pure functions between the wire and the literal. `validateSpent` is the
 * bound the room puts on what a client presents; `fieldDefinition` is what a
 * mission becomes once the record has had its say. Neither touches the ECS,
 * the runtime or the RNG, and neither mutates the authored literal: a mission
 * that has lost a hull is a *derived* definition, and the data file every
 * test reads stays the data file the document was transcribed into.
 *
 * **Where the truth lives, stated so nobody mistakes the bound for a proof.**
 * The record is `echoes.progression` in the client's own storage
 * (`packages/frontend/src/progression/store.ts`), for the reason that file
 * gives: it is the player's history and the only thing the port knows that is
 * a fact about them rather than about the machine. So the server never learns
 * what a client *failed* to present — a player who edits a hull back into
 * their roster has told the room nothing it can check, exactly as a player
 * who edits `missions` to unlock the board has. What the room *can* check is
 * that the set has the shape the record writes and names hulls the mission
 * authors, which keeps a hostile client from handing the runtime something it
 * would fall over. That is the same standard Drift Health's grid is held to on
 * its way in: bounded, not believed. The information rule (CLAUDE.md) is
 * untouched either way — a spent set is the client's own memory of its own
 * dead, and nothing in it names anybody else's water.
 */

import type {
  MissionConditionalBeat,
  MissionDefinition,
  MissionObjective,
  MissionPredicate,
  MissionRole,
  MissionUnit,
} from './types.ts';

/** The hulls a mission would seat for the player, before the record is consulted. */
function playerUnits(definition: MissionDefinition): readonly MissionUnit[] {
  return definition.parties.find((party) => party.slot === definition.playerSlot)?.units ?? [];
}

/**
 * Bound a client's spent set to what this mission could possibly field.
 *
 * `null` is a refusal of the whole set: something that is not an array, or an
 * entry that is not a string, is a shape the record never writes and the wire
 * should not have carried. An id that *is* a string but names no hull of this
 * mission's player party is dropped rather than refused, because that is the
 * normal case and not a tamper — the client presents the campaign's whole
 * spent set to every mission of the campaign, and The Three fields three of
 * Nineteen's six. A mission that fields none of the presented ids gets an
 * empty set, which is the same as never having been told.
 *
 * Bounded by *this* mission's party rather than by the campaign's roster, so
 * the function needs nothing but the definition it is given: what it returns
 * is exactly the set `fieldDefinition` can act on, and a name it cannot act on
 * is a name it has no reason to keep.
 */
export function validateSpent(spent: unknown, definition: MissionDefinition): Set<string> | null {
  if (!Array.isArray(spent)) return null;
  const fielded = new Set<string>();
  for (const unit of playerUnits(definition)) {
    if (unit.cadre !== undefined) fielded.add(unit.cadre);
  }
  const valid = new Set<string>();
  for (const id of spent as unknown[]) {
    if (typeof id !== 'string') return null;
    if (fielded.has(id)) valid.add(id);
  }
  return valid;
}

/**
 * A predicate as it reads over what was actually seated.
 *
 * **The record moves hulls. It never moves a rung** (#612): a mission's ladder
 * — its rows, its `terminal` set, its `keystone` set — is what §8 authored,
 * whatever the campaign has spent. Nothing is removed here, and only one kind
 * of count moves, because "count" means two different things in the objective
 * table and only one of them is about the roster:
 *
 * - A **`survive` count is a roll call of the party that sailed.** "Three
 *   cutters. Three is the number of hulls the Order can put under two nodes"
 *   (docs/mission-rim-deposits.md §8) asks whether everyone came home, and
 *   asking it of two hulls when two sailed is the same question, not a
 *   different one. So it clamps.
 * - An **`extract` count is a fact about the water**, and does not care what
 *   the Order brought. The Chord is two loaded carriers because the rim's
 *   crystal takes two carriers — "below that there is no Chord and no reason
 *   for the week" — so a raid with one cutter has no Chord, and the row says
 *   so. Clamping it to one bought a winnable raid by printing "Two cutters are
 *   above the line with the rim aboard" over a single hull, which is the lie
 *   this rule exists to stop telling.
 *
 * A `survive` row whose role has *no* hull left keeps its authored count
 * rather than clamping to zero, so it reads unmet instead of met-with-nothing.
 * Its unmet line is a roll call — "A cutter is entered. Say the name to the
 * house yourself." — and that is true of a cutter entered at the Rest, which
 * is exactly when this case arises.
 *
 * `quiet` addresses a role too, and is left alone: a ceiling over an empty
 * set is trivially kept, which is the truth and costs no sentence.
 */
function fielded(
  predicate: MissionPredicate,
  countByRole: ReadonlyMap<MissionRole, number>
): MissionPredicate {
  if (predicate.kind !== 'survive') return predicate;
  const seated = countByRole.get(predicate.role) ?? 0;
  if (seated === 0) return predicate;
  return predicate.count > seated ? { ...predicate, count: seated } : predicate;
}

/**
 * The mission as it is fielded once the record has had its say.
 *
 * The same object when nothing is spent — most missions, most of the time,
 * and every mission outside the Knights' campaign — so the identity check
 * every caller already makes on a definition keeps meaning what it meant.
 * Otherwise a derived definition: the player party's `units` without the
 * hulls whose `cadre` is spent, and the authored ladder otherwise intact —
 * every objective and every conditional beat still there, with only a
 * `survive` count re-read against the party that sailed (see `fielded`).
 *
 * **Everything else stays authored, and the runtime already does the right
 * thing with it.** A `move` beat, a lift or a sounding that names a spent
 * hull's tag resolves to entity 0 in `MissionRuntime.eidOf` and does nothing,
 * which is precisely "the hull is not there": a sounding whose carrier was
 * never seated is an interval the Order cannot play, and
 * `applySoundings` already treats a missing carrier as the ultimate broken
 * hold. Deleting those rows here would be a second implementation of a rule
 * the runtime states once.
 *
 * Scripted parties are never touched. A spent set names the player's own
 * hulls and nothing else (`validateSpent`), and a mission's opposition is not
 * the player's to have lost.
 */
export function fieldDefinition(
  definition: MissionDefinition,
  spent: ReadonlySet<string>
): MissionDefinition {
  if (spent.size === 0) return definition;
  const party = definition.parties.find((p) => p.slot === definition.playerSlot);
  if (party === undefined) return definition;
  const units = party.units.filter((unit) => unit.cadre === undefined || !spent.has(unit.cadre));
  if (units.length === party.units.length) return definition;

  const countByRole = new Map<MissionRole, number>();
  for (const unit of units) {
    if (unit.role !== undefined) countByRole.set(unit.role, (countByRole.get(unit.role) ?? 0) + 1);
  }

  const objectives: MissionObjective[] = definition.objectives.map((objective) => {
    const predicate = fielded(objective.predicate, countByRole);
    return predicate === objective.predicate ? objective : { ...objective, predicate };
  });

  let conditionalBeats: MissionConditionalBeat[] | undefined;
  if (definition.conditionalBeats !== undefined) {
    conditionalBeats = definition.conditionalBeats.map((beat) => {
      const when = fielded(beat.when, countByRole);
      return when === beat.when ? beat : { ...beat, when };
    });
  }

  return {
    ...definition,
    parties: definition.parties.map((p) => (p === party ? { ...party, units } : p)),
    objectives,
    ...(conditionalBeats === undefined ? {} : { conditionalBeats }),
  };
}
