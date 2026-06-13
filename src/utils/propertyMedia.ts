import type { Property } from "../types/domain";
import { propertyImagesComingSoon } from "./propertyAssets";

export type GalleryItem = {
  id: string;
  kind: "image" | "floorplan" | "video";
  url: string;
  thumbnailUrl: string;
  title: string;
  provider?: string;
};

export function propertyGallery(property: Property): GalleryItem[] {
  const sourceImages = unique([property.imageUrl, ...(property.imageUrls || [])]).filter(Boolean);
  const images = sourceImages.length ? [...sourceImages] : [propertyImagesComingSoon];
  const gallery: GalleryItem[] = images.slice(0, Math.max(4, images.length)).map((url, index) => ({
    id: `${property.id}-image-${index}`,
    kind: "image",
    url,
    thumbnailUrl: url,
    title: index === 0 ? "Main property image" : index === 1 ? "Bedroom image" : index === 2 ? "Kitchen, bathroom or exterior image" : `Property image ${index + 1}`
  }));
  if (property.floorplanUrl) {
    gallery.push({
      id: `${property.id}-floorplan`,
      kind: "floorplan",
      url: property.floorplanUrl,
      thumbnailUrl: property.floorplanUrl,
      title: "Floorplan"
    });
  }
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
