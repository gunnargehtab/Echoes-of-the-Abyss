/**
 * Echo Marks, as sound — docs/audio-direction.md §6.
 *
 * "Echo Marks are residue, not presence, and the mix must say so. Their rule
 * is simple: **no transients.** A mark's sound is reverb-only — the tail of an
 * event with the event removed, band-limited to 120-800 Hz, and always at
 * least 6 dB below the live contact bus."
 *
 * That rule is why this is three continuous beds rather than one voice per
 * mark. A voice per mark would have onsets, and an onset is a transient: the
 * moment a scout drifted into range of a ninety-second-old battle site, the
 * mix would announce it like a detection. The past does not announce itself.
 *
 * The doc also names the failure mode in both directions: "If a player can
 * mistake a mark for a contact, the mark is mixed wrong. If a player can
 * mistake a mark for *nothing*, it is mixed wrong in the other direction, and
 * the scouting economy dies."
 */

import { EchoMarkKind } from '@echoes/shared';
import { ensureNoiseBuffer } from './contactVoice.ts';

/** SPEC — §6. The band residue is confined to. */
const BAND = { lowHz: 120, highHz: 800 } as const;

/**
 * Ceiling on the mark bus, as a linear gain.
 *
 * §6 requires marks sit "at least 6 dB below the live contact bus". −6 dB is
 * 0.5; this is below that, because the contact bus itself is not always at
 * full and the margin has to hold when it is not.
 */
const MARK_CEILING = 0.34;

/**
 * Seconds to reach a new level.
 *
 * Long, and that is the whole point. Anything fast enough to be perceived as
 * an onset would be a transient, and §6 forbids transients outright.
 */
const RAMP_S = 2.5;

interface Bed {
  gain: GainNode;
  filter: BiquadFilterNode;
  source: AudioBufferSourceNode | null;
  osc: OscillatorNode | null;
}

/** Voicing per kind — §6's table, as filter settings rather than samples. */
const VOICING: Record<EchoMarkKind, { centreHz: number; q: number; tone: number | null }> = {
  // "Overlapping metallic decay, no strikes." Narrow and ringing, up the band.
  [EchoMarkKind.Battle]: { centreHz: 620, q: 3.2, tone: null },
  // "Slow settling groan, descending." Low, wide, and tonal underneath.
  [EchoMarkKind.DestroyedStructure]: { centreHz: 180, q: 1.1, tone: 63 },
  // "Steady, tonal, unhurried — the sound of someone else's economy."
  [EchoMarkKind.IndustrialHum]: { centreHz: 300, q: 6, tone: 97 },
};

export class MarkBed {
  private readonly beds = new Map<EchoMarkKind, Bed>();
  private stopped = false;

  constructor(context: AudioContext, destination: AudioNode) {
    for (const kind of [
      EchoMarkKind.Battle,
      EchoMarkKind.DestroyedStructure,
      EchoMarkKind.IndustrialHum,
    ]) {
      const voicing = VOICING[kind];
      const gain = context.createGain();
      gain.gain.value = 0;

      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = voicing.centreHz;
      filter.Q.value = voicing.q;

      // A second filter to hold the top of the band: §6 gives a ceiling of
      // 800 Hz, and a single bandpass at low Q leaks well past it.
      const cap = context.createBiquadFilter();
      cap.type = 'lowpass';
      cap.frequency.value = BAND.highHz;

      const cut = context.createBiquadFilter();
      cut.type = 'highpass';
      cut.frequency.value = BAND.lowHz;

      const source = createNoise(context);
      source?.connect(filter);

      let osc: OscillatorNode | null = null;
      if (voicing.tone !== null) {
        osc = context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = voicing.tone;
        const toneGain = context.createGain();
        toneGain.gain.value = 0.35;
        osc.connect(toneGain).connect(filter);
      }

      filter.connect(cut).connect(cap).connect(gain).connect(destination);
      source?.start();
      osc?.start();

      this.beds.set(kind, { gain, filter, source, osc });
    }
  }

  /**
   * Set each bed from the residue the player can currently read.
   *
   * Takes summed intensity per kind rather than a mark list: the bed is "how
   * much of the past is around me", not "where each piece of it is". Position
   * belongs to the marks on screen, which is where §11 wants it — a bed that
   * panned would be claiming a bearing the mark layer never resolved.
   */
  update(intensityByKind: Map<EchoMarkKind, number>, now: number): void {
    if (this.stopped) return;
    for (const [kind, bed] of this.beds) {
      const total = intensityByKind.get(kind) ?? 0;
      // Saturating rather than linear: three faint marks and one strong one
      // should not sound the same, but ten should not be three times four.
      const level = MARK_CEILING * (1 - Math.exp(-total));
      bed.gain.gain.setTargetAtTime(level, now, RAMP_S / 3);
    }
  }

  stop(now: number): void {
    if (this.stopped) return;
    this.stopped = true;
    for (const bed of this.beds.values()) {
      bed.gain.gain.cancelScheduledValues(now);
      bed.gain.gain.setTargetAtTime(0, now, 0.4);
      try {
        bed.source?.stop(now + 1.5);
        bed.osc?.stop(now + 1.5);
      } catch {
        // Already stopped.
      }
    }
  }
}

function createNoise(context: AudioContext): AudioBufferSourceNode | null {
  const buffer = ensureNoiseBuffer(context);
  if (buffer === null) return null;
  try {
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  } catch {
    return null;
  }
}
