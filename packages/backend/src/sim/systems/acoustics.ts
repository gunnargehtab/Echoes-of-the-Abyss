/**
 * Acoustics system — recomputes every entity's live SIG each tick.
 *
 * This is the system that makes the game's central tension mechanical:
 * everything that makes you strong makes you loud (docs/systems-echo.md §2).
 * SIG is derived state, never authored directly — it is always a function of
 * what the unit is currently doing.
 */

import { defineQuery, hasComponent } from 'bitecs';
import { ACTIVE_SONAR, SILENT_RUNNING, statsFor, type UnitKind } from '@echoes/shared';
import { Acoustic, ActivePing, SilentRunning, Unit, Velocity } from '../components.ts';
import type { SimWorld } from '../world.ts';

const emitters = defineQuery([Acoustic, Unit, Velocity, SilentRunning]);

/** Below this speed the unit counts as stationary rather than cruising. */
const MOVING_EPSILON = 0.01;

/**
 * Where in the 3-8 Silent Running band a unit sits.
 *
 * Bulky, normally-loud hulls do not get as quiet as a scout does, so the band
 * position is derived from the unit's idle SIG. Deterministic, so two clients
 * replaying the same tick agree.
 */
function silentRunningSig(idleSig: number): number {
  const t = Math.min(1, Math.max(0, idleSig / 60));
  return SILENT_RUNNING.SIG_MIN + (SILENT_RUNNING.SIG_MAX - SILENT_RUNNING.SIG_MIN) * t;
}

export function acousticsSystem(world: SimWorld): void {
  const dt = world.dt;
  const entities = emitters(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    const stats = statsFor(Unit.kind[eid] as UnitKind);

    let sig: number;

    if (hasComponent(world, ActivePing, eid) && ActivePing.remainingS[eid]! > 0) {
      // A ping drowns out everything else the unit is doing.
      sig = ACTIVE_SONAR.EMITTER_SIG;
      ActivePing.remainingS[eid] = Math.max(0, ActivePing.remainingS[eid]! - dt);
    } else if (SilentRunning.active[eid]) {
      sig = silentRunningSig(stats.sigIdle);
    } else {
      const speed = Math.hypot(Velocity.x[eid]!, Velocity.y[eid]!);
      sig = speed > MOVING_EPSILON ? stats.sigCruise : stats.sigIdle;
    }

    // Transient spikes (firing, breaking silence) decay on their own clock and
    // stack on top of whatever the unit's baseline currently is.
    if (Acoustic.spikeRemainingS[eid]! > 0) {
      sig += Acoustic.spikeAmount[eid]!;
      Acoustic.spikeRemainingS[eid] = Math.max(0, Acoustic.spikeRemainingS[eid]! - dt);
      if (Acoustic.spikeRemainingS[eid] === 0) Acoustic.spikeAmount[eid] = 0;
    }

    Acoustic.sig[eid] = Math.min(100, Math.max(0, sig));
  }
}

/**
 * Apply a transient SIG spike, e.g. a weapon discharge.
 *
 * Breaking Silent Running to fire adds the +40 ambush spike on top of the
 * weapon's own noise — the first shot of an ambush is always the loudest, and
 * always tells the whole map an ambush happened (docs/systems-echo.md §6).
 */
export function applyFiringSpike(eid: number, weaponSig: number): void {
  let amount = weaponSig;
  const duration = SILENT_RUNNING.BREAK_SILENCE_DURATION_S;

  if (SilentRunning.active[eid]) {
    amount += SILENT_RUNNING.BREAK_SILENCE_SIG_SPIKE;
    SilentRunning.active[eid] = 0;
  }

  // A new spike replaces a weaker one rather than summing, so rapid fire does
  // not run SIG away to 100 and pin it there.
  if (amount >= Acoustic.spikeAmount[eid]!) {
    Acoustic.spikeAmount[eid] = amount;
    Acoustic.spikeRemainingS[eid] = duration;
  } else {
    Acoustic.spikeRemainingS[eid] = Math.max(Acoustic.spikeRemainingS[eid]!, duration);
  }
}
