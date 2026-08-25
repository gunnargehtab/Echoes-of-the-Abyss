/**
 * Match lifecycle — lobby rules, resignation, and the seam between them.
 *
 * The lobby rules are tested as pure functions rather than through a live
 * Colyseus room, because a room is a network object and standing one up would
 * test the transport rather than the decisions. What is left in the room after
 * the extraction is plumbing: read the roster, call the rule, write the answer.
 *
 * The resignation tests are the ones that matter most. Reconnection is only
 * safe if the *end* of the grace window is defined, and the tempting answer —
 * quietly drop the player from the roster — leaves the survivor sitting in a
 * game they have already won, forever.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Faction, LIFECYCLE, ResolutionTier, UnitKind } from '@echoes/shared';
import { hasComponent, removeEntity } from 'bitecs';
import {
  allocateSlot,
  canChooseFaction,
  defaultFaction,
  everyoneIsReady,
  isFactionTaken,
  type RosterEntry,
} from '../src/rooms/lobby.ts';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Health, Owner, Position, Unit, Weapon } from '../src/sim/components.ts';

function seat(overrides: Partial<RosterEntry> & { sessionId: string }): RosterEntry {
  return {
    slot: 0,
    faction: Faction.Bathyarch,
    ready: false,
    connected: true,
    // Required on RosterEntry, and every seat this helper builds is a human
    // one; the AI seats are constructed by the room, not by the lobby tests.
    isAi: false,
    ...overrides,
  };
}

describe('lobby: slots', () => {
  it('hands out the lowest free slot, not the next one ever issued', () => {
    const roster = [seat({ sessionId: 'a', slot: 0 }), seat({ sessionId: 'b', slot: 1 })];
    assert.equal(allocateSlot(roster, 4), 2);
  });

  it('reuses a slot a player vacated', () => {
    // The whole reason reconnection was impossible: a counter that only
    // increments hands the returning player an empty slot while their fleet
    // is still in the water under the old one.
    const roster = [seat({ sessionId: 'a', slot: 0 }), seat({ sessionId: 'c', slot: 2 })];
    assert.equal(allocateSlot(roster, 4), 1);
  });

  it('refuses to seat anyone in a full room', () => {
    const roster = [0, 1].map((slot) => seat({ sessionId: `p${slot}`, slot }));
    assert.equal(allocateSlot(roster, 2), undefined, 'a two-spawn map seats two');
  });
});

describe('lobby: factions', () => {
  it('offers a new arrival the first navy nobody holds', () => {
    assert.equal(defaultFaction([]), Faction.Bathyarch);
    assert.equal(
      defaultFaction([seat({ sessionId: 'a', faction: Faction.Bathyarch })]),
      Faction.Pelagia
    );
  });

  it('rejects a navy another commander already picked', () => {
    const roster = [
      seat({ sessionId: 'a', faction: Faction.Pelagia }),
      seat({ sessionId: 'b', faction: Faction.Hadron }),
    ];
    assert.equal(canChooseFaction(roster, 'b', Faction.Pelagia), false, 'taken by a');
    assert.equal(canChooseFaction(roster, 'b', Faction.Directorate), true, 'free');
  });

  it('lets a commander re-pick the navy they already hold', () => {
    // Not a no-op worth special-casing away: a client that re-sends its own
    // pick must not be told its own navy is taken.
    const roster = [seat({ sessionId: 'a', faction: Faction.Hadron })];
    assert.equal(canChooseFaction(roster, 'a', Faction.Hadron), true);
    assert.equal(isFactionTaken(roster, Faction.Hadron, 'a'), false);
  });

  it('refuses a faction ordinal that is not a faction', () => {
    // The client is never trusted. A schema field is a uint8, so 200 and -1
    // both arrive as numbers and both have to be turned away here.
    for (const bogus of [-1, 4, 200, 1.5, Number.NaN]) {
      assert.equal(canChooseFaction([], 'a', bogus), false, `${bogus} is not a faction`);
    }
  });
});

describe('lobby: starting', () => {
  it('does not start an empty lobby', () => {
    assert.equal(everyoneIsReady([], LIFECYCLE.MIN_PLAYERS), false);
  });

  it('waits for the commander who has not readied', () => {
    const roster = [
      seat({ sessionId: 'a', slot: 0, ready: true }),
      seat({ sessionId: 'b', slot: 1, ready: false }),
    ];
    assert.equal(everyoneIsReady(roster, 1), false);
  });

  it('does not wait on a commander who has dropped', () => {
    // Otherwise one closed tab holds three other people hostage.
    const roster = [
      seat({ sessionId: 'a', slot: 0, ready: true }),
      seat({ sessionId: 'b', slot: 1, ready: false, connected: false }),
    ];
    assert.equal(everyoneIsReady(roster, 1), true);
  });

  it('honours a minimum player count when one is set', () => {
    const solo = [seat({ sessionId: 'a', ready: true })];
    assert.equal(everyoneIsReady(solo, 2), false, 'a duel needs two');
    assert.equal(everyoneIsReady(solo, 1), true, 'a practice match needs one');
  });
});

describe('resignation', () => {
  function duel(): Match {
    const match = new Match(undefined, { fauna: false, seed: 0xabc });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    return match;
  }

  function ownedEntities(match: Match, slot: number): number {
    let count = 0;
    for (let eid = 0; eid < Owner.slot.length; eid++) {
      if (!hasComponent(match.world, Owner, eid)) continue;
      if (Owner.slot[eid] === slot) count++;
    }
    return count;
  }

  it('gives the match to the commander still standing', () => {
    const match = duel();
    assert.equal(match.result, null, 'nobody has won yet');

    match.resign(1);
    assert.deepEqual(match.result, { winnerSlot: 0 });
  });

  it('scuttles the abandoned force rather than leaving it in the water', () => {
    const match = duel();
    assert.ok(ownedEntities(match, 1) > 0, 'slot 1 starts with a base and an escort');

    match.resign(1);
    assert.equal(ownedEntities(match, 1), 0, 'nothing of theirs is left to fight');
    assert.ok(ownedEntities(match, 0) > 0, 'and the survivor is untouched');
  });

  it('is idempotent, so a double-resign cannot re-run the scuttle', () => {
    const match = duel();
    match.resign(1);
    const after = match.result;
    match.resign(1);
    assert.deepEqual(match.result, after);
  });

  it('does not declare a winner in a solo match', () => {
    // A practice match has one roster. Resigning ends it, but there is nobody
    // to hand it to, and inventing a winner would be a lie the HUD would draw.
    const match = new Match(undefined, { fauna: false, seed: 0xabc });
    match.addPlayer(0, Faction.Bathyarch);
    match.resign(0);
    assert.equal(match.result, null);
  });

  it('takes the abandoned fleet out of the Echo pass, not just out of an array', () => {
    // The consequence that matters to the other commander. A scuttle that
    // only cleared a component array would leave the survivor still hearing
    // ghosts — and, given how this game reports contacts, still able to shoot
    // at them.
    const match = duel();
    const heard = (): number => {
      let contacts = 0;
      for (let i = 0; i < 30; i++) {
        const snapshots = match.update(1000 / 60);
        const own = snapshots?.get(0);
        if (own !== undefined) contacts = Math.max(contacts, own.contacts.length);
      }
      return contacts;
    };

    // Bring slot 1's escort into earshot of slot 0 first: the opening spawns
    // are a map apart, and two silent corners prove nothing.
    for (let eid = 0; eid < Owner.slot.length; eid++) {
      if (!hasComponent(match.world, Owner, eid) || Owner.slot[eid] !== 1) continue;
      Position.x[eid] = 1400;
      Position.y[eid] = 1400;
    }
    assert.ok(heard() > 0, 'slot 0 should hear a fleet parked on top of it');

    match.resign(1);
    assert.equal(heard(), 0, 'and hear nothing once it has been scuttled');
  });
});
describe('what a death leaves behind', () => {
  it('drops a dead unit’s queued plan, so a recycled id does not inherit it', () => {
    // bitecs hands entity ids back out, and anything keyed by eid *outside* the
    // ECS has to be dropped when the entity dies or it comes back attached to
    // whatever inherits that id. `world.orderQueues` was not being dropped, so
    // a brand-new hull could be handed a dead one's last waypoint and walk off
    // across the map to finish it — with the owning player seeing it in
    // `queuedOrders` as though they had ordered it.
    //
    // Asserted on the queue itself rather than by churning a thousand entities
    // to force a recycle: the leak is that the entry outlives the entity, and
    // that is the thing worth pinning. Whether bitecs reissues this particular
    // id on this particular run is bitecs's business.
    const terrain = new Terrain(12000, 12000, 200);
    const match = new Match(undefined, { fauna: false, seed: 17, terrain });
    match.addPlayer(0, Faction.Bathyarch);

    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 3000,
    });
    for (let i = 0; i < 12; i++) match.update(1000 / 60);

    match.orderMove(0, hull, 5000, 3000);
    match.orderMove(0, hull, 9000, 9000, true);
    assert.ok(
      (match.world.orderQueues.get(hull)?.length ?? 0) > 0,
      'the hull should be carrying a queued leg, or this proves nothing'
    );

    Health.hp[hull] = 0;
    for (let i = 0; i < 4; i++) match.update(1000 / 60);

    assert.equal(hasComponent(match.world, Unit, hull), false, 'the hull is gone');
    assert.equal(
      match.world.orderQueues.has(hull),
      false,
      'and its plan went with it, rather than waiting for the next tenant of that id'
    );
  });
});

describe('a contact handle does not outlive what it named', () => {
  it('stops resolving once the entity dies, so a recycled id is not a free tracker', () => {
    // `EchoLayer.forget` is the most consequential fix in this branch and had
    // no regression guard at all: no-oping it left the whole suite green.
    //
    // The hole it closes: `handles` is a *permanent* per-slot map from entity
    // id to the opaque handle a player was given, and `entityForHandle` answers
    // by scanning it. bitecs reissues entity ids once enough have been freed —
    // routine now that short-lived ordnance exists — so a handle minted for a
    // torpedo that died minutes ago comes to name whatever inherits that id.
    // `orderAttackContact` gates on owner and hp, never on current detection,
    // so the player could order an attack on a live hull they had never
    // detected, and combat republishes an ordered target's position every tick.
    // A dead contact turns into a permanent tracker on a fresh one.
    //
    // Asserted on `Weapon.orderedTargetEid` rather than on the snapshot,
    // because that field IS the tracker: if it ever holds the recycled entity,
    // the leak is live regardless of what the client is shown.
    const terrain = new Terrain(14000, 14000, 200);
    const match = new Match(undefined, { fauna: false, seed: 23, terrain });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);

    const shooter = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 7000,
    });
    // A loud, close enemy so slot 0 certainly resolves it and is issued a
    // handle for it.
    const doomed = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 6400,
      y: 7000,
    });

    let handle = 0;
    for (let i = 0; i < 400 && handle === 0; i++) {
      const snapshots = match.update(1000 / 60);
      const view = snapshots?.get(0);
      const contact = view?.contacts.find((c) => c.tier >= ResolutionTier.Classification);
      if (contact !== undefined) handle = contact.id;
    }
    assert.notEqual(handle, 0, 'slot 0 should have been issued a handle for the Cruiser');
    assert.equal(match.echo.entityForHandle(0, handle), doomed, 'and it should name the Cruiser');

    // Kill it and let reap run.
    Health.hp[doomed] = 0;
    for (let i = 0; i < 4; i++) match.update(1000 / 60);
    assert.equal(hasComponent(match.world, Unit, doomed), false, 'the Cruiser is gone');

    assert.equal(
      match.echo.entityForHandle(0, handle),
      undefined,
      'the handle must stop naming anything the moment its entity dies'
    );

    // Now force bitecs to reissue that id, and confirm the stale handle cannot
    // be turned into an order on whatever inherits it.
    let reused = 0;
    for (let round = 0; round < 1400 && reused === 0; round++) {
      const filler = spawnUnit(match.world, {
        kind: UnitKind.LightScout,
        slot: 1,
        faction: Faction.Pelagia,
        x: 12000,
        y: 12000,
      });
      if (filler === doomed) reused = filler;
      else removeEntity(match.world, filler);
    }
    assert.notEqual(reused, 0, 'bitecs should have reissued the id within 1400 spawns');

    Weapon.orderedTargetEid[shooter] = 0;
    match.orderAttackContact(0, shooter, handle);
    assert.equal(
      Weapon.orderedTargetEid[shooter],
      0,
      "a handle from a dead contact must not become a tracker on the id's next tenant"
    );
  });
});
