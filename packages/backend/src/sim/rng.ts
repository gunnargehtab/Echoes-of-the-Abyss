/**
 * The simulation's only source of randomness.
 *
 * An RTS that cannot reproduce a match cannot be debugged from a report,
 * balanced from a recording, or trusted to agree with itself — and
 * determinism that is not tested is determinism that is one PR away from
 * being silently lost. `Terrain.demo()` already argues this case for map
 * generation; this module extends it to everything else.
 *
 * Nothing in `sim/` may call `Math.random()` (enforced by lint, see
 * `.eslintrc.cjs`). Draw from `world.rng` instead, which is seeded per match
 * and advances as part of simulation state.
 *
 * The generator is mulberry32: 32 bits of state, one multiply-xorshift round,
 * and a well-characterised period of 2^32. It is not cryptographic and is not
 * trying to be — what it must be is *identical everywhere*, which is why the
 * arithmetic is written in explicit `Math.imul` / `>>> 0` form rather than
 * left to the engine's number tower.
 */

export class Rng {
  private state: number;
  readonly seed: number;
  /**
   * Sub-streams handed out by `fork`, by key.
   *
   * Held rather than discarded because a fork's position is simulation state
   * like the root's is, and state nothing holds is state no fingerprint can
   * read — `hashWorld` walks this map, and a stream that existed only for the
   * duration of the call that made it would be invisible to it.
   */
  private readonly derived = new Map<string, Rng>();

  constructor(seed: number) {
    // Force an unsigned 32-bit seed so a caller passing a negative or
    // fractional value still gets a reproducible stream rather than NaN soup.
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [0, bound). Returns 0 for a non-positive bound. */
  int(bound: number): number {
    if (bound <= 0) return 0;
    return Math.floor(this.next() * bound);
  }

  /** Uniform in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Uniform in [-magnitude, magnitude). Handy for jitter and scatter. */
  jitter(magnitude: number): number {
    return this.range(-magnitude, magnitude);
  }

  /** True with probability `p`. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /**
   * A derived generator, deterministically keyed off this one's seed.
   *
   * For subsystems that want their own stream — so that adding a die roll to
   * fauna does not shift every subsequent hazard roll and invalidate every
   * recorded replay. The key should be a stable string like 'fauna'.
   */
  fork(key: string): Rng {
    // Memoised, and that is not a cache. Re-deriving on every call handed the
    // second caller a stream rewound to the start, so two subsystems sharing a
    // key — or one subsystem forking inside a loop — would draw the identical
    // sequence and neither would look wrong from the call site. One key is one
    // stream for the life of the match.
    const existing = this.derived.get(key);
    if (existing !== undefined) return existing;

    let h = this.seed ^ 0x9e3779b9;
    for (let i = 0; i < key.length; i++) {
      h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
    }
    const stream = new Rng(h >>> 0);
    this.derived.set(key, stream);
    return stream;
  }

  /**
   * Every sub-stream forked off this one, by key. Part of simulation state.
   *
   * Exposed for the state hash rather than for drawing from: a caller that
   * wants a stream asks `fork` for it by name and gets the same one back.
   */
  get streams(): ReadonlyMap<string, Rng> {
    return this.derived;
  }

  /** Current position of the stream. Part of simulation state. */
  snapshot(): number {
    return this.state;
  }

  /** Restore a stream position taken from `snapshot()`. */
  restore(state: number): void {
    this.state = state >>> 0;
  }
}

/**
 * A seed for a match nobody specified one for.
 *
 * Deliberately the one place wall-clock is allowed in: picking a seed is not
 * simulation, it is the thing that makes the simulation reproducible
 * afterwards. Everything downstream of the returned number is deterministic,
 * and the number itself is recorded in the replay.
 */
export function randomSeed(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
}
