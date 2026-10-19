// #1462 slice 4: the port in the stored colour-vision palette (docs/world-map.md §7.6
// step 1, docs/ui-ux.md §11), on a fresh page that has mounted no match.
// For each palette: store the choice, reload, open the board, read the column heads.
// Run: drive.mjs --headed --channel chrome, minus its title steps.
export default async ({ page, shot }) => {
  for (const palette of ['standard', 'deuteranopia', 'tritanopia']) {
    await page.evaluate((name) => {
      const raw = localStorage.getItem('echoes.settings');
      const settings = raw === null ? { version: 1 } : JSON.parse(raw);
      localStorage.setItem('echoes.settings', JSON.stringify({ ...settings, palette: name }));
    }, palette);
    await page.reload();
    await page.waitForSelector('.menu-screen', { timeout: 10000 });
    await page.getByRole('button', { name: 'Campaign' }).click();
    await page.waitForFunction(() => document.querySelector('.world-backdrop canvas') !== null, null, {
      timeout: 30000,
    });
    await page.waitForTimeout(4000);
    await shot(`board-${palette}`);
    const heads = await page.evaluate(() =>
      [...document.querySelectorAll('.campaign-head')].map((head) =>
        head.style.getPropertyValue('--faction')
      )
    );
    console.log(JSON.stringify({ palette, heads }));
  }
};
