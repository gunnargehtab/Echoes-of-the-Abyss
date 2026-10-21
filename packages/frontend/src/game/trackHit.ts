/**
 * The hit effect on a live Tier-4 track whose hp falls (#1517, the enemy half
 * of #1510's "cavitation distortion on damage").
 *
 * A track already shows its hp: docs/systems-echo.md §4 makes Tier 4 "full
 * resolution: exact unit, health, facing", and the chart draws the bar. So a
 * flash and a spray where that bar drops reveal nothing the player did not
 * already read; they make the drop visible at a glance instead of in a sliver
 * of red.
 *
 * Drawn on the chart, beside the track's bar, even where the conn view draws
 * the track's model (#1531): the drop is read from that bar, and the conn view
 * is handed a track's kind and pose, never its hp. That is why #1510's three.js
 * ring is not reused here. What is reused is the shape of a hit: the same
 * strength curve, life, flash length and particle counts, so a blow on an
 * enemy reads at the size the same blow on your own hull does.
 *
 * It fires only between two live Tier-4 readings of one handle. A handle is
 * stable per observer for as long as the entity is held (echoLayer.ts
 * `handleFor`), so the two readings are the same hull. A drop across a tier
 * change is not a hit the player saw: the bar was not on screen before it. A
 * drop after a ghost is not one either: the hp fell while nobody was
 * listening, and a flash would claim a present tense the gap never had.
 *
 * Stateless per frame: a hit is its strength, its birth and a seed, and every
 * particle is a function of its age. Nothing is pooled because nothing is
 * allocated: the draw writes into the contact's own `Graphics`.
 */

import { ResolutionTier, type Contact } from '@echoes/shared';
import {
  HIT_FLASH_MS,
  HIT_LIFE_MS,
  HIT_PARTICLES_MAX,
  HIT_PARTICLES_MIN,
  hash,
  hitStrength,
} from './hullHit.ts';
import { contactFidelity } from './trackFidelity.ts';

/**
 * TUNABLE — the spray's shape in the track's own radius, as hullHit.ts sizes
 * its own: where a particle starts, how fast it flies out, and how fast a
 * bubble climbs and a fragment sinks, each a second. The chart is drawn from
 * above, so "climbs" is toward the top of the screen. It flies twice as far
 * as an own hull's: a track's sprite is flat ink in its navy's colour, the
 * colour its bubbles wear, so a spray that stays over the hull is lost on it.
 */
const START_SHARE = 0.3;
const SPREAD_PER_S = 3.2;
const BUBBLE_RISE_PER_S = 1;
const DEBRIS_SINK_PER_S = 0.6;
const DEBRIS_LIFE_SHARE = 0.6;

/**
 * TUNABLE — the flash's alpha at a full hit: a soft disc over the track, in
 * the pale ink of a fragment. A soft fill, so the ladder does not weigh it
 * (ladder.ts); the spray's dots are what it weighs.
 */
export const TRACK_HIT_FLASH_ALPHA = 0.3;
/**
 * TUNABLE — the radius a hit is sized by on a track with no hull or
 * structure to measure: an animal or a torpedo.
 */
export const TRACK_HIT_SMALL_RADIUS_M = 20;
/** TUNABLE — the radius of one spray dot, in screen pixels at any zoom. */
export const TRACK_HIT_DOT_PX = 3;
/**
 * TUNABLE — how bright a hit draws at the floor, against a full one. Most
 * blows are a gun round's few percent, which sits on the strength floor; an
 * own hull's flash rides its lamps and reads there, and flat chart ink at the
 * floor's own share did not.
 */
const LEVEL_FLOOR = 0.6;

/** What the previous snapshot held for a contact, and when it was resolved. */
export interface TrackReading {
  contact: Contact;
  lastSeenMs: number;
}

/**
 * The strength, 0–1, of the hit a new reading shows, or null when it shows
 * none: the hp fell between two live Tier-4 readings of the same handle.
 */
export function trackHitStrength(
  previous: TrackReading | undefined,
  next: Contact,
  nowMs: number
): number | null {
  if (previous === undefined) return null;
  const was = previous.contact;
  if (was.tier !== ResolutionTier.Track || next.tier !== ResolutionTier.Track) return null;
  if (contactFidelity(was.tier, nowMs - previous.lastSeenMs) !== 'sprite') return null;
  if (was.hp === undefined || next.hp === undefined || next.maxHp === undefined) return null;
  if (!(next.hp < was.hp)) return null;
  return hitStrength(was.hp - next.hp, next.maxHp);
}

/** One hit, while it lives. */
interface Hit {
  strength: number;
  bornAt: number;
  seed: number;
}

export class TrackHits {
  private readonly hits = new Map<number, Hit>();
  private thrown = 0;

  /** Hits alive, one per struck track, for the tests and the probe. */
  get count(): number {
    return this.hits.size;
  }

  /** Hits fired since the effect was made, for the tests. */
  get fired(): number {
    return this.thrown;
  }

  /**
   * Read one contact against what the last snapshot held for it, and fire a
   * hit if its hp fell between two live Tier-4 readings. A fresh blow on a
   * track still spraying replaces the hit, as the harder of the two.
   */
  observe(previous: TrackReading | undefined, next: Contact, nowMs: number): boolean {
    // Out of Tier 4, the bar is gone, and the hit on it goes too: a track
    // back at Tier 4 within a hit's life would otherwise wear the old spray.
    if (next.tier < ResolutionTier.Track) this.hits.delete(next.id);
    const strength = trackHitStrength(previous, next, nowMs);
    if (strength === null) return false;
    const live = this.hits.get(next.id);
    const carried = live !== undefined && nowMs - live.bornAt < HIT_FLASH_MS ? live.strength : 0;
    this.hits.set(next.id, {
      strength: Math.max(strength, carried),
      bornAt: nowMs,
      seed: this.thrown++,
    });
    return true;
  }

  /**
   * The flash's level, 0–1, on a struck track: a sharp jolt and a slower
   * fall, as hullHit.ts flashes an own hull's lamps. Zero once it is spent.
   */
  flash(id: number, nowMs: number): number {
    const hit = this.hits.get(id);
    if (hit === undefined) return 0;
    const t = (nowMs - hit.bornAt) / HIT_FLASH_MS;
    if (!(t >= 0 && t < 1)) return 0;
    return (LEVEL_FLOOR + (1 - LEVEL_FLOOR) * hit.strength) * (1 - t) * (1 - t);
  }

  /**
   * Visit every particle of a track's spray that lives at `nowMs`, in the
   * track's symbol space (metres, the contact at the origin), with how much
   * of its brightness is left. Returns how many it visited. A hit past its
   * life is forgotten here, so the map holds only what is drawn.
   */
  spray(
    id: number,
    radiusM: number,
    nowMs: number,
    visit: (x: number, y: number, fade: number, debris: boolean) => void
  ): number {
    const hit = this.hits.get(id);
    if (hit === undefined) return 0;
    const age = nowMs - hit.bornAt;
    if (age >= HIT_LIFE_MS) {
      this.hits.delete(id);
      return 0;
    }
    if (age < 0) return 0;
    const s = age / 1000;
    // The same drag as an own hull's spray: a burst that slows, not a fountain.
    const travel = s / (1 + 2 * s);
    const n = Math.round(
      HIT_PARTICLES_MIN + (HIT_PARTICLES_MAX - HIT_PARTICLES_MIN) * hit.strength
    );
    const r = Math.max(radiusM, 1e-3);
    const level = LEVEL_FLOOR + (1 - LEVEL_FLOOR) * hit.strength;
    let visited = 0;
    for (let k = 0; k < n; k++) {
      const debris = k % 3 === 0;
      const t = age / (HIT_LIFE_MS * (debris ? DEBRIS_LIFE_SHARE : 1));
      if (t >= 1) continue;
      const seed = (hit.seed * HIT_PARTICLES_MAX + k) * 4;
      const yaw = hash(seed) * Math.PI * 2;
      const dx = Math.cos(yaw);
      const dy = Math.sin(yaw);
      const start = r * START_SHARE * (0.8 + 0.4 * hash(seed + 3));
      const out = r * SPREAD_PER_S * (0.35 + 0.65 * hash(seed + 1)) * (0.5 + hit.strength);
      // Screen y grows downward: a bubble climbs toward the top.
      const lift = debris
        ? r * DEBRIS_SINK_PER_S * (0.5 + hash(seed + 2))
        : -r * BUBBLE_RISE_PER_S * (0.5 + hash(seed + 2));
      visit(
        dx * (start + out * travel),
        dy * (start + out * travel) + lift * s,
        (1 - t) * level,
        debris
      );
      visited++;
    }
    return visited;
  }

  /** Forget every hit past its life, drawn or not: once a frame, before the draw. */
  prune(nowMs: number): void {
    for (const [id, hit] of this.hits) {
      if (nowMs - hit.bornAt >= HIT_LIFE_MS) this.hits.delete(id);
    }
  }

  /** The track went out of hearing: its hit goes with it. */
  forget(id: number): void {
    this.hits.delete(id);
  }

  /** A new match: every hit goes. */
  reset(): void {
    this.hits.clear();
  }
}
