/**
 * bitecs' `defineQuery`, with a world's existing entities admitted in spawn
 * order rather than id order (#1279). Every simulation query is defined here.
 *
 * bitecs registers a query on a world the first time it is called there, and
 * registering walks the entities already alive in ascending id order
 * (`registerQuery`, bitecs 0.3.40). Every later entity joins at the end, in
 * the order it gained the components. On fresh ids ascending id is spawn
 * order, so nobody could tell. On recycled ids it is not: a disposed match
 * (#1278) hands its ids back to a process-wide queue, the next match's map is
 * seated on them in whatever order they were freed, and the first call of
 * every query lists that match's hulls in an order no other run shares. Each
 * pass that walks a query in its order then lands on different bits: the
 * Drift's per-region noise sums, which structure a commander queues at.
 *
 * So on its first call in a world, a query's members are re-sorted by their
 * match-local id, which `registerEntity` hands out in spawn order. bitecs'
 * dense array keeps its sparse index in step through `sort`, so the query is
 * reordered in place and stays reordered. On fresh ids the two orders are the
 * same, so a match nobody recycled for reads exactly as it did before.
 */

import { defineQuery as defineBitecsQuery, type Query } from 'bitecs';
import { compareSpawnOrder, type SimWorld } from './world.ts';

export function defineQuery(components: Parameters<typeof defineBitecsQuery>[0]): Query<SimWorld> {
  const query = defineBitecsQuery(components) as Query<SimWorld>;
  const registered = new WeakSet<SimWorld>();
  // The last world seen, so the steady state is one comparison per call: a
  // match calls its queries on one world, many times a tick.
  let last: SimWorld | null = null;
  return (world: SimWorld) => {
    if (world !== last && !registered.has(world)) {
      registered.add(world);
      // Registers the query, admitting what is alive in ascending id order.
      const members = query(world);
      members.sort((a, b) => compareSpawnOrder(world, a, b));
      last = world;
      return members;
    }
    last = world;
    return query(world);
  };
}
