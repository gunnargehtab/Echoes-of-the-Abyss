/**
 * Pressure system — depth as a rented resource, on a clock.
 *
 * Three ways the water takes hull, all unhealable, all here because they share
 * a ledger and a rule:
 *
 *   - **Crush.** A unit operating below its Pressure Rating takes attrition
 *     that ignores repair and regeneration (docs/systems-depth.md §2). It runs
 *     to zero: overreach long enough and the deep keeps the hull.
 *   - **Shallow water.** A Directorate unit above the Shelf line is being
 *     poisoned by water it was engineered out of (§3, docs/factions.md). It
 *     runs to a floor: 15% of the hull and not one percent more.
 *   - **Sour water.** Any hull above the Lid's 150 m line is in the sea the
 *     Salinity Collapse left behind (§2, docs/world.md). A grace, then a
 *     bleed, and it runs to zero, for every navy at the same rate — the Lid
 *     predates all of them.
 *
 * The asymmetries are the point. Crush is what you pay for taking depth you
 * have not earned, and it may kill you, because renting depth is the bet the
 * whole system is about. The Directorate's shallows price a *region* — being
 * there is not overreaching, so it cannot kill. The Lid prices the one water
 * nothing is rated for, and it kills, because the Collapse was not a tax; the
 * grace window is what keeps it a desperate transit instead of a wall.
 *
 * Nothing here respects healing because all three are defined as unhealable:
 * when a repair system arrives it must not undo any of them, so the attrition
 * is applied directly to hp rather than routed through a damage pipeline that
 * a healer could reverse.
 */

import { defineQuery } from 'bitecs';
import {
  crushAttritionPerSecond,
  directorateShallowAttritionPerSecond,
  directorateShallowHullFloor,
  inLid,
  LID,
  LID_GRACE_RECOVERY_PER_S,
  lidBleedPerSecond,
  SelfEventKind,
  type Faction,
} from '@echoes/shared';
import { Health, Owner, Position, Pressure, Unit } from '../components.ts';
import { raiseSelfEvent, type SimWorld } from '../world.ts';

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
  lidPass(world, dt, destroyed);
}

/**
 * Sour exposure under the Lid — docs/systems-depth.md §2, "The other end of
 * the column". Hulls only, like the Directorate pass and for the same shape of
 * reason: fauna are of the Drift, ordnance is in the water for seconds, and no
 * map floor reaches the Lid for a structure to stand in.
 *
 * Takes `destroyed` because, unlike the shallows, this bleed has no floor:
 * sour water is allowed to kill, and the reaper needs to see it happen in the
 * same place every other death is seen.
 *
 * The one pass of the three that raises a self-event. The other two attrition
 * kinds are continuous costs with no moment in them; this one has a clock, and
 * the instant it runs out is the only thing about the Lid the mix is allowed
 * to announce (docs/audio-direction.md §4, "The Lid").
 */
function lidPass(world: SimWorld, dt: number, destroyed: number[]): void {
  const entities = poisonable(world);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i]!;

    if (!inLid(Position.depth[eid]!)) {
      // Clean water below the boundary wins the grace back — slower than the
      // Lid spends it, so straddling the line is a losing trade (§2).
      if (Pressure.sourS[eid]! > 0) {
        Pressure.sourS[eid] = Math.max(0, Pressure.sourS[eid]! - LID_GRACE_RECOVERY_PER_S * dt);
      }
      continue;
    }

    // Capped at the grace: bleeding is a state, not a deepening debt, and the
    // cap is what makes recovery take exactly RECOVERY_S from the worst case.
    const before = Pressure.sourS[eid]!;
    const sour = Math.min(LID.GRACE_S, before + dt);
    Pressure.sourS[eid] = sour;
    if (sour < LID.GRACE_S) continue;

    // The crossing edge, and only it — docs/audio-direction.md §4 "The Lid".
    // The cap above is what makes this an edge rather than a repeat: once
    // `sourS` sits at the grace it stops moving, so the comparison is false on
    // every tick after the first. Recovery below the grace re-arms it, which
    // is correct — a hull that dived, recovered and climbed back has spent its
    // grace twice and is entitled to be told twice.
    if (before < LID.GRACE_S) {
      raiseSelfEvent(world, { kind: SelfEventKind.SourBleed, eid });
    }

    const bite = lidBleedPerSecond(Health.max[eid]!) * dt;
    Health.hp[eid] = Health.hp[eid]! - bite;
    Pressure.unhealable[eid] = Math.min(Health.max[eid]!, Pressure.unhealable[eid]! + bite);
    if (Health.hp[eid]! <= 0 && !destroyed.includes(eid)) {
      destroyed.push(eid);
    }
  }
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
