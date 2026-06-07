import { demoProperties, QA_LANDLORD_ID } from "./properties";
import { assetUrl } from "../utils/asset";
import type { ApplicantProfile, LandlordProfile } from "../types/domain";

export type ManagedProperty = {
  id: string;
  imageUrl: string;
  address: string;
  rentPcm: number;
  type: string;
  bedrooms: number;
  bathrooms: number;
  status: "LIVE" | "DRAFT" | "INACTIVE";
  gallery: string[];
  floorplanUrl?: string;
  videoUrl?: string;
  completion: {
    requiredFieldsComplete: boolean;
    photosUploaded: boolean;
    nextIncompleteStep: "address" | "details" | "photos" | "valuation";
  };
  metrics: {
    photos: number;
    floorplans: number;
    viewings: number;
    offers: number;
    messages: number;
  };
};

export type PropertyViewing = {
  id: string;
  propertyId: string;
  applicantId: string;
  applicantName: string;
  date: string;
  time: string;
  status: "PENDING" | "UPCOMING" | "COMPLETED" | "CANCELLED" | "DECLINED" | "RESCHEDULE_REQUESTED";
  offerId?: string;
};

export type ApplicantOffer = {
  id: string;
  propertyId: string;
  applicantName: string;
  offerAmount: number;
  moveInDate: string;
  status: "Pending" | "Accepted" | "Expired";
  riskGrade: "A" | "B" | "C";
  affordabilityPcm: number;
  verificationStatus: "Verified" | "In Review";
  employmentSector: string;
  affordabilityAssessment: string;
  referencingStatus: string;
  addressHistorySummary: string;
  offerNotes: string;
  viewingHistory: string;
  tenantPassportSummary: string;
  expiresAt: string;
};

export type InterestEvent = {
  id: string;
  propertyId: string;
  applicantName: string;
  type: "Sent Message" | "Requested Viewing" | "Completed Viewing" | "Cancelled Viewing" | "Follow-up Message";
  occurredAt: string;
  summary: string;
};

const generatedGallery = [
  assetUrl("assets/properties/kensington-apartment.png"),
  assetUrl("assets/properties/chelsea-studio.png"),
  assetUrl("assets/properties/south-kensington-maisonette.png"),
  assetUrl("assets/properties/notting-hill-apartment.png"),
  assetUrl("assets/properties/mayfair-apartment.png"),
  assetUrl("assets/properties/belgravia-maisonette.png"),
  assetUrl("assets/properties/hilltro-luxury-flats-hero.png"),
  assetUrl("assets/properties/hilltro-luxury-house-hero.png")
];

export const landlordProfiles: LandlordProfile[] = [
  {
    id: QA_LANDLORD_ID,
    userId: "demo-landlord-olivia-hart",
    firstName: "Olivia",
    middleName: "",
    lastName: "Hart",
    displayName: "Olivia Hart",
    bio: "Prime Central London landlord focused on well-presented homes and responsive, structured tenancy management.",
    landlordType: "Professional Landlord",
    propertiesCount: demoProperties.filter((property) => property.landlordId === QA_LANDLORD_ID).length
  }
];

export const applicantProfiles: ApplicantProfile[] = [
  { id: "app-taylor", name: "Taylor", referencingStatus: "Verified", affordabilityPcm: 5678, employmentStatus: "Employed, finance", moveDate: "2026-09-05", occupants: "1", pets: "No" },
  { id: "app-jasmine", name: "Jasmine", referencingStatus: "Verified", affordabilityPcm: 4513, employmentStatus: "Employed, marketing", moveDate: "2026-09-05", occupants: "1", pets: "No" },
  { id: "app-chris-emma", name: "Chris & Emma", referencingStatus: "Verified", affordabilityPcm: 6166, employmentStatus: "Joint application", moveDate: "2026-09-15", occupants: "3", pets: "No" },
  { id: "app-morgan", name: "Morgan", referencingStatus: "In Review", affordabilityPcm: 3000, employmentStatus: "Employed, technology", moveDate: "2026-08-20", occupants: "1", pets: "No" },
  { id: "app-sam", name: "Sam", referencingStatus: "Verified", affordabilityPcm: 3400, employmentStatus: "Employed", moveDate: "2026-09-01", occupants: "1", pets: "Cat" }
];

export const managedProperties: ManagedProperty[] = demoProperties.map((property, index) => ({
  id: property.id,
  imageUrl: property.imageUrl,
  address: `${index + 18} ${property.streetName}, ${property.area}, ${property.city} ${property.postcodeDistrict}`,
  rentPcm: property.rentPcm,
  type: property.type,
  bedrooms: property.bedrooms,
  bathrooms: property.bathrooms,
  status: "LIVE",
  gallery: [property.imageUrl, ...generatedGallery.filter((image) => image !== property.imageUrl)].slice(0, 4 + (index % 2)),
  floorplanUrl: property.floorplanUrl,
  videoUrl: property.videoUrl,
  completion: {
    requiredFieldsComplete: true,
    photosUploaded: true,
    nextIncompleteStep: "valuation"
  },
  metrics: {
    photos: Math.min(6, 1 + (property.imageUrls?.length || 0)),
    floorplans: property.floorplanUrl ? 1 : 0,
    viewings: 0,
    offers: 0,
    messages: 0
  }
}));

export const propertyViewings: PropertyViewing[] = [
  { id: "view-1", propertyId: managedProperties[0].id, applicantId: "app-taylor", applicantName: "Taylor", date: "2026-09-04", time: "10:30", status: "PENDING" },
  { id: "view-2", propertyId: managedProperties[0].id, applicantId: "app-jasmine", applicantName: "Jasmine", date: "2026-09-06", time: "14:00", status: "PENDING" },
  { id: "view-3", propertyId: managedProperties[0].id, applicantId: "app-chris-emma", applicantName: "Chris & Emma", date: "2026-05-28", time: "18:00", status: "COMPLETED", offerId: "offer-chris-emma" },
  { id: "view-4", propertyId: managedProperties[0].id, applicantId: "app-morgan", applicantName: "Morgan", date: "2026-05-20", time: "12:30", status: "COMPLETED" },
  { id: "view-5", propertyId: managedProperties[0].id, applicantId: "app-sam", applicantName: "Sam", date: "2026-05-21", time: "09:30", status: "CANCELLED" },
  ...managedProperties.slice(1).flatMap((property, index) => [
    { id: `view-${property.id}-upcoming`, propertyId: property.id, applicantId: "app-taylor", applicantName: `Applicant ${index + 1}`, date: "2026-09-10", time: "11:00", status: "PENDING" as const },
    { id: `view-${property.id}-completed`, propertyId: property.id, applicantId: "app-jasmine", applicantName: `Verified renter ${index + 1}`, date: "2026-05-24", time: "16:00", status: "COMPLETED" as const }
  ])
];

const now = Date.now();

export const applicantOffers: ApplicantOffer[] = [
  {
    id: "offer-taylor",
    propertyId: managedProperties[0].id,
    applicantName: "Taylor",
    offerAmount: 4400,
    moveInDate: "2026-09-05",
    status: "Pending",
    riskGrade: "B",
    affordabilityPcm: 5678,
    verificationStatus: "Verified",
    employmentSector: "Finance",
    affordabilityAssessment: "Up to £5,678 pcm, verified through Open Banking income checks.",
    referencingStatus: "Complete: identity, address history, employment and credit checks passed.",
    addressHistorySummary: "3 years at current address, previous address history supplied and verified.",
    offerNotes: "No additional requests. Ready to sign APT immediately after acceptance.",
    viewingHistory: "Viewed once, attended on time, asked for tenancy start date confirmation.",
    tenantPassportSummary: "Verified tenant passport with stable employment and no undisclosed adverse markers.",
    expiresAt: new Date(now + 72 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "offer-jasmine",
    propertyId: managedProperties[0].id,
    applicantName: "Jasmine",
    offerAmount: 4495,
    moveInDate: "2026-09-05",
    status: "Pending",
    riskGrade: "B",
    affordabilityPcm: 4513,
    verificationStatus: "Verified",
    employmentSector: "Marketing",
    affordabilityAssessment: "Up to £4,513 pcm, slightly close to asking rent but supported by savings evidence.",
    referencingStatus: "Complete: employer reference and identity checks passed.",
    addressHistorySummary: "2 years current address, landlord reference returned clean.",
    offerNotes: "Flexible move-in and happy to proceed on Hilltro recommended terms.",
    viewingHistory: "Viewed twice and requested confirmation on furnishing inventory.",
    tenantPassportSummary: "Verified profile, good income consistency, medium affordability headroom.",
    expiresAt: new Date(now + 23 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "offer-chris-emma",
    propertyId: managedProperties[0].id,
    applicantName: "Chris & Emma",
    offerAmount: 4550,
    moveInDate: "2026-09-15",
    status: "Pending",
    riskGrade: "A",
    affordabilityPcm: 6166,
    verificationStatus: "Verified",
    employmentSector: "Insurance & Education",
    affordabilityAssessment: "Up to £6,166 pcm, strongest affordability coverage in this offer set.",
    referencingStatus: "Complete: joint application, both applicants verified.",
    addressHistorySummary: "Current and prior addresses supplied for both applicants, no gaps.",
    offerNotes: "One child. No pets. Requesting confirmation on broadband provider.",
    viewingHistory: "Viewed once, submitted offer within 2 hours of viewing.",
    tenantPassportSummary: "Very strong joint affordability and referencing profile, full rent offer and low operational friction.",
    expiresAt: new Date(now + 15 * 60 * 1000).toISOString()
  },
  {
    id: "offer-expired",
    propertyId: managedProperties[1].id,
    applicantName: "Morgan",
    offerAmount: 2650,
    moveInDate: "2026-08-20",
    status: "Expired",
    riskGrade: "C",
    affordabilityPcm: 3000,
    verificationStatus: "In Review",
    employmentSector: "Technology",
    affordabilityAssessment: "Up to £3,000 pcm, pending final employer confirmation.",
    referencingStatus: "In review: employer response outstanding.",
    addressHistorySummary: "Address history complete, one landlord reference pending.",
    offerNotes: "Requested parking clarification before committing.",
    viewingHistory: "Requested a second viewing but did not confirm the slot.",
    tenantPassportSummary: "Referencing profile incomplete. Applicant needs to resubmit offer after verification refresh.",
    expiresAt: new Date(now - 60 * 60 * 1000).toISOString()
  }
];

export const interestEvents: InterestEvent[] = [
  { id: "interest-1", propertyId: managedProperties[0].id, applicantName: "Taylor", type: "Sent Message", occurredAt: "2026-06-01T09:30:00.000Z", summary: "Asked whether the property can be let furnished." },
  { id: "interest-2", propertyId: managedProperties[0].id, applicantName: "Jasmine", type: "Requested Viewing", occurredAt: "2026-06-01T10:15:00.000Z", summary: "Requested Saturday afternoon viewing." },
  { id: "interest-3", propertyId: managedProperties[0].id, applicantName: "Chris & Emma", type: "Completed Viewing", occurredAt: "2026-05-28T18:00:00.000Z", summary: "Completed viewing and submitted offer." },
  { id: "interest-4", propertyId: managedProperties[0].id, applicantName: "Sam", type: "Cancelled Viewing", occurredAt: "2026-05-21T09:30:00.000Z", summary: "Cancelled due to work conflict." },
  { id: "interest-5", propertyId: managedProperties[0].id, applicantName: "Morgan", type: "Follow-up Message", occurredAt: "2026-05-29T12:45:00.000Z", summary: "Asked whether a later move-in date would be considered." }
];

export function landlordStats() {
  const propertiesListed = demoProperties.filter((property) => property.landlordId === QA_LANDLORD_ID && property.status === "LIVE").length;
  const viewingRequests = propertyViewings.filter((viewing) => ["PENDING", "UPCOMING", "RESCHEDULE_REQUESTED"].includes(viewing.status)).length;
  const offers = applicantOffers.filter((offer) => offer.status === "Pending").length;
  const messages = interestEvents.filter((event) => event.type === "Sent Message" || event.type === "Follow-up Message").length;
  const deals = applicantOffers.filter((offer) => offer.status === "Accepted").length;
  return { propertiesListed, viewingRequests, offers, messages, deals };
}

export function propertyAddress(propertyId?: string) {
  return managedProperties.find((property) => property.id === propertyId)?.address || "this property";
}

export function applicantById(applicantId?: string) {
  return applicantProfiles.find((applicant) => applicant.id === applicantId);
}

export function landlordById(landlordId = QA_LANDLORD_ID) {
  return landlordProfiles.find((landlord) => landlord.id === landlordId) || landlordProfiles[0];
}
