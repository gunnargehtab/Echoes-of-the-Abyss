/**
 * Combat system — direct-fire weapons for units and the Sentinel Turret.
 *
 * Two behaviours, both classic RTS:
 *   - an ordered attack chases its target until in range, then holds and fires;
 *   - anything armed and otherwise unoccupied returns fire at the nearest
 *     enemy inside weapon range.
 *
 * Auto-engagement deliberately ignores the Echo Layer's resolution tiers:
 * weapon ranges (400-900 m) sit far inside the distances at which any combat
 * hull is passively audible, so "in weapon range" implies "heard". Running
 * silent is the exception — a silent unit holds its fire rather than
 * volunteering the +40 break-silence spike, unless the player orders the shot.
 *
 * Every discharge goes through applyFiringSpike: firing is loud, and the first
 * shot of an ambush is the loudest (docs/systems-echo.md §6).
 */

import { defineQuery, hasComponent } from 'bitecs';
import {
  EchoMarkKind,
  Faction,
  ORDNANCE,
  OrdnanceKind,
  SelfEventKind,
  damageMultiplierFor,
  faunaStatsFor,
  firingSigFor,
  statsFor,
  structureStatsFor,
  type FaunaSpecies,
  type StructureKind,
  type UnitKind,
} from '@echoes/shared';
import {
  Acoustic,
  Fauna,
  Health,
  MoveOrder,
  Ordnance,
  Owner,
  Position,
  SilentRunning,
  StaticEmitter,
  Structure,
  UnderConstruction,
  Unit,
  Weapon,
} from '../components.ts';
import { applyFiringSpike } from './acoustics.ts';
import { isInterceptable } from './ordnance.ts';
import { raiseSelfEvent } from '../world.ts';
import type { SimWorld } from '../world.ts';

/**
 * Battle-site intensity added per discharge.
 *
 * TUNABLE. Sized so a brief exchange leaves a faint mark and a sustained fight
 * saturates one: roughly a dozen shots on the same ground reads as a full
 * battle site. Residue should reward a scout for arriving, not for existing.
 */
const BATTLE_MARK_PER_SHOT = 0.09;

const shooters = defineQuery([Weapon, Position, Owner, Health]);
const targetables = defineQuery([Position, Owner, Health]);
/** Ordnance a gun could engage — the point-defence candidate set. */
const interceptable = defineQuery([Ordnance, Position, Owner, Health]);

interface WeaponProfile {
  damage: number;
  rangeM: number;
  cooldownS: number;
  firingSig: number;
}

/**
 * What this shooter's weapon does, doctrine included.
 *
 * The single place a damage number and a firing signature are produced, which
 * is why the two faction traits that bend them belong here rather than at the
 * call sites (docs/systems-combat.md §11):
 *
 *   - the **Klaxon** reads the hull's live SIG, so the Consortium switches its
 *     own bonus on by being loud rather than by owning a stat;
 *   - the **energy class** replaces the hull's kinetic burst outright for the
 *     Knights, because §3 lists the two as different weapons rather than as a
 *     discount on one.
 *
 * Structures take the same doctrine as the navy that built them: a Consortium
 * Sentinel Turret is a Consortium gun.
 */
function profileFor(world: SimWorld, eid: number): WeaponProfile {
  const faction = Owner.faction[eid] as Faction;
  const multiplier = damageMultiplierFor(faction, Acoustic.sig[eid] ?? 0);

  if (hasComponent(world, Unit, eid)) {
    const stats = statsFor(Unit.kind[eid] as UnitKind);
    return {
      damage: stats.attackDamage * multiplier,
      rangeM: stats.attackRangeM,
      cooldownS: stats.attackCooldownS,
      firingSig: firingSigFor(faction, stats.sigFiringBurst),
    };
  }
  const stats = structureStatsFor(Structure.kind[eid] as StructureKind);
  return {
    damage: (stats.attackDamage ?? 0) * multiplier,
    rangeM: stats.attackRangeM ?? 0,
    cooldownS: stats.attackCooldownS ?? 1,
    firingSig: firingSigFor(faction, stats.sigFiringBurst ?? 0),
  };
}

/**
 * Whether a gun may still hold this as its ordered target.
 *
 * The ordnance clause is a fog-of-war fix as much as a combat rule, and it
 * lives *here* rather than in `Match.orderAttackContact` for that reason.
 *
 * Only ordnance with a hull to shoot off may be engaged: a torpedo has 40 HP
 * and point defence is a real answer to it, while a mine has none and a
 * minefield you could delete with gunfire would stop being a wall you route
 * around (docs/systems-combat.md §5). That much was always the intent.
 *
 * Refusing it at the *order* was the mistake. The refusal returned before the
 * plan was touched, so accepting and refusing left the ordering player's own
 * hull in visibly different states — plan wiped or plan intact — and that
 * difference is published straight back to them in `queuedOrders`. It answered
 * "is this ordnance without a hull?" for free, at Tier 1 or 2, when the Echo
 * Layer does not attach `contact.ordnance` until Tier 3. The sharpest case is
 * the Noisemaker: SIG 70, as loud as a cruising Cruiser and meant to be
 * mistaken for one, unmasked by a single attack order costing nothing.
 *
 * Declining here instead makes the order behave exactly like any other, and
 * the target simply reads as no longer valid — the same thing the player sees
 * when a contact dies or slips away. The gun falls through to auto-acquire.
 */
function targetAlive(world: SimWorld, eid: number): boolean {
  if (eid === 0 || !hasComponent(world, Health, eid) || Health.hp[eid]! <= 0) return false;
  if (hasComponent(world, Ordnance, eid) && !isInterceptable(Ordnance.kind[eid] as OrdnanceKind)) {
    return false;
  }
  return true;
}

/**
 * Distance from a shooter to a target, **including depth**.
 *
 * Guns used to measure on the map alone, and the consequence was not subtle:
 * a hull could shoot something 1,400 m below it as easily as something
 * alongside, because the water column simply was not in the arithmetic. That
 * made docs/systems-combat.md §8 false in its most load-bearing sentence — "the
 * Directorate below is safe from guns, not from ordnance that falls" — and left
 * depth charges answering a problem that did not exist.
 *
 * The Echo Layer still resolves on horizontal distance alone, and that
 * asymmetry is deliberate rather than an oversight: depth is a commitment timer
 * in the acoustic model and a real distance in the physical one. Hearing
 * something is not the same as being able to shoot it, and this is the line
 * between those two facts.
 */
function engagementRangeM(shooter: number, target: number): number {
  return Math.hypot(
    Position.x[target]! - Position.x[shooter]!,
    Position.y[target]! - Position.y[shooter]!,
    Position.depth[target]! - Position.depth[shooter]!
  );
}

/**
 * The nearest interceptable piece of enemy ordnance inside terminal range, or 0.
 *
 * Bounded by the *smaller* of the weapon's own reach and the point-defence
 * range: a Cruiser's 900 m gun does not get a 900 m anti-torpedo umbrella, and
 * a short-ranged hull cannot reach further at ordnance than it can at a ship.
 * §5 is explicit that this is a terminal engagement — the last quarter
 * kilometre, not an escort screen.
 */
function nearestInboundOrdnance(
  world: SimWorld,
  shooter: number,
  slot: number,
  weaponRangeM: number
): number {
  const reach = Math.min(weaponRangeM, ORDNANCE.POINT_DEFENCE.RANGE_M);
  const inbound = interceptable(world);
  let best = 0;
  let bestD = reach;

  for (let i = 0; i < inbound.length; i++) {
    const other = inbound[i]!;
    if (other === shooter || Owner.slot[other] === slot) continue;
    if (Health.hp[other]! <= 0) continue;
    if (!isInterceptable(Ordnance.kind[other] as OrdnanceKind)) continue;
    const d = engagementRangeM(shooter, other);
    if (d > bestD) continue;
    bestD = d;
    best = other;
  }
  return best;
}

export function combatSystem(world: SimWorld, destroyed: number[]): void {
  const dt = world.dt;
  const entities = shooters(world);
  const candidates = targetables(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    // A half-built turret has no live fire control yet.
    if (hasComponent(world, UnderConstruction, eid)) continue;

    if (Weapon.cooldownRemainingS[eid]! > 0) {
      Weapon.cooldownRemainingS[eid] = Math.max(0, Weapon.cooldownRemainingS[eid]! - dt);
    }

    const profile = profileFor(world, eid);
    if (profile.damage <= 0) continue;

    const slot = Owner.slot[eid]!;
    const isMobile = hasComponent(world, MoveOrder, eid);
    const silent = hasComponent(world, SilentRunning, eid) && SilentRunning.active[eid] === 1;

    let target = Weapon.orderedTargetEid[eid]!;
    const ordered = targetAlive(world, target);
    if (!ordered) {
      Weapon.orderedTargetEid[eid] = 0;
      target = 0;
      // Auto-acquire: nearest live enemy in range. Silent hulls hold fire, and
      // units already travelling somewhere do not stop to brawl on their own.
      const busy = isMobile && MoveOrder.active[eid] === 1;

      // Point defence first, and only inside the terminal range
      // (docs/systems-combat.md §5). A gun with an inbound torpedo 250 m away
      // has something better to shoot than the hull that launched it — but the
      // choice is the mechanic, not a shield: this consumes the same cooldown
      // as any other shot, so a saturation volley still gets through and the
      // launcher gets a free cycle out of every torpedo it spends.
      //
      // Unlike the hull loop below, ordnance here is not a detection problem:
      // a torpedo runs at SIG 60, which is louder than most of the roster's
      // cruise, and at 250 m it is not merely audible but deafening. The
      // header's "in range implies heard" licence holds here for real.
      if (!silent) {
        target = nearestInboundOrdnance(world, eid, slot, profile.rangeM);
      }

      if (target === 0 && !silent && !busy) {
        let bestDistance = profile.rangeM;
        for (let j = 0; j < candidates.length; j++) {
          const other = candidates[j]!;
          if (Owner.slot[other] === slot || Health.hp[other]! <= 0) continue;
          // Ordnance is never auto-acquired by a gun.
          //
          // The header's licence for ignoring resolution tiers is that weapon
          // ranges sit inside the distance at which any combat *hull* is
          // audible, so "in range" implies "heard". Ordnance breaks that: a
          // mine sits at SIG 2 and is inaudible at any range, so a turret that
          // swung onto one would be shooting something it could not possibly
          // have detected — a maphack expressed as gunfire. Engaging a torpedo
          // is point defence, and point defence is a deliberate act
          // (docs/systems-combat.md §5), so it gets its own path rather than
          // falling out of the auto-acquire loop.
          if (hasComponent(world, Ordnance, other)) continue;
          // Nor is an authored static emitter — the mine's argument again:
          // between strikes the taps sit at SIG 0 and are inaudible at any
          // range, so a gun that swung onto one would be shooting something it
          // could not possibly have detected. An *ordered* shot at its resolved
          // contact still lands — the emitter carries authored hp and a player
          // may spend shells on struck iron — and refusing the order instead
          // would unmask it, the Noisemaker lesson above.
          if (hasComponent(world, StaticEmitter, other)) continue;
          // Nor is a harmless ambient creature — the mine's argument a third
          // time. A Lampfry shoal glows at SIG 4 and is inaudible to any gun
          // at any range it could shoot from, so a turret swinging onto one
          // is firing on something it never heard. It is also the tell layer:
          // guns sweeping shoals by default would quietly delete §4's scatter
          // mechanic and bill Drift Health for it. An *ordered* shot at a
          // resolved shoal still lands — burning a region's tells is a choice
          // the design prices (docs/bestiary.md §6), not one it makes for you.
          if (
            hasComponent(world, Fauna, other) &&
            !Number.isFinite(faunaStatsFor(Fauna.species[other] as FaunaSpecies).commit)
          ) {
            continue;
          }
          const d = engagementRangeM(eid, other);
          if (d <= bestDistance) {
            bestDistance = d;
            target = other;
          }
        }
      }
    }
    if (target === 0) continue;

    const distance = engagementRangeM(eid, target);
    if (distance > profile.rangeM) {
      // Only an explicit order chases; auto-acquired targets were in range by
      // construction. Turrets have no MoveOrder and simply wait.
      if (ordered && isMobile) {
        MoveOrder.x[eid] = Position.x[target]!;
        MoveOrder.y[eid] = Position.y[target]!;
        MoveOrder.active[eid] = 1;
      }
      continue;
    }

    if (ordered && isMobile && MoveOrder.active[eid] === 1) {
      // In range: hold position to shoot.
      MoveOrder.active[eid] = 0;
    }

    if (Weapon.cooldownRemainingS[eid]! > 0) continue;
    Weapon.cooldownRemainingS[eid] = profile.cooldownS;
    if (applyFiringSpike(eid, profile.firingSig)) {
      raiseSelfEvent(world, { kind: SelfEventKind.BreakSilence, eid });
    }
    // Residue, laid down at the target rather than the shooter: a scout that
    // finds a battle site should find where the fighting *was*, and the losing
    // side is the one that stayed still (docs/systems-echo.md §7).
    //
    // A small increment per discharge, merged by the layer, so intensity ends
    // up meaning "how much shooting happened here" rather than "shooting
    // happened here" — a skirmish and a massacre read differently.
    world.marks.add(
      EchoMarkKind.Battle,
      Position.x[target]!,
      Position.y[target]!,
      Position.depth[target]!,
      BATTLE_MARK_PER_SHOT
    );
    Health.hp[target] = Health.hp[target]! - profile.damage;
    // The victim's owner is told a blow landed (docs/ui-ux.md §5). An event,
    // not an inference: a client watching its own hp could not tell a shell
    // from crush attrition, and §8 keeps those on different channels.
    //
    // Hulls only. Point defence shoots *ordnance*, and a torpedo is not one of
    // your units — telling its owner their plating was struck would be a cue
    // with nothing behind it, and would quietly report that somebody's unseen
    // gun engaged their fish.
    if (!hasComponent(world, Ordnance, target)) {
      raiseSelfEvent(world, { kind: SelfEventKind.Damaged, eid: target });
    }
    if (Health.hp[target]! <= 0 && !destroyed.includes(target)) {
      destroyed.push(target);
    }
  }
}
