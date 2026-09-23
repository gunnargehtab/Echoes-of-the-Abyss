/**
 * The commander fields its navy's carrier, and flies it (#839).
 *
 * `docs/roster-plan.md` §2: "a hull the commander in `packages/backend/src/ai/`
 * never buys or never uses well does not exist in the baseline". #838 shipped
 * the four carriers and touched no doctrine, so all four were exactly that —
 * in the roster, on the Slipway's page, and never in the water.
 *
 * Asserted here, in three parts:
 *
 *   - the **buy**: every navy reaches its own carrier once the rung stands,
 *     the escort is met and the price is in the bank — one, not before the
 *     escort, and below the Sower's and the Bower's wants;
 *   - the **order**: a carrier is put onto a target and walked to the
 *     kilometre §15 gives it, inside its tether and outside the Cruiser's gun,
 *     and with nothing to fly at it waits behind the army. Against synthetic
 *     snapshots, and once end to end through `AiSeat` in a real match;
 *   - and what must not move: a flight is not the army, and no composition
 *     names a carrier.
 *
 * The tables below are restated from the roster rather than imported from the
 * commander's own, on `aiRung.test.ts`'s terms: a test that imported them
 * would assert that a table equals itself. Each navy's carrier is derived —
 * the Slipway hull it alone can build that has a deck.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { hasComponent } from 'bitecs';
import {
  AiDifficulty,
  FLIGHT,
  Faction,
  HarvestThrottle,
  OrdnanceKind,
  PRODUCIBLE,
  ResolutionTier,
  SIM,
  StructureKind,
  UnitKind,
  priceOf,
  statsFor,
  type Contact,
  type EchoSnapshot,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { DOCTRINE } from '../src/ai/doctrine.ts';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import {
  emptyWantTally,
  type AiBriefing,
  type AiCommand,
  type WantTally,
} from '../src/ai/types.ts';
import { Flightdeck, Heading, Position, Weapon } from '../src/sim/components.ts';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnUnit } from '../src/sim/world.ts';

const SEED = 0x51;

/** Sim ticks between two observations, as `aiRung.test.ts` counts them. */
const ECHO_TICKS = 12;

const NAVIES = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron];

function briefing(faction: Faction): AiBriefing {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, faction);
  match.addPlayer(1, faction === Faction.Bathyarch ? Faction.Pelagia : Faction.Bathyarch);
  return briefingFor(match, 0, faction, AiDifficulty.Veteran);
}

/**
 * The navy's carrier, read off the roster: the Slipway hull locked to this
 * faction that has a deck.
 *
 * Derived rather than listed, for `atTheRung`'s reason in `commander.ts` — a
 * second list here would be a copy of `PRODUCIBLE` free to drift, in the file
 * least likely to be edited when a wave moves a hull between yards.
 */
function carrierOf(faction: Faction): UnitKind {
  const rung = PRODUCIBLE[StructureKind.Slipway]!;
  const decks = rung.filter(
    (kind) => statsFor(kind).flight !== undefined && statsFor(kind).faction === faction
  );
  assert.equal(decks.length, 1, `${Faction[faction]} has exactly one carrier behind the rung`);
  return decks[0]!;
}

/**
 * The craft this navy's deck builds, read off the roster the same way: the
 * hull whose `launchedFrom` names the carrier. Nobody builds these — they have
 * no price and no yard — which is exactly why the commander must not count
 * them (docs/units.md, "The craft").
 */
function craftOf(faction: Faction): UnitKind {
  const carrier = carrierOf(faction);
  const craft = statsFor(carrier).flight?.craft;
  assert.ok(craft !== undefined, `${Faction[faction]}'s carrier has a deck`);
  assert.equal(
    statsFor(craft).launchedFrom,
    carrier,
    `${Faction[faction]}'s craft names the deck that builds it`
  );
  return craft;
}

/** The hull the commander finds as this navy's heavy, or `null` if it has none. */
function heavyOf(faction: Faction): UnitKind | null {
  const rung = PRODUCIBLE[StructureKind.Slipway]!;
  const heavy = DOCTRINE[faction].composition.find(
    (kind) => rung.includes(kind) && statsFor(kind).attackDamage > 0
  );
  return heavy ?? null;
}

function structure(
  id: number,
  kind: StructureKind,
  at: { x: number; y: number },
  queue: UnitKind[] = []
): EchoSnapshot['structures'][number] {
  return {
    id,
    kind,
    x: at.x,
    y: at.y,
    depth: 300,
    hp: 2500,
    maxHp: 2500,
    sig: 30,
    buildProgress: 1,
    queue,
    queueProgress: 0,
  };
}

function hull(
  id: number,
  kind: UnitKind,
  at: { x: number; y: number }
): EchoSnapshot['units'][number] {
  const stats = statsFor(kind);
  return {
    id,
    kind,
    engineOff: false,
    x: at.x,
    y: at.y,
    depth: 300,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    heading: 0,
    sig: stats.sigIdle,
    silentRunning: false,
    pressureBonus: 0,
    unhealableDamage: 0,
    ...(kind === UnitKind.Harvester ? { cargo: 0, throttle: HarvestThrottle.Standard } : {}),
  };
}

const OWN_SCOUT: Record<Faction, UnitKind> = {
  [Faction.Bathyarch]: UnitKind.Beacon,
  [Faction.Pelagia]: UnitKind.Glider,
  [Faction.Directorate]: UnitKind.Acolyte,
  [Faction.Hadron]: UnitKind.Herald,
};
const OWN_ORDNANCE: Record<Faction, UnitKind> = {
  [Faction.Bathyarch]: UnitKind.Broadside,
  [Faction.Pelagia]: UnitKind.Weaver,
  [Faction.Directorate]: UnitKind.Thurible,
  [Faction.Hadron]: UnitKind.Lance,
};
const OWN_SIEGE: Record<Faction, UnitKind> = {
  [Faction.Bathyarch]: UnitKind.Furnace,
  [Faction.Pelagia]: UnitKind.Blight,
  [Faction.Directorate]: UnitKind.Lure,
  [Faction.Hadron]: UnitKind.Tocsin,
};

/** The army size at which the escort-gated wants open. */
function escortFloor(faction: Faction): number {
  // `MASSING.MIN_FRACTION` is 0.5, restated here rather than imported for the
  // reason the tables above are: the commander's own constant is private, and
  // a test that read it would assert that a number equals itself.
  return Math.ceil(DOCTRINE[faction].attackAtArmySize * 0.5);
}

/**
 * A navy with nothing left to want but the deck.
 *
 * Every want in `commandProduction` bids into the same purse, and any one of
 * them still open would answer this file's question for it — so the economy is
 * staffed to the doctrine's target and the scout, the ordnance hull, the heavy
 * and the siege hull are all in the water, with the mine wall's two Spinners
 * (`MINE_WALL.SPINNERS`) for a navy that lays one. The Corvettes on the end are the
 * escort: the carrier's want is behind `attackAtArmySize * MASSING.MIN_FRACTION`
 * like the ordnance hull's. The Commune's Sower and Bower are left out, so
 * both of its wants are open; the Commune's own subtest below is about them.
 *
 * `escort: false` is the same navy one armed hull short of that floor, and it
 * is built rather than cut down to, because "no army" would answer the wrong
 * question. The heavy stays and counts toward it — its want is the one in
 * front of the carrier's that is *not* escort-gated, so a fixture without it
 * would see the heavy bought and return before the carrier's want was ever
 * read. The ordnance hull is dropped because its want is the probe for the
 * flight subtest: open, and shut only by the escort. The siege hull goes too:
 * its want is behind the same escort, so it can mask nothing while that is
 * shut.
 */
function force(
  brief: AiBriefing,
  opts: { escort?: boolean; extra?: UnitKind[] } = {}
): {
  units: EchoSnapshot['units'];
} {
  const doctrine = DOCTRINE[brief.faction];
  const home = brief.spawns[brief.slot]!;
  const at = (i: number): { x: number; y: number } => ({ x: home.x + i * 60, y: home.y });
  const heavy = heavyOf(brief.faction);
  const line =
    opts.escort === false
      ? Math.max(0, escortFloor(brief.faction) - 1 - (heavy === null ? 0 : 1))
      : doctrine.attackAtArmySize;
  const roster: UnitKind[] = [
    ...Array.from<UnitKind>({ length: doctrine.harvesterTarget }).fill(UnitKind.Harvester),
    OWN_SCOUT[brief.faction],
    ...(opts.escort === false ? [] : [OWN_ORDNANCE[brief.faction], OWN_SIEGE[brief.faction]]),
    ...(heavy === null ? [] : [heavy]),
    ...(doctrine.composition.includes(UnitKind.Spinner)
      ? [UnitKind.Spinner, UnitKind.Spinner]
      : []),
    ...Array.from<UnitKind>({ length: line }).fill(UnitKind.Corvette),
    ...(opts.extra ?? []),
  ];
  return { units: roster.map((kind, i) => hull(i + 1, kind, at(i))) };
}

function snapshot(
  brief: AiBriefing,
  tick: number,
  overrides: Partial<EchoSnapshot> = {}
): EchoSnapshot {
  const home = brief.spawns[brief.slot]!;
  return {
    tick,
    ordnance: [],
    ...force(brief),
    structures: [
      structure(20, StructureKind.Bastion, home),
      structure(21, StructureKind.Foundry, { x: home.x + 200, y: home.y }),
      structure(22, StructureKind.Refinery, { x: home.x - 200, y: home.y }),
      structure(23, StructureKind.Slipway, { x: home.x - 400, y: home.y }),
    ],
    contacts: [],
    peakSig: 30,
    berths: { used: 0, granted: 40 },
    refits: [],
    nodules: 0,
    crystal: 0,
    biomass: 0,
    exposure: { tier: ResolutionTier.Silent, trackedCount: 0 },
    selfEvents: [],
    draw: { capacity: 12, demand: 4, satisfaction: 1 },
    driftHealth: [],
    shoals: [],
    jellies: [],
    hazards: [],
    marks: [],
    ...overrides,
  };
}

/** A purse that covers this hull's price in every account it is written in. */
function purseFor(kind: UnitKind): Pick<EchoSnapshot, 'nodules' | 'crystal' | 'biomass'> {
  const price = priceOf(statsFor(kind));
  return { nodules: price.nodules, crystal: price.crystal, biomass: price.biomass };
}

/** Hulls a commander queues over `seconds` of standing still with this purse. */
function hullsBoughtOver(
  brief: AiBriefing,
  seconds: number,
  overrides: Partial<EchoSnapshot>
): UnitKind[] {
  const commander = new AiCommander(brief);
  const bought: UnitKind[] = [];
  const observations = Math.round(seconds * 5);
  for (let i = 0; i < observations; i++) {
    for (const command of commander.observe(snapshot(brief, 6000 + i * ECHO_TICKS, overrides))) {
      if (command.kind === 'produce') bought.push(command.unit);
    }
  }
  return bought;
}

describe('the commander fields its navy carrier', () => {
  for (const faction of NAVIES) {
    const name = Faction[faction];
    const carrier = carrierOf(faction);

    it(`${name} buys its ${UnitKind[carrier]} once the rung, the escort and the price are there`, () => {
      const brief = briefing(faction);
      const bought = new AiCommander(brief)
        .observe(snapshot(brief, 6000, purseFor(carrier)))
        .filter((c) => c.kind === 'produce')
        .map((c) => (c as { unit: UnitKind }).unit);

      assert.deepEqual(bought, [carrier], `${name} queues its carrier and nothing else`);
    });

    it(`${name} buys one ${UnitKind[carrier]} and not a second`, () => {
      const brief = briefing(faction);
      // Two minutes of standing still with the price in the bank, against a
      // navy that already has one in the water. A want that counted wrongly
      // would queue a deck every observation it could pay for.
      const bought = hullsBoughtOver(brief, 120, {
        ...purseFor(carrier),
        ...force(brief, { extra: [carrier] }),
      });
      assert.equal(
        bought.filter((k) => k === carrier).length,
        0,
        `${name} already holds a deck, so the want is closed`
      );
    });

    it(`${name} does not buy its ${UnitKind[carrier]} before the escort`, () => {
      const brief = briefing(faction);
      const unescorted = force(brief, { escort: false });
      // The premise, asserted rather than assumed: a fixture that happened to
      // clear the floor would pass this test while measuring nothing. The army
      // is what `observe` counts — armed, and not the navy's own scout.
      const armed = unescorted.units.filter(
        (u) => statsFor(u.kind).attackDamage > 0 && u.kind !== OWN_SCOUT[faction]
      ).length;
      assert.ok(
        armed < escortFloor(faction),
        `${name}'s fixture is below its own escort floor (${armed} < ${escortFloor(faction)})`
      );

      const bought = hullsBoughtOver(brief, 30, { ...purseFor(carrier), ...unescorted });
      assert.equal(
        bought.filter((k) => k === carrier).length,
        0,
        `${name} has no line to hold the water the deck would open in`
      );
    });

    it(`${name} sees a queued ${UnitKind[carrier]} and does not order a second`, () => {
      const brief = briefing(faction);
      const home = brief.spawns[brief.slot]!;
      const bought = hullsBoughtOver(brief, 60, {
        ...purseFor(carrier),
        structures: [
          structure(20, StructureKind.Bastion, home),
          structure(21, StructureKind.Foundry, { x: home.x + 200, y: home.y }),
          structure(22, StructureKind.Refinery, { x: home.x - 200, y: home.y }),
          structure(23, StructureKind.Slipway, { x: home.x - 400, y: home.y }, [carrier]),
        ],
      });
      assert.equal(
        bought.filter((k) => k === carrier).length,
        0,
        `${name} sees the hull on the ways and does not order a second`
      );
    });

    it(`${name} does not let a queued ${UnitKind[carrier]} escort it`, () => {
      // The other half of putting the carriers in `WANTED_SEPARATELY`, and the
      // half the subtest above cannot see: `queuedArmy` filters on that list
      // rather than on `joinsTheArmy`, so a deck on the ways would count
      // toward the army's own size. Measured on the unescorted fixture, where
      // one extra body is the difference — if the queued deck counted, the
      // navy would read itself as escorted and buy its ordnance hull.
      const brief = briefing(faction);
      const home = brief.spawns[brief.slot]!;
      const ordnance = OWN_ORDNANCE[faction];
      const bought = hullsBoughtOver(brief, 60, {
        ...force(brief, { escort: false }),
        // The ordnance hull's price exactly, in the accounts it is written in,
        // and not a nodule more. A fat purse does not make this test stronger,
        // it makes it vacuous: `commandRefit` and `commandConstruction` both
        // run ahead of `commandProduction` and both `return` once they spend,
        // so a navy handed spare crystal buys a refit every observation and
        // never reaches the want under test at all.
        ...purseFor(ordnance),
        structures: [
          structure(20, StructureKind.Bastion, home),
          structure(21, StructureKind.Foundry, { x: home.x + 200, y: home.y }),
          structure(22, StructureKind.Refinery, { x: home.x - 200, y: home.y }),
          structure(23, StructureKind.Slipway, { x: home.x - 400, y: home.y }, [carrier]),
        ],
      });
      assert.equal(
        bought.filter((k) => k === ordnance).length,
        0,
        `${name}'s escort-gated want stays shut behind a hull that has no gun`
      );
    });

    it(`${name} does not count its ${UnitKind[craftOf(faction)]} flight as the army`, () => {
      // #839's own defect, reachable once the want lands: a craft is an
      // ordinary unit in the owner's snapshot and every craft is armed, so
      // `observe`'s damage test admits the whole flight. `launchedFrom` is what
      // tells a craft from a hull (`packages/shared/src/units.ts`).
      //
      // Measured on the unescorted fixture, one armed hull short of the floor,
      // plus a carrier and a full flight. If the craft counted, the navy would
      // clear its escort floor with them and buy its ordnance hull.
      const brief = briefing(faction);
      const craft = craftOf(faction);
      const deck = statsFor(carrier).flight!;
      const ordnance = OWN_ORDNANCE[faction];
      const unescorted = force(brief, {
        escort: false,
        extra: [carrier, ...Array.from<UnitKind>({ length: deck.capacity }).fill(craft)],
      });
      // The premise: counted, the flight would carry this navy over the floor.
      const armed = unescorted.units.filter(
        (u) => statsFor(u.kind).attackDamage > 0 && u.kind !== OWN_SCOUT[faction]
      ).length;
      assert.ok(
        armed >= escortFloor(faction),
        `${name}'s fixture only measures something if the craft would clear the floor ` +
          `(${armed} >= ${escortFloor(faction)})`
      );

      const bought = hullsBoughtOver(brief, 60, { ...unescorted, ...purseFor(ordnance) });
      assert.equal(
        bought.filter((k) => k === ordnance).length,
        0,
        `${name} is not escorted by hulls that take no order and sink on their own cell`
      );
    });
  }

  it('buys the Commune its Bower or its Sower before its Rootstock, with the purse for both', () => {
    // The owner's decision on #839: the carrier's want sits below the Sower's
    // and the Bower's. A want that can pay buys in written order, so this is
    // the order, measured. Written above them, Pelagia on 360–400 nodules
    // bought the Rootstock where it had bought the Bower or the Sower.
    const brief = briefing(Faction.Pelagia);
    const rootstock = carrierOf(Faction.Pelagia);
    for (const other of [UnitKind.Bower, UnitKind.Sower]) {
      const a = priceOf(statsFor(other));
      const b = priceOf(statsFor(rootstock));
      const purse = {
        nodules: Math.max(a.nodules, b.nodules),
        crystal: Math.max(a.crystal, b.crystal),
        biomass: Math.max(a.biomass, b.biomass),
      };
      const bought = new AiCommander(brief)
        .observe(snapshot(brief, 6000, purse))
        .filter((c) => c.kind === 'produce')
        .map((c) => (c as { unit: UnitKind }).unit);
      assert.equal(bought.length, 1, `one hull bought on the purse for the ${UnitKind[other]}`);
      assert.notEqual(
        bought[0],
        rootstock,
        `the Commune's ${UnitKind[other]}-sized purse goes to the Commune's own wants first`
      );
      assert.ok(
        bought[0] === UnitKind.Bower || bought[0] === UnitKind.Sower,
        `and to one of them: ${UnitKind[bought[0]!]}`
      );
    }
  });

  it('leaves every composition alone, so no cycle is re-phased', () => {
    // #839's first bullet asks for a composition entry; this is why the buy
    // will be a want instead. A carrier on a composition would be skipped by
    // the cycle anyway — `joinsTheArmy` is false for all four — while still
    // changing the list's length, which is what the index is taken modulo.
    for (const faction of NAVIES) {
      const carrier = carrierOf(faction);
      assert.ok(
        !DOCTRINE[faction].composition.includes(carrier),
        `${Faction[faction]}'s composition does not name its carrier`
      );
      assert.equal(
        statsFor(carrier).attackDamage,
        0,
        `${Faction[faction]}'s carrier has no gun, which is why the cycle could never buy it`
      );
    }
  });

  it('keeps every navy composition at the length it had before the carriers', () => {
    // A guard against the quiet version of the same mistake: an entry added
    // and then removed leaves no trace, but an entry added and left does.
    // These are the lengths on `main` at `fd8cd2a`, which is the commit this
    // change is measured against.
    const lengths: Record<Faction, number> = {
      [Faction.Bathyarch]: 6,
      [Faction.Pelagia]: 7,
      [Faction.Directorate]: 6,
      [Faction.Hadron]: 5,
    };
    for (const faction of NAVIES) {
      assert.equal(
        DOCTRINE[faction].composition.length,
        lengths[faction],
        `${Faction[faction]}'s cycle is the length it was`
      );
    }
  });
});

describe('the commander counts why it did or did not buy its carrier', () => {
  // #839's third bullet. The build column can say a navy never fielded its
  // deck; this says which gate shut, one reason per observation, and the five
  // sum to `reached` — the partition docs/invariants.md holds for both wants.
  // Each case is one observation on a fresh commander — a Veteran decides on
  // its first — so the tally after it is exactly one reason, and a case that
  // never reached the want at all fails on `reached` rather than passing as a
  // zero.
  it('counts one reason for every observation that reaches the carrier want', () => {
    for (const faction of NAVIES) {
      const name = Faction[faction];
      const carrier = carrierOf(faction);
      const brief = briefing(faction);
      const home = brief.spawns[brief.slot]!;
      const tallyAfter = (overrides: Partial<EchoSnapshot>): WantTally => {
        const commander = new AiCommander(brief);
        commander.observe(snapshot(brief, 6000, overrides));
        return commander.carrierWant;
      };
      const only = (reason: Exclude<keyof WantTally, 'reached'>): WantTally => ({
        ...emptyWantTally(),
        reached: 1,
        [reason]: 1,
      });
      const slipway = (
        over: Partial<EchoSnapshot['structures'][number]>
      ): Partial<EchoSnapshot> => ({
        structures: [
          structure(20, StructureKind.Bastion, home),
          structure(21, StructureKind.Foundry, { x: home.x + 200, y: home.y }),
          structure(22, StructureKind.Refinery, { x: home.x - 200, y: home.y }),
          { ...structure(23, StructureKind.Slipway, { x: home.x - 400, y: home.y }), ...over },
        ],
      });

      // Every case but the purchase holds an empty purse, so no want written
      // ahead of the carrier's can spend and return before it is read — the
      // trap `purseFor` exists for, from the other side.
      const cases: [string, Partial<EchoSnapshot>, WantTally][] = [
        ['the price in the bank', purseFor(carrier), only('bought')],
        ['an empty purse', {}, only('cannotAfford')],
        ['the Slipway still rising', slipway({ buildProgress: 0.5 }), only('noYard')],
        // `freeYard` reads a queue's length and not what is on it.
        [
          'the Slipway two deep',
          slipway({ queue: [UnitKind.Corvette, UnitKind.Corvette] }),
          only('noYard'),
        ],
        ['an army short of the escort', force(brief, { escort: false }), only('notEscorted')],
        ['a deck already afloat', force(brief, { extra: [carrier] }), only('alreadyHas')],
        // The order, held: a navy holding its deck while its army is below the
        // floor has a satisfied want, not a blocked one. Asking the escort
        // first files this under `notEscorted`, which is the fault the note on
        // the ordnance branch measured.
        [
          'a deck afloat and the army short of the escort',
          force(brief, { escort: false, extra: [carrier] }),
          only('alreadyHas'),
        ],
      ];
      for (const [label, overrides, expected] of cases) {
        assert.deepEqual(tallyAfter(overrides), expected, `${name}, ${label}`);
      }
    }
  });
});

/** The unit vector from this navy's start toward the middle of the map. */
function outward(brief: AiBriefing): { x: number; y: number } {
  const home = brief.spawns[brief.slot]!;
  const dx = brief.widthM / 2 - home.x;
  const dy = brief.heightM / 2 - home.y;
  const d = Math.hypot(dx, dy);
  return { x: dx / d, y: dy / d };
}

/** A point `m` metres out from `from` along `u`. */
function along(
  from: { x: number; y: number },
  u: { x: number; y: number },
  m: number
): { x: number; y: number } {
  return { x: from.x + u.x * m, y: from.y + u.y * m };
}

/** A contact the layer has classified as an enemy hull. */
function classified(id: number, at: { x: number; y: number }): Contact {
  return {
    id,
    tier: ResolutionTier.Classification,
    x: at.x,
    y: at.y,
    kind: UnitKind.Corvette,
    faction: Faction.Directorate,
    tick: 6000,
  };
}

/** Every command this commander gave the one unit. */
function ordersTo(commands: readonly AiCommand[], id: number): AiCommand[] {
  return commands.filter((c) =>
    'unitIds' in c ? c.unitIds.includes(id) : 'unitId' in c && c.unitId === id
  );
}

const CARRIER_ID = 90;

/**
 * The staffed navy, with its carrier out at `at` and every armed hull in a
 * knot at `army` rather than at home. Far enough out that nothing here is a
 * raid on the Bastion, so what the carrier is sent at is the order under test
 * and not home defence.
 */
function deployed(
  brief: AiBriefing,
  at: { x: number; y: number },
  army: { x: number; y: number }
): EchoSnapshot['units'] {
  const units = force(brief).units.map((u) =>
    statsFor(u.kind).attackDamage > 0 && u.kind !== OWN_SCOUT[brief.faction]
      ? { ...u, x: army.x + (u.id % 3) * 40, y: army.y + Math.floor(u.id / 3) * 40 }
      : u
  );
  return [...units, hull(CARRIER_ID, carrierOf(brief.faction), at)];
}

/** Where the commander's army stands in `units` — armed, not the scout. */
function middleOf(brief: AiBriefing, units: EchoSnapshot['units']): { x: number; y: number } {
  const army = units.filter(
    (u) =>
      statsFor(u.kind).attackDamage > 0 &&
      statsFor(u.kind).launchedFrom === undefined &&
      u.kind !== OWN_SCOUT[brief.faction]
  );
  return {
    x: army.reduce((n, u) => n + u.x, 0) / army.length,
    y: army.reduce((n, u) => n + u.y, 0) / army.length,
  };
}

// §15's kilometre and the slack either side of it, restated for `aiRung`'s
// reason: the commander's own `DECK` is private, and a test that read it would
// assert that a number equals itself.
const STANDOFF_M = 1000;
const SLACK_M = 100;
const TRAIL_M = FLIGHT.TETHER_M - 900;

describe('the commander flies its deck', () => {
  for (const faction of NAVIES) {
    const name = Faction[faction];

    it(`${name} backs its carrier off a target inside the Cruiser's gun, and sends the flight at it`, () => {
      const brief = briefing(faction);
      const home = brief.spawns[brief.slot]!;
      const u = outward(brief);
      const at = along(home, u, 4000);
      const target = along(at, u, 600);
      const units = deployed(brief, at, home);
      const commands = new AiCommander(brief).observe(
        snapshot(brief, 6000, { units, contacts: [classified(500, target)] })
      );

      const orders = ordersTo(commands, CARRIER_ID);
      const move = orders.findIndex((c) => c.kind === 'move');
      const attack = orders.findIndex((c) => c.kind === 'attack');
      assert.ok(attack >= 0, `${name}'s carrier is ordered onto the contact`);
      assert.equal((orders[attack] as { contactId: number }).contactId, 500);
      assert.ok(move >= 0, `${name}'s carrier is walked off a target 600 m away`);
      // A move clears an ordered target (`Match.applyMove`), so the order the
      // two arrive in is the difference between a flight and no flight.
      assert.ok(move < attack, 'the move is written before the attack, or it would clear it');
      const to = orders[move] as { x: number; y: number };
      assert.ok(
        Math.abs(Math.hypot(to.x - target.x, to.y - target.y) - STANDOFF_M) < 1,
        `walked to the kilometre off the target (${Math.hypot(to.x - target.x, to.y - target.y).toFixed(0)} m)`
      );
      assert.ok(
        Math.hypot(to.x - at.x, to.y - at.y) < STANDOFF_M - 600 + 1,
        'straight back along the line, not round the target'
      );
      assert.ok(
        !orders.some((c) => c.kind === 'attackMove'),
        `${name}'s carrier is not on the army's push`
      );
    });
  }

  it('leaves a carrier already at the kilometre where it is, and still orders the flight', () => {
    const brief = briefing(Faction.Bathyarch);
    const home = brief.spawns[brief.slot]!;
    const u = outward(brief);
    const at = along(home, u, 4000);
    const units = deployed(brief, at, home);
    const commands = new AiCommander(brief).observe(
      snapshot(brief, 6000, {
        units,
        contacts: [classified(500, along(at, u, STANDOFF_M + SLACK_M - 10))],
      })
    );
    const orders = ordersTo(commands, CARRIER_ID);
    assert.deepEqual(
      orders.map((c) => c.kind),
      ['attack'],
      'inside the slack, the order is the attack alone'
    );
  });

  it("closes on the army's fight when it is beyond the carrier's own tether", () => {
    // The army's fight is a classified contact inside a gun's reach of the
    // army (`commandArmy`'s "a fight already happening"). The carrier trails,
    // so that contact can be out of its tether; walking to the standoff is
    // what brings it back in.
    const brief = briefing(Faction.Directorate);
    const home = brief.spawns[brief.slot]!;
    const u = outward(brief);
    const front = along(home, u, 5000);
    const at = along(home, u, 3200);
    const target = along(front, u, 800);
    const units = deployed(brief, at, front);
    const d = Math.hypot(target.x - at.x, target.y - at.y);
    assert.ok(
      d > FLIGHT.TETHER_M,
      `the premise: the fight is outside the tether (${d.toFixed(0)} m)`
    );

    const orders = ordersTo(
      new AiCommander(brief).observe(
        snapshot(brief, 6000, { units, contacts: [classified(501, target)] })
      ),
      CARRIER_ID
    );
    assert.deepEqual(
      orders.map((c) => c.kind),
      ['move', 'attack'],
      'walked in, then ordered'
    );
    const to = orders[0] as { x: number; y: number };
    assert.ok(Math.abs(Math.hypot(to.x - target.x, to.y - target.y) - STANDOFF_M) < 1);
  });

  it('waits behind the army with nothing to fly at, on the cadence', () => {
    const brief = briefing(Faction.Hadron);
    const home = brief.spawns[brief.slot]!;
    const u = outward(brief);
    const units = deployed(brief, along(home, u, 1500), along(home, u, 4000));
    const middle = middleOf(brief, units);
    const back = { x: home.x - middle.x, y: home.y - middle.y };
    const len = Math.hypot(back.x, back.y);
    const station = along(middle, { x: back.x / len, y: back.y / len }, TRAIL_M);

    const on = ordersTo(
      new AiCommander(brief).observe(snapshot(brief, 6000, { units })),
      CARRIER_ID
    );
    assert.deepEqual(
      on.map((c) => c.kind),
      ['move'],
      'on the cadence, one move and nothing else'
    );
    const to = on[0] as { x: number; y: number };
    assert.ok(
      Math.hypot(to.x - station.x, to.y - station.y) < 1,
      `${TRAIL_M} m behind the army's middle, toward home`
    );

    // Off the cadence the order is not re-issued: every move re-plans the
    // route, and the station drifts with the army on every observation.
    const off = ordersTo(
      new AiCommander(brief).observe(snapshot(brief, 6012, { units })),
      CARRIER_ID
    );
    assert.deepEqual(off, [], 'off the cadence, nothing');
  });

  it('never opens the deck on a classified mine, or on a smudge away from home', () => {
    const brief = briefing(Faction.Pelagia);
    const home = brief.spawns[brief.slot]!;
    const u = outward(brief);
    const at = along(home, u, 4000);
    const units = deployed(brief, at, home);
    const mine: Contact = {
      ...classified(502, along(at, u, 500)),
      kind: undefined,
      faction: undefined,
      ordnance: OrdnanceKind.Mine,
    };
    const smudge: Contact = {
      id: 503,
      tier: ResolutionTier.Bearing,
      x: along(at, u, 700).x,
      y: along(at, u, 700).y,
      tick: 6000,
    };
    const orders = ordersTo(
      new AiCommander(brief).observe(snapshot(brief, 6012, { units, contacts: [mine, smudge] })),
      CARRIER_ID
    );
    assert.ok(
      !orders.some((c) => c.kind === 'attack'),
      'the deck is not opened at either — its own trigger refuses the mine, and a smudge is not a fight'
    );
  });

  it('brings an Offertory round to face its target, without leaving the band', () => {
    // The Offertory launches only into its own forward cone (§15). Backing
    // off points its bow away from the fight, so inside the band a step in is
    // what turns it; `movementSystem` writes the bow from the ordered course,
    // but only for a move longer than its 5 m arrival radius.
    const brief = briefing(Faction.Hadron);
    const home = brief.spawns[brief.slot]!;
    const u = outward(brief);
    const at = along(home, u, 4000);
    const orders = (range: number, facing: boolean): AiCommand[] => {
      const target = along(at, u, range);
      const bearing = Math.atan2(target.y - at.y, target.x - at.x);
      const units = deployed(brief, at, home).map((unit) =>
        unit.id === CARRIER_ID ? { ...unit, heading: facing ? bearing : bearing + Math.PI } : unit
      );
      return ordersTo(
        new AiCommander(brief).observe(
          snapshot(brief, 6000, { units, contacts: [classified(504, target)] })
        ),
        CARRIER_ID
      );
    };
    const leftBy = (range: number, command: AiCommand): number => {
      const target = along(at, u, range);
      const to = command as { x: number; y: number };
      return Math.hypot(to.x - target.x, to.y - target.y);
    };

    // The outer half: a step in, and a real one.
    const outer = orders(STANDOFF_M + 60, false);
    assert.deepEqual(
      outer.map((c) => c.kind),
      ['move', 'attack'],
      'facing away, outer half: a step, then the order'
    );
    assert.ok(Math.abs(leftBy(STANDOFF_M + 60, outer[0]!) - (STANDOFF_M + 35)) < 1, '25 m in');

    // The inner half: out to the standoff plus a step, so there is room for one.
    const inner = orders(STANDOFF_M - 60, false);
    assert.deepEqual(
      inner.map((c) => c.kind),
      ['move', 'attack'],
      'facing away, inner half: out first, then the order'
    );
    assert.ok(Math.abs(leftBy(STANDOFF_M - 60, inner[0]!) - (STANDOFF_M + 25)) < 1, 'to 1,025 m');

    for (const range of [STANDOFF_M - 60, STANDOFF_M + 60]) {
      assert.deepEqual(
        orders(range, true).map((c) => c.kind),
        ['attack'],
        `facing it already at ${range} m: the order alone`
      );
    }
  });

  it("flies at the army's fight before a louder contact inside its own tether", () => {
    // One tier at a time, as `commandArmy` reads them. A single ranked pool
    // would send the flight at the Tier-4 hull beside the carrier, because
    // `priority` ranks hulls by tier, while the army shoots the other one.
    const brief = briefing(Faction.Bathyarch);
    const home = brief.spawns[brief.slot]!;
    const u = outward(brief);
    const side = { x: -u.y, y: u.x };
    const front = along(home, u, 5000);
    const at = along(home, u, 3500);
    const fought = classified(505, along(front, u, 800));
    const beside: Contact = {
      ...classified(506, along(at, side, 700)),
      tier: ResolutionTier.Track,
    };
    const units = deployed(brief, at, front);
    assert.ok(
      Math.hypot(beside.x - front.x, beside.y - front.y) > 900,
      "the premise: the loud one is outside the army's reach"
    );
    const attack = ordersTo(
      new AiCommander(brief).observe(snapshot(brief, 6000, { units, contacts: [beside, fought] })),
      CARRIER_ID
    ).find((c) => c.kind === 'attack') as { contactId: number } | undefined;
    assert.equal(attack?.contactId, 505, 'the flight goes where the army is fighting');
  });

  it('comes home for a raid on the Bastion, ahead of everything else', () => {
    // The home tier: a classified contact inside `RANGE.DEFEND_URGENT_M` of
    // the Bastion recalls the army at once, and the deck with it.
    const brief = briefing(Faction.Directorate);
    const home = brief.spawns[brief.slot]!;
    const u = outward(brief);
    const at = along(home, u, 4000);
    const raid = classified(507, along(home, u, 600));
    const local = { ...classified(508, along(at, u, 700)), tier: ResolutionTier.Track };
    const units = deployed(brief, at, along(home, u, 5000));
    const orders = ordersTo(
      new AiCommander(brief).observe(snapshot(brief, 6000, { units, contacts: [local, raid] })),
      CARRIER_ID
    );
    assert.deepEqual(
      orders.map((c) => c.kind),
      ['move', 'attack'],
      'walked home, then ordered'
    );
    assert.equal((orders[1] as { contactId: number }).contactId, 507, 'onto the raid');
  });

  it('flies the deck in a real match: backed off, ordered on, and kept inside the tether', () => {
    // End to end, through `AiSeat`: the half a synthesised snapshot cannot
    // prove — that `Match` takes what the commander names, that the move and
    // the attack survive each other, and that the flight actually goes.
    //
    // A Rootstock (55 m/s) against a Cruiser (45 m/s, a 900 m gun), because
    // the chase leg is only a test of the tether if the carrier can keep up.
    const match = new Match(undefined, {
      fauna: false,
      seed: SEED,
      terrain: new Terrain(12000, 12000, 250, { floorM: 3200 }),
    });
    match.addPlayer(0, Faction.Directorate);
    match.addPlayer(1, Faction.Pelagia);
    const seat = new AiSeat(match, briefingFor(match, 1, Faction.Pelagia, AiDifficulty.Veteran));
    const carrier = spawnUnit(match.world, {
      kind: UnitKind.Rootstock,
      slot: 1,
      faction: Faction.Pelagia,
      x: 6000,
      y: 4000,
    });
    const cruiser = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 0,
      faction: Faction.Directorate,
      // Off the carrier's axis. On it, a craft launched astern chases the
      // Cruiser straight through its own carrier and separation, having no
      // side to push to, shoves the carrier 140 m toward the gun — measured,
      // and a fact about exact collinearity rather than about the order.
      x: 6150,
      y: 4680,
    });
    const gap = (): number =>
      Math.hypot(
        Position.x[cruiser]! - Position.x[carrier]!,
        Position.y[cruiser]! - Position.y[carrier]!
      );
    const run = (seconds: number, each: () => void): void => {
      for (let i = 0; i < SIM.TICK_HZ * seconds; i++) {
        const own = match.update(1000 / SIM.TICK_HZ)?.get(1);
        if (own !== undefined) seat.observe(own);
        each();
      }
    };

    // Backing off: from ~700 m, inside the Cruiser's 900 m gun, to the band
    // the commander leaves a carrier in — promptly, and still there at the
    // end of the leg.
    let orderedAt = -1;
    let craftOn = false;
    let backedOffAt = -1;
    let t = 0;
    run(20, () => {
      t++;
      if (orderedAt < 0 && Weapon.orderedTargetEid[carrier] === cruiser)
        orderedAt = t / SIM.TICK_HZ;
      if (backedOffAt < 0 && gap() >= STANDOFF_M - SLACK_M) backedOffAt = t / SIM.TICK_HZ;
      for (const craft of match.world.flights.get(carrier) ?? []) {
        if (
          hasComponent(match.world, Weapon, craft) &&
          Weapon.orderedTargetEid[craft] === cruiser
        ) {
          craftOn = true;
        }
      }
    });
    assert.ok(orderedAt >= 0, 'the carrier was ordered onto the Cruiser');
    // *While* it was walking back, which is the order the pair has to arrive
    // in: written the other way round, the move clears the target on every
    // observation until the carrier is inside the slack and no move is sent.
    assert.ok(
      orderedAt < backedOffAt,
      `ordered on at ${orderedAt.toFixed(1)} s, before reaching the band at ${backedOffAt.toFixed(1)} s`
    );
    assert.ok(Flightdeck.launched[carrier]! > 0, 'the deck opened');
    assert.ok(craftOn, 'and a craft took the carrier target');
    // 200 m at 55 m/s is under four seconds; ten is the order arriving late.
    assert.ok(
      backedOffAt >= 0 && backedOffAt < 10,
      `backed off from ~700 m to ${STANDOFF_M - SLACK_M} m (at ${backedOffAt.toFixed(1)} s)`
    );
    assert.ok(
      gap() >= STANDOFF_M - SLACK_M && gap() <= STANDOFF_M + SLACK_M,
      `and holding the kilometre at the end of the leg (${gap().toFixed(0)} m)`
    );

    // The chase: the Cruiser leaves, and the carrier follows it.
    const startY = Position.y[carrier]!;
    match.orderMove(0, cruiser, 6000, 11000);
    let widest = 0;
    run(30, () => {
      if (Weapon.orderedTargetEid[carrier] === cruiser) widest = Math.max(widest, gap());
    });
    assert.ok(
      Position.y[carrier]! - startY > 800,
      `the carrier followed (${(Position.y[carrier]! - startY).toFixed(0)} m)`
    );
    assert.ok(
      widest <= FLIGHT.TETHER_M,
      `and never let the target out of the tether while ordered on it (widest ${widest.toFixed(0)} m)`
    );
  });
});

describe('the commander flies a cone-gated deck', () => {
  // Two bearings, because the first version of this was measured against a
  // snapshot whose `heading` was a literal 0: a target within 45 degrees of
  // due east read as "faced" whatever the bow did, and a target anywhere else
  // read as never faced. East is the case that hid it.
  //
  // Neither is exactly on the world's x axis through the carrier. A craft is
  // launched at a world-frame station (`flight.ts`, `launch()`), so on that
  // axis one can enter the water astern, chase the target straight through
  // its own carrier, and — separation having no side to push to — shove the
  // carrier into the Cruiser's gun: measured at 993 m to sunk in eleven
  // seconds. That is the flight's and not the order's, and it is #863.
  for (const [label, cruiserAt] of [
    ['off to the north-east', { x: 6150, y: 4680 }],
    ['to the east', { x: 6700, y: 4040 }],
  ] as const) {
    it(`backs an Offertory off a Cruiser ${label}, brings it round, and its deck opens`, () => {
      const match = new Match(undefined, {
        fauna: false,
        seed: SEED,
        terrain: new Terrain(12000, 12000, 250, { floorM: 3200 }),
      });
      match.addPlayer(0, Faction.Directorate);
      match.addPlayer(1, Faction.Hadron);
      const seat = new AiSeat(match, briefingFor(match, 1, Faction.Hadron, AiDifficulty.Veteran));
      const carrier = spawnUnit(match.world, {
        kind: UnitKind.Offertory,
        slot: 1,
        faction: Faction.Hadron,
        x: 6000,
        y: 4000,
      });
      const cruiser = spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 0,
        faction: Faction.Directorate,
        ...cruiserAt,
      });
      const gap = (): number =>
        Math.hypot(
          Position.x[cruiser]! - Position.x[carrier]!,
          Position.y[cruiser]! - Position.y[carrier]!
        );

      // Launches counted from the moment it is backed off, so a craft that
      // left the deck off the spawn bow before the walk does not count.
      let launchedWhenBack = -1;
      for (let i = 0; i < SIM.TICK_HZ * 40; i++) {
        const own = match.update(1000 / SIM.TICK_HZ)?.get(1);
        if (own !== undefined) seat.observe(own);
        if (launchedWhenBack < 0 && gap() >= STANDOFF_M - SLACK_M) {
          launchedWhenBack = Flightdeck.launched[carrier]!;
        }
      }
      assert.ok(launchedWhenBack >= 0, 'it backed off out of the Cruiser gun');
      assert.ok(
        Flightdeck.launched[carrier]! > launchedWhenBack,
        `and the deck opened after it did (${launchedWhenBack} then ${Flightdeck.launched[carrier]})`
      );
      // The band, not the kilometre: a craft passing close can nudge the
      // carrier tens of metres, and inside the band nothing walks it back.
      assert.ok(
        gap() >= STANDOFF_M - SLACK_M && gap() <= STANDOFF_M + SLACK_M,
        `still in the band (${gap().toFixed(0)} m)`
      );
    });
  }

  it("carries the hull's own bow in its owner's snapshot", () => {
    // What every commander cone check reads. A literal 0 until #839.
    const match = new Match(undefined, {
      fauna: false,
      seed: SEED,
      terrain: new Terrain(12000, 12000, 250, { floorM: 3200 }),
    });
    match.addPlayer(0, Faction.Directorate);
    match.addPlayer(1, Faction.Hadron);
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Hadron,
      x: 6000,
      y: 6000,
    });
    match.orderMove(1, hull, 5000, 7000);
    let seen: number | undefined;
    for (let i = 0; i < SIM.TICK_HZ * 2; i++) {
      const own = match.update(1000 / SIM.TICK_HZ)?.get(1);
      const row = own?.units.find((u) => u.id === hull);
      if (row !== undefined) seen = row.heading;
    }
    assert.ok(
      Math.abs(Heading.rad[hull]! - (3 * Math.PI) / 4) < 1e-3,
      'the premise: it turned north-west'
    );
    assert.ok(
      seen !== undefined && Math.abs(seen - Heading.rad[hull]!) < 1e-6,
      `the snapshot says so (${seen})`
    );
  });
});
