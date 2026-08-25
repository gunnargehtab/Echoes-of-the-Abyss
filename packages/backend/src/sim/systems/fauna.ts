/**
 * The Drift — docs/bestiary.md.
 *
 * Fauna hear you (§2), and they are contacts (§3). Both halves matter, and the
 * second one costs nothing: a creature carries Position, Acoustic, Owner and
 * Health like everything else, so the Echo Layer resolves it with no special
 * case at all. That is what makes §3's claim true — at Tier 1 and Tier 2 there
 * is nothing that separates a grazer from a cruiser, because the pass has not
 * yet looked at what the entity *is*.
 *
 * The rule this file exists to implement is §2's last line:
 *
 *   **Fauna attack the loudest thing, not the nearest.**
 *
 * It is what turns the Drift from wildlife into a strategic object. A
 * Consortium column can pull a swarm off a Commune harvester simply by existing
 * nearby, and both players know it. Anything that made creatures chase the
 * closest target would look almost identical in code and destroy the mechanic.
 *
 * Perceived loudness is computed with the *same* propagation model players are
 * detected by, so terrain protects you from fauna exactly as it protects you
 * from players — a herd behind a kelp bed does not hear your harvester.
 */

import {
  ACTIVE_SONAR,
  DRIFT,
  EchoMarkKind,
  SILENT_RUNNING,
  statsFor,
  structureStatsFor,
  type StructureKind,
  type UnitKind,
  Faction,
  FaunaSpecies,
  FaunaStage,
  detectionRatio,
  faunaStatsFor,
  maxAudibleRangeM,
  MAX_PROPAGATION_FACTOR,
  THERMOCLINE_ZONE_MAX,
  thermoclineFactor,
  thermoclineZone,
} from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import {
  Acoustic,
  ActivePing,
  Fauna,
  Health,
  Owner,
  Position,
  Structure,
  Unit,
} from '../components.ts';
import { activeCurrentAt } from './hazards.ts';
import type { SimWorld } from '../world.ts';

/** Slot fauna are owned by. Never a player, so every player can hear them. */
export const DRIFT_SLOT = 200;

const creatures = defineQuery([Fauna, Position, Acoustic, Health]);

/** Reused scratch for terrain step resolution — see movement.ts. */
const faunaStep = { x: 0, y: 0 };
/** Everything a creature can hear: players' hulls and buildings. */
const audible = defineQuery([Position, Acoustic, Owner, Health]);
/**
 * What a Sounder can grind through: anything owned with a body and hull points.
 * Its own query rather than `audible`, because transit does not care whether a
 * thing makes noise — a half-built refinery is just as much in the way.
 */
const transitTargets = defineQuery([Position, Owner, Health]);

/** How many creatures are alive. Used to hold the population under its cap. */
export function countFauna(world: SimWorld): number {
  return creatures(world).length;
}

/**
 * Advance every creature.
 *
 * Sensing is staggered rather than run every tick: a creature re-evaluates what
 * it can hear twice a second, which is faster than the Echo Layer resolves
 * contacts and far cheaper than the 60 Hz step. The expensive part is the
 * per-candidate path integral, and doing it sixty times a second per creature
 * would put the Drift's cost above the pass it is supposed to live beside.
 */
export function faunaSystem(world: SimWorld, destroyed: number[]): void {
  const dt = world.dt;
  const all = creatures(world);
  if (all.length === 0) return;

  const others = audible(world);

  for (let i = 0; i < all.length; i++) {
    const eid = all[i]!;
    if (Health.hp[eid]! <= 0) continue;

    const stats = faunaStatsFor(Fauna.species[eid] as FaunaSpecies);

    Fauna.senseS[eid] = Fauna.senseS[eid]! - dt;
    if (Fauna.senseS[eid]! <= 0) {
      Fauna.senseS[eid] = DRIFT.SENSE_INTERVAL_S;
      listen(world, eid, stats, others);
    }

    advanceStage(eid, stats, dt);
    act(world, eid, stats, dt, destroyed);
  }
}

/**
 * Find the loudest thing this creature can hear, and how loud it is.
 *
 * "Loudest", emphatically, not "nearest" — the target is chosen by perceived
 * loudness at the creature's own position, which folds in distance and terrain
 * without ever ranking by distance alone.
 */
function listen(
  world: SimWorld,
  eid: number,
  stats: ReturnType<typeof faunaStatsFor>,
  others: number[]
): void {
  const fx = Position.x[eid]!;
  const fy = Position.y[eid]!;
  const fd = Position.depth[eid]!;
  const hyd = Acoustic.hyd[eid]!;
  // Which side of the thermocline the *listener* is on, hoisted because it is
  // the same for every candidate this creature considers.
  const fZone = thermoclineZone(fd);
  // Bounded by the loudest thing that could exist, so the prune below can
  // never reject something the exact test would have accepted. The bound has
  // to cover the thermocline too: a creature in the duct hears along it at
  // 1.2x, so a reach computed at the biome ceiling alone would prune away
  // sources the exact test accepts (docs/systems-echo.md §3).
  const reach = maxAudibleRangeM(100, MAX_PROPAGATION_FACTOR * THERMOCLINE_ZONE_MAX[fZone]!, hyd);
  const reach2 = reach * reach;

  let bestEid = 0;
  let bestHeard = 0;

  for (let i = 0; i < others.length; i++) {
    const other = others[i]!;
    if (other === eid) continue;
    // Fauna do not hunt each other. The Drift is not a food web simulation.
    if (Owner.slot[other] === DRIFT_SLOT) continue;
    if (Health.hp[other]! <= 0) continue;

    const dx = Position.x[other]! - fx;
    const dy = Position.y[other]! - fy;
    const d2 = dx * dx + dy * dy;
    if (d2 > reach2) continue;

    const sig = Acoustic.sig[other]!;
    if (sig <= 0) continue;
    const distance = Math.sqrt(d2);

    // The exact thermocline factor for this pair, not the row maximum: both
    // ends are in hand here, so the prune can be as tight as the test.
    const tf = thermoclineFactor(Position.depth[other]!, fd);
    // Cheap rejection before the path walk, the same shape as the contact
    // pass's (#90) and the residue read's.
    if (detectionRatio(sig, MAX_PROPAGATION_FACTOR * tf, distance, hyd) < 1) continue;

    // Multiplying the walk's result is safe here because no `abortBelow` is
    // passed: the walk returns the true path factor rather than bailing early
    // against a threshold that knows nothing about the layer.
    const pf = world.terrain.pathPropagation(Position.x[other]!, Position.y[other]!, fx, fy) * tf;
    // §2's thresholds read against the detection ratio — how many times over
    // the creature can hear this thing at all. That is the scale that makes
    // the doc's numbers behave like the animals it describes: a Draymaw
    // (Interest 22, Commit 45) grows interested in a working harvester at
    // about 800 m and commits at about 500 m, which is exactly "shadow
    // harvesting operations at the edge of hearing and commit when yield
    // noise peaks". An Ashgrazer (30/65, and much deafer) stays reluctant
    // until something is nearly on top of its feeding ground.
    //
    // Two readings were tried and measured before this one. A ratio scaled by
    // an invented factor of ten had Draymaws hearing a Bastion from two
    // kilometres and eating the opening base of every match. Raw perceived
    // loudness went the other way: the reference distance is 100 m and the
    // exponent 1.6, so a SIG-70 harvester reads 12 at 300 m and fauna became
    // deaf to anything not touching them.
    let heard = detectionRatio(sig, pf, distance, hyd);

    // --- §2's modifier table -------------------------------------------------
    // The ping's tripled contribution: this is the constant that has sat unread
    // since it was written. Active sonar's third consequence, after "reveal
    // them" and "reveal yourself", is that it wakes the map up.
    if (hasComponent(world, ActivePing, other) && ActivePing.remainingS[other]! > 0) {
      heard *= ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER;
    }
    // "Target is a Directorate unit: x0.4 — the Directorate smell wrong and
    // taste worse."
    if (Owner.faction[other] === Faction.Directorate) {
      heard *= DRIFT.DIRECTORATE_AGGRO_MULTIPLIER;
    }

    if (heard > bestHeard) {
      bestHeard = heard;
      bestEid = other;
    }
  }

  // "Fresh kill or wreck within 800 m: +15 flat, decaying over 90 s." The Echo
  // Mark layer already tracks exactly that, with exactly that decay — so this
  // is a read rather than a second bookkeeping system.
  //
  // Deliberately a proximity test rather than an audibility one: §2 words this
  // modifier as a distance, and 800 m of scavenging range is not the same claim
  // as "can hear it from there". The thermocline gates what a creature *hears*
  // (the loop above), not what it can smell in the water beside it.
  bestHeard += wreckBonus(world, fx, fy);

  Fauna.targetEid[eid] = bestEid;
  Fauna.heard[eid] = bestHeard;
  void stats;
}

/**
 * Grind through whatever the Sounder just swam over — docs/bestiary.md §4.
 *
 * A swept test against the segment the colossus actually covered this tick,
 * not a point check at its new position: at 30 m/s a 60 Hz step is half a
 * metre, but the test has to survive anyone raising the tick budget or the
 * creature's speed, and a colossus that teleported past a turret between two
 * frames would be a bug nobody could reproduce.
 *
 * Damage is the Sounder's own `damagePerS`, dt-scaled, applied for as long as
 * it is inside the footprint — so how badly a structure fares is how large it
 * is, and a Bastion survives a crossing while a turret does not.
 */
function transit(
  world: SimWorld,
  eid: number,
  stats: ReturnType<typeof faunaStatsFor>,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  dt: number,
  destroyed: number[]
): void {
  const body = stats.lengthM / 2;
  const depth = Position.depth[eid]!;
  const damage = stats.damagePerS * dt;
  const segX = toX - fromX;
  const segY = toY - fromY;
  const segLen2 = segX * segX + segY * segY;

  const candidates = transitTargets(world);
  for (let i = 0; i < candidates.length; i++) {
    const other = candidates[i]!;
    if (other === eid) continue;
    if (Health.hp[other]! <= 0) continue;
    if (Owner.slot[other] === DRIFT_SLOT) continue;

    const isStructure = hasComponent(world, Structure, other);
    let radius: number;
    if (isStructure) {
      radius = structureStatsFor(Structure.kind[other] as StructureKind).radiusM;
    } else if (hasComponent(world, Unit, other)) {
      // "Ignores small units" (§4) — a Sounder does not notice them.
      const hull = statsFor(Unit.kind[other] as UnitKind).hullLengthM;
      if (hull < DRIFT.TRANSIT_MIN_HULL_M) continue;
      radius = hull / 2;
    } else {
      continue;
    }

    const reach = body + radius;
    // Vertically it is a body, not a column: a colossus at 2,000 m does not
    // grind a refinery moored at 600 m.
    if (Math.abs(Position.depth[other]! - depth) > reach) continue;

    // Closest approach of the swept segment to the target's centre.
    const px = Position.x[other]! - fromX;
    const py = Position.y[other]! - fromY;
    let t = segLen2 === 0 ? 0 : (px * segX + py * segY) / segLen2;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const nearX = px - segX * t;
    const nearY = py - segY * t;
    if (nearX * nearX + nearY * nearY > reach * reach) continue;

    Health.hp[other] = Health.hp[other]! - damage;
    // The map hears a building come apart. Structural failure under a colossus
    // is louder than being battered by a vent, which is the eruption's own
    // argument one step up.
    if (Acoustic.spikeAmount[other] !== undefined) {
      if (DRIFT.TRANSIT_SIG >= Acoustic.spikeAmount[other]!) {
        Acoustic.spikeAmount[other] = DRIFT.TRANSIT_SIG;
      }
      Acoustic.spikeRemainingS[other] = Math.max(
        Acoustic.spikeRemainingS[other]!,
        SILENT_RUNNING.BREAK_SILENCE_DURATION_S
      );
    }
    if (Health.hp[other]! <= 0 && !destroyed.includes(other)) {
      destroyed.push(other);
      // Nobody rendered this either — the same case hazards.ts makes.
      world.environmentalDeaths.add(other);
    }
  }
}

/** Aggro added by nearby battle residue, per §2's modifier table. */
function wreckBonus(world: SimWorld, x: number, y: number): number {
  let bonus = 0;
  for (const mark of world.marks.all) {
    if (mark.kind !== EchoMarkKind.Battle && mark.kind !== EchoMarkKind.DestroyedStructure) {
      continue;
    }
    const dx = mark.x - x;
    const dy = mark.y - y;
    if (dx * dx + dy * dy > DRIFT.WRECK_RADIUS_M * DRIFT.WRECK_RADIUS_M) continue;
    // Intensity already decays on the mark's own clock, so the flat bonus
    // fades with the wreck rather than needing a second timer.
    bonus = Math.max(bonus, DRIFT.WRECK_AGGRO_BONUS * mark.intensity);
  }
  return bonus;
}

/** §2's ladder: Ambient -> Interested -> Committed -> Cooling. */
function advanceStage(eid: number, stats: ReturnType<typeof faunaStatsFor>, dt: number): void {
  const heard = Fauna.heard[eid]!;
  const stage = Fauna.stage[eid] as FaunaStage;

  if (heard >= stats.interest) {
    Fauna.interestS[eid] = Fauna.interestS[eid]! + dt;
    Fauna.quietS[eid] = 0;
  } else {
    Fauna.quietS[eid] = Fauna.quietS[eid]! + dt;
    Fauna.interestS[eid] = 0;
  }

  switch (stage) {
    case FaunaStage.Ambient:
      if (Fauna.interestS[eid]! >= DRIFT.INTEREST_DWELL_S) {
        Fauna.stage[eid] = FaunaStage.Interested;
        Fauna.interestedS[eid] = 0;
      }
      break;

    case FaunaStage.Interested:
      Fauna.interestedS[eid] = Fauna.interestedS[eid]! + dt;
      // Either loud enough, or it has been watching long enough to decide.
      if (heard >= stats.commit || Fauna.interestedS[eid]! >= DRIFT.COMMIT_AFTER_INTERESTED_S) {
        Fauna.stage[eid] = FaunaStage.Committed;
      } else if (Fauna.quietS[eid]! >= DRIFT.COOL_AFTER_S) {
        Fauna.stage[eid] = FaunaStage.Cooling;
        Fauna.coolingS[eid] = DRIFT.COOLING_S;
      }
      break;

    case FaunaStage.Committed:
      if (Fauna.quietS[eid]! >= DRIFT.COOL_AFTER_S || Fauna.targetEid[eid] === 0) {
        Fauna.stage[eid] = FaunaStage.Cooling;
        Fauna.coolingS[eid] = DRIFT.COOLING_S;
      }
      break;

    case FaunaStage.Cooling:
      Fauna.coolingS[eid] = Fauna.coolingS[eid]! - dt;
      // A creature that hears something loud again while disengaging turns
      // straight back round: cooling is a state, not a cooldown you can wait
      // out by being loud somewhere else.
      if (heard >= stats.commit) Fauna.stage[eid] = FaunaStage.Committed;
      else if (Fauna.coolingS[eid]! <= 0) {
        Fauna.stage[eid] = FaunaStage.Ambient;
        Fauna.interestedS[eid] = 0;
      }
      break;
  }
}

function act(
  world: SimWorld,
  eid: number,
  stats: ReturnType<typeof faunaStatsFor>,
  dt: number,
  destroyed: number[]
): void {
  const stage = Fauna.stage[eid] as FaunaStage;
  const target = Fauna.targetEid[eid]!;
  const x = Position.x[eid]!;
  const y = Position.y[eid]!;

  // SIG follows the stage: a committed herd is a stampede, and a stampede is
  // loud. This is what makes a creature's *reaction* visible to the player who
  // caused it — the map answering back through the same channel as everything
  // else.
  Acoustic.sig[eid] = stage === FaunaStage.Ambient ? stats.sigIdle : stats.sigActive;

  let toX = Fauna.homeX[eid]!;
  let toY = Fauna.homeY[eid]!;
  let stopAtM = 40;

  if (stage === FaunaStage.Interested && target !== 0) {
    toX = Position.x[target]!;
    toY = Position.y[target]!;
    // "Closes to ~1,200 m" — interested is not committed. It comes to look.
    stopAtM = DRIFT.INTEREST_APPROACH_M;
  } else if (stage === FaunaStage.Committed && target !== 0) {
    toX = Position.x[target]!;
    toY = Position.y[target]!;
    // A Sounder does not stop at weapons range. "It destroys structures by
    // transit" (docs/bestiary.md §4), and a colossus that halted politely
    // outside a refinery to gnaw is exactly the thing that sentence is not
    // describing — it was also, until this was written, all the Sounder ever
    // did. It ploughs to the target and keeps going; `disengageAfterPass`
    // below sends it on its way once it is through, which is what makes a pass
    // a pass rather than a colossus parked on a building.
    stopAtM = Fauna.species[eid] === FaunaSpecies.Sounder ? 0 : stats.attackRangeM * 0.7;
  }

  // Vertical pursuit, bounded by the species' band (docs/bestiary.md §4).
  //
  // A creature holds its working depth until something worth chasing pulls it
  // off, and it will only follow so far: a Draymaw pack tracks a harvester at
  // a nodule field and gives up on one that dives for the crystal, while the
  // colossus already down there does not. That is what makes depth cover from
  // part of the Drift and exposure to the rest, and it is the reason the
  // bestiary bothered to name a habitat for every entry.
  const chasing =
    target !== 0 && (stage === FaunaStage.Interested || stage === FaunaStage.Committed);
  const home = stats.workingDepthM;
  let wantDepth = home;
  if (chasing) {
    const theirs = Position.depth[target]!;
    wantDepth = Math.min(home + stats.depthBandM, Math.max(home - stats.depthBandM, theirs));
  }
  // Ground still has the last word: a creature cannot sit under the sea floor
  // any more than a hull can.
  const floor = world.terrain.floorAt(x, y);
  if (wantDepth > floor) wantDepth = floor;
  const depthNow = Position.depth[eid]!;
  if (depthNow !== wantDepth) {
    const stepM = Math.min(DRIFT.VERTICAL_SPEED_MPS * dt, Math.abs(wantDepth - depthNow));
    Position.depth[eid] = depthNow + (wantDepth > depthNow ? stepM : -stepM);
  }

  const dx = toX - x;
  const dy = toY - y;
  const distance = Math.hypot(dx, dy);
  // "Abyssal creatures freeze briefly" — docs/hazards.md §8. Movement only: a
  // frozen creature still hears, still holds its target, and still bites what
  // is already beside it, because a predator that went inert would make a cold
  // shock a safe place to stand rather than a cold one. The water does not
  // carry it either — hazards.ts skips fauna in the drift for the same reason.
  if (distance > stopAtM && activeCurrentAt(world, x, y) === undefined) {
    const travel = Math.min(stats.speed * dt, distance - stopAtM);
    // Ground refuses a creature the same way it refuses a hull, and for the
    // same reason: a Sounder inside a plateau is an emitter nobody can reach.
    // Fauna get the horizontal half only — they carry no DepthOrder, so
    // nothing would ever lift them again. A refused step is harmless here in a
    // way it would not be for a hull: a fish that cannot go where it was
    // heading simply wanders somewhere else, having been given no orders.
    world.terrain.resolveStep(
      x,
      y,
      x + (dx / distance) * travel,
      y + (dy / distance) * travel,
      Position.depth[eid]!,
      faunaStep
    );
    Position.x[eid] = faunaStep.x;
    Position.y[eid] = faunaStep.y;

    // "It destroys structures by transit" (docs/bestiary.md §4). The Sounder is
    // the one creature tested for overlap along the path it actually swept
    // this tick, rather than stopping at weapons range and gnawing — a
    // colossus that waited politely outside a refinery is not what that
    // sentence describes. Everything else in the Drift passes through hulls
    // freely and always has; fauna are not in the separation pass, which is
    // intended rather than pending (§4, "Fauna do not collide").
    if (Fauna.species[eid] === FaunaSpecies.Sounder) {
      transit(world, eid, stats, x, y, faunaStep.x, faunaStep.y, dt, destroyed);
    }
  } else if (
    Fauna.species[eid] === FaunaSpecies.Sounder &&
    stage === FaunaStage.Committed &&
    target !== 0
  ) {
    // Through, and done. One commitment is one pass: the colossus arrives,
    // grinds whatever was in the way on the way in and on the way out, and loses
    // interest rather than settling on top of a building it failed to kill.
    // That is what leaves a Bastion standing after a crossing and dead after a
    // few, without an animal nobody steers ever camping the elimination
    // condition.
    Fauna.targetEid[eid] = 0;
    Fauna.stage[eid] = FaunaStage.Cooling;
    Fauna.coolingS[eid] = DRIFT.COOLING_S;
  }

  if (stage !== FaunaStage.Committed || target === 0) return;
  if (Health.hp[target]! <= 0) {
    Fauna.targetEid[eid] = 0;
    return;
  }
  // Reach is measured in three dimensions. It used to be the horizontal
  // distance alone, which let a pack at 300 m take a hull at 2,400 m from full
  // health to nothing without ever descending — the creature heard it a third
  // as well through the thermocline and ate it exactly as fast.
  const bite = Math.hypot(
    Position.x[target]! - Position.x[eid]!,
    Position.y[target]! - Position.y[eid]!,
    Position.depth[target]! - Position.depth[eid]!
  );
  if (bite > stats.attackRangeM) return;

  // The Sounder "destroys structures by transit, ignores small units" (§4), so
  // it does not chew on hulls it could swim past.
  const isStructure = hasComponent(world, Structure, target);
  if (Fauna.species[eid] === FaunaSpecies.Sounder && !isStructure) return;
  if (!isStructure && !hasComponent(world, Unit, target)) return;

  Health.hp[target] = Health.hp[target]! - stats.damagePerS * dt;
  if (Health.hp[target]! <= 0) destroyed.push(target);
}
