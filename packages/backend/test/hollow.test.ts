/**
 * Hollow — the ambush predator (#306, docs/bestiary.md §4).
 *
 * A trigger model, not a dwell model, and the properties worth pinning are
 * the ones a refactor toward the shared ladder would silently destroy:
 *
 * 1. **Interested is not an approach.** A coiled Hollow tracks and does not
 *    move and does not get louder — the ambush *is* the not-moving.
 * 2. **The strike gate is Commit-loud AND within 500 m in 3D.** Loud far away
 *    is watched; quiet nearby is ignored; loud nearby is struck, instantly.
 * 3. **Dual SIG**: 3 at rest, 60 only while striking — even disengaging is
 *    done at rest volume.
 * 4. **Every kill tells the region**: full-intensity battle residue at the
 *    site, so the announcement outlives the strike.
 * 5. **Damage is a sound** (#353). A gun that outranges the trigger — every
 *    gun, against the Directorate's ×0.4 — used to render a Hollow for
 *    nothing. Now the first shell springs the strike, at strike loudness,
 *    toward the loudest thing it hears; a driven one still gives nothing and
 *    is not woken.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EchoMarkKind, Faction, FaunaSpecies, FaunaStage, SIM, UnitKind } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnFauna, spawnUnit } from '../src/sim/world.ts';
import { Acoustic, Fauna, Health, Position } from '../src/sim/components.ts';
import { VENTFRONT_DIVIDE, type MapDefinition } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

function bareMap(): MapDefinition {
  return { ...VENTFRONT_DIVIDE, id: 'test-hollow', regions: [], hazards: [] };
}

function emptyMatch(seed = 111) {
  const match = new Match(bareMap(), {
    fauna: false,
    seed,
    terrain: new Terrain(8000, 8000, 250),
  });
  match.addPlayer(0, Faction.Bathyarch);
  return match;
}

function advance(match: Match, seconds: number) {
  for (let i = 0; i < seconds * SIM.TICK_HZ; i++) match.update(STEP_MS);
}

describe('the hollow', () => {
  it('holds station and rest volume while something loud is merely near', () => {
    const match = emptyMatch();
    const hollow = spawnFauna(match.world, { species: FaunaSpecies.Hollow, x: 5000, y: 5000 });
    const depth = Position.depth[hollow]!;
    // Loud, but 900 m out — well outside the trigger. A Draymaw would come
    // to look; the Hollow must not.
    spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5900,
      y: 5000,
      depth,
    });

    advance(match, 12);
    assert.ok(
      Math.hypot(Position.x[hollow]! - 5000, Position.y[hollow]! - 5000) < 1,
      'the ambush is the not-moving'
    );
    assert.equal(Acoustic.sig[hollow], 3, 'and the not-getting-louder');
    assert.notEqual(Fauna.stage[hollow], FaunaStage.Committed, 'watched, not struck');
  });

  it('strikes the moment something loud passes inside 500 m', () => {
    const match = emptyMatch(112);
    const hollow = spawnFauna(match.world, { species: FaunaSpecies.Hollow, x: 5000, y: 5000 });
    const depth = Position.depth[hollow]!;
    // A cruiser is SIG 55 at rest — "something loud" in the doc's sense, and
    // exactly what transits a trench route. Weapons cold so the test measures
    // the ambush rather than the gunfight.
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      weaponsCold: true,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5350,
      y: 5000,
      depth,
    });
    const full = Health.hp[prey]!;

    let struck = false;
    let sigWhileStriking = 0;
    for (let i = 0; i < SIM.TICK_HZ * 20; i++) {
      match.update(STEP_MS);
      if (Fauna.stage[hollow] === FaunaStage.Committed) {
        struck = true;
        sigWhileStriking = Acoustic.sig[hollow]!;
        break;
      }
    }
    assert.ok(struck, 'loud inside the trigger range means a strike, no dwell');
    assert.equal(sigWhileStriking, 60, 'the strike is one of the largest SIG events around');

    advance(match, 10);
    assert.ok(Health.hp[prey]! < full, 'and it bites');
  });

  it('is not sprung by a silent scout creeping through the range', () => {
    // The counter the doc intends: the Hollow answers loudness, so the quiet
    // way past an ambush is to actually be quiet — not merely distant.
    const match = emptyMatch(113);
    const hollow = spawnFauna(match.world, { species: FaunaSpecies.Hollow, x: 5000, y: 5000 });
    const depth = Position.depth[hollow]!;
    const scout = spawnUnit(match.world, {
      kind: UnitKind.LightScout,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5350,
      y: 5000,
      depth,
    });
    match.setSilentRunning(0, scout, true);

    advance(match, 15);
    assert.notEqual(Fauna.stage[hollow], FaunaStage.Committed, 'quiet passes the ambush');
    assert.equal(Health.hp[scout], Health.max[scout], 'untouched');
  });

  it('tells the whole region about a kill, then goes quiet again', () => {
    const match = emptyMatch(114);
    const hollow = spawnFauna(match.world, { species: FaunaSpecies.Hollow, x: 5000, y: 5000 });
    const depth = Position.depth[hollow]!;
    // A cruiser is SIG 55 at rest — "something loud" in the doc's sense, and
    // exactly what transits a trench route. Weapons cold so the test measures
    // the ambush rather than the gunfight.
    const prey = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      weaponsCold: true,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 5300,
      y: 5000,
      depth,
    });

    // Long enough for the strike and the whole meal.
    let killedAtS = -1;
    for (let s = 0; s < 60 && killedAtS < 0; s++) {
      advance(match, 1);
      if (Health.hp[prey]! <= 0) killedAtS = s;
    }
    assert.ok(killedAtS >= 0, 'the strike finishes what it starts');

    const residue = match.world.marks.all.find(
      (m) => m.kind === EchoMarkKind.Battle && Math.hypot(m.x - 5300, m.y - 5000) < 400
    );
    assert.ok(residue !== undefined, 'the kill left battle residue at the site');
    assert.ok(residue.intensity > 0.5, 'at an intensity the region can read');

    // The dual-SIG state: once nothing is being struck, rest volume — not the
    // 45 s of loud disengagement the shared ladder would give it.
    advance(match, 3);
    assert.equal(Acoustic.sig[hollow], 3, 'silent again, wherever it is in the ladder');
  });

  it('lunges at a gun that shoots it from outside its trigger — damage is a sound', () => {
    // docs/mission-intake.md §13's finding (#353): an Abyssal Submersible's
    // gun reaches 650 m, and against the Directorate's ×0.4 a cruising one is
    // heard at Commit inside 190 m, so a hull at 450 m rendered every Hollow
    // on a map for nothing. The first shell now springs the strike: the
    // Hollow commits toward the gun at strike loudness, covers the water at
    // 75 m/s, and bites — standing off is a choice with a cost.
    const match = emptyMatch(115);
    const hollow = spawnFauna(match.world, { species: FaunaSpecies.Hollow, x: 5000, y: 5000 });
    const depth = Position.depth[hollow]!;
    const gun = spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 0,
      faction: Faction.Directorate,
      x: 5450,
      y: 5000,
      depth,
    });
    const full = Health.hp[gun]!;
    const hollowFull = Health.hp[hollow]!;

    let sprung = false;
    let sigWhenSprung = 0;
    for (let i = 0; i < SIM.TICK_HZ * 10; i++) {
      match.update(STEP_MS);
      if (Fauna.stage[hollow] === FaunaStage.Committed) {
        sprung = true;
        sigWhenSprung = Acoustic.sig[hollow]!;
        break;
      }
    }
    assert.ok(sprung, 'the first shell springs the strike');
    assert.ok(Health.hp[hollow]! < hollowFull, 'and it was a shell that did it');
    assert.equal(sigWhenSprung, 60, 'at strike loudness');
    assert.equal(Fauna.targetEid[hollow], gun, 'toward the gun');

    advance(match, 2);
    assert.ok(Position.x[hollow]! > 5100, 'shot, the ambush is no longer the not-moving');
    advance(match, 8);
    assert.ok(Health.hp[gun]! < full, 'and 450 m of stand-off cost the hull a bite');
  });

  it('strikes the loudest thing it hears when shot, which need not be the gun', () => {
    // The file's one rule survives the wound: a Hollow coiled on a cruiser
    // idling 450 m west — heard at 54, Interest and not Commit, so inside the
    // trigger and not struck — is shot from 450 m east by a Directorate hull
    // it hears at well under half that, and goes for the cruiser. Shooting
    // an ambusher near somebody else's economy wakes it on that economy.
    const match = emptyMatch(116);
    const hollow = spawnFauna(match.world, { species: FaunaSpecies.Hollow, x: 5000, y: 5000 });
    const depth = Position.depth[hollow]!;
    const cruiser = spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      weaponsCold: true,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4550,
      y: 5000,
      depth,
    });
    advance(match, 2);
    assert.equal(Fauna.stage[hollow], FaunaStage.Interested, 'coiled on the cruiser, not struck');
    assert.equal(Fauna.targetEid[hollow], cruiser);

    spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 0,
      faction: Faction.Directorate,
      x: 5450,
      y: 5000,
      depth,
    });
    let sprung = false;
    for (let i = 0; i < SIM.TICK_HZ * 10; i++) {
      match.update(STEP_MS);
      if (Fauna.stage[hollow] === FaunaStage.Committed) {
        sprung = true;
        break;
      }
    }
    assert.ok(sprung, 'the shell springs it');
    assert.equal(Fauna.targetEid[hollow], cruiser, 'at the loudest thing it hears, not the gun');
    advance(match, 3);
    assert.ok(Position.x[hollow]! < 4900, 'west, toward the cruiser');
  });

  it('gives no hull and is not woken while a beat drives it', () => {
    // #349's rule holds ahead of #353's: a driven creature takes no weapon
    // damage, and a shell that took nothing is not a wound. Order matters in
    // the gun — the report comes after the hull is taken — and this pins it.
    const match = emptyMatch(117);
    const hollow = spawnFauna(match.world, { species: FaunaSpecies.Hollow, x: 5000, y: 5000 });
    const depth = Position.depth[hollow]!;
    Fauna.driven[hollow] = 1;
    spawnUnit(match.world, {
      kind: UnitKind.AbyssalSubmersible,
      slot: 0,
      faction: Faction.Directorate,
      x: 5450,
      y: 5000,
      depth,
    });
    advance(match, 5);
    assert.equal(Health.hp[hollow], Health.max[hollow], 'a driven creature gives no hull');
    assert.equal(
      Fauna.stage[hollow],
      FaunaStage.Ambient,
      'and a shell that took nothing woke nothing'
    );
    assert.equal(Acoustic.sig[hollow], 3);
    assert.ok(Math.hypot(Position.x[hollow]! - 5000, Position.y[hollow]! - 5000) < 1);
  });
});
