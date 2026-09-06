/**
 * The Commune's commander lays mines (#467).
 *
 * docs/systems-combat.md §11 makes the Commune the mine navy and
 * docs/units.md calls the Spinner "the way to reach" its cap of 18. Until the
 * commander had a word for laying, both sentences described a hull that only
 * ever appeared in a human's hands — so the balance harness measured a Commune
 * fielding none of its own roster, and every reading of that navy against the
 * field inherited the gap.
 *
 * Four things are asserted here, and each is a way the branch could be wrong
 * without being visibly broken:
 *
 *   - the command reaches the simulation at all, through the seat and the
 *     same `Match.layMine` a player's message reaches;
 *   - a full Spinner walks to the wall and a spent one walks home, because a
 *     magazine that only regrows at a nursery is a supply line and a commander
 *     that never went back would lay four mines a match;
 *   - the wall is spread rather than stacked, since four mines on one spot is
 *     one mine with extra steps;
 *   - production stops at `MINE_WALL.SPINNERS`. This is the one that bites: an
 *     unarmed hull never joins the army, so it never advances the composition
 *     index that selected it, and an ungated Spinner is a navy that buys
 *     nothing else.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AiDifficulty,
  Faction,
  HarvestThrottle,
  HULL_EFFECTS,
  ORDNANCE,
  OrdnanceKind,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
  type EchoSnapshot,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { DOCTRINE } from '../src/ai/doctrine.ts';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';

const SEED = 0xa1;
const STEP_MS = 1000 / SIM.TICK_HZ;

/** Run the match until it produces this slot's next Echo snapshot. */
function nextSnapshot(match: Match, slot: number): EchoSnapshot {
  for (let i = 0; i < SIM.TICK_HZ; i++) {
    const own = match.update(STEP_MS)?.get(slot);
    if (own !== undefined) return own;
  }
  throw new Error('no snapshot');
}

function commanderFor(): { match: Match; commander: AiCommander; home: { x: number; y: number } } {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  const briefing = briefingFor(match, 1, Faction.Pelagia, AiDifficulty.Veteran);
  return {
    match,
    commander: new AiCommander(briefing),
    home: briefing.spawns[1]!,
  };
}

/**
 * A snapshot with a working economy and whatever hulls the caller names, so a
 * branch can be put under a state a live match would take minutes to reach.
 */
function snapshot(
  units: EchoSnapshot['units'],
  overrides: Partial<EchoSnapshot> = {}
): EchoSnapshot {
  return {
    tick: 6000,
    ordnance: [],
    units,
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
    peakSig: 30,
    berths: { used: 0, granted: 40 },
    nodules: 4000,
    crystal: 0,
    biomass: 0,
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    selfEvents: [],
    draw: { capacity: 6, demand: 0, satisfaction: 1 },
    driftHealth: [],
    shoals: [],
    jellies: [],
    hazards: [],
    marks: [],
    ...overrides,
  };
}

function hull(
  id: number,
  kind: UnitKind,
  at: { x: number; y: number },
  extra: Partial<EchoSnapshot['units'][number]> = {}
): EchoSnapshot['units'][number] {
  return {
    id,
    kind,
    x: at.x,
    y: at.y,
    depth: 300,
    hp: 200,
    maxHp: 200,
    heading: 0,
    sig: 14,
    silentRunning: false,
    engineOff: false,
    pressureBonus: 0,
    unhealableDamage: 0,
    ...(kind === UnitKind.Harvester ? { cargo: 0, throttle: HarvestThrottle.Standard } : {}),
    ...extra,
  };
}

/** Every distinct place the commander sent this hull over `rounds` decisions. */
function walkedTo(
  commander: AiCommander,
  build: (tick: number) => EchoSnapshot,
  rounds: number
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < rounds; i++) {
    for (const command of commander.observe(build(6000 + i * 12))) {
      if (command.kind === 'move') out.push({ x: command.x, y: command.y });
    }
  }
  return out;
}

describe('the Commune lays a wall', () => {
  it('puts the Spinner on its own composition', () => {
    // The doctrine table is the record of what a navy fields. A Commune
    // without the Spinner on it is the mine navy with no mine-layer, however
    // well the branch below works.
    assert.ok(
      DOCTRINE[Faction.Pelagia].composition.includes(UnitKind.Spinner),
      'the mine navy has to be able to buy the hull that lays them'
    );
  });

  it('routes a mine order through the seat into the simulation', () => {
    // The seat is the only crossing point between a commander and the sim, and
    // the `mine` variant is the newest thing to pass through it. A seat that
    // dropped it would look exactly like a commander that chose not to lay,
    // which is why `AiSeat.apply` has no `default` — this is that guarantee
    // observed from the outside rather than asserted in a type.
    const match = new Match(undefined, { fauna: false, seed: SEED });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    const seat = new AiSeat(match, briefingFor(match, 1, Faction.Pelagia, AiDifficulty.Veteran));

    const spinner = spawnUnit(match.world, {
      kind: UnitKind.Spinner,
      slot: seat.slot,
      faction: Faction.Pelagia,
      x: 3000,
      y: 3000,
    });
    const before = nextSnapshot(match, seat.slot).ordnance.length;
    assert.notEqual(match.layMine(seat.slot, spinner), 0, 'the lay order should be accepted');

    const after = nextSnapshot(match, seat.slot).ordnance;
    assert.equal(after.length, before + 1, 'and should put a mine in the water');
    assert.ok(
      after.some((o) => o.kind === OrdnanceKind.Mine),
      'a mine, specifically'
    );
  });

  it('reports the magazine to its owner, and only for a hull that has one', () => {
    // A count that only refills at a nursery is a supply line, and the
    // commander's regrow branch reads it. Own information: it rides on the
    // owner's `OwnUnit`, which is the same payload a human client receives.
    const match = new Match(undefined, { fauna: false, seed: SEED });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    const spinner = spawnUnit(match.world, {
      kind: UnitKind.Spinner,
      slot: 1,
      faction: Faction.Pelagia,
      x: 3000,
      y: 3000,
    });
    const corvette = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 3100,
      y: 3000,
    });

    const units = nextSnapshot(match, 1).units;
    assert.equal(
      units.find((u) => u.id === spinner)?.mines,
      HULL_EFFECTS.SPINNER.MAGAZINE,
      'a fresh Spinner carries its four'
    );
    assert.equal(
      units.find((u) => u.id === corvette)?.mines,
      undefined,
      'a hull with no grown magazine reports no count'
    );
  });

  it('walks a loaded Spinner out to the approach and lays there', () => {
    const { commander, home } = commanderFor();
    const build = (tick: number): EchoSnapshot =>
      snapshot(
        [
          hull(1, UnitKind.Harvester, home),
          hull(2, UnitKind.Spinner, home, { mines: HULL_EFFECTS.SPINNER.MAGAZINE }),
        ],
        { tick }
      );

    const sent = walkedTo(commander, build, 200);
    const spinnerSent = sent.filter((p) => Math.hypot(p.x - home.x, p.y - home.y) > 400);
    assert.ok(
      spinnerSent.length > 0,
      'a loaded Spinner has somewhere to be, and it is not the spawn'
    );
  });

  it('lays once it is standing on a spot, and spreads the next one', () => {
    // The hull is placed on the wall rather than walked to it, because the
    // question here is the drop and not the walk. Two decisions far enough
    // apart for the arming interval to have run out, so the second lay is
    // allowed and must be somewhere else.
    const { commander, home } = commanderFor();

    // Find where the commander wants the wall, by watching where it sends a
    // loaded Spinner. That is the only channel the test is allowed to use —
    // reading a private field would test the implementation rather than it.
    const scoutRun = walkedTo(
      commander,
      (tick) =>
        snapshot(
          [
            hull(1, UnitKind.Harvester, home),
            hull(2, UnitKind.Spinner, home, { mines: HULL_EFFECTS.SPINNER.MAGAZINE }),
          ],
          { tick }
        ),
      200
    );
    const spot = scoutRun.find((p) => Math.hypot(p.x - home.x, p.y - home.y) > 400);
    assert.ok(spot !== undefined, 'the commander must have chosen somewhere');

    const fresh = commanderFor().commander;
    const laidAt: { x: number; y: number }[] = [];
    let mines = HULL_EFFECTS.SPINNER.MAGAZINE;
    let at = spot;
    for (let i = 0; i < 400; i++) {
      const tick = 6000 + i * 12;
      const commands = fresh.observe(
        snapshot([hull(1, UnitKind.Harvester, home), hull(2, UnitKind.Spinner, at, { mines })], {
          tick,
        })
      );
      for (const command of commands) {
        if (command.kind === 'mine') {
          assert.equal(command.unitId, 2, 'it may only lay with a hull it was sent');
          laidAt.push({ ...at });
          mines--;
        }
        // Follow the walk orders, so the hull ends up where the plan wanted it.
        if (command.kind === 'move' && command.unitIds.includes(2)) {
          at = { x: command.x, y: command.y };
        }
      }
      if (mines <= 0) break;
    }

    assert.ok(laidAt.length >= 2, `it should lay more than one mine (${laidAt.length})`);
    const spread = Math.max(
      ...laidAt.map((a) => Math.max(...laidAt.map((b) => Math.hypot(a.x - b.x, a.y - b.y))))
    );
    assert.ok(
      spread >= ORDNANCE.MINE.TRIGGER_RADIUS_M,
      `a wall is spread, not stacked: widest gap was ${Math.round(spread)} m`
    );
  });

  it('walks an empty Spinner home to the nursery instead of to the wall', () => {
    // The magazine regrows inside a Spore Veil or within 300 m of a Bastion
    // and nowhere else (docs/units.md). A commander that never went back would
    // lay four mines a match and then park a hull on the approach forever.
    const { commander, home } = commanderFor();
    const far = { x: home.x + 3000, y: home.y + 3000 };
    const sent = walkedTo(
      commander,
      (tick) =>
        snapshot(
          [hull(1, UnitKind.Harvester, home), hull(2, UnitKind.Spinner, far, { mines: 0 })],
          {
            tick,
          }
        ),
      200
    );

    const home_bound = sent.filter((p) => Math.hypot(p.x - home.x, p.y - home.y) < 400);
    assert.ok(home_bound.length > 0, 'an empty Spinner has one place to be, and it is the nursery');
  });

  /** What the commander buys over `rounds` decisions, delivering as it goes. */
  function bought(escort: number, rounds = 300): UnitKind[] {
    const { commander, home } = commanderFor();
    const built: UnitKind[] = [];
    let spinners = 0;

    for (let i = 0; i < rounds; i++) {
      const units = [
        ...[1, 2, 3, 4, 5, 6].map((id) => hull(id, UnitKind.Harvester, home)),
        ...Array.from({ length: escort }, (_, k) => hull(10 + k, UnitKind.Corvette, home)),
        ...Array.from({ length: spinners }, (_, k) =>
          hull(20 + k, UnitKind.Spinner, home, { mines: HULL_EFFECTS.SPINNER.MAGAZINE })
        ),
        // The navy's own scout, already afloat. Wave 2 buys it ahead of the
        // wall (#506) — a scout is how a navy decides what wall to build — so
        // without one here this fixture would measure the scout want and not
        // the Spinner's.
        hull(30, UnitKind.Glider, home),
      ];
      for (const command of commander.observe(snapshot(units, { tick: 6000 + i * 12 }))) {
        if (command.kind !== 'produce') continue;
        built.push(command.unit);
        // The yard is empty on every observation, so a queued hull is treated
        // as delivered — the harshest version of this test, since a commander
        // that never saw its own purchases arrive would buy forever.
        if (command.unit === UnitKind.Spinner) spinners++;
      }
    }
    return built;
  }

  it('stops buying Spinners once it has the ones it can keep busy', () => {
    // The gate that matters. An unarmed hull never joins the army, so it never
    // moves the count the production branch is watching: without a want of its
    // own size, the commander buys layers until the yard backs up and never
    // buys the hulls that hold the wall.
    const built = bought(4);
    const spinners = built.filter((kind) => kind === UnitKind.Spinner).length;

    assert.ok(spinners > 0, 'it should buy at least one');
    assert.ok(
      spinners <= 2,
      `it must stop: ${spinners} Spinners bought out of ${built.length} hulls`
    );
    assert.ok(
      built.some((kind) => kind !== UnitKind.Spinner && kind !== UnitKind.Harvester),
      'and it must still buy something that can hold the wall'
    );
  });

  it('buys the escort before the wall', () => {
    // §6 makes a minefield kill "in numbers or not at all". A wall with
    // nothing holding it is 150 nodules the opening did not spend on the hulls
    // that make it matter, so the layer waits for half the doctrine's massing
    // size — the same floor `stillMassing` uses for the same judgement.
    const built = bought(1);
    assert.ok(
      !built.includes(UnitKind.Spinner),
      'a navy of one hull has something to buy before it buys a layer'
    );
    assert.ok(built.length > 0, 'and it must buy that something');
  });
});
