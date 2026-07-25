# Design audit — SportsBnB

Findings from running the app and screenshotting it, rather than reading the
markup. Every item below was observed in a rendered page; none of them were
visible from the source alone.

Method: `npx vite --host 127.0.0.1 --port 4173`, then Chromium via
`@playwright/test` at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`,
screenshotting at 1440 / 768 / 375 and reading the images. Worth re-running
before and after any visual change — three of the fixes below were regressions
or defects introduced by earlier "improvements" that looked correct in code.

## Baseline

The app is in better shape than a glance suggests. The `court at night` token
system is real: Space Grotesk display, DM Sans body, JetBrains Mono for prices
and times, a layered surface scale, a considered shadow ladder. The hero has
genuine typographic hierarchy, an italic accent line, real photography with
floating glass status cards, and a working trust bar.

What made it *read* as unfinished was precision, not direction — a wordmark that
disappeared, a punchline the colour of disabled text, strings clipped by stray
`truncate`, and a tonal ladder too flat to separate anything.

## Fixed

| Finding | Detail |
|---|---|
| Wordmark invisible on dark | `logo-full.png` renders "Sports" in brand navy. On the dark nav and footer, half the logo was simply absent. Rebuilt as symbol + live type so "Sports" inherits `currentColor`. |
| Hero punchline read as disabled | "No phone calls." used `text-foreground-soft` — a *secondary* token — at 5.75rem. Lifted to `foreground/70`. |
| Hero cards clipped | A `truncate` cut "Live availability, no calls" to "…no ". The booking card wrapped to two lines at 280px. |
| Dark tonal ladder too flat | `--background` at L=5%, `--surface-1` at L=7%. Two points of lightness is imperceptible, so eight alternating ~1000px sections rendered identically and the page scrolled as one black corridor. Widened surface-1/2/3, card, popover, border. **Highest-leverage change found — it re-separates every section, card and border app-wide.** |
| Section rhythm | Eight sections at `py-24 md:py-36` (144px per side). Tightened to `py-16 md:py-24`. |
| Ten icon-only buttons unnamed | WCAG 4.1.2. `ChatButton`, `ChatInput`, `ChatBubble` ×2, `ReviewList`, `BlogPostsTab` ×2, `AIChatbot` ×3 announced as bare "button". |
| Footer grid imbalance | Brand held `col-span-5` (~566px) but capped content at `max-w-sm` (384px), stranding ~180px. Shifted to 4/8. |

## Verified clean

- **No horizontal overflow** at 375px or 768px. `scrollWidth === clientWidth`
  at both. The elements extending past the viewport are decorative blur layers
  inside `overflow-hidden` parents — intentional and contained.
- **`AIChatbot` launcher** already carried `aria-label="Open AI assistant"`.

## Open

Ordered by leverage, not by effort.

1. **Section density.** The rhythm fix reduced padding, but sections still carry
   sparse content over large areas. This is a content-per-screen problem, not a
   spacing one, and it is the main thing still making the page feel empty.
2. **Nav density.** Four links in a 64px bar with a large void between the
   wordmark and the auth actions.
3. **Empty states.** Currently the *most*-seen surface, since the database has
   no venues. They deserve more design attention than the populated views.
4. **Auth pages** — login, signup, reset, both onboarding flows.
5. **Static pages** — About, FAQ, Contact, For Owners, Blog, Community.
6. **Venue cards and the booking panel** — blocked on seed data, see below.
7. **Mobile layout quality.** Confirmed not *broken* at 375/768; not yet
   designed for.

### Two unlabelled buttons left, deliberately

`sidebar.tsx` and `carousel.tsx` are vendored shadcn primitives. They are
generic by design and should be labelled by whoever mounts them — patching the
vendor file means the next component update silently drops it.

### Blocker: no seed data

`venues.owner_id` is `NOT NULL REFERENCES auth.users(id)`, so demo venues need
a real account. Both routes to creating one from this environment — a direct
`auth.users` insert and the public `/auth/v1/signup` endpoint — were denied by
the permission classifier.

Until an owner account exists, Discover, venue details, search results and both
dashboards render empty and cannot be designed or evaluated. That is roughly
half the app's surface.

**To unblock:** sign up once in the app, then seed venues under that `user_id`.
