/**
 * What a match looked like, as numbers.
 *
 * The series here exist to answer specific questions, and the questions are
 * the balance guard-rails in docs/economy.md §9 and docs/bestiary.md §8. Those
 * tables name four ways this design could fail — "quiet economies simply win",
 * "loud economies are unplayable", "Directorate Biomass snowballs", "Knights
 * starve out of every long game" — and until now there was no way to test any
 * of them except by playing, which needed two humans and a calendar.
 *
 * **Everything is read from the players' own snapshots**, the same payloads a
 * client receives, rather than from the ECS. Not for purity — an analyst is
 * entitled to ground truth — but because the union of every player's snapshot
 * *is* ground truth for everything worth measuring here, and taking it from
 * there means the harness measures the game as it is actually delivered. A
 * metric read out of the world could quietly diverge from what any player
 * could ever have experienced.
 *
 * One honest limit follows from that, and it drove the shape of two fields.
 * `firstContactTick` is the first tick *anyone resolved anything*, and with
 * the Drift populated that is almost always tick 0 — a creature is in earshot
 * of a spawn from the first frame. Which is true, and useless as a measure of
 * when the two commanders found each other.
 *
 * So `firstEnemyContactTick` is tracked separately, and keyed on the one
 * signal that cannot be a creature: a contact carrying a `faction`.
 * Classification at Tier 3 names a faction for a hull and a *species* for a
 * creature, never both, so a contact with a faction is another player by
 * construction. Below Tier 3 there is no way to tell, and no oracle is
 * invented to pretend otherwise — contact handles are per-observer and name
 * no entity. Ambiguity is the game.
 */

import {
  DepthBand,
  HarvestThrottle,
  ThermoclineZone,
  ResolutionTier,
  SIM,
  UnitKind,
  depthBandFor,
  thermoclineZone,
  type EchoSnapshot,
  type Faction,
} from '@echoes/shared';

/** How often a series is sampled, in seconds of simulated time. */
export const SAMPLE_INTERVAL_S = 10;

/** One player's story, from their own snapshots. */
export interface PlayerTelemetry {
  slot: number;
  faction: Faction;
  /** Cumulative nodules banked, sampled every SAMPLE_INTERVAL_S. */
  nodules: number[];
  crystal: number[];
  biomass: number[];
  /** Loudest own unit at each sample. */
  peakSig: number[];
  /** Own hulls and structures alive at each sample. */
  hulls: number[];
  structures: number[];
  /** Seconds spent with someone holding Bearing or better on anything of theirs. */
  secondsTracked: number;
  /**
   * First tick *this* player classified an enemy hull. Null if they never did.
   *
   * The batch-wide `firstEnemyContactTick` is the first tick **anyone** did,
   * which cannot answer the question wave 2 is gated on: whether time to first
   * contact moves per navy, and moves *differently* per navy (#506). One navy
   * finding the other at 40 s and being found at 120 s is the whole point of a
   * scout, and a single map-wide figure records it as 40 either way.
   *
   * Keyed on the same signal the batch-wide field is — a contact carrying a
   * `faction`, which classification only ever produces for a hull — so the two
   * mean the same thing at different scopes, and the honest limit at the top of
   * this file applies to both.
   */
  firstEnemyContactTick: number | null;
  /**
   * Hauling time, and how much of it was spent deliberately poor.
   *
   * Summed over the harvesters, so two hulls for a minute is two
   * harvester-minutes. `harvesterSecondsQuiet` is the part of it below
   * Standard — Trickle or Idle, the settings a commander only ever chooses in
   * order to be quieter (docs/economy.md §3).
   *
   * Here because a baseline could not previously see the lever this measures.
   * The AI's throttle response is a per-faction doctrine number, and the
   * income and tracked columns show only its consequences: two very different
   * policies — never dropping, and dropping for half the match at half the
   * income — can land on similar income if one of them also has fewer
   * harvesters. Issue #148 turned that from a theoretical ambiguity into a
   * measurement nobody could make, so it is measured now.
   */
  harvesterSeconds: number;
  harvesterSecondsQuiet: number;
  /** Seconds spent with someone holding a full Track. */
  secondsHardTracked: number;
  /** Seconds of hull-time spent in each depth band, summed over the force. */
  hullSecondsByBand: Record<DepthBand, number>;
  /**
   * The same hull-time, split by thermocline zone instead of by band.
   *
   * A different question from the band split, and the layer is why. Bands are
   * about pressure and what a hull is rated to survive; zones are about who can
   * hear whom, and a pair straddling the layer is cut to 0.3× (docs/systems-echo.md
   * §3). Until the commander had a depth verb this read Above for every AI hull
   * for whole matches, which meant every committed baseline was measured
   * against players that never exercised a third of the acoustic model — and
   * nothing in the harness could say so.
   */
  hullSecondsByZone: Record<ThermoclineZone, number>;
  /** Units lost, by kind ordinal. Counted by id disappearing from their own list. */
  lossesByKind: Record<number, number>;
  /**
   * Units built, by kind ordinal — the same list read the other way round.
   *
   * The half of #518's measurement that is about hulls. `lossesByKind` cannot
   * tell a hull that was never built from one that was built and survived, and
   * every wave of docs/roster-plan.md §4 is gated on hulls whose whole point is
   * that they are expensive and rare: the wave-3 gate read three zeros in the
   * loss table and could not say whether the ordnance hulls never fought or
   * never existed. This says which.
   */
  unitsBuiltByKind: Record<number, number>;
  /**
   * Structures commissioned, by kind ordinal — what this navy actually reached.
   *
   * The measurement #518 found missing. Every reading in the report about
   * whether a commander gets up its tech tree was inferred from the hulls that
   * *died*, and a hull that is never built never dies: three waves of the
   * roster expansion put their hulls behind the Slipway, the loss table showed
   * zeros for all of them in every duel, and nothing in the harness could say
   * whether that meant the hulls were bad or the yard was never bought.
   *
   * Counted on the rise rather than on the order, because a commander that
   * asks for a build the server refuses asks again on every observation
   * (`nearHome`, the placement spiral) — so orders count intent hundreds of
   * times over and structures count it once. The opening Bastion and Foundry
   * are excluded for the reason the opening stockpile is not income: they are
   * a gift, not a decision.
   *
   * The blind spot is deliberate and narrow: a site killed on the way up never
   * rises and so never appears here. That is what `structuresLost` is for, and
   * a navy that laid a rung and lost it reads as a loss with no build.
   */
  structuresBuiltByKind: Record<number, number>;
  structuresLost: number;
  /**
   * Gross income: every rise in the stockpile, summed.
   *
   * Income cannot be read off the *final* stockpile, because a competent
   * commander ends a match near zero and would report as having had no
   * economy. It also cannot be reconstructed from what they built, which was
   * the first attempt here and was wrong twice over: production deducts when
   * an item is queued but the hull only appears when it finishes, so the two
   * ledgers disagree by whatever is in flight — and a structure is charged at
   * placement while its site takes a minute to rise.
   *
   * Measured instead of derived. Only mining raises a stockpile and only
   * spending lowers it, so summing the rises is gross income by definition.
   * Accumulated at the Echo tick rather than at the ten-second series
   * interval so a purchase cannot mask a delivery; a delivery and a purchase
   * inside the same 200 ms still net out, which makes this a slight
   * *under*count and never an over-count.
   */
  nodulesEarned: number;
  crystalEarned: number;
  biomassEarned: number;
  /** Tick this slot's force went to nothing, or null if it survived. */
  eliminatedTick: number | null;
}

export interface MatchTelemetryResult {
  seed: number;
  mapId: string;
  /** Null when nobody won inside the time budget. */
  winnerSlot: number | null;
  timedOut: boolean;
  finalTick: number;
  lengthS: number;
  /** First tick any player resolved any contact. Usually fauna — see above. */
  firstContactTick: number | null;
  /** First tick anyone classified another *player*. Null if they never met. */
  firstEnemyContactTick: number | null;
  /** First tick anything belonging to anybody was destroyed. */
  firstBloodTick: number | null;
  /** Mean Drift Health across regions at the end, 0-100. */
  driftHealthFinal: number;
  players: PlayerTelemetry[];
}

const SAMPLE_TICKS = SAMPLE_INTERVAL_S * SIM.TICK_HZ;

export class MatchTelemetry {
  private readonly players = new Map<number, PlayerTelemetry>();
  /** Own entity ids seen last tick, per slot, to spot a loss as a deletion. */
  private readonly lastUnits = new Map<number, Map<number, number>>();
  private readonly lastStructures = new Map<number, Map<number, number>>();
  /**
   * Which of a slot's structures were finished at the previous observation.
   *
   * A transition rather than a set of ids seen once, because entity ids are
   * **recycled** — `match.ts` says so where it explains why wire lists are
   * sorted rather than emitted in query order — and a lifetime set would credit
   * a rebuilt Refinery to whatever died and freed its id.
   */
  private readonly lastComplete = new Map<number, Set<number>>();
  /**
   * Slots whose opening base has been recorded.
   *
   * Deliberately not pre-populated in the constructor, so an absent slot means
   * "never observed" — the same trick `lastPurse` uses, and here for the same
   * reason.
   */
  private readonly opened = new Set<number>();
  private firstContact: number | null = null;
  private firstEnemyContact: number | null = null;
  private firstBlood: number | null = null;
  private drift: number[] = [];
  private lastSampleTick = -SAMPLE_TICKS;
  private lastObservedTick = 0;
  /** Last stockpile seen per slot, for the income deltas. */
  private readonly lastPurse = new Map<
    number,
    { nodules: number; crystal: number; biomass: number }
  >();

  constructor(
    private readonly seed: number,
    private readonly mapId: string,
    roster: { slot: number; faction: Faction }[]
  ) {
    for (const { slot, faction } of roster) {
      this.players.set(slot, {
        slot,
        faction,
        nodules: [],
        crystal: [],
        biomass: [],
        peakSig: [],
        hulls: [],
        structures: [],
        secondsTracked: 0,
        firstEnemyContactTick: null,
        secondsHardTracked: 0,
        harvesterSeconds: 0,
        harvesterSecondsQuiet: 0,
        hullSecondsByBand: {
          [DepthBand.Shelf]: 0,
          [DepthBand.MidWater]: 0,
          [DepthBand.Abyssal]: 0,
        },
        hullSecondsByZone: {
          [ThermoclineZone.Above]: 0,
          [ThermoclineZone.Duct]: 0,
          [ThermoclineZone.Below]: 0,
        },
        lossesByKind: {},
        unitsBuiltByKind: {},
        structuresBuiltByKind: {},
        structuresLost: 0,
        nodulesEarned: 0,
        crystalEarned: 0,
        biomassEarned: 0,
        eliminatedTick: null,
      });
      this.lastUnits.set(slot, new Map());
      this.lastStructures.set(slot, new Map());
    }
  }

  /**
   * One Echo tick's worth of every player's view.
   *
   * **An eliminated slot keeps receiving snapshots.** `Match.resolveEcho`
   * walks `this.slots`, and elimination does not remove a slot from it — it
   * scuttles everything the slot owned and leaves the seat in place, because
   * the room still has a client on the other end of it who has to be told
   * they lost. So the dead go on being sent a snapshot at 5 Hz for the rest of
   * the match; it is simply empty.
   *
   * That is why elimination is read off the *force* rather than off the map
   * key. An empty own force is elimination exactly: losing the Bastion is
   * elimination (`match.ts`, "the C&C short game") and elimination scuttles
   * the rest, so a commander still in the match always has at least their
   * Bastion in `structures`, and one with neither a hull nor a structure is
   * never merely poor.
   *
   * The missing-key branch is kept underneath it. It costs nothing, it is the
   * honest reading of a slot the sim declines to describe at all, and if the
   * simulation ever does start pruning the roster this keeps measuring the
   * same thing.
   */
  observe(tick: number, snapshots: Map<number, EchoSnapshot>): void {
    const dt = (tick - this.lastObservedTick) / SIM.TICK_HZ;
    this.lastObservedTick = tick;
    const sampling = tick - this.lastSampleTick >= SAMPLE_TICKS;
    if (sampling) this.lastSampleTick = tick;

    for (const [slot, player] of this.players) {
      const snapshot = snapshots.get(slot);
      if (snapshot === undefined) {
        if (player.eliminatedTick === null && tick > 0) player.eliminatedTick = tick;
        if (sampling) this.sampleEmpty(player);
        continue;
      }

      if (
        player.eliminatedTick === null &&
        tick > 0 &&
        snapshot.units.length === 0 &&
        snapshot.structures.length === 0
      ) {
        player.eliminatedTick = tick;
      }

      if (this.firstContact === null && snapshot.contacts.length > 0) this.firstContact = tick;
      // A faction on a contact means classification named a hull, which a
      // creature can never produce. See the note at the top of this file.
      if (this.firstEnemyContact === null || player.firstEnemyContactTick === null) {
        if (snapshot.contacts.some((c) => c.faction !== undefined)) {
          this.firstEnemyContact ??= tick;
          player.firstEnemyContactTick ??= tick;
        }
      }

      // Exposure is continuous state, so it is integrated rather than sampled:
      // "how long were you being held" is the question the loud-economy
      // guard-rail actually asks, and a ten-second sample would miss a raid.
      if (snapshot.exposure.tier >= ResolutionTier.Bearing) player.secondsTracked += dt;
      if (snapshot.exposure.tier >= ResolutionTier.Track) player.secondsHardTracked += dt;

      for (const unit of snapshot.units) {
        player.hullSecondsByBand[depthBandFor(unit.depth)] += dt;
        player.hullSecondsByZone[thermoclineZone(unit.depth)] += dt;
        if (unit.kind !== UnitKind.Harvester) continue;
        player.harvesterSeconds += dt;
        // Integrated like exposure and for the same reason: a throttle a
        // commander held for eight seconds between two ten-second samples
        // happened, and a sampled series would say it did not.
        const throttle = unit.throttle ?? HarvestThrottle.Standard;
        if (throttle === HarvestThrottle.Trickle || throttle === HarvestThrottle.Idle) {
          player.harvesterSecondsQuiet += dt;
        }
      }

      this.accrueIncome(player, snapshot);
      this.countBuildsAndLosses(tick, player, snapshot);
      if (snapshot.driftHealth.length > 0) this.drift = snapshot.driftHealth;
      if (sampling) this.sample(player, snapshot);
    }
  }

  private sample(player: PlayerTelemetry, snapshot: EchoSnapshot): void {
    player.nodules.push(Math.round(snapshot.nodules));
    player.crystal.push(Math.round(snapshot.crystal));
    player.biomass.push(Math.round(snapshot.biomass));
    player.peakSig.push(Math.round(snapshot.peakSig));
    player.hulls.push(snapshot.units.length);
    player.structures.push(snapshot.structures.length);
  }

  private sampleEmpty(player: PlayerTelemetry): void {
    player.nodules.push(0);
    player.crystal.push(0);
    player.biomass.push(0);
    player.peakSig.push(0);
    player.hulls.push(0);
    player.structures.push(0);
  }

  /**
   * Gross income, as the rises in a stockpile.
   *
   * The opening stockpile is not income — it is a gift — so the first
   * observation only records a baseline. Nothing is credited for the base a
   * player was handed.
   */
  private accrueIncome(player: PlayerTelemetry, snapshot: EchoSnapshot): void {
    const previous = this.lastPurse.get(player.slot);
    const current = {
      nodules: snapshot.nodules,
      crystal: snapshot.crystal,
      biomass: snapshot.biomass,
    };
    this.lastPurse.set(player.slot, current);
    if (previous === undefined) return;
    player.nodulesEarned += Math.max(0, current.nodules - previous.nodules);
    player.crystalEarned += Math.max(0, current.crystal - previous.crystal);
    player.biomassEarned += Math.max(0, current.biomass - previous.biomass);
  }

  /**
   * What appeared and what went away, both read off the player's own lists.
   *
   * A loss is an id that was in this player's own list and is not any more; a
   * build is an id that was not and now is. Their own units and structures are
   * always sent in full, so both are exact — no inference, no fog. The kind of
   * a loss is remembered from the last tick the hull existed, because by the
   * time it is gone there is nothing left to ask.
   */
  private countBuildsAndLosses(
    tick: number,
    player: PlayerTelemetry,
    snapshot: EchoSnapshot
  ): void {
    // The opening base and its escort are a gift, not a decision, so the first
    // observation of a slot records what is standing and credits none of it —
    // the rule `accrueIncome` applies to the opening stockpile, applied to the
    // things that stockpile could have bought.
    const opening = !this.opened.has(player.slot);
    this.opened.add(player.slot);

    const previousUnits = this.lastUnits.get(player.slot)!;
    const currentUnits = new Map<number, number>();
    for (const unit of snapshot.units) currentUnits.set(unit.id, unit.kind);

    for (const [id, kind] of previousUnits) {
      if (currentUnits.has(id)) continue;
      player.lossesByKind[kind] = (player.lossesByKind[kind] ?? 0) + 1;
      if (this.firstBlood === null) this.firstBlood = tick;
    }
    // A hull is built the tick its id first appears in its owner's own list,
    // which is the tick the yard launches it. Landing is not a birth: a
    // carried hull keeps its id and stays in this list the whole time it is
    // aboard, carrying `aboard` instead of a position (`match.ts`, the own-unit
    // snapshot), so a Freighter emptying its hold adds nothing here.
    if (!opening) {
      for (const [id, kind] of currentUnits) {
        if (previousUnits.has(id)) continue;
        player.unitsBuiltByKind[kind] = (player.unitsBuiltByKind[kind] ?? 0) + 1;
      }
    }
    this.lastUnits.set(player.slot, currentUnits);

    const previousStructures = this.lastStructures.get(player.slot)!;
    const currentStructures = new Map<number, number>();
    for (const structure of snapshot.structures) {
      currentStructures.set(structure.id, structure.kind);
    }
    for (const [id] of previousStructures) {
      if (currentStructures.has(id)) continue;
      player.structuresLost++;
      if (this.firstBlood === null) this.firstBlood = tick;
    }
    this.lastStructures.set(player.slot, currentStructures);

    // A structure is counted on the *rise* rather than on the placement, which
    // is the one place these two counts differ. A hull exists the moment it
    // exists; a site is a hole in the ground for up to two minutes, and a
    // commander that laid one it never got to use did not reach that rung.
    // `buildProgress` crossing 1 is that moment.
    const wasComplete = this.lastComplete.get(player.slot);
    const nowComplete = new Set<number>();
    for (const structure of snapshot.structures) {
      if (structure.buildProgress < 1) continue;
      nowComplete.add(structure.id);
      if (opening || wasComplete?.has(structure.id) === true) continue;
      player.structuresBuiltByKind[structure.kind] =
        (player.structuresBuiltByKind[structure.kind] ?? 0) + 1;
    }
    this.lastComplete.set(player.slot, nowComplete);
  }

  finish(finalTick: number, winnerSlot: number | null, timedOut: boolean): MatchTelemetryResult {
    return {
      seed: this.seed,
      mapId: this.mapId,
      winnerSlot,
      timedOut,
      finalTick,
      lengthS: finalTick / SIM.TICK_HZ,
      firstContactTick: this.firstContact,
      firstEnemyContactTick: this.firstEnemyContact,
      firstBloodTick: this.firstBlood,
      driftHealthFinal:
        this.drift.length === 0 ? 100 : this.drift.reduce((a, b) => a + b, 0) / this.drift.length,
      players: [...this.players.values()].sort((a, b) => a.slot - b.slot),
    };
  }
}
