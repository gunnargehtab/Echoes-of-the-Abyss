/**
 * The commander goes to the bottom, and the Sower is why it stops having to
 * (#467).
 *
 * `docs/economy.md` §7 says the Abyssal band "is run as raids, not as
 * expansions, by everyone except the Directorate", and until now the commander
 * could not run one: `pickNode` refuses any field its rating does not cover,
 * which is the right rule for the standing economy and the wrong one for the
 * deep. The crystal field sits at `CRYSTAL.FIELD_DEPTH_M`, only the Directorate
 * has a harvester rated for it, and so the crystal-locked tier of §8 — every
 * navy's signature structure, and the Slipway the whole rung hangs off — was
 * Directorate-only by accident.
 *
 * What is asserted here is the decision rather than the outcome, because the
 * decision is the part that has to be right on every map:
 *
 *   - the trip is **priced before it is taken**, in the two currencies that
 *     take a hull down there — unhealable crush, and the plume the map charges
 *     for standing on the field — and refused when the boat cannot pay;
 *   - a raid is **one trip**, because 238 of a Harvester's 300 does not grow
 *     back and the boat that comes home cannot go again;
 *   - turning back is a **climb**, never a dive;
 *   - a grant makes the field **ordinary water**: the raid branch lets go of
 *     it, and `pickNode` will assign a PR-2 hauler to 2,400 m that it refused
 *     one observation earlier. That is the Sower's whole price justified in one
 *     assertion, and it is the half of #467 that could not be written until the
 *     commander had a reason to want the hull.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AiDifficulty,
  CRYSTAL,
  FACTION_STRUCTURE,
  Faction,
  HULL_EFFECTS,
  HarvestThrottle,
  HAZARDS,
  ResolutionTier,
  ResourceKind,
  StructureKind,
  UnitKind,
  priceOf,
  statsFor,
  structureStatsFor,
  type EchoSnapshot,
  type HazardState,
  type ResourceNodeInfo,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import type { AiBriefing } from '../src/ai/types.ts';
import { DOCTRINE } from '../src/ai/doctrine.ts';
import { briefingFor } from '../src/ai/seat.ts';
import { Match } from '../src/sim/match.ts';

const SEED = 0xc7;

/**
 * Boats the campaign may spend, mirroring `CRYSTAL_RUN.HULL_BUDGET * 2` in the
 * commander. Restated rather than exported because the constant is the
 * commander's private tuning and a test that imported it would assert only
 * that the number equals itself; what is worth pinning is that a cap exists
 * and is of this order.
 */
const CRYSTAL_RUN_BUDGET = 4 * 2;

function briefing(faction = Faction.Pelagia): AiBriefing {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, faction);
  return briefingFor(match, 1, faction, AiDifficulty.Veteran);
}

/** The crystal field of the default map — dead centre, and 2,400 m down. */
function crystalOf(brief: AiBriefing): ResourceNodeInfo {
  const field = brief.nodes.find((n) => n.kind === ResourceKind.ResonanceCrystal);
  assert.ok(field !== undefined, 'the default map has a crystal field');
  return field;
}

/**
 * The two authored plumes of Ventfront Divide, as the snapshot reports them.
 *
 * Not invented for the test: `HAZARDS.ERUPTION`'s own comment records that the
 * crystal "sits 500 m inside *both* authored plumes", and this is that fact
 * handed to the commander through the channel a human client gets it on.
 */
function plumes(field: ResourceNodeInfo): HazardState[] {
  return [-500, 500].map((offset, index) => ({
    id: 900 + index,
    kind: 'geothermal-eruption' as const,
    x: field.x,
    y: field.y + offset,
    radiusM: 700,
    phase: 0,
    progress: 0,
    remainingS: HAZARDS.ERUPTION.DORMANT_S,
  }));
}

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
    ...extra,
  };
}

/** A staffed economy: the doctrine's whole target, all of it fresh. */
function fleet(brief: AiBriefing, count: number): EchoSnapshot['units'] {
  const home = brief.spawns[brief.slot]!;
  return Array.from({ length: count }, (_, i) =>
    hull(i + 1, UnitKind.Harvester, { x: home.x + i * 40, y: home.y })
  );
}

describe('the commander prices the deep before it goes', () => {
  it('sends a hauler to the crystal field when the trip is one it can pay for', () => {
    // No plume in this snapshot, so the only price is the crush: 238 of a
    // Harvester's 300, which a fresh boat can just afford. This is the branch
    // existing at all — before it, no PR-2 navy had ever banked a crystal.
    const brief = briefing();
    const commander = new AiCommander(brief);
    const field = crystalOf(brief);
    const sent = commander.observe(
      snapshot(fleet(brief, DOCTRINE[Faction.Pelagia].harvesterTarget))
    );
    assert.ok(
      sent.some((c) => c.kind === 'harvest' && c.nodeId === field.id),
      'a staffed navy with nothing crystal-locked yet should go and get some'
    );
  });

  it('refuses the same trip once the map is charging for it too', () => {
    // The two plumes the crystal sits inside. `HAZARDS.ERUPTION` was solved so
    // that one pass "wounds badly and leaves the trip possible" (#179) — it
    // leaves a *crossing* possible, and this is the arithmetic nobody had done
    // yet: 238 HP of crush plus a 262 HP pass against a 300 HP hull. The boat
    // does not come back, so it is not sent.
    const brief = briefing();
    const commander = new AiCommander(brief);
    const field = crystalOf(brief);
    const sent = commander.observe(
      snapshot(fleet(brief, DOCTRINE[Faction.Pelagia].harvesterTarget), {
        hazards: plumes(field),
      })
    );
    assert.ok(
      !sent.some((c) => c.kind === 'harvest' && c.nodeId === field.id),
      'a trip that kills the hull is not a trip'
    );
  });

  it('will not take a hauler the economy has not finished staffing', () => {
    // The economy first: a navy that raids itself down to four boats has
    // bought a yard with the income that was going to fill it.
    const brief = briefing();
    const commander = new AiCommander(brief);
    const field = crystalOf(brief);
    const short = DOCTRINE[Faction.Pelagia].harvesterTarget - 1;
    const sent = commander.observe(snapshot(fleet(brief, short)));
    assert.ok(
      !sent.some((c) => c.kind === 'harvest' && c.nodeId === field.id),
      'under the doctrine target, nobody goes anywhere'
    );
  });

  it('will not send a boat that is already carrying', () => {
    // A hauler sent down mid-haul carries its nodules to the bottom, finds on
    // arrival that a hold cannot mix two resources, and turns straight round —
    // a six minute round trip that mines nothing. Measured, and then fixed.
    const brief = briefing();
    const commander = new AiCommander(brief);
    const field = crystalOf(brief);
    const laden = fleet(brief, DOCTRINE[Faction.Pelagia].harvesterTarget).map((u) => ({
      ...u,
      cargo: 30,
      cargoKind: ResourceKind.Nodule,
    }));
    const sent = commander.observe(snapshot(laden));
    assert.ok(
      !sent.some((c) => c.kind === 'harvest' && c.nodeId === field.id),
      'an empty hold only'
    );
  });

  it('turns a stranded raider round with a climb, never a dive', () => {
    // The bug this is here for: `ratedDepthCeiling` is the *deepest* water a
    // rating covers, so ordering a hull that is still on its way down straight
    // to it finishes the dive the abort exists to stop. A hauler pulled out at
    // 1,343 m obediently descended to 1,750 and sat there for ten minutes.
    //
    // Both directions are asserted, because only the pair pins the rule: a
    // hull above its ceiling is left alone, and one below it is climbed.
    const brief = briefing();
    const field = crystalOf(brief);
    const target = DOCTRINE[Faction.Pelagia].harvesterTarget;

    // The commander decides on its own cadence, so this drives observations
    // until it acts rather than assuming the next one is a decision.
    const depthsFor = (atM: number): number[] => {
      const commander = new AiCommander(brief);
      const out: number[] = [];
      for (let i = 0; i < 12; i++) {
        const wounded = i < 3;
        const units = fleet(brief, target).map((u, index) =>
          index === 0 && !wounded ? { ...u, x: field.x, y: field.y, depth: atM, hp: 90 } : u
        );
        for (const command of commander.observe(snapshot(units, { tick: 6000 + i * 12 }))) {
          if (command.kind === 'depth' && command.unitIds.includes(1)) out.push(command.depthM);
        }
      }
      return out;
    };

    const fromBelow = depthsFor(2100);
    assert.ok(fromBelow.length > 0, 'a hull that cannot afford the climb is told to make it');
    assert.ok(
      fromBelow.every((d) => d < 2100),
      `every order is a climb: got ${fromBelow.join(', ')} from 2,100 m`
    );

    assert.deepEqual(
      depthsFor(1343),
      [],
      'a hull already in water it is rated for is not sent anywhere at all'
    );
  });

  it('takes a raider off the run once it has banked, because a raid is one trip', () => {
    // 238 of a Harvester's 300 does not grow back (docs/systems-depth.md §2),
    // so the boat that comes home cannot go again. The commander marks it the
    // one moment it can be sure of — a hold with crystal in it — and lets go
    // when that hold is empty and the hull is out of the water that charges.
    const brief = briefing();
    const field = crystalOf(brief);
    const commander = new AiCommander(brief);
    const target = DOCTRINE[Faction.Pelagia].harvesterTarget;
    const home = brief.spawns[brief.slot]!;

    const run = (i: number, raider: Partial<EchoSnapshot['units'][number]>): typeof out => {
      const units = fleet(brief, target).map((u, index) => (index === 0 ? { ...u, ...raider } : u));
      return commander.observe(snapshot(units, { tick: 6000 + i * 12 }));
    };
    let out: ReturnType<AiCommander['observe']> = [];

    // Dispatched, then seen at the bottom with a full hold, then home empty.
    run(0, {});
    for (let i = 1; i < 4; i++) {
      run(i, {
        x: field.x,
        y: field.y,
        depth: field.depth,
        cargo: CRYSTAL.CARGO_CAPACITY,
        cargoKind: ResourceKind.ResonanceCrystal,
      });
    }
    // Home at a fifth of a hull, which is what 238 HP of unhealable crush
    // against a 300 HP boat leaves — and is also the only memory the commander
    // needs that this one has been. Nothing tracks a spent raider: the reserve
    // test looks at the hull, and the hull says no.
    let released: number | null = null;
    for (let i = 4; i < 10; i++) {
      for (const command of run(i, {
        x: home.x,
        y: home.y,
        depth: 300,
        cargo: 0,
        hp: 62,
        unhealableDamage: 238,
      })) {
        if (command.kind === 'harvest' && command.unitIds.includes(1)) released = command.nodeId;
      }
    }
    assert.ok(released !== null, 'the boat that banked is given something else to do');
    assert.notEqual(released, field.id, 'and it is not the bottom again');
  });

  it('stops the campaign once it has spent its budget of boats', () => {
    // A run with no end condition spends every hauler a navy will ever build
    // on a yard it is not going to finish — the plume takes boats the crush
    // was not going to. Fresh hull ids each observation stand in for a navy
    // that keeps replacing what it loses.
    const brief = briefing();
    const field = crystalOf(brief);
    const commander = new AiCommander(brief);
    const target = DOCTRINE[Faction.Pelagia].harvesterTarget;
    const home = brief.spawns[brief.slot]!;

    let dispatched = 0;
    for (let i = 0; i < 300; i++) {
      const units = Array.from({ length: target }, (_, k) =>
        hull(i * 100 + k, UnitKind.Harvester, { x: home.x + k * 40, y: home.y })
      );
      for (const command of commander.observe(snapshot(units, { tick: 6000 + i * 12 }))) {
        if (command.kind === 'harvest' && command.nodeId === field.id) dispatched++;
      }
    }
    assert.ok(dispatched > 0, 'it does start');
    assert.ok(
      dispatched <= CRYSTAL_RUN_BUDGET,
      `and it stops: ${dispatched} boats sent against a budget of ${CRYSTAL_RUN_BUDGET}`
    );
  });
});

describe('the Sower makes the field ordinary water', () => {
  it('puts the Sower on the Commune’s own composition', () => {
    assert.ok(
      DOCTRINE[Faction.Pelagia].composition.includes(UnitKind.Sower),
      'the navy whose doctrine is "they change the deep" has to be able to buy the hull that does'
    );
  });

  it('buys one once the Slipway stands, and only one', () => {
    // The grant does not stack — "under a Sower and a second Sower it does not
    // go deeper" (docs/units.md) — so a second hull over the same field is 380
    // nodules and 80 crystal buying a duplicate.
    const brief = briefing();
    const yard = {
      id: 30,
      kind: StructureKind.Slipway,
      x: 1200,
      y: 1200,
      depth: 300,
      hp: 2500,
      maxHp: 2500,
      sig: 30,
      buildProgress: 1,
      queue: [],
      queueProgress: 0,
    };
    const target = DOCTRINE[Faction.Pelagia].harvesterTarget;

    const wanted = new AiCommander(brief).observe(
      snapshot(fleet(brief, target), { structures: [yard], crystal: 400 })
    );
    assert.ok(
      wanted.some((c) => c.kind === 'produce' && c.unit === UnitKind.Sower),
      'a Commune with a yard and the crystal wants a Sower'
    );

    const home = brief.spawns[brief.slot]!;
    const already = new AiCommander(brief).observe(
      snapshot([...fleet(brief, target), hull(99, UnitKind.Sower, home)], {
        structures: [yard],
        crystal: 400,
      })
    );
    assert.ok(
      !already.some((c) => c.kind === 'produce' && c.unit === UnitKind.Sower),
      'and exactly one of them'
    );
  });

  it('walks the Sower out to the crystal field and then dives it', () => {
    const brief = briefing();
    const commander = new AiCommander(brief);
    const field = crystalOf(brief);
    const home = brief.spawns[brief.slot]!;

    // Walking: over many observations it is told to go to the field.
    let walked: { x: number; y: number } | null = null;
    for (let i = 0; i < 60; i++) {
      for (const command of commander.observe(
        snapshot([...fleet(brief, 6), hull(99, UnitKind.Sower, home)], { tick: 6000 + i * 12 })
      )) {
        if (command.kind === 'move' && command.unitIds.includes(99)) {
          walked = { x: command.x, y: command.y };
        }
      }
    }
    assert.ok(walked !== null, 'the Sower has somewhere to be');
    assert.ok(
      Math.hypot(walked.x - field.x, walked.y - field.y) < 1,
      'and it is the crystal field'
    );

    // Arrived: now, and only now, the dive. The seed clock reads horizontal
    // velocity, so a hull that stops and *then* descends is seeded before it
    // crosses 1,800 m and pays no crush for the water it is about to make
    // habitable.
    const overhead = new AiCommander(brief).observe(
      snapshot([...fleet(brief, 6), hull(99, UnitKind.Sower, field)])
    );
    assert.ok(
      overhead.some(
        (c) => c.kind === 'depth' && c.unitIds.includes(99) && c.depthM === field.depth
      ),
      'standing over the field, it is sent down to it'
    );
  });

  it('assigns a PR-2 hauler to 2,400 m once a Sower is seeded over it', () => {
    // The payoff, and the whole argument for the hull's price. Same commander,
    // same field, same hauler — the only difference is a Sower standing there
    // with its grant up, and water that was refused becomes water that is
    // worked. A map with one field, so the assignment is about the rating and
    // not about which node happened to be nearest.
    const base = briefing();
    const field = crystalOf(base);
    const oneField: AiBriefing = { ...base, nodes: [field] };
    const home = base.spawns[base.slot]!;
    const hauler = hull(1, UnitKind.Harvester, home);

    const refused = new AiCommander(oneField).observe(
      snapshot([hauler], { hazards: plumes(field) })
    );
    assert.ok(
      !refused.some((c) => c.kind === 'harvest'),
      'unrated water under a plume is not worked, and not raided either'
    );

    const seeded = new AiCommander(oneField).observe(
      snapshot(
        [hauler, hull(99, UnitKind.Sower, field, { depth: field.depth, pressureBonus: 1 })],
        {
          hazards: plumes(field),
        }
      )
    );
    assert.ok(
      seeded.some((c) => c.kind === 'harvest' && c.nodeId === field.id),
      'a hull standing there makes it a field like any other'
    );
  });

  it('leaves the Order’s first Cantus with the army and sends the spare', () => {
    // The same mechanism on far cheaper terms: a 400 nodule Foundry hull
    // against a Slipway hull at 80 crystal behind a 120 crystal yard. The
    // doctrine has already promised the first one to the rally, so only a
    // second is spare.
    const brief = briefing(Faction.Hadron);
    const field = crystalOf(brief);
    const home = brief.spawns[brief.slot]!;
    const sentTo = (units: EchoSnapshot['units']): number[] => {
      const commander = new AiCommander(brief);
      const ids: number[] = [];
      for (let i = 0; i < 60; i++) {
        for (const command of commander.observe(snapshot(units, { tick: 6000 + i * 12 }))) {
          if (command.kind === 'move' && Math.hypot(command.x - field.x, command.y - field.y) < 1) {
            ids.push(...command.unitIds);
          }
        }
      }
      return ids;
    };

    assert.equal(
      sentTo([...fleet(brief, 4), hull(90, UnitKind.Cantus, home)]).length,
      0,
      'one Cantus is the army’s'
    );
    const spare = sentTo([
      ...fleet(brief, 4),
      hull(90, UnitKind.Cantus, home),
      hull(91, UnitKind.Cantus, home),
    ]);
    assert.ok(spare.length > 0 && spare.every((id) => id === 91), 'the second one goes');
  });

  it('lets go of the field entirely once a grant has made it habitable', () => {
    // Habitable water is not a campaign. Pinning a shift on it would be this
    // branch deciding an economic question `pickNode` owns — and it measured
    // like one: two haulers held on a 45%-rate field cost a fifth of an
    // economy. So the raid lets go, and the field competes on distance and
    // crowding like every other.
    const brief = briefing();
    const field = crystalOf(brief);
    const commander = new AiCommander(brief);
    const target = DOCTRINE[Faction.Pelagia].harvesterTarget;
    const seeded = hull(99, UnitKind.Sower, field, {
      depth: field.depth,
      pressureBonus: HULL_EFFECTS.SOWER.PR_BONUS,
    });
    const sent = commander.observe(snapshot([...fleet(brief, target), seeded]));
    assert.ok(
      !sent.some((c) => c.kind === 'throttle' && c.throttle === HarvestThrottle.Overburden),
      'nobody is on a raid throttle over water that costs nothing to stand in'
    );
  });
});

describe('the commander saves for what it cannot buy out of pocket', () => {
  /** A structure of any kind, standing and idle. */
  function structure(id: number, kind: StructureKind): EchoSnapshot['structures'][number] {
    const stats = structureStatsFor(kind);
    return {
      id,
      kind,
      x: 1000,
      y: 1000,
      depth: 300,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      sig: stats.sigIdle,
      buildProgress: 1,
      queue: [],
      queueProgress: 0,
    };
  }

  const yards = (): EchoSnapshot['structures'] => [
    structure(20, StructureKind.Foundry),
    structure(21, StructureKind.Refinery),
  ];

  it('holds its nodules for the rung instead of spending them on hulls', () => {
    // The measurement this exists for: nothing in this commander had ever held
    // money back, so the branch that buys the second yard was reached
    // thousands of times a match and the *most* any navy held when it got
    // there was 630 nodules against a 600 price — 180 for the Commune. The 600
    // a navy starts with is the only time it is ever that rich.
    const brief = briefing();
    const commander = new AiCommander(brief);
    const half = Math.floor(priceOf(structureStatsFor(StructureKind.Slipway)).nodules / 2);
    const sent = commander.observe(
      snapshot(fleet(brief, DOCTRINE[Faction.Pelagia].harvesterTarget), {
        structures: yards(),
        nodules: half,
      })
    );
    assert.ok(
      !sent.some((c) => c.kind === 'produce'),
      `half a yard in the bank buys no hulls: ${JSON.stringify(sent.filter((c) => c.kind === 'produce'))}`
    );
  });

  it('buys haulers rather than saving while the economy is short of them', () => {
    // Saving is holding money back from the yards, and a navy short of haulers
    // has a better use for it: teching on an economy that cannot fund what it
    // unlocks is the same mistake in a longer form. Counted *with the line*,
    // because production only ever builds up to the target, so any loss puts a
    // navy under it — the Commune spends a match oscillating either side.
    const brief = briefing();
    const commander = new AiCommander(brief);
    const short = DOCTRINE[Faction.Pelagia].harvesterTarget - 2;
    const sent = commander.observe(
      snapshot(fleet(brief, short), {
        structures: yards(),
        nodules: priceOf(structureStatsFor(StructureKind.Slipway)).nodules,
      })
    );
    assert.ok(
      sent.some((c) => c.kind === 'produce' && c.unit === UnitKind.Harvester),
      'a yard in the bank and two haulers missing buys a hauler'
    );
    assert.ok(
      !sent.some((c) => c.kind === 'build' && c.structure === StructureKind.Slipway),
      'and not the yard'
    );
  });

  it('buys the rung the moment the saving covers it', () => {
    const brief = briefing();
    const commander = new AiCommander(brief);
    const sent = commander.observe(
      snapshot(fleet(brief, DOCTRINE[Faction.Pelagia].harvesterTarget), {
        structures: yards(),
        nodules: priceOf(structureStatsFor(StructureKind.Slipway)).nodules,
      })
    );
    assert.ok(
      sent.some((c) => c.kind === 'build' && c.structure === StructureKind.Slipway),
      'a full yard in the bank is a yard'
    );
  });

  it('will not save in front of something cheaper it already wants', () => {
    // A commander with 200 nodules and no Refinery banking every one of them
    // against a 600 nodule yard is the rung bought with the economy's own
    // money. The Refinery falls through when it cannot pay, so "fell through"
    // had to stop meaning "not wanted".
    const brief = briefing();
    const commander = new AiCommander(brief);
    const sent = commander.observe(
      snapshot(fleet(brief, DOCTRINE[Faction.Pelagia].harvesterTarget), {
        structures: [structure(20, StructureKind.Foundry)],
        nodules: Math.floor(priceOf(structureStatsFor(StructureKind.Refinery)).nodules / 2),
      })
    );
    assert.ok(
      sent.some((c) => c.kind === 'produce'),
      'with no Refinery yet, the money is the economy’s and the yards may spend it'
    );
  });

  it('will not save nodules against a gap only a hauler can close', () => {
    // Saving only helps where *waiting* helps. The signature structure is the
    // one thing this commander spends crystal on, and crystal does not arrive
    // by waiting — so a Commune holding 450 nodules for a Spore Veil it has no
    // crystal for is starving the yards of the very hull that would fetch it.
    const brief = briefing();
    const commander = new AiCommander(brief);
    const veil = FACTION_STRUCTURE[Faction.Pelagia]!;
    assert.ok(
      priceOf(structureStatsFor(veil)).crystal > 0,
      'the premise: the signature structure is the crystal sink'
    );
    const sent = commander.observe(
      snapshot(fleet(brief, DOCTRINE[Faction.Pelagia].harvesterTarget), {
        structures: [...yards(), structure(22, StructureKind.Slipway)],
        // Exactly its nodule price, so a commander that saved here would have
        // nothing left and the assertion below could not pass by accident.
        nodules: priceOf(structureStatsFor(veil)).nodules,
        crystal: 0,
      })
    );
    assert.ok(
      sent.some((c) => c.kind === 'produce'),
      'nodules held against a crystal gap are nodules the yards never see'
    );
  });

  it('builds the navy’s own structure once the crystal is aboard', () => {
    // docs/economy.md §8's crystal-locked tier is exactly one building a navy,
    // so this is the only thing the commander spends crystal on — and before
    // the branch existed, a commander that banked crystal had nothing to bank
    // it for and the whole trip to the bottom was a hauler spent on a number
    // going up.
    const brief = briefing();
    const commander = new AiCommander(brief);
    const veil = FACTION_STRUCTURE[Faction.Pelagia]!;
    const price = priceOf(structureStatsFor(veil));
    const sent = commander.observe(
      snapshot(fleet(brief, DOCTRINE[Faction.Pelagia].harvesterTarget), {
        structures: [...yards(), structure(22, StructureKind.Slipway)],
        nodules: price.nodules,
        crystal: price.crystal,
      })
    );
    assert.ok(
      sent.some((c) => c.kind === 'build' && c.structure === veil),
      'the Commune builds its Spore Veil'
    );
  });
});

describe('the crystal field itself', () => {
  it('is where docs/economy.md §8 says it is', () => {
    // The premise of everything above: the field is Abyssal, so it cannot be
    // worked without a PR-3 rating or a grant that lends one. If this moves,
    // every number in this file is about a different question.
    const field = crystalOf(briefing());
    assert.equal(field.depth, CRYSTAL.FIELD_DEPTH_M, 'one crystal field, 2,400 m down');
  });
});
