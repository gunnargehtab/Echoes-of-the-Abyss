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
  SelfEventKind,
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
import { directionalFactorFor } from '../directional.ts';
import { activeCurrentAt } from './hazards.ts';
import { raiseSelfEvent, type SimWorld } from '../world.ts';

/** Slot fauna are owned by. Never a player, so every player can hear them. */
export const DRIFT_SLOT = 200;

/**
 * Whether a target is a creature a mission beat is currently driving.
 *
 * Weapons ask this before they take hull off something, and only weapons.
 * An authored transit happens when its document says it does
 * (docs/mission-sorrowgate.md §9), so guns, torpedoes and blasts land on it
 * and do nothing — the shot is still fired, still loud, still lays residue,
 * because the player did shoot; it is the hull that does not give. What the
 * document itself does to the creature (a `lose` beat, its own transit into
 * ground) is not a weapon and is not asked here. Nor is the map: a transit
 * routed through an eruption is an authoring error for the mission test to
 * catch, not a rule for the engine to carry (docs/bestiary.md §4, #349).
 */
export function isDriven(world: SimWorld, eid: number): boolean {
  return hasComponent(world, Fauna, eid) && Fauna.driven[eid] === 1;
}

/**
 * A weapon landed on a creature — damage is a sound (docs/bestiary.md §4).
 *
 * Weapons call this after they take hull off something, and only weapons: the
 * map is not a shooter, so crush, storms and eruptions do not, and a driven
 * creature that gave no hull was not wounded. The report is one flag and the
 * hull that fired, consumed by the ladder on its next step; what it means is
 * the species' business. The Hollow is the one animal it changes. A trigger
 * model can be shot at from outside its trigger, and until this a hull that
 * outranged 500 m — every gun, against the Directorate's ×0.4 — rendered every
 * Hollow on a map for nothing (docs/mission-intake.md §13, #353). `by` is 0
 * when nothing with a hull fired it: a mine going off, a torpedo at the end of
 * its run.
 */
export function wound(world: SimWorld, target: number, by: number): void {
  if (!hasComponent(world, Fauna, target)) return;
  Fauna.struck[target] = 1;
  Fauna.struckBy[target] = by;
}

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

    // The ambient species never commit, never chase and never listen — a
    // shoal is a place, not a predator — so the whole ladder is skipped, and
    // with it the per-candidate path integrals that make `listen` the
    // expensive half of the Drift.
    if (Fauna.species[eid] === FaunaSpecies.Lampfry) {
      lampfryTick(world, eid, dt, others);
      continue;
    }
    if (Fauna.species[eid] === FaunaSpecies.Tetherjelly) {
      jellyTick(world, eid, dt);
      continue;
    }

    Fauna.senseS[eid] = Fauna.senseS[eid]! - dt;
    if (Fauna.senseS[eid]! <= 0) {
      Fauna.senseS[eid] = DRIFT.SENSE_INTERVAL_S;
      listen(world, eid, stats, others);
      if (Fauna.species[eid] === FaunaSpecies.Rasp) scavengeSense(world, eid);
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

    // The Knights' bow counts here too (docs/systems-echo.md §8). §8's
    // exclusion list is closed at three and fauna are not on it, so the honest
    // reading of "a path's loudness is SIG x biome PF x thermocline x this" is
    // that it holds wherever a Knight hull is the emitter — a wake is quieter
    // to a Draymaw for the same reason it is quieter to a hydrophone, and the
    // alternative is two detection paths disagreeing about one hull.
    //
    // Exact rather than bounded, like `tf` below: both ends are in hand, so
    // the cheap prune can carry the true factor instead of an upper bound.
    const sig = Acoustic.sig[other]! * directionalFactorFor(world, other, fx, fy);
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
    // A transit crush is fauna violence, not weather: the owner is told
    // (docs/ui-ux.md §5), where a hazard would instead announce itself.
    raiseSelfEvent(world, { kind: SelfEventKind.Damaged, eid: other });
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

/**
 * A Lampfry shoal — docs/bestiary.md §4, and the reason the Commune's stealth
 * has an answer at all.
 *
 * The shoal holds its water and does exactly one thing: scatter from any
 * entity within 300 m **regardless of SIG**, reforming 25 s after the last
 * intruder leaves. The trigger is a three-dimensional proximity test and
 * deliberately never touches the Echo Layer — the tell exists precisely so
 * that silence cannot suppress it, and any SIG term in this function would
 * quietly reintroduce the thing it answers. Resist routing it through
 * detection (#306 flags exactly that temptation).
 *
 * §6's Failing row is also enforced here: "Lampfry gone (scatter tells stop
 * working)". A shoal in failing water dies off — an environmental death the
 * map caused, so nobody is paid for it — and with the shoal goes the tell,
 * which is the concealment consequence the Drift Health table promises.
 */
function lampfryTick(world: SimWorld, eid: number, dt: number, others: number[]): void {
  if (Fauna.scatterS[eid]! > 0) {
    Fauna.scatterS[eid] = Math.max(0, Fauna.scatterS[eid]! - dt);
  }

  Fauna.senseS[eid] = Fauna.senseS[eid]! - dt;
  if (Fauna.senseS[eid]! > 0) return;
  Fauna.senseS[eid] = DRIFT.SENSE_INTERVAL_S;

  const fx = Position.x[eid]!;
  const fy = Position.y[eid]!;
  const fd = Position.depth[eid]!;

  if (world.drift.at(fx, fy) < DRIFT.HEALTH_FAILING) {
    Health.hp[eid] = 0;
    // The map killed it; reap still records the loss against the region.
    world.environmentalDeaths.add(eid);
    return;
  }

  const radius2 = DRIFT.LAMPFRY_SCATTER_RADIUS_M * DRIFT.LAMPFRY_SCATTER_RADIUS_M;
  for (let i = 0; i < others.length; i++) {
    const other = others[i]!;
    if (other === eid) continue;
    // The Drift does not startle itself: a Draymaw and a shoal share water.
    if (Owner.slot[other] === DRIFT_SLOT) continue;
    if (Health.hp[other]! <= 0) continue;
    const dx = Position.x[other]! - fx;
    const dy = Position.y[other]! - fy;
    const dz = Position.depth[other]! - fd;
    // "Any entity" is the doc's word and the query's: hulls, structures and
    // ordnance alike — a torpedo tearing through a shoal scatters it.
    if (dx * dx + dy * dy + dz * dz <= radius2) {
      Fauna.scatterS[eid] = DRIFT.LAMPFRY_REFORM_S;
      return;
    }
  }
}

/**
 * A Tetherjelly cluster — docs/bestiary.md §4, living terrain.
 *
 * The creature itself does nothing at all: its −0.10 PF is a modifier the
 * propagation rebuild gathers from every living cluster
 * (sim/systems/hazards.ts, `rebuildPropagation`), so this tick exists only to
 * enforce §6's Failing row — "Tetherjelly fields thinning: local PF rises
 * toward baseline". A cluster in failing water withers at a rate, so a field
 * thins cluster by cluster over a minute or two rather than vanishing on a
 * threshold tick; each death is the map's own (nobody is paid), and the reap
 * rebuilds the PF grid, which is the "rises toward baseline" made literal.
 */
function jellyTick(world: SimWorld, eid: number, dt: number): void {
  if (world.drift.at(Position.x[eid]!, Position.y[eid]!) >= DRIFT.HEALTH_FAILING) return;
  Health.hp[eid] = Health.hp[eid]! - DRIFT.JELLY_WITHER_HP_PER_S * dt;
  if (Health.hp[eid]! <= 0) world.environmentalDeaths.add(eid);
}

/**
 * What a Rasp swarm wants — the strongest battle residue in smelling range.
 *
 * "Drawn to Echo Marks, not to live units" (docs/bestiary.md §4). A proximity
 * test rather than an audibility one, exactly as `wreckBonus` below argues for
 * itself: being drawn to a wreck is scent, and the thermocline gates what a
 * creature hears, not what is in the water beside it. Strongest rather than
 * nearest, matching the Drift's one rule about how it chooses.
 *
 * Stored as the mark's stable id so the swarm follows the residue itself — a
 * reinforced mark moves, and `act` re-reads the position every tick.
 */
function scavengeSense(world: SimWorld, eid: number): void {
  const x = Position.x[eid]!;
  const y = Position.y[eid]!;
  let bestId = 0;
  let bestIntensity = 0;
  for (const mark of world.marks.all) {
    if (mark.kind !== EchoMarkKind.Battle && mark.kind !== EchoMarkKind.DestroyedStructure) {
      continue;
    }
    const dx = mark.x - x;
    const dy = mark.y - y;
    if (dx * dx + dy * dy > DRIFT.SCAVENGE_RANGE_M * DRIFT.SCAVENGE_RANGE_M) continue;
    if (mark.intensity > bestIntensity) {
      bestIntensity = mark.intensity;
      bestId = mark.id;
    }
  }
  Fauna.scavengeMarkId[eid] = bestId;
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

/**
 * The Hollow's ladder — a trigger model, not a dwell model (docs/bestiary.md
 * §4, "the one creature the aggro ladder does not describe").
 *
 * Interest coils it: it tracks and does nothing else — no approach, no dwell
 * timer, no SIG change, because an ambush that announced itself would be a
 * different animal. The strike fires the instant something it hears at Commit
 * is inside the trigger range in three dimensions. It is the deliberate
 * exception to §8's "every commit is preceded by 4 s of Interested behaviour
 * with an audible tell"; the doc prices that with ground instead of time.
 */
function hollowStage(
  eid: number,
  stats: ReturnType<typeof faunaStatsFor>,
  dt: number,
  wounded: boolean,
  woundedBy: number
): void {
  const heard = Fauna.heard[eid]!;
  const stage = Fauna.stage[eid] as FaunaStage;

  // Damage is a sound. A Hollow shot from outside its trigger — any gun that
  // reaches past 500 m, which against the Directorate's ×0.4 is all of them —
  // answers the wound the way it answers a loud hull passing the ambush: it
  // strikes, now, at strike loudness. The first contact keeps the trigger
  // model whole (quiet past the ambush is still quiet, loud far away is still
  // watched), and standing off becomes a choice with a cost rather than a
  // free rendering (docs/bestiary.md §4; docs/mission-intake.md §4, #353).
  //
  // What it lunges at is the ladder's business, not the gun's: the loudest
  // thing it can hear, which is this file's one rule and is almost always the
  // gun that just fired and spiked. Only when it hears nothing at all does the
  // wound point it, at the hull that fired if one did, so a shot from beyond
  // hearing still buys a lunge in the right direction — for as long as the
  // next listen keeps a target. A creature that cannot hear its shooter
  // cannot hunt it, and half a second of lunge is what that is worth.
  if (wounded) {
    if (Fauna.targetEid[eid] === 0 && woundedBy !== 0 && Health.hp[woundedBy]! > 0) {
      Fauna.targetEid[eid] = woundedBy;
    }
    // A wound is loud enough to reset the quiet clock: a Hollow that had
    // been hearing its shooter below Interest for a minute would otherwise
    // commit and cool on the very next step, having been "quiet" the whole
    // time. It gets the same 30 s to close that a struck one gets.
    Fauna.quietS[eid] = 0;
  }
  const target = Fauna.targetEid[eid]!;

  // Commit-loud AND passing the ambush, measured like a bite: in 3D, so a
  // convoy overhead by more than the range is not passing it.
  const triggered =
    heard >= stats.commit &&
    target !== 0 &&
    Math.hypot(
      Position.x[target]! - Position.x[eid]!,
      Position.y[target]! - Position.y[eid]!,
      Position.depth[target]! - Position.depth[eid]!
    ) <= DRIFT.HOLLOW_TRIGGER_RANGE_M;
  // Either passing the ambush, or having shot it.
  const sprung = triggered || wounded;

  switch (stage) {
    case FaunaStage.Ambient:
      if (sprung) Fauna.stage[eid] = FaunaStage.Committed;
      // Coiling is instant — there is no 4 s dwell, because nothing visible
      // or audible changes when it happens.
      else if (heard >= stats.interest) Fauna.stage[eid] = FaunaStage.Interested;
      break;

    case FaunaStage.Interested:
      if (sprung) Fauna.stage[eid] = FaunaStage.Committed;
      // It never moved, so there is no journey to cool from: quiet water
      // simply uncoils it.
      else if (Fauna.quietS[eid]! >= DRIFT.COOL_AFTER_S) Fauna.stage[eid] = FaunaStage.Ambient;
      break;

    case FaunaStage.Committed:
      if (Fauna.quietS[eid]! >= DRIFT.COOL_AFTER_S || Fauna.targetEid[eid] === 0) {
        Fauna.stage[eid] = FaunaStage.Cooling;
        Fauna.coolingS[eid] = DRIFT.COOLING_S;
      }
      break;

    case FaunaStage.Cooling:
      Fauna.coolingS[eid] = Fauna.coolingS[eid]! - dt;
      // Re-striking keeps the gate: an ambusher slinking home does not chase
      // a noise half the map away, however loud. A shell is not a noise half
      // the map away — a hull that keeps shooting keeps it coming.
      if (sprung) Fauna.stage[eid] = FaunaStage.Committed;
      else if (Fauna.coolingS[eid]! <= 0) Fauna.stage[eid] = FaunaStage.Ambient;
      break;
  }
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

  // The wound report, read and cleared here for every species rather than
  // in the one branch that answers it, so a Draymaw does not carry a stale
  // shell onto the day the doc gives it a use.
  const wounded = Fauna.struck[eid] === 1;
  const woundedBy = Fauna.struckBy[eid]!;
  Fauna.struck[eid] = 0;
  Fauna.struckBy[eid] = 0;

  if (stats.species === FaunaSpecies.Hollow) {
    hollowStage(eid, stats, dt, wounded, woundedBy);
    return;
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
  //
  // The Hollow is the dual-SIG exception (docs/bestiary.md §4): striking is
  // its only loud state. Coiled and even disengaging it stays at rest volume,
  // because an ambush that got louder while watching would be a tell the doc
  // explicitly does not grant it.
  const roused =
    Fauna.species[eid] === FaunaSpecies.Hollow
      ? stage === FaunaStage.Committed
      : stage !== FaunaStage.Ambient;
  Acoustic.sig[eid] = roused ? stats.sigActive : stats.sigIdle;

  let toX = Fauna.homeX[eid]!;
  let toY = Fauna.homeY[eid]!;
  let stopAtM = 40;
  /** Depth of the residue a scavenger is drifting toward, if it is. */
  let scavengeDepth: number | undefined;

  // A scavenger with nothing better to do answers residue rather than its
  // home water — "drawn to Echo Marks, not to live units" (docs/bestiary.md
  // §4). The aggro ladder outranks this by construction: a swarm chasing
  // something loud takes the Interested/Committed branches below, and this
  // one never runs.
  if (
    Fauna.species[eid] === FaunaSpecies.Rasp &&
    (stage === FaunaStage.Ambient || stage === FaunaStage.Cooling) &&
    Fauna.scavengeMarkId[eid] !== 0
  ) {
    const mark = world.marks.byId(Fauna.scavengeMarkId[eid]!);
    if (mark === undefined) {
      // Eaten or faded. Nothing left to want; the next sense pass may find
      // another.
      Fauna.scavengeMarkId[eid] = 0;
    } else {
      toX = mark.x;
      toY = mark.y;
      // Park inside the feed radius rather than at its rim, so band-limited
      // depth never leaves the swarm hovering at the 3D boundary.
      stopAtM = DRIFT.SCAVENGE_FEED_RADIUS_M * 0.5;
      scavengeDepth = mark.depth;
      // Feeding is a three-dimensional fact, like a bite: a swarm circling
      // 1,000 m above a wreck its band cannot reach is not stripping it.
      const apart = Math.hypot(mark.x - x, mark.y - y, mark.depth - Position.depth[eid]!);
      if (apart <= DRIFT.SCAVENGE_FEED_RADIUS_M) {
        // The trade §4 names: the quiet evidence is eaten roughly four times
        // faster, and the swarm's own feeding SIG stands in its place.
        world.marks.strip(mark.id, DRIFT.SCAVENGE_STRIP_FACTOR, dt);
        Acoustic.sig[eid] = stats.sigActive;
      }
    }
  }

  if (
    stage === FaunaStage.Interested &&
    target !== 0 &&
    // A coiled Hollow holds its station — the ambush *is* the not-moving
    // (docs/bestiary.md §4's trigger model). Everything else comes to look.
    Fauna.species[eid] !== FaunaSpecies.Hollow
  ) {
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
  // The species' working depth, unless a mission has driven it elsewhere
  // (`Fauna.homeDepth`); the band is measured from wherever it holds.
  const home = Fauna.homeDepth[eid]!;
  let wantDepth = home;
  if (chasing) {
    const theirs = Position.depth[target]!;
    wantDepth = Math.min(home + stats.depthBandM, Math.max(home - stats.depthBandM, theirs));
  } else if (scavengeDepth !== undefined) {
    // Residue pulls a scavenger vertically exactly as prey would, and the
    // band still has the last word: a wreck below the swarm's reach draws it
    // to the band's edge and no further, where it circles without feeding.
    wantDepth = Math.min(home + stats.depthBandM, Math.max(home - stats.depthBandM, scavengeDepth));
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
  // Being eaten is being attacked (docs/ui-ux.md §5). The mixer collapses a
  // sustained bite to one cue per engagement, so raising per sim tick is safe.
  raiseSelfEvent(world, { kind: SelfEventKind.Damaged, eid: target });
  if (Health.hp[target]! <= 0) {
    destroyed.push(target);
    // "Every Hollow kill tells the whole region where it happened" (§4): the
    // strike lays full-intensity battle residue, so the announcement outlives
    // the seconds the strike took. Only the Hollow — its loudness is an
    // *event*, where a pack's is a state the region already heard.
    if (Fauna.species[eid] === FaunaSpecies.Hollow) {
      world.marks.add(
        EchoMarkKind.Battle,
        Position.x[target]!,
        Position.y[target]!,
        Position.depth[target]!,
        1
      );
    }
  }
}
