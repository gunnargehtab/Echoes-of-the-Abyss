/**
 * Pressure system — depth as a rented resource, on a clock.
 *
 * Two ways depth takes hull, both unhealable, both here because they share a
 * ledger and a rule:
 *
 *   - **Crush.** A unit operating below its Pressure Rating takes attrition
 *     that ignores repair and regeneration (docs/systems-depth.md §2). It runs
 *     to zero: overreach long enough and the deep keeps the hull.
 *   - **Shallow water.** A Directorate unit above the Shelf line is being
 *     poisoned by water it was engineered out of (§3, docs/factions.md). It
 *     runs to a floor: 15% of the hull and not one percent more.
 *
 * The asymmetry is the point. Crush is what you pay for taking depth you have
 * not earned, and it is allowed to kill you, because renting depth is the bet
 * the whole system is about. The Directorate's shallows are a *terrain* cost —
 * they are not overreaching, they are simply in the wrong sea — so it prices a
 * region rather than a gamble, and pricing it in lives would make the Shelf a
 * wall instead of a tax.
 *
 * Nothing here respects healing because both are defined as unhealable: when a
 * repair system arrives it must not undo either, so the attrition is applied
 * directly to hp rather than routed through a damage pipeline that a healer
 * could reverse.
 */

import { defineQuery } from 'bitecs';
import {
  crushAttritionPerSecond,
  directorateShallowAttritionPerSecond,
  directorateShallowHullFloor,
  type Faction,
} from '@echoes/shared';
import { Health, Owner, Position, Pressure, Unit } from '../components.ts';
import type { SimWorld } from '../world.ts';

const crushable = defineQuery([Position, Pressure, Health]);

/**
 * Hulls only. Fauna are of the Drift and belong to no faction, ordnance is in
 * the water for seconds and has no biology to poison, and a structure cannot
 * rise — a base that bled because the map put it shallow would be a penalty
 * with no counterplay.
 *
 * `Unit` is what says so. Today it is technically redundant, because only
 * `spawnUnit` attaches `Pressure` and the other three are excluded by that
 * alone — but that is a coincidence of the current spawners rather than a rule,
 * and "shallow water poisons Directorate *soldiers*" should not be resting on
 * which components a torpedo happens not to carry.
 */
const poisonable = defineQuery([Position, Owner, Unit, Pressure, Health]);

/**
 * Applies crush attrition and records anything it kills into `destroyed`.
 * Reaping happens once per tick in Match, after every system that can kill has
 * run — combat and pressure may both claim the same hull in one step, and the
 * win-condition check needs to see every death in one place.
 */
export function pressureSystem(world: SimWorld, destroyed: number[]): void {
  const dt = world.dt;
  const entities = crushable(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    // Effective rating includes any Sounding Spire grant — rented depth is
    // real depth for exactly as long as the aura holds.
    const rating = Pressure.rating[eid]! + Pressure.bonus[eid]!;
    const dps = crushAttritionPerSecond(rating, Position.depth[eid]!);
    if (dps <= 0) continue;

    const bite = dps * dt;
    Health.hp[eid] = Health.hp[eid]! - bite;
    // Remember what the deep took, so the HUD can show it as unrecoverable
    // rather than as ordinary damage. Capped at max so a long overreach cannot
    // report more lost hull than the hull ever had.
    Pressure.unhealable[eid] = Math.min(Health.max[eid]!, Pressure.unhealable[eid]! + bite);
    if (Health.hp[eid]! <= 0 && !destroyed.includes(eid)) {
      destroyed.push(eid);
    }
  }

  shallowWaterPass(world, dt);
}

/**
 * The Directorate's half of docs/systems-depth.md §3 — the other one is in
 * `movementSystem`, because a speed multiplier belongs with movement.
 *
 * Takes no `destroyed` argument, and that is a statement rather than an
 * oversight: the floor sits at a positive fraction of max hull, so this pass
 * cannot reduce a hull to zero and has nothing to report. If the floor ever
 * became reachable-at-zero, this signature would have to change, which is the
 * cheapest possible alarm for that.
 */
function shallowWaterPass(world: SimWorld, dt: number): void {
  const entities = poisonable(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    const maxHp = Health.max[eid]!;
    const dps = directorateShallowAttritionPerSecond(
      Owner.faction[eid] as Faction,
      Position.depth[eid]!,
      maxHp
    );
    if (dps <= 0) continue;

    // A hull already below the floor — shot down to it, or bled to it on an
    // earlier visit — has nothing left for the shallows to take. That is what
    // makes the penalty a one-time 15% rather than a per-visit one: the water
    // is not doing fresh damage each time you come up, it is the same damage
    // finding the same ceiling.
    const floor = directorateShallowHullFloor(maxHp);
    const hp = Health.hp[eid]!;
    if (hp <= floor) continue;

    // Clamped so the hull lands *on* the floor. Without this a hull would step
    // past it by whatever fraction of a tick was left over, which is small,
    // silent, and exactly the sort of thing that makes an assertion about the
    // floor flaky rather than false.
    const bite = Math.min(dps * dt, hp - floor);
    Health.hp[eid] = hp - bite;
    Pressure.unhealable[eid] = Math.min(maxHp, Pressure.unhealable[eid]! + bite);
  }
}
