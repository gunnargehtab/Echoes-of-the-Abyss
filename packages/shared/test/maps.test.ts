/**
 * The public map catalogue — the subset of the map data the shell may list
 * before a room exists.
 *
 * The deeper half of these guarantees lives in the backend suite, where the
 * full definitions are: `maps.test.ts` there asserts every header's `seats`
 * against the authored spawn list. What can be checked from this side is the
 * catalogue's own coherence, and that it never grows a field the client has
 * not earned pre-join (spawns, resources, hazard sites are authoring data).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_MAP_ID, MAP_HEADERS, mapHeaderById } from '../dist/index.js';

describe('the public map catalogue', () => {
  it('has a default that resolves, listed first', () => {
    assert.ok(mapHeaderById(DEFAULT_MAP_ID) !== undefined);
    assert.equal(MAP_HEADERS[0]!.id, DEFAULT_MAP_ID);
    assert.equal(mapHeaderById('no-such-map'), undefined);
  });

  it('gives every header a unique id, a name, and a seat count a lobby can hold', () => {
    const ids = new Set(MAP_HEADERS.map((h) => h.id));
    assert.equal(ids.size, MAP_HEADERS.length);
    for (const header of MAP_HEADERS) {
      assert.ok(header.name.length > 0, `${header.id}: unnamed`);
      assert.ok(header.idealUse.length > 0, `${header.id}: no doctrine line`);
      // MatchRoom caps at four clients; a header promising more would render
      // a card the room refuses to fill.
      assert.ok(header.seats >= 2 && header.seats <= 4, `${header.id}: seats ${header.seats}`);
      assert.ok(header.widthM > 0 && header.heightM > 0, `${header.id}: empty extent`);
    }
  });

  it('stays the public subset — no authoring data in a header', () => {
    // Spawn positions before a match is knowledge the player has not earned.
    // If a future field is genuinely public, add it here deliberately.
    const allowed = new Set(['id', 'name', 'idealUse', 'seats', 'widthM', 'heightM']);
    for (const header of MAP_HEADERS) {
      for (const key of Object.keys(header)) {
        assert.ok(allowed.has(key), `${header.id}: unexpected public field "${key}"`);
      }
    }
  });
});
