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
  DRIFT,
  Faction,
  FaunaSpecies,
  HAZARDS,
  HazardPhase,
  SILENT_RUNNING,
  statsFor,
  type HazardKind,
  type HazardState,
  type UnitKind,
} from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import {
  Acoustic,
  Fauna,
  Health,
  Owner,
  Position,
  Structure,
  Unit,
  Velocity,
} from '../components.ts';
import type { PropagationModifier } from '../terrain.ts';
import type { SimWorld } from '../world.ts';
import { corridorModifiers } from './standingWave.ts';

/**
 * Everything a hazard can act on.
 *
 * Its own query rather than the separation system's `unitGrid`, which holds
 * **units only** and bails out entirely below two of them. Borrowing it meant
 * structures were never found: `STRUCTURE_DAMAGE_MULTIPLIER` existed, was
 * documented, and could never fire, so buildings quietly took no eruption
 * damage at all.
 *
 * A linear scan is the right shape here. Hazards are few and their radii are
 * small, so this is a few hundred distance checks a tick — cheaper than
 * maintaining a second spatial index, and impossible to leave stale.
 */
const affected = defineQuery([Position, Health, Owner]);

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
  'cold-shock': {
    dormantS: HAZARDS.COLD_SHOCK.DORMANT_S,
    warningS: HAZARDS.COLD_SHOCK.WARNING_S,
    activeS: HAZARDS.COLD_SHOCK.ACTIVE_S,
    decayS: HAZARDS.COLD_SHOCK.DECAY_S,
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
   * Which way a current flows, in radians, for `cold-shock` sites.
   *
   * Converted from the map's authored degrees once, here, so the per-tick path
   * never pays a conversion. Zero for every other kind, which is harmless
   * because nothing else reads it.
   */
  flowRad: number;
  /**
   * Seconds a blast is holding this field open for. Kelp only — counts down
   * every tick. Thermal cutters are tracked separately, because they hold a
   * field open rather than buying it a fixed span.
   */
  suppressedS: number;
  /**
   * Progress toward a Bathyarch hull cutting this field open, in seconds of
   * continuous presence, capped at `HAZARDS.KELP.BATHYARCH_BURN_S`.
   *
   * Charges while they are inside and bleeds when they are not, so the field
   * comes apart slowly and closes slowly. That is what makes burning a
   * commitment rather than a thing that happens because somebody walked past.
   */
  burnedS: number;
  /**
   * Extra dormancy bought by a Bathyarch presence.
   *
   * doc §1: "Bathyarch can stabilize vents for energy boosts". Stabilising is
   * a *delay*, not a cancellation — a stabilised vent still erupts eventually,
   * so holding one is a commitment rather than a solved problem.
   */
  stabilisedS: number;
}

/**
 * Hazards with no cycle at all — always on, and stopped only by something
 * actively holding them back.
 *
 * Kelp is the first of these. An eruption fires and subsides, a current runs
 * and slackens; kelp is simply *there* (docs/hazards.md §4), so there is no
 * dormant phase for it to wait in. It sits Active for the whole match and
 * drops to Dormant only while suppressed, which is exactly what that phase has
 * always meant: visible as a site, doing nothing.
 */
const PERMANENT: ReadonlySet<HazardKind> = new Set<HazardKind>(['kelp-entanglement']);

/** Does this kind begin its match already acting, rather than dormant? */
export function isPermanent(kind: HazardKind): boolean {
  return PERMANENT.has(kind);
}

/** Hazards the framework knows how to run. The rest are sites only. */
export function isSimulated(kind: HazardKind): boolean {
  return CYCLES[kind] !== undefined || PERMANENT.has(kind);
}

/**
 * How long this kind waits before it first stirs, in seconds. Zero for a
 * hazard with no cycle to wait in.
 *
 * Exported for `Match.seedHazards`, which staggers each site into its dormancy
 * so a map's hazards do not all fire together. That stagger has to scale by
 * *this kind's* wait: scaling every kind by the eruption's meant a storm could
 * only ever begin somewhere in the first 55 s of a 100 s dormancy, so every
 * storm on a map started in the back half of its own cycle and the stagger
 * quietly did a third of its job.
 */
export function dormantSecondsFor(kind: HazardKind): number {
  return CYCLES[kind]?.dormantS ?? 0;
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
  const entities = affected(world);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    if (Owner.faction[eid] !== faction) continue;
    if (Health.hp[eid]! <= 0) continue;
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
export function hazardsSystem(world: SimWorld, destroyed: number[]): void {
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
        // The "energy boost" half of doc §1 is paid in Thermal Draw capacity
        // by the thermal system, which is what "energy" means now that the
        // power resource exists. This system owns only the *stabilising*.
      }
    }

    // Kelp does not advance through phases; it grips or it does not. Doc §4:
    // a blast tears the canopy open and a Bathyarch hull holds it open with
    // thermal cutters, so suppression is refreshed while they stand in it and
    // lapses shortly after they leave. Burning a path is a commitment to stay.
    if (hazard.kind === 'kelp-entanglement') {
      const cutters = anyFactionWithin(world, hazard, Faction.Bathyarch, hazard.radiusM);
      hazard.burnedS = cutters
        ? Math.min(HAZARDS.KELP.BATHYARCH_BURN_S, hazard.burnedS + dt)
        : Math.max(0, hazard.burnedS - dt);
      hazard.suppressedS = Math.max(0, hazard.suppressedS - dt);
      const open = hazard.burnedS >= HAZARDS.KELP.BATHYARCH_BURN_S || hazard.suppressedS > 0;
      hazard.phase = open ? HazardPhase.Dormant : HazardPhase.Active;
      continue;
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

    applyEffects(world, hazard, dt, destroyed);
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
 * Rewrite the terrain's PF array from everything currently modifying it —
 * storms *and* Tetherjelly fields, gathered together because
 * `applyPropagationModifiers` replaces the whole set, and two writers each
 * replacing it with only their own half would silently erase each other.
 *
 * Two sources on two cadences, one rebuild: storm modifiers change on phase
 * boundaries (a few times a minute), jelly modifiers only when a cluster dies
 * (docs/bestiary.md §4 — they never return, so the set only ever shrinks).
 * Exported for the death path: `Match.reap` calls this when a jelly dies, so
 * a burned lane's PF rises on the tick the cluster comes apart rather than at
 * the next storm boundary. Recomputing from the biome rather than inverting
 * keeps every combination exact, however storms and fields overlap.
 */
export function rebuildPropagation(world: SimWorld): void {
  const mods: PropagationModifier[] = [];
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
  // Living terrain: each surviving cluster subtracts its delta (§4's additive
  // −0.10 — see PropagationModifier for why it is not a scale factor).
  for (let eid = 0; eid <= world.maxEid; eid++) {
    if (!hasComponent(world, Fauna, eid)) continue;
    if (Fauna.species[eid] !== FaunaSpecies.Tetherjelly) continue;
    if (Health.hp[eid]! <= 0) continue;
    mods.push({
      x: Position.x[eid]!,
      y: Position.y[eid]!,
      radiusM: DRIFT.JELLY_RADIUS_M,
      delta: -DRIFT.JELLY_PF_DELTA,
    });
  }
  // A third source on a third cadence: a Standing Wave corridor closes when
  // its second node completes and falls when either node does, and
  // `standingWaveSystem` reports both so `Match` rebuilds on that tick. Listed
  // last, and it would not matter if it were first — a corridor's figure is
  // a `set`, and `propagationAtCell` composes a set after everything else.
  mods.push(...corridorModifiers(world));
  world.terrain.applyPropagationModifiers(mods);
}

/** Half-way back toward transparent, for the decay phase. */
function stormTaper(): number {
  return (HAZARDS.STORM.PF_MULTIPLIER + 1) / 2;
}

function applyEffects(world: SimWorld, hazard: Hazard, dt: number, destroyed: number[]): void {
  if (hazard.phase !== HazardPhase.Active && hazard.phase !== HazardPhase.Decay) return;
  // Decay does half damage: subsiding, not stopped.
  const taper = hazard.phase === HazardPhase.Active ? 1 : 0.5;

  if (hazard.kind === 'kelp-entanglement') return; // drag is read, never applied
  if (hazard.kind === 'geothermal-eruption') applyEruption(world, hazard, dt * taper, destroyed);
  else if (hazard.kind === 'resonance-storm') applyStorm(world, hazard, dt * taper, destroyed);
  else if (hazard.kind === 'cold-shock') applyCurrent(world, hazard, dt * taper);
}

/** Reused across hulls and ticks, like movement's — the drift allocates nothing. */
const drift = { x: 0, y: 0 };

/**
 * Cold shock currents — docs/hazards.md §8.
 *
 * The first *sustained* force in the game, and the first directional one. An
 * eruption shoves you away from a point for four seconds; a current carries you
 * one way for forty, which is what makes it something a player routes around
 * rather than only flees.
 *
 * Displacement, never momentum. Hulls in this simulation steer at their target
 * every tick and carry no inertia, so a pushed hull re-aims next tick and crabs
 * across the flow instead of being knocked off it — which is exactly "can push
 * units off course" (doc §8) and costs the simulation no energy it would then
 * have to take back out (see separation.ts on why that matters).
 *
 * Unlike eruption knockback this goes through `resolveStep`, so the water does
 * not push a hull into ground it does not fit in. Knockback predates ground and
 * still only clamps to the map; worth aligning, but that is a change to the
 * eruption's behaviour and not this one's.
 */
function applyCurrent(world: SimWorld, hazard: Hazard, dt: number): void {
  const flowX = Math.cos(hazard.flowRad);
  const flowY = Math.sin(hazard.flowRad);
  const push = HAZARDS.COLD_SHOCK.DRIFT_MPS * dt;
  const terrain = world.terrain;
  const entities = affected(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    if (Health.hp[eid]! <= 0) continue;
    // Anchored, exactly as they are against knockback.
    if (hasComponent(world, Structure, eid)) continue;
    // "Hadron unaffected (mag-propulsion)" — doc §8. The one hazard a faction
    // simply ignores: no drift here, and no speed or SIG cost below.
    if (Owner.faction[eid] === Faction.Hadron) continue;
    // "Abyssal creatures freeze briefly" — doc §8. Frozen means still, so the
    // water does not carry them either; faunaSystem holds them in place for
    // the same reason and reads the same helper.
    if (hasComponent(world, Fauna, eid)) continue;

    const x = Position.x[eid]!;
    const y = Position.y[eid]!;
    const dx = x - hazard.x;
    const dy = y - hazard.y;
    if (dx * dx + dy * dy > hazard.radiusM * hazard.radiusM) continue;

    terrain.resolveStep(x, y, x + flowX * push, y + flowY * push, Position.depth[eid]!, drift);
    Position.x[eid] = drift.x;
    Position.y[eid] = drift.y;
  }
}

/**
 * What a kelp field costs a hull: speed always, SIG only if it is moving.
 *
 * Returned rather than written, like `stormModifiers` and `currentModifiers`,
 * because SIG is rebuilt from scratch by the acoustics pass every tick.
 *
 * Doc §4's trade, and the reason kelp is a decision rather than mud: the biome
 * already masks at PF 0.55, so the field's only cost is *movement*. A hull that
 * stops is silent and hidden; a hull pushing through pays in proportion to how
 * hard the kelp is dragging on it, which makes the loudest thing in the
 * quietest biome a Cruiser in a hurry. Pelagia pay nothing at all, because
 * nothing drags on them — "moves freely" is both halves.
 *
 * Reads `Velocity` and `Unit`, so it may only be called for hulls.
 */
export function kelpModifiers(world: SimWorld, eid: number): { speed: number; sig: number } {
  const none = { speed: 1, sig: 0 };
  if (world.hazards.length === 0) return none;

  const x = Position.x[eid]!;
  const y = Position.y[eid]!;
  let gripping = false;
  for (const hazard of world.hazards) {
    if (hazard.kind !== 'kelp-entanglement') continue;
    if (hazard.phase !== HazardPhase.Active) continue;
    const dx = x - hazard.x;
    const dy = y - hazard.y;
    if (dx * dx + dy * dy <= hazard.radiusM * hazard.radiusM) {
      gripping = true;
      break;
    }
  }
  if (!gripping) return none;

  const faction = Owner.faction[eid];
  let speed: number;
  if (faction === Faction.Pelagia) speed = HAZARDS.KELP.PELAGIA_SPEED_MULTIPLIER;
  else if (faction === Faction.Hadron) speed = HAZARDS.KELP.HADRON_SPEED_MULTIPLIER;
  else if (faction === Faction.Directorate) speed = HAZARDS.KELP.DIRECTORATE_SPEED_MULTIPLIER;
  else speed = HAZARDS.KELP.BATHYARCH_SPEED_MULTIPLIER;

  // Large hulls shoulder through rather than slip past, whoever owns them —
  // but never worse than the faction already manages, so "moves freely" and
  // "tears through" are not quietly undone by building a Cruiser.
  const hull = statsFor(Unit.kind[eid] as UnitKind).hullLengthM;
  if (hull >= HAZARDS.KELP.LARGE_HULL_M && faction !== Faction.Pelagia) {
    speed = Math.min(speed, HAZARDS.KELP.LARGE_SPEED_MULTIPLIER);
  }

  // Thermal cutters run whether the hull is moving or not — unlike drag,
  // cutting is work you are doing on purpose, and it is what stops burning
  // being a free counter to the map (doc §4).
  const cutting = Owner.faction[eid] === Faction.Bathyarch ? HAZARDS.KELP.CUTTER_SIG : 0;

  const vx = Velocity.x[eid]!;
  const vy = Velocity.y[eid]!;
  // Stopped is silent: a hull that is not pushing is not working.
  if (vx === 0 && vy === 0) return { speed, sig: cutting };
  return { speed, sig: cutting + HAZARDS.KELP.DRAG_SIG * (1 - speed) };
}

/**
 * Tear the canopy open — doc §4's "explosions clear kelp temporarily".
 *
 * Called by the ordnance pass from inside a blast, which is the only place in
 * the simulation that knows a detonation happened somewhere. A field is
 * suppressed if the blast went off anywhere inside it; the canopy does not
 * open in proportion to how close the charge was, because a hole in kelp is a
 * hole.
 */
export function suppressKelpAt(world: SimWorld, x: number, y: number): void {
  for (const hazard of world.hazards) {
    if (hazard.kind !== 'kelp-entanglement') continue;
    const dx = x - hazard.x;
    const dy = y - hazard.y;
    if (dx * dx + dy * dy > hazard.radiusM * hazard.radiusM) continue;
    hazard.suppressedS = Math.max(hazard.suppressedS, HAZARDS.KELP.BLAST_CLEAR_S);
  }
}

/**
 * The current acting at a point, or undefined. Active phases only.
 *
 * Decay deliberately does not count here: a subsiding current still drifts (the
 * taper in `applyEffects` halves it) but stops freezing fauna and stops costing
 * speed and noise. Otherwise the tail of every current would be a second,
 * quieter hazard with no telegraph of its own.
 */
export function activeCurrentAt(world: SimWorld, x: number, y: number): Hazard | undefined {
  for (const hazard of world.hazards) {
    if (hazard.kind !== 'cold-shock') continue;
    if (hazard.phase !== HazardPhase.Active) continue;
    const dx = x - hazard.x;
    const dy = y - hazard.y;
    if (dx * dx + dy * dy <= hazard.radiusM * hazard.radiusM) return hazard;
  }
  return undefined;
}

/**
 * What a current costs a hull: speed always, SIG only if it fights.
 *
 * Returned rather than written, like `stormModifiers` and for the same reason —
 * SIG is recomputed from scratch every tick by the acoustics pass, so a hazard
 * writing it directly would be overwritten inside the same step.
 *
 * The SIG term is doc §8's sound argument: a hull driving into moving water is
 * loading its engines against it, and work is noise. It scales with how
 * *directly* the hull opposes the flow — nothing when riding it, all of it
 * head-on — so drifting is free and silent, and crossing announces itself in
 * proportion to how hard you insist on your own line.
 *
 * Reads `Velocity`, so it may only be called for entities that carry it. The
 * acoustics pass runs after movement, so the heading it sees is this tick's.
 */
export function currentModifiers(world: SimWorld, eid: number): { speed: number; sig: number } {
  const none = { speed: 1, sig: 0 };
  if (world.hazards.length === 0) return none;
  if (Owner.faction[eid] === Faction.Hadron) return none;

  const hazard = activeCurrentAt(world, Position.x[eid]!, Position.y[eid]!);
  if (hazard === undefined) return none;

  // "Pelagia slows dramatically" — doc §8. The faction that already trades
  // speed for quiet pays twice in cold water.
  const speed =
    Owner.faction[eid] === Faction.Pelagia
      ? HAZARDS.COLD_SHOCK.PELAGIA_SPEED_MULTIPLIER
      : HAZARDS.COLD_SHOCK.SPEED_MULTIPLIER;

  const vx = Velocity.x[eid]!;
  const vy = Velocity.y[eid]!;
  const speedSq = vx * vx + vy * vy;
  // Under no orders and going nowhere: carried, not working, and silent.
  if (speedSq === 0) return { speed, sig: 0 };

  const inverse = 1 / Math.sqrt(speedSq);
  // -1 straight into the flow, +1 with it.
  const alignment =
    vx * inverse * Math.cos(hazard.flowRad) + vy * inverse * Math.sin(hazard.flowRad);
  const opposition = (1 - alignment) / 2;
  return { speed, sig: HAZARDS.COLD_SHOCK.FIGHTING_SIG * opposition };
}

function applyEruption(world: SimWorld, hazard: Hazard, dt: number, destroyed: number[]): void {
  const entities = affected(world);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    if (Health.hp[eid]! <= 0) continue;
    const dx = Position.x[eid]! - hazard.x;
    const dy = Position.y[eid]! - hazard.y;
    const distance = Math.hypot(dx, dy);
    if (distance > hazard.radiusM) continue;

    // Falls off to the rim, so the edge of a plume is survivable and the
    // middle is not — which is what makes the warning worth acting on.
    const falloff = 1 - distance / hazard.radiusM;
    let damage = HAZARDS.ERUPTION.DAMAGE_PER_S * falloff * dt;

    // hasComponent, not an undefined check: `Structure.kind` is a typed array
    // and indexing one never yields undefined, so the original test was always
    // false — buildings took full hull damage *and* were knocked back.
    const isStructure = hasComponent(world, Structure, eid);
    if (isStructure) damage *= HAZARDS.ERUPTION.STRUCTURE_DAMAGE_MULTIPLIER;
    if (Owner.faction[eid] === Faction.Pelagia) {
      damage *= HAZARDS.ERUPTION.PELAGIA_DAMAGE_MULTIPLIER;
    }
    Health.hp[eid] = Health.hp[eid]! - damage;
    if (Health.hp[eid]! <= 0) {
      destroyed.push(eid);
      // Nobody rendered this — see SimWorld.environmentalDeaths.
      world.environmentalDeaths.add(eid);
    }

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
    // Clamped at the write. Knockback is the one system that moves a hull
    // along an axis nobody chose, it runs after separation, and a vent near
    // the map edge threw hulls clean off the map — still simulated, still
    // audible, and out of reach of any order the player could give.
    const terrain = world.terrain;
    Position.x[eid] = terrain.clampXM(Position.x[eid]! + (dx / distance) * push);
    Position.y[eid] = terrain.clampYM(Position.y[eid]! + (dy / distance) * push);
  }
}

function applyStorm(world: SimWorld, hazard: Hazard, dt: number, destroyed: number[]): void {
  const entities = affected(world);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    if (Health.hp[eid]! <= 0) continue;
    const dx = Position.x[eid]! - hazard.x;
    const dy = Position.y[eid]! - hazard.y;
    if (dx * dx + dy * dy > hazard.radiusM * hazard.radiusM) continue;

    const isStructure = hasComponent(world, Structure, eid);
    let damage = HAZARDS.STORM.DAMAGE_PER_S * dt;
    if (isStructure) damage *= HAZARDS.STORM.STRUCTURE_DAMAGE_MULTIPLIER;
    Health.hp[eid] = Health.hp[eid]! - damage;
    if (Health.hp[eid]! <= 0) {
      destroyed.push(eid);
      world.environmentalDeaths.add(eid);
    }
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
    // A permanent hazard has no phase clock — its duration is Infinity, and
    // shipping that would reach the client as null. What it does have is a
    // suppression countdown, which is the only number about it worth showing:
    // how long until the kelp closes again.
    const permanent = isPermanent(hazard.kind);
    const duration = permanent ? 0 : phaseDuration(world, hazard);
    out.push({
      id: hazard.id,
      kind: hazard.kind,
      x: hazard.x,
      y: hazard.y,
      radiusM: hazard.radiusM,
      phase: hazard.phase,
      progress: permanent ? 0 : duration === 0 ? 1 : Math.min(1, hazard.elapsedS / duration),
      remainingS: permanent ? hazard.suppressedS : Math.max(0, duration - hazard.elapsedS),
      ...(hazard.kind === 'cold-shock' ? { flowRad: hazard.flowRad } : {}),
    });
  }
  return out;
}
