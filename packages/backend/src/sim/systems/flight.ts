/**
 * The flight — docs/systems-combat.md §15, docs/units.md "The carriers"
 * (wave 8 of docs/roster-plan.md, #838).
 *
 * A carrier is a hull with a deck and no gun; a flight is what the deck
 * builds. This system is the whole mechanism except its ending: the rebuild
 * clock, the launch and its noise, and what a craft in the water does with
 * itself. The ending is in `Match.reap`, beside the hold's, because the flight
 * dies with its carrier for the same reason the load does — guidance is the
 * carrier's — and a death has to be made real in one place.
 *
 * The inversion is worth stating once, because the two mechanisms read alike
 * and do opposite things: **a hold takes hulls out of the water and a deck
 * puts them in.** A carried hull loses its `Position`, which is what removes
 * it from every system; a craft has one from the moment it launches and is an
 * ordinary hull to every system there is. It is heard by the Echo pass, shot
 * at by guns, eaten by fauna and spaced by separation, with no special case
 * anywhere — and §15 says why that must stay true: the hidden information a
 * carrier holds is *where the carrier is*, which its flight does not answer.
 *
 * What this system does not do, deliberately:
 *
 * - **Aim.** A craft is armed, so `combatSystem` acquires and shoots for it
 *   exactly as it does for a Corvette. All this does is hand the craft its
 *   carrier's ordered target, which is what "they attack the carrier's target"
 *   means in a simulation that already has ordered targets.
 * - **Move it in any special way.** A craft takes plain `MoveOrder`s and is
 *   routed and heard like anything else under way.
 * - **Refuse it orders.** `Match.owns` does that, by the component: a craft
 *   takes no order of its own, exactly as a hull in a hold does not.
 */

import { addComponent, defineQuery, hasComponent } from 'bitecs';
import {
  DIRECTIONAL_SIGNATURE,
  FLIGHT,
  Faction,
  SelfEventKind,
  faunaStatsFor,
  statsFor,
  unitRadiusM,
  type FaunaSpecies,
  type UnitKind,
} from '@echoes/shared';
import {
  Craft,
  Fauna,
  Flightdeck,
  Health,
  Heading,
  MoveOrder,
  Ordnance,
  Owner,
  Position,
  SilentRunning,
  StaticEmitter,
  Unit,
  UnderConstruction,
  Velocity,
  Weapon,
} from '../components.ts';
import { applyFiringSpike } from './acoustics.ts';
import { clearQueue } from './orderQueue.ts';
import { raiseSelfEvent, spawnUnit } from '../world.ts';
import type { SimWorld } from '../world.ts';

const decks = defineQuery([Flightdeck, Position, Owner, Health, Unit]);
const flying = defineQuery([Craft, Position, Owner, Health, Unit]);
const targetables = defineQuery([Position, Owner, Health]);

/**
 * How close to its station a craft has to be before it stops steering for it.
 *
 * A craft that re-aimed at the ring every tick would never have `MoveOrder`
 * off, and a hull with a live move order does not stop to brawl on its own
 * (`combatSystem`) — so the tolerance is what lets a stationed flight return
 * fire at all. Generous, because the ring is a screen and not a formation.
 */
const STATION_TOLERANCE_M = 70;

/** Take a craft out of its carrier's flight, on its death or its carrier's. */
export function forgetCraft(world: SimWorld, eid: number): void {
  if (!hasComponent(world, Craft, eid)) return;
  const flight = world.flights.get(Craft.carrier[eid]!);
  if (flight === undefined) return;
  const at = flight.indexOf(eid);
  if (at >= 0) flight.splice(at, 1);
}

/**
 * Is this enemy something a deck should open for?
 *
 * The same filters `combatSystem`'s auto-acquire applies, and for the same
 * reason: a mine sits at SIG 2 and a shoal at SIG 4, so a carrier that
 * launched at one would be reacting to something nobody could have heard. What
 * is left — hulls, structures, and the creatures that commit — is what §15's
 * "a live enemy within the tether" means.
 */
function worthLaunchingAt(world: SimWorld, eid: number): boolean {
  if (hasComponent(world, Ordnance, eid)) return false;
  if (hasComponent(world, StaticEmitter, eid)) return false;
  if (
    hasComponent(world, Fauna, eid) &&
    !Number.isFinite(faunaStatsFor(Fauna.species[eid] as FaunaSpecies).commit)
  ) {
    return false;
  }
  return true;
}

/** Is `target` inside this hull's own cone? The Lance's gate (§5, §15). */
function insideCone(world: SimWorld, carrier: number, target: number): boolean {
  if (!hasComponent(world, Heading, carrier)) return false;
  const bearing = Math.atan2(
    Position.y[target]! - Position.y[carrier]!,
    Position.x[target]! - Position.x[carrier]!
  );
  let off = bearing - Heading.rad[carrier]!;
  off = Math.abs(Math.atan2(Math.sin(off), Math.cos(off)));
  return off <= (DIRECTIONAL_SIGNATURE.CONE_HALF_ANGLE_DEG * Math.PI) / 180;
}

/** Flat distance between two entities that both have a position. */
function rangeM(a: number, b: number): number {
  return Math.hypot(Position.x[b]! - Position.x[a]!, Position.y[b]! - Position.y[a]!);
}

/**
 * The nearest enemy inside the tether that this deck may launch at, or 0.
 *
 * Bounded by `FLIGHT.TETHER_M`, which is the one figure doing both of §15's
 * jobs: the reach a deck opens over is the reach its craft may operate at, so
 * a carrier can never put a craft somewhere it could not have launched at.
 */
function triggerFor(world: SimWorld, carrier: number, coneGated: boolean): number {
  const slot = Owner.slot[carrier]!;
  const candidates = targetables(world);
  let best = 0;
  let bestD: number = FLIGHT.TETHER_M;
  for (let i = 0; i < candidates.length; i++) {
    const other = candidates[i]!;
    // Counted where `combatSystem` counts its own walk, and for its reason:
    // the walk is the cost, whether or not the pair survives a filter.
    world.stepWork.acquisitionPairs++;
    if (Owner.slot[other] === slot || Health.hp[other]! <= 0) continue;
    if (!worthLaunchingAt(world, other)) continue;
    const d = rangeM(carrier, other);
    if (d > bestD) continue;
    if (coneGated && !insideCone(world, carrier, other)) continue;
    bestD = d;
    best = other;
  }
  return best;
}

/** Where on its carrier's ring this craft stands, in world coordinates. */
function stationFor(
  world: SimWorld,
  carrier: number,
  station: number,
  places: number
): { x: number; y: number } {
  const angle = (station / Math.max(1, places)) * Math.PI * 2;
  return {
    x: world.terrain.clampXM(Position.x[carrier]! + Math.cos(angle) * FLIGHT.STATION_RING_M),
    y: world.terrain.clampYM(Position.y[carrier]! + Math.sin(angle) * FLIGHT.STATION_RING_M),
  };
}

/**
 * One craft into the water, off this carrier's ring and at its depth.
 *
 * The ring index is `Flightdeck.launched` rather than anything random: where a
 * craft enters the water has to be a function of the simulation's own history
 * or two runs of one match diverge, which `stateHash.ts` exists to catch.
 */
function launch(world: SimWorld, carrier: number): void {
  const deck = statsFor(Unit.kind[carrier] as UnitKind).flight!;
  const places = deck.capacity;
  const station = Flightdeck.launched[carrier]! % places;
  const angle = (station / places) * Math.PI * 2;
  const ring = unitRadiusM(Unit.kind[carrier] as UnitKind) * FLIGHT.LAUNCH_RING_RADII;

  const eid = spawnUnit(world, {
    kind: deck.craft,
    slot: Owner.slot[carrier]!,
    faction: Owner.faction[carrier] as Faction,
    x: world.terrain.clampXM(Position.x[carrier]! + Math.cos(angle) * ring),
    y: world.terrain.clampYM(Position.y[carrier]! + Math.sin(angle) * ring),
    // The band the carrier is holding, and the only one this craft will ever
    // have: §15's depth rule is the hull having no drive for the column, so
    // the depth it is launched into is the depth it dies at.
    depth: Position.depth[carrier]!,
    heading: hasComponent(world, Heading, carrier) ? Heading.rad[carrier]! : 0,
  });

  addComponent(world, Craft, eid);
  Craft.carrier[eid] = carrier;
  Craft.enduranceRemainingS[eid] = FLIGHT.ENDURANCE_S;
  Craft.station[eid] = station;

  let flight = world.flights.get(carrier);
  if (flight === undefined) {
    flight = [];
    world.flights.set(carrier, flight);
  }
  flight.push(eid);

  Flightdeck.aboard[carrier] = Flightdeck.aboard[carrier]! - 1;
  Flightdeck.launched[carrier] = Flightdeck.launched[carrier]! + 1;
  Flightdeck.launchRemainingS[carrier] = FLIGHT.LAUNCH_INTERVAL_S;

  // The deck opening, and the one loud thing a carrier ever does. On the hull
  // and never on the craft (§15), through the same path a discharge takes — so
  // an ordered launch out of Silent Running breaks that silence at the usual
  // +40, exactly as an ordered shot does.
  if (applyFiringSpike(carrier, FLIGHT.LAUNCH_SIG)) {
    raiseSelfEvent(world, { kind: SelfEventKind.BreakSilence, eid: carrier });
  }
}

export function flightSystem(world: SimWorld, destroyed: number[]): void {
  const dt = world.dt;

  // The craft first, so a cell that runs out this tick frees its place on the
  // deck this tick: the rebuild clock below reads what is actually in the
  // water, and a deck that waited a tick to notice would drift one launch
  // behind its own losses over a long match.
  const craft = flying(world);
  for (let i = 0; i < craft.length; i++) {
    const eid = craft[i]!;
    if (Health.hp[eid]! <= 0) continue;

    Craft.enduranceRemainingS[eid] = Craft.enduranceRemainingS[eid]! - dt;
    if (Craft.enduranceRemainingS[eid]! <= 0) {
      // Not a kill: nobody is credited, no residue is laid, and the Drift is
      // not billed for it. The cell simply stops (§15).
      Health.hp[eid] = 0;
      forgetCraft(world, eid);
      destroyed.push(eid);
      continue;
    }

    const carrier = Craft.carrier[eid]!;
    // A carrier that is gone takes its flight with it in `Match.reap`, on the
    // tick it dies. Anything else here is a carrier mid-death this tick, and
    // the craft simply holds its course until reap makes both deaths real.
    if (!hasComponent(world, Position, carrier) || Health.hp[carrier]! <= 0) continue;

    const ordered = Weapon.orderedTargetEid[carrier] ?? 0;
    const targetLives =
      ordered !== 0 && hasComponent(world, Health, ordered) && Health.hp[ordered]! > 0;
    // A target the carrier has left behind is not the flight's business: the
    // tether bounds what a flight may be sent at, not only where it may go, so
    // the two halves of §15's one figure cannot disagree.
    const inReach =
      targetLives && hasComponent(world, Position, ordered)
        ? rangeM(carrier, ordered) <= FLIGHT.TETHER_M
        : false;

    if (rangeM(eid, carrier) > FLIGHT.TETHER_M) {
      // Recalled. Whatever it was doing is dropped — the craft is outside the
      // water its carrier can guide it in, and coming back is the only order
      // it has.
      if (hasComponent(world, Weapon, eid)) Weapon.orderedTargetEid[eid] = 0;
      MoveOrder.x[eid] = Position.x[carrier]!;
      MoveOrder.y[eid] = Position.y[carrier]!;
      MoveOrder.active[eid] = 1;
      continue;
    }

    if (inReach) {
      if (hasComponent(world, Weapon, eid)) Weapon.orderedTargetEid[eid] = ordered;
      continue;
    }

    // Nothing ordered: the craft is released to fight what it can reach on its
    // own (`combatSystem` auto-acquires for it, as for any armed hull) and to
    // stand on its ring otherwise.
    if (hasComponent(world, Weapon, eid)) Weapon.orderedTargetEid[eid] = 0;
    const places = statsFor(Unit.kind[carrier] as UnitKind).flight?.capacity ?? 1;
    const station = stationFor(world, carrier, Craft.station[eid]!, places);
    if (
      Math.hypot(station.x - Position.x[eid]!, station.y - Position.y[eid]!) > STATION_TOLERANCE_M
    ) {
      MoveOrder.x[eid] = station.x;
      MoveOrder.y[eid] = station.y;
      MoveOrder.active[eid] = 1;
    } else if (MoveOrder.active[eid] === 1) {
      // On station. The order is dropped rather than left running, because a
      // hull with a live move order does not return fire on its own.
      MoveOrder.active[eid] = 0;
      Velocity.x[eid] = 0;
      Velocity.y[eid] = 0;
      clearQueue(world, eid);
      world.paths.delete(eid);
    }
  }

  const carriers = decks(world);
  for (let i = 0; i < carriers.length; i++) {
    const eid = carriers[i]!;
    if (Health.hp[eid]! <= 0) continue;
    // A hull still on the ways has no deck crew yet — the half-built turret's
    // rule, and it can only be reached by a mission seating one.
    if (hasComponent(world, UnderConstruction, eid)) continue;

    const deck = statsFor(Unit.kind[eid] as UnitKind).flight!;
    const flight = world.flights.get(eid);
    const alive = flight === undefined ? 0 : flight.length;

    // The rebuild clock. `capacity` counts the shed and the water together, so
    // a full flight builds nothing and a craft lost starts the clock.
    if (Flightdeck.aboard[eid]! + alive < deck.capacity) {
      if (Flightdeck.rebuildRemainingS[eid]! <= 0) {
        Flightdeck.rebuildRemainingS[eid] = deck.rebuildS;
      } else {
        Flightdeck.rebuildRemainingS[eid] = Flightdeck.rebuildRemainingS[eid]! - dt;
        if (Flightdeck.rebuildRemainingS[eid]! <= 0) {
          Flightdeck.aboard[eid] = Flightdeck.aboard[eid]! + 1;
          Flightdeck.rebuildRemainingS[eid] = 0;
        }
      }
    } else {
      Flightdeck.rebuildRemainingS[eid] = 0;
    }

    if (Flightdeck.launchRemainingS[eid]! > 0) {
      Flightdeck.launchRemainingS[eid] = Math.max(0, Flightdeck.launchRemainingS[eid]! - dt);
      continue;
    }
    if (Flightdeck.aboard[eid]! <= 0) continue;

    const coneGated = deck.coneGatedLaunch === true;
    const ordered = Weapon.orderedTargetEid[eid] ?? 0;
    const orderStands =
      ordered !== 0 &&
      hasComponent(world, Health, ordered) &&
      Health.hp[ordered]! > 0 &&
      hasComponent(world, Position, ordered) &&
      rangeM(eid, ordered) <= FLIGHT.TETHER_M &&
      (!coneGated || insideCone(world, eid, ordered));

    if (orderStands) {
      launch(world, eid);
      continue;
    }

    // Unordered, the deck opens on its own — unless the hull is running
    // silent, which is `combatSystem`'s rule for guns applied to the hull that
    // has none: a silent hull volunteers nothing, and an order overrides it.
    const silent = hasComponent(world, SilentRunning, eid) && SilentRunning.active[eid] === 1;
    if (silent) continue;
    if (triggerFor(world, eid, coneGated) !== 0) launch(world, eid);
  }
}
