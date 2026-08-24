/**
 * The Hadron tithe — docs/economy.md §6.
 *
 * The mechanic §9 names as the mitigation for "Knights starve out of every
 * long game", and which the balance harness caught as missing entirely: the
 * guard-rail read breached because its stated mitigation did not exist.
 *
 * The tests that matter here are the two shape claims, not the rate. §6 says
 * the income is "independent of extraction" and §6's next sentence says the
 * Knights are "the only faction whose economy does not scale with map
 * control" — so a tithe that grew with buildings, or stopped when the mining
 * did, would be the wrong mechanic wearing the right name.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Faction, HADRON, ResourceKind, SIM, StructureKind } from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { Harvester, Health, Owner, Structure } from '../src/sim/components.ts';
import { economyFor, spawnStructure } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function quietMatch(seed = 31): Match {
  // A flat map with no fauna: the tithe is arithmetic, and a creature eating a
  // harvester mid-measurement is noise in the literal and the figurative sense.
  return new Match(undefined, {
    fauna: false,
    seed,
    // Metres, not cells — 8000 m of water on a 250 m grid, the size the
    // authored maps use. The arithmetic under test does not care, but a map
    // smaller than a Cruiser is a fixture that means nothing.
    terrain: new Terrain(8000, 8000, 250),
  });
}

function advance(match: Match, seconds: number): void {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) match.update(STEP_MS);
}

/** Stop every harvester this slot owns, so nothing but the tithe pays. */
function idleHarvesters(match: Match, slot: number): void {
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (!hasComponent(match.world, Harvester, eid) || Owner.slot[eid] !== slot) continue;
    // Removing them outright is the cleanest "no extraction at all": a throttle
    // of Idle still leaves cargo in transit that would land mid-measurement.
    Health.hp[eid] = 0;
    Harvester.mode[eid] = 0;
    Harvester.cargo[eid] = 0;
  }
}

function firstStructure(match: Match, slot: number, kind: StructureKind): number {
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (!hasComponent(match.world, Structure, eid)) continue;
    if (Owner.slot[eid] !== slot || Structure.kind[eid] !== kind) continue;
    return eid;
  }
  throw new Error(`slot ${slot} has no ${StructureKind[kind]}`);
}

describe('the tithe is independent of extraction', () => {
  it('pays a Knight commander who is mining nothing at all', () => {
    // §6: "fixed periodic income from each chapter-house, independent of
    // extraction". A faction whose whole identity is a floor that never falls
    // has to earn while it is losing.
    const match = quietMatch();
    match.addPlayer(0, Faction.Hadron);
    advance(match, 1);
    idleHarvesters(match, 0);

    const before = economyFor(match.world, 0).nodules;
    advance(match, 60);
    const earned = economyFor(match.world, 0).nodules - before;

    assert.ok(
      Math.abs(earned - HADRON.TITHE_PER_S * 60) < 2,
      `sixty seconds of tithe and nothing else: expected ~${HADRON.TITHE_PER_S * 60}, got ${earned.toFixed(1)}`
    );
  });

  it('pays nobody else', () => {
    const match = quietMatch();
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 1);
    idleHarvesters(match, 0);

    const before = economyFor(match.world, 0).nodules;
    advance(match, 60);
    assert.equal(economyFor(match.world, 0).nodules, before, 'the Consortium tithes to nobody');
  });
});

describe('the tithe does not scale with map control', () => {
  it('pays the same with three more structures standing', () => {
    // §6: "the only faction whose economy does not scale with map control".
    // An income paid per building would scale with precisely that, which is
    // why this is flat per commander rather than per chapter-house-shaped
    // structure — see the note on HADRON in constants.ts.
    const rate = (extra: number): number => {
      const match = quietMatch();
      match.addPlayer(0, Faction.Hadron);
      advance(match, 1);
      idleHarvesters(match, 0);
      for (let i = 0; i < extra; i++) {
        spawnStructure(match.world, {
          kind: StructureKind.SoundingSpire,
          slot: 0,
          faction: Faction.Hadron,
          x: 1500 + i * 400,
          y: 1500,
          prebuilt: true,
        });
      }
      const before = economyFor(match.world, 0).nodules;
      advance(match, 30);
      return economyFor(match.world, 0).nodules - before;
    };

    const bare = rate(0);
    const built = rate(3);
    assert.ok(bare > 0, 'the bare case earns something');
    assert.ok(
      Math.abs(built - bare) < 1,
      `holding more ground must not raise the tithe: ${built.toFixed(1)} vs ${bare.toFixed(1)}`
    );
  });

  it('stops when the Bastion falls', () => {
    // The expedition ending, not the Order's income drying up. It also keeps
    // the elimination rule honest: a slot with no Bastion is being scuttled.
    const match = quietMatch();
    match.addPlayer(0, Faction.Hadron);
    advance(match, 1);
    idleHarvesters(match, 0);

    // Through resign(), not by zeroing the Bastion's hp. Deaths only become
    // real in reap(), and reap only sees what a *system* reported destroyed —
    // so a hand-zeroed Bastion sits there at 0 hp, still standing, still
    // tithing, and the test passes for the wrong reason. resign() is the real
    // path: it eliminates the slot and scuttles everything it owned.
    assert.doesNotThrow(() => firstStructure(match, 0, StructureKind.Bastion));
    match.resign(0);
    advance(match, 1);

    const after = economyFor(match.world, 0).nodules;
    advance(match, 30);
    assert.equal(economyFor(match.world, 0).nodules, after, 'no Bastion, no tithe');
  });
});

describe('crystal at unmatched efficiency', () => {
  it('banks 2.2x the value of the same cargo', () => {
    // SPEC — §6. Applied at the deposit rather than at the cut, so the field
    // depletes by what was actually mined and the Order banks more value out
    // of the same ore. Scaling the mining rate instead would have made the
    // Abyssal round trip cheaper for them, and that trip is the entire reason
    // crystal is worth having (§7).
    const banked = (faction: Faction): number => {
      const match = quietMatch();
      match.addPlayer(0, faction);
      advance(match, 1);

      // Put a full crystal hold on a harvester and dock it at the Bastion.
      const bastion = firstStructure(match, 0, StructureKind.Bastion);
      let hauler = -1;
      for (let eid = 0; eid < Owner.slot.length; eid++) {
        if (hasComponent(match.world, Harvester, eid) && Owner.slot[eid] === 0) {
          hauler = eid;
          break;
        }
      }
      assert.notEqual(hauler, -1);
      Harvester.cargoKind[hauler] = ResourceKind.ResonanceCrystal;
      Harvester.cargo[hauler] = 10;
      Harvester.mode[hauler] = 3;
      Harvester.depotEid[hauler] = bastion;

      const before = economyFor(match.world, 0).crystal;
      advance(match, 40);
      return economyFor(match.world, 0).crystal - before;
    };

    const knights = banked(Faction.Hadron);
    const everyoneElse = banked(Faction.Bathyarch);
    assert.ok(everyoneElse > 0, 'the baseline delivery landed');
    assert.ok(
      Math.abs(knights / everyoneElse - HADRON.CRYSTAL_YIELD_MULTIPLIER) < 0.05,
      `expected ${HADRON.CRYSTAL_YIELD_MULTIPLIER}x, got ${(knights / everyoneElse).toFixed(2)}x`
    );
  });
});
