export type LocationKind =
  | "city"
  | "town"
  | "borough"
  | "area"
  | "neighbourhood"
  | "postcodeDistrict";

export type UkLocation = {
  id: string;
  name: string;
  kind: LocationKind;
  country: "England" | "Scotland" | "Wales" | "Northern Ireland";
  region: string;
  parent?: string;
  aliases?: string[];
};

const placeLocations: UkLocation[] = [
  { id: "city-london", name: "London", kind: "city", country: "England", region: "Greater London", aliases: ["Greater London"] },
  { id: "borough-city-of-london", name: "City of London", kind: "borough", country: "England", region: "Greater London", parent: "London" },
  { id: "borough-kensington-chelsea", name: "Kensington and Chelsea", kind: "borough", country: "England", region: "Greater London", parent: "London", aliases: ["Royal Borough of Kensington and Chelsea"] },
  { id: "area-kensington", name: "Kensington", kind: "area", country: "England", region: "Greater London", parent: "Kensington and Chelsea" },
  { id: "area-chelsea", name: "Chelsea", kind: "area", country: "England", region: "Greater London", parent: "Kensington and Chelsea" },
  { id: "area-notting-hill", name: "Notting Hill", kind: "area", country: "England", region: "Greater London", parent: "Kensington and Chelsea" },
  { id: "borough-camden", name: "Camden", kind: "borough", country: "England", region: "Greater London", parent: "London" },
  { id: "area-islington", name: "Islington", kind: "area", country: "England", region: "Greater London", parent: "London" },
  { id: "area-richmond", name: "Richmond", kind: "area", country: "England", region: "Greater London", parent: "London" },
  { id: "area-greenwich", name: "Greenwich", kind: "area", country: "England", region: "Greater London", parent: "London" },
  { id: "area-hackney", name: "Hackney", kind: "area", country: "England", region: "Greater London", parent: "London" },
  { id: "city-manchester", name: "Manchester", kind: "city", country: "England", region: "Greater Manchester" },
  { id: "area-ancoats", name: "Ancoats", kind: "neighbourhood", country: "England", region: "Greater Manchester", parent: "Manchester" },
  { id: "area-northern-quarter", name: "Northern Quarter", kind: "neighbourhood", country: "England", region: "Greater Manchester", parent: "Manchester" },
  { id: "area-deansgate", name: "Deansgate", kind: "neighbourhood", country: "England", region: "Greater Manchester", parent: "Manchester" },
  { id: "town-salford", name: "Salford", kind: "town", country: "England", region: "Greater Manchester" },
  { id: "area-salford-quays", name: "Salford Quays", kind: "area", country: "England", region: "Greater Manchester", parent: "Salford" },
  { id: "city-birmingham", name: "Birmingham", kind: "city", country: "England", region: "West Midlands" },
  { id: "area-jewellery-quarter", name: "Jewellery Quarter", kind: "area", country: "England", region: "West Midlands", parent: "Birmingham" },
  { id: "area-edgbaston", name: "Edgbaston", kind: "area", country: "England", region: "West Midlands", parent: "Birmingham" },
  { id: "area-moseley", name: "Moseley", kind: "area", country: "England", region: "West Midlands", parent: "Birmingham" },
  { id: "city-liverpool", name: "Liverpool", kind: "city", country: "England", region: "Merseyside" },
  { id: "city-leeds", name: "Leeds", kind: "city", country: "England", region: "West Yorkshire" },
  { id: "area-headingley", name: "Headingley", kind: "area", country: "England", region: "West Yorkshire", parent: "Leeds" },
  { id: "city-bristol", name: "Bristol", kind: "city", country: "England", region: "South West England" },
  { id: "area-clifton", name: "Clifton", kind: "area", country: "England", region: "South West England", parent: "Bristol" },
  { id: "city-bath", name: "Bath", kind: "city", country: "England", region: "Somerset" },
  { id: "city-edinburgh", name: "Edinburgh", kind: "city", country: "Scotland", region: "Lothian" },
  { id: "city-glasgow", name: "Glasgow", kind: "city", country: "Scotland", region: "Glasgow City" },
  { id: "city-cardiff", name: "Cardiff", kind: "city", country: "Wales", region: "South Wales" },
  { id: "city-swansea", name: "Swansea", kind: "city", country: "Wales", region: "South Wales" },
  { id: "city-belfast", name: "Belfast", kind: "city", country: "Northern Ireland", region: "County Antrim" },
  { id: "city-londonderry", name: "Londonderry", kind: "city", country: "Northern Ireland", region: "County Londonderry", aliases: ["Derry"] }
];

const postcodeDistricts = [
  "W2", "W4", "W8", "W11", "W14", "SW1", "SW1A", "SW3", "SW7", "SW10",
  "NW1", "NW3", "N1", "N5", "TW9", "SE1", "SE10", "E1", "E8", "E14",
  "M1", "M2", "M3", "M4", "M20", "M50", "B1", "B5", "B13", "B15",
  "L1", "L2", "L8", "LS1", "LS6", "LS7", "BS1", "BS6", "BS8",
  "BA1", "BA2", "EH1", "EH3", "G1", "G12", "CF10", "CF11", "SA1", "BT1", "BT7"
];

const postcodeLocations: UkLocation[] = postcodeDistricts.map((district) => {
  const country: UkLocation["country"] = district.startsWith("EH") || district.startsWith("G")
    ? "Scotland"
    : district.startsWith("CF") || district.startsWith("SA")
      ? "Wales"
      : district.startsWith("BT")
        ? "Northern Ireland"
        : "England";
  const region =
    district.startsWith("M") ? "Greater Manchester" :
    district.startsWith("B") ? "West Midlands" :
    district.startsWith("L") ? "Merseyside" :
    district.startsWith("LS") ? "West Yorkshire" :
    district.startsWith("BS") || district.startsWith("BA") ? "South West England" :
    district.startsWith("EH") ? "Lothian" :
    district.startsWith("G") ? "Glasgow City" :
    district.startsWith("CF") ? "South Wales" :
    district.startsWith("SA") ? "South Wales" :
    district.startsWith("BT") ? "Northern Ireland" :
    "Greater London";

  return { id: `pcd-${district}`, name: district, kind: "postcodeDistrict", country, region };
});

export const ukLocations: UkLocation[] = [...placeLocations, ...postcodeLocations];

const clean = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

export function suggestLocations(query: string, limit = 10) {
  const needle = clean(query);
  if (!needle) return [];
  return ukLocations
    .map((location) => {
      const names = [location.name, ...(location.aliases || [])].map(clean);
      const starts = names.some((name) => name.startsWith(needle));
      const includes = names.some((name) => name.includes(needle));
      return { location, score: starts ? 0 : includes ? 1 : 2 };
    })
    .filter((item) => item.score < 2)
    .sort((a, b) => a.score - b.score || kindPriority(a.location.kind) - kindPriority(b.location.kind) || a.location.name.length - b.location.name.length || a.location.name.localeCompare(b.location.name))
    .slice(0, limit)
    .map((item) => item.location);
}

function kindPriority(kind: LocationKind) {
  return kind === "postcodeDistrict" ? 0 : kind === "city" ? 1 : kind === "borough" ? 2 : 3;
}

export function locationTokens(query: string) {
  const needle = clean(query);
  if (!needle) return [];
  const matches = ukLocations.filter((location) => [location.name, location.parent, location.region, ...(location.aliases || [])].filter(Boolean).some((value) => clean(String(value)).includes(needle) || needle.includes(clean(String(value)))));
  return new Set(matches.flatMap((location) => [location.name, location.parent, location.region, ...(location.aliases || [])].filter(Boolean).map((value) => clean(String(value)))));
}
