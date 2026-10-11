/**
 * Rock that closes over a hull lifts it to clean water, not into the Lid —
 * docs/systems-depth.md §2, docs/mission-sorrowgate.md §9 (#1271).
 *
 * A `ground` beat that writes `SOLID` leaves a hull inside it deeper than the
 * new floor, and the seabed's veto lifts it at the ascent rate. With rock's
 * floor at the surface that lift ran on into the Lid: a hull the player parked
 * in Sorrowgate's arch at 10:40 entered it near 12:07 and died near 14:07, and
 * Asset Recovery's 11:30 fall-stage did the same. `SOLID`'s floor now sits
 * below the Lid, so the lift ends there and the hull lives.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LID, SIM } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import { LEDGER_ASSET_RECOVERY } from '../src/sim/missions/assetRecovery.ts';
import type { MissionDefinition } from '../src/sim/missions/types.ts';
import { SOLID } from '../src/sim/terrain.ts';
import { Health, Owner, Position, Unit } from '../src/sim/components.ts';
import { defineQuery } from 'bitecs';

const STEP_MS = 1000 / SIM.TICK_HZ;
const T = (minutes: number, seconds = 0) => (minutes * 60 + seconds) * SIM.TICK_HZ;

/**
 * Park one of the player's hulls deep in `region` the tick before the beat
 * closes it, then run four and a half minutes past the beat — longer than the
 * old lift took to reach the Lid and spend the grace.
 */
function parkUnderClosingRock(mission: MissionDefinition, region: string, beatTick: number) {
  const map = missionMapById(mission.mapId)!;
  const match = new Match(map, { mission, fauna: false, seed: 77 });
  const shape = mission.regions!.find((r) => r.id === region)!;
  const x = shape.x + shape.widthM / 2;
  const y = shape.y + shape.heightM / 2;

  while (match.world.tick < beatTick - 1 && match.missionOver === null) {
    match.update(STEP_MS);
    match.takeMissionView();
  }
  const hull = defineQuery([Unit, Owner, Position, Health])(match.world).find(
    (eid) => Owner.slot[eid] === mission.playerSlot && Health.hp[eid]! > 0
  );
  assert.ok(hull !== undefined, `${mission.id}: the premise — a player hull to park`);
  const parkedM = Math.min(1000, match.world.terrain.floorAt(x, y) - 50);
  assert.ok(parkedM > SOLID.floorM, `${mission.id}: the premise — parked below rock's floor`);
  Position.x[hull] = x;
  Position.y[hull] = y;
  Position.depth[hull] = parkedM;
  const full = Health.hp[hull]!;

  let shallowest = Infinity;
  while (match.world.tick < beatTick + T(4, 30) && match.missionOver === null) {
    match.update(STEP_MS);
    match.takeMissionView();
    shallowest = Math.min(shallowest, Position.depth[hull]!);
  }
  assert.ok(match.world.tick >= beatTick + T(4, 30), `${mission.id}: the premise — ran past it`);
  assert.ok(
    !match.world.terrain.admits(x, y, Position.depth[hull]!),
    `${mission.id}: the premise — ${region} closed over the hull`
  );
  return { depthM: Position.depth[hull]!, shallowest, hp: Health.hp[hull]!, full };
}

describe('rock that closes over a hull', () => {
  it("lifts one parked in Sorrowgate's arch at 10:40 to its floor, below the Lid", () => {
    const hull = parkUnderClosingRock(PROLOGUE_SORROWGATE, 'arch-span', T(10, 40));
    assert.equal(hull.depthM, SOLID.floorM, 'the lift did not stop at the floor');
    assert.ok(hull.shallowest > LID.DEPTH_M, `the hull rose to ${hull.shallowest} m, in the Lid`);
    assert.equal(hull.hp, hull.full, 'a hull caught in the span was hurt');
  });

  it("does the same in Asset Recovery's 11:30 fall-stage", () => {
    const hull = parkUnderClosingRock(LEDGER_ASSET_RECOVERY, 'fall-stage', T(11, 30));
    assert.equal(hull.depthM, SOLID.floorM, 'the lift did not stop at the floor');
    assert.ok(hull.shallowest > LID.DEPTH_M, `the hull rose to ${hull.shallowest} m, in the Lid`);
    assert.equal(hull.hp, hull.full, 'a hull caught in the fall was hurt');
  });
});
