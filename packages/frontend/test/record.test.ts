/**
 * The record between missions (#410) — docs/ui-ux.md §14, "The record".
 *
 * Two kinds of rule, and both fail silently on screen: which pages a history
 * enters, and what the pages are allowed to say. The admission rules are
 * checked against histories built from the catalogue. The text is checked for
 * the constraints the issue binds — the surface is before, not above; the
 * Mouth is measured and not explained; the setting's proper nouns actually
 * reach the player — because a page that quietly broke one of them would read
 * as fine to anyone who had not read the bible.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MISSION_HEADERS, PROLOGUE_SORROWGATE_HEADER } from '@echoes/shared';
import { ADMISSION_LINE, RECORD_PAGES, countLine, readRecord } from '../src/menu/record.ts';

const none = () => false;
const only = (...ids: string[]) => {
  const set = new Set(ids);
  return (id: string) => set.has(id);
};
const idOf = (campaign: string, ordinal: number) =>
  MISSION_HEADERS.find((h) => h.campaign === campaign && h.ordinal === ordinal)!.id;
const entered = (hasPlayed: (id: string) => boolean) =>
  readRecord(hasPlayed)
    .filter((r) => r.entered)
    .map((r) => r.page.id);

describe('what a history enters', () => {
  it('reads nothing to a player who has played nothing', () => {
    assert.deepEqual(entered(none), []);
    assert.equal(countLine(readRecord(none)), 'Six pages. None entered.');
  });

  it('enters the Surface Age, the Collapse and the Descent on the prologue', () => {
    // The acceptance line: a player who finishes the prologue can say why the
    // Rift is underwater. Three pages, and no more — the four powers are the
    // Settlement's, and the player has not been one of them yet.
    assert.deepEqual(entered(only(PROLOGUE_SORROWGATE_HEADER.id)), [
      'surface-age',
      'year-zero',
      'the-descent',
    ]);
  });

  it('enters the Settlement when one party has appeared', () => {
    const ids = entered(only(PROLOGUE_SORROWGATE_HEADER.id, idOf('ledger', 1)));
    assert.ok(ids.includes('the-settlement'));
    assert.ok(!ids.includes('the-long-arrangement'));
  });

  it('enters the Long Arrangement on a second party, from any two campaigns', () => {
    assert.ok(entered(only(idOf('seeding', 1), idOf('chord', 1))).includes('the-long-arrangement'));
    // Two missions of one campaign are one party.
    assert.ok(
      !entered(only(idOf('seeding', 1), idOf('seeding', 2))).includes('the-long-arrangement')
    );
  });

  it('enters the Present Crisis when the rim has been reached, from any side', () => {
    const rim = MISSION_HEADERS.filter((h) => h.mapId === 'mouth-rim');
    assert.equal(rim.length, 5);
    for (const header of rim) {
      assert.ok(entered(only(header.id)).includes('the-present-crisis'), header.id);
    }
    assert.ok(!entered(only(idOf('ledger', 5))).includes('the-present-crisis'));
  });

  it('does not require the pages to be entered in order', () => {
    // A Ledger player who reaches the rim in one campaign has the Present
    // Crisis and not the Long Arrangement. The gap is shown, with its reason,
    // rather than the pages being reordered around it.
    const reading = readRecord(only(PROLOGUE_SORROWGATE_HEADER.id, idOf('ledger', 6)));
    assert.deepEqual(
      reading.map((r) => r.entered),
      [true, true, true, true, false, true]
    );
    assert.equal(countLine(reading), 'Six pages. Five entered.');
  });

  it('enters everything to a player who has played everything', () => {
    assert.equal(entered(() => true).length, RECORD_PAGES.length);
  });
});

describe('what the pages say', () => {
  const text = RECORD_PAGES.flatMap((page) => page.entries).join(' ');

  it('is one page per era of timeline.md, in the timeline’s order', () => {
    assert.deepEqual(
      RECORD_PAGES.map((page) => page.era),
      [
        'The Surface Age',
        'Year 0 — The Salinity Collapse',
        'The Descent',
        'The Settlement',
        'The Long Arrangement',
        'The Present Crisis',
      ]
    );
    for (const page of RECORD_PAGES) {
      assert.ok(page.entries.length > 0, page.id);
      assert.ok(page.admission in ADMISSION_LINE, page.id);
    }
  });

  it('puts the setting’s names in front of the player', () => {
    // The words the issue counted at zero occurrences in player-facing text.
    for (const word of [
      'Pelagion',
      'Salinity Collapse',
      'the Sounding',
      'Halvard',
      'Sector Kell',
      'thermal grid',
      'the Lid',
      'Bathyarch Consortium',
      'Pelagia Commune',
      'Abyssal Directorate',
      'Hadron Knights',
      '141 PC',
      '178 PC',
      '214 PC',
    ]) {
      assert.ok(text.includes(word), `the record never says "${word}"`);
    }
  });

  it('keeps the surface before, not above', () => {
    // docs/world.md's writing rule: never a goal, a hope or a plot device.
    // The words a page would need to break it.
    for (const phrase of ['go back up', 'return to the surface', 'reclaim', 'one day']) {
      assert.ok(!text.toLowerCase().includes(phrase), `"${phrase}"`);
    }
  });

  it('measures the Mouth and does not explain it', () => {
    // campaign.md §2 rule 3. The record carries the cycle and the early
    // reply, and no sentence that says what is down there.
    assert.ok(text.includes('thirty-nine'));
    assert.ok(text.includes('forty-one seconds'));
    for (const phrase of [
      'the Mouth is a',
      'the Mouth is an',
      'what the Mouth is',
      'because the Mouth',
    ]) {
      assert.ok(!text.includes(phrase), `"${phrase}"`);
    }
  });

  it('never speaks in the first person plural', () => {
    // culture.md §3: the court never uses the collective first person.
    assert.ok(!/\b(we|our|us)\b/i.test(text));
    for (const line of Object.values(ADMISSION_LINE)) assert.ok(!/\b(we|our|us)\b/i.test(line));
  });
});
