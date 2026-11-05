/**
 * The free-water study's vertical command instruments (#1753):
 * docs/free-water-slice.md §9, "Vertical command", and docs/free-camera.md
 * §4, "Looking up in the study". The pure half holds the arithmetic to the
 * section's promises; the booted half boots the real chart and conn on the
 * study and reads what they draw.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { Graphics } from 'pixi.js';
import { DEPTH, Faction, ResolutionTier } from '@echoes/shared';
import {
  createHost,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
  textContents,
} from './support/headless.ts';
import { cannedMap, cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';
import { EchoRenderer, type RendererCallbacks } from '../src/game/EchoRenderer.ts';
import { BLOCK_GAP, BLOCK_W, consoleBlocks } from '../src/game/consoleLayout.ts';
import type { MovePreviewReading } from '../src/game/movePreview.ts';
import { FACTION_PALETTE } from '../src/game/palette.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import type { WorldLook } from '../src/game/tutorialLook.ts';
import {
  commandPlaneM,
  edgeMark,
  edgeMarkText,
  sectionAlongM,
  sectionDepthAt,
  sectionProfile,
  sectionX,
  sectionY,
  stalkSide,
  waterIntervalAt,
  type SectionFrame,
} from '../src/game/verticalCommand.ts';

describe('the command plane and its stalks', () => {
  it('is the lead hull, then a raised focus, and nothing on the seabed', () => {
    assert.equal(commandPlaneM(300, 900), 300);
    assert.equal(commandPlaneM(undefined, 900), 900);
    assert.equal(commandPlaneM(undefined, null), null);
  });

  it('reads a depth as above, below or on the plane within the arrival epsilon', () => {
    assert.equal(stalkSide(250, 300), 'above');
    assert.equal(stalkSide(350, 300), 'below');
    assert.equal(stalkSide(300 + DEPTH.ARRIVAL_EPSILON_M, 300), null);
    assert.equal(stalkSide(300 - DEPTH.ARRIVAL_EPSILON_M, 300), null);
  });
});

describe('edge marks', () => {
  const rect = { x: 0, y: 50, w: 1000, h: 500 };

  it('marks nothing inside the inset frame', () => {
    assert.equal(edgeMark(rect, 16, 500, 300), null);
    assert.equal(edgeMark(rect, 16, 16, 66), null);
    assert.equal(edgeMark(rect, 16, 984, 534), null);
  });

  it('lands on the inset edge along the ray from the centre, pointing out', () => {
    const right = edgeMark(rect, 16, 1500, 300)!;
    assert.deepEqual([right.x, right.y], [984, 300]);
    assert.equal(right.angle, 0);
    const up = edgeMark(rect, 16, 500, -200)!;
    assert.deepEqual([up.x, up.y], [500, 66]);
    assert.equal(up.angle, -Math.PI / 2);
    // Off a corner: the ray leaves by the edge it reaches first.
    const corner = edgeMark(rect, 16, 1500, 1300)!;
    assert.ok(Math.abs(corner.y - 534) < 1e-9);
    assert.ok(corner.x < 984);
  });

  it('says what each tier earned, and infers no depth for a Tier 2 contact', () => {
    assert.deepEqual(edgeMarkText(ResolutionTier.Contact, undefined, 300), {
      mark: false,
      text: '',
    });
    // A depth the server never sends at Tier 2 is still not read there.
    assert.deepEqual(edgeMarkText(ResolutionTier.Bearing, 1500, 300), { mark: true, text: '' });
    assert.deepEqual(edgeMarkText(ResolutionTier.Classification, 1240, null), {
      mark: true,
      text: '1,240 m',
    });
    assert.deepEqual(edgeMarkText(ResolutionTier.Classification, 180, 300), {
      mark: true,
      text: 'ABOVE 120 m',
    });
    assert.deepEqual(edgeMarkText(ResolutionTier.Track, 2500, 300), {
      mark: true,
      text: 'BELOW 2,200 m',
    });
    assert.deepEqual(edgeMarkText(ResolutionTier.Track, 301, 300), { mark: true, text: 'LEVEL' });
  });
});

describe('the section scope', () => {
  const terrain = cannedTerrain();
  const size = 150;
  /** Looking north through the middle of the map, the plan scope's span wide. */
  const north: SectionFrame = { focusX: 2000, focusY: 2000, headingRad: 0, spanM: 4000, size };

  it('runs forward to the right and ends at the span', () => {
    // Yaw 0 looks north, toward smaller y.
    assert.ok(sectionAlongM(north, 2000, 1000) > 0);
    assert.ok(sectionAlongM(north, 2000, 3000) < 0);
    assert.ok(
      Math.abs(sectionAlongM(north, 3000, 2000)) < 1e-9,
      'across the slice is not along it'
    );
    assert.equal(sectionX(north, 0), size / 2);
    assert.equal(sectionX(north, 1000), size * 0.75);
    assert.equal(sectionX(north, 2001), null);
    // Turned a quarter east: forward is +x.
    const east: SectionFrame = { ...north, headingRad: -Math.PI / 2 };
    assert.ok(Math.abs(sectionAlongM(east, 3000, 2000) - 1000) < 1e-9);
  });

  it('maps the column top to bottom, and picks a whole depth back', () => {
    assert.equal(sectionY(size, 0), 0);
    assert.equal(sectionY(size, DEPTH.MAX_M), size);
    assert.equal(sectionY(size, 1500), size / 2);
    assert.equal(sectionDepthAt(size, size / 2), 1500);
    assert.equal(sectionDepthAt(size, -10), 0);
    assert.equal(sectionDepthAt(size, size * 2), DEPTH.MAX_M);
  });

  it('traces the public floor and roof along the heading, and nothing off the map', () => {
    // Through the roofed passage at cells (12..13, 5..6): x = 3125 m, looking
    // north from y = 3000 with the whole map's span, so the slice leaves the
    // map 1,000 m south of the focus and runs to the north rim.
    const frame: SectionFrame = { focusX: 3125, focusY: 3000, headingRad: 0, spanM: 4000, size };
    const profile = sectionProfile(terrain, frame);
    assert.equal(profile.length, size);
    // The left quarter is south of the map: nothing is drawn there.
    assert.equal(profile[0], null);
    assert.equal(profile[Math.floor(size * 0.24)], null);
    assert.notEqual(profile[Math.floor(size * 0.26)], null);
    // The passage's roof lies 1,600 m down, its floor 2,600 m: the column at
    // y = 1375 m, which is 1,625 m ahead, 0.906 of the way across.
    const roofed = profile[Math.floor(size * (0.5 + 1625 / 4000))]!;
    assert.deepEqual(roofed, { floorM: 2600, ceilingM: 1600, rock: false });
    // Open water beside it carries the authored floor and no roof.
    const open = profile[Math.floor(size * 0.5)]!;
    assert.equal(open.ceilingM, 0);
    assert.equal(open.rock, false);
    assert.equal(open.floorM, terrain.floor[Math.floor(3000 / 250) * terrain.cols + 12]);
  });

  it('gives a Tier 2 tick the public water interval, or none in rock', () => {
    assert.deepEqual(waterIntervalAt(terrain, 3125, 1375), { ceilingM: 1600, floorM: 2600 });
    assert.equal(waterIntervalAt(terrain, -1, 0), null);
    const rock = cannedTerrain();
    rock.ceiling[0] = 3000;
    rock.floor[0] = 200;
    assert.equal(waterIntervalAt(rock, 10, 10), null);
  });

  it('takes a block beside the plan scope in the study, and none elsewhere', () => {
    const plain = consoleBlocks(1440, 900);
    assert.equal(plain.section, undefined);
    const study = consoleBlocks(1440, 900, true);
    assert.deepEqual(study.section, { x: plain.scope.x + BLOCK_W.scope + BLOCK_GAP, w: 170 });
    assert.equal(study.selection!.x, study.section!.x + BLOCK_W.section + BLOCK_GAP);
    // A second instrument that never goes costs the blocks that do: at 1440
    // px the fleet block is the first to yield, and the commands follow the
    // selection card directly.
    assert.notEqual(plain.fleet, undefined);
    assert.equal(study.fleet, undefined);
    assert.equal(study.commands.x, study.selection!.x + BLOCK_W.selection + BLOCK_GAP);
  });
});

const views: PerspectiveView[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
});

/** Boot the chart and the conn, on the study or on a shipped look. */
async function boot(options: { study: boolean; look?: WorldLook }) {
  const gl = new HeadlessWebGLRenderer();
  const app = new HeadlessApplication();
  const conn = new PerspectiveView(options.look ?? (options.study ? 'free-water' : 'standard'));
  views.push(conn);
  conn.mount(
    createHost(1280, 720) as unknown as HTMLElement,
    () => gl.asRenderer(),
    gl.environment
  );
  conn.setActive(true);
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const callbacks = new Proxy({} as RendererCallbacks, {
    get:
      (_target, property) =>
      (...args: unknown[]) => {
        calls.push({ name: String(property), args });
      },
  });
  const chart = new EchoRenderer(callbacks, app.asApplication(), options.study, options.study);
  await chart.init(createHost(1280, 720) as unknown as HTMLElement);
  chart.setConn(conn);
  const terrain = cannedTerrain();
  chart.setTerrain(terrain);
  conn.setTerrain(terrain);
  chart.setMap(cannedMap());
  chart.setIdentity(0, Faction.Bathyarch);
  conn.setIdentity(0, Faction.Bathyarch);
  const snapshot = cannedSnapshot();
  chart.applySnapshot(snapshot);
  conn.applySnapshot(snapshot);
  const frame = (): void => {
    pumpAnimationFrames();
    app.frame();
  };
  const privates = chart as unknown as {
    ringLayer: Graphics;
    contactLayer: Graphics;
    sectionG: Graphics;
    selected: Set<number>;
    selectionSeq: number;
    sectionRect(): { x: number; y: number; size: number } | null;
  };
  const reading = () =>
    calls.filter((call) => call.name === 'onDestination').at(-1)?.args[0] as
      MovePreviewReading | null | undefined;
  return { chart, conn, app, frame, privates, reading, teardown: () => chart.destroy() };
}

/** Strokes on a layer in one ink: the stalks are the only hairlines at their alpha. */
function strokesInk(g: Graphics, color: number, alpha: number): number {
  let count = 0;
  for (const instruction of g.context.instructions) {
    if (instruction.action !== 'stroke') continue;
    const style = (instruction.data as { style?: { color?: number; alpha?: number } }).style;
    if (
      style?.color === color &&
      style.alpha !== undefined &&
      Math.abs(style.alpha - alpha) < 1e-9
    ) {
      count++;
    }
  }
  return count;
}

describe('the instruments on the study', () => {
  it('draws a stalk per own hull to the plane, and none without one', async () => {
    const world = await boot({ study: true });
    try {
      const accent = FACTION_PALETTE[Faction.Bathyarch].accent;
      // Home: the focus on the seabed, nothing selected, so no plane.
      world.conn.setFrame({ xM: 1000, yM: 1000, distanceM: 2600, yawDeg: 0, pitchDeg: 55 });
      world.frame();
      assert.equal(strokesInk(world.privates.ringLayer, accent, 0.55), 0);
      // A raised focus is the plane with nothing selected: each of the four
      // hulls gets a foot ring and, off the plane, a line.
      world.conn.aimFrame({ xM: 1000, yM: 1000, distanceM: 2600, yawDeg: 0, pitchDeg: 55 }, 1200);
      world.frame();
      const raised = strokesInk(world.privates.ringLayer, accent, 0.55);
      // The Corvette at 1,200 m stands on the plane: a foot ring alone. The
      // other three are off it: a line and a ring each.
      assert.equal(raised, 1 + 3 * 2);
      // The lead selected hull's depth takes over: the Scout at 900 m.
      world.privates.selected.add(12);
      world.privates.selectionSeq++;
      world.frame();
      assert.equal(strokesInk(world.privates.ringLayer, accent, 0.55), 1 + 3 * 2);
      assert.equal(world.chart.probeReading !== undefined, true);
    } finally {
      world.teardown();
    }
  });

  it('draws no stalk on a shipped map', async () => {
    const world = await boot({ study: false });
    try {
      world.conn.aimFrame({ xM: 1000, yM: 1000, distanceM: 2600, yawDeg: 0, pitchDeg: 55 }, 1200);
      world.frame();
      const accent = FACTION_PALETTE[Faction.Bathyarch].accent;
      assert.equal(strokesInk(world.privates.ringLayer, accent, 0.55), 0);
      assert.equal(world.privates.sectionRect(), null);
      assert.ok(!textContents(world.app.stage).includes('SECTION'));
    } finally {
      world.teardown();
    }
  });

  it('marks an earned contact off the frame with its reading, and nothing behind the eye', async () => {
    const world = await boot({ study: true });
    try {
      const labels = () =>
        textContents(world.app.stage).filter((t) => /^(ABOVE|BELOW|LEVEL|[\d,]+ m)/.test(t));
      // Low over the south-west corner looking south, the eye 591 m north of
      // the focus: every contact lies north of the eye, behind it, and nothing
      // is mirrored onto the frame. A low pitch is what makes "behind" mean
      // anything: a steep gaze has the whole deep in front of it.
      world.conn.setFrame({ xM: 600, yM: 3900, distanceM: 600, yawDeg: 180, pitchDeg: 10 });
      world.frame();
      assert.deepEqual(labels(), []);
      // Turned to look north from the same place: the contacts are ahead and
      // off the frame. With no plane each Tier 3+ contact gives the depth it
      // carries; the Tier 2 contact marks its bearing only, and the Tier 1
      // contact nothing.
      world.conn.setFrame({ xM: 600, yM: 3900, distanceM: 600, yawDeg: 0, pitchDeg: 10 });
      world.frame();
      const bare = labels();
      assert.ok(bare.includes('2,000 m'), `the cruiser's depth: ${bare}`);
      assert.ok(bare.includes('1,100 m'), `the turret's depth: ${bare}`);
      assert.ok(!bare.includes('1,500 m'), 'the Tier 2 contact gives no depth');
      // A raised focus is the plane: the same contacts read against it.
      world.conn.aimFrame({ xM: 600, yM: 3900, distanceM: 600, yawDeg: 0, pitchDeg: 10 }, 1500);
      world.frame();
      const read = labels();
      assert.ok(read.includes('BELOW 500 m'), `the cruiser against a 1,500 m plane: ${read}`);
      assert.ok(read.includes('ABOVE 400 m'), `the turret at 1,100 m: ${read}`);
    } finally {
      world.teardown();
    }
  });

  it('draws the section beside the scope and picks a pinned destination depth from it', async () => {
    const world = await boot({ study: true });
    try {
      world.frame();
      assert.ok(textContents(world.app.stage).includes('SECTION'));
      const rect = world.privates.sectionRect()!;
      assert.notEqual(rect, null);
      // The Tier 2 contact is on the map, so the section says a depth is
      // unknown; its tick is drawn, and no dot at a depth it did not earn.
      assert.ok(textContents(world.app.stage).includes('DEPTH UNKNOWN'));
      // Arm MOVE 3D on the Scout, and press the section before pinning.
      world.privates.selected.add(12);
      world.privates.selectionSeq++;
      world.chart.armDestination();
      const press = (y: number) => ({
        button: 0,
        buttons: 1,
        pointerId: 1,
        pointerType: 'mouse',
        clientX: rect.x + rect.size / 2,
        clientY: y,
      });
      world.app.canvas.dispatch('pointerdown', press(rect.y + rect.size / 2));
      world.app.canvas.dispatch('pointerup', { ...press(rect.y + rect.size / 2), buttons: 0 });
      assert.equal(world.reading()!.pinned, false, 'unpinned, the press picks nothing');
      assert.equal(world.reading()!.depthM, 900);
      world.chart.pinDestination(true);
      // Pinned, a press half way down the section is 1,500 m; a scrub to the
      // foot is the column's floor.
      world.app.canvas.dispatch('pointerdown', press(rect.y + rect.size / 2));
      assert.equal(world.reading()!.depthM, 1500);
      world.app.canvas.dispatch('pointermove', press(rect.y + rect.size));
      assert.equal(world.reading()!.depthM, DEPTH.MAX_M);
      world.app.canvas.dispatch('pointerup', { ...press(rect.y + rect.size), buttons: 0 });
      assert.equal(world.reading()!.pinned, true, 'the press moved no plan position');
    } finally {
      world.teardown();
    }
  });

  it('lets the study look up to −60° and holds a shipped map at 10°', async () => {
    const study = await boot({ study: true });
    const shipped = await boot({ study: false });
    try {
      for (const world of [study, shipped]) {
        world.conn.setFrame({ xM: 2000, yM: 2000, distanceM: 600, yawDeg: 0, pitchDeg: 55 });
        world.conn.orbitBy(0, -100000);
        world.frame();
      }
      assert.ok(Math.abs(study.conn.frame.pitchDeg + 60) < 1e-9, `${study.conn.frame.pitchDeg}`);
      assert.ok(Math.abs(shipped.conn.frame.pitchDeg - 10) < 1e-9);
      // The eye stays its clearance above the floor rather than the dolly
      // shortening, so below level the eye is above the focus's own depth
      // only by what the floor under it allows.
      const eye = study.conn.eyePosition;
      const floor = study.conn.seabedDepthAt(eye.x, eye.y);
      assert.ok(eye.depthM <= floor, `the eye is in the water: ${eye.depthM} over ${floor}`);
      // Home still restores 55°, and a frame set below the shipped floor is
      // held to it there and taken in the study.
      study.conn.home();
      assert.equal(study.conn.frame.pitchDeg, 55);
      shipped.conn.setFrame({ xM: 2000, yM: 2000, distanceM: 600, yawDeg: 0, pitchDeg: -30 });
      assert.ok(Math.abs(shipped.conn.frame.pitchDeg - 10) < 1e-9);
      study.conn.setFrame({ xM: 2000, yM: 2000, distanceM: 600, yawDeg: 0, pitchDeg: -30 });
      assert.ok(Math.abs(study.conn.frame.pitchDeg + 30) < 1e-9);
    } finally {
      study.teardown();
      shipped.teardown();
    }
  });
});
