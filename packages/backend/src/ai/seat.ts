/**
 * The wire between a commander and the simulation.
 *
 * This is the **only** file under `ai/` that may import `Match`, and the split
 * is load-bearing rather than tidy: everything on the other side of it is
 * restricted to a resolved snapshot, and having exactly one crossing point
 * makes that claim checkable by reading one short file.
 *
 * Nothing here decides anything. It hands the commander a snapshot, takes back
 * a list of commands, and calls the same `Match` methods the room calls on a
 * client's behalf — the same validation, the same ownership checks, the same
 * opaque contact handles. A command the sim refuses from a player is refused
 * from the AI too, silently, for the same reasons.
 */

import type { EchoSnapshot } from '@echoes/shared';
import type { Match } from '../sim/match.ts';
import { AiCommander } from './commander.ts';
import type { AiBriefing, AiCommand } from './types.ts';

export class AiSeat {
  readonly slot: number;
  private readonly match: Match;
  private readonly commander: AiCommander;
  /** Commands issued this match. Read by tests and the balance harness. */
  private issued = 0;

  constructor(match: Match, briefing: AiBriefing) {
    this.match = match;
    this.slot = briefing.slot;
    this.commander = new AiCommander(briefing);
  }

  get commandsIssued(): number {
    return this.issued;
  }

  /** One Echo tick: observe, then apply whatever came back. */
  observe(snapshot: EchoSnapshot): void {
    for (const command of this.commander.observe(snapshot)) {
      this.apply(command);
      this.issued++;
    }
  }

  private apply(command: AiCommand): void {
    const slot = this.slot;
    switch (command.kind) {
      case 'move':
        for (const id of command.unitIds) this.match.orderMove(slot, id, command.x, command.y);
        return;
      case 'attackMove':
        for (const id of command.unitIds) {
          this.match.orderAttackMove(slot, id, command.x, command.y);
        }
        return;
      case 'stop':
        for (const id of command.unitIds) this.match.orderStop(slot, id);
        return;
      case 'attack':
        for (const id of command.unitIds) {
          this.match.orderAttackContact(slot, id, command.contactId);
        }
        return;
      case 'harvest':
        for (const id of command.unitIds) this.match.orderHarvest(slot, id, command.nodeId);
        return;
      case 'throttle':
        for (const id of command.unitIds) this.match.setThrottle(slot, id, command.throttle);
        return;
      case 'silent':
        for (const id of command.unitIds) {
          this.match.setSilentRunning(slot, id, command.active);
        }
        return;
      case 'engineOff':
        for (const id of command.unitIds) {
          this.match.setEngineOff(slot, id, command.active);
        }
        return;
      case 'layDecoy':
        this.match.layDecoy(slot, command.unitId);
        return;
      case 'torpedo':
        this.match.orderLaunchTorpedo(slot, command.unitId, command.contactId);
        return;
      case 'depthCharge':
        this.match.orderDepthCharge(slot, command.unitId, command.depthM);
        return;
      case 'ping':
        this.match.activeSonar(slot, command.unitId);
        return;
      case 'mine':
        this.match.layMine(slot, command.unitId);
        return;
      case 'build':
        this.match.build(slot, command.structure, command.x, command.y);
        return;
      case 'produce':
        this.match.produce(slot, command.structureId, command.unit);
        return;
      case 'depth':
        for (const id of command.unitIds) this.match.orderDepth(slot, id, command.depthM);
        return;
      case 'embark':
        for (const id of command.unitIds) this.match.orderEmbark(slot, id, command.carrierId);
        return;
      case 'disembark':
        for (const id of command.unitIds) this.match.orderDisembark(slot, id);
        return;
      default: {
        // No silent gap. A variant the commander emits and this switch ignores
        // produces an AI that looks like it decided something and then did
        // nothing — indistinguishable, from the outside, from a commander that
        // chose not to act. `depth` spent the whole of this file's history in
        // exactly that state. The never-assignment turns the next one into a
        // compile error instead of a behaviour nobody can see.
        const unhandled: never = command;
        throw new Error(`AiSeat: no case for command ${JSON.stringify(unhandled)}`);
      }
    }
  }
}

/**
 * The briefing a match hands a commander: map data, and nothing else.
 *
 * Assembled here rather than inside the commander so that the commander never
 * holds a `Match` at all, not even to build its own opening picture. Every
 * field below is something a human client is sent on join.
 */
export function briefingFor(
  match: Match,
  slot: number,
  faction: AiBriefing['faction'],
  difficulty: AiBriefing['difficulty']
): AiBriefing {
  return {
    slot,
    faction,
    difficulty,
    widthM: match.map.widthM,
    heightM: match.map.heightM,
    spawns: match.map.spawns.map((spawn) => ({ x: spawn.x, y: spawn.y })),
    nodes: [...match.resourceNodes],
    terrain: match.world.terrain.serialize(),
  };
}
