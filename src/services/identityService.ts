import { supabase } from "../utils/supabase";

// Internal identity-verification status (mirrors the DB check constraint).
export type IdentityStatus =
  | "none" | "pending" | "in_progress" | "review" | "approved" | "declined" | "abandoned" | "expired";

export type IdentityVerification = {
  status: IdentityStatus;
  diditSessionId: string | null;
  sessionUrl: string | null;
  reviewedAt: string | null;
  updatedAt: string | null;
};

const NONE: IdentityVerification = { status: "none", diditSessionId: null, sessionUrl: null, reviewedAt: null, updatedAt: null };

export async function getIdentityVerification(): Promise<IdentityVerification> {
  const { data } = await supabase
    .from("identity_verifications")
    .select("status, didit_session_id, didit_session_url, reviewed_at, updated_at")
    .maybeSingle();
  if (!data) return NONE;
  return {
    status: (data.status as IdentityStatus) || "pending",
    diditSessionId: data.didit_session_id,
    sessionUrl: data.didit_session_url,
    reviewedAt: data.reviewed_at,
    updatedAt: data.updated_at,
  };
}

// Calls the Edge Function that holds the Didit API key. Returns the hosted
// verification URL the user is redirected to.
export async function startIdentityVerification(callbackUrl: string): Promise<{ url: string }> {
  const { data, error } = await supabase.functions.invoke("referencing-session", { body: { callbackUrl } });
  if (error) {
    // Surface the function's own message (e.g. the monthly cap) when present.
    let message = "We couldn't start verification just now. Please try again in a moment.";
    try {
      const ctx = (error as { context?: Response }).context;
      const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
      if (body?.error) message = body.error as string;
    } catch { /* keep the default */ }
    throw new Error(message);
  }
  if (!data?.url) throw new Error("Verification could not be started. Please try again.");
  return { url: data.url as string };
}

// Live updates so the dashboard reflects a webhook decision without a refresh.
export function subscribeIdentityVerification(userId: string, onChange: (v: IdentityVerification) => void): () => void {
  const channel = supabase
    .channel(`identity_${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "identity_verifications", filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as Record<string, unknown> | null;
        if (!row) return;
        onChange({
          status: (row.status as IdentityStatus) || "pending",
          diditSessionId: (row.didit_session_id as string) ?? null,
          sessionUrl: (row.didit_session_url as string) ?? null,
          reviewedAt: (row.reviewed_at as string) ?? null,
          updatedAt: (row.updated_at as string) ?? null,
        });
      },
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

// ---- Referencing application (personal details + address history) ----

export type ReferencingAddress = {
  line1: string;
  line2?: string;
  postcode?: string;
  country: string;
  international: boolean;
  // Every address (current and previous) captures how many months were spent there.
  durationMonths?: number;
};

export type ReferencingApplication = {
  dateOfBirth: string | null;
  addresses: ReferencingAddress[];
  status: string;
};

export async function getReferencingApplication(): Promise<ReferencingApplication | null> {
  const { data } = await supabase
    .from("referencing_applications")
    .select("date_of_birth, addresses, status")
    .maybeSingle();
  if (!data) return null;
  return {
    dateOfBirth: data.date_of_birth,
    addresses: (Array.isArray(data.addresses) ? data.addresses : []) as ReferencingAddress[],
    status: data.status || "in_progress",
  };
}

export async function saveReferencingApplication(
  userId: string,
  app: { dateOfBirth: string | null; addresses: ReferencingAddress[]; status?: string },
): Promise<void> {
  const { error } = await supabase.from("referencing_applications").upsert(
    { user_id: userId, date_of_birth: app.dateOfBirth, addresses: app.addresses, status: app.status ?? "in_progress" },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

// Total declared months of address history (sum of every block's duration).
export function totalHistoryMonths(addresses: ReferencingAddress[]): number {
  return addresses.reduce((sum, addr) => sum + (addr.durationMonths || 0), 0);
}
