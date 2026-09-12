/**
 * Design A — the ring.
 *
 * Right-hold on the mouse, long-press on glass, and a ring of wedges opens
 * around the pointer carrying whatever the current selection can do. Release on
 * a wedge commits; release on the dead centre cancels. There is no command bar
 * at all: the bottom of the screen is water.
 *
 * The bet is that the command set is small enough to be *summoned* rather than
 * resident, and that one gesture can serve a mouse and a finger without a mode
 * switch. The cost is written on the canvas: §2 says the centre 60% is always
 * clear, and this opens in it.
 */

import { BLACK, FONT, NEON, TEXT } from './tokens.mjs';
import {
  logRows,
  logHeight,
  objectiveRows,
  objHeight,
  plate,
  scopeFace,
  sigMeter,
  depthRibbon,
} from './chrome.mjs';
import { world, pointer, CURSOR } from './world.mjs';

const R_IN = 54;
const R_OUT = 170;
const R_LABEL = 116;
const R_KEY = 148;

function sector(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r1} ${r1} 0 ${big} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} A ${r0} ${r0} 0 ${big} 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z`;
}

/**
 * One ring. Wedges run clockwise from the top, which is where the pointer
 * leaves from and therefore the cheapest wedge to reach.
 *
 * At the label radius a 45° wedge is 2πr/8 ≈ 91 px of arc — twice the 44 px
 * touch floor, and the reason the same ring serves both pointers unchanged.
 */
function ring(cx, cy, items, { hovered = -1, centre = [], centreInk = TEXT.cyan } = {}) {
  const n = items.length;
  const step = (Math.PI * 2) / n;
  const start = -Math.PI / 2 - step / 2;
  const wedges = items
    .map((it, i) => {
      const a0 = start + i * step + 0.012;
      const a1 = start + (i + 1) * step - 0.012;
      const mid = (a0 + a1) / 2;
      const on = i === hovered;
      const off = it.off === true;
      const ink = off ? TEXT.dim : on ? NEON.cyan : 'rgba(53,224,255,0.42)';
      const fill = on ? 'rgba(53,224,255,0.16)' : 'rgba(13,28,40,0.9)';
      const lx = cx + R_LABEL * Math.cos(mid);
      const ly = cy + R_LABEL * Math.sin(mid);
      const kx = cx + R_KEY * Math.cos(mid);
      const ky = cy + R_KEY * Math.sin(mid);
      return `
      <path d="${sector(cx, cy, R_IN, R_OUT, a0, a1)}" fill="${fill}" stroke="${ink}" stroke-width="${on ? 1.8 : 1}" opacity="${off ? 0.42 : 1}"${on ? ` filter="url(#wedgeGlow)"` : ''}/>
      <text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-family="${FONT.data}" font-size="12.5" letter-spacing="1.3" fill="${off ? TEXT.dim : on ? '#eafaff' : TEXT.bright}" opacity="${off ? 0.55 : 1}">${it.label}</text>
      ${it.cost ? `<text x="${lx.toFixed(1)}" y="${(ly + 19).toFixed(1)}" text-anchor="middle" font-family="${FONT.data}" font-size="10" letter-spacing="0.8" fill="${off ? NEON.red : NEON.amber}" opacity="${off ? 0.7 : 0.95}">${it.cost}</text>` : ''}
      <text x="${kx.toFixed(1)}" y="${(ky + 3).toFixed(1)}" text-anchor="middle" font-family="${FONT.data}" font-size="9" letter-spacing="0.6" fill="${TEXT.dim}">${it.key}</text>`;
    })
    .join('');

  const centreText = centre
    .map(
      (t, i) =>
        `<text x="${cx}" y="${cy - (centre.length - 1) * 7 + i * 14}" text-anchor="middle" font-family="${FONT.data}" font-size="${i === 0 ? 11 : 9.5}" letter-spacing="${i === 0 ? 1.2 : 0.8}" fill="${i === 0 ? centreInk : TEXT.dim}">${t}</text>`
    )
    .join('');

  return `<svg class="ring" viewBox="0 0 1920 1080" width="1920" height="1080" aria-hidden="true" focusable="false">
    <defs>
      <filter id="wedgeGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="5" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <radialGradient id="ringShade">
        <stop offset="0" stop-color="#03080e" stop-opacity="0.62"/>
        <stop offset="1" stop-color="#03080e" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="${R_OUT + 74}" fill="url(#ringShade)"/>
    ${wedges}
    <circle cx="${cx}" cy="${cy}" r="${R_IN}" fill="rgba(3,8,14,0.92)" stroke="${NEON.magenta}" stroke-width="1.2" stroke-opacity="0.7"/>
    ${centreText}
  </svg>`;
}

/** §6's preview, drawn because the wedge under the pointer is PING. */
function pingPreview() {
  return `<svg class="ring" viewBox="0 0 1920 1080" width="1920" height="1080" aria-hidden="true" focusable="false">
    <ellipse cx="884" cy="706" rx="196" ry="91" fill="none" stroke="${NEON.cyan}" stroke-width="1.6" stroke-opacity="0.8"/>
    <ellipse cx="884" cy="706" rx="522" ry="242" fill="none" stroke="${NEON.red}" stroke-width="1.8" stroke-opacity="0.85"/>
    <ellipse cx="884" cy="706" rx="522" ry="242" fill="${NEON.red}" fill-opacity="0.04"/>
    <text x="884" y="446" text-anchor="middle" font-family="${FONT.data}" font-size="12" letter-spacing="1.6" fill="${NEON.red}">2,400 m SELF-REVEAL  ·  3 CONTACTS INSIDE</text>
  </svg>`;
}

/** Resident chrome: own loudness, the ribbon, the scope, the log, the panel. */
function resident({ hint }) {
  const strip = `
  <div class="plate" style="left:0;right:0;top:0;height:46px;border-radius:0;border-left:0;border-right:0;border-top:0">
    <div class="row" style="gap:20px;padding:0 14px;height:45px;align-items:center;font-size:12px;letter-spacing:0.1em">
      <span><span class="lbl">NOD</span> <span style="color:${NEON.amber}">600</span></span>
      <span><span class="lbl">CRY</span> <span>0</span></span>
      <span><span class="lbl">BERTH</span> <span>6/8</span></span>
      <span style="width:1px;height:18px;background:rgba(255,61,166,0.35)"></span>
      <div style="transform:scale(0.82);transform-origin:left center">${sigMeter({ value: 42, w: 200 })}</div>
      <span class="dim" style="font-size:10px;letter-spacing:0.14em">DRIVE HUM</span>
      <span style="flex:1 1 auto"></span>
      <span style="font-size:10px;letter-spacing:0.14em;color:${NEON.red}">TRACKED ×1</span>
      <span class="dim" style="font-size:10px;letter-spacing:0.14em">THE VENTFRONT DIVIDE</span>
      <span class="cyan" style="font-size:12px;letter-spacing:0.14em">T+06:12</span>
    </div>
  </div>`;

  const logTop = 60;
  const logH = logHeight(6);
  const log = plate(
    `right:14px;top:${logTop}px;width:352px;height:${logH}px;overflow:hidden;`,
    logRows(6),
    { title: 'Contact Log', sub: '4 HEARD' }
  );
  const obj = plate(
    `right:14px;top:${logTop + logH + 12}px;width:352px;height:${objHeight(3)}px;overflow:hidden;`,
    objectiveRows(),
    { title: 'The Sorrowgate', sub: 'T+06:12' }
  );
  const scope = plate(
    'left:14px;bottom:14px;width:204px;',
    `<div style="padding:6px;line-height:0">${scopeFace(190)}</div>`,
    { title: 'Scope' }
  );

  const sel = plate(
    'left:240px;bottom:14px;width:396px;',
    `<div class="row" style="padding:7px 10px;gap:12px;align-items:center">
       <div class="col" style="gap:3px;flex:1 1 auto;text-align:left">
         <div class="row" style="gap:8px;align-items:baseline">
           <span style="font-family:${FONT.display};font-weight:600;font-size:16px;letter-spacing:0.09em;color:${NEON.cyan}">2 × CORVETTE</span>
           <span class="lbl" style="border:1px solid ${TEXT.dim};border-radius:2px;padding:0 4px">PR2</span>
         </div>
         <div style="height:4px;background:rgba(3,8,14,0.8)"><div style="width:88%;height:4px;background:${NEON.teal}"></div></div>
         <div class="lbl" style="letter-spacing:0.1em;white-space:nowrap">HULL 742/840 · SIG 28 · 640 m · SYSTEMS LIVE</div>
       </div>
     </div>`,
    { cls: 'quiet' }
  );

  return `${strip}${depthRibbon({ top: 72, height: 600 })}${log}${obj}${scope}${sel}
  <div style="position:absolute;left:50%;bottom:26px;transform:translateX(-50%);font-size:11px;letter-spacing:0.18em;color:${TEXT.dim};text-align:center">${hint}</div>`;
}

const ORDER_ITEMS = [
  { label: 'MOVE', key: 'RMB' },
  { label: 'ATTACK', key: 'W' },
  { label: 'PING', key: 'P' },
  { label: 'DIVE', key: 'D' },
  { label: 'MINE', key: 'M', cost: '40' },
  { label: 'DECOY', key: 'N', cost: '25' },
  { label: 'HOLD', key: 'H' },
  { label: 'SILENT', key: 'SPC' },
];

const BUILD_ITEMS = [
  { label: 'HARVESTER', key: '1', cost: '120' },
  { label: 'CORVETTE', key: '2', cost: '260' },
  { label: 'SUBMERSIBLE', key: '3', cost: '260+80c', off: true },
  { label: 'CRUISER', key: '4', cost: '520', off: true },
  { label: 'TURRET', key: 'T', cost: '90' },
  { label: 'FOUNDRY', key: 'F', cost: '180' },
  { label: 'REFINERY', key: 'R', cost: '140' },
  { label: 'RALLY', key: 'G' },
];

export function ringRest() {
  return `<div class="frame">
    ${world('rest')}
    <div class="hud">${resident({ hint: 'HOLD RMB — OR PRESS AND HOLD — FOR ORDERS' })}</div>
  </div>`;
}

export function ringOrders() {
  const c = CURSOR.orders;
  return `<div class="frame">
    ${world('orders')}
    ${pingPreview()}
    <div class="hud">${resident({ hint: 'RELEASE ON A WEDGE TO COMMIT  ·  RELEASE IN THE CENTRE TO CANCEL' })}</div>
    ${ring(c.x, c.y, ORDER_ITEMS, {
      hovered: 2,
      centre: ['2 CORVETTE', 'SIG 28 → 95', 'release here: cancel'],
      centreInk: NEON.red,
    })}
    <svg class="ring" viewBox="0 0 1920 1080" width="1920" height="1080" aria-hidden="true" focusable="false">${pointer(c.x, c.y)}</svg>
  </div>`;
}

export function ringBuild() {
  const c = CURSOR.build;
  return `<div class="frame">
    ${world('build')}
    <div class="hud">${resident({ hint: 'RING OPENED ON THE BASTION  ·  GREYED WEDGES CARRY THEIR REASON' })}</div>
    ${ring(c.x, c.y, BUILD_ITEMS, {
      hovered: 1,
      centre: ['BASTION', 'line 1 of 2 free', 'queue: HARVESTER 14s'],
    })}
    <svg class="ring" viewBox="0 0 1920 1080" width="1920" height="1080" aria-hidden="true" focusable="false">${pointer(c.x, c.y)}</svg>
    <div style="position:absolute;left:${c.x + 190}px;top:${c.y - 30}px;font-size:11px;letter-spacing:0.12em;color:${NEON.red};background:rgba(3,8,14,0.8);padding:3px 8px;border-left:2px solid ${NEON.red}">Abyssal Submersible: 80 crystal short</div>
  </div>`;
}

export const RING_CSS = `
  .ring { position: absolute; inset: 0; z-index: 30; display: block; }
`;
