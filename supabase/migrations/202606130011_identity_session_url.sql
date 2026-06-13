-- Store the Didit hosted session URL so a user who starts then navigates back
-- can resume the SAME session (no new Didit check against the monthly cap).
alter table public.identity_verifications add column if not exists didit_session_url text;
