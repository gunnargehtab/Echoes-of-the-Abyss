/**
 * Telling a raid from a fish (#198) — docs/bestiary.md §3, docs/tech-stack.md.
 *
 * The commander recalled its whole army for *any* contact near the Bastion.
 * That looks careful and was ruinous, because the Drift is seeded near spawns
 * and at Tier 1 a grazer and a cruiser are the same smudge — `bestThreat` only
 * skips fauna the Echo Layer has *classified*, which needs Tier 3.
 *
 * Measured on `ventfront-divide`, seed 4000, a fifteen-minute Directorate
 * match: 41% of every decision was the defend branch and the push branch was
 * reached **zero** times. With the Drift emptied and nothing else changed, the
 * same commander pushed 920 times. The army was not failing to mass — it was
 * being called home by wildlife.
 *
 * The fix cannot be "look up whether it is a fish"; that is the game. It is
 * what a player does instead: watch, and notice that a raid closes and a
 * grazer does not.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AiDifficulty,
  Faction,
  ResolutionTier,
  SIM,
  UnitKind,
  statsFor,
  type Contact,
  type EchoSnapshot,
  type OwnUnit,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { briefingFor } from '../src/ai/seat.ts';
import { Match } from '../src/sim/match.ts';
import type { AiBriefing, AiCommand } from '../src/ai/types.ts';

const SEED = 0x198;
const ECHO_EVERY = SIM.TICK_HZ / SIM.ECHO_HZ;

function rig(): { brief: AiBriefing; base: EchoSnapshot; home: { x: number; y: number } } {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Directorate);
  const brief = briefingFor(match, 1, Faction.Directorate, AiDifficulty.Veteran);
  let base: EchoSnapshot | undefined;
  for (let i = 0; i < ECHO_EVERY * 2 && base === undefined; i++) {
    base = match.update(1000 / SIM.TICK_HZ)?.get(1);
  }
  assert.ok(base !== undefined, 'the match produced no snapshot to work from');
  return { brief, base, home: brief.spawns[brief.slot]! };
}

function hull(id: number, x: number, y: number): OwnUnit {
  const stats = statsFor(UnitKind.Corvette);
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
    pressureBonus: 0,
    unhealableDamage: 0,
  };
}

/** An unclassified smudge: Tier 1, no kind, no species. Could be anything. */
function smudge(id: number, x: number, y: number, tick: number): Contact {
  return { id, tier: ResolutionTier.Contact, x, y, tick };
}

/**
 * Feed the commander `seconds` of observations with the contact at each of
 * `track`, and report whether it ever ordered the army to attack it.
 */
function recalled(track: Array<{ x: number; y: number }>, secondsEach: number): boolean {
  const { brief, base, home } = rig();
  const commander = new AiCommander(brief);
  // An army well short of its threshold, parked at home. Only the defend
  // branch can produce an attack order from this position.
  const army = Array.from({ length: 3 }, (_, i) => hull(i + 1, home.x, home.y));

  let tick = base.tick;
  let attacked = false;
  for (const at of track) {
    for (let s = 0; s < secondsEach * SIM.ECHO_HZ; s++) {
      tick += ECHO_EVERY;
      const snapshot: EchoSnapshot = {
        ...base,
        tick,
        units: army,
        contacts: [smudge(77, at.x, at.y, tick)],
      };
      for (const command of commander.observe(snapshot) as AiCommand[]) {
        if (command.kind === 'attack') attacked = true;
      }
    }
  }
  return attacked;
}

describe('a contact near home has to earn the alarm', () => {
  it('ignores one that just sits there, however long it sits', () => {
    // A grazer parked 1,600 m off the Bastion. Under the old rule this pulled
    // the entire army home on the first tick and held it there all match.
    const { home } = rig();
    const parked = { x: home.x + 1600, y: home.y };
    assert.equal(
      recalled([parked, parked, parked], 20),
      false,
      'the army was recalled for something that never moved'
    );
  });

  it('answers one that closes on the Bastion', () => {
    // The same smudge, walking in. A raid closes; that is what makes it a raid.
    const { home } = rig();
    assert.equal(
      recalled(
        [
          { x: home.x + 2000, y: home.y },
          { x: home.x + 1500, y: home.y },
          { x: home.x + 1100, y: home.y },
        ],
        15
      ),
      true,
      'something walked onto the doorstep and the army stayed put'
    );
  });

  it('answers one already on the doorstep, without waiting to be sure', () => {
    // Inside the urgent radius there is nothing to deliberate: being wrong
    // about a grazer costs a wasted trip, being wrong about a raid costs the
    // match. No confirmation window applies here.
    const { home } = rig();
    assert.equal(
      recalled([{ x: home.x + 400, y: home.y }], 1),
      true,
      'a contact on top of the Bastion did not trigger an immediate response'
    );
  });

  it('does not fire on a single sighting far out', () => {
    // One fix is not a trend. Without the confirmation window a contact whose
    // reported position jitters inward once would start a recall.
    const { home } = rig();
    assert.equal(
      recalled(
        [
          { x: home.x + 2000, y: home.y },
          { x: home.x + 1500, y: home.y },
        ],
        2
      ),
      false,
      'two seconds of watching was enough to convince it'
    );
  });

  it('reads the approach against the farthest it saw, not the first', () => {
    // A hull that runs silent, drifts out and comes back in is approaching on
    // the way back. Baselining on first sight would have spent the budget
    // before the real approach began.
    const { home } = rig();
    assert.equal(
      recalled(
        [
          { x: home.x + 1500, y: home.y },
          { x: home.x + 2100, y: home.y },
          { x: home.x + 1600, y: home.y },
        ],
        15
      ),
      true,
      'the contact closed 500 m from its farthest and was not answered'
    );
  });
});
