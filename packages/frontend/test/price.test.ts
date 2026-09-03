/**
 * The HUD's price wording — price.ts, against docs/ui-ux.md §7 and
 * docs/economy.md §2.
 *
 * Two things are held here. The formats themselves, which the command bar's
 * overflow rule depends on (a price is one token, or the rule leaves half of
 * it standing). And the parity claim behind the whole feature: the shell's
 * label is `priceOf` written out, the same sum the server charges, so the
 * Abyssal Submersible's crystal appears on its button because it appears in
 * its price — not because somebody remembered to add it.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { STRUCTURE_STATS, StructureKind, UNIT_STATS, UnitKind, priceOf } from '@echoes/shared';
import type { Price, Stockpile } from '@echoes/shared';
import { priceTag, priceWords, shortfallLine } from '../src/game/price.ts';

const price = (nodules: number, crystal = 0, biomass = 0): Price => ({
  nodules,
  crystal,
  biomass,
});
const banked = (nodules: number, crystal = 0, biomass = 0): Stockpile => ({
  nodules,
  crystal,
  biomass,
});

describe('priceTag', () => {
  it('writes every account the price names, nodules bare and the rest suffixed', () => {
    assert.equal(priceTag(price(120)), '120');
    assert.equal(priceTag(price(260, 80)), '260+80c');
    assert.equal(priceTag(price(40, 0, 35)), '40+35b');
    assert.equal(priceTag(price(0, 120, 60)), '120c+60b');
    assert.equal(priceTag(price(0)), '0');
  });

  it('is one token, so the bar’s overflow rule keeps the whole price or none of it', () => {
    // drawCommandBar fits a phone by keeping each label's first word: a price
    // with a space in it would survive that as a fragment.
    for (const stats of [...Object.values(UNIT_STATS), ...Object.values(STRUCTURE_STATS)]) {
      assert.doesNotMatch(priceTag(priceOf(stats)), /\s/, `${stats.name}'s tag has a space`);
    }
    assert.doesNotMatch(priceTag(price(260, 80, 35)), /\s/);
  });
});

describe('priceWords', () => {
  it('spells the accounts out for the hint bar', () => {
    assert.equal(priceWords(price(300)), '300 nodules');
    assert.equal(priceWords(price(300, 120)), '300 nodules, 120 crystal');
    assert.equal(priceWords(price(0, 0, 35)), '35 biomass');
    assert.equal(priceWords(price(0)), 'nothing');
  });
});

describe('shortfallLine', () => {
  it('is null when the price is covered', () => {
    assert.equal(shortfallLine('Corvette', banked(120), price(120)), null);
    assert.equal(shortfallLine('Cantor', banked(1000, 1000, 1000), price(300, 120)), null);
  });

  it('names the account it fell short in, by how much', () => {
    assert.equal(
      shortfallLine('Abyssal Submersible', banked(5000, 0, 0), price(260, 80)),
      'Abyssal Submersible: 80 crystal short'
    );
    assert.equal(
      shortfallLine('Cantor', banked(200, 0, 0), price(300, 120)),
      'Cantor: 100 nodules, 120 crystal short'
    );
    assert.equal(
      shortfallLine('Cohort', banked(5000, 5000, 12), price(40, 0, 35)),
      'Cohort: 23 biomass short'
    );
  });

  it('rounds a fractional shortfall up, never down', () => {
    // 26.25 Biomass banked against 35: 8.75 short, and "8 short" would be a
    // figure the next rendering fails to cover.
    assert.equal(
      shortfallLine('Cohort', banked(0, 0, 26.25), price(0, 0, 35)),
      'Cohort: 9 biomass short'
    );
  });

  it('carries no clause separator, so the hint bar never trims it', () => {
    const line = shortfallLine('Cantor', banked(0, 0, 0), price(300, 120, 60));
    assert.ok(line !== null);
    assert.doesNotMatch(line, /·/);
  });
});

describe('parity with the roster', () => {
  it('shows the Submersible’s crystal because its price carries it', () => {
    // The one crystal-locked hull (docs/economy.md §8). Before the label was
    // built from `priceOf` it read `SUB 260`, and a player with no crystal
    // pressed a button the server refused without a word.
    assert.equal(priceTag(priceOf(UNIT_STATS[UnitKind.AbyssalSubmersible])), '260+80c');
    assert.equal(priceTag(priceOf(STRUCTURE_STATS[StructureKind.Cantor])), '300+120c');
    assert.equal(priceTag(priceOf(UNIT_STATS[UnitKind.Corvette])), '120');
  });

  it('shows the Chorister’s Biomass, the roster’s one cohort price', () => {
    // docs/units.md (#352). The button was worded for this the day the
    // column shipped; this is the day it has something to say.
    assert.equal(priceTag(priceOf(UNIT_STATS[UnitKind.Chorister])), '30+20b');
    assert.equal(
      shortfallLine('Chorister', banked(1000, 0, 16.5), priceOf(UNIT_STATS[UnitKind.Chorister])),
      'Chorister: 4 biomass short'
    );
  });
});
