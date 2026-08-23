/**
 * What each tier is told (#102).
 *
 * The mixer is the last place a fidelity leak could be introduced: it sits
 * between the resolved contact picture and a voice that will happily pan
 * anything it is handed. docs/audio-direction.md §2 — "the mix may never sound
 * more certain than the server is" — is therefore a property of *this* module,
 * and these tests are that property written down.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Biome, Faction, PERSISTENCE, ResolutionTier } from '@echoes/shared';
import { ContactMixer, type ContactAudioEntry, type VoiceLike } from '../src/audio/contactMixer.ts';
import { panFor, type VoiceInputs } from '../src/audio/contactVoice.ts';
import { VoiceAllocator } from '../src/audio/voiceAllocator.ts';

class FakeVoice implements VoiceLike {
  readonly updates: VoiceInputs[] = [];
  stopped = false;
  update(inputs: VoiceInputs): void {
    this.updates.push(inputs);
  }
  stop(): void {
    this.stopped = true;
  }
  get last(): VoiceInputs {
    return this.updates[this.updates.length - 1]!;
  }
}

function harness(capacity?: number) {
  const built: FakeVoice[] = [];
  const allocator = new VoiceAllocator(capacity);
  const mixer = new ContactMixer(allocator, () => {
    const voice = new FakeVoice();
    built.push(voice);
    return voice;
  });
  return { mixer, allocator, built };
}

function entry(overrides: Partial<ContactAudioEntry> & { id: number }): ContactAudioEntry {
  return {
    tier: ResolutionTier.Bearing,
    biome: Biome.OpenWater,
    freshness: 1,
    ...overrides,
  };
}

describe('contact mixer', () => {
  it('gives a Tier-1 contact no bearing and no range', () => {
    const { mixer, built } = harness();
    // Exactly what the renderer builds for a Tier-1 resolution: the fields are
    // absent, because the server sent the listener's own position rather than
    // the contact's, and there is genuinely no bearing in that.
    mixer.update({ tick: 0, entries: [entry({ id: 7, tier: ResolutionTier.Contact })] }, 0);

    assert.equal(built.length, 1);
    assert.equal(built[0]!.last.bearing, undefined);
    assert.equal(built[0]!.last.rangeM, undefined);
  });

  it('never lets a faction reach a voice below Tier 3', () => {
    const { mixer, built } = harness();
    // A Tier-2 entry cannot carry a faction — the renderer would not have one
    // to give — but the guarantee that matters is that timbre identity and
    // classification are the same event, so assert on what arrives.
    mixer.update(
      {
        tick: 0,
        entries: [
          entry({ id: 1, tier: ResolutionTier.Bearing, bearing: 0.4, rangeM: 800 }),
          entry({
            id: 2,
            tier: ResolutionTier.Classification,
            bearing: 0.4,
            rangeM: 800,
            faction: Faction.Hadron,
          }),
        ],
      },
      0
    );

    assert.equal(built[0]!.last.faction, undefined);
    assert.equal(built[1]!.last.faction, Faction.Hadron);
  });

  it('passes bearing straight through rather than re-deriving it', () => {
    const { mixer, built } = harness();
    mixer.update({ tick: 0, entries: [entry({ id: 3, bearing: -1.2, rangeM: 1500 })] }, 0);
    assert.equal(built[0]!.last.bearing, -1.2);
    assert.equal(built[0]!.last.rangeM, 1500);
  });

  it('collapses pan in mono without dropping range', () => {
    const { mixer, built } = harness();
    mixer.setSpatialisation('mono');
    mixer.update({ tick: 0, entries: [entry({ id: 4, bearing: 1.1, rangeM: 600 })] }, 0);

    // §11: mono costs the convenience of hearing where something is, never the
    // fact of it — bearing is still in the contact log and on the scope.
    assert.equal(built[0]!.last.bearing, undefined);
    assert.equal(built[0]!.last.rangeM, 600);
  });

  it('keeps one voice across a tier change instead of re-triggering', () => {
    const { mixer, built } = harness();
    mixer.update({ tick: 0, entries: [entry({ id: 5, tier: ResolutionTier.Contact })] }, 0);
    mixer.update({ tick: 1, entries: [entry({ id: 5, tier: ResolutionTier.Track })] }, 0.2);

    // A contact that got *clearer* must not announce itself as newly heard.
    assert.equal(built.length, 1);
    assert.equal(built[0]!.updates.length, 2);
    assert.equal(built[0]!.stopped, false);
    assert.equal(built[0]!.last.tier, ResolutionTier.Track);
  });

  it('stops a voice when its contact leaves the frame', () => {
    const { mixer, allocator, built } = harness();
    mixer.update({ tick: 0, entries: [entry({ id: 6 })] }, 0);
    mixer.update({ tick: 1, entries: [] }, 0.2);

    assert.equal(built[0]!.stopped, true);
    assert.equal(mixer.activeCount, 0);
    // The slot must go back, or the bus leaks capacity over a long match.
    assert.equal(allocator.size, 0);
  });

  it('carries freshness on the same clock the ghost markers fade on', () => {
    const { mixer, built } = harness();
    // The renderer computes freshness as 1 - age / GHOST_MARKER_DECAY_S; the
    // mixer must forward it untouched, so voice and marker cannot disagree
    // about how stale a contact is.
    const halfway = 0.5;
    mixer.update({ tick: 0, entries: [entry({ id: 8, freshness: halfway })] }, 0);
    assert.equal(built[0]!.last.freshness, halfway);
    assert.ok(PERSISTENCE.GHOST_MARKER_DECAY_S > 0);
  });

  it('stops the voice it stole, and refuses a contact worth less than the bus', () => {
    const { mixer, built } = harness(2);
    const tracks = [
      entry({ id: 10, tier: ResolutionTier.Track }),
      entry({ id: 11, tier: ResolutionTier.Track }),
    ];
    mixer.update({ tick: 0, entries: tracks }, 0);
    assert.equal(mixer.activeCount, 2);

    // A Tier-1 smear cannot displace a track: §12 exempts Tier 4 entirely.
    mixer.update(
      { tick: 1, entries: [...tracks, entry({ id: 12, tier: ResolutionTier.Contact })] },
      0.2
    );
    assert.equal(mixer.activeCount, 2);
    assert.equal(built.length, 2);
    assert.ok(built.every((voice) => voice.stopped === false));

    // A track *can* displace a smear.
    const { mixer: m2, built: b2 } = harness(1);
    m2.update({ tick: 0, entries: [entry({ id: 20, tier: ResolutionTier.Contact })] }, 0);
    m2.update({ tick: 1, entries: [entry({ id: 21, tier: ResolutionTier.Track })] }, 0.2);
    assert.equal(b2.length, 2);
    assert.equal(b2[0]!.stopped, true);
    assert.equal(b2[1]!.stopped, false);
  });

  it('drops every voice on clear', () => {
    const { mixer, allocator, built } = harness();
    mixer.update({ tick: 0, entries: [entry({ id: 30 }), entry({ id: 31 })] }, 0);
    mixer.clear(1);
    assert.ok(built.every((voice) => voice.stopped));
    assert.equal(mixer.activeCount, 0);
    assert.equal(allocator.size, 0);
  });
});

describe('pan authority', () => {
  it('centres a Tier-1 contact whatever bearing it is handed', () => {
    // Defence in depth. The mixer already withholds bearing at Tier 1; this
    // asserts the voice would refuse it even if a future change stopped
    // withholding, because "panning is a claim about bearing" (§2) and Tier 1
    // has none to claim.
    for (const bearing of [0, Math.PI / 2, Math.PI, -0.8]) {
      assert.equal(panFor(ResolutionTier.Contact, bearing), 0);
    }
  });

  it('pans a blurred Tier-2 bearing at less than full authority', () => {
    // The acceptance criterion of #102: pan precision never exceeds the
    // tier's positional precision. Tier 2's position is already wrong by
    // BEARING_BLUR_FRACTION server-side, so a hard pan would present a guess
    // as a fix.
    const due_east = 0;
    const two = panFor(ResolutionTier.Bearing, due_east);
    const three = panFor(ResolutionTier.Classification, due_east);
    const four = panFor(ResolutionTier.Track, due_east);

    assert.ok(two > 0 && two < 1, `expected partial authority, got ${two}`);
    assert.equal(three, 1);
    assert.equal(four, 1);
    assert.ok(Math.abs(two) < Math.abs(three));
  });

  it('maps azimuth onto the horizontal axis, not the vertical one', () => {
    // East is right, west is left, and due north is centred — the axis the
    // player actually sees. sin() here would silently transpose the mix.
    assert.equal(panFor(ResolutionTier.Track, 0), 1);
    assert.equal(panFor(ResolutionTier.Track, Math.PI), -1);
    assert.ok(Math.abs(panFor(ResolutionTier.Track, Math.PI / 2)) < 1e-9);
  });

  it('centres anything with no bearing at all', () => {
    assert.equal(panFor(ResolutionTier.Track, undefined), 0);
    assert.equal(panFor(ResolutionTier.Classification, undefined), 0);
  });
});
