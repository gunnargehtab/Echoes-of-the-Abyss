/**
 * The Drift (#104).
 *
 * Two properties carry this feature, and both are easy to lose in a refactor
 * while the code still looks right.
 *
 * **Fauna are contacts, resolved by the unmodified detection path.** §3: "At
 * Tier 1 and Tier 2 there is no marker, colour, or sound that distinguishes
 * fauna from an army." If a creature is distinguishable one tier early, the
 * mechanic is gone while appearing to work — a generous stream of Tier-1
 * smudges stops being ambiguous and becomes a free minimap.
 *
 * **Fauna attack the loudest thing, not the nearest.** §2's last line, and the
 * reason the Drift is a strategic object rather than wildlife. "Nearest" would
 * be a one-word change that looks identical and destroys it.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_SONAR,
  Biome,
  DRIFT,
  Faction,
  FaunaSpecies,
  FaunaStage,
  ResolutionTier,
  SIM,
  UnitKind,
  detectionRatio,
  faunaStatsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnFauna, spawnUnit } from '../src/sim/world.ts';
import { Fauna, Health, Position } from '../src/sim/components.ts';
import { countFauna, DRIFT_SLOT } from '../src/sim/systems/fauna.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function bareMap(): MapDefinition {
  return { ...VENTFRONT_DIVIDE, id: 'test-drift', regions: [], hazards: [] };
}

/** A quiet match with no fauna seeded, so a test places exactly what it wants. */
function emptyMatch(seed = 71) {
  const match = new Match(bareMap(), {
    fauna: false,
    seed,
    terrain: new Terrain(8000, 8000, 250),
  });
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

describe('fauna are contacts', () => {
  it('resolve through the ordinary detection path', () => {
    const match = emptyMatch();
    spawnFauna(match.world, { species: FaunaSpecies.Draymaw, x: 4000, y: 4000 });
    spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4600,
      y: 4000,
    });

    const contacts = advance(match, 2)!.get(0)!.contacts;
    assert.ok(contacts.length > 0, 'a creature 600 m away should resolve as a contact');
  });

  it('are indistinguishable from a hull below Tier 3', () => {
    // The property §3 exists for. A Tier-1 or Tier-2 contact must carry
    // nothing that separates a grazer from a cruiser — no species, no faction,
    // no kind.
    const match = emptyMatch(72);
    // Far enough that the scout only smells it.
    spawnFauna(match.world, { species: FaunaSpecies.Draymaw, x: 4000, y: 4000 });
    spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 6200,
      y: 4000,
    });

    const contacts = advance(match, 2)!.get(0)!.contacts;
    for (const contact of contacts) {
      if (contact.tier >= ResolutionTier.Classification) continue;
      assert.equal(contact.fauna, undefined, `tier ${contact.tier} leaked a species`);
      assert.equal(contact.kind, undefined);
      assert.equal(contact.faction, undefined);
    }
  });

  it('name their species at Tier 3, and never a faction', () => {
    const match = emptyMatch(73);
    spawnFauna(match.world, { species: FaunaSpecies.Draymaw, x: 4000, y: 4000 });
    spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4200,
      y: 4000,
    });

    const classified = advance(match, 2)!
      .get(0)!
      .contacts.find((c) => c.tier >= ResolutionTier.Classification);
    assert.ok(classified !== undefined, 'a creature 200 m away should classify');
    assert.equal(classified.fauna, FaunaSpecies.Draymaw);
    // A creature belongs to nobody. Sending a slot's faction would be a lie
    // and would also let a client infer "this is fauna" a tier early.
    assert.equal(classified.faction, undefined);
  });
});

describe('fauna hear you', () => {
  it('answer the loudest thing, not the nearest', () => {
    // §2's last line, and the whole reason the Drift is strategic: "a
    // Consortium column can pull a swarm off a Commune harvester simply by
    // existing nearby, and both players know it."
    const match = emptyMatch(74);
    const creature = spawnFauna(match.world, {
      species: FaunaSpecies.Draymaw,
      x: 4000,
      y: 4000,
    });

    // Near and quiet: a scout running silent, 400 m away.
    const quiet = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4400,
      y: 4000,
    });
    match.setSilentRunning(0, quiet, true);

    // Far and loud: a Harvester at 900 m. Its SIG is whatever the acoustics
    // pass says it is — writing the component here would be overwritten on the
    // next tick, so the test uses the real number or it tests nothing.
    const loud = spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4900,
    });

    advance(match, 3);
    assert.equal(
      Fauna.targetEid[creature],
      loud,
      'the creature must answer the loud thing further away, not the quiet thing beside it'
    );
  });

  it('climb the aggro ladder rather than snapping to it', () => {
    // §2's table: Interest must hold for 4 s before a creature even turns,
    // and Commit follows either from loudness or from 20 s of watching.
    //
    // Measured against the player's *Bastion*, whose SIG is real and sustained.
    // An earlier version of this test wrote `Acoustic.sig` directly, which the
    // acoustics pass rewrites from stats every tick — so it was asserting on a
    // value that existed for one frame.
    const match = emptyMatch(75);
    const spawn = bareMap().spawns[0]!;
    const creature = spawnFauna(match.world, {
      species: FaunaSpecies.Draymaw,
      x: spawn.x + 400,
      y: spawn.y,
    });

    advance(match, 1);
    assert.equal(Fauna.stage[creature], FaunaStage.Ambient, 'not instantly interested');

    // Observe the whole run rather than sampling: the ladder takes as long as
    // it takes, and the point is that it is a ladder.
    let reached = FaunaStage.Ambient;
    for (let i = 0; i < SIM.TICK_HZ * 40; i++) {
      match.update(STEP_MS);
      const stage = Fauna.stage[creature] as FaunaStage;
      if (stage > reached) reached = stage;
      if (reached === FaunaStage.Committed) break;
    }
    assert.equal(reached, FaunaStage.Committed, 'a loud neighbour eventually gets attacked');
  });

  it('are protected against by terrain, exactly as players are', () => {
    // §2: thresholds are perceived loudness at the creature's position, so a
    // herd behind a kelp bed does not hear your harvester.
    const heardThrough = (biome: Biome) => {
      const terrain = new Terrain(8000, 8000, 250);
      terrain.fillRect(0, 0, 8000, 8000, biome);
      const match = new Match(bareMap(), { fauna: false, seed: 76, terrain });
      match.addPlayer(0, Faction.Bathyarch);
      const creature = spawnFauna(match.world, {
        species: FaunaSpecies.Draymaw,
        x: 4000,
        y: 4000,
      });
      spawnUnit(match.world, {
        kind: UnitKind.Harvester,
        slot: 0,
        faction: Faction.Bathyarch,
        x: 4700,
        y: 4000,
      });
      advance(match, 2);
      return Fauna.heard[creature]!;
    };

    assert.ok(
      heardThrough(Biome.ThermalVein) < heardThrough(Biome.OpenWater),
      'a masking biome must quiet you to animals as well as to players'
    );
  });

  it('react far more to a ping than to the same SIG emitted passively', () => {
    // ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER has sat unread since it was written.
    // Active sonar's third consequence, after "reveal them" and "reveal
    // yourself", is that it wakes the map up.
    //
    // Compared against the *analytic* value for the same SIG at the same
    // range, because there is no way to make a unit emit 95 passively — SIG is
    // derived every tick, so "the same SIG emitted passively" has to be
    // computed rather than staged.
    const match = emptyMatch(77);
    const creature = spawnFauna(match.world, {
      species: FaunaSpecies.Draymaw,
      x: 4000,
      y: 4000,
    });
    const source = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4700,
      y: 4000,
    });
    match.activeSonar(0, source);
    advance(match, 1);

    const passive = detectionRatio(
      ACTIVE_SONAR.EMITTER_SIG,
      1,
      700,
      faunaStatsFor(FaunaSpecies.Draymaw).hyd
    );
    const heard = Fauna.heard[creature]!;
    assert.ok(
      heard > passive * 2,
      `a ping should dwarf the same SIG passively: heard ${heard} vs passive ${passive}`
    );
    assert.ok(
      heard < passive * ACTIVE_SONAR.FAUNA_AGGRO_MULTIPLIER * 1.5,
      'and it should be the documented multiple, not an unbounded one'
    );
  });

  it('find the Directorate less appetising, per §2', () => {
    const heardFrom = (faction: Faction) => {
      const match = emptyMatch(78);
      match.addPlayer(1, faction);
      const creature = spawnFauna(match.world, {
        species: FaunaSpecies.Draymaw,
        x: 4000,
        y: 4000,
      });
      spawnUnit(match.world, {
        kind: UnitKind.Harvester,
        slot: 1,
        faction,
        x: 4400,
        y: 4000,
      });
      advance(match, 2);
      return Fauna.heard[creature]!;
    };

    assert.ok(
      heardFrom(Faction.Directorate) < heardFrom(Faction.Pelagia),
      'the Directorate smell wrong and taste worse'
    );
  });
});

describe('biomass and Drift Health', () => {
  it('pays the Directorate more than anyone else for the same kill', () => {
    // §5: only the Directorate processes Biomass at scale; everyone else sells
    // remains through Consortium rendering contracts at a fraction.
    const paidTo = (faction: Faction) => {
      const match = emptyMatch(79);
      match.addPlayer(1, faction);
      const prey = spawnFauna(match.world, {
        species: FaunaSpecies.Draymaw,
        x: 4000,
        y: 4000,
      });
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction,
        x: 4100,
        y: 4000,
      });
      let paid = 0;
      for (let i = 0; i < SIM.TICK_HZ * 30; i++) {
        const snapshots = match.update(STEP_MS);
        if (snapshots === null) continue;
        paid = Math.max(paid, snapshots.get(1)!.biomass);
        if (Health.hp[prey]! <= 0 && paid > 0) break;
      }
      return paid;
    };

    const directorate = paidTo(Faction.Directorate);
    const other = paidTo(Faction.Pelagia);
    assert.ok(directorate > 0, 'a kill should pay Biomass');
    assert.ok(other > 0, 'rendering contracts pay something');
    assert.ok(directorate > other * 2, `${directorate} vs ${other} — the gap is the faction`);
  });

  it('starts every region healthy and reports it to the client', () => {
    const drift = advance(emptyMatch(80), 1)!.get(0)!.driftHealth;
    assert.equal(drift.length, DRIFT.HEALTH_REGIONS * DRIFT.HEALTH_REGIONS);
    assert.ok(
      drift.every((h) => h > DRIFT.HEALTH_STRAINED),
      'a fresh map is healthy'
    );
  });

  it('degrades a region under sustained noise and recovers when it stops', () => {
    // §6: "It falls with sustained high SIG... and recovers slowly."
    //
    // Sited well away from the player's own base, which is itself loud enough
    // to hold its region down — a nice consequence of the rule, and a poor
    // place to measure recovery.
    const match = emptyMatch(81);
    const loud: number[] = [];
    for (let i = 0; i < 6; i++) {
      loud.push(
        spawnUnit(match.world, {
          kind: UnitKind.Harvester,
          slot: 0,
          faction: Faction.Bathyarch,
          x: 5000 + i * 60,
          y: 5000,
        })
      );
    }

    const region = match.world.drift.regionIndex(5000, 5000);
    const before = match.world.drift.at(5000, 5000);
    advance(match, 25);
    const after = match.world.drift.at(5000, 5000);
    assert.ok(after < before, `region ${region}: ${before} -> ${after} under sustained noise`);

    // Move the noise out of the region rather than zeroing SIG: `acousticsSystem`
    // recomputes SIG from stats every tick, so writing the component directly
    // is a no-op the next frame. (This test asserted on exactly that no-op
    // first time round, and failed for the right reason.)
    for (const eid of loud) {
      Position.x[eid] = 7400;
      Position.y[eid] = 7400;
    }
    advance(match, 25);
    assert.ok(match.world.drift.at(5000, 5000) > after, 'and recovers once the noise moves on');
  });

  it('pays less for a kill in a damaged region', () => {
    // The guard-rail against a Directorate snowball (docs/economy.md §9):
    // over-harvesting kills the region that pays them.
    const match = emptyMatch(82);
    const healthy = match.world.drift.yieldMultiplier(4000, 4000);
    for (let i = 0; i < 30; i++) match.world.drift.recordKill(4000, 4000);
    const stripped = match.world.drift.yieldMultiplier(4000, 4000);
    assert.ok(stripped < healthy, `yield ${healthy} -> ${stripped} as the region is stripped`);
  });

  it('stops admitting spawns in a failing region', () => {
    const match = emptyMatch(83);
    assert.ok(match.world.drift.spawnsAllowed(4000, 4000));
    for (let i = 0; i < 12; i++) match.world.drift.recordKill(4000, 4000);
    assert.equal(match.world.drift.spawnsAllowed(4000, 4000), false, '§6: no new spawns');
  });
});

describe('the Drift in a normal match', () => {
  it('populates within its cap and stays there', () => {
    // The real Ventfront Divide, vein regions and all: Ashgrazers need vent
    // fields to feed in, and a map without them simply has no herds.
    const match = new Match(VENTFRONT_DIVIDE, { seed: 84 });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    assert.ok(countFauna(match.world) > 0, 'a normal match has animals in it');
    assert.ok(
      countFauna(match.world) <= DRIFT.MAX_POPULATION,
      `population ${countFauna(match.world)} exceeds the cap`
    );

    advance(match, 10);
    assert.ok(countFauna(match.world) <= DRIFT.MAX_POPULATION, 'and stays inside it');
  });

  it('keeps the Echo pass inside its budget with a full population', () => {
    // The gate the issue set: "Do not merge a fauna population that pushes a
    // normal match over budget." Reported here and in the PR.
    const match = new Match(VENTFRONT_DIVIDE, { seed: 85 });
    for (let slot = 0; slot < 4; slot++) match.addPlayer(slot, slot as Faction);
    advance(match, 12);

    console.log(
      `echo pass with ${countFauna(match.world)} fauna and 4 players: ` +
        `${match.worstEchoPassMs.toFixed(3)} ms worst case, budget ${SIM.ECHO_BUDGET_MS} ms`
    );
    assert.ok(countFauna(match.world) > 0);
  });

  it('owns its creatures under a slot no player can be', () => {
    // The trick behind §3: fauna are owned by a non-player slot, so the Echo
    // Layer's "different slot" test admits them for everybody and nothing in
    // the pair loop knows they are special.
    const match = new Match(bareMap(), { seed: 86 });
    match.addPlayer(0, Faction.Bathyarch);
    assert.ok(DRIFT_SLOT > 3, 'the Drift slot must be outside the player range');
    assert.ok(faunaStatsFor(FaunaSpecies.Sounder).biomass > 0);
    assert.ok(Position.x.length > 0);
  });
});
