#!/usr/bin/env bash
set -euo pipefail

# IndiePilot bootstrap — sets up a fresh local dev environment from a clean clone.
# Idempotent: safe to re-run.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

# Pretty output helpers
info()  { printf "\033[1;34m[bootstrap]\033[0m %s\n" "$*"; }
ok()    { printf "\033[1;32m[ok]\033[0m %s\n" "$*"; }
warn()  { printf "\033[1;33m[warn]\033[0m %s\n" "$*" >&2; }
fail()  { printf "\033[1;31m[fail]\033[0m %s\n" "$*" >&2; exit 1; }

# ---- Preflight ----
info "Checking prerequisites..."

command -v node     >/dev/null || fail "node 20+ required. Install via nvm: \`nvm install 20 && nvm use 20\`"
command -v corepack >/dev/null || fail "corepack required (ships with Node 20+). Install Node 20 via nvm."
command -v vercel   >/dev/null || fail "Vercel CLI required. Install: \`pnpm add -g vercel\`"

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[[ "${NODE_MAJOR}" -ge 20 ]] || fail "Node 20+ required (you have $(node -v))"

# Activate pnpm via corepack (handles version pinning from packageManager)
corepack enable >/dev/null 2>&1 || true
corepack prepare --activate >/dev/null 2>&1 || true

command -v pnpm >/dev/null || fail "pnpm not on PATH after corepack enable. Try: \`corepack enable && corepack prepare pnpm@latest --activate\`"

ok "Prerequisites satisfied (node $(node -v), pnpm $(pnpm -v), vercel $(vercel --version 2>&1 | head -1))"

# ---- Step 1: pnpm install ----
info "Step 1/4: pnpm install"
pnpm install --frozen-lockfile || {
  warn "Frozen-lockfile install failed — falling back to non-frozen install. If this is a fresh clone with a stale lockfile, this is expected."
  pnpm install
}
ok "Dependencies installed"

# ---- Step 2: vercel env pull ----
info "Step 2/4: vercel env pull (development environment) → apps/web/.env.local"

if [[ ! -f "apps/web/.vercel/project.json" ]]; then
  fail "apps/web/ is not linked to a Vercel project yet. Run once (interactive):
    \`vercel link --cwd apps/web\`
  then re-run \`pnpm bootstrap\`."
fi

# Vercel CLI 52.x quirk: pulling directly to apps/web/.env.local silently
# filters out some vars. Pulling to /tmp first then moving works around it.
TMP_ENV=$(mktemp)
vercel env pull --environment=development "${TMP_ENV}" --cwd apps/web --yes
mv "${TMP_ENV}" apps/web/.env.local

if [[ ! -f "apps/web/.env.local" ]]; then
  fail "vercel env pull completed but apps/web/.env.local does not exist. Verify your Vercel project has env vars set in the Development scope."
fi

# Sanity-check that critical env vars are present
REQUIRED_VARS=(DATABASE_URL LOG_HASH_SALT)
OPTIONAL_VARS=(AXIOM_TOKEN AXIOM_DATASET INNGEST_SIGNING_KEY INNGEST_EVENT_KEY NEON_BRANCH LOG_LEVEL)

for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^${var}=" apps/web/.env.local; then
    fail "Required env var ${var} missing from apps/web/.env.local. Set it in Vercel dashboard (Development scope) and re-run bootstrap."
  fi
done

for var in "${OPTIONAL_VARS[@]}"; do
  if ! grep -q "^${var}=" apps/web/.env.local; then
    warn "Optional env var ${var} not set. Some features (Axiom logging, Inngest preview-mode signing, log-level overrides) will be unavailable in local dev."
  fi
done

ok "Environment variables pulled (apps/web/.env.local)"

# ---- Step 3: pnpm db:migrate ----
info "Step 3/4: applying Drizzle migrations to your Neon dev branch"

# The db scripts read DATABASE_URL from process.env. dotenv-cli loads apps/web/.env.local.
pnpm dotenv -e apps/web/.env.local -- pnpm db:migrate || fail "db:migrate failed. Check that DATABASE_URL points at your personal Neon dev branch and that you have CREATE permission."

ok "Migrations applied"

# ---- Step 4: pnpm db:seed ----
info "Step 4/4: seeding fixture data"

pnpm dotenv -e apps/web/.env.local -- pnpm db:seed || fail "db:seed failed. If your branch already has rows, run \`pnpm db:reset\` to wipe and re-seed."

ok "Seed data inserted"

# ---- Done ----
printf "\n\033[1;32m✔\033[0m IndiePilot bootstrap complete.\n\n"
cat <<'EOF'
Next steps:
  • Start the dev server:    `pnpm dev`
  • Open the dashboard:      http://localhost:3000
  • Open Drizzle Studio:     `pnpm db:studio`
  • Inspect the audit log:   `pnpm db:studio` → audit_log table

Onboarding time goal: under 10 minutes (FOUND-01 success criterion #1).
Report it as a Phase 1 SUMMARY observation if your time was substantially over.
EOF
