/**
 * Berths — the population cap (docs/economy.md §10, #437).
 *
 * Four claims, each the one a cached count would get wrong: the grant is
 * what stands, a hull counts from the queue, a lost Foundry takes its grant
 * with it, and the ceiling holds however many Foundries are built.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BERTHS,
  Faction,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { Health } from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

/** Step until the next Echo pass hands back the commander's snapshot. */
function snapshotOf(match: Match): EchoSnapshot {
  for (let i = 0; i < 2 * SIM.TICK_HZ; i++) {
    const own = match.update(STEP_MS)?.get(0);
    if (own !== undefined) return own;
  }
  throw new Error('no Echo pass in two seconds');
}

function skirmish(): { match: Match; foundry: number } {
  const match = new Match(undefined, {
    fauna: false,
    seed: 4,
    terrain: new Terrain(8000, 8000, 250, { floorM: 2600 }),
  });
  match.addPlayer(0, Faction.Bathyarch);
  advance(match, 0.5);
  const snapshot = snapshotOf(match);
  const foundry = snapshot.structures.find((s) => s.kind === StructureKind.Foundry)!.id;
  return { match, foundry };
}

describe('berths', () => {
  it('grants from what stands and counts what is afloat', () => {
    const { match } = skirmish();
    const berths = match.berthsFor(0);
    assert.equal(berths.granted, BERTHS.BASTION + BERTHS.FOUNDRY, 'a Bastion and a Foundry');
    // The starting base: one harvester and a token escort. Whatever it is,
    // it is the sum of the roster's berth figures and nothing else.
    const own = snapshotOf(match);
    const expected = own.units.reduce((sum, unit) => sum + statsFor(unit.kind).berths, 0);
    assert.equal(berths.used, expected);
    assert.deepEqual(own.berths, berths, 'and the snapshot carries the same count');
  });

  it('refuses a hull the base has no crew for, from the queue', () => {
    const { match, foundry } = skirmish();
    // Fill the grant with Cruisers, three berths apiece, spending nothing:
    // spawned rather than produced, because the claim is about berths and
    // not about nodules.
    const free = match.berthsFor(0).granted - match.berthsFor(0).used;
    const cruisers = Math.floor(free / statsFor(UnitKind.Cruiser).berths);
    for (let i = 0; i < cruisers; i++) {
      spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 4000 + i * 200,
        y: 4000,
      });
    }
    const left = match.berthsFor(0).granted - match.berthsFor(0).used;
    assert.ok(left < statsFor(UnitKind.Cruiser).berths, 'the grant is nearly full');

    // A Corvette needs two; whether it fits depends on the remainder, and a
    // Scout needs one. Queue what fits, then the queue itself counts.
    const scout = match.produce(0, foundry, UnitKind.LightScout);
    assert.equal(scout, left >= 1, 'a one-berth hull fits exactly when a berth is free');
    const after = match.berthsFor(0);
    if (scout) assert.equal(after.used, after.granted - left + 1, 'queued hulls count');
    assert.equal(
      match.produce(0, foundry, UnitKind.Cruiser),
      false,
      'a three-berth hull is refused against a full grant, whatever the stockpile'
    );
  });

  it('takes a lost Foundry’s grant with it, and frees a dead hull’s berths', () => {
    const { match, foundry } = skirmish();
    const before = match.berthsFor(0);
    Health.hp[foundry] = 0;
    advance(match, 0.1);
    const after = match.berthsFor(0);
    assert.equal(after.granted, before.granted - BERTHS.FOUNDRY, 'the Foundry is gone');

    const own = snapshotOf(match);
    const victim = own.units[0]!;
    Health.hp[victim.id] = 0;
    advance(match, 0.1);
    assert.equal(
      match.berthsFor(0).used,
      after.used - statsFor(victim.kind).berths,
      'a dead hull gives its berths back'
    );
  });

  it('holds the ceiling however many Foundries stand', () => {
    const { match } = skirmish();
    for (let i = 0; i < 6; i++) {
      spawnStructure(match.world, {
        kind: StructureKind.Foundry,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 2000 + i * 400,
        y: 6000,
        // Commissioned: a site still under construction grants nothing.
        prebuilt: true,
      });
    }
    assert.equal(match.berthsFor(0).granted, BERTHS.CEILING);
  });
});
