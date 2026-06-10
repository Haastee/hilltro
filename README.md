# Hilltro Rental Operating System

Hilltro is a single React + TypeScript + Vite application backed by Supabase (PostgreSQL, Auth, Storage) accessed directly from the browser, with authorization enforced by Postgres Row Level Security. The old static HTML/CSS/JavaScript prototype has been removed; `index.html` only boots the React app.

## Stack

- Frontend: React, TypeScript, Vite, React Router
- Design system: `src/design/tokens.css`
- Backend: Supabase — PostgreSQL, Auth, Storage and Row Level Security
- Schema & policies: `supabase/migrations`
- Services: typed contracts in `src/services/contracts.ts`, Supabase implementations in `src/services/supabaseServices.ts`, and a localStorage demo fallback in `src/services/localServices.ts`

## Local Setup

```bash
npm install
cp .env.example .env   # fill in your Supabase URL and publishable key
npm run dev
```

Open:

```text
http://localhost:5173
```

Without Supabase environment variables the app falls back to an in-browser localStorage demo mode. Demo landlord account:

```text
landlord.demo@hilltro.com / Hilltro!234
```

## React Routes

- `/` public marketplace home
- `/search` structured UK property search
- `/properties/:id` protected-address property detail and viewing request flow
- `/about`, `/faq`
- `/register`, `/login`
- `/tenant`, `/tenant/saved`, `/tenant/viewings`, `/tenant/offers`, `/tenant/payments`, `/tenant/profile`
- `/referencing`
- `/landlord`, `/landlord/applications`, `/landlord/viewings`, `/landlord/offers`, `/landlord/payments`, `/landlord/arrears`, `/landlord/settings`
- `/landlord/properties/new`
- `/messages`
- `/photography`

## Environment

Create `.env` (or `.env.local`) from `.env.example` and fill:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Do not commit a real `.env`. The publishable (anon) key is safe to ship in the built client; never expose the Supabase service-role key.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with Vite and publishes to GitHub Pages. `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are injected from GitHub Actions secrets at build time.
