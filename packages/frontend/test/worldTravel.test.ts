/**
 * The board's world and a launch's travel — docs/world-map.md §7.6 (#1462).
 *
 * The board holds one frame over the mid-Rift and takes no input; launching
 * the prologue moves that camera home — the spawn, at the home dolly — over
 * 2.5 s, a cut under reduced motion or a Skip, before any room is joined. These hold
 * the arithmetic to the section, and the backdrop to the page's one world
 * view: it draws the board from it, travels on it, and gives it back.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  paintGround,
  PROLOGUE_SORROWGATE_HEADER,
  SEEDING_RADICALS_HEADER,
  SORROWGATE_GROUND,
  SORROWGATE_REGION,
  WORLD,
  WORLD_REGIONS,
  type WorldRegion,
} from '@echoes/shared';
import {
  clearStorage,
  createHost,
  dispatchWindow,
  installStorage,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
  type StubElement,
} from './support/headless.ts';
import { cannedSnapshot } from './support/cannedMatch.ts';
import { saveSettings, loadSettings } from '../src/settings/store.ts';
import { HOME_DOLLY_M, type CameraFrame } from '../src/game/PerspectiveView.ts';
import { WorldBackdrop, type WorldBackdropProps } from '../src/game/WorldBackdrop.tsx';
import { overviewDepthAtM, overviewGrid } from '../src/game/worldOverview.ts';
import {
  arrivalFrame,
  boardFrame,
  prepareRegion,
  Travel,
  travelFrame,
} from '../src/game/worldTravel.ts';
import { whenEnvTemplatesReady } from '../src/game/environmentModels.ts';
import { worldView } from '../src/game/worldView.ts';
import { onTravel, readyToJoin, startTravel, travelsFirst } from '../src/menu/launch.ts';
import { TravelScreen } from '../src/menu/TravelScreen.tsx';
import { click, render } from './support/screen.ts';

/** Where a travel to the prologue ends (§7.6 step 2). */
const HOME = arrivalFrame(SORROWGATE_REGION)!;

const near = (a: number, b: number, what: string, within = 1e-6) =>
  assert.ok(Math.abs(a - b) <= within, `${what}: ${a} against ${b}`);

function sameFrame(a: CameraFrame, b: CameraFrame, within = 1e-6): void {
  near(a.xM, b.xM, 'x', within);
  near(a.yM, b.yM, 'y', within);
  near(a.distanceM, b.distanceM, 'dolly', within);
  near(a.yawDeg, b.yawDeg, 'yaw', within);
  near(a.pitchDeg, b.pitchDeg, 'pitch', within);
}

/** A camera that is only its frame, for the travel alone. */
function camera(start: CameraFrame): { frame: CameraFrame; setFrame(f: CameraFrame): void } {
  return {
    frame: start,
    setFrame(f) {
      this.frame = f;
    },
  };
}

describe('the board and the travel, as frames (§7.6)', () => {
  it("holds the board 24 km back from the middle of Sorrowgate's map, north at 55°", () => {
    sameFrame(boardFrame(SORROWGATE_REGION), {
      xM: 2_500,
      yM: 2_000,
      distanceM: WORLD.BOARD_DOLLY_M,
      yawDeg: 0,
      pitchDeg: 55,
    });
    assert.equal(WORLD.BOARD_DOLLY_M, 24_000);
    assert.equal(WORLD.TRAVEL_S, 2.5);
  });

  it('ends a travel home: on the spawn, at the dolly the first sight of the force opens at', () => {
    // §7.2's anchor "Sorrowgate — the court, the flight's spawn at the arch",
    // (20,050, 42,650) in the atlas, less the region's origin.
    sameFrame(HOME, { xM: 2_550, yM: 2_150, distanceM: HOME_DOLLY_M, yawDeg: 0, pitchDeg: 55 });
    assert.equal(HOME_DOLLY_M, 2_600);
    const unplaced: WorldRegion = { ...SORROWGATE_REGION, id: 'nowhere' };
    assert.equal(arrivalFrame(unplaced), undefined, 'a region the anchor table does not place');
  });

  it('places every region it travels to', () => {
    for (const region of WORLD_REGIONS) {
      const home = arrivalFrame(region);
      assert.ok(home !== undefined, `${region.id} has an anchor of its name`);
      assert.ok(
        home.xM >= 0 && home.xM <= region.widthM && home.yM >= 0 && home.yM <= region.heightM,
        `${region.id}'s home is on its map`
      );
    }
  });

  it('starts and ends exactly, eases between, and comes in evenly on the dolly', () => {
    const from = boardFrame(SORROWGATE_REGION);
    const to = HOME;
    sameFrame(travelFrame(from, to, 0), from);
    sameFrame(travelFrame(from, to, 1), to);
    sameFrame(travelFrame(from, to, -1), from);
    sameFrame(travelFrame(from, to, 2), to);
    // Halfway in time is halfway in the dolly's logarithm.
    near(travelFrame(from, to, 0.5).distanceM, Math.sqrt(24_000 * 2_600), 'midway', 1e-6);
    // Eased: the first tenth covers less than a tenth.
    assert.ok(travelFrame(from, to, 0.1).distanceM > 24_000 * (2_600 / 24_000) ** 0.1);
  });

  it('turns the shorter way round', () => {
    const from = { ...boardFrame(SORROWGATE_REGION), yawDeg: 350 };
    const to = { ...from, yawDeg: 10 };
    near(travelFrame(from, to, 0.5).yawDeg, 360, 'through north, not round the back');
  });

  it('cuts under a zero duration, and on a skip', () => {
    const to = HOME;
    const cut = camera(boardFrame(SORROWGATE_REGION));
    assert.equal(new Travel(cut, to, 0).step(1_000), true);
    sameFrame(cut.frame, to);

    const skipped = camera(boardFrame(SORROWGATE_REGION));
    const travel = new Travel(skipped, to, 2.5);
    assert.equal(travel.step(0), false);
    assert.equal(travel.step(1_000), false);
    travel.skip();
    assert.equal(travel.done, true);
    sameFrame(skipped.frame, to);
  });

  it('arrives at 2.5 s and not before', () => {
    const to = HOME;
    const moving = camera(boardFrame(SORROWGATE_REGION));
    const travel = new Travel(moving, to, WORLD.TRAVEL_S);
    assert.equal(travel.step(10_000), false);
    assert.equal(travel.step(12_499), false);
    assert.ok(moving.frame.distanceM > to.distanceM);
    assert.equal(travel.step(12_500), true);
    sameFrame(moving.frame, to);
  });
});

/** The backdrop, booted on a headless GL device, with a clock it can be read off. */
interface Mounted {
  tree: ReactTestRenderer;
  host: StubElement;
  gl: HeadlessWebGLRenderer;
  settled: number;
  update(props: Partial<WorldBackdropProps>): Promise<void>;
  unmount(): Promise<void>;
}

let clock = 0;
const realNow = performance.now.bind(performance);

async function mountBackdrop(
  props: Partial<WorldBackdropProps> = {},
  webgl = true,
  prepare?: () => Promise<void>
): Promise<Mounted> {
  const gl = new HeadlessWebGLRenderer();
  const host = createHost(1280, 720);
  const devices = {
    ...(prepare === undefined ? {} : { prepare }),
    environment: gl.environment,
    glRenderer: () => {
      if (!webgl) throw new Error('headless: WebGL unavailable');
      return gl.asRenderer();
    },
  };
  const mounted = { settled: 0 } as Mounted;
  let current: WorldBackdropProps = {
    target: { kind: 'board' },
    onSettled: () => {
      mounted.settled += 1;
    },
    devices,
    ...props,
  };
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(createElement(WorldBackdrop, current), { createNodeMock: () => host });
  });
  Object.assign(mounted, {
    tree,
    host,
    gl,
    update: async (next: Partial<WorldBackdropProps>) => {
      current = { ...current, ...next };
      await act(async () => {
        tree.update(createElement(WorldBackdrop, current));
      });
    },
    unmount: async () => {
      await act(async () => {
        tree.unmount();
      });
    },
  });
  return mounted;
}

/**
 * Let real time run until the backdrop says it has arrived — the region's
 * preparation runs on real timers (the overview's bake, the prop models'
 * loads) while the travel runs on the stubbed clock.
 */
async function untilSettled(board: Mounted, count: number): Promise<void> {
  for (let waited = 0; waited < 60_000 && board.settled < count; waited += 20) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }
  assert.equal(board.settled, count, 'the backdrop said it had arrived');
}

/** Advance the clock and draw one frame. */
async function frameAt(ms: number): Promise<void> {
  clock = ms;
  await act(async () => {
    pumpAnimationFrames();
  });
}

const PILOT = { kind: 'mission', missionId: PROLOGUE_SORROWGATE_HEADER.id } as const;

/** Where a session was left before Return to port: turned, low, off home. */
const LEFT: CameraFrame = { xM: 1_200, yM: 2_600, distanceM: 1_800, yawDeg: 40, pitchDeg: 40 };

describe('the world behind the board (§7.6)', () => {
  beforeEach(() => {
    installStorage();
    clock = 0;
    performance.now = () => clock;
  });

  afterEach(() => {
    performance.now = realNow;
    worldView.dispose();
    clearStorage();
  });

  it("draws the board from the page's one world view, at the board's frame", async () => {
    const board = await mountBackdrop();
    try {
      const view = worldView.current;
      assert.ok(view !== null, 'the board borrowed the world view');
      assert.equal(board.host.childNodes.length, 1, 'its canvas is behind the board');
      sameFrame(view.frame, boardFrame(SORROWGATE_REGION), 1e-6);
      // With no session's ground it stands on the atlas, not the surface.
      const atlas = overviewDepthAtM(overviewGrid(), 20_000, 42_500);
      assert.ok(atlas > 1_000, `the drowned city lies ${atlas} m down`);
      near(view.seabedDepthAt(2_500, 2_000), atlas, 'the ground under the focus');
      // The focus is held to the atlas frame (§7.4 rule 1, the overview).
      view.setFrame({ ...boardFrame(SORROWGATE_REGION), xM: -90_000, yM: 900_000 });
      sameFrame(
        { ...view.frame, distanceM: 0, yawDeg: 0, pitchDeg: 0 },
        { xM: -17_500, yM: 49_500, distanceM: 0, yawDeg: 0, pitchDeg: 0 }
      );
    } finally {
      await board.unmount();
    }
  });

  it('travels home over 2.5 s, and says when it is there', async () => {
    const board = await mountBackdrop();
    try {
      await board.update({ target: PILOT });
      await frameAt(1);
      const view = worldView.current!;
      await frameAt(1_250);
      assert.equal(board.settled, 0, 'halfway is not there');
      assert.ok(
        view.frame.distanceM < WORLD.BOARD_DOLLY_M && view.frame.distanceM > HOME.distanceM
      );
      await frameAt(2_501);
      sameFrame(view.frame, HOME, 1e-6);
      await untilSettled(board, 1);
      await frameAt(4_000);
      assert.equal(board.settled, 1, 'and only once');
    } finally {
      await board.unmount();
    }
  });

  it('waits for the region to be prepared before it says it has arrived', async () => {
    let loaded!: () => void;
    const held = new Promise<void>((resolve) => (loaded = resolve));
    const board = await mountBackdrop({}, true, () => held);
    try {
      await board.update({ target: PILOT });
      await frameAt(1);
      await frameAt(2_501);
      sameFrame(worldView.current!.frame, HOME, 1e-6);
      assert.equal(board.settled, 0, 'home, but the region is still loading');
      await act(async () => {
        loaded();
        await held;
      });
      assert.equal(board.settled, 1, 'arrived once the region is ready');
    } finally {
      await board.unmount();
    }
  });

  it('cuts under reduced motion, and on a skip', async () => {
    saveSettings({ ...loadSettings(), reducedMotion: true });
    const reduced = await mountBackdrop();
    try {
      await reduced.update({ target: PILOT });
      await frameAt(1);
      sameFrame(worldView.current!.frame, HOME, 1e-6);
      await untilSettled(reduced, 1);
    } finally {
      await reduced.unmount();
    }
    worldView.dispose();
    saveSettings({ ...loadSettings(), reducedMotion: false });

    const skipped = await mountBackdrop();
    try {
      await skipped.update({ target: PILOT });
      await frameAt(500);
      assert.equal(skipped.settled, 0);
      await skipped.update({ skip: true });
      sameFrame(worldView.current!.frame, HOME, 1e-6);
      await untilSettled(skipped, 1);
    } finally {
      await skipped.unmount();
    }
  });

  it('travels back to the board on a cancel', async () => {
    const board = await mountBackdrop();
    try {
      await board.update({ target: PILOT });
      await frameAt(1);
      await frameAt(1_000);
      await board.update({ target: { kind: 'board' } });
      await frameAt(1_001);
      await frameAt(3_502);
      sameFrame(worldView.current!.frame, boardFrame(SORROWGATE_REGION), 1e-6);
    } finally {
      await board.unmount();
    }
  });

  it('takes a return where the session left it: the fade out, then the travel back (§7.6 step 4)', async () => {
    // A session on the pilot, its fade all the way in, its camera wherever
    // the player left it.
    const gl = new HeadlessWebGLRenderer();
    const lent = worldView.acquire(
      PROLOGUE_SORROWGATE_HEADER.id,
      createHost(1280, 720) as unknown as HTMLElement,
      { glRenderer: () => gl.asRenderer(), environment: gl.environment }
    )!;
    const view = lent.view;
    view.setActive(true);
    view.setReducedMotion(false);
    const ground = paintGround(SORROWGATE_GROUND);
    view.setTerrain({
      region: SORROWGATE_REGION.id,
      cols: ground.cols,
      rows: ground.rows,
      cellM: ground.cellM,
      biomes: Array.from(ground.biomes),
      floor: Array.from(ground.floor),
      ceiling: Array.from(ground.ceiling),
    });
    view.applySnapshot(cannedSnapshot());
    for (let ms = 0; ms <= 1_000; ms += 100) await frameAt(ms);
    const left: CameraFrame = { xM: 1_200, yM: 2_600, distanceM: 1_800, yawDeg: 40, pitchDeg: 40 };
    view.setFrame(left);
    const terrain = () => (view as unknown as { terrain: unknown }).terrain;

    worldView.release(lent.claim, 'return');
    const board = await mountBackdrop();
    try {
      assert.equal(worldView.current === view, true, 'the same world, on the board');
      assert.equal(board.host.childNodes.length, 1, 'drawn behind it');
      await frameAt(1_001);
      await frameAt(1_400);
      sameFrame(view.frame, left, 1e-6);
      assert.equal(view.borderSettled, false, 'the fade going out, where the session left it');
      assert.equal(terrain() !== null, true, "over the session's ground");
      await frameAt(1_802);
      await frameAt(1_803);
      assert.equal(view.borderSettled, true, 'out after 0.8 s');
      await frameAt(3_050);
      assert.ok(
        view.frame.distanceM > left.distanceM && view.frame.distanceM < WORLD.BOARD_DOLLY_M,
        `travelling back: ${view.frame.distanceM} m`
      );
      await frameAt(4_400);
      sameFrame(view.frame, boardFrame(SORROWGATE_REGION), 1e-6);
    } finally {
      await board.unmount();
    }
    assert.equal(terrain() === null, true, 'the board let the ground go with the view');
  });

  /** A session on the pilot, left at `LEFT` and handed back for a return. */
  async function returning(withGround: boolean) {
    const gl = new HeadlessWebGLRenderer();
    const lent = worldView.acquire(
      PROLOGUE_SORROWGATE_HEADER.id,
      createHost(1280, 720) as unknown as HTMLElement,
      { glRenderer: () => gl.asRenderer(), environment: gl.environment }
    )!;
    const view = lent.view;
    if (withGround) {
      const ground = paintGround(SORROWGATE_GROUND);
      view.setTerrain({
        region: SORROWGATE_REGION.id,
        cols: ground.cols,
        rows: ground.rows,
        cellM: ground.cellM,
        biomes: Array.from(ground.biomes),
        floor: Array.from(ground.floor),
        ceiling: Array.from(ground.ceiling),
      });
      view.setReducedMotion(true);
      view.applySnapshot(cannedSnapshot());
      view.setActive(true);
      await frameAt(0);
    }
    view.setFrame(LEFT);
    worldView.release(lent.claim, 'return');
    return view;
  }

  it('keeps a return across a board let go and taken back in one commit', async () => {
    // StrictMode's unmount and remount in development, which react-dom runs
    // back to back inside one commit. react-test-renderer 18 does not
    // double-invoke effects, so the two are made by hand inside one
    // synchronous act, which flushes both sets of effects with no microtask
    // between them.
    const view = await returning(false);
    const first = await mountBackdrop();
    const gl = new HeadlessWebGLRenderer();
    const host = createHost(1280, 720);
    let again!: ReactTestRenderer;
    act(() => {
      first.tree.unmount();
      again = create(
        createElement(WorldBackdrop, {
          target: { kind: 'board' },
          devices: { environment: gl.environment, glRenderer: () => gl.asRenderer() },
        }),
        { createNodeMock: () => host }
      );
    });
    try {
      await frameAt(1);
      sameFrame(view.frame, LEFT, 1e-6);
      await frameAt(2);
      await frameAt(2_600);
      sameFrame(view.frame, boardFrame(SORROWGATE_REGION), 1e-6);
    } finally {
      await act(async () => {
        again.unmount();
      });
    }
  });

  it('lets a board go at once once its return has arrived', async () => {
    const view = await returning(true);
    const claim = worldView.showBoard(createHost(1280, 720) as unknown as HTMLElement)!;
    assert.equal(view.leavingGround, true, 'mid-return');
    worldView.endReturn(claim);
    worldView.release(claim);
    assert.equal(view.leavingGround, false, 'a plain release: the ground went now');
    sameFrame(view.frame, LEFT, 1e-6);
  });

  it('opens a board taken later at its own frame, the return landed', async () => {
    // The record's door mid-return, and its Back (§7.6 step 4).
    const view = await returning(true);
    const first = await mountBackdrop();
    await frameAt(1);
    await first.unmount();
    const terrain = () => (view as unknown as { terrain: unknown }).terrain;
    assert.equal(terrain() === null, true, "the session's ground went with the board");
    const later = await mountBackdrop();
    try {
      sameFrame(view.frame, boardFrame(SORROWGATE_REGION), 1e-6);
      assert.equal(view.borderSettled, true, 'and the ramp landed');
    } finally {
      await later.unmount();
    }
  });

  it('holds a reduced-motion return on its frame until the baseline, then cuts with the swap', async () => {
    saveSettings({ ...loadSettings(), reducedMotion: true });
    const view = await returning(true);
    const board = await mountBackdrop();
    try {
      await frameAt(1);
      assert.equal(view.leavingGround, true, 'the baseline is still building');
      sameFrame(view.frame, LEFT, 1e-6);
      // The build runs on real timers; the camera holds through every frame of it.
      for (let waited = 0; waited < 60_000 && view.leavingGround; waited += 20) {
        sameFrame(view.frame, LEFT, 1e-6);
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
        });
        await frameAt(2 + waited);
      }
      assert.equal(view.leavingGround, false, 'the baseline gave way');
      sameFrame(view.frame, boardFrame(SORROWGATE_REGION), 1e-6);
      await untilSettled(board, 1);
    } finally {
      await board.unmount();
    }
  });

  it('opens the board at its own frame when no return is under way', async () => {
    const gl = new HeadlessWebGLRenderer();
    const lent = worldView.acquire(
      PROLOGUE_SORROWGATE_HEADER.id,
      createHost(1280, 720) as unknown as HTMLElement,
      { glRenderer: () => gl.asRenderer(), environment: gl.environment }
    )!;
    lent.view.setFrame({ xM: 1_200, yM: 2_600, distanceM: 1_800, yawDeg: 40, pitchDeg: 40 });
    // The record's door, or any leaving but a return.
    worldView.release(lent.claim);
    const board = await mountBackdrop();
    try {
      sameFrame(lent.view.frame, boardFrame(SORROWGATE_REGION), 1e-6);
    } finally {
      await board.unmount();
    }
  });

  it('arrives at once where the device cannot draw the world', async () => {
    const board = await mountBackdrop({}, false);
    try {
      assert.equal(worldView.current, null, 'no world, and none half-built');
      const before = board.settled;
      await board.update({ target: PILOT });
      assert.equal(
        board.settled,
        before + 1,
        'the launch is never held on a world that is not there'
      );
    } finally {
      await board.unmount();
    }
  });

  it('gives the view back when it leaves, and the next session takes the same one', async () => {
    const board = await mountBackdrop();
    const view = worldView.current;
    await board.unmount();
    assert.equal(board.host.childNodes.length, 0, 'its canvas left the board');
    const before = board.gl.ledger.frames;
    pumpAnimationFrames(3);
    assert.equal(board.gl.ledger.frames, before, 'nothing draws while nobody holds it');
    const host = createHost(1280, 720) as unknown as HTMLElement;
    const lent = worldView.acquire(PROLOGUE_SORROWGATE_HEADER.id, host);
    assert.equal(lent?.view, view, 'the session draws in the same world');
  });
});

describe('which launches travel, and when a travel joins (§7.6)', () => {
  const PROLOGUE = PROLOGUE_SORROWGATE_HEADER.id;

  it('travels only a placed mission, and only from the board', () => {
    assert.equal(travelsFirst('campaign', PROLOGUE), true);
    assert.equal(travelsFirst('title', PROLOGUE), false, "the Tutorial door's briefing joins");
    assert.equal(
      travelsFirst('campaign', SEEDING_RADICALS_HEADER.id),
      false,
      "Radicals is on Sorrowgate's map and is not placed"
    );
  });

  it('joins once the match is loaded and the camera has arrived, never before', () => {
    const travel = startTravel(PROLOGUE);
    assert.equal(readyToJoin(travel, false), false, 'on Descend');
    assert.equal(readyToJoin({ ...travel, settled: true }, false), false, 'arrived, not loaded');
    assert.equal(readyToJoin({ ...travel, prepared: true }, false), false, 'loaded, travelling');
    assert.equal(readyToJoin({ ...travel, skipped: true, prepared: true }, false), false);
    assert.equal(readyToJoin({ ...travel, settled: true, prepared: true }, false), true);
    assert.equal(
      readyToJoin({ ...travel, prepared: true }, true),
      true,
      'no world to travel in: loaded is enough'
    );
  });
});

describe("the travel's bar (§7.6)", () => {
  it('names the destination as the board does, and offers Skip and Cancel', async () => {
    let skips = 0;
    let cancels = 0;
    const props = {
      missionId: PROLOGUE_SORROWGATE_HEADER.id,
      skipped: false,
      settled: false,
      onSkip: () => void (skips += 1),
      onCancel: () => void (cancels += 1),
    };
    const view = await render(createElement(TravelScreen, props));
    try {
      assert.ok(view.shows(PROLOGUE_SORROWGATE_HEADER.name));
      assert.ok(view.shows('1,500 m'), "the ground's depth, as the board's caption reads it");
      assert.ok(view.shows('Descending'));
      await view.update(createElement(TravelScreen, { ...props, settled: true }));
      assert.ok(view.shows('Arriving'), 'arrived on its own, only the loading left');
      await view.update(createElement(TravelScreen, props));
      await click(view, 'Skip');
      assert.equal(skips, 1);
      await click(view, 'Cancel');
      assert.equal(cancels, 1);
      await view.act(() => {
        dispatchWindow('keydown', { key: 'Escape', preventDefault: () => {} });
      });
      assert.equal(cancels, 2, 'Esc is Cancel');

      await view.update(createElement(TravelScreen, { ...props, skipped: true }));
      assert.equal(view.button('Skip').props['aria-disabled'], true, 'skipped, and announced so');
      await click(view, 'Skip');
      assert.equal(skips, 1, 'a second Skip does nothing');
    } finally {
      await view.unmount();
    }
  });
});

describe("the region's preparation (§7.6 step 2)", () => {
  // A hang is the failure this guards against, so it fails rather than stalls.
  it(
    "settles once the overview's skin and the props' models are fetched, or fail",
    { timeout: 30_000 },
    async () => {
      // Under node no model loads, so every prop the baseline ground stands
      // fails: a failure has to count as done, or a launch is held for good.
      await prepareRegion(SORROWGATE_REGION, 'sorrowgate');
      await whenEnvTemplatesReady(
        [{ slug: 'env-no-such-prop', footprintM: 10, swayM: 0 }],
        'sorrowgate'
      );
    }
  );
});

describe("a travel's news, after the player has left it (§7.6, Cancel)", () => {
  const PROLOGUE = PROLOGUE_SORROWGATE_HEADER.id;

  it('joins nothing once Cancel has gone back to the board', () => {
    const board = { kind: 'campaign' } as const;
    for (const change of [{ prepared: true }, { settled: true }, { skipped: true }]) {
      assert.equal(onTravel(board, change, PROLOGUE), board, JSON.stringify(change));
      assert.equal(onTravel(board, change), board);
    }
  });

  it("takes only its own launch's loading, and every travel's arrival and Skip", () => {
    const travel = startTravel(PROLOGUE);
    assert.equal(onTravel(travel, { prepared: true }, 'elsewhere'), travel, 'another launch');
    const loaded = onTravel(travel, { prepared: true }, PROLOGUE);
    assert.deepEqual(loaded, { ...travel, prepared: true });
    const arrived = onTravel(loaded, { settled: true });
    assert.equal(readyToJoin(arrived as typeof travel, false), true);
  });
});
