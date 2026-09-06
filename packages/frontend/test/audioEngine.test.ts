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
import { Biome, ResolutionTier, SelfEventKind, SIM } from '@echoes/shared';
import {
  HeadlessAudioContext,
  installHeadlessAudio,
  uninstallHeadlessAudio,
  type StubAudioNode,
  type StubGainNode,
} from './support/headlessAudio.ts';
import { AudioEngine, CONTACT_BOOST_MAX_DB, dbToGain, type TrimBus } from '../src/audio/engine.ts';
import { MAX_CONTACT_VOICES } from '../src/audio/voiceAllocator.ts';
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

describe('the audio engine: the graph it builds', () => {
  it('routes every bus to master, and only music through the duck', () => {
    const { engine, context } = boot();
    try {
      const graph = engine.graph;
      assert.ok(graph !== null, 'the graph exists once started');
      const master = graph.master as unknown as StubAudioNode;

      // Every bus reaches master through its own trim: one hop to the trim,
      // one to master.
      for (const bus of BUSES.filter((name) => name !== 'music')) {
        const node = graph[bus] as unknown as StubAudioNode;
        assert.equal(hops(node, master), 2, `${bus} reaches master through its trim`);
      }
      // Music is the one that does not: bus -> duck -> trim -> master, so the
      // Precedence Law's dip cannot be undone by turning the score up.
      assert.equal(
        hops(graph.music as unknown as StubAudioNode, master),
        3,
        'music passes through the duck on its way to its trim'
      );
      assert.equal(hops(master, context.destination), 1, 'master reaches the device');
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

      analyser.level = 0.6;
      engine.onEchoTick();
      assert.equal(duck.gain.value, DUCK_FLOOR, 'a busy contact bus dips the music');

      analyser.level = 0;
      engine.onEchoTick();
      assert.equal(duck.gain.value, 1, 'and silence releases it');
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
