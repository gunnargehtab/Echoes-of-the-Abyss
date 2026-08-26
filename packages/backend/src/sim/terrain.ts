/**
 * Terrain biome grid.
 *
 * Terrain matters here for one reason above all others: it sets the
 * PropagationFactor, so the same army is a different army in a different biome
 * (docs/systems-echo.md §3). This is the map doing the work.
 *
 * Detection integrates PF along the emitter-to-listener path
 * (pathPropagation, issue #37): a unit gains cover from a kelp bed it is
 * hiding *behind*, and the Abyssal Trench carries sound far down its axis —
 * an along-path route accumulates PF 1.6 the whole way, while a crossing
 * only picks it up for the trench's width.
 *
 * The thermocline is *not* in this grid, and deliberately so. Its "0.3 across
 * / 1.2 along" (docs/systems-echo.md §3) is anisotropic in **depth**, not in
 * bearing: it depends on which side of 1,200 m each end of the path is on,
 * which is a property of the pair rather than of any cell the path crosses.
 * It is applied as a multiplier on this walk's result, in the Echo pass and
 * in the mark layer, where both depths are in hand.
 */

import { Biome, DEPTH, MAX_PROPAGATION_FACTOR, PROPAGATION_FACTOR } from '@echoes/shared';

/**
 * One cell whose water column changed after the match began.
 *
 * Cells rather than rectangles, deliberately. A rect delta would make the
 * client redo the metres-to-cells arithmetic and agree with the server about
 * every `Math.floor`; cells are what actually changed, and there is nothing
 * left to disagree about.
 */
export interface TerrainCellChange {
  index: number;
  floorM: number;
  ceilingM: number;
}

/**
 * Ground that admits nothing at any depth — how solid rock is spelled.
 *
 * `admits` asks for a depth between the ceiling and the floor, so a ceiling
 * *below* the floor leaves an empty interval. Named rather than written out at
 * the call site because `{ floorM: 0, ceilingM: 1 }` reads like a mistake.
 */
export const SOLID = { floorM: 0, ceilingM: 1 } as const;

export class Terrain {
  readonly widthM: number;
  readonly heightM: number;
  readonly cellM: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly biomes: Uint8Array;
  /**
   * PF per cell, maintained alongside `biomes`. The Echo pass walks tens of
   * thousands of path samples per tick; a flat Float32Array read is the
   * difference between that walk fitting the 2 ms budget and not.
   */
  private readonly pf: Float32Array;
  /**
   * The water column, per cell: how deep the water goes and what is above it
   * (docs/systems-depth.md §1). Integer metres, so a comparison against a band
   * boundary is exact rather than nearly so.
   *
   * Two arrays rather than one seabed depth because a single number draws a
   * tunnel as an open ditch. `ceiling` is 0 almost everywhere — open water from
   * the surface down — and non-zero only for a roofed passage.
   *
   * Uint16 caps a map at 65,535 m, which is twenty times the deepest water the
   * ruleset will currently order a hull into.
   */
  private readonly floor: Uint16Array;
  private readonly ceiling: Uint16Array;
  /**
   * Every cell write since the baseline, in order — the ground's own history.
   *
   * Kept because two consumers need to know what changed rather than what the
   * grid now holds: the wire, which sent every client a full grid once and can
   * only send the difference after that, and `hashWorld`, which would
   * otherwise let a replay diverge on ground alone while every entity agreed.
   *
   * Reset by `markBaseline` when the match starts, so this holds mid-match
   * change and never the map's own construction — the join payload already
   * carries that, serialised from the live arrays.
   *
   * It grows without bound, and that is a deliberate bet rather than an
   * oversight: ground is authored by mission beats, and a beat fires once. A
   * future system that rewrote ground on a cadence — a tide, a collapsing
   * biome — would need this compacted, and would notice, because the client's
   * cursor is an index into exactly this list.
   */
  private changes: TerrainCellChange[] = [];

  /**
   * `floorM` is the seabed the whole map starts at, before any region carves
   * into it. An options object rather than a fourth positional number: the two
   * are both depths in metres and would be silently interchangeable.
   */
  constructor(widthM: number, heightM: number, cellM: number, options: { floorM?: number } = {}) {
    this.widthM = widthM;
    this.heightM = heightM;
    this.cellM = cellM;
    this.cols = Math.ceil(widthM / cellM);
    this.rows = Math.ceil(heightM / cellM);
    this.biomes = new Uint8Array(this.cols * this.rows).fill(Biome.OpenWater);
    this.pf = new Float32Array(this.cols * this.rows).fill(PROPAGATION_FACTOR[Biome.OpenWater]);
    // Defaults to the ruleset's deepest orderable depth, which is exactly the
    // flat 3,000 m every map had before floors existed. A map that authors
    // nothing therefore behaves as it always did.
    this.floor = new Uint16Array(this.cols * this.rows).fill(options.floorM ?? DEPTH.MAX_M);
    this.ceiling = new Uint16Array(this.cols * this.rows);
  }

  /**
   * Clamp a horizontal coordinate onto the map.
   *
   * The one bounds authority. Position is written by movement, separation and
   * hazard knockback, and only movement was ever bounded — by accident, in
   * that it steers toward a target rather than displacing. Knockback and
   * separation both push a hull along an axis they did not choose, which at
   * the map edge pushed it off the map entirely: still simulated, still
   * audible, and unreachable by an order the player could give.
   *
   * Terrain owns this because Terrain owns widthM/heightM, and every system
   * that writes a position already holds the world's terrain.
   */
  clampXM(x: number): number {
    return x < 0 ? 0 : x > this.widthM ? this.widthM : x;
  }

  clampYM(y: number): number {
    return y < 0 ? 0 : y > this.heightM ? this.heightM : y;
  }

  private index(x: number, y: number): number {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cellM)));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellM)));
    return cy * this.cols + cx;
  }

  biomeAt(x: number, y: number): Biome {
    return this.biomes[this.index(x, y)] as Biome;
  }

  /**
   * PropagationFactor at a point, hazards included.
   *
   * Reads the `pf` array rather than deriving from the biome, so it agrees
   * with `pathPropagation` — which has always read `pf`. While nothing wrote
   * that array except `fillRect` the two were identical; the moment a hazard
   * could modify PF they diverged, and a Resonance Storm was invisible to
   * every caller of this method while being fully visible to detection.
   */
  propagationAt(x: number, y: number): number {
    return this.pf[this.index(x, y)]!;
  }

  /** How deep the water goes here, in metres. */
  floorAt(x: number, y: number): number {
    return this.floor[this.index(x, y)]!;
  }

  /** Rock above the water here, in metres. 0 is open to the surface. */
  ceilingAt(x: number, y: number): number {
    return this.ceiling[this.index(x, y)]!;
  }

  /**
   * Does the ground here admit a hull at this depth?
   *
   * **The only question gameplay should ask of the water column.** Callers that
   * reach for `floorAt` directly bake in the assumption that water runs from
   * the surface to the seabed, which is exactly the assumption a tunnel breaks
   * — and it is the assumption that would have to be found and unpicked in
   * every call site the day roofed ground is authored. Ask this instead and the
   * ceiling costs nothing to add.
   *
   * Ground with its ceiling below its floor admits nothing at any depth, which
   * is how solid rock is spelled (docs/systems-depth.md §1).
   */
  admits(x: number, y: number, depthM: number): boolean {
    const index = this.index(x, y);
    return depthM >= this.ceiling[index]! && depthM <= this.floor[index]!;
  }

  /**
   * Where a hull at `depthM` actually ends up when it tries to move from
   * (fromX, fromY) to (toX, toY).
   *
   * Ground stops a step; it does not stop a hull. A move refused outright
   * would pin a fleet against every ridge it grazed, so a blocked step is
   * retried on each axis alone and the hull slides along the obstacle instead
   * — which is also what the map edge has wanted since the bounds clamp
   * landed, and what separation's structure pass left as this issue's problem.
   *
   * The axes are tried in a fixed order, so this is a pure function of its
   * arguments and the map. It has no opinion about *which* way is better,
   * because an opinion would need a tie-break, and a tie-break is where
   * determinism goes to die in this codebase.
   */
  resolveStep(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    depthM: number,
    out: { x: number; y: number }
  ): void {
    const x = this.clampXM(toX);
    const y = this.clampYM(toY);
    // Written into a caller-owned scratch rather than returned: this runs once
    // per moving hull per 60 Hz tick, and a fresh object each time is garbage
    // the tick budget should not be generating.
    if (this.admits(x, y, depthM)) {
      out.x = x;
      out.y = y;
    } else if (this.admits(x, fromY, depthM)) {
      out.x = x;
      out.y = fromY;
    } else if (this.admits(fromX, y, depthM)) {
      out.x = fromX;
      out.y = y;
    } else if (!this.admits(fromX, fromY, depthM)) {
      // Ground stops a hull entering; it does not hold one that is already
      // inside. That distinction only started mattering when ground became
      // writable mid-match (#197): a span that closes over a hull would
      // otherwise entomb it for the rest of the match, because every branch
      // above tests the *destination* and a hull in rock has no admitting
      // neighbour to step to. It cannot be walked deeper into rock from
      // outside, because reaching this branch at all requires already being in
      // it, and the cheap `admits` is only paid on a step that was blocked.
      out.x = x;
      out.y = y;
    } else {
      out.x = fromX;
      out.y = fromY;
    }
  }

  /**
   * Mean PropagationFactor along the segment from (x0,y0) to (x1,y1) —
   * the path integral the Echo Layer prices sound with (issue #37).
   *
   * Midpoint Riemann sum over sub-segments no longer than a grid cell:
   * every cell the path crosses contributes in proportion to the length
   * crossed, so masking is cumulative (a thin kelp band buys a little
   * cover, a deep one buys a lot) rather than best/worst-case. Degenerate
   * paths (same cell, zero length) reduce exactly to propagationAt.
   *
   * `abortBelow`: when the caller only cares whether the mean reaches a
   * bar (the Echo pass knows the exact PF a pair needs to be audible), the
   * walk stops as soon as even all-trench water for the remaining samples
   * could not lift the mean that high. The return value is then some value
   * below the bar, not the true mean — callers comparing against the bar
   * see the same decision either way.
   */
  pathPropagation(x0: number, y0: number, x1: number, y1: number, abortBelow = 0): number {
    const distance = Math.hypot(x1 - x0, y1 - y0);
    const samples = Math.max(1, Math.ceil(distance / this.cellM));
    // Hoisted to locals: this walk runs tens of thousands of times per Echo
    // tick, and property/record lookups in the loop are what it cannot afford.
    const { cols, rows, cellM, pf } = this;
    const maxCx = cols - 1;
    const maxCy = rows - 1;
    const sx = (x1 - x0) / samples;
    const sy = (y1 - y0) / samples;
    let px = x0 + sx * 0.5;
    let py = y0 + sy * 0.5;
    const abortSum = abortBelow * samples;
    let headroom = MAX_PROPAGATION_FACTOR * samples;
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      let cx = (px / cellM) | 0;
      let cy = (py / cellM) | 0;
      if (cx < 0) cx = 0;
      else if (cx > maxCx) cx = maxCx;
      if (cy < 0) cy = 0;
      else if (cy > maxCy) cy = maxCy;
      sum += pf[cy * cols + cx]!;
      headroom -= MAX_PROPAGATION_FACTOR;
      // Even all-trench water for the rest cannot reach the caller's bar.
      if (sum + headroom < abortSum) return (sum + headroom) / samples;
      px += sx;
      py += sy;
    }
    return sum / samples;
  }

  /** Paint an axis-aligned rectangle of biome, in world metres. */
  fillRect(x: number, y: number, w: number, h: number, biome: Biome): void {
    const x0 = Math.max(0, Math.floor(x / this.cellM));
    const y0 = Math.max(0, Math.floor(y / this.cellM));
    const x1 = Math.min(this.cols - 1, Math.floor((x + w) / this.cellM));
    const y1 = Math.min(this.rows - 1, Math.floor((y + h) / this.cellM));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        this.biomes[cy * this.cols + cx] = biome;
        this.pf[cy * this.cols + cx] = PROPAGATION_FACTOR[biome];
      }
    }
  }

  /**
   * Shape the water column over an axis-aligned rectangle, in world metres.
   *
   * Separate from `fillRect` because biome and ground are independent: a kelp
   * bed is kelp whether it stands on a plateau or in a trench, and a tunnel is
   * cut through whatever biome it passes under. Painting them together would
   * force an author to restate one every time the other changed.
   *
   * Painted in call order, later over earlier, exactly like `fillRect` — which
   * is what lets a tunnel be authored as a narrow strip laid across a plateau
   * rather than as four rectangles around it.
   */
  fillGround(
    x: number,
    y: number,
    w: number,
    h: number,
    ground: { floorM?: number; ceilingM?: number }
  ): void {
    if (ground.floorM === undefined && ground.ceilingM === undefined) return;
    const x0 = Math.max(0, Math.floor(x / this.cellM));
    const y0 = Math.max(0, Math.floor(y / this.cellM));
    const x1 = Math.min(this.cols - 1, Math.floor((x + w) / this.cellM));
    const y1 = Math.min(this.rows - 1, Math.floor((y + h) / this.cellM));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const index = cy * this.cols + cx;
        const beforeFloor = this.floor[index]!;
        const beforeCeiling = this.ceiling[index]!;
        if (ground.floorM !== undefined) this.floor[index] = ground.floorM;
        if (ground.ceilingM !== undefined) this.ceiling[index] = ground.ceilingM;
        // Recorded only when the cell actually moved. A mission that repaints
        // ground it has already painted — Sorrowgate re-cuts the service lock
        // straight after collapsing the span across it — should cost the wire
        // nothing for the cells that did not change.
        if (this.floor[index] !== beforeFloor || this.ceiling[index] !== beforeCeiling) {
          this.changes.push({
            index,
            floorM: this.floor[index]!,
            ceilingM: this.ceiling[index]!,
          });
        }
      }
    }
  }

  /**
   * Apply the PropagationFactor modifiers currently in force.
   *
   * The issue that asked for this put it well: "a hazard that changes PF is a
   * write to that array, not a new code path". The Echo Layer already reads a
   * per-cell PF array on every path integral, so a Resonance Storm degrading
   * resolution inside its area needs nothing new in detection at all — biome
   * and hazard compose for free.
   *
   * **Recomputed from the biome, never inverted.** Every cell is reset to its
   * biome's baseline and then multiplied by each modifier covering it. That
   * matters more than it looks: an "undo" that divided by the multiplier would
   * accumulate float error over a long match and would give the wrong answer
   * outright when two hazards overlapped the same cell. Recomputing is exact,
   * order-independent, and cannot drift.
   *
   * Clamped to MAX_PROPAGATION_FACTOR because the Echo pass sizes its
   * broadphase from that ceiling: a hazard that pushed PF past it would make
   * units audible beyond the radius the pass is willing to search for them,
   * which reads as detection silently failing.
   *
   * The clamp bounds a **cell**, which is not the same number as the bound on
   * a **pair**: the thermocline multiplies this walk's result afterwards, so
   * the broadphase's ceiling is MAX_PATH_PROPAGATION_FACTOR, not this one.
   * Keep them distinct — collapsing them would either shrink the duct's reach
   * or let a hazard write cells the walk's headroom early-out assumes cannot
   * exist. (It is also why a doc'd Standing Wave at PF 2.0 would be truncated
   * here rather than carried: that would be a change to this ceiling.)
   */
  applyPropagationModifiers(
    mods: readonly { x: number; y: number; radiusM: number; scale: number }[]
  ): void {
    for (let cy = 0; cy < this.rows; cy++) {
      const wy = (cy + 0.5) * this.cellM;
      for (let cx = 0; cx < this.cols; cx++) {
        const index = cy * this.cols + cx;
        let value = PROPAGATION_FACTOR[this.biomes[index] as Biome];
        if (mods.length > 0) {
          const wx = (cx + 0.5) * this.cellM;
          for (let m = 0; m < mods.length; m++) {
            const mod = mods[m]!;
            const dx = wx - mod.x;
            const dy = wy - mod.y;
            if (dx * dx + dy * dy <= mod.radiusM * mod.radiusM) value *= mod.scale;
          }
        }
        this.pf[index] = Math.min(value, MAX_PROPAGATION_FACTOR);
      }
    }
  }

  /**
   * How many cell writes this ground has taken since the baseline.
   *
   * Doubles as the client's cursor: a client holding revision *n* has seen the
   * first *n* changes, and `changesSince(n)` is exactly what it is missing.
   */
  get revision(): number {
    return this.changes.length;
  }

  /**
   * Forget the construction history. Called once, when the match takes the
   * terrain, so "changed" means "changed during play".
   */
  markBaseline(): void {
    this.changes = [];
  }

  /** The cell writes a client at `revision` has not seen. */
  changesSince(revision: number): TerrainCellChange[] {
    return this.changes.slice(Math.max(0, revision));
  }

  /**
   * Every write since the baseline, without copying. For the state hash, which
   * runs at every checkpoint and wants to read the list rather than own one.
   */
  get groundHistory(): readonly TerrainCellChange[] {
    return this.changes;
  }

  /** Flat copy of the grid, for shipping to the client. Terrain is public. */
  serialize(): {
    cols: number;
    rows: number;
    cellM: number;
    biomes: number[];
    floor: number[];
    ceiling: number[];
  } {
    return {
      cols: this.cols,
      rows: this.rows,
      cellM: this.cellM,
      biomes: Array.from(this.biomes),
      floor: Array.from(this.floor),
      ceiling: Array.from(this.ceiling),
    };
  }

  /**
   * **Test fixture.** Not a playable map.
   *
   * The scratch grid every match ran on before `sim/maps/` existed, kept
   * because a good deal of the test suite is written against its geometry and
   * because a hand-built grid is sometimes exactly what a test wants — one
   * whose PF landscape is not also under test.
   *
   * Playable maps live in `sim/maps/` and are selected by id. This is not one
   * of them: it has no spawns, no resource fields and no hazards, and nothing
   * outside tests should reach for it.
   *
   * Deliberately hand-placed rather than generated — an RTS simulation must be
   * reproducible, and a seeded generator is one refactor away from not being.
   */
  static demo(): Terrain {
    const t = new Terrain(8000, 8000, 250);
    // Thermal vents across the middle: ambush terrain, PF 0.45.
    t.fillRect(0, 3600, 8000, 800, Biome.ThermalVein);
    // Kelp on the west flank: the quiet approach, PF 0.55.
    t.fillRect(0, 0, 2200, 3600, Biome.KelpForest);
    // A trench running north-south: PF 1.6, no secrets down here.
    t.fillRect(3800, 0, 500, 8000, Biome.AbyssalTrench);
    // Resonance field east: bearings lie, PF 0.7 scattered.
    t.fillRect(5800, 4600, 2200, 2400, Biome.ResonanceField);
    // Coral ruins south-west: hard acoustic shadows, PF 0.8.
    t.fillRect(800, 5200, 1800, 1600, Biome.CoralRuins);
    return t;
  }
}
