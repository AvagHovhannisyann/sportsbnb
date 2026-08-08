#!/usr/bin/env node
/**
 * Does the home page's search bar actually search?
 *
 * Every other check here reads one page and asks whether it is correct. This
 * one asks whether two pages agree, because the bug it exists for lived in
 * neither of them:
 *
 *   HeroSearch built its Sport options as `value={s.toLowerCase()}` and put
 *   that in the URL. DiscoverPage filtered with `venue.sports.includes(sport)`
 *   — exact, case-sensitive, against the capitalised strings venues are tagged
 *   with. So the primary call to action on the landing page reported "0 venues
 *   found" for a catalogue where three matched, while the category tiles a few
 *   hundred pixels below it, which passed the same strings through untouched,
 *   found all three. Both components read fine on their own.
 *
 *   The same bar wrote its Location field to `?location=`, which Discover has
 *   never read. Typing a city and pressing Search returned the entire
 *   unfiltered catalogue, presented as the result of a search.
 *
 * a11y-names saw a labelled control. smoke-routes saw a page that loaded.
 * rendered-contrast saw legible text. Nothing was looking at whether the
 * button did what it said, because no single page was wrong.
 *
 * ## Why this one has to click things
 *
 * The obvious cheap check — read the option values out of both Sport pickers
 * and compare the sets — cannot be written. Radix puts a `SelectItem`'s value
 * nowhere in the DOM. The rendered option carries `role`, `aria-labelledby`,
 * `data-state`, `data-radix-collection-item` and its label text, and that is
 * all; the value lives in React state and is observable only by what the app
 * does after you pick it. That is the whole reason this class of bug is
 * invisible to every DOM-reading check in this directory, and it is why the
 * loop below selects all twenty sports one at a time rather than sampling the
 * one somebody happened to try by hand.
 *
 * ## What it measures
 *
 *   AGREEMENT   for every sport the hero picker offers, the parameter it puts
 *               in the URL equals the label it displayed — which is the string
 *               venues are tagged with, and so the one Discover's exact match
 *               needs
 *   NARROWING   a field given a value that must exclude the fixtures actually
 *               excludes them. This is what catches a field nobody reads: an
 *               ignored filter returns the same count as no filter at all.
 *               Note what it cannot catch — run against the broken app, the
 *               Sport case still passed, because a filter that matches nothing
 *               ever and a filter that correctly excludes look identical from
 *               a count of zero. AGREEMENT is what caught that one
 *   ROUND TRIP  a realistic search — a city and a sport that both match —
 *               returns venues, and the picker still shows what was chosen
 *
 * INERT is reported rather than failed. The bar's third field, When, is held
 * in state and never written to the URL, and Discover has no date filter to
 * receive one. Removing a column from the hero bar is a layout decision; per
 * CLAUDE.md that belongs to Fabel, so this names it on every run instead of
 * quietly passing or blocking the build on someone else's call.
 *
 * Usage — needs `npx vite --host 127.0.0.1 --port 4173` running:
 *   node scripts/search-handoff.mjs
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, waitForAppReady } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';

/**
 * The hero's control ids.
 *
 * `HeroSearch` renders its form twice — once inside the mobile sheet, once as
 * the desktop bar — and both stay mounted, so the ids are prefixed per copy
 * rather than shared. They used to be bare `#hero-sport` and `#hero-location`,
 * which meant two elements answered to each id whenever both copies existed;
 * this file drove whichever the browser returned first.
 *
 * These run at 1440px, where the desktop bar is the visible one. Written as
 * constants because the same two ids appear in five places below, and the
 * previous rename broke all five at once with a 30s timeout apiece.
 */
const HERO_SPORT = '#hero-desktop-sport';
const HERO_LOCATION = '#hero-desktop-location';

/**
 * What the fixture venue is. The narrowing cases are chosen against it: a
 * sport it does not offer and a place it is not in must both empty the page.
 */
const FIXTURE = { city: 'Yerevan', sport: 'Football', missingSport: 'Swimming' };
const NOWHERE = 'Nowhereville';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const failures = [];
const notes = [];

/** Open a page as a signed-out visitor — the state a first search happens in. */
async function open(path) {
  const page = await newStubbedPage(browser, { userType: 'anon', width: 1440, height: 900 });
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForAppReady(page);
  return page;
}

/**
 * Open the hero Sport picker and choose one option by its exact label.
 *
 * By accessible name, not by CSS text. `:has-text("Tennis")` would also match
 * "Table Tennis" and click whichever came first; `:text-is("Tennis")` matches
 * nothing at all, because Playwright's text engine looks at an element's own
 * text nodes and Radix nests the label inside a `<span>`. The role query reads
 * the same name a screen reader would, which is the one on screen.
 */
async function pickSport(page, label) {
  await page.click(HERO_SPORT);
  await page.waitForSelector('[role="option"]', { timeout: 10000 });
  await page.getByRole('option', { name: label, exact: true }).click();
  await page.waitForTimeout(150);
}

/** How many venues Discover says it is showing. */
async function venueCount(page) {
  const count = await page.evaluate(() => {
    const m = (document.body.innerText ?? '').match(/(\d+)\s+venues?\s+(found|available)/i);
    return m ? Number(m[1]) : null;
  });
  return { count, url: new URL(page.url()).search };
}

// ---------------------------------------------------------------- AGREEMENT

{
  const page = await open('/');
  await page.click(HERO_SPORT);
  await page.waitForSelector('[role="option"]', { timeout: 10000 });
  const labels = (
    await page.$$eval('[role="option"]', (els) => els.map((el) => el.textContent?.trim() ?? ''))
  ).filter((l) => l && l !== 'Any sport');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);

  if (labels.length === 0) {
    failures.push('AGREEMENT  the hero Sport picker offered no sports at all');
  }

  const wrong = [];
  for (const label of labels) {
    await pickSport(page, label);
    await page.click('button:has-text("Search")');
    await page.waitForURL(/\/venues/, { timeout: 15000 });
    const emitted = new URL(page.url()).searchParams.get('sport');
    if (emitted !== label) wrong.push({ label, emitted });
    // Client-side navigation, so back is instant and the bar remounts clean.
    await page.goBack();
    await page.waitForSelector(HERO_SPORT, { timeout: 15000 });
  }
  await page.context().close();

  if (wrong.length) {
    failures.push(
      `AGREEMENT  ${wrong.length}/${labels.length} hero sport(s) emit a parameter that is not the ` +
        `tag venues carry — ${wrong
          .slice(0, 4)
          .map((w) => `${JSON.stringify(w.label)} → ${JSON.stringify(w.emitted)}`)
          .join(', ')}${wrong.length > 4 ? ', …' : ''}. Discover's filter is an exact match.`,
    );
  } else if (labels.length) {
    notes.push(`AGREEMENT  all ${labels.length} hero sport(s) emit the tag venues are stored with`);
  }
}

// ---------------------------------------------------------------- NARROWING

{
  const baseline = await open('/venues');
  const { count: unfiltered } = await venueCount(baseline);
  await baseline.context().close();

  if (!unfiltered) {
    failures.push(
      `NARROWING  /venues showed ${unfiltered === null ? 'no readable count' : '0 venues'} with no ` +
        `filters — the fixtures are not rendering, so nothing below could mean anything`,
    );
  } else {
    const cases = [
      { field: 'Location', location: NOWHERE, why: `no venue is in ${NOWHERE}` },
      { field: 'Sport', sport: FIXTURE.missingSport, why: `no fixture venue offers ${FIXTURE.missingSport}` },
    ];

    for (const c of cases) {
      const page = await open('/');
      if (c.location) await page.fill(HERO_LOCATION, c.location);
      if (c.sport) await pickSport(page, c.sport);
      await page.click('button:has-text("Search")');
      await waitForAppReady(page);
      await page.waitForTimeout(1200);
      const after = await venueCount(page);
      await page.context().close();

      if (after.count === null) {
        failures.push(`NARROWING  ${c.field} produced a page with no readable venue count at ${after.url}`);
      } else if (after.count === unfiltered) {
        failures.push(
          `NARROWING  ${c.field} changed nothing: still ${after.count} venue(s) at ${after.url} ` +
            `though ${c.why}. The field is written to the URL and never read.`,
        );
      } else {
        notes.push(`NARROWING  ${c.field} ${unfiltered} → ${after.count} venue(s) at ${after.url}`);
      }
    }
  }
}

// --------------------------------------------------------------- ROUND TRIP

{
  const page = await open('/');
  await page.fill(HERO_LOCATION, FIXTURE.city);
  await pickSport(page, FIXTURE.sport);
  await page.click('button:has-text("Search")');
  await waitForAppReady(page);
  await page.waitForTimeout(1200);
  const after = await venueCount(page);

  // The picker must also still show what was chosen. A controlled Radix Select
  // whose value matches no item renders neither the value nor its placeholder,
  // so the casing bug blanked the control as well as emptying the page — the
  // user could not see the filter that was excluding everything, let alone
  // clear it.
  const shown = await page.$$eval('[role="combobox"]', (els) => els.map((el) => el.textContent?.trim()));
  await page.context().close();

  if (!after.count) {
    failures.push(
      `ROUND TRIP  searching ${JSON.stringify(FIXTURE.city)} + ${JSON.stringify(FIXTURE.sport)} found ` +
        `${after.count} venue(s) at ${after.url}, though a fixture venue matches both`,
    );
  } else if (!shown.includes(FIXTURE.sport)) {
    failures.push(
      `ROUND TRIP  results are right (${after.count}) but no filter control reads ` +
        `${JSON.stringify(FIXTURE.sport)} — got ${JSON.stringify(shown)}. A Select whose value matches ` +
        `no item renders blank, hiding the filter from the person it is filtering for.`,
    );
  } else {
    notes.push(
      `ROUND TRIP  ${FIXTURE.city} + ${FIXTURE.sport} → ${after.count} venue(s) at ${after.url}, ` +
        `Sport picker reads ${JSON.stringify(FIXTURE.sport)}`,
    );
  }
}

await browser.close();

console.log('\nSearch handoff — the home page bar against the page it hands off to\n');
for (const n of notes) console.log(`  ok      ${n}`);
for (const f of failures) console.log(`  FAIL    ${f}`);

console.log(
  '\n  INERT (reported, not failed): the bar\'s "When" field is held in state and\n' +
    '    never written to the URL, and Discover has no date filter to read one.\n' +
    '    Two of the three columns now work; this one is a control that does\n' +
    '    nothing. Removing it, or giving it a filter to drive, is a layout and\n' +
    '    product call — see docs/handover.md §5.\n',
);

if (failures.length === 0) {
  console.log('  The home page search reaches Discover intact.\n');
} else {
  console.log(`${failures.length} handoff failure(s)\n`);
}

process.exit(failures.length === 0 ? 0 : 1);
