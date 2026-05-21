# Nootro

> Unlock new abilities for your inbox. Merge threads, share selectively, prove authenticity & forward with confidence.

An Outlook add-in that adds new abilities to your inbox: combine separate email threads, add an email into a running thread, redact sensitive content before sharing, and (in development) prove cryptographically that quoted content hasn't been tampered with.

Previously known as ThreadMerge. Domain: [nootro.ai](https://nootro.ai).

---

## What it does

Nootro gives your inbox abilities it didn't have before:

- **Merge threads** — Combine two separate email conversations into a single outbound email. Pick which messages to include, drag to reorder, redact sensitive content, deduplicate recipients across both threads.
- **Add to thread** — Take an email from elsewhere in your mailbox and add it into an existing running thread, with your own note above the quoted content. Supports attachment carry-over and inline redaction of the source.
- **Share selectively** — Per-message inclusion checkboxes, selection-based redaction with `[EMAIL REDACTED BY SENDER]` markers, internal/external recipient classification with warnings before send.
- **Prove authenticity** (in development) — Every captured message is hashed (SHA-256 over canonical headers + body + attachments). Recipients can verify content integrity at a public URL.

Every action writes to a tamper-evident audit log persisted in Postgres.

## Status

**Phase 1 active development.** Stages 1 through 6.5 complete and running end-to-end against a real Microsoft 365 tenant. Verification feature (Stage 6.5+) partially built.

| Stage | Goal | Status |
|---|---|---|
| 1 | Monorepo scaffold | ✅ Complete |
| 2 | Postgres schema provisioned | ✅ Complete |
| 3 | Auth end-to-end (Office SSO + OBO + Graph) | ✅ Complete |
| 4 | Backend pipeline verified | ✅ Complete |
| 5 | End-to-end merge UI | ✅ Complete |
| 6 | Controlled disclosure (per-message, drag-reorder, redaction) | ✅ Complete |
| 6.5 | Inject mode ("Add to thread") with attachments | ✅ Complete |
| 6.5+ | Verification (SHA-256 hashing, public verify endpoint) | ⏳ In progress |
| 7 | Web dashboard (audit log viewing, templates, settings) | ⏳ Not started |
| 8 | Deploy to Azure (real domain, SPF/DKIM/DMARC, AppSource) | ⏳ Not started |

## Architecture

Monorepo using pnpm workspaces.

```
nootro/
├── apps/
│   ├── addin/          React + Vite + TypeScript + Office.js + Tailwind + @dnd-kit + Zustand
│   ├── backend/        Node + Express + TypeScript + Prisma
│   └── dashboard/      Next.js 14 (placeholder until Stage 7)
└── packages/
    └── shared/         Shared TypeScript types
```

**Authentication:** Microsoft Entra ID multi-tenant app + Office Dialog API + MSAL + On-Behalf-Of flow to obtain Graph tokens.

**Database:** Azure Postgres Flexible Server (Burstable B1ms). Schema covers tenants, users, templates, audit log entries, captured messages (for verification), and per-recipient tokens.

**Hosting:** Codespaces for development. Azure App Service + Static Web Apps planned for Stage 8.

## Quick start (development)

```bash
# Install
pnpm install

# Migrate database (requires DATABASE_URL in apps/backend/.env)
cd apps/backend && pnpm exec prisma migrate dev

# Run dev servers
pnpm dev:backend   # Port 4000
pnpm dev:addin     # Port 3000

# In Codespaces, ensure both ports are public:
gh codespace ports visibility 3000:public 4000:public -c $CODESPACE_NAME
```

Sideload the add-in manifest in Outlook web via https://aka.ms/olksideload.

## Two real-world use cases

These are the use cases that shaped the product direction:

1. **Shipment delay** — A carrier emails you about a delay on shipment ABC-123. You need to add that update to your team's running conversation about the shipment, with a quick note: "Here's what they sent, here's what we're doing about it." Single source message + existing destination thread.

2. **Credit control evidence** — You emailed a courier in June to cancel your account. Months later their credit control team is still invoicing, and your accounts team has been roped in. You want to chime in on the resolution thread with the receipts of your earlier cancellation requests. Multiple historical messages + current destination thread + cryptographic proof of authenticity.

The second use case is what motivated the verification feature direction. The product genuinely lets you prove things, not just claim them.

## Positioning

Nootro is a dual-buyer product:

- **The user** (account manager, project lead, consultant) feels relief and competence. ~£10/month Pro tier. Removes branded footer, unlocks unlimited use, saved templates.
- **The enterprise** (legal, IT, compliance, risk) gets defensible audit trails and cryptographic evidence. ~£15-25/seat/month. Admin controls, SSO/SCIM, Purview integration, custom retention.

The productivity layer drives adoption from the bottom up. The compliance layer unlocks budget from the top down. Both layers run on the same product.

## What makes it different

Compared with Microsoft Copilot in Outlook (which summarises single threads) and email security products (which restrict sharing), Nootro does something neither does: it enables *controlled* sharing of multi-thread context with cryptographic integrity proofs. Microsoft is structurally unlikely to build this — it cuts against Copilot's enablement positioning. Mimecast/Proofpoint sit on the wrong side of the problem (they say "don't share that," we say "share this, the right way").

The defensibility isn't in any single mechanic. It's in the combination: per-message disclosure, inline redaction, audit trail, cryptographic hash, multi-tenant architecture, all in one workflow that maps to how people actually work.

## Working tenant

- Tenant: `threadmerge.onmicrosoft.com`
- Primary test user: `Luke@threadmerge.onmicrosoft.com`
- Azure AD app: ThreadMerge-Dev, client ID `c3399ec5-7478-4e25-99bf-e87bdc3c237a`, multi-tenant
- Postgres: `threadmerge.postgres.database.azure.com`

Renaming to a Nootro-aligned tenant happens at Stage 8.

## License

To be determined. Likely commercial.