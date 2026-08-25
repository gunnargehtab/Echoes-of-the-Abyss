/**
 * The public mission catalogue — the subset of a mission a shell may hold
 * before the socket opens (#190).
 *
 * The sharp test here is the allow-list, and it is the same one `maps.test.ts`
 * runs for spawn positions. A mission's authored internals — what the parties
 * are, where they start, what the objectives actually measure, when the beats
 * fire — are hidden information in exactly the way an enemy's position is, so
 * the guard is that a new public field has to be added to a list on purpose.
 *
 * The conventions in docs/campaign.md §10 are asserted here rather than trusted
 * because they apply to all 29 missions and only one of them exists yet: the
 * rule wants enforcing before the other 28 are written, not after.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MISSION,
  MISSION_HEADERS,
  PROLOGUE_SORROWGATE_HEADER,
  missionHeaderById,
} from '../dist/index.js';

describe('the public mission catalogue', () => {
  it('resolves by id, and refuses one it does not have', () => {
    assert.equal(missionHeaderById('prologue-sorrowgate'), PROLOGUE_SORROWGATE_HEADER);
    assert.equal(missionHeaderById('no-such-mission'), undefined);
  });

  it('namespaces ids by campaign, because display names are not unique', () => {
    // Two missions in the authored campaign are both called "Conclave"
    // (docs/campaign.md), so a name is not an identity and a global 1..29
    // numbering would break the moment the campaigns are written in any order.
    const ids = new Set(MISSION_HEADERS.map((m) => m.id));
    assert.equal(ids.size, MISSION_HEADERS.length);
    for (const mission of MISSION_HEADERS) {
      assert.ok(mission.id.startsWith(`${mission.campaign}-`), `${mission.id}: not namespaced`);
      assert.ok(mission.ordinal >= 1, `${mission.id}: ordinal is 1-based`);
      assert.ok(mission.name.length > 0, `${mission.id}: unnamed`);
      assert.ok(mission.premise.length > 0, `${mission.id}: no premise`);
      assert.ok(mission.mapId.length > 0, `${mission.id}: no map`);
    }
  });

  it('keeps every mission inside the length band §10 states', () => {
    for (const mission of MISSION_HEADERS) {
      const [low, high] = mission.lengthBandS;
      assert.ok(low < high, `${mission.id}: empty length band`);
      assert.ok(low >= MISSION.LENGTH_MIN_S, `${mission.id}: shorter than 12 minutes`);
      assert.ok(high <= MISSION.LENGTH_MAX_S, `${mission.id}: longer than 25 minutes`);
    }
  });

  it('ships a briefing as paragraphs, or withholds it deliberately', () => {
    for (const mission of MISSION_HEADERS) {
      // null is a real value here: a mission that is unwinnable as a fight can
      // be given away by its own briefing, so withholding is per-mission.
      if (mission.briefing === null) continue;
      assert.ok(mission.briefing.length > 0, `${mission.id}: empty briefing array`);
      for (const paragraph of mission.briefing) {
        assert.ok(paragraph.trim().length > 0, `${mission.id}: blank briefing paragraph`);
      }
    }
  });

  it('stays the public subset — no authored internals in a header', () => {
    // Parties, positions, predicates, thresholds and beat times are the
    // mission. If a future field is genuinely public, add it here deliberately
    // and argue for it in the same commit.
    const allowed = new Set([
      'id',
      'campaign',
      'ordinal',
      'name',
      'premise',
      'mapId',
      'lengthBandS',
      'briefing',
    ]);
    for (const mission of MISSION_HEADERS) {
      for (const key of Object.keys(mission)) {
        assert.ok(allowed.has(key), `${mission.id}: unexpected public field "${key}"`);
      }
    }
  });

  it('does not name a win condition in the premise', () => {
    // The premise is shown on the entry that offers the mission. Sorrowgate is
    // winnable only as an evacuation and saying so before play destroys it
    // (docs/campaign.md §2).
    const telling = ['extract', 'destroy', 'survive', 'escort', 'evacuat'];
    for (const mission of MISSION_HEADERS) {
      const premise = mission.premise.toLowerCase();
      for (const word of telling) {
        assert.ok(!premise.includes(word), `${mission.id}: premise gives away the objective`);
      }
    }
  });
});
