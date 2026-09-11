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
 * to whichever arm a test happened to be written in. Two of the three do not
 * depend on the order. The third does, and the test that says so says why.
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

  it('does not look for the torpedo at all while an attack order stands', () => {
    // A characterisation test (#617): it records what the simulation does
    // today, in both arms, and it is deliberately not a statement that today's
    // answer is right.
    //
    // `combatSystem` reads the ordered target, and the whole auto-acquire block
    // — point defence included — sits inside `if (!ordered)`. So a hull with a
    // live ordered target never calls `nearestInboundOrdnance`: it is not
    // losing a contention between two things it could shoot, it never runs the
    // scan. The geometry makes that unmistakable rather than arguable. The
    // ordered target is an unarmed Harvester 3 km away — a Cruiser reaches 900
    // and closes at 45 m/s, so the gun has nothing in range for the whole run
    // and fires at nothing. The single existing carve-out does not apply: it is
    // for a hull in *hold* posture, and this one is not.
    //
    // The text this rests on is §5's Countermeasures bullet — guns engage
    // torpedoes in their terminal 250 m "if the gun is idle". That adjective
    // carries both readings. *Idle* can mean free this cycle, which is how the
    // very next sentence prices point defence ("every cycle spent on a torpedo
    // is a cycle not spent on the hull that launched it"), and then the code is
    // wrong. It can equally mean under no order, which is what the code
    // implements, and then §2:50, §9.5:532 and §13:676 are each stating the
    // rule without its condition. Nothing in docs/ resolves it, so #617
    // reserves the call for the owner. Whichever way it lands, this test
    // changes shape rather than being deleted — it is the both-arms coverage
    // the other two countermeasures in this file have.
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
    assert.equal(
      underOrder.defenderHp,
      statsFor(UnitKind.Cruiser).maxHp - ORDNANCE.TORPEDO.DAMAGE,
      'ordered: the identical torpedo arrives, and takes the whole 350'
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
