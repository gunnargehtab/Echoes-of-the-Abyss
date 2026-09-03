/**
 * How a price is written on the HUD — docs/economy.md §2's three banked
 * accounts, in the shell's shorthand.
 *
 * Everything here formats a `Price` that came out of `priceOf`, the same sum
 * the server charges through (economy.ts in @echoes/shared). The shell never
 * adds a number of its own, so what a button says and what the server debits
 * are one figure written twice. The shortfall wording is the other half of
 * docs/ui-ux.md §7: a greyed button carries its reason, and for a price the
 * reason is the account it fell short in.
 */

import {
  ECONOMY_ACCOUNTS,
  shortfall,
  type EconomyAccount,
  type Price,
  type Stockpile,
} from '@echoes/shared';

/**
 * The bar's suffix per account. Nodules carry none: they are the bulk
 * resource every price is written in, and the top strip's first readout.
 */
const TAG_SUFFIX: Record<EconomyAccount, string> = {
  nodules: '',
  crystal: 'c',
  biomass: 'b',
};

/** The account as the top strip names it, lower-cased for a sentence. */
const ACCOUNT_WORD: Record<EconomyAccount, string> = {
  nodules: 'nodules',
  crystal: 'crystal',
  biomass: 'biomass',
};

/**
 * `260+80c` — every account the price names, as one token.
 *
 * One token with no spaces, because the command bar's overflow rule keeps a
 * button's first word and drops the rest to fit a phone, and a price that
 * split into words would leave `260+` standing. A price that names nothing
 * is written `0`, so a free thing still shows a figure.
 */
export function priceTag(price: Price): string {
  const parts = ECONOMY_ACCOUNTS.filter((account) => price[account] > 0).map(
    (account) => `${price[account]}${TAG_SUFFIX[account]}`
  );
  return parts.length > 0 ? parts.join('+') : '0';
}

/** `300 nodules, 120 crystal` — the same price, for a sentence on the hint bar. */
export function priceWords(price: Price): string {
  const parts = ECONOMY_ACCOUNTS.filter((account) => price[account] > 0).map(
    (account) => `${price[account]} ${ACCOUNT_WORD[account]}`
  );
  return parts.length > 0 ? parts.join(', ') : 'nothing';
}

/**
 * `Cantor: 120 crystal short` — why this price is refused, or null when it
 * is not.
 *
 * Rounded up, never down: Biomass is banked in fractions (a rendering under a
 * strained region pays three quarters), and "8 short" against 8.75 owed would
 * be a figure the next rendering fails to cover. No `  ·  ` separators, so
 * the hint bar's clause trimming never shortens a refusal.
 */
export function shortfallLine(name: string, stockpile: Stockpile, price: Price): string | null {
  const short = shortfall(stockpile, price);
  if (short.length === 0) return null;
  const owed = short.map((s) => `${Math.ceil(s.short)} ${ACCOUNT_WORD[s.account]}`);
  return `${name}: ${owed.join(', ')} short`;
}
