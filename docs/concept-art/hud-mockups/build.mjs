/**
 * Emit the ten artboards and the canvas manifest.
 *
 *   node docs/concept-art/hud-mockups/build.mjs
 *
 * Writes into `artboards/` beside this file. The `.dc.html` files are the
 * canvas's working files: seed from them, never from the published page.
 *
 * The frames are not a gate and never will be — a mockup is an argument, and
 * the things that settle an argument about this interface are docs/ui-ux.md and
 * a person looking at it. What this script buys is that all ten frames draw the
 * same water from the same tokens, so the comparison is about chrome alone.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { artboard } from './chrome.mjs';
import { today } from './designToday.mjs';
import { ringRest, ringOrders, ringBuild, RING_CSS } from './designRing.mjs';
import { classicRest, classicOrders, classicBuild } from './designClassic.mjs';
import { improvedRest, improvedOrders, improvedBuild } from './designImproved.mjs';
import { FRAME } from './tokens.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'artboards');

/**
 * `Main` holds the chosen direction, which is the console (B). The two
 * unchosen directions keep their artboards and move to a second page: the
 * comparison is the record of why the console won, and a record deleted is a
 * decision that gets re-argued.
 */
const FRAMES = [
  { file: 'Today.dc.html', title: 'Today — baseline', body: today, css: '', page: 'page-1' },
  {
    file: 'Main.dc.html',
    title: 'B · Console — at rest',
    body: classicRest,
    css: '',
    page: 'page-1',
  },
  {
    file: 'ClassicOrders.dc.html',
    title: 'B · Console — giving orders',
    body: classicOrders,
    css: '',
    page: 'page-1',
  },
  {
    file: 'ClassicBuild.dc.html',
    title: 'B · Console — production',
    body: classicBuild,
    css: '',
    page: 'page-1',
  },
  {
    file: 'RingRest.dc.html',
    title: 'A · Ring — at rest',
    body: ringRest,
    css: RING_CSS,
    page: 'page-2',
  },
  {
    file: 'RingOrders.dc.html',
    title: 'A · Ring — giving orders',
    body: ringOrders,
    css: RING_CSS,
    page: 'page-2',
  },
  {
    file: 'RingBuild.dc.html',
    title: 'A · Ring — production',
    body: ringBuild,
    css: RING_CSS,
    page: 'page-2',
  },
  {
    file: 'ImprovedRest.dc.html',
    title: 'C · Improved — at rest',
    body: improvedRest,
    css: '',
    page: 'page-2',
  },
  {
    file: 'ImprovedOrders.dc.html',
    title: 'C · Improved — giving orders',
    body: improvedOrders,
    css: '',
    page: 'page-2',
  },
  {
    file: 'ImprovedBuild.dc.html',
    title: 'C · Improved — production',
    body: improvedBuild,
    css: '',
    page: 'page-2',
  },
];

const PAGES = [
  { id: 'page-1', name: 'Console — chosen' },
  { id: 'page-2', name: 'Not chosen' },
];

/** One row per design, 160 px between frames and 200 px between rows. */
const COL = [0, 2080, 4160];
const ROW = { today: 0, console: 1280, ring: 0, improved: 1280 };
const PLACE = {
  'Today.dc.html': [COL[0], ROW.today],
  'Main.dc.html': [COL[0], ROW.console],
  'ClassicOrders.dc.html': [COL[1], ROW.console],
  'ClassicBuild.dc.html': [COL[2], ROW.console],
  'RingRest.dc.html': [COL[0], ROW.ring],
  'RingOrders.dc.html': [COL[1], ROW.ring],
  'RingBuild.dc.html': [COL[2], ROW.ring],
  'ImprovedRest.dc.html': [COL[0], ROW.improved],
  'ImprovedOrders.dc.html': [COL[1], ROW.improved],
  'ImprovedBuild.dc.html': [COL[2], ROW.improved],
};

const NOTE_X = -520;
const NOTE_W = 440;

const NOTES = [
  {
    id: 'how-to-read',
    page: 'page-1',
    x: COL[1],
    y: ROW.today + 120,
    w: 620,
    text: `HOW TO READ THIS

Ten frames of one moment. The same water, the same fleet, the same four contacts at Tier 1, 2, 3 and 4 — only the chrome changes, because a comparison whose frames disagree about the scene is not one.

Top row is what the client draws today. Each row below is one design at rest, giving orders, and mid-production.

Every colour, font, panel measurement and price is lifted from packages/frontend — palette.ts, index.css and the geometry constants at the head of EchoRenderer.ts. No ink here is invented.

The three designs answer the same four complaints: the HUD has no material, no hierarchy, no visible production, and too many flat identical order buttons.`,
  },
  {
    id: 'note-today',
    page: 'page-1',
    x: NOTE_X,
    y: ROW.today,
    w: NOTE_W,
    text: `TODAY — THE BASELINE

What EchoRenderer draws now, transcribed rather than flattered: a 30 px strip, an 80 px bar of a 24 px tab row over a 56 px button row, the ribbon at x 12 and 14 wide, the log at top 38 / right 10 / width 340.

The four faults this comparison is about:

· No material. Hairline boxes on near-black. The plate VI card in style-neon-noir.md — glass, a magenta bevel with one halo, a cyan header band, corner registration ticks, one diagonal grain — is not implemented in-match at all.

· No hierarchy. SIG 40 weighs exactly what NODULES 600 weighs, and ten identical rectangles sit in a row with nothing saying which matters now.

· Production is behind the UNITS tab. Nothing on screen says a yard is building, what it is building, or how long it has left.

· The selection card sits on the last words of the hint line. Look bottom right: "A rise" is under the card.`,
  },
  {
    id: 'note-ring',
    page: 'page-2',
    x: NOTE_X,
    y: ROW.ring,
    w: NOTE_W,
    text: `A · THE RING — NOT CHOSEN

Right-hold, or long-press on glass, and a ring of what the selection can do opens at the pointer. Release on a wedge commits, release on the dead centre cancels. There is no command bar at all.

KEEPS
· §3 — own loudness is never off screen.
· §6 — preview before commit. The orders frame shows the ping wedge under the pointer and both radii drawn on the water, which is a better fit for a mandatory preview than a bar button ever was.
· §11 — a 45° wedge is about 91 px of arc at the label radius, twice the 44 px touch floor. One gesture serves a mouse and a finger with no mode switch.

BREAKS §2 — "the centre 60% is always clear". The ring opens in it.

WHAT THE BREAK BUYS
Chrome at rest drops from about 22% of the frame to about 11%, and the centre is clear the entire time nobody is giving an order. The argument is that §2 was written against resident chrome, and a ring that exists only while a button is held is a different kind of thing.

COSTS, HONESTLY
Eight wedges is the ceiling, so a twelve-cell command set has to nest or shed. A ring cannot hold a production queue, so yards still need somewhere to live. And nothing is visible to learn from until you already know to hold the button.`,
  },
  {
    id: 'note-classic',
    page: 'page-1',
    x: NOTE_X,
    y: ROW.console,
    w: NOTE_W,
    text: `B · THE CLASSICAL CONSOLE — CHOSEN

One full-width console in fixed blocks: scope, selection with its stat block, group roster, a 4×3 command card, the production line. Nothing is behind a tab, and the twelve cells are always in the same twelve places.

KEEPS
Every information law untouched. Faction ink stays on hulls and contacts and never reaches chrome (§12.5); the roster shows own force only, never a hostile count (§10.5).

BREAKS §2's 22% chrome cap — the console plus the strip is about 30% of a 1080p frame.

WHAT THE BREAK BUYS
Permanence, which is the genre's oldest and best argument. The roster makes a group countable at a glance. The production block makes a queue readable without selecting anything. The command card is the one layout muscle memory genuinely works on, because a cell never moves.

COSTS, HONESTLY
It is the least interesting of the three to look at. It is the worst fit for a phone, where the blocks have to stack or scroll. And a game whose entire subject is a dark ocean gives a fifth of the ocean away to instrumentation.`,
  },
  {
    id: 'note-improved',
    page: 'page-2',
    x: NOTE_X,
    y: ROW.improved,
    w: NOTE_W,
    text: `C · IMPROVED — NOT CHOSEN

Same topology as today: strip, ribbon, scope, log, panel, bar. Nothing has moved, so anyone who knows the client already knows this. Four changes, one per fault.

· MATERIAL. The plate VI card implemented rather than paraphrased — glass at 86%, one magenta bevel with one halo, a cyan header band over a thin rule, corner registration ticks instead of a radius, and one diagonal grain across the whole HUD layer, never per panel.

· HIERARCHY. §3's meter at the size §3 actually specifies, with the zero-padded readout, hard colour stops, the transient spike as a lighter overlay, and the "3 units · 1 loud" line the shipped strip never grew. Stockpiles shrink to pay for it, because loudness is what kills you and the nodule count is bookkeeping.

· PRODUCTION IN THE OPEN. A yard strip above the bar — one row per line, what it is making, how long it has left, what is queued behind it — on screen whatever tab is open. The UNITS tab stops being where production hides and becomes only where it starts.

· ORDERS GROUPED BY COST. Posture toggles carry their state as light. Dive and rise become one control that names the rung between them. Ordnance is priced. The ping is pulled out alone in threat red, because §6 calls it the one interaction the UI may be pushy about.

The card moves into the bar, which is all it takes to fix the collision.

BREAKS §2's 22% cap — strip, yard strip and bar come to about 24%. The yard strip is what costs it, and it is the only one of the four changes that spends screen at all.

Everything else here is spec the client already owes and has not paid: §3's meter, the plate VI card, §13's priced buttons and the reason a greyed one gives.`,
  },
];

function main() {
  mkdirSync(OUT, { recursive: true });
  for (const f of FRAMES) {
    writeFileSync(join(OUT, f.file), artboard(f.body(), f.css), 'utf8');
  }

  const manifest = {
    artboards: FRAMES.map((f) => ({
      file: f.file,
      title: f.title,
      page: f.page,
      x: PLACE[f.file][0],
      y: PLACE[f.file][1],
      w: FRAME.w,
      h: FRAME.h,
    })),
    annotations: NOTES,
    pages: PAGES,
    launch: { view: 'canvas', page: 'page-1' },
  };
  writeFileSync(join(OUT, 'canvas.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log(`wrote ${FRAMES.length} artboards + canvas.json to ${OUT}`);
}

main();
