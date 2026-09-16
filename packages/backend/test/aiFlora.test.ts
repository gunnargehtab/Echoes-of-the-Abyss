/**
 * The commander's opinion about the flora economy — wave 7 of #547, second
 * half. docs/systems-flora.md §2, §6 and §9 step 7.
 *
 * Waves 1 to 6 built a bed with a crop, a reactor that spends one, a cutter
 * that wrecks one and a garden that pays for one being left alive — and no
 * commander did any of it, so every one of them was invisible to the balance
 * harness. This is the wave that gives the AI an opinion, and there are only
 * two of them:
 *
 * - **A bio-reactor is worth having if you can spend Biomass**, and worth
 *   nothing at all if you cannot. That is a roster question, not a faction
 *   one — §6 gives the reactor to every navy at one rate.
 * - **A garden is worth standing on**, at the price of the hull standing
 *   there, and only out of the force the army does not need.
 *
 * What is pinned here is those two judgements and the ways they must not go
 * wrong: no reactor for a navy with nothing to spend, no reactor before the
 * Refinery that shortens every haul, and never a tender taken out of an army
 * that is still gathering.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AiDifficulty,
  BLOOM_SHARE,
  Biome,
  CONSTRUCTION,
  DepthBand,
  Faction,
  HazardPhase,
  StructureKind,
  UnitKind,
  depthBandFor,
  priceOf,
  statsFor,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { briefingFor } from '../src/ai/seat.ts';
import { DOCTRINE } from '../src/ai/doctrine.ts';
import { Match } from '../src/sim/match.ts';
import { VENTFRONT_DIVIDE } from '../src/sim/maps/index.ts';

/** A briefing off the real map, which is where the gardens and the kelp are. */
function briefing(faction: Faction) {
  const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 51 });
  match.addPlayer(1, faction);
  return briefingFor(match, 1, faction, AiDifficulty.Veteran);
}

describe('the briefing carries the map’s gardens', () => {
  it('tells every commander where the bloom nodes are', () => {
    // Public map data, like the resource fields and the other seats' starts.
    // The guard-rail that sites a garden on the most reachable water
    // (docs/systems-echo.md §10) only works if everybody can find it.
    for (const faction of [Faction.Pelagia, Faction.Bathyarch]) {
      const brief = briefing(faction);
      assert.equal(brief.blooms.length, VENTFRONT_DIVIDE.blooms?.length);
      for (const [i, bloom] of brief.blooms.entries()) {
        assert.equal(bloom.x, VENTFRONT_DIVIDE.blooms![i]!.x);
        assert.equal(bloom.y, VENTFRONT_DIVIDE.blooms![i]!.y);
      }
    }
  });
});

describe('a reactor is worth having only if the account is spendable', () => {
  it('is wanted by the navies whose own roster is priced in Biomass', () => {
    // The gate, stated against the doctrines rather than against a faction
    // list: a navy that gains or loses a Biomass hull gains or loses the
    // opinion with it, and nothing here has to be edited when it does.
    const spends = (faction: Faction): boolean =>
      DOCTRINE[faction].composition.some((kind) => priceOf(statsFor(kind)).biomass > 0);
    assert.ok(spends(Faction.Directorate), 'the herd navy fields Biomass hulls');
    assert.ok(spends(Faction.Pelagia), 'and so does the Commune, since the fold');
    assert.ok(!spends(Faction.Bathyarch), 'the Consortium fields none');
    assert.ok(!spends(Faction.Hadron), 'and neither do the Knights');
  });

  it('sites one only where a building will actually stand', () => {
    // Two tests, and the second is the one that cost a baseline. A reactor
    // needs `requiresBiome: KelpForest`, and it needs ground that admits a
    // structure at `CONSTRUCTION.WORKING_DEPTH_M` — which a bloom garden does
    // not, by construction: gardens are Shelf-band and nothing can be built
    // on one (docs/maps.md).
    //
    // Without the depth half, the commander pushed a build the server refused
    // and returned from that branch on every observation, so the two builds
    // below it were never reached again. It measured as a Directorate that
    // stopped buying Slipways and Vent Taps entirely, and won 100% of decided
    // matches doing it.
    const brief = briefing(Faction.Directorate);
    const cell = (x: number, y: number): number =>
      Math.floor(y / brief.terrain.cellM) * brief.terrain.cols +
      Math.floor(x / brief.terrain.cellM);
    for (const garden of brief.blooms) {
      const at = cell(garden.x, garden.y);
      assert.equal(brief.terrain.biomes[at], Biome.KelpForest, 'a garden is kelp');
      assert.ok(
        brief.terrain.floor[at]! < CONSTRUCTION.WORKING_DEPTH_M,
        'and too shallow to build on, which is what makes it a garden'
      );
    }
  });

  it('has ground to stand one on, which this map did not until #535', () => {
    // The other half of the test above, and the half that was false. A garden
    // is Shelf-band by construction and refuses a building; until the aprons
    // authored a bed of their own, that was every bed on the archetype, so
    // `reactorSite` returned null on every observation of every match and the
    // account the flora economy exists to fill had nowhere to be spent.
    const brief = briefing(Faction.Directorate);
    const cell = (x: number, y: number): number =>
      Math.floor(y / brief.terrain.cellM) * brief.terrain.cols +
      Math.floor(x / brief.terrain.cellM);
    const beds = VENTFRONT_DIVIDE.hazards.filter((h) => h.kind === 'kelp-entanglement');
    const sites = beds.filter((bed) => {
      const at = cell(bed.x, bed.y);
      return (
        brief.terrain.biomes[at] === Biome.KelpForest &&
        brief.terrain.floor[at]! >= CONSTRUCTION.WORKING_DEPTH_M
      );
    });
    assert.equal(sites.length, beds.length, 'every authored bed should hold a reactor');
  });

  it('costs Biomass to field the hull the reactor is bought for', () => {
    // The loop closed, as arithmetic: the Commune's list now names a hull
    // priced in the account a garden fills, so tending is income they can
    // spend rather than a number going up (docs/systems-flora.md §6).
    const chorister = priceOf(statsFor(UnitKind.Chorister));
    assert.ok(chorister.biomass > 0);
    assert.ok(
      DOCTRINE[Faction.Pelagia].composition.includes(UnitKind.Chorister),
      'the Commune fields it'
    );
    assert.equal(
      statsFor(UnitKind.Chorister).faction,
      undefined,
      'and it is open to them because the price is the lock, not a faction flag'
    );
  });
});

describe('a garden is tended out of the surplus, never out of the force', () => {
  /** The commander's own reading of how many hulls it may send gardening. */
  function tenders(faction: Faction, army: number): number {
    const gardens = VENTFRONT_DIVIDE.blooms?.length ?? 0;
    if (faction !== Faction.Pelagia || gardens === 0) return 0;
    const spare = army - DOCTRINE[faction].attackAtArmySize;
    return Math.max(0, Math.min(gardens, Math.floor(spare / 2)));
  }

  it('sends nobody while the army is still gathering', () => {
    // The failure this rule exists for: a navy that stopped approaching
    // because two of its hulls were standing in kelp. The doctrine already
    // carries the number that means "enough hulls to act", and a tender comes
    // out of what is above it.
    const need = DOCTRINE[Faction.Pelagia].attackAtArmySize;
    for (let army = 0; army <= need + 1; army++) {
      assert.equal(tenders(Faction.Pelagia, army), 0, `an army of ${army} gardens with nobody`);
    }
  });

  it('never leaves the army below the size it attacks at', () => {
    const need = DOCTRINE[Faction.Pelagia].attackAtArmySize;
    for (let army = 0; army < 40; army++) {
      assert.ok(
        army - tenders(Faction.Pelagia, army) >= Math.min(army, need),
        `an army of ${army} kept ${army - tenders(Faction.Pelagia, army)}`
      );
    }
  });

  it('never sends more hulls than the map has gardens', () => {
    // The share is per bed and never per gardener (#243): a second tender on
    // one node buys nothing but a louder cluster of targets.
    const gardens = VENTFRONT_DIVIDE.blooms?.length ?? 0;
    assert.ok(gardens > 0, 'the map must author a garden, or this tests nothing');
    assert.equal(tenders(Faction.Pelagia, 200), gardens);
  });

  it('belongs to the Commune and to nobody else', () => {
    for (const faction of [Faction.Bathyarch, Faction.Directorate, Faction.Hadron]) {
      assert.equal(tenders(faction, 40), 0, `${Faction[faction]} does not tend`);
    }
  });
});

describe('and the commander actually does it', () => {
  it('walks a hull to a garden once it has hulls to spare', () => {
    // Through the real commander rather than the rule above: what is under
    // test here is that the branch runs, claims and issues, not the
    // arithmetic it claims by.
    const brief = briefing(Faction.Pelagia);
    const commander = new AiCommander(brief);
    const garden = brief.blooms[0]!;
    assert.ok(garden !== undefined);

    // An army well above the attack size, parked at home and hearing nothing,
    // so the only reason to send anybody anywhere is the garden.
    const army = Array.from({ length: 12 }, (_, i) => ({
      id: 100 + i,
      kind: UnitKind.Reed,
      x: brief.spawns[1]!.x,
      y: brief.spawns[1]!.y,
      depth: 300,
      hp: 400,
      maxHp: 400,
      sig: 12,
      throttle: undefined,
      cargo: undefined,
      cargoKind: undefined,
      mode: undefined,
      hold: undefined,
      aboard: undefined,
      embarking: undefined,
      silent: false,
      engineOff: false,
      followFloor: false,
      pressureRating: 1,
      mines: undefined,
    }));

    let sawGardenOrder = false;
    for (let i = 0; i < 40 && !sawGardenOrder; i++) {
      const commands = commander.observe({
        tick: i * 12,
        nodules: 600,
        crystal: 0,
        biomass: 0,
        power: { demand: 0, capacity: 6 },
        draw: { demand: 0, capacity: 6 },
        berths: { used: army.length, granted: 40 },
        units: army as never,
        structures: [],
        contacts: [],
        marks: [],
        hazards: [],
        residue: [],
        refits: [],
        exposure: { tier: 0, trackedCount: 0 },
      } as never);
      for (const command of commands) {
        if (command.kind !== 'move') continue;
        if (Math.hypot(command.x - garden.x, command.y - garden.y) <= BLOOM_SHARE.TEND_RADIUS_M) {
          sawGardenOrder = true;
        }
      }
    }
    assert.ok(sawGardenOrder, 'no hull was ever sent to a garden');
  });

  it('commissions a reactor on the bed behind its own base', () => {
    // The branch end to end, through the real commander: a navy that can
    // spend Biomass, with the Refinery it is gated behind already standing,
    // asks for a reactor and asks for it on a bed rather than on open water.
    //
    // The snapshot carries the map's own hazards, because that is where
    // `reactorSite` looks. A commander handed an empty hazard list is a
    // commander on a map with no beds, which is the state this test exists to
    // say the Ventfront is no longer in.
    const brief = briefing(Faction.Directorate);
    const commander = new AiCommander(brief);
    const beds = VENTFRONT_DIVIDE.hazards.filter((h) => h.kind === 'kelp-entanglement');
    assert.ok(beds.length > 0, 'the map must author a bed, or this tests nothing');

    let site: { x: number; y: number } | null = null;
    for (let i = 0; i < 8 && site === null; i++) {
      const commands = commander.observe({
        tick: i * 12,
        nodules: 900,
        crystal: 0,
        biomass: 0,
        power: { demand: 0, capacity: 6 },
        draw: { demand: 0, capacity: 6 },
        berths: { used: 1, granted: 40 },
        units: [
          {
            id: 1,
            kind: UnitKind.Harvester,
            x: brief.spawns[0]!.x,
            y: brief.spawns[0]!.y,
            depth: 300,
            hp: 400,
            maxHp: 400,
            sig: 30,
          },
        ],
        structures: [
          {
            id: 20,
            kind: StructureKind.Refinery,
            x: brief.spawns[0]!.x,
            y: brief.spawns[0]!.y,
            depth: CONSTRUCTION.WORKING_DEPTH_M,
            hp: 1200,
            maxHp: 1200,
            sig: 40,
            buildProgress: 1,
            queue: [],
            queueProgress: 0,
          },
        ],
        contacts: [],
        marks: [],
        hazards: beds.map((bed, id) => ({
          id: id + 1,
          kind: bed.kind,
          x: bed.x,
          y: bed.y,
          radiusM: bed.radiusM,
          phase: HazardPhase.Active,
          progress: 0,
          remainingS: 0,
        })),
        residue: [],
        refits: [],
        exposure: { tier: 0, trackedCount: 0 },
      } as never);
      for (const command of commands) {
        if (command.kind !== 'build') continue;
        if (command.structure !== StructureKind.BioReactor) continue;
        site = { x: command.x, y: command.y };
      }
    }

    assert.ok(site !== null, 'no reactor was ever asked for');
    const standing = beds.some(
      (bed) => Math.hypot(site!.x - bed.x, site!.y - bed.y) <= bed.radiusM
    );
    assert.ok(standing, `a reactor at ${site!.x},${site!.y} stands in no bed`);
  });
});

describe('a tender is put in the state the share is actually paid for', () => {
  /**
   * #706. `bloomShare.ts` pays a hull that is inside the bed *and* in the
   * Shelf band *and* not running silent, and this branch used to order only
   * the first of the three. A tender is claimed out of the army list, so
   * nothing else in the commander addresses its state afterwards — a hull
   * silenced on an approach and made a gardener next observation is outside
   * every list that could ever lift the silence again, and stands in the kelp
   * earning nothing until it dies.
   *
   * Measured on `ventfront-divide` before the fix: of the observations that
   * claimed a tender, 33 of 141 on seed 4000 and 51 of 117 on seed 4001 were
   * a hull in exactly that state.
   */
  function ordersFor(units: unknown[]): { kind: string; [k: string]: unknown }[] {
    const brief = briefing(Faction.Pelagia);
    const commander = new AiCommander(brief);
    const out: { kind: string; [k: string]: unknown }[] = [];
    for (let i = 0; i < 8; i++) {
      const commands = commander.observe({
        tick: i * 12,
        nodules: 600,
        crystal: 0,
        biomass: 0,
        power: { demand: 0, capacity: 6 },
        draw: { demand: 0, capacity: 6 },
        berths: { used: units.length, granted: 40 },
        units: units as never,
        structures: [],
        contacts: [],
        marks: [],
        hazards: [],
        residue: [],
        refits: [],
        exposure: { tier: 0, trackedCount: 0 },
      } as never);
      out.push(...(commands as never as { kind: string }[]));
    }
    return out;
  }

  /** An army already standing on the first garden, so only its state is wrong. */
  function armyOnTheGarden(patch: Record<string, unknown>): unknown[] {
    const brief = briefing(Faction.Pelagia);
    const garden = brief.blooms[0]!;
    return Array.from({ length: 12 }, (_, i) => ({
      id: 100 + i,
      kind: UnitKind.Reed,
      x: garden.x,
      y: garden.y,
      depth: 300,
      hp: 400,
      maxHp: 400,
      sig: 12,
      throttle: undefined,
      cargo: undefined,
      cargoKind: undefined,
      mode: undefined,
      hold: undefined,
      aboard: undefined,
      embarking: undefined,
      silentRunning: false,
      engineOff: false,
      followFloor: false,
      pressureRating: 1,
      mines: undefined,
      ...patch,
    }));
  }

  /** Orders addressed to this hull alone, which is the only shape this branch emits. */
  function addressedTo(
    orders: { kind: string; [k: string]: unknown }[],
    kind: string,
    id: number
  ): { kind: string; [k: string]: unknown }[] {
    return orders.filter(
      (c) =>
        c.kind === kind &&
        Array.isArray(c.unitIds) &&
        (c.unitIds as number[]).length === 1 &&
        (c.unitIds as number[])[0] === id
    );
  }

  it('lifts Silent Running off the hull it sends gardening', () => {
    // Addressed to the tender's own id, not to any `active: false` in the
    // batch: `setSilent` emits exactly that shape for the whole army on
    // engage, defend and recall, so a looser filter goes green with this
    // branch deleted the moment a fixture reaches one of them.
    const units = armyOnTheGarden({ silentRunning: true });
    const tender = (units[0] as { id: number }).id;
    const lifted = addressedTo(ordersFor(units), 'silent', tender).filter(
      (c) => c.active === false
    );
    assert.ok(
      lifted.length > 0,
      `the tender ${tender} was left silent, so the bed it stands on pays nothing`
    );
  });

  it('does not order silence off a tender that is already loud', () => {
    // The guard matters: an unconditional order every observation would be a
    // command on the wire for a state the hull is already in.
    const units = armyOnTheGarden({ silentRunning: false });
    const tender = (units[0] as { id: number }).id;
    assert.equal(
      addressedTo(ordersFor(units), 'silent', tender).length,
      0,
      'a loud tender was told to stop being silent'
    );
  });

  it('hands a released tender back silent when the army it rejoins is silent', () => {
    // The other half of the lift, and the regression it would otherwise be.
    // `armySilent` is a *believed* flag and `setCrossed`'s comment says why
    // that is allowed: silence is one bit for the whole force. Lifting it for
    // one tender falsifies the belief for that hull, and the belief is what
    // stops `setSilent` re-sending — so without a symmetric release the hull
    // rejoins a silent approach broadcasting, and stays that way until
    // something flips the flag through false and back.
    //
    // Driven through one commander across two observations, because that is
    // the shape of the fault: claimed while the army is large, released when
    // it is not.
    const brief = briefing(Faction.Pelagia);
    const commander = new AiCommander(brief);
    const garden = brief.blooms[0]!;
    const hulls = (n: number): unknown[] =>
      Array.from({ length: n }, (_, i) => ({
        id: 100 + i,
        kind: UnitKind.Reed,
        x: garden.x,
        y: garden.y,
        depth: 300,
        hp: 400,
        maxHp: 400,
        sig: 12,
        silentRunning: true,
        engineOff: false,
        followFloor: false,
        pressureRating: 1,
      }));
    const observe = (units: unknown[], tick: number): { kind: string; [k: string]: unknown }[] =>
      commander.observe({
        tick,
        nodules: 600,
        crystal: 0,
        biomass: 0,
        power: { demand: 0, capacity: 6 },
        draw: { demand: 0, capacity: 6 },
        berths: { used: units.length, granted: 40 },
        units: units as never,
        structures: [],
        contacts: [],
        marks: [],
        hazards: [],
        residue: [],
        refits: [],
        exposure: { tier: 0, trackedCount: 0 },
      } as never) as never;

    // Enough hulls to claim a tender, for long enough that the army commits to
    // its silent approach and `armySilent` is true.
    for (let i = 0; i < 8; i++) observe(hulls(12), i * 12);
    // Then a force too small to spare anybody: the claim evaporates. Walked
    // over several observations because the commander acts on its own cadence
    // (`AiTuning.cadenceTicks`) and returns early in between — a single
    // observation here lands on a tick the branch never runs.
    const released: { kind: string; [k: string]: unknown }[] = [];
    for (let i = 8; i < 12; i++) released.push(...observe(hulls(7), i * 12));
    // Addressed to the tender, for the same reason as the two above: the
    // commander emits single-id `active: true` for a scout and for a sailing
    // carrier, and neither is absent here by any property — only because a
    // fixture of Reeds designates no scout and builds no carrier.
    const resilenced = addressedTo(released, 'silent', 100).filter((c) => c.active === true);
    assert.ok(resilenced.length > 0, 'a released tender was left loud inside a silent approach');
  });

  it('does not silence a released tender back into a loud army', () => {
    // The guard on the release, which nothing else pins: it hands the hull
    // back to the state the army is *in*, and a commander that silenced every
    // returning tender would be inventing an order the force never gave.
    const brief = briefing(Faction.Pelagia);
    const commander = new AiCommander(brief);
    const garden = brief.blooms[0]!;
    const hulls = (n: number): unknown[] =>
      Array.from({ length: n }, (_, i) => ({
        id: 100 + i,
        kind: UnitKind.Reed,
        x: garden.x,
        y: garden.y,
        depth: 300,
        hp: 400,
        maxHp: 400,
        sig: 12,
        silentRunning: false,
        engineOff: false,
        followFloor: false,
        pressureRating: 1,
      }));
    const observe = (units: unknown[], tick: number): { kind: string; [k: string]: unknown }[] =>
      commander.observe({
        tick,
        nodules: 600,
        crystal: 0,
        biomass: 0,
        power: { demand: 0, capacity: 6 },
        draw: { demand: 0, capacity: 6 },
        berths: { used: units.length, granted: 40 },
        units: units as never,
        // A contact in reach keeps the army loud: `setSilent(ids, false)` on
        // the engage branch is what holds `armySilent` false here.
        contacts: [{ id: 1, x: garden.x + 200, y: garden.y, depth: 300, tier: 4, tick: 0 }],
        structures: [],
        marks: [],
        hazards: [],
        residue: [],
        refits: [],
        exposure: { tier: 0, trackedCount: 0 },
      } as never) as never;

    for (let i = 0; i < 8; i++) observe(hulls(12), i * 12);
    const released: { kind: string; [k: string]: unknown }[] = [];
    for (let i = 8; i < 12; i++) released.push(...observe(hulls(7), i * 12));
    const silenced = addressedTo(released, 'silent', 100).filter((c) => c.active === true);
    assert.equal(silenced.length, 0, 'a released tender was silenced into a loud army');
  });

  it('brings a tender hanging under the rim up into the Shelf band', () => {
    // The third clause. A bed is 400 m of radius and a plateau is whatever the
    // map authored (#577), so a hull inside the circle is not necessarily in
    // water the share is paid for.
    //
    // Asserted on the *tender's own* id rather than on any shallow order in
    // the batch, which is the trap here: the army branch already walks the
    // hulls it still holds down to the same Shelf ceiling, so a test that
    // matched `depthM < 400` anywhere passed with the branch deleted. The
    // tenders are exactly the hulls that order does not reach — they are
    // claimed out of the army list — and they are the two lowest ids, because
    // `commandGardens` draws from the army sorted by id.
    //
    // Read through `depthBandFor` rather than against a written 400: the
    // branch asks for a PR-1 ceiling precisely so the line stays in
    // DEPTH_BANDS, and a test that restates it is the copy the rest of the
    // stack refuses to keep.
    const units = armyOnTheGarden({ depth: 900 });
    const tender = (units[0] as { id: number }).id;
    const climbs = addressedTo(ordersFor(units), 'depth', tender).filter(
      (c) => depthBandFor(c.depthM as number) === DepthBand.Shelf
    );
    assert.ok(
      climbs.length > 0,
      `the tender ${tender} was left under the rim at 900 m, where bloom-share pays nothing`
    );
  });
});

describe('a claim the commander makes is a claim it keeps', () => {
  /**
   * #706, the second half. The branch above puts a *claimed* tender in the
   * state the share is paid for; this one is about the claim itself lasting
   * long enough for any of that to matter.
   *
   * `commandGardens` used to re-derive the whole assignment every observation
   * — the tender was whichever unclaimed id sorted lowest, the bed whichever
   * sorted nearest, and the count came straight off `army.length` through the
   * spare gate. So a single hull lost anywhere in the navy took the army under
   * the gate, dropped the claim, and handed a hull that was most of the way to
   * a bed back to the army branch, which walked it to the rally.
   *
   * Measured on `ventfront-divide`, seeds 4000–4002, against the pre-fix
   * commander: of 17 claims, **16 ended with the hull that held them still
   * alive** — not one of those was ended by the tender dying — and 5 reached a
   * bed. The median claim's closest approach to the bed it was sent to was
   * 826 m on seed 4000 and 1,451 m on 4002, against a `TEND_RADIUS_M` of 400.
   *
   * What is pinned here is the rule, not those numbers: **the gate decides
   * whether to start a claim, never whether to keep one that is still on its
   * way.** An arrived tender is still the gate's to recall, which is the test
   * above this one ('hands a released tender back silent…') and is why that
   * fixture stands the army on the garden.
   */
  const brief = briefing(Faction.Pelagia);
  const home = brief.spawns[brief.slot]!;

  /** An army at its own spawn, so every tender it claims has a walk ahead of it. */
  function hullsAtHome(n: number): unknown[] {
    return Array.from({ length: n }, (_, i) => ({
      id: 100 + i,
      kind: UnitKind.Reed,
      x: home.x,
      y: home.y,
      depth: 300,
      hp: 400,
      maxHp: 400,
      sig: 12,
      silentRunning: true,
      engineOff: false,
      followFloor: false,
      pressureRating: 1,
    }));
  }

  /** The dip: eight observations with hulls to spare, then four without. */
  function acrossADip(hulls: (n: number) => unknown[]): {
    kind: string;
    [k: string]: unknown;
  }[] {
    const commander = new AiCommander(brief);
    const observe = (units: unknown[], tick: number): { kind: string; [k: string]: unknown }[] =>
      commander.observe({
        tick,
        nodules: 600,
        crystal: 0,
        biomass: 0,
        power: { demand: 0, capacity: 6 },
        draw: { demand: 0, capacity: 6 },
        berths: { used: units.length, granted: 40 },
        units: units as never,
        structures: [],
        contacts: [],
        marks: [],
        hazards: [],
        residue: [],
        refits: [],
        exposure: { tier: 0, trackedCount: 0 },
      } as never) as never;
    for (let i = 0; i < 8; i++) observe(hulls(12), i * 12);
    const after: { kind: string; [k: string]: unknown }[] = [];
    // Below `attackAtArmySize + 2`, so the gate grants nothing at all. Walked
    // over several observations because the commander acts on its own cadence
    // and returns early in between.
    for (let i = 8; i < 12; i++) after.push(...observe(hulls(7), i * 12));
    return after;
  }

  /** Orders addressed to this hull alone, which is the only shape this branch emits. */
  function addressedTo(
    orders: { kind: string; [k: string]: unknown }[],
    kind: string,
    id: number
  ): { kind: string; [k: string]: unknown }[] {
    return orders.filter(
      (c) =>
        c.kind === kind &&
        Array.isArray(c.unitIds) &&
        (c.unitIds as number[]).length === 1 &&
        (c.unitIds as number[])[0] === id
    );
  }

  it('holds a tender that is still walking when the army dips under the gate', () => {
    // Read through the silence release rather than through the claim set,
    // which is private and deliberately so. `releaseTenders` emits a single-id
    // `silent active: true` for a tender it is handing back to a silent army,
    // and nothing else in this fixture emits that shape — a fixture of Reeds
    // designates no scout and builds no carrier. So the order is the release,
    // and its absence is the claim surviving.
    //
    // The positive control is the sibling test above: the same dip, with the
    // army standing *on* the garden, does emit it. Without that pair this
    // assertion would also pass if the branch never claimed anything at all.
    const released = addressedTo(acrossADip(hullsAtHome), 'silent', 100).filter(
      (c) => c.active === true
    );
    assert.equal(
      released.length,
      0,
      'a tender was recalled mid-walk, so it spent the whole trip and earned nothing'
    );
  });

  it('keeps sending that tender to the one bed it was sent to', () => {
    // The other way the old branch abandoned an order it had issued: the bed
    // was re-chosen every observation too, from a list sliced to a count that
    // moved with the army. Turning a hull that is most of the way to one
    // garden toward another costs the trip exactly as a recall does.
    //
    // The fixture is the case where the old assignment actually *changes*,
    // which is the only one that holds anything: both tenders are drawn from
    // the army sorted by id, so losing the lowest id shifts every hull behind
    // it one bed along. With the two hulls at 100 and 101 holding the two
    // gardens, hull 100 dying used to walk 101 off the bed it had been
    // crossing the map for and onto 100's.
    //
    // Ticks run to 1,800 because two throttles have to line up before a move
    // is emitted at all: `walk` re-issues on a 300-tick window, and a Veteran
    // acts on every third observation (`AiTuning.cadenceTicks`). Both land
    // together only every 75th call, so a short run emits exactly one move —
    // at tick 0, before anything under test has happened — and passes with the
    // branch deleted. The assertion below requires a move on each side of the
    // loss for the same reason.
    const commander = new AiCommander(brief);
    const moves: { tick: number; x: number; y: number }[] = [];
    const lostAt = 120;
    for (let tick = 0; tick <= 1800; tick += 12) {
      // Twelve hulls, then eleven: still two tenders' worth of spare either
      // side of the loss, so nothing about the *gate* changes here. Only which
      // hull sorts lowest does.
      const units = hullsAtHome(12).filter(
        (u) => tick < lostAt || (u as { id: number }).id !== 100
      );
      const commands = commander.observe({
        tick,
        nodules: 600,
        crystal: 0,
        biomass: 0,
        power: { demand: 0, capacity: 6 },
        draw: { demand: 0, capacity: 6 },
        berths: { used: units.length, granted: 40 },
        units: units as never,
        structures: [],
        contacts: [],
        marks: [],
        hazards: [],
        residue: [],
        refits: [],
        exposure: { tier: 0, trackedCount: 0 },
      } as never) as never as { kind: string; [k: string]: unknown }[];
      for (const c of addressedTo(commands, 'move', 101)) {
        moves.push({ tick, x: c.x as number, y: c.y as number });
      }
    }
    assert.ok(
      moves.some((m) => m.tick < lostAt) && moves.some((m) => m.tick >= lostAt),
      `hull 101 was not walked on both sides of the loss (${JSON.stringify(moves)})`
    );
    const first = moves[0]!;
    for (const move of moves) {
      assert.ok(
        Math.hypot(move.x - first.x, move.y - first.y) < 1,
        `hull 101 was walked to ${move.x},${move.y} at tick ${move.tick} after being ` +
          `claimed for the bed at ${first.x},${first.y}`
      );
    }
  });
});
