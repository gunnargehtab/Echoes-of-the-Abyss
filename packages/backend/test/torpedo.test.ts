/**
 * Torpedoes (#163) — docs/systems-combat.md §5.
 *
 * The claims here are the ones the design would be broken without, and they
 * are deliberately not "the arithmetic works". Damage numbers are TUNABLE and a
 * test that pinned them would break on every balance pass while proving
 * nothing. What is SPEC is the *shape* of the weapon:
 *
 *   - you always hear it coming (§1's second rule, the one that makes a short
 *     time-to-kill survivable rather than arbitrary);
 *   - the seeker homes on the loudest thing it can resolve, so being loud is
 *     what gets you hit and being silent is what saves you;
 *   - terrain prices the seeker exactly as it prices every other listener;
 *   - scarcity is real — the magazine empties and only a depot refills it;
 *   - the launch is loud, and launching from silence is loudest of all;
 *   - ordnance inherits its launcher's Pressure Rating and implodes below it.
 *
 * Every one of those is a sentence in the doc, and every one of them is a
 * behaviour a plausible refactor could quietly remove.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Faction,
  ORDNANCE,
  OrdnanceKind,
  ResolutionTier,
  SILENT_RUNNING,
  SIM,
  UnitKind,
  maxAudibleRangeM,
  resolveTier,
  statsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { hasComponent } from 'bitecs';
import { Acoustic, Health, Magazine, Ordnance, Owner, Position } from '../src/sim/components.ts';
import { launchTorpedo } from '../src/sim/systems/ordnance.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { Biome } from '@echoes/shared';

const STEP_MS = 1000 / SIM.TICK_HZ;

function advance(match: Match, seconds: number): void {
  const steps = Math.ceil((seconds * 1000) / STEP_MS);
  for (let i = 0; i < steps; i++) match.update(STEP_MS);
}

/** A match on blank open water, so terrain is never the thing under test. */
function openWaterMatch(seed = 7): Match {
  const terrain = new Terrain(12000, 12000, 200);
  const match = new Match(undefined, { fauna: false, seed, terrain });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, Faction.Pelagia);
  return match;
}

/** Live ordnance entities belonging to a slot. */
function liveOrdnance(match: Match, slot: number): number[] {
  const out: number[] = [];
  for (let eid = 0; eid < Ordnance.kind.length; eid++) {
    if (!hasComponent(match.world, Ordnance, eid)) continue;
    if (Health.hp[eid]! <= 0) continue;
    if (Owner.slot[eid] !== slot) continue;
    out.push(eid);
  }
  return out;
}

describe('torpedoes', () => {
  it('is audible to its target for its whole run — the rule short TTK rests on', () => {
    // docs/systems-combat.md §1: "nothing lethal is silent, only patient", and
    // §5 states it as a SPEC behaviour rather than a number — a running torpedo
    // must be resolvable by a baseline listener across its entire remaining run
    // in open water. This is the assertion that keeps the rest of the combat
    // design honest: everything else in §9 assumes the defender got to react.
    const baselineHyd = statsFor(UnitKind.Corvette).hyd;
    const runLengthM = ORDNANCE.TORPEDO.SPEED_MPS * ORDNANCE.TORPEDO.RUN_TIME_S;
    const audibleM = maxAudibleRangeM(ORDNANCE.TORPEDO.SIG_RUNNING, 1, baselineHyd);

    assert.ok(
      audibleM >= runLengthM,
      `a torpedo must be heard across its full ${runLengthM} m run; ` +
        `SIG ${ORDNANCE.TORPEDO.SIG_RUNNING} carries only ${Math.round(audibleM)} m to HYD ${baselineHyd}`
    );
    // And loud enough to be more than a smudge by the time it is close: at half
    // its run it should already classify, or "you heard it coming" is true only
    // in the sense that you heard *something*.
    assert.ok(
      resolveTier(ORDNANCE.TORPEDO.SIG_RUNNING, 1, runLengthM / 2, baselineHyd) >=
        ResolutionTier.Classification,
      'a torpedo halfway through its run should classify to a baseline listener'
    );
  });

  it('homes on the loudest hull it can resolve, not the nearest', () => {
    // The seeker is a listener, so "loud" and not "close" is what draws it.
    // This is what makes §2's counter cycle work at all — torpedoes beat heavy
    // hulls *because* heavy hulls are loud — and it is the property a
    // well-meaning refactor to "nearest enemy" would silently destroy.
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });

    // Nearer, and quiet. Further, and very loud.
    const quiet = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4200,
      y: 6000,
    });
    const loud = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5200,
      y: 6000,
    });
    advance(match, 0.2);

    const torpedo = launchTorpedo(match.world, launcher, 5200, 6000);
    assert.notEqual(torpedo, 0, 'the launch should be accepted');
    advance(match, 0.5);

    assert.equal(
      Ordnance.targetEid[torpedo],
      loud,
      'the seeker should take the loud Cruiser over the nearer, quieter Scout'
    );
    assert.notEqual(Ordnance.targetEid[torpedo], quiet);
  });

  it('is starved by Silent Running — the counter that costs you your own guns', () => {
    // §5: "a Silent Running hull is effectively invisible to a baseline seeker
    // beyond point-blank range. The counter to the alpha-strike weapon is the
    // mode that disables your own weapons — a real trade."
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4500,
      y: 6000,
    });
    match.setSilentRunning(1, prey, true);
    advance(match, 0.5);

    assert.ok(
      Acoustic.sig[prey]! <= SILENT_RUNNING.SIG_MAX,
      'the prey should actually be running silent'
    );

    const torpedo = launchTorpedo(match.world, launcher, 4500, 6000);
    advance(match, 0.5);
    assert.equal(
      Ordnance.targetEid[torpedo],
      0,
      'a silent hull should give the seeker nothing to lock onto at 1.5 km'
    );
  });

  it('wounds a Corvette with the first hit and kills it with the second, per the §9 band', () => {
    // The target runs silent, and that is load-bearing rather than incidental.
    // Since the §9 retune a Corvette's gun does 50 against a torpedo's 40 hull,
    // so any armed hull with a free cycle shoots one down inside the terminal
    // 250 m — which is §5 working as intended, and makes an unmodified version
    // of this test measure point defence rather than the damage band.
    //
    // Two torpedoes rather than one since #463: the first is a lesson the hull
    // survives with less than a fifth of its plate, and the second is the
    // magazine emptied. The alpha strike is intact; it is two decisions.
    //
    // A silent hull holds its fire, so the torpedo connects. It also starves
    // the seeker, which does not matter here: the aim point is the hull's own
    // position and it is not going anywhere, so the fuse does the work. That is
    // the real shape of the trade — going quiet saves you from being *found*,
    // not from a torpedo already aimed at where you are standing.
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4400,
      y: 6000,
    });
    match.setSilentRunning(1, prey, true);
    advance(match, 0.5);

    launchTorpedo(match.world, launcher, Position.x[prey]!, Position.y[prey]!);
    // 1.4 km at 160 m/s is about nine seconds of run, well inside the twenty
    // the torpedo has.
    advance(match, 12);

    const maxHp = statsFor(UnitKind.Corvette).maxHp;
    assert.ok(
      Health.hp[prey]! > 0 && Health.hp[prey]! < maxHp / 5,
      `one torpedo (${ORDNANCE.TORPEDO.DAMAGE}) should leave a Corvette (${maxHp} HP) alive and ` +
        `nearly gone, left ${Health.hp[prey]}`
    );

    launchTorpedo(match.world, launcher, Position.x[prey]!, Position.y[prey]!);
    advance(match, 12);
    assert.ok(Health.hp[prey]! <= 0, 'and the second torpedo of the magazine finishes it');
  });

  it('spends a magazine that only a depot refills', () => {
    // Scarcity is the class identity against the gun's endless ammo (§5). A
    // magazine that refilled in the field would make the torpedo a cooldown
    // weapon, and the decision it exists to force — "is this worth one of my
    // two" — would stop being a decision.
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      // Far from the starting base, so nothing rearms it out here.
      x: 9000,
      y: 9000,
    });
    advance(match, 0.2);
    assert.equal(Magazine.torpedoes[launcher], ORDNANCE.TORPEDO.MAGAZINE);

    for (let i = 0; i < ORDNANCE.TORPEDO.MAGAZINE; i++) {
      assert.notEqual(launchTorpedo(match.world, launcher, 9000, 3000), 0);
    }
    assert.equal(Magazine.torpedoes[launcher], 0, 'the magazine should now be empty');
    assert.equal(
      launchTorpedo(match.world, launcher, 9000, 3000),
      0,
      'an empty tube should refuse the shot'
    );

    // Well past a full rearm cycle, in open water, far from any structure.
    advance(match, ORDNANCE.TORPEDO.REARM_TIME_S * 2);
    assert.equal(Magazine.torpedoes[launcher], 0, 'a hull in the field should never rearm itself');
  });

  it('is loud to launch, and loudest of all out of silence', () => {
    // §3's launch transient, and §6 of systems-echo: breaking silence to fire
    // adds the ambush spike on top. The first shot of an ambush is always the
    // loudest, and a torpedo is not an exception to that.
    const match = openWaterMatch();
    const hull = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    match.setSilentRunning(0, hull, true);
    advance(match, 0.5);
    const silentSig = Acoustic.sig[hull]!;

    launchTorpedo(match.world, hull, 6000, 6000);
    advance(match, 1 / SIM.TICK_HZ);

    assert.ok(
      Acoustic.sig[hull]! >= silentSig + SILENT_RUNNING.BREAK_SILENCE_SIG_SPIKE,
      `launching from silence should pay the +${SILENT_RUNNING.BREAK_SILENCE_SIG_SPIKE} break-silence spike`
    );
  });

  it('implodes rather than following a target past its launcher’s rating', () => {
    // §8: "a cheap torpedo implodes chasing a Directorate hull below its
    // envelope — depth access gates weapons, not just hulls." The launcher here
    // is PR-2, so its ordnance is rated for Mid-Water and no further.
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    const deepPrey = spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 1,
      faction: Faction.Directorate,
      x: 4000,
      y: 6000,
      depth: 2400,
    });
    advance(match, 0.2);

    const torpedo = launchTorpedo(match.world, launcher, 4000, 6000);
    assert.equal(Ordnance.pressureRating[torpedo], statsFor(UnitKind.Corvette).pressureRating);

    advance(match, 30);
    assert.ok(
      Health.hp[deepPrey]! > 0,
      'a PR-2 torpedo must not be able to kill a hull sitting in the Abyssal band'
    );
    assert.equal(
      liveOrdnance(match, 0).length,
      0,
      'and the torpedo itself should be gone — imploded, not still swimming'
    );
  });

  it('is priced by terrain, exactly as every other listener is', () => {
    // §5: "terrain is ballistics". The seeker runs the standard propagation
    // model, so a masking biome hides a target from it — not because ordnance
    // has a terrain rule of its own, but because it has none.
    const masked = new Terrain(12000, 12000, 200);
    masked.fillRect(3600, 5000, 2400, 2000, Biome.ThermalVein);
    const match = new Match(undefined, { fauna: false, seed: 11, terrain: masked });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);

    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5600,
      y: 6000,
    });
    advance(match, 0.2);

    const torpedo = launchTorpedo(match.world, launcher, 5600, 6000);
    advance(match, 0.5);
    const throughVent = Ordnance.targetEid[torpedo]!;

    // The same geometry in open water, as the control.
    const open = openWaterMatch(11);
    const openLauncher = spawnUnit(open.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    spawnUnit(open.world, {
      kind: UnitKind.Corvette,
      slot: 1,
      faction: Faction.Pelagia,
      x: 5600,
      y: 6000,
    });
    advance(open, 0.2);
    const openTorpedo = launchTorpedo(open.world, openLauncher, 5600, 6000);
    advance(open, 0.5);

    assert.notEqual(
      Ordnance.targetEid[openTorpedo],
      0,
      'the control shot should acquire in open water'
    );
    assert.equal(
      throughVent,
      0,
      'a Thermal Vein (PF 0.45) between seeker and target should deny the lock'
    );
  });

  it('reports its own ordnance to its owner and nothing to anyone else', () => {
    // The fog-of-war rule applied to the newest entity type: a player sees
    // their own torpedo in full, and an opponent gets it only through the Echo
    // Layer, as a contact, at whatever tier they earned.
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    advance(match, 0.2);
    launchTorpedo(match.world, launcher, 6000, 6000);

    let mine = 0;
    let theirs = 0;
    for (let i = 0; i < 20; i++) {
      const snapshots = match.update(STEP_MS);
      if (snapshots === null) continue;
      mine = snapshots.get(0)?.ordnance.length ?? 0;
      theirs = snapshots.get(1)?.ordnance.length ?? 0;
    }

    assert.equal(mine, 1, 'the launching player should see their torpedo');
    assert.equal(theirs, 0, "the opponent's own-ordnance list must stay empty");
  });

  it('names ordnance only at classification, like a hull or a creature', () => {
    // §1 again, from the defender's side: a torpedo is *audible* its whole run
    // but not *identifiable* until Tier 3. A closing Tier-1 smudge could be
    // ordnance or a scout, and the seconds spent deciding are the mechanic.
    const match = openWaterMatch();
    const launcher = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 3000,
      y: 6000,
    });
    // A listener right beside the launch, so it resolves at the top tier.
    spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 1,
      faction: Faction.Directorate,
      x: 3400,
      y: 6000,
    });
    advance(match, 0.2);
    launchTorpedo(match.world, launcher, 3400, 6000);

    let classified: number | undefined;
    for (let i = 0; i < 30; i++) {
      const snapshots = match.update(STEP_MS);
      const contacts = snapshots?.get(1) ?? undefined;
      if (contacts === undefined) continue;
      for (const contact of contacts.contacts) {
        if (contact.ordnance === OrdnanceKind.Torpedo) classified = contact.tier;
      }
    }

    assert.ok(classified !== undefined, 'the defender should classify the inbound torpedo');
    assert.ok(
      classified >= ResolutionTier.Classification,
      'ordnance kind must never be attached below Tier 3'
    );
  });
});
