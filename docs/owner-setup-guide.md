# Setting up your venue on Sportsbnb

For venue owners. Every field, button and rule below was checked against the
live app — if it says a button is called something, that is what it says on
screen.

Roughly 20 minutes for your first venue, 5 for each one after.

---

## Before you start, get these ready

You cannot save a listing without them, so collecting them first saves a
half-finished form:

- **At least 3 photos.** This is enforced — the form refuses to submit with
  fewer. See the photo section below for what to shoot.
- **A description of at least 100 characters.** Also enforced, with a live
  counter.
- **A phone number players can actually reach.** Validated as a real number.
- **Your exact address**, and ideally the ability to find your venue on a map.
- **Your hourly price in dram.**

---

## 1. Create your account as an owner

Sign up at **/signup**, then complete **/onboarding/owner**.

The account type matters: the owner dashboard is gated on it, and a player
account silently redirects away from `/owner-dashboard` instead of showing an
error. If you land on the player dashboard when you expected the owner one,
that is the cause.

## 2. List the venue — `/list-venue`

The form is one page with several cards. It will not submit until every rule
below passes, and it tells you which ones failed.

### Name, city, address

All three required. Address is what players navigate by, so write it the way a
taxi driver would understand it, not the way the post office would.

### Description — minimum 100 characters

The counter shows how many you have. Do not pad it to clear the limit; the
description is the main thing a player reads before booking.

Write the things people phone up to ask:

- Surface — artificial grass, parquet, rubber, clay
- Indoor or outdoor, and whether it is covered
- Lighting, and whether evening play is possible
- Changing rooms, showers, parking
- Whether balls, bibs and goals are provided
- How to find the entrance, if it is not obvious from the street

### Sports — at least one

This drives the sport filter on `/venues`. Select every sport genuinely
playable on your surface, and none that are not. A football pitch tagged as
basketball gets clicked by people looking for basketball, who then leave — that
costs you ranking and reputation, not just a click.

### Photos — minimum 3

The most valuable 20 minutes you will spend on this listing.

- **Shoot in daylight.** Phone cameras handle floodlights badly and the result
  looks worse than the pitch does.
- **Wide shot first.** The first photo is the one that appears in search
  results, and it decides whether anyone opens your listing at all. Full pitch,
  from a corner, showing the whole playing area.
- **Then the things people worry about**: changing rooms, showers, the parking,
  the entrance.
- **Show it clean and empty.** An empty pitch reads as available; a pitch full
  of someone else's game reads as busy.
- **No text, logos or collages.** They make a listing look like an
  advertisement rather than a place.

Three is the minimum, not the target. Five or six covering pitch, changing
room, parking and entrance answers almost every pre-booking question.

### Location — you must confirm it on the map

This is the step people get stuck on, so it is worth explaining properly.

Two ways to set the pin:

1. **Type your address in the search box** and pick the match.
2. **Click directly on the map**, then drag the pin to fine-tune it.

Either way, a "Confirm This Location" button appears once a point is selected.
**You must press it.** Until you do, the form fails with "Please confirm the
venue location on the map", and nothing else you fill in will save.

Once confirmed you will see "Location confirmed! You can continue with the
form."

> Note: editing the city or address afterwards **clears the confirmation**, so
> you have to confirm again. That is deliberate — it stops a pin from silently
> pointing at your old address.

Drag the pin to the **entrance players should walk to**, not the centre of the
building. On a school or a complex, that difference is the difference between
arriving on time and wandering around the perimeter.

### Phone

Validated as a real number. This is how players reach you when they are
standing outside and cannot find the gate.

---

## 3. Set your hours — `/owner/hours`

Empty hours means no bookable slots, which means your listing is visible and
un-bookable. Set these before you tell anyone about your listing.

Be honest about the edges. A slot you cannot actually honour becomes a
cancellation, and cancellations are far more expensive than a narrower
schedule.

## 4. Set your pricing — `/owner/pricing`

Your hourly rate in dram.

**Sportsbnb takes 0% commission.** The price you set is the price you receive.
There is no platform fee added on top for the player either — what they see is
what they pay, and what you set is what you get.

Price against the venues near you, which you can see on `/venues` filtered to
your city.

## 5. Set your cancellation policy — `/owner/policies`

This is shown to the player *before* they pay, and it is what the refund
calculation follows if they cancel. A policy nobody can see cannot protect you;
this one is enforced automatically.

Strict policies protect a scarce Friday evening slot. Generous policies win
first-time bookers who are not sure yet. Most owners want something in between
— and it is reasonable to be strict on peak hours and relaxed off-peak.

## 6. Optional, but worth it

- **`/owner/equipment`** — balls, bibs, goals. Answers a question that
  otherwise arrives as a phone call at 9pm.
- **`/owner/widget`** — a booking widget you can embed in your own site or a
  social profile, so your existing audience books through the same calendar.
- **`/owner/schedule`** — the week at a glance; the fastest way to spot the
  gaps worth discounting.

---

## Running the venue

| Page | What it is for |
|---|---|
| `/owner-dashboard` | Overview and recent bookings |
| `/owner/bookings` | Every booking, and the actions on each |
| `/owner/schedule` | Your week, visually |
| `/owner/earnings` | Balance and payouts |
| `/owner/analytics` | Views and conversion |
| `/owner/venues` | All your listings |

### How you get paid

Players pay through the platform when they book, rather than in cash at the
gate. Your balance builds up in `/owner/earnings`, and is paid out to your bank
account.

Add your bank details in your payout settings before your first payout run — a
balance with nowhere to send it just sits there.

---

## What actually gets you bookings

Ranked by how much difference they make, based on how the product works rather
than on general advice:

1. **The first photo.** It is the entire search result. Everything else is
   downstream of whether anyone clicks.
2. **Complete hours.** Empty or narrow hours cap your bookings no matter how
   good the listing is.
3. **Accurate sports tags.** Being findable by the right people beats being
   visible to everyone.
4. **A description that answers the phone questions.** Surface, lighting,
   parking, changing rooms.
5. **Reviews.** `/venues` can be sorted by "Top rated", and the default
   "Recommended" order accounts for rating too. Ask happy groups to leave one —
   most will if asked once, in person, as they leave.
6. **A pin on the entrance.** Late arrivals become bad reviews about your pitch
   even when the pitch was fine.

### Two things that quietly cost you money

- **A listing with no hours set.** It looks live and takes no bookings. This is
  the single most common way a good venue earns nothing.
- **Sport tags added "just in case".** They bring in people looking for
  something you do not offer, who bounce — which teaches the ranking that your
  listing is not what people want.

---

## If something goes wrong

| Symptom | What it is |
|---|---|
| "Please confirm the venue location on the map" | You set a pin but did not press **Confirm This Location**, or you edited the address afterwards and cleared it |
| Form will not submit, no obvious reason | Scroll up — description under 100 characters, or fewer than 3 photos |
| `/owner-dashboard` sends you to the player dashboard | Your account type is not owner |
| Your venue is not in search | Check it has hours set, and that the sport filter you are testing with matches your tags |
| The map area is blank | Reload once. If it persists, report it — the map is a third-party service and its failures look identical to a slow connection |
