/**
 * The room's message contract (#489).
 *
 * Most of what this file used to need is now a compile error. `wire.ts` ends
 * with two `Exact<>` assertions that fail the build if a name has no payload
 * or a payload has no name, and both packages reach every message through the
 * same map, so a rename or a reshape on one side stops compiling on both.
 *
 * What remains is the one hazard the type system cannot see: two keys mapping
 * to the *same* wire string. That does not widen the name union or break the
 * exhaustiveness check — it silently collapses two messages into one, and the
 * second handler registered wins. Cheap to rule out, invisible otherwise.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CLIENT_MSG, SERVER_MSG } from '../dist/index.js';

/** Wire names that appear more than once in a map. */
function duplicates(map: Record<string, string>): string[] {
  const seen = new Map<string, string[]>();
  for (const [key, wire] of Object.entries(map)) {
    const keys = seen.get(wire);
    if (keys === undefined) seen.set(wire, [key]);
    else keys.push(key);
  }
  return [...seen.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([wire, keys]) => `${wire} <- ${keys.join(', ')}`);
}

describe('the message contract', () => {
  it('gives every client message its own name on the wire', () => {
    assert.deepEqual(duplicates(CLIENT_MSG), [], 'two keys sharing a wire name collapse silently');
    assert.equal(Object.keys(CLIENT_MSG).length, 30, 'the orders a client may send');
  });

  it('gives every server message its own name on the wire', () => {
    assert.deepEqual(duplicates(SERVER_MSG), []);
    assert.equal(Object.keys(SERVER_MSG).length, 11, 'the messages the room sends');
  });

  it('keeps the one name whose casing differs from its key', () => {
    // `depthcharge` is lower-case on the wire and camelCase nowhere else. The
    // name is the contract, so correcting it would be a protocol break for no
    // gain; this map is where the oddity stops being a thing to remember, and
    // this assertion is what stops a tidying pass from "fixing" it.
    assert.equal(CLIENT_MSG.depthCharge, 'depthcharge');
  });
});
