/**
 * The esc menu's focus trap, as a `--steps` module (#515).
 *
 *   node .claude/skills/run-game/scripts/drive.mjs --out /tmp/esc-focus \
 *     --url "http://localhost:5173/?mission=prologue-sorrowgate" \
 *     --steps .claude/skills/run-game/scripts/escFocus.mjs
 *
 * **The mission in that URL is not decoration.** Almost all of this game's HUD
 * is drawn by Pixi and is not DOM, so the only live controls under the menu's
 * glass are the contact log's rows — `disabled` until a contact has a position
 * — and the mission panel's orders. A duel against nobody has neither, and the
 * Tab walk below would then pass over an empty document without testing
 * anything. The script counts them and refuses to run rather than report that.
 *
 * docs/ui-ux.md §9.5 promises that the menu is "a modal dialog, focus moved
 * into it, every entry reachable by keyboard, and everything under its glass
 * made inert so focus cannot wander back out onto a live control".
 *
 * The middle of that sentence is asserted in `packages/frontend/test` — the
 * menu *placing* focus is what the component controls, and it needs no DOM.
 * The two ends are not, and cannot be: jsdom implements neither `inert`'s
 * semantics nor sequential focus navigation, and `@testing-library/user-event`
 * walks a focusable list of its own that does not filter on `inert` — so a
 * `tab()` test would go green while Tab walked straight under the glass onto a
 * live command bar. That is worse than no test.
 *
 * So the traversal is asserted in a real engine or nowhere, and this is the
 * engine the skill already drives. It is deliberately **not** part of
 * `npm test`: Playwright is a global install rather than a devDependency, the
 * harness needs both dev servers, and .github/workflows/ci.yml's header
 * records this account running out of Actions minutes. Run it when the esc
 * menu changes.
 *
 * It fails loudly — a thrown error, which drive.mjs turns into a non-zero exit
 * and a `steps-failed` screenshot — because a focus trap that leaks is a
 * player one Tab and one Return away from abandoning a match.
 */

/** How far to walk. Comfortably past the entries, so a leak has room to show. */
const TAB_PRESSES = 12;

/**
 * Where the focus is, described the way the promise is worded.
 *
 * `closest('.esc-menu')` is the dialog test and `closest('.game-under')` is
 * the leak test, and they are asked separately rather than as each other's
 * negation — because there is a third place focus legitimately goes.
 *
 * **A Tab walk passes through `<body>` once per cycle, and that is not a
 * leak.** §9.5's promise is that focus "cannot wander back out onto a live
 * control", and `inert` delivers exactly that: at the end of the dialog's
 * entries the document has nothing else focusable left, so the browser hands
 * focus to the document itself before wrapping back to the first entry. The
 * invariant this script holds is therefore "never on a live control", not
 * "never leaves the dialog" — the second is stricter than the doc, and
 * asserting it would fail a menu that is behaving correctly.
 *
 * Worth stating plainly because it is the one thing a jsdom test would have
 * gotten wrong in the *other* direction: `user-event`'s `tab()` does not
 * filter on `inert`, so it would have walked straight onto the command bar
 * and called it a pass.
 */
async function focusReport(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (el === null) return { name: '(nothing)', inMenu: false, underGlass: false, tag: 'null' };
    return {
      name: (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim(),
      inMenu: el.closest('.esc-menu') !== null,
      underGlass: el.closest('.game-under') !== null,
      atDocument: el === document.body || el === document.documentElement,
      tag: el.tagName.toLowerCase(),
    };
  });
}

/** The one thing §9.5 forbids: the keyboard on something the match still owns. */
function liveControl(at) {
  return at.underGlass || !(at.inMenu || at.atDocument);
}

/** The `inert` flag on the wrapper the menu floats over. */
async function underIsInert(page) {
  return page.evaluate(() => document.querySelector('.game-under')?.inert === true);
}

/**
 * How many live controls are under the glass for the walk to leak onto.
 *
 * Counted, and required to be non-zero, because without one the Tab walk
 * below cannot fail. Most of this game's HUD is drawn by Pixi and is not DOM
 * at all, and the contact log's rows are `disabled` until a contact has a
 * position to send the camera to — so a menu opened over a quiet ocean has
 * nothing under it a keyboard could reach, and every assertion in the walk
 * passes without proving anything. That is the exact failure the jsdom route
 * was rejected for; a browser drive is allowed to be slower, not blinder.
 *
 * Counted before the menu opens: `inert` is not visible to a selector, so an
 * inert subtree still answers this and the count has to be taken while the
 * water still owns its controls.
 */
async function liveControlsUnderGlass(page) {
  return page.$$eval(
    '.game-under button:not([disabled]), .game-under a[href], ' +
      '.game-under input:not([disabled]), .game-under [tabindex]:not([tabindex="-1"])',
    (nodes) => nodes.length
  );
}

function check(ok, message) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${message}`);
  if (!ok) throw new Error(message);
}

export default async ({ page, shot }) => {
  await shot('water');
  check(!(await underIsInert(page)), 'the water is reachable before the menu opens');

  const live = await liveControlsUnderGlass(page);
  check(
    live > 0,
    `${live} live controls under the glass for the walk to leak onto — run this ` +
      'against a mission (--url ".../?mission=prologue-sorrowgate"); a duel ' +
      'against nobody has none, and would pass this script without testing it'
  );

  // Escape with nothing left to cancel is the way out of the water (§9.5).
  await page.keyboard.press('Escape');
  await page.waitForSelector('.esc-menu', { timeout: 5000 });
  await page.waitForTimeout(200);
  await shot('menu-open');

  const opened = await focusReport(page);
  check(opened.inMenu, `focus was moved into the dialog (landed on "${opened.name}")`);
  check(await underIsInert(page), 'and everything under the glass went inert');

  const entries = await page.$$eval('.esc-menu .menu-entry .menu-entry-label', (nodes) =>
    nodes.map((node) => node.textContent.trim())
  );

  // Both directions, and further than the menu is long: a walk that only just
  // covers the entries cannot tell a menu that wraps from one that has run out
  // of dialog and is about to leave it. Shift+Tab is the direction a trap
  // written as "wrap at the end" forgets.
  const reached = new Set();
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let press = 1; press <= TAB_PRESSES; press++) {
      await page.keyboard.press(key);
      const at = await focusReport(page);
      check(
        !liveControl(at),
        `${key} ${press}: the keyboard reached no live control ` +
          `(on <${at.tag}> "${at.name.slice(0, 60)}")`
      );
      if (at.inMenu) reached.add(at.name);
    }
  }

  // "Every entry reachable by keyboard" (§9.5). This is also what proves the
  // cycle comes *back*: a walk that left the dialog and never returned would
  // reach the first entries and none of the rest.
  for (const entry of entries) {
    check(
      [...reached].some((name) => name.includes(entry)),
      `"${entry}" is reachable by keyboard`
    );
  }

  // The arming rule, in the engine that decides it: the Enter that armed the
  // leave entry must not also be the Enter that leaves.
  await page.click('.esc-menu .menu-entry:has-text("Return to port")');
  await page.waitForSelector('.esc-menu-confirm', { timeout: 5000 });
  await page.waitForTimeout(200);
  await shot('armed');
  const armed = await focusReport(page);
  check(armed.name === 'Stay', `arming put focus on Stay, not on the leave (got "${armed.name}")`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check(
    (await page.$('.esc-menu-confirm')) === null,
    'Escape backed out of the cost rather than out of the match'
  );

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await shot('menu-closed');
  check((await page.$('.esc-menu')) === null, 'and the second Escape closed the menu');
  check(!(await underIsInert(page)), 'which gave the water its controls back');

  console.log('');
  console.log(
    `esc menu: none of the ${live} live controls under the glass was reached ` +
      `over ${TAB_PRESSES * 2} presses.`
  );
  console.log(`entries reached: ${entries.map((entry) => `"${entry}"`).join(', ')}`);
};
