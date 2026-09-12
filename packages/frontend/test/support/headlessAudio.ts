/**
 * A headless Web Audio implementation, for the audio-engine test (#487).
 *
 * `AudioEngine` owns the bus graph docs/audio-direction.md §12 specifies, and
 * every one of its 666 lines was unverified for the same reason the renderers
 * were: Node has no `AudioContext`. The renderers' answer applies unchanged —
 * stub only what is genuinely unavailable, and let everything above it run for
 * real. Here that boundary is unusually favourable: the whole surface the
 * `src/audio` directory touches is nine factory methods and five `AudioParam`
 * names, so the graph the engine builds can be *fully* modelled rather than
 * merely tolerated.
 *
 * What that buys is a graph you can walk. Every node records what it was
 * connected to, so "does the music bus reach master through the duck?" is a
 * question with an answer, and every scheduled `AudioParam` write is kept so
 * "did the Precedence Law duck the score?" is too.
 *
 * The ledger is the counted-work probe. `AUDIO_BUDGET_MS = 1` is a wall-clock
 * spec number and therefore exactly what packages/backend/test/match.test.ts
 * argues no test should assert on; the honest analogue is what the tick
 * *builds* — nodes created, sources started, params scheduled — which is a
 * property of the algorithm and identical on every runner.
 */

import { installHeadlessDom } from './headless.ts';

/** Everything a tick can spend, counted. */
export interface AudioLedger {
  /** Nodes created, by constructor name. */
  created: Map<string, number>;
  /** `start()` calls on sources — the voices that actually sounded. */
  started: number;
  /** `stop()` calls on sources. */
  stopped: number;
  /** Scheduled `AudioParam` writes of every kind. */
  scheduled: number;
  /** `connect()` calls, i.e. edges added to the graph. */
  connected: number;
}

function emptyLedger(): AudioLedger {
  return { created: new Map(), started: 0, stopped: 0, scheduled: 0, connected: 0 };
}

/** One scheduled write on a parameter, in the order it was made. */
export interface ParamWrite {
  method: 'setValueAtTime' | 'setTargetAtTime' | 'linearRamp' | 'exponentialRamp' | 'cancel';
  value: number;
  at: number;
}

/**
 * An `AudioParam` that remembers.
 *
 * `value` follows the last write rather than the clock, so a test reads the
 * target a ramp was aimed at rather than an interpolated sample. That is
 * usually the right quantity: the engine's promises are about what it *asked*
 * the graph to do.
 *
 * With one exception, and it is here because a real bug hid behind its
 * absence. Production code that *reads* a parameter back and writes a value
 * derived from what it read — `contactVoice.ts`'s drive-signature thump, which
 * bumps a voice above its own level and eases back down — is asking what the
 * value is **now**, mid-decay. A stub that answers with the settled target
 * makes every such read look correct, so a pulse that eased back to its own
 * peak instead of the voice's level (and so climbed, tick after tick, without
 * bound) was invisible here while being unmissable in a browser.
 *
 * So `setTargetAtTime` is modelled for real: `value` is the exponential
 * approach evaluated at `context.currentTime`. Every other method still lands
 * immediately, which is what the assertions about ducking and trims want, and
 * a test that never advances the clock sees exactly what it saw before —
 * `setTargetAtTime` at time `now`, read at time `now`, is its start value, and
 * its start value is the previous target.
 */
export class StubAudioParam {
  private settled: number;
  /** Where the current `setTargetAtTime` approach started, and when. */
  private approach: { from: number; to: number; at: number; tau: number } | null = null;
  readonly writes: ParamWrite[] = [];
  readonly defaultValue: number;
  readonly minValue = -3.4e38;
  readonly maxValue = 3.4e38;
  readonly automationRate = 'a-rate';

  constructor(
    value: number,
    private readonly ledger: AudioLedger,
    private readonly clock: { currentTime: number } = { currentTime: 0 }
  ) {
    this.settled = value;
    this.defaultValue = value;
  }

  /**
   * The value right now — mid-decay if a `setTargetAtTime` is still running,
   * which is the whole point (see the class comment).
   */
  get value(): number {
    const approach = this.approach;
    if (approach === null) return this.settled;
    const elapsed = this.clock.currentTime - approach.at;
    if (elapsed <= 0) return approach.from;
    if (approach.tau <= 0) return approach.to;
    return approach.to + (approach.from - approach.to) * Math.exp(-elapsed / approach.tau);
  }

  /** Writing a value directly is what the engine does before a graph runs. */
  set value(value: number) {
    this.approach = null;
    this.settled = value;
  }

  private record(method: ParamWrite['method'], value: number, at: number): this {
    this.approach = null;
    this.settled = value;
    this.writes.push({ method, value, at });
    this.ledger.scheduled++;
    return this;
  }

  setValueAtTime(value: number, at: number): this {
    return this.record('setValueAtTime', value, at);
  }

  setTargetAtTime(target: number, at: number, timeConstant: number): this {
    const from = this.value;
    this.record('setTargetAtTime', target, at);
    this.approach = { from, to: target, at, tau: timeConstant };
    return this;
  }

  linearRampToValueAtTime(value: number, at: number): this {
    return this.record('linearRamp', value, at);
  }

  exponentialRampToValueAtTime(value: number, at: number): this {
    return this.record('exponentialRamp', value, at);
  }

  cancelScheduledValues(at: number): this {
    return this.record('cancel', this.value, at);
  }

  cancelAndHoldAtTime(at: number): this {
    return this.record('cancel', this.value, at);
  }

  /** Where a still-running approach is heading, ignoring how far it has got. */
  get target(): number {
    return this.approach?.to ?? this.settled;
  }

  setValueCurveAtTime(curve: ArrayLike<number>, at: number): this {
    return this.record('setValueAtTime', curve[curve.length - 1] ?? this.value, at);
  }
}

/** The base every stub node shares: identity, edges, and the ledger. */
export class StubAudioNode {
  readonly kind: string;
  readonly outputs: StubAudioNode[] = [];
  readonly inputs: StubAudioNode[] = [];
  readonly context: HeadlessAudioContext;
  readonly channelCount = 2;
  readonly numberOfInputs = 1;
  readonly numberOfOutputs = 1;

  constructor(kind: string, context: HeadlessAudioContext) {
    this.kind = kind;
    this.context = context;
  }

  connect<T extends StubAudioNode | StubAudioParam>(target: T): T {
    this.context.ledger.connected++;
    if (target instanceof StubAudioParam) return target;
    this.outputs.push(target);
    target.inputs.push(this);
    return target;
  }

  disconnect(target?: StubAudioNode): void {
    if (target === undefined) {
      for (const out of this.outputs.splice(0)) {
        const at = out.inputs.indexOf(this);
        if (at >= 0) out.inputs.splice(at, 1);
      }
      return;
    }
    const at = this.outputs.indexOf(target);
    if (at >= 0) this.outputs.splice(at, 1);
    const back = target.inputs.indexOf(this);
    if (back >= 0) target.inputs.splice(back, 1);
  }

  /** Every node reachable downstream, itself included — the routing probe. */
  reaches(target: StubAudioNode): boolean {
    const seen = new Set<StubAudioNode>();
    const stack: StubAudioNode[] = [this];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node === target) return true;
      if (seen.has(node)) continue;
      seen.add(node);
      stack.push(...node.outputs);
    }
    return false;
  }
}

/** A node that can be started and stopped — oscillators and buffer sources. */
class StubSourceNode extends StubAudioNode {
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  buffer: unknown = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  playbackRate: StubAudioParam;
  detune: StubAudioParam;
  onended: (() => void) | null = null;

  constructor(kind: string, context: HeadlessAudioContext) {
    super(kind, context);
    this.playbackRate = new StubAudioParam(1, context.ledger, context);
    this.detune = new StubAudioParam(0, context.ledger, context);
  }

  start(at = 0): void {
    this.startedAt = at;
    this.context.ledger.started++;
  }

  stop(at = 0): void {
    this.stoppedAt = at;
    this.context.ledger.stopped++;
  }
}

export class StubGainNode extends StubAudioNode {
  readonly gain: StubAudioParam;
  constructor(context: HeadlessAudioContext) {
    super('GainNode', context);
    this.gain = new StubAudioParam(1, context.ledger, context);
  }
}

export class StubOscillatorNode extends StubSourceNode {
  type = 'sine';
  readonly frequency: StubAudioParam;
  /**
   * The wave this oscillator was given, or null while it is still a `type`.
   *
   * Kept rather than swallowed for the same reason every other stub keeps what
   * it was handed: the self bed's partials are the whole of #663's fix on a
   * phone speaker, and a no-op setter would let a refactor drop them back to a
   * bare 44 Hz sine with every test still green.
   */
  periodicWave: StubPeriodicWave | null = null;
  constructor(context: HeadlessAudioContext) {
    super('OscillatorNode', context);
    this.frequency = new StubAudioParam(440, context.ledger, context);
  }
  setPeriodicWave(wave: StubPeriodicWave): void {
    this.periodicWave = wave;
    // What a real oscillator does, and what a test asking "is this still a
    // sine?" has to be able to see.
    this.type = 'custom';
  }
}

/** A `PeriodicWave`, which in Web Audio is its coefficients and nothing else. */
export class StubPeriodicWave {
  constructor(
    readonly real: Float32Array,
    readonly imag: Float32Array,
    readonly normalised: boolean
  ) {}
}

export class StubBufferSourceNode extends StubSourceNode {
  constructor(context: HeadlessAudioContext) {
    super('AudioBufferSourceNode', context);
  }
}

export class StubBiquadFilterNode extends StubAudioNode {
  type = 'lowpass';
  readonly frequency: StubAudioParam;
  readonly Q: StubAudioParam;
  readonly gain: StubAudioParam;
  readonly detune: StubAudioParam;
  constructor(context: HeadlessAudioContext) {
    super('BiquadFilterNode', context);
    this.frequency = new StubAudioParam(350, context.ledger, context);
    this.Q = new StubAudioParam(1, context.ledger, context);
    this.gain = new StubAudioParam(0, context.ledger, context);
    this.detune = new StubAudioParam(0, context.ledger, context);
  }
}

/**
 * The output ceiling (`engine.ts` CEILING). The curve is kept verbatim, which
 * is the whole of what this node does — a WaveShaper has no state and no
 * parameters, so the curve *is* the behaviour and a test can check it
 * arithmetically rather than trusting a rendered signal.
 */
export class StubWaveShaperNode extends StubAudioNode {
  curve: Float32Array | null = null;
  oversample: 'none' | '2x' | '4x' = 'none';
  constructor(context: HeadlessAudioContext) {
    super('WaveShaperNode', context);
  }
}

export class StubStereoPannerNode extends StubAudioNode {
  readonly pan: StubAudioParam;
  constructor(context: HeadlessAudioContext) {
    super('StereoPannerNode', context);
    this.pan = new StubAudioParam(0, context.ledger, context);
  }
}

export class StubDelayNode extends StubAudioNode {
  readonly delayTime: StubAudioParam;
  constructor(context: HeadlessAudioContext) {
    super('DelayNode', context);
    this.delayTime = new StubAudioParam(0, context.ledger, context);
  }
}

/**
 * The analyser, and the one place this harness has to invent a signal.
 *
 * `getFloatTimeDomainData` is how the engine measures the contact bus to drive
 * the music duck, and there is no rendering here to measure. So the level is
 * settable: a test says "the contact bus is loud now" and then asserts the
 * duck responded, which is the causal link the code actually claims. Silence
 * is the default, because a graph nobody has fed is silent.
 */
export class StubAnalyserNode extends StubAudioNode {
  fftSize = 2048;
  smoothingTimeConstant = 0.8;
  /** Peak amplitude reported to the next `getFloatTimeDomainData`. */
  level = 0;
  reads = 0;

  constructor(context: HeadlessAudioContext) {
    super('AnalyserNode', context);
  }

  get frequencyBinCount(): number {
    return this.fftSize / 2;
  }

  getFloatTimeDomainData(into: Float32Array): void {
    this.reads++;
    for (let i = 0; i < into.length; i++) into[i] = i % 2 === 0 ? this.level : -this.level;
  }

  getByteFrequencyData(into: Uint8Array): void {
    this.reads++;
    into.fill(Math.round(this.level * 255));
  }
}

/**
 * An `AudioContext` whose clock only moves when a test moves it.
 *
 * Deliberate: the engine schedules everything against `currentTime`, so a
 * clock that advanced on its own would make every assertion about *when*
 * something was scheduled a race. `advance()` is the only thing that moves it,
 * which makes a run reproducible to the sample.
 */
export class HeadlessAudioContext {
  readonly ledger: AudioLedger = emptyLedger();
  readonly sampleRate = 48_000;
  readonly destination: StubAudioNode;
  state: 'suspended' | 'running' | 'closed' = 'running';
  /** Every node this context ever made, in creation order. */
  readonly nodes: StubAudioNode[] = [];
  private clock = 0;

  constructor() {
    this.destination = new StubAudioNode('AudioDestinationNode', this);
  }

  get currentTime(): number {
    return this.clock;
  }

  /** Move the audio clock forward, in seconds. */
  advance(seconds: number): void {
    this.clock += seconds;
  }

  private track<T extends StubAudioNode>(node: T): T {
    this.nodes.push(node);
    this.ledger.created.set(node.kind, (this.ledger.created.get(node.kind) ?? 0) + 1);
    return node;
  }

  createGain(): StubGainNode {
    return this.track(new StubGainNode(this));
  }

  createOscillator(): StubOscillatorNode {
    return this.track(new StubOscillatorNode(this));
  }

  createBufferSource(): StubBufferSourceNode {
    return this.track(new StubBufferSourceNode(this));
  }

  createBiquadFilter(): StubBiquadFilterNode {
    return this.track(new StubBiquadFilterNode(this));
  }

  createStereoPanner(): StubStereoPannerNode {
    return this.track(new StubStereoPannerNode(this));
  }

  createWaveShaper(): StubWaveShaperNode {
    return this.track(new StubWaveShaperNode(this));
  }

  createPeriodicWave(
    real: Float32Array,
    imag: Float32Array,
    constraints?: { disableNormalization?: boolean }
  ): StubPeriodicWave {
    // Not tracked: a wave is not a node, costs no tick budget, and counting it
    // in the ledger would make the audio budget look spent on arithmetic.
    return new StubPeriodicWave(real, imag, constraints?.disableNormalization !== true);
  }

  createDelay(): StubDelayNode {
    return this.track(new StubDelayNode(this));
  }

  createAnalyser(): StubAnalyserNode {
    return this.track(new StubAnalyserNode(this));
  }

  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike {
    const data: Float32Array[] = [];
    for (let i = 0; i < channels; i++) data.push(new Float32Array(length));
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: (channel: number) => data[channel]!,
    };
  }

  async resume(): Promise<void> {
    if (this.state !== 'closed') this.state = 'running';
  }

  async suspend(): Promise<void> {
    if (this.state !== 'closed') this.state = 'suspended';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }

  /** Zero the counters, so a tick can be measured on its own. */
  resetLedger(): void {
    this.ledger.created.clear();
    this.ledger.started = 0;
    this.ledger.stopped = 0;
    this.ledger.scheduled = 0;
    this.ledger.connected = 0;
  }

  /** Total nodes created since the last reset, across every kind. */
  get createdCount(): number {
    let total = 0;
    for (const count of this.ledger.created.values()) total += count;
    return total;
  }

  /** The analyser the engine tapped the contact bus with, once started. */
  get analyser(): StubAnalyserNode | undefined {
    return this.nodes.find((node): node is StubAnalyserNode => node instanceof StubAnalyserNode);
  }
}

export interface AudioBufferLike {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  duration: number;
  getChannelData(channel: number): Float32Array;
}

let live: HeadlessAudioContext | null = null;

/**
 * Put `AudioContext` on the stub window and hand back the context the next
 * `AudioEngine.start()` will build its graph in.
 *
 * The engine constructs its own context, so the only way to reach the graph is
 * to control the constructor. One context per install, because the engine only
 * ever makes one.
 */
export function installHeadlessAudio(): HeadlessAudioContext {
  installHeadlessDom();
  const context = new HeadlessAudioContext();
  live = context;
  const g = globalThis as unknown as { window: Record<string, unknown> };
  g.window.AudioContext = function AudioContextStub(): HeadlessAudioContext {
    return live!;
  } as unknown as typeof AudioContext;
  return context;
}

/** Take `AudioContext` away, so a test can prove the silent path is playable. */
export function uninstallHeadlessAudio(): void {
  live = null;
  const g = globalThis as unknown as { window: Record<string, unknown> };
  delete g.window.AudioContext;
}
