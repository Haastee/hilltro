const EVENTS_KEY = "hilltro.property.engagement";
const SAVED_SEARCH_KEY = "hilltro.saved.searches";
const SAVED_HOMES_KEY = "hilltro.saved.homes";
const PENDING_SEARCH_KEY = "hilltro.pending.saved.search";

export type EngagementEvent = {
  id: string;
  propertyId: string;
  type: "property_view" | "gallery_view" | "video_view";
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
};

export type SavedSearch = {
  id: string;
  name: string;
  filters: Record<string, string>;
  emailAlerts: boolean;
  createdAt: string;
};

export type SavedHome = {
  id: string;
  propertyId: string;
  createdAt: string;
};

export function trackPropertyEngagement(propertyId: string, type: EngagementEvent["type"], metadata?: EngagementEvent["metadata"]) {
  const events = load<EngagementEvent[]>(EVENTS_KEY, []);
  events.unshift({ id: crypto.randomUUID(), propertyId, type, metadata, createdAt: new Date().toISOString() });
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, 500)));
}

export function savedSearches(userId = "guest") {
  return load<SavedSearch[]>(scopedKey(SAVED_SEARCH_KEY, userId), []);
}

export function saveSearch(search: Omit<SavedSearch, "id" | "createdAt">, userId = "guest") {
  const searches = savedSearches(userId);
  const next = { ...search, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  localStorage.setItem(scopedKey(SAVED_SEARCH_KEY, userId), JSON.stringify([next, ...searches]));
  localStorage.removeItem(PENDING_SEARCH_KEY);
  return next;
}

export function savedHomes(userId = "guest") {
  return load<SavedHome[]>(scopedKey(SAVED_HOMES_KEY, userId), []);
}

export function isPropertySaved(propertyId: string, userId = "guest") {
  return savedHomes(userId).some((item) => item.propertyId === propertyId);
}

export function saveHome(propertyId: string, userId = "guest") {
  const homes = savedHomes(userId).filter((item) => item.propertyId !== propertyId);
  const next = { id: crypto.randomUUID(), propertyId, createdAt: new Date().toISOString() };
  localStorage.setItem(scopedKey(SAVED_HOMES_KEY, userId), JSON.stringify([next, ...homes]));
  return next;
}

export function removeSavedHome(propertyId: string, userId = "guest") {
  localStorage.setItem(scopedKey(SAVED_HOMES_KEY, userId), JSON.stringify(savedHomes(userId).filter((item) => item.propertyId !== propertyId)));
}

export function setPendingSavedSearch(filters: Record<string, string>) {
  localStorage.setItem(PENDING_SEARCH_KEY, JSON.stringify(filters));
}

export function readPendingSavedSearch() {
  return load<Record<string, string> | null>(PENDING_SEARCH_KEY, null);
}

function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) as T;
  } catch {
    return fallback;
  }
}

function scopedKey(base: string, userId: string) {
  return `${base}.${userId}`;
}
