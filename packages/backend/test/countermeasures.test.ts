/**
 * Countermeasures (#164) — docs/systems-combat.md §5.
 *
 * Without these a torpedo is slow hitscan, and §2's counter cycle has no
 * "guns beat torpedoes" leg at all. The two answers are deliberately different
 * shapes, and both are asserted here:
 *
 *   - a **noisemaker** works by being louder than the hull it protects, so it
 *     saves the hull by spending the formation's quiet. The decoy is not free
 *     and must never look free.
 *   - **point defence** is a gun choosing, not a shield. It costs the same
 *     cooldown as any other shot, which is what keeps a saturation volley an
 *     answer to it and gives the launcher a free cycle for every torpedo spent.
 *
 * Each answer is exercised in **both arms** — the defending hull idle, and the
 * defending hull under a standing attack order (#617). Whether a countermeasure
 * depends on what its owner happens to have ordered is a fact about the game
 * that a player has to be able to predict, so it is asserted rather than left
 * to whichever arm a test happened to be written in. Since #617 was decided,
 * none of the three depends on the order: a hull under an attack order keeps
 * its decoy, keeps its mine astern, and keeps its gun's answer. That equality
 * is the point rather than an accident of three separate tests, so it is
 * asserted as an equality where the arms can be compared directly.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent } from 'bitecs';
import { Faction, ORDNANCE, OrdnanceKind, SIM, UnitKind, statsFor } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import {
  Acoustic,
  Countermeasure,
  Health,
  Ordnance,
  Position,
  Weapon,
} from '../src/sim/components.ts';
import { launchTorpedo } from '../src/sim/systems/ordnance.ts';
import { Terrain } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

function openWaterMatch(seed = 3): Match {
  const terrain = new Terrain(12000, 12000, 200);
  const match = new Match(undefined, { fauna: false, seed, terrain });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  return match;
}

function liveOrdnanceOf(match: Match, kind: OrdnanceKind): number[] {
  const out: number[] = [];
  for (let eid = 0; eid < Ordnance.kind.length; eid++) {
    if (!hasComponent(match.world, Ordnance, eid)) continue;
    if (Ordnance.kind[eid] !== kind) continue;
    if (Health.hp[eid]! <= 0) continue;
    out.push(eid);
  }
  return out;
}

describe('countermeasures', () => {
  it('pulls a seeker onto the decoy, because the decoy is the louder thing', () => {
    // §5: seekers re-acquire, "the loudest emitter *now* wins — which is why
    // noisemakers work". If a seeker locked once and never looked again, the
    // whole countermeasure would be inert, so this is the test that keeps the
    // re-acquisition in the ordnance system honest.
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5500,
      y: 6000,
    });
    advance(match, 0.2);

    const torpedo = launchTorpedo(match.world, launcher, 5500, 6000);
    advance(match, 1);
    assert.equal(Ordnance.targetEid[torpedo], prey, 'the seeker should start on the hull');

    const decoy = match.deployNoisemaker(1, prey);
    assert.notEqual(decoy, 0, 'the suite should be ready');
    assert.ok(
      ORDNANCE.NOISEMAKER.SIG > statsFor(UnitKind.Cruiser).sigCruise,
      'the decoy must out-shout the loudest hull it could be protecting'
    );

    advance(match, ORDNANCE.TORPEDO.SEEKER_INTERVAL_S * 3);
    assert.equal(
      Ordnance.targetEid[torpedo],
      decoy,
      'the seeker should re-acquire onto the louder decoy'
    );
  });

  it('turns the seeker just the same while the hull it protects is under an order', () => {
    // The decoy arm of #617's both-arms rule. A noisemaker is an argument
    // between two sources of sound and the defender's order is not one of the
    // terms, so this is the same assertion as above with a live ordered target
    // on the hull being protected. It is here because "the order makes no
    // difference" is worth an assertion precisely where, one countermeasure
    // over, it makes all of it.
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5500,
      y: 6000,
    });
    advance(match, 0.2);

    // Written to the field rather than ordered through `Match`, which wants a
    // contact handle the defender has not been given: what is under test is the
    // state `combatSystem` reads, not the path that sets it.
    Weapon.orderedTargetEid[prey] = launcher;

    const torpedo = launchTorpedo(match.world, launcher, 5500, 6000);
    advance(match, 1);
    assert.equal(Ordnance.targetEid[torpedo], prey, 'the seeker should start on the hull');
    assert.equal(Weapon.orderedTargetEid[prey], launcher, 'and the order should still stand');

    const decoy = match.deployNoisemaker(1, prey);
    assert.notEqual(decoy, 0, 'an ordered hull can still deploy');

    advance(match, ORDNANCE.TORPEDO.SEEKER_INTERVAL_S * 3);
    assert.equal(
      Ordnance.targetEid[torpedo],
      decoy,
      'and the seeker should take the decoy regardless of what its target was told to shoot'
    );
  });

  it('does not let the torpedo destroy the decoy that beat it', () => {
    // A countermeasure that could be blown up by the weapon it defeated would
    // stop working at the exact moment it worked. The torpedo runs itself out
    // instead — which is the correct outcome: the shot is spent either way.
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4200,
      y: 6000,
    });
    advance(match, 0.2);
    launchTorpedo(match.world, launcher, 4200, 6000);
    const decoy = match.deployNoisemaker(1, prey);

    advance(match, 4);
    assert.ok(Health.hp[decoy]! > 0, 'the decoy should survive being chased');
    assert.ok(Health.hp[prey]! > 0, 'and the hull it protected should be alive');
  });

  it('makes the defender loud at their own position — the cost of the save', () => {
    // §13's guard-rail: "a noisemaker is real SIG 70 at your real position: it
    // saves the hull by feeding every other listener on the map." A decoy that
    // were quiet, or that appeared somewhere the defender was not, would be a
    // free escape and this design does not have one.
    const match = openWaterMatch();
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5000,
      y: 5000,
    });
    advance(match, 0.2);

    const decoy = match.deployNoisemaker(1, hull);
    advance(match, 0.1);

    assert.equal(Acoustic.sig[decoy], ORDNANCE.NOISEMAKER.SIG);
    const offset = Math.hypot(Position.x[decoy]! - 5000, Position.y[decoy]! - 5000);
    assert.ok(
      offset <= ORDNANCE.NOISEMAKER.DEPLOY_OFFSET_M + 1,
      `the decoy should be released beside the hull, not somewhere else (${offset} m away)`
    );
  });

  it('burns out, and the suite stays cold until its cooldown is served', () => {
    const match = openWaterMatch();
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5000,
      y: 5000,
    });
    advance(match, 0.2);

    assert.notEqual(match.deployNoisemaker(1, hull), 0);
    assert.equal(match.deployNoisemaker(1, hull), 0, 'a cold suite refuses');

    advance(match, ORDNANCE.NOISEMAKER.DURATION_S + 0.5);
    assert.equal(
      liveOrdnanceOf(match, OrdnanceKind.Noisemaker).length,
      0,
      'the decoy should burn out rather than shouting forever'
    );
    assert.ok(
      Countermeasure.cooldownRemainingS[hull]! > 0,
      'and the suite should still be recharging, since the cooldown outlasts the decoy'
    );

    advance(match, ORDNANCE.NOISEMAKER.COOLDOWN_S);
    assert.notEqual(match.deployNoisemaker(1, hull), 0, 'ready again once served');
  });

  it('shoots an inbound torpedo down inside terminal range', () => {
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    // The defender is armed and idle, so its gun is free for point defence.
    const defender = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4000,
      y: 6000,
    });
    advance(match, 0.2);

    launchTorpedo(match.world, launcher, 4000, 6000);
    // 1 km at 160 m/s: about six seconds, and the last 250 m of it is where
    // point defence gets its cycles.
    advance(match, 10);

    assert.equal(
      liveOrdnanceOf(match, OrdnanceKind.Torpedo).length,
      0,
      'the torpedo should not still be running'
    );
    assert.ok(
      Health.hp[defender]! === statsFor(UnitKind.Cruiser).maxHp,
      'and a Cruiser that shot it down should be untouched'
    );
  });

  it('looks for the torpedo whether or not an attack order stands', () => {
    // #617, decided: in §5's Countermeasures bullet *idle* means free this
    // cycle, not under no order. A standing attack order does not switch point
    // defence off, and §11.5's "an ordered target still overrides" is about
    // acquisition — a round already in the water is not an acquisition.
    //
    // This was a characterisation test one commit ago, recording the opposite
    // reading in the same two arms: the whole auto-acquire block, point defence
    // included, sat inside `if (!ordered)`, so a hull holding a live ordered
    // target never called `nearestInboundOrdnance` at all. It was not losing a
    // contention between two things it could shoot; it never ran the scan.
    // Three sections stated the rule with no condition on them (§2:50 "guns
    // beat torpedoes", §9.5 listing PD among the verbs a torpedoed hull *has*,
    // §13 pricing every PD cycle as free for the launcher) and one adjective in
    // §5 carried the other reading. The adjective went.
    //
    // The geometry keeps the two arms honest rather than arguable. The ordered
    // target is an unarmed Harvester 3 km away — a Cruiser reaches 900 m and
    // closes at 45 m/s, so the gun has nothing in range for the whole run and
    // the order can only ever be a distraction, never a competing shot. The
    // hold-posture carve-out does not apply either: this hull is not holding.
    // So an ordered arm that survives can only have survived by looking.
    const torpedoedWith = (ordered: boolean): { defenderHp: number; torpedoes: number } => {
      const match = openWaterMatch();
      const launcher = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 3000,
        y: 6000,
      });
      const quarry = spawnUnit(match.world, {
        kind: UnitKind.Harvester,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 4000,
        y: 9000,
      });
      const defender = spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 1,
        faction: Faction.Pelagia,
        x: 4000,
        y: 6000,
      });
      advance(match, 0.2);
      // Written to the field rather than ordered through `Match`, which wants a
      // contact handle the defender has not been given: what is under test is
      // the state `combatSystem` reads, not the path that sets it.
      if (ordered) Weapon.orderedTargetEid[defender] = quarry;

      launchTorpedo(match.world, launcher, 4000, 6000);
      advance(match, 10);

      if (ordered) {
        assert.equal(
          Weapon.orderedTargetEid[defender],
          quarry,
          'the order must stand for the whole run, or this arm measures nothing'
        );
      }
      assert.equal(Health.hp[launcher], statsFor(UnitKind.Corvette).maxHp, 'nothing shot back');
      return {
        defenderHp: Health.hp[defender]!,
        torpedoes: liveOrdnanceOf(match, OrdnanceKind.Torpedo).length,
      };
    };

    const idle = torpedoedWith(false);
    assert.equal(idle.torpedoes, 0, 'idle: the gun shoots the torpedo down');
    assert.equal(idle.defenderHp, statsFor(UnitKind.Cruiser).maxHp, 'and the hull is untouched');

    const underOrder = torpedoedWith(true);
    assert.equal(underOrder.torpedoes, 0, 'ordered: the gun shoots it down too');
    assert.equal(
      underOrder.defenderHp,
      statsFor(UnitKind.Cruiser).maxHp,
      'ordered: and the identical torpedo takes nothing off the identical hull'
    );
    // Stated as the equality rather than only as two readings, because the
    // equality is the rule: all three of §5's countermeasures now behave the
    // same under an order, so there is no exception here for a player to learn.
    assert.equal(
      underOrder.defenderHp,
      idle.defenderHp,
      'the order changes nothing about what the gun does to the round'
    );
  });

  it('goes back to shelling the ordered target once the round is dealt with', () => {
    // The other half of #617's decision: point defence is a gun *choosing*, not
    // a mode switch. `Weapon.orderedTargetEid` is never cleared on the point-
    // defence path, so the cycle after the round is dealt with, the hull is
    // shelling the launcher again. If the order were cancelled instead, a
    // player's attack order would be silently revoked by the enemy launching a
    // torpedo at them, which is a far worse bargain than the one §5 describes.
    //
    // Both facts are asserted on one board because either alone is satisfiable
    // the wrong way: an order that survives on a hull that has stopped firing
    // proves nothing, and damage on the quarry without a surviving order could
    // be a re-acquisition.
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3900,
      y: 6000,
    });
    // In range of the defender's gun and outside its 250 m point-defence
    // envelope, so the two targets are genuinely distinguishable: 400 m, under
    // a Corvette's 550 m reach. The launcher sits at 1,000 m, outside that
    // reach, so it is never a third thing the gun could have been shooting.
    const quarry = spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4500,
      y: 6000,
    });
    const defender = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4900,
      y: 6000,
    });
    advance(match, 0.2);
    Weapon.orderedTargetEid[defender] = quarry;
    const quarryFull = Health.hp[quarry]!;

    launchTorpedo(match.world, launcher, 4900, 6000);
    // Long enough for the round to be resolved and for the gun to land shots
    // on the quarry afterwards, and short enough that the quarry is still
    // alive: a Harvester has 300 HP, and an order whose target has died is
    // cleared by design, which would make the surviving-order assertion below
    // measure the clock rather than the rule.
    advance(match, 8);

    assert.equal(
      liveOrdnanceOf(match, OrdnanceKind.Torpedo).length,
      0,
      'the ordered gun still answered the round'
    );
    assert.equal(
      Health.hp[defender],
      statsFor(UnitKind.Corvette).maxHp,
      'and took nothing from it'
    );
    assert.equal(
      Weapon.orderedTargetEid[defender],
      quarry,
      'the order is not cancelled by the interception'
    );
    assert.ok(
      Health.hp[quarry]! < quarryFull,
      'and the quarry is still being shelled, so the gun went back to it'
    );
  });

  it('cannot engage ordnance that carries no hull to shoot off', () => {
    // §5 gives a torpedo 40 HP and nothing else any. That is what keeps a
    // minefield a wall you route around rather than one you shoot down, and it
    // is expressed as a stat rather than as a rule about mines specifically.
    assert.ok(
      ORDNANCE.TORPEDO.MAX_HP > 0,
      'a torpedo must be interceptable, or point defence has no job'
    );
    for (const kind of [OrdnanceKind.Mine, OrdnanceKind.Noisemaker, OrdnanceKind.DepthCharge]) {
      assert.equal(
        liveOrdnanceOf(openWaterMatch(), kind).length,
        0,
        'sanity: a fresh match has no ordnance in the water'
      );
    }
  });

  it('spends a real gun cycle, so point defence is a choice and not a shield', () => {
    // §13: "PD is a gun choosing targets ... every cycle it spends on ordnance
    // is free for the launcher." Asserted as behaviour: while a defender is
    // busy shooting a torpedo, the hull that launched it takes less fire than
    // it otherwise would.
    //
    // The geometry is chosen so the defender's gun genuinely comes up while
    // the torpedo is inside terminal range. A Corvette, not a Cruiser: the
    // terminal window is 250 m at 160 m/s, which is 1.56 s, and a Cruiser's
    // 2.5 s cycle is longer than that. Writing this test against a Cruiser
    // produced a *true* result — a heavy hull is a poor point-defence platform,
    // which is why §11 gives the doctrine to the Consortium and their flak —
    // but it proves nothing about whether the cycle was spent.
    //
    // Both hulls are inside each other's 550 m reach, so the control has the
    // defender shooting continuously, and the window closes before the torpedo
    // arrives — measuring after impact would confuse "diverted a cycle" with
    // "the defender was dead".
    const WINDOW_S = 3;
    const launcherDamage = (withTorpedo: boolean): number => {
      const match = openWaterMatch(19);
      const attacker = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 4500,
        y: 6000,
      });
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction: Faction.Pelagia,
        x: 5000,
        y: 6000,
      });
      advance(match, 0.2);
      if (withTorpedo) launchTorpedo(match.world, attacker, 5000, 6000);
      advance(match, WINDOW_S);
      return statsFor(UnitKind.Corvette).maxHp - Health.hp[attacker]!;
    };

    const distracted = launcherDamage(true);
    const undistracted = launcherDamage(false);

    assert.ok(
      distracted < undistracted,
      `a defender busy with point defence should land less on the launcher ` +
        `(${distracted} vs ${undistracted})`
    );
  });
});
