// #1495: what a board launch's join blocks on. The board, then ENTRIES entries
// and exits. Each entry counts the programs linked, the time a read of a
// program's status or log blocked (each read over 2 ms, named by three's
// SHADER_NAME), and the frames over 50 ms, from Descend to a second at full
// fade. Run on the named GPU, unpaced:
//   ENTRIES=3 UNPACED=1 VIEW_DPR=1 READINGS=<dir>/readings.json \
//     node .dev-loop/drive-board-tmp.mjs --headed --channel chrome \
//     --url http://localhost:5173/ --out <dir> \
//     --steps docs/screenshots/issue-1495/join.mjs
// drive-board-tmp.mjs is the run-game skill's drive.mjs with its title, Solo
// and lobby steps removed, as docs/screenshots/issue-1463/world.mjs says.
import { writeFileSync } from 'node:fs';

const ENTRIES = Number(process.env.ENTRIES ?? 3);

export default async ({ page }) => {
  const rows = [];
  const log = (row) => {
    rows.push(row);
    console.log(JSON.stringify(row));
  };

  // Every context's calls go through the prototype, so a patch now counts a
  // context made before it too.
  await page.evaluate(() => {
    const gl = window.__gl1495 = { on: false, links: 0, linkMs: 0, waits: 0, waitMs: 0, worstWaitMs: 0, compiles: 0 };
    const LINK_STATUS = 0x8b82;
    // three names each shader (#define SHADER_NAME); a program takes its vertex shader's.
    const shaderName = new WeakMap();
    const programName = new WeakMap();
    gl.list = [];
    gl.t0 = performance.now();
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      const source = proto.shaderSource;
      proto.shaderSource = function (shader, text) {
        const m = /#define SHADER_NAME (\S+)/.exec(text);
        const t = /#define SHADER_TYPE (\S+)/.exec(text);
        shaderName.set(shader, (m?.[1] ?? '?') + (t ? ':' + t[1] : ''));
        return source.call(this, shader, text);
      };
      const attach = proto.attachShader;
      proto.attachShader = function (program, shader) {
        if (!programName.has(program)) programName.set(program, shaderName.get(shader));
        return attach.call(this, program, shader);
      };
    }
    gl.nameOf = (program) => programName.get(program) ?? '?';
    const time = (name, fn) =>
      function (...args) {
        if (!gl.on) return fn.apply(this, args);
        const t = performance.now();
        try {
          return fn.apply(this, args);
        } finally {
          const ms = performance.now() - t;
          if (name === 'link') {
            gl.links++;
            gl.linkMs += ms;
          } else if (name === 'compile') gl.compiles++;
          else if (name === 'log' || (name === 'param' && args[1] === LINK_STATUS)) {
            gl.waits++;
            gl.waitMs += ms;
            gl.worstWaitMs = Math.max(gl.worstWaitMs, ms);
            if (ms > 2) gl.list.push({ atMs: Math.round(t - gl.t0), ms: Math.round(ms), name: gl.nameOf(args[0]), call: name });
          }
        }
      };
    for (const proto of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
      proto.linkProgram = time('link', proto.linkProgram);
      proto.compileShader = time('compile', proto.compileShader);
      proto.getProgramInfoLog = time('log', proto.getProgramInfoLog);
      proto.getProgramParameter = time('param', proto.getProgramParameter);
    }
  });

  const openBoard = async () => {
    await page.waitForSelector('.campaign-board', { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('.world-backdrop canvas') !== null, null, {
      timeout: 30000,
    });
  };

  const enter = async (tag) => {
    await page.locator('.campaign-slot').first().click();
    await page.getByRole('region', { name: 'Briefing' }).waitFor();
    await page.evaluate(() => {
      const gl = window.__gl1495;
      Object.assign(gl, { on: true, links: 0, linkMs: 0, waits: 0, waitMs: 0, worstWaitMs: 0, compiles: 0, list: [], t0: performance.now() });
      const s = (window.__long1495 = { on: true, long: [], frames: 0 });
      const t0 = performance.now();
      let last = t0;
      const tick = (now) => {
        if (!s.on) return;
        s.frames++;
        if (now - last > 50) {
          const p = window.__perspectiveProbe?.();
          s.long.push({ atMs: Math.round(last - t0), ms: Math.round(now - last), sessionGround: p?.world?.sessionGround, units: p?.units });
        }
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const t0 = Date.now();
    await page.getByRole('button', { name: 'Descend' }).click();
    await page.waitForFunction(
      () => {
        const p = window.__perspectiveProbe?.();
        return p?.world?.sessionGround === true && p.units > 0 && p.world.borderStrength === 1;
      },
      null,
      { timeout: 60000 }
    );
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => {
      window.__long1495.on = false;
      window.__gl1495.on = false;
      const { nameOf, ...gl } = window.__gl1495;
      return { gl, long: window.__long1495.long, frames: window.__long1495.frames };
    });
    const held = await page.evaluate(() => window.__perspectiveProbe?.()?.programHold ?? null);
    log({ entry: tag, ms: Date.now() - t0, ...r.gl, frames: r.frames, longFrames: r.long, held });
  };

  const leave = async () => {
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /Return to port/ }).click();
    await page.getByRole('button', { name: /Abandon the water/ }).click();
    await openBoard();
    await page.waitForTimeout(6000);
  };

  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  await page.getByRole('button', { name: 'Campaign' }).click();
  await openBoard();
  // The board's baseline built (#1499's reuse needs it), and the board's programs linked.
  await page.waitForTimeout(8000);
  for (let i = 1; i <= ENTRIES; i++) {
    await enter(i);
    if (i < ENTRIES) await leave();
  }
  if (process.env.READINGS) writeFileSync(process.env.READINGS, JSON.stringify(rows, null, 2));
};
