/**
 * The Ledger 7 — docs/mission-item-nine.md, against the shared model and a
 * live match.
 *
 * - **The decision's acoustics hold under the real model** (§4): from the
 *   rail, at the chamber's authored ranges, an idle flight is never
 *   classified by the registry watch and a transmitting one always is — at
 *   both propagation extremes the path can take, so the ending can never be
 *   an accident of terrain.
 * - **The ground holds in shapes** (§11, #1147): every authored point, the
 *   rail's cells and the flight's lines to the items and the watch stand on
 *   the ground they stood on when the map was drawn in rectangles.
 * - **The array is pointedly unlocked** (§3): the campaign's last mission
 *   locks the guns and leaves the one button that is the mission.
 * - **The sitting, sat** — the twelve-minute idle run closes Complete, with
 *   the continuance carried, the minutes fully entered from the rail, and no
 *   unsealing anywhere in the record.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  MissionOutcome,
  ResolutionTier,
  SIM,
  detectionRatio,
  thermoclineFactor,
  tierFromRatio,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { LEDGER_ITEM_NINE } from '../src/sim/missions/index.ts';
import { shapeContains } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const T = (minutes: number, seconds = 0): number => (minutes * 60 + seconds) * SIM.TICK_HZ;

describe("the decision's acoustics — docs/mission-item-nine.md §4", () => {
  // The rail at (2000, 1900, 1250 m); the watch at roughly (750, 500, 1150 m),
  // with a Corvette's ears. Both depths sit in the layer's duct, so the pair
  // factor is the duct's own. The path crosses vein and coral paint, so both
  // claims are asserted at both PF extremes the ground can produce.
  const RANGE_M = Math.hypot(2000 - 750, 1900 - 500);
  const WATCH_HYD = 50;
  const DUCT = thermoclineFactor(1250, 1150);
  const PF_BOUNDS = [0.45, 0.8] as const;

  it('keeps an idle flight under Classification at every propagation the path allows', () => {
    for (const pf of PF_BOUNDS) {
      // The loudest idle hull in the flight is a Corvette at 28.
      const tier = tierFromRatio(detectionRatio(28, pf * DUCT, RANGE_M, WATCH_HYD));
      assert.ok(
        tier < ResolutionTier.Classification,
        `an idle flight reads tier ${tier} at PF ${pf} — the lie would be impossible`
      );
    }
  });

  it('classifies a transmission at every propagation the path allows', () => {
    for (const pf of PF_BOUNDS) {
      // Active sonar: SIG 95, omnidirectional, for three seconds — longer
      // than the two the record needs.
      const tier = tierFromRatio(detectionRatio(95, pf * DUCT, RANGE_M, WATCH_HYD));
      assert.ok(
        tier >= ResolutionTier.Classification,
        `a transmission reads tier ${tier} at PF ${pf} — the unsealing would be impossible`
      );
    }
  });
});

describe('the ground the sitting stands on — §11, drawn in shapes (#1147)', () => {
  // The map is drawn in shapes since #1147, and a reshape is new content,
  // never a lever: every place the mission seats a hull or sounds an item
  // stands on the ground it stood on in rectangles. Asked of the painted
  // cells, because the cell is what a hull's floor and PF are read from.
  const map = missionMapById(LEDGER_ITEM_NINE.mapId)!;
  const ground = terrainFor(map);
  const cellM = map.cellM;
  const at = (x: number, y: number) => [
    ground.biomeAt(x, y),
    ground.floorAt(x, y),
    ground.ceilingAt(x, y),
  ];
  const REGIONS = {
    registry: [Biome.ThermalVein, 1250, 0],
    underway: [Biome.CoralRuins, 1350, 0],
  } as const;
  const flight = LEDGER_ITEM_NINE.parties.find(
    (party) => party.slot === LEDGER_ITEM_NINE.playerSlot
  )!;
  const rail = LEDGER_ITEM_NINE.markers.find((marker) => marker.id === 'the-rail')!;
  const registry = map.regions.find((region) => region.note!.startsWith('The Registry'))!;
  /** Every cell centre on the grid. */
  const cells = Array.from({ length: (map.widthM / cellM) * (map.heightM / cellM) }, (_, i) => ({
    x: ((i % (map.widthM / cellM)) + 0.5) * cellM,
    y: (Math.floor(i / (map.widthM / cellM)) + 0.5) * cellM,
  }));

  it('stands every authored point on the ground §11 names for it', () => {
    // Read off the literal, so a point itemNine.ts moves is asked of the
    // ground it moved to; the count keeps a point from dropping out unasked.
    const stands: [string, number, number, keyof typeof REGIONS, number?][] = [];
    for (const spawn of map.spawns) {
      stands.push(['the spawn', spawn.x, spawn.y, 'underway']);
      const fx = spawn.x + spawn.foundryOffsetX;
      const fy = spawn.y + spawn.foundryOffsetY;
      stands.push(['its Foundry', fx, fy, 'underway']);
    }
    stands.push(['the rail', rail.x, rail.y, 'underway']);
    for (const unit of flight.units)
      stands.push([unit.tag, unit.x, unit.y, 'underway', unit.depthM]);
    for (const party of LEDGER_ITEM_NINE.parties) {
      if (party === flight) continue;
      // §6: the items are struck on the old hull; §5: the watch is at the arrays.
      for (const point of party.emitters ?? []) {
        stands.push([point.tag, point.x, point.y, 'underway', point.depthM]);
      }
      for (const unit of party.units) {
        stands.push([unit.tag, unit.x, unit.y, 'registry', unit.depthM]);
      }
    }
    // One spawn and its Foundry, the rail, the flight's three hulls, nine
    // items and the watch's two: §2, §5, §6, §11. Nothing else is placed —
    // no beat carries a position, and the mission authors no region.
    assert.equal(stands.length, 2 + 1 + 3 + 9 + 2, 'every authored point is asked');
    assert.equal(LEDGER_ITEM_NINE.regions.length, 0);
    for (const [what, x, y, region, depthM] of stands) {
      assert.deepEqual(at(x, y), REGIONS[region], `${what} at ${x},${y} stands in ${region}`);
      if (depthM !== undefined) assert.ok(ground.admits(x, y, depthM), `${what} at ${depthM} m`);
    }
  });

  it('keeps every cell centre within the rail on the Underway', () => {
    let near = 0;
    for (const { x, y } of cells) {
      if (Math.hypot(x - rail.x, y - rail.y) > rail.radiusM) continue;
      assert.deepEqual(at(x, y), REGIONS.underway, `the rail's cell at ${x},${y}`);
      near++;
    }
    assert.equal(near, 8, "every cell centre within the rail's 400 m");
  });

  it('holds every cell the box held, and adds one at each end of the middle row', () => {
    // §11: the frame is a cell longer at each end than the box it was, which
    // was 1500, 1500, 1000, 750 until #1147.
    const box = { x: 1500, y: 1500, widthM: 1000, heightM: 750 };
    const underway = map.regions.find((region) => region.note!.startsWith('The Underway'))!;
    const painted = cells.filter(({ x, y }) => shapeContains(underway, x, y));
    const added = painted.filter(({ x, y }) => !shapeContains(box, x, y));
    assert.equal(painted.length - added.length, 12, 'a cell of the box fell out of the hall');
    assert.deepEqual(added, [
      { x: 1375, y: 1875 },
      { x: 2625, y: 1875 },
    ]);
    for (const { x, y } of painted) assert.deepEqual(at(x, y), REGIONS.underway, `${x},${y}`);
  });

  it('carries the flight to the items through ruin water, and to the watch from ruin into vein', () => {
    // §4: the decision's path. Every 10 m of every line from the flight's
    // hulls to the items and the watch, read as the run of biomes it crosses.
    // The items sound in the hall; the watch listens from the arrays.
    const others = LEDGER_ITEM_NINE.parties
      .filter((party) => party !== flight)
      .flatMap((party) => [
        ...(party.emitters ?? []).map((point) => ({ ...point, run: [Biome.CoralRuins] })),
        ...party.units.map((unit) => ({ ...unit, run: [Biome.CoralRuins, Biome.ThermalVein] })),
      ]);
    let lines = 0;
    for (const from of flight.units) {
      for (const to of others) {
        const n = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 10);
        const run: Biome[] = [];
        for (let i = 0; i <= n; i++) {
          const biome = ground.biomeAt(
            from.x + ((to.x - from.x) * i) / n,
            from.y + ((to.y - from.y) * i) / n
          );
          if (run[run.length - 1] !== biome) run.push(biome);
        }
        assert.deepEqual(run, to.run, `${from.tag} to ${to.tag}`);
        lines++;
      }
    }
    assert.equal(lines, 3 * 11, 'every line from the flight to the session and the watch');
  });

  it('floors the Wall and the hall at 1,350 m and the arrays at 1,250, under no roof', () => {
    // §11: the map sits in the layer's duct and just beneath it, and the
    // reshape moved no floor, so every depth the mission authors reaches the
    // water it reached in rectangles.
    for (const { x, y } of cells) {
      const floor = shapeContains(registry, x, y) ? 1250 : 1350;
      assert.equal(ground.floorAt(x, y), floor, `the floor at ${x},${y}`);
      assert.equal(ground.ceilingAt(x, y), 0, `a roof at ${x},${y}`);
    }
  });
});

describe('the sitting, sat — docs/mission-item-nine.md §3, §8', () => {
  it('does not mistake the calendar year for the age of the Board in the fallback', () => {
    assert.equal(
      LEDGER_ITEM_NINE.epilogue[MissionOutcome.Lost],
      'The session did not close. The Underway has held every sitting since the concern was chartered, and the registry opens a file on the interruption.'
    );
  });

  it('leaves the array unlocked, and the guns struck', () => {
    const locked = new Set(LEDGER_ITEM_NINE.locks.map((lock) => lock.ability));
    assert.ok(!locked.has('activeSonar'), 'the one button that is the mission is fenced');
    assert.ok(locked.has('weapons'), 'a weapon entered the Underway');
  });

  it('closes on the continuance when the chair does nothing, minutes entered', () => {
    const map = missionMapById(LEDGER_ITEM_NINE.mapId)!;
    const match = new Match(map, { mission: LEDGER_ITEM_NINE, fauna: false, seed: 73 });
    for (let tick = 0; tick <= T(13, 30); tick++) {
      match.update(STEP_MS);
      if (match.missionOver !== null) break;
    }
    const result = match.missionOver;
    assert.ok(result !== null, 'the session never closed');
    // A conclusion: the mission cannot be lost, only decided (§7).
    assert.equal(result.outcome, MissionOutcome.Complete);
    // The lie's record, and not the other one.
    assert.match(result.epilogue, /The continuance carried/);
    assert.match(result.epilogue, /first false sentence/);
    assert.doesNotMatch(result.epilogue, /unsealed/);
    // The minutes, assembled from the rail: the flight attends the items by
    // being present, and the ninth is called and heard.
    assert.match(result.epilogue, /Item One is entered/);
    assert.match(result.epilogue, /Item Six: the rim field/);
    assert.match(result.epilogue, /Classified by continuance one hundred and twenty-six years/);
  });
});
