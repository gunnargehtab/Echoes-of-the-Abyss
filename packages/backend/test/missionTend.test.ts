/**
 * The Second Seeding 1, running — docs/mission-tend.md, against a live match.
 *
 * `missions.test.ts` reads the literal; this file lets the tide run. The
 * claims worth sixteen simulated minutes each:
 *
 * - **Tend cannot be failed** (§8). An untouched day resolves at 16:00 as a
 *   conclusion — the turning's reading always lands first — and is read with
 *   Marr's spent-day sentence, never as a loss. And an idle plateau is quiet
 *   enough: the sweep passes twice and files nothing.
 * - **The sweep files a working garden** (§6, §8): a tender parked on the
 *   drop lane during a pass latches *filed*, and the reading arrives with the
 *   tide — both sentences, because filed and unfiled cross with the work
 *   freely.
 * - **Silence stops the work** (§3; systems-echo.md §6): a carrier that goes
 *   silent mid-lift drops out of the authored floor and accrues nothing, and
 *   the cut resumes with the button.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  DRIFT,
  FaunaSpecies,
  MARR_PLATEAU_FILED,
  MissionOutcome,
  PROPAGATION_FACTOR,
  SIM,
  TETHERJELLY_KELP_BAND,
  UnitKind,
  faunaStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { hasComponent } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { missionMapById } from '../src/sim/maps/index.ts';
import { SEEDING_TEND } from '../src/sim/missions/index.ts';
import { Fauna, Position } from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = SEEDING_TEND.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/** On the drop lane, in the first pass's path, at the plateau's own depth. */
const ON_THE_LANE = { x: 2000, y: 2000 };
/** Inside the West Lane, where the jelly re-seat runs. */
const IN_THE_LANE = { x: 750, y: 1400 };

function tendMatch(seed: number): Match {
  const map = missionMapById(SEEDING_TEND.mapId)!;
  return new Match(map, { mission: SEEDING_TEND, fauna: false, seed });
}

function runOut(
  match: Match,
  drive?: (tick: number, own: EchoSnapshot | undefined) => void
): {
  outcome: MissionOutcome;
  epilogue: string;
  scenes: readonly string[];
  resolvedAtTick: number;
} {
  let last: EchoSnapshot | undefined;
  for (let tick = 0; tick <= T(16, 30); tick++) {
    const own = match.update(STEP_MS)?.get(PLAYER);
    if (own !== undefined) last = own;
    drive?.(tick, last);
    match.takeMissionView();
    if (match.missionOver !== null) break;
  }
  const over = match.missionOver;
  assert.ok(over !== null, 'the tide never ended');
  return {
    outcome: over.outcome,
    epilogue: over.epilogue,
    scenes: over.scenes,
    resolvedAtTick: match.world.tick,
  };
}

describe('the tide, run out untouched — docs/mission-tend.md §8', () => {
  it('ends as a conclusion, read as a spent day and never as a loss', () => {
    const { outcome, epilogue, resolvedAtTick } = runOut(tendMatch(29));
    // The turning's terminal reading lands at fifteen-fifty whatever the day
    // did, so the count can never read zero — Tend cannot be failed.
    assert.equal(outcome, MissionOutcome.Partial, 'an untouched day read as something else');
    assert.match(epilogue, /Less came in than the bloom offered/);
    // And the sharp half of §6: a plateau that never pressed the button is
    // *not* still. The tenders idle at eighteen — the figure the hum is —
    // and the sweep's fifty is "enough to read a working garden", so a day
    // that ignored the stillness is filed. The custom is load-bearing, not
    // decorative: the reading arrives with both sentences.
    assert.match(epilogue, /The sweep heard us/, 'a plateau that never went still passed unheard');
    const closeS = resolvedAtTick / SIM.TICK_HZ;
    assert.ok(Math.abs(closeS - 16 * 60) <= 1, `the tide ended at ${closeS.toFixed(1)}s`);
  });

  it('passes unheard when the plateau goes still for both passes', () => {
    // The stillness, practised: every hull silent through each window, work
    // resumed between them — §9's day, minus the work. Unfiled is earnable,
    // or the mission's lesson would be a lie.
    const match = tendMatch(41);
    const silenced = new Set<number>();
    const { epilogue } = runOut(match, (tick, own) => {
      if (own === undefined) return;
      const inWindow =
        (tick >= T(5, 50) && tick <= T(9, 40)) || (tick >= T(11, 20) && tick <= T(14, 10));
      for (const unit of own.units) {
        if (inWindow && !silenced.has(unit.id)) {
          match.setSilentRunning(PLAYER, unit.id, true);
          silenced.add(unit.id);
        }
        if (!inWindow && silenced.has(unit.id)) {
          match.setSilentRunning(PLAYER, unit.id, false);
          silenced.delete(unit.id);
        }
      }
    });
    assert.doesNotMatch(epilogue, /The sweep heard us/, 'a still plateau was filed anyway');
  });
});

describe('the sweep — docs/mission-tend.md §6, §8', () => {
  it('files a garden that forgets itself, and the reading arrives with the tide', () => {
    // One tender is parked on the drop lane just before the first pass and
    // left there — the one sound on a charted lane. The day is read with both
    // sentences: the spent-day reading and the ledger's.
    const match = tendMatch(31);
    let tender = 0;
    const { epilogue } = runOut(match, (tick, own) => {
      if (own === undefined) return;
      if (tender === 0) {
        tender = own.units.find((u) => u.kind === UnitKind.Harvester)?.id ?? 0;
      }
      if (tender !== 0 && tick % (10 * SIM.TICK_HZ) === 0 && tick < T(8)) {
        match.orderMove(PLAYER, tender, ON_THE_LANE.x, ON_THE_LANE.y);
      }
    });
    assert.match(epilogue, /Less came in/, 'the base reading was replaced rather than appended');
    assert.match(epilogue, /The sweep heard us/, 'a working hull on the lane went unfiled');
  });

  it('names the scene it filed, and names it only when the reading is given', () => {
    // docs/campaign.md §1 (#378). The scene id is the machine-readable half of
    // the sentence above it, so the two are latched together or not at all —
    // a resolution that carried the scene without the reading would be the
    // client remembering something the player was never shown, and one that
    // gave the reading without the scene would leave *Thin Water* cold.
    const match = tendMatch(31);
    let tender = 0;
    const filed = runOut(match, (tick, own) => {
      if (own === undefined) return;
      if (tender === 0) {
        tender = own.units.find((u) => u.kind === UnitKind.Harvester)?.id ?? 0;
      }
      if (tender !== 0 && tick % (10 * SIM.TICK_HZ) === 0 && tick < T(8)) {
        match.orderMove(PLAYER, tender, ON_THE_LANE.x, ON_THE_LANE.y);
      }
    });
    assert.match(filed.epilogue, /The sweep heard us/);
    assert.deepEqual(filed.scenes, [MARR_PLATEAU_FILED]);
  });

  it('witnesses nothing on a day the sweep never heard', () => {
    // The stillness practised, as above — and a completed, quiet Tend leaves
    // the pair's later briefings exactly as they were authored. This is the
    // assertion that makes the set scene-keyed rather than mission-keyed.
    const match = tendMatch(41);
    const silenced = new Set<number>();
    const unfiled = runOut(match, (tick, own) => {
      if (own === undefined) return;
      const inWindow =
        (tick >= T(5, 50) && tick <= T(9, 40)) || (tick >= T(11, 20) && tick <= T(14, 10));
      for (const unit of own.units) {
        if (inWindow && !silenced.has(unit.id)) {
          match.setSilentRunning(PLAYER, unit.id, true);
          silenced.add(unit.id);
        }
        if (!inWindow && silenced.has(unit.id)) {
          match.setSilentRunning(PLAYER, unit.id, false);
          silenced.delete(unit.id);
        }
      }
    });
    assert.doesNotMatch(unfiled.epilogue, /The sweep heard us/);
    assert.deepEqual(unfiled.scenes, []);
  });
});

describe('silence stops the work — docs/mission-tend.md §3; systems-echo.md §6', () => {
  it('pauses a cut and lifts its floor while the carrier runs silent', () => {
    // The jelly lift is the legible case: the watch scout idles at six and
    // cuts at forty-five, so the floor is visible on its own meter — and the
    // button drops it to single digits, which is §3's sentence on the wire.
    const match = tendMatch(37);
    let scout = 0;
    let cuttingSig = 0;
    let silentSig = 100;
    let resumedSig = 0;
    let toggledOn = false;
    let toggledOff = false;

    // Sampled over windows rather than at exact ticks, because the snapshot
    // lands on the Echo cadence and the cut has its own arrival time. The
    // scout is ordered in on the first snapshot; the cut needs ninety held
    // seconds, so every window below sits inside it.
    for (let tick = 0; tick <= T(3); tick++) {
      const own = match.update(STEP_MS)?.get(PLAYER);
      match.takeMissionView();
      if (own === undefined) continue;
      if (scout === 0) {
        scout = own.units.find((u) => u.kind === UnitKind.LightScout)?.id ?? 0;
        if (scout !== 0) match.orderMove(PLAYER, scout, IN_THE_LANE.x, IN_THE_LANE.y);
        continue;
      }
      const unit = own.units.find((u) => u.id === scout);
      if (unit === undefined) continue;
      if (tick >= T(1) && tick <= T(1, 15)) cuttingSig = Math.max(cuttingSig, unit.sig);
      if (tick > T(1, 15) && !toggledOn) {
        toggledOn = true;
        match.setSilentRunning(PLAYER, scout, true);
      }
      if (tick >= T(1, 35) && tick <= T(1, 50)) silentSig = Math.min(silentSig, unit.sig);
      if (tick > T(1, 50) && !toggledOff) {
        toggledOff = true;
        match.setSilentRunning(PLAYER, scout, false);
      }
      if (tick >= T(2, 10) && tick <= T(2, 25)) resumedSig = Math.max(resumedSig, unit.sig);
    }

    assert.ok(cuttingSig >= 45, `mid-cut the scout read ${cuttingSig}, under the authored 45`);
    assert.ok(
      silentSig < 10,
      `silent, the scout still read ${silentSig} — the floor held through the button`
    );
    assert.ok(resumedSig >= 45, `the cut did not resume with the button — ${resumedSig}`);
  });
});

describe("the plateau's own Drift — docs/mission-tend.md §11; docs/bestiary.md §4", () => {
  /** §11's rects, as the doc's table reads them. */
  const GARDENS = { x: 500, y: 250, w: 1250, h: 750 };
  const WEST_LANE = { x: 250, y: 1000, w: 1000, h: 750 };
  /** Convocation's row 3 — the head's cluster sits on it to the metre. */
  const LANE_HEAD = { x: 500, y: 1125 };
  /** Convocation's row 4 — the lane's foot, outside every cluster's reach. */
  const LANE_FOOT = { x: 1125, y: 1625 };

  const inside = (r: { x: number; y: number; w: number; h: number }, x: number, y: number) =>
    x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

  function drift(match: Match): { species: FaunaSpecies; eid: number }[] {
    const out: { species: FaunaSpecies; eid: number }[] = [];
    for (let eid = 0; eid <= match.world.maxEid; eid++) {
      if (!hasComponent(match.world, Fauna, eid)) continue;
      out.push({ species: Fauna.species[eid] as FaunaSpecies, eid });
    }
    return out;
  }

  it('seeds shoals through the Gardens and clusters along the West Lane, each in its band', () => {
    const match = tendMatch(41);
    // The 00:00 beats fire on the first step; a second is more than enough.
    for (let tick = 0; tick < SIM.TICK_HZ; tick++) match.update(STEP_MS);

    const shoals = drift(match).filter((c) => c.species === FaunaSpecies.Lampfry);
    const clusters = drift(match).filter((c) => c.species === FaunaSpecies.Tetherjelly);
    assert.equal(shoals.length, 4, '§11: four shoals on the farm rows');
    assert.equal(clusters.length, 3, "§11: three clusters along the lane's head");

    const shelf = faunaStatsFor(FaunaSpecies.Lampfry);
    for (const { eid } of shoals) {
      assert.ok(inside(GARDENS, Position.x[eid]!, Position.y[eid]!), 'a shoal outside the Gardens');
      assert.ok(
        Math.abs(Position.depth[eid]! - shelf.workingDepthM) <= shelf.seedSpreadM,
        `§4: a shoal at ${Position.depth[eid]} m is outside the Shelf band`
      );
    }
    // The clusters rest in the *Kelp Forest* band, the one this map names —
    // 250 m ±50 m — and never the duct's 1,200 m, which this plateau does not
    // have. `homeDepth` is what the runtime holds a released animal at, so it
    // is the number that decides where a cluster actually lives.
    for (const { eid } of clusters) {
      assert.ok(inside(WEST_LANE, Position.x[eid]!, Position.y[eid]!), 'a cluster off the lane');
      assert.ok(
        Math.abs(Position.depth[eid]! - TETHERJELLY_KELP_BAND.workingDepthM) <=
          TETHERJELLY_KELP_BAND.seedSpreadM,
        `§4: a cluster at ${Position.depth[eid]} m is outside the Kelp Forest band`
      );
      assert.equal(
        Fauna.homeDepth[eid],
        TETHERJELLY_KELP_BAND.workingDepthM,
        'a cluster whose home is the duct, on a map with no duct'
      );
    }
  });

  it("lowers the lane's PF by exactly one cluster at the head, and none at the foot", () => {
    const match = tendMatch(43);
    const kelp = PROPAGATION_FACTOR[Biome.KelpForest];
    for (let tick = 0; tick < SIM.TICK_HZ; tick++) match.update(STEP_MS);

    // Measurable, which the doc's "the lane is quieter for every day after"
    // requires and which a placed cluster used not to be: nothing rebuilt the
    // PF grid for a birth, so a mission's clusters masked nothing until an
    // unrelated rebuild happened along.
    const head = match.world.terrain.propagationAt(LANE_HEAD.x, LANE_HEAD.y);
    assert.ok(
      Math.abs(kelp - head - DRIFT.JELLY_PF_DELTA) < 1e-6,
      `§4: the head reads ${head} against a kelp baseline of ${kelp}; expected one −0.10`
    );
    // Convocation's row 4 is "the row the concern holds longest" because no
    // cluster reaches it: row 3 is the one row that is quiet on its own.
    const foot = match.world.terrain.propagationAt(LANE_FOOT.x, LANE_FOOT.y);
    assert.ok(Math.abs(foot - kelp) < 1e-6, `the foot reads ${foot}: a cluster reaches row 4`);
  });

  it('holds a released cluster in its Kelp Forest band rather than sending it to the duct', () => {
    const match = tendMatch(47);
    for (let tick = 0; tick < 10 * SIM.TICK_HZ; tick++) match.update(STEP_MS);
    for (const { eid } of drift(match).filter((c) => c.species === FaunaSpecies.Tetherjelly)) {
      // Ten seconds is 120 m of vertical travel at the Drift's speed: a
      // cluster homing on 1,200 m would already be on the lane's 300 m floor.
      assert.equal(
        Position.depth[eid],
        TETHERJELLY_KELP_BAND.workingDepthM,
        `a cluster drifted to ${Position.depth[eid]} m after release`
      );
    }
  });
});
