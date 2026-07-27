#!/usr/bin/env node
/**
 * A page that is loading has to say so out loud.
 *
 * WCAG 4.1.3, Status Messages, Level AA: a status change that does not take
 * focus must still be programmatically determinable, so assistive technology
 * can announce it. A spinner is a status message. So is a skeleton. Rendered
 * as a bare `<div class="animate-spin">`, neither exists for anyone not
 * looking at the screen — the page simply goes quiet, and stays quiet for
 * however long the request takes.
 *
 * This is the one state every page in the app has and no check here had ever
 * seen. The fixtures answer instantly, so the loading branch is gone before
 * the first measurement. On a real phone on a real network it is where people
 * spend the first second of every page they open.
 *
 * `-slow` holds every content response open so the branch stays on screen.
 *
 * WHAT COUNTS AS A LOADING INDICATOR, and what counts as announcing it.
 *
 * Indicator: a spinner (`animate-spin`), a skeleton (`animate-pulse`, or a
 * class naming itself one), an ARIA progressbar, or visible text saying so.
 * Announced: the indicator sits inside something carrying `role="status"`,
 * `role="progressbar"`, `aria-live`, or `aria-busy="true"`, *or* it has an
 * accessible name of its own via `aria-label`.
 *
 * `.live-dot` is excluded by name. It is an `animate-pulse` that means "this
 * is happening now", not "wait" — the one animated thing in the app that is
 * decoration rather than status, and matching on animation alone would have
 * flagged it on every page that shows a live game.
 *
 * Usage — needs `npx vite --host 127.0.0.1 --port 4173` running:
 *   node scripts/loading-status.mjs <player|owner|admin> <route>...
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';

const [role, ...routes] = process.argv.slice(2);
if (!role || routes.length === 0) {
  console.error('usage: node scripts/loading-status.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

const COLLECT = () => {
  const main = document.querySelector('main') ?? document.body;
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };

  const indicators = [];
  for (const el of main.querySelectorAll('*')) {
    // `getAttribute`, not `.className`. On an SVG element `className` is an
    // SVGAnimatedString rather than a string, and every spinner in this app is
    // a Lucide `<svg class="animate-spin">` — so the string check silently
    // skipped all of them. The script reported /owner/venues as having no
    // loading indicator while a spinner was plainly in its `<main>`, and it
    // was also not actually verifying the spinner fixes made against it.
    const cls = el.getAttribute('class') ?? '';
    // `.live-dot` pulses to mean "happening now", not "wait".
    if (/\blive-dot\b/.test(cls)) continue;
    const isSpinner = /\banimate-spin\b/.test(cls);
    const isSkeleton = /\banimate-pulse\b/.test(cls) || /\bskeleton\b/i.test(cls);
    const isProgress = el.getAttribute('role') === 'progressbar';
    if (!isSpinner && !isSkeleton && !isProgress) continue;
    if (!visible(el)) continue;

    const announced =
      !!el.closest('[role="status"],[role="progressbar"],[aria-live],[aria-busy="true"]') ||
      !!el.getAttribute('aria-label');
    // Explicitly removed from the accessibility tree is a decision, not an
    // omission. NextMoveCard's loading card carries `aria-hidden` because the
    // card is supplementary — it follows the facts on the dashboard rather
    // than being one — and a placeholder for something optional has nothing
    // to announce. Counted separately so the choice stays visible and cannot
    // be used to quietly silence a whole page.
    const hidden = !!el.closest('[aria-hidden="true"]');

    indicators.push({
      kind: isProgress ? 'progressbar' : isSpinner ? 'spinner' : 'skeleton',
      announced,
      hidden,
      cls: cls.trim().split(/\s+/).slice(0, 3).join('.'),
    });
  }

  return {
    // A page that failed to render has no skeletons either, and "no loading
    // indicator at all" is a reassuring thing to print about a blank screen.
    // That happened: a stray JSX comment broke TeamsPage mid-edit and this
    // script reported it in the benign column.
    //
    // Measured on the whole document, not on `main`. The first version used
    // `main` and immediately called four healthy owner routes blank — which
    // is what a correct loading state looks like in there: a spinner and no
    // words. The chrome outside it (header, sidebar, page title) renders
    // regardless of the data, so its absence is the actual signal.
    bodyText: (document.body.innerText ?? '').trim().length,
    total: indicators.length,
    hidden: indicators.filter((i) => i.hidden).length,
    silent: indicators.filter((i) => !i.announced && !i.hidden),
  };
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const failures = [];
const noIndicator = [];
const ariaHidden = [];
const broken = [];
let announced = 0;

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType: `${role}-slow`, width: 1440, height: 900 });
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  // Past the splash — which is itself a full-screen spinner and would be
  // measured instead of the page's own — and well short of the stubbed delay,
  // so the loading branch is what is on screen.
  await page.waitForTimeout(3200);

  const r = await page.evaluate(COLLECT);
  if (r.hidden) ariaHidden.push(`${url} (${r.hidden})`);
  if (r.bodyText < 40) broken.push({ url, chars: r.bodyText });
  else if (r.total === 0) noIndicator.push(url);
  else if (r.silent.length) {
    // One line per distinct kind: a grid of twelve skeletons is one defect.
    const kinds = [...new Set(r.silent.map((s) => `${s.kind} .${s.cls}`))];
    failures.push({ url, count: r.silent.length, kinds });
  } else announced += r.total;

  await page.context().close();
}

await browser.close();

console.log(`\nLoading status — ${routes.length} route(s) with every content response held open\n`);
for (const b of broken) {
  console.log(`  BLANK ${b.url}  only ${b.chars} character(s) of text — this page did not render`);
}
for (const f of failures) {
  console.log(`  FAIL  ${f.url}  ${f.count} indicator(s) with nothing to announce them`);
  for (const k of f.kinds) console.log(`        ${k}`);
}
if (ariaHidden.length) {
  console.log(
    `\n  Deliberately aria-hidden: ${ariaHidden.join(', ')}\n` +
      '    Removed from the accessibility tree on purpose, so there is nothing\n' +
      '    to announce. Listed so the decision stays visible.\n',
  );
}
if (noIndicator.length) {
  console.log(
    `\n  No loading indicator at all: ${noIndicator.join(', ')}\n` +
      '    Reported, not failed — a route may legitimately render everything it\n' +
      '    has before its data arrives.\n',
  );
}
if (failures.length + broken.length === 0) {
  console.log(`  ${announced} loading indicator(s), all announced (WCAG 4.1.3)\n`);
} else {
  console.log(
    `\n${failures.length} route(s) whose loading state is silent to assistive technology (WCAG 4.1.3)\n`,
  );
}

process.exit(failures.length + broken.length === 0 ? 0 : 1);
