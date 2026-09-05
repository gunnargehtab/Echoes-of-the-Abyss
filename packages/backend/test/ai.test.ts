/**
 * The skirmish AI.
 *
 * The first suite is the one that justifies the rest. A conventional RTS AI
 * cheats by reading world state and nobody minds; here that would not be
 * merely unfair, it would be a different game played in the same room. So the
 * central test does not check that the AI is *good* — it checks that every
 * command it issues names only something it was told about: its own units and
 * structures, contact handles it earned, nodule fields printed on the map.
 *
 * An AI that read the ECS would have to name an entity that never appeared in
 * any snapshot it was given, and that is exactly what fails here.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVE_SONAR,
  AiDifficulty,
  DEPTH,
  Faction,
  HarvestThrottle,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
  type Contact,
  type EchoSnapshot,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { DOCTRINE, TUNING } from '../src/ai/doctrine.ts';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import type { AiBriefing, AiCommand } from '../src/ai/types.ts';
import { Match } from '../src/sim/match.ts';

const SEED = 0xa1;

/** A match with a commander in slot 1 and a scripted human in slot 0. */
function skirmish(difficulty = AiDifficulty.Veteran): { match: Match; seat: AiSeat } {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  const seat = new AiSeat(match, briefingFor(match, 1, Faction.Pelagia, difficulty));
  return { match, seat };
}

/** Run the match, feeding the commander its own snapshot on every Echo tick. */
function play(match: Match, seat: AiSeat, seconds: number): void {
  const stepMs = 1000 / SIM.TICK_HZ;
  for (let tick = 0; tick < seconds * SIM.TICK_HZ; tick++) {
    const snapshots = match.update(stepMs);
    const own = snapshots?.get(seat.slot);
    if (own !== undefined) seat.observe(own);
  }
}

describe('the AI plays with the information a player has', () => {
  it('names only what its own snapshot told it about', () => {
    // The acceptance criterion of the whole feature, as an assertion. Every
    // command is checked against the snapshot that produced it: unit ids from
    // its own force, structure ids from its own base, contact handles from
    // its own contact list, node ids from the public survey charts.
    const match = new Match(undefined, { fauna: false, seed: SEED });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    const briefing = briefingFor(match, 1, Faction.Pelagia, AiDifficulty.Veteran);
    const commander = new AiCommander(briefing);
    const nodeIds = new Set(briefing.nodes.map((n) => n.id));

    const stepMs = 1000 / SIM.TICK_HZ;
    let commandsSeen = 0;

    for (let tick = 0; tick < 90 * SIM.TICK_HZ; tick++) {
      const snapshots = match.update(stepMs);
      const own = snapshots?.get(1);
      if (own === undefined) continue;

      const unitIds = new Set(own.units.map((u) => u.id));
      const structureIds = new Set(own.structures.map((s) => s.id));
      const contactIds = new Set(own.contacts.map((c) => c.id));

      for (const command of commander.observe(own)) {
        commandsSeen++;
        assertOnlyKnown(command, { unitIds, structureIds, contactIds, nodeIds, briefing });
        // Apply it, so the match the commander is reasoning about is the one
        // its own orders produced. A test that never applied them would only
        // check the opening position.
        applyTo(match, 1, command);
      }
    }

    assert.ok(commandsSeen > 20, `the commander should be doing something (${commandsSeen})`);
  });

  it('cannot see a contact it has not resolved', () => {
    // The negative case, stated directly: hand it a snapshot with an empty
    // contact list while an enemy fleet is unquestionably out there, and it
    // must not produce an attack order. There is no handle for it to use.
    const { match } = skirmish();
    const commander = new AiCommander(briefingFor(match, 1, Faction.Pelagia, AiDifficulty.Veteran));
    const stepMs = 1000 / SIM.TICK_HZ;

    let attacks = 0;
    for (let tick = 0; tick < 60 * SIM.TICK_HZ; tick++) {
      const snapshots = match.update(stepMs);
      const own = snapshots?.get(1);
      if (own === undefined) continue;
      const deafened: EchoSnapshot = { ...own, contacts: [] };
      for (const command of commander.observe(deafened)) {
        if (command.kind === 'attack') attacks++;
      }
    }
    assert.equal(attacks, 0, 'no contacts means no attack orders, whatever is really out there');
  });
});

describe('the AI plays the game', () => {
  it('harvests, and keeps its nodule income running', () => {
    const { match, seat } = skirmish();
    play(match, seat, 60);
    const snapshot = lastSnapshot(match, 1);
    assert.ok(snapshot.nodules > 0, `it should be earning (${snapshot.nodules})`);
    assert.ok(seat.commandsIssued > 0, 'and issuing orders to do it');
  });

  it('builds, produces and expands its force', () => {
    const { match, seat } = skirmish();
    play(match, seat, 130);
    const snapshot = lastSnapshot(match, 1);

    assert.ok(
      snapshot.structures.length > 2,
      `it should have built something beyond its opening (${snapshot.structures.length})`
    );
    const army = snapshot.units.filter((u) => u.kind !== UnitKind.Harvester);
    assert.ok(army.length >= 3, `and produced hulls (${army.length})`);
    const harvesters = snapshot.units.filter((u) => u.kind === UnitKind.Harvester);
    assert.ok(
      harvesters.length >= 2,
      `and more harvesters than it started with (${harvesters.length})`
    );
  });

  it('sets a throttle rather than leaving the default', () => {
    const { match, seat } = skirmish();
    play(match, seat, 40);
    const snapshot = lastSnapshot(match, 1);
    const harvesters = snapshot.units.filter((u) => u.kind === UnitKind.Harvester);
    assert.ok(harvesters.length > 0);
    // Pelagia's doctrine rests at Standard: the Commune buys quiet.
    assert.ok(
      harvesters.every((h) => h.throttle === HarvestThrottle.Standard),
      'the Commune should be working at its resting throttle'
    );
  });

  it('moves its army off the spawn instead of sitting on the Bastion', () => {
    const { match, seat } = skirmish();
    const start = match.map.spawns[1]!;
    play(match, seat, 120);
    const snapshot = lastSnapshot(match, 1);
    const army = snapshot.units.filter((u) => u.kind !== UnitKind.Harvester);
    assert.ok(army.length > 0, 'it has an army at all');
    const moved = army.some((u) => Math.hypot(u.x - start.x, u.y - start.y) > 800);
    assert.ok(moved, 'something should have left the base');
  });
});

describe('production does not deadlock', () => {
  /**
   * A commander with a full harvester complement and an empty wallet.
   *
   * The Knights are the case that broke: their composition opens with a
   * 420-nodule Cruiser, and a commander that could not afford one queued
   * nothing — so its army never grew, so the cycle index never moved, so the
   * next decision picked the same unaffordable Cruiser. Forever.
   */
  function broke(nodules: number): EchoSnapshot {
    const base = exposedSnapshot();
    const hull = (id: number, kind: UnitKind): EchoSnapshot['units'][number] => ({
      id,
      kind,
      x: 1000,
      y: 1000,
      depth: 300,
      hp: 100,
      maxHp: 100,
      heading: 0,
      sig: 30,
      silentRunning: false,
      pressureBonus: 0,
      unhealableDamage: 0,
      ...(kind === UnitKind.Harvester ? { cargo: 0, throttle: HarvestThrottle.Standard } : {}),
    });
    return {
      ...base,
      tick: 6000,
      nodules,
      exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
      // Four harvesters, so nothing is wanted there, and three armed hulls —
      // the opening escort, and the army length that selects a Cruiser.
      units: [
        ...[1, 2, 3, 4].map((id) => hull(id, UnitKind.Harvester)),
        ...[5, 6, 7].map((id) => hull(id, UnitKind.Corvette)),
      ],
      structures: [
        {
          id: 20,
          kind: StructureKind.Foundry,
          x: 1000,
          y: 1000,
          depth: 300,
          hp: 1500,
          maxHp: 1500,
          sig: 35,
          buildProgress: 1,
          queue: [],
          queueProgress: 0,
        },
      ],
      contacts: [],
    };
  }

  function produced(faction: Faction, nodules: number): UnitKind[] {
    const commander = new AiCommander({ ...briefing(AiDifficulty.Veteran), faction });
    const built: UnitKind[] = [];
    for (let i = 0; i < 12; i++) {
      for (const command of commander.observe(broke(nodules))) {
        if (command.kind === 'produce') built.push(command.unit);
      }
    }
    return built;
  }

  it('buys its second choice when it cannot afford its first', () => {
    // 200 nodules: a Cruiser is 420, a Corvette 120. It must buy the Corvette.
    const built = produced(Faction.Hadron, 200);
    assert.ok(built.length > 0, 'a commander with money in hand must build something');
    assert.ok(
      built.every((kind) => statsFor(kind).cost <= 200),
      `it can only buy what it can pay for: ${built.map((k) => statsFor(k).name).join(', ')}`
    );
  });

  it('still takes its first choice when it can afford one', () => {
    // The guard on the test above: a fallback that fired unconditionally would
    // reduce every doctrine to whatever is cheapest, which is not a doctrine.
    const built = produced(Faction.Hadron, 5000);
    assert.ok(built.includes(UnitKind.Cruiser), 'the Knights are supposed to field Cruisers');
  });

  it('builds nothing at all when it can afford nothing at all', () => {
    assert.deepEqual(produced(Faction.Hadron, 10), []);
  });
});

describe('difficulty is decision quality, not information', () => {
  it('gives both difficulties the same snapshot and gets different play', () => {
    const recruit = skirmish(AiDifficulty.Recruit);
    const veteran = skirmish(AiDifficulty.Veteran);
    play(recruit.match, recruit.seat, 60);
    play(veteran.match, veteran.seat, 60);

    // A Veteran re-decides five times as often, so it issues more orders from
    // the same stream of snapshots. That is the entire difference.
    assert.ok(
      veteran.seat.commandsIssued > recruit.seat.commandsIssued,
      `veteran ${veteran.seat.commandsIssued} vs recruit ${recruit.seat.commandsIssued}`
    );
  });

  it('has no tuning field that could widen what the AI perceives', () => {
    // Structural rather than behavioural, and deliberately: the promise is
    // that a harder AI never hears more, and the way to keep that promise is
    // for there to be nowhere to put a vision multiplier. If someone adds one,
    // this test names it.
    const allowed = new Set([
      'cadenceTicks',
      'managesExposure',
      'usesSilentRunning',
      'pingsToClassify',
      'patience',
    ]);
    for (const tuning of Object.values(TUNING)) {
      for (const key of Object.keys(tuning)) {
        assert.ok(allowed.has(key), `unexpected difficulty knob "${key}" — does it grant vision?`);
      }
    }
  });

  it('reacts to its own exposure only when it is good enough to', () => {
    const veteran = watched();
    const recruit = watched(Faction.Pelagia, AiDifficulty.Recruit);

    // Long enough to clear the Commune's six-second hold several times over,
    // so what separates these two is the tuning knob and nothing else.
    assert.equal(
      veteran.feed(30, ResolutionTier.Bearing),
      HarvestThrottle.Trickle,
      'a Veteran Commune quiets down when something keeps a bearing on it'
    );
    assert.equal(
      recruit.feed(30, ResolutionTier.Bearing),
      HarvestThrottle.Standard,
      'a Recruit sets its resting throttle and never reconsiders it'
    );
  });
});

/**
 * The exposure watch (issue #148).
 *
 * The drop used to fire on `exposure.tier >= Bearing` and hold for as long as
 * that stayed true, which was a fair model of a lever that cost nothing. It
 * costs 54% of an economy now, so these tests are about the commander being
 * able to be *wrong* — the trigger it acts on has to be one that a passing
 * sweep does not satisfy, and the spell it buys has to end.
 */
describe('quiet costs half an economy, so it is a judgement', () => {
  it('does not pay for a bearing that does not stick', () => {
    // Four seconds inside the Commune's six-second hold: somebody swept past.
    assert.equal(
      watched().feed(4, ResolutionTier.Bearing),
      HarvestThrottle.Standard,
      'a sweep is not an approach, and half the income is a lot to bet on one'
    );
  });

  it('pays once the bearing is held long enough to mean something', () => {
    assert.equal(watched().feed(10, ResolutionTier.Bearing), HarvestThrottle.Trickle);
  });

  it('lets the navy with the best ears wait the longest', () => {
    // The doctrine difference, as the only difference: same water, same
    // difficulty, same tier, and the Listening keeps working through it
    // because whatever is converting that bearing into an approach, it will
    // hear coming. Ten seconds clears the Commune's hold and not its own.
    const commune = watched(Faction.Pelagia);
    const directorate = watched(Faction.Directorate);
    assert.equal(commune.feed(10, ResolutionTier.Bearing), HarvestThrottle.Trickle);
    assert.equal(
      directorate.feed(10, ResolutionTier.Bearing),
      HarvestThrottle.Standard,
      'the Directorate is the one navy that can afford to find out'
    );
    // And it is a wait, not a refusal.
    assert.equal(directorate.feed(20, ResolutionTier.Bearing), HarvestThrottle.Trickle);
  });

  it('skips the wait when somebody has full resolution', () => {
    // Track is exact unit, health and facing. Nobody holds that by accident,
    // so it is the one reading that is not worth deliberating over.
    assert.equal(watched().feed(1, ResolutionTier.Track), HarvestThrottle.Trickle);
  });

  it('goes back to earning as soon as the bearing is actually gone', () => {
    // The cheap direction, and it is deliberately the fast one. Being loud for
    // a few seconds costs SIG; being quiet for a few seconds costs half an
    // economy. A draft with a symmetric fifteen-second release was measured
    // giving most of the win back — a Directorate quiet for 66% of a match
    // against this rule's 47%, on the same seed.
    const rig = watched();
    assert.equal(rig.feed(10, ResolutionTier.Bearing), HarvestThrottle.Trickle);
    assert.equal(rig.feed(5, ResolutionTier.Silent), HarvestThrottle.Standard);
  });

  it('does not let a blink between sweeps count as the bearing breaking', () => {
    // Detection resolves at ECHO_HZ, so a hull between two sweeps drops out of
    // the report for a moment and comes back. A watch that took that as proof
    // the quiet had worked would spend the match toggling; one ping's reveal
    // is the shortest gap the acoustic model can manufacture, so anything
    // under it is bridged.
    const rig = watched();
    assert.equal(rig.feed(10, ResolutionTier.Bearing), HarvestThrottle.Trickle);
    assert.equal(
      rig.feed(ACTIVE_SONAR.REVEAL_DURATION_S - 1, ResolutionTier.Silent),
      HarvestThrottle.Trickle
    );
    assert.equal(rig.feed(1, ResolutionTier.Bearing), HarvestThrottle.Trickle);
  });

  it('never spends longer hiding than it spent being heard', () => {
    // The property the reflex had for free and the first draft of this watch
    // lost: hiding is a subset of exposure. Twelve-second gaps are the median
    // the balance harness measures on `ventfront-divide`, so this is the shape
    // of a real match rather than a contrived one.
    const rig = watched();
    let heardS = 0;
    let quietS = 0;
    for (let cycle = 0; cycle < 6; cycle++) {
      for (let second = 0; second < 40; second++) {
        heardS += 1;
        if (rig.feed(1, ResolutionTier.Bearing) === HarvestThrottle.Trickle) quietS += 1;
      }
      for (let second = 0; second < 12; second++) {
        if (rig.feed(1, ResolutionTier.Silent) === HarvestThrottle.Trickle) quietS += 1;
      }
    }
    assert.ok(
      quietS <= heardS,
      `it hid for ${quietS} s of a match it was heard in for ${heardS} s`
    );
  });

  it('ends a spell of quiet that is not working, and banks a trip before the next', () => {
    // The floor. Exposure is a fact about the whole force — a Bastion, a
    // rallied army and a scout on its leg are all resolved by the same
    // hydrophones — so a bearing that survives ninety seconds of Trickle is
    // not being held by the harvesters, and no amount of further quiet will
    // buy it off.
    const rig = watched();
    assert.equal(rig.feed(10, ResolutionTier.Bearing), HarvestThrottle.Trickle);
    assert.equal(
      rig.feed(95, ResolutionTier.Bearing),
      HarvestThrottle.Standard,
      'the bet lost, so stop paying for it'
    );
    assert.equal(
      rig.feed(30, ResolutionTier.Bearing),
      HarvestThrottle.Standard,
      'and do not re-open it on the next observation, which is the reflex again'
    );
    assert.equal(
      rig.feed(30, ResolutionTier.Bearing),
      HarvestThrottle.Trickle,
      'once a round trip is banked, it may buy quiet again'
    );
  });

  it('never touches the throttle of a navy that has no answer to being heard', () => {
    for (const faction of [Faction.Bathyarch, Faction.Hadron]) {
      const rig = watched(faction);
      const resting = DOCTRINE[faction].restingThrottle;
      assert.equal(rig.feed(600, ResolutionTier.Track), resting);
      assert.ok(
        rig.ordered.every((t) => t === resting),
        `it ordered a throttle its doctrine does not rest at: ${rig.ordered.join(', ')}`
      );
    }
  });
});

describe('it pings and hides for reasons', () => {
  /**
   * A fresh commander, fed an army already in the water.
   *
   * Deliberately not warmed up: a commander decides on its very first
   * observation, and an earlier version of this helper spent that decision on
   * a throwaway snapshot — which swallowed the one Silent Running order the
   * test was looking for and made a working commander look broken.
   */
  function fielded(difficulty = AiDifficulty.Veteran): AiCommander {
    return new AiCommander(briefing(difficulty));
  }

  function pingsAt(commander: AiCommander, contacts: Contact[]): boolean {
    for (let i = 0; i < 12; i++) {
      for (const command of commander.observe(armySnapshot(contacts))) {
        if (command.kind === 'ping') return true;
      }
    }
    return false;
  }

  it('transmits to classify a smudge sitting next to its army', () => {
    // The one situation active sonar buys something a hydrophone will not:
    // the thing is already known to be there, and the question is what it is.
    assert.ok(pingsAt(fielded(), [contact({ tier: ResolutionTier.Contact, x: 2600, y: 2000 })]));
  });

  it('does not transmit from its own doorstep', () => {
    // Half of a bug the balance harness caught: every commander of every
    // faction used to transmit 0.4 s into the match. The Drift puts creatures
    // near a spawn, so there was always something unclassified beside the
    // opening force — and naming it cost 2,400 m of self-reveal to identify
    // a fish. A force that has not deployed has nothing to learn.
    const commander = fielded();
    const home = briefing(AiDifficulty.Veteran).spawns[1]!;
    const smudge = [contact({ tier: ResolutionTier.Contact, x: home.x + 200, y: home.y })];
    const atHome = (): EchoSnapshot => {
      const snapshot = armySnapshot(smudge);
      return { ...snapshot, units: snapshot.units.map((u) => ({ ...u, x: home.x, y: home.y })) };
    };

    let pinged = false;
    for (let i = 0; i < 12; i++) {
      for (const command of commander.observe(atHome())) {
        if (command.kind === 'ping') pinged = true;
      }
    }
    assert.equal(pinged, false);
  });

  it('holds its first transmission until the opening is over', () => {
    // The other half. Even deployed, a commander waits one doctrine interval
    // before its first ping, so an opening cannot be given away for free.
    const commander = fielded();
    const smudge = [contact({ tier: ResolutionTier.Contact, x: 2600, y: 2000 })];
    let pinged = false;
    for (let i = 0; i < 12; i++) {
      for (const command of commander.observe(armySnapshot(smudge, 60))) {
        if (command.kind === 'ping') pinged = true;
      }
    }
    assert.equal(pinged, false, 'one minute in is too early for the Commune');
  });

  it('does not transmit into empty water', () => {
    // Pinging with nothing to resolve pays the whole cost — 2,400 m of
    // self-reveal — for no information at all.
    assert.equal(pingsAt(fielded(), []), false);
  });

  it('does not transmit at something it has already classified', () => {
    // Tier 3 already names the hull. A ping would buy health and heading at
    // the price of telling the map exactly where the pinger is.
    assert.equal(
      pingsAt(fielded(), [contact({ tier: ResolutionTier.Classification, x: 2600, y: 2000 })]),
      false
    );
  });

  it('never transmits at a Recruit difficulty', () => {
    assert.equal(
      pingsAt(fielded(AiDifficulty.Recruit), [
        contact({ tier: ResolutionTier.Contact, x: 2600, y: 2000 }),
      ]),
      false
    );
  });

  it('runs silent while approaching and drops it to fight', () => {
    // Silent Running trades weapons for quiet (docs/systems-echo.md §6), so a
    // commander that stayed silent into contact would arrive unable to shoot.
    const commander = fielded();
    const silentDecisions: boolean[] = [];
    const observe = (contacts: Contact[]): void => {
      for (const command of commander.observe(armySnapshot(contacts))) {
        if (command.kind === 'silent') silentDecisions.push(command.active);
      }
    };

    // Nothing heard, army at strength: the Commune approaches quietly.
    for (let i = 0; i < 10; i++) observe([]);
    assert.equal(silentDecisions.at(-1), true, 'quiet on the way in');

    // Something within engagement range: weapons back on.
    for (let i = 0; i < 10; i++) {
      observe([contact({ tier: ResolutionTier.Classification, x: 2450, y: 2050 })]);
    }
    assert.equal(silentDecisions.at(-1), false, 'loud once there is something to shoot');
  });

  it('turns for home when something is heard near the Bastion', () => {
    // Losing the Bastion is losing, so a raid outranks a push regardless of
    // how well the push was going.
    const commander = fielded();
    const home = briefing(AiDifficulty.Veteran).spawns[1]!;
    let recalled = false;
    for (let i = 0; i < 12; i++) {
      // Classified, not a bearing: inside the Bastion's own ears nothing stays
      // a smudge for long, and a smudge on the doorstep is what a grazer
      // looks like — it no longer recalls the army (#440).
      const raid = contact({
        tier: ResolutionTier.Classification,
        x: home.x + 400,
        y: home.y + 400,
      });
      for (const command of commander.observe(armySnapshot([raid]))) {
        if (command.kind === 'move' && Math.hypot(command.x - home.x, command.y - home.y) < 1200) {
          recalled = true;
        }
        if (command.kind === 'attack' && command.contactId === raid.id) recalled = true;
      }
    }
    assert.ok(recalled, 'the army should have come home');
  });
});

// --- helpers ---------------------------------------------------------------

function briefing(difficulty: AiDifficulty): AiBriefing {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(1, Faction.Pelagia);
  return briefingFor(match, 1, Faction.Pelagia, difficulty);
}

/**
 * A commander fed one snapshot per Echo tick, with the clock actually moving.
 *
 * The clock is the whole point. Every other helper here can hand the same
 * snapshot over and over, because the decisions they test are functions of
 * what is in it — but the exposure watch measures *how long* a bearing has
 * been held, so a fixed tick is a commander that has been exposed for zero
 * seconds forever. `feed` advances one observation at a time, exactly as the
 * seat does, and reports the throttle its harvester is left running at.
 */
function watched(
  faction = Faction.Pelagia,
  difficulty = AiDifficulty.Veteran
): {
  feed: (seconds: number, tier: ResolutionTier) => HarvestThrottle;
  ordered: HarvestThrottle[];
} {
  const commander = new AiCommander({ ...briefing(difficulty), faction });
  const ordered: HarvestThrottle[] = [];
  // Whatever the harvester was last told to run at. Reported back in the next
  // snapshot, so a commander that is already at the throttle it wants issues
  // nothing — which is what makes `ordered` a record of decisions.
  let throttle = HarvestThrottle.Standard;
  let tick = 600;

  const feed = (seconds: number, tier: ResolutionTier): HarvestThrottle => {
    const until = tick + seconds * SIM.TICK_HZ;
    while (tick < until) {
      const base = exposedSnapshot();
      const snapshot: EchoSnapshot = {
        ...base,
        tick,
        units: [{ ...base.units[0]!, throttle }],
        exposure: { tier, trackedCount: tier >= ResolutionTier.Bearing ? 1 : 0 },
      };
      for (const command of commander.observe(snapshot)) {
        if (command.kind === 'throttle') {
          throttle = command.throttle;
          ordered.push(command.throttle);
        }
      }
      tick += SIM.TICK_HZ / SIM.ECHO_HZ;
    }
    return throttle;
  };

  return { feed, ordered };
}

/** A snapshot of one harvester on Standard, with someone holding a bearing. */
function exposedSnapshot(): EchoSnapshot {
  return {
    tick: 600,
    ordnance: [],
    units: [
      {
        id: 1,
        kind: UnitKind.Harvester,
        x: 1000,
        y: 1000,
        depth: 300,
        hp: 100,
        maxHp: 100,
        heading: 0,
        sig: 40,
        silentRunning: false,
        pressureBonus: 0,
        unhealableDamage: 0,
        cargo: 0,
        throttle: HarvestThrottle.Standard,
      },
    ],
    structures: [],
    contacts: [],
    peakSig: 40,
    berths: { used: 0, granted: 0 },
    nodules: 0,
    crystal: 0,
    biomass: 0,
    exposure: { tier: ResolutionTier.Bearing, trackedCount: 1 },
    selfEvents: [],
    draw: { capacity: 6, demand: 0, satisfaction: 1 },
    driftHealth: [],
    shoals: [],
    jellies: [],
    hazards: [],
    marks: [],
  };
}

let contactSeq = 0;

function contact(overrides: Partial<Contact> & { tier: ResolutionTier }): Contact {
  return { id: ++contactSeq, x: 0, y: 0, tick: 6000, ...overrides };
}

/**
 * Six armed hulls parked at 2,400 / 2,000, with a Bastion behind them.
 *
 * Six because Pelagia's doctrine commits at six: below the threshold the
 * commander is rallying rather than deciding anything, and every test in this
 * suite is about what it does once it has an army.
 */
function armySnapshot(contacts: Contact[], tick = 6000): EchoSnapshot {
  const base = exposedSnapshot();
  const hull = (id: number): EchoSnapshot['units'][number] => ({
    id,
    kind: UnitKind.Corvette,
    x: 2400,
    y: 2000,
    depth: 300,
    hp: 100,
    maxHp: 100,
    heading: 0,
    sig: 30,
    silentRunning: false,
    pressureBonus: 0,
    unhealableDamage: 0,
  });
  return {
    ...base,
    // Past every doctrine's opening quiet period, so a test about *why* a
    // commander transmits is not silently answered by "it is too early".
    tick,
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    units: [10, 11, 12, 13, 14, 15].map(hull),
    structures: [
      {
        id: 20,
        kind: StructureKind.Bastion,
        x: 1000,
        y: 1000,
        depth: 300,
        hp: 5000,
        maxHp: 5000,
        sig: 35,
        buildProgress: 1,
        queue: [],
        queueProgress: 0,
      },
    ],
    contacts,
  };
}

function lastSnapshot(match: Match, slot: number): EchoSnapshot {
  const stepMs = 1000 / SIM.TICK_HZ;
  for (let i = 0; i < SIM.TICK_HZ; i++) {
    const snapshots = match.update(stepMs);
    const own = snapshots?.get(slot);
    if (own !== undefined) return own;
  }
  throw new Error('no snapshot');
}

interface Known {
  unitIds: Set<number>;
  structureIds: Set<number>;
  contactIds: Set<number>;
  nodeIds: Set<number>;
  briefing: AiBriefing;
}

function assertOnlyKnown(command: AiCommand, known: Known): void {
  const owns = (ids: number[]): void => {
    for (const id of ids) {
      assert.ok(known.unitIds.has(id), `command ${command.kind} named unit ${id} it was not sent`);
    }
  };
  const inBounds = (x: number, y: number): void => {
    assert.ok(
      x >= 0 && x <= known.briefing.widthM && y >= 0 && y <= known.briefing.heightM,
      `command ${command.kind} pointed off the map at ${x},${y}`
    );
  };

  switch (command.kind) {
    case 'move':
    case 'attackMove':
      owns(command.unitIds);
      inBounds(command.x, command.y);
      return;
    case 'stop':
      owns(command.unitIds);
      return;
    case 'attack':
      owns(command.unitIds);
      assert.ok(
        known.contactIds.has(command.contactId),
        `attacked contact ${command.contactId}, which was never resolved for this slot`
      );
      return;
    case 'harvest':
      owns(command.unitIds);
      assert.ok(known.nodeIds.has(command.nodeId), `harvested unknown field ${command.nodeId}`);
      return;
    case 'throttle':
    case 'silent':
      owns(command.unitIds);
      return;
    case 'ping':
      owns([command.unitId]);
      return;
    case 'build':
      inBounds(command.x, command.y);
      return;
    case 'produce':
      assert.ok(
        known.structureIds.has(command.structureId),
        `produced at structure ${command.structureId}, which is not one of its own`
      );
      return;
    case 'depth':
      owns(command.unitIds);
      assert.ok(
        Number.isFinite(command.depthM) && command.depthM >= DEPTH.MIN_M,
        `dived to ${command.depthM}, which is not a depth`
      );
      return;
    default: {
      // This audit is the acceptance criterion of the whole feature, and a
      // switch with no default audits nothing it forgot. A new variant used to
      // fall straight through here and pass — so the suite could certify an
      // information model it had never looked at.
      const unaudited: never = command;
      throw new Error(`no information audit for command ${JSON.stringify(unaudited)}`);
    }
  }
}

/** The same translation AiSeat does, inline so the test drives it explicitly. */
function applyTo(match: Match, slot: number, command: AiCommand): void {
  switch (command.kind) {
    case 'move':
      for (const id of command.unitIds) match.orderMove(slot, id, command.x, command.y);
      return;
    case 'attackMove':
      for (const id of command.unitIds) match.orderAttackMove(slot, id, command.x, command.y);
      return;
    case 'stop':
      for (const id of command.unitIds) match.orderStop(slot, id);
      return;
    case 'attack':
      for (const id of command.unitIds) match.orderAttackContact(slot, id, command.contactId);
      return;
    case 'harvest':
      for (const id of command.unitIds) match.orderHarvest(slot, id, command.nodeId);
      return;
    case 'throttle':
      for (const id of command.unitIds) match.setThrottle(slot, id, command.throttle);
      return;
    case 'silent':
      for (const id of command.unitIds) match.setSilentRunning(slot, id, command.active);
      return;
    case 'ping':
      match.activeSonar(slot, command.unitId);
      return;
    case 'build':
      match.build(slot, command.structure, command.x, command.y);
      return;
    case 'produce':
      match.produce(slot, command.structureId, command.unit);
      return;
    case 'depth':
      for (const id of command.unitIds) match.orderDepth(slot, id, command.depthM);
      return;
    default: {
      const untranslated: never = command;
      throw new Error(`applyTo has no case for ${JSON.stringify(untranslated)}`);
    }
  }
}
