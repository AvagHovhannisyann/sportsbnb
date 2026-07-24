/**
 * Direct Google Places API (New) — replaces the connector-gateway.lovable.dev
 * proxy. GOOGLE_MAPS_API_KEY_1 (or GOOGLE_MAPS_API_KEY) must have the Places
 * API enabled in Google Cloud.
 */

export const DEFAULT_PLACE_FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber," +
  "places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount," +
  "places.googleMapsUri,places.regularOpeningHours.weekdayDescriptions,places.location,places.businessStatus";

export interface SearchTextParams {
  textQuery: string;
  fieldMask?: string;
  locationBias?: { circle: { center: { latitude: number; longitude: number }; radius: number } };
  maxResultCount?: number;
}

export function requireGoogleMapsKey(): string {
  const key = Deno.env.get("GOOGLE_MAPS_API_KEY_1") ?? Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  return key;
}

export async function searchPlacesText(params: SearchTextParams, apiKey?: string): Promise<Response> {
  return fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey ?? requireGoogleMapsKey(),
      "X-Goog-FieldMask": params.fieldMask ?? DEFAULT_PLACE_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: params.textQuery,
      ...(params.locationBias ? { locationBias: params.locationBias } : {}),
      ...(params.maxResultCount ? { maxResultCount: params.maxResultCount } : {}),
    }),
  });
}
