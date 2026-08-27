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

import {
  AiDifficulty,
  ECONOMY,
  Faction,
  HARVEST_THROTTLE,
  HarvestThrottle,
  SIM,
} from '@echoes/shared';
import { runBatch, runMatch, seedHasAnyEffect, type Seat } from '../src/balance/runner.ts';
import { summarise, toMarkdown } from '../src/balance/report.ts';

const DUEL: Seat[] = [
  { slot: 0, faction: Faction.Bathyarch, difficulty: AiDifficulty.Veteran },
  { slot: 1, faction: Faction.Pelagia, difficulty: AiDifficulty.Veteran },
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

describe('the guard-rail table answers the docs', () => {
  it('names every rail, including the ones this matchup cannot test', () => {
    // A missing row reads as "fine". An explicit "no data" reads as "you did
    // not ask", which is what actually happened.
    const results = runBatch({ seats: DUEL, seed: 60, maxMinutes: 2, fauna: false }, 2);
    const rails = summarise(results).guardRails;

    const risks = rails.map((r) => r.risk);
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
