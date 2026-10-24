// A headless browser held open and driven one input at a time over HTTP, so a
// walk can look at each frame before it chooses the next input (#1577).
// drive.mjs scripts a whole run; a newcomer's walk cannot be scripted ahead,
// because what to press next is the finding.
//
//   node docs/screenshots/issue-1577/walk.cjs <out-dir> [port]
//   curl -s -X POST localhost:7777 -d '[["shot","landing"],["text"]]'
//
// Each POST is a JSON list of steps, run in order; the reply lists what the
// steps returned. Steps: click x y [button], drag x0 y0 x1 y1, move x y,
// key code, down code, up code, wait ms, wheel x y dy, role name label,
// sel selector, eval js, text, shot name, errors.
const http = require('http');
const { execSync } = require('child_process');
const { chromium } = require(`${execSync('npm root -g').toString().trim()}/playwright`);

const OUT = process.argv[2];
const PORT = Number(process.argv[3] ?? 7777);
let shots = 0;
let errors = [];

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });

  const steps = {
    click: (x, y, button) => page.mouse.click(x, y, button ? { button } : {}),
    // The HUD's box select is a left drag; Playwright's mouse has no drag of
    // its own, so it is the three calls a hand makes.
    drag: async (x0, y0, x1, y1) => {
      await page.mouse.move(x0, y0);
      await page.mouse.down();
      await page.mouse.move(x1, y1, { steps: 10 });
      await page.mouse.up();
    },
    move: (x, y) => page.mouse.move(x, y),
    key: (code) => page.keyboard.press(code),
    down: (code) => page.keyboard.down(code),
    up: (code) => page.keyboard.up(code),
    wait: (ms) => page.waitForTimeout(ms),
    // The wheel listener is on the canvas, so the pointer must be over it.
    wheel: async (x, y, dy) => {
      await page.mouse.move(x, y);
      await page.mouse.wheel(0, dy);
    },
    role: (role, name) => page.getByRole(role, { name }).click(),
    sel: (selector) => page.click(selector),
    eval: (js) => page.evaluate(js),
    text: () => page.evaluate(() => document.body.innerText),
    shot: async (name) => {
      const file = `${OUT}/${String(++shots).padStart(3, '0')}-${name}.png`;
      await page.screenshot({ path: file });
      return file;
    },
    errors: () => {
      const seen = errors;
      errors = [];
      return seen;
    },
  };

  http
    .createServer(async (req, res) => {
      let body = '';
      for await (const chunk of req) body += chunk;
      const out = [];
      try {
        for (const [op, ...args] of JSON.parse(body || '[]')) {
          const value = await steps[op](...args);
          if (value !== undefined) out.push(value);
        }
      } catch (e) {
        out.push(`ERR ${e.message}`);
      }
      res.end(JSON.stringify(out, null, 1));
    })
    .listen(PORT, () => console.log(`walk: listening on ${PORT}`));
}

main();
