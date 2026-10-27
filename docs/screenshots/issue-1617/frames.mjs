// #1617 evidence: one frame per mission of a named marker's ring on the chart.
// Waits for the first open row that carries a marker (a button, docs/ui-ux.md §10.5),
// presses it so the camera goes to that marker, and saves a JPEG named for the
// mission: FRAME_OUT is the directory, FRAME_NAME the file's stem. A JPEG rather
// than the harness's PNG keeps twenty-seven frames to a few megabytes. A ring
// two kilometres wide or more outgrows the focused view and puts its name off
// screen, so ZOOM_OUT wheels the camera out that many notches first.
// Forty minutes: a marker row that opens at 19:00 can take over twenty-five on a
// loaded machine, where the match clock runs behind the wall.
const LONG = { timeout: 40 * 60 * 1000 };

export default async ({ page }) => {
  const out = process.env.FRAME_OUT;
  const stem = process.env.FRAME_NAME;
  if (!out || !stem) throw new Error('FRAME_OUT and FRAME_NAME are required');
  await page.waitForSelector('button.objectives-row.pending', LONG);
  // Models decode in the first twenty seconds. SETTLE_MS shortens the wait for
  // a row that opens late, when they are long decoded and the mission may end
  // soon after: Conclave Chord's voices open at 13:30 and an idle run is lost at 14:30.
  await page.waitForTimeout(Number(process.env.SETTLE_MS || 20000));
  // ROW picks a later open row, for a mission whose first one closes on its own
  // within seconds of the drive pressing it (Tolerance's pour).
  const row = (await page.$$('button.objectives-row.pending'))[Number(process.env.ROW ?? 0)];
  if (row === undefined) throw new Error('the marker row went before it could be pressed');
  console.log('row:', ((await row.textContent()) ?? '').replace(/\s+/g, ' ').trim());
  await row.click();
  await page.waitForTimeout(3000);
  await page.mouse.move(720, 400);
  for (let notch = 0; notch < Number(process.env.ZOOM_OUT ?? 0); notch++) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${stem}.jpg`, type: 'jpeg', quality: 80 });
  console.log(`frame: ${out}/${stem}.jpg`);
};
