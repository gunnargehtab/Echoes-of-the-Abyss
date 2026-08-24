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
import { AiDifficulty, MatchPhase } from '@echoes/shared';

export class PlayerState extends Schema {
  @type('string') sessionId = '';
  @type('string') name = '';
  @type('uint8') slot = 0;
  /** Faction enum ordinal. Public — everyone knows who they are playing. */
  @type('uint8') faction = 0;
  /**
   * False while a dropped player is inside the reconnection grace window.
   *
   * Public on purpose, and it costs the dropped player something: their fleet
   * stays in the water and keeps making noise (docs/tech-stack.md "Match lifecycle"), so an
   * opponent who can see the flag knows exactly whose hulls are now unpiloted.
   */
  @type('boolean') connected = true;
  /**
   * Readied up. Carries two meanings across two phases — "start the match" in
   * the lobby, "call a rematch" after one ends — because it is the same
   * question both times: is this commander waiting on anyone else?
   */
  @type('boolean') ready = false;
  /**
   * A seat driven by the skirmish AI rather than by a person.
   *
   * Public, and it has to be: an opponent is entitled to know whether they
   * agreed to play a human. So is the difficulty below — "decision quality,
   * never information" is only a promise the other commander can hold you to
   * if they can see which setting was chosen.
   */
  @type('boolean') isAi = false;
  /** AiDifficulty ordinal. Meaningless unless `isAi`. */
  @type('uint8') difficulty: number = AiDifficulty.Recruit;
}

export class MatchState extends Schema {
  /** Authoritative simulation tick, so clients can order and age snapshots. */
  @type('uint32') tick = 0;
  /** MatchPhase ordinal. The simulation only steps in Playing. */
  @type('uint8') phase: number = MatchPhase.Lobby;
  /** Which authored map this room is on. Chosen at creation, fixed for its life. */
  @type('string') mapId = '';
  /**
   * Winning slot, or -1 while a match is unresolved.
   *
   * int8 rather than uint8 so "nobody has won" is a representable value
   * instead of a sentinel that collides with slot 0 — the slot a player is
   * most likely to be holding.
   */
  @type('int8') winnerSlot = -1;
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
