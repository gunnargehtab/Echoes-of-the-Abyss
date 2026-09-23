/**
 * The commander and the berth cap (docs/economy.md §10, #854).
 *
 * `Match.produce` refuses a hull the base has no crew for, before it looks at
 * the price, and the refusal is silent: `AiSeat` drops the return value, as it
 * drops every refused command. So the only place a commander that ignores the
 * cap shows up is the server's own count of what it refused, and that is what
 * these tests read — through the real `Match`, not a synthesised snapshot,
 * because the berths the commander reads are the server's own report.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { AiDifficulty, Faction, SIM, UnitKind, statsFor } from '@echoes/shared';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import { Match } from '../src/sim/match.ts';
import { economyFor, spawnUnit } from '../src/sim/world.ts';

const SEED = 0x854;

const NAVIES: readonly Faction[] = [
  Faction.Hadron,
  Faction.Pelagia,
  Faction.Directorate,
  Faction.Bathyarch,
];

interface Reading {
  seat: AiSeat;
  /** Every `produce` the seat sent, and what the server answered. */
  orders: { unit: UnitKind; accepted: boolean; room: number }[];
}

/**
 * A navy one berth short of its grant, with a purse no price can stop, run for
 * `seconds` of a real match.
 *
 * Filled with Corvettes because every navy's army takes an armed hull, and a
 * full army is past every escort gate — so each want the commander has is
 * reached, and the only thing left to refuse it is the berths. One berth of
 * room rather than none, so a 1-berth hull is still a legal purchase and a
 * commander that reads the cap has something to buy.
 */
function oneBerthShort(faction: Faction, seconds: number): Reading {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  const enemy = faction === Faction.Bathyarch ? Faction.Hadron : Faction.Bathyarch;
  match.addPlayer(0, enemy);
  match.addPlayer(1, faction);
  const brief = briefingFor(match, 1, faction, AiDifficulty.Veteran);
  const seat = new AiSeat(match, brief);

  const home = brief.spawns[1]!;
  const { used, granted } = match.berthsFor(1);
  let short = granted - 1 - used;
  let i = 0;
  const spawn = (kind: UnitKind): void => {
    spawnUnit(match.world, {
      kind,
      slot: 1,
      faction,
      x: home.x + 300 + (i % 6) * 60,
      y: home.y + Math.floor(i / 6) * 60,
    });
    i++;
    short -= statsFor(kind).berths;
  };
  while (short >= statsFor(UnitKind.Corvette).berths) spawn(UnitKind.Corvette);
  while (short > 0) spawn(UnitKind.LightScout);
  assert.equal(match.berthsFor(1).used, granted - 1, `${Faction[faction]}: one berth of room`);

  const economy = economyFor(match.world, 1);
  economy.nodules = 100_000;
  economy.crystal = 100_000;
  economy.biomass = 100_000;

  const orders: Reading['orders'] = [];
  const produce = match.produce.bind(match);
  match.produce = (slot: number, structureId: number, unit: UnitKind): boolean => {
    const { used: u, granted: g } = match.berthsFor(slot);
    const accepted = produce(slot, structureId, unit);
    if (slot === 1) orders.push({ unit, accepted, room: g - u });
    return accepted;
  };

  for (let tick = 0; tick < seconds * SIM.TICK_HZ; tick++) {
    const own = match.update(1000 / SIM.TICK_HZ)?.get(1);
    if (own !== undefined) seat.observe(own);
  }
  return { seat, orders };
}

describe('the commander reads its berths before it queues a hull (#854)', () => {
  const readings = new Map(NAVIES.map((faction) => [faction, oneBerthShort(faction, 20)]));

  it('sends no order for a hull the berths cannot hold, and still fills the last berth', () => {
    // Measured against the commander before #854, on this fixture: every navy
    // bought one Harvester into the last berth and then sent another on every
    // observation, each refused. The harvester want is first and returns on
    // the order it sends, so no want behind it was ever read at the cap.
    for (const [faction, { orders }] of readings) {
      const name = Faction[faction];
      const over = orders.filter((o) => statsFor(o.unit).berths > o.room);
      assert.deepEqual(
        over.map((o) => `${UnitKind[o.unit]} into ${o.room}`),
        [],
        `${name}: no order the berths refuse`
      );
      // The positive half: reading the cap is not refusing everything. The
      // last berth takes a 1-berth hull, and the server accepts it.
      assert.ok(
        orders.some((o) => o.accepted && statsFor(o.unit).berths === 1),
        `${name}: the one free berth was filled`
      );
    }
  });

  it('counts a want the berths refuse as no berth, never as bought', () => {
    // The Commune is the navy this reaches: its Weaver is the one ordnance
    // hull laid down at the Foundry rather than behind the rung, so at a
    // full army its want is escorted, has a free yard, and is refused by the
    // berths alone. Every other navy's is refused by the yard first.
    const { seat } = readings.get(Faction.Pelagia)!;
    const t = seat.ordnanceWant;
    assert.ok(t.noBerth > 0, `the Commune's ordnance want read no berth ${t.noBerth} times`);
    assert.equal(t.bought, 0, 'and was never counted bought');
    for (const [faction, { seat: s }] of readings) {
      for (const [want, tally] of [
        ['ordnance', s.ordnanceWant],
        ['carrier', s.carrierWant],
      ] as const) {
        assert.equal(
          tally.notEscorted +
            tally.alreadyHas +
            tally.noYard +
            tally.noBerth +
            tally.cannotAfford +
            tally.bought,
          tally.reached,
          `${Faction[faction]}, ${want}: the six reasons sum to the observations`
        );
      }
    }
  });
});
