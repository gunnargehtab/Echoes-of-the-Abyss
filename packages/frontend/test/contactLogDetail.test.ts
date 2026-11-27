/**
 * The contact log's detail column prints the rows docs/ui-ux.md §10's sample
 * block gives a bearing, a range or `decaying` as that block does, so a later
 * edit to one cannot quietly reshape another.
 *
 * The one that broke (#1937): an own-force row's range is the player's own
 * hull measured from the scope anchor, so it is exact. It printed through the
 * contact path, rounded to 100 m and tilded, as if it had been resolved. Then
 * an exposure row printed `bearing unknown` where §10 prints nothing (#1966):
 * the fourth fix to this column in a month, so the first test below reads the
 * sample block itself rather than a copy of it.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ResolutionTier } from '@echoes/shared';
import { detail } from '../src/game/ContactLog.tsx';
import type { ContactLogEntry } from '../src/game/EchoRenderer.ts';

function row(fields: Partial<ContactLogEntry>): ContactLogEntry {
  return { id: 'r', tick: 0, tier: ResolutionTier.Silent, fresh: true, label: 'x', ...fields };
}

describe('contact log detail column (docs/ui-ux.md §10)', () => {
  it("prints every row of §10's sample block as the block prints it", () => {
    const doc = readFileSync(new URL('../../../docs/ui-ux.md', import.meta.url), 'utf8');
    const section = doc.slice(doc.indexOf('## 10. The Contact Log'), doc.indexOf('## 10.5'));
    const block = /```text\n([\s\S]*?)```/.exec(section);
    assert.ok(block !== null, '§10 opens on its sample block');
    // The entry the renderer writes for each kind of row the block shows,
    // keyed by its tier and label columns. A sample row with no entry here
    // fails, so a kind added to the doc must be added here too.
    const written: Record<string, ContactLogEntry> = {
      'HEARD contact': row({ tier: ResolutionTier.Contact, label: 'contact' }),
      'CLASSIFIED ~4 Consortium': row({
        tier: ResolutionTier.Classification,
        bearingDeg: 118,
        rangeM: 2063,
      }),
      '--- you were pinged': row({ bearingDeg: 70 }),
      '--- they have your bearing': row({ exposure: true }),
      '--- Corvette went loud': row({ own: true, bearingDeg: 34, rangeM: 1050.4 }),
      'BEARING contact': row({ tier: ResolutionTier.Bearing, bearingDeg: 245, rangeM: 1412 }),
      'MARK industrial hum': row({ mark: true, bearingDeg: 310, rangeM: 900 }),
    };
    const lines = block[1]!.trimEnd().split('\n');
    assert.equal(lines.length, Object.keys(written).length, 'one entry per sample row');
    for (const line of lines) {
      // Columns are two or more spaces apart; the detail column's tokens are
      // three apart, as `DetailParts` joins them.
      const [, tier, label, ...parts] = line.split(/ {2,}/);
      const entry = written[`${tier} ${label}`];
      assert.ok(entry !== undefined, `no entry for ${line}`);
      assert.deepEqual(detail(entry), parts, line);
    }
  });

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
