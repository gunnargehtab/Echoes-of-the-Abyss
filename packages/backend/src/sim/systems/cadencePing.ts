/**
 * The picket's ping — a hull that transmits on its own clock rather than on an
 * order. docs/systems-echo.md §5, "A ping a hull fires itself".
 *
 * The mechanism is the commander's button, at a second set of figures
 * (`CADENCE_PING`, derived from the first). What this system adds is the part
 * that is not a mechanism at all: *nobody presses it*. A Beacon holds a picket
 * and the picket pings, which is why the hull buys continuous coverage and why
 * it sells its enemy a schedule.
 */

import { defineQuery, addComponent, hasComponent } from 'bitecs';
import { CADENCE_PING, SelfEventKind, statsFor, type UnitKind } from '@echoes/shared';
import {
  ActivePing,
  EngineOff,
  Health,
  PingCadence,
  Position,
  SilentRunning,
  Unit,
} from '../components.ts';
import { raiseSelfEvent, type SimWorld } from '../world.ts';

// `Position` is what a hull in a hold lacks (systems/carrying.ts). A carried
// picket does not transmit, for the same reason it is not resolved: it is not
// in the water.
const pickets = defineQuery([PingCadence, Unit, Position, SilentRunning, EngineOff, Health]);

export function cadencePingSystem(world: SimWorld): void {
  const dt = world.dt;
  const entities = pickets(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    if (Health.hp[eid]! <= 0) continue;

    // Silence and a cut drive both stop the set. This is the hull's only
    // counter-play for its owner, and it has to exist: a picket that could not
    // be told to shut up would be a hull you could never move through your own
    // map without announcing the move. Both postures hold the clock where it
    // is rather than resetting it, so ordering thirty seconds of quiet does not
    // buy a fresh twenty on top of it.
    if (SilentRunning.active[eid] || EngineOff.active[eid]) continue;

    // A transmission already in flight does not start another. Without this a
    // cadence shorter than REVEAL_DURATION_S would re-arm the ping every tick
    // and pin the hull at its emitter figure forever — a picket that never
    // stopped shouting, from one number moving.
    if (hasComponent(world, ActivePing, eid) && ActivePing.remainingS[eid]! > 0) continue;

    const remaining = PingCadence.remainingS[eid]! - dt;
    if (remaining > 0) {
      PingCadence.remainingS[eid] = remaining;
      continue;
    }

    // Fire, and carry the overshoot into the next interval rather than
    // dropping it: at 60 Hz the residue is under a tick, but a cadence that
    // rounded up every cycle would drift late over a long match and the
    // schedule an enemy learned would slowly stop being true.
    PingCadence.remainingS[eid] = statsFor(Unit.kind[eid] as UnitKind).pingCadenceS! + remaining;

    if (!hasComponent(world, ActivePing, eid)) addComponent(world, ActivePing, eid);
    ActivePing.remainingS[eid] = CADENCE_PING.REVEAL_DURATION_S;
    ActivePing.emitterSig[eid] = CADENCE_PING.EMITTER_SIG;
    ActivePing.revealRadiusM[eid] = CADENCE_PING.REVEAL_RADIUS_M;
    // The owner is told, exactly as they are told about the button's ping: the
    // mix needs the discrete moment, and a player whose picket just transmitted
    // should know it did without reading a SIG meter.
    raiseSelfEvent(world, { kind: SelfEventKind.Ping, eid });
  }
}
