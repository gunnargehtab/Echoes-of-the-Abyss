/**
 * The acoustic veil — the water goes cold where you have no ear in it
 * (docs/ui-ux.md §4.5, issue #472).
 *
 * **Presentation only, and it has to be said out loud.** This buys no
 * security. The client already holds nothing it did not resolve — detection
 * runs per player in the backend's `sim/systems/echoLayer.ts` and only the
 * resolved result crosses the socket — so there is no privileged data here to
 * filter. That is exactly why the veil can live in the renderer: it is a
 * drawing rule over data the server has always sent, not a second fog of war,
 * and it must never be argued for as if the anti-maphack rule depended on it.
 *
 * **What it is drawn from.** Own hulls, own structures, and the public map.
 * For each of those listeners the propagation model answers, at any point on
 * the chart, *how loud would something have to be for you to register it
 * here?* — `minAudibleSigAt`, the same relationship the Echo Layer resolves
 * with, solved for loudness instead of for distance. The best ear wins, and
 * the answer shades the ground between two SPEC anchors (`ACOUSTIC_VEIL`):
 * clear where a hull in Silent Running could not slip past, floored where
 * nothing in this game is loud enough to reach.
 *
 * That framing is the point. A flat listening radius would need a reference
 * SIG nobody specified, and would be a lie the player could learn — the same
 * circle drawn in a Thermal Vein that swallows sound at PF 0.45 and in an
 * Abyssal Trench that carries it at 1.6. A field priced against the actual
 * propagation factor is wrong in neither place, and it draws the game's
 * central lever rather than hiding it: biome shapes your ear, visibly.
 *
 * **What it deliberately does not know.** Two auras move a listener's HYD
 * server-side and are invisible from here: a Cantor lending HYD to the hulls
 * around it (the veil under-draws that coverage) and a spore veil blinding
 * what stands in it (the veil over-draws). Neither is fixable without putting
 * enemy structure state on the wire, which is the one thing this feature is
 * not allowed to do. It is survivable because of what the veil touches: only
 * the ground. A contact the server resolved is drawn at full strength through
 * any amount of veil, so a wrong field costs atmosphere and never information.
 *
 * The isotropy compromise is the one `EchoRenderer.drawRings` already
 * documents and accepts: the server prices each path integral cell by cell,
 * and this samples the propagation factor where the *question* is asked. It
 * is the honest reading available to a client that holds one end of the path.
 */

import {
  ACOUSTIC_VEIL,
  Biome,
  PROPAGATION_FACTOR,
  PROPAGATION_MODEL,
  detectionThreshold,
  type TerrainPayload,
} from '@echoes/shared';

const { REFERENCE_DISTANCE_M, ATTENUATION_EXPONENT } = PROPAGATION_MODEL;

/** One thing of the player's own that listens: a hull, or an anchored array. */
export interface VeilListener {
  xM: number;
  yM: number;
  /** Hydrophone rating, from the roster stats for its kind. */
  hyd: number;
}

/**
 * Clarity over the map: 1 where the water is fully held, 0 where no listener
 * of the player's reaches at all.
 *
 * Sampled at terrain **cell** resolution, which is where the propagation
 * factor is defined — a field finer than a cell would be inventing precision
 * the biome map does not have. Between cells the renderer interpolates, which
 * also softens the biome boundaries: a hard edge there would draw the biome
 * map's outline in a second ink, and the seabed already says where the vents
 * are.
 */
export class VeilField {
  private cols = 0;
  private rows = 0;
  private cellM = 1;
  private clarity = new Float32Array(0);

  /**
   * Rebuild against a terrain and the listeners standing on it.
   *
   * Cost is cells × listeners, both small: every shipped map is on a 250 m
   * grid, so a 10 km map is 960 cells, and a force is tens of hulls. The
   * inner loop is a squared distance and a compare — no `pow`, no `sqrt` —
   * because the minimum over listeners can be taken in a monotone transform
   * of the answer and shaped once per cell at the end. It runs on the Echo
   * tick rather than per frame: this is a 5 Hz fact, and at 20 m/s a hull
   * drifts 4 m of a 250 m cell between two of them.
   */
  build(terrain: TerrainPayload, listeners: readonly VeilListener[]): void {
    const { cols, rows, cellM } = terrain;
    this.cols = cols;
    this.rows = rows;
    this.cellM = cellM;
    if (this.clarity.length !== cols * rows) this.clarity = new Float32Array(cols * rows);
    const clarity = this.clarity;

    // No listeners is not "the map is dark" — it is a match that has not
    // started, or a force that has just been wiped. Drawing a black chart
    // there reads as a broken renderer rather than as dread (CLAUDE.md), and
    // a player with nothing left in the water has already been told so.
    if (listeners.length === 0) {
      clarity.fill(1);
      return;
    }

    // minAudibleSig(l, p) = T(hyd_l) * (d/REF)^K / pf(p), and x -> x^K is
    // monotone over positive x, so the *nearest-audible* listener can be
    // found on `u_l * d` with `u_l = T(hyd_l)^(1/K)` — and therefore on its
    // square, which costs neither a root nor a power per pair.
    const weightSq: number[] = [];
    const positions: VeilListener[] = [];
    for (const listener of listeners) {
      if (listener.hyd <= 0) continue;
      const u = Math.pow(detectionThreshold(listener.hyd), 1 / ATTENUATION_EXPONENT);
      weightSq.push(u * u);
      positions.push(listener);
    }
    if (positions.length === 0) {
      clarity.fill(0);
      return;
    }

    const refSq = REFERENCE_DISTANCE_M * REFERENCE_DISTANCE_M;
    const span = ACOUSTIC_VEIL.DEAF_SIG - ACOUSTIC_VEIL.CLEAR_SIG;

    for (let row = 0; row < rows; row++) {
      const cy = (row + 0.5) * cellM;
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        const cx = (col + 0.5) * cellM;

        let best = Infinity;
        for (let i = 0; i < positions.length; i++) {
          const listener = positions[i]!;
          const dx = cx - listener.xM;
          const dy = cy - listener.yM;
          // Inside the reference distance sound does not attenuate further,
          // exactly as `perceivedLoudness` clamps it — point blank is point
          // blank, and it keeps the field finite over a hull's own cell.
          const dSq = Math.max(dx * dx + dy * dy, refSq);
          const value = weightSq[i]! * dSq;
          if (value < best) best = value;
        }

        const pf = PROPAGATION_FACTOR[terrain.biomes[index] as Biome] ?? 1;
        // Undo the transform: back to metres, then to the SIG the model asks
        // for. One `pow` per cell rather than one per pair.
        const sig =
          Math.pow(Math.sqrt(best) / REFERENCE_DISTANCE_M, ATTENUATION_EXPONENT) /
          (pf > 0 ? pf : 1);
        const t = (sig - ACOUSTIC_VEIL.CLEAR_SIG) / span;
        clarity[index] = 1 - smoothstep01(t);
      }
    }
  }

  /**
   * Clarity at a point, bilinear between the four surrounding cell centres.
   * Outside the field — before the first terrain, or off the map — the water
   * is drawn whole, because a veil is a statement about listening and there
   * is nothing there to make one about.
   */
  at(xM: number, yM: number): number {
    const { cols, rows, cellM, clarity } = this;
    if (clarity.length === 0) return 1;

    const fx = xM / cellM - 0.5;
    const fy = yM / cellM - 0.5;
    const c0 = clampInt(Math.floor(fx), cols - 1);
    const r0 = clampInt(Math.floor(fy), rows - 1);
    const c1 = clampInt(c0 + 1, cols - 1);
    const r1 = clampInt(r0 + 1, rows - 1);
    const tx = clamp01(fx - c0);
    const ty = clamp01(fy - r0);

    const a = clarity[r0 * cols + c0]!;
    const b = clarity[r0 * cols + c1]!;
    const c = clarity[r1 * cols + c0]!;
    const d = clarity[r1 * cols + c1]!;
    const top = a + (b - a) * tx;
    const bottom = c + (d - c) * tx;
    return top + (bottom - top) * ty;
  }

  /** Drop the field — a new match, or a view coming down. */
  clear(): void {
    this.clarity = new Float32Array(0);
    this.cols = 0;
    this.rows = 0;
  }
}

/**
 * A soft shoulder at both anchors rather than a linear ramp: a hard start to
 * the veil would draw a ring at the clear radius, which is precisely the
 * learnable circle the field exists to avoid.
 */
function smoothstep01(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function clampInt(value: number, max: number): number {
  return value < 0 ? 0 : value > max ? max : value;
}

/**
 * What the veil multiplies the ground by at its floor, **in display space**.
 *
 * A drain rather than an ink, which is why it is here and not a fifth token
 * in `palette.ts`: it carries no hue-only meaning, so it is the same number
 * under all four colour-vision palettes (gate 4, docs/graphics-standards.md).
 *
 * The channels are uneven on purpose, and the first pass at this got it
 * wrong. A flat drain to about a third looked right on paper and rendered as
 * a blackout, because `palette.ts` already sits the biome fills at 5-10%
 * luminance and the scene's depth haze darkens the same pixels again: a third
 * of very little is nothing, and the far shelves stopped being plannable.
 * Holding blue near twice the other two turns the multiply into a
 * *desaturation towards the ambient* instead — a kelp shelf and a vent field
 * both converge on the cold blue-grey the water already is, and the ridge and
 * the terrace survive it. Colour goes; shape stays. Which is the difference
 * between water nobody is listening to and the unexplored black that would be
 * the other game (docs/ui-ux.md §5, "No fog").
 *
 * TUNABLE, and the one number here that a screenshot rather than a test has
 * to settle — docs/graphics-standards.md gate 7 asks one question of it: can
 * you still route through the cold corner?
 */
export const VEIL_FLOOR_RGB = { r: 0.3, g: 0.38, b: 0.62 } as const;

/**
 * The per-channel multiplier for a point at this clarity, in display space.
 *
 * `intensity` is the player's setting (docs/ui-ux.md §11): 0 turns the veil
 * off entirely, which costs them nothing, because the veil hides no
 * information — the one virtue of a presentation-only fog is that its own
 * accessibility control cannot be a cheat.
 */
export function veilShade(clarity: number, intensity: number): { r: number; g: number; b: number } {
  const k = clamp01(1 - clarity) * clamp01(intensity);
  return {
    r: 1 + (VEIL_FLOOR_RGB.r - 1) * k,
    g: 1 + (VEIL_FLOOR_RGB.g - 1) * k,
    b: 1 + (VEIL_FLOOR_RGB.b - 1) * k,
  };
}
