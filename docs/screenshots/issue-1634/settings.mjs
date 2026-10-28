// #1634: the settings screen with UI scale at 200% in a 1366x768 window,
// which §11 holds to 132%. Run as a drive's --steps module after a match is
// up: the esc menu's copy first, then the scale is read back to the console.
export default async ({ page, shot }) => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Settings/ }).click();
  const slider = page.getByRole('slider', { name: /UI scale/ });
  await slider.focus();
  await page.keyboard.press('End');
  await page.waitForTimeout(600);
  const row = await page.evaluate(() => {
    const value = [...document.querySelectorAll('.menu-slider-row')].find((r) =>
      r.textContent.includes('UI scale')
    );
    const span = value.querySelector('.menu-slider-value');
    return {
      text: span.textContent,
      spanHeight: Math.round(span.getBoundingClientRect().height),
      overflowX: span.scrollWidth - span.clientWidth,
      drawn: getComputedStyle(document.querySelector('.game-root')).getPropertyValue('--ui-scale'),
    };
  });
  console.log(`settings: ${JSON.stringify(row)}`);
  await shot('settings-held-1366x768-200');
};
