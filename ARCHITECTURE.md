# Haaste Full-Stack Architecture

Haaste is a single production-oriented codebase. The frontend source of truth is React + TypeScript + Vite; there is no parallel static implementation.

## Runtime

- Frontend: React, TypeScript, Vite, React Router
- Backend: Express API in `server/index.ts`
- Database: PostgreSQL through Prisma
- Styling: central tokens and shared component classes in `src/design/tokens.css`
- Assets: `assets/haaste-logo.svg`, favicon and property imagery

## Source Layout

- `src/app`: app shell, routes and service selection
- `src/data`: demo property and structured UK location datasets
- `src/design`: design system tokens and shared CSS
- `src/features`: public marketplace, auth, tenant, landlord, referencing, messages and photography screens
- `src/services`: service interfaces, API services, local demo services and provider adapters
- `server`: Express API
- `prisma`: PostgreSQL schema and seed script

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

## Database Models

The Prisma schema includes users, tenant/landlord profiles, properties, property drafts, documents, conversations, messages, notifications, viewing requests/events, offers, saved properties, referencing profiles, address history, employment records, verification checks, risk assessments, tenancies, audit logs, system events and photographer requests.

## Run

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run server
```

In another terminal:

```bash
npm run dev
```

Open `http://localhost:5173`.
