/**
 * The Hadron tithe — docs/economy.md §6.
 *
 * "Knights take a tithe: fixed periodic income from each chapter-house,
 * independent of extraction."
 *
 * This is the mechanic §9 names as the mitigation for "Knights starve out of
 * every long game", and until now it did not exist — which the balance harness
 * caught as a breached guard-rail rather than as anything a test could see
 * (#140). Their economy ran on extraction like everybody's, so it fell with
 * map control like everybody's, and the faction whose whole identity is a
 * floor that never falls had no floor at all.
 *
 * **Flat per commander, not per building.** §6's next sentence makes them "the
 * only faction whose economy does not scale with map control", and paying per
 * Sounding Spire would scale with precisely that. The chapter-houses are the
 * Order's nine home institutions in Resonance Fields (docs/factions.md), not
 * things you build: they tithe to the Order, the Order funds the expedition.
 *
 * It stops when the Bastion falls. That is the expedition ending rather than
 * the Order's income drying up — and it keeps the elimination rule honest,
 * since a slot with no Bastion is being scuttled anyway.
 */

import { defineQuery, hasComponent } from 'bitecs';
import { Faction, HADRON, StructureKind } from '@echoes/shared';
import { Owner, Structure, UnderConstruction } from '../components.ts';
import { economyFor, type SimWorld } from '../world.ts';

const structures = defineQuery([Structure, Owner]);

export function titheSystem(world: SimWorld): void {
  const found = structures(world);
  if (found.length === 0) return;

  // One pass, collecting slots rather than paying inline: a commander with two
  // Bastions is not a thing today, but paying per Bastion would quietly make
  // it one the day it becomes possible.
  const paid = new Set<number>();
  for (let i = 0; i < found.length; i++) {
    const eid = found[i]!;
    if (Owner.faction[eid] !== Faction.Hadron) continue;
    if (Structure.kind[eid] !== StructureKind.Bastion) continue;
    // A site under construction is not yet a seat of anything. The opening
    // Bastion is pre-built, so this only matters if one is ever rebuilt.
    if (hasComponent(world, UnderConstruction, eid)) continue;
    paid.add(Owner.slot[eid]!);
  }

  if (paid.size === 0) return;
  const payment = HADRON.TITHE_PER_S * world.dt;
  for (const slot of paid) {
    economyFor(world, slot).nodules += payment;
  }
}
