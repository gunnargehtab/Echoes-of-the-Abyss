/**
 * Echo Marks — the acoustic residue layer, docs/systems-echo.md §7.
 *
 * "Sound persists. High-SIG events leave Echo Marks on the terrain layer:
 * faint, decaying acoustic residue readable by any unit with HYD >= 40."
 *
 * What this mechanic is for, in the doc's own words: **"This is the scouting
 * economy. A skilled player doesn't scout to find the enemy army — they scout
 * to find *where the enemy has been*, and infer everything else."**
 *
 * Two design rules follow from that, and both are load-bearing:
 *
 * 1. **A mark says something happened, never what or to whom.** The wire
 *    format carries a position, a kind and an intensity — no owner, no
 *    casualty list. A scout finding a battle site learns that this water was
 *    recently violent, and has to work out the rest.
 * 2. **A mark is priced by the same propagation model as a unit.** It is an
 *    emitter whose SIG is its intensity times a per-kind figure, so residue in
 *    a Thermal Vein is as hard to find as a hull in one. Anything else would
 *    make the past a second detection system that biomes did not apply to.
 *
 * The HYD >= 40 gate is a *server* gate. A mark is resolved per listener and
 * only the result crosses the wire, exactly like a contact — a client that
 * receives residue its units could not hear is a maphack with extra steps.
 */

import {
  ECHO_MARKS,
  EchoMarkKind,
  MAX_PROPAGATION_FACTOR,
  PERSISTENCE,
  detectionRatio,
  maxAudibleRangeM,
} from '@echoes/shared';
import { SpatialHash } from './spatialHash.ts';
import type { Terrain } from './terrain.ts';

/** SIG a mark of each kind radiates at full intensity. */
const SIG_BY_KIND: Record<EchoMarkKind, number> = {
  [EchoMarkKind.Battle]: ECHO_MARKS.BATTLE_SIG,
  [EchoMarkKind.DestroyedStructure]: ECHO_MARKS.DESTROYED_STRUCTURE_SIG,
  [EchoMarkKind.IndustrialHum]: ECHO_MARKS.HUM_SIG,
  [EchoMarkKind.TorpedoWake]: ECHO_MARKS.TORPEDO_WAKE_SIG,
};

/**
 * How fast intensity bleeds away, as an exponential time constant in seconds.
 *
 * A third of the mark's lifetime, so a mark left alone is down to about 5% of
 * its level by the time it expires — a tail, not a cliff. For the hum this is
 * also what makes docs/economy.md §5's counter-play real: throttling down
 * drops the delivery rate, and the level follows it within a couple of time
 * constants, which is the "throttling to Trickle for 40 s collapses the hum"
 * the doc promises.
 */
function tauFor(kind: EchoMarkKind): number {
  return LIFETIME_BY_KIND[kind] / 3;
}

/** Full lifetime of each kind, seconds. The spec'd numbers, in one place. */
const LIFETIME_BY_KIND: Record<EchoMarkKind, number> = {
  [EchoMarkKind.Battle]: PERSISTENCE.BATTLE_SITE_S,
  [EchoMarkKind.DestroyedStructure]: PERSISTENCE.DESTROYED_STRUCTURE_S,
  [EchoMarkKind.IndustrialHum]: ECHO_MARKS.HUM_DECAY_S,
  [EchoMarkKind.TorpedoWake]: PERSISTENCE.TORPEDO_WAKE_S,
};

export interface Mark {
  x: number;
  y: number;
  kind: EchoMarkKind;
  /**
   * 0-1. Scales the mark's SIG, and what the client draws.
   *
   * A level, not a countdown. Events add to it and time bleeds it away, so for
   * the industrial hum it settles at whatever the delivery rate sustains —
   * which is the whole of docs/economy.md §5's "hum intensity scales with
   * throughput".
   */
  intensity: number;
  /**
   * Seconds left before it is gone, reset in full every time the mark is
   * reinforced.
   *
   * Deliberately **not** scaled by intensity, which is the bug this replaces.
   * When life was `lifetime x intensity`, one delivery at 0.12 bought 5.4
   * seconds against a forty-second round trip: the hum blinked on for five
   * seconds every half-minute and was absent the rest of the time, so a scout
   * sweeping a working depot heard nothing four times in five. How loud a mark
   * is and how long it exists are different questions.
   */
  remainingS: number;
  /**
   * Stable id, so a client can track one mark decaying rather than seeing a
   * new mark every tick. Per-match, and it says nothing about entities.
   */
  id: number;
}

export class EchoMarkLayer {
  private readonly marks: Mark[] = [];
  private readonly hash = new SpatialHash(600);
  private readonly queryBuffer: number[] = [];
  private nextId = 1;
  /**
   * Path integrals performed since the counter was last reset.
   *
   * The expensive part of the read, and the only part that scales with both
   * marks and listeners. Counted rather than timed because a wall-clock
   * worst-case is a property of the machine — one GC pause poisons it — while
   * this is a property of the algorithm, and the algorithm is what a test can
   * hold still.
   */
  pathWalks = 0;
  /** Rebuilt only when the mark set actually changed. */
  private hashDirty = true;

  get count(): number {
    return this.marks.length;
  }

  /** Live marks, for tests and for the renderer's server-side counterpart. */
  get all(): readonly Mark[] {
    return this.marks;
  }

  /**
   * Leave residue, or reinforce residue already there.
   *
   * Merging is not an optimisation. A thirty-second fight is one battle site,
   * not four hundred overlapping ones — and without merging the industrial hum
   * would lay down a fresh mark on every single delivered cargo.
   */
  add(kind: EchoMarkKind, x: number, y: number, intensity = 1): void {
    const lifetime = LIFETIME_BY_KIND[kind];
    const existing = this.nearby(kind, x, y);
    if (existing !== undefined) {
      // Reinforced marks pull toward the new event rather than jumping to it:
      // a running battle should leave residue over the ground it covered, not
      // teleport its mark to wherever the last shot landed.
      const weight = intensity / (existing.intensity + intensity);
      existing.x += (x - existing.x) * weight;
      existing.y += (y - existing.y) * weight;
      existing.intensity = Math.min(1, existing.intensity + intensity);
      // A fresh full window, not a window scaled by intensity. See the note on
      // `remainingS` in the Mark interface: how loud a mark is and how long it
      // exists are different questions, and tying them together is what made a
      // working economy inaudible four seconds in five.
      existing.remainingS = lifetime;
      return;
    }

    if (this.marks.length >= ECHO_MARKS.MAX_MARKS) {
      // Drop the faintest rather than refusing the new one: the newest event
      // is the one a scout is most likely to be looking for, and the cap only
      // ever bites in a match pathological enough that the faintest mark is
      // already noise.
      let weakest = 0;
      for (let i = 1; i < this.marks.length; i++) {
        if (this.marks[i]!.intensity < this.marks[weakest]!.intensity) weakest = i;
      }
      this.marks.splice(weakest, 1);
    }

    this.marks.push({
      x,
      y,
      kind,
      intensity: Math.min(1, intensity),
      remainingS: lifetime,
      id: this.nextId++,
    });
    this.hashDirty = true;
  }

  private nearby(kind: EchoMarkKind, x: number, y: number): Mark | undefined {
    let best: Mark | undefined;
    let bestD2 = ECHO_MARKS.MERGE_RADIUS_M * ECHO_MARKS.MERGE_RADIUS_M;
    for (const mark of this.marks) {
      if (mark.kind !== kind) continue;
      const d2 = (mark.x - x) ** 2 + (mark.y - y) ** 2;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = mark;
      }
    }
    return best;
  }

  /**
   * Age every mark. Called on the fixed step, so decay is frame-rate
   * independent like everything else in the simulation.
   */
  tick(dt: number): void {
    if (this.marks.length === 0) return;
    let write = 0;
    for (let read = 0; read < this.marks.length; read++) {
      const mark = this.marks[read]!;
      mark.remainingS -= dt;
      if (mark.remainingS <= 0) continue;
      // Intensity decays on its own clock, exponentially, so a mark audibly
      // *fades* rather than holding steady and then vanishing
      // (docs/audio-direction.md §6 makes marks reverb tails, and a tail that
      // cuts off is not a tail).
      //
      // Exponential rather than linear because the hum is a measurement of a
      // *rate*: this is a leaky integrator, deliveries push it up and time
      // bleeds it down, and its resting level is throughput. That is what
      // docs/economy.md §5 asks for when it says a listener can "estimate
      // income within roughly ±20% without ever seeing a structure".
      mark.intensity *= Math.exp(-dt / tauFor(mark.kind));
      if (mark.intensity < ECHO_MARKS.MIN_AUDIBLE_INTENSITY) continue;
      this.marks[write++] = mark;
    }
    if (write !== this.marks.length) {
      this.marks.length = write;
      this.hashDirty = true;
    }
  }

  /** Index the marks. Cheap, and skipped entirely when nothing moved. */
  private reindex(): void {
    if (!this.hashDirty) return;
    this.hash.clear();
    for (let i = 0; i < this.marks.length; i++) {
      this.hash.insert(i, this.marks[i]!.x, this.marks[i]!.y);
    }
    this.hashDirty = false;
  }

  /**
   * Can a listener at (x, y) with this HYD read this mark?
   *
   * The one place the audibility rule lives, so the per-listener helper below
   * and the Echo pass's mark-major loop cannot drift apart about what "heard"
   * means.
   */
  audible(terrain: Terrain, mark: Mark, x: number, y: number, hyd: number): boolean {
    // The gate, and it is absolute: below it a listener perceives nothing at
    // any range. HYD is otherwise a soft stat, so this is the one place it is
    // a wall — which is what makes it worth building for.
    if (hyd < PERSISTENCE.ECHO_MARK_MIN_HYD) return false;

    const sig = SIG_BY_KIND[mark.kind] * mark.intensity;
    if (sig <= 0) return false;
    const distance = Math.hypot(mark.x - x, mark.y - y);

    // Prune before the path walk, exactly as the contact pass does (#90). The
    // best any terrain could do is MAX_PROPAGATION_FACTOR, so a mark inaudible
    // even at that is inaudible full stop — and the walk is by far the most
    // expensive thing in here.
    if (detectionRatio(sig, MAX_PROPAGATION_FACTOR, distance, hyd) < 1) return false;

    // The same propagation model as a live emitter, path integral included.
    // Residue behind a kelp bed is as hard to find as a hull behind one.
    this.pathWalks++;
    const pf = terrain.pathPropagation(mark.x, mark.y, x, y);
    return detectionRatio(sig, pf, distance, hyd) >= 1;
  }

  /**
   * The loudest a mark of this kind could possibly be heard from, given the
   * best ears in the match. Used to size the broadphase around a mark.
   */
  audibleRadiusM(mark: Mark, bestHyd: number): number {
    const sig = SIG_BY_KIND[mark.kind] * mark.intensity;
    if (sig <= 0) return 0;
    return maxAudibleRangeM(sig, MAX_PROPAGATION_FACTOR, bestHyd);
  }

  /**
   * Which marks a listener at (x, y) with this HYD can read.
   *
   * Results are pushed into `out` as mark indices. The spatial hash is what
   * keeps this O(marks near the listener) rather than O(marks x listeners) —
   * the residue read happens inside the Echo Layer's 2 ms budget, which is
   * already the tightest thing in the simulation.
   */
  readableBy(
    terrain: Terrain,
    x: number,
    y: number,
    hyd: number,
    radiusM: number,
    out: number[],
    skipIds?: ReadonlySet<number>
  ): void {
    // The gate, and it is absolute: below it a listener perceives nothing at
    // any range. HYD is otherwise a soft stat, so this is the one place it is
    // a wall — which is what makes it worth building for.
    if (hyd < PERSISTENCE.ECHO_MARK_MIN_HYD) return;
    if (this.marks.length === 0) return;

    this.reindex();
    const candidates = this.hash.queryRadius(x, y, radiusM, this.queryBuffer);
    for (let i = 0; i < candidates.length; i++) {
      const index = candidates[i]!;
      const mark = this.marks[index];
      if (mark === undefined) continue;
      if (skipIds !== undefined && skipIds.has(mark.id)) continue;
      if (this.audible(terrain, mark, x, y, hyd)) out.push(index);
    }
  }

  /** Clear everything — match reset. */
  clear(): void {
    this.marks.length = 0;
    this.hashDirty = true;
  }
}

export { SIG_BY_KIND as ECHO_MARK_SIG };
