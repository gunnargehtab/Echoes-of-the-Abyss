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
 * Corvette in ≥ 12 s (two cycles)" for a 6.0 s gun. The time the gun is busy
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
const broadside = statsFor(UnitKind.Broadside);
const weaver = statsFor(UnitKind.Weaver);
const thurible = statsFor(UnitKind.Thurible);
const lance = statsFor(UnitKind.Lance);
const turret = structureStatsFor(StructureKind.SentinelTurret);
const bastion = structureStatsFor(StructureKind.Bastion);

describe('§9 time-to-kill bands', () => {
  // Every band below is ×1.5 the figure the table was first written with
  // (#463): the stretch went on the cooldown and not the damage, so the cycle
  // counts docs/units.md states are the same and only the seconds moved.
  // docs/systems-combat.md §9.5 is the argument for the length — a fight is
  // measured in the snapshots the loser can act in, and combatBeat.test.ts
  // counts those by playing the fights out.

  it('a Corvette kills a Light Scout in six seconds or less', () => {
    const t = ttkS(scout.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(t <= 6, `band is ≤ 6 s, got ${t.toFixed(2)} s`);
  });

  it('a Corvette duel lasts twelve to fifteen seconds', () => {
    // The centre of the whole design: the fight every player has most often,
    // and the number the rest of the roster is scaled against.
    const t = ttkS(corvette.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(t >= 12 && t <= 15, `band is 12-15 s, got ${t.toFixed(2)} s`);
  });

  it('a Cruiser kills a Corvette in about eight seconds', () => {
    const t = ttkS(corvette.maxHp, cruiser.attackDamage, cruiser.attackCooldownS);
    assert.ok(t >= 6.5 && t <= 9.5, `band is ~8 s, got ${t.toFixed(2)} s`);
  });

  it('a Corvette needs thirty-seven seconds to bring down a Cruiser with guns alone', () => {
    // "Anchors do not fall to chip damage" — the band that stops the cheapest
    // hull in the roster being the answer to the most expensive one. 37 is
    // 25 × 1.5 rounded down to the second the Klaxon still clears (below).
    const t = ttkS(cruiser.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(t >= 37, `band is ≥ 37 s, got ${t.toFixed(2)} s`);
  });

  it('...and still needs it under the Klaxon', () => {
    // The constraint that decided the Corvette's damage figure. The Consortium
    // bonus is a real multiplier on a real weapon, so a band that only held for
    // three of the four navies would not be a band. At any Corvette damage
    // above 51 this fails, which is why the figure is 50 and not 55.
    const boosted = corvette.attackDamage * FACTION_COMBAT.KLAXON.DAMAGE_MULTIPLIER;
    const t = ttkS(cruiser.maxHp, boosted, corvette.attackCooldownS);
    assert.ok(t >= 37, `the Klaxon must not breach the ≥ 37 s floor; got ${t.toFixed(2)} s`);

    // And the duel band survives the bonus too, at the fast end.
    const duel = ttkS(corvette.maxHp, boosted, corvette.attackCooldownS);
    assert.ok(duel >= 12, `a Klaxon duel still sits inside 12-15 s, got ${duel.toFixed(2)} s`);
  });

  it('the Clarion sits inside the same bands the Corvette is scaled against', () => {
    // #401. The Order's hull trades reach and alpha for a slower cycle, which
    // is a weapon change and therefore a §9 question rather than a §8 one:
    // whatever a Knight hull's noise does, a fight involving one still has to
    // feel like a fight in this game. All four bands, on the hull it is a peer
    // of.
    const vsScout = ttkS(scout.maxHp, clarion.attackDamage, clarion.attackCooldownS);
    assert.ok(vsScout <= 6, `a Clarion should kill a Light Scout in ≤ 6 s, got ${vsScout}`);

    const duel = ttkS(clarion.maxHp, clarion.attackDamage, clarion.attackCooldownS);
    assert.ok(duel >= 12 && duel <= 15, `a Clarion duel should sit in 12-15 s, got ${duel}`);

    const vsCruiser = ttkS(cruiser.maxHp, clarion.attackDamage, clarion.attackCooldownS);
    assert.ok(vsCruiser >= 37, `anchors do not fall to chip damage; got ${vsCruiser} s`);

    const byCruiser = ttkS(clarion.maxHp, cruiser.attackDamage, cruiser.attackCooldownS);
    assert.ok(
      byCruiser >= 6.5 && byCruiser <= 9.5,
      `a Cruiser kills one in ~8 s, got ${byCruiser}`
    );

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
    assert.ok(t >= 15 && t <= 21, `band is ~18 s, got ${t.toFixed(2)} s`);
  });

  it('a torpedo wounds a Corvette and a second one kills it; a Cruiser takes four', () => {
    // #463: the first hit is a lesson and not an obituary. Two of a magazine
    // of two still delete a Corvette, so the alpha strike is intact — it is
    // simply two decisions the defender failed rather than one.
    assert.ok(ORDNANCE.TORPEDO.DAMAGE < corvette.maxHp, 'a Corvette survives one torpedo...');
    assert.ok(ORDNANCE.TORPEDO.DAMAGE * 2 >= corvette.maxHp, '...and not two');
    assert.ok(ORDNANCE.TORPEDO.DAMAGE * 3 < cruiser.maxHp, 'a Cruiser survives three...');
    assert.ok(ORDNANCE.TORPEDO.DAMAGE * 4 >= cruiser.maxHp, '...and not four');
    // Wounded means wounded: a Corvette that took one is left with less than a
    // fifth of its hull, so the second torpedo is a question it cannot ignore.
    assert.ok(corvette.maxHp - ORDNANCE.TORPEDO.DAMAGE < corvette.maxHp / 5);
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
    assert.ok(dies <= 6, `a Corvette should kill a Chorister in ≤ 6 s, got ${dies.toFixed(2)} s`);

    const duel = ttkS(chorister.maxHp, chorister.attackDamage, chorister.attackCooldownS);
    assert.ok(duel >= 12 && duel <= 15, `a Chorister duel should sit in 12-15 s, got ${duel} s`);

    const alone = ttkS(corvette.maxHp, chorister.attackDamage, chorister.attackCooldownS);
    assert.ok(alone >= 27, `one Chorister should need ~30 s on a Corvette, got ${alone} s`);

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
    // "Kills a Corvette in ≥ 12 s (two cycles), a Bastion alone in ~135 s, and
    // dies to Corvette guns in ≥ 82 s — an anchor that does not fall to chip
    // damage, §9's rule for the Cruiser applied twice over."
    assert.equal(Math.ceil(corvette.maxHp / bulwark.attackDamage), 2, 'two cycles');
    const vsCorvette = cyclesS(corvette.maxHp, bulwark.attackDamage, bulwark.attackCooldownS);
    assert.ok(vsCorvette >= 12, `a Bulwark takes ≥ 12 s on a Corvette, got ${vsCorvette}`);

    const vsBastion = cyclesS(bastion.maxHp, bulwark.attackDamage, bulwark.attackCooldownS);
    assert.ok(vsBastion >= 120 && vsBastion <= 150, `~135 s on a Bastion alone, got ${vsBastion}`);

    const byCorvette = cyclesS(bulwark.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(byCorvette >= 82, `Corvette guns need ≥ 82 s, got ${byCorvette}`);

    // "The Klaxon is never off it": at rest it is above the +12% threshold, so
    // the two-cycle claim holds with the bonus on, which is how the hull is
    // actually fired. The Corvette side of the band is the generic gun — the
    // only Consortium Corvette that meets a Bulwark is in a mirror.
    assert.ok(bulwark.sigIdle > FACTION_COMBAT.KLAXON.SIG_THRESHOLD, 'loud by construction');
    const boosted = bulwark.attackDamage * FACTION_COMBAT.KLAXON.DAMAGE_MULTIPLIER;
    assert.equal(Math.ceil(corvette.maxHp / boosted), 2, 'still two cycles under the Klaxon');

    // §9's torpedo band, once more over: a Cruiser survives three and dies to
    // four; "a Bulwark survives six".
    assert.ok(ORDNANCE.TORPEDO.DAMAGE * 6 < bulwark.maxHp, 'survives six torpedoes');
    assert.ok(ORDNANCE.TORPEDO.DAMAGE * 7 >= bulwark.maxHp, '...and not seven');
    // And it out-reaches the static defence it is built to shoot from outside.
    assert.ok(bulwark.attackRangeM > turret.attackRangeM!, 'outranges a Sentinel Turret');
  });

  it('holds the Dredge to the bands docs/units.md states for it (#461)', () => {
    // "Kills a Corvette in ~12 s and a Cruiser in ~30 s; dies to Corvette guns
    // in ~50 s."
    const vsCorvette = cyclesS(corvette.maxHp, dredge.attackDamage, dredge.attackCooldownS);
    assert.ok(vsCorvette >= 10.5 && vsCorvette <= 13.5, `~12 s on a Corvette, got ${vsCorvette}`);
    const vsCruiser = cyclesS(cruiser.maxHp, dredge.attackDamage, dredge.attackCooldownS);
    assert.ok(vsCruiser >= 27 && vsCruiser <= 33, `~30 s on a Cruiser, got ${vsCruiser}`);
    const byCorvette = cyclesS(dredge.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(
      byCorvette >= 48 && byCorvette <= 54,
      `dies to a Corvette in ~50 s, got ${byCorvette}`
    );
  });

  it('holds the Reciter to the bands docs/units.md states for it (#461)', () => {
    // "Kills a Corvette in ~14 s and a Light Scout in two cycles; dies to a
    // Corvette in ~11 s if the Corvette gets there." The trade is the whole
    // hull: the longest gun in the roster on the thinnest combat hull.
    const vsCorvette = cyclesS(corvette.maxHp, reciter.attackDamage, reciter.attackCooldownS);
    assert.ok(vsCorvette >= 12 && vsCorvette <= 15, `~14 s on a Corvette, got ${vsCorvette}`);
    assert.equal(Math.ceil(scout.maxHp / reciter.attackDamage), 2, 'a Light Scout in two cycles');
    const byCorvette = cyclesS(reciter.maxHp, corvette.attackDamage, corvette.attackCooldownS);
    assert.ok(
      byCorvette >= 9 && byCorvette <= 12,
      `dies to a Corvette in ~11 s, got ${byCorvette}`
    );

    assert.ok(reciter.attackRangeM > cruiser.attackRangeM, 'outranges the Cruiser');
    assert.ok(reciter.maxHp < corvette.maxHp, 'and is the glass in "glass cannon"');
    // Under the energy class, like the Clarion: the weapon is the navy's.
    assert.equal(reciter.sigFiringBurst, FACTION_COMBAT.ENERGY.FIRING_SIG);
  });

  it('holds the ordnance hulls to §5\u2019s ammunition arithmetic (#507)', () => {
    // All four are ordnance rather than guns, so §9's gun bands do not reach
    // them. What does reach them is §5, "Ammunition": 350 a torpedo, a Corvette
    // dead to two and a Cruiser to four. A wave that quietly gave a hull a
    // heavier torpedo would move every one of those numbers at once, so the
    // magazines are held against the damage rather than against each other.
    const perFish = ORDNANCE.TORPEDO.DAMAGE;

    // The Broadside's magazine is exactly one Cruiser and no more. That is the
    // hull: twelve seconds of ordnance that kills the biggest thing in the
    // roster, and then ninety seconds of being a 700 HP hull with no weapon.
    assert.equal(broadside.torpedoMagazine, 4);
    assert.equal(Math.ceil(cruiser.maxHp / perFish), 4, 'a Cruiser takes four');
    assert.ok(
      broadside.torpedoMagazine! * perFish >= cruiser.maxHp,
      'a full Broadside should be able to finish a Cruiser'
    );
    assert.ok(
      (broadside.torpedoMagazine! - 1) * perFish < cruiser.maxHp,
      'and should have nothing left over when it does'
    );
    assert.equal(broadside.attackDamage, 0, 'and no gun to fall back on');

    // The Lance sells three of those four for a solution nothing can break.
    // Two Corvettes' worth of hull, one torpedo, and a cone to fire it through.
    assert.equal(lance.torpedoMagazine, 1);
    assert.equal(lance.coneLockedTorpedo, true);
    assert.equal(lance.attackDamage, 0);
    assert.ok(
      lance.torpedoMagazine! * perFish < corvette.maxHp * 2,
      'one shot is one shot, whatever it is worth'
    );

    // The Thurible's gun is not a line hull's and must not read as one: it is
    // there so the hull is not helpless between racks, and so `spawnUnit`
    // gives it the rack at all (§5, "any combat hull can deploy one").
    const vsCorvette = cyclesS(corvette.maxHp, thurible.attackDamage, thurible.attackCooldownS);
    assert.ok(
      vsCorvette > cyclesS(corvette.maxHp, corvette.attackDamage, corvette.attackCooldownS),
      `a Thurible must be worse than a Corvette at killing one, got ${vsCorvette} s`
    );
    assert.equal(thurible.depthChargeCooldownS, 6);
    assert.ok(
      thurible.depthChargeCooldownS! < ORDNANCE.DEPTH_CHARGE.COOLDOWN_S,
      'the rack is the weapon, so it cycles faster than everyone else\u2019s'
    );

    // The Weaver is unarmed, and that is the argument rather than an omission.
    // Held here for the Light Scout's reason: a later retune must not quietly
    // hand the Commune's liar a gun.
    assert.equal(weaver.attackDamage, 0);
    assert.equal(weaver.carriesTorpedoes, false);
    assert.equal(weaver.decoyMagazine, ORDNANCE.LAID_DECOY.MAGAZINE);
  });

  it('leaves the Light Scout unable to fight, whatever the retune did', () => {
    // Unbanded by §9, and deliberately so — docs/units.md says the scout
    // "finds things, it does not fight them". Scaled with the rest of the
    // roster so it did not become relatively harmless by accident, but it must
    // stay hopeless in absolute terms.
    const t = ttkS(corvette.maxHp, scout.attackDamage, scout.attackCooldownS);
    assert.ok(t > 30, `a scout should still take an age to kill a Corvette, got ${t.toFixed(0)} s`);
    assert.equal(damageMultiplierFor(Faction.Pelagia, 99), 1, 'and no doctrine rescues it');
  });
});
