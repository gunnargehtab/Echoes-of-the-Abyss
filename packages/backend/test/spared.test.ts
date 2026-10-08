/**
 * A spared party is never volunteered for — docs/systems-combat.md §4 (#1239).
 *
 * Hostility is `Owner.slot`, so before #1239 a player's idle guns auto-acquired
 * any scripted party in range and ended it with no order given: the watch
 * Nineteen says only counts, the column Standing Wave says only moves, the rim
 * Second Chord says only attends. A party its document says is never fought is
 * now marked `spared`: no gun swings onto it of its own accord and no deck
 * launches at it, while an ordered attack still lands.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addComponent, defineQuery, hasComponent, removeComponent } from 'bitecs';
import { FLIGHT, Faction, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import {
  CHORD_NINETEEN,
  CHORD_SECOND_CHORD,
  CHORD_STANDING_WAVE,
  type MissionDefinition,
} from '../src/sim/missions/index.ts';
import { Health, Owner, Position, Spared, Structure, Unit } from '../src/sim/components.ts';

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

/** A spared enemy hull, weapons-cold as every scripted party is unless armed. */
function sparedHull(match: Match, x: number, y: number): number {
  const eid = spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 1,
    faction: Faction.Directorate,
    x,
    y,
    weaponsCold: true,
  });
  addComponent(match.world, Spared, eid);
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
   * The three documents name the parties, and the runtime marks every hull and
   * structure of them at install; the player's own force is never spared.
   */
  it('marks the parties Second Chord, Standing Wave and Nineteen say are never fought', () => {
    const named: Array<[MissionDefinition, number]> = [
      [CHORD_SECOND_CHORD, 2],
      [CHORD_STANDING_WAVE, 1],
      [CHORD_NINETEEN, 1],
    ];
    const things = defineQuery([Owner, Health]);
    for (const [mission, parties] of named) {
      const spared = mission.parties.filter((party) => party.spared === true);
      assert.equal(spared.length, parties, `${mission.id}: the parties its document names`);
      const match = new Match(missionMapById(mission.mapId)!, { mission, fauna: false, seed: 4 });
      const world = match.world;
      const slots = new Set(spared.map((party) => party.slot));
      let marked = 0;
      for (const eid of things(world)) {
        if (!hasComponent(world, Unit, eid) && !hasComponent(world, Structure, eid)) continue;
        const slot = Owner.slot[eid]!;
        if (slots.has(slot)) {
          assert.ok(hasComponent(world, Spared, eid), `${mission.id}: slot ${slot} left unmarked`);
          marked++;
        } else if (slot === mission.playerSlot) {
          assert.equal(hasComponent(world, Spared, eid), false, `${mission.id}: the player spared`);
        }
      }
      assert.ok(marked > 0, `${mission.id}: the premise, a spared party was seated`);
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
