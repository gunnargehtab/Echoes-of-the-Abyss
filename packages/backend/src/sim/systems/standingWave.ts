/**
 * Standing Wave — docs/systems-echo.md §7, docs/factions.md, and the mission
 * that teaches it, docs/mission-standing-wave.md §4.
 *
 * "A placed resonance node that, when a second node is placed within 1,500 m,
 * creates a line of sonic damage between them. Also permanently raises
 * PropagationFactor in the corridor to 2.0, turning the space into an acoustic
 * megaphone that harms everyone equally, including them."
 *
 * The node is the Sounding Spire — units.md, systems-echo.md and its §8 all
 * already say so, and docs/mission-standing-wave.md §3 argues the point at
 * length rather than inventing a fourth structure. What this system adds is
 * the notion of two of them being *paired*, and §4 settles the three questions
 * the format left open in one sentence, transcribed here as three rules:
 *
 * - **A node pairs with the nearest completed, unpaired node of the same
 *   commander within 1,500 m, at the moment it completes.** Automatic, not
 *   chosen: the player already chose the thing that matters, which is where
 *   the two ends are. Nearest-unpaired, not all-pairs: *n* nodes make ⌊n/2⌋
 *   corridors, which is what "paired emitters" means read as plain English.
 * - **The pairing is decided once and is never re-decided.** A node whose
 *   partner dies is a node whose partner died; it does not pick up a third.
 *   "An instrument does not re-tune itself while you are inside it."
 * - **A node with no partner is silent.** It hums at its idle figure and does
 *   nothing else — the odd node is the mission's teaching beat.
 *
 * And while a corridor stands, three things are true of it, all symmetric and
 * none owned: the water between the nodes carries at `CORRIDOR_PF` (written
 * into the PF grid by `rebuildPropagation`, which asks this file for the
 * lines), anything standing in it loses hull at `CORRIDOR_DAMAGE_PER_S`, and
 * both nodes are *active* at 80 — a Spire holding an interval is projecting
 * (units.md, widened by docs/mission-standing-wave.md §4: a hazard nobody can
 * hear is confusion rather than dread).
 *
 * Runs after `aurasSystem`, which clears and rebuilds `spireActive` each tick
 * and knows nothing of pairs, and before `acousticsSystem`, which reads it.
 */

import { defineQuery, hasComponent } from 'bitecs';
import { STANDING_WAVE, SelfEventKind, StructureKind } from '@echoes/shared';
import {
  Fauna,
  Health,
  Owner,
  Position,
  Structure,
  UnderConstruction,
  Unit,
} from '../components.ts';
import type { PropagationModifier } from '../terrain.ts';
import { eidOfLocalId, localIdOf, raiseSelfEvent, type SimWorld } from '../world.ts';

const spires = defineQuery([Structure, Position, Owner, Health]);
/** What a line can hurt: hulls and creatures. Structures and ordnance stand outside it. */
const inTheWater = defineQuery([Position, Health, Owner]);

/**
 * Hulls that were inside a corridor on the last tick, so the blow the mixer
 * is told about is the one on entry rather than sixty a second. A blow on the
 * hull is audible once per engagement (docs/audio-direction.md §12), and
 * walking into a kill-line is one engagement. Module scratch, rebuilt whole
 * every tick, for `auras.ts`'s reason — the set is single digits.
 */
let struckLastTick = new Set<number>();
let struckThisTick = new Set<number>();

/** The live entity behind a node's match-local id, or 0 once it has fallen. */
function nodeEid(world: SimWorld, local: number): number {
  const eid = eidOfLocalId(world, local);
  if (eid === 0 || !hasComponent(world, Structure, eid)) return 0;
  if (Structure.kind[eid] !== StructureKind.SoundingSpire) return 0;
  if (Health.hp[eid]! <= 0) return 0;
  return localIdOf(world, eid) === local ? eid : 0;
}

function distanceToSegmentSquared(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const cx = ax + t * dx - px;
  const cy = ay + t * dy - py;
  return cx * cx + cy * cy;
}

/**
 * One tick of the Standing Wave: retire fallen corridors, pair what completed,
 * and let every standing line do what a line does.
 *
 * Returns true when the set of corridors changed, so the caller can rebuild
 * the PF grid on that tick rather than at the next storm boundary — a line
 * that closes is heard on the tick it closes, and one that falls stops
 * carrying on the tick it falls.
 */
export function standingWaveSystem(world: SimWorld, destroyed: number[]): boolean {
  let changed = false;

  // Retire corridors whose nodes have fallen. The survivor stays in
  // `pairedNodes`: decided once (§4).
  for (let i = world.corridors.length - 1; i >= 0; i--) {
    const corridor = world.corridors[i]!;
    if (nodeEid(world, corridor.a) === 0 || nodeEid(world, corridor.b) === 0) {
      world.corridors.splice(i, 1);
      changed = true;
    }
  }

  // Pair what completed. Walked in entity order, which is spawn order, so two
  // nodes completing on one tick pair deterministically and a replay pairs
  // the same two. A completed node with no partner in range stays available
  // — silent, and waiting for the next one to complete within reach of it.
  //
  // "Completes" is literal: a node is offered a partner only if this pass
  // saw it as a site first (`world.nodeSites`). A prebuilt Spire never
  // completes anything, so a lattice a mission seats inside its own pairing
  // range hums at 30 all tide (docs/mission-conclave-chord.md §3), and two
  // grants raised at one turn of one tide are two grants
  // (docs/mission-rim-deposits.md §4).
  const all = spires(world);
  for (let i = 0; i < all.length; i++) {
    const eid = all[i]!;
    if (Structure.kind[eid] !== StructureKind.SoundingSpire) continue;
    const local = localIdOf(world, eid);
    if (local === undefined) continue;
    if (hasComponent(world, UnderConstruction, eid)) {
      world.nodeSites.add(local);
      continue;
    }
    if (Health.hp[eid]! <= 0) continue;
    if (!world.nodeSites.has(local) || world.pairedNodes.has(local)) continue;

    let partner = 0;
    let partnerLocal = -1;
    let bestD2 = STANDING_WAVE.PAIR_RANGE_M * STANDING_WAVE.PAIR_RANGE_M;
    for (let j = 0; j < all.length; j++) {
      const other = all[j]!;
      if (other === eid) continue;
      if (Structure.kind[other] !== StructureKind.SoundingSpire) continue;
      if (hasComponent(world, UnderConstruction, other)) continue;
      if (Health.hp[other]! <= 0) continue;
      // Of the same commander: `Owner.slot`, not the aura's `grantSlot`. A
      // lent node is lent for its depth grant; who it pairs with is who
      // raised it.
      if (Owner.slot[other] !== Owner.slot[eid]) continue;
      const otherLocal = localIdOf(world, other);
      if (otherLocal === undefined || world.pairedNodes.has(otherLocal)) continue;
      // A partner has to have completed too — a prebuilt node beside a site
      // is a grant, not the other end of an interval.
      if (!world.nodeSites.has(otherLocal)) continue;
      const d2 =
        (Position.x[other]! - Position.x[eid]!) ** 2 + (Position.y[other]! - Position.y[eid]!) ** 2;
      // `<=` rather than `<` so a pair at exactly the range still pairs: §4's
      // "within 1,500 m", and the build radius is the same number by decision
      // (#372) so a node chained off its partner at the limit is meant to.
      if (d2 > bestD2) continue;
      bestD2 = d2;
      partner = other;
      partnerLocal = otherLocal;
    }
    if (partner === 0) continue;
    world.corridors.push({ a: local, b: partnerLocal });
    world.pairedNodes.add(local);
    world.pairedNodes.add(partnerLocal);
    changed = true;
  }

  if (world.corridors.length === 0) {
    struckLastTick.clear();
    return changed;
  }

  // What a standing line does: both ends sing, and the water between them
  // takes hull off whatever is in it.
  const dt = world.dt;
  const bite = STANDING_WAVE.CORRIDOR_DAMAGE_PER_S * dt;
  const half2 = STANDING_WAVE.CORRIDOR_HALF_WIDTH_M * STANDING_WAVE.CORRIDOR_HALF_WIDTH_M;
  const things = inTheWater(world);
  struckThisTick.clear();
  for (const corridor of world.corridors) {
    const a = nodeEid(world, corridor.a);
    const b = nodeEid(world, corridor.b);
    world.spireActive.add(a);
    world.spireActive.add(b);
    const ax = Position.x[a]!;
    const ay = Position.y[a]!;
    const bx = Position.x[b]!;
    const by = Position.y[b]!;
    for (let i = 0; i < things.length; i++) {
      const eid = things[i]!;
      // Hulls and creatures. Not the nodes themselves, not a Bastion the line
      // happens to cross, and not ordnance: a torpedo is not a thing that has
      // hull to lose to a sound (docs/systems-combat.md §11 — the line is a
      // *kill*-line, and it kills what can be killed by being loud at).
      if (!hasComponent(world, Unit, eid) && !hasComponent(world, Fauna, eid)) continue;
      if (Health.hp[eid]! <= 0) continue;
      // Horizontal distance only, like the Echo Layer's: the corridor is a
      // column of water between two nodes, not a wire strung at their depth.
      if (distanceToSegmentSquared(Position.x[eid]!, Position.y[eid]!, ax, ay, bx, by) > half2) {
        continue;
      }
      Health.hp[eid] = Health.hp[eid]! - bite;
      struckThisTick.add(eid);
      // The owner is told on the way in, and once — a client watching its own
      // hp could not tell the line from crush, and §8 keeps those apart.
      if (!struckLastTick.has(eid) && hasComponent(world, Unit, eid)) {
        raiseSelfEvent(world, { kind: SelfEventKind.Damaged, eid });
      }
      if (Health.hp[eid]! <= 0 && !destroyed.includes(eid)) destroyed.push(eid);
    }
  }
  const swap = struckLastTick;
  struckLastTick = struckThisTick;
  struckThisTick = swap;
  return changed;
}

/**
 * The standing corridors as PF writes — one capsule per line, at the
 * corridor's figure, for `rebuildPropagation` to compose with the storms and
 * the jelly fields. Asked for rather than written here, because
 * `applyPropagationModifiers` replaces the whole set and two writers would
 * erase each other (hazards.ts says the same about its own two sources).
 */
export function corridorModifiers(world: SimWorld): PropagationModifier[] {
  const mods: PropagationModifier[] = [];
  for (const corridor of world.corridors) {
    const a = nodeEid(world, corridor.a);
    const b = nodeEid(world, corridor.b);
    if (a === 0 || b === 0) continue;
    mods.push({
      x: Position.x[a]!,
      y: Position.y[a]!,
      x2: Position.x[b]!,
      y2: Position.y[b]!,
      radiusM: STANDING_WAVE.CORRIDOR_HALF_WIDTH_M,
      set: STANDING_WAVE.CORRIDOR_PF,
    });
  }
  return mods;
}

/**
 * The nodes of one commander that are holding an interval right now, by
 * entity id as their own `EchoSnapshot.structures` reports them.
 *
 * For the mission runtime's `build` predicate and nothing else: a query over
 * one slot's own structures, which is the same kind of own-force fact as the
 * hp the snapshot already carries for each of them. There is no way to ask
 * this about another slot from the runtime, because the runtime asks it about
 * `definition.playerSlot` and has no second slot to hand it.
 */
export function pairedNodesOf(world: SimWorld, slot: number): Set<number> {
  const ids = new Set<number>();
  for (const corridor of world.corridors) {
    const a = nodeEid(world, corridor.a);
    const b = nodeEid(world, corridor.b);
    if (a === 0 || b === 0) continue;
    if (Owner.slot[a] === slot) ids.add(a);
    if (Owner.slot[b] === slot) ids.add(b);
  }
  return ids;
}
