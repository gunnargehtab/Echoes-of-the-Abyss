/**
 * A batch of matches, one process each.
 *
 * ## Why a process, and not a loop
 *
 * `runBatch` looks independent — it is a loop over
 * `runMatch({ ...options, seed: seed + i })`, and nothing in the harness
 * carries state between iterations. The simulation underneath it does.
 * `bitecs` keeps its entity cursor and its freed-id list in *module* scope,
 * shared by every world in the process, and recycles a freed id once more than
 * `globalSize * 0.01` — a thousand of them — have been returned. A
 * twenty-five-minute four-faction match returns far more than a thousand, so
 * from roughly the third match onward a batch hands each new world ids drawn
 * from the previous matches' dead, and the component arrays behind those ids
 * still hold the previous matches' values.
 *
 * Measured, on `ventfront-divide` seeds 4000-4029: seed 4001 run alone matches
 * the second match of a batch exactly, and seeds 4007, 4014, 4021 and 4029 do
 * not match the eighth, fifteenth, twenty-second and thirtieth. The harness's
 * own docstring promises "the same seed and matchup produce the same match —
 * so a result that changes is a change in the game, not in the weather", and
 * that promise was true only of a batch's first couple of matches.
 *
 * Resetting the cursor between matches is not enough, and was tried: the ids
 * come back but the component arrays behind them are still populated, so a
 * match still starts on top of the last one's data. A process is the smallest
 * unit that actually owns its own `bitecs` globals.
 *
 * ## What that buys, besides being right
 *
 * Independent matches parallelise, and a thirty-match baseline was a quarter
 * of an hour of one core on a machine with four. Same work, same results, a
 * quarter of the wall clock.
 *
 * Each worker re-parses the *same* argv this process was given, so `--set`
 * overrides are applied inside every worker rather than inherited — constants
 * are per-process, and a batch whose overrides only existed in the parent
 * would report a "before" as an "after".
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { availableParallelism, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import type { MatchTelemetryResult } from './telemetry.ts';

/** Flags the parent owns; a worker is told its own seed and where to write. */
const PARENT_ONLY = new Set(['--matches', '--seed', '--out', '--jobs']);

function workerArgv(argv: string[]): string[] {
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (PARENT_ONLY.has(argv[i]!)) {
      i++;
      continue;
    }
    rest.push(argv[i]!);
  }
  return rest;
}

/**
 * Run `matches` matches on consecutive seeds, one process each, and return
 * their results in seed order.
 *
 * `jobs` processes run at once. More than one per core only adds contention:
 * a match is pure computation with no IO to overlap.
 */
export async function runBatchIsolated(
  argv: string[],
  seed: number,
  matches: number,
  jobs = availableParallelism()
): Promise<MatchTelemetryResult[]> {
  const entry = fileURLToPath(new URL('./cli.ts', import.meta.url));
  const scratch = mkdtempSync(join(tmpdir(), 'balance-batch-'));
  const forwarded = workerArgv(argv);
  const results = new Array<MatchTelemetryResult | undefined>(matches);
  const width = Math.max(1, Math.min(jobs, matches));

  let next = 0;
  let failure: Error | null = null;

  const run = (index: number): Promise<void> =>
    new Promise((resolve, reject) => {
      const out = join(scratch, `match-${index}.json`);
      const child = spawn(
        process.execPath,
        [
          '--import',
          'tsx',
          entry,
          ...forwarded,
          '--matches',
          '1',
          '--seed',
          String(seed + index),
          '--worker-out',
          out,
        ],
        // stdout discarded: a worker has nothing to print, and its stderr is
        // the harness's own progress, which stays useful interleaved.
        { stdio: ['ignore', 'ignore', 'inherit'] }
      );
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`match ${index} (seed ${seed + index}) exited ${code}`));
          return;
        }
        // A clean exit that wrote nothing is a worker that took some other
        // path through the CLI — `--help` forwarded into the batch, say. It
        // has to reject here rather than throw out of an event handler, where
        // nothing is waiting to catch it and the batch would hang instead.
        try {
          results[index] = JSON.parse(readFileSync(out, 'utf8')) as MatchTelemetryResult;
        } catch {
          reject(new Error(`match ${index} (seed ${seed + index}) wrote no result`));
          return;
        }
        resolve();
      });
    });

  const worker = async (): Promise<void> => {
    while (failure === null) {
      const index = next++;
      if (index >= matches) return;
      try {
        await run(index);
      } catch (err) {
        failure = err instanceof Error ? err : new Error(String(err));
      }
    }
  };

  try {
    await Promise.all(Array.from({ length: width }, worker));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  if (failure !== null) throw failure;
  // Non-null by construction: every index below `matches` is claimed exactly
  // once, and a worker that fails sets `failure` and is rethrown above.
  return results as MatchTelemetryResult[];
}
