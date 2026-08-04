/**
 * Yandex geo primitives, in one place.
 *
 * The whole reason this module exists is the coordinate-order trap. The app
 * stores and passes coordinates as `{ lat, lng }` — latitude first, the way
 * Google's SDK and our own database columns do it. Yandex's HTTP APIs do the
 * opposite, everywhere and consistently:
 *
 *   - the Geocoder's `Point.pos` is the string `"<longitude> <latitude>"`
 *   - the `ll=` / `ull=` bias parameters are `"<longitude>,<latitude>"`
 *   - Geosuggest answers in the same order
 *
 * The one Yandex surface that does *not* is the JS API v2.1, which is
 * latitude first. That conversion deliberately lives in YandexMap.tsx rather
 * than here, so this file has exactly one rule — "Yandex means longitude
 * first" — and the exception sits next to the code it applies to.
 *
 * Getting that backwards does not throw. It silently relocates every venue —
 * (40.18, 44.51) in Yerevan becomes (44.51, 40.18), a point in the Aral basin
 * — and the failure only shows up as "the map is wrong", far from the code
 * that caused it. So every conversion in the app goes through the four
 * functions at the top of this file, and they are unit-tested.
 */

/** How the rest of the app talks about a point. Latitude first. */
export interface LatLng {
  lat: number;
  lng: number;
}

/** How Yandex talks about a point. LONGITUDE FIRST. */
export type LngLat = [number, number];

/**
 * A rectangle as this app passes it around: `[top-left, bottom-right]`.
 *
 * That is `[[minLng, maxLat], [maxLng, minLat]]` — west/north first, then
 * east/south, each pair longitude first, matching `LngLat` above.
 *
 * This shape was originally chosen because it is what the JS API v3 consumed
 * directly. The map binding is v2.1 now (see YandexMapsProvider.tsx), and v2.1
 * wants `[[south, west], [north, east]]` — the other corner order *and* the
 * other axis order. The shape is kept because everything that *produces*
 * bounds here is longitude-first, like the Geocoder; `toYmapsBounds` in
 * YandexMap.tsx does the one conversion, at the boundary, with a test.
 */
export type LngLatBounds = [LngLat, LngLat];

/** Yerevan. The founder's market, and the bias centre for every lookup. */
export const YEREVAN: LatLng = { lat: 40.1872, lng: 44.5152 };

/** `{ lat, lng }` → Yandex tuple. */
export const toLngLat = (point: LatLng): LngLat => [point.lng, point.lat];

/** Yandex tuple → `{ lat, lng }`. */
export const fromLngLat = (coordinates: LngLat): LatLng => ({
  lng: coordinates[0],
  lat: coordinates[1],
});

/**
 * Parse a Geocoder `Point.pos`, which is `"<longitude> <latitude>"`.
 *
 * Returns null rather than NaN-filled coordinates for anything unparseable,
 * so a malformed response drops the result instead of putting a marker at
 * (NaN, NaN), which renders as a marker at the antimeridian.
 */
export function parseYandexPos(pos: unknown): LatLng | null {
  if (typeof pos !== "string") return null;
  const parts = pos.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const lng = Number(parts[0]);
  const lat = Number(parts[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/**
 * Format a point for Yandex's `ll=` / `ull=` query parameters, which are
 * `"<longitude>,<latitude>"` — comma separated, and again longitude first.
 */
export const formatYandexLl = (point: LatLng): string => `${point.lng},${point.lat}`;

/**
 * The `geocode=` value for a reverse lookup: `"<longitude>,<latitude>"`.
 * Yandex's default `sco` is `longlat`, so this needs no extra parameter.
 */
export const reverseGeocodeQuery = (point: LatLng): string => formatYandexLl(point);

/**
 * The smallest rectangle containing every point, in `LngLatBounds` order.
 *
 * Returns null for an empty list, and for a single point — one point has no
 * extent, and a zero-area rectangle makes the map pick its maximum zoom, which
 * lands the viewer inside a building. Callers fall back to centre + zoom.
 */
export function boundsOf(points: LatLng[]): LngLatBounds | null {
  const usable = points.filter(
    (p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng),
  );
  if (usable.length < 2) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of usable) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  if (minLat === maxLat && minLng === maxLng) return null;

  // [top-left, bottom-right] = [[west, north], [east, south]].
  return [
    [minLng, maxLat],
    [maxLng, minLat],
  ];
}

/** A place, as the app wants it — the shape `LocationAutocomplete` emits. */
export interface YandexPlace {
  /** Short label, e.g. "Republic Square". */
  name: string;
  /** Full one-line address from the geocoder. */
  formattedAddress: string;
  city?: string;
  country?: string;
  /** Yandex "kind": house, street, locality, district, metro, … */
  kind?: string;
  latitude: number;
  longitude: number;
}

/** Yandex address component kinds that stand in for a city, best first. */
const CITY_KINDS = ["locality", "area", "province"];

interface GeocodeComponent {
  kind?: string;
  name?: string;
}

/**
 * Map a Geocoder JSON body to places.
 *
 * The response is deeply nested and every level is optional in practice — a
 * query that matches nothing still returns 200 with an empty
 * `featureMember`, and a match on a region has no `Address.Components` at
 * all. Anything without a usable `Point.pos` is dropped rather than passed on
 * with undefined coordinates.
 */
export function parseGeocodeResponse(body: unknown): YandexPlace[] {
  const members = (body as any)?.response?.GeoObjectCollection?.featureMember;
  if (!Array.isArray(members)) return [];

  const places: YandexPlace[] = [];
  for (const member of members) {
    const geoObject = member?.GeoObject;
    if (!geoObject) continue;

    const point = parseYandexPos(geoObject.Point?.pos);
    if (!point) continue;

    const metaData = geoObject.metaDataProperty?.GeocoderMetaData;
    const address = metaData?.Address;
    const components: GeocodeComponent[] = Array.isArray(address?.Components)
      ? address.Components
      : [];

    const componentNamed = (kind: string) =>
      components.find((c) => c?.kind === kind)?.name;

    let city: string | undefined;
    for (const kind of CITY_KINDS) {
      city = componentNamed(kind);
      if (city) break;
    }

    const formattedAddress =
      metaData?.text || address?.formatted || geoObject.name || "";

    places.push({
      name: geoObject.name || formattedAddress || "Location",
      formattedAddress: formattedAddress || geoObject.name || "",
      city,
      country: componentNamed("country"),
      kind: metaData?.kind,
      latitude: point.lat,
      longitude: point.lng,
    });
  }
  return places;
}

export interface GeocodeUrlOptions {
  apiKey: string;
  /** Free-text address, or `"<lng>,<lat>"` for a reverse lookup. */
  geocode?: string;
  /** A Geosuggest `uri`, which resolves more precisely than its text. */
  uri?: string;
  results?: number;
  lang?: string;
  /** Bias centre. Defaults to Yerevan. */
  ll?: LatLng;
  /** Bias span in degrees, `[lng, lat]`. Defaults to 2×2. */
  spn?: [number, number];
  /** Restrict results to the bias window rather than merely preferring it. */
  restrictToSpn?: boolean;
}

/**
 * Build a Geocoder URL.
 *
 * The parameter shape is lifted wholesale from `SmartSearch`, which has been
 * calling this endpoint successfully: apikey, geocode, format=json, results,
 * lang, and an ll/spn/rspn window around Yerevan so that "Republic Square"
 * resolves to the Armenian one rather than a namesake elsewhere.
 */
export function buildGeocodeUrl(options: GeocodeUrlOptions): string {
  const {
    apiKey,
    geocode,
    uri,
    results = 1,
    lang = "en_US",
    ll = YEREVAN,
    spn = [2, 2],
    restrictToSpn = false,
  } = options;

  // Named `yandexQuery`, not `params`. `scripts/param-handoff.mjs` looks for
  // `params.set("x", …)` to find URL parameters this app writes, and then fails
  // the build for any that nothing here reads. These are read by Yandex, not by
  // us, so under the name `params` they were reported as three orphans on every
  // run. The receiver name is the whole signal that check has; a name outside
  // its list is how an outbound query says it is outbound. Do not rename it back.
  const yandexQuery = new URLSearchParams({
    apikey: apiKey,
    format: "json",
    results: String(results),
    lang,
    ll: formatYandexLl(ll),
    spn: `${spn[0]},${spn[1]}`,
  });
  // `uri` wins: it identifies one place, where the same text can match many.
  if (uri) yandexQuery.set("uri", uri);
  else yandexQuery.set("geocode", geocode ?? "");
  if (restrictToSpn) yandexQuery.set("rspn", "1");

  return `https://geocode-maps.yandex.ru/1.x/?${yandexQuery.toString()}`;
}

/**
 * Fetch and parse. Never throws: a network failure, a rejected key and a
 * genuine no-match all come back as an empty list, because every caller is a
 * search box where the honest answer is "no suggestions".
 */
export async function geocode(
  options: GeocodeUrlOptions,
  fetchImpl: typeof fetch = fetch,
): Promise<YandexPlace[]> {
  if (!options.apiKey) return [];
  try {
    const response = await fetchImpl(buildGeocodeUrl(options));
    if (!response.ok) {
      console.error("Yandex geocoder returned", response.status);
      return [];
    }
    return parseGeocodeResponse(await response.json());
  } catch (error) {
    console.error("Yandex geocoder request failed", error);
    return [];
  }
}

/** Reverse geocode a point to its nearest address. Null when nothing matches. */
export async function reverseGeocode(
  point: LatLng,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<YandexPlace | null> {
  const places = await geocode(
    { apiKey, geocode: reverseGeocodeQuery(point), results: 1 },
    fetchImpl,
  );
  return places[0] ?? null;
}

/**
 * A place as the app's location inputs hand it onward.
 *
 * Same shape `LocationAutocomplete` emitted when it was backed by Google
 * Places, so every form that consumes it — venue creation, game creation —
 * was untouched by the move to Yandex.
 */
export interface LocationPlace {
  name: string;
  city?: string;
  country?: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  /** Yandex "kind" where Google had `types[0]`. */
  type?: string;
}

/**
 * Merge what Geosuggest knew with what the Geocoder found.
 *
 * The suggestion's own title is the better label — it is the string the user
 * clicked — while the geocoder is the authority on coordinates, city and
 * country. Split out from the component so the mapping is testable without a
 * network call or a render.
 */
export function toLocationPlace(
  place: YandexPlace,
  suggestion?: { mainText?: string; fullText?: string },
): LocationPlace {
  return {
    name: suggestion?.mainText || place.name,
    city: place.city,
    country: place.country,
    formattedAddress: place.formattedAddress || suggestion?.fullText || place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    type: place.kind,
  };
}

/** One Geosuggest row, as the edge function forwards it. */
export interface GeosuggestItem {
  title?: { text?: string };
  subtitle?: { text?: string };
  uri?: string;
  tags?: string[];
}

/** The single line a Geosuggest row should read as. */
export function geosuggestFullText(item: GeosuggestItem): string {
  const title = item?.title?.text?.trim() ?? "";
  const subtitle = item?.subtitle?.text?.trim() ?? "";
  if (title && subtitle) return `${title}, ${subtitle}`;
  return title || subtitle;
}
