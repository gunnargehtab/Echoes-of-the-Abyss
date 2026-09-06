/**
 * The ready room (#494).
 *
 * The lobby is the one screen where the server's refusals have to be visible
 * *before* the click: a navy someone else holds is refused server-side anyway,
 * and a button that looks available until you press it teaches the player the
 * screen is lying. That, and the sentence the room says while it waits, are
 * what this file holds.
 *
 * Assertions are about the rules, not the markup. What the doctrine blurbs say
 * is a screenshot's business; which button is disabled is not.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createElement } from 'react';
import { AiDifficulty, Faction, type LobbyPlayerView } from '@echoes/shared';
import './support/headless.ts';
import { render, type Rendered } from './support/screen.ts';
import { Lobby } from '../src/game/Lobby.tsx';

function seat(over: Partial<LobbyPlayerView> = {}): LobbyPlayerView {
  return {
    sessionId: 'seat-1',
    name: 'Marr',
    slot: 0,
    faction: Faction.Bathyarch,
    ready: false,
    connected: true,
    isAi: false,
    difficulty: AiDifficulty.Recruit,
    ...over,
  };
}

interface Calls {
  chosen: Faction[];
  ready: boolean[];
  addedAi: AiDifficulty[];
}

async function lobby(
  players: LobbyPlayerView[],
  over: { sessionId?: string | null; canAddAi?: boolean } = {}
): Promise<{ view: Rendered; calls: Calls }> {
  const calls: Calls = { chosen: [], ready: [], addedAi: [] };
  const view = await render(
    createElement(Lobby, {
      mapName: 'Smoke Basin',
      players,
      sessionId: over.sessionId === undefined ? 'seat-1' : over.sessionId,
      roomId: 'ROOM-1',
      canAddAi: over.canAddAi ?? true,
      onChooseFaction: (faction) => calls.chosen.push(faction),
      onReady: (ready) => calls.ready.push(ready),
      onAddAi: (difficulty) => calls.addedAi.push(difficulty),
      onRemoveAi: () => {},
      onAiDifficulty: () => {},
    })
  );
  return { view, calls };
}

/** The four faction buttons, in the order the screen lists them. */
function factionCards(view: Rendered) {
  return view.allByClass('lobby-faction');
}

describe('the ready room: which navy you may take', () => {
  it('refuses a navy someone else holds, before the click rather than after', async () => {
    const { view, calls } = await lobby([
      seat({ sessionId: 'seat-2', name: 'Korrin', faction: Faction.Hadron }),
    ]);
    try {
      const cards = factionCards(view);
      const held = cards.filter((card) => (card.props as { disabled?: boolean }).disabled === true);
      assert.equal(held.length, 1, 'exactly the one navy that is taken');
      assert.ok(view.shows('Korrin'), 'and it says who has it');

      // The other three are live.
      const free = cards.filter((card) => (card.props as { disabled?: boolean }).disabled !== true);
      assert.equal(free.length, 3);
      await view.act(() => {
        (free[0]!.props as { onClick?: () => void }).onClick?.();
      });
      assert.equal(calls.chosen.length, 1, 'a free navy is choosable');
    } finally {
      await view.unmount();
    }
  });

  it('marks your own navy as pressed rather than taken', async () => {
    const { view } = await lobby([seat({ faction: Faction.Pelagia })]);
    try {
      const mine = factionCards(view).filter(
        (card) => (card.props as { 'aria-pressed'?: boolean })['aria-pressed'] === true
      );
      assert.equal(mine.length, 1, 'one navy reads as yours');
      assert.notEqual(
        (mine[0]!.props as { disabled?: boolean }).disabled,
        true,
        'and yours stays clickable — §11 does not let colour be the only signal, and pressed is not disabled'
      );
    } finally {
      await view.unmount();
    }
  });
});

describe('the ready room: what it says while it waits', () => {
  it('never tells you it is waiting on someone when it is waiting on you', async () => {
    // The split the source comment exists for: "you have not readied" and
    // "somebody else has not" are different sentences, and rolling them
    // together produces the memorable absurdity of a solo lobby announcing it
    // is waiting on one commander. `LIFECYCLE.MIN_PLAYERS` is 1, so a solo
    // room is not short-handed — it is waiting on precisely you.
    const { view } = await lobby([seat({ ready: false })]);
    try {
      const said = view.text().join(' ');
      assert.match(said, /Ready when you are/, 'it asks you, because you are who it is waiting on');
      assert.equal(/Waiting on/.test(said), false, 'and never reports you as somebody else');
    } finally {
      await view.unmount();
    }
  });

  it('counts the others only once you have readied yourself', async () => {
    const roster = [
      seat({ ready: true }),
      seat({ sessionId: 'seat-2', name: 'Korrin', faction: Faction.Hadron, ready: false }),
    ];
    const { view } = await lobby(roster);
    try {
      assert.match(view.text().join(' '), /Waiting on 1 commander/, 'singular, for one commander');
    } finally {
      await view.unmount();
    }

    const both = await lobby([roster[0]!, seat({ ...roster[1]!, ready: true })]);
    try {
      assert.match(both.view.text().join(' '), /Starting/, 'and nothing is left to wait for');
    } finally {
      await both.view.unmount();
    }
  });

  it('greys the AI seat when the map has no room for one', async () => {
    const { view } = await lobby([seat()], { canAddAi: false });
    try {
      const disabled = view
        .allByClass('lobby-add-ai')
        .filter((node) => (node.props as { disabled?: boolean }).disabled === true);
      assert.ok(disabled.length > 0, 'a map with no free seat offers no AI');
    } finally {
      await view.unmount();
    }
  });
});

describe('the ready room: the roster', () => {
  it('marks who you are, who is ready, and who dropped', async () => {
    const { view } = await lobby([
      seat({ ready: true }),
      seat({ sessionId: 'seat-2', name: 'Korrin', faction: Faction.Hadron, connected: false }),
      seat({ sessionId: 'ai-3', name: 'Cohort', faction: Faction.Directorate, isAi: true }),
    ]);
    try {
      const rows = view.allByClass('lobby-roster-row');
      assert.equal(rows.length, 3, 'one row per seat');
      const classesOf = (i: number) => String((rows[i]!.props as { className: string }).className);
      assert.match(classesOf(0), /\bready\b/, 'the readied seat says so');
      assert.match(classesOf(1), /\bdropped\b/, 'and the dropped one');
      assert.match(classesOf(2), /\bai\b/, 'and the AI');
      assert.ok(view.shows('(you)'), 'your own seat is named as yours');
    } finally {
      await view.unmount();
    }
  });

  it('is a dialog, and says which one', async () => {
    const { view } = await lobby([seat()]);
    try {
      const root = view.byClass('lobby');
      const props = root.props as { role?: string; 'aria-label'?: string };
      assert.equal(props.role, 'dialog');
      assert.equal(typeof props['aria-label'], 'string', 'a dialog with no name is not one');
    } finally {
      await view.unmount();
    }
  });
});
