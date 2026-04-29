# Plan 01-06 — Bootstrap + README (SUMMARY)

Status: Task 1 (script + README + scripts wiring) completed. Task 2
(cold-clone-to-running smoke + VALIDATION.md task-ID population) is the
human-verify checkpoint.

## Files added / modified
- `scripts/bootstrap.sh` — executable bash, idempotent, runs the four
  bootstrap steps with required/optional env-var sanity checks
- `README.md` — top-level project README with the 4-step onboarding flow,
  env-var checklist (including the `LOG_LEVEL` row per W2 fix), repo layout,
  common commands
- `package.json` — `bootstrap` script now points at `bash ./scripts/bootstrap.sh`;
  added `dotenv-cli@^7.4.4` as a workspace-root devDependency so the script's
  `pnpm dotenv -e apps/web/.env.local -- <cmd>` invocations work without a
  `--filter`

## Bootstrap script flow

```
preflight (node 20+, corepack, pnpm, vercel CLI)
  ↓
1/4 pnpm install --frozen-lockfile (falls back to non-frozen on stale lockfile)
  ↓
2/4 vercel env pull (fails if apps/web/.vercel/project.json absent — points
    user at `vercel link --cwd apps/web`); validates DATABASE_URL +
    LOG_HASH_SALT present; warns on missing optional vars
  ↓
3/4 pnpm dotenv -e apps/web/.env.local -- pnpm db:migrate
  ↓
4/4 pnpm dotenv -e apps/web/.env.local -- pnpm db:seed
  ↓
done; prints next-steps and onboarding-time goal
```

## Discretionary decisions
- **Bash over TS** — bash is one less dep, fails fast with `set -euo pipefail`,
  and the four steps are linear. CONTEXT delegates language choice; bash is
  the lighter option.
- **`pnpm dotenv` (not `pnpm dotenv-cli`)** — the bin shipped by `dotenv-cli`
  is `dotenv` (singular). The plan referenced `pnpm dotenv-cli`; I used the
  actual bin name.
- **No `apps/web/.vercel/.gitkeep`** — entire `**/.vercel/` is gitignored
  (Plan 01); a placeholder would either be ignored or require an untrack
  rule. README documents this explicitly.

## Outstanding (Task 2 / human-verify)

The cold-clone wall-clock smoke (FOUND-01 #1: "under 10 minutes from `git
clone` to `pnpm dev`") + the VALIDATION.md task-ID rollup is the only piece
left. Whitelisted as `nyquist_exception: human-verify-checkpoint` because
the wall-clock measurement is fundamentally human-timed.

Pre-flight readiness:
- ✓ Vercel project linked from `apps/web/`
- ✓ Plan 01-05 secrets/variables set on the GitHub repo
- ✗ Plan 01-04 Task 2 (Inngest signing keys + remaining env vars on Vercel)
  still open — bootstrap will fail at step 2/4's required-vars check until
  `DATABASE_URL` + `LOG_HASH_SALT` are populated in the Development scope

## Verification (automated)

```
test -x scripts/bootstrap.sh                                     ✓
bash -n scripts/bootstrap.sh                                     ✓ (syntax)
grep -q '"bootstrap": "bash ./scripts/bootstrap.sh"' package.json ✓
test -f README.md                                                ✓
grep -q "pnpm bootstrap" README.md                               ✓
grep -q "vercel link --cwd apps/web" README.md                   ✓
grep -q "LOG_LEVEL" README.md                                    ✓
grep -q "LOG_LEVEL" scripts/bootstrap.sh                         ✓
```

Whole-monorepo `pnpm typecheck && pnpm -r lint && pnpm -r test` green.
