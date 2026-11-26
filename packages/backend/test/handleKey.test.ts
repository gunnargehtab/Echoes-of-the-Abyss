/**
 * What keys a match's contact handles (#1959, docs/threat-model.md TM-001).
 *
 * Handles used to be keyed by the 32-bit match seed alone, and a client that
 * inverted the permutation under every candidate seed found the true one in
 * about 80 s of one core. With the seed it read each handle's mint order back,
 * and a scattered ping mints its phantoms first (docs/systems-echo.md §3).
 * These tests hold the property that fixes it: the handle key is its own
 * 128-bit secret, not a function of the seed a live match draws.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Faction, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { playReplay } from '../src/sim/replay.ts';
import { spawnUnit } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const KEY_A = '00112233445566778899aabbccddeeff';
const KEY_B = 'ffeeddccbbaa99887766554433221100';

/** Two corvettes in earshot, so each slot mints a handle on the first pass. */
function twoSides(options: ConstructorParameters<typeof Match>[1]): Match {
  const match = new Match(undefined, { fauna: false, ...options });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 0,
    faction: Faction.Bathyarch,
    x: 4000,
    y: 4000,
  });
  spawnUnit(match.world, {
    kind: UnitKind.Corvette,
    slot: 1,
    faction: Faction.Pelagia,
    x: 4600,
    y: 4000,
  });
  return match;
}

/** The handle slot 0 first holds a contact under. */
function firstHandle(match: Match): number {
  for (let i = 0; i < SIM.TICK_HZ * 2; i++) {
    const snapshots = match.update(STEP_MS);
    const contact = snapshots?.get(0)?.contacts[0];
    if (contact !== undefined) return contact.id;
  }
  throw new Error('slot 0 never resolved a contact');
}

describe('the handle key (#1959)', () => {
  it('is not the seed: one seed under two keys publishes two handles', () => {
    // The red half of the fix. Under the seed-keyed permutation both matches
    // minted the identical handle, because the seed was the whole key.
    const a = firstHandle(twoSides({ seed: 11, handleKey: KEY_A }));
    const b = firstHandle(twoSides({ seed: 11, handleKey: KEY_B }));
    assert.notEqual(a, b);
  });

  it('is drawn fresh, at 128 bits, for a match that draws its own seed', () => {
    const one = twoSides({});
    const two = twoSides({});
    assert.match(one.handleKey, /^[0-9a-f]{32}$/);
    assert.notEqual(one.handleKey, two.handleKey);
  });

  it('follows a fixed seed, so a seeded run reproduces its handles', () => {
    // The balance harness and the tests name a seed and expect the same match
    // back. A seed somebody chose is not secret, so neither is its key.
    assert.equal(twoSides({ seed: 11 }).handleKey, twoSides({ seed: 11 }).handleKey);
    assert.notEqual(twoSides({ seed: 11 }).handleKey, twoSides({ seed: 12 }).handleKey);
    assert.equal(firstHandle(twoSides({ seed: 11 })), firstHandle(twoSides({ seed: 11 })));
  });

  it('is recorded in the replay, and playback mints under it', () => {
    // A recorded order names a handle, so a replay keyed any other way would
    // refuse it on playback and diverge.
    const live = twoSides({ record: true });
    const handle = firstHandle(live);
    const replay = live.replay()!;
    assert.equal(replay.handleKey, live.handleKey);
    assert.equal(playReplay(replay).match.handleKey, live.handleKey);
    const again = twoSides({ seed: replay.seed, handleKey: replay.handleKey });
    assert.equal(firstHandle(again), handle);
  });

  it('refuses a key that is not 128 bits of hex', () => {
    assert.throws(() => new Match(undefined, { fauna: false, handleKey: 'abc' }), /handle key/);
    assert.throws(
      () => new Match(undefined, { fauna: false, handleKey: KEY_A.toUpperCase() }),
      /handle key/
    );
  });
});
