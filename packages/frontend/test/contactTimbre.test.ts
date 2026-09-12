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
import { Biome, Faction, FaunaSpecies, OrdnanceKind, ResolutionTier } from '@echoes/shared';
import { ContactVoice, THUMP_PARTIALS, type VoiceInputs } from '../src/audio/contactVoice.ts';
import {
  ALL_TIMBRES,
  CREATURE_TIMBRE,
  FACTION_TIMBRE,
  ORDNANCE_TIMBRE,
  identityFor,
  timbreFor,
  type ContactTimbre,
} from '../src/audio/timbre.ts';
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
 * `scheduleThump`'s `setValueAtTime` on `oscGain` *is* the pulse — the level
 * ramps around it are `setTargetAtTime` — so filtering by method isolates the
 * events exactly, with no threshold and no interpretation.
 */
function drive(identity: Partial<VoiceInputs>, tier: ResolutionTier) {
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

  for (let t = 0; t < SPAN_S; t += STEP_S) {
    voice.update({ tier, biome: Biome.OpenWater, freshness: 1, ...identity }, context.currentTime);
    context.advance(STEP_S);
  }

  return {
    osc,
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
