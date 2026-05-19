# ThreadMerge — Codespace Setup Guide

Step-by-step terminal commands for getting the project running in a fresh GitHub Codespace, after you've already done the manual Azure / M365 setup from Stage 0 of `BUILD.md`.

This guide assumes:
- Fresh Codespace just spun up against this repo
- You have your Azure AD client ID and client secret to hand
- You have an Azure Postgres connection string to hand
- You have a fresh Microsoft 365 Business Basic tenant set up

## Section 1 — One-time tools install

In the Codespace terminal:

```bash
# Verify Node version (should be 20+)
node --version

# Install pnpm globally
npm install -g pnpm@9

# Verify pnpm
pnpm --version
```

## Section 2 — Install dependencies

```bash
# From repo root
pnpm install
```

This pulls dependencies for all three apps + shared package. First run takes 3-5 minutes.

If you see peer dependency warnings, they're usually fine to ignore. Hard errors need fixing.

## Section 3 — Set up environment variables

Copy the example env files and fill in values:

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env

# Add-in
cp apps/addin/.env.example apps/addin/.env

# Dashboard
cp apps/dashboard/.env.example apps/dashboard/.env
```

Now edit each `.env` and fill in:

### `apps/backend/.env`

```
DATABASE_URL="postgresql://threadmergeadmin:YOUR_PASSWORD@threadmerge-db-dev.postgres.database.azure.com:5432/threadmerge?sslmode=require"
AZURE_CLIENT_ID=your-actual-client-id
AZURE_CLIENT_SECRET=your-actual-client-secret
PORT=4000
NODE_ENV=development
ALLOWED_ORIGINS=https://localhost:3000,http://localhost:3001
```

### `apps/addin/.env`

```
VITE_API_BASE=http://localhost:4000
VITE_AZURE_CLIENT_ID=your-actual-client-id
```

### `apps/dashboard/.env`

```
NEXT_PUBLIC_API_BASE=http://localhost:4000
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=run-openssl-rand-base64-32-to-generate
AZURE_AD_CLIENT_ID=your-actual-client-id
AZURE_AD_CLIENT_SECRET=your-actual-client-secret
AZURE_AD_TENANT_ID=common
```

Generate the NextAuth secret:

```bash
openssl rand -base64 32
```

Paste that value into `NEXTAUTH_SECRET`.

## Section 4 — Manifest configuration

The Office add-in manifest needs your real Azure AD client ID baked in.

Open `apps/addin/manifest.xml` and search for `REPLACE-WITH-YOUR-AZURE-AD-CLIENT-ID`. Replace **all four occurrences** with your actual client ID.

There's a shortcut:

```bash
# From repo root - replace YOUR_CLIENT_ID below with your actual ID
sed -i 's/REPLACE-WITH-YOUR-AZURE-AD-CLIENT-ID/YOUR_CLIENT_ID/g' apps/addin/manifest.xml

# Verify
grep -c 'YOUR_CLIENT_ID' apps/addin/manifest.xml
# Should print: 4
```

## Section 5 — Database setup

Make sure your Azure Postgres firewall allows your Codespace IP. The simplest approach for dev:

In the Azure portal, navigate to your Postgres server → Networking → Add 0.0.0.0 to 255.255.255.255 (allows all IPs).

**This is for dev only.** Production will use proper network rules.

Then create the database and apply the schema:

```bash
cd apps/backend

# Generate the Prisma client
pnpm prisma:generate

# Create the database and apply the schema
pnpm prisma:migrate

# When prompted for a migration name, type:
# init
# Then press Enter
```

Prisma will:
1. Connect to Azure Postgres
2. Create the `threadmerge` database if it doesn't exist
3. Apply the schema (creating Tenant, User, Template, AuditLogEntry, TenantSettings tables)
4. Generate the typed Prisma client

If it fails with a connection error, verify:
- Your `DATABASE_URL` is correct (especially the `?sslmode=require` suffix)
- The Postgres firewall allows your Codespace IP
- The admin password doesn't contain characters that need URL-encoding (if it does, encode them: `@` → `%40`, `:` → `%3A`, etc.)

To inspect the database visually:

```bash
pnpm prisma:studio
```

This opens Prisma Studio on port 5555 — Codespaces will offer to forward the port.

## Section 6 — Run the backend

```bash
# From apps/backend
pnpm dev
```

You should see:

```
ThreadMerge backend listening on port 4000
Environment: development
Allowed origins: https://localhost:3000, http://localhost:3001
```

Test it from another terminal (or by forwarding port 4000 in Codespaces):

```bash
curl http://localhost:4000/health
# Expected: {"status":"ok","timestamp":"...","env":"development"}
```

Keep this terminal running. The backend hot-reloads on file changes.

## Section 7 — Run the add-in (separate terminal)

Open a new terminal in Codespaces (Terminal → Split Terminal):

```bash
cd apps/addin
pnpm dev
```

You should see Vite start on `https://localhost:3000`. Note the **https** (Office add-ins require HTTPS even in dev).

In Codespaces, port 3000 will be forwarded automatically. Click the forwarded URL — if the browser shows a certificate warning, that's expected for the self-signed cert. Accept it and proceed.

To actually sideload this into Outlook, you'll need to:

1. Forward port 3000 publicly (or use Codespaces' public port forwarding feature)
2. Update `manifest.xml` URLs from `https://localhost:3000` to your Codespace's forwarded URL
3. Sideload the manifest into Outlook web (outlook.office.com → settings → add-ins → custom add-in)

For the first iteration of testing, it's often easier to test locally on your Windows machine — see "Local development for sideloading" below.

## Section 8 — Run the dashboard (separate terminal)

```bash
cd apps/dashboard
pnpm dev
```

Dashboard runs on `http://localhost:3001`. Open the forwarded URL in your browser.

You should see the placeholder home page.

## Section 9 — Verify the full stack

Three things should now be running:

1. Backend: `http://localhost:4000` (forwarded port)
2. Add-in: `https://localhost:3000` (forwarded port, HTTPS)
3. Dashboard: `http://localhost:3001` (forwarded port)

From the Codespace terminal:

```bash
curl http://localhost:4000/health
curl http://localhost:3001/
```

Both should return successfully.

The add-in needs to be loaded inside Outlook to do anything useful — the URL on its own just shows a blank page because Office.js never initialises outside of Outlook.

## Section 10 — Local development for sideloading

The realistic flow for testing add-ins is:

1. Run backend in Codespaces (with port 4000 forwarded publicly)
2. Run the add-in locally on Windows so it can sideload into Outlook desktop

To run the add-in locally:

```bash
# On Windows, after cloning the repo
cd apps/addin
pnpm install
pnpm dev
```

Then sideload via `npm start` which uses office-addin-debugging to launch Outlook with the add-in.

Update `apps/addin/.env` locally to point at the forwarded Codespaces backend URL:

```
VITE_API_BASE=https://your-codespace-name-4000.app.github.dev
```

## Common issues

### "Cannot find module @threadmerge/shared"

Re-run `pnpm install` from the repo root. The workspace symlinks sometimes need rebuilding.

### Backend fails to start: "Cannot find module @prisma/client"

```bash
cd apps/backend
pnpm prisma:generate
```

### Database migration fails: "Tenant required"

You're connecting to a tenanted Postgres. Use the connection string format from `.env.example` exactly. The `?sslmode=require` suffix is essential.

### Add-in SSO returns error 13003

Office can't validate the SSO token. Most common causes:
- Client ID in manifest doesn't match Azure AD app registration
- `access_as_user` scope not exposed in Azure AD app registration
- Office client IDs not added as authorised client applications in Azure AD

Revisit Stage 0.3 of BUILD.md.

### CORS errors from add-in to backend

Backend env `ALLOWED_ORIGINS` must include the exact origin the add-in is served from, including the port and protocol. For Codespaces, that's your forwarded URL, not localhost.

### "Port already in use"

```bash
# Find and kill the process
lsof -i :4000 | grep LISTEN
kill -9 <PID>
```

Or just close and reopen the terminal.

## Daily workflow

Once everything is set up, the daily workflow is:

```bash
# Terminal 1
cd apps/backend && pnpm dev

# Terminal 2
cd apps/addin && pnpm dev

# Terminal 3 (only when working on the dashboard)
cd apps/dashboard && pnpm dev
```

All three hot-reload on changes. Edits to `packages/shared` are picked up by all three apps automatically.

Commit at each stage acceptance:

```bash
git add .
git commit -m "Stage N: <description>"
git tag phase-1-stage-N-complete
git push origin main --tags
```
