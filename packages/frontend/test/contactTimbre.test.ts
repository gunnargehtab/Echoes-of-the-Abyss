/**
 * What a contact is, never whose it is (#618) — docs/audio-direction.md §8.1.
 *
 * The Echo Layer sends no faction for a creature or a piece of ordnance, on
 * purpose — "a creature belongs to nobody, and sending a meaningless slot
 * would let a client infer that this is fauna one tier earlier than it
 * earned". The mix used to fill that gap with the Consortium's recipe, so
 * every classified Sounder, Draymaw, torpedo and mine sounded like a
 * Consortium hull: the mix asserting a fact the server never sent, which is
 * §2's second law inverted. It then filled it with an anonymous voice, which
 * asserted nothing and told the player nothing either. §8.1 is the answer that
 * stuck: two families of their own, on the same terms as the four navies.
 *
 * These are written as the rules and not as the implementations. The table
 * tests iterate every family there is rather than naming one, so a fifth navy
 * extends them for free; the measured tests drive the real `ContactVoice`
 * against the repository's headless `AudioContext` and count instants rather
 * than watching a stopwatch.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Biome, Faction, FaunaSpecies, OrdnanceKind, ResolutionTier, SIM } from '@echoes/shared';
import {
  ContactVoice,
  ENVELOPE,
  RECIPROCATING,
  SWARM_LAYERS,
  THUMP_PARTIALS,
  type VoiceInputs,
} from '../src/audio/contactVoice.ts';
import {
  ALL_TIMBRES,
  CREATURE_TIMBRE,
  FACTION_TIMBRE,
  ORDNANCE_TIMBRE,
  identityFor,
  timbreFor,
  type ContactTimbre,
} from '../src/audio/timbre.ts';
import { ContactMixer } from '../src/audio/contactMixer.ts';
import { VoiceAllocator } from '../src/audio/voiceAllocator.ts';
import { HeadlessAudioContext, StubGainNode, StubOscillatorNode } from './support/headlessAudio.ts';

/** Every navy, as numbers — `Faction` is a numeric enum, so keys reverse-map. */
const NAVIES = Object.values(Faction).filter((v): v is Faction => typeof v === 'number');

/** The families §8.1 adds, with the name the failure message should carry. */
const NON_NAVY: readonly [string, ContactTimbre, Partial<VoiceInputs>][] = [
  ['a creature', CREATURE_TIMBRE, { fauna: FaunaSpecies.Sounder }],
  ['a piece of ordnance', ORDNANCE_TIMBRE, { ordnance: OrdnanceKind.Torpedo }],
];

const STEP_S = 1 / 60;
const SPAN_S = 30;

/** The lowest and highest interval a mechanism's own wander admits, seconds. */
function periodBand(timbre: ContactTimbre): [number, number] | null {
  if (timbre.rateHz <= 0) return null;
  return [
    (1 / timbre.rateHz) * (1 - timbre.jitter / 2),
    (1 / timbre.rateHz) * (1 + timbre.jitter / 2),
  ];
}

/**
 * Every instant the voice bumped its oscillator, driving the real class.
 *
 * `emit`'s `setValueAtTime` on `oscGain` *is* the event — the level ramps
 * around it are `setTargetAtTime` — so filtering by method isolates them
 * exactly, with no threshold and no interpretation.
 *
 * `at` is the instant the event was placed at, which since #731 is not the
 * instant the caller asked: a mechanism's train is scheduled ahead on the
 * audio clock, so these are the times the player hears and not the times the
 * driver happened to tick.
 */
function drive(
  identity: Partial<VoiceInputs>,
  tier: ResolutionTier,
  stepS: number = STEP_S,
  freshnessAt: (t: number) => number = () => 1
) {
  const context = new HeadlessAudioContext();
  const destination = context.createGain();
  const voice = new ContactVoice(
    context as unknown as AudioContext,
    destination as unknown as AudioNode
  );
  const osc = context.nodes.find((n): n is StubOscillatorNode => n instanceof StubOscillatorNode)!;
  // The gain the oscillator feeds is `oscGain`, by the graph the constructor
  // builds — found through the edge rather than by creation order, which is an
  // implementation detail this test has no business knowing.
  const oscGain = osc.outputs[0] as StubGainNode;

  for (let t = 0; t < SPAN_S; t += stepS) {
    voice.update(
      { tier, biome: Biome.OpenWater, freshness: freshnessAt(context.currentTime), ...identity },
      context.currentTime
    );
    context.advance(stepS);
  }

  return {
    osc,
    writes: oscGain.gain.writes,
    events: oscGain.gain.writes.filter((w) => w.method === 'setValueAtTime'),
    pulses: oscGain.gain.writes.filter((w) => w.method === 'setValueAtTime').map((w) => w.at),
  };
}

/**
 * Assert a voice is the one that identifies nothing.
 *
 * Not "is it a sine" any more, and the difference matters. §11's speaker
 * profile put the unclassified thump on a harmonic series so a phone speaker
 * can reproduce a 55 Hz fundamental it cannot radiate (#663), so the voice
 * with no identity is now a custom wave rather than a basic one — and a test
 * that kept asking for `sine` would fail the fix rather than the bug.
 *
 * What §3 actually promises is that these tiers carry no class information,
 * which is a statement about *sameness*: every unclassified contact gets the
 * same series, whatever the server knows about it. So that is what is checked
 * — the exact coefficients, against the one table they come from.
 */
function assertUnidentifying(osc: StubOscillatorNode, hz: number, message: string): void {
  assert.equal(osc.type, 'custom', `${message} — not on the unidentifying wave`);
  const wave = osc.periodicWave;
  assert.ok(wave !== null, `${message} — no wave was set`);
  // Compared with a tolerance, not exactly: a PeriodicWave holds Float32
  // coefficients, so 0.35 comes back as 0.3499999940395355 and an exact
  // comparison would fail on the storage rather than on the series.
  const expected = [0, ...THUMP_PARTIALS];
  assert.equal(wave.imag.length, expected.length, `${message} — a series of the wrong length`);
  for (let n = 0; n < expected.length; n++) {
    assert.ok(
      Math.abs(wave.imag[n]! - expected[n]!) < 1e-6,
      `${message} — partial ${n} is ${wave.imag[n]}, not ${expected[n]}`
    );
  }
  assert.ok(
    Array.from(wave.real).every((coefficient) => coefficient === 0),
    `${message} — the series carries cosine partials the thump does not`
  );
  assert.equal(osc.frequency.writes.at(-1)?.value, hz, `${message} — off §3's fundamental`);
}

function pulseInstants(identity: Partial<VoiceInputs>, tier: ResolutionTier): number[] {
  return drive(identity, tier).pulses;
}

/** Widest gap between the longest and shortest interval between pulses. */
function periodSpread(instants: number[]): number {
  if (instants.length < 3) return Number.NaN;
  const periods: number[] = [];
  for (let i = 1; i < instants.length; i++) periods.push(instants[i]! - instants[i - 1]!);
  return Math.max(...periods) - Math.min(...periods);
}

describe('contact timbre', () => {
  it('gives a non-navy contact a recipe that is no navy of any of them', () => {
    for (const [name, timbre] of NON_NAVY) {
      for (const navy of NAVIES) {
        const theirs = FACTION_TIMBRE[navy];
        // Reference equality first: the bug was not an equal recipe, it was
        // the Consortium's own object handed out under another name.
        assert.notEqual(timbre, theirs, `${name} borrows ${Faction[navy]}'s timbre object`);
        assert.ok(
          timbre.wave !== theirs.wave ||
            timbre.baseHz !== theirs.baseHz ||
            timbre.rateHz !== theirs.rateHz,
          `${name} is indistinguishable from ${Faction[navy]} on wave, baseHz and rateHz`
        );
      }
    }
  });

  it('puts every non-navy fundamental clear of every navy fundamental and its octaves', () => {
    // A voice an octave off a navy is that navy detuned, which is the same
    // false claim one step quieter. The Tier 1-2 thump is in the exclusion for
    // the other direction: a classified creature must not read as an
    // *un*classified anything either.
    const spokenFor: [number, string][] = [
      [55, 'the Tier-1 thump'],
      [72, 'the Tier-2 thump'],
    ];
    for (const navy of NAVIES) {
      for (let octave = -2; octave <= 2; octave++) {
        const hz = FACTION_TIMBRE[navy].baseHz * 2 ** octave;
        if (hz < 20 || hz > 400) continue;
        spokenFor.push([hz, Faction[navy]!]);
      }
    }

    for (const [name, timbre] of NON_NAVY) {
      for (const [hz, owner] of spokenFor) {
        assert.ok(
          Math.abs(timbre.baseHz - hz) >= 10,
          `${name} at ${timbre.baseHz} Hz is within 10 Hz of ${hz} Hz (${owner})`
        );
      }
    }
  });

  it('gives no two mechanisms the same interval between events', () => {
    // §8.1: "No two mechanisms in this game may produce the same interval
    // between events." Asserted over the whole table rather than over the
    // pairs the design call named, because the pairs are the symptom and
    // pairwise disjointness is the rule — and a fifth navy inherits it.
    const bands = ALL_TIMBRES.map((t) => [periodBand(t), t] as const)
      .filter((pair): pair is readonly [[number, number], ContactTimbre] => pair[0] !== null)
      .sort((a, b) => a[0][0] - b[0][0]);

    assert.ok(bands.length >= 5, 'fixture expects every family with events to be measured');
    for (let i = 1; i < bands.length; i++) {
      const [faster, fasterTimbre] = bands[i - 1]!;
      const [slower, slowerTimbre] = bands[i]!;
      assert.ok(
        slower[0] >= faster[1] * 1.2,
        `${slowerTimbre.mechanism} (${slower[0].toFixed(4)} s at its fastest) is under 1.2x clear ` +
          `of ${fasterTimbre.mechanism} (${faster[1].toFixed(4)} s at its slowest)`
      );
    }
  });

  it('keeps the beat the Consortium’s, and gives no other identity one', () => {
    // §8: the Consortium is "the only faction with a *beat*". A beat is a
    // period that does not wander — so the test of one is spread, and the
    // floor it is measured against is the update grid itself, since a 60 Hz
    // caller quantises even an exactly periodic pulse into two neighbouring
    // frame counts.
    const consortium = pulseInstants({ faction: Faction.Bathyarch }, ResolutionTier.Classification);
    assert.ok(consortium.length > 3, 'the Consortium must still pulse at all');
    assert.ok(
      periodSpread(consortium) <= STEP_S * 1.01,
      'the Consortium lost its beat: its period now wanders'
    );

    const others: [string, Partial<VoiceInputs>][] = [
      ...NAVIES.filter((f) => f !== Faction.Bathyarch).map((f): [string, Partial<VoiceInputs>] => [
        Faction[f]!,
        { faction: f },
      ]),
      ...NON_NAVY.map(([name, , identity]): [string, Partial<VoiceInputs>] => [name, identity]),
      ['a contact with no identity', {}],
    ];
    for (const [name, identity] of others) {
      const instants = pulseInstants(identity, ResolutionTier.Classification);
      if (instants.length === 0) continue; // No events at all is the strongest form of "no beat".
      assert.ok(
        periodSpread(instants) > STEP_S * 1.01,
        `${name} presents a beat, which §8 reserves to the Consortium`
      );
    }
  });

  it('gives an eventless mechanism no pulse rather than a slow one', () => {
    // Zeroing `rateHz` alone used to buy a 1.5000 s zero-jitter metronome —
    // one signature traded for another, and a guard written on wave, baseHz
    // and rateHz would have passed while the periodicity survived.
    const drone = timbreFor({ sort: 'navy', faction: Faction.Hadron });
    assert.equal(drone?.rateHz, 0, 'fixture assumes an eventless mechanism');
    assert.deepEqual(
      pulseInstants({ faction: Faction.Hadron }, ResolutionTier.Classification),
      [],
      'an eventless mechanism emitted a pulse'
    );
  });

  it('sounds a classified creature and a classified torpedo as their own families', () => {
    // The positive half of §7's "unmistakably not a fleet": the two families
    // have to reach the oscillator, not merely fail to be a navy.
    for (const [name, timbre, identity] of NON_NAVY) {
      const { osc, pulses } = drive(identity, ResolutionTier.Classification);
      assert.equal(osc.type, timbre.wave, `${name} is not voiced on its own waveform`);
      const settled = osc.frequency.writes.at(-1);
      assert.equal(settled?.value, timbre.baseHz, `${name} is not voiced on its own fundamental`);
      assert.ok(pulses.length > 2, `${name} has a mechanism but emitted no events`);
    }
  });

  it('lets no family reach a voice below Tier 3', () => {
    // §8.1: identity and classification are the same event. A creature is a
    // creature from the moment it exists, so the gate cannot be "the server
    // withheld it" — the mix has to refuse it even when it is handed one.
    for (const [name, , identity] of NON_NAVY) {
      const { osc } = drive(identity, ResolutionTier.Bearing);
      assertUnidentifying(osc, 72, `${name} carried its voice into Tier 2`);
    }
  });

  it('answers a Tier-3 contact of no identity with the thump rather than a navy', () => {
    // `timbreFor` has no defaulting branch (acceptance criterion 6), so there
    // is nothing left for an unrecognised contact to borrow. What it gets
    // instead is the voice that identifies nothing — under-claiming, which is
    // the only direction §2 allows.
    assert.equal(timbreFor(undefined), null, 'timbreFor invented a family for no identity');
    assert.equal(identityFor({}), undefined, 'identityFor invented an identity from nothing');

    const { osc, pulses } = drive({}, ResolutionTier.Classification);
    assertUnidentifying(osc, 72, 'a Tier-3 contact of no identity');
    assert.ok(pulses.length > 3, 'a Tier-3 contact of no identity fell silent');
    assert.ok(periodSpread(pulses) > STEP_S * 1.01, 'it became periodic');
  });

  it('still gives a contact below Tier 3 its wandering thump', () => {
    // The rules above must not reach down into the tiers that carry no
    // identity at all: §3's "irregular period 1.2-2.5 s" is a different rule,
    // and an unclassified return going silent would be a worse bug than the
    // one being fixed.
    const instants = pulseInstants({}, ResolutionTier.Bearing);
    assert.ok(instants.length > 3, 'a Tier-2 contact fell silent');
    assert.ok(periodSpread(instants) > STEP_S * 1.01, 'a Tier-2 contact became periodic');
  });

  it('reads exactly one identity off the wire fields, in the Echo Layer’s own order', () => {
    assert.deepEqual(identityFor({ faction: Faction.Pelagia }), {
      sort: 'navy',
      faction: Faction.Pelagia,
    });
    assert.deepEqual(identityFor({ fauna: FaunaSpecies.Rasp }), {
      sort: 'creature',
      species: FaunaSpecies.Rasp,
    });
    assert.deepEqual(identityFor({ ordnance: OrdnanceKind.Mine }), {
      sort: 'ordnance',
      kind: OrdnanceKind.Mine,
    });
  });
});

/**
 * The rate the engine actually drives a voice at — `engine.ts`'s `onEchoTick`,
 * once per Echo snapshot.
 *
 * The tests above drive at 60 Hz, which is a fine way to sample a train
 * densely and was, until #731, the reason none of them could see the fault
 * they were written to hold. A mechanism scheduled only at the instant the
 * caller asked was quantised onto the caller's grid, and every property here
 * was measured on a 60 Hz grid the game never uses: on the 5 Hz one it does,
 * the Directorate's whole period band lies inside a single tick, so the swarm
 * rendered as an exact 0.2000 s metronome — a beat §8 reserves to the
 * Consortium, at the ordnance screw's own shortest interval, which §8.1
 * forbids. The block below measures at the Echo rate for that reason.
 */
const ECHO_STEP_S = 1 / SIM.ECHO_HZ;

/** Every family with events, and the identity that reaches it. */
const SOUNDING: readonly [string, Partial<VoiceInputs>][] = [
  ...NAVIES.filter((f) => FACTION_TIMBRE[f].rateHz > 0).map((f): [string, Partial<VoiceInputs>] => [
    Faction[f]!,
    { faction: f },
  ]),
  ['a creature', { fauna: FaunaSpecies.Sounder }],
  ['a piece of ordnance', { ordnance: OrdnanceKind.Torpedo }],
];

/**
 * The loudest event a voice with no family reaches — §3's thump, bumped.
 *
 * The boundary between "this contact still has a family" and "it does not",
 * read off the real class rather than written down here, so a change to either
 * level moves it with them.
 */
const THUMP_PEAK = Math.max(
  ...(() => {
    const context = new HeadlessAudioContext();
    const destination = context.createGain();
    const voice = new ContactVoice(
      context as unknown as AudioContext,
      destination as unknown as AudioNode
    );
    const osc = context.nodes.find(
      (n): n is StubOscillatorNode => n instanceof StubOscillatorNode
    )!;
    const oscGain = osc.outputs[0] as StubGainNode;
    for (let tick = 0; tick < 40; tick++) {
      voice.update(
        { tier: ResolutionTier.Bearing, biome: Biome.OpenWater, freshness: 1 },
        context.currentTime
      );
      context.advance(1 / SIM.ECHO_HZ);
    }
    return oscGain.gain.writes.filter((w) => w.method === 'setValueAtTime').map((w) => w.value);
  })()
);

/** Every interval between consecutive events, seconds. */
function intervals(instants: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < instants.length; i++) out.push(instants[i]! - instants[i - 1]!);
  return out;
}

describe('contact mechanisms, at the rate the engine drives them', () => {
  it('places a family’s events at the same instants however often it is asked', () => {
    // The property the rest of this block rests on, and the one that makes
    // §8.1's separation a fact about the mix rather than about its driver. A
    // mechanism's train is a function of absolute time, so a caller that runs
    // at 5 Hz and one that runs at 60 hear the same clicks at the same
    // moments — which is exactly what was not true before #731.
    for (const [name, identity] of [
      ['the Directorate swarm', { faction: Faction.Directorate }],
      ['the Consortium beat', { faction: Faction.Bathyarch }],
      ['a piece of ordnance', { ordnance: OrdnanceKind.Torpedo }],
    ] as const) {
      const slow = drive(identity, ResolutionTier.Classification, ECHO_STEP_S).pulses.filter(
        (at) => at < SPAN_S
      );
      const fast = drive(identity, ResolutionTier.Classification, STEP_S).pulses.filter(
        (at) => at < SPAN_S
      );
      assert.ok(slow.length > 3, `${name} emitted almost nothing at the Echo rate`);
      assert.equal(
        slow.length,
        fast.length,
        `${name} emits ${slow.length} events at 5 Hz and ${fast.length} at 60 Hz`
      );
      for (let i = 0; i < slow.length; i++) {
        assert.ok(
          Math.abs(slow[i]! - fast[i]!) < 1e-9,
          `${name}'s event ${i} lands at ${slow[i]} at 5 Hz and ${fast[i]} at 60 Hz`
        );
      }
    }

    // And the case where it is not trivial. §3 lengthens a fading contact's
    // period, so `stretch` is the one term of the train that is server state —
    // which means the claim above is "given the same state", and the honest
    // bound here is *close*, not identical: the two callers schedule a given
    // event from different updates, and an update either side of a change in
    // freshness stretches it differently. It cannot be otherwise without the
    // voice predicting a freshness the server has not sent. Held as a bound so
    // the wording of the docblock is checkable rather than reassuring.
    //
    // A one-second staircase rather than a smooth ramp, because freshness
    // arrives on the tick: a caller sampling a curve at 60 Hz would be reading
    // a decay nobody sent, which is the very thing §12's row refuses.
    const fading = (t: number) => Math.max(0, 1 - Math.floor(t + 1e-9) * 0.05);
    const slow = drive(
      { faction: Faction.Directorate },
      ResolutionTier.Classification,
      ECHO_STEP_S,
      fading
    ).pulses.filter((at) => at < SPAN_S);
    const fast = drive(
      { faction: Faction.Directorate },
      ResolutionTier.Classification,
      STEP_S,
      fading
    ).pulses.filter((at) => at < SPAN_S);
    const period = 1 / FACTION_TIMBRE[Faction.Directorate].rateHz;
    assert.ok(
      Math.abs(slow.length - fast.length) <= SWARM_LAYERS,
      `a decaying contact emitted ${slow.length} events at 5 Hz and ${fast.length} at 60 Hz`
    );
    const paired = Math.min(slow.length, fast.length);
    const drift = Math.max(
      ...Array.from({ length: paired }, (_, i) => Math.abs(slow[i]! - fast[i]!))
    );
    assert.ok(
      drift < period,
      `a decaying contact's trains drifted ${drift.toFixed(4)} s apart, past one family period`
    );
  });

  it('renders no two mechanisms at the same interval', () => {
    // §8.1's separation property, measured on what the graph is told rather
    // than on the table it was read from. The table test above is still the
    // rule; this is the rule surviving the engine — which it did not, since
    // the swarm and the screw were both being handed 0.2000 s.
    const bands = SOUNDING.map(([name, identity]) => {
      const gaps = intervals(drive(identity, ResolutionTier.Classification, ECHO_STEP_S).pulses);
      assert.ok(gaps.length > 2, `${name} rendered too few events to measure`);
      return { name, lo: Math.min(...gaps), hi: Math.max(...gaps) };
    }).sort((a, b) => a.lo - b.lo);

    for (let i = 1; i < bands.length; i++) {
      const faster = bands[i - 1]!;
      const slower = bands[i]!;
      assert.ok(
        slower.lo >= faster.hi * 1.2,
        `${slower.name} (${slower.lo.toFixed(4)} s at its fastest) is under 1.2x clear of ` +
          `${faster.name} (${faster.hi.toFixed(4)} s at its slowest)`
      );
    }
  });

  it('keeps the beat the Consortium’s once the Echo tick stops supplying one', () => {
    // The regression the quantisation was: a swarm whose every period was
    // shorter than one tick came out perfectly periodic, so the mix gave the
    // Directorate the one signature §8 reserves — and the 60 Hz tests could
    // not see it, because at 60 Hz the jitter survives.
    const swarm = drive(
      { faction: Faction.Directorate },
      ResolutionTier.Classification,
      ECHO_STEP_S
    );
    const gaps = intervals(swarm.pulses);
    assert.ok(
      periodSpread(swarm.pulses) > ECHO_STEP_S * 0.1,
      'the Directorate presents a beat at the rate the engine drives it'
    );

    // And its cluster is finally heard at the rate its own row declares: 9
    // events a second, not the 5 the tick could express. Counted as clusters
    // rather than as clicks, since §8's swarm event is `SWARM_LAYERS` of them
    // — which is what keeps `rateHz` meaning what its docblock says and keeps
    // §8.1's period band a description of what the mix renders.
    const declared = 1 / FACTION_TIMBRE[Faction.Directorate].rateHz;
    const clusters = swarm.pulses.filter((at) => at < SPAN_S).length / SWARM_LAYERS;
    assert.ok(
      Math.abs(clusters / SPAN_S - FACTION_TIMBRE[Faction.Directorate].rateHz) < 0.5,
      `the swarm renders ${(clusters / SPAN_S).toFixed(2)} clusters a second against the ` +
        `${FACTION_TIMBRE[Faction.Directorate].rateHz} Hz it declares`
    );
    assert.ok(
      Math.max(...gaps) <= declared * 1.2,
      'a gap longer than the declared period: the cluster is not the family event'
    );

    // The positive control, and the half that must not move: the Consortium's
    // period is exact, and now exact without the grid rounding it there.
    const beat = drive({ faction: Faction.Bathyarch }, ResolutionTier.Classification, ECHO_STEP_S);
    assert.ok(periodSpread(beat.pulses) < 1e-6, 'the Consortium lost its beat');
  });

  it('gives the Consortium a stroke and a return, and spends nothing on when', () => {
    // §8: "machinery under load; steel, reciprocating". A reciprocating machine
    // has a stroke and a return; the mix had one strike repeated, which is the
    // event shape the breathing, swell and screw families already had at a
    // different rate — the EQ-curve distinction §8 opens by ruling out. The
    // argument in full is in `RECIPROCATING`, including why the swarm and the
    // drone are not in that list.
    //
    // The cycle is carried by *what each strike is* rather than by when it
    // lands. §8.1 admits two uneven placements as well, and `RECIPROCATING`
    // argues the choice; what is asserted here is the consequence, which is
    // that the strike train did not move. An uneven split is exactly what a
    // later round reaching for "more mechanical" would try, and it is a design
    // call rather than a refinement — it changes what §8's beat is measured
    // over, so it fails the beat test above and should.
    const beat = drive({ faction: Faction.Bathyarch }, ResolutionTier.Classification, ECHO_STEP_S);

    // Each strike with the level it decays back to — the voice's own base,
    // read off the class rather than restated here, so the lifts below are
    // ratios of something real. The decay is the write immediately after the
    // strike, which is how `strike` places the pair.
    const strikes: { peak: number; base: number }[] = [];
    for (let i = 0; i < beat.writes.length - 1; i++) {
      if (beat.writes[i]!.method !== 'setValueAtTime') continue;
      const decay = beat.writes[i + 1]!;
      assert.equal(decay.method, 'setTargetAtTime', 'a strike was written without its decay');
      strikes.push({ peak: beat.writes[i]!.value, base: decay.value });
    }
    assert.ok(strikes.length > 6, 'the Consortium wrote too few strikes to measure');

    const strokeLift = strikes[0]!.peak - strikes[0]!.base;
    assert.ok(strokeLift > 0, 'the loaded stroke does not lift the voice at all');
    for (let i = 0; i < strikes.length; i++) {
      const { peak, base } = strikes[i]!;
      const stroke = i % RECIPROCATING.STROKES === 0;
      const expected = strokeLift * (stroke ? 1 : RECIPROCATING.RETURN_LIFT);
      assert.ok(
        Math.abs(peak - base - expected) < 1e-9,
        `strike ${i} lifts ${(peak - base).toFixed(4)} where the ` +
          `${stroke ? 'stroke' : 'return'} lifts ${expected.toFixed(4)}: the cycle is gone`
      );
      // A return is the unloaded half and not a tier handed back. Under the
      // thump's own peak it would be an unclassified event on alternate
      // strikes, which is §3's line crossed from the other side.
      assert.ok(
        peak > THUMP_PEAK + 1e-9,
        `strike ${i} peaks at ${peak.toFixed(4)}, under the unidentifying thump's ${THUMP_PEAK}`
      );
    }

    // And the half that must not have moved: every strike still lands on the
    // family's declared period, so §8.1's separation is untouched by
    // construction rather than re-argued. The beat test above holds the spread
    // at zero; this holds *which* period it is exact at.
    const declared = 1 / FACTION_TIMBRE[Faction.Bathyarch].rateHz;
    for (const gap of intervals(beat.pulses)) {
      assert.ok(
        Math.abs(gap - declared) < 1e-9,
        `a strike landed ${gap.toFixed(4)} s after the last, not on the declared ${declared}`
      );
    }

    // The cycle is a periodicity of its own, though — the alternation repeats
    // every `STROKES` strikes, and no table test covers that: `periodBand`
    // reads `rateHz`, which is the strike. §8.1 as written
    // describes "its rate, widened by its own wander" and says nothing about a
    // cycle above it, so holding one to the same 1.2x is the mix being
    // *stricter* than the doc rather than the doc being extended. Kept that way
    // deliberately: a firing does not widen a property in the design bible.
    const cycleS = (RECIPROCATING.STROKES * 1) / FACTION_TIMBRE[Faction.Bathyarch].rateHz;
    for (const timbre of ALL_TIMBRES) {
      if (timbre === FACTION_TIMBRE[Faction.Bathyarch]) continue;
      const band = periodBand(timbre);
      if (band === null) continue;
      assert.ok(
        band[0] >= cycleS * 1.2 || cycleS >= band[1] * 1.2,
        `the reciprocating cycle at ${cycleS.toFixed(4)} s is under 1.2x clear of ` +
          `${timbre.mechanism} (${band[0].toFixed(4)}-${band[1].toFixed(4)} s)`
      );
    }
  });

  it('gives every Consortium contact its own crank, not the water’s', () => {
    // `strokePhase` is counted along the voice's own train rather than read off
    // the clock, and this is the only thing that says so. A phase derived from
    // absolute time — `Math.round(at * rateHz) % STROKES`, which is the shape
    // `swarmSpread` two functions away would suggest to a refactor — passes
    // every other test in this file and puts every Consortium hull in the water
    // on the same stroke. That is the lockstep #742 left open on the swarm, and
    // a crank is the one place it plainly does not belong: two machines are not
    // built at the same instant.
    //
    // Four offsets across one cycle rather than one, because any nonconstant
    // function of absolute time agrees with the counter at *some* offset, and a
    // single one would assert this on luck.
    const strikeS = 1 / FACTION_TIMBRE[Faction.Bathyarch].rateHz;
    const context = new HeadlessAudioContext();
    const destination = context.createGain();
    const inputs = {
      tier: ResolutionTier.Classification,
      biome: Biome.OpenWater,
      freshness: 1,
      faction: Faction.Bathyarch,
    };

    const voices: { voice: ContactVoice; gain: StubGainNode }[] = [];
    for (let i = 0; i < 4; i++) {
      // Built one at a time as the match would build them, each at its own
      // instant, and found through the graph rather than by creation order.
      const built = context.nodes.length;
      const voice = new ContactVoice(
        context as unknown as AudioContext,
        destination as unknown as AudioNode
      );
      const osc = context.nodes
        .slice(built)
        .find((n): n is StubOscillatorNode => n instanceof StubOscillatorNode)!;
      voices.push({ voice, gain: osc.outputs[0] as StubGainNode });
      voice.update(inputs, context.currentTime);
      for (const live of voices) live.voice.update(inputs, context.currentTime);
      context.advance((strikeS * RECIPROCATING.STROKES) / 4);
    }

    const opening = voices.map(
      ({ gain }) => gain.gain.writes.filter((w) => w.method === 'setValueAtTime')[0]!
    );
    for (let i = 0; i < opening.length; i++) {
      assert.ok(
        Math.abs(opening[i]!.value - opening[0]!.value) < 1e-9,
        `the voice built at ${opening[i]!.at.toFixed(4)} s opens at ` +
          `${opening[i]!.value.toFixed(4)} and the first at ${opening[0]!.value.toFixed(4)}: ` +
          'the cycle is being read off the clock, so every crank in the water is the same one'
      );
    }
    assert.ok(
      new Set(opening.map((w) => w.at.toFixed(6))).size === opening.length,
      'fixture expects four voices opening at four different instants'
    );
  });

  it('hears the swarm organise: clicks that close into unison, then scatter', () => {
    // §8's Directorate is "clicks that phase into unison as cohorts converge —
    // you hear them *organise*". That is a statement about *when clicks land*,
    // so it is asserted about when they land. A level that rose and fell on a
    // train whose instants never moved would be a tremolo, and a tremolo on a
    // continuous tone is what #731 reports hearing in the first place.
    const swarm = drive(
      { faction: Faction.Directorate },
      ResolutionTier.Classification,
      ECHO_STEP_S
    );
    const period = 1 / FACTION_TIMBRE[Faction.Directorate].rateHz;
    const gaps = intervals(swarm.pulses.filter((at) => at < SPAN_S));

    // Closed: the layers land together, so some gaps are ~nothing and the gap
    // to the next cluster is the family's whole period.
    assert.ok(
      Math.min(...gaps) < period * 0.02,
      `the layers never came within ${(period * 0.02).toFixed(4)} s of unison: nothing converges`
    );
    assert.ok(
      Math.max(...gaps) > period * 0.85,
      'no gap ever opened to the family period, so the cluster never closed'
    );

    // Scattered: three layers evenly spread is three gaps of a third of the
    // period each, which is the other end of the same cycle.
    let evenly = 0;
    for (let i = SWARM_LAYERS - 1; i < gaps.length; i++) {
      const window = gaps.slice(i - SWARM_LAYERS + 1, i + 1);
      if (window.every((g) => g > period * 0.25 && g < period * 0.42)) evenly++;
    }
    assert.ok(evenly > 0, 'the cluster never spread evenly, so it only ever sounded as one click');

    // And it is a *cycle* rather than a one-off, measured on the cluster's own
    // spread rather than on gaps: a closed cluster produces two near-zero gaps
    // every period, so counting those counts clusters, not cycles. `emit`
    // writes one cluster's layers together and in order, so every run of
    // `SWARM_LAYERS` events is one cluster and its first-to-last span is the
    // spread the design breathes.
    const spreads: number[] = [];
    for (let i = 0; i + SWARM_LAYERS <= swarm.events.length; i += SWARM_LAYERS) {
      spreads.push(swarm.events[i + SWARM_LAYERS - 1]!.at - swarm.events[i]!.at);
    }
    assert.ok(spreads.length > 100, 'too few clusters to measure a cycle');
    const widest = Math.max(...spreads);
    assert.ok(Math.min(...spreads) < period * 0.02, 'no cluster ever closed to unison');
    assert.ok(
      widest > period * 0.5,
      `the widest cluster spans ${widest.toFixed(4)} s, so the layers never spread apart`
    );

    let cycles = 0;
    for (let i = 1; i < spreads.length; i++) {
      if (spreads[i]! < widest / 2 && spreads[i - 1]! >= widest / 2) cycles++;
    }
    assert.ok(cycles >= 2, `the swarm closed ${cycles} times in ${SPAN_S} s, which is not a cycle`);

    // Bounded the other way too, which is the half that matters most. A
    // cluster that tightened and scattered inside a few of its own periods is
    // not something a player hears organise — it is an amplitude wobble at
    // click rate, which is exactly the tremolo #731 reports hearing. Without
    // this the organise rate could be set to the family rate itself and
    // nothing in this file would tell the fix from the fault.
    const periodsPerCycle = 8;
    assert.ok(
      cycles <= (SPAN_S * FACTION_TIMBRE[Faction.Directorate].rateHz) / periodsPerCycle,
      `the swarm closed ${cycles} times in ${SPAN_S} s, faster than one cycle per ` +
        `${periodsPerCycle} clicks — a tremolo rather than a swarm organising`
    );

    // The level follows the spread, and is the summing an AudioParam timeline
    // cannot do: two writes at one instant do not add, the later simply wins.
    // So a cluster that has closed must land harder than one that is spread,
    // and a spread one must still land at all.
    const base = Math.max(
      ...swarm.writes.filter((w) => w.method === 'setTargetAtTime').map((w) => w.value)
    );
    const peaks = swarm.events.map((w) => w.value);
    assert.ok(
      Math.min(...peaks) > base * 1.15,
      `a swarm click lands at ${Math.min(...peaks).toFixed(3)} against a voice level of ` +
        `${base.toFixed(3)}: a scattered layer has gone silent, and §8's swarm thins rather ` +
        'than stopping'
    );
    const byTightness = spreads
      .map((spread, k) => ({ spread, peak: swarm.events[k * SWARM_LAYERS]!.value }))
      .sort((a, b) => a.spread - b.spread);
    const third = Math.floor(byTightness.length / 3);
    const meanPeak = (xs: { peak: number }[]) => xs.reduce((a, b) => a + b.peak, 0) / xs.length;
    assert.ok(
      meanPeak(byTightness.slice(0, third)) > meanPeak(byTightness.slice(-third)) * 1.05,
      'the tightest clusters land no harder than the loosest, so the level follows nothing'
    );

    // The control: no other family's level *follows* anything, so a cluster is
    // the swarm's own tell and not something the whole mix caught. Stated as a
    // fixed repeat rather than as one level, because §8 gives the Consortium a
    // stroke and a return and they are two strengths — but two that alternate
    // exactly, which is a cycle and not a cluster closing. Everyone else
    // repeats on one.
    for (const [name, identity] of SOUNDING) {
      if (name === Faction[Faction.Directorate]) continue;
      const theirs = drive(identity, ResolutionTier.Classification, ECHO_STEP_S);
      const values = theirs.events.map((w) => w.value);
      const cycle = name === Faction[Faction.Bathyarch] ? RECIPROCATING.STROKES : 1;
      assert.ok(
        values.every((v, k) => Math.abs(v - values[k % cycle]!) < 1e-9),
        `${name}'s events vary in strength off any fixed cycle, which belongs to a cluster ` +
          'that is closing'
      );
      assert.ok(
        Math.min(...intervals(theirs.pulses)) > 1e-6,
        `${name} emits clicks on top of one another, which is the swarm's own shape`
      );
    }
  });

  it('gives the swarm a tick, the Consortium both, and every other family the breath', () => {
    // Why the swarm needed an envelope of its own, in one comparison. Every
    // mechanism used to ease back over BREATH.decayS, which is longer than the
    // whole gap between two swarm events — so no click was ever a click, only
    // a tremolo on a continuous tone, which is what #731 reports hearing.
    //
    // Asserted on the decay the voice actually wrote, not on arithmetic
    // between two exported constants: the round before this one held the
    // shape that way and the swarm could be put straight back on the breath
    // with the whole suite still green.
    // Each event's own decay is the write immediately after it, which is how
    // `strike` places the pair — picking them out by value instead would also
    // collect the level ramp `update` writes every tick for its own reasons.
    const decaysOf = (identity: Partial<VoiceInputs>) => {
      const writes = drive(identity, ResolutionTier.Classification, ECHO_STEP_S).writes;
      const out: { tau: number | undefined; hold: number }[] = [];
      for (let i = 0; i < writes.length - 1; i++) {
        if (writes[i]!.method !== 'setValueAtTime') continue;
        const next = writes[i + 1]!;
        assert.equal(next.method, 'setTargetAtTime', 'an event was written without its decay');
        // The hold as well as the decay. An envelope held at the bumped level
        // for as long as the gap to the next event is a level, not an event —
        // the voice is a continuous tone again, which is the fault this round
        // exists to fix, and a test reading only the time constant is blind to
        // it.
        out.push({ tau: next.timeConstant, hold: next.at - writes[i]!.at });
      }
      return out;
    };

    const swarmEnvelopes = decaysOf({ faction: Faction.Directorate });
    assert.ok(swarmEnvelopes.length > 10, 'the swarm wrote too few events to measure');
    for (const { tau, hold } of swarmEnvelopes) {
      assert.equal(tau, ENVELOPE.TICK.decayS, 'the swarm is not decaying on a tick');
      assert.ok(
        Math.abs(hold - ENVELOPE.TICK.holdS) < 1e-9,
        `a swarm click is held at its peak for ${hold.toFixed(4)} s, not ${ENVELOPE.TICK.holdS}`
      );
    }

    // The Consortium is the one family that uses both shapes, and it uses them
    // to say which half of its cycle a strike is: §8's loaded stroke rings and
    // its return knocks. Asserted as an alternation rather than as a set, so a
    // voice that gave every strike the same shape — the mechanism gone, the
    // constants still exported — fails here.
    const cycle = decaysOf({ faction: Faction.Bathyarch });
    assert.ok(cycle.length > 4, 'the Consortium wrote too few strikes to measure');
    for (let i = 0; i < cycle.length; i++) {
      const stroke = i % RECIPROCATING.STROKES === 0;
      const shape = stroke ? ENVELOPE.BREATH : ENVELOPE.TICK;
      const half = stroke ? 'stroke' : 'return';
      assert.equal(cycle[i]!.tau, shape.decayS, `the Consortium's ${half} is on the wrong shape`);
      assert.ok(
        Math.abs(cycle[i]!.hold - shape.holdS) < 1e-9,
        `the Consortium's ${half} is held for ${cycle[i]!.hold.toFixed(4)} s, not ${shape.holdS}`
      );
    }

    for (const [name, identity] of SOUNDING) {
      if (name === Faction[Faction.Directorate] || name === Faction[Faction.Bathyarch]) continue;
      const theirs = decaysOf(identity);
      assert.ok(theirs.length > 2, `${name} wrote too few events to measure`);
      for (const { tau, hold } of theirs) {
        assert.equal(tau, ENVELOPE.BREATH.decayS, `${name} lost the breath §8 gives it`);
        assert.ok(
          Math.abs(hold - ENVELOPE.BREATH.holdS) < 1e-9,
          `${name} holds its peak for ${hold.toFixed(4)} s, not ${ENVELOPE.BREATH.holdS}`
        );
      }
    }

    // And a hold is a fraction of the gap it has to sit in, for both shapes:
    // an envelope held for the whole period never comes back down at all.
    for (const [shape, gap] of [
      [ENVELOPE.TICK, 1 / (FACTION_TIMBRE[Faction.Directorate].rateHz * SWARM_LAYERS)],
      [ENVELOPE.BREATH, 1 / FACTION_TIMBRE[Faction.Bathyarch].rateHz],
    ] as const) {
      assert.ok(
        shape.holdS < gap * 0.25,
        `an envelope is held ${shape.holdS} s into a ${gap.toFixed(3)} s gap, which is a level`
      );
    }

    // And the shapes are the right way round for the spacing they have to sit
    // in. The densest the swarm gets is its layers evenly spread — a third of
    // the family's period — and what separates a click train from a tremolo is
    // how much of one event is still sounding when the next arrives.
    const densest = 1 / (FACTION_TIMBRE[Faction.Directorate].rateHz * SWARM_LAYERS);
    const leftOver = (tau: number) => Math.exp(-densest / tau);
    assert.ok(
      leftOver(ENVELOPE.TICK.decayS) < 0.25,
      `a tick still has ${(leftOver(ENVELOPE.TICK.decayS) * 100).toFixed(0)}% of itself left ` +
        'when the next click lands, which is a texture rather than a click'
    );
    assert.ok(
      leftOver(ENVELOPE.BREATH.decayS) > 0.7,
      'fixture assumes the breath smears at this spacing; it no longer does, so this is moot'
    );
  });

  it('starts a voice built mid-match at the caller’s clock, not at the context’s', () => {
    // `nextEventAt` starts at zero and a voice is constructed whenever a
    // contact is first heard, which in a match is minutes into a running
    // context. Without the snap in `scheduleEvents` the first update walks the
    // train from zero to now and lays the whole gap into the graph at once.
    //
    // Driven at Tier 2 on purpose, and that is the whole point of this test: a
    // voice that arrives *classified* is saved by the family-change branch,
    // which resets the train because the mechanism crossed from null. A voice
    // with no family crosses nothing — null is what it already was — so the
    // snap is the only thing standing between a new contact and its own
    // backlog. §3 gives Tier 1-2 an irregular 1.2-2.5 s thump, so five minutes
    // of it is a hundred and sixty-odd past-dated events on one tick.
    const context = new HeadlessAudioContext();
    context.advance(300);
    const destination = context.createGain();
    const voice = new ContactVoice(
      context as unknown as AudioContext,
      destination as unknown as AudioNode
    );
    const osc = context.nodes.find(
      (n): n is StubOscillatorNode => n instanceof StubOscillatorNode
    )!;
    const oscGain = osc.outputs[0] as StubGainNode;

    voice.update(
      { tier: ResolutionTier.Bearing, biome: Biome.OpenWater, freshness: 1 },
      context.currentTime
    );

    const events = oscGain.gain.writes.filter((w) => w.method === 'setValueAtTime');
    const stale = events.filter((w) => w.at < 300 - 1e-9);
    assert.equal(
      stale.length,
      0,
      `a voice built 300 s into a match scheduled ${stale.length} events in the past, the ` +
        'earliest at ' +
        (stale[0]?.at.toFixed(2) ?? 'n/a') +
        ' s'
    );
    assert.ok(
      events.length <= 2,
      `one update on a new voice wrote ${events.length} events, which is the gap replayed`
    );

    // The classified case too, so the branch that happens to cover it is not
    // quietly the only thing that does.
    const classified = new HeadlessAudioContext();
    classified.advance(300);
    const out = classified.createGain();
    const heard = new ContactVoice(
      classified as unknown as AudioContext,
      out as unknown as AudioNode
    );
    const osc2 = classified.nodes.find(
      (n): n is StubOscillatorNode => n instanceof StubOscillatorNode
    )!;
    heard.update(
      {
        tier: ResolutionTier.Classification,
        biome: Biome.OpenWater,
        freshness: 1,
        faction: Faction.Directorate,
      },
      classified.currentTime
    );
    const late = (osc2.outputs[0] as StubGainNode).gain.writes.filter(
      (w) => w.method === 'setValueAtTime' && w.at < 300 - 1e-9
    );
    assert.equal(
      late.length,
      0,
      `a classified voice built 300 s in back-dated ${late.length} clicks`
    );
  });

  it('writes a bounded number of events per update, for the fastest family there is', () => {
    // §12 budgets 1 ms per Echo tick and audioEngine.test.ts holds it on nodes
    // built. Nothing holds what a tick *schedules*, and the horizon is what
    // decides it: a horizon of two seconds would build no node at all and put
    // ten times this many writes on the graph every tick.
    const context = new HeadlessAudioContext();
    const destination = context.createGain();
    const voice = new ContactVoice(
      context as unknown as AudioContext,
      destination as unknown as AudioNode
    );
    const osc = context.nodes.find(
      (n): n is StubOscillatorNode => n instanceof StubOscillatorNode
    )!;
    const oscGain = osc.outputs[0] as StubGainNode;

    let worst = 0;
    for (let tick = 0; tick < 100; tick++) {
      const before = oscGain.gain.writes.length;
      voice.update(
        {
          tier: ResolutionTier.Classification,
          biome: Biome.OpenWater,
          // The decaying case too: a period that stretches schedules fewer
          // events, but the level ramps are written either way.
          freshness: tick % 3 === 0 ? 0.2 : 1,
          faction: Faction.Directorate,
        },
        context.currentTime
      );
      worst = Math.max(worst, oscGain.gain.writes.length - before);
      context.advance(ECHO_STEP_S);
    }
    // A horizon of one tick plus a margin, at nine clusters a second, is three
    // clusters — so three times the layers, twice over for the level and its
    // decay, and the handful of ramps `update` writes whatever happens.
    assert.ok(
      worst <= SWARM_LAYERS * 3 * 2 + 4,
      `one update wrote ${worst} parameter events on the fastest family in the mix`
    );
  });

  it('takes a stopped voice’s committed clicks down with it', () => {
    // The other half of invariant 25, and the half a horizon makes necessary.
    // A voice is scheduled ahead, so a contact that expires — or is stolen for
    // a higher tier, per §12's stealing policy — leaves its family's clicks on
    // the graph unless `stop` takes them. They are not silenced by the fade:
    // `out.gain` is a fade, and a click under a fade is a quieter click.
    // Measured before `stop` cancelled `oscGain`: three clicks standing, the
    // last 96 ms past the stop.
    const context = new HeadlessAudioContext();
    const destination = context.createGain();
    const voice = new ContactVoice(
      context as unknown as AudioContext,
      destination as unknown as AudioNode
    );
    const osc = context.nodes.find(
      (n): n is StubOscillatorNode => n instanceof StubOscillatorNode
    )!;
    const oscGain = osc.outputs[0] as StubGainNode;

    for (let tick = 0; tick < 10; tick++) {
      voice.update(
        {
          tier: ResolutionTier.Classification,
          biome: Biome.OpenWater,
          freshness: 1,
          faction: Faction.Directorate,
        },
        context.currentTime
      );
      context.advance(ECHO_STEP_S);
    }
    const stoppedAt = context.currentTime;
    const standing = oscGain.gain.writes.filter(
      (w) => w.method === 'setValueAtTime' && w.at >= stoppedAt
    );
    assert.ok(
      standing.length > 0,
      'fixture expects the horizon to leave clicks on the graph past the stop'
    );

    voice.stop(stoppedAt);
    const cancelled = oscGain.gain.writes.filter(
      (w) => w.method === 'cancel' && Math.abs(w.at - stoppedAt) < 1e-9
    );
    assert.equal(
      cancelled.length,
      1,
      `${standing.length} clicks were left standing up to ` +
        `${(Math.max(...standing.map((w) => w.at)) - stoppedAt).toFixed(3)} s past the stop`
    );
  });

  it('bounds what one Echo tick schedules, across the whole voice budget', () => {
    // §12 budgets 1 ms per Echo tick and CLAUDE.md requires a budget be
    // asserted on counted work. `audioEngine.test.ts` counts nodes built, and
    // this design deliberately builds none per tick — so without this the
    // counted work of an audio tick is unheld at the scope §12 names. What a
    // tick schedules is parameter writes, and the horizon is what decides how
    // many.
    const worstTick = (faction: Faction) => {
      const context = new HeadlessAudioContext();
      const bus = context.createGain();
      const mixer = new ContactMixer(
        new VoiceAllocator(),
        () => new ContactVoice(context as unknown as AudioContext, bus as unknown as AudioNode)
      );
      // The worst case §12 admits: its whole 24-voice budget, every one of
      // them the same family.
      const entries = Array.from({ length: 24 }, (_, i) => ({
        id: i + 1,
        tier: ResolutionTier.Track,
        biome: Biome.OpenWater,
        faction,
        freshness: 1,
        bearing: (i / 24) * Math.PI * 2,
        rangeM: 900 + i * 40,
      }));
      let worst = 0;
      for (let tick = 0; tick < 40; tick++) {
        const before = context.ledger.scheduled;
        mixer.update({ tick, entries }, context.currentTime);
        worst = Math.max(worst, context.ledger.scheduled - before);
        context.advance(ECHO_STEP_S);
      }
      return worst / entries.length;
    };

    // The Knights are the control and the floor: an eventless mechanism emits
    // nothing at all, so what it costs a tick is the level and spatialisation
    // ramps every voice writes whatever its family is doing.
    const ramps = worstTick(Faction.Hadron);
    assert.ok(ramps > 0 && ramps < 20, `a voice with no mechanism wrote ${ramps} events a tick`);

    // What a tick may schedule is bounded by what a tick *consumes* — not by
    // the horizon, which is the thing under test. A steady state schedules one
    // tick's worth of clusters per tick; twice that plus one is the slack a
    // horizon needs, and a horizon set to seconds rather than to a tick would
    // blow straight through it.
    const perTick = FACTION_TIMBRE[Faction.Directorate].rateHz * ECHO_STEP_S;
    const allowed = ramps + Math.ceil(perTick * 2 + 1) * SWARM_LAYERS * 2;
    const swarm = worstTick(Faction.Directorate);
    assert.ok(
      swarm <= allowed,
      `one Echo tick scheduled ${swarm.toFixed(1)} parameter writes per voice against ` +
        `${allowed.toFixed(1)} allowed — the horizon is committing more than a tick consumes`
    );
  });

  it('takes back a family’s committed events when the family changes, and only then', () => {
    // A horizon is a commitment: events are on the clock ahead of the caller,
    // and a contact that drops below Tier 3 must not go on sounding the family
    // it had for the rest of them. §3 forbids Tier 2 from carrying class
    // information in its timbre, and "it was already scheduled" is not an
    // exemption from that.
    //
    // Run across a range of demotion ticks rather than at one, because whether
    // a click happens to fall in the committed window depends on where the
    // train's phase is when the tier changes — a single tick would assert this
    // on luck, and pass while the cancellation was deleted.
    let sawCommitted = 0;
    for (let demoteTick = 5; demoteTick <= 12; demoteTick++) {
      const context = new HeadlessAudioContext();
      const destination = context.createGain();
      const voice = new ContactVoice(
        context as unknown as AudioContext,
        destination as unknown as AudioNode
      );
      const osc = context.nodes.find(
        (n): n is StubOscillatorNode => n instanceof StubOscillatorNode
      )!;
      const oscGain = osc.outputs[0] as StubGainNode;

      // Counted in ticks rather than accumulated in seconds: 0.2 does not add
      // up to 2 in binary, and a demotion landing a tick off the instant the
      // assertions name is a fixture bug wearing a leak's clothes.
      let demotedAt = -1;
      for (let tick = 0; tick < demoteTick + 5; tick++) {
        const classified = tick < demoteTick;
        if (!classified && demotedAt < 0) demotedAt = context.currentTime;
        voice.update(
          {
            tier: classified ? ResolutionTier.Classification : ResolutionTier.Bearing,
            biome: Biome.OpenWater,
            freshness: 1,
            faction: Faction.Directorate,
          },
          context.currentTime
        );
        context.advance(ECHO_STEP_S);
      }

      const cancels = oscGain.gain.writes.filter((w) => w.method === 'cancel').map((w) => w.at);
      assert.equal(
        cancels.length,
        2,
        `demoting at tick ${demoteTick} took the schedule back ${cancels.length} times, not once ` +
          'per family change — it used to be taken back on every event, which is what cancelled ' +
          'the level ramp underneath it'
      );
      assert.ok(
        Math.abs(cancels[0]! - 0) < 1e-9,
        'the first cancel is not the promotion to Tier 3'
      );
      assert.ok(
        Math.abs(cancels[1]! - demotedAt) < 1e-9,
        `the second cancel is at ${cancels[1]}, not at the demotion at ${demotedAt}`
      );

      // Anything the horizon had already committed past the demotion has to be
      // covered by that cancel. `thumpPeak` is what a voice with no family
      // reaches, so a louder event after the demotion is the family still
      // speaking.
      const committed = oscGain.gain.writes.filter(
        (w) => w.method === 'setValueAtTime' && w.value > THUMP_PEAK + 1e-9 && w.at >= demotedAt
      );
      sawCommitted += committed.length;
      for (const w of committed) {
        assert.ok(
          cancels.some((at) => at <= w.at + 1e-9 && at >= demotedAt - 1e-9),
          `a Directorate click stood at ${w.at.toFixed(3)} s, after the contact fell to Tier 2`
        );
      }
    }

    // Not vacuous: over those phases the horizon really did commit clicks past
    // a demotion, which is what makes the cancellation the thing that closes
    // the leak rather than a tidy-up.
    assert.ok(
      sawCommitted > 0,
      'no demotion phase left a committed click standing, so this test proved nothing'
    );
  });
});
