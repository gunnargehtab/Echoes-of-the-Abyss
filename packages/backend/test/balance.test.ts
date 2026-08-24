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

  it('produces Markdown a pull request can diff', () => {
    const results = runBatch({ seats: DUEL, seed: 61, maxMinutes: 1, fauna: false }, 2);
    const markdown = toMarkdown(summarise(results), 'Test run');

    assert.match(markdown, /^# Test run$/m);
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
    // The lever is a yield of *zero*, deliberately. An earlier version tripled
    // the Standard yield and got byte-identical income, which looked like a
    // broken override and was not: the multiplier sets how fast a hold fills,
    // cargo is capped at fifty a trip, and a round trip is dominated by
    // travel. Tripling the fill rate saves about three seconds out of forty
    // and does not buy a whole extra delivery inside a short match. That is a
    // real property of the economy — and the reason "is Overburden a trap?"
    // is a question worth pointing this harness at.
    // Every working throttle, not just Standard: a commander drops to Trickle
    // the moment somebody holds a bearing on it, so zeroing one setting only
    // moves the mining to another and the income keeps arriving.
    const working = [HarvestThrottle.Trickle, HarvestThrottle.Standard, HarvestThrottle.Overburden];
    const before = working.map((t) => HARVEST_THROTTLE[t].yieldMultiplier);
    const baseline = runMatch({ seats: DUEL, seed: 62, maxMinutes: 3, fauna: false });
    try {
      for (const throttle of working) HARVEST_THROTTLE[throttle].yieldMultiplier = 0;
      const variant = runMatch({ seats: DUEL, seed: 62, maxMinutes: 3, fauna: false });
      const earned = (r: typeof baseline): number => r.players[1]!.nodulesEarned;

      assert.ok(earned(baseline) > 0, 'the baseline economy works');
      assert.equal(earned(variant), 0, 'a zero yield must reach the simulation');
    } finally {
      working.forEach((t, i) => (HARVEST_THROTTLE[t].yieldMultiplier = before[i]!));
    }
  });
});
