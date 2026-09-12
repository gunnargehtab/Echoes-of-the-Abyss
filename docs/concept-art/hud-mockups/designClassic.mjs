/**
 * Design B — the classical console.
 *
 * The genre's oldest answer: one full-width console across the foot of the
 * screen, divided into fixed blocks that never move. Scope, then the selection
 * with its stat block, then the group roster, then a 4×3 command card whose
 * twelve cells are always in the same twelve places, then the production line.
 *
 * Its whole argument is muscle memory and permanence. Nothing is behind a tab,
 * so "production is buried" cannot happen; the price is screen, and it is a
 * large price — this console and its strip take about 30% of a 1080p frame
 * against §2's 22% cap.
 */

import { BLACK, FONT, NEON, TEXT, FACTION } from './tokens.mjs';
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
import { world } from './world.mjs';

const CONSOLE_TOP = 844;
const AMBER = FACTION.bathyarch.primary;

function topStrip() {
  return `
  <div class="plate" style="left:0;right:0;top:0;height:54px;border-radius:0;border-left:0;border-right:0;border-top:0">
    <div class="row" style="gap:22px;padding:0 16px;height:53px;align-items:center;font-size:13px;letter-spacing:0.1em">
      <span><span class="lbl">NODULES</span> <span style="color:${NEON.amber};font-size:15px">600</span></span>
      <span><span class="lbl">CRYSTAL</span> <span style="color:#b98cff;font-size:15px">0</span></span>
      <span><span class="lbl">BIOMASS</span> <span class="dim" style="font-size:15px">—</span></span>
      <span><span class="lbl">BERTHS</span> <span style="font-size:15px">6/8</span></span>
      <span style="width:1px;height:22px;background:rgba(255,61,166,0.35)"></span>
      <div style="transform:scale(0.88);transform-origin:left center">${sigMeter({ value: 42, w: 220 })}</div>
      <span class="lbl" style="align-self:flex-end;padding-bottom:4px">3 UNITS · 1 LOUD · DRIVE HUM</span>
      <span style="flex:1 1 auto"></span>
      <span style="font-size:10px;letter-spacing:0.14em;color:${NEON.red}">TRACKED ×1</span>
      <span class="dim" style="font-size:11px;letter-spacing:0.14em">THE VENTFRONT DIVIDE</span>
      <span class="cyan" style="font-size:14px;letter-spacing:0.14em">T+06:12</span>
    </div>
  </div>`;
}

/** A console block: its own bezel inside the console's, with a cyan cap. */
function block(x, w, title, inner, { sub = '' } = {}) {
  return `<div style="position:absolute;left:${x}px;top:10px;width:${w}px;bottom:10px;background:rgba(7,14,26,0.82);border:1px solid rgba(255,61,166,0.3);border-radius:3px;overflow:hidden">
    <div class="row" style="justify-content:space-between;padding:4px 8px 3px;border-bottom:1px solid rgba(255,61,166,0.24);font-family:${FONT.display};font-weight:600;font-size:13px;letter-spacing:0.17em;text-transform:uppercase;color:${TEXT.cyan};text-shadow:0 0 8px rgba(53,224,255,0.4)">
      <span>${title}</span><span class="sub" style="font-family:${FONT.data};font-size:9.5px;font-weight:400;letter-spacing:0.12em;color:${TEXT.dim};text-shadow:none">${sub}</span>
    </div>
    ${inner}
  </div>`;
}

/** The command card: twelve cells, always the same twelve places. */
function commandCard(cells) {
  const cell = (c) => {
    if (!c)
      return `<div style="border:1px solid rgba(214,230,240,0.06);border-radius:2px;background:rgba(3,8,14,0.35)"></div>`;
    const on = c.on;
    const off = c.off;
    return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:1px solid ${on ? NEON.cyan : off ? 'rgba(214,230,240,0.14)' : 'rgba(53,224,255,0.32)'};border-radius:2px;background:${on ? 'rgba(53,224,255,0.14)' : 'rgba(10,20,36,0.85)'};${on ? `box-shadow:0 0 12px rgba(53,224,255,0.3)` : ''};opacity:${off ? 0.4 : 1};filter:${off ? 'saturate(0.35)' : 'none'}">
      <span style="position:absolute;top:2px;right:4px;font-size:9px;color:${TEXT.dim};letter-spacing:0.06em">${c.key}</span>
      <span style="font-size:11.5px;letter-spacing:0.1em;color:${on ? '#eafaff' : TEXT.bright};text-align:center;line-height:1.15;padding:0 3px">${c.label}</span>
      ${c.cost ? `<span style="font-size:9.5px;letter-spacing:0.06em;color:${off ? NEON.red : NEON.amber}">${c.cost}</span>` : ''}
    </div>`;
  };
  return `<div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));grid-template-rows:repeat(3, minmax(0, 1fr));gap:5px;padding:7px;height:calc(100% - 25px)">
    ${Array.from({ length: 12 }, (_, i) => cell(cells[i])).join('')}
  </div>`;
}

/** The selection block: a wireframe plan view, then the numbers under it. */
function selectionBlock(name, lines, { badge = 'PR2', hull = 0.88, lost = 0.08 } = {}) {
  return `<div class="row" style="gap:10px;padding:8px;height:calc(100% - 25px);align-items:stretch">
    <div style="flex:0 0 96px;border:1px solid rgba(53,224,255,0.22);border-radius:2px;background:rgba(3,8,14,0.6);display:flex;align-items:center;justify-content:center">
      <svg width="86" height="86" viewBox="-44 -44 88 88" aria-hidden="true" focusable="false">
        <circle cx="0" cy="0" r="40" fill="none" stroke="${NEON.cyan}" stroke-opacity="0.14" stroke-width="1"/>
        <circle cx="0" cy="0" r="27" fill="none" stroke="${NEON.cyan}" stroke-opacity="0.1" stroke-width="1"/>
        <g transform="scale(1.9)">
          <path d="M -17 0 L -9 -5 L 12 -5 L 19 0 L 12 5 L -9 5 Z" fill="none" stroke="${AMBER}" stroke-width="1"/>
          <path d="M -4 -5 L 3 -5 L 3 -9 L -2 -9 Z" fill="none" stroke="${AMBER}" stroke-width="0.8"/>
        </g>
      </svg>
    </div>
    <div class="col" style="flex:1 1 auto;gap:5px;text-align:left">
      <div class="row" style="justify-content:space-between;align-items:baseline">
        <span style="font-family:${FONT.display};font-weight:600;font-size:19px;letter-spacing:0.09em;color:${NEON.cyan};text-shadow:0 0 10px rgba(53,224,255,0.4)">${name}</span>
        <span class="lbl" style="border:1px solid ${TEXT.dim};border-radius:2px;padding:1px 5px">${badge}</span>
      </div>
      <div style="position:relative;height:7px;background:rgba(3,8,14,0.85);border:1px solid rgba(214,230,240,0.12)">
        <div style="position:absolute;inset:0;width:${hull * 100}%;background:${NEON.teal}"></div>
        <div style="position:absolute;top:0;bottom:0;right:0;width:${lost * 100}%;background:repeating-linear-gradient(135deg, ${NEON.red}99 0 2px, transparent 2px 5px)"></div>
      </div>
      ${lines.map((l) => `<div style="font-size:11px;letter-spacing:0.07em;color:${TEXT.dim};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l}</div>`).join('')}
    </div>
  </div>`;
}

/** The roster: every selected hull as its own chip, so a group is countable. */
function roster(chips) {
  const chip = (c) =>
    c
      ? `<div style="position:relative;border:1px solid ${c.hurt ? NEON.red : 'rgba(53,224,255,0.3)'};border-radius:2px;background:rgba(10,20,36,0.8);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px">
          <span style="font-size:9.5px;letter-spacing:0.08em;color:${TEXT.bright}">${c.label}</span>
          <div style="width:78%;height:3px;background:rgba(3,8,14,0.8)"><div style="width:${c.hp}%;height:3px;background:${c.hurt ? NEON.red : NEON.teal}"></div></div>
          ${c.silent ? `<span style="position:absolute;top:2px;right:3px;font-size:8px;color:${NEON.teal}">S</span>` : ''}
        </div>`
      : `<div style="border:1px solid rgba(214,230,240,0.05);border-radius:2px"></div>`;
  return `<div style="display:grid;grid-template-columns:repeat(5, minmax(0, 1fr));grid-template-rows:repeat(3, minmax(0, 1fr));gap:4px;padding:7px;height:calc(100% - 25px)">
    ${Array.from({ length: 15 }, (_, i) => chip(chips[i])).join('')}
  </div>`;
}

/** The production line: never behind a tab, which is the whole point. */
function production(lines) {
  const row = (l) => `
    <div class="col" style="gap:3px;padding:6px 9px;border-bottom:1px solid rgba(214,230,240,0.05);text-align:left">
      <div class="row" style="justify-content:space-between;align-items:baseline">
        <span style="font-size:11.5px;letter-spacing:0.1em;color:${TEXT.bright}">${l.yard}</span>
        <span class="lbl">${l.state}</span>
      </div>
      <div class="row" style="gap:6px;align-items:center">
        <div style="flex:1 1 auto;height:6px;background:rgba(3,8,14,0.85);border:1px solid rgba(214,230,240,0.1)">
          <div style="width:${l.pct}%;height:100%;background:${l.pct ? NEON.cyan : 'transparent'};box-shadow:${l.pct ? '0 0 10px rgba(53,224,255,0.5)' : 'none'}"></div>
        </div>
        <span style="flex:0 0 46px;font-size:10px;letter-spacing:0.08em;color:${l.pct ? TEXT.cyan : TEXT.dim};text-align:right">${l.eta}</span>
      </div>
      <div class="row" style="gap:4px">${l.queue
        .map(
          (q) =>
            `<span style="font-size:9px;letter-spacing:0.08em;color:${TEXT.dim};border:1px solid rgba(214,230,240,0.16);border-radius:2px;padding:1px 5px">${q}</span>`
        )
        .join('')}</div>
    </div>`;
  return `<div style="height:calc(100% - 25px);overflow:hidden">${lines.map(row).join('')}</div>`;
}

function consoleShell(inner) {
  return `<div class="plate" style="left:0;right:0;top:${CONSOLE_TOP}px;bottom:0;border-radius:0;border-left:0;border-right:0;border-bottom:0;background:rgba(7,14,26,0.93)">
    ${inner}
  </div>`;
}

function sideChrome() {
  return `
  ${depthRibbon({ top: 68, height: 736, plated: true })}
  ${plate(`right:14px;top:68px;width:352px;height:${logHeight(6)}px;overflow:hidden;`, logRows(6), { title: 'Contact Log', sub: '4 HEARD' })}
  ${plate(`right:14px;top:${68 + logHeight(6) + 12}px;width:352px;height:${objHeight(3)}px;overflow:hidden;`, objectiveRows(), { title: 'The Sorrowgate', sub: 'T+06:12' })}`;
}

const ORDER_CELLS = [
  { label: 'MOVE', key: 'RMB' },
  { label: 'ATK-MOVE', key: 'W' },
  { label: 'STOP', key: 'X' },
  { label: 'HOLD', key: 'H' },
  { label: 'SILENT', key: 'SPC', on: true },
  { label: 'PING', key: 'P' },
  { label: 'DIVE', key: 'D' },
  { label: 'RISE', key: 'A' },
  { label: 'FOLLOW', key: 'S' },
  { label: 'DECOY', key: 'N', cost: '25' },
  { label: 'MINE', key: 'M', cost: '40' },
  { label: 'CHARGE', key: 'C', cost: '60' },
];

const BASE_CELLS = [
  { label: 'REFINERY', key: 'R', cost: '140' },
  { label: 'FOUNDRY', key: 'F', cost: '180' },
  { label: 'TURRET', key: 'T', cost: '90' },
  { label: 'SPIRE', key: 'B', cost: '210' },
  null,
  null,
  null,
  null,
  { label: 'RALLY', key: 'G' },
  null,
  null,
  { label: 'MENU', key: 'ESC' },
];

const BUILD_CELLS = [
  { label: 'HARVESTER', key: '1', cost: '120' },
  { label: 'CORVETTE', key: '2', cost: '260' },
  { label: 'SUBMERSIBLE', key: '3', cost: '260+80c', off: true },
  { label: 'CRUISER', key: '4', cost: '520', off: true },
  { label: 'CHORISTER', key: '5', cost: '340', off: true },
  null,
  null,
  null,
  { label: 'HULL PLATE', key: '6', cost: '300' },
  { label: 'RALLY', key: 'G' },
  null,
  { label: 'CANCEL', key: 'ESC' },
];

const LINES_IDLE = [
  { yard: 'BASTION', state: 'IDLE', pct: 0, eta: '—', queue: ['line 1 free', 'line 2 free'] },
  { yard: 'FOUNDRY', state: 'IDLE', pct: 0, eta: '—', queue: ['line 1 free'] },
];
const LINES_BUSY = [
  { yard: 'BASTION', state: 'BUILDING', pct: 62, eta: '14s', queue: ['HARVESTER', 'CORVETTE'] },
  { yard: 'FOUNDRY', state: 'BUILDING', pct: 21, eta: '38s', queue: ['CORVETTE'] },
];

export function classicRest() {
  return `<div class="frame">
    ${world('rest')}
    <div class="hud">
      ${topStrip()}${sideChrome()}
      ${consoleShell(`
        ${block(12, 268, 'Scope', `<div style="padding:6px;line-height:0">${scopeFace(252)}</div>`)}
        ${block(292, 372, 'Selection', selectionBlock('BASTION', ['HULL 1,800/1,800 · SIG 18', 'yard · 2 lines · 640 m', 'rally set · 1 harvester out'], { badge: 'PR1', hull: 1, lost: 0 }), { sub: 'STRUCTURE' })}
        ${block(676, 300, 'Roster', roster([]), { sub: '0 SELECTED' })}
        ${block(988, 380, 'Commands', commandCard(BASE_CELLS), { sub: 'BASE' })}
        ${block(1380, 528, 'Production', production(LINES_IDLE), { sub: '2 LINES IDLE' })}
      `)}
      <div style="position:absolute;left:300px;bottom:${1080 - CONSOLE_TOP + 8}px;font-size:11.5px;letter-spacing:0.1em;color:${TEXT.dim}">Nothing selected · left-click a hull, or press 0 for the army</div>
    </div>
  </div>`;
}

export function classicOrders() {
  const chips = [
    { label: 'CORV', hp: 88, silent: true },
    { label: 'CORV', hp: 64, silent: true, hurt: true },
  ];
  return `<div class="frame">
    ${world('orders')}
    <div class="hud">
      ${topStrip()}${sideChrome()}
      ${consoleShell(`
        ${block(12, 268, 'Scope', `<div style="padding:6px;line-height:0">${scopeFace(252)}</div>`)}
        ${block(292, 372, 'Selection', selectionBlock('2 × CORVETTE', ['HULL 742/840 · SIG 28 · 640 m', 'SILENT RUNNING – open · −35% speed', 'queued: move, then work the field'], { hull: 0.88, lost: 0.08 }), { sub: 'GROUP 1' })}
        ${block(676, 300, 'Roster', roster(chips), { sub: '2 SELECTED' })}
        ${block(988, 380, 'Commands', commandCard(ORDER_CELLS), { sub: 'SQUAD' })}
        ${block(1380, 528, 'Production', production(LINES_BUSY), { sub: '2 LINES BUSY' })}
      `)}
      <div style="position:absolute;left:300px;bottom:${1080 - CONSOLE_TOP + 8}px;font-size:11.5px;letter-spacing:0.1em;color:${NEON.amber}">Break silence to fire? +40 SIG on the hull that shoots</div>
    </div>
  </div>`;
}

export function classicBuild() {
  return `<div class="frame">
    ${world('build')}
    <div class="hud">
      ${topStrip()}${sideChrome()}
      ${consoleShell(`
        ${block(12, 268, 'Scope', `<div style="padding:6px;line-height:0">${scopeFace(252)}</div>`)}
        ${block(292, 372, 'Selection', selectionBlock('BASTION', ['HULL 1,800/1,800 · SIG 34 · 640 m', 'building — construction is loud', 'line 1 HARVESTER 14s · line 2 free'], { badge: 'PR1', hull: 1, lost: 0 }), { sub: 'STRUCTURE' })}
        ${block(676, 300, 'Roster', roster([]), { sub: 'YARD SELECTED' })}
        ${block(988, 380, 'Commands', commandCard(BUILD_CELLS), { sub: 'UNITS' })}
        ${block(1380, 528, 'Production', production(LINES_BUSY), { sub: '2 LINES BUSY' })}
      `)}
      <div style="position:absolute;left:300px;bottom:${1080 - CONSOLE_TOP + 8}px;font-size:11.5px;letter-spacing:0.1em;color:${NEON.red}">Abyssal Submersible: 80 crystal short</div>
    </div>
  </div>`;
}
