// #1508 evidence: send the fleet on a short hop across open water and frame
// the hop's midpoint while it runs — loud out, silent back, then stopped.
const C = { x: 720, y: 450 };
const probe = (page) => page.evaluate(() => window.__perspectiveProbe());
const look = (page, at, distance, pitchDeg = 55) =>
  page.evaluate(
    ({ at, distance, pitchDeg }) => window.__perspectiveCamera(at.x, at.z, distance, { pitchDeg }),
    { at, distance, pitchDeg }
  );
const order = async (page, at) => {
  await look(page, at, 1400);
  await page.waitForTimeout(300);
  await page.mouse.click(C.x, C.y, { button: 'right' });
};

export default async ({ page, shot }) => {
  await page.waitForTimeout(6000);
  await page.mouse.move(C.x - 300, C.y - 200);
  await page.mouse.down();
  await page.mouse.move(C.x + 300, C.y + 200, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const home = (await probe(page)).ownCentre;
  const out = { x: home.x + 700, z: home.z + 450 };
  const mid = { x: home.x + 350, z: home.z + 225 };
  await order(page, out);
  for (let i = 1; i <= 4; i++) {
    await look(page, mid, 800);
    await page.waitForTimeout(1500);
    console.log('loud', i, (await probe(page)).wakeBubbles);
    await shot(`loud-${i}`);
  }
  await look(page, mid, 700, 25);
  await page.waitForTimeout(500);
  await shot('loud-low');
  await page.waitForTimeout(8000);
  await page.keyboard.press('Space');
  await page.waitForTimeout(1000);
  await order(page, home);
  for (let i = 1; i <= 4; i++) {
    await look(page, mid, 800);
    await page.waitForTimeout(2000);
    console.log('silent', i, (await probe(page)).wakeBubbles);
    await shot(`silent-${i}`);
  }
  await page.keyboard.press('KeyX');
  await page.waitForTimeout(2500);
  console.log('stopped', (await probe(page)).wakeBubbles);
  await shot('stopped');
};
