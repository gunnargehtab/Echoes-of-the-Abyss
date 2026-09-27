import { THREE, rng, N2 } from 'abyss-engine';
const cv = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/* seamless fbm field (n x n), periodic in both axes by corner blending */
function field(n, freq, seed, oct = 4) {
  const r = rng(seed),
    ox = r() * 100,
    oy = r() * 100,
    f = new Float32Array(n * n);
  const s = (x, y) => {
    let v = 0,
      a = 1,
      t = 0,
      fx = x,
      fy = y;
    for (let o = 0; o < oct; o++) {
      v += a * N2(fx + ox + o * 17, fy + oy + o * 11);
      t += a;
      fx *= 2;
      fy *= 2;
      a *= 0.5;
    }
    return v / t;
  };
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const u = x / n,
        v = y / n,
        X = u * freq,
        Y = v * freq;
      f[y * n + x] =
        s(X, Y) * (1 - u) * (1 - v) +
        s(X - freq, Y) * u * (1 - v) +
        s(X, Y - freq) * (1 - u) * v +
        s(X - freq, Y - freq) * u * v;
    }
  return f;
}
const samp = (f, n, u, v) => {
  const x = (((u % 1) + 1) % 1) * n,
    y = (((v % 1) + 1) % 1) * n,
    xi = x | 0,
    yi = y | 0,
    fx = x - xi,
    fy = y - yi,
    x1 = (xi + 1) % n,
    y1 = (yi + 1) % n;
  return (
    (f[yi * n + xi] * (1 - fx) + f[yi * n + x1] * fx) * (1 - fy) +
    (f[y1 * n + xi] * (1 - fx) + f[y1 * n + x1] * fx) * fy
  );
};

function toNormal(h, W, H, strength) {
  const out = new ImageData(W, H),
    d = out.data;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const xl = (x - 1 + W) % W,
        xr = (x + 1) % W,
        yu = (y - 1 + H) % H,
        yd = (y + 1) % H;
      const dx = (h[y * W + xr] - h[y * W + xl]) * strength,
        dy = (h[yd * W + x] - h[yu * W + x]) * strength;
      const l = Math.hypot(dx, dy, 1),
        i = (y * W + x) * 4;
      d[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      d[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      d[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  const c = cv(W, H);
  c.getContext('2d').putImageData(out, 0, 0);
  return c;
}
function tex(c, srgb, renderer) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.needsUpdate = true;
  return t;
}
/* draw with horizontal + vertical wrap copies */
function wrapDraw(W, H, x, y, w, h, fn) {
  for (const dx of [0, -W, W])
    for (const dy of [0, -H, H])
      if (x + dx < W && x + dx + w > 0 && y + dy < H && y + dy + h > 0) fn(x + dx, y + dy);
}

/* Welded-steel hull: u = around the hull (u=0/1 keel, 0.5 deck), v = along length (tiles) */
export function hullTextures(
  renderer,
  { W = 2048, H = 2048, cols = 14, rows = 7, seed = 11, paint = [62, 66, 70], fouling = 0.55 } = {}
) {
  const r = rng(seed);
  const A = cv(W, H),
    Hc = cv(W, H),
    Rm = cv(W, H),
    a = A.getContext('2d'),
    h = Hc.getContext('2d'),
    m = Rm.getContext('2d');
  const pw = W / cols,
    ph = H / rows;
  h.fillStyle = 'rgb(128,128,128)';
  h.fillRect(0, 0, W, H);
  // plates
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * pw * 0.5;
    for (let c = -1; c <= cols; c++) {
      const x = c * pw + off,
        y = row * ph,
        k = 0.86 + r() * 0.26,
        newer = r() < 0.08;
      const col = newer
        ? [paint[0] * 1.25, paint[1] * 1.22, paint[2] * 1.18]
        : paint.map((v) => v * k);
      const tint = r() < 0.12 ? [1.18, 1.0, 0.82] : [1, 1, 1];
      a.fillStyle = `rgb(${(col[0] * tint[0]) | 0},${(col[1] * tint[1]) | 0},${(col[2] * tint[2]) | 0})`;
      a.fillRect(x, y, pw, ph);
      const g = a.createLinearGradient(x, y, x + pw, y + ph);
      g.addColorStop(0, 'rgba(0,0,0,0.10)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.035)');
      g.addColorStop(1, 'rgba(0,0,0,0.14)');
      a.fillStyle = g;
      a.fillRect(x, y, pw, ph);
      const hb = h.createRadialGradient(
        x + pw / 2,
        y + ph / 2,
        4,
        x + pw / 2,
        y + ph / 2,
        Math.max(pw, ph) * 0.7
      );
      hb.addColorStop(0, 'rgb(140,140,140)');
      hb.addColorStop(1, 'rgb(122,122,122)');
      h.fillStyle = hb;
      h.fillRect(x, y, pw, ph);
      const rv = ((0.42 + r() * 0.16) * 255) | 0;
      m.fillStyle = `rgb(${rv},${newer ? 60 : 38},0)`;
      m.fillRect(x, y, pw, ph);
    }
  }
  // seams + weld beads
  const seam = (x0, y0, x1, y1) => {
    h.lineCap = 'butt';
    h.setLineDash([]);
    h.lineWidth = 9;
    h.strokeStyle = 'rgb(150,150,150)';
    h.beginPath();
    h.moveTo(x0, y0);
    h.lineTo(x1, y1);
    h.stroke();
    h.lineWidth = 5;
    h.setLineDash([2, 2.5]);
    h.lineCap = 'round';
    h.strokeStyle = 'rgb(205,205,205)';
    h.beginPath();
    h.moveTo(x0, y0);
    h.lineTo(x1, y1);
    h.stroke();
    h.setLineDash([]);
    h.lineCap = 'butt';
    for (const s of [-6, 6]) {
      h.lineWidth = 2;
      h.strokeStyle = 'rgb(96,96,96)';
      h.beginPath();
      const nx = y1 - y0 ? s : 0,
        ny = x1 - x0 ? s : 0;
      h.moveTo(x0 + nx, y0 + ny);
      h.lineTo(x1 + nx, y1 + ny);
      h.stroke();
    }
    a.lineWidth = 8;
    a.strokeStyle = 'rgba(28,24,22,0.55)';
    a.beginPath();
    a.moveTo(x0, y0);
    a.lineTo(x1, y1);
    a.stroke();
    a.lineWidth = 3;
    a.strokeStyle = 'rgba(120,112,100,0.35)';
    a.beginPath();
    a.moveTo(x0, y0);
    a.lineTo(x1, y1);
    a.stroke();
    m.lineWidth = 8;
    m.strokeStyle = 'rgb(170,90,0)';
    m.beginPath();
    m.moveTo(x0, y0);
    m.lineTo(x1, y1);
    m.stroke();
  };
  for (let row = 0; row <= rows; row++) seam(0, row * ph, W, row * ph);
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * pw * 0.5;
    for (let c = 0; c <= cols; c++) {
      const x = (c * pw + off) % W;
      seam(x, row * ph, x, (row + 1) * ph);
    }
  }
  // rivet rows on every other horizontal seam
  for (let row = 0; row <= rows; row += 2)
    for (let x = 5; x < W; x += 11)
      for (const dy of [-13, 13]) {
        const y = (row * ph + dy + H) % H;
        h.fillStyle = 'rgb(190,190,190)';
        h.beginPath();
        h.arc(x, y, 2.6, 0, 7);
        h.fill();
        a.fillStyle = 'rgba(30,26,22,0.5)';
        a.beginPath();
        a.arc(x, y, 3, 0, 7);
        a.fill();
        a.fillStyle = 'rgba(160,150,135,0.28)';
        a.beginPath();
        a.arc(x - 0.7, y - 0.7, 1.4, 0, 7);
        a.fill();
      }
  // hatches / access panels
  for (let i = 0; i < 46; i++) {
    const w = (0.25 + r() * 0.45) * pw,
      hh = (0.25 + r() * 0.4) * ph,
      x = r() * W,
      y = r() * H,
      paintIt = r() < 0.3;
    wrapDraw(W, H, x, y, w, hh, (X, Y) => {
      h.lineWidth = 4;
      h.strokeStyle = 'rgb(70,70,70)';
      h.strokeRect(X, Y, w, hh);
      h.fillStyle = 'rgb(138,138,138)';
      h.fillRect(X + 3, Y + 3, w - 6, hh - 6);
      if (paintIt) {
        a.fillStyle = r() < 0.5 ? 'rgba(170,96,30,0.85)' : 'rgba(150,140,110,0.8)';
        a.fillRect(X + 3, Y + 3, w - 6, hh - 6);
      }
      a.lineWidth = 3;
      a.strokeStyle = 'rgba(15,14,13,0.8)';
      a.strokeRect(X, Y, w, hh);
      for (const [bx, by] of [
        [X + 7, Y + 7],
        [X + w - 7, Y + 7],
        [X + 7, Y + hh - 7],
        [X + w - 7, Y + hh - 7],
      ]) {
        h.fillStyle = 'rgb(200,200,200)';
        h.beginPath();
        h.arc(bx, by, 3, 0, 7);
        h.fill();
      }
      if (r() < 0.5) {
        h.lineWidth = 3;
        h.strokeStyle = 'rgb(185,185,185)';
        h.strokeRect(X + w * 0.35, Y + hh * 0.42, w * 0.3, hh * 0.16);
      }
    });
  }
  // alignment marks (no text): short bright bars near the deck line
  for (let i = 0; i < 18; i++) {
    const x = W * (0.46 + r() * 0.08),
      y = r() * H;
    a.fillStyle = 'rgba(200,190,160,0.55)';
    a.fillRect(x, y, 26 + r() * 30, 5);
  }
  // pixel pass: rust streaks, paint chips, calcareous fouling, final maps
  const N = 512,
    fA = field(N, 6, seed + 1),
    fB = field(N, 22, seed + 2),
    fC = field(N, 60, seed + 3, 3);
  const ai = a.getImageData(0, 0, W, H),
    hi = h.getImageData(0, 0, W, H),
    mi = m.getImageData(0, 0, W, H);
  const ad = ai.data,
    hd = hi.data,
    md = mi.data,
    hf = new Float32Array(W * H),
    orm = new ImageData(W, H),
    od = orm.data;
  const streak = new Float32Array(W * H);
  for (let i = 0; i < 520; i++) {
    // rust streaks run toward the keel (u -> 0 or 1)
    const x0 = r() * W,
      y0 = r() * H,
      dir = x0 < W / 2 ? -1 : 1,
      len = 40 + r() * 260,
      wid = 1 + r() * 4,
      s = 0.35 + r() * 0.65;
    for (let t = 0; t < len; t++) {
      const x = ((((x0 + dir * t) % W) + W) % W) | 0,
        fade = s * Math.pow(1 - t / len, 1.4);
      for (let dy = -wid; dy <= wid; dy++) {
        const y = ((((y0 + dy + Math.sin(t * 0.05) * 2) % H) + H) % H) | 0;
        streak[y * W + x] = Math.max(streak[y * W + x], fade * (1 - Math.abs(dy) / (wid + 1)));
      }
    }
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x,
        j = i * 4,
        u = x / W,
        v = y / H;
      const nA = samp(fA, N, u, v),
        nB = samp(fB, N, u, v),
        nC = samp(fC, N, u, v);
      const keel = Math.abs(u - 0.5) * 2;
      let R = ad[j] / 255,
        Gc = ad[j + 1] / 255,
        B = ad[j + 2] / 255,
        ht = hd[j] / 255,
        rough = md[j] / 255,
        metal = md[j + 1] / 255,
        ao = 1;
      const chip = nB * 0.8 + nC * 0.5 + nA * 0.3 > 0.34 ? 1 : 0;
      if (chip) {
        R = R * 0.3 + 0.24;
        Gc = Gc * 0.3 + 0.22;
        B = B * 0.3 + 0.2;
        rough = 0.34 + nC * 0.1;
        metal = 0.85;
        ht -= 0.03;
      }
      const st = streak[i] * (0.6 + nC * 0.8);
      if (st > 0) {
        const k = Math.min(1, st);
        R += (0.36 - R) * k * 0.8;
        Gc += (0.16 - Gc) * k * 0.8;
        B += (0.07 - B) * k * 0.8;
        rough += (0.85 - rough) * k;
        metal *= 1 - k;
      }
      const fo = Math.min(1, Math.max(0, (keel - 0.55 + nA * 0.7 + nB * 0.25) * 2.2)) * fouling;
      if (fo > 0) {
        const bump = Math.max(0, nC * 1.6 + nB * 0.5);
        const f2 = Math.min(1, fo * (0.6 + bump));
        R += (0.52 - R) * f2;
        Gc += (0.49 - Gc) * f2;
        B += (0.42 - B) * f2;
        rough += (0.92 - rough) * f2;
        metal *= 1 - f2;
        ht += f2 * bump * 0.16;
        ao -= f2 * 0.15;
      }
      if (ht < 0.42) ao -= (0.42 - ht) * 1.4;
      ad[j] = Math.min(255, R * 255);
      ad[j + 1] = Math.min(255, Gc * 255);
      ad[j + 2] = Math.min(255, B * 255);
      hf[i] = ht + nC * 0.012;
      od[j] = Math.max(0, ao) * 255;
      od[j + 1] = Math.min(1, rough) * 255;
      od[j + 2] = metal * 255;
      od[j + 3] = 255;
    }
  a.putImageData(ai, 0, 0);
  const O = cv(W, H);
  O.getContext('2d').putImageData(orm, 0, 0);
  return {
    map: tex(A, true, renderer),
    normalMap: tex(toNormal(hf, W, H, 7), false, renderer),
    orm: tex(O, false, renderer),
  };
}

/* Anechoic rubber tiles for Directorate hulls */
export function tileTextures(renderer, { S = 1024, n = 28, seed = 5 } = {}) {
  const r = rng(seed),
    A = cv(S, S),
    a = A.getContext('2d'),
    hf = new Float32Array(S * S),
    orm = new ImageData(S, S),
    od = orm.data;
  const img = a.createImageData(S, S),
    d = img.data,
    ts = S / n;
  const tile = new Float32Array(n * n * 3);
  for (let i = 0; i < n * n; i++) {
    tile[i * 3] = r();
    tile[i * 3 + 1] = r();
    tile[i * 3 + 2] = r() < 0.035 ? 1 : 0;
  }
  const fN = field(256, 16, seed + 9);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const row = (y / ts) | 0,
        off = (row % 2) * 0.5,
        tx = ((x / ts + off) | 0) % n,
        ti = (row % n) * n + tx;
      const fx = (x / ts + off) % 1,
        fy = (y / ts) % 1,
        edge = Math.min(fx, 1 - fx, fy, 1 - fy);
      const missing = tile[ti * 3 + 2],
        nz = samp(fN, 256, x / S, y / S);
      let c = 0.028 + tile[ti * 3] * 0.018 + nz * 0.01,
        ht = 0.6 + tile[ti * 3 + 1] * 0.04,
        rough = 0.62 + tile[ti * 3 + 1] * 0.2,
        metal = 0;
      if (missing) {
        c = 0.12;
        ht = 0.35;
        rough = 0.45;
        metal = 0.8;
      }
      if (edge < 0.06) {
        ht -= (0.06 - edge) * 5;
        c *= 0.6;
      }
      const i = y * S + x,
        j = i * 4,
        cs = Math.pow(c, 1 / 2.2) * 255;
      d[j] = cs;
      d[j + 1] = cs * 1.02;
      d[j + 2] = cs * 1.08;
      d[j + 3] = 255;
      hf[i] = ht + nz * 0.02;
      od[j] = edge < 0.05 ? 150 : 255;
      od[j + 1] = rough * 255;
      od[j + 2] = metal * 255;
      od[j + 3] = 255;
    }
  a.putImageData(img, 0, 0);
  const O = cv(S, S);
  O.getContext('2d').putImageData(orm, 0, 0);
  return {
    map: tex(A, true, renderer),
    normalMap: tex(toNormal(hf, S, S, 5), false, renderer),
    orm: tex(O, false, renderer),
  };
}

/* Gorgonian sea-fan: branching alpha texture (white; tinted per instance) */
export function fanTexture(renderer, seed = 3) {
  const S = 512,
    c = cv(S, S),
    g = c.getContext('2d'),
    r = rng(seed);
  g.lineCap = 'round';
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  const br = (x, y, ang, len, w, depth) => {
    if (depth <= 0 || len < 4) return;
    let px = x,
      py = y;
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      ang += (r() - 0.5) * 0.25;
      const nx = px + (Math.cos(ang) * len) / segs,
        ny = py + (Math.sin(ang) * len) / segs;
      g.lineWidth = w * (1 - (i / segs) * 0.3);
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(nx, ny);
      g.stroke();
      px = nx;
      py = ny;
    }
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(px + (r() - 0.5) * 6, py + (r() - 0.5) * 6, 1.1, 0, 7);
      g.fill();
    }
    const k = 2 + (r() < 0.35 ? 1 : 0);
    for (let i = 0; i < k; i++)
      br(
        px,
        py,
        ang + (i - (k - 1) / 2) * (0.35 + r() * 0.3),
        len * (0.68 + r() * 0.12),
        w * 0.72,
        depth - 1
      );
  };
  for (let i = 0; i < 5; i++)
    br(S / 2 + (i - 2) * 6, S - 6, -Math.PI / 2 + (i - 2) * 0.32, 120, 7, 7);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
