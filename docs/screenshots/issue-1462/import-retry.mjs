// Does a failed dynamic import of the same URL fetch again? Count requests.
export default async ({ page }) => {
  let blocked = true;
  let seen = 0;
  await page.route(/\/src\/game\/GameCanvas\.tsx/, (route) => {
    seen += 1;
    return blocked ? route.abort('failed') : route.continue();
  });
  await page.waitForSelector('.menu-screen', { timeout: 10000 });
  const first = await page.evaluate(() => import('/src/game/GameCanvas.tsx').then(() => 'ok', (e) => String(e)));
  blocked = false;
  const second = await page.evaluate(() => import('/src/game/GameCanvas.tsx').then(() => 'ok', (e) => String(e)));
  const busted = await page.evaluate(() => import('/src/game/GameCanvas.tsx?retry=1').then(() => 'ok', (e) => String(e)));
  const version = await page.evaluate(() => navigator.userAgent);
  console.log(JSON.stringify({ first, second, busted, requests: seen, version }));
};
