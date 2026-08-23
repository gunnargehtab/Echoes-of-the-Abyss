/**
 * Environmental hazards (#105).
 *
 * `docs/hazards.md` specifies eight; two are implemented, chosen to exercise
 * opposite ends of the framework — one that damages hulls and one that
 * attacks information.
 *
 * The property worth pinning down above all others is the **warning phase**.
 * `CLAUDE.md` fixes the target emotion as "dread, not confusion", and an
 * unannounced instant kill teaches a player that the map is arbitrary rather
 * than that it is dangerous. A hazard that damages before it warns is a bug,
 * not a difficulty setting.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Biome,
  Faction,
  HAZARDS,
  HazardPhase,
  MAX_PROPAGATION_FACTOR,
  PROPAGATION_FACTOR,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Acoustic, Health, Position } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** A one-hazard map on flat water, so nothing else is under test. */
function hazardMap(kind: 'geothermal-eruption' | 'resonance-storm', radiusM = 700): MapDefinition {
  return {
    ...VENTFRONT_DIVIDE,
    id: `test-${kind}`,
    regions: [],
    hazards: [{ x: 4000, y: 4000, radiusM, kind }],
  };
}

function matchWith(map: MapDefinition, seed = 31) {
  const match = new Match(map, { fauna: false, seed, terrain: new Terrain(8000, 8000, 250) });
  match.addPlayer(0, Faction.Bathyarch);
  return match;
}

/** Run until the hazard reaches `phase`, returning ticks taken. */
function runUntilPhase(match: Match, phase: HazardPhase, limitS = 200): number {
  for (let i = 0; i < limitS * SIM.TICK_HZ; i++) {
    match.update(STEP_MS);
    if (match.world.hazards[0]!.phase === phase) return i;
  }
  throw new Error(`hazard never reached phase ${phase}`);
}

describe('the hazard lifecycle', () => {
  it('cycles dormant -> warning -> active -> decay -> dormant', () => {
    const match = matchWith(hazardMap('geothermal-eruption'));
    const seen: HazardPhase[] = [];
    let last = match.world.hazards[0]!.phase;
    seen.push(last);

    for (let i = 0; i < 200 * SIM.TICK_HZ && seen.length < 5; i++) {
      match.update(STEP_MS);
      const phase = match.world.hazards[0]!.phase;
      if (phase !== last) {
        seen.push(phase);
        last = phase;
      }
    }

    assert.deepEqual(seen, [
      HazardPhase.Dormant,
      HazardPhase.Warning,
      HazardPhase.Active,
      HazardPhase.Decay,
      HazardPhase.Dormant,
    ]);
  });

  it('never damages anything before it has warned', () => {
    // The rule the whole framework exists to protect. A unit parked on the
    // vent takes nothing at all until the warning has run its course.
    const match = matchWith(hazardMap('geothermal-eruption'));
    const victim = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    const full = Health.hp[victim]!;

    let sawWarning = false;
    for (let i = 0; i < 200 * SIM.TICK_HZ; i++) {
      match.update(STEP_MS);
      const phase = match.world.hazards[0]!.phase;
      if (phase === HazardPhase.Warning) sawWarning = true;
      if (phase === HazardPhase.Active) break;
      assert.equal(Health.hp[victim], full, `damaged during phase ${phase}`);
    }
    assert.ok(sawWarning, 'a hazard must pass through a warning phase');
  });

  it('warns for long enough to walk out of', () => {
    // Sized against the slowest hull in the roster: if a Harvester cannot
    // clear the radius from the centre in the warning window, the warning is
    // decoration.
    const slowest = statsFor(UnitKind.Harvester).speed;
    const map = hazardMap('geothermal-eruption');
    const reach = slowest * HAZARDS.ERUPTION.WARNING_S;
    assert.ok(
      reach >= map.hazards[0]!.radiusM,
      `a Harvester covers ${reach} m in the warning; the plume is ${map.hazards[0]!.radiusM} m`
    );
  });

  it('publishes its phase to every player, because a telegraph must be public', () => {
    const match = matchWith(hazardMap('geothermal-eruption'));
    match.addPlayer(1, Faction.Pelagia);
    let snapshots = null;
    for (let i = 0; i < SIM.TICK_HZ && snapshots === null; i++) snapshots = match.update(STEP_MS);

    for (const snapshot of snapshots!.values()) {
      assert.equal(snapshot.hazards.length, 1);
      assert.equal(snapshot.hazards[0]!.kind, 'geothermal-eruption');
      assert.ok(snapshot.hazards[0]!.remainingS > 0, 'a countdown the HUD can show');
    }
  });
});

describe('geothermal vent eruptions', () => {
  it('damages a hull in the plume and throws it outward', () => {
    const match = matchWith(hazardMap('geothermal-eruption'));
    const victim = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4200,
      y: 4000,
    });
    const full = Health.hp[victim]!;
    runUntilPhase(match, HazardPhase.Active);
    for (let i = 0; i < SIM.TICK_HZ; i++) match.update(STEP_MS);

    assert.ok(Health.hp[victim]! < full, 'the plume should hurt');
    assert.ok(Position.x[victim]! > 4200, 'and push outward from the vent');
  });

  it('makes a caught hull loud, through the ordinary SIG path', () => {
    // The reason an eruption is an acoustic event and not just damage: being
    // hurt and being found are the same moment.
    const match = matchWith(hazardMap('geothermal-eruption'));
    const victim = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    const idle = statsFor(UnitKind.Corvette).sigIdle;

    runUntilPhase(match, HazardPhase.Active);
    for (let i = 0; i < 10; i++) match.update(STEP_MS);
    assert.ok(
      Acoustic.sig[victim]! > idle * 2,
      `caught SIG ${Acoustic.sig[victim]} should dwarf idle ${idle}`
    );
  });

  it('damages structures too, at a reduced rate', () => {
    // doc §1: "Buildings take reduced damage (but still vulnerable)". This is
    // a regression test: the first implementation queried the separation
    // system's unit grid, which holds *units only* — so structures were never
    // found, and STRUCTURE_DAMAGE_MULTIPLIER was documented, tested against
    // nothing, and could never fire.
    const match = matchWith(hazardMap('geothermal-eruption'));
    const building = spawnStructure(match.world, {
      kind: StructureKind.Refinery,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
      prebuilt: true,
    });
    const full = Health.hp[building]!;
    runUntilPhase(match, HazardPhase.Active);
    for (let i = 0; i < SIM.TICK_HZ; i++) match.update(STEP_MS);

    const lost = full - Health.hp[building]!;
    assert.ok(lost > 0, 'a building in a plume is still vulnerable');
    // ...and less than a hull in the same place would lose.
    const hullLoss = HAZARDS.ERUPTION.DAMAGE_PER_S;
    assert.ok(lost < hullLoss, `structure lost ${lost}, a hull would lose about ${hullLoss}`);
  });

  it('hurts organic hulls more, per doc §1', () => {
    const damageTo = (faction: Faction) => {
      const match = matchWith(hazardMap('geothermal-eruption'), 700);
      match.addPlayer(1, faction);
      const victim = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction,
        x: 4000,
        y: 4000,
      });
      const full = Health.hp[victim]!;
      runUntilPhase(match, HazardPhase.Active);
      for (let i = 0; i < 30; i++) match.update(STEP_MS);
      return full - Health.hp[victim]!;
    };

    assert.ok(
      damageTo(Faction.Pelagia) > damageTo(Faction.Directorate),
      'Pelagia suffers extra damage from eruptions'
    );
  });

  it('barely moves the Directorate, per doc §1', () => {
    const pushOn = (faction: Faction) => {
      const match = matchWith(hazardMap('geothermal-eruption'));
      match.addPlayer(1, faction);
      const victim = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction,
        x: 4200,
        y: 4000,
      });
      runUntilPhase(match, HazardPhase.Active);
      for (let i = 0; i < 30; i++) match.update(STEP_MS);
      return Position.x[victim]! - 4200;
    };

    assert.ok(
      pushOn(Faction.Directorate) < pushOn(Faction.Hadron),
      'Directorate hulls resist knockback'
    );
  });

  it('gives Hadron a longer warning, per doc §1', () => {
    // "Can predict eruptions via resonance sensors." Prediction that tells you
    // only what you would have found out anyway is not prediction; more time
    // to act is.
    const warningFor = (faction: Faction) => {
      const match = matchWith(hazardMap('geothermal-eruption'));
      match.addPlayer(1, faction);
      spawnUnit(match.world, {
        kind: UnitKind.LightScout,
        slot: 1,
        faction,
        x: 4300,
        y: 4000,
      });
      runUntilPhase(match, HazardPhase.Warning);
      let ticks = 0;
      while (match.world.hazards[0]!.phase === HazardPhase.Warning) {
        match.update(STEP_MS);
        ticks++;
      }
      return ticks;
    };

    assert.ok(
      warningFor(Faction.Hadron) > warningFor(Faction.Pelagia),
      'a Hadron listener sees it coming sooner'
    );
  });

  it('lets a Bathyarch presence stabilise the vent, per doc §1', () => {
    const dormantFor = (faction: Faction) => {
      const match = matchWith(hazardMap('geothermal-eruption'));
      match.addPlayer(1, faction);
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction,
        x: 4000,
        y: 4000,
      });
      return runUntilPhase(match, HazardPhase.Warning);
    };

    assert.ok(
      dormantFor(Faction.Bathyarch) > dormantFor(Faction.Hadron),
      'a Consortium hull on the vent holds it back'
    );
  });

  it('stabilising is a delay, not a cancellation', () => {
    // A stabilised vent still erupts. Holding one is a commitment, not a
    // solved problem.
    const match = matchWith(hazardMap('geothermal-eruption'));
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    assert.ok(runUntilPhase(match, HazardPhase.Active, 300) > 0);
  });
});

describe('resonance storms', () => {
  it('degrades resolution inside its area without touching detection code', () => {
    // The storm reaches the Echo Layer as a write to the per-cell PF array,
    // which is the array pathPropagation already reads. If this ever needs a
    // branch in the detection maths, the design has gone wrong.
    const match = matchWith(hazardMap('resonance-storm', 2500));
    match.addPlayer(1, Faction.Pelagia);
    const mine = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3400,
      y: 4000,
    });
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4600,
      y: 4000,
    });
    assert.ok(mine > 0);

    const bestTier = () => {
      for (let i = 0; i < SIM.TICK_HZ; i++) {
        const snapshots = match.update(STEP_MS);
        if (snapshots === null) continue;
        return snapshots
          .get(0)!
          .contacts.reduce((top, c) => (c.tier > top ? c.tier : top), ResolutionTier.Silent);
      }
      throw new Error('no snapshot');
    };

    const calm = bestTier();
    runUntilPhase(match, HazardPhase.Active);
    const stormy = bestTier();

    assert.ok(calm > ResolutionTier.Silent, 'the pair should resolve in calm water');
    assert.ok(stormy < calm, `resolution ${calm} -> ${stormy} should degrade in a storm`);
  });

  it('restores propagation exactly when it passes', () => {
    // Recomputed from the biome rather than inverted, so a long match cannot
    // drift and two overlapping storms cannot leave a scar.
    const terrain = new Terrain(2000, 2000, 250);
    terrain.fillRect(0, 0, 2000, 2000, Biome.KelpForest);
    const before = terrain.propagationAt(1000, 1000);

    terrain.applyPropagationModifiers([{ x: 1000, y: 1000, radiusM: 800, scale: 0.35 }]);
    assert.ok(terrain.propagationAt(1000, 1000) < before, 'the storm should mask');

    terrain.applyPropagationModifiers([]);
    assert.equal(terrain.propagationAt(1000, 1000), before, 'and leave nothing behind');
  });

  it('composes overlapping modifiers without drifting', () => {
    const terrain = new Terrain(2000, 2000, 250);
    const baseline = PROPAGATION_FACTOR[Biome.OpenWater];
    for (let round = 0; round < 50; round++) {
      terrain.applyPropagationModifiers([
        { x: 1000, y: 1000, radiusM: 900, scale: 0.5 },
        { x: 1100, y: 1000, radiusM: 900, scale: 0.5 },
      ]);
      terrain.applyPropagationModifiers([]);
    }
    assert.equal(terrain.propagationAt(1000, 1000), baseline, 'fifty cycles, no drift');
  });

  it('never pushes PF past the ceiling the broadphase is sized from', () => {
    // A hazard that raised PF beyond MAX_PROPAGATION_FACTOR would make units
    // audible past the radius the Echo pass is willing to search, which reads
    // as detection silently failing rather than as weather.
    const terrain = new Terrain(2000, 2000, 250);
    terrain.fillRect(0, 0, 2000, 2000, Biome.AbyssalTrench);
    terrain.applyPropagationModifiers([{ x: 1000, y: 1000, radiusM: 900, scale: 10 }]);
    // Compared with a tolerance, because the PF grid is a Float32Array: the
    // double 1.6 stored and read back is 1.60000002..., which is fractionally
    // *above* the ceiling it was clamped to. Real, harmless, and not the thing
    // this test is about.
    assert.ok(terrain.propagationAt(1000, 1000) <= MAX_PROPAGATION_FACTOR + 1e-6);
  });

  it('buffs Hadron ears and destabilises Pelagia hulls, per doc §5', () => {
    // One faction per match, deliberately. The first version put a Hadron
    // corvette and a Pelagia one 100 m apart inside the same storm — they
    // promptly shot each other, and the assertion was then reading component
    // data belonging to a freed entity. bitecs leaves that data in place, so
    // the read succeeded and lied.
    const inStorm = (faction: Faction) => {
      const match = matchWith(hazardMap('resonance-storm', 2500));
      match.addPlayer(1, faction);
      const unit = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction,
        x: 4000,
        y: 4000,
      });
      runUntilPhase(match, HazardPhase.Active);
      for (let i = 0; i < 5; i++) match.update(STEP_MS);
      return { hyd: Acoustic.hyd[unit]!, sig: Acoustic.sig[unit]! };
    };

    const baseHyd = statsFor(UnitKind.Corvette).hyd;
    const baseSig = statsFor(UnitKind.Corvette).sigIdle;

    assert.ok(inStorm(Faction.Hadron).hyd > baseHyd, 'Hadron gain in a storm');
    assert.ok(inStorm(Faction.Pelagia).sig > baseSig, 'Pelagia become unstable and loud');
    assert.equal(inStorm(Faction.Directorate).hyd, baseHyd, 'and the Directorate is untouched');
  });

  it('slows Consortium machinery in a storm, per doc §5', () => {
    const distanceCovered = (faction: Faction) => {
      const match = matchWith(hazardMap('resonance-storm', 3000));
      match.addPlayer(1, faction);
      const unit = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction,
        x: 3200,
        y: 4000,
      });
      runUntilPhase(match, HazardPhase.Active);
      const from = Position.x[unit]!;
      match.orderMove(1, unit, 4800, 4000);
      for (let i = 0; i < SIM.TICK_HZ * 2; i++) match.update(STEP_MS);
      return Position.x[unit]! - from;
    };

    assert.ok(
      distanceCovered(Faction.Bathyarch) < distanceCovered(Faction.Hadron),
      'Consortium machinery malfunctions in a storm'
    );
  });

  it('reports the Echo pass cost with a storm running', () => {
    const match = matchWith(hazardMap('resonance-storm', 3000), 44);
    for (let slot = 1; slot < 4; slot++) match.addPlayer(slot, slot as Faction);
    for (let i = 0; i < 40; i++) {
      spawnUnit(match.world, {
        kind: (i % 5) as UnitKind,
        slot: i % 4,
        faction: (i % 4) as Faction,
        x: 2500 + ((i * 197) % 3000),
        y: 2500 + ((i * 331) % 3000),
      });
    }
    runUntilPhase(match, HazardPhase.Active);
    for (let i = 0; i < SIM.TICK_HZ * 3; i++) match.update(STEP_MS);

    console.log(
      `echo pass with a storm active: ${match.worstEchoPassMs.toFixed(3)} ms worst case, ` +
        `budget ${SIM.ECHO_BUDGET_MS} ms`
    );
    assert.ok(match.world.hazards[0]!.phase !== undefined);
  });
});
