export type Role = "TENANT" | "LANDLORD";

export type User = {
  id: string;
  name: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  role: Role;
  phone?: string;
  profileImageUrl?: string;
};

export type Property = {
  id: string;
  title: string;
  streetName: string;
  area: string;
  city: string;
  postcodeDistrict: string;
  fullAddress: string;
  postcode: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  rentPcm: number;
  availableFrom: string;
  furnishingStatus: string;
  description: string;
  imageUrl: string;
  imageUrls?: string[];
  floorplanUrl?: string;
  videoUrl?: string;
  videoProvider?: string;
  videoThumbnailUrl?: string;
  features?: string[];
  floorLevel?: string;
  hasLift?: boolean;
  epcRating?: string;
  epcExempt?: boolean;
  epcCertificateUrl?: string;
  epcCertificateName?: string;
  latitude?: number;
  longitude?: number;
  status: "DRAFT" | "REVIEW" | "LIVE" | "LET";
  verifiedEnquiriesOnly: boolean;
  slightlyAboveBudget?: boolean;
  landlordId?: string;
  landlordFirstName?: string;
  landlordAvatarUrl?: string;
  landlordType?: "Private Landlord" | "Professional Landlord";
  landlordLiveListingCount?: number;
};

export type Conversation = {
  id: string;
  subject: string;
  unreadCount: number;
  propertyId?: string;
  landlordId?: string;
  applicantId?: string;
  messages: Message[];
};

export type LandlordProfile = {
  id: string;
  userId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  displayName: string;
  profilePhotoUrl?: string;
  bio?: string;
  landlordType: "Private Landlord" | "Professional Landlord";
  propertiesCount: number;
};

export type ApplicantProfile = {
  id: string;
  name: string;
  profileImageUrl?: string;
  affordabilityPcm?: number;
  referencingStatus: string;
  employmentStatus: string;
  moveDate?: string;
  occupants?: string;
  pets?: string;
};

export type Message = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt?: string;
  attachmentUrl?: string;
};

export type ReferencingStep = {
  id: string;
  title: string;
  description: string;
  status: "complete" | "current" | "locked";
};

export type TenantPassport = {
  verificationStatus: string;
  affordabilityPcm: number;
  riskGrade: string;
  employmentSector: string;
  completionDate: string;
};
