import { supabase, hasSupabaseConfig } from "../utils/supabase";
import type { Conversation, Property, ReferencingStep, TenantPassport, User } from "../types/domain";
import type { AuthService, MessageService, PhotographerService, PropertyService, RegisterResult, SearchFilters } from "./contracts";
import { displayName, splitDisplayName } from "../utils/name";
import { propertyImagesComingSoon } from "../utils/propertyAssets";
import { storageService } from "./storageService";
import { landlordTypeForLiveListings } from "../utils/landlordClassification";

const CONTACT_BLOCKER = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})|(\+?\d[\d\s().-]{7,}\d)|(https?:\/\/|www\.)|(@[a-z0-9_]{3,})|(whatsapp|telegram|instagram|facebook|tiktok)/i;
const DEMO_LANDLORD_SESSION_KEY = "hilltro.demo.landlord.session";
const DEMO_LANDLORD_EMAIL = "landlord.demo@hilltro.com";
const DEMO_LANDLORD_PASSWORD = "Hilltro!234";
export const demoLandlordUser: User = {
  id: "demo-landlord-olivia-hart",
  name: "Olivia Hart",
  firstName: "Olivia",
  middleName: "",
  lastName: "Hart",
  email: DEMO_LANDLORD_EMAIL,
  phone: "+44 7700 900001",
  profileImageUrl: "",
  role: "LANDLORD"
};

export function isDemoLandlordSession() {
  return localStorage.getItem(DEMO_LANDLORD_SESSION_KEY) === "true";
}

// Identifies who owns browser-local data (e.g. in-progress drafts) so it is
// scoped to the signed-in account and never leaks to a different user on the
// same device. Returns "" when nobody is signed in.
export async function currentLandlordId(): Promise<string> {
  if (hasSupabaseConfig) {
    const { data } = await supabase.auth.getUser();
    if (data.user?.id) {
      localStorage.removeItem(DEMO_LANDLORD_SESSION_KEY);
      return data.user.id;
    }
    return isDemoLandlordSession() ? demoLandlordUser.id : "";
  }
  if (isDemoLandlordSession()) return demoLandlordUser.id;
  {
    try {
      return (JSON.parse(localStorage.getItem("hilltro.react.session") || "null") as { id?: string } | null)?.id || "";
    } catch {
      return "";
    }
  }
}

export class SupabaseAuthService implements AuthService {
  async currentUser(): Promise<User | null> {
    if (!hasSupabaseConfig && isDemoLandlordSession()) return demoLandlordUser;
    const { data } = await supabase.auth.getUser();
    if (!data.user) return isDemoLandlordSession() ? demoLandlordUser : null;
    localStorage.removeItem(DEMO_LANDLORD_SESSION_KEY);
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    if (!profile) return null;
    return mapUser(profile);
  }

  async register(input: { firstName: string; middleName?: string; lastName: string; email: string; password: string; phone: string; role: User["role"]; profileImage?: File | null }): Promise<RegisterResult> {
    if (!input.email?.trim() || !input.password) throw new Error("Enter your email and password to create an account.");
    const name = displayName(input);
    // Upload the optional profile photo *before* sign-up. Storage accepts the
    // anon key without a session, so this works even when email confirmation is
    // on. We pass the resulting URL through the sign-up metadata so the profiles
    // row (created by the handle_new_user_profile trigger) carries the photo —
    // otherwise a photo chosen at registration would be lost across the email
    // confirmation gap, where no authenticated write is possible yet.
    let profileImageUrl: string | null = null;
    if (input.profileImage) {
      try {
        profileImageUrl = (await storageService.uploadProfileImage(crypto.randomUUID(), input.profileImage)).url;
      } catch {
        // A failed photo upload must never block account creation; the user can
        // add a photo later from My Profile.
        profileImageUrl = null;
      }
    }
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name,
          first_name: input.firstName,
          middle_name: input.middleName || null,
          last_name: input.lastName,
          phone: input.phone,
          role: input.role.toLowerCase(),
          profile_image_url: profileImageUrl
        }
      }
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Registration did not return a user.");
    // No session means email confirmation is required: the user must click the
    // link we just emailed before any authenticated write (profile, photo,
    // property) will succeed under RLS. Do NOT sign them in here — surface the
    // "confirm your email" state so the app never pretends to be authenticated.
    // The trigger has already written the profile (incl. photo) from metadata.
    if (!data.session) {
      return { status: "confirm", email: input.email.toLowerCase() };
    }
    localStorage.removeItem(DEMO_LANDLORD_SESSION_KEY);
    const profile = {
      id: data.user.id,
      email: input.email.toLowerCase(),
      name,
      first_name: input.firstName,
      middle_name: input.middleName || null,
      last_name: input.lastName,
      phone: input.phone,
      profile_image_url: profileImageUrl,
      role: input.role.toLowerCase()
    };
    await supabase.from("profiles").upsert(profile);
    return { status: "active", user: mapUser(profile) };
  }

  async login(email: string, password: string): Promise<User> {
    if (email.toLowerCase() === DEMO_LANDLORD_EMAIL && password === DEMO_LANDLORD_PASSWORD) {
      localStorage.setItem(DEMO_LANDLORD_SESSION_KEY, "true");
      return demoLandlordUser;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    localStorage.removeItem(DEMO_LANDLORD_SESSION_KEY);
    const user = await this.currentUser();
    if (!user) throw new Error("Profile not found.");
    return user;
  }

  async logout(): Promise<void> {
    localStorage.removeItem(DEMO_LANDLORD_SESSION_KEY);
    await supabase.auth.signOut();
  }
}

export class SupabasePropertyService implements PropertyService {
  async search(filters: SearchFilters): Promise<Property[]> {
    // Public catalogue view: safe columns only, approximate (~110m) coordinates,
    // no exact address. The base properties table is owner-only.
    let query = supabase.from("properties_public").select("*").order("created_at", { ascending: false });
    if (filters.location && !filters.radiusMiles) {
      const location = filters.location.trim();
      query = query.or(`postcode_district.ilike.%${location}%,city.ilike.%${location}%,area.ilike.%${location}%,district.ilike.%${location}%`);
    }
    if (filters.minPrice) query = query.gte("rent_pcm", filters.minPrice);
    if (filters.maxPrice) query = query.lte("rent_pcm", Math.round(filters.maxPrice * 1.15));
    if (filters.bedrooms) query = query.gte("bedrooms", filters.bedrooms);
    if (filters.propertyType && filters.propertyType !== "Any") query = query.eq("property_type", filters.propertyType);
    const { data, error } = await query.limit(100);
    if (error) throw new Error(error.message);
    const properties = (data || []).map((row) => mapPublicProperty(row, [], undefined, undefined, filters.maxPrice));
    if (filters.location && filters.radiusMiles) {
      const origin = locationOrigin(properties, filters.location);
      return origin ? properties.filter((property) => distanceMiles(origin, property) <= filters.radiusMiles!) : properties.filter((property) => matchesLocation(property, filters.location || ""));
    }
    return properties;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    // Property comes from the public view; gallery assets are fetched separately
    // (the view has no foreign-key embed). Exact address is never returned here —
    // PropertyDetailPage calls get_property_full_address once the viewer is approved.
    const [propertyResult, photosResult, floorplanResult, videoResult] = await Promise.all([
      supabase.from("properties_public").select("*").eq("id", id).maybeSingle(),
      supabase.from("property_photos").select("public_url, sort_order").eq("property_id", id),
      supabase.from("floorplans").select("public_url").eq("property_id", id),
      supabase.from("property_videos").select("public_url, external_url, provider, thumbnail_url").eq("property_id", id)
    ]);
    if (propertyResult.error) throw new Error(propertyResult.error.message);
    if (!propertyResult.data) return undefined;
    return mapPublicProperty(propertyResult.data, photosResult.data || [], floorplanResult.data?.[0], videoResult.data?.[0]);
  }

  async saveProperty(propertyId: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Sign in required.");
    await supabase.from("saved_properties").insert({ property_id: propertyId, tenant_id: user.user.id });
  }

  async createPropertyDraft(input: Partial<Property>): Promise<Property> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Sign in required.");
    const payload = toPropertyRow(input, user.user.id, "draft");
    const { data, error } = await supabase.from("properties").insert(payload).select("*, property_photos(public_url, sort_order), floorplans(public_url), property_videos(public_url, external_url, provider, thumbnail_url)").single();
    if (error) throw new Error(error.message);
    return mapProperty(data);
  }

  async publishProperty(propertyId: string): Promise<void> {
    const { error } = await supabase.from("properties").update({ status: "live" }).eq("id", propertyId);
    if (error) throw new Error(error.message);
  }
}

function matchesLocation(property: Property, location: string) {
  const query = location.trim().toLowerCase();
  if (!query) return true;
  return [property.city, property.area, property.postcodeDistrict, property.postcode, property.streetName, property.fullAddress].join(" ").toLowerCase().includes(query);
}

function locationOrigin(properties: Property[], location: string) {
  const query = location.trim().toLowerCase().split(/\s+/)[0];
  const match = properties.find((property) => [property.postcodeDistrict, property.postcode, property.area, property.city].some((value) => value.toLowerCase().startsWith(query)));
  return match?.latitude && match?.longitude ? { latitude: match.latitude, longitude: match.longitude } : null;
}

function distanceMiles(a: { latitude: number; longitude: number }, b: { latitude?: number; longitude?: number }) {
  if (!b.latitude || !b.longitude) return Number.MAX_SAFE_INTEGER;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

export class SupabaseMessageService implements MessageService {
  async conversations(): Promise<Conversation[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];
    const { data, error } = await supabase
      .from("conversations")
      .select("*, messages(*)")
      .or(`landlord_id.eq.${user.user.id},tenant_id.eq.${user.user.id}`)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((conversation) => ({
      id: conversation.id,
      subject: conversation.subject,
      propertyId: conversation.property_id,
      landlordId: conversation.landlord_id,
      applicantId: conversation.applicant_id,
      unreadCount: (conversation.messages || []).filter((message: { read_at?: string; sender_id: string }) => !message.read_at && message.sender_id !== user.user!.id).length,
      messages: (conversation.messages || []).map((message: { id: string; sender_id: string; body: string; created_at: string; read_at?: string; attachment_url?: string }) => ({
        id: message.id,
        senderId: message.sender_id,
        body: message.body,
        createdAt: new Date(message.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        readAt: message.read_at,
        attachmentUrl: message.attachment_url
      }))
    }));
  }

  async sendMessage(conversationId: string, body: string, attachmentUrl?: string): Promise<void> {
    if (CONTACT_BLOCKER.test(body)) throw new Error("For your safety, personal contact information can only be shared after a viewing has been completed.");
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Sign in required.");
    const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.user.id, body, attachment_url: attachmentUrl });
    if (error) throw new Error(error.message);
  }
}

export class SupabaseReferencingService {
  async steps(): Promise<ReferencingStep[]> {
    return ["Personal Details", "Identity Verification", "Address History", "Employment Information", "Income Information", "Open Banking", "Credit Check", "Review"].map((title, index) => ({ id: `step-${index + 1}`, title, description: "Average completion time: 6 minutes.", status: index === 0 ? "current" : "locked" }));
  }
  async completeStep(): Promise<void> {}
  async tenantPassport(): Promise<TenantPassport> {
    return { verificationStatus: "Verified", affordabilityPcm: 0, riskGrade: "Private", employmentSector: "Not supplied", completionDate: new Date().toISOString() };
  }
}

export class SupabasePhotographerService implements PhotographerService {
  async request(input: { propertyAddress: string; contactName: string; phone: string; email: string; preferredDates: string; notes?: string }): Promise<void> {
    await supabase.from("messages").insert({ body: `Photography request: ${JSON.stringify(input)}`, sender_id: (await supabase.auth.getUser()).data.user?.id });
  }
}

function mapUser(profile: { id: string; email: string; name?: string; first_name?: string | null; middle_name?: string | null; last_name?: string | null; phone?: string; profile_image_url?: string | null; role: string }): User {
  const fallback = splitDisplayName(profile.name || "");
  const firstName = profile.first_name || fallback.firstName;
  const middleName = profile.middle_name || fallback.middleName || "";
  const lastName = profile.last_name || fallback.lastName || firstName;
  const name = displayName({ firstName, middleName, lastName, name: profile.name });
  return { id: profile.id, email: profile.email, name, firstName, middleName, lastName, phone: profile.phone, profileImageUrl: profile.profile_image_url || undefined, role: profile.role === "landlord" ? "LANDLORD" : "TENANT" };
}

function mapProperty(row: any, maxPrice?: number): Property {
  const photos = [...(row.property_photos || [])].sort((a, b) => a.sort_order - b.sort_order);
  const floorplan = row.floorplans?.[0];
  const video = row.property_videos?.[0];
  return {
    id: row.id,
    title: row.title,
    streetName: row.address_line_2 || row.address_line_1,
    area: row.area || row.city,
    city: row.city,
    postcodeDistrict: row.postcode_district,
    fullAddress: [row.address_line_1, row.address_line_2, row.area, row.city, row.postcode].filter(Boolean).join(", "),
    postcode: row.postcode,
    type: row.property_type,
    bedrooms: row.bedrooms,
    bathrooms: Number(row.bathrooms || 0),
    rentPcm: row.rent_pcm || 0,
    availableFrom: row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    furnishingStatus: row.furnishing || "Flexible",
    description: row.description || "",
    features: row.features || row.outside_space || [],
    floorLevel: row.floor_level || undefined,
    hasLift: row.has_lift ?? undefined,
    epcRating: row.compliance?.epcRating || undefined,
    epcExempt: row.compliance?.epcExempt || undefined,
    epcCertificateUrl: row.compliance?.epcCertificateUrl || undefined,
    epcCertificateName: row.compliance?.epcCertificateName || undefined,
    imageUrl: photos[0]?.public_url || propertyImagesComingSoon,
    imageUrls: photos.map((photo) => photo.public_url).filter(Boolean),
    floorplanUrl: floorplan?.public_url,
    videoUrl: video?.external_url || video?.public_url,
    videoProvider: video?.provider || (video?.public_url ? "Uploaded video" : undefined),
    videoThumbnailUrl: video?.thumbnail_url || photos[0]?.public_url,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    status: row.status === "live" ? "LIVE" : row.status === "inactive" ? "LET" : "DRAFT",
    verifiedEnquiriesOnly: true,
    landlordId: row.landlord_id,
    slightlyAboveBudget: Boolean(maxPrice && row.rent_pcm > maxPrice && row.rent_pcm <= Math.round(maxPrice * 1.15))
  };
}

// Maps a row from the public catalogue view (properties_public). The exact
// street address is intentionally withheld — only area/city/postcode district and
// an approximate (~110m) location are exposed until a viewing is approved.
function mapPublicProperty(
  row: any,
  photos: Array<{ public_url: string; sort_order: number }> = [],
  floorplan?: { public_url?: string },
  video?: { public_url?: string; external_url?: string; provider?: string; thumbnail_url?: string },
  maxPrice?: number
): Property {
  const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  const images = sorted.map((photo) => photo.public_url).filter(Boolean);
  const cover = images[0] || row.cover_photo_url || undefined;
  const rent = row.rent_pcm || row.rent || 0;
  return {
    id: row.id,
    title: row.title,
    streetName: "",
    area: row.area || row.city,
    city: row.city,
    postcodeDistrict: row.postcode_district,
    fullAddress: [row.area, row.city, row.postcode_district].filter(Boolean).join(", "),
    postcode: row.postcode_district,
    type: row.property_type,
    bedrooms: row.bedrooms,
    bathrooms: Number(row.bathrooms || 0),
    rentPcm: rent,
    availableFrom: row.available_from || row.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    furnishingStatus: row.furnishing || "Flexible",
    description: row.description || "",
    features: row.outside_space || [],
    floorLevel: row.floor_level || undefined,
    hasLift: row.has_lift ?? undefined,
    epcRating: row.epc_rating || row.compliance?.epcRating || undefined,
    epcExempt: row.epc_exempt ?? row.compliance?.epcExempt ?? undefined,
    epcCertificateUrl: row.epc_certificate_url || row.compliance?.epcCertificateUrl || undefined,
    epcCertificateName: row.epc_certificate_name || row.compliance?.epcCertificateName || undefined,
    imageUrl: cover || propertyImagesComingSoon,
    imageUrls: images.length ? images : cover ? [cover] : [],
    floorplanUrl: floorplan?.public_url,
    videoUrl: video?.external_url || video?.public_url,
    videoProvider: video?.provider || (video?.public_url ? "Uploaded video" : undefined),
    videoThumbnailUrl: video?.thumbnail_url || cover,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    status: "LIVE",
    verifiedEnquiriesOnly: true,
    landlordId: row.landlord_id,
    landlordFirstName: row.landlord_first_name || undefined,
    landlordAvatarUrl: row.landlord_profile_image_url || undefined,
    landlordType: landlordTypeForLiveListings(Number(row.landlord_live_listing_count || 0)),
    landlordLiveListingCount: Number(row.landlord_live_listing_count || 0),
    slightlyAboveBudget: Boolean(maxPrice && rent > maxPrice && rent <= Math.round(maxPrice * 1.15))
  };
}

function toPropertyRow(input: Partial<Property>, landlordId: string, status: "draft" | "live") {
  return {
    landlord_id: landlordId,
    created_by: landlordId,
    title: input.title || "Draft property",
    address_line_1: input.fullAddress || input.streetName || "Address pending",
    city: input.city || "London",
    postcode: input.postcode || "W8 4AA",
    postcode_district: input.postcodeDistrict || "W8",
    property_type: input.type || "Flat",
    bedrooms: input.bedrooms || 1,
    bathrooms: input.bathrooms || 1,
    rent_pcm: input.rentPcm || 0,
    furnishing: input.furnishingStatus || "Flexible",
    description: input.description || "",
    features: input.features || [],
    status
  };
}
