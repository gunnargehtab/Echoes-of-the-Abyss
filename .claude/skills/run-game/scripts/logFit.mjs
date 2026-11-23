/**
 * The contact log's rows across docs/ui-ux.md §11's scales, in a real engine,
 * as a `--steps` module (#1893).
 *
 *   SHOW_SCROLLBARS=1 VIEW_W=1440 VIEW_H=1200 \
 *     node .claude/skills/run-game/scripts/drive.mjs \
 *     --out /tmp/log-fit --steps .claude/skills/run-game/scripts/logFit.mjs
 *
 * §2 asks a panel to fit what it holds across 75–200%, and for a log row that
 * means no cell's ink lands on another's and none leaves the row. Glyph boxes
 * are a layout fact only an engine has, so this measures them: it writes five
 * probe rows in the log's own markup — §10's sample shapes, with the longest
 * tier word and a long hull name — at each scale, and reads every text line's
 * client rect.
 *
 * `VIEW_H` 1200 because §11 holds the HUD's scale to what the window carries:
 * 200% needs 1,168 px of height, so the default 900 px window measures 154%
 * when asked for 200%. Run it at `VIEW_W=901` too: the log is hidden at
 * 900 px and below, and the rows crowd most just above that.
 *
 * `SHOW_SCROLLBARS=1` because Playwright launches headless Chromium with
 * `--hide-scrollbars`, and a player's log, 300 rows deep, always shows one: on
 * a 950 px window at 200% its 15 px were the difference between the widest
 * detail fitting and running 9 px past the row. So the drive fills the log
 * until it scrolls and refuses to measure if the scrollbar takes no width.
 *
 * Deliberately not part of `npm test`, for `escFocus.mjs`'s reasons. It fails
 * loudly — a thrown error, which drive.mjs turns into a non-zero exit. With
 * `LOG_FIT_OUT` set it also saves the panel alone at each scale there.
 */

const SCALES = [0.75, 1, 1.25, 1.5, 2];

/**
 * Class, time, tier, label and the detail's tokens, in `ContactLog.tsx`'s
 * words and markup: each token a `contact-log-detail-part`, three spaces of
 * text between them.
 */
const PROBES = [
  ['tier-1', 'T+04:12', 'HEARD', 'contact', ['bearing unknown']],
  ['tier-2', 'T+03:58', 'BEARING', 'contact', ['bearing 245°', '~1400 m']],
  [
    'tier-3',
    'T+04:09',
    'CLASSIFIED',
    'Directorate Abyssal Submersible',
    ['bearing 118°', '~2100 m'],
  ],
  ['tier-4', 'T+12:40', 'TRACKED', 'Consortium Corvette', ['bearing 359°', '~11800 m']],
  ['tier-1 mark', 'T+03:51', 'MARK', 'industrial hum', ['bearing 310°', 'decaying']],
];

function check(ok, message) {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) throw new Error(message);
}

/** Put the client at one of §11's scales and get back into the same match. */
async function atScale(page, scale) {
  await page.evaluate((ui) => {
    const raw = localStorage.getItem('echoes.settings');
    const next = raw === null ? {} : JSON.parse(raw);
    next.uiScale = ui;
    localStorage.setItem('echoes.settings', JSON.stringify(next));
  }, scale);
  await page.reload();
  await page.locator('.menu-resume').click({ timeout: 20000 });
  // Polled on an interval rather than per frame: on a software rasteriser at
  // `VIEW_DPR=2` a frame can take longer than the whole default wait.
  await page.waitForFunction(() => document.querySelector('.contact-log-entries') !== null, null, {
    polling: 500,
    timeout: 60000,
  });
  await page.waitForTimeout(4000);
}

/** Every probe row's ink: overlap between cells, and ink past the row's edge. */
function measure(probes) {
  const list = document.querySelector('.contact-log-entries');
  const write = ([cls, time, tier, label, parts], probe) => {
    const row = document.createElement('button');
    row.className = `contact-log-row ${cls}${probe ? ' probe' : ''}`;
    for (const [cell, text] of [
      ['time', time],
      ['tier', tier],
      ['label', label],
    ]) {
      const span = document.createElement('span');
      span.className = `contact-log-${cell}`;
      span.textContent = text;
      row.appendChild(span);
    }
    const detail = document.createElement('span');
    detail.className = 'contact-log-detail';
    parts.forEach((part, i) => {
      if (i > 0) detail.appendChild(document.createTextNode('   '));
      const span = document.createElement('span');
      span.className = 'contact-log-detail-part';
      span.textContent = part;
      detail.appendChild(span);
    });
    row.appendChild(detail);
    list.appendChild(row);
  };
  // Filler first, so the probes are the newest rows and the list scrolls.
  for (let i = 0; i < 40 && list.scrollHeight <= list.clientHeight; i++) write(probes[0], false);
  for (const probe of probes) write(probe, true);
  list.scrollTop = list.scrollHeight;
  const scrollbar = list.offsetWidth - list.clientWidth;
  // Text nodes only: a range over the cell would also return each token
  // span's own box, and count every detail token twice.
  const ink = (el) => {
    const rects = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      rects.push(...range.getClientRects());
    }
    return rects;
  };
  const area = (p, q) =>
    Math.max(0, Math.min(p.right, q.right) - Math.max(p.left, q.left)) *
    Math.max(0, Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top));
  const root = getComputedStyle(document.querySelector('.game-root'));
  return {
    drawn: Number(root.getPropertyValue('--ui-scale')),
    panel: document.querySelector('.contact-log').clientWidth,
    scrollbar,
    rows: [...list.querySelectorAll('.probe')].map((row) => {
      const cells = [...row.children];
      const edge = row.getBoundingClientRect();
      let overlap = 0;
      let outside = 0;
      cells.forEach((cell, i) => {
        for (const p of ink(cell)) {
          outside += Math.max(0, p.right - edge.right) + Math.max(0, edge.left - p.left);
          for (const other of cells.slice(i + 1)) {
            for (const q of ink(other)) overlap += area(p, q);
          }
        }
      });
      return {
        tier: cells[1].textContent,
        overlap: Math.round(overlap),
        outside: Math.round(outside),
      };
    }),
  };
}

export default async ({ page, shot }) => {
  await page.waitForTimeout(3000);
  const out = process.env.LOG_FIT_OUT;
  for (const scale of SCALES) {
    // Unconditionally, 100% included: `readoutGuards.mjs` says why.
    await atScale(page, scale);
    const { drawn, panel, scrollbar, rows } = await page.evaluate(measure, PROBES);
    const label = `${scale * 100}% (drawn ${Math.round(drawn * 100)}%, ${panel} px panel)`;
    check(
      scrollbar > 0,
      `${label}: the log's scrollbar takes ${scrollbar} px, as a player's does` +
        (scrollbar > 0 ? '' : ' — run the drive with SHOW_SCROLLBARS=1')
    );
    for (const row of rows) {
      check(
        row.overlap === 0 && row.outside === 0,
        `${label}: the ${row.tier} row keeps its ink to itself` +
          ` (${row.overlap} px² on another cell, ${row.outside} px past the row)`
      );
    }
    if (out !== undefined) {
      // A clip of the page rather than an element shot: the panel sits over a
      // live scene, and Playwright's wait for an element to be "stable" never
      // ends while the world under it moves.
      const clip = await page.locator('.contact-log').boundingBox();
      await page.screenshot({ path: `${out}/contact-log-${scale * 100}.png`, clip });
    }
    await shot(`log-${String(scale).replace('.', '-')}`);
  }
};
