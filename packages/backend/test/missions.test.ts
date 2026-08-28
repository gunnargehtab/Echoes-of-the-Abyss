/**
 * The authored missions, against the documents that specify them (#190).
 *
 * `packages/shared/test/missions.test.ts` holds the *public* half of a mission
 * — the header a title screen may read before a socket exists. This file holds
 * the other half: the literal itself, which is hidden information and never
 * leaves the server. Nothing here steps a match, deliberately. A mission
 * literal is data in the idiom `sim/maps/` argues for, and the failures worth
 * catching in it are authoring failures — a beat out of order, a tag nobody
 * placed, a hull seated in rock — which are all visible by reading the table.
 *
 * The tests are written against what docs/mission-sorrowgate.md and
 * docs/campaign.md §10 *claim*, not against the numbers that happen to
 * implement them, and they are written over `MISSIONS` rather than over
 * Sorrowgate wherever the claim is a convention. §10's conventions apply to all
 * 29 missions and exactly one of them exists: the rule wants enforcing before
 * the other 28 are written, which is the same argument the shared suite makes
 * about the header.
 *
 * Two of these would otherwise fail silently rather than loudly, which is why
 * they are here at all: the runtime walks the beats with a cursor and would
 * skip one authored out of order without a word, and a role given to a scripted
 * hull would put another party inside a counter the player is shown.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  Biome,
  MISSION,
  SIM,
  missionHeaderById,
  requiredPressureRating,
  statsFor,
} from '@echoes/shared';
import { missionMapById, terrainFor } from '../src/sim/maps/index.ts';
import { MISSIONS, PROLOGUE_SORROWGATE } from '../src/sim/missions/index.ts';
import { DRIFT_SLOT } from '../src/sim/systems/fauna.ts';
import type { MissionDefinition } from '../src/sim/missions/index.ts';

/**
 * The Echo Layer's per-slot scratch arrays are this long (`echoLayer.ts`), and
 * it is a private constant there because nothing but a mission has ever seated
 * a slot the room did not. Transcribed rather than imported, so the day it is
 * exported this test is the thing that notices the two disagree.
 */
const MAX_SLOTS = 8;

/** Every tag a mission places in the water, unit and structure alike. */
function authoredTags(mission: MissionDefinition): Set<string> {
  const tags = new Set<string>();
  for (const party of mission.parties) {
    for (const unit of party.units) tags.add(unit.tag);
    for (const structure of party.structures ?? []) tags.add(structure.tag);
  }
  return tags;
}

/**
 * Every authored hull, structure and emitter, with the party that owns it.
 * Emitters are in here on purpose: they carry a tag, a position and a depth,
 * so the uniqueness, placement and ground-admission tests below hold them to
 * the same water as everything else the mission seats.
 */
function seated(mission: MissionDefinition) {
  return mission.parties.flatMap((party) =>
    [...party.units, ...(party.structures ?? []), ...(party.emitters ?? [])].map((thing) => ({
      party,
      thing,
    }))
  );
}

describe('the mission catalogue', () => {
  it('resolves by id, and every mission has the public header it extends', () => {
    // The literal spreads its own header, so this is not a tautology in the
    // way it looks: it catches a mission whose definition was written without
    // one, which would ship a mission the shell cannot list.
    for (const mission of MISSIONS) {
      assert.ok(missionHeaderById(mission.id) !== undefined, `${mission.id}: no public header`);
      assert.ok(mission.doc.length > 0, `${mission.id}: cites no document`);
      assert.ok(missionMapById(mission.mapId) !== undefined, `${mission.id}: map does not resolve`);
    }
  });

  it('gives every authored thing a unique tag', () => {
    // Tags are the runtime's only handle on the forces it placed — beats
    // address them, `heldUntil` is keyed on them, roles are sets of them. A
    // duplicate does not collide loudly; it silently means the second one.
    for (const mission of MISSIONS) {
      const all = seated(mission).map(({ thing }) => thing.tag);
      assert.equal(new Set(all).size, all.length, `${mission.id}: duplicate tag`);
    }
  });
});

describe('the parties a mission seats', () => {
  it('keeps every slot inside the Echo Layer and out of the Drift', () => {
    // A scripted party is never in `Match.slots` — the Echo Layer resolves
    // listeners and pingers by `Owner.slot` — so nothing else bounds these.
    // Past MAX_SLOTS a party would index off the end of the per-slot scratch;
    // on DRIFT_SLOT it would be handed to the fauna system as a creature.
    for (const mission of MISSIONS) {
      for (const party of mission.parties) {
        assert.ok(party.slot >= 0 && party.slot < MAX_SLOTS, `${mission.id}: slot ${party.slot}`);
        assert.notEqual(party.slot, DRIFT_SLOT, `${mission.id}: a delegation on the Drift's slot`);
      }
      const slots = mission.parties.map((party) => party.slot);
      assert.equal(new Set(slots).size, slots.length, `${mission.id}: two parties on one slot`);
    }
  });

  it('rates every authored hull for the depth it is authored at', () => {
    // A whole class of bug, and the quietest one this format can produce.
    //
    // The Commune's three hulls shipped as Light Scouts — PR 1, Shelf only —
    // standing at 1,450 m in the court's chamber. They took unhealable crush
    // from tick zero and were dead sixty seconds into a twenty-minute mission.
    // Nothing failed: their six `move` beats resolved to a missing tag and
    // no-opped, so §9's "the delegations take station" and "the delegations
    // scatter" simply did not happen, and Warden Teel delivered her line at
    // 10:40 from a delegation that had not been in the room for nine minutes.
    // Half the exchange the mission is about, absent, with a green suite.
    //
    // Checked against the authored rating rather than the roster's, because
    // the refit is exactly the thing that is easy to forget on one party.
    for (const mission of MISSIONS) {
      for (const party of mission.parties) {
        for (const unit of party.units) {
          const rating = unit.pressureRating ?? statsFor(unit.kind).pressureRating;
          const required = requiredPressureRating(unit.depthM);
          assert.ok(
            rating >= required,
            `${mission.id}: "${unit.tag}" is authored at ${unit.depthM} m, which needs ` +
              `PR ${required}, and is rated PR ${rating} — it dies of crush where it stands`
          );
        }
      }
    }
  });

  it('keeps the court out of the water it lends from', () => {
    // docs/mission-sorrowgate.md §2 and §5: the court is not a party. Its slot
    // exists so that withdrawing the array has somewhere to withdraw it *to* —
    // `aurasSystem` grants by owner, so the withdrawal is one write. A party
    // seated there would be a navy the court does not have, and would take the
    // array's grant with it.
    for (const mission of MISSIONS) {
      assert.notEqual(mission.playerSlot, mission.courtSlot, `${mission.id}: the court is a party`);
      assert.ok(
        mission.parties.every((party) => party.slot !== mission.courtSlot),
        `${mission.id}: something is seated on the court's slot`
      );
      assert.ok(
        mission.parties.some((party) => party.slot === mission.playerSlot),
        `${mission.id}: nobody is seated on the player's slot`
      );
    }
  });

  it('gives a role to the player and to nobody else', () => {
    // This is the whole information-safety story of the predicate union, as an
    // assertion. Predicates address a *role*, never a tag, so a role is the
    // only route from an objective counter to a hull — and a role on a scripted
    // hull would put another party's position inside a number the player is
    // shown. `missionSafety.test.ts` asserts the union cannot name a party;
    // this asserts the data never tries.
    for (const mission of MISSIONS) {
      for (const party of mission.parties) {
        if (party.slot === mission.playerSlot) continue;
        for (const unit of party.units) {
          assert.equal(
            unit.role,
            undefined,
            `${mission.id}: ${unit.tag} is scripted and carries the role "${unit.role}"`
          );
        }
      }
    }
  });

  it('lends the array from the player, since that is the only slot an aura grants to', () => {
    for (const mission of MISSIONS) {
      const owner = mission.parties.find((party) =>
        (party.structures ?? []).some((structure) => structure.tag === mission.arrayTag)
      );
      assert.ok(owner !== undefined, `${mission.id}: arrayTag "${mission.arrayTag}" is not placed`);
      assert.equal(owner.slot, mission.playerSlot, `${mission.id}: the array is not the player's`);
    }
  });
});

describe('a mission is seated in water the map actually has', () => {
  it('places every authored hull and structure inside its own map', () => {
    for (const mission of MISSIONS) {
      const map = missionMapById(mission.mapId)!;
      for (const { thing } of seated(mission)) {
        assert.ok(
          thing.x >= 0 && thing.x <= map.widthM && thing.y >= 0 && thing.y <= map.heightM,
          `${mission.id}: ${thing.tag} at ${thing.x},${thing.y} is off the map`
        );
      }
      for (const marker of mission.markers) {
        assert.ok(
          marker.x >= 0 && marker.x <= map.widthM && marker.y >= 0 && marker.y <= map.heightM,
          `${mission.id}: marker ${marker.id} is off the map`
        );
      }
      for (const beat of mission.beats) {
        if (beat.kind !== 'move') continue;
        assert.ok(
          beat.x >= 0 && beat.x <= map.widthM && beat.y >= 0 && beat.y <= map.heightM,
          `${mission.id}: a beat sends ${beat.tag} to ${beat.x},${beat.y}, off the map`
        );
      }
    }
  });

  it('seats every hull at a depth the ground there admits', () => {
    // `admits` and not `floorAt`, for the reason terrain.ts gives: the Service
    // Lock is roofed, so "is this deep enough" is the wrong question and would
    // pass a hull authored inside the roof. A hull placed in rock does not
    // error — it spawns, and then cannot move, because `resolveStep` refuses
    // every step out of ground that does not admit it. Silent, and fatal to a
    // tender that has to reach the Concourse.
    for (const mission of MISSIONS) {
      const terrain = terrainFor(missionMapById(mission.mapId)!);
      for (const { thing } of seated(mission)) {
        assert.ok(
          terrain.admits(thing.x, thing.y, thing.depthM),
          `${mission.id}: ${thing.tag} sits at ${thing.depthM}m over ground whose floor is ` +
            `${terrain.floorAt(thing.x, thing.y)}m and whose ceiling is ` +
            `${terrain.ceilingAt(thing.x, thing.y)}m`
        );
      }
      for (const beat of mission.beats) {
        if (beat.kind !== 'creature' || beat.spawnAt === undefined) continue;
        assert.ok(
          terrain.admits(beat.spawnAt.x, beat.spawnAt.y, beat.spawnAt.depthM),
          `${mission.id}: ${beat.tag} is spawned into ground that does not admit it`
        );
      }
    }
  });
});

describe('the beat schedule', () => {
  it('is authored in ascending order, because the runtime walks it with a cursor', () => {
    // `fireDueBeats` advances a cursor while `beats[cursor].atTick <= tick`, so
    // a beat authored earlier than the one above it is never fired at all — and
    // nothing says so. The transit would simply not happen, and the mission
    // would play as a quiet twenty minutes with an epilogue on the end.
    for (const mission of MISSIONS) {
      for (let i = 1; i < mission.beats.length; i++) {
        const previous = mission.beats[i - 1]!;
        const beat = mission.beats[i]!;
        assert.ok(
          beat.atTick >= previous.atTick,
          `${mission.id}: beat ${i} (${beat.kind}) is at ${beat.atTick}, behind ${previous.atTick}`
        );
      }
      assert.ok(
        mission.beats.every((beat) => beat.atTick >= 0),
        `${mission.id}: a beat is authored before the match starts`
      );
    }
  });

  it('names only things the mission actually placed', () => {
    // The one exception is a creature, which a beat spawns rather than seats —
    // so the first beat naming a creature tag has to carry the species and the
    // spawn point, or it addresses nothing and the colossus never arrives.
    for (const mission of MISSIONS) {
      const placed = authoredTags(mission);
      const spawnedByBeat = new Set<string>();
      for (const beat of mission.beats) {
        if (beat.kind === 'creature') {
          if (placed.has(beat.tag) || spawnedByBeat.has(beat.tag)) continue;
          assert.ok(
            beat.spawnAt !== undefined && beat.species !== undefined,
            `${mission.id}: the first beat for "${beat.tag}" neither places it nor spawns it`
          );
          spawnedByBeat.add(beat.tag);
          continue;
        }
        if (beat.kind === 'objective') {
          assert.ok(
            mission.objectives.some((objective) => objective.id === beat.id),
            `${mission.id}: a beat sets objective "${beat.id}", which is not authored`
          );
          continue;
        }
        if (beat.kind === 'ground') {
          // A ground beat names a region rather than a hull, and a region the
          // map does not have would silently do nothing at runtime — the
          // arch would simply never fall, and the mission would still finish.
          assert.ok(
            mission.regions.some((region) => region.id === beat.region),
            `${mission.id}: a ground beat names region "${beat.region}", which is not authored`
          );
          assert.ok(
            beat.floorM !== undefined || beat.ceilingM !== undefined,
            `${mission.id}: a ground beat on "${beat.region}" writes neither floor nor ceiling`
          );
          continue;
        }
        if (beat.kind === 'resolve' || beat.kind === 'say') continue;
        assert.ok(
          placed.has(beat.tag) || spawnedByBeat.has(beat.tag),
          `${mission.id}: a ${beat.kind} beat names "${beat.tag}", which nothing places`
        );
      }
    }
  });

  it('releases only hulls that are actually held', () => {
    // A release beat for a tag with no `releaseTick` is a no-op that reads like
    // a rule; a held hull with no release beat never moves at all.
    for (const mission of MISSIONS) {
      const held = new Set(
        mission.parties.flatMap((party) =>
          party.units.filter((unit) => unit.releaseTick !== undefined).map((unit) => unit.tag)
        )
      );
      const released = new Set(
        mission.beats.filter((beat) => beat.kind === 'release').map((beat) => beat.tag)
      );
      assert.deepEqual(
        [...held].sort(),
        [...released].sort(),
        `${mission.id}: the held hulls and the release beats disagree`
      );
      for (const party of mission.parties) {
        for (const unit of party.units) {
          if (unit.releaseTick === undefined) continue;
          const beat = mission.beats.find(
            (candidate) => candidate.kind === 'release' && candidate.tag === unit.tag
          );
          assert.equal(
            beat?.atTick,
            unit.releaseTick,
            `${mission.id}: ${unit.tag} is held to ${unit.releaseTick} and released elsewhere`
          );
        }
      }
    }
  });
});

describe('docs/campaign.md §10, over every mission there will ever be', () => {
  it('gives the player at least sixty seconds of something audible before it closes', () => {
    // §10: "No mission fails on a timer alone; every failure state is something
    // the player can hear coming for at least sixty seconds." A prose rule of
    // this shape has exactly one enforceable reading — the gap between the last
    // loud beat and the beat that ends the mission — and this is it. Sorrowgate
    // pays it five and a half times over, with the second calling voice at
    // 14:30 against a resolve at 20:00, and §8 says why: ninety seconds of
    // warning against a sixty-second requirement, delivered twice.
    for (const mission of MISSIONS) {
      const resolve = mission.beats.find((beat) => beat.kind === 'resolve');
      assert.ok(resolve !== undefined, `${mission.id}: nothing ever closes the mission`);
      const loud = mission.beats.filter((beat) => beat.kind === 'creature' && beat.loud);
      assert.ok(loud.length > 0, `${mission.id}: the close is a timer and nothing else`);
      const last = loud[loud.length - 1]!;
      const leadS = (resolve.atTick - last.atTick) / SIM.TICK_HZ;
      assert.ok(
        leadS >= MISSION.FAILURE_TELEGRAPH_S,
        `${mission.id}: ${leadS.toFixed(0)}s between the last loud beat and the close, ` +
          `against §10's ${MISSION.FAILURE_TELEGRAPH_S}s`
      );
    }
  });

  it('closes inside the length band its own header advertises', () => {
    // The header's band is public and the resolve beat is not, so these two are
    // free to drift apart — and a twenty-minute mission listed as twelve is a
    // promise broken on the entry that offered it.
    for (const mission of MISSIONS) {
      const resolve = mission.beats.find((beat) => beat.kind === 'resolve')!;
      const closesAtS = resolve.atTick / SIM.TICK_HZ;
      const [low, high] = mission.lengthBandS;
      assert.ok(
        closesAtS >= low && closesAtS <= high,
        `${mission.id}: closes at ${closesAtS}s, outside its advertised ${low}–${high}s`
      );
    }
  });

  it('reveals nothing before the beat that hands it over', () => {
    // An objective the player has not been given is an absence rather than a
    // status (`types.ts`), so a reveal without a beat behind it is a rule the
    // court states before the thing it is about has happened — Tender Two's
    // reading names a gate that is still shut.
    for (const mission of MISSIONS) {
      for (const objective of mission.objectives) {
        if (objective.revealAtTick === undefined) continue;
        assert.ok(
          mission.beats.some((beat) => beat.atTick === objective.revealAtTick),
          `${mission.id}: "${objective.id}" appears at ${objective.revealAtTick} with no beat there`
        );
      }
    }
  });
});

describe('the objectives', () => {
  it('names a region and a marker that exist', () => {
    // `progressOf` answers `0 of n` for a region it cannot resolve, which is
    // indistinguishable from an objective the player has not achieved yet: an
    // extract objective pointed at a misspelt region reads as a mission being
    // failed rather than as a mission that is broken.
    for (const mission of MISSIONS) {
      const regions = new Set(mission.regions.map((region) => region.id));
      const markers = new Set(mission.markers.map((marker) => marker.id));
      for (const objective of mission.objectives) {
        if (objective.predicate.kind === 'extract') {
          assert.ok(
            regions.has(objective.predicate.region),
            `${mission.id}: "${objective.id}" extracts to region ` +
              `"${objective.predicate.region}", which is not authored`
          );
        }
        if (objective.markerId !== undefined) {
          assert.ok(
            markers.has(objective.markerId),
            `${mission.id}: "${objective.id}" points at marker "${objective.markerId}"`
          );
        }
        assert.ok(objective.text.trim().length > 0, `${mission.id}: "${objective.id}" is unnamed`);
      }
      const ids = mission.objectives.map((objective) => objective.id);
      assert.equal(new Set(ids).size, ids.length, `${mission.id}: duplicate objective id`);
    }
  });

  it('names every marker it authors from at least one objective', () => {
    // The other half of the rule above, and the half `projectMissionView`
    // depends on. A marker ships to the client only while an objective naming
    // it is revealed — that is how the Upper Concourse stays off the wire
    // until the court opens the gate — so a marker no objective ever names is
    // not merely untidy, it is authored and then never sent. Caught here,
    // where the author is looking, rather than in a playthrough where the
    // symptom is a marker that silently does not exist.
    for (const mission of MISSIONS) {
      const named = new Set(
        mission.objectives
          .map((objective) => objective.markerId)
          .filter((id): id is string => id !== undefined)
      );
      for (const marker of mission.markers) {
        assert.ok(
          named.has(marker.id),
          `${mission.id}: marker "${marker.id}" is authored and no objective names it, ` +
            `so it would never reach the client`
        );
      }
    }
  });

  it('asks for no more hulls in a role than the mission places', () => {
    // A count above the roster is unreachable, and unreachable in the quietest
    // possible way: the counter simply never fills.
    for (const mission of MISSIONS) {
      for (const objective of mission.objectives) {
        const predicate = objective.predicate;
        if (predicate.kind !== 'extract' && predicate.kind !== 'survive') continue;
        const inRole = mission.parties
          .filter((party) => party.slot === mission.playerSlot)
          .flatMap((party) => party.units)
          .filter((unit) => unit.role === predicate.role).length;
        assert.ok(
          predicate.count <= inRole,
          `${mission.id}: "${objective.id}" wants ${predicate.count} of role ` +
            `"${predicate.role}", and the mission places ${inRole}`
        );
      }
    }
  });

  it('rigs every lift to a player-party hull, in a region that exists', () => {
    // The loaded set feeds a predicate the player is shown, so a lift's
    // carrier is held to the roles' rule: player-party hulls only, or another
    // party ends up inside a counter (types.ts, `MissionLift`). The region
    // check is `progressOf`'s reason restated — a cut pointed at a misspelt
    // region never runs, which reads as a mission being failed rather than as
    // a mission that is broken. And the meter is 0-100, so a cut outside it
    // is authored loudness the acoustics clamp would silently rewrite.
    for (const mission of MISSIONS) {
      const regions = new Set(mission.regions.map((region) => region.id));
      const playerTags = new Set(
        mission.parties
          .filter((party) => party.slot === mission.playerSlot)
          .flatMap((party) => party.units.map((unit) => unit.tag))
      );
      const lifts = mission.lifts ?? [];
      const ids = lifts.map((lift) => lift.id);
      assert.equal(new Set(ids).size, ids.length, `${mission.id}: duplicate lift id`);
      for (const lift of lifts) {
        assert.ok(
          playerTags.has(lift.tag),
          `${mission.id}: lift "${lift.id}" rides "${lift.tag}", which is not a player hull`
        );
        assert.ok(
          regions.has(lift.region),
          `${mission.id}: lift "${lift.id}" cuts in region "${lift.region}", which is not authored`
        );
        assert.ok(
          Number.isInteger(lift.cutTicks) && lift.cutTicks >= 0,
          `${mission.id}: lift "${lift.id}" cuts for ${lift.cutTicks} ticks`
        );
        assert.ok(
          lift.cutSig >= 0 && lift.cutSig <= 100,
          `${mission.id}: lift "${lift.id}" cuts at ${lift.cutSig}, outside the meter`
        );
      }
    }
  });

  it('authors every emitter off the player party, on a workable pattern', () => {
    // The Echo Layer's pair loop skips listener and emitter on one slot, so an
    // emitter on the player's own party is a beacon its audience can never
    // hear — authored, and then silent for exactly the player it exists for.
    // The pattern bounds are the acoustics contract: a zero period is a NaN
    // modulo, a zero on-window never strikes, an on-window past the period is
    // just "always on" wearing a pattern's clothes, and the meter is 0-100.
    for (const mission of MISSIONS) {
      const lifts = new Set((mission.lifts ?? []).map((lift) => lift.id));
      for (const party of mission.parties) {
        for (const emitter of party.emitters ?? []) {
          assert.notEqual(
            party.slot,
            mission.playerSlot,
            `${mission.id}: emitter "${emitter.tag}" is on the player's party, ` +
              'which is the one slot that can never hear it'
          );
          assert.ok(
            Number.isInteger(emitter.periodTicks) && emitter.periodTicks >= 1,
            `${mission.id}: emitter "${emitter.tag}" strikes on a ${emitter.periodTicks}-tick period`
          );
          assert.ok(
            Number.isInteger(emitter.onTicks) &&
              emitter.onTicks >= 1 &&
              emitter.onTicks <= emitter.periodTicks,
            `${mission.id}: emitter "${emitter.tag}" is loud ${emitter.onTicks} of ` +
              `${emitter.periodTicks} ticks`
          );
          assert.ok(
            emitter.sig > 0 && emitter.sig <= 100,
            `${mission.id}: emitter "${emitter.tag}" strikes at ${emitter.sig}, outside the meter`
          );
          assert.ok(emitter.hp >= 1, `${mission.id}: emitter "${emitter.tag}" has no hull to lose`);
          if (emitter.silencedByLift !== undefined) {
            assert.ok(
              lifts.has(emitter.silencedByLift),
              `${mission.id}: emitter "${emitter.tag}" is silenced by lift ` +
                `"${emitter.silencedByLift}", which is not authored`
            );
          }
        }
      }
    }
  });

  it('gates an extract on loads only where the mission authors some', () => {
    // `loaded: true` against a mission with no lifts is a counter that can
    // never fill — the quiet unreachability the count-versus-roster test
    // above exists to catch, in its newest form.
    for (const mission of MISSIONS) {
      for (const objective of mission.objectives) {
        const predicate = objective.predicate;
        if (predicate.kind !== 'extract' || predicate.loaded !== true) continue;
        assert.ok(
          (mission.lifts ?? []).length >= predicate.count,
          `${mission.id}: "${objective.id}" counts ${predicate.count} loads and the mission ` +
            `authors ${(mission.lifts ?? []).length} lifts`
        );
      }
    }
  });

  it('has something terminal to close on, and an epilogue for every outcome', () => {
    for (const mission of MISSIONS) {
      assert.ok(
        mission.objectives.some((objective) => objective.terminal === true),
        `${mission.id}: nothing terminal, so the count has nothing to read`
      );
      for (const reading of Object.values(mission.epilogue)) {
        assert.ok(reading.trim().length > 0, `${mission.id}: an outcome has no reading`);
      }
    }
  });
});

describe('Sorrowgate, as docs/mission-sorrowgate.md states it', () => {
  it('makes the SIG budget and the silence order the same number', () => {
    // §9, verbatim: "The budget and the silence order are the same number, and
    // that is the point." This is the one mission in the campaign where §10's
    // budget is a rule the player can feel rather than a note in the margin, so
    // the two being equal is the design rather than a coincidence — and if a
    // later tuning pass moves one, it has to move the other or say why.
    assert.equal(PROLOGUE_SORROWGATE.sigBudget, PROLOGUE_SORROWGATE.silenceCeilingSig);
    assert.equal(PROLOGUE_SORROWGATE.sigBudget, 20, '§4 and §9 both say twenty');
  });

  it('holds the two tenders to the loads at 11:20 and 13:40', () => {
    // §9's beat table. The tenders are the mission, and the times they are
    // loaded are what makes the player choose between them (§8): the flight
    // cannot be in both places, and the gap between the two loads is where
    // that decision is paid for.
    const tenders = PROLOGUE_SORROWGATE.parties
      .find((party) => party.slot === PROLOGUE_SORROWGATE.playerSlot)!
      .units.filter((unit) => unit.role === 'tender');
    assert.equal(tenders.length, 2, '§8: two tenders, and you cannot be in both places');
    assert.deepEqual(
      tenders.map((tender) => tender.releaseTick),
      [(11 * 60 + 20) * SIM.TICK_HZ, (13 * 60 + 40) * SIM.TICK_HZ]
    );
    // §5: fourteen people, nine and five. The count is what the court reads out
    // at the close, so it is authored per hull rather than derived from one.
    assert.deepEqual(
      tenders.map((tender) => tender.souls),
      [9, 5]
    );
    assert.equal(
      tenders.reduce((total, tender) => total + (tender.souls ?? 0), 0),
      14,
      'the record is fourteen people'
    );
  });

  it('refits the flight to Mid-Water and leaves the roster alone', () => {
    // §3: PR 2 "by refit". The refit is a mission fact and never a roster fact
    // — the Light Scout everybody else fields is unchanged — and it is what
    // makes depth a floor in this mission rather than a bleed: there is water
    // under the gate the court's hulls cannot enter, and they never take crush
    // attrition to learn it.
    const escorts = PROLOGUE_SORROWGATE.parties
      .find((party) => party.slot === PROLOGUE_SORROWGATE.playerSlot)!
      .units.filter((unit) => unit.role === 'escort');
    assert.equal(escorts.length, 4, '§3: four escort craft');
    for (const escort of escorts) {
      assert.equal(escort.pressureRating, 2, `${escort.tag}: the court refit is PR-2`);
    }
    // The Commit needs PR-3 and the refit stops at 2, so the basin is out of
    // reach by the numbers rather than by a rule anybody has to remember. It is
    // the map's only Abyssal Trench, which is also how the ping got down there.
    const map = missionMapById(PROLOGUE_SORROWGATE.mapId)!;
    const commit = map.regions.filter((region) => region.biome === Biome.AbyssalTrench);
    assert.equal(commit.length, 1, '§11: one basin, and the city committed its dead into it');
    assert.ok(
      (commit[0]!.floorM ?? map.floorM ?? 0) > (map.floorM ?? 0),
      '§11: the basin runs deeper than the city above it'
    );
  });

  it('withholds the three prohibitions §3 reads as three', () => {
    // §3: no weapon, no countermeasure, no transmit — and the third is the one
    // that makes the mission's central event something the player cannot answer.
    // Every lock carries its reason, because docs/ui-ux.md greys an affordance
    // out *with the reason attached*: the court does not disable a thing
    // quietly, it strikes the hardpoints in front of everybody.
    const locked = new Set(PROLOGUE_SORROWGATE.locks.map((lock) => lock.ability));
    for (const ability of [
      'weapons',
      'torpedoes',
      'mines',
      'depthCharges',
      'noisemakers',
      'activeSonar',
    ] as const) {
      assert.ok(locked.has(ability), `§3 strikes ${ability} and the literal does not`);
    }
    for (const lock of PROLOGUE_SORROWGATE.locks) {
      assert.ok(lock.reason.trim().length > 0, `${lock.ability} is refused without a reason`);
    }
  });

  it('reads the court adjourning at twenty minutes, and every outcome in register', () => {
    const resolve = PROLOGUE_SORROWGATE.beats.find((beat) => beat.kind === 'resolve')!;
    assert.equal(resolve.atTick, 20 * 60 * SIM.TICK_HZ, '§9: 20:00, the court adjourns');
    // §8's Results table. The strings are the court's reading of a count, not a
    // score — asserted by their opening words so a rewrite in the document is
    // felt here rather than absorbed silently.
    assert.match(PROLOGUE_SORROWGATE.epilogue[0], /^Fourteen out\./);
    // Names no number on purpose: either tender may be the one that gets
    // through, so the court reads what it took rather than a count it did not.
    assert.match(PROLOGUE_SORROWGATE.epilogue[1], /^One tender is through\./);
    assert.match(PROLOGUE_SORROWGATE.epilogue[2], /^The gate is closed\. Fourteen are behind it\./);
  });
});
