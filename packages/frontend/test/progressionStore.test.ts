/**
 * The progression record (#371).
 *
 * Two promises are defended here. The first is the settings store's: storage
 * can be absent, hostile or stale, and the shell still boots — a player whose
 * `localStorage` holds a foreign record gets an empty history, not a blank
 * screen. The second is this store's own, and is the reason it exists in the
 * shape it does: the write is **idempotent**, because `MatchRoom` re-sends
 * `missionOver` to a client that reconnects into an already-ended room, so one
 * conclusion can arrive twice.
 */
import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DRIFT,
  MARR_PLATEAU_FILED,
  MissionOutcome,
  missionHeaderById,
  type MissionResultPayload,
} from '@echoes/shared';
import {
  driftHealthFor,
  emptyProgression,
  hasPlayed,
  isMissionUnlocked,
  loadProgression,
  missionRecord,
  PROLOGUE_MISSION_ID,
  recordMissionResult,
  seenScenes,
} from '../src/progression/store.ts';

const STORAGE_KEY = 'echoes.progression';

/** A minimal in-memory localStorage, installed per test. */
function installStorage(): Map<string, string> {
  const backing = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => backing.get(key) ?? null,
    setItem: (key: string, value: string) => void backing.set(key, value),
    removeItem: (key: string) => void backing.delete(key),
  };
  return backing;
}

/** A `missionOver` payload, with only the fields this store reads populated. */
function result(
  missionId: string,
  outcome: MissionOutcome,
  scenes?: readonly string[]
): MissionResultPayload {
  return { missionId, outcome, epilogue: 'The court adjourns.', objectives: [], scenes };
}

describe('the progression record', () => {
  let backing: Map<string, string>;

  beforeEach(() => {
    backing = installStorage();
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('reads as empty from empty storage, and with no storage at all', () => {
    assert.deepEqual(loadProgression(), emptyProgression());
    delete (globalThis as { localStorage?: unknown }).localStorage;
    assert.deepEqual(loadProgression(), emptyProgression());
  });

  it('remembers a finished mission across a reload', () => {
    recordMissionResult(result(PROLOGUE_MISSION_ID, MissionOutcome.Complete));
    // A reload is a fresh read of the same backing store, which is what every
    // one of these helpers does — nothing is cached in module state.
    assert.equal(hasPlayed(PROLOGUE_MISSION_ID), true);
    assert.equal(missionRecord(PROLOGUE_MISSION_ID)?.outcome, MissionOutcome.Complete);
  });

  it('reports an unplayed mission as unplayed rather than as lost', () => {
    assert.equal(hasPlayed('ledger-asset-recovery'), false);
    assert.equal(missionRecord('ledger-asset-recovery'), undefined);
  });

  it('counts all three readings as played — Partial is a result, not a failure', () => {
    recordMissionResult(result('ledger-baffle', MissionOutcome.Partial));
    recordMissionResult(result('ledger-exposure', MissionOutcome.Lost));
    assert.equal(hasPlayed('ledger-baffle'), true);
    assert.equal(hasPlayed('ledger-exposure'), true);
  });

  it('keeps the best reading, so a replay never un-completes a mission', () => {
    recordMissionResult(result('seeding-tend', MissionOutcome.Complete));
    recordMissionResult(result('seeding-tend', MissionOutcome.Lost));
    assert.equal(missionRecord('seeding-tend')?.outcome, MissionOutcome.Complete);
  });

  it('improves the reading when a replay goes better', () => {
    recordMissionResult(result('seeding-tend', MissionOutcome.Lost));
    recordMissionResult(result('seeding-tend', MissionOutcome.Partial));
    assert.equal(missionRecord('seeding-tend')?.outcome, MissionOutcome.Partial);
  });

  it('is idempotent, because a reconnection re-sends the same conclusion', () => {
    const payload = result('attending-attendance', MissionOutcome.Partial);
    recordMissionResult(payload);
    const after = recordMissionResult(payload);
    assert.deepEqual(after.missions['attending-attendance'], { outcome: MissionOutcome.Partial });
  });

  it('does not lose one mission when another mission is finished', () => {
    recordMissionResult(result(PROLOGUE_MISSION_ID, MissionOutcome.Complete));
    recordMissionResult(result('ledger-baffle', MissionOutcome.Partial));
    const loaded = loadProgression();
    assert.equal(loaded.missions[PROLOGUE_MISSION_ID]?.outcome, MissionOutcome.Complete);
    assert.equal(loaded.missions['ledger-baffle']?.outcome, MissionOutcome.Partial);
  });

  it('treats corrupt JSON as an empty history, not as an error', () => {
    backing.set(STORAGE_KEY, '{not json');
    assert.deepEqual(loadProgression(), emptyProgression());
  });

  it('treats a foreign version as an empty history', () => {
    backing.set(STORAGE_KEY, JSON.stringify({ version: 99, missions: { x: { outcome: 0 } } }));
    assert.deepEqual(loadProgression(), emptyProgression());
  });

  it('drops an unreadable entry without dropping its neighbours', () => {
    backing.set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        missions: {
          good: { outcome: MissionOutcome.Complete },
          noOutcome: {},
          notAnObject: 7,
          outOfRange: { outcome: 42 },
        },
      })
    );
    const loaded = loadProgression();
    assert.deepEqual(Object.keys(loaded.missions), ['good']);
  });

  it('carries through fields a later build added, rather than deleting them', () => {
    // The three systems queued behind this record add keys beside `missions`
    // and fields beside `outcome`. A build that has not learned about them
    // must not be the build that erases them on the next mission it writes.
    backing.set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        driftHealth: { 'marr-plateau': 0.4 },
        missions: { 'seeding-tend': { outcome: MissionOutcome.Complete, seenScenes: ['a'] } },
      })
    );
    recordMissionResult(result('ledger-baffle', MissionOutcome.Partial));

    const raw = JSON.parse(backing.get(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    assert.deepEqual(raw.driftHealth, { 'marr-plateau': 0.4 });
    const missions = raw.missions as Record<string, Record<string, unknown>>;
    assert.deepEqual(missions['seeding-tend'].seenScenes, ['a']);
  });

  it('survives storage that throws on write', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
    };
    // The result still stands on screen; only the memory of it is lost.
    assert.doesNotThrow(() => recordMissionResult(result('ledger-baffle', MissionOutcome.Lost)));
  });
});

describe('the unlock rule', () => {
  beforeEach(() => {
    installStorage();
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('offers the prologue on a first boot', () => {
    assert.equal(isMissionUnlocked(PROLOGUE_MISSION_ID), true);
  });

  it('withholds the faction campaigns until the prologue is finished', () => {
    assert.equal(isMissionUnlocked('ledger-asset-recovery'), false);
    assert.equal(isMissionUnlocked('chord-aptitude'), false);
  });

  it('frees every campaign at once, in no order — campaign.md §1', () => {
    recordMissionResult(result(PROLOGUE_MISSION_ID, MissionOutcome.Lost));
    // A fourth mission is open without its first three, because §1 refuses to
    // have an ordering inside a campaign.
    assert.equal(isMissionUnlocked('ledger-exposure'), true);
    assert.equal(isMissionUnlocked('attending-intake'), true);
    assert.equal(isMissionUnlocked('seeding-thin-water'), true);
  });

  it('opens on any reading of the prologue, including a lost one', () => {
    recordMissionResult(result(PROLOGUE_MISSION_ID, MissionOutcome.Lost));
    assert.equal(isMissionUnlocked('ledger-asset-recovery'), true);
  });
});

describe('the seen-scene set (#378)', () => {
  beforeEach(() => {
    installStorage();
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('remembers nothing on a first boot', () => {
    assert.deepEqual(emptyProgression().scenes, {});
    assert.equal(seenScenes().size, 0);
  });

  it('records the scenes a conclusion names', () => {
    recordMissionResult(result('seeding-tend', MissionOutcome.Complete, [MARR_PLATEAU_FILED]));
    assert.equal(seenScenes().has(MARR_PLATEAU_FILED), true);
  });

  it('records nothing for a mission that witnessed nothing', () => {
    // A quiet, unfiled Tend is a completed Tend that saw no scene — which is
    // the whole reason the set is keyed by scene and not by mission id.
    recordMissionResult(result('seeding-tend', MissionOutcome.Complete, []));
    assert.equal(seenScenes().size, 0);
  });

  it('takes a payload from a build that sends no scenes at all', () => {
    recordMissionResult(result('ledger-baffle', MissionOutcome.Complete));
    assert.equal(seenScenes().size, 0);
  });

  it('unions rather than replaces, so a replayed conclusion is a no-op', () => {
    // The reconnect case: `MatchRoom` re-sends `missionOver` to a client that
    // rejoins an ended room, and the same scene arriving twice must not differ
    // from it arriving once.
    recordMissionResult(result('seeding-tend', MissionOutcome.Complete, [MARR_PLATEAU_FILED]));
    recordMissionResult(result('seeding-tend', MissionOutcome.Complete, [MARR_PLATEAU_FILED]));
    assert.deepEqual([...seenScenes()], [MARR_PLATEAU_FILED]);
  });

  it('never un-witnesses a scene a later, quieter run did not repeat', () => {
    recordMissionResult(result('seeding-tend', MissionOutcome.Complete, [MARR_PLATEAU_FILED]));
    recordMissionResult(result('seeding-tend', MissionOutcome.Complete, []));
    assert.equal(seenScenes().has(MARR_PLATEAU_FILED), true);
  });

  it('reads a record written before this key existed as an empty set', () => {
    // #371's promise, tested rather than trusted: the first sibling key added
    // to the record needs no migration.
    installStorage().set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        missions: { 'seeding-tend': { outcome: MissionOutcome.Complete } },
      })
    );
    assert.deepEqual(loadProgression().scenes, {});
    assert.equal(hasPlayed('seeding-tend'), true);
  });

  it('drops one nonsense entry rather than the whole set', () => {
    installStorage().set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        missions: {},
        scenes: { [MARR_PLATEAU_FILED]: true, 'half-written': 'yes', broken: null },
      })
    );
    assert.deepEqual(loadProgression().scenes, { [MARR_PLATEAU_FILED]: true });
  });
});

describe('the per-map Drift grid (#379)', () => {
  const CELLS = DRIFT.HEALTH_REGIONS ** 2;

  /** A fresh grid with one cell as the last match left it. */
  function grid(cell: number, value: number): number[] {
    const out = new Array<number>(CELLS).fill(DRIFT.HEALTH_START);
    out[cell] = value;
    return out;
  }

  /** A `missionOver` payload carrying the map as the mission closed on it. */
  function closed(missionId: string, driftHealth?: readonly number[]): MissionResultPayload {
    return { ...result(missionId, MissionOutcome.Complete), driftHealth };
  }

  let backing: Map<string, string>;

  beforeEach(() => {
    backing = installStorage();
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('remembers no map on a first boot', () => {
    assert.deepEqual(emptyProgression().drift, {});
    assert.equal(driftHealthFor('marr-plateau'), undefined);
  });

  it('keeps the grid a conclusion carries under the map, not the mission', () => {
    recordMissionResult(closed('seeding-tend', grid(6, 20)));
    assert.deepEqual(driftHealthFor('marr-plateau'), grid(6, 20));
    assert.equal(driftHealthFor('seeding-tend'), undefined);
    // Which is what lets the second mission on the plateau find it: the rule
    // is about ground, and Convocation resolves to the same key.
    assert.equal(missionHeaderById('seeding-convocation')?.mapId, 'marr-plateau');
  });

  it('replaces the grid on every close — the latest reading, not the best', () => {
    // The one field in the record that is not "best ever". A map that healed
    // is a later reading, not a better one, and a record that kept the
    // healthiest grid it had seen would let a loud run be undone by
    // remembering a quiet one.
    recordMissionResult(closed('seeding-tend', grid(6, 20)));
    recordMissionResult(closed('seeding-convocation', grid(6, DRIFT.HEALTH_START)));
    assert.deepEqual(driftHealthFor('marr-plateau'), grid(6, DRIFT.HEALTH_START));
    recordMissionResult(closed('seeding-convocation', grid(9, 0)));
    assert.deepEqual(driftHealthFor('marr-plateau'), grid(9, 0));
  });

  it('is idempotent, because a reconnection re-sends the same conclusion', () => {
    const payload = closed('seeding-tend', grid(6, 20));
    recordMissionResult(payload);
    recordMissionResult(payload);
    assert.deepEqual(driftHealthFor('marr-plateau'), grid(6, 20));
  });

  it('leaves the map alone when a conclusion carries no grid', () => {
    // A payload from a server build that predates the field: the outcome is
    // still recorded, and the map stays as the last grid-carrying close left
    // it rather than being wiped to fresh by an absence.
    recordMissionResult(closed('seeding-tend', grid(6, 20)));
    recordMissionResult(closed('seeding-tend'));
    assert.deepEqual(driftHealthFor('marr-plateau'), grid(6, 20));
  });

  it('does not lose one map when another map is closed', () => {
    recordMissionResult(closed('seeding-tend', grid(6, 20)));
    recordMissionResult(closed('seeding-deep-furrow', grid(1, 30)));
    assert.deepEqual(driftHealthFor('marr-plateau'), grid(6, 20));
    assert.deepEqual(driftHealthFor('anholt-furrow'), grid(1, 30));
  });

  it('stores nothing for a mission id this build has no map for, and keeps the outcome', () => {
    recordMissionResult(closed('a-mission-from-a-later-build', grid(6, 20)));
    assert.deepEqual(loadProgression().drift, {});
    assert.equal(hasPlayed('a-mission-from-a-later-build'), true);
  });

  it('reads a record written before this key existed as no maps at all', () => {
    backing.set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        missions: { 'seeding-tend': { outcome: MissionOutcome.Complete } },
        scenes: {},
      })
    );
    assert.deepEqual(loadProgression().drift, {});
    assert.equal(driftHealthFor('marr-plateau'), undefined);
    assert.equal(hasPlayed('seeding-tend'), true);
  });

  it("drops one map's unreadable grid without dropping its neighbours", () => {
    // One map's corrupt grid costs that map its carry — it plays fresh, which
    // rule 5 permits — and never the record. NaN is here for the reason it
    // cannot be typed: JSON turns it into null on the way in.
    backing.set(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        missions: {},
        scenes: {},
        drift: {
          'marr-plateau': grid(6, 20),
          'anholt-furrow': [...grid(0, DRIFT.HEALTH_START).slice(1), 'x'],
          'kelp-labyrinth': grid(2, DRIFT.HEALTH_MAX + 1),
          'mouth-rim': grid(3, -4),
          'fourth-foot': grid(1, Number.NaN),
          'banding-ground': 'not a grid',
          'upper-terraces': null,
        },
      })
    );
    assert.deepEqual(loadProgression().drift, { 'marr-plateau': grid(6, 20) });
  });
});
