/**
 * The massing army recalls every hull that is not at the rally — #946.
 *
 * `commandArmy`'s defend and in-reach branches order `attack`, and an attack
 * chases its target until it dies (`combat.ts`, "Only an explicit order
 * chases"), however far it runs. The massing branch used to move the army
 * only while *no* hull of it was at the rally point, so once one had arrived
 * the rest were never told again. Measured on six seeds of twenty minutes,
 * all four navies: of 5,027 observations that found a hull away from a
 * waiting army, 2,198 found it carrying an old attack order and 21 found a
 * fresh launch; most of the rest were already walking back.
 *
 * Two arms for the massing army. The decision, on synthesised snapshots, because which hulls get
 * the order is the whole of the fix and a real match cannot place them. And
 * the chase itself, in a real match through the seat, because the defect
 * lives in the sim's side of the order: what has to be shown is that the
 * recall reaches `Match` and ends a pursuit the commander cannot hear.
 *
 * The committed push had the same gap at its objective (#950), and its two
 * arms sit in the second suite, on synthesised snapshots alone: a real match
 * reaches that case on 18 of 16,365 push observations over thirty seeds, too
 * rarely to place. They pin the hull that is away being ordered on, and the
 * push standing on its objective being left alone.
 *
 * The third suite is the siege hull, which the army orders in none of these
 * branches (#971): the push leaves it to `commandSiege`, which walks it to the
 * fleet with no wall, and a fight in reach leaves it walking to its wall.
 *
 * The rally point is read off the commander's own first order rather than
 * recomputed here. Arrival is the one distance restated, below, because
 * `RANGE` is not exported.
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
import { MoveOrder, Weapon } from '../src/sim/components.ts';
import type { AiBriefing, AiCommand } from '../src/ai/types.ts';

const SEED = 0x946;
const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_EVERY = SIM.TICK_HZ / SIM.ECHO_HZ;
/** Arrival, as the massing branch reads it: `RANGE.ARRIVE_M`, restated. */
const ARRIVED_M = 700;

/**
 * The Knights, because they mass at five: two hulls are under half of
 * that, which `stillMassing` answers with "keep waiting" whatever the clock
 * says. And their siege hull, the Tocsin, carries a gun — so it is in `army`,
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
    // the commander is not listening to, while another hull waits at the
    // rally. The target is set on the component rather than ordered through a
    // handle, because the handle is the part that has already gone — this is
    // the state an old `attack` leaves behind once its contact drops out.
    //
    // Read after three seconds, before anything the commander can hear has a
    // chance to reorder the force. Left longer, `main` passes too: an in-reach
    // attack retargets the chaser, and a later whole-army move brings it home
    // — the right answer for the wrong reason.
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

    for (let i = 0; i < SIM.TICK_HZ * 3; i++) {
      const own = match.update(STEP_MS)?.get(1);
      if (own !== undefined) seat.observe(own);
    }
    assert.notEqual(Weapon.orderedTargetEid[chaser], quarry, 'the chaser is still chasing');
    const bound = Math.hypot(MoveOrder.x[chaser]! - rally.x, MoveOrder.y[chaser]! - rally.y);
    assert.equal(MoveOrder.active[chaser], 1, 'the chaser was stopped rather than recalled');
    assert.ok(bound < 1, `the chaser is bound ${Math.round(bound)} m from the rally`);
  });
});

/**
 * Every order a fresh commander gives over two phases: `first` long enough to
 * decide twice at the Veteran cadence, then `then` for as many again. The push
 * needs the two, because the target it walks at is what it heard in the first.
 */
function ordersAcross(
  brief: AiBriefing,
  base: EchoSnapshot,
  first: { units: OwnUnit[]; contacts: Contact[] },
  then: { units: OwnUnit[]; contacts: Contact[] },
  observations = 8
): { first: AiCommand[]; then: AiCommand[] } {
  const commander = new AiCommander(brief);
  const orders = { first: [] as AiCommand[], then: [] as AiCommand[] };
  let tick = base.tick;
  for (const phase of ['first', 'then'] as const) {
    const { units, contacts } = phase === 'first' ? first : then;
    for (let i = 0; i < observations; i++) {
      tick += ECHO_EVERY;
      const heard = contacts.map((c) => ({ ...c, tick }));
      // No marks: a mark is what `remember` falls back to, and one left over
      // from the rig's real match would replace the contact under test.
      const snapshot: EchoSnapshot = { ...base, tick, units, contacts: heard, marks: [] };
      orders[phase].push(...commander.observe(snapshot));
    }
  }
  return orders;
}

const idsAttackMoved = (orders: AiCommand[]) =>
  new Set(orders.flatMap((o) => (o.kind === 'attackMove' ? o.unitIds : [])));

/**
 * Five Corvettes, which is the Knights' whole massing number, so the first
 * decision commits. They start at home and hear one classified enemy hull
 * across the map, which the push walks at; then it goes quiet. `remembered`
 * keeps a classified contact for MEMORY_S after the last time it was heard,
 * so the push still walks at the point — and with nothing heard inside
 * PUSH_ENGAGE_M, it is the push branch, not the in-reach one, that answers.
 */
function push(): {
  brief: AiBriefing;
  base: EchoSnapshot;
  objective: { x: number; y: number };
  atHome: OwnUnit[];
  quarry: Contact;
} {
  const { brief, base } = rig();
  const home = brief.spawns[brief.slot]!;
  const enemy = brief.spawns.find((_, slot) => slot !== brief.slot)!;
  const objective = { x: (home.x + enemy.x) / 2, y: (home.y + enemy.y) / 2 };
  assert.ok(
    Math.hypot(objective.x - home.x, objective.y - home.y) > 2000,
    'the objective is too near home to be a push — the rig is wrong'
  );
  const atHome = [101, 102, 103, 104, 105].map((id, i) => hull(id, home.x + i * 40, home.y));
  const quarry: Contact = {
    id: 7,
    tier: ResolutionTier.Classification,
    x: objective.x,
    y: objective.y,
    faction: Faction.Bathyarch,
    tick: 0,
  };
  return { brief, base, objective, atHome, quarry };
}

describe('re-ordering the committed push (#950)', () => {
  it('orders on the hull that is away once the front is at the objective', () => {
    // The old gate's blind spot, in the push: four hulls standing on the
    // objective and one 2.5 km off. `nearest` read the four and ordered
    // nothing, so a hull still chasing an attack given in reach was never
    // told again.
    const { brief, base, objective, atHome, quarry } = push();
    const at = (id: number, dx: number) => hull(id, objective.x + dx, objective.y);
    const orders = ordersAcross(
      brief,
      base,
      { units: atHome, contacts: [quarry] },
      { units: [at(101, 0), at(102, 40), at(103, 80), at(104, 120), at(105, 2500)], contacts: [] }
    );

    const went = idsAttackMoved(orders.first);
    assert.equal(
      went.size,
      5,
      'the first decision was not a push of the whole army — the rig is wrong'
    );

    const moved = idsAttackMoved(orders.then);
    assert.ok(moved.has(105), 'the hull 2.5 km from the front was left on its last order');
    for (const id of [101, 102, 103, 104]) {
      assert.ok(!moved.has(id), `hull ${id}, already at the objective, was ordered again`);
    }
    for (const order of orders.then) {
      if (order.kind !== 'attackMove') continue;
      assert.equal(
        Math.round(order.x),
        Math.round(objective.x),
        'sent somewhere other than the objective'
      );
      assert.equal(
        Math.round(order.y),
        Math.round(objective.y),
        'sent somewhere other than the objective'
      );
    }
  });

  it('orders nothing once every hull is there', () => {
    // The control: a push standing on its objective is left alone, as it
    // always was — re-issuing would reset every hull's route at the cadence.
    const { brief, base, objective, atHome, quarry } = push();
    const orders = ordersAcross(
      brief,
      base,
      { units: atHome, contacts: [quarry] },
      {
        units: atHome.map((u, i) => hull(u.id, objective.x + i * (ARRIVED_M / 10), objective.y)),
        contacts: [],
      }
    );
    assert.equal(
      idsAttackMoved(orders.first).size,
      5,
      'the first decision was not a push — the rig is wrong'
    );
    assert.equal(
      idsAttackMoved(orders.then).size,
      0,
      'a push standing on its objective was ordered again'
    );
  });
});

describe('leaving the siege hull to the pass that besieges (#971)', () => {
  /** Every order a fresh commander gives over `observations` Echo ticks. */
  function ordersFor(
    brief: AiBriefing,
    base: EchoSnapshot,
    units: OwnUnit[],
    contacts: Contact[],
    observations: number
  ): AiCommand[] {
    const commander = new AiCommander(brief);
    const orders: AiCommand[] = [];
    let tick = base.tick;
    for (let i = 0; i < observations; i++) {
      tick += ECHO_EVERY;
      const heard = contacts.map((c) => ({ ...c, tick }));
      orders.push(...commander.observe({ ...base, tick, units, contacts: heard, marks: [] }));
    }
    return orders;
  }

  const ordersNaming = (orders: AiCommand[], kind: AiCommand['kind'], id: number) =>
    orders.filter((o) => o.kind === kind && 'unitIds' in o && o.unitIds.includes(id));

  it('walks it to the fleet in a push, where the attack-move used to take it', () => {
    // The push's attack-move took the Tocsin at every decision, so the walk
    // `commandSiege` gives on its own clock never landed. With no wall heard,
    // that walk now goes to the fleet's middle: where a pushing army is, which
    // the rally point it used to go to is not.
    const { brief, base, objective, atHome, quarry } = push();
    const home = brief.spawns[brief.slot]!;
    const at = (id: number, dx: number, kind = UnitKind.Corvette) =>
      hull(id, objective.x + dx, objective.y, kind);
    // Two of `commandSiege`'s windows a phase, as the massing suite watches.
    const orders = ordersAcross(
      brief,
      base,
      { units: [...atHome, hull(106, home.x, home.y + 40, UnitKind.Tocsin)], contacts: [quarry] },
      {
        units: [
          at(101, 0),
          at(102, 40),
          at(103, 80),
          at(104, 120),
          at(106, -2500, UnitKind.Tocsin),
        ],
        contacts: [],
      },
      SIM.ECHO_HZ * 35
    );

    const went = idsAttackMoved(orders.first);
    for (const id of [101, 102, 103, 104, 105]) {
      assert.ok(went.has(id), 'the first decision was not a push — the rig is wrong');
    }
    for (const phase of [orders.first, orders.then]) {
      assert.equal(ordersNaming(phase, 'attackMove', 106).length, 0, 'the push took the Tocsin');
    }
    // Already with the fleet, so left alone: a stationary Tocsin re-walked at
    // every window would never stand still long enough to fire.
    assert.equal(
      ordersNaming(orders.first, 'move', 106).length,
      0,
      'the Tocsin standing with its fleet was walked'
    );
    const walks = ordersNaming(orders.then, 'move', 106);
    assert.ok(walks.length > 0, 'the Tocsin 2.5 km behind its push was never walked');
    const rally = rallyOf(brief, base);
    for (const walk of walks) {
      if (walk.kind !== 'move') continue;
      assert.ok(
        Math.hypot(walk.x - (objective.x + 60), walk.y - objective.y) < 1,
        `walked to (${Math.round(walk.x)}, ${Math.round(walk.y)}), not the fleet's middle`
      );
      assert.ok(
        Math.hypot(walk.x - rally.x, walk.y - rally.y) > ARRIVED_M,
        'walked back to the rally point, away from its push'
      );
    }
  });

  it('keeps it walking to its wall while the army fights in reach', () => {
    // The fight branch ordered the whole army onto one contact, siege hull
    // and all, and an ordered target chases. The wall is a classified Bastion
    // 2.5 km past the Tocsin; the fight is a classified hull beside the line.
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
    const raider: Contact = {
      id: 8,
      tier: ResolutionTier.Classification,
      x: rally.x,
      y: rally.y + 400,
      faction: Faction.Bathyarch,
      tick: 0,
    };
    const orders = ordersFor(
      brief,
      base,
      [hull(101, rally.x, rally.y), hull(103, rally.x + 2500, rally.y, UnitKind.Tocsin)],
      [wall, raider],
      SIM.ECHO_HZ * 35
    );

    const fights = orders.filter((o) => o.kind === 'attack' && o.contactId === raider.id);
    assert.ok(fights.length > 0, 'the army never fought the hull in reach — the rig is wrong');
    assert.equal(ordersNaming(orders, 'attack', 103).length, 0, 'the fight took the Tocsin');
    const walks = ordersNaming(orders, 'move', 103);
    assert.ok(walks.length > 0, 'the Tocsin was never walked at its wall');
    const standoff = statsFor(UnitKind.Tocsin).attackRangeM * 0.95;
    for (const walk of walks) {
      if (walk.kind !== 'move') continue;
      assert.ok(
        Math.abs(Math.hypot(walk.x - wall.x, walk.y - wall.y) - standoff) < 1,
        'walked somewhere other than its standoff ring'
      );
    }
  });
});
