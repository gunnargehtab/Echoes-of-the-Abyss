// #1550 evidence: one solo match on the Ventfront Divide against a Veteran AI,
// the opening fleet attack-moved into its base, and a frame of each #1467
// animation as it comes up in that one fight. Standalone rather than a
// drive.mjs --steps module, because the opponent is added in the lobby, before
// the ready that drive.mjs clicks. Built like docs/screenshots/issue-1510/hit.mjs.
// Needs both servers up (.claude/skills/run-game/scripts/dev.sh start).
//
//   node docs/screenshots/issue-1550/fight.mjs <out-dir>
//
// Two readings are the harness's, taken from the dev server's own modules the
// way docs/screenshots/issue-1513/burst.mjs takes them, and neither changes
// what is drawn: the lean each own hull is drawn at (`OwnMotion.attitude`),
// since no probe reports it, and the shoals the conn view was handed
// (`FaunaStipple.setLife`), since no probe reports those either.
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { statsFor } from '../../../packages/shared/dist/index.js';

const OUT = process.argv[2] ?? '/tmp/issue-1550';
mkdirSync(OUT, { recursive: true });
const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
const { chromium } = createRequire(import.meta.url)(`${root}/playwright/index.js`);
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const probe = () => page.evaluate(() => window.__perspectiveProbe());
const chart = () => page.evaluate(() => window.__chartProbe?.() ?? null);
const lamps = () => page.evaluate(() => window.__perspectiveLamps());
const look = (x, z, distance, focusDepthM = null, pitchDeg = 55) =>
  page.evaluate(
    ({ x, z, distance, focusDepthM, pitchDeg }) =>
      window.__perspectiveCamera(x, z, distance, { pitchDeg, focusDepthM }),
    { x, z, distance, focusDepthM, pitchDeg }
  );

await page.goto('http://localhost:5173/?map=ventfront-divide');
await page.evaluate(async () => {
  // The dev server hands the page the module the app already imported, so a
  // prototype wrapped here is the live conn view's. Both wrappers read and
  // pass through: nothing they see is changed.
  const { OwnMotion } = await import('/src/game/ownMotion.ts');
  const attitude = OwnMotion.prototype.attitude;
  window.__lean = new Map();
  OwnMotion.prototype.attitude = function (id, nowMs, out) {
    const a = attitude.call(this, id, nowMs, out);
    window.__lean.set(id, { roll: a.roll, pitch: a.pitch });
    return a;
  };
  const { FaunaStipple } = await import('/src/game/faunaStipple.ts');
  const setLife = FaunaStipple.prototype.setLife;
  window.__shoals = [];
  FaunaStipple.prototype.setLife = function (jellies, shoals) {
    window.__shoals = shoals;
    return setLife.call(this, jellies, shoals);
  };
});
// Clicked in the page: SwiftShader keeps the main thread busy enough that a
// Playwright click's post-action wait times out on a click that landed.
await page.waitForSelector('.lobby-add-ai', { timeout: 15000 });
await page.$eval('.lobby-add-ai', (b) => b.click());
await page.waitForTimeout(1000);
await page.$eval('.lobby-ready', (b) => b.click());
await page.waitForSelector('.lobby', { state: 'detached', timeout: 20000 });
await page.waitForTimeout(6000);

const record = { frames: [], missed: {} };
const taken = new Set();
// Which own hull or structure stands within `rangeM` of a world point and
// near enough the camera's focus to be in shot, or null: a frame of an effect
// on a hull that sailed out of shot while it was drawn shows nothing. Read in
// world metres against the probe's focus: the lamp probe's screen boxes came
// back null for these hulls when this drive first read them.
async function subjectOnScreen(near, p, rangeM = 150) {
  if (near === null) return null;
  const { units, structures } = await lamps();
  for (const e of [...units, ...structures]) {
    if (Math.hypot(e.xM - near.x, e.zM - near.z) > rangeM) continue;
    if (Math.hypot(e.xM - p.focus.xM, e.zM - p.focus.zM) < 0.4 * p.distance) return e.name;
  }
  return null;
}
async function take(name, reading, near = null) {
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file });
  const p = await probe();
  const entry = {
    name,
    atS: Math.round((Date.now() - t0) / 1000),
    camera: { focus: p.focus, distance: p.distance, pitchDeg: p.pitchDeg },
    onScreen: await subjectOnScreen(near, p),
    ...reading(p),
  };
  record.frames.push(entry);
  console.log('frame', JSON.stringify(entry));
  return entry;
}
const t0 = Date.now();

// At home, before the fleet sails: the opening harvester's silt and the
// nearest chimney's steam stand there from the first minute.
for (let i = 0; i < 600 && !taken.has('silt-plume'); i++) {
  const p = await probe();
  if (p.plumeAt !== null) {
    await look(p.plumeAt.x, p.plumeAt.z, 300, p.plumeAt.depthM);
    await page.waitForTimeout(500);
    const e = await take('silt-plume', (q) => ({ plumeMotes: q.plumeMotes }));
    if (e.plumeMotes > 0) taken.add('silt-plume');
  } else await page.waitForTimeout(100);
}
{
  const p = await probe();
  if (p.ventPlumeAt !== null) {
    const at = p.ventPlumeAt;
    await look(at.x, at.z, 450, at.depthM, 50);
    await page.waitForTimeout(900);
    await take('vent-plume', (q) => ({ ventPlumes: q.ventPlumes }));
    taken.add('vent-plume');
  }
}

// The shoal nearest home, before the fleet sails, in whichever state it is
// in: the frame is named for the formed shoal it looks for, and the record's
// `scattered` says which it found. The fight's own frame of a shoal waits for
// a scattered one.
{
  const s = await nearestShoal((await probe()).ownCentre);
  if (s !== null) {
    await look(s.x, s.y, 520, s.depth, 40);
    await page.waitForTimeout(900);
    await take('shoal-formed', () => ({ shoal: s }));
  }
}

// The lean of the most-leaned own hull, and where it is.
async function leaned() {
  const lean = await page.evaluate(() => [...window.__lean.entries()]);
  const units = (await lamps()).units;
  let best = null;
  for (const [id, a] of lean) {
    const u = units.find((v) => v.id === id);
    // The scout outruns the camera: it is out of shot before a frame of it
    // is drawn, so the lean is read on the heavier hulls.
    if (u === undefined || u.name === 'Light Scout') continue;
    const m = Math.max(Math.abs(a.roll), Math.abs(a.pitch));
    if (best === null || m > best.m) best = { m, id, name: u.name, ...a, u };
  }
  return best;
}
// The shoal nearest the fleet, scattered ones first, wherever they are: a
// shoal scatters off any hull inside 300 m, the opponent's and the fauna's
// included, and the fleet's own course need not pass one.
async function nearestShoal(centre) {
  const shoals = await page.evaluate(() => window.__shoals);
  const by = (s) => Math.hypot(s.x - centre.x, s.y - centre.z);
  const scattered = shoals.filter((s) => s.scattered).sort((a, b) => by(a) - by(b));
  const formed = shoals.filter((s) => !s.scattered).sort((a, b) => by(a) - by(b));
  return scattered[0] ?? formed[0] ?? null;
}
// The centroid of the own Caissons, or of whatever hull is left once none is,
// or null once none is left. `ownCentre` counts the base too, the harvester
// stays home dredging, and the scout runs ahead of the pair.
async function fleetCentre() {
  const units = (await lamps()).units.filter((u) => u.name !== 'Harvester');
  const caissons = units.filter((u) => u.name === 'Caisson');
  const hulls = caissons.length > 0 ? caissons : units;
  if (hulls.length === 0) return null;
  const x = hulls.reduce((sum, u) => sum + u.xM, 0) / hulls.length;
  const z = hulls.reduce((sum, u) => sum + u.zM, 0) / hulls.length;
  return { x, z };
}
async function takeLean(b) {
  await look(b.u.xM, b.u.zM, 220, b.u.depthM, 35);
  const after = await leaned();
  const deg = (rad) => +((rad * 180) / Math.PI).toFixed(1);
  const e = await take(
    'bank-pitch',
    () => ({
      hull: b.name,
      id: b.id,
      rollDeg: deg(b.roll),
      pitchDeg: deg(b.pitch),
      afterFrame: after && { id: after.id, rollDeg: deg(after.roll), pitchDeg: deg(after.pitch) },
    }),
    { x: b.u.xM, z: b.u.zM }
  );
  if (e.onScreen !== null && e.afterFrame?.id === b.id) taken.add('bank-pitch');
}

// Every hull, by marquee, attack-moved at the nearest other spawn, as
// docs/screenshots/issue-1517/hit.mjs sends it. The selection stands for the
// launch: Ctrl+right-click fires every selected hull that carries a tube.
const home = (await probe()).ownCentre;
await look(home.x, home.z, 1800);
await page.waitForTimeout(1500);
const C = { x: 720, y: 450 };
await page.mouse.move(C.x - 300, C.y - 200);
await page.mouse.down();
await page.mouse.move(C.x + 300, C.y + 200, { steps: 6 });
await page.mouse.up();
const W = 8000;
const target = { x: home.x < W / 2 ? W - 1200 : 1200, z: home.z };
await look(target.x, target.z, 1400);
await page.waitForTimeout(300);
await page.keyboard.press('KeyW');
await page.waitForTimeout(300);
await page.mouse.click(C.x, C.y);

// The fleet turns onto its course in the first seconds after the order, which
// is when it leans hardest; a lean is gone before a frame of the wake is done.
{
  const fleet = await fleetCentre();
  if (fleet !== null) await look(fleet.x, fleet.z, 450, null, 35);
  const until = Date.now() + 20_000;
  while (Date.now() < until && !taken.has('bank-pitch')) {
    const b = await leaned();
    // 0.04 rad is about 2.3°, an eighth of the roll's 18° cap.
    if (b !== null && b.m > 0.04) await takeLean(b);
  }
}

// Then each effect as the fight brings it up. A SwiftShader frame takes one
// to two and a half seconds in a fight (the probe's `avgFrameMs` and
// `worstFrameMs`), so each probe that says an effect is alive is followed
// by a camera move and a frame, and the probe read again after the frame says
// whether it was still alive when it was drawn. Three are read before the
// frame instead: the lean (`takeLean`'s `after`) and the track hit (`after`
// below) once the camera has moved, and a shoal's state before it moves. None
// of the three proves its effect was drawn.
const deadline = Date.now() + 8 * 60_000;
const wanted = ['wake', 'bank-pitch', 'shoal', 'muzzle', 'own-hit', 'track-hit', 'launch'];
let launchTries = 0;
let nextNote = 0;
let held = false;
while (Date.now() < deadline && wanted.some((w) => !taken.has(w))) {
  const p = await probe();
  const c = await chart();
  const centre = p.ownCentre;
  // Every own hull lost, or the match decided: nothing left to draw on.
  if (centre === null || p.units === 0) break;
  if (await page.$('.result')) break;
  if (Date.now() > nextNote) {
    nextNote = Date.now() + 30_000;
    const b = await leaned();
    const sh = await nearestShoal(centre);
    console.log(
      'note',
      JSON.stringify({
        atS: Math.round((Date.now() - t0) / 1000),
        units: p.units,
        leanRad: b && +b.m.toFixed(3),
        shoal: sh && {
          id: sh.id,
          scattered: sh.scattered,
          rangeM: Math.round(Math.hypot(sh.x - centre.x, sh.y - centre.z)),
        },
        trackHitAgeMs: c?.trackHitAgeMs == null ? null : Math.round(c.trackHitAgeMs),
      })
    );
  }

  // Held at the first blow either way, as #1510's and #1511's drives hold
  // it: a hull under a move order sails out of shot in the seconds a frame
  // takes here, and does not stop to brawl. Held under fire, it stays where
  // the camera points and its guns open.
  // Not before the wake is taken, unless the fleet is already taking damage:
  // a held hull sheds none.
  const fired = p.shots > 0 || (c?.trackHitAt != null && c.trackHitAgeMs < 3000);
  const blow = p.hits > 0 || (taken.has('wake') && fired);
  if (!held && blow) {
    await page.keyboard.press('KeyX');
    held = true;
    console.log('held', JSON.stringify({ atS: Math.round((Date.now() - t0) / 1000) }));
  }

  const fleet = await fleetCentre();
  // Wide, since the pair sails on through the frame; the bubbles stay where
  // they were shed.
  if (!taken.has('wake') && p.wakeBubbles > 0 && fleet !== null) {
    await look(fleet.x, fleet.z, 900);
    const e = await take('wake', (q) => ({ wakeBubbles: q.wakeBubbles }), fleet);
    if (e.wakeBubbles > 0 && e.onScreen !== null) taken.add('wake');
    continue;
  }
  if (!taken.has('bank-pitch')) {
    const b = await leaned();
    if (b !== null && b.m > 0.04) {
      await takeLean(b);
      continue;
    }
  }
  if (!taken.has('shoal')) {
    const s = await nearestShoal(centre);
    if (s !== null && s.scattered) {
      await look(s.x, s.y, 520, s.depth, 40);
      await page.waitForTimeout(800);
      await take('shoal', () => ({ shoal: s }));
      taken.add('shoal');
      continue;
    }
  }
  if (!taken.has('muzzle') && p.shotParticles > 0 && p.shotAt !== null) {
    await look(p.shotAt.x, p.shotAt.z, 450, p.shotAt.depthM);
    const e = await take(
      'muzzle',
      (q) => ({ shots: q.shots, shotParticles: q.shotParticles }),
      p.shotAt
    );
    if (e.shotParticles > 0 && e.onScreen !== null) taken.add('muzzle');
    continue;
  }
  if (!taken.has('own-hit') && p.hits > 0 && p.hitAt !== null) {
    // A structure is several hulls across, and its spray is sized to it: a
    // hull's distance fills the frame with the Bastion's roof.
    const struck = (await lamps()).structures.some(
      (st) => Math.hypot(st.xM - p.hitAt.x, st.zM - p.hitAt.z) < 100
    );
    await look(p.hitAt.x, p.hitAt.z, struck ? 900 : 350, p.hitAt.depthM);
    const e = await take(
      'own-hit',
      (q) => ({
        struck: struck ? 'structure' : 'hull',
        hits: q.hits,
        hitParticles: q.hitParticles,
      }),
      p.hitAt
    );
    if (e.hits > 0 && e.hitParticles > 0 && e.onScreen !== null) taken.add('own-hit');
    continue;
  }
  const at = c?.trackHitAt ?? null;
  if (!taken.has('track-hit') && at !== null && c.trackHitAgeMs < 400) {
    await look(at.x, at.y, 650, at.depthM);
    const after = await chart();
    const e = await take('track-hit', () => ({
      trackHits: after.trackHits,
      ageMs: Math.round(after.trackHitAgeMs),
      at: after.trackHitAt,
    }));
    if (e.trackHits > 0 && e.ageMs < 1200) taken.add('track-hit');
    continue;
  }
  // Last, and three tries at most: the order, the camera move and the frame
  // take 11 to 12 s here (the record's `sinceOrderMs`), and the burst
  // lives 1.5 s (docs/screenshots/issue-1509/README.md), so a try
  // rarely catches it and each one costs the fight's other effects their
  // frames. A hit track may be fauna, at which a launch is refused: own
  // ordnance rising, read once at the order and once after the frame, is what
  // says the launch went.
  if (
    !taken.has('launch') &&
    taken.has('track-hit') &&
    at !== null &&
    c.trackHitAgeMs < 3000 &&
    launchTries < 3
  ) {
    await look(at.x, at.y, 1400, at.depthM);
    const s = (await chart()).trackHitScreen;
    if (s === null || !s.visible || s.x < 0 || s.x > 1440 || s.y < 60 || s.y > 680) continue;
    launchTries++;
    const before = p.ordnance;
    const launcher = (await lamps()).units
      .filter((u) => statsFor(u.kind).carriesTorpedoes)
      .map((u) => ({ ...u, range: Math.hypot(u.xM - at.x, u.zM - at.y) }))
      .sort((a, b) => a.range - b.range)[0];
    const sent = Date.now();
    await page.keyboard.down('Control');
    await page.mouse.click(s.x, s.y, { button: 'right' });
    await page.keyboard.up('Control');
    const atOrder = (await probe()).ordnance;
    if (launcher !== undefined) await look(launcher.xM, launcher.zM, 600, launcher.depthM);
    const e = await take('launch', (q) => ({
      ordnanceBefore: before,
      ordnanceAtOrder: atOrder,
      ordnance: q.ordnance,
      launcher: launcher && launcher.name,
      sinceOrderMs: Date.now() - sent,
    }));
    if (Math.max(atOrder, e.ordnance) > before) taken.add('launch');
    continue;
  }
  // Nothing to take: follow the fleet, or the base once the fleet is gone.
  await look((fleet ?? centre).x, (fleet ?? centre).z, 1600);
}

const over = (await page.$('.result')) !== null;
const lost = (await probe()).units === 0;
for (const w of wanted) {
  if (!taken.has(w))
    record.missed[w] = over
      ? 'the match was decided first'
      : lost
        ? 'every own hull was lost first'
        : 'not seen by the deadline';
}
record.lastProbe = await probe();
record.lastChart = await chart();
await take('end', (q) => ({ units: q.units, tracks: q.tracks }));
writeFileSync(`${OUT}/fight.json`, JSON.stringify(record, null, 2) + '\n');
console.log('taken', [...taken], 'missed', record.missed);
await browser.close();
