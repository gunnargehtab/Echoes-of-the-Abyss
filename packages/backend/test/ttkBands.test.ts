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

/**
 * The same kill, counted the way docs/units.md counts it for the rung's
 * roster: in *cycles*, each shot with its cooldown behind it — "kills a
 * Corvette in ≥ 8 s (two cycles)" for a 4.0 s gun. The time the gun is busy
 * rather than the time to the killing shot; one cooldown apart from `ttkS`,
 * and the doc's figures for the Bulwark, Dredge and Reciter are all stated in
 * this accounting, so this is what holds them to it.
 */
function cyclesS(hp: number, damage: number, cooldownS: number): number {
  return Math.ceil(hp / damage) * cooldownS;
}

const scout = statsFor(UnitKind.LightScout);
const corvette = statsFor(UnitKind.Corvette);
const cruiser = statsFor(UnitKind.Cruiser);
const chorister = statsFor(UnitKind.Chorister);
const clarion = statsFor(UnitKind.Clarion);
const bulwark = statsFor(UnitKind.Bulwark);
const dredge = statsFor(UnitKind.Dredge);
const reciter = statsFor(UnitKind.Reciter);
const turret = structureStatsFor(StructureKind.SentinelTurret);
const bastion = structureStatsFor(StructureKind.Bastion);

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

  it('the Clarion sits inside the same bands the Corvette is scaled against', () => {
    // #401. The Order's hull trades reach and alpha for a slower cycle, which
    // is a weapon change and therefore a §9 question rather than a §8 one:
    // whatever a Knight hull's noise does, a fight involving one still has to
    // feel like a fight in this game. All four bands, on the hull it is a peer
    // of.
    const vsScout = ttkS(scout.maxHp, clarion.attackDamage, clarion.attackCooldownS);
    assert.ok(vsScout <= 4, `a Clarion should kill a Light Scout in ≤ 4 s, got ${vsScout}`);

    const duel = ttkS(clarion.maxHp, clarion.attackDamage, clarion.attackCooldownS);
    assert.ok(duel >= 8 && duel <= 10, `a Clarion duel should sit in 8-10 s, got ${duel}`);

    const vsCruiser = ttkS(cruiser.maxHp, clarion.attackDamage, clarion.attackCooldownS);
    assert.ok(vsCruiser >= 25, `anchors do not fall to chip damage; got ${vsCruiser} s`);

    const byCruiser = ttkS(clarion.maxHp, cruiser.attackDamage, cruiser.attackCooldownS);
    assert.ok(byCruiser >= 4 && byCruiser <= 6, `a Cruiser kills one in ~5 s, got ${byCruiser}`);

    // And the trade itself, stated as arithmetic rather than as a comment: it
    // reaches further and hits harder per shot than the Corvette, and pays for
    // both in sustained damage. A retune that made it simply better would make
    // the Corvette pointless for the one navy that can build either.
    assert.ok(clarion.attackRangeM > corvette.attackRangeM, 'the lance is the longer weapon');
    assert.ok(clarion.attackDamage > corvette.attackDamage, 'and the heavier discharge');
    assert.ok(
      clarion.attackDamage / clarion.attackCooldownS <
        corvette.attackDamage / corvette.attackCooldownS,
      'paid for on the cycle: sustained damage stays under the Corvette’s'
    );
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

  it('holds the Bulwark to the bands docs/units.md states for it (#461)', () => {
    // "Kills a Corvette in ≥ 8 s (two cycles), a Bastion alone in ~90 s, and
    // dies to Corvette guns in ≥ 55 s — an anchor that does not fall to chip
    // damage, §9's rule for the Cruiser applied twice over."
    assert.equal(Math.ceil(corvette.maxHp / bulwark.attackDamage), 2, 'two cycles');
    const vsCorvette = cyclesS(corvette.maxHp, bulwark.attackDamage, bulwark.attackCooldownS);
    assert.ok(vsCorvette >= 8, `a Bulwark takes ≥ 8 s on a Corvette, got ${vsCorvette}`);

    const vsBastion = cyclesS(bastion.maxHp, bulwark.attackDamage, bulwark.attackCooldownS);
    assert.ok(vsBastion >= 80 && vsBastion <= 100, `~90 s on a Bastion alone, got ${vsBastion}`);

    const byCorvette = cyclesS(bulwark.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(byCorvette >= 55, `Corvette guns need ≥ 55 s, got ${byCorvette}`);

    // "The Klaxon is never off it": at rest it is above the +12% threshold, so
    // the two-cycle claim holds with the bonus on, which is how the hull is
    // actually fired. The Corvette side of the band is the generic gun — the
    // only Consortium Corvette that meets a Bulwark is in a mirror.
    assert.ok(bulwark.sigIdle > FACTION_COMBAT.KLAXON.SIG_THRESHOLD, 'loud by construction');
    const boosted = bulwark.attackDamage * FACTION_COMBAT.KLAXON.DAMAGE_MULTIPLIER;
    assert.equal(Math.ceil(corvette.maxHp / boosted), 2, 'still two cycles under the Klaxon');

    // §9's torpedo band, once more over: a Cruiser survives one and dies to
    // two; "a Bulwark survives three".
    assert.ok(ORDNANCE.TORPEDO.DAMAGE * 3 < bulwark.maxHp, 'survives three torpedoes');
    assert.ok(ORDNANCE.TORPEDO.DAMAGE * 4 >= bulwark.maxHp, '...and not four');
    // And it out-reaches the static defence it is built to shoot from outside.
    assert.ok(bulwark.attackRangeM > turret.attackRangeM!, 'outranges a Sentinel Turret');
  });

  it('holds the Dredge to the bands docs/units.md states for it (#461)', () => {
    // "Kills a Corvette in ~8 s and a Cruiser in ~20 s; dies to Corvette guns
    // in ~34 s."
    const vsCorvette = cyclesS(corvette.maxHp, dredge.attackDamage, dredge.attackCooldownS);
    assert.ok(vsCorvette >= 7 && vsCorvette <= 9, `~8 s on a Corvette, got ${vsCorvette}`);
    const vsCruiser = cyclesS(cruiser.maxHp, dredge.attackDamage, dredge.attackCooldownS);
    assert.ok(vsCruiser >= 18 && vsCruiser <= 22, `~20 s on a Cruiser, got ${vsCruiser}`);
    const byCorvette = cyclesS(dredge.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(
      byCorvette >= 32 && byCorvette <= 36,
      `dies to a Corvette in ~34 s, got ${byCorvette}`
    );
  });

  it('holds the Reciter to the bands docs/units.md states for it (#461)', () => {
    // "Kills a Corvette in ~9 s and a Light Scout in two cycles; dies to a
    // Corvette in ~7 s if the Corvette gets there." The trade is the whole
    // hull: the longest gun in the roster on the thinnest combat hull.
    const vsCorvette = cyclesS(corvette.maxHp, reciter.attackDamage, reciter.attackCooldownS);
    assert.ok(vsCorvette >= 8 && vsCorvette <= 10, `~9 s on a Corvette, got ${vsCorvette}`);
    assert.equal(Math.ceil(scout.maxHp / reciter.attackDamage), 2, 'a Light Scout in two cycles');
    const byCorvette = cyclesS(reciter.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(byCorvette >= 6 && byCorvette <= 8, `dies to a Corvette in ~7 s, got ${byCorvette}`);

    assert.ok(reciter.attackRangeM > cruiser.attackRangeM, 'outranges the Cruiser');
    assert.ok(reciter.maxHp < corvette.maxHp, 'and is the glass in "glass cannon"');
    // Under the energy class, like the Clarion: the weapon is the navy's.
    assert.equal(reciter.sigFiringBurst, FACTION_COMBAT.ENERGY.FIRING_SIG);
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
