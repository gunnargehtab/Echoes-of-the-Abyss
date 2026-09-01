/**
 * Rasp — the swarm scavenger (#306, docs/bestiary.md §4).
 *
 * The property that carries the species: **drawn to Echo Marks, not to live
 * units.** A swarm answers residue — where things died — rather than noise,
 * which is what makes it a witness rather than another predator. Two halves
 * are worth pinning:
 *
 * 1. The arrival is distance over speed, "roughly 40 s after the battle", not
 *    a timer — so the tests measure when the swarm actually gets there.
 * 2. Feeding is an acoustic act: the mark decays roughly four times faster
 *    while the swarm's own feeding SIG stands in its place. Salvage-stripping
 *    deliberately touches no economy (§4 resolves #306's open question).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DRIFT,
  EchoMarkKind,
  Faction,
  FaunaSpecies,
  FaunaStage,
  SIM,
  UnitKind,
  faunaStatsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnFauna, spawnUnit } from '../src/sim/world.ts';
import { Acoustic, Fauna, Position } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function bareMap(): MapDefinition {
  return { ...VENTFRONT_DIVIDE, id: 'test-rasp', regions: [], hazards: [] };
}

function emptyMatch(seed = 81) {
  const match = new Match(bareMap(), {
    fauna: false,
    seed,
    terrain: new Terrain(8000, 8000, 250),
  });
  match.addPlayer(0, Faction.Bathyarch);
  return match;
}

function advance(match: Match, seconds: number) {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) match.update(STEP_MS);
}

describe('rasp swarms scavenge', () => {
  it('drift to battle residue and arrive in roughly forty seconds', () => {
    const match = emptyMatch();
    const swarm = spawnFauna(match.world, { species: FaunaSpecies.Rasp, x: 2000, y: 4000 });
    const depth = Position.depth[swarm]!;
    // A battle just ended 1,900 m away — the edge of the swarm's smell.
    match.world.marks.add(EchoMarkKind.Battle, 3900, 4000, depth);

    const distanceToMark = () => Math.hypot(Position.x[swarm]! - 3900, Position.y[swarm]! - 4000);

    // §2's ladder takes 4 s to even turn; scent does not. But at 30 s the
    // swarm must still be en route — the "roughly 40 s" window is the scout's
    // chance to read the residue first, and a swarm that teleports eats it.
    advance(match, 30);
    assert.ok(
      distanceToMark() > DRIFT.SCAVENGE_FEED_RADIUS_M,
      `still travelling at 30 s (was ${distanceToMark().toFixed(0)} m out)`
    );

    advance(match, 15);
    assert.ok(
      distanceToMark() <= DRIFT.SCAVENGE_FEED_RADIUS_M,
      `feeding by 45 s (was ${distanceToMark().toFixed(0)} m out)`
    );
    // Feeding is the announcement: the swarm's SIG is its active figure, an
    // unmissable Tier-3 event, while it strips.
    assert.equal(Acoustic.sig[swarm], faunaStatsFor(FaunaSpecies.Rasp).sigActive);
  });

  it('strip the mark they feed on faster than time alone would', () => {
    const match = emptyMatch(82);
    const swarm = spawnFauna(match.world, { species: FaunaSpecies.Rasp, x: 3600, y: 4000 });
    const depth = Position.depth[swarm]!;
    // One mark under the swarm, one control mark far outside smelling range.
    // Same kind, same age, same starting intensity — the only difference is
    // the feeding.
    match.world.marks.add(EchoMarkKind.Battle, 3900, 4000, depth);
    match.world.marks.add(EchoMarkKind.Battle, 400, 400, depth);

    advance(match, 45);

    const fed = match.world.marks.all.find((m) => Math.hypot(m.x - 3900, m.y - 4000) < 500);
    const control = match.world.marks.all.find((m) => Math.hypot(m.x - 400, m.y - 400) < 500);
    assert.ok(control !== undefined, 'the unfed mark is still decaying on its own clock');
    // The fed mark is either eaten outright or audibly fainter than its twin.
    if (fed !== undefined) {
      assert.ok(
        fed.intensity < control.intensity * 0.4,
        `fed ${fed.intensity.toFixed(3)} vs control ${control.intensity.toFixed(3)}`
      );
    }
  });

  it('still answer the aggro ladder over residue', () => {
    // "The aggro ladder outranks scavenging" (docs/bestiary.md, status table):
    // a swarm is a creature you can pull off a wreck by being loud. Commit 40
    // is low, and a working harvester next door crosses it.
    const match = emptyMatch(83);
    const swarm = spawnFauna(match.world, { species: FaunaSpecies.Rasp, x: 4000, y: 4000 });
    match.world.marks.add(EchoMarkKind.Battle, 4100, 4000, Position.depth[swarm]!);
    const loud = spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4300,
      y: 4000,
      depth: Position.depth[swarm]!,
    });

    let reached = FaunaStage.Ambient;
    for (let i = 0; i < SIM.TICK_HZ * 40; i++) {
      match.update(STEP_MS);
      const stage = Fauna.stage[swarm] as FaunaStage;
      if (stage > reached) reached = stage;
      if (reached === FaunaStage.Committed) break;
    }
    assert.equal(reached, FaunaStage.Committed, 'the loud neighbour outranks the wreck');
    assert.equal(Fauna.targetEid[swarm], loud);
  });

  it('ignore residue beyond smelling range', () => {
    // Far from the player's base as well as from the mark — a swarm seeded
    // next to a Sentinel Turret gets shot, and the shooting lays fresh battle
    // residue on the swarm itself, which is a different (correct) story.
    const match = emptyMatch(84);
    const swarm = spawnFauna(match.world, { species: FaunaSpecies.Rasp, x: 6800, y: 6800 });
    // Well past DRIFT.SCAVENGE_RANGE_M.
    match.world.marks.add(EchoMarkKind.Battle, 1500, 6800, Position.depth[swarm]!);

    advance(match, 10);
    assert.equal(Fauna.scavengeMarkId[swarm], 0, 'nothing in range, nothing wanted');
    assert.ok(
      Math.hypot(Position.x[swarm]! - 6800, Position.y[swarm]! - 6800) < 100,
      'the swarm stays in its home water'
    );
  });
});
