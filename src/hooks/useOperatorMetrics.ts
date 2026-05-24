import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useAdmin";
import { subDays, format, startOfDay } from "date-fns";

export type Market = "Yerevan" | "Los Angeles" | "Other";
export type Currency = "AMD" | "USD";

export interface MarketMetrics {
  market: Market;
  currency: Currency;
  venues: number;
  activeVenues: number;
  bookings30d: number;
  gmv30d: number;
  newUsers30d: number;
  openGames: number;
  openGamesPerDay: number;
  liquidityHealthy: boolean;
}

export interface NeighborhoodRow {
  city: string;
  market: Market;
  currency: Currency;
  venues: number;
  bookings30d: number;
  gmv30d: number;
}

export interface GMVPoint {
  date: string;
  Yerevan: number;
  "Los Angeles": number;
}

export interface RetentionMetrics {
  newUsers30d: number;
  newUsersWithBooking: number;
  activationRate: number;
  rebookers14d: number;
  rebookRate: number;
}

export interface OperatorMetrics {
  markets: MarketMetrics[];
  neighborhoods: NeighborhoodRow[];
  gmvTrend: GMVPoint[];
  retention: RetentionMetrics;
}

const LA_KEYWORDS = ["los angeles", "la", "santa monica", "pasadena", "hollywood", "venice", "west la", "beverly", "culver"];
const YEREVAN_KEYWORDS = ["yerevan", "երևան", "kentron", "arabkir", "ajapnyak", "davtashen", "malatia", "shengavit", "erebuni", "nor nork", "nork", "kanaker"];

function classifyMarket(city: string | null | undefined): Market {
  if (!city) return "Other";
  const c = city.toLowerCase().trim();
  if (YEREVAN_KEYWORDS.some((k) => c.includes(k))) return "Yerevan";
  if (LA_KEYWORDS.some((k) => c.includes(k))) return "Los Angeles";
  return "Other";
}

function currencyFor(market: Market): Currency {
  return market === "Yerevan" ? "AMD" : "USD";
}

export const useOperatorMetrics = () => {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["operator-metrics"],
    enabled: isAdmin === true,
    staleTime: 60_000,
    queryFn: async (): Promise<OperatorMetrics> => {
      const since30 = subDays(new Date(), 30).toISOString();
      const since30Date = subDays(new Date(), 30);

      const [venuesRes, bookingsRes, gamesRes, profilesRes] = await Promise.all([
        supabase.from("venues").select("id, city, is_active, price_per_hour"),
        supabase
          .from("bookings")
          .select("id, venue_id, total_price, created_at, booking_date, user_id, status")
          .gte("created_at", since30),
        supabase
          .from("games")
          .select("id, location, status, game_date, is_public")
          .eq("is_public", true)
          .eq("status", "open")
          .gte("game_date", format(new Date(), "yyyy-MM-dd")),
        supabase
          .from("profiles")
          .select("user_id, city, created_at")
          .gte("created_at", since30),
      ]);

      if (venuesRes.error) throw venuesRes.error;
      if (bookingsRes.error) throw bookingsRes.error;
      if (gamesRes.error) throw gamesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const venues = venuesRes.data || [];
      const bookings = bookingsRes.data || [];
      const games = gamesRes.data || [];
      const profiles = profilesRes.data || [];

      // venue id -> city/market
      const venueMap = new Map(venues.map((v) => [v.id, { city: v.city, market: classifyMarket(v.city) }]));

      // Aggregate by city
      const cityAgg = new Map<string, NeighborhoodRow>();
      for (const v of venues) {
        const market = classifyMarket(v.city);
        const key = v.city || "Unknown";
        if (!cityAgg.has(key)) {
          cityAgg.set(key, {
            city: key,
            market,
            currency: currencyFor(market),
            venues: 0,
            bookings30d: 0,
            gmv30d: 0,
          });
        }
        cityAgg.get(key)!.venues += 1;
      }

      for (const b of bookings) {
        const venueInfo = venueMap.get(b.venue_id);
        if (!venueInfo) continue;
        const row = cityAgg.get(venueInfo.city || "Unknown");
        if (!row) continue;
        row.bookings30d += 1;
        row.gmv30d += Number(b.total_price) || 0;
      }

      const neighborhoods = Array.from(cityAgg.values()).sort((a, b) => b.gmv30d - a.gmv30d);

      // Market aggregation
      const marketAgg = new Map<Market, MarketMetrics>();
      const ensureMarket = (m: Market): MarketMetrics => {
        if (!marketAgg.has(m)) {
          marketAgg.set(m, {
            market: m,
            currency: currencyFor(m),
            venues: 0,
            activeVenues: 0,
            bookings30d: 0,
            gmv30d: 0,
            newUsers30d: 0,
            openGames: 0,
            openGamesPerDay: 0,
            liquidityHealthy: false,
          });
        }
        return marketAgg.get(m)!;
      };

      for (const v of venues) {
        const m = ensureMarket(classifyMarket(v.city));
        m.venues += 1;
        if (v.is_active) m.activeVenues += 1;
      }
      for (const b of bookings) {
        const venueInfo = venueMap.get(b.venue_id);
        if (!venueInfo) continue;
        const m = ensureMarket(venueInfo.market);
        m.bookings30d += 1;
        m.gmv30d += Number(b.total_price) || 0;
      }
      for (const p of profiles) {
        const m = ensureMarket(classifyMarket(p.city));
        m.newUsers30d += 1;
      }
      for (const g of games) {
        const m = ensureMarket(classifyMarket(g.location));
        m.openGames += 1;
      }

      for (const m of marketAgg.values()) {
        m.openGamesPerDay = m.openGames / 7; // open games scheduled across ~next week proxy
        m.liquidityHealthy = m.openGames >= 21; // 3/day * 7 days
      }

      const orderedMarkets: Market[] = ["Yerevan", "Los Angeles", "Other"];
      const markets = orderedMarkets.map(ensureMarket);

      // GMV trend by day
      const gmvByDay = new Map<string, GMVPoint>();
      for (let i = 29; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "MMM d");
        gmvByDay.set(d, { date: d, Yerevan: 0, "Los Angeles": 0 });
      }
      for (const b of bookings) {
        const d = format(startOfDay(new Date(b.created_at)), "MMM d");
        const point = gmvByDay.get(d);
        if (!point) continue;
        const venueInfo = venueMap.get(b.venue_id);
        if (!venueInfo) continue;
        if (venueInfo.market === "Yerevan") point.Yerevan += Number(b.total_price) || 0;
        else if (venueInfo.market === "Los Angeles") point["Los Angeles"] += Number(b.total_price) || 0;
      }
      const gmvTrend = Array.from(gmvByDay.values());

      // Retention
      const newUserIds = new Set(profiles.map((p) => p.user_id));
      const userFirstBooking = new Map<string, Date>();
      const userBookingCount = new Map<string, number>();
      // Pull all bookings (last 60d) for retention math
      const since60 = subDays(new Date(), 60).toISOString();
      const { data: allBookings } = await supabase
        .from("bookings")
        .select("user_id, created_at")
        .gte("created_at", since60);

      for (const b of allBookings || []) {
        const dt = new Date(b.created_at);
        const cur = userFirstBooking.get(b.user_id);
        if (!cur || dt < cur) userFirstBooking.set(b.user_id, dt);
        userBookingCount.set(b.user_id, (userBookingCount.get(b.user_id) || 0) + 1);
      }

      const newUsersWithBooking = Array.from(newUserIds).filter((id) => userBookingCount.has(id)).length;
      const rebookers14d = Array.from(userFirstBooking.entries()).filter(([uid, firstDt]) => {
        if (firstDt < since30Date) return false;
        const count = userBookingCount.get(uid) || 0;
        return count >= 2;
      }).length;

      const retention: RetentionMetrics = {
        newUsers30d: profiles.length,
        newUsersWithBooking,
        activationRate: profiles.length ? newUsersWithBooking / profiles.length : 0,
        rebookers14d,
        rebookRate: newUsersWithBooking ? rebookers14d / newUsersWithBooking : 0,
      };

      return { markets, neighborhoods, gmvTrend, retention };
    },
  });
};

export const formatMoney = (amount: number, currency: Currency) => {
  if (currency === "AMD") return `֏${Math.round(amount).toLocaleString()}`;
  return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};
