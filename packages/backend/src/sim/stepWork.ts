/**
 * Counted work on the 60 Hz path.
 *
 * The Echo pass has had a counted budget since #90 — `contactPathWalksLastPass`
 * counts path integrals, and `match.test.ts` asserts against it. The reasoning
 * there applies unchanged here, and the comment on that test is worth reading
 * before adding to this file: a maximum of a wall-clock sample is the noisiest
 * statistic available on a shared runner. The same scenario, run three times in
 * one process, spread eightfold and failed CI once on the spread alone. A
 * counter is a property of the algorithm rather than of the machine, so it is
 * identical everywhere and fails only when the work really changed.
 *
 * The 60 Hz step had no such counter. The only assertion covering it as a whole
 * was a wall-clock one — 200 hulls, under 8 ms a tick — which is exactly the
 * pattern that failed. It cannot distinguish a busy runner from a broadphase
 * that quietly stopped pruning, and the failure it is meant to catch is the
 * second one.
 *
 * What is counted is what *scales*: the pair tests and cell probes that grow
 * with the number of hulls on the map. Everything else in the step is a linear
 * walk over entities that exist, and a linear walk does not become a budget
 * problem without someone noticing.
 *
 * These are instrumentation, not simulation state. They are deterministic — the
 * same match replays the same counts — but they are derived from work rather
 * than being work, so `hashWorld` does not read them, for the same reason it
 * does not read `world.paths`.
 */

export interface StepWork {
  /**
   * Cells the separation broadphase probed, across both its grids.
   *
   * The cheap half, and the half that betrays a grid whose cell size has
   * drifted away from the radii it is queried at: too small and a query walks a
   * rectangle of empty water, too large and every probe hands back the whole
   * map. Neither shows up in the pair count, because both still prune.
   */
  separationCells: number;
  /**
   * Distance tests separation performed on candidate pairs — hull against hull
   * and hull against footprint.
   *
   * The number the grid exists to hold down. All-pairs at a four-seat
   * late-game match's 200 hulls is 19,900 hull pairs a tick before the
   * structures are counted, and the whole argument of `separation.ts` is that
   * the broadphase keeps this proportional to crowding rather than to the
   * roster.
   */
  separationPairs: number;
  /**
   * Candidates the combat pass considered while acquiring a target — enemy
   * hulls in the auto-acquire loop, plus inbound ordnance for point defence.
   *
   * Genuinely all-pairs today: every shooter walks every targetable entity, so
   * this rises as the square of the force and is the largest counted number in
   * a crowded step. Counted rather than fixed because a budget is how a future
   * broadphase here gets to prove it worked.
   */
  acquisitionPairs: number;
}

export function newStepWork(): StepWork {
  return { separationCells: 0, separationPairs: 0, acquisitionPairs: 0 };
}

/** Zero every field in place. Called at the top of each fixed step. */
export function resetStepWork(work: StepWork): void {
  work.separationCells = 0;
  work.separationPairs = 0;
  work.acquisitionPairs = 0;
}

/** Raise every field of `worst` to `sample`'s, field by field. */
export function accumulateWorst(worst: StepWork, sample: StepWork): void {
  if (sample.separationCells > worst.separationCells)
    worst.separationCells = sample.separationCells;
  if (sample.separationPairs > worst.separationPairs)
    worst.separationPairs = sample.separationPairs;
  if (sample.acquisitionPairs > worst.acquisitionPairs) {
    worst.acquisitionPairs = sample.acquisitionPairs;
  }
}
