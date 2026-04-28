# Project Research Summary

**Project:** IndiePilot
**Domain:** Two-sided marketplace — TestFlight discovery for indie iOS apps (Next.js web dashboard + SwiftUI iOS app + optional iOS SDK + App Store Connect API broker)
**Researched:** 2026-04-28
**Confidence:** HIGH overall (with MEDIUM-confidence flags on Apple TOS interpretation, per-minute ASC rate limits, and dual-Better-Auth-instance ergonomics)

## Executive Summary

IndiePilot is a two-sided marketplace whose entire competitive wedge is a single sentence: **tap "Get" on an indie TestFlight app and the invite arrives in your inbox a moment later, without the user copy-pasting an email or the developer doing anything.** Direct competitors (departures.to, airport.community) prove the demand for a TestFlight directory but leave that magic moment on the table; bigger adjacent products (Firebase App Distribution, Canny, Product Hunt, BetaList) each cover one fragment of the value prop. No incumbent does discovery + ASC-API-driven onboarding + per-app feedback together. That intersection is defensible if — and only if — the install flow is reliable, fast, and legally sound.

The recommended approach is a **prescriptive, boring, managed-services stack**: Next.js 15 (App Router, Node runtime) on Vercel, Neon Postgres with Drizzle, Better-Auth (two instances — cookie-based for devs, bearer-based for end users with Sign in with Apple), Inngest for durable background jobs, AWS KMS envelope encryption for developer `.p8` keys, Resend + React Email for transactional mail, and Cloudflare R2 for screenshots. The iOS app is SwiftUI-native (iOS 17+ deployment, Swift 6 strict concurrency, URLSession + `Codable`, no Alamofire/Combine). The optional SDK is **source-distributed via SPM with zero external dependencies** so it doesn't pollute consumer apps. Critically, the architecture **never calls Apple's ASC API inline from a user-facing request** — every `Get` tap returns 202 in <50ms after enqueueing an Inngest job that handles KMS decrypt, ES256 JWT signing, and ASC retries with per-developer concurrency isolation.

The risks are concentrated in four buckets that must be designed for from day one, not bolted on later: **Apple TOS ambiguity** around "service providers using TestFlight on a developer's behalf" (mitigation: contractual self-service framing + a fallback public-link data field + legal opinion before paid tier); **App Review rejection of the iOS app itself** under guidelines 4.3, 4.7, and 5.6.3 (mitigation: brand as Indie/TestFlight discovery, not "App Store" — rename "Get" to "Join Beta", drop public ranked leaderboards from first submission); **`.p8` key compromise blast radius** (mitigation: KMS envelope encryption with `encryptionContext` binding, OIDC federation to AWS, audit log on every decrypt, plaintext never on disk, never in cache); and **cold-start marketplace death spiral** (mitigation: pre-seed 50–100 indie apps via concierge onboarding before public iOS launch, beachhead one niche, hold paid tier until liquidity exists). The path through is to build the security foundation early when surface area is small, ship the magic moment as a vertical slice with all its edge cases, and resist scope creep on the SDK and analytics layers that compete with mature incumbents.

## Key Findings

### Recommended Stack

The stack is locked in at HIGH confidence on every major decision. It is opinionated toward a solo developer with a "do it right, don't over-engineer" timeline: managed services where the value is undifferentiated, custom code only at the wedge.

**Core technologies (web):**
- **Next.js 15 (App Router) + React 19 + TypeScript 5.6+** — full-stack framework, project constraint; Server Components and Server Actions are 2026 norm; Node runtime (not Edge) for ASC + KMS + AWS SDK compatibility.
- **Vercel + Neon Postgres 16** — project constraint; Neon branching gives per-PR DB previews; HTTP driver for Route Handlers, Pool/WS driver for Inngest functions.
- **Drizzle ORM (~0.36) + drizzle-kit** — TypeScript-first, ~7KB bundle, ~500ms cold starts vs Prisma's 1–3s; SQL-first feel suits an analytics-heavy dashboard.
- **Better-Auth 1.6+ (two instances)** — `/api/auth/dev/*` cookie sessions for the dashboard, `/api/auth/user/*` bearer plugin for the iOS app; Drizzle adapter; owns the user table (which Clerk does not). Auth.js team has effectively redirected new projects here.
- **Inngest** — durable background jobs purpose-built for Vercel; per-developer concurrency + throttle for ASC rate-limit isolation; free tier (50k runs/mo) covers v1.
- **AWS KMS + `@aws-crypto/client-node`** — envelope encryption for `.p8` keys with `encryptionContext: { developerId }`; OIDC federation from Vercel (no static AWS keys in env vars); CloudTrail audit.
- **`jose`** — single JWT library for both ES256 ASC signing and Sign in with Apple JWKS verification.
- **Resend + React Email + Tailwind v4 + shadcn/ui + Zod + pino + next-safe-action + Cloudflare R2 (S3-compatible) + sharp** — supporting cast; all selected for solo-dev DX.

**Core technologies (iOS app, separate repo `indiepilot-ios`):**
- **Swift 6.0 strict concurrency, SwiftUI, iOS 17+ deployment** — covers ~95% of active devices; `@Observable`, `ContentUnavailableView`.
- **URLSession + `Codable` + `@Observable` + Sign in with Apple (`AuthenticationServices`)** — stdlib only; explicit non-deps: no Alamofire, no Combine, no SwiftData.
- **Keychain Services** for the bearer token — never UserDefaults, never iCloud-synced.

**Core technologies (iOS SDK, separate repo `indiepilot-ios-sdk`):**
- **Source-distributed Swift Package, zero external dependencies, Swift 6 strict, iOS 17+, PrivacyInfo.xcprivacy** — explicitly NOT XCFramework, NOT CocoaPods, NOT auto-init. One entry-point `IndiePilot.configure(apiKey:)` plus 2–3 SwiftUI views.

See STACK.md for full rationale, alternatives, version pins, and the explicit "what not to use" list.

### Expected Features

The competitive landscape splits cleanly into five categories — TF discovery directories, beta distribution incumbents, indie launch sites, feedback/voting tools, and indie creator dashboards — and IndiePilot occupies the intersection. The "one-tap install" column is empty everywhere except IndiePilot; that single column being filled is the defensible position.

**Must have (table stakes — break v1 if missing):**
- iOS user surface: browseable feed (Today/Week buckets), App Store-grade detail page, search + category filter, anonymous browsing, auth wall only at "Get" (email/password + Sign in with Apple), one-tap install with state machine (Get → Testing / Full / Waitlisted), waitlist auto-promotion + email, **privacy disclosure modal at install** ("your email goes to [Developer Name]") — required for GDPR + Apple review.
- Developer dashboard: email/password auth, ASC `.p8` upload with encryption-at-rest **and rotate/revoke UI**, multi-app connect, listing publish with **draft/preview state**, auto-publish, per-app full-slots behavior toggle, full funnel dashboard (views → Get → invites sent → invites accepted estimated), source attribution, aggregated feedback inbox + email notifications, feature-vote leaderboard with **status states (Open/Planned/In Progress/Shipped)**, **read-only tester list per app**, **per-app branded share link**, **build/version display**, **What's New / changelog field per app**, **verified developer badge** (implicit from valid `.p8`).
- Trust & safety minimum: **report-app affordance** on every detail page; routing to admin email is acceptable in v1.
- Brand & design: modern/playful design system (Product Hunt / Arc DNA, **NOT App Store clone** — directly tied to App Review rejection risk).

**Should have (differentiators — earn the right to exist):**
- One-tap TestFlight install via ASC API automation (THE wedge).
- Slot-aware UX (Full / Waitlist / Auto-promote) — first-class concept; nobody else acknowledges the 10K cap.
- Per-app feedback inbox + vote leaderboard, **bundled inside discovery** (no separate Canny portal at $19–359/mo).
- Source attribution into the funnel (devs have ~zero ASO/attribution today).
- Optional iOS SDK that surfaces feedback + voting **inside the developer's TF build** — closes the loop.
- Indie/playful brand — differentiates from enterprise-dashboard look of Firebase/Canny.

**Defer (v1.x or v2+):**
- iOS SDK itself — opt-in, ship after 10+ devs request it.
- Editorial / "Featured" curation — needs supply liquidity first.
- Save/bookmark apps, multi-tester-group support, custom domains on share links, webhooks for devs.
- Push notifications, Android, cross-platform SDK, sponsored placement, crash reporting in SDK — explicitly out of scope per PROJECT.md; do not pre-build.
- Star ratings, public comment threads, in-product DM with developer, AI-generated listings, referral/viral mechanics — **add to PROJECT.md Out of Scope** to prevent drift.

See FEATURES.md for the full competitor matrix, MVP definition, prioritization (P1/P2/P3), and the **12 gaps** that should be added to PROJECT.md's Active list before roadmap planning.

### Architecture Approach

The architecture is a Next.js monolith on Vercel that fronts three client surfaces (web dashboard, iOS app, third-party iOS SDK) with **strict isolation**: distinct auth, distinct API namespaces (`/api/v1/*` for the iOS app, `/api/sdk/v1/*` for the SDK), and a hard rule that **ASC API calls happen only inside Inngest functions, never inside Route Handlers**. The critical-path "Get" tap returns 202 Accepted in <50ms after enqueueing an Inngest event; all the slow, unreliable, rate-limited work (KMS Decrypt → ES256 JWT signing → ASC HTTP call → response parsing → retries) happens asynchronously with per-developer concurrency partitioning so Dev A's throttling never affects Dev B's users.

**Major components:**
1. **Next.js Dashboard (RSC + Server Actions)** — developer UI, cookie-auth, all forms wrapped with `next-safe-action` + Zod; gated by Better-Auth dev instance.
2. **Public Discovery + Install + Feedback APIs (`/api/v1/*`)** — Route Handlers for the iOS app; bearer auth via Better-Auth user instance; install endpoint returns 202 + status token, never blocks on Apple.
3. **SDK API (`/api/sdk/v1/*`)** — separate namespace authenticated by per-app `ip_pk_<appId>_<rand>` keys plus an anonymous `installId`; **strictly no PII access**.
4. **Inngest functions (`asc.invite`, `asc.health`, `waitlist.promo`, `email.digest`, `stats.rollup`)** — the durable async layer; the only place ASC is called; per-developer concurrency = 5, throttle = 200/min; idempotent on `(userId, appId)`.
5. **ASC Broker library (`lib/asc/*`)** — encapsulates KMS Decrypt → in-memory `.p8` → JWT sign → ASC HTTP → Zod-validate → audit log; **lint-enforced unimportable from Route Handlers**.
6. **KMS Crypto library (`lib/crypto/*`)** — envelope encryption with `encryptionContext: { developerId }`; OIDC-federated to AWS; plaintext `.p8` lives only inside one Inngest function execution and is never cached.
7. **Two Better-Auth instances** — devs (cookie, web) at `/api/auth/dev/*`, end-users (bearer, iOS, with SIWA) at `/api/auth/user/*`; separate user tables.
8. **iOS App** — SwiftUI native, separate repo, talks only to `/api/v1/*`; Keychain-backed bearer session; SIWA primary path because verified Apple ID emails dramatically improve TF invite deliverability.
9. **iOS SDK** — separate public repo, zero deps, talks only to `/api/sdk/v1/*` with anonymous identity; PrivacyInfo manifest declaring exact data collected.
10. **Funnel events table** — single `install_events` table fed from three sources (iOS pageviews, server-side install attempts, optional SDK first-launch), with per-step confidence labels surfaced in the dashboard so devs see "estimated installs (install SDK for exact)".

The architecture explicitly **avoids** Vercel Edge runtime for ASC/KMS routes (Node crypto + AWS SDK requirements), Vercel Queues for v1 (Inngest is more battle-tested), and any caching of plaintext `.p8` (cache the *signed JWT* per-developer per Vercel instance for ~15 min instead — bounded blast radius because Apple caps JWT lifetime at 20 min anyway).

See ARCHITECTURE.md for component diagrams, data-flow sequences, six trust boundaries, Vercel-feature-by-feature usage guidance, and the suggested 9-phase build order.

### Critical Pitfalls

1. **Apple TOS — "service provider using TestFlight on your behalf"** (SHOWSTOPPER if interpreted strictly). Avoid: contractually frame the relationship as developer self-service, require devs to create their own ASC keys with minimum role, never centralize keys under an IndiePilot ASC account, store a **public-link fallback field per app from day one**, get a written legal opinion before the paid tier launches.
2. **App Store Review rejection of the IndiePilot iOS app itself** (SHOWSTOPPER). Guidelines 4.3, 4.7, and 5.6.3 all apply. Avoid: brand as TestFlight/Indie discovery (NOT "App Store"), **rename "Get" to "Join Beta"**, no five-star rating widgets, **strip public ranked leaderboards from first review submission** (re-add after first approval), explicit TestFlight handoff sheet.
3. **`.p8` key compromise** (SHOWSTOPPER if it happens). Avoid: KMS envelope encryption from day one (never AES-with-env-key, never pgcrypto), `encryptionContext: { developerId }` binding catches row-swap attacks, audit log every Decrypt, rotation UI in <60s, OIDC federation to AWS, Pino redaction allowlist so `.p8` and JWTs never reach logs.
4. **ASC API rate limits at marketplace scale** (SERIOUS). Apple's 3,600/hour is **per-key**, plus an undocumented ~300/min ceiling. Avoid: per-developer Inngest concurrency + throttle, exponential backoff with jitter on 429, batch tester adds, surface `x-rate-limit` headroom in the dashboard, **never call ASC inline from a Route Handler**.
5. **TestFlight email delivery is Apple's black box** (SERIOUS). Avoid: explicit post-Get UX ("Apple will email you within ~5 min, check spam"), self-serve resend button, recommend Sign in with Apple as primary path, funnel instrumentation on "TF invite accepted", public-link fallback for opt-in devs.

PITFALLS.md catalogs **14 named pitfalls** total. Pitfalls 5 (cold-start), 6 (`.p8` blast radius), 7 (GDPR data-controller risk), 8 (auto-publish abuse), 9 (vote brigading), 10 (10K slot management), and 13 (over-engineering) are all SERIOUS and must be designed into early phases.

## Implications for Roadmap

Suggested 9-phase build order:

1. **Foundation** — tooling + dev auth + audit log; unblocks everything.
2. **Developer Onboarding (Security Foundation)** — KMS envelope encryption + ASC key upload + `asc.health` Inngest job + app publish; the highest-stakes security phase, shipped early when scope is small.
3. **Public Surface (Web)** — user auth + SIWA + public discovery API + ISR share-link pages.
4. **iOS App** — SwiftUI native, design system (NOT App Store clone), discovery + auth + search.
5. **The Wedge (Magic Moment)** — `/api/v1/install` + `asc.invite` Inngest function + slot-full UX + privacy disclosure modal + "Join Beta" CTA. The single highest-stakes feature.
6. **Feedback Loop** — feedback inbox + voting + status states + brigading defenses. Public rankings deferred to post-Apple-approval.
7. **Funnel + Operational Polish** — install events + attribution + waitlist auto-promote + tester list + What's New.
8. **iOS SDK** — deferrable; opt-in per dev; ship only after 10+ requests. Strict scope (feedback + voting only).
9. **Trust & Safety + Launch Prep** — report flow + key rotate UI + soft-hold review + perceptual image diff + alerting + load test.

### Phase Ordering Rationale

- **Foundation → Onboarding → Public Surface → iOS App → Wedge** is the unique correct ordering: each phase's output is the next phase's input.
- **Security foundation in Phase 2, not later.** "AES with env-key for v1, KMS later" is the classic shortcut that becomes irrecoverable once 50 devs have uploaded keys.
- **Slot-full UX ships with Get tap (Phase 5).** Same feature.
- **Feedback before Funnel** because feedback is the retention hook.
- **iOS SDK after Funnel (Phase 8)** because it's opt-in and explicitly deferrable.
- **Trust & Safety last (Phase 9)** because most components benefit from real product context.
- **Marketing/cold-start activities run in parallel** with Phases 5–9 as concierge work.

### Research Flags

Phases likely needing deeper research during planning (`/gsd:research-phase`):

- **Phase 2 (Developer Onboarding / Security Foundation):** AWS KMS + OIDC federation specifics; verify Neon's pgsodium availability if KMS feels heavy; validate Inngest `asc.health` weekly job pattern against current 3.x docs.
- **Phase 3 (Public Surface):** **Two-Better-Auth-instances** pattern is MEDIUM confidence — verify against current Better-Auth 1.6+ docs at scaffold time; fallback is one instance with a `userType` field. Also verify SIWA's Hide-My-Email private-relay address actually receives Apple's TF invite emails.
- **Phase 5 (The Wedge):** The highest-stakes phase; deep research on every ASC error code, the exact `betaTesters` vs `betaGroups/{id}/relationships/betaTesters` POST patterns, idempotency semantics, and Apple's eventual-consistency behavior. Also: the iOS deep-link-to-TestFlight matrix.
- **Phase 9 (Trust & Safety):** Apple TOS interpretation for "service provider on TF" — the legal opinion is here. Also the perceptual image diff approach needs an implementation choice.

Phases with standard patterns (skip research-phase): Phase 1 (Foundation), Phase 4 (iOS App), Phase 6 (Feedback Loop), Phase 7 (Funnel), Phase 8 (iOS SDK).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Every major decision verified against official docs and 2026-current sources; MEDIUM only on exact version pins (Drizzle 0.36 vs 1.0 RC) and Neon's pgsodium availability — both flagged inline. |
| Features | HIGH | Direct competitors fetched and analyzed; PROJECT.md's Active list survives market validation with no item misguided (only **12 gaps to add**). |
| Architecture | HIGH | Built on top of locked stack choices; data flows traced end-to-end with edge cases enumerated; Vercel feature usage explicitly mapped. MEDIUM only on dual-Better-Auth-instance ergonomics. |
| Pitfalls | MEDIUM-HIGH | Apple TOS interpretation is the genuine unknown — Apple has not publicly enforced against RevenueCat-class ASC API usage, but IndiePilot's third-party-end-user flow is novel. ASC per-minute rate limit (~300) is community-verified, not Apple-documented. |

**Overall confidence:** HIGH — the stack, architecture, and feature scope are decisively recommended; the genuine risks (Apple TOS, ASC rate limits at scale, App Review rejection) are all named, mitigated, and have warning signs + recovery strategies documented.

### Gaps to Address

- **Apple TOS interpretation (Pitfall #1):** Cannot be fully resolved without a legal opinion. Build the public-link fallback data field per app from Phase 2 onward. Get a written legal opinion before launching the paid tier.
- **SIWA Hide-My-Email → TestFlight invite deliverability:** MEDIUM confidence. Phase 5 spike: set up a test SIWA account with private relay, run one full Get tap, confirm the email lands.
- **ASC API per-minute rate limit specifics:** ~300/min is community-reported, undocumented by Apple. Throttle Inngest to 200/min/developer; read `x-rate-limit` headers; surface budget consumption in the dashboard.
- **Two-Better-Auth-instances pattern:** MEDIUM confidence. Verify at Phase 3 scaffold time; fallback is one instance with a `userType` field.
- **PROJECT.md Active list has 12 gaps** (privacy disclosure, ASC key revoke/rotate, listing draft/preview, tester list, feedback email notifications, build/version display, What's New field, vote-status states, share link, verified-dev badge, report-app affordance, transactional-email-provider decision). Add to the Active list before roadmap planning.
- **PROJECT.md Out of Scope additions:** no follow graph, no public comments, no star ratings, no in-product DM, no AI-generated listings, no referral mechanics. Add to prevent scope drift.
- **Cold-start strategy is operational, not technical:** Pre-seeding 50–100 indie apps via concierge onboarding runs alongside Phases 1–9.

## Sources

### Primary (HIGH confidence)
- Better Auth docs (Installation, Drizzle Adapter, Bearer Plugin, Apple SIWA)
- Drizzle ORM Neon driver split docs
- Inngest Next.js Quick Start + Serving Functions docs
- AWS Encryption SDK for JS docs (envelope encryption, encryptionContext, commitment policy)
- Apple ASC API docs (Add Beta Tester to Beta Group, Create Beta Tester, Generating Tokens for API Requests, Identifying Rate Limits)
- Apple Sign in with Apple identity-token verification + private email relay docs
- Apple Developer Program License Agreement (Service Provider clause)
- App Store Review Guidelines (4.3, 4.7, 5.6.3)
- Vercel Fluid Compute + Function maxDuration docs
- Resend + Next.js docs; React Email v3 changelog
- Departures.to and Airport Community (direct competitors fetched)
- Apple Distributing Binary Frameworks as Swift Packages
- Apple Invite external testers (10K cap)
- Andrew Chen on marketplaces — cold-start canonical reference

### Secondary (MEDIUM confidence)
- Apple Developer Forums — ASC Rate Limits thread (community-verified ~300/min)
- Apple Developer Forums — TF invite emails not received
- LogRocket: Best Auth Library for Next.js 2026
- Drizzle vs Prisma in 2026
- Resend vs Postmark vs SES 2026
- Cloudflare R2 vs Vercel Blob 2026
- Canny vs Featurebase 2026
- iOS App Development in 2026 Guide (Swift 6 strict concurrency)
- RevenueCat community: ASC API Key TOC ambiguity (Pitfall #1)
- Reforge: Beat the cold start problem in a marketplace
- GDPR controller vs processor (Usercentrics)

### Tertiary (LOW confidence — needs validation during execution)
- pgsodium availability on Neon — alternative to KMS, not currently chosen
- Two-Better-Auth-instances ergonomics — verify at Phase 3 scaffold time
- SIWA Hide-My-Email private-relay → TF invite deliverability — Phase 5 spike

---
*Research completed: 2026-04-28*
