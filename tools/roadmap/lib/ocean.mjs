/**
 * The water behind the roadmap page. Reading down it is a dive.
 *
 * The page was a still chart with one moving thing on it, the lockup's
 * sounding. This module fills the water around the chart, and keeps to the two
 * arguments every mechanic in the game makes (CLAUDE.md, "Design constraints"):
 *
 * - **Depth.** Scrolling descends. Each section starts at a depth a design doc
 *   names — the Shelf's edge, the thermocline, the Abyssal line, the Lip — and
 *   the page ends on the Mouth's floor. A gauge reads the depth, and the water
 *   darkens downward, never upward (docs/style-neon-noir.md).
 * - **The Drift.** Five species from docs/bestiary.md, each at its working
 *   depth. The two that make light are visible, as they are in the game:
 *   lampfry, whose scatter is the one tell silence cannot suppress, and
 *   tetherjelly, which are chart data. The rest are found only by listening.
 * - **Sound.** The gauge's button, or a click on open water, pings. The ring
 *   resolves everything inside 900 m for three seconds and shows you to
 *   everything inside 2,400 (docs/systems-echo.md). A Sounder answers a ping; a
 *   Hollow strikes at one close enough. Over the Mouth, the echo comes back
 *   before the ping goes out.
 *
 * Every number in `DIVE` is transcribed from docs/, and test/ocean.test.mjs
 * reads those docs back, so a moved number fails a test rather than standing
 * wrong on a public page. Time is the one thing scaled: a 25 s reform and a
 * two-minute pursuit are game clocks, and a visitor stays for a scroll, so the
 * page runs them at `DIVE.clock` of game speed.
 *
 * The decoration budget is the style guide's: darkness is the default and a
 * glow must carry data. The water is near-black. The only light an animal
 * makes is its own bioluminescence. A contact is cyan only while a ping holds
 * it, and red is only the self-reveal ring, the colour the guide gives "ping
 * reveal radius". Under prefers-reduced-motion nothing moves: the water is
 * drawn once per scroll and no ping is offered.
 *
 * `ocean` runs in the browser. It is inlined by its own source text, so it
 * closes over nothing: `DIVE` and the three pure helpers arrive as arguments,
 * and the helpers are what the tests call in Node.
 */

export const DIVE = {
  // The Mouth's floor, glossary.md. The page's last pixel is this deep.
  floor: 4410,
  // Where each section starts. The Shelf ends at 400 m and the Abyssal begins
  // at 1,800 (systems-depth.md §1); the thermocline is at 1,200
  // (systems-depth.md); the Lip stands at 3,100 (glossary.md).
  anchors: [
    { selector: '#game', depth: 400 },
    { selector: '#play', depth: 1200 },
    { selector: '#next', depth: 1800 },
    { selector: '#past', depth: 3100 },
  ],
  bands: [
    { from: 0, name: 'Shelf' },
    { from: 400, name: 'Mid-water' },
    { from: 1800, name: 'Abyssal' },
  ],
  // Named water inside the bands. The Lid is the sour top ~150 m (world.md).
  marks: [
    { from: 0, to: 150, name: 'the Lid' },
    { from: 1150, to: 1250, name: 'thermocline' },
    { from: 3100, to: 4300, name: 'over the Mouth' },
    { from: 4300, to: 4410, name: 'the Mouth' },
  ],
  // The gauge's rail, top to bottom.
  ticks: [
    { depth: 400, name: 'Mid-water' },
    { depth: 1200, name: 'Thermocline' },
    { depth: 1800, name: 'Abyssal' },
    { depth: 3100, name: 'The Lip' },
    { depth: 4410, name: 'The Mouth' },
  ],
  // systems-echo.md, "Active sonar": Tier 4 on everything in 900 m for three
  // seconds; the pinger emits SIG 95 and is resolved inside 2,400 m.
  ping: { reveal: 900, self: 2400, holds: 3, sig: 95 },
  fauna: {
    // bestiary.md §4. Depths are "Where the Drift lives"; the rest is the
    // species' own paragraph.
    lampfry: { depth: 250, seeded: 100, scatter: 300, reform: 25 },
    draymaw: { depth: 900, pack: 5, interest: 22, closes: 1200 },
    tetherjelly: { depth: 1200, seeded: 100 },
    hollow: { depth: 1700, trigger: 500, commit: 70 },
    sounder: { depth: 2000, reach: [1300, 2700], holds: 120 },
  },
  // Where the Mouth's water starts: the Lip, glossary.md. From here down
  // it answers a ping before the ping is sent.
  lip: 3100,
  // Game seconds to page seconds.
  clock: 0.1,
};

/**
 * Depth at document height `y`, piecewise-linear through `points` — the
 * `{ y, depth }` pairs the browser measures from the anchors. Clamped at both
 * ends, so a page taller than its last anchor never reads deeper than the floor.
 */
export function depthAt(points, y) {
  if (points.length === 0) return 0;
  if (y <= points[0].y) return points[0].depth;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (y <= b.y)
      return b.y === a.y ? b.depth : a.depth + ((y - a.y) / (b.y - a.y)) * (b.depth - a.depth);
  }
  return points[points.length - 1].depth;
}

/** The inverse: where on the page a depth sits. The Drift is placed with it. */
export function yAtDepth(points, depth) {
  if (points.length === 0) return 0;
  if (depth <= points[0].depth) return points[0].y;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (depth <= b.depth)
      return b.depth === a.depth
        ? b.y
        : a.y + ((depth - a.depth) / (b.depth - a.depth)) * (b.y - a.y);
  }
  return points[points.length - 1].y;
}

/** What the gauge calls a depth: its band, and the named water it is in. */
export function placeAt(dive, depth) {
  let band = dive.bands[0].name;
  for (const b of dive.bands) if (depth >= b.from) band = b.name;
  const mark = dive.marks.find((m) => depth >= m.from && depth <= m.to);
  return mark ? `${band} · ${mark.name}` : band;
}

const fmt = (n) => n.toLocaleString('en-US');

/**
 * The gauge. Hidden until the script runs, so a page without JS has no dead
 * instrument on it. The depth readout is decoration to a screen reader; the
 * two buttons are the only things in it that do anything.
 */
export function gaugeMarkup(dive) {
  const ticks = dive.ticks
    .map(
      (t) =>
        `<span class="g-tick" style="--d:${(t.depth / dive.floor).toFixed(4)}"><b>${fmt(t.depth)}</b> ${t.name}</span>`
    )
    .join('');
  return `<aside class="gauge" hidden aria-label="Depth gauge">
  <div class="g-rail" aria-hidden="true">${ticks}<span class="g-now"></span></div>
  <div class="g-read" aria-hidden="true">
    <div class="g-label">Depth</div>
    <div class="g-depth"><span class="g-m">0</span> m</div>
    <div class="g-band">${placeAt(dive, 0)}</div>
    <div class="g-noise"><span class="g-noise-label">Your noise</span><span class="g-noise-bar"><i></i></span></div>
  </div>
  <button class="g-ping" type="button" title="Shows everything within ${fmt(dive.ping.reveal)} m, and shows you to everything within ${fmt(dive.ping.self)} m">Ping</button>
  <button class="g-sound" type="button" aria-pressed="false">Sound off</button>
  <p class="g-hint">or click open water</p>
</aside>`;
}

export const oceanStyle = `
/* ---- the water: lib/ocean.mjs ---- */
canvas.ocean, canvas.ocean-hud { position: fixed; inset: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none; display: block; }
/* Above the chart and below the nav, the gauge and the scanlines. */
canvas.ocean-hud { z-index: 30; }
/* The scanlines, unblended. An overlay blend across the whole screen is free
   over a still page and a full re-composite every frame over a moving one; it
   cost a software renderer a sixth of its frames. Same texture, under 4 %. */
.ocean-live body::after { mix-blend-mode: normal; background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.014) 0 1px, transparent 1px 3px); }
/* The canvas paints the water, so the hero keeps only the Mouth's glow. */
.ocean-live .hero { background: radial-gradient(58% 34% at 50% 106%, rgba(139, 92, 246, 0.16), transparent 70%); }
.gauge { position: fixed; z-index: 45; right: 0.75rem; bottom: 0.75rem; display: flex; align-items: center; gap: 0.7rem; padding: 0.4rem 0.4rem 0.4rem 0.75rem; background: rgba(10, 20, 36, 0.84); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); border: 1px solid rgba(53, 224, 255, 0.18); border-radius: 3px; font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-dim); }
.gauge[hidden] { display: none; }
.gauge::before { content: ''; position: absolute; top: -1px; left: -1px; width: 8px; height: 8px; border: 1px solid rgba(53, 224, 255, 0.5); border-width: 1px 0 0 1px; }
.g-rail, .g-label, .g-noise, .g-hint, .g-sound { display: none; }
.g-read { display: flex; align-items: baseline; gap: 0.6rem; }
.g-depth { font-family: var(--display); font-weight: 600; font-size: 1.05rem; letter-spacing: 0.04em; text-transform: none; color: var(--neon-cyan); white-space: nowrap; }
.g-m { font-variant-numeric: tabular-nums; }
.g-band { white-space: nowrap; }
.gauge button { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; background: transparent; border: 1px solid; border-radius: 3px; padding: 0.4rem 0.65rem; cursor: pointer; transition: box-shadow 0.2s, background 0.2s; }
.g-ping { color: var(--neon-magenta); border-color: var(--neon-magenta); }
.g-ping:hover, .g-ping:focus-visible { background: rgba(255, 61, 166, 0.1); box-shadow: var(--magenta-halo); }
.g-sound { color: var(--text-dim); border-color: rgba(111, 138, 156, 0.4); }
.g-sound[aria-pressed="true"] { color: var(--neon-magenta); border-color: rgba(255, 61, 166, 0.6); }
/* The cavitation pop: a committed press flashes the core white for a moment. */
.gauge button:active, .btn:active, .chip:active { color: #fff; border-color: #fff; transition: none; }
@media (max-width: 26rem) { .g-band { display: none; } }
/* Wide enough for a gutter: the full instrument, beside the chart. */
@media (min-width: 90rem) {
  .gauge { top: 50%; bottom: auto; right: 1.25rem; transform: translateY(-50%); width: 9.25rem; flex-direction: column; align-items: stretch; gap: 0.55rem; padding: 0.9rem 0.8rem 0.8rem; }
  .g-rail { display: block; position: relative; height: 13rem; margin: 0.2rem 0 0.4rem 0.35rem; border-left: 1px solid rgba(214, 230, 240, 0.18); }
  .g-tick { position: absolute; left: 0; top: calc(var(--d) * 100%); transform: translateY(-50%); padding-left: 0.55rem; font-size: 0.5rem; letter-spacing: 0.08em; white-space: nowrap; color: rgba(111, 138, 156, 0.8); }
  .g-tick::before { content: ''; position: absolute; left: 0; top: 50%; width: 0.35rem; border-top: 1px solid rgba(214, 230, 240, 0.3); }
  .g-tick b { font-weight: 400; color: var(--text-cyan); }
  .g-now { position: absolute; left: -4px; top: calc(var(--d, 0) * 100%); width: 7px; height: 7px; margin-top: -4px; border-radius: 50%; background: var(--neon-cyan); box-shadow: var(--cyan-halo); }
  .g-read { flex-direction: column; align-items: stretch; gap: 0.2rem; }
  .g-label { display: block; }
  .g-depth { font-size: 1.7rem; line-height: 1; }
  .g-band { white-space: normal; color: var(--text-cyan); line-height: 1.4; }
  .g-noise { display: block; margin-top: 0.45rem; }
  .g-noise-bar { display: block; height: 3px; margin-top: 0.3rem; background: rgba(53, 224, 255, 0.1); }
  .g-noise-bar i { display: block; height: 100%; width: 100%; transform-origin: left; transform: scaleX(0); background: var(--neon-teal); }
  .g-noise.mid .g-noise-bar i { background: var(--neon-amber); }
  .g-noise.high .g-noise-bar i { background: var(--neon-red); }
  .g-sound { display: block; }
  .g-hint { display: block; margin: 0; font-size: 0.52rem; letter-spacing: 0.12em; text-align: center; opacity: 0.75; }
}
@media (prefers-reduced-motion: reduce) { .g-ping, .g-sound, .g-hint, .g-noise { display: none !important; } }
`;

/** The inline script: the browser half, called with its data and helpers. */
export function oceanScript(dive = DIVE) {
  return `(${ocean})(${JSON.stringify(dive)}, ${depthAt}, ${yAtDepth}, ${placeAt});`;
}

export function ocean(dive, depthAt, yAtDepth, placeAt) {
  const root = document.documentElement;
  // Two canvases: the water behind the chart, and a sonar overlay above it,
  // because a ping resolves through a panel and a ring hidden behind one would
  // not read as the thing that just happened.
  const canvas = document.querySelector('canvas.ocean');
  const hud = document.querySelector('canvas.ocean-hud');
  const gauge = document.querySelector('.gauge');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const hctx = hud && hud.getContext ? hud.getContext('2d') : null;
  if (!ctx || !hctx || !gauge) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let still = motion.matches;
  root.classList.add('ocean-live');
  gauge.hidden = false;

  const els = {
    m: gauge.querySelector('.g-m'),
    band: gauge.querySelector('.g-band'),
    now: gauge.querySelector('.g-now'),
    noise: gauge.querySelector('.g-noise'),
    bar: gauge.querySelector('.g-noise-bar i'),
    ping: gauge.querySelector('.g-ping'),
    sound: gauge.querySelector('.g-sound'),
  };

  // A fixed seed, so the Drift sits in the same water on every visit.
  let seed = 0x5eed1e55;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const between = (a, b) => a + rand() * (b - a);
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const game = (seconds) => seconds * dive.clock;

  // ---- geometry: the viewport, and the page as a column of water ----
  let W = 0;
  let H = 0;
  let points = [];
  let pageH = 0;
  let R = 180; // pixels that stand for the 900 m reveal
  const px = (metres) => (metres / dive.ping.reveal) * R;

  const measure = () => {
    W = innerWidth;
    H = innerHeight;
    // The water is soft all the way through, so it is drawn at one pixel per
    // CSS pixel whatever the screen; only the sonar overlay, which carries
    // hairlines and text, pays for a sharp display.
    for (const [c, x, dpr] of [
      [canvas, ctx, 1],
      [hud, hctx, Math.min(devicePixelRatio || 1, 2)],
    ]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const docH = (pageH = Math.max(root.scrollHeight, H));
    points = [{ y: 0, depth: 0 }];
    for (const a of dive.anchors) {
      const el = document.querySelector(a.selector);
      if (!el) continue;
      const y = el.getBoundingClientRect().top + scrollY;
      const last = points[points.length - 1];
      if (y > last.y && a.depth > last.depth) points.push({ y, depth: a.depth });
    }
    points.push({ y: Math.max(docH, points[points.length - 1].y + 1), depth: dive.floor });
    R = clamp(Math.min(W, H) * 0.26, 110, 240);
    shafts = bake(Math.round(W / 2) + 30, Math.round((H * 0.85) / 2));
    for (const f of drift) f.place();
    snow.length = 0;
    const n = clamp(Math.round((W * H) / 7000), 50, 220);
    for (let i = 0; i < n; i++) snow.push(flake(between(0, H)));
    // Settle the Drift into its new water before a frame shows it.
    for (const f of drift) f.step(clock, 0);
  };
  // The reader's depth: the top of the page at the top, the floor at the end.
  const readerDepth = () => {
    const max = Math.max(1, pageH - H);
    const y = scrollY + H * clamp(scrollY / max, 0, 1);
    return depthAt(points, y);
  };

  // ---- the water itself ----
  const tint = [
    [0, [10, 24, 40]],
    [400, [7, 14, 26]],
    [1800, [3, 8, 14]],
    [3100, [1, 3, 6]],
    [dive.floor, [0, 0, 0]],
  ];
  const waterAt = (depth) => {
    let i = 1;
    while (i < tint.length - 1 && depth > tint[i][0]) i++;
    const [d0, c0] = tint[i - 1];
    const [d1, c1] = tint[i];
    const k = clamp((depth - d0) / (d1 - d0), 0, 1);
    return `rgb(${c0.map((c, j) => Math.round(c + (c1[j] - c) * k)).join(',')})`;
  };

  // The shafts are drawn once per size, blurred, at half resolution: soft
  // light has no edge worth paying for every frame.
  let shafts = null;
  const bake = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d');
    if (!x) return null;
    x.filter = 'blur(10px)';
    for (let i = 0; i < 5; i++) {
      const top = w * (0.1 + i * 0.2 + (rand() - 0.5) * 0.06);
      const spread = 18 + rand() * 26;
      const lg = x.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0, `rgba(168, 208, 224, ${0.05 + rand() * 0.035})`);
      lg.addColorStop(1, 'rgba(168, 208, 224, 0)');
      x.fillStyle = lg;
      x.beginPath();
      x.moveTo(top - 6, -20);
      x.lineTo(top + 6, -20);
      x.lineTo(top + 50 + spread, h);
      x.lineTo(top + 50 - spread, h);
      x.closePath();
      x.fill();
    }
    return c;
  };
  const snow = [];
  const flake = (y) => ({
    x: between(0, W),
    y,
    r: between(0.4, 1.5),
    layer: between(0.25, 1),
    phase: between(0, TAU),
  });

  // ---- the Drift ----
  const drift = [];
  const contacts = [];

  // Lampfry: three shoals across the Shelf. They scatter from anything inside
  // 300 m, silent or not, and reform once the intruder has gone.
  const lf = dive.fauna.lampfry;
  for (const [dd, xf] of [
    [-0.7, 0.14],
    [0, 0.83],
    [0.6, 0.5],
  ]) {
    const shoal = {
      name: 'Lampfry',
      depth: lf.depth + dd * lf.seeded,
      xf,
      fry: [],
      calm: -1e9,
      hx: 0,
      hy: 0,
    };
    for (let i = 0; i < 24; i++) {
      const a = between(0, TAU);
      const d = Math.sqrt(rand());
      shoal.fry.push({
        ox: Math.cos(a) * d * 70,
        oy: Math.sin(a) * d * 26,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        tw: between(0, TAU),
      });
    }
    shoal.place = () => {
      shoal.hx = shoal.xf * W;
      shoal.hy = yAtDepth(points, shoal.depth);
      for (const f of shoal.fry) {
        f.x = shoal.hx + f.ox;
        f.y = shoal.hy + f.oy;
      }
    };
    shoal.step = (t, dt) => {
      const cx = shoal.hx + Math.sin(t * 0.07 + shoal.xf * 9) * 60;
      const cy = shoal.hy + Math.sin(t * 0.11 + shoal.xf * 5) * 14;
      const scare = px(lf.scatter);
      let intruded = false;
      for (const f of shoal.fry) {
        const hx = cx + f.ox;
        const hy = cy + f.oy + Math.sin(t * 1.3 + f.tw) * 3;
        const settled = t - shoal.calm > game(lf.reform);
        const pull = settled ? 2.2 : 0.15;
        f.vx += (hx - f.x) * pull * dt;
        f.vy += (hy - f.y) * pull * dt;
        if (pointer.on) {
          const dx = f.x - pointer.x;
          const dy = f.y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < scare) {
            intruded = true;
            const push = (1 - d / scare) * 900 * dt;
            f.vx += (dx / (d || 1)) * push;
            f.vy += (dy / (d || 1)) * push;
          }
        }
        const damp = Math.exp(-2.4 * dt);
        f.vx *= damp;
        f.vy *= damp;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
      }
      if (intruded) shoal.calm = t;
      contact(shoal, cx, cy, 170, 70);
    };
    shoal.draw = (t, sy) => {
      if (shoal.hy - sy < -120 || shoal.hy - sy > H + 120) return;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(143, 240, 214, 0.07)';
      ctx.beginPath();
      for (const f of shoal.fry) {
        ctx.moveTo(f.x + 5, f.y - sy);
        ctx.arc(f.x, f.y - sy, 5, 0, TAU);
      }
      ctx.fill();
      ctx.fillStyle = `rgba(190, 255, 236, ${0.6 + 0.25 * Math.sin(t * 0.9 + shoal.xf * 7)})`;
      ctx.beginPath();
      for (const f of shoal.fry) {
        ctx.moveTo(f.x + 1.3, f.y - sy);
        ctx.arc(f.x, f.y - sy, 1.3, 0, TAU);
      }
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    };
    drift.push(shoal);
  }

  // Tetherjelly: two clusters on the thermocline, drifting and breathing.
  // Chart data in the game, so they are always drawn.
  const tj = dive.fauna.tetherjelly;
  for (const xf of [0.1, 0.9]) {
    const cluster = { name: 'Tetherjelly', xf, jellies: [] };
    for (let i = 0; i < 3; i++)
      cluster.jellies.push({
        dd: between(-tj.seeded, tj.seeded),
        ox: between(-60, 60),
        r: between(8, 15),
        phase: between(0, TAU),
        x: 0,
        y: 0,
      });
    cluster.place = () => {
      for (const j of cluster.jellies) {
        j.hx = cluster.xf * W + j.ox;
        j.hy = yAtDepth(points, tj.depth + j.dd);
      }
    };
    cluster.step = (t) => {
      let cx = 0;
      let cy = 0;
      for (const j of cluster.jellies) {
        j.x = j.hx + Math.sin(t * 0.05 + j.phase) * 40;
        j.y = j.hy + Math.sin(t * 0.3 + j.phase) * 10;
        cx += j.x / cluster.jellies.length;
        cy += j.y / cluster.jellies.length;
      }
      contact(cluster, cx, cy, 170, 120);
    };
    cluster.draw = (t, sy) => {
      for (const j of cluster.jellies) {
        const y = j.y - sy;
        if (y < -120 || y > H + 60) continue;
        const breath = 1 + 0.12 * Math.sin(t * TAU * 0.5 + j.phase);
        const g = ctx.createRadialGradient(j.x, y, 0, j.x, y, j.r * 2.4);
        g.addColorStop(0, 'rgba(168, 208, 224, 0.16)');
        g.addColorStop(1, 'rgba(168, 208, 224, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(j.x, y, j.r * 2.4, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(168, 208, 224, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const ox = (k - 1.5) * j.r * 0.45;
          const sway = Math.sin(t * 0.8 + j.phase + k) * 7;
          ctx.moveTo(j.x + ox, y);
          ctx.quadraticCurveTo(
            j.x + ox + sway,
            y + j.r * 2.5,
            j.x + ox - sway * 0.6,
            y + j.r * (4 + k * 0.4)
          );
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(168, 208, 224, 0.1)';
        ctx.strokeStyle = 'rgba(168, 208, 224, 0.42)';
        ctx.beginPath();
        ctx.ellipse(j.x, y, j.r * breath, (j.r * 0.8) / breath, 0, Math.PI, TAU);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    };
    drift.push(cluster);
  }

  // A dark shape against dark water: how every hunter is drawn until a ping
  // resolves it.
  const shade = 'rgba(0, 0, 0, 0.55)';
  const rim = (k) => (k > 0 ? `rgba(53, 224, 255, ${0.8 * k})` : 'rgba(111, 138, 156, 0.06)');
  const eel = (x, y, angle, len, girth, t, phase, k) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const wave = (u) => Math.sin(t * 3 + phase - u * 4) * girth * 0.5 * u;
    ctx.beginPath();
    ctx.moveTo(len / 2, 0);
    for (let i = 1; i <= 10; i++) {
      const u = i / 10;
      ctx.lineTo(
        len / 2 - u * len,
        -girth * Math.sin(Math.PI * Math.pow(1 - u, 0.6)) * 0.5 + wave(u)
      );
    }
    for (let i = 10; i >= 0; i--) {
      const u = i / 10;
      ctx.lineTo(
        len / 2 - u * len,
        girth * Math.sin(Math.PI * Math.pow(1 - u, 0.6)) * 0.5 + wave(u)
      );
    }
    ctx.closePath();
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.strokeStyle = rim(k);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  };

  // Draymaw: one pack in the mid-water. It shadows whatever is loud, closing
  // to about 1,200 m once the noise reaches its Interest.
  const dm = dive.fauna.draymaw;
  const pack = { name: `Draymaw ×${dm.pack}`, members: [], x: 0, y: 0, hx: 0, hy: 0 };
  for (let i = 0; i < dm.pack; i++)
    pack.members.push({
      ox: between(-50, 50),
      oy: between(-22, 22),
      phase: between(0, TAU),
      heading: 0,
    });
  // Home is the left gutter, the one open water beside the chart at this
  // depth; the right one is the gauge's.
  pack.place = () => {
    pack.hx = 0.07 * W;
    pack.hy = yAtDepth(points, dm.depth);
    pack.x = pack.hx;
    pack.y = pack.hy;
  };
  pack.step = (t, dt) => {
    let tx = pack.hx + Math.sin(t * 0.04) * W * 0.04;
    let ty = pack.hy;
    if (pointer.on && noise.level >= dm.interest && Math.abs(pointer.y - pack.hy) < H) {
      const dx = pack.x - pointer.x;
      const dy = pack.y - pointer.y;
      const d = Math.hypot(dx, dy) || 1;
      tx = pointer.x + (dx / d) * px(dm.closes);
      ty = pointer.y + (dy / d) * px(dm.closes);
    }
    const dx = tx - pack.x;
    const dy = ty - pack.y;
    const d = Math.hypot(dx, dy);
    const v = Math.min(d, 40 * dt);
    if (d > 0.5) {
      pack.x += (dx / d) * v;
      pack.y += (dy / d) * v;
    }
    const heading = d > 2 ? Math.atan2(dy, dx) : Math.sin(t * 0.04 + 1.6) > 0 ? 0 : Math.PI;
    for (const m of pack.members) m.heading += (heading - m.heading) * Math.min(1, dt * 1.5);
    contact(pack, pack.x, pack.y, 150, 70);
  };
  pack.draw = (t, sy) => {
    if (pack.y - sy < -100 || pack.y - sy > H + 100) return;
    const k = revealed(pack, t);
    for (const m of pack.members) {
      const x = pack.x + m.ox + Math.sin(t * 0.5 + m.phase) * 8;
      const y = pack.y + m.oy + Math.cos(t * 0.4 + m.phase) * 5 - sy;
      eel(x, y, m.heading, 38, 7, t, m.phase, k);
    }
  };
  drift.push(pack);

  // Hollows: two, on the trench walls — the page's two edges. At rest they
  // are the Drift's own silent running. Anything that reaches their Commit
  // inside 500 m is struck, at once, and the strike is loud.
  const hl = dive.fauna.hollow;
  for (const xf of [0.035, 0.965]) {
    const h = { name: 'Hollow', xf, x: 0, y: 0, hx: 0, hy: 0, strike: null };
    h.place = () => {
      h.hx = h.xf * W;
      h.hy = yAtDepth(points, hl.depth + (xf < 0.5 ? -60 : 60));
    };
    h.provoke = (x, y, level, t) => {
      if (h.strike || level < hl.commit) return;
      if (Math.hypot(x - h.hx, y - h.hy) > px(hl.trigger)) return;
      h.strike = { x, y, t };
      h.revealAt = t;
      h.revealUntil = t + dive.ping.holds;
      h.name = 'Hollow · striking';
    };
    h.step = (t) => {
      h.x = h.hx;
      h.y = h.hy;
      if (h.strike) {
        const u = (t - h.strike.t) / 2.2;
        if (u >= 1) {
          h.strike = null;
          h.name = 'Hollow';
        } else {
          const k = u < 0.15 ? Math.sin((u / 0.15) * (Math.PI / 2)) : 1 - (u - 0.15) / 0.85;
          h.x += (h.strike.x - h.hx) * k * 0.85;
          h.y += (h.strike.y - h.hy) * k * 0.85;
        }
      }
      contact(h, h.x, h.y, 70, 40);
    };
    h.draw = (t, sy) => {
      const y = h.y - sy;
      if (y < -80 || y > H + 80) return;
      const k = revealed(h, t);
      const angle = h.strike
        ? Math.atan2(h.strike.y - h.hy, h.strike.x - h.hx)
        : h.xf < 0.5
          ? 0.25
          : Math.PI - 0.25;
      eel(h.x, y, angle, 58, 17, h.strike ? t * 3 : t * 0.2, h.xf, k);
      if (h.strike) {
        ctx.fillStyle = 'rgba(255, 59, 48, 0.9)';
        ctx.beginPath();
        ctx.arc(h.x + Math.cos(angle) * 21, y + Math.sin(angle) * 21, 1.8, 0, TAU);
        ctx.fill();
      }
    };
    drift.push(h);
  }

  // The Sounder: a colossus migrating through the deep basins. A ping inside
  // its reach is a challenge call; it turns toward the emitter and holds that
  // course.
  const sd = dive.fauna.sounder;
  const sounder = {
    name: 'Sounder',
    x: -400,
    y: 0,
    hy: 0,
    heading: 0,
    want: 0,
    answering: null,
    phase: 0,
  };
  sounder.place = () => {
    sounder.hy = yAtDepth(points, sd.depth);
    sounder.len = clamp(W * 0.3, 200, 420);
    if (sounder.y === 0) {
      sounder.y = sounder.hy;
      sounder.x = W * 0.3;
    }
  };
  sounder.answer = (x, y, depth, t) => {
    if (depth < sd.reach[0] || depth > sd.reach[1]) return;
    sounder.answering = { x, y, until: t + game(sd.holds) };
    sounder.name = 'Sounder · answering';
  };
  sounder.step = (t, dt) => {
    let speed = 16;
    if (sounder.answering && t > sounder.answering.until) {
      sounder.answering = null;
      sounder.name = 'Sounder';
    }
    if (sounder.answering) {
      sounder.want = Math.atan2(sounder.answering.y - sounder.y, sounder.answering.x - sounder.x);
      speed = 42;
    } else {
      // Back to the corridor: level out toward its depth, heading east.
      sounder.want = Math.atan2((sounder.hy - sounder.y) * 0.02, 1);
    }
    let turn = sounder.want - sounder.heading;
    while (turn > Math.PI) turn -= TAU;
    while (turn < -Math.PI) turn += TAU;
    sounder.heading += clamp(turn, -0.35 * dt, 0.35 * dt);
    sounder.x += Math.cos(sounder.heading) * speed * dt;
    sounder.y += Math.sin(sounder.heading) * speed * dt;
    sounder.phase += dt * (speed / 16) * 0.9;
    if (sounder.x > W + sounder.len) sounder.x = -sounder.len;
    if (sounder.x < -sounder.len * 1.5) sounder.x = W + sounder.len;
    contact(sounder, sounder.x, sounder.y, sounder.len, sounder.len * 0.2);
  };
  sounder.draw = (t, sy) => {
    const y = sounder.y - sy;
    if (y < -sounder.len || y > H + sounder.len) return;
    const k = revealed(sounder, t);
    const L = sounder.len;
    const girth = L * 0.16;
    ctx.save();
    ctx.translate(sounder.x, y);
    ctx.rotate(sounder.heading);
    const spine = (u) => Math.sin(sounder.phase * 2 - u * 5) * girth * 0.35 * u * u;
    const half = (u) =>
      girth * 0.5 * Math.sin(Math.PI * Math.pow(Math.max(0.001, 1 - u), 0.55)) * (1 - u * 0.25);
    ctx.beginPath();
    ctx.moveTo(L / 2, 0);
    for (let i = 1; i <= 24; i++) {
      const u = i / 24;
      ctx.lineTo(L / 2 - u * L, spine(u) - half(u));
    }
    const tail = spine(1);
    ctx.lineTo(-L / 2 - girth * 0.5, tail - girth * 0.55);
    ctx.lineTo(-L / 2 - girth * 0.2, tail);
    ctx.lineTo(-L / 2 - girth * 0.5, tail + girth * 0.55);
    for (let i = 24; i >= 0; i--) {
      const u = i / 24;
      ctx.lineTo(L / 2 - u * L, spine(u) + half(u));
    }
    ctx.closePath();
    // Pectoral fins, a third of the way back.
    for (const side of [-1, 1]) {
      const u = 0.32;
      const fx = L / 2 - u * L;
      const fy = spine(u) + side * half(u) * 0.8;
      ctx.moveTo(fx + girth * 0.3, fy);
      ctx.lineTo(fx - girth * 0.9, fy + side * girth * (0.75 + 0.1 * Math.sin(sounder.phase * 2)));
      ctx.lineTo(fx - girth * 0.5, fy);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.strokeStyle = k > 0 ? rim(k) : 'rgba(111, 138, 156, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  };
  drift.push(sounder);

  // ---- contacts: what a ping resolves ----
  function contact(f, x, y, w, h) {
    f.cx = x;
    f.cy = y;
    f.cw = w;
    f.ch = h;
  }
  function revealed(f, t) {
    if (!f.revealUntil || t < f.revealAt || t > f.revealUntil) return 0;
    return Math.min(1, (t - f.revealAt) / 0.15, (f.revealUntil - t) / 0.8);
  }
  const bracket = (f, t, sy) => {
    const k = revealed(f, t);
    if (k <= 0) return;
    const x0 = f.cx - f.cw / 2;
    const y0 = f.cy - f.ch / 2 - sy;
    const x1 = x0 + f.cw;
    const y1 = y0 + f.ch;
    const tick = 7;
    hctx.strokeStyle = `rgba(53, 224, 255, ${0.75 * k})`;
    hctx.lineWidth = 1;
    hctx.beginPath();
    for (const [x, y, sx, sy2] of [
      [x0, y0, 1, 1],
      [x1, y0, -1, 1],
      [x0, y1, 1, -1],
      [x1, y1, -1, -1],
    ]) {
      hctx.moveTo(x + sx * tick, y);
      hctx.lineTo(x, y);
      hctx.lineTo(x, y + sy2 * tick);
    }
    hctx.stroke();
    hctx.font = '10px ui-monospace, Menlo, Consolas, monospace';
    hctx.fillStyle = `rgba(168, 208, 224, ${k})`;
    hctx.fillText(f.name.toUpperCase(), x0, y0 - 5);
  };

  // ---- you: the pointer is a hull, and moving it is noise ----
  const pointer = { on: false, x: 0, y: 0, cx: 0, cy: 0, t: 0 };
  const noise = {
    level: 0,
    bump(v) {
      noise.level = Math.max(noise.level, v);
    },
  };
  addEventListener(
    'pointermove',
    (e) => {
      const now = performance.now();
      if (pointer.on) {
        const dt = Math.max(1, now - pointer.t) / 1000;
        const speed = Math.hypot(e.clientX - pointer.cx, e.clientY - pointer.cy) / dt;
        noise.bump(Math.min(75, speed * 0.04));
      }
      pointer.on = true;
      pointer.cx = e.clientX;
      pointer.cy = e.clientY;
      pointer.t = now;
    },
    { passive: true }
  );
  const gone = () => (pointer.on = false);
  addEventListener('pointerout', (e) => e.relatedTarget || gone());
  addEventListener('pointercancel', gone);
  addEventListener('pointerup', (e) => e.pointerType === 'mouse' || gone());
  addEventListener('blur', gone);

  // ---- sound: off until asked for ----
  let audio = null;
  const tone = (at, freq, gain, length) => {
    const o = audio.createOscillator();
    const g = audio.createGain();
    const f = audio.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(freq * 0.94, at + length);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    o.connect(f).connect(g).connect(audio.destination);
    o.start(at);
    o.stop(at + length + 0.05);
  };
  const ring = (early) => {
    if (!audio) return;
    const now = audio.currentTime + 0.02;
    const ping = early ? now + 0.8 : now;
    tone(ping, 1320, 0.09, 1.4);
    tone(early ? now : ping + 0.55, 1320, 0.028, 1.1);
  };
  els.sound.addEventListener('click', () => {
    const on = els.sound.getAttribute('aria-pressed') !== 'true';
    if (on && !audio) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audio = new Ctx();
    }
    if (audio) (on ? audio.resume() : audio.suspend()).catch(() => {});
    els.sound.setAttribute('aria-pressed', String(on));
    els.sound.textContent = on ? 'Sound on' : 'Sound off';
  });

  // ---- the ping ----
  const pings = [];
  const bubbles = [];
  let clock = 0;
  const ping = (x, y) => {
    if (still) return;
    const t = clock;
    const depth = depthAt(points, y);
    const early = depth >= dive.lip;
    const out = t + (early ? 0.8 : 0);
    pings.push({ x, y, t, out, early });
    if (pings.length > 4) pings.shift();
    noise.bump(dive.ping.sig);
    for (const f of drift) {
      const d = Math.max(0, Math.hypot(f.cx - x, f.cy - y) - Math.min(f.cw, f.ch) / 2);
      if (d <= R) {
        f.revealAt = out + (d / R) * 0.9;
        f.revealUntil = f.revealAt + dive.ping.holds;
      }
      if (f.provoke) f.provoke(x, y, dive.ping.sig, out);
    }
    sounder.answer(x, y, depth, out);
    ring(early);
  };
  els.ping.addEventListener('click', () => ping(W / 2, scrollY + H * 0.45));
  // Open water only: a click on anything that reads or does something is
  // never a ping.
  const solid =
    'a, button, input, summary, details, label, p, li, h1, h2, h3, h4, figure, img, svg, .card, .stat, .readout, .nav, .gauge';
  document.addEventListener('click', (e) => {
    if (e.button !== 0) return;
    const hit = e.target.closest ? e.target.closest(solid) : null;
    if (hit) {
      if (hit.matches('.btn, .chip, summary') || hit.closest('summary'))
        cavitate(e.clientX, e.clientY + scrollY);
      return;
    }
    if (String(getSelection()).length > 0) return;
    ping(e.clientX, e.clientY + scrollY);
  });
  // Every press is a little noise: a few bubbles off whatever was pressed.
  const cavitate = (x, y) => {
    if (still) return;
    for (let i = 0; i < 7; i++)
      bubbles.push({
        x: x + between(-8, 8),
        y: y + between(-4, 4),
        r: between(1, 3),
        v: between(30, 70),
        t: clock,
        phase: between(0, TAU),
      });
    if (bubbles.length > 60) bubbles.splice(0, bubbles.length - 60);
  };

  // The lockup's sounding, carried out into the water: each time the throat
  // flares, a violet ring leaves it. Violet, because it is the Mouth's, and it
  // resolves nothing.
  const soundings = [];
  const throat = document.querySelector('.lockup .throat');
  const sound = () => {
    if (still || !throat) return;
    setTimeout(() => {
      const b = throat.getBoundingClientRect();
      if (b.bottom < 0 || b.top > H) return;
      soundings.push({ x: b.left + b.width / 2, y: b.top + b.height / 2 + scrollY, t: clock });
      if (soundings.length > 2) soundings.shift();
    }, 900);
  };
  if (throat) {
    throat.addEventListener('animationstart', sound);
    throat.addEventListener('animationiteration', sound);
  }

  // ---- drawing ----
  const circle = (x, y, r, color, width, dash) => {
    hctx.strokeStyle = color;
    hctx.lineWidth = width;
    hctx.setLineDash(dash || []);
    hctx.beginPath();
    hctx.arc(x, y, Math.max(0, r), 0, TAU);
    hctx.stroke();
    hctx.setLineDash([]);
  };
  let lastScroll = scrollY;
  let shown = { m: -1, band: '', d: -1, n: -1 };

  const frame = (t, dt, moving) => {
    const sy = scrollY;
    const depth = readerDepth();
    // Water, darkening downward across the screen as well as down the page.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, waterAt(depthAt(points, sy)));
    g.addColorStop(1, waterAt(depthAt(points, sy + H)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Light from above, only in the first few hundred metres, and gone by
    // the time the Shelf is.
    const topDepth = depthAt(points, sy);
    if (topDepth < 500 && shafts) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1 - topDepth / 500;
      ctx.drawImage(shafts, Math.sin(t * 0.09) * 30 - 30, 0, W + 60, H * 0.85);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // The Mouth, below everything, on the lockup's seven-second cycle.
    if (depth > dive.lip) {
      const k = clamp((depth - dive.lip) / (dive.floor - dive.lip), 0, 1);
      const pulse = 0.8 + 0.2 * Math.exp(-(((t % 7) - 0.9) ** 2) * 6);
      const mg = ctx.createRadialGradient(W / 2, H * 1.15, 0, W / 2, H * 1.15, H * 0.95);
      mg.addColorStop(0, `rgba(139, 92, 246, ${0.2 * k * pulse})`);
      mg.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = mg;
      ctx.fillRect(0, 0, W, H);
    }

    // Marine snow, sinking, and sliding a little slower than the page.
    const dy = sy - lastScroll;
    lastScroll = sy;
    ctx.fillStyle = 'rgba(214, 230, 240, 0.28)';
    ctx.beginPath();
    for (const s of snow) {
      if (moving) {
        s.y += (6 + 12 * s.layer) * dt - dy * s.layer * 0.35;
        s.x += Math.sin(t * 0.4 + s.phase) * 4 * dt;
        if (s.y > H + 4) {
          s.y -= H + 8;
          s.x = between(0, W);
        } else if (s.y < -4) s.y += H + 8;
      }
      const r = s.r * (0.6 + 0.4 * s.layer);
      ctx.moveTo(s.x + r, s.y);
      ctx.arc(s.x, s.y, r, 0, TAU);
    }
    ctx.fill();

    for (const f of drift) {
      if (moving) f.step(t, dt);
      f.draw(t, sy);
    }

    // Everything above the chart: soundings, pings, bubbles, contacts.
    hctx.clearRect(0, 0, W, H);
    for (const s of soundings) {
      const u = (t - s.t) / 2.4;
      if (u < 0 || u > 1) continue;
      circle(
        s.x,
        s.y - sy,
        R * 1.3 * (1 - Math.pow(1 - u, 3)),
        `rgba(201, 166, 255, ${0.35 * (1 - u)})`,
        1
      );
    }

    // Pings: the self-reveal in threat red, the reveal in cyan with its halo,
    // and over the Mouth the answer arriving first.
    for (const p of pings) {
      const y = p.y - sy;
      if (p.early) {
        const u = (t - p.t) / 0.8;
        if (u >= 0 && u <= 1)
          circle(p.x, y, R * 1.4 * (1 - u), `rgba(201, 166, 255, ${0.15 + 0.6 * u})`, 1.4);
      }
      const u = (t - p.out) / 1.6;
      if (u >= 0 && u <= 1) {
        const r = R * (1 - Math.pow(1 - Math.min(1, u / 0.6), 3));
        const a = 1 - u;
        circle(p.x, y, r, `rgba(53, 224, 255, ${0.3 * a})`, 6);
        circle(p.x, y, r, `rgba(53, 224, 255, ${0.95 * a})`, 1.4);
      }
      const v = (t - p.out) / 2.4;
      if (v >= 0 && v <= 1) {
        circle(
          p.x,
          y,
          (dive.ping.self / dive.ping.reveal) * R * (1 - Math.pow(1 - v, 2)),
          `rgba(255, 59, 48, ${0.45 * (1 - v)})`,
          1,
          [3, 7]
        );
      }
    }

    for (const b of bubbles) {
      const u = (t - b.t) / 1.6;
      if (u < 0 || u > 1) continue;
      const x = b.x + Math.sin(t * 5 + b.phase) * 3;
      circle(
        x,
        b.y - sy - b.v * (t - b.t),
        b.r * (1 + u * 0.4),
        `rgba(168, 208, 224, ${0.55 * (1 - u)})`,
        1
      );
    }

    for (const f of drift) bracket(f, t, sy);

    // The gauge.
    const m = Math.round(depth / 10) * 10;
    if (m !== shown.m) {
      shown.m = m;
      els.m.textContent = m.toLocaleString('en-US');
      const band = placeAt(dive, depth);
      if (band !== shown.band) els.band.textContent = shown.band = band;
      if (els.now) els.now.style.setProperty('--d', (depth / dive.floor).toFixed(3));
    }
    noise.level *= Math.exp(-dt / 1.1);
    const n = Math.round(noise.level);
    if (n !== shown.n) {
      shown.n = n;
      els.bar.style.transform = `scaleX(${n / 100})`;
      els.noise.classList.toggle('mid', n >= 30 && n < 60);
      els.noise.classList.toggle('high', n >= 60);
    }
    // A hull loud enough, close enough, springs a Hollow.
    if (pointer.on && noise.level >= dive.fauna.hollow.commit)
      for (const f of drift) if (f.provoke) f.provoke(pointer.x, pointer.y, noise.level, t);
  };

  // ---- the loop ----
  let last = 0;
  let running = false;
  const tick = (now) => {
    if (still || document.hidden) {
      running = false;
      return;
    }
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now;
    clock += dt;
    pointer.x = pointer.cx;
    pointer.y = pointer.cy + scrollY;
    frame(clock, dt, true);
    requestAnimationFrame(tick);
  };
  const start = () => {
    if (running || still || document.hidden) return;
    running = true;
    last = 0;
    requestAnimationFrame(tick);
  };
  // Under reduced motion the water is still drawn, once per scroll or resize.
  let queued = false;
  const paintStill = () => {
    if (!still || queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      frame(clock, 0, false);
    });
  };

  measure();
  addEventListener('resize', () => {
    measure();
    paintStill();
  });
  // Opening a phase changes the page's height, and so where every depth is.
  if ('ResizeObserver' in window) {
    let h = root.scrollHeight;
    new ResizeObserver(() => {
      if (Math.abs(root.scrollHeight - h) < 40) return;
      h = root.scrollHeight;
      measure();
      paintStill();
    }).observe(document.body);
  }
  addEventListener('scroll', paintStill, { passive: true });
  document.addEventListener('visibilitychange', start);
  motion.addEventListener('change', (e) => {
    still = e.matches;
    if (still) paintStill();
    else start();
  });
  if (still) paintStill();
  else start();
}
