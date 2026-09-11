/**
 * No navy signature without a navy (#618).
 *
 * The Echo Layer sends no faction for a creature or a piece of ordnance, on
 * purpose — "a creature belongs to nobody, and sending a meaningless slot
 * would let a client infer that this is fauna one tier earlier than it
 * earned". The mix used to fill that gap with the Consortium's recipe, so
 * every classified Sounder, Draymaw, torpedo and mine sounded like a
 * Consortium hull: the mix asserting a fact the server never sent, which is
 * docs/audio-direction.md §2's second law inverted.
 *
 * These are written as the rule and not as the implementation. The first
 * iterates the whole `Faction` enum rather than naming the Consortium, so a
 * fifth navy extends it for free; the second measures what an ear would
 * actually use to tell the families apart — the pulse — through the real
 * `ContactVoice` against the repository's headless `AudioContext`, and counts
 * instants rather than watching a stopwatch.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Biome, Faction, ResolutionTier } from '@echoes/shared';
import { ContactVoice } from '../src/audio/contactVoice.ts';
import { FACTION_TIMBRE, UNCLASSIFIED_TIMBRE, timbreFor } from '../src/audio/timbre.ts';
import { HeadlessAudioContext, StubGainNode, StubOscillatorNode } from './support/headlessAudio.ts';

/** Every navy, as numbers — `Faction` is a numeric enum, so keys reverse-map. */
const NAVIES = Object.values(Faction).filter((v): v is Faction => typeof v === 'number');

const STEP_S = 1 / 60;
const SPAN_S = 30;

/**
 * Every instant the voice bumped its oscillator, driving the real class.
 *
 * `scheduleThump`'s `setValueAtTime` on `oscGain` *is* the pulse — the level
 * ramps around it are `setTargetAtTime` — so filtering by method isolates the
 * events exactly, with no threshold and no interpretation.
 */
function pulseInstants(faction: Faction | undefined, tier: ResolutionTier): number[] {
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
    voice.update({ tier, faction, biome: Biome.OpenWater, freshness: 1 }, context.currentTime);
    context.advance(STEP_S);
  }

  return oscGain.gain.writes.filter((w) => w.method === 'setValueAtTime').map((w) => w.at);
}

/** Widest gap between the longest and shortest interval between pulses. */
function periodSpread(instants: number[]): number {
  if (instants.length < 3) return Number.NaN;
  const periods: number[] = [];
  for (let i = 1; i < instants.length; i++) periods.push(instants[i]! - instants[i - 1]!);
  return Math.max(...periods) - Math.min(...periods);
}

describe('contact timbre', () => {
  it('gives a contact with no faction a recipe that is no navy of any of them', () => {
    const anonymous = timbreFor(undefined);

    for (const navy of NAVIES) {
      const theirs = FACTION_TIMBRE[navy];
      // Reference equality first: the bug was not an equal recipe, it was the
      // Consortium's own object handed out under another name.
      assert.notEqual(anonymous, theirs, `borrows ${Faction[navy]}'s timbre object`);
      assert.ok(
        anonymous.wave !== theirs.wave ||
          anonymous.baseHz !== theirs.baseHz ||
          anonymous.rateHz !== theirs.rateHz,
        `is indistinguishable from ${Faction[navy]} on wave, baseHz and rateHz`
      );
    }
  });

  it('puts the anonymous fundamental clear of every navy fundamental and its octaves', () => {
    // A voice an octave off a navy is that navy detuned, which is the same
    // false claim one step quieter.
    for (const navy of NAVIES) {
      for (let octave = -2; octave <= 2; octave++) {
        const hz = FACTION_TIMBRE[navy].baseHz * 2 ** octave;
        if (hz < 20 || hz > 400) continue;
        assert.ok(
          Math.abs(UNCLASSIFIED_TIMBRE.baseHz - hz) >= 10,
          `${UNCLASSIFIED_TIMBRE.baseHz} Hz is within 10 Hz of ${hz} Hz (${Faction[navy]})`
        );
      }
    }
  });

  it('keeps the beat the Consortium’s, and gives no other identity one', () => {
    // §8: the Consortium is "the only faction with a *beat*". A beat is a
    // period that does not wander — so the test of one is spread, and the
    // floor it is measured against is the update grid itself, since a 60 Hz
    // caller quantises even an exactly periodic pulse into two neighbouring
    // frame counts.
    const consortium = pulseInstants(Faction.Bathyarch, ResolutionTier.Classification);
    assert.ok(consortium.length > 3, 'the Consortium must still pulse at all');
    assert.ok(
      periodSpread(consortium) <= STEP_S * 1.01,
      'the Consortium lost its beat: its period now wanders'
    );

    const others: (Faction | undefined)[] = [
      ...NAVIES.filter((f) => f !== Faction.Bathyarch),
      undefined,
    ];
    for (const identity of others) {
      const instants = pulseInstants(identity, ResolutionTier.Classification);
      const name = identity === undefined ? 'a contact with no faction' : Faction[identity];
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
    for (const identity of [Faction.Hadron, undefined]) {
      assert.equal(timbreFor(identity).rateHz, 0, 'fixture assumes an eventless mechanism');
      assert.deepEqual(
        pulseInstants(identity, ResolutionTier.Classification),
        [],
        'an eventless mechanism emitted a pulse'
      );
    }
  });

  it('still gives a contact below Tier 3 its wandering thump', () => {
    // The containment must not reach down into the tiers that carry no
    // identity at all: §3's "irregular period 1.2-2.5 s" is a different rule,
    // and an unclassified return going silent would be a worse bug than the
    // one being fixed.
    const instants = pulseInstants(undefined, ResolutionTier.Bearing);
    assert.ok(instants.length > 3, 'a Tier-2 contact fell silent');
    assert.ok(periodSpread(instants) > STEP_S * 1.01, 'a Tier-2 contact became periodic');
  });
});
