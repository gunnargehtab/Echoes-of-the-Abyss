// #1882's frames: find the public Tetherjelly fields in the live snapshot by
// walking React's fiber tree (no probe lists them), then frame the field
// nearest the own fleet from 1,100 m and 2,400 m. Read-only: everything it
// reads is public chart data the client already holds.
const FIND = () => {
  const seen = new Set();
  let found = null;
  const look = (v, depth) => {
    if (found || v === null || typeof v !== 'object' || depth > 6 || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v.jellies) && Array.isArray(v.shoals ?? [])) {
      found = v.jellies;
      return;
    }
    if (v instanceof Node || v instanceof Window) return;
    for (const k of Object.keys(v)) {
      if (k === 'return' || k === '_owner' || k === 'stateNode') continue;
      try {
        look(v[k], depth + 1);
      } catch {}
    }
  };
  const root = document.getElementById('root') ?? document.body;
  const key = Object.keys(root).find((k) => k.startsWith('__reactContainer$'));
  const stack = [root[key]];
  const visited = new Set();
  while (stack.length && !found) {
    const f = stack.pop();
    if (!f || visited.has(f)) continue;
    visited.add(f);
    let h = f.memoizedState;
    let n = 0;
    while (h && n < 80 && !found) {
      look(h.memoizedState, 0);
      if (h.current !== undefined) look(h.current, 0);
      h = h.next;
      n++;
    }
    look(f.memoizedProps, 0);
    if (f.child) stack.push(f.child);
    if (f.sibling) stack.push(f.sibling);
  }
  return found;
};

export default async ({ page, shot }) => {
  await page.waitForTimeout(6000);
  const jellies = await page.evaluate(FIND);
  const probe = await page.evaluate(() => window.__perspectiveProbe());
  console.log('jellies', JSON.stringify(jellies));
  console.log('ownCentre', JSON.stringify(probe.ownCentre));
  await shot('home');
  if (!jellies?.length) return;
  const own = probe.ownCentre;
  const j = [...jellies].sort(
    (a, b) => Math.hypot(a.x - own.x, a.y - own.y) - Math.hypot(b.x - own.x, b.y - own.y)
  )[0];
  console.log('framing', JSON.stringify(j));
  await page.evaluate(([x, y]) => window.__perspectiveCamera(x, y, 1100), [j.x, j.y]);
  await page.waitForTimeout(2500);
  const p2 = await page.evaluate(() => window.__perspectiveProbe());
  console.log('cam', JSON.stringify({ pitch: p2.pitchDeg, yaw: p2.yawDeg, focus: p2.focus, eye: p2.eye }));
  await shot('field-1100');
  await page.evaluate(([x, y]) => window.__perspectiveCamera(x, y, 2400), [j.x, j.y]);
  await page.waitForTimeout(2500);
  await shot('field-2400');
};
