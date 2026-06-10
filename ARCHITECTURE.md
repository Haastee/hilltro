# Hilltro Architecture

Hilltro is a single production-oriented codebase. The frontend is React + TypeScript + Vite; the backend is Supabase (PostgreSQL) accessed directly from the browser, with security enforced by Postgres Row Level Security.

## Runtime

- Frontend: React, TypeScript, Vite, React Router
- Backend: Supabase — PostgreSQL, Auth, Storage, and Row Level Security
- Data access: the browser talks to Supabase directly using the publishable (anon) key; RLS policies are the authorization boundary
- Styling: central tokens and shared component classes in `src/design/tokens.css`
- Assets: `assets/branding/hilltro-logo.svg`, favicon and property imagery

## Source Layout

- `src/app`: app shell, routes and service selection
- `src/data`: demo property and structured UK location datasets
- `src/design`: design system tokens and shared CSS
- `src/features`: public marketplace, auth, tenant, landlord, referencing, messages and photography screens
- `src/services`: service interfaces (`contracts.ts`), the Supabase implementations (`supabaseServices.ts`), a localStorage demo fallback (`localServices.ts`), and provider adapters
- `supabase/migrations`: PostgreSQL schema, RLS policies, triggers and storage buckets

## Service Selection

`src/app/services.ts` wires the app to a backend. When `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are present (always true in deployed builds) the Supabase services are used. Otherwise the app falls back to `LocalServices`, an in-browser localStorage demo mode used for product demos without a database.

## Key Product Surfaces

- Public marketplace search with structured UK location autocomplete
- Property detail with protected address disclosure
- Tenant registration, login, dashboard, saved homes, viewings, offers, payments and profile
- Tenant Passport referencing flow with private risk-card handling
- Landlord registration, dashboard, applications, viewings, offers, payments, arrears and settings
- Listing onboarding and photography request workflow
- Secure messenger with unread state, attachments and contact-information blocking
- APT wording for Assured Periodic Tenancy signing flows

## Location Search

`src/data/locations.ts` contains a structured UK location dataset covering cities, towns, boroughs, areas, neighbourhoods, postcode districts and postcode sectors across England, Scotland, Wales and Northern Ireland.

Examples:

- `W8` suggests `W8`, `W8 1`, `W8 2`, `W8 3`, etc.
- `lon` suggests `London`, `City of London`, `Londonderry`
- `Manchester`, `Birmingham`, `Liverpool`, `Leeds`, `Camden`, `Chelsea` and similar searches map into the property search service.

## Database

The PostgreSQL schema lives in `supabase/migrations` and includes profiles, properties (with photos, floorplans and videos), conversations, messages, viewings, offers, deals, saved properties and locations, plus RLS policies, triggers (viewing-slot validation, offer closing) and storage buckets.

## Run

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Open `http://localhost:5173`.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with Vite and publishes to GitHub Pages. Supabase URL/key are injected from GitHub Actions secrets at build time.
