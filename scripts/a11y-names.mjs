#!/usr/bin/env node
/**
 * Accessible-name audit.
 *
 * Every control needs a name. An icon-only button with no `aria-label`
 * announces itself as "button" and nothing else — the notifications bell in
 * the header was exactly that, on every page in the app, and it took a
 * tap-target sweep noticing an unlabelled 40×40 box to find it.
 *
 * The name is **not** computed here. Reimplementing the accessible-name
 * algorithm — aria-labelledby, then aria-label, then a native label, then
 * contents, then title, with all the recursion and the special cases for
 * inputs — is a good way to write a checker that is confidently wrong. Chrome
 * already computes it, so this asks Chrome, over CDP, for the same string a
 * screen reader would read.
 *
 * Ignored nodes are skipped: `aria-hidden`, `display:none`, and the mirror
 * inputs Radix ships beside every switch are all invisible to assistive tech
 * and are not defects.
 *
 * Usage — needs a preview server on :4173:
 *   node scripts/a11y-names.mjs player / /discover /games
 *   node scripts/a11y-names.mjs --json owner /owner/venues
 */
import { chromium } from '@playwright/test';
import { BASE, EXEC, resolveRoute, newStubbedPage } from './lib/stub-page.mjs';

const JSON_OUT = process.argv.includes('--json');
const argv = process.argv.slice(2).filter((a) => a !== '--json');
const userType = argv[0];
const ROUTES = argv.slice(1);

// Roles a user is expected to operate. `img` is deliberately absent: a
// decorative image with an empty alt is correct, and flagging it would bury
// the controls under noise.
const INTERACTIVE = new Set([
  'button',
  'link',
  'checkbox',
  'switch',
  'radio',
  'textbox',
  'searchbox',
  'combobox',
  'listbox',
  'slider',
  'spinbutton',
  'tab',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
]);

const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
const report = [];

for (const route of ROUTES) {
  const page = await newStubbedPage(browser, { userType, width: 1440, height: 900 });
  try {
    await page.goto(BASE + resolveRoute(route), {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(2500);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Accessibility.enable');
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');

    const unnamed = nodes.filter(
      (n) => !n.ignored && INTERACTIVE.has(n.role?.value) && !(n.name?.value || '').trim(),
    );

    const items = [];
    let thirdParty = 0;
    for (const n of unnamed) {
      // Resolve to markup, so the report says which control rather than
      // handing back an opaque node id nobody can act on.
      let html = '(unresolved)';
      try {
        const r = await cdp.send('DOM.getOuterHTML', { backendNodeId: n.backendDOMNodeId });
        html = r.outerHTML.replace(/\s+/g, ' ').slice(0, 120);
      } catch {
        // Node detached between snapshot and resolution — rare, and not worth
        // failing the run over.
      }
      // The Google Maps JS API injects its own pan and marker controls as
      // bare `<div role="button" tabindex="0">` with inline styles and no
      // name. They are not this codebase's markup and cannot be fixed from
      // here, so they are not this audit's business — but the count is
      // printed rather than dropped silently, because an exclusion nobody can
      // see is how a checker quietly stops checking.
      //
      // What *is* ours is the map container, and both maps now carry a label.
      if (/\brole="button" tabindex="0" style="[^"]*position: absolute/.test(html)) {
        thirdParty += 1;
        continue;
      }
      items.push({ role: n.role.value, html });
    }
    // The same unnamed control repeated down a list is one defect.
    const seen = new Map();
    for (const i of items) seen.set(`${i.role}|${i.html}`, (seen.get(`${i.role}|${i.html}`) ?? 0) + 1);
    report.push({
      route,
      thirdParty,
      items: [...seen].map(([k, count]) => {
        const [role, ...rest] = k.split('|');
        return { role, html: rest.join('|'), count };
      }),
    });
  } catch (e) {
    report.push({ route, error: String(e).split('\n')[0].slice(0, 100) });
  }
  await page.context().close();
}
await browser.close();

// A route that could not be measured is not a route that passed.
const errors = report.filter((r) => r.error);
const total = report.reduce((n, r) => n + (r.items ?? []).reduce((m, i) => m + i.count, 0), 0);
const skipped = report.reduce((n, r) => n + (r.thirdParty ?? 0), 0);

if (JSON_OUT) {
  console.log(JSON.stringify({ report, errors, total }, null, 2));
} else {
  console.log(`\nUnnamed controls (${userType})\n`);
  for (const r of report) {
    if (r.error) {
      console.log(`ERR   ${r.route}  ${r.error}`);
      continue;
    }
    if (!r.items.length) continue;
    console.log(`  ${r.route}`);
    for (const i of r.items) {
      console.log(`    ${i.role}${i.count > 1 ? ` x${i.count}` : ''}  ${i.html}`);
    }
  }
  console.log(
    `\n${total} unnamed control(s) across ${report.length} route(s)` +
      `${skipped ? `, ${skipped} third-party control(s) skipped` : ''}` +
      `${errors.length ? `, ${errors.length} unmeasurable` : ''}\n`,
  );
}

process.exit(total === 0 && errors.length === 0 ? 0 : 1);
