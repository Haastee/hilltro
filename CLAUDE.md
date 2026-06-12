# CLAUDE.md — Claude-specific instructions

Read **`AGENTS.md`** first — it defines the mandatory shared-memory workflow for every AI agent in this repo. This file adds Claude-specific guidance.

## Identity

When writing to `public.agent_memory`, always set `agent = 'Claude'`.

## Mandatory workflow (do not skip)

1. **Before work** — query the shared memory and review recent history:
   ```sql
   select agent, topic, content, created_at
   from public.agent_memory
   order by created_at desc
   limit 30;
   ```
   Also check `git status`, recent commits, and any open PRs. Don't duplicate work another agent already recorded.
2. **Do the work.**
3. **After work** — insert a memory entry summarising what changed, decisions made, outstanding issues, and next steps (see format in `AGENTS.md`). The task is **not complete** until this entry exists.

Access the table through the Supabase MCP server (`execute_sql` / `apply_migration`) for project `ragcnmruiqecogizcdba`. The table is service-role only — it is not reachable from the frontend client.

## This project at a glance

- **Stack:** React + TypeScript + Vite, React Router. Single backend = **Supabase** (Postgres + Auth + Storage + RLS). The `localStorage` demo fallback (`LocalServices`) is a client mode, not a backend.
- **Deploy:** push to `main` → GitHub Actions → GitHub Pages (`hilltro.com`). Committing/pushing deploys — only do it when the user asks. Build locally with `npm run build` (and `npx tsc -b`) before deploying.
- **Auth:** email/password via Supabase Auth, email confirmation enabled. Registration shows a "confirm your email" state when there's no session. A demo landlord (`hilltro.demo.landlord.session` in localStorage) is a fake client-side session with **no** Supabase JWT.
- **Storage gotcha (important):** the project's Storage service cannot validate Auth's user JWTs (a platform JWT signing-key issue). Uploads therefore authenticate with the **anon key** (see `src/services/storageService.ts`), the media-bucket RLS is bucket-scoped, and uploads must **not** send `x-upsert` (it trips RLS). Re-tighten once Supabase fixes token validation.

## What counts as "meaningful" (write memory)

Schema/RLS migrations, new services, API/contract changes, auth/security changes, root-cause bug findings, performance findings, infra/deploy changes. Skip pure formatting, renames, and cosmetic tweaks.

## Style

- Prefer the dedicated tool over guessing; verify changes by building and, where possible, exercising the running app.
- Keep secrets out of memory entries. Public keys (anon key) are fine; never store service-role keys, passwords, or tokens.
