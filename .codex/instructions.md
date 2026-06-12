# Codex-specific instructions

Read **`/AGENTS.md`** first — it defines the mandatory shared-memory workflow for every AI agent in this repo. This file adds Codex-specific guidance.

## Identity

When writing to `public.agent_memory`, always set `agent = 'Codex'`.

## Mandatory workflow (do not skip)

1. **Before work** — read the latest shared memory and review related history:
   ```sql
   select agent, topic, content, created_at
   from public.agent_memory
   order by created_at desc
   limit 30;
   ```
   Also review branch status, recent commits, and open PRs. Check whether another agent already worked the same area. Do not start implementing until memory has been reviewed.
2. **Do the work.**
3. **After work** — insert a memory entry: agent, topic, summary of changes, decisions made, outstanding issues, recommended next steps (format in `AGENTS.md`). Work is **not complete** until the entry is written.

The memory table lives in Supabase project `ragcnmruiqecogizcdba`, table `public.agent_memory`. It has RLS enabled with no public policy, so it is only accessible via the service-role / management connection (not from the frontend). Use your Supabase access (service-role key or Supabase MCP) to read and insert rows.

Insert template:

```sql
insert into public.agent_memory (agent, topic, content, metadata)
values ('Codex', '<Topic>', '<Content: summary, decisions, outstanding, next steps>', '{}');
```

## Record / do-not-record

Record: architecture, database/Supabase, API, auth, billing, infrastructure, production bugs, root-cause investigations, security, performance.

Do not record: formatting, minor refactors, typo fixes, cosmetic updates.

## Project notes

- React + TypeScript + Vite SPA; Supabase is the single backend (Postgres + Auth + Storage + RLS). Deploy = push to `main` → GitHub Actions → GitHub Pages. Only commit/push when the user asks.
- Storage uploads authenticate with the anon key and must not send `x-upsert` (platform JWT issue + bucket-scoped RLS); see `src/services/storageService.ts` and the corresponding `agent_memory` entries before touching upload code.
- Keep secrets out of memory entries.
