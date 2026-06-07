import { demoProperties } from "../data/properties";
import { applicantById, managedProperties, propertyAddress } from "../data/landlordProperties";
import { allProperties } from "./propertyStore";
import type { Conversation, Property, ReferencingStep, TenantPassport, User } from "../types/domain";
import type { AuthService, MessageService, PhotographerService, PropertyService, ReferencingService, SearchFilters } from "./contracts";
import { displayName, splitDisplayName } from "../utils/name";
import { storageService } from "./storageService";

const SESSION_KEY = "hilltro.react.session";
const USERS_KEY = "hilltro.react.users";
const CONTACT_BLOCKER = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(\+?\d[\d\s().-]{7,}\d)|(https?:\/\/|www\.)|(@[a-z0-9_]{3,})|(whatsapp|telegram|instagram|facebook|tiktok)/i;
type LocalStoredUser = User & { password: string };
const demoLandlord: LocalStoredUser = {
  id: "demo-landlord-olivia-hart",
  name: "Olivia Hart",
  firstName: "Olivia",
  middleName: "",
  lastName: "Hart",
  email: "landlord.demo@hilltro.com",
  phone: "+44 7700 900001",
  profileImageUrl: "",
  role: "LANDLORD",
  password: "Hilltro!234"
};
const localConversations: Conversation[] = [
  {
    id: "conv-1",
    subject: "Taylor · Kensington Palace Gardens apartment",
    propertyId: managedProperties[0].id,
    landlordId: "landlord-qa-olivia-hart",
    applicantId: "app-taylor",
    unreadCount: 1,
    messages: [
      { id: "m1", senderId: "app-taylor", body: `Hi Olivia, I would like to discuss ${propertyAddress(managedProperties[0].id)} after my viewing request.`, createdAt: "09:21" }
    ]
  }
];

const load = <T>(key: string, fallback: T): T => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) as T;
const save = <T>(key: string, value: T) => localStorage.setItem(key, JSON.stringify(value));
const localUsers = () => {
  const stored = load<LocalStoredUser[]>(USERS_KEY, []);
  return stored.some((user) => user.email === demoLandlord.email) ? stored : [demoLandlord, ...stored];
};

export class LocalAuthService implements AuthService {
  async currentUser() {
    const user = load<User | null>(SESSION_KEY, null);
    return user ? publicLocalUser(user) : null;
  }

  async register(input: { firstName: string; middleName?: string; lastName: string; email: string; password: string; phone: string; role: User["role"]; profileImage?: File | null }) {
    const users = localUsers();
    if (users.some((user) => user.email === input.email.toLowerCase())) throw new Error("An account already exists for this email.");
    const id = crypto.randomUUID();
    const profileImageUrl = input.profileImage ? (await storageService.uploadProfileImage(id, input.profileImage)).url : "";
    const user = { id, name: displayName(input), firstName: input.firstName, middleName: input.middleName || "", lastName: input.lastName, email: input.email.toLowerCase(), phone: input.phone, profileImageUrl, role: input.role, password: input.password };
    save(USERS_KEY, [...users.filter((stored) => stored.id !== demoLandlord.id), user]);
    save(SESSION_KEY, publicLocalUser(user));
    return user;
  }

  async login(email: string, password: string) {
    const user = localUsers().find((item) => item.email === email.toLowerCase() && item.password === password);
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
  return { id: user.id, name: displayName({ firstName, middleName, lastName, name: user.name }), firstName, middleName, lastName, email: user.email, phone: user.phone, profileImageUrl: user.profileImageUrl, role: user.role };
}

export class LocalPropertyService implements PropertyService {
  async search(filters: SearchFilters) {
    const max = filters.maxPrice || Number.MAX_SAFE_INTEGER;
    const query = (filters.location || "").toLowerCase();
    const radiusMiles = filters.radiusMiles || 0;
    const origin = locationOrigin(query);
    return allProperties(demoProperties)
      .map((property) => ({ ...property, slightlyAboveBudget: Boolean(filters.maxPrice && property.rentPcm > max && property.rentPcm <= Math.round(max * 1.15)) }))
      .filter((property) => {
        if (!query) return true;
        if (origin && radiusMiles > 0 && property.latitude && property.longitude) return distanceMiles(origin, property) <= radiusMiles;
        if (radiusMiles > 0 && districtNeighbours[query]) return districtNeighbours[query].some((district) => property.postcodeDistrict.toLowerCase().startsWith(district));
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

const districtNeighbours: Record<string, string[]> = {
  w8: ["w8", "sw7", "w11", "w14", "sw3", "w1k", "w1g", "sw1x"],
  sw3: ["sw3", "sw7", "sw1x", "w8", "w1k"],
  sw7: ["sw7", "w8", "sw3", "sw1x", "w11"],
  w11: ["w11", "w8", "w14", "sw7"],
  w1k: ["w1k", "w1g", "sw1x", "sw3", "w8"],
  w1g: ["w1g", "w1k", "w8"]
};

function locationOrigin(query: string) {
  const normalised = query.trim().toLowerCase().split(/\s+/)[0];
  const reference = allProperties(demoProperties).find((property) => [property.postcodeDistrict, property.postcode, property.area, property.city].some((value) => value.toLowerCase().startsWith(normalised)));
  return reference?.latitude && reference?.longitude ? { latitude: reference.latitude, longitude: reference.longitude } : null;
}

function distanceMiles(a: { latitude: number; longitude: number }, b: { latitude?: number; longitude?: number }) {
  if (!b.latitude || !b.longitude) return Number.MAX_SAFE_INTEGER;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthMiles = 3958.8;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthMiles * Math.asin(Math.sqrt(h));
}

export class LocalMessageService implements MessageService {
  async conversations(): Promise<Conversation[]> {
    return localConversations.map((conversation) => ({ ...conversation, messages: [...conversation.messages] }));
  }

  async sendMessage(conversationId: string, body: string) {
    if (CONTACT_BLOCKER.test(body)) {
      throw new Error("For your safety, personal contact information can only be shared after a viewing has been completed.");
    }
    let conversation = localConversations.find((item) => item.id === conversationId);
    if (!conversation && conversationId.startsWith("draft:")) {
      const [, propertyId, applicantId] = conversationId.split(":");
      conversation = { id: crypto.randomUUID(), subject: `${applicantById(applicantId)?.name || "Applicant"} · ${propertyAddress(propertyId)}`, propertyId, applicantId, landlordId: "landlord-qa-olivia-hart", unreadCount: 0, messages: [] };
      localConversations.unshift(conversation);
    }
    conversation?.messages.push({ id: crypto.randomUUID(), senderId: "me", body, createdAt: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) });
    if (conversation) conversation.unreadCount = 0;
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
    save("hilltro.photography.requests", [...load("hilltro.photography.requests", []), { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]);
  }
}
