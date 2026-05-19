# ThreadMerge — Phase 1 Build Document

A staged build plan for the working product in staging: an Office add-in for Outlook (web + new desktop) with full customisation UI, plus a Next.js web dashboard, plus a Node/Express backend, plus a Postgres database. All hosted on Azure, using free credits.

This document is designed to be fed into Claude Code or Cursor stage by stage. Each stage has clear acceptance criteria and a validation step before moving on. The total realistic timeline is 8-10 weeks of focused part-time work.

---

## What we're building

```
┌────────────────────────────────────────┐
│  Outlook (web + new desktop)            │
│   ┌──────────────────────────────────┐ │
│   │ Add-in task pane                 │ │
│   │ React + Vite + TS + Office.js    │ │
│   │ Azure Static Web Apps            │ │
│   └────────────┬─────────────────────┘ │
└────────────────┼───────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│  Backend API                            │
│  Node + Express + TypeScript            │
│  Azure App Service (B1 tier)            │
└────────────────┬───────────────────────┘
                 │
        ┌────────┴─────────┐
        ▼                  ▼
┌──────────────────┐   ┌─────────────────┐
│ Azure Database   │   │ Microsoft Graph │
│ for PostgreSQL   │   │ (read/send mail)│
│ Flexible Server  │   │                 │
└──────────────────┘   └─────────────────┘

┌────────────────────────────────────────┐
│  Web Dashboard                          │
│  Next.js + TypeScript                   │
│  Azure Static Web Apps                  │
└────────────────────────────────────────┘
```

Three apps, one backend, one database. Monorepo using pnpm workspaces.

---

## Working name

Continuing as "ThreadMerge" for the build. Real product name decision is a separate workstream that can happen in parallel without affecting code.

---

## Stack reference

- **Add-in frontend:** React 18 + Vite + TypeScript + Office.js + Tailwind CSS + shadcn/ui
- **Dashboard frontend:** Next.js 14 + TypeScript + Tailwind + shadcn/ui
- **Backend:** Node 20 + Express + TypeScript + Prisma
- **Database:** Azure Database for PostgreSQL Flexible Server (Burstable B1ms)
- **Auth:** Azure AD multi-tenant + Office SSO + on-behalf-of (OBO) flow
- **Hosting frontend:** Azure Static Web Apps
- **Hosting backend:** Azure App Service (B1 Linux)
- **CI/CD:** GitHub Actions
- **Monorepo:** pnpm workspaces

---

## Stage 0 — Prerequisites and accounts

**Goal:** Have all the accounts, tenants, and credentials needed before writing any code.

### 0.1 Microsoft 365 Business Basic tenant

- Sign up at microsoft.com/en-gb/microsoft-365/business/microsoft-365-business-basic
- Use the 30-day free trial
- Pick a tenant name that aligns with your eventual product name (e.g. `threadmergedev.onmicrosoft.com`). This is permanent.
- Create yourself as the global admin
- Add a second test user (cost: another £5/month) so you have an "internal team" to test with
- Verify you can log into admin.microsoft.com

### 0.2 Azure account

- Sign up for Azure free account at azure.microsoft.com if you haven't
- Activate your £200 free credit
- Note: link this Azure account to the same Microsoft account you used for the M365 tenant — makes auth and billing simpler

### 0.3 Azure AD multi-tenant app registration

In the Azure portal, in the same tenant as your M365 setup:

- Microsoft Entra ID → App registrations → New registration
- Name: `ThreadMerge-Dev`
- Supported account types: **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)**
- Redirect URI: Web → `https://localhost:3000/auth/callback` (we'll add Azure-hosted URIs later)
- Click Register
- Note the **Application (client) ID**
- Note the **Directory (tenant) ID**

Then configure:

- **Authentication:** Add a platform → Single-page application. Add redirect URIs:
  - `https://localhost:3000/taskpane.html` (add-in dev)
  - `http://localhost:3001` (dashboard dev)
  - Implicit grant: enable both ID tokens and access tokens
- **Certificates & secrets:** Create a new client secret. Save the value somewhere safe — you can't view it again.
- **API permissions:** Add Microsoft Graph delegated permissions:
  - `Mail.Read`
  - `Mail.ReadWrite`
  - `Mail.Send`
  - `User.Read`
  - `offline_access`
  - `openid`
  - `profile`
- **Expose an API:** 
  - Set Application ID URI to `api://[your-client-id]`
  - Add a scope: `access_as_user` with admin and user consent
  - Add authorized client applications: the Office.js client IDs (`d3590ed6-52b3-4102-aeff-aad2292ab01c` for Outlook desktop, `bc59ab01-8403-45c6-8796-ac3ef710b3e3` for Outlook web)

This is the most fiddly part of the entire build. Budget half a day. Microsoft's docs at learn.microsoft.com/en-us/office/dev/add-ins/develop/sso-in-office-add-ins are the authoritative source.

### 0.4 GitHub repository

- Create a new private repo: `threadmerge`
- Set up GitHub Codespaces access if you want to dev in the cloud (recommended for consistency with previous workflow)
- Add a `.gitignore` for Node, TypeScript, and `.env` files

### 0.5 Local prerequisites (if working locally rather than Codespaces)

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- Office Add-in dev certs: `npx office-addin-dev-certs install`

### Acceptance criteria for Stage 0

- ✅ M365 Business Basic tenant active with admin access
- ✅ Azure subscription active with £200 credit visible
- ✅ Azure AD app registration created with client ID, tenant ID, and client secret saved securely
- ✅ All required Graph permissions added
- ✅ `access_as_user` scope exposed
- ✅ Office client IDs added as authorized client applications
- ✅ GitHub repo created

**Do not move on until all of the above are true.** Auth is the most common point of failure in Office add-in development and the setup must be correct.

---

## Stage 1 — Monorepo scaffold

**Goal:** Get the three apps initialised in a monorepo structure with shared types and tooling. No functionality yet, just the skeleton.

### 1.1 Initialise the monorepo

In the repo root:

```bash
pnpm init
```

Edit `package.json`:

```json
{
  "name": "threadmerge",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev:addin": "pnpm --filter @threadmerge/addin dev",
    "dev:dashboard": "pnpm --filter @threadmerge/dashboard dev",
    "dev:backend": "pnpm --filter @threadmerge/backend dev",
    "build": "pnpm -r build"
  }
}
```

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Create the directory structure:

```bash
mkdir -p apps/addin apps/dashboard apps/backend packages/shared packages/ui
```

### 1.2 Scaffold the add-in (apps/addin)

Use the Office Yeoman generator inside `apps/addin`:

```bash
cd apps/addin
npx yo office --projectType taskpane --name addin --host outlook --js false
```

Choose React + TypeScript when prompted.

The generator creates a basic Office add-in. We'll heavily modify this in later stages, but for now just confirm it works:

```bash
pnpm install
pnpm start  # Should open Outlook and sideload the add-in
```

If sideloading is problematic, use Outlook web instead — go to outlook.office.com, click the add-in icon, "Get Add-ins" → "My add-ins" → "Add a custom add-in" → "Add from file" and select the manifest.xml.

Rename the package to `@threadmerge/addin` in its `package.json`.

### 1.3 Scaffold the dashboard (apps/dashboard)

```bash
cd ../dashboard
pnpm create next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Rename to `@threadmerge/dashboard` in package.json.

Test:

```bash
pnpm dev  # Should serve on http://localhost:3000
```

### 1.4 Scaffold the backend (apps/backend)

```bash
cd ../backend
pnpm init
pnpm add express cors helmet dotenv jsonwebtoken jwks-rsa @azure/msal-node @microsoft/microsoft-graph-client node-fetch@2 @prisma/client
pnpm add -D typescript ts-node-dev @types/node @types/express @types/cors @types/jsonwebtoken prisma
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Create `src/server.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';

const app = express();
const port = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
```

Add scripts to `package.json`:

```json
"scripts": {
  "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}
```

Rename to `@threadmerge/backend`.

Test: `pnpm dev` should start the server, `curl http://localhost:4000/health` should return ok.

### 1.5 Shared package

Create `packages/shared/package.json`:

```json
{
  "name": "@threadmerge/shared",
  "version": "0.1.0",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

`packages/shared/src/index.ts`:

```typescript
// Shared types between add-in, dashboard, and backend
export interface Message {
  id: string;
  subject: string;
  from: EmailAddress;
  toRecipients: EmailAddress[];
  ccRecipients: EmailAddress[];
  receivedDateTime: string;
  body: { contentType: 'html' | 'text'; content: string };
  bodyPreview: string;
}

export interface EmailAddress {
  name: string;
  address: string;
}

export interface MergeRequest {
  threadAId: string;
  threadBId: string;
  includedMessageIds: string[];
  redactions: Redaction[];
  messageOrder: string[]; // ordered list of message IDs
  recipients: EmailAddress[];
  subject: string;
}

export interface Redaction {
  messageId: string;
  startOffset: number;
  endOffset: number;
  replacement: string; // e.g., "[redacted]"
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  tenantId: string;
  timestamp: string;
  threadAId: string;
  threadBId: string;
  includedMessageCount: number;
  excludedMessageCount: number;
  redactionCount: number;
  recipientCount: number;
  internalRecipientCount: number;
  externalRecipientCount: number;
}
```

### Acceptance criteria for Stage 1

- ✅ pnpm monorepo with three apps and two shared packages
- ✅ Add-in scaffold runs locally and can be sideloaded into Outlook web
- ✅ Dashboard scaffold runs at localhost:3000
- ✅ Backend scaffold runs at localhost:4000 and responds to /health
- ✅ Shared types package importable from all three apps
- ✅ Repo committed to GitHub

---

## Stage 2 — Database and Prisma setup

**Goal:** Provision Azure Postgres, define the schema, generate the Prisma client.

### 2.1 Provision Azure Database for PostgreSQL

In Azure portal:

- Create a resource → Azure Database for PostgreSQL → Flexible Server
- Resource group: create new, name `threadmerge-rg`
- Server name: `threadmerge-db-dev`
- Region: UK South (or closest to you)
- PostgreSQL version: 16
- Workload type: Development
- Compute + storage: Configure server → Burstable, B1ms (1 vCore, 2 GiB RAM), 32 GiB storage. ~£10-12/month.
- Authentication: PostgreSQL authentication only
- Admin username: `threadmergeadmin`
- Password: generate a strong one, save it
- Networking: Allow public access from any Azure service AND your client IP (for dev access from Codespaces or local)
- Review + create

Wait ~5 minutes for provisioning. Note the **server name** (something like `threadmerge-db-dev.postgres.database.azure.com`).

Connection string format:
```
postgresql://threadmergeadmin:[password]@threadmerge-db-dev.postgres.database.azure.com:5432/postgres?sslmode=require
```

### 2.2 Initialise Prisma

In `apps/backend`:

```bash
npx prisma init
```

Edit `.env`:
```
DATABASE_URL="postgresql://threadmergeadmin:[password]@threadmerge-db-dev.postgres.database.azure.com:5432/threadmerge?sslmode=require"
```

(Note: `threadmerge` as the database name, not `postgres`. We'll create it.)

### 2.3 Define the schema

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id              String   @id @default(uuid())
  azureTenantId   String   @unique
  displayName     String?
  createdAt       DateTime @default(now())
  users           User[]
  templates       Template[]
  auditLogs       AuditLogEntry[]
  settings        TenantSettings?
}

model User {
  id              String   @id @default(uuid())
  azureUserId     String   @unique
  email           String
  displayName     String?
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  createdAt       DateTime @default(now())
  lastSeenAt      DateTime @default(now())
  templates       Template[]
  auditLogs       AuditLogEntry[]
}

model Template {
  id              String   @id @default(uuid())
  name            String
  description     String?
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  tenantId        String
  tenant          Tenant   @relation(fields: [tenantId], references: [id])
  isShared        Boolean  @default(false)
  redactionRules  Json     // array of regex patterns or fixed strings to redact
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model AuditLogEntry {
  id                      String   @id @default(uuid())
  userId                  String
  user                    User     @relation(fields: [userId], references: [id])
  tenantId                String
  tenant                  Tenant   @relation(fields: [tenantId], references: [id])
  timestamp               DateTime @default(now())
  threadAId               String
  threadBId               String
  threadASubject          String?
  threadBSubject          String?
  includedMessageCount    Int
  excludedMessageCount    Int
  redactionCount          Int
  recipientCount          Int
  internalRecipientCount  Int
  externalRecipientCount  Int
  recipientAddresses      Json     // array of recipient email addresses
  subject                 String
}

model TenantSettings {
  id                  String   @id @default(uuid())
  tenantId            String   @unique
  tenant              Tenant   @relation(fields: [tenantId], references: [id])
  enforceAuditLogging Boolean  @default(true)
  allowExternalMerge  Boolean  @default(true)
  defaultRedactions   Json?    // tenant-wide redaction rules
  updatedAt           DateTime @updatedAt
}
```

### 2.4 Run the first migration

```bash
npx prisma migrate dev --name init
```

This creates the database (if not exists) and applies the schema. The Prisma client is generated.

### 2.5 Verify

Create `src/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

Add a test endpoint to `src/server.ts`:

```typescript
import { prisma } from './db';

app.get('/db-test', async (req, res) => {
  const count = await prisma.tenant.count();
  res.json({ tenantCount: count });
});
```

Restart, curl `/db-test`, should return `{"tenantCount": 0}`.

### Acceptance criteria for Stage 2

- ✅ Azure Postgres Flexible Server running
- ✅ Connection from local backend to Azure DB succeeds
- ✅ Prisma schema applied
- ✅ /db-test endpoint returns count
- ✅ Prisma Studio works: `npx prisma studio` opens a GUI to inspect data

---

## Stage 3 — Authentication (the hard part)

**Goal:** Office add-in user signs in seamlessly via Office SSO. Backend validates the SSO token and exchanges it for a Graph token via the on-behalf-of flow.

This stage is the most likely to eat a week of fiddly time. Do it methodically.

### 3.1 Add Office SSO to the add-in manifest

Edit `apps/addin/manifest.xml`. Add the WebApplicationInfo block inside `VersionOverrides`:

```xml
<WebApplicationInfo>
  <Id>YOUR_CLIENT_ID_HERE</Id>
  <Resource>api://YOUR_CLIENT_ID_HERE</Resource>
  <Scopes>
    <Scope>access_as_user</Scope>
    <Scope>Mail.Read</Scope>
    <Scope>Mail.ReadWrite</Scope>
    <Scope>Mail.Send</Scope>
    <Scope>User.Read</Scope>
    <Scope>profile</Scope>
    <Scope>openid</Scope>
  </Scopes>
</WebApplicationInfo>
```

Replace `YOUR_CLIENT_ID_HERE` with the client ID from Stage 0.

### 3.2 Get the SSO token from the add-in

In `apps/addin/src/taskpane/components/App.tsx` (or equivalent):

```typescript
async function getSSOToken(): Promise<string> {
  try {
    const token = await Office.auth.getAccessToken({
      allowSignInPrompt: true,
      allowConsentPrompt: true,
      forMSGraphAccess: true,
    });
    return token;
  } catch (error: any) {
    console.error('SSO error:', error);
    throw error;
  }
}
```

### 3.3 Backend: validate SSO token, exchange via OBO

In `apps/backend/src/auth.ts`:

```typescript
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { ConfidentialClientApplication } from '@azure/msal-node';

const tenantId = 'common'; // multi-tenant

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

export async function validateSSOToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: `api://${process.env.AZURE_CLIENT_ID}`,
        issuer: [
          `https://login.microsoftonline.com/${tenantId}/v2.0`,
          // Multi-tenant: any tenant
        ],
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      }
    );
  });
}

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

export async function exchangeForGraphToken(ssoToken: string): Promise<string> {
  const result = await cca.acquireTokenOnBehalfOf({
    oboAssertion: ssoToken,
    scopes: [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/User.Read',
    ],
  });
  
  if (!result?.accessToken) {
    throw new Error('OBO token exchange failed');
  }
  
  return result.accessToken;
}
```

Update `.env`:
```
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

### 3.4 Auth middleware

`src/middleware/auth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { validateSSOToken, exchangeForGraphToken } from '../auth';

export interface AuthedRequest extends Request {
  user?: {
    azureUserId: string;
    azureTenantId: string;
    email: string;
    name: string;
  };
  graphToken?: string;
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  
  const ssoToken = authHeader.slice(7);
  
  try {
    const decoded: any = await validateSSOToken(ssoToken);
    const graphToken = await exchangeForGraphToken(ssoToken);
    
    req.user = {
      azureUserId: decoded.oid,
      azureTenantId: decoded.tid,
      email: decoded.preferred_username || decoded.upn,
      name: decoded.name,
    };
    req.graphToken = graphToken;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 3.5 First authenticated endpoint

```typescript
import { requireAuth } from './middleware/auth';

app.get('/api/me', requireAuth, async (req: AuthedRequest, res) => {
  // Upsert tenant and user
  const tenant = await prisma.tenant.upsert({
    where: { azureTenantId: req.user!.azureTenantId },
    create: { azureTenantId: req.user!.azureTenantId },
    update: {},
  });
  
  const user = await prisma.user.upsert({
    where: { azureUserId: req.user!.azureUserId },
    create: {
      azureUserId: req.user!.azureUserId,
      email: req.user!.email,
      displayName: req.user!.name,
      tenantId: tenant.id,
    },
    update: {
      email: req.user!.email,
      displayName: req.user!.name,
      lastSeenAt: new Date(),
    },
  });
  
  res.json({ user, tenant });
});
```

### 3.6 Test the full auth flow

From the add-in:

```typescript
const ssoToken = await getSSOToken();
const response = await fetch('http://localhost:4000/api/me', {
  headers: { Authorization: `Bearer ${ssoToken}` },
});
const data = await response.json();
console.log(data);
```

### Acceptance criteria for Stage 3

- ✅ Add-in successfully gets an SSO token from Office
- ✅ Backend validates the token without errors
- ✅ Backend exchanges for a Graph token via OBO
- ✅ /api/me returns the authenticated user, and user+tenant are created in Postgres
- ✅ Subsequent calls update lastSeenAt

**Common failure points:**
- Wrong client ID in manifest WebApplicationInfo
- `access_as_user` scope not exposed in Azure AD app registration
- Office client IDs not added as authorized client applications
- Token audience mismatch — must be `api://[client-id]`, not `[client-id]` alone
- Missing client secret in backend env

If this stage works end-to-end, you've cleared the hardest technical hurdle of the entire build.

---

## Stage 4 — Core merge engine (port from Phase 0)

**Goal:** Move the merge logic from the Phase 0 spike into the backend, exposed as an API.

### 4.1 Port graph.ts and merge.ts from Phase 0

Copy `src/graph.ts` and `src/merge.ts` from the Phase 0 repo into `apps/backend/src/`. 

Adjust to:
- Take an existing graph client (passed from request handler, using the OBO-exchanged token)
- Be functions, not a CLI

### 4.2 Endpoints

```typescript
// List recent conversations
app.get('/api/conversations', requireAuth, async (req: AuthedRequest, res) => {
  const client = getGraphClient(req.graphToken!);
  const conversations = await listRecentConversations(client, 20);
  res.json(conversations);
});

// Get full content of a conversation
app.get('/api/conversations/:id/messages', requireAuth, async (req: AuthedRequest, res) => {
  const client = getGraphClient(req.graphToken!);
  const messages = await getConversationMessages(client, req.params.id);
  res.json(messages);
});

// Preview a merge (returns merged HTML and recipient list without sending)
app.post('/api/merge/preview', requireAuth, async (req: AuthedRequest, res) => {
  const { threadA, threadB, includedMessageIds, redactions, messageOrder } = req.body;
  // Filter and reorder messages per user selections
  // Apply redactions
  // Return merged HTML + recipient list
  res.json({ mergedBody, recipients });
});

// Execute the merge: send the email and write audit log
app.post('/api/merge/send', requireAuth, async (req: AuthedRequest, res) => {
  // Build the merged email
  // Send via Graph
  // Write audit log entry
  // Return success + audit log ID
});
```

### Acceptance criteria for Stage 4

- ✅ /api/conversations returns the user's recent threads
- ✅ /api/conversations/:id/messages returns full content
- ✅ /api/merge/preview returns the merged HTML and recipient list
- ✅ /api/merge/send actually sends an email and creates an audit log entry
- ✅ Audit log entries visible in Prisma Studio

---

## Stage 5 — Add-in UI: basic merge flow

**Goal:** Working UI inside Outlook for the simple merge case (no customisation yet). Pick two threads, preview, send.

### 5.1 Install UI dependencies

```bash
cd apps/addin
pnpm add @radix-ui/react-dialog @radix-ui/react-checkbox @radix-ui/react-dropdown-menu lucide-react clsx tailwind-merge
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Set up shadcn/ui by following ui.shadcn.com/docs/installation/vite — adapt for the Office add-in context (the components themselves work fine, just adjust the install path).

### 5.2 Build the screens

Five screens for the add-in:

1. **Welcome / Auth** — first-run sign-in
2. **Thread A picker** — defaults to current open thread, or pick from list
3. **Thread B picker** — list of recent threads
4. **Preview** — shows merged content, recipient list, subject editor
5. **Confirmation** — sent, with link to audit log

State management: zustand is sufficient. Avoid Redux for this.

```bash
pnpm add zustand
```

### 5.3 API client

`src/lib/api.ts`:

```typescript
import { getSSOToken } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function authedFetch(path: string, options: RequestInit = {}) {
  const token = await getSSOToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export const api = {
  me: () => authedFetch('/api/me'),
  conversations: () => authedFetch('/api/conversations'),
  conversation: (id: string) => authedFetch(`/api/conversations/${id}/messages`),
  mergePreview: (data: any) => authedFetch('/api/merge/preview', { method: 'POST', body: JSON.stringify(data) }),
  mergeSend: (data: any) => authedFetch('/api/merge/send', { method: 'POST', body: JSON.stringify(data) }),
};
```

### Acceptance criteria for Stage 5

- ✅ Add-in opens in Outlook web with proper styling
- ✅ User can pick Thread A and Thread B from a usable UI
- ✅ Preview shows merged content correctly
- ✅ Send actually sends and shows confirmation
- ✅ Same flow works in new Outlook desktop on Windows

---

## Stage 6 — Customisation UI

**Goal:** The differentiator. Message picker with include/exclude, drag-to-reorder, inline redaction, live preview.

This is where the product earns its value vs a simple forward. Spend time here.

### 6.1 Message picker with checkboxes

For each message in both threads, render a card with:
- Checkbox to include/exclude
- From, To, Date, Subject metadata
- Expandable body
- Visual indicator of internal vs external sender (badge)

When the user toggles inclusion, the preview updates live.

### 6.2 Drag-to-reorder

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Default order is chronological. User can drag messages into any order. Preview reflects the order.

### 6.3 Inline redaction

When viewing a message body in the picker, the user can:
- Select text in the rendered HTML
- Click "Redact selection"
- Selected text becomes `[redacted]` in the merged output
- Or choose custom replacement text via a small prompt

Redactions are stored as `{ messageId, startOffset, endOffset, replacement }`. They apply only to the merged output, never to the source.

This is technically the trickiest UI element. Reasonable approach:
- Render the message body in a contenteditable=false container
- Use `window.getSelection()` to capture user selections
- Store redactions client-side, apply at preview/send time on the backend

### 6.4 Recipient picker with leak warnings

Show the deduplicated recipient list. Each recipient is a chip with:
- Name + email
- Internal/external badge
- Remove button

If the merge contains messages from recipient A that are about to be sent to recipient B who wasn't on the original of recipient A's messages: show a warning banner.

"Sarah's message from 14 Oct will now be visible to people who weren't on the original thread. Continue?"

### 6.5 Live preview

Right-hand side of the task pane (or below on smaller screens): rendered HTML preview of the final merged email. Updates as the user changes selections, order, and redactions.

### Acceptance criteria for Stage 6

- ✅ Per-message include/exclude works, with live preview update
- ✅ Drag-to-reorder works, with live preview update
- ✅ Text selection → redaction works, with [redacted] appearing in preview
- ✅ Recipient picker shows internal/external badges correctly
- ✅ Leak warning banner appears when appropriate
- ✅ Sent email matches what was shown in preview

---

## Stage 7 — Web dashboard

**Goal:** A separate Next.js app for managing templates, viewing audit logs, and configuring tenant settings.

### 7.1 Auth in the dashboard

Use NextAuth with the Microsoft provider, pointing at the same Azure AD app registration. User signs in with their Microsoft 365 account.

```bash
cd apps/dashboard
pnpm add next-auth
```

`app/api/auth/[...nextauth]/route.ts`: configure Microsoft provider.

### 7.2 Pages

- **/** — landing for logged-out users
- **/dashboard** — overview, recent merges, quick stats
- **/templates** — list, create, edit, delete templates
- **/audit-log** — searchable, filterable, exportable list of merge events
- **/settings** — tenant-level configuration (admins only)

### 7.3 API integration

The dashboard talks to the same backend as the add-in, using NextAuth's access token. Same OBO flow on the backend (it doesn't care which client sent the token).

### Acceptance criteria for Stage 7

- ✅ User can sign in to dashboard with M365 account
- ✅ Dashboard shows their merge history
- ✅ Audit log is searchable and exportable to CSV
- ✅ Templates can be created and applied from the add-in

---

## Stage 8 — Deployment to Azure

**Goal:** Everything running on Azure infrastructure, accessible via real URLs.

### 8.1 Backend → Azure App Service

- Create App Service: Linux, Node 20, B1 plan, name `threadmerge-api-dev`
- Set environment variables in Configuration (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, DATABASE_URL)
- Set up GitHub Actions deployment (Azure provides the YAML)

### 8.2 Add-in → Azure Static Web Apps

- Create Static Web App, point at the GitHub repo, set build path to `apps/addin/dist`
- Update manifest.xml URLs to point at the SWA URL
- Add the SWA URL as a redirect URI in Azure AD app registration

### 8.3 Dashboard → Azure Static Web Apps

- Separate SWA, point at `apps/dashboard`
- Next.js is officially supported

### 8.4 Verify end-to-end

- Sideload the add-in (now pointing at Azure-hosted URLs) into Outlook
- Run a merge
- Check audit log appears in dashboard
- Confirm everything works without anything running locally

### Acceptance criteria for Stage 8

- ✅ Backend reachable at `https://threadmerge-api-dev.azurewebsites.net`
- ✅ Add-in served from Azure SWA, sideloadable into Outlook
- ✅ Dashboard at its own SWA URL
- ✅ Full end-to-end flow works against deployed infrastructure
- ✅ At least one full merge logged in production database

---

## What you have at the end of Stage 8

A working product in staging, end-to-end, on Azure infrastructure:

- ✅ Office add-in for Outlook web and Outlook desktop, with full customisation UI
- ✅ Backend API with proper enterprise auth (OBO flow)
- ✅ Postgres database with proper schema for tenants, users, templates, audit logs
- ✅ Web dashboard for templates, audit, settings
- ✅ All hosted on Azure, well within the free credit envelope
- ✅ Monorepo with shared types and a clean deployment pipeline

This is enough to:
- Demo to your network
- Run customer discovery conversations with a real product
- Begin AppSource submission (Phase 9, not in this doc)
- Start onboarding pilot users for free, gathering real feedback

---

## What's deliberately not in Phase 1

- AppSource submission (separate workstream)
- Billing / Stripe integration (no payments yet)
- Microsoft Purview integration
- AI summarisation
- AI risk detection
- Gmail extension
- SOC 2 readiness

These all matter eventually but none of them need to happen before you have a working product to show people.

---

## Working through this doc

The recommended approach is one stage per week of focused part-time work, with the realistic expectation that Stage 3 (auth) and Stage 6 (customisation UI) will each take longer than the others.

Feed each stage into Claude Code or Cursor as a focused prompt. Don't try to do multiple stages at once — the validation step at the end of each is what catches problems before they compound.

Commit to GitHub at each stage acceptance. Tag with `phase-1-stage-N-complete` so you can revert cleanly if a later stage breaks something.

If you get stuck, the most likely places are:

1. Azure AD app registration configuration (revisit Stage 0.3)
2. Office SSO + OBO token validation (Stage 3 fundamentals)
3. CORS issues between the add-in (Azure SWA) and backend (Azure App Service) — make sure backend allows the SWA origin

Good luck. Steady wins.
