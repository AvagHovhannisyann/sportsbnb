-- SportsBnB — seed data (public/config tables only).
-- Run AFTER schema.sql on the new project. ON CONFLICT DO NOTHING = safe to re-run.
-- Contains only non-PII catalog/config data readable via the public (anon) API:
-- the achievements catalog, the platform cancellation-policy config, and
-- published blog posts. No user, booking, payment, or PII data.

-- achievements (12 rows)
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('8960d7e8-9682-479f-969b-1c5fc879f2ff', 'First Steps', 'Complete your first booking', '🎯', 'booking', 10, 'bookings_made', 1, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('8f724e39-fa0d-4891-bae6-0d7017cf5348', 'Regular Player', 'Make 5 bookings', '⭐', 'booking', 25, 'bookings_made', 5, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('413ea264-fd2c-464b-a823-38e03b460f96', 'Venue Explorer', 'Make 10 bookings', '🗺️', 'booking', 50, 'bookings_made', 10, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('a98e7a30-4840-42d1-a4ff-cf9f58d595d8', 'Game On', 'Play your first game', '🏀', 'games', 10, 'games_played', 1, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('6fc69ebe-905c-42ce-b051-e6c1340b19be', 'Team Player', 'Play 5 games', '🤝', 'games', 25, 'games_played', 5, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('fd83535b-82ed-48cf-b0ad-9a46fab35d5f', 'MVP', 'Play 25 games', '🏆', 'games', 100, 'games_played', 25, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('89611e48-194f-4973-beb2-d843960bdd03', 'Game Master', 'Host your first game', '🎮', 'hosting', 15, 'games_hosted', 1, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('a59c656b-62bd-4e84-8854-76dfc6b446a1', 'Event Organizer', 'Host 5 games', '📋', 'hosting', 40, 'games_hosted', 5, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('9aff69ef-0f2f-4b25-b94c-d50f0176e367', 'Community Leader', 'Host 10 games', '👑', 'hosting', 75, 'games_hosted', 10, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('a0997576-dc61-4671-bedc-36bed90542d5', 'Critic', 'Write your first review', '✍️', 'social', 10, 'reviews_written', 1, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('d235660d-830e-4c12-9b26-66f7b0686665', 'Reviewer', 'Write 5 reviews', '📝', 'social', 25, 'reviews_written', 5, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.achievements (id, name, description, icon, category, xp_reward, requirement_type, requirement_value, created_at) VALUES ('9369f6b8-5bb1-435a-bb32-4d33df963d3d', 'Ambassador', 'Refer a friend', '🤗', 'social', 30, 'referrals_made', 1, '2026-02-21T20:41:54.432426+00:00') ON CONFLICT (id) DO NOTHING;

-- platform_policies (1 rows)
INSERT INTO public.platform_policies (id, policy_type, policy_data, created_at, updated_at) VALUES ('8e4ddcbd-81df-4bea-99f3-7c6eaad70cf8', 'cancellation', '{"tiers":[{"description":"Free cancellation","hours_before":48,"fee_percentage":0},{"description":"10% cancellation fee","hours_before":24,"fee_percentage":10},{"description":"20% cancellation fee (max)","hours_before":0,"fee_percentage":20}],"max_fee_percentage":20}'::jsonb, '2026-01-19T11:48:48.855568+00:00', '2026-01-19T11:48:48.855568+00:00') ON CONFLICT (id) DO NOTHING;

-- blog_posts (5 rows)
INSERT INTO public.blog_posts (id, title, slug, excerpt, content, cover_image_url, target_keyword, author_name, is_published, published_at, created_at, updated_at, created_by) VALUES ('56c84100-adaf-47f5-ac20-4f174859a2ff', 'How to Find and Book Sports Facilities Near You', 'how-to-find-and-book-sports-facilities-near-you', 'Finding the perfect court, pitch, or gym to play at shouldn''t be a hassle. Learn how modern booking platforms have changed the game for athletes and fitness enthusiasts.', 'Finding the perfect court, pitch, or gym to play at shouldn''t be a hassle. Yet for most people, the process of discovering available sports facilities near them remains frustratingly fragmented. You might call local gyms, check outdated websites, or rely on word-of-mouth recommendations that don''t always pan out. What if there was a better way?

The challenge of finding sports facilities to book is real. Whether you''re a casual player looking for a tennis court, a team needing a soccer pitch for the weekend, or a fitness enthusiast hunting for specialized equipment, the traditional approach wastes time and often leaves you disappointed. That''s where **booking sports facilities near me** has evolved—and it''s changed the game entirely.

## The Problem with Finding Sports Facilities the Old Way

Historically, booking a sports facility meant making phone calls, checking multiple websites, or showing up in person to see if anything was available. Availability information was scattered across different platforms, pricing wasn''t transparent, and you had no way to compare options side by side. For team sports, the process was even more complicated—coordinating with facility managers, negotiating rates, and hoping your preferred time slot was open.

Today''s athletes and fitness enthusiasts deserve better. They need a centralized platform where they can browse facilities, check real-time availability, compare prices, read reviews, and book instantly—all from their phone.

## Why Real-Time Availability Matters

When you **book sports facilities near me**, timing is everything. A court that''s available today might be booked tomorrow. Real-time availability data eliminates the frustration of calling to confirm what you saw online only to discover it''s already reserved. Modern booking platforms show you exactly what''s open, when it''s open, and at what price—instantly.

This transparency saves you hours of research. Instead of making five phone calls to find an available badminton court, you can open an app, see all options within your distance, check reviews, and reserve your spot in minutes.

## The Rise of Digital Booking Platforms for Sports

The sports facility booking space has exploded in recent years, mirroring the broader shift toward on-demand services. Just as platforms revolutionized hospitality and transportation, they''re now transforming how we access sports spaces. Athletes and facility owners both benefit from this digital shift.

For players, the advantages are clear: convenience, choice, and control. For facility owners, it means reaching customers who would never have found them otherwise. This creates a win-win marketplace where supply meets demand efficiently.

## What to Look For When Booking

Not all booking platforms are created equal. When searching to **book sports facilities near me**, prioritize platforms that offer:

**Clear Photos and Detailed Descriptions**: You should see multiple images of the facility, understand what equipment is included, and know the exact dimensions and condition of the space.

**Transparent Pricing**: No hidden fees. The total cost should be clear before you confirm your booking.

**Real Reviews**: Honest feedback from other players helps you make informed decisions. Look for reviews that mention facility condition, staff friendliness, and whether it met expectations.

**Easy Cancellation Policies**: Life happens. Choose platforms that offer flexible cancellation options so you''re not penalized for unforeseen circumstances.

**Customer Support**: If something goes wrong on game day, you need responsive support. Check what customer service options are available.

## Making Your Booking Decision

Once you''ve found a few options that fit your needs, the decision becomes easier. Consider the facility''s location, amenities, price per hour, and user ratings. Many platforms let you filter by these criteria, narrowing down your choices to the handful that truly match what you''re looking for.

Reading recent reviews is particularly valuable. They reveal whether a facility is well-maintained, whether the booking process was smooth, and if staff were helpful. Pay attention to specific details mentioned by reviewers—not just star ratings.

## Level Up Your Game with the Right Facility

The right sports facility can make or break your experience. A well-maintained court, proper lighting, quality equipment, and convenient location all contribute to better performance and more enjoyment. By using a modern booking platform to **book sports facilities near me**, you''re investing in your game and ensuring you get exactly what you need.

Whether you''re practicing for competition, staying fit with friends, or trying a new sport, having easy access to quality facilities makes all the difference. No more phone tag, no more disappointment, no more settling for what''s available—just the facility you want, booked when you need it.

Ready to spend less time searching and more time playing? Discover thousands of sports facilities available to book instantly at **[SportsBnb.org](https://www.sportsbnb.org/)**. Find, book, and play today.', NULL, 'book sports facilities near me', 'SportsBnb Team', true, '2026-03-21T22:01:21.797616+00:00', '2026-03-26T22:01:21.797616+00:00', '2026-03-26T22:01:21.797616+00:00', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.blog_posts (id, title, slug, excerpt, content, cover_image_url, target_keyword, author_name, is_published, published_at, created_at, updated_at, created_by) VALUES ('c0615210-58af-4b4e-93ed-e500c6e93aa7', 'Why Sports Facility Owners Should List on a Booking Platform', 'why-sports-facility-owners-should-list-on-a-booking-platform', 'If you own or manage a sports facility, you''re sitting on an untapped revenue opportunity. Learn why listing online is the smartest move you can make.', 'If you own or manage a sports facility, you''re sitting on an untapped revenue opportunity. Thousands of players, teams, and fitness enthusiasts in your area are actively searching for places to play—and they''re finding everyone except you. The question isn''t whether you should **list sports facility online**, but why you haven''t already.

The economics are compelling. Most facility owners operate at less than full capacity. Courts sit empty during off-peak hours. Pitches go unused on weekday mornings. Gym equipment remains idle while potential customers pass by without ever knowing you exist. In today''s digital world, that''s a significant loss of revenue and wasted potential.

## The Revenue Gap: What You''re Missing Out On

Consider the numbers. If you have ten courts and operate twelve hours a day, that''s 120 court-hours available weekly. Even if you''re 60% booked—which is decent but not optimal—that''s nearly 50 court-hours per week going unused. At $30-50 per hour, that''s $1,500 to $2,500 in lost weekly revenue. Over a year, that''s $75,000-130,000 in unrealized income.

This gap exists largely because potential customers don''t know you''re there. They''re using online booking platforms to search for available facilities, but if you''re not listed, you''re invisible to them.

## How Online Booking Platforms Work for Owners

When you **list sports facility online** on a modern platform, several things happen immediately. Your facility becomes discoverable to thousands of potential customers searching in your area. You gain access to a built-in audience actively looking to book sports spaces—no marketing effort required on your part.

The platform handles the logistics that traditionally consumed your time. Booking confirmation, payment processing, cancellation management, and customer communication all happen through the system. You''re no longer fielding phone calls, managing spreadsheets, or chasing payments.

## Passive Income from Underutilized Spaces

Many facility owners have discovered that **listing sports facility online** transforms underutilized spaces into reliable revenue streams. That community center with empty courts Tuesday mornings? Now it''s generating $200-300 in bookings. The gym with excess equipment during afternoon hours? Suddenly drawing corporate training sessions.

## Building Trust and Reputation

Online booking platforms have built-in review and rating systems. When you **list sports facility online**, you''re building a reputation that attracts more bookings. A facility with excellent reviews and lots of bookings appears more credible and desirable to new customers than an unknown competitor. Better reviews attract more bookings—a virtuous cycle.

## Reducing No-Shows and Bad-Paying Customers

Traditional facilities often struggle with unreliable customers—people who book verbally and don''t show up, or who dispute charges after the fact. Online booking platforms eliminate this problem. Payment is processed upfront. Cancellation policies are clearly stated and enforced.

## Competitive Advantage in Your Market

Right now, your competitors who''ve already listed on booking platforms are capturing demand that could be yours. Being an early adopter in your area gives you a significant advantage. You''ll capture early-mover search share, build reviews faster, and establish yourself as the go-to facility before competitors realize what''s happening.

## It''s Easier Than You Think

Listing your facility online is not complicated. Upload photos, describe your amenities, set your pricing, and define your availability. Within an hour, you''re live and accepting bookings. Technical skill isn''t required. The platform provides all the infrastructure.

Stop leaving money on the table. Join thousands of facility owners who''ve transformed their underutilized spaces into revenue-generating assets.

Ready to maximize your facility''s earning potential? List your sports facility today on **[SportsBnb.org](https://www.sportsbnb.org/)** and start accepting bookings immediately.', NULL, 'list sports facility online', 'SportsBnb Team', true, '2026-03-22T22:01:21.797616+00:00', '2026-03-26T22:01:21.797616+00:00', '2026-03-26T22:01:21.797616+00:00', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.blog_posts (id, title, slug, excerpt, content, cover_image_url, target_keyword, author_name, is_published, published_at, created_at, updated_at, created_by) VALUES ('ab009d21-c940-489b-925f-ad3762833e92', 'The Rise of Sports Tourism: A New Way to Travel', 'the-rise-of-sports-tourism-a-new-way-to-travel', 'Travel has transformed. Today''s travelers want active, engaging experiences. Discover how sports tourism is changing the way we explore the world.', 'Travel has transformed. The days of passive sightseeing are fading. Today''s travelers want experiences—authentic, active, engaging moments that define their trips. The fastest-growing segment? **Sports tourism booking**. More people are planning vacations around their passion for sports than ever before.

Sports tourism means traveling specifically to participate in or watch sports. Whether you''re flying to Barcelona to play beach volleyball, heading to Colorado for mountain biking, or visiting Thailand for a Muay Thai training camp, you''re a sports tourist. And the industry is booming.

## Why Sports Tourism Is Growing Explosively

Several trends have converged to make sports tourism mainstream. Digital platforms now make it easy to find and book sports facilities anywhere in the world. Remote work means people can travel longer and more frequently. There''s a growing global interest in fitness and wellness. And people increasingly value experiences over passive tourism.

Combine these factors and you get millions of travelers actively seeking sports experiences abroad. A software developer from Toronto might spend a week in Costa Rica doing surfing lessons. An accountant from Singapore might fly to Barcelona for beach volleyball clinics.

## The Economics of Sports Tourism

The sports tourism industry is worth billions globally and growing 8-10% annually. For facility owners, this represents an incredible opportunity. A tennis court in a tourist destination commands premium pricing from travelers. A gym in a vacation hotspot can offer daily or weekly packages to visiting athletes.

The internet has made it frictionless for travelers to handle **sports tourism booking**. Instead of planning a vacation and hoping to find places to play on arrival, travelers now research and book athletic activities before they travel.

## Planning a Sports Tourism Trip

If you''re considering a sports-focused trip, you start with your sport, not your destination. Where in the world offers the best experience for what you want to do? For tennis players, clay courts in Spain or hard courts in Australia become destinations. For surfers, Portugal''s coastline or Indonesia''s perfect waves draw travelers. For golfers, Scotland or Arizona become pilgrimage sites.

Once you''ve chosen your destination, the next step is finding facilities. This is where **sports tourism booking** platforms become invaluable. See exactly what''s available, compare prices, read reviews from other travelers, and reserve your spots before you book your flight.

## What Facilities Need to Offer Sports Tourists

Facilities that cater to sports tourists prioritize flexibility—daily or weekly passes that work for travelers rather than just memberships. Many offer instruction; a tourist visiting a tennis facility might need a coach rather than just court access. The best facilities provide social atmosphere, connecting visitors with local players and other tourists.

## Booking Sports Facilities While Traveling

The actual process of **sports tourism booking** should be simple. Whether you''re booking three months in advance or three days before your trip, you should be able to see availability, understand pricing, read reviews, and confirm instantly. The best platforms show you exactly what you''re getting—facility photos, equipment descriptions, coach qualifications, and honest reviews from previous travelers.

## The Future of Travel Is Active

Traditional tourism is evolving. More people are asking not "Where should I go?" but "Where can I play my sport?" That shift has created an entirely new way of traveling. Whether you''re an athlete seeking to improve your craft, a casual player wanting new challenges, or a fitness enthusiast wanting to stay active while exploring the world, sports-focused travel offers something traditional vacations can''t match.

Ready to turn your passion for sports into your next adventure? Explore sports facilities and experiences around the world on **[SportsBnb.org](https://www.sportsbnb.org/)**. Your next unforgettable sports trip is just a few clicks away.', NULL, 'sports tourism booking', 'SportsBnb Team', true, '2026-03-23T22:01:21.797616+00:00', '2026-03-26T22:01:21.797616+00:00', '2026-03-26T22:01:21.797616+00:00', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.blog_posts (id, title, slug, excerpt, content, cover_image_url, target_keyword, author_name, is_published, published_at, created_at, updated_at, created_by) VALUES ('94585ebf-d8b1-44e2-a5be-75e1a4ea25ee', 'How SportsBnb Works: A Complete Guide', 'how-sportsbnb-works-a-complete-guide', 'Whether you''re looking to play tennis, book a gym, or reserve a soccer pitch, SportsBnb simplifies the entire process. Here''s your complete guide.', 'Whether you''re looking to play tennis, book a gym, reserve a soccer pitch, or find a boxing facility, SportsBnb simplifies the entire process. If you''ve never used the platform, you might wonder how it works. The good news? It''s straightforward for both guests seeking to play and hosts offering facilities. Let''s break down **how SportsBnb works** step by step.

## What Is SportsBnb?

SportsBnb is a digital marketplace that connects athletes, teams, and fitness enthusiasts with sports facilities and experiences. Think of it as Airbnb, but specifically for sports. Facility owners list their courts, gyms, pitches, and athletic spaces. Players and teams browse available facilities, check real-time availability, read reviews, and book instantly.

## For Guests: How to Find and Book

**Step 1: Search Your Area** — Enter your location and the type of facility you need. SportsBnb shows all available options with locations, pricing, and current availability.

**Step 2: Filter Your Options** — Use filters to narrow by price, amenities, distance, rating, or facility type.

**Step 3: Review Facility Details** — Each listing includes photos, descriptions, pricing, amenities, house rules, and honest reviews.

**Step 4: Check Availability** — The calendar shows exact availability in real-time. No guessing, no calling to confirm.

**Step 5: Book Your Spot** — Select your date and time, review the total price, and confirm. Instant booking confirmation sent immediately.

**Step 6: Show Up and Play** — Arrive at the facility during your reserved time and play.

## For Hosts: How to List and Manage

**Step 1: Create Your Host Account** — Sign up as a host. Takes minutes.

**Step 2: List Your Facility** — Add photos, description, amenities, pricing, cancellation policy, and house rules. High-quality photos directly influence booking rates.

**Step 3: Set Your Availability and Pricing** — Define which hours and days are bookable. You control your schedule completely.

**Step 4: Manage Bookings** — SportsBnb handles payment processing and sends booking confirmations. View your calendar and manage everything through the platform.

**Step 5: Build Your Reputation** — Excellent experiences lead to positive reviews, which attract more bookings. Your reputation becomes your marketing engine.

## How Pricing Works

SportsBnb takes a small commission on each booking. Facility owners keep the majority of the revenue. Pricing is completely flexible—from a small community court at $25/hour to a premium facility with coaching at $75+/hour. The market determines pricing based on quality, location, and demand.

## Safety and Trust

Both guests and hosts are protected. Guests see verified facility information, real photos, honest reviews, and transparent pricing before booking. Hosts know they''ll be paid for confirmed bookings. Cancellation policies are clear for everyone.

Now that you understand **how SportsBnb works**, you''re ready to get started. Browse available facilities at **[SportsBnb.org](https://www.sportsbnb.org/)** or list your space and start accepting bookings today.', NULL, 'how SportsBnb works', 'SportsBnb Team', true, '2026-03-24T22:01:21.797616+00:00', '2026-03-26T22:01:21.797616+00:00', '2026-03-26T22:01:21.797616+00:00', NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.blog_posts (id, title, slug, excerpt, content, cover_image_url, target_keyword, author_name, is_published, published_at, created_at, updated_at, created_by) VALUES ('fe0c5279-8cda-4731-907a-f4d70ae09c8c', 'Top 10 Sports Experiences You Can Book Online', 'top-10-sports-experiences-you-can-book-online', 'The world of sports is bigger and more accessible than ever. Discover the top 10 sports experiences you can reserve online today.', 'The world of sports is bigger and more accessible than ever. No matter what athletic passion drives you, you can now **book sports experiences online**. From casual weekend matches to intensive training camps, the variety of bookable sports experiences is remarkable. Here are ten you can reserve today.

## 1. Tennis Court Rental
Courts range from basic outdoor facilities in community parks to premium indoor courts with professional-grade surfaces. Book for singles matches, doubles tournaments, or lessons with professional coaches. Plan ahead for evening and weekend peak slots.

## 2. Soccer Pitch Booking
From small five-a-side pitches to full-sized regulation fields. Many include goals, nets, and basic equipment. Team captains appreciate the ability to book recurring weekly slots.

## 3. Basketball Court Rental
Available for solo shootarounds, pickup games, or tournaments. Many include proper flooring, lighting, and sometimes scoreboard systems.

## 4. Gym and Fitness Facility Access
Book day passes or week passes at gyms and fitness facilities—perfect for travelers or people trying a gym before committing to membership. Some include classes and personal training.

## 5. Pickleball Court Booking
Pickleball is exploding and courts are increasingly bookable. Many facilities include paddle and ball rentals, making it instantly accessible.

## 6. Volleyball Court Experience
Both indoor and outdoor courts available for league matches, pickup games, or training. Some specialize in beach volleyball with a resort-like atmosphere.

## 7. Golf Course and Driving Range
Reserve tee times or driving range hours online. Browse available times, view course details, and book instantly. Many offer lessons with PGA professionals.

## 8. Boxing and Combat Sports Facilities
From boxing ring time to private coaching for MMA, kickboxing, or martial arts—these facilities appeal to serious athletes and casual fitness enthusiasts alike.

## 9. Swimming Pool and Aquatic Facility Access
Lane rentals, lessons, or open water access. Pools range from community facilities to luxury resort pools. Some specialize in training for competitive swimmers or triathletes.

## 10. Athletic Training and Coaching Sessions
Specialized instruction combined with facility access—running coaches, tennis clinics, CrossFit workshops. These combine space with expertise for maximum development.

## Why Online Booking Matters

The ability to **book sports experiences online** has democratized access to sports facilities and expertise. Ten years ago, finding facilities required phone calls and local knowledge. Now, a comprehensive inventory of available spaces is open to anyone with internet access. Athletes get instant access. Facility owners reach customers they''d never have found. Communities see increased sports participation.

Stop delaying. Stop making phone calls. Start exploring the incredible range of sports experiences available right now.

Discover thousands of courts, gyms, pitches, coaches, and athletic spaces at **[SportsBnb.org](https://www.sportsbnb.org/)**. Your next favorite facility is waiting.', NULL, 'book sports experiences online', 'SportsBnb Team', true, '2026-03-25T22:01:21.797616+00:00', '2026-03-26T22:01:21.797616+00:00', '2026-03-26T22:01:21.797616+00:00', NULL) ON CONFLICT (id) DO NOTHING;

