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
      continue;
    }

    const stats = statsFor(Unit.kind[eid] as UnitKind);
    const speed = stats.speed * speedMultiplier(world, eid);
    // Never overshoot the target within a single step.
    const travel = Math.min(speed * dt, distance);
    const nx = dx / distance;
    const ny = dy / distance;

    // Ground has a say now (docs/systems-depth.md §2). A hull too deep for the
    // water ahead does not drive into it; resolveStep slides it along the edge
    // instead, and depthSystem lifts it until it fits — so a plateau costs a
    // fleet time and a detour rather than stopping it dead. That matters more
    // than it looks: nothing in this simulation can path around an obstacle,
    // and the AI has no depth command at all, so ground that merely blocked
    // would strand every hull that met it.
    const fromX = Position.x[eid]!;
    const fromY = Position.y[eid]!;
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
