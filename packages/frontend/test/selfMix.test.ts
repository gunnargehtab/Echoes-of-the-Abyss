/**
 * Your own loudness, and what wins when several things sound at once (#103).
 *
 * Two rules are asserted here, both from docs/audio-direction.md, and both of
 * the kind that a refactor gets subtly backwards without any test noticing:
 *
 * - §4's **being loud makes you deaf**. The world bus attenuates as your own
 *   SIG climbs, and Silent Running *inverts* the whole scale. The inversion is
 *   the sales pitch for the mechanic, so it is the thing worth pinning down.
 * - §2's **Precedence Law**, in both of its halves: the ear beats the eye in
 *   time, and the exposure cue beats everything in level.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PERSISTENCE, SIM, SelfEventKind, type SelfEvent } from '@echoes/shared';
import { SELF_BANDS, SILENT_MIX, bandFor, selfMixFor } from '../src/audio/selfNoise.ts';
import {
  BUS_PRIORITY,
  PRECEDENCE_MS,
  duckFor,
  markOpacity,
  precedenceTiming,
} from '../src/audio/precedence.ts';
import { SelfMixer, type SelfAudioFrame, type SelfSink } from '../src/audio/selfMixer.ts';
import { PING_RETURN_WINDOW_S } from '../src/audio/selfVoice.ts';

function recorder() {
  const calls: string[] = [];
  const worldGains: number[] = [];
  const returns: { at: number; pan: number }[] = [];
  const sink: SelfSink = {
    bed: () => calls.push('bed'),
    world: (gain) => worldGains.push(gain),
    transmit: () => calls.push('transmit'),
    ret: (at, pan) => returns.push({ at, pan }),
    exposure: () => calls.push('exposure'),
    breakSilence: () => calls.push('breakSilence'),
    underFire: () => calls.push('underFire'),
    notice: () => calls.push('notice'),
  };
  return { sink, calls, worldGains, returns };
}

function frame(over: Partial<SelfAudioFrame> = {}): SelfAudioFrame {
  return { tick: 0, fleetSig: 30, silentRunning: false, events: [], returns: [], ...over };
}

const event = (kind: SelfEventKind, unitId = 1, bearing?: number): SelfEvent =>
  bearing === undefined ? { kind, unitId } : { kind, unitId, bearing };

describe('self-noise bands', () => {
  it('attenuates the world bus as your own SIG climbs', () => {
    // §4's table, read as the claim it makes: quiet leaves the world open,
    // loud does not.
    assert.equal(selfMixFor(10, false).worldGain, 1);
    assert.equal(selfMixFor(30, false).worldGain, 1);
    assert.ok(selfMixFor(50, false).worldGain < 1, 'SIG 50 starts to drown you out');
    assert.ok(
      selfMixFor(80, false).worldGain < selfMixFor(50, false).worldGain,
      'SIG 80 is worse than SIG 50'
    );
  });

  it('makes the bed louder as the plant works harder', () => {
    let previous = 0;
    for (const band of SELF_BANDS) {
      assert.ok(band.selfGain > previous, `${band.label} is louder than the band below it`);
      previous = band.selfGain;
    }
  });

  it('inverts the scale under Silent Running', () => {
    // The whole point of §4's last paragraph: you got quieter, so the world
    // got louder. Asserted against the loudest ordinary band, because that is
    // the transition a player actually makes when they go silent.
    const loud = selfMixFor(80, false);
    const silent = selfMixFor(80, true);

    assert.ok(silent.selfGain < loud.selfGain, 'the self bed drops');
    assert.ok(silent.worldGain > loud.worldGain, 'the world opens');
    assert.ok(silent.worldGain > 1, 'the world opens past its resting level');
    assert.equal(silent.selfGain, SILENT_MIX.SELF_GAIN);
    assert.equal(silent.worldGain, SILENT_MIX.WORLD_GAIN);
  });

  it('goes narrow as well as quiet when running silent', () => {
    // Silent Running is a shut-down plant, not a turned-down one.
    assert.ok(selfMixFor(80, true).cutoffHz < selfMixFor(80, false).cutoffHz);
    assert.equal(selfMixFor(80, true).rateHz, 0, 'no machinery rhythm while silent');
  });

  it('never falls off the end of the table', () => {
    assert.equal(bandFor(0).label, SELF_BANDS[0]!.label);
    assert.equal(bandFor(100).label, SELF_BANDS[SELF_BANDS.length - 1]!.label);
    assert.equal(bandFor(1000).label, SELF_BANDS[SELF_BANDS.length - 1]!.label);
  });
});

describe('precedence law, in time', () => {
  it('lets the ear beat the eye', () => {
    // The law itself: a voice starts before any mark is visible at all.
    assert.ok(PRECEDENCE_MS.VOICE_ONSET < PRECEDENCE_MS.MINIMAP_FADE_START);
    assert.ok(PRECEDENCE_MS.MINIMAP_FADE_START < PRECEDENCE_MS.WORLD_FADE_START);
    assert.ok(PRECEDENCE_MS.WORLD_FADE_START < PRECEDENCE_MS.MINIMAP_FADE_FULL);
  });

  it('keeps a mark invisible until its fade-in begins', () => {
    assert.equal(markOpacity(0, 150, 400), 0);
    assert.equal(markOpacity(150, 150, 400), 0);
    assert.equal(markOpacity(275, 150, 400), 0.5);
    assert.equal(markOpacity(400, 150, 400), 1);
    assert.equal(markOpacity(9000, 150, 400), 1);
  });

  it('inverts the law under the visual-first preset', () => {
    // §11: "one toggle, no other behavioural change" — marks arrive at 30 ms
    // and audio follows.
    const visual = precedenceTiming('visual-first');
    assert.ok(visual.MINIMAP_FADE_FULL <= PRECEDENCE_MS.VOICE_ONSET);
    assert.equal(precedenceTiming('ear-first'), PRECEDENCE_MS);
  });
});

describe('precedence law, in level', () => {
  it('puts exposure at the top and music at the bottom', () => {
    assert.equal(BUS_PRIORITY[0], 'self-exposure');
    assert.equal(BUS_PRIORITY[BUS_PRIORITY.length - 1], 'music');
  });

  it('never ducks a rung at or above the one that is sounding', () => {
    // The rule the exposure cue depends on: it arrives with a contact, and
    // both are information the player is owed.
    assert.equal(duckFor('self-exposure', 'self-exposure'), 1);
    assert.equal(duckFor('contact', 'self-exposure'), 1 * duckFor('contact', 'self-exposure'));
    assert.equal(duckFor('contact', 'contact'), 1);
    assert.equal(duckFor('self-exposure', 'contact'), 1);
    assert.equal(duckFor('contact', 'music'), 1);
  });

  it('ducks harder the further down the chain a rung sits', () => {
    const contact = duckFor('contact', 'self-exposure');
    const music = duckFor('music', 'self-exposure');
    assert.ok(contact < 1);
    assert.ok(music < contact, 'music gives way before contacts do');
    assert.ok(music > 0, 'and is never silenced outright');
  });

  it('does nothing when nothing is sounding', () => {
    for (const rung of BUS_PRIORITY) assert.equal(duckFor(rung, null), 1);
  });
});

describe('self mixer', () => {
  it('multiplies own-noise attenuation with the precedence duck', () => {
    // A player at SIG 80 who is *also* being lit should hear the world at the
    // product of both rules, not at whichever ran last.
    const { sink, worldGains } = recorder();
    const mixer = new SelfMixer(sink);

    mixer.update(frame({ fleetSig: 80 }), 0);
    const loudOnly = worldGains[worldGains.length - 1]!;

    mixer.update(frame({ tick: 1, fleetSig: 80, events: [event(SelfEventKind.Exposed, 1, 0)] }), 1);
    const loudAndLit = worldGains[worldGains.length - 1]!;

    assert.ok(loudAndLit < loudOnly, `${loudAndLit} should be under ${loudOnly}`);
    assert.ok(Math.abs(loudAndLit - loudOnly * duckFor('world', 'self-exposure')) < 1e-9);
  });

  it('fires each server event exactly once', () => {
    const { sink, calls } = recorder();
    const mixer = new SelfMixer(sink);
    const events = [event(SelfEventKind.Ping), event(SelfEventKind.BreakSilence, 2)];

    mixer.update(frame({ tick: 4, events }), 0);
    // Same tick redelivered — a resend must not double-slam the door.
    mixer.update(frame({ tick: 4, events }), 0.2);

    assert.equal(calls.filter((c) => c === 'transmit').length, 1);
    assert.equal(calls.filter((c) => c === 'breakSilence').length, 1);
  });

  it('lets exposure hold the top rung against a later cue', () => {
    const { sink } = recorder();
    const mixer = new SelfMixer(sink);
    mixer.update(frame({ tick: 1, events: [event(SelfEventKind.Exposed, 1, 0)] }), 0);
    assert.equal(mixer.activeRung, 'self-exposure');

    // Pressing ping while being lit must not stop the door slamming.
    mixer.update(frame({ tick: 2, events: [event(SelfEventKind.Ping, 3)] }), 0.3);
    assert.equal(mixer.activeRung, 'self-exposure');
  });

  it('releases the top rung once the cue has run its course', () => {
    const { sink } = recorder();
    const mixer = new SelfMixer(sink);
    mixer.update(frame({ tick: 1, events: [event(SelfEventKind.Exposed, 1, 0)] }), 0);
    mixer.update(frame({ tick: 2 }), 10);
    assert.equal(mixer.activeRung, null);
  });

  it('orders ping returns by range across the three-second window', () => {
    const { sink, returns } = recorder();
    const mixer = new SelfMixer(sink);
    mixer.update(
      frame({
        returns: [
          { rangeM: 900, pan: 1 },
          { rangeM: 100, pan: -1 },
          { rangeM: 450, pan: 0 },
        ],
      }),
      0
    );

    assert.equal(returns.length, 3);
    // Near returns first: "the player literally hears the sweep resolve the
    // map", and the ordering is the whole of that information.
    const byTime = [...returns].sort((a, b) => a.at - b.at);
    assert.deepEqual(
      byTime.map((r) => r.pan),
      [-1, 0, 1]
    );
    assert.ok(byTime[byTime.length - 1]!.at <= PING_RETURN_WINDOW_S + 1e-9);
  });

  it('schedules nothing when no ping is resolving', () => {
    const { sink, returns } = recorder();
    new SelfMixer(sink).update(frame(), 0);
    assert.equal(returns.length, 0);
  });
});

describe('under fire and the idle notice', () => {
  it('plays one blow per engagement, not one per round', () => {
    // docs/ui-ux.md §5: the log records the first blow of an engagement
    // rather than every round of it, and the cue follows the same window.
    const { sink, calls } = recorder();
    const mixer = new SelfMixer(sink);

    mixer.update(frame({ tick: 60, events: [event(SelfEventKind.Damaged, 7)] }), 0);
    mixer.update(frame({ tick: 120, events: [event(SelfEventKind.Damaged, 7)] }), 1);
    mixer.update(frame({ tick: 300, events: [event(SelfEventKind.Damaged, 7)] }), 5);
    assert.equal(calls.filter((c) => c === 'underFire').length, 1, 'one fight, one blow heard');

    // Ten *quiet* seconds re-arm it, counted from the last blow rather than
    // the first: a battle that keeps landing rounds is one engagement however
    // long it runs, and the cue only speaks again once it has actually let up.
    const rearm = 300 + PERSISTENCE.UNDER_FIRE_REARM_S * SIM.TICK_HZ;
    mixer.update(frame({ tick: rearm, events: [event(SelfEventKind.Damaged, 7)] }), 16);
    assert.equal(calls.filter((c) => c === 'underFire').length, 2);
  });

  it('measures the engagement in ticks, so a hidden tab cannot desync it', () => {
    // The renderer applies the same window to its log rows off the same tick.
    // Were this the audio clock, it would freeze while the tab is hidden and
    // the ear would disagree with the record by however long the player
    // looked away.
    const { sink, calls } = recorder();
    const mixer = new SelfMixer(sink);

    mixer.update(frame({ tick: 60, events: [event(SelfEventKind.Damaged, 7)] }), 0);
    // A minute of ticks arrives while the audio clock has barely moved.
    mixer.update(
      frame({ tick: 60 + 60 * SIM.TICK_HZ, events: [event(SelfEventKind.Damaged, 7)] }),
      0.05
    );
    assert.equal(calls.filter((c) => c === 'underFire').length, 2, 'the ticks decide, not the mix');
  });

  it('keeps engagements per hull, not per force', () => {
    // Two hulls hit in the same window are two fights: the player must hear
    // that the second one started.
    const { sink, calls } = recorder();
    const mixer = new SelfMixer(sink);

    mixer.update(frame({ tick: 60, events: [event(SelfEventKind.Damaged, 7)] }), 0);
    mixer.update(frame({ tick: 120, events: [event(SelfEventKind.Damaged, 8)] }), 1);
    assert.equal(calls.filter((c) => c === 'underFire').length, 2);
  });

  it('counts only the blows that sounded', () => {
    // The harness reads firedCounts to ask "did it sound" — a Damaged event
    // folded into a running engagement was delivered, not played.
    const { sink } = recorder();
    const mixer = new SelfMixer(sink);
    mixer.update(frame({ tick: 60, events: [event(SelfEventKind.Damaged, 7)] }), 0);
    mixer.update(frame({ tick: 120, events: [event(SelfEventKind.Damaged, 7)] }), 1);
    assert.equal(mixer.firedCounts['Damaged'], 1);
  });

  it('speaks the idle notice without ducking the water', () => {
    // A chore may not claim a precedence rung: the ui bus sits outside the
    // chain, and the water sounds exactly as it did before the notice.
    const { sink, calls, worldGains } = recorder();
    const mixer = new SelfMixer(sink);

    mixer.update(frame(), 0);
    const before = worldGains[worldGains.length - 1]!;
    mixer.update(frame({ tick: 60, events: [event(SelfEventKind.HarvesterIdle, 9)] }), 1);
    const after = worldGains[worldGains.length - 1]!;

    assert.equal(calls.filter((c) => c === 'notice').length, 1);
    assert.equal(after, before, 'the notice claims no rung');
    assert.equal(mixer.activeRung, null);
  });
});
