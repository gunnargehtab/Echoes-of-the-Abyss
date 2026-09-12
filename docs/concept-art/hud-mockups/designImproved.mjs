/**
 * Design C — today's interface, done properly.
 *
 * Same topology as the shipped client: a strip along the top, the ribbon down
 * the left, the scope bottom-left, the log and the panel right, a bar along the
 * foot. Nothing has moved, so a player who knows the client already knows this.
 * What changes is the four things the grill named.
 *
 * 1. Material. The plate VI card of docs/style-neon-noir.md, implemented:
 *    glass at 86%, one magenta bevel with one halo, a cyan header band over a
 *    thin rule, corner registration ticks instead of a radius, and one diagonal
 *    grain over the whole HUD layer rather than per panel.
 * 2. Hierarchy. §3's meter at the size §3 specifies, with the zero-padded
 *    readout, the hard colour stops, the transient spike and the `n units ·
 *    m loud` line the shipped strip never grew. The stockpiles shrink to make
 *    room, because loudness is the number that kills you and the nodule count
 *    is bookkeeping.
 * 3. Production, in the open. A yard strip above the bar — one row per line,
 *    what it is making, how long it has left, what is queued behind. The UNITS
 *    tab stops being where production hides and becomes only where it starts.
 * 4. Orders, grouped by what they cost. Posture toggles carry their state as
 *    light; dive and rise become one paired control that names the rung between
 *    them; ordnance is priced in a row of its own; and the ping is pulled out,
 *    framed in threat red, alone — §6 calls it the one interaction the UI may
 *    be pushy about, and §1.5 forbids paying its cost by accident.
 *
 * The collision is fixed by the simplest available means: the selection card
 * moves into the bar, so the hint line has a line to itself.
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

const AMBER = FACTION.bathyarch.primary;
const BAR_H = 120;
const YARD_H = 66;

/** §3's meter given the room §3 asks for, and the stockpiles given less. */
function topStrip() {
  return `
  <div class="plate" style="left:0;right:0;top:0;height:68px;border-radius:0;border-left:0;border-right:0;border-top:0">
    <div class="row" style="gap:20px;padding:0 16px;height:67px;align-items:center">
      <div class="col" style="gap:1px;text-align:left">
        <span class="lbl">NODULES</span>
        <span style="font-size:14px;letter-spacing:0.08em;color:${NEON.amber}">600</span>
      </div>
      <div class="col" style="gap:1px;text-align:left">
        <span class="lbl">CRYSTAL</span>
        <span style="font-size:14px;letter-spacing:0.08em;color:#b98cff">0</span>
      </div>
      <div class="col" style="gap:1px;text-align:left">
        <span class="lbl">BERTHS</span>
        <span style="font-size:14px;letter-spacing:0.08em">6/8</span>
      </div>
      <span style="width:1px;height:30px;background:rgba(255,61,166,0.35)"></span>
      <div class="row breathe" style="gap:14px;align-items:flex-end">
        ${sigMeter({ value: 42, spike: 9, w: 300, big: true })}
        <div class="col" style="gap:2px;padding-bottom:2px;text-align:left">
          <span class="lbl" style="color:${TEXT.cyan}">3 UNITS · 1 LOUD</span>
          <span class="lbl">DRIVE HUM — MASKING</span>
        </div>
      </div>
      <span style="flex:1 1 auto"></span>
      <span style="font-size:11px;letter-spacing:0.14em;color:${NEON.red};border:1px solid ${NEON.red};border-radius:2px;padding:2px 7px">TRACKED ×1</span>
      <span class="dim" style="font-size:11px;letter-spacing:0.14em">THE VENTFRONT DIVIDE</span>
      <span class="cyan glow-c" style="font-size:17px;letter-spacing:0.14em">T+06:12</span>
    </div>
  </div>`;
}

function sideChrome() {
  return `
  ${depthRibbon({ top: 82, height: 660, plated: true })}
  ${plate(`right:14px;top:82px;width:352px;height:${logHeight(7)}px;overflow:hidden;`, logRows(7), { title: 'Contact Log', sub: '4 HEARD' })}
  ${plate(`right:14px;top:${82 + logHeight(7) + 12}px;width:352px;height:${objHeight(3)}px;overflow:hidden;`, objectiveRows(), { title: 'The Sorrowgate', sub: 'T+06:12' })}
  ${plate(`left:14px;bottom:${BAR_H + YARD_H + 16}px;width:214px;`, `<div style="padding:6px;line-height:0">${scopeFace(200)}</div>`, { title: 'Scope' })}`;
}

/**
 * The fix for "production is buried": one row per line, permanently on screen,
 * whether or not a yard is selected and whatever tab is open.
 */
function yardStrip(lines) {
  const row = (l) => `
    <div class="row" style="flex:1 1 0;gap:9px;padding:0 12px;align-items:center;border-right:1px solid rgba(214,230,240,0.07)">
      <div class="col" style="gap:2px;flex:0 0 82px;text-align:left">
        <span style="font-size:11.5px;letter-spacing:0.12em;color:${TEXT.bright}">${l.yard}</span>
        <span class="lbl" style="color:${l.pct ? TEXT.cyan : TEXT.dim}">${l.state}</span>
      </div>
      <div class="col" style="flex:1 1 auto;gap:4px">
        <div class="row" style="justify-content:space-between;align-items:baseline">
          <span style="font-size:11px;letter-spacing:0.1em;color:${l.pct ? TEXT.bright : TEXT.dim}">${l.making}</span>
          <span style="font-size:11px;letter-spacing:0.1em;color:${l.pct ? TEXT.cyan : TEXT.dim}">${l.eta}</span>
        </div>
        <div style="height:6px;background:rgba(3,8,14,0.85);border:1px solid rgba(214,230,240,0.12)">
          <div style="width:${l.pct}%;height:100%;background:${NEON.cyan};box-shadow:${l.pct ? '0 0 10px rgba(53,224,255,0.55)' : 'none'}"></div>
        </div>
      </div>
      <div class="row" style="flex:0 0 auto;gap:4px">${l.queue
        .map(
          (q) =>
            `<span style="font-size:9.5px;letter-spacing:0.08em;color:${TEXT.dim};border:1px solid rgba(214,230,240,0.18);border-radius:2px;padding:2px 6px">${q}</span>`
        )
        .join('')}</div>
    </div>`;
  return `<div class="plate quiet" style="left:0;right:0;bottom:${BAR_H}px;height:${YARD_H}px;border-radius:0;border-left:0;border-right:0;background:rgba(10,20,36,0.88)">
    <div class="row" style="height:${YARD_H - 2}px;align-items:stretch">
      <div class="row" style="flex:0 0 116px;padding:0 12px;align-items:center;border-right:1px solid rgba(255,61,166,0.28)">
        <span style="font-family:${FONT.display};font-weight:600;font-size:14px;letter-spacing:0.17em;color:${TEXT.cyan};text-shadow:0 0 8px rgba(53,224,255,0.4)">YARDS</span>
      </div>
      ${lines.map(row).join('')}
    </div>
  </div>`;
}

/** A toggle that carries its state as light rather than as a flat rectangle. */
function toggle(label, key, on) {
  return `<div class="btn ${on ? 'on' : ''}" style="min-width:96px;align-items:flex-start">
    <span class="key">${key}</span><span>${label}</span>
    <span style="font-size:9.5px;letter-spacing:0.1em;color:${on ? NEON.teal : TEXT.dim}">${on ? 'ON — open' : 'off'}</span>
  </div>`;
}

/** Dive and rise are one control, because depth is one commitment. */
function depthPair(rung, note) {
  const arrow = (d) =>
    `<svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true" focusable="false"><path d="${d}" fill="none" stroke="${TEXT.bright}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `<div class="row" style="border:1px solid rgba(53,224,255,0.3);border-radius:3px;background:rgba(10,20,36,0.9);height:56px">
    <div style="display:flex;align-items:center;justify-content:center;width:46px;height:100%;border-right:1px solid rgba(53,224,255,0.18);position:relative">
      <span class="key" style="top:2px;right:4px">A</span>${arrow('M 0 5 L 0 -5 M -4 -1 L 0 -5 L 4 -1')}
    </div>
    <div class="col" style="gap:1px;padding:0 12px;min-width:104px">
      <span style="font-size:12px;letter-spacing:0.11em;color:${TEXT.cyan}">${rung}</span>
      <span class="lbl" style="letter-spacing:0.1em">${note}</span>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;width:46px;height:100%;border-left:1px solid rgba(53,224,255,0.18);position:relative">
      <span class="key" style="top:2px;right:4px">D</span>${arrow('M 0 -5 L 0 5 M -4 1 L 0 5 L 4 1')}
    </div>
  </div>`;
}

/** Priced the way §13's own line asks: the whole price, from the server's sum. */
function priced(label, key, cost, off = false) {
  return `<div class="btn ${off ? 'off' : ''}" style="min-width:84px;align-items:flex-start">
    <span class="key">${key}</span><span>${label}</span><span class="cost">${cost}</span>
  </div>`;
}

/** The ping, alone, in threat red: §6's one pushy interaction, kept unmissable. */
function pingButton() {
  return `<div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:150px;height:66px;border:1px solid ${NEON.red};border-radius:3px;background:rgba(255,59,48,0.1);box-shadow:0 0 16px rgba(255,59,48,0.28), inset 0 0 18px rgba(255,59,48,0.06)">
    <span class="key" style="color:${NEON.red}">P</span>
    <span style="font-family:${FONT.display};font-weight:700;font-size:19px;letter-spacing:0.15em;color:#ffd9d6;text-shadow:0 0 10px rgba(255,59,48,0.6);line-height:1.05">ACTIVE PING</span>
    <span style="font-size:9.5px;letter-spacing:0.08em;color:${NEON.red};white-space:nowrap">HOLD TO PREVIEW · 2,400 m</span>
  </div>`;
}

/** The card, inside the bar, so it can never sit on the hint line again. */
function selectionCard(name, sub, lines, { badge = 'PR2', hull = 0.88, lost = 0.08 } = {}) {
  return `<div class="col" style="flex:0 0 332px;gap:5px;padding:0 14px 0 14px;border-right:1px solid rgba(255,61,166,0.28);justify-content:center;text-align:left">
    <div class="row" style="justify-content:space-between;align-items:baseline">
      <span style="font-family:${FONT.display};font-weight:600;font-size:20px;letter-spacing:0.09em;color:${NEON.cyan};text-shadow:0 0 10px rgba(53,224,255,0.45)">${name}</span>
      <span class="lbl" style="border:1px solid ${TEXT.dim};border-radius:2px;padding:1px 5px">${badge}</span>
    </div>
    <div style="position:relative;height:7px;background:rgba(3,8,14,0.85);border:1px solid rgba(214,230,240,0.12)">
      <div style="position:absolute;inset:0;width:${hull * 100}%;background:${NEON.teal}"></div>
      <div style="position:absolute;top:0;bottom:0;right:0;width:${lost * 100}%;background:repeating-linear-gradient(135deg, ${NEON.red}99 0 2px, transparent 2px 5px)"></div>
    </div>
    <span class="lbl" style="letter-spacing:0.1em;color:${TEXT.cyan}">${sub}</span>
    ${lines.map((l) => `<span class="lbl" style="letter-spacing:0.1em">${l}</span>`).join('')}
  </div>`;
}

function bar(inner) {
  return `<div class="plate" style="left:0;right:0;bottom:0;height:${BAR_H}px;border-radius:0;border-left:0;border-right:0;border-bottom:0;background:rgba(13,28,40,0.94)">
    <div class="row" style="height:${BAR_H - 2}px;align-items:stretch">${inner}</div>
  </div>`;
}

function tabs(active) {
  const t = (label, on) =>
    `<div style="padding:5px 12px;font-size:11px;letter-spacing:0.14em;color:${on ? '#eafaff' : TEXT.dim};border:1px solid ${on ? NEON.magenta : 'rgba(214,230,240,0.16)'};border-radius:2px;background:${on ? 'rgba(255,61,166,0.12)' : 'transparent'}">${label}</div>`;
  return `<div style="flex:0 0 auto;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:6px;align-content:center;padding:0 14px;border-left:1px solid rgba(255,61,166,0.28)">
    ${t('BUILD', active === 'build')}${t('UNITS', active === 'units')}${t('SQUAD', active === 'squad')}${t('MENU', false)}
  </div>`;
}

function hint(text, ink = TEXT.dim) {
  return `<div style="position:absolute;left:246px;right:16px;bottom:${BAR_H + YARD_H + 10}px;font-size:12px;letter-spacing:0.1em;color:${ink};text-align:left">${text}</div>`;
}

const LINES_IDLE = [
  { yard: 'BASTION', state: '2 LINES FREE', making: 'idle', eta: '—', pct: 0, queue: [] },
  { yard: 'FOUNDRY', state: '1 LINE FREE', making: 'idle', eta: '—', pct: 0, queue: [] },
];
const LINES_BUSY = [
  {
    yard: 'BASTION',
    state: 'BUILDING',
    making: 'HARVESTER',
    eta: '14s',
    pct: 62,
    queue: ['CORVETTE'],
  },
  {
    yard: 'FOUNDRY',
    state: 'BUILDING',
    making: 'CORVETTE',
    eta: '38s',
    pct: 21,
    queue: ['CORVETTE', 'MINE ×2'],
  },
];

export function improvedRest() {
  return `<div class="frame">
    ${world('rest')}
    <div class="hud">
      ${topStrip()}${sideChrome()}${yardStrip(LINES_IDLE)}
      ${bar(`
        ${selectionCard('FLEET', 'NOTHING SELECTED', ['3 hulls · 2 structures', '0 idle · 1 tracked'], { badge: '—', hull: 1, lost: 0 })}
        <div class="row" style="flex:1 1 auto;gap:8px;padding:0 14px;align-items:center">
          ${priced('REFINERY', 'R', '140')}
          ${priced('FOUNDRY', 'F', '180')}
          ${priced('TURRET', 'T', '90')}
          ${priced('SPIRE', 'B', '210')}
          <span style="width:1px;height:44px;background:rgba(214,230,240,0.12)"></span>
          <div class="btn" style="min-width:92px"><span class="key">0</span><span>ARMY</span><span class="lbl">select all</span></div>
          <div class="btn" style="min-width:92px"><span class="key">G</span><span>RALLY</span><span class="lbl">set point</span></div>
        </div>
        ${tabs('build')}
      `)}
      ${hint('Nothing selected · left-click a hull, 0 for the army, or arm a structure from the row')}
    </div>
  </div>`;
}

export function improvedOrders() {
  return `<div class="frame">
    ${world('orders')}
    <div class="hud">
      ${topStrip()}${sideChrome()}${yardStrip(LINES_BUSY)}
      ${bar(`
        ${selectionCard('2 × CORVETTE', 'HULL 742/840 · SIG 28 · 640 m', ['SILENT RUNNING – open · −35% speed', 'queued: move, then work the field'])}
        <div class="row" style="flex:1 1 auto;gap:8px;padding:0 14px;align-items:center">
          ${toggle('SILENT', 'SPC', true)}
          ${toggle('HOLD', 'H', false)}
          ${toggle('FLOOR', 'S', false)}
          <span style="width:1px;height:44px;background:rgba(214,230,240,0.12)"></span>
          ${depthPair('DUCT · 640 m', 'ordered 1,200 m')}
          <span style="width:1px;height:44px;background:rgba(214,230,240,0.12)"></span>
          ${priced('TORP ×2', 'CTRL', '—')}
          ${priced('MINE', 'M', '40')}
          ${priced('DECOY', 'N', '25')}
          ${priced('CHARGE', 'C', '60', true)}
          <span style="flex:1 1 auto"></span>
          ${pingButton()}
        </div>
        ${tabs('squad')}
      `)}
      ${hint('Attack order breaks silence — +40 SIG on the hull that fires. Press again to confirm.', NEON.amber)}
    </div>
  </div>`;
}

export function improvedBuild() {
  return `<div class="frame">
    ${world('build')}
    <div class="hud">
      ${topStrip()}${sideChrome()}${yardStrip(LINES_BUSY)}
      ${bar(`
        ${selectionCard('BASTION', 'HULL 1,800/1,800 · SIG 34 · 640 m', ['building — construction is loud', 'line 1: HARVESTER 14s · line 2 free'], { badge: 'PR1', hull: 1, lost: 0 })}
        <div class="row" style="flex:1 1 auto;gap:8px;padding:0 14px;align-items:center">
          ${priced('HARVESTER', '1', '120')}
          ${priced('CORVETTE', '2', '260')}
          ${priced('SUBMERSIBLE', '3', '260+80c', true)}
          ${priced('CRUISER', '4', '520', true)}
          ${priced('CHORISTER', '5', '340', true)}
          <span style="width:1px;height:44px;background:rgba(214,230,240,0.12)"></span>
          ${priced('HULL PLATE', '6', '300')}
          <div class="btn armed" style="min-width:92px"><span class="key">ESC</span><span>CANCEL</span><span class="lbl">placing</span></div>
          <span style="flex:1 1 auto"></span>
          ${pingButton()}
        </div>
        ${tabs('units')}
      `)}
      ${hint('Abyssal Submersible: 80 crystal short', NEON.red)}
    </div>
  </div>`;
}
