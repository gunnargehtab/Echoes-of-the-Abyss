/**
 * The chrome every design shares, and the CSS all ten frames are cut from.
 *
 * The card anatomy here is docs/style-neon-noir.md "UI chrome — the plate VI
 * card", implemented rather than paraphrased: glass at 86%, a 1px magenta bevel
 * with one halo, a cyan header band over a thin rule, corner registration ticks
 * instead of a radius, and one diagonal scanline over the whole HUD layer. The
 * live client draws hairline boxes instead, which is most of what "underwhelming"
 * turned out to mean.
 */

import { BLACK, FONT, GLYPH, NEON, SIG, TEXT, TIER } from './tokens.mjs';

export const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; background: ${BLACK.void}; }
  a { color: ${NEON.cyan}; text-decoration: none; }
  a:hover { color: ${NEON.magenta}; }

  .frame {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: ${BLACK.void}; font-family: ${FONT.data};
    color: ${TEXT.bright}; -webkit-font-smoothing: antialiased;
  }
  .world { position: absolute; inset: 0; display: block; }

  /* One texture for everything, never per-panel — style-neon-noir.md, rule 5. */
  .grain {
    position: absolute; inset: 0; pointer-events: none; z-index: 40;
    background-image: repeating-linear-gradient(
      135deg, rgba(214,230,240,0.055) 0 1px, rgba(0,0,0,0) 1px 4px);
    opacity: 0.6; mix-blend-mode: overlay;
  }
  .hud { position: absolute; inset: 0; z-index: 20; }

  /* --- the plate VI card -------------------------------------------------- */
  .plate {
    position: absolute; background: rgba(13,28,40,0.86);
    border: 1px solid rgba(255,61,166,0.55); border-radius: 4px;
    box-shadow: 0 0 10px rgba(255,61,166,0.28), inset 0 0 22px rgba(3,8,14,0.6);
    backdrop-filter: blur(2px);
  }
  .plate.quiet { border-color: rgba(255,61,166,0.22); box-shadow: inset 0 0 22px rgba(3,8,14,0.6); }
  .plate > .tick { position: absolute; width: 7px; height: 7px; pointer-events: none;
    border-color: ${NEON.magenta}; opacity: 0.9; }
  .tick.tl { top: -1px; left: -1px; border-top: 1px solid; border-left: 1px solid; }
  .tick.tr { top: -1px; right: -1px; border-top: 1px solid; border-right: 1px solid; }
  .tick.bl { bottom: -1px; left: -1px; border-bottom: 1px solid; border-left: 1px solid; }
  .tick.br { bottom: -1px; right: -1px; border-bottom: 1px solid; border-right: 1px solid; }

  .head {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 5px 9px 4px; font-family: ${FONT.display}; font-weight: 600;
    font-size: 15px; letter-spacing: 0.16em; text-transform: uppercase;
    color: ${TEXT.cyan}; text-shadow: 0 0 9px rgba(53,224,255,0.45);
    border-bottom: 1px solid rgba(255,61,166,0.3);
  }
  .head .sub { font-family: ${FONT.data}; font-size: 10px; font-weight: 400;
    letter-spacing: 0.14em; color: ${TEXT.dim}; text-shadow: none; }

  /* --- the data voice ----------------------------------------------------- */
  .mono { font-family: ${FONT.data}; letter-spacing: 0.13em; }
  .dim { color: ${TEXT.dim}; }
  .cyan { color: ${TEXT.cyan}; }
  .lbl { font-size: 10px; letter-spacing: 0.16em; color: ${TEXT.dim}; text-transform: uppercase; }
  .val { font-size: 13px; letter-spacing: 0.1em; color: ${TEXT.bright}; }
  .glow-c { text-shadow: 0 0 9px rgba(53,224,255,0.5); }

  /* --- buttons ------------------------------------------------------------ */
  .btn {
    position: relative; display: flex; flex-direction: column; justify-content: center;
    gap: 2px; padding: 6px 10px; min-height: 44px;
    background: rgba(10,20,36,0.9); border: 1px solid rgba(53,224,255,0.3);
    border-radius: 3px; color: ${TEXT.bright}; font-family: ${FONT.data};
    font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase;
  }
  .btn .key { position: absolute; top: 3px; right: 5px; font-size: 9px;
    color: ${TEXT.dim}; letter-spacing: 0.08em; }
  .btn .cost { font-size: 10px; letter-spacing: 0.1em; color: ${NEON.amber}; }
  .btn.on { border-color: ${NEON.cyan}; background: rgba(53,224,255,0.13);
    box-shadow: 0 0 12px rgba(53,224,255,0.3), inset 0 0 14px rgba(53,224,255,0.08);
    color: #eafaff; }
  .btn.armed { border-color: ${NEON.magenta}; box-shadow: 0 0 12px rgba(255,61,166,0.35); }
  /* Disabled is desaturated and dimmed to 40%, never greyed: a dead console
     still has phosphor in it — style-neon-noir.md, rule 6. */
  .btn.off { opacity: 0.4; filter: saturate(0.35); }
  .btn.off .cost { color: ${NEON.red}; }

  .row { display: flex; align-items: center; }
  .col { display: flex; flex-direction: column; }
  /* One revolution per 4 s — EchoRenderer's SCOPE_SWEEP_MS, and deliberately
     out of phase with the 5 Hz Echo tick so nobody reads the sweep as what
     finds things. §11 owes a static equivalent, so it takes the media query. */
  .sweep { animation: sweep 4s linear infinite; }
  @keyframes sweep { to { transform: rotate(360deg); } }
  .breathe { animation: breathe 3.2s ease-in-out infinite; }
  @keyframes breathe { 0%, 100% { opacity: 0.72; } 50% { opacity: 1; } }
  .phosphor { animation: phosphor 2.6s ease-out infinite; }
  @keyframes phosphor { 0% { opacity: 1; } 70%, 100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) {
    .sweep, .breathe, .phosphor { animation: none; }
  }
`;

/** A plate VI card: glass, bevel, halo, corner ticks, optional cyan header. */
export function plate(style, inner, { title, sub, cls = '' } = {}) {
  const head = title
    ? `<div class="head">${title}${sub ? `<span class="sub">${sub}</span>` : ''}</div>`
    : '';
  return `<div class="plate ${cls}" style="${style}">
    <i class="tick tl"></i><i class="tick tr"></i><i class="tick bl"></i><i class="tick br"></i>
    ${head}${inner}
  </div>`;
}

/**
 * §3's meter, to spec: peak SIG rather than average, zero-padded so the digit
 * count never shifts, hard colour stops, the firing spike as a lighter overlay,
 * and the second line that predicts trouble.
 */
export function sigMeter({ value = 42, spike = 0, w = 240, big = false } = {}) {
  const ink = value < 30 ? SIG.low : value < 65 ? SIG.mid : SIG.high;
  const pad = String(value).padStart(3, '0');
  const h = big ? 16 : 12;
  const stops = [30, 65]
    .map(
      (s) =>
        `<div style="position:absolute;left:${s}%;top:0;width:1px;height:${h}px;background:rgba(214,230,240,0.35)"></div>`
    )
    .join('');
  return `<div class="col" style="gap:4px">
    <div class="row" style="gap:10px;align-items:baseline">
      <span class="lbl">SIG</span>
      <span style="font-family:${FONT.data};font-size:${big ? 30 : 17}px;letter-spacing:0.07em;color:${ink};text-shadow:0 0 12px ${ink}66;line-height:1">${pad}</span>
      <span class="dim" style="font-size:${big ? 13 : 11}px;letter-spacing:0.1em">/ 100</span>
    </div>
    <div style="position:relative;width:${w}px;height:${h}px;background:rgba(3,8,14,0.85);border:1px solid rgba(214,230,240,0.16)">
      <div style="position:absolute;inset:0;width:${value}%;background:${ink};box-shadow:0 0 14px ${ink}88"></div>
      ${spike ? `<div style="position:absolute;top:0;bottom:0;left:${value}%;width:${spike}%;background:#eafaff;opacity:0.55"></div>` : ''}
      ${stops}
    </div>
  </div>`;
}

/**
 * §8's ribbon: three bands, the 400 m and 1,800 m hairlines in chrome magenta,
 * the thermocline and its duct in passive cyan because it is a different rule,
 * the Lid's threat hatch at the top, and a marker per selected hull.
 */
export function depthRibbon({ x = 12, top = 62, height = 660, w = 14, plated = false } = {}) {
  const band = (a, b, fill) =>
    `<div style="position:absolute;left:0;right:0;top:${a}%;height:${b - a}%;background:${fill}"></div>`;
  const hair = (p) =>
    `<div style="position:absolute;left:0;right:0;top:${p}%;height:1px;background:${NEON.magenta};opacity:0.7"></div>`;
  const label = (p, t, ink) =>
    `<div style="position:absolute;left:${w + 6}px;top:calc(${p}% - 6px);font-size:9px;letter-spacing:0.16em;color:${ink}">${t}</div>`;
  const strip = `
    <div style="position:absolute;left:${x}px;top:${top}px;width:${w}px;height:${height}px;background:rgba(13,28,40,0.88);border:1px solid rgba(255,61,166,${plated ? 0.45 : 0.22})">
      ${band(0, 5, `repeating-linear-gradient(135deg, ${NEON.red}55 0 2px, transparent 2px 6px)`)}
      ${band(5, 13.3, 'rgba(95,208,192,0.07)')}
      ${band(13.3, 60, 'rgba(53,224,255,0.05)')}
      ${band(60, 100, 'rgba(139,92,246,0.07)')}
      ${band(38, 44.7, `${NEON.cyan}22`)}
      <div style="position:absolute;left:0;right:0;top:40%;height:1px;background:${NEON.cyan};opacity:0.85"></div>
      ${hair(13.3)}${hair(60)}
      <div style="position:absolute;left:-4px;right:-4px;top:34%;height:2px;background:${NEON.teal};box-shadow:0 0 8px ${NEON.teal}"></div>
      <div style="position:absolute;left:-2px;right:-2px;top:47%;height:2px;background:${NEON.teal};opacity:0.4"></div>
    </div>`;
  const labels = `
    <div style="position:absolute;left:${x}px;top:${top}px;width:200px;height:${height}px;pointer-events:none">
      ${label(5, 'LID', NEON.red)}${label(13.3, 'SHELF', TEXT.dim)}
      ${label(40, 'DUCT', TEXT.cyan)}${label(60, 'MID', TEXT.dim)}
      ${label(96, 'ABYSS', TEXT.dim)}
    </div>
    <div style="position:absolute;left:${x}px;top:${top + height + 6}px;font-size:10px;letter-spacing:0.14em;color:${TEXT.cyan}">640m</div>`;
  return strip + labels;
}

/**
 * §5's scope: a scope, not a map. Returns are sized *inversely* to tier, the
 * sweep is out of phase with the 5 Hz tick, both ping radii are permanently
 * labelled, and residue sits under everything the player earned.
 */
export function scopeFace(size) {
  const c = size / 2;
  const ret = (x, y, r, ink, a) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${ink}" fill-opacity="${a}"/>`;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true" focusable="false">
    <rect x="0" y="0" width="${size}" height="${size}" fill="#061019"/>
    <rect x="0" y="${size * 0.42}" width="${size}" height="${size * 0.34}" fill="#0a1e18" fill-opacity="0.85"/>
    <rect x="${size * 0.58}" y="0" width="${size * 0.42}" height="${size * 0.4}" fill="#1a132a" fill-opacity="0.6"/>
    <rect x="0" y="${size * 0.78}" width="${size * 0.4}" height="${size * 0.22}" fill="#2c130a" fill-opacity="0.5"/>
    <circle cx="${c}" cy="${c}" r="${size * 0.2}" fill="none" stroke="${NEON.cyan}" stroke-opacity="0.3" stroke-width="1"/>
    <circle cx="${c}" cy="${c}" r="${size * 0.42}" fill="none" stroke="${NEON.red}" stroke-opacity="0.32" stroke-width="1"/>
    <text x="${c + 3}" y="${c - size * 0.2 - 3}" fill="${TEXT.dim}" font-family="ui-monospace, Consolas, monospace" font-size="7.5" letter-spacing="0.6">900m</text>
    <text x="${c + 3}" y="${c - size * 0.42 + 9}" fill="${TEXT.dim}" font-family="ui-monospace, Consolas, monospace" font-size="7.5" letter-spacing="0.6">2400m</text>
    <circle cx="${size * 0.24}" cy="${size * 0.72}" r="${size * 0.09}" fill="${TIER[1].ink}" fill-opacity="0.12"/>
    <g class="sweep" style="transform-origin:${c}px ${c}px">
      <path d="M ${c} ${c} L ${c + size * 0.44} ${c - size * 0.17} A ${size * 0.47} ${size * 0.47} 0 0 0 ${c + size * 0.4} ${c - size * 0.26} Z" fill="${NEON.cyan}" fill-opacity="0.09"/>
      <line x1="${c}" y1="${c}" x2="${c + size * 0.44}" y2="${c - size * 0.17}" stroke="${NEON.cyan}" stroke-opacity="0.42" stroke-width="1"/>
    </g>
    ${ret(size * 0.78, size * 0.2, 7, TIER[1].ink, 0.2)}
    ${ret(size * 0.62, size * 0.3, 4.5, TIER[2].ink, 0.34)}
    ${ret(size * 0.82, size * 0.56, 2.5, '#c9a6ff', 0.6)}
    ${ret(size * 0.55, size * 0.19, 2, TIER[4].ink, 0.9)}
    <g fill="${NEON.amber}">
      <circle cx="${c - 4}" cy="${c + 2}" r="2"/><circle cx="${c + 3}" cy="${c + 6}" r="2"/>
      <circle cx="${c - 10}" cy="${c - 6}" r="2"/><circle cx="${size * 0.68}" cy="${size * 0.62}" r="2"/>
    </g>
    <rect x="${size * 0.3}" y="${size * 0.34}" width="${size * 0.44}" height="${size * 0.3}" fill="none" stroke="${TEXT.dim}" stroke-opacity="0.45" stroke-width="1"/>
  </svg>`;
}

/** §10's feed. DOM in the client, so it is DOM here: rows, not canvas text. */
export const LOG_ROWS = [
  ['T+06:12', 'TIER 1', 'contact', 'bearing unknown', TIER[1].ink, 0.75],
  ['T+06:09', 'TIER 3', '~3 Hadron Knights', '118°  ~2,100m', '#c9a6ff', 1],
  ['T+06:07', '---', 'you were pinged', '070°', NEON.red, 1],
  ['T+05:58', 'TIER 4', 'Chorister', '302°  1,180m', TIER[4].ink, 1],
  ['T+05:51', 'MARK', 'industrial hum', 'decaying', TIER[1].ink, 0.6],
  ['T+05:44', '---', 'Harvester idle', 'mined out', NEON.amber, 0.9],
  ['T+05:30', 'TIER 2', 'contact', '245°  ~1,400m', TIER[2].ink, 0.85],
];

/** Exactly 20 px a row, so a panel's height is arithmetic rather than a guess. */
export const LOG_ROW_H = 20;
export const HEAD_H = 26;
export function logHeight(rows) {
  return HEAD_H + rows * LOG_ROW_H + 4;
}

export function logRows(limit = 7, fontSize = 10) {
  return LOG_ROWS.slice(0, limit)
    .map(
      ([t, tier, what, detail, ink, op]) => `
      <div class="row" style="gap:8px;height:${LOG_ROW_H}px;padding:0 9px;font-size:${fontSize}px;letter-spacing:0.06em;opacity:${op};border-bottom:1px solid rgba(214,230,240,0.04);white-space:nowrap">
        <span class="dim" style="opacity:0.55;flex:0 0 46px">${t}</span>
        <span style="flex:0 0 40px;color:${ink}">${tier}</span>
        <span style="flex:1 1 auto;color:${TEXT.bright};overflow:hidden;text-overflow:ellipsis;text-align:left">${what}</span>
        <span class="dim" style="flex:0 0 auto;text-align:right">${detail}</span>
      </div>`
    )
    .join('');
}

/** §10.5: authored per mission, rendered verbatim, own force only. */
export const OBJ_ROW_H = 34;
export function objHeight(rows) {
  return HEAD_H + rows * OBJ_ROW_H + 6;
}

export function objectiveRows(fontSize = 10.5) {
  const rows = [
    ['MET', 'Bring both tenders through the service lock.', NEON.teal],
    ['LIVE', 'The flight stays under twenty.', TEXT.cyan],
    ['PENDING', 'Leave the Concourse standing when you go.', TEXT.dim],
  ];
  return rows
    .map(
      ([state, text, ink]) => `
      <div class="row" style="gap:10px;height:${OBJ_ROW_H}px;padding:0 9px;font-size:${fontSize}px;letter-spacing:0.07em;align-items:center">
        <span style="flex:0 0 56px;color:${ink};font-size:${fontSize - 1}px;letter-spacing:0.14em">${state}</span>
        <span style="flex:1 1 auto;color:${state === 'PENDING' ? TEXT.dim : TEXT.bright};text-align:left;line-height:1.3">${text}</span>
      </div>`
    )
    .join('');
}

export function glyphSvg(faction, size, ink) {
  return `<svg width="${size}" height="${size}" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false"><path d="${GLYPH[faction]}" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}

/** The wrapper every artboard is cut from. Static: no holes, so no logic class. */
export function artboard(body, extraCss = '') {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@400;600;700&amp;display=swap">
  <style>${CSS}${extraCss}</style>
</helmet>
${body}
</x-dc>
</body>
</html>
`;
}
