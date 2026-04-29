# Plan 01-05 — CI Workflows (SUMMARY)

Status: Task 1 (workflow YAMLs) completed. Task 2 (NEON_API_KEY/NEON_PROJECT_ID
in GitHub + first-real-PR exercise + branch protection) is the human-verify
checkpoint.

## Files added
- `.github/workflows/ci.yml` — typecheck + lint + test gate on every PR + push to main
- `.github/workflows/neon-branch.yml` — per-PR Neon branch lifecycle (setup + migrate + comment / cleanup on close)
- `.github/workflows/neon-branch-watchdog.yml` — daily cron at 03:00 UTC sweeping orphaned `pr-*` branches (Pitfall 5 belt-and-suspenders)

## Action versions used
- `actions/checkout@v4`
- `pnpm/action-setup@v4` (`version: 10`)
- `actions/setup-node@v4` (Node 20, pnpm cache)
- `neondatabase/create-branch-action@v5` (uses `db_url_with_pooler` output)
- `neondatabase/delete-branch-action@v3`
- `actions/github-script@v7` (PR comment)

## CI/CD pattern notes

**ci.yml uses `concurrency: ci-${{ github.ref }} cancel-in-progress: true`** —
when a PR is force-pushed, the previous run is cancelled, saving runner minutes.

**neon-branch.yml's `db_url_with_pooler` output** is used (not the direct
`db_url`), matching what production uses. `drizzle-kit migrate` is one-shot
SQL apply so the pooler is fine.

**neon-branch-watchdog.yml uses gh CLI + Neon REST** — no third-party
dependency for the sweep beyond `curl` + `jq` + `gh`, all available on
`ubuntu-latest`.

## GitHub repo configuration (human-verify)

User has confirmed:
- `NEON_API_KEY` set as repository secret
- `NEON_PROJECT_ID` set as repository variable

Still required to fully close Task 2:
- Push these workflows to GitHub on a branch
- Open a real PR to exercise the lifecycle end-to-end
- Configure branch protection on `main` requiring `CI / check` and
  `Neon Preview Branch / setup` status checks before merge

## Verification (this plan's automated scope)

```
test -f .github/workflows/ci.yml                              ✓
test -f .github/workflows/neon-branch.yml                     ✓
test -f .github/workflows/neon-branch-watchdog.yml            ✓
grep -q "pnpm typecheck" .github/workflows/ci.yml             ✓
grep -q "pnpm lint" .github/workflows/ci.yml                  ✓
grep -q "pnpm test" .github/workflows/ci.yml                  ✓
grep -q "create-branch-action@v5" .github/workflows/neon-branch.yml ✓
grep -q "delete-branch-action@v3" .github/workflows/neon-branch.yml ✓
grep -q "pnpm db:migrate" .github/workflows/neon-branch.yml   ✓
```

The end-to-end exercise (PR open → branch created → migrations applied →
comment posted → PR close → branch deleted) is whitelisted as
`nyquist_exception: human-verify-checkpoint` in VALIDATION.md — the contract
can only be observed against the real GitHub + Neon integration once.
