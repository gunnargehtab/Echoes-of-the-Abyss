/**
 * Time-to-kill bands (#169) — docs/systems-combat.md §9.
 *
 * §9 is the one part of the combat spec that is SPEC *as numbers*. Everything
 * else in that document fixes a shape and leaves the figures TUNABLE; the bands
 * fix what a fight feels like, and the weapon stats in `units.ts` and
 * `structures.ts` are solved from them rather than chosen. So this file is not
 * a tuning test — it is the assertion that the tuning still means what the
 * design says it means.
 *
 * Measured as arithmetic rather than by simulating duels. A duel would fold in
 * separation, terrain, auto-acquire and whichever hull happened to fire first,
 * and the band is a claim about the *weapon*, not about a particular
 * engagement. The arithmetic is exactly what the combat loop does: a shot
 * lands, the cooldown runs, the next shot lands.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FACTION_COMBAT,
  Faction,
  ORDNANCE,
  StructureKind,
  UnitKind,
  damageMultiplierFor,
  statsFor,
  structureStatsFor,
} from '@echoes/shared';

/**
 * Seconds for a weapon doing `damage` every `cooldownS` to remove `hp`.
 *
 * The first shot lands at t=0, so a kill in n shots takes (n-1) cooldowns —
 * the same accounting the combat system performs, where a discharge and its
 * cooldown are set in the same tick.
 */
function ttkS(hp: number, damage: number, cooldownS: number): number {
  return (Math.ceil(hp / damage) - 1) * cooldownS;
}

const scout = statsFor(UnitKind.LightScout);
const corvette = statsFor(UnitKind.Corvette);
const cruiser = statsFor(UnitKind.Cruiser);
const chorister = statsFor(UnitKind.Chorister);
const turret = structureStatsFor(StructureKind.SentinelTurret);

describe('§9 time-to-kill bands', () => {
  it('a Corvette kills a Light Scout in four seconds or less', () => {
    const t = ttkS(scout.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(t <= 4, `band is ≤ 4 s, got ${t.toFixed(2)} s`);
  });

  it('a Corvette duel lasts eight to ten seconds', () => {
    // The centre of the whole design: the fight every player has most often,
    // and the number the rest of the roster is scaled against.
    const t = ttkS(corvette.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(t >= 8 && t <= 10, `band is 8-10 s, got ${t.toFixed(2)} s`);
  });

  it('a Cruiser kills a Corvette in about five seconds', () => {
    const t = ttkS(corvette.maxHp, cruiser.attackDamage, cruiser.attackCooldownS);
    assert.ok(t >= 4 && t <= 6, `band is ~5 s, got ${t.toFixed(2)} s`);
  });

  it('a Corvette needs twenty-five seconds to bring down a Cruiser with guns alone', () => {
    // "Anchors do not fall to chip damage" — the band that stops the cheapest
    // hull in the roster being the answer to the most expensive one.
    const t = ttkS(cruiser.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(t >= 25, `band is ≥ 25 s, got ${t.toFixed(2)} s`);
  });

  it('...and still needs it under the Klaxon', () => {
    // The constraint that decided the Corvette's damage figure. The Consortium
    // bonus is a real multiplier on a real weapon, so a band that only held for
    // three of the four navies would not be a band. At any Corvette damage
    // above 51 this fails, which is why the figure is 50 and not 55.
    const boosted = corvette.attackDamage * FACTION_COMBAT.KLAXON.DAMAGE_MULTIPLIER;
    const t = ttkS(cruiser.maxHp, boosted, corvette.attackCooldownS);
    assert.ok(t >= 25, `the Klaxon must not breach the ≥ 25 s floor; got ${t.toFixed(2)} s`);

    // And the duel band survives the bonus too, at the fast end.
    const duel = ttkS(corvette.maxHp, boosted, corvette.attackCooldownS);
    assert.ok(duel >= 8, `a Klaxon duel still sits inside 8-10 s, got ${duel.toFixed(2)} s`);
  });

  it('a Sentinel Turret deters a Corvette rather than deleting it', () => {
    const t = ttkS(corvette.maxHp, turret.attackDamage!, turret.attackCooldownS!);
    assert.ok(t >= 10 && t <= 14, `band is ~12 s, got ${t.toFixed(2)} s`);
  });

  it('a torpedo kills a Corvette outright and a Cruiser in two', () => {
    assert.ok(ORDNANCE.TORPEDO.DAMAGE >= corvette.maxHp, 'one torpedo should finish a Corvette');
    assert.ok(ORDNANCE.TORPEDO.DAMAGE < cruiser.maxHp, 'a Cruiser survives one...');
    assert.ok(ORDNANCE.TORPEDO.DAMAGE * 2 >= cruiser.maxHp, '...and not two');
  });

  it('a mine kills a Light Scout and only wounds a Corvette', () => {
    assert.ok(ORDNANCE.MINE.DAMAGE >= scout.maxHp, 'a scout caught in a blast dies');
    assert.ok(
      ORDNANCE.MINE.DAMAGE < corvette.maxHp,
      'a Corvette survives one — a minefield kills in numbers or not at all'
    );
  });

  it('point defence can actually kill a torpedo, which §5 requires', () => {
    // "One or two gun cycles kill it." Before the §9 retune a Corvette needed
    // two cycles — 2.4 s — against the 1.56 s a torpedo spends inside terminal
    // range, so point defence could not work at all and the counter cycle in
    // §2 had a missing leg. The retune fixed that as a side effect, and this
    // keeps it fixed.
    const cyclesNeeded = Math.ceil(ORDNANCE.TORPEDO.MAX_HP / corvette.attackDamage);
    assert.ok(
      cyclesNeeded <= 2,
      `a Corvette should down a torpedo in one or two cycles, needs ${cyclesNeeded}`
    );
    const windowS = ORDNANCE.POINT_DEFENCE.RANGE_M / ORDNANCE.TORPEDO.SPEED_MPS;
    assert.ok(
      (cyclesNeeded - 1) * corvette.attackCooldownS <= windowS,
      'and it should fit inside the terminal window rather than being theoretical'
    );
  });

  it('prices "expendable" as arithmetic: the cohort hull dies inside the Scout’s band', () => {
    // Not a §9 band — the Chorister postdates the table — but the claims
    // docs/units.md makes for it (#352), held here so a retune is noticed. A
    // Corvette kills one as fast as it kills a scout; a Chorister duel lasts
    // as long as a Corvette duel, so a cohort against a cohort is the same
    // fight at a sixth of the price; and one alone takes twenty seconds
    // against a Corvette, which is the arithmetic of "very many".
    const dies = ttkS(chorister.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(dies <= 4, `a Corvette should kill a Chorister in ≤ 4 s, got ${dies.toFixed(2)} s`);

    const duel = ttkS(chorister.maxHp, chorister.attackDamage, chorister.attackCooldownS);
    assert.ok(duel >= 8 && duel <= 10, `a Chorister duel should sit in 8-10 s, got ${duel} s`);

    const alone = ttkS(corvette.maxHp, chorister.attackDamage, chorister.attackCooldownS);
    assert.ok(alone >= 18, `one Chorister should need ~20 s on a Corvette, got ${alone} s`);

    // Numbers are the answer, and they are a worse answer to an anchor than
    // two Corvettes are: three cohort hulls cost less than one Corvette in
    // Nodules and still do not breach the ≥ 25 s floor's spirit faster than a
    // second Corvette would.
    const threeOnCruiser = ttkS(
      cruiser.maxHp,
      chorister.attackDamage * 3,
      chorister.attackCooldownS
    );
    const twoCorvettes = ttkS(cruiser.maxHp, corvette.attackDamage * 2, corvette.attackCooldownS);
    assert.ok(
      threeOnCruiser > twoCorvettes,
      'three cohort hulls are slower on a Cruiser than two Corvettes'
    );
  });

  it('leaves the Light Scout unable to fight, whatever the retune did', () => {
    // Unbanded by §9, and deliberately so — docs/units.md says the scout
    // "finds things, it does not fight them". Scaled with the rest of the
    // roster so it did not become relatively harmless by accident, but it must
    // stay hopeless in absolute terms.
    const t = ttkS(corvette.maxHp, scout.attackDamage, scout.attackCooldownS);
    assert.ok(t > 20, `a scout should still take an age to kill a Corvette, got ${t.toFixed(0)} s`);
    assert.equal(damageMultiplierFor(Faction.Pelagia, 99), 1, 'and no doctrine rescues it');
  });
});
