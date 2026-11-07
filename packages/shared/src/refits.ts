/**
 * The refits — docs/systems-progression.md §2, the upgrade half of the rung.
 *
 * A refit is fleet-wide, bought once, and applies to every hull the navy has
 * afloat and every hull it launches afterwards. It is bought **on the
 * Slipway's line**: for its build time the yard runs at SIG 70 and launches
 * nothing, so a refit and the yard's hull compete for the same yard-time.
 * That competition is the decision the mechanism exists to create.
 *
 * All five are here (#1785), and each moves one stat a hull already has,
 * through the system that owns it: the Pressure Refit the rating, the Plate the
 * hull, the Drive the speed and the depth rates, the Magazine the torpedoes and
 * the Hold the cargo. The SIG a refit adds to a hull is read in one place, the
 * acoustics pass. The Hold adds none: its noise is the bigger hum the harvest
 * lays at the depot, and the longer cut at the throttle's own SIG.
 *
 * A roster table, in the manner of `units.ts` and `structures.ts`, and here
 * rather than in `constants.ts` for the same reason those are: the numbers are
 * a *roster*, read as rows, and the per-navy terms below only make sense
 * beside the row they modify. Every figure cites §2, so by that section's own
 * rule ("prices ... are TUNABLE until a constant cites this section") they are
 * SPEC.
 *
 * Nothing here knows about entities. The server applies a refit through
 * `sim/systems/refit.ts` and the systems that read the helpers at the foot of
 * this file, the shell prices it through the same `priceOf` and `affords`
 * every hull goes through, and the commander budgets for it through the same
 * functions — which is the constants rule applied to an upgrade.
 */

import { ORDNANCE } from './constants.js';
import { Faction, RefitKind, StructureKind, type UnitKind } from './types.js';
import { priceOf, type Price } from './economy.js';
import { statsFor } from './units.js';

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
  /** What every hull's maximum hull is multiplied by. */
  hullFactor: number;
  /** What every hull's speed is multiplied by, its descent and ascent rates included. */
  speedFactor: number;
  /**
   * Torpedoes the roster's standard magazine gains. Only the standard one: a
   * hull that carries a number of its own keeps it (`torpedoMagazineFor`).
   */
  magazineBonus: number;
  /** What a harvester's hold is multiplied by, at every throttle. */
  holdFactor: number;
  /**
   * What it costs acoustically, stopped and under way, and at no other state.
   *
   * "A thicker pressure hull is quiet; the pumps that keep it trimmed are
   * not." Not applied to Silent Running, to a ping, or to mining: those states
   * are the throttle's or the transmission's own figure, and rule 2 of §1 only
   * ever lets progression push SIG *up* — never down, and never at a state
   * whose loudness is somebody else's number.
   */
  sigIdleBonus: number;
  sigCruiseBonus: number;
}

/** A refit that moves nothing, so each row below names only what it buys. */
const MOVES_NOTHING = {
  pressureBonus: 0,
  hullFactor: 1,
  speedFactor: 1,
  magazineBonus: 0,
  holdFactor: 1,
  sigIdleBonus: 0,
  sigCruiseBonus: 0,
} as const;

export const REFIT_STATS: Record<RefitKind, RefitStats> = {
  [RefitKind.Pressure]: {
    ...MOVES_NOTHING,
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
    sigIdleBonus: 2,
    sigCruiseBonus: 2,
  },
  [RefitKind.Plate]: {
    ...MOVES_NOTHING,
    kind: RefitKind.Plate,
    name: 'Plate Refit',
    // SPEC — §2: "+15% max hull ... +3 SIG cruise — more mass pushes more
    // water ... 250 Nodules, 60 Crystal ... 90 s". At cruise alone: plate
    // makes no noise until it has to be pushed.
    cost: 250,
    crystalCost: 60,
    buildTimeS: 90,
    hullFactor: 1.15,
    sigCruiseBonus: 3,
  },
  [RefitKind.Drive]: {
    ...MOVES_NOTHING,
    kind: RefitKind.Drive,
    name: 'Drive Refit',
    // SPEC — §2: "+10% speed, descent and ascent rates included ... +4 SIG
    // idle and cruise — a bigger drive is a louder drive, and it is louder
    // standing still ... 250 Nodules, 60 Crystal ... 90 s".
    cost: 250,
    crystalCost: 60,
    buildTimeS: 90,
    speedFactor: 1.1,
    sigIdleBonus: 4,
    sigCruiseBonus: 4,
  },
  [RefitKind.Magazine]: {
    ...MOVES_NOTHING,
    kind: RefitKind.Magazine,
    name: 'Magazine Refit',
    // SPEC — §2: "Torpedo magazines 2 → 3 ... None on the hull. The torpedo is
    // loud for its whole run already ... 200 Nodules, 60 Crystal ... 90 s".
    cost: 200,
    crystalCost: 60,
    buildTimeS: 90,
    magazineBonus: 1,
  },
  [RefitKind.Hold]: {
    ...MOVES_NOTHING,
    kind: RefitKind.Hold,
    name: 'Hold Refit',
    // SPEC — §2: "Harvester and crystal holds +20% at every throttle ... The
    // hum ... 200 Nodules, 40 Crystal ... 60 s". Nothing on the hull: its noise
    // is the bigger delivery, and the longer cut at the throttle's own SIG.
    cost: 200,
    crystalCost: 40,
    buildTimeS: 60,
    holdFactor: 1.2,
  },
};

/**
 * What one navy pays for a refit, and where — §2's per-faction table, its
 * "Refits" column.
 *
 * The mechanism is faction-blind — the same line, the same three accounts,
 * the same `priceOf` — and the doctrine is carried by the rate, which is how
 * every other price in the roster works:
 *
 * - **Consortium**, ×0.7 Crystal: "cheapest refits in the game, but pays for
 *   every metre." The discount is crystal-only, so the Nodules and the time at
 *   SIG 70 are paid in full — the Klaxon paying in the currency it always
 *   pays in.
 * - **Commune**, ×1.5 Crystal and ×1.5 line time: "poor refits."
 * - **Directorate**: standard.
 * - **Knights**: "standard on the line — except the one below". The exception
 *   is the Pressure Refit's own, and `PRESSURE_REFIT_TERMS` carries it, so the
 *   Order's other four are bought on a Slipway like anyone's.
 */
export interface RefitTerms {
  crystalFactor: number;
  noduleFactor: number;
  lineTimeFactor: number;
  /**
   * The yard the refit is bought at.
   *
   * The Slipway, because §2 says "on the Slipway's line, and nowhere else".
   * A refit with no line time has no line: the Knights' Pressure Refit is
   * struck at the Bastion, which is also the thing §2 says makes the noise.
   */
  boughtAt: StructureKind;
  /**
   * The SIG the purchase strikes at `boughtAt`, and for how long — the
   * Knights' 80 for 15 s, and nothing for a refit that spends its time being
   * audible on a line instead.
   */
  sounding?: { sig: number; seconds: number };
}

export const REFIT_TERMS: Record<Faction, RefitTerms> = {
  // "Buys access — cheapest refits in the game, but pays for every metre."
  [Faction.Bathyarch]: {
    crystalFactor: 0.7,
    noduleFactor: 1,
    lineTimeFactor: 1,
    boughtAt: StructureKind.Slipway,
  },
  // "Terraforms access — poor refits."
  [Faction.Pelagia]: {
    crystalFactor: 1.5,
    noduleFactor: 1,
    lineTimeFactor: 1.5,
    boughtAt: StructureKind.Slipway,
  },
  // "Born to it" — and every refit it is offered, priced like anyone's.
  [Faction.Directorate]: {
    crystalFactor: 1,
    noduleFactor: 1,
    lineTimeFactor: 1,
    boughtAt: StructureKind.Slipway,
  },
  // "Standard on the line — except the one below."
  [Faction.Hadron]: {
    crystalFactor: 1,
    noduleFactor: 1,
    lineTimeFactor: 1,
    boughtAt: StructureKind.Slipway,
  },
};

/**
 * The Pressure Refit's own column of §2's per-faction table: whether a navy
 * is offered it, how far it carries a hull, and the Order's terms for it.
 */
export interface PressureRefitTerms {
  /** False for a navy the refit is not offered to at all. */
  offered: boolean;
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
   * Terms in place of the navy's `REFIT_TERMS`, for this refit alone. Only the
   * Knights have them: "instant, priced in Crystal alone at ×1.5 (180), no
   * Nodules, no line time — and sounded", because an instant refit that
   * emitted nothing would be the quiet tech-up §1's rule 1 forbids.
   */
  terms?: RefitTerms;
}

export const PRESSURE_REFIT_TERMS: Record<Faction, PressureRefitTerms> = {
  // "PR-2 → PR-3, one purchase."
  [Faction.Bathyarch]: { offered: true, pressureCeiling: 3 },
  // "PR-1 → PR-2 only" — which is exactly why the Sower is their answer to the
  // deep (#503).
  [Faction.Pelagia]: { offered: true, pressureCeiling: 2 },
  // "Not offered. PR-3 is the baseline."
  [Faction.Directorate]: { offered: false, pressureCeiling: 3 },
  // "Projects access — instant refits paid in Resonance."
  [Faction.Hadron]: {
    offered: true,
    pressureCeiling: 3,
    terms: {
      crystalFactor: 1.5,
      noduleFactor: 0,
      lineTimeFactor: 0,
      boughtAt: StructureKind.Bastion,
      // SPEC — §2: "the Bastion strikes SIG 80 for 15 s at the purchase".
      sounding: { sig: 80, seconds: 15 },
    },
  },
};

/** The terms this navy buys this refit on: the Pressure Refit's own where it has them. */
export function refitTermsFor(kind: RefitKind, faction: Faction): RefitTerms {
  const own = kind === RefitKind.Pressure ? PRESSURE_REFIT_TERMS[faction].terms : undefined;
  return own ?? REFIT_TERMS[faction];
}

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
  // A kind with no row is offered to nobody. The number reaches here straight
  // off the wire, and without this line every kind past the table would be
  // waved through to `refitPriceFor`, which reads `REFIT_STATS[kind].cost` and
  // throws.
  if (REFIT_STATS[kind] === undefined) return false;
  // Only the Pressure Refit has a navy it is not offered to. The Directorate's
  // "four other refits are priced like anyone's" (§2).
  return kind === RefitKind.Pressure ? PRESSURE_REFIT_TERMS[faction].offered : true;
}

/**
 * The price, in the same three accounts everything else is priced in.
 *
 * Rounded. Every product the table makes today is whole, from the
 * Consortium's 28 crystal for a Hold to the Commune's 180 for the deep, but a
 * factor need not be kind to the next price — and a stockpile the server
 * compares against a fraction of a nodule is a refusal nobody can read.
 */
export function refitPriceFor(kind: RefitKind, faction: Faction): Price {
  const stats = REFIT_STATS[kind];
  const terms = refitTermsFor(kind, faction);
  return priceOf({
    cost: Math.round(stats.cost * terms.noduleFactor),
    crystalCost: Math.round(stats.crystalCost * terms.crystalFactor),
  });
}

/** Seconds this navy's refit occupies the yard. Zero is instant, off the line. */
export function refitLineTimeS(kind: RefitKind, faction: Faction): number {
  return REFIT_STATS[kind].buildTimeS * refitTermsFor(kind, faction).lineTimeFactor;
}

/**
 * A hull's Pressure Rating once its navy owns the Pressure Refit.
 *
 * Takes the rating rather than the hull so it composes with
 * `effectivePressureRating`, which has already resolved the faction baseline:
 * the refit is a step up from where a navy *starts*, capped where its own row
 * says it stops.
 *
 * The cap holds back the gain and never takes rating away (#1221): a step up
 * is what §2 sells. The Commune's ceiling is 2, and four of its hulls are
 * born PR-3, so a bare `min(ceiling, rating + bonus)` demoted the
 * Submersible, the Verger, the Thurible and the Lure into crush at 2,400 m.
 */
export function refittedPressureRating(rating: number, faction: Faction): number {
  const terms = PRESSURE_REFIT_TERMS[faction];
  if (!terms.offered) return rating;
  const stepped = rating + REFIT_STATS[RefitKind.Pressure].pressureBonus;
  return Math.max(rating, Math.min(terms.pressureCeiling, stepped));
}

/**
 * The refits a navy owns, as each side holds them: the server's set, the
 * snapshot's sorted list, or `undefined` for a navy that has bought none.
 */
export type OwnedRefits = Iterable<RefitKind> | undefined;

/**
 * The product of one factor over everything owned.
 *
 * Multiplied rather than summed, so that the order refits land in never
 * matters and a second factor on the same stat — none exists, and §2 closes
 * the list — would compound rather than quietly overwrite.
 */
function factorOf(owned: OwnedRefits, stat: 'hullFactor' | 'speedFactor' | 'holdFactor'): number {
  let factor = 1;
  if (owned !== undefined) for (const kind of owned) factor *= REFIT_STATS[kind][stat];
  return factor;
}

/** What a navy's refits multiply every hull's maximum hull by. */
export function refitHullFactor(owned: OwnedRefits): number {
  return factorOf(owned, 'hullFactor');
}

/** What a navy's refits multiply every hull's speed, descent and ascent by. */
export function refitSpeedFactor(owned: OwnedRefits): number {
  return factorOf(owned, 'speedFactor');
}

/** What a navy's refits multiply a harvester's hold by, at every throttle. */
export function refitHoldFactor(owned: OwnedRefits): number {
  return factorOf(owned, 'holdFactor');
}

/**
 * What a navy's refits add to a hull's SIG, stopped or under way.
 *
 * Summed rather than maxed: two refits that each cost noise cost both,
 * because each is a separate piece of machinery running.
 */
export function refitSigBonus(owned: OwnedRefits, underWay: boolean): number {
  let bonus = 0;
  if (owned === undefined) return bonus;
  for (const kind of owned) {
    const stats = REFIT_STATS[kind];
    bonus += underWay ? stats.sigCruiseBonus : stats.sigIdleBonus;
  }
  return bonus;
}

/**
 * The torpedoes a full magazine holds, for this hull in a navy that owns these
 * refits: what it leaves the yard with, and what a rearm fills it to.
 *
 * The Magazine Refit grows the roster's standard magazine and nothing else
 * (docs/systems-progression.md §2). A hull that carries a number of its own —
 * the Broadside's four, the Lance's one — carries an argument with it
 * (docs/units.md), and keeps it.
 */
export function torpedoMagazineFor(kind: UnitKind, owned: OwnedRefits): number {
  const own = statsFor(kind).torpedoMagazine;
  if (own !== undefined) return own;
  let magazine = ORDNANCE.TORPEDO.MAGAZINE;
  if (owned !== undefined) for (const refit of owned) magazine += REFIT_STATS[refit].magazineBonus;
  return magazine;
}
