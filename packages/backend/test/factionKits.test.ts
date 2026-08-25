/**
 * Faction combat kits (#168) — docs/systems-combat.md §11, docs/factions.md.
 *
 * Four traits the design bible has promised since before the simulation
 * existed, and which the simulation has never modelled. Each is an argument
 * about sound rather than a stat bonus in a faction's colours — the bar
 * CLAUDE.md sets for a faction trait existing at all — and each is asserted
 * here as *behaviour* rather than as a constant read back to itself.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasComponent, removeEntity } from 'bitecs';
import {
  FACTION_COMBAT,
  Faction,
  ORDNANCE,
  SILENT_RUNNING,
  SIM,
  UnitKind,
  damageMultiplierFor,
  firingSigFor,
  mineCapFor,
  seekerHydFor,
  statsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { Acoustic, Health, Ordnance, Owner, Structure, Unit } from '../src/sim/components.ts';
import { launchTorpedo } from '../src/sim/systems/ordnance.ts';
import { Terrain } from '../src/sim/terrain.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

function emptyMatch(a: Faction, b: Faction, seed = 71): Match {
  const terrain = new Terrain(14000, 14000, 200);
  const match = new Match(undefined, { fauna: false, seed, terrain });
  match.addPlayer(0, a);
  match.addPlayer(1, b);
  for (let eid = 0; eid < Owner.slot.length; eid++) {
    if (!hasComponent(match.world, Owner, eid)) continue;
    if (!hasComponent(match.world, Unit, eid) && !hasComponent(match.world, Structure, eid)) {
      continue;
    }
    removeEntity(match.world, eid);
  }
  return match;
}

describe('faction combat kits', () => {
  it('Klaxon: a Consortium hull hits harder while it is loud, and not while it is quiet', () => {
    // docs/factions.md, and §11: "+12% damage while SIG > 60". The bonus is
    // read off the *live* signature, which is what makes it doctrine rather
    // than a stat — the Consortium turns it on by accepting a cost.
    const quiet = damageMultiplierFor(Faction.Bathyarch, 40);
    const loud = damageMultiplierFor(Faction.Bathyarch, 80);
    assert.equal(quiet, 1, 'a quiet Consortium hull gets nothing');
    assert.equal(loud, FACTION_COMBAT.KLAXON.DAMAGE_MULTIPLIER);

    // And nobody else, at any volume — this is theirs.
    for (const faction of [Faction.Pelagia, Faction.Directorate, Faction.Hadron]) {
      assert.equal(damageMultiplierFor(faction, 95), 1, 'the Klaxon is a Consortium doctrine');
    }
  });

  it('Klaxon: the bonus is real damage in a real fight', () => {
    // The unit test above proves the multiplier; this proves it reaches the
    // hull. A descending Consortium Corvette is above the threshold (the
    // descent SIG floor is 72), so the same exchange lands harder.
    const damageOver = (attacker: Faction, dive: boolean): number => {
      const match = emptyMatch(attacker, Faction.Pelagia);
      const shooter = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction: attacker,
        x: 6000,
        y: 6000,
        depth: 600,
      });
      const prey = spawnUnit(match.world, {
        kind: UnitKind.Cruiser,
        slot: 1,
        faction: Faction.Pelagia,
        x: 6300,
        y: 6000,
        depth: 600,
      });
      advance(match, 0.2);
      if (dive) match.orderDepth(0, shooter, 1500);
      advance(match, 6);
      return statsFor(UnitKind.Cruiser).maxHp - Health.hp[prey]!;
    };

    const loudConsortium = damageOver(Faction.Bathyarch, true);
    const loudDirectorate = damageOver(Faction.Directorate, true);
    assert.ok(
      loudConsortium > loudDirectorate,
      `a loud Consortium hull should out-damage the same hull in another navy ` +
        `(${loudConsortium} vs ${loudDirectorate})`
    );
  });

  it('the Knights discharge quietly, because energy is a different weapon', () => {
    // §3 lists kinetic and energy as two classes rather than one with a
    // discount, so the class replaces the hull's burst outright.
    const kinetic = statsFor(UnitKind.Corvette).sigFiringBurst;
    assert.equal(firingSigFor(Faction.Bathyarch, kinetic), kinetic);
    assert.equal(firingSigFor(Faction.Hadron, kinetic), FACTION_COMBAT.ENERGY.FIRING_SIG);
    assert.ok(
      FACTION_COMBAT.ENERGY.FIRING_SIG < kinetic,
      'the point of the energy class is that it is the quiet one'
    );

    // And in the water: two identical hulls, one Knight, one not, both opening
    // fire. The Knight is the quieter of the two afterwards.
    const sigAfterFiring = (faction: Faction): number => {
      const match = emptyMatch(faction, Faction.Pelagia, 73);
      const shooter = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction,
        x: 6000,
        y: 6000,
      });
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction: Faction.Pelagia,
        x: 6300,
        y: 6000,
      });
      advance(match, 1.5);
      return Acoustic.sig[shooter]!;
    };

    assert.ok(
      sigAfterFiring(Faction.Hadron) < sigAfterFiring(Faction.Bathyarch),
      'a Knight in a gunfight should be quieter than a Consortium hull in the same one'
    );
  });

  it('a Directorate seeker hears what a Consortium seeker cannot', () => {
    // §11: their torpedoes carry "the best mobile ears in the game,
    // miniaturised". Asserted as an acquisition a baseline seeker fails to make
    // against the same target at the same range.
    assert.ok(
      seekerHydFor(Faction.Directorate) > seekerHydFor(Faction.Bathyarch),
      'the Directorate seeker should be the sharper one'
    );
    assert.ok(
      seekerHydFor(Faction.Directorate) < 90,
      'and must stay under the broadphase ceiling the Echo pass trusts'
    );

    const acquires = (faction: Faction): boolean => {
      const match = emptyMatch(faction, Faction.Pelagia, 77);
      const launcher = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction,
        x: 4000,
        y: 7000,
      });
      // A quiet target placed so the torpedo's *closest approach* — the end of
      // its 3,200 m run — lands in the narrow band where the two seekers
      // disagree. Against a Silent Running Corvette (SIG ~5.3) a HYD-50 seeker
      // hears to about 940 m and a HYD-70 one to about 1,160 m, so the run has
      // to end between those. Anywhere closer and both acquire; anywhere
      // further and neither does, and the test passes for the wrong reason.
      const prey = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction: Faction.Pelagia,
        x: 8340,
        y: 7000,
      });
      match.setSilentRunning(1, prey, true);
      advance(match, 0.5);

      const torpedo = launchTorpedo(match.world, launcher, 8340, 7000);
      let locked = false;
      for (let i = 0; i < 60 * 25; i++) {
        match.update(STEP_MS);
        if (!hasComponent(match.world, Ordnance, torpedo)) break;
        if (Ordnance.targetEid[torpedo]! !== 0) {
          locked = true;
          break;
        }
      }
      return locked;
    };

    assert.equal(acquires(Faction.Directorate), true, 'the sharper seeker finds it');
    assert.equal(acquires(Faction.Bathyarch), false, 'the baseline seeker does not');
  });

  it('the Commune may hold more mines than anyone else', () => {
    assert.ok(
      mineCapFor(Faction.Pelagia) > mineCapFor(Faction.Bathyarch),
      '§11 makes the Commune the mine faction'
    );

    const laid = (faction: Faction): number => {
      const match = emptyMatch(faction, Faction.Directorate, 79);
      const layer = spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 0,
        faction,
        x: 7000,
        y: 7000,
      });
      advance(match, 0.2);
      let count = 0;
      for (let i = 0; i < mineCapFor(Faction.Pelagia) + 4; i++) {
        if (match.layMine(0, layer) !== 0) count++;
        advance(match, ORDNANCE.MINE.ARMING_S + 0.2);
      }
      return count;
    };

    assert.equal(laid(Faction.Pelagia), mineCapFor(Faction.Pelagia));
    assert.equal(laid(Faction.Bathyarch), mineCapFor(Faction.Bathyarch));
  });

  it('leaves the Commune’s existing quiet doctrine alone', () => {
    // A guard rather than a new claim: §11 gives Pelagia the break-silence
    // alpha, which rests entirely on the Silent Running discount they already
    // have. A faction pass that quietly regressed it would take the ambush kit
    // with it.
    assert.ok(
      SILENT_RUNNING.PELAGIA_SPEED_MULTIPLIER > SILENT_RUNNING.SPEED_MULTIPLIER,
      'Pelagia should still manoeuvre better while silent than anyone else'
    );
  });
});
