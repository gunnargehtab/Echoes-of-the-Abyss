/**
 * The speech channel, as data — docs/audio-direction.md §13 (#381).
 *
 * The hail itself needs an AudioContext and is heard rather than asserted.
 * What can be pinned without one is everything the section states as a
 * number or a rule: how long a line is read for, what the whisper does to
 * that, and that the five registers are five *materials* rather than five
 * volumes of one — docs/culture.md §6's register test, applied to the table
 * the player is built from.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chorusOf, registerOf, type MissionSpeaker, type MissionVoice } from '@echoes/shared';
import {
  CAST,
  HAILS,
  HAIL_S,
  READING,
  WHISPER,
  hailFor,
  playHail,
  readingSeconds,
  rowFor,
  type Hail,
} from '../src/audio/speechVoice.ts';

const VOICES: readonly MissionVoice[] = ['concern', 'plateaus', 'cohorts', 'order', 'court'];

/** docs/audio-direction.md §13's cast, spelled out so a twentieth cannot drift in unnamed. */
const SPEAKERS: readonly MissionSpeaker[] = [
  'varr-kest',
  'osk',
  'tull',
  'marr',
  'anholt',
  'teel',
  'charting-pair',
  'korrin',
  'ossary',
  'adze',
  'sull',
  'vrey',
  'kalliso',
  'halloran',
  'the-grid',
  'the-bloom',
  'those-below',
  'the-chapter',
  'the-record',
];
const CHORUSES: readonly MissionSpeaker[] = VOICES.map(chorusOf);
const NAMED = SPEAKERS.filter((speaker) => !CHORUSES.includes(speaker));

describe('how long a line is read for', () => {
  it('runs at the stated rate between the stated floor and ceiling', () => {
    assert.equal(readingSeconds('x'.repeat(45)), 45 / READING.CHARS_PER_S);
    assert.equal(readingSeconds('x'.repeat(75)), 5);
    // A one-word line still opens the channel long enough to be heard as one.
    assert.equal(readingSeconds('No.'), READING.MIN_S);
    assert.equal(readingSeconds(''), READING.MIN_S);
    // A paragraph does not hold the rung for the length of a paragraph.
    assert.equal(readingSeconds('x'.repeat(10_000)), READING.MAX_S);
  });

  it('counts the spaces, because a reader does not skip them', () => {
    assert.equal(readingSeconds('a '.repeat(30)), 60 / READING.CHARS_PER_S);
  });

  it('halves under the whisper rule, after the clamp', () => {
    for (const text of ['No.', 'x'.repeat(60), 'x'.repeat(10_000)]) {
      assert.equal(readingSeconds(text, true), readingSeconds(text) * WHISPER.BED_SCALE);
    }
    // Halving after clamping keeps a whispered word shorter than a whispered
    // paragraph, which the other order would pin to one floor.
    assert.ok(readingSeconds('No.', true) < readingSeconds('x'.repeat(60), true));
    assert.equal(WHISPER.GAIN, 0.5, '§13: −6 dB');
  });
});

describe('the five hails', () => {
  it('are five, one per register, and each is what hailFor reads for its chorus', () => {
    assert.deepEqual(Object.keys(HAILS).sort(), [...VOICES].sort());
    for (const voice of VOICES) assert.equal(hailFor(chorusOf(voice)), HAILS[voice]);
  });

  it('are five materials, not five volumes of one', () => {
    // §6's test made mechanical: a channel whose speakers share a mechanism
    // has one narrator with five names. Each register owns its mechanism and
    // its fundamental, and the court's is the dry one — the room with no
    // water in it.
    const materials = new Set(VOICES.map((voice) => HAILS[voice].material));
    assert.equal(materials.size, VOICES.length, 'every register has its own mechanism');
    const fundamentals = new Set(VOICES.map((voice) => HAILS[voice].hz));
    assert.equal(fundamentals.size, VOICES.length, 'every register has its own fundamental');
    assert.equal(HAILS.court.material, 'dry');
  });

  it('give the concern a beat and the plateaus none', () => {
    // §8's two poles, carried into speech: the concern is the only voice with
    // a metronome in it and the plateaus never repeat.
    assert.equal(HAILS.concern.jitter, 0);
    assert.ok(HAILS.plateaus.jitter > 0.8);
    assert.equal(HAILS.concern.material, 'reciprocating');
    assert.equal(HAILS.plateaus.material, 'breathing');
  });

  it('each lose their own top octave under the whisper, not a fixed one', () => {
    // The whisper low-passes at half the register's ceiling. Ceilings differ
    // by more than an octave across the table, so a single fixed cut would
    // gut the court and leave the concern untouched.
    const ceilings = VOICES.map((voice) => HAILS[voice].ceilingHz);
    assert.ok(Math.max(...ceilings) / Math.min(...ceilings) > 2);
    for (const voice of VOICES) assert.ok(HAILS[voice].ceilingHz / 2 > HAILS[voice].bedHz / 2);
  });

  it('open every line with the same length of signature', () => {
    // The hail's job is to say *which* voice, not *how much*; a longer hail
    // for one register would read as that register being more important.
    assert.equal(HAIL_S, 0.6);
  });
});

describe('the cast', () => {
  it('is the nineteen §13 names, and the choruses are the plain hails by identity', () => {
    assert.deepEqual(Object.keys(CAST).sort(), [...SPEAKERS].sort());
    // By identity rather than by copy: the one table of materials stays the
    // one place a register's material is defined, and a chorus that drifted
    // from its hail would be a sixth voice nobody authored.
    for (const voice of VOICES) assert.equal(CAST[chorusOf(voice)], HAILS[voice]);
    assert.equal(NAMED.length, 14, 'the twelve, Halloran, and the charting pair');
  });

  it("keeps every signature inside its register's material and its ceiling", () => {
    // §6's test held structurally: a signature is the register's mechanism
    // at the speaker's figures, never another mechanism. The whisper rule
    // takes the top octave of the *register's* ceiling, so the ceiling is
    // the register's too, and every bed still sits under it.
    for (const speaker of SPEAKERS) {
      const plain = HAILS[registerOf(speaker)];
      assert.equal(CAST[speaker].material, plain.material, `${speaker} left its material`);
      assert.equal(CAST[speaker].ceilingHz, plain.ceilingHz, `${speaker} has its own ceiling`);
      assert.ok(CAST[speaker].bedHz < CAST[speaker].ceilingHz, `${speaker}'s bed is over its top`);
    }
  });

  it('makes every named speaker distinct from the chorus, and from each other', () => {
    // A voice per speaker that a listener could not tell from the plain hail
    // is a row in a table and not a voice. Fundamental, cadence or unison —
    // the three things the ear has inside one material.
    const key = (row: Hail) => `${row.hz}/${row.syllableHz}/${row.unison ?? 1}`;
    for (const speaker of NAMED) {
      const plain = HAILS[registerOf(speaker)];
      assert.notEqual(key(CAST[speaker]), key(plain), `${speaker} is the chorus`);
    }
    for (const voice of VOICES) {
      const inRegister = SPEAKERS.filter((speaker) => registerOf(speaker) === voice);
      const keys = new Set(inRegister.map((speaker) => key(CAST[speaker])));
      assert.equal(keys.size, inRegister.length, `two of the ${voice} share a signature`);
    }
  });

  it("keeps each register's law: the concern's machines are metronomes, the plateaus never repeat", () => {
    for (const speaker of SPEAKERS) {
      const register = registerOf(speaker);
      if (register === 'concern') assert.equal(CAST[speaker].jitter, 0, `${speaker} wanders`);
      if (register === 'plateaus') assert.ok(CAST[speaker].jitter > 0, `${speaker} repeats`);
    }
  });

  it("seats Sull and Vrey a fourth either side of the Order's note, and Kalliso on it", () => {
    // docs/characters.md: the two notes the Order's own sits between, and a
    // seventh without it. A fourth is 4:3; the tolerance is a tuner's.
    const g = HAILS.order.hz;
    assert.ok(Math.abs(CAST.sull.hz / g - 4 / 3) < 0.01, 'Sull a fourth above');
    assert.ok(Math.abs(g / CAST.vrey.hz - 4 / 3) < 0.01, 'Vrey a fourth below');
    assert.equal(CAST.kalliso.hz, g, 'the most ordinary person sounds like the Order');
    assert.notEqual(CAST.sull.hz, CAST.vrey.hz, 'Vrey and Sull no longer share the note');
  });

  it("gives the pair two of the register's own breath, and nobody else a unison", () => {
    assert.equal(CAST['charting-pair'].unison, 2);
    assert.equal(CAST['charting-pair'].hz, HAILS.plateaus.hz);
    for (const speaker of SPEAKERS) {
      if (speaker === 'charting-pair') continue;
      assert.equal(CAST[speaker].unison, undefined, `${speaker} is a unison`);
    }
  });

  it("signs a line with its speaker, and with the register's chorus if the two disagree", () => {
    // The runtime resolves both from one beat and missions.test.ts holds them
    // together; this is the guard on the wire. The register is §6's test and
    // is never overruled by a speaker id from another register.
    assert.equal(rowFor({ voice: 'concern', speakerId: 'varr-kest' }), CAST['varr-kest']);
    assert.equal(rowFor({ voice: 'plateaus', speakerId: 'charting-pair' }), CAST['charting-pair']);
    assert.equal(rowFor({ voice: 'order', speakerId: 'varr-kest' }), HAILS.order);
  });
});

/**
 * A recording AudioContext: enough of the Web Audio surface for `playHail`
 * to run, capturing every frequency it schedules and nothing else. It does
 * not assert that Web Audio works — menuBed.test.ts says why a mock cannot —
 * only that the chair's line is scheduled at the chair's figures and not at
 * the plain hail's, which is the routing this issue adds and the one thing
 * the data tests above cannot see.
 */
function recordingContext(): { context: AudioContext; scheduledHz: number[] } {
  const scheduledHz: number[] = [];
  const node = () => {
    const self: Record<string, unknown> = {
      connect: () => self,
      start: () => undefined,
      stop: () => undefined,
      buffer: null,
      loop: false,
      type: 'sine',
    };
    const param = (record: boolean) => ({
      value: 0,
      setValueAtTime: (hz: number) => {
        if (record) scheduledHz.push(hz);
      },
      linearRampToValueAtTime: () => undefined,
      exponentialRampToValueAtTime: () => undefined,
    });
    return { self, param };
  };
  const oscillator = () => {
    const { self, param } = node();
    self.frequency = param(true);
    return self;
  };
  const plain = () => {
    const { self, param } = node();
    self.frequency = param(false);
    self.gain = param(false);
    self.Q = param(false);
    return self;
  };
  const context = {
    sampleRate: 8000,
    currentTime: 0,
    createOscillator: oscillator,
    createGain: plain,
    createBiquadFilter: plain,
    createBufferSource: plain,
    createBuffer: () => ({ getChannelData: () => new Float32Array(8000) }),
  } as unknown as AudioContext;
  return { context, scheduledHz };
}

describe('the three debts, in the headless client', () => {
  const opts = { whisper: false, readingS: 2 };
  const fundamentals = (line: Parameters<typeof rowFor>[0]) => {
    const { context, scheduledHz } = recordingContext();
    playHail(context, context.createGain(), line, 0, opts);
    return new Set(scheduledHz);
  };

  it("schedules the chair's transmission at the chair's machine, not the grid's", () => {
    // Item Nine's conditional line and Tolerance's two arrive as `varr-kest`
    // in the concern; the plain hail would strike at 68 Hz.
    const chair = fundamentals({ voice: 'concern', speakerId: 'varr-kest' });
    const grid = fundamentals({ voice: 'concern', speakerId: 'the-grid' });
    assert.ok(chair.has(CAST['varr-kest'].hz));
    assert.ok(!chair.has(HAILS.concern.hz));
    assert.ok(grid.has(HAILS.concern.hz));
  });

  it("schedules the pair's 05:30 as two breaths, and the bloom's as one", () => {
    // The Second Seeding's pair as the player's own: the register's breath
    // twice, the second sharp of the first, where the chorus breathes once.
    const pair = fundamentals({ voice: 'plateaus', speakerId: 'charting-pair' });
    const bloom = fundamentals({ voice: 'plateaus', speakerId: 'the-bloom' });
    assert.ok(pair.has(HAILS.plateaus.hz));
    assert.ok(pair.has(HAILS.plateaus.hz * 1.04), 'the second breath, four per cent sharp');
    assert.equal(bloom.size, 1);
    assert.ok(pair.size > bloom.size);
  });

  it('holds the rung for the same time signed as plain', () => {
    // A signature is who, not how much: the channel is occupied for the hail
    // and the reading, whoever spoke.
    const { context } = recordingContext();
    const signed = playHail(
      context,
      context.createGain(),
      { voice: 'order', speakerId: 'sull' },
      0,
      opts
    );
    const plain = playHail(
      context,
      context.createGain(),
      { voice: 'order', speakerId: 'the-chapter' },
      0,
      opts
    );
    assert.equal(signed, plain);
    assert.equal(signed, HAIL_S + opts.readingS);
  });
});
