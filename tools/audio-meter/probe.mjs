/**
 * The layers of the mix, rendered offline in a real Web Audio engine.
 *
 * This file runs in Chromium, bundled by tools/audio-meter/meter.mjs. It
 * imports the **production** classes rather than reimplementing them: a meter
 * reading a model of the bed would have measured a bed nobody ever hears, and
 * the whole reason #663 stayed open through #661's two fixes is that every
 * figure so far came from reasoning about the graph instead of from samples.
 *
 * Each case builds one layer against an `OfflineAudioContext`, drives it at
 * the engine's own 5 Hz Echo cadence (SIM.ECHO_HZ — the beds are written to be
 * updated on the tick and nowhere else), and renders. What comes back is PCM,
 * which loudness.mjs and spectrum.mjs then read in Node.
 *
 * The cases are deliberately *layers* and not the whole mix. #663's open
 * question is which one is uncomfortable, and a render of everything at once
 * answers that no better than listening to it did.
 */

import { Biome, EchoMarkKind, Faction, ResolutionTier } from '@echoes/shared';
import { SelfBed, SourBed } from '../../packages/frontend/src/audio/selfVoice.ts';
import { SELF_BANDS, selfMixFor, sourMixFor } from '../../packages/frontend/src/audio/selfNoise.ts';
import { ContactVoice } from '../../packages/frontend/src/audio/contactVoice.ts';
import { MarkBed } from '../../packages/frontend/src/audio/markBed.ts';
import { TunedBed, tunedMixFor } from '../../packages/frontend/src/audio/tunedBed.ts';

/** The engine's Echo cadence, 5 Hz. The beds are only ever driven on it. */
const TICK_S = 0.2;
/** Render rate, pinned: loudness.mjs's K-weighting is tabulated for 48 kHz. */
const RATE = 48000;

/**
 * Every case the meter can render, each a function of `(context, destination)`
 * returning a `tick(now)` the driver calls at 5 Hz.
 *
 * A case renders one layer at **unity**, with no master gain and no ceiling.
 * That is the point: a figure measured through MASTER_GAIN answers "is the
 * output hot" and a figure measured at the bus answers "which layer made it
 * hot", and only the second can be acted on. The driver applies the master
 * gain afterwards, arithmetically, so both readings come off one render.
 */
export const CASES = {};

/** §4's four SIG bands, each as its own case — the bed the player sits under. */
for (const band of SELF_BANDS) {
  CASES[`self-bed:${band.label.replace(/\s+/g, '-')}`] = (context, destination) => {
    const bed = new SelfBed(context, destination);
    const mix = selfMixFor(band.maxSig, false);
    return (now) => bed.update(mix, now);
  };
}

/** Silent Running, for the other end of the scale §4 promises. */
CASES['self-bed:silent-running'] = (context, destination) => {
  const bed = new SelfBed(context, destination);
  const mix = selfMixFor(80, true);
  return (now) => bed.update(mix, now);
};

/** The Lid, both of its states. */
CASES['sour-bed:grace'] = (context, destination) => {
  const bed = new SourBed(context, destination);
  const mix = sourMixFor(15);
  return (now) => bed.update(mix, now);
};
CASES['sour-bed:bleeding'] = (context, destination) => {
  const bed = new SourBed(context, destination);
  const mix = sourMixFor(40);
  return (now) => bed.update(mix, now);
};

/**
 * The contact bus at one, seven and twenty-four voices.
 *
 * Seven is the picture #663 was reported from; twenty-four is §12's
 * simultaneous-voice budget, so it is the loudest the bus is *allowed* to get.
 * Reading all three is the only way to ask whether the bus has a headroom
 * policy at all or simply sums whatever arrives.
 *
 * Voices are built one per Echo tick rather than all at once, because that is
 * how a match produces them and because starting every oscillator on the same
 * sample would phase-lock them into a single voice at N times the amplitude —
 * a worse case than the game can actually reach, and one that would make the
 * reading say more than it knows.
 */
function contactCase(count, tier, factions) {
  return (context, destination) => {
    const live = [];
    let built = 0;
    return (now) => {
      if (built < count) {
        const i = built++;
        const inputs = {
          tier,
          bearing: (i / count) * Math.PI * 2,
          rangeM: 900 + (i % 7) * 320,
          biome: Biome.AbyssalTrench,
          freshness: 1,
        };
        if (factions !== null) inputs.faction = factions[i % factions.length];
        live.push([new ContactVoice(context, destination), inputs]);
      }
      for (const [voice, inputs] of live) voice.update(inputs, now);
    };
  };
}

/** One classified contact — the reference a per-voice level is chosen against. */
CASES['contacts:one-tier3'] = contactCase(1, ResolutionTier.Classification, [Faction.Directorate]);

/** Seven of one navy: every voice on that navy's drive signature, so they stack. */
CASES['contacts:seven-tier3-one-navy'] = contactCase(7, ResolutionTier.Classification, [
  Faction.Directorate,
]);

/** Seven across the four navies, which is the spread case. */
CASES['contacts:seven-tier3-mixed'] = contactCase(7, ResolutionTier.Classification, [
  Faction.Directorate,
  Faction.Consortium,
  Faction.Bathyarch,
  Faction.Hadron,
]);

/**
 * Seven unclassified contacts — the case with no spread available to it.
 *
 * Tier 1 and Tier 2 have no identity to carry, so every voice below Tier 3 is
 * the same thump at the same frequency by design (§3 forbids them from
 * carrying class information). Seven of them are therefore seven copies of one
 * sine, which is the one stacking case the mix cannot voice its way out of.
 */
CASES['contacts:seven-tier1'] = contactCase(7, ResolutionTier.Contact, null);

/** §12's whole simultaneous-voice budget, spread across the navies. */
CASES['contacts:twentyfour-tier3'] = contactCase(24, ResolutionTier.Classification, [
  Faction.Directorate,
  Faction.Consortium,
  Faction.Bathyarch,
  Faction.Hadron,
]);

/** The world bus's two continuous layers, each alone. */
CASES['mark-bed:all-kinds'] = (context, destination) => {
  const bed = new MarkBed(context, destination);
  const intensity = new Map();
  for (const kind of Object.values(EchoMarkKind)) {
    if (typeof kind === 'number') intensity.set(kind, 1);
  }
  return (now) => bed.update(intensity, now);
};

CASES['tuned-bed:full'] = (context, destination) => {
  const bed = new TunedBed(context, destination);
  const mix = tunedMixFor({
    crystal: 1,
    riseM: 0,
    corridor: { pan: 0, rangeM: 400, hpFraction: 0.2 },
  });
  return (now) => bed.update(mix, now);
};

/**
 * Render one case and hand back its channels.
 *
 * The destination is the context's own, so the render includes whatever the
 * layer does to the graph between itself and the output — which for these
 * classes is everything they have.
 */
export async function render(name, seconds) {
  const build = CASES[name];
  if (build === undefined) throw new Error(`unknown case: ${name}`);
  const context = new OfflineAudioContext(2, Math.round(seconds * RATE), RATE);
  const tick = build(context, context.destination);
  // Driven forward at the Echo cadence with the clock the render will use.
  // Every scheduling call in these classes takes an absolute context time, so
  // the whole run can be laid down before a sample is produced.
  for (let now = 0; now < seconds; now += TICK_S) tick(now);
  const buffer = await context.startRendering();
  // Base64 rather than an array of numbers: the driver reads this back over
  // the DevTools protocol, which serialises every element as JSON text. A
  // twenty-second stereo render is two million samples, and handing them over
  // one decimal literal at a time costs minutes per case. The bytes are the
  // same Float32 the renderer produced either way.
  const channels = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const bytes = new Uint8Array(buffer.getChannelData(c).buffer.slice(0));
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    channels.push(btoa(binary));
  }
  return channels;
}

globalThis.audioMeter = { render, cases: () => Object.keys(CASES) };
