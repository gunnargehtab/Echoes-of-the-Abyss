/**
 * The commander and its navy's carrier (#839), ahead of the buy.
 *
 * `docs/roster-plan.md` §2: "a hull the commander in `packages/backend/src/ai/`
 * never buys or never uses well does not exist in the baseline". #838 shipped
 * the four carriers and touched no doctrine, so all four are exactly that —
 * in the roster, on the Slipway's page, and never in the water.
 *
 * The buy waits for the order that uses the deck. Nothing orders a carrier
 * yet, so a bought one would sit at the Slipway, paid for and idle. What is
 * asserted here is what lands first:
 *
 *   - a navy's **flight is not its army**. Every craft is armed, so `observe`
 *     would count the whole flight without its `launchedFrom` guard;
 *   - and **no composition names a carrier**. A carrier has no gun, so the
 *     cycle would skip the entry, and the entry would still change the list's
 *     length and re-phase every selection its navy makes.
 *
 * The tables below are restated from the roster rather than imported from the
 * commander's own, on `aiRung.test.ts`'s terms: a test that imported them
 * would assert that a table equals itself. Each navy's carrier is derived —
 * the Slipway hull it alone can build that has a deck.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AiDifficulty,
  Faction,
  HarvestThrottle,
  PRODUCIBLE,
  ResolutionTier,
  StructureKind,
  UnitKind,
  priceOf,
  statsFor,
  type EchoSnapshot,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { DOCTRINE } from '../src/ai/doctrine.ts';
import { briefingFor } from '../src/ai/seat.ts';
import type { AiBriefing } from '../src/ai/types.ts';
import { Match } from '../src/sim/match.ts';

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
 * A navy whose rung wants are all met.
 *
 * Every want in `commandProduction` bids into the same purse, and any one of
 * them still open would answer this file's question for it — so the economy is
 * staffed to the doctrine's target and the scout, the ordnance hull, the heavy
 * and the siege hull are all in the water. The Corvettes on the end are the
 * escort the ordnance hull's want waits behind
 * (`attackAtArmySize * MASSING.MIN_FRACTION`).
 *
 * `escort: false` is the same navy one armed hull short of that floor, and it
 * is built rather than cut down to, because "no army" would answer the wrong
 * question. The heavy stays and counts toward it. The ordnance hull is dropped
 * because its want is the probe: open, and shut only by the escort. The siege
 * hull goes too: its want is behind the same escort, so it can mask nothing
 * while that is shut.
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

describe('the commander and its navy carrier', () => {
  for (const faction of NAVIES) {
    const name = Faction[faction];
    const carrier = carrierOf(faction);

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
