import { chromium } from '@playwright/test';
import { newStubbedPage, resolveRoute, waitForAppReady } from './lib/stub-page.mjs';
const [userType, ...routes] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const route of routes) {
  const url = resolveRoute(route);
  const p = await newStubbedPage(b, { userType, width: 1440, height: 900 });
  try {
    await p.goto('http://127.0.0.1:4173' + url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await p.waitForTimeout(900); await waitForAppReady(p);
    const t = await p.evaluate(() => document.title);
    console.log(JSON.stringify(t).padEnd(60), url);
  } catch (e) { console.log('ERR'.padEnd(60), url); }
  await p.context().close();
}
await b.close();
