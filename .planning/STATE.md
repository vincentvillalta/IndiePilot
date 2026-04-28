---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: "Roadmap created; ready for `/gsd:plan-phase 1`"
last_updated: "2026-04-28T15:20:40.595Z"
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# State: IndiePilot

**Initialized:** 2026-04-28
**Mode:** yolo
**Granularity:** standard

## Project Reference

**Core Value:** A user taps "Join Beta" on an indie app in IndiePilot, gets a real TestFlight invite in their inbox a moment later — with zero developer effort beyond uploading their App Store Connect key once.

**Current Focus:** Roadmap defined; awaiting first phase plan.

**Repository surfaces:**
- Web (this repo): Next.js 15 App Router on Vercel + Neon Postgres, developer dashboard + public discovery + install + SDK APIs
- iOS user app (separate repo `indiepilot-ios`): SwiftUI native, iOS 17+, Swift 6 strict
- iOS SDK (separate repo `indiepilot-ios-sdk`): source-distributed Swift Package, zero deps

## Current Position

**Phase:** None (pre-Phase 1)
**Plan:** None
**Status:** Roadmap created; ready for `/gsd:plan-phase 1`
**Progress:** 0 / 7 phases complete (0%)

```
[░░░░░░░░░░░░░░░░░░░░] 0%
Phase 1 ▢  Phase 2 ▢  Phase 3 ▢  Phase 4 ▢  Phase 5 ▢  Phase 6 ▢  Phase 7 ▢
```

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases completed | 0 / 7 |
| Plans completed | 0 / 0 |
| Requirements shipped | 0 / 96 |
| Phases gated by deeper research | 4 (Phases 2, 3, 5, 7 per research SUMMARY.md) |

## Accumulated Context

### Key Decisions (from PROJECT.md and research)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| KMS envelope encryption from day one | Pitfall #6: AES-with-env-key is irrecoverable once 50 devs have uploaded keys | Phase 2 |
| Security foundation BEFORE public surface | Surface area is smallest in Phase 2; getting it right early avoids retrofit | Phase 2 |
| Slot-full UX ships with "Join Beta" tap | Same feature, same release — splitting them ships a broken wedge | Phase 5 |
| Rename "Get" to "Join Beta" everywhere | Pitfall #2: App Store Review rejection risk on Guideline 4.3 | Phase 4-5 |
| Public ranked leaderboard hidden until first Apple approval | Pitfall #2 + #9: Guideline 5.6.3 + brigading defenses warm-up time | Phase 6 |
| iOS SDK as late combined phase, opt-in | Genuinely deferrable; ship after demand demonstrated | Phase 7 |
| Brand & design as parallel track, not isolated phase | Touches dashboard (Phase 2), iOS app (Phase 4) — never a "polish at the end" phase | All |
| Concierge pre-seeding (30-50 apps) runs in parallel from Phase 5 onward | Pitfall #5: cold-start death spiral; supply must precede public iOS launch | Phase 7 closeout |
| Two Better-Auth instances (cookie for devs, bearer for iOS users) | Different surfaces, different threat models, different session ergonomics | Phase 2 (devs) + Phase 4 (users) |
| ASC API never called inline from Route Handlers | Pitfall #3: rate limit cascades; 202 + Inngest is the only safe pattern | Phase 5 |

### Active Todos

- [ ] Plan Phase 1: Foundation (`/gsd:plan-phase 1`)
- [ ] Begin LAUNCH-01 concierge outreach planning (operational, parallel with Phase 5)
- [ ] Schedule Apple TOS legal opinion before paid tier (Pitfall #1, post-Phase 7)

### Open Questions / Blockers

| Question | Phase | Owner | Status |
|----------|-------|-------|--------|
| Two-Better-Auth-instances ergonomics — confirm vs single instance with `userType` field | Phase 2 / Phase 4 | Vincent | To verify at scaffold time |
| SIWA Hide-My-Email private relay -> TestFlight invite deliverability | Phase 5 | Vincent | Spike during Phase 5 |
| Apple TOS interpretation for "service provider on TestFlight" | Phase 7 / paid tier | Legal | Get written opinion before paid tier |
| Neon pgsodium availability as KMS alternative | Phase 2 | Vincent | Research during Phase 2 plan |
| Drizzle 0.36 vs 1.0 RC version pin at scaffold time | Phase 1 | Vincent | Decide at Phase 1 plan |

### Phases Flagged for Deeper Research

Per research SUMMARY.md, these phases warrant `/gsd:research-phase` before planning:

- **Phase 2** — AWS KMS + OIDC federation specifics; Neon pgsodium vs KMS; Inngest 3.x cron pattern verification
- **Phase 3** — Two-Better-Auth-instances pattern verification against Better-Auth 1.6+
- **Phase 5** — Highest-stakes phase; deep research on every ASC error code, exact betaTesters POST patterns, idempotency semantics, eventual-consistency behavior, iOS deep-link-to-TestFlight matrix
- **Phase 7** — Apple TOS legal interpretation; perceptual image diff implementation choice

Phases skipping deeper research: 1 (Foundation), 4 (iOS App), 6 (Feedback/Funnel — standard patterns).

## Session Continuity

**Last session:** 2026-04-28T15:20:40.592Z

**Next session entry point:**
```
/gsd:plan-phase 1
```

**To resume context:** Read this file, then `.planning/PROJECT.md`, then `.planning/ROADMAP.md`. The research artifacts in `.planning/research/` (SUMMARY, ARCHITECTURE, PITFALLS, STACK, FEATURES) are the deep-context library — pull from them when planning specific phases.

---
*State initialized: 2026-04-28*
*Last updated: 2026-04-28 after roadmap creation*
