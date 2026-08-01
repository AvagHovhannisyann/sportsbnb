import { describe, it, expect, vi, afterEach } from "vitest";
import {
  YEREVAN,
  boundsOf,
  buildGeocodeUrl,
  formatYandexLl,
  fromLngLat,
  geocode,
  geosuggestFullText,
  parseGeocodeResponse,
  parseYandexPos,
  reverseGeocodeQuery,
  toLngLat,
  type LatLng,
} from "./yandexGeo";

/**
 * A real Yerevan point, chosen because its two components are both plausible
 * latitudes AND plausible longitudes. Swap them and nothing throws — you just
 * end up 500km east, in the middle of the Caspian. That is the bug this file
 * exists to catch, so the fixtures never use a coordinate where the mistake
 * would be obvious.
 */
const REPUBLIC_SQUARE: LatLng = { lat: 40.1776, lng: 44.5126 };

const geoObject = (over: Record<string, unknown> = {}) => ({
  metaDataProperty: {
    GeocoderMetaData: {
      kind: "house",
      text: "Armenia, Yerevan, Republic Square, 1",
      Address: {
        country_code: "AM",
        formatted: "Yerevan, Republic Square, 1",
        Components: [
          { kind: "country", name: "Armenia" },
          { kind: "province", name: "Yerevan" },
          { kind: "locality", name: "Yerevan" },
          { kind: "street", name: "Republic Square" },
          { kind: "house", name: "1" },
        ],
      },
    },
  },
  name: "Republic Square, 1",
  description: "Yerevan, Armenia",
  Point: { pos: "44.5126 40.1776" },
  ...over,
});

const collection = (objects: unknown[]) => ({
  response: {
    GeoObjectCollection: {
      metaDataProperty: { GeocoderResponseMetaData: { found: String(objects.length) } },
      featureMember: objects.map((GeoObject) => ({ GeoObject })),
    },
  },
});

describe("toLngLat / fromLngLat", () => {
  it("puts longitude first, which is the reverse of how the app stores it", () => {
    expect(toLngLat(REPUBLIC_SQUARE)).toEqual([44.5126, 40.1776]);
  });

  it("reads longitude first back out", () => {
    expect(fromLngLat([44.5126, 40.1776])).toEqual({ lat: 40.1776, lng: 44.5126 });
  });

  it("round-trips", () => {
    expect(fromLngLat(toLngLat(REPUBLIC_SQUARE))).toEqual(REPUBLIC_SQUARE);
  });

  it("keeps a negative longitude negative (Los Angeles, the other default region)", () => {
    const la = { lat: 34.0522, lng: -118.2437 };
    expect(toLngLat(la)).toEqual([-118.2437, 34.0522]);
    expect(fromLngLat(toLngLat(la))).toEqual(la);
  });
});

describe("parseYandexPos", () => {
  it("reads 'longitude latitude', not 'latitude longitude'", () => {
    expect(parseYandexPos("44.5126 40.1776")).toEqual({ lat: 40.1776, lng: 44.5126 });
  });

  it("does not silently accept the swapped reading", () => {
    // If this ever equals {lat: 44.5126}, the parse order has been inverted.
    expect(parseYandexPos("44.5126 40.1776")!.lat).toBeCloseTo(40.1776, 6);
    expect(parseYandexPos("44.5126 40.1776")!.lng).toBeCloseTo(44.5126, 6);
  });

  it("handles negative longitudes", () => {
    expect(parseYandexPos("-118.2437 34.0522")).toEqual({ lat: 34.0522, lng: -118.2437 });
  });

  it("tolerates extra whitespace and a trailing altitude", () => {
    expect(parseYandexPos("  44.5126   40.1776  ")).toEqual({
      lat: 40.1776,
      lng: 44.5126,
    });
    expect(parseYandexPos("44.5126 40.1776 0")).toEqual({ lat: 40.1776, lng: 44.5126 });
  });

  it("rejects anything unparseable rather than returning NaN", () => {
    expect(parseYandexPos(undefined)).toBeNull();
    expect(parseYandexPos(null)).toBeNull();
    expect(parseYandexPos("")).toBeNull();
    expect(parseYandexPos("44.5126")).toBeNull();
    expect(parseYandexPos("east north")).toBeNull();
    expect(parseYandexPos({ lat: 1, lng: 2 })).toBeNull();
  });

  it("rejects out-of-range values, which is how a swapped pair is caught", () => {
    // "40.1776 44.5126" is a valid point. "44.5126 100.0" is not: no latitude
    // exceeds 90, so a response with the components reversed at source fails
    // here instead of drawing a marker.
    expect(parseYandexPos("44.5126 100.0")).toBeNull();
    expect(parseYandexPos("200.0 40.1776")).toBeNull();
  });
});

describe("formatYandexLl / reverseGeocodeQuery", () => {
  it("emits 'longitude,latitude' for the bias parameters", () => {
    expect(formatYandexLl(REPUBLIC_SQUARE)).toBe("44.5126,40.1776");
  });

  it("matches the ll= value SmartSearch already sends for Yerevan", () => {
    expect(formatYandexLl(YEREVAN)).toBe("44.5152,40.1872");
  });

  it("uses the same order for a reverse lookup", () => {
    expect(reverseGeocodeQuery(REPUBLIC_SQUARE)).toBe("44.5126,40.1776");
  });
});

describe("boundsOf", () => {
  const north = { lat: 40.25, lng: 44.4 };
  const south = { lat: 40.1, lng: 44.6 };

  it("returns [top-left, bottom-right] — west/north first", () => {
    expect(boundsOf([north, south])).toEqual([
      [44.4, 40.25],
      [44.6, 40.1],
    ]);
  });

  it("is order-independent", () => {
    expect(boundsOf([south, north])).toEqual(boundsOf([north, south]));
  });

  it("contains every point it was given", () => {
    const points = [north, south, { lat: 40.2, lng: 44.55 }, { lat: 40.15, lng: 44.42 }];
    const [[west, top], [east, bottom]] = boundsOf(points)!;
    for (const p of points) {
      expect(p.lng).toBeGreaterThanOrEqual(west);
      expect(p.lng).toBeLessThanOrEqual(east);
      expect(p.lat).toBeLessThanOrEqual(top);
      expect(p.lat).toBeGreaterThanOrEqual(bottom);
    }
  });

  it("returns null when there is nothing to fit", () => {
    expect(boundsOf([])).toBeNull();
    expect(boundsOf([north])).toBeNull();
    // Two markers on the exact same spot have no extent; fitting them would
    // ask ymaps3 for infinite zoom.
    expect(boundsOf([north, { ...north }])).toBeNull();
  });

  it("ignores points with missing coordinates", () => {
    const dirty = [north, { lat: NaN, lng: 44.5 }, south] as LatLng[];
    expect(boundsOf(dirty)).toEqual(boundsOf([north, south]));
  });
});

describe("parseGeocodeResponse", () => {
  it("maps a house result, latitude and longitude the right way round", () => {
    const [place] = parseGeocodeResponse(collection([geoObject()]));
    expect(place.latitude).toBeCloseTo(40.1776, 6);
    expect(place.longitude).toBeCloseTo(44.5126, 6);
    expect(place.name).toBe("Republic Square, 1");
    expect(place.formattedAddress).toBe("Armenia, Yerevan, Republic Square, 1");
    expect(place.city).toBe("Yerevan");
    expect(place.country).toBe("Armenia");
    expect(place.kind).toBe("house");
  });

  it("returns an empty list for an empty or malformed body", () => {
    expect(parseGeocodeResponse(collection([]))).toEqual([]);
    expect(parseGeocodeResponse({})).toEqual([]);
    expect(parseGeocodeResponse(null)).toEqual([]);
    expect(parseGeocodeResponse("nope")).toEqual([]);
    expect(parseGeocodeResponse({ response: { GeoObjectCollection: {} } })).toEqual([]);
  });

  it("drops results with no usable position instead of emitting NaN", () => {
    const broken = geoObject({ Point: { pos: "" } });
    const places = parseGeocodeResponse(collection([broken, geoObject()]));
    expect(places).toHaveLength(1);
    expect(places[0].latitude).toBeCloseTo(40.1776, 6);
  });

  it("falls back through area then province when there is no locality", () => {
    const noLocality = geoObject({
      metaDataProperty: {
        GeocoderMetaData: {
          kind: "district",
          text: "Armenia, Kotayk Province",
          Address: {
            Components: [
              { kind: "country", name: "Armenia" },
              { kind: "province", name: "Kotayk" },
            ],
          },
        },
      },
    });
    expect(parseGeocodeResponse(collection([noLocality]))[0].city).toBe("Kotayk");
  });

  it("survives a result with no Address components at all", () => {
    const bare = {
      name: "Armenia",
      Point: { pos: "45.0382 40.0691" },
      metaDataProperty: { GeocoderMetaData: { kind: "country", text: "Armenia" } },
    };
    const [place] = parseGeocodeResponse(collection([bare]));
    expect(place).toMatchObject({
      name: "Armenia",
      formattedAddress: "Armenia",
      city: undefined,
      country: undefined,
      latitude: 40.0691,
      longitude: 45.0382,
    });
  });

  it("preserves result order", () => {
    const second = geoObject({ name: "Second", Point: { pos: "44.52 40.19" } });
    const places = parseGeocodeResponse(collection([geoObject(), second]));
    expect(places.map((p) => p.name)).toEqual(["Republic Square, 1", "Second"]);
  });
});

describe("buildGeocodeUrl", () => {
  it("carries the parameter shape SmartSearch proved out", () => {
    const url = new URL(buildGeocodeUrl({ apiKey: "k", geocode: "Republic Square" }));
    expect(url.origin + url.pathname).toBe("https://geocode-maps.yandex.ru/1.x/");
    expect(url.searchParams.get("apikey")).toBe("k");
    expect(url.searchParams.get("geocode")).toBe("Republic Square");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("lang")).toBe("en_US");
    expect(url.searchParams.get("ll")).toBe("44.5152,40.1872");
    expect(url.searchParams.get("spn")).toBe("2,2");
    expect(url.searchParams.get("rspn")).toBeNull();
  });

  it("sets rspn only when the window is a restriction", () => {
    const url = new URL(
      buildGeocodeUrl({ apiKey: "k", geocode: "x", restrictToSpn: true }),
    );
    expect(url.searchParams.get("rspn")).toBe("1");
  });

  it("prefers a geosuggest uri over free text", () => {
    const url = new URL(
      buildGeocodeUrl({ apiKey: "k", geocode: "ignored", uri: "ymapsbm1://geo?x=1" }),
    );
    expect(url.searchParams.get("uri")).toBe("ymapsbm1://geo?x=1");
    expect(url.searchParams.get("geocode")).toBeNull();
  });

  it("escapes the query rather than splicing it in", () => {
    const url = buildGeocodeUrl({ apiKey: "a b&c", geocode: "Հանրապետության հրապարակ" });
    expect(url).not.toContain(" ");
    expect(new URL(url).searchParams.get("apikey")).toBe("a b&c");
    expect(new URL(url).searchParams.get("geocode")).toBe("Հանրապետության հրապարակ");
  });

  it("biases around a caller-supplied centre, longitude first", () => {
    const url = new URL(
      buildGeocodeUrl({ apiKey: "k", geocode: "x", ll: { lat: 34.0522, lng: -118.2437 } }),
    );
    expect(url.searchParams.get("ll")).toBe("-118.2437,34.0522");
  });
});

describe("geocode", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns [] without a key, and makes no request", async () => {
    const fetchImpl = vi.fn();
    expect(await geocode({ apiKey: "", geocode: "x" }, fetchImpl as never)).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("parses a successful response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => collection([geoObject()]),
    });
    const places = await geocode({ apiKey: "k", geocode: "x" }, fetchImpl as never);
    expect(places).toHaveLength(1);
    expect(places[0].latitude).toBeCloseTo(40.1776, 6);
  });

  it("swallows a rejected key", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    expect(await geocode({ apiKey: "k", geocode: "x" }, fetchImpl as never)).toEqual([]);
  });

  it("swallows a network failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await geocode({ apiKey: "k", geocode: "x" }, fetchImpl as never)).toEqual([]);
  });
});

describe("geosuggestFullText", () => {
  it("joins title and subtitle", () => {
    expect(
      geosuggestFullText({ title: { text: "Vazgen Sargsyan St" }, subtitle: { text: "Yerevan, Armenia" } }),
    ).toBe("Vazgen Sargsyan St, Yerevan, Armenia");
  });

  it("copes with either half missing", () => {
    expect(geosuggestFullText({ title: { text: "Yerevan" } })).toBe("Yerevan");
    expect(geosuggestFullText({ subtitle: { text: "Armenia" } })).toBe("Armenia");
    expect(geosuggestFullText({})).toBe("");
  });
});
