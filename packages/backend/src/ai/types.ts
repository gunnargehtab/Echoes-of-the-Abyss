/**
 * The AI's vocabulary — docs/tech-stack.md "The skirmish AI".
 *
 * Two halves, and the split is the whole point of this directory.
 *
 * **In**: an `AiBriefing` once, and an `EchoSnapshot` per Echo tick. Nothing
 * else. The briefing is the map — terrain, spawns, nodule fields — which is
 * exactly what a human client is sent on join and is public by definition,
 * both commanders are standing on it. The snapshot is the same per-slot,
 * already-resolved payload a human receives, with contacts under opaque
 * handles that name no entity.
 *
 * **Out**: `AiCommand`s, drawn from the same list of verbs a client may send.
 * Not a resemblance — "the AI plays through the interface a player plays
 * through" has to be literally true or it is decoration.
 *
 * Today it is true with **five named exceptions**: 22 variants against the 27
 * in-match client messages, the difference listed and justified in
 * `AiUnbuilt` and `AiExempt` below — three verbs nobody has written a rule
 * for, and two an AI seat provably cannot use. That is a narrower claim than
 * this comment used to make, and the reason it is written down rather than
 * asserted is #621 — this comment claimed the two sets were identical, and
 * for the whole of this file's life that was false. `depth` was the set
 * difference once; then five more accumulated behind it, because nothing
 * checked.
 *
 * **Both directions are checked now, and by different machinery.** A variant
 * the seat forgets to handle is caught by the `never` at the foot of its
 * switch (`seat.ts`), which has caught that direction since `depth`. A client
 * message with no variant was invisible to it — there is nothing in the union
 * for a switch to fail on — and is caught by the `Exclude<>` assertion just
 * beneath the union below. Adding a 28th in-match message now fails
 * `npm run type-check` until someone writes the verb or names it as a gap.
 *
 * A conventional RTS AI reads the world and nobody minds. Here that would not
 * be unfair so much as a *category error*: the game is the act of deciding
 * under partial acoustic information, so an opponent that knows where your
 * hulls are is playing a different game in the same room. It is also the best
 * available test of the information model — if a commander restricted to
 * resolved contacts can play competently, the model carries a game.
 */

import type {
  AiDifficulty,
  EchoSnapshot,
  Faction,
  HarvestThrottle,
  InMatchClientMessageKey,
  RefitKind,
  ResourceNodeInfo,
  StructureKind,
  UnitKind,
} from '@echoes/shared';

/**
 * Difficulty is **decision quality and nothing else**.
 *
 * Defined in `@echoes/shared` because it is a lobby-level fact the other
 * commander is entitled to see, and re-exported here so everything about the
 * AI can be imported from one place. There is no vision multiplier and there
 * must never be one — see `AiTuning`, which has no field that could carry one.
 */
export { AiDifficulty } from '@echoes/shared';

/** The biome grid, exactly as `Terrain.serialize()` hands it to a client. */
export interface TerrainView {
  cols: number;
  rows: number;
  cellM: number;
  biomes: number[];
  /**
   * The water column per cell, parallel to `biomes`. `ceiling` is 0 on open
   * water; non-zero is a roofed passage (docs/systems-depth.md §1).
   */
  floor: number[];
  ceiling: number[];
}

/**
 * Everything the commander is told once, at the start.
 *
 * All of it is map data. `spawns` is here because a start position is painted
 * on the map and visible to everyone — a human can see where the other corner
 * is, and withholding it from the AI would model a fog the game does not have.
 */
export interface AiBriefing {
  slot: number;
  faction: Faction;
  difficulty: AiDifficulty;
  widthM: number;
  heightM: number;
  /** Every start on this map, in slot order. */
  spawns: { x: number; y: number }[];
  nodes: ResourceNodeInfo[];
  /**
   * The map's bloom gardens — docs/systems-flora.md §2, docs/maps.md.
   *
   * Public map data like `nodes` and `spawns`, and for the same reason a
   * start position is here: a garden is authored ground that everybody can
   * see, and the guard-rail that sites it on the most reachable water only
   * works if everybody can find it (docs/systems-echo.md §10).
   *
   * Positions, not beds. What is *standing* on one is a kelp field whose crop
   * moves, and that belongs to the snapshot's hazards where a commander has
   * to have heard it.
   */
  blooms: { x: number; y: number }[];
  terrain: TerrainView;
}

/**
 * One command, mirroring one client message.
 *
 * `attack` carries a **contact handle**, never an entity id, for the same
 * reason the client's does: a handle is per-observer and means nothing to
 * anyone who did not earn it, so an AI cannot name a hull it has not heard.
 */
export type AiCommand =
  | { kind: 'move'; unitIds: number[]; x: number; y: number }
  /** Attack-move: go there and fight what you meet (#435). The push order. */
  | { kind: 'attackMove'; unitIds: number[]; x: number; y: number }
  | { kind: 'stop'; unitIds: number[] }
  | { kind: 'attack'; unitIds: number[]; contactId: number }
  | { kind: 'harvest'; unitIds: number[]; nodeId: number }
  | { kind: 'throttle'; unitIds: number[]; throttle: HarvestThrottle }
  | { kind: 'silent'; unitIds: number[]; active: boolean }
  | { kind: 'engineOff'; unitIds: number[]; active: boolean }
  | { kind: 'ping'; unitId: number }
  /**
   * Lay a mine where the hull is standing (docs/systems-combat.md §6).
   *
   * One hull, like `ping`, and for the same reason: it is a thing a single
   * boat does at a single point, and a group order would put four mines on
   * one spot. It carries no position either — a mine is dropped, never aimed
   * — so the commander's only way to choose where the wall goes is to have
   * walked the layer there first.
   */
  | { kind: 'mine'; unitId: number }
  | { kind: 'layDecoy'; unitId: number }
  | { kind: 'torpedo'; unitId: number; contactId: number }
  | { kind: 'depthCharge'; unitId: number; depthM: number }
  | { kind: 'seedSpore'; unitId: number; contactId: number }
  | { kind: 'sing'; unitId: number }
  | { kind: 'build'; structure: StructureKind; x: number; y: number }
  | { kind: 'produce'; structureId: number; unit: UnitKind }
  /**
   * Buy a fleet-wide refit at a yard (docs/systems-progression.md §2).
   *
   * Names the yard, like `produce`, because the refit takes that yard's line
   * — and because the Knights' Pressure Refit takes no line and is struck at
   * a Bastion instead, so which structure it is bought at is a decision and
   * not an implementation detail.
   */
  | { kind: 'refit'; structureId: number; refit: RefitKind }
  /**
   * The vertical order. Carries one depth for a group, so a commander that
   * wants two depths emits two commands — which is what happens whenever the
   * force is mixed, because a hull may only be sent as deep as its own
   * Pressure Rating allows.
   */
  | { kind: 'depth'; unitIds: number[]; depthM: number }
  /**
   * Board a carrier (#501). The carrier is an own unit id, as `unitIds` are:
   * a commander boards its own hulls and nobody else's, and the snapshot
   * tells it which of its own hulls carries a hold.
   */
  | { kind: 'embark'; unitIds: number[]; carrierId: number }
  /** Land the hold of each of these carriers where it stands. */
  | { kind: 'disembark'; unitIds: number[] }
  /**
   * Drop the decoy (docs/systems-combat.md §5). One hull, like `ping` and
   * `mine`, and for the same reason: the suite is a single boat's and its
   * cooldown is that boat's own.
   *
   * It carries no position because a countermeasure is not aimed — it goes
   * 60 m astern of wherever the hull is and whichever way it was travelling —
   * which is why `commandCountermeasures` spends it only on a hull that is
   * actually under way. See that pass for what was measured.
   */
  | { kind: 'noisemaker'; unitId: number };

// --- The vocabularies are held against each other --------------------------
//
// #621. `seat.ts` ends with `const unhandled: never = command`, which fails
// the build when the commander can say something the seat cannot act on. The
// other direction — a message a *client* can send that the commander cannot
// say — was invisible to it, and six verbs accumulated there. The three
// assertions below close it, and their shape matters: `Exclude<>` rather than the
// `Exact<>` that polices `wire.ts`, because when `Exact<>` fails it reports
// `Type 'true' is not assignable to type 'never'` and names nothing, while
// `Exclude<>` quotes the offending verb. The diagnostic is the whole point —
// a build error that does not say which message is missing sends the next
// author to diff two lists by eye, which is what produced this gap.
//
// Each is a never-called function rather than the `const x: never = y` the
// same idea reads as, because that form wants a `declare const` to stand in
// for the impossible value — and a `declare` is erased while the *reference*
// to it survives into the emitted JS. It type-checks, then throws
// `ReferenceError` in every file that imports this one. A parameter is the
// same assertion with nothing to resolve at runtime.

/**
 * In-match verbs the commander cannot say, each with what closes it.
 *
 * Every entry here is a hole, not a decision, and the price of listing one is
 * naming the issue that fills it. An entry with no issue number is this
 * defect again with a rubber stamp on it: the list stops being a record of
 * known gaps and becomes a place to put inconvenient verbs.
 *
 * The commander has no rule that would spend any of these:
 *
 * - `hold` (`Match.orderHold`) — approximated today by `engineOff`, which
 *   `commandWatchPost` uses to park an Acolyte by cutting its drive. That is
 *   much the quieter posture, and by more than it looks: `engineOffSig` is
 *   half the hull's *Silent Running* figure rather than a fraction of idle,
 *   which puts a parked Acolyte near SIG 2, while a hold leaves the drive
 *   turning at its idle 10. So the gap costs tidiness rather than strength,
 *   and converting that caller would spend five-fold the watch post's
 *   signature on a rounder count — the wrong trade here, on the one axis this
 *   game is about. The branch that would earn `hold` is a hull that needs its
 *   *gun* live while stationary, and no pass wants one yet. #703.
 * - `rally` (`Match.setRally`) — a *structure's* spawn point, which is why it
 *   cannot be conflated with the per-hull walks that send a siege hull back
 *   to the fleet. #703.
 * - `followFloor` (`Match.orderFollowFloor`). #703.
 *
 * The issue number moved from #621 to #703 when the first closed, and that is
 * the maintenance this list costs: an entry naming a *closed* issue names
 * nothing that will fill it, which is the rubber stamp the paragraph above
 * warns about, arrived at by attrition rather than by anyone deciding.
 *
 * **#703 is the last of those moves, by decision.** The rule above wants a
 * live issue, and that issue could only close by building all three or
 * exempting all three — both of which #703 weighed and declined on the
 * merits. So it would have closed by attrition in its turn and handed these
 * same three entries to a fresh successor, and that one to the next: the
 * convention eating its own tail one closed citation at a time. #703 is
 * labelled `standing` instead — open because the decision went that way, and
 * kept off the backlog Routine's list by that label rather than by sitting
 * permanently assigned (CONTRIBUTING.md, "Labels"). The three citations above
 * are therefore stable, and an author who wants to add a fourth entry has a
 * live issue to name rather than a reason to file one.
 *
 * `noisemaker` was the fourth of these and is `commandCountermeasures` now.
 * It was the one that bought strength rather than tidiness, which is what
 * earned it a doctrine field and a measured range instead of a variant and a
 * reflex.
 */
type AiUnbuilt = 'hold' | 'rally' | 'followFloor';

/**
 * In-match verbs an AI seat has no use for, with the evidence that it never
 * will — the answer to the one design call #621 reserved to the owner.
 *
 * A separate union from `AiUnbuilt` because these are decisions and those are
 * holes: nothing closes an entry here, so unlike a gap it carries no issue
 * number, and the absence is the claim rather than an oversight.
 *
 * The separation is worth the second type. A gap and an exemption look
 * identical from outside — both are verbs the commander cannot say — and
 * #621 was filed because six of them had been sitting in one undifferentiated
 * silence for the life of this file. A reviewer asked to wave a name onto a
 * list is entitled to know which list they are being asked for, because only
 * one of the two is meant to shrink.
 *
 * - `ability` — `MatchRoom` refuses `addAi` in any room where
 *   `this.mission !== null`, and `Match.commanderAbility` is
 *   `missionRuntime?.fireAbility(slot) === true`. An AI seat can never sit in
 *   a room where the verb does anything.
 * - `sow` — docs/systems-flora.md §"the commander's opinion is two judgements
 *   and no more", and neither of the two is sowing.
 */
type AiExempt = 'ability' | 'sow';

/**
 * A message a seated client may send that the commander can neither say nor
 * account for. There are none, and the build fails while there are.
 */
function _everyInMatchVerbIsSaidOrNamed(
  verb: Exclude<InMatchClientMessageKey, AiCommand['kind'] | AiUnbuilt | AiExempt>
): never {
  return verb;
}
void _everyInMatchVerbIsSaidOrNamed;

/**
 * A verb listed above that the commander has since learned to say.
 *
 * The other way these lists rot: a variant lands, nobody prunes the entry,
 * and the count in the header drifts again. Filling a gap is now *required*
 * to remove it rather than merely polite — this is the assertion `noisemaker`
 * tripped on its way out of `AiUnbuilt`.
 */
function _noGapIsAlreadyBuilt(verb: Extract<AiUnbuilt | AiExempt, AiCommand['kind']>): never {
  return verb;
}
void _noGapIsAlreadyBuilt;

/**
 * An entry naming something no seated client could send in the first place.
 *
 * Catches a typo and catches a lobby name wandering in — either would make
 * the first assertion pass by excluding a verb that was never in the set.
 */
function _everyGapIsARealMessage(
  verb: Exclude<AiUnbuilt | AiExempt, InMatchClientMessageKey>
): never {
  return verb;
}
void _everyGapIsARealMessage;

/** What a commander is: snapshot in, commands out, and nothing else. */
export interface AiPlayer {
  readonly slot: number;
  observe(snapshot: EchoSnapshot): AiCommand[];
}

/**
 * Why a navy's ordnance hull is or is not in the water (#698).
 *
 * Five counters that **partition** the observations reaching the ordnance want
 * in `commandProduction`: every such observation increments exactly one of
 * them, so the five sum to `reached` and a column that does not is a bug in the
 * instrumentation rather than a finding about a navy.
 *
 * It exists because the fault it measures is invisible in every other column.
 * The report can already say a hull was never built (`buildsPerMatchByKind`,
 * the column #518 was opened for) and can say whether the yard that builds it
 * ever rose (`structuresPerMatchByKind`) — but between those two there are
 * three different reasons a want can come to nothing, and a navy that never
 * fields its declared ordnance hull looks identical under all of them. #698
 * had to instrument the commander by hand in a scratch run to tell the Order's
 * case (82% blocked on the escort gate) from the Directorate's (67% blocked on
 * the yard) from the Commune's (36% blocked on the purse). This makes that
 * reading a standing column instead of a one-off.
 *
 * **This is a measurement of a decision, not of the world**, which is why it
 * travels beside the telemetry rather than inside it — see the note on
 * `MatchTelemetry.finish`. Nothing in the simulation reads it and no command
 * depends on it; a commander that is never asked for it behaves identically.
 */
export interface OrdnanceWantTally {
  /** Observations that reached the want at all. Equals the sum of the rest. */
  reached: number;
  /** The escort gate was shut: fewer armed hulls than the doctrine's floor. */
  notEscorted: number;
  /** Escorted, and the navy already has one. The want was satisfied. */
  alreadyHas: number;
  /** Escorted and wanted, but no yard of the right kind was free. */
  noYard: number;
  /** Escorted, wanted, a yard free — and the purse could not pay. */
  cannotAfford: number;
  /** Escorted, wanted, a yard free, and paid for. A hull was ordered. */
  bought: number;
}

/** A tally with every counter at zero — a commander that has not observed yet. */
export function emptyOrdnanceWantTally(): OrdnanceWantTally {
  return {
    reached: 0,
    notEscorted: 0,
    alreadyHas: 0,
    noYard: 0,
    cannotAfford: 0,
    bought: 0,
  };
}
