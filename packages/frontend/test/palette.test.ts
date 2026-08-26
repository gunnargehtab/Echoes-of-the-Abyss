/**
 * The four palettes of docs/ui-ux.md §11, checked the only way a palette can
 * honestly be checked: by simulating the deficiency each one exists for and
 * measuring whether the colours that must stay apart actually stay apart.
 *
 * A test that only asserted "the table has four factions in it" would pass on
 * any four hexes, including four that a deuteranope sees as one. So this file
 * carries a dichromat simulation (Viénot–Brettel–Mollon 1999, the standard
 * LMS-projection model) and a CIE76 ΔE, and every threshold below is a
 * perceptual distance rather than a shape assertion.
 *
 * ΔE76 rules of thumb: under 2 is invisible, ~10 is "a shade of the same
 * colour", 25+ is unambiguously a different colour at a glance. The floors here
 * are set from what these palettes actually achieve with margin, and the
 * baseline every one of them beats is the *standard* palette measured under the
 * same deficiency — which is the whole claim: these tables are not a different
 * aesthetic, they are a measurable improvement for the eye they are for.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Faction, ResolutionTier, ResourceKind } from '@echoes/shared';
import {
  PALETTE_LABEL,
  PALETTE_NAMES,
  PALETTES,
  paletteFor,
  setActivePalette,
  TIER_STYLE,
  UI,
  sigColor,
  type Palette,
  type PaletteName,
} from '../src/game/palette.ts';

// --- The simulation ---------------------------------------------------------

type Deficiency = 'deuteranopia' | 'protanopia' | 'tritanopia' | 'none';

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/**
 * What a dichromat sees, as linear RGB.
 *
 * Viénot, Brettel & Mollon (1999): convert to LMS, collapse the missing cone's
 * response onto the plane spanned by the other two, convert back.
 */
function simulate(hex: number, kind: Deficiency): [number, number, number] {
  const r = srgbToLinear(((hex >> 16) & 0xff) / 255);
  const g = srgbToLinear(((hex >> 8) & 0xff) / 255);
  const b = srgbToLinear((hex & 0xff) / 255);

  let L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
  let M = 3.45565 * r + 27.1554 * g + 3.86714 * b;
  let S = 0.0299566 * r + 0.184309 * g + 1.46709 * b;

  if (kind === 'protanopia') L = 2.02344 * M - 2.52581 * S;
  else if (kind === 'deuteranopia') M = 0.494207 * L + 1.24827 * S;
  else if (kind === 'tritanopia') S = -0.395913 * L + 0.801109 * M;

  return [
    0.0809444479 * L + -0.130504409 * M + 0.116721066 * S,
    -0.0102485335 * L + 0.0540193266 * M + -0.113614708 * S,
    -0.000365296938 * L + -0.00412161469 * M + 0.693511405 * S,
  ];
}

/** CIELAB, D65. */
function lab(linear: [number, number, number]): [number, number, number] {
  const [r, g, b] = linear.map((c) => Math.min(1, Math.max(0, c))) as [number, number, number];
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

/** How far apart two inks look to an eye with `kind`. */
function deltaE(a: number, b: number, kind: Deficiency): number {
  const [l1, a1, b1] = lab(simulate(a, kind));
  const [l2, a2, b2] = lab(simulate(b, kind));
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** Perceived lightness, for the "nothing disappears into the water" check. */
function lightness(hex: number, kind: Deficiency): number {
  return lab(simulate(hex, kind))[0];
}

// --- What the palettes hold -------------------------------------------------

const FACTIONS = [Faction.Bathyarch, Faction.Pelagia, Faction.Directorate, Faction.Hadron];
const FACTION_NAME: Record<Faction, string> = {
  [Faction.Bathyarch]: 'Bathyarch',
  [Faction.Pelagia]: 'Pelagia',
  [Faction.Directorate]: 'Directorate',
  [Faction.Hadron]: 'Hadron',
};
const TIERS = [
  ResolutionTier.Contact,
  ResolutionTier.Bearing,
  ResolutionTier.Classification,
  ResolutionTier.Track,
] as const;

/** Which eye each palette is drawn for. */
const FOR: Record<PaletteName, Deficiency> = {
  standard: 'none',
  deuteranopia: 'deuteranopia',
  protanopia: 'protanopia',
  tritanopia: 'tritanopia',
};

/**
 * Every pair the palette is *responsible* for, as (label, a, b).
 *
 * Deliberately not "every pair of colours in the table". Three pairs are
 * identical or near-identical by design and asserting on them would be
 * asserting the design is wrong:
 *
 * - **Nodules and Bathyarch's primary are the same ink** in every palette. Ore
 *   is what the Consortium is about; the standard palette makes them equal too.
 * - **Threat and the Tier-4 track ink** are both the hot end of the same ramp,
 *   and a track is drawn with one as fill and the other as outline.
 * - **Fauna and Bathyarch's accent** are both deliberately neutral — the accent
 *   is iron cladding, and it is only ever a hairline stroke around a hull whose
 *   fill is the faction's primary.
 */
function pairsOf(p: Palette): Array<[string, number, number]> {
  const out: Array<[string, number, number]> = [];

  for (let i = 0; i < FACTIONS.length; i++) {
    for (let j = i + 1; j < FACTIONS.length; j++) {
      const a = p.faction[FACTIONS[i]!]!;
      const b = p.faction[FACTIONS[j]!]!;
      const names = `${FACTION_NAME[FACTIONS[i]!]}/${FACTION_NAME[FACTIONS[j]!]}`;
      out.push([`faction ${names} primary`, a.primary, b.primary]);
      out.push([`faction ${names} accent`, a.accent, b.accent]);
    }
  }
  for (let i = 0; i < TIERS.length - 1; i++) {
    out.push([`tier ${i + 1}->${i + 2}`, p.tier[TIERS[i]!].color, p.tier[TIERS[i + 1]!].color]);
  }
  out.push(['tier 1 vs tier 4', p.tier[TIERS[0]!].color, p.tier[TIERS[3]!].color]);
  out.push(['sig low/mid', p.ui.sigLow, p.ui.sigMid]);
  out.push(['sig mid/high', p.ui.sigMid, p.ui.sigHigh]);
  out.push(['sig low/high', p.ui.sigLow, p.ui.sigHigh]);
  out.push([
    'nodule/crystal',
    p.resource[ResourceKind.Nodule],
    p.resource[ResourceKind.ResonanceCrystal],
  ]);
  out.push(['friendly/threat', p.ui.friendly, p.ui.threat]);
  for (const faction of FACTIONS) {
    out.push([`fauna/${FACTION_NAME[faction]}`, p.fauna, p.faction[faction]!.primary]);
  }
  return out;
}

/** The floor each kind of pair has to clear, by label prefix. */
function floorFor(label: string): number {
  if (label.startsWith('faction')) return 30;
  if (label === 'tier 1 vs tier 4') return 60;
  // Adjacent tiers are allowed to be close, and are: the standard palette puts
  // Tier 1 and Tier 2 17.5 dE apart to a normal eye, on purpose. The scale is
  // read from size, alpha and edge hardness before colour, so this floor only
  // has to catch a step collapsing to nothing — and every replacement palette
  // in fact widens these to 20-23.
  if (label.startsWith('tier')) return 15;
  if (label.startsWith('sig')) return 25;
  if (label === 'nodule/crystal') return 40;
  if (label === 'friendly/threat') return 40;
  // Fauna against a navy. The standard palette only just clears this — its cold
  // organic green sits 16.2 dE from Pelagia's algae teal to a *normal* eye, and
  // closer than that to every dichromat one — which is why the module's claim
  // that fauna is "distinct from every faction palette" leans on the organic
  // silhouette rather than on the hue. The three replacement palettes clear it
  // by 25 or more, which is the improvement this file exists to hold in place.
  return 15;
}

// --- The tests --------------------------------------------------------------

describe('the palette tables', () => {
  it('ships exactly the four palettes §11 names, each labelled', () => {
    assert.deepEqual([...PALETTE_NAMES], ['standard', 'deuteranopia', 'protanopia', 'tritanopia']);
    for (const name of PALETTE_NAMES) {
      assert.equal(PALETTES[name].name, name, `${name} knows its own name`);
      assert.ok(PALETTE_LABEL[name].length > 0, `${name} has a label for the settings screen`);
    }
  });

  it('defines every ink, as a 24-bit colour', () => {
    for (const name of PALETTE_NAMES) {
      const p = PALETTES[name];
      const inks: Array<[string, number]> = [
        ...FACTIONS.flatMap((f): Array<[string, number]> => [
          [`${FACTION_NAME[f]}.primary`, p.faction[f].primary],
          [`${FACTION_NAME[f]}.accent`, p.faction[f].accent],
          [`${FACTION_NAME[f]}.glow`, p.faction[f].glow],
        ]),
        ...TIERS.map((t): [string, number] => [`tier ${t}`, p.tier[t].color]),
        ['nodule', p.resource[ResourceKind.Nodule]],
        ['crystal', p.resource[ResourceKind.ResonanceCrystal]],
        ['fauna', p.fauna],
        ...Object.entries(p.ui).map(([k, v]): [string, number] => [`ui.${k}`, v]),
      ];
      for (const [what, ink] of inks) {
        assert.ok(
          Number.isInteger(ink) && ink >= 0 && ink <= 0xffffff,
          `${name}.${what} is a colour, got ${String(ink)}`
        );
      }
    }
  });

  it('never re-encodes a tier — only its ink moves', () => {
    // The fidelity encoding is size, alpha and edge hardness, and it is what
    // makes the whole scale survive any colour vision deficiency in the first
    // place. A palette that touched it would be changing the Asymmetric
    // Fidelity Law rather than recolouring it.
    for (const name of PALETTE_NAMES) {
      for (const tier of TIERS) {
        const mine = PALETTES[name].tier[tier];
        const standard = PALETTES.standard.tier[tier];
        assert.equal(mine.alpha, standard.alpha, `${name} tier ${tier} alpha`);
        assert.equal(mine.radius, standard.radius, `${name} tier ${tier} radius`);
        assert.equal(mine.label, standard.label, `${name} tier ${tier} label`);
      }
    }
  });

  it('keeps chrome identical across all four — a bevel is not information', () => {
    for (const name of PALETTE_NAMES) {
      const { ui } = PALETTES[name];
      for (const key of [
        'background',
        'glass',
        'glassStroke',
        'accent',
        'text',
        'textDim',
      ] as const) {
        assert.equal(ui[key], PALETTES.standard.ui[key], `${name} moved chrome ${key}`);
      }
    }
  });
});

describe('what each palette is for', () => {
  for (const name of PALETTE_NAMES) {
    const kind = FOR[name];

    it(`${name}: every pair it owns stays apart under ${kind}`, () => {
      for (const [label, a, b] of pairsOf(PALETTES[name])) {
        const d = deltaE(a, b, kind);
        const floor = floorFor(label);
        assert.ok(
          d >= floor,
          `${name}: ${label} is ${d.toFixed(1)} dE under ${kind}, needs ${floor}`
        );
      }
    });
  }

  for (const name of ['deuteranopia', 'protanopia', 'tritanopia'] as const) {
    it(`${name}: beats the standard palette's worst pair under the same eye`, () => {
      // The claim these tables exist to make. The standard palette is measured
      // through the same simulation, so this compares like with like: whatever
      // its weakest pair collapses to for this eye, the replacement's weakest
      // pair must be further apart.
      const worst = (p: Palette) =>
        pairsOf(p).reduce(
          (acc, [label, a, b]) => {
            const d = deltaE(a, b, name);
            return d < acc.d ? { label, d } : acc;
          },
          { label: '', d: Infinity }
        );
      const mine = worst(PALETTES[name]);
      const standard = worst(PALETTES.standard);
      assert.ok(
        mine.d > standard.d,
        `${name}'s worst (${mine.label} ${mine.d.toFixed(1)}) must beat the standard palette's ` +
          `worst under the same eye (${standard.label} ${standard.d.toFixed(1)})`
      );
    });
  }

  it('the standard palette hides fauna inside the Commune for every deficiency', () => {
    // Not a complaint about the art direction — a statement of the problem the
    // three palettes are for. If this ever stops being true the fauna colour has
    // changed, and the note in style-neon-noir.md about it needs changing too.
    for (const kind of ['deuteranopia', 'protanopia', 'tritanopia'] as const) {
      const d = deltaE(
        PALETTES.standard.fauna,
        PALETTES.standard.faction[Faction.Pelagia].primary,
        kind
      );
      assert.ok(d < 15, `standard fauna vs Pelagia under ${kind} is ${d.toFixed(1)} dE`);
    }
  });

  it('never lets an ink sink into the water it is drawn on', () => {
    // "It may not make anything invisible to make something else clearer."
    // Everything in the game is drawn over abyss-void, so every information ink
    // has to stay well clear of it for the eye its palette is for.
    for (const name of PALETTE_NAMES) {
      const p = PALETTES[name];
      const kind = FOR[name];
      const ground = lightness(p.ui.background, kind);
      const inks: Array<[string, number]> = [
        ...FACTIONS.map((f): [string, number] => [
          `${FACTION_NAME[f]} primary`,
          p.faction[f].primary,
        ]),
        ...TIERS.map((t): [string, number] => [`tier ${t}`, p.tier[t].color]),
        ['fauna', p.fauna],
        ['threat', p.ui.threat],
        ['friendly', p.ui.friendly],
      ];
      for (const [what, ink] of inks) {
        assert.ok(
          lightness(ink, kind) - ground >= 15,
          `${name}: ${what} is only ${(lightness(ink, kind) - ground).toFixed(1)} L* above the water`
        );
      }
    }
  });
});

describe('the active palette', () => {
  it('swaps every table at once, and back', () => {
    try {
      setActivePalette('tritanopia');
      assert.equal(UI.sigMid, PALETTES.tritanopia.ui.sigMid);
      assert.equal(TIER_STYLE[ResolutionTier.Track].color, PALETTES.tritanopia.tier[4].color);
      assert.equal(sigColor(90), PALETTES.tritanopia.ui.sigHigh);
      assert.equal(sigColor(10), PALETTES.tritanopia.ui.sigLow);
    } finally {
      setActivePalette('standard');
    }
    assert.equal(UI.sigMid, PALETTES.standard.ui.sigMid);
    assert.equal(sigColor(90), PALETTES.standard.ui.sigHigh);
  });

  it('refuses to be set to something that is not a palette', () => {
    // This value comes out of localStorage, which anything on the origin may
    // write. A junk record costs the player their palette, never the renderer.
    for (const junk of [undefined, null, 42, 'monochrome', {}, '']) {
      assert.equal(paletteFor(junk).name, 'standard', `paletteFor(${String(junk)})`);
    }
    try {
      setActivePalette('deuteranopia');
      setActivePalette('nonsense');
      assert.equal(UI.sigMid, PALETTES.standard.ui.sigMid);
    } finally {
      setActivePalette('standard');
    }
  });
});
