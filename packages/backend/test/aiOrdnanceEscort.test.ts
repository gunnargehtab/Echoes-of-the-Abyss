/**
 * The gunless ordnance hulls sail with the fleet — #1090.
 *
 * The Broadside, the Weaver and the Lance carry no gun, so they are not in the
 * commander's `army` and the army pass never orders them. Until
 * `keepWithFleet` did, nothing did: over ninety matches every Broadside spent
 * its life 540 m off its yard, and no Weaver in a four-seat match laid a
 * decoy, because the screen's only gate was 700 m from home and a Weaver
 * launches 617–718 m out.
 *
 * Decisions on synthesised snapshots, because which hull gets which order is
 * the whole of the fix and a real match cannot place them; then one arm in a
 * real match through the seat, to show the walk reaches `Match`.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AiDifficulty,
  Faction,
  ResolutionTier,
  SIM,
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
import { MoveOrder } from '../src/sim/components.ts';
import type { AiBriefing, AiCommand } from '../src/ai/types.ts';

const SEED = 0x1090;
const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_EVERY = SIM.TICK_HZ / SIM.ECHO_HZ;
/** `keepWithFleet` re-issues on a five-second clock; this watches seven of its windows. */
const WATCH = SIM.ECHO_HZ * 35;
/** How far out the fleet waits: past the 700 m home gate, and past `RANGE.ARRIVE_M`. */
const OUT_M = 2500;

function rig(navy: Faction): { match: Match; brief: AiBriefing; base: EchoSnapshot } {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, navy === Faction.Bathyarch ? Faction.Pelagia : Faction.Bathyarch);
  match.addPlayer(1, navy);
  const brief = briefingFor(match, 1, navy, AiDifficulty.Veteran);
  let base: EchoSnapshot | undefined;
  for (let i = 0; i < ECHO_EVERY * 2 && base === undefined; i++) {
    base = match.update(STEP_MS)?.get(1);
  }
  assert.ok(base !== undefined, 'the match produced no snapshot to work from');
  return { match, brief, base };
}

function own(id: number, kind: UnitKind, x: number, y: number): OwnUnit {
  const stats = statsFor(kind);
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

/** An enemy hull the layer has classified, `d` metres east of a point. */
function enemyNear(at: { x: number; y: number }, d: number): Contact {
  return {
    id: 7,
    tier: ResolutionTier.Classification,
    x: at.x + d,
    y: at.y,
    kind: UnitKind.Corvette,
    faction: Faction.Hadron,
    tick: 0,
  };
}

/**
 * Every order a fresh commander gives over `observations` Echo ticks, with
 * the units for each tick drawn from `unitsAt` so a hull can be moved between
 * them.
 */
function ordersFor(
  brief: AiBriefing,
  base: EchoSnapshot,
  unitsAt: (i: number) => OwnUnit[],
  contacts: Contact[] = [],
  observations = WATCH
): AiCommand[] {
  const commander = new AiCommander(brief);
  const orders: AiCommand[] = [];
  let tick = base.tick;
  for (let i = 0; i < observations; i++) {
    tick += ECHO_EVERY;
    const heard = contacts.map((c) => ({ ...c, tick }));
    const snapshot: EchoSnapshot = { ...base, tick, units: unitsAt(i), contacts: heard, marks: [] };
    orders.push(...commander.observe(snapshot));
  }
  return orders;
}

const movesOf = (orders: AiCommand[], id: number) =>
  orders.filter((o): o is Extract<AiCommand, { kind: 'move' }> =>
    o.kind === 'move' ? o.unitIds.includes(id) : false
  );

/**
 * Two Corvettes `OUT_M` west of home, and the point between them. West because
 * the real-match arm needs water there: slot 1 starts at the east edge, and a
 * hull spawned east of it is clamped back to within 300 m of its yard.
 */
function fleetOut(brief: AiBriefing): { fleet: OwnUnit[]; middle: { x: number; y: number } } {
  const home = brief.spawns[brief.slot]!;
  const fleet = [
    own(101, UnitKind.Corvette, home.x - OUT_M, home.y),
    own(102, UnitKind.Corvette, home.x - OUT_M, home.y + 200),
  ];
  return { fleet, middle: { x: home.x - OUT_M, y: home.y + 100 } };
}

describe('the gunless ordnance hulls keep with the fleet (#1090)', () => {
  for (const [navy, kind] of [
    [Faction.Bathyarch, UnitKind.Broadside],
    [Faction.Pelagia, UnitKind.Weaver],
    [Faction.Hadron, UnitKind.Lance],
  ] as const) {
    it(`walks a ${UnitKind[kind]} at its yard to where the fleet is`, () => {
      assert.equal(statsFor(kind).attackDamage, 0, "a hull with a gun is the army pass's");
      const { brief, base } = rig(navy);
      const home = brief.spawns[brief.slot]!;
      const { fleet, middle } = fleetOut(brief);
      const hull = own(201, kind, home.x + 540, home.y);
      const moves = movesOf(
        ordersFor(brief, base, () => [...fleet, hull]),
        201
      );
      assert.ok(moves.length > 0, `a ${UnitKind[kind]} at its yard was never walked`);
      for (const move of moves) {
        const off = Math.hypot(move.x - middle.x, move.y - middle.y);
        assert.ok(off < 1, `walked ${Math.round(off)} m from the fleet's middle`);
      }
    });
  }

  it('leaves a hull that has arrived standing', () => {
    // The control: a walk re-issued at a hull already with the fleet resets
    // its plan at every window for nothing.
    const { brief, base } = rig(Faction.Bathyarch);
    const { fleet, middle } = fleetOut(brief);
    const hull = own(201, UnitKind.Broadside, middle.x - 300, middle.y);
    const moves = movesOf(
      ordersFor(brief, base, () => [...fleet, hull]),
      201
    );
    assert.equal(moves.length, 0, 'a Broadside standing with the fleet was walked');
  });

  it('fires the Broadside rather than walking it when there is something in reach', () => {
    const { brief, base } = rig(Faction.Bathyarch);
    const home = brief.spawns[brief.slot]!;
    const { fleet } = fleetOut(brief);
    const hull = own(201, UnitKind.Broadside, home.x + 540, home.y);
    const orders = ordersFor(brief, base, () => [...fleet, hull], [enemyNear(hull, 1500)]);
    assert.ok(
      orders.some((o) => o.kind === 'torpedo' && o.unitId === 201),
      'the Broadside held its fire at a contact inside its reach'
    );
    assert.equal(movesOf(orders, 201).length, 0, 'a Broadside with a target was walked off it');
  });
});

describe('the Weaver lays only under way (#1090)', () => {
  // Out with the fleet, past the home gate, a classified hull 1.5 km off: the
  // case the old gate passed whether the Weaver was moving or not.
  function screen(stepM: number): AiCommand[] {
    const { brief, base } = rig(Faction.Pelagia);
    const { fleet, middle } = fleetOut(brief);
    return ordersFor(
      brief,
      base,
      (i) => [...fleet, own(201, UnitKind.Weaver, middle.x + i * stepM, middle.y)],
      [enemyNear(middle, 1500)],
      SIM.ECHO_HZ * 4
    );
  }
  const lays = (orders: AiCommand[]) =>
    orders.filter((o) => o.kind === 'layDecoy' && o.unitId === 201).length;

  it('lays nothing standing still', () => {
    assert.equal(lays(screen(0)), 0, 'a stopped Weaver laid its screen on one spot');
  });

  it('lays on the move', () => {
    // Five metres an Echo tick, a third of a cruising hull's, and well past
    // `UNDER_WAY_M` across the three ticks between Veteran decisions.
    assert.ok(lays(screen(5)) > 0, 'a moving Weaver with a fight 1.5 km off laid nothing');
  });
});

describe('the walk reaches the sim (#1090)', () => {
  it('sends a real Broadside from its yard toward the fleet', () => {
    const { match, brief } = rig(Faction.Bathyarch);
    const seat = new AiSeat(match, brief);
    const home = brief.spawns[brief.slot]!;
    const at = { x: home.x - OUT_M, y: home.y };
    for (const dy of [0, 200]) {
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction: Faction.Bathyarch,
        x: at.x,
        y: at.y + dy,
      });
    }
    const broadside = spawnUnit(match.world, {
      kind: UnitKind.Broadside,
      slot: 1,
      faction: Faction.Bathyarch,
      x: home.x + 540,
      y: home.y,
    });
    // Sixteen seconds. The clock opens a window every 25 observations and a
    // Veteran decides on every third, so only one window in three lands on a
    // decision: fifteen seconds is the longest a walk can wait.
    for (let i = 0; i < SIM.TICK_HZ * 16; i++) {
      const snapshot = match.update(STEP_MS)?.get(1);
      if (snapshot !== undefined) seat.observe(snapshot);
    }
    // Bound west of its yard, toward the Corvettes. Not onto them: the fleet's
    // middle counts the opening hulls the match started with, nearer home.
    assert.equal(MoveOrder.active[broadside], 1, 'the Broadside was never ordered anywhere');
    const west = home.x + 540 - MoveOrder.x[broadside]!;
    assert.ok(west > 1000, `the Broadside is bound only ${Math.round(west)} m toward the fleet`);
  });
});
