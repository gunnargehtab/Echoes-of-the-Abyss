/**
 * Environmental hazards — docs/hazards.md.
 *
 * Terrain until now has been a static biome grid that sets PF and never
 * changes. Hazards are what make the map an *actor* rather than a backdrop.
 *
 * **Every hazard warns before it acts.** That is a design constraint, not
 * polish: `CLAUDE.md` fixes the target emotion as "dread, not confusion", and
 * an unannounced instant kill teaches a player that the map is arbitrary
 * rather than that it is dangerous. The warning phase is sized so a Harvester
 * — the slowest thing in the roster — can clear the radius from its centre.
 *
 * Two hazards are implemented, chosen to exercise opposite ends of the
 * framework:
 *
 * - **Geothermal Vent Eruptions** (§1) are positional, damaging, and *loud*:
 *   a hull caught in the plume takes damage, is thrown outward, and is spiked
 *   to SIG 55 through the ordinary acoustic path. Being hurt and being found
 *   are the same moment, which is this game's whole thesis applied to weather.
 * - **Resonance Storms** (§5) are area-wide, temporary, and an attack on
 *   *information* rather than on hulls. They multiply PF inside their area,
 *   which reaches detection as a write to the per-cell array the Echo Layer
 *   already reads — no new code path, and biome and storm compose for free.
 *
 * The remaining six are listed in docs/hazards.md with a status marker.
 */

import {
  Faction,
  HAZARDS,
  HazardPhase,
  SILENT_RUNNING,
  type HazardKind,
  type HazardState,
} from '@echoes/shared';
import { Acoustic, Health, Owner, Position, Structure, Unit } from '../components.ts';
import type { SimWorld } from '../world.ts';

/** Per-phase durations for a kind, in seconds. */
interface Cycle {
  dormantS: number;
  warningS: number;
  activeS: number;
  decayS: number;
}

const CYCLES: Partial<Record<HazardKind, Cycle>> = {
  'geothermal-eruption': {
    dormantS: HAZARDS.ERUPTION.DORMANT_S,
    warningS: HAZARDS.ERUPTION.WARNING_S,
    activeS: HAZARDS.ERUPTION.ACTIVE_S,
    decayS: HAZARDS.ERUPTION.DECAY_S,
  },
  'resonance-storm': {
    dormantS: HAZARDS.STORM.DORMANT_S,
    warningS: HAZARDS.STORM.WARNING_S,
    activeS: HAZARDS.STORM.ACTIVE_S,
    decayS: HAZARDS.STORM.DECAY_S,
  },
};

/** A hazard the simulation is running. */
export interface Hazard {
  id: number;
  kind: HazardKind;
  x: number;
  y: number;
  radiusM: number;
  phase: HazardPhase;
  /** Seconds spent in the current phase. */
  elapsedS: number;
  /**
   * Extra dormancy bought by a Bathyarch presence.
   *
   * doc §1: "Bathyarch can stabilize vents for energy boosts". Stabilising is
   * a *delay*, not a cancellation — a stabilised vent still erupts eventually,
   * so holding one is a commitment rather than a solved problem.
   */
  stabilisedS: number;
}

/** Hazards the framework knows how to run. The rest are sites only. */
export function isSimulated(kind: HazardKind): boolean {
  return CYCLES[kind] !== undefined;
}

/**
 * How long the current phase lasts for this hazard, right now.
 *
 * Not a constant, because §1's Hadron interaction — "can predict eruptions via
 * resonance sensors" — is implemented as a *longer warning* for the player who
 * has a listener nearby. Prediction that only tells you what you were going to
 * find out anyway is not prediction; extra time to act is.
 */
function phaseDuration(world: SimWorld, hazard: Hazard): number {
  const cycle = CYCLES[hazard.kind];
  if (cycle === undefined) return Infinity;
  switch (hazard.phase) {
    case HazardPhase.Dormant:
      return cycle.dormantS + hazard.stabilisedS;
    case HazardPhase.Warning:
      return cycle.warningS + (hasHadronWatcher(world, hazard) ? hadronBonus(hazard) : 0);
    case HazardPhase.Active:
      return cycle.activeS;
    case HazardPhase.Decay:
      return cycle.decayS;
  }
}

function hadronBonus(hazard: Hazard): number {
  return hazard.kind === 'geothermal-eruption' ? HAZARDS.ERUPTION.HADRON_WARNING_BONUS_S : 0;
}

/** Does a Hadron listener have this vent in range of its resonance sensors? */
function hasHadronWatcher(world: SimWorld, hazard: Hazard): boolean {
  return anyFactionWithin(world, hazard, Faction.Hadron, hazard.radiusM * 3);
}

function anyFactionWithin(
  world: SimWorld,
  hazard: Hazard,
  faction: Faction,
  radiusM: number
): boolean {
  const found = world.unitGrid.queryRadius(hazard.x, hazard.y, radiusM, world.separationBuffer);
  for (let i = 0; i < found.length; i++) {
    const eid = found[i]!;
    if (Owner.faction[eid] !== faction) continue;
    const dx = Position.x[eid]! - hazard.x;
    const dy = Position.y[eid]! - hazard.y;
    if (dx * dx + dy * dy <= radiusM * radiusM) return true;
  }
  return false;
}

/**
 * Advance every hazard and apply what the active ones do.
 *
 * Ordered deliberately: phases advance first, then effects are applied from
 * the *new* phase, so a hazard that became Active this tick acts this tick
 * rather than one tick late.
 */
export function hazardsSystem(world: SimWorld): void {
  const dt = world.dt;
  if (world.hazards.length === 0) return;

  let modifiersChanged = false;

  for (const hazard of world.hazards) {
    if (!isSimulated(hazard.kind)) continue;

    // Bathyarch stabilisation, doc §1. Applied while dormant only: once a vent
    // is warming up, nobody is holding it back.
    if (hazard.phase === HazardPhase.Dormant && hazard.kind === 'geothermal-eruption') {
      if (anyFactionWithin(world, hazard, Faction.Bathyarch, hazard.radiusM)) {
        hazard.stabilisedS = Math.min(
          HAZARDS.ERUPTION.BATHYARCH_STABILISE_S,
          hazard.stabilisedS + dt
        );
        creditStabiliser(world, hazard, dt);
      }
    }

    hazard.elapsedS += dt;
    const duration = phaseDuration(world, hazard);
    if (hazard.elapsedS >= duration) {
      hazard.elapsedS = 0;
      const before = hazard.phase;
      hazard.phase = nextPhase(hazard.phase);
      // Stabilisation is spent by the eruption it delayed.
      if (before === HazardPhase.Dormant) hazard.stabilisedS = 0;
      if (affectsPropagation(hazard.kind)) modifiersChanged = true;
    }

    applyEffects(world, hazard, dt);
  }

  if (modifiersChanged) rebuildPropagation(world);
}

function nextPhase(phase: HazardPhase): HazardPhase {
  switch (phase) {
    case HazardPhase.Dormant:
      return HazardPhase.Warning;
    case HazardPhase.Warning:
      return HazardPhase.Active;
    case HazardPhase.Active:
      return HazardPhase.Decay;
    case HazardPhase.Decay:
      return HazardPhase.Dormant;
  }
}

function affectsPropagation(kind: HazardKind): boolean {
  return kind === 'resonance-storm';
}

/**
 * Rewrite the terrain's PF array from the hazards currently modifying it.
 *
 * Called only when a phase boundary changes the modifier set — a few times a
 * minute, not every tick. `applyPropagationModifiers` recomputes from the
 * biome rather than inverting, so this is exact however many storms overlap.
 */
function rebuildPropagation(world: SimWorld): void {
  const mods: { x: number; y: number; radiusM: number; scale: number }[] = [];
  for (const hazard of world.hazards) {
    if (!affectsPropagation(hazard.kind)) continue;
    if (hazard.phase !== HazardPhase.Active && hazard.phase !== HazardPhase.Decay) continue;
    mods.push({
      x: hazard.x,
      y: hazard.y,
      radiusM: hazard.radiusM,
      // Decay tapers rather than stopping dead, so resolution recovers over a
      // few seconds instead of snapping back mid-engagement.
      scale: hazard.phase === HazardPhase.Active ? HAZARDS.STORM.PF_MULTIPLIER : stormTaper(),
    });
  }
  world.terrain.applyPropagationModifiers(mods);
}

/** Half-way back toward transparent, for the decay phase. */
function stormTaper(): number {
  return (HAZARDS.STORM.PF_MULTIPLIER + 1) / 2;
}

function creditStabiliser(world: SimWorld, hazard: Hazard, dt: number): void {
  const found = world.unitGrid.queryRadius(
    hazard.x,
    hazard.y,
    hazard.radiusM,
    world.separationBuffer
  );
  for (let i = 0; i < found.length; i++) {
    const eid = found[i]!;
    if (Owner.faction[eid] !== Faction.Bathyarch) continue;
    const economy = world.economies.get(Owner.slot[eid]!);
    if (economy === undefined) continue;
    // "Energy boosts": a trickle for holding the vent, not a second economy.
    economy.nodules += HAZARDS.ERUPTION.BATHYARCH_ENERGY_PER_S * dt;
    return;
  }
}

function applyEffects(world: SimWorld, hazard: Hazard, dt: number): void {
  if (hazard.phase !== HazardPhase.Active && hazard.phase !== HazardPhase.Decay) return;
  // Decay does half damage: subsiding, not stopped.
  const taper = hazard.phase === HazardPhase.Active ? 1 : 0.5;

  if (hazard.kind === 'geothermal-eruption') applyEruption(world, hazard, dt * taper);
  else if (hazard.kind === 'resonance-storm') applyStorm(world, hazard, dt * taper);
}

function applyEruption(world: SimWorld, hazard: Hazard, dt: number): void {
  const found = world.unitGrid.queryRadius(
    hazard.x,
    hazard.y,
    hazard.radiusM,
    world.separationBuffer
  );
  for (let i = 0; i < found.length; i++) {
    const eid = found[i]!;
    const dx = Position.x[eid]! - hazard.x;
    const dy = Position.y[eid]! - hazard.y;
    const distance = Math.hypot(dx, dy);
    if (distance > hazard.radiusM) continue;

    // Falls off to the rim, so the edge of a plume is survivable and the
    // middle is not — which is what makes the warning worth acting on.
    const falloff = 1 - distance / hazard.radiusM;
    let damage = HAZARDS.ERUPTION.DAMAGE_PER_S * falloff * dt;

    const isStructure = Structure.kind[eid] !== undefined && Unit.kind[eid] === undefined;
    if (isStructure) damage *= HAZARDS.ERUPTION.STRUCTURE_DAMAGE_MULTIPLIER;
    if (Owner.faction[eid] === Faction.Pelagia) {
      damage *= HAZARDS.ERUPTION.PELAGIA_DAMAGE_MULTIPLIER;
    }
    Health.hp[eid] = Health.hp[eid]! - damage;

    // The acoustic half. A hull being battered rings, and the whole map can
    // hear it: an eruption does not only hurt you, it finds you.
    if (Acoustic.spikeAmount[eid] !== undefined) {
      const spike = HAZARDS.ERUPTION.CAUGHT_SIG * falloff;
      if (spike >= Acoustic.spikeAmount[eid]!) Acoustic.spikeAmount[eid] = spike;
      Acoustic.spikeRemainingS[eid] = Math.max(
        Acoustic.spikeRemainingS[eid]!,
        SILENT_RUNNING.BREAK_SILENCE_DURATION_S
      );
    }

    if (isStructure || distance === 0) continue;
    // Knockback. Structures are anchored; the Directorate mostly is not moved.
    let push = HAZARDS.ERUPTION.KNOCKBACK_MPS * falloff * dt;
    if (Owner.faction[eid] === Faction.Directorate) {
      push *= HAZARDS.ERUPTION.DIRECTORATE_KNOCKBACK_MULTIPLIER;
    }
    Position.x[eid] = Position.x[eid]! + (dx / distance) * push;
    Position.y[eid] = Position.y[eid]! + (dy / distance) * push;
  }
}

function applyStorm(world: SimWorld, hazard: Hazard, dt: number): void {
  const found = world.unitGrid.queryRadius(
    hazard.x,
    hazard.y,
    hazard.radiusM,
    world.separationBuffer
  );
  for (let i = 0; i < found.length; i++) {
    const eid = found[i]!;
    const dx = Position.x[eid]! - hazard.x;
    const dy = Position.y[eid]! - hazard.y;
    if (dx * dx + dy * dy > hazard.radiusM * hazard.radiusM) continue;

    const isStructure = Structure.kind[eid] !== undefined && Unit.kind[eid] === undefined;
    let damage = HAZARDS.STORM.DAMAGE_PER_S * dt;
    if (isStructure) damage *= HAZARDS.STORM.STRUCTURE_DAMAGE_MULTIPLIER;
    Health.hp[eid] = Health.hp[eid]! - damage;
  }
}

/**
 * Faction effects a storm has on a unit, applied by the acoustics pass.
 *
 * Returned rather than written here because SIG and HYD are recomputed from
 * scratch every tick by `acousticsSystem`; a storm writing them directly would
 * be overwritten within the same step. This is the same shape as the aura
 * system, and for the same reason.
 */
export function stormModifiers(
  world: SimWorld,
  eid: number
): { hyd: number; sig: number; speed: number } {
  const none = { hyd: 0, sig: 0, speed: 1 };
  if (world.hazards.length === 0) return none;

  const x = Position.x[eid]!;
  const y = Position.y[eid]!;
  for (const hazard of world.hazards) {
    if (hazard.kind !== 'resonance-storm') continue;
    if (hazard.phase !== HazardPhase.Active) continue;
    const dx = x - hazard.x;
    const dy = y - hazard.y;
    if (dx * dx + dy * dy > hazard.radiusM * hazard.radiusM) continue;

    // doc §5's faction interactions. The Directorate's — "Abyssal creatures
    // panic (reduced control)" — is about fauna, which does not exist yet; it
    // is marked pending in docs/hazards.md rather than approximated with
    // something that is not what the doc says.
    switch (Owner.faction[eid]) {
      case Faction.Hadron:
        return { hyd: HAZARDS.STORM.HADRON_HYD_BONUS, sig: 0, speed: 1 };
      case Faction.Pelagia:
        return { hyd: 0, sig: HAZARDS.STORM.PELAGIA_SIG_PENALTY, speed: 1 };
      case Faction.Bathyarch:
        return { hyd: 0, sig: 0, speed: HAZARDS.STORM.BATHYARCH_SPEED_MULTIPLIER };
      default:
        return none;
    }
  }
  return none;
}

/** The public view of a hazard — every client gets all of them. */
export function hazardStates(world: SimWorld): HazardState[] {
  const out: HazardState[] = [];
  for (const hazard of world.hazards) {
    if (!isSimulated(hazard.kind)) continue;
    const duration = phaseDuration(world, hazard);
    out.push({
      id: hazard.id,
      kind: hazard.kind,
      x: hazard.x,
      y: hazard.y,
      radiusM: hazard.radiusM,
      phase: hazard.phase,
      progress: duration === 0 ? 1 : Math.min(1, hazard.elapsedS / duration),
      remainingS: Math.max(0, duration - hazard.elapsedS),
    });
  }
  return out;
}
