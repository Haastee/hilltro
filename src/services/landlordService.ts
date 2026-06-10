import { supabase } from "../utils/supabase";
import type { ApplicantOffer } from "../data/landlordProperties";

export const isRealId = (value?: string) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const NOT_SUPPLIED = "Referencing not yet completed.";

function mapOfferStatus(status: string): ApplicantOffer["status"] {
  if (status === "accepted") return "Accepted";
  if (status === "expired") return "Expired";
  return "Pending";
}

// Real offers on a landlord's property, with the applicant name disclosed
// server-side (First L. while only an offer links the parties; full name once a
// deal exists). Referencing/affordability fields are placeholders until the
// referencing product is built.
export async function fetchPropertyOffers(propertyId: string): Promise<ApplicantOffer[]> {
  const { data: offers, error } = await supabase
    .from("offers")
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });
  if (error || !offers) return [];
  const visible = offers.filter((offer: any) => offer.status !== "declined");
  const names = await Promise.all(
    visible.map((offer: any) => supabase.rpc("disclosed_name", { target: offer.tenant_id }).then((r) => (r.data as string | null) || "Applicant"))
  );
  return visible.map((offer: any, index: number) => ({
    id: offer.id,
    propertyId: offer.property_id,
    applicantName: names[index],
    offerAmount: offer.offer_rent_pcm || 0,
    moveInDate: offer.move_in_date,
    status: mapOfferStatus(offer.status),
    riskGrade: "B",
    affordabilityPcm: offer.offer_rent_pcm || 0,
    verificationStatus: "In Review",
    employmentSector: "Not supplied",
    affordabilityAssessment: NOT_SUPPLIED,
    referencingStatus: "In review",
    addressHistorySummary: NOT_SUPPLIED,
    offerNotes: offer.notes || "—",
    viewingHistory: "—",
    tenantPassportSummary: NOT_SUPPLIED,
    expiresAt: offer.expires_at
  }));
}

// Accept an offer: mark it accepted (a DB trigger declines the others) and create
// the deal — which flips the applicant's disclosed name to their full name.
export async function acceptOfferToDeal(offer: ApplicantOffer): Promise<{ error?: string }> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Sign in required." };
  const { data: row } = await supabase.from("offers").select("tenant_id").eq("id", offer.id).maybeSingle();
  const tenantId = (row as { tenant_id?: string } | null)?.tenant_id;
  if (!tenantId) return { error: "Offer not found." };
  const { error: updateError } = await supabase.from("offers").update({ status: "accepted" }).eq("id", offer.id);
  if (updateError) return { error: updateError.message };
  const { error: dealError } = await supabase.from("deals").insert({
    property_id: offer.propertyId,
    offer_id: offer.id,
    landlord_id: auth.user.id,
    tenant_id: tenantId,
    agreed_rent_pcm: offer.offerAmount,
    agreed_move_date: offer.moveInDate,
    status: "active"
  });
  if (dealError) return { error: dealError.message };
  return {};
}
