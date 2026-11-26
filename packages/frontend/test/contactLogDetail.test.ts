/**
 * The contact log's detail column prints the rows docs/ui-ux.md §10's sample
 * block gives a bearing, a range or `decaying` as that block does, so a later
 * edit to one cannot quietly reshape another.
 *
 * The one that broke (#1937): an own-force row's range is the player's own
 * hull measured from the scope anchor, so it is exact. It printed through the
 * contact path, rounded to 100 m and tilded, as if it had been resolved.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ResolutionTier } from '@echoes/shared';
import { detail } from '../src/game/ContactLog.tsx';
import type { ContactLogEntry } from '../src/game/EchoRenderer.ts';

function row(fields: Partial<ContactLogEntry>): ContactLogEntry {
  return { id: 'r', tick: 0, tier: ResolutionTier.Silent, fresh: true, label: 'x', ...fields };
}

describe('contact log detail column (docs/ui-ux.md §10)', () => {
  it('prints an own-force row exact: whole metres, grouped, no tilde', () => {
    assert.deepEqual(detail(row({ own: true, bearingDeg: 34, rangeM: 1050.4 })), [
      'bearing 034°',
      '1,050 m',
    ]);
    // Not rounded to 100 m: 1,047 m is what the hull is from the anchor.
    assert.deepEqual(detail(row({ own: true, bearingDeg: 34, rangeM: 1047.2 })), [
      'bearing 034°',
      '1,047 m',
    ]);
  });

  it("rounds and tildes a contact's range, at Tier 2 and Tier 3 alike", () => {
    assert.deepEqual(detail(row({ tier: ResolutionTier.Bearing, bearingDeg: 245, rangeM: 1412 })), [
      'bearing 245°',
      '~1,400 m',
    ]);
    assert.deepEqual(
      detail(row({ tier: ResolutionTier.Classification, bearingDeg: 118, rangeM: 2063 })),
      ['bearing 118°', '~2,100 m']
    );
  });

  it('keeps the rows that carry no range as §10 prints them', () => {
    assert.deepEqual(detail(row({ tier: ResolutionTier.Contact })), ['bearing unknown']);
    // `you were pinged`: a bearing and nothing else.
    assert.deepEqual(detail(row({ bearingDeg: 70 })), ['bearing 070°']);
    assert.deepEqual(detail(row({ mark: true, bearingDeg: 310, rangeM: 900 })), [
      'bearing 310°',
      'decaying',
    ]);
    // An own-force row with no scope anchor has no bearing to measure from.
    assert.deepEqual(detail(row({ own: true })), ['bearing unknown']);
  });
});
