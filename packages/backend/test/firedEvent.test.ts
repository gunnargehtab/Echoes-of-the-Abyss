/**
 * `SelfEventKind.Fired` (#1511): a gun's shot is told to its owner, with the
 * bearing it fired on, and to nobody else. The client draws its muzzle effect
 * from this event alone, so a missing shot is a gun firing with nothing to
 * see, and a shot told to the enemy would be a bearing it never resolved.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Faction, SIM, SelfEventKind, StructureKind, UnitKind } from '@echoes/shared';
import type { EchoSnapshot } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Terrain } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function openWaterMatch(): Match {
  const terrain = new Terrain(12000, 12000, 200);
  const match = new Match(undefined, { fauna: false, seed: 1511, terrain });
  match.addPlayer(0, Faction.Pelagia);
  match.addPlayer(1, Faction.Directorate);
  return match;
}

/** Every Echo pass's snapshot for both slots, over `seconds` of match. */
function run(match: Match, seconds: number): Array<Map<number, EchoSnapshot>> {
  const passes: Array<Map<number, EchoSnapshot>> = [];
  for (let tick = 0; tick < seconds * SIM.TICK_HZ; tick++) {
    const views = match.update(STEP_MS);
    if (views !== null) passes.push(views);
  }
  return passes;
}

describe('Fired', () => {
  it('tells a hull’s owner each shot, on the bearing it fired, and never the enemy', () => {
    const match = openWaterMatch();
    const gun = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Pelagia,
      x: 6000,
      y: 6000,
    });
    // Due +y of the gun, so the bearing is a quarter turn. Cold, so the only
    // gun in the water is slot 0's.
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Directorate,
      x: 6000,
      y: 6300,
      weaponsCold: true,
    });

    let fired = 0;
    let blows = 0;
    for (const views of run(match, 10)) {
      const own = views.get(0)!;
      const enemy = views.get(1)!;
      for (const event of own.selfEvents) {
        if (event.kind !== SelfEventKind.Fired) continue;
        assert.equal(event.unitId, gun, 'the event names the gun that fired');
        assert.ok(event.bearing !== undefined, 'a shot carries its bearing');
        assert.ok(Math.abs(event.bearing - Math.PI / 2) < 1e-6, `bearing ${event.bearing}`);
        fired++;
      }
      assert.ok(
        !enemy.selfEvents.some((e) => e.kind === SelfEventKind.Fired),
        'the enemy is never told of a shot it did not fire'
      );
      // Counted by the prey's own `Damaged` rather than its hp, which the
      // Directorate's shallow bleed also takes.
      if (enemy.selfEvents.some((e) => e.kind === SelfEventKind.Damaged && e.unitId === prey)) {
        blows++;
      }
    }
    assert.ok(fired >= 3, `ten seconds of a Corvette’s gun is several shots (${fired})`);
    // One gun, one shot an Echo pass at most: every shot that landed was told.
    assert.equal(fired, blows, 'one Fired for every blow the prey took');
  });

  it('tells a turret’s owner too', () => {
    const match = openWaterMatch();
    const turret = spawnStructure(match.world, {
      kind: StructureKind.SentinelTurret,
      slot: 0,
      faction: Faction.Pelagia,
      x: 6000,
      y: 6000,
      prebuilt: true,
    });
    // Due −x, so the bearing is a half turn.
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Directorate,
      x: 5500,
      y: 6000,
      weaponsCold: true,
    });

    const shots = run(match, 5).flatMap((views) =>
      views.get(0)!.selfEvents.filter((e) => e.kind === SelfEventKind.Fired)
    );
    assert.ok(shots.length > 0, 'the turret fired and was told');
    for (const shot of shots) {
      assert.equal(shot.unitId, turret);
      assert.ok(Math.abs(Math.abs(shot.bearing!) - Math.PI) < 1e-6, `bearing ${shot.bearing}`);
    }
  });
});
