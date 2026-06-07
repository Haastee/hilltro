import type { Property } from "../types/domain";
import { assetUrl } from "./asset";

export type GalleryItem = {
  id: string;
  kind: "image" | "floorplan" | "video";
  url: string;
  thumbnailUrl: string;
  title: string;
  provider?: string;
};

const fallbackImages = [
  assetUrl("assets/properties/kensington-apartment.png"),
  assetUrl("assets/properties/chelsea-studio.png"),
  assetUrl("assets/properties/south-kensington-maisonette.png"),
  assetUrl("assets/properties/notting-hill-apartment.png"),
  assetUrl("assets/properties/mayfair-apartment.png"),
  assetUrl("assets/properties/belgravia-maisonette.png")
];

const fallbackFloorplan = assetUrl("assets/floorplans/hilltro-floorplan.svg");

export function propertyGallery(property: Property): GalleryItem[] {
  const sourceImages = unique([property.imageUrl, ...(property.imageUrls || [])]).filter(Boolean);
  const seed = hash(property.id);
  const images = [...sourceImages];
  let offset = 0;
  while (images.length < 4) {
    images.push(fallbackImages[(seed + offset) % fallbackImages.length]);
    offset += 1;
  }
  const gallery: GalleryItem[] = images.slice(0, Math.max(4, images.length)).map((url, index) => ({
    id: `${property.id}-image-${index}`,
    kind: "image",
    url,
    thumbnailUrl: url,
    title: index === 0 ? "Main property image" : index === 1 ? "Bedroom image" : index === 2 ? "Kitchen, bathroom or exterior image" : `Property image ${index + 1}`
  }));
  gallery.push({
    id: `${property.id}-floorplan`,
    kind: "floorplan",
    url: property.floorplanUrl || fallbackFloorplan,
    thumbnailUrl: property.floorplanUrl || fallbackFloorplan,
    title: "Floorplan"
  });
  if (property.videoUrl) {
    gallery.push({
      id: `${property.id}-video`,
      kind: "video",
      url: property.videoUrl,
      thumbnailUrl: property.videoThumbnailUrl || images[0],
      title: "Property video tour",
      provider: property.videoProvider
    });
  }
  return gallery;
}

export function videoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }
    if (parsed.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : url;
    }
    return url;
  } catch {
    return url;
  }
}

export function videoProviderName(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("youtube") || host.includes("youtu.be")) return "YouTube";
    if (host.includes("vimeo")) return "Vimeo";
    return "External video";
  } catch {
    return "";
  }
}

export function isSupportedVideoUrl(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ["youtube.com", "youtu.be", "vimeo.com", "wistia.com", "loom.com", "sproutvideo.com"].some((provider) => host === provider || host.endsWith(`.${provider}`));
  } catch {
    return false;
  }
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function hash(value: string) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
}
