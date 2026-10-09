/**
 * A spared party is never volunteered for — docs/systems-combat.md §4 (#1239).
 *
 * Hostility is `Owner.slot`, so before #1239 a player's idle guns auto-acquired
 * any scripted party in range and ended it with no order given: the watch
 * Nineteen says only counts, the column Standing Wave says only moves, the rim
 * Second Chord says only attends, and Thin Water's second element, which its
 * document says is never engaged (#1269). A party its document says is never fought is
 * now marked `spared`: no gun swings onto it of its own accord and no deck
 * launches at it, its own guns and decks hold the same way, and an ordered
 * attack still lands — the first blow wakes the whole party, which answers.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defineQuery, hasComponent, removeComponent } from 'bitecs';
import { FLIGHT, Faction, ORDNANCE, SIM, StructureKind, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import {
  CHORD_NINETEEN,
  CHORD_SECOND_CHORD,
  CHORD_STANDING_WAVE,
  SEEDING_THIN_WATER,
  type MissionDefinition,
} from '../src/sim/missions/index.ts';
import { Health, Owner, Position, Spared, Structure, Unit } from '../src/sim/components.ts';
import { spare, wakeSpared } from '../src/sim/systems/spared.ts';
import { launchTorpedo } from '../src/sim/systems/ordnance.ts';
import { seedSpore } from '../src/sim/systems/siege.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

/** Slot 0 against slot 1 on flat open water, nothing else afloat. */
function water(): Match {
  const match = new Match(undefined, {
    fauna: false,
    seed: 838,
    terrain: new Terrain(12000, 12000, 250, { floorM: 3200 }),
  });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Directorate);
  return match;
}

/** A spared enemy hull of `party`, weapons-cold unless `armed`, as a mission seats one. */
function sparedHull(match: Match, x: number, y: number, armed = false, party = 0): number {
  const eid = spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 1,
    faction: Faction.Directorate,
    x,
    y,
    weaponsCold: !armed,
  });
  spare(match.world, eid, party);
  return eid;
}

/** The handle slot 0 holds for `eid`, once the Echo pass has resolved it. */
function handleFor(match: Match, eid: number): number {
  for (let i = 0; i < 4 * SIM.TICK_HZ; i++) {
    const snapshot = match.update(STEP_MS)?.get(0);
    for (const contact of snapshot?.contacts ?? []) {
      if (match.echo.entityForHandle(0, contact.id) === eid) return contact.id;
    }
  }
  assert.fail('slot 0 never resolved the spared hull');
}

describe('a spared party — docs/systems-combat.md §4', () => {
  it('is never volunteered for by a gun, and still takes an ordered shot', () => {
    const match = water();
    const gun = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 6000,
    });
    const quarry = sparedHull(match, 6300, 6000);
    const full = Health.hp[quarry]!;

    advance(match, 6);
    assert.equal(Health.hp[quarry], full, 'an idle gun 300 m off never swung onto it');

    match.orderAttackContact(0, gun, handleFor(match, quarry));
    advance(match, 6);
    assert.ok(Health.hp[quarry]! < full, 'an ordered attack lands: the decision is the player’s');
  });

  /**
   * #1239's second half, the owner's call: Standing Wave's column is armed,
   * and once the player's guns held it walked into the Gallery and shelled
   * the Bastion unanswered. A spared party's own guns hold too, until somebody
   * fires on it — and then the whole party answers.
   */
  it('holds its own fire, and wakes its whole party when fired on', () => {
    const match = water();
    const gun = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 6000,
    });
    const struck = sparedHull(match, 6300, 6000, true);
    const mate = sparedHull(match, 6300, 6150, true);
    const full = Health.hp[gun]!;

    advance(match, 6);
    assert.equal(Health.hp[gun], full, 'two armed, spared hulls 300 m off held their fire');

    match.orderAttackContact(0, gun, handleFor(match, struck));
    advance(match, 6);
    assert.ok(
      !hasComponent(match.world, Spared, struck) && !hasComponent(match.world, Spared, mate),
      'the blow woke the whole party, the hull it never touched included'
    );
    assert.ok(Health.hp[gun]! < full, 'and the party answered');
  });

  /**
   * #1254. Its point defence holds too, as a silent hull's does: a spared
   * hull's gun used to shoot down the torpedo fired at it, 248 m out, so the
   * party never woke — Standing Wave's column, of all of them, could not be
   * started on with a torpedo. Now the round lands, and the blow wakes it.
   */
  it('holds its point defence too, so a torpedo fired at it lands and wakes the party', () => {
    const match = water();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 6000,
      depth: 800,
    });
    const armedAt = (x: number, y: number) => {
      const eid = spawnUnit(match.world, {
        kind: UnitKind.AbyssalSubmersible,
        slot: 1,
        faction: Faction.Directorate,
        x,
        y,
        depth: 800,
      });
      spare(match.world, eid, 0);
      return eid;
    };
    const struck = armedAt(6900, 6000);
    const mate = armedAt(6900, 6150);
    const full = Health.hp[struck]! + Health.hp[mate]!;

    const torpedo = launchTorpedo(match.world, launcher, 6900, 6000);
    assert.notEqual(torpedo, 0, 'the premise: the tube fires');
    for (let i = 0; i < 20 * SIM.TICK_HZ && Health.hp[torpedo]! > 0; i++) match.update(STEP_MS);
    assert.ok(
      Health.hp[struck]! + Health.hp[mate]! < full,
      'the torpedo landed: nothing shot it down'
    );
    assert.ok(
      !hasComponent(match.world, Spared, struck) && !hasComponent(match.world, Spared, mate),
      'and the blow woke the whole party'
    );
  });

  it('wakes its whole party when a mine goes off under one of it', () => {
    // The blast's wake, through the real path: a slot-0 mine, armed, and a
    // spared hull that strays onto it while its mate is far away.
    const match = water();
    const layer = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 6000,
    });
    advance(match, 0.2);
    assert.notEqual(match.layMine(0, layer), 0, 'the premise: a mine is laid');
    advance(match, ORDNANCE.MINE.ARMING_S + 0.5);

    const struck = sparedHull(match, 6000, 6050);
    const mate = sparedHull(match, 9000, 6000);
    const full = Health.hp[struck]!;
    advance(match, 3);
    assert.ok(Health.hp[struck]! < full, 'the premise: the mine went off under it');
    assert.ok(
      !hasComponent(match.world, Spared, struck) && !hasComponent(match.world, Spared, mate),
      'and the blast woke the whole party, the hull three kilometres off included'
    );
  });

  it('wakes its whole party when a spore eats one of it', () => {
    // The fourth blow, through the real path: a spore seeded by slot 0 on a
    // spared structure takes hull off it on its first tick, and the hull far
    // away loses the mark with it. No shipped mission reaches this today — a
    // spore needs a Blight, a Commune hull, and the one spared structure is
    // Second Chord's, whose player is the Order — so this is what holds it.
    const match = water();
    const node = spawnStructure(match.world, {
      kind: StructureKind.SoundingSpire,
      slot: 1,
      faction: Faction.Directorate,
      x: 6000,
      y: 6000,
      prebuilt: true,
    });
    spare(match.world, node, 0);
    const mate = sparedHull(match, 9000, 6000);
    const full = Health.hp[node]!;
    assert.ok(seedSpore(match.world, node, 0), 'the premise: the spore takes');
    advance(match, 1);
    assert.ok(Health.hp[node]! < full, 'the premise: the spore ate hull');
    assert.ok(
      !hasComponent(match.world, Spared, node) && !hasComponent(match.world, Spared, mate),
      'and the spore woke the whole party, the hull three kilometres off included'
    );
  });

  it('wakes only its own party, and only for a blow from another slot', () => {
    const match = water();
    const struck = sparedHull(match, 6000, 6000);
    const mate = sparedHull(match, 6100, 6000);
    const neighbour = sparedHull(match, 6200, 6000, false, 1);

    wakeSpared(match.world, struck, 1);
    assert.ok(hasComponent(match.world, Spared, struck), 'its own slot’s blow wakes nobody');

    wakeSpared(match.world, struck, 0);
    assert.ok(
      !hasComponent(match.world, Spared, struck) && !hasComponent(match.world, Spared, mate)
    );
    assert.ok(hasComponent(match.world, Spared, neighbour), 'another party in the slot sleeps on');
  });

  it('keeps its own deck shut until it is fired on', () => {
    const match = water();
    const gantry = spawnUnit(match.world, {
      kind: UnitKind.Gantry,
      slot: 1,
      faction: Faction.Directorate,
      x: 6000,
      y: 6000,
    });
    spare(match.world, gantry, 0);
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 6000 + FLIGHT.TETHER_M - 200,
      weaponsCold: true,
    });

    advance(match, 3);
    assert.equal([...(match.world.flights.get(gantry) ?? [])].length, 0, 'the deck stayed shut');

    wakeSpared(match.world, gantry, 0);
    advance(match, 1);
    assert.ok([...(match.world.flights.get(gantry) ?? [])].length > 0, 'and opens once woken');
  });

  it('is never launched at by a deck', () => {
    const match = water();
    const gantry = spawnUnit(match.world, {
      kind: UnitKind.Gantry,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6000,
      y: 6000,
    });
    const quarry = sparedHull(match, 6000, 6000 + FLIGHT.TETHER_M - 200);

    advance(match, 3);
    assert.equal([...(match.world.flights.get(gantry) ?? [])].length, 0, 'the deck stayed shut');

    // The premise: the same hull, unspared, is one the deck opens on.
    removeComponent(match.world, Spared, quarry);
    advance(match, 1);
    assert.ok([...(match.world.flights.get(gantry) ?? [])].length > 0, 'and opens once it is not');
  });

  /**
   * The four documents name the parties, and the runtime marks every hull and
   * structure of them at install, keyed by the party rather than the slot: Thin
   * Water's spared element shares its slot with two parties that are not
   * (#1269). The player's own force is never spared.
   */
  it('marks the parties Second Chord, Standing Wave, Nineteen and Thin Water say are never fought', () => {
    const named: Array<[MissionDefinition, number]> = [
      [CHORD_SECOND_CHORD, 2],
      [CHORD_STANDING_WAVE, 1],
      [CHORD_NINETEEN, 1],
      [SEEDING_THIN_WATER, 1],
    ];
    const things = defineQuery([Owner, Health]);
    for (const [mission, parties] of named) {
      // Party index to the hulls and structures it seats, for the parties
      // marked spared: what `Spared.party` must count, and nothing else.
      const seated = new Map<number, number>();
      mission.parties.forEach((party, index) => {
        if (party.spared !== true) return;
        seated.set(index, party.units.length + (party.structures?.length ?? 0));
      });
      assert.equal(seated.size, parties, `${mission.id}: the parties its document names`);
      const match = new Match(missionMapById(mission.mapId)!, { mission, fauna: false, seed: 4 });
      const world = match.world;
      const marked = new Map<number, number>();
      for (const eid of things(world)) {
        if (!hasComponent(world, Unit, eid) && !hasComponent(world, Structure, eid)) continue;
        if (Owner.slot[eid] === mission.playerSlot) {
          assert.equal(hasComponent(world, Spared, eid), false, `${mission.id}: the player spared`);
        }
        if (!hasComponent(world, Spared, eid)) continue;
        const party = Spared.party[eid]!;
        marked.set(party, (marked.get(party) ?? 0) + 1);
      }
      assert.deepEqual(
        marked,
        seated,
        `${mission.id}: every piece of a spared party, and no other`
      );
    }
  });

  /**
   * Nineteen, live: a Corvette parked at mark 19, inside its gun's reach of
   * the watch's station, used to hit the watch at 01:00 and kill both hulls by
   * 16:00 — the mission's only counter, ended by an order nobody gave.
   */
  it('leaves Nineteen’s watch alone beside a hull parked at mark 19', () => {
    const match = new Match(missionMapById(CHORD_NINETEEN.mapId)!, {
      mission: CHORD_NINETEEN,
      fauna: false,
      seed: 4,
    });
    const world = match.world;
    const hulls = defineQuery([Unit, Owner, Position, Health])(world);
    const party = hulls.filter((eid) => Owner.slot[eid] === CHORD_NINETEEN.playerSlot);
    const watch = hulls.filter((eid) => Owner.slot[eid] !== CHORD_NINETEEN.playerSlot);
    const corvette = party.find((eid) => Unit.kind[eid] === UnitKind.Corvette)!;
    Position.x[corvette] = 4500;
    Position.y[corvette] = 2250;
    Position.depth[corvette] = 1750;
    const full = watch.map((eid) => Health.hp[eid]!);

    for (let tick = 0; tick < 150 * SIM.TICK_HZ; tick++) {
      match.update(STEP_MS);
      match.takeMissionView();
    }
    watch.forEach((eid, i) => {
      assert.equal(Health.hp[eid], full[i], 'the watch is counted at, never shot at');
    });
  });
});
