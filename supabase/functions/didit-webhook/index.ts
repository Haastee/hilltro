// Didit webhook receiver — verifies the signature, dedupes by event_id, updates
// the user's identity_verifications row, stores the raw payload for audit, and
// raises an internal notification on review/declined.
//
// verify_jwt is disabled: this endpoint authenticates Didit via HMAC signature,
// not a Supabase JWT. Secrets come from Vault via public.get_didit_config().
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Didit V2 canonicalisation: integer-valued floats stay integers, keys sorted
// recursively, then JSON.stringify — must match the bytes Didit signed.
function shortenFloats(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shortenFloats);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>)) out[k] = shortenFloats((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = sortKeys((v as Record<string, unknown>)[k]);
    return out;
  }
  return v;
}
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function mapStatus(s: string | null): string {
  switch (s) {
    case "Approved": return "approved";
    case "Declined": return "declined";
    case "In Review": return "review";
    case "In Progress":
    case "Awaiting User":
    case "Resubmitted": return "in_progress";
    case "Abandoned": return "abandoned";
    case "Expired":
    case "Kyc Expired": return "expired";
    default: return "pending";
  }
}
function summarizeDecision(d: Record<string, any> | null | undefined): Record<string, unknown> | null {
  if (!d || typeof d !== "object") return null;
  return {
    id_verification: d.id_verifications?.[0]?.status ?? null,
    face_match: d.face_matches?.[0]?.status ?? null,
    face_match_score: d.face_matches?.[0]?.match_score ?? null,
    ip_analysis: d.ip_analyses?.[0]?.status ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const raw = await req.text();

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: cfg } = await admin.rpc("get_didit_config");
  const secret = cfg?.webhook_secret as string | undefined;

  // Freshness — reject replays older than 5 minutes.
  const ts = Number(req.headers.get("x-timestamp") ?? "0");
  const fresh = ts > 0 && Math.abs(Date.now() / 1000 - ts) <= 300;

  // Signature — accept V2 canonical OR raw-body signature.
  let signatureValid = false;
  if (secret && fresh) {
    const sigV2 = req.headers.get("x-signature-v2") ?? "";
    const sigRaw = req.headers.get("x-signature") ?? "";
    try {
      if (sigV2) {
        const parsed = JSON.parse(raw);
        const canonical = JSON.stringify(sortKeys(shortenFloats(parsed)));
        if (timingSafeEqual(await hmacHex(secret, canonical), sigV2)) signatureValid = true;
      }
      if (!signatureValid && sigRaw && timingSafeEqual(await hmacHex(secret, raw), sigRaw)) signatureValid = true;
    } catch (e) {
      console.error("signature verification error", e);
    }
  }

  if (!signatureValid) {
    console.warn("webhook rejected", { fresh, hasSecret: Boolean(secret) });
    return new Response(JSON.stringify({ error: "invalid signature" }), { status: 401, headers: { "content-type": "application/json" } });
  }

  let event: Record<string, any>;
  try { event = JSON.parse(raw); } catch { return new Response(JSON.stringify({ error: "bad payload" }), { status: 400 }); }

  const eventId: string | null = event.event_id ?? null;
  const sessionId: string | null = event.session_id ?? null;
  const userId: string | null = event.vendor_data ?? null;
  const diditStatus: string | null = event.status ?? null;

  // Idempotency: the raw event row's unique event_id dedupes retries/fan-out.
  const { error: insErr } = await admin.from("identity_verification_events").insert({
    event_id: eventId,
    session_id: sessionId,
    user_id: userId,
    webhook_type: event.webhook_type ?? null,
    status: diditStatus,
    payload: event,
    signature_valid: true,
  });
  if (insErr) {
    if ((insErr as { code?: string }).code === "23505") {
      return new Response(JSON.stringify({ ok: true, deduplicated: true }), { status: 200, headers: { "content-type": "application/json" } });
    }
    console.error("event insert error", insErr);
  }

  const internal = mapStatus(diditStatus);
  const patch: Record<string, unknown> = { status: internal, decision: summarizeDecision(event.decision) };
  if (internal === "review" || internal === "approved" || internal === "declined") patch.reviewed_at = new Date().toISOString();

  let update = admin.from("identity_verifications").update(patch);
  update = sessionId ? update.eq("didit_session_id", sessionId) : update.eq("user_id", userId ?? "");
  const { error: updErr } = await update;
  if (updErr) console.error("identity_verifications update error", updErr);

  if (internal === "review" || internal === "declined") {
    await admin.from("notifications").insert({
      user_id: userId,
      type: internal === "review" ? "identity_review" : "identity_declined",
      reason: internal === "review" ? "Identity verification requires manual review" : "Identity verification was not approved",
      reference: sessionId,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
});
