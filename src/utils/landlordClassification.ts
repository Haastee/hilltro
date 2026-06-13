import type { LandlordProfile } from "../types/domain";

export type LandlordType = "Private Landlord" | "Professional Landlord";

export function landlordTypeForLiveListings(liveListings: number): LandlordType {
  return liveListings >= 3 ? "Professional Landlord" : "Private Landlord";
}

export function withStrictLandlordType<T extends LandlordProfile>(profile: T, liveListings: number): T {
  return {
    ...profile,
    landlordType: landlordTypeForLiveListings(liveListings),
    propertiesCount: liveListings
  };
}
