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
  ANHOLT_FURROW_REGION,
  ATTENDING_ATTENDANCE_HEADER,
  ATTENDING_CONCLAVE_HEADER,
  ATTENDING_FIRST_ARRIVAL_HEADER,
  ATTENDING_GALLERIES_REGION,
  ATTENDING_INTAKE_HEADER,
  ATTENDING_SHALLOW_HEADER,
  ATTENDING_THE_DOME_HEADER,
  ATTENDING_TRENCH_AWAKENING_HEADER,
  BANDING_GROUND_GROUND,
  BANDING_GROUND_REGION,
  CHORD_RIM_DEPOSITS_HEADER,
  CHORD_SECOND_CHORD_HEADER,
  FACE_SIX_REGION,
  FOURTH_FOOT_REGION,
  HOLDING_BOARD_REGION,
  HOLDING_UNDERWORKS_REGION,
  KELL_SHOULDER_REGION,
  LEDGER_ASSET_RECOVERY_HEADER,
  LEDGER_EXPOSURE_HEADER,
  LEDGER_ITEM_NINE_HEADER,
  LEDGER_PROSPECT_HEADER,
  LEDGER_SHIFT_CHANGE_HEADER,
  LEDGER_TOLERANCE_HEADER,
  MARR_PLATEAU_REGION,
  MOUTH_RIM_REGION,
  paintGround,
  PROLOGUE_SORROWGATE_HEADER,
  SEEDING_CONVOCATION_HEADER,
  SEEDING_DEEP_FURROW_HEADER,
  SEEDING_IN_WRITING_HEADER,
  SEEDING_RADICALS_HEADER,
  SEEDING_SECOND_SEEDING_HEADER,
  SEEDING_TEND_HEADER,
  SEEDING_THIN_WATER_HEADER,
  SHALLOW_BAND_REGION,
  SORROWGATE_GROUND,
  SORROWGATE_REGION,
  UPPER_TERRACES_REGION,
  UPPER_WORKINGS_REGION,
  WESTERN_MARGIN_REGION,
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
  inView,
  prepareRegion,
  Travel,
  travelFrame,
} from '../src/game/worldTravel.ts';
import { whenEnvTemplatesReady } from '../src/game/environmentModels.ts';
import { worldView } from '../src/game/worldView.ts';
import {
  onLoad,
  onTravel,
  readyToJoin,
  startTravel,
  travelsFirst,
  type TravelState,
} from '../src/menu/launch.ts';
import { TravelScreen } from '../src/menu/TravelScreen.tsx';
import { MatchBoundary } from '../src/menu/MatchBoundary.tsx';
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
    return Object.assign(view, { gl });
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
    // What each drawn frame showed, read as the device draws it: the camera
    // and whether the session's ground was still there.
    const draws: { left: boolean; board: boolean; ground: boolean }[] = [];
    const at = (a: CameraFrame, b: CameraFrame) =>
      Math.hypot(a.xM - b.xM, a.yM - b.yM) < 1 && Math.abs(a.distanceM - b.distanceM) < 1;
    const draw = view.gl.render.bind(view.gl);
    view.gl.render = (scene, camera) => {
      const frame = view.frame;
      draws.push({
        left: at(frame, LEFT),
        board: at(frame, boardFrame(SORROWGATE_REGION)),
        ground: view.leavingGround,
      });
      draw(scene, camera);
    };
    // The baseline's build, held until the test lets it go.
    let built!: () => void;
    const held = new Promise<void>((resolve) => (built = resolve));
    type Build = { loadRegionDetail: (id: string, signal: AbortSignal) => Promise<unknown> };
    const real = (view as unknown as Build).loadRegionDetail.bind(view);
    (view as unknown as Build).loadRegionDetail = async (id, signal) => {
      await held;
      return real(id, signal);
    };
    const board = await mountBackdrop();
    try {
      // Frames while the build is held: a cut not held would draw the board
      // over the session's ground here.
      for (let ms = 1; ms < 6; ms++) await frameAt(ms);
      assert.equal(view.leavingGround, true, 'the baseline is still building');
      built();
      // The build runs on real timers; the frames keep coming meanwhile.
      for (let waited = 0; waited < 60_000 && view.leavingGround; waited += 20) {
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
        });
        await frameAt(10 + waited);
      }
      await frameAt(70_000);
      assert.equal(view.leavingGround, false, 'the baseline gave way');
      const swap = draws.findIndex((d) => !d.ground);
      assert.ok(swap > 0, 'frames were drawn over the session ground, then without it');
      assert.ok(
        draws.slice(0, swap).every((d) => d.left && d.ground),
        "every frame before the swap is the session's, on its frame"
      );
      assert.ok(
        draws.slice(swap).every((d) => d.board && !d.ground),
        "the swap's own frame, and every one after, is the board's: one change"
      );
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

describe('a second placed mission, in the same world (#1598)', () => {
  const INTAKE = { kind: 'mission', missionId: ATTENDING_INTAKE_HEADER.id } as const;
  const look = (view: object) => (view as { look: string }).look;
  const terrainOf = (region: WorldRegion, ground: typeof SORROWGATE_GROUND) => {
    const cells = paintGround(ground);
    return {
      region: region.id,
      cols: cells.cols,
      rows: cells.rows,
      cellM: cells.cellM,
      biomes: Array.from(cells.biomes),
      floor: Array.from(cells.floor),
      ceiling: Array.from(cells.ceiling),
    };
  };

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

  it("ends Intake's travel on the muster, §7.2's derived anchor for its spawn", () => {
    sameFrame(arrivalFrame(BANDING_GROUND_REGION)!, {
      xM: 2_500,
      yM: 750,
      distanceM: HOME_DOLLY_M,
      yawDeg: 0,
      pitchDeg: 55,
    });
  });

  it("ends Exposure's travel on the shelf lane, its spawn (#1612)", () => {
    sameFrame(arrivalFrame(WESTERN_MARGIN_REGION)!, {
      xM: 2_500,
      yM: 375,
      distanceM: HOME_DOLLY_M,
      yawDeg: 0,
      pitchDeg: 55,
    });
  });

  it("ends Trench Awakening's travel on the rendering row, its spawn (#1615)", () => {
    sameFrame(arrivalFrame(SHALLOW_BAND_REGION)!, {
      xM: 2_500,
      yM: 1_000,
      distanceM: HOME_DOLLY_M,
      yawDeg: 0,
      pitchDeg: 55,
    });
  });

  it('ends the Ninefold travels on their spawns: Face Two and the rail head (#1626)', () => {
    const home = { distanceM: HOME_DOLLY_M, yawDeg: 0, pitchDeg: 55 };
    sameFrame(arrivalFrame(UPPER_WORKINGS_REGION)!, { xM: 875, yM: 2_250, ...home });
    sameFrame(arrivalFrame(FACE_SIX_REGION)!, { xM: 2_000, yM: 250, ...home });
  });

  it("ends The Dome's travel on the Fourth's mouth, its spawn (#1628)", () => {
    sameFrame(arrivalFrame(FOURTH_FOOT_REGION)!, {
      xM: 1_500,
      yM: 4_000,
      distanceM: HOME_DOLLY_M,
      yawDeg: 0,
      pitchDeg: 55,
    });
  });

  it("ends Tend's and Convocation's travel on the Holdfast, their spawn (#1630)", () => {
    sameFrame(arrivalFrame(MARR_PLATEAU_REGION)!, {
      xM: 2_625,
      yM: 375,
      distanceM: HOME_DOLLY_M,
      yawDeg: 0,
      pitchDeg: 55,
    });
  });

  it("ends Thin Water's and Shallow's travel on Kell Face, their spawn (#1633)", () => {
    sameFrame(arrivalFrame(KELL_SHOULDER_REGION)!, {
      xM: 4_375,
      yM: 2_125,
      distanceM: HOME_DOLLY_M,
      yawDeg: 0,
      pitchDeg: 55,
    });
  });

  it("ends Deep Furrow's and In Writing's travel on the Furrow's Foot, their spawn (#1638)", () => {
    sameFrame(arrivalFrame(ANHOLT_FURROW_REGION)!, {
      xM: 2_000,
      yM: 250,
      distanceM: HOME_DOLLY_M,
      yawDeg: 0,
      pitchDeg: 55,
    });
  });

  it("ends the Rim's five travels on the Staging, its spawn and §7.2's own anchor (#1640)", () => {
    sameFrame(arrivalFrame(MOUTH_RIM_REGION)!, {
      xM: 3_000,
      yM: 500,
      distanceM: HOME_DOLLY_M,
      yawDeg: 0,
      pitchDeg: 55,
    });
  });

  it("ends Item Nine's travel on the Board's rail and Tolerance's on the Works Yard (#1623)", () => {
    const home = { distanceM: HOME_DOLLY_M, yawDeg: 0, pitchDeg: 55 };
    sameFrame(arrivalFrame(HOLDING_BOARD_REGION)!, { xM: 2_000, yM: 1_900, ...home });
    sameFrame(arrivalFrame(HOLDING_UNDERWORKS_REGION)!, { xM: 2_000, yM: 1_000, ...home });
  });

  it("ends Conclave's travel on the Undermarshalcy and Attendance's on the stalls (#1624)", () => {
    const home = { distanceM: HOME_DOLLY_M, yawDeg: 0, pitchDeg: 55 };
    sameFrame(arrivalFrame(UPPER_TERRACES_REGION)!, { xM: 2_500, yM: 375, ...home });
    sameFrame(arrivalFrame(ATTENDING_GALLERIES_REGION)!, { xM: 2_500, yM: 1_000, ...home });
  });

  it('gives every placed region a home to travel to', () => {
    // A region with no derived anchor would launch its mission off the world.
    for (const region of WORLD_REGIONS) assert.ok(arrivalFrame(region), region.id);
  });

  it("restates a frame in another region's metres at the same place in the atlas", () => {
    const home = arrivalFrame(BANDING_GROUND_REGION)!;
    const inPilot = inView(home, BANDING_GROUND_REGION, SORROWGATE_REGION);
    sameFrame(inPilot, { ...home, xM: 5_500, yM: 22_250 });
    sameFrame(inView(inPilot, SORROWGATE_REGION, BANDING_GROUND_REGION), home);
  });

  it("travels from the pilot's board to the muster, and the session keeps the world", async () => {
    const board = await mountBackdrop({}, true, () => Promise.resolve());
    const view = worldView.current!;
    assert.equal(look(view), 'sorrowgate', "the board opens in the prologue's look");
    await board.update({ target: INTAKE });
    await frameAt(1);
    await frameAt(2_501);
    // Still in the pilot's metres: the muster is 5.5 km east and 22.25 km south.
    sameFrame(
      view.frame,
      inView(arrivalFrame(BANDING_GROUND_REGION)!, BANDING_GROUND_REGION, SORROWGATE_REGION)
    );
    await untilSettled(board, 1);
    await board.unmount();

    const gl = new HeadlessWebGLRenderer();
    const lent = worldView.acquire(
      ATTENDING_INTAKE_HEADER.id,
      createHost(1280, 720) as unknown as HTMLElement,
      { glRenderer: () => gl.asRenderer(), environment: gl.environment }
    )!;
    assert.equal(lent.view, view, 'the same view, not one built for the session');
    assert.equal(view.region, BANDING_GROUND_REGION, "now in the Banding Ground's metres");
    assert.equal(
      look(view),
      'standard',
      'Intake keeps the standard surfaces (visual-reboot.md §2)'
    );
    sameFrame(view.frame, arrivalFrame(BANDING_GROUND_REGION)!, 1e-6);
    view.setTerrain(terrainOf(BANDING_GROUND_REGION, BANDING_GROUND_GROUND));
    assert.equal(view.rehome(SORROWGATE_REGION), false, "never under a session's ground");
    assert.equal(view.setLook('sorrowgate'), false);
    worldView.release(lent.claim);
  });

  it("takes a return from Intake back to the pilot's board, and the prologue home again", async () => {
    const gl = new HeadlessWebGLRenderer();
    const host = createHost(1280, 720) as unknown as HTMLElement;
    const devices = { glRenderer: () => gl.asRenderer(), environment: gl.environment };
    const lent = worldView.acquire(ATTENDING_INTAKE_HEADER.id, host, devices)!;
    const view = lent.view;
    view.setActive(true);
    view.setReducedMotion(false);
    view.setTerrain(terrainOf(BANDING_GROUND_REGION, BANDING_GROUND_GROUND));
    view.applySnapshot(cannedSnapshot());
    for (let ms = 0; ms <= 1_000; ms += 100) await frameAt(ms);
    worldView.release(lent.claim, 'return');
    // While the return's ground is still drawn the session is over, and the
    // focus is held to the atlas, not the mission: the board's frame lies
    // 19.5 km north of this map, and the travel back must reach it.
    const terrain = (view as unknown as { terrain: unknown }).terrain;
    assert.notEqual(terrain, null, "the session's ground is still drawn");
    const offMap = inView(boardFrame(SORROWGATE_REGION), SORROWGATE_REGION, BANDING_GROUND_REGION);
    const left = view.frame;
    view.setFrame(offMap);
    sameFrame(view.frame, offMap, 1e-6);
    view.setFrame(left);
    const board = await mountBackdrop();
    const pilotBoard = inView(
      boardFrame(SORROWGATE_REGION),
      SORROWGATE_REGION,
      BANDING_GROUND_REGION
    );
    try {
      assert.equal(worldView.current, view, 'the same world, on the board');
      assert.equal(view.region, BANDING_GROUND_REGION, "a return keeps the session's metres");
      // The travel back runs while the session's ground is still drawn, and
      // the board's frame is 19.5 km north of the map: the mission's
      // rectangle must not hold the focus at its edge.
      for (let ms = 1_001; ms <= 4_401; ms += 100) await frameAt(ms);
      assert.ok(pilotBoard.yM < -19_000, `the board's frame lies off this map: ${pilotBoard.yM}`);
      sameFrame(view.frame, pilotBoard, 1e-6);
    } finally {
      await board.unmount();
    }
    const again = worldView.acquire(PROLOGUE_SORROWGATE_HEADER.id, host, devices)!;
    assert.equal(again.view, view, 'the prologue draws in the same world');
    assert.equal(view.region, SORROWGATE_REGION);
    assert.equal(look(view), 'sorrowgate');
    // The camera stood on the board's frame, and stands there still.
    sameFrame({ ...view.frame, pitchDeg: 0 }, { ...boardFrame(SORROWGATE_REGION), pitchDeg: 0 });
    worldView.release(again.claim);
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
    assert.equal(travelsFirst('campaign', ATTENDING_INTAKE_HEADER.id), true, 'Intake is (#1598)');
    assert.equal(travelsFirst('campaign', LEDGER_EXPOSURE_HEADER.id), true, 'Exposure is (#1612)');
    assert.equal(
      travelsFirst('campaign', ATTENDING_TRENCH_AWAKENING_HEADER.id),
      true,
      'Trench Awakening is (#1615)'
    );
    for (const mission of [LEDGER_SHIFT_CHANGE_HEADER, LEDGER_ASSET_RECOVERY_HEADER]) {
      assert.equal(travelsFirst('campaign', mission.id), true, `${mission.id} is (#1626)`);
    }
    assert.equal(
      travelsFirst('campaign', ATTENDING_THE_DOME_HEADER.id),
      true,
      'The Dome is (#1628)'
    );
    assert.equal(travelsFirst('campaign', 'ledger-baffle'), false, 'Baffle waits (#1505)');
    // A shared map's missions all travel (#1505): both of Marr's (#1630), both
    // of the Kell Shoulder's (#1633), both of the Furrow's (#1638), and all five
    // of the Rim's (#1640).
    for (const mission of [SEEDING_TEND_HEADER, SEEDING_CONVOCATION_HEADER]) {
      assert.equal(travelsFirst('campaign', mission.id), true, `${mission.id} is (#1630)`);
    }
    for (const mission of [SEEDING_THIN_WATER_HEADER, ATTENDING_SHALLOW_HEADER]) {
      assert.equal(travelsFirst('campaign', mission.id), true, `${mission.id} is (#1633)`);
    }
    for (const mission of [SEEDING_DEEP_FURROW_HEADER, SEEDING_IN_WRITING_HEADER]) {
      assert.equal(travelsFirst('campaign', mission.id), true, `${mission.id} is (#1638)`);
    }
    for (const mission of [
      LEDGER_PROSPECT_HEADER,
      SEEDING_SECOND_SEEDING_HEADER,
      ATTENDING_FIRST_ARRIVAL_HEADER,
      CHORD_RIM_DEPOSITS_HEADER,
      CHORD_SECOND_CHORD_HEADER,
    ]) {
      assert.equal(travelsFirst('campaign', mission.id), true, `${mission.id} is (#1640)`);
    }
    for (const mission of [LEDGER_ITEM_NINE_HEADER, LEDGER_TOLERANCE_HEADER]) {
      assert.equal(travelsFirst('campaign', mission.id), true, `${mission.id} is (#1623)`);
    }
    for (const mission of [ATTENDING_CONCLAVE_HEADER, ATTENDING_ATTENDANCE_HEADER]) {
      assert.equal(travelsFirst('campaign', mission.id), true, `${mission.id} is (#1624)`);
    }
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

  it('joins nothing for a match whose code failed to load (§7.6, "A load or join failure")', () => {
    // The load's outcome, as the shell applies it (`onLoad`), on a travel
    // that has arrived, been skipped, or had no world to travel in.
    const failed = onLoad(startTravel(PROLOGUE), false, PROLOGUE) as TravelState;
    assert.equal(failed.loadFailed, true, 'the bar is told');
    for (const travel of [
      { ...failed, settled: true, drew: true },
      { ...failed, skipped: true, settled: true },
    ]) {
      assert.equal(readyToJoin(travel, false), false, 'nothing is joined');
      assert.equal(readyToJoin(travel, true), false, 'with no world either');
    }
    // A load that landed does join: the rule above is the failure's, not a stall.
    const loaded = onLoad({ ...startTravel(PROLOGUE), settled: true }, true, PROLOGUE);
    assert.equal(readyToJoin(loaded as TravelState, false), true);
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

  it("says a load failure on the bar, with Retry and Back (§7.6, 'A load or join failure')", async () => {
    let retries = 0;
    let backs = 0;
    const props = {
      missionId: PROLOGUE_SORROWGATE_HEADER.id,
      skipped: false,
      settled: true,
      loadFailed: true,
      onSkip: () => {},
      onCancel: () => void (backs += 1),
      onRetry: () => void (retries += 1),
    };
    const view = await render(createElement(TravelScreen, props));
    try {
      assert.ok(view.shows('The match did not load'), 'what failed, in the live line');
      assert.ok(view.shows(PROLOGUE_SORROWGATE_HEADER.name), 'still where it was going');
      assert.deepEqual(view.buttonNames(), ['Retry', 'Back'], 'Skip and Cancel give way');
      // react-test-renderer applies no autoFocus, so the request is what is read.
      assert.equal(view.button('Retry').props.autoFocus, true, 'Retry takes the focus');
      await click(view, 'Retry');
      assert.equal(retries, 1);
      await click(view, 'Back');
      assert.equal(backs, 1, "Back is Cancel's road: nothing was joined");
      await view.act(() => {
        dispatchWindow('keydown', { key: 'Escape', preventDefault: () => {} });
      });
      assert.equal(backs, 2, 'and Esc presses it');
    } finally {
      await view.unmount();
    }
  });
});

describe("the match screen's failure (§7.6, 'A load or join failure')", () => {
  it('says what failed in place of a blank page, and offers Retry and Back', async () => {
    let retries = 0;
    let backs = 0;
    const Broken = () => {
      throw new Error('Failed to fetch dynamically imported module');
    };
    // React logs a caught render error; the test wants the boundary, not the noise.
    const quiet = console.error;
    console.error = () => {};
    try {
      const view = await render(
        createElement(
          MatchBoundary,
          { onRetry: () => void (retries += 1), onBack: () => void (backs += 1) },
          createElement(Broken)
        )
      );
      try {
        assert.ok(view.shows('The match stopped'));
        assert.ok(view.shows('Failed to fetch dynamically imported module'), 'and why');
        assert.deepEqual(view.buttonNames(), ['Retry', 'Back']);
        // react-test-renderer applies no autoFocus, so the request is what is read.
        assert.equal(view.button('Retry').props.autoFocus, true, 'Retry takes the focus');
        await click(view, 'Retry');
        await click(view, 'Back');
        assert.deepEqual([retries, backs], [1, 1]);
      } finally {
        await view.unmount();
      }
    } finally {
      console.error = quiet;
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
