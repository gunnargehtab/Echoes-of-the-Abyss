/**
 * How render.mjs and inspect.mjs start Chromium, and how they tell a frame it
 * drew from an empty one. One copy, because the two drivers each carried their
 * own and the copies drifted (#1014).
 *
 * SwiftShader is the only GL in the Linux container that made the committed
 * portraits, and three's WebGL2 path needs it asked for by name, or the page
 * gets no context at all. Chromium 153 on Windows reads --use-gl=swiftshader
 * as no GL: its GPU process exits and the page's context is lost before the
 * first draw. --use-angle=swiftshader names the same rasteriser there: fed
 * their commit's inputs, it rebuilt four committed portraits, three byte for
 * byte and one within two levels. Linux keeps the flag the portraits were
 * made with until a render in that container says the same.
 */
export const CHROMIUM_ARGS = [
  '--no-sandbox',
  process.platform === 'win32' ? '--use-angle=swiftshader' : '--use-gl=swiftshader',
  '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox',
];

/**
 * Why the page's canvas holds no picture, or null. Runs in the page
 * (`page.evaluate(emptyFrame)`), after the page says it is ready. A lost
 * context still lets the page set __ready, and toDataURL still answers, with a
 * transparent frame, so a driver that wrote what came back reported success
 * over blank PNGs. One colour corner to corner also catches the pure black
 * that scene.html's makeTarget exists to prevent. Reads the frame back, so
 * the page keeps its drawing buffer (`preserveDrawingBuffer`), as both do.
 */
export function emptyFrame() {
  const canvas = document.querySelector('canvas');
  const gl = canvas?.getContext('webgl2');
  if (!gl || gl.isContextLost()) return 'the WebGL context was lost';
  const probe = document.createElement('canvas');
  probe.width = 64;
  probe.height = 36;
  const g = probe.getContext('2d', { willReadFrequently: true });
  g.drawImage(canvas, 0, 0, probe.width, probe.height);
  const px = new Uint32Array(g.getImageData(0, 0, probe.width, probe.height).data.buffer);
  return px.every((v) => v === px[0]) ? 'every pixel is one colour' : null;
}
