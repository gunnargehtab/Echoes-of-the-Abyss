/**
 * The commander's depth verb (#177) — docs/systems-depth.md §3, §5.
 *
 * Before this, `AiCommand` had eight variants against the room's nine in-match
 * handlers, and `depth` was the exact set difference. Measured on main: 27 of
 * 28 AI hulls sat at one depth from spawn to the end of the match, and
 * `thermoclineZone()` returned Above for every one of them, for the whole
 * match. The layer was a rule no player in the repository could reach.
 *
 * What is pinned here is the *shape* of the decision rather than its tuning.
 * §5 makes depth the axis of commitment, so a commander that dove whenever it
 * was heard would have turned the game's most expensive manoeuvre into a
 * reflex — the same failure #148 documents for the harvest throttle. It is
 * spent on the attack run and given back on contact, and the tests below say
 * so in both directions.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AiDifficulty,
  DEPTH_BANDS,
  DepthBand,
  Faction,
  SIM,
  THERMOCLINE_DUCT_BOTTOM_M,
  THERMOCLINE_DUCT_TOP_M,
  ThermoclineZone,
  UnitKind,
  effectivePressureRating,
  statsFor,
  thermoclineZone,
  type EchoSnapshot,
  type OwnUnit,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { DOCTRINE } from '../src/ai/doctrine.ts';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import type { AiBriefing, AiCommand } from '../src/ai/types.ts';
import { Match } from '../src/sim/match.ts';
import { Position } from '../src/sim/components.ts';
import { spawnUnit } from '../src/sim/world.ts';

const SEED = 0x177;
const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_EVERY = SIM.TICK_HZ / SIM.ECHO_HZ;

/**
 * A real match, a real briefing, and one real snapshot to use as a template.
 *
 * The snapshot is taken from the simulation rather than hand-built on purpose:
 * a literal would drift out of step with `EchoSnapshot` silently, and these
 * tests are about a commander reading the same payload a client reads.
 */
function rig(faction: Faction): { match: Match; brief: AiBriefing; base: EchoSnapshot } {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, faction);
  const brief = briefingFor(match, 1, faction, AiDifficulty.Veteran);
  let base: EchoSnapshot | undefined;
  for (let i = 0; i < ECHO_EVERY * 2 && base === undefined; i++) {
    base = match.update(STEP_MS)?.get(1);
  }
  assert.ok(base !== undefined, 'the match produced no snapshot to work from');
  return { match, brief, base };
}

/** The template with a chosen force in it and nothing to shoot at. */
function withArmy(base: EchoSnapshot, units: OwnUnit[]): EchoSnapshot {
  return { ...base, units, contacts: [] };
}

function hull(id: number, kind: UnitKind, depth: number): OwnUnit {
  const stats = statsFor(kind);
  return {
    id,
    kind,
    x: 1000,
    y: 1000,
    depth,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    heading: 0,
    sig: stats.sigCruise,
    silentRunning: false,
    pressureBonus: 0,
    unhealableDamage: 0,
  };
}

/**
 * Run a commander until it emits depth commands, collecting them.
 *
 * Several observations, not one: the commander thinks on a cadence and only
 * crosses once it has massed, so a single tick proves nothing either way.
 */
function depthCommands(
  faction: Faction,
  army: OwnUnit[],
  ticks = 40
): Array<Extract<AiCommand, { kind: 'depth' }>> {
  const { brief, base } = rig(faction);
  const commander = new AiCommander(brief);
  const out: Array<Extract<AiCommand, { kind: 'depth' }>> = [];
  for (let i = 0; i < ticks; i++) {
    for (const command of commander.observe(withArmy(base, army))) {
      if (command.kind === 'depth') out.push(command);
    }
  }
  return out;
}

/**
 * Six rated hulls and two scouts.
 *
 * Two scouts rather than one, and that is not padding: `designateScout` pulls
 * a hull out of the force before `commandArmy` ever sees it, so a lone
 * LightScout is commanded as the scout and never reaches the depth rule at
 * all. Eight also clears the largest `attackAtArmySize` in the table, so every
 * doctrine actually gets as far as pushing.
 */
const MIXED_FORCE = (): OwnUnit[] => [
  ...Array.from({ length: 6 }, (_, i) => hull(i + 1, UnitKind.Corvette, 600)),
  hull(90, UnitKind.LightScout, 300),
  hull(91, UnitKind.LightScout, 300),
];

/** Enough hulls that every doctrine's attackAtArmySize threshold is met. */
function warband(kind = UnitKind.Corvette, count = 8, depth = 600): OwnUnit[] {
  return Array.from({ length: count }, (_, i) => hull(i + 1, kind, depth));
}

describe('the commander has a depth verb at all', () => {
  it('emits depth commands on the push, where it emitted none before', () => {
    const commands = depthCommands(Faction.Directorate, warband());
    assert.ok(commands.length > 0, 'a crossing doctrine never ordered a depth change');
  });

  it('aims under the duct, never into it', () => {
    // The trap the issue names: duct-to-duct is 1.2x, so "go to the
    // thermocline to hide" lands in the one zone on the axis that can make you
    // louder than open water. The stealth is in crossing past it.
    for (const command of depthCommands(Faction.Directorate, warband())) {
      assert.notEqual(
        thermoclineZone(command.depthM),
        ThermoclineZone.Duct,
        `ordered ${command.depthM} m, which is inside the duct ` +
          `(${THERMOCLINE_DUCT_TOP_M}–${THERMOCLINE_DUCT_BOTTOM_M} m)`
      );
    }
  });

  it('reaches Below, which is the zone no AI hull ever occupied', () => {
    const deepest = Math.max(...depthCommands(Faction.Directorate, warband()).map((c) => c.depthM));
    assert.equal(thermoclineZone(deepest), ThermoclineZone.Below, `deepest order was ${deepest} m`);
  });
});

describe('crossing is a commitment, not a stealth toggle', () => {
  it('is a doctrine decision, and two factions decline it', () => {
    // Every field in the doctrine table has to be an argument about sound. The
    // Commune's is "they don't survive the deep, they terraform it"; the
    // Consortium's is that it is heard regardless, so quiet it cannot spend is
    // quiet it will not buy.
    assert.equal(DOCTRINE[Faction.Pelagia].crossesTheLayer, false);
    assert.equal(DOCTRINE[Faction.Bathyarch].crossesTheLayer, false);
    assert.equal(DOCTRINE[Faction.Directorate].crossesTheLayer, true);
    assert.equal(DOCTRINE[Faction.Hadron].crossesTheLayer, true);
  });

  it('a declining faction never orders its army under the layer', () => {
    for (const faction of [Faction.Pelagia, Faction.Bathyarch]) {
      const deep = depthCommands(faction, warband()).filter(
        (c) => thermoclineZone(c.depthM) === ThermoclineZone.Below
      );
      assert.equal(deep.length, 0, `${Faction[faction]} crossed a layer its doctrine declines`);
    }
  });

  it('does not re-order a depth the hull is already holding', () => {
    // A re-issued dive restarts a descent, and a descent breaks Silent Running
    // every single time — so a commander that re-sent its standing order every
    // cadence tick would keep its own army permanently loud.
    const army = warband();
    const { brief, base } = rig(Faction.Directorate);
    const commander = new AiCommander(brief);
    let first: Extract<AiCommand, { kind: 'depth' }> | undefined;
    for (let i = 0; i < 40 && first === undefined; i++) {
      for (const command of commander.observe(withArmy(base, army))) {
        if (command.kind === 'depth' && first === undefined) first = command;
      }
    }
    assert.ok(first !== undefined, 'expected a crossing to be ordered');

    // Put the fleet where it was told to go, then keep observing.
    const settled = army.map((u) => ({ ...u, depth: first.depthM }));
    let repeats = 0;
    for (let i = 0; i < 40; i++) {
      repeats += commander
        .observe(withArmy(base, settled))
        .filter((c) => c.kind === 'depth').length;
    }
    assert.equal(repeats, 0, 'the standing crossing was re-ordered');
  });
});

describe('coming home is an ascent or it is nothing', () => {
  it('never orders a shallow hull deeper in the name of surfacing', () => {
    // Found by the balance telemetry, not by a unit test: a PR-1 scout is
    // seated at 300 m and its rated ceiling is 350 m, shallower than the
    // 600 m cruise depth. Clamping the surface target to the ceiling turned
    // "come home" into a 50 m *descent* — and a descent breaks Silent
    // Running, so every scout the Foundry produced was quietly un-silenced
    // on the tick it appeared. Thirty such orders in a fifteen-minute match.
    const scouts = [
      ...Array.from({ length: 6 }, (_, i) => hull(i + 1, UnitKind.Corvette, 600)),
      hull(90, UnitKind.LightScout, 300),
      hull(91, UnitKind.LightScout, 300),
    ];
    const byId = new Map(scouts.map((u) => [u.id, u]));

    // A doctrine that never crosses only ever surfaces, so every command it
    // emits here is a surface command.
    for (const command of depthCommands(Faction.Pelagia, scouts)) {
      for (const id of command.unitIds) {
        const from = byId.get(id)!.depth;
        assert.ok(
          command.depthM < from,
          `hull at ${from} m ordered to ${command.depthM} m while surfacing`
        );
      }
    }
  });
});

describe('the army splits by what each hull can survive', () => {
  it('never orders a hull past its own Pressure Rating', () => {
    // Match.orderDepth deliberately permits this for a human — renting depth
    // you cannot survive is the mechanic. A PR-1 scout under the layer takes
    // 4 HP/s of unhealable crush for stealth it will not live to use, and
    // difficulty here is decision quality.
    const mixed = MIXED_FORCE();
    const byId = new Map(mixed.map((u) => [u.id, u]));

    const commands = depthCommands(Faction.Directorate, mixed);
    assert.ok(commands.length > 0, 'no depth orders at all, so this asserts nothing');
    for (const command of commands) {
      for (const id of command.unitIds) {
        const rating = effectivePressureRating(byId.get(id)!.kind, Faction.Directorate);
        const band = DEPTH_BANDS[(rating - 1) as DepthBand];
        assert.ok(
          command.depthM < band.max,
          `PR-${rating} hull ordered to ${command.depthM} m, past its ${band.max} m limit`
        );
      }
    }
  });

  it("and with §3's baselines, no Directorate hull has to stay behind", () => {
    // This test used to assert the opposite — that a mixed force split into a
    // rated group that crossed and scouts that stayed in the light. That was
    // true, and #201 ended it: the Directorate's PR-3 baseline lifts every
    // hull they field, so the clamp no longer bites on any of them and the
    // whole force crosses together.
    //
    // Worth stating rather than deleting, because the emergent property that
    // split bought — a shallow scout still hearing for an army gone deaf under
    // the layer — went with it. The clamp itself is unchanged and still guards
    // any navy whose baseline leaves a hull short; the Directorate simply is
    // not one any more.
    const depths = new Set(depthCommands(Faction.Directorate, MIXED_FORCE()).map((c) => c.depthM));
    assert.equal(
      depths.size,
      1,
      `expected one crossing depth for a PR-3 navy, got ${[...depths].join(', ')}`
    );
  });
});

describe('the verb reaches the simulation', () => {
  it('actually moves hulls through the water, not just through the command list', () => {
    // AiSeat is the only file under ai/ that may touch Match, and a command the
    // seat ignores looks exactly like a commander that chose not to act. This
    // is the end-to-end check that it does not.
    const match = new Match(undefined, { fauna: false, seed: SEED });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Directorate);
    const seat = new AiSeat(
      match,
      briefingFor(match, 1, Faction.Directorate, AiDifficulty.Veteran)
    );

    const hulls = Array.from({ length: 8 }, () =>
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction: Faction.Directorate,
        x: 1200,
        y: 1200,
      })
    );
    for (const eid of hulls) {
      assert.equal(thermoclineZone(Position.depth[eid]!), ThermoclineZone.Above);
    }

    // Long enough for the commander to mass, decide, and for the dive to run:
    // 45 m/s over roughly 800 m, plus the cadence it thinks on.
    for (let i = 0; i < 120 * SIM.TICK_HZ; i++) {
      const own = match.update(STEP_MS)?.get(1);
      if (own !== undefined) seat.observe(own);
    }

    const below = hulls.filter(
      (eid) => thermoclineZone(Position.depth[eid]!) === ThermoclineZone.Below
    );
    assert.ok(
      below.length > 0,
      `no hull crossed the layer: depths were ${hulls.map((e) => Position.depth[e]!.toFixed(0)).join(', ')}`
    );
  });
});
