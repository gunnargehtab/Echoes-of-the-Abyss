/**
 * Acoustics system — recomputes every entity's live SIG each tick.
 *
 * This is the system that makes the game's central tension mechanical:
 * everything that makes you strong makes you loud (docs/systems-echo.md §2).
 * SIG is derived state, never authored directly — it is always a function of
 * what the unit is currently doing.
 */

import { defineQuery, hasComponent } from 'bitecs';
import {
  ACTIVE_SONAR,
  CONSTRUCTION,
  DEPTH,
  HARVEST_THROTTLE,
  SILENT_RUNNING,
  statsFor,
  structureStatsFor,
  type HarvestThrottle,
  type StructureKind,
  type UnitKind,
} from '@echoes/shared';
import {
  Acoustic,
  ActivePing,
  DepthOrder,
  Harvester,
  HarvestMode,
  SilentRunning,
  Structure,
  UnderConstruction,
  Unit,
  Velocity,
} from '../components.ts';
import type { SimWorld } from '../world.ts';

const emitters = defineQuery([Acoustic, Unit, Velocity, SilentRunning]);
const structureEmitters = defineQuery([Acoustic, Structure]);

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

/** Transient spikes (firing, breaking silence) stack on the current baseline. */
function applySpikeDecay(world: SimWorld, eid: number, sig: number): number {
  if (Acoustic.spikeRemainingS[eid]! > 0) {
    sig += Acoustic.spikeAmount[eid]!;
    Acoustic.spikeRemainingS[eid] = Math.max(0, Acoustic.spikeRemainingS[eid]! - world.dt);
    if (Acoustic.spikeRemainingS[eid] === 0) Acoustic.spikeAmount[eid] = 0;
  }
  return sig;
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
    } else if (hasComponent(world, Harvester, eid) && Harvester.mode[eid] === HarvestMode.Mining) {
      // Mining loudness follows the throttle, not the hull — the economy's
      // central decision surface (docs/economy.md §3).
      sig = HARVEST_THROTTLE[Harvester.throttle[eid] as HarvestThrottle].sig;
    } else {
      const speed = Math.hypot(Velocity.x[eid]!, Velocity.y[eid]!);
      sig = speed > MOVING_EPSILON ? stats.sigCruise : stats.sigIdle;
    }

    // Descent is a floor on loudness rather than a value that replaces the
    // chain above: blowing ballast is the loudest thing a hull does short of a
    // ping, and it must never make an already-louder unit quieter
    // (docs/systems-depth.md §2). Applied outside the chain so it also holds
    // for a hull that goes silent mid-dive — you cannot dive quietly.
    // Ascent deliberately contributes nothing; rising is the quiet direction.
    if (hasComponent(world, DepthOrder, eid) && DepthOrder.descending[eid] === 1) {
      sig = Math.max(sig, DEPTH.DESCENT_SIG);
    }

    sig = applySpikeDecay(world, eid, sig);
    // A Spore Veil muffles the *derived* SIG — whatever the unit is doing,
    // the cloud takes its cut last (auras system, symmetric).
    sig *= Acoustic.sigFactor[eid]! || 1;
    Acoustic.sig[eid] = Math.min(100, Math.max(0, sig));
  }

  // Structures cannot run silent and cannot move; their loudness is a function
  // of what stage of life they are in. A construction site broadcasts, a
  // refinery hums forever, a foundry is loud exactly while its line runs.
  const sites = structureEmitters(world);
  for (let i = 0; i < sites.length; i++) {
    const eid = sites[i]!;
    let sig: number;
    if (hasComponent(world, UnderConstruction, eid)) {
      sig = CONSTRUCTION.SITE_SIG;
    } else {
      const stats = structureStatsFor(Structure.kind[eid] as StructureKind);
      // "Active" is per structure kind: a foundry is loud while its line
      // runs; a Sounding Spire is loud while its depth grant is load-bearing
      // (world.spireActive, written by the auras system this tick).
      const producing = (world.production.get(eid)?.queue.length ?? 0) > 0;
      const projecting = world.spireActive.has(eid);
      sig = producing || projecting ? stats.sigActive : stats.sigIdle;
    }
    sig = applySpikeDecay(world, eid, sig);
    sig *= Acoustic.sigFactor[eid]! || 1;
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
