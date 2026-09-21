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

/** The collar's sweep: a stroke whose path is a single arc. */
function collars(app: HeadlessApplication): Array<{ radius: number; start: number; end: number }> {
  const out: Array<{ radius: number; start: number; end: number }> = [];
  for (const stroke of sigStrokes(app)) {
    for (const step of stroke.steps) {
      if (step.action !== 'arc') continue;
      const [, , radius, start, end] = step.data as number[];
      out.push({ radius: radius!, start: start!, end: end! });
    }
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

/** A detection ring: a SIG-inked stroke traced as a projected polygon. */
function reachRings(app: HeadlessApplication): Stroke[] {
  const alphas: number[] = [RING_ALPHA.SELECTED, RING_ALPHA.GATED];
  return sigStrokes(app).filter(
    (stroke) => alphas.includes(stroke.alpha) && stroke.steps.every((step) => step.action !== 'arc')
  );
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
          Math.abs(sweeps[i]! - expected[i]!) < 1e-9,
          `sweep ${sweeps[i]} should be ${expected[i]}`
        );
      }
      // Twelve o'clock, and clockwise from it: every arc opens at -PI/2 and
      // ends above it. A gauge that ran the other way would read backwards.
      for (const arc of drawn) {
        assert.ok(Math.abs(arc.start + Math.PI / 2) < 1e-9, 'opens at twelve o clock');
        assert.ok(arc.end >= arc.start, 'runs clockwise');
      }
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
