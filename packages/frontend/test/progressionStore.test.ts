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
import { MissionOutcome, type MissionResultPayload } from '@echoes/shared';
import {
  emptyProgression,
  hasPlayed,
  isMissionUnlocked,
  loadProgression,
  missionRecord,
  PROLOGUE_MISSION_ID,
  recordMissionResult,
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
function result(missionId: string, outcome: MissionOutcome): MissionResultPayload {
  return { missionId, outcome, epilogue: 'The court adjourns.', objectives: [] };
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
