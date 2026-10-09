/**
 * The Ledger 2 — docs/mission-shift-change.md, against the two mechanisms it
 * added and a live match.
 *
 * `missions.test.ts` reads the literal; this file states the claims the table
 * cannot:
 *
 * - **The `deliver` predicate reads the player's own stockpile and nothing
 *   else** — the figure the snapshot already carries, capped, met at the
 *   quota (§8; types.ts). Driven through the real runtime on a fixture, the
 *   `missionTolerance.test.ts` arrangement, so the one variable in the file
 *   is the number.
 * - **The close assembles** — an objective's met or unmet reading is appended
 *   beneath the outcome's own, in authored order, picked by the frozen status
 *   (§8; types.ts, `reading`).
 * - **The map's acoustic claims hold under the real model** (§1, §6): the
 *   faces can run Overburden at the road's ears and stay unheard, and a barge
 *   under way above the layer during a pass is a contact. Stated with the
 *   shared propagation functions, independently of the Echo pass, the
 *   `echo-parity.test.ts` manner.
 * - **An untouched shift is read as a failed one** — the sixteen-minute idle
 *   run, closing on the whistle with both unmet readings and no audit minute,
 *   because an idle field neither delivers, berths, nor crosses the layer.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { defineQuery, hasComponent } from 'bitecs';
import {
  Biome,
  FaunaStage,
  HarvestThrottle,
  MissionOutcome,
  ObjectiveStatus,
  ResolutionTier,
  SIM,
  StructureKind,
  THERMOCLINE_DUCT_TOP_M,
  detectionRatio,
  thermoclineFactor,
  type EchoSnapshot,
} from '@echoes/shared';
import {
  Fauna,
  Harvester,
  HarvestMode,
  Health,
  Owner,
  Position,
  ResourceNode,
  Structure,
  Unit,
} from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import type { MapDefinition, MapRect } from '../src/sim/maps/types.ts';
import { LEDGER_SHIFT_CHANGE, PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import { MissionRuntime, type MissionCommandSink } from '../src/sim/missions/runtime.ts';
import { Terrain, shapeContains } from '../src/sim/terrain.ts';
import { createSimWorld } from '../src/sim/world.ts';
import type {
  EconomyAccount,
  MissionDefinition,
  MissionPredicate,
} from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_TICK_INTERVAL = Math.round(SIM.TICK_HZ / SIM.ECHO_HZ);
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/** §8's quota, as the literal authors it. */
const QUOTA = 3600;

/**
 * A resolved snapshot carrying one fact: what the player's economy holds.
 * The other two accounts are held at a decoy figure rather than zero, so a
 * predicate that read the wrong account would be caught reading it.
 */
function banked(
  tick: number,
  amount: number,
  account: EconomyAccount = 'nodules',
  decoy = 0
): EchoSnapshot {
  return {
    tick,
    units: [],
    structures: [],
    ordnance: [],
    contacts: [],
    peakSig: 0,
    berths: { used: 0, granted: 0 },
    refits: [],
    nodules: decoy,
    crystal: decoy,
    biomass: decoy,
    [account]: amount,
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    selfEvents: [],
    draw: { capacity: 0, demand: 0, satisfaction: 1 },
    driftHealth: [],
    shoals: [],
    jellies: [],
    hazards: [],
    marks: [],
  };
}

/** The sink is required and never reached: the fixtures author no ordering beats. */
const SINK: MissionCommandSink = {
  applyMove: () => {},
  applyDepth: () => true,
  applySilent: () => {},
  applyPing: () => {},
};

/**
 * One objective, one rule, nothing else — the `deliver` predicate with §8's
 * own figure, in `missionTolerance.test.ts`'s fixture idiom: never installed,
 * nothing in the water, the snapshot fed directly.
 */
const DELIVER_ONLY: MissionDefinition = {
  ...PROLOGUE_SORROWGATE,
  id: 'test-deliver',
  arrayTag: undefined,
  sweep: undefined,
  lifts: undefined,
  regions: [],
  markers: [],
  parties: [],
  beats: [],
  objectives: [
    {
      id: 'the-number',
      text: 'Make the number.',
      initial: ObjectiveStatus.Pending,
      predicate: { kind: 'deliver', account: 'nodules', amount: QUOTA },
    },
  ],
};

function driveDeliver(
  stockpiles: readonly number[],
  account: EconomyAccount = 'nodules',
  decoy = 0
): {
  status: ObjectiveStatus;
  progress: { done: number; of: number };
} {
  const definition: MissionDefinition =
    account === 'nodules'
      ? DELIVER_ONLY
      : {
          ...DELIVER_ONLY,
          objectives: [
            {
              ...DELIVER_ONLY.objectives[0],
              predicate: { kind: 'deliver', account, amount: QUOTA },
            },
          ],
        };
  const runtime = new MissionRuntime(definition);
  const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
  let tick = 0;
  for (const amount of stockpiles) {
    tick += ECHO_TICK_INTERVAL;
    world.tick = tick;
    runtime.tick(world, SINK, banked(tick, amount, account, decoy));
  }
  const objective = runtime.currentView?.objectives.find((o) => o.id === 'the-number');
  assert.ok(objective !== undefined, 'the quota objective is not in the view');
  assert.ok(objective.progress !== undefined, 'the quota carries no counter');
  return { status: objective.status, progress: objective.progress };
}

describe('the number — the deliver predicate, §8', () => {
  it('counts the stockpile the snapshot already carries, and caps at the quota', () => {
    const short = driveDeliver([0, 1200, 3599]);
    assert.equal(short.status, ObjectiveStatus.Pending);
    assert.deepEqual(short.progress, { done: 3599, of: QUOTA });

    const over = driveDeliver([0, QUOTA + 500]);
    assert.equal(over.status, ObjectiveStatus.Met);
    assert.deepEqual(over.progress, { done: QUOTA, of: QUOTA }, 'the register does not over-count');
  });

  it('is met from the tick the stockpile reaches the figure', () => {
    assert.equal(driveDeliver([QUOTA]).status, ObjectiveStatus.Met);
  });

  // docs/mission-intake.md §13: the row is generalised over the economy
  // record's three accounts, not grown a `biomass` sibling, so the third
  // account is not a special case either. The decoy holds the other two
  // accounts past the quota the whole time — a counter that advanced would
  // be reading the wrong stockpile.
  it('reads the biomass account when the band is authored in Biomass', () => {
    const short = driveDeliver([0, 120, 244], 'biomass', QUOTA * 2);
    assert.equal(short.status, ObjectiveStatus.Pending, 'the decoy accounts must not count');
    assert.deepEqual(short.progress, { done: 244, of: QUOTA });

    const rendered = driveDeliver([0, QUOTA], 'biomass', 0);
    assert.equal(rendered.status, ObjectiveStatus.Met);
    assert.deepEqual(rendered.progress, { done: QUOTA, of: QUOTA });
  });

  it('reads the crystal stockpile when the figure is authored in Crystal', () => {
    const short = driveDeliver([QUOTA - 1], 'crystal', QUOTA * 2);
    assert.equal(short.status, ObjectiveStatus.Pending, 'the decoy accounts must not count');
    assert.deepEqual(short.progress, { done: QUOTA - 1, of: QUOTA });

    const over = driveDeliver([QUOTA + 500], 'crystal', 0);
    assert.equal(over.status, ObjectiveStatus.Met);
    assert.deepEqual(over.progress, { done: QUOTA, of: QUOTA }, 'the register does not over-count');
  });

  it('rejects an account the economy record does not carry at type-check', () => {
    // @ts-expect-error — the format's standing rule: a mistyped literal fails
    // `npm run type-check`, not half way through a match.
    const mistyped: MissionPredicate = { kind: 'deliver', account: 'biomas', amount: 245 };
    assert.equal(mistyped.kind, 'deliver');
  });
});

describe('the close assembles — objective readings, §8', () => {
  it('appends the met and unmet lines in authored order beneath the outcome', () => {
    const fixture: MissionDefinition = {
      ...DELIVER_ONLY,
      id: 'test-readings',
      objectives: [
        {
          id: 'made',
          text: 'Make the number.',
          initial: ObjectiveStatus.Pending,
          terminal: true,
          predicate: { kind: 'deliver', account: 'nodules', amount: 100 },
          reading: { met: 'The number is entered.', unmet: 'The shortfall is entered.' },
        },
        {
          id: 'unmade',
          text: 'Stand the watches down.',
          initial: ObjectiveStatus.Pending,
          terminal: true,
          predicate: { kind: 'endure', ticks: T(60) },
          reading: { met: 'Three barges berthed.', unmet: 'The berthing lists are short.' },
        },
      ],
      beats: [{ atTick: ECHO_TICK_INTERVAL * 3, kind: 'resolve', conclusion: true, note: '' }],
    };
    const runtime = new MissionRuntime(fixture);
    const world = createSimWorld(Terrain.demo(), 1 / SIM.TICK_HZ, 3);
    let resolution = null;
    for (let pass = 1; pass <= 4 && resolution === null; pass++) {
      world.tick = pass * ECHO_TICK_INTERVAL;
      resolution = runtime.tick(world, SINK, banked(world.tick, 150));
    }
    assert.ok(resolution !== null, 'the fixture never resolved');
    assert.equal(resolution.outcome, MissionOutcome.Partial, 'one column of two filled');
    // The picked lines, in authored order, on their own lines under the
    // outcome's reading — and each objective's line is the one its frozen
    // status earned.
    assert.match(
      resolution.epilogue,
      /\n\nThe number is entered\.\nThe berthing lists are short\.$/
    );
  });
});

describe("the map's acoustic claims, under the real model — §1, §6", () => {
  // The audit listens with a Corvette's ears from the High Road, above the
  // layer; the faces work below it in vein ground. Figures are the literal's
  // own: road depth 700 m, faces at 1,340 m, vein PF 0.45.
  const HYD = 50;
  const VEIN = 0.45;

  it('cannot resolve a face running Overburden from the road', () => {
    // The far face is authored no closer than 1,500 m to the road's beats.
    const across = thermoclineFactor(1340, 700);
    assert.equal(across, 0.3, 'the faces and the road are on opposite sides of the layer');
    const ratio = detectionRatio(68, VEIN * across, 1500, HYD);
    assert.ok(
      ratio < 1,
      `the loudest throttle on the field reads ${ratio.toFixed(2)} at the road — §4's claim fails`
    );
  });

  it('resolves a barge under way above the layer during a pass', () => {
    // A crossing barge shares the road's side of the layer, in the same vein
    // ground, at pass distance.
    const same = thermoclineFactor(850, 700);
    assert.equal(same, 1, 'the crossing puts the barge in the road’s own water');
    const ratio = detectionRatio(25, VEIN * same, 500, HYD);
    assert.ok(
      ratio >= 1,
      `a barge under way past the road reads ${ratio.toFixed(2)} — the audit could never file`
    );
  });
});

describe('the ground the shift stands on — §11, drawn in shapes (#1142)', () => {
  // Asked of the cell, never the point: a point inside an ellipse can stand in
  // a corner cell the ellipse does not claim (terrain.ts, `shapeContains`).
  const map = missionMapById(LEDGER_SHIFT_CHANGE.mapId)!;
  const terrain = terrainFor(map);
  const centre = (m: number) => (Math.floor(m / map.cellM) + 0.5) * map.cellM;
  /** The region that painted the cell under a point: the last whose shape holds its centre. */
  const regionAt = (x: number, y: number): string => {
    let name = '';
    for (const region of map.regions) {
      if (shapeContains(region, centre(x), centre(y))) name = region.note!.split(' — ')[0]!;
    }
    return name;
  };
  const groundAt = (x: number, y: number) => [regionAt(x, y), terrain.floorAt(x, y)];
  const shift = LEDGER_SHIFT_CHANGE.parties.find((party) => party.slot === 0)!;
  const audit = LEDGER_SHIFT_CHANGE.parties.find((party) => party.slot === 2)!;

  it('musters the shift, its seat and its seam on Face Two, below the layer', () => {
    const spawn = map.spawns[0]!;
    const [seam, rich] = map.resources;
    for (const [what, x, y] of [
      ['the spawn', spawn.x, spawn.y],
      ['its Foundry', spawn.x + spawn.foundryOffsetX, spawn.y + spawn.foundryOffsetY],
      ['the last seam', seam!.x, seam!.y],
      ...shift.units.map((unit) => [unit.tag, unit.x, unit.y] as const),
    ] as const) {
      assert.deepEqual(groundAt(x, y), ['Face Two', 1350], `${what} left Face Two's floor`);
    }
    assert.deepEqual(groundAt(rich!.x, rich!.y), ['Face Five', 1350], 'the rich field moved');
  });

  it('keeps the refinery on the Downworks, below the layer, and the pack over it, above', () => {
    const refinery = shift.structures!.find((s) => s.tag === 'refinery')!;
    assert.deepEqual(groundAt(refinery.x, refinery.y), ['The Downworks', 1300]);
    for (const beat of LEDGER_SHIFT_CHANGE.beats) {
      if (beat.kind !== 'creature') continue;
      assert.deepEqual(groundAt(beat.spawnAt!.x, beat.spawnAt!.y), ['The Downworks', 1300]);
      assert.deepEqual(groundAt(beat.driveTo!.x, beat.driveTo!.y), ['The Downworks', 1300]);
      // §7: at the Draymaw's own 900 m, above the duct, the one depth a pack
      // at rest keeps; seated under the layer, it climbed through it (#1212).
      assert.equal(beat.spawnAt!.depthM, 900, `${beat.tag} is seated off its working depth`);
      assert.equal(beat.driveTo.depthM, 900, `${beat.tag} is driven off its working depth`);
      assert.ok(beat.spawnAt!.depthM < THERMOCLINE_DUCT_TOP_M, `${beat.tag} is in the duct`);
    }
  });

  it('walks the audit on the High Road, docks it at the Rail Head, and sends it off the Field', () => {
    for (const unit of audit.units) {
      assert.deepEqual(groundAt(unit.x, unit.y), ['The High Road', 950], unit.tag);
    }
    const legs = LEDGER_SHIFT_CHANGE.beats.flatMap((beat) => (beat.kind === 'move' ? [beat] : []));
    assert.equal(legs.length, 20, 'the filed plan grew or shrank');
    for (const leg of legs) {
      const at = T(6, 30) === leg.atTick ? 'docked' : T(13) === leg.atTick ? 'departing' : 'pass';
      const expected = {
        pass: ['The High Road', 950],
        docked: ['The Rail Head', 850],
        departing: ['The Field', 1100],
      }[at];
      assert.deepEqual(groundAt(leg.x, leg.y), expected, `${leg.tag} at ${leg.atTick}`);
    }
  });

  it('counts the berths on exactly the cells the Rail Head paints', () => {
    const berths = LEDGER_SHIFT_CHANGE.regions.find((region) => region.id === 'railhead')!;
    for (let y = map.cellM / 2; y < map.heightM; y += map.cellM) {
      for (let x = map.cellM / 2; x < map.widthM; x += map.cellM) {
        assert.equal(
          shapeContains(berths, x, y),
          regionAt(x, y) === 'The Rail Head',
          `the cell at ${x},${y} is on one of the two and not the other`
        );
      }
    }
  });

  it('keeps the shoulder between the road and the working level, so the climb is as long', () => {
    // §1: everything that matters happens in the climb. The Downworks' north
    // edge draws back at the basin's ends and never enters the Field's row
    // under the road, so no column of the map shortens it.
    for (let x = map.cellM / 2; x < map.widthM; x += map.cellM) {
      assert.deepEqual(groundAt(x, 1125), ['The Field', 1100], `the shoulder is cut at x=${x}`);
    }
  });

  it("keeps the working level's south edge on the rectangle's, with no dip between the faces", () => {
    // #1171: an ellipse here dipped into the Field's row below the Downworks
    // and changed how the packs reach the muster. That row is the Field's or a
    // face's, as it was when these were rectangles, in every column.
    for (let x = map.cellM / 2; x < map.widthM; x += map.cellM) {
      const [ground] = groundAt(x, 2125);
      assert.ok(
        ground === 'The Field' || ground === 'Face Two' || ground === 'Face Five',
        `the Downworks dips into ${x},2125`
      );
      assert.deepEqual(groundAt(x, 1875), ['The Downworks', 1300], `the row above ${x},2125`);
    }
  });

  it('joins both faces and the refinery on the working level, without crossing the layer', () => {
    // A harvester at its authored depth reaches the refinery and the rich
    // field from the muster, cell by cell through water below the layer.
    const depth = shift.units[0]!.depthM;
    const key = (x: number, y: number) => `${x},${y}`;
    const start = [centre(map.spawns[0]!.x), centre(map.spawns[0]!.y)] as const;
    const seen = new Set([key(...start)]);
    const queue: (readonly [number, number])[] = [start];
    while (queue.length > 0) {
      const [x, y] = queue.shift()!;
      for (const [nx, ny] of [
        [x + map.cellM, y],
        [x - map.cellM, y],
        [x, y + map.cellM],
        [x, y - map.cellM],
      ] as const) {
        if (nx < 0 || ny < 0 || nx >= map.widthM || ny >= map.heightM) continue;
        if (seen.has(key(nx, ny)) || !terrain.admits(nx, ny, depth)) continue;
        seen.add(key(nx, ny));
        queue.push([nx, ny]);
      }
    }
    const refinery = shift.structures!.find((s) => s.tag === 'refinery')!;
    const rich = map.resources[1]!;
    assert.ok(seen.has(key(centre(refinery.x), centre(refinery.y))), 'the refinery is cut off');
    assert.ok(seen.has(key(centre(rich.x), centre(rich.y))), 'Face Five is cut off');
    for (const at of seen) {
      const [x, y] = at.split(',').map(Number) as [number, number];
      assert.ok(terrain.floorAt(x, y) > 1200, `the working level climbs past the layer at ${at}`);
    }
  });
});

describe('the packs come the way they came — §11, the dip taken out (#1171)', () => {
  // The regions as f9d064c4 drew them, before #1142 redrew three in shapes:
  // written out rather than read from the literal, so the reference cannot
  // move with the map it checks.
  const RECTANGLES: MapRect[] = [
    { x: 0, y: 0, widthM: 4000, heightM: 3000, floorM: 1100, note: 'The Field' },
    { x: 1500, y: 0, widthM: 1000, heightM: 500, floorM: 850, note: 'The Rail Head' },
    { x: 0, y: 500, widthM: 4000, heightM: 500, floorM: 950, note: 'The High Road' },
    { x: 0, y: 1250, widthM: 4000, heightM: 750, floorM: 1300, note: 'The Downworks' },
    { x: 500, y: 2000, widthM: 750, heightM: 500, floorM: 1350, note: 'Face Two' },
    { x: 2750, y: 2000, widthM: 750, heightM: 500, floorM: 1350, note: 'Face Five' },
  ].map((region) => ({ ...region, biome: Biome.ThermalVein }));
  const map = missionMapById(LEDGER_SHIFT_CHANGE.mapId)!;
  const positioned = defineQuery([Position]);

  /**
   * An idle shift, played to the whistle: every positioned entity every 5 s,
   * with its hit points, and every line the mission speaks. Keyed by eid less
   * the run's smallest, because bitecs numbers entities across worlds, so the
   * second run's eids start where the first run's stopped.
   */
  function play(on: MapDefinition) {
    const match = new Match(on, { mission: LEDGER_SHIFT_CHANGE, fauna: false, seed: 77 });
    const tracks: string[][] = [];
    const lines: string[] = [];
    let base = -1;
    for (let tick = 0; tick <= T(16, 30) && match.missionOver === null; tick++) {
      match.update(STEP_MS);
      match.takeMissionView();
      for (const line of match.takeMissionLines()) lines.push(`${tick} ${line.text}`);
      if (tick % (5 * SIM.TICK_HZ) !== 0) continue;
      const eids = [...positioned(match.world)].sort((a, b) => a - b);
      if (base < 0) base = eids[0]!;
      tracks.push(
        eids.map((e) => {
          const what = hasComponent(match.world, Fauna, e) ? 'creature' : 'other';
          const at = `${Position.x[e]},${Position.y[e]}@${Position.depth[e]}`;
          return `${e - base} ${what} ${at} hp ${Health.hp[e]}`;
        })
      );
    }
    return { tracks, lines, over: match.missionOver };
  }

  it('walks every hull and creature of an idle shift on the tracks the rectangles gave it', () => {
    // §11: the Downworks' ellipse dipped south between the faces, and the
    // Draymaw packs, then driven to rest by the refinery, came to the muster
    // across the dip and killed a different hull first. They rest at the
    // Downworks' east end now (#1265), and in an idle shift nothing crosses
    // the Downworks after 00:20, so the south-edge test above is #1171's guard;
    // this one still catches a shape that moves the audit or the pack's drive.
    const before = play({ ...map, regions: RECTANGLES });
    const after = play(map);
    assert.ok(
      before.tracks.some((sample) => sample.some((entity) => entity.includes(' creature '))),
      'the pack never took the field, so the tracks prove nothing about it'
    );
    assert.ok(after.over !== null, 'the whistle never blew');
    assert.equal(after.tracks.length, before.tracks.length, 'the shift ran a different length');
    for (let i = 0; i < before.tracks.length; i++) {
      assert.deepEqual(after.tracks[i], before.tracks[i], `the tracks part at ${i * 5}s`);
    }
    assert.deepEqual(after.lines, before.lines, 'the mission spoke differently');
    assert.deepEqual(after.over, before.over, 'the shift closed differently');
  });
});

describe('the shift, run out — docs/mission-shift-change.md §8, §9', () => {
  it('reads an untouched shift as failed, with both columns unfilled and no minute', () => {
    const map = missionMapById(LEDGER_SHIFT_CHANGE.mapId)!;
    const match = new Match(map, { mission: LEDGER_SHIFT_CHANGE, fauna: false, seed: 17 });
    for (let tick = 0; tick <= T(16, 30); tick++) {
      match.update(STEP_MS);
      if (match.missionOver !== null) break;
    }
    const result = match.missionOver;
    assert.ok(result !== null, 'the whistle never blew');
    const closeS = match.world.tick / SIM.TICK_HZ;
    assert.ok(
      Math.abs(closeS - 16 * 60) <= 1,
      `the shift closed at ${closeS.toFixed(1)}s against the authored 960s`
    );
    assert.equal(result.outcome, MissionOutcome.Lost, 'an untouched shift read as something else');
    assert.match(result.epilogue, /failed shift/);
    // Both unmet readings, in authored order; and no audit minute, because an
    // idle field neither delivers, berths, nor crosses the layer.
    assert.match(result.epilogue, /The shortfall is entered\./);
    assert.match(result.epilogue, /The berthing lists are short\./);
    assert.doesNotMatch(result.epilogue, /audit's minute/);
  });
});

describe('the pack, at rest — docs/mission-shift-change.md §7 (#1265)', () => {
  /** The pack's release from its drive to rest (`runtime.ts` holds it until then). */
  const RELEASED = T(0, 20);

  /**
   * One shift to the whistle, idle or with every harvester the watches have
   * released sent to its nearest field at Standard. Then the refinery, how
   * many of the player's hulls were lost, what was banked, on how many passes
   * after the release the player heard the pack, on how many a pack member
   * was interested or committed, and how shallow and deep the pack went from
   * its seating to the whistle. Driven to rest beside the refinery,
   * the pack took it at 01:20 in every run, idle or working.
   */
  function shift(working: boolean) {
    const map = missionMapById(LEDGER_SHIFT_CHANGE.mapId)!;
    const match = new Match(map, { mission: LEDGER_SHIFT_CHANGE, fauna: false, seed: 41 });
    const world = match.world;
    const slot = LEDGER_SHIFT_CHANGE.playerSlot;
    const refinery = defineQuery([Structure, Owner, Health])(world).find(
      (eid) => Structure.kind[eid] === StructureKind.Refinery && Owner.slot[eid] === slot
    )!;
    const full = Health.hp[refinery]!;
    // A lost hull is reaped, so the player's force is counted by who is still
    // there at the whistle, not by who reads zero hull.
    const seated = defineQuery([Unit, Owner])(world).filter((eid) => Owner.slot[eid] === slot);
    // Seated by the 00:00 beat, so read once it has fired.
    const creatures = defineQuery([Fauna]);
    let pack: number[] = [];
    const nodes = defineQuery([ResourceNode, Position])(world);
    let heard = 0;
    let roused = 0;
    // The pack's water, read every tick from its seating on: §7 rests it at
    // 900 m, and seated at 1,250 m it climbed through the layer by 00:05.
    let shallowest = Infinity;
    let deepest = -Infinity;
    for (let tick = 0; tick <= T(16, 30) && match.missionOver === null; tick++) {
      const own = match.update(STEP_MS)?.get(slot);
      match.takeMissionView();
      if (working && tick % (10 * SIM.TICK_HZ) === 0) {
        for (const eid of defineQuery([Harvester, Owner, Health])(world)) {
          if (Owner.slot[eid] !== slot || Harvester.mode[eid] !== HarvestMode.Idle) continue;
          const away = (node: number) =>
            Math.hypot(Position.x[node]! - Position.x[eid]!, Position.y[node]! - Position.y[eid]!);
          const node = [...nodes].sort((a, b) => away(a) - away(b))[0];
          if (node === undefined) continue;
          match.orderHarvest(slot, eid, node);
          match.setThrottle(slot, eid, HarvestThrottle.Standard);
        }
      }
      if (pack.length === 0) pack = [...creatures(world)];
      for (const eid of pack) {
        if (!hasComponent(world, Fauna, eid)) continue;
        shallowest = Math.min(shallowest, Position.depth[eid]!);
        deepest = Math.max(deepest, Position.depth[eid]!);
      }
      if (tick <= RELEASED) continue;
      const stirred = (eid: number) =>
        hasComponent(world, Fauna, eid) &&
        (Fauna.stage[eid] === FaunaStage.Interested || Fauna.stage[eid] === FaunaStage.Committed);
      if (pack.some(stirred)) roused++;
      // Heard through the player's own resolved contacts, as the player hears it.
      const contacts = own?.contacts ?? [];
      const it = contacts.some((contact) => {
        const eid = match.echo.entityForHandle(slot, contact.id);
        return eid !== undefined && hasComponent(world, Fauna, eid);
      });
      if (it) heard++;
    }
    assert.ok(match.missionOver !== null, 'the premise: the shift ran to the whistle');
    assert.equal(pack.length, 3, 'the premise: the pack of three was on the field');
    return {
      refinery: hasComponent(world, Structure, refinery) ? Health.hp[refinery]! / full : 0,
      lost: seated.filter((eid) => !hasComponent(world, Unit, eid)).length,
      banked: world.economies.get(slot)?.nodules ?? 0,
      heard,
      roused,
      depth: { shallowest, deepest },
    };
  }

  it('commits to nothing in an idle shift, out of earshot of the muster and the refinery', () => {
    const idle = shift(false);
    assert.equal(idle.refinery, 1, 'the pack took the refinery');
    assert.equal(idle.lost, 0, 'the pack took a hull');
    assert.equal(idle.roused, 0, '§7: it commits to nothing, and stirred');
    assert.equal(idle.heard, 0, '§7: heard at rest from the muster or the refinery');
    assert.deepEqual(idle.depth, { shallowest: 900, deepest: 900 }, '§7: off its 900 m');
  });

  it('nor in a shift that works every field at Standard, and is heard from Face Five', () => {
    const worked = shift(true);
    assert.ok(worked.banked > 0, 'the premise: the shift banked something');
    assert.equal(worked.refinery, 1, 'the pack took the refinery from a working field');
    assert.equal(worked.lost, 0, 'the pack took a hull from a working field');
    assert.equal(worked.roused, 0, '§7: it commits to nothing, and stirred at a working field');
    assert.ok(worked.heard > 0, '§7: a shift at Face Five hears the pack at rest, and never did');
    assert.deepEqual(worked.depth, { shallowest: 900, deepest: 900 }, '§7: off its 900 m');
  });
});
