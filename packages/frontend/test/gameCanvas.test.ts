/**
 * The shell (#487).
 *
 * `GameCanvas` is the composition root: it constructs the four subsystems —
 * the conn view, the chart, the socket and the mix — wires each one's output
 * to the others' inputs, and owns the twenty pieces of React state the screen
 * is made of. Nothing about that is drawing or simulation, and none of it had
 * a test, because React needs a DOM to render into and CI has none.
 *
 * It needs less of one than it looks. `react-test-renderer` renders to a plain
 * object tree and runs effects for real, and `createNodeMock` is where the two
 * host `<div>`s come from — so the components under test receive the same stub
 * elements the renderer tests already use. No jsdom, and about a second.
 *
 * The one production seam this needs is `harness`: the shell constructs the
 * Pixi application, the GL renderer and the socket itself, so without a way to
 * hand it stand-ins the boot stops at `mount()` and the 277 lines that wire
 * everything together never run. Every one of those three is a seam the class
 * beneath already had.
 *
 * What this file is about is *connections*, because that is what a composition
 * root can get wrong: a server message that reaches the chart but not the conn
 * view, a renderer callback wired to the wrong order, a snapshot that never
 * reaches the mix, a teardown that leaves the device open.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Faction, MatchPhase, encodeEcho, SERVER_MSG } from '@echoes/shared';
import {
  createHost,
  dispatchWindow,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
  type StubElement,
} from './support/headless.ts';
import { installHeadlessAudio, uninstallHeadlessAudio } from './support/headlessAudio.ts';
import { installSessionStorage, StubClient, StubRoom } from './support/colyseusStub.ts';
import { cannedMap, cannedNodes, cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';
import { GameCanvas, type GameCanvasProps } from '../src/game/GameCanvas.tsx';

/** Every string the rendered tree contains, in document order. */
function textOf(tree: ReactTestRenderer): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const element = node as { children?: unknown } | null;
    if (element !== null && element.children != null) walk(element.children);
  };
  walk(tree.toJSON());
  return out;
}

/** True when any rendered string contains `needle`. */
function shows(tree: ReactTestRenderer, needle: string): boolean {
  return textOf(tree).some((line) => line.includes(needle));
}

interface Mounted {
  tree: ReactTestRenderer;
  room: StubRoom;
  net: StubClient;
  app: HeadlessApplication;
  gl: HeadlessWebGLRenderer;
  /** The two host divs, by the class name the shell gives each. */
  hosts: Map<string, StubElement>;
  /** Let effects, the socket and a frame or two settle. */
  settle(): Promise<void>;
  unmount(): Promise<void>;
}

/**
 * Mount the shell with every device stubbed.
 *
 * `webgl: false` withholds the GL renderer, which is the degradation path —
 * the one branch a screenshot review can never reach, because a machine that
 * can take a screenshot has a GPU.
 */
async function mount(
  options: { webgl?: boolean; hang?: boolean; props?: Partial<GameCanvasProps> } = {}
): Promise<Mounted> {
  const room = new StubRoom();
  const net = new StubClient(room);
  if (options.hang === true) net.hang('joinOrCreate');
  const app = new HeadlessApplication();
  const gl = new HeadlessWebGLRenderer();
  const hosts = new Map<string, StubElement>();

  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(
      createElement(GameCanvas, {
        playerName: 'Marr',
        mapId: 'smoke-basin',
        resume: false,
        onExit: () => {},
        onRecord: () => {},
        harness: {
          application: () => app.asApplication(),
          glRenderer: () => {
            if (options.webgl === false) throw new Error('headless: WebGL unavailable');
            return gl.asRenderer();
          },
          netClient: () => net as unknown as never,
        },
        ...options.props,
      }),
      {
        createNodeMock: (element) => {
          const className = String(
            (element.props as { className?: string }).className ?? 'anonymous'
          );
          const host = hosts.get(className) ?? createHost(1280, 720);
          hosts.set(className, host);
          return host;
        },
      }
    );
  });

  const settle = async (): Promise<void> => {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 10));
      pumpAnimationFrames();
      app.frame();
    });
  };
  await settle();

  return {
    tree,
    room,
    net,
    app,
    gl,
    hosts,
    settle,
    unmount: async () => {
      await act(async () => {
        tree.unmount();
      });
      // `audio.destroy()` is fired and not awaited by the effect's cleanup —
      // React cleanups are synchronous — so the device closes a microtask
      // later. Flushing here is what lets a test assert it actually did.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
    },
  };
}

/**
 * The first user gesture.
 *
 * Autoplay policy blocks an AudioContext created without one, so the shell
 * arms `unlock` on the first pointer or key event and the mix is deliberately
 * silent until then (docs/audio-direction.md §12). Every test that wants to
 * hear anything has to touch the page first, exactly as a player does.
 */
async function firstGesture(world: Mounted): Promise<void> {
  dispatchWindow('pointerdown', {});
  await world.settle();
}

/** Hand the shell a whole match, the way the room does on join. */
async function joinMatch(world: Mounted): Promise<void> {
  const terrain = cannedTerrain();
  world.room.emit(SERVER_MSG.terrain, { ...terrain, revision: 0 });
  world.room.emit(SERVER_MSG.map, cannedMap());
  world.room.emit(SERVER_MSG.nodes, cannedNodes());
  world.room.emit(SERVER_MSG.assigned, { slot: 0, faction: Faction.Bathyarch });
  await world.settle();
}

/** The audio device this mount will open, so teardown can be checked. */
let audioContext = installHeadlessAudio();

beforeEach(() => {
  audioContext = installHeadlessAudio();
  installSessionStorage();
});

afterEach(() => {
  uninstallHeadlessAudio();
  const g = globalThis as unknown as { window: Record<string, unknown> };
  delete g.window.sessionStorage;
  delete g.window.__audioProbe;
  delete g.window.__perspectiveProbe;
  delete g.window.__hazardProbe;
});

describe('the shell: booting', () => {
  it('builds the two canvases in the order the compositing needs', async () => {
    const world = await mount();
    try {
      // The world under the glass: the conn view's host must exist before the
      // Pixi host, because the chart draws every world mark through the
      // conn's camera and composites over it.
      const json = JSON.stringify(world.tree.toJSON());
      const conn = json.indexOf('perspective-host');
      const chart = json.indexOf('game-host');
      assert.ok(conn > 0 && chart > 0, 'both hosts rendered');
      assert.ok(conn < chart, 'the world is under the glass');
      // Three, not two: `.game-under` is ref'd as well, so one `inert` can
      // silence everything the esc menu floats over (ui-ux.md §9.5).
      assert.equal(world.hosts.size, 3, 'each ref got its own element');
      assert.notEqual(
        world.hosts.get('perspective-host'),
        world.hosts.get('game-host'),
        'and the two canvases do not share one'
      );
    } finally {
      await world.unmount();
    }
  });

  it('boots all four subsystems and connects', async () => {
    const world = await mount();
    try {
      assert.ok(world.net.callOf('joinOrCreate') !== undefined, 'the socket joined a room');
      assert.ok(world.app.renderer !== null, 'the chart initialised');
      assert.ok(world.gl.ledger.frames > 0, 'the conn view is rendering frames');

      const g = globalThis as unknown as { window: Record<string, () => unknown> };
      assert.equal(typeof g.window.__audioProbe, 'function', 'the mix exposed its probe');
      assert.equal(
        typeof g.window.__perspectiveProbe,
        'function',
        'and the conn view exposed its own'
      );
      assert.equal(shows(world.tree, 'Listening…'), false, 'the overlay stepped aside');
    } finally {
      await world.unmount();
    }
  });

  it('joins with the name, map and door the shell was given', async () => {
    const world = await mount({ props: { playerName: 'Anholt', mapId: 'sorrowgate' } });
    try {
      assert.deepEqual(world.net.callOf('joinOrCreate')?.options, {
        name: 'Anholt',
        mapId: 'sorrowgate',
        missionId: '',
      });
    } finally {
      await world.unmount();
    }
  });

  it('takes no seat on a device that cannot render the world', async () => {
    // The branch a screenshot review can never reach: a machine that can take
    // the screenshot has a GPU. Refusing the seat is the point — a commander
    // who cannot see the water should not be occupying one.
    const world = await mount({ webgl: false });
    try {
      assert.ok(shows(world.tree, 'No light in the water'), 'it says so plainly');
      assert.equal(world.net.calls.length, 0, 'and never joined a room');
      assert.equal(world.gl.ledger.frames, 0, 'nothing was rendered');
    } finally {
      await world.unmount();
    }
  });
});

describe('the shell: what it wires to what', () => {
  it('gives a server message to both painters, not just the chart', async () => {
    const world = await mount();
    try {
      await joinMatch(world);

      // The conn view's own probe is the evidence it was told: it reports the
      // terrain it built and the seat it was assigned. A shell that handed
      // terrain to the chart alone would leave the world a void under a
      // working HUD, and the HUD would look fine.
      const g = globalThis as unknown as {
        window: { __perspectiveProbe: () => Record<string, number> };
      };
      assert.ok(world.gl.ledger.triangles > 0, 'the conn view built the ground it was sent');
      assert.equal(g.window.__perspectiveProbe().units, 0, 'and has no force yet');

      const snapshot = cannedSnapshot(100);
      world.room.emit(SERVER_MSG.echo, encodeEcho(null, snapshot, 0));
      await world.settle();

      assert.equal(g.window.__perspectiveProbe().units, 4, 'the snapshot reached the conn view');
      assert.equal(g.window.__perspectiveProbe().ordnance, 2, 'ordnance and all');
    } finally {
      await world.unmount();
    }
  });

  it('drives the mix from the Echo tick, never from a frame', async () => {
    const world = await mount();
    try {
      await joinMatch(world);
      const g = globalThis as unknown as {
        window: { __audioProbe: () => { state: string; contactVoices: number } };
      };

      // Silent until touched: a context built without a gesture is refused by
      // the browser, so the shell arms the unlock and waits (§12).
      assert.equal(g.window.__audioProbe().state, 'idle', 'no gesture, no device');
      await firstGesture(world);
      assert.equal(g.window.__audioProbe().state, 'running', 'the first touch opens it');

      // Frames alone must not move the mix: anything smoother than the tick
      // would imply knowledge the server did not send.
      await world.settle();
      await world.settle();
      assert.equal(g.window.__audioProbe().contactVoices, 0, 'frames alone voiced nothing');

      world.room.emit(SERVER_MSG.echo, encodeEcho(null, cannedSnapshot(100), 0));
      await world.settle();
      assert.ok(
        g.window.__audioProbe().contactVoices > 0,
        'the Echo tick is what the mix moves on'
      );
    } finally {
      await world.unmount();
    }
  });

  it('turns a mission line into a log row and a hail at once', async () => {
    const world = await mount();
    try {
      await joinMatch(world);
      await firstGesture(world);
      world.room.emit(SERVER_MSG.echo, encodeEcho(null, cannedSnapshot(100), 0));
      world.room.emit(SERVER_MSG.missionLine, {
        tick: 120,
        speaker: 'Marr',
        text: 'Hold your depth.',
        voice: 'concern',
        speakerId: 'marr',
      });
      // A line is buffered onto the Echo cadence, so the tick after it is what
      // hails it — the log row and the hail are one event (§13), and this is
      // the beat they share.
      world.room.emit(SERVER_MSG.echo, encodeEcho(null, cannedSnapshot(200), 10));
      await world.settle();

      const g = globalThis as unknown as { window: { __audioProbe: () => { speechCues: number } } };
      // §13: the log row and the hail are one event, so a shell that fired
      // only one of them would be splitting it.
      assert.equal(g.window.__audioProbe().speechCues, 1, 'the line was hailed');
    } finally {
      await world.unmount();
    }
  });

  it('shows the map it was told about, and the ready room with it', async () => {
    const world = await mount();
    try {
      await joinMatch(world);
      world.room.changeState({
        phase: MatchPhase.Lobby,
        mapId: 'smoke-basin',
        winnerSlot: -1,
        players: new Map([
          [
            'seat-1',
            {
              sessionId: 'seat-1',
              name: 'Marr',
              slot: 0,
              faction: Faction.Bathyarch,
              ready: false,
              connected: true,
              isAi: false,
              difficulty: 0,
            },
          ],
        ]),
      });
      await world.settle();

      assert.ok(shows(world.tree, 'Smoke Basin'), 'the map name came off the map message');
      assert.ok(shows(world.tree, 'Marr'), 'and the roster off the schema');
    } finally {
      await world.unmount();
    }
  });

  it('keeps listening while the room never answers, and still tears down', async () => {
    // A server that is simply not there — distinct from one that refuses,
    // which is the next test. The client waits, and the overlay says so.
    const world = await mount({ hang: true });
    try {
      assert.ok(shows(world.tree, 'Listening…'), 'the overlay stands while the seat is unanswered');
      assert.ok(world.app.renderer !== null, 'the chart booted anyway');
      assert.ok(world.gl.ledger.frames > 0, 'and so did the world under it');
    } finally {
      await world.unmount();
    }
    assert.equal(world.app.destroyed, true, 'leaving mid-connect still releases the devices');
  });

  it('reports a lost signal without tearing the match down', async () => {
    const world = await mount();
    try {
      await joinMatch(world);
      world.room.raiseError(4212, 'room is locked');
      await world.settle();
      assert.ok(shows(world.tree, 'No signal'), 'the player is told');
      assert.ok(world.app.renderer !== null, 'and the chart is still standing');
    } finally {
      await world.unmount();
    }
  });
});

describe('the shell: leaving', () => {
  it('releases every device it opened', async () => {
    const world = await mount();
    await joinMatch(world);
    // A gesture first, so there is a real device to release: asserting that a
    // context nobody opened is closed would prove nothing.
    await firstGesture(world);
    const g = globalThis as unknown as { window: Record<string, unknown> };
    assert.equal(typeof g.window.__perspectiveProbe, 'function');
    assert.equal(audioContext.state, 'running', 'the device is open');

    await world.unmount();

    // The AudioContext is a device handle and browsers cap how many a page may
    // hold open, so a shell that leaked one would break the *next* match
    // rather than this one — the worst kind of leak to find by hand.
    assert.equal(world.app.destroyed, true, 'the chart was destroyed');
    assert.equal(world.gl.disposed, true, 'the GL renderer was disposed');
    assert.equal(world.room.left, true, 'the seat was given up');
    assert.equal(audioContext.state, 'closed', 'and the audio device was released');
    assert.equal(g.window.__perspectiveProbe, undefined, 'the conn probe was removed');
    assert.equal(world.hosts.get('game-host')?.listenerCount(), 0, 'no listener outlived it');
  });
});
