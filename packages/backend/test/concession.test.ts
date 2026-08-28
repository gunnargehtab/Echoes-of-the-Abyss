/**
 * Scuttling — docs/game-identity.md "Match Structure".
 *
 * The second way a commander leaves a match, and the one that is easy to get
 * wrong in the direction that matters: a rule that ends somebody's game for
 * them has to be certain. So most of what is tested here is the rule
 * *refusing* to fire — on a quiet economy, on a hull already paid for, on a
 * Knight living off the tithe, and on a table where nobody can pay for
 * anything.
 *
 * The positive case is the shape #223 measured: a commander with no harvester,
 * no queue, no bank and no income, standing in the water for the rest of the
 * clock because nobody has got around to finishing them.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CONCESSION, Faction, SIM, StructureKind, UnitKind } from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { Harvester, Health, Owner, Structure, Weapon } from '../src/sim/components.ts';
import { economyFor, spawnUnit } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function duel(a = Faction.Bathyarch, b = Faction.Pelagia): Match {
  // Flat water and no fauna: the rule is a reading of the economy, and a
  // creature eating the last harvester mid-window would be a second cause.
  const match = new Match(undefined, {
    fauna: false,
    seed: 0x5c07,
    terrain: new Terrain(8000, 8000, 250),
  });
  match.addPlayer(0, a);
  match.addPlayer(1, b);
  return match;
}

/**
 * Reduce a slot to the position the rule is about: a Bastion and whatever else
 * they own, no harvester, and an empty bank.
 */
function strand(match: Match, slot: number): void {
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (!hasComponent(match.world, Harvester, eid) || Owner.slot[eid] !== slot) continue;
    Health.hp[eid] = 0;
  }
  const economy = economyFor(match.world, slot);
  economy.nodules = 0;
  economy.crystal = 0;
  economy.biomass = 0;
}

/**
 * Step the match, paying `slot` a nodule a second so somebody on the map is
 * always still earning.
 *
 * The rule refuses to concede anyone at a table where nothing is coming in
 * anywhere, so a test that stepped a dead-quiet world would pass or fail on
 * that clause rather than on the one it is asking about.
 */
function advance(match: Match, seconds: number, earner: number | null = 0): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) {
    if (earner !== null && i % SIM.TICK_HZ === 0) economyFor(match.world, earner).nodules += 1;
    match.update(STEP_MS);
  }
}

/** Give a slot `count` more Corvettes, parked on their own spawn. */
function reinforce(match: Match, slot: number, count: number): void {
  const spawn = match.map.spawns[slot]!;
  const faction = Owner.faction[bastionOf(match, slot)] as Faction;
  for (let i = 0; i < count; i++) {
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot,
      faction,
      x: spawn.x + 300 + i * 120,
      y: spawn.y + 300,
    });
  }
}

/** Kill every armed hull a slot owns, leaving the structures alone. */
function disarm(match: Match, slot: number): void {
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (!hasComponent(match.world, Weapon, eid) || Owner.slot[eid] !== slot) continue;
    Health.hp[eid] = 0;
  }
}

function bastionOf(match: Match, slot: number): number {
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (!hasComponent(match.world, Structure, eid)) continue;
    if (Owner.slot[eid] !== slot || Structure.kind[eid] !== StructureKind.Bastion) continue;
    return eid;
  }
  throw new Error(`slot ${slot} has no Bastion`);
}

const WINDOW_S = CONCESSION.WINDOW_S;

function standing(match: Match, slot: number): boolean {
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (hasComponent(match.world, Owner, eid) && Owner.slot[eid] === slot) return true;
  }
  return false;
}

describe('scuttling', () => {
  it('ends the match for a commander with no harvester, no queue and no bank', () => {
    const match = duel();
    strand(match, 1);

    advance(match, WINDOW_S - 5);
    assert.equal(match.result, null, 'not before the window is up');
    assert.ok(standing(match, 1), 'and they are still in the water');

    advance(match, 10);
    assert.deepEqual(match.result, { winnerSlot: 0 }, 'the match resolves');
    assert.equal(standing(match, 1), false, 'and the beaten force is scuttled');
  });

  it('leaves a commander alone while a single harvester of theirs is alive', () => {
    // The whole counter-example. Income can be zero because the throttle is
    // Idle, and choosing to be hard to hear is the game's central decision —
    // not a defeat.
    const match = duel();
    const economy = economyFor(match.world, 1);
    economy.nodules = 0;
    economy.crystal = 0;
    economy.biomass = 0;

    advance(match, WINDOW_S + 10);
    assert.equal(match.result, null);
    assert.ok(standing(match, 1));
  });

  it('leaves a commander alone while a hull is on the line', () => {
    const match = duel();
    strand(match, 1);
    // Bought with their last nodules: the queue is the position, not the bank.
    const economy = economyFor(match.world, 1);
    economy.nodules = 1000;
    const bastion = bastionOf(match, 1);
    for (let i = 0; i < 8; i++) match.produce(1, bastion, UnitKind.Harvester);
    economy.nodules = 0;

    advance(match, WINDOW_S + 5);
    assert.equal(match.result, null, 'a hull already paid for is not a lost position');
  });

  it('never fires on a Knight whose Bastion is still standing', () => {
    // docs/economy.md §6: the tithe pays them for existing, and §6 calls them
    // the only faction whose economy does not scale with map control. Income
    // is income, so the Order's floor is a floor here too.
    const match = duel(Faction.Bathyarch, Faction.Hadron);
    strand(match, 1);

    advance(match, WINDOW_S + 10);
    assert.equal(match.result, null);
    assert.ok(standing(match, 1), 'the tithe keeps them in the match');
  });

  it('refuses to call a table where nobody can pay a defeat', () => {
    const match = duel();
    strand(match, 0);
    strand(match, 1);

    advance(match, WINDOW_S + 10, null);
    assert.equal(match.result, null, 'a stalemate of poverty is a stalemate');
    assert.ok(standing(match, 0) && standing(match, 1), 'and nobody is scuttled for it');
  });

  it('does not fire in a solo match, which has nobody to hand the win to', () => {
    const match = new Match(undefined, {
      fauna: false,
      seed: 0x5c07,
      terrain: new Terrain(8000, 8000, 250),
    });
    match.addPlayer(0, Faction.Bathyarch);
    strand(match, 0);

    advance(match, WINDOW_S + 10, null);
    assert.equal(match.result, null);
    assert.ok(standing(match, 0));
  });
});

describe('scuttling, against the position it must never call', () => {
  it('leaves a broke commander alone while they still field the bigger fleet', () => {
    // Being out of money is not being beaten. A commander with no economy and
    // the strongest fleet on the map has one attack left in them, and the rule
    // does not get to decide in advance that it would have failed.
    const match = duel();
    strand(match, 1);
    reinforce(match, 1, 6);

    advance(match, WINDOW_S + 10);
    assert.equal(match.result, null);
    assert.ok(standing(match, 1));
  });

  it('takes them once the fleet that outlived their economy is gone', () => {
    const match = duel();
    strand(match, 1);
    reinforce(match, 1, 6);
    advance(match, WINDOW_S + 10);
    assert.equal(match.result, null, 'still holding the guns');

    disarm(match, 1);
    advance(match, WINDOW_S + 10);
    assert.deepEqual(match.result, { winnerSlot: 0 });
  });
});
