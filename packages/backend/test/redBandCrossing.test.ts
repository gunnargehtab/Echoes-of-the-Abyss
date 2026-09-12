/**
 * The red-band crossing (#623) — docs/ui-ux.md §3.
 *
 * "When a unit crosses into the red band, the meter flashes once and the
 * contact log records it." The flash is drawable from the snapshot the client
 * already holds; the record is not, because the client sees `peakSig` — a max
 * — and a second hull going loud under a louder one never moves it.
 *
 * What this file pins is the *edge*, which is the only part a level test could
 * not: that a hull above the stop raises the event once and not on every one
 * of the sixty ticks a second it stays there, that quietening re-arms it, that
 * a structure cannot raise it however loud it idles, and that the number the
 * event fires on is the same one the meter colours on.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEPTH,
  Faction,
  SIG_BANDS,
  SIM,
  SelfEventKind,
  StructureKind,
  UnitKind,
  structureStatsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Acoustic } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const MAP_M = 8000;

/** Open water, no regions, no hazards: nothing else may touch these numbers. */
const PLAIN: MapDefinition = { ...VENTFRONT_DIVIDE, id: 'test-red-band', regions: [], hazards: [] };

function plainMatch(seed = 623): Match {
  return new Match(PLAIN, { fauna: false, seed, terrain: new Terrain(MAP_M, MAP_M, 250) });
}

/** Collect every snapshot over the next `seconds` of simulation. */
function snapshotsOver(match: Match, seconds: number): Map<number, EchoSnapshot>[] {
  const out: Map<number, EchoSnapshot>[] = [];
  for (let i = 0; i < Math.round(seconds * SIM.TICK_HZ); i++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots !== null) out.push(snapshots);
  }
  return out;
}

const crossingsIn = (frames: Map<number, EchoSnapshot>[], slot: number): number[] =>
  frames.flatMap((frame) =>
    (frame.get(slot)?.selfEvents ?? [])
      .filter((event) => event.kind === SelfEventKind.WentLoud)
      .map((event) => event.unitId)
  );

describe('the red-band crossing', () => {
  it('is raised once on the way in, however long the hull stays loud', () => {
    const match = plainMatch();
    match.addPlayer(0, Faction.Bathyarch);
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });

    // Descent is the mechanic, not a poke at the number: DEPTH.DESCENT_SIG is
    // 72 and is a *floor*, so a diving hull is over §3's stop whatever else it
    // is doing (docs/systems-depth.md §2, "you cannot dive quietly").
    assert.ok(DEPTH.DESCENT_SIG >= SIG_BANDS.RED, 'the fixture depends on descent being red');
    assert.equal(match.orderDepth(0, hull, 1200), true);

    // Twelve seconds of a dive the hull has not finished: it descends at 45 m/s
    // from 600 m, so it is still blowing ballast at the end of the window and
    // has been over the stop for every one of the 720 ticks in it.
    const frames = snapshotsOver(match, 12);
    assert.ok(
      Acoustic.sig[hull]! >= SIG_BANDS.RED,
      'the window has to end with the hull still loud, or this asserts nothing'
    );
    assert.ok(frames.length >= 12 * SIM.ECHO_HZ - 1, 'the window has to carry its snapshots');
    assert.deepEqual(crossingsIn(frames, 0), [hull], 'one crossing, for the hull that crossed');
  });

  it('re-arms when the hull falls back below the stop', () => {
    const match = plainMatch();
    match.addPlayer(0, Faction.Bathyarch);
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });

    assert.equal(match.orderDepth(0, hull, 1000), true);
    const first = crossingsIn(snapshotsOver(match, 12), 0);
    assert.equal(match.orderDepth(0, hull, 2000), true);
    const second = crossingsIn(snapshotsOver(match, 12), 0);

    // A hull that dived, arrived and dived again has been found twice, and is
    // entitled to be told twice — the discipline SourBleed already carries.
    assert.deepEqual(first, [hull]);
    assert.deepEqual(second, [hull]);
  });

  it('is not raised for a hull that is already loud when it spawns', () => {
    // The latch starts clear, so a hull whose very first tick is red raises the
    // crossing on that tick. That is correct rather than a corner: it did go
    // loud, and the row is the first thing the player learns about it.
    const match = plainMatch();
    match.addPlayer(0, Faction.Bathyarch);
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    const quiet = crossingsIn(snapshotsOver(match, 3), 0);
    assert.deepEqual(quiet, [], 'an idling Corvette is nowhere near the red stop');
    assert.ok(Acoustic.sig[hull]! < SIG_BANDS.RED);
  });

  it('cannot be raised by any structure kind, however loud it idles', () => {
    // Written as a property over the stats table rather than against the one
    // building that made #623 visible, so a structure added next month is
    // covered without anyone editing this test. The Nodule Refinery idles at
    // 65 — exactly the red stop — and a base cannot be told to be quieter,
    // which is the same argument that took structures out of `peakSig`.
    const match = plainMatch();
    match.addPlayer(0, Faction.Bathyarch);

    const kinds = Object.values(StructureKind).filter(
      (k): k is StructureKind => typeof k === 'number'
    );
    let loudest = 0;
    kinds.forEach((kind, i) => {
      // Prebuilt, so each one sits at its authored idle figure rather than at
      // CONSTRUCTION.SITE_SIG — the whole point is the loudness a building
      // keeps forever, not the minute it spends being put up.
      spawnStructure(match.world, {
        kind,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 1000 + i * 400,
        y: 1000,
        prebuilt: true,
      });
      loudest = Math.max(loudest, structureStatsFor(kind).sigIdle);
    });
    assert.ok(kinds.length > 0, 'the fixture must actually place buildings');
    assert.ok(loudest >= SIG_BANDS.RED, 'at least one structure kind must reach the red stop');

    const crossings = crossingsIn(snapshotsOver(match, 6), 0);
    assert.deepEqual(crossings, [], 'no structure may write a row the player cannot act on');
  });

  it('tells the owner and nobody else', () => {
    const match = plainMatch();
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    assert.equal(match.orderDepth(0, hull, 1200), true);

    const frames = snapshotsOver(match, 12);
    assert.deepEqual(crossingsIn(frames, 0), [hull]);
    assert.deepEqual(
      crossingsIn(frames, 1),
      [],
      'a self-event is own information: hearing somebody else go loud is the Echo pass job'
    );
  });
});
