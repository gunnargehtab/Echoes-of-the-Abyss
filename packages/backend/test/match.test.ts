/**
 * Integration tests for the simulation loop and the Echo Layer.
 *
 * These exercise the parts that unit-testing the math cannot reach: the ECS
 * wiring, the spatial-hash broadphase, and — most importantly — the guarantee
 * that a player is never sent information they did not earn.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ECONOMY,
  Faction,
  HarvestThrottle,
  ResolutionTier,
  SIM,
  STRUCTURE_AURAS,
  StructureKind,
  UnitKind,
  statsFor,
  structureStatsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnStructure } from '../src/sim/world.ts';
import {
  Position,
  Acoustic,
  Harvester,
  HarvestMode,
  Health,
  SilentRunning,
} from '../src/sim/components.ts';
import type { EchoSnapshot } from '@echoes/shared';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** Advance the match and return the most recent snapshot map produced. */
function advance(match: Match, seconds: number): Map<number, EchoSnapshot> | null {
  let latest: Map<number, EchoSnapshot> | null = null;
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) {
    const result = match.update(STEP_MS);
    if (result !== null) latest = result;
  }
  return latest;
}

function twoPlayerMatch(): Match {
  const match = new Match();
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  return match;
}

describe('simulation loop', () => {
  it('advances tick at the fixed rate regardless of update granularity', () => {
    const match = twoPlayerMatch();
    advance(match, 1);
    // One second of wall-clock should be ~TICK_HZ fixed steps.
    assert.ok(
      Math.abs(match.tick - SIM.TICK_HZ) <= 2,
      `expected ~${SIM.TICK_HZ} ticks, got ${match.tick}`
    );
  });

  it('produces a snapshot for every joined player', () => {
    const match = twoPlayerMatch();
    const snapshots = advance(match, 1);
    assert.ok(snapshots !== null);
    assert.ok(snapshots.has(0));
    assert.ok(snapshots.has(1));
  });

  it('gives each player their own units in full detail', () => {
    const match = twoPlayerMatch();
    const snapshots = advance(match, 1)!;
    const own = snapshots.get(0)!.units;
    assert.ok(own.length > 0);
    for (const unit of own) {
      assert.ok(unit.hp > 0);
      assert.ok(unit.sig >= 0 && unit.sig <= 100);
      assert.equal(typeof unit.silentRunning, 'boolean');
    }
  });
});

describe('Echo Layer', () => {
  it('hears nothing across the map at spawn', () => {
    const match = twoPlayerMatch();
    const snapshots = advance(match, 1)!;
    // Starting forces are placed in opposite corners, far out of earshot.
    assert.equal(snapshots.get(0)!.contacts.length, 0);
    assert.equal(snapshots.get(1)!.contacts.length, 0);
  });

  it('resolves a contact once a loud unit closes the distance', () => {
    const match = twoPlayerMatch();
    advance(match, 1);

    // Park one of player 1's units right next to player 0's force.
    const mine = advance(match, 0.2)!.get(0)!.units[0]!;
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;
    Position.x[theirs.id] = Position.x[mine.id]! + 300;
    Position.y[theirs.id] = Position.y[mine.id]!;

    const snapshots = advance(match, 0.5)!;
    const contacts = snapshots.get(0)!.contacts;
    assert.ok(contacts.length > 0, 'player 0 should hear the intruder');
    assert.ok(contacts[0]!.tier > ResolutionTier.Silent);
  });

  it('withholds classification below Tier 3 and identity below Tier 4', () => {
    const match = twoPlayerMatch();
    advance(match, 1);

    const mine = advance(match, 0.2)!.get(0)!.units[0]!;
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;
    // Far enough to register, close enough to matter.
    Position.x[theirs.id] = Position.x[mine.id]! + 1500;
    Position.y[theirs.id] = Position.y[mine.id]!;

    const contacts = advance(match, 0.5)!.get(0)!.contacts;
    for (const contact of contacts) {
      if (contact.tier < ResolutionTier.Classification) {
        assert.equal(contact.kind, undefined, 'leaked unit type below Tier 3');
        assert.equal(contact.faction, undefined, 'leaked faction below Tier 3');
        assert.equal(contact.depth, undefined, 'leaked depth below Tier 3');
      }
      if (contact.tier < ResolutionTier.Track) {
        assert.equal(contact.hp, undefined, 'leaked health below Tier 4');
        assert.equal(contact.heading, undefined, 'leaked heading below Tier 4');
      }
    }
  });

  it('goes quiet when a unit runs silent', () => {
    const match = twoPlayerMatch();
    advance(match, 1);

    const mine = advance(match, 0.2)!.get(0)!.units[0]!;
    // A Corvette (idle SIG 28): loud enough to be tracked at this range, and
    // quiet enough to vanish under Silent Running. The Light Scout would be
    // inaudible here even when loud, proving nothing.
    const theirs = advance(match, 0.2)!
      .get(1)!
      .units.find((u) => u.kind === UnitKind.Corvette)!;
    Position.x[theirs.id] = Position.x[mine.id]! + 1200;
    Position.y[theirs.id] = Position.y[mine.id]!;

    const loudTier = advance(match, 0.5)!.get(0)!.contacts[0]?.tier ?? ResolutionTier.Silent;

    match.setSilentRunning(1, theirs.id, true);
    const quiet = advance(match, 0.5)!.get(0)!.contacts;
    const quietTier = quiet[0]?.tier ?? ResolutionTier.Silent;

    assert.ok(SilentRunning.active[theirs.id] === 1);
    assert.ok(Acoustic.sig[theirs.id]! <= 8, 'silent running should collapse SIG');
    assert.ok(quietTier < loudTier, 'going silent must reduce resolution');
  });

  it('an active ping reveals everything nearby and the pinger to everyone', () => {
    const match = twoPlayerMatch();
    advance(match, 1);

    const mine = advance(match, 0.2)!.get(0)!.units[0]!;
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;
    // Inside the 900 m reveal radius, and running silent so passive
    // detection alone would find nothing.
    Position.x[theirs.id] = Position.x[mine.id]! + 700;
    Position.y[theirs.id] = Position.y[mine.id]!;
    match.setSilentRunning(1, theirs.id, true);

    const beforePing = advance(match, 0.5)!.get(0)!.contacts;
    const beforeTier = beforePing[0]?.tier ?? ResolutionTier.Silent;

    match.activeSonar(0, mine.id);
    const afterSnapshots = advance(match, 0.4)!;

    const revealed = afterSnapshots.get(0)!.contacts.find((c) => c.tier === ResolutionTier.Track);
    assert.ok(revealed !== undefined, 'ping should hard-reveal the silent unit');
    assert.ok(revealed.tier > beforeTier);
    assert.equal(typeof revealed.kind, 'number', 'Tier 4 must include identity');

    // ...and the cost: the pinger is now screaming.
    const heardBack = afterSnapshots.get(1)!.contacts;
    assert.ok(heardBack.length > 0, 'pinging must expose the pinger');
  });

  it('stays inside its performance budget for a small match', () => {
    const match = twoPlayerMatch();
    advance(match, 3);
    assert.ok(
      match.worstEchoPassMs < SIM.ECHO_BUDGET_MS,
      `Echo pass worst case ${match.worstEchoPassMs.toFixed(3)}ms exceeded ` +
        `${SIM.ECHO_BUDGET_MS}ms budget`
    );
  });
});

describe('command validation', () => {
  it('ignores orders for units the caller does not own', () => {
    const match = twoPlayerMatch();
    advance(match, 1);
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;

    const beforeX = Position.x[theirs.id]!;
    // Player 0 tries to drive player 1's unit.
    match.orderMove(0, theirs.id, beforeX + 3000, Position.y[theirs.id]!);
    advance(match, 1);

    assert.equal(Position.x[theirs.id], beforeX, 'unit moved on a foreign order');
  });

  it('ignores silent running toggles from a non-owner', () => {
    const match = twoPlayerMatch();
    advance(match, 1);
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;

    match.setSilentRunning(0, theirs.id, true);
    assert.equal(SilentRunning.active[theirs.id], 0);
  });
});

describe('economy', () => {
  it('starts each player with a base, an escort, and the stockpile', () => {
    const match = twoPlayerMatch();
    const snapshot = advance(match, 0.5)!.get(0)!;
    assert.equal(snapshot.nodules, ECONOMY.STARTING_NODULES);
    const kinds = snapshot.structures.map((s) => s.kind).sort();
    assert.deepEqual(kinds, [StructureKind.Bastion, StructureKind.Foundry]);
    assert.ok(snapshot.units.some((u) => u.kind === UnitKind.Harvester));
  });

  it('runs the harvest loop: mine loudly, haul home, bank the cargo', () => {
    const match = twoPlayerMatch();
    // The starting harvester self-assigns the home field. Give it time for at
    // least one full trip: ~700 m out at 40 m/s, 5 s mining, ~700 m back.
    const snapshots = advance(match, 60)!;
    const snapshot = snapshots.get(0)!;
    assert.ok(
      snapshot.nodules > ECONOMY.STARTING_NODULES,
      `expected deposits above the starting ${ECONOMY.STARTING_NODULES}, got ${snapshot.nodules}`
    );
  });

  it('mining loudness follows the throttle', () => {
    const match = twoPlayerMatch();
    advance(match, 0.2);
    const harvester = advance(match, 0.2)!
      .get(0)!
      .units.find((u) => u.kind === UnitKind.Harvester)!;

    // Park the harvester in mining state and compare throttle SIGs directly.
    Harvester.mode[harvester.id] = HarvestMode.Mining;
    match.setThrottle(0, harvester.id, HarvestThrottle.Overburden);
    advance(match, 0.2);
    const loud = Acoustic.sig[harvester.id]!;
    Harvester.mode[harvester.id] = HarvestMode.Mining;
    match.setThrottle(0, harvester.id, HarvestThrottle.Trickle);
    advance(match, 0.2);
    const quiet = Acoustic.sig[harvester.id]!;
    assert.ok(loud > quiet, `Overburden (${loud}) must be louder than Trickle (${quiet})`);
  });
});

describe('construction and production', () => {
  it('builds a structure for its cost, loudly, then quiets to its idle SIG', () => {
    const match = twoPlayerMatch();
    const before = advance(match, 0.5)!.get(0)!;
    const bastion = before.structures.find((s) => s.kind === StructureKind.Bastion)!;

    const placed = match.build(0, StructureKind.Refinery, bastion.x, bastion.y + 700);
    assert.ok(placed, 'placement beside the Bastion should be legal');

    const during = advance(match, 1)!.get(0)!;
    const stats = structureStatsFor(StructureKind.Refinery);
    assert.equal(during.nodules, before.nodules - stats.cost);
    const site = during.structures.find((s) => s.kind === StructureKind.Refinery)!;
    assert.ok(site.buildProgress < 1);
    assert.ok(
      site.sig > stats.sigIdle,
      'a construction site must be louder than the finished hull'
    );

    advance(match, stats.buildTimeS);
    const done = advance(match, 0.5)!
      .get(0)!
      .structures.find((s) => s.kind === StructureKind.Refinery)!;
    assert.equal(done.buildProgress, 1);
    assert.equal(done.hp, done.maxHp);
    assert.equal(done.sig, stats.sigIdle);
  });

  it('rejects builds that are unfunded, unanchored, or overlapping', () => {
    const match = twoPlayerMatch();
    advance(match, 0.5);
    const bastion = advance(match, 0.2)!
      .get(0)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;

    // Far from every own structure: no anchor.
    assert.equal(match.build(0, StructureKind.Refinery, 4000, 4000), false);
    // Directly on the Bastion: overlapping.
    assert.equal(match.build(0, StructureKind.Refinery, bastion.x, bastion.y), false);
    // The Bastion itself is never for sale.
    assert.equal(match.build(0, StructureKind.Bastion, bastion.x, bastion.y + 700), false);
  });

  it('produces a queued unit after its build time, for its cost', () => {
    const match = twoPlayerMatch();
    const before = advance(match, 0.5)!.get(0)!;
    const foundry = before.structures.find((s) => s.kind === StructureKind.Foundry)!;
    const unitCountBefore = before.units.length;

    assert.ok(match.produce(0, foundry.id, UnitKind.LightScout));
    const queued = advance(match, 0.5)!.get(0)!;
    assert.equal(queued.nodules, before.nodules - statsFor(UnitKind.LightScout).cost);
    assert.equal(queued.structures.find((s) => s.id === foundry.id)!.queue.length, 1);

    advance(match, statsFor(UnitKind.LightScout).buildTimeS + 1);
    const after = advance(match, 0.5)!.get(0)!;
    assert.equal(after.units.length, unitCountBefore + 1);
    assert.equal(after.structures.find((s) => s.id === foundry.id)!.queue.length, 0);
  });

  it('refuses production of combat hulls at the Bastion', () => {
    const match = twoPlayerMatch();
    advance(match, 0.5);
    const bastion = advance(match, 0.2)!
      .get(0)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;
    assert.equal(match.produce(0, bastion.id, UnitKind.Cruiser), false);
    assert.ok(match.produce(0, bastion.id, UnitKind.Harvester));
  });
});

describe('combat', () => {
  /** Park an armed unit of each player within weapon range of the other. */
  function stageBrawl(match: Match): { attacker: number; victim: number } {
    advance(match, 0.5);
    const snapshots = advance(match, 0.2)!;
    const attacker = snapshots.get(0)!.units.find((u) => u.kind === UnitKind.Corvette)!;
    const victim = snapshots.get(1)!.units.find((u) => u.kind === UnitKind.LightScout)!;
    Position.x[victim.id] = Position.x[attacker.id]! + 300;
    Position.y[victim.id] = Position.y[attacker.id]!;
    return { attacker: attacker.id, victim: victim.id };
  }

  it('auto-engages an enemy inside weapon range and raises the firing SIG', () => {
    const match = twoPlayerMatch();
    const { attacker, victim } = stageBrawl(match);
    const hpBefore = Health.hp[victim]!;

    advance(match, 1);
    assert.ok(Health.hp[victim]! < hpBefore, 'a corvette must return fire at 300 m');
    assert.ok(
      Acoustic.sig[attacker]! > statsFor(UnitKind.Corvette).sigIdle,
      'firing must spike SIG above idle'
    );
  });

  it('a silent unit holds its fire until ordered', () => {
    const match = twoPlayerMatch();
    const { victim } = stageBrawl(match);
    // Silence the whole escort — the victim sits inside several weapon ranges.
    for (const unit of advance(match, 0.2)!.get(0)!.units) {
      match.setSilentRunning(0, unit.id, true);
    }
    const hpBefore = Health.hp[victim]!;
    advance(match, 1);
    assert.equal(Health.hp[victim], hpBefore, 'silent running must suppress auto-fire');
  });

  it('destroying the Bastion eliminates the player and ends the match', () => {
    const match = twoPlayerMatch();
    advance(match, 0.5);
    const bastion = advance(match, 0.2)!
      .get(1)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;

    Health.hp[bastion.id] = 1;
    // Any kill path works; crush it via the pressure system by pretending the
    // structure sank. Structures have no Pressure component, so use combat:
    // park an enemy cruiser next to it instead.
    const cruiser = advance(match, 0.2)!
      .get(0)!
      .units.find((u) => u.kind === UnitKind.Corvette)!;
    Position.x[cruiser.id] = Position.x[bastion.id]! + 200;
    Position.y[cruiser.id] = Position.y[bastion.id]!;

    advance(match, 2);
    assert.ok(match.result !== null, 'the match must resolve');
    assert.equal(match.result!.winnerSlot, 0);
    const final = advance(match, 0.5)!;
    assert.equal(final.get(1)!.units.length, 0, 'the eliminated force must scuttle');
  });
});

describe('structures in the Echo Layer', () => {
  it('classifies a heard structure by its structure kind, not a unit kind', () => {
    const match = twoPlayerMatch();
    advance(match, 0.5);
    // Park a high-HYD listener right on top of the enemy Bastion.
    const listener = advance(match, 0.2)!
      .get(0)!
      .units.find((u) => u.kind === UnitKind.LightScout)!;
    const bastion = advance(match, 0.2)!
      .get(1)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;
    Position.x[listener.id] = bastion.x + 300;
    Position.y[listener.id] = bastion.y;

    const contacts = advance(match, 0.5)!.get(0)!.contacts;
    const heard = contacts.find((c) => c.structure !== undefined);
    assert.ok(heard !== undefined, 'a Bastion at 300 m must classify');
    assert.equal(heard.structure, StructureKind.Bastion);
    assert.equal(heard.kind, undefined, 'a structure contact must not claim a unit kind');
  });
});

describe('depth', () => {
  it("inflicts unhealable crush attrition below a unit's pressure rating", () => {
    const match = new Match();
    match.addPlayer(0, Faction.Bathyarch);
    advance(match, 0.5);

    const units = advance(match, 0.2)!.get(0)!.units;
    // A Harvester is PR-1; the Abyssal band needs PR-3.
    const shallow = units.find((u) => u.kind === UnitKind.Harvester)!;
    const hpBefore = shallow.hp;

    Position.depth[shallow.id] = 3000;
    advance(match, 2);

    const after = advance(match, 0.2)!
      .get(0)!
      .units.find((u) => u.id === shallow.id);
    assert.ok(after !== undefined, 'unit should still be alive after 2s');
    assert.ok(after.hp < hpBefore, 'overreaching depth must cost hull');
  });
});

describe('faction structure auras', () => {
  it('a Baffle Barge bubble masks allied emitters only', () => {
    const match = twoPlayerMatch(); // slot 0 is Bathyarch, the barge's navy
    advance(match, 0.5);
    const snapshots = advance(match, 0.2)!;
    const mine = snapshots.get(0)!.units[0]!;
    const theirs = snapshots.get(1)!.units[0]!;
    // Park the enemy inside the bubble too: allied masking must not leak.
    Position.x[theirs.id] = Position.x[mine.id]! + 100;
    Position.y[theirs.id] = Position.y[mine.id]!;

    spawnStructure(match.world, {
      kind: StructureKind.BaffleBarge,
      slot: 0,
      faction: Faction.Bathyarch,
      x: Position.x[mine.id]!,
      y: Position.y[mine.id]!,
      prebuilt: true,
    });
    advance(match, 0.2);

    // pfFactor is an f32 lane; compare within float32 quantisation.
    const { PF_FACTOR } = STRUCTURE_AURAS.BAFFLE_BARGE;
    assert.ok(
      Math.abs(Acoustic.pfFactor[mine.id]! - PF_FACTOR) < 1e-6,
      'ally inside should be masked'
    );
    assert.equal(Acoustic.pfFactor[theirs.id], 1, 'enemy inside must not be masked');
  });

  it('a Cantor dome lends allied ears the bonus, capped', () => {
    const match = new Match();
    match.addPlayer(0, Faction.Directorate);
    match.addPlayer(1, Faction.Pelagia);
    advance(match, 0.5);
    const snapshots = advance(match, 0.2)!;
    const corvette = snapshots.get(0)!.units.find((u) => u.kind === UnitKind.Corvette)!;

    spawnStructure(match.world, {
      kind: StructureKind.Cantor,
      slot: 0,
      faction: Faction.Directorate,
      x: Position.x[corvette.id]! + 500,
      y: Position.y[corvette.id]!,
      prebuilt: true,
    });
    advance(match, 0.2);

    const { HYD_BONUS, HYD_CAP, RADIUS_M } = STRUCTURE_AURAS.CANTOR;
    const base = statsFor(UnitKind.Corvette).hyd;
    assert.equal(
      Acoustic.hyd[corvette.id],
      Math.min(HYD_CAP, base + HYD_BONUS),
      'corvette under the dome should listen sharper'
    );

    // Walk it out of the dome: HYD falls back to the hull rating.
    Position.x[corvette.id] = Position.x[corvette.id]! + RADIUS_M + 600;
    advance(match, 0.2);
    assert.equal(Acoustic.hyd[corvette.id], base, 'outside the dome the bonus is gone');
  });

  it('a Sounding Spire rents depth, and sings while doing it', () => {
    const match = new Match();
    match.addPlayer(0, Faction.Hadron);
    match.addPlayer(1, Faction.Pelagia);
    advance(match, 0.5);
    const snapshots = advance(match, 0.2)!;
    const scout = snapshots.get(0)!.units.find((u) => u.kind === UnitKind.LightScout)!;

    // A PR-1 scout at 600 m is a full band over its head: unhealable crush.
    Position.depth[scout.id] = 600;
    const spire = spawnStructure(match.world, {
      kind: StructureKind.SoundingSpire,
      slot: 0,
      faction: Faction.Hadron,
      x: Position.x[scout.id]! + 300,
      y: Position.y[scout.id]!,
      prebuilt: true,
    });
    advance(match, 0.2);

    const hpBefore = Health.hp[scout.id]!;
    advance(match, 2);
    assert.equal(Health.hp[scout.id], hpBefore, 'rented depth must stop crush attrition');
    assert.equal(
      Acoustic.sig[spire],
      structureStatsFor(StructureKind.SoundingSpire).sigActive,
      'a projecting spire sings at its active SIG'
    );

    // Out of the aura the deficit is real again — and the spire goes quiet.
    Position.x[scout.id] = Position.x[scout.id]! + 2000;
    advance(match, 2);
    assert.ok(Health.hp[scout.id]! < hpBefore, 'outside the aura the depth bill comes due');
    assert.equal(
      Acoustic.sig[spire],
      structureStatsFor(StructureKind.SoundingSpire).sigIdle,
      'an idle spire hums at its idle SIG'
    );
  });

  it('another navy cannot commission a signature structure', () => {
    const match = twoPlayerMatch(); // slot 0 is Bathyarch
    advance(match, 0.5);
    const bastion = advance(match, 0.2)!
      .get(0)!
      .structures.find((s) => s.kind === StructureKind.Bastion)!;
    // Clear of both the Bastion (r 220) and the starting Foundry 450 m east.
    const x = bastion.x + 500;
    const y = bastion.y + 500;
    assert.equal(match.build(0, StructureKind.Cantor, x, y), false, 'Cantor is Directorate-only');
    assert.equal(
      match.build(0, StructureKind.BaffleBarge, x, y),
      true,
      'the Consortium may commission its own barge on the same spot'
    );
  });
});
