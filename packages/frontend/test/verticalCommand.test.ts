/**
 * The free-water study's vertical command instruments (#1753):
 * docs/free-water-slice.md §9, "Vertical command", and docs/free-camera.md
 * §4, "Looking up in the study". The pure half holds the arithmetic to the
 * section's promises; the booted half boots the real chart and conn on the
 * study and reads what they draw, the study's want of altitude lines (#1772)
 * among it.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { Graphics, GraphicsPath } from 'pixi.js';
import { InstancedMesh, LineSegments, Matrix4, type Object3D } from 'three';
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
import type { DepthCues } from '../src/game/depthCues.ts';
import type { MovePreviewReading } from '../src/game/movePreview.ts';
import { FACTION_PALETTE } from '../src/game/palette.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { RIBBON_UNITS } from '../src/game/uiScale.ts';
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
  waterIntervalAt,
  type SectionFrame,
} from '../src/game/verticalCommand.ts';

describe('the command plane', () => {
  it('is the lead hull, then a raised focus, and nothing on the seabed', () => {
    assert.equal(commandPlaneM(300, 900), 300);
    assert.equal(commandPlaneM(undefined, 900), 900);
    assert.equal(commandPlaneM(undefined, null), null);
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

/**
 * Boot the chart and the conn, on the study or on a shipped look. `relook`
 * moves the conn to another look before its session, as a persistent view
 * moves between missions (`setLook`).
 */
async function boot(options: { study: boolean; look?: WorldLook; relook?: WorldLook }) {
  const gl = new HeadlessWebGLRenderer();
  const app = new HeadlessApplication();
  const conn = new PerspectiveView(options.look ?? (options.study ? 'free-water' : 'standard'));
  views.push(conn);
  if (options.relook !== undefined) {
    assert.ok(conn.setLook(options.relook), 'the premise: relooked');
  }
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
    edgeMarkG: Graphics;
    sectionG: Graphics;
    selected: Set<number>;
    selectionSeq: number;
    sectionRect(): { x: number; y: number; size: number } | null;
  };
  const reading = () =>
    calls.filter((call) => call.name === 'onDestination').at(-1)?.args[0] as
      MovePreviewReading | null | undefined;
  return { chart, conn, gl, app, frame, privates, reading, teardown: () => chart.destroy() };
}

/** A foot ring's centre, and the segments its stroke holds besides the circle. */
interface FootRing {
  x: number;
  y: number;
  lines: number;
}

/**
 * The foot rings on a layer, read off its stroke instructions: each is a
 * stroke holding a circle of `FOOT_RING_PX`. `lines` counts the segments
 * such a stroke also holds, which is where #1753's stalk drew its line to the
 * hull, one segment solid and several dashed; #1772 draws none. Segments
 * rather than `moveTo`s, since a run another painter left open on the layer
 * leaves a stray `moveTo` in the next stroke. Own rings are told by their
 * ink; a contact's ink varies, so `color` is optional and the radius is what
 * names a ring.
 */
function footRings(g: Graphics, color?: number): FootRing[] {
  const out: FootRing[] = [];
  for (const instruction of g.context.instructions) {
    if (instruction.action !== 'stroke') continue;
    const data = instruction.data as { style?: { color?: number }; path?: GraphicsPath };
    if (color !== undefined && data.style?.color !== color) continue;
    const steps = (data.path?.instructions ?? []) as Array<{ action: string; data: number[] }>;
    const circle = steps.find((step) => step.action === 'circle' && step.data[2] === FOOT_RING_PX);
    if (circle === undefined) continue;
    const lines = steps.filter((step) => step.action === 'lineTo').length;
    out.push({ x: circle.data[0]!, y: circle.data[1]!, lines });
  }
  return out;
}

/** How many rings a layer holds, and how many segments their strokes hold besides. */
function tally(rings: FootRing[]): { rings: number; lines: number } {
  return { rings: rings.length, lines: rings.reduce((sum, ring) => sum + ring.lines, 0) };
}

/**
 * Whether every plan position has a ring where the plane at `planeM` lies
 * under or over it, to a hundredth of a pixel, through the conn's own
 * projection: a ring on the plane, not at the hull and not on the ground.
 */
function ringsOnPlane(
  conn: PerspectiveView,
  rings: FootRing[],
  points: Array<{ x: number; y: number }>,
  planeM: number
): boolean {
  return points.every((point) => {
    const at = conn.projectPoint(point.x, point.y, planeM);
    return rings.some((ring) => Math.hypot(ring.x - at.x, ring.y - at.y) < 0.01);
  });
}

/**
 * The depth cues the conn's last frame drew (depthCues.ts), read off the
 * renderer's own walk of the visible scene, the walk that counts its calls:
 * the plumbs it reached that have any length, and the shadows any radius.
 */
function drawnCues(world: { conn: PerspectiveView; gl: HeadlessWebGLRenderer }): {
  plumbs: number;
  shadows: number;
} {
  const cues = (world.conn as unknown as { cues: DepthCues }).cues;
  const drawn = new Set<Object3D>();
  world.gl.lastScene!.traverseVisible((object) => drawn.add(object));
  const out = { plumbs: 0, shadows: 0 };
  const matrix = new Matrix4();
  for (const object of cues.group.children) {
    if (!drawn.has(object)) continue;
    if (object instanceof LineSegments) {
      const position = object.geometry.getAttribute('position');
      const end = object.geometry.drawRange.count;
      for (let i = 0; i + 1 < end; i += 2) {
        if (position.getY(i) !== position.getY(i + 1)) out.plumbs++;
      }
    } else if (object instanceof InstancedMesh) {
      for (let i = 0; i < object.count; i++) {
        object.getMatrixAt(i, matrix);
        if (matrix.elements[0] !== 0) out.shadows++;
      }
    }
  }
  return out;
}

/** The first point of each stroke on a layer, for where an edge mark stands. */
function strokeStarts(g: Graphics): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (const instruction of g.context.instructions) {
    if (instruction.action !== 'stroke') continue;
    const steps = ((instruction.data as { path?: GraphicsPath }).path?.instructions ??
      []) as Array<{
      action: string;
      data: number[];
    }>;
    const first = steps.find((step) => step.action === 'moveTo');
    if (first !== undefined) out.push({ x: first.data[0]!, y: first.data[1]! });
  }
  return out;
}

/** `FOOT_RING_PX` in EchoRenderer.ts: the radius names a foot ring. */
const FOOT_RING_PX = 3;

describe('the instruments on the study', () => {
  it('marks the plane under or over each own hull and Tier 3+ contact with a foot ring and no line', async () => {
    const world = await boot({ study: true });
    try {
      const accent = FACTION_PALETTE[Faction.Bathyarch].accent;
      const snapshot = cannedSnapshot();
      const hulls = snapshot.units;
      const scout = hulls.find((unit) => unit.id === 12)!;
      const corvette = hulls.find((unit) => unit.id === 11)!;
      // Five contacts earned a depth at Tier 3 or 4 (103 to 107), at 2,000 /
      // 2,400 / 1,100 / 2,600 / 1,100 m. The Tier 2 contact's payload carries
      // a depth the type says is never sent, and it still gets no ring; the
      // Tier 1 contact has nothing.
      const earned = snapshot.contacts.filter((contact) => contact.id >= 103 && contact.id <= 107);
      // Home: the focus on the seabed, nothing selected, so no plane and no
      // ring anywhere, own or contact.
      world.conn.setFrame({ xM: 1000, yM: 1000, distanceM: 2600, yawDeg: 0, pitchDeg: 55 });
      world.frame();
      assert.deepEqual(tally(footRings(world.privates.ringLayer, accent)), { rings: 0, lines: 0 });
      assert.deepEqual(tally(footRings(world.privates.contactLayer)), { rings: 0, lines: 0 });
      // A raised focus is the plane with nothing selected. Own hulls stand at
      // 1,200, 900, 1,400 and 3,100 m: at a 1,200 m plane the Corvette is on
      // it, the Scout above it and the other two below it. Each wears its
      // ring where the plane lies under or over it, with no line to it.
      world.conn.aimFrame({ xM: 1000, yM: 1000, distanceM: 2600, yawDeg: 0, pitchDeg: 55 }, 1200);
      world.frame();
      const own = footRings(world.privates.ringLayer, accent);
      assert.deepEqual(tally(own), { rings: 4, lines: 0 });
      assert.ok(ringsOnPlane(world.conn, own, hulls, 1200), 'every own ring on the 1,200 m plane');
      // The premise that a ring's place can tell: off the plane, a hull and
      // its ring stand apart on the screen.
      const scoutHull = world.conn.projectPoint(scout.x, scout.y, scout.depth);
      const scoutRing = world.conn.projectPoint(scout.x, scout.y, 1200);
      assert.ok(Math.hypot(scoutHull.x - scoutRing.x, scoutHull.y - scoutRing.y) > 1);
      const theirs = footRings(world.privates.contactLayer);
      assert.deepEqual(tally(theirs), { rings: 5, lines: 0 });
      assert.ok(ringsOnPlane(world.conn, theirs, earned, 1200), 'every contact ring on the plane');
      // The lead selected hull's depth takes over: the Scout at 900 m, which
      // then wears its ring at its own drawn point, while every other ring
      // moves to the 900 m plane.
      world.privates.selected.add(12);
      world.privates.selectionSeq++;
      world.frame();
      const ownLed = footRings(world.privates.ringLayer, accent);
      assert.deepEqual(tally(ownLed), { rings: 4, lines: 0 });
      assert.ok(
        ringsOnPlane(world.conn, ownLed, hulls, 900),
        "every own ring on the Scout's plane"
      );
      assert.ok(
        !ringsOnPlane(world.conn, ownLed, [corvette], 1200),
        "the Corvette's ring left the 1,200 m plane"
      );
      const theirsLed = footRings(world.privates.contactLayer);
      assert.deepEqual(tally(theirsLed), { rings: 5, lines: 0 });
      assert.ok(ringsOnPlane(world.conn, theirsLed, earned, 900), 'every contact ring follows');
    } finally {
      world.teardown();
    }
  });

  it('draws no foot ring on a shipped map', async () => {
    const world = await boot({ study: false });
    try {
      world.conn.aimFrame({ xM: 1000, yM: 1000, distanceM: 2600, yawDeg: 0, pitchDeg: 55 }, 1200);
      world.frame();
      const accent = FACTION_PALETTE[Faction.Bathyarch].accent;
      assert.deepEqual(tally(footRings(world.privates.ringLayer, accent)), { rings: 0, lines: 0 });
      assert.deepEqual(tally(footRings(world.privates.contactLayer)), { rings: 0, lines: 0 });
      assert.equal(world.privates.sectionRect(), null);
      assert.ok(!textContents(world.app.stage).includes('SECTION'));
    } finally {
      world.teardown();
    }
  });

  it('hangs no entity on a plumb in the study, over the shadows a shipped map also draws', async () => {
    const study = await boot({ study: true });
    const shipped = await boot({ study: false });
    // A persistent view moved between missions before its session takes the
    // new look's rule, both ways.
    const toStudy = await boot({ study: true, look: 'standard', relook: 'free-water' });
    const toShipped = await boot({ study: false, look: 'free-water', relook: 'standard' });
    const worlds = [study, shipped, toStudy, toShipped];
    try {
      for (const world of worlds) {
        world.conn.aimFrame({ xM: 1000, yM: 1000, distanceM: 2600, yawDeg: 0, pitchDeg: 55 }, 1200);
        world.frame();
      }
      // Every own hull, structure and shot holds a slot, and so does a live
      // Tier 4 track drawn as its model. On a shipped look each hangs on its
      // plumb; on the study's none does.
      const slots = (world: { conn: PerspectiveView }): number =>
        (world.conn as unknown as { cues: DepthCues }).cues.count;
      for (const world of worlds) assert.ok(slots(world) > 0, 'the premise: entities hold slots');
      for (const world of [shipped, toShipped]) {
        assert.equal(drawnCues(world).plumbs, slots(world));
      }
      for (const world of [study, toStudy]) assert.equal(drawnCues(world).plumbs, 0);
      // The shadows stay, the same ones on either look. Headless, a hull's
      // shadow takes its size from a model or a sprite and has none, so the
      // shots' shadows are the ones with a radius.
      const shadows = drawnCues(shipped).shadows;
      assert.ok(shadows > 0, 'the premise: a shadow with a radius');
      for (const world of [study, toStudy, toShipped]) {
        assert.equal(drawnCues(world).shadows, shadows);
      }
    } finally {
      for (const world of worlds) world.teardown();
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
      // Every mark stands inside the world view's frame, and once a selection
      // draws the depth ribbon down the left edge, right of it (§8): a mark
      // under the ribbon is a mark nobody sees. Looking south from the north
      // rim at x = 3,000 on the shortest dolly, the eye 146 m north of the
      // rim: the turret at (3,600, 600) is 39° off to the left (east) and the
      // torpedo at (2,000, 1,200) 37° off to the right, past the frame's 33°
      // half-width, while the cruiser at x = 3,000 is dead ahead.
      world.conn.setFrame({ xM: 3000, yM: 100, distanceM: 250, yawDeg: 180, pitchDeg: 10 });
      world.frame();
      const unribboned = strokeStarts(world.privates.edgeMarkG);
      assert.ok(
        unribboned.some((p) => p.x < RIBBON_UNITS),
        `a mark on the left edge: ${unribboned.length}`
      );
      world.privates.selected.add(12);
      world.privates.selectionSeq++;
      world.frame();
      const ribboned = strokeStarts(world.privates.edgeMarkG);
      assert.ok(ribboned.length > 0);
      assert.ok(
        ribboned.every((p) => p.x >= RIBBON_UNITS),
        `no mark under the ribbon: ${ribboned.map((p) => Math.round(p.x))}`
      );
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
      // unknown: its tick is the one stroke at the tick's alpha, and the
      // depth its payload carries draws nothing.
      assert.ok(textContents(world.app.stage).includes('DEPTH UNKNOWN'));
      const ticks = world.privates.sectionG.context.instructions.filter(
        (instruction) =>
          instruction.action === 'stroke' &&
          (instruction.data as { style?: { alpha?: number } }).style?.alpha === 0.35
      );
      assert.equal(ticks.length, 1);
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
