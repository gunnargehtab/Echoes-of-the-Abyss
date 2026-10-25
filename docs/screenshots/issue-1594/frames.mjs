// #1594 evidence: a tender's ears, the service lock named, and the flight sent with its tender.
//
// Played the way a newcomer plays it after reading the gloss: at 11:20 Tender One loads with
// the flight still under the arch, so its ears ask (magenta); the flight is brought to it and
// they answer (cyan); then tender and flight are boxed together and sent to the Concourse in
// one right click, which keeps them at the tender's pace past the named lock. Synced to the
// panel's DOM rather than to wall time. At 13:45, once Tender Two's row is in, the panel's
// overflow is read with the new glosses and again with #1585's swapped back in, so any change
// is the glosses' and not the rest of the panel's (#1593 is that rest).
const LONG = { timeout: 16 * 60 * 1000 };
const CENTRE = { x: 720, y: 450 };

export default async ({ page, shot }) => {
  const probe = () => page.evaluate(() => window.__perspectiveProbe?.());
  const look = async (x, y, distance) => {
    await page.evaluate(([x, y, d]) => window.__perspectiveCamera?.(x, y, d), [x, y, distance]);
    await page.waitForTimeout(1500);
  };
  const rowsSay = (pattern) =>
    page.waitForFunction(
      (source) => new RegExp(source).test(document.querySelector('.objectives-body')?.textContent ?? ''),
      pattern,
      LONG
    );

  // 11:20 — Tender One is loaded, and the flight is still under the arch, 500 m off.
  await rowsSay('Tender One');
  await page.waitForTimeout(3000);
  const seat = { x: 2420, y: 2900 };
  await look(seat.x, seat.y - 250, 2600);
  await shot('01-ears-asking');

  // The flight comes to it: every escort selected (0) and sent just north of the tender.
  await page.mouse.move(CENTRE.x, CENTRE.y);
  await page.keyboard.press('Digit0');
  await page.waitForTimeout(300);
  await look(seat.x, seat.y - 150, 2600);
  await page.mouse.click(CENTRE.x, CENTRE.y, { button: 'right' });
  await page.waitForTimeout(9000);
  await look(seat.x, seat.y - 150, 2600);
  await shot('02-ears-answered');

  // One box round tender and flight, one right click on the Concourse.
  await page.mouse.move(CENTRE.x - 260, CENTRE.y - 220);
  await page.mouse.down();
  await page.mouse.move(CENTRE.x + 260, CENTRE.y + 220, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await look(2500, 350, 3000);
  await page.mouse.click(CENTRE.x, CENTRE.y, { button: 'right' });
  await page.waitForTimeout(500);
  // The way north, from above the lock: the lock's ring and name, the freight and its ears.
  await look(2150, 2150, 4200);
  await page.waitForTimeout(20000);
  await look(2150, 2150, 4200);
  await shot('03-the-way-north');
  console.log('probe:', JSON.stringify(await probe()));

  // 13:45 — the panel at its fullest: both tender rows in.
  await rowsSay('Tender Two');
  await page.waitForTimeout(5000);
  const read = () =>
    page.$eval('.objectives-body', (body) => ({
      overflowPx: body.scrollHeight - body.clientHeight,
      heightPx: body.scrollHeight,
    }));
  const now = await read();
  await shot('04-panel');
  const glosses = new Map([
    [
      'Order Tender One and an escort within 400 m to the Concourse together.',
      'With an escort within 400 m, order Tender One north to the Concourse.',
    ],
    [
      'The same for Tender Two: order it and an escort within 400 m together.',
      'The same for Tender Two: an escort within 400 m, then the order north.',
    ],
  ]);
  // Swap each gloss in the page for its other text; run twice, it puts them back.
  const swap = (pairs) =>
    page.evaluate((pairs) => {
      const other = new Map([...pairs, ...pairs.map(([a, b]) => [b, a])]);
      let swapped = 0;
      for (const el of document.querySelectorAll('.objectives-body *')) {
        if (el.children.length > 0) continue;
        const was = other.get(el.textContent ?? '');
        if (was !== undefined) {
          el.textContent = was;
          swapped++;
        }
      }
      return swapped;
    }, pairs);
  const before = await swap([...glosses]);
  await page.waitForTimeout(500);
  const old = await read();
  console.log(`fit: ${JSON.stringify({ glosses: now, oldGlosses: old, swapped: before })}`);
  // The shipped glosses back, so the frames after this one show the build as it is.
  await swap([...glosses]);

  // And whether Tender One got there on that one click.
  await page.waitForTimeout(30000);
  console.log('rows:', await page.$eval('.objectives-body', (b) => b.textContent));
  await look(2500, 350, 3200);
  await shot('05-concourse');
};
