/**
 * Loudness, drawn on the hull — docs/ui-ux.md §3.5 (#731).
 *
 * §3's meter is a fleet instrument: it reports a peak, and a max cannot say
 * which hull it is reading. These are the two marks that can — the collar, per
 * hull and always, and the detection ring, promoted off selection onto §3's
 * amber stop so a player can see their own reach without first clicking the
 * hull that has it.
 *
 * Asserted on counted draw instructions rather than on pixels, for the reason
 * rendererSmoke.test.ts gives at length: an instruction is a property of the
 * algorithm and is the same on every runner.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Container, Graphics, type GraphicsPath } from 'pixi.js';
import { Faction, SIG_BANDS } from '@echoes/shared';
import {
  createHost,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
} from './support/headless.ts';
import { cannedMap, cannedNodes, cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';
import {
  collarRadius,
  crackleAmplitude,
  EchoRenderer,
  SELECTION_GAP_M,
  type RendererCallbacks,
} from '../src/game/EchoRenderer.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { UI } from '../src/game/palette.ts';

/** §3's three stops, which are what marks a stroke as being about loudness. */
const SIG_RAMP = new Set<number>([UI.sigLow, UI.sigMid, UI.sigHigh]);

interface Stroke {
  color: number;
  alpha: number;
  /** Path steps under this stroke, in the order they were queued. */
  steps: Array<{ action: string; data: unknown }>;
}

/**
 * Every stroke on the stage inked in the SIG ramp.
 *
 * The ramp is the filter because nothing else in the conn chart's ink uses it:
 * the ping preview is `UI.friendly` and `UI.threat`, a route is `UI.accent`, a
 * health bar is `UI.friendly`. `UI.threat` is `0xff3b30` and `UI.sigHigh` is
 * `0xe0452f` — near neighbours to the eye and different numbers here, which is
 * what keeps a red ring out of this set.
 */
function sigStrokes(app: HeadlessApplication): Stroke[] {
  const found: Stroke[] = [];
  const walk = (node: Container): void => {
    for (const child of node.children) {
      if (child instanceof Graphics) {
        for (const instruction of child.context.instructions) {
          if (instruction.action !== 'stroke') continue;
          const data = instruction.data as {
            style?: { color?: number; alpha?: number };
            path?: GraphicsPath;
          };
          const color = data.style?.color;
          if (color === undefined || !SIG_RAMP.has(color)) continue;
          found.push({
            color,
            alpha: data.style?.alpha ?? 1,
            steps: (data.path?.instructions ?? []) as Stroke['steps'],
          });
        }
      }
      walk(child as Container);
    }
  };
  walk(app.stage as unknown as Container);
  return found;
}

/**
 * The collar's sweep, recovered from what is actually drawn.
 *
 * Not an `arc` any more: the sweep is traced as a polyline so it can crackle
 * (docs/style-neon-noir.md, "Motion and FX timing"), and the glow recipe draws
 * that polyline three times — two halos under a core. The **core** is the one
 * taken, identified by full alpha: a halo is 0.13 or 0.44 and a detection ring
 * is 0.35 or 0.18, so nothing else on the stage is SIG-inked and opaque.
 *
 * The first and last vertices are pinned to the true radius by the renderer,
 * which is what makes this recoverable at all — and is itself the property
 * worth holding, since the sweep's end *is* the reading.
 */
function collars(app: HeadlessApplication): Array<{ radius: number; start: number; end: number }> {
  const out: Array<{ radius: number; start: number; end: number }> = [];
  for (const stroke of sigStrokes(app)) {
    if (stroke.alpha !== 1) continue;
    const points: Array<[number, number]> = [];
    for (const step of stroke.steps) {
      if (step.action !== 'moveTo' && step.action !== 'lineTo') continue;
      const [x, y] = step.data as number[];
      points.push([x!, y!]);
    }
    if (points.length < 2) continue;
    const first = points[0]!;
    const last = points[points.length - 1]!;
    // Unwrapped forward from 12 o'clock, because a sweep past 3 o'clock wraps
    // through atan2's cut and would otherwise read as a negative arc.
    const start = Math.atan2(first[1], first[0]);
    let end = Math.atan2(last[1], last[0]);
    while (end < start - 1e-9) end += Math.PI * 2;
    out.push({ radius: Math.hypot(first[0], first[1]), start, end });
  }
  return out;
}

/**
 * `EchoRenderer`'s two ring alphas, restated so a change to either fails here.
 *
 * Needed as a filter and not only as an assertion, because the SIG ramp is not
 * on its own enough to name a stroke: `UI.sigMid` is `0xf2b233` and so is the
 * Bathyarch primary, and so is a nodule field's ring — which `drawNodes` also
 * traces as a projected circle, two vertices short of identical. The pair
 * (ramp ink, one of these two alphas) is what no other stroke on the stage has.
 */
const RING_ALPHA = { SELECTED: 0.35, GATED: 0.18 } as const;

/**
 * A detection ring: a SIG-inked stroke at one of the two ring alphas.
 *
 * Alpha is the whole of the filter since the collar's sweep became a polyline
 * too — a ring and a collar halo are the same shape of path now, and only the
 * ink tells them apart. The four collar alphas (track 0.16, halos 0.13 and
 * 0.44, core 1) are deliberately clear of both ring alphas.
 */
function reachRings(app: HeadlessApplication): Stroke[] {
  const alphas: number[] = [RING_ALPHA.SELECTED, RING_ALPHA.GATED];
  return sigStrokes(app).filter((stroke) => alphas.includes(stroke.alpha));
}

async function boot(): Promise<{
  chart: EchoRenderer;
  conn: PerspectiveView;
  app: HeadlessApplication;
  frame(count?: number): void;
  teardown(): void;
}> {
  const gl = new HeadlessWebGLRenderer();
  const app = new HeadlessApplication();
  const connHost = createHost(1280, 720);
  const chartHost = createHost(1280, 720);
  const callbacks = new Proxy({} as RendererCallbacks, {
    get: () => () => undefined,
  });

  const conn = new PerspectiveView();
  conn.mount(connHost as unknown as HTMLElement, () => gl.asRenderer());
  conn.setActive(true);

  const chart = new EchoRenderer(callbacks, app.asApplication());
  await chart.init(chartHost as unknown as HTMLElement);
  chart.setConn(conn);

  const terrain = cannedTerrain();
  chart.setTerrain(terrain);
  conn.setTerrain(terrain);
  chart.setMap(cannedMap());
  chart.setNodes(cannedNodes());
  chart.setIdentity(0, Faction.Bathyarch);
  conn.setIdentity(0, Faction.Bathyarch);

  const snapshot = cannedSnapshot();
  chart.applySnapshot(snapshot);
  conn.applySnapshot(snapshot);

  const frame = (count = 1): void => {
    for (let i = 0; i < count; i++) {
      pumpAnimationFrames();
      app.frame();
    }
  };
  frame(2);

  return {
    chart,
    conn,
    app,
    frame,
    teardown: () => {
      chart.destroy();
      conn.destroy();
    },
  };
}

/** The canned snapshot's own hulls, by SIG — the fixture this file reads. */
const CANNED_SIGS = cannedSnapshot().units.map((unit) => unit.sig);
/** Its structures, which wear the same collar and never a ring (§3.5). */
const CANNED_STRUCTURE_SIGS = cannedSnapshot().structures.map((structure) => structure.sig);
/** Every own emitter that wears a collar. */
const COLLARED = [...CANNED_SIGS, ...CANNED_STRUCTURE_SIGS];

describe('the loudness collar (ui-ux.md §3.5)', () => {
  it('draws one sweep per own hull, whatever is selected', async () => {
    const world = await boot();
    try {
      const drawn = collars(world.app);
      assert.ok(CANNED_STRUCTURE_SIGS.length > 0, 'the fixture has to carry structures too');
      assert.equal(
        drawn.length,
        COLLARED.length,
        'every own emitter wears a collar: a fleet peak cannot say which one it is reading'
      );
    } finally {
      world.teardown();
    }
  });

  it('sweeps SIG / 100 of a turn from twelve o clock, clockwise', async () => {
    const world = await boot();
    try {
      const drawn = collars(world.app);
      // Matched by sweep rather than by draw order: the assertion is that the
      // set of arcs *is* the set of SIG readings, which is the claim §3.5
      // makes and is stronger than any one hull's arc being right.
      const sweeps = drawn.map((arc) => arc.end - arc.start).sort((a, b) => a - b);
      const expected = COLLARED.map((sig) => (sig / 100) * Math.PI * 2).sort((a, b) => a - b);
      assert.equal(sweeps.length, expected.length);
      for (let i = 0; i < sweeps.length; i++) {
        assert.ok(
          Math.abs(sweeps[i]! - expected[i]!) < 1e-6,
          `sweep ${sweeps[i]} should be ${expected[i]}`
        );
      }
      // Twelve o'clock, and clockwise from it: every arc opens at -PI/2 and
      // ends above it. A gauge that ran the other way would read backwards.
      for (const arc of drawn) {
        assert.ok(Math.abs(arc.start + Math.PI / 2) < 1e-6, 'opens at twelve o clock');
        assert.ok(arc.end >= arc.start, 'runs clockwise');
      }
    } finally {
      world.teardown();
    }
  });
});

/**
 * How far the sweep's core wanders off its own radius, per collar.
 *
 * The crackle's whole amplitude, measured rather than read off a constant —
 * the ends are pinned, so a mean would hide it and the maximum is the figure.
 */
function collarWobble(app: HeadlessApplication): number[] {
  const out: number[] = [];
  for (const stroke of sigStrokes(app)) {
    if (stroke.alpha !== 1) continue;
    const radii: number[] = [];
    for (const step of stroke.steps) {
      if (step.action !== 'moveTo' && step.action !== 'lineTo') continue;
      const [x, y] = step.data as number[];
      radii.push(Math.hypot(x!, y!));
    }
    if (radii.length < 3) continue;
    const pinned = radii[0]!;
    out.push(Math.max(...radii.map((r) => Math.abs(r - pinned))));
  }
  return out;
}

describe('the crackle (style-neon-noir.md, Motion and FX timing)', () => {
  it('rides SIG, strictly, over the whole scale', () => {
    // Asserted on the rule rather than on the drawn path, because the drawn
    // path cannot answer it: a short sweep samples the noise eight times over
    // several cycles, so the widest vertex it happens to catch is luck. The
    // aliasing is wanted — it is what makes the sweep read as struck rather
    // than waved — which is exactly why the property is held here instead.
    let previous = -Infinity;
    for (let sig = 0; sig <= 100; sig += 5) {
      const amplitude = crackleAmplitude(sig);
      assert.ok(amplitude > previous, `SIG ${sig} does not crackle wider than ${sig - 5}`);
      previous = amplitude;
    }
    // The floor is why a silent hull is nearly still without being dead: it
    // keeps a sliver legible as the same kind of mark as a full circle.
    assert.ok(crackleAmplitude(0) > 0, 'a quiet emitter still wears the same mark');
    assert.ok(
      crackleAmplitude(100) > crackleAmplitude(0) * 4,
      'the loud end has to be visibly more electric than the quiet one'
    );
    // Off the ends of the scale it saturates rather than inverting.
    assert.equal(crackleAmplitude(-20), crackleAmplitude(0));
    assert.equal(crackleAmplitude(400), crackleAmplitude(100));
  });

  it('is actually drawn, and widest on the loudest emitter in the water', async () => {
    const world = await boot();
    try {
      const wobble = collarWobble(world.app);
      assert.ok(wobble.length > 0, 'no collar core was traced at all');
      assert.ok(
        wobble.some((w) => w > 0),
        'every sweep came out a perfect arc: the crackle reached nothing'
      );
      // Bounded against the gauge it rides rather than against the rule: the
      // amplitude is screen pixels and these vertices are local metres off a
      // per-unit scale the test cannot see, so the rule itself is held above
      // and what is held here is that the crackle stays subordinate — a
      // wobble comparable to the radius would be a shape, not a texture.
      for (const stroke of sigStrokes(world.app)) {
        if (stroke.alpha !== 1) continue;
        const radii: number[] = [];
        for (const step of stroke.steps) {
          if (step.action !== 'moveTo' && step.action !== 'lineTo') continue;
          const [x, y] = step.data as number[];
          radii.push(Math.hypot(x!, y!));
        }
        if (radii.length < 3) continue;
        const pinned = radii[0]!;
        const widest = Math.max(...radii.map((r) => Math.abs(r - pinned)));
        assert.ok(
          widest < pinned * 0.25,
          `a sweep wandered ${((widest / pinned) * 100).toFixed(1)}% of its own radius`
        );
      }
    } finally {
      world.teardown();
    }
  });

  it('pins both ends of the sweep, because the end is the reading', async () => {
    const world = await boot();
    try {
      for (const stroke of sigStrokes(world.app)) {
        if (stroke.alpha !== 1) continue;
        const radii: number[] = [];
        for (const step of stroke.steps) {
          if (step.action !== 'moveTo' && step.action !== 'lineTo') continue;
          const [x, y] = step.data as number[];
          radii.push(Math.hypot(x!, y!));
        }
        if (radii.length < 3) continue;
        assert.ok(
          Math.abs(radii[radii.length - 1]! - radii[0]!) < 1e-6,
          'a gauge whose needle jitters cannot be read to the stop'
        );
      }
    } finally {
      world.teardown();
    }
  });

  it('freezes under reduced motion rather than going away (§11)', async () => {
    const world = await boot();
    try {
      const moving = collarWobble(world.app);
      world.chart.setReducedMotion(true);
      world.frame(2);
      const still = collarWobble(world.app);

      assert.equal(still.length, moving.length);
      // §11 asks for a static equivalent that carries the same information,
      // and all of this one's information is amplitude — which the freeze does
      // not touch, because it fixes the noise's *seed* and nothing else. So
      // the test is that the crackle is still there, not that it still moves.
      assert.ok(
        still.some((w) => w > 0),
        'reduced motion removed the crackle instead of stopping it'
      );

      // And it really is stopped: the same seed on a later frame draws the
      // same vertices, where an unfrozen one advances with the Echo grid.
      world.frame(2);
      assert.deepEqual(collarWobble(world.app), still, 'a frozen crackle must not move');
    } finally {
      world.teardown();
    }
  });
});

describe('the collar clears the selection ring (ui-ux.md §3.5)', () => {
  /**
   * The shipped rule, imported rather than restated — a second copy of it here
   * would go on passing after the real one changed, which is the failure mode
   * this whole file exists to catch.
   *
   * The property is separation, and it is the one a flat metre gap could not
   * hold: the renderer draws figures from a 7 m half-extent (a 14 m craft) to
   * a 220 m one (a Bastion's footprint), and at a flat +6 / +8 the collar and
   * the selection ring were 1.8% of a Bastion apart — one circle on screen,
   * which cost a selected structure its dial outright.
   *
   * The share is asserted as a floor on the *separation*, never read back off
   * the constant: a test that recomputed the formula would agree with any
   * formula at all.
   */
  const MIN_SHARE = 0.1;
  const MIN_CLEAR_M = 4;
  const SELECTION = SELECTION_GAP_M;

  it('holds the separation across the whole range of figures the game draws', () => {
    // Both ends and the middle, in figure half-extents: a craft, a light hull,
    // a carrier, the smallest structure footprint, the largest.
    for (const [r, gap] of [
      [7, SELECTION.HULL],
      [24, SELECTION.HULL],
      [80, SELECTION.HULL],
      [60, SELECTION.STRUCTURE],
      [220, SELECTION.STRUCTURE],
    ] as const) {
      const selection = r + gap;
      const collar = collarRadius(r, gap);
      assert.ok(
        collar > selection,
        `a collar at ${collar} must sit outside a ring at ${selection}`
      );
      const share = (collar - selection) / r;
      assert.ok(
        share >= MIN_SHARE || collar - selection >= MIN_CLEAR_M - 1e-9,
        `a figure of ${r} m separates its lanes by ${(share * 100).toFixed(1)}%, which is a collision`
      );
    }
  });

  it('never lets the collar cross the selection ring as a figure grows', () => {
    // The reason the collar is outside rather than between: a rule that
    // crossed would put the two marks exactly on top of each other at the size
    // where it crossed, which is the collision it exists to remove.
    for (const gap of [SELECTION.HULL, SELECTION.STRUCTURE]) {
      for (let r = 5; r <= 240; r += 5) {
        assert.ok(
          collarRadius(r, gap) > r + gap,
          `a figure of ${r} m puts its collar on its selection ring`
        );
      }
    }
  });
});

describe('the reach ring (ui-ux.md §3.5)', () => {
  it('draws for a hull at or above the amber stop and for no quieter one', async () => {
    const world = await boot();
    try {
      const loud = CANNED_SIGS.filter((sig) => sig >= SIG_BANDS.AMBER).length;
      assert.ok(loud > 0 && loud < CANNED_SIGS.length, 'the fixture has to have both kinds');
      // Hulls only, and the fixture proves it: its structures are loud enough
      // to be gated in and draw no ring, because a base's ring would be a
      // permanent circle that never reports anything new (§3.5).
      assert.ok(
        CANNED_STRUCTURE_SIGS.some((sig) => sig >= SIG_BANDS.AMBER),
        'a structure over the stop is what makes the next assertion mean something'
      );
      assert.equal(
        reachRings(world.app).length,
        loud,
        'a hull under the amber stop draws its collar and nothing on the ground'
      );
    } finally {
      world.teardown();
    }
  });

  it('never inks a ring green: the gate is the amber stop', async () => {
    const world = await boot();
    try {
      for (const ring of reachRings(world.app)) {
        assert.notEqual(
          ring.color,
          UI.sigLow,
          'green is below the gate, so a green ring means the gate leaked'
        );
      }
    } finally {
      world.teardown();
    }
  });

  it('keeps selection louder than the gate, so selection still reads', async () => {
    const world = await boot();
    try {
      const alphas = new Set(reachRings(world.app).map((ring) => ring.alpha));
      assert.equal(alphas.size, 1, 'nothing is selected, so every ring is a gated one');
      const gated = [...alphas][0]!;
      assert.equal(gated, RING_ALPHA.GATED);
      assert.ok(
        gated < RING_ALPHA.SELECTED,
        `a gated ring at ${gated} must sit under a selected ring's ${RING_ALPHA.SELECTED}`
      );
    } finally {
      world.teardown();
    }
  });
});
