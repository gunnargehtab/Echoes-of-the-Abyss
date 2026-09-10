/**
 * A match with no server and no screen.
 *
 * `Match` was already independent of Colyseus and of the renderer — the room
 * only ever translated messages into its methods — so a headless run needs no
 * new entry point in the simulation. It builds a Match, seats a commander in
 * every slot, and steps it as fast as the process will go.
 *
 * Every seat is an AI, which is why this harness could not exist before one
 * did: a balance question about the Commune's economy is a question about the
 * Commune *being played*, and a scripted opening answers a narrower question
 * than the one the guard-rail tables ask.
 *
 * Runs are reproducible. The seed is explicit, the commanders are
 * deterministic by construction (ESLint forbids `Math.random` under `ai/`),
 * and the same seed and matchup produce the same match — so a result that
 * changes is a change in the game, not in the weather.
 *
 * **What the seed actually varies is worth knowing before you trust a batch.**
 * `world.rng` is drawn from in exactly one place in the whole simulation:
 * `Match.seedFauna`, placing the Drift. Terrain is authored, hazard timings
 * are derived from site positions, combat rolls nothing, and the commanders
 * draw no dice. So with `fauna: false` the seed is inert and every match in a
 * batch is byte-identical — ten runs of one match, reported as ten samples.
 *
 * That is a feature of the simulation (it is what makes replays and the state
 * hash work) and a trap for this harness, so `runBatch` refuses to pretend
 * otherwise: it reports how much variation it actually had.
 */

import { SIM, type Faction } from '@echoes/shared';
import { AiDifficulty } from '@echoes/shared';
import { AiSeat, briefingFor } from '../ai/seat.ts';
import { Match } from '../sim/match.ts';
import { mapById, DEFAULT_MAP_ID } from '../sim/maps/index.ts';
import { MatchTelemetry, type MatchTelemetryResult } from './telemetry.ts';

export interface Seat {
  slot: number;
  faction: Faction;
  difficulty: AiDifficulty;
}

export interface RunOptions {
  seats: Seat[];
  seed: number;
  mapId?: string;
  /** Give up after this much simulated time and record it as a draw. */
  maxMinutes?: number;
  /** The Drift. On by default — a normal match has fauna. */
  fauna?: boolean;
}

/** Simulated minutes a match gets before it is called a draw. */
export const DEFAULT_MAX_MINUTES = 30;

export function runMatch(options: RunOptions): MatchTelemetryResult {
  const map = mapById(options.mapId ?? DEFAULT_MAP_ID) ?? mapById(DEFAULT_MAP_ID)!;
  const match = new Match(map, { seed: options.seed, fauna: options.fauna !== false });

  const seats: AiSeat[] = [];
  for (const seat of options.seats) {
    match.addPlayer(seat.slot, seat.faction);
    seats.push(new AiSeat(match, briefingFor(match, seat.slot, seat.faction, seat.difficulty)));
  }

  const telemetry = new MatchTelemetry(
    options.seed,
    map.id,
    options.seats.map(({ slot, faction }) => ({ slot, faction }))
  );

  const stepMs = 1000 / SIM.TICK_HZ;
  const budget = (options.maxMinutes ?? DEFAULT_MAX_MINUTES) * 60 * SIM.TICK_HZ;
  let timedOut = true;

  for (let tick = 0; tick < budget; tick++) {
    const snapshots = match.update(stepMs);
    if (snapshots !== null) {
      // Commanders observe on the Echo tick, exactly as they do in a room —
      // the harness must not give them a faster clock than a live match does.
      for (const seat of seats) {
        const own = snapshots.get(seat.slot);
        if (own !== undefined) seat.observe(own);
      }
      telemetry.observe(match.tick, snapshots);
    }
    if (match.result !== null) {
      timedOut = false;
      break;
    }
  }

  return telemetry.finish(
    match.tick,
    match.result?.winnerSlot ?? null,
    timedOut,
    match.faunaComplement
  );
}

/**
 * The same matchup, N times, on consecutive seeds.
 *
 * A single result of a match this long tells you nothing — docs/playtest-
 * checklist.md asks for N >= 10 runs per scenario for exactly that reason, and
 * the report prints the distribution rather than a mean, because a mean of ten
 * matches hides the one that went twice as long as the rest.
 */
export function runBatch(options: RunOptions, matches: number): MatchTelemetryResult[] {
  const results: MatchTelemetryResult[] = [];
  for (let i = 0; i < matches; i++) {
    results.push(runMatch({ ...options, seed: options.seed + i }));
  }
  return results;
}

/**
 * Whether a batch of this shape can differ from run to run at all.
 *
 * Called by the CLI so a `--no-fauna --matches 10` run is warned about rather
 * than quietly returning ten copies of one match dressed as a distribution.
 */
export function seedHasAnyEffect(options: RunOptions): boolean {
  return options.fauna !== false;
}

/**
 * The same roster, seated one chair further round.
 *
 * `--matchup` binds a faction to a spawn by its position in the list, so a
 * batch measures one *seating* rather than one matchup — and on
 * `ventfront-divide` the chair is worth more than the doctrine. Four seats of
 * one navy, so nothing but the furniture is left, win 11% / 28% / 50% / 11%
 * by slot across 109 decided matches and three navies; rotating the
 * four-faction baseline's seat order moves the Directorate from 75% to 31% on
 * identical seeds. `tools/balance/baselines/seat-rotation.md` is that
 * measurement.
 *
 * So a win rate read off one seating names a spawn as much as it names a
 * doctrine, and pooling `n` cyclic rotations is what makes the per-faction
 * column mean the doctrine again: each faction sits in each chair exactly
 * once, so the two marginals are balanced against each other. Cyclic rather
 * than every permutation because that balance is what is needed and it costs
 * `n` batches rather than `n!`.
 *
 * The slots stay `0..n-1` and the factions move through them. Renumbering the
 * slots instead would be the same rotation on paper and a different thing in
 * the water: `Match.addPlayer` reads the slot as an index into the map's
 * spawns, so a shifted slot can land past the last one the map has.
 */
export function rotateSeats(seats: Seat[], by: number): Seat[] {
  if (seats.length === 0) return [];
  const shift = ((by % seats.length) + seats.length) % seats.length;
  return seats.map((_, slot) => ({ ...seats[(slot + shift) % seats.length]!, slot }));
}
