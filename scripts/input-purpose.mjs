#!/usr/bin/env node
/**
 * Inputs that collect information about the user must say what they collect.
 *
 * WCAG 1.3.5, Identify Input Purpose, Level AA. The criterion is usually
 * explained in terms of assistive technology substituting familiar icons for
 * fields, which is true and is not why it bites here. The everyday effect is
 * that a password manager cannot fill or save a login, and browser autofill
 * does nothing, so anyone who finds typing costly types their email and
 * password by hand every single time.
 *
 * The app had `autoComplete` on nothing at all — not on the login form, not on
 * signup, not on either password-reset screen.
 *
 * WHAT IS IN SCOPE, and why the line is drawn where it is.
 *
 * 1.3.5 covers fields collecting information *about the user*. It does not
 * cover arbitrary data entry, and this app is full of the latter: a venue's
 * name, a game's description, a search box. Guessing from a label would flag
 * "Venue name" as a name field and make the check untrustworthy the first time
 * anyone read its output.
 *
 * So the gate is `type`, which is unambiguous: `password`, `email` and `tel`
 * are about a person by definition. Nothing else can be inferred safely from
 * the DOM alone.
 *
 * Fields whose accessible name matches a known personal-data word — address,
 * city, postcode, country, first/last/full name — are *listed* rather than
 * failed. They may well be in scope, but the answer depends on whose address
 * it is, and a venue's address is not the user's. That is a judgement for a
 * person, and printing it is more useful than either guessing or hiding it.
 *
 * A `password` field also has to say *which* password: `current-password` on a
 * login lets a manager offer the saved one, and `new-password` on a signup or
 * reset stops it overwriting the saved entry with a value the user is still
 * typing. `autocomplete="on"` or a bare `password` token is treated as
 * missing, because neither tells the manager which of the two it is.
 *
 * Usage — needs `npx vite --host 127.0.0.1 --port 4173` running:
 *   node scripts/input-purpose.mjs <player|owner|admin> <route>...
 */
import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute, waitForAppReady } from '../scripts/lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';

const [userType, ...routes] = process.argv.slice(2);
if (!userType || routes.length === 0) {
  console.error('usage: node scripts/input-purpose.mjs <player|owner|admin> <route>...');
  process.exit(2);
}

/**
 * Tokens that answer the question the type asks. Passed in as data so the
 * expectation is stated once rather than written again inside `evaluate`.
 */
const EXPECTED = {
  password: ['current-password', 'new-password'],
  email: ['email', 'username'],
  tel: ['tel', 'tel-national', 'tel-local'],
};

/** Personal-data words worth a human look, reported and not failed. */
const SOFT = 'address|street|city|town|postal|postcode|zip|country|first name|last name|full name|surname|given name';

const COLLECT = ({ expected, soft }) => {
  const softRe = new RegExp(soft, 'i');
  const out = [];
  for (const el of document.querySelectorAll('input')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    if (el.type === 'hidden') continue;

    // The label a person sees, by the same order the accessible name uses.
    const labelled = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
    const name = (
      el.getAttribute('aria-label') ||
      labelled?.textContent ||
      el.closest('label')?.textContent ||
      el.placeholder ||
      el.name ||
      ''
    )
      .trim()
      .slice(0, 40);

    const ac = (el.getAttribute('autocomplete') || '').trim().toLowerCase();
    const want = expected[el.type];

    if (want) {
      // `on` and a bare `password` are not answers — a manager still cannot
      // tell a login from a signup.
      if (!want.includes(ac)) {
        out.push({ kind: 'fail', type: el.type, name, got: ac || '(none)', want: want.join(' | ') });
      }
    } else if (!ac && softRe.test(name)) {
      out.push({ kind: 'soft', type: el.type, name });
    }
  }
  return out;
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const failures = [];
const soft = [];
let checked = 0;

for (const route of routes) {
  const url = resolveRoute(route);
  const page = await newStubbedPage(browser, { userType, width: 1440, height: 900 });
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(900);
  await waitForAppReady(page);

  const found = await page.evaluate(COLLECT, { expected: EXPECTED, soft: SOFT });
  checked += await page.evaluate(
    () => [...document.querySelectorAll('input')].filter((i) => i.type !== 'hidden').length,
  );
  for (const f of found) (f.kind === 'fail' ? failures : soft).push({ route: url, ...f });
  await page.context().close();
}

await browser.close();

console.log(`\nInput purpose — ${checked} visible input(s) across ${routes.length} route(s)\n`);
for (const f of failures) {
  console.log(
    `  FAIL  ${f.route}  type=${f.type} ${JSON.stringify(f.name)}\n` +
      `        autocomplete=${f.got}, expected one of: ${f.want}`,
  );
}
if (soft.length) {
  console.log(
    `\n  For review — personal-data wording, no autocomplete, type not conclusive:\n` +
      soft.map((s) => `    ${s.route}  ${JSON.stringify(s.name)}`).join('\n') +
      '\n    (A venue address is not the user\'s address. Decide per field.)\n',
  );
}
if (failures.length === 0) {
  console.log('  Every email, tel and password field states its purpose (WCAG 1.3.5)\n');
} else {
  console.log(`\n${failures.length} input(s) that do not state their purpose (WCAG 1.3.5)\n`);
}

process.exit(failures.length === 0 ? 0 : 1);
