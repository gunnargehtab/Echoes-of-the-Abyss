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

import { addComponent, defineQuery, hasComponent } from 'bitecs';
import {
  DEPTH,
  EchoMarkKind,
  Faction,
  seekerHydFor,
  MINE_TRIGGER_LOUDNESS,
  ORDNANCE,
  OrdnanceKind,
  SelfEventKind,
  detectionThreshold,
  StructureKind,
  ordnanceStatsFor,
  structureStatsFor,
  ORDNANCE_STATS,
  STRUCTURE_STATS,
  UNIT_STATS,
  perceivedLoudness,
  requiredPressureRating,
  unitRadiusM,
  withinSeekerCone,
  UnitKind,
} from '@echoes/shared';
import {
  Acoustic,
  Countermeasure,
  Health,
  Laying,
  Magazine,
  Ordnance,
  Owner,
  Position,
  Pressure,
  SilentRunning,
  Structure,
  Unit,
  Velocity,
} from '../components.ts';
import { applyFiringSpike } from './acoustics.ts';
import { raiseSelfEvent, spawnOrdnance, type SimWorld } from '../world.ts';

const ordnanceEntities = defineQuery([Ordnance, Position, Owner, Health]);
/** Everything a seeker could conceivably home on: anything that makes noise. */
const audible = defineQuery([Position, Acoustic, Owner, Health]);
const magazines = defineQuery([Magazine, Position, Owner]);
const depots = defineQuery([Structure, Position, Owner]);
const suites = defineQuery([Countermeasure]);
const laying = defineQuery([Laying]);

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
  if (hasComponent(world, Unit, target)) {
    return unitRadiusM(Unit.kind[target] as UnitKind) + ORDNANCE.TORPEDO.FUSE_MARGIN_M;
  }
  if (hasComponent(world, Structure, target)) {
    // A Foundry is 160 m across. The first version of this function had no
    // structure branch and fell through to reading `Ordnance.kind` on an
    // entity that has no Ordnance component — a typed-array slot holding
    // whatever was last there — so a torpedo flew 63 m *inside* a building's
    // footprint before its fuse noticed. Measured.
    return (
      structureStatsFor(Structure.kind[target] as StructureKind).radiusM +
      ORDNANCE.TORPEDO.FUSE_MARGIN_M
    );
  }
  if (hasComponent(world, Ordnance, target)) {
    return (
      ordnanceStatsFor(Ordnance.kind[target] as OrdnanceKind).radiusM +
      ORDNANCE.TORPEDO.FUSE_MARGIN_M
    );
  }
  // Fauna and anything else that emits: no hull length to read, so the fuse
  // gets its margin alone rather than a number read off the wrong component.
  return ORDNANCE.TORPEDO.FUSE_MARGIN_M;
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

/** Decoy suites recharging. Unlike rearming, this needs no depot. */
function countermeasureCooldowns(world: SimWorld): void {
  const hulls = suites(world);
  for (let i = 0; i < hulls.length; i++) {
    const eid = hulls[i]!;
    if (Countermeasure.cooldownRemainingS[eid]! <= 0) continue;
    Countermeasure.cooldownRemainingS[eid] = Math.max(
      0,
      Countermeasure.cooldownRemainingS[eid]! - world.dt
    );
  }
}

/**
 * Drop a noisemaker. Returns the decoy entity, or 0 when the suite is cold.
 *
 * Released *behind* the hull, on the reciprocal of its heading, because that is
 * the geometry that saves it: a seeker re-acquiring onto a decoy dropped ahead
 * would still be flying at the hull. Behind means the torpedo turns away.
 *
 * The cost is not the cooldown. A noisemaker is SIG 70 at the hull's real
 * position — louder than every cruise signature in the roster — so every
 * listener on the map hears the moment a formation panicked, and where it was
 * standing when it did (docs/systems-combat.md §5, §13).
 */
export function deployNoisemaker(world: SimWorld, hull: number): number {
  if (!hasComponent(world, Countermeasure, hull)) return 0;
  if (Countermeasure.cooldownRemainingS[hull]! > 0) return 0;
  Countermeasure.cooldownRemainingS[hull] = ORDNANCE.NOISEMAKER.COOLDOWN_S;

  // Behind means behind whatever it was doing: its heading of travel, or — for
  // a hull sitting still — the reciprocal of nothing, which is as good a
  // direction as any and at least deterministic.
  const vx = Velocity.x[hull] ?? 0;
  const vy = Velocity.y[hull] ?? 0;
  const heading = vx === 0 && vy === 0 ? 0 : Math.atan2(vy, vx);
  const behind = heading + Math.PI;

  return spawnOrdnance(world, {
    kind: OrdnanceKind.Noisemaker,
    slot: Owner.slot[hull]!,
    faction: Owner.faction[hull]!,
    x: world.terrain.clampXM(
      Position.x[hull]! + Math.cos(behind) * ORDNANCE.NOISEMAKER.DEPLOY_OFFSET_M
    ),
    y: world.terrain.clampYM(
      Position.y[hull]! + Math.sin(behind) * ORDNANCE.NOISEMAKER.DEPLOY_OFFSET_M
    ),
    depth: Position.depth[hull]!,
    heading: behind,
    // A decoy neither seeks nor cares how deep it is: it is a noise source,
    // and the water it sits in is the water its hull was already surviving.
    pressureRating: Pressure.rating[hull]!,
  });
}

/**
 * Lay a mine. Returns the mine entity, or 0 when the shot is refused.
 *
 * Refused for two reasons, both server-side facts: the player is already at
 * their cap, or the hull is still laying the last one. Neither is an
 * information gate — a mine is aimed at nothing, so there is nothing to have
 * heard first.
 */
export function layMine(world: SimWorld, hull: number, capPerPlayer: number): number {
  if (!hasComponent(world, Countermeasure, hull)) return 0;
  if (hasComponent(world, Laying, hull) && Laying.remainingS[hull]! > 0) return 0;
  const slot = Owner.slot[hull]!;
  if (liveMineCount(world, slot) >= capPerPlayer) return 0;

  const mine = spawnOrdnance(world, {
    kind: OrdnanceKind.Mine,
    slot,
    faction: Owner.faction[hull]!,
    x: Position.x[hull]!,
    y: Position.y[hull]!,
    depth: Position.depth[hull]!,
    // A mine neither seeks nor steers; its listening lives in the trigger,
    // which is a loudness bar rather than a seeker (docs/systems-combat.md §6).
    pressureRating: Pressure.rating[hull]!,
  });
  Ordnance.armingS[mine] = ORDNANCE.MINE.ARMING_S;

  // The field is silent; making it is not. The laying hull broadcasts at
  // construction grade for exactly as long as the mine takes to arm, which is
  // the counter-play §6 asks for: you cannot see a minefield, but you can hear
  // one being built, and residue remembers where.
  if (!hasComponent(world, Laying, hull)) addComponent(world, Laying, hull);
  Laying.remainingS[hull] = ORDNANCE.MINE.ARMING_S;
  SilentRunning.active[hull] = 0;

  return mine;
}

/** Armed and arming mines a slot currently holds, for the cap. */
export function liveMineCount(world: SimWorld, slot: number): number {
  const all = ordnanceEntities(world);
  let count = 0;
  for (let i = 0; i < all.length; i++) {
    const eid = all[i]!;
    if (Ordnance.kind[eid] !== OrdnanceKind.Mine) continue;
    if (Owner.slot[eid] !== slot) continue;
    if (Health.hp[eid]! <= 0) continue;
    count++;
  }
  return count;
}

/** Laying clocks, which tick down wherever the hull is and whatever it does. */
function layingSystem(world: SimWorld): void {
  const layers = laying(world);
  for (let i = 0; i < layers.length; i++) {
    const eid = layers[i]!;
    if (Laying.remainingS[eid]! <= 0) continue;
    Laying.remainingS[eid] = Math.max(0, Laying.remainingS[eid]! - world.dt);
  }
}

/**
 * One armed mine, listening.
 *
 * This is the detection formula pointed backwards, and it is deliberately the
 * *same* formula: perceived loudness after propagation and after terrain,
 * compared against a bar. A mine in a Thermal Vein is half deaf and a minefield
 * in a trench hears you coming from outside its own lethal radius, and neither
 * of those is a rule anybody wrote — they fall out of pricing the trigger the
 * way everything else in this game is priced.
 */
function tickMine(world: SimWorld, eid: number, destroyed: number[]): void {
  if (Ordnance.armingS[eid]! > 0) {
    Ordnance.armingS[eid] = Math.max(0, Ordnance.armingS[eid]! - world.dt);
    return;
  }

  Ordnance.seekerCooldownS[eid] = Ordnance.seekerCooldownS[eid]! - world.dt;
  if (Ordnance.seekerCooldownS[eid]! > 0) return;
  Ordnance.seekerCooldownS[eid] = ORDNANCE.MINE.SENSE_INTERVAL_S;

  const x = Position.x[eid]!;
  const y = Position.y[eid]!;
  const slot = Owner.slot[eid]!;
  const candidates = audible(world);

  for (let i = 0; i < candidates.length; i++) {
    const other = candidates[i]!;
    if (Owner.slot[other] === slot) continue;
    if (Health.hp[other]! <= 0) continue;
    // A mine does not trigger on ordnance. It is waiting for somebody to walk
    // into it, and a torpedo passing overhead is not somebody.
    if (hasComponent(world, Ordnance, other)) continue;

    const distance = Math.hypot(Position.x[other]! - x, Position.y[other]! - y);
    if (distance > ORDNANCE.MINE.TRIGGER_RADIUS_M) continue;

    const pf = world.terrain.pathPropagation(Position.x[other]!, Position.y[other]!, x, y);
    const heard = perceivedLoudness(
      Acoustic.sig[other]! * (Acoustic.pfFactor[other]! || 1),
      pf,
      distance
    );
    if (heard < MINE_TRIGGER_LOUDNESS) continue;

    detonateMine(world, eid, destroyed);
    return;
  }
}

/**
 * An area detonation: linear falloff to the rim, a battle site, and a bang that
 * outlives the bomb.
 *
 * Shared by mines and depth charges because every part of it is identical
 * except two numbers and a dimension — the falloff, the residue, the
 * `destroyed` dedupe, and the ring that lets a 5 Hz detection pass hear a
 * 60 Hz event. Two copies would drift, and the half that drifted would be the
 * one nobody was looking at.
 *
 * `volumetric` is the one real difference, and it is the whole of §8. A mine's
 * blast is measured on the map, because a minefield is a wall you walk into and
 * the water column above it is not part of the wall. A depth charge's blast is
 * measured in three dimensions, because attacking *across bands* is its entire
 * reason to exist — a 2-D blast would reach a hull 1,500 m below and the depth
 * envelope would apply to nothing.
 */
function blast(
  world: SimWorld,
  eid: number,
  options: { damage: number; radiusM: number; echoS: number; volumetric: boolean },
  destroyed: number[]
): void {
  const x = Position.x[eid]!;
  const y = Position.y[eid]!;
  const depth = Position.depth[eid]!;
  const slot = Owner.slot[eid]!;

  Ordnance.detonatingS[eid] = options.echoS;
  world.marks.add(EchoMarkKind.Battle, x, y, 1);

  const candidates = audible(world);
  for (let i = 0; i < candidates.length; i++) {
    const other = candidates[i]!;
    if (other === eid) continue;
    if (Owner.slot[other] === slot) continue;
    if (Health.hp[other]! <= 0) continue;
    if (hasComponent(world, Ordnance, other)) continue;

    const dz = options.volumetric ? Position.depth[other]! - depth : 0;
    const distance = Math.hypot(Position.x[other]! - x, Position.y[other]! - y, dz);
    if (distance >= options.radiusM) continue;

    // Linear falloff to zero at the rim (docs/systems-combat.md §6), so a
    // minefield kills in numbers or not at all: one mine is a warning.
    const share = 1 - distance / options.radiusM;
    Health.hp[other] = Health.hp[other]! - options.damage * share;
    if (Health.hp[other]! <= 0 && !destroyed.includes(other)) destroyed.push(other);
  }
}

/** How loud each kind is while its detonation is still ringing. §3. */
function detonationSig(kind: OrdnanceKind): number {
  return kind === OrdnanceKind.DepthCharge
    ? ORDNANCE.DEPTH_CHARGE.SIG_DETONATION
    : ORDNANCE.MINE.SIG_DETONATION;
}

/** A mine goes off. Flat blast: a minefield is a wall on the map. */
function detonateMine(world: SimWorld, eid: number, destroyed: number[]): void {
  blast(
    world,
    eid,
    {
      damage: ORDNANCE.MINE.DAMAGE,
      radiusM: ORDNANCE.MINE.BLAST_RADIUS_M,
      echoS: ORDNANCE.MINE.DETONATION_ECHO_S,
      volumetric: false,
    },
    destroyed
  );
}

/**
 * A depth charge, falling.
 *
 * It travels **only in depth** — it is dropped, not thrown — at the standard
 * descent and ascent rates, so a charge set below you sinks and one set above
 * you floats. The asymmetry those rates encode is doing real work here: a
 * charge dropped downward arrives in a third of the time one sent upward does,
 * which is why attacking the band below you is the natural direction and
 * attacking the band above is a commitment.
 *
 * Audible the whole way down at SIG 30, per §1's rule. The defender hears it
 * coming and has the fall time to move — which, given that the blast is 180 m
 * and hulls are faster than the charge, is a real out for anyone paying
 * attention.
 */
function tickDepthCharge(world: SimWorld, eid: number, destroyed: number[]): void {
  const depth = Position.depth[eid]!;
  const wanted = Ordnance.targetDepthM[eid]!;
  const delta = wanted - depth;

  if (Math.abs(delta) <= DEPTH.ARRIVAL_EPSILON_M) {
    blast(
      world,
      eid,
      {
        damage: ORDNANCE.DEPTH_CHARGE.DAMAGE,
        radiusM: ORDNANCE.DEPTH_CHARGE.BLAST_RADIUS_M,
        echoS: ORDNANCE.DEPTH_CHARGE.DETONATION_ECHO_S,
        volumetric: true,
      },
      destroyed
    );
    return;
  }

  const rate = delta > 0 ? DEPTH.DESCENT_RATE_MPS : DEPTH.ASCENT_RATE_MPS;
  const step = Math.min(Math.abs(delta), rate * world.dt);
  Position.depth[eid] = depth + Math.sign(delta) * step;

  // Ordnance is only rated for the water its launcher was rated for (§8), so a
  // charge set deeper than its own envelope implodes on the way down rather
  // than arriving. Cheap hulls cannot bomb the deep by proxy.
  if (requiredPressureRating(Position.depth[eid]!) > Ordnance.pressureRating[eid]!) {
    expire(eid, destroyed);
  }
}

/**
 * Drop a depth charge, set to detonate at `depthM`.
 *
 * A depth and no target, unlike a torpedo. You are bombing *water*, not a
 * contact — so there is nothing to have resolved first, and no tier gate. What
 * the tier decides is whether you know which depth to set: a contact's depth is
 * only sent at Tier 3 and above (docs/systems-echo.md §4), so a commander who
 * has not classified what is under them is guessing at the one number that
 * matters. That is §7's rule arriving by a different road.
 *
 * Returns the charge, or 0 when the rack is cold.
 */
export function dropDepthCharge(world: SimWorld, hull: number, depthM: number): number {
  if (!hasComponent(world, Countermeasure, hull)) return 0;
  if (Countermeasure.cooldownRemainingS[hull]! > 0) return 0;
  Countermeasure.cooldownRemainingS[hull] = ORDNANCE.DEPTH_CHARGE.COOLDOWN_S;

  const eid = spawnOrdnance(world, {
    kind: OrdnanceKind.DepthCharge,
    slot: Owner.slot[hull]!,
    faction: Owner.faction[hull]!,
    x: Position.x[hull]!,
    y: Position.y[hull]!,
    depth: Position.depth[hull]!,
    targetDepthM: depthM,
    pressureRating: Pressure.rating[hull]!,
  });

  if (applyFiringSpike(hull, ORDNANCE.DEPTH_CHARGE.LAUNCH_SIG)) {
    raiseSelfEvent(world, { kind: SelfEventKind.BreakSilence, eid: hull });
  }
  return eid;
}

/**
 * Can a gun shoot this piece of ordnance out of the water?
 *
 * Only what the doc gives a hull to: a torpedo has 40 HP and "one or two gun
 * cycles kill it" (§5). A mine or a decoy has none, so point defence has
 * nothing to engage — which is what keeps mines a wall you route around rather
 * than a wall you shoot down.
 */
export function isInterceptable(kind: OrdnanceKind): boolean {
  return ordnanceStatsFor(kind).maxHp > 0;
}

export function ordnanceSystem(world: SimWorld, destroyed: number[]): void {
  const dt = world.dt;
  rearmSystem(world);
  countermeasureCooldowns(world);
  layingSystem(world);

  const entities = ordnanceEntities(world);
  if (entities.length > 0) rebuildFuseGrid(world);
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    if (Health.hp[eid]! <= 0) continue;
    const kind = Ordnance.kind[eid] as OrdnanceKind;

    // Ordnance is not in the acoustics query — it carries no Unit or Structure
    // component, which is exactly what keeps it out of every hull system — so
    // its live SIG is maintained here. Constant, and deliberately: neither a
    // running torpedo nor a screaming decoy has a quiet mode. The veil factor
    // still applies, because a Spore Veil is symmetric about everything inside.
    const ringing = Ordnance.detonatingS[eid]! > 0;
    const sig = ringing ? detonationSig(kind) : ordnanceStatsFor(kind).sig;
    Acoustic.sig[eid] = sig * (Acoustic.sigFactor[eid]! || 1);

    if (ringing) {
      // Spent, and only still here so the bang can be heard. It does no
      // further damage and cannot trigger again.
      Ordnance.detonatingS[eid] = Ordnance.detonatingS[eid]! - dt;
      if (Ordnance.detonatingS[eid]! <= 0) expire(eid, destroyed);
      continue;
    }

    Ordnance.remainingS[eid] = Ordnance.remainingS[eid]! - dt;
    if (Ordnance.remainingS[eid]! <= 0) {
      // Out of run, or burnt out, or scuttled at the end of its watch. It goes
      // inert rather than detonating: a torpedo that exploded wherever it ran
      // dry would be an area weapon nobody aimed, a decoy that exploded would
      // be a grenade, and a mine that went off on its own timer would kill
      // whoever happened to be nearest five minutes later.
      expire(eid, destroyed);
      continue;
    }

    if (kind === OrdnanceKind.Mine) {
      tickMine(world, eid, destroyed);
      continue;
    }
    if (kind === OrdnanceKind.DepthCharge) {
      tickDepthCharge(world, eid, destroyed);
      continue;
    }

    // Only torpedoes run. A noisemaker drifts where it was dropped and simply
    // shouts; depth charges get their own system.
    if (kind !== OrdnanceKind.Torpedo) continue;

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
/**
 * The largest radius any fuse can ever want, derived rather than picked.
 *
 * The broadphase below has to be sized so that nothing inside a fuse envelope
 * can fall outside the query, and the biggest envelope belongs to the biggest
 * thing a torpedo can hit — a Bastion at 220 m, plus the margin. Solved from
 * the stats tables so a bigger structure cannot silently outgrow it.
 */
const MAX_FUSE_RADIUS_M =
  Math.max(
    ...Object.keys(UNIT_STATS).map((k) => unitRadiusM(Number(k) as UnitKind)),
    ...Object.values(STRUCTURE_STATS).map((v) => v.radiusM),
    ...Object.values(ORDNANCE_STATS).map((v) => v.radiusM)
  ) + ORDNANCE.TORPEDO.FUSE_MARGIN_M;

/**
 * Rebuild the fuse broadphase for this tick.
 *
 * Without it `nearestFuseHit` walked every acoustic entity on the map, per
 * torpedo, at 60 Hz — quadratic in (ordnance x entities) with no bound. Measured
 * at 2.54 ms of a 16.67 ms frame for a 200-torpedo salvo on a 400-hull board,
 * almost all of it spent rejecting pairs kilometres apart on a test the grid
 * never would have produced.
 *
 * Built once per tick and only when there is ordnance in the water, so a match
 * with none pays nothing.
 */
function rebuildFuseGrid(world: SimWorld): void {
  const grid = world.fuseGrid;
  grid.clear();
  const candidates = audible(world);
  for (let i = 0; i < candidates.length; i++) {
    const eid = candidates[i]!;
    if (hasComponent(world, Ordnance, eid)) continue;
    grid.insert(eid, Position.x[eid]!, Position.y[eid]!);
  }
}

function nearestFuseHit(world: SimWorld, eid: number): number {
  const x = Position.x[eid]!;
  const y = Position.y[eid]!;
  const depth = Position.depth[eid]!;
  const slot = Owner.slot[eid]!;
  // 2D broadphase against a 3D test, which is sound in this direction: the
  // horizontal separation is never greater than the true distance, so nothing
  // inside the sphere can fall outside the circle.
  const candidates = world.fuseGrid.queryRadius(x, y, MAX_FUSE_RADIUS_M, world.fuseBuffer);

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
    seekerHyd: seekerHydFor(Owner.faction[launcher] as Faction),
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
