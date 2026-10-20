/**
 * The hit effect on a live Tier-4 track whose hp falls (#1517). Pure: a hit
 * is a strength, a birth and a seed, and every particle a function of its
 * age, so these tests read the effect exactly as the chart draws it. The
 * path from a snapshot to the draw is held in rendererSmoke.test.ts.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Faction, ResolutionTier, UnitKind, type Contact } from '@echoes/shared';
import {
  HIT_FLASH_MS,
  HIT_FLOOR,
  HIT_LIFE_MS,
  HIT_PARTICLES_MAX,
  HIT_PARTICLES_MIN,
  hitStrength,
} from '../src/game/hullHit.ts';
import { LIVE_TRACK_MS } from '../src/game/trackFidelity.ts';
import { TrackHits, trackHitStrength, type TrackReading } from '../src/game/trackHit.ts';

const track = (hp: number, over: Partial<Contact> = {}): Contact => ({
  id: 7,
  tier: ResolutionTier.Track,
  x: 1000,
  y: 1000,
  depth: 1200,
  kind: UnitKind.Corvette,
  faction: Faction.Hadron,
  hp,
  maxHp: 200,
  heading: 0,
  tick: 10,
  ...over,
});

/** What the last snapshot held: resolved one Echo pass (200 ms) before `now`. */
const was = (contact: Contact, now: number, ageMs = 200): TrackReading => ({
  contact,
  lastSeenMs: now - ageMs,
});

const NOW = 10_000;

/** Every particle a track sprays at `nowMs`. */
const spray = (hits: TrackHits, id: number, nowMs: number) => {
  const out: { x: number; y: number; fade: number; debris: boolean }[] = [];
  hits.spray(id, 50, nowMs, (x, y, fade, debris) => out.push({ x, y, fade, debris }));
  return out;
};

describe('trackHitStrength', () => {
  it('fires on an hp drop between two live Tier-4 readings, at the size an own hit would be', () => {
    assert.equal(trackHitStrength(was(track(150), NOW), track(110), NOW), hitStrength(40, 200));
  });

  it('fires on nothing that is not a drop', () => {
    assert.equal(trackHitStrength(was(track(150), NOW), track(150), NOW), null, 'unchanged');
    assert.equal(trackHitStrength(was(track(150), NOW), track(170), NOW), null, 'a repair');
    assert.equal(trackHitStrength(undefined, track(110), NOW), null, 'first heard');
  });

  it('fires on no drop across a tier change', () => {
    // A Tier-3 reading carries no hp, so a drop across the change could only
    // be invented; and one that somehow did carry it was not on screen.
    const classified = track(150, { tier: ResolutionTier.Classification });
    assert.equal(trackHitStrength(was(classified, NOW), track(110), NOW), null, 'up into Tier 4');
    const lost = track(110, { tier: ResolutionTier.Classification });
    assert.equal(trackHitStrength(was(track(150), NOW), lost, NOW), null, 'down out of Tier 4');
  });

  it('fires on no drop after a ghost', () => {
    // The hp fell while nobody was listening: the gap is not a present tense.
    const ghost = was(track(150), NOW, LIVE_TRACK_MS + 1);
    assert.equal(trackHitStrength(ghost, track(110), NOW), null);
    // The edge is the sprite's own: a track still live fires.
    assert.notEqual(trackHitStrength(was(track(150), NOW, LIVE_TRACK_MS), track(110), NOW), null);
  });

  it('fires on nothing below Tier 4', () => {
    for (const tier of [
      ResolutionTier.Contact,
      ResolutionTier.Bearing,
      ResolutionTier.Classification,
    ]) {
      const below = track(150, { tier });
      assert.equal(trackHitStrength(was(below, NOW), { ...below, hp: 110 }, NOW), null);
    }
  });
});

describe('TrackHits', () => {
  it('fires once for one drop, and the hit is gone after its life', () => {
    const hits = new TrackHits();
    assert.equal(hits.observe(was(track(150), NOW), track(110), NOW), true);
    // The next reading holds at the new hp: no second hit.
    assert.equal(hits.observe(was(track(110), NOW + 200), track(110), NOW + 200), false);
    assert.equal(hits.fired, 1);
    assert.equal(hits.count, 1);
    assert.ok(hits.flash(7, NOW) > 0, 'it flashes at once');
    assert.ok(spray(hits, 7, NOW + 100).length > 0, 'and sprays');
    assert.equal(hits.flash(7, NOW + HIT_FLASH_MS), 0, 'the flash is spent');
    assert.equal(spray(hits, 7, NOW + HIT_LIFE_MS).length, 0, 'the spray is spent');
    assert.equal(hits.count, 0, 'and the hit is forgotten');
  });

  it('throws more of a spray for a bigger blow, from the floor to a full hit', () => {
    const hits = new TrackHits();
    hits.observe(was(track(150, { id: 1 }), NOW), track(149, { id: 1 }), NOW);
    hits.observe(was(track(150, { id: 2 }), NOW), track(10, { id: 2 }), NOW);
    assert.equal(
      spray(hits, 1, NOW).length,
      Math.round(HIT_PARTICLES_MIN + (HIT_PARTICLES_MAX - HIT_PARTICLES_MIN) * HIT_FLOOR)
    );
    assert.equal(spray(hits, 2, NOW).length, HIT_PARTICLES_MAX);
    assert.ok(hits.flash(1, NOW) < hits.flash(2, NOW), 'and a brighter flash');
  });

  it('flies out from the track, and its bubbles climb while its debris sinks', () => {
    const hits = new TrackHits();
    hits.observe(was(track(150), NOW), track(10), NOW);
    const early = spray(hits, 7, NOW + 50);
    const late = spray(hits, 7, NOW + 600);
    const reach = (ps: typeof early) => Math.max(...ps.map((p) => Math.hypot(p.x, p.y)));
    assert.ok(reach(late) > reach(early), 'the spray spreads');
    const mean = (ps: typeof early, debris: boolean) => {
      const ys = ps.filter((p) => p.debris === debris).map((p) => p.y);
      return ys.reduce((a, b) => a + b, 0) / ys.length;
    };
    // Screen y grows downward.
    assert.ok(mean(late, false) < mean(late, true), 'bubbles above, debris below');
    assert.ok(late.every((p) => p.fade > 0 && p.fade <= 1));
  });

  it('is the same spray on every run', () => {
    const a = new TrackHits();
    const b = new TrackHits();
    a.observe(was(track(150), NOW), track(90), NOW);
    b.observe(was(track(150), NOW), track(90), NOW);
    assert.deepEqual(spray(a, 7, NOW + 300), spray(b, 7, NOW + 300));
  });

  it('keeps the harder of two blows inside one flash', () => {
    const hits = new TrackHits();
    hits.observe(was(track(200), NOW), track(100), NOW);
    const hard = hits.flash(7, NOW);
    hits.observe(was(track(100), NOW + 100), track(99), NOW + 100);
    assert.equal(hits.flash(7, NOW + 100), hard, 'a scratch does not dim a big hit');
    assert.equal(hits.count, 1, 'one hit per track');
  });

  it('expires a hit no frame drew, so a ghost frame never strands one', () => {
    // A hit on a track that went to ghost is held, not drawn; prune is what
    // lets it go once its life is over.
    const hits = new TrackHits();
    hits.observe(was(track(150), NOW), track(100), NOW);
    hits.prune(NOW + HIT_LIFE_MS - 1);
    assert.equal(hits.count, 1, 'still alive');
    hits.prune(NOW + HIT_LIFE_MS);
    assert.equal(hits.count, 0, 'gone at the end of its life');
  });

  it('forgets a track, and a new match forgets them all', () => {
    const hits = new TrackHits();
    hits.observe(was(track(150, { id: 1 }), NOW), track(100, { id: 1 }), NOW);
    hits.observe(was(track(150, { id: 2 }), NOW), track(100, { id: 2 }), NOW);
    hits.forget(1);
    assert.equal(hits.flash(1, NOW), 0);
    assert.equal(hits.count, 1);
    hits.reset();
    assert.equal(hits.count, 0);
  });
});
