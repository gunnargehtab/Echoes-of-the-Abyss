/**
 * Prices and stockpiles — the banked half of docs/economy.md §2, and the one
 * rule for spending it.
 *
 * Three of the four resources are stockpiles: Nodules, Resonance Crystal and
 * Biomass. Thermal Draw is a rate and is deliberately absent — see
 * `DrawReport`. A price is written in the same three accounts, and a thing is
 * affordable when every account covers its share. There is no exchange rate
 * between them, and this module is where that is enforced rather than left to
 * each caller: docs/economy.md §6 is explicit that the Directorate's living is
 * a different resource, not a discount on the same one, and the crystal gate
 * (§2, §8) would be no gate at all if Nodules could stand in for it.
 *
 * The server refuses and debits through these functions, the commander AI
 * budgets through them, and the shell greys its buttons and words its
 * refusals through the same ones — so the price the player is shown and the
 * price the server charges cannot drift. They are one function applied to one
 * roster entry.
 */

/**
 * The three accounts that bank: `PlayerEconomy` on the server and, on the
 * wire, the same three fields of `EchoSnapshot`. Ordered as docs/economy.md
 * §2 lists them, which is also the order a refusal names them in.
 */
export const ECONOMY_ACCOUNTS = ['nodules', 'crystal', 'biomass'] as const;

/**
 * One of the three. A mission literal that names an account the record does
 * not carry fails `type-check` rather than half way through a match, which is
 * the mission format's standing rule (docs/mission-intake.md §13).
 */
export type EconomyAccount = (typeof ECONOMY_ACCOUNTS)[number];

/** What a player has banked, per account. */
export type Stockpile = Record<EconomyAccount, number>;

/** What a thing costs, per account. Zero in an account it is not priced in. */
export type Price = Readonly<Stockpile>;

/**
 * How a roster entry writes its price: Nodules always, because every hull
 * and structure is plate and pressure hull first (docs/economy.md §2), and
 * the other two only where the entry is locked to them. The optional fields
 * are the roster's own — `crystalCost` and `biomassCost` on `UnitStats` and
 * `StructureStats` — so a roster entry is a `Priced` without adapting.
 */
export interface Priced {
  cost: number;
  crystalCost?: number;
  biomassCost?: number;
}

/**
 * A roster entry's price as the three accounts.
 *
 * The single place the roster's optional columns become a sum, which is what
 * makes "no drift between the shell and the server" a structural fact rather
 * than a discipline: neither side reads `cost`, `crystalCost` or
 * `biomassCost` itself.
 */
export function priceOf(stats: Priced): Price {
  return {
    nodules: stats.cost,
    crystal: stats.crystalCost ?? 0,
    biomass: stats.biomassCost ?? 0,
  };
}

/** True when every account covers its share of the price. */
export function affords(stockpile: Stockpile, price: Price): boolean {
  return ECONOMY_ACCOUNTS.every((account) => stockpile[account] >= price[account]);
}

/**
 * Debit the price. Does not check `affords` first, because a refusal is the
 * caller's to word — the server returns false, the bar greys the button, and
 * neither wants a throw.
 */
export function charge(stockpile: Stockpile, price: Price): void {
  for (const account of ECONOMY_ACCOUNTS) stockpile[account] -= price[account];
}

/** One account a stockpile falls short in, and by how much. */
export interface Shortfall {
  account: EconomyAccount;
  /** How much more of the account the price needs. Always positive. */
  short: number;
}

/**
 * Every account the stockpile falls short in, in `ECONOMY_ACCOUNTS` order —
 * empty exactly when `affords` is true.
 *
 * The shape a refusal is worded from. docs/ui-ux.md §7 rules out the silent
 * grey-out, and "80 crystal short" is a reason where "cannot afford" is a
 * shrug: it tells the player which of three readouts to watch.
 */
export function shortfall(stockpile: Stockpile, price: Price): Shortfall[] {
  const short: Shortfall[] = [];
  for (const account of ECONOMY_ACCOUNTS) {
    const missing = price[account] - stockpile[account];
    if (missing > 0) short.push({ account, short: missing });
  }
  return short;
}
