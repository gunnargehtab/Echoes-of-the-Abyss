// The mission log's foot against the hint line's row (docs/ui-ux.md §2, #1762),
// as a run-game steps module. It waits for the log to hold a line, selects the
// nearest own hull so the hint line runs long, and writes where the log's box
// and the hint line stand, in window px, beside a frame of the bottom-right
// corner.
//
//   SETTINGS_JSON='{"uiScale":1.25}' node .claude/skills/run-game/scripts/drive.mjs \
//     --url 'http://localhost:5173/?mission=prologue-sorrowgate' \
//     --out docs/screenshots/issue-1762/after --steps docs/screenshots/issue-1762/frames.mjs
//
// The hint row is the 20 units above the 208-unit console; HINT_ROW_UNITS adds
// a 4-unit breath above it. Both scale with the HUD.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const CONSOLE = 208;
const HINT = 20;
const BREATH = 4;

export default async ({ page, shot }) => {
  await page.waitForSelector('.mission-log-row', { timeout: 120000 });
  await page.mouse.click(720, 450);
  await page.waitForTimeout(1500);
  const reading = await page.evaluate(
    ({ CONSOLE, HINT, BREATH }) => {
      const scale = Number(
        getComputedStyle(document.querySelector('.game-root')).getPropertyValue('--ui-scale')
      );
      const log = document.querySelector('.mission-log').getBoundingClientRect();
      const h = window.innerHeight;
      const hint = window.__echoHint?.() ?? null;
      return {
        viewport: { width: window.innerWidth, height: h },
        uiScale: scale,
        log: { left: Math.round(log.left), top: Math.round(log.top), bottom: Math.round(log.bottom) },
        hintRowTop: Math.round(h - (CONSOLE + HINT) * scale),
        breathTop: Math.round(h - (CONSOLE + HINT + BREATH) * scale),
        hint: hint && { x: Math.round(hint.x), end: Math.round(hint.x + hint.width), text: hint.text },
      };
    },
    { CONSOLE, HINT, BREATH }
  );
  reading.logFootInRowPx = Math.max(0, reading.log.bottom - reading.hintRowTop);
  const path = await shot('corner');
  writeFileSync(join(dirname(path), 'reading.json'), JSON.stringify(reading, null, 2) + '\n');
  console.log(JSON.stringify(reading));
};
