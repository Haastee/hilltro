import type { Property } from "../types/domain";
import { assetUrl } from "../utils/asset";

const cities = [
  ["London", ["Kensington", "Camden", "Richmond", "Islington", "Greenwich", "Hackney"], ["W8", "NW1", "TW9", "N1", "SE10", "E8"], 1850, assetUrl("assets/london-apartment-photo.png")],
  ["Manchester", ["Ancoats", "Northern Quarter", "Deansgate", "Salford Quays"], ["M1", "M4", "M3", "M50"], 1050, assetUrl("assets/manchester-flat-photo.png")],
  ["Birmingham", ["Jewellery Quarter", "Edgbaston", "Moseley", "Digbeth"], ["B1", "B15", "B13", "B5"], 950, assetUrl("assets/birmingham-townhouse-photo.png")],
  ["Bristol", ["Clifton", "Redland", "Harbourside"], ["BS8", "BS6", "BS1"], 1200, assetUrl("assets/london-apartment-photo.png")],
  ["Leeds", ["Headingley", "Chapel Allerton", "City Centre"], ["LS6", "LS7", "LS1"], 900, assetUrl("assets/manchester-flat-photo.png")],
  ["Bath", ["Lansdown", "Widcombe", "Oldfield Park"], ["BA1", "BA2", "BA2"], 1300, assetUrl("assets/birmingham-townhouse-photo.png")]
] as const;

const streets = ["High Street", "Church Road", "Albert Road", "Queen Street", "Station Road", "Park Lane", "King Street", "Victoria Road", "Market Street", "Mill Lane"];
const types = ["Flat", "Penthouse", "House", "Maisonette", "Detached House", "Semi-Detached House", "Terraced House", "Bungalow", "Studio"];

export const demoProperties: Property[] = Array.from({ length: 100 }, (_, index) => {
  const [city, areas, districts, baseRent, imageUrl] = cities[index % cities.length];
  const area = areas[index % areas.length];
  const postcodeDistrict = districts[index % districts.length];
  const type = types[index % types.length];
  const bedrooms = type === "Studio" ? 1 : (index % 4) + 1;
  const bathrooms = bedrooms > 2 ? 2 : 1;
  const streetName = streets[index % streets.length];
  const rentPcm = baseRent + bedrooms * 360 + (index % 7) * 85;
  const day = String((index % 25) + 1).padStart(2, "0");
  const month = String((index % 5) + 7).padStart(2, "0");

  return {
    id: `demo-${index + 1}`,
    title: `${area} ${type}`,
    streetName,
    area,
    city,
    postcodeDistrict,
    fullAddress: `${(index % 88) + 2} ${streetName}, ${area}, ${city} ${postcodeDistrict} ${((index % 8) + 1)}AA`,
    postcode: `${postcodeDistrict} ${((index % 8) + 1)}AA`,
    type,
    bedrooms,
    bathrooms,
    rentPcm,
    availableFrom: `2026-${month}-${day}`,
    furnishingStatus: index % 2 === 0 ? "Furnished" : "Unfurnished",
    description: `${bedrooms} bedroom ${type.toLowerCase()} in ${area} with verified ownership, secure rent collection readiness and APT progression.`,
    imageUrl,
    status: "LIVE",
    verifiedEnquiriesOnly: index % 3 !== 0
  };
});
