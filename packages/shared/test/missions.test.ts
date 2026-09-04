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
  DRIFT,
  DRIFT_REGION_COUNT,
  MARR_PLATEAU_FILED,
  MISSION,
  MISSION_HEADERS,
  PROLOGUE_SORROWGATE_HEADER,
  driftCarryFrom,
  missionBriefing,
  missionHeaderById,
  validDriftCarry,
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
      // Added on purpose (#378), and argued for here rather than in a commit
      // message: an alternate briefing is the same kind of thing `briefing`
      // already is — authored prose addressed to the player before the socket
      // opens — and it is chosen client-side from the player's own record, so
      // shipping it public reveals nothing about the mission behind it. What
      // would *not* belong is the record of which variant a player saw, and
      // nothing here carries one.
      'briefingVariants',
    ]);
    for (const mission of MISSION_HEADERS) {
      for (const key of Object.keys(mission)) {
        assert.ok(allowed.has(key), `${mission.id}: unexpected public field "${key}"`);
      }
    }
  });

  it('varies the briefing on a scene, and never the mission', () => {
    // docs/campaign.md §1's rule, at the level the catalogue can hold it: the
    // selector reads a header and a set of scene ids and returns paragraphs.
    // Everything else about the mission is untouched by construction, because
    // there is nothing else in scope of this function.
    const thinWater = missionHeaderById('seeding-thin-water');
    assert.ok(thinWater !== undefined);

    const cold = missionBriefing(thinWater, new Set());
    const seen = missionBriefing(thinWater, new Set([MARR_PLATEAU_FILED]));
    assert.deepEqual(cold, thinWater.briefing);
    assert.notDeepEqual(seen, cold);
    assert.equal(seen?.length, cold?.length, 'a variant is a re-reading, not a longer briefing');

    // A scene nobody authored a variant for selects the default, so a record
    // carried over from a build with more scenes in it than this one has does
    // not blank a briefing.
    assert.deepEqual(missionBriefing(thinWater, new Set(['no-such-scene'])), thinWater.briefing);
  });

  it('keeps a withheld briefing withheld, whatever the record says', () => {
    // The evacuation carve-out: a mission that withholds its briefing until
    // arrival has no default for a variant to vary from, and a variant that
    // appeared in its place would leak the mission the withholding protects.
    for (const mission of MISSION_HEADERS) {
      if (mission.briefing !== null) continue;
      assert.equal(mission.briefingVariants, undefined, `${mission.id}: withheld, yet varies`);
      assert.equal(missionBriefing(mission, new Set([MARR_PLATEAU_FILED])), null);
    }
  });

  it('authors every variant as a whole briefing, on a scene named once', () => {
    for (const mission of MISSION_HEADERS) {
      const variants = mission.briefingVariants;
      if (variants === undefined) continue;
      const scenes = new Set(variants.map((v) => v.scene));
      // Two variants on one scene would make the first-match rule decide
      // something an author thought they had decided.
      assert.equal(scenes.size, variants.length, `${mission.id}: a scene varies twice`);
      for (const variant of variants) {
        assert.ok(variant.scene.length > 0, `${mission.id}: unnamed scene`);
        assert.ok(variant.briefing.length > 0, `${mission.id}: empty variant briefing`);
        for (const paragraph of variant.briefing) {
          assert.ok(paragraph.trim().length > 0, `${mission.id}: blank variant paragraph`);
        }
        assert.notDeepEqual(
          variant.briefing,
          mission.briefing,
          `${mission.id}: variant on "${variant.scene}" reads identically to the default`
        );
      }
    }
  });

  it('changes the one paragraph the mission documents say it changes', () => {
    // Both documents claim a single differing paragraph and name which
    // (docs/mission-thin-water.md §12, docs/mission-convocation.md §12), and
    // the claim is the argument for the rule rather than an economy: what a
    // witness carries forward is one thing known, not a different day. Held
    // here so an edit to either text has to move the prose on both sides.
    const cases: readonly [string, number][] = [
      ['seeding-thin-water', 3],
      ['seeding-convocation', 2],
    ];
    for (const [id, index] of cases) {
      const header = missionHeaderById(id);
      assert.ok(header?.briefing != null && header.briefingVariants !== undefined, id);
      const variant = header.briefingVariants[0].briefing;
      assert.equal(variant.length, header.briefing.length, `${id}: paragraph count moved`);
      const differing = header.briefing
        .map((p, i) => (p === variant[i] ? -1 : i))
        .filter((i) => i >= 0);
      assert.deepEqual(differing, [index], `${id}: a different set of paragraphs varies`);
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

/**
 * The seeding guard for cross-mission Drift Health — docs/campaign.md §2 rule
 * 5, the record's grid on its way back into a match.
 *
 * This validator is the only thing standing between a `localStorage` key the
 * player owns and the world the next mission is built in, so the cases here
 * are adversarial rather than illustrative. The one that matters most is the
 * ceiling: a grid of 100s is *well-formed*, would pass every shape check, and
 * would hand the player a healthier map than a first visit gives — full
 * spawns, intact Tetherjelly masking, uncut Biomass. §2 rule 5 carries damage,
 * so the carry may only ever be a debt.
 */
describe('validDriftCarry', () => {
  const wrecked = (): number[] => new Array<number>(DRIFT_REGION_COUNT).fill(0);

  it('accepts a grid a played match could have produced', () => {
    const grid = wrecked();
    grid[0] = DRIFT.HEALTH_START;
    grid[1] = 41.5;
    assert.deepEqual(validDriftCarry(grid), grid);
  });

  it('refuses anything healthier than the ground opens at', () => {
    const grid = wrecked();
    grid[2] = DRIFT.HEALTH_START + 0.01;
    assert.equal(validDriftCarry(grid), null, 'one cell over the ceiling voids the grid');
    // And 100 — the in-match cap a quiet region really can reach — is not a
    // legal *carry*, which is the distinction the ceiling exists to draw.
    assert.equal(validDriftCarry(new Array<number>(DRIFT_REGION_COUNT).fill(100)), null);
  });

  it('refuses a grid that is not one', () => {
    assert.equal(validDriftCarry(undefined), null);
    assert.equal(validDriftCarry(null), null);
    assert.equal(validDriftCarry('88,88,88'), null);
    assert.equal(validDriftCarry([]), null, 'wrong length');
    assert.equal(validDriftCarry([...wrecked(), 0]), null, 'one cell too many');
    const short = wrecked();
    short.pop();
    assert.equal(validDriftCarry(short), null, 'one cell too few');
  });

  it('refuses a cell that is not a finite number in range', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1, '40', {}, null, undefined]) {
      const grid: unknown[] = wrecked();
      grid[3] = bad;
      assert.equal(validDriftCarry(grid), null, `rejects ${String(bad)}`);
    }
  });

  /**
   * The pairing that decides whether the feature works at all in the common
   * case. A mission played *carefully* ends with regions recovered past the
   * opening value; if the grid that leaves a match were the raw snapshot, the
   * validator on the way back in would refuse it and a quiet player would
   * silently carry nothing.
   */
  it('accepts every grid a match can actually end on, once carried', () => {
    const ended = new Array<number>(DRIFT_REGION_COUNT).fill(100);
    ended[0] = 0;
    ended[1] = DRIFT.HEALTH_START - 0.5;
    ended[2] = DRIFT.HEALTH_START + 0.5;
    assert.equal(validDriftCarry(ended), null, 'the raw grid is not a carry');

    const carried = driftCarryFrom(ended);
    assert.deepEqual(validDriftCarry(carried), carried, 'and the carry always is');
    assert.equal(carried[0], 0, 'Dead is carried as Dead');
    assert.equal(carried[1], DRIFT.HEALTH_START - 0.5, 'a worn region carries its wear');
    assert.equal(carried[2], DRIFT.HEALTH_START, 'and recovery above the opening value does not');
  });

  it('copies rather than aliases, so the caller cannot edit a validated grid', () => {
    const grid = wrecked();
    const valid = validDriftCarry(grid)!;
    grid[0] = DRIFT.HEALTH_START;
    assert.equal(valid[0], 0);
  });
});
