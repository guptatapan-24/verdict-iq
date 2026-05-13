# Local VerdictIQ Setup

This workspace now runs locally with Supabase PostgreSQL (no local database storage).

## Prerequisites

- Node.js 22+
- A Supabase project with database access
- pnpm. This repo has a local pnpm installed at `.local/npm-tools/node_modules/.bin/pnpm.cmd` to avoid requiring global Windows shims.

```powershell
.local\npm-tools\node_modules\.bin\pnpm.cmd --version
```

## Environment

`.env.local` has already been created from `.env.local.example`.
Update `DATABASE_URL` to your Supabase Postgres connection string.

Replace these placeholders before using authenticated app flows:


Optional overrides:
- `AI_INTEGRATIONS_GROQ_BASE_URL` (defaults to Groq OpenAI-compatible endpoint)
- `AI_INTEGRATIONS_GROQ_MODEL` (defaults to `llama-3.3-70b-versatile`)

The public Clerk key from the Replit config is already copied into `.env.local`.

## First-Time Setup

```powershell
.local\npm-tools\node_modules\.bin\pnpm.cmd local:setup
```

This installs dependencies and pushes the Drizzle schema into your Supabase database.

## Run Locally

```powershell
.local\npm-tools\node_modules\.bin\pnpm.cmd local:dev
```

- Web app: `http://localhost:5173`
- API server: `http://localhost:8080`
- Health check: `http://localhost:8080/api/healthz`

## Database

Use your Supabase connection string in `.env.local`:

```text
postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
```
