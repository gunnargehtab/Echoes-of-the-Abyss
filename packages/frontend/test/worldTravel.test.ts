/**
 * The board's world and a launch's travel — docs/world-map.md §7.6 (#1462).
 *
 * The board holds one frame over the mid-Rift and takes no input; launching
 * the prologue moves that camera to the mission's opening frame over 2.5 s,
 * a cut under reduced motion or a Skip, before any room is joined. These hold
 * the arithmetic to the section, and the backdrop to the page's one world
 * view: it draws the board from it, travels on it, and gives it back.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import {
  PROLOGUE_SORROWGATE_HEADER,
  SEEDING_RADICALS_HEADER,
  SORROWGATE_REGION,
  WORLD,
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
import { saveSettings, loadSettings } from '../src/settings/store.ts';
import { openingFrame, type CameraFrame } from '../src/game/PerspectiveView.ts';
import { WorldBackdrop, type WorldBackdropProps } from '../src/game/WorldBackdrop.tsx';
import { overviewDepthAtM, overviewGrid } from '../src/game/worldOverview.ts';
import { arrivalFrame, boardFrame, Travel, travelFrame } from '../src/game/worldTravel.ts';
import { worldView } from '../src/game/worldView.ts';
import { readyToJoin, startTravel, travelsFirst } from '../src/menu/launch.ts';
import { TravelScreen } from '../src/menu/TravelScreen.tsx';
import { click, render } from './support/screen.ts';

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

  it('ends a travel on the opening frame every entry opens on', () => {
    const region: WorldRegion = SORROWGATE_REGION;
    sameFrame(arrivalFrame(region), openingFrame(5_000, 4_000));
    near(arrivalFrame(region).distanceM, 5_250, 'the map framed whole');
  });

  it('starts and ends exactly, eases between, and comes in evenly on the dolly', () => {
    const from = boardFrame(SORROWGATE_REGION);
    const to = arrivalFrame(SORROWGATE_REGION);
    sameFrame(travelFrame(from, to, 0), from);
    sameFrame(travelFrame(from, to, 1), to);
    sameFrame(travelFrame(from, to, -1), from);
    sameFrame(travelFrame(from, to, 2), to);
    // Halfway in time is halfway in the dolly's logarithm.
    near(travelFrame(from, to, 0.5).distanceM, Math.sqrt(24_000 * 5_250), 'midway', 1e-6);
    // Eased: the first tenth covers less than a tenth.
    assert.ok(travelFrame(from, to, 0.1).distanceM > 24_000 * (5_250 / 24_000) ** 0.1);
  });

  it('turns the shorter way round', () => {
    const from = { ...boardFrame(SORROWGATE_REGION), yawDeg: 350 };
    const to = { ...from, yawDeg: 10 };
    near(travelFrame(from, to, 0.5).yawDeg, 360, 'through north, not round the back');
  });

  it('cuts under a zero duration, and on a skip', () => {
    const to = arrivalFrame(SORROWGATE_REGION);
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
    const to = arrivalFrame(SORROWGATE_REGION);
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
  webgl = true
): Promise<Mounted> {
  const gl = new HeadlessWebGLRenderer();
  const host = createHost(1280, 720);
  const devices = {
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

/** Advance the clock and draw one frame. */
async function frameAt(ms: number): Promise<void> {
  clock = ms;
  await act(async () => {
    pumpAnimationFrames();
  });
}

const PILOT = { kind: 'mission', missionId: PROLOGUE_SORROWGATE_HEADER.id } as const;

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

  it('travels to the opening frame over 2.5 s, and says when it is there', async () => {
    const board = await mountBackdrop();
    try {
      await board.update({ target: PILOT });
      await frameAt(1);
      const view = worldView.current!;
      await frameAt(1_250);
      assert.equal(board.settled, 0, 'halfway is not there');
      assert.ok(view.frame.distanceM < WORLD.BOARD_DOLLY_M && view.frame.distanceM > 5_250);
      await frameAt(2_501);
      assert.equal(board.settled, 1, 'arrived once');
      sameFrame(view.frame, arrivalFrame(SORROWGATE_REGION), 1e-6);
      await frameAt(4_000);
      assert.equal(board.settled, 1, 'and only once');
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
      assert.equal(reduced.settled, 1, 'a cut on the first frame');
      sameFrame(worldView.current!.frame, arrivalFrame(SORROWGATE_REGION), 1e-6);
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
      assert.equal(skipped.settled, 1, 'Skip arrives at once');
      sameFrame(worldView.current!.frame, arrivalFrame(SORROWGATE_REGION), 1e-6);
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
    const lent = worldView.acquire(PROLOGUE_SORROWGATE_HEADER.id, createHost(1280, 720));
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
      onSkip: () => void (skips += 1),
      onCancel: () => void (cancels += 1),
    };
    const view = await render(createElement(TravelScreen, props));
    try {
      assert.ok(view.shows(PROLOGUE_SORROWGATE_HEADER.name));
      assert.ok(view.shows('1,500 m'), "the ground's depth, as the board's caption reads it");
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
