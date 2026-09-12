/**
 * The exposure record (#623) — docs/ui-ux.md §3 and §10.
 *
 * §3: "when a unit crosses into the red band, the meter flashes once and the
 * contact log records it. Players must be able to answer *why did they find
 * me?* after the fact." §10: "post-match analysis of *when did they hear me*
 * is a real activity this game should support."
 *
 * Both halves are rows, so what this file holds is what a row is allowed to
 * *claim* — the rule `missionPanel.test.ts` and `matchFeeds.test.ts` are
 * written to. The pixels stay the screenshot gates in
 * docs/graphics-standards.md, and the flash is already there.
 *
 * The renderer is booted for real against the canned match and only the two
 * rasterisers are stand-ins, exactly as `rendererSmoke.test.ts` does it.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  Faction,
  PERSISTENCE,
  ResolutionTier,
  SelfEventKind,
  SIM,
  type EchoSnapshot,
  type ExposureReport,
} from '@echoes/shared';
import { createHost, HeadlessApplication, type StubElement } from './support/headless.ts';
import { cannedMap, cannedNodes, cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';
import {
  EchoRenderer,
  type ContactLogEntry,
  type RendererCallbacks,
} from '../src/game/EchoRenderer.ts';

const ECHO_STEP_TICKS = SIM.TICK_HZ / SIM.ECHO_HZ;

interface Booted {
  chart: EchoRenderer;
  rows: ContactLogEntry[];
  /** Feed one Echo snapshot, at the tick the Echo pass would have sent it. */
  send(step: number, patch: Partial<EchoSnapshot>): void;
  teardown(): void;
}

/**
 * Boot the chart alone — no conn view, because nothing here draws the world.
 *
 * The callbacks are a proxy for the same reason `rendererSmoke.test.ts` uses
 * one: the interface is a list of notifications with no return values, so a
 * hand-written double adds nothing but a maintenance burden. Contact rows are
 * pulled out of it because they are the whole subject.
 */
async function boot(): Promise<Booted> {
  const app = new HeadlessApplication();
  const host: StubElement = createHost(1280, 720);
  const rows: ContactLogEntry[] = [];
  const callbacks = new Proxy(
    {},
    {
      get:
        (_target, property) =>
        (...args: unknown[]): void => {
          if (property === 'onContactEvent') rows.push(args[0] as ContactLogEntry);
        },
    }
  ) as RendererCallbacks;

  const chart = new EchoRenderer(callbacks, app.asApplication());
  await chart.init(host as unknown as HTMLElement);
  chart.setTerrain(cannedTerrain());
  chart.setMap(cannedMap());
  chart.setNodes(cannedNodes());
  chart.setIdentity(0, Faction.Bathyarch);

  return {
    chart,
    rows,
    send: (step, patch) => {
      // Contacts, marks and the canned self-events are stripped, and each
      // test puts back only what it is about. The others write their own rows
      // on their own rules (§10, "an entry is written when a contact is first
      // heard and again whenever its tier changes"), and leaving them in would
      // make every assertion here a count of somebody else's feed — the canned
      // match is replayed once per Echo step, so its own events would arrive
      // again on every one of them.
      chart.applySnapshot({
        ...cannedSnapshot(step * ECHO_STEP_TICKS),
        contacts: [],
        marks: [],
        selfEvents: [],
        ...patch,
      });
    },
    teardown: () => chart.destroy(),
  };
}

const exposureAt = (tier: ResolutionTier, trackedCount = 1): ExposureReport => ({
  tier,
  trackedCount,
});

/** Every row the log was handed, in order, by label. */
const labels = (rows: ContactLogEntry[]): string[] => rows.map((row) => row.label);

/** How many Echo snapshots a tier must hold for before the log claims it. */
const SETTLE_STEPS = PERSISTENCE.EXPOSURE_SETTLE_S * SIM.ECHO_HZ;

describe('the red-band crossing row', () => {
  it('names the hull that crossed, and is focusable', async () => {
    const world = await boot();
    try {
      world.rows.length = 0;
      world.send(1, {
        // Unit 11 is the canned Corvette. The row must be about *it* and not
        // about the fleet: `peakSig` is a max, and the whole reason this is a
        // server event is that a max cannot say which hull moved (#623).
        selfEvents: [{ kind: SelfEventKind.WentLoud, unitId: 11 }],
      });

      assert.equal(world.rows.length, 1, 'one event, one row');
      const row = world.rows[0]!;
      assert.match(row.label, /went loud$/, 'the row states what happened');
      assert.match(row.label, /^Corvette /, 'and names the hull it happened to');
      assert.equal(row.tier, ResolutionTier.Silent, 'own-force rows sit under the `---` tier');
      assert.ok(row.focusX !== undefined && row.focusY !== undefined, 'a hull is a place');
    } finally {
      world.teardown();
    }
  });

  it('writes one row per hull, not one for the loudest', async () => {
    const world = await boot();
    try {
      world.rows.length = 0;
      world.send(1, {
        selfEvents: [
          { kind: SelfEventKind.WentLoud, unitId: 11 },
          { kind: SelfEventKind.WentLoud, unitId: 13 },
        ],
      });
      // The defect a client-side edge detector on `peakSig` would have had:
      // the second hull is quieter than the first, so the bar never moves for
      // it and its crossing would have gone unrecorded.
      assert.equal(world.rows.length, 2);
      assert.match(world.rows[0]!.label, /^Corvette /);
      assert.match(world.rows[1]!.label, /^Harvester /);
    } finally {
      world.teardown();
    }
  });
});

describe('the passive exposure rows', () => {
  it('records being heard, and being lost again, once each', async () => {
    const world = await boot();
    try {
      world.rows.length = 0;
      // Held for the settle window and one step past it.
      for (let step = 1; step <= SETTLE_STEPS + 2; step++) {
        world.send(step, { exposure: exposureAt(ResolutionTier.Bearing) });
      }
      assert.deepEqual(labels(world.rows), ['they have your bearing'], 'one row, not one per tick');

      for (let step = SETTLE_STEPS + 3; step <= SETTLE_STEPS * 2 + 5; step++) {
        world.send(step, { exposure: exposureAt(ResolutionTier.Silent, 0) });
      }
      assert.deepEqual(labels(world.rows), ['they have your bearing', 'they lost you']);
    } finally {
      world.teardown();
    }
  });

  it('says nothing about who, where, or how far', async () => {
    const world = await boot();
    try {
      world.rows.length = 0;
      for (let step = 1; step <= SETTLE_STEPS + 2; step++) {
        world.send(step, { exposure: exposureAt(ResolutionTier.Track, 3) });
      }
      const row = world.rows[0]!;
      // §10.5's rule holding on the one channel that points the other way: the
      // report is a tier and a count, so a row that carried a bearing or a
      // range would be inventing a listener the Echo Layer never resolved.
      assert.equal(row.label, 'they have you tracked');
      assert.equal(row.bearingDeg, undefined);
      assert.equal(row.rangeM, undefined);
      assert.equal(row.focusX, undefined);
      assert.ok(!/\d/.test(row.label), 'and never the count, which the TRACKED label carries live');
    } finally {
      world.teardown();
    }
  });

  it('ignores a tier that does not hold, so a hull on a threshold writes nothing', async () => {
    const world = await boot();
    try {
      world.rows.length = 0;
      // The failure mode the settle window exists for: the Echo pass recomputes
      // the tier from scratch at 5 Hz, so a hull parked on a detection
      // threshold flickers at exactly that rate. §10 — "not every 5 Hz tick,
      // which would bury the events that matter".
      for (let step = 1; step <= SETTLE_STEPS * 4; step++) {
        world.send(step, {
          exposure: exposureAt(
            step % 2 === 0 ? ResolutionTier.Contact : ResolutionTier.Silent,
            step % 2
          ),
        });
      }
      assert.deepEqual(labels(world.rows), [], 'neither side of the flicker ever settles');
    } finally {
      world.teardown();
    }
  });

  it('records each tier it settles on as the exposure deepens', async () => {
    const world = await boot();
    try {
      world.rows.length = 0;
      let step = 1;
      for (const tier of [
        ResolutionTier.Contact,
        ResolutionTier.Bearing,
        ResolutionTier.Classification,
      ]) {
        for (let held = 0; held <= SETTLE_STEPS + 1; held++, step++) {
          world.send(step, { exposure: exposureAt(tier) });
        }
      }
      assert.deepEqual(labels(world.rows), [
        'you were heard',
        'they have your bearing',
        'they have you classified',
      ]);
    } finally {
      world.teardown();
    }
  });

  it('leaves the ping row alone — a ping is an event, not a tier', async () => {
    const world = await boot();
    try {
      world.rows.length = 0;
      // Active sonar arrives as its own self-event with its own row, and does
      // not wait on the settle window: the exposure it announces is a fact
      // about one instant, and the tier it may or may not leave behind is a
      // different claim.
      //
      // Bearing 0 deliberately — due +x, which is 90 degrees on the compass the
      // log prints. It is a real bearing and a falsy number, so a guard written
      // on truthiness rather than on `undefined` loses the row entirely.
      world.send(1, {
        selfEvents: [{ kind: SelfEventKind.Exposed, unitId: 11, bearing: 0 }],
        exposure: exposureAt(ResolutionTier.Track, 1),
      });
      assert.deepEqual(labels(world.rows), ['you were pinged']);
      assert.equal(world.rows[0]!.bearingDeg, 90, 'at the fidelity sent: a bearing, no range');
      assert.equal(world.rows[0]!.rangeM, undefined);
    } finally {
      world.teardown();
    }
  });
});
