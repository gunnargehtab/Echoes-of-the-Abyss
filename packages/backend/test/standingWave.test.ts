/**
 * Standing Wave — docs/systems-echo.md §7, docs/factions.md, and
 * docs/mission-standing-wave.md §4, whose one sentence settles the pairing
 * rule: "A node pairs with the nearest completed, unpaired node of the same
 * commander within 1,500 m, at the moment it completes. The pairing is decided
 * once and is never re-decided. A node with no partner is silent."
 *
 * Against a live skirmish rather than the mission, so the mechanic is held to
 * the doc it transcribes and not to the one mission that spends it: a Knight
 * raising two Spires in any match gets a corridor, and the corridor does the
 * three things §4 says — carries at 2.0, takes hull off whatever stands in it,
 * and sings at 80 from both ends.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Faction,
  PROPAGATION_FACTOR,
  SIM,
  STANDING_WAVE,
  StructureKind,
  UnitKind,
  structureStatsFor,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnStructure, spawnUnit } from '../src/sim/world.ts';
import { Health, Position } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const SPIRE = structureStatsFor(StructureKind.SoundingSpire);

/** Open water everywhere, so the corridor's figure is measured against one baseline. */
function bareMap(): MapDefinition {
  return { ...VENTFRONT_DIVIDE, id: 'test-standing-wave', regions: [], hazards: [] };
}

function knightMatch(seed = 3): Match {
  const match = new Match(bareMap(), {
    fauna: false,
    seed,
    terrain: new Terrain(8000, 8000, 250),
  });
  match.addPlayer(0, Faction.Hadron);
  match.addPlayer(1, Faction.Pelagia);
  return match;
}

function advance(match: Match, seconds: number): EchoSnapshot | undefined {
  let last: EchoSnapshot | undefined;
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots !== null) last = snapshots.get(0);
  }
  return last;
}

/** Enough of everything to raise `count` Spires without the economy refusing. */
function fund(match: Match, count: number): void {
  const economy = match.world.economies.get(0)!;
  economy.nodules = SPIRE.cost * count;
  economy.crystal = SPIRE.crystalCost * count;
}

/** The player's Bastion, which every build radius is anchored on. */
function bastionOf(match: Match): { x: number; y: number } {
  const own = advance(match, 0.9)!;
  return own.structures.find((s) => s.kind === StructureKind.Bastion)!;
}

describe('pairing, as docs/mission-standing-wave.md §4 states it', () => {
  it('pairs two completed nodes within range into one corridor, and not before they complete', () => {
    const match = knightMatch();
    const bastion = bastionOf(match);
    fund(match, 2);
    const ax = bastion.x + 300;
    const ay = bastion.y + 900;
    const bx = ax + 900;
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax, ay), 'first site');
    assert.ok(match.build(0, StructureKind.SoundingSpire, bx, ay), 'second site');

    advance(match, SPIRE.buildTimeS - 2);
    assert.equal(
      match.world.corridors.length,
      0,
      'sites do not pair — a node exists at commission'
    );

    advance(match, 3);
    assert.equal(
      match.world.corridors.length,
      1,
      'two completed nodes within 1,500 m are one corridor'
    );
    assert.equal(match.world.pairedNodes.size, 2);
  });

  it('leaves a node with no partner in range silent, and pairs it when one arrives', () => {
    const match = knightMatch();
    const bastion = bastionOf(match);
    fund(match, 3);
    const ax = bastion.x + 300;
    const ay = bastion.y + 900;
    // Beyond PAIR_RANGE_M from the first (1,523 m) and inside the build
    // radius of the Bastion (1,140 m): reachable off the Bastion, not off the node.
    const farX = bastion.x - 1100;
    const farY = bastion.y + 300;
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax, ay));
    assert.ok(match.build(0, StructureKind.SoundingSpire, farX, farY));
    advance(match, SPIRE.buildTimeS + 1);
    assert.equal(
      match.world.corridors.length,
      0,
      'two nodes 1,500 m apart and more are two odd nodes'
    );

    // A third within range of the first pairs with the first — nearest,
    // unpaired — and the far node stays odd.
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax + 800, ay));
    advance(match, SPIRE.buildTimeS + 1);
    assert.equal(match.world.corridors.length, 1);
    assert.equal(
      match.world.pairedNodes.size,
      2,
      'the far node is still available, and still silent'
    );
  });

  it('decides once: a node whose partner dies does not pick up a third', () => {
    const match = knightMatch();
    const bastion = bastionOf(match);
    fund(match, 3);
    const ax = bastion.x + 300;
    const ay = bastion.y + 900;
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax, ay));
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax + 900, ay));
    const own = advance(match, SPIRE.buildTimeS + 1)!;
    assert.equal(match.world.corridors.length, 1);
    const pf = match.world.terrain.propagationAt(ax + 450, ay);
    assert.ok(Math.abs(pf - STANDING_WAVE.CORRIDOR_PF) < 1e-6, `the line carries at 2.0 (${pf})`);

    // Kill one end. The corridor falls on the tick it dies and the water
    // between them goes back to what the biome says.
    const [first] = own.structures.filter((s) => s.kind === StructureKind.SoundingSpire);
    Health.hp[first!.id] = 0;
    advance(match, 0.1);
    assert.equal(match.world.corridors.length, 0, 'a corridor with one end is no corridor');
    assert.ok(
      Math.abs(match.world.terrain.propagationAt(ax + 450, ay) - PROPAGATION_FACTOR[0]!) < 1e-6 ||
        match.world.terrain.propagationAt(ax + 450, ay) < STANDING_WAVE.CORRIDOR_PF - 0.5,
      'and the PF write comes off with it'
    );

    // A third node within range of the survivor completes, and the survivor
    // does not re-pair: "an instrument does not re-tune itself while you are
    // inside it".
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax + 900, ay + 700));
    advance(match, SPIRE.buildTimeS + 1);
    assert.equal(match.world.corridors.length, 0, 'the survivor stays paired to a dead node');
    assert.equal(match.world.pairedNodes.size, 2);
  });
});

describe('what does not pair', () => {
  it('offers nothing to a prebuilt node, because a prebuilt node never completes', () => {
    // docs/mission-rim-deposits.md §4 and docs/mission-conclave-chord.md §3
    // seat Spires inside 1,500 m of each other on exactly this reading, and
    // the runtime holds them to it: two grants raised at one turn of one tide
    // are two grants, and a lattice cut thirty years ago hums at 30.
    const match = knightMatch();
    const bastion = bastionOf(match);
    const ax = bastion.x + 300;
    const ay = bastion.y + 900;
    spawnStructure(match.world, {
      kind: StructureKind.SoundingSpire,
      slot: 0,
      faction: Faction.Hadron,
      x: ax,
      y: ay,
      prebuilt: true,
    });
    spawnStructure(match.world, {
      kind: StructureKind.SoundingSpire,
      slot: 0,
      faction: Faction.Hadron,
      x: ax + 900,
      y: ay,
      prebuilt: true,
    });
    const own = advance(match, 2)!;
    assert.equal(match.world.corridors.length, 0, 'two grants are not an interval');
    for (const node of own.structures.filter((s) => s.kind === StructureKind.SoundingSpire)) {
      assert.equal(node.sig, SPIRE.sigIdle, 'and both hum at the idle figure');
    }
    // And a node the player raises beside them pairs with neither: a partner
    // has to have completed too.
    fund(match, 1);
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax + 450, ay + 400));
    advance(match, SPIRE.buildTimeS + 1);
    assert.equal(match.world.corridors.length, 0, 'a site beside two grants completes alone');
  });
});

describe('what a standing corridor does', () => {
  it('writes PF 2.0 along the line and nowhere else, one cell wide', () => {
    const match = knightMatch();
    const bastion = bastionOf(match);
    fund(match, 2);
    const ax = bastion.x + 300;
    const ay = bastion.y + 875;
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax, ay));
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax + 1000, ay));
    advance(match, SPIRE.buildTimeS + 1);
    const terrain = match.world.terrain;
    for (const x of [ax + 100, ax + 500, ax + 900]) {
      assert.ok(
        Math.abs(terrain.propagationAt(x, ay) - STANDING_WAVE.CORRIDOR_PF) < 1e-6,
        `on the line at ${x}: ${terrain.propagationAt(x, ay)}`
      );
    }
    // Two cells off the line is open water; the capsule is a line, not a disc
    // around each end.
    assert.ok(terrain.propagationAt(ax + 500, ay + 600) < STANDING_WAVE.CORRIDOR_PF - 0.5);
    assert.ok(terrain.propagationAt(ax + 500, ay - 600) < STANDING_WAVE.CORRIDOR_PF - 0.5);
    assert.ok(terrain.propagationAt(ax - 600, ay) < STANDING_WAVE.CORRIDOR_PF - 0.5);
    assert.ok(
      Math.abs(terrain.peakPf - STANDING_WAVE.CORRIDOR_PF) < 1e-6,
      'the live ceiling rises to meet it'
    );
  });

  it('sings at 80 from both ends while the interval is held', () => {
    const match = knightMatch();
    const bastion = bastionOf(match);
    fund(match, 2);
    const ax = bastion.x + 300;
    const ay = bastion.y + 900;
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax, ay));
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax + 900, ay));
    const own = advance(match, SPIRE.buildTimeS + 1)!;
    const nodes = own.structures.filter((s) => s.kind === StructureKind.SoundingSpire);
    assert.equal(nodes.length, 2);
    for (const node of nodes) {
      assert.equal(node.sig, SPIRE.sigActive, 'a Spire holding a corridor is active (units.md)');
    }
  });

  it('takes hull off whatever stands in the line, its own commander included, and nothing beside it', () => {
    const match = knightMatch();
    const bastion = bastionOf(match);
    fund(match, 2);
    const ax = bastion.x + 300;
    const ay = bastion.y + 900;
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax, ay));
    assert.ok(match.build(0, StructureKind.SoundingSpire, ax + 900, ay));
    advance(match, SPIRE.buildTimeS + 1);

    const inside = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Hadron,
      x: ax + 450,
      y: ay,
      depth: 600,
      weaponsCold: true,
    });
    const beside = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: ax + 450,
      y: ay + 600,
      depth: 600,
      weaponsCold: true,
    });
    const full = statsFor(UnitKind.Corvette).maxHp;
    advance(match, 2);
    const lost = full - Health.hp[inside]!;
    assert.ok(
      Math.abs(lost - 2 * STANDING_WAVE.CORRIDOR_DAMAGE_PER_S) <
        STANDING_WAVE.CORRIDOR_DAMAGE_PER_S / 4,
      `a Knight hull in its own line loses ${STANDING_WAVE.CORRIDOR_DAMAGE_PER_S}/s (lost ${lost.toFixed(1)})`
    );
    assert.equal(Health.hp[beside], full, 'a hull two cells off the line is untouched');
    assert.ok(Position.x[inside]! > 0, 'and the hull is still there to be hurt again');
  });
});
