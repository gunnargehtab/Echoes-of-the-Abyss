/**
 * The contact log's MARK row (#214) — docs/ui-ux.md §10.
 *
 * The row rendering is not what is hard here, and it is not what this file
 * pins. Every other line in that log is an event with a moment; a mark has no
 * moment on the wire — it is present, then fainter, then gone — so the event
 * has to be derived by diffing the mark set by id. These are the rules that
 * derivation has to keep, each of which the log stops being a log without:
 *
 * - a mark is news the first time it is heard, and never again that match;
 * - a mark that goes quiet and comes back is the *same* mark, so it must not
 *   log twice — a log that reported re-entry would be a proximity meter
 *   pointed at the player's own movement rather than a record of what they
 *   heard;
 * - a rematch starts from silence.
 *
 * Pure functions and no Pixi, as in scopeMarks.test.ts: the renderer's half is
 * two lines of wiring, and the rule lives here.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EchoMarkKind, type EchoMarkInfo } from '@echoes/shared';
import { MARK_LABEL, newlyAudibleMarks } from '../src/game/echoMarks.ts';

function mark(id: number, kind = EchoMarkKind.IndustrialHum, intensity = 0.6): EchoMarkInfo {
  return { id, x: 1200, y: 900, kind, intensity };
}

/** Every kind the enum carries, so a new one cannot arrive unnamed. */
const ALL_KINDS = [
  EchoMarkKind.Battle,
  EchoMarkKind.DestroyedStructure,
  EchoMarkKind.IndustrialHum,
  EchoMarkKind.TorpedoWake,
] as const;

describe('MARK row derivation', () => {
  it('reports a mark the first time it is heard', () => {
    const logged = new Set<number>();
    const fresh = newlyAudibleMarks([mark(7), mark(8)], logged);
    assert.deepEqual(
      fresh.map((m) => m.id),
      [7, 8]
    );
  });

  it('does not report a mark again while it is still audible', () => {
    const logged = new Set<number>();
    newlyAudibleMarks([mark(7)], logged);
    // Marks arrive as a set every Echo tick, not as events: the same mark is
    // in every snapshot for as long as it is audible.
    for (let tick = 0; tick < 5; tick++) {
      assert.deepEqual(newlyAudibleMarks([mark(7)], logged), []);
    }
  });

  it('does not report a mark that goes quiet and comes back', () => {
    const logged = new Set<number>();
    newlyAudibleMarks([mark(7)], logged);
    // The scout swims away — or the server's five-tick sweep drops a faint
    // reading — and then the same id is audible again.
    assert.deepEqual(newlyAudibleMarks([], logged), []);
    assert.deepEqual(newlyAudibleMarks([mark(7)], logged), []);
  });

  it('reports a new mark that arrives beside one already logged', () => {
    const logged = new Set<number>();
    newlyAudibleMarks([mark(7)], logged);
    const fresh = newlyAudibleMarks([mark(7), mark(9, EchoMarkKind.Battle)], logged);
    assert.deepEqual(
      fresh.map((m) => m.id),
      [9]
    );
  });

  it('hands back the live mark, so the row reads the position it was heard at', () => {
    const logged = new Set<number>();
    const live = mark(7);
    const [fresh] = newlyAudibleMarks([live], logged);
    assert.equal(fresh, live);
  });

  it('starts from silence in a fresh match', () => {
    // What the renderer's reset does: mark ids are per-match, so a rematch
    // that kept the set would silently swallow the new match's first rows.
    const logged = new Set<number>();
    newlyAudibleMarks([mark(7)], logged);
    logged.clear();
    assert.deepEqual(
      newlyAudibleMarks([mark(7)], logged).map((m) => m.id),
      [7]
    );
  });
});

describe('MARK row labels', () => {
  it('names every kind of residue', () => {
    for (const kind of ALL_KINDS) {
      const label = MARK_LABEL[kind];
      assert.equal(typeof label, 'string');
      assert.ok(label.length > 0, `no label for kind ${kind}`);
    }
  });

  it("uses the sample row's word for the hum", () => {
    // docs/ui-ux.md §10 prints this row verbatim; the log should say what the
    // bible says it says.
    assert.equal(MARK_LABEL[EchoMarkKind.IndustrialHum], 'industrial hum');
  });

  it('names an event and never an owner', () => {
    // docs/systems-echo.md §7: a mark reports that something happened, never
    // what or to whom. The log is one string away from breaking that.
    for (const kind of ALL_KINDS) {
      const label = MARK_LABEL[kind];
      for (const forbidden of ['consortium', 'commune', 'directorate', 'knights', 'enemy']) {
        assert.ok(!label.toLowerCase().includes(forbidden), `${label} names a side`);
      }
    }
  });
});
