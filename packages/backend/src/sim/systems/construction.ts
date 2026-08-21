/**
 * Construction system — structures rise over time, and rise loudly.
 *
 * While UnderConstruction, a site holds CONSTRUCTION.SITE_SIG (acoustics owns
 * that; this system owns the clock) and its hull grows from the placement
 * fraction to full. Commissioning a forward refinery is therefore a regional
 * announcement lasting the whole build time — which is the point.
 */

import { defineQuery, removeComponent } from 'bitecs';
import { CONSTRUCTION } from '@echoes/shared';
import { Health, Structure, UnderConstruction } from '../components.ts';
import type { SimWorld } from '../world.ts';

const sites = defineQuery([Structure, UnderConstruction, Health]);

export function constructionSystem(world: SimWorld): void {
  const dt = world.dt;
  const entities = sites(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;
    const total = UnderConstruction.totalS[eid]!;
    const remaining = Math.max(0, UnderConstruction.remainingS[eid]! - dt);
    UnderConstruction.remainingS[eid] = remaining;

    // Hull accrues at the build rate rather than tracking absolute progress,
    // so battle damage taken during the build stays subtracted — the builder
    // adds plate, it does not repair.
    if (total > 0) {
      const accrual = Health.max[eid]! * (1 - CONSTRUCTION.INITIAL_HP_FRACTION) * (dt / total);
      Health.hp[eid] = Math.min(Health.max[eid]!, Health.hp[eid]! + accrual);
    }

    if (remaining <= 0) {
      removeComponent(world, UnderConstruction, eid);
    }
  }
}
