/**
 * Ordnance stat blocks, transcribed from docs/systems-combat.md.
 *
 * Separate from `units.ts` because ordnance is not a unit and must never be
 * mistaken for one: it is never produced, never selected, never ordered, and
 * the roster-wide helpers in units.ts (`MAX_UNIT_RADIUS_M`, the production
 * tables) would all be wrong if a torpedo appeared in them.
 *
 * What it *does* share with a hull is the acoustic contract — a signature, a
 * position, a hull to be shot off — because that is the whole design: a
 * torpedo swims through the Echo Layer like everything else, so the defender
 * hears it coming (§1).
 */

import { ORDNANCE } from './constants.js';
import { OrdnanceKind } from './types.js';

export interface OrdnanceStats {
  kind: OrdnanceKind;
  name: string;
  /** Sustained SIG while live. docs/systems-combat.md §3. */
  sig: number;
  /** Hull, for ordnance that can be shot down. 0 means it cannot be. */
  maxHp: number;
  /** Metres per second. 0 for ordnance that does not travel. */
  speed: number;
  /** Seconds it stays live. */
  lifetimeS: number;
  /** Damage on detonation. 0 for ordnance that does no damage. */
  damage: number;
  /**
   * Half the physical length, as with a hull — the radius the fuse and the
   * renderer agree on. Ordnance is small; this is mostly a drawing figure.
   */
  radiusM: number;
}

export const ORDNANCE_STATS: Record<OrdnanceKind, OrdnanceStats> = {
  [OrdnanceKind.Torpedo]: {
    kind: OrdnanceKind.Torpedo,
    name: 'Torpedo',
    sig: ORDNANCE.TORPEDO.SIG_RUNNING,
    maxHp: ORDNANCE.TORPEDO.MAX_HP,
    speed: ORDNANCE.TORPEDO.SPEED_MPS,
    lifetimeS: ORDNANCE.TORPEDO.RUN_TIME_S,
    damage: ORDNANCE.TORPEDO.DAMAGE,
    radiusM: 10,
  },
  // The remaining three arrive with the systems that fire them — mines (#165),
  // countermeasures (#164) and depth charges (#167). Their stat blocks are
  // authored here rather than left blank because docs/systems-combat.md §3
  // already fixes their acoustics, and a table that disagreed with the doc
  // while waiting for its system would be the exact drift CLAUDE.md forbids.
  [OrdnanceKind.Mine]: {
    kind: OrdnanceKind.Mine,
    name: 'Mine',
    sig: 2,
    maxHp: 0,
    speed: 0,
    lifetimeS: 300,
    damage: 300,
    radiusM: 6,
  },
  [OrdnanceKind.Noisemaker]: {
    kind: OrdnanceKind.Noisemaker,
    name: 'Noisemaker',
    sig: 70,
    maxHp: 0,
    speed: 0,
    lifetimeS: 8,
    damage: 0,
    radiusM: 6,
  },
  [OrdnanceKind.DepthCharge]: {
    kind: OrdnanceKind.DepthCharge,
    name: 'Depth Charge',
    sig: 30,
    maxHp: 0,
    speed: 0,
    lifetimeS: 30,
    damage: 200,
    radiusM: 8,
  },
};

export function ordnanceStatsFor(kind: OrdnanceKind): OrdnanceStats {
  return ORDNANCE_STATS[kind];
}

/**
 * Is this bearing inside a seeker's forward cone?
 *
 * Shared rather than written inside the ordnance system because the client
 * previews a launch with it: a player is entitled to compute the geometry of
 * their own weapon, and the two must not disagree about where a torpedo will
 * look.
 */
export function withinSeekerCone(
  headingRad: number,
  bearingRad: number,
  coneDeg: number = ORDNANCE.TORPEDO.SEEKER_CONE_DEG
): boolean {
  let delta = bearingRad - headingRad;
  // Wrap into (-pi, pi] so the comparison is against the *smaller* angle
  // between the two bearings, not whichever way round the subtraction landed.
  delta = Math.atan2(Math.sin(delta), Math.cos(delta));
  return Math.abs(delta) <= ((coneDeg / 2) * Math.PI) / 180;
}
