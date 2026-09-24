/**
 * The flight — docs/systems-combat.md §15, docs/units.md "The carriers"
 * (wave 8 of docs/roster-plan.md, #838).
 *
 * The four carriers and the mechanism they share, held to §15's own sentences:
 * a deck opens on an enemy inside the tether and is heard doing it; a craft is
 * launched into the band its carrier holds and never leaves it; the flight
 * takes the carrier's target, is recalled at the tether, expires on its own
 * cell, and dies with the hull that guides it. Plus the two refusals that make
 * it a carrier rather than a squadron: a craft takes no order, and a deck does
 * not fit in a hold.
 *
 * Observations are taken from the components, because every claim here is
 * about the world rather than about what a player is told — with one
 * exception, the launch transient, which is a claim about what the water
 * carries and is read off the carrier's live SIG.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent } from 'bitecs';
import {
  FLIGHT,
  Faction,
  SIM,
  UnitKind,
  statsFor,
  type EchoSnapshot,
  type UnitStats,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { hashWorld } from '../src/sim/stateHash.ts';
import {
  Acoustic,
  Craft,
  Flightdeck,
  Health,
  Heading,
  MoveOrder,
  Position,
  SilentRunning,
  Unit,
  Weapon,
} from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): Map<number, EchoSnapshot> | null {
  let last: Map<number, EchoSnapshot> | null = null;
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) {
    const out = match.update(STEP_MS);
    if (out !== null) last = out;
  }
  return last;
}

/** Slot 0 of this navy against slot 1, on flat open water, nothing else afloat. */
function water(faction: Faction, enemy = Faction.Directorate, seed = 838): Match {
  const match = new Match(undefined, {
    fauna: false,
    seed,
    terrain: new Terrain(12000, 12000, 250, { floorM: 3200 }),
  });
  match.addPlayer(0, faction);
  match.addPlayer(1, enemy);
  return match;
}

function hull(
  match: Match,
  slot: number,
  faction: Faction,
  kind: UnitKind,
  x: number,
  y: number,
  depth?: number
): number {
  return spawnUnit(match.world, {
    kind,
    slot,
    faction,
    x,
    y,
    ...(depth !== undefined ? { depth } : {}),
  });
}

/** The craft this carrier has in the water, read off the world rather than a component. */
function flightOf(match: Match, carrier: number): number[] {
  return [...(match.world.flights.get(carrier) ?? [])];
}

/** The handle slot 0 holds for `eid`, once the Echo pass has resolved it. */
function handleFor(match: Match, eid: number, seconds = 4): number {
  let handle = 0;
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps && handle === 0; i++) {
    const out = match.update(STEP_MS);
    const snapshot = out?.get(0);
    if (snapshot === undefined) continue;
    for (const contact of snapshot.contacts) {
      if (match.echo.entityForHandle(0, contact.id) === eid) handle = contact.id;
    }
  }
  return handle;
}

/** Every carrier in the roster, with its deck — the table these tests walk. */
const CARRIERS: readonly UnitStats[] = Object.values(UnitKind)
  .filter((k): k is UnitKind => typeof k === 'number')
  .map((kind) => statsFor(kind))
  .filter((stats) => stats.flight !== undefined);

describe('the deck — when a carrier launches, and what it costs to', () => {
  it('opens on an enemy inside the tether and not before', () => {
    const match = water(Faction.Bathyarch);
    const gantry = hull(match, 0, Faction.Bathyarch, UnitKind.Gantry, 6000, 6000);
    const far = hull(match, 1, Faction.Directorate, UnitKind.Corvette, 6000, 6000 + 2400);

    advance(match, 6);
    assert.equal(flightOf(match, gantry).length, 0, 'nothing to launch at yet');
    assert.equal(
      Flightdeck.aboard[gantry],
      statsFor(UnitKind.Gantry).flight!.capacity,
      'and the deck left the yard full'
    );

    // Inside the tether. One craft, then the next after the interval — a deck
    // is not a volley (§15).
    Position.y[far] = 6000 + FLIGHT.TETHER_M - 200;
    advance(match, 0.5);
    assert.equal(flightOf(match, gantry).length, 1, 'one away');
    advance(match, FLIGHT.LAUNCH_INTERVAL_S - 1);
    assert.equal(flightOf(match, gantry).length, 1, 'and the deck waits its interval');
    advance(match, 1.5);
    assert.equal(flightOf(match, gantry).length, 2, 'then the second');

    // Capacity counts the water and the shed together, so a full flight is
    // the end of it however long the fight lasts.
    advance(match, 20);
    assert.equal(flightOf(match, gantry).length, 2, 'and the deck is empty');
    assert.equal(Flightdeck.aboard[gantry], 0);
  });

  it('is heard opening, on the hull and never on the craft', () => {
    const match = water(Faction.Pelagia);
    const rootstock = hull(match, 0, Faction.Pelagia, UnitKind.Rootstock, 6000, 6000);
    hull(match, 1, Faction.Directorate, UnitKind.Corvette, 6000, 6000 + 1100);
    const quiet = statsFor(UnitKind.Rootstock).sigIdle;

    advance(match, 0.5);
    const craft = flightOf(match, rootstock);
    assert.equal(craft.length, 1, 'a craft is away');
    assert.ok(
      Acoustic.sig[rootstock]! >= quiet + FLIGHT.LAUNCH_SIG - 1,
      `the deck opening is +${FLIGHT.LAUNCH_SIG} on the hull, and it read ${Acoustic.sig[rootstock]}`
    );
    assert.ok(
      Acoustic.sig[craft[0]!]! <= statsFor(UnitKind.Runner).sigCruise + 1,
      'and nothing of it is on the craft'
    );

    // The transient is transient: the hull is back to what it is doing. Past
    // the deck's own capacity first — every launch spikes, so the hull is not
    // quiet again until it has nothing left to launch.
    advance(match, statsFor(UnitKind.Rootstock).flight!.capacity * FLIGHT.LAUNCH_INTERVAL_S + 12);
    assert.ok(Acoustic.sig[rootstock]! < quiet + FLIGHT.LAUNCH_SIG, 'the deck is shut again');
  });

  it('keeps a silent carrier’s deck shut unless the player orders the attack', () => {
    const match = water(Faction.Bathyarch);
    const gantry = hull(match, 0, Faction.Bathyarch, UnitKind.Gantry, 6000, 6000);
    const enemy = hull(match, 1, Faction.Directorate, UnitKind.Corvette, 6000, 6000 + 1100);
    match.setSilentRunning(0, gantry, true);

    advance(match, 8);
    assert.equal(SilentRunning.active[gantry], 1, 'still silent');
    assert.equal(flightOf(match, gantry).length, 0, 'a silent hull volunteers nothing');

    // An order overrides it, as an order always does — and the launch breaks
    // the silence, exactly as an ordered shot would.
    const handle = handleFor(match, enemy);
    assert.notEqual(handle, 0, 'the Corvette resolved');
    match.orderAttackContact(0, gantry, handle);
    advance(match, 1);
    assert.equal(flightOf(match, gantry).length, 1, 'ordered, the deck opens');
    assert.equal(SilentRunning.active[gantry], 0, 'and the silence is spent');
  });

  it('refuses the Offertory a launch at anything it is not facing', () => {
    const match = water(Faction.Hadron);
    const offertory = hull(match, 0, Faction.Hadron, UnitKind.Offertory, 6000, 6000);
    // Astern: the hull faces due east (+x) by default, and the enemy is west.
    const enemy = hull(match, 1, Faction.Directorate, UnitKind.Corvette, 6000 - 700, 6000);

    advance(match, 6);
    assert.equal(flightOf(match, offertory).length, 0, 'the cone refuses a bearing astern');

    // Turn the hull onto it. The arc it launches through is the arc it is
    // loudest in, which is the trade the hull is for.
    Heading.rad[offertory] = Math.PI;
    advance(match, 1);
    assert.equal(flightOf(match, offertory).length, 1, 'facing it, the deck opens');
    assert.ok(Position.x[enemy]! < Position.x[offertory]!, 'and the enemy is where it was');
  });

  it('rebuilds a craft it lost, on the deck’s own clock', () => {
    const match = water(Faction.Pelagia);
    const rootstock = hull(match, 0, Faction.Pelagia, UnitKind.Rootstock, 6000, 6000);
    hull(match, 1, Faction.Directorate, UnitKind.Corvette, 6000, 6000 + 1100);
    const deck = statsFor(UnitKind.Rootstock).flight!;

    advance(match, deck.capacity * FLIGHT.LAUNCH_INTERVAL_S + 2);
    assert.equal(flightOf(match, rootstock).length, deck.capacity, 'the whole flight is out');
    assert.equal(Flightdeck.aboard[rootstock], 0, 'and the shed is empty');

    // Kill one. The deck is short, so the clock starts — and only then.
    const lost = flightOf(match, rootstock)[0]!;
    Health.hp[lost] = 0;
    advance(match, 0.5);
    assert.ok(!hasComponent(match.world, Unit, lost), 'the craft is gone');
    assert.equal(Flightdeck.aboard[rootstock], 0, 'and the replacement is not free');

    advance(match, deck.rebuildS + 1);
    assert.equal(
      flightOf(match, rootstock).length + Flightdeck.aboard[rootstock]!,
      deck.capacity,
      'the deck is back at capacity, in the water or in the shed'
    );
  });
});

describe('the craft — the three bounds §15 puts on one', () => {
  it('holds the band it was launched into, and takes no depth order', () => {
    const match = water(Faction.Directorate, Faction.Bathyarch);
    const deep = 2400;
    const succentor = hull(match, 0, Faction.Directorate, UnitKind.Succentor, 6000, 6000, deep);
    hull(match, 1, Faction.Bathyarch, UnitKind.Corvette, 6000, 6600, deep);

    advance(match, 1);
    const treble = flightOf(match, succentor)[0]!;
    assert.ok(treble !== undefined, 'a Treble is away');
    assert.equal(Position.depth[treble], deep, 'launched into its carrier’s band');

    // A craft has no depth drive, so the order is refused outright — the same
    // refusal a hull in a hold gets, and from the same gate.
    assert.equal(match.orderDepth(0, treble, 300), false, 'and refuses the column');
    advance(match, 10);
    assert.equal(Position.depth[treble], deep, 'still where it was launched');
    assert.equal(match.orderFollowFloor(0, treble, true), false, 'and the floor, too');
  });

  it('takes the carrier’s ordered target, and nothing of its own', () => {
    const match = water(Faction.Bathyarch);
    const gantry = hull(match, 0, Faction.Bathyarch, UnitKind.Gantry, 6000, 6000);
    const enemy = hull(match, 1, Faction.Directorate, UnitKind.Corvette, 6000, 6000 + 900);

    const handle = handleFor(match, enemy);
    assert.notEqual(handle, 0, 'the Corvette resolved');
    match.orderAttackContact(0, gantry, handle);
    advance(match, FLIGHT.LAUNCH_INTERVAL_S + 2);

    const craft = flightOf(match, gantry);
    assert.ok(craft.length >= 1, 'the flight is away');
    for (const eid of craft) {
      assert.equal(Weapon.orderedTargetEid[eid], enemy, 'every craft holds the carrier’s target');
    }
    // And the carrier itself never fires: the deck is fire control, the hull
    // has no gun, and the damage on the board is the flight's.
    const before = Health.hp[enemy]!;
    advance(match, 12);
    assert.ok(Health.hp[enemy]! < before, 'the flight is shooting');
    assert.equal(statsFor(UnitKind.Gantry).attackDamage, 0, 'and the carrier has nothing to');
  });

  it('is recalled at the tether', () => {
    const match = water(Faction.Bathyarch);
    const gantry = hull(match, 0, Faction.Bathyarch, UnitKind.Gantry, 6000, 6000);
    hull(match, 1, Faction.Directorate, UnitKind.Corvette, 6000, 6600);

    advance(match, 1);
    const spark = flightOf(match, gantry)[0]!;
    // Put it outside the tether the only way a test can: a craft takes no
    // order, so the water is moved rather than the craft.
    Position.x[spark] = Position.x[gantry]! + FLIGHT.TETHER_M + 400;
    advance(match, 0.2);

    assert.equal(Weapon.orderedTargetEid[spark], 0, 'it drops what it was doing');
    assert.equal(MoveOrder.active[spark], 1, 'and is coming back');
    const wasX = Position.x[spark]!;
    advance(match, 6);
    assert.ok(Position.x[spark]! < wasX, 'closing on its carrier');
  });

  it('runs out of cell and stops, and nobody is credited for it', () => {
    const match = water(Faction.Pelagia);
    const rootstock = hull(match, 0, Faction.Pelagia, UnitKind.Rootstock, 6000, 6000);
    hull(match, 1, Faction.Directorate, UnitKind.Corvette, 6000, 6000 + 1100);

    advance(match, 1);
    const runner = flightOf(match, rootstock)[0]!;
    assert.ok(
      Craft.enduranceRemainingS[runner]! > FLIGHT.ENDURANCE_S - 2,
      'a full cell at launch, less the second it has been flying'
    );

    // Wound the cell rather than waiting two minutes of wall clock: the claim
    // is what happens at zero, and the countdown is one subtraction a tick.
    Craft.enduranceRemainingS[runner] = 0.2;
    const marksBefore = match.world.marks.count;
    advance(match, 0.5);
    assert.ok(!hasComponent(match.world, Unit, runner), 'the craft is gone');
    assert.equal(
      match.world.marks.count,
      marksBefore,
      'and nothing about it was written into the water'
    );
  });

  it('takes no order of its own, whoever gives it', () => {
    const match = water(Faction.Bathyarch);
    const gantry = hull(match, 0, Faction.Bathyarch, UnitKind.Gantry, 6000, 6000);
    const enemy = hull(match, 1, Faction.Directorate, UnitKind.Corvette, 6000, 6600);
    advance(match, 1);
    const spark = flightOf(match, gantry)[0]!;

    const handle = handleFor(match, enemy);
    match.orderMove(0, spark, 9000, 9000);
    assert.notEqual(MoveOrder.x[spark], 9000, 'a craft is not steered by the player');
    match.orderAttackMove(0, spark, 9000, 9000);
    assert.notEqual(MoveOrder.x[spark], 9000, 'nor attack-moved');
    match.orderHold(0, spark, true);
    match.setSilentRunning(0, spark, true);
    assert.equal(SilentRunning.active[spark], 0, 'nor hushed');
    if (handle !== 0) {
      Weapon.orderedTargetEid[spark] = 0;
      match.orderAttackContact(0, spark, handle);
      assert.equal(Weapon.orderedTargetEid[spark], 0, 'nor aimed');
    }
  });
});

describe('the flight and its carrier', () => {
  it('dies with it, on the tick it dies', () => {
    const match = water(Faction.Directorate, Faction.Bathyarch);
    const succentor = hull(match, 0, Faction.Directorate, UnitKind.Succentor, 6000, 6000);
    hull(match, 1, Faction.Bathyarch, UnitKind.Corvette, 6000, 6000 + 1100);

    advance(match, 3 * FLIGHT.LAUNCH_INTERVAL_S);
    const flight = flightOf(match, succentor);
    assert.ok(flight.length >= 2, 'a flight is in the water');

    Health.hp[succentor] = 0;
    advance(match, 1 / SIM.TICK_HZ);
    assert.ok(!hasComponent(match.world, Unit, succentor), 'the carrier is gone');
    for (const eid of flight) {
      assert.ok(!hasComponent(match.world, Unit, eid), 'and its flight went with it');
    }
    assert.equal(match.world.flights.get(succentor), undefined, 'and the list went too');
  });

  it('cannot be put in a hold — a deck does not fit in one', () => {
    const match = water(Faction.Bathyarch);
    const freighter = hull(match, 0, Faction.Bathyarch, UnitKind.Freighter, 6000, 6000);
    const gantry = hull(match, 0, Faction.Bathyarch, UnitKind.Gantry, 6000, 6100);

    match.orderEmbark(0, gantry, freighter);
    advance(match, 8);
    assert.ok(hasComponent(match.world, Position, gantry), 'the carrier is still in the water');
  });

  it('goes round its carrier to the target, and never moves it (#863)', () => {
    // A craft enters the water on a world-frame ring, so one launched astern
    // has its target on the far side of the hull that launched it. Before
    // #863 it chased straight through, and separation — which moves both hulls
    // of an overlapping pair — shoved the carrier along the craft's course:
    // an Offertory holding 993 m off a Cruiser was pushed inside the 900 m gun
    // and sunk. §15's carrier is a kilometre away and quiet.
    //
    // Every carrier, holding position, with its target placed exactly
    // opposite its second station: the second craft is launched dead astern
    // and dead in line, which is the one geometry with no side to slide to.
    for (const carrier of CARRIERS) {
      const faction = carrier.faction!;
      const enemyFaction = faction === Faction.Bathyarch ? Faction.Pelagia : Faction.Bathyarch;
      const match = water(faction, enemyFaction);
      const eid = hull(match, 0, faction, carrier.kind, 6000, 6000);
      const bearing = (1 / carrier.flight!.capacity) * Math.PI * 2 + Math.PI;
      const enemy = hull(
        match,
        1,
        enemyFaction,
        UnitKind.Corvette,
        6000 + Math.cos(bearing) * 1000,
        6000 + Math.sin(bearing) * 1000
      );
      match.orderHold(0, eid, true);
      const handle = handleFor(match, enemy);
      assert.notEqual(handle, 0, `${carrier.name}: the Corvette resolved`);
      match.orderAttackContact(0, eid, handle);

      const gap = (a: number): number =>
        Math.hypot(Position.x[enemy]! - Position.x[a]!, Position.y[enemy]! - Position.y[a]!);
      let astern = 0;
      let roundIt = false;
      let drift = 0;
      for (let i = 0; i < SIM.TICK_HZ * 20; i++) {
        match.update(STEP_MS);
        drift = Math.max(drift, Math.hypot(Position.x[eid]! - 6000, Position.y[eid]! - 6000));
        if (astern === 0) {
          astern = flightOf(match, eid).find((c) => Craft.station[c] === 1) ?? 0;
        }
        if (astern !== 0 && hasComponent(match.world, Position, astern) && gap(astern) < gap(eid)) {
          roundIt = true;
        }
      }
      assert.notEqual(astern, 0, `${carrier.name}: a craft was launched astern`);
      assert.ok(drift < 1, `${carrier.name}: the carrier did not move (${drift.toFixed(1)} m)`);
      assert.ok(roundIt, `${carrier.name}: and the craft got round it to the target`);
    }
  });

  it('leaves the same fingerprint twice, flight and all', () => {
    // A launch ring taken from a random bearing would pass every test above
    // and diverge a replay, which is the failure `stateHash` exists to catch.
    const run = (): number => {
      const match = water(Faction.Hadron, Faction.Bathyarch, 4242);
      const offertory = hull(match, 0, Faction.Hadron, UnitKind.Offertory, 6000, 6000);
      hull(match, 1, Faction.Bathyarch, UnitKind.Corvette, 6000 + 600, 6000);
      hull(match, 0, Faction.Hadron, UnitKind.Clarion, 6000, 6200);
      void offertory;
      advance(match, 25);
      return hashWorld(match.world);
    };
    assert.equal(run(), run(), 'two runs of one match must agree bit for bit');
  });
});

describe('every carrier in the roster', () => {
  it('launches its own craft, at its own depth, and charges nothing for it', () => {
    // The table walk: whatever a later wave adds to the Carrier row, it does
    // these four things or it is not a carrier.
    for (const carrier of CARRIERS) {
      const faction = carrier.faction!;
      const match = water(
        faction,
        faction === Faction.Bathyarch ? Faction.Pelagia : Faction.Bathyarch
      );
      const eid = hull(match, 0, faction, carrier.kind, 6000, 6000, 900);
      const enemy = hull(
        match,
        1,
        faction === Faction.Bathyarch ? Faction.Pelagia : Faction.Bathyarch,
        UnitKind.Corvette,
        6000 + 1100,
        6000,
        900
      );
      void enemy;
      const berthsBefore = match.berthsFor(0).used;
      advance(match, 2);

      const flight = flightOf(match, eid);
      assert.equal(flight.length, 1, `${carrier.name} launched one craft`);
      const craft = flight[0]!;
      assert.equal(Unit.kind[craft], carrier.flight!.craft, `${carrier.name} launched its own`);
      assert.equal(Position.depth[craft], 900, `${carrier.name}'s craft holds the band`);
      assert.equal(
        match.berthsFor(0).used,
        berthsBefore,
        `${carrier.name}'s flight was charged when the hull was, and not again`
      );
    }
  });
});

describe('what a flight costs the 60 Hz step', () => {
  it('stays inside the acquisition budget on a board full of decks', () => {
    // A deck scans for something to launch at, and that scan is all-pairs like
    // `combatSystem`'s — so it is counted into the same budget and asserted
    // against the same figure separation.test.ts pins (invariant 10). Two
    // things keep it cheap and both are properties of the code rather than of
    // this board: the scan runs only when a deck is *ready* — a craft aboard
    // and the interval spent — and a flight in the water is ordinary hulls
    // that were already going to be walked.
    const ACQUISITION_BUDGET = 45_000;
    const match = new Match(undefined, {
      fauna: false,
      seed: 77,
      terrain: new Terrain(12000, 12000, 250, { floorM: 3200 }),
    });
    const navies = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron];
    for (let slot = 0; slot < 4; slot++) match.addPlayer(slot, navies[slot]!);

    // Every navy's carrier, twice, in one another's water — 8 decks, 26 craft
    // at capacity — with a crowd of line hulls around them to walk.
    const decks: number[] = [];
    for (const carrier of CARRIERS) {
      const slot = navies.indexOf(carrier.faction!);
      for (let n = 0; n < 2; n++) {
        decks.push(
          hull(match, slot, carrier.faction!, carrier.kind, 5600 + slot * 140, 5600 + n * 200, 900)
        );
      }
    }
    for (let i = 0; i < 80; i++) {
      hull(
        match,
        i % 4,
        navies[i % 4]!,
        UnitKind.Corvette,
        5200 + ((i * 37) % 900),
        5200 + ((i * 53) % 900),
        900
      );
    }

    for (let i = 0; i < 600; i++) match.update(STEP_MS);
    const work = match.worstStepWork;
    assert.ok(
      work.acquisitionPairs <= ACQUISITION_BUDGET,
      `combat and the decks considered ${work.acquisitionPairs} candidates in the worst tick, ` +
        `budget ${ACQUISITION_BUDGET}`
    );
    // And the flights actually happened, or the budget above measured nothing.
    // Counted as launches rather than as survivors: this is a brawl, and most
    // of what the decks put in the water is dead by the time it is read.
    const launched = decks.reduce((n, eid) => n + (Flightdeck.launched[eid] ?? 0), 0);
    assert.ok(launched >= 8, `only ${launched} craft ever reached the water`);
    console.log(
      `      eight decks and ${launched} craft: ${work.acquisitionPairs} acquisition candidates`
    );
  });
});
