# Plan 01-04 — Inngest Wiring (SUMMARY)

Status: Task 1 (automated) completed. Task 2 (human-verify Inngest Cloud +
Vercel env provisioning) is still open — see `<resume-signal>` in the plan.

## Versions installed (apps/web)
- `inngest@^4.2.5`

## SDK shape note (deviation from RESEARCH Pattern 1)

Inngest v4.2.x consolidated `createFunction({id}, {event}, handler)` into a
2-arg form: `createFunction({ id, triggers: [{ event }] }, handler)`. The
implementation in `apps/web/inngest/functions/health.ts` uses the 2-arg shape;
the RESEARCH Pattern 1 snippets reference the older 3-arg shape.

`InngestFunction` instance shape (declared in `inngest@4.2.5`):
- `healthCheck.id()` — getter method, returns `"health-check"` (stable)
- `healthCheck.opts.triggers` — readonly `Array<{ event: string, ... }>`
  (declared `readonly opts: TFnOpts` on the class)

Tests must read triggers via `.opts.triggers` (not `JSON.stringify`) — the
function instance has cycles (`client` ↔ `localFns`) and stringify throws.

## GET /api/inngest response shape (v4.2.5, dev mode)

`GET` returns a SUMMARY only — the per-function manifest is on POST.
Verified body shape:

```json
{
  "extra": { "native_crypto": true },
  "has_event_key": false,
  "has_signing_key": false,
  "function_count": 1,
  "mode": "dev",
  "schema_version": "2024-05-24"
}
```

The route test asserts `function_count >= 1` and `mode` is a string — these
contracts are stable across patch releases. The id-of-each-function check is
done via direct introspection in `health.test.ts` (W1 mitigation).

## Inngest dev-mode gate

Out of the box, the SDK boots into "cloud mode" and rejects unsigned requests.
Tests set `process.env.INNGEST_DEV = "1"` at the top of
`app/api/inngest/__tests__/route.test.ts`, then dynamically import the route,
so `serve()` registers in dev mode without needing a real signing key.
Production/preview deploys will set `INNGEST_SIGNING_KEY` instead (Task 2).

## Functions barrel pattern

`apps/web/inngest/functions/index.ts` exports `functions = [healthCheck] as const`.
Phase 5+ adds new functions in two steps:
1. Create `inngest/functions/<name>.ts` with **two** named exports — the pure
   `<name>Handler` async function and the `<name>` `createFunction(...)` wrapper.
2. Import it in the barrel and append to the array. No route handler edits.

Handler-as-named-export is the W1 pattern — keeps tests targeting our code
rather than Inngest's internal shape.

## Vitest path-alias resolution

Vitest doesn't read `tsconfig.json` paths. `apps/web/vitest.config.ts` maps
`@/*` → `./apps/web/*` so test files can `import { ... } from "@/inngest/client"`
matching the production import paths.

## Outstanding (Task 2)

Inngest Cloud provisioning + Vercel env keys are a dashboard-only flow —
deferred to the human-verify checkpoint. The local-smoke `<automated>` block
in the plan can be exercised once dev keys are populated.

## Verification (this plan's automated scope)
- `pnpm --filter @indiepilot/web typecheck` ✓
- `pnpm --filter @indiepilot/web test` — 6 inngest tests pass
- `pnpm --filter @indiepilot/web lint` ✓
