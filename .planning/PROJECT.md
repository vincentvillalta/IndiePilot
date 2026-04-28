# IndiePilot

## What This Is

IndiePilot is an App Store-like discovery platform for TestFlight apps. Indie iOS developers publish their beta apps to get early users, marketing exposure, and structured feedback; iOS users discover indie betas and join TestFlight with one tap — they enter their email once, and IndiePilot uses the developer's App Store Connect API key to add them to the right distribution group automatically. Surface area is a Next.js web dashboard for developers and a SwiftUI-native iOS app for end users.

## Core Value

A user taps "Get" on an indie app in IndiePilot, gets a real TestFlight invite in their inbox a moment later — with zero developer effort beyond uploading their App Store Connect key once. Discovery + frictionless TestFlight onboarding are the two non-negotiables; if either fails, the product fails.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. v1 hypotheses until shipped and validated. -->

**Discovery (iOS app)**
- [ ] iOS users can browse a feed of published indie TestFlight apps
- [ ] iOS users can view a detailed app page (screenshots, description, developer, version)
- [ ] iOS users can search/filter apps by category
- [ ] iOS users can sign up with email/password or Sign in with Apple
- [ ] iOS users can browse anonymously; auth is prompted only when tapping "Get"

**TestFlight Distribution**
- [ ] Developer can upload an App Store Connect API key (.p8 + key ID + issuer ID)
- [ ] Developer can connect one or more of their apps to IndiePilot via the key
- [ ] Tapping "Get" adds the user's email to the App Store Connect external testing group; Apple sends the TF invite
- [ ] After "Get," the iOS user sees a non-actionable "Testing" state (the install happens via TestFlight itself)
- [ ] Developer chooses per-app behavior when slots are full (waitlist or hide)
- [ ] Waitlisted users are auto-promoted when slots open

**Developer Web Dashboard**
- [ ] Developer can sign up / sign in with email + password
- [ ] Developer can publish an app listing (screenshots, copy, category, links)
- [ ] Auto-publish: any app with valid ASC key goes live, no manual review
- [ ] Dashboard shows install funnel: page views → "Get" taps → emails captured → TF invites sent → invites accepted → installs
- [ ] Dashboard shows source attribution (direct / search / featured / share link)
- [ ] Dashboard aggregates written feedback in one inbox
- [ ] Dashboard shows a feature-vote leaderboard sorted by user upvotes

**Feedback Loop**
- [ ] iOS users can submit written feedback on an app from inside the IndiePilot iOS app
- [ ] iOS users can upvote/downvote feature requests on an app's detail page
- [ ] Optional iOS SDK gives developers an in-app feedback widget + feature voting inside their TestFlight app
- [ ] SDK is opt-in per developer; product works fully without it

**Brand & Design**
- [ ] Modern/playful design system (App Store DNA, but more like Product Hunt / Arc — discovery-driven, indie personality)
- [ ] Design system prompt/spec captured for AI design tooling
- [ ] Brand identity (logo, palette, voice) created from scratch

### Out of Scope

<!-- Explicit boundaries. v1 only. -->

- **Android / Play Store** — iOS/TestFlight is the entire premise; expanding splits focus
- **Real-time chat between devs and users** — out of v1; written feedback is the channel
- **Push notifications to users** — email only in v1; defer push to v2
- **Cross-platform SDK (React Native / Flutter)** — iOS-native SDK only in v1
- **Manual app review / curation** — auto-publish in v1; curated "Featured" can come later
- **Sponsored / paid placement** — freemium plan only in v1, no ads
- **Crash reporting / full analytics suite** — SDK ships with feedback + voting only; PostHog-lite scope deferred to v2

## Context

- **Domain shape:** A two-sided marketplace problem — devs need users, users need apps. Both sides must be courted in parallel.
- **Why TestFlight specifically:** TF is the only legitimate way to ship pre-release iOS apps; Apple caps external testers at 10,000 per app. Indie devs use it but have no good way to get users into it. App Store Connect API supports programmatic tester management — that API is the technical core of the magic moment.
- **Auth model:** Apple Sign in is supported but optional; users can register and use the product anonymously and only authenticate when committing to install. Devs use plain email + password (no social login in v1).
- **Stack:** Next.js (App Router) + Vercel + Neon Postgres for the web dashboard and APIs; SwiftUI native iOS app; Better-Auth or Clerk-style auth (TBD during planning).
- **Dev velocity:** Solo developer building. Timeline is "do it right" not "ship in two weeks" — solid foundation matters, but no over-engineering.
- **Quality model:** Auto-publish is intentional. Community signal (votes, reports) replaces gatekeeping. Curation can be added later if needed.

## Constraints

- **Platform:** iOS-only on the user side (TestFlight is iOS-exclusive). Dev side is web.
- **Apple TOS:** All TestFlight tester management must use the official App Store Connect API. No scraping, no unofficial workarounds. Dev API keys must be stored encrypted at rest.
- **TestFlight limits:** External testing groups cap at 10,000 testers per app. The "slots full" UX is a hard product requirement, not a nice-to-have.
- **Tech stack:** Next.js + Vercel + Neon for backend/web; SwiftUI native for iOS user app.
- **Email deliverability:** TF invites come from Apple, but IndiePilot transactional emails (waitlist promotion, feedback notifications) need a deliverable provider (Resend / Postmark / SES — TBD).
- **Solo dev:** Scope must be achievable by one person with a "do it right" timeline; ruthless simplification on anything not core.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web for devs, SwiftUI native iOS for users | iOS users need TestFlight on iPhone anyway; native polish reinforces the brand. Devs need a real dashboard, not a mobile experience. | — Pending |
| Both `Get` flows (email-only and Sign in with Apple) | Apple ID gives verified email + lower friction; email path keeps the door open for users who don't want to use Apple Sign-in. Anonymous browsing reduces auth friction at the top of funnel. | — Pending |
| Developer per-app choice on full slots (waitlist vs hide) | Different apps have different growth strategies; opinionated default would be wrong half the time. | — Pending |
| ASC key upload (.p8 + key ID + issuer ID) over OAuth | Apple does not offer a true OAuth flow for App Store Connect; .p8 keys are the standard. | — Pending |
| Auto-publish, no manual review | Solo dev cannot scale review; community signal is good enough at low volume. Curation is additive later. | — Pending |
| SDK ships with feedback + voting only | Full analytics suite is tempting scope creep; minimum useful SDK avoids competing with PostHog/Mixpanel. | — Pending |
| Freemium for devs (TBD what's gated) | Need a path to revenue without blocking adoption; specifics deferred to a later milestone. | — Pending |
| Modern/playful design (Product Hunt / Arc, not literal App Store clone) | "App Store clone" undersells the indie/community angle; we want personality. | — Pending |

---
*Last updated: 2026-04-28 after initialization*
