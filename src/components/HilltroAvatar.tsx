import type { ReactNode } from "react";

type AvatarSize = "sm" | "md" | "lg" | "xl";

export function HilltroAvatar({ name, imageUrl, size = "md", label }: { name: string; imageUrl?: string; size?: AvatarSize; label?: ReactNode }) {
  const initials = initialsFor(name);
  return (
    <span className={`hilltro-avatar ${size}`} aria-label={typeof label === "string" ? label : name}>
      {imageUrl ? <img src={imageUrl} alt="" /> : <span>{initials}</span>}
    </span>
  );
}

export function publicLandlordName(input: { firstName: string }) {
  return input.firstName.trim() || "Hilltro landlord";
}

function initialsFor(name: string) {
  const letters = name
    .replace(/\s+[A-Z]\.(?=\s|$)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .replace(/[^A-Za-z]/g, "");
  return letters || "H";
}
