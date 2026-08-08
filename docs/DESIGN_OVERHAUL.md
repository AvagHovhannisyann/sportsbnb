# SportsBnB Design Overhaul

> Durable implementation record for the cross-application visual redesign.
> Update this document after every major phase and before declaring any route
> family complete.

## Status

- Started: 2026-08-05
- Repository baseline: `d5204e229f4d888a832a9e7db39fcad6a0569355`
- Current stage: Phase 9 complete; final verification and repository commit
- Application-code changes started: Yes — presentation only; business, data, auth, and payment behavior remain unchanged
- Browser evidence: 47 baseline, 47 post-foundation, 94 Phase 4, targeted Phase 5 matrices, 153 owner-product captures, 33 admin captures, 19 operator/outreach cases, 35 profile/messages cases, and a final public/auth/discovery spot-check across 375, 768, 1280, and 1600px. Coverage includes populated, empty, error, loading, dialog, focus, reduced-motion, long-content, and direct-embed states.
- Legend: `[ ]` not started, `[~]` in progress or source-reviewed only, `[x]` implemented and verified

## Authority and non-negotiables

The redesign may change presentation, layout, motion, imagery, and shared UI
components. It must not change route semantics, Supabase contracts, booking or
payment behavior, authentication, authorization, RLS, pricing, payouts, or
business rules.

Decision order:

1. Functional correctness
2. Security and authorization
3. Existing business logic
4. Route and data architecture
5. Accessibility and usability
6. The visual direction in this document
7. Apple Design principles
8. Previous visual styling

## Chosen visual direction: Open Court

Open Court is a light-first, warm, highly legible marketplace system built
around operational confidence. It replaces the current neon-dark spectacle
with chalk and mineral neutrals, deep court green used selectively, and a
restrained Armenian tuff accent. Energy should come from sport, content, clear
actions, and immediate feedback rather than glow, looping motion, or decorative
layers.

The emotional goal is **ready, confident, and in control**:

- Players should feel that finding and reserving a slot is fast and dependable.
- Owners should feel that the product is an operational tool, not a marketing page.
- Administrators should be able to scan exceptions and act quickly.
- Payments and booking states should feel calm, explicit, and trustworthy.

### Design principles

1. **The task is the visual centerpiece.** Search, availability, booking status,
   schedule, and operational exceptions outrank decorative composition.
2. **Accent is information.** Court green marks primary action and active state;
   tuff is a scarce brand signal. Neither colors every icon or heading.
3. **Surfaces express structure.** Use spacing and grouping first, borders second,
   elevation only when layers genuinely overlap.
4. **Motion explains change.** Press, open/close, progress, and completion earn
   motion. Scroll reveals and ambient loops do not.
5. **Photography must be credible.** Real venue and local community imagery wins.
   Generic substitutes are temporary and named as such.
6. **One product, different densities.** Public pages can breathe; booking pages
   are focused; owner/admin pages are compact and operational.
7. **Mobile is recomposed, not compressed.** Primary actions stay visible, maps
   and tables change mode, and safe areas are respected.
8. **Accessibility is part of the component contract.** Focus, labels, target
   size, non-color state, reduced motion, and larger text are designed up front.

## Foundation decisions

### Color

The measured light-first palette is now locked for implementation. Values are
CSS HSL channels; the automated light-theme audit reports no AA failures across
71 required text, fill, and control-boundary pairs.

| Role | Direction | Intended use |
| --- | --- | --- |
| Chalk | `42 24% 97%` | Main application background |
| Paper | `0 0% 100%` | Forms, menus, bounded transactional surfaces |
| Mineral | `40 20% 94%` | Section bands, filters, table headers, inset groups |
| Basalt | `166 18% 12%` | Primary text and inverse surfaces |
| Court green | `158 58% 23%` | Primary buttons, active navigation, selected states |
| Tuff | `14 46% 46%` | Scarce brand emphasis and editorial accents; AA on Chalk |
| Success | `148 56% 27%` | Completed/confirmed states only |
| Warning | `35 82% 31%` | Deadlines, pending review, attention |
| Destructive | `4 62% 42%` | Errors and destructive actions |
| Information | `210 58% 39%` | Neutral system information and synchronization |

Rules:

- Ship light-first; retain an inverse Basalt surface for rare high-emphasis use.
- Do not use the primary color for every heading, icon, border, and badge.
- Semantic colors require icon or text reinforcement.
- Charts use a reserved categorical sequence, not arbitrary Tailwind colors.
- Maps and imagery must not compete with active controls.

### Typography

- Display: Space Grotesk, retained for brand continuity and compact athletic form.
- Body/UI: DM Sans, retained for clarity and broad component coverage.
- Armenian: load full Noto Sans Armenian support, not only the dram glyph.
- Numerals: JetBrains Mono only for prices, times, countdowns, and aligned metrics.
- Body tracking stays neutral; small labels receive modest positive tracking;
  display tracking tightens progressively by size.
- Product page titles should normally remain 30–40px; marketing display type
  must not consume the first mobile viewport.
- Body copy targets 1.5–1.65 line-height; large headings 1.0–1.15.
- Uppercase is reserved for compact metadata, never long labels or instructions.

### Spacing and grid

- 4px base rhythm, expressed through the existing Tailwind spacing scale.
- Mobile page gutter: 20px; tablet: 24–32px; desktop: 32–40px.
- Marketing content maximum: approximately 1280px.
- Operational content maximum: approximately 1440px where tables/calendars need it.
- Reading content maximum: 65–72 characters.
- Product sections: 32–48px vertical separation.
- Marketing sections: 72–104px, reduced on mobile.
- Admin tables and filters use deliberate compact density, not marketing spacing.

### Radius, border, shadow, and surfaces

- Base control radius target: 10px.
- Repeatable cards/panels: 12–14px.
- Dialogs and major media frames: up to 16px.
- Pills are reserved for chips, compact status, and segmented controls.
- Default border: low-contrast structural line.
- Interactive controls receive a stronger, accessible edge and focus ring.
- Default cards use no shadow or a minimal one-pixel lift.
- Medium shadow is reserved for menus, drawers, sticky booking controls, and dialogs.
- Remove general-purpose glow and decorative blurred-orb treatments.
- Glass/translucency is limited to floating structural chrome and must have a
  reduced-transparency fallback.

### Navigation hierarchy

- Global header: discovery-first, compact, clear active state, no logo zoom.
- Mobile navigation: reachable 44px targets, safe-area aware, current location
  expressed by more than color.
- Owner product: stable sidebar/drawer with grouped operational sections and a
  consistent route heading.
- Admin/operator: dense workspace navigation with exception/status emphasis.
- Every route must answer where the user is and what the primary next action is.

### Component philosophy

- Do not force all information into cards.
- Use a card for repeatable objects, bounded actions, or content that needs an edge.
- Use sections, dividers, description lists, and tables for continuous information.
- Primary buttons are scarce and explicit; secondary and quiet actions retain hierarchy.
- Inputs share height, radius, border, label, helper, error, and disabled behavior.
- Empty/error/loading/success states preserve page context and identify the next action.

### Iconography

- Continue using Lucide.
- Use one icon per meaning; avoid decorative icon clusters.
- Keep stroke weight consistent within a surface.
- Icon-only controls require accessible names and at least a 44px touch target.
- Do not introduce emoji, handcrafted SVG icons, or a second icon library.

## Motion principles

### Remove or reduce

- The 2.3-second blocking splash sequence.
- Broad page-load and scroll-triggered fade-up choreography.
- Staggered entrances for ordinary lists and form fields.
- Ambient looping Remotion backgrounds in normal product navigation.
- Decorative ping, pulse, floating, parallax, zoom, glow, and bounce.
- Scale-on-hover for text-bearing cards and logos.
- Motion that delays navigation or the first usable control.

### Retain or introduce

- Immediate pointer-down/tap feedback, normally 90–120ms.
- Hover/focus color and elevation response, normally 140–180ms.
- State swaps, validation, and progress transitions, normally 180–240ms.
- Drawers/dialogs that enter and exit along the same path.
- Critically damped springs for interruptible, touch-driven sheets or drawers.
- Bounce only where release velocity from a real gesture justifies it.
- Opacity-only or static reduced-motion alternatives.
- Solid, clearly bordered alternatives for reduced transparency and high contrast.

No animation is accepted without a stated UX purpose.

## Image and asset strategy

### Current asset audit

| Asset | Classification | Current use | Decision |
| --- | --- | --- | --- |
| `src/assets/hero-landing.jpg` | Generic multi-sport aerial hero | Home hero | Temporary; replace with authentic/local venue or product-led composition |
| `src/assets/auth-hero.jpg` | Generic community sports scene | Unreferenced after auth redesign | Candidate for later binary-asset cleanup |
| `src/assets/hero-sports.jpg` | Generic facility aerial | Venue fallback | Temporary fallback only |
| `src/assets/hero-sports-premium.jpg` | Generic sports/community scene | Unreferenced | Candidate for later binary-asset cleanup |
| `src/assets/venue-football.jpg` | Generic sport category image | Home, owner marketing, venue fallback | Temporary; replace with licensed/local venue photography |
| `src/assets/venue-tennis.jpg` | Generic sport category image | Home, owner marketing, venue fallback | Temporary; replace with licensed/local venue photography |
| `src/assets/venue-basketball.jpg` | Generic sport category image | Home, owner marketing, venue fallback | Temporary; replace with licensed/local venue photography |
| `src/assets/venue-swimming.jpg` | Generic sport category image | Home, venue fallback | Temporary; replace with licensed/local venue photography |
| `public/venues/*` | Duplicates of source category imagery | No direct public reference found | Candidate for later binary-asset cleanup |
| `src/assets/logo-mark.png` | Brand mark raster | Shared Logo | Retain initially; optimize treatment and sizing |
| `src/assets/logo-full.png` | Legacy full raster lockup | Referenced only in comments | Candidate for later binary-asset cleanup |
| `public/og-image.png` | Generic stadium social card | SEO/social | Replace after new visual system stabilizes |
| `public/placeholder.svg` | Generic placeholder | Unreferenced after community redesign | Candidate for later binary-asset cleanup |
| Venue/customer uploads | Real venue photography | Discovery/detail | Highest-priority imagery; preserve aspect ratios and fallback behavior |
| Yandex map tiles | Functional map imagery | Map/nearby/detail | Retain; reduce competing overlays and controls |

### Replacement list

- Authentic wide venue image for the main acquisition surface.
- Four locally credible sport/venue category images with consistent licensing.
- Owner-facing operational photography or product screenshot where it explains value.
- Auth treatment that does not depend on generic lifestyle photography.
- New social sharing image based on the final product identity.
- Neutral venue, team, and field fallbacks at their actual rendered aspect ratios.

Until licensed photography exists, layouts should remain strong without random
replacement images. Temporary assets must be labeled as temporary here.

## Foundational audit findings

### Foundational

- The document is forced into dark mode in `index.html`; this makes every route
  inherit a high-drama treatment, including forms, bookings, schedules, and admin.
- Primary green is used simultaneously as brand, action, active, live, success,
  chart, and decorative glow, so it loses semantic meaning.
- The foundation includes a large shadow ladder, glass noise, grid/radial
  backgrounds, glow, and multiple entrance utilities that invite decoration.
- Base radius is 14px and many surfaces add 4–8px, producing an over-rounded product.
- Several useful accessibility fixes already exist and must be preserved: strong
  control borders, measured contrast notes, sticky-header scroll padding, semantic
  price output, reduced-motion guards, and safe-area handling.

### Shared component

- Button has many overlapping visual variants and needs a clearer hierarchy.
- Input, select, textarea, and custom controls differ in height and radius.
- Card is used for both repeatable objects and ordinary page grouping.
- Header, owner shell, and mobile navigation use three different active treatments.
- Two toast systems are mounted globally.
- Loading states rely heavily on centered spinning icons instead of preserving layout.
- Owner navigation is a flat thirteen-item list without task grouping.

### Motion

- Framer Motion appears across marketing, discovery, auth, venue detail, games,
  and owner overview; normal content frequently enters through fade/stagger patterns.
- Home combines a Remotion ambient background, radial blur, animated status dot,
  staggered copy, settling image, glass overlays, and network-driven badges.
- Login/signup animate fields, focus icons, failure shake, handoff, hero media, and
  state swaps in a transactional flow that should feel calmer.
- A fixed splash blocks the full product for roughly 2.3 seconds on every cold load.

### Content and imagery

- The small local asset set is reused across home, owner marketing, auth, and
  venue fallbacks, making unrelated routes feel templated.
- Several images depict generic or geographically ungrounded sport settings.
- Duplicate source/public category files add uncertainty without new value.
- Real uploaded venue images are the most credible product asset and should lead.

### Accessibility and responsive

- Existing source comments document prior contrast, focus-obscuration, toast
  overflow, and mobile sticky-action fixes; these are regression constraints.
- Mobile header controls still include nesting/naming concerns in some paths.
- Pointer-only message/filter interactions and non-semantic clickable badges remain.
- Browser verification is required for 375, 768, 1280, and wide desktop before
  these source findings can be accepted as a complete visual audit.

## Cross-application source audit

This matrix is based on current source and asset inspection. It identifies the
redesign work that browser captures must validate; it is not a claim of visual
or WCAG completion.

Priority: `P0` blocks a credible or accessible redesign, `P1` is a route-family
or systemic issue, and `P2` is a measured system-alignment pass.

Classification: `F` foundational, `S` shared component, `R` route-specific,
`C` content/imagery, `M` motion, `A` accessibility, `X` responsive.

### Public discovery and marketing

| Surface | Priority | Source audit | Class | Evidence |
| --- | --- | --- | --- | --- |
| Home `/` | P0 | Clear proposition is buried in a generic split hero, floating glass proof cards, animated live badge, Remotion background, blurred glow, staged copy, image settling, repeated scroll reveals, equal-weight sections, and a final glow CTA. Generic bundled imagery has no Armenian/local grounding. | `F/C/M/R` | `src/pages/HomePage.tsx`; `src/remotion/HeroBackdrop.tsx` |
| Home search | P0 | Date/time looks actionable but is not applied to the resulting route. Large rounded marketplace container, tiny uppercase labels, pulse, and heavy elevation reinforce template styling. | `S/R/A` | `src/components/home/HeroSearch.tsx` |
| Venue discovery `/venues` | P1 | Filter bar precedes the page heading, sticky offsets vary by breakpoint, and every result transition/stagger adds wait. Loading/error/empty coverage is comparatively strong and should be retained. | `S/R/M/X` | `src/pages/DiscoverPage.tsx` |
| Venue cards | P0 | Promoted ring, sparkles, instant booking, distance glass, chips, rating, price, image zoom, card lift, title recolor, and hover-only CTA compete on one object. Touch receives no equivalent to the hover reveal. | `S/M/A` | `src/components/venues/VenueCard.tsx` |
| Venue map `/venues/map` | P0 | Lacks visible page context, results/list alternative, robust empty/error handling, and a non-map route through the same inventory. Height calculation ignores mobile navigation/safe area; popup links reload the SPA. | `R/A/X` | `src/pages/VenueMapPage.tsx`; `src/components/maps/YandexMap.tsx` |
| Nearby `/nearby` | P0/P1 | Bookable venues and discovered fields use parallel ad hoc cards and popups. Fixed map heights are brittle, internal “AI discovery pipeline” language leaks into customer copy, and clickable promoted cards lack keyboard semantics. | `S/R/A/X` | `src/pages/NearbyFieldsPage.tsx` |
| Field submission `/nearby/submit` | P0 | Core form labels/errors are sound, but sport selections are clickable badges rather than semantic multi-select controls. The form is another generic isolated card. | `S/R/A` | `src/pages/SubmitFieldPage.tsx` |
| Venue detail `/venue/:id` | P0/P1 | Authentic uploads and desktop booking split are strengths. About, hours, amenities, and reviews are over-carded; gallery/amenity/mobile-action animations are decorative; booking, AI, and mobile-nav fixed layers compete. | `S/R/M/X` | `src/pages/VenueDetailsPage.tsx`; `src/components/venues/VenueGallery.tsx` |
| Embedded booking | P1 | Uses a separate raw gray style, background-image venue art without normal image fallback semantics, color-led selections, and cramped date/time grids. | `S/R/A/X` | `src/pages/EmbedBookingPage.tsx` |
| For Owners | P0 | Full-screen generic hero, oversized type, twelve equal feature tiles, a giant zero-commission panel, image showcase, and reveal motion reproduce a generic startup page. Several claims describe unavailable or incomplete product behavior. | `C/M/R` | `src/pages/ForOwnersPage.tsx` |
| Demo | P0/P1 | Long animated tour duplicates glows, live indicators, metric cards, pills, venue cards, booking steps, owner promises, and final CTA rather than demonstrating one coherent task. Several owner/payment/calendar claims require correction. | `C/M/R` | `src/pages/DemoPage.tsx` |
| About | P1 | Generic hero, paired mission cards, four value cards, and staggered CTA provide little SportsBnB-specific evidence or local identity. | `C/M/R` | `src/pages/AboutPage.tsx` |
| Contact | P1 | Useful 1/3–2/3 structure; animating every contact item and form field adds no meaning. | `M/R` | `src/pages/ContactPage.tsx` |
| FAQ | P2 | Restrained accordion and clear structure are directionally sound; needs token, spacing, focus, and long-copy verification. | `R/A` | `src/pages/FAQPage.tsx` |
| Blog index | P1 | Gradient hero and card stacks layer stagger, lift, image zoom, title shift, metadata shift, and arrow motion. Cover-art provenance and fallback direction are inconsistent. | `C/M/R` | `src/pages/BlogPage.tsx` |
| Blog detail | P2 | Readable editorial surface; retain structure and align media fallback, reading width, metadata, and typography. | `R/C` | `src/pages/BlogPostPage.tsx` |
| Legal pages | P2 | Consistent, readable, motion-free editorial pages. Consolidate one editorial primitive and check long-page navigation rather than adding cards. | `S/R/A` | `src/pages/PrivacyPolicyPage.tsx`; `TermsOfServicePage.tsx`; `CookiePolicyPage.tsx` |
| Not found | P1 | Error recovery is delayed behind a compass settle animation, staged panel, and hover motion. Make the exits immediate. | `M/R` | `src/pages/NotFound.tsx` |

### Booking and authentication

| Surface | Priority | Source audit | Class | Evidence |
| --- | --- | --- | --- | --- |
| Booking panel | P0/P1 | Error/full/availability states are explicit, but structural glass weakens transactional trust. Date/time choices lack complete selection semantics, horizontal dates lack cues, and inserted summaries shift the panel. | `S/R/A/X` | `src/features/booking/BookingPanel.tsx` |
| Checkout `/book/:bookingId` | P1 | One of the calmest, clearest screens; preserve opaque focused treatment. Replace full-page spinner with in-context structure, provide a clear back path, and avoid announcing a countdown every second. | `S/R/A` | `src/features/booking/CheckoutPage.tsx` |
| Booking/game status | P0/P1 | Generic centered cards do not sufficiently distinguish payment, booking fulfillment, expiry, or compensation. Some navigation/copy is misleading and raw success colors bypass tokens. | `S/R/C/A` | `src/features/booking/BookingStatusPage.tsx`; `GameJoinStatusPage.tsx` |
| Booking history | P2 | Upcoming/past hierarchy and feedback states are strong. Align repeated rows and status density; no structural reinvention required. | `S/R` | `src/pages/MyBookingsPage.tsx` |
| Login/signup | P0 | Generic split photography plus Remotion, staggered form assembly, focus scale, error shake, glow, success scale, and handoff transitions make authentication theatrical. They also diverge visually from recovery routes. Labels and named controls are strengths. | `C/M/R/A` | `src/pages/LoginPage.tsx`; `src/pages/SignupPage.tsx` |
| Recovery/reset | P1 | Calmer model worth preserving. Error association/announcement needs work; password strength uses raw palette colors, and timed success navigation reduces agency. | `S/R/A` | `src/pages/ForgotPasswordPage.tsx`; `src/pages/ResetPasswordPage.tsx` |
| Auth callback | P1 | Hand-built spinner/success/error duplicates shared status systems and forces timed redirection without a stable user-controlled exit. | `S/R/M/A` | `src/pages/AuthCallbackPage.tsx` |
| Player onboarding | P0/P1 | Four-step progress is understandable. Invented logo treatment, repeated icon/shadow cards, glowing CTAs, and non-semantic sport selection undermine consistency and access. | `S/R/A` | `src/pages/PlayerOnboarding.tsx` |
| Owner onboarding | P1 | Deprecated route displays only an unlabeled spinner during redirect resolution, with no explanatory or failure state. | `R/A` | `src/pages/OwnerOnboarding.tsx` |

### Player, games, teams, community, and messages

| Surface | Priority | Source audit | Class | Evidence |
| --- | --- | --- | --- | --- |
| Player dashboard | P0 | XP, flames, trophies, emoji, gradients, sparkles, animated bars, referrals, statistics, and many cards create a gaming cockpit with no dominant next action. | `F/S/R/M` | `src/pages/PlayerDashboard.tsx`; `src/components/dashboard/*` |
| Games discovery | P0/P1 | Strong feedback states, but repeats discovery’s heading/filter order and motion. Game cards overload sport, skill, capacity, progress, location, time, host, price, and duplicate CTAs. | `S/R/M/X` | `src/pages/GamesPage.tsx` |
| Game detail | P1 | Date, time, location, and cost each become cards before more cards for description, requests, participants, and join. Mobile primary action appears too late. | `R/X` | `src/pages/GameDetailsPage.tsx` |
| Create game | P0/P1 | Long form is split into generic cards; play-mode selections need true pressed/radio semantics and more compact mobile grouping. | `S/R/A/X` | `src/pages/CreateGamePage.tsx` |
| Teams/detail/forms | P1 | Reused form and uploaded logos are strengths. Surfaces remain over-carded; member/invite actions squeeze on mobile and icon-only actions rely on title attributes. | `S/R/A/X` | `src/pages/TeamsPage.tsx`; `TeamDetailsPage.tsx`; `src/features/teams/TeamForm.tsx` |
| Join team | P0 | Automatic join side effect presents only a spinner then redirects. There is no confirmation, agency, or stable recoverable failure state. | `R/A` | `src/pages/JoinTeamPage.tsx` |
| Community | P0 | Nearby games, popular games, people, venues, personal games, and network compete without a dominant goal. The page reimplements game and venue cards instead of reusing canonical variants. | `F/S/R` | `src/pages/CommunityPage.tsx` |
| Messages | P0/P1 | List hierarchy is understandable, but clickable conversation cards are not keyboard-operable. Dialog height is fixed and separate chat shells drift visually and responsively. | `S/R/A/X` | `src/pages/MessagesPage.tsx`; `src/components/chat/*` |
| Profile | P0/P1 | Four-column tab grid contains three triggers, leaving a blank column and squeezing mobile labels. Forms/notification rows are over-carded. | `S/R/X` | `src/pages/ProfilePage.tsx`; `src/features/profile/*` |

### Owner product

| Surface | Priority | Source audit | Class | Evidence |
| --- | --- | --- | --- | --- |
| Owner shell | P0/P1 | Thirteen flat links, repeated icon meanings, missing Analytics, exact-path active state, and no grouping by task. Closed mobile sidebar remains mounted/tabbable and lacks focus/Escape/dialog behavior. Add/edit/availability leave the owner shell entirely. | `F/S/A/X` | `src/components/owner/OwnerLayout.tsx`; `src/App.tsx` |
| Owner overview | P1 | Animated KPI cards and a second weekly KPI group duplicate information. Raw status colors, count-up, and feed stagger make routine operations performative; week calendar dominates mobile. | `R/M/X` | `src/pages/owner/OwnerOverviewPage.tsx` |
| Owner venues | P2 | Real uploads are valuable. Draft cards reduce all content with grayscale/opacity; card/image motion is unnecessary, and “Draft” conflates multiple lifecycle meanings. | `R/C/M/A` | `src/pages/owner/OwnerVenuesPage.tsx` |
| Add/edit venue | P0/P1 | Routes abandon the owner shell. A very long nine-card form lacks section navigation, progress, sticky save, unsaved-change protection, and consistent create/edit ordering. Image/sport/amenity controls need semantic repair. | `S/R/A/X` | `src/features/venues/VenueForm.tsx`; `src/pages/AddVenuePage.tsx`; `EditVenuePage.tsx` |
| Legacy availability | P1 | Duplicates hours/blocked-date editing outside the owner shell and lacks complete error treatment. | `S/R` | `src/pages/VenueAvailabilityPage.tsx` |
| Schedule | P0/P1 | Fixed-width week grid has no mobile agenda; toolbar does not recompose. Shared drawer advertises Contact, Confirm, Reschedule, Cancel, and notes even when callbacks/persistence are absent. | `S/R/A/X` | `src/pages/owner/OwnerSchedulePage.tsx`; `src/components/owner/schedule/*` |
| Owner bookings | P0/P1 | Stats, filter card, and horizontal table compete. Export is a no-op, clickable-row styling does not match behavior, and status filters omit current variants. | `R/A/X` | `src/pages/owner/OwnerBookingsPage.tsx` |
| Hours | P2 | Strongest current owner editor: clear save and responsive day rows. Preserve as consolidation baseline; add query errors, associated venue label, and reconcile duplicate availability route. | `S/R/A` | `src/pages/owner/OwnerHoursPage.tsx` |
| Pricing | P1 | Says pricing rules are configurable while the rules UI is permanently disabled and tips recommend unavailable behavior. Refocus on the supported base rate. | `R/C` | `src/pages/owner/OwnerPricingPage.tsx` |
| Policies | P0/P1 | Five-card long form lacks section navigation, sticky save, dirty-state protection, and coherent selected-card behavior. Copy overstates enforcement of current booking rules. | `R/C/A/X` | `src/pages/owner/OwnerPoliciesPage.tsx` |
| Equipment | P0/P1 | Copy claims rentals can be added during booking although seeker flow does not support it. Scope hierarchy, mobile rows, icon-button names, switch labels, and query errors need correction. | `R/C/A/X` | `src/pages/owner/OwnerEquipmentPage.tsx` |
| Integrations | P0 | iCal URL/import success and two-way availability language imply behavior that is not implemented. Provider connection cards are a useful base, but unavailable functionality must not be polished into credibility. | `R/C` | `src/pages/owner/OwnerIntegrationsPage.tsx` |
| Integrations callback | P1 | Fixed redirect delay, raw colors, and missing live announcement reduce agency; use the shared status foundation. | `S/R/M/A` | `src/pages/owner/CalendarCallbackPage.tsx` |
| Analytics | P1 | Route is missing from owner navigation. KPI/chart hierarchy is serviceable, but chart animation ignores reduced motion and charts lack textual/table alternatives. | `S/R/M/A/X` | `src/pages/owner/OwnerAnalyticsPage.tsx` |
| Earnings | P0/P1 | Balance/account/payout failures can look like zero/empty. Sensitive payout destination editing lacks review/confirmation and tables depend on horizontal scrolling. | `R/A/X` | `src/pages/owner/OwnerEarningsPage.tsx` |
| Widget | P0 | Preview is not the actual embed, advertised JavaScript is absent, customization does not affect the preview, and unused settings remain visible. | `R/C/A` | `src/pages/owner/OwnerWidgetPage.tsx` |
| Owner settings | P0/P1 | Duplicates venue/pricing responsibilities and shows fields that are not persisted. No validation, dirty-state protection, or venue-switch protection. | `R/C/A` | `src/pages/owner/OwnerSettingsPage.tsx` |

### Administrative and operator product

| Surface | Priority | Source audit | Class | Evidence |
| --- | --- | --- | --- | --- |
| Admin/operator shell | P0 | Admin and Operator inherit the public header/footer/mobile nav/AI assistant, while Outreach has unrelated standalone chrome. One operations shell is required without changing route/auth semantics. | `F/S/R` | `src/pages/AdminDashboard.tsx`; `OperatorDashboard.tsx`; `src/pages/operator/OutreachConsole.tsx`; `src/components/layout/Layout.tsx` |
| Admin dashboard | P0/P1 | Seven horizontally scrolling tabs lack affordance/URL state; raw-color stat cards drift semantically. Wide tables lack sticky identifiers/actions or a mobile row alternative; loading/empty states are ad hoc. | `S/R/A/X` | `src/pages/AdminDashboard.tsx`; `src/components/admin/*` |
| Booking leads | P1 | Raw-color stats, unlabeled search/select, dense eight-column table, and overly complex status selection reduce scan speed and access. | `S/R/A/X` | `src/components/admin/BookingLeadsTab.tsx` |
| Payout operations | P0/P1 | Action group is styled as a metric; consequential batch/failure actions need clear context and confirmation. Mobile row controls overflow. | `S/R/A/X` | `src/components/admin/PayoutsTab.tsx` |
| Blog administration | P1 | Header and two-column dialog form do not reflow cleanly; icon actions need names. AI-cover prompt encourages uncontrolled visual inconsistency. | `C/R/A/X` | `src/components/admin/BlogPostsTab.tsx` |
| Operator dashboard | P1 | Metric cards and charts bypass parts of the shared price/chart system; emoji flags and raw color meanings are platform-dependent and inconsistent. Charts require legends and textual summaries. | `S/R/C/A/X` | `src/pages/OperatorDashboard.tsx`; `src/components/operator/*` |
| Outreach console | P0/P1 | Identical stat cards mix interactive/noninteractive behavior. Search is placeholder-only; clickable table rows are mouse-only; seven columns fail at mobile widths. | `S/R/A/X` | `src/pages/operator/OutreachConsole.tsx` |
| Outreach drawer/import | P1 | Four squeezed tabs, non-collapsing contact grids, labels without associations, slow sheet motion, and mixed toast systems need a shared operations pattern. Monospace is justified only for pasted tabular input. | `S/R/M/A/X` | `src/components/operator/outreach/*` |

### Cross-state audit

| State family | Current problem | Foundation response |
| --- | --- | --- |
| Loading | Centered spinners and full-screen branded loaders replace context; known layouts shift when data arrives. | Content-shaped skeletons or retained shell with local progress; spinners only for unknown/compact mutations. |
| Empty | `EmptyState`, `StatusPanel`, and route-local empty cards duplicate anatomy and tone. | Shared visual anatomy with route-specific next action and preserved page context. |
| Error | Some hooks/pages convert query failure into empty/zero, especially owner finance/settings/schedule. | Explicit recoverable error treatment; never visually equate unresolved financial data with zero. |
| Success | Centered green cards overgeneralize payment, fulfillment, join, and callback completion. | State-specific confirmation with next action, receipt/context, and non-color status. |
| Disabled | Unavailable pricing/calendar/widget controls sometimes look merely inactive or successful. | Honest explanation, supported alternative, and no fabricated success feedback. |
| Offline-like | Shared `ErrorPanel` is directionally strong but not consistently used. | Preserve local context, explain data safety, and offer retry/escape paths. |
| Destructive | Consequential payout/account/listing actions do not share a review/confirmation hierarchy. | One consistent destructive confirmation contract used only when consequence warrants it. |

### Current-run browser audit — 2026-08-05

Playwright rendered the local application against the repository's intercepted
Supabase fixture harness. The run did not use production credentials, contact
external payment/email systems, submit forms, or mutate application data. All
47 requested captures completed, and the document width check found no
page-level horizontal overflow. Internal clipping and scroll-dependent desktop
widgets still produced serious responsive failures even where the root document
itself did not overflow.

Artifacts are temporary and live in
`/tmp/sportsbnb-design-audit-zt2KDp`: 47 PNG screenshots,
`capture-results.json`, and the capture script used for the run.

| Viewport | Representative families inspected | Visible conclusion |
| --- | --- | --- |
| 375 × 812 | Home, discovery, login, venue, checkout, player dashboard/bookings/games/messages, owner overview/bookings, admin, outreach, empty state | Mobile player surfaces are generally legible but carry three competing fixed layers. Owner/admin layouts compress desktop cards, calendars, tabs, and tables instead of changing interaction mode. Outreach's heading/actions visibly collapse into narrow columns. |
| 768 × 1024 | Home, discovery, player dashboard, owner schedule, admin | Marketing reflows, but operational pages remain card-heavy. Owner schedule still hides part of the week; admin keeps large equal-weight metric cards and a wide segmented tab row. |
| 1280 × 800 | Public, transactional, player/community, owner, admin/operator/outreach, informational pages, error/loading/reduced-motion states | Desktop fit improves without solving hierarchy. Owner overview clips its calendar beside a duplicate-action rail. Discovery, admin, and owner pages spend most of the first screen on filters/metrics/panels rather than the primary object or exception. |
| 1600 × 1000 | Home, discovery, player dashboard, owner overview, admin | Added width mainly creates more empty space. The owner dashboard only reveals a complete seven-day grid at this width, proving a width dependency rather than responsive adaptation. |

Accepted visual evidence:

- `01-home-mobile.png`, `14-home-tablet.png`, `19-home-desktop.png`, and
  `39-home-wide.png` show the same proposition at every required width. The
  composition is coherent but still uses neon accent, ambient decoration,
  generic/synthetic-looking sport imagery, and a visually dominant floating AI
  control.
- `02-venues-mobile.png`, `15-venues-tablet.png`, `20-venues-desktop.png`, and
  `40-venues-wide.png` confirm a workable responsive grid, but the filter chrome
  precedes context, each venue card carries too many simultaneous signals, and
  identical fixture imagery makes records difficult to distinguish.
- `04-venue-detail-mobile.png` and `05-booking-mobile.png` show the AI launcher,
  sticky booking action, and bottom navigation competing in the same lower-right
  region. The checkout's multi-year countdown is a fixture limitation, not a
  production design finding.
- `06-player-dashboard-mobile.png`, `16-player-dashboard-tablet.png`, and
  `41-player-dashboard-wide.png` confirm that equal card weight, XP/gaming
  language, and secondary modules obscure the next useful player action.
- `10-owner-dashboard-mobile.png`, `17-owner-schedule-tablet.png`,
  `28-owner-dashboard-desktop.png`, and `42-owner-dashboard-wide.png` show the
  schedule breaking point: partial weeks at mobile/tablet and within the 1280px
  dashboard, with all seven days visible only at 1600px.
- `11-owner-bookings-mobile.png` confirms that KPI cards and a stacked filter
  block push bookings down while the desktop table clips values without a clear
  mobile row pattern.
- `12-admin-mobile.png`, `18-admin-tablet.png`, `33-admin-desktop.png`, and
  `43-admin-wide.png` show a stable but over-carded dashboard; seven tabs rely on
  horizontal scanning, and the fixed AI control competes with the workspace.
- `13-outreach-mobile.png` is a confirmed responsive failure: title, explanatory
  copy, back action, and AI action squeeze into unusably narrow columns before a
  horizontally dense contact table.
- `44-empty-bookings-mobile.png`, `45-error-venues-desktop.png`, and
  `46-loading-venues-desktop.png` confirm that state coverage exists. The error
  state preserves retry/context; loading skeletons preserve broad geometry but
  are oversized and visually opaque; the empty state leaves excessive dead
  space and still competes with fixed chrome.
- `47-home-reduced-motion.png` confirms the media preference reaches the page,
  but source inspection proves it does not yet govern all CSS, sheets, charts,
  image transforms, or global transitions.

Cross-run diagnostics:

- Every route logged the same React warning from `SplashScreen` passing
  `fetchPriority` through the current React DOM build. More importantly, the
  splash still blocks every cold view for roughly 2.3 seconds.
- `CommunityPage` logged duplicate React keys for repeated fixture participants.
  This run cannot determine whether live rows can reproduce the issue; it is
  recorded as fixture-sensitive and unresolved rather than a confirmed product
  defect.
- Automated geometry counted many rendered controls below 44px, including
  14/36 interactives on mobile Home, 31/61 on mobile Venue Detail, 29/32 on
  mobile Owner Overview, and 21/34 on mobile Admin. These counts include inline
  text links and therefore require component-level judgment, but they confirm
  that touch target sizing is a shared-system problem rather than one isolated
  route.
- Real authenticated account history, live provider checkout, outbound email,
  and production-data edge cases remain intentionally uninspected. Populated,
  empty, error, slow-loading, and reduced-motion states were safely rendered
  with intercepted local fixtures.

## Phase checklist

### Phase 0 — Repository and skill loading

- [x] Re-read repository knowledge baseline
- [x] Read complete Apple Design skill
- [x] Inspect global CSS and Tailwind foundations
- [x] Inspect shell/navigation and representative shared primitives
- [x] Inspect local image/logo/social assets directly
- [x] Inventory motion and decorative patterns in source
- [x] Inspect representative routes across all product areas in source
- [x] Capture current representative browser views at required widths
- [x] Accept and annotate screenshot evidence

### Phase 1 — Design audit

- [x] Public and marketing route source audit
- [x] Discovery, venue, map, and nearby source audit
- [x] Booking, auth, onboarding, and player source audit
- [x] Games, teams, community, messages, and profile source audit
- [x] Owner route source audit
- [x] Admin, operator, and outreach source audit
- [x] Shared component audit
- [x] Motion source inventory
- [x] Local imagery inventory
- [x] Browser-based responsive and visual audit
- [x] Final issue classification and priority pass

### Phase 2 — Visual direction

- [x] Select unified direction: Open Court
- [x] Define personality and emotional goal
- [x] Define palette roles and usage rules
- [x] Define typography roles
- [x] Define spacing/layout philosophy
- [x] Define radius/border/shadow/surface philosophy
- [x] Define navigation/component/icon philosophy
- [x] Define image and motion philosophy
- [x] Validate direction against captured current-state screens
- [x] Lock measured token values and contrast results

### Phase 3 — Foundations and application shell

- [x] Color and semantic tokens
- [x] Typography loading and responsive scale
- [x] Spacing/container foundations
- [x] Radius, border, shadow, and surfaces
- [x] Motion primitives and reduced-transparency support
- [x] Header and footer
- [x] Mobile navigation
- [x] Owner navigation
- [x] Page container and route heading patterns
- [x] Toast/dialog/drawer foundations
- [x] Browser and automated verification

### Phase 4 — Shared product components and public routes

- [x] Buttons, form controls, cards, tabs, chips, badges, and overlays
- [x] Search, filters, prices, pagination, and shared status states
- [x] Date/time and transactional booking controls
- [x] Venue, game, and team card foundations
- [x] Shared tables, map controls, skeletons, and feedback states
- [x] Product-specific charts and operational schedules
- [x] Homepage
- [x] Venue discovery, map, nearby, and venue detail
- [x] For Owners and Demo
- [x] Blog, About, Contact, FAQ, legal, and not-found surfaces
- [x] Browser and automated verification

### Phase 5 — Booking, authentication, player, and community

- [x] Login, signup, recovery, reset
- [x] Player onboarding
- [x] Booking selection, checkout, status, and history
- [x] Player dashboard
- [x] Games and game detail/status
- [x] Teams and team detail/edit/join
- [x] Community
- [x] Messages
- [x] Profile and settings
- [x] Browser and automated verification

### Phase 6 — Owner product

- [x] Owner dashboard
- [x] Venue list and add/edit/availability
- [x] Schedule and booking management
- [x] Hours, pricing, policies, and equipment
- [x] Integrations and callback
- [x] Analytics and earnings
- [x] Widget and settings
- [x] Browser and automated verification

### Phase 7 — Administrative product

- [x] Admin overview and tabs
- [x] Operator dashboard
- [x] Outreach console and drawers
- [x] Dense tables, metrics, filters, moderation, and review states
- [x] Browser and automated verification

### Phase 8 — Cross-app polish

- [x] Remove unnecessary motion and decoration
- [x] Replace/remove/document generic assets
- [x] Responsive pass at 375, 768, 1280, and wide desktop
- [x] Keyboard and focus pass
- [x] Reduced motion/transparency/contrast pass
- [x] Copy and status consistency
- [x] Remove dead visual CSS and duplicate variants
- [x] Audit loading, empty, error, success, disabled, and offline-like states

### Phase 9 — Final verification

- [x] Every meaningful route family visually reviewed
- [x] Every shared component family reviewed
- [x] Type check
- [x] Lint
- [x] Unit/component test command attempted; environment blocker documented
- [x] Playwright smoke and visual viewport pass
- [x] Production build and existing static design audits
- [x] Confirm booking/payment/auth/backend behavior unchanged
- [x] Final worktree and route-checklist audit

## Route-by-route review checklist

No route is `[x]` until source, browser, responsive, accessibility, motion, and
adjacent-route consistency have all been checked.

### Public discovery and marketing

- [x] `/` — Home
- [x] `/venues` — Discovery
- [x] `/venues/map` — Venue map
- [x] `/nearby` — Nearby fields and venues
- [x] `/venue/:id` — Venue detail and booking entry
- [x] `/embed/booking/:venueId` — Embeddable booking
- [x] `/games` — Game discovery
- [x] `/game/:id` — Game detail
- [x] `/teams` — Team discovery
- [x] `/team/:id` — Team detail
- [x] `/community` — Community
- [x] `/for-owners` — Owner acquisition
- [x] `/demo` — Product demo
- [x] `/blog` and `/blog/:slug` — Blog
- [x] `/about` — About
- [x] `/contact` — Contact
- [x] `/faq` — FAQ
- [x] `/privacy`, `/terms`, `/cookies` — Legal
- [x] `*` — Not found

### Authentication, onboarding, and booking

- [x] `/login`
- [x] `/signup`
- [x] `/forgot-password`
- [x] `/reset-password`
- [x] `/auth/callback`
- [x] `/onboarding/player`
- [x] `/onboarding/owner` — deprecated redirect state remains intentional
- [x] `/book/:bookingId`
- [x] `/booking/:bookingId/status`
- [x] `/pay/mock/:paymentId`
- [x] `/game/:id/join-status`

### Player and community product

- [x] `/dashboard`
- [x] `/my-bookings`
- [x] `/messages`
- [x] `/profile`
- [x] `/create-game`
- [x] `/create-team`
- [x] `/team/:id/edit`
- [x] `/join-team/:code`
- [x] `/nearby/submit`

### Owner product

- [x] `/owner-dashboard`
- [x] `/owner/venues`
- [x] `/add-venue`
- [x] `/venue/:id/edit`
- [x] `/venue/:id/availability`
- [x] `/owner/schedule`
- [x] `/owner/bookings`
- [x] `/owner/hours`
- [x] `/owner/pricing`
- [x] `/owner/equipment`
- [x] `/owner/policies`
- [x] `/owner/integrations`
- [x] `/owner/integrations/callback`
- [x] `/owner/analytics`
- [x] `/owner/earnings`
- [x] `/owner/widget`
- [x] `/owner/settings`

### Administrative product

- [x] `/admin`
- [x] `/operator`
- [x] `/operator/outreach`

### Redirect and alias consistency

- [x] `/discover`, `/my-venues`, `/list-venue`, `/settings`
- [x] `/game/:id/join-success`

## Shared component review checklist

- [x] Header, footer, mobile navigation, owner navigation
- [x] Page containers, titles, section headings, breadcrumbs
- [x] Buttons and icon buttons
- [x] Inputs, selects, textareas, radio, checkbox, switch, OTP, toggle, and slider primitives
- [x] Search, filters, chips, pagination
- [x] Cards, venue cards, game cards, team cards
- [x] Tabs, dropdowns, popovers, tooltips, accordion, and scroll areas
- [x] Dialog, sheet, drawer, and destructive-confirmation foundations
- [x] Tables, calendar, schedule, charts, maps
- [x] Price, status, and badge foundations
- [x] Countdown, date/time, and booking controls
- [x] Toasts and notification surfaces
- [x] Skeleton, loading, empty, error, success, disabled, and offline-like foundations
- [x] Authentication and onboarding forms
- [x] Dashboard metrics and dense operational panels

## Completed work

- Repository and Apple Design guidance reloaded.
- Existing architecture/security/business boundaries re-established.
- Current tokens, global CSS, Tailwind mappings, motion utilities, shells, and
  representative primitives inspected.
- All tracked local visual assets opened and classified.
- Source-level visual, motion, accessibility, and responsive audit completed
  across public, player, owner, administrator, operator, and outreach families.
- Every registered route is represented in the route checklist.
- Open Court direction selected and recorded.
- Fresh browser evidence captured and directly inspected across all four required
  viewport classes, including populated player/owner/admin states and explicit
  empty, error, loading, and reduced-motion states.
- Phase 1 issue classifications reconciled against current-run screenshots; no
  route has been marked implementation-complete from the audit alone.
- Open Court tokens implemented as a light-first chalk/mineral/Basalt palette,
  with full Armenian font loading, quiet elevation, compact radii, and semantic
  success/warning/destructive/information roles.
- Global splash removed; route loading now uses an immediate accessible local
  progress indicator. Motion primitives are shorter and reduced-motion is
  enforced globally; decorative grid/radial/glow helpers resolve quietly.
- Shared Button, Card, Input, Textarea, Select, Tabs, Dialog, Sheet, Toast, and
  Sonner foundations upgraded without changing their public APIs.
- Global header, footer, mobile navigation, owner navigation, and floating
  assistant upgraded for navigation clarity, valid interactive nesting, focus
  handling, 44px mobile targets, safe-area behavior, and calmer visual feedback.
- Post-foundation browser run captured all 47 scenarios with zero document-level
  horizontal overflow. Undersized rendered interactives fell from 979 to 815;
  the owner mobile routes saw the largest reductions (21 fewer per captured view).
- TypeScript, scoped ESLint, development build, diff whitespace check, and the
  light-theme browser contrast audit all pass; the only scoped lint findings are
  two pre-existing Fast Refresh export warnings.
- Phase 4 rebuilt the homepage, discovery, venue map, nearby, venue detail,
  For Owners, Demo, Blog, About, Contact, FAQ, legal, and not-found surfaces in
  the Open Court language. Broad Framer entrance/stagger effects, dark neon
  plates, ornamental glows, hover scaling, and repetitive card shells were
  removed while route, query, form, SEO, map, booking-entry, and Supabase
  contracts were retained.
- Venue discovery now uses responsive search/filter sheets and quiet result
  states; venue detail leads with venue identity, uses a stable gallery, and
  retains its existing BookingPanel handoff. Map-unavailable, catalogue error,
  loading, filtered-empty, and true-empty states were explicitly reviewed.
- Shared primitives and product cards now use Open Court tokens, visible focus,
  semantic non-color states, restrained transitions, reduced-motion fallbacks,
  and touch-safe controls. Unreferenced breadcrumb, drawer, command, and carousel
  primitives were reviewed but intentionally not rewritten without a call site.
- The floating assistant is now a reserved mobile-navigation destination instead
  of an overlay. A targeted 375px check confirmed it no longer covers venue CTAs,
  booking chrome, article links, or not-found content.
- The integrated Phase 4 browser matrix captured 94/94 states with no document
  horizontal overflow. All 11 editorial routes were checked at every required
  viewport; the integrated matrix also covered discovery, map, nearby, venue
  detail, loading, error, and reduced-motion states.
- Phase 5 is complete across authentication and recovery,
  player onboarding and history, the booking/checkout/status presentation,
  dashboard, games, teams, community, messages, profile, and public-field
  submission. Existing hooks, mutations, payment/provider contracts, role
  checks, route targets, Supabase access, and booking calculations were kept.
- Phase 5 removes broad auth/game choreography and generic auth photography,
  replaces pointer-only conversation/team/profile selection with semantic
  controls, gives transactional routes focused shells, and establishes calm,
  responsive player surfaces with reduced-motion equivalents. Teams, Profile,
  and Messages were verified in populated, empty, error, modal, keyboard, and
  reduced-motion states at the required viewports. The final QA pass corrected
  long-name grid overflow, shrinking back controls, duplicate visibility radios,
  chat focus return, mobile overlay switching, and own-message report affordances.
- Phase 6 is complete across the owner shell, overview, venues, add/edit and
  availability, schedule, bookings, hours, pricing, policies, equipment,
  integrations and callback, analytics, earnings, widget, and settings. The
  owner product now uses one compact operational hierarchy, responsive cards or
  tables according to available width, contextual error and empty states,
  explicit venue context, readable metrics, and restrained interaction feedback.
- The owner schedule recomposes into a touch-first daily agenda on mobile and
  opens on the current day. Bookings stay in readable cards through tablet and
  move to a dense table only at wide desktop. Long venue forms no longer sit
  behind player navigation or the assistant, and full-day blocks use one clear
  status marker rather than repeated hourly labels.
- Owner rules pages retain their existing data contracts while clarifying what
  the product currently supports: base pricing rather than unavailable pricing
  rules, policy configuration rather than downstream enforcement claims, and
  venue equipment rather than seeker checkout add-ons. Long names, save actions,
  time formatting, and horizontal venue navigation were checked at mobile widths.
- Integrations, analytics, earnings, widget, and settings now distinguish failed,
  empty, and loading data; use truthful provider and payout language; keep large
  values legible; and avoid fixed save controls covering long forms. The booking
  widget explicitly links to the functioning public embed route instead of
  auto-loading a second full application inside the owner page; the direct embed
  itself passed all four required viewport checks.
- Owner verification comprises 58/58 accepted core captures, 27/27 rules
  captures plus 10/10 targeted correction captures, and 58 finance/integration
  captures and recaptures. No accepted owner case had document-level overflow,
  unnamed controls, prohibited mutations, or unexpected runtime failures. Type
  checking, scoped lint, diff whitespace checks, and production builds pass.
- Phase 7 is complete. Admin, operator, and outreach now share the compact
  `OperationsLayout`, consistent route headings, restrained metrics, semantic
  statuses, responsive filters, and table-to-mobile-row behavior. Native-currency
  chart values and accessible legends replace ornamental chart treatment, and
  destructive or publishing actions retain confirmation without changing their
  existing mutations or authorization boundaries.
- Administrative verification includes 33 admin captures and a 19-case
  operator/outreach matrix across the four required viewport classes. Populated,
  empty, error, loading, reduced-motion, drawer, import, and confirmation states
  were inspected. Accepted cases had no page-level horizontal overflow, unnamed
  controls, unexpected runtime failures, or external mutations.
- Phase 8 consolidated chat presentation on shared `ChatBubble` and `ChatInput`
  contracts, repaired notification row/action semantics, completed 44px touch
  targets for frequent controls, and added reduced-motion alternatives to the
  remaining active loaders. Profile and Messages passed a 35-case matrix with
  focus return, keyboard navigation, modal switching, and reduced-motion checks.
- The application now mounts one Sonner notification system. Legacy toast hooks,
  duplicate toast components, `App.css`, unused visual helpers, and unused
  animation definitions were removed. Tailwind typography support is enabled,
  semantic widget defaults use Court green, and active widget/embed behavior is
  unchanged.
- The final current-run spot-check directly inspected Home at 375, 768, 1280,
  and 1600px plus Venue discovery and Login at mobile and desktop widths. The
  accepted captures have coherent hierarchy, deliberate density, stable image
  crops, reachable actions, no visible horizontal overflow, and consistent Open
  Court typography and surfaces.

## Remaining work

- No in-scope visual implementation remains for this overhaul.
- Licensed Armenian venue/community photography and a repaired local Vitest
  native dependency remain external follow-ups; neither is safe to fabricate or
  silently install as part of the design pass.

## Known compromises and blockers

- Authentic, licensed Armenian venue/community photography is not present in
  the repository. Existing generic images remain temporary until a licensed
  source or approved generated asset strategy is available.
- Authenticated player, owner, and administrator families were inspected through
  intercepted local fixtures. Real-account history and external-provider states
  remain intentionally excluded; no production data will be fabricated or modified.
- The repository's installed `.claude/` Apple Design skill is pinned as an
  external Git submodule. It was read and applied as a secondary guidance layer;
  repository architecture, behavior, and SportsBnB identity remained authoritative.
- HeroSearch's “When” choice remains presentational because discovery has no
  date/availability query contract. The redesign did not invent one.
- The local audit environment has no configured map provider, so map shells,
  controls, unavailable messaging, list alternatives, and responsive geometry
  were verified without production map tiles or credentials.
- The Phase 4 Login `fetchPriority`/Remotion warning and fixture-only duplicate
  Community keys were removed during Phase 5. Forced error-state fixtures still
  report their intentional HTTP 500 resource messages; they do not produce page errors.
- The repository's Vitest command is blocked before test collection by a missing
  optional native `@rolldown/binding-linux-x64-gnu` package in the existing local
  install. No dependency was installed or changed during the redesign; type,
  lint, build, browser, and scoped checks remain available.
- Several existing behavioral edge cases were deliberately preserved: onboarding's
  first-step skip still reaches required-name validation; deprecated owner onboarding
  retains its redirect timing; booking-status failure copy/routes and game-join
  timeout/provider grouping are unchanged; and join-team failure still redirects
  immediately according to its existing flow.
- Outreach now recomposes its heading, filters, actions, and contact data for
  375px instead of compressing a wide desktop table.
- Existing owner data limitations were not disguised or changed: schedule
  blocking is full-day only; hours replacement is not transactional; policies
  are not uniformly enforced downstream; equipment is not a seeker checkout
  add-on; iCal export and `/widget.js` are absent; pull-style calendar imports
  are not persisted; and payout/settings writes retain their existing service
  and validation constraints. These are product/backend follow-ups, not visual
  work completed by this redesign.
- An auto-loaded same-origin widget iframe was rejected after Chromium crashed
  while rendering the nested full SPA. The owner page now presents a truthful
  inline-unavailable state and a direct preview link. The direct embed route and
  generated iFrame contract remain intact and were verified independently at
  375, 768, 1280, and 1600px.

## Verification log

| Date | Phase | Verification | Result |
| --- | --- | --- | --- |
| 2026-08-05 | 0 | Git baseline inspected | `main` at `d5204e2`; user-provided `.claude/` untracked |
| 2026-08-05 | 0 | Apple Design skill read completely | Complete |
| 2026-08-05 | 0 | Global CSS/Tailwind/motion/shell source review | Complete for baseline |
| 2026-08-05 | 0 | Local image/logo/social assets opened and inspected | Complete |
| 2026-08-05 | 1 | Public/player route-family source audit | Complete; browser evidence pending |
| 2026-08-05 | 1 | Owner route-family source audit | Complete; browser evidence pending |
| 2026-08-05 | 1 | Admin/operator/shared-component source audit | Complete; browser evidence pending |
| 2026-08-05 | 2 | Open Court direction and durable specification | Complete; measured token validation pending |
| 2026-08-05 | 0 | Browser viewport review | 47/47 current-run captures accepted at 375, 768, 1280, and 1600px; no page-level horizontal overflow |
| 2026-08-05 | 1 | Populated authenticated route capture | Player, owner, admin, operator, and outreach rendered with intercepted local fixtures; no live writes |
| 2026-08-05 | 1 | Edge-state capture | Empty bookings, venue query error, slow loading, and reduced-motion preference inspected |
| 2026-08-05 | 3 | Post-foundation browser viewport review | 47/47 captures accepted at 375, 768, 1280, and 1600px; zero document-level overflow; route-specific Home/owner/outreach issues carried forward |
| 2026-08-05 | 3 | Light-theme token contrast audit | 71 pairs checked; no required WCAG AA failures |
| 2026-08-05 | 3 | TypeScript and scoped ESLint | Typecheck passed; 0 scoped lint errors and 2 existing Fast Refresh warnings |
| 2026-08-05 | 3 | Development build | Vite build passed (4,226 modules); stale Browserslist dataset warning remains |
| 2026-08-05 | 4 | Integrated public-route browser matrix | 94/94 captures at 375, 768, 1280, and 1600px; zero horizontal overflow; no Phase 4 route runtime errors |
| 2026-08-05 | 4 | Old/new visual comparison | Home, discovery, venue detail, For Owners, Blog, FAQ, map, nearby, Contact, and 404 compared at matched states/viewports |
| 2026-08-05 | 4 | Mobile assistant dock spot-check | `/venues`, `/venue/:id`, and 404 at 375px; launcher occupies reserved 64px navigation column with zero content overlap |
| 2026-08-05 | 4 | TypeScript, full ESLint, and diff whitespace | Passed with zero errors |
| 2026-08-05 | 4 | Development build | Vite build passed (4,226 modules); only stale Browserslist data and one subsequently corrected duration-class warning |
| 2026-08-05 | 5 | Authentication viewport matrix | Login, signup, forgot/reset, and callback at 375, 768, 1280, and 1600px; no overflow or unexpected runtime errors; external provider submissions intentionally excluded |
| 2026-08-05 | 5 | Onboarding and booking-history matrix | 13 accepted player/owner onboarding and history states; keyboard, focus, and responsive layouts passed; no live submissions |
| 2026-08-05 | 5 | Booking/payment presentation matrix | Booking selection, checkout, status, mock payment, game-join status, and embed states verified without changing provider, pricing, or payment behavior |
| 2026-08-05 | 5 | Games, community, dashboard, and field-submission matrix | Required viewports and representative populated/empty/error states accepted with zero document overflow or unexpected page errors |
| 2026-08-05 | 5 | Profile and Messages matrix | 35 states across required viewports plus reduced motion; no overflow, unnamed controls, heading skips, or unexpected page errors; focus return and modal layering rechecked after correction |
| 2026-08-05 | 5 | Teams matrix and targeted correction pass | 32-route/state matrix plus 6 targeted recaptures; long Armenian names, create/edit controls, visibility radios, keyboard selection, and reduced motion pass with zero final overflow |
| 2026-08-05 | 5 | TypeScript, scoped ESLint, diff whitespace, and builds | Phase slices passed; project-wide Vitest remains blocked before collection by the existing missing optional Rolldown native binding |
| 2026-08-05 | 6 | Owner core viewport and state matrix | 58/58 accepted: seven routes at four widths plus empty, error, reduced-motion, focus, dialog, and comparison states; zero overflow, writes, unnamed controls, or unexpected failures |
| 2026-08-05 | 6 | Owner rules matrix and correction pass | 27/27 initial and 10/10 targeted states accepted; policies save flow, long equipment names, time formatting, mobile venue navigation, and empty states rechecked |
| 2026-08-05 | 6 | Owner finance, integration, widget, and settings matrix | 58 captures/recaptures across required widths and edge states; settings save action no longer overlays content; widget unavailable state and direct embed each accepted at four widths |
| 2026-08-05 | 6 | TypeScript, scoped ESLint, diff whitespace, and production builds | Passed; existing Vitest native-binding blocker unchanged and no dependency was modified |
| 2026-08-08 | 7 | Admin viewport and state matrix | 33 captures plus targeted mobile/tablet recaptures; accepted views have zero document overflow and retain safe confirmation boundaries |
| 2026-08-08 | 7 | Operator and outreach matrix | 19/19 cases accepted across 375, 768, 1280, and 1600px, including empty/error/loading, reduced motion, drawer, import, and delete-confirmation states |
| 2026-08-08 | 8 | Profile, Messages, chat, and notifications | 35 profile/messages cases plus targeted source/browser review; focus return, keyboard use, sibling row actions, modal layering, and reduced-motion behavior accepted |
| 2026-08-08 | 9 | Final current-run viewport spot-check | Home at 375, 768, 1280, and 1600px; Venue discovery and Login at mobile and desktop; eight screenshots accepted in `/tmp/sportsbnb-final-qa` |
| 2026-08-08 | 9 | Playwright smoke | 5 unauthenticated checks passed; credentialed booking/payment case skipped by design because no test credentials were supplied |
| 2026-08-08 | 9 | TypeScript, ESLint, diff whitespace, and light-theme contrast | Typecheck and diff check passed; ESLint passed with 0 errors and 153 pre-existing warnings; 71 measured contrast pairs had no required AA failures |
| 2026-08-08 | 9 | Production build and prerender | Vite production build passed with 4,210 modules; 16 sitemap URLs generated and 15 public pages prerendered; only stale Browserslist data was reported |
| 2026-08-08 | 9 | Route, link, and icon static audits | All 66 declared routes occur in an audit list; every detected internal link resolves; no unapproved emoji icon usage found across 319 source files |
| 2026-08-08 | 9 | Unit/component test command | Attempted; Vitest remains blocked before collection by missing existing optional `@rolldown/binding-linux-x64-gnu`; no dependency or lockfile was changed |
