# Hilltro Rental Operating System

Hilltro is now a single React + TypeScript + Vite application with an Express backend and PostgreSQL/Prisma data model. The old static HTML/CSS/JavaScript prototype has been removed; `index.html` only boots the React app.

## Stack

- Frontend: React, TypeScript, Vite, React Router
- Design system: `src/design/tokens.css`
- Backend: Express in `server/index.ts`
- Database: PostgreSQL with Prisma in `prisma/schema.prisma`
- Seed data: 10 public QA listings assigned to the dedicated demo landlord account, plus local demo auth data
- Services: typed contracts in `src/services/contracts.ts`, API adapters in `src/services/apiServices.ts`, local demo mode in `src/services/localServices.ts`

## Local Setup

```bash
cd /Users/princehalfcut/Documents/Hilltro
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Start the API:

```bash
npm run server
```

Start the React app in a second terminal:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

Local demo landlord account:

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

## Deploy On GitHub

1. Create a GitHub repository.
2. Commit this whole folder, including `src`, `server`, `prisma`, `assets`, `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `.env.example`, `README.md` and `ARCHITECTURE.md`.
3. Do not upload a real `.env` file with secrets.
4. For a frontend-only GitHub Pages preview, run:

```bash
npm run build
```

5. Deploy the generated `dist` folder with GitHub Pages, Netlify, Vercel or Cloudflare Pages.
6. For real login, signup, payments, referencing and signing, deploy the Express server and PostgreSQL database too. Render, Railway, Fly.io, Heroku, Supabase, Neon and Vercel Postgres all work as database/API hosts.

## Environment

Create `.env` from `.env.example` and fill:

```text
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
JWT_SECRET=replace-with-a-long-random-secret
PORT=8787
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://localhost:8787/api
```

For local product demos without a database, leave `VITE_DATA_MODE` unset and the React service layer will use local demo storage.
