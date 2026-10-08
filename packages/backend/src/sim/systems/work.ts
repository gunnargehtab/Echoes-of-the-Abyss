/**
 * Whether a hull's posture stops its work — docs/systems-echo.md §6.
 *
 * Silent Running "cannot mine, build, or repair", and a hull with its drive
 * cut stops work the same way (#1237): a hull that has shut its machinery
 * down is not running it. Mining, sowing, the bloom share, the thermal
 * cutter, a mission's lift and its sounding all read this one predicate, so
 * they cannot drift apart again the way mining did, which read no posture at
 * all and mined at full rate at a silent hull's SIG. An effect hull keeps its
 * own switch (`hullEffects.ts`): its work is a role, and §6 lets it go on with
 * the drive cut as weapons do.
 */
import { hasComponent } from 'bitecs';
import { EngineOff, SilentRunning } from '../components.ts';
import type { SimWorld } from '../world.ts';

export function postureStopsWork(world: SimWorld, eid: number): boolean {
  return (
    (hasComponent(world, SilentRunning, eid) && SilentRunning.active[eid] === 1) ||
    (hasComponent(world, EngineOff, eid) && EngineOff.active[eid] === 1)
  );
}
