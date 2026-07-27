#!/usr/bin/env node
/**
 * Loads the app once so Vite has transformed its module graph.
 *
 * The dev server answers in 200ms and is not ready in any useful sense: it
 * transforms modules on demand, so the first browser to arrive waits for
 * hundreds of them while every later one is served from cache. For most of
 * this suite that is invisible — the audits wait seconds for the page anyway.
 *
 * `layout-shift.mjs` is the exception, and it is the one that caught this. It
 * navigates with `waitUntil: 'commit'` and grabs the skeleton 2s later, on
 * purpose: a skeleton exists only while the page is loading, so there is no
 * settled state to wait for. Two seconds is ample against a warm server and
 * nowhere near enough against a cold one, where the app has not mounted yet.
 *
 * It never showed until the smoke job was split. In one long step this ran
 * fifteen minutes in, behind everything else, on a server that had been
 * serving continuously; in a parallel suite it runs eleven seconds after a
 * cold start. Same check, same app, different position — which is exactly the
 * dependency that splitting into independent jobs is supposed to remove.
 *
 * So the warm-up belongs to whoever starts the server, and every suite gets
 * the same server whatever order it runs in.
 */
import { chromium } from '@playwright/test';
import { newStubbedPage } from '../lib/stub-page.mjs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4173';
/** Routes whose module graphs cover most of the app: home, a list, a detail. */
const ROUTES = ['/', '/venues', '/venue/11111111-1111-1111-1111-111111111111'];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const started = Date.now();

for (const route of ROUTES) {
  const page = await newStubbedPage(browser, { userType: 'player', width: 1440, height: 900 });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Wait for React to have put something real on the page, not just for the
  // HTML shell — the transform cost is in the modules, not the document.
  await page
    .waitForFunction(() => (document.body.innerText ?? '').trim().length > 200, { timeout: 60000 })
    .catch(() => {});
  await page.context().close();
}

await browser.close();
console.log(`Warmed ${ROUTES.length} route(s) in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
