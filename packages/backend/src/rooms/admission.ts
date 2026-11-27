/**
 * Which rooms are held, and by whom (#1961).
 *
 * A room costs the thread that steps every match from the moment somebody sits
 * in it: the first seat builds its world, and three AI seats and a ready make
 * it a 60 Hz match (`docs/threat-model.md`, TM-003). Colyseus disposes a room
 * whose last socket leaves, so a room runs exactly as long as a socket holds a
 * seat in it, and that seat is what is counted here.
 *
 * One ledger for the process, because the thread it protects is one. `MatchRoom`
 * asks it in `onJoin`, synchronously, before the seat is taken and before
 * anything reads the world, so a refused join builds nothing and two joins
 * cannot both pass a check that only one fits. A seat is given back wherever
 * the room releases a player, and a disposed room gives back all of its own.
 *
 * A seat that drops mid-match still holds its room through the reconnect
 * grace: the fleet is in the water and the room is running.
 */

import { ADMISSION } from '@echoes/shared';

/** Room id → session id → the address that holds the seat. */
type Holds = Map<string, Map<string, string>>;

export class RoomAdmission {
  private readonly holds: Holds = new Map();

  constructor(
    private readonly maxLiveRooms: number,
    private readonly maxRoomsPerAddress: number
  ) {}

  /**
   * Seat `sessionId`, from `address`, in `roomId`, or say why not, in a
   * sentence a player reads after "The room would not take your seat."
   * Another seat in a room the address already holds costs nothing new: a
   * lobby of friends behind one address is one room.
   */
  admit(roomId: string, sessionId: string, address: string): string | null {
    const room = this.holds.get(roomId);
    const heldHere = room !== undefined && [...room.values()].includes(address);
    if (!heldHere) {
      if (room === undefined && this.holds.size >= this.maxLiveRooms) {
        return 'The server is running as many matches as it can. Try again in a few minutes.';
      }
      if (this.roomsHeldBy(address) >= this.maxRoomsPerAddress) {
        return (
          `Your connection already has ${this.maxRoomsPerAddress} matches running. ` +
          'Leave one to start another.'
        );
      }
    }
    if (room === undefined) this.holds.set(roomId, new Map([[sessionId, address]]));
    else room.set(sessionId, address);
    return null;
  }

  /** Give back one seat; a room with none left is no longer held. */
  release(roomId: string, sessionId: string): void {
    const room = this.holds.get(roomId);
    if (room === undefined) return;
    room.delete(sessionId);
    if (room.size === 0) this.holds.delete(roomId);
  }

  /** Give back every seat `roomId` holds, as it is disposed. */
  releaseRoom(roomId: string): void {
    this.holds.delete(roomId);
  }

  /** Rooms with a seat held in them. */
  get liveRooms(): number {
    return this.holds.size;
  }

  /** Rooms in which `address` holds a seat. */
  roomsHeldBy(address: string): number {
    let held = 0;
    for (const room of this.holds.values()) {
      for (const holder of room.values()) {
        if (holder === address) {
          held += 1;
          break;
        }
      }
    }
    return held;
  }
}

/** The process's ledger, at the bounds `ADMISSION` sets. */
export const roomAdmission = new RoomAdmission(
  ADMISSION.MAX_LIVE_ROOMS,
  ADMISSION.MAX_ROOMS_PER_ADDRESS
);
