# Requirements: IndiePilot

**Defined:** 2026-04-28
**Core Value:** A user taps "Join Beta" on an indie app in IndiePilot, gets a real TestFlight invite in their inbox a moment later — with zero developer effort beyond uploading their App Store Connect key once.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Foundation

- [ ] **FOUND-01**: Project scaffolding (Next.js 15 App Router, TypeScript, Drizzle, Neon, Tailwind, shadcn/ui, Biome, Vitest, Playwright)
- [ ] **FOUND-02**: Database schema baseline (`developers`, `users`, `sessions`, `audit_log`) with Drizzle migrations
- [ ] **FOUND-03**: CI runs migrations against per-PR Neon preview branches
- [ ] **FOUND-04**: Logging baseline (Pino with PII/key/JWT redaction allowlist)
- [ ] **FOUND-05**: Inngest installed at `/api/inngest` with one health-check function

### Developer Auth & Account

- [ ] **DEV-AUTH-01**: Developer can sign up with email + password
- [ ] **DEV-AUTH-02**: Developer can sign in with email + password
- [ ] **DEV-AUTH-03**: Developer session persists across browser refresh (cookie-based)
- [ ] **DEV-AUTH-04**: Developer can sign out
- [ ] **DEV-AUTH-05**: Developer can reset password via email link
- [ ] **DEV-AUTH-06**: Developer email is verified before publishing apps

### Developer Onboarding (ASC Key)

- [ ] **DEV-KEY-01**: Developer can upload App Store Connect API credentials (.p8 file + key ID + issuer ID)
- [ ] **DEV-KEY-02**: Uploaded .p8 keys are encrypted at rest using AWS KMS envelope encryption with `encryptionContext: { developerId }`
- [ ] **DEV-KEY-03**: Plaintext .p8 never touches disk and is never logged
- [ ] **DEV-KEY-04**: Every KMS Decrypt is recorded in audit log with timestamp + actor + purpose
- [ ] **DEV-KEY-05**: Developer can rotate the ASC key (upload new, revoke old) in <60s
- [ ] **DEV-KEY-06**: Developer can revoke (delete) their ASC key from the dashboard
- [ ] **DEV-KEY-07**: A weekly Inngest cron exercises each developer's key (`asc.health`) and surfaces failures in the dashboard
- [ ] **DEV-KEY-08**: Onboarding UI explains storage and encryption clearly before key upload

### Developer App Management

- [ ] **DEV-APP-01**: Developer can import their apps from App Store Connect (name, bundle ID, icon pulled via ASC API)
- [ ] **DEV-APP-02**: Developer can publish an app listing with screenshots, long description, category, external links
- [ ] **DEV-APP-03**: Developer can save a listing as draft and preview it before publishing
- [ ] **DEV-APP-04**: Developer can edit a published listing (description, screenshots, links, category)
- [ ] **DEV-APP-05**: Developer can unpublish an app listing without deleting it
- [ ] **DEV-APP-06**: Developer can delete an app listing
- [ ] **DEV-APP-07**: Auto-publish — listings go live as soon as the developer publishes (no manual review)
- [ ] **DEV-APP-08**: Developer can specify per-app full-slots behavior: `waitlist` or `hide`
- [ ] **DEV-APP-09**: Developer can edit "What's New" / changelog per app version
- [ ] **DEV-APP-10**: App listing displays current build number / version
- [ ] **DEV-APP-11**: Developer can store a public TestFlight join link per app as a fallback (used if ASC API fails or as Apple-TOS hedge)
- [ ] **DEV-APP-12**: Listing screenshots are uploaded to Cloudflare R2 with EXIF stripped and sized via `sharp`

### iOS User Auth

- [ ] **USER-AUTH-01**: iOS user can browse the app anonymously (no auth required for discovery)
- [ ] **USER-AUTH-02**: iOS user can sign up with email + password
- [ ] **USER-AUTH-03**: iOS user can sign in with Apple (primary, recommended path)
- [ ] **USER-AUTH-04**: iOS user can sign in with email + password (secondary)
- [ ] **USER-AUTH-05**: iOS user session persists via Keychain-stored bearer token; never iCloud-synced
- [ ] **USER-AUTH-06**: iOS user can sign out, which clears the Keychain token
- [ ] **USER-AUTH-07**: Auth is prompted only when the user taps "Join Beta" while unauthenticated

### iOS Discovery

- [ ] **DISC-01**: iOS user can view a feed (Today / This Week / Categories) of published indie TestFlight apps
- [ ] **DISC-02**: iOS user can view a detailed app page (icon, name, developer, screenshots carousel, description, What's New, version)
- [ ] **DISC-03**: iOS user can search apps by name and developer
- [ ] **DISC-04**: iOS user can filter apps by category
- [ ] **DISC-05**: iOS user can pull-to-refresh the feed
- [ ] **DISC-06**: Verified-developer badge is shown on app pages where the developer has a valid ASC key
- [ ] **DISC-07**: iOS user can report an app from the detail page (routes to admin email)

### TestFlight Distribution (The Wedge)

- [ ] **WEDGE-01**: iOS user can tap "Join Beta" on an app detail page
- [ ] **WEDGE-02**: Tapping "Join Beta" while unauthenticated prompts auth, then resumes the install flow
- [ ] **WEDGE-03**: Before any backend call, iOS user sees a privacy-disclosure modal: "Your email goes to [Developer Name] for TestFlight access" with explicit consent
- [ ] **WEDGE-04**: Install endpoint returns 202 + attemptId in <100ms after enqueueing (never waits on Apple)
- [ ] **WEDGE-05**: Inngest function `asc.invite` performs KMS Decrypt → ES256 JWT sign → ASC `betaTesters` POST with retries
- [ ] **WEDGE-06**: ASC API calls use per-developer concurrency (5 max) and throttle (200/min) to respect rate limits
- [ ] **WEDGE-07**: Tester additions are idempotent on `(userId, appId)` to prevent duplicates from double-taps or retries
- [ ] **WEDGE-08**: iOS user sees a status-aware Join Beta button that transitions: Idle → Sending → Check your email → Testing → Waitlist
- [ ] **WEDGE-09**: When slots are full and app uses `waitlist`, user is added to waitlist and sees their position
- [ ] **WEDGE-10**: When slots are full and app uses `hide`, the Join Beta button is disabled and shows "Full"
- [ ] **WEDGE-11**: Inngest function `waitlist.promo` automatically promotes waitlisted users to active testers when slots open
- [ ] **WEDGE-12**: Promoted users receive a transactional email via Resend telling them their TF invite was sent
- [ ] **WEDGE-13**: iOS app explains post-install: "Apple will email you within ~5 minutes; check spam"
- [ ] **WEDGE-14**: iOS user can resend the TF invite from their library if it didn't arrive
- [ ] **WEDGE-15**: Post-install state shows a non-actionable "Testing" indicator with a deep-link to TestFlight
- [ ] **WEDGE-16**: ASC API errors are mapped to user-friendly statuses (rate limit, invalid email, slot full, key revoked, app not in TF)

### Feedback & Voting

- [ ] **FB-01**: iOS user can submit written feedback on an app from the detail page
- [ ] **FB-02**: iOS user can attach an optional screenshot with feedback
- [ ] **FB-03**: iOS user can upvote or downvote feature requests on an app's detail page
- [ ] **FB-04**: iOS user cannot vote on the same feature twice (idempotent)
- [ ] **FB-05**: iOS user can withdraw their vote
- [ ] **FB-06**: Developer can view all feedback in a unified inbox (across all their apps), with search and filter
- [ ] **FB-07**: Developer can mark feedback as read / archive / star
- [ ] **FB-08**: Developer can view feature votes leaderboard sorted by upvote count
- [ ] **FB-09**: Developer can change the status of a feature request: Open / Planned / In Progress / Shipped
- [ ] **FB-10**: Developer receives a daily email digest of new feedback (Resend transactional)
- [ ] **FB-11**: Vote brigading defenses: per-user rate limit, account-quality weighting, velocity-anomaly detection job
- [ ] **FB-12**: Public ranked feature leaderboard in the iOS app is hidden until first Apple App Review approval, then re-enabled

### Funnel & Attribution

- [ ] **FUN-01**: Page-view events are recorded for each app detail view in the iOS app
- [ ] **FUN-02**: "Join Beta" tap events are recorded with attempt status
- [ ] **FUN-03**: ASC tester-added events are recorded by the Inngest job
- [ ] **FUN-04**: Hourly Inngest cron polls ASC `betaTesters.state` and updates "invite-accepted" estimates
- [ ] **FUN-05**: Developer dashboard shows a funnel: Views → Join Beta taps → Emails captured → Invites sent → Invites accepted → Installs
- [ ] **FUN-06**: Each funnel step is labeled with confidence: HIGH (we own it), MEDIUM (estimated), or "Install SDK for exact"
- [ ] **FUN-07**: Source attribution captures direct, search, featured, and per-app branded share-link sources
- [ ] **FUN-08**: Developer can copy a per-app branded share link
- [ ] **FUN-09**: Read-only tester list per app, synced hourly from ASC

### iOS SDK (Optional)

- [ ] **SDK-01**: Public Swift Package at `indiepilot-ios-sdk`, source-distributed, zero external dependencies, Swift 6 strict, iOS 17+
- [ ] **SDK-02**: Public PrivacyInfo.xcprivacy declaring exactly what data is collected (none-by-default)
- [ ] **SDK-03**: One-line install: `IndiePilot.configure(apiKey: "ip_pk_…")`
- [ ] **SDK-04**: SwiftUI `IndiePilotFeedbackButton` component opens a native feedback sheet
- [ ] **SDK-05**: SwiftUI `IndiePilotFeedbackView` component shows feedback + feature voting inline
- [ ] **SDK-06**: SDK reports an anonymous installId; never end-user PII
- [ ] **SDK-07**: SDK API endpoints live under `/api/sdk/v1/*` with per-app `ip_pk_<appId>_<rand>` auth
- [ ] **SDK-08**: SDK feedback flows into the same dashboard inbox as iOS-app feedback (tagged source=sdk)
- [ ] **SDK-09**: SDK first-launch ping powers the HIGH-confidence "installs" funnel step when present
- [ ] **SDK-10**: Developer can issue / rotate / revoke per-app SDK keys from the dashboard
- [ ] **SDK-11**: Public README with versioned semver releases

### Trust, Safety & Operations

- [ ] **OPS-01**: Resend delivery webhooks are processed for bounces and surfaced to the developer
- [ ] **OPS-02**: Centralized logging with Pino → Axiom (or Better Stack) and redaction allowlist
- [ ] **OPS-03**: Alert if `asc.invite` failure rate exceeds 5% per hour
- [ ] **OPS-04**: First listing per developer enters a soft-hold review queue (admin tool only — no public manual review)
- [ ] **OPS-05**: Pre-publish image-similarity check (perceptual hash) flags listings whose icons closely match top-100 App Store apps
- [ ] **OPS-06**: Per-developer trust tier (new / verified / trusted) used to gate features and rate-limit listings
- [ ] **OPS-07**: Public sub-processor list page (Vercel, Neon, AWS KMS, Resend, R2, Inngest, etc.) for GDPR transparency
- [ ] **OPS-08**: DSAR (Data Subject Access Request) workflow documented and operable
- [ ] **OPS-09**: Click-through Data Processing Agreement at first .p8 upload
- [ ] **OPS-10**: Per-Get just-in-time consent UX (privacy disclosure) — also satisfies WEDGE-03

### Brand & Design

- [ ] **BRAND-01**: Brand identity created (logo, palette, typography, voice) — paper-airplane-meets-pilot-wings concept
- [ ] **BRAND-02**: Design system spec captured for AI design tooling (`.planning/DESIGN-PROMPT.md` already drafted)
- [ ] **BRAND-03**: iOS app design system avoids App Store mimicry (Product Hunt / Arc DNA, NOT App Store clone) — explicit hard rule
- [ ] **BRAND-04**: Web dashboard uses the brand system via Tailwind v4 + shadcn/ui
- [ ] **BRAND-05**: Dark mode is a distinct mood on iOS, not just inverted colors

### Launch Prep

- [ ] **LAUNCH-01**: 30–50 indie apps pre-seeded via concierge onboarding before public iOS launch
- [ ] **LAUNCH-02**: Apple App Review notes draft framing IndiePilot as TestFlight discovery
- [ ] **LAUNCH-03**: Web-first launch path documented as fallback if iOS Apple Review takes multiple cycles
- [ ] **LAUNCH-04**: Load test against a sandbox developer's ASC key under bursty traffic
- [ ] **LAUNCH-05**: Pen test of key-handling code path (ASC + KMS + Inngest)
- [ ] **LAUNCH-06**: Apple Private Email Relay forwarding domain registered (for SIWA Hide-My-Email recipients)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### iOS SDK Expansion
- **SDKv2-01**: Crash hints (lightweight, not Sentry)
- **SDKv2-02**: Session-level analytics (user count, retention)
- **SDKv2-03**: Cross-platform wrappers (React Native, Flutter)

### Discovery & Engagement
- **DISCv2-01**: Save / bookmark apps to a personal library
- **DISCv2-02**: Editorial / "Featured" curation surface
- **DISCv2-03**: Custom domain on per-app share links
- **DISCv2-04**: Webhooks for developers (new tester, new feedback, vote threshold)

### Communication
- **COMv2-01**: Push notifications to iOS users (TF invite ready, waitlist promoted, feedback responded)
- **COMv2-02**: Multi-tester-group support per app

### Monetization
- **MONv2-01**: Freemium tier definition (which features paid)
- **MONv2-02**: Stripe integration for paid tier
- **MONv2-03**: Featured placement (sponsored, clearly labeled)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Android / Play Store | iOS/TestFlight is the entire premise; expanding splits focus |
| Real-time chat between devs and users | Out of v1; written feedback is the channel |
| Push notifications to users | Email only in v1; defer push to v2 |
| Cross-platform SDK (React Native / Flutter) | iOS-native SDK only in v1 |
| Manual app review / curation | Auto-publish in v1; soft-hold + community signal only |
| Sponsored / paid placement | Freemium plan only in v1, no ads |
| Crash reporting / full PostHog-equivalent SDK | SDK ships with feedback + voting only; do not compete with PostHog/Sentry |
| User follow graph | Adds social complexity that distracts from the wedge |
| Public comment threads | Feedback is private to the developer, not a forum |
| Star ratings on betas | Apple Review risk + low signal on early/buggy beta apps |
| In-product DM with developer | Out of scope for v1; channels through feedback only |
| AI-generated listings | Quality risk + fake-app vector |
| Referral / viral mechanics | Optimize for organic discovery first; cold-start via concierge |
| OAuth login for devs (Google / GitHub) | Email + password is sufficient for v1 |
| Multi-region deployment | Premature optimization at v1 scale |

## Traceability

Every v1 requirement maps to exactly one phase in `.planning/ROADMAP.md`. 100% coverage.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| DEV-AUTH-01 | Phase 2 | Pending |
| DEV-AUTH-02 | Phase 2 | Pending |
| DEV-AUTH-03 | Phase 2 | Pending |
| DEV-AUTH-04 | Phase 2 | Pending |
| DEV-AUTH-05 | Phase 2 | Pending |
| DEV-AUTH-06 | Phase 2 | Pending |
| DEV-KEY-01 | Phase 2 | Pending |
| DEV-KEY-02 | Phase 2 | Pending |
| DEV-KEY-03 | Phase 2 | Pending |
| DEV-KEY-04 | Phase 2 | Pending |
| DEV-KEY-05 | Phase 2 | Pending |
| DEV-KEY-06 | Phase 2 | Pending |
| DEV-KEY-07 | Phase 2 | Pending |
| DEV-KEY-08 | Phase 2 | Pending |
| DEV-APP-01 | Phase 3 | Pending |
| DEV-APP-02 | Phase 3 | Pending |
| DEV-APP-03 | Phase 3 | Pending |
| DEV-APP-04 | Phase 3 | Pending |
| DEV-APP-05 | Phase 3 | Pending |
| DEV-APP-06 | Phase 3 | Pending |
| DEV-APP-07 | Phase 3 | Pending |
| DEV-APP-08 | Phase 3 | Pending |
| DEV-APP-09 | Phase 3 | Pending |
| DEV-APP-10 | Phase 3 | Pending |
| DEV-APP-11 | Phase 3 | Pending |
| DEV-APP-12 | Phase 3 | Pending |
| USER-AUTH-01 | Phase 4 | Pending |
| USER-AUTH-02 | Phase 4 | Pending |
| USER-AUTH-03 | Phase 4 | Pending |
| USER-AUTH-04 | Phase 4 | Pending |
| USER-AUTH-05 | Phase 4 | Pending |
| USER-AUTH-06 | Phase 4 | Pending |
| USER-AUTH-07 | Phase 4 | Pending |
| DISC-01 | Phase 4 | Pending |
| DISC-02 | Phase 4 | Pending |
| DISC-03 | Phase 4 | Pending |
| DISC-04 | Phase 4 | Pending |
| DISC-05 | Phase 4 | Pending |
| DISC-06 | Phase 4 | Pending |
| DISC-07 | Phase 4 | Pending |
| WEDGE-01 | Phase 5 | Pending |
| WEDGE-02 | Phase 5 | Pending |
| WEDGE-03 | Phase 5 | Pending |
| WEDGE-04 | Phase 5 | Pending |
| WEDGE-05 | Phase 5 | Pending |
| WEDGE-06 | Phase 5 | Pending |
| WEDGE-07 | Phase 5 | Pending |
| WEDGE-08 | Phase 5 | Pending |
| WEDGE-09 | Phase 5 | Pending |
| WEDGE-10 | Phase 5 | Pending |
| WEDGE-11 | Phase 5 | Pending |
| WEDGE-12 | Phase 5 | Pending |
| WEDGE-13 | Phase 5 | Pending |
| WEDGE-14 | Phase 5 | Pending |
| WEDGE-15 | Phase 5 | Pending |
| WEDGE-16 | Phase 5 | Pending |
| FB-01 | Phase 6 | Pending |
| FB-02 | Phase 6 | Pending |
| FB-03 | Phase 6 | Pending |
| FB-04 | Phase 6 | Pending |
| FB-05 | Phase 6 | Pending |
| FB-06 | Phase 6 | Pending |
| FB-07 | Phase 6 | Pending |
| FB-08 | Phase 6 | Pending |
| FB-09 | Phase 6 | Pending |
| FB-10 | Phase 6 | Pending |
| FB-11 | Phase 6 | Pending |
| FB-12 | Phase 6 | Pending |
| FUN-01 | Phase 6 | Pending |
| FUN-02 | Phase 6 | Pending |
| FUN-03 | Phase 6 | Pending |
| FUN-04 | Phase 6 | Pending |
| FUN-05 | Phase 6 | Pending |
| FUN-06 | Phase 6 | Pending |
| FUN-07 | Phase 6 | Pending |
| FUN-08 | Phase 6 | Pending |
| FUN-09 | Phase 6 | Pending |
| SDK-01 | Phase 7 | Pending |
| SDK-02 | Phase 7 | Pending |
| SDK-03 | Phase 7 | Pending |
| SDK-04 | Phase 7 | Pending |
| SDK-05 | Phase 7 | Pending |
| SDK-06 | Phase 7 | Pending |
| SDK-07 | Phase 7 | Pending |
| SDK-08 | Phase 7 | Pending |
| SDK-09 | Phase 7 | Pending |
| SDK-10 | Phase 7 | Pending |
| SDK-11 | Phase 7 | Pending |
| OPS-01 | Phase 7 | Pending |
| OPS-02 | Phase 7 | Pending |
| OPS-03 | Phase 7 | Pending |
| OPS-04 | Phase 7 | Pending |
| OPS-05 | Phase 7 | Pending |
| OPS-06 | Phase 7 | Pending |
| OPS-07 | Phase 7 | Pending |
| OPS-08 | Phase 7 | Pending |
| OPS-09 | Phase 2 | Pending |
| OPS-10 | Phase 5 | Pending |
| BRAND-01 | Phase 2 | Pending |
| BRAND-02 | Phase 2 | Pending |
| BRAND-03 | Phase 4 | Pending |
| BRAND-04 | Phase 2 | Pending |
| BRAND-05 | Phase 4 | Pending |
| LAUNCH-01 | Phase 7 | Pending |
| LAUNCH-02 | Phase 7 | Pending |
| LAUNCH-03 | Phase 7 | Pending |
| LAUNCH-04 | Phase 7 | Pending |
| LAUNCH-05 | Phase 7 | Pending |
| LAUNCH-06 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 96 total
- Mapped to phases: 96 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-04-28*
*Last updated: 2026-04-28 after roadmap traceability mapping*
