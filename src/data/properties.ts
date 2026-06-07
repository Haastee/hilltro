import type { Property } from "../types/domain";
import { assetUrl } from "../utils/asset";

export const QA_LANDLORD_ID = "landlord-qa-olivia-hart";

export const primeCentralListings: Property[] = [
  {
    id: "pcl-1",
    title: "Kensington Palace Gardens apartment",
    streetName: "Kensington Palace Gardens",
    area: "Kensington",
    city: "London",
    postcodeDistrict: "W8",
    fullAddress: "6 Kensington Palace Gardens, Kensington, London W8 4QP",
    postcode: "W8 4QP",
    type: "Flat",
    bedrooms: 1,
    bathrooms: 1,
    rentPcm: 2500,
    availableFrom: "2026-07-12",
    furnishingStatus: "Furnished",
    description: "A compact furnished apartment moments from Kensington Gardens, arranged for efficient city living with secure entry and strong transport access.",
    imageUrl: assetUrl("assets/properties/kensington-apartment.png"),
    imageUrls: [
      assetUrl("assets/properties/kensington-apartment.png"),
      assetUrl("assets/properties/chelsea-studio.png"),
      assetUrl("assets/properties/south-kensington-maisonette.png"),
      assetUrl("assets/properties/notting-hill-apartment.png")
    ],
    floorplanUrl: assetUrl("assets/floorplans/hilltro-floorplan.svg"),
    videoUrl: assetUrl("assets/videos/kensington-walkthrough-muted.mp4"),
    videoProvider: "Uploaded video",
    videoThumbnailUrl: assetUrl("assets/videos/kensington-walkthrough-thumb.jpg"),
    features: ["Lift access", "Portered building", "Close to Hyde Park"],
    latitude: 51.5076,
    longitude: -0.1904,
    status: "LIVE",
    verifiedEnquiriesOnly: true
  },
  {
    id: "pcl-2",
    title: "Chelsea studio near Sloane Square",
    streetName: "Sloane Gardens",
    area: "Chelsea",
    city: "London",
    postcodeDistrict: "SW3",
    fullAddress: "18 Sloane Gardens, Chelsea, London SW3 2NQ",
    postcode: "SW3 2NQ",
    type: "Flat",
    bedrooms: 1,
    bathrooms: 1,
    rentPcm: 2250,
    availableFrom: "2026-07-18",
    furnishingStatus: "Furnished",
    description: "A bright studio apartment positioned close to Sloane Square, with considered storage, a separate kitchen area and a polished neutral finish.",
    imageUrl: assetUrl("assets/properties/chelsea-studio.png"),
    features: ["Sloane Square nearby", "Period conversion", "Furnished"],
    latitude: 51.4932,
    longitude: -0.1572,
    status: "LIVE",
    verifiedEnquiriesOnly: true
  },
  {
    id: "pcl-3",
    title: "South Kensington garden maisonette",
    streetName: "Onslow Gardens",
    area: "South Kensington",
    city: "London",
    postcodeDistrict: "SW7",
    fullAddress: "44 Onslow Gardens, South Kensington, London SW7 3PY",
    postcode: "SW7 3PY",
    type: "Maisonette",
    bedrooms: 2,
    bathrooms: 2,
    rentPcm: 4250,
    availableFrom: "2026-08-01",
    furnishingStatus: "Part Furnished",
    description: "A two-bedroom maisonette with direct garden access, generous reception space and calm interiors suited to longer-term central London living.",
    imageUrl: assetUrl("assets/properties/south-kensington-maisonette.png"),
    features: ["Private garden", "Two bathrooms", "Lower ground and raised ground"],
    latitude: 51.4937,
    longitude: -0.1791,
    status: "LIVE",
    verifiedEnquiriesOnly: true
  },
  {
    id: "pcl-4",
    title: "Notting Hill lateral apartment",
    streetName: "Lansdowne Crescent",
    area: "Notting Hill",
    city: "London",
    postcodeDistrict: "W11",
    fullAddress: "12 Lansdowne Crescent, Notting Hill, London W11 2NH",
    postcode: "W11 2NH",
    type: "Flat",
    bedrooms: 2,
    bathrooms: 2,
    rentPcm: 5750,
    availableFrom: "2026-07-25",
    furnishingStatus: "Furnished",
    description: "A refined lateral apartment on a handsome crescent, combining high ceilings, open-plan living and excellent access to Holland Park.",
    imageUrl: assetUrl("assets/properties/notting-hill-apartment.png"),
    features: ["Lateral layout", "High ceilings", "Share of garden access"],
    latitude: 51.5095,
    longitude: -0.2049,
    status: "LIVE",
    verifiedEnquiriesOnly: true
  },
  {
    id: "pcl-5",
    title: "Mayfair apartment off Grosvenor Square",
    streetName: "Upper Brook Street",
    area: "Mayfair",
    city: "London",
    postcodeDistrict: "W1K",
    fullAddress: "30 Upper Brook Street, Mayfair, London W1K 7QD",
    postcode: "W1K 7QD",
    type: "Flat",
    bedrooms: 2,
    bathrooms: 2,
    rentPcm: 7250,
    availableFrom: "2026-08-09",
    furnishingStatus: "Furnished",
    description: "A quietly luxurious apartment close to Grosvenor Square, with concierge access, balanced reception space and a calm contemporary palette.",
    imageUrl: assetUrl("assets/properties/mayfair-apartment.png"),
    features: ["Concierge", "Principal suite", "Air cooling"],
    latitude: 51.5124,
    longitude: -0.1507,
    status: "LIVE",
    verifiedEnquiriesOnly: true
  },
  {
    id: "pcl-6",
    title: "Marylebone mansion block apartment",
    streetName: "Harley Street",
    area: "Marylebone",
    city: "London",
    postcodeDistrict: "W1G",
    fullAddress: "86 Harley Street, Marylebone, London W1G 7HP",
    postcode: "W1G 7HP",
    type: "Flat",
    bedrooms: 3,
    bathrooms: 2,
    rentPcm: 8950,
    availableFrom: "2026-08-15",
    furnishingStatus: "Unfurnished",
    description: "A generous mansion block apartment with three bedrooms, a separate study and elegant proportions close to Regent's Park and Marylebone High Street.",
    imageUrl: assetUrl("assets/properties/chelsea-studio.png"),
    features: ["Separate study", "Mansion block", "Resident lift"],
    latitude: 51.5204,
    longitude: -0.1483,
    status: "LIVE",
    verifiedEnquiriesOnly: true
  },
  {
    id: "pcl-7",
    title: "Belgravia townhouse apartment",
    streetName: "Eaton Place",
    area: "Belgravia",
    city: "London",
    postcodeDistrict: "SW1X",
    fullAddress: "65 Eaton Place, Belgravia, London SW1X 8DF",
    postcode: "SW1X 8DF",
    type: "Maisonette",
    bedrooms: 3,
    bathrooms: 3,
    rentPcm: 12000,
    availableFrom: "2026-09-01",
    furnishingStatus: "Furnished",
    description: "An elegant three-bedroom maisonette in a classic Belgravia townhouse, offering formal reception space and a high-quality specification throughout.",
    imageUrl: assetUrl("assets/properties/belgravia-maisonette.png"),
    features: ["Three suites", "Formal reception", "Private entrance"],
    latitude: 51.4979,
    longitude: -0.1565,
    status: "LIVE",
    verifiedEnquiriesOnly: true
  },
  {
    id: "pcl-8",
    title: "Knightsbridge penthouse with terrace",
    streetName: "Brompton Road",
    area: "Knightsbridge",
    city: "London",
    postcodeDistrict: "SW3",
    fullAddress: "201 Brompton Road, Knightsbridge, London SW3 1LA",
    postcode: "SW3 1LA",
    type: "Penthouse",
    bedrooms: 3,
    bathrooms: 3,
    rentPcm: 15500,
    availableFrom: "2026-08-28",
    furnishingStatus: "Furnished",
    description: "A high-floor penthouse with private terrace, expansive living space and skyline views, positioned for Harrods and South Kensington.",
    imageUrl: assetUrl("assets/properties/notting-hill-apartment.png"),
    features: ["Private terrace", "Lift", "Secure underground parking"],
    latitude: 51.4991,
    longitude: -0.1663,
    status: "LIVE",
    verifiedEnquiriesOnly: true
  },
  {
    id: "pcl-9",
    title: "Holland Park family house",
    streetName: "Ilchester Place",
    area: "Holland Park",
    city: "London",
    postcodeDistrict: "W14",
    fullAddress: "9 Ilchester Place, Holland Park, London W14 8AA",
    postcode: "W14 8AA",
    type: "House",
    bedrooms: 4,
    bathrooms: 4,
    rentPcm: 19500,
    availableFrom: "2026-09-12",
    furnishingStatus: "Unfurnished",
    description: "A substantial family house on one of Holland Park's best-regarded streets, with generous entertaining space, garden and staff accommodation.",
    imageUrl: assetUrl("assets/properties/belgravia-maisonette.png"),
    features: ["Private garden", "Four bathrooms", "Family kitchen"],
    latitude: 51.5017,
    longitude: -0.2048,
    status: "LIVE",
    verifiedEnquiriesOnly: true
  },
  {
    id: "pcl-10",
    title: "Mayfair penthouse residence",
    streetName: "Park Lane",
    area: "Mayfair",
    city: "London",
    postcodeDistrict: "W1K",
    fullAddress: "100 Park Lane, Mayfair, London W1K 7AR",
    postcode: "W1K 7AR",
    type: "Penthouse",
    bedrooms: 4,
    bathrooms: 4,
    rentPcm: 25000,
    availableFrom: "2026-09-20",
    furnishingStatus: "Furnished",
    description: "A landmark penthouse residence with park views, extensive lateral space, concierge services and a specification suited to premium long-term letting.",
    imageUrl: assetUrl("assets/properties/notting-hill-apartment.png"),
    features: ["Hyde Park views", "Concierge", "Multiple reception rooms"],
    latitude: 51.5088,
    longitude: -0.1547,
    status: "LIVE",
    verifiedEnquiriesOnly: true
  }
];

const cities = [
  ["London", ["Kensington", "Camden", "Richmond", "Islington", "Greenwich", "Hackney"], ["W8", "NW1", "TW9", "N1", "SE10", "E8"], 1850, assetUrl("assets/properties/london-apartment-photo.png"), 51.5076, -0.1904],
  ["Manchester", ["Ancoats", "Northern Quarter", "Deansgate", "Salford Quays"], ["M1", "M4", "M3", "M50"], 1050, assetUrl("assets/properties/manchester-flat-photo.png"), 53.4808, -2.2426],
  ["Birmingham", ["Jewellery Quarter", "Edgbaston", "Moseley", "Digbeth"], ["B1", "B15", "B13", "B5"], 950, assetUrl("assets/properties/birmingham-townhouse-photo.png"), 52.4862, -1.8904],
  ["Bristol", ["Clifton", "Redland", "Harbourside"], ["BS8", "BS6", "BS1"], 1200, assetUrl("assets/properties/london-apartment-photo.png"), 51.4545, -2.5879],
  ["Leeds", ["Headingley", "Chapel Allerton", "City Centre"], ["LS6", "LS7", "LS1"], 900, assetUrl("assets/properties/manchester-flat-photo.png"), 53.8008, -1.5491],
  ["Bath", ["Lansdown", "Widcombe", "Oldfield Park"], ["BA1", "BA2", "BA2"], 1300, assetUrl("assets/properties/birmingham-townhouse-photo.png"), 51.3758, -2.3599]
] as const;

const streets = ["High Street", "Church Road", "Albert Road", "Queen Street", "Station Road", "Park Lane", "King Street", "Victoria Road", "Market Street", "Mill Lane"];
const types = ["Flat", "Penthouse", "House", "Maisonette", "Detached House", "Semi-Detached House", "Terraced House", "Bungalow", "Studio", "Shared Property"];

const generatedProperties: Property[] = Array.from({ length: 100 }, (_, index) => {
  const [city, areas, districts, baseRent, imageUrl, baseLat, baseLng] = cities[index % cities.length];
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
    features: [`${area} location`, bedrooms > 2 ? "Family layout" : "Efficient layout", index % 2 === 0 ? "Managed building" : "Private entrance"],
    latitude: baseLat + ((index % 7) - 3) * 0.006,
    longitude: baseLng + ((index % 9) - 4) * 0.006,
    status: "LIVE",
    verifiedEnquiriesOnly: index % 3 !== 0
  };
});

export const demoProperties: Property[] = primeCentralListings.map((property) => ({ ...property, landlordId: QA_LANDLORD_ID }));

export function localPropertyById(id: string) {
  return demoProperties.find((property) => property.id === id);
}
