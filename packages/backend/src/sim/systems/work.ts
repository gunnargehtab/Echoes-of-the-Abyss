/**
 * Whether a hull's posture stops its work — docs/systems-echo.md §6.
 *
 * Silent Running "cannot mine, build, or repair", and a hull with its drive
 * cut stops the same work save one kind (#1237). Mining, sowing, the bloom
 * share, the thermal cutter, a mission's lift and its sounding all read this
 * one predicate, so they cannot drift apart again the way mining did, which
 * read no posture at all and mined at full rate at a silent hull's SIG. The
 * kind it leaves is an effect hull's — the bloom, the song, the Tender's
 * repair — whose switch reads silence alone (`hullEffects.ts`): §6 leaves
 * that work running under a drive cut, as it leaves weapons, and it is heard
 * at its working figure either way.
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
