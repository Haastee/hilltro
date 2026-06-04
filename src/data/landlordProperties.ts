import { demoProperties } from "./properties";
import { assetUrl } from "../utils/asset";

export type ManagedProperty = {
  id: string;
  imageUrl: string;
  address: string;
  rentPcm: number;
  type: string;
  bedrooms: number;
  status: "LIVE" | "DRAFT" | "INACTIVE";
  gallery: string[];
  floorplanUrl?: string;
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
  applicantName: string;
  date: string;
  time: string;
  status: "UPCOMING" | "COMPLETED" | "CANCELLED";
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

export const managedProperties: ManagedProperty[] = demoProperties.slice(0, 6).map((property, index) => ({
  id: property.id,
  imageUrl: property.imageUrl,
  address: `${index + 18} ${property.streetName}, ${property.area}, ${property.city} ${property.postcodeDistrict}`,
  rentPcm: property.rentPcm,
  type: property.type,
  bedrooms: property.bedrooms,
  status: index === 1 ? "DRAFT" : index === 4 ? "INACTIVE" : "LIVE",
  gallery: [property.imageUrl, assetUrl("assets/riverside-suite.png"), assetUrl("assets/city-loft.png"), assetUrl("assets/garden-mews.png"), assetUrl("assets/studio-court.png")].slice(0, 3 + (index % 3)),
  floorplanUrl: index % 2 === 0 ? assetUrl("assets/hero-product.png") : undefined,
  completion: {
    requiredFieldsComplete: index !== 4,
    photosUploaded: index !== 4,
    nextIncompleteStep: index === 1 ? "details" : index === 4 ? "photos" : "valuation"
  },
  metrics: {
    photos: 8 + index,
    floorplans: index % 2 === 0 ? 1 : 0,
    viewings: 4 + index * 2,
    offers: index === 0 ? 3 : index + 1,
    messages: index + 2
  }
}));

export const propertyViewings: PropertyViewing[] = [
  { id: "view-1", propertyId: managedProperties[0].id, applicantName: "Taylor J.", date: "2026-09-04", time: "10:30", status: "UPCOMING" },
  { id: "view-2", propertyId: managedProperties[0].id, applicantName: "Jasmine C.", date: "2026-09-06", time: "14:00", status: "UPCOMING" },
  { id: "view-3", propertyId: managedProperties[0].id, applicantName: "Chris D. & Emma D. +1", date: "2026-05-28", time: "18:00", status: "COMPLETED", offerId: "offer-chris-emma" },
  { id: "view-4", propertyId: managedProperties[0].id, applicantName: "Morgan P.", date: "2026-05-20", time: "12:30", status: "COMPLETED" },
  { id: "view-5", propertyId: managedProperties[0].id, applicantName: "Sam R.", date: "2026-05-21", time: "09:30", status: "CANCELLED" },
  ...managedProperties.slice(1).flatMap((property, index) => [
    { id: `view-${property.id}-upcoming`, propertyId: property.id, applicantName: `Applicant ${index + 1}`, date: "2026-09-10", time: "11:00", status: "UPCOMING" as const },
    { id: `view-${property.id}-completed`, propertyId: property.id, applicantName: `Verified renter ${index + 1}`, date: "2026-05-24", time: "16:00", status: "COMPLETED" as const }
  ])
];

const now = Date.now();

export const applicantOffers: ApplicantOffer[] = [
  {
    id: "offer-taylor",
    propertyId: managedProperties[0].id,
    applicantName: "Taylor J.",
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
    applicantName: "Jasmine C.",
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
    offerNotes: "Flexible move-in and happy to proceed on Haaste recommended terms.",
    viewingHistory: "Viewed twice and requested confirmation on furnishing inventory.",
    tenantPassportSummary: "Verified profile, good income consistency, medium affordability headroom.",
    expiresAt: new Date(now + 23 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "offer-chris-emma",
    propertyId: managedProperties[0].id,
    applicantName: "Chris D. & Emma D. +1",
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
    tenantPassportSummary: "Very strong joint Tenant Passport, high affordability, full rent offer and low operational risk.",
    expiresAt: new Date(now + 15 * 60 * 1000).toISOString()
  },
  {
    id: "offer-expired",
    propertyId: managedProperties[1].id,
    applicantName: "Morgan P.",
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
    tenantPassportSummary: "Tenant Passport incomplete. Applicant needs to resubmit offer after verification refresh.",
    expiresAt: new Date(now - 60 * 60 * 1000).toISOString()
  }
];

export const interestEvents: InterestEvent[] = [
  { id: "interest-1", propertyId: managedProperties[0].id, applicantName: "Taylor J.", type: "Sent Message", occurredAt: "2026-06-01T09:30:00.000Z", summary: "Asked whether the property can be let furnished." },
  { id: "interest-2", propertyId: managedProperties[0].id, applicantName: "Jasmine C.", type: "Requested Viewing", occurredAt: "2026-06-01T10:15:00.000Z", summary: "Requested Saturday afternoon viewing." },
  { id: "interest-3", propertyId: managedProperties[0].id, applicantName: "Chris D. & Emma D. +1", type: "Completed Viewing", occurredAt: "2026-05-28T18:00:00.000Z", summary: "Completed viewing and submitted offer." },
  { id: "interest-4", propertyId: managedProperties[0].id, applicantName: "Sam R.", type: "Cancelled Viewing", occurredAt: "2026-05-21T09:30:00.000Z", summary: "Cancelled due to work conflict." },
  { id: "interest-5", propertyId: managedProperties[0].id, applicantName: "Morgan P.", type: "Follow-up Message", occurredAt: "2026-05-29T12:45:00.000Z", summary: "Asked whether a later move-in date would be considered." }
];
