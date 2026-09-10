/**
 * The refits — docs/systems-progression.md §2, the upgrade half of the rung.
 *
 * A refit is fleet-wide, bought once, and applies to every hull the navy has
 * afloat and every hull it launches afterwards. It is bought **on the
 * Slipway's line**: for its build time the yard runs at SIG 70 and launches
 * nothing, so a refit and the yard's hull compete for the same yard-time.
 * That competition is the decision the mechanism exists to create.
 *
 * One refit is implemented — the **Pressure Refit**, which is the one #517 is
 * about. `RefitKind` carries the enum shape for the other four (Plate, Drive,
 * Magazine, Hold) because they are the same machinery pointed at the other
 * stats a hull has; each of those lands with the system that owns the stat it
 * moves, and none of them is load-bearing for a navy's route to the deep.
 *
 * A roster table, in the manner of `units.ts` and `structures.ts`, and here
 * rather than in `constants.ts` for the same reason those are: the numbers are
 * a *roster*, read as rows, and the per-navy terms below only make sense
 * beside the row they modify. Every figure cites §2, so by that section's own
 * rule ("prices ... are TUNABLE until a constant cites this section") they are
 * SPEC.
 *
 * Nothing here knows about entities. The server applies a refit through
 * `sim/systems/refit.ts`, the shell prices it through the same `priceOf` and
 * `affords` every hull goes through, and the commander budgets for it through
 * the same functions — which is the constants rule applied to an upgrade.
 */

import { Faction, RefitKind, StructureKind } from './types.js';
import { priceOf, type Price } from './economy.js';

export interface RefitStats {
  kind: RefitKind;
  /** As the doc names it, and as a button reads it. */
  name: string;
  /** Nodules, before the navy's terms. */
  cost: number;
  /** Resonance Crystal, before the navy's terms. */
  crystalCost: number;
  /** Seconds on the Slipway's line, before the navy's terms. */
  buildTimeS: number;
  /** Bands of Pressure Rating this refit adds to every hull of the navy. */
  pressureBonus: number;
  /**
   * What it costs acoustically, at idle and at cruise and nowhere else.
   *
   * "A thicker pressure hull is quiet; the pumps that keep it trimmed are
   * not." Not applied to Silent Running, to a ping, or to mining: those states
   * are the throttle's or the transmission's own figure, and rule 2 of §1 only
   * ever lets progression push SIG *up* — never down, and never at a state
   * whose loudness is somebody else's number.
   */
  sigBonus: number;
}

export const REFIT_STATS: Record<RefitKind, RefitStats> = {
  [RefitKind.Pressure]: {
    kind: RefitKind.Pressure,
    name: 'Pressure Refit',
    // SPEC — docs/systems-progression.md §2, the five refits table: "+1 PR,
    // fleet-wide ... +2 SIG idle and cruise ... 400 Nodules, 120 Crystal ...
    // 120 s". The crystal figure is a signature structure's, deliberately:
    // "it is the same kind of decision: the deep, spent on something you
    // cannot un-spend."
    cost: 400,
    crystalCost: 120,
    buildTimeS: 120,
    pressureBonus: 1,
    sigBonus: 2,
  },
};

/**
 * What one navy pays, and how far the refit carries it.
 *
 * The mechanism is faction-blind — the same line, the same three accounts,
 * the same `priceOf` — and the doctrine is carried by the rate, which is how
 * every other price in the roster works. §2's per-faction table, in full:
 *
 * - **Consortium**, ×0.7 Crystal: "cheapest refits in the game, but pays for
 *   every metre." The discount is crystal-only, so the Nodules and the 120 s
 *   at SIG 70 are paid in full — the Klaxon paying in the currency it always
 *   pays in.
 * - **Commune**, ×1.5 Crystal and ×1.5 line time, and **PR-1 → PR-2 only**.
 *   The Abyssal is Deepbloom's, which converts tiles rather than hulls; the
 *   one refit they can buy takes them out of the Shelf and no further, which
 *   is exactly why the Sower is their answer to the deep (#503).
 * - **Directorate**: not offered. PR-3 is the baseline — "the refit everyone
 *   else's mid-game is about is the one the Directorate started with."
 * - **Knights**: **instant**, Crystal alone at ×1.5, no Nodules and no line
 *   time — and *sounded*, because an instant refit that emitted nothing would
 *   be the quiet tech-up §1's rule 1 forbids.
 */
export interface RefitTerms {
  /** False for a navy the refit is not offered to at all. */
  offered: boolean;
  crystalFactor: number;
  noduleFactor: number;
  lineTimeFactor: number;
  /**
   * The Pressure Rating this navy's refit will not carry a hull past.
   *
   * A ceiling rather than a flat `+1` because the Commune's row is written as
   * a destination ("PR-1 → PR-2 only") rather than as a step, and because the
   * roster already contains hulls above their navy's baseline: the Abyssal
   * Submersible is PR-3 for everyone, and a refit that pushed it to 4 would
   * invent water no band asks for.
   */
  pressureCeiling: number;
  /**
   * The yard this navy buys the refit at.
   *
   * The Slipway for three navies, because §2 says "on the Slipway's line, and
   * nowhere else". The Knights' Pressure Refit has no line time, so it has no
   * line: it is struck at the Bastion, which is also the thing §2 says makes
   * the noise.
   */
  boughtAt: StructureKind;
  /**
   * The SIG the purchase strikes at `boughtAt`, and for how long — the
   * Knights' 80 for 15 s, and nothing for a refit that spends two minutes
   * being audible on a line instead.
   */
  sounding?: { sig: number; seconds: number };
}

export const REFIT_TERMS: Record<Faction, RefitTerms> = {
  // "Buys access — cheapest refits in the game, but pays for every metre."
  [Faction.Bathyarch]: {
    offered: true,
    crystalFactor: 0.7,
    noduleFactor: 1,
    lineTimeFactor: 1,
    pressureCeiling: 3,
    boughtAt: StructureKind.Slipway,
  },
  // "Terraforms access — poor refits."
  [Faction.Pelagia]: {
    offered: true,
    crystalFactor: 1.5,
    noduleFactor: 1,
    lineTimeFactor: 1.5,
    pressureCeiling: 2,
    boughtAt: StructureKind.Slipway,
  },
  // "Born to it — no refit needed."
  [Faction.Directorate]: {
    offered: false,
    crystalFactor: 1,
    noduleFactor: 1,
    lineTimeFactor: 1,
    pressureCeiling: 3,
    boughtAt: StructureKind.Slipway,
  },
  // "Projects access — instant refits paid in Resonance."
  [Faction.Hadron]: {
    offered: true,
    crystalFactor: 1.5,
    noduleFactor: 0,
    lineTimeFactor: 0,
    pressureCeiling: 3,
    boughtAt: StructureKind.Bastion,
    // SPEC — §2: "the Bastion strikes SIG 80 for 15 s at the purchase".
    sounding: { sig: 80, seconds: 15 },
  },
};

/**
 * Every refit, in enum order — the list a command bar walks and a test
 * exhausts. Derived from the roster table so a sixth cannot be offered on one
 * reader and missed by the other.
 */
export const REFIT_KINDS: readonly RefitKind[] = (
  Object.keys(REFIT_STATS).map(Number) as RefitKind[]
).sort((a, b) => a - b);

/** Whether this navy may buy this refit at all. */
export function refitOfferedTo(kind: RefitKind, faction: Faction): boolean {
  // A kind with no row is offered to nobody. This is the gate `Match.refit`
  // already looks like it has: the number reaches here straight off the wire,
  // and without this line the `true` below waved every kind but Pressure
  // through to `refitPriceFor`, which reads `REFIT_STATS[kind].cost` and threw.
  // Asked of the table rather than the enum so the second refit is covered by
  // existing, and only the four rows §2 still owes have to be written.
  if (REFIT_STATS[kind] === undefined) return false;
  // Written against the kind as well as the navy so the other four refits,
  // which every navy including the Directorate is offered, do not have to
  // rewrite this signature when they arrive.
  return kind === RefitKind.Pressure ? REFIT_TERMS[faction].offered : true;
}

/**
 * The price, in the same three accounts everything else is priced in.
 *
 * Rounded, because a factor of 0.7 on 120 is exact and a factor on some later
 * refit's 60 need not be — and a stockpile the server compares against a
 * fraction of a nodule is a refusal nobody can read.
 */
export function refitPriceFor(kind: RefitKind, faction: Faction): Price {
  const stats = REFIT_STATS[kind];
  const terms = REFIT_TERMS[faction];
  return priceOf({
    cost: Math.round(stats.cost * terms.noduleFactor),
    crystalCost: Math.round(stats.crystalCost * terms.crystalFactor),
  });
}

/** Seconds this navy's refit occupies the yard. Zero is instant, off the line. */
export function refitLineTimeS(kind: RefitKind, faction: Faction): number {
  return REFIT_STATS[kind].buildTimeS * REFIT_TERMS[faction].lineTimeFactor;
}

/**
 * A hull's Pressure Rating once its navy owns the Pressure Refit.
 *
 * Takes the rating rather than the hull so it composes with
 * `effectivePressureRating`, which has already resolved the faction baseline:
 * the refit is a step up from where a navy *starts*, capped where its own row
 * says it stops.
 */
export function refittedPressureRating(rating: number, faction: Faction): number {
  const terms = REFIT_TERMS[faction];
  if (!terms.offered) return rating;
  return Math.min(terms.pressureCeiling, rating + REFIT_STATS[RefitKind.Pressure].pressureBonus);
}
