/**
 * What a Spore Veil does to what is not a hull — docs/units.md, Spore Veil
 * (#1251).
 *
 * "Everything inside — friend or foe alike — emits at 40% SIG and is
 * hydrophone-blind (effective HYD 5)." The veil wrote a plain HYD 5 onto all
 * of it, and only hulls and structures had their hearing rebuilt each tick:
 * a mine that armed in the cloud kept HYD 5 for life and listened for its
 * owner, and a creature that drifted through stayed deaf. Nor did a creature
 * inside emit at 40%, since its SIG was written without the veil's factor.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent, removeEntity } from 'bitecs';
import {
  EchoMarkKind,
  Faction,
  FaunaSpecies,
  ORDNANCE,
  SIM,
  STRUCTURE_AURAS,
  StructureKind,
  UnitKind,
  faunaStatsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnFauna, spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Acoustic, Owner, Position, Structure, Unit } from '../src/sim/components.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

/** Two players on blank water with their bases cleared, so nothing else listens. */
function emptyMatch(seed: number): Match {
  const match = new Match(undefined, {
    fauna: false,
    seed,
    terrain: new Terrain(16000, 16000, 200),
  });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (!hasComponent(match.world, Owner, eid)) continue;
    if (!hasComponent(match.world, Unit, eid) && !hasComponent(match.world, Structure, eid)) {
      continue;
    }
    removeEntity(match.world, eid);
  }
  return match;
}

function veil(match: Match, x: number, y: number): number {
  return spawnStructure(match.world, {
    kind: StructureKind.SporeVeil,
    slot: 1,
    faction: Faction.Pelagia,
    x,
    y,
    prebuilt: true,
  });
}

describe('a Spore Veil blinds what is inside it, and lends nothing', () => {
  it('never gives a deaf mine ears, so a veiled minefield hears nothing for its owner', () => {
    const match = emptyMatch(43);
    const layer = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 7000,
      y: 8000,
    });
    const cloud = veil(match, 7000, 8200);
    advance(match, 0.2);
    const mine = match.layMine(0, layer);
    assert.notEqual(mine, 0, 'the premise: a mine is laid');
    advance(match, ORDNANCE.MINE.ARMING_S + 0.5);
    assert.equal(Acoustic.hyd[mine], 0, 'a mine inside the cloud is still deaf');

    // The layer and the cloud go, and the mine is the only thing slot 0 owns.
    removeEntity(match.world, layer);
    removeEntity(match.world, cloud);
    advance(match, 0.2);
    assert.equal(Acoustic.hyd[mine], 0, 'and stays deaf once the cloud is gone');

    spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 7300,
      y: 8000,
    });
    let heard = 0;
    for (let i = 0; i < 6 * SIM.TICK_HZ; i++) {
      heard = Math.max(heard, match.update(STEP_MS)?.get(0)?.contacts.length ?? 0);
    }
    assert.equal(heard, 0, 'a Cruiser 300 m from the mine was heard through it');
  });

  it('gives a creature its hearing back when it leaves the cloud', () => {
    const match = emptyMatch(47);
    veil(match, 7000, 8000);
    const draymaw = spawnFauna(match.world, { species: FaunaSpecies.Draymaw, x: 7000, y: 8100 });
    const ears = faunaStatsFor(FaunaSpecies.Draymaw).hyd;
    const { BLIND_HYD } = STRUCTURE_AURAS.SPORE_VEIL;
    assert.ok(ears > BLIND_HYD, 'the premise: a Draymaw hears better than the veil allows');

    advance(match, 0.1);
    assert.equal(Acoustic.hyd[draymaw], BLIND_HYD, 'inside the cloud it is blind');

    Position.x[draymaw] = 12000;
    advance(match, 0.1);
    assert.equal(Acoustic.hyd[draymaw], ears, 'outside it, it hears with its own ears again');
  });

  it('muffles every creature inside it, as it muffles a hull', () => {
    // Every species, because two of them never reach the step where the
    // others' SIG is written: the ambient shoals skip it, and were left at
    // full voice inside the cloud by the first version of this fix.
    const { SIG_FACTOR } = STRUCTURE_AURAS.SPORE_VEIL;
    const species = Object.values(FaunaSpecies).filter(
      (value): value is FaunaSpecies => typeof value === 'number'
    );
    assert.ok(species.length > 2, 'the premise: the bestiary has its species');
    for (const kind of species) {
      const match = emptyMatch(47);
      veil(match, 7000, 8000);
      const inside = spawnFauna(match.world, { species: kind, x: 7000, y: 8100 });
      const outside = spawnFauna(match.world, { species: kind, x: 12000, y: 8100 });
      advance(match, 0.1);
      assert.ok(Acoustic.sig[outside]! > 0, `the premise: a ${FaunaSpecies[kind]} is audible`);
      assert.ok(
        Math.abs(Acoustic.sig[inside]! - Acoustic.sig[outside]! * SIG_FACTOR) < 1e-3,
        `a ${FaunaSpecies[kind]} in the cloud emits ${Acoustic.sig[inside]} against ` +
          `${Acoustic.sig[outside]} outside it`
      );
    }
  });

  it('muffles a Rasp feeding inside it, at its feeding figure', () => {
    // The feeding write is the third place a creature's SIG is set, and the
    // swarm's own noise stands in for the residue it eats (docs/bestiary.md
    // §4) — through the cloud's cut like the rest.
    const { SIG_FACTOR } = STRUCTURE_AURAS.SPORE_VEIL;
    const feeding = (veiled: boolean): number => {
      const match = emptyMatch(47);
      if (veiled) veil(match, 7000, 8000);
      const rasp = spawnFauna(match.world, { species: FaunaSpecies.Rasp, x: 7000, y: 8100 });
      match.world.marks.add(EchoMarkKind.Battle, 7000, 8100, Position.depth[rasp]!, 1);
      advance(match, 3);
      return Acoustic.sig[rasp]!;
    };
    const open = feeding(false);
    assert.equal(open, faunaStatsFor(FaunaSpecies.Rasp).sigActive, 'the premise: it feeds');
    const veiled = feeding(true);
    assert.ok(
      Math.abs(veiled - open * SIG_FACTOR) < 1e-3,
      `a feeding Rasp in the cloud emits ${veiled} against ${open} in open water`
    );
  });
});
