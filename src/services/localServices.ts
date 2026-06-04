import { demoProperties } from "../data/properties";
import { allProperties } from "./propertyStore";
import type { Conversation, Property, ReferencingStep, TenantPassport, User } from "../types/domain";
import type { AuthService, MessageService, PhotographerService, PropertyService, ReferencingService, SearchFilters } from "./contracts";
import { displayName, splitDisplayName } from "../utils/name";

const SESSION_KEY = "haaste.react.session";
const USERS_KEY = "haaste.react.users";
const CONTACT_BLOCKER = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(\+?\d[\d\s().-]{7,}\d)|(https?:\/\/|www\.)|(@[a-z0-9_]{3,})|(whatsapp|telegram|instagram|facebook|tiktok)/i;

const load = <T>(key: string, fallback: T): T => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) as T;
const save = <T>(key: string, value: T) => localStorage.setItem(key, JSON.stringify(value));

export class LocalAuthService implements AuthService {
  async currentUser() {
    const user = load<User | null>(SESSION_KEY, null);
    return user ? publicLocalUser(user) : null;
  }

  async register(input: { firstName: string; middleName?: string; lastName: string; email: string; password: string; phone: string; role: User["role"] }) {
    const users = load<Array<User & { password: string }>>(USERS_KEY, []);
    if (users.some((user) => user.email === input.email.toLowerCase())) throw new Error("An account already exists for this email.");
    const user = { id: crypto.randomUUID(), name: displayName(input), firstName: input.firstName, middleName: input.middleName || "", lastName: input.lastName, email: input.email.toLowerCase(), phone: input.phone, role: input.role, password: input.password };
    save(USERS_KEY, [...users, user]);
    save(SESSION_KEY, publicLocalUser(user));
    return user;
  }

  async login(email: string, password: string) {
    const user = load<Array<User & { password: string }>>(USERS_KEY, []).find((item) => item.email === email.toLowerCase() && item.password === password);
    if (!user) throw new Error("No account matched those details.");
    const normalised = publicLocalUser(user);
    save(SESSION_KEY, normalised);
    return normalised;
  }

  async logout() {
    localStorage.removeItem(SESSION_KEY);
  }
}

function publicLocalUser(user: User): User {
  const fallback = splitDisplayName(user.name);
  const firstName = user.firstName || fallback.firstName;
  const middleName = user.middleName || fallback.middleName || "";
  const lastName = user.lastName || fallback.lastName || firstName;
  return { id: user.id, name: displayName({ firstName, middleName, lastName, name: user.name }), firstName, middleName, lastName, email: user.email, phone: user.phone, role: user.role };
}

export class LocalPropertyService implements PropertyService {
  async search(filters: SearchFilters) {
    const max = filters.maxPrice || Number.MAX_SAFE_INTEGER;
    const query = (filters.location || "").toLowerCase();
    return allProperties(demoProperties)
      .map((property) => ({ ...property, slightlyAboveBudget: Boolean(filters.maxPrice && property.rentPcm > max && property.rentPcm <= Math.round(max * 1.15)) }))
      .filter((property) => {
        if (!query) return true;
        const haystack = [property.city, property.area, property.postcodeDistrict, property.postcode, property.streetName].join(" ").toLowerCase();
        return haystack.includes(query);
      })
      .filter((property) => property.rentPcm >= (filters.minPrice || 0))
      .filter((property) => property.rentPcm <= max || property.slightlyAboveBudget)
      .filter((property) => property.bedrooms >= (filters.bedrooms || 0))
      .filter((property) => !filters.propertyType || filters.propertyType === "Any" || property.type === filters.propertyType || (filters.propertyType === "House" && property.type.includes("House")));
  }

  async getProperty(id: string, approvedViewer = false) {
    const property = allProperties(demoProperties).find((item) => item.id === id);
    if (!property || approvedViewer) return property;
    return { ...property, fullAddress: `${property.streetName}, ${property.area}, ${property.city} ${property.postcodeDistrict}`, postcode: property.postcodeDistrict };
  }

  async saveProperty() {}
  async createPropertyDraft(input: Partial<Property>) {
    return { ...demoProperties[0], ...input, id: crypto.randomUUID(), status: "DRAFT" as const };
  }
  async publishProperty() {}
}

export class LocalMessageService implements MessageService {
  async conversations(): Promise<Conversation[]> {
    return [
      {
        id: "conv-1",
        subject: "Well Road offer",
        unreadCount: 1,
        messages: [
          { id: "m1", senderId: "landlord", body: "Your referenced offer is ready for landlord review.", createdAt: "09:21" }
        ]
      }
    ];
  }

  async sendMessage(_conversationId: string, body: string) {
    if (CONTACT_BLOCKER.test(body)) {
      throw new Error("For your safety, personal contact information can only be shared after a viewing has been completed.");
    }
  }
}

export class LocalReferencingService implements ReferencingService {
  async steps(): Promise<ReferencingStep[]> {
    return ["Personal Details", "Identity Verification", "Address History", "Employment Information", "Income Information", "Open Banking", "Credit Check", "Review"].map((title, index) => ({
      id: `step-${index + 1}`,
      title,
      description: "Average completion time: 6 minutes.",
      status: index === 0 ? "current" : "locked"
    }));
  }

  async completeStep() {}

  async tenantPassport(): Promise<TenantPassport> {
    return {
      verificationStatus: "Verified",
      affordabilityPcm: 3250,
      riskGrade: "Low",
      employmentSector: "Finance",
      completionDate: new Date().toISOString()
    };
  }
}

export class LocalPhotographerService implements PhotographerService {
  async request(input: { propertyAddress: string; contactName: string; phone: string; email: string; preferredDates: string; notes?: string }) {
    save("haaste.photography.requests", [...load("haaste.photography.requests", []), { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]);
  }
}
