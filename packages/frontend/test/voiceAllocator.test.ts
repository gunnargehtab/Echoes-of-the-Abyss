/**
 * Voice stealing (#101).
 *
 * The stealing order is an *information* policy, not a performance one: the
 * mix is the primary channel, so which voice loses its slot decides what the
 * player is told. docs/audio-direction.md §12 fixes the order as lowest tier
 * first, then oldest, then quietest — and exempts Tier 4, because a track is
 * the only exact information the player has.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ResolutionTier } from '@echoes/shared';
import { MAX_CONTACT_VOICES, VoiceAllocator } from '../src/audio/voiceAllocator.ts';

function request(contactId: number, tier: ResolutionTier, tick = 0, gain = 0.5) {
  return { contactId, tier, tick, gain };
}

/** Fill the bus with contacts of one tier, ids 0..capacity-1. */
function fill(allocator: VoiceAllocator, tier: ResolutionTier, tick = 0): void {
  for (let i = 0; i < allocator.capacity; i++) {
    allocator.allocate(request(i, tier, tick));
  }
}

describe('voice allocator', () => {
  it('caps the contact bus at the documented 24 voices', () => {
    assert.equal(MAX_CONTACT_VOICES, 24);
    const allocator = new VoiceAllocator();
    fill(allocator, ResolutionTier.Bearing);
    assert.equal(allocator.size, 24);
    assert.equal(new Set(allocator.active.map((v) => v.slot)).size, 24, 'slots are unique');
  });

  it('keeps a contact on its own slot rather than re-triggering it', () => {
    // A contact whose tier improved must not restart its sound: it would read
    // as a new detection, which is a different event.
    const allocator = new VoiceAllocator(4);
    const first = allocator.allocate(request(7, ResolutionTier.Contact, 1));
    const again = allocator.allocate(request(7, ResolutionTier.Classification, 9));

    assert.equal(again.stolen, null);
    assert.equal(again.voice!.slot, first.voice!.slot, 'same slot');
    assert.equal(again.voice!.tier, ResolutionTier.Classification, 'updated in place');
    assert.equal(allocator.size, 1);
  });

  it('steals the lowest tier first', () => {
    const allocator = new VoiceAllocator(3);
    allocator.allocate(request(1, ResolutionTier.Classification, 0));
    allocator.allocate(request(2, ResolutionTier.Contact, 0));
    allocator.allocate(request(3, ResolutionTier.Bearing, 0));

    const result = allocator.allocate(request(4, ResolutionTier.Track, 1));
    assert.equal(result.stolen?.contactId, 2, 'the Tier-1 smear loses its slot');
    assert.equal(result.voice?.slot, 0 + result.voice!.slot, 'the newcomer took a real slot');
    assert.ok(allocator.has(4) && !allocator.has(2));
  });

  it('breaks a tier tie by age, oldest first', () => {
    const allocator = new VoiceAllocator(3);
    allocator.allocate(request(1, ResolutionTier.Bearing, 50));
    allocator.allocate(request(2, ResolutionTier.Bearing, 10));
    allocator.allocate(request(3, ResolutionTier.Bearing, 30));

    const result = allocator.allocate(request(4, ResolutionTier.Classification, 60));
    assert.equal(result.stolen?.contactId, 2, 'tick 10 is the oldest');
  });

  it('breaks an age tie by loudness, quietest first', () => {
    const allocator = new VoiceAllocator(3);
    allocator.allocate(request(1, ResolutionTier.Bearing, 10, 0.9));
    allocator.allocate(request(2, ResolutionTier.Bearing, 10, 0.2));
    allocator.allocate(request(3, ResolutionTier.Bearing, 10, 0.6));

    const result = allocator.allocate(request(4, ResolutionTier.Track, 11));
    assert.equal(result.stolen?.contactId, 2, 'the quietest of the equals');
  });

  it('never steals a Tier-4 track', () => {
    // The exemption that matters: a track is the only exact information the
    // player has, and a crowd of distant smears must not be able to take it.
    const allocator = new VoiceAllocator(4);
    fill(allocator, ResolutionTier.Track, 0);

    const result = allocator.allocate(request(99, ResolutionTier.Track, 5));
    assert.equal(result.voice, null, 'the newcomer is refused');
    assert.equal(result.stolen, null, 'and nothing was taken to make room');
    assert.equal(allocator.size, 4, 'every track survives');
  });

  it('refuses a contact that ranks no higher than everything playing', () => {
    // Otherwise a stream of distant Tier-1 contacts churns the bus, each
    // evicting the last, and the mix never settles into something readable.
    const allocator = new VoiceAllocator(3);
    fill(allocator, ResolutionTier.Contact, 0);

    const result = allocator.allocate(request(50, ResolutionTier.Contact, 1));
    assert.equal(result.voice, null, 'an equal-tier newcomer does not churn the bus');
    assert.equal(allocator.size, 3);
    assert.ok(!allocator.has(50));
  });

  it('returns a released slot to the pool', () => {
    const allocator = new VoiceAllocator(2);
    allocator.allocate(request(1, ResolutionTier.Bearing));
    const freed = allocator.allocate(request(2, ResolutionTier.Bearing));

    assert.equal(allocator.release(2)?.contactId, 2);
    assert.equal(allocator.size, 1);

    const reused = allocator.allocate(request(3, ResolutionTier.Contact));
    assert.equal(reused.stolen, null, 'no stealing needed once a slot is free');
    assert.equal(reused.voice?.slot, freed.voice?.slot, 'and the freed slot is reused');
  });

  it('survives a full clear', () => {
    const allocator = new VoiceAllocator(4);
    fill(allocator, ResolutionTier.Bearing);
    allocator.clear();
    assert.equal(allocator.size, 0);
    // Capacity must come back intact, or the bus quietly shrinks each match.
    fill(allocator, ResolutionTier.Bearing);
    assert.equal(allocator.size, 4);
  });
});
