/**
 * The two ways a room ends (#494) — docs/tech-stack.md "Match lifecycle",
 * docs/mission-sorrowgate.md §8, docs/ui-ux.md §14.
 *
 * `MatchResult` and `MissionResult` are siblings rather than two modes of one
 * card, and the pair of rules that keeps them apart is what this file holds.
 *
 * A match resolves a winner, and the screen reports that one fact. Not a kill
 * tally, not a resource graph, not where the other commander actually was: a
 * post-match screen that reveals the match is a delayed maphack, because the
 * second game on the same map would be played with knowledge the first refused
 * to give. A mission does not resolve a winner at all — nobody was beaten —
 * and **a partial result is a result**, which the heading has to say out loud
 * or the UI overrules the fiction about the one thing the fiction is for.
 *
 * Both cards therefore have an assertion here about what they do *not* say,
 * and those are the ones worth having.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import type { ReactTestInstance } from 'react-test-renderer';
import {
  AiDifficulty,
  Faction,
  MissionOutcome,
  ObjectiveStatus,
  type LobbyPlayerView,
  type MissionResultPayload,
} from '@echoes/shared';
import './support/headless.ts';
import { click, render, type Rendered } from './support/screen.ts';
import {
  APP_CSS,
  columnFloors,
  columnOf,
  parseCss,
  resolveBox,
  wordBreaking,
  type Element,
} from './support/cssBox.ts';
import { MatchResult } from '../src/game/MatchResult.tsx';
import { MissionResult } from '../src/game/MissionResult.tsx';

function seat(over: Partial<LobbyPlayerView> = {}): LobbyPlayerView {
  return {
    sessionId: 'seat-1',
    name: 'Korrin',
    slot: 0,
    faction: Faction.Directorate,
    ready: false,
    connected: true,
    isAi: false,
    difficulty: AiDifficulty.Recruit,
    ...over,
  };
}

/** A four-seat room: you at slot 1, and three commanders you never resolved. */
function roster(over: { yours?: Partial<LobbyPlayerView> } = {}): LobbyPlayerView[] {
  return [
    seat({ sessionId: 'seat-0', name: 'Varr-Kest', slot: 0, faction: Faction.Bathyarch }),
    seat({ sessionId: 'seat-1', name: 'Korrin', slot: 1, ...over.yours }),
    seat({ sessionId: 'seat-2', name: 'Osk', slot: 2, faction: Faction.Pelagia }),
    seat({ sessionId: 'seat-3', name: 'Teel', slot: 3, faction: Faction.Hadron }),
  ];
}

interface MatchCalls {
  rematch: boolean[];
  exits: number;
}

async function matchResult(
  over: { winnerSlot?: number; players?: LobbyPlayerView[]; sessionId?: string | null } = {}
): Promise<{ view: Rendered; calls: MatchCalls }> {
  const calls: MatchCalls = { rematch: [], exits: 0 };
  const view = await render(
    createElement(MatchResult, {
      winnerSlot: over.winnerSlot ?? 0,
      players: over.players ?? roster(),
      sessionId: over.sessionId === undefined ? 'seat-1' : over.sessionId,
      onRematch: (ready) => calls.rematch.push(ready),
      onExitToMenu: () => calls.exits++,
    })
  );
  return { view, calls };
}

describe('the match result: one fact, and no more than one', () => {
  it('names the winner and says nothing about anyone else', async () => {
    // The roster holds three commanders besides the winner. Naming a loser
    // here would be a reveal: in a four-way room, who was still standing at
    // the end is information the water never gave you.
    const { view } = await matchResult();
    try {
      const said = view.text().join(' ');
      assert.match(said, /Varr-Kest/, 'the one fact');
      assert.match(said, /Bathyarch Consortium/, 'and which navy it was');
      for (const other of ['Osk', 'Teel']) {
        assert.equal(said.includes(other), false, `${other} was never resolved and is not named`);
      }
    } finally {
      await view.unmount();
    }
  });

  it('reads the outcome from your own seat, not from the room’s', async () => {
    const lost = await matchResult({ winnerSlot: 0, sessionId: 'seat-1' });
    try {
      assert.ok(lost.view.shows('Contact lost'));
    } finally {
      await lost.view.unmount();
    }

    const won = await matchResult({ winnerSlot: 1, sessionId: 'seat-1' });
    try {
      assert.ok(won.view.shows('The water is yours'));
    } finally {
      await won.view.unmount();
    }
  });

  it('says the match merely ended when no seat holds the winning slot', async () => {
    // Everyone gone: there is no winner to name, and inventing one from the
    // slot number would name a commander who is not there.
    const { view } = await matchResult({ winnerSlot: 9 });
    try {
      assert.ok(view.shows('Match ended'));
      assert.ok(view.shows('No commander was left standing.'));
    } finally {
      await view.unmount();
    }
  });
});

describe('the match result: asking for another', () => {
  it('toggles this seat’s readiness rather than asserting it', async () => {
    const waiting = await matchResult({
      players: roster({ yours: { ready: true } }),
    });
    try {
      assert.ok(waiting.view.shows('Waiting…'), 'the button reports the state it would leave');
      await click(waiting.view, 'Waiting…');
      assert.deepEqual(waiting.calls.rematch, [false], 'pressing it again withdraws');
    } finally {
      await waiting.view.unmount();
    }

    const idle = await matchResult();
    try {
      await click(idle.view, 'Rematch');
      assert.deepEqual(idle.calls.rematch, [true]);
    } finally {
      await idle.view.unmount();
    }
  });

  it('refuses the rematch to someone who holds no seat', async () => {
    // A spectator, or a client whose seat was reassigned. There is nothing to
    // ready, and §7 would rather grey the button than refuse the click.
    const { view } = await matchResult({ sessionId: null });
    try {
      assert.equal((view.button('Rematch').props as { disabled?: boolean }).disabled, true);
    } finally {
      await view.unmount();
    }
  });

  it('counts who it is waiting on only once you have readied yourself', async () => {
    const before = await matchResult();
    try {
      assert.ok(before.view.shows('Same ground, same roster, a new world.'));
      assert.equal(before.view.text().join(' ').includes('Waiting on'), false);
    } finally {
      await before.view.unmount();
    }

    // You have readied; two of the other three have not, and one has left.
    const players = roster({ yours: { ready: true } });
    players[2] = { ...players[2]!, connected: false };
    const after = await matchResult({ players });
    try {
      assert.ok(
        after.view.shows('Waiting on 2 commanders.'),
        'a commander who has gone is not somebody the room is waiting on'
      );
    } finally {
      await after.view.unmount();
    }
  });

  it('says commander in the singular when it is waiting on one', async () => {
    const players = roster({ yours: { ready: true } });
    players[0] = { ...players[0]!, ready: true };
    players[2] = { ...players[2]!, ready: true };
    const { view } = await matchResult({ players });
    try {
      assert.ok(view.shows('Waiting on 1 commander.'));
    } finally {
      await view.unmount();
    }
  });

  it('leaves the room by the one door that abandons the seat', async () => {
    const { view, calls } = await matchResult();
    try {
      await click(view, 'Return to port');
      assert.equal(calls.exits, 1);
      assert.deepEqual(calls.rematch, [], 'and leaving is not a rematch request');
    } finally {
      await view.unmount();
    }
  });
});

interface MissionCalls {
  again: boolean[];
  exits: number;
  records: number;
}

function payload(over: Partial<MissionResultPayload> = {}): MissionResultPayload {
  return {
    missionId: 'sorrowgate',
    outcome: MissionOutcome.Partial,
    epilogue:
      'One tender is through. The rest are in the record. The count will be read in this ' +
      'chamber when there is a chamber, and until then it stands as read.',
    objectives: [
      {
        id: 'tenders',
        text: 'Both tenders reach the Upper Concourse.',
        status: ObjectiveStatus.Failed,
        progress: { done: 1, of: 2 },
      },
      { id: 'quiet', text: 'The flight stays under twenty.', status: ObjectiveStatus.Met },
    ],
    ...over,
  };
}

async function missionResult(
  result: MissionResultPayload,
  ready = false
): Promise<{ view: Rendered; calls: MissionCalls }> {
  const calls: MissionCalls = { again: [], exits: 0, records: 0 };
  const view = await render(
    createElement(MissionResult, {
      result,
      ready,
      onAgain: (next) => calls.again.push(next),
      onExitToMenu: () => calls.exits++,
      onRecord: () => calls.records++,
    })
  );
  return { view, calls };
}

describe('the mission result: a partial run is a result', () => {
  it('says a partial mission ended, and never that it was lost', async () => {
    // docs/mission-sorrowgate.md §8: "A partial result ends the mission and is
    // a result. It is not a soft failure and the player is not asked to replay
    // it." A heading calling it a loss would be the client overruling the
    // fiction about the one thing the fiction is for.
    const { view } = await missionResult(payload({ outcome: MissionOutcome.Partial }));
    try {
      assert.ok(view.shows('Mission ended'));
      assert.equal(view.text().join(' ').includes('lost'), false);
      assert.equal(
        String(view.root.findByType('h2').props.className),
        'mission-result-partial',
        'the colour that tells, not the colour that warns'
      );
    } finally {
      await view.unmount();
    }
  });

  it('keeps the other two readings distinct from it', async () => {
    for (const [outcome, heading] of [
      [MissionOutcome.Complete, 'Mission complete'],
      [MissionOutcome.Lost, 'Mission lost'],
    ] as const) {
      const { view } = await missionResult(payload({ outcome }));
      try {
        assert.ok(view.shows(heading));
      } finally {
        await view.unmount();
      }
    }
  });

  it('reads the court’s own words back, whole and unedited', async () => {
    // The authored epilogue is the whole report. The heading above it is
    // chrome, so a mission's voice is never competing with the client's.
    const result = payload();
    const { view } = await missionResult(result);
    try {
      assert.equal(view.byClass('mission-result-line').props.children, result.epilogue);
    } finally {
      await view.unmount();
    }
  });

  it('lists the objectives as the player was told them, frozen at the close', async () => {
    // `MatchResult`'s rule carried over: what the player knew, never what was
    // true. No reveal of the water, no tally of the other parties, no score.
    const { view } = await missionResult(payload());
    try {
      const statuses = view
        .allByClass('mission-result-status')
        .map((n) => String(n.props.children));
      assert.deepEqual(statuses, ['failed', 'met'], 'in the order they were shown, as words');
      const texts = view.allByClass('mission-result-text').map((n) => String(n.props.children));
      assert.deepEqual(texts, [
        'Both tenders reach the Upper Concourse.',
        'The flight stays under twenty.',
      ]);
      const progress = view.allByClass('mission-result-progress');
      assert.equal(progress.length, 1, 'a counter only where the mission sent one');
      assert.equal(
        (progress[0]!.props.children as unknown[]).join(''),
        '1 of 2',
        'the counter the mission was already showing, not a score computed here'
      );
    } finally {
      await view.unmount();
    }
  });
});

/**
 * The card's objective row, and whether a mission's own words can carry the
 * counter beside them out of it (#773).
 *
 * `.objectives-row` was given a floored track and shrinkable items in #760
 * (invariant 33). This row is the same three-column shape, holding the same
 * verbatim authored text, and it had neither — so the fault was not fixed
 * there, it was fixed in one of the three places that have it.
 *
 * Held here the way it is held for the panel: over every row shape the card can
 * draw rather than one mission's objectives, and against the placement the
 * stylesheet actually declares, so an edit that moves the authored text to
 * another column moves the check with it.
 */
describe('the mission result: a mission’s words cannot carry the counter out', () => {
  /** Where a result row sits — see `MissionResult` and `GameCanvas`. */
  const ANCESTORS = [
    { tag: 'div', classes: ['game-root'] },
    { tag: 'div', classes: ['game-under'] },
    { tag: 'div', classes: ['mission-result'] },
    { tag: 'div', classes: ['mission-result-panel'] },
    { tag: 'ul', classes: ['mission-result-objectives'] },
  ];

  /**
   * Every row shape the card can draw, which is six: the counter is printed on
   * `progress !== undefined` alone (`MissionResult`), independently of the
   * status, so the two vary freely. Both halves matter — the counter is the
   * child the overflow carries off, and a row without one has a different
   * child count — and so does the status, because the sheet qualifies two of
   * the three words (`.mission-result-objective.met` and `.failed`; `open`
   * falls to the base rule), so a later rule qualified by status would sit
   * outside a walk that skipped one.
   */
  const shapes = (): MissionResultPayload =>
    payload({
      objectives: [
        {
          id: 'open-counted',
          text: 'Both tenders reach the Upper Concourse.',
          status: ObjectiveStatus.Pending,
          progress: { done: 0, of: 2 },
        },
        {
          id: 'open',
          text: 'The flight stays under twenty.',
          status: ObjectiveStatus.Pending,
        },
        {
          id: 'met-counted',
          text: 'Nine are aboard and the lock is shut.',
          status: ObjectiveStatus.Met,
          progress: { done: 2, of: 2 },
        },
        { id: 'met', text: 'The court is answered.', status: ObjectiveStatus.Met },
        {
          id: 'failed-counted',
          text: 'The service lock is held to the adjournment.',
          status: ObjectiveStatus.Failed,
          progress: { done: 1, of: 2 },
        },
        {
          id: 'failed',
          text: 'The second tender is in the record.',
          status: ObjectiveStatus.Failed,
        },
      ],
    });

  /**
   * Every row the card rendered, as the box reader wants them. Tags are read
   * off the tree rather than assumed, the row's and its children's alike:
   * `cssBox` branches on the tag (`uaBoxSizing`), and a tag-qualified selector
   * asked about under the wrong tag misses in silence, which is the direction
   * that reads as cover. Two tags boxing differently under identical author
   * CSS is the whole of what hid #752.
   */
  async function rows(): Promise<
    Array<{ element: Element; children: Array<{ tag: string; classes: string[] }> }>
  > {
    const { view } = await missionResult(shapes());
    try {
      return view.allByClass('mission-result-objective').map((row) => ({
        element: {
          tag: String(row.type),
          classes: String((row.props as { className: string }).className).split(/\s+/),
          ancestors: ANCESTORS,
        },
        children: row.children
          .filter((child): child is ReactTestInstance => typeof child !== 'string')
          .map((child) => ({
            tag: String(child.type),
            classes: String((child.props as { className?: string }).className ?? '')
              .split(/\s+/)
              .filter(Boolean),
          })),
      }));
    } finally {
      await view.unmount();
    }
  }

  it('gives a mission’s own words a track that cannot widen the row', async () => {
    // A `1fr` track's automatic minimum is min-content, so one long unbreakable
    // token in an authored objective floors the middle track at that token's
    // own width and pushes the columns to its right out of the card. The card
    // is a scroll container on both axes — `.mission-result-panel` sets
    // `overflow-y: auto`, and an `overflow` that is `visible` on one axis
    // computes to `auto` on the other — so what the player gets is a counter
    // scrolled out of a box nothing teaches them to scroll: §2's "invisible
    // rather than absent".
    //
    // Driven in Chromium at 1440x900 before this was fixed: the middle track
    // resolved to 597.69px against 455.83px with the pair, and the counter's
    // layout box sat 116px past the card's padding edge.
    const rules = parseCss(APP_CSS);
    const rendered = await rows();
    assert.equal(rendered.length, 6, 'all six shapes rendered');

    for (const { element, children } of rendered) {
      // Which track holds the authored sentence is decided by auto-flow here,
      // not by a `grid-column` the way the panel's row decides it. So assert
      // that first: a child given an explicit column would invalidate the
      // arithmetic below rather than merely move it, and this fails loudly
      // instead of guarding whichever track the old order happened to use.
      for (const child of children) {
        assert.equal(
          columnOf(rules, { ...child, ancestors: [...ANCESTORS, element] }),
          undefined,
          `.${child.classes.join('.')} is placed explicitly, so flow order no longer says which track is the sentence's`
        );
      }

      const floors = columnFloors(rules, element);
      assert.equal(floors.length, 3, 'the row is the three-column shape');
      // Flow order: the status word, the mission's sentence, then the counter.
      assert.deepEqual(
        children.map((child) => child.classes[0]),
        ['mission-result-status', 'mission-result-text', 'mission-result-progress'].slice(
          0,
          children.length
        ),
        'the sentence is the second child, so it is in the second track'
      );
      assert.equal(
        floors[1]!.kind,
        'definite',
        `a row puts the mission's sentence in a track floored by ${JSON.stringify(floors[1])}`
      );
    }
  });

  it('lets every child of a result row shrink to its track', async () => {
    // Two floors, not one: a grid item's automatic minimum is min-content as
    // well, so `minmax(0, 1fr)` on the track still leaves the span inside it
    // refusing to shrink. Both halves or neither — the pair `.contact-log-row`
    // and `.objectives-row` carry.
    //
    // Walked off the rendered tree rather than a list of class names, because
    // the regression is a child added later with no `min-width`.
    const rules = parseCss(APP_CSS);
    const rendered = await rows();

    let checked = 0;
    for (const { element, children } of rendered) {
      assert.ok(children.length >= 2, 'a row is at least a status word and a sentence');
      for (const child of children) {
        assert.equal(
          resolveBox(rules, { ...child, ancestors: [...ANCESTORS, element] }).minWidth,
          '0',
          `a ${child.tag}.${child.classes.join('.')} can push its track wider than the row`
        );
        checked += 1;
      }
    }
    // Six status words, six sentences, and a counter on three of the six: the
    // arithmetic is here so that a shape dropping out of `shapes()` fails
    // rather than quietly shrinking what this walks.
    assert.equal(checked, 15, 'every child of every shape was asked');
  });

  it('breaks a word a mission authors too long for its cell, so the counter still reads', async () => {
    // The third axis, and #809: #774's on this row. The two floors above are
    // about how wide a *box* is, and a word with no break opportunity in it is
    // laid out on one line whatever its box measures — so flooring the track
    // stopped the counter being carried out of the card and did nothing about
    // its being covered where it sits.
    //
    // The fixture is where this row parts company with the panel's, and it is
    // the whole reason the fault outlived #774. Driven in Chromium at
    // 1440x900 against `MissionResult`'s own markup and the shipped sheet: the
    // cell is 455.8 px here against the panel's 218.7 and the type is
    // 0.64rem, so #774's 64-character token inks 394.3 px and **fits** —
    // 0 ink on the counter, 0 scroll — and that control ported straight across
    // passes vacuously, against a sheet it never changed. At 80 characters the
    // token's glyphs cover 349.3 px² of the counter's own; at 100, 443.8 px²
    // and 90 px of the card's horizontal scroll. Every one is 0 with the
    // declaration in.
    //
    // Walked off the rendered tree and every child *classified* rather than
    // filtered, for the reason the two tests above give: a cell added later
    // that this does not recognise fails here instead of being skipped in
    // silence.
    const rules = parseCss(APP_CSS);
    const rendered = await rows();

    let authored = 0;
    let counters = 0;
    let templated = 0;
    for (const { element, children } of rendered) {
      for (const child of children) {
        const cell = { ...child, ancestors: [...ANCESTORS, element] };
        const verdict = wordBreaking(rules, cell);

        // The mission's own words, rendered verbatim (ui-ux.md §10.5) and
        // therefore unbounded — a mission's words, not a template's.
        if (child.classes.includes('mission-result-text')) {
          assert.equal(
            verdict.kind,
            'permits',
            `a .${child.classes.join('.')} in a ${element.classes.join('.')} row cannot break a token it cannot fit`
          );
          authored += 1;
          continue;
        }

        // The counter is the one cell that must *not* break. `4 of 3` split
        // over three lines is the same illegibility one column along, and it
        // is also what lets the third track be `auto` at all.
        if (child.classes.includes('mission-result-progress')) {
          assert.equal(verdict.kind, 'refuses', 'the counter may wrap');
          counters += 1;
          continue;
        }

        // The status word is templated (`STATUS_WORD`) and sits in a fixed
        // `3.2rem` track, so it must not break either, for the counter's
        // reason. Asserting it is what stops this declaration being written on
        // `.mission-result-objective > *`, where it would reach this cell too
        // — which is the shape #774 had to correct one panel along.
        assert.deepEqual(
          child.classes,
          ['mission-result-status'],
          `unclassified cell .${child.classes.join('.')}`
        );
        assert.equal(
          verdict.kind,
          'refuses',
          'the status word may break, and it is a templated word in a fixed track'
        );
        templated += 1;
      }
    }
    // A sentence and a status word in each of the six shapes, and a counter in
    // three of them: the arithmetic is here so that a shape dropping out of
    // `shapes()` fails rather than quietly shrinking what this walks.
    assert.deepEqual({ authored, counters, templated }, { authored: 6, counters: 3, templated: 6 });
  });
});

/**
 * The card's other authored cell, and #829. The objective row's three axes
 * (rows 33/34/35/38) all stop at the row; the epilogue is a `p` directly under
 * the panel, so none of them reaches it and it carried no rule of its own.
 *
 * Why this is a fifth instance rather than #809 restated, and the reason it
 * needed its own measurement: **the fix that works one element down is inert
 * here.** The objective cell sits in a `minmax(0, …)` track whose minimum is a
 * length, so `break-word` and `anywhere` are indistinguishable there and the
 * narrower value is preferred. The epilogue sits in no track at all — it is a
 * shrink-to-fit flex item of `.mission-result-panel`, which is `column` with
 * `align-items: center`, so its width is floored by its own min-content.
 * `break-word` does not change min-content, so the box simply grows to the
 * token and the token never has to break: driven in Chromium at 1440x900
 * against this card's markup and the shipped sheet, `break-word` reproduces
 * the shipping figures to the decimal on every fixture and at 75%, 100% and
 * 200% alike. `anywhere` clamps the box to the panel's 558 px content box and
 * takes the card's horizontal scroll to 0.
 *
 * Latent in the way #773 and #809 were: the longest unbreakable run in the 32
 * authored epilogues is 13 characters (`transmissions`).
 */
describe('the mission result: an epilogue cannot carry itself out of the card', () => {
  /** Where the epilogue sits — a child of the panel, not of the list. */
  const PANEL = [
    { tag: 'div', classes: ['game-root'] },
    { tag: 'div', classes: ['game-under'] },
    { tag: 'div', classes: ['mission-result'] },
    { tag: 'div', classes: ['mission-result-panel'] },
  ];

  it('breaks a word an epilogue authors too long for the card, and nothing templated', async () => {
    // Every direct child of the panel is *classified* rather than filtered,
    // for the reason the row's own tests give: a child added later that this
    // does not recognise fails here instead of being skipped in silence. It is
    // also what stops the declaration being written on `.mission-result-panel
    // > *`, where it would reach the outcome heading — a templated word
    // (`OUTCOME_HEADING`), which must not break for the reason
    // `.mission-result-progress` must not. The count below is the arithmetic
    // that enforces it: the hint paragraph under the buttons is a fifth child
    // and was missed on the first draft of this walk, which is precisely the
    // silence the classification is here to refuse.
    const rules = parseCss(APP_CSS);
    const { view } = await missionResult(payload());
    try {
      const panel = view.byClass('mission-result-panel');
      let authored = 0;
      let templated = 0;
      let lists = 0;
      for (const child of panel.children) {
        if (typeof child === 'string') continue;
        const classes = String((child.props as { className?: string }).className ?? '')
          .split(/\s+/)
          .filter(Boolean);
        const element: Element = { tag: String(child.type), classes, ancestors: PANEL };

        if (classes.includes('mission-result-line')) {
          assert.equal(element.tag, 'p', 'the epilogue is no longer a `p`, so this guards nothing');
          const verdict = wordBreaking(rules, element);
          assert.equal(verdict.kind, 'permits', 'the epilogue cannot break a token it cannot fit');
          // The value, not merely the breaking: `break-word` is inert on this
          // element and the header above says why.
          assert.match(
            (verdict as { by: string }).by,
            /overflow-wrap:\s*anywhere/,
            'the epilogue breaks by a declaration that does not float its own box'
          );
          authored += 1;
          continue;
        }

        // The objectives list, whose own cells are #809's axis and are walked
        // by the suite above rather than here.
        if (classes.includes('mission-result-objectives')) {
          lists += 1;
          continue;
        }

        // The heading, the action row and the hint beneath it: all three are
        // templated by the client (`OUTCOME_HEADING`, the three button labels,
        // and "Same water, from the first tick."), so none of them may break.
        assert.equal(
          wordBreaking(rules, element).kind,
          'refuses',
          `a templated .${classes.join('.')} may break`
        );
        templated += 1;
      }
      assert.deepEqual(
        { authored, templated, lists },
        { authored: 1, templated: 3, lists: 1 },
        'the panel no longer draws the five children this classifies'
      );
    } finally {
      await view.unmount();
    }
  });
});

describe('the mission result: the three doors out of it', () => {
  it('opens the record, which is what sits between two missions', async () => {
    // docs/ui-ux.md §14, "The record" — the same leaving as Return to port
    // with a different screen at the end of it.
    const { view, calls } = await missionResult(payload());
    try {
      await click(view, 'The record');
      assert.deepEqual([calls.records, calls.exits, calls.again.length], [1, 0, 0]);
    } finally {
      await view.unmount();
    }
  });

  it('returns to port without asking for another run', async () => {
    const { view, calls } = await missionResult(payload());
    try {
      await click(view, 'Return to port');
      assert.deepEqual([calls.records, calls.exits, calls.again.length], [0, 1, 0]);
    } finally {
      await view.unmount();
    }
  });

  it('toggles the ask for another run, and says it is waiting once asked', async () => {
    const asked = await missionResult(payload(), true);
    try {
      assert.ok(asked.view.shows('Waiting…'));
      await click(asked.view, 'Waiting…');
      assert.deepEqual(asked.calls.again, [false]);
    } finally {
      await asked.view.unmount();
    }

    const fresh = await missionResult(payload(), false);
    try {
      await click(fresh.view, 'Again');
      assert.deepEqual(fresh.calls.again, [true]);
    } finally {
      await fresh.view.unmount();
    }
  });

  it('is a labelled dialog, so a screen reader knows the run is over', async () => {
    const { view } = await missionResult(payload());
    try {
      const card = view.byClass('mission-result');
      assert.equal(card.props.role, 'dialog');
      assert.equal(card.props['aria-label'], 'Mission result');
    } finally {
      await view.unmount();
    }
  });
});
