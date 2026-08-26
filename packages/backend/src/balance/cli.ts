/**
 * The balance harness, as a command.
 *
 * Two things make it useful rather than merely present.
 *
 * **`--set`** patches a TUNABLE constant before the batch runs, so a change
 * can be argued with a before/after from one shell history rather than with a
 * rebuild in between. The constants it can reach are allowlisted below, and
 * that is deliberate: an open-ended object-path setter would be a foot-gun
 * that could silently mutate something the docs call SPEC, and a SPEC number
 * is not a thing to experiment with — you change the doc first.
 *
 * **`--matchup`** names the seats, so the batch is a question about a specific
 * pairing rather than about "the game" in the abstract. Faction balance
 * claims are pairwise, and averaging over every pairing hides the pairing that
 * is broken.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  ACTIVE_SONAR,
  AiDifficulty,
  CRYSTAL,
  DRIFT,
  ECHO_MARKS,
  ECONOMY,
  Faction,
  HARVEST_THROTTLE,
  HarvestThrottle,
  LIFECYCLE,
  THERMAL_DRAW,
} from '@echoes/shared';
import { runBatch, seedHasAnyEffect, DEFAULT_MAX_MINUTES, type Seat } from './runner.ts';
import { DEFAULT_MAP_ID, MAPS, mapById } from '../sim/maps/index.ts';
import { summarise, toMarkdown } from './report.ts';

/**
 * Constants `--set` may reach.
 *
 * TUNABLE roots only. Anything the docs pin down as SPEC is absent on purpose:
 * changing one of those is a documentation change first and a code change
 * second, and a harness that let you skip that step would make it easy to
 * "balance" the game by quietly contradicting its own design bible.
 */
const TUNABLE_ROOTS: Record<string, object> = {
  ECONOMY,
  HARVEST_THROTTLE,
  ECHO_MARKS,
  THERMAL_DRAW,
  DRIFT,
  CRYSTAL,
  LIFECYCLE,
  ACTIVE_SONAR,
};

const FACTION_BY_NAME: Record<string, Faction> = {
  consortium: Faction.Bathyarch,
  bathyarch: Faction.Bathyarch,
  commune: Faction.Pelagia,
  pelagia: Faction.Pelagia,
  directorate: Faction.Directorate,
  knights: Faction.Hadron,
  hadron: Faction.Hadron,
};

const DIFFICULTY_BY_NAME: Record<string, AiDifficulty> = {
  recruit: AiDifficulty.Recruit,
  veteran: AiDifficulty.Veteran,
};

const THROTTLE_BY_NAME: Record<string, HarvestThrottle> = {
  Idle: HarvestThrottle.Idle,
  Trickle: HarvestThrottle.Trickle,
  Standard: HarvestThrottle.Standard,
  Overburden: HarvestThrottle.Overburden,
};

function flag(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || index === process.argv.length - 1) return fallback;
  return process.argv[index + 1];
}

function flags(name: string): string[] {
  const found: string[] = [];
  for (let i = 0; i < process.argv.length - 1; i++) {
    if (process.argv[i] === `--${name}`) found.push(process.argv[i + 1]!);
  }
  return found;
}

/**
 * Apply one `Root.path.to.field=value` override.
 *
 * Throws rather than warning on anything it cannot resolve. A typo'd path that
 * silently did nothing would produce a "before/after" where nothing changed
 * and the conclusion was "the constant does not matter" — the most expensive
 * possible failure mode for a tool whose whole job is to answer that question.
 */
function applyOverride(assignment: string): string {
  const [path, raw] = assignment.split('=');
  if (path === undefined || raw === undefined) {
    throw new Error(`--set needs Root.field=value, got "${assignment}"`);
  }
  const parts = path.split('.');
  const rootName = parts.shift()!;
  const root = TUNABLE_ROOTS[rootName];
  if (root === undefined) {
    throw new Error(
      `"${rootName}" is not a tunable root. Available: ${Object.keys(TUNABLE_ROOTS).join(', ')}`
    );
  }

  let target = root as Record<string, unknown>;
  while (parts.length > 1) {
    const key = resolveKey(parts.shift()!);
    const next = target[key];
    if (typeof next !== 'object' || next === null) {
      throw new Error(`"${path}" does not resolve — "${key}" is not an object`);
    }
    target = next as Record<string, unknown>;
  }

  const leaf = resolveKey(parts[0]!);
  if (!(leaf in target)) throw new Error(`"${path}" does not resolve — no field "${leaf}"`);
  const before = target[leaf];
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`"${raw}" is not a number`);
  target[leaf] = value;
  return `${path}: ${String(before)} -> ${value}`;
}

/** HARVEST_THROTTLE is keyed by enum ordinal; let a human write the name. */
function resolveKey(key: string): string {
  const throttle = THROTTLE_BY_NAME[key];
  return throttle === undefined ? key : String(throttle);
}

function parseMatchup(spec: string): Seat[] {
  return spec.split(',').map((entry, slot) => {
    const [factionName, difficultyName = 'veteran'] = entry.trim().split(':');
    const faction = FACTION_BY_NAME[(factionName ?? '').trim().toLowerCase()];
    if (faction === undefined) {
      throw new Error(
        `unknown faction "${factionName}". Try: ${Object.keys(FACTION_BY_NAME).join(', ')}`
      );
    }
    const difficulty = DIFFICULTY_BY_NAME[difficultyName.trim().toLowerCase()];
    if (difficulty === undefined) throw new Error(`unknown difficulty "${difficultyName}"`);
    return { slot, faction, difficulty };
  });
}

function main(): void {
  if (process.argv.includes('--help')) {
    console.log(USAGE);
    return;
  }

  const overrides = flags('set').map(applyOverride);
  const seats = parseMatchup(flag('matchup', 'consortium,commune')!);
  const matches = Number(flag('matches', '10'));
  const seed = Number(flag('seed', '1000'));
  const maxMinutes = Number(flag('max-minutes', String(DEFAULT_MAX_MINUTES)));
  const mapId = flag('map');
  const fauna = !process.argv.includes('--no-fauna');
  const title = flag('title', 'Balance run')!;

  if (!Number.isFinite(matches) || matches < 1) throw new Error('--matches must be >= 1');

  // A seat with no spawn never fields anything. The batch still runs, every
  // match times out as a draw, and the report comes back with real-looking
  // zeros in every column for the seats that were never in the water — which
  // reads as a finding about those factions rather than as a malformed run.
  // Refused here, naming the map and its spawn count, because the cheapest
  // moment to catch it is before twenty-five minutes of simulation.
  const map = mapById(mapId ?? DEFAULT_MAP_ID);
  if (map === undefined) {
    throw new Error(`--map ${mapId}: no such map (have ${MAPS.map((m) => m.id).join(', ')})`);
  }
  if (seats.length > map.spawns.length) {
    throw new Error(
      `${map.id} has ${map.spawns.length} spawns and --matchup names ${seats.length} seats. ` +
        `Seats past the ${map.spawns.length}${map.spawns.length === 1 ? 'st' : 'nd'} would never ` +
        `spawn, and every match would draw.`
    );
  }

  const started = Date.now();
  console.error(
    `Running ${matches} matches, ${seats.length} seats, seed ${seed}, cap ${maxMinutes} min...`
  );
  if (overrides.length > 0) console.error(`Overrides: ${overrides.join('; ')}`);

  const run = { seats, seed, mapId, maxMinutes, fauna };
  // The seed reaches exactly one thing in the simulation: where the Drift is
  // placed. Without it, every match in the batch is identical, and a
  // "distribution" over ten of them is a distribution over one sample.
  const varies = seedHasAnyEffect(run);
  if (!varies && matches > 1) {
    console.error(
      `WARNING: --no-fauna makes the seed inert — the Drift is the only thing it ` +
        `places — so these ${matches} matches will be identical. Run one, or keep fauna.`
    );
  }

  const results = runBatch(run, matches);
  const summary = summarise(results);
  // Quoted so a title with spaces round-trips through a shell unchanged.
  const command = [
    'node tools/balance/run.mjs',
    ...process.argv.slice(2).map((arg) => (arg.includes(' ') ? `'${arg}'` : arg)),
  ].join(' ');
  let markdown = toMarkdown(summary, title, command);
  if (!varies && matches > 1) {
    markdown +=
      `\n> **These runs are not independent.** \`--no-fauna\` makes the seed inert, ` +
      `because placing the Drift is the only thing the simulation draws from it. ` +
      `The ${matches} matches below are the same match ${matches} times.\n`;
  }
  if (overrides.length > 0) {
    markdown += `\n**Overrides applied:** ${overrides.map((o) => `\`${o}\``).join(', ')}\n`;
  }

  const out = flag('out');
  if (out === undefined) {
    console.log(markdown);
  } else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, markdown);
    writeFileSync(out.replace(/\.md$/, '.json'), JSON.stringify({ summary, results }, null, 2));
    console.error(`Wrote ${out} and its .json sibling`);
  }
  console.error(`Done in ${((Date.now() - started) / 1000).toFixed(1)} s of wall clock.`);
}

const USAGE = `Balance harness — headless matches, telemetry, and the guard-rail table.

  node tools/balance/run.mjs [options]

  --matchup <spec>     Comma-separated seats, "faction[:difficulty]".
                       Default: consortium,commune
                       Factions: consortium commune directorate knights
                       Difficulty: recruit veteran (default veteran)
  --matches <n>        Matches to run. Default 10 — the playtest checklist
                       asks for N >= 10, because one long match tells you
                       nothing.
  --seed <n>           Base seed; match i uses seed+i. Default 1000.
  --max-minutes <n>    Simulated minutes before a match is called a draw.
                       Default ${DEFAULT_MAX_MINUTES}.
  --map <id>           Map archetype. Default is the room's default.
  --no-fauna           Empty the Drift. Off by default: a normal match has it.
  --set <Path=value>   Patch a TUNABLE constant before the batch, e.g.
                       --set HARVEST_THROTTLE.Overburden.cargoMultiplier=1.0
                       Roots: ${Object.keys(TUNABLE_ROOTS).join(' ')}
  --title <text>       Heading for the report.
  --out <file.md>      Write Markdown here, plus a .json sibling. Default
                       is stdout.

Reproducible by construction: the seed is explicit and the commanders draw no
dice, so the same command twice gives the same numbers.`;

main();
