/**
 * The commander uses a transport — docs/units.md "The transports", wave 1 of
 * docs/roster-plan.md (#501), whose gate reads "the AI uses a transport in
 * at least one of four doctrines".
 *
 * Two of the four declare one: the Consortium's Freighter and the
 * Directorate's Verger. What is held here is the plan (`LIFT` in
 * commander.ts): the carrier is bought once, after the escort; it loads at
 * the rally from the hulls that gathered there, and those hulls leave the
 * army branch's hands the moment they are ordered aboard; a full hold sails
 * for a gun's reach short of the objective, at the doctrine's depth; and it
 * lands there, which commits the push. Synthetic snapshots, as the mine wall
 * and the crystal raid are tested, so a branch can be put under a state a
 * live match takes minutes to reach.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AiDifficulty,
  Faction,
  HarvestThrottle,
  ResolutionTier,
  StructureKind,
  UnitKind,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { DOCTRINE, TUNING } from '../src/ai/doctrine.ts';
import { briefingFor } from '../src/ai/seat.ts';
import { Match } from '../src/sim/match.ts';
import type { AiCommand } from '../src/ai/types.ts';

const SEED = 0x501;

function commanderFor(faction: Faction): {
  commander: AiCommander;
  home: { x: number; y: number };
  rally: { x: number; y: number };
  enemy: { x: number; y: number };
} {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, faction === Faction.Pelagia ? Faction.Bathyarch : Faction.Pelagia);
  match.addPlayer(1, faction);
  const briefing = briefingFor(match, 1, faction, AiDifficulty.Veteran);
  const home = briefing.spawns[1]!;
  const enemy = briefing.spawns[0]!;
  // The rally point, as the commander computes it: 1,200 m from home toward
  // the enemy start. Recomputed here rather than read, so the test states it.
  const dx = enemy.x - home.x;
  const dy = enemy.y - home.y;
  const length = Math.hypot(dx, dy) || 1;
  const rally = { x: home.x + (dx / length) * 1200, y: home.y + (dy / length) * 1200 };
  return { commander: new AiCommander(briefing), home, rally, enemy };
}

function snapshot(
  units: EchoSnapshot['units'],
  overrides: Partial<EchoSnapshot> = {}
): EchoSnapshot {
  return {
    tick: 6000,
    ordnance: [],
    units,
    structures: [
      {
        id: 20,
        kind: StructureKind.Foundry,
        x: 1000,
        y: 1000,
        depth: 300,
        hp: 1500,
        maxHp: 1500,
        sig: 35,
        buildProgress: 1,
        queue: [],
        queueProgress: 0,
      },
    ],
    contacts: [],
    peakSig: 30,
    berths: { used: 0, granted: 40 },
    nodules: 4000,
    crystal: 0,
    biomass: 400,
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    selfEvents: [],
    draw: { capacity: 6, demand: 0, satisfaction: 1 },
    driftHealth: [],
    shoals: [],
    jellies: [],
    hazards: [],
    marks: [],
    ...overrides,
  };
}

function hull(
  id: number,
  kind: UnitKind,
  at: { x: number; y: number },
  extra: Partial<EchoSnapshot['units'][number]> = {}
): EchoSnapshot['units'][number] {
  return {
    id,
    kind,
    x: at.x,
    y: at.y,
    depth: 300,
    hp: statsFor(kind).maxHp,
    maxHp: statsFor(kind).maxHp,
    heading: 0,
    sig: 14,
    silentRunning: false,
    pressureBonus: 0,
    unhealableDamage: 0,
    ...(kind === UnitKind.Harvester ? { cargo: 0, throttle: HarvestThrottle.Standard } : {}),
    ...(statsFor(kind).holdBerths !== undefined
      ? { hold: { berths: statsFor(kind).holdBerths!, used: 0 } }
      : {}),
    ...extra,
  };
}

/**
 * One decision. A Veteran decides every `cadenceTicks` observations and is
 * silent in between, so a decision is that many looks at the same snapshot.
 */
function decide(commander: AiCommander, snap: EchoSnapshot): AiCommand[] {
  const out: AiCommand[] = [];
  for (let i = 0; i < TUNING[AiDifficulty.Veteran].cadenceTicks; i++) {
    out.push(...commander.observe(snap));
  }
  return out;
}

/** Every command of one kind over `rounds` decisions, ticks advancing. */
function issued<K extends AiCommand['kind']>(
  commander: AiCommander,
  build: (tick: number) => EchoSnapshot,
  kind: K,
  rounds = 6
): Extract<AiCommand, { kind: K }>[] {
  const out: Extract<AiCommand, { kind: K }>[] = [];
  for (let i = 0; i < rounds; i++) {
    for (const command of decide(commander, build(6000 + i * 12))) {
      if (command.kind === kind) out.push(command as Extract<AiCommand, { kind: K }>);
    }
  }
  return out;
}

describe('the doctrines that field a transport', () => {
  it('declare the Freighter on the Consortium and the Verger on the Directorate', () => {
    // The gate: at least one of four. Two do, each with its own hull —
    // the composition is where a navy declares what it fields, and a
    // transport declared nowhere is a hull only a human ever buys.
    assert.ok(DOCTRINE[Faction.Bathyarch].composition.includes(UnitKind.Freighter));
    assert.ok(DOCTRINE[Faction.Directorate].composition.includes(UnitKind.Verger));
    assert.ok(!DOCTRINE[Faction.Pelagia].composition.includes(UnitKind.Drifter));
    assert.ok(!DOCTRINE[Faction.Hadron].composition.includes(UnitKind.Antiphon));
  });

  it('buys one Freighter, after the escort, and never a second', () => {
    const { commander, home } = commanderFor(Faction.Bathyarch);
    const escort = [1, 2, 3, 4].map((id) => hull(id, UnitKind.Corvette, home));
    const harvesters = [5, 6, 7, 8].map((id) => hull(id, UnitKind.Harvester, home));

    // No escort: no carrier. A hold with nothing to carry is not a want.
    const alone = issued(commander, () => snapshot([...harvesters]), 'produce', 3);
    assert.ok(!alone.some((c) => c.unit === UnitKind.Freighter), 'not before the escort');

    const wanted = issued(commander, () => snapshot([...escort, ...harvesters]), 'produce', 3);
    assert.ok(
      wanted.some((c) => c.unit === UnitKind.Freighter),
      'escorted: one is bought'
    );

    const carrier = hull(9, UnitKind.Freighter, home);
    const already = issued(
      commander,
      () => snapshot([...escort, ...harvesters, carrier]),
      'produce',
      6
    );
    assert.ok(!already.some((c) => c.unit === UnitKind.Freighter), 'and exactly one');
  });
});

describe('the lift', () => {
  it('walks the carrier to the rally, then orders the gathered hulls aboard and out of the army', () => {
    const { commander, home, rally } = commanderFor(Faction.Bathyarch);
    const harvesters = [5, 6, 7, 8].map((id) => hull(id, UnitKind.Harvester, home));
    const corvettes = [1, 2, 3, 4].map((id) => hull(id, UnitKind.Corvette, rally));

    // The carrier at home: first it walks to the rally, and nothing boards.
    const atHome = hull(9, UnitKind.Freighter, home);
    const walked = issued(
      commander,
      () => snapshot([...corvettes, ...harvesters, atHome]),
      'move',
      2
    );
    assert.ok(
      walked.some((m) => m.unitIds.includes(9) && Math.hypot(m.x - rally.x, m.y - rally.y) < 1),
      'the carrier is sent to the rally'
    );

    // At the rally: the four Corvettes are eight berths; the hold takes six —
    // three of them, lowest ids first, in one order.
    const atRally = hull(9, UnitKind.Freighter, rally);
    const commands = decide(commander, snapshot([...corvettes, ...harvesters, atRally]));
    const embark = commands.filter((c) => c.kind === 'embark');
    assert.equal(embark.length, 1, 'one boarding order');
    assert.deepEqual(embark[0]!.unitIds, [1, 2, 3], 'three Corvettes fit, by id');
    assert.equal(embark[0]!.carrierId, 9);
    for (const c of commands) {
      if (c.kind === 'move' || c.kind === 'attackMove') {
        assert.ok(
          !c.unitIds.some((id) => [1, 2, 3].includes(id)),
          `the boarding hulls are not also told to ${c.kind}`
        );
      }
    }

    // Once they report as closing, they are not asked again and are not the
    // army's; the fourth, which does not fit, stays with the army.
    const closing = [1, 2, 3].map((id) => hull(id, UnitKind.Corvette, rally, { embarking: 9 }));
    const again = decide(commander, snapshot([...closing, corvettes[3]!, ...harvesters, atRally]));
    assert.ok(!again.some((c) => c.kind === 'embark'), 'nothing more fits');
  });

  it('sails a full hold to a gun’s reach short of the objective, and lands it there', () => {
    const { commander, home, rally, enemy } = commanderFor(Faction.Bathyarch);
    const harvesters = [5, 6, 7, 8].map((id) => hull(id, UnitKind.Harvester, home));
    const aboard = [1, 2, 3].map((id) => hull(id, UnitKind.Corvette, rally, { aboard: 9 }));
    const spare = hull(4, UnitKind.Corvette, rally);
    const full = hull(9, UnitKind.Freighter, rally, { hold: { berths: 6, used: 6 } });

    const moves = issued(
      commander,
      () => snapshot([...aboard, spare, ...harvesters, full]),
      'move',
      3
    );
    const sailed = moves.find((m) => m.unitIds.length === 1 && m.unitIds[0] === 9);
    assert.ok(sailed !== undefined, 'the carrier sails');
    const toEnemy = Math.hypot(sailed.x - enemy.x, sailed.y - enemy.y);
    assert.ok(
      Math.abs(toEnemy - 900) < 5,
      `a gun's reach (900 m) short of the enemy start, was ${toEnemy.toFixed(0)}`
    );

    // At the drop point, it lands — and the landing commits the push: the
    // next observation attack-moves the landed hulls at the objective rather
    // than walking them back to the rally.
    const drop = { x: sailed.x, y: sailed.y };
    const arrived = hull(9, UnitKind.Freighter, drop, { hold: { berths: 6, used: 6 } });
    const landing = decide(
      commander,
      snapshot([
        ...aboard.map((u) => ({ ...u, x: drop.x, y: drop.y })),
        spare,
        ...harvesters,
        arrived,
      ])
    );
    assert.ok(
      landing.some((c) => c.kind === 'disembark' && c.unitIds[0] === 9),
      'lands the hold'
    );

    const landed = [1, 2, 3].map((id) => hull(id, UnitKind.Corvette, drop));
    const empty = hull(9, UnitKind.Freighter, drop);
    const push = decide(
      commander,
      snapshot([...landed, spare, ...harvesters, empty], { tick: 6100 })
    );
    const advance = push.find((c) => c.kind === 'attackMove');
    assert.ok(advance !== undefined, 'the landed force pushes');
    assert.ok(
      [1, 2, 3].every((id) => advance.unitIds.includes(id)),
      'with the hulls that were landed'
    );
    assert.ok(
      Math.hypot(advance.x - enemy.x, advance.y - enemy.y) <
        Math.hypot(rally.x - enemy.x, rally.y - enemy.y),
      'toward the enemy, not back to the rally'
    );
  });

  it('takes the Directorate’s Verger under the layer on the way', () => {
    const { commander, home, rally } = commanderFor(Faction.Directorate);
    const harvesters = [5, 6, 7, 8, 10].map((id) => hull(id, UnitKind.Harvester, home));
    const aboard = [1, 2].map((id) => hull(id, UnitKind.Corvette, rally, { aboard: 9 }));
    const full = hull(9, UnitKind.Verger, rally, { hold: { berths: 4, used: 4 } });
    const depths = issued(commander, () => snapshot([...aboard, ...harvesters, full]), 'depth', 2);
    const dive = depths.find((d) => d.unitIds.includes(9));
    assert.ok(dive !== undefined, 'the carrier is given a depth');
    assert.ok(dive.depthM > 1100, `under the layer, was ${dive.depthM}`);
  });
});
