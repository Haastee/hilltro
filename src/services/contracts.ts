import type { Conversation, Property, ReferencingStep, TenantPassport, User } from "../types/domain";

export type SearchFilters = {
  location?: string;
  maxPrice?: number;
  minPrice?: number;
  bedrooms?: number;
  propertyType?: string;
};

export interface AuthService {
  currentUser(): Promise<User | null>;
  register(input: { firstName: string; middleName?: string; lastName: string; email: string; password: string; phone: string; role: User["role"] }): Promise<User>;
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
