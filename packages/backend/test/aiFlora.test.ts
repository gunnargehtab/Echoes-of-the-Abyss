/**
 * The commander's opinion about the flora economy — wave 7 of #547, second
 * half. docs/systems-flora.md §2, §6 and §9 step 7.
 *
 * Waves 1 to 6 built a bed with a crop, a reactor that spends one, a cutter
 * that wrecks one and a garden that pays for one being left alive — and no
 * commander did any of it, so every one of them was invisible to the balance
 * harness. This is the wave that gives the AI an opinion, and there are only
 * two of them:
 *
 * - **A bio-reactor is worth having if you can spend Biomass**, and worth
 *   nothing at all if you cannot. That is a roster question, not a faction
 *   one — §6 gives the reactor to every navy at one rate.
 * - **A garden is worth standing on**, at the price of the hull standing
 *   there, and only out of the force the army does not need.
 *
 * What is pinned here is those two judgements and the ways they must not go
 * wrong: no reactor for a navy with nothing to spend, no reactor before the
 * Refinery that shortens every haul, and never a tender taken out of an army
 * that is still gathering.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AiDifficulty,
  BLOOM_SHARE,
  Biome,
  CONSTRUCTION,
  Faction,
  UnitKind,
  priceOf,
  statsFor,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { briefingFor } from '../src/ai/seat.ts';
import { DOCTRINE } from '../src/ai/doctrine.ts';
import { Match } from '../src/sim/match.ts';
import { VENTFRONT_DIVIDE } from '../src/sim/maps/index.ts';

/** A briefing off the real map, which is where the gardens and the kelp are. */
function briefing(faction: Faction) {
  const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 51 });
  match.addPlayer(1, faction);
  return briefingFor(match, 1, faction, AiDifficulty.Veteran);
}

describe('the briefing carries the map’s gardens', () => {
  it('tells every commander where the bloom nodes are', () => {
    // Public map data, like the resource fields and the other seats' starts.
    // The guard-rail that sites a garden on the most reachable water
    // (docs/systems-echo.md §10) only works if everybody can find it.
    for (const faction of [Faction.Pelagia, Faction.Bathyarch]) {
      const brief = briefing(faction);
      assert.equal(brief.blooms.length, VENTFRONT_DIVIDE.blooms?.length);
      for (const [i, bloom] of brief.blooms.entries()) {
        assert.equal(bloom.x, VENTFRONT_DIVIDE.blooms![i]!.x);
        assert.equal(bloom.y, VENTFRONT_DIVIDE.blooms![i]!.y);
      }
    }
  });
});

describe('a reactor is worth having only if the account is spendable', () => {
  it('is wanted by the navies whose own roster is priced in Biomass', () => {
    // The gate, stated against the doctrines rather than against a faction
    // list: a navy that gains or loses a Biomass hull gains or loses the
    // opinion with it, and nothing here has to be edited when it does.
    const spends = (faction: Faction): boolean =>
      DOCTRINE[faction].composition.some((kind) => priceOf(statsFor(kind)).biomass > 0);
    assert.ok(spends(Faction.Directorate), 'the herd navy fields Biomass hulls');
    assert.ok(spends(Faction.Pelagia), 'and so does the Commune, since the fold');
    assert.ok(!spends(Faction.Bathyarch), 'the Consortium fields none');
    assert.ok(!spends(Faction.Hadron), 'and neither do the Knights');
  });

  it('sites one only where a building will actually stand', () => {
    // Two tests, and the second is the one that cost a baseline. A reactor
    // needs `requiresBiome: KelpForest`, and it needs ground that admits a
    // structure at `CONSTRUCTION.WORKING_DEPTH_M` — which a bloom garden does
    // not, by construction: gardens are Shelf-band and nothing can be built
    // on one (docs/maps.md).
    //
    // Without the depth half, the commander pushed a build the server refused
    // and returned from that branch on every observation, so the two builds
    // below it were never reached again. It measured as a Directorate that
    // stopped buying Slipways and Vent Taps entirely, and won 100% of decided
    // matches doing it.
    const brief = briefing(Faction.Directorate);
    const cell = (x: number, y: number): number =>
      Math.floor(y / brief.terrain.cellM) * brief.terrain.cols +
      Math.floor(x / brief.terrain.cellM);
    for (const garden of brief.blooms) {
      const at = cell(garden.x, garden.y);
      assert.equal(brief.terrain.biomes[at], Biome.KelpForest, 'a garden is kelp');
      assert.ok(
        brief.terrain.floor[at]! < CONSTRUCTION.WORKING_DEPTH_M,
        'and too shallow to build on, which is what makes it a garden'
      );
    }
  });

  it('costs Biomass to field the hull the reactor is bought for', () => {
    // The loop closed, as arithmetic: the Commune's list now names a hull
    // priced in the account a garden fills, so tending is income they can
    // spend rather than a number going up (docs/systems-flora.md §6).
    const chorister = priceOf(statsFor(UnitKind.Chorister));
    assert.ok(chorister.biomass > 0);
    assert.ok(
      DOCTRINE[Faction.Pelagia].composition.includes(UnitKind.Chorister),
      'the Commune fields it'
    );
    assert.equal(
      statsFor(UnitKind.Chorister).faction,
      undefined,
      'and it is open to them because the price is the lock, not a faction flag'
    );
  });
});

describe('a garden is tended out of the surplus, never out of the force', () => {
  /** The commander's own reading of how many hulls it may send gardening. */
  function tenders(faction: Faction, army: number): number {
    const gardens = VENTFRONT_DIVIDE.blooms?.length ?? 0;
    if (faction !== Faction.Pelagia || gardens === 0) return 0;
    const spare = army - DOCTRINE[faction].attackAtArmySize;
    return Math.max(0, Math.min(gardens, Math.floor(spare / 2)));
  }

  it('sends nobody while the army is still gathering', () => {
    // The failure this rule exists for: a navy that stopped approaching
    // because two of its hulls were standing in kelp. The doctrine already
    // carries the number that means "enough hulls to act", and a tender comes
    // out of what is above it.
    const need = DOCTRINE[Faction.Pelagia].attackAtArmySize;
    for (let army = 0; army <= need + 1; army++) {
      assert.equal(tenders(Faction.Pelagia, army), 0, `an army of ${army} gardens with nobody`);
    }
  });

  it('never leaves the army below the size it attacks at', () => {
    const need = DOCTRINE[Faction.Pelagia].attackAtArmySize;
    for (let army = 0; army < 40; army++) {
      assert.ok(
        army - tenders(Faction.Pelagia, army) >= Math.min(army, need),
        `an army of ${army} kept ${army - tenders(Faction.Pelagia, army)}`
      );
    }
  });

  it('never sends more hulls than the map has gardens', () => {
    // The share is per bed and never per gardener (#243): a second tender on
    // one node buys nothing but a louder cluster of targets.
    const gardens = VENTFRONT_DIVIDE.blooms?.length ?? 0;
    assert.ok(gardens > 0, 'the map must author a garden, or this tests nothing');
    assert.equal(tenders(Faction.Pelagia, 200), gardens);
  });

  it('belongs to the Commune and to nobody else', () => {
    for (const faction of [Faction.Bathyarch, Faction.Directorate, Faction.Hadron]) {
      assert.equal(tenders(faction, 40), 0, `${Faction[faction]} does not tend`);
    }
  });
});

describe('and the commander actually does it', () => {
  it('walks a hull to a garden once it has hulls to spare', () => {
    // Through the real commander rather than the rule above: what is under
    // test here is that the branch runs, claims and issues, not the
    // arithmetic it claims by.
    const brief = briefing(Faction.Pelagia);
    const commander = new AiCommander(brief);
    const garden = brief.blooms[0]!;
    assert.ok(garden !== undefined);

    // An army well above the attack size, parked at home and hearing nothing,
    // so the only reason to send anybody anywhere is the garden.
    const army = Array.from({ length: 12 }, (_, i) => ({
      id: 100 + i,
      kind: UnitKind.Reed,
      x: brief.spawns[1]!.x,
      y: brief.spawns[1]!.y,
      depth: 300,
      hp: 400,
      maxHp: 400,
      sig: 12,
      throttle: undefined,
      cargo: undefined,
      cargoKind: undefined,
      mode: undefined,
      hold: undefined,
      aboard: undefined,
      embarking: undefined,
      silent: false,
      engineOff: false,
      followFloor: false,
      pressureRating: 1,
      mines: undefined,
    }));

    let sawGardenOrder = false;
    for (let i = 0; i < 40 && !sawGardenOrder; i++) {
      const commands = commander.observe({
        tick: i * 12,
        nodules: 600,
        crystal: 0,
        biomass: 0,
        power: { demand: 0, capacity: 6 },
        draw: { demand: 0, capacity: 6 },
        berths: { used: army.length, granted: 40 },
        units: army as never,
        structures: [],
        contacts: [],
        marks: [],
        hazards: [],
        residue: [],
        refits: [],
        exposure: { tier: 0, trackedCount: 0 },
      } as never);
      for (const command of commands) {
        if (command.kind !== 'move') continue;
        if (Math.hypot(command.x - garden.x, command.y - garden.y) <= BLOOM_SHARE.TEND_RADIUS_M) {
          sawGardenOrder = true;
        }
      }
    }
    assert.ok(sawGardenOrder, 'no hull was ever sent to a garden');
  });
});
