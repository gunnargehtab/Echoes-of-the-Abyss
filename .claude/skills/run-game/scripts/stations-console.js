/**
 * The gate-6 review drive for a browser Playwright cannot reach (#286).
 *
 * The Termux floor is the case: Chrome on the phone, the server in the same
 * device's userspace, and nothing to run stations.mjs from. So this is the same
 * five stations as a paste into the page's own console — reached from a PC
 * through edge://inspect/#devices (or chrome://inspect) with USB debugging on.
 *
 * It drives the stations with the *mouse* path, not touch, and that is
 * deliberate rather than a desktop habit: touch has no marquee and no
 * select-all, so a touch-driven `marquee` would ring one hull and read as a
 * cheaper station than the desktop row it is compared against. EchoRenderer's
 * listeners sit on the Pixi canvas and branch on `pointerType`, and its
 * pointer capture is try-wrapped, so synthetic events take the real path.
 *
 * Paste it whole with the match live (past Ready), the screen on, and hands
 * off the device for about ninety seconds. It prints a table and copies the
 * result to the inspecting PC's clipboard. `window.__stationSeconds` shortens
 * the dwell; the default of fifteen covers the 240-frame average window at
 * twenty frames a second, which is the floor this exists to measure.
 */
(async () => {
  const S = window.__stationSeconds ?? 15;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const W = innerWidth;
  const H = innerHeight;
  const cx = W / 2;
  const cy = H * 0.45;
  const target = () => document.elementFromPoint(cx, cy);
  const ptr = (type, x, y, button = 0) =>
    target().dispatchEvent(
      new PointerEvent(type, {
        pointerId: 99,
        pointerType: 'mouse',
        isPrimary: true,
        bubbles: true,
        button,
        buttons: type === 'pointerup' ? 0 : button === 2 ? 2 : 1,
        clientX: x,
        clientY: y,
      })
    );
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  const wheel = (deltaY) =>
    target().dispatchEvent(
      new WheelEvent('wheel', { deltaY, clientX: cx, clientY: cy, bubbles: true, cancelable: true })
    );
  // Stepped, because a jump from corner to corner is a click and picks one hull.
  const marquee = async () => {
    ptr('pointerdown', W * 0.3, H * 0.3);
    for (let i = 1; i <= 8; i++) {
      ptr('pointermove', W * (0.3 + i * 0.05), H * (0.3 + i * 0.0375));
      await sleep(30);
    }
    ptr('pointerup', W * 0.7, H * 0.6);
    await sleep(600);
  };

  const rows = [];
  // The setup is charged to nobody: the boundary comes after it, as in stations.mjs.
  const station = async (label, setUp) => {
    if (setUp) await setUp();
    window.__perspectiveStation(label);
    await sleep(S * 1000);
    const p = window.__perspectiveProbe();
    rows.push({ label, ...p });
    console.log(`${label}: ${p.fps} fps, ${p.stationFrames} frames`);
  };

  await station('base');
  await station('marquee', marquee);
  await station('ping-preview', async () => {
    key('keydown', 'AltLeft');
    await sleep(400);
  });
  key('keyup', 'AltLeft');
  await station('survey-zoom', async () => {
    for (let i = 0; i < 8; i++) {
      wheel(240);
      await sleep(80);
    }
    await sleep(600);
  });
  await station('fight', async () => {
    for (let i = 0; i < 5; i++) {
      wheel(-240);
      await sleep(80);
    }
    await marquee();
    key('keydown', 'KeyN');
    await sleep(300);
    key('keydown', 'KeyM');
    await sleep(300);
    ptr('pointerdown', cx + W * 0.15, cy - H * 0.1, 2);
    ptr('pointerup', cx + W * 0.15, cy - H * 0.1, 2);
    await sleep(400);
    key('keydown', 'KeyP');
    await sleep(600);
  });

  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  const out = {
    renderer: gl ? String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : 'no webgl2',
    ua: navigator.userAgent,
    viewport: [W, H, devicePixelRatio],
    seconds: S,
    rows: rows.map((p) => ({
      station: p.label,
      frames: p.stationFrames,
      avgFrames: p.avgFrames,
      fps: p.fps,
      frame: [p.avgFrameMs, p.worstFrameMs],
      conn: [p.avgConnMs, p.worstConnMs],
      overlay: [p.avgOverlayMs, p.worstOverlayMs],
      overlayFrames: p.overlayFrames,
      calls: p.drawCalls,
      tris: p.triangles,
      ordnance: p.ordnance,
    })),
  };
  console.table(out.rows);
  console.log(JSON.stringify(out));
  // `copy` is the console's own helper, and absent anywhere else.
  try {
    copy(JSON.stringify(out));
    console.log('copied to clipboard');
  } catch {
    // Not in a console: the caller reads the return value instead.
  }
  return out;
})();
