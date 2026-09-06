/**
 * The two in-match feeds (#494) — docs/ui-ux.md §10 and
 * docs/mission-sorrowgate.md §12.
 *
 * They are two components rather than one because they are two different
 * records, and that is the design decision worth holding. The contact log is
 * what *this player heard*, and its value is that every row in it was earned;
 * a scripted line is not a detection, and interleaving the two would dilute
 * the one artefact the game asks a player to reason over afterwards. So they
 * are tested together, in one file, precisely because the interesting rules
 * are the ones they share and the ones they must not.
 *
 * What they share: one clock. §10's `T+mm:ss` sits on both, because the feeds
 * sit side by side and a player reads across them. `MissionLog` spells that
 * format out a second time instead of importing `clock.ts`, so the two can
 * drift, and nothing was watching. This file watches.
 *
 * Neither of these is a test of how a row looks — that is a screenshot's job.
 * They are tests of what a row is allowed to claim.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { ResolutionTier, SIM, type MissionLine } from '@echoes/shared';
import './support/headless.ts';
import { render, type Rendered } from './support/screen.ts';
import { ContactLog } from '../src/game/ContactLog.tsx';
import { MissionLog } from '../src/game/MissionLog.tsx';
import { stamp } from '../src/game/clock.ts';
import type { ContactLogEntry } from '../src/game/EchoRenderer.ts';

function entry(over: Partial<ContactLogEntry> = {}): ContactLogEntry {
  return {
    id: 'c-1',
    tick: 4 * 60 * SIM.TICK_HZ + 12 * SIM.TICK_HZ,
    tier: ResolutionTier.Contact,
    fresh: true,
    label: 'contact',
    ...over,
  };
}

function line(over: Partial<MissionLine> = {}): MissionLine {
  return {
    tick: 9 * 60 * SIM.TICK_HZ,
    speaker: 'Marr',
    text: 'They are still in the chamber.',
    voice: 'plateaus',
    speakerId: 'marr',
    ...over,
  };
}

interface Focused {
  at: Array<[number, number]>;
}

async function contactLog(
  entries: ContactLogEntry[]
): Promise<{ view: Rendered; focused: Focused }> {
  const focused: Focused = { at: [] };
  const view = await render(
    createElement(ContactLog, { entries, onFocus: (x, y) => focused.at.push([x, y]) })
  );
  return { view, focused };
}

/** The four columns of one row, in the order §10's sample prints them. */
function columns(view: Rendered, index = 0): string[] {
  const pick = (className: string): string =>
    String(view.allByClass(className)[index]?.props.children ?? '');
  return [
    pick('contact-log-time'),
    pick('contact-log-tier'),
    pick('contact-log-label'),
    pick('contact-log-detail'),
  ];
}

describe('the contact log: the accessible mirror of the audio channel', () => {
  it('is a live log region, because §11 owes a mute player every detection', async () => {
    const { view } = await contactLog([entry()]);
    try {
      const list = view.byClass('contact-log-entries');
      assert.equal(list.props.role, 'log', 'entries append; they are never rewritten');
      assert.equal(list.props['aria-live'], 'polite');
    } finally {
      await view.unmount();
    }
  });

  it('says it is empty rather than drawing nothing at all', async () => {
    const { view } = await contactLog([]);
    try {
      assert.ok(view.shows('no contacts'));
    } finally {
      await view.unmount();
    }
  });
});

describe('the contact log: a row claims exactly what was sent', () => {
  it('admits it has no bearing rather than inventing one', async () => {
    // §10's first sample row. Tier 1 carries the listener's own position, not
    // the emitter's, so there is no direction in the report.
    const { view } = await contactLog([entry({ tier: ResolutionTier.Contact })]);
    try {
      assert.deepEqual(columns(view), ['T+04:12', 'TIER 1', 'contact', 'bearing unknown']);
    } finally {
      await view.unmount();
    }
  });

  it('gives the "you were pinged" row a direction and nothing else', async () => {
    // §10's third sample row: the server sent a bearing and no position, under
    // the `---` tier the log reserves for events that are not detections.
    const { view } = await contactLog([
      entry({ tier: ResolutionTier.Silent, label: 'you were pinged', bearingDeg: 70 }),
    ]);
    try {
      const [, tier, label, detail] = columns(view);
      assert.equal(tier, '---');
      assert.equal(label, 'you were pinged');
      assert.equal(detail, 'bearing 070°', 'zero-padded, so the digit count never shifts (§3)');
    } finally {
      await view.unmount();
    }
  });

  it('rounds a range to the nearest hundred metres and tildes it at every tier', async () => {
    // Range is blurred at Tier 2 by design and exact at 3+. The tilde is on
    // both because a player should not have to remember which they are reading.
    const { view } = await contactLog([
      entry({ id: 'a', tier: ResolutionTier.Bearing, bearingDeg: 245, rangeM: 1437 }),
      entry({ id: 'b', tier: ResolutionTier.Classification, bearingDeg: 118, rangeM: 2149 }),
    ]);
    try {
      assert.equal(columns(view, 0)[3], 'bearing 245°   ~1400 m');
      assert.equal(columns(view, 1)[3], 'bearing 118°   ~2100 m');
    } finally {
      await view.unmount();
    }
  });

  it('keeps a mark off the tier ramp and spends its range column on the fade', async () => {
    // docs/ui-ux.md §10 and §5: a mark is the past rather than the present, so
    // it is not a worse Tier 1 — it is a different kind of thing, and "past and
    // present must never share an ink". How far away a stain is says little;
    // watching it fade is the whole reading.
    const { view } = await contactLog([
      entry({ label: 'industrial hum', bearingDeg: 310, rangeM: 900, mark: true }),
    ]);
    try {
      const [, tier, label, detail] = columns(view);
      assert.equal(tier, 'MARK', 'not TIER 1, though it arrived carrying a tier');
      assert.equal(label, 'industrial hum', 'named in systems-echo.md §7’s own words');
      assert.equal(detail, 'bearing 310°   decaying', 'and never a distance');
      assert.match(
        String(view.byClass('contact-log-row').props.className),
        /\bmark\b/,
        'and it takes the residue layer’s ink rather than a rung of the ramp'
      );
    } finally {
      await view.unmount();
    }
  });
});

describe('the contact log: where a row may send the camera', () => {
  it('focuses only where a position was actually reported', async () => {
    const { view, focused } = await contactLog([
      entry({ id: 'placed', bearingDeg: 118, rangeM: 2100, focusX: 900, focusY: -240 }),
      entry({ id: 'bearing-only', tier: ResolutionTier.Contact }),
    ]);
    try {
      const rows = view.allByClass('contact-log-row');
      assert.equal((rows[1]!.props as { disabled?: boolean }).disabled, true, 'nowhere honest');
      await view.act(() => {
        (rows[0]!.props as { onClick?: () => void }).onClick?.();
      });
      assert.deepEqual(focused.at, [[900, -240]]);
    } finally {
      await view.unmount();
    }
  });

  it('sends the camera nowhere when only half a position arrived', async () => {
    // Defensive, and worth being: half a coordinate is not a place, and
    // `focus(x, undefined)` would recentre on the map's spine.
    const { view, focused } = await contactLog([entry({ focusX: 900 })]);
    try {
      await view.act(() => {
        (view.byClass('contact-log-row').props as { onClick?: () => void }).onClick?.();
      });
      assert.deepEqual(focused.at, []);
    } finally {
      await view.unmount();
    }
  });
});

describe('the two feeds: one clock, in one shape', () => {
  it('stamps the same tick identically, because a player reads across them', async () => {
    // `MissionLog` spells `T+mm:ss` out for itself rather than importing
    // `clock.ts`. Two feeds on one screen that disagreed about what time it is
    // would make the reading they exist for impossible, so the duplication is
    // pinned here rather than trusted.
    const tick = 10 * 60 * SIM.TICK_HZ + 41 * SIM.TICK_HZ;
    const heard = await contactLog([entry({ tick })]);
    const said = await render(createElement(MissionLog, { lines: [line({ tick })] }));
    try {
      assert.equal(stamp(tick), 'T+10:41');
      assert.equal(columns(heard.view)[0], stamp(tick));
      assert.equal(String(said.byClass('mission-log-time').props.children), stamp(tick));
    } finally {
      await heard.view.unmount();
      await said.unmount();
    }
  });
});

describe('the mission log: the say channel', () => {
  it('is its own live region, and never the record of what was heard', async () => {
    const view = await render(createElement(MissionLog, { lines: [line()] }));
    try {
      const section = view.byClass('mission-log');
      assert.equal(section.props['aria-label'], 'Mission log');
      assert.equal(view.byClass('mission-log-entries').props.role, 'log');
      assert.equal(
        view.allByClass('contact-log-row').length,
        0,
        'a scripted line is not a detection and never becomes a contact row'
      );
    } finally {
      await view.unmount();
    }
  });

  it('keeps both of two lines that share a tick and a speaker', async () => {
    // Nothing on the wire identifies a line, so position in the feed is the
    // identity. A feed that deduplicated on tick and speaker would silently
    // eat the second half of an exchange.
    const view = await render(
      createElement(MissionLog, {
        lines: [line({ text: 'Fourteen are behind it.' }), line({ text: 'The record is closed.' })],
      })
    );
    try {
      const texts = view.allByClass('mission-log-text').map((n) => String(n.props.children));
      assert.deepEqual(texts, ['Fourteen are behind it.', 'The record is closed.']);
    } finally {
      await view.unmount();
    }
  });
});

describe('the two feeds: following the tail, but never yanking a reader back', () => {
  it('scrolls to the newest line while the player is at the bottom', async () => {
    const { view } = await contactLog([entry({ id: 'a' })]);
    try {
      const host = view.hosts.get('contact-log-entries')!;
      host.scrollHeight = 900;
      host.clientHeight = 300;
      await view.update(
        createElement(ContactLog, {
          entries: [entry({ id: 'a' }), entry({ id: 'b' })],
          onFocus: () => {},
        })
      );
      assert.equal(host.scrollTop, 900, 'a new detection is worth showing');
    } finally {
      await view.unmount();
    }
  });

  it('leaves the player where they scrolled to once they scroll up to read', async () => {
    // §10: post-match analysis of "when did they hear me" is a real activity,
    // and a log that yanked the reader back to the newest line mid-read would
    // be useless for exactly the thing it exists for.
    const { view } = await contactLog([entry({ id: 'a' })]);
    try {
      const host = view.hosts.get('contact-log-entries')!;
      const list = view.byClass('contact-log-entries');
      host.scrollHeight = 900;
      host.clientHeight = 300;
      host.scrollTop = 120;
      await view.act(() => {
        (list.props as { onScroll?: (e: unknown) => void }).onScroll?.({ currentTarget: host });
      });
      await view.update(
        createElement(ContactLog, {
          entries: [entry({ id: 'a' }), entry({ id: 'b' })],
          onFocus: () => {},
        })
      );
      assert.equal(host.scrollTop, 120, 'still reading the line they scrolled up to');
    } finally {
      await view.unmount();
    }
  });

  it('re-pins to the tail once the player scrolls back down to it', async () => {
    const { view } = await contactLog([entry({ id: 'a' })]);
    try {
      const host = view.hosts.get('contact-log-entries')!;
      const list = view.byClass('contact-log-entries');
      host.scrollHeight = 900;
      host.clientHeight = 300;
      const scrollTo = async (top: number) => {
        host.scrollTop = top;
        await view.act(() => {
          (list.props as { onScroll?: (e: unknown) => void }).onScroll?.({ currentTarget: host });
        });
      };
      await scrollTo(120);
      await scrollTo(590); // 900 - 590 - 300 = 10, inside the 24px slack.
      await view.update(
        createElement(ContactLog, {
          entries: [entry({ id: 'a' }), entry({ id: 'b' })],
          onFocus: () => {},
        })
      );
      assert.equal(host.scrollTop, 900, 'back at the bottom is back to following');
    } finally {
      await view.unmount();
    }
  });
});
