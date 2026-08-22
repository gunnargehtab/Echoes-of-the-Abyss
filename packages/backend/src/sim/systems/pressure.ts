/**
 * Pressure system — depth as a rented resource, on a clock.
 *
 * A unit operating below its Pressure Rating takes crush attrition that
 * ignores repair and regeneration (docs/systems-depth.md §2). Nothing here
 * respects healing because the damage is defined as unhealable: when a repair
 * system arrives it must not undo this, so the attrition is applied directly to
 * hp rather than routed through a damage pipeline that a healer could reverse.
 */

import { defineQuery } from 'bitecs';
import { crushAttritionPerSecond } from '@echoes/shared';
import { Health, Position, Pressure } from '../components.ts';
import type { SimWorld } from '../world.ts';

const crushable = defineQuery([Position, Pressure, Health]);

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

    Health.hp[eid] = Health.hp[eid]! - dps * dt;
    if (Health.hp[eid]! <= 0 && !destroyed.includes(eid)) {
      destroyed.push(eid);
    }
  }
}
