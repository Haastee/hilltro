export type NameParts = {
  firstName: string;
  middleName?: string;
  lastName: string;
};

export function displayName(input: Partial<NameParts> & { name?: string }) {
  const composed = [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" ").trim();
  return composed || input.name || "";
}

export function splitDisplayName(name = ""): NameParts {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : parts[0] || ""
  };
}

export function firstNameForGreeting(user: { firstName?: string; name?: string }) {
  return user.firstName || splitDisplayName(user.name).firstName || "there";
}
