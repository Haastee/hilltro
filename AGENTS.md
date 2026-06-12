# Mandatory Workflow For All AI Agents

This repository uses a shared memory system stored in Supabase.
The purpose is to keep all AI agents synchronized.

**GitHub is the source of truth for code. Supabase `agent_memory` is the source of truth for agent knowledge and decision history.**

---

## Shared Memory Table

Project: Supabase project `ragcnmruiqecogizcdba`.

Table: `public.agent_memory`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key, auto-generated |
| `agent` | text | agent name (e.g. `Claude`, `Codex`) |
| `topic` | text | subsystem / feature (see Preferred Topics) |
| `content` | text | summary of work, decisions, outstanding issues, next steps |
| `metadata` | jsonb | optional structured context (commits, files, PRs) |
| `created_at` | timestamptz | auto-set |

The table has RLS enabled with **no public policy** — it is only readable/writable through the Supabase service-role / management (MCP) connection, never from the frontend anon/authenticated clients.

---

## Before Any Task

1. Read the most recent entries from the `agent_memory` table.
2. Review existing work related to the current task.
3. Check for architectural decisions already recorded.
4. Review current branch status and recent commits.
5. Do **not** begin implementation until memory has been reviewed.

Read example (via Supabase MCP `execute_sql` or SQL editor):

```sql
select agent, topic, content, created_at
from public.agent_memory
order by created_at desc
limit 30;
```

---

## After Any Meaningful Task

Write a new record to `agent_memory`. Include:

- Agent name
- Topic
- Summary of changes
- Decisions made
- Outstanding issues
- Recommended next steps

Write example:

```sql
insert into public.agent_memory (agent, topic, content, metadata)
values (
  'Claude',
  'Authentication',
  'Moved authentication middleware into shared package. Updated session validation flow. Outstanding: legacy routes still use the old middleware. Next: migrate legacy routes.',
  '{"commit": "<sha>", "files": ["src/..."]}'
);
```

---

## Record Important Information

Always record:

- Architecture decisions
- Database changes
- Supabase changes
- API changes
- Authentication changes
- Billing changes
- Infrastructure changes
- Production bugs
- Root cause investigations
- Security changes

## Do Not Record

- Formatting changes
- Minor refactors
- Typo fixes
- Cosmetic updates

---

## Memory Entry Format

```
Agent:
Topic:
Content:
  <Summary of work>
  <Decisions made>
  <Outstanding issues>
  <Recommended next steps>
```

---

## Preferred Memory Topics

Authentication · Authorization · Database · Supabase · Stripe · Billing · API · Frontend · Backend · Infrastructure · Deployment · Security · Performance · Bug Investigation

---

## Agent Identification

Use your own agent name (`Claude`, `Codex`, …). Do not impersonate another agent.

---

## Compliance

Every meaningful coding session must:

1. Read memory before work.
2. Perform work.
3. Write memory after work.

**Work is not considered complete until memory has been updated.**

---

## Goal

Maintain continuity between Claude, Codex, and future AI agents so that knowledge accumulates over time and work is not duplicated.
