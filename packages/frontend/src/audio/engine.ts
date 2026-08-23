/**
 * The audio engine — the bus graph from docs/audio-direction.md §12.
 *
 * §1 states the premise this whole module serves: the mix is the *primary*
 * information channel, not decoration on top of one. Everything here exists to
 * make that channel trustworthy — the voice cap so the low band stays legible,
 * the tick alignment so the mix never implies knowledge the server did not
 * send, the ducking so a contact is never buried under music.
 *
 *   AudioContext
 *   ├── musicBus ──► duck ──┐
 *   ├── worldBus  ──────────┤
 *   ├── contactBus ─────────┼──► master ──► destination
 *   ├── selfBus   ──────────┤
 *   └── uiBus     ──────────┘
 *
 * **Audio is presentation only.** No audio state may feed back into the
 * simulation, and the mix must never be the reason two clients disagree
 * (§12, determinism note). Nothing in this directory imports from the
 * simulation, and the backend has no idea it exists.
 *
 * Two deliberate departures from §12, both recorded in the doc:
 *
 * 1. **The music sidechain is a measured duck, not a compressor sidechain.**
 *    Web Audio's DynamicsCompressorNode has no sidechain input — there is no
 *    way to key one node's compression from another's level. So the music bus
 *    carries a gain node driven from the contact bus's measured level, updated
 *    on the Echo tick. Same audible result, different mechanism.
 *
 * 2. **Voices are synthesised, not sampled.** The repository ships no audio
 *    assets, and sonar is unusually well suited to synthesis: tonal returns
 *    and filtered noise beds are what the material actually is. The buffer
 *    path is here for when banks exist; §12's Opus/AAC format requirement
 *    applies to those banks and not to the prototype.
 */

import { SIM } from '@echoes/shared';
import { MAX_CONTACT_VOICES, VoiceAllocator } from './voiceAllocator.ts';

/** SPEC — docs/audio-direction.md §12. Milliseconds per Echo tick. */
export const AUDIO_BUDGET_MS = 1;

/**
 * Master gain, chosen for the doc's -18 LUFS / -1 dBTP target.
 *
 * The headroom is not spare: §12 makes the exposure cue "deliberately the
 * loudest event in the game", so the mix has to sit low enough that being
 * heard can still be louder than everything else.
 */
const MASTER_GAIN = 0.5;

/** How far music ducks when the contact bus is busy, and how fast it recovers. */
const DUCK = { FLOOR: 0.35, ATTACK_S: 0.08, RELEASE_S: 0.6 } as const;

export interface AudioBuses {
  music: GainNode;
  world: GainNode;
  contact: GainNode;
  self: GainNode;
  ui: GainNode;
  master: GainNode;
}

export type AudioEngineState = 'idle' | 'running' | 'suspended' | 'unsupported';

export class AudioEngine {
  private context: AudioContext | null = null;
  private buses: AudioBuses | null = null;
  private duckGain: GainNode | null = null;
  private contactAnalyser: AnalyserNode | null = null;
  /**
   * Typed as backed by a plain ArrayBuffer rather than ArrayBufferLike:
   * getFloatTimeDomainData refuses a SharedArrayBuffer-backed view, and the
   * default Float32Array type is wide enough to include one.
   */
  private analyserBuffer = new Float32Array(new ArrayBuffer(0));

  readonly voices = new VoiceAllocator(MAX_CONTACT_VOICES);

  /** Rolling worst-case cost of a tick's audio work, against AUDIO_BUDGET_MS. */
  private worstTickMs = 0;
  private detachLifecycle: (() => void) | null = null;

  get state(): AudioEngineState {
    if (this.context === null) return 'idle';
    if (this.context.state === 'suspended') return 'suspended';
    if (this.context.state === 'closed') return 'unsupported';
    return 'running';
  }

  get worstTickCostMs(): number {
    return this.worstTickMs;
  }

  /** The bus graph, once started. Exposed so voice sources can attach. */
  get graph(): AudioBuses | null {
    return this.buses;
  }

  get audioContext(): AudioContext | null {
    return this.context;
  }

  /**
   * Build the graph. Safe to call repeatedly; only the first call does work.
   *
   * Browsers refuse to start an AudioContext without a user gesture, so this
   * is called from the first real input rather than at mount — see `unlock`.
   */
  start(): void {
    if (this.context !== null) return;
    const Ctor: typeof AudioContext | undefined =
      typeof window !== 'undefined'
        ? (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined;
    if (Ctor === undefined) return;

    const context = new Ctor();
    this.context = context;

    const master = context.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(context.destination);

    const make = (): GainNode => {
      const bus = context.createGain();
      bus.gain.value = 1;
      return bus;
    };

    const music = make();
    const world = make();
    const contact = make();
    const self = make();
    const ui = make();

    // Music is the one bus that does not reach master directly: it passes
    // through a duck so a contact is never buried under the score.
    const duck = context.createGain();
    duck.gain.value = 1;
    music.connect(duck).connect(master);

    world.connect(master);
    contact.connect(master);
    self.connect(master);
    ui.connect(master);

    // Taps the contact bus to drive the duck. An analyser rather than a
    // ScriptProcessor: this is measured once per Echo tick, not per sample.
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    contact.connect(analyser);
    this.analyserBuffer = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));

    this.buses = { music, world, contact, self, ui, master };
    this.duckGain = duck;
    this.contactAnalyser = analyser;

    this.attachLifecycle();
  }

  /**
   * Resume after the first user gesture.
   *
   * Autoplay policy blocks a context created without one, and a game whose
   * primary channel is audio cannot afford the player hunting for a mute
   * button that is really a "start" button.
   */
  async unlock(): Promise<void> {
    this.start();
    if (this.context === null) return;
    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch {
        // A refused resume leaves the game playable in silence, which is a
        // degraded experience but not a broken one (docs/ui-ux.md §11 makes
        // full playability muted a requirement anyway).
      }
    }
  }

  /**
   * An unfocused tab that keeps emitting contact voices is a nuisance rather
   * than a feature (§12). State is held, not torn down, so refocusing
   * resumes the same mix rather than restarting it.
   */
  private attachLifecycle(): void {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      const context = this.context;
      if (context === null) return;
      if (document.hidden) void context.suspend().catch(() => {});
      else void context.resume().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.detachLifecycle = () => document.removeEventListener('visibilitychange', onVisibility);
  }

  /**
   * Per-Echo-tick work: update the duck from measured contact level.
   *
   * Called on the 5 Hz snapshot rather than per frame, because scheduling is
   * aligned to the tick contacts actually arrive on — anything smoother would
   * imply knowledge the server did not send (§12).
   */
  onEchoTick(): void {
    const started = performance.now();

    const analyser = this.contactAnalyser;
    const duck = this.duckGain;
    const context = this.context;
    if (analyser !== null && duck !== null && context !== null) {
      analyser.getFloatTimeDomainData(this.analyserBuffer);
      let peak = 0;
      for (let i = 0; i < this.analyserBuffer.length; i++) {
        const v = Math.abs(this.analyserBuffer[i]!);
        if (v > peak) peak = v;
      }
      const target = peak > 0.02 ? DUCK.FLOOR : 1;
      const ramp = target < duck.gain.value ? DUCK.ATTACK_S : DUCK.RELEASE_S;
      duck.gain.setTargetAtTime(target, context.currentTime, ramp);
    }

    const cost = performance.now() - started;
    if (cost > this.worstTickMs) this.worstTickMs = cost;
  }

  /**
   * The audio-clock time the next Echo tick's sounds should start at.
   *
   * Voices are scheduled onto the shared clock rather than fired immediately,
   * so a batch of contacts resolved on one tick sounds like one tick rather
   * than a ragged scatter across whatever frame each happened to be handled in.
   */
  nextTickTime(): number {
    const context = this.context;
    if (context === null) return 0;
    return context.currentTime + 1 / SIM.ECHO_HZ;
  }

  /** Stop everything and release the device. */
  async destroy(): Promise<void> {
    this.detachLifecycle?.();
    this.detachLifecycle = null;
    this.voices.clear();
    const context = this.context;
    this.context = null;
    this.buses = null;
    this.duckGain = null;
    this.contactAnalyser = null;
    if (context !== null) {
      try {
        await context.close();
      } catch {
        // Already closed, or never opened. Nothing to recover.
      }
    }
  }
}
