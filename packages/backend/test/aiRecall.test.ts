/**
 * The massing army recalls every hull that is not at the rally — #946.
 *
 * `commandArmy`'s defend and in-reach branches order `attack`, and an attack
 * chases its target until it dies (`combat.ts`, "Only an explicit order
 * chases"), however far it runs. The massing branch used to move the army
 * only while *no* hull of it was at the rally point, so once one had arrived
 * the rest were never told again — and most of the rest were still chasing.
 * Measured on six seeds of twenty minutes, all four navies: 2,198 of the
 * observations that found a hull away from a waiting army found it carrying
 * an old attack order, against 21 that found a fresh launch.
 *
 * Two arms. The decision, on synthesised snapshots, because which hulls get
 * the order is the whole of the fix and a real match cannot place them. And
 * the chase itself, in a real match through the seat, because the defect
 * lives in the sim's side of the order: what has to be shown is that the
 * recall reaches `Match` and ends a pursuit the commander cannot hear.
 *
 * The rally point is read off the commander's own first order rather than
 * recomputed here, so this file restates no distance the commander owns.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AiDifficulty,
  Faction,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
  type Contact,
  type EchoSnapshot,
  type OwnUnit,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Position, Weapon } from '../src/sim/components.ts';
import type { AiBriefing, AiCommand } from '../src/ai/types.ts';

const SEED = 0x946;
const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_EVERY = SIM.TICK_HZ / SIM.ECHO_HZ;
/** Arrival, as the massing branch reads it (`RANGE.ARRIVE_M`). */
const ARRIVED_M = 700;

/**
 * The Consortium, because it masses at five: two hulls are under half of
 * that, which `stillMassing` answers with "keep waiting" whatever the clock
 * says. And its siege hull, the Tocsin, carries a gun — so it is in `army`,
 * which is the case the exemption exists for.
 */
const NAVY = Faction.Hadron;

function rig(): { match: Match; brief: AiBriefing; base: EchoSnapshot } {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, NAVY);
  const brief = briefingFor(match, 1, NAVY, AiDifficulty.Veteran);
  let base: EchoSnapshot | undefined;
  for (let i = 0; i < ECHO_EVERY * 2 && base === undefined; i++) {
    base = match.update(STEP_MS)?.get(1);
  }
  assert.ok(base !== undefined, 'the match produced no snapshot to work from');
  return { match, brief, base };
}

function hull(id: number, x: number, y: number, kind = UnitKind.Corvette): OwnUnit {
  const stats = statsFor(kind);
  assert.ok(stats.attackDamage > 0, `${UnitKind[kind]} carries no gun, so it is not in the army`);
  return {
    id,
    kind,
    x,
    y,
    depth: 600,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    heading: 0,
    sig: stats.sigIdle,
    silentRunning: false,
    engineOff: false,
    pressureBonus: 0,
    unhealableDamage: 0,
  };
}

/**
 * Every `move` a fresh commander gives over `observations` Echo ticks — by
 * default enough to decide twice at the Veteran cadence.
 */
function movesFor(
  brief: AiBriefing,
  base: EchoSnapshot,
  units: OwnUnit[],
  contacts: Contact[] = [],
  observations = 8
): AiCommand[] {
  const commander = new AiCommander(brief);
  const moves: AiCommand[] = [];
  let tick = base.tick;
  for (let i = 0; i < observations; i++) {
    tick += ECHO_EVERY;
    const heard = contacts.map((c) => ({ ...c, tick }));
    const snapshot: EchoSnapshot = { ...base, tick, units, contacts: heard };
    for (const command of commander.observe(snapshot)) {
      if (command.kind === 'move') moves.push(command);
    }
  }
  return moves;
}

/** Where the army waits: the point a commander walks a force to when none of it is there. */
function rallyOf(brief: AiBriefing, base: EchoSnapshot): { x: number; y: number } {
  const home = brief.spawns[brief.slot]!;
  const moves = movesFor(brief, base, [hull(9001, home.x, home.y)]);
  const first = moves.find((m) => m.kind === 'move' && m.unitIds.includes(9001));
  assert.ok(first !== undefined && first.kind === 'move', 'a lone hull at home was never walked');
  return { x: first.x, y: first.y };
}

const idsMoved = (moves: AiCommand[]) =>
  new Set(moves.flatMap((m) => (m.kind === 'move' ? m.unitIds : [])));

describe('recalling the massing army (#946)', () => {
  it('orders back the hull that is away, and only that one', () => {
    // The old gate's blind spot, as a snapshot: one hull waiting at the rally
    // and one 2.5 km off. `nearest` read the first and ordered nothing.
    const { brief, base } = rig();
    const rally = rallyOf(brief, base);
    const moves = movesFor(brief, base, [
      hull(101, rally.x, rally.y),
      hull(102, rally.x + 2500, rally.y),
    ]);
    const moved = idsMoved(moves);
    assert.ok(moved.has(102), 'the hull 2.5 km from a waiting army was left where it was');
    assert.ok(!moved.has(101), 'the hull already waiting was ordered again');
    for (const move of moves) {
      if (move.kind !== 'move' || !move.unitIds.includes(102)) continue;
      assert.equal(
        Math.round(move.x),
        Math.round(rally.x),
        'recalled somewhere other than the rally'
      );
      assert.equal(
        Math.round(move.y),
        Math.round(rally.y),
        'recalled somewhere other than the rally'
      );
    }
  });

  it('orders nothing once every hull is there', () => {
    // The control: a recall that fired at an army standing on its own rally
    // point would reset every hull's plan at the cadence for nothing.
    const { brief, base } = rig();
    const rally = rallyOf(brief, base);
    const moves = movesFor(brief, base, [
      hull(101, rally.x, rally.y),
      hull(102, rally.x + ARRIVED_M / 2, rally.y),
    ]);
    assert.equal(idsMoved(moves).size, 0, 'an army standing at its rally point was moved');
  });

  it('leaves the siege hull to the pass that walks it to a wall', () => {
    // `commandSiege` runs before the army does and walks the hull on its own
    // clock; a recall here would land after it in the same observation and
    // undo that walk every time. So the wall is given — a classified Bastion
    // well outside the in-reach ring, which leaves the army still waiting —
    // and the Tocsin must never be sent back to the rally.
    const { brief, base } = rig();
    const rally = rallyOf(brief, base);
    const wall: Contact = {
      id: 7,
      tier: ResolutionTier.Classification,
      x: rally.x + 5000,
      y: rally.y,
      structure: StructureKind.Bastion,
      faction: Faction.Bathyarch,
      tick: 0,
    };
    // `walkToWall` re-issues on a fifteen-second clock, so this watches for
    // two of its windows rather than two decisions.
    const moves = movesFor(
      brief,
      base,
      [hull(101, rally.x, rally.y), hull(103, rally.x + 2500, rally.y, UnitKind.Tocsin)],
      [wall],
      SIM.ECHO_HZ * 35
    );
    const tocsin = moves.filter((m) => m.kind === 'move' && m.unitIds.includes(103));
    assert.ok(tocsin.length > 0, 'the siege hull was never walked at the wall — the rig is wrong');
    for (const move of tocsin) {
      if (move.kind !== 'move') continue;
      assert.ok(
        Math.hypot(move.x - rally.x, move.y - rally.y) > ARRIVED_M,
        'the siege hull was ordered back to the rally with the army'
      );
    }
  });

  it('ends a chase the commander can no longer hear', () => {
    // The defect as it happens: a hull chasing an attack target into water
    // the commander is not listening to, while the rest of the force waits.
    // The target is set on the component rather than ordered through a
    // handle, because the handle is the part that has already gone — this is
    // the state an old `attack` leaves behind once its contact drops out.
    const { match, brief, base } = rig();
    const seat = new AiSeat(match, brief);
    const rally = rallyOf(brief, base);

    spawnUnit(match.world, { kind: UnitKind.Corvette, slot: 1, faction: NAVY, ...rally });
    const chaser = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: NAVY,
      x: rally.x,
      y: rally.y + 2500,
    });
    const quarry = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: rally.x,
      y: rally.y + 10500,
    });
    match.setEngineOff(0, quarry, true);
    Weapon.orderedTargetEid[chaser] = quarry;

    const away = () => Math.hypot(Position.x[chaser]! - rally.x, Position.y[chaser]! - rally.y);
    for (let i = 0; i < SIM.TICK_HZ * 45; i++) {
      const own = match.update(STEP_MS)?.get(1);
      if (own !== undefined) seat.observe(own);
    }
    assert.equal(Weapon.orderedTargetEid[chaser], 0, 'the chaser is still chasing');
    assert.ok(away() < ARRIVED_M, `the chaser ended ${Math.round(away())} m from the rally`);
  });
});
