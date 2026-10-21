// #1512 evidence: wait for an own harvester to start dredging, then frame it
// at its depth — home pitch, close, and low — each time on a fresh dredge,
// since a harvester near its depot fills its hold in about two seconds.
const probe = (page) => page.evaluate(() => window.__perspectiveProbe());
const look = (page, at, distance, pitchDeg) =>
  page.evaluate(
    ({ at, distance, pitchDeg }) =>
      window.__perspectiveCamera(at.x, at.z, distance, { pitchDeg, focusDepthM: at.depthM }),
    { at, distance, pitchDeg }
  );
const dredging = async (page) => {
  // Wait out the dredge in progress, then catch the next one as it bites.
  for (let i = 0; i < 200 && (await probe(page)).plumeAt !== null; i++) {
    await page.waitForTimeout(100);
  }
  for (let i = 0; i < 600; i++) {
    const p = await probe(page);
    if (p.plumeAt !== null) return p.plumeAt;
    await page.waitForTimeout(100);
  }
  throw new Error('no own harvester dredged within 60 s');
};

export default async ({ page, shot }) => {
  for (const [name, distance, pitch] of [
    ['dredging', 400, 55],
    ['dredging-close', 220, 55],
    ['dredging-low', 300, 18],
  ]) {
    const at = await dredging(page);
    await look(page, at, distance, pitch);
    await page.waitForTimeout(700);
    console.log(name, JSON.stringify(at), 'motes', (await probe(page)).plumeMotes);
    await shot(name);
  }
  // Once the harvester leaves for its depot it stirs nothing, and the plume settles.
  await page.waitForTimeout(3000);
  console.log('after', (await probe(page)).plumeMotes);
};
