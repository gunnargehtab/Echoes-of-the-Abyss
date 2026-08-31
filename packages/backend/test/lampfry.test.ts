/**
 * Lampfry — the scatter tell (#306, docs/bestiary.md §4).
 *
 * The properties that carry the species, each easy to lose while the code
 * still looks right:
 *
 * 1. **The trigger is proximity, never the Echo Layer.** A silent-running
 *    scout — the quietest thing a player can field — must scatter a shoal
 *    exactly as a loud one does. A SIG term anywhere in the path reintroduces
 *    the thing the tell exists to answer.
 * 2. **The tell is public.** Every player's snapshot carries every shoal and
 *    its scattered flag; a tell only one player can read is not the counter
 *    to stealth that §4 promises.
 * 3. **A shoal is a place, not a predator.** It never commits, whatever is
 *    beside it and however loud.
 * 4. **§6's Failing row is real**: shoals in failing water die, and with them
 *    the tell — "scatter tells stop working".
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DRIFT, Faction, FaunaSpecies, FaunaStage, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnFauna, spawnUnit } from '../src/sim/world.ts';
import { Fauna, Health, Position } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function bareMap(): MapDefinition {
  return { ...VENTFRONT_DIVIDE, id: 'test-lampfry', regions: [], hazards: [] };
}

function emptyMatch(seed = 91, players = 1) {
  const match = new Match(bareMap(), {
    fauna: false,
    seed,
    terrain: new Terrain(8000, 8000, 250),
  });
  for (let slot = 0; slot < players; slot++) match.addPlayer(slot, Faction.Bathyarch);
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

describe('lampfry shoals', () => {
  it('seed across their band rather than at one depth', () => {
    // §4's "Seeded across ±100 m": a shoal population is a spread, not a
    // vertical line — the whole reason seedSpreadM exists (#306).
    const match = emptyMatch();
    const depths: number[] = [];
    for (let i = 0; i < 6; i++) {
      const eid = spawnFauna(match.world, {
        species: FaunaSpecies.Lampfry,
        x: 4000 + i * 300,
        y: 6000,
      });
      depths.push(Position.depth[eid]!);
    }
    for (const depth of depths) {
      assert.ok(depth >= 150 && depth <= 350, `${depth} m is inside 150-350 m`);
    }
    const spread = Math.max(...depths) - Math.min(...depths);
    assert.ok(spread > 60, `a population spans the band (spread was ${spread.toFixed(0)} m)`);
  });

  it('scatter from a silent-running scout, and reform after it leaves', () => {
    // The one piece of information a silent unit cannot suppress.
    const match = emptyMatch(92);
    const shoal = spawnFauna(match.world, { species: FaunaSpecies.Lampfry, x: 5000, y: 5000 });
    const depth = Position.depth[shoal]!;
    const scout = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5150,
      y: 5000,
      depth,
    });
    match.setSilentRunning(0, scout, true);

    advance(match, 2);
    assert.ok(Fauna.scatterS[shoal]! > 0, 'a silent scout 150 m away scatters the shoal');

    // The scout leaves; the shoal reforms 25 s after the water clears.
    match.orderMove(0, scout, 7500, 5000);
    let reformedAfterS = -1;
    for (let s = 0; s < 60; s++) {
      advance(match, 1);
      if (Fauna.scatterS[shoal]! <= 0) {
        reformedAfterS = s;
        break;
      }
    }
    assert.ok(reformedAfterS >= 0, 'the shoal reforms once the intruder is gone');
    assert.ok(
      reformedAfterS >= DRIFT.LAMPFRY_REFORM_S - 2,
      `reforming takes the full window (took ${reformedAfterS} s)`
    );
  });

  it('publish the tell to every player, scattered flag and all', () => {
    const match = emptyMatch(93, 2);
    const shoal = spawnFauna(match.world, { species: FaunaSpecies.Lampfry, x: 5000, y: 5000 });
    spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5100,
      y: 5000,
      depth: Position.depth[shoal]!,
    });

    const snapshots = advance(match, 2)!;
    for (const slot of [0, 1]) {
      const shoals = snapshots.get(slot)!.shoals;
      const tell = shoals.find((s) => Math.hypot(s.x - 5000, s.y - 5000) < 50);
      assert.ok(tell !== undefined, `slot ${slot} sees the shoal`);
      assert.equal(tell.scattered, true, `slot ${slot} sees the scatter`);
    }
    // Player 1 owns nothing near the shoal: the tell reached them anyway,
    // which is the "public, like hazards" half of the design — and it named
    // nothing about what caused it.
  });

  it('never commit, whatever stands beside them', () => {
    const match = emptyMatch(94);
    const shoal = spawnFauna(match.world, { species: FaunaSpecies.Lampfry, x: 5000, y: 5000 });
    // A harvester is one of the loudest working hulls in the game.
    const loud = spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5060,
      y: 5000,
      depth: Position.depth[shoal]!,
    });

    advance(match, 30);
    assert.equal(Fauna.stage[shoal], FaunaStage.Ambient, 'a shoal has no ladder to climb');
    assert.ok(Health.hp[loud]! > 0, 'nothing was bitten');
    assert.ok(Fauna.scatterS[shoal]! > 0, 'it scatters instead');
  });

  it('die off in failing water, and the tell dies with them', () => {
    // §6, the Failing row: "Lampfry gone (scatter tells stop working)". This
    // is the concealment consequence #306 calls half-wired — a killed region
    // must actually lose its tells.
    const match = emptyMatch(95);
    const shoal = spawnFauna(match.world, { species: FaunaSpecies.Lampfry, x: 6000, y: 6000 });

    let snapshots = advance(match, 2)!;
    assert.equal(snapshots.get(0)!.shoals.length, 1, 'healthy water carries the tell');

    // Grind the region down past Failing the way players do — kills.
    while (match.world.drift.at(6000, 6000) >= DRIFT.HEALTH_FAILING) {
      match.world.drift.recordKill(6000, 6000);
    }

    snapshots = advance(match, 2)!;
    assert.ok(Health.hp[shoal]! <= 0, 'the shoal died with its water');
    assert.equal(snapshots.get(0)!.shoals.length, 0, 'failing water has no shoals to scatter');
  });
});
