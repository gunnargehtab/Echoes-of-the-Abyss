/**
 * The two authored surfaces the campaign hangs between (#494) —
 * docs/ui-ux.md §14 ("Who is speaking", "The record"), docs/campaign.md §1.
 *
 * A briefing is read before a mission and the record is read between two of
 * them, and both screens are in the same position: about 28,000 words of
 * in-register prose ship in `@echoes/shared` and in `record.ts`, and these two
 * components are the only thing standing between that text and the player.
 * Neither may add prose of its own, edit what it was given, or reorder it.
 *
 * So the assertions here are about **whose words are on screen and under whose
 * name**, never about layout:
 *
 * - the briefing names its reader, in the register that reader speaks in, and
 *   the court takes chrome because it is the one voice not heard through water;
 * - the "already seen" variant is attributed identically and stays unmarked,
 *   which is §1's rule and the one a marking would quietly break;
 * - the record shows a page it has not entered, with its condition attached,
 *   rather than removing it — the shell's closed-door rule applied to a page.
 *
 * `record.test.ts` already holds which history enters which page, and the
 * shared suite holds every briefing's speaker to its campaign's register.
 * Neither can see whether the screen renders what it was handed.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import {
  MARR_PLATEAU_FILED,
  MISSION_HEADERS,
  PROLOGUE_SORROWGATE_HEADER,
  missionBriefing,
  missionHeaderById,
} from '@echoes/shared';
import './support/headless.ts';
import { click, render, type Rendered } from './support/screen.ts';
import { BriefingScreen } from '../src/menu/BriefingScreen.tsx';
import { RecordScreen } from '../src/menu/RecordScreen.tsx';
import { ADMISSION_LINE, RECORD_PAGES, countLine, readRecord } from '../src/menu/record.ts';

interface Doors {
  descents: number;
  backs: number;
}

async function briefing(
  missionId: string,
  seenScenes: ReadonlySet<string> = new Set()
): Promise<{ view: Rendered; doors: Doors }> {
  const doors: Doors = { descents: 0, backs: 0 };
  const view = await render(
    createElement(BriefingScreen, {
      missionId,
      seenScenes,
      onDescend: () => doors.descents++,
      onBack: () => doors.backs++,
    })
  );
  return { view, doors };
}

/** The mission whose briefing has an "already seen" variant (campaign.md §1). */
const VARIANT_MISSION = 'seeding-thin-water';

describe('the briefing: whose words, and whose name on them', () => {
  it('reads the authored paragraphs whole, in the authored order', async () => {
    // The screen "adds no prose of its own to the court's register", so the
    // paragraphs on it are the catalogue's array and nothing else — not
    // joined, not trimmed, not summarised.
    const { view } = await briefing(PROLOGUE_SORROWGATE_HEADER.id);
    try {
      const paragraphs = view.allByClass('briefing-line').map((p) => String(p.props.children));
      assert.deepEqual(paragraphs, missionBriefing(PROLOGUE_SORROWGATE_HEADER, new Set()));
    } finally {
      await view.unmount();
    }
  });

  it('names the register and the reading, and gives the court no navy', async () => {
    // §14, "Who is speaking": the register in the faction's own word for
    // itself, then the reading's attribution from the mission document's §12.
    // "The court has no navy and takes chrome, because it is the one voice in
    // the Rift that is not heard through water."
    const { view } = await briefing(PROLOGUE_SORROWGATE_HEADER.id);
    try {
      assert.equal(String(view.byClass('briefing-register').props.children[1]), 'the court');
      assert.equal(
        String(view.byClass('briefing-speaker-line').props.children),
        PROLOGUE_SORROWGATE_HEADER.spokenBy,
        'quoted, not composed here'
      );
      assert.deepEqual(
        view.byClass('briefing-speaker').props.style,
        {},
        'no faction ink on the court'
      );
      assert.equal(view.root.findAll((node) => node.type === 'svg').length, 0, 'and no glyph');
    } finally {
      await view.unmount();
    }
  });

  it('gives a faction’s reader its navy’s ink and glyph', async () => {
    // §12.5's licensed dress, on a screen that is not the instrument.
    const { view } = await briefing(VARIANT_MISSION);
    try {
      assert.equal(String(view.byClass('briefing-register').props.children[1]), 'the plateaus');
      const ink = (view.byClass('briefing-speaker').props.style as Record<string, string>)[
        '--faction'
      ];
      assert.match(String(ink), /^#[0-9a-f]{6}$/, 'read from FACTION_PALETTE at render');
      assert.ok(view.root.findAll((node) => node.type === 'svg').length > 0, 'and its glyph');
    } finally {
      await view.unmount();
    }
  });
});

describe('the briefing: the reading a player has earned', () => {
  it('shows the variant to a player who witnessed the scene it is written for', async () => {
    const header = missionHeaderById(VARIANT_MISSION)!;
    const plain = await briefing(VARIANT_MISSION);
    const filed = await briefing(VARIANT_MISSION, new Set([MARR_PLATEAU_FILED]));
    try {
      const read = (view: Rendered) =>
        view.allByClass('briefing-line').map((p) => String(p.props.children));
      assert.deepEqual(read(plain.view), missionBriefing(header, new Set()));
      assert.deepEqual(read(filed.view), missionBriefing(header, new Set([MARR_PLATEAU_FILED])));
      assert.notDeepEqual(read(plain.view), read(filed.view), 'the reading changed');
    } finally {
      await plain.view.unmount();
      await filed.view.unmount();
    }
  });

  it('leaves the variant unmarked and identically attributed', async () => {
    // docs/campaign.md §1, and the rule most easily broken by a well-meant
    // badge: "the reader does not change with what the player has already
    // witnessed, only the reading." A briefing the player has earned a
    // different reading of should read as the briefing, not as an unlockable.
    const plain = await briefing(VARIANT_MISSION);
    const filed = await briefing(VARIANT_MISSION, new Set([MARR_PLATEAU_FILED]));
    try {
      const attribution = (view: Rendered) => [
        String(view.byClass('briefing-register').props.children[1]),
        String(view.byClass('briefing-speaker-line').props.children),
      ];
      assert.deepEqual(attribution(filed.view), attribution(plain.view));
      assert.equal(
        filed.view.allByClass('briefing-line').length,
        plain.view.allByClass('briefing-line').length,
        'and nothing was added beside the paragraphs to say so'
      );
    } finally {
      await plain.view.unmount();
      await filed.view.unmount();
    }
  });
});

describe('the briefing: what it commits to', () => {
  it('carries the mission’s own name, premise and length band', async () => {
    const header = missionHeaderById(VARIANT_MISSION)!;
    const { view } = await briefing(VARIANT_MISSION);
    try {
      assert.ok(view.shows(header.name));
      assert.ok(view.shows(header.premise), 'the premise the board quoted, said again here');
      const [lowS, highS] = header.lengthBandS;
      assert.equal(
        (view.byClass('briefing-meta').props.children as unknown[]).join(''),
        `mission ${header.ordinal} · ${Math.round(lowS / 60)}–${Math.round(highS / 60)} min`,
        'the band as the two minute figures a player reads it as'
      );
    } finally {
      await view.unmount();
    }
  });

  it('descends and returns, and does neither by rendering', async () => {
    const { view, doors } = await briefing(PROLOGUE_SORROWGATE_HEADER.id);
    try {
      assert.deepEqual([doors.descents, doors.backs], [0, 0]);
      await click(view, 'Descend');
      assert.deepEqual([doors.descents, doors.backs], [1, 0]);
      await click(view, 'Back');
      assert.deepEqual([doors.descents, doors.backs], [1, 1]);
    } finally {
      await view.unmount();
    }
  });

  it('offers no way into a mission that does not exist', async () => {
    // A mission id resolving to nothing is a broken link rather than a mission
    // with no briefing, and the honest answer is the way back — not a Descend
    // that joins a room for something the catalogue has never heard of.
    const { view, doors } = await briefing('a-mission-nobody-wrote');
    try {
      assert.ok(view.shows('No such mission'));
      const buttons = view.root.findAll((node) => node.type === 'button');
      assert.equal(buttons.length, 1, 'one door, and it goes back');
      await click(view, 'Back');
      assert.deepEqual([doors.descents, doors.backs], [0, 1]);
    } finally {
      await view.unmount();
    }
  });
});

interface Leaving {
  backs: number;
}

async function record(
  played: readonly string[] = []
): Promise<{ view: Rendered; leaving: Leaving }> {
  const leaving: Leaving = { backs: 0 };
  const view = await render(
    createElement(RecordScreen, {
      hasPlayed: (missionId: string) => played.includes(missionId),
      onBack: () => leaving.backs++,
    })
  );
  return { view, leaving };
}

/** A Ledger mission on the Rim — the history §14 uses to describe the gap. */
const LEDGER_ON_THE_RIM = MISSION_HEADERS.find(
  (header) => header.campaign === 'ledger' && header.mapId === 'mouth-rim'
)!;

describe('the record: a page that is not yet entered is still on the page', () => {
  it('shows all six eras to a player who has finished nothing', async () => {
    // §14: "a page not yet entered keeps the disabled rule the board keeps —
    // dimmed to 40%, never removed, its condition attached in the register."
    const { view } = await record();
    try {
      assert.equal(view.allByClass('record-page').length, RECORD_PAGES.length);
      assert.equal(
        view.allByClass('record-page-withheld').length,
        RECORD_PAGES.length,
        'every one of them withheld, and every one of them present'
      );
      assert.equal(view.allByClass('record-entry').length, 0, 'and no line of the court read');
    } finally {
      await view.unmount();
    }
  });

  it('says why a page is withheld, in the register rather than as a lock', async () => {
    const { view } = await record();
    try {
      const conditions = view.allByClass('record-condition').map((p) => String(p.props.children));
      assert.deepEqual(
        conditions,
        RECORD_PAGES.map((page) => ADMISSION_LINE[page.admission]),
        'the court states the condition; it does not say the page is locked'
      );
    } finally {
      await view.unmount();
    }
  });

  it('reads an entered page whole, and shows the gap rather than closing it', async () => {
    // §14's own example: "A Ledger player who reaches the rim has the Present
    // Crisis and not the Long Arrangement, and the gap is shown rather than
    // closed." Which pages those are is `record.test.ts`'s; that the screen
    // renders entries for one and a condition for the other is this file's.
    const { view } = await record([LEDGER_ON_THE_RIM.id]);
    try {
      const reading = readRecord((missionId) => missionId === LEDGER_ON_THE_RIM.id);
      const entered = reading.filter((page) => page.entered);
      const withheld = reading.filter((page) => !page.entered);
      assert.ok(entered.length > 0 && withheld.length > 0, 'the history §14 describes');

      assert.equal(view.allByClass('record-page-entered').length, entered.length);
      assert.deepEqual(
        view.allByClass('record-entry').map((p) => String(p.props.children)),
        entered.flatMap((page) => [...page.page.entries]),
        'the authored paragraphs, in the authored order, with nothing added'
      );
      assert.equal(view.allByClass('record-condition').length, withheld.length);
    } finally {
      await view.unmount();
    }
  });

  it('reads the count aloud at the top and leaves it to sit', async () => {
    const { view } = await record([PROLOGUE_SORROWGATE_HEADER.id]);
    try {
      const reading = readRecord((missionId) => missionId === PROLOGUE_SORROWGATE_HEADER.id);
      assert.equal(String(view.byClass('record-count').props.children), countLine(reading));
    } finally {
      await view.unmount();
    }
  });

  it('is a labelled dialog with one door, which is back to the board', async () => {
    // §14, "Two doors in, one door out". Which screen Back lands on is the
    // shell's decision and `appShell.test.ts` holds it; that there is exactly
    // one way out of the record is this screen's.
    const { view, leaving } = await record();
    try {
      assert.equal(view.byClass('menu-screen').props['aria-label'], 'The record');
      assert.equal(view.root.findAll((node) => node.type === 'button').length, 1);
      await click(view, 'Back');
      assert.equal(leaving.backs, 1);
    } finally {
      await view.unmount();
    }
  });
});
