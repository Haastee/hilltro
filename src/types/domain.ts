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
  status: "DRAFT" | "REVIEW" | "LIVE" | "LET";
  verifiedEnquiriesOnly: boolean;
  slightlyAboveBudget?: boolean;
};

export type Conversation = {
  id: string;
  subject: string;
  unreadCount: number;
  messages: Message[];
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
