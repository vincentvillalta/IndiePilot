# Roadmap: IndiePilot

**Defined:** 2026-04-28
**Granularity:** standard (target 5-8 phases)
**Mode:** yolo (parallelization enabled)
**Total v1 requirements:** 96
**Phases:** 7

## Strategy

The build order respects the research-derived dependency chain (Foundation -> Security -> Public Surface -> iOS App -> Wedge -> Feedback/Funnel -> SDK/Trust/Launch). Two consolidations against the research's 9-phase suggestion bring the structure into the standard granularity band:

1. **Phase 6 merges Feedback Loop with Funnel + Attribution** — these surfaces both flow from existing user activity in the wedge, share data plumbing (`install_events`, `votes`, `feedback`), and the developer dashboard renders them side-by-side. Splitting them introduces an artificial boundary mid-dashboard.
2. **Phase 7 merges iOS SDK with Trust & Safety + Launch Prep** — all three are post-wedge hardening work; the SDK is genuinely deferrable per research and shares operational concerns (per-app keys, abuse defenses, soft-hold review) with trust & safety. Bundling them into one closing phase keeps focus on "ready to face the public" rather than fragmenting the closing stretch.

**Brand & design** is treated as a parallel track touching multiple phases (BRAND-01/02 paper concept and design-prompt baseline in Phase 2 alongside the dashboard scaffold; BRAND-04 web Tailwind/shadcn applied throughout Phases 2-3; BRAND-03/05 iOS design system in Phase 4). It is not isolated into its own late phase.

**Concierge pre-seeding (LAUNCH-01)** is operational work that runs alongside Phases 5-7 — Vincent personally onboarding 30-50 indie devs while engineering proceeds. It is tracked as a Phase 7 requirement for completeness but the work begins much earlier; that note is preserved here so plan-phase doesn't treat it as a sequential build task.

**Hard constraints honored:**
- KMS envelope encryption + ASC key upload (Phase 2) ships *before* public discovery API (Phase 3) — security foundation precedes public surface, never the reverse.
- Slot-full UX (WEDGE-09/10/11) ships in the same phase as the "Join Beta" tap (Phase 5) — same feature, same release.
- Public ranked feature leaderboard in iOS (FB-12) is gated to post-Apple-approval; it lives in Phase 6 but the requirement explicitly mandates the gate.
- SDK is its own combined late phase (Phase 7), opt-in per developer.
- "Get" is renamed to "Join Beta" everywhere user-facing per Apple App Review risk mitigation.

## Phases

- [ ] **Phase 1: Foundation** - Project scaffolding, tooling, baseline schema, and observability skeleton
- [ ] **Phase 2: Developer Onboarding & Security Foundation** - Dev auth, ASC `.p8` key upload with KMS envelope encryption, audit log, and brand baseline
- [ ] **Phase 3: Developer App Management & Public Discovery API** - App publishing flow, screenshots, draft/preview, and the public read API the iOS app will consume
- [ ] **Phase 4: iOS App — Discovery & Auth** - SwiftUI native iOS app, user auth (email + Sign in with Apple), feed + detail + search, with non-App-Store-mimicry design system
- [ ] **Phase 5: The Wedge (Magic Moment)** - "Join Beta" tap, async ASC tester-add via Inngest, slot-full UX, waitlist auto-promotion, privacy disclosure modal
- [ ] **Phase 6: Feedback Loop, Funnel & Attribution** - Written feedback inbox, feature voting with brigading defenses, install funnel, source attribution, tester list
- [ ] **Phase 7: iOS SDK, Trust & Safety, Launch Prep** - Optional iOS SDK, abuse mitigations (soft-hold, perceptual hash, vote anomaly), DSAR/GDPR ops, App Review submission readiness

## Phase Details

### Phase 1: Foundation

**Goal**: A working Next.js 15 monorepo on Vercel with Drizzle migrations, Inngest wired in, and structured logging that redacts secrets — Vincent can push a PR and see migrations run against a Neon preview branch.

**Depends on**: Nothing (first phase)

**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05

**Success Criteria** (what must be TRUE):
1. A new contributor can clone the repo, run one bootstrap command, and have a working dev environment hitting a fresh Neon branch in under 10 minutes.
2. Opening a PR triggers CI that runs Drizzle migrations against a per-PR Neon preview branch and reports pass/fail.
3. Hitting the `/api/inngest` health endpoint returns 200 and the health-check function executes when triggered.
4. Calling a logger that includes a fake `.p8` blob, JWT, or password in its payload writes a log line where those fields are redacted before transport.
5. The `developers`, `users`, `sessions`, and `audit_log` tables exist in the database and Drizzle generates type-safe queries against them.

**Plans**: 6 plans

Plans:
- [ ] 01-01-PLAN.md — Workspace bootstrap (pnpm + Turborepo + Next.js 16 scaffold + Biome/ESLint sidecar + Vitest stubs) [Wave 1]
- [ ] 01-02-PLAN.md — Database package (Drizzle 0.45 + Neon HTTP/Pool + 4 schema tables + audit helper + Faker seed) [Wave 2]
- [ ] 01-03-PLAN.md — Logging + custom ESLint rule (Pino redaction + @axiomhq/pino transport + hashEmail + no-raw-log rule) [Wave 2]
- [ ] 01-04-PLAN.md — Inngest wiring (client + health.check + serve() route + signing-key provisioning) [Wave 2]
- [ ] 01-05-PLAN.md — CI + per-PR Neon preview branches (ci.yml + neon-branch.yml + watchdog cron) [Wave 3]
- [ ] 01-06-PLAN.md — Bootstrap script + Vercel linking + README (cold-clone-to-running under 10 min) [Wave 3]

---

### Phase 2: Developer Onboarding & Security Foundation

**Goal**: A developer can create an account, upload their App Store Connect API key, and have it encrypted at rest with KMS envelope encryption — with full audit trail, rotation UI, and a weekly health-check cron — before any public surface exists.

**Depends on**: Phase 1

**Requirements**: DEV-AUTH-01, DEV-AUTH-02, DEV-AUTH-03, DEV-AUTH-04, DEV-AUTH-05, DEV-AUTH-06, DEV-KEY-01, DEV-KEY-02, DEV-KEY-03, DEV-KEY-04, DEV-KEY-05, DEV-KEY-06, DEV-KEY-07, DEV-KEY-08, OPS-09, BRAND-01, BRAND-02, BRAND-04

**Success Criteria** (what must be TRUE):
1. A developer can sign up with email + password, verify their email, sign in across browser refreshes, sign out, and reset a forgotten password.
2. A developer can upload a `.p8` file plus key ID and issuer ID; the plaintext never touches disk and never appears in any log line; the ciphertext in the database is bound to that developer via KMS `encryptionContext`.
3. A developer can rotate their key in under 60 seconds via the dashboard — the new key takes effect immediately and the old key's ciphertext is purged.
4. Every KMS Decrypt call leaves an entry in `audit_log` with timestamp, developer ID, and the purpose (e.g., `asc.invite`, `asc.health`).
5. A weekly Inngest cron `asc.health` exercises each developer's key against the ASC API and surfaces failures as a banner in the dashboard.
6. Before the upload form, the developer sees a clear explanation of how the key is stored and a click-through Data Processing Agreement; they cannot upload without consenting.
7. The dashboard renders in the IndiePilot brand system (Tailwind v4 + shadcn/ui, paper-airplane-meets-pilot-wings identity) — not generic shadcn defaults.

**Plans**: TBD

---

### Phase 3: Developer App Management & Public Discovery API

**Goal**: A developer can import their apps from ASC, publish listings with screenshots and copy, and the resulting catalog is queryable through a public read API ready to feed the iOS app.

**Depends on**: Phase 2

**Requirements**: DEV-APP-01, DEV-APP-02, DEV-APP-03, DEV-APP-04, DEV-APP-05, DEV-APP-06, DEV-APP-07, DEV-APP-08, DEV-APP-09, DEV-APP-10, DEV-APP-11, DEV-APP-12

**Success Criteria** (what must be TRUE):
1. A developer can click "Import from App Store Connect" and see their apps populate with name, bundle ID, and icon pulled via the ASC API using their stored key.
2. A developer can compose a listing (screenshots uploaded to R2 with EXIF stripped and resized via `sharp`, long description, category, external links, What's New, build/version) and save it as a draft, preview it, then publish it — the listing goes live immediately with no manual review.
3. A developer can edit any field of a published listing, unpublish without deleting, or delete a listing entirely.
4. A developer sets per-app full-slots behavior (`waitlist` or `hide`) and can change it later.
5. A developer can store a public TestFlight join link as a fallback per app — used if ASC API fails or as Apple-TOS hedge.
6. A public, unauthenticated `GET /api/v1/discovery/*` endpoint returns published listings (feed, detail, search by name/developer, category filter) with response shapes ready for the iOS app to consume.

**Plans**: TBD

---

### Phase 4: iOS App — Discovery & Auth

**Goal**: A real SwiftUI iOS app users can install (via TestFlight to themselves first) that browses published indie betas, lets users search and filter, and supports both anonymous browsing and Sign in with Apple — without mimicking the App Store.

**Depends on**: Phase 3

**Requirements**: USER-AUTH-01, USER-AUTH-02, USER-AUTH-03, USER-AUTH-04, USER-AUTH-05, USER-AUTH-06, USER-AUTH-07, DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, BRAND-03, BRAND-05

**Success Criteria** (what must be TRUE):
1. A new iOS user can open the app and immediately browse a Today/This Week/Categories feed of published indie TestFlight apps without being prompted to sign in.
2. An iOS user can tap an app, see screenshots, description, What's New, version, developer name, and a verified-developer badge if the developer has a valid ASC key.
3. An iOS user can search by app name or developer, filter by category, and pull-to-refresh the feed.
4. An iOS user can sign in with Apple (primary path) or email + password (secondary), and their session persists via Keychain across app relaunches; signing out clears the Keychain token.
5. An iOS user can report an app from its detail page; the report routes to admin email.
6. The iOS app's visual design (light + dark moods) is recognizably Product Hunt / Arc DNA — no App Store-blue gradients, no chart-icon mimicry, no "Today" tab arrangement, no five-star rating widgets.

**Plans**: TBD

---

### Phase 5: The Wedge (Magic Moment)

**Goal**: An iOS user taps "Join Beta" on an app, sees a privacy disclosure, gets an HTTP 202 in under 100ms, and receives a real TestFlight invite from Apple within minutes — with slot-full waitlist, auto-promotion, and resilient ASC error handling. This is the single feature the product exists to ship.

**Depends on**: Phase 4

**Requirements**: WEDGE-01, WEDGE-02, WEDGE-03, WEDGE-04, WEDGE-05, WEDGE-06, WEDGE-07, WEDGE-08, WEDGE-09, WEDGE-10, WEDGE-11, WEDGE-12, WEDGE-13, WEDGE-14, WEDGE-15, WEDGE-16, OPS-10

**Success Criteria** (what must be TRUE):
1. An iOS user taps "Join Beta" on an app detail page, is prompted to authenticate if needed (and the install flow resumes after auth), sees a per-Get privacy disclosure modal naming the developer their email will be shared with, gives explicit consent, and the request returns HTTP 202 + an attemptId in under 100ms — the response never waits on Apple.
2. The Inngest function `asc.invite` runs after the 202: KMS Decrypt -> ES256 JWT sign -> ASC `betaTesters` POST with retries; per-developer concurrency caps at 5 and throttle caps at 200/min; tester adds are idempotent on `(userId, appId)` so double-taps and retries never produce duplicates.
3. After tapping, the user sees a status-aware Join Beta button that transitions Idle -> Sending -> Check your email -> Testing (or -> Waitlist when slots are full); a non-actionable "Testing" indicator with deep-link to TestFlight appears post-install; explanatory copy says "Apple will email you within ~5 minutes; check spam."
4. When an app's slots are full and behavior is `waitlist`, the user is queued, sees their position, and is automatically promoted by `waitlist.promo` when a slot opens — receiving a Resend transactional email confirming the TF invite was sent. When behavior is `hide`, the button shows "Full" and is disabled.
5. An iOS user can resend their TF invite from a Library view if the original didn't arrive, and ASC errors (rate limit, invalid email, slot full, key revoked, app not in TF) surface as user-friendly statuses rather than raw error codes.

**Plans**: TBD

---

### Phase 6: Feedback Loop, Funnel & Attribution

**Goal**: Once users are flowing through the wedge, developers can see exactly what's happening — funnel from view to install, source attribution, written feedback inbox, feature voting leaderboard with status states — and users can leave feedback and vote without enabling brigading.

**Depends on**: Phase 5

**Requirements**: FB-01, FB-02, FB-03, FB-04, FB-05, FB-06, FB-07, FB-08, FB-09, FB-10, FB-11, FB-12, FUN-01, FUN-02, FUN-03, FUN-04, FUN-05, FUN-06, FUN-07, FUN-08, FUN-09

**Success Criteria** (what must be TRUE):
1. An iOS user can submit written feedback (with optional screenshot) and upvote/downvote feature requests on an app's detail page; voting is idempotent per Apple ID per item, votes can be withdrawn, and per-user rate limits + an anomaly-detection job quarantine suspicious velocity patterns.
2. A developer sees a unified feedback inbox across all their apps, with search, filter, mark-as-read/archive/star, and a feature-vote leaderboard sorted by upvote count with status states (Open / Planned / In Progress / Shipped) they can change.
3. A developer receives a daily Resend email digest of new feedback.
4. A developer's dashboard shows a complete funnel — Views -> Join Beta taps -> Emails captured -> Invites sent -> Invites accepted (estimated, hourly-synced from ASC `betaTesters.state`) -> Installs — with each step labeled HIGH / MEDIUM / "Install SDK for exact" confidence.
5. Source attribution captures direct, search, featured, and per-app branded share-link sources; the developer can copy a per-app share link from the dashboard; a read-only tester list per app is visible and refreshes hourly.
6. The public ranked feature leaderboard in the iOS app exists in code but is hidden behind a feature flag until the IndiePilot iOS app passes its first Apple App Review approval, at which point it is re-enabled.

**Plans**: TBD

---

### Phase 7: iOS SDK, Trust & Safety, Launch Prep

**Goal**: IndiePilot is ready to face the public — the optional iOS SDK is published, abuse defenses are live, GDPR/DSAR processes are operable, the iOS app is App-Review-ready, and 30-50 concierge-onboarded apps are seeded so the marketplace launches with liquidity.

**Depends on**: Phase 6

**Requirements**: SDK-01, SDK-02, SDK-03, SDK-04, SDK-05, SDK-06, SDK-07, SDK-08, SDK-09, SDK-10, SDK-11, OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06, OPS-07, OPS-08, LAUNCH-01, LAUNCH-02, LAUNCH-03, LAUNCH-04, LAUNCH-05, LAUNCH-06

**Note on parallelism:** LAUNCH-01 (concierge pre-seeding 30-50 indie apps) is operational, not engineering, work. It begins as soon as Phase 5's wedge is demonstrably reliable and runs in parallel with Phases 5-7 engineering. Treat its checkbox here as the close-out point ("seeding goal achieved") rather than a sequential start.

**Success Criteria** (what must be TRUE):
1. A third-party iOS developer can add IndiePilot's Swift Package (`indiepilot-ios-sdk`) with zero external dependencies, call `IndiePilot.configure(apiKey:)` once, drop in `IndiePilotFeedbackButton` or `IndiePilotFeedbackView`, and see feedback land in the same dashboard inbox tagged `source=sdk` — with a published `PrivacyInfo.xcprivacy`, semver releases, and a public README.
2. A developer can issue, rotate, and revoke per-app SDK keys (`ip_pk_<appId>_<rand>`) from the dashboard; SDK requests authenticate against `/api/sdk/v1/*` using those keys plus an anonymous installId — the SDK never reports end-user PII.
3. Operational defenses are live: Resend bounce webhooks surface to developers (OPS-01), centralized Pino->Axiom logging with redaction allowlist (OPS-02), an alert fires when `asc.invite` failure rate exceeds 5%/hour (OPS-03), the first listing per developer enters a soft-hold queue (OPS-04), perceptual-hash similarity flags icons matching top-100 App Store apps (OPS-05), per-developer trust tiers gate features (OPS-06), a public sub-processor list is published (OPS-07), and a documented DSAR workflow exists and has been dry-run end-to-end (OPS-08).
4. The IndiePilot iOS app is ready for first Apple App Review submission: the public ranked leaderboard is feature-flagged off, "Get" is renamed to "Join Beta" throughout, App Review notes (LAUNCH-02) frame the app as TestFlight discovery, the Apple Private Email Relay forwarding domain is registered (LAUNCH-06), and a web-first launch path is documented as fallback if Apple Review takes multiple cycles (LAUNCH-03).
5. A load test against a sandbox developer's ASC key under bursty traffic (LAUNCH-04) shows zero 429 cascades and graceful per-key throttling; a pen test of the key-handling code path (ASC + KMS + Inngest) (LAUNCH-05) finds no critical issues; 30-50 indie apps have been concierge-onboarded and are publishing real listings (LAUNCH-01).

**Plans**: TBD

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/6 | In Progress|  |
| 2. Developer Onboarding & Security Foundation | 0/0 | Not started | - |
| 3. Developer App Management & Public Discovery API | 0/0 | Not started | - |
| 4. iOS App — Discovery & Auth | 0/0 | Not started | - |
| 5. The Wedge (Magic Moment) | 0/0 | Not started | - |
| 6. Feedback Loop, Funnel & Attribution | 0/0 | Not started | - |
| 7. iOS SDK, Trust & Safety, Launch Prep | 0/0 | Not started | - |

## Coverage

- v1 requirements: 96 total
- Mapped to phases: 96 (100%)
- Unmapped: 0

| Category | Count | Phase(s) |
|----------|-------|----------|
| FOUND | 5 | Phase 1 |
| DEV-AUTH | 6 | Phase 2 |
| DEV-KEY | 8 | Phase 2 |
| DEV-APP | 12 | Phase 3 |
| USER-AUTH | 7 | Phase 4 |
| DISC | 7 | Phase 4 |
| WEDGE | 16 | Phase 5 |
| FB | 12 | Phase 6 |
| FUN | 9 | Phase 6 |
| SDK | 11 | Phase 7 |
| OPS | 10 | Phase 2 (OPS-09), Phase 5 (OPS-10), Phase 7 (OPS-01..08) |
| BRAND | 5 | Phase 2 (BRAND-01,02,04), Phase 4 (BRAND-03,05) |
| LAUNCH | 6 | Phase 7 |

---
*Roadmap defined: 2026-04-28*
