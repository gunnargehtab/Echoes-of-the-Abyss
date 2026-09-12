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
 *   ├── musicBus ──► duck ──► trim ──┐
 *   ├── worldBus  ──────────► trim ──┤
 *   ├── contactBus ─────────► trim ──┤
 *   ├── speechBus ──────────► trim ──┼──► master ──► destination
 *   ├── selfBus   ──────────► trim ──┤
 *   └── uiBus     ──────────► trim ──┘
 *
 * The one node after master is the output ceiling — see CEILING below. Nothing
 * reaches the device without passing through it.
 *
 * The trims are user volume (docs/audio-direction.md §11 — independent buses,
 * contacts boostable to +12 dB) and are deliberately separate nodes: the bus
 * gains belong to the Precedence Law and the self mixer, which write them on
 * the tick, and a user slider must not fight that.
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

import { SIM, type EchoMarkKind, type MissionSpeaker, type MissionVoice } from '@echoes/shared';
import { ContactMixer, type ContactAudioFrame, type Spatialisation } from './contactMixer.ts';
import { ContactVoice, ensureNoiseBuffer } from './contactVoice.ts';
import { MarkBed } from './markBed.ts';
import { TunedBed, tunedMixFor, type TunedInputs, type TunedMix } from './tunedBed.ts';
import { duckFor, louderRung, type BusRung } from './precedence.ts';
import { SelfMixer, type SelfAudioFrame } from './selfMixer.ts';
import { playHail, readingSeconds } from './speechVoice.ts';
import {
  SelfBed,
  SourBed,
  playBreakSilence,
  playExposure,
  playNotice,
  playPingReturn,
  playPingTransmit,
  playSourBite,
  playUnderFire,
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

/**
 * SPEC — docs/audio-direction.md §12: "-18 LUFS integrated, -1 dBTP".
 *
 * The integrated figure is a property of the material and MASTER_GAIN above
 * serves it. The true-peak figure is not: six buses sum into master, the world
 * bus goes to +6 dB under Silent Running (§4), the contact trim may add +12 dB
 * (§11), and the exposure strike is "deliberately the loudest event in the
 * game" (§5). Those are all correct individually and their *sum* is what
 * reaches the device, so nothing in the graph was holding the ceiling the doc
 * states — the mix simply ran past full scale and the device hard-clipped it.
 * Measured at the worst case the self bus alone can produce: 1.85, or +5.3 dB
 * past full scale.
 *
 * Clipping is not a quieter or dirtier version of the mix. It is broadband
 * distortion that arrives fastest exactly when the player is loudest, which
 * made a rising SIG band audibly painful rather than oppressive.
 *
 * A trim would be the wrong fix: it buys headroom by making the quiet mix
 * quieter, spending the dynamic range §4 needs in order to make being loud
 * *feel* like something, and it still clips whenever enough cues land at once.
 *
 * **Not a DynamicsCompressorNode**, which is the obvious tool and the wrong
 * one: Chromium's implementation applies an internal makeup gain that grows as
 * the threshold falls — measured at +3.4 dB with a -6 dB threshold and +7.0 dB
 * with -12 dB, on signal far below either. That silently raises the whole mix,
 * moves the integrated target this file's MASTER_GAIN exists to hold, and does
 * it by an amount no part of the spec predicts and other engines need not
 * match.
 *
 * So: a static soft-clip curve. It is exactly transparent below KNEE, bends
 * smoothly above it, and cannot exceed PEAK however hard it is driven. Every
 * engine renders it identically because it is arithmetic rather than a
 * behaviour, and it adds no latency, no gain, and nothing to pump.
 *
 * What it does not do is what a true look-ahead limiter would: the bend is
 * harmonic distortion rather than transparent gain reduction. That is the
 * trade being made deliberately — the material above KNEE was previously
 * being hard-clipped by the device, and a soft knee is strictly the gentler
 * of the two. A look-ahead limiter needs an AudioWorklet and is a larger
 * change than a hearing-safety fix should carry.
 */
const CEILING = {
  /** Linear. Below this the curve is the identity and the mix is untouched. */
  KNEE: 0.6,
  /** -1 dBTP, as a linear peak. The curve approaches this and never passes it. */
  PEAK: 0.891,
  /**
   * Input range the curve covers, as a multiple of full scale.
   *
   * A WaveShaperNode clamps its input to ±1 before looking the curve up, so
   * the curve has to be driven through a pre-gain of 1/RANGE for anything
   * above full scale to be shaped rather than flattened. 3 is comfortably
   * past the 1.85 worst case measured above.
   */
  RANGE: 3,
  /** Samples in the curve. Odd, so the midpoint is exactly zero. */
  POINTS: 8193,
} as const;

/**
 * The soft-clip curve, as a pure function of level — exported so the shape can
 * be asserted directly rather than inferred from node settings.
 *
 * Identity below the knee; above it, a tanh bend whose slope is continuous at
 * the knee (so there is no audible corner where limiting begins) and whose
 * asymptote is exactly PEAK.
 */
export function ceilingShape(level: number): number {
  const sign = level < 0 ? -1 : 1;
  const magnitude = Math.abs(level);
  if (magnitude <= CEILING.KNEE) return level;
  const span = CEILING.PEAK - CEILING.KNEE;
  return sign * (CEILING.KNEE + span * Math.tanh((magnitude - CEILING.KNEE) / span));
}

/** The curve as a WaveShaperNode wants it: POINTS samples over [-RANGE, RANGE]. */
export function ceilingCurve(): Float32Array<ArrayBuffer> {
  // Allocated over an explicit ArrayBuffer for the same reason the analyser's
  // read buffer is: the default Float32Array type admits a SharedArrayBuffer
  // and `WaveShaperNode.curve` does not.
  const curve = new Float32Array(new ArrayBuffer(CEILING.POINTS * 4));
  const last = CEILING.POINTS - 1;
  for (let i = 0; i <= last; i++) {
    curve[i] = ceilingShape(((i / last) * 2 - 1) * CEILING.RANGE);
  }
  return curve;
}

/**
 * How far the contact bus comes down for carrying many voices at once (#663).
 *
 * §12 budgets 24 simultaneous contact voices and says why: "beyond this the
 * low band turns to mud and nothing is legible". What it never said is what
 * happens to the *level* on the way there, and the answer was nothing at all —
 * the voices simply summed. Measured at the bus (tools/audio-meter), one
 * classified contact sits sensibly against §12's -18 LUFS target; seven reach
 * +1.7 dBFS peak and twenty-four reach +7.9, which is a mix that exists only
 * to be bent back by the output ceiling. A soft-clip is a hearing-safety net,
 * not a mixing desk, and a mix that lives inside its knee has spent its
 * dynamic range before the exposure strike gets there.
 *
 * So the bus holds roughly constant *power* as voices arrive rather than
 * constant amplitude per voice: 1/sqrt(n), which is the sum law for sources
 * that are not in phase with each other. One contact is untouched — the
 * reference the per-voice levels were chosen against does not move — and the
 * whole 24-voice budget costs 13.8 dB, which is very close to what the same
 * measurement says twenty-four voices actually add.
 *
 * **Every voice scales together**, so nothing about which contact is louder
 * than which changes, and §3's tier levels keep saying exactly what they said.
 * A crowded ocean is quieter per contact, which is also true of a crowded
 * ocean. What it is not allowed to be is louder in total than the mix has room
 * for, because that buries the one contact the player needed under the six
 * they did not.
 */
export function crowdGain(voices: number): number {
  return voices <= 1 ? 1 : 1 / Math.sqrt(voices);
}

/**
 * The self bus's low cut, Hz — docs/audio-direction.md §4 and §11 (#663).
 *
 * Everything below roughly 60 Hz is inaudible on a phone speaker and is not
 * free: the driver answers it with excursion, which comes back as
 * intermodulation across the bands that carry information. Measured before
 * this filter existed, the self bed was 93-98% sub-60 Hz in every one of §4's
 * four SIG bands (tools/audio-meter) — so the loudest continuous layer in the
 * mix was spending almost all of itself on the one octave the reporting device
 * could only distort. That is heard as a hum that gets harsher rather than
 * louder, which is exactly what #663 describes and exactly what a -1 dBTP
 * ceiling cannot help with.
 *
 * On the **self** bus and nowhere else. The contact bus keeps its bottom
 * octave because §11 pins the contact band at 40-160 Hz and a filter there
 * would delete information the mix exists to deliver. §4 reserves the low band
 * for a crush cue that does not exist yet, and this does not spend that
 * reservation: "the low band the hull already occupies" is the bed's own
 * 44-1,100 Hz, all of which passes. What is removed is below the plant's
 * fundamental, where nothing is authored and nothing is reserved.
 *
 * A gentle 12 dB/octave, not a brick wall: the fundamental is still *sent*,
 * about 6 dB down, and §4's "low harmonic" is meant to be felt on a system
 * that can reproduce it. The bed's own partials (selfVoice.ts TONE_PARTIALS)
 * are what make it audible on a system that cannot.
 */
export const SELF_LOW_CUT_HZ = 60;

/**
 * The low cut as a node — one definition, so the meter measures the bed
 * through the same filter the player hears it through.
 *
 * Q at Butterworth rather than the Web Audio default of 1, which would put a
 * 1 dB resonant lift at the corner: a filter added to take energy *out* of
 * that region has no business adding any back.
 */
export function createSelfLowCut(context: AudioContext): BiquadFilterNode {
  const filter = context.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = SELF_LOW_CUT_HZ;
  filter.Q.value = Math.SQRT1_2;
  return filter;
}

/** Decibels to linear gain — the settings screen speaks dB, the graph gain. */
export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * SPEC — docs/audio-direction.md §11: "Contacts may be boosted to +12 dB above
 * the reference mix." The one bus a user trim may take above unity, and the
 * cap that keeps the boost from spending more than the headroom §12 reserves.
 */
export const CONTACT_BOOST_MAX_DB = 12;

/** The buses a user volume trim exists for. Master is separate. */
export type TrimBus = 'music' | 'world' | 'contact' | 'speech' | 'self' | 'ui';

/**
 * One authored line, reduced to what the mix needs — docs/audio-direction.md
 * §13. The register picks the hail's material and the speaker signs it; the
 * text's length is the bed's duration and nothing else about the text is
 * read. The words are the log's.
 */
export interface SpeechLine {
  voice: MissionVoice;
  speakerId: MissionSpeaker;
  text: string;
}

/** How the ramp of a user volume change is smoothed, in seconds. */
const TRIM_RAMP_S = 0.03;

export interface AudioBuses {
  music: GainNode;
  world: GainNode;
  contact: GainNode;
  speech: GainNode;
  self: GainNode;
  ui: GainNode;
  master: GainNode;
}

export type AudioEngineState = 'idle' | 'running' | 'suspended' | 'unsupported';

export class AudioEngine {
  private context: AudioContext | null = null;
  private buses: AudioBuses | null = null;
  private ceiling: WaveShaperNode | null = null;
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
  private sourBed: SourBed | null = null;
  private markBed: MarkBed | null = null;
  private pendingMarks: Map<EchoMarkKind, number> | null = null;
  private tunedBed: TunedBed | null = null;
  private pendingTuned: TunedInputs | null = null;
  /** The last mix the tuned bed was driven to — the harness's "does it ring". */
  private lastTuned: TunedMix | null = null;
  private pendingSelf: SelfAudioFrame | null = null;
  /**
   * Lines spoken since the last tick, each with the whisper rule as it stood
   * when the line arrived. Buffered like everything else so the hail is built
   * inside the measured tick — and so a line can never be heard *before* its
   * beat: a `say` arrives on the room's Echo cadence and sounds on the next
   * one, which is the same alignment a contact gets (§12).
   */
  private pendingSpeech: Array<SpeechLine & { whisper: boolean }> = [];
  /** Audio-clock time the current line stops occupying the speech rung. */
  private speechUntil = 0;
  /** Lines actually hailed this session — the harness's "did it sound". */
  private speechFired = 0;
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

  /**
   * User volume, held here and applied when the graph builds — the graph is
   * lazy (see `start`), and settings load before the first gesture.
   *
   * These are *trim* nodes beside the ducking chain, never the bus gains
   * themselves: `onEchoTick` writes `contact.gain` and `music.gain` every tick
   * (the Precedence Law), and the self mixer owns `world.gain` (§4 own-noise
   * attenuation). A user slider on those nodes would silently fight the law.
   */
  private masterVolume = 1;
  private busTrims: Record<TrimBus, number> = {
    music: 1,
    world: 1,
    contact: 1,
    speech: 1,
    self: 1,
    ui: 1,
  };
  private trimNodes: Record<TrimBus, GainNode> | null = null;

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
   * The output ceiling, once started — the last node before the device.
   *
   * Exposed so the harness can assert the graph actually holds §12's true-peak
   * target, which is otherwise only observable by listening to a clipped mix.
   */
  get outputCeiling(): WaveShaperNode | null {
    return this.ceiling;
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

    // The output ceiling stands between master and the device, so every bus,
    // every trim and every one-shot is behind it — including the ones added
    // after this was written.
    //
    // The pre-gain is not a level change: it scales master's output into the
    // ±1 the shaper reads a curve over, and the curve puts it back (see
    // CEILING.RANGE). Nothing here is audible until the mix passes the knee.
    const headroom = context.createGain();
    headroom.gain.value = 1 / CEILING.RANGE;
    const ceiling = context.createWaveShaper();
    ceiling.curve = ceilingCurve();
    ceiling.oversample = '4x';
    headroom.connect(ceiling).connect(context.destination);
    this.ceiling = ceiling;

    const master = context.createGain();
    master.gain.value = MASTER_GAIN * this.masterVolume;
    master.connect(headroom);

    const make = (): GainNode => {
      const bus = context.createGain();
      bus.gain.value = 1;
      return bus;
    };

    const music = make();
    const world = make();
    const contact = make();
    const speech = make();
    const self = make();
    const ui = make();

    // Music is the one bus that does not reach master directly: it passes
    // through a duck so a contact is never buried under the score.
    const duck = context.createGain();
    duck.gain.value = 1;

    // User volume, one trim per bus, buffered values applied at build time.
    // Music's trim sits after the duck so turning the score up cannot undo
    // the Precedence Law's dip.
    const trim = (bus: TrimBus): GainNode => {
      const node = context.createGain();
      node.gain.value = this.busTrims[bus];
      node.connect(master);
      return node;
    };
    this.trimNodes = {
      music: trim('music'),
      world: trim('world'),
      contact: trim('contact'),
      speech: trim('speech'),
      self: trim('self'),
      ui: trim('ui'),
    };

    music.connect(duck).connect(this.trimNodes.music);
    world.connect(this.trimNodes.world);
    contact.connect(this.trimNodes.contact);
    // Speech has a trim like the rest and can be taken to zero with nothing
    // lost: the log is the caption (§13). Its bus gain belongs to the
    // Precedence Law, written on the tick below, exactly as contact's does.
    speech.connect(this.trimNodes.speech);
    // The self bus alone is low-cut before its trim, so the bed, the Lid and
    // every self one-shot are behind it — including the ones added after this
    // was written, which is the same argument the output ceiling makes.
    const selfLowCut = createSelfLowCut(context);
    self.connect(selfLowCut).connect(this.trimNodes.self);
    ui.connect(this.trimNodes.ui);

    // Taps the contact bus to drive the duck. An analyser rather than a
    // ScriptProcessor: this is measured once per Echo tick, not per sample.
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    contact.connect(analyser);
    this.analyserBuffer = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));

    this.buses = { music, world, contact, speech, self, ui, master };
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
    // Tuned water rides the world bus beside the residue, for the same reason
    // residue does: it is the ocean, so §4's own-noise attenuation should make
    // a loud player deaf to the crystal exactly as it does to the past.
    this.tunedBed = new TunedBed(context, world);

    const bed = new SelfBed(context, self);
    this.selfBed = bed;
    // A second bed on the same bus rather than a mode of the first: a hull can
    // be silent and souring at once, and folding them together would make
    // whichever fact was quieter inaudible.
    const sour = new SourBed(context, self);
    this.sourBed = sour;
    this.selfMixer = new SelfMixer({
      bed: (mix, now) => bed.update(mix, now),
      sour: (mix, now) => sour.update(mix, now),
      sourBite: (at) => playSourBite(context, self, at),
      world: (gain, now) => world.gain.setTargetAtTime(gain, now, 0.2),
      transmit: (at) => playPingTransmit(context, self, at),
      ret: (at, pan) => playPingReturn(context, self, at, pan),
      exposure: (at, pan) => playExposure(context, self, at, pan),
      breakSilence: (at) => playBreakSilence(context, self, at),
      underFire: (at) => playUnderFire(context, self, at),
      // The interface's own voice: the one producer the ui bus has, and the
      // reason its slider finally trims something.
      notice: (at) => playNotice(context, ui, at),
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

    const tunedBed = this.tunedBed;
    const tuned = this.pendingTuned;
    this.pendingTuned = null;
    if (tunedBed !== null && tuned !== null && this.context !== null) {
      const mix = tunedMixFor(tuned);
      this.lastTuned = mix;
      tunedBed.update(mix, this.context.currentTime);
    }

    const selfMixer = this.selfMixer;
    const selfFrame = this.pendingSelf;
    this.pendingSelf = null;
    if (selfMixer !== null && selfFrame !== null && this.context !== null) {
      selfMixer.update(selfFrame, this.context.currentTime);
    }

    // Lines, hailed on the tick they were drained on rather than at the
    // *next* tick time: the buffering above already put them on the Echo
    // cadence, and a further 200 ms would open a gap between the log row and
    // the sound that §13 says are one event.
    const buses = this.buses;
    if (buses !== null && this.context !== null && this.pendingSpeech.length > 0) {
      const now = this.context.currentTime;
      for (const line of this.pendingSpeech) {
        const readingS = readingSeconds(line.text, line.whisper);
        const occupied = playHail(this.context, buses.speech, line, now, {
          whisper: line.whisper,
          readingS,
        });
        // Two lines on one tick overlap rather than queue — the log shows
        // both rows at once too — and the rung is held for whichever runs
        // longer.
        this.speechUntil = Math.max(this.speechUntil, now + occupied);
        this.speechFired++;
      }
      this.pendingSpeech = [];
    }

    // The rest of the chain. `world` is set inside the self mixer, because it
    // also carries §4's own-noise attenuation; the others are pure precedence
    // and belong here. Speech is a second claim on the chain beside the self
    // mixer's cue — a line still being read while nothing else sounds ducks
    // the score on its own — so the rung written is the louder of the two.
    // Written every tick rather than only when a self frame arrived, because
    // a line's start and end are events of this bus and not of that one.
    if (buses !== null && this.context !== null) {
      const now = this.context.currentTime;
      const speaking: BusRung | null = now < this.speechUntil ? 'speech' : null;
      const rung = louderRung(selfMixer?.activeRung ?? null, speaking);
      // Two independent claims on the contact bus, and they multiply: what the
      // Precedence Law says should be quiet right now, and how much of the bus
      // the voices currently on it are entitled to between them. Same shape as
      // the world bus's pair in selfMixer, and for the same reason — a bus
      // written by whichever rule ran last is a bus with a bug in it.
      buses.contact.gain.setTargetAtTime(
        duckFor('contact', rung) * crowdGain(this.voices.size),
        now,
        0.15
      );
      buses.speech.gain.setTargetAtTime(duckFor('speech', rung), now, 0.15);
      buses.music.gain.setTargetAtTime(duckFor('music', rung), now, 0.25);
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

  /** Hand the mix the water the player is in, and the interval standing in it (§9). */
  applyTuned(inputs: TunedInputs): void {
    this.pendingTuned = inputs;
  }

  /** What the tuned bed is currently ringing, or null before the first tick. */
  get tunedMix(): TunedMix | null {
    return this.lastTuned;
  }

  /**
   * Hail a line on the next tick — docs/audio-direction.md §13.
   *
   * `whisper` is the caller's reading of the silence order and Silent
   * Running *as the line arrived*, and it rides the line rather than the
   * engine so a line spoken under the order and one spoken after it lifts
   * are each hailed as they were. Nothing here is inferred: the line is
   * authored mission data the room already sent, and the mix adds no fact
   * to it.
   */
  say(line: SpeechLine, whisper: boolean): void {
    this.pendingSpeech.push({
      voice: line.voice,
      speakerId: line.speakerId,
      text: line.text,
      whisper,
    });
  }

  /** How many lines this session has hailed. */
  get speechCuesFired(): number {
    return this.speechFired;
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
   * User master volume, 0–1, composed under the fixed MASTER_GAIN so the
   * -18 LUFS / -1 dBTP targets remain the ceiling rather than the default.
   * Safe before `start()`: the value is held and applied when the graph builds.
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.min(1, Math.max(0, volume));
    const buses = this.buses;
    const context = this.context;
    if (buses !== null && context !== null) {
      buses.master.gain.setTargetAtTime(
        MASTER_GAIN * this.masterVolume,
        context.currentTime,
        TRIM_RAMP_S
      );
    }
  }

  /**
   * User volume for one bus, as a linear gain. Every bus caps at unity except
   * contacts, which §11 allows up to +12 dB — information may be boosted,
   * atmosphere may only be turned down. Safe before `start()`.
   */
  setBusTrim(bus: TrimBus, gain: number): void {
    const cap = bus === 'contact' ? dbToGain(CONTACT_BOOST_MAX_DB) : 1;
    this.busTrims[bus] = Math.min(cap, Math.max(0, gain));
    const node = this.trimNodes?.[bus];
    if (node !== undefined && this.context !== null) {
      node.gain.setTargetAtTime(this.busTrims[bus], this.context.currentTime, TRIM_RAMP_S);
    }
  }

  get masterVolumeValue(): number {
    return this.masterVolume;
  }

  busTrim(bus: TrimBus): number {
    return this.busTrims[bus];
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
    this.tunedBed?.stop(this.context?.currentTime ?? 0);
    this.tunedBed = null;
    this.pendingTuned = null;
    this.lastTuned = null;
    this.selfBed?.stop(this.context?.currentTime ?? 0);
    this.selfBed = null;
    this.sourBed?.stop(this.context?.currentTime ?? 0);
    this.sourBed = null;
    this.selfMixer?.reset();
    this.selfMixer = null;
    this.pendingSelf = null;
    this.pendingSpeech = [];
    this.speechUntil = 0;
    this.pendingFrame = null;
    this.voices.clear();
    const context = this.context;
    this.context = null;
    this.buses = null;
    this.ceiling = null;
    this.duckGain = null;
    this.contactAnalyser = null;
    this.trimNodes = null;
    if (context !== null) {
      try {
        await context.close();
      } catch {
        // Already closed, or never opened. Nothing to recover.
      }
    }
  }
}
