/**
 * Integration tests for the simulation loop and the Echo Layer.
 *
 * These exercise the parts that unit-testing the math cannot reach: the ECS
 * wiring, the spatial-hash broadphase, and — most importantly — the guarantee
 * that a player is never sent information they did not earn.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Faction, ResolutionTier, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Position, Acoustic, SilentRunning } from '../src/sim/components.ts';
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
    const theirs = advance(match, 0.2)!.get(1)!.units[0]!;
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
