/**
 * A finished match gives its world back (#1278).
 *
 * bitecs keeps every world in a module-global list, and an id returns to its
 * queue only when its entity is removed. A room that merely dropped its Match
 * kept the whole world reachable and spent its ids for good: for a two-second
 * two-player match, 1.4 MB and about 68 ids, so past id 100,000 `addEntity`
 * threw "max entities reached" in every room of the process within some 1,470
 * such matches, and sooner with real ones. Held here by the ids, which are
 * counted, and by what the world held, which a full collection must be able
 * to take.
 *
 * Its own file: the id test reads bitecs' process-wide id queue, which every
 * other match built in the same process would also be feeding.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { Faction, SIM } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** Node's own, which the backend's ES2020 library does not declare. */
declare class WeakRef<T extends object> {
  constructor(target: T);
  deref(): T | undefined;
}

/** A two-player skirmish, two seconds in. */
function played(seed: number): Match {
  const match = new Match(undefined, { seed });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  for (let tick = 0; tick < 2 * SIM.TICK_HZ; tick++) match.update(STEP_MS);
  return match;
}

describe('a disposed match (#1278)', () => {
  it('hands its entity ids back, so a long-lived process never runs out', () => {
    // bitecs reuses a removed id once more than 1,000 are waiting (its default
    // threshold, 1% of 100,000). Forty matches spend about 2,700 ids; given
    // back, the later ones are seated on the earlier ones' ids, so the highest
    // id any of them holds stops near the threshold instead of climbing.
    let highest = 0;
    for (let i = 0; i < 40; i++) {
      const match = played(100 + i);
      highest = Math.max(highest, match.world.maxEid);
      match.dispose();
    }
    assert.ok(highest < 1500, `the ids kept climbing, to ${highest} by the fortieth match`);
  });

  it('lets go of what its world held', async () => {
    setFlagsFromString('--expose-gc');
    const gc = runInNewContext('gc') as () => void;
    // The world object itself stays keyed in bitecs' id map until its ids are
    // reused, emptied; what must go is what it held. The route planner stands
    // for the rest of it: a per-world object that only the world refers to.
    const held: WeakRef<object>[] = [];
    for (let i = 0; i < 5; i++) {
      const match = played(200 + i);
      held.push(new WeakRef(match.world.pathfinder));
      match.dispose();
    }
    // A WeakRef keeps its target to the end of the job that made it.
    await new Promise((resolve) => setImmediate(resolve));
    gc();
    const kept = held.filter((ref) => ref.deref() !== undefined).length;
    assert.equal(kept, 0, `${kept} of 5 disposed worlds' planners are still reachable`);
  });

  it('steps no further once disposed', () => {
    // A live match hands back a snapshot within two Echo periods of ticks.
    const steps = (match: Match): boolean => {
      for (let tick = 0; tick < 2 * (SIM.TICK_HZ / SIM.ECHO_HZ); tick++) {
        if (match.update(STEP_MS) !== null) return true;
      }
      return false;
    };
    const match = played(300);
    assert.ok(steps(match), 'the premise: a live match steps');
    match.dispose();
    assert.equal(steps(match), false, 'a disposed match produced a snapshot');
    match.dispose();
  });
});
