/**
 * Ordnance — the physical weapons, docs/systems-combat.md §5.
 *
 * A torpedo here is not an attack that resolves; it is an **entity that swims**.
 * It has a position, a heading, a hull that can be shot off, and — the design
 * decision the whole class rests on — a SIG of its own, resolved through the
 * Echo Layer exactly as a hull is. The defender hears a fast contact closing
 * before it arrives, which is what makes §1's short time-to-kill survivable:
 * nothing lethal in this game is inaudible, only patient.
 *
 * The seeker is the second half of that idea, pointed the other way. It is a
 * *listener*, running the same propagation model as every other listener in the
 * simulation, so:
 *
 *   - loud hulls are torpedo bait, because everything that makes you strong
 *     makes you loud and now loud also means targeted;
 *   - a Silent Running hull at SIG 3-8 starves the seeker, so the counter to
 *     the alpha-strike weapon is the mode that disables your own weapons;
 *   - terrain is ballistics — a trench (PF 1.6) carries a target's noise down
 *     its axis into the cone, and a masking biome hides what sits in it.
 *
 * None of those are special cases. They fall out of pricing the seeker with
 * `perceivedLoudness` and `terrain.pathPropagation`, which is the same pair the
 * Echo pass and the residue read already use.
 */

import { defineQuery, hasComponent } from 'bitecs';
import {
  EchoMarkKind,
  ORDNANCE,
  OrdnanceKind,
  SelfEventKind,
  detectionThreshold,
  StructureKind,
  ordnanceStatsFor,
  perceivedLoudness,
  requiredPressureRating,
  unitRadiusM,
  withinSeekerCone,
  type UnitKind,
} from '@echoes/shared';
import {
  Acoustic,
  Health,
  Magazine,
  Ordnance,
  Owner,
  Position,
  Pressure,
  Structure,
  Unit,
} from '../components.ts';
import { applyFiringSpike } from './acoustics.ts';
import { raiseSelfEvent, spawnOrdnance, type SimWorld } from '../world.ts';

const ordnanceEntities = defineQuery([Ordnance, Position, Owner, Health]);
/** Everything a seeker could conceivably home on: anything that makes noise. */
const audible = defineQuery([Position, Acoustic, Owner, Health]);
const magazines = defineQuery([Magazine, Position, Owner]);
const depots = defineQuery([Structure, Position, Owner]);

/**
 * How close a torpedo must come to detonate on a target.
 *
 * The target's own hull radius plus a fuse margin, so a Cruiser is a bigger
 * thing to hit than a Light Scout — the same `hullLengthM` the renderer draws
 * and separation spaces hulls by. A fixed radius would make the roster's
 * largest hull no easier to hit than its smallest, which is neither intuitive
 * nor fair to the hull that paid for the tonnage.
 */
function fuseRadiusM(world: SimWorld, target: number): number {
  const hull = hasComponent(world, Unit, target)
    ? unitRadiusM(Unit.kind[target] as UnitKind)
    : ordnanceStatsFor(Ordnance.kind[target] as OrdnanceKind).radiusM;
  return hull + ORDNANCE.TORPEDO.FUSE_MARGIN_M;
}

/**
 * Re-acquire: the loudest emitter the seeker can resolve inside its cone.
 *
 * "Loudest" is perceived loudness at the torpedo — after propagation, after
 * terrain — and not raw SIG, so a quiet hull close by can outrank a loud one
 * behind a kelp bed. That is the same comparison a listener makes, which is the
 * point: the seeker is not a targeting system with an acoustic theme, it is an
 * acoustic system that happens to steer.
 *
 * Returns 0 when nothing clears the seeker's own threshold.
 */
function acquire(world: SimWorld, eid: number): number {
  const x = Position.x[eid]!;
  const y = Position.y[eid]!;
  const heading = Ordnance.heading[eid]!;
  const slot = Owner.slot[eid]!;
  const hyd = Ordnance.seekerHyd[eid]!;
  if (hyd <= 0) return 0;
  const threshold = detectionThreshold(hyd);

  const candidates = audible(world);
  let best = 0;
  let bestLoudness = threshold;

  for (let i = 0; i < candidates.length; i++) {
    const other = candidates[i]!;
    if (other === eid) continue;
    // Friendly fire is not a seeker's job to arrange.
    if (Owner.slot[other] === slot) continue;
    if (Health.hp[other]! <= 0) continue;
    // A torpedo will not chase another torpedo or squat on a minefield: those
    // are the enemy's ordnance, not the enemy. A *noisemaker* is deliberately
    // not excluded — a decoy that seekers ignored would not be a decoy
    // (docs/systems-combat.md §5).
    if (hasComponent(world, Ordnance, other)) {
      if (Ordnance.kind[other] !== OrdnanceKind.Noisemaker) continue;
    }

    const sig = Acoustic.sig[other]!;
    if (sig <= 0) continue;

    const dx = Position.x[other]! - x;
    const dy = Position.y[other]! - y;
    if (!withinSeekerCone(heading, Math.atan2(dy, dx))) continue;

    const distance = Math.hypot(dx, dy);
    // Price the cheap part first: propagation without the path walk is an
    // upper bound on nothing, but the walk is the expensive half and a
    // candidate that cannot clear the bar in open water rarely clears it
    // through real terrain either. The exact figure below decides.
    const pf = world.terrain.pathPropagation(Position.x[other]!, Position.y[other]!, x, y);
    const loudness = perceivedLoudness(sig * (Acoustic.pfFactor[other]! || 1), pf, distance);
    if (loudness <= bestLoudness) continue;
    bestLoudness = loudness;
    best = other;
  }

  return best;
}

/** Turn toward a bearing, no faster than the airframe allows. */
function steer(eid: number, targetBearing: number, dt: number): void {
  const maxTurn = ((ORDNANCE.TORPEDO.TURN_RATE_DEG_S * Math.PI) / 180) * dt;
  let delta = targetBearing - Ordnance.heading[eid]!;
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  const step = Math.max(-maxTurn, Math.min(maxTurn, delta));
  Ordnance.heading[eid] = Ordnance.heading[eid]! + step;
}

/**
 * Detonate on a target: damage, residue, and the torpedo is spent.
 *
 * Residue goes down at the *target*, matching combat.ts and the rule in
 * docs/systems-echo.md §7 — a scout should find where the fighting was, and
 * the losing side is the one that stayed still.
 */
function detonate(world: SimWorld, eid: number, target: number, destroyed: number[]): void {
  const damage = ordnanceStatsFor(Ordnance.kind[eid] as OrdnanceKind).damage;
  const tx = Position.x[target]!;
  const ty = Position.y[target]!;

  world.marks.add(EchoMarkKind.Battle, tx, ty, 1);
  Health.hp[target] = Health.hp[target]! - damage;
  if (Health.hp[target]! <= 0 && !destroyed.includes(target)) destroyed.push(target);

  Health.hp[eid] = 0;
  if (!destroyed.includes(eid)) destroyed.push(eid);
}

/** Spend the torpedo without a bang: it ran out of run, or it imploded. */
function expire(eid: number, destroyed: number[]): void {
  Health.hp[eid] = 0;
  if (!destroyed.includes(eid)) destroyed.push(eid);
}

/**
 * Torpedoes taken back aboard at a depot.
 *
 * Only at a Bastion or a Foundry, and only while the hull is parked inside
 * `REARM_RANGE_M` of one: a magazine that refilled in the field would undo the
 * scarcity the whole class is built on (docs/systems-combat.md §5). Running the
 * clock only while in range also means a hull that leaves mid-reload has spent
 * nothing — it simply has not finished.
 */
function rearmSystem(world: SimWorld): void {
  const dt = world.dt;
  const carriers = magazines(world);
  if (carriers.length === 0) return;
  const bases = depots(world);

  for (let i = 0; i < carriers.length; i++) {
    const eid = carriers[i]!;
    if (Magazine.torpedoes[eid]! >= ORDNANCE.TORPEDO.MAGAZINE) {
      Magazine.rearmRemainingS[eid] = 0;
      continue;
    }

    const x = Position.x[eid]!;
    const y = Position.y[eid]!;
    const slot = Owner.slot[eid]!;
    let atDepot = false;
    for (let j = 0; j < bases.length; j++) {
      const depot = bases[j]!;
      if (Owner.slot[depot] !== slot) continue;
      if (!isRearmDepot(Structure.kind[depot]!)) continue;
      const d = Math.hypot(Position.x[depot]! - x, Position.y[depot]! - y);
      if (d <= ORDNANCE.TORPEDO.REARM_RANGE_M) {
        atDepot = true;
        break;
      }
    }
    if (!atDepot) continue;

    if (Magazine.rearmRemainingS[eid]! <= 0) {
      Magazine.rearmRemainingS[eid] = ORDNANCE.TORPEDO.REARM_TIME_S;
    }
    Magazine.rearmRemainingS[eid] = Magazine.rearmRemainingS[eid]! - dt;
    if (Magazine.rearmRemainingS[eid]! <= 0) {
      Magazine.torpedoes[eid] = Magazine.torpedoes[eid]! + 1;
      Magazine.rearmRemainingS[eid] = 0;
    }
  }
}

/** The two structures §5 names as able to put torpedoes back in a hull. */
function isRearmDepot(kind: number): boolean {
  return kind === StructureKind.Bastion || kind === StructureKind.Foundry;
}

export function ordnanceSystem(world: SimWorld, destroyed: number[]): void {
  const dt = world.dt;
  rearmSystem(world);

  const entities = ordnanceEntities(world);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    if (Health.hp[eid]! <= 0) continue;
    // Only torpedoes run. Mines, decoys and depth charges are ordnance too and
    // get their own systems; this loop would steer them into the seabed.
    if (Ordnance.kind[eid] !== OrdnanceKind.Torpedo) continue;

    // Ordnance is not in the acoustics query — it carries no Unit or Structure
    // component, which is exactly what keeps it out of every hull system — so
    // its live SIG is maintained here. Constant, and deliberately: a running
    // torpedo does not have a quiet mode. The veil factor still applies,
    // because a Spore Veil is symmetric about everything inside it.
    Acoustic.sig[eid] =
      ordnanceStatsFor(OrdnanceKind.Torpedo).sig * (Acoustic.sigFactor[eid]! || 1);

    Ordnance.remainingS[eid] = Ordnance.remainingS[eid]! - dt;
    if (Ordnance.remainingS[eid]! <= 0) {
      // Out of run. It goes inert rather than detonating: a torpedo that
      // exploded wherever it ran dry would be an area weapon nobody aimed.
      expire(eid, destroyed);
      continue;
    }

    // --- Seeker ----------------------------------------------------------
    Ordnance.seekerCooldownS[eid] = Ordnance.seekerCooldownS[eid]! - dt;
    if (Ordnance.seekerCooldownS[eid]! <= 0) {
      Ordnance.seekerCooldownS[eid] = ORDNANCE.TORPEDO.SEEKER_INTERVAL_S;
      // Re-acquired every pass rather than locked once, which is what makes a
      // noisemaker work at all: the loudest thing *now* wins, and a decoy is
      // louder than the hull it is protecting.
      Ordnance.targetEid[eid] = acquire(world, eid);
    }

    let target = Ordnance.targetEid[eid]!;
    if (target !== 0 && (!hasComponent(world, Health, target) || Health.hp[target]! <= 0)) {
      Ordnance.targetEid[eid] = 0;
      target = 0;
    }

    // --- Steering --------------------------------------------------------
    const x = Position.x[eid]!;
    const y = Position.y[eid]!;
    if (target !== 0) {
      steer(eid, Math.atan2(Position.y[target]! - y, Position.x[target]! - x), dt);
    } else {
      // Nothing heard: run at where the launch believed the target was. For a
      // Tier-2 bearing-only shot that is the ghost, and the ghost lies — the
      // torpedo swims at the lie and the seeker gets the run to find the truth
      // (docs/systems-combat.md §7).
      const dx = Ordnance.aimX[eid]! - x;
      const dy = Ordnance.aimY[eid]! - y;
      if (Math.hypot(dx, dy) > 1) steer(eid, Math.atan2(dy, dx), dt);
    }

    const heading = Ordnance.heading[eid]!;
    const step = ORDNANCE.TORPEDO.SPEED_MPS * dt;
    Position.x[eid] = world.terrain.clampXM(x + Math.cos(heading) * step);
    Position.y[eid] = world.terrain.clampYM(y + Math.sin(heading) * step);

    // --- Depth, and the pressure it costs --------------------------------
    if (target !== 0) {
      // A torpedo follows its target down, which is what makes §8's envelope
      // bite: chase a Directorate hull into the Abyssal band and the ordnance
      // reaches its own crush depth before the hull reaches its.
      const wanted = Position.depth[target]!;
      const delta = wanted - Position.depth[eid]!;
      const move = Math.min(Math.abs(delta), ORDNANCE.TORPEDO.DEPTH_RATE_MPS * dt);
      Position.depth[eid] = Position.depth[eid]! + Math.sign(delta) * move;
    }
    if (requiredPressureRating(Position.depth[eid]!) > Ordnance.pressureRating[eid]!) {
      // Imploded. Silent, and it leaves nothing: the hull it was chasing never
      // learns how close it came.
      expire(eid, destroyed);
      continue;
    }

    // --- Wake ------------------------------------------------------------
    Ordnance.wakeCooldownS[eid] = Ordnance.wakeCooldownS[eid]! - dt;
    if (Ordnance.wakeCooldownS[eid]! <= 0) {
      Ordnance.wakeCooldownS[eid] = ORDNANCE.TORPEDO.WAKE_MARK_INTERVAL_S;
      world.marks.add(
        EchoMarkKind.TorpedoWake,
        Position.x[eid]!,
        Position.y[eid]!,
        ORDNANCE.TORPEDO.WAKE_MARK_INTENSITY
      );
    }

    // --- Fuse ------------------------------------------------------------
    // Checked against the acquired target first, then against anything else it
    // happens to run into: a torpedo that passed through the hull in front of
    // it to reach the one it was listening to would be absurd.
    const fuseTarget = nearestFuseHit(world, eid);
    if (fuseTarget !== 0) detonate(world, eid, fuseTarget, destroyed);
  }
}

/**
 * The enemy hull this torpedo is close enough to detonate on, or 0.
 *
 * **Three-dimensional, unlike everything acoustic in this simulation.** The
 * Echo Layer resolves on horizontal distance alone — depth is a commitment
 * timer, not a term in the propagation model — and the seeker above follows
 * that rule exactly, because a seeker is a listener and must hear what a
 * listener would hear.
 *
 * A fuse is not a listener. It is physical contact, and the depth axis is
 * where docs/systems-combat.md §8 lives: if the fuse ignored depth, a torpedo
 * running at 900 m would detonate on a Directorate hull sitting 1,500 m below
 * it, the ordnance would never have to descend, and the whole depth envelope —
 * the thing that makes the Abyssal band feel different to fight in — would
 * apply to nothing. It also means a shallow torpedo genuinely cannot reach a
 * deep hull, which is §8's sentence, mechanised.
 *
 * Ordnance is skipped: a torpedo does not detonate on a mine, on another
 * torpedo, or on the decoy it was chasing — a noisemaker that could be
 * *destroyed* by the torpedo it pulled would be a countermeasure that stops
 * working the instant it works.
 */
function nearestFuseHit(world: SimWorld, eid: number): number {
  const x = Position.x[eid]!;
  const y = Position.y[eid]!;
  const depth = Position.depth[eid]!;
  const slot = Owner.slot[eid]!;
  const candidates = audible(world);

  let best = 0;
  let bestD2 = Infinity;
  for (let i = 0; i < candidates.length; i++) {
    const other = candidates[i]!;
    if (other === eid) continue;
    if (Owner.slot[other] === slot) continue;
    if (Health.hp[other]! <= 0) continue;
    if (hasComponent(world, Ordnance, other)) continue;

    const radius = fuseRadiusM(world, other);
    const d2 =
      (Position.x[other]! - x) ** 2 +
      (Position.y[other]! - y) ** 2 +
      (Position.depth[other]! - depth) ** 2;
    if (d2 > radius * radius || d2 >= bestD2) continue;
    bestD2 = d2;
    best = other;
  }
  return best;
}

/**
 * Launch a torpedo. Returns the ordnance entity, or 0 when the shot is refused.
 *
 * Refusals are all server-side facts: an empty magazine, a hull that carries no
 * tubes. The *information* gate — that a player may not launch at something
 * they have not resolved to at least Tier 2 — lives in `Match`, because only
 * the Echo Layer knows what a slot has heard.
 */
export function launchTorpedo(
  world: SimWorld,
  launcher: number,
  aimX: number,
  aimY: number
): number {
  if (!hasComponent(world, Magazine, launcher)) return 0;
  if (Magazine.torpedoes[launcher]! <= 0) return 0;

  Magazine.torpedoes[launcher] = Magazine.torpedoes[launcher]! - 1;
  // A part-finished reload is lost when the tube fires, not carried over.
  Magazine.rearmRemainingS[launcher] = 0;

  const x = Position.x[launcher]!;
  const y = Position.y[launcher]!;
  const heading = Math.atan2(aimY - y, aimX - x);

  // Clear of the tube: released on top of the launcher, the fuse check could
  // find a hull pressed against it on the first tick and detonate at home.
  const clearance = unitRadiusM(Unit.kind[launcher] as UnitKind) + 20;

  const eid = spawnOrdnance(world, {
    kind: OrdnanceKind.Torpedo,
    slot: Owner.slot[launcher]!,
    faction: Owner.faction[launcher]!,
    x: x + Math.cos(heading) * clearance,
    y: y + Math.sin(heading) * clearance,
    depth: Position.depth[launcher]!,
    heading,
    aimX,
    aimY,
    seekerHyd: ORDNANCE.TORPEDO.SEEKER_HYD,
    // Inherited, per §8: the ordnance is only rated for the water its launcher
    // was rated for, so a shallow hull cannot reach into the deep by proxy.
    pressureRating: Pressure.rating[launcher]!,
  });

  // Launching is loud, and launching out of Silent Running is the loudest
  // moment an ambush has (docs/systems-combat.md §3).
  if (applyFiringSpike(launcher, ORDNANCE.TORPEDO.LAUNCH_SIG)) {
    raiseSelfEvent(world, { kind: SelfEventKind.BreakSilence, eid: launcher });
  }
  return eid;
}
