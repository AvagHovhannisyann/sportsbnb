/**
 * The backdrop walk, in one place, for the audits that run in a page.
 *
 * `text-contrast.mjs` needed it for WCAG 1.4.3 and `icon-contrast.mjs` needs
 * exactly the same thing for 1.4.11. The header of `stub-page.mjs` already
 * makes the argument for why that is one file and not two: the moment one copy
 * learns about a case the other does not, the two scripts are measuring
 * different apps, and the divergence shows up as a disagreement nobody can
 * explain.
 *
 * It is exported as **source text** rather than as a function because it runs
 * inside `page.evaluate`, which serialises the callback and drops everything
 * it closed over. The consuming script rebuilds it on the page side with
 * `new Function`, so there is one definition and two call sites.
 */
export const WALK_SOURCE = String.raw`
const parse = (c) => {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[,/]/).map((v) => parseFloat(v.trim()));
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
};

/* Composites src over dst, with dst assumed opaque. */
const over = (dst, src) => ({
  r: src.r * src.a + dst.r * (1 - src.a),
  g: src.g * src.a + dst.g * (1 - src.a),
  b: src.b * src.a + dst.b * (1 - src.a),
  a: 1,
});

const srgb = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const lum = (c) =>
  0.2126 * srgb(c.r / 255) + 0.7152 * srgb(c.g / 255) + 0.0722 * srgb(c.b / 255);

const ratio = (a, b) => {
  const pair = [lum(a), lum(b)].sort((m, n) => n - m);
  return Math.round(((pair[0] + 0.05) / (pair[1] + 0.05)) * 100) / 100;
};

const hex = (c) =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/**
 * Layers ancestor backgrounds until one is opaque.
 *
 * Returns { bg } or { reason } — never a guess. The four reasons are the
 * situations where the analytic composite and the painted pixel diverge:
 *
 *   background-image   a gradient or photo has no single backdrop colour
 *   backdrop-filter    that is glass; glass-contrast.mjs screenshots it
 *   opacity            the group composites as a unit
 *   no-opaque-backdrop the chain reached the root still translucent
 *
 * Known blind spot, shared with axe-core for the same reason: an absolutely
 * positioned sibling painted behind the element is not an ancestor, so this
 * walk misses it. It is a source of false passes, not false failures.
 */
const backdrop = (start) => {
  const layers = [];
  for (let el = start; el; el = el.parentElement) {
    const cs = getComputedStyle(el);
    if (cs.backgroundImage !== 'none') return { reason: 'background-image' };
    if (cs.backdropFilter && cs.backdropFilter !== 'none') return { reason: 'backdrop-filter' };
    if (parseFloat(cs.opacity) < 1) return { reason: 'opacity' };
    const c = parse(cs.backgroundColor);
    if (!c || c.a === 0) continue;
    layers.push(c);
    if (c.a === 1) {
      let acc = layers.pop();
      while (layers.length) acc = over(acc, layers.pop());
      return { bg: acc };
    }
  }
  return { reason: 'no-opaque-backdrop' };
};
`;

/**
 * Scrolls the whole page so content behind a scroll reveal actually paints,
 * then returns to the top.
 *
 * Not an optimisation — a correctness fix, and the largest one found in this
 * work. The first run of the text audit reported 48 of 111 text runs on `/` as
 * indeterminate for `opacity`, which read like a limit of the analytic walk.
 * It was not: the page uses framer-motion `whileInView`, and nothing below the
 * fold had ever entered the viewport. Half the home page was being quietly
 * excluded from an audit that would still have printed a pass.
 *
 * `viewport: { once: true }` is what makes one pass enough — a section
 * revealed on the way down stays revealed on the way back up.
 */
export const revealEverything = async (page) => {
  await page.evaluate(async () => {
    const step = innerHeight * 0.8;
    const wait = () => new Promise((r) => setTimeout(r, 220));
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      scrollTo(0, y);
      await wait();
    }
    scrollTo(0, 0);
    await wait();
  });
  // Transitions run ~600ms; measuring one mid-fade measures a frame no reader
  // ever sits on.
  await page.waitForTimeout(900);
};
