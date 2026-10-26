/**
 * Nothing the Sorrowgate flight does *under way* reaches its silence ceiling —
 * the decision on #741.
 *
 * `docs/systems-echo.md` §2 used to carry a third movement band, "Moving
 * (flank/boost) 45–70", and `docs/mission-sorrowgate.md` §4 derived the
 * prologue's first lesson from it: a Light Scout at flank was "far above the
 * ceiling" of 20 and shoving. The simulation has never modelled that band.
 * `acoustics.ts` asks one question about movement — `speed > MOVING_EPSILON` —
 * and answers it with `sigCruise` or `sigIdle`, so a Light Scout is 12 under
 * way at any speed and 6 standing, and nothing in between exists to be found.
 * The decision was that the code is right and the docs overstated; the band is
 * deleted, and this file is what stops it coming back.
 *
 * Two properties, because the fault could return in two different ways:
 *
 * - **The definition** could acquire a bound hull whose cruise figure is over
 *   the ceiling, which would make §4's "moving never puts a hull of the flight
 *   over the ceiling" false without anyone touching `acoustics.ts`.
 * - **The acoustics path** could acquire a speed term, which would make it
 *   false without anyone touching the mission. The speed sweep below is the
 *   half that catches that one, and it is why this test drives the real system
 *   rather than reading `UNIT_STATS` twice.
 *
 * **Scoped to Sorrowgate on purpose, and the last test here is why.** The
 * general form — "no bound hull anywhere exceeds its mission's ceiling" — is
 * false in the registry as it stands: `attending-attendance` binds a hull that
 * cruises at 28 against a ceiling of 25. The ceiling is a real lever in the
 * campaign; it is this mission, with these hulls, where it is a reading
 * instead. Anyone tempted to widen this file should read that test first.
 *
 * "Under way" is speed, and only speed. A move onto the seabed follows it, and
 * where the ground falls away that follow is a dive, which does cross: the last
 * test here drives it, and holds that the court charges every crossing (#1586).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DEPTH, Faction, SIM, UnitKind, statsFor } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { MISSIONS } from '../src/sim/missions/index.ts';
import { PROLOGUE_SORROWGATE } from '../src/sim/missions/sorrowgate.ts';
import { acousticsSystem } from '../src/sim/systems/acoustics.ts';
import { Acoustic, DepthOrder, Owner, Position, Unit, Velocity } from '../src/sim/components.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { SORROWGATE, missionMapById } from '../src/sim/maps/index.ts';
import { addComponent, defineQuery } from 'bitecs';

const STEP_MS = 1000 / SIM.TICK_HZ;

/** The ceiling the order actually enforces, and the set it binds. */
const CEILING = PROLOGUE_SORROWGATE.silenceCeilingSig!;
const BOUND_ROLE = PROLOGUE_SORROWGATE.silenceRole ?? 'escort';

/** Every hull kind the Sorrowgate silence order binds, from the definition. */
const boundKinds = (): UnitKind[] => {
  const kinds = new Set<UnitKind>();
  for (const party of PROLOGUE_SORROWGATE.parties) {
    for (const unit of party.units ?? []) {
      if (unit.role === BOUND_ROLE) kinds.add(unit.kind);
    }
  }
  return [...kinds];
};

/**
 * A hull of `kind` at `speed`, through the production acoustics pass.
 *
 * The velocity is written straight onto the component rather than ordered,
 * because the point is to reach speeds the movement system would never produce
 * — the assertion is about the *predicate*, which is `speed > MOVING_EPSILON`
 * and nothing else. One `update` first so the world is stepped and `dt` is
 * real; `acousticsSystem` is then called directly, with no movement pass in
 * between to overwrite what we wrote.
 *
 * **On Sorrowgate's own map, at an escort's authored station.** The hull is not
 * the only term: `acousticsSystem` adds `kelpModifiers` for a hull driving
 * through kelp and `currentModifiers` for one crossing a cold shock, both on
 * top of the movement figure. §4's claim is true of this mission partly because
 * its map carries `hazards: []`, so testing it on another archetype would hold
 * a weaker property than the one the doc states — and would break for reasons
 * that are not this property's if that archetype ever grew a hazard near the
 * fixture.
 */
const sigAtSpeed = (kind: UnitKind, speed: number): number => {
  const match = new Match(SORROWGATE, { fauna: false, seed: 741 });
  match.addPlayer(0, Faction.Pelagia);
  const hull = spawnUnit(match.world, {
    kind,
    slot: 0,
    faction: Faction.Pelagia,
    x: 2550,
    y: 2150,
  });
  match.update(STEP_MS);

  Velocity.x[hull] = speed;
  Velocity.y[hull] = 0;
  acousticsSystem(match.world);
  return Acoustic.sig[hull]!;
};

describe('the flight under way — docs/mission-sorrowgate.md §4, clause 1', () => {
  it('binds hulls whose every movement figure is under the ceiling', () => {
    const kinds = boundKinds();
    assert.ok(kinds.length > 0, `no hull carries the bound role ${BOUND_ROLE}`);

    for (const kind of kinds) {
      const stats = statsFor(kind);
      assert.ok(
        stats.sigCruise <= CEILING,
        `${UnitKind[kind]} cruises at ${stats.sigCruise}, over the ceiling of ${CEILING}`
      );
      assert.ok(
        stats.sigIdle <= CEILING,
        `${UnitKind[kind]} idles at ${stats.sigIdle}, over the ceiling of ${CEILING}`
      );
    }
  });

  it('reads one figure under way, at every speed, and it is under the ceiling', () => {
    // Just over the epsilon, an ordinary cruise, the hull's own top speed, and
    // two speeds nothing in the game can reach. A third band — any speed term
    // at all — fails this the moment it is added, which is the whole job.
    const speeds = [0.02, 1, 40, statsFor(UnitKind.LightScout).speed, 1e3, 1e6];

    for (const kind of boundKinds()) {
      const cruise = statsFor(kind).sigCruise;
      for (const speed of speeds) {
        const sig = sigAtSpeed(kind, speed);
        assert.equal(
          sig,
          cruise,
          `${UnitKind[kind]} at ${speed} m/s read ${sig}, not its one under-way figure ${cruise}`
        );
        assert.ok(sig <= CEILING, `${UnitKind[kind]} at ${speed} m/s read ${sig}, over ${CEILING}`);
      }
    }
  });

  it('reads the idle figure at rest, so the two states are still two', () => {
    // The negative half of the same predicate. Without it, a change that made
    // *every* speed read `sigIdle` would pass the sweep above.
    for (const kind of boundKinds()) {
      const stats = statsFor(kind);
      assert.equal(sigAtSpeed(kind, 0), stats.sigIdle);
      assert.notEqual(stats.sigIdle, stats.sigCruise);
    }
  });

  it('is not vacuous: descent puts the same hull over the ceiling', () => {
    // The positive control. "Nothing under way crosses 20" would also be true
    // of a hull whose SIG never moved at all, so the ceiling has to be shown
    // reachable — by the one thing §10 refuses to teach here.
    const match = new Match(SORROWGATE, { fauna: false, seed: 742 });
    match.addPlayer(0, Faction.Pelagia);
    const hull = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Pelagia,
      x: 2550,
      y: 2150,
    });
    match.update(STEP_MS);

    addComponent(match.world, DepthOrder, hull);
    DepthOrder.active[hull] = 1;
    DepthOrder.descending[hull] = 1;
    acousticsSystem(match.world);

    assert.equal(Acoustic.sig[hull], DEPTH.DESCENT_SIG);
    assert.ok(DEPTH.DESCENT_SIG > CEILING, 'descent is meant to be the thing that crosses it');
  });
});

describe('why this file names one mission', () => {
  it('finds a ceiling in the registry that a bound hull does cross by moving', () => {
    // Guards the scope rather than the mechanic. If this ever finds nothing,
    // the campaign has changed shape and the file header's argument for being
    // Sorrowgate-only needs re-reading — it does not mean the sweep above may
    // be widened.
    const crossable = MISSIONS.filter((mission) => {
      const ceiling = mission.silenceCeilingSig;
      if (ceiling === undefined || ceiling >= 100) return false;
      const role = mission.silenceRole ?? 'escort';
      return mission.parties.some((party) =>
        (party.units ?? []).some(
          (unit) => unit.role === role && statsFor(unit.kind).sigCruise > ceiling
        )
      );
    });

    assert.ok(
      crossable.length > 0,
      'no mission binds a hull that crosses its own ceiling under way — see this file’s header'
    );
  });
});

describe('a move along the seabed, under the order (#1586)', () => {
  it('dives where the ground falls away, and the court charges every crossing', () => {
    // §9 used to say breaching by accident "takes some doing". A newcomer's
    // walk did it with plain moves: the flight is seated near the floor, so a
    // move is a move onto the ground and follows it (`orderDepthAt`), and a
    // follow descent is a dive at 72 (docs/systems-depth.md §2). The log's
    // `went loud` is raised on the 60 Hz step and the ledger reads at the Echo
    // pass, so the other half of the walk's question — did the court miss it —
    // is asked of every crossing: each run of ticks over the ceiling is seen
    // by a pass that charges the debt, or finds it already at its cap.
    const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
    const match = new Match(map, { mission: PROLOGUE_SORROWGATE, fauna: false, seed: 77 });
    const slot = PROLOGUE_SORROWGATE.playerSlot;
    const party = PROLOGUE_SORROWGATE.parties.find((p) => p.slot === slot)!;
    const hulls = defineQuery([Unit, Owner, Position])(match.world);
    const flight = party.units
      .filter((unit) => unit.role === BOUND_ROLE)
      .map((seat) =>
        hulls.find(
          (e) =>
            Owner.slot[e] === slot &&
            Math.hypot(Position.x[e]! - seat.x, Position.y[e]! - seat.y) < 1
        )!
      );
    assert.equal(flight.length, 4, 'the premise: the flight is four seated hulls');

    // A fixed walk: every eight seconds each escort is sent up to 200 m in a
    // direction the seed picks, to a point on the ground — the click a player
    // makes on the seabed. Six minutes is the opening window and some of the
    // exchange, before the 10:40 transit changes the ground.
    let seed = 1586;
    const next = (): number => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    const cap = PROLOGUE_SORROWGATE.debtCapS;
    let crossings = 0;
    let episodes = 0;
    let missed = 0;
    let over = false;
    let charged = false;
    let lastDebt = 0;
    for (let tick = 0; tick < 6 * 60 * SIM.TICK_HZ; tick++) {
      if (tick % (8 * SIM.TICK_HZ) === 0) {
        for (const eid of flight) {
          const x = Position.x[eid]! + (next() - 0.5) * 400;
          const y = Position.y[eid]! + (next() - 0.5) * 400;
          match.orderMove(slot, eid, x, y, false, match.world.terrain.floorAt(x, y));
        }
      }
      const wasLoud = flight.map((eid) => Acoustic.loud[eid]);
      const snapshots = match.update(STEP_MS);
      flight.forEach((eid, i) => {
        if (wasLoud[i] === 0 && Acoustic.loud[eid] === 1) crossings++;
      });
      if (snapshots !== null) {
        const debt = match.missionView?.debtS ?? 0;
        if (debt > lastDebt || debt >= cap) charged = true;
        lastDebt = debt;
      }
      const now = flight.some((eid) => Acoustic.sig[eid]! > CEILING);
      if (now && !over) charged = false;
      if (!now && over) {
        episodes++;
        if (!charged) missed++;
      }
      over = now;
      match.takeMissionView();
    }

    assert.ok(crossings > 0, 'no plain move dived — the walk’s finding no longer reproduces');
    assert.ok(episodes > 0);
    assert.equal(missed, 0, `${missed} of ${episodes} runs over the ceiling went uncharged`);
  });
});
