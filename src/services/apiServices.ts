import type { Conversation, Property, ReferencingStep, TenantPassport, User } from "../types/domain";
import type { AuthService, MessageService, PhotographerService, PropertyService, SearchFilters } from "./contracts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";
const TOKEN_KEY = "haaste.api.token";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export class ApiAuthService implements AuthService {
  private current: User | null = null;

  async currentUser() {
    return this.current;
  }

  async register(input: { firstName: string; middleName?: string; lastName: string; email: string; password: string; phone: string; role: User["role"] }) {
    const result = await request<{ user: User; token: string }>("/auth/register", { method: "POST", body: JSON.stringify(input) });
    sessionStorage.setItem(TOKEN_KEY, result.token);
    this.current = result.user;
    return result.user;
  }

  async login(email: string, password: string) {
    const result = await request<{ user: User; token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    sessionStorage.setItem(TOKEN_KEY, result.token);
    this.current = result.user;
    return result.user;
  }

  async logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    this.current = null;
  }
}

export class ApiPropertyService implements PropertyService {
  async search(filters: SearchFilters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") params.set(key, String(value));
    });
    return request<Property[]>(`/properties?${params.toString()}`);
  }

  async getProperty(id: string) {
    return request<Property>(`/properties/${id}`);
  }

  async saveProperty(propertyId: string) {
    await request(`/saved-properties`, { method: "POST", body: JSON.stringify({ propertyId }) });
  }

  async createPropertyDraft(input: Partial<Property>) {
    return request<Property>("/property-drafts", { method: "POST", body: JSON.stringify(input) });
  }

  async publishProperty(propertyId: string) {
    await request(`/properties/${propertyId}/publish`, { method: "POST" });
  }
}

export class ApiMessageService implements MessageService {
  async conversations() {
    return request<Conversation[]>("/conversations");
  }

  async sendMessage(conversationId: string, body: string, attachmentUrl?: string) {
    await request(`/conversations/${conversationId}/messages`, { method: "POST", body: JSON.stringify({ body, attachmentUrl }) });
  }
}

export class ApiReferencingService {
  async steps(): Promise<ReferencingStep[]> {
    return request<ReferencingStep[]>("/referencing/steps");
  }

  async completeStep(stepId: string) {
    await request(`/referencing/steps/${stepId}/complete`, { method: "POST" });
  }

  async tenantPassport(): Promise<TenantPassport> {
    return request<TenantPassport>("/tenant-passport");
  }
}

export class ApiPhotographerService implements PhotographerService {
  async request(input: { propertyAddress: string; contactName: string; phone: string; email: string; preferredDates: string; notes?: string }) {
    await request("/photography-requests", { method: "POST", body: JSON.stringify(input) });
  }
}
