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
import {
  Faction,
  MatchPhase,
  ObjectiveStatus,
  encodeEcho,
  SERVER_MSG,
  type MissionView,
} from '@echoes/shared';
import {
  clearStorage,
  createHost,
  dispatchWindow,
  installStorage,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
  type StubElement,
} from './support/headless.ts';
import { installHeadlessAudio, uninstallHeadlessAudio } from './support/headlessAudio.ts';
import { StubClient, StubRoom } from './support/colyseusStub.ts';
import { cannedMap, cannedNodes, cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';
import { GameCanvas, panelType, type GameCanvasProps } from '../src/game/GameCanvas.tsx';

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

/**
 * The least a mission view can be and still put the objectives panel on screen.
 *
 * The budget is deliberately not the silence order's ceiling, because in three
 * of the five ledger missions it is not: a shell that passed the view's budget
 * through where the order's ceiling belongs would read as correct against a
 * fixture where the two agreed.
 */
function cannedMissionView(): MissionView {
  return {
    missionId: 'prologue-sorrowgate',
    tick: 100,
    objectives: [
      { id: 'stay-quiet', text: 'The flight stays under twenty.', status: ObjectiveStatus.Pending },
    ],
    markers: [],
    locks: [],
    held: [],
    sigBudget: 8,
    debtS: 0,
  };
}

/** Every string the panel's SIG chip renders, descending through it. */
function ceilingChip(world: Mounted): string {
  const found = world.tree.root.findAll(
    (node) => typeof node.type === 'string' && node.props.className === 'objectives-ceiling'
  );
  assert.equal(found.length, 1, 'exactly one ceiling chip is on screen');
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string' || typeof node === 'number') out.push(String(node));
    else if (node !== null && typeof node === 'object' && 'children' in node) {
      (node as { children: unknown[] }).children.forEach(walk);
    }
  };
  found[0]!.children.forEach(walk);
  return out.join('');
}

/** The audio device this mount will open, so teardown can be checked. */
let audioContext = installHeadlessAudio();

beforeEach(() => {
  audioContext = installHeadlessAudio();
  installStorage();
});

afterEach(() => {
  uninstallHeadlessAudio();
  const g = globalThis as unknown as { window: Record<string, unknown> };
  clearStorage();
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

  it('puts the strip’s explanations in the DOM, over the canvas that drew them', async () => {
    const world = await mount();
    try {
      await joinMatch(world);
      // The strip is in-match chrome, so the room has to be out of the lobby
      // before it exists at all — the ready room is what §2's console replaces.
      world.room.changeState({ phase: MatchPhase.Playing });
      world.room.emit(SERVER_MSG.echo, encodeEcho(null, cannedSnapshot(100), 0));
      await world.settle();

      // §2's strip is Pixi text and its explanations are DOM controls laid over
      // it, so the two halves are wired here and nowhere else: the renderer
      // reports the boxes and this shell renders them. Neither half's own test
      // can see the join — `readouts.test.ts` supplies its own boxes and its
      // own host, and `rendererSmoke.test.ts` never mounts the shell — which is
      // exactly what CLAUDE.md says this file is for.
      const controls = world.tree.root.findAll(
        (node) =>
          typeof node.type === 'string' &&
          String((node.props as { className?: string }).className ?? '') === 'readout'
      );
      assert.ok(controls.length > 0, 'the strip is explained at all');
      const names = controls.map((control) =>
        String((control.props as { 'aria-label'?: string })['aria-label'] ?? '')
      );
      assert.ok(
        names.some((name) => name.startsWith('NODULES')),
        `a control carries the strip's own text (got ${names.join(' | ')})`
      );

      // And the canvas it forwards a wheel to is the *Pixi* one. `GameCanvas`
      // holds two hosts of the same type — the conn view's is a sibling — and a
      // wheel sent to the three.js canvas would be silently lost, since the
      // zoom listener is on the glass.
      const chartCanvas = world.hosts.get('game-host')!.querySelector('canvas');
      assert.ok(chartCanvas !== null, 'the Pixi canvas is inside the host that was handed over');
      let delivered = 0;
      chartCanvas.addEventListener('wheel', () => {
        delivered++;
      });
      const layer = world.tree.root.find(
        (node) =>
          typeof node.type === 'string' &&
          String((node.props as { className?: string }).className ?? '') === 'readouts'
      );
      await act(async () => {
        (layer.props as { onWheel: (e: unknown) => void }).onWheel({
          deltaY: -120,
          clientX: 40,
          clientY: 20,
        });
      });
      assert.equal(delivered, 1, 'a wheel over a readout still reaches the view that zooms');
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

  it('carries the silence order’s reading from the Echo tick to the panel', async () => {
    // #623 criterion 8. The reading rides the Echo snapshot and the rest of the
    // panel rides the mission view, so the two reach this shell on different
    // channels and it is the shell that puts them back together. That is
    // precisely the join a composition root gets wrong, and neither the panel's
    // own tests (which are handed the prop) nor the server's (which never build
    // a panel) can see it dropped.
    const world = await mount();
    try {
      await joinMatch(world);
      world.room.changeState({ phase: MatchPhase.Playing });
      world.room.emit(SERVER_MSG.mission, cannedMissionView());
      world.room.emit(
        SERVER_MSG.echo,
        encodeEcho(
          null,
          { ...cannedSnapshot(100), boundSig: { peak: 6, ceiling: 20, setName: 'flight' } },
          0
        )
      );
      await world.settle();

      // The word rides the same object as the numbers (#623 criterion 9), so
      // the join this test is about carries all three or none — which is the
      // argument for it living on `BoundSig` rather than on the mission view,
      // where it would have been a fourth thing for the shell to lose.
      assert.equal(
        ceilingChip(world),
        'flight SIG 006 / 020',
        'the reading off the snapshot reached the panel beside the ceiling it is held to'
      );
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

describe('the shell: the glass over the water', () => {
  it('makes everything under the esc menu inert while it is up', async () => {
    // §9.5: the menu is glass rather than blackout, so the match behind it is
    // still on screen and still full of live controls. One `inert` on the
    // `.game-under` wrapper is what stops Tab walking down into them — the
    // wrapper exists for nothing else, and this is the only place the write
    // is observable in software. *That the flag does what it says* is the
    // browser's, and is driven in one (#515).
    const world = await mount();
    try {
      await joinMatch(world);
      const under = world.hosts.get('game-under');
      assert.notEqual(under, undefined, "the wrapper one `inert` covers is ref'd");
      assert.equal(under?.inert, false, 'and the water keeps its controls until asked');

      // Escape with nothing left to cancel is the way out of the water — the
      // renderer raises it, the shell decides, so this is the whole path.
      dispatchWindow('keydown', { code: 'Escape' });
      await world.settle();
      assert.ok(shows(world.tree, 'Holding station'), 'the menu came up');
      assert.equal(under?.inert, true, 'and took the tab order with it');

      dispatchWindow('keydown', { code: 'Escape' });
      await world.settle();
      assert.equal(shows(world.tree, 'Holding station'), false, 'the menu stepped back out');
      assert.equal(under?.inert, false, 'and gave the water its controls back');
    } finally {
      await world.unmount();
    }
  });

  it('never leaves the water inert behind a menu a lost signal closed', async () => {
    // A signal that is not 'connected' closes the menu, because the reconnect
    // overlay is information the player must see. The flag has to come down
    // with it: a match that reconnects into a keyboard that reaches nothing
    // is unrecoverable without a reload.
    const world = await mount();
    try {
      await joinMatch(world);
      dispatchWindow('keydown', { code: 'Escape' });
      await world.settle();
      assert.equal(world.hosts.get('game-under')?.inert, true);

      world.room.drop();
      await world.settle();
      assert.equal(shows(world.tree, 'Holding station'), false, 'the menu stood aside');
      assert.equal(world.hosts.get('game-under')?.inert, false, 'and the water can be reached');
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

describe('the shell: what a panel’s own type does under §11’s UI scale', () => {
  // docs/ui-ux.md §11, and §2 is the reason. The strip and the console scale
  // with the HUD, so at 200% the room between them halves while a panel that
  // magnified everything wanted four times the area — the orders panel asked
  // for 444 panel units of rows in 182 units of screen. The square root is
  // what makes it fit while still being magnification worth asking for.
  it('leaves type alone at or below 100%, where shrinking the HUD already buys room', () => {
    for (const scale of [0.75, 0.9, 1]) assert.equal(panelType(scale), 1, `at ${scale}`);
  });

  it('grows a panel’s type by the square root of the scale above 100%', () => {
    // 1.41x at 200%, not 2x — so the panel holds about twice the rows.
    assert.equal(panelType(2).toFixed(4), Math.SQRT1_2.toFixed(4));
    assert.equal((panelType(2) * 2).toFixed(4), Math.SQRT2.toFixed(4), 'type is 1.41x, not 2x');
  });

  it('never returns a factor that would make type grow faster than the panel', () => {
    // The failure this guards is a sign error or an inverted ratio, which would
    // magnify the type *more* than the scale and overflow the panel harder.
    for (const scale of [1.25, 1.5, 1.75, 2]) {
      const factor = panelType(scale);
      assert.ok(factor > 0 && factor < 1, `${scale} counter-scales`);
      assert.ok(factor * scale > 1, `${scale} still magnifies`);
      assert.ok(factor * scale < scale, `${scale} magnifies less than the panel`);
    }
  });
});
