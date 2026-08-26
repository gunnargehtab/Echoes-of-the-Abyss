/**
 * Weapons cold — docs/mission-sorrowgate.md §3, and the two gates that enforce
 * it (#190).
 *
 * §3 reads the prohibition as three clauses and insists code read it as three:
 * no weapon, no countermeasure, no transmit. It is also explicit that the court
 * strikes the hardpoints *in front of all four parties* rather than disabling
 * anything quietly, and that **every hull admitted to the chamber is admitted
 * weapons-cold, not only the flight** — because hostility in this simulation is
 * `Owner.slot` with no notion of neutrality, so five armed parties parked
 * around one exchange would open fire on the first tick.
 *
 * There are therefore two separate mechanisms, and this file separates them,
 * because each covers a hole the other cannot reach:
 *
 * 1. **The spawn.** `weaponsCold` withholds `Weapon`, `Magazine` and
 *    `Countermeasure`, and that is what stops `combatSystem` — which returns
 *    fire at anything hostile in range with no order ever being issued, and
 *    whose query drops a Weapon-less hull entirely. An order-layer gate cannot
 *    reach auto-engagement, so this one has to be a property of the data.
 * 2. **The order layer.** `MissionRuntime.denies` refuses the six locked
 *    abilities for the player's slot. It exists for the things auto-engagement
 *    never does: pinging, mining, decoys. The trap in testing it is that on a
 *    weapons-cold hull every one of those returns nothing *anyway*, so a test
 *    that used the mission's own hulls would pass against a runtime that
 *    denied nothing at all. Every gate test below therefore spawns its own
 *    armed hull onto the player's slot, checks it really is armed, and then
 *    shows the order still does nothing.
 *
 * Nothing here steps a match for longer than it takes to get a snapshot: these
 * are properties of the opening position and of the command paths, and both are
 * true at tick zero or not at all.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Faction, SIM, StructureKind, UnitKind, statsFor } from '@echoes/shared';
import { hasComponent } from 'bitecs';
import {
  ActivePing,
  Countermeasure,
  Magazine,
  Owner,
  Unit,
  Weapon,
} from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import { economyFor, spawnUnit, type SimWorld } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = PROLOGUE_SORROWGATE.playerSlot;
/** The arch, where the flight is admitted. Any water in the chamber will do. */
const ARCH = { x: 2550, y: 2150, depth: 1450 };

function missionMatch(): Match {
  const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
  return new Match(map, { mission: PROLOGUE_SORROWGATE, fauna: false, seed: 11 });
}

/**
 * Every hull this world spawned, and only this world's.
 *
 * Read from `world.eidOfLocal` rather than by scanning the component arrays:
 * bitecs ids come from a process-global counter, so a scan sees every entity
 * every other test in this process created, on their own maps. That trap has
 * already broken the state hash and the replays once each, and `maps.test.ts`
 * carries the same warning. The local-id registry is per world, so this is
 * exactly the mission's own order of battle and nothing else.
 */
function hullsOf(world: SimWorld): number[] {
  const hulls: number[] = [];
  for (const eid of world.eidOfLocal.values()) {
    if (hasComponent(world, Unit, eid) && hasComponent(world, Owner, eid)) hulls.push(eid);
  }
  return hulls;
}

/**
 * A fully armed hull, dropped onto a slot the mission has locked.
 *
 * The point of the whole file: a Corvette carries all three of the components
 * the cold spawn withholds, so an order refused on this hull was refused by the
 * mission and not by an absent component. A fresh one per call, because the
 * countermeasure suite shares one cooldown between decoys and depth charges and
 * a second call on the same hull would be refused for a reason nobody is
 * testing.
 */
function armedHull(match: Match, slot: number, faction: Faction, at = ARCH): number {
  const eid = spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot,
    faction,
    x: at.x,
    y: at.y,
    depth: at.depth,
    weaponsCold: false,
  });
  assert.ok(eid !== 0, 'the hull did not spawn');
  assert.ok(hasComponent(match.world, Weapon, eid), 'the control hull is meant to be armed');
  assert.ok(hasComponent(match.world, Magazine, eid), 'and to have tubes');
  assert.ok(hasComponent(match.world, Countermeasure, eid), 'and to have a countermeasure suite');
  return eid;
}

describe('every hull admitted to the chamber is admitted weapons-cold', () => {
  it('gives no party a weapon, a magazine or a countermeasure', () => {
    // §3, and asserted over *every* party rather than the player's, because the
    // reason is not the silence order — it is that this simulation has no
    // neutrality, and an armed delegation would open fire on a delegation it
    // does not own before the first beat fired. The court's procedure applied
    // evenly is also the only honest way to stage the scene, and it makes
    // "nothing here is solved by shooting" a property of the data rather than a
    // rule someone has to remember.
    const match = missionMatch();
    const hulls = hullsOf(match.world);
    const authored = PROLOGUE_SORROWGATE.parties.flatMap((party) => party.units);
    assert.equal(
      hulls.length,
      authored.length,
      'the mission placed a different fleet than it says'
    );

    for (const eid of hulls) {
      const kind = Unit.kind[eid] as UnitKind;
      const slot = Owner.slot[eid]!;
      assert.ok(
        !hasComponent(match.world, Weapon, eid),
        `slot ${slot}'s ${statsFor(kind).name} came into the chamber with a gun`
      );
      assert.ok(
        !hasComponent(match.world, Magazine, eid),
        `slot ${slot}'s ${statsFor(kind).name} came in with tubes loaded`
      );
      assert.ok(
        !hasComponent(match.world, Countermeasure, eid),
        `slot ${slot}'s ${statsFor(kind).name} came in able to seed the court's water`
      );
    }

    // And the absence means something: the roster the mission seats includes
    // hulls that would carry each of the three. Without this the test above
    // would pass just as happily on a chamber full of Harvesters.
    const kinds = authored.map((unit) => statsFor(unit.kind));
    assert.ok(
      kinds.some((stats) => stats.attackDamage > 0),
      'nothing here could have been armed'
    );
    assert.ok(
      kinds.some((stats) => stats.carriesTorpedoes),
      'nothing here could have carried one'
    );
  });

  it('leaves a skirmish hull armed, which is the guard on the change to world.ts', () => {
    // `weaponsCold` is opt-in and a mission is the only caller. If it ever
    // became the default — or if the three `!== true` checks became truthiness
    // checks — every skirmish in the game would be fought with cold tubes, and
    // nothing in the mission suite would notice.
    const match = new Match(undefined, { fauna: false, seed: 11 });
    match.addPlayer(0, Faction.Bathyarch);
    const spawn = match.map.spawns[0]!;
    const eid = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: spawn.x,
      y: spawn.y,
      depth: 300,
    });
    assert.ok(hasComponent(match.world, Weapon, eid), 'an ordinary Corvette has a gun');
    assert.ok(hasComponent(match.world, Magazine, eid), 'and tubes');
    assert.ok(hasComponent(match.world, Countermeasure, eid), 'and a decoy');
  });
});

describe('the order layer refuses what the mission locked', () => {
  it('will not transmit, even from a hull with a working array', () => {
    // §3's third clause, and the one the mission turns on: the active array is
    // pulled with the hardpoints, so the mission's central event is something
    // the player cannot answer. The ping is shown here, fired by somebody else,
    // and there is no button to fire back with.
    const match = missionMatch();
    const eid = armedHull(match, PLAYER, PROLOGUE_SORROWGATE.playerFaction);
    match.activeSonar(PLAYER, eid);
    assert.ok(
      !hasComponent(match.world, ActivePing, eid) || ActivePing.remainingS[eid] === 0,
      'the flight transmitted'
    );
  });

  it('will not leave ordnance in the court water, or shout to get out of it', () => {
    // §3's second clause, which exists because "weapons" read narrowly would
    // leave a stripped hull still able to seed a minefield and still able to
    // shout. Three separate refusals, on three separate armed hulls, because
    // one cooldown is shared between two of them.
    const match = missionMatch();
    const faction = PROLOGUE_SORROWGATE.playerFaction;
    assert.equal(match.layMine(PLAYER, armedHull(match, PLAYER, faction)), 0, 'a mine was laid');
    assert.equal(
      match.deployNoisemaker(PLAYER, armedHull(match, PLAYER, faction)),
      0,
      'a noisemaker went off under a silence order'
    );
    // A band above its own, so nothing but the lock can be refusing it: the
    // charge is otherwise a legal drop from a hull that has the suite for it.
    assert.equal(
      match.orderDepthCharge(PLAYER, armedHull(match, PLAYER, faction), 300),
      0,
      'a depth charge was dropped into the basin'
    );
  });

  it('accepts all three from the same hull once the mission is not there', () => {
    // The control that makes the three zeros above mean anything. Same hull,
    // same three calls, same slot — and in a skirmish every one of them lands.
    // Without this, a runtime that refused nothing and a roster that could do
    // nothing would look identical from here.
    const match = new Match(undefined, { fauna: false, seed: 11 });
    match.addPlayer(0, Faction.Bathyarch);
    const spawn = match.map.spawns[0]!;
    const at = { x: spawn.x, y: spawn.y, depth: 300 };
    const arm = () => armedHull(match, 0, Faction.Bathyarch, at);

    assert.notEqual(match.layMine(0, arm()), 0, 'an ordinary hull can mine');
    assert.notEqual(match.deployNoisemaker(0, arm()), 0, 'and can shout');
    assert.notEqual(match.orderDepthCharge(0, arm(), 1400), 0, 'and can bomb the water below it');
    const pinger = arm();
    match.activeSonar(0, pinger);
    assert.ok(hasComponent(match.world, ActivePing, pinger), 'and can transmit');
    assert.ok(ActivePing.remainingS[pinger]! > 0);
  });

  it('locks the player and nobody else, because a scripted ping is the mission', () => {
    // `denies` returns false for every slot but the player's, and that is not
    // an oversight to be tightened later: Drenn's emission at 09:00 is the beat
    // the whole mission turns on, and it goes through the same validated path a
    // player's ping does. A lock that applied to every slot would refuse the
    // event the prologue exists to show.
    const match = missionMatch();
    const consortium = PROLOGUE_SORROWGATE.parties.find(
      (party) => party.slot !== PLAYER && party.faction === Faction.Bathyarch
    );
    assert.ok(consortium !== undefined, 'the Consortium delegation is seated');
    const eid = armedHull(match, consortium.slot, consortium.faction);
    match.activeSonar(consortium.slot, eid);
    assert.ok(
      hasComponent(match.world, ActivePing, eid) && ActivePing.remainingS[eid]! > 0,
      'the Underwriter was refused her one emission'
    );
  });

  it('refuses every ability the mission published a lock for', () => {
    // The locks are shown to the client with their reasons attached
    // (docs/ui-ux.md — a disabled action greys out *with a reason*), so the
    // published list is a promise. This walks it: for each ability the mission
    // says it withholds, the matching command path on an armed hull does
    // nothing. It is the loop that keeps a seventh lock from being added to the
    // literal without a gate behind it.
    const match = missionMatch();
    const faction = PROLOGUE_SORROWGATE.playerFaction;
    for (const lock of PROLOGUE_SORROWGATE.locks) {
      const eid = armedHull(match, PLAYER, faction);
      switch (lock.ability) {
        case 'activeSonar':
          match.activeSonar(PLAYER, eid);
          assert.ok(!hasComponent(match.world, ActivePing, eid), lock.ability);
          break;
        case 'mines':
          assert.equal(match.layMine(PLAYER, eid), 0, lock.ability);
          break;
        case 'noisemakers':
          assert.equal(match.deployNoisemaker(PLAYER, eid), 0, lock.ability);
          break;
        case 'depthCharges':
          assert.equal(match.orderDepthCharge(PLAYER, eid, 300), 0, lock.ability);
          break;
        case 'torpedoes':
          // Refused before the contact handle is even looked up, which is the
          // only part of this one a test can see: a launch needs a Tier-2
          // solution on somebody else's hull, and nothing in this chamber can
          // be resolved to one on tick zero. The assertion is weak on purpose
          // and the strong half is above — a mission hull has no Magazine, so
          // there is nothing to launch from either.
          assert.equal(match.orderLaunchTorpedo(PLAYER, eid, 1), 0, lock.ability);
          break;
        case 'weapons':
          // Same shape: `orderAttackContact` returns void and needs a handle
          // this slot has resolved. What is checkable is that no ordered target
          // was ever written onto the gun.
          match.orderAttackContact(PLAYER, eid, 1);
          assert.equal(Weapon.orderedTargetEid[eid], 0, lock.ability);
          break;
        case 'construction': {
          // Not a weapon, and refused for a different reason: §11 gives this
          // mission no economy and nothing to build.
          //
          // **The stockpile has to be funded first**, and that is the whole
          // trap in this one. A mission opens on zero nodules, so `build`
          // returns false whatever the lock does — the first draft of this
          // assertion passed against a runtime that denied nothing at all,
          // which is the same trap `armedHull` exists to avoid for the six
          // above. Paid for and then refused is the only version that means
          // anything.
          const economy = economyFor(match.world, PLAYER);
          const before = economy.nodules;
          economy.nodules = 10_000;
          const spawn = missionMapById(PROLOGUE_SORROWGATE.mapId)!.spawns[0]!;
          const built = match.build(PLAYER, StructureKind.Refinery, spawn.x, spawn.y + 200);
          assert.equal(built, false, lock.ability);
          assert.equal(
            economy.nodules,
            10_000,
            'the refusal still charged for the structure it refused'
          );
          economy.nodules = before;
          break;
        }
        default: {
          // Exhaustive on purpose. The published lock list is a promise to the
          // player, so an ability added to the literal without a gate behind it
          // has to fail here rather than pass by falling off the end of a
          // switch — which is exactly what a seventh lock did.
          const unreached: never = lock.ability;
          assert.fail(`no gate is asserted for the "${String(unreached)}" lock`);
        }
      }
    }
  });
});

describe('the locked mission still runs', () => {
  it('opens with the flight, the freight and the array, and nothing shooting', () => {
    // A sanity pass over the opening position, from the player's own snapshot:
    // four escorts, two tenders, one array on loan, and — because nothing in
    // the chamber has a gun — a first few seconds in which five parties sit in
    // one room and none of them fires.
    const match = missionMatch();
    let own = null;
    for (let tick = 0; tick < SIM.TICK_HZ * 3; tick++) {
      const snapshot = match.update(STEP_MS)?.get(PLAYER);
      if (snapshot !== undefined) own = snapshot;
    }
    assert.ok(own !== null, 'no snapshot in three seconds');
    assert.equal(own.units.filter((u) => u.kind === UnitKind.LightScout).length, 4);
    assert.equal(own.units.filter((u) => u.kind === UnitKind.Harvester).length, 2);
    assert.equal(own.structures.length, 1, "the court's array, lent while the flight is quiet");
    assert.equal(own.ordnance.length, 0, 'nothing was fired');
    for (const unit of own.units) {
      assert.equal(unit.hp, unit.maxHp, `${unit.id} took damage in a room where nothing can shoot`);
    }
  });
});
