/**
 * Movement system — fixed-step, frame-rate independent.
 *
 * Speed is scaled by Silent Running, which is where the Echo Layer reaches
 * into movement: going quiet costs 45% of your speed (only 20% for Pelagia).
 * docs/systems-echo.md §6, docs/factions.md.
 *
 * Depth reaches in here too, and only for one faction: the Directorate lose 20%
 * of their speed above the Shelf line, because shallow water poisons them
 * (docs/systems-depth.md §3). That is the whole of their documented weakness on
 * this side; the hull half of it lives in the pressure system, where the rest of
 * the game's depth attrition already is.
 *
 * Ground reaches in twice (docs/systems-depth.md §2). A hull whose straight
 * course crosses ground that will not admit it at its depth follows a route
 * around it (`steerPoint`, sim/pathfinding.ts); and every step, routed or not,
 * is then resolved against the water column and slides along ground it grazes.
 */

import { defineQuery } from 'bitecs';
import {
  DIRECTORATE_SHALLOW,
  Faction,
  MOVEMENT,
  SILENT_RUNNING,
  inDirectorateShallows,
  statsFor,
  type UnitKind,
} from '@echoes/shared';
import {
  Heading,
  MoveOrder,
  Owner,
  Position,
  SilentRunning,
  Unit,
  Velocity,
} from '../components.ts';
import { currentModifiers, kelpModifiers, stormModifiers } from './hazards.ts';
import type { SimWorld } from '../world.ts';

const movable = defineQuery([Position, Velocity, MoveOrder, Unit, SilentRunning, Owner]);

/** Reused across hulls and ticks: resolveStep writes here rather than allocating. */
const step = { x: 0, y: 0 };
/** Where the hull steers this tick — its order, or the next waypoint on the way to it. */
const aim = { x: 0, y: 0 };

/**
 * Pick the point a hull steers at on its way to (tx, ty), routing around
 * ground that will not admit it (#431; docs/systems-depth.md §2).
 *
 * The common case costs nothing: a hull with a clear segment to its order
 * holds a "straight" plan with no waypoints and re-checks it on the Echo beat.
 * Only a hull whose segment crosses refusing ground searches, and the search
 * is `Pathfinder.findPath` over the terrain's cells at the hull's depth.
 *
 * A plan is revisited when the order moves by more than a creep, when the
 * ground changes (terrain revision), when the hull's depth has moved enough
 * to change what admits it, or on the revalidation cadence — except that a
 * plan whose goal was unreachable waits for the ground or the depth, because
 * re-searching a sealed goal twelve times a second is the one way routing
 * could become a per-tick cost.
 */
function steerPoint(
  world: SimWorld,
  eid: number,
  px: number,
  py: number,
  tx: number,
  ty: number,
  depthM: number
): void {
  const terrain = world.terrain;
  const tick = world.tick;
  let plan = world.paths.get(eid);

  if (plan !== undefined) {
    const shiftX = plan.targetX - tx;
    const shiftY = plan.targetY - ty;
    const shift2 = shiftX * shiftX + shiftY * shiftY;
    if (shift2 > MOVEMENT.ROUTE_RETARGET_M * MOVEMENT.ROUTE_RETARGET_M) {
      // A new order. Keep the object, drop everything it knew.
      plan.waypoints.length = 0;
      plan.index = 0;
      plan.tick = -MOVEMENT.ROUTE_REVALIDATE_TICKS;
      plan.exhausted = false;
    } else if (shift2 > 0) {
      // The order crept — a pursued hull moving. The route to where it was
      // is still the route to where it is; only the final leg bends.
      plan.targetX = tx;
      plan.targetY = ty;
    }
  }

  const groundMoved = plan !== undefined && plan.revision !== terrain.revision;
  const depthMoved =
    plan !== undefined && Math.abs(depthM - plan.depthM) > MOVEMENT.ROUTE_DEPTH_TOLERANCE_M;
  const due =
    plan !== undefined && !plan.exhausted && tick - plan.tick >= MOVEMENT.ROUTE_REVALIDATE_TICKS;

  if (plan === undefined || groundMoved || depthMoved || due) {
    if (plan === undefined) {
      plan = {
        targetX: tx,
        targetY: ty,
        revision: 0,
        depthM,
        tick,
        waypoints: [],
        index: 0,
        exhausted: false,
      };
      world.paths.set(eid, plan);
    }
    plan.targetX = tx;
    plan.targetY = ty;
    plan.revision = terrain.revision;
    plan.depthM = depthM;
    plan.tick = tick;
    plan.index = 0;
    if (terrain.segmentAdmits(px, py, tx, ty, depthM)) {
      plan.waypoints.length = 0;
      plan.exhausted = false;
    } else {
      plan.exhausted = !world.pathfinder.findPath(terrain, px, py, tx, ty, depthM, plan.waypoints);
    }
  }

  // Follow: consume every waypoint already inside reach, then steer at the
  // next one. Past the last, the final leg is straight at the order — the
  // step every leg used to be, slide included.
  const waypoints = plan.waypoints;
  const count = waypoints.length >> 1;
  const reach2 = MOVEMENT.WAYPOINT_REACH_M * MOVEMENT.WAYPOINT_REACH_M;
  while (plan.index < count) {
    const wx = waypoints[2 * plan.index]!;
    const wy = waypoints[2 * plan.index + 1]!;
    if ((px - wx) * (px - wx) + (py - wy) * (py - wy) > reach2) break;
    plan.index++;
  }
  if (plan.index < count) {
    aim.x = waypoints[2 * plan.index]!;
    aim.y = waypoints[2 * plan.index + 1]!;
  } else {
    aim.x = tx;
    aim.y = ty;
  }
}

function speedMultiplier(world: SimWorld, eid: number): number {
  // Storm interference stacks with silent running rather than replacing it
  // (docs/hazards.md §5, "Bathyarch machinery malfunctions"): a Consortium
  // hull creeping through a storm is slow for two separate reasons.
  //
  // A cold shock current stacks the same way (docs/hazards.md §8): cold water
  // is a separate reason to be slow from a storm rattling your machinery, and
  // from creeping. Only the speed term is read here — the SIG term belongs to
  // the acoustics pass, which runs after this one and so sees a fresh heading.
  // Kelp is a third, independent reason to be slow (docs/hazards.md §4), and
  // it stacks like the others: a Hadron hull creeping through a storm in the
  // maze core is slow three times over, which is the correct answer.
  const weather =
    stormModifiers(world, eid).speed *
    currentModifiers(world, eid).speed *
    kelpModifiers(world, eid).speed;

  // Shallow water poisons the Directorate (docs/factions.md, docs/systems-depth.md
  // §3): above the Shelf line their hulls run at 80%. Unlike the three above it
  // this one is not weather — it is where the hull *is*, and it follows the hull
  // rather than the map, so a Directorate fleet cannot outrun it by leaving a
  // site. It stacks multiplicatively for the same reason the others do: being
  // in the wrong water is not the same fact as being in a storm, and a hull
  // that is both should pay for both.
  const water =
    weather *
    (inDirectorateShallows(Owner.faction[eid] as Faction, Position.depth[eid]!)
      ? DIRECTORATE_SHALLOW.SPEED_MULTIPLIER
      : 1);

  // A mission commander's one authored act, while it runs
  // (`MissionCommanderAbility`; docs/characters.md). Stacks multiplicatively
  // with everything above it for the reason the three weather terms stack with
  // each other: a plateau that convened while a storm was rattling its hulls
  // has two separate facts true about it, and neither cancels the other. Empty
  // in every skirmish, and the read is gated on that.
  const act = water * (world.commanderHaste.size === 0 ? 1 : (world.commanderHaste.get(eid) ?? 1));

  if (!SilentRunning.active[eid]) return act;
  // Immunity is to the **speed** penalty and to nothing else — the SIG floor
  // stays, per docs/mission-convocation.md §4: "A convocation makes the plateau
  // fast; it does not make it inaudible, and an ability that did both would be
  // the one mechanic in this game that is not an argument about sound." The
  // floor lives in acoustics and this function cannot reach it, which is the
  // structural version of the same promise.
  //
  // For the Commune this is the whole of the ability: their multiplier is 0.8
  // against everybody else's 0.55, so removing it and adding the bonus reads
  // 0.8 → 1.0 → 1.25 — fifteen seconds of a hull that moves half again as fast
  // as it was moving and is still silent.
  if (world.commanderSilentImmune.has(eid)) return act;
  return (
    act *
    (Owner.faction[eid] === Faction.Pelagia
      ? SILENT_RUNNING.PELAGIA_SPEED_MULTIPLIER
      : SILENT_RUNNING.SPEED_MULTIPLIER)
  );
}

export function movementSystem(world: SimWorld): void {
  const dt = world.dt;
  const entities = movable(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;

    if (!MoveOrder.active[eid]) {
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      continue;
    }

    const dx = MoveOrder.x[eid]! - Position.x[eid]!;
    const dy = MoveOrder.y[eid]! - Position.y[eid]!;
    const distance = Math.hypot(dx, dy);

    if (distance <= MOVEMENT.ARRIVAL_EPSILON_M) {
      MoveOrder.active[eid] = 0;
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      world.paths.delete(eid);
      continue;
    }

    const stats = statsFor(Unit.kind[eid] as UnitKind);
    const speed = stats.speed * speedMultiplier(world, eid);
    const fromX = Position.x[eid]!;
    const fromY = Position.y[eid]!;

    // The course is to the next waypoint of a route around ground the hull
    // does not fit through (#431), and to the order itself in open water —
    // which is most water, most of the time, and costs one segment test on
    // the Echo beat.
    steerPoint(
      world,
      eid,
      fromX,
      fromY,
      MoveOrder.x[eid]!,
      MoveOrder.y[eid]!,
      Position.depth[eid]!
    );
    const ax = aim.x - fromX;
    const ay = aim.y - fromY;
    const leg = Math.hypot(ax, ay);
    // Never overshoot the point being steered at within a single step: a
    // waypoint is landed on and consumed next tick, the order is arrived at.
    const travel = Math.min(speed * dt, leg);
    const nx = leg > 0 ? ax / leg : dx / distance;
    const ny = leg > 0 ? ay / leg : dy / distance;

    // Ground still has the last word on the step itself (docs/systems-depth.md
    // §2). A hull too deep for the water ahead does not drive into it;
    // resolveStep slides it along the edge instead, and depthSystem lifts it
    // until it fits. The route above keeps that from being the whole story —
    // a slide is a graze off a route's edge now, not a fleet pinned in a bay —
    // but the AI still has no depth command, so ground that merely blocked
    // would still strand every hull that met it below a plateau.
    world.terrain.resolveStep(
      fromX,
      fromY,
      fromX + nx * travel,
      fromY + ny * travel,
      Position.depth[eid]!,
      step
    );
    Position.x[eid] = step.x;
    Position.y[eid] = step.y;
    Velocity.x[eid] = nx * speed;
    Velocity.y[eid] = ny * speed;
    // The bow, written here and deliberately never cleared — the two branches
    // above zero `Velocity` when a hull stops and leave this alone, which is
    // the whole point of the component (docs/systems-echo.md §8: a stopped hull
    // holds the last course it had).
    //
    // The *ordered* course rather than the travelled one, matching `Velocity`
    // directly above: `resolveStep` may slide a hull along ground it cannot
    // enter, and a hull scraping down a ridge is still pointed where it was
    // told to go. Taking the realised step instead would swing a Knight's cone
    // by whatever the terrain did to it, which is a bow nobody ordered.
    Heading.rad[eid] = Math.atan2(ny, nx);
  }
}
