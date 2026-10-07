/**
 * The Ledger 1, running — docs/mission-asset-recovery.md, against a live match.
 *
 * `missions.test.ts` reads the literal; this file lets the writ run out. The
 * claims worth an eighteen-minute simulation are the ones the table cannot
 * state, and they are the mission's spine:
 *
 * - **The Board reads the count at 18:00 on whatever the player earned** (§8's
 *   Results, §9's close). A column that never lifts a single asset is read
 *   "The number stays" — the keystone's reading, because the chamber did not
 *   come out — and the mission resolves on the beat, not on anything emergent.
 * - **The column is armed and the barges are not** (§3). The first mission in
 *   the campaign with weapons, and exactly three of them.
 * - **The fall's stages land on the document's clock** (§8): part of Face Six
 *   is water at eleven minutes and rock at twelve.
 * - **The writ arms the player with every reading at 00:00** except the haul
 *   home, which appears when the haul does (§12).
 *
 * One idle run, memoised — nobody drives the column, which is itself the §8
 * failure case: eighteen minutes of warning, ignored, and the registry keeps
 * the number. The last block needs no run: it holds every placed point on the
 * ground §11 puts it on, since the map was drawn in shapes (#1141).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Biome, MissionOutcome, SIM, type MissionView } from '@echoes/shared';
import { defineQuery, hasComponent } from 'bitecs';
import { Owner, Unit, Weapon } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { LEDGER_ASSET_RECOVERY } from '../src/sim/missions/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const PLAYER = LEDGER_ASSET_RECOVERY.playerSlot;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

/** Inside the fall-stage rectangle the 11:30 beat closes. */
const STAGE = { x: 2125, y: 2625, depthM: 1100 };

const hulls = defineQuery([Unit, Owner]);

interface Run {
  /** Player hulls with live fire control, counted just after install. */
  armedCount: number;
  ownedCount: number;
  /** Whether the stage rectangle admitted water before and after 11:30. */
  stageOpenBefore: boolean;
  stageOpenAfter: boolean;
  /** Objective ids visible in the first view, and in the last. */
  firstViewIds: string[];
  lastViewIds: string[];
  resolvedAtTick: number;
  outcome: MissionOutcome | null;
  epilogue: string | null;
}

let memo: Run | null = null;

function run(): Run {
  if (memo !== null) return memo;
  const map = missionMapById(LEDGER_ASSET_RECOVERY.mapId)!;
  const match = new Match(map, { mission: LEDGER_ASSET_RECOVERY, fauna: false, seed: 23 });

  // A deliberate ECS read, in `missionRuntime.test.ts`'s manner: the armed
  // flag is a spawn-time fact and the wire never carries it, so the component
  // is the only place the claim is checkable.
  let armedCount = 0;
  let ownedCount = 0;
  for (const eid of hulls(match.world)) {
    if (Owner.slot[eid] !== PLAYER) continue;
    ownedCount++;
    if (hasComponent(match.world, Weapon, eid)) armedCount++;
  }

  const stageOpenBefore = match.world.terrain.admits(STAGE.x, STAGE.y, STAGE.depthM);

  let firstView: MissionView | null = null;
  let lastView: MissionView | null = null;
  let stageOpenAfter = stageOpenBefore;
  let resolvedAtTick = 0;

  for (let tick = 0; tick <= T(18, 30); tick++) {
    match.update(STEP_MS);
    const view = match.takeMissionView();
    if (view !== null) {
      if (firstView === null) firstView = view;
      lastView = view;
    }
    if (tick === T(12)) {
      stageOpenAfter = match.world.terrain.admits(STAGE.x, STAGE.y, STAGE.depthM);
    }
    if (match.missionOver !== null) {
      resolvedAtTick = match.world.tick;
      break;
    }
  }

  memo = {
    armedCount,
    ownedCount,
    stageOpenBefore,
    stageOpenAfter,
    firstViewIds: firstView?.objectives.map((o) => o.id) ?? [],
    lastViewIds: lastView?.objectives.map((o) => o.id) ?? [],
    resolvedAtTick,
    outcome: match.missionOver?.outcome ?? null,
    epilogue: match.missionOver?.epilogue ?? null,
  };
  return memo;
}

describe('the writ, run out — docs/mission-asset-recovery.md §8, §9', () => {
  it('closes at eighteen minutes on the reading the player earned', () => {
    assert.equal(
      run().outcome,
      MissionOutcome.Lost,
      'an untouched manifest read as something else'
    );
    assert.match(run().epilogue ?? '', /keeps the number/);
    // On the beat: the ground goes and the Board reads, at 18:00 and not on
    // anything emergent. One Echo interval of slack, because the runtime
    // resolves on its own 5 Hz tick.
    const closeS = run().resolvedAtTick / SIM.TICK_HZ;
    assert.ok(
      Math.abs(closeS - 18 * 60) <= 1,
      `the writ closed at ${closeS.toFixed(1)}s against the authored 1080s`
    );
  });

  it('arms the escorts and nothing else — the first weapons in the campaign', () => {
    assert.equal(run().ownedCount, 6, 'the column is three combat hulls and three barges');
    assert.equal(run().armedCount, 3, 'the writ arms the escorts, and only the escorts');
  });

  it('closes a stage of Face Six at eleven-thirty, on the clock', () => {
    assert.ok(run().stageOpenBefore, 'the stage was rock before the fall shifted');
    assert.ok(!run().stageOpenAfter, 'the fall shifted and the water stayed');
  });

  it('shows every reading at the writ, and the haul home only when it begins', () => {
    // §12 arms the player with the three asset readings from 00:00 — the writ
    // names its whole manifest — while the column's return appears with
    // Vail's beat at 12:30, because a reading shown at the Rail Head would
    // open the mission already met.
    assert.deepEqual(run().firstViewIds, ['asset-114', 'asset-181', 'asset-200']);
    assert.deepEqual(run().lastViewIds, ['asset-114', 'asset-181', 'asset-200', 'column']);
  });
});

/**
 * §11 in shapes (#1141): the outlines moved, and the mission must not have.
 * Every point the mission places, and every cell of a region it counts or
 * closes, stands on the ground the document puts it on. The terrain answers
 * for a point's whole cell, so asking it at the point asks the cell.
 */
describe('Face Six, drawn in shapes — docs/mission-asset-recovery.md §11', () => {
  const map = missionMapById(LEDGER_ASSET_RECOVERY.mapId)!;
  const terrain = terrainFor(map);
  const groundAt = (x: number, y: number): string =>
    `${Biome[terrain.biomeAt(x, y)]} ${terrain.floorAt(x, y)} m`;

  const RAIL_HEAD = 'ThermalVein 700 m';
  const TERRACE = 'ThermalVein 850 m';
  const WORKS = 'ThermalVein 1100 m';
  const SCAR = 'AbyssalTrench 1150 m';
  const FACE = 'CoralRuins 1150 m';

  /** The centre of every cell a mission region's rectangle holds. */
  function cellsOf(id: string): [number, number][] {
    const r = LEDGER_ASSET_RECOVERY.regions.find((region) => region.id === id)!;
    const out: [number, number][] = [];
    for (let y = r.y + map.cellM / 2; y < r.y + r.heightM; y += map.cellM) {
      for (let x = r.x + map.cellM / 2; x < r.x + r.widthM; x += map.cellM) out.push([x, y]);
    }
    assert.ok(out.length > 0, `${id} holds no cell`);
    return out;
  }

  /** Every point a creature beat places or drives a tag to. */
  function creaturePoints(prefix: string): { x: number; y: number }[] {
    const points = LEDGER_ASSET_RECOVERY.beats.flatMap((beat) =>
      beat.kind === 'creature' && beat.tag.startsWith(prefix)
        ? [beat.driveTo, ...(beat.spawnAt ? [beat.spawnAt] : [])]
        : []
    );
    assert.ok(points.length > 0, `no beat places ${prefix}`);
    return points;
  }

  function assertOn(points: Iterable<readonly [number, number]>, ground: string, what: string) {
    for (const [x, y] of points) assert.equal(groundAt(x, y), ground, `${what} at ${x},${y}`);
  }

  it('seats the spawn and the column on the Rail Head, and counts deliveries there', () => {
    assertOn(
      map.spawns.map((s) => [s.x, s.y] as const),
      RAIL_HEAD,
      'the spawn'
    );
    const column = LEDGER_ASSET_RECOVERY.parties.find((p) => p.slot === PLAYER)!.units;
    assertOn(
      column.map((u) => [u.x, u.y] as const),
      RAIL_HEAD,
      'a column hull'
    );
    assertOn(cellsOf('railhead'), RAIL_HEAD, 'the extraction count');
  });

  it('puts both eruption sites and the whole herd, stampede included, on the Terrace', () => {
    assertOn(
      map.hazards.map((h) => [h.x, h.y] as const),
      TERRACE,
      'an eruption site'
    );
    assertOn(
      creaturePoints('grazer').map((p) => [p.x, p.y] as const),
      TERRACE,
      'the herd'
    );
  });

  it('places the first pack in the Works and brings the second up the Scar', () => {
    assertOn(
      creaturePoints('pack-one').map((p) => [p.x, p.y] as const),
      WORKS,
      'pack one'
    );
    assertOn(
      creaturePoints('pack-two').map((p) => [p.x, p.y] as const),
      SCAR,
      'pack two'
    );
  });

  it('keeps the taps, the cut and the closing fall on Face Six, inside the Scar', () => {
    const taps = LEDGER_ASSET_RECOVERY.parties.flatMap((p) => p.emitters ?? []);
    assertOn(
      taps.map((e) => [e.x, e.y] as const),
      FACE,
      'the taps'
    );
    for (const id of ['face', 'face-cut', 'fall-stage']) assertOn(cellsOf(id), FACE, id);
    // §1: "the Scar around the fallen face". Every cell beside the fall that
    // is not the fall is the wound's raw rock, so whatever is worked at the
    // face is heard through trench water on every side.
    const face = cellsOf('face');
    const isFace = (x: number, y: number) => face.some(([fx, fy]) => fx === x && fy === y);
    for (const [x, y] of face) {
      for (const [dx, dy] of [
        [map.cellM, 0],
        [-map.cellM, 0],
        [0, map.cellM],
        [0, -map.cellM],
      ] as const) {
        if (!isFace(x + dx, y + dy)) assertOn([[x + dx, y + dy]], SCAR, 'beside the fall');
      }
    }
  });

  it('descends from the Rail Head to the fall through the five grounds in order', () => {
    // §9: the Rail Head at 700 m, over the Terrace's shoulder, down the
    // Works' masked ground, across into the Scar, and into the fall where
    // the taps are.
    const taps = LEDGER_ASSET_RECOVERY.parties.flatMap((p) => p.emitters ?? [])[0]!;
    const [from] = map.spawns;
    const crossed: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const g = groundAt(
        from!.x + ((taps.x - from!.x) * i) / 100,
        from!.y + ((taps.y - from!.y) * i) / 100
      );
      if (crossed.at(-1) !== g) crossed.push(g);
    }
    assert.deepEqual(crossed, [RAIL_HEAD, TERRACE, WORKS, SCAR, FACE]);
  });
});
