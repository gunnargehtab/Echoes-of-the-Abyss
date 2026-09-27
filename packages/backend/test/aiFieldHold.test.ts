/**
 * The Dredge holds the crystal field (#703) — docs/units.md, the Dredge.
 *
 * "The hull for the floor of the map. The crystal field sits at 2,400 m and
 * every navy raids it; the Directorate is meant to *hold* it." `hold` and
 * `followFloor` were two of the three client messages `AiUnbuilt` listed, and
 * #703's second criterion is that neither is built without a rule that spends
 * it and a test that shows it spent — the shape `aiCountermeasures.test.ts`
 * sets. This file is that test, and it holds four things:
 *
 *   - the verbs reach the simulation, through the seat and the same
 *     `Match.orderFollowFloor` and `Match.orderHold` a player's messages reach;
 *   - the hold is load-bearing rather than decoration: the same ordered
 *     target is chased by a hull that is not held and waited for by one that
 *     is, which is the whole of what the verb buys a hull that is already
 *     stopped;
 *   - the order of operations — floor from the claim, hold only on the post,
 *     and the attack after the hold, never before it;
 *   - what the holder is ordered on: a classified hull at the node, a hauler
 *     first, and never a hull merely passing over the field at cruise depth.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AiDifficulty,
  Faction,
  ResolutionTier,
  ResourceKind,
  SIM,
  StructureKind,
  UnitKind,
  statsFor,
  type Contact,
  type EchoSnapshot,
  type OwnUnit,
  type ResourceNodeInfo,
} from '@echoes/shared';
import { AiCommander } from '../src/ai/commander.ts';
import { AiSeat, briefingFor } from '../src/ai/seat.ts';
import type { AiBriefing, AiCommand } from '../src/ai/types.ts';
import { Match } from '../src/sim/match.ts';
import { spawnUnit } from '../src/sim/world.ts';
import { DepthOrder, Health, Position, Posture, Weapon } from '../src/sim/components.ts';

const SEED = 0x703;
const STEP_MS = 1000 / SIM.TICK_HZ;
const ECHO_EVERY = SIM.TICK_HZ / SIM.ECHO_HZ;

function briefing(faction = Faction.Directorate): AiBriefing {
  const match = new Match(undefined, { fauna: false, seed: SEED });
  match.addPlayer(0, Faction.Bathyarch);
  match.addPlayer(1, faction);
  return briefingFor(match, 1, faction, AiDifficulty.Veteran);
}

/** The default map's crystal field — dead centre, and 2,400 m down. */
function crystalOf(nodes: readonly ResourceNodeInfo[]): ResourceNodeInfo {
  const field = nodes.find((n) => n.kind === ResourceKind.ResonanceCrystal);
  assert.ok(field !== undefined, 'the default map has a crystal field');
  return field;
}

function hull(
  id: number,
  kind: UnitKind,
  at: { x: number; y: number },
  extra: Partial<OwnUnit> = {}
): OwnUnit {
  const stats = statsFor(kind);
  return {
    id,
    kind,
    x: at.x,
    y: at.y,
    depth: 600,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    heading: 0,
    sig: stats.sigIdle,
    silentRunning: false,
    engineOff: false,
    pressureBonus: 0,
    unhealableDamage: 0,
    ...extra,
  };
}

/** A classified enemy hull, as the Echo Layer reports one at Tier 3. */
function enemy(id: number, kind: UnitKind, at: { x: number; y: number }, depth: number): Contact {
  return {
    id,
    tier: ResolutionTier.Classification,
    x: at.x,
    y: at.y,
    depth,
    kind,
    faction: Faction.Bathyarch,
    tick: 6000,
  };
}

function snapshot(units: OwnUnit[], overrides: Partial<EchoSnapshot> = {}): EchoSnapshot {
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
        depth: 600,
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
    refits: [],
    nodules: 0,
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

/** Commands naming `id`, in the order the commander emitted them. */
function forHull(commands: readonly AiCommand[], id: number): AiCommand[] {
  return commands.filter((c) =>
    'unitIds' in c ? c.unitIds.includes(id) : 'unitId' in c && c.unitId === id
  );
}

describe('the Dredge holds the crystal field (#703)', () => {
  it('reaches the simulation through the seat: on the floor, and held', () => {
    // The end-to-end arm. A real match, a real `AiSeat`, and a Dredge already
    // standing over the field at the depth it was built at — so the only way
    // the mode and the posture get set is the seat translating what the
    // commander said into the two `Match` methods a player's messages reach.
    const match = new Match(undefined, { fauna: false, seed: SEED });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Directorate);
    const seat = new AiSeat(
      match,
      briefingFor(match, 1, Faction.Directorate, AiDifficulty.Veteran)
    );
    const field = crystalOf(match.resourceNodes);
    const dredge = spawnUnit(match.world, {
      kind: UnitKind.Dredge,
      slot: 1,
      faction: Faction.Directorate,
      x: field.x,
      y: field.y,
    });
    assert.equal(DepthOrder.follow[dredge], 0, 'the premise: built with no standing order');
    assert.equal(Posture.hold[dredge], 0, 'the premise: built unheld');

    for (let i = 0; i < ECHO_EVERY * 4; i++) {
      const own = match.update(STEP_MS)?.get(1);
      if (own !== undefined) seat.observe(own);
    }
    assert.equal(DepthOrder.follow[dredge], 1, 'the commander put its Dredge on the floor');
    assert.equal(Posture.hold[dredge], 1, 'and, standing on the field, held it there');

    // And the floor is where it goes: the mode retargets to the local seabed
    // less its clearance, which on this map is deeper than the node itself.
    const floor = match.world.terrain.floorAt(field.x, field.y);
    for (let i = 0; i < SIM.TICK_HZ * 60; i++) {
      const own = match.update(STEP_MS)?.get(1);
      if (own !== undefined) seat.observe(own);
    }
    assert.ok(
      Position.depth[dredge]! > field.depth,
      `the Dredge is at ${Position.depth[dredge]} m, above a node at ${field.depth} m`
    );
    assert.ok(Position.depth[dredge]! < floor, 'and above the ground, not in it');
  });

  it('waits for a target it was ordered on where an unheld hull chases it', () => {
    // What the hold is *for*, measured in the simulation rather than asserted
    // about the commander. Two Dredges on the field, one held and one not,
    // each ordered on the same raider — which then leaves. An attack order
    // chases for as long as its target runs (`combat.ts`), so the unheld hull
    // is towed off the node; the held one keeps the order and stays.
    const match = new Match(undefined, { fauna: false, seed: SEED });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Directorate);
    const field = crystalOf(match.resourceNodes);
    const held = spawnUnit(match.world, {
      kind: UnitKind.Dredge,
      slot: 1,
      faction: Faction.Directorate,
      x: field.x,
      y: field.y - 60,
      depth: field.depth,
    });
    const free = spawnUnit(match.world, {
      kind: UnitKind.Dredge,
      slot: 1,
      faction: Faction.Directorate,
      x: field.x,
      y: field.y + 60,
      depth: field.depth,
    });
    const raider = spawnUnit(match.world, {
      kind: UnitKind.Harvester,
      slot: 0,
      faction: Faction.Bathyarch,
      x: field.x + 300,
      y: field.y,
      depth: field.depth,
    });
    // Built not to die. Two Dredges and the crush at 2,400 m kill a real
    // hauler in under ten seconds, and a dead target is chased by nobody —
    // the thing measured here is who follows it, not whether it survives.
    Health.max[raider] = 1e6;
    Health.hp[raider] = 1e6;

    // Let the Directorate hear it: the Dredge's ears at 300 m.
    let handle: number | undefined;
    for (let i = 0; i < SIM.TICK_HZ * 10 && handle === undefined; i++) {
      const own = match.update(STEP_MS)?.get(1);
      handle = own?.contacts.find(
        (c) => c.tier >= ResolutionTier.Classification && c.kind === UnitKind.Harvester
      )?.id;
    }
    assert.ok(handle !== undefined, 'the raider was never classified from 300 m');

    match.orderHold(1, held, true);
    match.orderAttackContact(1, held, handle);
    match.orderAttackContact(1, free, handle);
    assert.equal(Weapon.orderedTargetEid[held], raider, 'the premise: both are ordered on it');
    assert.equal(Weapon.orderedTargetEid[free], raider);

    // The raider runs east, well out of the gun's 650 m.
    match.orderMove(0, raider, field.x + 3000, field.y);
    for (let i = 0; i < SIM.TICK_HZ * 40; i++) match.update(STEP_MS);

    const moved = (eid: number, fromY: number) =>
      Math.hypot(Position.x[eid]! - field.x, Position.y[eid]! - fromY);
    assert.ok(moved(free, field.y + 60) > 300, 'the positive control: an unheld hull chases');
    assert.ok(
      moved(held, field.y - 60) < 5,
      `the held Dredge left its post by ${moved(held, field.y - 60).toFixed(0)} m`
    );
    assert.equal(Weapon.orderedTargetEid[held], raider, 'and the held order still stands');
  });

  it('floors the Dredge from the claim, walks it out, and holds only on the post', () => {
    const brief = briefing();
    const field = crystalOf(brief.nodes);
    const home = brief.spawns[brief.slot]!;
    const dredge = hull(71, UnitKind.Dredge, home);

    const walking = new AiCommander(brief).observe(snapshot([dredge]));
    const said = forHull(walking, 71);
    assert.ok(
      said.some((c) => c.kind === 'followFloor' && c.active),
      'the floor is ordered at the claim, so the walk out goes under the layer'
    );
    const move = said.find((c) => c.kind === 'move');
    assert.ok(move?.kind === 'move', 'the Dredge is walked');
    assert.ok(Math.hypot(move.x - field.x, move.y - field.y) < 1, 'to the field itself');
    assert.ok(
      !said.some((c) => c.kind === 'hold' || c.kind === 'attack'),
      'nothing is held or ordered on while it is still walking'
    );

    // The mode came back on the hull: it is not asked for twice.
    const floored = { ...dredge, followFloor: true };
    const again = forHull(new AiCommander(brief).observe(snapshot([floored])), 71);
    assert.ok(!again.some((c) => c.kind === 'followFloor'), 'the standing order is not re-sent');

    // On the post: held, and nothing else asked of it with nobody there.
    const posted = { ...floored, x: field.x + 40, y: field.y, depth: 2570 };
    const onPost = forHull(new AiCommander(brief).observe(snapshot([posted])), 71);
    assert.deepEqual(
      onPost.map((c) => c.kind),
      ['hold'],
      'standing on the field, the Dredge is held and nothing more'
    );
  });

  it('keeps the holder out of the army, and sends a second Dredge with it', () => {
    // One holder, the lowest id. The rest of the navy masses at the rally as
    // it did — including a second Dredge, which is a line hull like any other.
    const brief = briefing();
    const home = brief.spawns[brief.slot]!;
    const commander = new AiCommander(brief);
    const units = [
      hull(71, UnitKind.Dredge, home, { followFloor: true }),
      hull(72, UnitKind.Dredge, home),
      hull(73, UnitKind.Corvette, home),
    ];
    const commands = commander.observe(snapshot(units));
    const rally = commands.find((c) => c.kind === 'move' && c.unitIds.includes(73));
    assert.ok(rally?.kind === 'move', 'the army is walked to the rally');
    assert.ok(rally.unitIds.includes(72), 'with the second Dredge in it');
    assert.ok(!rally.unitIds.includes(71), 'and without the holder');
    assert.ok(
      !commands.some((c) => c.kind === 'followFloor' && c.unitIds.includes(72)),
      'only the holder is put on the floor'
    );
  });

  it('orders the held Dredge on a raiding hauler, after the hold, and only once', () => {
    const brief = briefing();
    const field = crystalOf(brief.nodes);
    const commander = new AiCommander(brief);
    const posted = hull(71, UnitKind.Dredge, field, { followFloor: true, depth: 2570 });
    // The escort is nearer the Dredge; the hauler is what is taking the crystal.
    const escort = enemy(5, UnitKind.Corvette, { x: field.x + 150, y: field.y }, field.depth);
    const hauler = enemy(6, UnitKind.Harvester, { x: field.x - 400, y: field.y }, field.depth);

    const first = forHull(
      commander.observe(snapshot([posted], { contacts: [escort, hauler] })),
      71
    );
    assert.deepEqual(
      first.map((c) => c.kind),
      ['hold', 'attack'],
      'held first: the seat applies these in order, and an unheld attack is a chase'
    );
    const attack = first[1]!;
    assert.ok(attack.kind === 'attack' && attack.contactId === hauler.id, 'on the hauler');

    // Next decision, same water: the order stands and is not given again.
    const heldNow = { ...posted, holding: true };
    let later: AiCommand[] = [];
    for (let i = 0; i < 3; i++) {
      later = commander.observe(snapshot([heldNow], { contacts: [escort, hauler] }));
    }
    assert.equal(forHull(later, 71).length, 0, 'an order that stands is not re-sent');

    // The hauler gone, the escort is the target — a new order for a new one.
    for (let i = 0; i < 3; i++) {
      later = commander.observe(snapshot([heldNow], { contacts: [escort] }));
    }
    const next = forHull(later, 71);
    assert.equal(next.length, 1);
    assert.ok(next[0]!.kind === 'attack' && next[0]!.contactId === escort.id);
  });

  it('orders nothing on what is not a classified hull at the node', () => {
    const brief = briefing();
    const field = crystalOf(brief.nodes);
    const posted = hull(71, UnitKind.Dredge, field, {
      followFloor: true,
      holding: true,
      depth: 2570,
    });
    const overhead = enemy(7, UnitKind.Corvette, { x: field.x, y: field.y + 100 }, 600);
    const smudge: Contact = {
      id: 8,
      tier: ResolutionTier.Bearing,
      x: field.x + 100,
      y: field.y,
      tick: 6000,
    };
    const beyond = enemy(9, UnitKind.Harvester, { x: field.x + 900, y: field.y }, field.depth);
    const said = forHull(
      new AiCommander(brief).observe(snapshot([posted], { contacts: [overhead, smudge, beyond] })),
      71
    );
    assert.equal(
      said.length,
      0,
      'a hull at cruise depth over the field, an unclassified smudge and a hauler 900 m out ' +
        'are none of them at the node'
    );
  });

  it('walks a holder that has been pushed off its post back, and forgets its order', () => {
    const brief = briefing();
    const field = crystalOf(brief.nodes);
    const commander = new AiCommander(brief);
    const hauler = enemy(6, UnitKind.Harvester, { x: field.x - 200, y: field.y }, field.depth);
    const posted = hull(71, UnitKind.Dredge, field, {
      followFloor: true,
      holding: true,
      depth: 2570,
    });
    const ordered = forHull(commander.observe(snapshot([posted], { contacts: [hauler] })), 71);
    assert.ok(
      ordered.some((c) => c.kind === 'attack'),
      'the premise: an order was given'
    );

    // Shoved 400 m off: the walk back is a move, which drops the hold and the
    // order in the sim, so the commander must not believe either survives it.
    const shoved = { ...posted, x: field.x + 400, holding: undefined };
    let walked: AiCommand[] = [];
    for (let i = 0; i < 3; i++) {
      walked = commander.observe(snapshot([shoved], { tick: 6300, contacts: [hauler] }));
    }
    assert.ok(
      forHull(walked, 71).some((c) => c.kind === 'move'),
      'walked back to the post'
    );

    let back: AiCommand[] = [];
    for (let i = 0; i < 3; i++) {
      back = commander.observe(
        snapshot([{ ...posted, holding: undefined }], { contacts: [hauler] })
      );
    }
    assert.deepEqual(
      forHull(back, 71).map((c) => c.kind),
      ['hold', 'attack'],
      'back on the post, held again and ordered again'
    );
  });

  it('is a Dredge’s job alone: a navy without one never says either verb', () => {
    // The gate is the hull, and the hull is faction-locked. A Directorate
    // army with no Dredge in it, on the field or not, is a navy this branch
    // has nothing to say to.
    const brief = briefing();
    const field = crystalOf(brief.nodes);
    const units = [
      hull(73, UnitKind.Corvette, field, { depth: 2400 }),
      hull(74, UnitKind.Corvette, brief.spawns[brief.slot]!),
    ];
    const said = new AiCommander(brief).observe(
      snapshot(units, { contacts: [enemy(6, UnitKind.Harvester, field, field.depth)] })
    );
    assert.ok(
      !said.some((c) => c.kind === 'hold' || c.kind === 'followFloor'),
      'the verbs were spent on hulls the rule is not about'
    );
  });
});
