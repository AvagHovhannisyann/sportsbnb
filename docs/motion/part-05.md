## Venue detail & gallery

Scope: `/venue/:id` — the route is registered at `src/App.tsx:175` and the page
is `src/pages/VenueDetailsPage.tsx` (479 lines). The two components this part
covers in depth are:

- `src/components/venue/VenueGallery.tsx` — hero grid, lightbox dialog, dot rail
- `src/pages/VenueDetailsPage.tsx` — loading skeleton, amenities panel, the
  fixed mobile action bar, and the desktop sticky booking column

Supporting components touched but not owned here: `src/features/booking/BookingPanel.tsx`
(the real Reserve button, line 320-323, inside a `.glass` card at line 192),
`src/components/venue/VenueChatButton.tsx`, `src/components/venue/WeatherWidget.tsx`.

### What the repo actually gives us

Verified against the working tree, not assumed:

- **framer-motion `^12.34.3` is installed** (`package.json` dependencies). It is
  already used in `src/pages/HomePage.tsx:11` (with `useReducedMotion`),
  `src/pages/ForOwnersPage.tsx:20`, and
  `src/components/ui/container-scroll-animation.tsx:2`. The shared vocabulary is
  `src/lib/motion.ts`: `easeOutExpo = [0.16, 1, 0.3, 1]` (line 22),
  `transitionFast/Base/Slow` = 150/250/400ms (24-26), `fadeUp`, `fadeIn`,
  `scaleIn`, `staggerChildren` at 0.07s, `tapScale` (28-49). Reuse it.
- **Remotion is not in `package.json`.** Nothing below proposes it.
- CSS motion primitives are `src/index.css:135-140`:
  `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`,
  `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`,
  `--dur-fast: 150ms`, `--dur-base: 250ms`, `--dur-slow: 400ms`.
- `tailwindcss-animate` is registered (`tailwind.config.ts:158`), so
  `animate-in / fade-in-0 / zoom-in-95 / slide-in-from-* / duration-*` exist.
  Project keyframes are only `fade-in`, `shimmer`, `accordion-down/up`
  (`tailwind.config.ts:101-124`). Note that the project `fade-in` keyframe
  carries `translateY(8px)` (lines 110-113) — it is not a plain opacity fade,
  and case 42 needs a plain one.
- Tailwind 3.4.17 ships the `motion-safe:` / `motion-reduce:` variants natively.
  No plugin needed.
- **The global reduced-motion escape hatch is `src/index.css:619-630`** and it
  currently covers exactly two things: `.live-dot::after` and `.card-lift`. Its
  comment claims *"Nothing else in the app declares a hover transform, so this
  covers the set."* That is false — `VenueGallery.tsx:93-94` declares
  `group-hover:scale-105` on every gallery image. Case 37 is that gap.

### One thing to fix before anything else

`src/index.css:619-630` is the only CSS-side reduced-motion block in the app,
and it is already out of date. Every case below states its own fallback, and
each CSS case names the selector that has to land in that block. If a case ships
without its fallback line, it ships broken.

---

### 37. Gallery tile: the picture moves, the frame does not

- **Where**: `/venue/:id` → `src/components/venue/VenueGallery.tsx:93-94`
  (`imgClass`), applied to the main tile at line 136 and every thumbnail at
  lines 164-168.
- **Motion**: The image scales `1 → 1.04` inside a crop that does not move —
  the tile is `overflow-hidden rounded-xl` (`tileBase`, line 88) and the grid row
  is a stated 384px at md and up (`galleryHeight`, line 123). That distinction
  is the whole message: in this app a *card* that lifts means "this navigates
  somewhere else" (`.card-lift`, `src/index.css:614-616`), and a *picture* that
  moves inside a fixed frame means "this opens the photo". Today the gallery
  reads as neither, because the zoom is `group-hover` only while the tile is a
  real `<button>` with `focus-visible:ring-2` (line 88) — so a keyboard user gets
  the ring and no zoom, and the two affordance states disagree about what the
  tile is. Add `group-focus-visible:` alongside `group-hover:` so pointer and
  keyboard say the same thing.
- **Timing**: 250ms `cubic-bezier(0.16, 1, 0.3, 1)` in and out (`--dur-base` +
  `--ease-out-expo`). Currently `duration-300` with Tailwind's default
  `cubic-bezier(0.4, 0, 0.2, 1)` — neither value is in the token set, so the
  gallery is the one surface in the app running its own timing.
- **Build**: Tailwind only. Replace
  `transition-transform duration-300 group-hover:scale-105` with
  `motion-safe:transition-transform motion-safe:duration-[250ms] motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:scale-[1.04] motion-safe:group-focus-visible:scale-[1.04]`.
  No framer-motion: this is a two-state transform on a static element with no
  presence or layout involved.
- **Reduced motion**: The `motion-safe:` prefix is the fallback — under
  `prefers-reduced-motion: reduce` the declarations are not emitted at all, so
  the image never scales and never transitions. Also correct the false comment
  at `src/index.css:622-623`; leaving it there is how the next hover transform
  gets missed too.
- **Perf**: `transform` only, composite-only, no reflow (the `<img>` is
  `object-cover` filling a definite box). One flag: a transform under
  `overflow-hidden` + `rounded-xl` makes the browser clip a composited layer
  against a rounded path, which WebKit re-rasterises per frame on some builds.
  Do **not** add `will-change: transform` to fight it — the transform creates the
  layer for its own duration and a permanent `will-change` on up to five tiles
  costs more than it saves.

---

### 38. The clicked photo becomes the lightbox photo **[HIGH IMPACT]**

**Why this one**: it is the only case here that changes what the user *knows*
rather than how it feels. The gallery shows up to five tiles; the lightbox shows
one, chrome-less, on black. Right now there is nothing connecting them, so after
opening you cannot tell which of the five you are in, and the next/prev arrows
(`VenueGallery.tsx:199-226`) move you through a set whose starting point you have
already lost. This is the screen where someone decides to spend money on a
venue; "which photo am I looking at" should never be a question.

- **Where**: `/venue/:id` → `src/components/venue/VenueGallery.tsx` —
  `openLightbox` (72-75), the tile buttons (130-137 and 156-175), the
  `DialogContent` (185) and the lightbox image (210-214).
- **Motion**: The clicked tile's `<img>` *is* the lightbox image. It travels and
  rescales from its grid rectangle to its `max-h-[80vh] max-w-full object-contain`
  rectangle, over the black backdrop fading in beneath it. On close it returns to
  the tile for the **currently selected** index — not the one you opened — so if
  you arrowed from photo 1 to photo 4, closing lands you on thumbnail 4 and your
  next click is where your eye already is. If the selected photo is not one of
  the five on screen (`thumbnails = allImages.slice(1, 5)`, line 80), the image
  fades out at `scale(0.98)` in place instead of flying to a tile that does not
  exist.
- **Timing**: Travel 280ms `cubic-bezier(0.16, 1, 0.3, 1)` — deliberately longer
  than `--dur-base` (250ms), because the photo crosses up to 60% of the viewport
  and an object covering that much distance in 250ms reads as a cut, not a move.
  Backdrop `opacity 0 → 1` in 180ms `cubic-bezier(0.4, 0, 0.2, 1)`, starting with
  the travel so the photo is never mid-flight over an undimmed page. Close: 200ms
  same easing both.
- **Build**: framer-motion, unavoidably. `<LayoutGroup>` around the component,
  `motion.img layoutId={`venue-photo-${img.id}`}` on both the tile image and the
  lightbox image. CSS cannot do this — two separate elements in two subtrees, one
  of them behind a Radix portal. Two implementation constraints, both real:
  1. The shadcn `DialogContent` already animates itself —
     `zoom-in-95`, `slide-in-from-left-1/2`, `slide-in-from-top-[48%]`,
     `duration-200` at `src/components/ui/dialog.tsx:39`. That is a second
     transform source on the ancestor of the projected image and the two will
     fight. Keep those classes on the *overlay* (`dialog.tsx:22`) and render the
     lightbox image outside the animated content box, or neutralise them with
     `data-[state=open]:animate-none` on the wrapper for this dialog only.
  2. The crops differ — `object-cover` in the tile, `object-contain` in the
     lightbox. A pure layout projection scales the box and the image stretches
     mid-flight. Render the lightbox image with `object-cover` for the duration
     and swap to `object-contain` in `onLayoutAnimationComplete`.

  `layoutId` matching survives the Radix portal because framer-motion pairs
  through `LayoutGroup` React context, and a portal moves the DOM node without
  breaking the React tree. Verify it in the browser rather than trusting that;
  if projection misbehaves, the fallback is a hand-rolled FLIP — read
  `getBoundingClientRect()` on the tile inside `openLightbox`, stash it, and
  animate `transform` from that delta.
- **Reduced motion**: `useReducedMotion()` (the pattern already imported at
  `src/pages/HomePage.tsx:11`) → drop `layoutId` entirely, render a plain `<img>`,
  and strip the dialog's travel classes with
  `motion-reduce:!zoom-in-100 motion-reduce:!slide-in-from-top-0 motion-reduce:!slide-in-from-left-0`.
  The photo appears at final size and position; only the backdrop opacity moves,
  `0 → 1` in 120ms. No travel, no scale, nothing that crosses the viewport.
- **Perf**: `transform` + `opacity` throughout. The honest cost is one forced
  reflow at click time — layout projection reads `getBoundingClientRect()` on
  both nodes before the first frame. That is once per open, on a user gesture,
  not per frame. Never animate `width`/`height` here as a "simpler" alternative;
  that is layout on every frame, on an element containing a decoded bitmap.

---

### 39. Next / prev move the set, not the `src`

- **Where**: `/venue/:id` → `src/components/venue/VenueGallery.tsx:77-78`
  (`next` / `prev`), the image at 210-214, the chevron buttons at 199-226.
- **Motion**: Today `setSelectedIndex` swaps the `src` on a single `<img>`. Two
  consequences on real data: the browser holds the previous frame until the new
  remote image decodes — and this file's own comment (lines 13-14) says venue
  images 404 often enough to need per-tile failure state — so pressing Next reads
  as "nothing happened", then a pop. And there is no direction, so the arrows
  feel like a re-render rather than travel through a finite list. Instead: the
  outgoing photo goes `x: 0 → -32px, opacity 1 → 0`; the incoming goes
  `x: +32px → 0, opacity 0 → 1`; signs flipped for `prev`. Only 32px, not a
  full-width slide — the image sits in a `max-w-4xl` dialog and dragging an
  896px-wide bitmap across the compositor buys no extra meaning over a nudge that
  says "one step, that way".
- **Timing**: Enter 220ms `cubic-bezier(0.16, 1, 0.3, 1)`. Exit 140ms
  `cubic-bezier(0.4, 0, 1, 1)` — ease-*in*, because the photo you are leaving
  should get out of the way rather than linger. Overlapping (AnimatePresence
  default `mode="sync"`), so a held arrow key steps at ~220ms without queueing.
- **Build**: framer-motion. `<AnimatePresence custom={direction} initial={false}>`
  keyed on `selectedIndex`, with a `direction` ref set in `next`/`prev`. CSS
  cannot hold the outgoing image in the tree once `selectedIndex` changes — that
  is exactly what a presence system is for, and it is the only reason to reach
  for one here.
- **Reduced motion**: `useReducedMotion()` → both `x` offsets become `0` and the
  crossfade shortens to 120ms opacity-only. Keep the crossfade: a fade is not
  vestibular motion and it is still what tells the user the image changed, which
  matters most when the new photo is visually similar to the old one. If the fade
  is also unwanted, `duration: 0` degrades to today's instant swap with no code
  path change.
- **Perf**: `transform` + `opacity`. The real risk is not the animation — it is
  two full-resolution photos decoded and held in memory simultaneously for
  220ms. On owner-uploaded 4000px originals that is tens of MB. Set
  `decoding="async"` and preload only `selectedIndex ± 1`, not `allImages`.

---

### 40. The dot rail stops relaying out the row

- **Where**: `/venue/:id` → `src/components/venue/VenueGallery.tsx:235-251`,
  specifically the dot `className` at lines 243-246.
- **Motion**: Currently `"h-1.5 rounded-full transition-all"` with `w-6` for the
  active dot and `w-1.5` for the rest. `transition-all` on a `width` change
  animates a **layout** property: every step re-lays-out the `flex justify-center
  gap-1` row and shifts every dot after the active one, for the whole transition,
  once per arrow press. Replace it: every dot is a fixed 6px box; the active mark
  is a single 24px pill that *slides* along the rail and the dots recolour
  `bg-white/40 → bg-white` underneath it. The user reads position in a finite set
  — twelve equal dots are the scale, the travelling pill is the needle. A row
  where the boxes themselves resize communicates the same thing while also
  moving everything that is not the answer.
- **Timing**: Pill travel 200ms `cubic-bezier(0.16, 1, 0.3, 1)`. Dot colour 120ms
  `linear` (colour has no inertia to model).
- **Build**: CSS/Tailwind. One absolutely-positioned pill inside a `relative`
  rail, `transform: translateX(calc(var(--dot-i) * 10px))` with `--dot-i` set
  inline from `selectedIndex` (6px dot + 4px `gap-1` = a 10px pitch). Deliberately
  *not* framer-motion `layoutId`: case 38 already introduces a `LayoutGroup` to
  this component and a second projected element inside it means two independent
  layout animations sharing one measurement pass. A `translateX` on one span
  needs no measurement at all.
- **Reduced motion**: `motion-reduce:transition-none` on the pill. It still jumps
  to the correct dot instantly, and the dot colour still changes — position
  remains fully communicated, only the travel is dropped. Nothing is added to
  `src/index.css:619-630` because the `motion-reduce:` variant handles it inline.
- **Perf**: This case *is* the perf fix. It replaces an animated `width`
  (layout + paint on every frame, on N siblings) with a `transform` on one
  element (composite only). Also narrow `transition-all` to `transition-colors`
  on the dots — `transition-all` will animate anything anyone adds later,
  including the next layout property.

---

### 41. A tile that is loading and a tile that has failed stop looking identical

- **Where**: `/venue/:id` → the `GalleryImage` component,
  `src/components/venue/VenueGallery.tsx:15-35`, used at lines 136, 164 and 210.
- **Motion**: The component renders a bare `<img>` with an `onError` handler and
  no `onLoad` and no placeholder, so a tile is empty until the network returns
  and then the photo snaps in at full opacity; on failure it swaps to a
  `bg-surface-3` box with an `ImageOff` icon (lines 27-32), also instantly, and
  after whatever partial paint the browser already did. Instead: the tile paints
  `bg-surface-3` on mount — already the exact colour the page's own loading
  skeleton uses for this box (`src/pages/VenueDetailsPage.tsx:69`) — and the
  `<img>` starts at `opacity: 0`, going `0 → 1` on `load`. **Opacity only, no
  translate, no scale**: the frame is already the right size and in the right
  place (`galleryHeight`, line 123), and moving the photo into a box that never
  moved would contradict the one thing this layout was carefully made to
  guarantee. On `onError` the `ImageOff` panel fades in over 160ms rather than
  appearing mid-swap. What the user then understands: grey and still = still
  coming; grey with an icon = not coming. Those two states are currently
  indistinguishable for the first second, on the hero of a listing page.
- **Timing**: Load-in 260ms `cubic-bezier(0.16, 1, 0.3, 1)`, with a per-tile
  delay of `Math.min(i, 3) * 60ms` so a five-photo gallery served from cache
  resolves as a left-to-right sweep (max 180ms of stagger) instead of five
  simultaneous flashes. Failure panel 160ms, no delay — bad news should not be
  staged.
- **Build**: Tailwind + one `useState`. The component already holds `failed`
  (line 24); add `loaded` and switch on
  `cn(imgClass, "motion-safe:transition-opacity motion-safe:duration-[260ms]", loaded ? "opacity-100" : "opacity-0")`.
  No framer-motion: a two-state opacity change on an element the browser owns the
  lifecycle of.
- **Reduced motion**: `motion-safe:` prefix means the transition and the delay
  chain are simply not emitted under `reduce` — the image is at `opacity-100` the
  moment `loaded` flips. Critically, the stagger delay must be inside the
  `motion-safe:` set too; a reduced-motion user must never be made to *wait*
  180ms for a photo in the name of accessibility.
- **Perf**: `opacity` only, composite-only. One implementation landmine that will
  bite if ignored: `onLoad` does not fire for an image already complete in the
  memory cache by the time React attaches the handler, so a cached gallery would
  stay at `opacity: 0` permanently. Guard it — a `ref` plus
  `if (el.complete && el.naturalWidth > 0) setLoaded(true)` in a mount effect.
  That is the real failure mode of this pattern, not the animation.

---

### 42. Skeleton hands off to content without moving anything

- **Where**: `/venue/:id` → `src/pages/VenueDetailsPage.tsx:57-84` (the
  `venueLoading` skeleton) handing off to the real page at 148-475.
- **Motion**: The skeleton was measured to match the gallery precisely — read the
  comment at lines 64-69: 4/3 stacked below md, a flat 384px hero at md and up,
  and a note that it was previously 69px out. None of that precision is currently
  visible, because `venueLoading` flips and React swaps two whole trees in a
  single frame; nothing is on screen long enough to show that the boxes line up.
  Fix: crossfade in place. Skeleton `opacity 1 → 0`, content `opacity 0 → 1`,
  overlapping. **No `translateY`.** Every other entrance in this app uses
  `fadeUp` with `y: 16` (`src/lib/motion.ts:28-31`), and that is right for content
  arriving from nowhere — but here it would be a lie. Movement says "this is new";
  staying put says "this is the same box you were already looking at, now filled
  in". That is what makes the measured skeleton pay off.
- **Timing**: Skeleton out 140ms `cubic-bezier(0.4, 0, 1, 1)`. Content in 200ms
  `cubic-bezier(0.16, 1, 0.3, 1)` starting at 80ms — a 60ms overlap, enough that
  the page is never blank and short enough that no ghost double-image is legible.
- **Build**: CSS/Tailwind, with one new keyframe. The existing `fade-in`
  (`tailwind.config.ts:110-113`) cannot be reused: it carries
  `translateY(8px)`, which is the exact thing this case must not do. Add a
  sibling opacity-only keyframe next to it —
  `"fade-in-flat": { from: { opacity: "0" }, to: { opacity: "1" } }` and
  `"fade-in-flat": "fade-in-flat 200ms cubic-bezier(0.16, 1, 0.3, 1) 80ms both"`.
  Not framer-motion: `AnimatePresence mode="wait"` serialises (no overlap) and
  `mode="sync"` needs the exiting skeleton pulled out of flow with
  `position: absolute`, which is a lot of scaffolding for two opacity ramps.
- **Reduced motion**: Add `.animate-fade-in-flat { animation: none; }` to the
  block at `src/index.css:619-630`. Content appears at final opacity in the frame
  it mounts — which is today's behaviour, and is already correct for `reduce`.
- **Perf**: `opacity` only. The flag is not the animation, it is what it runs
  alongside: the content commit mounts `VenueGallery`, `BookingPanel`,
  `ReviewList`, `WeatherWidget` and `VenueChatButton` together. A 200ms fade
  competing with that render will drop frames and look worse than no fade. Kick
  the animation off on the frame *after* mount (`requestAnimationFrame`, or an
  `animation-delay` that outlasts the commit) so it plays on an idle main thread.

---

### 43. The mobile action bar steps aside when the real panel arrives

- **Where**: `/venue/:id` → the fixed bar at `src/pages/VenueDetailsPage.tsx:449-473`,
  and the booking column it points at, `id="booking"`, at lines 403-423.
- **Motion**: The bar is `fixed inset-x-0 bottom-14 … lg:hidden` and mounted for
  the whole page life. Its own comment (437-448) explains why it exists: on a
  375px screen the booking panel starts 1,190px into a 3,342px page. But when you
  do reach the bottom, the panel's real Reserve button
  (`src/features/booking/BookingPanel.tsx:320-323`) and the bar's Reserve (line
  469-471) are on screen simultaneously — two identical primary buttons, and the
  bar's is an `<a href="#booking">` that jumps to where the reader already is. It
  also permanently occupies ~64px on top of the 56px mobile nav. Instead: when
  `#booking` crosses 40% into the viewport the bar translates
  `translateY(0) → translateY(100%)` and fades `1 → 0`; it comes back when the
  panel leaves. What the user understands: the shortcut existed because the
  destination was far away; the destination is here now, so the shortcut yields.
  Two Reserve buttons never compete, and 64px of a small screen comes back.
- **Timing**: Out 200ms `cubic-bezier(0.4, 0, 1, 1)`. In 260ms
  `cubic-bezier(0.16, 1, 0.3, 1)`. Asymmetric on purpose — leaving should be
  quick and unremarkable, returning is the app handing you something back
  mid-scroll and wants to be noticeable without being startling.
- **Build**: CSS transform toggled by a boolean class
  (`translate-y-0` / `translate-y-full`), state from a short `IntersectionObserver`
  effect in `VenueDetailsPage` watching the element that already carries
  `id="booking"`. No framer-motion: a two-state transform on a permanently
  mounted element needs no presence system, and keeping it mounted is what lets
  the `body.has-mobile-action-bar` contract stay honest.
  **Coupled change, do not skip it**: that body class (set at
  `VenueDetailsPage.tsx:52-55`) drives `--fab-lift: 4.75rem` at
  `src/index.css:359-363`, which lifts the floating AI launcher clear of the
  Reserve button. If the bar hides and the class stays on, the launcher floats
  74px above nothing. Toggle the class in the same state change, and give the
  launcher's own offset a matching 260ms transition so the two do not cross.
- **Reduced motion**: No travel. Under `reduce` the bar switches to
  `opacity 1 → 0` over 120ms and then `visibility: hidden`
  (`motion-reduce:transition-[opacity] motion-reduce:duration-[120ms]` plus
  `translate-y-0` pinned), and `--fab-lift` changes with no transition. A bar
  sliding off the bottom edge of a phone while the user is scrolling is precisely
  the class of motion `reduce` exists to remove.
- **Perf**: `transform` + `opacity` only — never animate `bottom`, which is
  layout. The genuine risk is on the element itself: line 449 carries
  `backdrop-blur-xl` with a `supports-[backdrop-filter]:bg-card/85` fallback. A
  backdrop filter on a *translating* fixed element re-samples the region behind it
  every frame and is by a distance the most expensive thing on this page on
  mid-range Android. Either drop the blur for the duration (set a
  `data-animating` attribute and `data-[animating]:backdrop-blur-none`, restoring
  it on `transitionend`) or accept it and hold the transition at 200ms so the
  cost is bounded.

---

### 44. Reserve travels to the panel and the panel says it arrived

- **Where**: `/venue/:id` → `src/pages/VenueDetailsPage.tsx:469-471`
  (`<a href="#booking">Reserve</a>`) and its target at line 403, which already
  carries `scroll-mt-24`.
- **Motion**: A bare fragment link today, so the browser cuts instantly — up to
  ~2,150px on the 3,342px mobile page the code comment at 437-448 measures. A jump
  that size is not navigation the eye can follow: you were reading reviews, now
  you are looking at a date strip, with no evidence the two are the same page.
  Two parts. **(a) Travel**: `scrollIntoView({ behavior: "smooth", block: "start" })`,
  which respects the existing `scroll-mt-24` and so lands the panel below the
  sticky header rather than under it. **(b) Arrival**: the booking panel takes a
  single ring pulse — `box-shadow` from `var(--shadow-md)` to
  `var(--shadow-ring-primary)` and back. That token already exists
  (`src/index.css:130`, `0 0 0 4px hsl(var(--primary) / 0.12)`, and line 228 for
  dark) and is this app's own "this is the thing you asked for" mark. One pass,
  never a loop. Together they answer the two questions a jump leaves open: *did I
  move?* and *to what?*
- **Timing**: The smooth scroll is browser-controlled and not settable —
  empirically ~400-500ms in Chrome for this distance; do not pretend otherwise in
  the implementation. The ring: 180ms in `cubic-bezier(0.16, 1, 0.3, 1)`, 120ms
  hold, 320ms out `cubic-bezier(0.4, 0, 0.2, 1)`. Start it on `scrollend` where
  supported, otherwise a 450ms timeout — firing it early means the highlight
  plays off-screen and the arrival is unmarked.
- **Build**: CSS keyframe (`booking-arrive`) toggled by a class from a click
  handler; the scroll itself is the platform's. Not framer-motion — nothing here
  is presence or layout, and driving the scroll from JS would mean replacing
  native scrolling, which breaks both the `sticky top-24` sidebar (line 409) and
  the URL fragment. Keep the `href="#booking"` on the anchor and only
  `preventDefault()` when `scrollIntoView` is available, so the control still
  works as a link with JS off and still shows a real target in the status bar.
- **Reduced motion**: `scroll-behavior: auto` — an instant jump, i.e. today's
  behaviour. Smooth scrolling over two thousand pixels is a documented nausea
  trigger and is exactly what `reduce` is asking you not to do. Keep the ring,
  which is a shadow/colour change with no movement, but drop the 120ms hold and
  play it as a flat 200ms in/out so the destination is still marked. Both lines
  go in the block at `src/index.css:619-630`:
  `html { scroll-behavior: auto; }` and a shortened `booking-arrive`.
- **Perf**: `box-shadow` is a paint property, not a composited one — it repaints
  the panel's bounding box each frame. Acceptable for one ~620ms pass on one
  element; unacceptable looped. One specific hazard: `BookingPanel`'s root is
  `glass rounded-2xl p-6` (`src/features/booking/BookingPanel.tsx:192`), and a
  repaint under a backdrop filter forces the blur to re-sample. Safer variant —
  put the ring on an absolutely-positioned `::after` on the sticky wrapper (line
  409) and animate its `opacity` instead, so the paint happens on a separate
  transparent layer and never touches the glass.

---

### 45. Amenities get a reading order

- **Where**: `/venue/:id` → the Amenities panel,
  `src/pages/VenueDetailsPage.tsx:324-340`, with icons from the `amenityIcons`
  map at lines 128-133 (`Parking`, `Showers`, `Lockers`, `Wifi`, plus a
  `CheckCircle` default).
- **Motion**: The grid is `grid-cols-2 md:grid-cols-3 gap-4` with every row in
  `text-muted-foreground` — icon and label, all painted at once, all the same
  weight. This is the checklist someone scans to answer "showers? parking?", and
  it currently reads as a block of grey with no entry point. Two additions.
  **(a) Entry**: when the panel crosses 20% into the viewport, rows enter
  `opacity 0 → 1` and `translateY 8px → 0`, staggered in DOM order — which gives
  the eye a sequence a three-column grid otherwise withholds (you currently read
  it down or across at random). **(b) Hover/focus**: only the *icon* responds —
  `scale(1) → scale(1.12)` and `text-muted-foreground → text-primary`. The label
  does not move. On a 375px two-column list this is what confirms which line your
  finger or cursor is on without reflowing the text beside it.
- **Timing**: Entry 300ms `cubic-bezier(0.16, 1, 0.3, 1)` per row, stagger
  `min(45ms, 360ms / n)` so a nine-amenity venue still finishes inside 400ms —
  a fixed stagger turns a long amenity list into a slow crawl, which is the usual
  way this effect goes wrong. Icon response 150ms (`--dur-fast`)
  `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Build**: framer-motion for the entry — `motion.div` with `whileInView` and
  `viewport={{ once: true, amount: 0.2 }}`, reusing `staggerChildren` and `fadeUp`
  directly from `src/lib/motion.ts:28-46` (override the parent to
  `transition={{ staggerChildren: 0.045 }}`; the shared default is 0.07, tuned for
  larger cards). One prop beats hand-rolling an `IntersectionObserver` plus a
  class-toggle effect. The icon response is pure Tailwind —
  `motion-safe:transition-transform motion-safe:duration-150 motion-safe:group-hover:scale-110 group-hover:text-primary`
  — no JS at all.
- **Reduced motion**: `useReducedMotion()` → the variants collapse to
  `{ opacity: 1, y: 0 }` with `transition: { duration: 0 }` and
  `staggerChildren: 0`, matching the measured behaviour documented at
  `src/lib/motion.ts:12-16` (0 elements left at opacity 0 under `reduce`). The
  icon keeps its colour change and loses the scale via the `motion-safe:` prefix
  — the affordance survives, the movement does not.
- **Perf**: `transform` + `opacity`. Flag: `venue.amenities` is unbounded, so up
  to a dozen children each get a composited layer for ~400ms. That is fine on its
  own — but do **not** also animate the `.panel` wrapper
  (`src/index.css:539-541`). Nesting a staggered child animation inside a moving
  parent doubles the layer work and, worse, makes the stagger unreadable, since
  the children's offsets are measured against a container that is itself sliding.
  Animate the children or the panel, never both.
