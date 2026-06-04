const API = "https://api.postcodes.io";

export type PostcodeLookup = {
  postcode: string;
  outcode: string;
  admin_district?: string;
  parish?: string;
  region?: string;
  country?: string;
  longitude?: number;
  latitude?: number;
};

export type PlaceLookup = {
  code: string;
  name_1: string;
  local_type: string;
  outcode?: string;
  county_unitary?: string;
  district_borough?: string;
  region?: string;
  country?: string;
};

async function get<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API}${path}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.result ?? null;
  } catch {
    return null;
  }
}

export async function autocompletePostcodes(query: string, limit = 10) {
  const cleaned = query.trim().toUpperCase();
  if (cleaned.length < 1) return [];
  const result = await get<string[]>(`/postcodes/${encodeURIComponent(cleaned)}/autocomplete?limit=${limit}`);
  return result || [];
}

export async function lookupPostcode(postcode: string) {
  return get<PostcodeLookup>(`/postcodes/${encodeURIComponent(postcode.trim())}`);
}

export async function searchPlaces(query: string) {
  const cleaned = query.trim();
  if (cleaned.length < 2) return [];
  const result = await get<PlaceLookup[]>(`/places?q=${encodeURIComponent(cleaned)}`);
  return result || [];
}

export function outwardCode(postcode: string) {
  return postcode.trim().toUpperCase().split(/\s+/)[0] || postcode.trim().toUpperCase();
}

export async function locationSuggestions(query: string) {
  const [postcodes, places] = await Promise.all([autocompletePostcodes(query, 12), searchPlaces(query)]);
  const outcodes = [...new Set(postcodes.map(outwardCode))].map((code) => ({
    id: `outcode-${code}`,
    name: code,
    kind: "postcodeDistrict",
    region: "United Kingdom"
  }));
  const placeItems = places.slice(0, 8).map((place) => ({
    id: `place-${place.code}`,
    name: place.name_1,
    kind: place.local_type || "Place",
    region: [place.district_borough, place.region, place.country].filter(Boolean).join(", ")
  }));
  return [...outcodes, ...placeItems].slice(0, 10);
}
