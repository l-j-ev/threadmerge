# ThreadMerge

Outlook add-in that lets users merge two separate email threads into a single onward conversation, with full control over what's shared. Per-message selection, inline redaction, deduplicated recipients, auditable disclosure record.

## Status

Phase 1 — Building the working product in staging. See `BUILD.md` for the full stage-by-stage build doc.

## Project structure

```
threadmerge/
├── apps/
│   ├── addin/         Office add-in (React + Vite + Office.js)
│   ├── backend/       Node + Express + Prisma + Graph API
│   └── dashboard/     Web dashboard (Next.js)
├── packages/
│   └── shared/        Shared types across all apps
└── BUILD.md           The full Phase 1 build plan
```

## Tech stack

- **Add-in:** React 18, Vite, TypeScript, Office.js, Tailwind CSS, shadcn/ui
- **Dashboard:** Next.js 14, TypeScript, Tailwind, shadcn/ui
- **Backend:** Node 20, Express, TypeScript, Prisma
- **Database:** Azure Database for PostgreSQL (Flexible Server)
- **Auth:** Azure AD multi-tenant + Office SSO + on-behalf-of flow
- **Hosting:** Azure (Static Web Apps + App Service)

## Quick start

See `SETUP.md` for the full Codespace setup with step-by-step terminal commands. The short version:

```bash
# Install pnpm
npm install -g pnpm

# Install dependencies
pnpm install

# Set up environment variables (copy and fill in)
cp apps/backend/.env.example apps/backend/.env
cp apps/addin/.env.example apps/addin/.env
cp apps/dashboard/.env.example apps/dashboard/.env

# Run all three apps (in separate terminals)
pnpm dev:backend    # http://localhost:4000
pnpm dev:addin      # https://localhost:3000
pnpm dev:dashboard  # http://localhost:3001
```

## Working through the build

The `BUILD.md` document defines 9 stages from prerequisites to deployment. Each stage has clear acceptance criteria. Tag commits at each stage acceptance:

```bash
git tag phase-1-stage-N-complete
```

Don't try to do multiple stages at once. The validation step at the end of each is what catches problems before they compound.
