/**
 * The headline SIG number, against what docs/ui-ux.md §3 says it is (#623).
 *
 * §3's spec row is "**Peak SIG across the player's units**, not the average —
 * the loudest unit is the one that gets you found", and `EchoSnapshot.peakSig`
 * carries the same sentence in its own doc comment. `Match.snapshotsFor` took a
 * max over the player's structures as well, so the number on the bar was the
 * loudest *building* a base owned for most of a match — a Nodule Refinery idles
 * at 65, which is §3's red stop exactly, and a base cannot be told to be
 * quieter. The self-noise bed had already refused the figure on that ground and
 * recomputed its own over units (EchoRenderer.selfAudioFrame, selfMixer.ts),
 * which is how the bar and the band label eight pixels apart came to measure
 * two different sets of hulls.
 *
 * Both tests are written over tables rather than over instances, because the
 * failure is a structure kind nobody thought of. The first iterates every
 * mission in the registry and every faction's opening kit and never names a
 * hull; the second iterates `STRUCTURE_STATS` and never names a structure, so a
 * twelfth kind authored next month is held by a test nobody edits.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent, removeEntity } from 'bitecs';

import {
  Faction,
  SIM,
  STRUCTURE_STATS,
  StructureKind,
  UnitKind,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Owner, Structure, Unit } from '../src/sim/components.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { MISSIONS } from '../src/sim/missions/index.ts';
import { missionMapById } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** §3's own arithmetic, spelled out once so no test reimplements it. */
function unitsPeak(snapshot: EchoSnapshot): number {
  let peak = 0;
  for (const unit of snapshot.units) {
    if (unit.sig > peak) peak = unit.sig;
  }
  return peak;
}

/**
 * Step until the Echo pass publishes, then keep the snapshots.
 *
 * Two passes rather than one: the first is the opening kit standing at its idle
 * figures, and the second is after a mission's tick-zero beats have run, which
 * is where a scripted party's hulls have actually been placed.
 */
function firstPasses(match: Match, passes: number): Map<number, EchoSnapshot>[] {
  const out: Map<number, EchoSnapshot>[] = [];
  for (let tick = 0; tick < SIM.TICK_HZ * 2 && out.length < passes; tick++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots !== null) out.push(snapshots);
  }
  return out;
}

describe('peak SIG is the player’s units and nothing else (§3)', () => {
  it('holds for every seated slot of every mission in the registry', () => {
    // Every mission, not the prologue: five of them run a silence ledger off
    // `flightPeakSig`, and the instrument beside that ledger has to measure a
    // set the player can act on. Which missions those are is not written down
    // here on purpose — the registry is the list.
    let slotsChecked = 0;
    let withStructures = 0;
    for (const mission of MISSIONS) {
      const map = missionMapById(mission.mapId);
      assert.ok(map !== undefined, `${mission.id} names a map that exists`);
      const match = new Match(map, { mission, fauna: false, seed: 11 });
      for (const snapshots of firstPasses(match, 2)) {
        for (const [slot, own] of snapshots) {
          assert.equal(
            own.peakSig,
            unitsPeak(own),
            `${mission.id}, slot ${slot}: peakSig is the max over units`
          );
          slotsChecked++;
          if (own.structures.length > 0) withStructures++;
        }
      }
    }
    assert.ok(slotsChecked >= MISSIONS.length, `${slotsChecked} slot-passes checked`);
    // The assertion above is satisfiable by a peak that happens to ignore an
    // empty list, so say out loud that some of those slots owned buildings.
    assert.ok(withStructures > 0, 'some of those slots owned structures');
  });

  it('holds for every faction’s opening kit, on both seats', () => {
    const factions = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron];
    let loudestStructureSeen = 0;
    let quietestUnitsPeak = Infinity;
    for (const a of factions) {
      for (const b of factions) {
        const match = new Match(undefined, { fauna: false, seed: 3 });
        match.addPlayer(0, a);
        match.addPlayer(1, b);
        for (const snapshots of firstPasses(match, 2)) {
          for (const [slot, own] of snapshots) {
            assert.equal(
              own.peakSig,
              unitsPeak(own),
              `${Faction[a]} vs ${Faction[b]}, slot ${slot}: peakSig is the max over units`
            );
            for (const structure of own.structures) {
              if (structure.sig > loudestStructureSeen) loudestStructureSeen = structure.sig;
            }
            quietestUnitsPeak = Math.min(quietestUnitsPeak, unitsPeak(own));
          }
        }
      }
    }
    // An opening base is audible, so the case this test exists for is live in
    // every one of the sixteen matchups rather than only in theory.
    assert.ok(loudestStructureSeen > 0, `the opening base emits (${loudestStructureSeen})`);
    assert.ok(quietestUnitsPeak < Infinity, 'every seat was read at least once');
  });

  it('no structure kind in the stats table can raise it', () => {
    // One quiet hull and one building, six kilometres apart so that no aura
    // reaches the hull — STRUCTURE_AURAS' widest is the Cantor's 1,200 m, and
    // the Spore Veil's SIG_FACTOR would otherwise *lower* the fleet's own peak
    // and make the comparison below pass for the wrong reason.
    const unitX = 1000;
    const structureX = 7000;

    const kinds = Object.values(STRUCTURE_STATS).map((stats) => stats.kind);
    assert.ok(kinds.length > 0, 'the stats table is populated');

    const baseline = peakOfLoneScout(null);
    assert.ok(baseline.peak > 0, `a Light Scout emits (${baseline.peak})`);

    let louderThanTheFleet = 0;
    for (const kind of kinds) {
      const stats = STRUCTURE_STATS[kind];
      const withIt = peakOfLoneScout(kind);
      assert.equal(
        withIt.peak,
        baseline.peak,
        `${stats.name} (SIG ${withIt.structureSig}) moved the headline number to ${withIt.peak}`
      );
      if (withIt.structureSig > baseline.peak) louderThanTheFleet++;
    }
    // Every kind in the table, as it actually emits, is louder than a Light
    // Scout's idle 6 — so the assertion above is exercising the real case for
    // all eleven rather than passing vacuously on some of them. Counted, not
    // asserted of one kind, because a later kind quieter than a scout is
    // exactly the row that would go vacuous, and this is where it shows up.
    assert.equal(
      louderThanTheFleet,
      kinds.length,
      `${louderThanTheFleet} of ${kinds.length} kinds are louder than the fleet`
    );

    function peakOfLoneScout(kind: StructureKind | null): {
      peak: number;
      structureSig: number;
    } {
      const terrain = new Terrain(14000, 14000, 200);
      const match = new Match(undefined, { fauna: false, seed: 71, terrain });
      match.addPlayer(0, Faction.Bathyarch);
      match.addPlayer(1, Faction.Hadron);
      // The opening kits out of the way: this test is about one hull and one
      // building, and a Caisson at 64 would sit above most of the table.
      for (let eid = 0; eid < Owner.slot.length; eid++) {
        if (!hasComponent(match.world, Owner, eid)) continue;
        if (!hasComponent(match.world, Unit, eid) && !hasComponent(match.world, Structure, eid)) {
          continue;
        }
        removeEntity(match.world, eid);
      }
      spawnUnit(match.world, {
        kind: UnitKind.LightScout,
        slot: 0,
        faction: Faction.Bathyarch,
        x: unitX,
        y: 1000,
      });
      if (kind !== null) {
        spawnStructure(match.world, {
          kind,
          slot: 0,
          faction: Faction.Bathyarch,
          x: structureX,
          y: 1000,
          // Prebuilt, so the figure under test is the authored `sigIdle` rather
          // than a site's construction noise.
          prebuilt: true,
        });
      }
      const passes = firstPasses(match, 1);
      const own = passes[0]?.get(0);
      assert.ok(own !== undefined, 'slot 0 was sent a snapshot');
      let structureSig = 0;
      if (kind !== null) {
        assert.equal(own.structures.length, 1, 'the building is in the payload');
        structureSig = own.structures[0]!.sig;
        // Emitting *something*, rather than its authored `sigIdle`: a Spore
        // Veil stands inside its own cloud, so the table's 20 reaches the wire
        // as 8 (STRUCTURE_AURAS.SPORE_VEIL.SIG_FACTOR, 0.4). The figure that
        // matters here is the one a listener would hear, which is this one.
        assert.ok(structureSig > 0, `${STRUCTURE_STATS[kind].name} emits`);
      }
      assert.equal(own.peakSig, unitsPeak(own), 'peakSig is the max over units');
      return { peak: own.peakSig, structureSig };
    }
  });
});
