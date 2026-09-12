/**
 * The baseline: what `EchoRenderer` actually draws today, transcribed rather
 * than flattered.
 *
 * Geometry is the constant block at the head of EchoRenderer.ts — a 30 px top
 * strip, an 80 px command bar of a 24 px tab strip over a 56 px button row, the
 * ribbon at x 12 and 14 wide, the log at top 38 / right 10 / width 340. The
 * panels are hairline boxes because that is what the client draws: no glass
 * fill to speak of, no bevel halo, no header band, no corner ticks, no grain.
 * The selection card overlapping the hint line is reproduced on purpose — it is
 * the collision the comparison is about.
 */

import { BLACK, FONT, NEON, SIG, TEXT } from './tokens.mjs';
import { logRows, scopeFace } from './chrome.mjs';
import { world } from './world.mjs';

const barButtons = [
  ['SILENT', false],
  ['PING', false],
  ['DIVE', false],
  ['RISE', false],
  ['FOLLOW', false],
  ['TORP 2', true],
  ['DECOY', false],
  ['MINE', false],
  ['CHARGE', false],
  ['×', false],
];

const HINT =
  '1 selected  ·  RMB move (SHIFT queue)  ·  CTRL+RMB torpedo  ·  SPACE silent  ·  ' +
  'P ping  ·  N decoy  ·  M mine  ·  C charge  ·  D dive  ·  A rise';

function topStrip() {
  const ink = SIG.mid;
  return `
  <div style="position:absolute;left:0;right:0;top:0;height:30px;background:rgba(13,28,40,0.92);border-bottom:1px solid ${NEON.magenta}">
    <div class="row" style="gap:16px;padding:0 12px;height:29px;align-items:center;font-size:13px;letter-spacing:0.1em">
      <span><span class="dim">NODULES</span> <span style="color:${NEON.amber}">600</span></span>
      <span><span class="dim">CRYSTAL</span> <span style="color:${TEXT.bright}">0</span></span>
      <span><span class="dim">DRAW</span> <span style="color:${TEXT.bright}">6/4</span> <span style="color:${NEON.cyan};letter-spacing:-1px">▮▮▮▮</span></span>
      <span style="position:relative;display:inline-block;width:118px;height:11px;background:rgba(3,8,14,0.9);border:1px solid rgba(214,230,240,0.2)">
        <span style="position:absolute;inset:0;width:42%;background:${ink}"></span>
      </span>
      <span><span class="dim">SIG</span> <span style="color:${ink}">40</span></span>
      <span class="dim" style="font-size:11px">DRIVE HUM</span>
      <span style="flex:1 1 auto"></span>
      <span class="dim" style="font-size:11px">THE VENTFRONT DIVIDE</span>
      <span class="dim" style="font-size:11px">T+06:12</span>
      <span class="dim" style="font-size:11px">4 contacts</span>
    </div>
  </div>`;
}

/** The ribbon as drawn: a bare 14 px strip, its labels hanging off the side. */
function ribbon() {
  return `
  <div style="position:absolute;left:12px;top:48px;width:14px;height:590px;background:rgba(13,28,40,0.85);border:1px solid rgba(255,61,166,0.35)">
    <div style="position:absolute;inset:0;top:0;height:5%;background:repeating-linear-gradient(135deg, ${NEON.red}55 0 2px, transparent 2px 6px)"></div>
    <div style="position:absolute;left:0;right:0;top:13.3%;height:1px;background:${NEON.magenta};opacity:0.7"></div>
    <div style="position:absolute;left:0;right:0;top:60%;height:1px;background:${NEON.magenta};opacity:0.7"></div>
    <div style="position:absolute;left:0;right:0;top:38%;height:6.7%;background:${NEON.cyan}22"></div>
    <div style="position:absolute;left:0;right:0;top:40%;height:1px;background:${NEON.cyan};opacity:0.8"></div>
    <div style="position:absolute;left:-4px;right:-4px;top:34%;height:2px;background:${NEON.teal}"></div>
  </div>
  <div style="position:absolute;left:32px;top:48px;width:120px;height:590px;font-size:9px;letter-spacing:0.16em;color:${TEXT.dim}">
    <div style="position:absolute;top:calc(13.3% - 5px)">SHELF</div>
    <div style="position:absolute;top:calc(40% - 5px);color:${TEXT.cyan}">DUCT</div>
    <div style="position:absolute;top:calc(60% - 5px)">MID</div>
    <div style="position:absolute;top:calc(96% - 5px)">ABYSS</div>
  </div>
  <div style="position:absolute;left:12px;top:644px;font-size:10px;letter-spacing:0.14em;color:${TEXT.cyan}">640m</div>`;
}

function scope() {
  return `<div style="position:absolute;left:10px;bottom:90px;width:185px;height:160px;border:1px solid rgba(53,224,255,0.35);overflow:hidden">
    ${scopeFace(183)}
  </div>`;
}

function log() {
  return `<div style="position:absolute;right:10px;top:38px;width:340px;border:1px solid rgba(255,61,166,0.45);border-radius:4px;background:${BLACK.glass}">
    <div style="padding:4px 8px;font-family:${FONT.display};font-size:13px;font-weight:600;letter-spacing:0.16em;color:${TEXT.cyan};border-bottom:1px solid rgba(255,61,166,0.3);text-align:center">CONTACT LOG</div>
    ${logRows(7, 10)}
  </div>`;
}

/** The card, where it sits: over the last words of the hint line. */
function card() {
  return `<div style="position:absolute;right:12px;bottom:96px;width:240px;border:1px solid rgba(53,224,255,0.4);border-radius:3px;background:${BLACK.glass}">
    <div class="row" style="justify-content:space-between;align-items:center;padding:5px 8px 3px">
      <span style="font-family:${FONT.display};font-weight:600;font-size:15px;letter-spacing:0.08em;color:${NEON.cyan}">CORVETTE</span>
      <span style="font-size:10px;letter-spacing:0.1em;color:${TEXT.dim};border:1px solid ${TEXT.dim};border-radius:2px;padding:1px 5px">PR2</span>
    </div>
    <div style="height:5px;margin:0 8px;background:${NEON.teal}"></div>
    <div style="padding:5px 8px 7px;font-size:12px;letter-spacing:0.08em;color:${TEXT.dim};text-align:left">
      <div>HULL 420/420&nbsp;&nbsp;&nbsp;SIG 28</div>
      <div>systems live · 640m</div>
    </div>
  </div>`;
}

function commandBar() {
  const tab = (t, on) =>
    `<div style="height:24px;padding:0 11px;display:flex;align-items:center;font-size:11px;letter-spacing:0.12em;color:${on ? TEXT.bright : TEXT.dim};border:1px solid ${on ? NEON.magenta : 'rgba(214,230,240,0.18)'};border-radius:2px;margin-right:4px">${t}</div>`;
  const btn = ([t, on]) =>
    `<div style="height:40px;min-width:62px;padding:0 12px;display:flex;align-items:center;justify-content:center;font-size:12px;letter-spacing:0.1em;color:${on ? TEXT.dim : TEXT.bright};border:1px solid rgba(53,224,255,${on ? 0.15 : 0.35});border-radius:2px;opacity:${on ? 0.45 : 1}">${t}</div>`;
  return `
  <div style="position:absolute;left:0;right:0;bottom:0;height:80px;background:rgba(13,28,40,0.92)">
    <div class="row" style="height:24px;padding:0 10px;align-items:center">
      ${tab('BUILD', false)}${tab('UNITS', false)}${tab('SQUAD', true)}
      <span style="flex:1 1 auto"></span>
      ${tab('MENU', false)}
    </div>
    <div class="row" style="height:56px;padding:0 10px;gap:6px;align-items:center">${barButtons.map(btn).join('')}</div>
  </div>
  <div style="position:absolute;left:200px;bottom:84px;font-size:12px;letter-spacing:0.08em;color:${TEXT.dim}">${HINT}</div>`;
}

export function today() {
  return `<div class="frame">
    ${world('orders')}
    <div class="hud">
      ${topStrip()}${ribbon()}${scope()}${log()}${commandBar()}${card()}
    </div>
  </div>`;
}
