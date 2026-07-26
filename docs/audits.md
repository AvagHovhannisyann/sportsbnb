# The audits

Eighteen scripts in `scripts/` measure this app in a real browser. They all
run in CI, in the `smoke` job, and they can all be run by hand.

Every one of them exists because something was wrong and nothing noticed. The
header of each script says what that was, with the number it measured. Read
the header before changing a script — several encode a specific trap, and
"simplifying" them has reintroduced the bug more than once.

## Running one

They need the dev server, and nothing else — no secrets, no database. The
harness stubs the Supabase session and intercepts every REST call.

```bash
npx vite --host 127.0.0.1 --port 4173 &
node scripts/rendered-contrast.mjs player / /venues /venue/:venue
```

Placeholders like `:venue`, `:game`, `:team`, `:booking`, `:payment` and
`:slug` resolve to the stub ids. `SMOKE_WIDTH` / `SMOKE_HEIGHT` change the
viewport; the mobile passes in CI use `375x812`.

The route lists CI uses live in `.github/workflows/ci.yml` as `$PLAYER`,
`$OWNER`, `$ADMIN`, `$ANON`, `$EMPTY_*` and `$ERROR_*`.

## Who the page thinks you are

The first argument is a user type. It selects a role, and optionally a shape
for the data:

| argument | what renders |
| --- | --- |
| `player` / `owner` / `admin` | signed in, with populated fixtures |
| `anon` | signed out |
| `…-empty` | signed in, no content rows |
| `…-error` | signed in, every content query returns 500 |
| `…-slow` | signed in, every content response held open |

A typo throws rather than falling through — see `parseUserType`. That matters
more than it sounds: a role the app does not recognise renders something
subtly wrong, and an audit will report a clean run against it.

**Each of those four shapes was added because it found something the default
could not see.** Signed out: two unnamed controls and two AA contrast failures
on /login and /signup, which redirect to /dashboard under a stubbed session
and so had never been loaded by any check here. Empty: /owner/equipment
rendering no `h1` at all before a first venue exists. Error: five pages telling
the user they had no venues, no transactions, no bookings, when the request had
simply failed. Slow: forty-six loading spinners with nothing to announce them.

## What each one checks

### Static — no browser

| script | checks |
| --- | --- |
| `palette-contrast` | raw Tailwind palette colours in class strings, against every surface in the theme |
| `no-emoji-icons` | emoji used where a Lucide icon belongs |
| `prod-bundle-check` | the production shape of DEV-gated code, which every other check sees only in its development form |

### Structure and semantics

| script | checks |
| --- | --- |
| `smoke-routes` | every route loads: no thrown error, no tripped boundary, no blank render, no horizontal overflow |
| `a11y-names` | every control has an accessible name, asked of Chrome rather than reimplemented |
| `heading-outline` | one `h1` per page, no skipped levels |
| `page-titles` | WCAG 2.4.2 — every route has a title of its own, and no two pages share one |
| `input-purpose` | WCAG 1.3.5 — email, tel and password fields say what they collect |

### Colour

| script | checks |
| --- | --- |
| `contrast-audit` | every design token against every surface, both themes |
| `rendered-contrast` | WCAG 1.4.3 and 1.4.11 — the text and icons actually on screen, against the backdrop they actually land on |
| `glass-contrast` | text on the translucent header, against what is scrolling under it |
| `glass-risk` | which routes are worth the expensive glass check, ranked by how much the backdrop under the bar varies |

### Interaction

| script | checks |
| --- | --- |
| `tap-targets` | WCAG 2.5.8 at phone width, including the spacing exception |
| `focus-visible` | WCAG 2.4.7 and 2.4.11 — a focus indicator that is both drawn and not covered |
| `layout-shift` | content that moves after it lands |

### Honesty

| script | checks |
| --- | --- |
| `error-affordance` | that a failed request is not reported to the user as "you have nothing" |
| `loading-status` | WCAG 4.1.3 — that a spinner or skeleton is announced, not just drawn |
| `numeral-glyphs` | that nothing in a monospaced numeral run reaches outside the font's repertoire |

## Adding one

Two rules, both learned the hard way.

**Prove it can fail before believing that it passes.** Every script here that
skipped this shipped with a measurement bug. Most take a `*_SELFTEST=1`
environment variable that injects probes whose answers are fixed by
construction; the rest were proved by breaking the app on purpose and watching
the check catch it.

**Compute the expected number, do not remember it.** Comments in this
directory have asserted 4.83, 3.95, 5.71, 4.68 and 2.44 where the correct
answers were 6.92, 4.62, 17.49, 4.34 and 2.48. The check was right every time.

And a third, less about correctness than about being read: when a script
cannot measure something soundly, it should say so in its own column rather
than fold it into a pass or a fail. `rendered-contrast` reports what it
refuses to score and why; `loading-status` separates indicators that are
deliberately `aria-hidden` from ones nobody thought about; `input-purpose`
lists fields whose purpose is a judgement call instead of guessing. A pass
means something only if the things it could not see are visible too.
