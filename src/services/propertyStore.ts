import type { Property } from "../types/domain";

const PROPERTY_KEY = "hilltro.properties.published";
const DRAFTS_KEY = "hilltro.properties.drafts";

export function loadPublishedProperties(): Property[] {
  return JSON.parse(localStorage.getItem(PROPERTY_KEY) || "[]") as Property[];
}

export function savePublishedProperty(property: Property) {
  const existing = loadPublishedProperties().filter((item) => item.id !== property.id);
  localStorage.setItem(PROPERTY_KEY, JSON.stringify([property, ...existing]));
  window.dispatchEvent(new CustomEvent("hilltro:properties-changed"));
}

export type PropertyDraft = {
  id: string;
  title: string;
  address: string;
  postcode: string;
  bedrooms: string;
  bathrooms: string;
  rent?: string;
  step: number;
  updatedAt: string;
  payload: unknown;
};

export function loadPropertyDrafts(): PropertyDraft[] {
  return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]") as PropertyDraft[];
}

export function savePropertyDraft(draft: PropertyDraft) {
  const existing = loadPropertyDrafts().filter((item) => item.id !== draft.id);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify([draft, ...existing]));
  window.dispatchEvent(new CustomEvent("hilltro:properties-changed"));
}

export function deletePropertyDraft(draftId: string) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(loadPropertyDrafts().filter((draft) => draft.id !== draftId)));
  window.dispatchEvent(new CustomEvent("hilltro:properties-changed"));
}

export function allProperties(base: Property[]) {
  return [...loadPublishedProperties(), ...base.filter((property) => !loadPublishedProperties().some((item) => item.id === property.id))];
}
