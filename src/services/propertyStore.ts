import type { Property } from "../types/domain";

const PROPERTY_KEY = "haaste.properties.published";

export function loadPublishedProperties(): Property[] {
  return JSON.parse(localStorage.getItem(PROPERTY_KEY) || "[]") as Property[];
}

export function savePublishedProperty(property: Property) {
  const existing = loadPublishedProperties().filter((item) => item.id !== property.id);
  localStorage.setItem(PROPERTY_KEY, JSON.stringify([property, ...existing]));
  window.dispatchEvent(new CustomEvent("haaste:properties-changed"));
}

export function allProperties(base: Property[]) {
  return [...loadPublishedProperties(), ...base.filter((property) => !loadPublishedProperties().some((item) => item.id === property.id))];
}
