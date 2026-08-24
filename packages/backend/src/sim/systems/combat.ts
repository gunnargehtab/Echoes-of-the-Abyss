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
  ORDNANCE,
  OrdnanceKind,
  SelfEventKind,
  statsFor,
  structureStatsFor,
  type StructureKind,
  type UnitKind,
} from '@echoes/shared';
import {
  Health,
  MoveOrder,
  Ordnance,
  Owner,
  Position,
  SilentRunning,
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

function profileFor(world: SimWorld, eid: number): WeaponProfile {
  if (hasComponent(world, Unit, eid)) {
    const stats = statsFor(Unit.kind[eid] as UnitKind);
    return {
      damage: stats.attackDamage,
      rangeM: stats.attackRangeM,
      cooldownS: stats.attackCooldownS,
      firingSig: stats.sigFiringBurst,
    };
  }
  const stats = structureStatsFor(Structure.kind[eid] as StructureKind);
  return {
    damage: stats.attackDamage ?? 0,
    rangeM: stats.attackRangeM ?? 0,
    cooldownS: stats.attackCooldownS ?? 1,
    firingSig: stats.sigFiringBurst ?? 0,
  };
}

function targetAlive(world: SimWorld, eid: number): boolean {
  return eid !== 0 && hasComponent(world, Health, eid) && Health.hp[eid]! > 0;
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
  x: number,
  y: number,
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
    const d = Math.hypot(Position.x[other]! - x, Position.y[other]! - y);
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

    const x = Position.x[eid]!;
    const y = Position.y[eid]!;
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
        target = nearestInboundOrdnance(world, eid, x, y, slot, profile.rangeM);
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
          const d = Math.hypot(Position.x[other]! - x, Position.y[other]! - y);
          if (d <= bestDistance) {
            bestDistance = d;
            target = other;
          }
        }
      }
    }
    if (target === 0) continue;

    const distance = Math.hypot(Position.x[target]! - x, Position.y[target]! - y);
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
      BATTLE_MARK_PER_SHOT
    );
    Health.hp[target] = Health.hp[target]! - profile.damage;
    if (Health.hp[target]! <= 0 && !destroyed.includes(target)) {
      destroyed.push(target);
    }
  }
}
