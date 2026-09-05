/**
 * Tuned water (#402) — docs/audio-direction.md §9, "Tuned water".
 *
 * Two things are pinned here, and both are the kind a refactor gets quietly
 * wrong:
 *
 * - **The frequencies are a table in the doc.** They are just intervals, 3:2
 *   and 5:4 exactly, because docs/mission-aptitude.md §1's instrument is tuned
 *   by ear over generations and nothing tuned that way lands on equal
 *   temperament. A "tidy-up" to tempered ratios would move the fifth by two
 *   cents and make the beat the detune is measured by wrong.
 * - **A fifth goes flat when the line holding it is being shot**, and it goes
 *   flat *from the crossing* rather than from zero. That sentence is
 *   docs/mission-standing-wave.md §8's one concession to comfort — "a player is
 *   never told that their kill-line is failing by seeing a health bar; they are
 *   told by hearing it go flat" — so the arithmetic under it is worth a test.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { STANDING_WAVE } from '@echoes/shared';
import {
  BED_HZ,
  TUNED,
  centsToRatio,
  corridorFrom,
  flatCentsFor,
  tunedMixFor,
  type TunedNode,
} from '../src/audio/tunedBed.ts';

const EAR = { x: 0, y: 0 };

describe('the Fields ring at a fifth', () => {
  it('voices a just dyad over a just third, in the doc’s register', () => {
    // The table §9 states, re-derived rather than copied: the ratios are the
    // spec and the frequencies fall out of them.
    assert.equal(BED_HZ.root, 880);
    assert.equal(BED_HZ.fifth, 1320);
    assert.equal(BED_HZ.third, 1100);
    // 4:5:6, which is what "a chord" means for an instrument tuned by ear.
    assert.equal(BED_HZ.fifth / BED_HZ.root, 3 / 2);
    assert.equal(BED_HZ.third / BED_HZ.root, 5 / 4);
  });

  it('stays clear of the bands §6 and §10 have already spent', () => {
    // §6 confines residue to 120-800 Hz; §10 gives 40-160 Hz to contacts
    // permanently. Every voice of the bed is above both.
    for (const hz of Object.values(BED_HZ)) assert.ok(hz > 800, `${hz} Hz is in the mark band`);
  });

  it('scales with how much crystal is within earshot, and nothing else', () => {
    const open = tunedMixFor({ crystal: 0, riseM: 0, corridor: null });
    assert.equal(open.root, 0);
    assert.equal(open.fifth, 0);

    const full = tunedMixFor({ crystal: 1, riseM: 0, corridor: null });
    assert.equal(full.root, TUNED.CEILING);
    assert.equal(full.fifth, TUNED.CEILING * TUNED.FIFTH_LEVEL);

    const half = tunedMixFor({ crystal: 0.5, riseM: 0, corridor: null });
    assert.equal(half.root, TUNED.CEILING / 2);
  });

  it('sits under the residue, which sits under contacts', () => {
    // §6 puts the mark bed 6 dB under the live contact bus; this puts the
    // water another 6 dB under that. Both halves as one assertion, so a change
    // to either ceiling has to face the ordering.
    const MARK_CEILING = 0.34;
    const ratio = MARK_CEILING / TUNED.CEILING;
    assert.ok(Math.abs(20 * Math.log10(ratio) - 6) < 0.2, 'the bed is not 6 dB under the marks');
    assert.equal(TUNED.CORRIDOR_CEILING, MARK_CEILING);
  });

  it('adds the chapter-house’s third only where the formation rises', () => {
    const defile = tunedMixFor({ crystal: 1, riseM: 0, corridor: null });
    assert.equal(defile.third, 0, 'ordinary crystal country is a dyad');

    // Both maps that have crystal country author the same 250 m of rise for
    // the Third's own water — the Approach over the Fields, the North Gallery
    // over the defile — so the chord is that country on both without either
    // map being asked to name it.
    const gallery = tunedMixFor({ crystal: 1, riseM: 250, corridor: null });
    assert.equal(gallery.third, TUNED.CEILING * TUNED.THIRD_LEVEL);

    const halfway = tunedMixFor({ crystal: 1, riseM: 125, corridor: null });
    assert.ok(halfway.third > 0 && halfway.third < gallery.third);

    // Rise on ground with no crystal in it is a slope, not a chapter-house.
    assert.equal(tunedMixFor({ crystal: 0, riseM: 400, corridor: null }).third, 0);
  });
});

describe('a corridor written over it', () => {
  it('is as loud where it was laid as anywhere, and fades with range', () => {
    // The corridor does not scale with crystal: it is an absolute PF write,
    // water tuned by hand (docs/mission-standing-wave.md §13).
    const here = tunedMixFor({
      crystal: 0,
      riseM: 0,
      corridor: { pan: 0, rangeM: 0, hpFraction: 1 },
    });
    assert.equal(here.corridor, TUNED.CORRIDOR_CEILING);

    const far = tunedMixFor({
      crystal: 1,
      riseM: 0,
      corridor: { pan: 0, rangeM: TUNED.CORRIDOR_RANGE_M / 2, hpFraction: 1 },
    });
    assert.ok(Math.abs(far.corridor - TUNED.CORRIDOR_CEILING / 2) < 1e-9);

    const gone = tunedMixFor({
      crystal: 1,
      riseM: 0,
      corridor: { pan: 0, rangeM: TUNED.CORRIDOR_RANGE_M * 2, hpFraction: 1 },
    });
    assert.equal(gone.corridor, 0);
  });

  it('carries the bearing the Fields never had', () => {
    const east = tunedMixFor({
      crystal: 1,
      riseM: 0,
      corridor: { pan: 1, rangeM: 500, hpFraction: 1 },
    });
    assert.equal(east.corridorPan, 1);
    // The bed itself is never panned — §9's Fields are "diffuse,
    // unlocatable", and only the line has a direction in it.
    assert.equal(east.root, TUNED.CEILING);
  });
});

describe('and an interval that goes flat', () => {
  it('is in tune above the threshold and flat below it', () => {
    assert.equal(flatCentsFor(1), 0);
    assert.equal(flatCentsFor(STANDING_WAVE.DETUNE_HP_FRACTION), 0);
    assert.ok(flatCentsFor(STANDING_WAVE.DETUNE_HP_FRACTION - 0.0001) > 0);
  });

  it('starts at the doc’s floor rather than at zero, so the crossing is heard', () => {
    // A flat that grew from nothing would make the crossing silent, and the
    // crossing is the whole warning. Just under the threshold is already the
    // floor.
    const justUnder = flatCentsFor(STANDING_WAVE.DETUNE_HP_FRACTION - 0.001);
    assert.ok(Math.abs(justUnder - TUNED.DETUNE_FLOOR_CENTS) < 0.2);
  });

  it('tracks hull downward to a quarter-tone at zero', () => {
    assert.equal(flatCentsFor(0), TUNED.DETUNE_MAX_CENTS);
    assert.equal(TUNED.DETUNE_MAX_CENTS, 50, 'a quarter-tone, in cents');
    // Monotone all the way down: §8 wants the line heard *failing*, which
    // means every hundred hull it loses has to be a step further flat.
    let previous = -1;
    for (let hp = STANDING_WAVE.DETUNE_HP_FRACTION; hp >= 0; hp -= 0.02) {
      const cents = flatCentsFor(hp);
      assert.ok(cents >= previous, `flat went back up at ${hp}`);
      previous = cents;
    }
  });

  it('beats against the canyon’s own fifth at an audible rate', () => {
    // The flat is on the corridor's fifth alone, so what the player actually
    // hears is the beat between the two sustained tones. At the crossing that
    // is around 9 Hz — unmistakable, and impossible to hear as the water.
    const flat = BED_HZ.fifth * centsToRatio(-TUNED.DETUNE_FLOOR_CENTS);
    const beatHz = BED_HZ.fifth - flat;
    assert.ok(beatHz > 6 && beatHz < 12, `beat is ${beatHz.toFixed(1)} Hz`);

    // And it widens as the node falls, which is how the ear reads "worse".
    const dying = BED_HZ.fifth * centsToRatio(-TUNED.DETUNE_MAX_CENTS);
    assert.ok(BED_HZ.fifth - dying > beatHz * 3);
  });

  it('is silent when there is no line to be flat', () => {
    assert.equal(tunedMixFor({ crystal: 1, riseM: 0, corridor: null }).flatCents, 0);
  });

  it('reads the worst of the two nodes holding the line', () => {
    const nodes: TunedNode[] = [
      { x: 0, y: 0, hpFraction: 1 },
      { x: 800, y: 0, hpFraction: 0.2 },
    ];
    const reading = corridorFrom(nodes, EAR);
    assert.ok(reading !== null);
    assert.equal(reading.hpFraction, 0.2);
    assert.ok(flatCentsFor(reading.hpFraction) > TUNED.DETUNE_FLOOR_CENTS);
  });
});

describe('reading a corridor off what the wire carries', () => {
  it('needs two nodes inside the pairing range', () => {
    assert.equal(corridorFrom([{ x: 0, y: 0, hpFraction: 1 }], EAR), null);
    const apart: TunedNode[] = [
      { x: 0, y: 0, hpFraction: 1 },
      { x: STANDING_WAVE.PAIR_RANGE_M + 1, y: 0, hpFraction: 1 },
    ];
    assert.equal(corridorFrom(apart, EAR), null);
  });

  it('places the line at its midpoint, panned by the same cos the voices use', () => {
    const reading = corridorFrom(
      [
        { x: 1000, y: 0, hpFraction: 1 },
        { x: 2000, y: 0, hpFraction: 1 },
      ],
      EAR
    );
    assert.ok(reading !== null);
    assert.equal(reading.rangeM, 1500);
    assert.equal(reading.pan, 1, 'due east is hard right');

    // Due north is dead centre, because stereo is the horizontal axis of the
    // rendered scene and the azimuth is measured from world +x.
    const north = corridorFrom(
      [
        { x: 0, y: -1000, hpFraction: 1 },
        { x: 0, y: -2000, hpFraction: 1 },
      ],
      EAR
    );
    assert.ok(north !== null);
    assert.ok(Math.abs(north.pan) < 1e-9);
  });

  it('picks the flattest line, then the nearest', () => {
    // Three pairs in range. The failing one wins wherever it is: the question
    // the sound answers is "is a line failing".
    const nodes: TunedNode[] = [
      { x: 0, y: 0, hpFraction: 1 },
      { x: 400, y: 0, hpFraction: 1 },
      { x: 4000, y: 0, hpFraction: 0.1 },
      { x: 4400, y: 0, hpFraction: 0.1 },
    ];
    const reading = corridorFrom(nodes, EAR);
    assert.ok(reading !== null);
    assert.equal(reading.hpFraction, 0.1);
    assert.equal(reading.rangeM, 4200);

    // With nothing failing, the nearest wins.
    const healthy = nodes.map((n) => ({ ...n, hpFraction: 1 }));
    const near = corridorFrom(healthy, EAR);
    assert.ok(near !== null);
    assert.equal(near.rangeM, 200);
  });
});
