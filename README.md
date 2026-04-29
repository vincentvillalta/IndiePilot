# IndiePilot

A user taps "Join Beta" on an indie app in IndiePilot, gets a real TestFlight invite in their inbox a moment later — with zero developer effort beyond uploading their App Store Connect key once.

> **Status**: Phase 1 (Foundation) — scaffolding only. Public surface ships starting Phase 3.

## Repo Layout

| Path | What lives here |
|------|-----------------|
| `apps/web/` | Next.js 16 App Router web app (developer dashboard, public discovery API, Inngest functions) |
| `packages/db/` | Drizzle ORM schema, migrations, Faker seed, audit-log helper |
| `packages/ui/` | Shared shadcn/ui primitives + Tailwind v4 brand tokens |
| `tooling/eslint-config/` | Sidecar ESLint config hosting the `no-raw-log` custom rule |
| `tooling/tsconfig/` | Shared base tsconfig |
| `.github/workflows/` | CI gate + per-PR Neon preview branches + orphan-branch watchdog |
| `.planning/` | Project context, roadmap, requirements, phase plans + research |

The iOS apps live in **separate** sibling repos (not in this monorepo): `indiepilot-ios` (user app, Phase 4) and `indiepilot-ios-sdk` (SDK, Phase 7).

## Onboarding (4 steps, < 10 min)

Prerequisites:
- Node 20+ (`nvm install 20 && nvm use 20`)
- Vercel CLI (`pnpm add -g vercel`)
- Access to the IndiePilot Vercel project (Vincent invites contributors)
- A Neon branch off `main` for your dev work (Vincent provisions; e.g., `vincent-dev`)

### 1. Clone

```bash
git clone <repo-url> indiepilot
cd indiepilot
```

### 2. Link to Vercel (one-time, per machine)

```bash
vercel link --cwd apps/web
```

Choose the IndiePilot Vercel project. This creates `apps/web/.vercel/project.json` (gitignored, per-developer; the entire `apps/web/.vercel/` directory is gitignored — no `.gitkeep` needed).

### 3. Bootstrap

```bash
pnpm bootstrap
```

Runs four steps:
1. `pnpm install` — installs all workspace deps
2. `vercel env pull` — pulls Development-scope env vars to `apps/web/.env.local`
3. `pnpm db:migrate` — applies Drizzle migrations to your Neon dev branch
4. `pnpm db:seed` — inserts deterministic Faker fixture data (5 developers + 10 users per CONTEXT lock)

### 4. Run

```bash
pnpm dev
```

Open http://localhost:3000 — you should see the Phase 1 placeholder. Hit http://localhost:3000/api/inngest in another tab — it should return 200 with a JSON manifest containing the `health-check` function.

## Required env vars

Vincent populates these in the Vercel dashboard (Development + Preview + Production scopes). Bootstrap reads them via `vercel env pull`. Validated by `apps/web/lib/env.ts` at module load — missing required vars throw a Zod error before the request reaches business logic.

| Variable | Required | Source | Notes |
|----------|----------|--------|-------|
| `DATABASE_URL` | yes | Neon Console > your branch > pooled connection string | Per-developer Neon branch |
| `NEON_BRANCH` | yes | Your branch name (e.g., `vincent-dev`) | Used for cosmetic logging |
| `LOG_HASH_SALT` | yes | `openssl rand -hex 32` | Per-deploy salt for email-hash-in-logs unlinkability |
| `LOG_LEVEL` | optional | One of `trace \| debug \| info \| warn \| error \| fatal` | Overrides the per-environment default (`debug` in dev, `info` in preview, `warn` in production). Set to `debug` in any env for verbose troubleshooting. |
| `AXIOM_TOKEN` | optional in dev, required in preview/prod | Axiom Dashboard > Settings > API Tokens | When unset, logger falls back to stdout |
| `AXIOM_DATASET` | optional in dev, required in preview/prod | Axiom dataset name (e.g., `indiepilot`) | |
| `INNGEST_SIGNING_KEY` | optional in dev, required in preview/prod | Inngest Cloud > Apps > IndiePilot > Manage > Signing Keys | One per environment |
| `INNGEST_EVENT_KEY` | optional in dev, required in preview/prod | Inngest Cloud > Apps > IndiePilot > Manage > Event Keys | |

## Common commands

```bash
pnpm dev              # start Next.js dev server (apps/web)
pnpm build            # build all packages + Next.js production output
pnpm typecheck        # tsc --noEmit across the monorepo
pnpm lint             # Biome + ESLint sidecar
pnpm test             # Vitest across all packages

pnpm db:generate      # author a new Drizzle migration after schema edits
pnpm db:migrate       # apply pending migrations to current DATABASE_URL
pnpm db:studio        # open Drizzle Studio (web UI for local DB)
pnpm db:seed          # re-run the Faker seed
pnpm db:reset         # drop, re-migrate, re-seed (use freely on dev branches)
```

## CI

Every PR triggers two GitHub Actions:
- **CI**: typecheck + lint + test (must pass to merge)
- **Neon Preview Branch**: creates a fresh Neon branch named `pr-<NUMBER>`, applies migrations, comments on the PR. The branch is auto-deleted on PR close.

A daily watchdog cron sweeps any orphaned `pr-*` branches. Belt-and-suspenders for stale-branch cleanup.

## Phase status

See `.planning/ROADMAP.md` for full plan. Current: **Phase 1 — Foundation** (scaffolding only).

## License

Private — all rights reserved (until v1 launches publicly).
