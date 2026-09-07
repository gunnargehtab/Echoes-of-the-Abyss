/**
 * The commander wants the Pressure Refit — docs/systems-progression.md §2, #517.
 *
 * This is the half #491 charged the most for, restated one rung up: *a thing
 * nobody buys is a thing nobody has*. The Slipway was reachable on paper for
 * three pull requests before anything bought one, because nothing in
 * `AiCommander` had ever saved; a refit that only a human could buy would leave
 * the Consortium exactly where #517 found it in the harness — the one navy with
 * no route to the Abyssal band — while the table said otherwise.
 *
 * So what is asserted is the *want*, and the four shapes it has to take:
 * bought where it opens the crystal field, refused where §2 does not offer it,
 * refused where it would not reach the field anyway, and never bought twice.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AiDifficulty,
  Faction,
  HarvestThrottle,
  RefitKind,
  ResolutionTier,
  StructureKind,
  UnitKind,
  refitPriceFor,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { DOCTRINE } from '../src/ai/doctrine.ts';
import { briefingFor } from '../src/ai/seat.ts';
import type { AiBriefing, AiCommand } from '../src/ai/types.ts';
import { Match } from '../src/sim/match.ts';

const SEED = 0x517;

/** Sim ticks between two observations a Veteran actually acts on. */
const ECHO_TICKS = 12;

function briefing(faction: Faction): AiBriefing {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, faction);
  match.addPlayer(1, faction === Faction.Bathyarch ? Faction.Pelagia : Faction.Bathyarch);
  return briefingFor(match, 0, faction, AiDifficulty.Veteran);
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

function hull(
  id: number,
  kind: UnitKind,
  at: { x: number; y: number }
): EchoSnapshot['units'][number] {
  const stats = statsFor(kind);
  return {
    id,
    kind,
    x: at.x,
    y: at.y,
    depth: 300,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    heading: 0,
    sig: stats.sigIdle,
    silentRunning: false,
    engineOff: false,
    pressureBonus: 0,
    unhealableDamage: 0,
    ...(kind === UnitKind.Harvester ? { cargo: 0, throttle: HarvestThrottle.Standard } : {}),
  };
}

/**
 * A navy with its economy staffed and the yard standing.
 *
 * The harvester target matters: `commandConstruction` returns before any of the
 * saving branches while the economy is short of haulers, because teching on an
 * economy that cannot fund what it unlocks is the same mistake in a longer
 * form. A test that skipped it would be measuring that guard instead.
 */
function snapshot(
  brief: AiBriefing,
  yards: StructureKind[],
  overrides: Partial<EchoSnapshot> = {}
): EchoSnapshot {
  const home = brief.spawns[brief.slot]!;
  const haulers = DOCTRINE[brief.faction].harvesterTarget;
  return {
    tick: 6000,
    ordnance: [],
    units: Array.from({ length: haulers }, (_, i) =>
      hull(i + 1, UnitKind.Harvester, { x: home.x + i * 60, y: home.y })
    ),
    structures: [
      structure(20, StructureKind.Bastion, home),
      structure(21, StructureKind.Foundry, { x: home.x + 200, y: home.y }),
      structure(22, StructureKind.Refinery, { x: home.x - 200, y: home.y }),
      ...yards.map((kind, i) => structure(30 + i, kind, { x: home.x, y: home.y + 300 + i * 100 })),
    ],
    contacts: [],
    peakSig: 30,
    berths: { used: 0, granted: 40 },
    refits: [],
    nodules: 5000,
    crystal: 500,
    biomass: 0,
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    selfEvents: [],
    draw: { capacity: 12, demand: 4, satisfaction: 1 },
    driftHealth: [],
    shoals: [],
    jellies: [],
    hazards: [],
    marks: [],
    ...overrides,
  };
}

/** The refit orders a commander gives over a few observations of this state. */
function refitsAsked(brief: AiBriefing, state: EchoSnapshot): AiCommand[] {
  const commander = new AiCommander(brief);
  const asked: AiCommand[] = [];
  for (let i = 0; i < 6; i++) {
    for (const command of commander.observe({ ...state, tick: state.tick + i * ECHO_TICKS })) {
      if (command.kind === 'refit') asked.push(command);
    }
  }
  return asked;
}

describe('the commander and the Pressure Refit', () => {
  it('buys it for the navy whose doctrine line is that it buys access', () => {
    const brief = briefing(Faction.Bathyarch);
    const asked = refitsAsked(brief, snapshot(brief, [StructureKind.Slipway]));
    assert.ok(asked.length > 0, 'the Consortium has a route to the deep, and takes it');
    assert.equal(asked[0]!.kind === 'refit' && asked[0].refit, RefitKind.Pressure);
    // At the yard §2 names for it, which for this navy is the rung.
    assert.equal(asked[0]!.kind === 'refit' && asked[0].structureId, 30);
  });

  it('will not buy it before the rung it is bought on stands', () => {
    const brief = briefing(Faction.Bathyarch);
    assert.deepEqual(
      refitsAsked(brief, snapshot(brief, [])),
      [],
      'three navies buy it on the Slipway’s line, and there is no line until the yard'
    );
  });

  it('buys it at the Bastion for the Order, which needs no yard for it', () => {
    // §2's one carve-out: instant, priced in Resonance alone, and sounded at
    // the Bastion. So the Order's want opens on the first tick of the match
    // rather than behind 600 nodules of yard.
    const brief = briefing(Faction.Hadron);
    const asked = refitsAsked(brief, snapshot(brief, []));
    assert.ok(asked.length > 0);
    assert.equal(asked[0]!.kind === 'refit' && asked[0].structureId, 20, 'the Bastion');
  });

  it('never asks for one the navy is not offered, or one that would not reach the field', () => {
    for (const faction of [Faction.Directorate, Faction.Pelagia]) {
      const brief = briefing(faction);
      assert.deepEqual(
        refitsAsked(brief, snapshot(brief, [StructureKind.Slipway])),
        [],
        `${Faction[faction]}: §2 either does not offer it or stops it short of the Abyssal`
      );
    }
  });

  it('never buys one twice', () => {
    const brief = briefing(Faction.Bathyarch);
    assert.deepEqual(
      refitsAsked(
        brief,
        snapshot(brief, [StructureKind.Slipway], { refits: [RefitKind.Pressure] })
      ),
      [],
      'a refit is fleet-wide and bought once'
    );
  });

  it('holds the purse against it rather than spending the bank on the next hull', () => {
    // The saving rule #518 added, applied to the refit: a commander with the
    // crystal aboard and the nodules still coming does not let the yards spend
    // them. Asserted as *what it does not buy*, because the hold has no order
    // of its own — making the purse look poor is the saving.
    const brief = briefing(Faction.Bathyarch);
    const price = refitPriceFor(RefitKind.Pressure, Faction.Bathyarch);
    const short = snapshot(brief, [StructureKind.Slipway], {
      // The crystal is in hand, so waiting will close the gap; the nodules are
      // one short of the price, so this observation cannot pay for it.
      crystal: price.crystal,
      nodules: price.nodules - 1,
    });
    const commander = new AiCommander(brief);
    const bought: UnitKind[] = [];
    for (let i = 0; i < 6; i++) {
      for (const command of commander.observe({ ...short, tick: short.tick + i * ECHO_TICKS })) {
        if (command.kind === 'produce') bought.push(command.unit);
      }
    }
    assert.deepEqual(bought, [], 'the bank the yards would have emptied is held for the deep');
  });
});
