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

import { SIM, type EchoMarkKind } from '@echoes/shared';
import { ContactMixer, type ContactAudioFrame, type Spatialisation } from './contactMixer.ts';
import { ContactVoice, ensureNoiseBuffer } from './contactVoice.ts';
import { MarkBed } from './markBed.ts';
import { duckFor } from './precedence.ts';
import { SelfMixer, type SelfAudioFrame } from './selfMixer.ts';
import {
  SelfBed,
  playBreakSilence,
  playExposure,
  playPingReturn,
  playPingTransmit,
} from './selfVoice.ts';
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
  private mixer: ContactMixer | null = null;
  private selfMixer: SelfMixer | null = null;
  private selfBed: SelfBed | null = null;
  private markBed: MarkBed | null = null;
  private pendingMarks: Map<EchoMarkKind, number> | null = null;
  private pendingSelf: SelfAudioFrame | null = null;
  /**
   * The most recent contact picture, held until the tick consumes it.
   *
   * Buffered rather than applied on arrival so the mixing cost lands inside
   * the measured tick and counts against AUDIO_BUDGET_MS. A frame that
   * arrives twice before a tick is simply superseded — the newer one is
   * strictly better information.
   */
  private pendingFrame: ContactAudioFrame | null = null;
  private spatialisation: Spatialisation = 'stereo';

  /** Rolling worst-case cost of a tick's audio work, against AUDIO_BUDGET_MS. */
  private worstTickMs = 0;
  /**
   * Cost of the most recent tick.
   *
   * Reported alongside the worst case because the two answer different
   * questions: a budget blown only on the tick that *builds* voices is a
   * different problem from one blown every tick, and the worst-case figure
   * alone cannot tell them apart.
   */
  private lastTickMs = 0;
  /** New voices built on the most recent tick. */
  private lastTickBuilt = 0;
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

  get lastTickCostMs(): number {
    return this.lastTickMs;
  }

  get lastTickVoicesBuilt(): number {
    return this.lastTickBuilt;
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
    // Built here, at the unlock gesture, so the first contact of a match does
    // not pay 44,100 samples of noise inside a 1 ms tick.
    ensureNoiseBuffer(context);
    this.mixer = new ContactMixer(this.voices, () => {
      this.lastTickBuilt++;
      return new ContactVoice(context, contact);
    });

    // The self bus carries both the continuous bed and the one-shots, so the
    // Precedence Law can duck everything below it from a single place.
    // Residue rides the world bus, not the contact bus: it is the environment
    // remembering, not a detection, and §4's own-noise attenuation should make
    // a loud player deaf to the past exactly as it does to the present.
    this.markBed = new MarkBed(context, world);

    const bed = new SelfBed(context, self);
    this.selfBed = bed;
    this.selfMixer = new SelfMixer({
      bed: (mix, now) => bed.update(mix, now),
      world: (gain, now) => world.gain.setTargetAtTime(gain, now, 0.2),
      transmit: (at) => playPingTransmit(context, self, at),
      ret: (at, pan) => playPingReturn(context, self, at, pan),
      exposure: (at, pan) => playExposure(context, self, at, pan),
      breakSilence: (at) => playBreakSilence(context, self, at),
    });
    this.mixer.setSpatialisation(this.spatialisation);
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

    this.lastTickBuilt = 0;
    const mixer = this.mixer;
    const frame = this.pendingFrame;
    this.pendingFrame = null;
    if (mixer !== null && frame !== null && this.context !== null) {
      mixer.update(frame, this.context.currentTime);
    }

    const markBed = this.markBed;
    const marks = this.pendingMarks;
    this.pendingMarks = null;
    if (markBed !== null && marks !== null && this.context !== null) {
      markBed.update(marks, this.context.currentTime);
    }

    const selfMixer = this.selfMixer;
    const selfFrame = this.pendingSelf;
    this.pendingSelf = null;
    if (selfMixer !== null && selfFrame !== null && this.context !== null) {
      selfMixer.update(selfFrame, this.context.currentTime);
      // The rest of the chain. `world` is set inside the self mixer, because
      // it also carries §4's own-noise attenuation; the others are pure
      // precedence and belong here.
      const rung = selfMixer.activeRung;
      const buses = this.buses;
      if (buses !== null) {
        const now = this.context.currentTime;
        buses.contact.gain.setTargetAtTime(duckFor('contact', rung), now, 0.15);
        buses.music.gain.setTargetAtTime(duckFor('music', rung), now, 0.25);
      }
    }

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
    this.lastTickMs = cost;
    if (cost > this.worstTickMs) this.worstTickMs = cost;
  }

  /**
   * Hand the mix the contact picture resolved on this tick.
   *
   * Separate from `onEchoTick` so the caller cannot accidentally mix on a
   * frame boundary: this only records, and the tick applies.
   */
  applyContacts(frame: ContactAudioFrame): void {
    this.pendingFrame = frame;
  }

  /** Hand the mix the residue the player can currently read (§6). */
  applyMarks(intensityByKind: Map<EchoMarkKind, number>): void {
    this.pendingMarks = intensityByKind;
  }

  /** Hand the mix what is true of the player's own force on this tick. */
  applySelf(frame: SelfAudioFrame): void {
    this.pendingSelf = frame;
  }

  /** How many of each self-event this session has played. */
  get selfCuesFired(): Record<string, number> {
    return this.selfMixer?.firedCounts ?? {};
  }

  /** Which rung of the Precedence Law is currently sounding, if any. */
  get activeRung(): string | null {
    return this.selfMixer?.activeRung ?? null;
  }

  get activeContactVoices(): number {
    return this.mixer?.activeCount ?? 0;
  }

  /**
   * Mono collapses every pan to centre (docs/audio-direction.md §11).
   *
   * Safe because bearing is never audio-only: it is in the contact log and on
   * the sonar scope, so mono costs the convenience of hearing where something
   * is, never the fact of it.
   */
  setSpatialisation(mode: Spatialisation): void {
    this.spatialisation = mode;
    this.mixer?.setSpatialisation(mode);
  }

  get spatialisationMode(): Spatialisation {
    return this.spatialisation;
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
    this.mixer?.clear(this.context?.currentTime ?? 0);
    this.mixer = null;
    this.markBed?.stop(this.context?.currentTime ?? 0);
    this.markBed = null;
    this.pendingMarks = null;
    this.selfBed?.stop(this.context?.currentTime ?? 0);
    this.selfBed = null;
    this.selfMixer?.reset();
    this.selfMixer = null;
    this.pendingSelf = null;
    this.pendingFrame = null;
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
