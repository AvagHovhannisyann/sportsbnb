# Operator Dashboard — Growth Metrics by Neighborhood

## Overview
Build a premium operator dashboard that gives the leadership team real-time visibility into liquidity, GMV, and unit economics across Yerevan and Los Angeles markets. The dashboard will be admin-only and surface the metrics that matter for scaling decisions.

## What We're Building

### 1. New Route & Page
- `/operator` — Admin-protected operator dashboard page
- Accessible only to users with `admin` role
- Linked from AdminDashboard header as "Operator View"

### 2. Data Layer (`src/hooks/useOperatorMetrics.ts`)
Fetch and aggregate from existing Supabase tables:
- **Market overview** — total GMV, venues, bookings, active users per city
- **Neighborhood drill-down** — venues by city/area, booking volume, revenue
- **Liquidity health** — open games/day, fill rate, waitlist volume
- **Retention signal** — users with 2nd booking within 14 days
- **CAC proxy** — new signups vs bookings per week

### 3. UI Components (`src/components/operator/`)
- `MarketOverviewCards` — KPI cards for each city with trend indicators
- `NeighborhoodTable` — sortable table of neighborhoods/cities with GMV, venue count, bookings
- `GMVTrendChart` — simple area/sparkline chart showing GMV over last 30 days
- `LiquidityScore` — gauge of open games vs capacity (the "3+ open games/day" metric)
- `CACRetentionPanel` — signup-to-booking funnel and 14-day rebooking rate

### 4. Route & Auth
- Add `/operator` to App.tsx routes
- Protect with existing `AdminRoute` wrapper

## Technical Details

- No new database tables needed — compute from existing `venues`, `bookings`, `games`, `profiles`
- Use TanStack Query for caching and loading states
- Use Recharts for sparkline/area charts (already available in project)
- Dark-theme, Apple-like minimal aesthetic matching existing design system
- Currency: AMD for Yerevan, USD for LA (auto-detected by city)

## File Changes
- **New:** `src/pages/OperatorDashboard.tsx`
- **New:** `src/hooks/useOperatorMetrics.ts`
- **New:** `src/components/operator/MarketOverviewCards.tsx`
- **New:** `src/components/operator/NeighborhoodTable.tsx`
- **New:** `src/components/operator/GMVTrendChart.tsx`
- **New:** `src/components/operator/LiquidityScore.tsx`
- **New:** `src/components/operator/CACRetentionPanel.tsx`
- **Edit:** `src/App.tsx` — add operator route
- **Edit:** `src/pages/AdminDashboard.tsx` — add link to operator view

## Success Criteria
- Admin sees live GMV split by Yerevan vs LA
- Each city shows: total venues, active bookings (last 30d), GMV, open games
- Neighborhood table ranks districts/neighborhoods by activity
- Liquidity score visible per city (green if 3+ open games/day)
- Load time <2s for all aggregations