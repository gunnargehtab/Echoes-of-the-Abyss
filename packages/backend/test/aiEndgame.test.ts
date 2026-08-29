/**
 * The endgame the commander used to refuse to play (#262).
 *
 * Two faults kept four-seat matches from resolving, and both are about
 * *commitment* rather than about whether the army attacks at all — #198 fixed
 * that and this is what was underneath it.
 *
 * The massing gate (`doctrine.attackAtArmySize`) is a rule about the opening,
 * and it was the only gate on the push. Once production and attrition cancel,
 * the army sits a hull under the threshold and the commander waits at its own
 * rally point for the rest of the match. So the gate now opens on time as well
 * as on size: a high-water mark that has stood still is not massing.
 *
 * And the fallback push target was `enemyStarts[0]`, chosen in the constructor
 * and never reconsidered — a walk to a dead player's corner, twenty minutes
 * long. The commander is not told who is dead; it is allowed to notice that a
 * place which should be making noise is not.
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

const SEED = 0x262;
const ECHO_EVERY = SIM.TICK_HZ / SIM.ECHO_HZ;

function rig(): {
  brief: AiBriefing;
  base: EchoSnapshot;
  home: { x: number; y: number };
  enemyStarts: { x: number; y: number }[];
} {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  for (let slot = 0; slot < 4; slot++) {
    match.addPlayer(
      slot,
      [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron][slot]!
    );
  }
  const brief = briefingFor(match, 1, Faction.Pelagia, AiDifficulty.Veteran);
  let base: EchoSnapshot | undefined;
  for (let i = 0; i < ECHO_EVERY * 2 && base === undefined; i++) {
    base = match.update(1000 / SIM.TICK_HZ)?.get(1);
  }
  assert.ok(base !== undefined, 'the match produced no snapshot to work from');
  return {
    brief,
    base,
    home: brief.spawns[brief.slot]!,
    enemyStarts: brief.spawns.filter((_, index) => index !== brief.slot),
  };
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

function smudge(id: number, x: number, y: number, tick: number): Contact {
  return { id, tier: ResolutionTier.Contact, x, y, tick };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Feed the commander observations from a fixed position and collect every move
 * destination it asks for. `grow` may add hulls as the clock runs.
 */
function moves(options: {
  seconds: number;
  at: { x: number; y: number };
  size: number;
  contacts?: (tick: number) => Contact[];
  grow?: (elapsedS: number) => number;
}): { x: number; y: number }[] {
  const { brief, base } = rig();
  const commander = new AiCommander(brief);
  const asked: { x: number; y: number }[] = [];

  let tick = base.tick;
  for (let step = 0; step < options.seconds * SIM.ECHO_HZ; step++) {
    tick += ECHO_EVERY;
    const elapsedS = step / SIM.ECHO_HZ;
    const size = options.size + (options.grow?.(elapsedS) ?? 0);
    const army = Array.from({ length: size }, (_, i) => hull(i + 1, options.at.x, options.at.y));
    const snapshot: EchoSnapshot = {
      ...base,
      tick,
      units: army,
      contacts: options.contacts?.(tick) ?? [],
    };
    for (const command of commander.observe(snapshot) as AiCommand[]) {
      if (command.kind === 'move') asked.push({ x: command.x, y: command.y });
    }
  }
  return asked;
}

/** How near a move order came to any enemy start — a push, rather than a rally. */
function nearestStart(move: { x: number; y: number }, starts: { x: number; y: number }[]): number {
  return Math.min(...starts.map((start) => distance(move, start)));
}

describe('waiting is a position, and a position that stops improving is not one', () => {
  it('holds the rally while the army is still growing toward the threshold', () => {
    // A force gaining a hull a minute is massing, and the clock restarts every
    // time the high-water mark does. This is the opening, and it must not
    // become an early push.
    const { home, enemyStarts } = rig();
    const asked = moves({
      seconds: 150,
      at: home,
      size: 3,
      grow: (elapsedS) => Math.floor(elapsedS / 60),
    });
    assert.ok(asked.length > 0, 'the commander said nothing at all');
    assert.ok(
      asked.every((move) => nearestStart(move, enemyStarts) > 2000),
      'a growing force went for the push before it had massed'
    );
  });

  it('goes with what it has once the high-water mark has stood still', () => {
    // The endgame: production and attrition cancel, the army never reaches the
    // threshold, and under the old rule the commander waited out the clock.
    const { home, enemyStarts } = rig();
    const asked = moves({ seconds: 150, at: home, size: 4 });
    const pushes = asked.filter((move) => nearestStart(move, enemyStarts) < 700);
    assert.ok(pushes.length > 0, 'the army waited forever for a hull that was never coming');
  });

  it('keeps waiting when what it has is not an army', () => {
    // Below half the doctrine's number a stalled push is not "go with what you
    // have", it is posting a hull to be killed. Rebuild instead.
    const { home, enemyStarts } = rig();
    const asked = moves({ seconds: 150, at: home, size: 1 });
    assert.ok(
      asked.every((move) => nearestStart(move, enemyStarts) > 2000),
      'one hull was sent at a base'
    );
  });
});

describe('a base you have stood on and heard nothing at is not where the enemy is', () => {
  it('crosses off the empty start and walks at the next one', () => {
    // The army is parked on top of an enemy spawn with nothing resolved
    // anywhere near it. Under the old rule it asked to go there for the rest
    // of the match, because the target was index 0 and never changed.
    const { enemyStarts } = rig();
    const asked = moves({ seconds: 150, at: enemyStarts[0]!, size: 8 });
    const elsewhere = asked.filter((move) => distance(move, enemyStarts[0]!) > 700);
    assert.ok(elsewhere.length > 0, 'the commander kept walking at an empty corner');
    assert.ok(
      elsewhere.some((move) => nearestStart(move, enemyStarts.slice(1)) < 1),
      'it went somewhere, but not to another start'
    );
  });

  it('keeps the start on the list while something is audible there', () => {
    // Standing on a live base resolves its hulls. The crossing-off is about
    // silence, and there is none here.
    const { enemyStarts } = rig();
    const start = enemyStarts[0]!;
    const asked = moves({
      seconds: 150,
      at: start,
      size: 8,
      contacts: (tick) => [smudge(9, start.x + 300, start.y, tick)],
    });
    assert.ok(
      asked.every((move) => distance(move, start) < 700),
      'it abandoned a start it could still hear something at'
    );
  });
});

describe('a push started without the numbers stays a push', () => {
  it('does not walk straight back to the rally point on the next observation', () => {
    // The failure this guards is subtle and total: the moment the army leaves,
    // it is still a force below its own threshold, so a commander that
    // reconsidered every tick would order it home again immediately and spend
    // the match oscillating either side of its rally point.
    const { home, enemyStarts } = rig();
    const asked = moves({ seconds: 150, at: home, size: 4 });

    const firstPush = asked.findIndex((move) => nearestStart(move, enemyStarts) < 700);
    assert.ok(firstPush >= 0, 'it never went at all');
    const after = asked.slice(firstPush + 1);
    const rallies = after.filter((move) => nearestStart(move, enemyStarts) > 2000);
    assert.equal(rallies.length, 0, 'it turned around after committing');
  });
});

describe('on the way in, the army shoots what is in its way', () => {
  /**
   * The fault that made the other two nearly pointless. `bestThreat` treats an
   * unclassified smudge as a target — correctly, that is the game — and with
   * the Drift in the water something is nearly always inside the 2,800 m
   * pursuit leash, so the branch that attacks whatever it can hear pre-empted
   * the branch that walks at a base. Measured over four four-seat matches at
   * the cap, every commander reached the push branch between zero and eight
   * times in twenty-five minutes.
   */
  it('walks past a smudge it can hear but is not in contact with', () => {
    const { home, enemyStarts } = rig();
    // Two kilometres out, and deliberately *away* from the enemy: inside the
    // pursuit leash, far outside a gun's reach, and nowhere near the rally
    // point — so a move order that goes there is the army travelling rather
    // than massing. Under the old leash the commander only ever issued an
    // attack order for this and never moved at all.
    const away = enemyStarts[0]!;
    const length = Math.hypot(away.x - home.x, away.y - home.y) || 1;
    const behind = {
      x: home.x - ((away.x - home.x) / length) * 2000,
      y: home.y - ((away.y - home.y) / length) * 2000,
    };
    const asked = moves({
      seconds: 300,
      at: home,
      size: 4,
      contacts: (tick) => [smudge(21, behind.x, behind.y, tick)],
    });
    assert.ok(
      asked.some((move) => distance(move, behind) < 700),
      'the army sat still for something it could hear but never closed on'
    );
  });

  it('still stops for what is actually in front of it', () => {
    // Inside a gun's reach the fight is already happening, and walking past it
    // would be a different bug. No move order should be issued at all here:
    // the commander is attacking, not travelling.
    const { home } = rig();
    const asked = moves({
      seconds: 300,
      at: home,
      size: 4,
      contacts: (tick) => [smudge(22, home.x + 400, home.y, tick)],
    });
    assert.equal(asked.length, 0, 'it walked away from a contact in weapons range');
  });
});
