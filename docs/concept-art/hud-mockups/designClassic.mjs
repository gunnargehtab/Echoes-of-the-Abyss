/**
 * Design B — the classical console.
 *
 * One full-width console in fixed blocks: scope, selection, fleet, a 4 × 3
 * command card, the production line. Nothing is behind a tab, and the twelve
 * command cells are always in the same twelve places.
 *
 * ## Iteration 2 — the console has to earn its footprint
 *
 * The first pass spent 236 px of screen and filled a lot of it with air: a
 * roster of fifteen cells that was empty whenever nothing was selected, a
 * command card drawing five to seven ghost boxes, a 528 px production block
 * carrying two thin bars, and a portrait box with a small wireframe floating in
 * it. A console that takes a fifth of the ocean and then shows nothing in the
 * space is the worst of both arguments.
 *
 * Three changes, in the order they matter:
 *
 * 1. **The footprint came down**, 236 px to 208 px, and every internal metric
 *    with it — block padding 7 → 6, cell gaps 5 → 4, headers 25 → 22. That is
 *    28 px of water back at no cost to content.
 * 2. **Every block is full in every state.** The roster became a FLEET block
 *    that shows the control groups and a census when nothing is selected and
 *    the selected hulls when something is, so it is never a grid of empty
 *    squares. Production carries a summary row — berths, draw, rally — under
 *    its lines. The selection block trades its empty portrait surround for
 *    a six-cell stat grid.
 * 3. **A cell carries three facts, not one.** Every command cell has its
 *    hotkey, its label and a second line: a price, a state, or what it does.
 *    The genuinely unassigned positions keep their place — muscle memory is the
 *    whole argument for a fixed card — but they are drawn as registration ticks
 *    rather than as boxes, so a reserved slot stops reading as a missing one.
 *
 * What the block still may not do is show anything the player has not earned:
 * the census counts own force only, and never a hostile total
 * (docs/ui-ux.md §10.5).
 */

import { FONT, NEON, TEXT, FACTION } from './tokens.mjs';
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

/** 208 px, down from 236 — and the numbers below are the density that bought it. */
const CONSOLE_H = 208;
const CONSOLE_TOP = 1080 - CONSOLE_H;
const PAD = 8;
const HEAD_H = 22;
const AMBER = FACTION.bathyarch.primary;

/** Block edges, chosen from what each block actually needs to say. */
const B = {
  scope: [10, 214],
  selection: [232, 366],
  fleet: [606, 286],
  commands: [900, 420],
  production: [1328, 582],
};

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
function block(key, title, inner, { sub = '' } = {}) {
  const [x, w] = B[key];
  return `<div style="position:absolute;left:${x}px;top:${PAD}px;width:${w}px;bottom:${PAD}px;background:rgba(7,14,26,0.82);border:1px solid rgba(255,61,166,0.3);border-radius:3px;overflow:hidden">
    <div class="row" style="justify-content:space-between;height:${HEAD_H}px;padding:0 8px;border-bottom:1px solid rgba(255,61,166,0.24);font-family:${FONT.display};font-weight:600;font-size:13px;letter-spacing:0.17em;text-transform:uppercase;color:${TEXT.cyan};text-shadow:0 0 8px rgba(53,224,255,0.4)">
      <span>${title}</span><span style="font-family:${FONT.data};font-size:9px;font-weight:400;letter-spacing:0.11em;color:${TEXT.dim};text-shadow:none">${sub}</span>
    </div>
    <div style="height:calc(100% - ${HEAD_H}px)">${inner}</div>
  </div>`;
}

/**
 * The command card. Twelve positions, always the same twelve, and each filled
 * one carries hotkey, label and a second line. An unassigned position keeps its
 * place as four registration ticks rather than an empty box — the card's whole
 * argument is that a cell never moves, and a ghost box says "missing" where a
 * tick says "reserved".
 */
function commandCard(cells) {
  const cell = (c) => {
    if (!c) {
      return `<div style="position:relative;opacity:0.3">
        <i style="position:absolute;top:0;left:0;width:5px;height:5px;border-top:1px solid ${TEXT.dim};border-left:1px solid ${TEXT.dim}"></i>
        <i style="position:absolute;top:0;right:0;width:5px;height:5px;border-top:1px solid ${TEXT.dim};border-right:1px solid ${TEXT.dim}"></i>
        <i style="position:absolute;bottom:0;left:0;width:5px;height:5px;border-bottom:1px solid ${TEXT.dim};border-left:1px solid ${TEXT.dim}"></i>
        <i style="position:absolute;bottom:0;right:0;width:5px;height:5px;border-bottom:1px solid ${TEXT.dim};border-right:1px solid ${TEXT.dim}"></i>
      </div>`;
    }
    const { on, off, key, label, note, cost } = c;
    const second = cost
      ? `<span style="font-size:10px;letter-spacing:0.06em;color:${off ? NEON.red : NEON.amber}">${cost}</span>`
      : note
        ? `<span style="font-size:9px;letter-spacing:0.06em;color:${on ? NEON.teal : TEXT.dim}">${note}</span>`
        : '';
    return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;border:1px solid ${on ? NEON.cyan : off ? 'rgba(214,230,240,0.14)' : 'rgba(53,224,255,0.32)'};border-radius:2px;background:${on ? 'rgba(53,224,255,0.14)' : 'rgba(10,20,36,0.85)'};${on ? 'box-shadow:0 0 12px rgba(53,224,255,0.3);' : ''}opacity:${off ? 0.4 : 1};filter:${off ? 'saturate(0.35)' : 'none'}">
      <span style="position:absolute;top:2px;right:4px;font-size:9px;color:${TEXT.dim};letter-spacing:0.05em">${key}</span>
      <span style="font-size:11.5px;letter-spacing:0.08em;color:${on ? '#eafaff' : TEXT.bright};text-align:center;line-height:1.1;padding:0 3px">${label}</span>
      ${second}
    </div>`;
  };
  return `<div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));grid-template-rows:repeat(3, minmax(0, 1fr));gap:4px;padding:6px;height:100%">
    ${Array.from({ length: 12 }, (_, i) => cell(cells[i])).join('')}
  </div>`;
}

/** The selection: a small wireframe, then six facts in a grid instead of three lines. */
function selectionBlock(name, badge, stats, { hull = 0.88, lost = 0.08, note = '' } = {}) {
  const statCell = ([k, v, ink]) => `
    <div class="col" style="gap:0;text-align:left;min-width:0">
      <span style="font-size:8.5px;letter-spacing:0.14em;color:${TEXT.dim}">${k}</span>
      <span style="font-size:11.5px;letter-spacing:0.06em;color:${ink || TEXT.bright};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v}</span>
    </div>`;
  return `<div class="col" style="height:100%;padding:6px 8px;gap:5px">
    <div class="row" style="gap:8px;align-items:center">
      <svg width="34" height="34" viewBox="-22 -22 44 44" aria-hidden="true" focusable="false" style="flex:0 0 34px">
        <circle cx="0" cy="0" r="20" fill="none" stroke="${NEON.cyan}" stroke-opacity="0.16" stroke-width="1"/>
        <g transform="scale(1.05)">
          <path d="M -17 0 L -9 -5 L 12 -5 L 19 0 L 12 5 L -9 5 Z" fill="none" stroke="${AMBER}" stroke-width="1.1"/>
          <path d="M -4 -5 L 3 -5 L 3 -9 L -2 -9 Z" fill="none" stroke="${AMBER}" stroke-width="0.9"/>
        </g>
      </svg>
      <span style="flex:1 1 auto;font-family:${FONT.display};font-weight:600;font-size:19px;letter-spacing:0.08em;color:${NEON.cyan};text-shadow:0 0 10px rgba(53,224,255,0.4);text-align:left;white-space:nowrap">${name}</span>
      <span style="flex:0 0 auto;font-size:9.5px;letter-spacing:0.12em;color:${TEXT.dim};border:1px solid ${TEXT.dim};border-radius:2px;padding:1px 5px">${badge}</span>
    </div>
    <div style="position:relative;height:6px;background:rgba(3,8,14,0.85);border:1px solid rgba(214,230,240,0.12)">
      <div style="position:absolute;inset:0;width:${hull * 100}%;background:${NEON.teal}"></div>
      <div style="position:absolute;top:0;bottom:0;right:0;width:${lost * 100}%;background:repeating-linear-gradient(135deg, ${NEON.red}99 0 2px, transparent 2px 5px)"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:5px 10px">
      ${stats.map(statCell).join('')}
    </div>
    ${note ? `<div style="font-size:10px;letter-spacing:0.08em;color:${NEON.teal};text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${note}</div>` : ''}
  </div>`;
}

/**
 * The fleet block, which replaced the roster.
 *
 * ## Iteration 3 — a finger has to be able to use this
 *
 * The control groups were a list of 15 px rows, and on glass that is not a
 * control at all: docs/ui-ux.md §11 puts the floor at 44 px, and §9 makes the
 * digits unrebindable, so on a touchscreen — which has no digits — this row is
 * the *only* way to recall a group. A 15 px row was the one place the console
 * quietly stopped being the one layout that serves both pointers.
 *
 * Four 44 px rows do not fit in a 170 px block, so the groups stopped being
 * rows: they are square chips laid across the width, which is both denser and
 * reachable. Every horizontal band in here is now a 44 px touch row — the
 * groups, the hulls in hand, and the idle notice, which was a fact in the
 * status line and is now the thing you press to go to the stalled harvester.
 *
 * Own force only. A hostile count here would be §10.5's maphack in a numeral.
 */
function fleetBlock({ chips = [], groups = [], census, idle }) {
  const ROW_H = 44;
  const groupChip = (g) =>
    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;height:${ROW_H}px;flex:0 0 ${ROW_H}px;border:1px solid ${g.n ? 'rgba(53,224,255,0.4)' : 'rgba(214,230,240,0.14)'};border-radius:2px;background:${g.n ? 'rgba(10,20,36,0.85)' : 'rgba(10,20,36,0.4)'}">
      <span style="font-size:12px;letter-spacing:0.06em;color:${g.n ? NEON.cyan : TEXT.dim}">${g.key}</span>
      <span style="font-size:9px;letter-spacing:0.05em;color:${g.n ? TEXT.bright : TEXT.dim}">${g.n ? '×' + g.n : '—'}</span>
    </div>`;
  const hullChip = (c) =>
    `<div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:${ROW_H}px;flex:0 0 ${ROW_H}px;border:1px solid ${c.hurt ? NEON.red : 'rgba(53,224,255,0.4)'};border-radius:2px;background:rgba(10,20,36,0.85)">
      <span style="font-size:9.5px;letter-spacing:0.05em;color:${TEXT.bright}">${c.label}</span>
      <div style="width:70%;height:3px;background:rgba(3,8,14,0.8)"><div style="width:${c.hp}%;height:3px;background:${c.hurt ? NEON.red : NEON.teal}"></div></div>
      ${c.silent ? `<span style="position:absolute;top:2px;right:4px;font-size:8px;color:${NEON.teal}">S</span>` : ''}
    </div>`;
  const grid = (cells, cols) =>
    `<div style="display:grid;grid-template-columns:repeat(${cols}, minmax(0, 1fr));gap:4px;flex:0 0 ${ROW_H}px">${cells}</div>`;

  // With a selection, the hulls in hand take the first band and the groups keep
  // one; with none, the groups take both. Three 44 px bands either way, so the
  // block neither hollows out nor overflows as the selection changes.
  const bands = chips.length
    ? grid(chips.map(hullChip).join(''), 5) + grid(groups.slice(0, 5).map(groupChip).join(''), 5)
    : grid(groups.slice(0, 5).map(groupChip).join(''), 5) +
      grid(groups.slice(5).map(groupChip).join(''), 5);

  const idleRow = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;height:${ROW_H}px;flex:0 0 ${ROW_H}px;padding:0 10px;border:1px solid ${idle ? NEON.amber : 'rgba(214,230,240,0.14)'};border-radius:2px;background:${idle ? 'rgba(242,178,51,0.1)' : 'rgba(10,20,36,0.4)'}">
      <span style="font-size:11px;letter-spacing:0.1em;color:${idle ? NEON.amber : TEXT.dim}">${idle ? 'IDLE — 1 WAITING' : 'NOTHING IDLE'}</span>
      <span style="font-size:9px;letter-spacing:0.1em;color:${TEXT.dim}">${idle ? 'TAP OR I TO GO' : ''}</span>
    </div>`;

  const line = census.map(([k, v]) => `${v} ${k}`).join(' · ');

  return `<div class="col" style="height:100%;padding:4px 8px;gap:3px">
    ${bands}
    ${idleRow}
    <div style="height:1px;background:rgba(214,230,240,0.08);flex:0 0 1px"></div>
    <div style="font-size:10px;letter-spacing:0.06em;color:${TEXT.bright};text-align:left;white-space:nowrap;padding-top:2px">${line}</div>
  </div>`;
}

/**
 * Production. Two lines, and then the summary row the block's width was
 * previously spending on nothing: berths, the Thermal Draw covering the yards,
 * and where a new hull goes when it launches.
 */
function production(lines, summary) {
  const row = (l) => `
    <div class="col" style="gap:4px;justify-content:center;height:44px;padding:0 8px;border-bottom:1px solid rgba(214,230,240,0.05);text-align:left">
      <div class="row" style="gap:8px;align-items:baseline">
        <span style="flex:0 0 122px;font-size:10.5px;letter-spacing:0.08em;color:${l.pct ? TEXT.bright : TEXT.dim};white-space:nowrap">${l.yard}</span>
        <span style="flex:0 0 auto;font-size:11px;letter-spacing:0.08em;color:${l.pct ? TEXT.cyan : TEXT.dim}">${l.making}</span>
        <span style="flex:1 1 auto"></span>
        <div class="row" style="flex:0 0 auto;gap:3px">${l.queue
          .map(
            (q) =>
              `<span style="font-size:8.5px;letter-spacing:0.07em;color:${TEXT.dim};border:1px solid rgba(214,230,240,0.18);border-radius:2px;padding:1px 5px">${q}</span>`
          )
          .join('')}</div>
        <span style="flex:0 0 40px;font-size:11px;letter-spacing:0.06em;color:${l.pct ? TEXT.cyan : TEXT.dim};text-align:right">${l.eta}</span>
      </div>
      <div style="height:5px;background:rgba(3,8,14,0.85);border:1px solid rgba(214,230,240,0.1)">
        <div style="width:${l.pct}%;height:100%;background:${NEON.cyan};box-shadow:0 0 10px rgba(53,224,255,0.5)"></div>
        ${l.pct ? '' : `<div style="height:100%;background:repeating-linear-gradient(135deg, rgba(214,230,240,0.12) 0 2px, transparent 2px 7px)"></div>`}
      </div>
    </div>`;
  const cell = ([k, v, ink]) => `
    <div class="col" style="gap:0;text-align:left;min-width:0">
      <span style="font-size:8.5px;letter-spacing:0.14em;color:${TEXT.dim}">${k}</span>
      <span style="font-size:11.5px;letter-spacing:0.06em;color:${ink || TEXT.bright};white-space:nowrap">${v}</span>
    </div>`;
  return `<div class="col" style="height:100%;justify-content:space-between">
    <div>${lines.map(row).join('')}</div>
    <div style="flex:1 1 auto"></div>
    <div style="display:grid;grid-template-columns:repeat(4, minmax(0, 1fr));gap:10px;padding:5px 8px 6px">
      ${summary.map(cell).join('')}
    </div>
  </div>`;
}

function consoleShell(inner) {
  return `<div class="plate" style="left:0;right:0;top:${CONSOLE_TOP}px;bottom:0;border-radius:0;border-left:0;border-right:0;border-bottom:0;background:rgba(7,14,26,0.93)">
    ${inner}
  </div>`;
}

function sideChrome() {
  return `
  ${depthRibbon({ top: 68, height: 700, plated: true })}
  ${plate(`right:14px;top:68px;width:352px;height:${logHeight(7)}px;overflow:hidden;`, logRows(7), { title: 'Contact Log', sub: '4 HEARD' })}
  ${plate(`right:14px;top:${68 + logHeight(7) + 12}px;width:352px;height:${objHeight(3)}px;overflow:hidden;`, objectiveRows(), { title: 'The Sorrowgate', sub: 'T+06:12' })}`;
}

function hint(text, ink = TEXT.dim) {
  return `<div style="position:absolute;left:300px;bottom:${CONSOLE_H + 8}px;font-size:11.5px;letter-spacing:0.1em;color:${ink}">${text}</div>`;
}

const GROUPS = [
  { key: '1', n: 2 },
  { key: '2', n: 1 },
  { key: '3', n: 0 },
  { key: '4', n: 0 },
  { key: '5', n: 0 },
  { key: '6', n: 0 },
  { key: '7', n: 0 },
  { key: '8', n: 0 },
  { key: '9', n: 0 },
  { key: '0', n: 2 },
];

const CENSUS = [
  ['CORVETTE', '2'],
  ['HARVESTER', '1'],
  ['STRUCTURES', '2'],
];
const ORDER_CELLS = [
  { key: 'RMB', label: 'MOVE', note: 'go there' },
  { key: 'W', label: 'ATK-MOVE', note: 'fight en route' },
  { key: 'X', label: 'STOP', note: 'drop the plan' },
  { key: 'H', label: 'HOLD', note: 'fire, go nowhere' },
  { key: 'SPC', label: 'SILENT', note: 'ON — open', on: true },
  { key: 'P', label: 'PING', note: '2,400 m cost' },
  { key: 'D', label: 'DIVE', note: 'to 1,200 m' },
  { key: 'A', label: 'RISE', note: 'to 400 m' },
  { key: 'S', label: 'FOLLOW', note: 'hug the floor' },
  { key: 'N', label: 'DECOY', cost: '25' },
  { key: 'M', label: 'MINE', cost: '40' },
  { key: 'C', label: 'CHARGE', cost: '60' },
];

const BASE_CELLS = [
  { key: 'R', label: 'REFINERY', cost: '140' },
  { key: 'F', label: 'FOUNDRY', cost: '180' },
  { key: 'T', label: 'TURRET', cost: '90' },
  { key: 'B', label: 'SPIRE', cost: '210' },
  { key: '0', label: 'ARMY', note: 'select all' },
  { key: 'G', label: 'RALLY', note: 'set point' },
  { key: 'I', label: 'IDLE', note: '1 waiting', on: true },
  { key: 'Y', label: 'YARDS', note: 'every line' },
  null,
  null,
  null,
  { key: 'ESC', label: 'MENU', note: 'the water runs' },
];

const BUILD_CELLS = [
  { key: '1', label: 'HARVESTER', cost: '120' },
  { key: '2', label: 'CORVETTE', cost: '260' },
  { key: '3', label: 'SUBMERSIBLE', cost: '260+80c', off: true },
  { key: '4', label: 'CRUISER', cost: '520', off: true },
  { key: '5', label: 'CHORISTER', cost: '340', off: true },
  { key: '6', label: 'HULL PLATE', cost: '300' },
  { key: 'Y', label: 'YARDS', note: 'every line' },
  null,
  { key: 'G', label: 'RALLY', note: 'set point' },
  null,
  null,
  { key: 'ESC', label: 'CANCEL', note: 'placing' },
];

const LINES_BUSY = [
  { yard: 'BASTION', making: 'HARVESTER', eta: '14s', pct: 62, queue: ['CORVETTE'] },
  { yard: 'FOUNDRY', making: 'CORVETTE', eta: '38s', pct: 21, queue: ['CORVETTE', 'MINE ×2'] },
  { yard: 'SLIPWAY', making: 'not built', eta: '—', pct: 0, queue: [] },
];

const SUMMARY_BUSY = [
  ['BERTHS', '6 / 8 — 2 queued', NEON.amber],
  ['DRAW', '6 / 4 covered', NEON.cyan],
  ['CRYSTAL', 'no refinery', TEXT.dim],
  ['RALLY', 'the vent shelf', TEXT.cyan],
];

export function classicRest() {
  return `<div class="frame">
    ${world('rest')}
    <div class="hud">
      ${topStrip()}${sideChrome()}
      ${consoleShell(`
        ${block('scope', 'Scope', `<div style="height:100%;line-height:0;display:flex;align-items:center;justify-content:center">${scopeFace(156)}</div>`)}
        ${block(
          'selection',
          'Selection',
          selectionBlock(
            'BASTION',
            'PR1',
            [
              ['HULL', '1,800 / 1,800'],
              ['SIG', '18', NEON.teal],
              ['DEPTH', '640 m'],
              ['LINE', 'free', TEXT.cyan],
              ['RALLY', 'set', TEXT.cyan],
              ['BUILDS', 'Harvester +3'],
            ],
            { hull: 1, lost: 0, note: 'yard · the only hull that always stands' }
          ),
          { sub: 'STRUCTURE' }
        )}
        ${block('fleet', 'Fleet', fleetBlock({ groups: GROUPS, census: CENSUS, idle: true }), { sub: 'NOTHING SELECTED' })}
        ${block('commands', 'Commands', commandCard(BASE_CELLS), { sub: 'BASE' })}
        ${block('production', 'Production', production(LINES_BUSY, SUMMARY_BUSY), { sub: '2 YARDS RUNNING' })}
      `)}
      ${hint('Nothing selected · left-click a hull, 0 for the army, or arm a structure from the card')}
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
        ${block('scope', 'Scope', `<div style="height:100%;line-height:0;display:flex;align-items:center;justify-content:center">${scopeFace(156)}</div>`)}
        ${block(
          'selection',
          'Selection',
          selectionBlock(
            '2 × CORVETTE',
            'PR2',
            [
              ['HULL', '742 / 840'],
              ['SIG', '28', NEON.teal],
              ['DEPTH', '640 m · DUCT', TEXT.cyan],
              ['SPEED', '−35% silent', NEON.teal],
              ['ORDERED', '1,200 m'],
              ['QUEUE', 'move → field'],
            ],
            { hull: 0.88, lost: 0.08, note: 'SILENT RUNNING – open · the world got louder' }
          ),
          { sub: 'GROUP 1' }
        )}
        ${block('fleet', 'Fleet', fleetBlock({ chips, groups: GROUPS, census: CENSUS, idle: true }), { sub: '2 SELECTED' })}
        ${block('commands', 'Commands', commandCard(ORDER_CELLS), { sub: 'SQUAD' })}
        ${block('production', 'Production', production(LINES_BUSY, SUMMARY_BUSY), { sub: '2 YARDS RUNNING' })}
      `)}
      ${hint('Break silence to fire? +40 SIG on the hull that shoots', NEON.amber)}
    </div>
  </div>`;
}

export function classicBuild() {
  return `<div class="frame">
    ${world('build')}
    <div class="hud">
      ${topStrip()}${sideChrome()}
      ${consoleShell(`
        ${block('scope', 'Scope', `<div style="height:100%;line-height:0;display:flex;align-items:center;justify-content:center">${scopeFace(156)}</div>`)}
        ${block(
          'selection',
          'Selection',
          selectionBlock(
            'BASTION',
            'PR1',
            [
              ['HULL', '1,800 / 1,800'],
              ['SIG', '34 — building', NEON.amber],
              ['DEPTH', '640 m'],
              ['LINE', 'HARVESTER 14s', TEXT.cyan],
              ['QUEUED', 'Corvette'],
              ['BERTHS', '2 needed'],
            ],
            { hull: 1, lost: 0, note: 'construction is loud — and the water carries it' }
          ),
          { sub: 'STRUCTURE' }
        )}
        ${block('fleet', 'Fleet', fleetBlock({ groups: GROUPS, census: CENSUS, idle: true }), { sub: 'YARD SELECTED' })}
        ${block('commands', 'Commands', commandCard(BUILD_CELLS), { sub: 'UNITS' })}
        ${block('production', 'Production', production(LINES_BUSY, SUMMARY_BUSY), { sub: '2 YARDS RUNNING' })}
      `)}
      ${hint('Abyssal Submersible: 80 crystal short', NEON.red)}
    </div>
  </div>`;
}
