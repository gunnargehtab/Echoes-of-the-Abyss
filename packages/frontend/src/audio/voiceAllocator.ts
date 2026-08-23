/**
 * Which contacts get a voice, and which one loses it.
 *
 * docs/audio-direction.md §12 caps the contact bus at 24 simultaneous voices:
 * "beyond this the low band turns to mud and nothing is legible". The mix is
 * the game's primary information channel, so running out of voices is not a
 * performance concern that degrades quality — it is an *information* concern
 * that decides what the player is told.
 *
 * Hence the stealing order, and hence the exemption: **a Tier-4 track is never
 * stolen.** It is the only exact information the player has, and losing it to
 * a crowd of distant Tier-1 smears would be the mix lying by omission at
 * exactly the moment precision matters most.
 *
 * Deliberately pure — no AudioContext, no nodes, no timers. The policy is the
 * part that has to be right, so it is the part that is unit-testable.
 */

import { ResolutionTier } from '@echoes/shared';

/** SPEC — docs/audio-direction.md §12. */
export const MAX_CONTACT_VOICES = 24;

export interface VoiceRequest {
  /** Opaque per-observer contact handle. Stable for as long as the contact is. */
  contactId: number;
  tier: ResolutionTier;
  /** 0-1. Perceived loudness, used only as the last tie-break. */
  gain: number;
  /** Echo tick this contact was resolved on; the age tie-break. */
  tick: number;
}

export interface Voice extends VoiceRequest {
  /** Slot index on the contact bus, stable for the voice's lifetime. */
  slot: number;
}

export interface AllocationResult {
  /** The voice now playing this contact, or null when it was refused. */
  voice: Voice | null;
  /** The voice that was stopped to make room, if any. */
  stolen: Voice | null;
}

export class VoiceAllocator {
  private readonly voices = new Map<number, Voice>();
  private readonly freeSlots: number[];
  readonly capacity: number;

  constructor(capacity: number = MAX_CONTACT_VOICES) {
    this.capacity = capacity;
    // Descending so the first pop is slot 0 — cosmetic, but it makes the
    // allocation order in tests and logs read the way a person expects.
    this.freeSlots = Array.from({ length: capacity }, (_, i) => capacity - 1 - i);
  }

  get active(): Voice[] {
    return [...this.voices.values()];
  }

  get size(): number {
    return this.voices.size;
  }

  has(contactId: number): boolean {
    return this.voices.has(contactId);
  }

  /**
   * Give a contact a voice, stealing one if the bus is full.
   *
   * An existing contact keeps its slot and simply updates — re-allocating
   * would restart the sound, and a contact whose tier improved should not
   * audibly re-trigger as though it were newly heard.
   */
  allocate(request: VoiceRequest): AllocationResult {
    const existing = this.voices.get(request.contactId);
    if (existing !== undefined) {
      existing.tier = request.tier;
      existing.gain = request.gain;
      existing.tick = request.tick;
      return { voice: existing, stolen: null };
    }

    let slot = this.freeSlots.pop();
    let stolen: Voice | null = null;

    if (slot === undefined) {
      stolen = this.victim(request);
      // Nothing may be taken — the bus is full of tracks, and this contact
      // is worth less than all of them. Refusing is correct: the alternative
      // is dropping exact information for vague information.
      if (stolen === null) return { voice: null, stolen: null };
      this.voices.delete(stolen.contactId);
      slot = stolen.slot;
    }

    const voice: Voice = { ...request, slot };
    this.voices.set(request.contactId, voice);
    return { voice, stolen };
  }

  release(contactId: number): Voice | null {
    const voice = this.voices.get(contactId);
    if (voice === undefined) return null;
    this.voices.delete(contactId);
    this.freeSlots.push(voice.slot);
    return voice;
  }

  /** Drop everything, e.g. on match end or context loss. */
  clear(): void {
    for (const voice of this.voices.values()) this.freeSlots.push(voice.slot);
    this.voices.clear();
  }

  /**
   * Which voice to steal for `incoming`, or null if none may be taken.
   *
   * Order, from docs/audio-direction.md §12: lowest tier first, then oldest,
   * then quietest. A Tier-4 track is excluded outright, and a candidate must
   * rank strictly below the incoming contact — otherwise a stream of distant
   * Tier-1 contacts would churn the bus, each evicting the last, and the
   * player would hear a mix that never settles.
   */
  private victim(incoming: VoiceRequest): Voice | null {
    let best: Voice | null = null;

    for (const voice of this.voices.values()) {
      if (voice.tier >= ResolutionTier.Track) continue;
      if (voice.tier >= incoming.tier) continue;

      if (best === null || this.ranksLower(voice, best)) best = voice;
    }

    return best;
  }

  /** True when `a` is a better victim than `b`. */
  private ranksLower(a: Voice, b: Voice): boolean {
    if (a.tier !== b.tier) return a.tier < b.tier;
    // Oldest = smallest tick.
    if (a.tick !== b.tick) return a.tick < b.tick;
    return a.gain < b.gain;
  }
}
