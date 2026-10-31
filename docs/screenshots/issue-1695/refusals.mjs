/**
 * #1695's capture of Sorrowgate's two refusals, as a run-game `--steps`
 * module (docs/sorrowgate-arch-study.md §9: "Demonstrate sonar and
 * construction refusal separately, with their real feedback").
 *
 *   VIEW_W=1920 VIEW_H=1080 TAG=court \
 *     node .claude/skills/run-game/scripts/drive.mjs --entry tutorial \
 *     --out <dir> --steps docs/screenshots/issue-1695/refusals.mjs
 *
 * In the court it selects the flight, presses P, waits out the hint bar's
 * refusal, then presses R and clicks the water where a placement would land.
 * A frame is taken before each press and after it, at H's unmodified opening
 * camera, so neither refusal is staged to light the frame.
 *
 * The feedback is the hint bar's line and nothing else: the interface cue
 * (docs/audio-direction.md §12) is off by default, and the refusal is the
 * shell's, not the room's, so the proof that nothing happened is on the
 * socket. Every client message the page sends from the first press on is
 * logged by its type, read off Colyseus' ROOM_DATA frame, and `<TAG>.json`
 * carries the log beside each frame's tick. The same module against a
 * skirmish (`--url 'http://localhost:5173/?map=ventfront-divide'`, no
 * `--entry`) is the positive control: there P sends `ping`.
 */
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TAG = process.env.TAG ?? 'refusals';
const OUT = resolve(process.argv[process.argv.indexOf('--out') + 1]);
/** How long a refusal stays on the hint bar (EchoRenderer.ts `REFUSAL_MS`), and a margin. */
const REFUSAL_WAIT_MS = 4000 + 1500;
/** Colyseus' protocol code for a room message (`Protocol.ROOM_DATA`). */
const ROOM_DATA = 13;

export default async ({ page }) => {
  // Log what the socket sends. The room's socket is open before a steps
  // module runs, so the hook goes on the prototype rather than on a new one.
  await page.evaluate((roomData) => {
    window.__sent = [];
    const send = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data) {
      // The dev server's own socket shares the page's host and sends its
      // keepalive as text (`{"type":"ping"}`, Vite's HMR client), which is
      // not the room's ping. Only the room's socket is logged.
      if (new URL(this.url).host === location.host) return send.call(this, data);
      const bytes =
        data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : ArrayBuffer.isView(data)
            ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
            : null;
      let type = null;
      // A ROOM_DATA frame's type follows as a msgpack fixstr: a length
      // byte 0xa0–0xbf, then the name (wire.ts' message names).
      if (bytes !== null && bytes[0] === roomData && (bytes[1] & 0xe0) === 0xa0) {
        const n = bytes[1] & 0x1f;
        type = new TextDecoder().decode(bytes.subarray(2, 2 + n));
      }
      window.__sent.push({
        tick: window.__echoClock?.() ?? null,
        type,
        // Anything that is not a room message, by its first byte or its text.
        other: type !== null ? null : bytes !== null ? `code ${bytes[0]}` : String(data),
      });
      return send.call(this, data);
    };
  }, ROOM_DATA);

  const env = await page.evaluate(async () => {
    for (;;) {
      const p = window.__perspectiveProbe?.();
      if (p && p.modelBacked > 0 && typeof window.__echoClock === 'function') break;
      await new Promise((r) => setTimeout(r, 100));
    }
    // The hulls swap from sprites to models in the background; the frames
    // want the models.
    await new Promise((r) => setTimeout(r, 5000));
    return {
      url: location.href,
      viewport: [innerWidth, innerHeight],
      dpr: devicePixelRatio,
      settings: localStorage.getItem('echoes.settings'),
      opening: window.__perspectiveProbe(),
    };
  });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  const take = async (name) => {
    const tick = await page.evaluate(() => window.__echoClock());
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const file = `${TAG}-${name}.png`;
    writeFileSync(join(OUT, file), Buffer.from(data, 'base64'));
    console.log(`shot: ${join(OUT, file)} at tick ${tick}`);
    frames.push({ name, file, tick });
  };
  const sentSince = (from) => page.evaluate((i) => window.__sent.slice(i), from);
  const mark = () => page.evaluate(() => window.__sent.length);

  // The flight: a marquee over the middle of the view, where the opening
  // camera centres the player's own hulls.
  const { width: w, height: h } = page.viewportSize();
  await page.mouse.move(w * 0.3, h * 0.3);
  await page.mouse.down();
  await page.mouse.move(w * 0.7, h * 0.7, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1000);
  await take('selected');

  const presses = [];
  let from = await mark();
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(600);
  await take('after-P');
  await page.waitForTimeout(REFUSAL_WAIT_MS);
  presses.push({ key: 'P', sent: await sentSince(from) });

  from = await mark();
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(600);
  await take('after-R');
  // A click where the placement would go: with no ghost armed it selects,
  // and no `build` leaves the page.
  await page.mouse.click(w * 0.55, h * 0.4);
  await page.waitForTimeout(1500);
  await take('after-click');
  presses.push({ key: 'R, then a click on the water', sent: await sentSince(from) });
  await page.keyboard.press('Escape');

  for (const p of presses) {
    console.log(`${p.key}: sent [${p.sent.map((m) => m.type ?? m.other).join(', ')}]`);
  }
  writeFileSync(join(OUT, `${TAG}.json`), JSON.stringify({ ...env, frames, presses }, null, 2));
};
