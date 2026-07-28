# Demo script — conference

Live site: **https://www.sportsbnb.org** (use `www`; the apex 302-redirects and
costs you a second on stage).

Everything below was checked against the production database and `src/App.tsx`.
Every URL here exists.

---

## Before you walk on (5 minutes, not 5 seconds)

**1. Two browsers, both already logged in.** Supabase keeps one session per
browser profile, so switching accounts on stage means logging out and back in.
Instead:

- **Window A — normal window** → log in as **demo.player**. This is the main
  window.
- **Window B — private/incognito window** → log in as **demo.owner**. Only
  needed for the owner section.

**2. The owner dashboard is currently gated shut.** `demo.owner` has
`profiles.user_type = 'player'`, and `/owner-dashboard` requires `'owner'`. As
things stand it silently redirects to `/dashboard` — which is the one page you
do not want on screen. Fix it before the talk, in the Supabase SQL editor:

```sql
update profiles set user_type = 'owner'
where email = 'demo.owner@sportsbnb.org';
```

Then log out and back in as demo.owner so the profile reloads. If you cannot
run it, skip section 5 and stay on the player side.

**3. Do not rehearse on the slot you plan to book on stage.** Clicking Reserve
puts a real 20-minute hold in the database, and a database-level exclusion
constraint means the same hour cannot be held twice. Rehearse on a different
day, or leave 20 minutes before the real thing.

**4. Load the site once** so the splash animation and the lazy-loaded chunks
are warm.

---

## Credentials

Two demo accounts are seeded on production:

```
owner:   demo.owner@sportsbnb.org
player:  demo.player@sportsbnb.org
```

The passwords are deliberately **not** in this file. These are live accounts on
the production project — the owner account holds all 12 listed venues — and this
repo is version-controlled and shared, so a password committed here outlives any
decision to rotate it.

Keep them in a password manager. To reset either one:
Supabase dashboard → Authentication → Users → the account → Reset password.

---

## The walkthrough (5 minutes)

### 1. Landing — `/` — 30s

Open **https://www.sportsbnb.org**. A short brand animation plays, then the
hero: *"Book the court. Skip the call."*

> "Booking a court in Armenia today means phoning someone who keeps a paper
> diary. This is the same booking, without the phone call."

### 2. Browse — `/venues` — 45s

Click **Venues** in the nav. Twelve venues load. Set the sport filter to
**Football** — the list narrows to four.

> "Twelve venues live across six cities — Yerevan, Gyumri, Vanadzor, Dilijan,
> Abovyan, Ejmiatsin — with real hourly prices in dram and live availability.
> Not a directory of phone numbers."

Optional, if the room likes maps: **/venues/map** shows the same inventory
pinned.

### 3. Venue detail — `/venue/…` — 45s

Click **Kentron Football Arena** (Yerevan, ֏12,000/hour). Direct URL if you
need it:

`https://www.sportsbnb.org/venue/be900000-0000-4000-a000-000000000001`

> "One venue: the photos, the amenities, the cancellation terms, and the hours
> that are actually free — which is the thing you currently have to ring up to
> find out."

### 4. Start a booking — `/book/…` — 90s (the important one)

In the booking panel on the right: pick **tomorrow**, then tap a free hour.
The price breaks down on screen — ֏12,000, no booking fee, total
**֏12,000**. Click **Reserve**.

You land on checkout with a **20-minute countdown** and two payment options:
**Bank card (Ameriabank vPOS)** and **Idram**.

> "That slot is now held for twenty minutes — held in the database, not in the
> browser, so nobody else can take it while you find your card. Five percent
> platform fee on top of the owner's rate, and payment is in dram through
> Ameriabank or Idram."

**Stop here. Do not click Pay.** See the payments line below for what to say
next.

### 5. Owner dashboard — `/owner-dashboard` — 60s

Switch to **Window B** (demo.owner). Go to **/owner-dashboard**, then click
through to **/owner/venues** (all twelve venues) and **/owner/schedule**.

The four stat tiles at the top read **֏0 / 0 / 0 / 0%** — there are no
completed bookings in the database yet. Do not linger on them. Lead with the
venue list and the schedule, and say the honest thing:

> "This is the same booking from the owner's side — hours, pricing,
> cancellation policy, and a weekly payout from an internal ledger instead of
> cash at the door. The revenue tiles are zero because nothing has been paid
> through it yet; that number is waiting on the bank, not on the software."

### 6. Games and community — `/games` — 50s

Back to **Window A**. Go to **/games**. Six open games. Click **Sunday
5-a-side, Kentron** (2 Aug, 19:00, ֏2,500 per player).

> "Booking the court is the easy half. Finding nine other people is the hard
> half — so the games sit on the same platform as the venues, and joining one
> pays for your share of the pitch."

Finish on **/community** if you have the time.

---

## What to say about payments

The adapters are written and deployed; they have never been run against real
bank credentials. The honest, strong version:

> "Both Armenian rails are built and deployed — Ameriabank vPOS and Idram,
> behind a single provider interface, with server-side verification so a
> payment is only ever confirmed on the bank's word, never on the browser's.
> What we're waiting on is merchant credentials, not code."

If someone pushes on it:

> "Everything around the payment is tested — the ledger, the refund policy, the
> payout batching, the currency arithmetic. The one thing we haven't done is a
> live transaction against their sandbox, and that needs their credentials.
> Thirty-three edge functions are deployed and authenticated in production."

Do not say the integration is tested or certified. It is not.

---

## Do not click these on stage

| Where | What | Why |
|---|---|---|
| Every page | The **chat bubble**, bottom-right | `OPENROUTER_API_KEY` unset — it errors |
| Checkout | **Pay** | No bank credentials — fails with an error toast |
| Any game | **Request to Join** | All six games are paid; goes straight to the same payment call |
| `/dashboard` | The whole page | Three AI cards on it, all failing. Avoid the player dashboard entirely |
| `/contact` | **Send** | `RESEND_API_KEY` unset — nothing sends |
| `/create-team` | The AI image button | Same missing AI key |
| `/admin` | Anything | demo.owner is not an admin; it redirects |

---

## Known gaps — the truthful list

- **`OPENROUTER_API_KEY` is unset.** Every AI feature errors when clicked: the
  chat bubble in the corner of every page, the AI cards on the player
  dashboard, matchmaking, AI venue recommendations, AI image generation.
- **`RESEND_API_KEY` is unset.** No booking confirmation emails, no contact-form
  email. A booking would confirm in the app and the player would hear nothing.
- **`APP_BASE_URL` is unset.** The functions fall back to `https://sportsbnb.org`
  — the apex, which 302-redirects to `www`. Payment return URLs and email links
  therefore go through an extra hop instead of landing on the canonical origin.
- **Payments have never run against real bank credentials.** Not production,
  not the Ameriabank sandbox. The code is deployed and internally consistent;
  it is unexercised.
- **Game rosters top out at 2 players**, because production has exactly two
  auth users. A game with 10 spots shows 2 joined. Do not zoom into a roster.
- **No completed bookings exist**, so every revenue and occupancy figure on the
  owner side is zero.
- **demo.owner's role** is wrong until you run the SQL at the top of this file.

If asked about any of this, the frame that is both true and fine to say: the
platform is deployed and the data is real; what is missing is third-party keys,
and each one is a settings field, not a rewrite.

---

## If something breaks mid-demo

| Screen | Recovery line |
|---|---|
| Landing hangs on the splash | Hard-reload once. *"First load, cold cache — this is the animation, not the app."* |
| `/venues` shows no venues | Reload. If still empty, go to `/venues/map` — same data, different query. |
| Venue page won't load slots | Say *"availability comes from the database live, so let me take the one I know"* and open the Kentron URL above. |
| Reserve fails ("slot no longer available") | You held that hour in rehearsal. Pick a different hour and carry on — *"the constraint just did its job, that slot is genuinely taken."* |
| Checkout shows an error | *"That's the payment call reaching for credentials we don't have yet — which is exactly the one thing between us and live transactions."* Move on. |
| `/owner-dashboard` bounces to `/dashboard` | The role SQL didn't apply. Say *"let me show you the owner side from the venue list"* and go to `/owner/venues`. |
| An AI panel shows an error | *"That's the AI key, which isn't loaded on this environment."* Scroll past. Don't retry it. |
| Anything else white-screens | The app has a route error boundary — reload the page, don't reload the talk. Fall back to `/venues`, which is the most reliable screen in the product. |

Worst case: the whole demo lives at `/venues` → a venue → `/games`. Those three
screens need no login, no payment, and no AI.
