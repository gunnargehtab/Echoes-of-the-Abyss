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

import {
  Biome,
  DEPTH,
  MAX_MODIFIED_PROPAGATION_FACTOR,
  MIN_PROPAGATION_FACTOR,
  PROPAGATION_FACTOR,
} from '@echoes/shared';

/**
 * One cell that changed after the match began.
 *
 * Cells rather than rectangles, deliberately. A rect delta would make the
 * client redo the metres-to-cells arithmetic and agree with the server about
 * every `Math.floor`; cells are what actually changed, and there is nothing
 * left to disagree about.
 *
 * The cell's whole state, not the fields that moved. A record that carried
 * only the changed fields would make the client's apply order load-bearing and
 * would need a way to spell "unchanged" that is not a valid depth; a full cell
 * is idempotent, and replaying the log from any cursor lands on the same grid.
 */
export interface TerrainCellChange {
  index: number;
  floorM: number;
  ceilingM: number;
  /**
   * What the water here sounds like, as of this write (#259). Carried on every
   * change rather than only on the writes that move it, because the record is
   * the cell rather than the diff.
   */
  biome: Biome;
}

/**
 * Ground that admits nothing at any depth — how solid rock is spelled.
 *
 * `admits` asks for a depth between the ceiling and the floor, so a ceiling
 * *below* the floor leaves an empty interval. Named rather than written out at
 * the call site because `{ floorM: 0, ceilingM: 1 }` reads like a mistake.
 */
export const SOLID = { floorM: 0, ceilingM: 1 } as const;

/**
 * One area effect on the PF grid. Two kinds, composed in a fixed order
 * however the list is arranged: every `scale` multiplies the biome baseline
 * (Resonance Storms), then every `delta` is added (Tetherjelly fields, whose
 * −0.10 is absolute by design — docs/bestiary.md §4 says why a percentage
 * would be the wrong species). A modifier may carry either or both.
 */
export interface PropagationModifier {
  x: number;
  y: number;
  radiusM: number;
  scale?: number;
  delta?: number;
}

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
   * The loudest cell on the grid right now — the live ceiling every broadphase
   * sizes from, and what `pathPropagation`'s early-out assumes no cell exceeds.
   *
   * A field rather than the static `MAX_PROPAGATION_FACTOR` because of the
   * Standing Wave (#372): a corridor writes PF 2.0, above every biome, and a
   * static ceiling raised to carry it would widen every search in every match
   * for one faction's structure. Tracked here instead, it is the biome ceiling
   * until a corridor stands and the corridor's figure only while one does.
   * Maintained by every writer of `pf`, never read back from the array on the
   * hot path — the walk hoists it once per call.
   */
  private peak: number;
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
   * The PF modifiers currently in force — the last set `applyPropagationModifiers`
   * was handed.
   *
   * Kept because a mid-match biome write has to compose with them. PF is
   * recomputed from the biome and never inverted, so a write that set a cell to
   * its new biome's bare baseline would silently cancel a storm standing over
   * it, and the storm would only come back at its next phase boundary — which
   * is a few times a minute, not a tick. Holding the set makes the biome write
   * exact at the tick it happens.
   */
  private mods: readonly PropagationModifier[] = [];

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
    // `Math.fround` wherever the peak is set from a double: the grid is a
    // Float32Array, and the rounded value it stores can sit a few ulps above
    // the double it was given. The peak has to bound what is *stored*.
    this.peak = Math.fround(PROPAGATION_FACTOR[Biome.OpenWater]);
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

  /**
   * The loudest PF of any cell on the grid, modifiers included. Every bound
   * of the form "could this be audible through the loudest water on the map"
   * reads this rather than `MAX_PROPAGATION_FACTOR`, so the bound is exact for
   * the map as it stands and a corridor above the biome ceiling is searched
   * for rather than silently missed. Never below the biome table's loudest
   * cell actually painted, never above `MAX_MODIFIED_PROPAGATION_FACTOR`.
   */
  get peakPf(): number {
    return this.peak;
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
    // The live ceiling, not the static one: a corridor cell at 2.0 would
    // otherwise sit above the headroom this early-out assumes, and a walk
    // through it could give up on a pair the exact test accepts.
    const peak = this.peak;
    let headroom = peak * samples;
    let sum = 0;
    for (let i = 0; i < samples; i++) {
      let cx = (px / cellM) | 0;
      let cy = (py / cellM) | 0;
      if (cx < 0) cx = 0;
      else if (cx > maxCx) cx = maxCx;
      if (cy < 0) cy = 0;
      else if (cy > maxCy) cy = maxCy;
      sum += pf[cy * cols + cx]!;
      headroom -= peak;
      // Even all-trench water for the rest cannot reach the caller's bar.
      if (sum + headroom < abortSum) return (sum + headroom) / samples;
      px += sx;
      py += sy;
    }
    return sum / samples;
  }

  /**
   * A cell belongs to a rectangle when its **centre** is inside it — the rule
   * every paint on this grid obeys (issue #157, docs/maps.md "How a map is
   * written").
   *
   * The alternative, painting every cell the rectangle so much as grazes, was
   * what this grid did until #157 and it was not a rounding detail: a band
   * authored 1,600 m wide on a 250 m grid painted 2,000 m of cells, a 25%
   * over-paint. Biome *is* PropagationFactor, so those cells carried sound at
   * a rate the map file did not describe, and every one of them was priced
   * into `pathPropagation` — the walk detection is built on.
   *
   * Centres also make adjacent regions tile. Two bands meeting at 3,000 m each
   * claim the cell they share under the touch rule, so which biome wins
   * depends on paint order rather than on the geometry; under this rule the
   * boundary is a boundary, and a region authored on cell boundaries paints
   * exactly the metres it asks for.
   *
   * The half-open end is what makes that true: a centre exactly on the low
   * edge is inside, a centre exactly on the high edge belongs to the next
   * region along. A rectangle thinner than a cell that falls between two
   * centres therefore paints *nothing* — which is a real authoring hazard and
   * why `maps.test.ts` refuses a region that paints no cells at all.
   */
  private firstCentreFrom(m: number): number {
    // Derived from the containing cell and corrected by one, rather than by
    // `ceil(m / cellM - 0.5)`: the correction is a comparison in metres, so a
    // float-dusted division cannot round a boundary the wrong way.
    const cell = Math.floor(m / this.cellM);
    return (cell + 0.5) * this.cellM >= m ? cell : cell + 1;
  }

  private lastCentreBefore(m: number): number {
    const cell = Math.floor(m / this.cellM);
    return (cell + 0.5) * this.cellM < m ? cell : cell - 1;
  }

  /** Paint an axis-aligned rectangle of biome, in world metres. */
  fillRect(x: number, y: number, w: number, h: number, biome: Biome): void {
    const x0 = Math.max(0, this.firstCentreFrom(x));
    const y0 = Math.max(0, this.firstCentreFrom(y));
    const x1 = Math.min(this.cols - 1, this.lastCentreBefore(x + w));
    const y1 = Math.min(this.rows - 1, this.lastCentreBefore(y + h));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        this.biomes[cy * this.cols + cx] = biome;
        this.pf[cy * this.cols + cx] = PROPAGATION_FACTOR[biome];
      }
    }
    // Monotone rather than rescanned: this is authoring, a repaint that lowers
    // the loudest cell only leaves the bound conservative, and no biome can
    // reach the corridor figure that makes the exact value worth paying for.
    const stored = Math.fround(PROPAGATION_FACTOR[biome]);
    if (stored > this.peak) this.peak = stored;
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
   * rather than as four rectangles around it. It claims cells by the same
   * centre rule, so a region's biome and its ground always cover the same
   * cells: a floor that reached a row the biome did not would be a shelf with
   * no biome to explain it.
   *
   * **`biome` is the mid-match twin of `fillRect`** (#259). Every field here is
   * optional and they stay independent — the argument above holds, and a caller
   * that only lowers a floor still says nothing about the water. What this is
   * not is a second call: a dome coming down and the water behind it turning to
   * ruins are one event at one tick, and writing them together costs one change
   * record per cell rather than two. `fillRect` remains the *authoring* call,
   * because at build time there is no client to tell and no log worth keeping.
   */
  fillGround(
    x: number,
    y: number,
    w: number,
    h: number,
    ground: { floorM?: number; ceilingM?: number; biome?: Biome }
  ): void {
    if (ground.floorM === undefined && ground.ceilingM === undefined && ground.biome === undefined)
      return;
    const x0 = Math.max(0, this.firstCentreFrom(x));
    const y0 = Math.max(0, this.firstCentreFrom(y));
    const x1 = Math.min(this.cols - 1, this.lastCentreBefore(x + w));
    const y1 = Math.min(this.rows - 1, this.lastCentreBefore(y + h));
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const index = cy * this.cols + cx;
        const beforeFloor = this.floor[index]!;
        const beforeCeiling = this.ceiling[index]!;
        const beforeBiome = this.biomes[index]!;
        if (ground.floorM !== undefined) this.floor[index] = ground.floorM;
        if (ground.ceilingM !== undefined) this.ceiling[index] = ground.ceilingM;
        if (ground.biome !== undefined) {
          this.biomes[index] = ground.biome;
          // Written here rather than left to the hazard pass. `pathPropagation`
          // reads `pf`, and the only other writer of it runs on storm phase
          // boundaries — so a ruin coming down on a map with no weather would
          // keep its old PF indefinitely, and `propagationAt` would disagree
          // with the biome the client is already drawing.
          this.pf[index] = this.propagationAtCell(cx, cy, ground.biome);
        }
        // Recorded only when the cell actually moved. A mission that repaints
        // ground it has already painted — Sorrowgate re-cuts the service lock
        // straight after collapsing the span across it — should cost the wire
        // nothing for the cells that did not change.
        if (
          this.floor[index] !== beforeFloor ||
          this.ceiling[index] !== beforeCeiling ||
          this.biomes[index] !== beforeBiome
        ) {
          this.changes.push({
            index,
            floorM: this.floor[index]!,
            ceilingM: this.ceiling[index]!,
            biome: this.biomes[index] as Biome,
          });
        }
      }
    }
    // A repaint can lower the cell that *was* the peak — a trench cut into
    // ruins — and a stale-high peak would only be conservative, but a
    // stale-high peak on a map with a corridor down is exactly the tax #372
    // exists to avoid. Rare enough that a scan is the honest answer.
    if (ground.biome !== undefined) this.rescanPeak();
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
   * Clamped to MAX_MODIFIED_PROPAGATION_FACTOR — the loudest anything is
   * specified to make a cell — and the grid's live peak is re-read on the way
   * through, because the Echo pass sizes its broadphase from that peak: a cell
   * louder than the peak claims would make units audible beyond the radius the
   * pass is willing to search for them, which reads as detection silently
   * failing. The two together are what let a Standing Wave corridor at PF 2.0
   * be carried rather than truncated (#372) without the static biome ceiling
   * moving: the corridor raises `peakPf` while it stands and nothing else.
   *
   * The clamp bounds a **cell**, which is not the same number as the bound on
   * a **pair**: the thermocline multiplies this walk's result afterwards, so a
   * pair's ceiling is the peak times the layer's factor, never the peak alone.
   * Keep them distinct — collapsing them would either shrink the duct's reach
   * or let a hazard write cells the walk's headroom early-out assumes cannot
   * exist.
   */
  applyPropagationModifiers(mods: readonly PropagationModifier[]): void {
    // Copied, not aliased. The caller builds this list fresh each phase
    // boundary today, but a caller that reused and mutated its array would
    // change what a later biome write composes with, at a distance and without
    // touching this file. The list is a handful of storms a few times a minute.
    this.mods = mods.slice();
    // The peak is exact after a full recompute: this loop visits every cell,
    // so folding the maximum in costs nothing and a storm passing or a
    // corridor coming down lowers the bound the same tick.
    let peak = MIN_PROPAGATION_FACTOR;
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const index = cy * this.cols + cx;
        const value = Math.fround(this.propagationAtCell(cx, cy, this.biomes[index] as Biome));
        this.pf[index] = value;
        if (value > peak) peak = value;
      }
    }
    this.peak = peak;
  }

  /**
   * Recompute the peak from the grid. For the rare writers that touch a
   * handful of cells — a mission repainting ground — where a cell that *was*
   * the peak may just have been lowered and a scan is cheaper than reasoning
   * about it. A few thousand reads, a few times a match.
   */
  private rescanPeak(): void {
    let peak = MIN_PROPAGATION_FACTOR;
    const { pf } = this;
    for (let i = 0; i < pf.length; i++) if (pf[i]! > peak) peak = pf[i]!;
    this.peak = peak;
  }

  /**
   * What a cell's PF should be, given the biome it now holds.
   *
   * The one place the composition lives, so the hazard pass and a mid-match
   * biome write cannot drift apart: a storm standing over a cell whose biome
   * changed prices the **new** biome's baseline by the storm's multiplier,
   * which is the same answer the next `applyPropagationModifiers` will reach
   * for that cell. Recomputed from the biome and never inverted, for the
   * reasons that method's comment gives.
   */
  private propagationAtCell(cx: number, cy: number, biome: Biome): number {
    let value = PROPAGATION_FACTOR[biome];
    if (this.mods.length > 0) {
      const wx = (cx + 0.5) * this.cellM;
      const wy = (cy + 0.5) * this.cellM;
      // Multiplicative scales fold into the baseline, additive deltas are
      // summed and applied after — docs/bestiary.md §4 (Tetherjelly): a
      // cell's PF is "biome baseline, times any hazard multipliers, minus any
      // jelly deltas". Accumulating the delta separately keeps the answer
      // order-independent within one list, which is the property the method
      // comment above promises about overlap.
      let delta = 0;
      for (let m = 0; m < this.mods.length; m++) {
        const mod = this.mods[m]!;
        const dx = wx - mod.x;
        const dy = wy - mod.y;
        if (dx * dx + dy * dy > mod.radiusM * mod.radiusM) continue;
        if (mod.scale !== undefined) value *= mod.scale;
        if (mod.delta !== undefined) delta += mod.delta;
      }
      value += delta;
    }
    // Clamped on the argument `applyPropagationModifiers` makes: the ceiling
    // is the loudest anything is *specified* to make water — the corridor's
    // 2.0, above every biome — and the broadphase reads the grid's live peak,
    // so a cell past this bound would be one no search radius accounts for.
    // No biome's baseline can breach it, since the ceiling is derived from the
    // same table the corridor figure sits beside; the clamp is here so the day
    // a hazard multiplier meets a louder biome is not the day it is discovered.
    //
    // Floored as well as capped, now that deltas exist: stacked negative
    // deltas must never cut a hole in the propagation model (§4's "sound
    // never stops entirely"), and a zero or negative PF would put a division
    // the detection maths never guarded against into every path that crosses
    // the cell.
    return Math.min(Math.max(value, MIN_PROPAGATION_FACTOR), MAX_MODIFIED_PROPAGATION_FACTOR);
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
   *
   * Every rectangle here lands on the 250 m grid, so each paints exactly the
   * metres it reads. They were re-stated that way when the centre rule landed
   * (#157) — the cells are unchanged, and deliberately so, because the tests
   * written against this fixture know its geometry rather than its literal.
   */
  static demo(): Terrain {
    const t = new Terrain(8000, 8000, 250);
    // Thermal vents across the middle: ambush terrain, PF 0.45.
    t.fillRect(0, 3500, 8000, 1000, Biome.ThermalVein);
    // Kelp on the west flank: the quiet approach, PF 0.55. Painted over the
    // vent band's western end, which is the fixture's one overlap.
    t.fillRect(0, 0, 2250, 3750, Biome.KelpForest);
    // A trench running north-south: PF 1.6, no secrets down here.
    t.fillRect(3750, 0, 750, 8000, Biome.AbyssalTrench);
    // Resonance field east: bearings lie, PF 0.7 scattered.
    t.fillRect(5750, 4500, 2250, 2750, Biome.ResonanceField);
    // Coral ruins south-west: hard acoustic shadows, PF 0.8.
    t.fillRect(750, 5000, 2000, 2000, Biome.CoralRuins);
    return t;
  }
}
