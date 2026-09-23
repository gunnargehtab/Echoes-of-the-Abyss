/**
 * The balance harness.
 *
 * A harness whose numbers are wrong is worse than no harness, because its
 * output looks like evidence. These tests check the two things that would make
 * it lie: that a run is reproducible, and that the derived figures — income,
 * losses, exposure, the guard-rail verdicts — say what they claim to say.
 *
 * They are deliberately short matches. The point is the arithmetic, not the
 * outcome; a full thirty-minute batch is something you run on purpose, not
 * something a test suite pays for on every push.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { hasComponent } from 'bitecs';

import {
  AiDifficulty,
  CRYSTAL,
  ECONOMY,
  Faction,
  HADRON,
  HARVEST_THROTTLE,
  HarvestThrottle,
  ResourceKind,
  SIM,
  StructureKind,
  UnitKind,
} from '@echoes/shared';
import {
  runBatch,
  runMatch,
  rotateSeats,
  seedHasAnyEffect,
  type Seat,
} from '../src/balance/runner.ts';
import { OWN_ORDNANCE } from '../src/ai/commander.ts';
import { summarise, toMarkdown, type GuardRailVerdict } from '../src/balance/report.ts';
import { MatchTelemetry, type MatchTelemetryResult } from '../src/balance/telemetry.ts';
import { Match } from '../src/sim/match.ts';
import { Harvester, Health, ResourceNode } from '../src/sim/components.ts';
import { DEFAULT_MAP_ID, mapById } from '../src/sim/maps/index.ts';

const DUEL: Seat[] = [
  { slot: 0, faction: Faction.Bathyarch, difficulty: AiDifficulty.Veteran },
  { slot: 1, faction: Faction.Pelagia, difficulty: AiDifficulty.Veteran },
];

/** All four navies, for the columns whose claim is a comparison between them. */
const FOUR_FACTION: Seat[] = [
  { slot: 0, faction: Faction.Bathyarch, difficulty: AiDifficulty.Veteran },
  { slot: 1, faction: Faction.Pelagia, difficulty: AiDifficulty.Veteran },
  { slot: 2, faction: Faction.Directorate, difficulty: AiDifficulty.Veteran },
  { slot: 3, faction: Faction.Hadron, difficulty: AiDifficulty.Veteran },
];

describe('the harness is reproducible', () => {
  it('gives the same match twice from the same seed', () => {
    // The property the whole tool rests on. Without it a number that moved
    // between two runs could be the change under test or could be the
    // weather, and there would be no way to tell which.
    const a = runMatch({ seats: DUEL, seed: 777, maxMinutes: 1.5, fauna: false });
    const b = runMatch({ seats: DUEL, seed: 777, maxMinutes: 1.5, fauna: false });

    assert.equal(a.finalTick, b.finalTick);
    assert.equal(a.firstBloodTick, b.firstBloodTick);
    assert.deepEqual(
      a.players.map((p) => p.nodules),
      b.players.map((p) => p.nodules)
    );
  });

  it('gives a different match from a different seed — but only with the Drift', () => {
    // The guard on the test above, and a property of this simulation that a
    // batch run has to know about.
    //
    // `world.rng` is drawn from in exactly one place in the whole sim:
    // placing the Drift. Terrain is authored, hazard timings come from site
    // positions, combat rolls nothing, and the commanders draw no dice. So
    // with fauna off the seed is inert and ten "samples" are one match ten
    // times — which is why the CLI warns rather than quietly reporting a
    // distribution over a constant.
    const quietA = runMatch({ seats: DUEL, seed: 777, maxMinutes: 2, fauna: false });
    const quietB = runMatch({ seats: DUEL, seed: 778, maxMinutes: 2, fauna: false });
    assert.deepEqual(
      quietA.players.map((p) => p.nodules),
      quietB.players.map((p) => p.nodules),
      'without fauna the seed reaches nothing'
    );
    assert.equal(seedHasAnyEffect({ seats: DUEL, seed: 1, fauna: false }), false);

    // Three minutes, not ninety seconds: creatures are placed differently from
    // the first frame, but nothing a player can *measure* diverges until one
    // of them has interacted with somebody. A shorter window compares two
    // matches that have not started differing yet and concludes the seed does
    // nothing — which is exactly the false negative this test exists to catch.
    const livingA = runMatch({ seats: DUEL, seed: 777, maxMinutes: 3, fauna: true });
    const livingB = runMatch({ seats: DUEL, seed: 778, maxMinutes: 3, fauna: true });
    assert.notDeepEqual(livingA.players, livingB.players, 'with fauna the seed moves the match');
    assert.equal(seedHasAnyEffect({ seats: DUEL, seed: 1, fauna: true }), true);
  });

  it('walks the seed across a batch and records which ones it used', () => {
    const results = runBatch({ seats: DUEL, seed: 900, maxMinutes: 1, fauna: false }, 3);
    assert.deepEqual(
      results.map((r) => r.seed),
      [900, 901, 902]
    );
    assert.deepEqual(summarise(results).seeds, [900, 901, 902]);
  });
});

describe('telemetry measures what it says it measures', () => {
  it('measures income as it arrives, not as what is left at the end', () => {
    // Two wrong answers were tried before this one, and both are worth
    // recording because both looked right.
    //
    // Reading the *final* stockpile says a commander who spent everything on
    // an army had no economy — exactly backwards. Reconstructing the spend
    // from what they built is closer, but production deducts when an item is
    // queued while the hull only appears when it finishes, so the two ledgers
    // disagree by whatever is in flight, and a structure is charged at
    // placement while its site takes a minute to rise.
    //
    // Only mining raises a stockpile and only spending lowers it, so gross
    // income is the sum of the rises. Measured, not derived.
    const result = runMatch({ seats: DUEL, seed: 55, maxMinutes: 2, fauna: false });
    const player = result.players[0]!;
    const banked = player.nodules[player.nodules.length - 1]!;

    assert.ok(player.nodulesEarned > 0, 'four minutes of harvesting earned something');
    assert.ok(
      player.nodulesEarned >= banked - ECONOMY.STARTING_NODULES,
      'income has to cover whatever is still in the bank beyond the opening kit'
    );

    const summary = summarise([result]);
    const consortium = summary.factions.find((f) => f.faction === Faction.Bathyarch)!;
    assert.ok(
      Math.abs(consortium.incomePerMinute - player.nodulesEarned / (result.lengthS / 60)) < 1,
      'the report divides the same number by the same minutes'
    );
  });

  it('does not count the base a player was given as income', () => {
    // The opening stockpile is a gift. Counting it would credit every faction
    // with six hundred nodules of phantom income in the first frame, which
    // matters most in exactly the short matches a harness runs a lot of.
    const result = runMatch({ seats: DUEL, seed: 56, maxMinutes: 0.5, fauna: false });
    for (const player of result.players) {
      assert.ok(
        player.nodulesEarned < ECONOMY.STARTING_NODULES / 2,
        `slot ${player.slot} should have earned almost nothing yet, got ${player.nodulesEarned}`
      );
    }
  });

  it('samples a series often enough to have a shape', () => {
    const result = runMatch({ seats: DUEL, seed: 57, maxMinutes: 2, fauna: false });
    const player = result.players[0]!;
    // Two minutes at a ten-second sample is a dozen points.
    assert.ok(player.nodules.length >= 10, `sampled ${player.nodules.length} times`);
    assert.equal(player.peakSig.length, player.nodules.length, 'series stay aligned');
  });

  it('partitions the ordnance want into the reason it was stopped', () => {
    // The invariant the whole column rests on (#698). Five reasons, one
    // increment per observation that reaches the want, so the five sum to
    // `reached` — and a column that does not sum is an instrumentation bug
    // rather than a finding about a navy. Held here because the failure mode
    // is silent: a miscounted branch produces a table that still looks like a
    // table, and the reading taken off it ("82% of the Order's observations
    // are stopped by the escort gate") would be wrong in a way nothing else
    // would catch.
    // **Eight minutes, not two, and the length is the assertion.** The first
    // version of this test ran a two-minute duel, in which `alreadyHas` and
    // `bought` are zero for both seats — so the sum below could not see a
    // miscount on either branch and the `bought` check was the vacuous
    // `0 >= 0`. A holder that never runs two of the five branches does not hold
    // invariant 14, which exists precisely because a miscounted branch still
    // prints a perfectly well-formed table. Measured on this seed: two minutes
    // reaches three branches, five reaches all five thinly (`alreadyHas` 8),
    // eight reaches all five with room (`alreadyHas` 477).
    const result = runMatch({ seats: DUEL, seed: 59, maxMinutes: 8, fauna: false });
    for (const player of result.players) {
      const t = player.ordnanceWant;
      assert.ok(t.reached > 0, `slot ${player.slot} reached the ordnance want at all`);
      assert.equal(
        t.notEscorted + t.alreadyHas + t.noYard + t.cannotAfford + t.bought,
        t.reached,
        `slot ${player.slot}: the five reasons have to add up to the observations`
      );
    }

    // Every branch actually runs, somewhere in the match. Summed over the seats
    // rather than per seat, because which navy reaches which gate is a fact
    // about doctrine and would make this a change detector; that *all five* are
    // reachable is a fact about the instrumentation, which is what is held here.
    //
    // What this does **not** hold, said plainly so the next reader does not
    // assume it does: the counting *order*. `alreadyHas` is counted before the
    // escort, so an observation in which the navy already holds its ordnance
    // hull is a satisfied want whether or not its army has dipped below the
    // massing floor — asking `escorted` first, which is what shipped in #714,
    // files those under `notEscorted` instead. Both orders leave all five
    // branches live on this scenario (they differ by 41 observations, 548/436
    // against 507/477), so the assertion above passes either way. Pinning those
    // numbers would make this a change detector on every commander edit, and a
    // scenario that separates the two orders decisively needs a navy holding
    // its ordnance hull while permanently unescorted, which a two-seat duel
    // does not reliably produce. The order is argued from a baseline-scale
    // measurement on the pull request instead, and from the comment at the
    // branch itself.
    const union = { notEscorted: 0, alreadyHas: 0, noYard: 0, cannotAfford: 0, bought: 0 };
    for (const player of result.players) {
      for (const key of Object.keys(union) as (keyof typeof union)[]) {
        union[key] += player.ordnanceWant[key];
      }
    }
    for (const [reason, count] of Object.entries(union)) {
      assert.ok(count > 0, `no observation ever reached '${reason}' — the branch is untested`);
    }

    // And the counter means what the build column means. `bought` counts the
    // produce order, `unitsBuiltByKind` counts the hull leaving the yard, so
    // the two differ by whatever is still in the queue when the match ends —
    // never the other way about, which is the direction that would say the
    // navy fielded a hull this branch never ordered.
    const summary = summarise([result]);
    for (const faction of summary.factions) {
      const hull = OWN_ORDNANCE[faction.faction];
      const built = (faction.buildsPerMatchByKind[hull] ?? 0) * faction.matches;
      assert.ok(
        faction.ordnanceWant.bought >= built,
        `${hull}: ordered ${faction.ordnanceWant.bought}, finished ${built}`
      );
    }
  });

  it('carries the carrier want from the commander to the report (#839)', () => {
    // The carrier's tally rides the ordnance tally's channel — seat, runner,
    // `finish` — and this holds the channel, not the branches:
    // `aiCarrier.test.ts` drives each of the five reasons on its own.
    const result = runMatch({ seats: DUEL, seed: 60, maxMinutes: 2, fauna: false });
    for (const player of result.players) {
      const t = player.carrierWant;
      assert.ok(t.reached > 0, `slot ${player.slot} reached the carrier want at all`);
      assert.equal(
        t.notEscorted + t.alreadyHas + t.noYard + t.cannotAfford + t.bought,
        t.reached,
        `slot ${player.slot}: the five reasons have to add up to the observations`
      );
    }
    const markdown = toMarkdown(summarise([result]), 'Test run');
    assert.match(markdown, /^## The carrier want — where it was stopped$/m);
    assert.match(markdown, /^\| Hull wanted \| Gantry \| Rootstock \|$/m);

    // A result stored before the column existed has no `carrierWant` at all.
    // It is summarised as an empty tally, and the table is left out rather
    // than printed as a row of dashes that would read as "never wanted".
    const stored = {
      ...result,
      players: result.players.map(({ carrierWant: _, ...player }) => player),
    } as unknown as MatchTelemetryResult;
    const old = toMarkdown(summarise([stored]), 'Test run');
    assert.doesNotMatch(old, /The carrier want/);
    assert.match(old, /The ordnance want/, 'and the table beside it still prints');
  });

  it('accumulates hull-time by depth band rather than sampling it', () => {
    const result = runMatch({ seats: DUEL, seed: 58, maxMinutes: 2, fauna: false });
    const player = result.players[0]!;
    const total = Object.values(player.hullSecondsByBand).reduce((a, b) => a + b, 0);
    // Several hulls, each contributing its own seconds, over two minutes.
    assert.ok(total > result.lengthS, `hull-seconds ${total} over ${result.lengthS} s`);
  });

  it('measures how much of its hauling a navy spent deliberately poor', () => {
    // The lever the income column cannot see. Two policies — never dropping,
    // and dropping for half a match at 46% of the income — can land on similar
    // income if one of them also has fewer haulers, and until this column a
    // committed baseline could not tell them apart (issue #148).
    const result = runMatch({ seats: DUEL, seed: 59, maxMinutes: 2, fauna: false });
    for (const player of result.players) {
      assert.ok(
        player.harvesterSeconds > 0,
        `slot ${player.slot} fielded harvesters, so it should have hauling time`
      );
      assert.ok(
        player.harvesterSecondsQuiet <= player.harvesterSeconds,
        'the quiet part cannot exceed the whole'
      );
    }

    const summary = summarise([result]);
    // The Consortium harvests on Overburden and has no exposure response at
    // all, so its share is the one number here that is knowable in advance.
    const consortium = summary.factions.find((f) => f.faction === Faction.Bathyarch)!;
    assert.equal(
      consortium.throttledDownShare,
      0,
      'a navy whose doctrine never throttles down should never be recorded doing it'
    );
  });

  /**
   * A match with no commander in it, so nothing is ever bought.
   *
   * `nodulesEarned` reads the stockpile as a delta, so a purchase landing in
   * the same observation as a deposit nets against it and the two sides of the
   * ledger part for a reason that is not a defect. Removing the spending is
   * what turns "roughly agree" into an equality a credit leak cannot survive.
   */
  function spendFreeMatch(seconds: number): MatchTelemetryResult {
    const map = mapById(DEFAULT_MAP_ID)!;
    const match = new Match(map, { seed: 706, fauna: false });
    const roster = [
      { slot: 0, faction: Faction.Bathyarch },
      { slot: 1, faction: Faction.Pelagia },
      { slot: 2, faction: Faction.Hadron },
    ];
    for (const seat of roster) match.addPlayer(seat.slot, seat.faction);
    const telemetry = new MatchTelemetry(706, map.id, roster);
    const stepMs = 1000 / SIM.TICK_HZ;
    for (let tick = 0; tick < SIM.TICK_HZ * seconds; tick++) {
      const snapshots = match.update(stepMs);
      if (snapshots === null) continue;
      telemetry.observe(match.tick, snapshots);
    }
    return telemetry.finish(match.tick, null, true);
  }

  /**
   * Seconds of tithe this ledger can see, for a match `spendFreeMatch` ran.
   *
   * The opening observation records a baseline and credits nothing, so the
   * first Echo tick's worth of tithe is outside the figure by construction.
   */
  function tithedSeconds(result: MatchTelemetryResult): number {
    return result.finalTick / SIM.TICK_HZ - 1 / SIM.ECHO_HZ;
  }

  it('balances the nodule ledger exactly when nothing is spent (#706)', () => {
    // The question #706 asks is whether a navy is *paid what it mines*. With
    // the spending removed, that is an equality rather than an estimate.
    const result = spendFreeMatch(180);
    const tithedS = tithedSeconds(result);

    for (const player of result.players) {
      assert.ok(
        player.noduleDeliveries > 0,
        `slot ${player.slot} landed nothing in three minutes, so nothing here is being tested`
      );
      // The one slack in this test, and it is derived rather than chosen: a
      // hold is recorded as the hauler was last seen carrying it, which is up
      // to one observation's mining short of what it landed —
      // MINING_RATE_PER_S over a 1/ECHO_HZ pass, once per delivery — plus the
      // tithe instalment between the last observation and `finish`.
      const slack =
        (player.noduleDeliveries * ECONOMY.MINING_RATE_PER_S) / SIM.ECHO_HZ +
        HADRON.TITHE_PER_S / SIM.ECHO_HZ;
      // SPEC — docs/economy.md §6 gives the Order two nodule terms and not one:
      // a fixed periodic income independent of extraction, and half the field's
      // yield per load. Both, or the control row below reads as a fault of this
      // instrument rather than as the doctrine it is.
      const expected =
        player.faction === Faction.Hadron
          ? player.nodulesDelivered * HADRON.NODULE_YIELD_MULTIPLIER + HADRON.TITHE_PER_S * tithedS
          : player.nodulesDelivered;
      assert.ok(
        Math.abs(player.nodulesEarned - expected) <= slack,
        `${Faction[player.faction]} landed ${player.nodulesDelivered.toFixed(1)} over ` +
          `${player.noduleDeliveries} trips and banked ${player.nodulesEarned.toFixed(1)}, ` +
          `against ${expected.toFixed(1)} — the two sides of the ledger have parted`
      );
      // Ore is aboard for a real fraction of the trip, not the whole of it and
      // not none: a hauler drives out empty and comes home full.
      assert.ok(
        player.harvesterSecondsLaden > 0 && player.harvesterSecondsLaden < player.harvesterSeconds,
        `slot ${player.slot} spent ${player.harvesterSecondsLaden.toFixed(1)} s of ` +
          `${player.harvesterSeconds.toFixed(1)} with ore aboard, which is not a round trip`
      );
    }

    // And the Order's row differs from the other two, which is what says this
    // instrument reads the trip rather than the account a second time.
    const knights = result.players.find((p) => p.faction === Faction.Hadron)!;
    assert.ok(
      knights.nodulesEarned !== knights.nodulesDelivered,
      'an instrument that had ended up reading the bank would report §6 as no difference'
    );
  });

  it('renders the nodule round trip, and says "—" rather than a nonsense (#706)', () => {
    // Every other table in this report has a rendered assertion on it, for the
    // reason the header of this file gives: a harness whose numbers are wrong
    // is worse than none, and a mis-wired column between `summarise` and
    // `toMarkdown` is invisible to every test that reads the telemetry object.
    const long = spendFreeMatch(180);
    const markdown = toMarkdown(summarise([long]), 'round trip');
    assert.match(markdown, /## The nodule round trip — what the depots took in/);
    assert.match(
      markdown,
      /\| Deliveries a match \| 6\.0 \| 6\.0 \| 6\.0 \|/,
      'six round trips apiece, with no commander to interrupt them'
    );
    assert.match(
      markdown,
      /\| Nodules delivered a match \| 300 \| 300 \| 300 \|/,
      'six Standard holds of fifty'
    );
    assert.match(
      markdown,
      /\| Nodules banked a match \| 300 \| 300 \| 330 \|/,
      "and the Order's row is its §6 half-yield plus its tithe, which is the control"
    );
    assert.match(
      markdown,
      /\| Harvester-time laden \| 58% \| 58% \| 58% \|/,
      'ore is aboard for a little over half of a round trip on this map'
    );

    // Ten seconds in, nobody has landed anything, and a mean hold over no
    // deliveries is a division this table must refuse rather than print.
    const short = toMarkdown(summarise([spendFreeMatch(10)]), 'round trip');
    assert.match(short, /\| Mean hold delivered \| — \| — \| — \|/);
    assert.match(short, /\| Lost as a share of what was cut \| — \| — \| — \|/);
  });

  it('keeps the nodule trip inside its own bounds under a commander (#706)', () => {
    // The ledger closes exactly only where nothing is bought, so what a real
    // batch can still hold is the half that spending cannot break: the bank may
    // rise by *less* than the depots took in — a purchase netting against a
    // deposit in the same observation — and never by more.
    const result = runMatch({ seats: FOUR_FACTION, seed: 4000, maxMinutes: 3, fauna: true });
    // The largest hold anybody can land: a full Standard hold at the loudest
    // throttle's load multiplier. A hold is recorded as last seen before it
    // emptied, which can only be less, so this is a ceiling the arithmetic may
    // not cross.
    const largestHold =
      ECONOMY.CARGO_CAPACITY_NODULES * HARVEST_THROTTLE[HarvestThrottle.Overburden].cargoMultiplier;

    for (const player of result.players) {
      assert.ok(
        player.noduleDeliveries > 0 && player.nodulesDelivered > 0,
        `slot ${player.slot} hauled for three minutes and should have landed something`
      );
      const meanHold = player.nodulesDelivered / player.noduleDeliveries;
      assert.ok(
        meanHold > 0 && meanHold <= largestHold,
        `slot ${player.slot} landed a mean hold of ${meanHold.toFixed(1)}, over ${largestHold}`
      );
      assert.ok(
        player.harvesterSecondsLaden <= player.harvesterSeconds,
        'the laden part of hauling cannot exceed the hauling'
      );
      assert.ok(
        player.harvesterSecondsStalled <= player.harvesterSeconds,
        'nor can the stalled part'
      );
      // Only two paths credit nodules — the deposit (`systems/harvest.ts`) and
      // the Order's tithe (`systems/tithe.ts`) — and the Order's is the only
      // one that can put a nodule in a bank that no depot took in.
      if (player.faction === Faction.Hadron) continue;
      const slack = (player.noduleDeliveries * ECONOMY.MINING_RATE_PER_S) / SIM.ECHO_HZ;
      assert.ok(
        player.nodulesEarned <= player.nodulesDelivered + slack,
        `${Faction[player.faction]} banked ${player.nodulesEarned.toFixed(1)} against ` +
          `${player.nodulesDelivered.toFixed(1)} delivered — a bank cannot outrun its depots`
      );
    }
  });

  it('counts a stalled hauler apart from one that is merely quiet (#706)', () => {
    // `harvesterSecondsQuiet` is a throttle a commander chose and
    // `harvesterSecondsStalled` is the server reporting no work left, and the
    // two must never be the same column: a navy whose haulers are stalled is
    // not one being denied by a price. The map mined out is the cheapest way to
    // reach `HarvestIdleReason.MinedOut` without touching a Bastion, which
    // would eliminate the slot instead.
    const map = mapById(DEFAULT_MAP_ID)!;
    const match = new Match(map, { seed: 707, fauna: false });
    const roster = [{ slot: 0, faction: Faction.Bathyarch }];
    match.addPlayer(0, Faction.Bathyarch);
    const telemetry = new MatchTelemetry(707, map.id, roster);
    const stepMs = 1000 / SIM.TICK_HZ;

    let emptied = false;
    let stalledAtEmptying = 0;
    for (let tick = 0; tick < SIM.TICK_HZ * 90; tick++) {
      const snapshots = match.update(stepMs);
      if (snapshots === null) continue;
      telemetry.observe(match.tick, snapshots);
      if (!emptied && match.tick > SIM.TICK_HZ * 30) {
        for (let eid = 0; eid < ResourceNode.remaining.length; eid++) {
          if (!hasComponent(match.world, ResourceNode, eid)) continue;
          ResourceNode.remaining[eid] = 0;
        }
        emptied = true;
        stalledAtEmptying = telemetry.finish(match.tick, null, true).players[0]!
          .harvesterSecondsStalled;
      }
    }

    assert.ok(emptied, 'the field was never emptied, so nothing here was stalled');
    const player = telemetry.finish(match.tick, null, true).players[0]!;
    assert.equal(stalledAtEmptying, 0, 'nothing should have been stalled while the field stood');
    assert.ok(
      player.harvesterSecondsStalled > 0,
      'a hauler with nowhere left to cut is stalled, and the column has to say so'
    );
    assert.equal(
      player.harvesterSecondsQuiet,
      0,
      'and a stall is not a throttle: nobody chose to be poor here'
    );
    assert.match(
      toMarkdown(summarise([telemetry.finish(match.tick, null, true)]), 'mined out'),
      /\| Harvester-time stalled \| [1-9][0-9]*% \|/,
      'and the column reaches the page rather than stopping at the telemetry object'
    );
  });

  it('counts no nodules for a hold of crystal (#706)', () => {
    // The nodule trip is one of two round trips a harvester runs, and crystal is
    // the other — a different clock, a different depth, a different account
    // (docs/economy.md §7). A hold of it belongs in none of these columns, and
    // the guard that keeps it out is a kind check rather than an amount check,
    // because `cargoKind` is whatever the hull last cut and says nothing while
    // the hold is empty.
    const map = mapById(DEFAULT_MAP_ID)!;
    const match = new Match(map, { seed: 708, fauna: false });
    const roster = [{ slot: 0, faction: Faction.Bathyarch }];
    match.addPlayer(0, Faction.Bathyarch);
    const telemetry = new MatchTelemetry(708, map.id, roster);
    const stepMs = 1000 / SIM.TICK_HZ;

    // Ten seconds in, every hauler is still driving out to the field with an
    // empty hold, so a crystal hold posed here is the only cargo in the match.
    let posed = false;
    for (let tick = 0; tick < SIM.TICK_HZ * 14; tick++) {
      const snapshots = match.update(stepMs);
      if (snapshots === null) continue;
      if (!posed && match.tick > SIM.TICK_HZ * 10) {
        for (let eid = 0; eid < Harvester.cargo.length; eid++) {
          if (!hasComponent(match.world, Harvester, eid)) continue;
          assert.equal(Harvester.cargo[eid], 0, 'the pose has to precede any real cut');
          Harvester.cargoKind[eid] = ResourceKind.ResonanceCrystal;
          Harvester.cargo[eid] = CRYSTAL.CARGO_CAPACITY;
          posed = true;
        }
      }
      telemetry.observe(match.tick, snapshots);
    }

    assert.ok(posed, 'no harvester was posed, so nothing here was measured');
    const player = telemetry.finish(match.tick, null, true).players[0]!;
    assert.ok(player.harvesterSeconds > 0, 'the haulers were in the water and being counted');
    assert.equal(
      player.harvesterSecondsLaden,
      0,
      'a hold of crystal is not a nodule trip, however full it is'
    );
    assert.equal(player.nodulesDelivered, 0, 'and it lands no nodules');
  });

  it('counts a hold that died with its hauler as lost, never as delivered (#706)', () => {
    // The column no income table can show: ore that was cut, was aboard, and
    // never reached a depot. It is the difference between a navy that is poor
    // because everything costs too much and one that is poor because its
    // haulers keep dying full.
    const map = mapById(DEFAULT_MAP_ID)!;
    // No fauna, for the reason `MatchOptions.fauna` gives: a world full of
    // animals is noise when the thing under test is a harvester round trip —
    // and here it would also be a second thing that could kill the hauler.
    const match = new Match(map, { seed: 706, fauna: false });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    const telemetry = new MatchTelemetry(706, map.id, [
      { slot: 0, faction: Faction.Bathyarch },
      { slot: 1, faction: Faction.Pelagia },
    ]);
    const stepMs = 1000 / SIM.TICK_HZ;

    let victim: number | null = null;
    let lastHold = 0;
    let died = false;
    for (let tick = 0; tick < SIM.TICK_HZ * 40 && !died; tick++) {
      const snapshots = match.update(stepMs);
      if (snapshots === null) continue;
      const own = snapshots.get(0)!;
      if (victim !== null) {
        const still = own.units.find((u) => u.id === victim);
        if (still === undefined) died = true;
        else lastHold = still.cargo ?? 0;
      }
      telemetry.observe(match.tick, snapshots);
      if (victim === null) {
        // Any hull with ore aboard will do; the first one to start cutting is
        // the cheapest to wait for.
        const laden = own.units.find((u) => u.kind === UnitKind.Harvester && (u.cargo ?? 0) > 0);
        if (laden !== undefined) {
          victim = laden.id;
          lastHold = laden.cargo!;
          // Killed after the observation that recorded the hold, so what the
          // instrument last saw aboard is exactly what it must report lost.
          Health.hp[laden.id] = 0;
        }
      }
    }

    assert.ok(died, 'the hauler under test never actually died');
    const result = telemetry.finish(match.tick, null, true);
    const player = result.players.find((p) => p.slot === 0)!;
    assert.ok(lastHold > 0, 'the hauler was meant to die with ore aboard');
    assert.equal(
      player.nodulesLostInTransit,
      lastHold,
      'a hold that went down with its hauler is the whole of what was lost'
    );
    assert.equal(
      player.noduleDeliveries,
      0,
      'and none of it may be recorded as having reached a depot'
    );

    // Through the report as well as off the telemetry: the seam between
    // `summarise` and `toMarkdown` is where a column silently prints zero
    // forever, and lost-in-transit is the one the register calls the only way
    // a navy can mine well and still be poor.
    const markdown = toMarkdown(summarise([result]), 'a hold that went down');
    assert.match(
      markdown,
      /\| Nodules lost in transit a match \| [1-9][0-9]*(\.[0-9]+)? \| 0 \|/,
      'the slot that lost a hauler, and the slot that did not'
    );
    assert.match(
      markdown,
      /\| Lost as a share of what was cut \| 100% \| — \|/,
      'everything this slot cut was lost; the other cut nothing, which is not 0% but no answer'
    );
  });

  it('reports first contact and first classified enemy as different things', () => {
    // With the Drift populated, first contact is tick 0 — a creature is in
    // earshot of a spawn from the first frame. Keying anything on that number
    // would answer a question nobody asked.
    const withFauna = runMatch({ seats: DUEL, seed: 59, maxMinutes: 1.5, fauna: true });
    // The first snapshot lands on the first Echo tick, not tick 0.
    assert.ok(
      withFauna.firstContactTick !== null && withFauna.firstContactTick <= SIM.TICK_HZ,
      `the map should be talking within a second, got ${withFauna.firstContactTick}`
    );
    if (withFauna.firstEnemyContactTick !== null) {
      assert.ok(
        withFauna.firstEnemyContactTick > 0,
        'finding another commander takes longer than finding a fish'
      );
    }
  });
});

describe('a draw says how close it came (#223)', () => {
  /**
   * Three seats, one of them scuttled a few seconds in. Three rather than two
   * because resigning in a duel ends the match, and the thing under test is
   * what telemetry sees *while the match runs on around a dead seat*.
   */
  function matchWithOneDeadSeat(): {
    result: MatchTelemetryResult;
    resignedTick: number;
  } {
    const map = mapById(DEFAULT_MAP_ID)!;
    const match = new Match(map, { seed: 4242, fauna: false });
    const roster = [
      { slot: 0, faction: Faction.Bathyarch },
      { slot: 1, faction: Faction.Pelagia },
      { slot: 2, faction: Faction.Directorate },
    ];
    for (const { slot, faction } of roster) match.addPlayer(slot, faction);

    const telemetry = new MatchTelemetry(4242, map.id, roster);
    const stepMs = 1000 / SIM.TICK_HZ;
    const resignAt = SIM.TICK_HZ * 5;
    let resignedTick = 0;

    for (let tick = 0; tick < SIM.TICK_HZ * 20; tick++) {
      if (tick === resignAt) {
        match.resign(1);
        resignedTick = match.tick;
      }
      const snapshots = match.update(stepMs);
      if (snapshots === null) continue;
      if (resignedTick > 0) {
        // The premise. If this ever stops holding, the missing-key branch in
        // `observe` starts carrying the detection and this test is measuring
        // the wrong one of the two.
        assert.ok(
          snapshots.has(1),
          'the simulation keeps sending an eliminated slot an empty snapshot'
        );
      }
      telemetry.observe(match.tick, snapshots);
    }

    return { result: telemetry.finish(match.tick, null, true), resignedTick };
  }

  it('records the tick a force went to nothing', () => {
    // The bug this pins: elimination was read off a slot disappearing from
    // the snapshot map, and a slot never disappears — `Match.resolveEcho`
    // walks a roster elimination does not shorten. So `eliminatedTick` was
    // null in every match ever run, including the ones that were won.
    const { result, resignedTick } = matchWithOneDeadSeat();
    const dead = result.players.find((p) => p.slot === 1)!;

    assert.ok(dead.eliminatedTick !== null, 'the scuttled seat is recorded as eliminated');
    assert.ok(dead.eliminatedTick >= resignedTick, 'and not before it actually happened');
    // Detected on the first Echo tick after the scuttle, not eventually.
    assert.ok(
      dead.eliminatedTick - resignedTick <= SIM.TICK_HZ / SIM.ECHO_HZ,
      `within one Echo tick, got ${dead.eliminatedTick - resignedTick} ticks`
    );
    for (const slot of [0, 2]) {
      assert.equal(
        result.players.find((p) => p.slot === slot)!.eliminatedTick,
        null,
        `slot ${slot} was still standing at the cap`
      );
    }
  });

  it('reports eliminations against the number a win needs', () => {
    // A draw rate cannot tell "nobody ever got hurt" from "everyone but one
    // went down and the clock beat the last kill". This row is what does.
    const { result } = matchWithOneDeadSeat();
    const summary = summarise([result]);

    assert.equal(summary.draws, 1);
    assert.equal(summary.eliminations.median, 1);
    assert.equal(summary.eliminationsToWin, 2, 'three seats, so a win needs two kills');
    assert.match(toMarkdown(summary, 'eliminations'), /Commanders eliminated, of 2 needed \| 1/);
  });

  it('breaks the losses out by hull, and the rows add up to the column', () => {
    // A wave of the roster is judged on *which* hulls died (docs/roster-plan.md
    // §4, wave 0), and the summed column cannot say. A resigned seat loses its
    // whole opening kit, which is the one loss list knowable in advance.
    const { result } = matchWithOneDeadSeat();
    const summary = summarise([result]);
    const pelagia = summary.factions.find((f) => f.faction === Faction.Pelagia)!;
    const byKind = pelagia.lossesPerMatchByKind;

    // The Commune opens in its own line hull since #509, so the kit it loses
    // when it resigns is two Reeds rather than two Corvettes.
    assert.equal(byKind[UnitKind.Reed], 2, 'the two Reeds of the opening escort');
    assert.equal(byKind[UnitKind.LightScout], 1);
    assert.equal(byKind[UnitKind.Harvester], 1);
    const rows = Object.values(byKind).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(rows - pelagia.lossesPerMatch) < 1e-9, 'the rows sum to the column');
    for (const f of summary.factions) {
      if (f.faction === Faction.Pelagia) continue;
      assert.deepEqual(f.lossesPerMatchByKind, {}, 'a navy that lost nothing has no rows');
    }

    const markdown = toMarkdown(summary, 'losses');
    assert.match(markdown, /## Hulls per match — built \/ lost/);
    assert.match(
      markdown,
      /\| Reed \| 0\.0 \/ 0\.0 \| 0\.0 \/ 2\.0 \| 0\.0 \/ 0\.0 \|/,
      'Consortium, Commune, Directorate — nobody built one, the Commune lost two'
    );
  });

  it('counts a hull on its launch and a site on its rise (#518)', () => {
    // The measurement the report was missing, and the reason #518 read the
    // wrong finding out of the right table: a loss column cannot tell a hull
    // that was never built from one that was built and lived, so three of wave
    // 3's four hulls showed 0.0 and nothing could say which zero it was.
    //
    // A hull and a site, because the two are counted differently on purpose.
    // A hull exists the moment it exists; a site is a hole in the ground for
    // three quarters of a minute, and a commander that laid one it never got
    // to use did not reach that rung.
    const map = mapById(DEFAULT_MAP_ID)!;
    const match = new Match(map, { seed: 909, fauna: false });
    const roster = [{ slot: 0, faction: Faction.Bathyarch }];
    match.addPlayer(0, Faction.Bathyarch);

    const telemetry = new MatchTelemetry(909, map.id, roster);
    const stepMs = 1000 / SIM.TICK_HZ;
    const home = map.spawns[0]!;
    let ordered = false;

    // Long enough for a 20 s hull and a 45 s site, with room for the Echo tick
    // the rise is noticed on.
    for (let tick = 0; tick < SIM.TICK_HZ * 70; tick++) {
      const snapshots = match.update(stepMs);
      if (snapshots === null) continue;
      const own = snapshots.get(0)!;
      if (!ordered) {
        const bastion = own.structures.find((st) => st.kind === StructureKind.Bastion)!;
        assert.ok(match.produce(0, bastion.id, UnitKind.Harvester), 'the opening bank buys a hull');
        assert.ok(match.build(0, StructureKind.Refinery, home.x, home.y + 400), 'and a site');
        ordered = true;
      }
      telemetry.observe(match.tick, snapshots);
    }

    const summary = summarise([telemetry.finish(match.tick, null, true)]);
    const consortium = summary.factions.find((f) => f.faction === Faction.Bathyarch)!;

    assert.deepEqual(
      consortium.buildsPerMatchByKind,
      { [UnitKind.Harvester]: 1 },
      'the hull it launched, and nothing of the opening escort'
    );
    assert.deepEqual(
      consortium.structuresPerMatchByKind,
      { [StructureKind.Refinery]: 1 },
      'the site that rose, and neither of the two it was given'
    );

    const markdown = toMarkdown(summary, 'builds');
    assert.match(markdown, /\| Harvester \| 1\.0 \/ 0\.0 \|/, 'built one, lost none');
    assert.match(markdown, /## Structures commissioned per match/);
    assert.match(markdown, /\| Nodule Refinery \| 1\.0 \|/);
  });

  it('records the bank as a high-water mark, not as what was left (#518)', () => {
    // The other half of the same missing measurement. "Built 0.0" and
    // "commissioned 0.6" together still cannot say whether a hull behind the
    // rung was *ever affordable*, and that is a maximum rather than a rate: a
    // navy earning the most nodules a minute in the game can hold the price of
    // its own heavy at no instant of the match, and every rate column says it
    // is doing fine.
    //
    // So this is asserted as a maximum over observations rather than against a
    // sampled series: a bank rises to a price and is spent inside one
    // ten-second sample, which is exactly the instant worth catching.
    const map = mapById(DEFAULT_MAP_ID)!;
    const match = new Match(map, { seed: 909, fauna: false });
    const roster = [{ slot: 0, faction: Faction.Bathyarch }];
    match.addPlayer(0, Faction.Bathyarch);

    const telemetry = new MatchTelemetry(909, map.id, roster);
    const stepMs = 1000 / SIM.TICK_HZ;
    let highest = 0;
    let spent = false;

    for (let tick = 0; tick < SIM.TICK_HZ * 40; tick++) {
      const snapshots = match.update(stepMs);
      if (snapshots === null) continue;
      const own = snapshots.get(0)!;
      highest = Math.max(highest, own.nodules);
      if (!spent) {
        const bastion = own.structures.find((st) => st.kind === StructureKind.Bastion)!;
        spent = match.produce(0, bastion.id, UnitKind.Harvester);
      }
      telemetry.observe(match.tick, snapshots);
    }

    assert.ok(spent, 'the premise: the opening bank was spent, so the peak is behind us');
    const summary = summarise([telemetry.finish(match.tick, null, true)]);
    const consortium = summary.factions.find((f) => f.faction === Faction.Bathyarch)!;
    assert.equal(
      Math.round(consortium.peakBank),
      Math.round(highest),
      'the peak is the most the navy ever held, not what it was holding at the end'
    );

    // No Slipway rose in forty seconds, so the rung rows have no matches to be
    // read over — reported as nothing rather than as a confident zero, which is
    // the same rule the guard-rail verdicts follow.
    assert.equal(consortium.rungMatches, 0, 'and no yard stood in forty seconds');
    const markdown = toMarkdown(summary, 'bank');
    assert.match(markdown, /## The bank against the rung/);
    assert.match(markdown, /\| Peak with the yard up, median \| — \|/);
  });

  it('counts nothing of the opening as built — a base is a gift, not a decision', () => {
    // The rule `accrueIncome` applies to the opening stockpile, applied to what
    // that stockpile could have bought. Twenty seconds is not long enough for
    // any of these three commanders to finish a hull or raise a site, so every
    // number here should still be zero — and before this counted from the first
    // observation it read a Bastion, a Foundry, a Light Scout, two Corvettes
    // and a Harvester apiece, which would have made every wave's gate read as
    // met on the opening kit alone.
    const { result } = matchWithOneDeadSeat();
    const summary = summarise([result]);

    for (const f of summary.factions) {
      assert.deepEqual(f.buildsPerMatchByKind, {}, 'no hull was finished in twenty seconds');
      assert.deepEqual(f.structuresPerMatchByKind, {}, 'and no site rose');
    }
    assert.ok(
      !toMarkdown(summary, 'openings').includes('## Structures commissioned per match'),
      'a batch in which nobody built anything prints no table for it'
    );
  });

  it('averages a dead commander over the match it was alive for', () => {
    // The consequence, and the reason this is a measurement bug rather than a
    // cosmetic one: `lifetimeMinutes` was written to divide by the time a
    // player was in the match, and has been dividing by the whole match
    // instead because its input never fired.
    const { result } = matchWithOneDeadSeat();
    const dead = result.players.find((p) => p.slot === 1)!;
    const lived = dead.eliminatedTick! / SIM.TICK_HZ / 60;
    const summary = summarise([result]);
    const pelagia = summary.factions.find((f) => f.faction === Faction.Pelagia)!;

    assert.ok(
      Math.abs(pelagia.incomePerMinute - dead.nodulesEarned / lived) < 1,
      'the report divides by the minutes the commander was alive'
    );
    assert.ok(
      lived < result.lengthS / 60,
      'which is less than the match, or this test proves nothing'
    );
  });
});

describe('the guard-rail table answers the docs', () => {
  it('names every rail, including the ones this matchup cannot test', () => {
    // A missing row reads as "fine". An explicit "no data" reads as "you did
    // not ask", which is what actually happened.
    const results = runBatch({ seats: DUEL, seed: 60, maxMinutes: 2, fauna: false }, 2);
    const rails = summarise(results).guardRails;

    const risks = rails.map((r) => r.risk);
    assert.ok(risks.includes('One navy is simply stronger'));
    assert.ok(risks.includes('Quiet economies simply win'));
    assert.ok(risks.includes('Loud economies are unplayable'));
    assert.ok(risks.includes('Directorate Biomass snowballs'));
    assert.ok(risks.includes('Knights starve out of every long game'));
    assert.ok(risks.includes('Fauna decide matches'));

    const directorate = rails.find((r) => r.risk === 'Directorate Biomass snowballs')!;
    assert.equal(directorate.verdict, 'no data', 'no Directorate seat in a two-faction duel');
  });

  it("rates income over a player's lifetime, not over the match", () => {
    // A commander eliminated at five minutes of a twenty-five minute game used
    // to have their income averaged over the twenty minutes they spent dead,
    // reporting an economy a fifth of its real size. It did that worst to
    // exactly the factions that lose early, which is the population a balance
    // report is most often asked about.
    const result = runMatch({ seats: DUEL, seed: 63, maxMinutes: 2, fauna: false });
    // Fake an elimination a quarter of the way in, leaving the income intact.
    const shortened: typeof result = {
      ...result,
      players: result.players.map((p, i) =>
        i === 0 ? { ...p, eliminatedTick: Math.floor(result.finalTick / 4) } : p
      ),
    };

    const full = summarise([result]).factions.find((f) => f.faction === Faction.Bathyarch)!;
    const cut = summarise([shortened]).factions.find((f) => f.faction === Faction.Bathyarch)!;
    assert.ok(
      cut.incomePerMinute > full.incomePerMinute * 3,
      `a quarter of the time should read as roughly four times the rate: ${cut.incomePerMinute} vs ${full.incomePerMinute}`
    );
    // The survivor is untouched — this is per player, not per match.
    const communeFull = summarise([result]).factions.find((f) => f.faction === Faction.Pelagia)!;
    const communeCut = summarise([shortened]).factions.find((f) => f.faction === Faction.Pelagia)!;
    assert.equal(communeCut.incomePerMinute, communeFull.incomePerMinute);
  });

  it('produces Markdown a pull request can diff', () => {
    const results = runBatch({ seats: DUEL, seed: 61, maxMinutes: 1, fauna: false }, 2);
    const markdown = toMarkdown(
      summarise(results),
      'Test run',
      'node tools/balance/run.mjs --matches 2'
    );

    assert.match(markdown, /^# Test run$/m);
    // The command that produced it, so a committed baseline can be
    // regenerated rather than merely admired.
    assert.match(markdown, /node tools\/balance\/run\.mjs/);
    assert.match(markdown, /## Guard-rails/);
    assert.match(markdown, /\| Consortium \|/);
    // Tables, not prose: a diff of a paragraph is unreadable, a diff of a row
    // shows exactly which number moved.
    assert.ok(markdown.split('\n').filter((l) => l.startsWith('|')).length > 10);
  });
});

describe('tunable overrides', () => {
  it('changes the match when a constant changes', () => {
    // The worked-example mechanism, as a test. If patching a TUNABLE did not
    // reach the simulation, a before/after would show no difference and the
    // conclusion would be "this constant does not matter" — the most
    // expensive way for this tool to be wrong.
    //
    // The lever is a cargo multiplier of *zero*, deliberately. An earlier
    // version tripled the Standard multiplier and got byte-identical income,
    // which looked like a broken override and was not: back then the
    // multiplier set how fast a hold filled, cargo was capped at fifty a trip,
    // and a round trip is dominated by travel — so tripling it saved about
    // three seconds out of forty and never bought a whole extra delivery. That
    // reading was the bug behind "is Overburden a trap?", and the multiplier
    // now scales the load itself, so a fractional patch would move income
    // here. Zero stays the assertion because it is the unambiguous one.
    // Every working throttle, not just Standard: a commander drops to Trickle
    // the moment somebody holds a bearing on it, so zeroing one setting only
    // moves the mining to another and the income keeps arriving.
    const working = [HarvestThrottle.Trickle, HarvestThrottle.Standard, HarvestThrottle.Overburden];
    const before = working.map((t) => HARVEST_THROTTLE[t].cargoMultiplier);
    const baseline = runMatch({ seats: DUEL, seed: 62, maxMinutes: 3, fauna: false });
    try {
      for (const throttle of working) HARVEST_THROTTLE[throttle].cargoMultiplier = 0;
      const variant = runMatch({ seats: DUEL, seed: 62, maxMinutes: 3, fauna: false });
      const earned = (r: typeof baseline): number => r.players[1]!.nodulesEarned;

      assert.ok(earned(baseline) > 0, 'the baseline economy works');
      assert.equal(earned(variant), 0, 'a zero cargo multiplier must reach the simulation');
    } finally {
      working.forEach((t, i) => (HARVEST_THROTTLE[t].cargoMultiplier = before[i]!));
    }
  });
});

describe('a verdict never outruns its sample (#200)', () => {
  /**
   * A batch in which nothing was decided.
   *
   * Short enough that no side can win inside the cap, which is the same shape
   * as the real failure this guards: a four-seat matchup on a two-spawn map,
   * where two commanders never spawn and every match times out as a draw.
   */
  function undecided(): ReturnType<typeof summarise> {
    const results = runBatch({ seats: DUEL, seed: 4242, maxMinutes: 0.3, fauna: false }, 1);
    assert.equal(
      results.filter((r) => r.winnerSlot !== null).length,
      0,
      'the fixture is only meaningful if nothing was decided'
    );
    return summarise(results);
  }

  it('reports no data rather than a verdict when no match was decided', () => {
    // The bug: a win rate is a ratio over decided matches, so with none decided
    // it is 0/0 — which prints as 0% and is indistinguishable from a faction
    // that played and lost every game. The report announced "loud economies are
    // unplayable — breached" off exactly that, with "(n=0)" printed beside it.
    for (const rail of undecided().guardRails) {
      assert.equal(
        rail.verdict,
        'no data',
        `"${rail.risk}" returned "${rail.verdict}" from a batch that decided nothing`
      );
    }
  });

  it('still prints the sample size, so the reader can see why', () => {
    const summary = undecided();
    const loud = summary.guardRails.find((r) => r.risk === 'Loud economies are unplayable');
    assert.ok(loud !== undefined, 'the Consortium is seated, so the rail must be present');
    assert.match(loud.reading, /n=0/, 'the reading has to say how little it is standing on');
  });

  it('renders every one of them as no data in the markdown', () => {
    // The table is what anyone actually reads, and "**breached**" in bold is
    // the most authoritative thing this tool emits.
    const markdown = toMarkdown(undecided(), 'Undecided', 'test');
    assert.doesNotMatch(markdown, /\*\*breached\*\*/, 'a breach was asserted from nothing');
    assert.doesNotMatch(markdown, /\*\*held\*\*/, 'and "held" is the same claim in the mirror');
  });
});

/**
 * One real match, simulated once and shared by every fixture below.
 *
 * The batches those fixtures build vary exactly one field — who won — so every
 * other number in them has to come from a match that actually happened; and
 * simulating a fresh one per assertion would pay a quarter of a minute of
 * wall clock each time to produce the same match again. Fauna is on and the
 * cap is long enough for something to die, because a rail that reads first
 * blood needs a first blood to read.
 */
let sample: ReturnType<typeof runMatch> | undefined;
function sampleMatch(): ReturnType<typeof runMatch> {
  sample ??= runMatch({ seats: DUEL, seed: 4244, maxMinutes: 1.5, fauna: true });
  return sample;
}

describe('a win-rate verdict needs a sample, not merely a non-zero one (#199)', () => {
  /**
   * A batch of `matches` matches, `decided` of them won by the Commune.
   *
   * Constructed rather than simulated, because what is under test is the
   * report's arithmetic and not the simulation's outcome — and because the
   * failure being guarded against is precisely a verdict drawn from a handful
   * of decided matches, which is expensive to reach honestly and trivial to
   * build.
   */
  function batch(matches: number, decided: number): ReturnType<typeof summarise> {
    const one = sampleMatch();
    return summarise(
      Array.from({ length: matches }, (_, i) => ({
        ...one,
        seed: 4244 + i,
        winnerSlot: i < decided ? 1 : null,
      }))
    );
  }

  const winRateRails = ['Quiet economies simply win', 'Loud economies are unplayable'];

  it('says no data below the floor, however many matches were run', () => {
    // The shape of #199: a 30-match batch of which 29 timed out, reported as a
    // 100% and three 0% win rates. Thirty matches is a respectable sample of
    // something; it is one decided match of the thing a win rate measures.
    const summary = batch(30, 1);
    for (const risk of winRateRails) {
      const rail = summary.guardRails.find((r) => r.risk === risk)!;
      assert.equal(rail.verdict, 'no data', `"${risk}" ruled on one decided match`);
    }
  });

  it('says why, in the units that ran out', () => {
    // "No data" from a batch of thirty matches is baffling unless the reading
    // names what was actually short, which was decided matches and not matches.
    const rail = batch(30, 1).guardRails.find((r) => r.risk === 'Loud economies are unplayable')!;
    assert.match(rail.reading, /n=1 decided, needs 10/);
  });

  it('lets a rail speak once the sample is there', () => {
    // The floor has to be a floor and not a gag. One more decided match than
    // the case below, and the same rail is entitled to an answer.
    const short = batch(30, 9).guardRails.find((r) => r.risk === 'Quiet economies simply win')!;
    const enough = batch(30, 10).guardRails.find((r) => r.risk === 'Quiet economies simply win')!;
    assert.equal(short.verdict, 'no data');
    assert.notEqual(enough.verdict, 'no data');
    assert.match(enough.reading, /n=10 decided\)/, 'and it stops asking for more');
  });

  it('leaves the rails that never read a win rate alone', () => {
    // The floor is about one kind of number. A rail keyed on first blood has
    // its own sample and its own emptiness guard, and a batch that decided
    // nothing is still a perfectly good sample of when things start dying.
    const fauna = batch(30, 1).guardRails.find((r) => r.risk === 'Fauna decide matches')!;
    assert.equal(fauna.verdict, 'held', 'first blood does not care who won');
  });
});

/**
 * Four navies in one match, simulated once and shared, for the rail that names
 * no faction.
 *
 * The spread rail's bar is a multiple of `1 / seats`, so in the two-seat duel
 * every other fixture in this file uses it sits at 100% and the rail correctly
 * declines to rule. Reading it at all needs four chairs, and one short match
 * supplies the players every fabricated batch below is built from.
 */
const FOUR_SEATS: Seat[] = [
  { slot: 0, faction: Faction.Bathyarch, difficulty: AiDifficulty.Veteran },
  { slot: 1, faction: Faction.Pelagia, difficulty: AiDifficulty.Veteran },
  { slot: 2, faction: Faction.Directorate, difficulty: AiDifficulty.Veteran },
  { slot: 3, faction: Faction.Hadron, difficulty: AiDifficulty.Veteran },
];

let fourSeat: ReturnType<typeof runMatch> | undefined;
function fourSeatMatch(): ReturnType<typeof runMatch> {
  fourSeat ??= runMatch({ seats: FOUR_SEATS, seed: 4300, maxMinutes: 1, fauna: false });
  return fourSeat;
}

describe('a rail that fails when one navy runs away with the batch (#592)', () => {
  const RISK = 'One navy is simply stronger';

  /**
   * `matches` matches over four seats, `wins` of them taken by the Directorate
   * and the rest dealt round-robin to the other three.
   *
   * Fabricated for the reason the #199 batches are: what is under test is the
   * rail's arithmetic, and reaching a 95% honestly would mean simulating the
   * imbalance that opened the issue.
   */
  function spread(matches: number, wins: number): GuardRailVerdict {
    const one = fourSeatMatch();
    const rivals = [0, 1, 3];
    return summarise(
      Array.from({ length: matches }, (_, i) => ({
        ...one,
        seed: 4300 + i,
        winnerSlot: i < wins ? 2 : rivals[(i - wins) % rivals.length]!,
      }))
    ).guardRails.find((r) => r.risk === RISK)!;
  }

  it('breaches on the reading that went fourteen baselines unremarked', () => {
    // 19 of 20 decided, which is what the 2026-09-09 four-faction baseline
    // read while every rail in the table said "held".
    const rail = spread(20, 19);
    assert.equal(rail.verdict, 'breached');
    assert.match(rail.reading, /Directorate 95%/);
    assert.match(rail.reading, /parity 25%/);
    assert.match(rail.reading, /bar 50%/);
  });

  it('holds when the seats share the batch out', () => {
    assert.equal(spread(20, 5).verdict, 'held', 'five wins each is parity');
  });

  it('puts the line at exactly twice parity, and not a match earlier', () => {
    // The bar is a bar, not a suggestion: a seat sitting on it has not
    // breached, and the next win it takes does.
    assert.equal(spread(20, 10).verdict, 'held', '50% is the bar, not past it');
    assert.equal(spread(20, 11).verdict, 'breached');
  });

  it('needs the ten decided matches every win-rate rail needs', () => {
    // A shutout of nine is a plausible run of luck, and this rail buys its
    // sample floor from the same helper the other two do rather than
    // inventing a second one.
    const rail = spread(9, 9);
    assert.equal(rail.verdict, 'no data', 'a 100% over nine decided matches rules on nothing');
    assert.match(rail.reading, /n=9 decided, needs 10/);
  });

  it('declines a bar no win rate could clear', () => {
    // Twice parity in a duel is 100%. A rail that returns "held" from a test
    // that cannot fail is the defect the Drift Health bar was rebuilt to
    // remove, so a two-seat matchup gets "you did not ask this question".
    const one = sampleMatch();
    const duel = summarise(
      Array.from({ length: 20 }, (_, i) => ({ ...one, seed: 4244 + i, winnerSlot: 1 }))
    ).guardRails.find((r) => r.risk === RISK)!;

    assert.equal(duel.verdict, 'no data');
    assert.match(duel.reading, /2 seats/);
  });
});

describe('the per-faction table carries its own denominator (#199)', () => {
  it('counts decided matches per faction', () => {
    const one = sampleMatch();
    const summary = summarise([
      { ...one, winnerSlot: 1 },
      { ...one, seed: 4246, winnerSlot: null },
      { ...one, seed: 4247, winnerSlot: null },
    ]);
    const commune = summary.factions.find((f) => f.faction === Faction.Pelagia)!;
    assert.equal(commune.matches, 3);
    assert.equal(commune.decided, 1);
    assert.equal(commune.winRate, 1, 'one win out of one decided match');
  });

  it('prints it beside the win rate, so a 100% cannot be read alone', () => {
    const one = sampleMatch();
    const markdown = toMarkdown(
      summarise([
        { ...one, winnerSlot: 1 },
        { ...one, seed: 4249, winnerSlot: null },
      ]),
      'Denominator',
      'test'
    );
    assert.match(markdown, /\| Faction \| Matches \| Decided \| Win rate \|/);
    // Two matches, one of them decided, and the Commune won it: 100% of one.
    assert.match(markdown, /\| Commune \| 2 \| 1 \| 100% \|/);
  });

  it('refuses to print a win rate over nothing at all', () => {
    // 0/0 rendered as "0%" reads as "lost every game" and means "played none".
    // That cell is what #199 was opened against.
    const markdown = toMarkdown(
      summarise([{ ...sampleMatch(), winnerSlot: null }]),
      'Undecided',
      'test'
    );
    assert.match(markdown, /\| Consortium \| 1 \| 0 \| — \|/);
    assert.doesNotMatch(markdown, /\| 0 \| 0% \|/, 'a rate over no decided matches is not 0%');
  });
});

/**
 * The chair, and the batch that can tell it from the doctrine.
 *
 * `--matchup` binds a faction to a spawn by its position in the list, so a
 * batch measures one seating and a win rate out of it names a spawn as much as
 * a navy. `tools/balance/baselines/seat-rotation.md` is how much that is worth
 * on `ventfront-divide`: with four seats of one navy, so nothing but the
 * furniture left, slot 2 takes 50% of 109 decided matches against 11% for
 * slot 0.
 *
 * What is under test here is the arithmetic that lets a report say so, not the
 * simulation — so the batches are fabricated out of one short match's players
 * for the reason the #199 and #592 batches are. The rotation of a *live* batch
 * is the CLI's, and it is checked where it can be checked cheaply: that
 * rotating by nothing is the seating as typed.
 */
describe('the seating is a variable, and a rotated batch pools it (#600)', () => {
  it('cycles the factions and leaves the slots where the map put them', () => {
    const once = rotateSeats(FOUR_SEATS, 1);
    assert.deepEqual(
      once.map((s) => s.slot),
      [0, 1, 2, 3],
      'a slot is an index into the map spawns, so it must not move'
    );
    assert.deepEqual(
      once.map((s) => s.faction),
      [Faction.Pelagia, Faction.Directorate, Faction.Hadron, Faction.Bathyarch]
    );
  });

  it('carries the difficulty round with the faction that was given it', () => {
    // A seat is a faction *and* a commander, and `--matchup` spells both in one
    // entry. A rotation that moved the faction and left the difficulty behind
    // would quietly re-pair them and measure a matchup nobody asked for.
    const mixed: Seat[] = [
      { slot: 0, faction: Faction.Bathyarch, difficulty: AiDifficulty.Recruit },
      { slot: 1, faction: Faction.Pelagia, difficulty: AiDifficulty.Veteran },
    ];
    assert.deepEqual(rotateSeats(mixed, 1), [
      { slot: 0, faction: Faction.Pelagia, difficulty: AiDifficulty.Veteran },
      { slot: 1, faction: Faction.Bathyarch, difficulty: AiDifficulty.Recruit },
    ]);
  });

  it('rotating by nothing is the seating as typed', () => {
    // The property that keeps `--rotate-seats` opt-in honestly: a worker is
    // handed `--rotation 0` for the first seating, and a batch without the
    // flag is that seating alone. If this drifted, every committed baseline's
    // own command would stop reproducing it.
    assert.deepEqual(rotateSeats(FOUR_SEATS, 0), FOUR_SEATS);
  });

  it('normalises a shift past the table and behind it', () => {
    assert.deepEqual(rotateSeats(FOUR_SEATS, 4), FOUR_SEATS, 'all the way round is a no-op');
    assert.deepEqual(rotateSeats(FOUR_SEATS, -1), rotateSeats(FOUR_SEATS, 3));
    assert.deepEqual(rotateSeats([], 2), []);
  });

  it('puts each faction in each chair exactly once over a full cycle', () => {
    // The whole reason cyclic rotation is enough, and why the harness does not
    // need all 24 permutations: n rotations balance both marginals against
    // each other at n batches rather than n! of them.
    const cycle = FOUR_SEATS.map((_, by) => rotateSeats(FOUR_SEATS, by));
    for (let slot = 0; slot < FOUR_SEATS.length; slot++) {
      assert.deepEqual(
        [...new Set(cycle.map((seating) => seating[slot]!.faction))].sort((a, b) => a - b),
        [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron].sort(
          (a, b) => a - b
        ),
        `slot ${slot} did not host every navy`
      );
    }
  });

  /**
   * `matches` matches per seating, over `seatings` cyclic rotations, with the
   * win in each one handed to whoever is sitting in `winningSlot`.
   *
   * Built so that the two marginals disagree on purpose: the chair takes
   * everything and no doctrine does, which is the shape of the finding and the
   * thing a single-seating report cannot distinguish from the opposite.
   */
  function rotated(
    seatings: number,
    matches: number,
    winningSlot: number
  ): ReturnType<typeof summarise> {
    const one = fourSeatMatch();
    const results: MatchTelemetryResult[] = [];
    for (let by = 0; by < seatings; by++) {
      const seating = rotateSeats(FOUR_SEATS, by);
      for (let i = 0; i < matches; i++) {
        results.push({
          ...one,
          seed: 4400 + i,
          winnerSlot: winningSlot,
          players: one.players.map((p) => ({ ...p, faction: seating[p.slot]!.faction })),
        });
      }
    }
    return summarise(results);
  }

  it('counts the seatings it was played under, not the factions in it', () => {
    assert.equal(rotated(4, 5, 2).seatings, 4);
    assert.equal(rotated(1, 20, 2).seatings, 1, 'one seating, twenty matches');
  });

  it('reads the chair off the slots and the doctrine off the factions', () => {
    // Slot 2 wins every match; each navy sits there for a quarter of them. So
    // the chair reads 100% and every doctrine reads 25% — the two marginals of
    // one table, and the pair that a single seating collapses into one number.
    const summary = rotated(4, 5, 2);
    assert.equal(summary.slots.find((s) => s.slot === 2)!.winRate, 1);
    assert.deepEqual(
      summary.slots.filter((s) => s.slot !== 2).map((s) => s.winRate),
      [0, 0, 0]
    );
    for (const faction of summary.factions) {
      assert.equal(faction.winRate, 0.25, 'every navy took a quarter, by taking that chair');
    }
  });

  it('names the navies that sat in each chair', () => {
    const summary = rotated(4, 5, 2);
    for (const slot of summary.slots) {
      assert.equal(slot.factions.length, 4, `slot ${slot.slot} should have hosted every navy`);
    }
    assert.deepEqual(
      rotated(1, 5, 2).slots.map((s) => s.factions.length),
      [1, 1, 1, 1]
    );
  });

  it('says in the report how many seatings a win rate is pooled over', () => {
    // The sentence the fourteen baselines behind #592 could not carry. A reader
    // cannot tell a pooled batch from a single-seating one out of the seed
    // range, and it is the difference between a win rate that names a doctrine
    // and one that names a spawn.
    const pooled = toMarkdown(rotated(4, 5, 2), 'Rotated', 'test');
    assert.match(pooled, /4 seatings, pooled/);
    assert.doesNotMatch(pooled, /One seating/);

    const single = toMarkdown(rotated(1, 20, 2), 'Single', 'test');
    assert.match(single, /One seating/);
    assert.match(single, /cannot separate the doctrine from the chair/);
  });

  /**
   * A duel matrix: every ordered pair of the four, `matches` seeds each, the
   * win always going to slot 0.
   *
   * The shape `--duel-matrix` produces, and the one a rotation cannot: twelve
   * seatings over **six** rosters, so a navy's pooled win rate is against
   * different opponents as well as from different chairs.
   */
  function matrix(matches: number): ReturnType<typeof summarise> {
    const one = fourSeatMatch();
    const results: MatchTelemetryResult[] = [];
    for (let i = 0; i < FOUR_SEATS.length; i++) {
      for (let j = 0; j < FOUR_SEATS.length; j++) {
        if (i === j) continue;
        for (let k = 0; k < matches; k++) {
          results.push({
            ...one,
            seed: 4400 + k,
            winnerSlot: 0,
            players: [
              { ...one.players[0]!, slot: 0, faction: FOUR_SEATS[i]!.faction },
              { ...one.players[1]!, slot: 1, faction: FOUR_SEATS[j]!.faction },
            ],
          });
        }
      }
    }
    return summarise(results);
  }

  it('counts rosters apart from seatings, because a matrix varies both (#518)', () => {
    // The two come apart exactly once. A rotation is many seatings of one
    // roster; a matrix is many seatings of many rosters, and only the second
    // lets a per-faction win rate claim anything about the opponents.
    const rotation = rotated(4, 5, 2);
    assert.equal(rotation.seatings, 4);
    assert.equal(rotation.rosters, 1, 'a rotation re-seats one line-up');

    const duels = matrix(5);
    assert.equal(duels.seatings, 12, 'six pairings, each way round');
    assert.equal(duels.rosters, 6, 'and six line-ups under them');
  });

  it('says a matrix is pooled over opponents, not only over chairs (#518)', () => {
    const pooled = toMarkdown(matrix(5), 'Duel matrix', 'test');
    assert.match(pooled, /12 seatings over 6 rosters, pooled/);
    assert.match(pooled, /more than one opponent/);
    // And the narrower sentence is not claimed for a rotation, which has one
    // roster and cannot say anything about who was across the table.
    assert.doesNotMatch(toMarkdown(rotated(4, 5, 2), 'Rotated', 'test'), /rosters, pooled/);
  });

  it('prints the chair beside the doctrine, and only when they can differ', () => {
    assert.match(toMarkdown(rotated(4, 5, 2), 'Rotated', 'test'), /## Per chair/);
    assert.doesNotMatch(
      toMarkdown(rotated(1, 20, 2), 'Single', 'test'),
      /## Per chair/,
      'one navy per chair and one chair per navy is the faction table relabelled'
    );
  });

  it('prints the chair for a mirror, where the doctrine cannot vary at all', () => {
    // The other batch in which the two marginals differ, and the one #607
    // measured the chair with: four seats of one navy, so the faction column
    // is a single row and every difference left is the furniture.
    const one = fourSeatMatch();
    const mirror = summarise(
      Array.from({ length: 20 }, (_, i) => ({
        ...one,
        seed: 4500 + i,
        winnerSlot: 2,
        players: one.players.map((p) => ({ ...p, faction: Faction.Directorate })),
      }))
    );
    assert.equal(mirror.seatings, 1, 'one assignment — it is the doctrine that is repeated');
    assert.equal(mirror.factions.length, 1);
    assert.match(toMarkdown(mirror, 'Mirror', 'test'), /## Per chair/);
  });

  it('tells the spread rail how many seatings it is ruling on', () => {
    // The rail #600 rests on. Its reading was "Directorate 75%" out of one
    // seating and is 57% pooled over four, and it had no way to say which
    // claim it was making.
    const RISK = 'One navy is simply stronger';
    const railOf = (summary: ReturnType<typeof summarise>): GuardRailVerdict =>
      summary.guardRails.find((r) => r.risk === RISK)!;

    assert.match(railOf(rotated(4, 5, 2)).reading, /4 seatings pooled/);
    assert.match(railOf(rotated(1, 20, 2)).reading, /one seating/);
  });
});
