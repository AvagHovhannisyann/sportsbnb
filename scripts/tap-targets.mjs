#!/usr/bin/env node
/**
 * Tap-target audit at phone width.
 *
 * Loads each route at 375px with the shared stub harness and measures the
 * rendered box of every interactive element. Anything a thumb is expected to
 * hit and cannot comfortably hit is reported.
 *
 * Why this and not a lint rule: a tap target's size is a property of the
 * rendered page, not of the source. `size="icon"` is 40px in one place and 32px
 * in another depending on what the parent does to it, and no amount of reading
 * className strings tells you which. The same argument that made the contrast
 * audit render real swatches applies here — measure the thing, do not infer it.
 *
 * Threshold. WCAG 2.2 SC 2.5.8 (AA) sets 24×24 CSS px; Apple's HIG and
 * Material both say 44 and 48. This reports against **24 as the failure line**
 * and notes anything under 44, because a check that fails on a hundred
 * borderline items is a check that gets switched off. The exemptions below are
 * the ones the spec itself grants.
 *
 * Usage — needs a preview server on :4173:
 *   node scripts/tap-targets.mjs player / /discover /games
 *   node scripts/tap-targets.mjs --json owner /owner/venues
 */
import { chromium } from '@playwright/test';
import { BASE, EXEC, resolveRoute, newStubbedPage } from './lib/stub-page.mjs';

const JSON_OUT = process.argv.includes('--json');
const argv = process.argv.slice(2).filter((a) => a !== '--json');
const userType = argv[0];
const ROUTES = argv.slice(1);

const FAIL_AT = Number(process.env.TAP_MIN ?? 24); // WCAG 2.2 AA
const NOTE_AT = Number(process.env.TAP_IDEAL ?? 44); // HIG / Material

const measure = ({ min, ideal }) =>
  // Runs in the page: the only place the real box exists.
  Array.from(
    document.querySelectorAll(
      'a[href], button, [role="button"], [role="tab"], [role="checkbox"],' +
        ' [role="switch"], input:not([type="hidden"]), select, textarea, summary',
    ),
  )
    .map((el) => {
      const cs = getComputedStyle(el);

      // The target is the region that accepts the pointer, not the control's
      // own box. A checkbox inside a `<label>`, or one a `label[for]` points
      // at, is activated by clicking anywhere on that label — so the label is
      // part of the target and measuring the 16px dot alone understates it by
      // an order of magnitude. Getting this wrong would have had me padding
      // controls that are already the size of a card.
      const forLabel = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
      const own = el.getBoundingClientRect();
      const lab = (forLabel ?? el.closest('label'))?.getBoundingClientRect();
      const r = lab
        ? {
            x: Math.min(own.x, lab.x),
            y: Math.min(own.y, lab.y),
            width: Math.max(own.right, lab.right) - Math.min(own.x, lab.x),
            height: Math.max(own.bottom, lab.bottom) - Math.min(own.y, lab.y),
            right: Math.max(own.right, lab.right),
            bottom: Math.max(own.bottom, lab.bottom),
          }
        : own;

      // Radix mirrors each switch and checkbox with an aria-hidden input for
      // form submission. It is not reachable and not announced; counting it
      // reports every control twice.
      if (el.getAttribute('aria-hidden') === 'true' || el.tabIndex < 0) return null;

      // Not rendered at all — display:none, a collapsed dialog, an inactive
      // tab panel. Measuring these produced the bulk of the first run's noise
      // and none of its signal.
      if (
        r.width === 0 ||
        r.height === 0 ||
        cs.visibility === 'hidden' ||
        cs.display === 'none' ||
        Number(cs.opacity) === 0 ||
        el.closest('[aria-hidden="true"],[hidden],[data-state="closed"]')
      ) {
        return null;
      }

      // SC 2.5.8 exception, "Inline": a link inside a sentence is sized by the
      // text around it, and padding it to 24px would break the paragraph. This
      // is the exception the spec grants, not one invented to get to green —
      // it applies only to anchors whose parent holds real prose around them.
      const parent = el.parentElement;
      const inlineLink =
        el.tagName === 'A' &&
        cs.display.startsWith('inline') &&
        parent &&
        (parent.textContent || '').trim().length > (el.textContent || '').trim().length + 12;

      const label =
        (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40) ||
        `<${el.tagName.toLowerCase()}>`;

      const size = Math.min(Math.round(r.width), Math.round(r.height));
      if (inlineLink || size >= ideal) return null;
      return {
        label,
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width),
        h: Math.round(r.height),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        undersized: size < min,
      };
    })
    .filter(Boolean)
    .map((t, _i, all) => {
      // SC 2.5.8's *Spacing* exception, which is part of the criterion and not
      // a concession: an undersized target passes if a 24px-diameter circle
      // centred on it intersects neither another target's box nor another
      // undersized target's circle. Footer links stacked with real leading
      // satisfy this — without implementing it, this audit reported fifty
      // failures that the spec does not consider failures, which would have
      // meant fifty pointless edits and a check nobody trusts.
      if (!t.undersized) return { ...t, severity: 'note' };
      const cx = t.rect.x + t.rect.w / 2;
      const cy = t.rect.y + t.rect.h / 2;
      const R = min / 2;
      const crowded = all.some((o) => {
        if (o === t) return false;
        // Nearest point of the other target's box to this centre.
        const dx = Math.max(o.rect.x - cx, 0, cx - (o.rect.x + o.rect.w));
        const dy = Math.max(o.rect.y - cy, 0, cy - (o.rect.y + o.rect.h));
        if (Math.hypot(dx, dy) < R) return true;
        if (!o.undersized) return false;
        const ox = o.rect.x + o.rect.w / 2;
        const oy = o.rect.y + o.rect.h / 2;
        return Math.hypot(ox - cx, oy - cy) < min; // two radii
      });
      return { ...t, severity: crowded ? 'fail' : 'note' };
    })
    .map(({ rect: _r, undersized: _u, ...keep }) => keep);

const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {});
const report = [];
for (const route of ROUTES) {
  const page = await newStubbedPage(browser, { userType, width: 375, height: 812 });
  try {
    await page.goto(BASE + resolveRoute(route), {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    await page.waitForTimeout(2500);
    const found = await page.evaluate(measure, { min: FAIL_AT, ideal: NOTE_AT });
    // Same control repeated down a list is one defect, not twenty.
    const seen = new Map();
    for (const f of found) {
      const key = `${f.tag}|${f.label}|${f.w}x${f.h}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    report.push({
      route,
      items: [...new Set(found.map((f) => JSON.stringify(f)))]
        .map((s) => JSON.parse(s))
        .map((f) => ({ ...f, count: seen.get(`${f.tag}|${f.label}|${f.w}x${f.h}`) })),
    });
  } catch (e) {
    report.push({ route, error: String(e).split('\n')[0].slice(0, 100) });
  }
  await page.context().close();
}
await browser.close();

// A route that could not be measured is not a route that passed. The first
// version returned 0 while every route errored, which is the precise failure
// this whole approach exists to avoid.
const errors = report.filter((r) => r.error);
const fails = report.flatMap((r) => (r.items ?? []).filter((i) => i.severity === 'fail'));
const notes = report.flatMap((r) => (r.items ?? []).filter((i) => i.severity === 'note'));

if (JSON_OUT) {
  console.log(JSON.stringify({ report, fails, notes }, null, 2));
} else {
  console.log(`\nTap targets @375px (${userType}) — fail <${FAIL_AT}px, note <${NOTE_AT}px\n`);
  for (const r of report) {
    if (r.error) {
      console.log(`ERR   ${r.route}  ${r.error}`);
      continue;
    }
    if (r.items.length === 0) continue;
    console.log(`  ${r.route}`);
    for (const i of r.items.sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h))) {
      console.log(
        `    ${i.severity === 'fail' ? 'FAIL' : 'note'}  ${String(`${i.w}x${i.h}`).padStart(7)}` +
          `${i.count > 1 ? ` x${i.count}` : '   '}  ${i.tag}  ${i.label}`,
      );
    }
  }
  console.log(
    `\n${fails.length} below ${FAIL_AT}px, ${notes.length} between ${FAIL_AT} and ${NOTE_AT}px ` +
      `(${report.length} route(s)${errors.length ? `, ${errors.length} unmeasurable` : ''})\n`,
  );
}

process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
