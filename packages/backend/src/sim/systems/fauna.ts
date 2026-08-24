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
  Faction,
  FaunaSpecies,
  FaunaStage,
  detectionRatio,
  faunaStatsFor,
  maxAudibleRangeM,
  MAX_PROPAGATION_FACTOR,
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
import type { SimWorld } from '../world.ts';

/** Slot fauna are owned by. Never a player, so every player can hear them. */
export const DRIFT_SLOT = 200;

const creatures = defineQuery([Fauna, Position, Acoustic, Health]);
/** Everything a creature can hear: players' hulls and buildings. */
const audible = defineQuery([Position, Acoustic, Owner, Health]);

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
  const hyd = Acoustic.hyd[eid]!;
  // Bounded by the loudest thing that could exist, so the prune below can
  // never reject something the exact test would have accepted.
  const reach = maxAudibleRangeM(100, MAX_PROPAGATION_FACTOR, hyd);
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

    // Cheap rejection before the path walk, the same shape as the contact
    // pass's (#90) and the residue read's.
    if (detectionRatio(sig, MAX_PROPAGATION_FACTOR, distance, hyd) < 1) continue;

    const pf = world.terrain.pathPropagation(Position.x[other]!, Position.y[other]!, fx, fy);
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
  bestHeard += wreckBonus(world, fx, fy);

  Fauna.targetEid[eid] = bestEid;
  Fauna.heard[eid] = bestHeard;
  void stats;
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
    stopAtM = stats.attackRangeM * 0.7;
  }

  const dx = toX - x;
  const dy = toY - y;
  const distance = Math.hypot(dx, dy);
  if (distance > stopAtM) {
    const step = Math.min(stats.speed * dt, distance - stopAtM);
    Position.x[eid] = x + (dx / distance) * step;
    Position.y[eid] = y + (dy / distance) * step;
  }

  if (stage !== FaunaStage.Committed || target === 0) return;
  if (Health.hp[target]! <= 0) {
    Fauna.targetEid[eid] = 0;
    return;
  }
  if (distance > stats.attackRangeM) return;

  // The Sounder "destroys structures by transit, ignores small units" (§4), so
  // it does not chew on hulls it could swim past.
  const isStructure = hasComponent(world, Structure, target);
  if (Fauna.species[eid] === FaunaSpecies.Sounder && !isStructure) return;
  if (!isStructure && !hasComponent(world, Unit, target)) return;

  Health.hp[target] = Health.hp[target]! - stats.damagePerS * dt;
  if (Health.hp[target]! <= 0) destroyed.push(target);
}
