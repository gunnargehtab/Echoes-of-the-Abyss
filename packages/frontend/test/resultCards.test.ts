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
