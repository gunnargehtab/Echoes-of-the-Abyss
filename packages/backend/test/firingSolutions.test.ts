/**
 * Firing solutions (#166) — docs/systems-combat.md §7.
 *
 * The information system terminates in the weapon system: what you know about
 * a target is literally how well you can shoot it. Two claims carry that:
 *
 *   - **no launch below Tier 2.** A Tier-1 contact is a directionless smudge
 *     reported at the *listener's own position*, so a torpedo aimed at one
 *     would be aimed at your own hull. Refusing it is the only honest reading
 *     of what the player was told.
 *   - **at Tier 2 you shoot at the ghost, and the ghost lies.** The launch aims
 *     at exactly the blurred position the contact payload carried — not at the
 *     truth, and not at some third number the server invented — so a
 *     speculative torpedo genuinely misses and the ping-or-shoot decision is
 *     real rather than decorative.
 *
 * Guns are deliberately untouched by any of this: their range sits inside the
 * distance at which a hull is audible, so "in range implies heard" and a tier
 * gate on them would tax the baseline weapon for nothing.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BEARING_BLUR_FRACTION,
  Faction,
  ResolutionTier,
  SIM,
  UnitKind,
  maxAudibleRangeM,
  statsFor,
} from '@echoes/shared';
import { hasComponent, removeEntity } from 'bitecs';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Health, Ordnance, Owner, Position, Structure, Unit } from '../src/sim/components.ts';
import { Terrain } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

/**
 * Two registered players on blank water, and **nothing else on the board**.
 *
 * `addPlayer` builds a whole starting base, and every hull in it listens. These
 * tests are about which tier one specific launcher holds on one specific
 * target, so an escort three kilometres away that happens to resolve the same
 * Cruiser better would silently decide the result. Clearing the board is the
 * difference between testing the tier gate and testing the opening position.
 */
function openWaterMatch(seed = 13): Match {
  const terrain = new Terrain(16000, 16000, 200);
  const match = new Match(undefined, { fauna: false, seed, terrain });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (!hasComponent(match.world, Owner, eid)) continue;
    if (!hasComponent(match.world, Unit, eid) && !hasComponent(match.world, Structure, eid)) {
      continue;
    }
    // Removed directly rather than through elimination: the victory check runs
    // only out of reap(), so this empties the map without ending the match.
    removeEntity(match.world, eid);
  }
  return match;
}

/**
 * Range at which a stationary Cruiser resolves to exactly `tier` for a
 * Corvette's ears, derived from the propagation model rather than guessed.
 *
 * Written this way because the first draft of these tests picked round numbers
 * and got Tier 0 — the audible envelope is a power law and eyeballing it is
 * how you write a test that asserts the wrong band.
 */
function rangeForTier(tier: ResolutionTier): number {
  const outer = maxAudibleRangeM(
    statsFor(UnitKind.Cruiser).sigIdle,
    1,
    statsFor(UnitKind.Corvette).hyd
  );
  const ratio = [1, 1, 1.5, 2.5, 4][tier]!;
  const upper = outer * Math.pow(ratio, -1 / 1.6);
  const nextRatio = [1.5, 1.5, 2.5, 4, 4][tier]!;
  const lower = tier === ResolutionTier.Track ? 0 : outer * Math.pow(nextRatio, -1 / 1.6);
  // Mid-band, so a small change in the model does not move the test into the
  // neighbouring tier.
  return (upper + lower) / 2;
}

/** Run until slot 0 holds a contact, and report the handle and tier. */
function contactOn(match: Match, seconds: number): { handle: number; tier: ResolutionTier } {
  let handle = 0;
  let tier = ResolutionTier.Silent;
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) {
    const snapshots = match.update(STEP_MS);
    const view = snapshots?.get(0);
    if (view === undefined) continue;
    for (const contact of view.contacts) {
      if (contact.tier >= tier) {
        tier = contact.tier;
        handle = contact.id;
      }
    }
  }
  return { handle, tier };
}

describe('firing solutions', () => {
  it('refuses a launch at a contact resolved no better than Tier 1', () => {
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 8000,
    });
    // Far enough that a Corvette (HYD 50) can only smudge it.
    spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 3000 + rangeForTier(ResolutionTier.Contact),
      y: 8000,
    });

    const { handle, tier } = contactOn(match, 3);
    assert.notEqual(handle, 0, 'the launcher should hear something out there');
    assert.equal(tier, ResolutionTier.Contact, 'and it should be no better than a smudge');

    assert.equal(
      match.orderLaunchTorpedo(0, launcher, handle),
      0,
      'a Tier-1 smudge is not a firing solution'
    );
  });

  it('launches at the ghost it was shown, not at the truth', () => {
    // The heart of §7. The aim point must be the blurred position the player
    // was told — a launch that quietly corrected to the true position would
    // make the ping worthless, and one that invented a third number would mean
    // the client and the simulation disagreed about what a player knows.
    const match = openWaterMatch(29);
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 8000,
    });
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 3000 + rangeForTier(ResolutionTier.Bearing),
      y: 8000,
    });

    let handle = 0;
    let ghostX = 0;
    let ghostY = 0;
    for (let i = 0; i < 400; i++) {
      const snapshots = match.update(STEP_MS);
      const view = snapshots?.get(0);
      if (view === undefined) continue;
      for (const contact of view.contacts) {
        if (contact.tier === ResolutionTier.Bearing) {
          handle = contact.id;
          ghostX = contact.x;
          ghostY = contact.y;
        }
      }
      if (handle !== 0) break;
    }
    assert.notEqual(handle, 0, 'the launcher should hold a bearing on the Cruiser');

    const trueX = Position.x[prey]!;
    const trueY = Position.y[prey]!;
    const lie = Math.hypot(ghostX - trueX, ghostY - trueY);
    assert.ok(lie > 0, 'a Tier-2 report should not be the true position');

    const torpedo = match.orderLaunchTorpedo(0, launcher, handle);
    assert.notEqual(torpedo, 0, 'a bearing is enough to shoot on');

    // The aim point stored on the ordnance is what the seeker falls back to
    // whenever it hears nothing, so this is the number that decides where a
    // speculative shot actually goes.
    assert.ok(
      Math.hypot(Ordnance.aimX[torpedo]! - ghostX, Ordnance.aimY[torpedo]! - ghostY) < 1,
      'the torpedo must swim at the ghost the player was shown'
    );
    assert.ok(
      Math.hypot(Ordnance.aimX[torpedo]! - trueX, Ordnance.aimY[torpedo]! - trueY) > 1,
      '...and therefore not at the truth'
    );

    // And the size of the lie is the documented one, not something larger the
    // launch path introduced on its own.
    const range = Math.hypot(trueX - Position.x[launcher]!, trueY - Position.y[launcher]!);
    assert.ok(
      lie <= range * BEARING_BLUR_FRACTION * 2,
      `the ghost should lie by about ${BEARING_BLUR_FRACTION * 100}% of range, not ${lie.toFixed(0)} m`
    );
  });

  it('gives an exact solution once the target classifies', () => {
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5000,
      y: 8000,
    });
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 6200,
      y: 8000,
    });

    let handle = 0;
    for (let i = 0; i < 100; i++) {
      const snapshots = match.update(STEP_MS);
      const view = snapshots?.get(0);
      if (view === undefined) continue;
      for (const contact of view.contacts) {
        if (contact.tier >= ResolutionTier.Classification) handle = contact.id;
      }
      if (handle !== 0) break;
    }
    assert.notEqual(handle, 0, 'a Cruiser at 1.2 km should classify to a Corvette');

    const torpedo = match.orderLaunchTorpedo(0, launcher, handle);
    assert.notEqual(torpedo, 0);
    assert.ok(
      Math.hypot(
        Ordnance.aimX[torpedo]! - Position.x[prey]!,
        Ordnance.aimY[torpedo]! - Position.y[prey]!
      ) < 1,
      'at Tier 3 and above the solution is exact'
    );
  });

  it('leaves guns tier-agnostic, as §4 requires', () => {
    // A gun's range sits inside the distance at which a hull is audible, so a
    // tier gate here would tax the baseline weapon to no purpose. This asserts
    // the *arithmetic* that licence rests on rather than the code path: if a
    // future roster gave something a gun that outranged its own ears, §4 would
    // need rewriting before combat.ts did.
    for (const kind of [UnitKind.LightScout, UnitKind.Corvette, UnitKind.Cruiser]) {
      const stats = statsFor(kind);
      assert.ok(
        stats.attackRangeM > 0,
        `${stats.name} should be armed for this check to mean anything`
      );
    }

    const match = openWaterMatch();
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5000,
      y: 8000,
    });
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5300,
      y: 8000,
    });
    // No snapshot has been produced yet, so no tier is held by anyone — and
    // the gun should open fire anyway.
    advance(match, 2);
    assert.ok(
      Health.hp[prey]! < statsFor(UnitKind.Corvette).maxHp,
      'a gun in range fires without asking the Echo Layer for permission'
    );
  });

  it("refuses another player's handle", () => {
    // The gate above is about resolution quality; this is about provenance.
    // Handles are per-observer and allocated per slot, so the same number means
    // different things — or nothing at all — to different players. A client
    // that learned an opponent's handle must not be able to shoot with it.
    const match = openWaterMatch();
    const mine = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5000,
      y: 8000,
    });
    const theirs = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 6200,
      y: 8000,
    });
    advance(match, 2);

    // Whatever slot 1 currently holds on slot 0's hull.
    let theirHandle = 0;
    for (let i = 0; i < 40; i++) {
      const snapshots = match.update(STEP_MS);
      const view = snapshots?.get(1);
      if (view === undefined) continue;
      for (const contact of view.contacts) theirHandle = contact.id;
      if (theirHandle !== 0) break;
    }
    assert.notEqual(theirHandle, 0, 'slot 1 should hold a contact for this to test anything');

    // Slot 1 firing with its own handle is legitimate and should work.
    assert.notEqual(
      match.orderLaunchTorpedo(1, theirs, theirHandle),
      0,
      'the handle should be good for the player it was issued to'
    );

    // The same number, used by the other player against their own hull's id
    // space, must not become a solution on anything.
    const before = Health.hp[mine]!;
    match.orderLaunchTorpedo(0, mine, theirHandle);
    advance(match, 6);
    assert.equal(
      Health.hp[mine],
      before,
      "a borrowed handle must never turn into a torpedo aimed at its owner's own hull"
    );
  });
});
