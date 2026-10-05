/**
 * The commander rallies its yards (#703) — the last verb `AiUnbuilt` listed.
 *
 * #703's second criterion is that no verb is built without a rule that spends
 * it and a test that shows it spent — the shape `aiCountermeasures.test.ts`
 * sets. This file is that test for `rally`, and it holds three things:
 *
 *   - the verb reaches the simulation, through the seat and the same
 *     `Match.setRally` a player's message reaches;
 *   - which yards are told: every one that launches a fighting hull, and
 *     never the Bastion, whose one line is the Harvester;
 *   - that it is said once, because the commander reads the rally back from
 *     the snapshot — and said again when a yard's rally is somewhere else.
 *
 * What a rally does to a launched hull is `posture.test.ts`'s, and is not
 * repeated here.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AiDifficulty,
  Faction,
  ResolutionTier,
  SIM,
  StructureKind,
  type EchoSnapshot,
  type OwnStructure,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import type { AiBriefing, AiCommand } from '../src/ai/types.ts';
import { Match } from '../src/sim/match.ts';
import { Structure } from '../src/sim/components.ts';

const SEED = 0x703;
const STEP_MS = 1000 / SIM.TICK_HZ;

function briefing(): AiBriefing {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Directorate);
  return briefingFor(match, 1, Faction.Directorate, AiDifficulty.Veteran);
}

/** Where the army masses: 1,200 m from home toward the other start. */
function musterOf(b: AiBriefing): { x: number; y: number } {
  const home = b.spawns[b.slot]!;
  const enemy = b.spawns.find((_, i) => i !== b.slot)!;
  const length = Math.hypot(enemy.x - home.x, enemy.y - home.y);
  return {
    x: home.x + ((enemy.x - home.x) / length) * 1200,
    y: home.y + ((enemy.y - home.y) / length) * 1200,
  };
}

function yard(id: number, kind: StructureKind, rally?: { x: number; y: number }): OwnStructure {
  return {
    id,
    kind,
    x: 1000 + id,
    y: 1000,
    depth: 600,
    hp: 1500,
    maxHp: 1500,
    sig: 35,
    buildProgress: 1,
    queue: [],
    queueProgress: 0,
    ...(rally === undefined ? {} : { rally }),
  };
}

function snapshot(structures: OwnStructure[]): EchoSnapshot {
  return {
    tick: 6000,
    ordnance: [],
    units: [],
    structures,
    contacts: [],
    peakSig: 30,
    berths: { used: 0, granted: 40 },
    refits: [],
    nodules: 0,
    crystal: 0,
    biomass: 0,
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    selfEvents: [],
    draw: { capacity: 6, demand: 0, satisfaction: 1 },
    driftHealth: [],
    shoals: [],
    jellies: [],
    hazards: [],
    marks: [],
  };
}

/** The `rally` commands one decision emits — a Veteran decides every third observation. */
function ralliesOn(commander: AiCommander, structures: OwnStructure[]) {
  const out: AiCommand[] = [];
  for (let i = 0; i < 3; i++) out.push(...commander.observe(snapshot(structures)));
  return out.filter((c): c is Extract<AiCommand, { kind: 'rally' }> => c.kind === 'rally');
}

describe('the commander rallies its yards (#703)', () => {
  it('reaches the simulation through the seat, on the Foundry and not the Bastion', () => {
    // The end-to-end arm: a real match and a real `AiSeat`, so the only way
    // a rally is written is the seat translating what the commander said
    // into the `Match.setRally` a player's message reaches.
    const match = new Match(undefined, { fauna: false, seed: SEED, record: true });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Directorate);
    const b = briefingFor(match, 1, Faction.Directorate, AiDifficulty.Veteran);
    const seat = new AiSeat(match, b);

    for (let i = 0; i < (SIM.TICK_HZ / SIM.ECHO_HZ) * 4; i++) {
      const own = match.update(STEP_MS)?.get(1);
      if (own !== undefined) seat.observe(own);
    }

    const muster = musterOf(b);
    let foundry = 0;
    let bastion = 0;
    for (const [eid, at] of match.world.rallies) {
      if (Structure.kind[eid] === StructureKind.Foundry) {
        foundry++;
        assert.ok(Math.hypot(at.x - muster.x, at.y - muster.y) < 1, 'at the muster point');
      }
      if (Structure.kind[eid] === StructureKind.Bastion) bastion++;
    }
    assert.equal(foundry, 1, 'the starting Foundry was rallied');
    assert.equal(bastion, 0, 'the Bastion was not: its one line is the Harvester');
    assert.ok(
      match.replay()?.commands.some((c) => c.type === 'rally' && c.slot === 1),
      'and the order is recorded like a player’s'
    );
  });

  it('points every yard with a fighting line at the muster point, once', () => {
    const b = briefing();
    const muster = musterOf(b);
    const commander = new AiCommander(b);
    const base = [
      yard(10, StructureKind.Bastion),
      yard(20, StructureKind.Foundry),
      yard(30, StructureKind.Slipway),
    ];

    const said = ralliesOn(commander, base);
    assert.equal(said.length, 1, 'one order for every yard');
    assert.deepEqual([...said[0]!.structureIds].sort(), [20, 30]);
    assert.ok(Math.hypot(said[0]!.x - muster.x, said[0]!.y - muster.y) < 1e-6);

    // The next snapshot shows the rally the order wrote, and a yard already
    // rallied there is told nothing.
    const rallied = [
      base[0]!,
      yard(20, StructureKind.Foundry, muster),
      yard(30, StructureKind.Slipway, muster),
    ];
    assert.equal(ralliesOn(commander, rallied).length, 0, 'not said again');
  });

  it('re-points a yard whose rally is somewhere else', () => {
    const b = briefing();
    const muster = musterOf(b);
    const commander = new AiCommander(b);
    const said = ralliesOn(commander, [
      yard(20, StructureKind.Foundry, muster),
      yard(30, StructureKind.Slipway, { x: muster.x + 500, y: muster.y }),
    ]);
    assert.equal(said.length, 1);
    assert.deepEqual(said[0]!.structureIds, [30], 'only the yard that is off the point');
  });
});
