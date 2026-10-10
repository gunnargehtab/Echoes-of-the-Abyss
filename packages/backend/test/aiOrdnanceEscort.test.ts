/**
 * The gunless ordnance hulls sail with the fleet — #1090.
 *
 * The Broadside, the Weaver and the Lance carry no gun, so they are not in the
 * commander's `army` and the army pass never orders them. Until
 * `keepWithFleet` did, nothing did: over ninety matches every Broadside spent
 * its life beside its yard, 540 m from home, and no Weaver in a four-seat match laid a
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
  ORDNANCE,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
  structureStatsFor,
  unitRadiusM,
  type Contact,
  type EchoSnapshot,
  type OwnUnit,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Magazine, MoveOrder, Velocity } from '../src/sim/components.ts';
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
    pressureRating: stats.pressureRating,
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

describe('a spent hull goes to a depot and fills (#1090)', () => {
  // The other half of the Broadside's stat block, "then ninety of sailing
  // home empty" (docs/units.md). Before this an empty hull with a contact in
  // reach stood where it emptied and ordered launches the server refused.
  const depotsOf = (base: EchoSnapshot) =>
    base.structures.filter(
      (s) => s.kind === StructureKind.Bastion || s.kind === StructureKind.Foundry
    );
  /**
   * Is this a point a hull of `kind` can stand at and fill: inside a depot's
   * 300 m, and outside the ring separation holds it at? A walk aimed inside
   * that ring never finishes (#1094).
   */
  const isBerth = (base: EchoSnapshot, kind: UnitKind, at: { x: number; y: number }) =>
    depotsOf(base).some((s) => {
      const d = Math.hypot(s.x - at.x, s.y - at.y);
      const ring = structureStatsFor(s.kind).radiusM + unitRadiusM(kind);
      return d >= ring && d <= ORDNANCE.TORPEDO.REARM_RANGE_M;
    });
  /** Where separation puts a hull of `kind` against a depot: on its ring, east. */
  const onRing = (depot: { kind: StructureKind; x: number; y: number }, kind: UnitKind) => ({
    x: depot.x + structureStatsFor(depot.kind).radiusM + unitRadiusM(kind),
    y: depot.y,
  });
  const spent = (kind: UnitKind, hull: OwnUnit, aboard: number): OwnUnit =>
    kind === UnitKind.Weaver ? { ...hull, decoys: aboard } : { ...hull, torpedoes: aboard };
  const magazineOf = (kind: UnitKind) =>
    kind === UnitKind.Weaver
      ? statsFor(kind).decoyMagazine!
      : (statsFor(kind).torpedoMagazine ?? ORDNANCE.TORPEDO.MAGAZINE);

  for (const [navy, kind] of [
    [Faction.Bathyarch, UnitKind.Broadside],
    [Faction.Pelagia, UnitKind.Weaver],
    [Faction.Hadron, UnitKind.Lance],
  ] as const) {
    it(`walks an empty ${UnitKind[kind]} out of a fight to a depot, and spends nothing`, () => {
      const { brief, base } = rig(navy);
      assert.ok(depotsOf(base).length > 0, 'the rig has no depot to walk to');
      const { fleet, middle } = fleetOut(brief);
      const hull = spent(kind, own(201, kind, middle.x, middle.y), 0);
      const orders = ordersFor(brief, base, () => [...fleet, hull], [enemyNear(middle, 1500)]);
      const moves = movesOf(orders, 201);
      assert.ok(moves.length > 0, `an empty ${UnitKind[kind]} was never sent to fill`);
      for (const move of moves)
        assert.ok(isBerth(base, kind, move), 'walked somewhere it cannot fill');
      assert.equal(
        orders.filter((o) => (o.kind === 'torpedo' || o.kind === 'layDecoy') && o.unitId === 201)
          .length,
        0,
        'an empty hull ordered a launch the server refuses'
      );
    });
  }

  it('keeps a filling hull at the depot until it is full', () => {
    // Half-filled is not done: the rearm only runs in range, so a hull that
    // left at two of four would be back for the rest a minute later.
    const { brief, base } = rig(Faction.Bathyarch);
    const { fleet } = fleetOut(brief);
    const depot = depotsOf(base)[0]!;
    // On the ring, where the sim holds it: the walk used to aim inside it, and
    // a hull placed there by hand was the only one that ever stood still.
    const ring = onRing(depot, UnitKind.Broadside);
    const at = own(201, UnitKind.Broadside, ring.x, ring.y);
    const orders = ordersFor(brief, base, (i) => [
      ...fleet,
      spent(UnitKind.Broadside, at, i === 0 ? 0 : 2),
    ]);
    assert.equal(movesOf(orders, 201).length, 0, 'a half-filled Broadside left its depot');
  });

  it('sends a full one back to the fleet', () => {
    const { brief, base } = rig(Faction.Bathyarch);
    const { fleet, middle } = fleetOut(brief);
    const depot = depotsOf(base)[0]!;
    const ring = onRing(depot, UnitKind.Broadside);
    const at = own(201, UnitKind.Broadside, ring.x, ring.y);
    const full = magazineOf(UnitKind.Broadside);
    const moves = movesOf(
      ordersFor(brief, base, (i) => [...fleet, spent(UnitKind.Broadside, at, i === 0 ? 0 : full)]),
      201
    );
    assert.ok(moves.length > 0, 'a full Broadside stayed at its depot');
    for (const move of moves) {
      assert.ok(Math.hypot(move.x - middle.x, move.y - middle.y) < 1, 'and not to the fleet');
    }
  });

  it('fires a part-spent Broadside rather than sending it home', () => {
    // The control: the trip starts at empty, not at the first launch.
    const { brief, base } = rig(Faction.Bathyarch);
    const { fleet, middle } = fleetOut(brief);
    const hull = spent(UnitKind.Broadside, own(201, UnitKind.Broadside, middle.x, middle.y), 2);
    const orders = ordersFor(brief, base, () => [...fleet, hull], [enemyNear(middle, 1500)]);
    assert.ok(
      orders.some((o) => o.kind === 'torpedo' && o.unitId === 201),
      'held its fire'
    );
    assert.equal(movesOf(orders, 201).length, 0, 'and was walked off its fight');
  });

  it('takes a real empty Broadside to a depot and fills it standing, all four', () => {
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
      x: at.x,
      y: at.y + 100,
    });
    Magazine.torpedoes[broadside] = 0;
    const full = magazineOf(UnitKind.Broadside);
    // Two and a half minutes: up to fifteen seconds before a five-second walk
    // window lands on a Veteran's every-third-observation decision, about a
    // minute of sailing at 40 m/s, and a minute of fill at 15 s a torpedo.
    let filling = 0;
    let fillingUnderWay = 0;
    let most = 0;
    for (let i = 0; i < SIM.TICK_HZ * 150 && most < full; i++) {
      const snapshot = match.update(STEP_MS)?.get(1);
      if (snapshot !== undefined) seat.observe(snapshot);
      most = Math.max(most, Magazine.torpedoes[broadside]!);
      if (Magazine.rearmRemainingS[broadside]! > 0) {
        filling++;
        if (Math.hypot(Velocity.x[broadside]!, Velocity.y[broadside]!) > 0.5) fillingUnderWay++;
      }
    }
    assert.equal(most, full, `filled to ${most} of ${full}`);
    // Standing, so at its idle SIG: the walk used to aim inside the depot's
    // ring and hold the hull against it under orders for the whole fill. A
    // little under way is the last metres into the berth after the 300 m line.
    assert.ok(
      fillingUnderWay < filling * 0.05,
      `under way for ${fillingUnderWay} of ${filling} ticks of fill`
    );
  });
});

describe('the ordnance hulls aim only at what they can fire on (#1341)', () => {
  it('fires the Broadside past a Tier-1 smudge on its own hull, at a bearing beyond it', () => {
    // docs/systems-combat.md §7 gates a launch at Tier 2. A Tier-1 contact is a
    // smudge the server reports at the listener's own position — here, on the
    // hull itself — so it was the nearest, and every launch ordered at it was
    // refused.
    const { brief, base } = rig(Faction.Bathyarch);
    const home = brief.spawns[brief.slot]!;
    const { fleet } = fleetOut(brief);
    const hull = own(201, UnitKind.Broadside, home.x + 540, home.y);
    const smudge: Contact = { id: 8, tier: ResolutionTier.Contact, x: hull.x, y: hull.y, tick: 0 };
    // A bearing as the layer sends one: a place, and nothing it was classified as.
    const bearing: Contact = {
      id: 7,
      tier: ResolutionTier.Bearing,
      x: hull.x + 1500,
      y: hull.y,
      tick: 0,
    };
    const torpedoes = ordersFor(brief, base, () => [...fleet, hull], [smudge, bearing]).filter(
      (o): o is Extract<AiCommand, { kind: 'torpedo' }> => o.kind === 'torpedo' && o.unitId === 201
    );
    assert.ok(torpedoes.length > 0, 'the Broadside held its fire at a bearing inside its reach');
    assert.ok(
      torpedoes.every((o) => o.contactId === bearing.id),
      'a launch was ordered at the smudge'
    );
  });
});
