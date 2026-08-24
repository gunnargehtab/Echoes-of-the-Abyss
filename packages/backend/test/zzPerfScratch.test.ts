/**
 * SCRATCH — worst-case ordnance board, timed. Delete after reading.
 */
import { describe, it } from 'node:test';
import { hasComponent } from 'bitecs';
import {
  Faction,
  OrdnanceKind,
  SIM,
  UnitKind,
  mineCapFor,
  seekerHydFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnOrdnance, spawnUnit } from '../src/sim/world.ts';
import { Health, Magazine, Ordnance, Owner, Position } from '../src/sim/components.ts';
import { ordnanceSystem } from '../src/sim/systems/ordnance.ts';
import { combatSystem } from '../src/sim/systems/combat.ts';
import { VENTFRONT_DIVIDE } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

interface BoardOptions {
  hullsPerPlayer: number;
  mines: boolean;
  torpedoesPerPlayer: number;
  fauna: boolean;
}

function build(o: BoardOptions): { match: Match; carriers: number[] } {
  const match = new Match(VENTFRONT_DIVIDE, { seed: 99, fauna: o.fauna });
  for (let slot = 0; slot < 4; slot++) match.addPlayer(slot, Faction.Pelagia);

  const carriers: number[] = [];
  for (let slot = 0; slot < 4; slot++) {
    for (let i = 0; i < o.hullsPerPlayer; i++) {
      const kind = i % 3 === 0 ? UnitKind.Cruiser : UnitKind.Corvette;
      const eid = spawnUnit(match.world, {
        kind,
        slot,
        faction: Faction.Pelagia,
        x: 3200 + (slot % 2) * 1600 + (i % 5) * 90,
        y: 3200 + (slot < 2 ? 0 : 1600) + Math.floor(i / 5) * 90,
      });
      if (hasComponent(match.world, Magazine, eid)) carriers.push(eid);
    }
  }

  if (o.mines) {
    const cap = mineCapFor(Faction.Pelagia);
    for (let slot = 0; slot < 4; slot++) {
      for (let i = 0; i < cap; i++) {
        spawnOrdnance(match.world, {
          kind: OrdnanceKind.Mine,
          slot,
          faction: Faction.Pelagia,
          x: 3600 + (i % 6) * 120,
          y: 3600 + Math.floor(i / 6) * 120 + slot * 40,
          depth: 400,
          pressureRating: 3000,
        });
      }
    }
  }

  return { match, carriers };
}

let headingCounter = 0;

function refillTorpedoes(match: Match, carriers: number[], want: number): void {
  let live = liveOrdnance(match, OrdnanceKind.Torpedo);
  for (let i = 0; i < carriers.length && live < want; i++) {
    const eid = carriers[i]!;
    if (!hasComponent(match.world, Owner, eid)) continue;
    spawnOrdnance(match.world, {
      kind: OrdnanceKind.Torpedo,
      slot: Owner.slot[eid]!,
      faction: Faction.Pelagia,
      x: Position.x[eid]!,
      y: Position.y[eid]!,
      depth: Position.depth[eid]!,
      heading: (headingCounter++ * 0.61803) % (Math.PI * 2),
      aimX: 4000,
      aimY: 4000,
      seekerHyd: seekerHydFor(Faction.Pelagia),
      pressureRating: 3000,
    });
    live++;
  }
}

function liveOrdnance(match: Match, kind?: OrdnanceKind): number {
  let n = 0;
  for (let eid = 0; eid < Ordnance.kind.length; eid++) {
    if (!hasComponent(match.world, Ordnance, eid)) continue;
    if (Health.hp[eid]! <= 0) continue;
    if (kind !== undefined && Ordnance.kind[eid] !== kind) continue;
    n++;
  }
  return n;
}

function acousticEntities(match: Match): number {
  let n = 0;
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (hasComponent(match.world, Owner, eid)) n++;
  }
  return n;
}

const q = (a: number[], p: number): number => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))]!;
};

function measure(label: string, o: BoardOptions & { torpedoes: number }): void {
  const { match, carriers } = build(o);
  const slots = [0, 1, 2, 3];

  // Warm up: JIT the whole step path.
  for (let i = 0; i < 120; i++) {
    refillTorpedoes(match, carriers, o.torpedoes);
    match.update(STEP_MS);
  }

  const ordnanceMs: number[] = [];
  const combatMs: number[] = [];
  const echoMs: number[] = [];
  const scratch: number[] = [];

  for (let i = 0; i < 400; i++) {
    refillTorpedoes(match, carriers, o.torpedoes);
    match.update(STEP_MS);

    scratch.length = 0;
    let t = performance.now();
    ordnanceSystem(match.world, scratch);
    ordnanceMs.push(performance.now() - t);

    scratch.length = 0;
    t = performance.now();
    combatSystem(match.world, scratch);
    combatMs.push(performance.now() - t);

    if (i % 12 === 0) {
      t = performance.now();
      match.echo.run(match.world, slots);
      echoMs.push(performance.now() - t);
    }
  }

  console.log(
    `\n### ${label}  (entities=${acousticEntities(match)}, mines=${liveOrdnance(match, OrdnanceKind.Mine)}, torps=${liveOrdnance(match, OrdnanceKind.Torpedo)})`
  );
  console.log(
    `  ordnanceSystem  p50 ${q(ordnanceMs, 0.5).toFixed(3)}  p95 ${q(ordnanceMs, 0.95).toFixed(3)}  max ${q(ordnanceMs, 1).toFixed(3)} ms`
  );
  console.log(
    `  combatSystem    p50 ${q(combatMs, 0.5).toFixed(3)}  p95 ${q(combatMs, 0.95).toFixed(3)}  max ${q(combatMs, 1).toFixed(3)} ms`
  );
  console.log(
    `  echo.run        p50 ${q(echoMs, 0.5).toFixed(3)}  p95 ${q(echoMs, 0.95).toFixed(3)}  max ${q(echoMs, 1).toFixed(3)} ms   [budget ${SIM.ECHO_BUDGET_MS}]`
  );
  console.log(
    `  match.worstStepMsCost ${match.worstStepMsCost.toFixed(3)}  worstPhysicsMsCost ${match.worstPhysicsMsCost.toFixed(3)}  worstEchoPassMs ${match.worstEchoPassMs.toFixed(3)}`
  );
}

describe('scratch perf', () => {
  it('sweep', () => {
    console.log(`60 Hz frame budget = ${(1000 / SIM.TICK_HZ).toFixed(3)} ms; echo budget = ${SIM.ECHO_BUDGET_MS} ms`);
    measure('A. fleets+fauna only', {
      hullsPerPlayer: 25,
      mines: false,
      torpedoesPerPlayer: 0,
      torpedoes: 0,
      fauna: true,
    });
    measure('B. + 72 mines', {
      hullsPerPlayer: 25,
      mines: true,
      torpedoesPerPlayer: 0,
      torpedoes: 0,
      fauna: true,
    });
    measure('C. + 72 mines + 16 torpedoes', {
      hullsPerPlayer: 25,
      mines: true,
      torpedoesPerPlayer: 0,
      torpedoes: 16,
      fauna: true,
    });
    measure('D. + 72 mines + 48 torpedoes', {
      hullsPerPlayer: 25,
      mines: true,
      torpedoesPerPlayer: 0,
      torpedoes: 48,
      fauna: true,
    });
    measure('E. + 72 mines + 100 torpedoes', {
      hullsPerPlayer: 25,
      mines: true,
      torpedoesPerPlayer: 0,
      torpedoes: 100,
      fauna: true,
    });
    measure('F. 40 hulls/player + 72 mines + 100 torpedoes', {
      hullsPerPlayer: 40,
      mines: true,
      torpedoesPerPlayer: 0,
      torpedoes: 100,
      fauna: true,
    });
  });
});
