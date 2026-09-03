/**
 * Thermal Draw — a rate, not a stockpile (#108).
 *
 * docs/economy.md §2: "consumed continuously rather than stockpiled". That is
 * the whole design, and it is the property most easily lost in a refactor —
 * a rate and a small stockpile look almost identical in code and behave
 * completely differently at the table. A stockpile lets a player save up and
 * spend when they choose; a rate makes capacity a standing commitment tied to
 * a place on the map.
 *
 * The other property worth pinning down is that a deficit is **recoverable**.
 * A frozen production line is a spiral: a player cannot build the tap that
 * would fix it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Biome,
  Faction,
  HazardPhase,
  SIM,
  StructureKind,
  THERMAL_DRAW,
  UnitKind,
  structureStatsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Health } from '../src/sim/components.ts';
import { drawFor } from '../src/sim/systems/thermal.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** Flat open water with a vein band down the middle, and no hazards. */
function veinTerrain(): Terrain {
  const terrain = new Terrain(8000, 8000, 250);
  terrain.fillRect(0, 3500, 8000, 1000, Biome.ThermalVein);
  return terrain;
}

function veinMap(): MapDefinition {
  return { ...VENTFRONT_DIVIDE, id: 'test-vein', regions: [], hazards: [] };
}

function matchOnVeins(seed = 51) {
  const match = new Match(veinMap(), { fauna: false, seed, terrain: veinTerrain() });
  match.addPlayer(0, Faction.Bathyarch);
  return match;
}

function advance(match: Match, seconds: number) {
  let last = null;
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots !== null) last = snapshots;
  }
  return last;
}

describe('draw is a rate', () => {
  it('never accumulates, however long a surplus runs', () => {
    // The property that separates this from every other resource in the game.
    // A stockpile would climb; a rate reports the same number forever.
    const match = matchOnVeins();
    const first = advance(match, 2)!.get(0)!.draw;
    const later = advance(match, 60)!.get(0)!.draw;

    assert.equal(later.capacity, first.capacity, 'capacity is a rate, not a total');
    assert.equal(later.demand, first.demand);
    assert.ok(first.capacity > 0, 'and there is some capacity to not accumulate');
  });

  it('starts the opening kit self-sufficient', () => {
    // A pre-built Foundry with no supply would start every match in deficit,
    // making a vent tap a compulsory opening rather than a choice.
    const draw = advance(matchOnVeins(), 2)!.get(0)!.draw;
    assert.equal(draw.satisfaction, 1, `opening satisfaction ${draw.satisfaction}`);
    assert.ok(draw.capacity >= draw.demand);
  });

  it('falls into deficit as a player expands, and recovers with a tap', () => {
    const match = matchOnVeins(52);
    advance(match, 1);

    // A second Foundry: growth the Bastion's own plant cannot carry.
    spawnStructure(match.world, {
      kind: StructureKind.Foundry,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 2000,
      y: 2000,
      prebuilt: true,
    });
    const starved = advance(match, 1)!.get(0)!.draw;
    assert.ok(starved.satisfaction < 1, `expected a deficit, got ${starved.satisfaction}`);

    // ...and a tap on the vein band fixes it, immediately.
    spawnStructure(match.world, {
      kind: StructureKind.VentTap,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 4000,
      prebuilt: true,
    });
    const fixed = advance(match, 1)!.get(0)!.draw;
    assert.ok(fixed.satisfaction > starved.satisfaction, 'a tap must relieve the deficit');
  });

  it('never starves a line to a standstill', () => {
    // A frozen line is a spiral: you cannot build the tap that would fix it.
    const match = matchOnVeins(53);
    advance(match, 1);
    for (let i = 0; i < 6; i++) {
      spawnStructure(match.world, {
        kind: StructureKind.Foundry,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 1200 + i * 500,
        y: 6000,
        prebuilt: true,
      });
    }
    const draw = advance(match, 1)!.get(0)!.draw;
    assert.ok(
      draw.satisfaction >= THERMAL_DRAW.MIN_SATISFACTION,
      `satisfaction ${draw.satisfaction} fell below the floor`
    );
    assert.ok(draw.satisfaction > 0);
  });

  it('stops counting a tap the moment it dies', () => {
    // Recomputed every tick rather than tracked incrementally, so there is no
    // state to forget to subtract.
    const match = matchOnVeins(54);
    const tap = spawnStructure(match.world, {
      kind: StructureKind.VentTap,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 4000,
      prebuilt: true,
    });
    const withTap = advance(match, 1)!.get(0)!.draw.capacity;

    Health.hp[tap] = -1;
    advance(match, 1);
    const withoutTap = drawFor(match.world, 0).capacity;
    assert.ok(withoutTap < withTap, `${withTap} -> ${withoutTap} when the tap dies`);
  });

  it('does not count a tap that is still being built', () => {
    const match = matchOnVeins(55);
    const before = advance(match, 1)!.get(0)!.draw.capacity;
    spawnStructure(match.world, {
      kind: StructureKind.VentTap,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 4000,
    });
    assert.equal(advance(match, 1)!.get(0)!.draw.capacity, before, 'a site powers nothing');
  });
});

describe('the vent tap', () => {
  it('may only be placed on Thermal Vein terrain', () => {
    const match = matchOnVeins(56);
    advance(match, 1);
    const spawn = veinMap().spawns[0]!;

    // Open water beside the base: refused, however much the client asks.
    assert.equal(
      match.build(0, StructureKind.VentTap, spawn.x + 400, spawn.y),
      false,
      'a tap needs a vent'
    );
  });

  it('can actually be built, by expanding toward the vents', () => {
    // The whole placement path, not a direct spawn: cost, anchoring, terrain.
    // A tap is two build-hops from the opening base on this map, which is the
    // commitment the resource is supposed to demand — capacity tied to a place
    // you have to reach and then hold.
    const match = matchOnVeins(60);
    advance(match, 1);
    const spawn = veinMap().spawns[0]!;

    // Hop one: a refinery partway toward the band, inside build range.
    const hop = match.build(0, StructureKind.Refinery, spawn.x, spawn.y + 1200);
    assert.ok(hop, 'the first hop should be legal');
    advance(match, 50);

    // Hop two: the tap itself, on the vein band and in range of the refinery.
    assert.ok(
      // y = 3550: inside the 3500-4500 vein band, and 1,150 m from the
      // refinery — one hop under the 1,500 m build radius, and 2,350 m from
      // the base, which is why it is still two hops and not one.
      match.build(0, StructureKind.VentTap, spawn.x, spawn.y + 2350),
      'a tap on the vein band, anchored to the refinery, should be legal'
    );
    advance(match, 40);

    const draw = advance(match, 2)!.get(0)!.draw;
    assert.ok(
      draw.capacity > structureStatsFor(StructureKind.Bastion).drawCapacity!,
      `capacity ${draw.capacity} should exceed the Bastion's own plant`
    );
  });

  it('is loud, in the band the doc specifies', () => {
    // SPEC — docs/economy.md §2: "55-75 sustained at the tap". The tap is loud
    // precisely where the terrain is quiet, which is the tension the whole
    // resource exists to create.
    const stats = structureStatsFor(StructureKind.VentTap);
    assert.ok(stats.sigIdle >= 55 && stats.sigIdle <= 75, `idle SIG ${stats.sigIdle}`);
    assert.ok(stats.sigActive >= 55 && stats.sigActive <= 75, `active SIG ${stats.sigActive}`);
    assert.equal(stats.requiresBiome, Biome.ThermalVein);
  });

  it('is louder than the vein it sits in can hide', () => {
    // The point of the structure: a tap turns your best hiding place into a
    // beacon. If a tap in a vein were quieter than an idle Corvette in open
    // water, holding one would carry no risk at all.
    const match = matchOnVeins(57);
    match.addPlayer(1, Faction.Pelagia);
    spawnStructure(match.world, {
      kind: StructureKind.VentTap,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
      prebuilt: true,
    });
    spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5600,
      y: 4000,
    });

    let heard = false;
    for (let i = 0; i < SIM.TICK_HZ * 3 && !heard; i++) {
      const snapshots = match.update(STEP_MS);
      if (snapshots === null) continue;
      heard = snapshots.get(1)!.contacts.length > 0;
    }
    assert.ok(heard, 'a scout 1.6 km away should hear a working tap through a vein');
  });
});

describe('vents and taps together', () => {
  it('lets a Consortium hull convert a stabilised vent into capacity', () => {
    // docs/hazards.md §1's "energy boosts", read as *energy* now that the
    // power resource exists: the first implementation paid nodules because
    // Thermal Draw did not exist yet.
    const map: MapDefinition = {
      ...VENTFRONT_DIVIDE,
      id: 'test-stabilise',
      regions: [],
      hazards: [{ x: 4000, y: 4000, radiusM: 700, kind: 'geothermal-eruption' }],
    };
    const match = new Match(map, { fauna: false, seed: 58, terrain: veinTerrain() });
    match.addPlayer(0, Faction.Bathyarch);
    const baseline = advance(match, 1)!.get(0)!.draw.capacity;

    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    // Observe the run: stabilisation accrues while the vent is dormant.
    let best = baseline;
    for (let i = 0; i < SIM.TICK_HZ * 20; i++) {
      const snapshots = match.update(STEP_MS);
      if (snapshots === null) continue;
      if (match.world.hazards[0]!.phase !== HazardPhase.Dormant) break;
      best = Math.max(best, snapshots.get(0)!.draw.capacity);
    }
    assert.ok(best > baseline, `capacity ${baseline} -> ${best} while stabilising`);
  });

  it('lets an eruption destroy the tap sitting on it', () => {
    // The interaction the issue asks to get right. The best tap sites are in
    // the vein band, which is exactly where vents erupt: a tap is a raid
    // target and a weather casualty both.
    const map: MapDefinition = {
      ...VENTFRONT_DIVIDE,
      id: 'test-erupt-tap',
      regions: [],
      hazards: [{ x: 4000, y: 4000, radiusM: 700, kind: 'geothermal-eruption' }],
    };
    const match = new Match(map, { fauna: false, seed: 59, terrain: veinTerrain() });
    match.addPlayer(0, Faction.Bathyarch);
    const tap = spawnStructure(match.world, {
      kind: StructureKind.VentTap,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
      prebuilt: true,
    });
    const full = Health.hp[tap]!;

    for (let i = 0; i < SIM.TICK_HZ * 200; i++) {
      match.update(STEP_MS);
      if (match.world.hazards[0]!.phase === HazardPhase.Decay) break;
    }
    assert.ok(Health.hp[tap]! < full, 'a vent damages the tap bolted to it');
  });
});
