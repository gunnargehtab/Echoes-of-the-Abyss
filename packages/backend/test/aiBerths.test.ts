/**
 * The commander and the berth cap (docs/economy.md §10, #854).
 *
 * `Match.produce` refuses a hull the base has no crew for, before it looks at
 * the price, and the refusal is silent: `AiSeat` drops the return value, as it
 * drops every refused command. So the first half of this file reads the
 * server's own answer, through a real `Match`, because the berths the
 * commander reads are the server's own report. The second half is two cases a
 * full army never reaches — the composition cycle and the bid it saves for —
 * on a hand-built snapshot, since a real base cannot be held below its army
 * target and one berth short at once.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AiDifficulty,
  Faction,
  HarvestThrottle,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { DOCTRINE } from '../src/ai/doctrine.ts';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import type { AiBriefing } from '../src/ai/types.ts';
import { Match } from '../src/sim/match.ts';
import { economyFor, spawnStructure, spawnUnit } from '../src/sim/world.ts';

const SEED = 0x854;
const ECHO_TICKS = SIM.TICK_HZ / SIM.ECHO_HZ;

const NAVIES: readonly Faction[] = [
  Faction.Bathyarch,
  Faction.Pelagia,
  Faction.Directorate,
  Faction.Hadron,
];

/**
 * Each navy's own scout, restated from the roster rather than imported, on
 * `aiCarrier.test.ts`'s terms: the commander's table is private.
 */
const OWN_SCOUT: Record<Faction, UnitKind> = {
  [Faction.Bathyarch]: UnitKind.Beacon,
  [Faction.Pelagia]: UnitKind.Glider,
  [Faction.Directorate]: UnitKind.Acolyte,
  [Faction.Hadron]: UnitKind.Herald,
};

interface Reading {
  seat: AiSeat;
  /** Every `produce` the seat sent, the berths left when it did, and the answer. */
  orders: { unit: UnitKind; accepted: boolean; room: number }[];
}

/**
 * A navy one berth short of its grant, with a Slipway standing and a purse no
 * price can stop, run for `seconds` of a real match.
 *
 * Filled with Corvettes because every navy's army takes an armed hull, and an
 * army that size is past every escort gate and at its target. The Slipway is
 * there so that every hull behind the rung has a free yard: the ordnance
 * hull, the heavy, the siege hull, the Commune's Sower and Bower, and the
 * carrier are then refused by the berths alone. What this does **not** reach
 * is the composition cycle, which an army at its target never asks — the
 * hand-built cases below are for that.
 *
 * One berth of room rather than none, so a 1-berth hull is still a legal
 * purchase and a commander that reads the cap has something to buy.
 */
function oneBerthShort(faction: Faction, seconds: number): Reading {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  const enemy = faction === Faction.Bathyarch ? Faction.Hadron : Faction.Bathyarch;
  match.addPlayer(0, enemy);
  match.addPlayer(1, faction);
  const brief = briefingFor(match, 1, faction, AiDifficulty.Veteran);
  const seat = new AiSeat(match, brief);

  const home = brief.spawns[1]!;
  spawnStructure(match.world, {
    kind: StructureKind.Slipway,
    slot: 1,
    faction,
    x: home.x - 400,
    y: home.y,
    prebuilt: true,
  });
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
    // Every navy's ordnance hull and carrier have a free yard here, the army is
    // past the escort, and none of the eight is a 1-berth hull — so the berths
    // are the one gate left shut, for both wants, in every navy.
    for (const [faction, { seat }] of readings) {
      for (const [want, tally] of [
        ['ordnance', seat.ordnanceWant],
        ['carrier', seat.carrierWant],
      ] as const) {
        const label = `${Faction[faction]}, ${want}`;
        assert.ok(tally.noBerth > 0, `${label}: read no berth ${tally.noBerth} times`);
        assert.equal(tally.bought, 0, `${label}: never counted bought`);
        assert.equal(
          tally.notEscorted +
            tally.alreadyHas +
            tally.noYard +
            tally.noBerth +
            tally.cannotAfford +
            tally.bought,
          tally.reached,
          `${label}: the six reasons sum to the observations`
        );
      }
    }
  });
});

function briefing(faction: Faction): AiBriefing {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, faction);
  match.addPlayer(1, faction === Faction.Bathyarch ? Faction.Pelagia : Faction.Bathyarch);
  return briefingFor(match, 0, faction, AiDifficulty.Veteran);
}

function hull(
  id: number,
  kind: UnitKind,
  at: { x: number; y: number }
): EchoSnapshot['units'][number] {
  const stats = statsFor(kind);
  return {
    id,
    kind,
    engineOff: false,
    x: at.x,
    y: at.y,
    depth: 300,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    heading: 0,
    sig: stats.sigIdle,
    silentRunning: false,
    pressureBonus: 0,
    unhealableDamage: 0,
    ...(kind === UnitKind.Harvester ? { cargo: 0, throttle: HarvestThrottle.Standard } : {}),
  };
}

function structure(
  id: number,
  kind: StructureKind,
  at: { x: number; y: number }
): EchoSnapshot['structures'][number] {
  return {
    id,
    kind,
    x: at.x,
    y: at.y,
    depth: 300,
    hp: 2500,
    maxHp: 2500,
    sig: 30,
    buildProgress: 1,
    queue: [],
    queueProgress: 0,
  };
}

/**
 * A navy with no army at all, one berth short: its harvester target met and
 * its own scout afloat, so the first want with anything to do is the
 * composition cycle. No Slipway, so every want behind the rung has no yard.
 *
 * No Refinery either, as in `ai.test.ts`'s `broke()`. With one standing, the
 * Directorate on 100 nodules queues nothing at all whatever the berths —
 * measured — because `commandConstruction` spends from the same purse first,
 * and the case below could not tell that from a hold.
 */
function noArmy(
  brief: AiBriefing,
  purse: Pick<EchoSnapshot, 'nodules' | 'crystal' | 'biomass'>
): EchoSnapshot {
  const home = brief.spawns[brief.slot]!;
  const at = (i: number): { x: number; y: number } => ({ x: home.x + i * 60, y: home.y });
  const kinds = [
    ...Array.from<UnitKind>({ length: DOCTRINE[brief.faction].harvesterTarget }).fill(
      UnitKind.Harvester
    ),
    OWN_SCOUT[brief.faction],
  ];
  const units = kinds.map((kind, i) => hull(i + 1, kind, at(i)));
  const used = units.reduce((n, u) => n + statsFor(u.kind).berths, 0);
  return {
    tick: 6000,
    ordnance: [],
    units,
    structures: [
      structure(20, StructureKind.Bastion, home),
      structure(21, StructureKind.Foundry, { x: home.x + 200, y: home.y }),
    ],
    contacts: [],
    peakSig: 30,
    berths: { used, granted: used + 1 },
    refits: [],
    ...purse,
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    selfEvents: [],
    draw: { capacity: 12, demand: 4, satisfaction: 1 },
    driftHealth: [],
    shoals: [],
    jellies: [],
    hazards: [],
    marks: [],
  };
}

/** Hulls a commander queues over `observations` of standing still. */
function queued(
  brief: AiBriefing,
  purse: Pick<EchoSnapshot, 'nodules' | 'crystal' | 'biomass'>,
  observations = 12
): UnitKind[] {
  const commander = new AiCommander(brief);
  const bought: UnitKind[] = [];
  for (let i = 0; i < observations; i++) {
    const at = noArmy(brief, purse);
    for (const command of commander.observe({ ...at, tick: at.tick + i * ECHO_TICKS })) {
      if (command.kind === 'produce') bought.push(command.unit);
    }
  }
  return bought;
}

describe('the commander builds its army inside its berths (#854)', () => {
  it('buys nothing for the army that the berths cannot crew, however rich', () => {
    // The composition cycle is the want every refusal in a real match came
    // from: on seed 4000 seated Knights, Commune, Directorate, Consortium, the
    // Directorate's 115 refused orders were all Corvettes off its cycle. Every
    // doctrine here opens on a hull of two berths or more except the
    // Commune's, so a cycle that did not ask queues one into the one free
    // berth.
    const rich = { nodules: 100_000, crystal: 100_000, biomass: 100_000 };
    const fitted: UnitKind[] = [];
    for (const faction of NAVIES) {
      const bought = queued(briefing(faction), rich);
      const over = bought.filter((kind) => statsFor(kind).berths > 1);
      assert.deepEqual(
        over.map((k) => UnitKind[k]),
        [],
        `${Faction[faction]}: all fit one berth`
      );
      fitted.push(...bought);
    }
    // Not vacuous: a doctrine with a 1-berth army hull on it buys that.
    assert.ok(fitted.length > 0, 'some navy filled its free berth from the cycle');
  });

  it('saves for nothing the berths cannot crew', () => {
    // The Directorate, because its doctrine opens on two Corvettes (two
    // berths, 120 nodules) and carries a Light Scout (one berth, 50). On 100
    // nodules the Corvette is over `RUNG.SAVE_FROM`, so a bid for it opens a
    // hold and the navy buys nothing while the window runs. The bid is for the
    // first entry that fits instead, and the Light Scout is bought.
    const brief = briefing(Faction.Directorate);
    const [first] = DOCTRINE[Faction.Directorate].composition;
    assert.equal(first, UnitKind.Corvette, 'the case is argued from the doctrine it reads');
    // The snapshot stands still, so the scout it queued never shows and it
    // buys again on each observation; what is held is that it buys at all,
    // inside the window a hold would have spent, and buys only what fits.
    const bought = queued(brief, { nodules: 100, crystal: 0, biomass: 0 });
    assert.ok(bought.length > 0, 'it bought inside the window a hold would have spent');
    assert.deepEqual(
      [...new Set(bought.map((k) => UnitKind[k]))],
      ['LightScout'],
      'the one free berth takes the hull that fits, not a hold for one that does not'
    );
  });
});
