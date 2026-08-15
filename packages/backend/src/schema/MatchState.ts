/**
 * Colyseus room state.
 *
 * Note what is NOT here: units, positions, health, anything about the world.
 *
 * Colyseus state is broadcast to every client in the room, so anything placed
 * in this schema is, by definition, known to all players. In a game whose core
 * system is hidden information that makes the schema the wrong channel for
 * world state entirely. Entities live in the ECS world on the server, and each
 * player receives only their own resolved EchoSnapshot over a per-client
 * message. This schema carries lobby-level facts that are genuinely public.
 */

import { Schema, MapSchema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string') sessionId = '';
  @type('string') name = '';
  @type('uint8') slot = 0;
  /** Faction enum ordinal. Public — everyone knows who they are playing. */
  @type('uint8') faction = 0;
  @type('boolean') connected = true;
}

export class MatchState extends Schema {
  /** Authoritative simulation tick, so clients can order and age snapshots. */
  @type('uint32') tick = 0;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
