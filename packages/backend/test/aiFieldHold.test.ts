/**
 * The Dredge holds the crystal field (#703) — docs/units.md, the Dredge.
 *
 * "The hull for the floor of the map. The crystal field sits at 2,400 m and
 * every navy raids it; the Directorate is meant to *hold* it." `hold` and
 * `followFloor` were two of the three client messages `AiUnbuilt` listed, and
 * #703's second criterion is that neither is built without a rule that spends
 * it and a test that shows it spent — the shape `aiCountermeasures.test.ts`
 * sets. Since #1132 the floor is not a message: a move onto the ground follows
 * it, so the Dredge's walk carries the field's floor as its depth. This file
 * holds four things:
 *
 *   - the verbs reach the simulation, through the seat and the same
 *     `Match.orderMove` and `Match.orderHold` a player's messages reach;
 *   - the hold is load-bearing rather than decoration: the same ordered
 *     target is chased by a hull that is not held and waited for by one that
 *     is, which is the whole of what the verb buys a hull that is already
 *     stopped;
 *   - when each is said — the walk onto the floor until the Dredge stands
 *     on it, and the hold and the attack only there, never on the walk out,
 *     where an unheld order is a chase;
 *   - what the holder is ordered on: a classified hull at the node, a hauler
 *     first, and never a hull merely passing over the field at cruise depth.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  AiDifficulty,
  DEPTH,
  FOLLOW_FLOOR,
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
    pressureRating: stats.pressureRating,
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

/** The seabed under a point, read off the briefing's public terrain grid. */
function floorOf(brief: AiBriefing, at: { x: number; y: number }): number {
  const { cols, cellM, floor } = brief.terrain;
  return floor[Math.floor(at.y / cellM) * cols + Math.floor(at.x / cellM)]!;
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
    // Over the field but above its floor is off the post, so the commander
    // walks it down first and holds it once it stands there.
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

    // The floor is where it goes: the mode retargets to the local seabed less
    // its clearance, which on this map is deeper than the node itself.
    const floor = match.world.terrain.floorAt(field.x, field.y);
    for (let i = 0; i < SIM.TICK_HZ * 90; i++) {
      const own = match.update(STEP_MS)?.get(1);
      if (own !== undefined) seat.observe(own);
    }
    assert.equal(DepthOrder.follow[dredge], 1, 'the walk put the Dredge on the floor');
    assert.equal(Posture.hold[dredge], 1, 'and, standing on it, the commander held it there');
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

  it('walks the Dredge out onto the field’s floor, and holds only on the post', () => {
    const brief = briefing();
    const field = crystalOf(brief.nodes);
    const home = brief.spawns[brief.slot]!;
    const dredge = hull(71, UnitKind.Dredge, home);

    // A raider already on the node, so refusing to order on it is a decision
    // the walk has to make rather than one an empty sea makes for it.
    const walking = new AiCommander(brief).observe(
      snapshot([dredge], { contacts: [enemy(6, UnitKind.Harvester, field, field.depth)] })
    );
    const said = forHull(walking, 71);
    const move = said.find((c) => c.kind === 'move');
    assert.ok(move?.kind === 'move', 'the Dredge is walked');
    assert.ok(Math.hypot(move.x - field.x, move.y - field.y) < 1, 'to the field itself');
    assert.equal(
      move.depthM,
      Math.min(floorOf(brief, field), DEPTH.MAX_M),
      'onto its floor, so the walk follows the ground down under the layer'
    );
    assert.ok(
      !said.some((c) => c.kind === 'hold' || c.kind === 'attack'),
      'nothing is held or ordered on while it is still walking'
    );

    // Over the field but still above its floor is not the post.
    const over = { ...dredge, x: field.x + 40, y: field.y, followFloor: true };
    const above = forHull(new AiCommander(brief).observe(snapshot([over])), 71);
    assert.deepEqual(
      above.map((c) => c.kind),
      ['move'],
      'a Dredge over the field at 600 m is walked down, not held'
    );

    // On the post: held, and nothing else asked of it with nobody there.
    const posted = { ...over, depth: 2570 };
    const onPost = forHull(new AiCommander(brief).observe(snapshot([posted])), 71);
    assert.deepEqual(
      onPost.map((c) => c.kind),
      ['hold'],
      'standing on the field, the Dredge is held and nothing more'
    );
  });

  it('judges the post by the ground under the Dredge, not the field’s centre (#1228)', () => {
    // Synthetic uneven ground. The default map's field is flat, so one cell
    // inside the post is raised into a rise and another dug into a hollow.
    // Following the floor holds a hull its clearance over the ground beneath
    // it, wherever it stopped — the depth the holders on the rise and in the
    // hollow are given.
    const brief = briefing();
    const field = crystalOf(brief.nodes);
    const centre = floorOf(brief, field);
    const { cols, cellM, floor } = brief.terrain;
    const cellOf = (at: { x: number; y: number }) =>
      Math.floor(at.y / cellM) * cols + Math.floor(at.x / cellM);
    const riseAt = { x: field.x - 100, y: field.y };
    const hollowAt = { x: field.x, y: field.y - 100 };
    assert.equal(new Set([field, riseAt, hollowAt].map(cellOf)).size, 3, 'three cells');
    floor[cellOf(riseAt)] = centre - 300;
    floor[cellOf(hollowAt)] = Math.min(centre + 300, DEPTH.MAX_M);
    const following = (at: { x: number; y: number }, depth: number) =>
      hull(71, UnitKind.Dredge, at, { followFloor: true, depth });
    const said = (dredge: OwnUnit) =>
      forHull(new AiCommander(brief).observe(snapshot([dredge])), 71);

    // On a rise 300 m above the centre's floor, standing on its own ground:
    // held. Judged against the centre it read as off the post, and was walked.
    const onRise = following(riseAt, floorOf(brief, riseAt) - FOLLOW_FLOOR.CLEARANCE_M);
    assert.deepEqual(
      said(onRise).map((c) => c.kind),
      ['hold'],
      'a Dredge standing on a rise inside the post is held'
    );

    // Over the hollow at the centre's standing depth is above its own ground.
    const overHollow = following(hollowAt, centre - FOLLOW_FLOOR.CLEARANCE_M);
    const walked = said(overHollow);
    assert.deepEqual(
      walked.map((c) => c.kind),
      ['move'],
      'a Dredge hanging over a hollow is walked, not held'
    );
    assert.ok(
      walked[0]!.kind === 'move' && walked[0]!.depthM === Math.min(centre, DEPTH.MAX_M),
      'onto the field’s floor, the order’s point, as any walk out is'
    );

    // And on the hollow's own floor, it is on the post.
    const inHollow = following(hollowAt, floorOf(brief, hollowAt) - FOLLOW_FLOOR.CLEARANCE_M);
    assert.deepEqual(
      said(inHollow).map((c) => c.kind),
      ['hold'],
      'down in the hollow, held'
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
      !commands.some((c) => c.kind === 'move' && c.unitIds.includes(72) && c.depthM !== undefined),
      'only the holder is walked onto the floor'
    );
  });

  it('orders the held Dredge on a raiding hauler, with the hold, and only once', () => {
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
    // Which of the two comes first is not asserted, because it changes nothing:
    // the seat applies both before the next step, a hold keeps an ordered
    // target, and an attack on a live contact writes no course.
    assert.deepEqual(
      first.map((c) => c.kind).sort(),
      ['attack', 'hold'],
      'on the post, held and ordered on something'
    );
    const attack = first.find((c) => c.kind === 'attack');
    assert.ok(attack?.kind === 'attack' && attack.contactId === hauler.id, 'on the hauler');

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
      forHull(back, 71)
        .map((c) => c.kind)
        .sort(),
      ['attack', 'hold'],
      'back on the post, held again and ordered again'
    );
  });

  it('keeps the Dredge on the post while it lives, whatever the next one is numbered', () => {
    // Entity ids are reused once enough entities have died, so a Dredge built
    // later can carry a lower id than the one already on the field. Choosing
    // the lowest id afresh every observation would swap them: the newcomer
    // walked out, and the incumbent sent back to the army still on the floor.
    const brief = briefing();
    const field = crystalOf(brief.nodes);
    const home = brief.spawns[brief.slot]!;
    const commander = new AiCommander(brief);
    const incumbent = hull(80, UnitKind.Dredge, field, {
      followFloor: true,
      holding: true,
      depth: 2570,
    });
    // 108 ticks an observation, so each Veteran decision — every third — is
    // more than five seconds after the last and may re-issue a walk (#1253).
    let tick = 6000 - 108;
    const next = (units: OwnUnit[]) => snapshot(units, { tick: (tick += 108) });
    commander.observe(next([incumbent]));

    const newcomer = hull(40, UnitKind.Dredge, home);
    let later: AiCommand[] = [];
    for (let i = 0; i < 3; i++) later = commander.observe(next([incumbent, newcomer]));
    assert.ok(
      !later.some((c) => c.kind === 'move' && c.unitIds.includes(40) && c.depthM !== undefined),
      'the newcomer was walked onto the floor, so it was made the holder'
    );
    assert.ok(
      later.some((c) => c.kind === 'move' && c.unitIds.includes(40) && !c.unitIds.includes(80)),
      'the newcomer goes with the army'
    );
    assert.equal(forHull(later, 80).length, 0, 'the incumbent was told something');

    // And once the incumbent is gone, the newcomer is the holder.
    for (let i = 0; i < 3; i++) later = commander.observe(next([newcomer]));
    assert.ok(
      later.some((c) => c.kind === 'move' && c.unitIds.includes(40) && c.depthM !== undefined),
      'the next Dredge takes the post'
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
      !said.some((c) => c.kind === 'hold' || (c.kind === 'move' && c.depthM !== undefined)),
      'the verbs were spent on hulls the rule is not about'
    );
  });
});
