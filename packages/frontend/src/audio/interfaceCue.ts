/**
 * The interface cues — docs/audio-direction.md §12, "Three interface cues, off
 * by default" (#1600).
 *
 * Three soft taps on the ui bus: an order that painted its marker, a structure
 * placed, a press the shell refused with its reason on the hint bar. They are
 * the idle notice's register (`selfVoice.ts`'s `playNotice`) — the interface
 * speaking, not the water — and keep its three rules: every partial above the
 * 40–160 Hz contact band, no precedence rung, nothing ducked.
 *
 * Off by default, and the default is the argument rather than a preference:
 * in this game a sound means something is in the water, and a cue on every
 * click teaches the player to stop listening (§1). The toggle is for the
 * player who cannot read the water yet and gets no word that a click landed.
 *
 * A cue says the *interface* took the click, never that the room did. The
 * room refuses a bad order or an illegal site silently (`wire.ts`), so the
 * only refusals this can voice are the shell's own — which are exactly the
 * ones the hint bar already names (§11: nothing here is audio-only).
 */

export type InterfaceCue = 'order' | 'placed' | 'refused';

/**
 * SPEC — §12. A cue of the same kind this soon after the last is dropped.
 *
 * One right-click that sends the harvesters to a field and their escort beside
 * it is two orders and one gesture, and the player made one gesture. 60 ms is
 * well under the fastest a hand repeats a click and well over the gap between
 * two calls the same handler makes.
 */
export const INTERFACE_CUE_GAP_S = 0.06;

/**
 * Whether a cue sounds, decided apart from Web Audio so it can be tested alone.
 *
 * Kinds gate independently: a click that orders the free half of a selection
 * and refuses the held half did both, and the marker and the hint bar say both.
 */
export class InterfaceCueGate {
  on = false;
  private readonly lastAt: Record<InterfaceCue, number> = {
    order: Number.NEGATIVE_INFINITY,
    placed: Number.NEGATIVE_INFINITY,
    refused: Number.NEGATIVE_INFINITY,
  };

  /** True when `cue` should sound at audio-clock time `now`; records it if so. */
  admit(cue: InterfaceCue, now: number): boolean {
    if (!this.on) return false;
    if (now - this.lastAt[cue] < INTERFACE_CUE_GAP_S) return false;
    this.lastAt[cue] = now;
    return true;
  }
}

/**
 * TUNABLE — each cue's taps, as [offset s, frequency Hz]. The voicing is free
 * to move; what §12 pins is that every partial clears the 40–160 Hz contact
 * band. Pure sines, so the frequency is the whole spectrum and the band is
 * cleared by reading this table.
 *
 * Shaped against the notice's two *descending* taps (620 → 430) so none of the
 * four is another's: an order is one bright tap, a placement two rising, a
 * refusal two level and low — the "no" of the set, still twice the band's top.
 */
export const INTERFACE_CUE_TAPS: Record<InterfaceCue, ReadonlyArray<readonly [number, number]>> = {
  order: [[0, 740]],
  placed: [
    [0, 480],
    [0.1, 720],
  ],
  refused: [
    [0, 330],
    [0.09, 330],
  ],
};

/** TUNABLE — peak gain of one tap: the notice's, so no cue is louder than the chore. */
const TAP_PEAK = 0.16;

export function playInterfaceCue(
  context: AudioContext,
  destination: AudioNode,
  at: number,
  cue: InterfaceCue
): void {
  for (const [offset, freq] of INTERFACE_CUE_TAPS[cue]) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, at + offset);
    gain.gain.setValueAtTime(0, at + offset);
    gain.gain.linearRampToValueAtTime(TAP_PEAK, at + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + offset + 0.07);
    osc.connect(gain).connect(destination);
    osc.start(at + offset);
    osc.stop(at + offset + 0.1);
  }
}
