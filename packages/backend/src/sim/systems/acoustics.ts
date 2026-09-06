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
  HOLD,
  ACTIVE_SONAR,
  CONSTRUCTION,
  DEPTH,
  HARVEST_THROTTLE,
  ORDNANCE,
  RESOURCE,
  ResourceKind,
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
  Hold,
  HullEffect,
  Laying,
  MineMagazine,
  Position,
  SilentRunning,
  StaticEmitter,
  Structure,
  UnderConstruction,
  Unit,
  Velocity,
} from '../components.ts';
import { currentModifiers, kelpModifiers, stormModifiers } from './hazards.ts';
import type { SimWorld } from '../world.ts';

// `Position` is what a hull in a hold lacks (systems/carrying.ts), and the
// hazard modifiers below read one; a carried hull emits nothing and is not
// walked here at all.
const emitters = defineQuery([Acoustic, Unit, Velocity, SilentRunning, Position]);
const structureEmitters = defineQuery([Acoustic, Structure]);
const staticEmitters = defineQuery([Acoustic, StaticEmitter]);

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
      // central decision surface (docs/economy.md §3) — plus whatever the
      // resource itself costs to cut. Crystal carries a premium, which puts
      // Standard-throttle crystal work in the doc's 60-70 band (§2) without
      // taking the throttle decision away from the player.
      sig =
        HARVEST_THROTTLE[Harvester.throttle[eid] as HarvestThrottle].sig +
        RESOURCE[Harvester.cargoKind[eid] as ResourceKind].miningSigPremium;
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

    // Laying a mine is construction, and construction is loud
    // (docs/systems-combat.md §6). A floor for the same reason descent is one:
    // it must never make an already-louder hull quieter, and it must hold
    // through a hull that tries to go silent mid-lay. The field it produces is
    // silent — the counter-play is hearing it *being built*.
    //
    // Unless the mine was grown aboard rather than built in the water: a
    // Spinner's "laying is silent" (docs/units.md) — the field is the same
    // §6 field, but the noise of making it was paid at the nursery.
    if (
      hasComponent(world, Laying, eid) &&
      Laying.remainingS[eid]! > 0 &&
      !hasComponent(world, MineMagazine, eid)
    ) {
      sig = Math.max(sig, ORDNANCE.MINE.SIG_LAYING);
    }

    // An effect hull at work (docs/units.md, the rung's roster): the Sower's
    // bloom at 45, the Cantus's song at 80, the Tender's welding at +12 on its
    // idle. A floor for descent's reasons — it never makes an already-louder
    // hull quieter — and the state is this tick's, written by
    // `hullEffectsSystem` before the auras that grant on it read it, so what
    // a hull grants and what it is heard doing are one fact.
    if (stats.sigWorking !== undefined && HullEffect.active[eid] === 1) {
      sig = Math.max(sig, stats.sigWorking);
    }

    // A mission's hold-and-cut lift is Overburden's work at Overburden's
    // loudness (docs/economy.md §3, docs/mission-asset-recovery.md §8), on maps
    // that carry no resource fields for the harvest branch above to read. A
    // floor for the same reasons descent and laying are floors: it must never
    // make an already-louder hull quieter, and it holds through a barge that
    // tries to go silent mid-cut — there is no quiet way to do a salvage. The
    // mission runtime rebuilds the map on every Echo tick; the size gate keeps
    // every skirmish emitter to one integer compare.
    if (world.liftCutSig.size !== 0) {
      const cutSig = world.liftCutSig.get(eid);
      if (cutSig !== undefined) sig = Math.max(sig, cutSig);
    }

    // A sounding is the Sounding Spire's active figure produced by hand
    // (docs/mission-aptitude.md §4), and a floor for the cut's reasons: it
    // never quietens an already-louder hull, and a hull that tries to go silent
    // mid-sounding keeps the floor for the interval it was still holding —
    // `applySoundings` stops the hold on the next pass, so going quiet ends the
    // sounding rather than muffling it. Which is the mission's whole argument
    // in one branch: the Order does not run silent, it turns.
    if (world.soundingSig.size !== 0) {
      const holdSig = world.soundingSig.get(eid);
      if (holdSig !== undefined) sig = Math.max(sig, holdSig);
    }

    sig = applySpikeDecay(world, eid, sig);
    // A Resonance Storm destabilises organic tech (docs/hazards.md §5), which
    // is added before the veil takes its cut: the cloud muffles whatever the
    // hull is doing, and being rattled by a storm is part of that.
    sig += stormModifiers(world, eid).sig;
    // Fighting a cold shock current is work, and work is noise
    // (docs/hazards.md §8). Added in the same place and for the same reason as
    // the storm's: it is something happening *to* the hull, so the veil below
    // still takes its cut of it. Riding the current adds nothing at all, which
    // is what makes crossing one a decision.
    sig += currentModifiers(world, eid).sig;
    // Pushing through kelp is work, and work is noise (docs/hazards.md §4).
    // The trade the masking biome exists for: sit still in it and you are the
    // quietest thing on the map; drive through it and you are the loudest.
    sig += kelpModifiers(world, eid).sig;
    // A hold is heard as its load: HOLD.SIG_PER_BERTH a berth carried, at
    // every posture, Silent Running included — added after the posture chain
    // so a full hold cannot be hushed, and before the veil's cut so a cloud
    // still muffles it (docs/systems-echo.md §3, "A hull in a hold").
    if (hasComponent(world, Hold, eid)) sig += Hold.used[eid]! * HOLD.SIG_PER_BERTH;
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

  // Authored static emitters — the taps (docs/mission-asset-recovery.md §6).
  // SIG stays a function of what the thing is doing, and what the taps do is
  // strike on the interval: the authored figure through each on-window, zero
  // between strikes and once silenced. The veil still takes its cut — a cloud
  // muffles struck iron like anything else. Empty in every skirmish; the query
  // costs nothing where no mission placed one.
  const placed = staticEmitters(world);
  for (let i = 0; i < placed.length; i++) {
    const eid = placed[i]!;
    const striking =
      StaticEmitter.active[eid] === 1 &&
      world.tick % StaticEmitter.periodTicks[eid]! < StaticEmitter.onTicks[eid]!;
    let sig = striking ? StaticEmitter.sig[eid]! : 0;
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
 *
 * Returns whether this discharge broke silence, so the caller can raise the
 * self-event the mix needs: the break is a discrete moment, not the gradual
 * SIG change a client could read off the meter.
 */
export function applyFiringSpike(eid: number, weaponSig: number): boolean {
  let amount = weaponSig;
  const duration = SILENT_RUNNING.BREAK_SILENCE_DURATION_S;

  let brokeSilence = false;
  if (SilentRunning.active[eid]) {
    amount += SILENT_RUNNING.BREAK_SILENCE_SIG_SPIKE;
    SilentRunning.active[eid] = 0;
    brokeSilence = true;
  }

  // A new spike replaces a weaker one rather than summing, so rapid fire does
  // not run SIG away to 100 and pin it there.
  if (amount >= Acoustic.spikeAmount[eid]!) {
    Acoustic.spikeAmount[eid] = amount;
    Acoustic.spikeRemainingS[eid] = duration;
  } else {
    Acoustic.spikeRemainingS[eid] = Math.max(Acoustic.spikeRemainingS[eid]!, duration);
  }

  // Returned rather than raised here: this module has no world handle, and the
  // caller is the one that knows an event channel exists.
  return brokeSilence;
}
