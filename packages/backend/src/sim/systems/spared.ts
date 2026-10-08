/**
 * A spared party, and the blow that wakes it — docs/systems-combat.md §4
 * (#1239).
 *
 * A party its mission says is never fought carries `Spared` from install: no
 * gun or deck volunteers for it, and its own volunteer nothing either. The
 * first gun, torpedo, blast or spore from another slot to land on any of it
 * ends that for the whole party — every hull and structure seated in it loses
 * the tag on that tick, and from then on both sides fight as any two slots
 * do. Shooting one is the player's decision, the way breaking silence is, and
 * a party that has been shot answers.
 *
 * Called beside `creditWound`, which marks the same four blows for the
 * economy: they are the hits somebody fired. A corridor's bite, a creature's,
 * the crush and the weather are not fire, so none of them wakes a party —
 * Standing Wave's column walks through the instrument the works built and
 * turns around, which is the mission (docs/mission-standing-wave.md §5).
 *
 * Not hashed, unlike most durable state: a wake happens on the tick a blow
 * lands, and the blow's hit points are already in the fingerprint then.
 */
import { addComponent, defineQuery, hasComponent, removeComponent } from 'bitecs';
import { Owner, Spared } from '../components.ts';
import type { SimWorld } from '../world.ts';

const spared = defineQuery([Spared, Owner]);

/** Mark a seated hull or structure as one of party `party`'s, spared. */
export function spare(world: SimWorld, eid: number, party: number): void {
  addComponent(world, Spared, eid);
  Spared.party[eid] = party;
}

/** A blow fired by `slot` landed on `target`: wake its party, if it is spared. */
export function wakeSpared(world: SimWorld, target: number, slot: number): void {
  if (!hasComponent(world, Spared, target)) return;
  const own = Owner.slot[target]!;
  if (own === slot) return;
  const party = Spared.party[target]!;
  // Collected before any removal: a query's array is live.
  const members = spared(world).filter(
    (eid) => Owner.slot[eid] === own && Spared.party[eid] === party
  );
  for (const eid of members) removeComponent(world, Spared, eid);
}
