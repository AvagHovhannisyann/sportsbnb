import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";
import { errorResponse, makeLogger } from "../_shared/http.ts";

const log = makeLogger("get-weather");

const UPSTREAM = "https://api.open-meteo.com/v1/forecast";
const UPSTREAM_TIMEOUT_MS = 10_000;

type Coords = { latitude: number; longitude: number };

/**
 * Read the request body without ever throwing. A bare GET (or a POST with an
 * empty body) yields {} instead of blowing up — that empty-body case is what
 * used to reach `await req.json()` and surface as a blanket HTTP 500.
 */
async function readBody(req: Request): Promise<Record<string, unknown>> {
  if (req.method === "GET" || req.method === "HEAD") return {};
  try {
    const raw = await req.text();
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Accepts numbers and numeric strings; rejects null/""/booleans/NaN/Infinity. */
function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Returns coords, or an error message describing what is wrong with the input. */
function parseCoords(
  body: Record<string, unknown>,
  params: URLSearchParams,
): { coords: Coords } | { error: string } {
  const rawLat = body.latitude ?? params.get("latitude") ?? params.get("lat");
  const rawLon = body.longitude ?? params.get("longitude") ?? params.get("lon") ??
    params.get("lng");

  if (rawLat === undefined || rawLat === null || rawLat === "") {
    return { error: "latitude is required" };
  }
  if (rawLon === undefined || rawLon === null || rawLon === "") {
    return { error: "longitude is required" };
  }

  // Note: 0 is a valid coordinate, so this must be a null check, not a falsy check.
  const latitude = toNumber(rawLat);
  const longitude = toNumber(rawLon);

  if (latitude === null) return { error: "latitude must be a finite number" };
  if (longitude === null) return { error: "longitude must be a finite number" };
  if (latitude < -90 || latitude > 90) {
    return { error: "latitude must be between -90 and 90" };
  }
  if (longitude < -180 || longitude > 180) {
    return { error: "longitude must be between -180 and 180" };
  }

  return { coords: { latitude, longitude } };
}

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return errorResponse(req, "Method not allowed. Use GET or POST.", 405);
    }

    const body = await readBody(req);
    const params = new URL(req.url).searchParams;

    const parsed = parseCoords(body, params);
    if ("error" in parsed) {
      log("bad request", { reason: parsed.error, method: req.method });
      return errorResponse(req, parsed.error, 400);
    }
    const { latitude, longitude } = parsed.coords;

    const url = new URL(UPSTREAM);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    );
    url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "5");

    let upstream: Response;
    try {
      upstream = await fetch(url, {
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : "unknown";
      log("upstream unreachable", { reason });
      return errorResponse(req, "Weather provider unreachable", 502);
    }

    const rawBody = await upstream.text().catch(() => "");

    if (!upstream.ok) {
      log("upstream error", { status: upstream.status });
      return errorResponse(
        req,
        `Weather provider returned ${upstream.status}`,
        upstream.status === 429 ? 429 : 502,
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(rawBody);
    } catch {
      log("upstream malformed json", { length: rawBody.length });
      return errorResponse(req, "Weather provider returned a malformed response", 502);
    }

    // The widget reads data.current / data.daily; fail loudly rather than
    // handing the client a shape it will crash on.
    if (
      !data || typeof data !== "object" || Array.isArray(data) ||
      typeof (data as Record<string, unknown>).current !== "object" ||
      (data as Record<string, unknown>).current === null
    ) {
      log("upstream unexpected shape");
      return errorResponse(req, "Weather provider returned an unexpected payload", 502);
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders(req),
        "Content-Type": "application/json",
        // Read-only public endpoint; forecasts change slowly.
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (e) {
    // Last-resort net: nothing escapes as an unhandled throw.
    log("unhandled", { reason: e instanceof Error ? e.message : String(e) });
    return errorResponse(req, "Internal error", 500);
  }
});
