import type { Property } from "../types/domain";

export type LatLngPoint = { latitude: number; longitude: number };

export function distanceMiles(a: LatLngPoint, b: { latitude?: number; longitude?: number }) {
  if (!b.latitude || !b.longitude) return Number.MAX_SAFE_INTEGER;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

export function locationOrigin(properties: Property[], location: string): LatLngPoint | null {
  const query = location.trim().toLowerCase();
  if (!query) return firstCoordinate(properties);
  const district = query.split(/\s+/)[0];
  const match = properties.find((property) => [property.postcodeDistrict, property.postcode, property.area, property.city].some((value) => value.toLowerCase().startsWith(district)));
  return match?.latitude && match.longitude ? { latitude: match.latitude, longitude: match.longitude } : firstCoordinate(properties);
}

export function filterByRadius(properties: Property[], origin: LatLngPoint | null, radiusMiles: number) {
  if (!origin || radiusMiles <= 0) return properties;
  return properties.filter((property) => distanceMiles(origin, property) <= radiusMiles);
}

export function filterByPolygon(properties: Property[], polygon: LatLngPoint[]) {
  if (polygon.length < 3) return properties;
  return properties.filter((property) => property.latitude && property.longitude && pointInPolygon({ latitude: property.latitude, longitude: property.longitude }, polygon));
}

export function similarProperties(property: Property, properties: Property[]) {
  return properties
    .filter((item) => item.id !== property.id)
    .map((item) => ({
      item,
      distance: property.latitude && property.longitude ? distanceMiles({ latitude: property.latitude, longitude: property.longitude }, item) : Number.MAX_SAFE_INTEGER,
      priceDelta: Math.abs(item.rentPcm - property.rentPcm)
    }))
    .filter(({ item, distance, priceDelta }) => item.bedrooms === property.bedrooms && distance <= 1 && priceDelta <= property.rentPcm * 0.2)
    .sort((a, b) => a.distance - b.distance || a.priceDelta - b.priceDelta)
    .map(({ item }) => item)
    .slice(0, 6);
}

export function firstCoordinate(properties: Property[]): LatLngPoint | null {
  const match = properties.find((property) => property.latitude && property.longitude);
  return match?.latitude && match.longitude ? { latitude: match.latitude, longitude: match.longitude } : null;
}

function pointInPolygon(point: LatLngPoint, polygon: LatLngPoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    const intersect = yi > point.latitude !== yj > point.latitude && point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
