/**
 * The crater's volumetric ground (docs/free-water-slice.md §9, "Toward a
 * vertical multiplayer match"; #1754). The owner lifted docs/systems-depth.md
 * §2's planar limits there and nowhere else, so every claim here is made twice:
 * once on the crater, once on ground without the flag, where the old rule holds.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Faction, SIM, UnitKind, unitRadiusM } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { FREE_WATER_SLICE } from '../src/sim/maps/freeWaterSlice.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Position } from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

/** Over the deep pocket: 2,400 m of open water, nothing to hold a hull up. */
const POCKET_X = 2125;
const POCKET_Y = 2125;

function crater(seed: number): Match {
  return new Match(FREE_WATER_SLICE, { fauna: false, seed });
}

/**
 * The same water as the pocket on a map without the flag: a flat 2,400 m
 * floor. The flag is the map literal's, so the crater's literal would carry it.
 */
function planarGround(seed: number): Match {
  return new Match(undefined, {
    fauna: false,
    seed,
    terrain: new Terrain(4000, 4000, 250, { floorM: 2400 }),
  });
}

function corvette(match: Match, x: number, y: number, depth: number): number {
  return spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 0,
    faction: Faction.Pelagia,
    x,
    y,
    depth,
  });
}

function planGap(a: number, b: number): number {
  return Math.hypot(Position.x[a]! - Position.x[b]!, Position.y[a]! - Position.y[b]!);
}

function gap3d(a: number, b: number): number {
  return Math.hypot(
    Position.x[a]! - Position.x[b]!,
    Position.y[a]! - Position.y[b]!,
    Position.depth[a]! - Position.depth[b]!
  );
}

describe('volumetric ground: separation in three dimensions', () => {
  const radius = unitRadiusM(UnitKind.Corvette);

  it('is set on the crater and on no ground without the flag', () => {
    assert.equal(crater(1).world.volumetric, true);
    // A test terrain does not make a map volumetric; the map literal does.
    assert.equal(new Match(undefined, { fauna: false, seed: 1 }).world.volumetric, false);
  });

  it('lets a hull hold station directly over another one', () => {
    const match = crater(1754);
    const deep = corvette(match, POCKET_X, POCKET_Y, 900);
    const shallow = corvette(match, POCKET_X, POCKET_Y, 900 - radius * 3);
    advance(match, 3);
    assert.equal(planGap(deep, shallow), 0, 'a pair clear in depth is not pushed in plan');
    assert.equal(Position.depth[deep], 900);
    assert.equal(Position.depth[shallow], 900 - radius * 3);
  });

  it('pushes an overlapping stacked pair apart in plan only, until it clears in 3D', () => {
    const match = crater(1755);
    const dz = radius; // under the 2r the pair needs, so the spheres overlap
    const deep = corvette(match, POCKET_X, POCKET_Y, 900);
    const shallow = corvette(match, POCKET_X, POCKET_Y, 900 - dz);
    advance(match, 6);
    // Depth has one owner, and it is not separation.
    assert.equal(Position.depth[deep], 900);
    assert.equal(Position.depth[shallow], 900 - dz);
    const needed = Math.sqrt((2 * radius) ** 2 - dz ** 2);
    const plan = planGap(deep, shallow);
    assert.ok(plan >= needed * 0.9, `pushed ${plan.toFixed(1)} m in plan, needs ${needed}`);
    // Only as far as the depth difference requires, not the full planar 2r.
    assert.ok(plan < 2 * radius * 0.95, `pushed ${plan.toFixed(1)} m, the planar rule's distance`);
    assert.ok(gap3d(deep, shallow) >= 2 * radius * 0.9);
  });

  it('keeps the planar rule on ground without the flag', () => {
    const match = planarGround(1754);
    const deep = corvette(match, POCKET_X, POCKET_Y, 900);
    const shallow = corvette(match, POCKET_X, POCKET_Y, 900 - radius * 3);
    advance(match, 6);
    const plan = planGap(deep, shallow);
    assert.ok(plan >= 2 * radius * 0.9, `a stack is pushed apart in plan: ${plan.toFixed(1)} m`);
  });
});
