/**
 * The audio engine (#487).
 *
 * docs/audio-direction.md §1 makes the mix the *primary* information channel
 * rather than decoration on one, and `AudioEngine` is where that claim is
 * either kept or broken: the bus graph, the Precedence Law's ducking, the
 * voice cap, and the tick alignment that stops the mix implying knowledge the
 * server never sent. None of it had a test, because Node has no `AudioContext`.
 *
 * It has one now (test/support/headlessAudio.ts), and it is a full model
 * rather than a shrug: nodes record their edges and parameters record their
 * writes, so the questions this file asks — does music reach master through
 * the duck, did the score dip when a contact sounded, did a voice get reused —
 * have real answers.
 *
 * The budget is asserted as **counted work**, never as milliseconds.
 * `AUDIO_BUDGET_MS = 1` is a wall-clock spec number, and a wall-clock maximum
 * is the noisiest statistic a shared runner produces — the argument
 * packages/backend/test/match.test.ts makes at length about the simulation's
 * budgets applies unchanged here. What a tick *builds* is a property of the
 * algorithm: nodes created, sources started, parameters scheduled.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Biome, Faction, ResolutionTier, SelfEventKind, SIM } from '@echoes/shared';
import {
  HeadlessAudioContext,
  installHeadlessAudio,
  uninstallHeadlessAudio,
  StubBiquadFilterNode,
  type StubAudioNode,
  type StubGainNode,
} from './support/headlessAudio.ts';
import {
  AudioEngine,
  CONTACT_BOOST_MAX_DB,
  SELF_LOW_CUT_HZ,
  ceilingShape,
  crowdGain,
  dbToGain,
  type TrimBus,
} from '../src/audio/engine.ts';
import { MAX_CONTACT_VOICES } from '../src/audio/voiceAllocator.ts';
import { duckFor } from '../src/audio/precedence.ts';
import type { ContactAudioEntry, ContactAudioFrame } from '../src/audio/contactMixer.ts';
import type { SelfAudioFrame } from '../src/audio/selfMixer.ts';

/** SPEC — docs/audio-direction.md §12, transcribed from `engine.ts`'s DUCK. */
const DUCK_FLOOR = 0.35;
/** The master gain the -18 LUFS / -1 dBTP target fixes, from `engine.ts`. */
const MASTER_GAIN = 0.5;

const BUSES: TrimBus[] = ['music', 'world', 'contact', 'speech', 'self', 'ui'];

/** One contact the mix can voice, at a tier that actually sounds. */
function entry(id: number, over: Partial<ContactAudioEntry> = {}): ContactAudioEntry {
  return {
    id,
    tier: ResolutionTier.Bearing,
    biome: Biome.OpenWater,
    freshness: 1,
    bearing: 0.5,
    rangeM: 1800,
    ...over,
  };
}

function contactFrame(count: number, tick = 100): ContactAudioFrame {
  const entries: ContactAudioEntry[] = [];
  for (let i = 0; i < count; i++) entries.push(entry(i + 1));
  return { tick, entries };
}

function selfFrame(over: Partial<SelfAudioFrame> = {}): SelfAudioFrame {
  return {
    tick: 100,
    fleetSig: 40,
    silentRunning: false,
    sourS: 0,
    events: [],
    returns: [],
    ...over,
  };
}

/** A started engine and the context its graph lives in. */
function boot(): { engine: AudioEngine; context: HeadlessAudioContext } {
  const context = installHeadlessAudio();
  const engine = new AudioEngine();
  engine.start();
  return { engine, context };
}

/** Shortest number of edges from `from` to `to`, or -1 if unreachable. */
function hops(from: StubAudioNode, to: StubAudioNode): number {
  const seen = new Set<StubAudioNode>([from]);
  let frontier = [from];
  let distance = 0;
  while (frontier.length > 0) {
    if (frontier.includes(to)) return distance;
    const next: StubAudioNode[] = [];
    for (const node of frontier) {
      for (const out of node.outputs) {
        if (seen.has(out)) continue;
        seen.add(out);
        next.push(out);
      }
    }
    frontier = next;
    distance++;
  }
  return -1;
}

describe('the audio engine: a drive signature that breathes, and stays put', () => {
  /**
   * docs/audio-direction.md §8's drive signature is "the same thing
   * breathing": a short amplitude bump on a voice that is already running.
   * `scheduleThump` built that bump by reading the oscillator's live level
   * back, multiplying it, and easing down to the level it had read.
   *
   * Reading it back was wrong twice over, because the `cancelScheduledValues`
   * in the same breath cancels the ramp `update` scheduled at that instant —
   * so the read never saw the level the voice was being set to, only the one
   * it was leaving. A voice promoted while sounding read its previous bump's
   * tail and settled onto that, so every pulse started higher than the last.
   *
   * It bites hardest where §8 puts the fastest mechanism: the Directorate's
   * swarm is 9 events per second, so its pulse fires on every 5 Hz tick and
   * the level never gets an un-pulsed tick to fall back on. Measured before
   * the fix: 260x the voice's own level after eight seconds of being tracked,
   * still climbing, on a contact that had not changed in any way.
   *
   * The promotion is what makes this reproduce, and it is also what happens in
   * a match — a contact is heard before it is classified.
   */
  const heard = (tick: number): ContactAudioFrame => ({
    tick,
    entries: [
      {
        id: 1,
        tier: ResolutionTier.Bearing,
        biome: Biome.OpenWater,
        freshness: 1,
        bearing: 0.5,
        rangeM: 1800,
      },
    ],
  });
  const classified = (tick: number): ContactAudioFrame => ({
    tick,
    entries: [
      {
        id: 1,
        tier: ResolutionTier.Track,
        biome: Biome.OpenWater,
        faction: Faction.Directorate,
        freshness: 1,
        bearing: 0.5,
        rangeM: 1800,
      },
    ],
  });

  /** Every gain the voice itself builds — the buses sit at unity by design. */
  function voiceGains(context: HeadlessAudioContext, from: number): StubGainNode[] {
    return context.nodes
      .slice(from)
      .filter((node): node is StubGainNode => node.kind === 'GainNode');
  }

  it('does not ratchet a tracked contact upward, tick after tick', () => {
    const { engine, context } = boot();
    try {
      const beforeVoice = context.nodes.length;
      engine.applyContacts(heard(100));
      engine.onEchoTick();
      for (let tick = 1; tick <= 50; tick++) {
        context.advance(1 / SIM.ECHO_HZ);
        engine.applyContacts(tick <= 10 ? heard(100 + tick) : classified(100 + tick));
        engine.onEchoTick();
      }

      // §8's bump is 1.6x the voice's own level, and the loudest level any
      // branch of `update` sets is 0.5, so nothing may be driven past 0.8.
      for (const gain of voiceGains(context, beforeVoice)) {
        for (const write of gain.gain.writes) {
          assert.ok(
            write.value <= 0.8 + 1e-9,
            `a voice gain reached ${write.value.toFixed(3)}, past the 0.8 a drive signature can reach`
          );
        }
      }
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  /**
   * The same read-back silenced the opposite case. A contact already at Tier 3+
   * on its first frame had nothing to read but the oscillator's initial zero,
   * so it bumped to zero and settled at zero — a drive signature that never
   * sounded, on exactly the contacts §8 says a player must identify by ear.
   */
  it('sounds a drive signature on a contact that arrives already classified', () => {
    const { engine, context } = boot();
    try {
      const beforeVoice = context.nodes.length;
      engine.applyContacts(classified(100));
      engine.onEchoTick();
      for (let tick = 1; tick <= 5; tick++) {
        context.advance(1 / SIM.ECHO_HZ);
        engine.applyContacts(classified(100 + tick));
        engine.onEchoTick();
      }

      // The bump is the only thing in a voice that sets a value outright
      // rather than ramping to one, so it is what identifies it. A lock tone
      // sets one too, and sets it to zero before its own ramp, which is why
      // this asks for the loudest rather than for any.
      const bumped = Math.max(
        ...voiceGains(context, beforeVoice).flatMap((gain) =>
          gain.gain.writes
            .filter((write) => write.method === 'setValueAtTime')
            .map((write) => write.value)
        )
      );
      assert.ok(
        bumped > 0.4,
        `the drive signature bumped to ${bumped.toFixed(3)}, which is inaudible`
      );
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });
});

describe('the audio engine: the ceiling the device sees', () => {
  /**
   * docs/audio-direction.md §12 puts a true-peak ceiling on the mix, and the
   * graph had nothing enforcing it: six buses summed into master, the world
   * bus doubles under Silent Running and the contact trim adds up to +12 dB,
   * so a busy tick ran past full scale and the device clipped it. That is
   * heard as pain rather than as loudness, and it arrives soonest when §4 has
   * the player loudest — the one place the mix is meant to be oppressive by
   * design rather than damaging by accident.
   *
   * The curve is asserted as arithmetic, because that is what it is. Whether
   * a rendered mix stays under the ceiling then follows from the shape rather
   * than from a sampled signal nobody can reproduce on a different runner.
   */
  it('is transparent below the knee', () => {
    for (const level of [0, 0.05, 0.2, 0.45, 0.6, -0.3, -0.6]) {
      assert.equal(ceilingShape(level), level, `${level} passes through untouched`);
    }
  });

  it('never lets any level past -1 dBTP', () => {
    const peak = dbToGain(-1);
    // Far past anything the graph can produce: the measured worst case of the
    // self bus alone is 1.85, and a curve that only held to 2 would be a
    // ceiling with a hole in it.
    for (let level = 0; level <= 40; level += 0.01) {
      assert.ok(ceilingShape(level) <= peak, `${level.toFixed(2)} stays under the ceiling`);
      assert.ok(ceilingShape(-level) >= -peak, `${-level.toFixed(2)} stays under the ceiling`);
    }
  });

  it('rises without a corner, so limiting is never an event', () => {
    let previous = 0;
    for (let level = 0; level <= 4; level += 0.001) {
      const shaped = ceilingShape(level);
      assert.ok(shaped >= previous, `monotonic at ${level.toFixed(3)}`);
      // No step: a discontinuity at the knee would be audible as a click
      // exactly when the mix got busy.
      assert.ok(shaped - previous < 0.002, `continuous at ${level.toFixed(3)}`);
      previous = shaped;
    }
  });

  it('puts every path to the device through the ceiling', () => {
    const { engine, context } = boot();
    try {
      const ceiling = engine.outputCeiling as unknown as StubAudioNode | null;
      assert.ok(ceiling !== null, 'the ceiling exists once started');

      // Asserted over every node the context ever made, so a bus added later
      // that forgets the ceiling fails here rather than in someone's ears.
      const direct = context.nodes.filter(
        (node) => node !== ceiling && node.outputs.includes(context.destination)
      );
      assert.deepEqual(direct, [], 'only the ceiling reaches the destination');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  /**
   * The reason the ceiling is a shaper and not simply a lower MASTER_GAIN:
   * §4's bands have to stay audibly different from each other, and buying
   * headroom by turning the whole mix down spends exactly the range that
   * difference is made of.
   */
  it('leaves the nominal mix level alone', () => {
    const { engine } = boot();
    try {
      const master = engine.graph!.master as unknown as StubGainNode;
      assert.equal(master.gain.value, MASTER_GAIN, 'the headroom is unchanged by the ceiling');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });
});

describe('the audio engine: the graph it builds', () => {
  it('routes every bus to master, and only music through the duck', () => {
    const { engine, context } = boot();
    try {
      const graph = engine.graph;
      assert.ok(graph !== null, 'the graph exists once started');
      const master = graph.master as unknown as StubAudioNode;

      // Every bus reaches master through its own trim: one hop to the trim,
      // one to master. The self bus takes one more, and only the self bus: its
      // low cut stands before its trim so the bed, the Lid and every self
      // one-shot are behind it (#663), and a user turning the self slider down
      // must not be able to route around it.
      for (const bus of BUSES.filter((name) => name !== 'music')) {
        const node = graph[bus] as unknown as StubAudioNode;
        const expected = bus === 'self' ? 3 : 2;
        assert.equal(hops(node, master), expected, `${bus} reaches master through its trim`);
      }
      // And the extra hop is the low cut itself, not some other node that
      // happens to be in the way: §11's speaker profile is only delivered if
      // this is a high-pass, at the corner engine.ts states, on this one bus.
      const lowCut = context.nodes.find(
        (node): node is StubBiquadFilterNode =>
          node instanceof StubBiquadFilterNode &&
          (graph.self as unknown as StubAudioNode).outputs.includes(node)
      );
      assert.ok(lowCut !== undefined, 'the self bus passes through a filter');
      assert.equal(lowCut.type, 'highpass', 'the self bus filter cuts the low end');
      assert.equal(lowCut.frequency.value, SELF_LOW_CUT_HZ, 'at the stated corner');
      for (const bus of BUSES.filter((name) => name !== 'self')) {
        const node = graph[bus] as unknown as StubAudioNode;
        assert.ok(
          !node.outputs.some((out) => out instanceof StubBiquadFilterNode),
          `${bus} is not low-cut — only the self bus is`
        );
      }
      // Music is the one that does not: bus -> duck -> trim -> master, so the
      // Precedence Law's dip cannot be undone by turning the score up.
      assert.equal(
        hops(graph.music as unknown as StubAudioNode, master),
        3,
        'music passes through the duck on its way to its trim'
      );
      assert.equal(
        hops(master, context.destination),
        3,
        'master reaches the device through the headroom pre-gain and the ceiling'
      );
      assert.ok(context.analyser !== undefined, 'the contact bus is tapped by an analyser');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('builds once: a second start is free', () => {
    const { engine, context } = boot();
    try {
      const built = context.createdCount;
      assert.ok(built > 6, `the graph is more than its buses (${built} nodes)`);
      engine.start();
      engine.start();
      assert.equal(context.createdCount, built, 'repeat starts created no nodes');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('reports its state honestly through the context lifecycle', async () => {
    const context = installHeadlessAudio();
    const engine = new AudioEngine();
    try {
      assert.equal(engine.state, 'idle', 'idle before the unlock gesture');
      engine.start();
      assert.equal(engine.state, 'running');
      await context.suspend();
      assert.equal(engine.state, 'suspended', 'a hidden tab suspends rather than tears down');
      await context.resume();
      assert.equal(engine.state, 'running');
      await engine.destroy();
      assert.equal(context.state, 'closed', 'destroy released the device');
      assert.equal(engine.graph, null, 'and dropped the graph');
      assert.equal(engine.state, 'idle');
    } finally {
      uninstallHeadlessAudio();
    }
  });
});

describe('the audio engine: what a tick costs', () => {
  it('an idle tick allocates nothing', () => {
    const { engine, context } = boot();
    try {
      engine.onEchoTick();
      context.resetLedger();
      for (let i = 0; i < 20; i++) engine.onEchoTick();

      assert.equal(context.createdCount, 0, 'twenty empty ticks built no nodes');
      // It is not doing nothing, though: the Precedence Law and the duck are
      // written every tick whether or not anything arrived.
      assert.ok(context.ledger.scheduled > 0, 'the chain is still being driven');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('builds a voice per contact once, then reuses it', () => {
    const { engine, context } = boot();
    try {
      engine.applyContacts(contactFrame(5));
      engine.onEchoTick();
      assert.equal(engine.lastTickVoicesBuilt, 5, 'five contacts, five voices built');
      assert.equal(engine.activeContactVoices, 5);

      // The same picture again: the mixer should find every voice already in
      // hand. This is the pooling promise, and it is what keeps a steady
      // battle from rebuilding its whole mix five times a second.
      context.resetLedger();
      for (let tick = 1; tick <= 20; tick++) {
        engine.applyContacts(contactFrame(5, 100 + tick));
        engine.onEchoTick();
        assert.equal(engine.lastTickVoicesBuilt, 0, `tick ${tick} built no new voice`);
      }
      assert.equal(context.createdCount, 0, 'and allocated no new node across twenty ticks');
      assert.equal(engine.activeContactVoices, 5, 'the same five are still sounding');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('holds the voice cap however many contacts arrive', () => {
    const { engine } = boot();
    try {
      engine.applyContacts(contactFrame(MAX_CONTACT_VOICES * 3));
      engine.onEchoTick();
      // §1: the cap exists so the low band stays legible. A mix that voiced
      // every return would be mud, and mud is not an information channel.
      assert.ok(
        engine.activeContactVoices <= MAX_CONTACT_VOICES,
        `${engine.activeContactVoices} voices is inside the cap of ${MAX_CONTACT_VOICES}`
      );
      assert.equal(engine.activeContactVoices, MAX_CONTACT_VOICES, 'and spends all of it');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('holds the contact bus to a constant power as voices arrive', () => {
    // The fault #663 found behind the two #661 fixed: §12 budgets 24 voices
    // and said nothing about what they cost between them, so they simply
    // summed. Measured at the bus, seven classified contacts peaked at
    // +1.7 dBFS and twenty-four at +7.9 — a mix built to be bent back by its
    // own safety limiter, with none of the headroom §12 reserves for the
    // exposure strike left to reserve.
    //
    // Asserted as the law rather than as four numbers: one voice is the
    // reference and is untouched, more voices are quieter, and the whole
    // budget lands where the sum law for sources out of phase puts it.
    assert.equal(crowdGain(0), 1, 'an empty bus is not attenuated');
    assert.equal(crowdGain(1), 1, 'one contact is the reference and does not move');
    for (let voices = 2; voices <= MAX_CONTACT_VOICES; voices++) {
      assert.ok(
        crowdGain(voices) < crowdGain(voices - 1),
        `${voices} voices is not quieter per voice than ${voices - 1}`
      );
    }
    assert.ok(
      Math.abs(20 * Math.log10(crowdGain(MAX_CONTACT_VOICES)) + 13.8) < 0.1,
      'the full voice budget does not cost the 13.8 dB the sum law puts it at'
    );

    // And the engine actually writes it, multiplied into the Precedence Law's
    // own claim rather than replacing it — the two are independent facts about
    // the same bus, exactly as they are on the world bus.
    const { engine } = boot();
    try {
      const contact = engine.graph!.contact as unknown as StubGainNode;
      engine.applyContacts(contactFrame(9));
      engine.onEchoTick();
      const written = contact.gain.writes.at(-1);
      assert.ok(written !== undefined, 'the tick wrote nothing to the contact bus');
      assert.ok(
        Math.abs(written.value - duckFor('contact', null) * crowdGain(9)) < 1e-9,
        `the bus was written to ${written.value}, not the duck times the crowd gain`
      );
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('applies nothing until the tick — the mix never runs ahead of the server', () => {
    const { engine } = boot();
    try {
      engine.applyContacts(contactFrame(3));
      assert.equal(engine.activeContactVoices, 0, 'a frame handed over is not yet a sound');
      engine.onEchoTick();
      assert.equal(engine.activeContactVoices, 3, 'the tick is what applies it');

      // A frame superseded before its tick is simply dropped: the newer one is
      // strictly better information, and both sounding would be an artefact of
      // frame timing rather than of the water.
      engine.applyContacts(contactFrame(3, 101));
      engine.applyContacts(contactFrame(7, 102));
      engine.onEchoTick();
      assert.equal(engine.activeContactVoices, 7, 'the newest frame won');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('speaks a line on the tick, and two lines on one tick both sound', () => {
    const { engine } = boot();
    try {
      engine.say(
        { voice: 'concern', speakerId: 'marr', text: 'Contact bearing zero four.' },
        false
      );
      engine.say({ voice: 'order', speakerId: 'korrin', text: 'Hold your depth.' }, true);
      assert.equal(engine.speechCuesFired, 0, 'a line is buffered onto the Echo cadence');

      engine.onEchoTick();
      assert.equal(engine.speechCuesFired, 2, 'both lines hailed on the tick they drained on');
      engine.onEchoTick();
      assert.equal(engine.speechCuesFired, 2, 'and neither hailed twice');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('fires a self one-shot once, however often the server resends it', () => {
    const { engine } = boot();
    try {
      const event = { kind: SelfEventKind.BreakSilence, unitId: 11 };
      engine.applySelf(selfFrame({ events: [event] }));
      engine.onEchoTick();
      const first = engine.selfCuesFired;
      const fired = Object.values(first).reduce((a, b) => a + b, 0);
      assert.ok(fired > 0, `a self event sounded (${JSON.stringify(first)})`);

      // The same event on the same tick is a resend, not a second event.
      engine.applySelf(selfFrame({ events: [event] }));
      engine.onEchoTick();
      assert.deepEqual(engine.selfCuesFired, first, 'a resent one-shot did not double-fire');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('schedules the next tick one Echo period ahead', () => {
    const { engine, context } = boot();
    try {
      assert.equal(engine.nextTickTime(), 1 / SIM.ECHO_HZ, 'one Echo period from the clock');
      context.advance(3.5);
      assert.equal(engine.nextTickTime(), 3.5 + 1 / SIM.ECHO_HZ, 'and it follows the clock');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });
});

describe('the audio engine: the Precedence Law and the trims', () => {
  it('ducks the score from the measured contact level, and lets it back up', () => {
    const { engine, context } = boot();
    try {
      const duck = (engine.graph!.music as unknown as StubAudioNode).outputs[0] as StubGainNode;
      const analyser = context.analyser!;

      // `target` rather than `value`: the duck is a ramp, and what this test
      // asks is where the engine aimed it, not how far it has travelled since
      // the clock has not moved.
      analyser.level = 0.6;
      engine.onEchoTick();
      assert.equal(duck.gain.target, DUCK_FLOOR, 'a busy contact bus dips the music');

      analyser.level = 0;
      engine.onEchoTick();
      assert.equal(duck.gain.target, 1, 'and silence releases it');
      assert.ok(analyser.reads >= 2, 'the level was measured, not assumed');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('lets contacts boost to +12 dB and nothing else above unity', () => {
    const { engine } = boot();
    try {
      engine.setBusTrim('contact', 99);
      assert.equal(
        engine.busTrim('contact'),
        dbToGain(CONTACT_BOOST_MAX_DB),
        'contacts cap at the +12 dB §11 allows'
      );
      for (const bus of BUSES.filter((name) => name !== 'contact')) {
        engine.setBusTrim(bus, 99);
        assert.equal(engine.busTrim(bus), 1, `${bus} caps at unity — atmosphere may only go down`);
      }
      engine.setBusTrim('world', -5);
      assert.equal(engine.busTrim('world'), 0, 'and nothing goes below silence');
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('holds a trim set before the graph exists, and applies it at build time', () => {
    const context = installHeadlessAudio();
    const engine = new AudioEngine();
    try {
      // Settings load before the first user gesture, and the graph is lazy.
      engine.setBusTrim('speech', 0.25);
      engine.setMasterVolume(0.5);
      assert.equal(engine.busTrim('speech'), 0.25, 'held while there is nowhere to put it');

      engine.start();
      const master = engine.graph!.master as unknown as StubGainNode;
      assert.equal(
        master.gain.value,
        MASTER_GAIN * 0.5,
        'master volume composes under the fixed headroom, never replaces it'
      );
      const speechTrim = (engine.graph!.speech as unknown as StubAudioNode)
        .outputs[0] as StubGainNode;
      assert.equal(speechTrim.gain.value, 0.25, 'and the buffered trim landed on its node');
      void context;
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });

  it('writes the bus gains every tick, not only when a frame arrived', () => {
    const { engine } = boot();
    try {
      const contact = engine.graph!.contact as unknown as StubGainNode;
      const before = contact.gain.writes.length;
      engine.onEchoTick();
      assert.ok(
        contact.gain.writes.length > before,
        'the Precedence Law is re-asserted on every tick'
      );
    } finally {
      void engine.destroy();
      uninstallHeadlessAudio();
    }
  });
});

describe('the audio engine: no audio device at all', () => {
  it('stays playable in silence — docs/ui-ux.md §11', async () => {
    // A browser that refuses an AudioContext, or a platform without one. §11
    // makes full playability while muted a requirement, so every one of these
    // calls has to be a no-op rather than a throw.
    uninstallHeadlessAudio();
    const engine = new AudioEngine();

    engine.start();
    assert.equal(engine.state, 'idle', 'no context, no graph');
    assert.equal(engine.graph, null);
    assert.equal(engine.nextTickTime(), 0, 'and no clock to schedule against');

    engine.applyContacts(contactFrame(4));
    engine.applySelf(selfFrame({ events: [{ kind: SelfEventKind.Ping, unitId: 11 }] }));
    engine.applyMarks(new Map());
    engine.say({ voice: 'concern', speakerId: 'marr', text: 'Anyone there?' }, false);
    engine.setBusTrim('contact', 2);
    engine.setMasterVolume(0.3);
    engine.setSpatialisation('mono');
    engine.onEchoTick();

    assert.equal(engine.activeContactVoices, 0, 'nothing sounded, and nothing threw');
    assert.equal(engine.speechCuesFired, 0);
    assert.equal(engine.busTrim('contact'), 2, 'the settings are still remembered for later');
    assert.equal(engine.spatialisationMode, 'mono');
    await engine.destroy();
  });
});
