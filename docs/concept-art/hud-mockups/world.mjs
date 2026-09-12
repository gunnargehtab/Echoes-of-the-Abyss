/**
 * The world view, identical in all ten frames.
 *
 * Every mockup draws the same water, the same fleet and the same four contacts,
 * because the thing under comparison is the chrome and a comparison whose
 * frames disagree about the scene is not one. Only the state extras differ:
 * a route and an order marker for the order frames, a placement ghost for the
 * production ones.
 *
 * Drawn to docs/ui-ux.md §4's rendering contract rather than to taste — the
 * tier marks carry the alphas and relative radii of `TIER_SHAPE`, the veil of
 * §4.5 drains the ground alone, and nothing the player earned is dimmed.
 */

import { BIOME, FACTION, GLYPH, NEON, RESOURCE, TEXT, TIER, VENT_EMBER } from './tokens.mjs';

const AMBER = FACTION.bathyarch.primary;

/** Where the ring opens, per state — the pointer is the ring's anchor. */
export const CURSOR = {
  rest: null,
  orders: { x: 1148, y: 676 },
  build: { x: 742, y: 596 },
};

function defs() {
  return `
  <defs>
    <linearGradient id="column" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BIOME.abyssalTrench}"/>
      <stop offset="0.62" stop-color="${BIOME.openWater}"/>
      <stop offset="1" stop-color="#08161f"/>
    </linearGradient>
    <linearGradient id="floorInk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#081a16"/>
      <stop offset="0.5" stop-color="${BIOME.kelpForest}"/>
      <stop offset="1" stop-color="#0e2a20"/>
    </linearGradient>
    <radialGradient id="hole">
      <stop offset="0" stop-color="#000"/>
      <stop offset="0.5" stop-color="#000"/>
      <stop offset="1" stop-color="#fff"/>
    </radialGradient>
    <radialGradient id="hazeT1">
      <stop offset="0" stop-color="${TIER[1].ink}" stop-opacity="0.3"/>
      <stop offset="0.72" stop-color="${TIER[1].ink}" stop-opacity="0.13"/>
      <stop offset="1" stop-color="${TIER[1].ink}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blobT2">
      <stop offset="0" stop-color="${TIER[2].ink}" stop-opacity="0.46"/>
      <stop offset="0.66" stop-color="${TIER[2].ink}" stop-opacity="0.26"/>
      <stop offset="1" stop-color="${TIER[2].ink}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ember">
      <stop offset="0" stop-color="${VENT_EMBER}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${VENT_EMBER}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="oreGlow">
      <stop offset="0" stop-color="${RESOURCE.nodule}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${RESOURCE.nodule}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="stain">
      <stop offset="0" stop-color="${TIER[1].ink}" stop-opacity="0.15"/>
      <stop offset="1" stop-color="${TIER[1].ink}" stop-opacity="0"/>
    </radialGradient>
    <mask id="veilHole">
      <rect x="0" y="0" width="1920" height="1080" fill="#fff"/>
      <ellipse cx="832" cy="716" rx="612" ry="352" fill="url(#hole)"/>
      <ellipse cx="1296" cy="762" rx="268" ry="168" fill="url(#hole)"/>
    </mask>
    <clipPath id="floorClip">
      <path d="M 0 486 L 372 432 L 742 452 L 1148 414 L 1512 448 L 1920 402 L 1920 1080 L 0 1080 Z"/>
    </clipPath>
  </defs>`;
}

/** The seabed, its props and its embers — the only things §4.5 lets the veil touch. */
function ground() {
  const terraces = [
    'M 0 486 L 372 432 L 742 452 L 1148 414 L 1512 448 L 1920 402',
    'M 0 566 L 398 522 L 792 546 L 1204 508 L 1560 542 L 1920 500',
    'M 0 690 L 430 648 L 860 676 L 1272 636 L 1622 670 L 1920 632',
    'M 0 868 L 468 826 L 918 856 L 1330 812 L 1666 848 L 1920 810',
  ];
  const hillshade = terraces
    .map(
      (d, i) =>
        `<path d="${d}" fill="none" stroke="#1d4a3c" stroke-opacity="${0.34 - i * 0.05}" stroke-width="1.2"/>`
    )
    .join('');

  // A vent field west, a nodule field east: the two things worth going to.
  const embers = [
    [408, 902, 26],
    [452, 878, 18],
    [366, 926, 15],
    [486, 918, 12],
    [430, 946, 20],
  ]
    .map(
      ([x, y, r]) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#ember)"/><circle cx="${x}" cy="${y}" r="2" fill="${VENT_EMBER}"/>`
    )
    .join('');

  const nodules = [
    [1248, 742],
    [1286, 728],
    [1322, 750],
    [1268, 774],
    [1310, 786],
    [1350, 762],
    [1230, 766],
    [1294, 800],
    [1338, 730],
    [1364, 792],
    [1210, 748],
    [1356, 812],
    [1272, 712],
    [1330, 706],
  ]
    .map(
      ([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="2.6" fill="${RESOURCE.nodule}" fill-opacity="0.9"/>`
    )
    .join('');

  return `
  <g clip-path="url(#floorClip)">
    <path d="M 0 486 L 372 432 L 742 452 L 1148 414 L 1512 448 L 1920 402 L 1920 1080 L 0 1080 Z" fill="url(#floorInk)"/>
    ${hillshade}
    <ellipse cx="1292" cy="756" rx="188" ry="92" fill="url(#oreGlow)"/>
    ${nodules}
    ${embers}
  </g>`;
}

/**
 * §4.5's veil: the ground goes cold where nothing of yours can hear, drained
 * rather than blacked out, and clipped to the ground so it can never reach a
 * mark. Two holes because the best ear wins — the basin, and the harvester's
 * own hearing out at the nodule field.
 */
function veil() {
  return `<g clip-path="url(#floorClip)"><rect x="0" y="0" width="1920" height="1080" fill="#0a1a24" fill-opacity="0.84" mask="url(#veilHole)"/></g>`;
}

function hull(x, y, scale, ink, heading = 0) {
  return `<g transform="translate(${x} ${y}) rotate(${heading}) scale(${scale})">
    <path d="M -17 0 L -9 -5 L 12 -5 L 19 0 L 12 5 L -9 5 Z" fill="#0a1016" stroke="${ink}" stroke-width="1.4"/>
    <path d="M -4 -5 L 3 -5 L 3 -9 L -2 -9 Z" fill="${ink}" fill-opacity="0.55"/>
    <circle cx="11" cy="0" r="1.6" fill="${ink}"/>
  </g>`;
}

function structure(x, y, scale, ink, kind) {
  const body =
    kind === 'bastion'
      ? `<path d="M -22 12 L -22 -8 L -10 -18 L 10 -18 L 22 -8 L 22 12 Z" fill="#0b1219" stroke="${ink}" stroke-width="1.5"/>
         <path d="M -11 12 L -11 -6 L 11 -6 L 11 12" fill="none" stroke="${ink}" stroke-opacity="0.5" stroke-width="1"/>`
      : `<path d="M -18 10 L -18 -10 L 18 -10 L 18 10 Z" fill="#0b1219" stroke="${ink}" stroke-width="1.5"/>
         <path d="M -8 -10 L -8 -17 L -2 -17 L -2 -10" fill="none" stroke="${ink}" stroke-width="1.2"/>`;
  return `<g transform="translate(${x} ${y}) scale(${scale})">${body}<circle cx="0" cy="0" r="2" fill="${ink}" fill-opacity="0.8"/></g>`;
}

/** Teal, and only ever on the player's own: §4.5's own force is never in question. */
function selectionRing(x, y, r) {
  return `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.46}" fill="none" stroke="${NEON.teal}" stroke-width="1.6" stroke-opacity="0.95"/>`;
}

function healthBar(x, y, w, frac, lost) {
  const good = w * frac;
  const hatched = w * lost;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="3.5" fill="#0a1016" stroke="#0a1016"/>
    <rect x="${x}" y="${y}" width="${good}" height="3.5" fill="${NEON.teal}"/>
    <rect x="${x + w - hatched}" y="${y}" width="${hatched}" height="3.5" fill="${NEON.red}" fill-opacity="0.22"/>
    <path d="${Array.from({ length: 5 }, (_, i) => `M ${x + w - hatched + i * 3} ${y + 3.5} l 3.5 -3.5`).join(' ')}" stroke="${NEON.red}" stroke-width="0.8" stroke-opacity="0.75" fill="none"/>
  </g>`;
}

/** The four tiers of §4, each at its own alpha and its own honesty about edges. */
function contacts() {
  const t3 = TIER[3];
  return `
  <!-- Tier 1: a haze, because a haze is what the server sent -->
  <circle cx="1548" cy="322" r="98" fill="url(#hazeT1)"/>
  <circle cx="1548" cy="322" r="96" fill="none" stroke="${TIER[1].ink}" stroke-opacity="0.2" stroke-width="1"/>

  <!-- Tier 2: a blob at the blurred position, no type, no faction -->
  <ellipse cx="1176" cy="424" rx="54" ry="40" fill="url(#blobT2)"/>

  <!-- Tier 3: faction ink, the navy's glyph beside it, and a count that looks like an estimate -->
  <circle cx="1622" cy="628" r="26" fill="none" stroke="${FACTION.hadron.accent}" stroke-opacity="0.5" stroke-width="1.2"/>
  <circle cx="1622" cy="628" r="7" fill="${FACTION.hadron.accent}" fill-opacity="${t3.alpha}"/>
  <circle cx="1622" cy="628" r="7" fill="none" stroke="${FACTION.hadron.accent}" stroke-width="1.3"/>
  <g transform="translate(1656 628) scale(0.62)" opacity="0.95">
    <path d="${GLYPH.hadron}" fill="none" stroke="${FACTION.hadron.accent}" stroke-width="2.4" stroke-linejoin="round"/>
  </g>
  <text x="1622" y="672" fill="${FACTION.hadron.accent}" font-family="ui-monospace, Consolas, monospace" font-size="11" letter-spacing="1.4" text-anchor="middle" opacity="0.92">~3</text>

  <!-- Tier 4: crisp, with heading, health and the brackets that mirror the lock tone -->
  <g>
    <path d="M 1028 306 l 0 -13 l 13 0 M 1090 306 l 0 -13 l -13 0 M 1028 352 l 0 13 l 13 0 M 1090 352 l 0 13 l -13 0" fill="none" stroke="${TIER[4].ink}" stroke-width="1.6" stroke-opacity="0.9"/>
    <line x1="1059" y1="329" x2="1104" y2="300" stroke="${TIER[4].ink}" stroke-width="1.4" stroke-opacity="0.85"/>
    ${hull(1059, 329, 0.82, TIER[4].ink, -33)}
    ${healthBar(1037, 358, 44, 0.62, 0.16)}
    <g transform="translate(1010 329) scale(0.5)">
      <path d="${GLYPH.directorate}" fill="none" stroke="${FACTION.directorate.accent}" stroke-width="2.6" stroke-linejoin="round"/>
    </g>
  </g>`;
}

/** Residue: the past, in its own cooler ink, never sharing one with the present. */
function marks() {
  const wake = Array.from(
    { length: 9 },
    (_, i) =>
      `<circle cx="${1398 + i * 34}" cy="${228 + i * 11}" r="${5.5 - i * 0.25}" fill="${TIER[1].ink}" fill-opacity="${0.2 - i * 0.014}"/>`
  ).join('');
  return `<g>
    <circle cx="548" cy="962" r="86" fill="url(#stain)"/>
    <circle cx="366" cy="700" r="58" fill="url(#stain)"/>
    ${wake}
  </g>`;
}

function ownForce(state) {
  const sel = `${selectionRing(884, 706, 30)}${selectionRing(942, 752, 30)}`;
  // The selected hull's own detection ring — predicted client-side from the
  // same maths the server runs (docs/ui-ux.md §12), so it is honest to draw.
  const ring = `<ellipse cx="884" cy="706" rx="268" ry="124" fill="none" stroke="${NEON.cyan}" stroke-opacity="0.18" stroke-width="1.4" stroke-dasharray="5 7"/>`;
  return `<g>
    ${ring}
    ${structure(742, 596, 1.15, AMBER, 'bastion')}
    ${structure(646, 668, 1, AMBER, 'foundry')}
    ${hull(1296, 762, 0.95, AMBER, 8)}
    ${hull(884, 706, 1, AMBER, -12)}
    ${hull(942, 752, 1, AMBER, -12)}
    ${sel}
    ${state === 'build' ? `<ellipse cx="742" cy="596" rx="54" ry="26" fill="none" stroke="${NEON.cyan}" stroke-width="1.4" stroke-opacity="0.75"/>` : ''}
  </g>`;
}

/**
 * Order feedback: §12's contracting ring at the point asked for, and the route
 * to it, drawn at once and locally. The marker says what was *asked*.
 */
function orderExtras() {
  return `<g>
    <path d="M 884 706 L 1082 802 L 1268 764" fill="none" stroke="${NEON.teal}" stroke-width="1.5" stroke-opacity="0.6" stroke-dasharray="7 6"/>
    <ellipse cx="1268" cy="764" rx="22" ry="11" fill="none" stroke="${NEON.teal}" stroke-width="1.6"/>
    <ellipse cx="1268" cy="764" rx="12" ry="6" fill="none" stroke="${NEON.teal}" stroke-width="1.2" stroke-opacity="0.55"/>
    <ellipse cx="1082" cy="802" rx="7" ry="3.5" fill="none" stroke="${NEON.teal}" stroke-width="1.2" stroke-opacity="0.7"/>
  </g>`;
}

function buildExtras() {
  return `<g>
    <path d="M 690 636 L 794 636 L 794 676 L 690 676 Z" fill="${NEON.cyan}" fill-opacity="0.07" stroke="${NEON.cyan}" stroke-width="1.3" stroke-dasharray="6 5"/>
    <path d="M 690 636 l 0 -9 M 794 636 l 0 -9 M 690 676 l 0 9 M 794 676 l 0 9" stroke="${NEON.cyan}" stroke-width="1.3"/>
    <text x="742" y="700" fill="${TEXT.cyan}" font-family="ui-monospace, Consolas, monospace" font-size="11" letter-spacing="1.6" text-anchor="middle">FOUNDRY 180</text>
  </g>`;
}

/** The pointer itself, so a ring frame shows what the ring is anchored to. */
export function pointer(x, y) {
  return `<g transform="translate(${x} ${y})">
    <path d="M 0 -9 L 0 9 M -9 0 L 9 0" stroke="${TEXT.bright}" stroke-width="1.2" stroke-opacity="0.75"/>
    <circle cx="0" cy="0" r="3.5" fill="none" stroke="${TEXT.bright}" stroke-width="1.2" stroke-opacity="0.75"/>
  </g>`;
}

export function world(state = 'rest') {
  return `<svg class="world" viewBox="0 0 1920 1080" width="1920" height="1080" aria-hidden="true" focusable="false">
    ${defs()}
    <rect x="0" y="0" width="1920" height="1080" fill="url(#column)"/>
    <path d="M 0 432 L 286 372 L 560 402 L 848 348 L 1140 390 L 1428 342 L 1716 384 L 1920 356 L 1920 470 L 0 470 Z" fill="#060d14" fill-opacity="0.9"/>
    ${ground()}
    ${veil()}
    ${marks()}
    ${ownForce(state)}
    ${state === 'orders' ? orderExtras() : ''}
    ${state === 'build' ? buildExtras() : ''}
    ${contacts()}
  </svg>`;
}
