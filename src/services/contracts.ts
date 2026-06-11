import type { Conversation, Property, ReferencingStep, TenantPassport, User } from "../types/domain";

export type SearchFilters = {
  location?: string;
  maxPrice?: number;
  minPrice?: number;
  bedrooms?: number;
  propertyType?: string;
  radiusMiles?: number;
};

// Registration either signs the user straight in (no email confirmation
// required) or creates the account and waits for the user to confirm via the
// link emailed to them — in which case there is no session yet, so the app must
// NOT pretend the user is logged in.
export type RegisterResult =
  | { status: "active"; user: User }
  | { status: "confirm"; email: string };

export interface AuthService {
  currentUser(): Promise<User | null>;
  register(input: { firstName: string; middleName?: string; lastName: string; email: string; password: string; phone: string; role: User["role"]; profileImage?: File | null }): Promise<RegisterResult>;
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
}

export interface PropertyService {
  search(filters: SearchFilters): Promise<Property[]>;
  getProperty(id: string, approvedViewer?: boolean): Promise<Property | undefined>;
  saveProperty(propertyId: string): Promise<void>;
  createPropertyDraft(input: Partial<Property>): Promise<Property>;
  publishProperty(propertyId: string): Promise<void>;
}

export interface MessageService {
  conversations(): Promise<Conversation[]>;
  sendMessage(conversationId: string, body: string, attachmentUrl?: string): Promise<void>;
}

export interface ReferencingService {
  steps(): Promise<ReferencingStep[]>;
  completeStep(stepId: string): Promise<void>;
  tenantPassport(): Promise<TenantPassport>;
}

export interface PhotographerService {
  request(input: { propertyAddress: string; contactName: string; phone: string; email: string; preferredDates: string; notes?: string }): Promise<void>;
}
