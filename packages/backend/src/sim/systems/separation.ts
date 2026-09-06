/**
 * Separation — hulls stop occupying the same water.
 *
 * Movement steers every unit straight at its order, which meant a fleet under
 * one move order collapsed into a single point. That was never only cosmetic:
 * **a stack of six hulls at one coordinate is one acoustic position**, so it
 * distorted the spatial hash, the detection pass, and every judgement a player
 * made about how large a contact was. Formation is information in this game.
 *
 * Deliberately steering rather than physics. There is no momentum, no
 * restitution and no solver — overlapping hulls are pushed apart along the
 * axis between them, a fraction of the overlap per tick. The result reads as
 * a fleet keeping station, which is all the design asks for, and it cannot
 * inject energy into the simulation the way an impulse model can.
 *
 * This runs on the 60 Hz budget, unlike detection which has its own 2 ms at
 * 5 Hz — so it reuses the existing SpatialHash rather than comparing all
 * pairs, and does no square roots on pairs that are not actually overlapping.
 */

import { defineQuery } from 'bitecs';
import {
  MAX_STRUCTURE_RADIUS_M,
  MAX_UNIT_RADIUS_M,
  SEPARATION,
  structureStatsFor,
  unitRadiusM,
  type StructureKind,
  type UnitKind,
} from '@echoes/shared';
import { Position, Structure, Unit } from '../components.ts';
import { localIdOf, type SimWorld } from '../world.ts';
import type { Terrain } from '../terrain.ts';

const movable = defineQuery([Position, Unit]);
const blockers = defineQuery([Position, Structure]);

export function separationSystem(world: SimWorld): void {
  const units = movable(world);
  if (units.length === 0) return;

  // Both grids' probe counters are zeroed here rather than by the grids
  // themselves: a grid has no idea what a tick is, and the pair below is read
  // back into `world.stepWork` at the end of the system.
  world.unitGrid.cellsVisited = 0;
  world.structureGrid.cellsVisited = 0;

  // The pair guard belongs to the pair pass, not to the system. It used to
  // guard both, so a player down to a single hull got no structure correction
  // at all: order that hull onto your own refinery and it sat inside the
  // footprint until you built a second one.
  if (units.length > 1) separateHulls(world, units);
  separateFromStructures(world, units);

  world.stepWork.separationCells += world.unitGrid.cellsVisited + world.structureGrid.cellsVisited;
}

/** Reused across hulls and ticks: `resolveStep` writes here rather than allocating. */
const settled = { x: 0, y: 0 };

/**
 * Land a correction where the ground allows it.
 *
 * Separation used to write positions outright, and the depth system was left
 * to lift whatever a shove had put over shallower ground. That was a slow
 * loophole while hulls only ever met walls head-on; routing (#431) parks a
 * refused hull at the *corner* nearest its order, and a crowd of escorts
 * shoving it there can push it across the corner into ground it does not
 * fit — after which `resolveStep`'s inside-ground clause lets it drive on
 * through the rock it was pushed into, toward wherever it was sent. A push is
 * a step like any other now: it slides along ground it cannot enter and the
 * map edge alike, and a hull is only ever inside ground the ground closed
 * over it.
 */
function settle(terrain: Terrain, eid: number, toX: number, toY: number): void {
  terrain.resolveStep(Position.x[eid]!, Position.y[eid]!, toX, toY, Position.depth[eid]!, settled);
  Position.x[eid] = settled.x;
  Position.y[eid] = settled.y;
}

function separateHulls(world: SimWorld, units: ArrayLike<number>): void {
  const grid = world.unitGrid;
  const terrain = world.terrain;

  grid.clear();
  for (let i = 0; i < units.length; i++) {
    const eid = units[i]!;
    grid.insert(eid, Position.x[eid]!, Position.y[eid]!);
  }

  const buffer = world.separationBuffer;

  for (let i = 0; i < units.length; i++) {
    const a = units[i]!;
    const ra = unitRadiusM(Unit.kind[a] as UnitKind);

    const neighbours = grid.queryRadius(
      Position.x[a]!,
      Position.y[a]!,
      ra + MAX_UNIT_RADIUS_M,
      buffer
    );

    for (let j = 0; j < neighbours.length; j++) {
      const b = neighbours[j]!;
      // Each pair is resolved once, by the lower id, and both hulls move.
      // Without this the pair would be pushed apart twice per tick, at double
      // the intended stiffness.
      if (b <= a) continue;

      // Both positions are re-read per pair rather than hoisted. A hull in a
      // crowd is corrected once per overlapping neighbour, and each correction
      // has to start from where the previous one left it: computed from a
      // stale position, every write but the last is simply discarded, so a
      // hull overlapping three neighbours separated from exactly one of them.
      const ax = Position.x[a]!;
      const ay = Position.y[a]!;
      const bx = Position.x[b]!;
      const by = Position.y[b]!;
      const dx = bx - ax;
      const dy = by - ay;
      const minD = ra + unitRadiusM(Unit.kind[b] as UnitKind);
      const d2 = dx * dx + dy * dy;
      world.stepWork.separationPairs++;
      if (d2 >= minD * minD) continue;

      let nx: number;
      let ny: number;
      let overlap: number;
      if (d2 < SEPARATION.COINCIDENT_EPSILON_M * SEPARATION.COINCIDENT_EPSILON_M) {
        // Exactly stacked — spawned on the same spot, or pushed there. There
        // is no axis to separate along, so pick one from the ids.
        //
        // Match-local ids, never the bitecs entity ids: those count from
        // wherever the process happens to be, so the same match replayed in a
        // fresh process picks different axes and every hull in the stack ends
        // up somewhere else. The state hash and the fauna sense stagger were
        // both bitten by this (world.ts, stateHash.ts); a tie-break is the
        // quietest place for it to hide, since only a stacked crowd reaches it.
        const la = localIdOf(world, a) ?? 0;
        const lb = localIdOf(world, b) ?? 0;
        const angle = ((la * 2654435761 + lb) % 628) / 100;
        nx = Math.cos(angle);
        ny = Math.sin(angle);
        overlap = minD;
      } else {
        const d = Math.sqrt(d2);
        nx = dx / d;
        ny = dy / d;
        overlap = minD - d;
      }

      const push = overlap * SEPARATION.STIFFNESS * 0.5;
      settle(terrain, a, ax - nx * push, ay - ny * push);
      settle(terrain, b, bx + nx * push, by + ny * push);
    }
  }
}

/**
 * Structures are immovable, so the whole correction lands on the hull. A
 * half-built site counts: the footprint is already claimed ground, which is
 * why Match.build reserves clearance around it at placement time.
 */
function separateFromStructures(world: SimWorld, units: ArrayLike<number>): void {
  const terrain = world.terrain;
  const structures = blockers(world);
  if (structures.length === 0) return;

  // Every hull against every structure was fine at one Bastion and a Foundry,
  // and 8,000 pair tests a tick at a late-game four-seat match's 200 hulls
  // and 40 structures, nearly all of them on opposite sides of the map. The
  // grid is rebuilt from the structures rather than the hulls because there
  // are far fewer of them and a hull's query then reads only the footprints
  // it could actually be standing in. Candidates come back in grid order,
  // which is a fixed function of the query order — deterministic, which is
  // all a replay needs.
  const grid = world.structureGrid;
  grid.clear();
  for (let j = 0; j < structures.length; j++) {
    const s = structures[j]!;
    grid.insert(s, Position.x[s]!, Position.y[s]!);
  }
  const buffer = world.separationBuffer;

  for (let i = 0; i < units.length; i++) {
    const a = units[i]!;
    const ra = unitRadiusM(Unit.kind[a] as UnitKind);
    const near = grid.queryRadius(
      Position.x[a]!,
      Position.y[a]!,
      ra + MAX_STRUCTURE_RADIUS_M,
      buffer
    );

    for (let j = 0; j < near.length; j++) {
      const s = near[j]!;
      const sx = Position.x[s]!;
      const sy = Position.y[s]!;
      const dx = Position.x[a]! - sx;
      const dy = Position.y[a]! - sy;
      const minD = ra + structureStatsFor(Structure.kind[s] as StructureKind).radiusM;
      const d2 = dx * dx + dy * dy;
      world.stepWork.separationPairs++;
      if (d2 >= minD * minD) continue;

      if (d2 < SEPARATION.COINCIDENT_EPSILON_M * SEPARATION.COINCIDENT_EPSILON_M) {
        // Dead centre of a footprint: leave along +X, deterministically.
        settle(terrain, a, sx + minD, Position.y[a]!);
        continue;
      }
      const d = Math.sqrt(d2);
      // Pushed clear in one step rather than a fraction of it: a hull inside a
      // structure is a state the player can see is wrong, and easing out of it
      // looks like the building is chewing the hull.
      //
      // Where the two constraints disagree, bounds win. Match.build keeps a
      // footprint a full radius clear of the edge, but the push target is
      // radius + hull, so a structure at the closest legal placement to a wall
      // aims the hull just past it and the clamp brings it back overlapping.
      // That is stable rather than oscillating, and it is the better of the
      // two failures: a hull pinned against a wall is reachable, and a hull
      // pushed off the map is not. Sliding along the boundary instead is real
      // contact resolution, which is terrain passability's problem (#150).
      settle(terrain, a, sx + (dx / d) * minD, sy + (dy / d) * minD);
    }
  }
}
