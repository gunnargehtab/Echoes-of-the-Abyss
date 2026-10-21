// #1514 evidence: frame the first vent chimney's steam on the Ventfront
// Divide — survey pitch, close, and low across the column.
const probe = (page) => page.evaluate(() => window.__perspectiveProbe());
const look = (page, at, distance, pitchDeg) =>
  page.evaluate(
    ({ at, distance, pitchDeg }) =>
      window.__perspectiveCamera(at.x, at.z, distance, { pitchDeg, focusDepthM: at.depthM }),
    { at, distance, pitchDeg }
  );

export default async ({ page, shot }) => {
  let at = null;
  for (let i = 0; i < 300 && at === null; i++) {
    at = (await probe(page)).ventPlumeAt;
    if (at === null) await page.waitForTimeout(100);
  }
  if (at === null) throw new Error('no vent chimney stood within 30 s');
  for (const [name, distance, pitch] of [
    ['chimney-steam', 450, 50],
    ['chimney-steam-close', 260, 40],
    ['chimney-steam-low', 320, 15],
  ]) {
    await look(page, at, distance, pitch);
    await page.waitForTimeout(900);
    console.log(name, JSON.stringify(at), 'plumes', (await probe(page)).ventPlumes);
    await shot(name);
  }
};
