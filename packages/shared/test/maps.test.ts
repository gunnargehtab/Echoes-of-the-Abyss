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
import { readFileSync } from 'node:fs';

import { DEFAULT_MAP_ID, MAP_HEADERS, SETUP_CARD, mapHeaderById } from '../dist/index.js';

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

  it('gives every catalogue map a setup card, and nothing else one (#1587)', () => {
    // docs/maps.md, "On the setup card": the line a newcomer reads in place of
    // the archetype's shorthand. A map without one would fall back to nothing.
    assert.deepEqual(Object.keys(SETUP_CARD).sort(), MAP_HEADERS.map((h) => h.id).sort());
    for (const header of MAP_HEADERS) {
      assert.notEqual(SETUP_CARD[header.id], header.idealUse, `${header.id}: still the shorthand`);
    }
  });

  it('transcribes each card from docs/maps.md, where it is authored', () => {
    const doc = readFileSync(new URL('../../../docs/maps.md', import.meta.url), 'utf8');
    // Per map, not per string: each card is looked for under its own map's
    // heading, so two cards swapped between maps fail here.
    const section = (name: string): string => {
      const start = doc.search(new RegExp(`^## Map Type \\d+ — ${name}$`, 'm'));
      assert.ok(start >= 0, `${name}: no section in docs/maps.md`);
      const next = doc.indexOf('\n## ', start + 1);
      return doc.slice(start, next < 0 ? undefined : next);
    };
    for (const header of MAP_HEADERS) {
      const card = SETUP_CARD[header.id]!;
      assert.ok(
        section(header.name).includes(`### On the setup card\n\n${card}\n`),
        `${header.id}: not under its own heading in the doc`
      );
    }
  });
});
