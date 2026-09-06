/**
 * The port, before a room exists (#494) — docs/ui-ux.md §14.
 *
 * Title, setup, browse and credits: four screens whose whole job is to hand
 * the player to a room without promising anything the room may refuse and
 * without saying anything the water has not. Three rules run through them, and
 * each has a silent failure mode:
 *
 * - **The shell does not promise what the server may deny.** Faction choice
 *   and AI opponents stay in the ready room, because faction uniqueness is
 *   enforced there and a pick is a request the room may refuse. A setup screen
 *   that offered a navy would be writing a cheque the room can bounce.
 * - **A row says the water and the seat count, and nothing else.** Not who is
 *   in there, not which navies they hold, not their names — a listing that
 *   named them would let a fourth player counter-pick a match before joining.
 * - **A held seat is offered, never taken.** Resuming is the player's act; the
 *   title screen surfaces the seat and waits.
 *
 * What each screen looks like is `docs/graphics-standards.md`'s. What each one
 * is allowed to say, and what it does when pressed, is this file's.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { MAP_HEADERS, type MatchListing } from '@echoes/shared';
import { clearStorage, installStorage } from './support/headless.ts';
import { click, render, type Rendered } from './support/screen.ts';
import { TitleScreen } from '../src/menu/TitleScreen.tsx';
import { SetupScreen } from '../src/menu/SetupScreen.tsx';
import { BrowseScreen } from '../src/menu/BrowseScreen.tsx';
import { CreditsScreen } from '../src/menu/CreditsScreen.tsx';
import { FACTION_FULL_NAME, FACTION_NAME } from '../src/game/factions.ts';
import { loadSettings, saveSettings } from '../src/settings/store.ts';
import type { SetupMode } from '../src/net/rooms.ts';

beforeEach(() => {
  installStorage();
});

afterEach(() => {
  clearStorage();
});

/**
 * Park a reconnection token, as a match mid-flight would have.
 *
 * The key is `GameClient`'s and is not exported, because nothing in the client
 * has any business writing it — `hasStoredSession` is the only reader, and a
 * seat is written by joining a room. Spelling it here is the price of testing
 * the screen that reads it.
 */
function holdASeat(): void {
  window.sessionStorage.setItem('echoes.reconnection', 'a-seat-in-a-room');
}

/**
 * Every string *and number* a node renders, joined.
 *
 * `Rendered.text()` collects strings, which is right for prose and wrong for
 * every line here that interpolates a count — `{map.seats} commanders` puts a
 * number in the tree, and a walker that dropped it would let an assertion pass
 * on a card showing no seat count at all.
 */
function reads(instance: { props: { children?: unknown } }): string {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string' || typeof node === 'number') out.push(String(node));
    else if (Array.isArray(node)) node.forEach(walk);
  };
  walk(instance.props.children);
  return out.join('');
}

interface Entries {
  pressed: string[];
}

async function title(): Promise<{ view: Rendered; entries: Entries }> {
  const entries: Entries = { pressed: [] };
  const press = (name: string) => () => entries.pressed.push(name);
  const view = await render(
    createElement(TitleScreen, {
      onResume: press('resume'),
      onSolo: press('solo'),
      onMultiplayer: press('multiplayer'),
      onCampaign: press('campaign'),
      onTutorial: press('tutorial'),
      onSettings: press('settings'),
      onCredits: press('credits'),
    })
  );
  return { view, entries };
}

/** The entries a player sees, in the order §14 lists them. */
function labels(view: Rendered): string[] {
  return view.allByClass('menu-entry-label').map((node) => String(node.props.children));
}

describe('the title screen: the shape of the finished game', () => {
  it('offers §14’s entries and no Quit, because this is a browser', async () => {
    const { view } = await title();
    try {
      assert.deepEqual(labels(view), [
        'Campaign',
        'Solo game',
        'Multiplayer',
        'Tutorial',
        'Settings',
        'Credits',
      ]);
    } finally {
      await view.unmount();
    }
  });

  it('dims nothing, because every door on it now opens', async () => {
    // §14: "Campaign is no longer one of them either, and this screen now has
    // none." The disabled rule has not gone away — it moved one screen in, to
    // the board, where the reasons are specific instead of one line covering
    // twenty-eight.
    const { view } = await title();
    try {
      const dead = view.root.findAll(
        (node) => node.type === 'button' && node.props.disabled === true
      );
      assert.deepEqual(dead, []);
    } finally {
      await view.unmount();
    }
  });

  it('sends each entry to its own door', async () => {
    const { view, entries } = await title();
    try {
      for (const [label, door] of [
        ['Campaign', 'campaign'],
        ['Solo game', 'solo'],
        ['Multiplayer', 'multiplayer'],
        ['Tutorial', 'tutorial'],
        ['Settings', 'settings'],
        ['Credits', 'credits'],
      ] as const) {
        await click(view, label);
        assert.equal(entries.pressed.at(-1), door, `${label} opens ${door}`);
      }
      assert.equal(entries.pressed.length, 6, 'and nothing opened twice');
    } finally {
      await view.unmount();
    }
  });
});

describe('the title screen: a held seat', () => {
  it('says nothing about a seat that is not held', async () => {
    const { view } = await title();
    try {
      assert.equal(view.allByClass('menu-resume').length, 0, 'no stale banner');
    } finally {
      await view.unmount();
    }
  });

  it('offers a held seat first and autofocused, and does not take it', async () => {
    // §14, "Resume": "one keypress back into the match … Resuming is offered,
    // never automatic: the player may be reloading precisely because they are
    // done."
    holdASeat();
    const { view, entries } = await title();
    try {
      assert.equal(labels(view)[0], 'Resume match', 'first, where the reload lands');
      assert.equal(view.byClass('menu-resume').props.autoFocus, true);
      assert.deepEqual(entries.pressed, [], 'and rendering resumed nothing');

      await click(view, 'Resume match');
      assert.deepEqual(entries.pressed, ['resume']);
    } finally {
      await view.unmount();
    }
  });
});

interface Engaged {
  calls: Array<[string, string, boolean]>;
  backs: number;
}

async function setup(mode: SetupMode): Promise<{ view: Rendered; engaged: Engaged }> {
  const engaged: Engaged = { calls: [], backs: 0 };
  const view = await render(
    createElement(SetupScreen, {
      mode,
      onEngage: (name: string, mapId: string, listed: boolean) =>
        engaged.calls.push([name, mapId, listed]),
      onBack: () => engaged.backs++,
    })
  );
  return { view, engaged };
}

/** Type into the commander field, as a player naming themselves would. */
async function typeName(view: Rendered, name: string): Promise<void> {
  const field = view.root.find((node) => node.type === 'input' && node.props.type === 'text');
  await view.act(() => {
    (field.props as { onChange: (event: unknown) => void }).onChange({ target: { value: name } });
  });
}

describe('match setup: what it may offer, and what it may not', () => {
  it('draws one card per map in the shared catalogue and nothing else to pick', async () => {
    const { view } = await setup('solo');
    try {
      const maps = view.allByClass('menu-map');
      assert.equal(maps.length, MAP_HEADERS.length);
      assert.deepEqual(
        view.allByClass('menu-map-name').map((node) => String(node.props.children)),
        MAP_HEADERS.map((header) => header.name),
        'the catalogue’s order, and the catalogue’s names'
      );
      const metas = view.allByClass('menu-map-meta').map(reads);
      for (const [index, header] of MAP_HEADERS.entries()) {
        assert.match(
          metas[index]!,
          new RegExp(`^${header.seats} commanders · `),
          'and the seats it holds, which is half of what picking a water decides'
        );
      }
    } finally {
      await view.unmount();
    }
  });

  it('names no navy, because a faction is a request the room may refuse', async () => {
    // §14: "Faction choice and AI opponents stay in the in-room ready room,
    // because faction uniqueness is enforced by the room and a pick is a
    // request the room may refuse — the shell does not promise what the server
    // may deny."
    const { view } = await setup('host');
    try {
      const said = view.text().join(' ');
      const navies = [...Object.values(FACTION_NAME), ...Object.values(FACTION_FULL_NAME)];
      for (const navy of navies) {
        assert.equal(said.includes(navy), false, `${navy} is the ready room’s to offer`);
      }
    } finally {
      await view.unmount();
    }
  });

  it('asks about listing only where there is a question to ask', async () => {
    // §14, "Rooms, and who may see them": a solo game is always private and a
    // quick match is looking rather than opening, so "neither offers a toggle,
    // because neither has a question to ask".
    for (const mode of ['solo', 'quick'] as const) {
      const { view } = await setup(mode);
      try {
        const toggles = view.root.findAll(
          (node) => node.type === 'input' && node.props.type === 'checkbox'
        );
        assert.deepEqual(toggles, [], `${mode} has nothing to decide`);
      } finally {
        await view.unmount();
      }
    }

    const { view, engaged } = await setup('host');
    try {
      const toggle = view.root.find(
        (node) => node.type === 'input' && node.props.type === 'checkbox'
      );
      assert.equal(toggle.props.checked, true, 'a host wants to be found, until they say not');
      await view.act(() => {
        (toggle.props as { onChange: (event: unknown) => void }).onChange({
          target: { checked: false },
        });
      });
      await click(view, 'Open the room');
      assert.equal(engaged.calls.at(-1)?.[2], false, 'and unlisted reaches the door');
    } finally {
      await view.unmount();
    }
  });
});

describe('match setup: what it commits with', () => {
  it('hands over the name and the water that are on screen', async () => {
    const { view, engaged } = await setup('solo');
    try {
      const water = MAP_HEADERS.at(-1)!;
      await click(view, water.name);
      await typeName(view, 'Halloran');
      await click(view, 'Descend');
      assert.deepEqual(engaged.calls.at(-1)?.slice(0, 2), ['Halloran', water.id]);
    } finally {
      await view.unmount();
    }
  });

  it('remembers the commander name as a device preference', async () => {
    // §14, "Settings": "The commander name and every setting persist in
    // `localStorage` as a device preference; the reconnection token stays
    // per-tab, because a seat is not a preference."
    const first = await setup('quick');
    await typeName(first.view, 'Ysolde Marr');
    await click(first.view, 'Join the water');
    await first.view.unmount();
    assert.equal(loadSettings().profileName, 'Ysolde Marr');

    const second = await setup('quick');
    try {
      const field = second.view.root.find(
        (node) => node.type === 'input' && node.props.type === 'text'
      );
      assert.equal(field.props.value, 'Ysolde Marr', 'and the field opens on it next time');
    } finally {
      await second.view.unmount();
    }
  });

  it('opens on the name already stored rather than an empty field', async () => {
    saveSettings({ profileName: 'Odile Varr-Kest' });
    const { view } = await setup('host');
    try {
      const field = view.root.find((node) => node.type === 'input' && node.props.type === 'text');
      assert.equal(field.props.value, 'Odile Varr-Kest');
    } finally {
      await view.unmount();
    }
  });
});

interface Doors {
  joined: string[];
  hosts: number;
  quick: number;
  backs: number;
}

function listing(over: Partial<MatchListing> = {}): MatchListing {
  return {
    roomId: 'aBc123',
    mapId: 'ventfront-divide',
    mapName: 'Ventfront Divide',
    seats: 4,
    filled: 2,
    ...over,
  };
}

async function browse(
  rooms: MatchListing[] | 'pending' = []
): Promise<{ view: Rendered; doors: Doors; settle(): Promise<void> }> {
  const doors: Doors = { joined: [], hosts: 0, quick: 0, backs: 0 };
  // A promise that never settles is how "we have not looked yet" is held still
  // long enough to assert on — the state the screen draws `Listening…` for.
  let release: (found: MatchListing[]) => void = () => {};
  const pending = new Promise<MatchListing[]>((resolve) => {
    release = resolve;
  });
  const listRooms = () => (rooms === 'pending' ? pending : Promise.resolve(rooms));
  const view = await render(
    createElement(BrowseScreen, {
      listRooms,
      onJoin: (roomId: string) => doors.joined.push(roomId),
      onHost: () => doors.hosts++,
      onQuickMatch: () => doors.quick++,
      onBack: () => doors.backs++,
    })
  );
  return {
    view,
    doors,
    settle: async () => {
      await view.act(async () => {
        release([]);
        await pending;
      });
    },
  };
}

describe('the match browser: what a row is allowed to say', () => {
  it('says the water and the seat count, and never who is in there', async () => {
    // §14: "not who is in there, not which navies they hold, not their names …
    // a public listing that named them would let a fourth player counter-pick
    // a match before joining." The room id is the one other thing the client
    // holds, and a row that printed it would be handing out a private room's
    // code.
    const room = listing({ mapName: 'Abyssal Rift Corridor', seats: 4, filled: 1 });
    const { view } = await browse([room]);
    try {
      assert.equal(String(view.byClass('menu-browse-map').props.children), room.mapName);
      assert.equal(reads(view.byClass('menu-browse-seats')), '1 / 4 commanders');
      assert.equal(
        view.text().join(' ').includes(room.roomId),
        false,
        'the code is the host’s to hand to somebody, not the listing’s to publish'
      );
    } finally {
      await view.unmount();
    }
  });

  it('offers a full room as full rather than as a click that will be refused', async () => {
    const { view, doors } = await browse([listing({ seats: 4, filled: 4 })]);
    try {
      const row = view.byClass('menu-browse-row');
      assert.equal((row.props as { disabled?: boolean }).disabled, true);
      assert.ok(view.shows('Full'), 'and it says so, rather than looking joinable');
      assert.deepEqual(doors.joined, []);
    } finally {
      await view.unmount();
    }
  });

  it('joins the room a row stands for', async () => {
    const { view, doors } = await browse([listing({ roomId: 'the-room' })]);
    try {
      const row = view.byClass('menu-browse-row');
      await view.act(() => {
        (row.props as { onClick?: () => void }).onClick?.();
      });
      assert.deepEqual(doors.joined, ['the-room']);
    } finally {
      await view.unmount();
    }
  });
});

describe('the match browser: looking, and having looked', () => {
  it('says it is still listening rather than saying nobody is playing', async () => {
    // The source's rule: "'nobody is playing' and 'we have not looked yet' are
    // different sentences, and showing the first one before it is true is the
    // kind of small lie that empties a lobby."
    const { view, settle } = await browse('pending');
    try {
      assert.ok(view.shows('Listening…'));
      assert.equal(view.allByClass('menu-browse').length, 0);

      await settle();
      assert.equal(view.shows('Listening…'), false, 'and it stops once it knows');
      assert.ok(view.shows('No open rooms.'));
    } finally {
      await view.unmount();
    }
  });

  it('leaves the code field and the two doors working when nothing is open', async () => {
    // A server that is down lists nothing rather than erroring, and neither
    // the code field nor the host button stops working because of it.
    const { view, doors } = await browse([]);
    try {
      await click(view, 'Host a match');
      await click(view, 'Quick match');
      await click(view, 'Back');
      assert.deepEqual([doors.hosts, doors.quick, doors.backs], [1, 1, 1]);
    } finally {
      await view.unmount();
    }
  });
});

describe('the match browser: the room code', () => {
  /** Type a code, as somebody pasting one from a host would. */
  async function typeCode(view: Rendered, code: string): Promise<void> {
    const field = view.root.find((node) => node.type === 'input' && node.props.type === 'text');
    await view.act(() => {
      (field.props as { onChange: (event: unknown) => void }).onChange({
        target: { value: code },
      });
    });
  }

  it('refuses to submit nothing, and trims what it is given', async () => {
    const { view, doors } = await browse([]);
    try {
      const submit = view.root.find(
        (node) => node.type === 'button' && node.props.type === 'submit'
      );
      assert.equal(submit.props.disabled, true, 'an empty code is not a room');

      await typeCode(view, '   ');
      assert.equal(submit.props.disabled, true, 'and neither is a space');

      await typeCode(view, '  the-code  ');
      const form = view.byClass('menu-code');
      let defaults = 0;
      await view.act(() => {
        (form.props as { onSubmit: (event: unknown) => void }).onSubmit({
          preventDefault: () => defaults++,
        });
      });
      assert.equal(defaults, 1, 'the page does not navigate; this shell has no router');
      assert.deepEqual(doors.joined, ['the-code']);
    } finally {
      await view.unmount();
    }
  });
});

describe('the credits: static, and honest', () => {
  it('names the technology and the synthesis, and has one door out', async () => {
    // §14: "static, and honest: the technology roll from tech-stack.md and a
    // note that every sound is synthesised. No invented names." Whether a name
    // on the roll is invented is a claim about the world that no test can
    // settle; that the roll is technologies and that the synthesis note is on
    // the screen is checkable, and both are what the section asks for.
    let backs = 0;
    const view = await render(createElement(CreditsScreen, { onBack: () => backs++ }));
    try {
      assert.equal(view.byClass('menu-screen').props['aria-label'], 'Credits');
      assert.ok(view.shows('PixiJS'));
      assert.ok(view.shows('Colyseus'));
      assert.ok(view.shows('synthesised live — no recordings'));
      assert.equal(view.root.findAll((node) => node.type === 'button').length, 1);
      await click(view, 'Back');
      assert.equal(backs, 1);
    } finally {
      await view.unmount();
    }
  });
});
