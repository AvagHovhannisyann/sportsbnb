## Where we are

The AI Venue Outreach Console is live at `/operator/outreach` with:
- Google Maps enrichment (verified working)
- Firecrawl research (now linked + redeployed)
- Lovable AI drafting (Armenian/English auto-detect)
- Resend sending from `avag@sportsbnb.org`
- Manual follow-up scheduling

## Recommended next steps (pick any)

### 1. Smoke test the full pipeline (15 min, no code)
Run one real venue end-to-end to confirm: paste → enrich → research (Firecrawl) → draft → send → log. Catch any runtime issues before bulk use.

### 2. Reply tracking via Resend inbound webhook
Add an edge function `outreach-inbound` that receives Resend events (delivered, opened, replied, bounced) and updates `outreach_messages.status` + `outreach_targets.status` automatically. Today everything stops at "sent".

### 3. Bulk research/draft actions
Add "Enrich all new", "Research all enriched", "Draft all researched" buttons on the console so you can process 50 venues without clicking each row.

### 4. Move to the next of the 4 builds
From the original roadmap, the remaining three are:
- Twilio SMS + AI voice outreach
- TikTok content auto-publisher
- Operator analytics deepening (CAC funnel)

Twilio pairs naturally with the outreach console — same targets, second channel when email gets no reply.

## My recommendation

Do **#1 (smoke test)** right now — takes 5 minutes and validates everything before you load real prospects. Then **#2 (reply tracking)** because without it the inbox view is blind. Then start **Twilio** as the next major build.

Tell me which one to start with.