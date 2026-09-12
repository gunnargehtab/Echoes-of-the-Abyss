/**
 * The commander answers a torpedo with a decoy (#621) —
 * docs/systems-combat.md §5.
 *
 * `noisemaker` was one of six client messages with no `AiCommand` variant, so
 * for the whole of `ai/`'s life the deliberate half of §5's countermeasure
 * pair was a verb only a human could say. Every stored table under
 * `tools/balance/baselines/` was measured against navies that could answer a
 * torpedo with their guns and nothing else — point defence is automatic
 * (`sim/systems/combat.ts`) and needs no order, which is why the gap was
 * invisible rather than total.
 *
 * What is asserted here is the *decision*, because the mechanism already has
 * a test: `countermeasures.test.ts` holds the seeker re-acquiring onto the
 * louder emitter. This file holds the four gates in front of that, and each
 * one is a way the branch could be wrong without looking broken:
 *
 *   - the command reaches the simulation at all, through the seat and the
 *     same `Match.deployNoisemaker` a player's message reaches;
 *   - the doctrine decides, per navy, because SIG 70 at your real position is
 *     a choice about sound and two of the four navies are built on not making
 *     it;
 *   - a hull that is standing still does not spend its suite. This is the one
 *     that was measured rather than reasoned: the decoy goes 60 m astern of
 *     the hull's *velocity*, and a hull with no velocity has no astern — it
 *     drops the thing on its own axis and is hit at every range there is;
 *   - one decoy per torpedo rather than one per hull in earshot, because the
 *     loudest emitter *now* wins and the second decoy buys nothing the first
 *     did not while paying for it again.
 *
 * The range itself is asserted as a band rather than against the module's own
 * constant, deliberately: what §5 promises is that a countermeasure is sized
 * against launches "from inside a kilometre", and a test that imported the
 * number would only be checking that the number equals itself.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent } from 'bitecs';
import {
  AiDifficulty,
  Faction,
  OrdnanceKind,
  ResolutionTier,
  SIM,
  UnitKind,
  statsFor,
  type Contact,
  type EchoSnapshot,
  type OwnUnit,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Health, Ordnance, Owner } from '../src/sim/components.ts';
import { launchTorpedo } from '../src/sim/systems/ordnance.ts';
import { Terrain } from '../src/sim/terrain.ts';
import type { AiBriefing, AiCommand } from '../src/ai/types.ts';

const SEED = 0x621;
const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_EVERY = SIM.TICK_HZ / SIM.ECHO_HZ;

/** A briefing for `faction` in slot 1, plus one real snapshot to borrow the shape of. */
function rig(faction: Faction): { brief: AiBriefing; base: EchoSnapshot } {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, faction);
  const brief = briefingFor(match, 1, faction, AiDifficulty.Veteran);
  let base: EchoSnapshot | undefined;
  for (let i = 0; i < ECHO_EVERY * 2 && base === undefined; i++) {
    base = match.update(STEP_MS)?.get(1);
  }
  assert.ok(base !== undefined, 'the match produced no snapshot to work from');
  return { brief, base };
}

/** An armed hull with its suite ready — `decoyCooldownS` is absent while it is. */
function hull(id: number, x: number, y: number): OwnUnit {
  const stats = statsFor(UnitKind.Corvette);
  assert.ok(stats.attackDamage > 0, 'the rig needs a hull that carries a suite');
  return {
    id,
    kind: UnitKind.Corvette,
    x,
    y,
    depth: 600,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    heading: 0,
    sig: stats.sigCruise,
    silentRunning: false,
    engineOff: false,
    pressureBonus: 0,
    unhealableDamage: 0,
  };
}

/** A torpedo as the Echo Layer reports one: classified, so Tier 3. */
function torpedo(id: number, x: number, y: number, tick: number): Contact {
  return {
    id,
    tier: ResolutionTier.Classification,
    x,
    y,
    depth: 600,
    ordnance: OrdnanceKind.Torpedo,
    tick,
  };
}

/**
 * Drive `commander` through enough observations to decide twice, with the
 * hulls at `first` and then at `second`, and report the decoys it ordered.
 *
 * Two positions because "under way" is a comparison between observations —
 * the first decision has nothing to compare against and can only establish
 * where the force stood.
 */
function decoysOrdered(
  brief: AiBriefing,
  base: EchoSnapshot,
  first: OwnUnit[],
  second: OwnUnit[],
  contacts: Contact[]
): AiCommand[] {
  const commander = new AiCommander(brief);
  const ordered: AiCommand[] = [];
  let tick = base.tick;
  // Ten observations: comfortably more than one Veteran cadence, so the force
  // is placed, then moved, then decided on.
  for (let i = 0; i < 10; i++) {
    tick += ECHO_EVERY;
    const units = i < 5 ? first : second;
    const snapshot: EchoSnapshot = {
      ...base,
      tick,
      units,
      contacts: i < 5 ? [] : contacts.map((c) => ({ ...c, tick })),
    };
    for (const command of commander.observe(snapshot)) {
      if (command.kind === 'noisemaker') ordered.push(command);
    }
  }
  return ordered;
}

/** The same force, moved 60 m east — under way by any measure. */
function movedEast(units: OwnUnit[], byM = 60): OwnUnit[] {
  return units.map((u) => ({ ...u, x: u.x + byM }));
}

describe('answering a torpedo with a decoy (#621)', () => {
  it('reaches the simulation through the seat, and puts a decoy in the water', () => {
    // The end-to-end arm: a real match, a real torpedo, a real `AiSeat`. What
    // it proves is the half a synthesised snapshot cannot — that the variant
    // is translated and that `Match.deployNoisemaker` accepts what the
    // commander names, ownership check and all.
    const terrain = new Terrain(24000, 24000, 200);
    const match = new Match(undefined, { fauna: false, seed: SEED, terrain });
    match.addPlayer(0, Faction.Pelagia);
    match.addPlayer(1, Faction.Bathyarch);
    const seat = new AiSeat(match, briefingFor(match, 1, Faction.Bathyarch, AiDifficulty.Veteran));

    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Pelagia,
      x: 9000,
      y: 12000,
    });
    const defender = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Bathyarch,
      x: 9800,
      y: 12000,
    });
    // Under way, because a stopped hull correctly declines — see below.
    match.orderMove(1, defender, 9800, 18000);
    match.update(STEP_MS);
    launchTorpedo(match.world, launcher, 9800, 12000);

    let deployed = 0;
    for (let i = 0; i < SIM.TICK_HZ * 6; i++) {
      const own = match.update(STEP_MS)?.get(1);
      if (own !== undefined) seat.observe(own);
      for (let eid = 0; eid < Ordnance.kind.length; eid++) {
        if (!hasComponent(match.world, Ordnance, eid)) continue;
        if (Ordnance.kind[eid] !== OrdnanceKind.Noisemaker) continue;
        if (Owner.slot[eid] !== 1 || Health.hp[eid]! <= 0) continue;
        deployed++;
        break;
      }
      if (deployed > 0) break;
    }
    assert.ok(deployed > 0, 'the commander never got a decoy into the water');
  });

  it('lets the doctrine decide, because the price is paid in the navy’s own quiet', () => {
    // The identical picture put to two commanders. The Consortium is heard
    // from four minutes out whatever it does; the Veil harvests at 18 SIG and
    // is buying exactly the thing a decoy spends. Same snapshot, opposite
    // answers, and that is the whole content of `answersTorpedoesWithNoise`.
    for (const [faction, expected] of [
      [Faction.Bathyarch, true],
      [Faction.Hadron, true],
      [Faction.Pelagia, false],
      [Faction.Directorate, false],
    ] as const) {
      const { brief, base } = rig(faction);
      const force = [hull(901, 6000, 6000)];
      const ordered = decoysOrdered(brief, base, force, movedEast(force), [
        torpedo(1, 6400, 6000, base.tick),
      ]);
      assert.equal(
        ordered.length > 0,
        expected,
        `${Faction[faction]} ${expected ? 'should' : 'should not'} answer a torpedo with noise`
      );
    }
  });

  it('does not spend a decoy out of a hull that is standing still', () => {
    // Measured, not reasoned: `Match.deployNoisemaker` releases the decoy 60 m
    // astern of the hull's velocity, and reads a zero velocity as a zero
    // heading — so a parked hull always drops it due west of itself, on its
    // own axis. Driven at 60 Hz against a certain hit, a stopped hull is hit
    // at every deployment range there is, while the same hull breaking across
    // the torpedo's nose is saved anywhere from 173 m out to about 2,000 m.
    // A decoy is something a hull leaves behind; it has to be leaving.
    const { brief, base } = rig(Faction.Bathyarch);
    const parked = [hull(902, 6000, 6000)];
    const ordered = decoysOrdered(brief, base, parked, parked, [torpedo(1, 6400, 6000, base.tick)]);
    assert.equal(ordered.length, 0, 'a parked hull spent a decoy that could not have worked');
  });

  it('spends one decoy per torpedo, not one per hull that can hear it', () => {
    // Four hulls, one inbound weapon. Four decoys is eight seconds of the
    // formation announcing itself four times over to break one lock, and the
    // loudest emitter *now* wins — so the second decoy buys nothing the first
    // did not and pays SIG 70 for it again.
    const { brief, base } = rig(Faction.Bathyarch);
    const force = [
      hull(911, 6000, 6000),
      hull(912, 6120, 6000),
      hull(913, 6000, 6120),
      hull(914, 6120, 6120),
    ];
    const ordered = decoysOrdered(brief, base, force, movedEast(force), [
      torpedo(1, 6400, 6000, base.tick),
    ]);
    assert.equal(ordered.length, 1, 'more than one hull answered the same torpedo');

    // And two weapons buy two answers, from two different hulls — the cap is
    // per torpedo, not a rate limit on the force.
    const pair = decoysOrdered(brief, base, force, movedEast(force), [
      torpedo(1, 6400, 6000, base.tick),
      torpedo(2, 6400, 6600, base.tick),
    ]);
    assert.equal(pair.length, 2, 'two inbound weapons should buy two answers');
    assert.equal(
      new Set(pair.map((c) => (c.kind === 'noisemaker' ? c.unitId : 0))).size,
      2,
      'the same hull was asked for two decoys, one of which the sim would refuse'
    );
  });

  it('ignores a torpedo outside the window §5 sizes countermeasures against', () => {
    // "Launches that connect are launches from inside a kilometre" (§5). Past
    // that the decoy's eight seconds are spent before the weapon arrives and
    // the suite is on a 20 s cooldown for the approach that matters — so a
    // decoy fired at a distant torpedo is worse than none.
    const { brief, base } = rig(Faction.Bathyarch);
    const force = [hull(921, 6000, 6000)];
    const near = decoysOrdered(brief, base, force, movedEast(force), [
      torpedo(1, 6600, 6000, base.tick),
    ]);
    assert.equal(near.length, 1, 'a torpedo well inside the kilometre went unanswered');

    const far = decoysOrdered(brief, base, force, movedEast(force), [
      torpedo(1, 8500, 6000, base.tick),
    ]);
    assert.equal(far.length, 0, 'a torpedo 2.5 km out bought a decoy it would outlive');
  });

  it('will not answer a contact it has not classified', () => {
    // §1 requires a torpedo to be audible its whole run, not identifiable for
    // it: below Tier 3 a closing contact could be ordnance or a scout, and the
    // seconds spent deciding which are the mechanic. A commander that decoyed
    // every fast smudge would be spending its suite on the tier's own
    // ambiguity — and buying an answer the layer had not sold it.
    const { brief, base } = rig(Faction.Bathyarch);
    const force = [hull(931, 6000, 6000)];
    const smudge: Contact = { id: 1, tier: ResolutionTier.Bearing, x: 6400, y: 6000, tick: 0 };
    const ordered = decoysOrdered(brief, base, force, movedEast(force), [smudge]);
    assert.equal(ordered.length, 0, 'an unclassified smudge bought a decoy');
  });
});
