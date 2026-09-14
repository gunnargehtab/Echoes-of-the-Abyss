/**
 * The top strip's explanations, in a real engine, as a `--steps` module (#724).
 *
 *   node .claude/skills/run-game/scripts/drive.mjs --out /tmp/readouts \
 *     --steps .claude/skills/run-game/scripts/readoutGuards.mjs
 *
 * docs/ui-ux.md §2's permanent strip is Pixi text, so its explanations are DOM
 * controls laid over it: the renderer reports where each readout ended up and
 * `StripReadouts` puts one transparent button on each. Most of that contract is
 * held in `packages/frontend/test` — the lines themselves, the publish gate,
 * the collision rule against the drawn glyphs — and is held there because it
 * needs no engine.
 *
 * **One half of it cannot live there, and this is why it exists.** The boxes
 * are refused when a readout runs off the canvas, and the bound is the canvas
 * rather than the strip's own 52 px because the SIG instrument — a meter and
 * two lines, §3's one permanent element — sits a couple of pixels below the
 * strip's bevel. Headless that box measures 51 px and fits; in Chromium it
 * measures about 53 and does not, because the fonts are not the same ones. A
 * strip-height bound therefore drops the SIG readout's control *in the browser
 * and nowhere else*, and the whole suite stays green while it does. That is the
 * same bargain `escFocus.mjs` records for the esc menu's focus trap: a property
 * the runner cannot reach is asserted in a real engine or nowhere.
 *
 * Deliberately **not** part of `npm test`, for `escFocus.mjs`'s reasons:
 * Playwright is a global install rather than a devDependency, the harness needs
 * both dev servers, and a browser drive on every push is not what the CI budget
 * is best spent on. Run it when the strip's layout or this surface changes.
 *
 * It fails loudly — a thrown error, which drive.mjs turns into a non-zero exit
 * and a `steps-failed` screenshot.
 */

/** §11's range, ends and middle. The ceiling is where the strip collides with itself. */
const SCALES = [0.75, 1, 2];

function check(ok, message) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${message}`);
  if (!ok) throw new Error(message);
}

/** Every readout control on screen, with the box the player's finger has to hit. */
async function controls(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.readout')].map((button) => {
      const box = button.getBoundingClientRect();
      const detail = button.nextElementSibling;
      return {
        name: button.getAttribute('aria-label') ?? '',
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        // Clipped when shut, laid out when shown. The line is never removed,
        // so `aria-describedby` resolves either way — this is asking which.
        shown: detail !== null && getComputedStyle(detail).clipPath === 'none',
        described: button.getAttribute('aria-describedby'),
      };
    })
  );
}

/** Put the client at one of §11's scales and get back into the same match. */
async function atScale(page, scale) {
  await page.evaluate((ui) => {
    const raw = localStorage.getItem('echoes.settings');
    const next = raw === null ? {} : JSON.parse(raw);
    next.uiScale = ui;
    localStorage.setItem('echoes.settings', JSON.stringify(next));
  }, scale);
  await page.reload();
  // The reload lands on the title with the seat still held, so the strip comes
  // back carrying the same figures rather than a fresh base's.
  await page.locator('.menu-resume').click({ timeout: 20000 });
  await page.waitForTimeout(8000);
}

export default async ({ page, shot }) => {
  await page.waitForTimeout(5000);

  for (const scale of SCALES) {
    if (scale !== 1) await atScale(page, scale);
    await shot(`scale-${String(scale).replace('.', '-')}`);

    const found = await controls(page);
    check(found.length > 0, `${scale * 100}%: the strip is explained at all`);

    // §3 makes the SIG meter the one permanent element, and it is the readout
    // most likely to be dropped, being the only one taller than a line of text.
    check(
      found.some((control) => control.name.startsWith('SIG')),
      `${scale * 100}%: the permanent element has a control (${found.map((c) => c.name).join(' | ')})`
    );

    // One line per property per scale rather than per control: a passing drive
    // that prints sixty lines is one nobody reads, and the failure names the
    // control that broke it either way.
    const view = page.viewportSize();
    const offScreen = found.filter(
      (control) =>
        control.x < 0 ||
        control.y < 0 ||
        control.x + control.width > view.width ||
        control.y + control.height > view.height
    );
    check(
      offScreen.length === 0,
      `${scale * 100}%: every control is on screen rather than a tab stop nobody can reach` +
        (offScreen.length === 0 ? '' : ` — ${offScreen.map((c) => `"${c.name}"`).join(', ')}`)
    );

    const undescribed = found.filter((control) => control.described === null);
    check(
      undescribed.length === 0,
      `${scale * 100}%: every control points at its explanation` +
        (undescribed.length === 0 ? '' : ` — ${undescribed.map((c) => `"${c.name}"`).join(', ')}`)
    );

    const collisions = [];
    for (let i = 0; i < found.length; i++) {
      for (let j = i + 1; j < found.length; j++) {
        const a = found[i];
        const b = found[j];
        if (
          a.x < b.x + b.width &&
          b.x < a.x + a.width &&
          a.y < b.y + b.height &&
          b.y < a.y + a.height
        ) {
          collisions.push(`"${a.name}" / "${b.name}"`);
        }
      }
    }
    // Control against control. Control against a *drawn* number that was
    // refused a control is the same property one step further out, and it is
    // held headlessly against the Pixi objects themselves — this drive can see
    // the DOM and not the glyphs under it.
    check(
      collisions.length === 0,
      `${scale * 100}%: no two controls answer for each other` +
        (collisions.length === 0 ? '' : ` — ${collisions.join(', ')}`)
    );
  }

  // Back to 100% for the keyboard walk, which is about traversal rather than
  // about scale — and which jsdom could not hold either: it implements no
  // sequential focus navigation, and `:focus-visible` is an engine's judgement
  // about how the focus arrived, not a flag a test can set.
  await atScale(page, 1);
  await page.evaluate(() => document.activeElement?.blur?.());

  // Keyed on `aria-describedby` (`readout-sig`, `readout-clock`, …) and not on
  // the accessible name, because one of the readouts is a **clock**: it ticks
  // between the read that records the order and the walk that checks it, and a
  // comparison of names then fails for the one reason that is not a bug.
  const expected = (await controls(page)).map((control) => control.described);
  const reached = [];
  for (let i = 0; i < expected.length + 6 && reached.length < expected.length; i++) {
    await page.keyboard.press('Tab');
    const at = await page.evaluate(() => {
      const el = document.activeElement;
      return el !== null && el.classList.contains('readout')
        ? el.getAttribute('aria-describedby')
        : null;
    });
    if (at !== null && !reached.includes(at)) reached.push(at);
  }
  await shot('keyboard-walk');

  check(
    reached.join(' | ') === expected.join(' | '),
    `Tab walks the strip in the order it is drawn` +
      ` (reached ${reached.join(' ')} against ${expected.join(' ')})`
  );

  // `:focus-visible` is an engine's judgement about how the focus arrived, so
  // this is the half of criterion 1 that no runner can hold: the line is on
  // screen because the keyboard put it there, and on exactly one readout.
  const shown = (await controls(page)).filter((control) => control.shown);
  check(
    shown.length === 1 && shown[0].described === reached[reached.length - 1],
    `and the keyboard is what showed the line (${shown.map((s) => s.described).join(', ')})`
  );

  console.log('');
  console.log(
    `readouts: ${expected.length} controls, all reachable by Tab, none overlapping, ` +
      `SIG present at ${SCALES.map((s) => `${s * 100}%`).join(', ')}.`
  );
};
