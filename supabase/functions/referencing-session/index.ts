// Creates a Didit v3 identity-verification session for the signed-in user.
//
// Auth: verify_jwt is disabled at the gateway because this project's platform
// JWT validation is unreliable for user tokens; instead we validate the caller
// in-code via auth.getUser() (which checks the token against the Auth server).
// The Didit API key + workflow id are read from Supabase Vault via the
// service-role-only RPC public.get_didit_config() — never shipped to the client.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = [/^https?:\/\/localhost(:\d+)?$/, /\.github\.io$/, /(^|\.)hilltro\.com$/];

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGIN.some((re) => re.test(origin)) ? origin : "*";
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "origin",
  };
}

function json(payload: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(payload), { status, headers: { ...cors, "content-type": "application/json" } });
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  // Identify the caller.
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401, cors);
  const user = userData.user;

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: cfg, error: cfgErr } = await admin.rpc("get_didit_config");
  if (cfgErr) { console.error("config error", cfgErr); return json({ error: "Verification is not configured" }, 500, cors); }
  const apiKey = cfg?.api_key as string | undefined;
  const workflowId = cfg?.workflow_id as string | undefined;
  if (!apiKey || !workflowId) return json({ error: "Verification is not configured" }, 500, cors);

  // Cap Didit usage at 500 verification checks per calendar month.
  const MONTHLY_CAP = 500;
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { count } = await admin.from("didit_session_log").select("*", { count: "exact", head: true }).gte("created_at", monthStart);
  if ((count ?? 0) >= MONTHLY_CAP) {
    return json({ error: "We've reached this month's verification limit. Please try again next month." }, 429, cors);
  }

  let body: { callbackUrl?: string } = {};
  try { body = await req.json(); } catch { /* body is optional */ }

  const sessionRes = await fetch("https://verification.didit.me/v3/session/", {
    method: "POST",
    headers: { "x-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: user.id,
      ...(body.callbackUrl ? { callback: body.callbackUrl } : {}),
    }),
  });

  if (!sessionRes.ok) {
    const detail = await sessionRes.text().catch(() => "");
    console.error("didit session create failed", sessionRes.status, detail);
    return json({ error: "Could not start verification. Please try again." }, 502, cors);
  }

  const session = await sessionRes.json();

  // One identity_verifications row per user; a retry resets it to pending.
  const { error: upErr } = await admin.from("identity_verifications").upsert(
    { user_id: user.id, didit_session_id: session.session_id, didit_session_url: session.url, status: "pending" },
    { onConflict: "user_id" },
  );
  if (upErr) console.error("identity_verifications upsert error", upErr);

  // Record usage for the monthly cap.
  await admin.from("didit_session_log").insert({ user_id: user.id, session_id: session.session_id });

  return json({ url: session.url, session_id: session.session_id, status: session.status }, 200, cors);
});
