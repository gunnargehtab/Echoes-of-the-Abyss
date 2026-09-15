/**
 * Contacts in, voices out — docs/audio-direction.md §3.
 *
 * The mixer owns the correspondence between what the server resolved and what
 * the player hears. It is the layer where the two rules that matter meet:
 *
 * 1. **Fidelity is honest** (§2). A voice may never sound more certain than
 *    the tier that produced it. The mixer enforces that by *not carrying* the
 *    information rather than by asking the voice to ignore it — a Tier-1 entry
 *    has no bearing field at all, so there is nothing for a later change to
 *    accidentally start using.
 * 2. **Contact state is tick-aligned** (§12). `update` is driven by the 5 Hz
 *    Echo snapshot, never by the render loop. Contacts arrive on the tick, so
 *    a mix that moved a contact between ticks would be interpolating knowledge
 *    the server did not send. A family's own event train is not state and does
 *    not ride this clock — `ContactVoice` places it ahead on the audio clock,
 *    because holding a mechanism to the tick protects nothing here and leaves
 *    §8.1's faster families unrenderable (§12's scaffold status, #731).
 *
 * Deliberately free of Web Audio: the voice is injected. What has to be right
 * here is *which contact gets a voice and what it is told*, and that is pure
 * bookkeeping over `VoiceAllocator`. Tests exercise it with fake voices.
 */

import type { Biome, Faction, FaunaSpecies, OrdnanceKind, ResolutionTier } from '@echoes/shared';
import type { VoiceInputs } from './contactVoice.ts';
import type { VoiceAllocator } from './voiceAllocator.ts';
import type { BusRung } from './precedence.ts';

/**
 * One contact, reduced to what the mix is allowed to know about it.
 *
 * Built by the renderer, which already holds the tracked-contact map, the
 * terrain and the camera. Assembling it there rather than here is what keeps
 * this module ignorant of Pixi, of terrain payloads, and of the simulation.
 */
export interface ContactAudioEntry {
  /** Opaque per-observer contact handle. */
  id: number;
  tier: ResolutionTier;
  /** Biome at the reported position: PF as a DSP chain (§9). */
  biome: Biome;
  /**
   * What the contact is — Tier 3+ only, exactly one of the three, and absent
   * below that so the mix cannot hint at what it is before the server said.
   *
   * `fauna` and `ordnance` are here for the same reason `faction` is: the mix
   * asks what a contact is rather than whose it is (docs/audio-direction.md
   * §8.1), and the renderer already draws and names both at this exact tier.
   * Carrying them discloses nothing new; *not* carrying them is what made a
   * classified creature borrow a navy's voice.
   */
  faction?: Faction;
  fauna?: FaunaSpecies;
  ordnance?: OrdnanceKind;
  /**
   * 0-1 on `PERSISTENCE.GHOST_MARKER_DECAY_S`, computed by the renderer from
   * the same tracked-contact map the ghost markers fade on. One source of
   * truth, so the voice and the marker cannot disagree about how stale a
   * contact is.
   */
  freshness: number;
  /** Azimuth from the listener, radians. Absent at Tier 1 — there is none. */
  bearing?: number;
  /** Range in metres. Absent at Tier 1 — the server sent no position. */
  rangeM?: number;
}

export interface ContactAudioFrame {
  /** Server tick this snapshot resolved on. */
  tick: number;
  entries: ContactAudioEntry[];
}

/** What the mixer needs of a voice. Narrow on purpose, so tests can fake it. */
export interface VoiceLike {
  update(inputs: VoiceInputs, now: number): void;
  stop(now: number): void;
}

export type VoiceFactory = (slot: number) => VoiceLike;

/**
 * Spatialisation mode (§11: "spatialisation is a rendering choice, never a
 * source of information the mono mix lacks").
 *
 * Mono collapses every pan to centre. It is safe precisely because bearing is
 * also in the contact log and on the scope — a player in mono loses the
 * convenience of hearing where something is, never the fact.
 */
export type Spatialisation = 'stereo' | 'mono';

export class ContactMixer {
  private readonly live = new Map<number, VoiceLike>();
  private spatialisation: Spatialisation = 'stereo';

  constructor(
    private readonly allocator: VoiceAllocator,
    private readonly createVoice: VoiceFactory
  ) {}

  get mode(): Spatialisation {
    return this.spatialisation;
  }

  /**
   * This mixer's claim on the Precedence Law's chain — §2, §13.
   *
   * `'contact'` for exactly as long as a voice is on the bus, and that is the
   * whole of the rule: §3 binds a voice to a contact "for as long as the
   * contact is tracked, including its 20 s ghost decay", and §13's table is
   * headed *while this sounds*. A looping voice sounds continuously, so the
   * row applies continuously. It is not a transient the way an own cue is,
   * and it is deliberately not modelled as one — a duck that expired while
   * the contact it was making room for was still sounding would put the water
   * back over the news.
   *
   * This getter exists because until #707 the `contact` row of `DUCK_TABLE`
   * was unreachable: the engine folded only the self mixer's cue and a line
   * being spoken, nothing ever named `contact` as the loudest rung, and so a
   * live contact ducked nothing at all. §13's row was transcribed correctly
   * and never applied — the same shape of fault as #661's two, a level the
   * doc states with nothing in the graph making it true.
   *
   * Read off the allocator rather than the `live` map because the allocator
   * is what actually decides a voice exists: a refused contact is tracked and
   * drawn and has no voice, and a contact with no voice is not sounding.
   */
  get activeRung(): BusRung | null {
    return this.allocator.size > 0 ? 'contact' : null;
  }

  setSpatialisation(mode: Spatialisation): void {
    this.spatialisation = mode;
  }

  /** Voices currently sounding. Exposed for the headless harness and tests. */
  get activeCount(): number {
    return this.live.size;
  }

  /**
   * Reconcile the mix against one Echo snapshot.
   *
   * `now` is the audio clock, not the wall clock: voices schedule against the
   * same timeline the engine hands out, so a batch of contacts resolved on one
   * tick sounds like one tick.
   */
  update(frame: ContactAudioFrame, now: number): void {
    // --- Contacts that are gone ---------------------------------------------
    // A contact absent from the frame has passed its ghost decay in the
    // renderer, which is the only place that expiry is decided. The voice ends
    // on the Echo tick that follows, which is as precise as this layer is
    // permitted to be about a fact the server sent (§12). A voice's own
    // mechanism is finer than the tick and may be; when it stops is not, and
    // `stop` takes the mechanism's committed events down with it.
    const present = new Set(frame.entries.map((entry) => entry.id));
    for (const id of [...this.live.keys()]) {
      if (present.has(id)) continue;
      this.live.get(id)!.stop(now);
      this.live.delete(id);
      this.allocator.release(id);
    }

    for (const entry of frame.entries) {
      const result = this.allocator.allocate({
        contactId: entry.id,
        tier: entry.tier,
        // Freshness is the tie-break of last resort in the stealing policy, and
        // it is the right one: between two contacts of equal tier and age, the
        // one already fading is the one the player is least owed.
        gain: entry.freshness,
        tick: frame.tick,
      });

      if (result.stolen !== null) {
        const victim = this.live.get(result.stolen.contactId);
        if (victim !== undefined) {
          victim.stop(now);
          this.live.delete(result.stolen.contactId);
        }
      }

      // Refused: the bus is full of contacts worth more than this one. The
      // player still sees it — refusing a voice removes a convenience, not a
      // fact (§11).
      if (result.voice === null) continue;

      let voice = this.live.get(entry.id);
      if (voice === undefined) {
        voice = this.createVoice(result.voice.slot);
        this.live.set(entry.id, voice);
      }

      voice.update(this.inputsFor(entry), now);
    }
  }

  /**
   * Entry to voice inputs.
   *
   * The one place where a tier is turned into what the ear is told, and so the
   * one place a fidelity leak could be introduced. It carries `bearing` and
   * `rangeM` straight through: the renderer has already withheld them at
   * Tier 1, and re-deriving them here from anything would be this layer
   * inventing knowledge.
   */
  private inputsFor(entry: ContactAudioEntry): VoiceInputs {
    const inputs: VoiceInputs = {
      tier: entry.tier,
      biome: entry.biome,
      freshness: entry.freshness,
    };
    if (entry.faction !== undefined) inputs.faction = entry.faction;
    if (entry.fauna !== undefined) inputs.fauna = entry.fauna;
    if (entry.ordnance !== undefined) inputs.ordnance = entry.ordnance;
    if (entry.rangeM !== undefined) inputs.rangeM = entry.rangeM;
    if (entry.bearing !== undefined && this.spatialisation === 'stereo') {
      inputs.bearing = entry.bearing;
    }
    return inputs;
  }

  /** Stop everything — match end, context loss, or a muted mix. */
  clear(now: number): void {
    for (const voice of this.live.values()) voice.stop(now);
    this.live.clear();
    this.allocator.clear();
  }
}
