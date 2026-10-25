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
  difficulty: Array<[string, AiDifficulty]>;
}

async function lobby(
  players: LobbyPlayerView[],
  over: { sessionId?: string | null; canAddAi?: boolean } = {}
): Promise<{ view: Rendered; calls: Calls }> {
  const calls: Calls = { chosen: [], ready: [], addedAi: [], difficulty: [] };
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
      onAiDifficulty: (sessionId, difficulty) => calls.difficulty.push([sessionId, difficulty]),
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
    // is waiting on one commander. `LIFECYCLE.MIN_PLAYERS` is 1, so a room is
    // not short-handed with you in it — it is waiting on precisely you.
    const { view } = await lobby([
      seat({ ready: false }),
      seat({ sessionId: 'ai-2', name: 'Cohort', faction: Faction.Hadron, isAi: true, ready: true }),
    ]);
    try {
      const said = view.text().join(' ');
      assert.match(said, /Ready when you are/, 'it asks you, because you are who it is waiting on');
      assert.equal(/Waiting on/.test(said), false, 'and never reports you as somebody else');
    } finally {
      await view.unmount();
    }
  });

  it('says an empty match is empty, and offers an opponent first (§14, #1587)', async () => {
    // "While no other seat is filled, Add opponent is the emphasised button and
    // takes the focus, and the line beside it says that readying now goes into
    // the water alone." Said rather than refused: Ready stays live.
    const { view } = await lobby([seat({ ready: false })]);
    try {
      assert.match(view.text().join(' '), /into the water alone/, 'it says what Ready would do');
      const add = view.button('Add opponent');
      assert.equal(add.props.autoFocus, true, 'Add opponent takes the focus');
      assert.match(String(add.props.className), /\blead\b/, 'and is the emphasised one');
      assert.notEqual(view.button('Ready').props.disabled, true, 'and Ready is not refused');
    } finally {
      await view.unmount();
    }
  });

  it('moves neither button when the first opponent sits down', async () => {
    // "Neither button moves: Ready keeps its place beside it, so a second click
    // meant for another opponent never lands on Ready." Re-rendered in place,
    // as the room's broadcast does, so a swap of the buttons would show here.
    const alone = [seat()];
    const { view, calls } = await lobby(alone);
    const footer = () => view.buttonNames().filter((n) => n === 'Ready' || n === 'Add opponent');
    try {
      const before = footer();
      const ai = seat({
        sessionId: 'ai-2',
        name: 'Recruit 2',
        faction: Faction.Hadron,
        isAi: true,
      });
      await view.update(
        createElement(Lobby, {
          mapName: 'Smoke Basin',
          players: [...alone, ai],
          sessionId: 'seat-1',
          roomId: 'ROOM-1',
          canAddAi: true,
          onChooseFaction: () => {},
          onReady: (ready) => calls.ready.push(ready),
          onAddAi: (difficulty) => calls.addedAi.push(difficulty),
          onRemoveAi: () => {},
          onAiDifficulty: () => {},
        })
      );
      assert.deepEqual(footer(), before, 'the footer reads in the same order');
      const add = view.button('Add opponent');
      assert.equal(/\blead\b/.test(String(add.props.className)), false, 'no longer emphasised');
      assert.equal(/into the water alone/.test(view.text().join(' ')), false);
      await view.act(() => {
        (add.props as { onClick: () => void }).onClick();
      });
      assert.deepEqual(calls.addedAi, [AiDifficulty.Recruit], 'a second add adds');
      assert.deepEqual(calls.ready, [], 'and readies nothing');
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

describe('the ready room: the opponent a newcomer meets', () => {
  it('adds a Recruit, the opponent a first match should meet (§14, #1587)', async () => {
    const { view, calls } = await lobby([seat()]);
    try {
      await view.act(() => {
        (view.button('Add opponent').props as { onClick: () => void }).onClick();
      });
      assert.deepEqual(calls.addedAi, [AiDifficulty.Recruit]);
    } finally {
      await view.unmount();
    }
  });

  it('shows both difficulties as controls, the current one pressed', async () => {
    // "Its difficulty is shown as both choices side by side, the current one
    // pressed, so it reads as the control it is." A lone chip that toggled
    // gave no sign it could be pressed.
    const ai = seat({
      sessionId: 'ai-2',
      name: 'Cohort',
      faction: Faction.Hadron,
      isAi: true,
      difficulty: AiDifficulty.Veteran,
    });
    const { view, calls } = await lobby([seat(), ai]);
    try {
      const pressed = (label: string) =>
        (view.button(label).props as { 'aria-pressed'?: boolean })['aria-pressed'];
      assert.equal(pressed('Veteran'), true, 'the current one is pressed');
      assert.equal(pressed('Recruit'), false, 'and the other is offered, not hidden');
      await view.act(() => {
        (view.button('Recruit').props as { onClick: () => void }).onClick();
        (view.button('Veteran').props as { onClick: () => void }).onClick();
      });
      assert.deepEqual(
        calls.difficulty,
        [['ai-2', AiDifficulty.Recruit]],
        'pressing the other changes it; pressing the current one sends nothing'
      );
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
