/**
 * The port at night — the shell's music bed, docs/audio-direction.md §10.
 *
 * §10 governs the in-game score, and it is severe: "Music occupies **above
 * 800 Hz and below 40 Hz**. The 40-160 Hz contact band belongs to contacts,
 * permanently." This bed obeys the same law, and it is worth being explicit
 * about why, because in the shell there are no contacts to protect: the port
 * is where the player learns the vocabulary. A menu bed that filled the
 * contact band would spend the whole main menu teaching them that the band
 * where returns live is where music lives, and the first thing the ocean says
 * would arrive sounding like more of the same.
 *
 * So the piece is built in the two registers the law leaves: a pedal under
 * 40 Hz that is felt more than heard, and cold partials above 800 Hz. The
 * hole in the middle is the point — the shape of the mix the game is about,
 * with the ocean's voice missing from it.
 *
 * It is deliberately *not* the in-game score. That one is side-chained to
 * contacts 4:1 and follows the player's own SIG, so "the music swells when
 * they are exposed, not when they are winning" — which makes it a function of
 * a match rather than a loop, and there is no match here. This is the other
 * piece: unhurried, unreactive, and quiet enough that the title screen does
 * not announce itself.
 *
 * ## Why the composition is separated from the nodes
 *
 * `menuPhrase` is pure and deterministic, and the Web Audio half only renders
 * what it returns. That is what lets the band law be *tested* rather than
 * asserted in a comment — a partial that strayed into the contact band would
 * be a silent regression otherwise, audible only to whoever happened to be
 * listening on speakers that reproduce it.
 */

/**
 * SPEC — docs/audio-direction.md §10. The two registers music may occupy.
 *
 * Exported because the test asserts against them rather than against a copy:
 * a doc change that moved the band should move the piece, and a piece that
 * drifted out of it should fail loudly.
 */
export const MUSIC_BAND = { subMaxHz: 40, airMinHz: 800 } as const;

/**
 * The 200 ms grid — docs/style-neon-noir.md, "sonar cadence is the heartbeat".
 *
 * The Echo Layer resolves at 5 Hz and the interface quantises to it "so the
 * interface *feels* like sonar, not video". The menu has no Echo Layer, and
 * quantising to it anyway is the point: the player's sense of the game's pulse
 * should be set before they are in the water.
 */
export const GRID_MS = 200;

/** One loop of the piece. Long enough that a loop point is not a hook. */
export const PHRASE_MS = 48_000;

/**
 * The pedal. Two sines a fraction apart, so they beat against each other at
 * ~0.35 Hz — the breath of a hull holding pressure, and the reason the bottom
 * of the piece never sits perfectly still.
 *
 * Under 40 Hz means most speakers will not reproduce it at all. That is
 * acceptable here in a way it would not be for information: §11 reserves the
 * small-speaker profile for the contact band, where being inaudible would cost
 * a player something. A pedal nobody's laptop can play costs them atmosphere.
 */
export const PEDAL_HZ = [33.0, 33.35] as const;

/**
 * The partials, in Hz. A minor pentatonic on A, three octaves up, which puts
 * every note comfortably clear of the 800 Hz floor.
 *
 * Chosen for what it *cannot* do: a pentatonic has no semitone, so no two
 * partials sounding together can grind. The piece has to hold for as long as
 * someone leaves the game open on the title screen, and a set that can produce
 * a dissonance will eventually produce it.
 */
export const PARTIALS_HZ = [880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093] as const;

export interface MenuPartial {
  /** Milliseconds from the start of the phrase. Always on the grid. */
  atMs: number;
  durationMs: number;
  hz: number;
  /** Peak linear gain of this partial, before the bed's own ceiling. */
  gain: number;
}

/**
 * A deterministic 32-bit LCG.
 *
 * The piece must be the *same* piece every launch — a menu theme that was a
 * different theme each time is not a theme — and it must be a different phrase
 * each loop, or the loop point becomes a hook. Seeding by phrase index gives
 * both: launch twice and hear the same music, sit through it and hear it move.
 */
function lcg(seed: number): () => number {
  let state = (seed * 1664525 + 1013904223) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Compose one phrase.
 *
 * Sparse on purpose: about one onset every two seconds, each lasting several,
 * so what the player hears is a slow overlapping drift rather than a melody.
 * A melody in the port would be a piece of music; this is a room.
 */
export function menuPhrase(index: number): MenuPartial[] {
  const random = lcg(index * 7919 + 104729);
  const steps = Math.floor(PHRASE_MS / GRID_MS);
  const partials: MenuPartial[] = [];

  for (let step = 0; step < steps; step++) {
    if (random() > 0.1) continue;
    const hz = PARTIALS_HZ[Math.floor(random() * PARTIALS_HZ.length)]!;
    // 2.4-6.0 s. Long relative to the gap between onsets, which is what makes
    // the texture overlap rather than pulse.
    const durationMs = 2400 + Math.floor(random() * 3600);
    // The higher the partial, the quieter — otherwise the top of the set
    // dominates, because the ear does. This is the whole EQ the piece has.
    const height =
      (hz - PARTIALS_HZ[0]!) / (PARTIALS_HZ[PARTIALS_HZ.length - 1]! - PARTIALS_HZ[0]!);
    partials.push({
      atMs: step * GRID_MS,
      durationMs,
      hz,
      gain: 0.05 - 0.025 * height,
    });
  }

  return partials;
}

/**
 * Ceiling on the whole bed, as a linear gain.
 *
 * The engine's master already sits at MASTER_GAIN for the -18 LUFS / -1 dBTP
 * targets, and §12 makes the exposure cue "deliberately the loudest event in
 * the game". Nothing here should erode that headroom, so the bed is quiet
 * even before the user's music trim touches it — a main menu is not where a
 * mix should spend its ceiling.
 */
const BED_CEILING = 0.5;

/** Seconds to fade in on the first gesture, and out on leaving the port. */
const FADE_IN_S = 2.5;
const FADE_OUT_S = 0.35;

/** Attack and release of a single partial, as a fraction of its duration. */
const PARTIAL_SHAPE = { attack: 0.35, release: 0.55 } as const;

/**
 * How far ahead the scheduler queues, and how often it checks.
 *
 * The check has to run *many* times inside the window, not once at the end of
 * it. The first version ticked at `PHRASE_MS - QUEUE_AHEAD_MS` with a
 * `QUEUE_AHEAD_MS` horizon, so whether the next phrase was queued came down to
 * whether the audio clock had drifted a few milliseconds ahead of or behind
 * `setInterval` — and when it lost, the bed went silent for four seconds and
 * then stayed silent for another forty-four. Measured in a browser: the second
 * phrase was never queued at all. The loop body is a no-op when nothing is
 * due, so checking often is free.
 */
const QUEUE_AHEAD_MS = 6_000;
const QUEUE_TICK_MS = 2_000;

/**
 * Phrases to queue at most in one pass.
 *
 * A tab suspended for an hour comes back with a `nextPhraseAt` an hour in the
 * past, and an unbounded catch-up would schedule a thousand phrases into it on
 * the resuming frame.
 */
const MAX_QUEUED_PER_PASS = 4;

/**
 * When the next phrases should start — the scheduler's whole decision, as a
 * function of two clocks and nothing else.
 *
 * Pure and exported so the arithmetic can be tested: this is the part that was
 * wrong, and it was wrong in a way no type and no exception could catch. A
 * caller advances its own cursor to `nextAt`.
 */
export function duePhrases(
  nextPhraseAt: number,
  now: number,
  aheadS = QUEUE_AHEAD_MS / 1000
): { starts: number[]; nextAt: number } {
  const starts: number[] = [];
  // A cursor left in the past is pulled to now rather than honoured: the
  // phrases it names are already over, and scheduling them would only burn
  // oscillators on sound nobody can hear.
  let cursor = Math.max(nextPhraseAt, now);
  const horizon = now + aheadS;
  for (let i = 0; i < MAX_QUEUED_PER_PASS && cursor <= horizon; i++) {
    starts.push(cursor);
    cursor += PHRASE_MS / 1000;
  }
  return { starts, nextAt: cursor };
}

/**
 * The bed, as nodes.
 *
 * Attaches to whatever it is given — in practice the engine's `music` bus, so
 * the user's Music slider and the master volume both reach it without this
 * class knowing they exist.
 */
export class MenuBed {
  private readonly context: AudioContext;
  private readonly out: GainNode;
  private readonly air: GainNode;
  private readonly pedals: OscillatorNode[] = [];
  private readonly wash: AudioBufferSourceNode | null;
  /**
   * Partial oscillators that have not finished yet, so a stop can end them
   * rather than leave them sounding into the match that replaced the menu.
   * Entries remove themselves on `ended`; a long sit in the port must not
   * accumulate one node per partial ever played.
   */
  private readonly scheduled = new Set<OscillatorNode>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextPhrase = 0;
  /** Audio-clock time the next phrase starts at. */
  private nextPhraseAt = 0;
  private stopped = false;

  constructor(context: AudioContext, destination: AudioNode, noise: AudioBuffer | null) {
    this.context = context;

    this.out = context.createGain();
    this.out.gain.value = 0;
    this.out.connect(destination);

    // Everything above the 800 Hz floor shares one node, so the "air" half of
    // the piece can be shaped as one thing. A highpass on it is belt and
    // braces against a partial's own envelope clicking energy downward.
    this.air = context.createGain();
    this.air.gain.value = 1;
    const floor = context.createBiquadFilter();
    floor.type = 'highpass';
    floor.frequency.value = MUSIC_BAND.airMinHz;
    this.air.connect(floor).connect(this.out);

    for (const hz of PEDAL_HZ) {
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = hz;
      const gain = context.createGain();
      gain.gain.value = 0.5;
      // Straight to the output: the pedal must not go through the highpass
      // that guards the air register, which would remove it entirely.
      osc.connect(gain).connect(this.out);
      osc.start();
      this.pedals.push(osc);
    }

    // Rain on the glass — style-neon-noir's "rain-on-glass reflection on every
    // panel", which the menu is allowed and the in-game HUD is not. Noise
    // rolled off hard, sitting under the partials rather than beside them.
    this.wash = createWash(context, noise);
    if (this.wash !== null) {
      const shelf = context.createBiquadFilter();
      shelf.type = 'highpass';
      shelf.frequency.value = 1200;
      const level = context.createGain();
      level.gain.value = 0.012;
      this.wash.connect(shelf).connect(level).connect(this.out);
      this.wash.start();
    }
  }

  /**
   * What the bed is currently doing, for the headless harness.
   *
   * Reported rather than inferred because "the context is running and a
   * MenuBed exists" is not the same claim as "notes are sounding": a
   * scheduler that never queued would look identical from outside, and this
   * is a piece of music nobody can see.
   */
  get report(): { level: number; scheduled: number; phrases: number } {
    return { level: this.out.gain.value, scheduled: this.scheduled.size, phrases: this.nextPhrase };
  }

  /**
   * Begin. Fades in over a couple of seconds rather than arriving: the first
   * gesture on the title screen is a click on a menu entry, and music that
   * snapped in under it would read as a UI sound.
   */
  start(): void {
    if (this.stopped || this.timer !== null) return;
    const now = this.context.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(0, now);
    this.out.gain.linearRampToValueAtTime(BED_CEILING, now + FADE_IN_S);

    this.nextPhraseAt = now;
    this.queue();
    this.timer = setInterval(() => this.queue(), QUEUE_TICK_MS);
  }

  /** Queue every phrase whose start is inside the look-ahead window. */
  private queue(): void {
    if (this.stopped) return;
    const { starts, nextAt } = duePhrases(this.nextPhraseAt, this.context.currentTime);
    for (const at of starts) this.schedule(menuPhrase(this.nextPhrase++), at);
    this.nextPhraseAt = nextAt;
  }

  private schedule(partials: MenuPartial[], phraseAt: number): void {
    for (const partial of partials) {
      const at = phraseAt + partial.atMs / 1000;
      const seconds = partial.durationMs / 1000;
      let osc: OscillatorNode;
      let gain: GainNode;
      try {
        osc = this.context.createOscillator();
        gain = this.context.createGain();
      } catch {
        // The context closed under us mid-schedule. Nothing to recover.
        return;
      }
      osc.type = 'sine';
      osc.frequency.value = partial.hz;

      // Slow in, slower out, no sustain: a partial that held would be a note,
      // and a note would be a melody.
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(partial.gain, at + seconds * PARTIAL_SHAPE.attack);
      gain.gain.linearRampToValueAtTime(0, at + seconds);

      osc.connect(gain).connect(this.air);
      osc.start(at);
      osc.stop(at + seconds + 0.05);
      osc.addEventListener('ended', () => {
        this.scheduled.delete(osc);
        try {
          gain.disconnect();
          osc.disconnect();
        } catch {
          // Already gone with the context.
        }
      });
      this.scheduled.add(osc);
    }
  }

  /**
   * Fade out and end. Returns the seconds the caller should wait before
   * closing the context, so a menu leaving for a match does not cut its own
   * last note off with a click.
   */
  stop(): number {
    if (this.stopped) return 0;
    this.stopped = true;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;

    const now = this.context.currentTime;
    try {
      this.out.gain.cancelScheduledValues(now);
      this.out.gain.setValueAtTime(this.out.gain.value, now);
      this.out.gain.linearRampToValueAtTime(0, now + FADE_OUT_S);
      for (const osc of this.pedals) osc.stop(now + FADE_OUT_S + 0.05);
      this.wash?.stop(now + FADE_OUT_S + 0.05);
      for (const osc of this.scheduled) osc.stop(now + FADE_OUT_S + 0.05);
    } catch {
      // A context already closing refuses these; the fade is a courtesy.
    }
    this.scheduled.clear();
    return FADE_OUT_S + 0.1;
  }
}

function createWash(
  context: AudioContext,
  noise: AudioBuffer | null
): AudioBufferSourceNode | null {
  if (noise === null) return null;
  try {
    const source = context.createBufferSource();
    source.buffer = noise;
    source.loop = true;
    return source;
  } catch {
    return null;
  }
}
