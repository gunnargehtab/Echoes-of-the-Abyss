/**
 * Turning N matches into an argument.
 *
 * The output is Markdown because the point is to be **diffable in a pull
 * request**: a change to a TUNABLE constant should be justifiable with a
 * before/after that a reviewer can read as a diff, rather than with an
 * assertion that it "feels better". JSON is written alongside for anything
 * that wants to plot it, but the Markdown is the artifact.
 *
 * Distributions, not means. A mean of ten thirty-minute matches hides the one
 * that ended in four, and the interesting balance failures live in exactly
 * that tail — so every figure here carries a median and a p10-p90 spread.
 *
 * The guard-rail section is the reason this file exists. docs/economy.md §9
 * and docs/bestiary.md §8 name specific ways this design could fail, and each
 * one below is paired with a number that would *detect* it. A verdict of
 * "held" is not proof the design is balanced; it means the failure this
 * guard-rail describes did not happen in these runs, which is the most a
 * harness can honestly say.
 */

import { Faction, SIM } from '@echoes/shared';
import type { MatchTelemetryResult, PlayerTelemetry } from './telemetry.ts';

const FACTION_NAME: Record<Faction, string> = {
  [Faction.Bathyarch]: 'Consortium',
  [Faction.Pelagia]: 'Commune',
  [Faction.Directorate]: 'Directorate',
  [Faction.Hadron]: 'Knights',
};

export interface FactionSummary {
  faction: Faction;
  matches: number;
  wins: number;
  /** Wins as a fraction of decided matches — draws are excluded, not counted as losses. */
  winRate: number;
  /** Nodules banked plus spent, per simulated minute. */
  incomePerMinute: number;
  biomassPerMinute: number;
  /** Mean of the per-sample loudest own hull. */
  meanPeakSig: number;
  /** Seconds per match with somebody holding Bearing or better. */
  secondsTracked: number;
  /** Hulls lost per match. */
  lossesPerMatch: number;
  /** Share of hull-time spent below the Shelf. */
  deepTimeShare: number;
}

export interface BatchSummary {
  matches: number;
  seeds: number[];
  mapId: string;
  draws: number;
  lengthS: Distribution;
  firstContactS: Distribution;
  firstEnemyContactS: Distribution;
  firstBloodS: Distribution;
  driftHealthFinal: Distribution;
  factions: FactionSummary[];
  guardRails: GuardRailVerdict[];
}

export interface Distribution {
  median: number;
  p10: number;
  p90: number;
  n: number;
}

export interface GuardRailVerdict {
  /** The risk exactly as the doc words it. */
  risk: string;
  source: string;
  /** The number that would detect it, and what it came out as. */
  metric: string;
  reading: string;
  verdict: 'held' | 'breached' | 'no data';
}

/**
 * A rail nobody in this matchup could have breached.
 *
 * Reported rather than omitted, so the table always shows every guard-rail the
 * docs name. A missing row reads as "fine"; an explicit "no data" reads as
 * "you did not ask this question", which is what actually happened.
 */
function noSeat(risk: string, source: string, faction: string): GuardRailVerdict {
  return {
    risk,
    source,
    metric: `Requires a ${faction} seat`,
    reading: `no ${faction} seat in this matchup`,
    verdict: 'no data',
  };
}

function distribution(values: number[]): Distribution {
  const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length === 0) return { median: 0, p10: 0, p90: 0, n: 0 };
  const at = (q: number): number =>
    clean[Math.min(clean.length - 1, Math.floor(q * clean.length))]!;
  return { median: at(0.5), p10: at(0.1), p90: at(0.9), n: clean.length };
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

/**
 * Minutes this player was actually in the match.
 *
 * Not the match length, which is the bug this replaces. A commander eliminated
 * at five minutes of a twenty-five-minute game had their income averaged over
 * the twenty minutes they spent dead, reporting an economy a fifth of its real
 * size — and doing it worst to exactly the factions that lose early, which is
 * the population a balance report is most often asked about.
 */
function lifetimeMinutes(row: { player: PlayerTelemetry; result: MatchTelemetryResult }): number {
  const ticks = row.player.eliminatedTick ?? row.result.finalTick;
  return Math.max(1 / 60, ticks / SIM.TICK_HZ / 60);
}

export function summarise(results: MatchTelemetryResult[]): BatchSummary {
  const byFaction = new Map<Faction, { player: PlayerTelemetry; result: MatchTelemetryResult }[]>();
  for (const result of results) {
    for (const player of result.players) {
      const rows = byFaction.get(player.faction) ?? [];
      rows.push({ player, result });
      byFaction.set(player.faction, rows);
    }
  }

  const factions: FactionSummary[] = [];
  for (const [faction, rows] of byFaction) {
    const decided = rows.filter((r) => r.result.winnerSlot !== null);
    const wins = decided.filter((r) => r.result.winnerSlot === r.player.slot).length;
    factions.push({
      faction,
      matches: rows.length,
      wins,
      winRate: decided.length === 0 ? 0 : wins / decided.length,
      incomePerMinute: mean(rows.map((r) => r.player.nodulesEarned / lifetimeMinutes(r))),
      biomassPerMinute: mean(rows.map((r) => r.player.biomassEarned / lifetimeMinutes(r))),
      meanPeakSig: mean(rows.map((r) => mean(r.player.peakSig))),
      secondsTracked: mean(rows.map((r) => r.player.secondsTracked)),
      lossesPerMatch: mean(
        rows.map((r) => Object.values(r.player.lossesByKind).reduce((a, b) => a + b, 0))
      ),
      deepTimeShare: mean(
        rows.map((r) => {
          const bands = Object.values(r.player.hullSecondsByBand);
          const total = bands.reduce((a, b) => a + b, 0);
          return total === 0 ? 0 : (bands[1]! + bands[2]!) / total;
        })
      ),
    });
  }
  factions.sort((a, b) => a.faction - b.faction);

  return {
    matches: results.length,
    seeds: results.map((r) => r.seed),
    mapId: results[0]?.mapId ?? 'unknown',
    draws: results.filter((r) => r.winnerSlot === null).length,
    lengthS: distribution(results.map((r) => r.lengthS)),
    // Not filtered to non-zero. With the Drift populated the honest answer
    // is usually "tick 0" — a creature is in earshot of a spawn from the
    // first frame — and dropping those left the distribution empty and
    // reporting a confident 0 s from a sample of nothing.
    firstContactS: distribution(
      results.map((r) => (r.firstContactTick ?? Number.NaN) / SIM.TICK_HZ)
    ),
    firstEnemyContactS: distribution(
      results.map((r) => (r.firstEnemyContactTick ?? Number.NaN) / SIM.TICK_HZ)
    ),
    firstBloodS: distribution(results.map((r) => (r.firstBloodTick ?? Number.NaN) / SIM.TICK_HZ)),
    driftHealthFinal: distribution(results.map((r) => r.driftHealthFinal)),
    factions,
    guardRails: judge(results, factions),
  };
}

/**
 * Each guard-rail, paired with the number that would catch it failing.
 *
 * A verdict is about *these runs*, not about the game. "Held" means the
 * failure this rail describes did not appear in this sample; it is evidence,
 * not proof, and the sample size is printed next to it so a reader can weigh
 * it themselves.
 */
function judge(results: MatchTelemetryResult[], factions: FactionSummary[]): GuardRailVerdict[] {
  const find = (faction: Faction): FactionSummary | undefined =>
    factions.find((f) => f.faction === faction);
  const verdicts: GuardRailVerdict[] = [];
  const pct = (v: number): string => `${Math.round(v * 100)}%`;

  // "Quiet economies simply win." The Commune is the quietest faction by
  // doctrine, so the failure looks like: quietest *and* winning most *and*
  // earning most per unit of noise. Any one of those alone is fine — being
  // quiet is supposed to be worth something.
  const decided = results.filter((r) => r.winnerSlot !== null).length;
  const commune = find(Faction.Pelagia);
  const others = factions.filter((f) => f.faction !== Faction.Pelagia);
  if (commune === undefined || others.length === 0) {
    verdicts.push(noSeat('Quiet economies simply win', 'economy.md §9', 'Commune'));
  } else {
    const quietPremium = (f: FactionSummary): number =>
      f.meanPeakSig <= 0 ? 0 : f.incomePerMinute / f.meanPeakSig;
    const bestPremium = Math.max(...others.map(quietPremium));
    const bestWinRate = Math.max(...others.map((f) => f.winRate));
    const breached = commune.winRate > bestWinRate && quietPremium(commune) > bestPremium;
    verdicts.push({
      risk: 'Quiet economies simply win',
      source: 'economy.md §9',
      metric: 'Commune win rate, and nodules per minute per point of mean SIG',
      reading:
        `win ${pct(commune.winRate)} vs best rival ${pct(bestWinRate)}, ` +
        `premium ${quietPremium(commune).toFixed(1)} vs ${bestPremium.toFixed(1)} (n=${decided})`,
      verdict: breached ? 'breached' : 'held',
    });
  }

  // "Loud economies are unplayable." The Consortium is loudest by doctrine, so
  // the failure is: tracked the most *and* winning the least. Being heard is
  // supposed to be survivable for exactly one faction, and it is this one.
  const consortium = find(Faction.Bathyarch);
  if (consortium === undefined || factions.length < 2) {
    verdicts.push(noSeat('Loud economies are unplayable', 'economy.md §9', 'Consortium'));
  } else {
    const loudest = factions.every((f) => consortium.secondsTracked >= f.secondsTracked);
    const worst = factions.every((f) => consortium.winRate <= f.winRate);
    verdicts.push({
      risk: 'Loud economies are unplayable',
      source: 'economy.md §9',
      metric: 'Consortium seconds tracked, against Consortium win rate',
      reading:
        `${consortium.secondsTracked.toFixed(0)} s tracked per match, ` +
        `win ${pct(consortium.winRate)} (n=${decided})`,
      verdict: loudest && worst ? 'breached' : 'held',
    });
  }

  // "Directorate Biomass snowballs." The mitigation is that yield scales with
  // Drift Health, which their own harvesting degrades — so the failure is
  // biomass income arriving *without* the region paying for it.
  const directorate = find(Faction.Directorate);
  if (directorate === undefined) {
    verdicts.push(
      noSeat('Directorate Biomass snowballs', 'economy.md §9 · bestiary.md §8', 'Directorate')
    );
  } else {
    const drift = distribution(results.map((r) => r.driftHealthFinal));
    const breached = directorate.biomassPerMinute > 0 && drift.median > 95;
    verdicts.push({
      risk: 'Directorate Biomass snowballs',
      source: 'economy.md §9 · bestiary.md §8',
      metric: 'Biomass per minute against final Drift Health',
      reading:
        `${directorate.biomassPerMinute.toFixed(1)}/min, ` +
        `Drift Health median ${drift.median.toFixed(0)} (n=${decided})`,
      verdict: directorate.biomassPerMinute === 0 ? 'no data' : breached ? 'breached' : 'held',
    });
  }

  // "Knights starve out of every long game." Their ceiling is meant to be low
  // and their win condition early, so this one is only visible split by match
  // length: a flat win rate hides it completely.
  const knightRows = results.flatMap((r) =>
    r.players.filter((p) => p.faction === Faction.Hadron).map((p) => ({ p, r }))
  );
  if (knightRows.length > 0) {
    const median = distribution(results.map((r) => r.lengthS)).median;
    const rate = (rows: typeof knightRows): number => {
      const decided = rows.filter((row) => row.r.winnerSlot !== null);
      return decided.length === 0
        ? 0
        : decided.filter((row) => row.r.winnerSlot === row.p.slot).length / decided.length;
    };
    const short = rate(knightRows.filter((row) => row.r.lengthS <= median));
    const long = rate(knightRows.filter((row) => row.r.lengthS > median));
    const hadron = find(Faction.Hadron);
    const fieldIncome = factions
      .filter((f) => f.faction !== Faction.Hadron)
      .map((f) => f.incomePerMinute);
    const rivalIncome =
      fieldIncome.length === 0 ? 0 : fieldIncome.reduce((a, b) => a + b, 0) / fieldIncome.length;
    const income = hadron === undefined ? 0 : hadron.incomePerMinute;

    // Winning nothing anywhere cannot distinguish "starves late" from "is
    // simply weak", so the split reports no data rather than a comfortable
    // "held". The income gap is carried alongside it, because the doc's
    // mitigation is specifically about their *floor* — "the tithe is
    // map-control-independent, so their floor never falls".
    const noWins = short === 0 && long === 0;
    verdicts.push({
      risk: 'Knights starve out of every long game',
      source: 'economy.md §9',
      metric: 'Hadron win rate, bucketed either side of the median match length',
      reading:
        `short ${pct(short)}, long ${pct(long)} (median ${median.toFixed(0)} s); ` +
        `income ${income.toFixed(0)}/min vs field ${rivalIncome.toFixed(0)}`,
      verdict: noWins ? 'no data' : long === 0 ? 'breached' : 'held',
    });
  } else {
    verdicts.push(noSeat('Knights starve out of every long game', 'economy.md §9', 'Hadron'));
  }

  // "Fauna decide matches." Keyed on the first *classified enemy*, not the
  // first contact: with the Drift populated, first contact is tick 0 in almost
  // every match, so a rail measured against it reads "held" no matter what
  // happens. Losses landing before the two commanders have found each other
  // is the shape of something having been eaten.
  const enemy = distribution(
    results.map((r) => (r.firstEnemyContactTick ?? Number.NaN) / SIM.TICK_HZ)
  );
  const blood = distribution(results.map((r) => (r.firstBloodTick ?? Number.NaN) / SIM.TICK_HZ));
  verdicts.push({
    risk: 'Fauna decide matches',
    source: 'bestiary.md §8',
    metric: 'First blood against first classified enemy — losses before anyone met anyone',
    reading:
      `enemy found ${enemy.n === 0 ? 'never' : `${enemy.median.toFixed(0)} s`}, ` +
      `first blood ${blood.n === 0 ? 'never' : `${blood.median.toFixed(0)} s`} (n=${blood.n})`,
    verdict:
      blood.n === 0 || enemy.n === 0
        ? 'no data'
        : blood.median < enemy.median
          ? 'breached'
          : 'held',
  });

  return verdicts;
}

// --- Markdown --------------------------------------------------------------

export function toMarkdown(summary: BatchSummary, title: string, command?: string): string {
  const pct = (v: number): string => `${Math.round(v * 100)}%`;
  const dist = (d: Distribution): string =>
    `${d.median.toFixed(0)} (${d.p10.toFixed(0)}–${d.p90.toFixed(0)})`;

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push('');
  if (command !== undefined) {
    // The exact invocation, so a committed baseline can be reproduced rather
    // than merely admired. A result nobody can regenerate is a screenshot.
    lines.push('```bash');
    lines.push(command);
    lines.push('```');
    lines.push('');
  }
  lines.push(
    `${summary.matches} matches on \`${summary.mapId}\`, seeds ` +
      `${summary.seeds[0]}–${summary.seeds[summary.seeds.length - 1]}. ` +
      `${summary.draws} ended without a winner inside the time budget.`
  );
  lines.push('');
  lines.push('## Guard-rails');
  lines.push('');
  lines.push('| Risk | Source | Metric | Reading | Verdict |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const rail of summary.guardRails) {
    lines.push(
      `| ${rail.risk} | ${rail.source} | ${rail.metric} | ${rail.reading} | **${rail.verdict}** |`
    );
  }
  lines.push('');
  lines.push('## The match');
  lines.push('');
  lines.push('| Measure | Median (p10–p90) |');
  lines.push('| --- | --- |');
  lines.push(`| Length, seconds | ${dist(summary.lengthS)} |`);
  lines.push(`| First contact, seconds | ${dist(summary.firstContactS)} |`);
  lines.push(`| First classified enemy, seconds | ${dist(summary.firstEnemyContactS)} |`);
  lines.push(`| First blood, seconds | ${dist(summary.firstBloodS)} |`);
  lines.push(`| Drift Health at the end | ${dist(summary.driftHealthFinal)} |`);
  lines.push('');
  lines.push('## Per faction');
  lines.push('');
  lines.push(
    '| Faction | Matches | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Losses | Below the Shelf |'
  );
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const f of summary.factions) {
    lines.push(
      `| ${FACTION_NAME[f.faction]} | ${f.matches} | ${pct(f.winRate)} | ` +
        `${f.incomePerMinute.toFixed(0)} | ${f.biomassPerMinute.toFixed(1)} | ` +
        `${f.meanPeakSig.toFixed(0)} | ${f.secondsTracked.toFixed(0)} | ` +
        `${f.lossesPerMatch.toFixed(1)} | ${pct(f.deepTimeShare)} |`
    );
  }
  lines.push('');
  lines.push(
    '_A verdict of "held" means the failure that guard-rail describes did not appear in ' +
      'these runs. It is evidence, not proof; weigh it against the sample size._'
  );
  lines.push('');
  return lines.join('\n');
}
